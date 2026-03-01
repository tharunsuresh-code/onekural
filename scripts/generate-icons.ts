/**
 * Generate PWA icons for OneKural
 * Produces: icon-192.png, icon-512.png, icon-512-maskable.png, apple-touch-icon.png, favicon-32.png
 * Run: npm run generate-icons
 */

import { createCanvas } from "canvas";
import * as fs from "fs";
import * as path from "path";

const SAFFRON = "#F4A528";
const DEEP_RED = "#8B1A1A";
const CREAM = "#FAF7F2";

function drawIcon(
  size: number,
  maskable: boolean,
  bgColor: string = SAFFRON
): Buffer {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Safe zone for maskable: 80% of size (40% padding on each side)
  const safeZone = maskable ? size * 0.8 : size;
  const offset = maskable ? (size - safeZone) / 2 : 0;

  // Background
  ctx.fillStyle = bgColor;
  if (maskable) {
    // Full bleed background for maskable
    ctx.fillRect(0, 0, size, size);
  } else {
    // Rounded rect for regular icons
    const radius = size * 0.2;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(size - radius, 0);
    ctx.quadraticCurveTo(size, 0, size, radius);
    ctx.lineTo(size, size - radius);
    ctx.quadraticCurveTo(size, size, size - radius, size);
    ctx.lineTo(radius, size);
    ctx.quadraticCurveTo(0, size, 0, size - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();
  }

  // Draw "OK" monogram — "O" (for OneKural) in Tamil-inspired style
  // We use the Tamil "ஒ" character (short O) as the monogram
  const fontSizeMain = safeZone * 0.52;
  ctx.fillStyle = DEEP_RED;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${fontSizeMain}px serif`;

  const centerX = size / 2;
  const centerY = size / 2 + offset * 0.1;

  // Draw "ஒ" Tamil character
  ctx.fillText("ஒ", centerX, centerY);

  return canvas.toBuffer("image/png");
}

function drawFavicon(size: number): Buffer {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Simple square with saffron bg
  ctx.fillStyle = SAFFRON;
  ctx.fillRect(0, 0, size, size);

  // Small "ஒ"
  const fontSize = size * 0.65;
  ctx.fillStyle = DEEP_RED;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${fontSize}px serif`;
  ctx.fillText("ஒ", size / 2, size / 2);

  return canvas.toBuffer("image/png");
}

const iconsDir = path.join(__dirname, "../public/icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const icons = [
  { name: "icon-192.png", size: 192, maskable: false },
  { name: "icon-512.png", size: 512, maskable: false },
  { name: "icon-512-maskable.png", size: 512, maskable: true },
  { name: "apple-touch-icon.png", size: 180, maskable: false },
];

for (const icon of icons) {
  const buf = drawIcon(icon.size, icon.maskable);
  fs.writeFileSync(path.join(iconsDir, icon.name), buf);
  console.log(`✓ ${icon.name}`);
}

const faviconBuf = drawFavicon(32);
fs.writeFileSync(path.join(__dirname, "../public/icons/favicon-32.png"), faviconBuf);
console.log("✓ favicon-32.png");

console.log("\nAll icons generated in public/icons/");
