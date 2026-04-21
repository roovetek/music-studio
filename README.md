# Music Studio

Web + Capacitor shell for the metronome tools (classic and studio).

## Web / PWA

- **Build:** `npm run build` — outputs `dist/` with a service worker and `manifest.webmanifest` (via [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)).
- **Preview:** `npm run preview` — test the production build locally over HTTP.
- **Icons:** Regenerate PNGs under `public/icons/` with `npm run generate:icons` (requires devDependency `sharp`). Commit updated icons when the branding changes.
- **Deploy:** Host `dist/` behind **HTTPS** so install prompts and service workers work.

## Android (Capacitor)

1. `npm run build:mobile` — builds the Vite app and runs `cap sync` so `android/app/src/main/assets/public` matches `dist/`.
2. Open `android/` in Android Studio, then **Build → Build Bundle(s) / APK(s)** (or use Gradle) for a device or emulator.
3. For Play Store releases, configure signing, bump `versionCode` / `versionName` in `android/app/build.gradle`, and build an AAB.

Generated Android/iOS web assets are listed in `.gitignore` and are recreated by the steps above.

## Develop

- `npm run dev` — Vite dev server (port `5175`).
