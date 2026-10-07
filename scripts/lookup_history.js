import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../data/history_facts.db');

export function queryHistory(query) {
  const db = new DatabaseSync(DB_PATH);
  const qClean = query.toLowerCase().trim();

  // Search by exact keyword or entity match
  const words = qClean.split(/\s+/).filter(w => w.length > 2 && !['who', 'what', 'when', 'where', 'why', 'how', 'the', 'did', 'was', 'were', 'for'].includes(w));

  const allRows = db.prepare('SELECT * FROM history_facts').all();

  // Score each fact by relevance
  const scored = allRows.map(row => {
    let score = 0;
    const textToMatch = `${row.topic} ${row.fact} ${row.context} ${row.question} ${row.entities}`.toLowerCase();

    for (const w of words) {
      if (textToMatch.includes(w)) {
        score += 2;
      }
      if (row.topic.toLowerCase().includes(w)) {
        score += 4; // Higher weight for topic match
      }
    }

    return { row, score };
  });

  scored.sort((a, b) => b.score - a.score);

  if (scored.length > 0 && scored[0].score > 0) {
    const best = scored[0].row;
    return {
      found: true,
      topic: best.topic,
      era: best.era,
      fact: best.fact,
      context: best.context,
      directAnswer: best.answer,
      entities: JSON.parse(best.entities)
    };
  }

  return {
    found: false,
    message: "No historical record found for this topic."
  };
}

// CLI usage
const arg = process.argv.slice(2).join(' ').trim();
if (arg) {
  const res = queryHistory(arg);
  if (res.found) {
    console.log(`\n======================================================`);
    console.log(`Topic:    ${res.topic} (${res.era})`);
    console.log(`Fact:     ${res.fact}`);
    console.log(`Context:  ${res.context}`);
    console.log(`Answer:   ${res.directAnswer}`);
    console.log(`Entities: ${res.entities.join(', ')}`);
    console.log(`======================================================\n`);
  } else {
    console.log(res.message);
  }
}
