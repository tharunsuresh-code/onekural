"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import type { Kural } from "@/lib/types";
import { BOOK_NAMES, getSolomonTamil } from "@/lib/types";
import { usePreferences } from "@/lib/preferences";
import { openSheet, closeSheet } from "@/lib/sheet-depth";

interface ShareCardProps {
  kural: Kural;
  onClose: () => void;
}

type AspectRatio = "story" | "square";

const SIZES: Record<AspectRatio, { w: number; h: number; label: string }> = {
  square: { w: 1080, h: 1080, label: "Square (1:1)" },
  story: { w: 1080, h: 1920, label: "Story (9:16)" },
};

// Colors
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

/**
 * Measure content height without drawing, so we can vertically center.
 * Layout mirrors KuralDetailCard: kural open, Insight in a box.
 */
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

  // Divider line top + gap (gap measured to top of glyph, textBaseline = "top")
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

  // Insight box: label + meaning text
  const insightPadV = 44;
  const insightPadH = 48;
  const innerW = contentWidth - insightPadH * 2;
  const insightText = boxContent === "tamil" ? getSolomonTamil(kural) : kural.meaning_english;
  ctx.font = "500 24px Inter, sans-serif";
  h += insightPadV; // top pad + label
  h += 24 + 24; // label height + gap
  ctx.font = boxContent === "tamil" ? "22px 'Noto Serif Tamil', serif" : "italic 26px Georgia, serif";
  const insightLineH = boxContent === "tamil" ? 34 : 40;
  const { lines: meaningLines } = wrapText(ctx, insightText, 0, innerW, insightLineH);
  h += meaningLines.length * insightLineH;
  h += insightPadV; // bottom pad

  return h;
}

async function generateImage(
  kural: Kural,
  ratio: AspectRatio,
  boxContent: "tamil" | "transliteration"
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

  // Divider line — top (mirrors editorial line on card)
  ctx.fillStyle = EMERALD + "80";
  ctx.fillRect(w / 2 - 24, yPos, 48, 3);
  yPos += 3 + 56;

  // Open kural text (no box) — textBaseline "top" so gaps above and below are visually equal
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
    ctx.fillText(kuralLines[i], w / 2, yPos + i * kuralLineH);
  }
  ctx.textBaseline = "alphabetic";
  yPos += kuralLines.length * kuralLineH;

  // Divider line — bottom
  yPos += 56;
  ctx.fillStyle = EMERALD + "80";
  ctx.fillRect(w / 2 - 24, yPos, 48, 3);
  yPos += 3 + 56;

  // Insight box — mirrors the card's emerald-tinted rounded box
  const insightPadV = 44;
  const insightPadH = 48;
  const innerW = contentWidth - insightPadH * 2;
  const insightText = boxContent === "tamil" ? getSolomonTamil(kural) : kural.meaning_english;
  const insightFont = boxContent === "tamil" ? "22px 'Noto Serif Tamil', serif" : "italic 26px Georgia, serif";
  const insightLineH = boxContent === "tamil" ? 34 : 40;

  // Measure insight box height
  ctx.font = insightFont;
  const { lines: meaningLines } = wrapText(ctx, insightText, w / 2, innerW, insightLineH);
  const insightTextH = meaningLines.length * insightLineH;
  const insightBoxH = insightPadV + 24 + 24 + insightTextH + insightPadV;

  // Draw box
  ctx.fillStyle = EMERALD + "14";
  ctx.strokeStyle = EMERALD + "30";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(pad, yPos, contentWidth, insightBoxH, 20);
  ctx.fill();
  ctx.stroke();

  // "INSIGHT" label — uppercase tracking, small, emerald
  ctx.font = "500 22px Inter, sans-serif";
  ctx.fillStyle = EMERALD + "B3"; // ~70% opacity
  ctx.textAlign = "center";
  ctx.fillText("INSIGHT", w / 2, yPos + insightPadV + 22);

  // Meaning text — Tamil or italic Georgia, matching card
  ctx.font = insightFont;
  ctx.fillStyle = DARK + "CC";
  const meaningStartY = yPos + insightPadV + 22 + 24 + (boxContent === "tamil" ? 22 : 26);
  for (let i = 0; i < meaningLines.length; i++) {
    ctx.fillText(meaningLines[i], w / 2, meaningStartY + i * insightLineH);
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

  // Kural number badge — top right, mirroring the card
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

  // Watermark — அ · OneKural, bottom-center
  ctx.font = "28px 'Noto Serif Tamil', serif";
  ctx.fillStyle = DARK + "35";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("அ · OneKural", w / 2, h - 50);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });
}

const SHEET_HEIGHT = 1200;

export default function ShareCard({ kural, onClose }: ShareCardProps) {
  const { boxContent } = usePreferences();
  const [ratio, setRatio] = useState<AspectRatio>("square");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [mounted, setMounted] = useState(false);
  const blobRef = useRef<Blob | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sheetY = useMotionValue(SHEET_HEIGHT);
  const backdropOpacity = useTransform(sheetY, [0, SHEET_HEIGHT * 0.4], [1, 0]);
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
      const dismissCallback = () => {
        historyPushed.current = false;
        animate(sheetY, SHEET_HEIGHT, { type: "spring", stiffness: 380, damping: 38 }).then(onClose);
      };
      openSheet(dismissCallback);
      // Bubble-phase fallback: handles back press when sheet is on a non-root page
      window.addEventListener("popstate", dismissCallback);
      return () => {
        window.removeEventListener("popstate", dismissCallback);
        closeSheet();
      };
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

  // Generate preview when kural or ratio changes — fade out, generate, fade in.
  useEffect(() => {
    setPreviewReady(false);
    let cancelled = false;
    (async () => {
      const blob = await generateImage(kural, ratio, boxContent);
      if (cancelled) return;
      blobRef.current = blob;
      setPreviewUrl(URL.createObjectURL(blob));
      setPreviewReady(true);
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kural.id, ratio, boxContent]);

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
        style={{ opacity: backdropOpacity }}
        className="fixed inset-0 bg-dark/40 dark:bg-dark/60 z-[60]"
        onClick={dismiss}
      />

      {/* Panel */}
      <motion.div
        style={{ y: sheetY, maxHeight: "85dvh" }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0.05, bottom: 0 }}
        onDragEnd={handleDragEnd}
        className="fixed bottom-0 left-0 right-0 z-[60] bg-cream dark:bg-dark-subtle rounded-t-2xl max-w-content mx-auto flex flex-col"
      >
        {/* Handle — drag down or tap to close */}
        <button
          onClick={dismiss}
          aria-label="Close"
          className="flex-shrink-0 pt-3 pb-1 flex justify-center w-full"
        >
          <div className="w-10 h-1 bg-dark/15 dark:bg-dark-fg/20 rounded-full" />
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
            <h2 className="text-base font-semibold text-dark dark:text-dark-fg">Share Kural</h2>
            <button onClick={dismiss} className="text-xs text-dark/40 dark:text-dark-fg/50 hover:text-dark dark:hover:text-dark-fg transition-colors">
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
                    ? "border-emerald bg-emerald/10 dark:bg-emerald/20 text-emerald"
                    : "border-dark/15 dark:border-dark-fg/20 text-dark/40 dark:text-dark-fg/50"
                }`}
              >
                {SIZES[key].label}
              </button>
            ))}
          </div>

          {/* Preview — fixed 1:1 box, image fits inside with object-contain */}
          <div className="bg-dark/5 dark:bg-dark-fg/10 rounded-xl border border-dark/10 dark:border-dark-fg/20 p-3 mb-4 w-full aspect-square flex items-center justify-center">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Share card preview"
                className="w-full h-full rounded-lg object-contain transition-opacity duration-300"
                style={{ opacity: previewReady ? 1 : 0 }}
              />
            ) : (
              <div className="w-5 h-5 border-2 border-emerald border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {/* Single share button — native sheet on mobile, download on desktop */}
          <button
            onClick={handleShare}
            disabled={sharing || !previewUrl}
            className="w-full bg-emerald text-white text-sm font-medium rounded-xl px-4 py-3 hover:bg-emerald/90 transition-colors disabled:opacity-50"
          >
            {sharing ? "Sharing..." : canShare ? "Share" : "Download Image"}
          </button>
        </div>
      </motion.div>
    </>
  );
}
