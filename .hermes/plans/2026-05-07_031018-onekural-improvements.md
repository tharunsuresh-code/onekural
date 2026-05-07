# OneKural Improvements Plan

**Date:** 2026-05-07
**Repo:** `/tmp/onekural`
**Branch target:** `main`

---

## Goal

Ship a focused batch of improvements that improve reliability, DX, and performance without destabilizing the production app. No framework migration (Next.js 14 → 15 is out of scope here — too risky for a single session).

## Current Context

- **Stack:** Next.js 14.2.35, React 18, TypeScript 5, Tailwind 3.4.1, Framer Motion, Supabase, Vercel
- **Dependencies:** `npm install` not yet run in this workspace (node_modules missing) — everything starts clean.
- **Service Worker:** `public/sw.js` at CACHE_VERSION `v6` (recent bump after avatar caching revert)
- **Test suite:** 108 lines of tests across 3 files using Vitest (node env, no browser).
- **Lint:** ESLint via `next lint` with `next/core-web-vitals` + `next/typescript`.
- **PWA:** installable, offline-first, push notifications via Web Push + FCM.
- **Git history:** Recent PRs (#55, #54, #53, #52) focused on kural loading blink, avatar caching, chapter display, and back-exit behavior — shows active iteration on UX edge cases.

## Proposed Approach

Group improvements into 4 tracks that can be PR'd independently (or sequentially):

1. **Fix & Harden** — dependency issues, lint rules, test coverage
2. **Developer Experience** — build tooling, type safety, CI
3. **Performance & PWA** — bundle, caching, offline robustness
4. **Code Quality** — component decomposition, dead code removal

---

## Track 1: Fix & Harden

### 1.1 Fix `dotenv` version in devDependencies

**File:** `package.json`

`"dotenv": "^17.3.1"` — dotenv never released v17. Latest is 16.5.3. This resolves to `17.3.1` which doesn't exist. npm may silently install nothing or an unexpected cached version. Replace with `"^16.5.0"`.

**Validation:** `npm install` → `npm ls dotenv` should show `16.x`.

### 1.2 Add missing `server-only` dependency

**File:** `package.json`

`src/lib/kurals-server.ts` imports `server-only` but it's not in `package.json`. Add `"server-only": "^0.0.1"` to dependencies.

**Validation:** `npm run build` passes.

### 1.3 Fix `depcheck` false positives / install if needed

`depcheck` flagged `react-dom`, `@types/react-dom`, `eslint`, `postcss`, `ts-node`, `typescript` as unused — these are likely false positives because depcheck can't evaluate config-driven usage. But `depcheck` itself isn't in the project. Decision: **do not add** — it's a heavy devDependency that adds noise for this project. Instead, document the known-unused dependencies as `// intentionally kept` in `package.json` comments if JSON allowed (not possible) or just leave them be.

### 1.4 Strengthen ESLint rules

**File:** `.eslintrc.json`

Current config is just two extends. Add:
- `@typescript-eslint/no-explicit-any` warn (there are at least 3 `any` suppressions in KuralCard.tsx already)
- `react-hooks/exhaustive-deps` error (KuralCard has multiple hooks — this catches stale closure bugs)

```json
{
  "extends": ["next/core-web-vitals", "next/typescript"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/exhaustive-deps": "error"
  }
}
```

**Validation:** `npm run lint` — expect new warnings on `any` and potentially new errors on hook deps. Fix or suppress intentionally.

### 1.5 Add `npm ci` safety net in CI

**File:** `.github/workflows/sync-dataset.yml` (and create a `ci.yml`)

The project currently only has `sync-dataset.yml` and `release-android.yml`. No CI runs on PRs. Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm run test
```

**Validation:** Open a test PR; all 4 steps should pass.

---

## Track 2: Developer Experience

### 2.1 Add `.nvmrc` enforcement comment

**File:** `.nvmrc`

Contents are `18` (one line). Consider pinning to an LTS minor like `20` or `22` since Node 18 is entering maintenance. **Risk:** Vercel defaults to 18.x for some legacy projects. Check Vercel dashboard first. If Vercel supports 20, bump `.nvmrc` to `20`.

### 2.2 Add `engines` to `package.json`

**File:** `package.json`

```json
"engines": {
  "node": ">=18.0.0",
  "npm": ">=9.0.0"
}
```

### 2.3 Type safety: audit `any` usage

**File:** `src/components/KuralCard.tsx` (lines 44–50 and others)

FMState uses `any` for motion, x, opacity, etc. Replace with proper Framer Motion types:

```ts
import type { motion as MotionType, useMotionValue, useTransform } from "framer-motion";
// or lazily:
type FMState = {
  motion: typeof MotionType;
  x: ReturnType<typeof useMotionValue<number>>;
  opacity: ReturnType<typeof useTransform<number, number>>;
};
```

**Validation:** `npm run build` passes with no new type errors.

### 2.4 Add pre-commit hook (optional)

**File:** `.husky/pre-commit` + `package.json` scripts

AGENTS.md says "Always run `npm run build` and confirm it passes before committing." Automate with `husky` + `lint-staged`:

```bash
npm install -D husky lint-staged
npx husky init
```

`.husky/pre-commit`:
```bash
npm run lint && npm run build
```

**Risk:** Build is slow (~30s+). If this hurts iteration speed, skip or use `lint-staged` for lint only and rely on CI for build.

---

## Track 3: Performance & PWA

### 3.1 Service Worker: add periodic background sync for kural data

**File:** `public/sw.js`

Current SW caches `kurals.json` on install but never proactively refreshes it. If the user visits daily, the SWR fetch updates the cache — but if they don't visit for weeks, the IDB store expires (7 days) and the next visit re-fetches from the stale SW cache. Add a `periodicsync` registration in the app and handler in the SW:

In `public/sw.js`, add:
```js
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "update-kurals") {
    event.waitUntil(
      fetch("/data/kurals.json", { cache: "no-cache" })
        .then((res) => res.ok && caches.open(KURAL_CACHE).then((c) => c.put("/data/kurals.json", res)))
    );
  }
});
```

In the app (e.g., `ServiceWorkerRegistrar.tsx`), after SW registration:
```ts
if (registration?.sync && "periodicSync" in registration) {
  // @ts-ignore — PeriodicBackgroundSync is not in all type definitions
  registration.periodicSync.register("update-kurals", { minInterval: 24 * 60 * 60 * 1000 });
}
```

**Validation:** Chrome DevTools → Application → Service Workers → check `periodicsync` support; simulate in DevTools. Firefox/Safari will ignore (graceful degradation).

### 3.2 Add bundle analysis command

**File:** `package.json` scripts, `next.config.mjs`

Add `@next/bundle-analyzer` as a dev dependency and a script:

```json
"analyze": "ANALYZE=true npm run build"
```

In `next.config.mjs`:
```js
import withBundleAnalyzer from "@next/bundle-analyzer";
const withAnalyzer = process.env.ANALYZE === "true" ? withBundleAnalyzer({ enabled: true }) : (x) => x;
export default withAnalyzer(nextConfig);
```

**Goal:** Measure how much Framer Motion contributes. If >50KB gzipped for a swipe animation, consider a lighter alternative (native CSS transitions or a smaller motion library).

### 3.3 Verify SW cache version consistency

AGENTS.md says current SW cache version is `v5`, but `public/sw.js` shows `v6` (recent bump after PR #55 revert). Update AGENTS.md line to reflect `v6`. Also, document the bump policy: bump `CACHE_VERSION` when `APP_SHELL` changes.

**File:** `AGENTS.md`

### 3.4 Add `manifest.json` display mode check

Most TWAs/PWAs should verify they're running in `standalone` or `display-mode: standalone` to adjust UI (hide install prompts). Add a hook or utility:

**File:** `src/lib/display-mode.ts` (new)
```ts
export function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-ignore — iOS
    window.navigator.standalone === true;
}
```

Use in `ServiceWorkerRegistrar.tsx` or PWA install prompt logic.

---

## Track 4: Code Quality

### 4.1 Decompose `KuralCard.tsx` (612 lines)

This is the heaviest file. Extract:
- **`KuralCardHeader`** — chapter badge, language switch, share/bookmark row
- **`KuralCardContent`** — Tamil text, transliteration, meaning, scholar dropdown
- **`KuralCardNavigation`** — prev/next buttons, drag gesture wrapper
- **`KuralCardFooter`** — audio, journal, explanation actions

**Risk:** The `useIsomorphicLayoutEffect` + sync store logic is tightly coupled. Keep it in the parent `KuralCard` and pass `kural` down. Do not move layout-effect timing-sensitive code into sub-components on first pass.

**Files to create:**
- `src/components/KuralCard/` (directory)
- `src/components/KuralCard/index.tsx` (thin orchestrator)
- `src/components/KuralCard/Header.tsx`
- `src/components/KuralCard/Content.tsx`
- `src/components/KuralCard/Navigation.tsx`
- `src/components/KuralCard/Footer.tsx`

**Validation:** `npm run build` passes; all existing behavior preserved (no new flashes, swipe works).

### 4.2 Remove `scripts/run-schema.mjs` reference

`depcheck` flagged `./scripts/run-schema.mjs` as requiring `pg`. This file doesn't exist in the repo. It's a phantom reference — safe to ignore unless it exists in a branch. (Verified: `ls scripts/` shows only `generate-icons.ts`, `seed.ts`, `sync-dataset.ts`.)

### 4.3 Add edge-case test for `getDailyKuralId`

**File:** `src/__tests__/kurals.test.ts`

Current tests are 42 lines. Add tests for:
- Date boundary (midnight IST rollover, leap year)
- ID wraps at 1330
- Consistent for same date

### 4.4 Add test for IndexedDB store expiry

**File:** `src/__tests__/kural-store.test.ts` (new)

Vitest runs in `node` environment, so IndexedDB won't exist. Either:
- Add `fake-indexeddb` as dev dependency and polyfill `global.indexedDB`, or
- Keep this as a manual e2e test (less ideal).

**Decision:** Add `fake-indexeddb` dev dep and write basic unit tests for:
- `openIDB` resolves
- Data is stored and retrievable
- Expiry logic triggers re-fetch after 7 days

### 4.5 Audit and remove unused exports

Run:
```bash
npx ts-prune
```

Or manually check for exports with no importers. Common suspects in this codebase:
- `src/lib/kurals-server.ts` — if `getServerKural` is only used in one place, inline it
- `src/lib/sheet-depth.ts` — verify it's imported

---

## Tests / Validation Summary

| Step | Command | Criteria |
|------|---------|----------|
| Lint | `npm run lint` | zero errors (warnings allowed for `any`) |
| Build | `npm run build` | zero type or compilation failures |
| Unit tests | `npm run test` | all pass |
| SW behavior | DevTools → Application → SW | `v6` active, `/kural/1` shell cached |
| Offline | DevTools → Network → Offline | home + explore + kural pages load |
| PWA install | Lighthouse PWA audit | installable, icons present, manifest valid |

---

## Risks, Tradeoffs, and Open Questions

| Risk | Mitigation |
|------|------------|
| `husky` pre-commit slows commits | Make it lint-only; CI catches build failures |
| Decomposing `KuralCard.tsx` introduces regressions | Do it in a dedicated PR; test swipe + animation heavily |
| `fake-indexeddb` adds dev dep weight | Only for tests; not in prod bundle |
| `periodic-background-sync` is Chrome-only | Gracefully degrade; no-op on unsupported browsers |
| ESLint `react-hooks/exhaustive-deps` error may surface hidden bugs | Fix them; each fix is a bug prevented |

**Open Questions:**
1. Is Vercel set to Node 18 or 20? This determines whether `.nvmrc` can safely bump.
2. What's the current Lighthouse PWA score? Run the audit before and after Track 3.
3. Are there analytics on offline usage? Would help prioritize SW improvements.

---

## Suggested PR Order

1. **PR-1:** Track 1 fixes (`dotenv`, `server-only`, ESLint, CI workflow) — small, safe, merge fast.
2. **PR-2:** Track 4 decomposition + tests — bigger, needs manual QA on mobile.
3. **PR-3:** Track 3 SW + bundle analyzer improvements.
4. **PR-4 (optional):** Track 2 DX improvements (husky, type cleanup).

---

*Plan generated in plan mode. No files were modified during reconnaissance.*
