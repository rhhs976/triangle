import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DICT_FILE = path.resolve(__dirname, '../data/english_pos_lexicon.db');

let db = null;
let exactStmt = null;

function getDb() {
  if (!db) {
    db = new DatabaseSync(DICT_FILE, { readOnly: true });
    exactStmt = db.prepare('SELECT word FROM pos_lexicon WHERE word = ? LIMIT 1');
  }
  return db;
}

// Levenshtein distance between two strings
export function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Check if a word exists in the verified 102k English dictionary
export function isKnownWord(word) {
  if (!word) return false;
  getDb();
  const clean = word.toLowerCase().trim();
  const row = exactStmt.get(clean);
  return !!row;
}

// Detect obvious gibberish, keyboard mashing, or unpronounceable letter clusters
export function isLikelyGibberish(word) {
  if (!word) return true;
  const clean = word.toLowerCase().trim();
  if (clean.length < 2) return true;

  // Obvious keyboard rows
  if (/^(?:asdf|qwerty|zxcvb|hjkl|poiuy)/i.test(clean)) {
    return true;
  }

  // 4+ repeated characters (e.g. "aaaaa", "sooooo")
  if (/(.)\1{3,}/.test(clean)) {
    return true;
  }

  // Excessive consecutive consonants (English words very rarely have >= 5 consonants in a row)
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(clean)) {
    return true;
  }

  // 5+ chars with zero vowels
  if (clean.length >= 5 && !/[aeiouy]/.test(clean)) {
    return true;
  }

  // Very high ratio of uncommon letters (q, x, z, j)
  const rareCount = (clean.match(/[qxzj]/g) || []).length;
  if (clean.length >= 4 && rareCount >= clean.length * 0.6) {
    return true;
  }

  return false;
}

// Find closest spelling suggestion from verified dictionary
export function findSpellingSuggestion(word) {
  if (!word) return null;
  getDb();
  const clean = word.toLowerCase().trim();
  if (clean.length < 3) return null;

  const minLen = Math.max(2, clean.length - 2);
  const maxLen = clean.length + 2;

  // 1. Try first 3 letters if word length >= 4
  let prefix = clean.slice(0, Math.min(3, clean.length));
  let candidates = db.prepare(`
    SELECT word FROM pos_lexicon
    WHERE word LIKE ?
      AND length(word) BETWEEN ? AND ?
      AND word NOT LIKE '%-%'
      AND word NOT LIKE '% %'
    LIMIT 200
  `).all(`${prefix}%`, minLen, maxLen);

  // 2. If too few, broaden to first 2 letters
  if (candidates.length < 20 && clean.length >= 3) {
    prefix = clean.slice(0, 2);
    candidates = db.prepare(`
      SELECT word FROM pos_lexicon
      WHERE word LIKE ?
        AND length(word) BETWEEN ? AND ?
        AND word NOT LIKE '%-%'
        AND word NOT LIKE '% %'
      LIMIT 300
    `).all(`${prefix}%`, minLen, maxLen);
  }

  let bestMatch = null;
  let minDistance = 3; // Edit distance <= 2 is a valid typo

  for (const c of candidates) {
    const candidateWord = c.word.toLowerCase();
    if (!/^[a-z]+$/.test(candidateWord)) continue;
    const dist = levenshteinDistance(clean, candidateWord);
    if (dist < minDistance) {
      minDistance = dist;
      bestMatch = candidateWord;
      if (dist === 1) break; // Found direct typo
    }
  }

  return bestMatch;
}
