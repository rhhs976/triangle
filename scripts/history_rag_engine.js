import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILES_DIR = path.resolve(__dirname, '../files');
const JSON_PATH = path.join(FILES_DIR, 'historical_events_rag_seed.json');
const DB_PATH = path.join(FILES_DIR, 'historical_events_dictionary.db');

export class HistoryRAGEngine {
  constructor() {
    this.db = new DatabaseSync(DB_PATH);
    const raw = fs.readFileSync(JSON_PATH, 'utf-8');
    this.seedData = JSON.parse(raw);

    // Flatten events for indexing
    this.events = [];
    for (const era of this.seedData.historical_eras) {
      for (const ev of era.events) {
        this.events.push({
          era: era.era,
          ...ev
        });
      }
    }
  }

  // Retrieve event from SQLite using entity_id
  getVerifiedFact(entityId) {
    const row = this.db.prepare('SELECT * FROM history_dictionary WHERE entity_id = ?').get(entityId);
    return row;
  }

  // Search across keywords, title, and summary
  search(query) {
    const qLower = query.toLowerCase().trim();

    // Fast reject pure greetings, conversational chit-chat, and emotional sharing
    if (/^(hi|hello|hey|howdy|greetings|good\s+(?:morning|afternoon|evening|day)|how\s+are\s+you(?:.*)?|how(?:'s|s)\s+it\s+going|what(?:'s|s)\s+up|sup|who\s+are\s+you|what\s+can\s+you\s+do|tell\s+me\s+a\s+joke|i\s+(?:am|had|have|feel|want|need)\b)/i.test(qLower)) {
      return { found: false, message: "Conversational query; not a historical search." };
    }

    const STOP_WORDS = new Set([
      "what", "whats", "when", "where", "who", "whom", "whose", "why", "how",
      "the", "and", "was", "were", "did", "does", "done", "about", "tell",
      "times", "plus", "minus", "divided", "calculate", "solve", "with",
      "from", "that", "this", "they", "them", "their", "are", "have", "has",
      "had", "for", "out", "some", "any", "not", "but", "you", "your",
      "today", "yesterday", "tomorrow", "day", "days", "work", "time", "week",
      "month", "year", "long", "tired", "feel", "feeling", "good", "bad",
      "can", "could", "will", "would", "should", "shall", "just", "like"
    ]);

    const queryTokens = qLower
      .split(/[\s,?.!-]+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));

    // Semantic Intent Expansion only when contextually relevant
    const intentTokens = new Set([...queryTokens]);

    // Status / Life / Living intent (when asking about living/dead status of people/crew)
    if (/\b(alive|living|survive|surviving|survivor|survivors|dead|die|died|death|passed)\b/i.test(qLower) && /\b(people|person|crew|astronaut|astronauts|members|apollo)\b/i.test(qLower)) {
      intentTokens.add('status');
      intentTokens.add('surviv');
      intentTokens.add('crew');
      intentTokens.add('died');
    }

    // Procedural / Mechanics / Flight intent (only when asking about spaceflight, missions, or journeys)
    if (/\b(moon|apollo|saturn|rocket|space|spacecraft|journey|orbit|flew|fly|flown|travel)\b/i.test(qLower) && /\b(how|went|go|reach|land|landing)\b/i.test(qLower)) {
      intentTokens.add('flight');
      intentTokens.add('profile');
      intentTokens.add('landing');
      intentTokens.add('trajectory');
    }

    // People / Personnel intent
    if (/\b(people|person|persons|crew|astronaut|astronauts|men|figures|members)\b/i.test(qLower)) {
      intentTokens.add('crew');
      intentTokens.add('astronauts');
      intentTokens.add('members');
    }

    const expandedTokens = Array.from(intentTokens);

    if (expandedTokens.length === 0) {
      return {
        found: false,
        message: "No search terms provided."
      };
    }

    const scored = this.events.map(ev => {
      let score = 0;
      const titleLower = ev.title.toLowerCase();
      const summaryLower = ev.summary.toLowerCase();
      const eraLower = ev.era.toLowerCase();
      const kwList = ev.keywords.map(k => k.toLowerCase());

      for (const token of expandedTokens) {
        // Direct title match
        if (titleLower.includes(token)) score += 6;
        // Direct keyword match
        for (const kw of kwList) {
          if (kw.includes(token)) score += 5;
        }
        // Summary match
        if (summaryLower.includes(token)) score += 2;
        // Era match
        if (eraLower.includes(token)) score += 1;
      }

      // Procedural flight / mechanics specificity bonus (only if query mentions space/flight/mission/moon)
      if (/\b(flight|fly|flew|flown|travel|reach|trajectory|moon|mission|rocket|apollo|saturn)\b/i.test(qLower) && /\b(flight|profile|sequence|trajectory)\b/i.test(titleLower)) {
        score += 15;
      }

      // Life status specificity bonus (only if query mentions people/crew/astronauts)
      if (/\b(alive|living|dead|die|died|survive|surviving)\b/i.test(qLower) && /\b(astronaut|crew|people|members|apollo)\b/i.test(qLower) && /\b(status|crew|life)\b/i.test(titleLower)) {
        score += 15;
      }

      // Year matching if query has numbers
      const numMatch = qLower.match(/\b\d{3,4}\b/);
      if (numMatch) {
        const queryYear = parseInt(numMatch[0], 10);
        if (Math.abs(ev.year) === queryYear) {
          score += 8;
        }
      }

      // Require strong token coverage for multi-word queries to prevent accidental collisions (e.g. The Great Gatsby matching Great Pyramid)
      if (queryTokens.length > 1) {
        let matchedTokens = 0;
        for (const token of queryTokens) {
          if (titleLower.includes(token) || kwList.some(k => k.includes(token)) || summaryLower.includes(token)) {
            matchedTokens++;
          }
        }
        const coverage = matchedTokens / queryTokens.length;
        if (coverage < 0.6) {
          score = 0;
        }
      }

      return { event: ev, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Require a meaningful threshold (score >= 8 ensures strong title/keyword relevance)
    if (scored.length > 0 && scored[0].score >= 8) {
      const topMatch = scored[0].event;
      const verified = this.getVerifiedFact(topMatch.id);

      return {
        found: true,
        entityId: topMatch.id,
        title: topMatch.title,
        era: topMatch.era,
        year: topMatch.year,
        exactDate: verified ? verified.exact_date : null,
        verifiedFact: verified ? verified.verified_fact : topMatch.summary,
        summary: topMatch.summary,
        keywords: topMatch.keywords,
        score: scored[0].score
      };
    }

    return {
      found: false,
      message: "No historical record found for this topic."
    };
  }

  // Answer a question using the retrieved fact
  answerQuestion(query) {
    const result = this.search(query);
    if (!result.found) return result.message;

    return `[${result.era}] ${result.title} (${result.exactDate})\n• Verified Fact: ${result.verifiedFact}\n• Context: ${result.summary}`;
  }
}

// CLI usage
const arg = process.argv.slice(2).join(' ').trim();
if (arg) {
  const engine = new HistoryRAGEngine();
  const res = engine.search(arg);
  if (res.found) {
    console.log(`\n========================================================`);
    console.log(`EVENT:        ${res.title}`);
    console.log(`ERA:          ${res.era}`);
    console.log(`EXACT DATE:   ${res.exactDate}`);
    console.log(`VERIFIED FACT:${res.verifiedFact}`);
    console.log(`SUMMARY:      ${res.summary}`);
    console.log(`KEYWORDS:     ${res.keywords.join(', ')}`);
    console.log(`========================================================\n`);
  } else {
    console.log(res.message);
  }
}
