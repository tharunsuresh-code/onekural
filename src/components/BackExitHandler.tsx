"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isSheetOpen } from "@/lib/sheet-depth";

const ROOT_PATHS = ["/", "/explore", "/journal", "/profile"];

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function BackExitHandler() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isStandalone()) return;
    if (!ROOT_PATHS.includes(pathname)) return;

    history.pushState({ oneKuralRoot: true }, "");

    const handlePopState = () => {
      if (isSheetOpen()) return;
      // Re-push sentinel so the page stays, then close the PWA
      history.pushState({ oneKuralRoot: true }, "");
      window.close();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [pathname]);

  return null;
}
