import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');
const OUTPUT_FILE = path.join(DATA_DIR, 'math_qna.jsonl');
const JSON_SUMMARY_FILE = path.join(DATA_DIR, 'math_qna.json');

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const MODEL = 'openai/gpt-oss-120b';

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Math pattern categories
const MATH_TOPICS = [
  {
    category: "Arithmetic & Number Patterns",
    topic: "Arithmetic & Geometric Sequences",
    prompt: "Generate 5 math problems identifying the nth term or common difference/ratio in arithmetic and geometric sequences with step-by-step pattern derivation."
  },
  {
    category: "Algebraic Patterns",
    topic: "Linear & Quadratic Equations",
    prompt: "Generate 5 algebraic pattern questions (factoring quadratics, finding roots, linear system balancing) with explicit step-by-step pattern-based solutions."
  },
  {
    category: "Geometric Formulas & Properties",
    topic: "Pythagorean Theorem, Area & Volume Scaling",
    prompt: "Generate 5 geometry problems involving dimensional scaling, coordinate geometry distances, or triangle properties using strict formulaic derivations."
  },
  {
    category: "Percentages, Ratios & Rates",
    topic: "Compound Interest, Proportions & Speed-Time-Distance",
    prompt: "Generate 5 applied rate/ratio problems (compound growth, unit conversions, work-rate problems) showing clear mathematical derivation."
  },
  {
    category: "Probability & Combinatorics",
    topic: "Permutations, Combinations & Independent Events",
    prompt: "Generate 5 discrete probability and counting problems showing the combinatorial pattern and exact fractional/decimal answer."
  }
];

const MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
let currentModelIndex = 0;

async function callGroq(messages, retries = 4) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const model = MODELS[currentModelIndex % MODELS.length];
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          reasoning_effort: 'low',
          response_format: { type: 'json_object' },
          messages: messages,
          temperature: 0.4,
          max_completion_tokens: 1400
        })
      });

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('retry-after') || 5);
        if (retryAfter > 20) {
          console.warn(`  [Math 429 Long on ${model}]: ${retryAfter}s. Instantly switching model...`);
          currentModelIndex++;
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        console.warn(`  [Math 429 short on ${model}] Waiting ${retryAfter}s...`);
        await new Promise(r => setTimeout(r, (retryAfter + 1) * 1000));
        continue;
      }

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`HTTP ${response.status}: ${err}`);
      }

      return await response.json();
    } catch (err) {
      if (attempt === retries) throw err;
      currentModelIndex++;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

function loadExistingMath() {
  let count = 0;
  if (fs.existsSync(OUTPUT_FILE)) {
    const lines = fs.readFileSync(OUTPUT_FILE, 'utf-8').split('\n');
    for (const line of lines) {
      if (line.trim()) count++;
    }
  }
  return count;
}

export async function generateMathBatch({ targetTotal = 1000, batchSize = 5 } = {}) {
  let currentCount = loadExistingMath();
  console.log(`Starting Math Q&A Generation. Current count: ${currentCount} / Target: ${targetTotal}`);

  let round = 1;
  while (currentCount < targetTotal) {
    const topicObj = MATH_TOPICS[(round - 1) % MATH_TOPICS.length];
    console.log(`\n[Math Round ${round}] ${topicObj.category} -> ${topicObj.topic} (${currentCount}/${targetTotal})`);

    const messages = [
      {
        role: "system",
        content: `You are an elite mathematics educator. Produce high-quality, pattern-based mathematical questions and answers. Every question must teach a pattern or formula.
Output ONLY valid JSON with this exact format:
{
  "questions": [
    {
      "category": "${topicObj.category}",
      "pattern_type": "${topicObj.topic}",
      "question": "The clearly phrased math question",
      "derivation": "Step-by-step mathematical reasoning and pattern derivation",
      "answer": "Exact final answer with units if applicable"
    }
  ]
}`
      },
      {
        role: "user",
        content: topicObj.prompt
      }
    ];

    try {
      const resp = await callGroq(messages);
      const raw = resp.choices[0]?.message?.content;
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const list = parsed.questions || [];

      for (const item of list) {
        if (!item.question || !item.answer) continue;

        currentCount++;
        const record = {
          id: currentCount,
          category: item.category || topicObj.category,
          pattern_type: item.pattern_type || topicObj.topic,
          question: item.question.trim(),
          derivation: item.derivation ? item.derivation.trim() : "",
          answer: item.answer.trim(),
          timestamp: new Date().toISOString()
        };

        fs.appendFileSync(OUTPUT_FILE, JSON.stringify(record) + '\n', 'utf-8');
        if (currentCount >= targetTotal) break;
      }

      console.log(`  Added ${list.length} math Q&As. Total now: ${currentCount}`);
      round++;
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.error("Math batch error:", e.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // Update summary JSON
  const lines = fs.readFileSync(OUTPUT_FILE, 'utf-8').split('\n').filter(Boolean);
  const dataset = lines.map(l => JSON.parse(l));
  fs.writeFileSync(JSON_SUMMARY_FILE, JSON.stringify(dataset, null, 2), 'utf-8');

  console.log(`\n======================================================`);
  console.log(`Math Q&A generation target reached! Total: ${dataset.length}`);
  console.log(`Saved to: ${OUTPUT_FILE}`);
  console.log(`======================================================`);
}

// Allow CLI run
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = process.argv[2] ? parseInt(process.argv[2], 10) : 1000;
  generateMathBatch({ targetTotal: target }).catch(console.error);
}
