import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const price=read('price-intelligence.js');
const config=read('config.js');
const build=read('build-static.mjs');
const sw=read('sw.js');
const workflow=read('.github/workflows/e2e.yml');
const productionSmoke=read('tests/production-smoke.mjs');

assert(price.includes('window.SOUTU_PRICE_INTELLIGENCE'),'price intelligence global API missing');
assert(price.includes('sessionId')&&price.includes('ignoredResponses'),'search-session isolation missing');
assert(price.includes("kind==='list'")&&price.includes("kind==='sale'"),'list/sale price distinction missing');
assert(price.includes('anomalyCount')&&price.includes('lowConfidenceCount'),'trusted-sample filtering missing');
assert(config.includes('price-intelligence.js'),'runtime loader missing price intelligence module');
assert(build.includes("'price-intelligence.js'"),'static build must copy price intelligence module');
assert(build.includes("read('price-intelligence.js')"),'standalone build must inline price intelligence module');
assert(sw.includes("'/price-intelligence.js'"),'service worker precache must include price intelligence module');
assert(workflow.includes('Production smoke regression'),'CI must require production smoke regression');
assert(workflow.includes('SOUTU_EXPECTED_COMMIT: ${{ github.sha }}'),'CI production smoke must target the exact workflow commit');
assert(productionSmoke.includes("'price-intelligence.js'")&&productionSmoke.includes("'price-history.js'"),'production smoke must verify modular price assets');
assert(productionSmoke.includes('expectedCommit')&&productionSmoke.includes('/release.json'),'production smoke must verify exact release metadata');

console.log('Price intelligence static regression passed');
