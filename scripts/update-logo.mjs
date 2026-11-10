import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SOURCE = 'C:/Users/Mehedi/.gemini/antigravity/brain/74604bc6-35c9-4cb0-b506-b10ae7ca3816/.user_uploaded/media_1794315253605_466daaa5.jpg';
const ROOT = path.resolve('.');

if (!fs.existsSync(SOURCE)) {
  console.error('Source image not found:', SOURCE);
  process.exit(1);
}

// Create a rounded squircle SVG mask for 1024x1024
const roundedMask = Buffer.from(
  `<svg width="1024" height="1024">
    <rect x="0" y="0" width="1024" height="1024" rx="180" ry="180" fill="#fff" />
  </svg>`
);

// Helper to assemble multi-size Windows .ico
function assembleIco(pngBuffers, sizes) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(count, 4); // number of images

  let offset = 6 + count * 16;
  const entries = [];
  for (let i = 0; i < count; i++) {
    const size = sizes[i];
    const buf = pngBuffers[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height (0 = 256)
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buf.length, 8); // image size in bytes
    entry.writeUInt32LE(offset, 12); // image offset in file
    entries.push(entry);
    offset += buf.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

async function main() {
  console.log('Processing new logo for QuickGST Billing...');

  // 1. High-res rounded 1024 PNG with transparent outside
  const rounded1024 = await sharp(SOURCE)
    .resize(1024, 1024)
    .composite([{ input: roundedMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Full-bleed 1024 PNG (for maskable icons)
  const square1024 = await sharp(SOURCE)
    .resize(1024, 1024)
    .png()
    .toBuffer();

  // 2. Generate PWA icons in public/icons/
  const iconsDir = path.join(ROOT, 'public', 'icons');
  fs.mkdirSync(iconsDir, { recursive: true });

  await sharp(rounded1024).resize(192, 192).toFile(path.join(iconsDir, 'icon-192.png'));
  await sharp(rounded1024).resize(512, 512).toFile(path.join(iconsDir, 'icon-512.png'));
  await sharp(rounded1024).resize(180, 180).toFile(path.join(iconsDir, 'apple-touch-180.png'));
  await sharp(square1024).resize(192, 192).toFile(path.join(iconsDir, 'maskable-192.png'));
  await sharp(square1024).resize(512, 512).toFile(path.join(iconsDir, 'maskable-512.png'));
  console.log('✓ Generated public/icons/ (192, 512, apple-touch, maskable)');

  // 3. Save main logo PNG in public/
  await sharp(rounded1024).resize(512, 512).toFile(path.join(ROOT, 'public', 'logo.png'));
  console.log('✓ Generated public/logo.png');

  // 4. Generate multi-size Windows .ico [256, 64, 48, 32, 16]
  const icoSizes = [256, 64, 48, 32, 16];
  const icoPngs = await Promise.all(
    icoSizes.map((s) => sharp(rounded1024).resize(s, s).png().toBuffer())
  );
  const icoBuffer = assembleIco(icoPngs, icoSizes);

  fs.writeFileSync(path.join(ROOT, 'public', 'app-icon.ico'), icoBuffer);
  fs.writeFileSync(path.join(ROOT, 'release-templates', '_system-scripts', 'app-icon.ico'), icoBuffer);
  console.log('✓ Generated app-icon.ico in public/ and release-templates/_system-scripts/');

  // 5. Generate crisp public/favicon.svg
  const base64Png = (await sharp(rounded1024).resize(256, 256).png().toBuffer()).toString('base64');
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <image width="256" height="256" href="data:image/png;base64,${base64Png}" />
</svg>`;
  fs.writeFileSync(path.join(ROOT, 'public', 'favicon.svg'), faviconSvg, 'utf8');
  console.log('✓ Generated public/favicon.svg');

  console.log('\nAll logo and icon assets updated successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
