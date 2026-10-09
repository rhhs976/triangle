// Cloudflare Pages Function: /api/suggest
// Fast in-memory / Turso prefix autocomplete typeahead for Triangle Omni-search bar

import { createClient } from '@libsql/client/web';

const TURSO_URL = 'libsql://triangle-search-triangle-search.aws-ap-southeast-2.turso.io';
const TURSO_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE0ODgyOTQsImlkIjoiMDFhMTFjZmYtYWMwMS03NjZjLThjZjUtYmVhYTM4NWQxNTQ2Iiwia2lkIjoiRUdaeGxicFhLdUpjem85RkVBcFBhVVN5ems2a0dVcTlxc3NfNzlqd1dUVSIsInJpZCI6ImE0NTBlMTAxLTZhNTUtNDc3Zi05MjI0LWEwZWNlOTQxODc5NiJ9.ew0u8RMGKOfAhrMIaCoPFtT9XlhCCYnnPsB3Bbyqm07srFgnT9yaajEM8TAk8rMS07CuqJSK6PpVea9QOJLZAA';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();

  if (!q || q.length < 1) {
    return new Response(JSON.stringify({ query: '', suggestions: [] }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  const client = createClient({
    url: env?.TURSO_DATABASE_URL || TURSO_URL,
    authToken: env?.TURSO_AUTH_TOKEN || TURSO_AUTH_TOKEN
  });

  try {
    const res = await client.execute({
      sql: 'SELECT word FROM my_dictionary WHERE word LIKE ? ORDER BY length(word) ASC, word ASC LIMIT 6',
      args: [q + '%']
    });

    const suggestions = res.rows ? res.rows.map(r => r.word) : [];

    return new Response(JSON.stringify({ query: q, suggestions }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ query: q, suggestions: [] }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
