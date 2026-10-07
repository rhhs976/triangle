import { NextWordGameEngine } from '../src/next_word_engine.js';

const args = process.argv.slice(2);
const targetRounds = args[0] ? parseInt(args[0], 10) : 2000;
const delayMs = args[1] ? parseInt(args[1], 10) : 1200;

const engine = new NextWordGameEngine({
  maxRounds: targetRounds,
  delayMs: delayMs
});

engine.runGame().catch(console.error);
