import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { isKnownWord, isLikelyGibberish, findSpellingSuggestion } from './spell_checker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.resolve(__dirname, '../data/my_dictionary.db');
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

// On-demand Groq mode: enabled for user searches when a word does not exist in local DB.
// Background batch builders remain offline to protect quota.
export let GROQ_PAUSED = false;

const MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b'
];

export class GroqDictionaryEngine {
  constructor() {
    this.initDb();
  }

  initDb() {
    this.db = new DatabaseSync(DB_FILE);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA busy_timeout = 5000;
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

    const wordClean = targetWord.trim();
    const systemPrompt = `You are an authoritative, factually rigorous modern encyclopedic dictionary generator.
For the word or term provided by the user, you must output an accurate, high-quality definition following this EXACT format:

**[Word or Term in bold]**

Explanation:
[A rich, factually accurate, comprehensive, modern single-paragraph explanation of what the word or entity actually is, its real-world nature, biological/scientific taxonomy if applicable, history, or context]

Usage:
[1-2 clear, natural, modern example sentences demonstrating the word used correctly in authentic context]

CRITICAL RULES:
- The first line MUST be the word or term surrounded by double asterisks (e.g. **Shima Enaga**).
- Followed by 'Explanation:' and the factual explanation paragraph.
- Followed by 'Usage:' and the usage examples.
- FACTUAL INTEGRITY: NEVER invent or hallucinate fictitious neologisms or poetic metaphors for real organisms, flora, fauna, geographic features, loanwords, or cultural terms.
- NON-WORD / GIBBERISH GUARD: If the query "${wordClean}" is a severe misspelling, unpronounceable keyboard mash, gibberish, or does NOT exist as a legitimate real-world word, scientific taxon, proper noun, or entity in any language, you MUST respond with ONLY:
NOT_A_VALID_WORD
Do NOT guess, fabricate, or improvise definitions for fake or misspelled words.
- Do NOT output any introductory or concluding remarks, greetings, notes, or meta commentary.`;

    const userPrompt = `Define the word: ${wordClean}`;

    for (const model of MODELS) {
      try {
        const postData = JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.2
        });

        const resBody = await new Promise((resolve, reject) => {
          const req = https.request('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GROQ_API_KEY}`,
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

    // 4. Generate on-demand using Groq (only for unindexed words searched by the user)
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
  }
}

export const myDictionary = new GroqDictionaryEngine();
