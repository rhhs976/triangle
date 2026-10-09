// Live Knowledge Graph Probe
// Provides zero-token, real-time factual knowledge extraction
// Powered by DuckDuckGo Instant Answers & Wikipedia Open Knowledge Graph

import dns from 'node:dns';
try {
  if (dns?.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (_) {}

const COMMON_TYPOS = {
  'te': 'the', 'th': 'the', 'da': 'the', 'wht': 'what', 'wat': 'what',
  'hw': 'how', 'whos': 'who', 'whm': 'whom', 'wer': 'where', 'wen': 'when',
  'wy': 'why', 'answr': 'answer', 'curent': 'current', 'currnt': 'current',
  'pres': 'president', 'prez': 'president', 'minstr': 'minister', 'ti': 'it',
  'nd': 'and', 'ot': 'to', 'fro': 'from', 'abt': 'about', 'whch': 'which'
};

const TEMPORAL_MARKERS = [
  'current', 'currently', 'now', 'today', 'latest', 'recent', 'present',
  'president', 'prime minister', 'ceo', 'chancellor', 'leader', 'governor', 'mayor',
  'monarch', 'king', 'queen', 'pope', 'senator', 'vice president', 'premier',
  'champion', 'winner', 'reigning', 'titleholder', 'capital', 'population'
];

/**
 * Normalizes query string and repairs common search typos
 */
export function normalizeQueryString(raw) {
  if (!raw) return '';
  const cleaned = raw.toLowerCase().replace(/'s\b/g, '').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = cleaned.split(' ').map(w => COMMON_TYPOS[w] || w);
  return tokens.join(' ');
}

/**
 * Extracts the target entity or subject from conversational queries
 */
export function extractTargetEntity(raw) {
  const normalized = normalizeQueryString(raw);
  const stripped = normalized
    .replace(/^(who|what|where|when|which|how|tell me about|do you know)\s+(is|was|are|were)?\s*(the)?\s*/i, '')
    .replace(/\b(current|currently|present|now|latest|today)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped || normalized;
}

/**
 * Checks if the question asks about a dynamic or time-sensitive entity
 */
export function isTemporalQuery(query) {
  const lower = (query || '').toLowerCase();
  return TEMPORAL_MARKERS.some(m => lower.includes(m));
}

/**
 * Splits text into clean sentences while preserving abbreviations
 */
function splitSentences(text) {
  if (!text) return [];
  const protectedText = text
    .replace(/\b([A-Z])\.\s+/g, '$1___DOT___ ')
    .replace(/\b(U\.S\.|e\.g\.|i\.e\.|vs\.|Dr\.|Mr\.|Mrs\.|Ms\.)/gi, m => m.replace(/\./g, '___DOT___'));

  const rawSentences = protectedText.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [protectedText];
  return rawSentences.map(s => s.replace(/___DOT___/g, '.').trim()).filter(Boolean);
}

/**
 * Probes live encyclopedic sources (0 Groq tokens)
 */
export async function probeLiveKnowledge(rawQuery) {
  const cleanQ = (rawQuery || '').trim();
  if (!cleanQ) return null;

  const entity = extractTargetEntity(cleanQ);
  if (!entity || entity.length < 3) return null;

  // 1. Try DuckDuckGo Instant Knowledge API
  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(entity)}&format=json&no_html=1&skip_disambig=1`;
    const ddgRes = await fetch(ddgUrl, {
      headers: { 'User-Agent': 'TriangleSearch/1.0 (https://github.com/rhhs976/triangle)' },
      signal: AbortSignal.timeout(1800)
    });

    if (ddgRes.ok) {
      const data = await ddgRes.json();
      if (data && data.AbstractText && data.AbstractText.length > 40) {
        return formatEncyclopedicAnswer(cleanQ, data.Heading || entity, data.AbstractText, data.AbstractURL, 'Knowledge Graph');
      }
    }
  } catch (_) {}

  // 2. Try Wikipedia Cirrus Search + Summary API
  try {
    const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(entity)}&srlimit=3&format=json`;
    const searchRes = await fetch(wikiSearchUrl, {
      headers: { 'User-Agent': 'TriangleSearch/1.0 (contact@triangle.org)' },
      signal: AbortSignal.timeout(1800)
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const topHit = searchData.query?.search?.[0];
      if (topHit && topHit.title) {
        const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topHit.title.replace(/ /g, '_'))}`;
        const sumRes = await fetch(sumUrl, {
          headers: { 'User-Agent': 'TriangleSearch/1.0 (contact@triangle.org)' },
          signal: AbortSignal.timeout(1800)
        });

        if (sumRes.ok) {
          const sumData = await sumRes.json();
          if (sumData && sumData.extract && sumData.type !== 'disambiguation' && sumData.extract.length > 40) {
            return formatEncyclopedicAnswer(
              cleanQ,
              sumData.title,
              sumData.extract,
              sumData.content_urls?.desktop?.page,
              sumData.description || 'Knowledge Graph'
            );
          }
        }
      }
    }
  } catch (_) {}

  return null;
}

/**
 * Formats encyclopedic text to exact 4-sentence contract:
 * Sentence 1: **Direct Answer**
 * Sentences 2-4: Factual background context
 */
function formatEncyclopedicAnswer(query, title, text, sourceUrl, category) {
  const sentences = splitSentences(text);
  if (!sentences.length) return null;

  const isWho = /\b(who|whose|whom)\b/i.test(query);

  // Locate the most direct answer sentence
  let directIdx = 0;

  if (isWho) {
    // For "who" queries, strongly prefer sentences with person officeholders/incumbents
    for (let i = 0; i < sentences.length; i++) {
      if (/(?:incumbent|took office|assumed office|served as|is an? \w+ (?:business executive|politician|statesman|leader)|succeeding)/i.test(sentences[i])) {
        directIdx = i;
        break;
      }
    }
  } else {
    for (let i = 0; i < sentences.length; i++) {
      if (/(?:capital|located|headquarters|founded|defined as|refers to)/i.test(sentences[i])) {
        directIdx = i;
        break;
      }
    }
  }

  const directSentence = sentences[directIdx];
  const explanationSentences = sentences.filter((_, idx) => idx !== directIdx).slice(0, 3);

  // If fewer than 3 sentences remain, add context or title definition
  while (explanationSentences.length < 3 && sentences.length > explanationSentences.length + 1) {
    const next = sentences[explanationSentences.length + 1];
    if (next) explanationSentences.push(next);
    else break;
  }

  const fullExplanation = explanationSentences.join(' ') || `${title} is documented in verified public records.`;

  return {
    found: true,
    title: directSentence,
    directAnswer: `**${directSentence}**`,
    fullExplanation: fullExplanation,
    category: category || 'Knowledge Graph',
    sourceUrl: sourceUrl || null,
    isTemporal: isTemporalQuery(query) ? 1 : 0,
    tokensUsed: 0
  };
}
