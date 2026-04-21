# Music Studio

Web + Capacitor shell for the metronome tools (classic and studio).

## Web / PWA

- **Build:** `npm run build` — outputs `dist/` with a service worker and `manifest.webmanifest` (via [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)).
- **Preview:** `npm run preview` — test the production build locally over HTTP.
- **Icons:** Regenerate PNGs under `public/icons/` with `npm run generate:icons` (requires devDependency `sharp`). Commit updated icons when the branding changes.
- **Deploy:** Host `dist/` behind **HTTPS** so install prompts and service workers work.

### GitHub Pages (deploy branch)

**Prereqs**

- Repo **Settings → Pages**: source = your **`deploy`** branch (or whichever branch contains the built site), folder **`/ (root)`** if you publish the contents of `dist/` at the branch root.
- **Project site URL** is `https://<user>.github.io/<repo>/` — Vite must use base `/<repo>/`. **User site** (`<user>.github.io` repository) uses base `/`.

**Build for Pages**

- **Locally** (replace `music-studio` with your repository name):

  ```bash
  VITE_BASE_PATH=/music-studio/ npm run build:pages
  ```

  This runs `vite build` and copies `dist/index.html` → `dist/404.html` (helps with SPA fallbacks on GitHub Pages).

- **GitHub Actions**: `GITHUB_REPOSITORY` is set automatically — a plain `npm run build:pages` in CI picks up `/<repo>/` without `VITE_BASE_PATH`.

**Capacitor / local dev**

- `npm run dev` and `npm run build` (no env) use base **`/`** — correct for local preview and for **`npm run build:mobile`**. Do **not** leave `VITE_BASE_PATH` exported in your shell when building the Android app, or asset paths will be wrong for the WebView.

**Automatic deploy (Actions)**

- On every push to **`main`** (or **`master`**), [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) runs `npm run build:pages` (so `GITHUB_REPOSITORY` sets the right base) and pushes **`dist/`** to branch **`deploy`** with [peaceiris/actions-gh-pages](https://github.com/peaceiris/actions-gh-pages).
- In the repo: **Settings → Pages → Build and deployment → Branch** = **`deploy`**, folder **`/ (root)`**.
- First run: allow **Actions** permissions (**Settings → Actions → General → Workflow permissions**: read and write).

## Android (Capacitor)

1. `npm run build:mobile` — builds the Vite app and runs `cap sync` so `android/app/src/main/assets/public` matches `dist/`.
2. Open `android/` in Android Studio, then **Build → Build Bundle(s) / APK(s)** (or use Gradle) for a device or emulator.
3. For Play Store releases, configure signing, bump `versionCode` / `versionName` in `android/app/build.gradle`, and build an AAB.

Generated Android/iOS web assets are listed in `.gitignore` and are recreated by the steps above.

### First debug APK on a device (minimal checklist)

**Prerequisites**

- [Android Studio](https://developer.android.com/studio) installed (includes Android SDK; accept SDK licenses when prompted).
- A physical phone with **Developer options → USB debugging** enabled, *or* an **Android Virtual Device** (AVD) created in Android Studio (**Device Manager**).

**Steps**

1. Install JS dependencies and build the web app + sync into Android:

   ```bash
   npm install
   npm run build:mobile
   ```

2. Open the native project: **File → Open** → select the repo’s `android/` folder (not the repo root). Wait for Gradle sync to finish.

3. Pick a run target: your USB device (trust the computer if prompted) or an emulator from the device dropdown in the toolbar.

4. Click **Run** (green play) with configuration **app**. Android Studio builds a **debug** APK, installs it, and launches Music Studio.

**If you only need the APK file (e.g. to sideload)**

- **Build → Build APK(s)**. When it finishes, choose **locate** in the notification, or find:

  `android/app/build/outputs/apk/debug/app-debug.apk`

- Install on a device with: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk` (USB debugging on, `adb` on your `PATH`).

**After you change web code**

- Run `npm run build:mobile` again, then **Run** in Android Studio (or Build) so the embedded WebView picks up the new `dist/` assets.

**Play Store**

- Use a **release** build and an **AAB** (signed), not the debug APK above. Bump `versionCode` / `versionName` in `android/app/build.gradle` for each upload.

## Develop

- `npm run dev` — Vite dev server (port `5175`).
