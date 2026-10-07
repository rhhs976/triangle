import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');
const OUTPUT_FILE = path.join(DATA_DIR, 'grammar_sentences.jsonl');
const JSON_SUMMARY_FILE = path.join(DATA_DIR, 'grammar_sentences.json');

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const MODEL = 'openai/gpt-oss-120b';

// Real-world everyday domains that normal people actually talk and write about
const DOMAINS = [
  "Everyday Conversations & Daily Life",
  "Travel, Road Trips, and Vacations",
  "Cooking, Food, and Family Dinners",
  "Workplace Collaboration and Team Projects",
  "Friendships, Relationships, and Personal Stories",
  "Sports, Hobbies, and Weekend Activities",
  "School, Learning, and College Life",
  "Community News, Neighborhoods, and Towns",
  "Music, Movies, and Entertainment",
  "Modern Technology, Smart Phones, and the Internet",
  "Pet Care and Animal Stories",
  "Personal Growth, Health, and Fitness"
];

// Grammar Categories and Sub-patterns
const GRAMMAR_CATEGORIES = [
  {
    category: "Clause Combinations & Compound-Complex",
    patterns: [
      "Compound sentence with semicolon and conjunctive adverb (nevertheless, furthermore, conversely)",
      "Complex sentence with concessive clause (even though, whereas, despite the fact that)",
      "Compound-complex sentence with one dependent time clause and two independent clauses",
      "Correlative conjunction structure (not only... but also, neither... nor) with parallel clauses"
    ]
  },
  {
    category: "Tenses & Aspect Nuances",
    patterns: [
      "Past perfect continuous showing duration interrupted by a sudden simple past event",
      "Future perfect expressing completed state prior to a specified benchmark time",
      "Present perfect continuous illustrating ongoing research with evidential present results",
      "Sequence of tenses in reported speech with backshifting"
    ]
  },
  {
    category: "Conditionals & Subjunctive Mood",
    patterns: [
      "Mixed conditional: past counterfactual hypothesis creating a present enduring consequence",
      "Inverted conditional with initial 'Had [subject] [verb-ed]...', omitting 'if'",
      "Inverted conditional with initial 'Were [subject] to [verb]...', projecting hypothetical future",
      "Mandative subjunctive after verbs of demand/recommendation (insist that he remain, require that all data be)"
    ]
  },
  {
    category: "Advanced Rhetorical Syntax & Inversion",
    patterns: [
      "Negative restrictive inversion starting with 'Rarely', 'Seldom', or 'Little did'",
      "Fronted prepositional phrase of location followed by full subject-verb inversion",
      "Nominative absolute phrase (noun + participle modifier) setting the scene for main clause",
      "It-cleft or Wh-cleft sentence highlighting focus and thematic prominence",
      "Participial phrase opening (Having completed the analysis, ...)"
    ]
  },
  {
    category: "Voice, Modality & Precision",
    patterns: [
      "Impersonal passive reporting construction ('It was widely hypothesized that...')",
      "Epistemic modal deduction about the past ('must have deduced', 'could not have known')",
      "Embedded indirect question inside a formal declarative inquiry",
      "Appositive phrase clarifying an abstract noun with concrete apposition"
    ]
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
          temperature: 0.75,
          max_completion_tokens: 1400
        })
      });

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('retry-after') || 5);
        if (retryAfter > 20) {
          console.warn(`  [429 Daily/Long on ${model}]: ${retryAfter}s. Instantly switching model...`);
          currentModelIndex++;
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        console.warn(`  [429 short on ${model}] Waiting ${retryAfter}s...`);
        await new Promise(r => setTimeout(r, (retryAfter + 1) * 1000));
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      return await response.json();
    } catch (err) {
      if (attempt === retries) throw err;
      currentModelIndex++;
      console.warn(`  [Warning] Attempt ${attempt} failed: ${err.message}. Retrying...`);
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}

function loadExistingSentences() {
  const seen = new Set();
  let count = 0;
  if (fs.existsSync(OUTPUT_FILE)) {
    const lines = fs.readFileSync(OUTPUT_FILE, 'utf-8').split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const item = JSON.parse(line);
        seen.add(item.text.trim().toLowerCase());
        count++;
      } catch (e) {}
    }
  }
  return { seen, count };
}

export async function generateBatch({ targetTotal = 300, batchCount = 6 } = {}) {
  const { seen, count: startCount } = loadExistingSentences();
  console.log(`Current sentences in dataset: ${startCount}`);
  if (startCount >= targetTotal) {
    console.log(`Target ${targetTotal} already reached or exceeded!`);
    return;
  }

  let totalCount = startCount;
  let round = 1;

  while (totalCount < targetTotal) {
    const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
    const categoryObj = GRAMMAR_CATEGORIES[Math.floor(Math.random() * GRAMMAR_CATEGORIES.length)];
    const pattern = categoryObj.patterns[Math.floor(Math.random() * categoryObj.patterns.length)];

    console.log(`\n--- Round ${round} | Progress: ${totalCount}/${targetTotal} ---`);
    console.log(`Category: ${categoryObj.category}`);
    console.log(`Pattern:  ${pattern}`);
    console.log(`Domain:   ${domain}`);

    const promptMessages = [
      {
        role: "system",
        content: `You are an elite grammarian, author, and teacher. Output ONLY valid JSON:
{
  "sentences": [
    {
      "text": "The sentence itself, flawless syntax, ending with proper punctuation.",
      "pattern": "Exact grammatical pattern name",
      "explanation": "Clear linguistic analysis of why this sentence exemplifies the pattern"
    }
  ]
}`
      },
      {
        role: "user",
        content: `Generate ${batchCount} distinctly unique, highly articulate English sentences illustrating:
Pattern: "${pattern}"
Category: "${categoryObj.category}"
Thematic Setting/Domain: "${domain}"

Requirements:
1. Impeccable grammar, but written in NATURAL, ENGAGING human English that normal people actually use.
2. Avoid dense scientific, academic, or PhD jargon (NO quantum physics, Dirac cones, or biological lattices).
3. Clear, relatable real-world sentence flow.
4. Detailed grammatical explanation for each.`
      }
    ];

    try {
      const resp = await callGroq(promptMessages);
      const rawContent = resp.choices[0]?.message?.content;
      if (!rawContent) {
        console.error("No content received.");
        continue;
      }

      const parsed = JSON.parse(rawContent);
      const items = parsed.sentences || [];

      let addedThisRound = 0;
      for (const item of items) {
        const text = item.text?.trim();
        if (!text || seen.has(text.toLowerCase())) continue;
        if (text.length < 15 || !/[.!?]$/.test(text)) continue;

        const record = {
          id: totalCount + 1,
          category: categoryObj.category,
          topic: pattern,
          domain: domain,
          text: text,
          pattern: item.pattern || pattern,
          explanation: item.explanation || "",
          tokens: text.split(/\s+/).length,
          timestamp: new Date().toISOString()
        };

        fs.appendFileSync(OUTPUT_FILE, JSON.stringify(record) + '\n', 'utf-8');
        seen.add(text.toLowerCase());
        totalCount++;
        addedThisRound++;

        if (totalCount >= targetTotal) break;
      }

      console.log(`  Added ${addedThisRound} new sentences. (Total dataset size: ${totalCount})`);
      round++;

      // Polite delay between batches to stay comfortably within Groq token limits
      await new Promise(r => setTimeout(r, 1500));

    } catch (err) {
      console.error("Batch error:", err.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // Update master JSON file
  const allLines = fs.readFileSync(OUTPUT_FILE, 'utf-8').split('\n').filter(Boolean);
  const dataset = allLines.map(l => JSON.parse(l));
  fs.writeFileSync(JSON_SUMMARY_FILE, JSON.stringify(dataset, null, 2), 'utf-8');

  console.log(`\n================================================================`);
  console.log(`Dataset target reached! Total high-quality sentences: ${dataset.length}`);
  console.log(`Saved JSONL: ${OUTPUT_FILE}`);
  console.log(`Saved JSON:  ${JSON_SUMMARY_FILE}`);
  console.log(`================================================================`);
}

// Support CLI execution: node generate_grammar.js [targetCount] [batchSize]
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const target = args[0] ? parseInt(args[0], 10) : 2000;
  const batch = args[1] ? parseInt(args[1], 10) : 8;

  generateBatch({ targetTotal: target, batchCount: batch }).catch(console.error);
}
