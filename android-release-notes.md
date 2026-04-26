# OneKural v1.0.0 — Release Notes

## English

Initial release of OneKural on the Play Store.

- Daily Kural — a new Thirukkural delivered every day at 6 AM IST
- Read the original Tamil verse with transliteration and English/Tamil meanings
- Tap for full explanation in English or Tamil
- Explore all 1,330 Kurals by book (Aram, Porul, Inbam) and chapter
- Full-text search in English or Tamil
- Journal — write and save personal reflections on any Kural
- Daily push notifications with reminder toggle
- Works offline
- Dark mode support

---

## Tamil

OneKural பயன்பாட்டின் முதல் பதிப்பு Play Store-ல் வெளியிடப்படுகிறது.

- தினசரி குறள் — ஒவ்வொரு நாளும் காலை 6 மணிக்கு ஒரு திருக்குறள்
- மூல தமிழ் பாடல், எழுத்துப்பெயர்ப்பு மற்றும் ஆங்கில/தமிழ் விளக்கங்கள்
- ஆங்கிலம் அல்லது தமிழில் விரிவான விளக்கம் காண தட்டவும்
- அனைத்து 1,330 குறள்களையும் பால் (அறம், பொருள், இன்பம்) மற்றும் அதிகாரம் வாரியாக உலாவுங்கள்
- தமிழிலோ ஆங்கிலத்திலோ முழு உரை தேடல்
- குறிப்பேடு — எந்த குறளிலும் உங்கள் சொந்த எண்ணங்களை எழுதி சேமிக்கவும்
- தினசரி தள்ளல் அறிவிப்புகள் (நினைவூட்டல் அமைப்பு உள்ளது)
- இணையமின்றியும் பயன்படுத்தலாம்
- இருண்ட பயன்முறை ஆதரவு

---

## Play Store Listing

### Short Description (80 chars)

One Thirukkural a day — wisdom that shaped a civilization, in your pocket.

### Full Description

For over 2,000 years, the Thirukkural has guided how we live, love, and lead. 1,330 verses. 133 chapters. Timeless wisdom from Thiruvalluvar — now one kural at a time, every day.

**Your daily ritual:**
Wake up to a fresh kural every morning. Read the original Tamil verse, the transliteration, and the meaning in English or Tamil. Tap for a full explanation that brings ancient wisdom into your daily life.

**Explore the full text:**
Browse all 1,330 Kurals organized by the three books — Aram (Virtue), Porul (Wealth), and Inbam (Love). Search in English or Tamil to find exactly what you're looking for.

**Reflect and journal:**
Write your thoughts on any kural. Build a personal collection of reflections over time. Your own wisdom, inspired by the greatest.

**Never miss a day:**
Turn on daily reminders and let the Kural find you — wherever you are.

Whether you're rediscovering your roots or encountering Thiruvalluvar for the first time, OneKural is your daily companion to one of humanity's greatest literary treasures.

தினமும் ஒரு குறள். வாழ்நாள் முழுவதும் ஒரு வழிகாட்டி.



./gradlew assembleRelease

./gradlew bundleRelease

~/android-sdk/build-tools/35.0.0/zipalign -f -v -p 4 app/build/outputs/apk/release/app-release-unsigned.apk app-release-unsigned-aligned.apk 

~/android-sdk/build-tools/35.0.0/apksigner sign --ks android.keystore --ks-key-alias onekural --ks-pass pass:onekural123 --key-pass pass:onekural123 --min-sdk-version 21 --out app-release-signed.apk app-release-unsigned-aligned.apk


~/android-sdk/build-tools/35.0.0/apksigner sign --ks android.keystore --ks-key-alias onekural --ks-pass pass:onekural123 --key-pass pass:onekural123 --min-sdk-version 21 --out app-release-signed.aab app/build/outputs/bundle/release/app-release.aab

adb logcat -s "OneKuralDelegation" -s "ActivityManager" | grep -iE "OneKural|Delegation|NotificationPermission"