import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { isKnownWord, isLikelyGibberish, findSpellingSuggestion } from './spell_checker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.resolve(__dirname, '../data/my_dictionary.db');

function getGroqKey() {
  if (process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY;
  try {
    const envFile = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envFile)) {
      const txt = fs.readFileSync(envFile, 'utf8');
      const m = txt.match(/GROQ_API_KEY\s*=\s*([^\r\n]+)/);
      if (m) return m[1].trim().replace(/^['"]|['"]$/g, '');
    }
  } catch (_) {}
  return '';
}

// On-demand Groq mode: enabled for user searches when a word does not exist in local DB.
// Background batch builders remain offline to protect quota.
export let GROQ_PAUSED = false;

const MODELS = [
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b'
];

export class GroqDictionaryEngine {
  constructor() {
    this.initDb();
    this.inFlight = new Map(); // Single-flight coalescing: prevents duplicate concurrent Groq calls
  }

  initDb() {
    this.db = new DatabaseSync(DB_FILE);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS my_dictionary (
        word TEXT PRIMARY KEY,
        heading TEXT NOT NULL,
        explanation TEXT NOT NULL,
        usage TEXT NOT NULL,
        raw_entry TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_my_word ON my_dictionary(word);
    `);

    this.getStmt = this.db.prepare('SELECT * FROM my_dictionary WHERE word = ? LIMIT 1');
    this.insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO my_dictionary (word, heading, explanation, usage, raw_entry, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
  }

  // Synchronous lookup from local SQLite DB
  getWordLocal(word) {
    if (!word) return null;
    const clean = word.toLowerCase().trim();
    return this.getStmt.get(clean);
  }

  // Call Groq API with model rotation
  async callGroq(targetWord) {
    if (GROQ_PAUSED) {
      // Groq is explicitly stopped to prevent bans or quota exhaustion
      return null;
    }

    console.log(`[GROQ CALL] Initiating single on-demand Groq synthesis for: "${targetWord}"`);

    const apiKey = getGroqKey();
    if (!apiKey) {
      console.warn('[GROQ] No API key available');
      return null;
    }

    const wordClean = targetWord.trim();
    const systemPrompt = `You are an authoritative, factually rigorous modern encyclopedic dictionary and reference generator.
For the word, book title, song, film, entity, or term provided by the user, you must output an accurate, high-quality reference definition following this EXACT format:

**[Title or Word in bold]**

Explanation:
[A rich, comprehensive, modern single-paragraph explanation: if a vocabulary word, its definition, etymology, and characteristics; if a book series or novel, identify author/publisher, plot premise, genre, and significance; if a song or film, identify artists, release year, genre, and themes]

Usage:
1. [Clear, natural, authentic example sentence 1]
2. [Clear, natural, authentic example sentence 2]

CRITICAL RULES:
- The first line MUST be the title or word in bold surrounded by double asterisks (e.g. **I Survived** or **Die With a Smile**).
- Followed by 'Explanation:' and the comprehensive paragraph.
- Followed by 'Usage:' and the two example sentences.
- FACTUAL INTEGRITY: NEVER invent or hallucinate fictitious neologisms or poetic metaphors for real organisms, flora, fauna, books, songs, or entities.
- NON-WORD / GIBBERISH GUARD: If the query "${wordClean}" is a severe misspelling, unpronounceable keyboard mash, or pure gibberish, you MUST respond with ONLY:
NOT_A_VALID_WORD
Do NOT guess, fabricate, or improvise definitions for fake words.
- Do NOT output any introductory notes, greetings, or conversational meta-commentary.`;

    const userPrompt = `Define or explain: ${wordClean}`;

    for (const model of MODELS) {
      try {
        const postData = JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.2,
          max_tokens: 800
        });

        const resBody = await new Promise((resolve, reject) => {
          const req = https.request('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 15000
          }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(body));
          });

          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('Groq request timed out'));
          });
          req.write(postData);
          req.end();
        });

        const parsed = JSON.parse(resBody);
        if (parsed.choices?.[0]?.message?.content) {
          const content = parsed.choices[0].message.content.trim();
          return this.parseGroqOutput(wordClean, content);
        }
      } catch (err) {
        // Try next model
        continue;
      }
    }

    return null;
  }

  // Parse Groq response into heading, explanation, and usage
  parseGroqOutput(word, rawText) {
    const wordKey = word.toLowerCase().trim();

    // Check if Groq identified the input as an invalid/fake word
    if (!rawText || rawText.includes('NOT_A_VALID_WORD') || rawText.trim().startsWith('NOT_A_VALID')) {
      return null;
    }
    
    // Extract heading (e.g. **Word**)
    let heading = `**${word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()}**`;
    const headingMatch = rawText.match(/^\*\*([^*]+)\*\*/m);
    if (headingMatch) {
      heading = `**${headingMatch[1].trim()}**`;
    }

    // Extract Explanation
    let explanation = "";
    const explMatch = rawText.match(/Explanation:\s*([\s\S]*?)(?=(?:\n\s*Usage:|$))/i);
    if (explMatch) {
      explanation = explMatch[1].trim();
    }

    // Extract Usage
    let usage = "";
    const usageMatch = rawText.match(/Usage:\s*([\s\S]*?)$/i);
    if (usageMatch) {
      usage = usageMatch[1].trim();
    }

    // Fallback if regex split failed
    if (!explanation && !usage) {
      const lines = rawText.split('\n').filter(l => l.trim().length > 0);
      explanation = lines.slice(1).join(' ').trim();
      usage = `The term "${word}" is frequently used in modern discourse.`;
    }

    const record = {
      word: wordKey,
      heading,
      explanation,
      usage,
      raw_entry: rawText,
      created_at: new Date().toISOString()
    };

    // Save to SQLite
    this.insertStmt.run(
      record.word,
      record.heading,
      record.explanation,
      record.usage,
      record.raw_entry,
      record.created_at
    );

    return record;
  }

  // Lookup word: check DB first, then validate, then generate via Groq if missing
  async lookup(word) {
    if (!word) return { found: false };
    const clean = word.toLowerCase().trim();

    // 1. Check local DB
    const cached = this.getWordLocal(clean);
    if (cached) {
      return {
        found: true,
        word: clean,
        heading: cached.heading,
        explanation: cached.explanation,
        usage: cached.usage,
        raw_entry: cached.raw_entry,
        cached: true
      };
    }

    // 2. Reject obvious keyboard mash / gibberish before calling Groq
    if (isLikelyGibberish(clean)) {
      const suggestion = findSpellingSuggestion(clean);
      return {
        found: false,
        word: clean,
        gibberish: true,
        suggestion
      };
    }

    // 3. If Groq is paused, synthesize locally from offline lexicon (100% offline, zero API calls)
    if (GROQ_PAUSED) {
      if (this.lexiconStmt) {
        const row = this.lexiconStmt.get(clean);
        if (row && row.definition) {
          const capWord = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
          const cleanDef = row.definition.replace(/\s+/g, ' ').trim();
          const record = {
            word: clean,
            heading: `**${capWord}**`,
            explanation: cleanDef,
            usage: `1. In contemporary usage, the term "${clean}" conveys this established meaning.\n2. Scholars referenced "${clean}" to illustrate the concept accurately.`,
            raw_entry: `**${capWord}**\n\nExplanation:\n${cleanDef}\n\nUsage:\n1. In contemporary usage, the term "${clean}" conveys this established meaning.`,
            created_at: new Date().toISOString()
          };

          this.insertStmt.run(
            record.word,
            record.heading,
            record.explanation,
            record.usage,
            record.raw_entry,
            record.created_at
          );

          return {
            found: true,
            ...record,
            cached: false
          };
        }
      }

      const suggestion = findSpellingSuggestion(clean);
      return {
        found: false,
        word: clean,
        suggestion
      };
    }

    // 4. Single-Flight Coalescing: If another person is already generating this word right now,
    // wait for their result rather than sending 200 parallel requests to Groq!
    if (this.inFlight.has(clean)) {
      return await this.inFlight.get(clean);
    }

    const generatePromise = (async () => {
      try {
        const generated = await this.callGroq(clean);
        if (generated) {
          return {
            found: true,
            word: clean,
            heading: generated.heading,
            explanation: generated.explanation,
            usage: generated.usage,
            raw_entry: generated.raw_entry,
            cached: false
          };
        }

        // 5. Word could not be generated (either invalid or severe typo)
        const suggestion = findSpellingSuggestion(clean);
        return {
          found: false,
          word: clean,
          suggestion
        };
      } finally {
        this.inFlight.delete(clean);
      }
    })();

    this.inFlight.set(clean, generatePromise);
    return await generatePromise;
  }
}

export const myDictionary = new GroqDictionaryEngine();
