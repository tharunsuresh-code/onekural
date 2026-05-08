export default function Loading() {
  // Return null — OneKural is offline-first. All data is cached in SW + IDB,
  // so navigation is instant. A loading overlay would block/delay the UI for
  // no benefit and causes a visible "அ" flash on every route transition.
  return null;
}
