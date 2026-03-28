"use client";

import { useEffect, useRef } from "react";
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
  // Set when an OAuth redirect is detected; absorbs the one spurious popstate
  // that fires when Supabase cleans the hash with window.location.hash = ''.
  const oauthCleanupPending = useRef(false);
  // Tracks whether we are currently on a root path. Updated both by the
  // pathname effect (forward navigations) and eagerly inside the popstate
  // handler (so rapid back-press sees the correct value before React re-renders).
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
      // Absorb the popstate fired by Supabase's OAuth hash cleanup
      // (window.location.hash = '' adds a history entry and fires popstate).
      if (oauthCleanupPending.current) {
        oauthCleanupPending.current = false;
        e.stopImmediatePropagation();
        history.pushState({ oneKuralRoot: true }, "");
        return;
      }

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
      // the event fires) so that a rapid back-press sees the correct value
      // even if React hasn't re-rendered yet.
      const wasAtRoot = atRootRef.current;
      atRootRef.current = ROOT_PATHS.includes(location.pathname);

      // Non-root paths are legitimate navigations — let Next.js handle them normally.
      if (!wasAtRoot) return;

      // Prevent Next.js router from intercepting this back press.
      // Without this, Next.js briefly re-renders the page causing a flash,
      // layout shift on the nav row, and a spurious page scrollbar.
      e.stopImmediatePropagation();

      // Single back press at root — exit immediately.
      // history.go(-(history.length)) drains all entries; Android OS closes the app
      // once the session history is exhausted.
      history.go(-(history.length));
    };

    // Capture phase ensures our handler fires before Next.js's bubble-phase listener.
    window.addEventListener("popstate", handlePopState, true);
    return () => window.removeEventListener("popstate", handlePopState, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Push a sentinel history entry each time we land on a root path.
  // This gives the Android back button something to "hit" before leaving the app.
  useEffect(() => {
    if (!isStandalone()) return;
    if (!ROOT_PATHS.includes(pathname)) return;

    // When an OAuth redirect lands, the URL hash contains the access token
    // that Supabase's detectSessionInUrl must read. Calling pushState with ""
    // (empty relative URL) strips the hash by resolving to the base URL.
    // Instead, pass window.location.href explicitly so the hash is preserved
    // in window.location until Supabase's initialize() reads it.
    // Supabase cleans the hash with window.location.hash = '' which fires a
    // popstate — oauthCleanupPending absorbs that event to suppress the toast.
    const oauthInUrl =
      window.location.hash.includes("access_token=") ||
      window.location.search.includes("code=");

    if (oauthInUrl) {
      oauthCleanupPending.current = true;
      // Safety: clear after 3 s in case Supabase switches to replaceState
      // (no popstate fires) so the flag doesn't block a real back-press.
      setTimeout(() => { oauthCleanupPending.current = false; }, 3000);
    }

    history.pushState({ oneKuralRoot: true }, "", oauthInUrl ? window.location.href : "");
  }, [pathname]);

  return null;
}
