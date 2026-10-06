import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=p=>fs.readFileSync(p,'utf8');
const pkg=JSON.parse(read('package.json'));
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

execFileSync(process.execPath,['build-static.mjs'],{stdio:'pipe'});
const publicHtml=read('public/index.html');
const publicApp=read('public/app.js');
const publicV9=read('public/v9.js');
const standalone=read('public/standalone.html');

assert(publicHtml.includes(`content="${version}"`),'public index meta version mismatch');
assert(publicHtml.includes(`v${version}`),'public visible version badge mismatch');
assert(publicHtml.includes(`?v=${version}`),'public asset cache-bust mismatch');
assert(publicApp.includes(`const APP_VERSION='${version}';`),'public app runtime version mismatch');
assert(publicV9.includes(`const V9_VERSION = '${version}';`),'public V9 runtime version mismatch');
assert(standalone.includes(`const APP_VERSION='${version}';`),'standalone app runtime version mismatch');
assert(standalone.includes(`const V9_VERSION = '${version}';`),'standalone V9 runtime version mismatch');

console.log(`Release version regression passed for ${version}`);
