"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "onekural-onboarded-v2";

function MobileHints() {
  return (
    <>
      <p className="text-white/90 text-base font-semibold tracking-wide">
        How to navigate
      </p>

      {/* Left / Right swipe */}
      <div className="flex items-center justify-center gap-14">
        {/* Swipe right = previous kural */}
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ x: [-12, 12, -12] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            className="text-white/80"
          >
            {/* Touch dot + rightward arrow — icon moves in the swipe direction */}
            <svg width="40" height="24" viewBox="0 0 40 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="12" r="4" strokeWidth="1.5" />
              <path d="M12 12h20" />
              <path d="M27 7l5 5-5 5" />
            </svg>
          </motion.div>
          <span className="text-xs text-white/60 text-center leading-relaxed">
            Swipe right<br />Previous kural
          </span>
        </div>

        <div className="w-px self-stretch bg-white/15" />

        {/* Swipe left = next kural */}
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ x: [12, -12, 12] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            className="text-white/80"
          >
            {/* Leftward arrow + touch dot — icon moves in the swipe direction */}
            <svg width="40" height="24" viewBox="0 0 40 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="34" cy="12" r="4" strokeWidth="1.5" />
              <path d="M28 12H8" />
              <path d="M13 7L8 12l5 5" />
            </svg>
          </motion.div>
          <span className="text-xs text-white/60 text-center leading-relaxed">
            Swipe left<br />Next kural
          </span>
        </div>
      </div>

      <div className="w-20 h-px bg-white/15 rounded-full" />

      {/* Tap for Explanation callout */}
      <div className="flex flex-col items-center gap-3">
        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
          className="border border-white/60 rounded-lg px-5 py-2.5 text-xs uppercase tracking-widest text-white/80 font-medium"
        >
          Tap for Explanation
        </motion.div>
        <span className="text-xs text-white/60 text-center leading-relaxed">
          Click here for<br />further explanation
        </span>
      </div>

    </>
  );
}

function DesktopHints() {
  return (
    <>
      <p className="text-white/90 text-base font-semibold tracking-wide">
        How to navigate
      </p>

      {/* Left / Right click */}
      <div className="flex items-center justify-center gap-14">
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ x: [-6, 0, -6] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            className="text-white/80"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </motion.div>
          <span className="text-xs text-white/60 text-center leading-relaxed">
            Click left arrow<br />previous kural
          </span>
        </div>

        <div className="w-px self-stretch bg-white/15" />

        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ x: [6, 0, 6] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            className="text-white/80"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </motion.div>
          <span className="text-xs text-white/60 text-center leading-relaxed">
            Click right arrow<br />next kural
          </span>
        </div>
      </div>

      <div className="w-20 h-px bg-white/15 rounded-full" />

      {/* Tap for Explanation callout */}
      <div className="flex flex-col items-center gap-3">
        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          className="border border-white/60 rounded-lg px-5 py-2.5 text-xs uppercase tracking-widest text-white/80 font-medium"
        >
          Tap for Explanation
        </motion.div>
        <span className="text-xs text-white/60 text-center leading-relaxed">
          Click here for<br />further explanation
        </span>
      </div>

    </>
  );
}

export default function OnboardingHint() {
  const [show, setShow] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [langBtnRect, setLangBtnRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    setIsMobile(window.matchMedia("(pointer: coarse)").matches);
    if (!localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setShow(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  // Measure the language toggle button position once the overlay is visible
  useEffect(() => {
    if (!show) return;
    rafRef.current = requestAnimationFrame(() => {
      const btn = document.querySelector<HTMLElement>("[data-lang-toggle]");
      if (btn) setLangBtnRect(btn.getBoundingClientRect());
    });
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [show]);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[70] bg-dark/80 flex flex-col items-center justify-center px-8"
          onClick={dismiss}
        >
          {/* Theme toggle callout — absolute within the fixed backdrop so it isn't
              affected by the y-transform on the inner motion.div below.
              left: max(24px, calc((100vw - 680px)/2 + 24px)) tracks the ThemeSwitcher
              at px-6 inside the max-w-content centered card on any screen width. */}
          <div
            className="absolute flex items-center gap-2 pointer-events-none"
            style={{ top: "56px", left: "max(24px, calc((100vw - 680px) / 2 + 24px))" }}
          >
            <div className="relative w-10 h-10 flex-shrink-0">
              <motion.div
                animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut" }}
                className="absolute inset-0 rounded-lg bg-white/60"
              />
              <div className="absolute inset-0 rounded-lg border border-white/70" />
            </div>
            <span className="text-xs text-white/80 leading-relaxed whitespace-nowrap">
              Tap to switch<br />light / dark / system
            </span>
          </div>

          {/* Language switch callout — text above the button, anchored from button bottom */}
          {langBtnRect && (
            <div
              className="absolute flex flex-col items-end gap-1.5 pointer-events-none"
              style={{
                bottom: window.innerHeight - langBtnRect.bottom,
                right: window.innerWidth - langBtnRect.right,
              }}
            >
              <span className="text-xs text-white/80 leading-relaxed whitespace-nowrap text-right">
                Tap to switch<br />Tamil / English
              </span>
              <div
                className="relative flex-shrink-0"
                style={{ width: langBtnRect.width, height: langBtnRect.height }}
              >
                <motion.div
                  animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeOut", delay: 0.3 }}
                  className="absolute inset-0 rounded-full bg-white/60"
                />
                <div className="absolute inset-0 rounded-full border border-white/70" />
              </div>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex flex-col items-center gap-10 max-w-xs w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {isMobile ? <MobileHints /> : <DesktopHints />}

            <button
              onClick={dismiss}
              className="mt-2 bg-emerald text-white text-sm font-semibold px-10 py-2.5 rounded-full hover:bg-emerald/90 transition-colors"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
