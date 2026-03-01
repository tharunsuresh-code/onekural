# Thirukkural Daily — Build Plan

## Phase 1: Foundation
- [x] Scaffold Next.js 14 app with Tailwind CSS and Framer Motion
- [x] Configure fonts (Noto Serif Tamil), color palette, global styles
- [x] Set up Supabase project and create tables from schema
- [x] Find and seed kural data from open source JSON (tk120404/thirukkural)

## Phase 2: Core Pages
- [x] Daily Kural home page (`/app/page.tsx`) — Server Component + KuralCard with swipe gestures
- [x] Kural detail page (`/app/kural/[id]/page.tsx`) — Tamil + transliteration + expandable commentaries
- [x] Bottom nav component + routing (`BottomNav.tsx`) — 4 tabs with active state
- [x] Explore page (`/app/explore/page.tsx`) — 3 book tabs, chapter expansion, debounced search
- [x] Journal page (`/app/journal/page.tsx`) — placeholder with sign-in CTA
- [x] Profile page (`/app/profile/page.tsx`) — placeholder with avatar + settings list
- [x] Shared types (`types.ts`) + extended data layer (chapters, search)
- [x] API routes for client-side kural/chapter/search fetching
- [x] Safe-area-inset-bottom CSS for iOS, midnight IST rollover via visibilitychange

## Phase 3: Features
- [x] Auth — Google + email magic link via Supabase, AuthProvider context, SignInModal
- [x] Favorites — localStorage (anonymous) + Supabase (logged-in), merge on login
- [x] Journal — editor with debounced auto-save, journal list page
- [x] Shareable card (`ShareCard.tsx`) — Canvas-based PNG, story + square formats, Web Share API
- [x] Profile page wired to auth (user info, sign-out, favourites link)
- [x] KuralCard + detail page wired (favourite, journal, share buttons)

## Phase 4: PWA
- [x] `manifest.json` — name, icons, display: standalone
- [x] Icon generation script (`scripts/generate-icons.ts`) — canvas-based ஒ monogram, 5 sizes
- [x] Service worker (`public/sw.js`) — cache-first static, network-first API, offline nav fallback
- [x] `ServiceWorkerRegistrar.tsx` — client component, registers SW on mount
- [x] Push notifications — `src/lib/push.ts`, `/api/push/send` route, Vercel cron at 06:00 IST
- [x] Profile page — Daily Reminder toggle (logged-in + PushManager only)

## Phase 5: Polish & Deploy
- [ ] Mobile gesture testing (iOS Safari 100dvh, overscroll-behavior)
- [ ] Performance audit (font preload, image optimization)
- [ ] Vercel deployment
- [ ] Push to GitHub
- [ ] Connect Cloudflare domain

---

## Review

### Phase 4 complete (2026-02-28)
All PWA features implemented and `npm run build` passes clean.
One manual prerequisite before deploying: run the Supabase SQL below and ensure VAPID keys are set in Vercel env vars.
