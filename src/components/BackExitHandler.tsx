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
  // handler (so rapid back-press sees the correct value before React
  // has had a chance to re-render).
  const atRootRef = useRef(ROOT_PATHS.includes(pathname));
  // Prevents re-entering exit logic while history.go(-N) is draining the stack.
  const exitingRef = useRef(false);

  // Sync atRootRef on every render — useEffect fires after paint and is too
  // slow for a rapid back-press right after client-side navigation.
  atRootRef.current = ROOT_PATHS.includes(pathname);

  // Register the popstate handler ONCE for the component lifetime.
  useEffect(() => {
    if (!isStandalone()) return;

    const handlePopState = (e: PopStateEvent) => {
      // While history.go(-N) is draining history toward exit, stop the event.
      if (exitingRef.current) {
        e.stopImmediatePropagation();
        return;
      }

      // Absorb the popstate fired by Supabase's OAuth hash cleanup
      // (window.location.hash = '' adds a history entry and fires popstate).
      if (oauthCleanupPending.current) {
        oauthCleanupPending.current = false;
        e.stopImmediatePropagation();
        history.pushState({ oneKuralRoot: true }, "");
        return;
      }

      // Sheets (explanation, share, sign-in, journal editor) dismiss first.
      if (isSheetOpen()) {
        e.stopImmediatePropagation();
        dismissTopSheet();
        return;
      }

      // Single back exits from any page — no more double-press or stack traversal.
      e.stopImmediatePropagation();
      exitingRef.current = true;
      history.go(-(history.length));
    };

    // Capture phase ensures our handler fires before Next.js's bubble-phase listener.
    window.addEventListener("popstate", handlePopState, true);

    // Navigation API (Chrome 102+): intercept traverse navigations to prevent
    // Android's back-swipe animation. The `navigate` event fires earlier than
    // `popstate`, so intercepting here blocks the visual transition.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = (window as any).navigation;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleNavigate = nav
      ? (e: any) => {
          if (e.navigationType !== "traverse") return;
          // Let the exit-drain traversals proceed — the app is closing anyway.
          if (exitingRef.current) return;
          // Always intercept to suppress the back-swipe animation.
          e.intercept({ handler: () => Promise.resolve() });
        }
      : null;

    if (nav && handleNavigate) {
      nav.addEventListener("navigate", handleNavigate);
    }

    return () => {
      window.removeEventListener("popstate", handlePopState, true);
      if (nav && handleNavigate) {
        nav.removeEventListener("navigate", handleNavigate);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Push a sentinel history entry each time we land on a root path.
  // This gives the Android back button something to "hit" before leaving the app.
  useEffect(() => {
    if (!isStandalone()) return;
    if (!ROOT_PATHS.includes(pathname)) return;
    if (exitingRef.current) return;

    // When an OAuth redirect lands, the URL hash contains the access token
    // that Supabase's detectSessionInUrl must read. Calling pushState with ""
    // (empty relative URL) strips the hash by resolving to the base URL.
    // Instead, pass window.location.href explicitly so the hash is preserved
    // in window.location until Supabase's initialize() reads it.
    // Supabase cleans the hash with window.location.hash = '' which fires a
    // popstate — oauthCleanupPending absorbs that event.
    const oauthInUrl =
      window.location.hash.includes("access_token=") ||
      window.location.search.includes("code=");

    if (oauthInUrl) {
      oauthCleanupPending.current = true;
      // Safety: clear after 3 s in case Supabase switches to replaceState
      // (no popstate fires) so the flag doesn't block a real back-press.
      setTimeout(() => {
        oauthCleanupPending.current = false;
      }, 3000);
    }

    history.pushState(
      { oneKuralRoot: true },
      "",
      oauthInUrl ? window.location.href : ""
    );
  }, [pathname]);

  // No toast — single back exits immediately.
  return null;
}
