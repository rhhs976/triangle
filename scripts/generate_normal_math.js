import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.resolve(__dirname, '../data/math_multiplication_division.jsonl');

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const MODELS = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadExisting() {
  if (!fs.existsSync(OUTPUT_FILE)) return [];
  const lines = fs.readFileSync(OUTPUT_FILE, 'utf-8').trim().split('\n').filter(Boolean);
  return lines.map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

async function callGroqWithFallback(prompt) {
  for (const model of MODELS) {
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
            {
              role: 'system',
              content: 'You are a formal mathematics professor. Generate pure numerical and algebraic questions with detailed step-by-step working out. Do NOT write word problems or stories. Output valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 1200
        })
      });

      if (res.status === 429) {
        console.warn(`[RateLimit 429] Model ${model} rate-limited. Trying fallback...`);
        await sleep(3000);
        continue;
      }

      if (!res.ok) {
        console.warn(`[HTTP ${res.status}] on ${model}: ${await res.text()}`);
        continue;
      }

      const data = await res.json();
      const content = data.choices[0]?.message?.content?.trim();
      return { content, model };
    } catch (err) {
      console.warn(`Network error on ${model}: ${err.message}`);
    }
  }
  return null;
}

export async function generateNormalMathBatch(batchCount = 10) {
  const prompt = `Generate ${batchCount} pure, formal mathematics problems with step-by-step working out.

CATEGORIES TO COVER:
1. Multi-digit Multiplication (e.g. Calculate 3,845 × 46, Evaluate 729 × 184)
2. Multi-digit Long Division (e.g. Compute 94,860 ÷ 36, Find 15,750 ÷ 25)
3. Mixed Operations / PEMDAS (e.g. Evaluate (480 × 25) - 3,450, Calculate (64,000 ÷ 16) + (125 × 14))
4. Exponents / Powers (e.g. Calculate 145², Evaluate 35³ - 12,000)

CRITICAL REQUIREMENTS:
- ABSOLUTELY NO WORD PROBLEMS OR STORIES (NO people, cookies, items, stores, apples, boxes, or money).
- ONLY direct mathematical instructions ("Calculate ...", "Evaluate ...", "Compute ...", "Find the value of ...").
- Each problem MUST include detailed step-by-step working out showing the mathematical derivation.
- Return ONLY a valid JSON array of objects. Format:
[
  {
    "type": "multiplication" | "division" | "mixed_operations" | "exponents",
    "question": "Calculate 3,845 × 46",
    "working_out": "1) 3,845 × 6 = 23,070; 2) 3,845 × 40 = 153,800; 3) 23,070 + 153,800 = 176,870",
    "answer": "176,870"
  }
]`;

  const result = await callGroqWithFallback(prompt);
  if (!result) return [];

  try {
    let clean = result.content;
    const jsonMatch = clean.match(/\[[\s\S]*\]/);
    if (jsonMatch) clean = jsonMatch[0];
    const parsed = JSON.parse(clean);
    return parsed.map(item => ({
      ...item,
      generatedBy: result.model,
      timestamp: new Date().toISOString()
    }));
  } catch (err) {
    console.error('Failed to parse Groq response as JSON:', err.message);
    return [];
  }
}

export async function runGeneration(targetCount = 500) {
  let existing = loadExisting();
  console.log(`Current pure math problems in dataset: ${existing.length}`);
  console.log(`Target: ${targetCount} pure math problems.\n`);

  while (existing.length < targetCount) {
    console.log(`Generating batch via Groq... (Current: ${existing.length}/${targetCount})`);
    const batch = await generateNormalMathBatch(10);

    if (batch.length === 0) {
      console.log('No valid problems generated in this batch. Waiting 5s...');
      await sleep(5000);
      continue;
    }

    let added = 0;
    for (const item of batch) {
      if (!item.question || !item.working_out || !item.answer) continue;
      // Filter out any accidental word problem
      if (item.question.match(/\b(cookie|apple|student|farmer|box|factory|store|pencil|shelf|car|trip)\b/i)) continue;

      item.id = existing.length + 1;
      fs.appendFileSync(OUTPUT_FILE, JSON.stringify(item) + '\n');
      existing.push(item);
      added++;
    }

    console.log(`✓ Added ${added} verified pure math problems. Total now: ${existing.length}`);
    await sleep(2500); // Friendly pacing to avoid Groq rate limit
  }

  console.log(`\n🎉 Successfully completed! Total pure math problems: ${existing.length}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = parseInt(process.argv[2] || '200', 10);
  runGeneration(target);
}
