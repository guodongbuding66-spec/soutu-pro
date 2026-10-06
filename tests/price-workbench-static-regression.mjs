import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const wb=read('price-workbench.js');
const config=read('config.js');
const build=read('build-static.mjs');
const sw=read('sw.js');
const pkg=JSON.parse(read('package.json'));
const workflow=read('.github/workflows/e2e.yml');

assert(wb.includes("const VERSION='V9.5'"),'V9.5 workbench marker missing');
assert(wb.includes('data-price-workbench-v95'),'workbench root marker missing');
assert(wb.includes('priceComponents'),'landed-price component integration missing');
assert(wb.includes('sourceReliability'),'source reliability integration missing');
assert(wb.includes('mergeGroupHistory'),'history integration missing');
assert(wb.includes('convertToBase'),'FX normalized best-offer integration missing');
assert(wb.includes("row.parts.availability==='out-of-stock'"),'out-of-stock exclusion missing');
assert(wb.includes('同商家重复报价'),'duplicate merchant exclusion missing');
assert(wb.includes('同款置信度不足'),'identity confidence exclusion missing');
assert(wb.includes('来源可靠度不足'),'source reliability exclusion missing');
assert(wb.includes('最佳到手价'),'landed best-offer UI missing');
assert(wb.includes('商品价历史'),'history-vs-landed labeling missing');
assert(wb.includes('运费')&&wb.includes('税费')&&wb.includes('到手价'),'price components columns missing');
assert(wb.includes('data-wb-sort')&&wb.includes('data-wb-stock')&&wb.includes('data-wb-excluded'),'workbench controls missing');
assert(wb.includes('data-wb-alert-save')&&wb.includes('saveAlert'),'target alert bridge missing');
assert(wb.includes('.price-history-workbench{display:none!important}'),'legacy panel fallback hiding rule missing');
assert(config.includes('price-workbench.js'),'runtime loader missing workbench');
assert(build.includes("'price-workbench.js'"),'static build missing workbench');
assert(build.includes("read('price-workbench.js')"),'standalone build missing workbench');
assert(sw.includes('/price-workbench.js'),'service worker precache missing workbench');
assert(pkg.scripts.check.includes('node --check price-workbench.js'),'syntax check missing workbench');
assert(pkg.scripts.check.includes('price-workbench-static-regression.mjs'),'static regression missing workbench');
assert(workflow.includes('price-workbench.spec.mjs'),'browser regression missing workbench');
assert(workflow.includes('price-workbench-production-smoke.mjs'),'production smoke missing workbench');

console.log('Price Workbench static regression passed');
