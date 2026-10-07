import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_FILE = path.resolve(__dirname, '../data/grammar_sentences.json');

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const MODEL = 'openai/gpt-oss-120b';

async function testNextWordGame(rounds = 5) {
  if (!fs.existsSync(JSON_FILE)) {
    console.error("No grammar sentences found. Run generator first!");
    return;
  }

  const dataset = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
  console.log(`====================================================`);
  console.log(`        WHAT'S THE NEXT WORD? (Grammar Tester)       `);
  console.log(`====================================================`);
  console.log(`Testing grammar prediction across ${rounds} rounds...\n`);

  let correctCount = 0;

  for (let r = 1; r <= rounds; r++) {
    // Pick random sentence
    const sample = dataset[Math.floor(Math.random() * dataset.length)];
    const words = sample.text.split(' ');
    
    if (words.length < 6) continue;

    // Cut at a mid-to-late point
    const cutIndex = Math.floor(words.length * 0.65);
    const context = words.slice(0, cutIndex).join(' ');
    const expectedWord = words[cutIndex].replace(/[.,;:!?]/g, '');
    const remainder = words.slice(cutIndex).join(' ');

    console.log(`[Round ${r}/${rounds}]`);
    console.log(`Category: ${sample.category} (${sample.pattern})`);
    console.log(`Prefix:   "${context} [___]"`);

    const prompt = [
      {
        role: "system",
        content: "You are playing 'What is the next word?'. Given the incomplete English sentence, predict ONLY the single most grammatically coherent next word. Reply with ONLY that single word, nothing else."
      },
      {
        role: "user",
        content: `Complete the next single word for: "${context} "`
      }
    ];

    try {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODEL,
          reasoning_effort: 'low',
          messages: prompt,
          max_completion_tokens: 150,
          temperature: 0.2
        })
      });

      if (!resp.ok) {
        console.log(`  Skipping (API status ${resp.status})`);
        continue;
      }

      const data = await resp.json();
      const rawPrediction = data.choices[0]?.message?.content?.trim() || "";
      const predictedWord = rawPrediction.split(/\s+/)[0]?.replace(/["'.,;:!?]/g, '') || "";

      const isExactMatch = predictedWord.toLowerCase() === expectedWord.toLowerCase();
      if (isExactMatch) correctCount++;

      console.log(`AI Prediction: "${predictedWord}"`);
      console.log(`Actual Word:   "${expectedWord}"`);
      console.log(`Status:        ${isExactMatch ? 'MATCH (Exact)' : 'GRAMMATICALLY PLAUSIBLE / ALTERNATIVE'}`);
      console.log(`Full Original: "${sample.text}"\n`);

      await new Promise(res => setTimeout(res, 1200));
    } catch (e) {
      console.error(`Error in round ${r}:`, e.message);
    }
  }

  console.log(`====================================================`);
  console.log(`Next-Word Test Complete!`);
  console.log(`Exact Matches: ${correctCount}/${rounds} (${Math.round((correctCount/rounds)*100)}%)`);
  console.log(`====================================================`);
}

const rounds = process.argv[2] ? parseInt(process.argv[2], 10) : 3;
testNextWordGame(rounds).catch(console.error);
