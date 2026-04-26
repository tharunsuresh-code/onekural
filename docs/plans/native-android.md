# Convert OneKural Android App: TWA → Native

## Context

TWA = Chrome wrapper. Only ~400 lines Java native (FCM, device ID, launcher). All UI/data/auth in Next.js. Goal: replace web layer with Kotlin/Jetpack Compose, offline-first.

---

## SESSION PROGRESS (2026-04-24)

### DONE ✅
- `android/build.gradle` — modern plugins block (AGP 8.9.1, Kotlin 2.0.21, KSP 2.0.21-1.0.28, Compose plugin)
- `android/settings.gradle` — pluginManagement + dependencyResolutionManagement
- `android/app/build.gradle` — Compose BOM, Room, DataStore, WorkManager, Lifecycle, Coil, Firebase, Gson, desugaring, `syncKuralsJson` Gradle task
- `android/app/src/main/AndroidManifest.xml` — removed all TWA activities, kept FCM service + deep links
- `android/app/src/main/assets/kurals.json` — copied from `public/data/kurals.json`
- `android/app/src/main/res/values/strings.xml` — cleaned up (removed TWA strings)
- `android/app/src/main/res/values/colors.xml` — added colorPrimary/Dark
- `android/app/src/main/res/values/themes.xml` — `Theme.OneKural` (Material3 NoActionBar, edge-to-edge)
- `android/app/proguard-rules.pro` — created (Firebase, Room, Gson, Kotlin rules)
- `LauncherActivity.java` — **DELETED**
- Room entities: `Kural.kt`, `Journal.kt`, `Favorite.kt`, `ChapterSummary`
- Room DAOs: `KuralDao.kt` (search, chapters), `JournalDao.kt`, `FavoriteDao.kt`
- `AppDatabase.kt` — singleton, entities wired
- `DatabaseSeeder.kt` — reads kurals.json asset → inserts into Room (no-op if count≥1330)
- `DailyKural.kt` — exact port of JS xorshift32 Fisher-Yates shuffle (seed=0x4A9F3C2E, epoch=2025-01-01)
- Theme: `Color.kt` (emerald/dark/light), `Type.kt` (NotoSerifTamil → bundled TTF), `Theme.kt` (light/dark MaterialTheme, edge-to-edge)
- `AppNavigation.kt` — NavHost 4 tabs + KuralDetail route, BottomNavBar
- `HomeViewModel.kt` — daily kural, prev/next, favorite toggle, `showTamil` DataStore pref
- `ExploreViewModel.kt` — search (300ms debounce), book tabs, chapter expand/collapse
- `HomeScreen.kt` — Tamil card, transliteration swap via lang toggle, prev/next nav, favorite icon
- `KuralDetailScreen.kt` — full detail with explanation, favorite toggle, inline journal editor sheet
- `ExploreScreen.kt` — SearchBar, book tabs, expandable chapters, search results
- `JournalScreen.kt` — list from Room, empty state
- `ProfileScreen.kt` — full auth UI: Google + OTP sign-in, sign-out, avatar, prefs
- `MainActivity.kt` — DB seed, notification permission, theme pref observation, app shortcuts
- `.github/workflows/release-android.yml` — updated (SDK path, whatsNewDirectory)
- `android-release-notes/en-US.txt` + `ta-IN.txt` — created
- `util/AppPrefs.kt` — DataStore singleton (showTamil, darkTheme, pushEnabled prefs)
- `util/SupabaseClient.kt` — supabase-kt 3.0.0 singleton (Auth + Postgrest)
- `util/TtsManager.kt` — TextToSpeech Tamil (ta-IN, 0.85x rate)
- `util/ShareUtil.kt` — Canvas bitmap share card + share intent + FileProvider
- `data/repository/AuthRepository.kt` — Google (Credential Manager) + OTP sign-in/verify/out
- `data/worker/SyncWorker.kt` — WorkManager: favorites + journals → Supabase on login
- `ui/viewmodel/AuthViewModel.kt` — auth state, FCM user linking on sign-in
- `res/font/noto_serif_tamil.ttf` — bundled Noto Serif Tamil v2.001
- `res/xml/file_provider_paths.xml` — FileProvider cache path for share images
- **Build verified ✅** — all phases, clean `assembleDebug` (2026-04-24)

---

## Offline-First Design

| Data | Storage | Sync |
|------|---------|------|
| 1330 kurals | Room (seeded from bundled asset) | Never — static |
| Journals | Room (write-first) | Supabase on login |
| Favorites | Room (write-first) | Supabase on login |
| Profile pic | Coil disk cache | Re-download on change |
| Prefs | DataStore | Device-local |
| Daily kural | Pure local algorithm | No network |

`kurals.json` auto-syncs: edit `public/data/kurals.json` → Gradle `syncKuralsJson` task copies to assets on every build.

---

## Phase Plan

### Phase 1 — Foundation ✅
- [x] Build system (Kotlin 2.0.21 + Compose plugin + KSP)
- [x] Room schema (kurals, journals, favorites)
- [x] DatabaseSeeder from asset
- [x] DailyKural algorithm (matches web exactly)
- [x] Navigation (4 tabs + detail)
- [x] MainActivity
- [x] `assembleDebug` passes

### Phase 2 — Core UI ✅
- [x] HomeScreen (daily kural, prev/next, favorite, lang toggle)
- [x] KuralDetailScreen (explanation, journal editor, TTS, share)
- [x] ExploreScreen (search, book/chapter browser)
- [x] JournalScreen (list)
- [x] JournalEditor (write reflection on kural detail)
- [x] Language toggle (Tamil ↔ transliteration) via DataStore
- [x] Noto Serif Tamil font (bundled TTF)

### Phase 3 — Auth + Sync ✅
- [x] Supabase Android SDK (BOM 3.0.0, Auth + Postgrest)
- [x] Google OAuth via Credential Manager (needs `google.webClientId` in local.properties)
- [x] Email OTP sign-in + verify
- [x] Favorites sync (WorkManager, on login)
- [x] Journal sync (WorkManager, on login)
- [x] Profile picture (Coil AsyncImage from Supabase user metadata)

### Phase 4 — Notifications + Profile ✅
- [x] Profile screen (auth state, avatar, push toggle, theme toggle, lang toggle)
- [x] FCM linkUser called on sign-in (links device → Supabase user)
- [x] Notification permission UX (system dialog on Android 13+)

### Phase 5 — Polish ✅
- [x] Tamil TTS (`TtsManager`, `ta-IN`, 0.85x rate) on KuralDetailScreen
- [x] Share card (Bitmap/Canvas, emerald bg, share intent, FileProvider)
- [x] App shortcuts ("Today's Kural") in MainActivity
- [x] Dark/light theme toggle in ProfileScreen (DataStore, observed in MainActivity)

---

## Key File Locations

```
android/
  build.gradle                          ← root plugins block
  settings.gradle                       ← pluginManagement
  app/
    build.gradle                        ← deps + syncKuralsJson task
    proguard-rules.pro
    src/main/
      assets/kurals.json                ← auto-synced from public/data/
      AndroidManifest.xml
      java/com/onekural/app/
        MainActivity.kt                 ← entry point
        Application.java                ← FCM init (keep)
        FcmService.java                 ← FCM handler (keep)
        FcmTokenRegistrar.java          ← FCM token reg (keep)
        data/model/                     ← Kural, Journal, Favorite, ChapterSummary
        data/db/                        ← DAOs, AppDatabase, DatabaseSeeder
        util/DailyKural.kt              ← xorshift32 seeded shuffle
        ui/theme/                       ← Color, Type, Theme
        ui/navigation/AppNavigation.kt
        ui/screen/                      ← Home, Explore, Journal, Profile, KuralDetail
        ui/viewmodel/                   ← HomeViewModel, ExploreViewModel
      res/values/
        colors.xml, strings.xml, themes.xml

.github/workflows/release-android.yml  ← tag push → AAB → Play internal track
android-release-notes/en-US.txt        ← whatsNew for Play upload
android-release-notes/ta-IN.txt
```

## GitHub Secrets Required
```
KEYSTORE_BASE64            ← base64 of android.keystore
GOOGLE_SERVICES_JSON_BASE64 ← base64 of google-services.json
KEYSTORE_PASSWORD
KEY_ALIAS
KEY_PASSWORD
PLAY_SERVICE_ACCOUNT_JSON  ← Play Console service account JSON (plain text)
```

## Verification Checklist
1. `./gradlew assembleDebug` — clean build
2. Install APK: cold start <1s, no Chrome
3. Airplane mode → all 1330 kurals browse OK
4. Today's kural matches web app
5. Write journal → persists after restart
6. FCM notification arrives on push send
7. Tamil TTS plays (Phase 5)
8. Share image generates (Phase 5)
