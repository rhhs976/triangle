// Cloudflare Pages Function: /api/search
// 100% Serverless Edge Search with Turso Cloud, Semantic QA Cache & Groq

import { createClient } from '@libsql/client/web';

const TURSO_URL = 'libsql://triangle-search-triangle-search.aws-ap-southeast-2.turso.io';
const TURSO_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE0ODgyOTQsImlkIjoiMDFhMTFjZmYtYWMwMS03NjZjLThjZjUtYmVhYTM4NWQxNTQ2Iiwia2lkIjoiRUdaeGxicFhLdUpjem85RkVBcFBhVVN5ems2a0dVcTlxc3NfNzlqd1dUVSIsInJpZCI6ImE0NTBlMTAxLTZhNTUtNDc3Zi05MjI0LWEwZWNlOTQxODc5NiJ9.ew0u8RMGKOfAhrMIaCoPFtT9XlhCCYnnPsB3Bbyqm07srFgnT9yaajEM8TAk8rMS07CuqJSK6PpVea9QOJLZAA';


const STOP_WORDS = new Set([
  'what', 'whats', 'what\'s', 'is', 'the', 'of', 'in', 'a', 'an', 'are', 'was', 'were',
  'tell', 'me', 'who', 'whos', 'who\'s', 'where', 'wheres', 'where\'s', 'when', 'whens',
  'how', 'why', 'can', 'you', 'give', 'do', 'does', 'did', 'about', 'and', 'or', 'for',
  'to', 'from', 'with', 'by', 'at', 'on', 'know', 'please', 'explain', 'describe', 'city', 'country'
]);

function getTursoClient(env) {
  return createClient({
    url: env?.TURSO_DATABASE_URL || TURSO_URL,
    authToken: env?.TURSO_AUTH_TOKEN || TURSO_AUTH_TOKEN
  });
}

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

function normalizeToCanonicalKey(str) {
  if (!str) return '';
  const cleaned = str.toLowerCase().replace(/'s\b/g, '').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = cleaned.split(' ')
    .map(w => w.trim())
    .map(w => COMMON_TYPOS[w] || w)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
  return Array.from(new Set(words)).sort().join(' ');
}

function extractTargetEntity(raw) {
  const cleaned = (raw || '').toLowerCase().replace(/'s\b/g, '').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = cleaned.split(' ').map(w => COMMON_TYPOS[w] || w);
  const normalized = tokens.join(' ');
  const stripped = normalized
    .replace(/^(who|what|where|when|which|how|tell me about|do you know)\s+(is|was|are|were)?\s*(the)?\s*/i, '')
    .replace(/\b(current|currently|present|now|latest|today)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped || normalized;
}

function splitSentences(text) {
  if (!text) return [];
  const protectedText = text
    .replace(/\b([A-Z])\.\s+/g, '$1___DOT___ ')
    .replace(/\b(U\.S\.|e\.g\.|i\.e\.|vs\.|Dr\.|Mr\.|Mrs\.|Ms\.)/gi, m => m.replace(/\./g, '___DOT___'));

  const rawSentences = protectedText.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [protectedText];
  return rawSentences.map(s => s.replace(/___DOT___/g, '.').trim()).filter(Boolean);
}

async function probeLiveKnowledge(rawQuery) {
  const cleanQ = (rawQuery || '').trim();
  if (!cleanQ) return null;

  const entity = extractTargetEntity(cleanQ);
  if (!entity || entity.length < 3) return null;

  // 1. DuckDuckGo Instant Knowledge API
  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(entity)}&format=json&no_html=1&skip_disambig=1`;
    const ddgRes = await fetch(ddgUrl, {
      headers: { 'User-Agent': 'TriangleSearch/1.0 (https://github.com/rhhs976/triangle)' },
      signal: AbortSignal.timeout(1800)
    });

    if (ddgRes.ok) {
      const data = await ddgRes.json();
      if (data && data.AbstractText && data.AbstractText.length > 40) {
        return formatEncyclopedicAnswer(cleanQ, data.Heading || entity, data.AbstractText, 'Knowledge Graph');
      }
    }
  } catch (_) {}

  // 2. Wikipedia Cirrus Search + Summary API
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
              sumData.description || 'Knowledge Graph'
            );
          }
        }
      }
    }
  } catch (_) {}

  return null;
}

function formatEncyclopedicAnswer(query, title, text, category) {
  const sentences = splitSentences(text);
  if (!sentences.length) return null;

  const isWho = /\b(who|whose|whom)\b/i.test(query);
  let directIdx = 0;

  if (isWho) {
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
  const fullExplanation = explanationSentences.join(' ') || `${title} is documented in verified public records.`;
  const isTemporal = TEMPORAL_MARKERS.some(m => (query || '').toLowerCase().includes(m));

  return {
    found: true,
    title: directSentence,
    directAnswer: `**${directSentence}**`,
    fullExplanation: fullExplanation,
    category: category || 'Knowledge Graph',
    isTemporal: isTemporal ? 1 : 0,
    tokensUsed: 0
  };
}

function solveArithmetic(input) {
  try {
    const clean = input.trim().replace(/^calculate\s+/i, '').replace(/[\s=]+$/g, '');
    if (/^[\d\s+\-*/^().]+$/.test(clean) && /[+\-*/^]/.test(clean)) {
      const sanitized = clean.replace(/\^/g, '**');
      const val = Function(`"use strict"; return (${sanitized});`)();
      if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
        return { success: true, expression: clean, answer: String(val) };
      }
    }
  } catch (_) {}
  return { success: false };
}

function getWebsites(topic) {
  const clean = encodeURIComponent(topic.trim());
  return [
    {
      siteName: 'Wikipedia',
      domain: 'en.wikipedia.org',
      url: `https://en.wikipedia.org/wiki/${clean}`,
      logo: 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
      title: `${topic} — Wikipedia`,
      description: `Comprehensive encyclopedia overview, history, and verified details for ${topic}.`
    },
    {
      siteName: 'Encyclopædia Britannica',
      domain: 'britannica.com',
      url: `https://www.britannica.com/topic/${clean}`,
      logo: 'https://www.britannica.com/favicon.ico',
      title: `${topic} | Definition & Facts`,
      description: `Authoritative analysis from Encyclopædia Britannica editors on ${topic}.`
    }
  ];
}

async function callGroqQA(question, apiKey) {
  const models = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
  const prompt = `You are an authoritative encyclopedic knowledge search engine. Answer the question: "${question}".

Strict Formatting Requirements:
1. Provide an answer of EXACTLY 4 sentences in total.
2. Sentence 1 MUST be the direct, bold answer.
3. The remaining 3 sentences MUST provide clear, factual context and mechanics underneath.
4. Absolutely no conversational filler, chatbot greetings, or intros.

Format EXACTLY:
Direct Answer:
**[Sentence 1: The bold direct answer]**

Explanation:
[Sentences 2, 3, and 4: Exactly 3 sentences of concise factual context and explanation]

Category:
[e.g. Science, Geography, History, Technology, General Knowledge]`;

  for (const model of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 350
        })
      });

      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content?.trim();
        if (content) {
          let directAnswer = '';
          let fullExplanation = '';
          let category = 'General Knowledge';

          const directMatch = content.match(/Direct Answer:\s*([\s\S]*?)(?=(?:\n\s*Explanation:|$))/i);
          if (directMatch) directAnswer = directMatch[1].trim();

          const explMatch = content.match(/Explanation:\s*([\s\S]*?)(?=(?:\n\s*Category:|$))/i);
          if (explMatch) fullExplanation = explMatch[1].trim();

          const catMatch = content.match(/Category:\s*([\s\S]*?)$/i);
          if (catMatch) category = catMatch[1].trim();

          if (!directAnswer || !fullExplanation) {
            const parts = content.split('\n\n').filter(p => p.trim().length > 0);
            directAnswer = parts[0]?.trim() || question;
            fullExplanation = parts.slice(1).join('\n\n').trim() || content;
          }

          if (fullExplanation.length >= 50 && directAnswer.length >= 10) {
            return { directAnswer, fullExplanation, category };
          }
        }
      }
    } catch (_) {}
  }
  return null;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();

  if (!q) {
    return new Response(JSON.stringify({ found: false, error: 'Empty query' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  // 1. Math calculation
  const math = solveArithmetic(q);
  if (math.success) {
    return new Response(JSON.stringify({
      found: true,
      query: q,
      category: 'Math',
      title: `${math.expression} = ${math.answer}`,
      snippet: `Calculated answer: ${math.answer}`,
      sources: getWebsites(q)
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  const client = getTursoClient(env);
  const isQuestion = /^(?:where|what|who|when|how|which|why|is|are|can|does|do|tell me)\b/i.test(q) || q.endsWith('?');
  const canonicalKey = normalizeToCanonicalKey(q);

  // 2. Question Answering: Check Turso Cloud QA Cache first
  if (isQuestion && canonicalKey) {
    let cachedRow = null;
    try {
      const qaRes = await client.execute({
        sql: 'SELECT id, canonical_key, direct_answer, full_explanation, category, upvotes, downvotes, is_temporal, created_at FROM qa_cache WHERE canonical_key = ? LIMIT 1',
        args: [canonicalKey]
      });

      if (qaRes.rows && qaRes.rows.length > 0) {
        const row = qaRes.rows[0];
        if (Number(row.downvotes) <= Number(row.upvotes)) {
          // If not temporal, serve immediately from cache
          if (row.is_temporal !== 1 && row.is_temporal !== '1') {
            return new Response(JSON.stringify({
              found: true,
              id: row.id,
              query: q,
              category: row.category || 'Direct QA',
              title: row.direct_answer,
              directAnswer: row.direct_answer,
              fullExplanation: row.full_explanation,
              snippet: row.direct_answer,
              details: {
                id: row.id,
                directAnswer: row.direct_answer,
                fullExplanation: row.full_explanation,
                cachedFromTurso: true
              },
              sources: getWebsites(q)
            }), {
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
          }
          cachedRow = row;
        }
      }
    } catch (_) {}

    // Zero-Token Live Encyclopedic Probe (Instant verified answers for leaders, offices, entities, facts)
    try {
      const liveFact = await probeLiveKnowledge(q);
      if (liveFact && liveFact.found) {
        const now = new Date().toISOString();
        let savedId = cachedRow ? cachedRow.id : null;
        try {
          const ins = await client.execute({
            sql: `INSERT OR REPLACE INTO qa_cache (canonical_key, original_question, direct_answer, full_explanation, category, is_temporal, upvotes, downvotes, access_count, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, 1, 0, 1, ?, ?)`,
            args: [canonicalKey, q, liveFact.directAnswer, liveFact.fullExplanation, liveFact.category, liveFact.isTemporal || 0, now, now]
          });
          savedId = ins.lastInsertRowid;
        } catch (_) {}

        return new Response(JSON.stringify({
          found: true,
          id: savedId,
          query: q,
          category: liveFact.category || 'Knowledge Graph',
          title: liveFact.directAnswer,
          directAnswer: liveFact.directAnswer,
          fullExplanation: liveFact.fullExplanation,
          snippet: liveFact.directAnswer,
          details: {
            id: savedId,
            directAnswer: liveFact.directAnswer,
            fullExplanation: liveFact.fullExplanation,
            tokensUsed: 0,
            cachedFromTurso: false,
            liveProbe: true
          },
          sources: getWebsites(q)
        }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    } catch (_) {}

    // If live probe didn't match but we had a cached row, return it
    if (cachedRow) {
      return new Response(JSON.stringify({
        found: true,
        id: cachedRow.id,
        query: q,
        category: cachedRow.category || 'Direct QA',
        title: cachedRow.direct_answer,
        directAnswer: cachedRow.direct_answer,
        fullExplanation: cachedRow.full_explanation,
        snippet: cachedRow.direct_answer,
        details: {
          id: cachedRow.id,
          directAnswer: cachedRow.direct_answer,
          fullExplanation: cachedRow.full_explanation,
          cachedFromTurso: true
        },
        sources: getWebsites(q)
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Groq On-Demand Generation for Question (with Storage Cap Guard)
    const MAX_LIMIT = parseInt(env?.MAX_QA_CACHE_LIMIT || '5000000', 10);
    const groqKey = env?.GROQ_API_KEY;
    if (groqKey) {
      // Check if limit is reached before calling Groq
      try {
        const countRes = await client.execute('SELECT COUNT(1) AS total FROM qa_cache');
        const currentTotal = Number(countRes?.rows?.[0]?.total) || 0;
        if (currentTotal >= MAX_LIMIT) {
          return new Response(JSON.stringify({
            found: true,
            query: q,
            category: 'Storage Limit',
            title: '**The knowledge database has reached its maximum storage capacity limit.**',
            directAnswer: '**The knowledge database has reached its maximum storage capacity limit.**',
            fullExplanation: `The search engine has stored the maximum allowed cap of ${MAX_LIMIT.toLocaleString()} questions. Generation has safely stopped to prevent exceeding storage quotas. Existing cached answers remain fully accessible.`,
            snippet: 'Storage capacity limit reached.',
            sources: getWebsites(q)
          }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
      } catch (_) {}

      const generatedQA = await callGroqQA(q, groqKey);

    if (generatedQA) {
      const now = new Date().toISOString();
      let newId = null;
      try {
        const ins = await client.execute({
          sql: `INSERT OR REPLACE INTO qa_cache (canonical_key, original_question, direct_answer, full_explanation, category, is_temporal, upvotes, downvotes, access_count, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 0, 1, 0, 1, ?, ?)`,
          args: [canonicalKey, q, generatedQA.directAnswer, generatedQA.fullExplanation, generatedQA.category, now, now]
        });
        newId = ins.lastInsertRowid;
      } catch (_) {}

      return new Response(JSON.stringify({
        found: true,
        id: newId,
        query: q,
        category: 'Direct QA',
        title: generatedQA.directAnswer,
        directAnswer: generatedQA.directAnswer,
        fullExplanation: generatedQA.fullExplanation,
        snippet: generatedQA.directAnswer,
        details: {
          id: newId,
          directAnswer: generatedQA.directAnswer,
          fullExplanation: generatedQA.fullExplanation,
          cachedFromTurso: false
        },
        sources: getWebsites(q)
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  // 3. Dictionary Term Lookup in Turso Cloud
  const clean = q.toLowerCase();
  try {
    const rs = await client.execute({
      sql: 'SELECT word, heading, explanation, usage, raw_entry FROM my_dictionary WHERE word = ? LIMIT 1',
      args: [clean]
    });

    if (rs.rows && rs.rows.length > 0) {
      const row = rs.rows[0];
      return new Response(JSON.stringify({
        found: true,
        query: q,
        category: 'Dictionary',
        title: clean.charAt(0).toUpperCase() + clean.slice(1),
        heading: row.heading,
        explanation: row.explanation,
        usage: row.usage,
        raw_entry: row.raw_entry,
        snippet: row.explanation,
        details: row,
        sources: getWebsites(clean)
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  } catch (_) {}

  return new Response(JSON.stringify({
    found: false,
    query: q,
    message: 'No result found.'
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
