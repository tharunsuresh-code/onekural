"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import type { Kural } from "@/lib/types";

interface CommentariesSheetProps {
  kural: Kural;
  open: boolean;
  onClose: () => void;
}

const SHEET_HEIGHT = 1200;

export default function CommentariesSheet({ kural, open, onClose }: CommentariesSheetProps) {
  const [mounted, setMounted] = useState(false);
  const sheetY = useMotionValue(SHEET_HEIGHT);
  const backdropOpacity = useTransform(sheetY, [0, SHEET_HEIGHT * 0.4], [1, 0]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const historyPushed = useRef(false);

  // Mount + animate in; animate out before unmounting
  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => {
        animate(sheetY, 0, { type: "spring", stiffness: 380, damping: 38 });
      });
    } else if (mounted) {
      animate(sheetY, SHEET_HEIGHT, {
        type: "spring",
        stiffness: 380,
        damping: 38,
      }).then(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Back-button / Android back gesture closes sheet
  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    history.pushState({ oneKuralSheet: true }, "");
    historyPushed.current = true;

    const handlePopState = () => {
      historyPushed.current = false;
      onClose();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [open, onClose]);

  if (!mounted) return null;

  // Dismiss from swipe or button — also pops the history entry we pushed
  function dismiss() {
    if (historyPushed.current) {
      historyPushed.current = false;
      history.back(); // fires popstate, but ref is false so handler is a no-op
    }
    onClose();
  }

  function handleDragEnd(_: unknown, info: { offset: { y: number }; velocity: { y: number } }) {
    if (info.offset.y > 40 || info.velocity.y > 250) {
      dismiss();
    } else {
      animate(sheetY, 0, { type: "spring", stiffness: 500, damping: 45 });
    }
  }

  return (
    <>
      {/* Backdrop — z-[59] so it covers the BottomNav (z-50) */}
      <motion.div
        className="fixed inset-0 bg-dark/40 z-[59]"
        style={{ opacity: backdropOpacity }}
        onClick={dismiss}
      />

      {/* Sheet — z-[60] so it sits above the nav */}
      <motion.div
        style={{ y: sheetY, maxHeight: "85dvh" }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0.05, bottom: 0 }}
        onDragEnd={handleDragEnd}
        className="fixed bottom-0 left-0 right-0 z-[60] bg-cream rounded-t-2xl max-w-content mx-auto flex flex-col"
      >
        {/* Drag handle */}
        <div className="flex-shrink-0 pt-3 pb-1 flex flex-col items-center">
          <div className="w-10 h-1 bg-dark/15 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3">
          <h2 className="text-sm font-semibold text-dark">
            Commentaries
            <span className="ml-2 text-xs font-normal text-dark/40">#{kural.id}</span>
          </h2>
          <button
            onClick={dismiss}
            className="text-xs text-dark/40 hover:text-dark transition-colors"
          >
            Close
          </button>
        </div>

        {/* Scrollable content — only block drag when scrolled away from top */}
        <div
          ref={scrollRef}
          className="overflow-y-auto px-6 pb-8"
          style={{ touchAction: "pan-y" }}
          onPointerDown={(e) => {
            const el = scrollRef.current;
            if (el && el.scrollHeight > el.clientHeight) e.stopPropagation();
          }}
        >
          {/* Tamil kural reminder */}
          <p className="font-tamil text-lg leading-loose text-dark text-center whitespace-pre-line mb-4 pb-4 border-b border-dark/10">
            {kural.kural_tamil}
          </p>

          {/* Scholar commentaries */}
          <div className="space-y-5">
            {kural.scholars.map((scholar) => {
              const isEnglish = scholar.name === "Explanation" || scholar.name === "Couplet";
              return (
                <div key={scholar.name}>
                  <p className="text-xs font-semibold text-saffron uppercase tracking-wide mb-1.5">
                    {scholar.name}
                  </p>
                  <p
                    className={`leading-relaxed text-dark/80 ${
                      isEnglish ? "text-sm" : "font-tamil text-base"
                    }`}
                  >
                    {scholar.commentary}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </>
  );
}
