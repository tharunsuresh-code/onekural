"use client";

import { AuthProvider } from "@/lib/auth";
import { PreferencesProvider } from "@/lib/preferences";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <PreferencesProvider>{children}</PreferencesProvider>
    </AuthProvider>
  );
}
