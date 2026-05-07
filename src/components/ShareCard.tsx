"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import type { Kural } from "@/lib/types";
import { usePreferences } from "@/lib/preferences";
import { openSheet, closeSheet } from "@/lib/sheet-depth";
import { generateImage, SIZES, type AspectRatio } from "./ShareCard/ShareImageGenerator";

interface ShareCardProps {
  kural: Kural;
  onClose: () => void;
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
      history.back();
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

  // Generate preview when kural or ratio changes
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

    // Native share sheet (mobile)
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
        setSharing(false);
        dismiss();
        return;
      } catch (err) {
        setSharing(false);
        if (err instanceof Error && err.name === "AbortError") return;
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
        {/* Handle */}
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

          {/* Preview */}
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

          {/* Share / Download button */}
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
