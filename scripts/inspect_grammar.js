import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_FILE = path.resolve(__dirname, '../data/grammar_sentences.json');

if (!fs.existsSync(JSON_FILE)) {
  console.error("Dataset file not found! Run generate_grammar.js first.");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));

console.log("=================================================");
console.log("        GRAMMAR LESSON DATASET REPORT            ");
console.log("=================================================");
console.log(`Total Sentences:   ${data.length}`);

// Category breakdown
const categoryCounts = {};
let totalWords = 0;
for (const item of data) {
  categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  totalWords += item.tokens || item.text.split(/\s+/).length;
}

console.log(`Average Word Count: ${(totalWords / data.length).toFixed(1)} words/sentence`);
console.log("\nBreakdown by Category:");
for (const [cat, count] of Object.entries(categoryCounts)) {
  console.log(`  - ${cat.padEnd(42)}: ${count}`);
}

console.log("\n-------------------------------------------------");
console.log("Recent 5 High-Quality Generated Sentences:");
console.log("-------------------------------------------------");
data.slice(-5).forEach(s => {
  console.log(`[#${s.id}] [${s.category}]`);
  console.log(`Text:        "${s.text}"`);
  console.log(`Pattern:     ${s.pattern}`);
  console.log(`Explanation: ${s.explanation}\n`);
});
