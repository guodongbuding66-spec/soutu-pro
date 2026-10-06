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
const normalizeReleaseIndex=html=>html
  .replace(/(<meta name="soutu-version" content=")[^"]+(" \/>)/,`$1${releaseVersion}$2`)
  .replace(/(\.\/(?:styles\.css|v9\.css|config\.js|app\.js|v9\.js)\?v=)[^"]+/g,`$1${releaseVersion}`);

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const file of files) {
  fs.copyFileSync(path.resolve(file), path.join(outDir, file));
}

const releaseIndex=normalizeReleaseIndex(read('index.html'));
fs.writeFileSync(path.join(outDir,'index.html'),releaseIndex);

let standalone=releaseIndex;
standalone=standalone
  .replace(/<link rel="stylesheet" href="\.\/styles\.css\?v=[^"]+" \/>/, `<style>\n${read('styles.css')}\n</style>`)
  .replace(/<link rel="stylesheet" href="\.\/v9\.css\?v=[^"]+" \/>/, `<style>\n${read('v9.css')}\n</style>`)
  .replace(/<script src="\.\/config\.js\?v=[^"]+"><\/script>/, `<script>\n${read('config.js')}\n</script>`)
  .replace(/<script src="\.\/app\.js\?v=[^"]+"><\/script>/, `<script>\n${read('app.js')}\n</script>`)
  .replace(/<script src="\.\/v9\.js\?v=[^"]+"><\/script>/, `<script>\n${read('v9.js')}\n</script>`)
  .replace('</body>', `<script>\n${read('price-intelligence.js')}\n</script>\n<script>\n${read('price-history.js')}\n</script>\n</body>`);
fs.writeFileSync(path.join(outDir,'standalone.html'),standalone);

console.log(`Static frontend copied to ${outDir}; release ${releaseVersion}; standalone generated from current assets including price intelligence + history`);
