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
assert(!/window\.open\s*\(/.test(app),'script popups must not be used');
assert(app.includes('data-execution-link'),'native execution links missing');
assert(app.includes('batch-links'),'batch results must be native links');
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
assert(html.includes(`?v=${pkg.version}`),'frontend cache-bust version mismatch');
assert(sw.includes('soutu-pro-v9-1-1-shell'),'service worker cache version stale');
assert(app.includes("https://s.globalsources.com/favicon.ico"),'Global Sources must use working official favicon host');
assert(css.includes('.engine-brand img{display:block;width:32px;height:32px'),'official engine logos must be visually primary');

console.log(JSON.stringify({
  passed:true,
  htmlIds:ids.length,
  jsSelectorRefs:refs.length,
  engines:engineIds,
  extensionVersion:manifest.version
},null,2));
