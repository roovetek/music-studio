/**
 * GitHub Pages serves 404.html for unknown paths — copy SPA shell for client routes.
 * Run after: vite build (via npm run build:pages)
 */
import { copyFileSync, existsSync } from 'fs';
import { join } from 'path';

const dist = join(process.cwd(), 'dist');
const indexHtml = join(dist, 'index.html');
const notFound = join(dist, '404.html');

if (!existsSync(indexHtml)) {
  console.error('copy-github-pages-404: dist/index.html missing — run vite build first');
  process.exit(1);
}

copyFileSync(indexHtml, notFound);
console.log('copy-github-pages-404: dist/404.html written (GitHub Pages SPA fallback)');
