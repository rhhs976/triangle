import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyWord, tagSentence } from '../src/pos_tagger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SENTENCES_FILE = path.resolve(__dirname, '../data/grammar_sentences.jsonl');
const REPORT_FILE = path.resolve(__dirname, '../data/ai_grammar_patterns_learned.json');

export async function aiReadGrammar() {
  console.log(`========================================================`);
  console.log(`       AI GRAMMAR & PART-OF-SPEECH (POS) LEARNING       `);
  console.log(`       (Extracting Verbs, Adjectives, Nouns & Syntax)   `);
  console.log(`========================================================`);

  if (!fs.existsSync(SENTENCES_FILE)) {
    throw new Error(`Grammar sentences file not found at ${SENTENCES_FILE}`);
  }

  const lines = fs.readFileSync(SENTENCES_FILE, 'utf-8').split('\n').filter(Boolean);
  console.log(`Total sentences to analyze: ${lines.length}`);

  const vocabularyPOS = {
    verbs: new Set(),
    adjectives: new Set(),
    nouns: new Set(),
    adverbs: new Set(),
    determiners: new Set(),
    prepositions: new Set(),
    conjunctions: new Set()
  };

  const posTransitions = {}; // e.g. DET -> ADJ, ADJ -> NOUN, NOUN -> VERB
  const posFormulaDistribution = {}; // e.g. [DET] [ADJ] [NOUN] [VERB]
  const grammarRulesLearned = {};

  for (let i = 0; i < lines.length; i++) {
    try {
      const item = JSON.parse(lines[i]);
      const text = item.text || "";
      const cat = item.category || "General";
      const pat = item.pattern || "Syntax";

      if (!grammarRulesLearned[pat]) {
        grammarRulesLearned[pat] = {
          category: cat,
          ruleExplanation: item.explanation || "",
          frequencyCount: 1
        };
      } else {
        grammarRulesLearned[pat].frequencyCount++;
      }

      // Tag sentence with POS
      const taggedResult = tagSentence(text);
      const tags = taggedResult.tagged;

      // Group vocabulary by POS
      taggedResult.verbs.forEach(v => vocabularyPOS.verbs.add(v));
      taggedResult.adjectives.forEach(a => vocabularyPOS.adjectives.add(a));
      taggedResult.nouns.forEach(n => vocabularyPOS.nouns.add(n));
      taggedResult.adverbs.forEach(adv => vocabularyPOS.adverbs.add(adv));

      tags.forEach(t => {
        if (t.tag === 'DET') vocabularyPOS.determiners.add(t.word);
        if (t.tag === 'PREP') vocabularyPOS.prepositions.add(t.word);
        if (t.tag === 'CONJ') vocabularyPOS.conjunctions.add(t.word);
      });

      // Track POS formula structure
      const formula = taggedResult.posFormula;
      posFormulaDistribution[formula] = (posFormulaDistribution[formula] || 0) + 1;

      // Track POS-to-POS transition probabilities (e.g. DET -> NOUN vs DET -> ADJ)
      for (let j = 0; j < tags.length - 1; j++) {
        const t1 = tags[j].tag;
        const t2 = tags[j + 1].tag;
        if (!posTransitions[t1]) posTransitions[t1] = {};
        posTransitions[t1][t2] = (posTransitions[t1][t2] || 0) + 1;
      }

      if ((i + 1) % 500 === 0 || i === lines.length - 1) {
        console.log(`[POS Learning] Processed ${i + 1}/${lines.length} sentences. Verbs identified: ${vocabularyPOS.verbs.size}, Adjectives: ${vocabularyPOS.adjectives.size}, Nouns: ${vocabularyPOS.nouns.size}`);
      }
    } catch (e) {}
  }

  // Top POS sequence patterns
  const topFormulas = Object.entries(posFormulaDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([formula, count]) => ({ formula, count }));

  const report = {
    totalSentencesAnalyzed: lines.length,
    syntaxRulesCount: Object.keys(grammarRulesLearned).length,
    partOfSpeechLearned: {
      verbsCount: vocabularyPOS.verbs.size,
      adjectivesCount: vocabularyPOS.adjectives.size,
      nounsCount: vocabularyPOS.nouns.size,
      adverbsCount: vocabularyPOS.adverbs.size,
      determinersCount: vocabularyPOS.determiners.size,
      prepositionsCount: vocabularyPOS.prepositions.size,
      sampleVerbs: Array.from(vocabularyPOS.verbs).slice(0, 50),
      sampleAdjectives: Array.from(vocabularyPOS.adjectives).slice(0, 50),
      sampleNouns: Array.from(vocabularyPOS.nouns).slice(0, 50),
      sampleAdverbs: Array.from(vocabularyPOS.adverbs).slice(0, 50)
    },
    posTransitions: posTransitions,
    topPosFormulaPatterns: topFormulas,
    grammarRules: grammarRulesLearned,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf-8');

  console.log(`\n========================================================`);
  console.log(`POS & Grammar Learning Complete!`);
  console.log(`Total Verbs Discovered:      ${vocabularyPOS.verbs.size}`);
  console.log(`Total Adjectives Discovered: ${vocabularyPOS.adjectives.size}`);
  console.log(`Total Nouns Discovered:      ${vocabularyPOS.nouns.size}`);
  console.log(`Total Adverbs Discovered:    ${vocabularyPOS.adverbs.size}`);
  console.log(`POS Transition Rules:        ${Object.keys(posTransitions).length} categories`);
  console.log(`Saved enriched knowledge to: ${REPORT_FILE}`);
  console.log(`========================================================\n`);

  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  aiReadGrammar().catch(console.error);
}
