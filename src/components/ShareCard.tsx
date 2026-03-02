"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import type { Kural } from "@/lib/types";
import { BOOK_NAMES } from "@/lib/types";

interface ShareCardProps {
  kural: Kural;
  onClose: () => void;
}

type AspectRatio = "story" | "square";

const SIZES: Record<AspectRatio, { w: number; h: number; label: string }> = {
  story: { w: 1080, h: 1920, label: "Story (9:16)" },
  square: { w: 1080, h: 1080, label: "Square (1:1)" },
};

// Colors
const CREAM = "#FAF7F2";
const SAFFRON = "#F4A528";
const DARK = "#1A1A1A";
const DEEP_RED = "#8B1A1A";

// Layout
const BOX_PADDING = 40;

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

/**
 * Measure content height without drawing, so we can vertically center.
 */
function measureContent(
  ctx: CanvasRenderingContext2D,
  kural: Kural,
  contentWidth: number
): number {
  let h = 0;

  // Decorative dot + gap
  h += 12 + 40;

  // Chapter badge line + gap before Tamil box
  ctx.font = "28px Inter, sans-serif";
  h += 28 + 40;

  // Tamil box = BOX_PADDING top + text height + BOX_PADDING bottom
  ctx.font = "52px 'Noto Serif Tamil', serif";
  const tamilLines = kural.kural_tamil.split("\n");
  let tamilH = 0;
  for (const line of tamilLines) {
    const { lines } = wrapText(ctx, line.trim(), 0, contentWidth, 72);
    tamilH += lines.length * 72;
  }
  h += BOX_PADDING + tamilH + BOX_PADDING;

  // Gap after box
  h += 48;

  // Transliteration
  ctx.font = "italic 28px Inter, sans-serif";
  const translitLines = kural.transliteration.split("\n");
  for (const line of translitLines) {
    const { lines } = wrapText(ctx, line.trim(), 0, contentWidth, 40);
    h += lines.length * 40;
  }

  // Divider between transliteration and meaning
  h += 20 + 2 + 20;

  // Meaning text
  ctx.font = "30px Inter, sans-serif";
  const { lines: meaningLines } = wrapText(ctx, kural.meaning_english, 0, contentWidth, 46);
  h += meaningLines.length * 46;

  return h;
}

async function generateImage(
  kural: Kural,
  ratio: AspectRatio
): Promise<Blob> {
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
  const contentHeight = measureContent(ctx, kural, contentWidth);
  // Reserve space for badge (60) + watermark (60) at bottom
  const bottomReserved = 140;
  const topMin = ratio === "story" ? 120 : 80;
  const available = h - bottomReserved - topMin;
  const startY = Math.max(topMin, topMin + (available - contentHeight) / 2);

  // Decorative dot
  let yPos = startY;
  ctx.beginPath();
  ctx.arc(w / 2, yPos, 6, 0, Math.PI * 2);
  ctx.fillStyle = DEEP_RED;
  ctx.fill();
  yPos += 12 + 40;

  // Chapter + book badge
  const bookName = BOOK_NAMES[kural.book]?.english ?? "";
  ctx.font = "28px Inter, sans-serif";
  ctx.fillStyle = DARK + "80";
  ctx.textAlign = "center";
  ctx.fillText(
    `${bookName} · ${kural.chapter_name_english}`,
    w / 2,
    yPos
  );
  yPos += 40;

  // Tamil text — measure first, then draw with rounded box behind
  ctx.font = "52px 'Noto Serif Tamil', serif";
  const tamilLines = kural.kural_tamil.split("\n");
  const tamilAllLines: string[] = [];
  for (const line of tamilLines) {
    const { lines } = wrapText(ctx, line.trim(), w / 2, contentWidth, 72);
    tamilAllLines.push(...lines);
  }
  const tamilTextH = tamilAllLines.length * 72;
  const boxH = BOX_PADDING + tamilTextH + BOX_PADDING;

  // Draw box
  ctx.fillStyle = SAFFRON + "15";
  ctx.strokeStyle = SAFFRON + "60";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(pad, yPos, contentWidth, boxH, 20);
  ctx.fill();
  ctx.stroke();

  // Draw Tamil text vertically centered in box
  const boxCenterY = yPos + boxH / 2;
  const firstLineY = boxCenterY - ((tamilAllLines.length - 1) * 72) / 2;
  ctx.fillStyle = DARK;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < tamilAllLines.length; i++) {
    ctx.fillText(tamilAllLines[i], w / 2, firstLineY + i * 72);
  }
  ctx.textBaseline = "alphabetic";
  yPos += boxH;

  // Gap after box
  yPos += 48;

  // Transliteration
  ctx.font = "italic 28px Inter, sans-serif";
  ctx.fillStyle = DARK + "99";
  ctx.textAlign = "center";
  const translitLines = kural.transliteration.split("\n");
  for (const line of translitLines) {
    const { lines } = wrapText(ctx, line.trim(), w / 2, contentWidth, 40);
    for (const wrappedLine of lines) {
      ctx.fillText(wrappedLine, w / 2, yPos);
      yPos += 40;
    }
  }

  // Saffron divider — centered between transliteration and explanation
  ctx.fillStyle = SAFFRON;
  ctx.fillRect(w / 2 - 30, yPos, 60, 3);
  yPos += 44;

  // English meaning
  ctx.font = "30px Inter, sans-serif";
  ctx.fillStyle = DARK + "CC";
  ctx.textAlign = "center";
  const { lines: meaningLines } = wrapText(ctx, kural.meaning_english, w / 2, contentWidth, 46);
  for (const line of meaningLines) {
    ctx.fillText(line, w / 2, yPos);
    yPos += 46;
  }

  // Decorative corner flourishes (story only — fills the extra vertical space)
  if (ratio === "story") {
    ctx.strokeStyle = SAFFRON + "20";
    ctx.lineWidth = 2;

    // Top-left corner arc
    ctx.beginPath();
    ctx.arc(pad, pad, 30, 0, Math.PI / 2);
    ctx.stroke();

    // Top-right corner arc
    ctx.beginPath();
    ctx.arc(w - pad, pad, 30, Math.PI / 2, Math.PI);
    ctx.stroke();

    // Bottom-left corner arc
    ctx.beginPath();
    ctx.arc(pad, h - pad, 30, (3 * Math.PI) / 2, 2 * Math.PI);
    ctx.stroke();

    // Bottom-right corner arc
    ctx.beginPath();
    ctx.arc(w - pad, h - pad, 30, Math.PI, (3 * Math.PI) / 2);
    ctx.stroke();
  }

  // Kural number badge
  const badgeY = h - 120;
  ctx.fillStyle = SAFFRON + "1A";
  const badgeText = `#${kural.id}`;
  ctx.font = "bold 28px Inter, sans-serif";
  const badgeWidth = ctx.measureText(badgeText).width + 40;
  const badgeX = w / 2 - badgeWidth / 2;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY - 20, badgeWidth, 40, 20);
  ctx.fill();
  ctx.strokeStyle = SAFFRON + "4D";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = SAFFRON;
  ctx.textAlign = "center";
  ctx.fillText(badgeText, w / 2, badgeY + 8);

  // Watermark
  ctx.font = "24px Inter, sans-serif";
  ctx.fillStyle = DARK + "40";
  ctx.textAlign = "center";
  ctx.fillText("OneKural", w / 2, h - 50);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });
}

const SHEET_HEIGHT = 1200;

export default function ShareCard({ kural, onClose }: ShareCardProps) {
  const [ratio, setRatio] = useState<AspectRatio>("square");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [mounted, setMounted] = useState(false);
  const blobRef = useRef<Blob | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sheetY = useMotionValue(SHEET_HEIGHT);
  const historyPushed = useRef(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  // Animate sheet in + push history entry for back-button dismiss
  useEffect(() => {
    setMounted(true);
    requestAnimationFrame(() => {
      animate(sheetY, 0, { type: "spring", stiffness: 380, damping: 38 });
    });

    if (typeof window !== "undefined") {
      history.pushState({ oneKuralSheet: true }, "");
      historyPushed.current = true;
      const handlePopState = () => {
        historyPushed.current = false;
        animate(sheetY, SHEET_HEIGHT, { type: "spring", stiffness: 380, damping: 38 }).then(onClose);
      };
      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    if (historyPushed.current) {
      historyPushed.current = false;
      history.back(); // fires popstate → animates out + calls onClose
      return;
    }
    animate(sheetY, SHEET_HEIGHT, { type: "spring", stiffness: 380, damping: 38 }).then(onClose);
  }

  function handleDragEnd(_: unknown, info: { offset: { y: number }; velocity: { y: number } }) {
    if (info.offset.y > 60 || info.velocity.y > 400) {
      dismiss();
    } else {
      animate(sheetY, 0, { type: "spring", stiffness: 500, damping: 45 });
    }
  }

  // Generate preview when ratio changes
  useEffect(() => {
    (async () => {
      const blob = await generateImage(kural, ratio);
      blobRef.current = blob;
      const url = URL.createObjectURL(blob);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    })();
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kural, ratio]);

  const handleShare = async () => {
    if (!blobRef.current) return;
    setSharing(true);

    const file = new File([blobRef.current], `kural-${kural.id}.png`, { type: "image/png" });
    const link = `${window.location.origin}/kural/${kural.id}`;
    const text = `Check out today's Thirukkural at OneKural: ${link}`;

    // Native share sheet (mobile) — lets user pick any app
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
        setSharing(false);
        dismiss();
        return;
      } catch (err) {
        setSharing(false);
        if (err instanceof Error && err.name === "AbortError") return; // user cancelled
        // other error — fall through to download
      }
    }

    // Desktop fallback: download
    const url = URL.createObjectURL(blobRef.current);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kural-${kural.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSharing(false);
  };

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-dark/40 z-[60]"
        onClick={dismiss}
      />

      {/* Panel */}
      <motion.div
        style={{ y: sheetY, maxHeight: "85dvh" }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0.05, bottom: 0 }}
        onDragEnd={handleDragEnd}
        className="fixed bottom-0 left-0 right-0 z-[60] bg-cream rounded-t-2xl max-w-content mx-auto flex flex-col"
      >
        {/* Handle — drag down or tap to close */}
        <button
          onClick={dismiss}
          aria-label="Close"
          className="flex-shrink-0 pt-3 pb-1 flex justify-center w-full"
        >
          <div className="w-10 h-1 bg-dark/15 rounded-full" />
        </button>

        <div
          ref={scrollRef}
          className="px-6 pb-8 overflow-y-auto"
          style={{ touchAction: "pan-y" }}
          onPointerDown={(e) => {
            const el = scrollRef.current;
            if (el && el.scrollTop > 0) e.stopPropagation();
          }}
        >
          <div className="flex items-center justify-between mb-4 pt-3">
            <h2 className="text-base font-semibold text-dark">Share Kural</h2>
            <button onClick={dismiss} className="text-xs text-dark/40 hover:text-dark transition-colors">
              Cancel
            </button>
          </div>

          {/* Ratio toggle */}
          <div className="flex gap-2 mb-4">
            {(Object.keys(SIZES) as AspectRatio[]).map((key) => (
              <button
                key={key}
                onClick={() => setRatio(key)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  ratio === key
                    ? "border-saffron bg-saffron/10 text-saffron"
                    : "border-dark/15 text-dark/40"
                }`}
              >
                {SIZES[key].label}
              </button>
            ))}
          </div>

          {/* Preview */}
          <div className="bg-white rounded-xl border border-dark/10 p-3 mb-4 flex justify-center">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Share card preview"
                className="rounded-lg"
                style={
                  ratio === "story"
                    ? { height: "260px", width: "auto" }
                    : { width: "100%", aspectRatio: "1 / 1" }
                }
              />
            ) : (
              <div
                className="bg-dark/5 rounded-lg flex items-center justify-center"
                style={
                  ratio === "story"
                    ? { height: "260px", aspectRatio: "9 / 16" }
                    : { width: "100%", aspectRatio: "1 / 1" }
                }
              >
                <div className="w-5 h-5 border-2 border-saffron border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Single share button — native sheet on mobile, download on desktop */}
          <button
            onClick={handleShare}
            disabled={sharing || !previewUrl}
            className="w-full bg-saffron text-white text-sm font-medium rounded-xl px-4 py-3 hover:bg-saffron/90 transition-colors disabled:opacity-50"
          >
            {sharing ? "Sharing..." : canShare ? "Share" : "Download Image"}
          </button>
        </div>
      </motion.div>
    </>
  );
}
