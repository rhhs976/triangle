import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_DATA_DIR = '/tmp/wordnet_json/data';
const DB_FILE = path.resolve(__dirname, '../data/english_pos_lexicon.db');

export function buildPOSLexicon() {
  console.log("==========================================================");
  console.log("  BUILDING COMPREHENSIVE ENGLISH PART-OF-SPEECH LEXICON   ");
  console.log("  (Indexing Verbs, Adjectives, Nouns, Adverbs in SQLite)  ");
  console.log("==========================================================");

  if (!fs.existsSync(TEMP_DATA_DIR)) {
    throw new Error(`Directory ${TEMP_DATA_DIR} does not exist`);
  }

  if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
  }

  const db = new DatabaseSync(DB_FILE);

  db.exec(`
    CREATE TABLE pos_lexicon (
      word TEXT PRIMARY KEY,
      primary_pos TEXT NOT NULL,
      all_pos TEXT NOT NULL
    );
    CREATE INDEX idx_pos_word ON pos_lexicon(word);
    CREATE INDEX idx_pos_type ON pos_lexicon(primary_pos);
  `);

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO pos_lexicon (word, primary_pos, all_pos)
    VALUES (?, ?, ?)
  `);

  db.exec('BEGIN TRANSACTION;');

  const wordMap = new Map(); // word -> Set of POS

  const files = fs.readdirSync(TEMP_DATA_DIR).filter(f => f.endsWith('.json'));
  console.log(`Processing ${files.length} letter dictionary files...`);

  let totalParsed = 0;
  for (const file of files) {
    const filePath = path.join(TEMP_DATA_DIR, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    for (const [key, obj] of Object.entries(content)) {
      const cleanWord = key.trim().toLowerCase();
      if (!cleanWord || cleanWord.includes('_') && cleanWord.includes(' ')) continue;

      if (!wordMap.has(cleanWord)) {
        wordMap.set(cleanWord, new Set());
      }
      const posSet = wordMap.get(cleanWord);

      if (Array.isArray(obj.pos_order)) {
        obj.pos_order.forEach(p => posSet.add(p.toLowerCase()));
      }

      if (Array.isArray(obj.meanings)) {
        obj.meanings.forEach(m => {
          if (m.part_of_speech) {
            posSet.add(m.part_of_speech.toLowerCase());
          }
        });
      }
      totalParsed++;
    }
  }

  // Also include closed-class functional words
  const CLOSED_CLASSES = {
    determiner: ['the', 'a', 'an', 'this', 'that', 'these', 'those', 'every', 'each', 'either', 'neither', 'some', 'any', 'no', 'all', 'both', 'half', 'many', 'much', 'few', 'several'],
    pronoun: ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'myself', 'yourself', 'himself', 'herself', 'itself', 'mine', 'yours', 'his', 'hers', 'ours', 'theirs', 'who', 'whom', 'whose'],
    preposition: ['in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'over', 'under', 'across', 'behind', 'beside', 'beyond', 'toward', 'towards', 'onto', 'upon', 'among'],
    conjunction: ['and', 'but', 'or', 'nor', 'for', 'so', 'yet', 'although', 'because', 'since', 'unless', 'while', 'whereas', 'if', 'though', 'whether']
  };

  for (const [posName, wordList] of Object.entries(CLOSED_CLASSES)) {
    for (const w of wordList) {
      if (!wordMap.has(w)) {
        wordMap.set(w, new Set([posName]));
      } else {
        wordMap.get(w).add(posName);
      }
    }
  }

  console.log(`Extracted ${wordMap.size} unique English words with explicit POS tags!`);
  console.log(`Inserting into SQLite pos_lexicon table...`);

  let count = 0;
  for (const [w, posSet] of wordMap.entries()) {
    const list = Array.from(posSet);
    // Determine canonical primary POS
    let primary = list[0] || 'noun';
    // Priority order if multi-class
    if (posSet.has('determiner')) primary = 'determiner';
    else if (posSet.has('pronoun')) primary = 'pronoun';
    else if (posSet.has('preposition')) primary = 'preposition';
    else if (posSet.has('conjunction')) primary = 'conjunction';
    else if (posSet.has('verb')) primary = 'verb';
    else if (posSet.has('adjective')) primary = 'adjective';
    else if (posSet.has('adverb')) primary = 'adverb';
    else if (posSet.has('noun')) primary = 'noun';

    insertStmt.run(w, primary, list.join(','));
    count++;
  }

  db.exec('COMMIT;');

  console.log(`Successfully built SQLite POS database with ${count} verified words!`);
  console.log(`Database Location: ${DB_FILE}`);

  // Summary breakdown
  const stats = db.prepare('SELECT primary_pos, count(*) as total FROM pos_lexicon GROUP BY primary_pos ORDER BY total DESC').all();
  console.log("\nBreakdown by Part of Speech:");
  stats.forEach(s => console.log(`  • ${s.primary_pos.padEnd(14)}: ${s.total.toLocaleString()} words`));
  console.log("==========================================================\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildPOSLexicon();
}
