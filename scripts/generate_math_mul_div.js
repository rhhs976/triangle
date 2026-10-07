import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.resolve(__dirname, '../data/math_multiplication_division.jsonl');
const STATE_FILE = path.resolve(__dirname, '../data/math_mul_div_state.json');

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const TARGET_COUNT = 2000;
const BATCH_SIZE = 15; // Optimal batch size for speed and token limit efficiency

// Priority model list with automatic fallback
const MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b'
];

let currentModelIdx = 0;

function getCompletedCount() {
  if (!fs.existsSync(OUTPUT_FILE)) return 0;
  const lines = fs.readFileSync(OUTPUT_FILE, 'utf-8').split('\n').filter(Boolean);
  return lines.length;
}

function verifyMath(item) {
  // Use BigInt to guarantee 100% mathematical correctness
  try {
    const a = BigInt(item.operandA);
    const b = BigInt(item.operandB);

    if (item.type === 'multiplication') {
      const correctProduct = (a * b).toString();
      item.answer = correctProduct;
      // Synthesize verified derivation if missing or incorrect
      if (!item.derivation || !item.derivation.includes(correctProduct)) {
        item.derivation = `Multiply ${a.toLocaleString()} by ${b.toLocaleString()}: ${a} × ${b} = ${correctProduct}.`;
      }
    } else if (item.type === 'division') {
      if (b === 0n) return null;
      const quotient = (a / b).toString();
      const remainder = (a % b).toString();
      item.quotient = quotient;
      item.remainder = remainder;
      if (remainder === '0') {
        item.answer = quotient;
        item.derivation = `Divide ${a.toLocaleString()} by ${b.toLocaleString()}: ${a} ÷ ${b} = ${quotient} with no remainder.`;
      } else {
        item.answer = `${quotient} R ${remainder}`;
        item.derivation = `Divide ${a.toLocaleString()} by ${b.toLocaleString()}: ${a} ÷ ${b} = ${quotient} with remainder ${remainder} (${b} × ${quotient} + ${remainder} = ${a}).`;
      }
    }
    return item;
  } catch (e) {
    return null;
  }
}

async function callGroqBatch(batchNumber, countNeeded) {
  const count = Math.min(countNeeded, BATCH_SIZE);

  const prompt = `You are an expert mathematics educator. Generate exactly ${count} diverse, high-quality math questions focusing on MULTIPLICATION and DIVISION.
Include a balanced mix of:
1. Multi-digit multiplication (e.g. 2-digit x 2-digit, 3-digit x 2-digit, 4-digit x 1-digit, scaling with tens/hundreds).
2. Division problems (exact integer division and division with remainders).
3. Real-world applied word problems (areas, packaging, unit rates, budgeting, inventory distribution).

Output ONLY valid JSON matching this schema:
{
  "questions": [
    {
      "type": "multiplication" or "division",
      "question": "Clear and engaging question text...",
      "operandA": 450,
      "operandB": 12,
      "answer": "5400",
      "derivation": "Step-by-step place-value explanation...",
      "pattern": "Distributive partial products" or "Long division algorithm" or "Area scaling"
    }
  ]
}`;

  for (let attempt = 0; attempt < MODELS.length * 2; attempt++) {
    const model = MODELS[currentModelIdx % MODELS.length];

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "system",
              content: "You are a mathematics generator producing structured JSON math curricula. Output ONLY JSON with key 'questions'."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7
        })
      });

      if (res.status === 200) {
        const data = await res.json();
        const content = data.choices[0]?.message?.content;
        const parsed = JSON.parse(content);
        const questions = parsed.questions || parsed.data || [];
        return { success: true, questions, model };
      }

      if (res.status === 429) {
        const errText = await res.text();
        console.log(`[Rate Limit 429 on ${model}]. Rotating to next available model...`);
        currentModelIdx++;
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }

      console.log(`[HTTP ${res.status}] on ${model}. Retrying...`);
      currentModelIdx++;
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.log(`[Network Error]: ${err.message}. Retrying...`);
      currentModelIdx++;
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  return { success: false, questions: [] };
}

export async function runMultiplicationDivisionPipeline() {
  console.log("==================================================================");
  console.log("  GROQ MATHEMATICS GENERATOR: MULTIPLICATION & DIVISION (2,000)   ");
  console.log("==================================================================");

  let completed = getCompletedCount();
  console.log(`Starting generation. Already completed: ${completed}/${TARGET_COUNT}`);

  let batchNum = Math.floor(completed / BATCH_SIZE) + 1;

  while (completed < TARGET_COUNT) {
    const needed = TARGET_COUNT - completed;
    console.log(`\n[Batch #${batchNum}] Requesting ${Math.min(needed, BATCH_SIZE)} questions via Groq...`);

    const result = await callGroqBatch(batchNum, needed);

    if (result.success && result.questions.length > 0) {
      let savedThisBatch = 0;
      for (const q of result.questions) {
        if (!q.question || !q.type || q.operandA === undefined || q.operandB === undefined) continue;
        const verified = verifyMath(q);
        if (!verified) continue;

        verified.id = completed + 1;
        verified.timestamp = new Date().toISOString();
        verified.generatedBy = result.model;

        fs.appendFileSync(OUTPUT_FILE, JSON.stringify(verified) + '\n', 'utf-8');
        completed++;
        savedThisBatch++;

        if (completed >= TARGET_COUNT) break;
      }

      console.log(`  ✓ Saved ${savedThisBatch} verified math questions via ${result.model}. Total progress: ${completed}/${TARGET_COUNT} (${((completed / TARGET_COUNT) * 100).toFixed(1)}%)`);

      // Update state file
      fs.writeFileSync(STATE_FILE, JSON.stringify({
        completed,
        target: TARGET_COUNT,
        lastModel: result.model,
        updatedAt: new Date().toISOString()
      }, null, 2), 'utf-8');

      batchNum++;
    } else {
      console.log(`  ⚠ Batch failed or returned empty. Waiting 5s before next attempt...`);
      await new Promise(r => setTimeout(r, 5000));
    }

    // Gentle delay to stay within rate quotas
    await new Promise(r => setTimeout(r, 1200));
  }

  console.log("\n==================================================================");
  console.log(`  SUCCESS! Generated ${completed} Multiplication & Division Problems!`);
  console.log(`  Output file: ${OUTPUT_FILE}`);
  console.log("==================================================================\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMultiplicationDivisionPipeline().catch(console.error);
}
