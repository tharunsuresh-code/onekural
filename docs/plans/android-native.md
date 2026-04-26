# OneKural Android Native — Plan & Status

## Architecture

Native Kotlin/Jetpack Compose app in `android/`. Not a TWA anymore — fully native UI.

**Key dependencies:**
- Jetpack Compose + Material3
- Room (local DB: Kural, Favorite, Journal)
- Supabase-kt 3.0.0 (Auth + Postgrest)
- Firebase Cloud Messaging (FCM push notifications)
- DataStore Preferences (theme, showTamil)

**Package:** `com.onekural.app`

---

## File Map

| File | Purpose |
|------|---------|
| `ui/screen/HomeScreen.kt` | Daily kural with swipe nav, explanation sheet, journal sheet |
| `ui/screen/KuralDetailScreen.kt` | Kural detail (from Explore) with swipe nav |
| `ui/screen/ExploreScreen.kt` | Browse by book/chapter + search |
| `ui/screen/ProfileScreen.kt` | Auth (Google + magic link), settings |
| `ui/viewmodel/HomeViewModel.kt` | State: kural, isFavorite, journalText, loading |
| `ui/navigation/AppNavHost.kt` | Bottom nav: Home · Explore · Journal · Profile |
| `ui/theme/` | OneKuralTheme, colors (emerald primary), NotoSerifTamil font |
| `util/AppPrefs.kt` | DataStore: darkTheme (null=system, false=light, true=dark), showTamil |
| `util/TtsManager.kt` | Android TextToSpeech wrapper |
| `util/ShareUtil.kt` | Canvas bitmap share card (matches web design) |
| `util/getDailyKuralId.kt` | xorshift32 daily shuffle, epoch 2025-01-01 |
| `data/db/AppDatabase.kt` | Room DB with KuralDao, FavoriteDao, JournalDao |
| `data/repository/AuthRepository.kt` | Supabase auth (Google OAuth, magic link OTP) |
| `MainActivity.kt` | Entry + auth deep link handler |

---

## UI Patterns

### Home Screen structure
```
Column(fillMaxSize, swipeGesture, statusBarsPadding) {
    // Header: theme icon (system/light/dark cycle) + "OneKural" centered
    // Fixed 40dp box: "TODAY'S KURAL" + date (only for daily kural id)
    
    Box(weight(1f)) {
        Crossfade(kural, tween(400)) {  // prevents blink on swipe
            Column(fillMaxSize, Center) {
                // chapter badge + lang toggle (Tamil/English)
                // EditorialDivider (emerald gradient line)
                // kural text (Tamil or transliteration)
                // EditorialDivider
                // InsightBox (English meaning)
                // "TAP FOR EXPLANATION" → opens explanation ModalBottomSheet
            }
        }
    }
    
    // Nav row (fixed): < #prev | id/1330 | #next >
    // HorizontalDivider
    // Action row: Listen | Favourite | Journal | Share
    //   Journal → opens JournalEditorSheet in-place
}
// Explanation ModalBottomSheet (full kural detail + explanation)
// JournalEditorSheet ModalBottomSheet
```

### Shared composables (defined in HomeScreen.kt)
- `EditorialDivider()` — 48dp emerald gradient line
- `InsightBox(label, text, useTamil)` — emerald-tinted rounded box
- `SheetHandle()` — drag handle pill
- `ActionButton(icon, label, active, onClick)` — Column: Icon(22dp) + Text(10sp)
- `JournalEditorSheet(sheetState, initialText, onDismiss, onSave)` — used by both Home + Detail

### KuralDetail structure (from Explore tap)
Same pattern as HomeScreen but:
- Has "< Back" button instead of theme icon
- ViewModel tracks `currentId` internally for prev/next
- Swipe left/right still works (loadPrev/loadNext)

---

## Theme

Three states via `AppPrefs.darkThemeFlow` → `Boolean?`:
- `null` = system default (icon: Laptop/monitor)
- `false` = light (icon: LightMode sun)
- `true` = dark (icon: DarkMode moon)

Cycle: null → false → true → null (via `AppPrefs.cycleTheme`)

---

## Auth Flow

### Magic link (email)
1. User enters email → `AuthRepository.sendOtp(email)` (supabase-kt 3.0.0 OTP)
2. Shows "Check your email" — no code entry
3. User taps link in email → opens app via deep link `com.onekural.app://auth-callback#access_token=...`
4. `MainActivity.handleAuthDeepLink()` parses fragment, calls `supabase.auth.importSession()`

**Required:** Add `com.onekural.app://auth-callback` to Supabase Dashboard → Auth → URL Configuration → Redirect URLs

### Google Sign-In
Requires debug keystore SHA-1 registered in Google Cloud Console:
`E9:93:AE:A8:B7:4A:6D:ED:F4:35:E1:31:1F:E5:77:9B:B8:0D:A8:8A`

---

## Share Card (ShareUtil.kt)

Matches web share card design:
- 1080×1080 white background
- Centered layout (vertical centering calculated by measuring content first)
- Decorative emerald dot → chapter badge → divider → Tamil kural text → divider → insight box
- Kural #N badge top-right
- "அ · OneKural" watermark bottom-center
- NotoSerifTamil font from `res/font/noto_serif_tamil.ttf`

---

## Supabase-kt 3.0.0 Gotchas

- `OTP.Config` has NO `redirectTo` field — configure redirect in Supabase Dashboard
- `UserSession` constructor: `(accessToken, refreshToken, expiresIn, tokenType)` — use named params
- `SessionSource.External` is a singleton object
- `supabase.auth.importSession(session, autoRefresh = true, source = SessionSource.External)`

---

## Build

```bash
cd android/
./gradlew :app:installDebug   # build + install on connected device
./gradlew :app:compileDebugKotlin  # compile-only check
```

Signing keystore (`android.keystore`) is gitignored — keep backed up separately.

Bump `appVersionName` + `appVersionCode` in both `twa-manifest.json` AND `app/build.gradle` before Play Store release.

---

## Known TODOs

- [ ] Google Sign-In: register debug SHA-1 in Google Cloud Console
- [ ] Supabase Dashboard: add `com.onekural.app://auth-callback` to redirect URLs
- [ ] Play Store: release signing key setup
