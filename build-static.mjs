import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('public');
const files = [
  'index.html',
  'styles.css',
  'v9.css',
  'app.js',
  'v9.js',
  'price-intelligence.js',
  'price-history.js',
  'perspective-worker.js',
  'config.js',
  'manifest.webmanifest',
  'icon.svg',
  'maskable.svg',
  'sw.js'
];

const read=file=>fs.readFileSync(path.resolve(file),'utf8');
const releaseVersion=JSON.parse(read('package.json')).version;
const releaseCommit=String(process.env.VERCEL_GIT_COMMIT_SHA||process.env.GITHUB_SHA||'local').trim()||'local';
const sourceIndex=read('index.html');
const sourceVersion=(sourceIndex.match(/<meta name="soutu-version" content="([^"]+)"/i)||[])[1]||releaseVersion;
const normalizeReleaseIndex=html=>html.split(sourceVersion).join(releaseVersion);
const normalizeRuntimeVersion=(file,text)=>{
  if(file==='app.js')return text.replace(/const APP_VERSION='[^']+';/,`const APP_VERSION='${releaseVersion}';`);
  if(file==='v9.js')return text.replace(/const V9_VERSION = '[^']+';/,`const V9_VERSION = '${releaseVersion}';`);
  return text;
};

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const file of files) {
  const target=path.join(outDir,file);
  if(file==='index.html')fs.writeFileSync(target,normalizeReleaseIndex(sourceIndex));
  else if(file==='app.js'||file==='v9.js')fs.writeFileSync(target,normalizeRuntimeVersion(file,read(file)));
  else fs.copyFileSync(path.resolve(file),target);
}

const releaseIndex=normalizeReleaseIndex(sourceIndex);
const releaseApp=normalizeRuntimeVersion('app.js',read('app.js'));
const releaseV9=normalizeRuntimeVersion('v9.js',read('v9.js'));
const releaseMeta={version:releaseVersion,commit:releaseCommit,builtAt:new Date().toISOString()};
fs.writeFileSync(path.join(outDir,'release.json'),`${JSON.stringify(releaseMeta,null,2)}\n`);

let standalone=releaseIndex;
standalone=standalone
  .replace(/<link rel="stylesheet" href="\.\/styles\.css\?v=[^"]+" \/>/, `<style>\n${read('styles.css')}\n</style>`)
  .replace(/<link rel="stylesheet" href="\.\/v9\.css\?v=[^"]+" \/>/, `<style>\n${read('v9.css')}\n</style>`)
  .replace(/<script src="\.\/config\.js\?v=[^"]+"><\/script>/, `<script>\n${read('config.js')}\n</script>`)
  .replace(/<script src="\.\/app\.js\?v=[^"]+"><\/script>/, `<script>\n${releaseApp}\n</script>`)
  .replace(/<script src="\.\/v9\.js\?v=[^"]+"><\/script>/, `<script>\n${releaseV9}\n</script>`)
  .replace('</body>', `<script>\n${read('price-intelligence.js')}\n</script>\n<script>\n${read('price-history.js')}\n</script>\n</body>`);
fs.writeFileSync(path.join(outDir,'standalone.html'),standalone);

console.log(`Static frontend copied to ${outDir}; release ${releaseVersion} @ ${releaseCommit}; standalone generated from current assets including price intelligence + history`);
