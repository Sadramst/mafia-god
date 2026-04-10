/**
 * Build script — copies web assets to www/ for Capacitor
 * Run: node build.js
 */
const fs = require('fs');
const path = require('path');

const SRC = __dirname;
const DEST = path.join(__dirname, 'www');

// Files and folders to copy
const ITEMS = [
  'index.html',
  'manifest.json',
  'sw.js',
  'css',
  'js',
  'assets',
];

// Clean and recreate www/
if (fs.existsSync(DEST)) {
  fs.rmSync(DEST, { recursive: true, force: true });
}
fs.mkdirSync(DEST, { recursive: true });

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

for (const item of ITEMS) {
  const srcPath = path.join(SRC, item);
  const destPath = path.join(DEST, item);
  if (fs.existsSync(srcPath)) {
    copyRecursive(srcPath, destPath);
    console.log(`  ✓ ${item}`);
  } else {
    console.log(`  ⚠ ${item} not found, skipping`);
  }
}

console.log('\n✅ Build complete → www/');
