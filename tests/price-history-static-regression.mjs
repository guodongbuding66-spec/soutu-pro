import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const history=read('price-history.js');
const fx=read('api/fx-rates.js');
const config=read('config.js');
const build=read('build-static.mjs');
const sw=read('sw.js');

assert(history.includes('window.SOUTU_PRICE_HISTORY'),'price history global API missing');
assert(history.includes('soutu-price-history-v1'),'price history persistence missing');
assert(history.includes('soutu-price-alerts-v1'),'price alert persistence missing');
assert(history.includes("c===state.base")&&history.includes('amount/Number(rate)'),'FX conversion guard missing');
assert(history.includes("return ISO.test(c)?c:''"),'ambiguous symbol currencies must not be converted');
assert(history.includes('Best Offer'),'Best Offer UI missing');
assert(history.includes('打开搜图 Pro'),'local-only alert disclosure missing');
assert(history.includes('identityCardKey')&&history.includes('data-price-identity-key'),'stable semantic identity mapping missing');
assert(!history.includes('function bestGroupForCard'),'title-text identity mapping must not return');
assert(history.includes('qualityPoints')&&history.includes('rejectedIngestSamples'),'historical price quality filtering missing');
assert(history.includes("return`mpn:${mpns[0]}`"),'MPN-only stable group key missing');
assert(history.includes('历史异常点不会计入最低价/趋势'),'history quality disclosure missing');
assert(fx.includes("https://api.frankfurter.dev/v2/rates"),'Frankfurter v2 fixed upstream missing');
assert(fx.includes("quotes.length>20"),'FX quote limit missing');
assert(config.includes('price-history.js'),'runtime loader missing price history module');
assert(config.includes('script.async=false'),'feature modules must preserve load order');
assert(build.includes("'price-history.js'"),'static build must copy price history module');
assert(build.includes("read('price-history.js')"),'standalone build must inline price history module');
assert(sw.includes("'/price-history.js'"),'service worker must precache price history module');

console.log('Price history / FX static regression passed');
