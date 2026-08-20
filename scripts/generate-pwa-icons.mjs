import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const outDir = join(process.cwd(), 'public', 'pwa-icons');
mkdirSync(outDir, { recursive: true });

// MedSync lightning bolt icon SVG
const svg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#F4F5F7"/>
  <path fill="#863bff" d="M280 400 L262 400 L262 300 L242 300 L242 280 L150 280 L150 260 L196 160 L176 160 L176 140 L100 140 L100 120 L150 50 L170 50 L170 70 L250 70 L250 90 L330 90 L330 110 L412 110 L412 130 L362 200 L382 200 L382 220 L280 220 L280 240 Z"/>
</svg>`
);

// Generate all required sizes
const sizes = [192, 512];
for (const size of sizes) {
  const filename = `pwa-${size}x${size}.png`;
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(join(outDir, filename));
  console.log(`Generated ${filename}`);
}

// Apple touch icon (180x180)
await sharp(svg)
  .resize(180, 180)
  .png()
  .toFile(join(outDir, 'apple-touch-icon.png'));
console.log('Generated apple-touch-icon.png');

// Favicon (48x48)
await sharp(svg)
  .resize(48, 48)
  .png()
  .toFile(join(outDir, 'favicon-48x48.png'));
console.log('Generated favicon-48x48.png');

console.log('All PWA icons generated successfully!');