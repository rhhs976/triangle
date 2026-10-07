import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.resolve(__dirname, '../data/math_multiplication_division.jsonl');
const LOG_FILE = path.resolve(__dirname, '../slow_math.log');

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const PRIMARY_MODEL = 'qwen/qwen3.8-27b';
const FALLBACK_MODEL = 'openai/gpt-oss-120b';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function loadCount() {
  if (!fs.existsSync(OUTPUT_FILE)) return 0;
  const lines = fs.readFileSync(OUTPUT_FILE, 'utf-8').trim().split('\n').filter(Boolean);
  return lines.length;
}

const CATEGORIES = [
  {
    type: "multiplication",
    desc: "Multi-digit multiplication (e.g. 3-digit by 2-digit, 4-digit by 2-digit) with partial products"
  },
  {
    type: "division",
    desc: "Multi-digit long division (e.g. 4-digit or 5-digit by 2-digit) showing quotient, intermediate steps, and remainder if any"
  },
  {
    type: "order_of_operations",
    desc: "Arithmetic order of operations / PEMDAS combining multiplication, division, addition, and parentheses"
  },
  {
    type: "exponents_and_squares",
    desc: "Powers, square computations (e.g. 135², 45³ - 12000), and roots with step-by-step expansion"
  },
  {
    type: "linear_equations",
    desc: "One-variable linear equations (e.g. Solve for x: 8x - 56 = 3x + 19) showing inverse operations"
  },
  {
    type: "fractions_and_percentages",
    desc: "Numerical fractions and percentage calculations (e.g. Find 35% of 4,800, Evaluate 5/8 + 7/12) with common denominators"
  }
];

function extractJsonArray(text) {
  if (!text) return null;
  const match = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      try {
        const sanitized = match[0].replace(/,\s*\]/, ']').replace(/,\s*\}/g, '}');
        return JSON.parse(sanitized);
      } catch {}
    }
  }
  return null;
}

async function fetchGroqBatch(category) {
  const prompt = `Generate exactly 2 standard mathematics problems for: "${category.desc}".
RULES:
1. NO word problems or story scenarios (NO cookies, apples, people, stores, money, or items).
2. ONLY formal arithmetic questions (e.g. "Calculate 3,450 × 42", "Evaluate 84,630 ÷ 18", "Solve for x: 5x + 14 = 39").
3. Include step-by-step working out and answer.
Output strictly a JSON array of 2 objects:
[
  {
    "type": "${category.type}",
    "question": "Calculate 4,825 × 36",
    "working_out": "1) 4,825 × 6 = 28,950; 2) 4,825 × 30 = 144,750; 3) 28,950 + 144,750 = 173,700",
    "answer": "173,700"
  }
]`;

  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: model.includes('120b') ? 1400 : 450
        })
      });

      if (res.status === 429) {
        log(`[Rate Limit 429 on ${model}]. Waiting 20s...`);
        await sleep(20000);
        continue;
      }

      if (!res.ok) {
        log(`[HTTP ${res.status} on ${model}]: ${await res.text()}`);
        continue;
      }

      const data = await res.json();
      const content = data.choices[0]?.message?.content?.trim();
      const items = extractJsonArray(content);

      if (items && Array.isArray(items)) {
        return { items, model };
      }
    } catch (err) {
      log(`Error calling ${model}: ${err.message}`);
    }
  }

  return null;
}

export async function runSlowMathGenerator(target = 500) {
  log(`Starting Safe, Slow & Rate-Limit-Free Pure Math Generator. Target: ${target}`);
  let total = loadCount();
  log(`Existing pure math problems in dataset: ${total}`);

  let catIdx = 0;

  while (total < target) {
    const category = CATEGORIES[catIdx % CATEGORIES.length];
    catIdx++;

    log(`Requesting 2 pure math problems: [${category.type}]...`);
    const result = await fetchGroqBatch(category);

    if (result && Array.isArray(result.items)) {
      let added = 0;
      for (const item of result.items) {
        if (!item.question || !item.working_out || !item.answer) continue;

        // Reject word problems
        if (item.question.match(/\b(cookie|apple|student|farmer|box|factory|store|pencil|shelf|car|trip|candies|books)\b/i)) {
          continue;
        }

        total++;
        item.id = total;
        item.generatedBy = result.model;
        item.timestamp = new Date().toISOString();

        fs.appendFileSync(OUTPUT_FILE, JSON.stringify(item) + '\n');
        added++;
      }

      log(`✓ Saved ${added} pure math problems via ${result.model}. (Progress: ${total}/${target})`);
    } else {
      log(`Batch could not be parsed. Retrying next category...`);
    }

    // SAFE PACE: Wait 20 seconds between calls!
    // 3 calls per minute = 10% of RPM limit, ~450 tokens/min = 5% of TPM limit.
    log(`Pacing: resting 20 seconds to prevent any rate limiting...`);
    await sleep(20000);
  }

  log(`🎉 Successfully generated ${total} pure math problems!`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = parseInt(process.argv[2] || '300', 10);
  runSlowMathGenerator(target);
}
