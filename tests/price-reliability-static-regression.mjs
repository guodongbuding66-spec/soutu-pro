import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const reliability=read('price-reliability.js');
const config=read('config.js');
const build=read('build-static.mjs');
const sw=read('sw.js');

assert(reliability.includes('window.SOUTU_PRICE_RELIABILITY'),'price reliability global API missing');
assert(reliability.includes('soutu-price-history-schema-v2'),'history schema migration marker missing');
assert(reliability.includes('LEGACY_HISTORY_KEYS'),'legacy history import missing');
assert(reliability.includes('componentKind')&&reliability.includes("return'shipping'")&&reliability.includes("return'tax'"),'shipping/tax separation missing');
assert(reliability.includes("return'out-of-stock'")&&reliability.includes("return'in-stock'"),'availability separation missing');
assert(reliability.includes('sourceReliability')&&reliability.includes('SOURCE_TTL'),'source reliability decay missing');
assert(reliability.includes('merchantMap')&&reliability.includes('duplicateMerchantCount'),'same-merchant quote deduplication missing');
assert(reliability.includes("p.buckets=reliabilityBuckets"),'price bucket reliability override missing');
assert(reliability.includes("p.parsePrice=reliableParsePrice"),'component-safe price parser override missing');
assert(reliability.includes('canonicalUrl')&&reliability.includes('TRACKING_PARAM'),'tracking URL canonicalization missing');
assert(config.indexOf('price-intelligence.js')<config.indexOf('price-reliability.js'),'reliability must load after price intelligence');
assert(config.indexOf('price-reliability.js')<config.indexOf('price-history.js'),'reliability must load before price history');
assert(build.includes("'price-reliability.js'"),'static build must copy price reliability module');
assert(build.includes("read('price-reliability.js')"),'standalone build must inline price reliability module');
assert(sw.includes("'/price-reliability.js'"),'service worker must precache price reliability module');

console.log('Price reliability / history migration static regression passed');
