"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import type { Kural } from "@/lib/types";
import { BOOK_NAMES } from "@/lib/types";
import { useFavorites } from "@/lib/favorites";
import JournalEditor from "./JournalEditor";
import ShareCard from "./ShareCard";
import CommentariesSheet from "./CommentariesSheet";

interface KuralDetailCardProps {
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

export default function KuralDetailCard({ initialKural }: KuralDetailCardProps) {
  const router = useRouter();
  const [kural, setKural] = useState<Kural>(initialKural);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showCommentaries, setShowCommentaries] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();

  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const rotate = useTransform(x, [-200, 0, 200], [-5, 0, 5]);

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

      const isVertical = Math.abs(info.offset.y) > Math.abs(info.offset.x);
      if (isVertical && (info.offset.y < -threshold || info.velocity.y < -velocityThreshold)) {
        setShowCommentaries(true);
        return;
      }

      if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
        navigateKural("next");
      } else if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
        navigateKural("prev");
      }
      animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
    },
    [navigateKural, x]
  );

  const bookName = BOOK_NAMES[kural.book]?.english ?? "";
  const faved = isFavorite(kural.id);
  const prevId = kural.id > 1 ? kural.id - 1 : 1330;
  const nextId = kural.id < 1330 ? kural.id + 1 : 1;

  return (
    <>
      <main className="relative flex flex-col h-dvh max-w-content mx-auto px-6 pt-14 pb-nav select-none">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={() => router.back()}
            className="text-sm text-dark/50 hover:text-saffron transition-colors"
          >
            ← Back
          </button>
          <span className="text-xs bg-saffron/10 text-saffron border border-saffron/30 rounded-full px-3 py-1 font-medium">
            #{kural.id}
          </span>
        </div>

        {/* Navigation bands — outside drag container so no pointer conflicts */}
        <button
          onClick={() => navigateKural("prev")}
          className="absolute left-0 top-[25%] bottom-[25%] w-10 flex flex-col items-center justify-center gap-2 opacity-50 hover:opacity-80 active:opacity-100 transition-opacity"
          aria-label={`Previous kural #${prevId}`}
        >
          <svg width="14" height="22" viewBox="0 0 9 15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-dark/80">
            <path d="M7 1L1 7.5L7 14" />
          </svg>
          <span className="text-[10px] font-semibold text-dark/60 leading-none">#{prevId}</span>
        </button>
        <button
          onClick={() => navigateKural("next")}
          className="absolute right-0 top-[25%] bottom-[25%] w-10 flex flex-col items-center justify-center gap-2 opacity-50 hover:opacity-80 active:opacity-100 transition-opacity"
          aria-label={`Next kural #${nextId}`}
        >
          <svg width="14" height="22" viewBox="0 0 9 15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-dark/80">
            <path d="M2 1L8 7.5L2 14" />
          </svg>
          <span className="text-[10px] font-semibold text-dark/60 leading-none">#{nextId}</span>
        </button>

        {/* Swipeable card */}
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
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col justify-center"
        >
          {/* Chapter badge */}
          <div className="flex items-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-deep-red inline-block" />
            <span className="text-xs text-dark/50 tracking-wide">
              {bookName} · {kural.chapter_name_english}
            </span>
          </div>

          {/* Kural box — full-bleed lines with warm fill */}
          <div className="relative -mx-6 px-6 py-5 mb-6 text-center">
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(244,165,40,0.07) 0%, rgba(244,165,40,0.12) 50%, rgba(244,165,40,0.07) 100%)" }} />
            <div className="absolute top-0 left-0 right-0 h-px bg-saffron/50" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-saffron/50" />
            <p className="relative font-tamil text-2xl leading-loose text-dark whitespace-pre-line">
              {kural.kural_tamil}
            </p>
          </div>

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
        <div className="flex items-center justify-between pt-4 border-t border-dark/10">
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
        </div>
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
