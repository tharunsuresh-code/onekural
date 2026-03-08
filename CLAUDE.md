# OneKural — CLAUDE.md

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
      kurals/            # GET /api/kurals?id=N
      chapters/          # GET /api/chapters
      search/            # GET /api/search?q=...
      kural/[id]/        # GET /api/kural/[id]
      push/send|subscribe|unsubscribe/
  components/            # Client components
  lib/                   # supabase.ts, auth.tsx, theme.tsx, types.ts, etc.

supabase/
  schema.sql             # Full DB schema
  migrations/            # Applied in order (001–006)

scripts/
  seed.ts                # Loads kural CSV/JSON into Supabase
  sync-dataset.ts        # Syncs open-source dataset
  generate-icons.ts      # Canvas-based PWA icon generator
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

## Key Gotchas

- **Tamil font size**: Use `px`-based clamp in CSS (`clamp(18px, 4.5vw, 28px)`) — rem-based clamp grows with system font scale causing overflow; class is `.font-kural-tamil` in `globals.css`
- **Favicon**: Replace `src/app/favicon.ico` (not `public/favicon.ico`) — Next.js App Router uses the app dir version. Also add `src/app/icon.png` for PNG fallback in Firefox
- **API caching**: Next.js 14 GET handlers cache by default. Use `revalidate` or `force-dynamic` to opt out. Vercel Data Cache persists across deploys — purge manually if needed.
- **iOS safe area**: `.pb-nav { padding-bottom: calc(3.5rem + env(safe-area-inset-bottom, 0px) + 1rem) }`
- **Bottom sheets**: Use `history.pushState` + `popstate` for Android back-button dismiss
- **Daily kural**: Rolls over at midnight IST via `visibilitychange` listener

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

## Design System

- Dark mode: `darkMode: "class"` in Tailwind, toggled via `ThemeProvider` (localStorage + system pref)
- Accent: Emerald `#1B5E4F` (light) / `#2A7D6F` (dark)
- Tamil font: Noto Serif Tamil — preloaded, class `font-tamil`
- Max content width: 680px, single column
- Bottom tab bar: Home · Explore · Journal · Profile

## Phase Status

- All phases complete. App live at https://onekural.com (Vercel + Cloudflare domain).
