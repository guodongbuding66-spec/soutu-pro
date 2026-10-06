import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=p=>fs.readFileSync(p,'utf8');
const pkg=JSON.parse(read('package.json'));
const vercel=JSON.parse(read('vercel.json'));
const version=pkg.version;
const cacheVersion=version.replace(/\./g,'-');
const config=read('config.js');
const build=read('build-static.mjs');
const sw=read('sw.js');

assert(/^\d+\.\d+\.\d+$/.test(version),'package version must be semver');
assert(config.includes(`||'${version}'`),'feature loader fallback must match package release');
assert(sw.includes(`soutu-pro-v${cacheVersion}-shell`),'service worker cache namespace must match package release');
assert(build.includes("JSON.parse(read('package.json')).version"),'static build must derive release version from package.json');
assert(build.includes('normalizeReleaseIndex'),'static build must normalize index release metadata');
assert(build.includes('normalizeRuntimeVersion'),'static build must normalize runtime versions');
assert(build.includes('VERCEL_GIT_COMMIT_SHA')&&build.includes("release.json"),'static build must emit commit-addressable release metadata');
assert.equal(vercel.outputDirectory,'public','Vercel must deploy the generated public directory');
assert(!Object.hasOwn(vercel,'ignoreCommand'),'production builds must not be skipped by an Ignore Build Step');
assert(vercel.headers?.some(rule=>rule.source==='/release.json'&&rule.headers?.some(h=>h.key==='Cache-Control'&&/no-store/.test(h.value||''))),'release metadata must bypass CDN/browser caching');

execFileSync(process.execPath,['build-static.mjs'],{stdio:'pipe',env:{...process.env,GITHUB_SHA:'qa-release-sha'}});
const publicHtml=read('public/index.html');
const publicApp=read('public/app.js');
const publicV9=read('public/v9.js');
const release=JSON.parse(read('public/release.json'));
const standalone=read('public/standalone.html');

assert(publicHtml.includes(`content="${version}"`),'public index meta version mismatch');
assert(publicHtml.includes(`v${version}`),'public visible version badge mismatch');
assert(publicHtml.includes(`?v=${version}`),'public asset cache-bust mismatch');
assert(publicApp.includes(`const APP_VERSION='${version}';`),'public app runtime version mismatch');
assert(publicV9.includes(`const V9_VERSION = '${version}';`),'public V9 runtime version mismatch');
assert(standalone.includes(`const APP_VERSION='${version}';`),'standalone app runtime version mismatch');
assert(standalone.includes(`const V9_VERSION = '${version}';`),'standalone V9 runtime version mismatch');
assert.deepEqual({version:release.version,commit:release.commit},{version,commit:'qa-release-sha'},'release metadata mismatch');
assert(!Number.isNaN(Date.parse(release.builtAt)),'release metadata builtAt must be ISO date');

console.log(`Release/deployment regression passed for ${version}`);
