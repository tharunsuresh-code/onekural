"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import type { Kural } from "@/lib/types";

interface ExplanationSheetProps {
  kural: Kural;
  onClose: () => void;
}

const SHEET_HEIGHT = 1200;

export default function ExplanationSheet({ kural, onClose }: ExplanationSheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sheetY = useMotionValue(SHEET_HEIGHT);
  const backdropOpacity = useTransform(sheetY, [0, SHEET_HEIGHT * 0.4], [1, 0]);
  const historyPushed = useRef(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      animate(sheetY, 0, { type: "spring", stiffness: 380, damping: 38 });
    });

    if (typeof window === "undefined") return;
    history.pushState({ oneKuralSheet: true }, "");
    historyPushed.current = true;
    const handlePopState = () => {
      historyPushed.current = false;
      animate(sheetY, SHEET_HEIGHT, { type: "spring", stiffness: 380, damping: 38 }).then(onClose);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
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

  const couplet = kural.scholars?.find((s) => s.name === "Couplet")?.commentary;
  const commentary = kural.scholars_en;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-dark/40 dark:bg-dark/60 z-[59]"
        style={{ opacity: backdropOpacity }}
        onClick={dismiss}
      />

      {/* Sheet */}
      <motion.div
        style={{ y: sheetY, maxHeight: "80dvh" }}
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
          className="px-6 pb-10 overflow-y-auto"
          style={{ touchAction: "pan-y" }}
          onPointerDown={(e) => {
            const el = scrollRef.current;
            if (el && el.scrollTop > 0) e.stopPropagation();
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5 pt-1">
            <div>
              <span className="text-xs text-dark/40 dark:text-dark-fg/50">
                Kural #{kural.id} · {kural.chapter_name_english}
              </span>
            </div>
            <button
              onClick={dismiss}
              className="text-xs text-dark/40 dark:text-dark-fg/50 hover:text-dark dark:hover:text-dark-fg transition-colors"
            >
              Done
            </button>
          </div>

          {/* Tamil kural for reference */}
          <p className="font-tamil text-sm text-dark/60 dark:text-dark-fg/65 leading-relaxed mb-5">
            {kural.kural_tamil}
          </p>

          <div className="h-px bg-emerald/20 dark:bg-emerald/30 mb-5" />

          {/* Couplet */}
          {couplet && (
            <div className="mb-6">
              <p className="text-xs uppercase tracking-widest text-emerald/70 dark:text-emerald mb-2 font-medium">
                Couplet
              </p>
              <p className="font-serif text-base italic leading-relaxed text-dark/75 dark:text-dark-fg/80">
                {couplet}
              </p>
            </div>
          )}

          {/* Commentary */}
          {commentary ? (
            <div className="mb-6">
              <p className="text-xs uppercase tracking-widest text-emerald/70 dark:text-emerald mb-2 font-medium">
                Commentary
              </p>
              <p className="font-serif text-base leading-relaxed text-dark/80 dark:text-dark-fg/85">
                {commentary}
              </p>
            </div>
          ) : (
            <div className="mb-6">
              <p className="text-xs uppercase tracking-widest text-emerald/70 dark:text-emerald mb-2 font-medium">
                Commentary
              </p>
              <p className="text-sm text-dark/35 dark:text-dark-fg/40 italic">
                Extended commentary coming soon.
              </p>
            </div>
          )}

          {/* Attribution */}
          <p className="text-xs text-dark/30 dark:text-dark-fg/35 text-center mt-2">
            G.U. Pope, 1886 — public domain
          </p>
        </div>
      </motion.div>
    </>
  );
}
