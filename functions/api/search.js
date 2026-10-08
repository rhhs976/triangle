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

function normalizeToCanonicalKey(str) {
  if (!str) return '';
  const cleaned = str.toLowerCase().replace(/'s\b/g, '').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = cleaned.split(' ').map(w => w.trim()).filter(w => w.length > 1 && !STOP_WORDS.has(w));
  return Array.from(new Set(words)).sort().join(' ');
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
  const prompt = `You are an authoritative encyclopedic knowledge search engine. Provide a comprehensive, accurate answer to the question: "${question}".

Strict Requirements:
1. Provide an exact, bold direct answer first.
2. The explanation MUST be at least 1 rich, informative, factual paragraph long (minimum 4 to 6 full sentences), explaining the background, context, mechanics, and key details.
3. No conversational filler or chatbot greetings.

Format EXACTLY:
Direct Answer:
[Bold, exact factual answer]

Explanation:
[At least 1 rich, comprehensive factual paragraph containing 4-6 sentences]

Category:
[e.g. Geography, Science, History, Technology, Nature, General Knowledge]`;

  for (const model of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 700
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

          if (fullExplanation.length >= 150) {
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
    try {
      const qaRes = await client.execute({
        sql: 'SELECT id, canonical_key, direct_answer, full_explanation, category, upvotes, downvotes, is_temporal, created_at FROM qa_cache WHERE canonical_key = ? LIMIT 1',
        args: [canonicalKey]
      });

      if (qaRes.rows && qaRes.rows.length > 0) {
        const row = qaRes.rows[0];
        if (Number(row.downvotes) <= Number(row.upvotes)) {
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
      }
    } catch (_) {}

    // Groq On-Demand Generation for Question (At least 1 full paragraph)
    const groqKey = env?.GROQ_API_KEY;
    if (groqKey) {
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
