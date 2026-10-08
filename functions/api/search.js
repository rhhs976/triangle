// Cloudflare Pages Function: /api/search
// 100% Serverless, Edge-Native Search with Turso Cloud & Groq API

import { createClient } from '@libsql/client/web';

const TURSO_URL = 'libsql://triangle-search-triangle-search.aws-ap-southeast-2.turso.io';
const TURSO_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE0ODgyOTQsImlkIjoiMDFhMTFjZmYtYWMwMS03NjZjLThjZjUtYmVhYTM4NWQxNTQ2Iiwia2lkIjoiRUdaeGxicFhLdUpjem85RkVBcFBhVVN5ems2a0dVcTlxc3NfNzlqd1dUVSIsInJpZCI6ImE0NTBlMTAxLTZhNTUtNDc3Zi05MjI0LWEwZWNlOTQxODc5NiJ9.ew0u8RMGKOfAhrMIaCoPFtT9XlhCCYnnPsB3Bbyqm07srFgnT9yaajEM8TAk8rMS07CuqJSK6PpVea9QOJLZAA';

function getTursoClient(env) {
  return createClient({
    url: env?.TURSO_DATABASE_URL || TURSO_URL,
    authToken: env?.TURSO_AUTH_TOKEN || TURSO_AUTH_TOKEN
  });
}

function solveArithmetic(input) {
  try {
    const clean = input.trim().replace(/^calculate\s+/i, '').replace(/[\s=]+$/g, '');
    if (/^[\d\s+\-*/^().]+$/.test(clean) && /[+\-*/^]/.test(clean)) {
      const sanitized = clean.replace(/\^/g, '**');
      const val = Function(`"use strict"; return (${sanitized});`)();
      if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
        return {
          success: true,
          expression: clean,
          answer: String(val)
        };
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

async function callGroq(word, apiKey) {
  const models = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
  const prompt = `You are an authoritative encyclopedic dictionary. Define: "${word.trim()}".
Format EXACTLY:
**${word.trim()}**

Explanation:
[1 clear, modern, comprehensive factual paragraph]

Usage:
1. [Example sentence 1]
2. [Example sentence 2]`;

  for (const model of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 600
        })
      });

      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content?.trim();
        if (content) {
          let heading = `**${word.charAt(0).toUpperCase() + word.slice(1)}**`;
          const headingMatch = content.match(/^\*\*([^*]+)\*\*/m);
          if (headingMatch) heading = `**${headingMatch[1].trim()}**`;

          let explanation = '';
          const explMatch = content.match(/Explanation:\s*([\s\S]*?)(?=(?:\n\s*Usage:|$))/i);
          if (explMatch) explanation = explMatch[1].trim();

          let usage = '';
          const usageMatch = content.match(/Usage:\s*([\s\S]*?)$/i);
          if (usageMatch) usage = usageMatch[1].trim();

          if (!explanation) {
            const lines = content.split('\n').filter(l => l.trim().length > 0);
            explanation = lines.slice(1).join(' ').trim();
          }
          if (!usage) {
            usage = `The term "${word}" is commonly utilized in modern English.`;
          }

          return {
            word: word.toLowerCase().trim(),
            heading,
            explanation,
            usage,
            raw_entry: content,
            created_at: new Date().toISOString()
          };
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
  const clean = q.toLowerCase();

  // 2. Query Turso Cloud Database
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

  // 3. Groq On-Demand Synthesis & Cloud Save
  const groqKey = env?.GROQ_API_KEY;
  if (!groqKey) {
    return new Response(JSON.stringify({
      found: false,
      query: q,
      message: 'Word not found in database.'
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  const record = await callGroq(q, groqKey);

  if (record) {
    try {
      await client.execute({
        sql: 'INSERT OR REPLACE INTO my_dictionary (word, heading, explanation, usage, raw_entry, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        args: [record.word, record.heading, record.explanation, record.usage, record.raw_entry, record.created_at]
      });
    } catch (_) {}

    return new Response(JSON.stringify({
      found: true,
      query: q,
      category: 'Dictionary',
      title: q.charAt(0).toUpperCase() + q.slice(1),
      heading: record.heading,
      explanation: record.explanation,
      usage: record.usage,
      raw_entry: record.raw_entry,
      snippet: record.explanation,
      details: record,
      sources: getWebsites(q)
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  return new Response(JSON.stringify({
    found: false,
    query: q,
    message: 'No result found.'
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
