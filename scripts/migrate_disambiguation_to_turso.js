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
    CREATE TABLE IF NOT EXISTS disambiguation_senses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity TEXT NOT NULL,
      sense_key TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      heading TEXT NOT NULL,
      explanation TEXT NOT NULL,
      usage TEXT NOT NULL,
      site1_name TEXT NOT NULL,
      site1_url TEXT NOT NULL,
      site1_desc TEXT NOT NULL,
      site1_logo TEXT NOT NULL,
      site2_name TEXT NOT NULL,
      site2_url TEXT NOT NULL,
      site2_desc TEXT NOT NULL,
      site2_logo TEXT NOT NULL,
      keywords TEXT NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_disambig_entity ON disambiguation_senses(entity);`);

  const localDb = new DatabaseSync(path.resolve(__dirname, '../data/disambiguation_senses.db'));
  const rows = localDb.prepare('SELECT * FROM disambiguation_senses').all();

  const statements = rows.map(r => ({
    sql: `INSERT OR REPLACE INTO disambiguation_senses (id, entity, sense_key, category, title, heading, explanation, usage, site1_name, site1_url, site1_desc, site1_logo, site2_name, site2_url, site2_desc, site2_logo, keywords) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [r.id, r.entity, r.sense_key, r.category, r.title, r.heading, r.explanation, r.usage, r.site1_name, r.site1_url, r.site1_desc, r.site1_logo, r.site2_name, r.site2_url, r.site2_desc, r.site2_logo, r.keywords]
  }));

  if (statements.length > 0) {
    await client.batch(statements, 'write');
  }

  const res = await client.execute('SELECT count(*) as cnt FROM disambiguation_senses');
  console.log('✓ Disambiguation senses migrated to Turso:', res.rows[0].cnt);
}

main().catch(console.error);
