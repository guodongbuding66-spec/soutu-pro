import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('public');
const files = [
  'index.html',
  'styles.css',
  'app.js',
  'config.js',
  'manifest.webmanifest',
  'icon.svg',
  'maskable.svg',
  'sw.js',
  'standalone.html'
];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const file of files) {
  fs.copyFileSync(path.resolve(file), path.join(outDir, file));
}

console.log(`Static frontend copied to ${outDir}`);
