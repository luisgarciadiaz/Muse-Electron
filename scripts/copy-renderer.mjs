import fs from 'node:fs';
import path from 'node:path';

const srcDir = path.resolve(process.cwd(), 'src', 'renderer');
const destDir = path.resolve(process.cwd(), 'dist', 'renderer');

function copyRecursive(from, to) {
  if (!fs.existsSync(from)) {
    return;
  }
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyRecursive(srcDir, destDir);
console.log('Copied renderer assets to dist/renderer');
