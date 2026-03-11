"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isClient: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getEffective(t: Theme): "light" | "dark" {
  return t === "system" ? getSystemPreference() : t;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem("theme") as Theme | null;
    const initial: Theme = saved ?? "system";
    setTheme(initial);

    const html = document.documentElement;
    html.classList.remove("light", "dark");
    html.classList.add(getEffective(initial));
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const html = document.documentElement;
    html.classList.remove("light", "dark");
    html.classList.add(getEffective(theme));
    localStorage.setItem("theme", theme);

    // When in system mode, update the DOM class if the OS preference changes
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        html.classList.remove("light", "dark");
        html.classList.add(e.matches ? "dark" : "light");
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme, isClient]);

  // Cycle: light → dark → system → light
  const toggleTheme = () => {
    setTheme((prev) => prev === "light" ? "dark" : prev === "dark" ? "system" : "light");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isClient }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
