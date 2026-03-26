# OneKural

> One kural a day. Read, reflect, and journal your thoughts on the timeless wisdom of Thiruvalluvar.

A mobile-first Progressive Web App (PWA) for the Tamil diaspora. Every day, OneKural surfaces one verse from the Thirukkural — the 2,000-year-old Tamil classic of ethics, governance, and love — with the original Tamil, transliteration, English meaning, and scholarly commentaries.

**Live:** [onekural.com](https://onekural.com)

---

## Features

- **Daily Kural** — a new verse each day, deterministically chosen (no database needed)
- **Explore** — browse all 1,330 kurals by book, chapter, or search
- **Commentaries** — scholarly interpretations from multiple traditions
- **Favourites** — save verses you want to return to
- **Journal** — write personal reflections on any kural (authenticated)
- **Push notifications** — opt-in daily reminder at 4 AM in your timezone
- **PWA** — installable on iOS and Android, works offline

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS (mobile-first) |
| Auth & DB | Supabase (Postgres + Google OAuth) |
| Hosting | Vercel |
| Animations | Framer Motion |
| Push | Web Push API + VAPID |
| Cron | cron-job.org (every 30 min) |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- (Optional) VAPID keys for push notifications

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.local.example` to `.env.local` and fill in the values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Push notifications (optional)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<vapid-public-key>
VAPID_PRIVATE_KEY=<vapid-private-key>
VAPID_MAILTO=mailto:you@example.com

# Cron auth (optional but recommended)
CRON_SECRET=<random-secret>
```

Generate VAPID keys with:

```bash
npx web-push generate-vapid-keys
```

### 3. Set up the database

Run `supabase/schema.sql` in your Supabase SQL Editor. Then seed the kurals:

```bash
npm run seed
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run seed` | Seed the `kurals` table from JSON |
| `npm run generate-icons` | Generate PWA icons into `public/icons/` |

## Project Structure

```
src/
  app/
    page.tsx              # Home — daily kural
    explore/              # Browse all kurals
    kural/[id]/           # Individual kural detail
    journal/              # User's journal entries
    profile/              # Account & notification settings
    api/
      push/subscribe/     # Save push subscription
      push/unsubscribe/   # Remove push subscription
      push/send/          # Send daily notifications (cron target)
  components/
    KuralCard             # Daily kural on home page
    KuralDetailCard       # Kural detail (explore/kural pages)
    CommentariesSheet     # Scholarly commentary bottom sheet
    JournalEditor         # Reflection editor bottom sheet
    ShareCard             # Native share / copy sheet
  lib/
    kurals.ts             # getDailyKural(), getDailyKuralId()
    supabase.ts           # Supabase client helpers
supabase/
  schema.sql              # Full DB schema + RLS policies
public/
  sw.js                   # Service worker (offline support)
  manifest.json           # PWA manifest
```

## Android TWA

The Play Store app is a Trusted Web Activity wrapping onekural.com. Source lives in `android/` (Bubblewrap-generated).

```
android/
  twa-manifest.json          # Bubblewrap config (host, colors, version, notification delegation)
  app/build.gradle           # Android build config, version codes
  app/src/main/
    java/com/onekural/app/   # LauncherActivity, DelegationService, Application
    AndroidManifest.xml
    res/                     # Icons, splash screens, drawables
```

**Building:** Requires Android SDK + Bubblewrap CLI. Run `bubblewrap build` from `android/`.

**Versioning:** Before each Play Store release, bump `appVersionName` + `appVersionCode` in both `android/twa-manifest.json` and `android/app/build.gradle`.

**Signing keystore:** `android/android.keystore` is gitignored. Keep it backed up separately — losing it means losing the ability to update the Play Store listing.

### Push Notification Trade-off (Chrome vs App branding)

Notifications use Chrome's site-level Web Push permission. This means:

- Notifications appear branded as **"Chrome"**, not "OneKural", in the Android notification shade
- The user sees Chrome's "Allow notifications?" bar (one tap) — no separate Android OS dialog
- **Trade-off accepted**: Native app-branded notifications would require a full FCM/Firebase integration, which is significantly more complex

**What was explored and abandoned**: Requesting `POST_NOTIFICATIONS` at the Android OS level via `LauncherActivity` with the intent of auto-subscribing after the user taps Allow. This failed because the OS dialog tap does not propagate as a JavaScript user activation into the Chrome WebView, so `Notification.requestPermission()` cannot be silently resolved post-grant. Chrome also caches its delegation state at startup (before the 3-second delayed dialog fires), so `Notification.permission` stays `"default"` mid-session. The `PermissionStatus.change` event approach was also tried but `pushManager.subscribe()` still requires Chrome's site-level permission to have been confirmed via a user-activated `requestPermission()` call — which never happens automatically. Net result: auto-subscribe only worked on devices where Chrome already had prior site-level permission (useless for fresh installs).

**Current UX**: User taps Daily Reminder toggle → Chrome shows one permission bar → taps Allow → subscribed. One user action, fully reliable.

---

## Data & API

All 1,330 kurals are publicly accessible — no API key required.

### Static JSON dump (recommended for bulk access)

```bash
curl https://onekural.com/data/kurals.json
```

Returns all 1,330 kurals as a JSON array. Ideal for RAG pipelines, offline use, or data analysis.

### REST API

| Endpoint | Description |
|---|---|
| `GET /api/kural/{id}` | Single kural (id: 1–1330) |
| `GET /api/kurals?chapter=N` | All 10 kurals in chapter N (1–133) |
| `GET /api/kurals/batch?ids=1,2,3` | Batch fetch up to 100 kurals |
| `GET /api/chapters?book=N` | Chapters in book N (1=Aram, 2=Porul, 3=Inbam) |
| `GET /api/search?q=query` | Full-text search (max 50 results) |

Full OpenAPI spec: [onekural.com/openapi.yaml](https://onekural.com/openapi.yaml)

```bash
# Fetch a single kural
curl https://onekural.com/api/kural/1

# Search for kurals about education
curl "https://onekural.com/api/search?q=education"

# Get all chapters in Book 2 (Porul)
curl "https://onekural.com/api/chapters?book=2"

# Batch fetch kurals 1, 100, and 500
curl "https://onekural.com/api/kurals/batch?ids=1,100,500"
```

### LLM / Agent Access

- **`llms.txt`:** [onekural.com/llms.txt](https://onekural.com/llms.txt) — concise site description for LLM crawlers
- **`llms-full.txt`:** [onekural.com/llms-full.txt](https://onekural.com/llms-full.txt) — full API reference with all 133 chapter names
- Each kural page at `/kural/{id}` includes `schema.org/CreativeWork` JSON-LD with Tamil verse, transliteration, and both language meanings

---

## Database Schema

- **kurals** — 1,330 verses (static, seeded). Daily kural ID is computed from the date, no DB query needed.
- **journals** — per-user reflections, one per kural.
- **favorites** — per-user saved kurals.
- **push_subscriptions** — Web Push subscription objects, one per user.

All tables use Row Level Security. Users can only read/write their own data.

## Push Notifications

Notifications are sent daily at **4 AM in each subscriber's local timezone**. On Android, they appear under the **Chrome** notification channel (not "OneKural") — see the Android TWA section above for context. The endpoint `/api/push/send` filters subscriptions by timezone before sending.

[cron-job.org](https://cron-job.org) calls this endpoint every 30 minutes, covering all timezone offsets including half-hour ones like IST. GitHub Actions was previously used for this but was removed due to unreliable scheduling (runs were silently skipped, resulting in ~hourly instead of 30-minute intervals).

To set up:
1. Add `CRON_SECRET` to your Vercel environment variables.
2. Create a job on [cron-job.org](https://cron-job.org) targeting `GET https://onekural.com/api/push/send` with the `Authorization: Bearer <CRON_SECRET>` header, scheduled every 30 minutes.

## Deployment

Deploy to Vercel with one click or via the CLI:

```bash
npx vercel
```

Required environment variables must be set in your Vercel project settings. Push notification scheduling is handled by cron-job.org rather than Vercel's built-in cron (limited to once per day on the free tier) or GitHub Actions (unreliable scheduling).
