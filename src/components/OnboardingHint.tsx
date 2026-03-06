"use client";

import { useState, useEffect } from "react";
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
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ x: [-10, 0, -10] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            className="text-white/80"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </motion.div>
          <span className="text-xs text-white/60 text-center leading-relaxed">
            Swipe right<br />previous kural
          </span>
        </div>

        <div className="w-px h-10 bg-white/15 rounded-full" />

        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ x: [10, 0, 10] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            className="text-white/80"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </motion.div>
          <span className="text-xs text-white/60 text-center leading-relaxed">
            Swipe left<br />next kural
          </span>
        </div>
      </div>

      <div className="w-20 h-px bg-white/15 rounded-full" />

      {/* Swipe up */}
      <div className="flex flex-col items-center gap-3">
        <motion.div
          animate={{ y: [-10, 0, -10] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
          className="text-white/80"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </motion.div>
        <span className="text-xs text-white/60 text-center leading-relaxed">
          Swipe up<br />for explanation
        </span>
      </div>

      <div className="w-20 h-px bg-white/15 rounded-full" />

      {/* Dark / light mode */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-white/80">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <span className="text-white/40 text-sm">/</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </div>
        <span className="text-xs text-white/60 text-center leading-relaxed">
          Tap ☀/☾ in the header<br />to switch theme
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

        <div className="w-px h-10 bg-white/15 rounded-full" />

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

      {/* Explanation button */}
      <div className="flex flex-col items-center gap-3">
        <motion.div
          animate={{ y: [-6, 0, -6] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          className="text-white/80"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </motion.div>
        <span className="text-xs text-white/60 text-center leading-relaxed">
          Click <strong className="text-white/80">Explanation</strong><br />for full breakdown
        </span>
      </div>

      <div className="w-20 h-px bg-white/15 rounded-full" />

      {/* Dark / light mode */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-white/80">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <span className="text-white/40 text-sm">/</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </div>
        <span className="text-xs text-white/60 text-center leading-relaxed">
          Click ☀/☾ in the header<br />to switch theme
        </span>
      </div>
    </>
  );
}

export default function OnboardingHint() {
  const [show, setShow] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.matchMedia("(pointer: coarse)").matches);
    if (!localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setShow(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

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
