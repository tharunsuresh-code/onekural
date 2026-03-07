/**
 * Generate PWA icons for OneKural
 * Produces: icon-192.png, icon-512.png, icon-512-maskable.png, apple-touch-icon.png, favicon-32.png
 * Run: npm run generate-icons
 */

import { createCanvas } from "canvas";
import * as fs from "fs";
import * as path from "path";

const EMERALD = "#1B5E4F";
const WHITE = "#FFFFFF";

function drawIcon(
  size: number,
  maskable: boolean,
  bgColor: string = EMERALD
): Buffer {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Safe zone for maskable: 80% of size (40% padding on each side)
  const safeZone = maskable ? size * 0.8 : size;
  const offset = maskable ? (size - safeZone) / 2 : 0;

  // Background
  ctx.fillStyle = bgColor;
  if (maskable) {
    ctx.fillRect(0, 0, size, size);
  } else {
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

  // Draw "அ" lettermark — use actual bounding box to visually center Tamil glyph
  const fontSizeMain = safeZone * 0.52;
  ctx.fillStyle = WHITE;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `bold ${fontSizeMain}px 'Noto Serif Tamil', serif`;

  const centerX = size / 2;
  const glyphCenter = size / 2 + offset * 0.1;

  // Measure actual rendered bounds to correct for Tamil descenders/ascenders
  const metrics = ctx.measureText("அ");
  const glyphHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  const textY = glyphCenter + metrics.actualBoundingBoxAscent - glyphHeight / 2;

  ctx.fillText("அ", centerX, textY);

  return canvas.toBuffer("image/png");
}

function drawFavicon(size: number): Buffer {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = EMERALD;
  ctx.fillRect(0, 0, size, size);

  const fontSize = size * 0.65;
  ctx.fillStyle = WHITE;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `bold ${fontSize}px 'Noto Serif Tamil', serif`;

  const metrics = ctx.measureText("அ");
  const glyphHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  const textY = size / 2 + metrics.actualBoundingBoxAscent - glyphHeight / 2;
  ctx.fillText("அ", size / 2, textY);

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

// Use rounded icon design for favicon (32px version)
const roundedFaviconBuf = drawIcon(32, false);
fs.writeFileSync(path.join(__dirname, "../public/icons/favicon-32.png"), roundedFaviconBuf);
console.log("✓ favicon-32.png");

// Also create favicon.ico in root (Firefox compatibility)
fs.copyFileSync(
  path.join(__dirname, "../public/icons/favicon-32.png"),
  path.join(__dirname, "../public/favicon.ico")
);
console.log("✓ favicon.ico");

console.log("\nAll icons generated in public/icons/");
