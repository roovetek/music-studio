/**
 * Generates simple branded PNGs for the PWA manifest (slate gradient + "M").
 * Run: node scripts/generate-pwa-icons.mjs
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');

// SVG template; sharp renders to PNG at requested sizes
function iconSvg(size, { maskable } = { maskable: false }) {
  const pad = maskable ? Math.round(size * 0.1) : 0;
  const inner = size - pad * 2;
  const fs = Math.round(inner * 0.42);
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${size}" height="${size}" rx="${maskable ? size * 0.2 : size * 0.12}" fill="url(#g)"/>
  <text x="${size / 2}" y="${pad + inner * 0.52 + fs * 0.35}" font-family="system-ui,Segoe UI,sans-serif" font-size="${fs}" font-weight="700" fill="#93c5fd" text-anchor="middle">M</text>
</svg>`;
}

async function render(name, size, opts) {
  const svg = Buffer.from(iconSvg(size, opts));
  const png = await sharp(svg).png({ compressionLevel: 9 }).toBuffer();
  const out = join(iconsDir, name);
  await writeFile(out, png);
  console.log('wrote', out);
}

await mkdir(iconsDir, { recursive: true });
await render('icon-192x192.png', 192, {});
await render('icon-512x512.png', 512, {});
await render('icon-512-maskable.png', 512, { maskable: true });
