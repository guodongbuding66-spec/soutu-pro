import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const read=p=>fs.readFileSync(p,'utf8');
const feature=read('competitor-intelligence.js');
const ui=read('competitor-intelligence-ui.js');
const config=read('config.js');
const build=read('build-static.mjs');
const sw=read('sw.js');

assert(feature.includes('window.SOUTU_COMPETITOR_INTELLIGENCE'),'competitor intelligence global API missing');
assert(feature.includes("'gtin','asin','brand-mpn','brand-model','mpn','exact-url'"),'strong same-product identity gate missing');
assert(feature.includes('explicitGtinConflict'),'GTIN conflict isolation missing');
assert(feature.includes('supplierSignal'),'supplier detection missing');
assert(ui.includes('competitorIntelligenceBtn')&&ui.includes('competitorIntelligencePanel'),'competitor intelligence UI mount missing');
assert(config.indexOf('price-reliability.js')<config.indexOf('competitor-intelligence.js'),'competitor intelligence must load after price reliability');
assert(config.indexOf('competitor-intelligence.js')<config.indexOf('price-history.js'),'competitor intelligence must load before price history');
assert(build.includes("'competitor-intelligence.js'")&&build.includes("read('competitor-intelligence.js')"),'static build must copy and inline competitor intelligence');
assert(sw.includes("'/competitor-intelligence.js'")&&sw.includes("'/competitor-intelligence-ui.js'"),'service worker must precache competitor intelligence modules');

const html='<!doctype html><html><head></head><body><button id="competitorIntelligenceBtn"></button><div id="competitorIntelligencePanel" class="hidden"></div></body></html>';
const dom=new JSDOM(html,{url:'https://soutu.test/',runScripts:'dangerously',pretendToBeVisual:true});
const {window}=dom;
const A={title:'Acme 8x6 Metal Garden Shed Gray',link:'https://retail-a.test/acme-shed',price:'USD 399',product:{brand:'Acme',model:'S86',mpn:'S86-GY',gtin:'111'}};
const B={title:'Acme S86 Gray Garden Shed',link:'https://retail-b.test/acme-shed',price:'USD 419',product:{brand:'Acme',model:'S86',mpn:'S86-GY',gtin:'111'}};
const C={title:'Acme 8x6 Metal Garden Shed Charcoal',link:'https://retail-c.test/acme-competitor',price:'USD 389',product:{brand:'Acme',model:'S87',mpn:'S87-CH',gtin:'222'}};
const D={title:'8x6 Metal Garden Shed Manufacturer OEM Supplier',link:'https://supplier.alibaba.com/product/8x6-shed',price:'USD 210',provider:'Alibaba',snippet:'Factory wholesale OEM ODM manufacturer supplier',product:{brand:'FactoryCo',model:'OEM86',mpn:'OEM86'}};
const items=[A,B,C,D];
const norm=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const identity=x=>x.product||{};
const relation=(a,b)=>{
  const A=identity(a),B=identity(b),eq=(x,y)=>x&&y&&norm(x)===norm(y);
  if(A.gtin&&B.gtin&&!eq(A.gtin,B.gtin))return{level:'conflict',score:0,basis:'GTIN conflict'};
  if(eq(A.gtin,B.gtin))return{level:'gtin',score:.99,basis:'GTIN'};
  if(eq(A.brand,B.brand)&&eq(A.mpn,B.mpn))return{level:'brand-mpn',score:.94,basis:'Brand + MPN'};
  if(eq(A.brand,B.brand)&&eq(A.model,B.model))return{level:'brand-model',score:.9,basis:'Brand + Model'};
  return{level:'weak',score:.35,basis:'Weak match'};
};
window.SOUTU_PRICE_INTELLIGENCE={
  state:{items},identity,relation,
  parsePrice:x=>({amount:Number(String(x.price||'').match(/\d+(?:\.\d+)?/)?.[0]||0),currency:'USD',kind:'standard'}),
  groups:list=>[[A,B]].filter(g=>g.every(x=>list.includes(x)))
};
window.SOUTU_PRICE_RELIABILITY={sourceReliability:x=>x===D ? .84 : .8};
window.eval(feature);
const api=window.SOUTU_COMPETITOR_INTELLIGENCE;
assert(api,'competitor API failed to initialize');
const result=api.analyze(items);
assert.equal(result.same.length,1,'expected one strong same-product group');
assert.deepEqual(result.same[0].members,[A,B],'same-product group must only contain matching GTIN items');
assert(!result.same[0].members.includes(C),'GTIN-conflicting product must not enter same-product group');
assert(result.competitors.some(x=>x.item===C&&x.conflict),'different GTIN but similar product should remain a competitor candidate');
assert(result.suppliers.some(x=>x.item===D),'Alibaba manufacturer result should be a supplier candidate');
assert(result.suppliers.find(x=>x.item===D).reasons.some(x=>/B2B/.test(x)),'supplier candidate should expose B2B evidence');
window.document.querySelector('#competitorIntelligenceBtn').click();
const panel=window.document.querySelector('#competitorIntelligencePanel');
assert(!panel.classList.contains('hidden'),'competitor panel should open from its control');
assert(panel.textContent.includes('GTIN 冲突强制隔离'),'UI must explain GTIN conflict isolation');
assert(panel.textContent.includes('供应商候选'),'supplier section missing');
assert([...panel.querySelectorAll('a')].every(a=>a.target==='_blank'&&a.rel.includes('noopener')),'source links must open safely');

console.log('Competitor / supplier intelligence regression passed');