import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_FILE = path.resolve(__dirname, '../data/dictionary.json');
const DB_FILE = path.resolve(__dirname, '../data/dictionary.db');

if (!fs.existsSync(JSON_FILE)) {
  console.error("Error: data/dictionary.json not found!");
  process.exit(1);
}

console.log("Loading dictionary JSON (102,000+ words)...");
const rawData = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));

// Modern supplements to ensure 21st century words have rich, high-quality, comprehensive definitions
const MODERN_SUPPLEMENTS = {
  "computer": "An electronic programmable device capable of accepting, processing, storing, and outputting data at high speeds according to stored instructions (programs). Modern computers encompass microprocessors, quantum computing architectures, supercomputers, and embedded systems, serving as the foundational infrastructure of contemporary information civilization.",
  "software": "The set of non-physical programs, procedures, algorithms, and documentation associated with the operation of a digital computer system, distinguishing instruction sets and logic from physical hardware.",
  "internet": "A globally interconnected network of decentralized computers and data centers operating via standardized telecommunications protocols (TCP/IP), facilitating communication, information sharing, commerce, and media transmission across billions of nodes.",
  "algorithm": "A well-defined, finite sequence of unambiguous mathematical or computational instructions implemented to solve a class of problems, process data, or perform automated reasoning and decision-making.",
  "artificial intelligence": "A multidisciplinary branch of computer science and cognitive engineering focused on creating synthetic agents capable of tasks requiring human-like intelligence, such as visual perception, natural language understanding, logical inference, learning, and autonomous decision-making.",
  "machine learning": "A subfield of artificial intelligence centered on developing algorithms and statistical models that enable computational systems to learn patterns and infer rules directly from empirical data without being explicitly programmed for every scenario.",
  "neural network": "A computational architecture inspired by biological neuronal networks in animal brains, organized into input, hidden, and output layers of interconnected artificial nodes (neurons) that adjust synaptic connection weights through backpropagation to learn complex non-linear functions.",
  "serendipity": "The occurrence and development of events by chance in a happy, beneficial, or unexpectedly delightful way; the faculty of making fortunate discoveries accidentally while investigating an unrelated matter.",
  "smartphone": "A handheld mobile device combining cellular telephony with advanced computing capabilities, touchscreen interfaces, internet access, sensors (such as GPS and accelerometers), and the capacity to run diverse software applications.",
  "database": "An organized, structured collection of digital information or data stored electronically in a computer system, managed via a Database Management System (DBMS) to enable efficient creation, querying, updating, and administration.",
  "robot": "An autonomous or semi-autonomous machine equipped with sensors, controllers, and actuators, capable of carrying out complex actions, physical manipulations, or programmed tasks either automatically or via remote guidance."
};

console.log(`Building SQLite Cheat Sheet Database at ${DB_FILE}...`);
if (fs.existsSync(DB_FILE)) {
  fs.unlinkSync(DB_FILE);
}

const db = new DatabaseSync(DB_FILE);

db.exec(`
  CREATE TABLE dictionary (
    word TEXT PRIMARY KEY,
    definition TEXT NOT NULL
  );
  CREATE INDEX idx_word ON dictionary(word);
`);

const insertStmt = db.prepare('INSERT OR REPLACE INTO dictionary (word, definition) VALUES (?, ?)');

db.exec('BEGIN TRANSACTION;');

let inserted = 0;
for (const [key, def] of Object.entries(rawData)) {
  const cleanWord = key.trim().toLowerCase();
  const cleanDef = def.trim();
  if (cleanWord && cleanDef) {
    insertStmt.run(cleanWord, cleanDef);
    inserted++;
  }
}

// Inject modern supplements
let supplemented = 0;
for (const [key, def] of Object.entries(MODERN_SUPPLEMENTS)) {
  insertStmt.run(key.toLowerCase(), def);
  supplemented++;
}

db.exec('COMMIT;');

console.log(`Successfully built dictionary database!`);
console.log(`Total words indexed: ${inserted + supplemented} words.`);
db.close();
