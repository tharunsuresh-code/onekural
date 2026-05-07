"use client";

import type { Kural } from "@/lib/types";
import { BOOK_NAMES, getSolomonTamil } from "@/lib/types";

export type AspectRatio = "story" | "square";

export const SIZES: Record<AspectRatio, { w: number; h: number; label: string }> = {
  square: { w: 1080, h: 1080, label: "Square (1:1)" },
  story: { w: 1080, h: 1920, label: "Story (9:16)" },
};

const CREAM = "#FFFFFF";
const EMERALD = "#1B5E4F";
const DARK = "#1A1A1A";

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  maxWidth: number,
  lineHeight: number
): { lines: string[]; height: number } {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  return { lines, height: lines.length * lineHeight };
}

function measureContent(
  ctx: CanvasRenderingContext2D,
  kural: Kural,
  contentWidth: number,
  boxContent: "tamil" | "transliteration"
): number {
  let h = 0;

  // Decorative dot + gap
  h += 12 + 40;

  // Chapter badge + gap
  ctx.font = boxContent === "tamil" ? "28px 'Noto Serif Tamil', serif" : "28px Inter, sans-serif";
  h += 28 + 48;

  // Divider line top + gap
  h += 3 + 56;

  // Open kural text (no box)
  if (boxContent === "tamil") {
    ctx.font = "bold 44px 'Noto Serif Tamil', serif";
    const tamilLines = kural.kural_tamil.split("\n");
    let tamilH = 0;
    for (const line of tamilLines) {
      const { lines } = wrapText(ctx, line.trim(), 0, contentWidth, 62);
      tamilH += lines.length * 62;
    }
    h += tamilH;
  } else {
    ctx.font = "bold italic 48px Georgia, serif";
    const translitLines = kural.transliteration.split("\n");
    let translitH = 0;
    for (const line of translitLines) {
      const { lines } = wrapText(ctx, line.trim(), 0, contentWidth, 68);
      translitH += lines.length * 68;
    }
    h += translitH;
  }

  // Divider line bottom + gap before insight box
  h += 56 + 3 + 56;

  // Insight box
  const insightPadV = 44;
  const insightPadH = 48;
  const innerW = contentWidth - insightPadH * 2;
  const insightText = boxContent === "tamil" ? getSolomonTamil(kural) : kural.meaning_english;
  ctx.font = "500 24px Inter, sans-serif";
  h += insightPadV;
  h += 24 + 24;
  ctx.font = boxContent === "tamil" ? "22px 'Noto Serif Tamil', serif" : "italic 26px Georgia, serif";
  const insightLineH = boxContent === "tamil" ? 34 : 40;
  const { lines: meaningLines } = wrapText(ctx, insightText, 0, innerW, insightLineH);
  h += meaningLines.length * insightLineH;
  h += insightPadV;

  return h;
}

export async function generateImage(
  kural: Kural,
  ratio: AspectRatio,
  boxContent: "tamil" | "transliteration"
): Promise<Blob> {
  // Ensure fonts are in the browser's font cache before drawing
  await Promise.race([
    Promise.allSettled([
      document.fonts.load("bold 44px 'Noto Serif Tamil', serif"),
      document.fonts.load("28px 'Noto Serif Tamil', serif"),
    ]),
    new Promise<void>((r) => setTimeout(r, 2000)),
  ]);

  const { w, h } = SIZES[ratio];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  const pad = 80;
  const contentWidth = w - pad * 2;

  // Background
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, w, h);

  // Measure content to vertically center it
  const contentHeight = measureContent(ctx, kural, contentWidth, boxContent);
  const bottomReserved = 100;
  const topMin = ratio === "story" ? 120 : 80;
  const available = h - bottomReserved - topMin;
  const startY = Math.max(topMin, topMin + (available - contentHeight) / 2);

  let yPos = startY;

  // Decorative dot
  ctx.beginPath();
  ctx.arc(w / 2, yPos + 6, 6, 0, Math.PI * 2);
  ctx.fillStyle = EMERALD;
  ctx.fill();
  yPos += 12 + 40;

  // Chapter + book badge
  const bookName = boxContent === "tamil"
    ? (BOOK_NAMES[kural.book]?.tamil ?? "")
    : (BOOK_NAMES[kural.book]?.english ?? "");
  const chapterName = boxContent === "tamil" ? kural.chapter_name_tamil : kural.chapter_name_english;
  ctx.font = boxContent === "tamil" ? "28px 'Noto Serif Tamil', serif" : "28px Inter, sans-serif";
  ctx.fillStyle = DARK + "80";
  ctx.textAlign = "center";
  ctx.fillText(`${bookName} · ${chapterName}`, w / 2, yPos);
  yPos += 28 + 48;

  // Divider line — top
  ctx.fillStyle = EMERALD + "80";
  ctx.fillRect(w / 2 - 24, yPos, 48, 3);
  yPos += 3 + 56;

  // Open kural text
  ctx.fillStyle = DARK;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const kuralLines: string[] = [];
  let kuralLineH: number;

  if (boxContent === "tamil") {
    ctx.font = "bold 44px 'Noto Serif Tamil', serif";
    kuralLineH = 62;
    for (const line of kural.kural_tamil.split("\n")) {
      const { lines } = wrapText(ctx, line.trim(), w / 2, contentWidth, kuralLineH);
      kuralLines.push(...lines);
    }
  } else {
    ctx.font = "bold italic 48px Georgia, serif";
    kuralLineH = 68;
    for (const line of kural.transliteration.split("\n")) {
      const { lines } = wrapText(ctx, line.trim(), w / 2, contentWidth, kuralLineH);
      kuralLines.push(...lines);
    }
  }

  for (let i = 0; i < kuralLines.length; i++) {
    ctx.fillText(kuralLines[i]!, w / 2, yPos + i * kuralLineH);
  }
  ctx.textBaseline = "alphabetic";
  yPos += kuralLines.length * kuralLineH;

  // Divider line — bottom
  yPos += 56;
  ctx.fillStyle = EMERALD + "80";
  ctx.fillRect(w / 2 - 24, yPos, 48, 3);
  yPos += 3 + 56;

  // Insight box
  const insightPadV = 44;
  const insightPadH = 48;
  const innerW = contentWidth - insightPadH * 2;
  const insightText = boxContent === "tamil" ? getSolomonTamil(kural) : kural.meaning_english;
  const insightFont = boxContent === "tamil" ? "22px 'Noto Serif Tamil', serif" : "italic 26px Georgia, serif";
  const insightLineH = boxContent === "tamil" ? 34 : 40;

  ctx.font = insightFont;
  const { lines: meaningLines } = wrapText(ctx, insightText, w / 2, innerW, insightLineH);
  const insightTextH = meaningLines.length * insightLineH;
  const insightBoxH = insightPadV + 24 + 24 + insightTextH + insightPadV;

  ctx.fillStyle = EMERALD + "14";
  ctx.strokeStyle = EMERALD + "30";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(pad, yPos, contentWidth, insightBoxH, 20);
  ctx.fill();
  ctx.stroke();

  ctx.font = "500 22px Inter, sans-serif";
  ctx.fillStyle = EMERALD + "B3";
  ctx.textAlign = "center";
  ctx.fillText("INSIGHT", w / 2, yPos + insightPadV + 22);

  ctx.font = insightFont;
  ctx.fillStyle = DARK + "CC";
  const meaningStartY = yPos + insightPadV + 22 + 24 + (boxContent === "tamil" ? 22 : 26);
  for (let i = 0; i < meaningLines.length; i++) {
    ctx.fillText(meaningLines[i]!, w / 2, meaningStartY + i * insightLineH);
  }

  yPos += insightBoxH;

  // Decorative corner flourishes (story only)
  if (ratio === "story") {
    ctx.strokeStyle = EMERALD + "20";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(pad, pad, 30, 0, Math.PI / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(w - pad, pad, 30, Math.PI / 2, Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(pad, h - pad, 30, (3 * Math.PI) / 2, 2 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(w - pad, h - pad, 30, Math.PI, (3 * Math.PI) / 2); ctx.stroke();
  }

  // Kural number badge
  const badgeText = `#${kural.id}`;
  ctx.font = "bold 28px Inter, sans-serif";
  const badgeWidth = ctx.measureText(badgeText).width + 40;
  const badgeTopY = topMin - 10;
  const badgeRight = w - pad;
  const badgeLeft = badgeRight - badgeWidth;
  ctx.fillStyle = EMERALD + "1A";
  ctx.beginPath();
  ctx.roundRect(badgeLeft, badgeTopY, badgeWidth, 44, 22);
  ctx.fill();
  ctx.strokeStyle = EMERALD + "4D";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = EMERALD;
  ctx.textAlign = "right";
  ctx.fillText(badgeText, badgeRight - 20, badgeTopY + 30);

  // Watermark
  ctx.font = "28px 'Noto Serif Tamil', serif";
  ctx.fillStyle = DARK + "35";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("அ · OneKural", w / 2, h - 50);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });
}
