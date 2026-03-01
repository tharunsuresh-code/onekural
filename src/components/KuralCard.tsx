"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import Link from "next/link";
import type { Kural } from "@/lib/types";
import { BOOK_NAMES } from "@/lib/types";
import { useFavorites } from "@/lib/favorites";
import JournalEditor from "./JournalEditor";
import ShareCard from "./ShareCard";
import CommentariesSheet from "./CommentariesSheet";

interface KuralCardProps {
  initialKural: Kural;
}

async function fetchKural(id: number): Promise<Kural | null> {
  if (id < 1 || id > 1330) return null;
  try {
    const res = await fetch(`/api/kural/${id}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default function KuralCard({ initialKural }: KuralCardProps) {
  const [kural, setKural] = useState<Kural>(initialKural);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showCommentaries, setShowCommentaries] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();

  // Horizontal swipe only — no y motion value so card never moves vertically
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const rotate = useTransform(x, [-200, 0, 200], [-5, 0, 5]);

  // Midnight IST rollover
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const nowIST = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });
      const loadedDate = sessionStorage.getItem("kural-date");
      if (loadedDate && loadedDate !== nowIST) {
        window.location.reload();
      }
    };
    const nowIST = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
    sessionStorage.setItem("kural-date", nowIST);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const navigateKural = useCallback(
    async (direction: "prev" | "next") => {
      if (isAnimating) return;
      const nextId =
        direction === "next"
          ? kural.id < 1330 ? kural.id + 1 : 1
          : kural.id > 1 ? kural.id - 1 : 1330;

      setIsAnimating(true);
      const nextKural = await fetchKural(nextId);
      if (nextKural) setKural(nextKural);
      setIsAnimating(false);
    },
    [kural.id, isAnimating]
  );

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) => {
      const threshold = 50;
      const velocityThreshold = 300;

      // Swipe up: open commentaries (only when vertical movement dominates)
      const isVertical = Math.abs(info.offset.y) > Math.abs(info.offset.x);
      if (isVertical && (info.offset.y < -threshold || info.velocity.y < -velocityThreshold)) {
        setShowCommentaries(true);
        return;
      }

      // Horizontal swipes: prev/next kural
      if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
        navigateKural("next");
      } else if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
        navigateKural("prev");
      }
      animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
    },
    [navigateKural, x, kural.id]
  );

  const bookName = BOOK_NAMES[kural.book]?.english ?? "";
  const dateStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Kolkata",
  });
  const faved = isFavorite(kural.id);

  return (
    <>
      <main className="flex flex-col h-dvh max-w-content mx-auto px-6 pt-14 pb-24 select-none">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between mb-10"
        >
          <div>
            <p className="text-xs uppercase tracking-widest text-saffron font-semibold">
              Today&apos;s Kural
            </p>
            <p className="text-sm text-dark/50 mt-0.5" suppressHydrationWarning>{dateStr}</p>
          </div>
          <Link
            href={`/kural/${kural.id}`}
            className="text-xs bg-saffron/10 text-saffron border border-saffron/30 rounded-full px-3 py-1 font-medium"
          >
            #{kural.id}
          </Link>
        </motion.div>

        {/* Swipeable card — horizontal drag only, card never moves vertically */}
        <motion.div
          key={kural.id}
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={{ left: 0.15, right: 0.15, top: 0, bottom: 0 }}
          dragSnapToOrigin
          onDragEnd={handleDragEnd}
          style={{ x, opacity, rotate }}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex-1 flex flex-col justify-center"
        >
          {/* Chapter badge */}
          <div className="flex items-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-deep-red inline-block" />
            <span className="text-xs text-dark/50 tracking-wide">
              {bookName} · {kural.chapter_name_english}
            </span>
          </div>

          {/* Tamil text */}
          <p className="font-tamil text-2xl leading-loose text-dark whitespace-pre-line text-center mb-6">
            {kural.kural_tamil}
          </p>

          {/* Divider */}
          <div className="w-10 h-0.5 bg-saffron mb-6 rounded-full mx-auto" />

          {/* Transliteration */}
          <p className="text-sm text-dark/60 italic whitespace-pre-line leading-relaxed text-center mb-6">
            {kural.transliteration}
          </p>

          {/* Meaning */}
          <p className="text-base text-dark/80 leading-relaxed">
            {kural.meaning_english}
          </p>

          {/* Tap hint for commentaries */}
          <button
            onClick={() => setShowCommentaries(true)}
            className="mt-6 flex flex-col items-center gap-1 w-full opacity-30 hover:opacity-60 transition-opacity"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 15l-6-6-6 6" />
            </svg>
            <span className="text-xs tracking-wide">Scholars</span>
          </button>
        </motion.div>

        {/* Action row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex items-center justify-between pt-4 border-t border-dark/10"
        >
          <button
            onClick={() => toggleFavorite(kural.id)}
            className={`text-sm flex items-center gap-1.5 transition-colors ${
              faved ? "text-deep-red" : "text-dark/50"
            }`}
          >
            <span>{faved ? "♥" : "♡"}</span> Favourite
          </button>
          <button
            onClick={() => setShowJournal(true)}
            className="text-sm text-dark/50 flex items-center gap-1.5"
          >
            <span>✎</span> Journal
          </button>
          <button
            onClick={() => setShowShare(true)}
            className="text-sm text-dark/50 flex items-center gap-1.5"
          >
            <span>↑</span> Share
          </button>
        </motion.div>
      </main>

      {showJournal && (
        <JournalEditor kural={kural} onClose={() => setShowJournal(false)} />
      )}

      {showShare && (
        <ShareCard kural={kural} onClose={() => setShowShare(false)} />
      )}

      <CommentariesSheet
        kural={kural}
        open={showCommentaries}
        onClose={() => setShowCommentaries(false)}
      />
    </>
  );
}
