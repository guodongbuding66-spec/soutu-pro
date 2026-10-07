const CACHE='soutu-pro-v9-4-5-shell';
const ASSETS=['/','/index.html','/styles.css','/v9.css','/app.js','/search-launch-bridge.js','/search-launch.html','/search-launch.js','/v9.js','/price-intelligence.js','/price-reliability.js','/competitor-intelligence-ui.js','/competitor-intelligence.js','/price-history.js','/provenance-lineage.js','/verification-audit.js','/evidence-verification.js','/perspective-worker.js','/config.js','/manifest.webmanifest','/icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==location.origin)return;
  if(url.pathname.startsWith('/api/'))return;
  if(req.mode==='navigate'){
    const navigationKey=url.pathname==='/'?'/index.html':/^\/search-launch(?:\.html)?$/.test(url.pathname)?'/search-launch.html':url.pathname;
    event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{
      const copy=res.clone();caches.open(CACHE).then(c=>c.put(navigationKey,copy));return res;
    }).catch(()=>caches.match(navigationKey).then(r=>r||Response.error())));
    return;
  }
  event.respondWith(fetch(req).then(res=>{
    if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy))}
    return res;
  }).catch(()=>caches.match(req).then(r=>r||Response.error())));
});