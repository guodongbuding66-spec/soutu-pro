import assert from 'node:assert/strict';
import fs from 'node:fs';

const base=process.env.SOUTU_PRO_URL||'https://soutu-pro.vercel.app';
const version=JSON.parse(fs.readFileSync('package.json','utf8')).version;
const expectedCommit=String(process.env.SOUTU_EXPECTED_COMMIT||process.env.GITHUB_SHA||'').trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function get(url,opts={}){return fetch(url,{cache:'no-store',...opts})}
async function waitForDeployment(){
  const deadline=Date.now()+240000;
  let lastRelease=null,lastStatus=0;
  while(Date.now()<deadline){
    try{
      const stamp=Date.now();
      const [releaseResponse,pageResponse]=await Promise.all([
        get(`${base}/release.json?qa=${stamp}`,{headers:{'cache-control':'no-cache'}}),
        get(`${base}/?qa=${stamp}`,{headers:{'cache-control':'no-cache'}})
      ]);
      lastStatus=releaseResponse.status;
      if(releaseResponse.ok){
        lastRelease=await releaseResponse.json();
        const html=await pageResponse.text();
        const versionReady=lastRelease.version===version&&html.includes(`?v=${version}`);
        const commitReady=!expectedCommit||lastRelease.commit===expectedCommit;
        if(pageResponse.ok&&versionReady&&commitReady)return{html,release:lastRelease};
      }
    }catch{}
    await sleep(5000);
  }
  throw new Error(`Production did not reach ${version}${expectedCommit?` @ ${expectedCommit}`:''}; last release status=${lastStatus}, payload=${JSON.stringify(lastRelease)}`);
}

const {html,release}=await waitForDeployment();
assert.equal(release.version,version,'release version mismatch');
if(expectedCommit)assert.equal(release.commit,expectedCommit,'release commit mismatch');
assert(html.includes('data-nav="research"'),'research nav missing in production');

for(const asset of ['app.js','v9.js','styles.css','v9.css','perspective-worker.js','manifest.webmanifest','config.js','price-intelligence.js','price-history.js']){
  const r=await get(`${base}/${asset}?qa=${Date.now()}`);
  assert.equal(r.status,200,`${asset} status`);
}

const [app,priceModule,historyModule]=await Promise.all([
  get(`${base}/app.js?v=${version}&qa=${Date.now()}`).then(r=>r.text()),
  get(`${base}/price-intelligence.js?v=${version}&qa=${Date.now()}`).then(r=>r.text()),
  get(`${base}/price-history.js?v=${version}&qa=${Date.now()}`).then(r=>r.text())
]);
assert(app.includes('function engineBrand'),'official brand renderer missing');
assert(!app.includes("short:'G'"),'letter engine marks returned');
assert(!app.includes('images/searchbyimage/upload'),'obsolete Bing path returned');
const popupCalls=[...app.matchAll(/window\.open\s*\(([^\n;]+)/g)].map(m=>m[1]);
assert(popupCalls.length<=4,'unexpected popup script returned');
assert(app.includes('function openExecutionEngine'),'dynamic execution opener missing');
assert(priceModule.includes('SOUTU_PRICE_INTELLIGENCE')&&priceModule.includes('ignoredResponses')&&priceModule.includes('anomalyCount'), 'hardened price intelligence module missing');
assert(historyModule.includes('SOUTU_PRICE_HISTORY')&&historyModule.includes('soutu-price-history-v1')&&historyModule.includes('Best Offer'),'price history module missing');

let r=await get(`${base}/api/fx-rates?base=USD&quotes=EUR&qa=${Date.now()}`);
assert.notEqual(r.status,404,'FX route missing');
let j=await r.json();
assert.equal(j.enabled,true,'FX route disabled');
assert.match(j.provider||'',/Frankfurter/i,'unexpected FX provider');
assert(Number(j.rates?.EUR)>0,'EUR FX rate missing');

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
  r=await get(`${base}/api/image-proxy?url=${encodeURIComponent(url)}`);
  assert.equal(r.status,200,`official icon proxy failed: ${url}`);
  assert.match(r.headers.get('content-type')||'',/^image\//,`official icon content type: ${url}`);
}

r=await get(`${base}/api/image-proxy?url=${encodeURIComponent('http://127.0.0.1/private.png')}`);
assert.equal(r.status,400,'private image proxy target must be blocked');
j=await r.json(); assert.match(j.error||'',/Private/i);

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

console.log(JSON.stringify({passed:true,version,commit:release.commit,base,officialIcons:official.length,blobRoundTrip:true,ssrfGuards:true,priceHistory:true,fx:true},null,2));
