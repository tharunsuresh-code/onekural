"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { isSheetOpen, dismissTopSheet } from "@/lib/sheet-depth";

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
  // Tracks whether we are currently on a root path. Updated both by the
  // pathname effect (forward navigations) and eagerly inside the popstate
  // handler (so rapid double-back-press sees the correct value before React
  // has had a chance to re-render).
  const atRootRef = useRef(ROOT_PATHS.includes(pathname));

  // Keep atRootRef in sync when navigating forward (no popstate fires).
  useEffect(() => {
    atRootRef.current = ROOT_PATHS.includes(pathname);
  }, [pathname]);

  // Register the popstate handler ONCE for the component lifetime.
  // Using a persistent handler (instead of re-registering per pathname) ensures
  // there is never a window where the handler is absent — which previously allowed
  // Next.js to intercept back-presses and cause a spurious page scrollbar + layout shift.
  useEffect(() => {
    if (!isStandalone()) return;

    const handlePopState = (e: PopStateEvent) => {
      if (isSheetOpen()) {
        // Prevent Next.js from re-rendering the home page when dismissing a sheet.
        // The sheet's dismiss callback (registered via openSheet) handles the animation.
        // Note: for sheets on non-root pages, BackExitHandler returns early at the
        // atRootRef check below, so the sheet's own bubble-phase listener handles it.
        e.stopImmediatePropagation();
        dismissTopSheet();
        return;
      }

      // Eagerly update atRootRef using location.pathname (browser updates it before
      // the event fires) so that a rapid second back-press sees the correct value
      // even if React hasn't re-rendered yet.
      const wasAtRoot = atRootRef.current;
      atRootRef.current = ROOT_PATHS.includes(location.pathname);

      // Non-root paths are legitimate navigations — let Next.js handle them normally.
      if (!wasAtRoot) return;

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

    // When an OAuth redirect lands, the URL hash contains the access token
    // that Supabase's detectSessionInUrl must read. Calling pushState with ""
    // (empty relative URL) strips the hash by resolving to the base URL.
    // Instead, pass window.location.href explicitly so the hash is preserved
    // in window.location until Supabase's initialize() reads it.
    // Supabase cleans the URL itself via history.replaceState (no popstate fired),
    // so no spurious "press back" toast is produced.
    const oauthInUrl =
      window.location.hash.includes("access_token=") ||
      window.location.search.includes("code=");

    history.pushState({ oneKuralRoot: true }, "", oauthInUrl ? window.location.href : "");
  }, [pathname]);

  if (!showToast) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] px-5 py-2.5 rounded-full bg-dark/90 dark:bg-dark-fg/90 text-dark-fg dark:text-dark text-sm font-medium pointer-events-none whitespace-nowrap">
      Press back again to exit
    </div>
  );
}
