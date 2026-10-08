// Semantic QA Cache Engine for triangle search engine
// Connected to Turso Cloud with semantic matching, TTL expiration, and quality control

const COMMON_TYPOS = {
  'te': 'the', 'th': 'the', 'da': 'the', 'wht': 'what', 'wat': 'what',
  'hw': 'how', 'whos': 'who', 'whm': 'whom', 'wer': 'where', 'wen': 'when',
  'wy': 'why', 'answr': 'answer', 'curent': 'current', 'currnt': 'current',
  'pres': 'president', 'prez': 'president', 'minstr': 'minister', 'ti': 'it',
  'nd': 'and', 'ot': 'to', 'fro': 'from', 'abt': 'about', 'whch': 'which',
  'pople': 'people', 'cntry': 'country', 'wrld': 'world', 'leadrs': 'leaders'
};

const STOP_WORDS = new Set([
  'what', 'whats', 'what\'s', 'is', 'the', 'of', 'in', 'a', 'an', 'are', 'was', 'were',
  'tell', 'me', 'who', 'whos', 'who\'s', 'where', 'wheres', 'where\'s', 'when', 'whens',
  'how', 'why', 'can', 'you', 'give', 'do', 'does', 'did', 'about', 'and', 'or', 'for',
  'to', 'from', 'with', 'by', 'at', 'on', 'know', 'please', 'explain', 'describe', 'define',
  'meaning', 'definition', 'mean', 'find', 'city', 'country', 'during', 'cause', 'causes',
  'caused', 'causing', 'happen', 'happens', 'happened', 'happening', 'occur', 'occurs',
  'occurred', 'occurring', 'make', 'makes', 'made', 'making', 'work', 'works', 'working',
  'look', 'looks', 'appear', 'appears', 'called', 'come', 'comes', 'it', 'its'
]);

function stemToken(w) {
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);
  return w;
}

// Temporal markers indicating facts that change over time (leaders, roles, statistics, titles)
const TEMPORAL_MARKERS = [
  'current', 'currently', 'now', 'today', 'latest', 'recent', 'present', 'this year',
  'president', 'prime minister', 'ceo', 'chancellor', 'leader', 'governor', 'mayor',
  'monarch', 'king', 'queen', 'pope', 'senator', 'vice president', 'premier',
  'champion', 'winner', 'reigning', 'titleholder', 'number 1', 'no 1', 'top ranked',
  'price', 'stock', 'worth', 'net worth', 'market cap', 'exchange rate',
  'weather', 'temperature', 'forecast', 'population', 'inflation', 'gdp',
  'age', 'how old', 'salary', 'rank', 'ranking'
];

/**
 * Converts any query into a canonical intent key, handling typos & synonyms.
 * Example:
 * "who is te current prime minister of new zealand" -> "current minister new prime zealand"
 * "who is the current prime minister of new zealand" -> "current minister new prime zealand"
 */
export function normalizeQuestionToCanonicalKey(question) {
  if (!question) return '';
  
  // Clean punctuation and possessives ("france's" -> "france")
  const cleaned = question
    .toLowerCase()
    .replace(/'s\b/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleaned.split(' ')
    .map(w => w.trim())
    .map(w => COMMON_TYPOS[w] || w)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w))
    .map(w => stemToken(w))
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));

  // Sort unique meaningful words to guarantee order invariance
  const uniqueSorted = Array.from(new Set(words)).sort();
  return uniqueSorted.join(' ');
}

/**
 * Checks if a question has dynamic or time-sensitive information
 */
export function isTemporalQuestion(question) {
  const lower = (question || '').toLowerCase();
  if (TEMPORAL_MARKERS.some(m => lower.includes(m))) return 1;
  const currentYear = new Date().getFullYear();
  if (lower.includes(String(currentYear)) || lower.includes(String(currentYear - 1))) return 1;
  return 0;
}

/**
 * Checks if a cached QA row has expired
 * Temporal/fluid queries expire after 24 hours (1 day).
 * Evergreen facts expire after 90 days.
 */
export function isQAExpired(row) {
  if (!row || !row.created_at) return true;
  const created = new Date(row.created_at).getTime();
  const now = Date.now();
  const ageDays = (now - created) / (1000 * 60 * 60 * 24);

  const maxDays = (row.is_temporal === 1 || row.is_temporal === '1' || row.is_temporal === true) ? 1 : 90;
  return ageDays > maxDays;
}

/**
 * Jaccard token overlap similarity between two canonical keys
 */
export function calculateSemanticSimilarity(keyA, keyB) {
  if (!keyA || !keyB) return 0;
  const setA = new Set(keyA.split(' '));
  const setB = new Set(keyB.split(' '));

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }

  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Look up answer in Turso Cloud QA Cache
 */
export async function lookupSemanticQA(question, client) {
  const canonicalKey = normalizeQuestionToCanonicalKey(question);
  if (!canonicalKey || canonicalKey.length < 3) return null;

  try {
    // 1. Exact canonical key match
    const exactRes = await client.execute({
      sql: 'SELECT * FROM qa_cache WHERE canonical_key = ? LIMIT 1',
      args: [canonicalKey]
    });

    if (exactRes.rows && exactRes.rows.length > 0) {
      const row = exactRes.rows[0];

      // Discard if downvoted or expired
      if (Number(row.downvotes) > Number(row.upvotes)) {
        await purgeQA(row.id, client);
        return null;
      }
      if (isQAExpired(row)) {
        return null; // Expired, let Groq regenerate a fresh answer
      }

      // Increment access counter asynchronously
      client.execute({
        sql: 'UPDATE qa_cache SET access_count = access_count + 1 WHERE id = ?',
        args: [row.id]
      }).catch(() => {});

      return {
        id: row.id,
        canonicalKey: row.canonical_key,
        originalQuestion: row.original_question,
        directAnswer: row.direct_answer,
        fullExplanation: row.full_explanation,
        category: row.category,
        upvotes: row.upvotes,
        downvotes: row.downvotes,
        accessCount: row.access_count + 1,
        source: 'turso_qa_cache'
      };
    }

    // 2. Semantic fuzzy overlap search over recent QA cache entries
    const searchTokens = canonicalKey.split(' ').slice(0, 3);
    for (const token of searchTokens) {
      if (token.length < 3) continue;
      const fuzzyRes = await client.execute({
        sql: 'SELECT * FROM qa_cache WHERE canonical_key LIKE ? LIMIT 10',
        args: [`%${token}%`]
      });

      for (const row of (fuzzyRes.rows || [])) {
        if (Number(row.downvotes) > Number(row.upvotes)) continue;
        if (isQAExpired(row)) continue;

        const sim = calculateSemanticSimilarity(canonicalKey, row.canonical_key);
        // Overlap threshold: 65% overlap matches rephrasings
        if (sim >= 0.65) {
          client.execute({
            sql: 'UPDATE qa_cache SET access_count = access_count + 1 WHERE id = ?',
            args: [row.id]
          }).catch(() => {});

          return {
            id: row.id,
            canonicalKey: row.canonical_key,
            originalQuestion: row.original_question,
            directAnswer: row.direct_answer,
            fullExplanation: row.full_explanation,
            category: row.category,
            upvotes: row.upvotes,
            downvotes: row.downvotes,
            accessCount: row.access_count + 1,
            matchedViaSemanticFuzzy: true,
            source: 'turso_qa_cache'
          };
        }
      }
    }
  } catch (err) {
    console.error('QA lookup error in Turso:', err.message);
  }

  return null;
}

// Hard Storage & Quota Limit (Default 5,000,000 entries = ~2.8 GB in Turso, well under 9 GB free tier)
export const MAX_QA_CACHE_LIMIT = parseInt(process.env.MAX_QA_CACHE_LIMIT || '5000000', 10);

let cachedEntryCount = null;
let lastCountCheckTime = 0;
const COUNT_CACHE_TTL_MS = 5 * 60 * 1000; // Recalculate from DB every 5 minutes

export async function getCachedQuestionCount(client) {
  const now = Date.now();
  if (cachedEntryCount !== null && (now - lastCountCheckTime) < COUNT_CACHE_TTL_MS) {
    return cachedEntryCount;
  }
  try {
    const res = await client.execute('SELECT COUNT(1) AS total FROM qa_cache');
    if (res && res.rows && res.rows.length > 0) {
      cachedEntryCount = Number(res.rows[0].total) || 0;
      lastCountCheckTime = now;
      return cachedEntryCount;
    }
  } catch (_) {}
  return cachedEntryCount || 0;
}

export async function isCacheLimitReached(client) {
  const count = await getCachedQuestionCount(client);
  return count >= MAX_QA_CACHE_LIMIT;
}

/**
 * Save newly generated Groq QA into Turso Cloud
 */
export async function saveSemanticQA({ question, directAnswer, fullExplanation, category = 'Knowledge' }, client) {
  const canonicalKey = normalizeQuestionToCanonicalKey(question);
  if (!canonicalKey || !directAnswer) return null;

  // Storage Guard: Stop saving once the safety limit is reached
  const reached = await isCacheLimitReached(client);
  if (reached) {
    console.warn(`[TURSO STORAGE CAP] Maximum limit of ${MAX_QA_CACHE_LIMIT} reached. Halting new database insertions.`);
    return null;
  }

  const isTemporal = isTemporalQuestion(question);
  const now = new Date().toISOString();

  try {
    const res = await client.execute({
      sql: `INSERT OR REPLACE INTO qa_cache 
            (canonical_key, original_question, direct_answer, full_explanation, category, is_temporal, upvotes, downvotes, access_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, 0, 1, ?, ?)`,
      args: [canonicalKey, question, directAnswer, fullExplanation, category, isTemporal, now, now]
    });
    if (cachedEntryCount !== null) cachedEntryCount++;
    return res;
  } catch (err) {
    console.error('Failed to save QA into Turso:', err.message);
    return null;
  }
}

/**
 * Purge bad or downvoted answer
 */
export async function purgeQA(id, client) {
  try {
    await client.execute({
      sql: 'DELETE FROM qa_cache WHERE id = ?',
      args: [id]
    });
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * User feedback voting: thumbs up or down
 */
export async function voteQA(id, voteType, client) {
  try {
    if (voteType === 'down') {
      const checkRes = await client.execute({
        sql: 'SELECT upvotes, downvotes FROM qa_cache WHERE id = ?',
        args: [id]
      });

      if (checkRes.rows && checkRes.rows.length > 0) {
        const row = checkRes.rows[0];
        const newDown = Number(row.downvotes) + 1;
        const up = Number(row.upvotes);

        // Quality control: If downvotes exceed upvotes, purge from Turso immediately!
        if (newDown > up) {
          await purgeQA(id, client);
          return { purged: true, message: 'Answer purged due to quality downvotes.' };
        } else {
          await client.execute({
            sql: 'UPDATE qa_cache SET downvotes = downvotes + 1 WHERE id = ?',
            args: [id]
          });
          return { success: true, purged: false };
        }
      }
    } else {
      await client.execute({
        sql: 'UPDATE qa_cache SET upvotes = upvotes + 1 WHERE id = ?',
        args: [id]
      });
      return { success: true, purged: false };
    }
  } catch (err) {
    return { error: err.message };
  }
}
