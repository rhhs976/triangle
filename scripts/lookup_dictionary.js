import readline from 'node:readline';
import { dictionary } from '../src/dictionary.js';

const arg = process.argv.slice(2).join(' ').trim();

if (arg) {
  const res = dictionary.lookup(arg);
  console.log(`\nQuery: "${arg}"`);
  console.log(`Word extracted: "${res.word}"`);
  console.log(`Result:\n${res.response}\n`);
  process.exit(0);
}

// Interactive REPL if no argument provided
console.log("==========================================================");
console.log("       DICTIONARY CHEAT SHEET LOOKUP ENGINE               ");
console.log("       Database: 102,228 scholarly definitions            ");
console.log("==========================================================");
console.log("Type any word or question (e.g. 'what is a cat', 'define serendipity')");
console.log("Type 'exit' to quit.\n");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'Dictionary> '
});

rl.prompt();

rl.on('line', (line) => {
  const query = line.trim();
  if (!query) {
    rl.prompt();
    return;
  }
  if (query.toLowerCase() === 'exit' || query.toLowerCase() === 'quit') {
    process.exit(0);
  }

  const res = dictionary.lookup(query);
  console.log(`\n${res.response}\n`);
  rl.prompt();
});
