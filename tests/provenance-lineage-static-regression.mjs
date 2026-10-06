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
assert(!lineage.includes('确定原创'),'lineage must not claim verified originality');
assert(config.includes("provenance-lineage.js"),'runtime loader missing lineage module');
assert(config.includes("soutu-provenance-lineage"),'runtime loader id missing');
assert(build.includes("'provenance-lineage.js'"),'static build missing lineage asset');
assert(build.includes('id="soutu-provenance-lineage"'),'standalone inline lineage module missing');
assert(sw.includes("'/provenance-lineage.js'"),'service worker cache missing lineage module');

console.log('provenance lineage static regression checks passed');
