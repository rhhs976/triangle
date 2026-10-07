import { classifyWord, tagSentence } from '../src/pos_tagger.js';

const input = process.argv.slice(2).join(' ').trim();

if (!input) {
  console.log("Usage:");
  console.log("  node scripts/classify_pos.js <word or sentence>");
  console.log("Examples:");
  console.log("  node scripts/classify_pos.js run");
  console.log("  node scripts/classify_pos.js beautiful");
  console.log("  node scripts/classify_pos.js \"The courageous student quickly solved the difficult problem.\"");
  process.exit(0);
}

if (!input.includes(' ')) {
  // Single word
  const res = classifyWord(input);
  console.log(`\nWord: "${input}"`);
  console.log(`Part of Speech: ${res.pos}`);
  console.log(`Tag: [${res.tag}]\n`);
} else {
  // Full sentence
  const res = tagSentence(input);
  console.log(`\n======================================================`);
  console.log(`SENTENCE: "${res.sentence}"`);
  console.log(`POS FORMULA: ${res.posFormula}`);
  console.log(`------------------------------------------------------`);
  console.log(`VERBS:      ${res.verbs.join(', ') || 'None'}`);
  console.log(`ADJECTIVES: ${res.adjectives.join(', ') || 'None'}`);
  console.log(`NOUNS:      ${res.nouns.join(', ') || 'None'}`);
  console.log(`ADVERBS:    ${res.adverbs.join(', ') || 'None'}`);
  console.log(`------------------------------------------------------`);
  console.log(`WORD-BY-WORD BREAKDOWN:`);
  res.tagged.forEach(t => {
    console.log(`  • ${t.word.padEnd(14)} -> [${t.tag}] ${t.pos}`);
  });
  console.log(`======================================================\n`);
}
