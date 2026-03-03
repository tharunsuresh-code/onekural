"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export type DisplayMode = "both" | "tamil" | "english";
export type BoxContent = "tamil" | "transliteration";

interface Prefs {
  displayMode: DisplayMode;
  boxContent: BoxContent;
}

interface PreferencesContextValue extends Prefs {
  setDisplayMode: (mode: DisplayMode) => void;
  setBoxContent: (content: BoxContent) => void;
}

const DEFAULT_PREFS: Prefs = { displayMode: "both", boxContent: "tamil" };
const STORAGE_KEY = "kural-prefs";

const PreferencesContext = createContext<PreferencesContextValue>({
  ...DEFAULT_PREFS,
  setDisplayMode: () => {},
  setBoxContent: () => {},
});

function readLocalPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      displayMode: (["both", "tamil", "english"].includes(parsed.displayMode ?? "") ? parsed.displayMode : DEFAULT_PREFS.displayMode) as DisplayMode,
      boxContent: (["tamil", "transliteration"].includes(parsed.boxContent ?? "") ? parsed.boxContent : DEFAULT_PREFS.boxContent) as BoxContent,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  // Load from localStorage on mount, then check Supabase user metadata
  useEffect(() => {
    const local = readLocalPrefs();
    setPrefs(local);

    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return;
      const remote = user.user_metadata?.kuralPrefs as Partial<Prefs> | undefined;
      if (!remote) return;
      // Remote wins on first sign-in (no local data), otherwise local already loaded
      const hasLocal = localStorage.getItem(STORAGE_KEY) !== null;
      if (!hasLocal) {
        const merged: Prefs = {
          displayMode: (["both", "tamil", "english"].includes(remote.displayMode ?? "") ? remote.displayMode : local.displayMode) as DisplayMode,
          boxContent: (["tamil", "transliteration"].includes(remote.boxContent ?? "") ? remote.boxContent : local.boxContent) as BoxContent,
        };
        setPrefs(merged);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }
    })();
  }, []);

  const persist = useCallback(async (next: Prefs) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      await supabase.auth.updateUser({ data: { kuralPrefs: next } });
    }
  }, []);

  const setDisplayMode = useCallback((mode: DisplayMode) => {
    setPrefs((prev) => {
      const next = { ...prev, displayMode: mode };
      persist(next);
      return next;
    });
  }, [persist]);

  const setBoxContent = useCallback((content: BoxContent) => {
    setPrefs((prev) => {
      const next = { ...prev, boxContent: content };
      persist(next);
      return next;
    });
  }, [persist]);

  return (
    <PreferencesContext.Provider value={{ ...prefs, setDisplayMode, setBoxContent }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
