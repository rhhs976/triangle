import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.resolve(__dirname, '../data/english_pos_lexicon.db');

let db = null;
let lookupStmt = null;

function getDb() {
  if (!db) {
    if (!fs.existsSync(DB_FILE)) {
      throw new Error(`POS database not found at ${DB_FILE}. Please run scripts/build_pos_lexicon.js first.`);
    }
    db = new DatabaseSync(DB_FILE);
    try { db.exec('PRAGMA busy_timeout = 5000;'); } catch (_) {}
    lookupStmt = db.prepare('SELECT primary_pos, all_pos FROM pos_lexicon WHERE word = ? LIMIT 1');
  }
  return { db, lookupStmt };
}

// Map POS name to uppercase tag
function toTag(pos) {
  switch (pos.toLowerCase()) {
    case 'verb': return 'VERB';
    case 'adjective': return 'ADJ';
    case 'noun': return 'NOUN';
    case 'adverb': return 'ADV';
    case 'determiner': return 'DET';
    case 'pronoun': return 'PRON';
    case 'preposition': return 'PREP';
    case 'conjunction': return 'CONJ';
    default: return 'NOUN';
  }
}

function formatPosName(pos) {
  switch (pos.toLowerCase()) {
    case 'verb': return 'Verb (Action/State)';
    case 'adjective': return 'Adjective (Descriptive)';
    case 'noun': return 'Noun (Entity/Concept)';
    case 'adverb': return 'Adverb (Manner/Degree)';
    case 'determiner': return 'Determiner (Article/Limiter)';
    case 'pronoun': return 'Pronoun';
    case 'preposition': return 'Preposition';
    case 'conjunction': return 'Conjunction';
    default: return 'Noun';
  }
}

export function classifyWord(rawWord, prevTag = null) {
  const word = rawWord.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return { word: rawWord, tag: 'PUNCT', pos: 'Punctuation' };

  const { lookupStmt } = getDb();

  // 1. Direct dictionary lookup in 147,524-word lexicon
  let row = lookupStmt.get(word);

  // 2. Try common English stems if not directly found or to enrich inflections
  let verbStemFound = false;
  if (word.endsWith('ed') && word.length > 4) {
    const stem1 = word.slice(0, -2);
    const stem2 = word.slice(0, -1); // e.g. observed -> observe
    const stemRow = lookupStmt.get(stem2) || lookupStmt.get(stem1);
    if (stemRow && stemRow.all_pos.includes('verb')) {
      verbStemFound = true;
    }
  }

  if (word.endsWith('ing') && word.length > 5) {
    const stem1 = word.slice(0, -3);
    const stem2 = word.slice(0, -3) + 'e'; // e.g. creating -> create
    const stemRow = lookupStmt.get(stem2) || lookupStmt.get(stem1);
    if (stemRow && stemRow.all_pos.includes('verb')) {
      verbStemFound = true;
    }
  }

  if (!row) {
    if (word.endsWith('s') && word.length > 3) {
      row = lookupStmt.get(word.slice(0, -1)) || lookupStmt.get(word.slice(0, -2));
    } else if (word.endsWith('ly') && word.length > 4) {
      const stem = word.slice(0, -2);
      const stemRow = lookupStmt.get(stem);
      if (stemRow) {
        return {
          word,
          tag: 'ADV',
          pos: 'Adverb (Manner/Degree)',
          allPos: ['adverb'],
          baseWord: stem
        };
      }
    }
  }

  if (row || verbStemFound) {
    let primary = row ? row.primary_pos : 'verb';
    let all = row ? row.all_pos.split(',') : ['verb'];
    if (verbStemFound && !all.includes('verb')) {
      all.push('verb');
    }

    // Disambiguation using neighboring syntax
    if (prevTag === 'ADJ') {
      if (all.includes('noun')) {
        return { word, tag: 'NOUN', pos: formatPosName('noun'), allPos: all };
      }
    }

    if (prevTag === 'DET') {
      // If primary is adjective (e.g. "ancient"), keep adjective!
      if (primary === 'adjective' || (all.includes('adjective') && !all.includes('noun'))) {
        return { word, tag: 'ADJ', pos: formatPosName('adjective'), allPos: all };
      }
      if (all.includes('noun')) {
        return { word, tag: 'NOUN', pos: formatPosName('noun'), allPos: all };
      }
    }

    if (prevTag === 'ADV') {
      if (all.includes('verb')) {
        return { word, tag: 'VERB', pos: formatPosName('verb'), allPos: all };
      }
      if (all.includes('adjective')) {
        return { word, tag: 'ADJ', pos: formatPosName('adjective'), allPos: all };
      }
    }

    if (prevTag === 'NOUN' || prevTag === 'PRON') {
      if (all.includes('verb')) {
        return { word, tag: 'VERB', pos: formatPosName('verb'), allPos: all };
      }
    }

    return {
      word,
      tag: toTag(primary),
      pos: formatPosName(primary),
      allPos: all
    };
  }

  // 3. Morphological suffix fallbacks for rare/unindexed words
  if (word.endsWith('ly') && word.length > 3) {
    return { word, tag: 'ADV', pos: formatPosName('adverb'), allPos: ['adverb'] };
  }
  if (
    word.endsWith('able') || word.endsWith('ible') || word.endsWith('ful') ||
    word.endsWith('less') || word.endsWith('ous') || word.endsWith('ive') ||
    word.endsWith('ic') || word.endsWith('ish') || word.endsWith('al')
  ) {
    return { word, tag: 'ADJ', pos: formatPosName('adjective'), allPos: ['adjective'] };
  }
  if (
    word.endsWith('ing') || word.endsWith('ed') || word.endsWith('ize') ||
    word.endsWith('ise') || word.endsWith('ify') || word.endsWith('ate')
  ) {
    return { word, tag: 'VERB', pos: formatPosName('verb'), allPos: ['verb'] };
  }
  if (
    word.endsWith('tion') || word.endsWith('sion') || word.endsWith('ment') ||
    word.endsWith('ness') || word.endsWith('ity') || word.endsWith('ance') ||
    word.endsWith('ence') || word.endsWith('ship') || word.endsWith('ism')
  ) {
    return { word, tag: 'NOUN', pos: formatPosName('noun'), allPos: ['noun'] };
  }

  // Contextual fallback
  if (prevTag === 'DET' || prevTag === 'ADJ') {
    return { word, tag: 'NOUN', pos: formatPosName('noun'), allPos: ['noun'] };
  }
  if (prevTag === 'NOUN' || prevTag === 'PRON') {
    return { word, tag: 'VERB', pos: formatPosName('verb'), allPos: ['verb'] };
  }

  return { word, tag: 'NOUN', pos: formatPosName('noun'), allPos: ['noun'] };
}

export function tagSentence(sentence) {
  const tokens = sentence.trim().split(/\s+/).filter(Boolean);
  const tagged = [];

  for (let i = 0; i < tokens.length; i++) {
    const prevTag = tagged.length > 0 ? tagged[tagged.length - 1].tag : null;
    const classified = classifyWord(tokens[i], prevTag);
    tagged.push(classified);
  }

  return {
    sentence,
    tagged,
    posFormula: tagged.map(t => `[${t.tag}]`).join(' '),
    verbs: tagged.filter(t => t.tag === 'VERB').map(t => t.word),
    adjectives: tagged.filter(t => t.tag === 'ADJ').map(t => t.word),
    nouns: tagged.filter(t => t.tag === 'NOUN').map(t => t.word),
    adverbs: tagged.filter(t => t.tag === 'ADV').map(t => t.word)
  };
}
