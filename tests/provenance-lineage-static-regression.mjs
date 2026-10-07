import fs from 'node:fs';
import assert from 'node:assert/strict';

const lineage=fs.readFileSync('provenance-lineage.js','utf8');
const config=fs.readFileSync('config.js','utf8');
const build=fs.readFileSync('build-static.mjs','utf8');
const sw=fs.readFileSync('sw.js','utf8');

assert(lineage.includes('SOUTU_PROVENANCE_LINEAGE'),'lineage public API missing');
assert(lineage.includes('版本传播链'),'lineage heading missing');
assert(lineage.includes('时间支持'),'supported direction state missing');
assert(lineage.includes('方向待验证'),'uncertain direction state missing');
assert(lineage.includes('时间冲突'),'conflict direction state missing');
assert(lineage.includes('provenance-family-card'),'lineage must consume provenance families');
assert(lineage.includes('provenance-relation'),'lineage must consume existing version relations');
assert(lineage.includes("soutu-pro.provenance-lineage.v1"),'lineage export schema missing');
assert(lineage.includes('data-lineage-export="json"'),'JSON export control missing');
assert(lineage.includes('data-lineage-export="csv"'),'CSV export control missing');
assert(lineage.includes("direction_state"),'CSV direction evidence column missing');
assert(lineage.includes('不得视为已验证原创'),'export disclaimer missing');
assert(!lineage.includes('确定原创'),'lineage must not claim verified originality');

assert(lineage.includes('data-lineage-handoff'),'Investigation Hub handoff control missing');
assert(lineage.includes('handoffToHub'),'Investigation Hub handoff API missing');
assert(lineage.includes("soutu-pro-v9-evidence"),'handoff must use V9 evidence state source');
assert(lineage.includes("soutu-pro-v9-cases"),'handoff must use V9 cases state source');
assert(lineage.includes("soutu-pro-v9-view"),'handoff must target V9 view state');
assert(lineage.includes("kind:'provenance-lineage'"),'lineage evidence type missing');
assert(lineage.includes('lineageKey'),'lineage evidence dedupe key missing');
assert(lineage.includes('appendReportEvidence'),'report integration API missing');
assert(lineage.includes('版本传播链证据'),'lineage report section missing');
assert(lineage.includes('lineageSummary'),'case lineage summary missing');
assert(lineage.includes("mode==='existing'"),'existing Case association missing');
assert(lineage.includes("mode==='new'"),'new Case association missing');

assert(config.includes("provenance-lineage.js"),'runtime loader missing lineage module');
assert(config.includes("soutu-provenance-lineage"),'runtime loader id missing');
assert(build.includes("'provenance-lineage.js'"),'static build missing lineage asset');
assert(build.includes('id="soutu-provenance-lineage"'),'standalone inline lineage module missing');
assert(sw.includes("'/provenance-lineage.js'"),'service worker cache missing lineage module');

console.log('provenance lineage static regression checks passed');
