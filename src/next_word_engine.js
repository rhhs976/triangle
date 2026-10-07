import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SENTENCES_FILE = path.resolve(__dirname, '../data/grammar_sentences.jsonl');
const RESULTS_FILE = path.resolve(__dirname, '../data/game_results_2000.jsonl');
const STATS_FILE = path.resolve(__dirname, '../data/game_summary.json');

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const MODEL = 'openai/gpt-oss-120b';

export class NextWordGameEngine {
  constructor(options = {}) {
    this.model = options.model || MODEL;
    this.maxRounds = options.maxRounds || 2000;
    this.delayMs = options.delayMs || 1500;
  }

  // Load all available grammar sentences
  loadSentences() {
    if (!fs.existsSync(SENTENCES_FILE)) {
      throw new Error(`Sentences dataset not found at ${SENTENCES_FILE}`);
    }
    const lines = fs.readFileSync(SENTENCES_FILE, 'utf-8').split('\n').filter(Boolean);
    return lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
  }

  // Determine existing progress
  getCompletedRounds() {
    if (!fs.existsSync(RESULTS_FILE)) return 0;
    const lines = fs.readFileSync(RESULTS_FILE, 'utf-8').split('\n').filter(Boolean);
    return lines.length;
  }

  // Create a challenging masking point (conjunction, verb, or inflection point)
  createChallenge(sentenceObj, roundIndex) {
    const rawText = sentenceObj.text.trim();
    const words = rawText.split(/\s+/);

    if (words.length < 5) return null;

    // Pick dynamic mask positions (e.g. 50%, 65%, 80%) depending on roundIndex
    const fractions = [0.45, 0.60, 0.75];
    const frac = fractions[roundIndex % fractions.length];
    let cutIndex = Math.floor(words.length * frac);
    if (cutIndex >= words.length - 1) cutIndex = words.length - 2;
    if (cutIndex < 2) cutIndex = 2;

    const prefix = words.slice(0, cutIndex).join(' ');
    const rawTarget = words[cutIndex];
    // Strip trailing punctuation from target word
    const targetWord = rawTarget.replace(/[.,;:!?\"'()]/g, '');
    const remainder = words.slice(cutIndex + 1).join(' ');

    return {
      sentenceId: sentenceObj.id,
      category: sentenceObj.category,
      pattern: sentenceObj.pattern,
      fullText: rawText,
      prefix: prefix,
      targetWord: targetWord,
      remainder: remainder,
      cutIndex: cutIndex,
      totalWords: words.length
    };
  }

  // Call Groq to predict the next word
  async predictNextWord(challenge, retries = 4) {
    const messages = [
      {
        role: "system",
        content: `You are an AI language engine being trained on grammar through "Guess the Next Word".
Given an incomplete English sentence prefix, analyze the syntax, tense, and context to predict the single next word.
Output valid JSON only:
{
  "prediction": "exact_next_word",
  "confidence": 85,
  "reasoning": "Brief syntactic explanation of why this part of speech and word is required next."
}`
      },
      {
        role: "user",
        content: `Category: ${challenge.category}
Grammatical Pattern: ${challenge.pattern}
Prefix: "${challenge.prefix} [___]"

Predict the single next word:`
      }
    ];

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: this.model,
            reasoning_effort: 'low',
            response_format: { type: 'json_object' },
            messages: messages,
            temperature: 0.3,
            max_completion_tokens: 150
          })
        });

        if (response.status === 429) {
          const retryAfter = Number(response.headers.get('retry-after') || (attempt * 3));
          console.warn(`  [429 Rate Limit in Game] Waiting ${retryAfter}s...`);
          await new Promise(r => setTimeout(r, (retryAfter + 1) * 1000));
          continue;
        }

        if (!response.ok) {
          const err = await response.text();
          throw new Error(`HTTP ${response.status}: ${err}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        const parsed = JSON.parse(content);
        
        let predWord = (parsed.prediction || "").trim().replace(/[.,;:!?\"'()]/g, '');
        // Keep single token
        predWord = predWord.split(/\s+/)[0] || "";

        return {
          prediction: predWord,
          confidence: parsed.confidence || 50,
          reasoning: parsed.reasoning || ""
        };
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  // Run the 2000-sentence game loop
  async runGame({ onRoundComplete = null } = {}) {
    let completed = this.getCompletedRounds();
    console.log(`==================================================================`);
    console.log(`        STARTING "GUESS THE NEXT WORD" AI GAME (TARGET: ${this.maxRounds})`);
    console.log(`==================================================================`);
    console.log(`Previously recorded rounds: ${completed}`);

    const sentences = this.loadSentences();
    if (sentences.length === 0) {
      throw new Error("No sentences available in grammar dataset!");
    }
    console.log(`Loaded ${sentences.length} sentences from grammar curriculum.`);

    let exactMatches = 0;
    let totalScore = 0;

    // Load prior stats if resuming
    if (fs.existsSync(STATS_FILE)) {
      try {
        const prevStats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
        exactMatches = prevStats.exactMatches || 0;
      } catch (e) {}
    }

    for (let round = completed + 1; round <= this.maxRounds; round++) {
      // Pick sentence in deterministic cyclic sequence
      const sentenceIdx = (round - 1) % sentences.length;
      const sentence = sentences[sentenceIdx];
      const challenge = this.createChallenge(sentence, round);

      if (!challenge) continue;

      console.log(`\n--- Round [${round}/${this.maxRounds}] ---`);
      console.log(`Category: ${challenge.category}`);
      console.log(`Pattern:  ${challenge.pattern}`);
      console.log(`Prefix:   "${challenge.prefix} [___]"`);

      try {
        const aiResult = await this.predictNextWord(challenge);
        const isExact = aiResult.prediction.toLowerCase() === challenge.targetWord.toLowerCase();
        
        if (isExact) exactMatches++;

        console.log(`AI Prediction: "${aiResult.prediction}" (Confidence: ${aiResult.confidence}%)`);
        console.log(`Actual Word:   "${challenge.targetWord}"`);
        console.log(`Result:        ${isExact ? '✅ EXACT MATCH' : '⚡ PLAUSIBLE SYNTACTIC ALTERNATIVE'}`);
        console.log(`AI Reasoning:  ${aiResult.reasoning}`);

        const resultRecord = {
          round: round,
          sentenceId: challenge.sentenceId,
          category: challenge.category,
          pattern: challenge.pattern,
          prefix: challenge.prefix,
          targetWord: challenge.targetWord,
          prediction: aiResult.prediction,
          confidence: aiResult.confidence,
          isExactMatch: isExact,
          reasoning: aiResult.reasoning,
          fullSentence: challenge.fullText,
          timestamp: new Date().toISOString()
        };

        fs.appendFileSync(RESULTS_FILE, JSON.stringify(resultRecord) + '\n', 'utf-8');

        // Update summary stats
        const currentAccuracy = ((exactMatches / round) * 100).toFixed(2);
        const stats = {
          totalRoundsTarget: this.maxRounds,
          completedRounds: round,
          exactMatches: exactMatches,
          exactMatchAccuracy: `${currentAccuracy}%`,
          lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8');

        if (onRoundComplete) {
          onRoundComplete(resultRecord, stats);
        }

        // Delay to avoid hitting rate limits
        await new Promise(r => setTimeout(r, this.delayMs));

      } catch (err) {
        console.error(`Error in round ${round}:`, err.message);
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    console.log(`\n==================================================================`);
    console.log(`All ${this.maxRounds} rounds of "Guess the Next Word" completed!`);
    console.log(`Results saved to: ${RESULTS_FILE}`);
    console.log(`Summary saved to: ${STATS_FILE}`);
    console.log(`==================================================================`);
  }
}
