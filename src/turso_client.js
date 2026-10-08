import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || '';
let TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || '';

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  try {
    const envFile = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, 'utf-8');
      const uMatch = content.match(/TURSO_DATABASE_URL=([^\r\n]+)/);
      const tMatch = content.match(/TURSO_AUTH_TOKEN=([^\r\n]+)/);
      if (uMatch) TURSO_DATABASE_URL = uMatch[1].trim();
      if (tMatch) TURSO_AUTH_TOKEN = tMatch[1].trim();
    }
  } catch (_) {}
}

// Default credentials provided by user
if (!TURSO_DATABASE_URL) {
  TURSO_DATABASE_URL = 'libsql://triangle-search-triangle-search.aws-ap-southeast-2.turso.io';
}
if (!TURSO_AUTH_TOKEN) {
  TURSO_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE0ODgyOTQsImlkIjoiMDFhMTFjZmYtYWMwMS03NjZjLThjZjUtYmVhYTM4NWQxNTQ2Iiwia2lkIjoiRUdaeGxicFhLdUpjem85RkVBcFBhVVN5ems2a0dVcTlxc3NfNzlqd1dUVSIsInJpZCI6ImE0NTBlMTAxLTZhNTUtNDc3Zi05MjI0LWEwZWNlOTQxODc5NiJ9.ew0u8RMGKOfAhrMIaCoPFtT9XlhCCYnnPsB3Bbyqm07srFgnT9yaajEM8TAk8rMS07CuqJSK6PpVea9QOJLZAA';
}

export const turso = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN
});

export default turso;
