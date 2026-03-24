"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function doRegister() {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[SW] Registered, scope:", reg.scope);
        })
        .catch((err) => {
          console.error("[SW] Registration failed:", err);
        });
    }

    // Defer registration until after the window load event so the page is
    // visually stable before the service worker activates. Registering during
    // the initial render can coincide with Chrome showing its notification
    // permission bar (triggered by an existing push subscription), and the
    // DOM activity from hydration/animations dismisses that bar before the
    // user can act on it.
    // Wait for the load event, then an additional idle-callback pass so that
    // React hydration, Framer Motion animations, and font rendering have all
    // settled before the SW registers. Any Chrome permission bar triggered by
    // the existing push subscription should then appear against a stable page.
    function scheduleRegister() {
      if ("requestIdleCallback" in window) {
        requestIdleCallback(doRegister, { timeout: 4000 });
      } else {
        setTimeout(doRegister, 2000);
      }
    }

    if (document.readyState === "complete") {
      scheduleRegister();
    } else {
      window.addEventListener("load", scheduleRegister, { once: true });
    }
  }, []);

  return null;
}
