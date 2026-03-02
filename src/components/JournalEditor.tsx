"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import SignInModal from "./SignInModal";
import type { Kural } from "@/lib/types";

const LOCAL_KEY = "kural-journals";

function useKeyboardOffset(): number {
  const [offset, setOffset] = useState(0);
  const initialVVHeight = useRef(0);
  const initialWinHeight = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    initialVVHeight.current = vv?.height ?? window.innerHeight;
    initialWinHeight.current = window.innerHeight;

    function update() {
      // visualViewport shrinks on iOS Safari; window.innerHeight shrinks on Firefox/Android
      const vvDiff = initialVVHeight.current - (vv?.height ?? window.innerHeight);
      const winDiff = initialWinHeight.current - window.innerHeight;
      setOffset(Math.max(0, vvDiff, winDiff));
    }

    vv?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => {
      vv?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return offset;
}

interface LocalJournals {
  [kuralId: string]: string;
}

function getLocalJournals(): LocalJournals {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function setLocalJournal(kuralId: number, text: string) {
  const journals = getLocalJournals();
  if (text.trim()) {
    journals[String(kuralId)] = text;
  } else {
    delete journals[String(kuralId)];
  }
  localStorage.setItem(LOCAL_KEY, JSON.stringify(journals));
}

interface JournalEditorProps {
  kural: Kural;
  onClose: () => void;
  showKuralLink?: boolean;
}

const SHEET_HEIGHT = 1200;

export default function JournalEditor({ kural, onClose, showKuralLink }: JournalEditorProps) {
  const { user } = useAuth();
  const keyboardOffset = useKeyboardOffset();
  const historyPushed = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sheetY = useMotionValue(SHEET_HEIGHT);
  const backdropOpacity = useTransform(sheetY, [0, SHEET_HEIGHT * 0.4], [1, 0]);

  // Animate in + push history entry
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
      history.back(); // fires popstate → animates out + calls onClose
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

  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [journalId, setJournalId] = useState<string | null>(null);
  const [showNudge, setShowNudge] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Load existing journal entry for this kural
  useEffect(() => {
    if (user) {
      // Logged in: load from Supabase
      (async () => {
        const { data } = await supabase
          .from("journals")
          .select("id, reflection")
          .eq("user_id", user.id)
          .eq("kural_id", kural.id)
          .maybeSingle();

        if (data) {
          setText(data.reflection ?? "");
          setJournalId(data.id);
        }
      })();
    } else {
      // Anonymous: load from localStorage
      const local = getLocalJournals();
      setText(local[String(kural.id)] ?? "");
    }
  }, [user, kural.id]);

  const saveToSupabase = useCallback(
    async (reflection: string) => {
      if (!user) return;
      setSaving(true);
      setSaved(false);

      if (journalId) {
        await supabase
          .from("journals")
          .update({ reflection, updated_at: new Date().toISOString() })
          .eq("id", journalId);
      } else {
        const { data } = await supabase
          .from("journals")
          .insert({ user_id: user.id, kural_id: kural.id, reflection })
          .select("id")
          .single();
        if (data) setJournalId(data.id);
      }

      setSaving(false);
      setSaved(true);
    },
    [user, kural.id, journalId]
  );

  const saveToLocal = useCallback(
    (reflection: string) => {
      setLocalJournal(kural.id, reflection);
      setSaved(true);
      // Show sign-in nudge after first meaningful write
      if (reflection.trim().length > 20 && !showNudge) {
        setShowNudge(true);
      }
    },
    [kural.id, showNudge]
  );

  const handleChange = (value: string) => {
    setText(value);
    setSaved(false);

    // Debounced auto-save
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (user) {
        saveToSupabase(value);
      } else {
        saveToLocal(value);
      }
    }, 1000);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-dark/40 z-[59]"
        style={{ opacity: backdropOpacity }}
        onClick={dismiss}
      />

      {/* Editor panel — shifts up when keyboard opens */}
      <motion.div
        style={{ y: sheetY, maxHeight: "80dvh", bottom: keyboardOffset }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0.05, bottom: 0 }}
        onDragEnd={handleDragEnd}
        className="fixed left-0 right-0 z-[60] bg-cream rounded-t-2xl max-w-content mx-auto flex flex-col"
      >
        {/* Handle — drag down or tap to close */}
        <button
          onClick={dismiss}
          aria-label="Close"
          className="flex-shrink-0 pt-3 pb-1 flex justify-center w-full"
        >
          <div className="w-10 h-1 bg-dark/15 rounded-full" />
        </button>

        <div
          ref={scrollRef}
          className="px-6 pb-8 overflow-y-auto"
          style={{ touchAction: "pan-y" }}
          onPointerDown={(e) => {
            const el = scrollRef.current;
            if (el && el.scrollTop > 0) e.stopPropagation();
          }}
        >
          {/* Kural reference */}
          <div className="mb-4 pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-dark/40">
                Reflecting on Kural #{kural.id}
              </span>
              <button
                onClick={dismiss}
                className="text-xs text-dark/40 hover:text-dark transition-colors"
              >
                Done
              </button>
            </div>
            <p className="font-tamil text-sm text-dark/70 leading-relaxed">
              {kural.kural_tamil}
            </p>
            {showKuralLink && (
              <Link
                href={`/kural/${kural.id}`}
                className="inline-block mt-2 text-xs text-saffron hover:underline"
              >
                Go to Kural ↗
              </Link>
            )}
          </div>

          {/* Textarea */}
          <textarea
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Write your reflection..."
            className="w-full bg-white border border-dark/10 rounded-xl p-4 text-sm text-dark leading-relaxed placeholder:text-dark/30 focus:outline-none focus:border-saffron resize-none transition-colors"
            rows={6}
            autoFocus
            onFocus={(e) => {
              // Fallback: ensure textarea scrolls into view after keyboard opens
              setTimeout(() => e.target.scrollIntoView({ block: "nearest", behavior: "smooth" }), 300);
            }}
          />

          {/* Save status */}
          <div className="flex items-center justify-between mt-2 h-5">
            <span />
            {saving && (
              <span className="text-xs text-dark/40">Saving...</span>
            )}
            {saved && !saving && (
              <span className="text-xs text-green-600">
                {user ? "Saved" : "Saved locally"}
              </span>
            )}
          </div>

          {/* Soft sign-in nudge for anonymous users */}
          {!user && showNudge && (
            <p className="text-xs text-dark/40 text-center mt-3">
              <button
                onClick={() => setShowSignIn(true)}
                className="text-saffron hover:underline"
              >
                Sign in
              </button>
              {" "}to sync your reflections across devices
            </p>
          )}
        </div>
      </motion.div>

      <SignInModal open={showSignIn} onClose={() => setShowSignIn(false)} />
    </>
  );
}
