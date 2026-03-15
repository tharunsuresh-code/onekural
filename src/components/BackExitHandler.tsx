"use client";

import { useEffect, useRef, useState } from "react";
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
  const [showToast, setShowToast] = useState(false);
  const exitPending = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always reflects the latest pathname without needing to re-register the handler.
  const pathnameRef = useRef(pathname);

  // Keep pathnameRef in sync with the current route.
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Register the popstate handler ONCE for the component lifetime.
  // Using a persistent handler (instead of re-registering per pathname) ensures
  // there is never a window where the handler is absent — which previously allowed
  // Next.js to intercept back-presses and cause a spurious page scrollbar + layout shift.
  useEffect(() => {
    if (!isStandalone()) return;

    const handlePopState = (e: PopStateEvent) => {
      // Non-root paths are legitimate navigations — let Next.js handle them normally.
      if (!ROOT_PATHS.includes(pathnameRef.current)) return;

      if (isSheetOpen()) {
        // Sheet is open — let the sheet's own popstate handler (bubble phase) deal with it.
        // Do NOT call stopImmediatePropagation here so the sheet listener still fires.
        return;
      }

      // Prevent Next.js router from intercepting this back press.
      // Without this, Next.js briefly re-renders the page causing a flash,
      // layout shift on the nav row, and a spurious page scrollbar.
      e.stopImmediatePropagation();

      if (exitPending.current) {
        // Second back press within 2 s — exit the app.
        if (toastTimer.current) clearTimeout(toastTimer.current);
        exitPending.current = false;
        setShowToast(false);
        // Go all the way back through history; on Android PWA the OS closes the app
        // once there are no more entries in the session.
        history.go(-(history.length));
        return;
      }

      // First back press — show toast and re-push sentinel so the app stays open.
      history.pushState({ oneKuralRoot: true }, "");
      exitPending.current = true;
      setShowToast(true);
      toastTimer.current = setTimeout(() => {
        exitPending.current = false;
        setShowToast(false);
      }, 2000);
    };

    // Capture phase ensures our handler fires before Next.js's bubble-phase listener.
    window.addEventListener("popstate", handlePopState, true);
    return () => {
      window.removeEventListener("popstate", handlePopState, true);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Push a sentinel history entry each time we land on a root path.
  // This gives the Android back button something to "hit" before leaving the app.
  // Also resets the double-back state when navigating between root paths.
  useEffect(() => {
    if (!isStandalone()) return;
    if (!ROOT_PATHS.includes(pathname)) return;

    exitPending.current = false;
    setShowToast(false);
    if (toastTimer.current) clearTimeout(toastTimer.current);

    history.pushState({ oneKuralRoot: true }, "");
  }, [pathname]);

  if (!showToast) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] px-5 py-2.5 rounded-full bg-dark/90 dark:bg-dark-fg/90 text-dark-fg dark:text-dark text-sm font-medium pointer-events-none whitespace-nowrap">
      Press back again to exit
    </div>
  );
}
