# OneKural — Agent Instructions

> Generic agent instructions for AI coding assistants (Claude Code, Cursor, Copilot Workspace, Aider, Devin, etc.).
> `CLAUDE.md` is a symlink to this file.

## Commands

```bash
npm run dev              # Dev server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint
npm run seed             # Seed kural data into Supabase (ts-node)
npm run generate-icons   # Regenerate PWA icons → public/icons/
```

## Architecture

```
src/
  app/                   # Next.js 14 App Router
    page.tsx             # Home — daily kural (Server Component)
    kural/[id]/          # Kural detail page
    explore/             # Browse by book/chapter + search
    journal/             # Auth-gated journal list + editor
    profile/             # Auth + push notification settings
    profile/feedback/    # Feedback form → Supabase feedback table
    about/               # About OneKural page
    terms/               # Terms of Service
    privacy/             # Required for Google OAuth crawler
    api/
      kurals/            # GET /api/kurals?chapter=N
      kurals/batch/      # GET /api/kurals/batch?ids=1,2,3 (max 100)
      chapters/          # GET /api/chapters?book=N
      search/            # GET /api/search?q=...
      kural/[id]/        # GET /api/kural/[id]
      openapi/           # GET /api/openapi (OpenAPI spec as JSON)
      push/send|subscribe|unsubscribe/
  components/            # Client components
  lib/                   # supabase.ts, auth.tsx, theme.tsx, types.ts, etc.

supabase/
  schema.sql             # Full DB schema
  migrations/            # Applied in order (001–006)

scripts/
  seed.ts                # Loads kural data from remote JSON into Supabase
  sync-dataset.ts        # Syncs public/data/kurals.json → Supabase
  generate-icons.ts      # Canvas-based PWA icon generator

public/
  data/kurals.json       # Source of truth — all 1,330 kurals (edit here to update data)
  openapi.yaml           # OpenAPI 3.1 spec for all public API endpoints
  llms.txt               # LLM-readable site description (llmstxt.org standard)
  llms-full.txt          # Full API reference for LLM agents
```

## Environment Variables

Required in `.env.local` (and Vercel env):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # Used in API routes
NEXT_PUBLIC_VAPID_PUBLIC_KEY=      # Generate: npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=
```

## Supabase Setup

Apply migrations in order from `supabase/migrations/` (001–006 already applied).

Push subscriptions: keyed by `device_id` (UUID stored in localStorage) — one row per device. No `UNIQUE(user_id)` constraint (intentionally dropped in migration 006 for multi-device support).

**Data updates**: Editing `public/data/kurals.json` and committing/pushing to `main` triggers a GitHub Actions workflow that automatically syncs to the Supabase DB. No manual `npm run seed` or direct DB updates needed for kural data changes.

**Stale local data**: If DB changes aren't reflected locally despite restarting the dev server, delete the `.next/` directory — Next.js Data Cache persists there and can serve stale Supabase responses. `rm -rf .next && npm run dev` forces a clean fetch.

## Key Gotchas

- **Tamil font size**: Use `px`-based clamp in CSS (`clamp(18px, 4.5vw, 28px)`) — rem-based clamp grows with system font scale causing overflow; class is `.font-kural-tamil` in `globals.css`
- **Favicon**: Replace `src/app/favicon.ico` (not `public/favicon.ico`) — Next.js App Router uses the app dir version. Also add `src/app/icon.png` for PNG fallback in Firefox
- **API caching**: Next.js 14 GET handlers cache by default. Use `revalidate` or `force-dynamic` to opt out. Vercel Data Cache persists across deploys — purge manually if needed.
- **iOS safe area**: `.pb-nav { padding-bottom: calc(3.5rem + env(safe-area-inset-bottom, 0px) + 1rem) }`
- **Bottom sheets**: Use `history.pushState` + `popstate` for Android back-button dismiss
- **Daily kural**: Rolls over at midnight IST via `visibilitychange` listener
- **Local network testing**: `npm run dev -- --hostname 0.0.0.0` then connect phone to `http://<hostname -I>:3000` on same WiFi

## Animation Patterns (Framer Motion)

- **Kural card navigation**: Do NOT put `key` on the outer drag `motion.div` — it breaks drag MotionValues. Instead key a narrow inner `motion.div` wrapping only the content that changes (dividers + kural text + insight).
- **Crossfade on key change**: Use `<AnimatePresence mode="wait">` + `exit={{ opacity: 0 }}` on the keyed child. Without `exit`, the old element unmounts instantly causing a flash before the new one fades in.
- **`initial={false}` on AnimatePresence**: Suppresses enter animations for ALL children unconditionally — not just on first page mount. Avoid it if you want key-change animations to play.
- **Static elements**: Chapter badge, language switch, and "Tap for Explanation" must live outside the keyed div — otherwise they blink on every kural navigation (especially visible in Firefox).

## Layout Stability

- **Fixed header height**: Use `invisible` (not conditional rendering) for elements that appear/disappear (e.g. "Today's Kural" sub-label). Conditional rendering changes header height and causes the chapter row below to jump.
- **Scroll area isolation**: Chapter badge + lang switch belong above the `flex-1` scroll container; "Tap for Explanation" belongs below it. Placing them inside the scrollable drag area causes jarring vertical shifts as content height changes between kurals.

## Share Image (Canvas)

- **Font sizes in `measureContent` must exactly match `generateImage`** — they are separate functions and drift silently causes misaligned layout.
- **Tamil kural font**: `44px / 62lh` — 56px was too large and pushed the insight box into the watermark on longer verses.
- **Content overflow guard**: `bottomReserved` + `topMin` in `generateImage` clamp the vertical centering; always verify with a long kural (e.g. a 3-line transliteration) before shipping font size changes.

## PWA / Push Notifications

- Service worker: `public/sw.js` — network-first nav, cache-first static, kural API cached offline
- Cron: `vercel.json` fires `POST /api/push/send` at 00:30 UTC (06:00 IST)
- VAPID keys in `.env.local` as above

## Data Model (core types)

```ts
Kural { id, book, chapter, kural_tamil, transliteration,
        meaning_english, meaning_tamil, scholars[], themes[],
        explanation_english?, explanation_tamil? }
Chapter { chapter, chapter_name_tamil, chapter_name_english, book }
BOOK_NAMES: { 1: Aram, 2: Porul, 3: Inbam }
```

## Public API

Base URL: `https://onekural.com`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/kural/{id}` | GET | Single kural (id: 1–1330) |
| `/api/kurals?chapter=N` | GET | All kurals in a chapter |
| `/api/kurals/batch?ids=1,2,3` | GET | Batch fetch up to 100 kurals |
| `/api/chapters?book=N` | GET | Chapters in a book (1=Aram, 2=Porul, 3=Inbam) |
| `/api/search?q=query` | GET | Full-text search (max 50 results) |
| `/api/openapi` | GET | OpenAPI 3.1 spec (JSON) |

Full spec: `https://onekural.com/openapi.yaml`
Static data: `https://onekural.com/data/kurals.json` (all 1,330 kurals)

## Design System

- Dark mode: `darkMode: "class"` in Tailwind, toggled via `ThemeProvider` (localStorage + system pref)
- Accent: Emerald `#1B5E4F` (light) / `#2A7D6F` (dark)
- Tamil font: Noto Serif Tamil — preloaded, class `font-tamil`
- Max content width: 680px, single column
- Bottom tab bar: Home · Explore · Journal · Profile

## Phase Status

- All phases complete. App live at https://onekural.com (Vercel + Cloudflare domain).
