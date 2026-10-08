import https from 'node:https';

// Helper for resilient GET requests
function httpsGetJson(url, headers = {}) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'TriangleSearch/1.0 (https://github.com/rhhs976/triangle; admin@triangle.org)',
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

// 1. Scrape Wikimedia Commons Videos (Creative Commons & Public Domain high-quality educational footage)
async function scrapeWikimediaVideos(query) {
  const clean = encodeURIComponent(`${query.trim()} filetype:video`);
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${clean}&gsrlimit=10&prop=imageinfo&iiprop=url|size|mime&format=json`;

  const res = await httpsGetJson(url);
  if (res.error || !res.data?.query?.pages) {
    return { videos: [], challenge: res.isChallenge || false };
  }

  const pages = Object.values(res.data.query.pages);
  const videos = [];

  for (const p of pages) {
    const info = p.imageinfo?.[0];
    if (!info || !info.url) continue;

    const mime = info.mime || '';
    if (!mime.startsWith('video/') && !/\.(webm|ogv|mp4)$/i.test(info.url)) {
      continue;
    }

    const cleanTitle = p.title
      .replace(/^File:/i, '')
      .replace(/\.[^.]+$/, '')
      .replace(/_/g, ' ')
      .trim();

    videos.push({
      id: `wiki-${p.pageid || Math.random()}`,
      title: cleanTitle,
      type: 'direct_stream',
      videoUrl: info.url,
      mime: mime || 'video/webm',
      thumbnail: null, // Will use HTML5 video frame preview
      source: 'Wikimedia Commons',
      sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
      description: 'Public domain / Creative Commons educational archive footage.'
    });
  }

  return { videos, challenge: false };
}

// 2. Scrape Internet Archive (archive.org) Historical & Documentary Movies
async function scrapeArchiveOrgVideos(query) {
  const cleanQ = `(${query.trim()}) AND mediatype:(movies)`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(cleanQ)}&fl[]=identifier,title,description,year,duration&rows=10&page=1&output=json`;

  const res = await httpsGetJson(url);
  if (res.error || !res.data?.response?.docs) {
    return { videos: [], challenge: res.isChallenge || false };
  }

  const docs = res.data.response.docs;
  const videos = [];

  for (const doc of docs) {
    if (!doc.identifier) continue;

    const id = doc.identifier;
    const desc = (doc.description || '')
      .replace(/<[^>]+>/g, '')
      .slice(0, 160)
      .trim();

    videos.push({
      id: `ia-${id}`,
      title: doc.title || query,
      type: 'embed_player',
      embedUrl: `https://archive.org/embed/${id}`,
      videoUrl: `https://archive.org/details/${id}`,
      thumbnail: `https://archive.org/services/img/${id}`,
      year: doc.year || null,
      source: 'Internet Archive',
      sourceUrl: `https://archive.org/details/${id}`,
      description: desc || 'Public digital archive footage and documentary recordings.'
    });
  }

  return { videos, challenge: false };
}

let ytClientPromise = null;

// Warm up / Lazy-initialize YouTube InnerTube client
function getYouTubeClient() {
  if (!ytClientPromise) {
    ytClientPromise = (async () => {
      const { Innertube } = await import('youtubei.js');
      return await Innertube.create({
        fetch: fetch,
        cache: undefined
      });
    })().catch(err => {
      ytClientPromise = null; // Allow retry on next call if it failed
      throw err;
    });
  }
  return ytClientPromise;
}

// Pre-warm client in background
setTimeout(() => {
  getYouTubeClient().catch(() => {});
}, 1000);

// Search YouTube with a timeout guard
async function searchYouTubeVideos(query) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('YouTube search timed out')), 9000);
  });

  const fetchPromise = (async () => {
    const yt = await getYouTubeClient();
    const search = await yt.search(query, { type: 'video' });
    const rawVideos = search.videos || [];
    const videos = [];

    for (const v of rawVideos) {
      if (!v.id) continue;
      const title = v.title?.text || v.title || 'YouTube Video';
      const duration = v.duration?.text || null;
      const channel = v.author?.name || 'YouTube';
      const thumbnail = v.thumbnails?.[0]?.url || '';
      const description = v.description_snippet?.text || (channel ? `Uploaded by ${channel}` : '');

      videos.push({
        id: `yt-${v.id}`,
        title,
        type: 'embed_player',
        embedUrl: `https://www.youtube-nocookie.com/embed/${v.id}`,
        videoUrl: `https://www.youtube.com/watch?v=${v.id}`,
        thumbnail,
        duration,
        channel,
        source: 'YouTube',
        sourceUrl: `https://www.youtube.com/watch?v=${v.id}`,
        description
      });
    }
    return videos;
  })();

  return Promise.race([fetchPromise, timeoutPromise]);
}

// Automatic Multi-Source Video Scraper Orchestrator
// Strategy: Try youtube.js first; if it crashes, times out, or fails, gracefully fall back to scrapers
export async function scrapeOnlineVideos(rawQuery) {
  const query = (rawQuery || '').trim();
  if (!query) {
    return {
      found: false,
      query: '',
      message: 'Please provide a search term to find videos.',
      videos: []
    };
  }

  // SafeSearch Guard: Block explicit, adult, or harmful video searches
  const NSFW_PATTERN = /\b(?:porn\w*|xxx|nsfw|nude\w*|nudity|sex\w*|erotic\w*|gore|explicit)\b/i;
  if (NSFW_PATTERN.test(query)) {
    return {
      found: false,
      query,
      count: 0,
      videos: [],
      blocked: true,
      message: 'Video search for this term is blocked by SafeSearch filters.'
    };
  }

  // 1. Primary Strategy: YouTube via youtube.js
  try {
    const ytVideos = await searchYouTubeVideos(query);
    if (Array.isArray(ytVideos) && ytVideos.length > 0) {
      return {
        found: true,
        query,
        count: ytVideos.length,
        source: 'YouTube',
        videos: ytVideos
      };
    }
  } catch (ytErr) {
    console.warn(`[Video Scraper] YouTube.js encountered an issue (${ytErr.message}). Automatically falling back to archive scrapers...`);
  }

  // 2. Fallback Strategy: Internet Archive & Wikimedia Commons scrapers
  let allVideos = [];
  let facedChallenge = false;

  const [wikiRes, iaRes] = await Promise.all([
    scrapeWikimediaVideos(query).catch(() => ({ videos: [], challenge: false })),
    scrapeArchiveOrgVideos(query).catch(() => ({ videos: [], challenge: false }))
  ]);

  if (wikiRes.challenge || iaRes.challenge) {
    facedChallenge = true;
  }

  // Interleave and merge results for variety
  const maxLen = Math.max(wikiRes.videos.length, iaRes.videos.length);
  for (let i = 0; i < maxLen; i++) {
    if (iaRes.videos[i]) allVideos.push(iaRes.videos[i]);
    if (wikiRes.videos[i]) allVideos.push(wikiRes.videos[i]);
  }

  // Deduplicate by URL
  const seenUrls = new Set();
  const dedupedVideos = [];
  for (const v of allVideos) {
    const key = v.videoUrl || v.embedUrl;
    if (!seenUrls.has(key)) {
      seenUrls.add(key);
      dedupedVideos.push(v);
    }
  }

  // Return at least 1 video or report failure due to copyright / Cloudflare / CAPTCHA
  if (dedupedVideos.length >= 1) {
    return {
      found: true,
      query,
      count: dedupedVideos.length,
      source: 'Archives (Fallback)',
      videos: dedupedVideos
    };
  }

  return {
    found: false,
    query,
    count: 0,
    videos: [],
    blocked: facedChallenge,
    message: facedChallenge
      ? 'No video results found due to Cloudflare verification, CAPTCHA protections, or source access restrictions.'
      : `No video results found for "${query}" due to copyright protections or unverified public domain availability.`
  };
}
