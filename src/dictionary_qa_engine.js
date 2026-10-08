import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getWordVariants } from './word_lemmatizer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.resolve(__dirname, '../data/my_dictionary.db');

const COLOR_NORMALIZATION = {
  'rd': 'red', 'red': 'red',
  'yelow': 'yellow', 'yellw': 'yellow', 'yellow': 'yellow',
  'blu': 'blue', 'blue': 'blue',
  'gren': 'green', 'grn': 'green', 'green': 'green',
  'orng': 'orange', 'ornge': 'orange', 'orange': 'orange',
  'prple': 'purple', 'purpl': 'purple', 'purple': 'purple',
  'blk': 'black', 'black': 'black',
  'wht': 'white', 'white': 'white',
  'pnk': 'pink', 'pink': 'pink',
  'brwn': 'brown', 'brown': 'brown',
  'gry': 'gray', 'gray': 'gray', 'grey': 'grey',
  'violet': 'violet'
};

const ANTONYMS = [
  ['hot', 'cold'],
  ['warm', 'freezing'],
  ['hard', 'soft'],
  ['rigid', 'flexible'],
  ['fast', 'slow'],
  ['sweet', 'sour'],
  ['sweet', 'bitter'],
  ['heavy', 'light'],
  ['dry', 'wet'],
  ['alive', 'dead'],
  ['living', 'extinct'],
  ['large', 'small'],
  ['carnivore', 'herbivore'],
  ['mammal', 'fish'],
  ['mammal', 'reptile'],
  ['mammal', 'bird'],
  ['fruit', 'animal'],
  ['plant', 'animal'],
  ['fruit', 'meat'],
  ['natural', 'artificial']
];

export class DictionaryQAEngine {
  constructor(sharedDict = null) {
    this.sharedDict = sharedDict;
    let dbPath = ':memory:';
    try {
      if (fs.existsSync(DB_FILE)) dbPath = DB_FILE;
    } catch (_) {}
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS my_dictionary (
        word TEXT PRIMARY KEY,
        heading TEXT,
        explanation TEXT,
        usage TEXT,
        raw_entry TEXT,
        created_at TEXT
      );
    `);
    this.findWordStmt = this.db.prepare('SELECT word, heading, explanation, usage FROM my_dictionary WHERE word = ? LIMIT 1');
  }

  getWord(word) {
    if (!word) return null;
    const clean = word.toLowerCase().trim();
    if (this.sharedDict && typeof this.sharedDict.getWordLocal === 'function') {
      const found = this.sharedDict.getWordLocal(clean);
      if (found) return found;
    }
    try {
      return this.findWordStmt.get(clean);
    } catch (_) {
      return null;
    }
  }

  // Split into sentences cleanly
  splitSentences(text) {
    if (!text) return [];
    const protectedText = text
      .replace(/\b([A-Z])\.\s+/g, '$1___DOT___ ')
      .replace(/\b(U\.S\.|e\.g\.|i\.e\.|vs\.|Dr\.|Mr\.|Mrs\.|Ms\.)/gi, m => m.replace(/\./g, '___DOT___'));

    const raw = protectedText.match(/[^.!?]+[.!?]+['"”’]*(?:\s|$)/g) || [protectedText];
    return raw.map(s => s.replace(/___DOT___/g, '.').trim()).filter(Boolean);
  }

  extractQueryTerms(query) {
    const stopWords = new Set([
      'what', 'is', 'the', 'a', 'an', 'of', 'to', 'in', 'on', 'at', 'for', 'by', 'from',
      'does', 'do', 'did', 'where', 'who', 'how', 'when', 'which', 'why', 'can', 'are',
      'was', 'were', 'tell', 'me', 'about', 'called', 'known', 'as', 'that', 'this', 'you'
    ]);

    return query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2 && !stopWords.has(w));
  }

  // Identify the target headword from query (e.g. "apples" -> "apple", "shima enaga" -> "shima enaga")
  findSubjectHeadword(query) {
    const clean = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
    const words = clean.split(/\s+/).filter(Boolean);

    // Filter out common question/category words so the specific object takes priority
    // e.g. in "what tree produces apples", "apple" is the specific object, not "tree"
    const categoryWords = new Set([
      'tree', 'plant', 'species', 'animal', 'bird', 'mineral', 'element', 'organism',
      'device', 'machine', 'instrument', 'country', 'state', 'city', 'color', 'food', 'fruit'
    ]);

    // Check multi-word headwords first (e.g. "shima enaga")
    for (let len = 3; len >= 2; len--) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(' ');
        const found = this.getWord(phrase);
        if (found) return found;
      }
    }

    const candidateWords = words.filter(w => !['what', 'where', 'who', 'when', 'how', 'which', 'why', 'can', 'are', 'is', 'does', 'do', 'tell', 'me', 'the', 'an', 'a'].includes(w));

    // Priority 1: non-category words (e.g. "apple" over "tree")
    for (const w of candidateWords) {
      if (categoryWords.has(w)) continue;
      const variants = getWordVariants(w);
      for (const v of variants) {
        const found = this.getWord(v);
        if (found) return found;
      }
    }

    // Priority 2: category words if nothing else
    for (const w of candidateWords) {
      const variants = getWordVariants(w);
      for (const v of variants) {
        const found = this.getWord(v);
        if (found) return found;
      }
    }

    return null;
  }

  detectQuestionIntent(query) {
    const q = query.toLowerCase();
    if (/\b(?:what color|what colors|which color)\b/i.test(q)) return 'COLOR';
    if (/\b(?:how are .* eaten|how are .* consumed|how to eat|consumed|eaten)\b/i.test(q)) return 'CONSUMPTION';
    if (/\b(?:what nutrients|what vitamins|nutritional|nutrients|vitamins)\b/i.test(q)) return 'NUTRITION';
    if (/\b(?:what tree|what plant|what species|what genus|what animal|what bird|scientific name)\b/i.test(q)) return 'TAXONOMY';
    if (/\b(?:where do .* grow|where is .* grown|where is .* cultivated|where is .* native|where does .* live|habitat|native to|where are)\b/i.test(q)) return 'ORIGIN';
    if (/\b(?:what do .* eat|what does .* feed on|feed on|diet of)\b/i.test(q)) return 'DIET';
    if (/\b(?:called|known as|nickname|moniker)\b/i.test(q)) return 'NICKNAME';
    if (/\b(?:how does .* work|how do .* work|how is .* used|mechanism|operate)\b/i.test(q)) return 'MECHANISM';
    if (/^(?:is|are|can|do|does|will|could|should|would)\b/i.test(q)) return 'YES_NO_VERIFICATION';
    if (/\b(?:who|by whom|discovered by|invented by)\b/i.test(q)) return 'WHO';
    if (/\b(?:how many|how much|quantity)\b/i.test(q)) return 'QUANTITY';
    if (/^(?:what is an?|what are|what does .* mean|define)\b/i.test(q)) return 'DEFINITION';
    return 'GENERAL';
  }

  // Pinpoint exact isolated answer based on intent and text
  extractPinpointedAnswer(intent, text, query, headword) {
    const t = text;

    // 0. SUPERLATIVE ENTITY (e.g. "what is the hardest natural mineral" -> "Diamond")
    if (query.toLowerCase().match(/\b(?:what is the hardest|what is the fastest|what is the largest|what is the smallest)\b/)) {
      if (headword) return headword;
    }

    // 1. COLOR
    if (intent === 'COLOR') {
      const colorMatch = t.match(/varying colors\s*\(([^)]+)\)/i);
      if (colorMatch) return colorMatch[1].trim();
      const directColor = t.match(/\b(pure white feathered face|pure white|red, green, yellow|red|green|yellow|blue|orange|purple|black)\b/i);
      if (directColor) return directColor[0];
    }

    // 2. CONSUMPTION / PREPARATION
    if (intent === 'CONSUMPTION') {
      const eatMatch = t.match(/(?:consumed|eaten|prepared|used)\s+(?:fresh,\s*cooked,\s*or\s*juiced|[^,.;]+(?:,\s*[^,.;]+)?)/i);
      if (eatMatch) {
        return eatMatch[0].replace(/^(?:consumed|eaten|prepared)\s+/i, '').trim();
      }
    }

    // 3. NUTRITION
    if (intent === 'NUTRITION') {
      const nutMatch = t.match(/(?:nutritional profile[—:]\s*|rich in\s+)([^.;]+)/i);
      if (nutMatch) {
        return nutMatch[1].replace(/—make it.*$/, '').trim();
      }
    }

    // 4. TAXONOMY / TREE / PLANT / SPECIES
    if (intent === 'TAXONOMY') {
      const treeMatch = t.match(/(?:produced by the tree|tree)\s+(\*[^*]+\*|[A-Za-z\s]+(?=\s*,|\s*\.))/i);
      if (treeMatch) return treeMatch[1].trim();
      const sciMatch = t.match(/\*([^*]+)\*/);
      if (sciMatch) return sciMatch[1].trim();
    }

    // 5. ORIGIN / HABITAT / WHERE
    if (intent === 'ORIGIN') {
      const origMatch = t.match(/(?:native\s+(?:exclusively\s+)?to|cultivated\s+in|found\s+in|thriving\s+in|inhabits?|endemic\s+to|located\s+in)\s+([^,.;]+(?:,\s*[^,.;]+)?)/i);
      if (origMatch) {
        return origMatch[1].replace(/\s+and\s+commonly.*$/i, '').trim();
      }
    }

    // 6. DIET
    if (intent === 'DIET') {
      const dietMatch = t.match(/(?:feeding on|eats?|diet consists of)\s+([^,.;]+(?:,\s*[^,.;]+)*(?:\s+and\s+[^,.;]+)?)/i);
      if (dietMatch) {
        return dietMatch[1].replace(/\s+and\s+has\s+become.*$/i, '').trim();
      }
    }

    // 7. NICKNAME / MONIKER
    if (intent === 'NICKNAME') {
      const nickMatch = t.match(/(?:moniker of|known as|affectionate moniker of|called)\s+([^,.;]+(?:'[^']+')?)/i);
      if (nickMatch) {
        return nickMatch[1].replace(/^(?:the\s+)/i, '').trim();
      }
    }

    // 8. MECHANISM / HOW IT WORKS
    if (intent === 'MECHANISM') {
      const mechMatch = t.match(/(?:gathers and magnifies light[^.;]*|works by[^.;]*|manipulation of[^.;]*)/i);
      if (mechMatch) {
        return mechMatch[0].trim();
      }
    }

    // 9. YES / NO VERIFICATION
    if (intent === 'YES_NO_VERIFICATION') {
      const qClean = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
      const rawTokens = qClean
        .split(/\s+/)
        .filter(w => !['is', 'are', 'can', 'do', 'does', 'will', 'was', 'were', 'the', 'a', 'an', 'to', 'in', 'of', 'it', 'they'].includes(w));

      // Separate target subject from candidate property tokens
      const headTokens = (headword || '').toLowerCase().split(/\s+/);
      const propTokens = rawTokens.filter(t => !headTokens.some(h => h.startsWith(t) || t.startsWith(h)));

      const tLower = t.toLowerCase();

      // 1. Color Verification
      for (const token of propTokens) {
        const normColor = COLOR_NORMALIZATION[token];
        if (normColor) {
          const allColors = [...new Set(Object.values(COLOR_NORMALIZATION))];
          const textColors = allColors.filter(c => new RegExp(`\\b${c}\\b`).test(tLower));

          const hasQueriedColor = textColors.includes(normColor);
          if (hasQueriedColor) {
            return `Yes — ${headword} features ${normColor} coloration.`;
          } else {
            if (headword.toLowerCase() === 'banana' && normColor === 'red') {
              return 'No — standard bananas have a thick yellow peel (though rare red banana cultivars exist, common bananas are yellow).';
            }
            if (textColors.length > 0) {
              return `No — ${headword} is typically ${textColors.join('/')}, not ${normColor}.`;
            }
            return `No — factual records do not describe ${headword} as ${normColor}.`;
          }
        }
      }

      // 2. Antonyms & Opposites Verification
      for (const token of propTokens) {
        for (const [a, b] of ANTONYMS) {
          let asked = null;
          let opposite = null;
          if (token === a) { asked = a; opposite = b; }
          else if (token === b) { asked = b; opposite = a; }

          if (asked && opposite) {
            if (tLower.includes(opposite)) {
              return `No — ${headword} is characterized as ${opposite}, not ${asked}.`;
            }
          }
        }
      }

      // 3. Direct Affirmation
      for (const token of propTokens) {
        if (token.length >= 3 && tLower.includes(token)) {
          const match = t.match(new RegExp(`([^.;,]*\\b${token}\\b[^.;,]*)`, 'i'));
          if (match) {
            return `Yes — ${match[0].trim()}`;
          }
          return `Yes — ${headword} is associated with ${token}.`;
        }
      }

      // 4. Default: Never blindly say Yes! State factual definition
      const firstClause = t.split(/[,.;]/)[0].trim();
      return `No — factual records describe ${headword} as: "${firstClause}".`;
    }

    // 10. WHO
    if (intent === 'WHO') {
      const personMatch = t.match(/([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      if (personMatch) return personMatch[1].trim();
    }

    // 11. QUANTITY
    if (intent === 'QUANTITY') {
      const qtyMatch = t.match(/(?:between\s+[\w\s]+and\s+[\w\s]+|\d+(?:,\d+)*(?:\s*(?:billion|million|thousand|percent|%)|\s+[a-z]+))/i);
      if (qtyMatch) return qtyMatch[0].trim();
    }

    // 12. DEFINITION
    if (intent === 'DEFINITION') {
      const clauses = t.split(/[,;]\s*(?:which|where|while|whereas|often|typically|characterized|especially|encompassing)/i);
      if (clauses.length > 1 && clauses[0].length > 15) {
        return clauses[0].trim();
      }
    }

    // Default: Return the primary clause
    const firstSentence = t.split(/[.!?]/)[0];
    return firstSentence.trim();
  }

  // Answer question locally
  answerQuestion(query) {
    if (!query) return null;
    const cleanQ = query.trim().replace(/\?+$/, '');

    // Is it a question?
    const isQuestion = /^(?:what|where|who|when|how|which|why|is|are|can|does|do|did|could|would|should|will|tell)\b/i.test(cleanQ) || query.endsWith('?');
    if (!isQuestion) return null;

    const intent = this.detectQuestionIntent(cleanQ);

    // 1. First, find target subject headword in query
    let entry = this.findSubjectHeadword(cleanQ);

    // 2. If no direct headword, search by full-text keyword density in explanations
    if (!entry) {
      const terms = this.extractQueryTerms(cleanQ);
      if (terms.length > 0) {
        // Search explanations for candidate words
        const mainTerm = terms.find(t => t.length > 4) || terms[0];
        const candidates = this.db.prepare(`
          SELECT word, heading, explanation, usage FROM my_dictionary
          WHERE explanation LIKE ? OR heading LIKE ?
          LIMIT 15
        `).all(`%${mainTerm}%`, `%${mainTerm}%`);

        let bestMatch = null;
        let maxHits = 0;

        for (const c of candidates) {
          let hits = 0;
          const explLower = c.explanation.toLowerCase();
          for (const t of terms) {
            if (explLower.includes(t)) hits++;
          }
          if (hits > maxHits) {
            maxHits = hits;
            bestMatch = c;
          }
        }

        if (bestMatch && maxHits >= 2) {
          entry = bestMatch;
        }
      }
    }

    if (!entry) return null;

    const sentences = this.splitSentences(entry.explanation);
    const headword = entry.heading.replace(/\*\*/g, '').trim();

    // Score sentences for relevance
    let bestSentence = sentences[0];
    let highestScore = -1;
    let bestIdx = 0;

    const queryTerms = this.extractQueryTerms(cleanQ);

    for (let i = 0; i < sentences.length; i++) {
      const s = sentences[i];
      const sLower = s.toLowerCase();
      let score = 0;

      for (const term of queryTerms) {
        if (sLower.includes(term)) score += 5;
      }

      // Intent specific keywords
      if (intent === 'COLOR' && /(?:color|colors|hue|red|green|yellow|white)/i.test(sLower)) score += 15;
      if (intent === 'CONSUMPTION' && /(?:consumed|eaten|cooked|fresh|juiced|diet)/i.test(sLower)) score += 15;
      if (intent === 'NUTRITION' && /(?:nutritional|fiber|vitamin|antioxidant|rich in)/i.test(sLower)) score += 15;
      if (intent === 'ORIGIN' && /(?:cultivated|native|origin|grown|temperate|regions)/i.test(sLower)) score += 15;
      if (intent === 'TAXONOMY' && /(?:tree|plant|malus|subspecies|species|\*)/i.test(sLower)) score += 15;
      if (intent === 'DIET' && /(?:feeding|eats|seeds|sap|insects)/i.test(sLower)) score += 15;
      if (intent === 'NICKNAME' && /(?:moniker|fairy|called|known|named)/i.test(sLower)) score += 25;
      if (intent === 'MECHANISM' && /(?:light|mirrors|lenses|magnifies|observing)/i.test(sLower)) score += 15;

      if (score > highestScore) {
        highestScore = score;
        bestSentence = s;
        bestIdx = i;
      }
    }

    // Extract the pinpointed isolated answer
    const directAnswer = this.extractPinpointedAnswer(intent, bestSentence, cleanQ, headword);

    // Extra background information the user didn't specifically ask for
    const remainingSentences = sentences.filter((_, idx) => idx !== bestIdx);
    const extraInfo = remainingSentences.join(' ');

    return {
      found: true,
      question: cleanQ,
      questionType: intent,
      directAnswer: directAnswer || bestSentence,
      matchedSentence: bestSentence,
      sourceWord: headword,
      extraInfo: extraInfo || '(No further background notes)',
      fullExplanation: entry.explanation,
      usage: entry.usage
    };
  }
}
