import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.resolve(__dirname, '../data/modern_dictionary.db');

class DictionaryEngine {
  constructor() {
    try {
      this.db = new DatabaseSync(fs.existsSync(DB_FILE) ? DB_FILE : ':memory:', { readOnly: fs.existsSync(DB_FILE) });
    } catch (_) {
      this.db = new DatabaseSync(':memory:');
    }
    this.db.exec(`CREATE TABLE IF NOT EXISTS modern_dictionary (word TEXT PRIMARY KEY, definition TEXT);`);
    this.lookupStmt = this.db.prepare('SELECT definition FROM modern_dictionary WHERE word = ? LIMIT 1');
  }

  // Exact or morphological match
  findWord(word) {
    const raw = word.toLowerCase().trim();
    if (!raw) return null;

    // 1. Direct match
    let row = this.lookupStmt.get(raw);
    if (row) return { word: raw, definition: row.definition };

    // 2. Singular / stemming heuristics
    const stems = [];
    if (raw.endsWith("ies") && raw.length > 4) stems.push(raw.slice(0, -3) + "y");
    if (raw.endsWith("es") && raw.length > 3) stems.push(raw.slice(0, -2));
    if (raw.endsWith("s") && raw.length > 2) stems.push(raw.slice(0, -1));
    if (raw.endsWith("ed") && raw.length > 3) {
      stems.push(raw.slice(0, -2));
      stems.push(raw.slice(0, -1));
    }
    if (raw.endsWith("ing") && raw.length > 4) {
      stems.push(raw.slice(0, -3));
      stems.push(raw.slice(0, -3) + "e");
    }

    for (const stem of stems) {
      row = this.lookupStmt.get(stem);
      if (row) return { word: stem, definition: row.definition };
    }

    return null;
  }

  // Parses user natural language questions like:
  // "what is the definition of cat?", "define photosynthesis", "what does serendipity mean?"
  extractTargetWord(input) {
    const cleaned = input
      .replace(/^[!?.,\s]+|[!?.,\s]+$/g, '')
      .replace(/[?]/g, '')
      .trim();

    // Check common definition patterns
    const patterns = [
      /^(?:what\s+is\s+the\s+definition\s+of|definition\s+of|define|meaning\s+of|what\s+does\s+(.+?)\s+mean|what\s+is\s+(?:a|an|the)?)\s+(.+)$/i,
      /^what\s+are\s+(.+)$/i
    ];

    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) {
        // Return the captured term
        return (match[2] || match[1]).replace(/^(a|an|the)\s+/i, '').trim();
      }
    }

    return cleaned;
  }

  lookup(query) {
    const target = this.extractTargetWord(query);
    const result = this.findWord(target);

    if (result) {
      return {
        found: true,
        word: result.word,
        definition: result.definition,
        response: `[${result.word.toUpperCase()}]: ${result.definition}`
      };
    }

    return {
      found: false,
      word: target,
      definition: null,
      response: "Sorry, no definition has been found for this word."
    };
  }

  close() {
    this.db.close();
  }
}

export const dictionary = new DictionaryEngine();
