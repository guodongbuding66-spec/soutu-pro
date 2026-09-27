function json(res, status, body) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { enabled: false, message: 'Method not allowed' });
  const q = String(req.query?.q || '').trim();
  if (!q) return json(res, 400, { enabled: false, message: 'Missing q' });
  if (!process.env.SERPAPI_KEY) return json(res, 200, { enabled: false, provider: 'SerpAPI', message: 'SERPAPI_KEY is not configured' });
  try {
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google_shopping');
    url.searchParams.set('q', q);
    url.searchParams.set('api_key', process.env.SERPAPI_KEY);
    url.searchParams.set('hl', 'en');
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok || data.error) throw new Error(data.error || `Provider returned ${r.status}`);
    const items = (data.shopping_results || []).slice(0, 20).map(x => ({
      title: x.title || '',
      price: x.price || x.extracted_price || '',
      source: x.source || x.merchant || 'Google Shopping',
      thumbnail: x.thumbnail || '',
      link: x.product_link || x.link || '',
    }));
    return json(res, 200, { enabled: true, provider: 'SerpAPI · Google Shopping', items });
  } catch (error) {
    return json(res, 502, { enabled: false, provider: 'SerpAPI', message: error?.message || 'Search provider failed' });
  }
}