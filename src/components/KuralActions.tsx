"use client";

import { useState, useCallback } from "react";
import { useFavorites } from "@/lib/favorites";
import { usePreferences } from "@/lib/preferences";
import JournalEditor from "./JournalEditor";
import Toast from "./Toast";
import { generateImage } from "./ShareCard/ShareImageGenerator";
import type { Kural } from "@/lib/types";

interface KuralActionsProps {
  kural: Kural;
}

export default function KuralActions({ kural }: KuralActionsProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { boxContent } = usePreferences();
  const [showJournal, setShowJournal] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const faved = isFavorite(kural.id);

  const handleShare = useCallback(async () => {
    if (isSharing) return;
    setIsSharing(true);
    const link = `${window.location.origin}/kural/${kural.id}`;
    const text = `Check out today's Thirukkural at OneKural: ${link}`;

    try {
      if (navigator.share) {
        try {
          const blob = await generateImage(kural, "square", boxContent);
          const file = new File([blob], `kural-${kural.id}.png`, { type: "image/png" });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], text });
            setIsSharing(false);
            return;
          }
        } catch { /* fall through to text share */ }

        try {
          await navigator.share({ title: "OneKural", text, url: link });
          setIsSharing(false);
          return;
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") {
            setIsSharing(false);
            return;
          }
        }
      }
    } catch { /* ignore */ }

    setIsSharing(false);

    let copied = false;
    if (navigator.clipboard) {
      try { await navigator.clipboard.writeText(link); copied = true; } catch { /* fall through */ }
    }
    if (!copied) {
      const el = document.createElement("textarea");
      el.value = link;
      el.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(el);
      el.select();
      copied = document.execCommand("copy");
      document.body.removeChild(el);
    }
    if (copied) {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }, [kural, boxContent, isSharing]);

  return (
    <>
      <div className="flex items-center gap-3 mt-8">
        <button
          onClick={() => toggleFavorite(kural.id)}
          className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-full border transition-colors ${
            faved
              ? "border-deep-red/30 bg-deep-red/5 text-deep-red"
              : "border-dark/15 text-dark/50 hover:border-emerald/30"
          }`}
        >
          <span>{faved ? "♥" : "♡"}</span> Favourite
        </button>
        <button
          onClick={() => setShowJournal(true)}
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-full border border-dark/15 text-dark/50 hover:border-emerald/30 transition-colors"
        >
          <span>✎</span> Journal
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-full border border-dark/15 text-dark/50 hover:border-emerald/30 transition-colors"
        >
          <span>↑</span> {isSharing ? "Sharing…" : "Share"}
        </button>
      </div>

      {showJournal && (
        <JournalEditor kural={kural} onClose={() => setShowJournal(false)} />
      )}

      <Toast message="Link copied!" show={shareCopied} />
    </>
  );
}
