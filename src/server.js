import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { dictionary } from './dictionary.js';
import { myDictionary } from './groq_dictionary.js';
import { tagSentence, classifyWord } from './pos_tagger.js';
import { HistoryRAGEngine } from '../scripts/history_rag_engine.js';
import { solveArithmetic } from '../scripts/solve_math_arithmetic.js';
import { extractDirectAnswer } from './answer_extractor.js';
import { formatDictionaryEntry } from './dictionary_formatter.js';
import { DictionaryQAEngine } from './dictionary_qa_engine.js';
import { getTopicWebsites } from './topic_sources.js';

// Global Crash Guards: Catch errors so the server never crashes
process.on('uncaughtException', (err) => {
  console.error('[CRASH GUARD] Caught uncaughtException:', err?.stack || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[CRASH GUARD] Caught unhandledRejection:', reason);
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const PORT = process.env.PORT || 3000;

const historyEngine = new HistoryRAGEngine();
const dictQA = new DictionaryQAEngine();

// Zero-RAM Static File Streamer: Streams straight from disk to network without loading into memory
function streamStaticFile(req, res, filePath, contentType) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const etag = `"${stats.size}-${stats.mtimeMs}"`;
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304);
      return res.end();
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'ETag': etag,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on('error', () => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  });
}

// Helper to send standard JSON
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(data));
}

// Search Handler
async function executeSearch(rawQuery) {
  const query = (rawQuery || '').trim();
  if (!query) {
    return {
      found: false,
      query: '',
      message: 'Please enter a search query.'
    };
  }

  const result = await doSearch(query);
  if (result && result.found && result.category !== 'Math') {
    const topic = result.sourceWord || result.details?.word || result.title || query;
    result.sources = getTopicWebsites(topic, result.category, result.details);
  }
  return result;
}

// Search Logic
async function doSearch(query) {
  const lower = query.toLowerCase();

  // 1. Math Calculation
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

  // 2. Direct Question Answering from Dictionary (Pure local, ZERO Groq)
  const isQuestionQuery = /^(?:where|what|who|when|how|which|why|is|are|can|does|do)\b/i.test(query) || query.endsWith('?');
  if (isQuestionQuery) {
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

  // 3. Dictionary / Vocabulary Query
  const defMatch = lower.match(/^(?:define|definition of|what is the definition of|what does|meaning of|lookup|what is an?|what is|what are)\s+([a-zA-Z\-]+)(?:\s+mean)?\??$/i);
  const words = query.split(/\s+/);
  const singleWord = words.length === 1 && /^[a-zA-Z\-]+$/.test(query);
  const articleWord = words.length === 2 && /^(?:the|a|an)\s+([a-zA-Z\-]+)$/i.test(query);

  if (defMatch || singleWord || articleWord) {
    const word = defMatch ? defMatch[1] : (articleWord ? words[1] : query);
    const dictRes = await myDictionary.lookup(word);

    if (dictRes.found) {
      return {
        found: true,
        query,
        category: 'Dictionary',
        title: word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
        heading: dictRes.heading,
        explanation: dictRes.explanation,
        usage: dictRes.usage,
        raw_entry: dictRes.raw_entry,
        snippet: dictRes.explanation,
        details: {
          word: dictRes.word,
          heading: dictRes.heading,
          explanation: dictRes.explanation,
          usage: dictRes.usage,
          raw_entry: dictRes.raw_entry
        }
      };
    } else {
      return {
        found: false,
        query,
        message: dictRes.message || `No valid definition found for "${word}".`,
        suggestion: dictRes.suggestion || null
      };
    }
  }

  // 4. Grammar & Part of Speech Tagging
  const tagMatch = query.match(/^(?:tag|pos|grammar|syntax|analyze):\s*(.+)$/i);
  if (tagMatch || (words.length >= 4 && !isQuestionQuery)) {
    const sentenceToTag = tagMatch ? tagMatch[1] : query;
    const tagResult = tagSentence(sentenceToTag);

    if (tagResult.tokens.length > 0) {
      const formula = tagResult.tokens.map(t => `${t.word} [${t.pos}]`).join(' ');
      const verbs = tagResult.tokens.filter(t => t.pos === 'VERB').map(t => t.word);
      const nouns = tagResult.tokens.filter(t => t.pos === 'NOUN').map(t => t.word);
      const adjectives = tagResult.tokens.filter(t => t.pos === 'ADJ').map(t => t.word);
      const adverbs = tagResult.tokens.filter(t => t.pos === 'ADV').map(t => t.word);

      return {
        found: true,
        query,
        category: 'Grammar & Syntax',
        title: sentenceToTag,
        subtitle: `Formula: ${formula}`,
        snippet: `Parts of speech: ${nouns.length} nouns, ${verbs.length} verbs, ${adjectives.length} adjectives, ${adverbs.length} adverbs.`,
        details: {
          tokens: tagResult.tokens,
          posFormula: formula,
          verbs,
          nouns,
          adjectives,
          adverbs
        }
      };
    }
  }

  // 5. Historical & Scientific Fact Search
  const ragResult = historyEngine.search(query);
  if (ragResult && ragResult.found && (ragResult.score >= 5 || ragResult.verifiedFact)) {
    const factText = ragResult.verifiedFact || ragResult.summary || '';
    const direct = extractDirectAnswer(query, factText);
    return {
      found: true,
      query,
      category: 'Knowledge Card',
      title: ragResult.title,
      subtitle: `${ragResult.era} (${ragResult.year})`,
      snippet: ragResult.summary || factText,
      directAnswer: direct,
      details: {
        era: ragResult.era,
        year: ragResult.year,
        keywords: ragResult.keywords,
        fullFact: factText
      }
    };
  }

  // Fallback
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

// Lightweight HTTP Server
const server = http.createServer((req, res) => {
  // Connection timeout protection
  req.setTimeout(10000, () => {
    if (!res.headersSent) {
      res.writeHead(504, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Gateway timeout' }));
    }
    req.destroy();
  });

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

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
    executeSearch(q).then(result => {
      sendJson(res, 200, result);
    }).catch(err => {
      console.error('[API ERROR]:', err);
      sendJson(res, 500, { error: 'Internal server error' });
    });
    return;
  }

  // POST /api/search
  if (url.pathname === '/api/search' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 64 * 1024) req.destroy();
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const q = parsed.query || parsed.message || parsed.q || '';
        executeSearch(q).then(result => {
          sendJson(res, 200, result);
        }).catch(err => {
          sendJson(res, 500, { error: 'Internal server error' });
        });
      } catch (e) {
        sendJson(res, 400, { error: 'Invalid JSON request' });
      }
    });
    return;
  }

  // Static Assets (Streamed directly from disk, ZERO RAM footprint)
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return streamStaticFile(req, res, path.join(PUBLIC_DIR, 'index.html'), 'text/html; charset=utf-8');
  }
  if (url.pathname === '/styles.css') {
    return streamStaticFile(req, res, path.join(PUBLIC_DIR, 'styles.css'), 'text/css');
  }
  if (url.pathname === '/app.js') {
    return streamStaticFile(req, res, path.join(PUBLIC_DIR, 'app.js'), 'application/javascript');
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

server.listen(PORT, () => {
  console.log(`========================================================`);
  console.log(`   TRIANGLE SEARCH ENGINE ONLINE (LEAN ZERO-RAM MODE)   `);
  console.log(`   URL: http://localhost:${PORT}                        `);
  console.log(`========================================================`);
});
