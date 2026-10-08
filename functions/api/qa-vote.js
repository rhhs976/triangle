// Cloudflare Pages Function: /api/qa/vote
// Thumbs up / down feedback endpoint

import { createClient } from '@libsql/client/web';

const TURSO_URL = 'libsql://triangle-search-triangle-search.aws-ap-southeast-2.turso.io';
const TURSO_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE0ODgyOTQsImlkIjoiMDFhMTFjZmYtYWMwMS03NjZjLThjZjUtYmVhYTM4NWQxNTQ2Iiwia2lkIjoiRUdaeGxicFhLdUpjem85RkVBcFBhVVN5ems2a0dVcTlxc3NfNzlqd1dUVSIsInJpZCI6ImE0NTBlMTAxLTZhNTUtNDc3Zi05MjI0LWEwZWNlOTQxODc5NiJ9.ew0u8RMGKOfAhrMIaCoPFtT9XlhCCYnnPsB3Bbyqm07srFgnT9yaajEM8TAk8rMS07CuqJSK6PpVea9QOJLZAA';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { id, vote } = body;

    if (!id || !['up', 'down'].includes(vote)) {
      return new Response(JSON.stringify({ error: 'Invalid id or vote' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const client = createClient({
      url: env?.TURSO_DATABASE_URL || TURSO_URL,
      authToken: env?.TURSO_AUTH_TOKEN || TURSO_AUTH_TOKEN
    });

    if (vote === 'down') {
      const checkRes = await client.execute({
        sql: 'SELECT upvotes, downvotes FROM qa_cache WHERE id = ?',
        args: [id]
      });

      if (checkRes.rows && checkRes.rows.length > 0) {
        const row = checkRes.rows[0];
        const newDown = Number(row.downvotes) + 1;
        const up = Number(row.upvotes);

        if (newDown > up) {
          await client.execute({
            sql: 'DELETE FROM qa_cache WHERE id = ?',
            args: [id]
          });
          return new Response(JSON.stringify({ purged: true, message: 'Purged due to downvotes' }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        } else {
          await client.execute({
            sql: 'UPDATE qa_cache SET downvotes = downvotes + 1 WHERE id = ?',
            args: [id]
          });
        }
      }
    } else {
      await client.execute({
        sql: 'UPDATE qa_cache SET upvotes = upvotes + 1 WHERE id = ?',
        args: [id]
      });
    }

    return new Response(JSON.stringify({ success: true, purged: false }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
