// Semantic QA Cache Engine for triangle search engine
// Connected to Turso Cloud with semantic matching, TTL expiration, and quality control

const STOP_WORDS = new Set([
  'what', 'whats', 'what\'s', 'is', 'the', 'of', 'in', 'a', 'an', 'are', 'was', 'were',
  'tell', 'me', 'who', 'whos', 'who\'s', 'where', 'wheres', 'where\'s', 'when', 'whens',
  'how', 'why', 'can', 'you', 'give', 'do', 'does', 'did', 'about', 'and', 'or', 'for',
  'to', 'from', 'with', 'by', 'at', 'on', 'know', 'please', 'explain', 'describe', 'define',
  'meaning', 'definition', 'mean', 'find', 'city', 'country', 'during', 'cause', 'causes',
  'caused', 'causing', 'happen', 'happens', 'happened', 'happening', 'occur', 'occurs',
  'occurred', 'occurring', 'make', 'makes', 'made', 'making', 'work', 'works', 'working',
  'look', 'looks', 'appear', 'appears', 'called', 'come', 'comes'
]);

function stemToken(w) {
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);
  return w;
}

// Temporal markers indicating facts that change over time
const TEMPORAL_MARKERS = [
  'current', 'currently', 'now', 'today', 'latest', 'recent', 'president', 'prime minister',
  'price', 'stock', 'worth', 'ceo', 'champion', 'weather', 'population', 'governor', 'senator',
  'age', 'salary', 'net worth'
];

/**
 * Converts any query into a canonical intent key.
 * Example:
 * "What is the capital of France?" -> "capital france"
 * "Tell me France's capital city"  -> "capital france"
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
    .filter(w => w.length > 1 && !STOP_WORDS.has(w))
    .map(w => stemToken(w))
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));

  // Sort unique meaningful words to guarantee order invariance
  const uniqueSorted = Array.from(new Set(words)).sort();
  return uniqueSorted.join(' ');
}

/**
 * Checks if a question has time-sensitive information
 */
export function isTemporalQuestion(question) {
  const lower = (question || '').toLowerCase();
  return TEMPORAL_MARKERS.some(m => lower.includes(m)) ? 1 : 0;
}

/**
 * Checks if a cached QA row has expired
 */
export function isQAExpired(row) {
  if (!row || !row.created_at) return true;
  const created = new Date(row.created_at).getTime();
  const now = Date.now();
  const ageDays = (now - created) / (1000 * 60 * 60 * 24);

  // Temporal facts expire after 7 days; evergreen facts expire after 90 days
  const maxDays = row.is_temporal ? 7 : 90;
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

/**
 * Save newly generated Groq QA into Turso Cloud
 */
export async function saveSemanticQA({ question, directAnswer, fullExplanation, category = 'Knowledge' }, client) {
  const canonicalKey = normalizeQuestionToCanonicalKey(question);
  if (!canonicalKey || !directAnswer) return null;

  const isTemporal = isTemporalQuestion(question);
  const now = new Date().toISOString();

  try {
    const res = await client.execute({
      sql: `INSERT OR REPLACE INTO qa_cache 
            (canonical_key, original_question, direct_answer, full_explanation, category, is_temporal, upvotes, downvotes, access_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, 0, 1, ?, ?)`,
      args: [canonicalKey, question, directAnswer, fullExplanation, category, isTemporal, now, now]
    });
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
