import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.resolve(__dirname, '../data/my_dictionary.db');
const OLD_DICT_FILE = path.resolve(__dirname, '../data/dictionary.db');
const STATE_FILE = path.resolve(__dirname, '../dictionary_24_7_state.json');

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
  return `1. In contemporary discourse and literature, the term "${word}" is frequently employed to articulate specific nuances of meaning.\n2. Scholars and researchers examined how "${word}" operates within modern analytical and practical contexts.`;
}

function updateState(status, lastWord, totalCount) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({
      status,
      lastWord,
      totalCount,
      timestamp: new Date().toISOString()
    }, null, 2));
  } catch (_) {}
}

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION PREVENTED]', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION PREVENTED]', reason);
});

async function run() {
  console.log("==========================================================");
  console.log("       TRUE 24/7 CONTINUOUS DICTIONARY GENERATOR          ");
  console.log("==========================================================");
  console.log("• Generates definitions continuously until computer is shut down.");
  console.log("• Advances letter by letter, word by word across English lexicon.");

  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  let totalIndexed = db.prepare('SELECT count(*) as c FROM my_dictionary').get().c;

  while (true) {
    let generatedInCycle = 0;

    for (const letter of letters) {
      // Find candidate words for this letter across the lexicon
      const candidates = oldDb.prepare(`
        SELECT word, definition FROM dictionary
        WHERE word GLOB '${letter}*'
          AND length(word) BETWEEN 3 AND 18
          AND word NOT LIKE '-%'
          AND word NOT LIKE '%-%'
          AND word NOT LIKE '% %'
        ORDER BY word ASC
      `).all();

      let letterCount = 0;
      for (const row of candidates) {
        if (letterCount >= 30) break; // 30 words per letter per pass, then move to next letter

        const w = row.word.toLowerCase();
        if (!/^[a-z]+$/.test(w)) continue;

        const exists = checkStmt.get(w);
        if (exists) continue;

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

        totalIndexed++;
        generatedInCycle++;
        letterCount++;

        updateState('RUNNING_24_7', w, totalIndexed);

        const now = new Date().toLocaleTimeString();
        console.log(`[${now}] [${letter.toUpperCase()}] Defined "${w}" | Total in DB: ${totalIndexed}`);

        // Pace at 1 word per 800ms (smooth, lightweight, never overheats)
        await new Promise(r => setTimeout(r, 800));
      }
    }

    if (generatedInCycle === 0) {
      console.log("All target words across A-Z currently processed. Sleeping 60s before re-evaluating...");
      await new Promise(r => setTimeout(r, 60000));
    }
  }
}

run();
