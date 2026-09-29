const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8',...headers}});
const cors=env=>({'access-control-allow-origin':env.ALLOWED_ORIGIN||'*','access-control-allow-methods':'GET,POST,DELETE,OPTIONS','access-control-allow-headers':'content-type'});
const extFor=t=>({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif","image/avif":"avif"}[t]||'bin');
const randomId=()=>crypto.randomUUID().replaceAll('-','');
async function cleanup(env){let cursor;do{const page=await env.IMAGES.list({cursor,limit:1000});const now=Date.now();await Promise.all(page.objects.filter(o=>Number(o.customMetadata?.expiresAt||0)<now).map(o=>env.IMAGES.delete(o.key)));cursor=page.truncated?page.cursor:undefined;}while(cursor)}
export default {
  async fetch(req,env){
    const headers=cors(env); if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
    const url=new URL(req.url);
    if(url.pathname==='/api/health')return json({ok:true,storage:'r2'},200,headers);
    if(url.pathname==='/api/upload'&&req.method==='POST'){
      const type=(req.headers.get('content-type')||'').split(';')[0]; if(!type.startsWith('image/'))return json({error:'image_required'},415,headers);
      const declared=Number(req.headers.get('content-length')||0); if(declared>20*1024*1024)return json({error:'too_large'},413,headers);
      const body=await req.arrayBuffer(); if(body.byteLength>20*1024*1024)return json({error:'too_large'},413,headers);
      const ttl=Math.max(5,Math.min(120,Number(url.searchParams.get('ttl')||env.DEFAULT_TTL_MINUTES||30)));
      const id=randomId(),key=`temp/${id}.${extFor(type)}`,expiresAt=Date.now()+ttl*60_000;
      await env.IMAGES.put(key,body,{httpMetadata:{contentType:type,cacheControl:'public, max-age=300'},customMetadata:{expiresAt:String(expiresAt)}});
      const publicUrl=`${url.origin}/i/${id}.${extFor(type)}`; const deleteToken=await tokenFor(key,env);
      return json({url:publicUrl,expiresAt,deleteUrl:`${url.origin}/api/image/${encodeURIComponent(key)}?token=${deleteToken}`},201,headers);
    }
    if(url.pathname.startsWith('/i/')&&req.method==='GET'){
      const key='temp/'+url.pathname.slice(3); const obj=await env.IMAGES.get(key); if(!obj)return new Response('Not found',{status:404,headers});
      const expiresAt=Number(obj.customMetadata?.expiresAt||0); if(expiresAt&&expiresAt<Date.now()){await env.IMAGES.delete(key);return new Response('Expired',{status:410,headers});}
      return new Response(obj.body,{headers:{...headers,'content-type':obj.httpMetadata?.contentType||'application/octet-stream','cache-control':'public, max-age=300','x-content-type-options':'nosniff'}});
    }
    if(url.pathname.startsWith('/api/image/')&&req.method==='DELETE'){
      const key=decodeURIComponent(url.pathname.slice('/api/image/'.length)); if(url.searchParams.get('token')!==await tokenFor(key,env))return json({error:'forbidden'},403,headers);
      await env.IMAGES.delete(key); return json({ok:true},200,headers);
    }
    // Optional federated product search adapter. Set SERPAPI_KEY as a Worker secret.
    if(url.pathname==='/api/product-search'&&req.method==='GET'){
      const q=(url.searchParams.get('q')||'').trim(); if(!q)return json({error:'query_required'},400,headers); if(q.length>240)return json({error:'query_too_long'},400,headers);
      if(!env.SERPAPI_KEY)return json({enabled:false,provider:'serpapi',message:'SERPAPI_KEY is not configured'},501,headers);
      const api=new URL('https://serpapi.com/search.json');api.searchParams.set('engine','google_shopping');api.searchParams.set('q',q);api.searchParams.set('api_key',env.SERPAPI_KEY);api.searchParams.set('hl','en');
      const r=await fetch(api);if(!r.ok)return json({error:'provider_failed',status:r.status},502,headers);const data=await r.json();
      const items=(data.shopping_results||[]).slice(0,20).map(x=>({title:x.title,price:x.price,source:x.source,link:x.link,thumbnail:x.thumbnail,rating:x.rating,reviews:x.reviews}));
      return json({enabled:true,provider:'serpapi',items},200,headers);
    }
    // Optional supplier lead search. Uses the same SERPAPI_KEY and limits results to major B2B marketplaces.
    if(url.pathname==='/api/supplier-search'&&req.method==='GET'){
      const q=(url.searchParams.get('q')||'').trim(); if(!q)return json({error:'query_required'},400,headers);
      if(!env.SERPAPI_KEY)return json({enabled:false,provider:'serpapi',message:'SERPAPI_KEY is not configured'},501,headers);
      const supplierQuery=`${q} (site:alibaba.com OR site:made-in-china.com OR site:globalsources.com)`;
      const api=new URL('https://serpapi.com/search.json');api.searchParams.set('engine','google');api.searchParams.set('q',supplierQuery);api.searchParams.set('api_key',env.SERPAPI_KEY);api.searchParams.set('hl','en');api.searchParams.set('num','20');
      const r=await fetch(api);if(!r.ok)return json({error:'provider_failed',status:r.status},502,headers);const data=await r.json();
      const items=(data.organic_results||[]).slice(0,20).map(x=>({title:x.title,source:x.source||domainOf(x.link),link:x.link,snippet:x.snippet||'',position:x.position}));
      return json({enabled:true,provider:'serpapi',items},200,headers);
    }
    return json({name:'搜图 Pro temporary image service',ok:true},200,headers);
  },
  async scheduled(_event,env){await cleanup(env)}
};
function domainOf(link=''){try{return new URL(link).hostname.replace(/^www\./,'')}catch{return''}}
async function tokenFor(key,env){const secret=env.DELETE_SECRET||'change-me-in-production';const data=new TextEncoder().encode(key);const cryptoKey=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',cryptoKey,data);return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,32)}