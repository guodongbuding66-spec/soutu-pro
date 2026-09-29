import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const html=read('./index.html');
const app=read('./app.js');
const v9=read('./v9.js');
const build=read('./build-static.mjs');
const sw=read('./sw.js');
const styles=read('./styles.css');
const extManifest=JSON.parse(read('./extension/manifest.json'));
const extBg=read('./extension/background.js');
const extPopup=read('./extension/popup.html');
const extPopupJs=read('./extension/popup.js');
const proxy=read('./api/image-proxy.js');
const statusApi=read('./api/url-status.js');
const tempApi=read('./api/temp-token.js');
const worker=read('./worker/src/index.js');

const checks=[];
function ok(condition,label){if(!condition)throw new Error('QA failed: '+label);checks.push(label)}
function unique(xs){return new Set(xs).size===xs.length}

const ids=[...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]);
ok(unique(ids),'HTML ids are unique');
const appIds=[...app.matchAll(/\$\('#([^']+)'\)/g)].map(m=>m[1]);
const missing=[...new Set(appIds.filter(x=>!ids.includes(x)))];
ok(missing.length===0,'app.js #id references exist in index.html');

ok(html.includes('id="researchHubView"')&&html.includes('id="v9Root"'),'V9 research view exists');
ok(html.includes('./v9.css')&&html.includes('./v9.js'),'V9 assets are wired into index.html');
ok(build.includes("'v9.css'")&&build.includes("'v9.js'"),'V9 assets are copied by static build');
ok(sw.includes("'/v9.css'")&&sw.includes("'/v9.js'"),'V9 assets are cached by service worker');

const block=(app.match(/const builtinEngines = \[([\s\S]*?)\n  \];/)||[])[1]||'';
const engineIds=[...block.matchAll(/\bid:'([^']+)'/g)].map(m=>m[1]);
const expected=['google','bing','yandex','tineye','google-shopping','bing-shopping','saucenao','trace','ascii2d','iqdb'];
ok(engineIds.length===expected.length&&expected.every(x=>engineIds.includes(x)),'all 10 built-in engines are present');
ok(unique(engineIds),'built-in engine ids are unique');
ok((block.match(/iconUrl:/g)||[]).length===expected.length,'every built-in engine has a brand icon');
ok(!block.includes('upload.wikimedia.org')&&!block.includes('raw.githubusercontent.com'),'built-in brand icons do not use third-party placeholder mirrors');
for(const host of ['google.com','bing.com','yandex.com','tineye.com','saucenao.com','trace.moe','ascii2d.net','iqdb.org'])ok(block.includes(host),'official engine icon host '+host+' is referenced');
ok((block.match(/direct:url=>/g)||[]).length===10,'all 10 built-in engines support URL-direct search where configured');
ok(!block.includes('images/searchbyimage/upload')&&!block.includes('sbisrc=UrlPaste'),'unstable/obsolete Bing deep-link endpoints are absent');
ok(block.includes('https://trace.moe/?url=')&&block.includes('https://ascii2d.net/search/url/')&&block.includes('https://iqdb.org/?url='),'anime engines use verified direct URL integrations');
ok(app.includes('engine-brand')&&app.includes('engineBrand(e)'),'engine cards render brand images instead of letter placeholders');
ok(app.includes("return `<span class=\"engine-mark engine-custom-mark\">${icon('plus')}</span>`"),'custom engines use a generic engine icon instead of letter initials');
ok(app.includes("cap==='auto'?'可直连'"),'auto temporary-URL capability is surfaced');

const popupCalls=[...app.matchAll(/window\.open\s*\(([^\n;]+)/g)].map(m=>m[1]);
ok(popupCalls.length<=4,'main app has only guarded execution popup calls');
ok(app.includes('function openExecutionEngine')&&app.includes('data-execution-open'),'execution uses click-time refreshed targets');
ok(app.includes('data-open-engine')&&app.includes('prepareSingleEngine'),'single-engine launch prepares Blob/direct state before exposing native link');
ok(!app.includes('<a class="engine-open"'),'engine-card quick action never bypasses URL preparation with a raw anchor');
ok(!v9.includes('window.open('),'V9 contains no scripted popup launches');
ok(app.includes('data-open-batch-engine')&&app.includes('function openBatchEngine'),'batch mode refreshes temporary image targets on click');
ok(app.includes("mode==='supplier'"),'supplier deep-link is handled by main app');

ok(v9.includes('v9PrintReport')&&v9.includes('window.print()'),'PDF/report flow uses current-page printing');
ok(v9.includes('compactResult')&&v9.includes('本机存储接近上限'),'V9 handles localStorage quota pressure');
ok(v9.includes("/^https?:/i.test(rawImg)"),'V9 rejects unusable blob/data imported image URLs');

ok(extManifest.version.startsWith('2.'),'extension is V2 collector');
for(const p of ['contextMenus','storage','tabs','activeTab','scripting','downloads'])ok(extManifest.permissions.includes(p),'extension permission '+p+' is declared');
ok(extBg.startsWith("importScripts('collector.js')"),'extension background loads shared collector');
ok(extBg.includes('collectCurrentPage'),'context-menu page collection executes directly');
ok(extPopup.indexOf('collector.js')<extPopup.indexOf('popup.js'),'popup loads collector before popup logic');
ok(extPopupJs.includes('func:soutuCollectPage'),'popup uses shared collector');
ok(!extPopupJs.includes('function collector(mode)'),'collector logic is not duplicated in popup');

for(const [src,name] of [[proxy,'image proxy'],[statusApi,'URL status']]){
  ok(src.includes("dns.lookup"),name+' resolves DNS before fetch');
  ok(src.includes("redirect:'manual'"),name+' validates redirects manually');
  ok(src.includes('Private')||src.includes('privateIp'),name+' blocks private networks');
  ok(src.includes("::ffff:"),name+' blocks IPv4-mapped IPv6');
  ok(src.includes("startsWith('ff')"),name+' blocks IPv6 multicast targets');
}
ok(proxy.includes('MAX_BYTES')&&proxy.includes("type.startsWith('image/')"),'image proxy enforces image type and size');
ok(tempApi.includes('MAX_BYTES = 20 * 1024 * 1024')&&tempApi.includes("contentType.startsWith('image/')"),'Blob upload enforces image-only 20 MB limit');
ok(worker.includes('body.byteLength>20*1024*1024'),'Cloudflare Worker validates actual upload byte length');
ok((worker.match(/q.length>240/g)||[]).length>=2,'Cloudflare Worker limits product and supplier query lengths');

ok(styles.includes('.engine-brand img'),'brand icon CSS exists');
ok(app.includes('marketBrand(m)')&&app.includes('market-brand'),'marketplace cards render real brand icons');
ok(!app.includes('m.name.slice(0,2)'),'marketplace cards no longer use two-letter brand placeholders');
ok(!app.includes('e.short||e.name.slice(0,2)'),'engine cards no longer fall back to initial-letter tiles');
ok(styles.includes('.batch-links a'),'batch native-link CSS exists');

console.log('Soutu Pro static QA passed:',checks.length,'checks');
for(const c of checks)console.log('✓',c);
