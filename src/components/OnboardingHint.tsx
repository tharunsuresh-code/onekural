"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "onekural-onboarded-v1";

function GestureHint({
  icon,
  motionAxis,
  label,
}: {
  icon: React.ReactNode;
  motionAxis: "x" | "y";
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        animate={
          motionAxis === "x"
            ? { x: [-10, 0, -10] }
            : { y: [-10, 0, -10] }
        }
        transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
        className="text-white/80"
      >
        {icon}
      </motion.div>
      <span className="text-xs text-white/60 text-center leading-relaxed whitespace-pre-line">
        {label}
      </span>
    </div>
  );
}

export default function OnboardingHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
      // Small delay so user sees the kural card first
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
            <p className="text-white/90 text-base font-semibold tracking-wide">
              How to navigate
            </p>

            {/* Left / Right */}
            <div className="flex items-center justify-center gap-16 w-full">
              <GestureHint
                motionAxis="x"
                icon={
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                }
                label={"Swipe right\nprevious kural"}
              />

              <div className="w-px h-10 bg-white/15 rounded-full" />

              <GestureHint
                motionAxis="x"
                icon={
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                }
                label={"Swipe left\nnext kural"}
              />
            </div>

            {/* Separator */}
            <div className="w-20 h-px bg-white/15 rounded-full" />

            {/* Swipe up */}
            <GestureHint
              motionAxis="y"
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 15l-6-6-6 6" />
                </svg>
              }
              label={"Swipe up\nscholar commentaries"}
            />

            <button
              onClick={dismiss}
              className="mt-2 bg-saffron text-white text-sm font-semibold px-10 py-2.5 rounded-full hover:bg-saffron/90 transition-colors"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
