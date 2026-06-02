#!/usr/bin/env node
/**
 * BillKaro — Icon Generator
 * Generates all required PWA icons as SVG → PNG
 * Run: node generate-icons.js
 */

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// SVG icon template (BillKaro logo)
function makeSVG(size) {
  const r = size * 0.15;
  const fontSize = size * 0.35;
  const emojiSize = size * 0.5;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#2563eb"/>
  <text x="${size/2}" y="${size * 0.62}" text-anchor="middle" font-size="${emojiSize}" font-family="Segoe UI Emoji,Apple Color Emoji,sans-serif">🧾</text>
</svg>`;
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

sizes.forEach(size => {
  const svg = makeSVG(size);
  const svgPath = path.join(iconsDir, `icon-${size}.svg`);
  fs.writeFileSync(svgPath, svg);
  console.log(`Created icon-${size}.svg`);
});

console.log('\n✓ SVG icons created in icons/');
console.log('For PNG conversion, use: npx sharp-cli or an online tool');
console.log('Or the SVG icons work fine for most PWA purposes');
