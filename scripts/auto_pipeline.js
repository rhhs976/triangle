import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateBatch } from './generate_grammar.js';
import { aiReadGrammar } from './ai_read_grammar.js';
import { generateMathBatch } from './generate_math_qna.js';
import { NextWordGameEngine } from '../src/next_word_engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.resolve(__dirname, '../data/pipeline_state.json');

function updateState(stage, details = {}) {
  const state = {
    currentStage: stage,
    details: details,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  console.log(`[PIPELINE STATE] -> ${stage}: ${JSON.stringify(details)}`);
}

async function runPipeline() {
  console.log("==================================================================");
  console.log("             AUTOMATED AI TRAINING PIPELINE STARTED               ");
  console.log("==================================================================");

  // ---------------------------------------------------------
  // STAGE 1: Grammar Sentence Generation (Target: 3,000)
  // ---------------------------------------------------------
  updateState("STAGE_1_GRAMMAR_GENERATION", { target: 3000 });
  console.log("\n>>> STAGE 1: Generating grammar sentences up to 3,000...");
  await generateBatch({ targetTotal: 3000, batchCount: 8 });
  console.log(">>> STAGE 1 COMPLETE: 3,000 Grammar sentences generated!\n");

  // ---------------------------------------------------------
  // STAGE 2: AI Reading & Comprehension Pass
  // ---------------------------------------------------------
  updateState("STAGE_2_AI_READING", { status: "reading 3000 sentences" });
  console.log(">>> STAGE 2: AI Reading and absorbing all 3,000 grammar sentences...");
  await aiReadGrammar();
  console.log(">>> STAGE 2 COMPLETE: AI has read and absorbed all sentences!\n");

  // ---------------------------------------------------------
  // STAGE 3: Math Q&A Generation (1,000+) & Next Word Game
  // ---------------------------------------------------------
  updateState("STAGE_3_MATH_AND_GAME", { mathTarget: 1000, gameTarget: 2000 });
  console.log(">>> STAGE 3: Starting Math Q&A Generation (1,000+) and Next Word Game...");

  // Generate Math Q&As
  console.log("\n--- Commencing Pattern-Based Math Q&A Generation ---");
  await generateMathBatch({ targetTotal: 1000 });
  console.log("--- 1,000 Math Q&As Completed! ---");

  // Play Next Word Game
  console.log("\n--- Commencing 'Guess the Next Word' 2,000-Round Game ---");
  const game = new NextWordGameEngine({ maxRounds: 2000, delayMs: 1200 });
  await game.runGame();

  // If quota remains, continue expanding Math
  console.log("\n--- Using remaining quota to generate bonus Math Q&As ---");
  await generateMathBatch({ targetTotal: 2000 });

  updateState("PIPELINE_COMPLETED_ALL_STAGES", {
    grammarSentences: 3000,
    mathQnA: 2000,
    gameRounds: 2000
  });

  console.log("\n==================================================================");
  console.log("             ALL AUTOMATED PIPELINE STAGES COMPLETED!             ");
  console.log("==================================================================");
}

runPipeline().catch(err => {
  console.error("Pipeline encountered an error:", err);
  updateState("ERROR", { error: err.message });
});
