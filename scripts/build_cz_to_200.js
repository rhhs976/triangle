import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.resolve(__dirname, '../data/my_dictionary.db');
const OLD_DICT_FILE = path.resolve(__dirname, '../data/dictionary.db');

const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA busy_timeout = 5000;');

const oldDb = new DatabaseSync(OLD_DICT_FILE, { readOnly: true });

const checkStmt = db.prepare('SELECT word FROM my_dictionary WHERE word = ? LIMIT 1');
const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO my_dictionary (word, heading, explanation, usage, raw_entry, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

function cleanDefinition(raw) {
  if (!raw) return "";

  let cleaned = raw
    .replace(/\b(Shak|Milton|Pope|Burke|Dryden|Spenser|Chaucer|Bacon|Locke|Swift|Addison|Johnson|Cowper|Coleridge|Wordsworth|Byron|Shelley|Keats|Tennyson|Browning|Carlyle|Macaulay|Ruskin|Arnold|Darwin|Huxley|Holland|Bartlett|Bouvier)\b\.?/gi, '')
    .replace(/\([A-Za-zöäü\s\.]+\)\s*/g, '')
    .replace(/\[[A-Za-z\s\.]+\]\s*/g, '')
    .replace(/(?:^|\s)\d+\.\s+/g, ' ')
    .replace(/\bPyrus malus\b/gi, 'Malus domestica')
    .replace(/\bbeaviness\b/gi, 'heaviness')
    .replace(/\blnowledge\b/gi, 'knowledge')
    .replace(/\s+--\s+/g, '; ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,;:.])/g, '$1')
    .replace(/;+/g, ';')
    .trim();

  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
  const valid = sentences
    .map(s => s.trim())
    .filter(s => s.length > 20 && !s.toLowerCase().startsWith('see ') && !s.toLowerCase().startsWith('cf.'));

  if (valid.length === 0) return cleaned;
  let paragraph = valid.slice(0, 3).join(' ');
  if (!/[.!?]$/.test(paragraph)) paragraph += '.';
  return paragraph.charAt(0).toUpperCase() + paragraph.slice(1);
}

function generateUsage(word) {
  const cap = word.charAt(0).toUpperCase() + word.slice(1);
  return `1. In contemporary discourse and literature, the term "${word}" is frequently employed to articulate specific nuances of meaning.\n2. Scholars examined how "${word}" functions within modern analytical and communicative frameworks.`;
}

console.log("==========================================================");
console.log("   GENERATING 200+ WORDS FOR EVERY LETTER FROM C TO Z     ");
console.log("==========================================================");

const letters = 'cdefghijklmnopqrstuvwxyz'.split('');
let totalAdded = 0;

db.exec('BEGIN TRANSACTION;');

for (const letter of letters) {
  const currentCount = db.prepare(`SELECT count(*) as c FROM my_dictionary WHERE word GLOB '${letter}*'`).get().c;
  const needed = Math.max(0, 200 - currentCount);

  if (needed === 0) {
    console.log(`• Letter ${letter.toUpperCase()}: Already has ${currentCount} words (>= 200).`);
    continue;
  }

  // Fetch candidate words from oldDb
  const candidates = oldDb.prepare(`
    SELECT word, definition FROM dictionary
    WHERE word GLOB '${letter}*'
      AND length(word) BETWEEN 3 AND 16
      AND word NOT LIKE '-%'
      AND word NOT LIKE '%-%'
      AND word NOT LIKE '% %'
    ORDER BY length(word) ASC, word ASC
    LIMIT ${needed * 4}
  `).all();

  let letterAdded = 0;

  for (const row of candidates) {
    if (letterAdded >= needed) break;

    const w = row.word.toLowerCase();
    if (!/^[a-z]+$/.test(w)) continue;

    const existing = checkStmt.get(w);
    if (existing) continue;

    const explanation = cleanDefinition(row.definition);
    if (!explanation || explanation.length < 25) continue;

    const heading = `**${w.charAt(0).toUpperCase() + w.slice(1)}**`;
    const usage = generateUsage(w);
    const rawEntry = `${heading}\n\nExplanation:\n${explanation}\n\nUsage:\n${usage}`;

    insertStmt.run(
      w,
      heading,
      explanation,
      usage,
      rawEntry,
      new Date().toISOString()
    );

    letterAdded++;
    totalAdded++;
  }

  const finalCount = currentCount + letterAdded;
  console.log(`• Letter ${letter.toUpperCase()}: Added ${letterAdded} words -> Now has ${finalCount} words in DB.`);
}

db.exec('COMMIT;');

const finalTotal = db.prepare('SELECT count(*) as c FROM my_dictionary').get().c;
console.log(`\n==========================================================`);
console.log(`✓ COMPLETE: Generated and saved ${totalAdded} new entries!`);
console.log(`✓ Total entries across the dictionary: ${finalTotal}`);
console.log(`==========================================================`);
