# Codebase Audit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean up stale artifacts, improve code quality, harden security, and establish a test baseline for the OneKural codebase.

**Architecture:** Four sequential phases — cleanup, code quality, security hardening, tests. Each phase is an independent commit so progress is reviewable and reversible.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase, Tailwind CSS, Vitest (added in Phase 4).

---

## Phase 1: Cleanup

### Task 1: Delete stale scripts/output/ directory

**Files:**
- Delete: `scripts/output/` (entire directory — 7 JSON backups, 7 diff CSVs, 5 unhandled CSVs from March 5 data sync)

**Step 1: Confirm contents are safe to delete**

```bash
ls scripts/output/
```
Expected: only `backup_all_*.json`, `diff_changed_*.csv`, `diff_here_pass2_*.csv`, `unhandled_*.csv` files dated 20260305.

**Step 2: Delete the directory**

```bash
rm -rf scripts/output/
```

**Step 3: Verify it's gone**

```bash
ls scripts/
```
Expected: `generate-icons.ts  run-schema.mjs  run-seed.mjs  seed.ts  sync-dataset.ts`

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete stale scripts/output data sync artifacts"
```

---

### Task 2: Make CRON_SECRET always required in /api/push/send

**Files:**
- Modify: `src/app/api/push/send/route.ts:10-25`

**Current behavior** (lines 11, 20-25): CRON_SECRET validation only runs when the env var is set — if it's unset, the endpoint is open to anyone.

**Step 1: Replace the conditional check**

In `src/app/api/push/send/route.ts`, replace:

```typescript
// Authorized by CRON_SECRET in Vercel environment (set in vercel.json)
const CRON_SECRET = process.env.CRON_SECRET;

// Vercel cron jobs send GET requests; POST is kept for manual triggering
export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  // Verify cron secret when set (Vercel cron sends Authorization header)
  if (CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
```

With:

```typescript
// CRON_SECRET must always be set — endpoint is disabled if missing
const CRON_SECRET = process.env.CRON_SECRET;

// Vercel cron jobs send GET requests; POST is kept for manual triggering
export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  // Always validate — if CRON_SECRET unset, endpoint is disabled
  const auth = request.headers.get("authorization");
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
```

**Step 2: Build to verify no TypeScript errors**

```bash
npm run build
```
Expected: build succeeds.

**Step 3: Commit**

```bash
git add src/app/api/push/send/route.ts
git commit -m "fix: always require CRON_SECRET for push/send endpoint"
```

---

### Task 3: Remove unused @anthropic-ai/sdk dependency

**Files:**
- Modify: `package.json`

**Step 1: Verify the SDK is not imported anywhere**

```bash
grep -r "anthropic" src/ --include="*.ts" --include="*.tsx"
```
Expected: no output (zero matches).

**Step 2: Remove from package.json**

In `package.json`, remove this line from `"dependencies"`:
```json
"@anthropic-ai/sdk": "^0.78.0",
```

**Step 3: Remove from node_modules**

```bash
npm install
```
Expected: package-lock.json updated, `@anthropic-ai/sdk` no longer listed.

**Step 4: Build to confirm nothing broke**

```bash
npm run build
```
Expected: build succeeds.

**Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove unused @anthropic-ai/sdk dependency"
```

---

## Phase 2: Code Quality

### Task 4: Extract domain constants to lib/constants.ts

**Files:**
- Create: `src/lib/constants.ts`
- Modify: `src/app/api/kurals/route.ts:9`
- Modify: `src/app/api/kural/[id]/route.ts` (wherever ID range is validated)
- Modify: `src/app/api/chapters/route.ts` (wherever book range is validated)
- Modify: `src/lib/kurals.ts:18,43`

**Step 1: Create the constants file**

```typescript
// src/lib/constants.ts
export const MAX_KURAL_ID = 1330;
export const MAX_CHAPTER = 133;
export const MAX_BOOK = 3;
```

**Step 2: Update src/app/api/kurals/route.ts**

Replace `chapter > 133` with `chapter > MAX_CHAPTER`, and add the import:
```typescript
import { MAX_CHAPTER } from "@/lib/constants";
```

**Step 3: Read and update src/app/api/kural/[id]/route.ts**

Read the file first, then replace the hardcoded `1330` with `MAX_KURAL_ID` and import the constant.

**Step 4: Read and update src/app/api/chapters/route.ts**

Read the file first, then replace hardcoded book range `3` with `MAX_BOOK` and import.

**Step 5: Update src/lib/kurals.ts**

Replace:
```typescript
const arr = Array.from({ length: 1330 }, (_, i) => i + 1);
```
With:
```typescript
import { MAX_KURAL_ID } from "./constants";
// ...
const arr = Array.from({ length: MAX_KURAL_ID }, (_, i) => i + 1);
```

And replace:
```typescript
return DAILY_ORDER[((daysSinceEpoch % 1330) + 1330) % 1330];
```
With:
```typescript
return DAILY_ORDER[((daysSinceEpoch % MAX_KURAL_ID) + MAX_KURAL_ID) % MAX_KURAL_ID];
```

**Step 6: Build to verify**

```bash
npm run build
```

**Step 7: Commit**

```bash
git add src/lib/constants.ts src/lib/kurals.ts src/app/api/
git commit -m "refactor: extract domain constants (MAX_KURAL_ID, MAX_CHAPTER, MAX_BOOK)"
```

---

### Task 5: Fix BottomNav SVG accessibility

**Files:**
- Modify: `src/components/BottomNav.tsx:11,21,31,43`

Screen readers will read the SVG content AND the visible text label. Add `aria-hidden="true"` to each icon SVG so screen readers only read the label text.

**Step 1: Add aria-hidden to each SVG**

In `src/components/BottomNav.tsx`, add `aria-hidden="true"` to all four `<svg>` elements. Each one currently starts like:
```tsx
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" ...>
```

Add the attribute to each:
```tsx
<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" ...>
```

There are four icons: Home (line 11), Explore (line 21), Journal (line 31), Profile (line 43).

**Step 2: Build to verify**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/components/BottomNav.tsx
git commit -m "fix: add aria-hidden to BottomNav SVG icons for screen reader accessibility"
```

---

### Task 6: Add batch kural fetch API endpoint

**Files:**
- Create: `src/app/api/kurals/batch/route.ts`

The favorites page calls `/api/kural/${id}` for each favorited kural individually (N+1 pattern). A batch endpoint eliminates this.

**Step 1: Create the batch route**

```typescript
// src/app/api/kurals/batch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MAX_KURAL_ID } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids") ?? "";
  if (!idsParam.trim()) {
    return NextResponse.json([]);
  }

  const ids = idsParam
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n >= 1 && n <= MAX_KURAL_ID);

  if (ids.length === 0) {
    return NextResponse.json([]);
  }

  // Cap at 100 to prevent abuse
  const safeIds = ids.slice(0, 100);

  const { data, error } = await supabase
    .from("kurals")
    .select("*")
    .in("id", safeIds)
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch kurals" }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

**Step 2: Verify it builds**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/app/api/kurals/batch/route.ts
git commit -m "feat: add /api/kurals/batch endpoint for efficient multi-kural fetch"
```

---

### Task 7: Update favorites page to use batch endpoint

**Files:**
- Modify: `src/app/profile/favorites/page.tsx:24-33`

**Step 1: Replace N+1 fetch with batch fetch**

In `src/app/profile/favorites/page.tsx`, replace:

```typescript
    // Fetch all favorited kurals
    Promise.all(
      favorites.map((id) =>
        fetch(`/api/kural/${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ).then((results) => {
      setKurals(results.filter(Boolean));
      setLoading(false);
    });
```

With:

```typescript
    // Fetch all favorited kurals in one request
    fetch(`/api/kurals/batch?ids=${favorites.join(",")}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((results) => {
        setKurals(Array.isArray(results) ? results : []);
        setLoading(false);
      })
      .catch(() => {
        setKurals([]);
        setLoading(false);
      });
```

**Step 2: Build to verify**

```bash
npm run build
```

**Step 3: Manually test in dev**

```bash
npm run dev
```
Navigate to `/profile/favorites` and verify the page still loads favorited kurals correctly.

**Step 4: Commit**

```bash
git add src/app/profile/favorites/page.tsx
git commit -m "perf: use batch API for favorites page to eliminate N+1 fetches"
```

---

## Phase 3: Security Hardening

### Task 8: Add Content Security Policy headers

**Files:**
- Modify: `next.config.mjs`

CSP prevents injected scripts from executing and limits where resources can be loaded from.

**Step 1: Add security headers to next.config.mjs**

Replace the entire content of `next.config.mjs` with:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            // CSP: allow same-origin scripts/styles, Google Fonts, Supabase API, push endpoints.
            // 'unsafe-inline' needed for Next.js inline styles; nonce-based CSP would require middleware.
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed by Next.js dev HMR
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "worker-src 'self' blob:",
              "manifest-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

**Step 2: Build and test**

```bash
npm run build && npm run dev
```

Open the app in the browser, check the Network tab → any page response → Headers. Confirm `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options` are present.

Check the browser console for any CSP violations. If Google Fonts fails to load, confirm `fonts.googleapis.com` and `fonts.gstatic.com` are in the CSP.

**Step 3: Commit**

```bash
git add next.config.mjs
git commit -m "security: add CSP, X-Frame-Options, X-Content-Type-Options headers"
```

---

### Task 9: Add server-side feedback API route with validation

**Files:**
- Create: `src/app/api/feedback/route.ts`

Currently the feedback form inserts directly from the client using the Supabase anon key. Moving to a server-side route lets us add input length validation before writing to the DB.

**Step 1: Create the API route**

```typescript
// src/app/api/feedback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAX_NAME_LEN = 100;
const MAX_MESSAGE_LEN = 2000;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, message, userId } = body as {
    name?: unknown;
    message?: unknown;
    userId?: unknown;
  };

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  if (name.trim().length > MAX_NAME_LEN) {
    return NextResponse.json({ error: `Name must be ${MAX_NAME_LEN} characters or fewer` }, { status: 400 });
  }
  if (message.trim().length > MAX_MESSAGE_LEN) {
    return NextResponse.json({ error: `Message must be ${MAX_MESSAGE_LEN} characters or fewer` }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabaseAdmin.from("feedback").insert({
    name: name.trim(),
    message: message.trim(),
    user_id: typeof userId === "string" ? userId : null,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

**Step 2: Update feedback page to call the API route**

In `src/app/profile/feedback/page.tsx`, replace the direct Supabase call with a fetch call.

Remove the import:
```typescript
import { supabase } from "@/lib/supabase";
```

Replace the `handleSubmit` function body:
```typescript
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        message: message.trim(),
        userId: user?.id ?? null,
      }),
    });

    if (!res.ok) {
      setError("Something went wrong. Please try again.");
    } else {
      setSubmitted(true);
    }
    setSubmitting(false);
  }
```

**Step 3: Build to verify**

```bash
npm run build
```

**Step 4: Test in dev**

```bash
npm run dev
```
Navigate to `/profile/feedback`. Try submitting with empty fields (should be blocked client-side). Submit a valid message. Verify it appears in Supabase `feedback` table.

**Step 5: Commit**

```bash
git add src/app/api/feedback/route.ts src/app/profile/feedback/page.tsx
git commit -m "security: add server-side feedback API with input length validation"
```

---

### Task 10: Add body validation to push/subscribe route

**Files:**
- Modify: `src/app/api/push/subscribe/route.ts`

Currently the route trusts the incoming `subscription` object without structural validation. A malformed payload crashes `webpush.sendNotification` later. Validate that the subscription has the required WebPush shape.

**Step 1: Add validation before the upsert**

In `src/app/api/push/subscribe/route.ts`, replace the existing validation block:

```typescript
  if (!subscription || !deviceId) {
    return NextResponse.json({ error: "Missing subscription or deviceId" }, { status: 400 });
  }
```

With:

```typescript
  // Validate required fields
  if (!subscription || !deviceId) {
    return NextResponse.json({ error: "Missing subscription or deviceId" }, { status: 400 });
  }

  // Validate deviceId is a UUID-like string
  if (typeof deviceId !== "string" || deviceId.length > 64) {
    return NextResponse.json({ error: "Invalid deviceId" }, { status: 400 });
  }

  // Validate WebPush subscription structure
  if (
    typeof subscription !== "object" ||
    typeof subscription.endpoint !== "string" ||
    !subscription.endpoint.startsWith("https://") ||
    typeof subscription.keys !== "object" ||
    typeof subscription.keys.p256dh !== "string" ||
    typeof subscription.keys.auth !== "string"
  ) {
    return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
  }
```

**Step 2: Build to verify**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/app/api/push/subscribe/route.ts
git commit -m "security: validate push subscription structure and deviceId in subscribe route"
```

---

### Task 11: Add search query length limit

**Files:**
- Modify: `src/app/api/search/route.ts`

A very long search query causes an oversized SQL ILIKE expression and wastes DB resources.

**Step 1: Add length cap**

In `src/app/api/search/route.ts`, replace:

```typescript
  const query = request.nextUrl.searchParams.get("q") ?? "";
  if (!query.trim()) {
    return NextResponse.json([]);
  }
```

With:

```typescript
  const query = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 200);
  if (!query.trim()) {
    return NextResponse.json([]);
  }
```

**Step 2: Build to verify**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/app/api/search/route.ts
git commit -m "security: cap search query length at 200 characters"
```

---

## Phase 4: Testing

### Task 12: Set up Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add test script and devDependencies)
- Create: `src/__tests__/` directory

**Step 1: Install Vitest**

```bash
npm install -D vitest @vitest/coverage-v8
```

**Step 2: Create vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**Step 3: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 4: Verify Vitest is installed**

```bash
npx vitest --version
```
Expected: prints a version number like `3.x.x`.

**Step 5: Commit setup**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "test: set up Vitest testing framework"
```

---

### Task 13: Test lib/kurals.ts pure functions

**Files:**
- Create: `src/__tests__/kurals.test.ts`

**Step 1: Create the test file**

```typescript
// src/__tests__/kurals.test.ts
import { describe, it, expect } from "vitest";
import { getDailyKuralId, getTodayIST } from "@/lib/kurals";

describe("getDailyKuralId", () => {
  it("returns a number between 1 and 1330 inclusive", () => {
    const id = getDailyKuralId("2025-01-01");
    expect(id).toBeGreaterThanOrEqual(1);
    expect(id).toBeLessThanOrEqual(1330);
  });

  it("is deterministic — same date always returns the same kural", () => {
    const a = getDailyKuralId("2025-06-15");
    const b = getDailyKuralId("2025-06-15");
    expect(a).toBe(b);
  });

  it("returns different kurals for different dates", () => {
    const a = getDailyKuralId("2025-01-01");
    const b = getDailyKuralId("2025-01-02");
    // Not mathematically guaranteed every day differs, but with Fisher-Yates it will
    expect(a).not.toBe(b);
  });

  it("cycles — same day 1330 days later maps to same kural", () => {
    const a = getDailyKuralId("2025-01-01");
    // 1330 days after 2025-01-01
    const b = getDailyKuralId("2028-09-04");
    expect(a).toBe(b);
  });

  it("handles negative offsets (dates before epoch)", () => {
    const id = getDailyKuralId("2024-12-31");
    expect(id).toBeGreaterThanOrEqual(1);
    expect(id).toBeLessThanOrEqual(1330);
  });
});

describe("getTodayIST", () => {
  it("returns a YYYY-MM-DD formatted string", () => {
    const today = getTodayIST();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

**Step 2: Run the tests**

```bash
npm test
```
Expected: all 5 tests pass.

**Step 3: Commit**

```bash
git add src/__tests__/kurals.test.ts
git commit -m "test: add tests for getDailyKuralId and getTodayIST"
```

---

### Task 14: Test lib/constants.ts and API validation logic

**Files:**
- Create: `src/__tests__/constants.test.ts`
- Create: `src/__tests__/api-validation.test.ts`

**Step 1: Create constants test**

```typescript
// src/__tests__/constants.test.ts
import { describe, it, expect } from "vitest";
import { MAX_KURAL_ID, MAX_CHAPTER, MAX_BOOK } from "@/lib/constants";

describe("domain constants", () => {
  it("MAX_KURAL_ID is 1330", () => expect(MAX_KURAL_ID).toBe(1330));
  it("MAX_CHAPTER is 133", () => expect(MAX_CHAPTER).toBe(133));
  it("MAX_BOOK is 3", () => expect(MAX_BOOK).toBe(3));
});
```

**Step 2: Create API validation unit tests**

Extract a pure validation helper and test it. Create `src/lib/validate.ts`:

```typescript
// src/lib/validate.ts
import { MAX_KURAL_ID, MAX_CHAPTER, MAX_BOOK } from "./constants";

export function isValidKuralId(id: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= MAX_KURAL_ID;
}

export function isValidChapter(chapter: number): boolean {
  return Number.isInteger(chapter) && chapter >= 1 && chapter <= MAX_CHAPTER;
}

export function isValidBook(book: number): boolean {
  return Number.isInteger(book) && book >= 1 && book <= MAX_BOOK;
}

export function isValidPushSubscription(sub: unknown): boolean {
  if (typeof sub !== "object" || sub === null) return false;
  const s = sub as Record<string, unknown>;
  return (
    typeof s.endpoint === "string" &&
    s.endpoint.startsWith("https://") &&
    typeof s.keys === "object" &&
    s.keys !== null &&
    typeof (s.keys as Record<string, unknown>).p256dh === "string" &&
    typeof (s.keys as Record<string, unknown>).auth === "string"
  );
}
```

```typescript
// src/__tests__/api-validation.test.ts
import { describe, it, expect } from "vitest";
import {
  isValidKuralId,
  isValidChapter,
  isValidBook,
  isValidPushSubscription,
} from "@/lib/validate";

describe("isValidKuralId", () => {
  it("accepts 1", () => expect(isValidKuralId(1)).toBe(true));
  it("accepts 1330", () => expect(isValidKuralId(1330)).toBe(true));
  it("rejects 0", () => expect(isValidKuralId(0)).toBe(false));
  it("rejects 1331", () => expect(isValidKuralId(1331)).toBe(false));
  it("rejects NaN", () => expect(isValidKuralId(NaN)).toBe(false));
  it("rejects floats", () => expect(isValidKuralId(1.5)).toBe(false));
});

describe("isValidChapter", () => {
  it("accepts 1", () => expect(isValidChapter(1)).toBe(true));
  it("accepts 133", () => expect(isValidChapter(133)).toBe(true));
  it("rejects 0", () => expect(isValidChapter(0)).toBe(false));
  it("rejects 134", () => expect(isValidChapter(134)).toBe(false));
});

describe("isValidBook", () => {
  it("accepts 1, 2, 3", () => {
    expect(isValidBook(1)).toBe(true);
    expect(isValidBook(2)).toBe(true);
    expect(isValidBook(3)).toBe(true);
  });
  it("rejects 0 and 4", () => {
    expect(isValidBook(0)).toBe(false);
    expect(isValidBook(4)).toBe(false);
  });
});

describe("isValidPushSubscription", () => {
  const validSub = {
    endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
    keys: { p256dh: "BNcRd...", auth: "tBHI..." },
  };

  it("accepts a valid subscription", () => {
    expect(isValidPushSubscription(validSub)).toBe(true);
  });
  it("rejects null", () => expect(isValidPushSubscription(null)).toBe(false));
  it("rejects missing endpoint", () => {
    expect(isValidPushSubscription({ keys: validSub.keys })).toBe(false);
  });
  it("rejects http endpoint (not https)", () => {
    expect(
      isValidPushSubscription({ ...validSub, endpoint: "http://example.com" })
    ).toBe(false);
  });
  it("rejects missing keys", () => {
    expect(isValidPushSubscription({ endpoint: validSub.endpoint })).toBe(false);
  });
});
```

**Step 3: Update push/subscribe route to use the shared validator**

In `src/app/api/push/subscribe/route.ts`, replace the inline subscription validation with:

```typescript
import { isValidPushSubscription } from "@/lib/validate";

// ... replace the inline validation block with:
  if (!isValidPushSubscription(subscription)) {
    return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
  }
```

**Step 4: Run all tests**

```bash
npm test
```
Expected: all tests pass (kurals, constants, api-validation).

**Step 5: Build to verify**

```bash
npm run build
```
Expected: build succeeds.

**Step 6: Commit**

```bash
git add src/lib/validate.ts src/lib/constants.ts src/__tests__/ src/app/api/push/subscribe/route.ts
git commit -m "test: add validation helpers and unit tests for domain logic and API validation"
```

---

## Summary

After all phases:

| Area | Changes |
|------|---------|
| **Cleanup** | Deleted `scripts/output/` (21 stale files), removed unused `@anthropic-ai/sdk`, fixed CRON_SECRET enforcement |
| **Code Quality** | Domain constants extracted, favorites N+1 eliminated (batch API), SVG accessibility fixed |
| **Security** | CSP + security headers, feedback validated server-side, push subscription validated, search query capped |
| **Testing** | Vitest set up, 16 tests covering `getDailyKuralId`, constants, and all validation helpers |

Run `npm test` at any time to confirm all tests pass.
