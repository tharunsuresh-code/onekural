"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import type { Kural } from "@/lib/types";
import { usePreferences } from "@/lib/preferences";

interface ExplanationSheetProps {
  kural: Kural;
  onClose: () => void;
}

const SHEET_HEIGHT = 1200;

function renderExplanation(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const isCitation = (l: string) => /^\*\*/.test(l.trim());
  return lines.map((line, i) => {
    // citation → citation: tight spacing; anything else: larger gap
    const marginClass = i === 0 ? "" : isCitation(line) && isCitation(lines[i - 1]) ? "mt-2" : "mt-6";

    const parts = line.split(/\*\*(.+?)\*\*/g);
    return (
      <p key={i} className={marginClass}>
        {parts.map((p, j) =>
          j % 2 === 1 ? (
            <strong key={j} className="font-semibold text-dark/90 dark:text-dark-fg/95">{p}</strong>
          ) : p
        )}
      </p>
    );
  });
}

export default function ExplanationSheet({ kural, onClose }: ExplanationSheetProps) {
  const { boxContent } = usePreferences();
  const lang = boxContent === "tamil" ? "tamil" : "english";
  const scrollRef = useRef<HTMLDivElement>(null);
  const sheetY = useMotionValue(SHEET_HEIGHT);
  const backdropOpacity = useTransform(sheetY, [0, SHEET_HEIGHT * 0.4], [1, 0]);
  const historyPushed = useRef(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      animate(sheetY, 0, { type: "spring", stiffness: 380, damping: 38 });
    });

    // Prevent underlying page from scrolling/swiping while sheet is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (typeof window === "undefined") return;
    history.pushState({ oneKuralSheet: true }, "");
    historyPushed.current = true;
    const handlePopState = () => {
      historyPushed.current = false;
      animate(sheetY, SHEET_HEIGHT, { type: "spring", stiffness: 380, damping: 38 }).then(onClose);
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      document.body.style.overflow = prevOverflow;
    };
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

  const content = lang === "tamil" ? kural.explanation_tamil : kural.explanation_english;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-dark/40 dark:bg-dark/60 z-[59]"
        style={{ opacity: backdropOpacity }}
        onClick={dismiss}
        onPointerDown={(e) => e.stopPropagation()}
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

        {/* Header — outside scroll so it stays visible */}
        <div className="flex items-center justify-between px-6 pt-1 pb-4 flex-shrink-0">
          <p className="text-xs uppercase tracking-widest text-emerald/70 dark:text-emerald font-medium">
            {lang === "tamil" ? "விளக்கம்" : "Explanation"}
          </p>
          <button
            onClick={dismiss}
            aria-label="Close"
            className="text-dark/35 dark:text-dark-fg/45 hover:text-dark dark:hover:text-dark-fg transition-colors leading-none"
          >
            ✕
          </button>
        </div>

        <div
          ref={scrollRef}
          className="px-6 pb-10 overflow-y-auto"
          style={{ touchAction: "pan-y", overscrollBehavior: "contain" }}
          onPointerDown={(e) => {
            const el = scrollRef.current;
            if (el && el.scrollTop > 0) e.stopPropagation();
          }}
        >
          {content ? (
            <div className={`text-sm leading-relaxed text-dark/75 dark:text-dark-fg/80 ${
              lang === "tamil" ? "font-tamil" : "font-serif"
            }`}>
              {renderExplanation(content)}
            </div>
          ) : (
            <p className="text-sm text-dark/40 dark:text-dark-fg/50 italic">
              Explanation coming soon.
            </p>
          )}
        </div>
      </motion.div>
    </>
  );
}
