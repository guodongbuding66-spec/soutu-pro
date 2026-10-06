import assert from 'node:assert/strict';
import fs from 'node:fs';

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
assert(build.includes('meta name="soutu-version"'),'static build must rewrite release meta version');
assert(build.includes('styles\\.css|v9\\.css|config\\.js|app\\.js|v9\\.js'),'static build must rewrite asset cache-busting versions');
assert(build.includes("fs.writeFileSync(path.join(outDir,'index.html'),releaseIndex)"),'normalized release index must be emitted to public');

console.log(`Release version regression passed for ${version}`);
