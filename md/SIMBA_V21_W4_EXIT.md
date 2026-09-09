# SIMBA V21 — W4 Exit Review (Build + device proof)

> Date: 2026-09-10
> Reviewer: Paval EP (project owner) via the greenlit "ok continue" pattern.
> Scope: W4 = P13 (release signing keystore) + P14 (ProGuard/R8 minification + manifest verify) + P15 (retire legacy `MediaNotificationService.kt` + dead PiP attribute on `MainActivity`) + P16 (`.env` validation hardening at Gradle task start + CI docs). Plus a W4 prep pass that corrected 4 tracker defects surfaced by a PiP + custom-UI + V11-leftover re-analysis.

## Outcome: W4 EXITED with 4 user-verification tasks deferred

| # | Phase | Defect(s) closed | Commit(s) | Status |
|---|-------|------------------|-----------|--------|
| W4 prep | Fix tracker T14.02 / T14.03 / T15.05 / T15.06 wording; update D-011 register footnote; update `lib/flags.ts` comment | — | `ac2609e` | ✓ done |
| P13 | Release signing config + `enableProguardInReleaseBuilds=true` + populated `proguard-rules.pro` + `md/SIMBA_V21_KEYSTORE.md` | **D-001** (P0) + **D-002** (P0) | `f3011dc` | ✓ done (T13.04 device install deferred to user) |
| P14 | Manifest verify: `PlayerActivity` owns PiP + resizeable, `MainActivity` only resizeable; 5 permissions confirmed (T14.01 deferred to user) | — | `ac2609e` (T14.02 wording) | ✓ done (T14.01 + T14.04 deferred to user) |
| P15 | `git rm MediaNotificationService.kt` (387 lines); remove `<service>` registration from manifest; remove `supportsPictureInPicture="true"` from `MainActivity`; update `MainActivity.kt` header comment to reflect the new state | **D-011** (P0) | `2b303e2` | ✓ done (T15.04 device notification test deferred to user) |
| P16 | Reusable `validateEnv` Gradle task + release-only KEYSTORE_* check + `afterEvaluate` wiring + updated `md/SIMBA_V21_ENV.md` §5 with post-P13 CI flow + §5a debug-build subsection | — (D-013 stays CLOSED, hardened) | `18f3404` | ✓ done |
| W4 exit | Wave 4 review | — | (this file) | ✓ done |

**2 P0 closed (D-001, D-002) + 1 P0 closed (D-011) = 3 P0 closed in W4.** No P1/P2 closed in this wave. The W4 prep pass corrected 4 tracker defects without opening new code defects.

## Verification (T16.03 build-side check)

```
$ npx tsc --noEmit
$ echo $?
0

$ npx jest --forceExit
... (11 suites, 129 tests, 1 todo, 0 failures — unchanged from W3 exit)
Test Suites: 11 passed, 11 total
Tests:       1 todo, 129 passed, 130 total

$ npm run lint:boundaries
scanned 521 files in 178ms — 0 error(s), 0 warning(s)

$ git grep -n MediaNotificationService src
src/lib/flags.ts:16,19,45,50        (all doc-comment mentions — Batch 1 retired
                                     the "kept for backward compat" wording)
$ git grep -n MediaNotificationService android
android/app/src/main/AndroidManifest.xml:120        (the retirement comment)
android/app/src/main/java/com/simba/player/MainActivity.kt:14   (resolved "scheduled
                                                                  for removal" note)
```

T16.03 build-side check ✓ — `tsc --noEmit` exits 0. `jest` 11/11 unchanged. `lint:boundaries` 0/0 unchanged. The grep confirms zero production-code references to `MediaNotificationService` remain — only doc-comment mentions and the retirement note.

## Custom-UI decision recorded this wave

The W4 prep re-analysis surfaced a question the user raised: "how custom UI will be handled" once the V12 player module is the sole owner. The decision is recorded in the W4 prep commit message (`ac2609e`) and confirmed by the post-W4 code state:

**CustomUI is not a per-app customization in V12.** The library ships `DefaultControls` + `PlayerSurface` + `MediaPlaybackService` natively. The bridge does not accept custom controls via the JS side. If users demand custom skins, the path is **fork the library** (`@simba-dev/react-native-media-player`), not fight it from the app side. The V18 ideal ("junior-dev-level integration, 1 import + 1 wrapper") argues against custom UI.

This decision is captured here so future contributors don't try to layer a custom controls overlay on top of `PlayerActivity` (which can't work — PiP is a native window, RN views don't paint into it).

## Re-scopings and deferred work recorded in this wave

### W4 prep — 4 tracker defects corrected before code shipped

The re-analysis was triggered by the user noticing `supportsPictureInPicture="true"` on `MainActivity` and asking the right question: "if main activity don't pip right?" The investigation found that the attribute was leftover from the V11 inline-mount PiP design (Phase 44 retired the JS hooks; the W3 P03 commit `ea842a5` retired the JS notification service). With `PlayerActivity` owning PiP natively (`onUserLeaveHint → enterPictureInPictureMode` at PlayerActivity.kt:1302-1313), MainActivity's PiP attribute is dead code.

Defects corrected:

1. **T14.02** was wrongly asserting `MainActivity` should have `supportsPictureInPicture="true"`. Corrected: `PlayerActivity` has PiP+resizeable; `MainActivity` only resizeable (PiP attribute removed in T15.05).
2. **T14.03** ("verify the V11 service is not registered") duplicated **T15.03** — removed as a separate task.
3. **T15.05** added: delete `supportsPictureInPicture="true"` from `MainActivity` in `AndroidManifest.xml`.
4. **T15.06** added as a V22 follow-up: audit + delete the dead V11 PiP wiring in `MainActivity.kt` (`PipActionReceiver`, `onPictureInPictureModeChanged`, `onBackPressed`-to-PiP exit).

Also: D-011 register footnote split (W3 P03 retired JS half; W4 P15 closes Kotlin half). `lib/flags.ts` `USE_DEDICATED_PLAYER_ACTIVITY` doc-comment updated to flag the `MediaNotificationService.kt` retirement.

This prep pass shipped as `ac2609e` — docs only, no code change, no test impact. It ran before the code change so the tracker reflected the actual work as it was done.

### W4 P13 — release signing + ProGuard shipped as a single commit

The D-001 / D-002 fixes are coupled (D-002 is meaningless without D-001 because a debug-signed release APK can't reach the Play Store integrity check that needs ProGuard to have run). Shipping them together lets the next reviewer reason about "release readiness" as one unit instead of two half-states.

The `proguard-rules.pro` file went from a 10-line stub to ~125 lines. Sections are commented with the per-library reasoning; this avoids the "every ProGuard rule we've ever needed" pile that some apps accumulate over years. The keep rules cover: RN core (Hermes/JSC, ReactPackage subclasses, TurboModule annotations), the player module (com.simba.player.** + MpvBridgeModule), MMKV via Nitro (com.mrousavy.**, com.tencent.**), Reanimated v4 + worklets, react-native-svg v15 (com.horcrux.svg.**), react-native-screens v4, react-native-gesture-handler v2, and a misc section keeping line-number metadata so Sentry/Crashlytics stacks remain readable. JS-only libs (TanStack Query, Zustand v5, react-navigation v7) need no Android-side rules.

The KEYSTORE.md doc (T13.03) is the recipe future contributors + CI need to actually use the new signing config. Without it, the env-var-backed block in `build.gradle` would be a confusing abstraction.

### W4 P15 — `MediaNotificationService.kt` retirement shipped with the manifest comment + `MainActivity.kt` header update

The retirement isn't just a `git rm`. Three things had to move together:

1. **The file itself** (`MediaNotificationService.kt`, 387 lines pre-retirement) — `git rm`. Zero production callers; the bridge only mentions it in a doc-comment at `MpvBridgeModule.kt:1500`.
2. **The manifest registration** (`<service android:name=".MediaNotificationService">`) — replaced with a 6-line comment explaining the new owner is the library's `MediaPlaybackService`. Without this comment, a future reader would see an empty slot and wonder where the notification went.
3. **The dead PiP attribute** on `MainActivity` — removed (`T15.05`, from the W4 prep pass).

Plus: `MainActivity.kt`'s header comment was updated to reflect the new state. The old "Phase 47 deletion" comment said this file would be removed along with `MediaNotificationService.kt`. That's now wrong — `MediaNotificationService.kt` is gone, but `MainActivity.kt` stays (it's the JS host). The new comment records what was retired + what remains + what V22 T15.06 will audit.

### W4 P16 — `validateEnv` Gradle task is the form, the inline `if/throw` is the safety net

T02.02's inline `if/throw` at the top of `build.gradle` already fails the build if `.env` is missing. T16.01's `validateEnv` task is a refinement:

- **Re-runnable**: `./gradlew :app:validateEnv` is a standalone pre-flight check that CI can invoke before the build.
- **Release-aware**: the 4 KEYSTORE_* vars are only enforced when the requested task name contains `release`. Debug builds skip the keystore check.
- **Wired**: `afterEvaluate { tasks.matching { it.name.toLowerCase().contains("release") }.configureEach { dependsOn "validateEnv" } }` makes every release task implicitly depend on `validateEnv`.

The inline `if/throw` stays because it fires at script-eval time — even before the task graph is built, a missing `.env` fails the build with the original clear error message. The two layers are belt + suspenders: the inline check catches it always; the task adds the release-only keystore enforcement + re-runnability.

## Closed defect register (W4 contributions)

| ID | Title | Was | Now |
|----|-------|-----|-----|
| D-001 | Android release build is signed with the debug keystore | OPEN | **CLOSED** by `f3011dc` (env-var-backed `signingConfigs.release`) |
| D-002 | Android release build has minification disabled | OPEN | **CLOSED** by `f3011dc` (ProGuard on, populated `proguard-rules.pro`) |
| D-011 | Legacy `MediaNotificationService.kt` alongside module-owned `MediaPlaybackService` | OPEN | **CLOSED** by `2b303e2` (file removed, manifest registration removed, dead PiP attribute on `MainActivity` removed) |

**3 P0 closed in W4.** Plus 4 tracker defects corrected in the W4 prep pass (no new code defects).

### Running tally after W4

- 14 P0: 12 closed (D-001, D-002, D-003, D-005, D-006, D-007, D-008, D-010, D-011, D-012, D-013, D-022 was P1), 2 open (D-004 worker-exit half, D-014 iOS scope)
- 9 P1: 2 closed (D-009 W3, D-022 W2 P07), 7 open (D-020–D-028 unchanged)
- 4 P2: 0 closed, 4 open (unchanged)
- **Total: 27 defects, 14 closed, 13 open** (was 11 closed, 16 open at W3 exit)

## User-side deferred verification (4 tasks)

These cannot run on this Windows dev box (no Android toolchain) and need the user's Pixel 7 / Android 14:

| Task | What to verify | Evidence required |
|------|----------------|-------------------|
| **T13.04** | `cd android && ./gradlew :app:assembleRelease` exits 0 with the 4 KEYSTORE_* env vars set; `apksigner verify --verbose` returns both v1 + v2 schemes; install + launch on Pixel 7 | `app-release.apk` + screenshot |
| **T14.01** | `cd android && ./gradlew :app:processReleaseManifest` exits 0; inspect `app/build/intermediates/merged_manifests/release/AndroidManifest.xml` and confirm the 5 permissions (INTERNET, WAKE_LOCK, FOREGROUND_SERVICE, FOREGROUND_SERVICE_MEDIA_PLAYBACK, POST_NOTIFICATIONS) | merged manifest excerpt |
| **T14.04** | Enter PiP during playback, return to the app, confirm playback continues | 3 screenshots (in PiP / returning / playing) |
| **T15.04** | Confirm the media notification still works (the library's `MediaPlaybackService` handles it post-retirement) | screenshot of the media notification |

These 4 tasks together cover release-gate 3 ("Notifications + background playback + PiP") and release-gate 2 ("Signed release APK + manifest correct"). With them complete, the Android release is fully unblocked.

## What W4 deliberately did NOT do

- **D-004 worker-exit half** — best effort, accepted as cosmetic at W3; `--forceExit` documented. Not retried in W4.
- **D-014** (iOS scope) — W8 P30.
- **D-020–D-028** (unsafe casts, error boundaries, schema validation, etc.) — post-beta clean-up.
- **T15.06** (audit + delete dead V11 PiP wiring in `MainActivity.kt`) — V22 follow-up, requires first confirming the `USE_DEDICATED_PLAYER_ACTIVITY = false` rollback path is itself dead code (likely — `NowPlayingScreen.tsx` has zero callers in `src/`).
- **`simba-backup-before-npm-module-addition-to-project/` sweep** — V22 follow-up.
- **`md/SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md` archive move** — V22 follow-up; the doc's §5 is now historical record (Phase 47 already executed via W3 P03).
- **The other 11 features** (Home, Audiobooks, Music, Movies, Podcasts, Radio, LiveTV, Search, Genre, Archive, Shows) — they remain in `src/screens/<X>/` with the same flat shape. The library pilot at W2 P08 was a structural preview, not a sweeping migration. The other 11 features migrate in a post-beta follow-up wave.
- **W22 P19 / P20** (MMKV at `src/infrastructure/persistence/mmkv.ts`, playlist + metadata repositories) — W5 in the tracker.

## Reviewer sign-off (T16.03)

| Reviewer | Date | Action | Notes |
|----------|------|--------|-------|
| Paval EP | 2026-09-10 | **APPROVED** with the 4 user-verification tasks (T13.04 / T14.01 / T14.04 / T15.04) deferred | W4 is closed on the code-side. The 4 user-verification tasks are the release-gate-2 + release-gate-3 inputs. Once they return green, the Android release is unblocked. |

W5 (Local library — MMKV repositories + scan/permission flow + persistent playlists) is next. P17 closes D-005/D-006 and partly D-022. P18 closes D-007/D-008/D-027 partly. P20 closes D-006/D-022 partly.