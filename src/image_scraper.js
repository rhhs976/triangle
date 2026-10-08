import https from 'node:https';

// Timeout helper for resilient web scraping
function httpsGetJson(url, headers = {}) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (TriangleSearchBot/1.0)',
        'Accept': 'application/json, text/plain, */*',
        ...headers
      },
      family: 4,
      timeout: 7000
    }, (res) => {
      // Check for Cloudflare / CAPTCHA / Forbidden responses
      if (res.statusCode === 403 || res.statusCode === 429 || res.statusCode === 503) {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          const isChallenge = /cloudflare|captcha|just a moment|access denied|ddos/i.test(body);
          resolve({ error: true, statusCode: res.statusCode, isChallenge, data: null });
        });
        return;
      }

      if (res.statusCode !== 200) {
        res.resume();
        resolve({ error: true, statusCode: res.statusCode, data: null });
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ error: false, data: json });
        } catch (e) {
          const isChallenge = /cloudflare|captcha|just a moment/i.test(data);
          resolve({ error: true, isChallenge, data: null });
        }
      });
    });

    req.on('error', () => resolve({ error: true, data: null }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ error: true, data: null });
    });
  });
}

// 1. Scrape Wikimedia Commons (Public domain & Creative Commons high-res images)
async function scrapeWikimediaCommons(query) {
  const clean = encodeURIComponent(query.trim());
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${clean}&gsrlimit=16&prop=imageinfo&iiprop=url|size|mime&format=json`;

  const res = await httpsGetJson(url, {
    'User-Agent': 'TriangleSearch/1.0 (https://github.com/rhhs976/triangle; admin@triangle.org)'
  });

  if (res.error || !res.data?.query?.pages) {
    return { images: [], challenge: res.isChallenge || false };
  }

  const pages = Object.values(res.data.query.pages);
  const images = [];

  for (const p of pages) {
    const info = p.imageinfo?.[0];
    if (!info || !info.url) continue;

    const lowerUrl = info.url.toLowerCase();
    // Exclude sound, pdf, or non-visual files
    if (lowerUrl.endsWith('.ogg') || lowerUrl.endsWith('.oga') || lowerUrl.endsWith('.pdf') || lowerUrl.endsWith('.webm') || lowerUrl.endsWith('.wav')) {
      continue;
    }

    const cleanTitle = p.title
      .replace(/^File:/i, '')
      .replace(/\.[^.]+$/, '')
      .replace(/_/g, ' ')
      .trim();

    // Use thumburl if provided or direct url
    const thumbUrl = info.thumburl || info.url;

    images.push({
      title: cleanTitle,
      url: info.url,
      thumbnail: thumbUrl,
      source: 'Wikimedia Commons',
      sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
      width: info.width || null,
      height: info.height || null
    });
  }

  return { images, challenge: false };
}

// 2. Scrape Wikipedia Article Media (Verified subject imagery)
async function scrapeWikipediaMedia(query) {
  const clean = encodeURIComponent(query.trim());
  const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${clean}&gsrlimit=8&prop=pageimages|description&pithumbsize=800&format=json`;

  const res = await httpsGetJson(url, {
    'User-Agent': 'TriangleSearch/1.0 (admin@triangle.org)'
  });

  if (res.error || !res.data?.query?.pages) {
    return { images: [], challenge: res.isChallenge || false };
  }

  const pages = Object.values(res.data.query.pages);
  const images = [];

  for (const p of pages) {
    if (!p.thumbnail || !p.thumbnail.source) continue;

    images.push({
      title: p.title,
      url: p.thumbnail.source,
      thumbnail: p.thumbnail.source,
      source: 'Wikipedia',
      sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title)}`,
      width: p.thumbnail.width || null,
      height: p.thumbnail.height || null
    });
  }

  return { images, challenge: false };
}

// 3. Scrape Openverse Creative Commons Photo Index (with SafeSearch mature=false)
async function scrapeOpenverse(query) {
  const clean = encodeURIComponent(query.trim());
  const url = `https://api.openverse.org/v1/images/?q=${clean}&page_size=12&mature=false`;

  const res = await httpsGetJson(url);

  if (res.error || !res.data?.results) {
    return { images: [], challenge: res.isChallenge || false };
  }

  const items = res.data.results;
  const images = [];

  for (const item of items) {
    if (!item.url) continue;

    images.push({
      title: item.title || query,
      url: item.url,
      thumbnail: item.thumbnail || item.url,
      source: item.source || 'Openverse',
      sourceUrl: item.foreign_landing_url || item.url,
      creator: item.creator || null,
      license: item.license || 'Creative Commons'
    });
  }

  return { images, challenge: false };
}

// Automatic Multi-Source Image Scraper Orchestrator
export async function scrapeOnlineImages(rawQuery) {
  const query = (rawQuery || '').trim();
  if (!query) {
    return {
      found: false,
      query: '',
      message: 'Please provide a search term to find images.',
      images: []
    };
  }

  // SafeSearch Guard: Block explicit, adult, or harmful image searches
  const NSFW_PATTERN = /\b(?:porn\w*|xxx|nsfw|nude\w*|nudity|sex\w*|erotic\w*|gore|explicit)\b/i;
  if (NSFW_PATTERN.test(query)) {
    return {
      found: false,
      query,
      count: 0,
      images: [],
      blocked: true,
      message: 'Image search for this term is blocked by SafeSearch filters.'
    };
  }

  let allImages = [];
  let facedChallenge = false;

  // Run scraper sources concurrently for high performance
  const [wikiCommonsRes, wikiMediaRes, openverseRes] = await Promise.all([
    scrapeWikimediaCommons(query).catch(() => ({ images: [], challenge: false })),
    scrapeWikipediaMedia(query).catch(() => ({ images: [], challenge: false })),
    scrapeOpenverse(query).catch(() => ({ images: [], challenge: false }))
  ]);

  if (wikiCommonsRes.challenge || wikiMediaRes.challenge || openverseRes.challenge) {
    facedChallenge = true;
  }

  // Deduplicate and merge images across scrapers
  const seenUrls = new Set();

  // Prioritize high-resolution Wikipedia and Wikimedia Commons results
  for (const img of [...wikiCommonsRes.images, ...wikiMediaRes.images, ...openverseRes.images]) {
    if (!seenUrls.has(img.url)) {
      seenUrls.add(img.url);
      allImages.push(img);
    }
  }

  // Return at least 1 image or report failure due to copyright / Cloudflare / CAPTCHA
  if (allImages.length >= 1) {
    return {
      found: true,
      query,
      count: allImages.length,
      images: allImages
    };
  }

  // No images found or blocked
  return {
    found: false,
    query,
    count: 0,
    images: [],
    blocked: facedChallenge,
    message: facedChallenge
      ? 'No image results found due to Cloudflare verification, CAPTCHA protections, or source access restrictions.'
      : `No image results found for "${query}" due to copyright protections or unverified public domain availability.`
  };
}
