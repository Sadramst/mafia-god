# ساخت اپلیکیشن بومی — خدای مافیا
# Build Native Apps — Mafia God

This guide explains how to build **standalone Android (.apk)** and **iOS (.ipa)** apps from this PWA. **No server is needed** — the entire app runs locally on the device.

---

## Prerequisites / پیش‌نیازها

| Tool | Required For | Download |
|------|-------------|----------|
| **Node.js** (v18+) | All | https://nodejs.org |
| **Android Studio** | Android | https://developer.android.com/studio |
| **Xcode** (macOS only) | iOS | Mac App Store |
| **CocoaPods** (macOS only) | iOS | `sudo gem install cocoapods` |

---

## Step 1: Install Dependencies / نصب وابستگی‌ها

```bash
cd PWA
npm install
```

## Step 2: Initialize Capacitor Platforms / راه‌اندازی پلتفرم‌ها

### Android:
```bash
npx cap add android
npx cap sync android
```

### iOS (macOS only):
```bash
npx cap add ios
npx cap sync ios
```

---

## Step 3: Build & Run / ساخت و اجرا

### Android — ساخت APK

**Option A: Open in Android Studio**
```bash
npx cap open android
```
Then in Android Studio:
1. Wait for Gradle sync to finish
2. Go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. The `.apk` file will be at `android/app/build/outputs/apk/debug/app-debug.apk`

**Option B: Build from command line**
```bash
cd android
./gradlew assembleDebug
```
APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

**For Release APK (signed):**
```bash
cd android
./gradlew assembleRelease
```

### iOS — ساخت IPA (macOS فقط)

```bash
npx cap open ios
```
Then in Xcode:
1. Select your team under **Signing & Capabilities**
2. Select a connected device or simulator
3. Press **⌘ + R** to run, or **Product → Archive** for distribution

---

## Step 4: After Code Changes / بعد از تغییر کد

Whenever you change web files (HTML/CSS/JS):
```bash
npx cap sync
```
Then rebuild in Android Studio / Xcode.

---

## Android App Configuration

The Android app is configured in `capacitor.config.json`:
- **App ID**: `com.mafiagod.app`
- **App Name**: خدای مافیا
- **Theme**: Dark (#0a0a0f)
- **Orientation**: Portrait
- **No server needed**: All assets are bundled in the APK/IPA

### Android Icon
Place your app icon files in:
- `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` (72x72)
- `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` (96x96)
- `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` (144x144)
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` (192x192)

Or use `@capacitor/assets`:
```bash
npx @capacitor/assets generate --android --iconBackgroundColor '#0a0a0f'
```

### iOS Icon
```bash
npx @capacitor/assets generate --ios --iconBackgroundColor '#0a0a0f'
```

---

## App Store / Google Play Release

### Android (Google Play)
1. Create a keystore: `keytool -genkey -v -keystore mafia-god.keystore -alias mafiagod -keyalg RSA -keysize 2048 -validity 10000`
2. Configure signing in `android/app/build.gradle`
3. Build release: `cd android && ./gradlew bundleRelease`
4. Upload `.aab` to Google Play Console

### iOS (App Store)  
1. Set up an Apple Developer account
2. Configure provisioning profiles in Xcode
3. Archive: **Product → Archive**
4. Upload to App Store Connect

---

## Architecture

```
PWA/                    ← Your web app (source of truth)
├── index.html
├── css/styles.css
├── js/
│   ├── app.js          ← Main app controller
│   ├── native.js       ← Capacitor native bridge
│   ├── models/         ← Game logic
│   ├── views/          ← UI views
│   └── utils/          ← Storage & Timer
├── assets/             ← Icons
├── capacitor.config.json ← Native app settings
├── package.json
├── android/            ← Generated Android project (Android Studio)
└── ios/                ← Generated iOS project (Xcode)
```

All web files are **copied into** the native app during `cap sync`. The app runs entirely offline with no server dependency.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| White screen on Android | Run `npx cap sync android` again |
| Module import errors | Ensure all JS paths are relative (`./`) |
| iOS build fails | Run `cd ios/App && pod install` |
| Changes not showing | Run `npx cap sync` after each change |
| Android back button | Handled in `js/native.js` |
