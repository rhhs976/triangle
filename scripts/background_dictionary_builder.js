import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.resolve(__dirname, '../data/my_dictionary.db');
const OLD_DICT_FILE = path.resolve(__dirname, '../data/dictionary.db');
const STATE_FILE = path.resolve(__dirname, '../dictionary_generator_state.json');
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

const MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b'
];

// High priority common words
const HIGH_PRIORITY_WORDS = [
  "water", "sun", "moon", "star", "earth", "sky", "cloud", "rain", "wind", "fire",
  "ocean", "sea", "river", "mountain", "valley", "forest", "tree", "plant", "flower", "leaf",
  "animal", "dog", "cat", "bird", "fish", "horse", "lion", "tiger", "bear", "wolf",
  "house", "room", "door", "window", "table", "chair", "bed", "wall", "floor", "roof",
  "food", "bread", "fruit", "apple", "banana", "orange", "meat", "rice", "salt", "sugar",
  "computer", "software", "hardware", "internet", "algorithm", "database", "network", "server", "code", "robot",
  "gravity", "physics", "chemistry", "biology", "science", "atom", "molecule", "electron", "proton", "neutron",
  "energy", "matter", "light", "sound", "heat", "force", "speed", "velocity", "acceleration", "magnetism",
  "cell", "dna", "gene", "chromosome", "organism", "evolution", "species", "ecosystem", "bacteria", "virus",
  "galaxy", "universe", "planet", "orbit", "telescope", "microscope", "satellite", "rocket", "astronaut", "space",
  "mind", "brain", "thought", "memory", "consciousness", "perception", "feeling", "emotion", "passion", "instinct",
  "happiness", "joy", "sorrow", "sadness", "anger", "fear", "courage", "hope", "love", "peace",
  "philosophy", "truth", "wisdom", "knowledge", "belief", "logic", "reason", "ethics", "morality", "justice",
  "freedom", "liberty", "democracy", "equality", "society", "culture", "civilization", "community", "citizen", "law",
  "curiosity", "wonder", "serendipity", "empathy", "sympathy", "kindness", "gratitude", "patience", "honesty", "honor",
  "art", "music", "song", "dance", "painting", "sculpture", "theatre", "poetry", "literature", "cinema",
  "language", "word", "sentence", "grammar", "alphabet", "dictionary", "story", "book", "letter", "voice",
  "time", "past", "present", "future", "history", "moment", "second", "minute", "hour", "day",
  "night", "morning", "evening", "season", "spring", "summer", "autumn", "winter", "century", "epoch"
];

// Open / init DB
const db = new DatabaseSync(DB_FILE);
db.exec(`
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

const checkStmt = db.prepare('SELECT word FROM my_dictionary WHERE word = ? LIMIT 1');
const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO my_dictionary (word, heading, explanation, usage, raw_entry, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// Sliding-window rate limit tracker: records timestamps of rate-limit hits
let rateLimitTimestamps = [];

function recordRateLimitHit() {
  const now = Date.now();
  rateLimitTimestamps.push(now);
  // Keep only timestamps within the last 2 minutes (120,000 ms)
  const twoMinutesAgo = now - 120000;
  rateLimitTimestamps = rateLimitTimestamps.filter(t => t >= twoMinutesAgo);
  return rateLimitTimestamps.length;
}

function getRateLimitsInLast2Min() {
  const now = Date.now();
  const twoMinutesAgo = now - 120000;
  rateLimitTimestamps = rateLimitTimestamps.filter(t => t >= twoMinutesAgo);
  return rateLimitTimestamps.length;
}

function updateStateFile(state, extra = {}) {
  try {
    const payload = {
      state,
      rateLimitsInLast2Min: getRateLimitsInLast2Min(),
      updatedAt: new Date().toISOString(),
      ...extra
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (_) {}
}

// Check Groq Quota using a 1-token minimal probe
function checkGroqQuota() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: 'probe' }],
      max_tokens: 1
    });

    const req = https.request('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const remTokens = parseInt(res.headers['x-ratelimit-remaining-tokens'] || '0', 10);
        const limitTokens = parseInt(res.headers['x-ratelimit-limit-tokens'] || '1', 10);
        const remReqs = parseInt(res.headers['x-ratelimit-remaining-requests'] || '0', 10);
        const limitReqs = parseInt(res.headers['x-ratelimit-limit-requests'] || '1', 10);

        const tokenPct = Math.round((remTokens / Math.max(limitTokens, 1)) * 100);
        const reqPct = Math.round((remReqs / Math.max(limitReqs, 1)) * 100);

        // Half free means both token capacity >= 50% and request capacity >= 50%
        const halfFree = (res.statusCode === 200) && (tokenPct >= 50) && (reqPct >= 50);

        resolve({
          statusCode: res.statusCode,
          halfFree,
          tokenPct,
          reqPct,
          remTokens,
          limitTokens,
          remReqs,
          limitReqs
        });
      });
    });

    req.on('error', () => resolve({ halfFree: false, error: 'network' }));
    req.on('timeout', () => { req.destroy(); resolve({ halfFree: false, error: 'timeout' }); });
    req.write(postData);
    req.end();
  });
}

// Wait until quota is at least half free
async function waitUntilQuotaHalfFree() {
  console.log(`\n=============================================================`);
  console.log(`🛑 [RATE LIMIT TRIGGER] Hit 10 rate limits within 2 minutes!`);
  console.log(`⏸️  STOPPING generation. Monitoring quota until at least 50% free...`);
  console.log(`=============================================================\n`);

  updateStateFile('STOPPED_RATE_LIMIT', { reason: '10 rate limits within 2 minutes' });

  while (true) {
    // Wait 15 seconds between quota checks
    await new Promise(r => setTimeout(r, 15000));

    const quota = await checkGroqQuota();
    console.log(`[Quota Monitor] Tokens: ${quota.remTokens || '?'}/${quota.limitTokens || '?'} (${quota.tokenPct || 0}%) | Requests: ${quota.remReqs || '?'}/${quota.limitReqs || '?'} (${quota.reqPct || 0}%) | Half Free: ${quota.halfFree ? 'YES' : 'NO'}`);

    updateStateFile('MONITORING_QUOTA', {
      tokenPct: quota.tokenPct,
      reqPct: quota.reqPct,
      remTokens: quota.remTokens,
      limitTokens: quota.limitTokens,
      halfFree: quota.halfFree
    });

    if (quota.halfFree) {
      console.log(`\n=============================================================`);
      console.log(`✅ [QUOTA RESTORED] Quota is half free (${quota.tokenPct}% tokens, ${quota.reqPct}% requests)!`);
      console.log(`▶️  STARTING generator again...`);
      console.log(`=============================================================\n`);

      // Reset the sliding window
      rateLimitTimestamps = [];
      updateStateFile('RUNNING', {
        resumedAt: new Date().toISOString(),
        tokenPct: quota.tokenPct,
        reqPct: quota.reqPct
      });
      break;
    }
  }
}

function getTargetWords() {
  const targets = [];
  const seen = new Set();

  try {
    const oldDb = new DatabaseSync(OLD_DICT_FILE, { readOnly: true });
    // Pull all valid English dictionary words strictly in alphabetical order (all 'a', then all 'b', etc.)
    const rows = oldDb.prepare(`
      SELECT word FROM dictionary
      WHERE length(word) BETWEEN 3 AND 15
        AND word NOT LIKE '-%'
        AND word NOT LIKE '%-%'
        AND word NOT LIKE '% %'
      ORDER BY word ASC
    `).all();

    for (const r of rows) {
      const w = r.word.toLowerCase();
      if (/^[a-z]+$/.test(w) && !seen.has(w)) {
        seen.add(w);
        targets.push(w);
      }
    }
  } catch (e) {
    console.error('Could not load extra words from old db:', e.message);
  }

  return targets;
}

function callGroqApi(model, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 20000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error || res.statusCode === 429) {
            reject({ isApiError: true, statusCode: res.statusCode, error: parsed.error || { message: 'Rate limit' } });
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}\nRaw: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Groq request timed out'));
    });
    req.write(postData);
    req.end();
  });
}

async function generateDefinition(word) {
  const wordClean = word.trim().toLowerCase();
  const systemPrompt = `You are an authoritative, factually rigorous modern encyclopedic dictionary generator.
For the word or term provided by the user, you must output an accurate, high-quality definition following this EXACT format:

**[Word or Term in bold]**

Explanation:
[A rich, factually accurate, comprehensive, modern single-paragraph explanation of what the word or entity actually is, its real-world nature, biological/scientific taxonomy if applicable, history, or context]

Usage:
[1-2 clear, natural, modern example sentences demonstrating the word used correctly in authentic context]

CRITICAL RULES:
- The first line MUST be the word or term surrounded by double asterisks.
- Followed by 'Explanation:' and the factual explanation paragraph.
- Followed by 'Usage:' and the usage examples.
- FACTUAL INTEGRITY: NEVER invent or hallucinate fictitious neologisms or poetic metaphors for real organisms, flora, fauna, loanwords, or cultural terms. Accurately explain its true, verifiable real-world identity.
- Do NOT output any introductory or concluding remarks, greetings, notes, or extra formatting.`;

  const userPrompt = `Define the word: ${wordClean}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    for (const model of MODELS) {
      const payload = JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2
      });

      try {
        const res = await callGroqApi(model, payload);
        if (res.choices?.[0]?.message?.content) {
          const content = res.choices[0].message.content.trim();
          
          let heading = `**${wordClean.charAt(0).toUpperCase() + wordClean.slice(1)}**`;
          const headingMatch = content.match(/^\*\*([^*]+)\*\*/m);
          if (headingMatch) {
            heading = `**${headingMatch[1].trim()}**`;
          }

          let explanation = "";
          const explMatch = content.match(/Explanation:\s*([\s\S]*?)(?=(?:\n\s*Usage:|$))/i);
          if (explMatch) {
            explanation = explMatch[1].trim();
          }

          let usage = "";
          const usageMatch = content.match(/Usage:\s*([\s\S]*?)$/i);
          if (usageMatch) {
            usage = usageMatch[1].trim();
          }

          if (!explanation) {
            const lines = content.split('\n').filter(l => l.trim().length > 0);
            explanation = lines.slice(1).join(' ').trim();
          }
          if (!usage) {
            usage = `The word "${wordClean}" is commonly utilized in modern English.`;
          }

          return {
            word: wordClean,
            heading,
            explanation,
            usage,
            raw_entry: content,
            created_at: new Date().toISOString()
          };
        }
      } catch (err) {
        const isRateLimit = (err.statusCode === 429) || (err.isApiError && err.error?.message?.includes('Rate limit'));
        if (isRateLimit) {
          const hits = recordRateLimitHit();
          console.log(`\n[Rate limit on ${model}] (Hits in last 2m: ${hits}/10)`);

          // If rate limited 10 times in 2 minutes, STOP and wait until quota is half free
          if (hits >= 10) {
            await waitUntilQuotaHalfFree();
            // Retry the current word after quota is restored
            return generateDefinition(word);
          } else {
            // Normal backoff
            await new Promise(r => setTimeout(r, 6000));
          }
        }
        continue;
      }
    }
  }

  return null;
}

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION PREVENTED]', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION PREVENTED]', reason);
});

async function run() {
  console.log("=================================================");
  console.log("   GROQ 24/7 DICTIONARY BUILDER WITH RATE GUARD  ");
  console.log("=================================================");

  updateStateFile('RUNNING');

  while (true) {
    const targetWords = getTargetWords();
    console.log(`\n[Cycle Start] Scanning ${targetWords.length} vocabulary words...`);

    let totalSaved = db.prepare('SELECT count(*) as c FROM my_dictionary').get().c;
    console.log(`Currently indexed words in my_dictionary.db: ${totalSaved}\n`);

    let generatedThisCycle = 0;

    for (const word of targetWords) {
      const existing = checkStmt.get(word);
      if (existing) {
        continue;
      }

      const t0 = Date.now();
      process.stdout.write(`[Generating] "${word}"... `);

      try {
        const record = await generateDefinition(word);
        if (record) {
          insertStmt.run(
            record.word,
            record.heading,
            record.explanation,
            record.usage,
            record.raw_entry,
            record.created_at
          );
          generatedThisCycle++;
          totalSaved++;
          const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
          console.log(`✓ DONE (${elapsed}s) [Total in DB: ${totalSaved}] (Rate limits 2m: ${getRateLimitsInLast2Min()}/10)`);
        } else {
          console.log(`✗ FAILED (will retry later)`);
        }
      } catch (err) {
        console.log(`✗ ERROR: ${err.message}`);
      }

      // Safe pacing
      await new Promise(r => setTimeout(r, 700));
    }

    console.log(`\nCycle finished! Generated ${generatedThisCycle} entries. Resting 10s before next scan...`);
    await new Promise(r => setTimeout(r, 10000));
  }
}

run();
