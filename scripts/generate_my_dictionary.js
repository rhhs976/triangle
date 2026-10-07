import { myDictionary } from '../src/groq_dictionary.js';

const SEED_WORDS = [
  "apple", "computer", "serendipity", "gravity", "algorithm",
  "sun", "moon", "water", "fire", "earth", "ocean", "tree", "forest",
  "book", "dog", "cat", "brain", "heart", "dna", "evolution",
  "democracy", "philosophy", "science", "music", "art", "language",
  "sentence", "dictionary", "freedom", "justice", "truth", "knowledge",
  "wisdom", "curiosity", "space", "time", "energy", "matter", "atom",
  "light", "sound", "galaxy", "universe", "planet", "robot", "internet"
];

console.log("=================================================");
console.log("   GROQ MODERN DICTIONARY GENERATOR & CACHER    ");
console.log("=================================================");

async function main() {
  console.log(`Checking / generating ${SEED_WORDS.length} foundational words...\n`);
  let count = 0;

  for (const word of SEED_WORDS) {
    const existing = myDictionary.getWordLocal(word);
    if (existing) {
      console.log(`[CACHED] ${word}`);
      count++;
      continue;
    }

    process.stdout.write(`[GENERATING] ${word}... `);
    try {
      const res = await myDictionary.lookup(word);
      if (res.found) {
        console.log(`✓ DONE`);
        count++;
      } else {
        console.log(`✗ FAILED`);
      }
    } catch (err) {
      console.log(`✗ ERROR: ${err.message}`);
    }

    // Small delay to respect rate limits
    await new Promise(r => setTimeout(r, 600));
  }

  console.log(`\n✓ Process finished. Seeded ${count} words in data/my_dictionary.db.`);
}

main();
