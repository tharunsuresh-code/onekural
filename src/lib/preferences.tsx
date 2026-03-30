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
  prefsReady: boolean;
}

const DEFAULT_PREFS: Prefs = { boxContent: "tamil" };
const STORAGE_KEY = "kural-prefs";

const PreferencesContext = createContext<PreferencesContextValue>({
  ...DEFAULT_PREFS,
  setBoxContent: () => {},
  prefsReady: false,
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
  const [prefsReady, setPrefsReady] = useState(false);

  // Read localStorage before first paint to prevent flash of default content.
  // Supabase check is async and may update prefs after paint (acceptable — only
  // fires on first sign-in when no local data exists).
  useIsomorphicLayoutEffect(() => {
    const local = readLocalPrefs();
    setPrefs(local);
    setPrefsReady(true);

    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return;
      const remote = user.user_metadata?.kuralPrefs as Partial<Prefs> | undefined;
      const hasLocal = localStorage.getItem(STORAGE_KEY) !== null;
      if (!hasLocal && remote) {
        // New device / cleared storage — remote wins
        const merged: Prefs = {
          boxContent: (["tamil", "transliteration"].includes(remote.boxContent ?? "") ? remote.boxContent : local.boxContent) as BoxContent,
        };
        setPrefs(merged);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } else if (hasLocal && !remote) {
        // Preference was set before signing in (or never synced) — push local to Supabase
        // so the notification system can read it.
        await supabase.auth.updateUser({ data: { kuralPrefs: local } });
      }
    })();
  }, []);

  const persist = useCallback(async (next: Prefs) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    // Use getSession() instead of getUser() — getSession() auto-refreshes an expired
    // access token via the refresh token, whereas getUser() validates server-side and
    // returns null on expiry, silently skipping the Supabase update.
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
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
    <PreferencesContext.Provider value={{ ...prefs, setBoxContent, prefsReady }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
