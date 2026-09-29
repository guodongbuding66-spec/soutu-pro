const MAX_QUERY = 160;
const MAX_PER_PROVIDER = 12;

function cleanQuery(value='') {
  return String(value).trim().replace(/\s+/g, ' ').slice(0, MAX_QUERY);
}
function safeUrl(value='') {
  try { const u = new URL(value); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; }
}
function textOnly(value='') {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
async function jsonFetch(url, options={}, timeout=7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal, headers: { 'user-agent':'soutu-pro/9', ...(options.headers||{}) } });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return data;
  } finally { clearTimeout(timer); }
}
function item(provider, data={}) {
  return {
    provider,
    type: data.type || 'post',
    title: textOnly(data.title || 'Untitled').slice(0, 240),
    snippet: textOnly(data.snippet || '').slice(0, 500),
    link: safeUrl(data.link),
    thumbnail: safeUrl(data.thumbnail),
    author: textOnly(data.author || '').slice(0, 120),
    publishedAt: data.publishedAt || null,
    meta: data.meta || {}
  };
}

async function wikimedia(q) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({
    action:'query', format:'json', origin:'*', generator:'search',
    gsrsearch:q, gsrnamespace:'6', gsrlimit:String(MAX_PER_PROVIDER),
    prop:'imageinfo', iiprop:'url|size|mime|timestamp|user'
  });
  const d = await jsonFetch(url);
  return Object.values(d?.query?.pages || {}).map(p => {
    const i = p.imageinfo?.[0] || {};
    return {p,i};
  }).filter(({i}) => String(i.mime || '').startsWith('image/')).map(({p,i}) => item('Wikimedia Commons', {
      type:'image', title:p.title?.replace(/^File:/,'') || 'Wikimedia image',
      link:`https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title || '')}`,
      thumbnail:i.thumburl || i.url, author:i.user, publishedAt:i.timestamp,
      meta:{width:i.width,height:i.height,mime:i.mime}
    }));
}

async function bluesky(q) {
  const url = new URL('https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(MAX_PER_PROVIDER));
  url.searchParams.set('sort', 'top');
  const d = await jsonFetch(url);
  return (d?.posts || []).map(p => {
    const author = p.author?.displayName || p.author?.handle || '';
    const postId = String(p.uri || '').split('/').pop();
    const handle = p.author?.handle || '';
    const image = p.embed?.images?.[0]?.thumb || p.embed?.media?.images?.[0]?.thumb || '';
    return item('Bluesky', {
      type:image?'image':'post',
      title:(p.record?.text || '').slice(0,140) || `Post by ${author}`,
      snippet:p.record?.text || '', author,
      link: handle && postId ? `https://bsky.app/profile/${handle}/post/${postId}` : '',
      thumbnail:image, publishedAt:p.record?.createdAt || p.indexedAt,
      meta:{likes:p.likeCount,reposts:p.repostCount,replies:p.replyCount}
    });
  });
}

async function mastodon(q) {
  const url = new URL('https://mastodon.social/api/v2/search');
  url.searchParams.set('q', q);
  url.searchParams.set('type', 'statuses');
  url.searchParams.set('limit', String(MAX_PER_PROVIDER));
  const d = await jsonFetch(url);
  return (d?.statuses || []).map(s => {
    const media = s.media_attachments?.[0];
    return item('Mastodon', {
      type:media?.type === 'image' ? 'image' : 'post',
      title:textOnly(s.content).slice(0,140) || `Post by ${s.account?.display_name || s.account?.acct || ''}`,
      snippet:s.content, author:s.account?.display_name || s.account?.acct,
      link:s.url, thumbnail:media?.preview_url || media?.url,
      publishedAt:s.created_at, meta:{favourites:s.favourites_count,reblogs:s.reblogs_count,replies:s.replies_count}
    });
  });
}


async function openverse(q) {
  const url = new URL('https://api.openverse.org/v1/images/');
  url.searchParams.set('q', q);
  url.searchParams.set('page_size', String(MAX_PER_PROVIDER));
  url.searchParams.set('mature', 'false');
  const d = await jsonFetch(url);
  return (d?.results || []).map(p => item('Openverse', {
    type:'image', title:p.title || `Image by ${p.creator || 'Openverse creator'}`,
    snippet:[p.license ? `License: ${p.license}` : '', p.source ? `Source: ${p.source}` : ''].filter(Boolean).join(' · '),
    link:p.foreign_landing_url || p.detail_url || p.url,
    thumbnail:p.thumbnail || p.url, author:p.creator,
    meta:{width:p.width,height:p.height,license:p.license,source:p.source}
  }));
}

async function nasaImages(q) {
  const url = new URL('https://images-api.nasa.gov/search');
  url.searchParams.set('q', q);
  url.searchParams.set('media_type', 'image,video');
  url.searchParams.set('page_size', String(MAX_PER_PROVIDER));
  const d = await jsonFetch(url);
  return (d?.collection?.items || []).map(row => {
    const meta = row.data?.[0] || {}, preview = row.links?.find(x => x.render === 'image')?.href || '';
    return item('NASA Images', {
      type:meta.media_type === 'video' ? 'video' : 'image',
      title:meta.title || meta.nasa_id || 'NASA media',
      snippet:meta.description || meta.description_508 || '',
      link:meta.nasa_id ? `https://images.nasa.gov/details/${encodeURIComponent(meta.nasa_id)}` : row.href,
      thumbnail:preview, author:meta.photographer || meta.secondary_creator || 'NASA',
      publishedAt:meta.date_created, meta:{nasaId:meta.nasa_id,center:meta.center,keywords:meta.keywords}
    });
  });
}

async function internetArchive(q) {
  const url = new URL('https://archive.org/advancedsearch.php');
  url.searchParams.set('q', `(${q}) AND (mediatype:image OR mediatype:movies)`);
  url.searchParams.set('fl[]', 'identifier,title,creator,date,mediatype');
  url.searchParams.set('rows', String(MAX_PER_PROVIDER));
  url.searchParams.set('page', '1');
  url.searchParams.set('output', 'json');
  const d = await jsonFetch(url);
  return (d?.response?.docs || []).map(x => {
    const id = x.identifier;
    const type = x.mediatype === 'movies' ? 'video' : 'image';
    return item('Internet Archive', {
      type,
      title:x.title || id || 'Internet Archive item',
      snippet:[x.creator,x.date,x.mediatype].filter(Boolean).join(' · '),
      link:id ? `https://archive.org/details/${encodeURIComponent(id)}` : '',
      thumbnail:id ? `https://archive.org/services/img/${encodeURIComponent(id)}` : '',
      author:Array.isArray(x.creator)?x.creator.join(', '):(x.creator||''),
      publishedAt:x.date ? (/^\d{4}-\d{2}-\d{2}/.test(String(x.date)) ? String(x.date) : /^\d{4}$/.test(String(x.date)) ? `${x.date}-01-01` : null) : null,
      meta:{mediatype:x.mediatype}
    });
  });
}

async function artInstitute(q) {
  const url = new URL('https://api.artic.edu/api/v1/artworks/search');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(MAX_PER_PROVIDER));
  url.searchParams.set('fields', 'id,title,artist_display,date_display,image_id,thumbnail,is_public_domain');
  const d = await jsonFetch(url, {headers:{'AIC-User-Agent':'soutu-pro'}});
  const iiif = d?.config?.iiif_url || 'https://www.artic.edu/iiif/2';
  return (d?.data || []).filter(x => x.image_id).map(x => item('Art Institute Chicago', {
    type:'image', title:x.title || 'Artwork',
    snippet:[x.artist_display, x.date_display].filter(Boolean).join(' · '),
    link:`https://www.artic.edu/artworks/${x.id}`,
    thumbnail:`${iiif}/${x.image_id}/full/843,/0/default.jpg`,
    author:x.artist_display || '', meta:{publicDomain:!!x.is_public_domain}
  }));
}

async function libraryCongress(q) {
  const url = new URL('https://www.loc.gov/photos/');
  url.searchParams.set('q', q);
  url.searchParams.set('fo', 'json');
  url.searchParams.set('c', String(MAX_PER_PROVIDER));
  url.searchParams.set('at', 'results');
  const d = await jsonFetch(url);
  const rows = Array.isArray(d?.results) ? d.results : Array.isArray(d) ? d : [];
  return rows.map(x => {
    const img = Array.isArray(x.image_url) ? x.image_url[x.image_url.length - 1] : (x.image_url || '');
    const contributors = Array.isArray(x.contributor) ? x.contributor.join(', ') : (x.contributor || '');
    return item('Library of Congress', {
      type:'image', title:x.title || 'Library of Congress image',
      snippet:[x.date, x.description, x.location].flat().filter(Boolean).join(' · '),
      link:x.id || x.url, thumbnail:img, author:contributors,
      publishedAt:x.date ? (/^\d{4}-\d{2}-\d{2}/.test(String(x.date)) ? x.date : null) : null,
      meta:{format:x.original_format}
    });
  });
}

async function pixabay(q) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return null;
  const [images, videos] = await Promise.all([
    jsonFetch(`https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&per_page=8&safesearch=true`),
    jsonFetch(`https://pixabay.com/api/videos/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&per_page=4&safesearch=true`)
  ]);
  return [
    ...(images?.hits || []).map(p => item('Pixabay', {
      type:'image', title:p.tags || `Image by ${p.user || 'Pixabay creator'}`,
      link:p.pageURL, thumbnail:p.webformatURL || p.previewURL, author:p.user,
      meta:{width:p.imageWidth,height:p.imageHeight,likes:p.likes,downloads:p.downloads}
    })),
    ...(videos?.hits || []).map(v => item('Pixabay', {
      type:'video', title:v.tags || `Video by ${v.user || 'Pixabay creator'}`,
      link:v.pageURL, thumbnail:v.videos?.tiny?.thumbnail || v.videos?.small?.thumbnail || '',
      author:v.user, meta:{likes:v.likes,downloads:v.downloads,duration:v.duration}
    }))
  ];
}

async function youtube(q, filters={}) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  const params = new URLSearchParams({part:'snippet',q,type:'video',maxResults:String(MAX_PER_PROVIDER),key});
  if (filters.country && filters.country !== 'all') params.set('regionCode', filters.country);
  if (filters.language && filters.language !== 'all') params.set('relevanceLanguage', filters.language);
  if (filters.publishedAfter) params.set('publishedAfter', filters.publishedAfter);
  url.search = params;
  const d = await jsonFetch(url);
  return (d?.items || []).map(v => item('YouTube', {
    type:'video', title:v.snippet?.title, snippet:v.snippet?.description,
    link:`https://www.youtube.com/watch?v=${v.id?.videoId || ''}`,
    thumbnail:v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url,
    author:v.snippet?.channelTitle, publishedAt:v.snippet?.publishedAt
  }));
}

async function pexels(q) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  const [photos, videos] = await Promise.all([
    jsonFetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=8`, {headers:{Authorization:key}}),
    jsonFetch(`https://api.pexels.com/v1/videos/search?query=${encodeURIComponent(q)}&per_page=4`, {headers:{Authorization:key}})
  ]);
  return [
    ...(photos?.photos || []).map(p => item('Pexels', {type:'image',title:p.alt || `Photo by ${p.photographer}`,link:p.url,thumbnail:p.src?.medium || p.src?.small,author:p.photographer,meta:{width:p.width,height:p.height}})),
    ...(videos?.videos || []).map(v => item('Pexels', {type:'video',title:`Video by ${v.user?.name || 'Pexels creator'}`,link:v.url,thumbnail:v.image,author:v.user?.name,meta:{width:v.width,height:v.height,duration:v.duration}}))
  ];
}

async function unsplash(q) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  const d = await jsonFetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=${MAX_PER_PROVIDER}&client_id=${encodeURIComponent(key)}`);
  return (d?.results || []).map(p => item('Unsplash', {
    type:'image', title:p.alt_description || p.description || `Photo by ${p.user?.name || 'Unsplash creator'}`,
    link:p.links?.html, thumbnail:p.urls?.small, author:p.user?.name,
    publishedAt:p.created_at, meta:{width:p.width,height:p.height,color:p.color}
  }));
}

async function flickr(q) {
  const key = process.env.FLICKR_API_KEY;
  if (!key) return null;
  const url = new URL('https://www.flickr.com/services/rest/');
  url.search = new URLSearchParams({
    method:'flickr.photos.search', api_key:key, text:q, format:'json', nojsoncallback:'1',
    per_page:String(MAX_PER_PROVIDER), sort:'relevance', content_type:'1', media:'photos',
    extras:'url_m,url_q,owner_name,date_upload,date_taken'
  });
  const d = await jsonFetch(url);
  return (d?.photos?.photo || []).map(p => item('Flickr', {
    type:'image', title:p.title || `Photo by ${p.ownername || 'Flickr user'}`,
    link:`https://www.flickr.com/photos/${p.owner}/${p.id}`,
    thumbnail:p.url_m || p.url_q, author:p.ownername,
    publishedAt:p.datetaken || (p.dateupload ? new Date(Number(p.dateupload)*1000).toISOString() : null)
  }));
}

const providers = [
  ['Openverse', openverse, () => true],
  ['Wikimedia Commons', wikimedia, () => true],
  ['NASA Images', nasaImages, () => true],
  ['Art Institute Chicago', artInstitute, () => true],
  ['Library of Congress', libraryCongress, () => true],
  ['Internet Archive', internetArchive, () => true],
  ['Mastodon', mastodon, () => true],
  ['Bluesky', bluesky, () => true],
  ['YouTube', youtube, () => !!process.env.YOUTUBE_API_KEY],
  ['Pexels', pexels, () => !!process.env.PEXELS_API_KEY],
  ['Unsplash', unsplash, () => !!process.env.UNSPLASH_ACCESS_KEY],
  ['Pixabay', pixabay, () => !!process.env.PIXABAY_API_KEY],
  ['Flickr', flickr, () => !!process.env.FLICKR_API_KEY]
];

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({error:'Method not allowed'});
  const q = cleanQuery(req.query?.q);
  if (!q) return res.status(400).json({error:'Missing q'});
  const country = cleanQuery(req.query?.country || 'all');
  const language = cleanQuery(req.query?.language || 'all');
  const type = cleanQuery(req.query?.type || 'all');
  const time = cleanQuery(req.query?.time || 'all');
  const sinceMs = time === 'day' ? 86400000 : time === 'week' ? 604800000 : time === 'month' ? 2592000000 : time === 'year' ? 31536000000 : 0;
  const publishedAfter = sinceMs ? new Date(Date.now() - sinceMs).toISOString() : '';
  const filters = {country, language, type, time, publishedAfter};
  const requested = new Set(String(req.query?.providers || '').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean));
  const selected = requested.size ? providers.filter(([name]) => requested.has(name.toLowerCase().replace(/\s+/g,'-')) || requested.has(name.toLowerCase())) : providers.filter(([name]) => name !== 'Bluesky');
  const settled = await Promise.all(selected.map(async ([name, fn, configured]) => {
    const enabled = configured();
    if (!enabled) return {name, enabled:false, configured:false, items:[], message:'API key not configured'};
    try {
      let items = (await fn(q, filters)) || [];
      if (type !== 'all') items = items.filter(x => x.type === type);
      if (publishedAfter) {
        const cutoff = Date.parse(publishedAfter);
        items = items.filter(x => {
          const published = Date.parse(x.publishedAt || '');
          return Number.isFinite(published) && published >= cutoff;
        });
      }
      return {name, enabled:true, configured:true, items:items.filter(x=>x.link).slice(0,MAX_PER_PROVIDER)};
    } catch (error) {
      return {name, enabled:false, configured:true, items:[], message:error?.name==='AbortError'?'Request timed out':String(error?.message || 'Provider error').slice(0,160)};
    }
  }));
  const items = settled.flatMap(x => x.items);
  res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=600');
  return res.status(200).json({
    enabled:true, query:q, filters, items,
    providers:settled.map(({items,...rest}) => ({...rest,count:items.length})),
    total:items.length
  });
}
