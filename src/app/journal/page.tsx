"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import SignInModal from "@/components/SignInModal";
import JournalEditor from "@/components/JournalEditor";
import type { Kural } from "@/lib/types";

const LOCAL_KEY = "kural-journals";

interface JournalEntry {
  id: string;
  kural_id: number;
  reflection: string;
  updated_at: string;
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

export default function JournalPage() {
  const { user, loading: authLoading } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKural, setEditingKural] = useState<Kural | null>(null);

  const loadEntries = useCallback(async () => {
    if (user) {
      // Logged in: fetch from Supabase
      const { data } = await supabase
        .from("journals")
        .select("id, kural_id, reflection, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      setEntries(data ?? []);
    } else {
      // Guest: load from localStorage
      const local = getLocalJournals();
      const localEntries: JournalEntry[] = Object.entries(local)
        .filter(([, text]) => text.trim().length > 0)
        .map(([kuralId, text]) => ({
          id: `local-${kuralId}`,
          kural_id: parseInt(kuralId, 10),
          reflection: text,
          updated_at: new Date().toISOString(),
        }));
      setEntries(localEntries);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    loadEntries();
  }, [authLoading, loadEntries]);

  const handleEntryClick = async (kuralId: number) => {
    try {
      const res = await fetch(`/api/kural/${kuralId}`);
      if (!res.ok) return;
      const kural = await res.json();
      setEditingKural(kural);
    } catch {
      // ignore
    }
  };

  if (authLoading || loading) {
    return (
      <main className="max-w-content mx-auto px-6 pt-10 pb-24 flex items-center justify-center min-h-[60dvh]">
        <div className="w-6 h-6 border-2 border-saffron border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <>
      <main className="max-w-content mx-auto px-6 pt-10 pb-24">
        <h1 className="text-xl font-semibold text-dark mb-6">Your Journal</h1>

        {/* Soft sign-in nudge for guests */}
        {!user && (
          <div className="bg-saffron/5 border border-saffron/20 rounded-xl px-4 py-3 mb-6">
            <p className="text-xs text-dark/50">
              Your reflections are saved on this device.{" "}
              <button
                onClick={() => setShowSignIn(true)}
                className="text-saffron hover:underline font-medium"
              >
                Sign in
              </button>
              {" "}to sync across devices.
            </p>
          </div>
        )}

        {entries.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-dark/50 text-sm">No reflections yet</p>
            <p className="text-dark/30 text-xs mt-1">
              Tap the journal button on any kural to start writing
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => handleEntryClick(entry.kural_id)}
                className="w-full text-left border border-dark/10 rounded-xl p-4 hover:border-saffron/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-saffron font-medium">
                    Kural #{entry.kural_id}
                  </span>
                  {user && (
                    <span className="text-xs text-dark/30">
                      {new Date(entry.updated_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
                <p className="text-sm text-dark/70 leading-relaxed line-clamp-3">
                  {entry.reflection}
                </p>
              </button>
            ))}
          </div>
        )}
      </main>

      <SignInModal open={showSignIn} onClose={() => setShowSignIn(false)} />

      {editingKural && (
        <JournalEditor
          kural={editingKural}
          onClose={() => {
            setEditingKural(null);
            loadEntries();
          }}
        />
      )}
    </>
  );
}
