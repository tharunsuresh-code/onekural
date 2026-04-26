"use client";

import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth";
import { FavoritesProvider } from "@/lib/favorites";
import { PreferencesProvider } from "@/lib/preferences";
import { ThemeProvider } from "@/lib/theme";
import { preloadKuralStore } from "@/lib/kural-store";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    preloadKuralStore();
  }, []);

  // Set --vh = window.innerHeight so .h-dvh pages use the real inner height.
  // 100dvh can miscalculate on Android TWA when the app opens from an external
  // deep link (WhatsApp, Instagram) because system UI draws late — causing the
  // main container to be smaller than the content and clipping the bottom rows.
  useEffect(() => {
    const setVh = () => {
      document.documentElement.style.setProperty("--vh", `${window.innerHeight}px`);
    };
    setVh();
    window.addEventListener("resize", setVh);
    return () => window.removeEventListener("resize", setVh);
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
