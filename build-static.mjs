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
  'perspective-worker.js',
  'config.js',
  'manifest.webmanifest',
  'icon.svg',
  'maskable.svg',
  'sw.js'
];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const file of files) {
  fs.copyFileSync(path.resolve(file), path.join(outDir, file));
}

const read=file=>fs.readFileSync(path.resolve(file),'utf8');
let standalone=read('index.html');
standalone=standalone
  .replace(/<link rel="stylesheet" href="\.\/styles\.css\?v=[^"]+" \/>/, `<style>\n${read('styles.css')}\n</style>`)
  .replace(/<link rel="stylesheet" href="\.\/v9\.css\?v=[^"]+" \/>/, `<style>\n${read('v9.css')}\n</style>`)
  .replace(/<script src="\.\/config\.js\?v=[^"]+"><\/script>/, `<script>\n${read('config.js')}\n</script>`)
  .replace(/<script src="\.\/app\.js\?v=[^"]+"><\/script>/, `<script>\n${read('app.js')}\n</script>`)
  .replace(/<script src="\.\/v9\.js\?v=[^"]+"><\/script>/, `<script>\n${read('v9.js')}\n</script>`);
fs.writeFileSync(path.join(outDir,'standalone.html'),standalone);

console.log(`Static frontend copied to ${outDir}; standalone generated from current assets`);
