import assert from 'node:assert/strict';
import fs from 'node:fs';

const base=process.env.SOUTU_PRO_URL||'https://soutu-pro.vercel.app';
const version=JSON.parse(fs.readFileSync('package.json','utf8')).version;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function get(url,opts={}){const r=await fetch(url,opts);return r}
async function waitForDeployment(){
  const deadline=Date.now()+180000;
  let last='';
  while(Date.now()<deadline){
    try{
      const r=await get(base+'/?qa='+Date.now(),{headers:{'cache-control':'no-cache'}});
      last=await r.text();
      if(r.ok&&last.includes(`?v=${version}`))return last;
    }catch{}
    await sleep(5000);
  }
  throw new Error(`Production did not reach version ${version} in time`);
}

const html=await waitForDeployment();
assert(html.includes('data-nav="research"'),'research nav missing in production');
for(const asset of ['app.js','v9.js','styles.css','v9.css','perspective-worker.js','manifest.webmanifest']){
  const r=await get(`${base}/${asset}?qa=${Date.now()}`);
  assert.equal(r.status,200,`${asset} status`);
}

const app=await (await get(`${base}/app.js?v=${version}&qa=${Date.now()}`)).text();
assert(app.includes('function engineBrand'),'official brand renderer missing');
assert(!app.includes("short:'G'"),'letter engine marks returned');
assert(!app.includes('images/searchbyimage/upload'),'obsolete Bing path returned');
const popupCalls=[...app.matchAll(/window\.open\s*\(([^\n;]+)/g)].map(m=>m[1]);
assert(popupCalls.length<=4,'unexpected popup script returned');
assert(app.includes('function openExecutionEngine'),'dynamic execution opener missing');

const official=[
  'https://www.gstatic.com/images/branding/product/2x/lens_96dp.png',
  'https://www.bing.com/favicon.ico',
  'https://yandex.com/favicon.ico',
  'https://tineye.com/favicon.ico',
  'https://saucenao.com/favicon.ico',
  'https://trace.moe/favicon.svg',
  'https://ascii2d.net/favicon.ico',
  'https://iqdb.org/favicon.ico',
  'https://s.globalsources.com/favicon.ico'
];
for(const url of official){
  const r=await get(`${base}/api/image-proxy?url=${encodeURIComponent(url)}`);
  assert.equal(r.status,200,`official icon proxy failed: ${url}`);
  assert.match(r.headers.get('content-type')||'',/^image\//,`official icon content type: ${url}`);
}

let r=await get(`${base}/api/image-proxy?url=${encodeURIComponent('http://127.0.0.1/private.png')}`);
assert.equal(r.status,400,'private image proxy target must be blocked');
let j=await r.json(); assert.match(j.error||'',/Private/i);

r=await get(`${base}/api/url-status?url=${encodeURIComponent(base+'/')}`);
assert.equal(r.status,200,'url-status public page');
j=await r.json();assert.equal(j.alive,true,'production URL should be alive');

r=await get(`${base}/api/url-status?url=${encodeURIComponent('http://127.0.0.1/')}`);
assert.equal(r.status,200);j=await r.json();assert.equal(j.alive,false);assert.match(j.error||'',/Private/i);

for(const endpoint of ['product-search','supplier-search']){
  r=await get(`${base}/api/${endpoint}`);
  assert.equal(r.status,400,`${endpoint} missing q must be 400`);
}

r=await get(`${base}/api/temp-token`);
assert.equal(r.status,405,'temp-token GET must stay disabled');

r=await get(`${base}/api/cleanup`);
assert.equal(r.status,401,'cleanup must reject unauthenticated requests');

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
r=await get(`${base}/api/temp-token?ttl=5&size=${png.length}&contentType=image/png`,{method:'POST'});
assert.equal(r.status,200,'Blob token request');
j=await r.json();
for(const k of ['uploadUrl','url','deleteUrl','expiresAt'])assert(j[k],`Blob token missing ${k}`);
r=await fetch(j.uploadUrl,{method:'PUT',headers:{'content-type':'image/png'},body:png});
assert(r.ok,`Blob PUT failed ${r.status}`);
r=await fetch(j.url,{cache:'no-store'});
assert(r.ok,`Blob GET failed ${r.status}`);
assert((await r.arrayBuffer()).byteLength>0,'Blob GET returned empty body');
r=await fetch(j.deleteUrl,{method:'DELETE'});
assert(r.ok,`Blob DELETE failed ${r.status}`);

console.log(JSON.stringify({passed:true,version,base,officialIcons:official.length,blobRoundTrip:true,ssrfGuards:true},null,2));
