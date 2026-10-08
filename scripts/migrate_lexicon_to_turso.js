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
  console.log('Creating pos_lexicon table on Turso...');
  await client.execute(`
    CREATE TABLE IF NOT EXISTS pos_lexicon (
      word TEXT PRIMARY KEY,
      primary_pos TEXT NOT NULL,
      all_pos TEXT NOT NULL
    );
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_pos_word ON pos_lexicon(word);`);

  const localDb = new DatabaseSync(path.resolve(__dirname, '../data/english_pos_lexicon.db'));
  const rows = localDb.prepare('SELECT word, primary_pos, all_pos FROM pos_lexicon').all();
  console.log(`Loaded ${rows.length} rows from local english_pos_lexicon.db.`);

  const BATCH_SIZE = 500;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const statements = batch.map(r => ({
      sql: `INSERT OR REPLACE INTO pos_lexicon (word, primary_pos, all_pos) VALUES (?, ?, ?)`,
      args: [r.word, r.primary_pos, r.all_pos]
    }));
    await client.batch(statements, 'write');
    if (i % 5000 === 0 || i + BATCH_SIZE >= rows.length) {
      process.stdout.write(`Migrated ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length} lexicon words...\n`);
    }
  }

  const res = await client.execute('SELECT count(*) as cnt FROM pos_lexicon');
  console.log('✓ All POS lexicon entries migrated to Turso:', res.rows[0].cnt);
}

main().catch(console.error);
