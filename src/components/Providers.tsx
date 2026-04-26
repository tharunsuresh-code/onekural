"use client";

import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth";
import { FavoritesProvider } from "@/lib/favorites";
import { PreferencesProvider } from "@/lib/preferences";
import { ThemeProvider } from "@/lib/theme";
import { preloadKuralStore } from "@/lib/kural-store";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  // Kick off kurals.json loading in the background as soon as the app mounts
  // so the data is warm before the user navigates to Explore or taps prev/next.
  useEffect(() => {
    preloadKuralStore();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <FavoritesProvider>
          <PreferencesProvider>{children}</PreferencesProvider>
        </FavoritesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
