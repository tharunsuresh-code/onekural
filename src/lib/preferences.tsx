"use client";

import { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback } from "react";

// useLayoutEffect fires before paint on the client; fall back to useEffect on the server
// to avoid SSR warnings from Next.js.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export type BoxContent = "tamil" | "transliteration";

interface Prefs {
  boxContent: BoxContent;
}

interface PreferencesContextValue extends Prefs {
  setBoxContent: (content: BoxContent) => void;
}

const DEFAULT_PREFS: Prefs = { boxContent: "tamil" };
const STORAGE_KEY = "kural-prefs";

const PreferencesContext = createContext<PreferencesContextValue>({
  ...DEFAULT_PREFS,
  setBoxContent: () => {},
});

function readLocalPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      boxContent: (["tamil", "transliteration"].includes(parsed.boxContent ?? "") ? parsed.boxContent : DEFAULT_PREFS.boxContent) as BoxContent,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  // Read localStorage before first paint to prevent flash of default content.
  // Supabase check is async and may update prefs after paint (acceptable — only
  // fires on first sign-in when no local data exists).
  useIsomorphicLayoutEffect(() => {
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

  const setBoxContent = useCallback((content: BoxContent) => {
    setPrefs((prev) => {
      const next = { ...prev, boxContent: content };
      persist(next);
      return next;
    });
  }, [persist]);

  return (
    <PreferencesContext.Provider value={{ ...prefs, setBoxContent }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
