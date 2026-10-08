// Cloudflare Pages Function: /api/images
// Scrapes open educational images using web fetch (100% compatible with Cloudflare Workers)

async function scrapeWikimedia(query) {
  try {
    const clean = encodeURIComponent(query.trim());
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${clean}&gsrlimit=12&prop=imageinfo&iiprop=url|size|mime&format=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TriangleSearch/1.0 (https://github.com/rhhs976/triangle)' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.query?.pages) return [];

    const results = [];
    for (const p of Object.values(data.query.pages)) {
      const info = p.imageinfo?.[0];
      if (!info || !info.url) continue;
      if (!info.mime?.startsWith('image/') || info.mime.includes('svg')) continue;

      const cleanTitle = p.title.replace(/^File:/i, '').replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
      results.push({
        id: `wiki-${p.pageid || Math.random()}`,
        title: cleanTitle,
        imageUrl: info.url,
        thumbUrl: info.url,
        width: info.width || 800,
        height: info.height || 600,
        source: 'Wikimedia Commons',
        sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
        verified: true
      });
    }
    return results;
  } catch (_) {
    return [];
  }
}

async function scrapeUnsplash(query) {
  try {
    const clean = encodeURIComponent(query.trim());
    const url = `https://images.unsplash.com/photo-1542296332-2e4473faf563?w=800&auto=format&fit=crop&q=80`;
    return [{
      id: `unsplash-${Math.random()}`,
      title: `${query} Photography`,
      imageUrl: `https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80`,
      thumbUrl: `https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&auto=format&fit=crop&q=80`,
      width: 800,
      height: 600,
      source: 'Unsplash Library',
      sourceUrl: 'https://unsplash.com',
      verified: true
    }];
  } catch (_) {
    return [];
  }
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const q = url.searchParams.get('q') || '';

  if (!q.trim()) {
    return new Response(JSON.stringify({ query: '', images: [] }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  const [wikiImages] = await Promise.all([
    scrapeWikimedia(q)
  ]);

  return new Response(JSON.stringify({
    query: q,
    count: wikiImages.length,
    images: wikiImages
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
