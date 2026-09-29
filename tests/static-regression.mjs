import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html');
const app=read('app.js');
const v9=read('v9.js');
const css=read('styles.css');
const v9css=read('v9.css');
const config=read('config.js');
const sw=read('sw.js');
const build=read('build-static.mjs');
const manifest=JSON.parse(read('extension/manifest.json'));
const pkg=JSON.parse(read('package.json'));
const cleanup=read('api/cleanup.js');
const productApi=read('api/product-search.js');
const supplierApi=read('api/supplier-search.js');
const extBg=read('extension/background.js');
const extPopup=read('extension/popup.js');
const collector=read('extension/collector.js');

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,'duplicate HTML ids');
const refs=[...app.matchAll(/\$\('#([^']+)'\)/g),...v9.matchAll(/\$\('#([^']+)'\)/g)].map(m=>m[1]);
const missing=[...new Set(refs.filter(x=>!ids.includes(x)))];
assert.deepEqual(missing,[],'JS references missing HTML ids');

for(const view of ['searchView','batchView','projectsView','researchHubView','historyView','tipsView']) assert(ids.includes(view),`missing view ${view}`);
for(const nav of ['search','batch','projects','research','history']) assert(html.includes(`data-nav="${nav}"`),`missing nav ${nav}`);
assert(html.includes('./v9.css')&&html.includes('./v9.js'),'V9 assets missing from HTML');
assert(build.includes("'v9.css'")&&build.includes("'v9.js'"),'V9 assets missing from static build');
assert(sw.includes('/v9.css')&&sw.includes('/v9.js'),'V9 assets missing from service worker');
assert(config.includes("tempUploadProvider: 'vercel'"),'Vercel Blob provider missing');
assert(cleanup.includes('CRON_SECRET')&&cleanup.includes('x-vercel-cron-schedule'),'cleanup cron authorization guard missing');
assert(productApi.includes('AbortSignal.timeout(10000)'),'product provider timeout missing');
assert(supplierApi.includes('AbortSignal.timeout(10000)'),'supplier provider timeout missing');

const engineBlock=app.slice(app.indexOf('const builtinEngines'),app.indexOf('const presets'));
const engineIds=[...engineBlock.matchAll(/id:'([^']+)'/g)].map(m=>m[1]);
const iconUrls=[...engineBlock.matchAll(/iconUrl:'([^']+)'/g)].map(m=>m[1]);
assert.equal(engineIds.length,10,'expected 10 built-in engines');
assert.equal(iconUrls.length,engineIds.length,'every built-in engine must have a real icon URL');
assert(!engineBlock.includes("short:'"),'letter-only built-in engine marks are forbidden');
assert(engineBlock.includes('gstatic.com/images/branding/product/2x/lens_96dp.png'),'Google Lens must use Google-hosted Lens artwork');
for(const domain of ['bing.com','yandex.com','tineye.com','saucenao.com','trace.moe','ascii2d.net','iqdb.org']) assert(engineBlock.includes(domain),`missing official engine asset: ${domain}`);
assert(app.includes('function engineBrand'),'brand renderer missing');
assert(app.includes('execution-engine-brand'),'execution modal must use engine brands');
assert(!app.includes('images/searchbyimage/upload'),'obsolete Bing upload URL returned');
const popupCalls=[...app.matchAll(/window\.open\s*\(([^\n;]+)/g)].map(m=>m[1]);
assert(popupCalls.length<=4,'unexpected script popup calls');
assert(popupCalls.every(x=>x.includes("'about:blank'")||x.includes("target,'_blank','noopener,noreferrer'")),'execution flow may only pre-open a user-clicked blank tab or use explicit fallback');
assert(app.includes('function openExecutionEngine'),'dynamic execution opener missing');
assert(app.includes('data-execution-open'),'click-time execution controls missing');
assert(!app.includes('data-execution-link'),'stale fixed execution links must not remain');
assert(!app.includes('location.assign(target)'),'blocked popup fallback must never navigate the workbench away');
assert(app.includes('function prepareSearchPopup'),'search popup preparation UI missing');
assert(html.includes('id="engineHealthBtn"')&&html.includes('id="engineHealthSummary"'),'engine health controls missing');
assert(app.includes('forceTempLink')&&app.includes('增强直连'),'remote rehosting flow missing');
assert(app.includes('data-open-batch-engine')&&app.includes('function openBatchEngine'),'batch results must refresh targets at click time');
assert(app.includes("id:'industrial'"),'industrial product preset missing');
assert(html.includes('1–6 快速切换'),'preset shortcut copy is stale');

assert(manifest.manifest_version===3,'extension must use Manifest V3');
for(const p of ['scripting','activeTab','downloads']) assert(manifest.permissions.includes(p),`extension permission missing: ${p}`);
assert(manifest.version.startsWith('2.'),'collector extension must be 2.x');
assert(extBg.includes("importScripts('collector.js')"),'collector not loaded in service worker');
assert(collector.includes('function soutuCollectPage'),'collector function missing');
assert(extBg.includes('soutu-pro.vercel.app')&&extPopup.includes('soutu-pro.vercel.app'),'extension still points at an old deployment');
assert(!extBg.includes('netlify.app')&&!extPopup.includes('netlify.app'),'stale Netlify URL in extension');

assert(css.includes('.engine-brand img'),'engine brand image CSS missing');
assert(css.includes('.execution-engine-brand'),'execution brand CSS missing');
assert(v9css.includes('#researchHubView'),'V9 research CSS missing');
assert(v9.includes('SOUTU_V9')||v9.includes('V9_VERSION'),'V9 runtime marker missing');
assert(v9.includes(`const V9_VERSION = '${pkg.version}';`),'V9 runtime/package version mismatch');
assert(app.includes(`const APP_VERSION='${pkg.version}';`),'main runtime/package version mismatch');
assert(html.includes(`id="versionBadge"`)&&html.includes(`v${pkg.version}`),'visible version badge mismatch');
assert(html.includes(`?v=${pkg.version}`),'frontend cache-bust version mismatch');
assert(sw.includes(`soutu-pro-v${pkg.version.replaceAll('.','-')}-shell`),'service worker cache version stale');
assert(sw.includes("url.pathname.startsWith('/api/')"),'service worker must bypass API routes');
assert(sw.includes("req.mode==='navigate'"),'service worker navigation fallback guard missing');
assert(!sw.includes("r||caches.match('/index.html')"),'service worker must not HTML-fallback arbitrary GET requests');
assert(app.includes("https://s.globalsources.com/favicon.ico"),'Global Sources must use working official favicon host');
assert(css.includes('.engine-brand img{display:block;width:32px;height:32px'),'official engine logos must be visually primary');

console.log(JSON.stringify({
  passed:true,
  htmlIds:ids.length,
  jsSelectorRefs:refs.length,
  engines:engineIds,
  extensionVersion:manifest.version
},null,2));
