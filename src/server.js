import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dns from 'node:dns';

try {
  if (dns?.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (_) {}

import { dictionary } from './dictionary.js';
import { myDictionary } from './groq_dictionary.js';
import { tagSentence, classifyWord } from './pos_tagger.js';
import { solveArithmetic } from '../scripts/solve_math_arithmetic.js';
import { convertUnit } from './unit_converter.js';
import { extractDirectAnswer } from './answer_extractor.js';
import { formatDictionaryEntry } from './dictionary_formatter.js';
import { DictionaryQAEngine } from './dictionary_qa_engine.js';
import { getTopicWebsites, getRelatedQueries } from './topic_sources.js';
import { DisambiguationEngine } from './disambiguation_engine.js';
import { scrapeOnlineImages } from './image_scraper.js';
import { scrapeOnlineVideos } from './video_scraper.js';
import { groqQAEngine } from './groq_qa_engine.js';
import { voteQA } from './semantic_qa_cache.js';
import { turso } from './turso_client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const PORT = process.env.PORT || 3000;

const dictQA = new DictionaryQAEngine(myDictionary);
const disambigEngine = new DisambiguationEngine();

// ========================================================
// 100-LANE QUEUE SYSTEM: 100 parallel lines so nobody waits
// ========================================================
class HundredLaneQueue {
  constructor(laneCount = 100) {
    this.laneCount = laneCount;
    this.lanes = Array.from({ length: laneCount }, (_, id) => ({
      id,
      queue: [],
      active: false
    }));
    this.laneCursor = 0;
  }

  enqueue(task) {
    // Distribute incoming searches evenly across the 100 lines
    const lane = this.lanes[this.laneCursor];
    this.laneCursor = (this.laneCursor + 1) % this.laneCount;

    return new Promise((resolve, reject) => {
      lane.queue.push({ task, resolve, reject });
      this.drain(lane);
    });
  }

  async drain(lane) {
    if (lane.active) return;
    lane.active = true;

    while (lane.queue.length > 0) {
      const item = lane.queue.shift();
      try {
        const res = await item.task();
        item.resolve(res);
      } catch (err) {
        item.reject(err);
      }
    }

    lane.active = false;
  }
}

const searchQueue = new HundredLaneQueue(100);

// Helper to send JSON responses
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

// Helper to serve static files
function serveStatic(res, filePath, contentType) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

function cleanDefinition(raw) {
  if (!raw) return "";
  let main = raw;
  const dashIdx = main.indexOf(" -- ");
  if (dashIdx > 50) {
    main = main.slice(0, dashIdx).trim();
  }
  const noteIdx = main.indexOf("Note:");
  if (noteIdx > 120) {
    main = main.slice(0, noteIdx).trim();
  }
  main = main.replace(/\s+/g, " ").trim();
  return main;
}

// Core search function wrapped with topic sources
async function executeSearch(rawQuery) {
  const result = await doSearch(rawQuery);
  if (result && result.found) {
    if (result.category !== 'Math' && (!result.sources || !result.sources.length)) {
      const topic = result.sourceWord || result.details?.word || result.title || rawQuery;
      result.sources = getTopicWebsites(topic, result.category, result.details);
    }
    if (!result.related || !result.related.length) {
      result.related = getRelatedQueries(rawQuery, result.category, result.title, result.details);
    }
  }
  return result;
}

// Determines whether a query is a question, factual inquiry, or multi-word search
function isKnowledgeOrQuestionQuery(rawQuery) {
  if (!rawQuery) return false;
  const q = rawQuery.trim().toLowerCase();

  // 1. Explicit question mark
  if (q.endsWith('?')) return true;

  // 2. Starts with question word, typo, contraction, or command
  if (/^(?:what|whats|what's|wht|whts|wat|wats|who|whos|who's|whom|where|wheres|where's|wer|when|whens|when's|wen|why|whys|why's|wy|how|hows|how's|hw|which|whch|is|are|am|was|were|can|could|will|would|shall|should|may|might|must|do|does|did|has|have|had|tell me|give me|explain|describe|show me|find me)\b/i.test(q)) {
    return true;
  }

  // 3. Superlatives and informational inquiries
  if (/\b(?:biggest|largest|smallest|tallest|shortest|fastest|slowest|highest|lowest|deepest|oldest|youngest|hottest|coldest|richest|first|last|most|least)\b/i.test(q)) {
    return true;
  }

  // 4. Inquiries with "in the world", "on earth", "in space", "in the universe"
  if (/\b(?:in the world|in history|on earth|in space|in the universe|of the world|of all time)\b/i.test(q)) {
    return true;
  }

  // 5. Inquiries about physical constants, metrics, locations, capitals
  if (/\b(?:speed of|distance to|distance from|distance between|diameter of|mass of|radius of|temperature of|boiling point|melting point|capital of|population of|currency of|president of|prime minister of|ceo of|founder of|creator of|cause of|effect of)\b/i.test(q)) {
    return true;
  }

  // 6. Explicit "define / definition / meaning" is NOT a general QA question (it's dictionary)
  if (/^(?:define|definition of|meaning of)\s+/i.test(q)) {
    return false;
  }

  // 7. Multi-word queries with 4 or more words (e.g. "how long do turtles live", "animals that lay eggs")
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length >= 4) {
    return true;
  }

  return false;
}

// Pure Search Engine Core
async function doSearch(rawQuery) {
  const query = (rawQuery || '').trim();
  if (!query) {
    return {
      found: false,
      query: '',
      message: 'Please enter a search query.'
    };
  }

  const lower = query.toLowerCase();

  // 1. Math Calculation (Arithmetic & Algebraic expressions)
  const mathRes = solveArithmetic(query);
  if (mathRes.success) {
    return {
      found: true,
      query,
      category: 'Math',
      title: `${mathRes.expression} = ${mathRes.answer}`,
      snippet: `Calculated ${mathRes.operation} using ${mathRes.pattern}.`,
      details: {
        expression: mathRes.expression,
        answer: mathRes.answer,
        operation: mathRes.operation,
        pattern: mathRes.pattern,
        workingOut: mathRes.derivation
      }
    };
  }

  // 1.5 Unit & Currency Conversion (Zero-Token Deterministic Engine)
  const convRes = convertUnit(query);
  if (convRes && convRes.found) {
    return convRes;
  }

  // 2. Direct Question Answering & Knowledge Synthesis (Turso Cloud QA Cache + Groq)
  if (isKnowledgeOrQuestionQuery(query)) {
    // Primary: Semantic Turso Cloud QA Cache + Groq (Answers questions with rich 1-paragraph explanations)
    const groqQARes = await groqQAEngine.answerQuestion(query);
    if (groqQARes && groqQARes.found) {
      groqQARes.sources = getTopicWebsites(query, groqQARes.category, groqQARes.details);
      return groqQARes;
    }

    // Secondary Fallback: Local Dictionary attribute verification (e.g. "is banana red")
    const isWhyOrComplex = /^(?:why\b|how\b|what\s+causes?|what\s+makes?)/i.test(query.trim());
    if (!isWhyOrComplex) {
      const qaRes = dictQA.answerQuestion(query);
      if (qaRes && qaRes.found) {
        return {
          found: true,
          query,
          category: 'Direct QA',
          title: qaRes.directAnswer,
          directAnswer: qaRes.directAnswer,
          matchedSentence: qaRes.matchedSentence,
          sourceWord: qaRes.sourceWord,
          extraInfo: qaRes.extraInfo,
          fullExplanation: qaRes.fullExplanation,
          usage: qaRes.usage,
          snippet: qaRes.directAnswer,
          details: {
            directAnswer: qaRes.directAnswer,
            matchedSentence: qaRes.matchedSentence,
            sourceWord: qaRes.sourceWord,
            extraInfo: qaRes.extraInfo,
            fullExplanation: qaRes.fullExplanation,
            usage: qaRes.usage
          }
        };
      }
    }
  }

  // 3. Local Disambiguation Engine (100% OFFLINE, ZERO Groq):
  // Handles multi-meaning queries where user specifies a sense descriptor or qualifier
  // (e.g. "movie madagascar", "movie madacasgar", "island madagascar", "apple company", "python snake")
  const disambigRes = disambigEngine.resolveQuery(query);
  if (disambigRes && disambigRes.found) {
    return disambigRes;
  }

  // 4. Explicit Grammar & Part of Speech Tagging ("tag: ...", "pos: ...", "syntax: ...")
  const tagMatch = query.match(/^(?:tag|pos|grammar|syntax|analyze):\s*(.+)$/i);
  if (tagMatch) {
    const sentenceToTag = tagMatch[1].trim();
    const tagResult = tagSentence(sentenceToTag);
    const taggedTokens = tagResult.tagged || [];

    if (taggedTokens.length > 0) {
      const formula = taggedTokens.map(t => `${t.word} [${t.tag}]`).join(' ');
      const verbs = taggedTokens.filter(t => t.tag === 'VERB').map(t => t.word);
      const nouns = taggedTokens.filter(t => t.tag === 'NOUN').map(t => t.word);
      const adjectives = taggedTokens.filter(t => t.tag === 'ADJ').map(t => t.word);
      const adverbs = taggedTokens.filter(t => t.tag === 'ADV').map(t => t.word);

      return {
        found: true,
        query,
        category: 'Grammar & Syntax',
        title: sentenceToTag,
        subtitle: `Formula: ${formula}`,
        snippet: `Parts of speech: ${nouns.length} nouns, ${verbs.length} verbs, ${adjectives.length} adjectives, ${adverbs.length} adverbs.`,
        details: {
          tokens: taggedTokens,
          posFormula: formula,
          verbs,
          nouns,
          adjectives,
          adverbs
        }
      };
    }
  }

  // 4. Dictionary, Book, Song, & Reference Lookup (Local DB + On-demand Groq synthesis)
  const defMatch = query.match(/^(?:define|definition of|what is the definition of|what does|meaning of|lookup|what is an?|what is|what are)\s+(.+?)(?:\s+mean)?\??$/i);
  const termToLookup = defMatch ? defMatch[1].trim() : query.trim();

  if (termToLookup) {
    const dictRes = await myDictionary.lookup(termToLookup);

    if (dictRes && dictRes.found) {
      const cleanTitle = termToLookup.charAt(0).toUpperCase() + termToLookup.slice(1);

      // Check if term has alternate disambiguation senses
      const senses = disambigEngine.getSenses(termToLookup);
      let alternates = null;
      if (senses && senses.length > 1) {
        alternates = senses.map(s => ({
          title: s.title,
          sense: s.sense_key,
          suggestedQuery: `${s.sense_key} ${termToLookup}`
        }));
      }

      return {
        found: true,
        query,
        category: 'Dictionary',
        title: cleanTitle,
        heading: dictRes.heading,
        explanation: dictRes.explanation,
        usage: dictRes.usage,
        raw_entry: dictRes.raw_entry,
        snippet: dictRes.explanation,
        alternates,
        details: {
          word: dictRes.word,
          heading: dictRes.heading,
          explanation: dictRes.explanation,
          usage: dictRes.usage,
          raw_entry: dictRes.raw_entry
        }
      };
    } else if (dictRes && dictRes.suggestion) {
      // If it has multiple words and wasn't in dictionary, attempt Groq QA synthesis before giving up
      if (query.trim().split(/\s+/).length >= 2) {
        const fallbackQARes = await groqQAEngine.answerQuestion(query);
        if (fallbackQARes && fallbackQARes.found && fallbackQARes.directAnswer && !fallbackQARes.details?.storageLimitReached) {
          fallbackQARes.sources = getTopicWebsites(query, fallbackQARes.category, fallbackQARes.details);
          return fallbackQARes;
        }
      }

      return {
        found: false,
        query,
        message: dictRes.message || `No valid definition found for "${termToLookup}".`,
        suggestion: dictRes.suggestion
      };
    }
  }

  // Safety Net: If dictionary lookup failed or skipped on a multi-word phrase, try Groq QA synthesis
  if (query.trim().split(/\s+/).length >= 2) {
    const fallbackQARes = await groqQAEngine.answerQuestion(query);
    if (fallbackQARes && fallbackQARes.found && fallbackQARes.directAnswer && !fallbackQARes.details?.storageLimitReached) {
      fallbackQARes.sources = getTopicWebsites(query, fallbackQARes.category, fallbackQARes.details);
      return fallbackQARes;
    }
  }

  // Fallback: If nothing matched, suggest related terms
  return {
    found: false,
    query,
    message: `No results found for "${query}".`,
    suggestions: [
      'Search for historical events (e.g. "Apollo 11", "D-Day", "Magna Carta")',
      'Search for scientific discoveries (e.g. "Higgs Boson", "DNA Structure", "Penicillin")',
      'Perform pure math calculations (e.g. "1284 * 492", "748290 + 251710")',
      'Look up words (e.g. "define serendipity", "entropy")',
      'Analyze sentence syntax (e.g. "tag: The scientist discovered a new star")'
    ]
  };
}

// HTTP Server
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // GET /api/search?q=...
  if (url.pathname === '/api/search' && req.method === 'GET') {
    const q = url.searchParams.get('q') || '';
    searchQueue.enqueue(() => executeSearch(q)).then(result => {
      sendJson(res, 200, result);
    }).catch(err => {
      sendJson(res, 500, { error: err.message });
    });
    return;
  }

  // GET /api/suggest?q=...
  if (url.pathname === '/api/suggest' && req.method === 'GET') {
    const q = (url.searchParams.get('q') || '').trim();
    const suggestions = myDictionary.getSuggestions(q, 6);
    sendJson(res, 200, { query: q, suggestions });
    return;
  }

  // GET /api/images?q=...
  if (url.pathname === '/api/images' && req.method === 'GET') {
    const q = url.searchParams.get('q') || '';
    searchQueue.enqueue(() => scrapeOnlineImages(q)).then(result => {
      sendJson(res, 200, result);
    }).catch(err => {
      sendJson(res, 500, { error: err.message });
    });
    return;
  }

  // POST /api/images
  if (url.pathname === '/api/images' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const q = parsed.query || parsed.q || '';
        searchQueue.enqueue(() => scrapeOnlineImages(q)).then(result => {
          sendJson(res, 200, result);
        }).catch(err => {
          sendJson(res, 500, { error: err.message });
        });
      } catch (e) {
        sendJson(res, 400, { error: 'Invalid JSON request' });
      }
    });
    return;
  }

  // GET /api/videos?q=...
  if (url.pathname === '/api/videos' && req.method === 'GET') {
    const q = url.searchParams.get('q') || '';
    searchQueue.enqueue(() => scrapeOnlineVideos(q)).then(result => {
      sendJson(res, 200, result);
    }).catch(err => {
      sendJson(res, 500, { error: err.message });
    });
    return;
  }

  // POST /api/videos
  if (url.pathname === '/api/videos' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const q = parsed.query || parsed.q || '';
        searchQueue.enqueue(() => scrapeOnlineVideos(q)).then(result => {
          sendJson(res, 200, result);
        }).catch(err => {
          sendJson(res, 500, { error: err.message });
        });
      } catch (e) {
        sendJson(res, 400, { error: 'Invalid JSON request' });
      }
    });
    return;
  }

  // POST /api/qa/vote (Thumbs up / Thumbs down feedback for quality control)
  if (url.pathname === '/api/qa/vote' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const id = parsed.id;
        const vote = parsed.vote;
        if (!id || !['up', 'down'].includes(vote)) {
          return sendJson(res, 400, { error: 'Invalid id or vote (must be up or down)' });
        }
        const result = await voteQA(id, vote, turso);
        sendJson(res, 200, result);
      } catch (err) {
        sendJson(res, 500, { error: err.message });
      }
    });
    return;
  }

  // POST /api/search (supports JSON body { query: "..." })
  if (url.pathname === '/api/search' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const q = parsed.query || parsed.message || parsed.q || '';
        searchQueue.enqueue(() => executeSearch(q)).then(result => {
          sendJson(res, 200, result);
        }).catch(err => {
          sendJson(res, 500, { error: err.message });
        });
      } catch (e) {
        sendJson(res, 400, { error: 'Invalid JSON request' });
      }
    });
    return;
  }

  // Static Assets
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return serveStatic(res, path.join(PUBLIC_DIR, 'index.html'), 'text/html; charset=utf-8');
  }
  if (url.pathname === '/styles.css') {
    return serveStatic(res, path.join(PUBLIC_DIR, 'styles.css'), 'text/css');
  }
  if (url.pathname === '/app.js') {
    return serveStatic(res, path.join(PUBLIC_DIR, 'app.js'), 'application/javascript');
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`========================================================`);
  console.log(`   TRIANGLE SEARCH ENGINE ONLINE                       `);
  console.log(`   URL: http://0.0.0.0:${PORT}                         `);
  console.log(`========================================================`);
});
