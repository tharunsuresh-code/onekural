"use client";

import { AuthProvider } from "@/lib/auth";
import { PreferencesProvider } from "@/lib/preferences";
import { ThemeProvider } from "@/lib/theme";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PreferencesProvider>{children}</PreferencesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
