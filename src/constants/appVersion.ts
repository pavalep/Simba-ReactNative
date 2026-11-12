// ─── The app's version — ONE owner ─────────────────────────────────
//
// The About page shows the app's version. There is exactly ONE place
// that knows it: this file.
//
// WHY IT IS NOT READ AT RUNTIME
// ─────────────────────────────
//
// `package.json` says `0.0.1` — the npm placeholder React Native's
// template ships, never touched — so reading it would show the user a
// number no build ever carries. The native build is the truth:
//
//   android/app/build.gradle → versionName "1.1.0", versionCode 2
//
// There is no native module in this app that exposes `BuildConfig`, and
// adding one (`react-native-device-info` or a bespoke TurboModule) means
// a new native dependency and a rebuild for a string that changes once
// per release. So the version is a constant here, and
// `__tests__/app/appVersion.test.ts` reads `android/app/build.gradle`
// (and the iOS project, and the Changelog) and fails if the constant
// drifts away from them. The guard is what makes the constant honest.
//
// The Changelog screen's newest entry is the same fact stated a third
// time, so the test checks it too.
//
// 2026-11-12: the About page hard-coded "Version 1.0.0" while the app
// shipped 1.1.0 (2). See `md/ABOUT_PAGE_FIX.md`.

/** The app's version name — `android/app/build.gradle`'s `versionName`. */
export const APP_VERSION_NAME = '1.1.0';

/** The app's build number — `android/app/build.gradle`'s `versionCode`. */
export const APP_BUILD_NUMBER = 2;

/**
 * The line the About page shows under the tagline.
 *
 * `Version 1.1.0 (2)` — the version name and the build number, because
 * the build number is what a tester or a user reporting a bug needs.
 */
export const APP_VERSION_LABEL = `Version ${APP_VERSION_NAME} (${APP_BUILD_NUMBER})`;
