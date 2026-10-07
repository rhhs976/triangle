# AI Grammar & Knowledge Learning Pipeline

Built using the Groq API (`openai/gpt-oss-120b`).

## Master Plan Implementation Roadmap
1. **Grammar Foundation (Current Step)**: Generate thousands of high-quality, syntactically diverse example sentences with grammatical explanations across 30+ linguistic topics.
2. **Cheat Sheet Dictionary**: Downloadable dictionary indexed for instant term lookup (`sorry, no definition has been found for this word`).
3. **"What's the Next Word?" Tester**: Interactive next-word predictor evaluating grammatical flow and syntactic coherence.
4. **Pattern-Based Subjects (e.g. Math)**: Automated question and answer generator capturing rule-based derivations.
5. **Encyclopedic Factual Knowledge (History, Science)**: Structured question-answering dataset for non-pattern factual recall.
6. **Chat Interface**: Web UI connecting the grammar model, dictionary lookup, and subject memory into an interactive assistant.

---

## Grammar Sentence Dataset
- **JSONL Dataset**: `data/grammar_sentences.jsonl`
- **Full JSON Dataset**: `data/grammar_sentences.json`

### Dataset Format
Each sentence entry contains:
```json
{
  "id": 1,
  "category": "Sentence Structure",
  "topic": "Compound-Complex Sentences",
  "domain": "Philosophy and Ethics",
  "text": "When the sun set over the ancient academy, scholars debated the morality of artificial consciousness, and the council convened to draft a new ethical charter.",
  "pattern": "Compound-complex sentence with one dependent time clause and two independent clauses",
  "explanation": "The dependent time clause 'When the sun set over the ancient academy' modifies the entire sentence; the two independent clauses are coordinated by 'and'.",
  "tokens": 25,
  "timestamp": "2026-10-05T21:00:00.000Z"
}
```

---

## Running in the Background

The generator is configured to run silently in the background:

```bash
# Start background generation (Target: 2000, Batch: 8)
./scripts/start_background_generator.sh 2000 8

# Live stream progress
tail -f generator.log

# Check current count
wc -l data/grammar_sentences.jsonl

# Stop background generator
./scripts/stop_generator.sh
```

### 2. Inspect Dataset & Category Statistics
```bash
node scripts/inspect_grammar.js
```

### 3. Play "What's the Next Word?" Grammar Tester (Step 3: 2,000 Rounds)

The AI plays **"Guess the Next Word"** across **2,000 sentence challenges** to master grammar and syntax transitions:

```bash
# Start 2,000-round game in the background
./scripts/start_game_background.sh 2000 1500

# Live stream the AI playing round-by-round
tail -f game.log

# Check current score, exact match accuracy, and rounds completed
./scripts/game_status.sh

# Stop the game
./scripts/stop_game.sh
```

- **Logged Rounds & Predictions**: `data/game_results_2000.jsonl`
- **Live Summary & Accuracy**: `data/game_summary.json`

---

## Dictionary Cheat Sheet Engine (Step 2)
- **Database**: `data/dictionary.db` (Indexed SQLite containing **102,228 words**)
- **Source**: `data/dictionary.json` + Modern 21st-century supplements
- **Lookup Module**: `src/dictionary.js`

### Features:
1. **102,228 scholarly, in-depth definitions** (Webster's Unabridged + Modern Technology & Science terms).
2. **No shallow definitions**: Every entry provides rich etymology, zoology, idioms, or rigorous scientific context.
3. **Natural question parsing**: Recognizes questions like *"what is a cat?"*, *"define serendipity"*, *"what does algorithm mean?"*.
4. **Morphological stemming**: Automatically resolves plurals and inflections (`cats` → `cat`, `philosophies` → `philosophy`).
5. **Exact Fallback**: If a term is missing, it responds with:
   `"Sorry, no definition has been found for this word."`

### Usage:
```bash
# Query single word or question
node scripts/lookup_dictionary.js "what is a cat?"
node scripts/lookup_dictionary.js "define serendipity"
node scripts/lookup_dictionary.js "define nonexistentword"

# Interactive Dictionary Terminal
node scripts/lookup_dictionary.js
```
