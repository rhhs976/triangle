// Cloudflare Pages Function: /api/search
// 100% Serverless Edge Search with Turso Cloud, Semantic QA Cache & Groq

import { createClient } from '@libsql/client/web';

const TURSO_URL = 'libsql://triangle-search-triangle-search.aws-ap-southeast-2.turso.io';
const TURSO_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE0ODgyOTQsImlkIjoiMDFhMTFjZmYtYWMwMS03NjZjLThjZjUtYmVhYTM4NWQxNTQ2Iiwia2lkIjoiRUdaeGxicFhLdUpjem85RkVBcFBhVVN5ems2a0dVcTlxc3NfNzlqd1dUVSIsInJpZCI6ImE0NTBlMTAxLTZhNTUtNDc3Zi05MjI0LWEwZWNlOTQxODc5NiJ9.ew0u8RMGKOfAhrMIaCoPFtT9XlhCCYnnPsB3Bbyqm07srFgnT9yaajEM8TAk8rMS07CuqJSK6PpVea9QOJLZAA';


const STOP_WORDS = new Set([
  'what', 'whats', 'what\'s', 'is', 'the', 'of', 'in', 'a', 'an', 'are', 'was', 'were',
  'tell', 'me', 'who', 'whos', 'who\'s', 'where', 'wheres', 'where\'s', 'when', 'whens',
  'how', 'why', 'can', 'you', 'give', 'do', 'does', 'did', 'about', 'and', 'or', 'for',
  'to', 'from', 'with', 'by', 'at', 'on', 'know', 'please', 'explain', 'describe', 'city', 'country'
]);

function getTursoClient(env) {
  return createClient({
    url: env?.TURSO_DATABASE_URL || TURSO_URL,
    authToken: env?.TURSO_AUTH_TOKEN || TURSO_AUTH_TOKEN
  });
}

const COMMON_TYPOS = {
  'te': 'the', 'th': 'the', 'da': 'the', 'wht': 'what', 'wat': 'what',
  'hw': 'how', 'whos': 'who', 'whm': 'whom', 'wer': 'where', 'wen': 'when',
  'wy': 'why', 'answr': 'answer', 'curent': 'current', 'currnt': 'current',
  'pres': 'president', 'prez': 'president', 'minstr': 'minister', 'ti': 'it',
  'nd': 'and', 'ot': 'to', 'fro': 'from', 'abt': 'about', 'whch': 'which'
};

const TEMPORAL_MARKERS = [
  'current', 'currently', 'now', 'today', 'latest', 'recent', 'present',
  'president', 'prime minister', 'ceo', 'chancellor', 'leader', 'governor', 'mayor',
  'monarch', 'king', 'queen', 'pope', 'senator', 'vice president', 'premier',
  'champion', 'winner', 'reigning', 'titleholder', 'capital', 'population'
];

function normalizeToCanonicalKey(str) {
  if (!str) return '';
  const cleaned = str.toLowerCase().replace(/'s\b/g, '').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = cleaned.split(' ')
    .map(w => w.trim())
    .map(w => COMMON_TYPOS[w] || w)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
  return Array.from(new Set(words)).sort().join(' ');
}

function extractTargetEntity(raw) {
  const cleaned = (raw || '').toLowerCase().replace(/'s\b/g, '').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = cleaned.split(' ').map(w => COMMON_TYPOS[w] || w);
  const normalized = tokens.join(' ');
  const stripped = normalized
    .replace(/^(who|what|where|when|which|how|tell me about|do you know)\s+(is|was|are|were)?\s*(the)?\s*/i, '')
    .replace(/\b(current|currently|present|now|latest|today)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped || normalized;
}

function splitSentences(text) {
  if (!text) return [];
  const protectedText = text
    .replace(/\b([A-Z])\.\s+/g, '$1___DOT___ ')
    .replace(/\b(U\.S\.|e\.g\.|i\.e\.|vs\.|Dr\.|Mr\.|Mrs\.|Ms\.)/gi, m => m.replace(/\./g, '___DOT___'));

  const rawSentences = protectedText.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [protectedText];
  return rawSentences.map(s => s.replace(/___DOT___/g, '.').trim()).filter(Boolean);
}

function isEligibleForLiveProbe(rawQuery) {
  const q = (rawQuery || '').trim().toLowerCase();
  if (/^(?:is|are|can|could|do|does|did|will|would|should|has|have|am|why|how)\b/i.test(q)) {
    return false;
  }
  const hasMarker = TEMPORAL_MARKERS.some(m => q.includes(m));
  if (hasMarker) return true;
  if (/^(?:who\s+(?:is|was)|what\s+is\s+the\s+(?:capital|population|currency|gdp|height|age|birthday|net\s*worth)\s+of)\b/i.test(q)) {
    return true;
  }
  return false;
}

async function probeLiveKnowledge(rawQuery) {
  const cleanQ = (rawQuery || '').trim();
  if (!cleanQ) return null;

  if (!isEligibleForLiveProbe(cleanQ)) return null;

  const entity = extractTargetEntity(cleanQ);
  if (!entity || entity.length < 3) return null;

  // 1. DuckDuckGo Instant Knowledge API
  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(entity)}&format=json&no_html=1&skip_disambig=1`;
    const ddgRes = await fetch(ddgUrl, {
      headers: { 'User-Agent': 'TriangleSearch/1.0 (https://github.com/rhhs976/triangle)' },
      signal: AbortSignal.timeout(1800)
    });

    if (ddgRes.ok) {
      const data = await ddgRes.json();
      if (data && data.AbstractText && data.AbstractText.length > 40) {
        return formatEncyclopedicAnswer(cleanQ, data.Heading || entity, data.AbstractText, 'Knowledge Graph');
      }
    }
  } catch (_) {}

  // 2. Wikipedia Cirrus Search + Summary API
  try {
    const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(entity)}&srlimit=3&format=json`;
    const searchRes = await fetch(wikiSearchUrl, {
      headers: { 'User-Agent': 'TriangleSearch/1.0 (contact@triangle.org)' },
      signal: AbortSignal.timeout(1800)
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const topHit = searchData.query?.search?.[0];
      if (topHit && topHit.title) {
        const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topHit.title.replace(/ /g, '_'))}`;
        const sumRes = await fetch(sumUrl, {
          headers: { 'User-Agent': 'TriangleSearch/1.0 (contact@triangle.org)' },
          signal: AbortSignal.timeout(1800)
        });

        if (sumRes.ok) {
          const sumData = await sumRes.json();
          if (sumData && sumData.extract && sumData.type !== 'disambiguation' && sumData.extract.length > 40) {
            return formatEncyclopedicAnswer(
              cleanQ,
              sumData.title,
              sumData.extract,
              sumData.description || 'Knowledge Graph'
            );
          }
        }
      }
    }
  } catch (_) {}

  return null;
}

function formatEncyclopedicAnswer(query, title, text, category) {
  const sentences = splitSentences(text);
  if (!sentences.length) return null;

  const isWho = /\b(who|whose|whom)\b/i.test(query);
  let directIdx = 0;

  if (isWho) {
    for (let i = 0; i < sentences.length; i++) {
      if (/(?:incumbent|took office|assumed office|served as|is an? \w+ (?:business executive|politician|statesman|leader)|succeeding)/i.test(sentences[i])) {
        directIdx = i;
        break;
      }
    }
  } else {
    for (let i = 0; i < sentences.length; i++) {
      if (/(?:capital|located|headquarters|founded|defined as|refers to)/i.test(sentences[i])) {
        directIdx = i;
        break;
      }
    }
  }

  const directSentence = sentences[directIdx];
  const explanationSentences = sentences.filter((_, idx) => idx !== directIdx).slice(0, 3);
  const fullExplanation = explanationSentences.join(' ') || `${title} is documented in verified public records.`;
  const isTemporal = TEMPORAL_MARKERS.some(m => (query || '').toLowerCase().includes(m));

  return {
    found: true,
    title: directSentence,
    directAnswer: `**${directSentence}**`,
    fullExplanation: fullExplanation,
    category: category || 'Knowledge Graph',
    isTemporal: isTemporal ? 1 : 0,
    tokensUsed: 0
  };
}

function solveArithmetic(input) {
  try {
    const clean = input.trim().replace(/^calculate\s+/i, '').replace(/[\s=]+$/g, '');
    if (/^[\d\s+\-*/^().]+$/.test(clean) && /[+\-*/^]/.test(clean)) {
      const sanitized = clean.replace(/\^/g, '**');
      const val = Function(`"use strict"; return (${sanitized});`)();
      if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
        return { success: true, expression: clean, answer: String(val) };
      }
    }
  } catch (_) {}
  return { success: false };
}

function getWebsites(topic) {
  const clean = encodeURIComponent(topic.trim());
  return [
    {
      siteName: 'Wikipedia',
      domain: 'en.wikipedia.org',
      url: `https://en.wikipedia.org/wiki/${clean}`,
      logo: 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
      title: `${topic} — Wikipedia`,
      description: `Comprehensive encyclopedia overview, history, and verified details for ${topic}.`
    },
    {
      siteName: 'Encyclopædia Britannica',
      domain: 'britannica.com',
      url: `https://www.britannica.com/topic/${clean}`,
      logo: 'https://www.britannica.com/favicon.ico',
      title: `${topic} | Definition & Facts`,
      description: `Authoritative analysis from Encyclopædia Britannica editors on ${topic}.`
    }
  ];
}

const LENGTH_FACTORS = {
  m: 1, meter: 1, meters: 1, km: 1000, kilometer: 1000, kilometers: 1000,
  cm: 0.01, centimeter: 0.01, centimeters: 0.01, mm: 0.001, millimeter: 0.001, millimeters: 0.001,
  mi: 1609.344, mile: 1609.344, miles: 1609.344, yd: 0.9144, yard: 0.9144, yards: 0.9144,
  ft: 0.3048, foot: 0.3048, feet: 0.3048, in: 0.0254, inch: 0.0254, inches: 0.0254
};
const MASS_FACTORS = {
  kg: 1, kilogram: 1, kilograms: 1, g: 0.001, gram: 0.001, grams: 0.001,
  lb: 0.45359237, lbs: 0.45359237, pound: 0.45359237, pounds: 0.45359237,
  oz: 0.028349523125, ounce: 0.028349523125, ounces: 0.028349523125,
  ton: 907.18474, tons: 907.18474
};
const SPEED_FACTORS = {
  'm/s': 1, 'km/h': 0.27777777777778, 'kph': 0.27777777777778, 'mph': 0.44704, 'knot': 0.514444, 'knots': 0.514444
};
const VOLUME_FACTORS = {
  l: 1, liter: 1, liters: 1, ml: 0.001, milliliter: 0.001, milliliters: 0.001,
  gal: 3.785411784, gallon: 3.785411784, gallons: 3.785411784, cup: 0.2365882365, cups: 0.2365882365
};
const DATA_FACTORS = {
  b: 1, byte: 1, bytes: 1, kb: 1024, mb: 1024*1024, gb: 1024*1024*1024, tb: 1024*1024*1024*1024
};
const CURRENCY_RATES = {
  usd: 1.0, eur: 0.92, gbp: 0.78, jpy: 153.2, aud: 1.52, cad: 1.38, nzd: 1.66, chf: 0.88, cny: 7.23, inr: 83.9
};

function formatNum(n) {
  if (Math.abs(n) >= 1000) return Number(n.toFixed(2)).toLocaleString();
  return Number(n.toFixed(4)).toString();
}

function convertUnit(rawQuery) {
  if (!rawQuery) return null;
  const q = rawQuery.toLowerCase().trim();

  // Pattern A: "X ft Y in to cm"
  const comp = q.match(/^(\d+(?:\.\d+)?)\s*(?:ft|feet|foot)\s*(\d+(?:\.\d+)?)\s*(?:in|inch|inches)\s+(?:to|in|into)\s+([a-z]+)$/i);
  if (comp) {
    const feet = parseFloat(comp[1]);
    const inches = parseFloat(comp[2]);
    const tu = comp[3].toLowerCase();
    const tf = LENGTH_FACTORS[tu];
    if (tf) {
      const conv = ((feet * 0.3048) + (inches * 0.0254)) / tf;
      const direct = `${feet} ft ${inches} in = ${formatNum(conv)} ${tu}`;
      return {
        found: true,
        category: 'Unit Conversion',
        title: `**${direct}**`,
        directAnswer: direct,
        fullExplanation: `${feet} feet and ${inches} inches is equivalent to ${formatNum(conv)} ${tu}. Length conversions utilize standard SI dimensional equivalence.`,
        snippet: direct,
        details: { fromValue: `${feet} ft ${inches} in`, toValue: formatNum(conv), type: 'Length' }
      };
    }
  }

  // Pattern B: "[val] [u1] to [u2]"
  const m = q.match(/^(?:convert\s+)?(\d+(?:\.\d+)?)\s*([a-z°\/\s]+?)\s+(?:to|in|into)\s+([a-z°\/\s]+)$/i);
  if (!m) return null;

  const val = parseFloat(m[1]);
  if (isNaN(val)) return null;
  const u1 = m[2].trim().toLowerCase();
  const u2 = m[3].trim().toLowerCase();

  // Temperature
  const isC1 = /^(c|celsius|centigrade)$/.test(u1);
  const isC2 = /^(c|celsius|centigrade)$/.test(u2);
  const isF1 = /^(f|fahrenheit)$/.test(u1);
  const isF2 = /^(f|fahrenheit)$/.test(u2);
  const isK1 = /^(k|kelvin)$/.test(u1);
  const isK2 = /^(k|kelvin)$/.test(u2);

  if ((isC1 || isF1 || isK1) && (isC2 || isF2 || isK2)) {
    let res = null;
    let formula = '';
    const l1 = isC1 ? '°C' : (isF1 ? '°F' : 'K');
    const l2 = isC2 ? '°C' : (isF2 ? '°F' : 'K');
    if (isC1 && isF2) { res = (val * 9/5) + 32; formula = `(${val} °C × 9/5) + 32 = ${formatNum(res)} °F`; }
    else if (isF1 && isC2) { res = (val - 32) * 5/9; formula = `(${val} °F - 32) × 5/9 = ${formatNum(res)} °C`; }
    else if (isC1 && isK2) { res = val + 273.15; formula = `${val} °C + 273.15 = ${formatNum(res)} K`; }
    else if (isK1 && isC2) { res = val - 273.15; formula = `${val} K - 273.15 = ${formatNum(res)} °C`; }
    else if (isF1 && isK2) { res = ((val - 32) * 5/9) + 273.15; formula = `((${val} °F - 32) × 5/9) + 273.15 = ${formatNum(res)} K`; }
    else if (isK1 && isF2) { res = ((val - 273.15) * 9/5) + 32; formula = `((${val} K - 273.15) × 9/5) + 32 = ${formatNum(res)} °F`; }
    else if (u1 === u2) { res = val; formula = `${val} ${l1} = ${val} ${l2}`; }

    if (res !== null) {
      const direct = `${val} ${l1} = ${formatNum(res)} ${l2}`;
      return {
        found: true,
        category: 'Unit Conversion',
        title: `**${direct}**`,
        directAnswer: direct,
        fullExplanation: `${formula}. Temperature calculations represent thermodynamic scale conversions using fixed physical constants.`,
        snippet: direct,
        details: { fromValue: `${val} ${l1}`, toValue: `${formatNum(res)} ${l2}`, type: 'Temperature' }
      };
    }
  }

  // Length
  if (LENGTH_FACTORS[u1] && LENGTH_FACTORS[u2]) {
    const conv = (val * LENGTH_FACTORS[u1]) / LENGTH_FACTORS[u2];
    const direct = `${val} ${u1} = ${formatNum(conv)} ${u2}`;
    return {
      found: true, category: 'Unit Conversion', title: `**${direct}**`, directAnswer: direct,
      fullExplanation: `${val} ${u1} is equivalent to ${formatNum(conv)} ${u2}. Distance conversion uses standard SI metric-imperial ratios.`,
      snippet: direct, details: { fromValue: `${val} ${u1}`, toValue: `${formatNum(conv)} ${u2}`, type: 'Length' }
    };
  }

  // Mass
  if (MASS_FACTORS[u1] && MASS_FACTORS[u2]) {
    const conv = (val * MASS_FACTORS[u1]) / MASS_FACTORS[u2];
    const direct = `${val} ${u1} = ${formatNum(conv)} ${u2}`;
    return {
      found: true, category: 'Unit Conversion', title: `**${direct}**`, directAnswer: direct,
      fullExplanation: `${val} ${u1} equals ${formatNum(conv)} ${u2}. Mass metrics follow international avoirdupois standards calibrated to the kilogram.`,
      snippet: direct, details: { fromValue: `${val} ${u1}`, toValue: `${formatNum(conv)} ${u2}`, type: 'Weight' }
    };
  }

  // Speed
  if (SPEED_FACTORS[u1] && SPEED_FACTORS[u2]) {
    const conv = (val * SPEED_FACTORS[u1]) / SPEED_FACTORS[u2];
    const direct = `${val} ${u1} = ${formatNum(conv)} ${u2}`;
    return {
      found: true, category: 'Unit Conversion', title: `**${direct}**`, directAnswer: direct,
      fullExplanation: `${val} ${u1} equals ${formatNum(conv)} ${u2}. Velocity metrics represent kinematic rates of displacement calibrated to meters per second.`,
      snippet: direct, details: { fromValue: `${val} ${u1}`, toValue: `${formatNum(conv)} ${u2}`, type: 'Speed' }
    };
  }

  // Volume
  if (VOLUME_FACTORS[u1] && VOLUME_FACTORS[u2]) {
    const conv = (val * VOLUME_FACTORS[u1]) / VOLUME_FACTORS[u2];
    const direct = `${val} ${u1} = ${formatNum(conv)} ${u2}`;
    return {
      found: true, category: 'Unit Conversion', title: `**${direct}**`, directAnswer: direct,
      fullExplanation: `${val} ${u1} equals ${formatNum(conv)} ${u2}. Volumetric capacity is standardized to the liter.`,
      snippet: direct, details: { fromValue: `${val} ${u1}`, toValue: `${formatNum(conv)} ${u2}`, type: 'Volume' }
    };
  }

  // Data
  if (DATA_FACTORS[u1] && DATA_FACTORS[u2]) {
    const conv = (val * DATA_FACTORS[u1]) / DATA_FACTORS[u2];
    const direct = `${val} ${u1.toUpperCase()} = ${formatNum(conv)} ${u2.toUpperCase()}`;
    return {
      found: true, category: 'Unit Conversion', title: `**${direct}**`, directAnswer: direct,
      fullExplanation: `${val} ${u1.toUpperCase()} equals ${formatNum(conv)} ${u2.toUpperCase()}. Digital storage is computed via binary 1,024 factors.`,
      snippet: direct, details: { fromValue: `${val} ${u1.toUpperCase()}`, toValue: `${formatNum(conv)} ${u2.toUpperCase()}`, type: 'Data' }
    };
  }

  // Currency
  if (CURRENCY_RATES[u1] && CURRENCY_RATES[u2]) {
    const usd = val / CURRENCY_RATES[u1];
    const conv = usd * CURRENCY_RATES[u2];
    const direct = `${formatNum(val)} ${u1.toUpperCase()} = ${formatNum(conv)} ${u2.toUpperCase()}`;
    return {
      found: true, category: 'Currency Conversion', title: `**${direct}**`, directAnswer: direct,
      fullExplanation: `${formatNum(val)} ${u1.toUpperCase()} is approximately ${formatNum(conv)} ${u2.toUpperCase()}. Currency estimates use interbank reference exchange rates.`,
      snippet: direct, details: { fromValue: `${val} ${u1.toUpperCase()}`, toValue: `${formatNum(conv)} ${u2.toUpperCase()}`, type: 'Currency' }
    };
  }

  return null;
}

function getRelatedQueries(query, category, title, details = {}) {
  const cleanQ = (query || '').trim();
  const lower = cleanQ.toLowerCase();

  if (category === 'Unit Conversion' || category === 'Currency Conversion') {
    const d = details || {};
    if (d.type === 'Length') return ['100 km to miles', '50 miles to km', 'how many feet in a mile'];
    if (d.type === 'Temperature') return ['0 celsius to fahrenheit', '100 celsius to fahrenheit', 'absolute zero in celsius'];
    if (d.type === 'Weight') return ['100 lbs to kg', '50 kg to lbs', 'how many grams in an ounce'];
    if (d.type === 'Currency') return ['100 usd to eur', '100 usd to gbp', '100 eur to usd'];
    return ['100 km to miles', '32 f to c', '100 usd to eur'];
  }

  if (category === 'Math') {
    return ['square root of 144', '15 percent of 200', '2 to the power of 10'];
  }

  if (category === 'Dictionary') {
    const word = (title || cleanQ).replace(/\*\*/g, '').trim();
    return [`synonyms of ${word}`, `antonyms of ${word}`, `how to use ${word} in a sentence`];
  }

  const pmMatch = cleanQ.match(/^who\s+is\s+(?:the\s+)?prime\s+minister\s+of\s+(.+)$/i);
  if (pmMatch) {
    const country = pmMatch[1].replace(/\?/g, '').trim();
    return [`capital of ${country}`, `population of ${country}`, `parliament of ${country}`];
  }

  const presMatch = cleanQ.match(/^who\s+is\s+(?:the\s+)?president\s+of\s+(.+)$/i);
  if (presMatch) {
    const country = presMatch[1].replace(/\?/g, '').trim();
    return [`capital of ${country}`, `government of ${country}`, `history of ${country}`];
  }

  const ceoMatch = cleanQ.match(/^who\s+is\s+(?:the\s+)?ceo\s+of\s+(.+)$/i);
  if (ceoMatch) {
    const company = ceoMatch[1].replace(/\?/g, '').trim();
    return [`when was ${company} founded`, `headquarters of ${company}`, `revenue of ${company}`];
  }

  const capMatch = cleanQ.match(/^what\s+is\s+(?:the\s+)?capital\s+of\s+(.+)$/i);
  if (capMatch) {
    const country = capMatch[1].replace(/\?/g, '').trim();
    return [`population of ${country}`, `currency of ${country}`, `languages of ${country}`];
  }

  if (lower.includes('apple')) return ['Why are apples red?', 'Are there naturally blue fruits?', 'Health benefits of apples'];
  if (lower.includes('penguin')) return ['Where do penguins live?', 'Can penguins swim?', 'How do penguins stay warm?'];

  const tokens = cleanQ.replace(/[?.,!]/g, '').split(/\s+/).filter(w => w.length > 3 && !['what', 'where', 'when', 'which', 'does', 'have', 'with'].includes(w.toLowerCase()));
  if (tokens.length >= 2) {
    const topic = tokens.slice(0, 2).join(' ');
    return [`what causes ${topic}`, `why is ${topic} important`, `history of ${topic}`];
  } else if (tokens.length === 1) {
    return [`what is ${tokens[0]}`, `define ${tokens[0]}`, `facts about ${tokens[0]}`];
  }

  return ['what is photosynthesis', 'who is the ceo of microsoft', 'why is the sky blue'];
}

function sendEdgeResponse(data, q) {
  if (data && data.found) {
    if (!data.sources || !data.sources.length) {
      data.sources = getWebsites(data.title || q);
    }
    if (!data.related || !data.related.length) {
      data.related = getRelatedQueries(q, data.category, data.title, data.details);
    }
  }
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

async function callGroqQA(question, apiKey) {
  const models = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
  const prompt = `You are an authoritative encyclopedic knowledge search engine. Answer the question: "${question}".

Strict Formatting Requirements:
1. Provide an answer of EXACTLY 4 sentences in total.
2. Sentence 1 MUST be the direct, bold answer.
3. The remaining 3 sentences MUST provide clear, factual context and mechanics underneath.
4. Absolutely no conversational filler, chatbot greetings, or intros.
5. DO NOT comment on typos, spelling, or state that a term is a misspelling. Always answer the intended factual entity, topic, or question directly.

Format EXACTLY:
Direct Answer:
**[Sentence 1: The bold direct answer]**

Explanation:
[Sentences 2, 3, and 4: Exactly 3 sentences of concise factual context and explanation]

Category:
[e.g. Science, Geography, History, Technology, General Knowledge]`;

  for (const model of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 350
        })
      });

      if (res.ok) {
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content?.trim();
        if (content) {
          let directAnswer = '';
          let fullExplanation = '';
          let category = 'General Knowledge';

          const directMatch = content.match(/Direct Answer:\s*([\s\S]*?)(?=(?:\n\s*Explanation:|$))/i);
          if (directMatch) directAnswer = directMatch[1].trim();

          const explMatch = content.match(/Explanation:\s*([\s\S]*?)(?=(?:\n\s*Category:|$))/i);
          if (explMatch) fullExplanation = explMatch[1].trim();

          const catMatch = content.match(/Category:\s*([\s\S]*?)$/i);
          if (catMatch) category = catMatch[1].trim();

          if (!directAnswer || !fullExplanation) {
            const parts = content.split('\n\n').filter(p => p.trim().length > 0);
            directAnswer = parts[0]?.trim() || question;
            fullExplanation = parts.slice(1).join('\n\n').trim() || content;
          }

          if (fullExplanation.length >= 50 && directAnswer.length >= 10) {
            // Quality guard: Reject pedantic misspelling lectures
            if (!/is\s+(?:a\s+)?(?:common\s+)?misspelling\s+of/i.test(directAnswer)) {
              return { directAnswer, fullExplanation, category };
            }
          }
        }
      }
    } catch (_) {}
  }
  return null;
}

function isKnowledgeOrQuestionQuery(rawQuery) {
  if (!rawQuery) return false;
  const q = rawQuery.trim().toLowerCase();
  if (q.endsWith('?')) return true;
  if (/^(?:what|whats|what's|wht|whts|wat|wats|who|whos|who's|whom|where|wheres|where's|wer|when|whens|when's|wen|why|whys|why's|wy|how|hows|how's|hw|which|whch|is|are|am|was|were|can|could|will|would|shall|should|may|might|must|do|does|did|has|have|had|tell me|give me|explain|describe|show me|find me)\b/i.test(q)) {
    return true;
  }
  if (/\b(?:biggest|largest|smallest|tallest|shortest|fastest|slowest|highest|lowest|deepest|oldest|youngest|hottest|coldest|richest|first|last|most|least)\b/i.test(q)) {
    return true;
  }
  if (/\b(?:in the world|in history|on earth|in space|in the universe|of the world|of all time)\b/i.test(q)) {
    return true;
  }
  if (/\b(?:speed of|distance to|distance from|distance between|diameter of|mass of|radius of|temperature of|boiling point|melting point|capital of|population of|currency of|president of|prime minister of|ceo of|founder of|creator of|cause of|effect of)\b/i.test(q)) {
    return true;
  }
  if (/^(?:define|definition of|meaning of)\s+/i.test(q)) {
    return false;
  }
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length >= 4) {
    return true;
  }
  return false;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();

  if (!q) {
    return new Response(JSON.stringify({ found: false, error: 'Empty query' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  // 1. Math calculation
  const math = solveArithmetic(q);
  if (math.success) {
    return sendEdgeResponse({
      found: true,
      query: q,
      category: 'Math',
      title: `${math.expression} = ${math.answer}`,
      snippet: `Calculated answer: ${math.answer}`
    }, q);
  }

  // 1.5 Unit & Currency Conversion
  const conv = convertUnit(q);
  if (conv && conv.found) {
    return sendEdgeResponse(conv, q);
  }

  const client = getTursoClient(env);
  const isQuestion = isKnowledgeOrQuestionQuery(q);
  const canonicalKey = normalizeToCanonicalKey(q);

  // 2. Question Answering: Check Turso Cloud QA Cache first
  if (isQuestion && canonicalKey) {
    let cachedRow = null;
    try {
      const qaRes = await client.execute({
        sql: 'SELECT id, canonical_key, direct_answer, full_explanation, category, upvotes, downvotes, is_temporal, created_at FROM qa_cache WHERE canonical_key = ? LIMIT 1',
        args: [canonicalKey]
      });

      if (qaRes.rows && qaRes.rows.length > 0) {
        const row = qaRes.rows[0];
        if (Number(row.downvotes) <= Number(row.upvotes)) {
          // If not temporal, serve immediately from cache
          if (row.is_temporal !== 1 && row.is_temporal !== '1') {
            return sendEdgeResponse({
              found: true,
              id: row.id,
              query: q,
              category: row.category || 'Direct QA',
              title: row.direct_answer,
              directAnswer: row.direct_answer,
              fullExplanation: row.full_explanation,
              snippet: row.direct_answer,
              details: {
                id: row.id,
                directAnswer: row.direct_answer,
                fullExplanation: row.full_explanation,
                cachedFromTurso: true
              }
            }, q);
          }
          cachedRow = row;
        }
      }
    } catch (_) {}

    // Zero-Token Live Encyclopedic Probe (Instant verified answers for leaders, offices, entities, facts)
    try {
      const liveFact = await probeLiveKnowledge(q);
      if (liveFact && liveFact.found) {
        const now = new Date().toISOString();
        let savedId = cachedRow ? cachedRow.id : null;
        try {
          const ins = await client.execute({
            sql: `INSERT OR REPLACE INTO qa_cache (canonical_key, original_question, direct_answer, full_explanation, category, is_temporal, upvotes, downvotes, access_count, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, 1, 0, 1, ?, ?)`,
            args: [canonicalKey, q, liveFact.directAnswer, liveFact.fullExplanation, liveFact.category, liveFact.isTemporal || 0, now, now]
          });
          savedId = ins.lastInsertRowid;
        } catch (_) {}

        return sendEdgeResponse({
          found: true,
          id: savedId,
          query: q,
          category: liveFact.category || 'Knowledge Graph',
          title: liveFact.directAnswer,
          directAnswer: liveFact.directAnswer,
          fullExplanation: liveFact.fullExplanation,
          snippet: liveFact.directAnswer,
          details: {
            id: savedId,
            directAnswer: liveFact.directAnswer,
            fullExplanation: liveFact.fullExplanation,
            tokensUsed: 0,
            cachedFromTurso: false,
            liveProbe: true
          }
        }, q);
      }
    } catch (_) {}

    // If live probe didn't match but we had a cached row, return it
    if (cachedRow) {
      return sendEdgeResponse({
        found: true,
        id: cachedRow.id,
        query: q,
        category: cachedRow.category || 'Direct QA',
        title: cachedRow.direct_answer,
        directAnswer: cachedRow.direct_answer,
        fullExplanation: cachedRow.full_explanation,
        snippet: cachedRow.direct_answer,
        details: {
          id: cachedRow.id,
          directAnswer: cachedRow.direct_answer,
          fullExplanation: cachedRow.full_explanation,
          cachedFromTurso: true
        }
      }, q);
    }

    // Groq On-Demand Generation for Question (with Storage Cap Guard)
    const MAX_LIMIT = parseInt(env?.MAX_QA_CACHE_LIMIT || '5000000', 10);
    const groqKey = env?.GROQ_API_KEY;
    if (groqKey) {
      // Check if limit is reached before calling Groq
      try {
        const countRes = await client.execute('SELECT COUNT(1) AS total FROM qa_cache');
        const currentTotal = Number(countRes?.rows?.[0]?.total) || 0;
        if (currentTotal >= MAX_LIMIT) {
          return new Response(JSON.stringify({
            found: true,
            query: q,
            category: 'Storage Limit',
            title: '**The knowledge database has reached its maximum storage capacity limit.**',
            directAnswer: '**The knowledge database has reached its maximum storage capacity limit.**',
            fullExplanation: `The search engine has stored the maximum allowed cap of ${MAX_LIMIT.toLocaleString()} questions. Generation has safely stopped to prevent exceeding storage quotas. Existing cached answers remain fully accessible.`,
            snippet: 'Storage capacity limit reached.',
            sources: getWebsites(q)
          }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
      } catch (_) {}

      const generatedQA = await callGroqQA(q, groqKey);

    if (generatedQA) {
      const now = new Date().toISOString();
      let newId = null;
      try {
        const ins = await client.execute({
          sql: `INSERT OR REPLACE INTO qa_cache (canonical_key, original_question, direct_answer, full_explanation, category, is_temporal, upvotes, downvotes, access_count, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 0, 1, 0, 1, ?, ?)`,
          args: [canonicalKey, q, generatedQA.directAnswer, generatedQA.fullExplanation, generatedQA.category, now, now]
        });
        newId = ins.lastInsertRowid;
      } catch (_) {}

      return sendEdgeResponse({
        found: true,
        id: newId,
        query: q,
        category: 'Direct QA',
        title: generatedQA.directAnswer,
        directAnswer: generatedQA.directAnswer,
        fullExplanation: generatedQA.fullExplanation,
        snippet: generatedQA.directAnswer,
        details: {
          id: newId,
          directAnswer: generatedQA.directAnswer,
          fullExplanation: generatedQA.fullExplanation,
          cachedFromTurso: false
        }
      }, q);
    }
  }

  // 3. Dictionary Term Lookup in Turso Cloud
  const clean = q.toLowerCase();
  try {
    const rs = await client.execute({
      sql: 'SELECT word, heading, explanation, usage, raw_entry FROM my_dictionary WHERE word = ? LIMIT 1',
      args: [clean]
    });

    if (rs.rows && rs.rows.length > 0) {
      const row = rs.rows[0];
      return sendEdgeResponse({
        found: true,
        query: q,
        category: 'Dictionary',
        title: clean.charAt(0).toUpperCase() + clean.slice(1),
        heading: row.heading,
        explanation: row.explanation,
        usage: row.usage,
        raw_entry: row.raw_entry,
        snippet: row.explanation,
        details: row
      }, q);
    }
  } catch (_) {}

  return new Response(JSON.stringify({
    found: false,
    query: q,
    message: 'No result found.'
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
