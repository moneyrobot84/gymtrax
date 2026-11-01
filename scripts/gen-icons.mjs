// Generates GymTrax icons from the brand SVG.
// Produces: apple-touch-icon.png (180), icon-192, icon-512, icon-512-maskable, favicon-32, favicon-64
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT = path.resolve(__dirname, '..', 'public', 'icons');
fs.mkdirSync(OUT, { recursive: true });

// Brand mark drawn on a square canvas; glyph (orig viewBox 120 120 784 784) centered in the content box.
function buildSvg({ size = 1024, pad = 0.08 } = {}) {
  const inner = Math.round(size * (1 - pad * 2));
  const offset = Math.round((size - inner) / 2);
  const s = inner / 784;
  const tx = offset - 120 * s;
  const ty = offset - 120 * s;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="70%">
      <stop offset="0%" stop-color="#2a2b2e"/>
      <stop offset="100%" stop-color="#121314"/>
    </radialGradient>
    <clipPath id="plateClip">
      <circle cx="512" cy="512" r="362"/>
    </clipPath>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <g transform="translate(${tx} ${ty}) scale(${s})">
    <path d="M 704.8 282.2 A 300 300 0 1 0 812 512" fill="none" stroke="#FF6B1A" stroke-width="124" stroke-linecap="butt"/>
    <rect x="600" y="450" width="280" height="124" fill="#FF6B1A" clip-path="url(#plateClip)"/>
    <rect x="548" y="412" width="44" height="200" rx="12" fill="#FF6B1A"/>
    <rect x="466" y="362" width="74" height="300" rx="18" fill="#FF6B1A"/>
  </g>
</svg>`;
}

async function write(name, size, pad) {
  const svg = buildSvg({ size, pad });
  const outPath = path.join(OUT, name);
  await sharp(Buffer.from(svg), { density: 384 })
    .resize(size, size, { fit: 'cover' })
    .flatten({ background: '#121314' }) // opaque bg - iOS requirement for apple-touch-icon
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log('wrote', outPath);
}

await Promise.all([
  write('apple-touch-icon.png', 180, 0.08),
  write('icon-192.png', 192, 0.08),
  write('icon-512.png', 512, 0.08),
  write('icon-512-maskable.png', 512, 0.22),
  write('favicon-32.png', 32, 0.04),
  write('favicon-64.png', 64, 0.04),
]);

fs.writeFileSync(path.join(OUT, 'logo.svg'), buildSvg({ size: 1024, pad: 0.08 }));
console.log('done');
