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
    if (document.readyState === "complete") {
      doRegister();
    } else {
      window.addEventListener("load", doRegister, { once: true });
    }
  }, []);

  return null;
}
