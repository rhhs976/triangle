// State elements
const body = document.body;
const centerForm = document.getElementById('center-search-form');
const centerInput = document.getElementById('center-search-input');
const centerClearBtn = document.getElementById('center-clear-btn');

const topHeader = document.getElementById('top-header');
const topForm = document.getElementById('top-search-form');
const topInput = document.getElementById('top-search-input');
const topClearBtn = document.getElementById('top-clear-btn');

const brandLogoSmall = document.getElementById('brand-logo-small');
const resultsWrapper = document.getElementById('results-wrapper');
const randomSearchBtn = document.getElementById('random-search-btn');

// Sample queries
const sampleQueries = [
  'Apollo 11',
  '847392819 + 152607181',
  'define serendipity',
  'Higgs Boson',
  'D-Day Landings',
  'DNA Structure',
  '1284 * 492',
  'Library of Alexandria',
  'define entropy',
  'tag: The astronomer observed a bright comet'
];

// Switch to Home View
function showHomeView() {
  body.className = 'home-view';
  centerInput.value = '';
  topInput.value = '';
  resultsWrapper.innerHTML = '';
  centerClearBtn.style.display = 'none';
  topClearBtn.style.display = 'none';
  window.history.pushState({}, '', window.location.pathname);
  setTimeout(() => centerInput.focus(), 50);
}

// Switch to Results View
function showResultsView(query) {
  body.className = 'results-view';
  topInput.value = query;
  centerInput.value = query;
  topClearBtn.style.display = query ? 'block' : 'none';
  centerClearBtn.style.display = query ? 'block' : 'none';
  topInput.focus();
}

// Perform Search
async function performSearch(query) {
  const clean = (query || '').trim();
  if (!clean) return;

  showResultsView(clean);
  window.history.pushState({ q: clean }, '', `?q=${encodeURIComponent(clean)}`);

  resultsWrapper.innerHTML = `
    <div class="loading-spinner">Searching triangle knowledge index...</div>
  `;

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(clean)}`);
    const data = await res.json();
    renderResults(data);
  } catch (err) {
    resultsWrapper.innerHTML = `
      <div class="no-results-card">
        <div class="no-results-msg">Unable to connect to search index.</div>
      </div>
    `;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper: Render the 2-half website sources box on the right side of the answer
function renderSourcesBox(sources) {
  if (!sources || !sources.length) return '';
  const [half1, half2] = sources;

  function renderHalf(item, positionClass) {
    if (!item) return '';
    return `
      <div class="source-half ${positionClass}">
        <div class="source-header">
          <img class="source-logo" src="${escapeHtml(item.logo || '')}" alt="${escapeHtml(item.siteName || '')}" onerror="this.style.display='none'" />
          <div class="source-meta">
            <span class="source-site">${escapeHtml(item.siteName || '')}</span>
            <a href="${escapeHtml(item.url || '#')}" target="_blank" rel="noopener noreferrer" class="source-link" title="${escapeHtml(item.title || item.url || '')}">
              <span>${escapeHtml(item.domain || item.url || '')}</span>
              <svg viewBox="0 0 24 24" width="11" height="11" class="external-icon"><path fill="currentColor" d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3m-2 16H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7Z"/></svg>
            </a>
          </div>
        </div>

        ${item.image ? `
          <div class="source-image-wrap">
            <img src="${escapeHtml(item.image)}" class="source-image" alt="${escapeHtml(item.title || '')}" loading="lazy" onerror="this.parentElement.style.display='none'" />
          </div>
        ` : `
          <div class="source-image-wrap dynamic-wiki-image" style="display:none;">
            <img class="source-image" alt="Article image" />
          </div>
        `}

        <div class="source-description">
          ${escapeHtml(item.description || '')}
        </div>
      </div>
    `;
  }

  return `
    <aside class="results-side-col">
      <div class="side-sources-box">
        ${renderHalf(half1, 'source-half-top')}
        <div class="source-divider"></div>
        ${renderHalf(half2, 'source-half-bottom')}
      </div>
    </aside>
  `;
}

// Asynchronously fetch Wikipedia thumbnail if top half has no image
async function checkWikipediaThumbnail(topic) {
  if (!topic) return;
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.thumbnail && data.thumbnail.source) {
      const wrap = document.querySelector('.source-half-top .dynamic-wiki-image');
      if (wrap) {
        const img = wrap.querySelector('.source-image');
        if (img) {
          img.src = data.thumbnail.source;
          img.alt = data.title || topic;
          wrap.style.display = 'flex';
        }
      }
    }
  } catch (e) {
    // Graceful offline fallback
  }
}

// Render Results Underneath Search Bar
function renderResults(data) {
  if (!data || !data.found) {
    resultsWrapper.innerHTML = `
      <div class="result-card no-results-card">
        <div class="no-results-msg">${escapeHtml(data.message || `No results found for "${data.query || ''}".`)}</div>
        ${data.suggestion ? `
          <div class="spell-suggestion-box" style="margin-top: 14px; font-size: 15px; color: #1a0dab;">
            Did you mean: <button class="spell-suggest-btn" data-word="${escapeHtml(data.suggestion)}" style="background:none; border:none; color:#1a0dab; text-decoration:underline; font-weight:600; cursor:pointer; font-size:15px; padding:0;">${escapeHtml(data.suggestion)}</button>?
          </div>
        ` : ''}
        ${data.suggestions ? `
          <p style="color:#70757a; font-size:14px; margin-top:8px;">Suggestions:</p>
          <ul class="suggestions-list">
            ${data.suggestions.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `;

    // Hook up spell suggestion button click
    const suggestBtn = resultsWrapper.querySelector('.spell-suggest-btn');
    if (suggestBtn) {
      suggestBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const word = suggestBtn.getAttribute('data-word');
        if (word) {
          searchInput.value = word;
          triggerSearch(word);
        }
      });
    }
    return;
  }

  let cardHtml = '';

  // 1. Math Result
  if (data.category === 'Math') {
    const d = data.details;
    cardHtml = `
      <div class="result-card math-card">
        <span class="result-category-badge">Calculator</span>
        <div class="math-expression">${d.expression}</div>
        <div class="math-answer">${d.answer}</div>
        <div class="math-derivation">
          <div class="math-derivation-title">Step-by-Step Working Out (${d.pattern})</div>
          <div class="math-steps">${d.workingOut}</div>
        </div>
      </div>
    `;
  }
  // 2. Direct QA Result (Local Answer Separation without Groq)
  else if (data.category === 'Direct QA') {
    const d = data.details || {};
    const directAns = d.directAnswer || data.title;
    const sentence = d.matchedSentence || '';
    const extraInfo = d.extraInfo || '';
    const sourceWord = d.sourceWord || '';

    cardHtml = `
      <div class="result-card qa-card">
        <div class="qa-badge-row" style="display:flex; align-items:center; margin-bottom:10px;">
          <span class="result-category-badge" style="background:#000; color:#fff; font-weight:600;">Direct Answer</span>
          <span style="font-size:13px; color:#5f6368; margin-left:10px;">From: <strong>${escapeHtml(sourceWord)}</strong></span>
        </div>

        <div class="qa-main-answer" style="font-size:26px; font-weight:700; color:#000; margin:8px 0 12px 0; line-height:1.25;">
          ${escapeHtml(directAns)}
        </div>

        ${sentence ? `
          <div class="qa-evidence" style="font-size:15px; color:#202124; line-height:1.5; margin-bottom:18px; padding-left:12px; border-left:3px solid #000; background:#f8f9fa; padding:10px 12px; border-radius:0 4px 4px 0;">
            ${escapeHtml(sentence)}
          </div>
        ` : ''}

        ${extraInfo && extraInfo !== '(No further background notes)' ? `
          <div class="qa-separated-section" style="margin-top:16px; padding-top:14px; border-top:1px solid #e8eaed;">
            <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.5px; font-weight:600; color:#70757a; margin-bottom:6px;">
              Additional Context (Not specifically requested)
            </div>
            <div style="font-size:14px; color:#5f6368; line-height:1.5;">
              ${escapeHtml(extraInfo)}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
  // 3. Dictionary Result (Exact Format: Bold Heading, Explanation, Usage)
  else if (data.category === 'Dictionary') {
    const d = data.details || {};
    const headingText = (d.heading || `**${data.title}**`).replace(/\*\*/g, '').trim();
    const explanationText = d.explanation || data.snippet || '';
    const usageText = d.usage || '';

    const formattedUsage = usageText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => `<div class="dict-usage-line">${escapeHtml(line)}</div>`)
      .join('');

    cardHtml = `
      <div class="result-card dict-card">
        <h2 class="dict-heading-bold"><strong>${escapeHtml(headingText)}</strong></h2>
        
        <div class="dict-section">
          <div class="dict-section-label">Explanation:</div>
          <div class="dict-section-content">${escapeHtml(explanationText)}</div>
        </div>

        ${usageText ? `
          <div class="dict-section dict-usage-section">
            <div class="dict-section-label">Usage:</div>
            <div class="dict-section-content dict-usage-content">
              ${formattedUsage}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
  // 4. Knowledge Result (History & Science Fact)
  else if (data.category === 'Knowledge Card') {
    const d = data.details || {};
    const tags = Array.isArray(d.keywords) ? d.keywords : [];
    const direct = data.directAnswer;

    let directHtml = '';
    if (direct && direct.answer) {
      directHtml = `
        <div class="direct-answer-card">
          <div class="direct-answer-label">${direct.label || 'Quick Answer'}</div>
          <div class="direct-answer-main">${direct.answer}</div>
          ${direct.subAnswer && direct.subAnswer !== direct.answer ? `<div class="direct-answer-context">${direct.subAnswer}</div>` : ''}
        </div>
      `;
    }

    cardHtml = `
      ${directHtml}
      <div class="result-card knowledge-card">
        <span class="result-category-badge">Verified Source</span>
        <h2 class="result-title">${data.title}</h2>
        <div class="result-subtitle">${data.subtitle || ''}</div>
        <div class="result-snippet">${d.fullFact || data.snippet}</div>
        ${tags.length ? `
          <div class="knowledge-tags">
            ${tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }
  // 5. Grammar / POS Tagging Result
  else if (data.category === 'Grammar & Syntax') {
    const d = data.details || {};
    cardHtml = `
      <div class="result-card grammar-card">
        <span class="result-category-badge">Syntactic Analysis</span>
        <h2 class="result-title">${data.title}</h2>
        <div class="grammar-formula">${d.posFormula}</div>
        
        <div class="pos-breakdown-grid">
          <div class="pos-box">
            <div class="pos-box-label">Verbs</div>
            <div class="pos-box-value">${d.verbs && d.verbs.length ? d.verbs.join(', ') : 'None'}</div>
          </div>
          <div class="pos-box">
            <div class="pos-box-label">Nouns</div>
            <div class="pos-box-value">${d.nouns && d.nouns.length ? d.nouns.join(', ') : 'None'}</div>
          </div>
          <div class="pos-box">
            <div class="pos-box-label">Adjectives</div>
            <div class="pos-box-value">${d.adjectives && d.adjectives.length ? d.adjectives.join(', ') : 'None'}</div>
          </div>
          <div class="pos-box">
            <div class="pos-box-label">Adverbs</div>
            <div class="pos-box-value">${d.adverbs && d.adverbs.length ? d.adverbs.join(', ') : 'None'}</div>
          </div>
        </div>
      </div>
    `;
  }
  // Default General Result Card
  else {
    cardHtml = `
      <div class="result-card">
        <span class="result-category-badge">${data.category || 'Result'}</span>
        <h2 class="result-title">${data.title}</h2>
        ${data.subtitle ? `<div class="result-subtitle">${data.subtitle}</div>` : ''}
        <div class="result-snippet">${data.snippet}</div>
      </div>
    `;
  }

  // Render two-column layout with right-side website box in halves
  const sourcesBoxHtml = renderSourcesBox(data.sources);

  if (sourcesBoxHtml) {
    resultsWrapper.innerHTML = `
      <div class="results-layout">
        <div class="results-main-col">
          ${cardHtml}
        </div>
        ${sourcesBoxHtml}
      </div>
    `;

    // Asynchronously enhance thumbnail from Wikipedia if not already provided
    if (data.sources && data.sources[0] && !data.sources[0].image) {
      const topic = data.sourceWord || data.details?.word || data.title || data.query;
      checkWikipediaThumbnail(topic);
    }
  } else {
    resultsWrapper.innerHTML = cardHtml;
  }
}

// Input sync & clear button toggling
function syncInputs(val) {
  centerInput.value = val;
  topInput.value = val;
  centerClearBtn.style.display = val ? 'block' : 'none';
  topClearBtn.style.display = val ? 'block' : 'none';
}

centerInput.addEventListener('input', (e) => syncInputs(e.target.value));
topInput.addEventListener('input', (e) => syncInputs(e.target.value));

centerClearBtn.addEventListener('click', () => {
  syncInputs('');
  centerInput.focus();
});

topClearBtn.addEventListener('click', () => {
  syncInputs('');
  topInput.focus();
});

// Form Submissions
centerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  performSearch(centerInput.value);
});

topForm.addEventListener('submit', (e) => {
  e.preventDefault();
  performSearch(topInput.value);
});

// Logo click returns to home view
brandLogoSmall.addEventListener('click', (e) => {
  e.preventDefault();
  showHomeView();
});

// Explore / Random Button
randomSearchBtn.addEventListener('click', () => {
  const q = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
  performSearch(q);
});

// Sample Query Chips
document.querySelectorAll('.sample-link').forEach(btn => {
  btn.addEventListener('click', () => {
    const q = btn.getAttribute('data-q');
    performSearch(q);
  });
});

// Handle Back / Forward Browser History
window.addEventListener('popstate', (e) => {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q) {
    performSearch(q);
  } else {
    showHomeView();
  }
});

// Initial Load Check
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q) {
    performSearch(q);
  } else {
    showHomeView();
  }
});
