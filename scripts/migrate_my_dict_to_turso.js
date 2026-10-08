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
  console.log('Connecting to Turso...');
  
  // 1. Create table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS my_dictionary (
      word TEXT PRIMARY KEY,
      heading TEXT NOT NULL,
      explanation TEXT NOT NULL,
      usage TEXT NOT NULL,
      raw_entry TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_my_word ON my_dictionary(word);`);
  console.log('✓ Created my_dictionary table and index on Turso.');

  // 2. Read local sqlite
  const localDb = new DatabaseSync(path.resolve(__dirname, '../data/my_dictionary.db'));
  const rows = localDb.prepare('SELECT word, heading, explanation, usage, raw_entry, created_at FROM my_dictionary').all();
  console.log(`Found ${rows.length} rows in local my_dictionary.db.`);

  // 3. Migrate in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const statements = batch.map(r => ({
      sql: `INSERT OR REPLACE INTO my_dictionary (word, heading, explanation, usage, raw_entry, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [r.word, r.heading, r.explanation, r.usage, r.raw_entry, r.created_at]
    }));
    await client.batch(statements, 'write');
    process.stdout.write(`Migrated ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length} rows...\r`);
  }
  console.log(`\n✓ All ${rows.length} dictionary entries migrated to Turso successfully!`);

  // Verify count on Turso
  const res = await client.execute('SELECT count(*) as cnt FROM my_dictionary');
  console.log('Verified count on Turso:', res.rows[0].cnt);
}

main().catch(console.error);
