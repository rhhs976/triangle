import { createClient } from '@libsql/client';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TURSO_URL = 'libsql://triangle-search-triangle-search.aws-ap-southeast-2.turso.io';
const TURSO_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE0ODgyOTQsImlkIjoiMDFhMTFjZmYtYWMwMS03NjZjLThjZjUtYmVhYTM4NWQxNTQ2Iiwia2lkIjoiRUdaeGxicFhLdUpjem85RkVBcFBhVVN5ems2a0dVcTlxc3NfNzlqd1dUVSIsInJpZCI6ImE0NTBlMTAxLTZhNTUtNDc3Zi05MjI0LWEwZWNlOTQxODc5NiJ9.ew0u8RMGKOfAhrMIaCoPFtT9XlhCCYnnPsB3Bbyqm07srFgnT9yaajEM8TAk8rMS07CuqJSK6PpVea9QOJLZAA';

const client = createClient({
  url: TURSO_URL,
  authToken: TURSO_AUTH_TOKEN
});

async function main() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS history_dictionary (
      entity_id TEXT PRIMARY KEY,
      entity_name TEXT NOT NULL,
      exact_date TEXT,
      verified_fact TEXT NOT NULL
    );
  `);

  const localDb = new DatabaseSync(path.resolve(__dirname, '../files/historical_events_dictionary.db'));
  const rows = localDb.prepare('SELECT * FROM history_dictionary').all();

  const statements = rows.map(r => ({
    sql: `INSERT OR REPLACE INTO history_dictionary (entity_id, entity_name, exact_date, verified_fact) VALUES (?, ?, ?, ?)`,
    args: [r.entity_id, r.entity_name, r.exact_date, r.verified_fact]
  }));

  if (statements.length > 0) {
    await client.batch(statements, 'write');
  }

  const res = await client.execute('SELECT count(*) as cnt FROM history_dictionary');
  console.log('✓ History dictionary migrated to Turso:', res.rows[0].cnt);
}

main().catch(console.error);
