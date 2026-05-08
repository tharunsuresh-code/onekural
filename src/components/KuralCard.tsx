"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";

// useLayoutEffect fires before paint (client only); fall back to useEffect on SSR
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Kural } from "@/lib/types";
import { getDailyKuralId } from "@/lib/kurals";
import { storeGetKural, storeGetKuralSync, takePendingNavKural } from "@/lib/kural-store";
import { useFavorites } from "@/lib/favorites";
import { usePreferences } from "@/lib/preferences";
import { useAudio } from "@/lib/audio";
import { MAX_KURAL_ID } from "@/lib/constants";
import type { ComponentType, ElementType } from "react";
import type { MotionValue } from "framer-motion";

import Header from "./KuralCard/Header";
import MetaBar from "./KuralCard/MetaBar";
import KuralContent from "./KuralCard/KuralContent";
import NavRow from "./KuralCard/NavRow";
import ActionBar from "./KuralCard/ActionBar";
import SkeletonOverlay from "./KuralCard/SkeletonOverlay";
import Toast from "./Toast";

// JournalEditor is loaded imperatively (not via dynamic()) so it renders
// without a Suspense cycle after the pre-load promise resolves.
let _journalEditorPromise: Promise<ComponentType<{ kural: Kural; onClose: () => void }>> | null = null;
function loadJournalEditor() {
  if (!_journalEditorPromise) {
    _journalEditorPromise = import("./JournalEditor").then((m) => m.default);
  }
  return _journalEditorPromise;
}

const ExplanationSheet = dynamic(() => import("./ExplanationSheet"));
const OnboardingHint = dynamic(() => import("./OnboardingHint"), { ssr: false });
import { generateImage } from "./ShareCard/ShareImageGenerator";

interface KuralCardProps {
  initialKural: Kural;
  mode?: "home" | "detail";
  dailyKuralId?: number;
  adjacentKurals?: Record<string, Kural>;
}

// Framer Motion state loaded lazily after first paint
interface FMState {
  motion: typeof import("framer-motion").motion;
  x: MotionValue<number>;
  opacity: MotionValue<number>;
  rotate: MotionValue<number>;
  animate: typeof import("framer-motion").animate;
  unsubscribe: () => void;
}

async function fetchKural(id: number): Promise<Kural | null> {
  if (id < 1 || id > MAX_KURAL_ID) return null;
  return storeGetKural(id);
}

export default function KuralCard({ initialKural, mode = "detail", dailyKuralId, adjacentKurals }: KuralCardProps) {
  const router = useRouter();
  const isHome = mode === "home";

  const [kural, setKural] = useState<Kural>(initialKural);
  const [localDailyKuralId, setLocalDailyKuralId] = useState(dailyKuralId ?? 0);
  const [dateStr, setDateStr] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [JournalEditorComp, setJournalEditorComp] = useState<ComponentType<{ kural: Kural; onClose: () => void }> | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isPlaying, play, stop } = useAudio();
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const audioUnavailableTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { boxContent, setBoxContent, prefsReady } = usePreferences();

  // Tracks the current kural in a ref so useEffect([]) closures can read a fresh ID.
  const kuralRef = useRef<Kural>(initialKural);

  // Lazy-loaded Framer Motion state
  const fmRef = useRef<FMState | null>(null);
  const [fmReady, setFmReady] = useState(false);

  // After FM is ready, pre-load JournalEditor and store the component reference.
  const preloadFired = useRef(false);
  useEffect(() => { kuralRef.current = kural; }, [kural]);
  useEffect(() => {
    if (!fmReady || preloadFired.current) return;
    preloadFired.current = true;
    const timer = setTimeout(() => {
      loadJournalEditor().then((Comp) => setJournalEditorComp(() => Comp));
    }, 300);
    return () => clearTimeout(timer);
  }, [fmReady]);

  const handleJournalOpen = useCallback(() => {
    if (JournalEditorComp) {
      setShowJournal(true);
    } else {
      loadJournalEditor().then((Comp) => {
        setJournalEditorComp(() => Comp);
        setShowJournal(true);
      });
    }
  }, [JournalEditorComp]);

  const handlePlayToggle = useCallback(async () => {
    if (isPlaying) {
      stop();
      return;
    }
    const ok = await play(kural.kural_tamil);
    if (!ok) {
      if (audioUnavailableTimer.current) clearTimeout(audioUnavailableTimer.current);
      setAudioUnavailable(true);
      audioUnavailableTimer.current = setTimeout(() => setAudioUnavailable(false), 3500);
    }
  }, [isPlaying, kural.kural_tamil, play, stop]);

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
        } catch { /* image gen failed */ }

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

  // Load FM after first paint
  useEffect(() => {
    import("framer-motion").then((mod) => {
      const x = mod.motionValue(0);
      const opacity = mod.motionValue(1);
      const rotate = mod.motionValue(0);
      const unsubscribe = x.on("change", (val: number) => {
        const ratio = Math.min(Math.abs(val) / 200, 1);
        opacity.set(1 - ratio * 0.5);
        rotate.set((val / 200) * 5);
      });
      fmRef.current = { motion: mod.motion, x, opacity, rotate, animate: mod.animate, unsubscribe };
      setFmReady(true);
    });
    return () => { fmRef.current?.unsubscribe(); };
  }, []);

  // Prefetch cache: id → Kural.
  const prefetchCache = useRef<Map<number, Kural>>(new Map());

  useEffect(() => {
    const prefetch = (id: number) => {
      if (id < 1 || id > MAX_KURAL_ID) return;
      if (prefetchCache.current.has(id)) return;
      fetchKural(id).then((k) => { if (k) prefetchCache.current.set(id, k); });
    };
    const prevId = kural.id > 1 ? kural.id - 1 : MAX_KURAL_ID;
    const nextId = kural.id < MAX_KURAL_ID ? kural.id + 1 : 1;
    prefetch(prevId);
    prefetch(nextId);
  }, [kural.id]);

  // Home-only: correct server/client date mismatch before first paint
  useIsomorphicLayoutEffect(() => {
    if (!isHome) return;
    const localDate = new Date().toLocaleDateString("en-CA");
    const localId = getDailyKuralId(localDate);
    setLocalDailyKuralId(localId);
    setDateStr(new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }));
    if (localId !== initialKural.id) {
      const prefetched = adjacentKurals?.[localDate];
      if (prefetched) {
        setKural(prefetched);
      } else {
        fetchKural(localId).then((k) => { if (k) setKural(k); });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detail-only: no-flash kural correction
  useIsomorphicLayoutEffect(() => {
    if (isHome) return;
    const urlId = parseInt(window.location.pathname.split("/").pop() ?? "", 10);
    if (isNaN(urlId) || urlId < 1 || urlId > MAX_KURAL_ID) return;
    const pending = takePendingNavKural(urlId);
    if (urlId === initialKural.id) return;
    const sync = pending ?? storeGetKuralSync(urlId);
    if (sync) {
      setKural(sync);
    } else {
      fetchKural(urlId).then((k) => { if (k) setKural(k); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Home-only: midnight rollover
  useEffect(() => {
    if (!isHome) return;
    const localDate = new Date().toLocaleDateString("en-CA");

    const switchToTodaysKural = (nowLocal: string) => {
      const todayId = getDailyKuralId(nowLocal);
      setLocalDailyKuralId(todayId);
      setDateStr(new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }));
      if (kuralRef.current.id === todayId) return;
      setFadingOut(true);
      setTimeout(async () => {
        const k = await fetchKural(todayId);
        if (k) setKural(k);
        setFadingOut(false);
      }, 200);
    };

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const nowLocal = new Date().toLocaleDateString("en-CA");
      const loadedDate = sessionStorage.getItem("kural-date");
      if (!loadedDate || loadedDate === nowLocal) return;
      sessionStorage.setItem("kural-date", nowLocal);
      switchToTodaysKural(nowLocal);
    };
    sessionStorage.setItem("kural-date", localDate);
    document.addEventListener("visibilitychange", handleVisibility);

    const refreshAtMidnight = (): ReturnType<typeof setTimeout> => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      return setTimeout(() => {
        const nowLocal = new Date().toLocaleDateString("en-CA");
        sessionStorage.setItem("kural-date", nowLocal);
        switchToTodaysKural(nowLocal);
        midnightTimer = refreshAtMidnight();
      }, nextMidnight.getTime() - now.getTime());
    };
    let midnightTimer = refreshAtMidnight();

    const handleGoHome = () => {
      const todayId = getDailyKuralId(new Date().toLocaleDateString("en-CA"));
      setShowJournal(false);
      setShowExplanation(false);
      setDateStr(new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }));
      if (kuralRef.current.id === todayId) return;
      setLocalDailyKuralId(todayId);
      setFadingOut(true);
      setTimeout(async () => {
        const k = await fetchKural(todayId);
        if (k) setKural(k);
        setFadingOut(false);
      }, 200);
    };
    window.addEventListener("onekural:go-home", handleGoHome);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("onekural:go-home", handleGoHome);
      clearTimeout(midnightTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateKural = useCallback(
    async (direction: "prev" | "next") => {
      if (isAnimating) return;
      const nextId =
        direction === "next"
          ? kural.id < MAX_KURAL_ID ? kural.id + 1 : 1
          : kural.id > 1 ? kural.id - 1 : MAX_KURAL_ID;

      setIsAnimating(true);
      setFadingOut(true);

      const cached = prefetchCache.current.get(nextId);
      const fetchPromise = cached ? Promise.resolve(cached) : fetchKural(nextId);
      const [nextKural] = await Promise.all([
        fetchPromise,
        new Promise<void>((r) => setTimeout(r, 200)),
      ]);

      if (nextKural) setKural(nextKural);
      setFadingOut(false);
      setIsAnimating(false);
    },
    [kural.id, isAnimating]
  );

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      const fm = fmRef.current;
      if (!fm) return;
      if (info.offset.x < -80 || info.velocity.x < -500) {
        navigateKural("next");
      } else if (info.offset.x > 80 || info.velocity.x > 500) {
        navigateKural("prev");
      }
      fm.animate(fm.x, 0, { type: "spring", stiffness: 300, damping: 30 });
    },
    [navigateKural]
  );

  // Keyboard arrow navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") navigateKural("prev");
      else if (e.key === "ArrowRight") navigateKural("next");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [navigateKural]);

  const faved = isFavorite(kural.id);

  // Swap div → motion.div once FM is loaded
  const DragDiv = (fmReady ? fmRef.current!.motion.div : "div") as ElementType;
  const dragProps = fmReady && fmRef.current ? {
    drag: "x",
    dragDirectionLock: true,
    dragConstraints: { left: 0, right: 0 },
    dragElastic: { left: 0.15, right: 0.15 },
    onDragEnd: handleDragEnd,
    style: { x: fmRef.current.x, opacity: fmRef.current.opacity, rotate: fmRef.current.rotate },
  } : {};

  return (
    <>
      <main className="relative flex flex-col h-dvh max-w-content mx-auto px-6 pt-14 pb-nav select-none">
        <Header
          isHome={isHome}
          kuralId={kural.id}
          localDailyKuralId={localDailyKuralId}
          dateStr={dateStr}
          onBack={() => router.back()}
        />

        <MetaBar
          kural={kural}
          boxContent={boxContent}
          prefsReady={prefsReady}
          onToggleLang={() => setBoxContent(boxContent === "tamil" ? "transliteration" : "tamil")}
        />

        <div className="relative flex-1 min-h-0">
          <DragDiv
            className="h-full overflow-y-auto flex flex-col"
            {...dragProps}
          >
            <KuralContent
              kural={kural}
              boxContent={boxContent}
              prefsReady={prefsReady}
              fadingOut={fadingOut}
            />
          </DragDiv>

          <SkeletonOverlay visible={isAnimating} />
        </div>

        {/* Tap for Explanation */}
        <button
          onClick={() => setShowExplanation(true)}
          className="w-full flex flex-col items-center gap-1.5 py-2 [@media(hover:hover)]:hover:opacity-60 active:opacity-40 transition-opacity"
        >
          <span className="text-xs uppercase tracking-widest text-dark/40 dark:text-dark-fg/40 font-medium">
            Tap for Explanation
          </span>
        </button>

        <NavRow currentId={kural.id} onNavigate={navigateKural} />

        <ActionBar
          isPlaying={isPlaying}
          audioUnavailable={audioUnavailable}
          faved={faved}
          isSharing={isSharing}
          onPlayToggle={handlePlayToggle}
          onToggleFavorite={() => toggleFavorite(kural.id)}
          onJournalOpen={handleJournalOpen}
          onShare={handleShare}
        />

        {isHome && <Link href="/privacy" className="sr-only">Privacy Policy</Link>}
      </main>

      {showJournal && JournalEditorComp && (
        <JournalEditorComp kural={kural} onClose={() => setShowJournal(false)} />
      )}

      {showExplanation && (
        <ExplanationSheet kural={kural} onClose={() => setShowExplanation(false)} />
      )}

      {isHome && <OnboardingHint />}

      <Toast message="Link copied!" show={shareCopied} />
    </>
  );
}
