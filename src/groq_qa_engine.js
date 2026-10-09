// Groq QA Engine: Generates rich factual answers (at least 1 full paragraph)
// and caches them semantically in Turso Cloud

import { turso } from './turso_client.js';
import { lookupSemanticQA, saveSemanticQA, normalizeQuestionToCanonicalKey, isCacheLimitReached, MAX_QA_CACHE_LIMIT } from './semantic_qa_cache.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let GROQ_API_KEY = process.env.GROQ_API_KEY || '';
if (!GROQ_API_KEY) {
  try {
    const envFile = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, 'utf-8');
      const m = content.match(/GROQ_API_KEY=([^\r\n]+)/);
      if (m) GROQ_API_KEY = m[1].trim();
    }
  } catch (_) {}
}

const MODELS = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

export class GroqQAEngine {
  constructor() {
    this.inFlight = new Map();
  }

  /**
   * Main entry point: Check Turso cache first, otherwise query Groq and cache.
   */
  async answerQuestion(question) {
    const cleanQ = (question || '').trim();
    if (!cleanQ) return null;

    // 1. Check Turso Cloud QA Cache first (Semantic match)
    const cached = await lookupSemanticQA(cleanQ, turso);
    if (cached) {
      return {
        found: true,
        id: cached.id,
        query: cleanQ,
        category: cached.category || 'Knowledge',
        title: cached.directAnswer,
        directAnswer: cached.directAnswer,
        fullExplanation: cached.fullExplanation,
        snippet: cached.directAnswer,
        details: {
          directAnswer: cached.directAnswer,
          fullExplanation: cached.fullExplanation,
          canonicalKey: cached.canonicalKey,
          upvotes: cached.upvotes,
          downvotes: cached.downvotes,
          accessCount: cached.accessCount,
          cachedFromTurso: true
        }
      };
    }

    // 2. Storage Guard: If database reached the limit, stop generating new questions!
    const limitReached = await isCacheLimitReached(turso);
    if (limitReached) {
      console.warn(`[STORAGE LIMIT] Reached maximum allowed questions (${MAX_QA_CACHE_LIMIT}). Generation stopped.`);
      return {
        found: true,
        query: cleanQ,
        category: 'Storage Limit',
        title: '**The knowledge database has reached its maximum storage capacity limit.**',
        directAnswer: '**The knowledge database has reached its maximum storage capacity limit.**',
        fullExplanation: `The search engine has safely stored the maximum allowed quota of ${MAX_QA_CACHE_LIMIT.toLocaleString()} questions. New background generation has stopped to protect your free-tier storage, while all existing cached answers continue to be served instantly.`,
        snippet: 'Storage capacity limit reached.',
        details: {
          storageLimitReached: true,
          maxLimit: MAX_QA_CACHE_LIMIT,
          cachedFromTurso: false
        }
      };
    }

    // Single-flight coalescing to prevent duplicate simultaneous Groq calls
    const canonicalKey = normalizeQuestionToCanonicalKey(cleanQ);
    if (this.inFlight.has(canonicalKey)) {
      return await this.inFlight.get(canonicalKey);
    }

    const fetchPromise = this._fetchFromGroqAndSave(cleanQ);
    this.inFlight.set(canonicalKey, fetchPromise);

    try {
      return await fetchPromise;
    } finally {
      this.inFlight.delete(canonicalKey);
    }
  }

  async _fetchFromGroqAndSave(question) {
    const prompt = `You are an authoritative encyclopedic knowledge search engine. Answer the question: "${question}".

Strict Formatting Requirements:
1. Provide an answer of EXACTLY 4 sentences in total.
2. Sentence 1 MUST be the direct, bold answer.
3. The remaining 3 sentences MUST provide clear, factual context and mechanics underneath.
4. Absolutely no conversational filler, chatbot greetings, or intros (no "Sure", "Here is", "Certainly").

Format EXACTLY:
Direct Answer:
**[Sentence 1: The bold direct answer]**

Explanation:
[Sentences 2, 3, and 4: Exactly 3 sentences of concise factual context and explanation]

Category:
[e.g. Science, Geography, History, Technology, General Knowledge]`;

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
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 350
          })
        });

        if (!res.ok) continue;

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (!content) continue;

        const parsed = this._parseQAContent(content, question);
        if (!parsed) continue;

        // Ensure both direct answer and 3-sentence explanation are present
        if (parsed.fullExplanation.length < 50 || parsed.directAnswer.length < 15) {
          continue; // Try next model if response was too sparse
        }

        // Save to Turso Cloud QA Cache
        await saveSemanticQA({
          question,
          directAnswer: parsed.directAnswer,
          fullExplanation: parsed.fullExplanation,
          category: parsed.category
        }, turso);

        // Fetch freshly saved row to get row id for feedback voting
        const saved = await lookupSemanticQA(question, turso);

        return {
          found: true,
          id: saved?.id || null,
          query: question,
          category: parsed.category,
          title: parsed.directAnswer,
          directAnswer: parsed.directAnswer,
          fullExplanation: parsed.fullExplanation,
          snippet: parsed.directAnswer,
          details: {
            directAnswer: parsed.directAnswer,
            fullExplanation: parsed.fullExplanation,
            upvotes: saved?.upvotes || 1,
            downvotes: saved?.downvotes || 0,
            cachedFromTurso: false
          }
        };
      } catch (err) {
        console.error(`Error querying Groq model ${model} for QA:`, err.message);
      }
    }

    return null;
  }

  _parseQAContent(content, question) {
    let directAnswer = '';
    let fullExplanation = '';
    let category = 'Knowledge';

    const directMatch = content.match(/Direct Answer:\s*([\s\S]*?)(?=(?:\n\s*Explanation:|$))/i);
    if (directMatch) directAnswer = directMatch[1].trim();

    const explMatch = content.match(/Explanation:\s*([\s\S]*?)(?=(?:\n\s*Category:|$))/i);
    if (explMatch) fullExplanation = explMatch[1].trim();

    const catMatch = content.match(/Category:\s*([\s\S]*?)$/i);
    if (catMatch) category = catMatch[1].trim();

    // Fallbacks if formatting deviated slightly
    if (!directAnswer && !fullExplanation) {
      const parts = content.split('\n\n').filter(p => p.trim().length > 0);
      if (parts.length >= 2) {
        directAnswer = parts[0].trim();
        fullExplanation = parts.slice(1).join('\n\n').trim();
      } else {
        directAnswer = content;
        fullExplanation = content;
      }
    } else if (!fullExplanation && directAnswer) {
      fullExplanation = directAnswer;
    }

    return {
      directAnswer: directAnswer.replace(/^Direct Answer:\s*/i, '').trim(),
      fullExplanation: fullExplanation.replace(/^Explanation:\s*/i, '').trim(),
      category: category.replace(/^Category:\s*/i, '').trim() || 'Knowledge'
    };
  }
}

export const groqQAEngine = new GroqQAEngine();
