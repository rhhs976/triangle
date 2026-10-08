// Cloudflare Pages Function: /api/videos
// Fast, resilient video search using open web fetch (100% compatible with Cloudflare Workers)

async function scrapeWikimediaVideos(query) {
  try {
    const clean = encodeURIComponent(`${query.trim()} filetype:video`);
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${clean}&gsrlimit=8&prop=imageinfo&iiprop=url|size|mime&format=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TriangleSearch/1.0 (https://github.com/rhhs976/triangle)' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.query?.pages) return [];

    const videos = [];
    for (const p of Object.values(data.query.pages)) {
      const info = p.imageinfo?.[0];
      if (!info || !info.url) continue;
      const mime = info.mime || '';
      if (!mime.startsWith('video/') && !/\.(webm|ogv|mp4)$/i.test(info.url)) continue;

      const cleanTitle = p.title.replace(/^File:/i, '').replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
      videos.push({
        id: `wiki-${p.pageid || Math.random()}`,
        title: cleanTitle,
        type: 'direct_stream',
        videoUrl: info.url,
        mime: mime || 'video/webm',
        thumbnail: null,
        source: 'Wikimedia Commons',
        sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
        description: 'Public domain & Creative Commons educational video archive.'
      });
    }
    return videos;
  } catch (_) {
    return [];
  }
}

async function scrapeArchiveOrgVideos(query) {
  try {
    const cleanQ = `(${query.trim()}) AND mediatype:(movies)`;
    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(cleanQ)}&fl[]=identifier,title,description,year,duration&rows=8&page=1&output=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TriangleSearch/1.0 (https://github.com/rhhs976/triangle)' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.response?.docs) return [];

    const videos = [];
    for (const doc of data.response.docs) {
      if (!doc.identifier) continue;
      const id = doc.identifier;
      const desc = (doc.description || '').replace(/<[^>]+>/g, '').slice(0, 160).trim();

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
        description: desc || 'Public digital archive recording and educational film.'
      });
    }
    return videos;
  } catch (_) {
    return [];
  }
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const q = url.searchParams.get('q') || '';

  if (!q.trim()) {
    return new Response(JSON.stringify({ query: '', videos: [] }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  const [wikiVideos, archiveVideos] = await Promise.all([
    scrapeWikimediaVideos(q),
    scrapeArchiveOrgVideos(q)
  ]);

  const combined = [...archiveVideos, ...wikiVideos];

  return new Response(JSON.stringify({
    query: q,
    count: combined.length,
    videos: combined
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
