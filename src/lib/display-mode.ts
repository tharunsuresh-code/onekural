/**
 * Detect whether the PWA/TWA is running in standalone display mode.
 *
 * - iOS: `window.navigator.standalone === true`
 * - Android/Chrome: `display-mode: standalone` media query
 * - Other: matchMedia checks for `standalone`, `fullscreen`, or `minimal-ui`
 */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;

  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  const fullscreen = window.matchMedia("(display-mode: fullscreen)").matches;
  const minimalUi = window.matchMedia("(display-mode: minimal-ui)").matches;

  // @ts-expect-error — iOS proprietary property
  const iosStandalone = window.navigator.standalone === true;

  return standalone || fullscreen || minimalUi || iosStandalone;
}

/**
 * Subscribe to display-mode changes (e.g. user installs/uninstalls PWA).
 * Returns an unsubscribe function.
 */
export function onDisplayModeChange(callback: (standalone: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const mq = window.matchMedia("(display-mode: standalone)");
  const handler = () => callback(isStandalone());

  if (mq.addEventListener) {
    mq.addEventListener("change", handler);
  } else {
    mq.addListener(handler);
  }

  return () => {
    if (mq.removeEventListener) {
      mq.removeEventListener("change", handler);
    } else {
      mq.removeListener(handler);
    }
  };
}
