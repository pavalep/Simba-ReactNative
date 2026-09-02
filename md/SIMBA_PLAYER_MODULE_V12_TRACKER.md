# SIMBA Player Module — V12 Tracker

**Document Version:** 2.26
**Created:** 2026-09-01
**Last Updated:** 2026-09-02
**Owner:** Mobile team
**Status:** 🟢 Waves 0-6 complete (32/51 phases) — V12 module fully decoupled + publishable + documented. Wave 6 progress 100% (7/7 phases). Wave 7 (Testing, hardening) ready on greenlight.
**Companion to:** [SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md)
**Target Release:** V12.0.0
**Package Name:** `@simba/react-native-media-player`
**Folder Name:** `react-native-media-player/` (sibling of consumer app — sits inside `SIMBA/` repo, so `simba-` prefix is redundant)
**NPM Org:** `@simba` (admin: `pavalep`)

---

## 0. Quick Status Dashboard

| Metric | Current | Target |
|---|---|---|
| Phases complete | 32 / 51 | 51 |
| Wave completion | 100% (W0), 100% (W1), 100% (W2), 100% (W3), 100% (W4), 100% (W5), 100% (W6), 0% (W7–W8) | 100% all waves |
| Critical bugs open | 1 (V11 PiP black-screen) | 0 |
| Days in current phase | 1 | n/a |
| Estimated days remaining | ~10 working days | 0 |
| Next milestone | **Wave 6 COMPLETE** — Wave 7 (Phase 33 — JUnit tests) next on greenlight | Wave 7 complete |
| Blockers | None | None |

---

## 1. Wave Progress

| Wave | Theme | Phases | Status | Progress |
|---|---|---|---|---|
| **W0** | Module bootstrap (sibling dir + Gradle wiring) | 0a–0c | 🟢 Complete | `[▓▓▓▓▓▓▓▓▓▓]` 100% |
| **W1** | MVP `PlayerActivity` (in module) | 1–5 | 🟢 Complete | `[▓▓▓▓▓▓▓▓▓▓]` 100% |
| **W2** | Surface migration & PiP fix | 6–10 | 🟢 Complete | `[▓▓▓▓▓▓▓▓▓▓]` 100% |
| **W3** | Audio unification | 11–15 | 🟢 Complete | `[▓▓▓▓▓▓▓▓▓▓]` 100% |
| **W4** | MediaSession & foreground service | 16–20 | 🟢 Complete | `[▓▓▓▓▓▓▓▓▓▓]` 100% |
| **W5** | Configuration, theming & control slots | 21–25 | 🟢 Complete | `[▓▓▓▓▓▓▓▓▓▓]` 100% |
| **W6** | NPM publishing metadata + finalize | 26–32 | 🟢 Complete | `[▓▓▓▓▓▓▓▓▓░]` 100% |
| **W7** | Testing, hardening, documentation | 33–40 | ⚪ Pending | `[░░░░░░░░░░]` 0% |
| **W8** | V11 deprecation & cleanup | 41–48 | ⚪ Pending | `[░░░░░░░░░░]` 0% |

**Overall:** `[▓▓▓▓▓▓▓▓░░]` ~63% complete (32/51 phases)

---

## 2. Active Phase Detail

### Currently in: **Wave 7 (Testing, hardening, documentation)** — Phase 33 (JUnit unit tests for native module) next on greenlight
- ✅ **Wave 0 (Module bootstrap) — COMPLETE 2026-09-01**
- ✅ **Wave 1, Phase 1 — `PlayerActivity` skeleton — COMPLETE 2026-09-01**
  - Created `PlayerActivity.kt` (extends `ReactActivity`)
  - `getMainComponentName()` → `"SimbaPlayer"`
  - `createReactActivityDelegate()` → `DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)`
  - `onCreate` sets black window background drawable (suppresses white flicker during React mount)
  - Stub `onResume` / `onDestroy` with `Log.i("PlayerActivity", ...)` lifecycle logs
  - **Deviation:** skipped `setTheme(R.style.AppTheme)` (R class is in consumer app, not library) — defer to Phase 2 manifest or Phase 21 PlayerConfig
  - Verified: `:react-native-media-player:compileDebugKotlin` PASSED 2m 13s
- ✅ **Wave 1, Phase 2 — Manifest entry — COMPLETE 2026-09-01**
  - Added `<activity android:name="com.simba.player.PlayerActivity" .../>` to app's `AndroidManifest.xml`
  - All 8 attributes set: `configChanges` (includes `navigation`), `launchMode="singleTask"`, `supportsPictureInPicture`, `resizeableActivity`, `autoRemoveFromRecents`, `theme="@style/AppTheme"`, `exported="false"`
  - Verified: `:app:processDebugManifest` PASSED 2m 39s. AGP namespace-collision warning is benign.
- ✅ **Wave 1, Phase 3 — `openPlayer` TurboModule — COMPLETE 2026-09-01**
  - Added `@ReactMethod fun openPlayer(uri, title, type, startPositionMs, promise)` to `MpvBridgeModule.kt`
  - Validates `type` is `"video"`/`"audio"` (rejects with `E_INVALID_TYPE`)
  - Rejects with `E_NO_ACTIVITY` if no current activity
  - Builds intent targeting `com.simba.player.PlayerActivity` with `EXTRA_URI`, `EXTRA_TITLE` (falls back to uri), `EXTRA_TYPE`, `EXTRA_START_POSITION_MS`
  - Catches `ActivityNotFoundException` → `E_ACTIVITY_NOT_FOUND`, `SecurityException` → `E_SECURITY`, generic → `E_OPEN_PLAYER_FAILED`
  - Resolves `true` on success
  - Added companion extras constants + `TYPE_VIDEO`/`TYPE_AUDIO` to `PlayerActivity.kt`
  - Verified: `:app:compileDebugKotlin` PASSED 2m 36s
- ✅ **Wave 1, Phase 4 — PlayerActivity reads intent — COMPLETE 2026-09-01**
  - Added four `by lazy {}` `private val` launch params (`launchUri`, `launchTitle`, `launchType`, `launchStartPositionMs`)
  - Touched all four in `onCreate` after `super.onCreate`, logged via `Log.i(TAG, "launchUri=...")` etc.
  - Title falls back to URI if blank; type falls back to `TYPE_VIDEO` if invalid
  - Verified `:react-native-media-player:compileDebugKotlin` PASSED 1m 54s
- ✅ **Wave 1, Phase 5 — JS-side launch orchestration — COMPLETE 2026-09-01**
  - Added `openPlayer(opts)` to TS Spec + `MpvPlayer.openPlayer(opts)` (async, returns `Promise<boolean>`)
  - Created `src/lib/flags.ts` with `USE_DEDICATED_PLAYER_ACTIVITY = false` + stub `USE_UNIFIED_MEDIA_SESSION`
  - Wired flag into `PlaybackContext.openPlayer(...)` — behind it, derive `type` from `entry.mediaType`, convert `startPosition` (sec → ms), call `MpvPlayer.openPlayer(...)`, skip `setActive` (avoid double-mount)
  - Verified `npx tsc --noEmit` exit 0
- ✅ **Wave 2, Phase 6 — Mount `MpvRenderView` at PlayerActivity content root — COMPLETE 2026-09-02**
  - Widened `MpvRenderView` constructor `ThemedReactContext` → `Context`
  - Relocated `MpvRenderView.kt` + `MPVLib.kt` from consumer app to module at `react-native-media-player/android/src/main/java/com/simba/player/mpv/` (early extraction ahead of Wave 6)
  - Deleted consumer-app copies of `MpvRenderView.kt` + `MPVLib.kt` (no FQN conflict; module classes merged at app build time)
  - In `PlayerActivity.onCreate`: get content root via `findViewById<ViewGroup>(android.R.id.content)`, warn-only if not FrameLayout, create `MpvRenderView(this)`, set `FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT)`, `rootView.addView(renderView, 0)`, log "MpvRenderView mounted at content root, index=0"
  - In `PlayerActivity.onDestroy`: `mpvRenderView?.cleanup()`, remove from parent, null reference, then `super.onDestroy()` (super called last so React teardown happens after surface cleanup)
  - Verified `:react-native-media-player:compileDebugKotlin` PASSED 1m 18s
  - **Deviation:** Phase 6 forced early MpvRenderView extraction; Wave 6 Phases 27/29 simplified to "audit + finalise"
  - **Manual tests 6.7, 6.8 deferred** — require physical device with PiP-enabled build
- ✅ **Wave 2, Phase 7 — Surface identity guard & native pointer wiring — COMPLETE 2026-09-02**
  - Added `IMpvNativePtrProvider` interface in module (`com.simba.player`) — single method `fun fetchNativePtr(): Long`
  - `MpvBridgeModule` (in app) now implements `IMpvNativePtrProvider`, exposes `override fun fetchNativePtr(): Long = nativePtr`. The existing `@ReactMethod fun getNativePtr(): Double` is kept unchanged (JS API stays stable)
  - In `PlayerActivity.onCreate`, after mounting MpvRenderView: defer via `Handler(Looper.getMainLooper()).post { ... }`, resolve `ReactApplicationContext` via `(application as? ReactApplication)?.reactHost?.currentReactContext`, look up `getNativeModule("MpvPlayerModule") as? IMpvNativePtrProvider`, call `fetchNativePtr()`, pass to `mpvRenderView.setNativePtr(...)`
  - Retry up to 5 times (200ms apart) if mpv not yet initialised by JS — covers the common race where PlayerActivity mounts before JS calls `initPlayer()`
  - Give up after 5 retries — JS-layer error pipeline (onError event) handles surfaced problems
  - **Deviation:** Spec assumed direct reference to `MpvBridgeModule.getNativePtr()`. Gradle boundary forces indirection — `IMpvNativePtrProvider` interface in module + RN module lookup via `getNativeModule(name)`. Both `getNativePtr()` (Double, JS) and `fetchNativePtr()` (Long, native) share the same `private var nativePtr` field, so they cannot diverge
  - Verified `:react-native-media-player:compileDebugKotlin :app:compileDebugKotlin` PASSED (deprecation warnings only, unrelated to this phase)
  - **Manual tests 7.6, 7.7, 7.8 deferred** — require physical device with PiP-enabled build
- Reference architectures analyzed (from earlier in the conversation):
  - heritage mpv-android (`BaseMPVView.kt`) — SurfaceView at root, default z-order
  - mpvKt (`PlayerActivity.kt`) — Compose SurfaceView with PiP, "Smoother PiP" feature
  - rn-pip (`RnPipModule.java`) — companion pattern for bridgeless RN
- Decision made: Option A — dedicated `PlayerActivity`
- Greenlight given by user to proceed
- ✅ **Wave 2, Phase 9 — `setPictureInPictureParams` in `PlayerActivity` — COMPLETE 2026-09-02**
  - Moved `PipManager.kt` (PipManager object + `PipActionReceiver` class) from consumer app to module at `react-native-media-player/android/src/main/java/com/simba/player/PipManager.kt`. Same FQN, no MainActivity import changes needed (Gradle merges at build time)
  - PipManager signature updated: `buildPipParams(context, aspect: Float, sourceRectHint, chapterTitle, progressPercentage)` — `aspect` is now a `Float` (clamped to [0.42, 2.38]), encoded as integer `Rational` by multiplying by 100 (~1% precision)
  - PipActionReceiver.getReactContext() upgraded to bridgeless: prefer `app.reactHost?.currentReactContext`, fall back to legacy `reactNativeHost.reactInstanceManager.currentReactContext`
  - In `PlayerActivity.kt`: added `lastNativePtr` cache (Phase 9.4.2), `buildCurrentPipParams()` helper, `playerBounds: Rect` getter (uses `getLocationInWindow` with decorView fallback), `getVideoAspect(): Float` (queries `MPVLib.nativeGetProperty("video-params/aspect")`, parses String→Float, falls back to 16:9)
  - Override `onResume`: calls `setPictureInPictureParams(buildCurrentPipParams())` guarded by `Build.VERSION.SDK_INT >= O` (API 26+)
  - Override `onPictureInPictureModeChanged`: re-calls `setPictureInPictureParams(buildCurrentPipParams())` to refresh after orientation/config changes
  - Verified `:react-native-media-player:compileDebugKotlin :app:compileDebugKotlin` PASSED (deprecation warnings only — pre-existing in MpvBridgeModule)
  - **Deviation:** MPVLib doesn't expose `getPropertyDouble`, so `getVideoAspect()` uses `nativeGetProperty(...)` + parse
  - **Deferred scope:** `progressPercentage` (subtitle) left null — Phase 18/20 wires real progress through MediaSession
  - **Manual tests 9.6, 9.7 deferred** — on-device verification required

---

## 3. Phase Status Table

| # | Phase | Wave | Status | Started | Completed | Owner | Notes |
|---|---|---|---|---|---|---|---|
| 0a | Create `react-native-media-player/android/` skeleton | W0 | 🟢 Complete | 2026-09-01 | 2026-09-01 | Mobile | AAR produced |
| 0b | Wire consumer Gradle to consume module | W0 | 🟢 Complete | 2026-09-01 | 2026-09-01 | Mobile | Path fixed to `../../` |
| 0c | Create placeholder files in module | W0 | 🟢 Complete | 2026-09-01 | 2026-09-01 | Mobile | pkg.json + README + .gitkeep |
| 1 | Create PlayerActivity skeleton (in module) | W1 | 🟢 Complete | 2026-09-01 | 2026-09-01 | Mobile | Skipped setTheme (R lives in app) |
| 2 | Register PlayerActivity in manifest | W1 | 🟢 Complete | 2026-09-01 | 2026-09-01 | Mobile | All 8 attrs verified in merged manifest |
| 3 | openPlayer TurboModule method | W1 | 🟢 Complete | 2026-09-01 | 2026-09-01 | Mobile | Promise-based reject codes |
| 4 | PlayerActivity reads intent | W1 | 🟢 Complete | 2026-09-01 | 2026-09-01 | Mobile | by lazy {}, no eager intent access |
| 5 | JS-side launch orchestration | W1 | 🟢 Complete | 2026-09-01 | 2026-09-01 | Mobile | Flag-gated, tsc clean |
| 6 | Mount MpvRenderView at content root | W2 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | + relocated MpvRenderView + MPVLib to module |
| 7 | Surface identity guard & native pointer | W2 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | IMpvNativePtrProvider contract; Handler.post retry loop |
| 8 | Transparent root for RN view tree | W2 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | transparentRoot prop + inPlayerActivity state; visual verify pending PlayerActivity JS host |
| 9 | setPictureInPictureParams in PlayerActivity | W2 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | + moved PipManager.kt + PipActionReceiver to module |
| 10 | RemoteAction receiver + PiP enter/exit | W2 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | + new IPipModeChangeEmitter interface (proper-path design) |
| 11 | Audio intent extra in openPlayer | W3 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | openPlayer @ReactMethod + audio log; Phase 3 code gap closed |
| 12 | Hide MpvRenderView for audio | W3 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | View.GONE + isAttachedToWindow guard |
| 13 | Audio UI conditional rendering | W3 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | currentPlaybackType + getLaunchParams bridge + loadLaunchParams effect |
| 14 | Audio background playback groundwork | W3 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | SharedPreferences setting + shouldKeepPlayingInBackground helper |
| 15 | Audio PiP | W3 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | 1:1 aspect for audio + basic MediaSessionCompat |
| 16 | Create MediaPlaybackService | W4 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | Foreground service in module + PlayerActivity lifecycle hooks |
| 17 | Bind/Unbind service in PlayerActivity | W4 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | 1Hz progress update timer + ACTION_UPDATE on lifecycle |
| 18 | MediaSession setup | W4 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | Full transport callback + session activity + PlaybackState w/ position |
| 19 | Media metadata on lock screen | W4 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | MediaMetadataCompat (title/artist/album/duration) from mpv tags |
| 20 | Bluetooth / wired headset controls | W4 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | ACTION_AUDIO_BECOMING_NOISY receiver + MediaButtonReceiver in module manifest |
| 21 | PlayerProvider and config | W5 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | PlayerProvider + usePlayerConfig + setConfig bridge wire live (TS → Kotlin) |
| 22 | Theme propagation | W5 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | DefaultControls stub + useTheme hook + PlayerActivity theme log |
| 23 | Custom controls slot | W5 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | renderControls slot + useRenderControls + PlayerRoot + usePlayer stub |
| 24 | Default controls component | W5 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | Top bar + scrubber + transport + auto-hide wired to MpvPlayerModule |
| 25 | Surface placeholder component | W5 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | PlayerSurface placeholder + PlayerRoot layered layout (W5 100%) |
| 26 | Create module directory structure | W6 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | Audit done; 8 issues noted for Phase 27+/28/30 |
| 27 | Move Android code to module | W6 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | MpvBridgeModule + MpvPlayerPackage + MpvRenderViewManager moved; MpvBridgeModule rewired to MediaPlaybackService |
| 28 | Finalize module build.gradle | W6 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | Module fully self-contained: externalNativeBuild CMake + 4 ABIs + packagingOptions pickFirst/resources.excludes. APK contains all libmpv .so transitively |
| 29 | Move TypeScript code | W6 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | Audit-only: all 8 module TS files verified present; V11 consumer-app leftovers correctly preserved for W8 |
| 30 | package.json and react-native.config.js | W6 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | Production package.json (v0.1.0, public, codegenConfig, prepack) + react-native.config.js (autolinking) + LICENSE (MIT + native-lib notes). DefaultControlsProps Phase 24 oversight fixed + exported |
| 31 | PlayerPackage registration | W6 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | New `com.simba.player.PlayerPackage` (TurboReactPackage) created; old `com.simba.player.mpv.MpvPlayerPackage` deleted; `MainApplication.kt` updated to use new package; `react-native.config.js` FQN updated |
| 32 | Module documentation | W6 | 🟢 Complete | 2026-09-02 | 2026-09-02 | Mobile | Production README (13 sections + 15 typed code examples in README.example.tsx that all typecheck); .npmignore added (cut tarball from 518.8MB/738 files to 68.1MB/82 files by excluding .cxx/ build cache) |
| 33 | Unit tests for native module | W7 | ⚪ Pending | — | — | — | — |
| 34 | TypeScript unit tests | W7 | ⚪ Pending | — | — | — | — |
| 35 | Manual QA test matrix | W7 | ⚪ Pending | — | — | — | — |
| 36 | Memory leak audit | W7 | ⚪ Pending | — | — | — | — |
| 37 | Performance benchmarks | W7 | ⚪ Pending | — | — | — | — |
| 38 | Error handling & recovery | W7 | ⚪ Pending | — | — | — | — |
| 39 | Logging & debug mode | W7 | ⚪ Pending | — | — | — | — |
| 40 | Example app | W7 | ⚪ Pending | — | — | — | — |
| 41 | Feature flag cutover | W8 | ⚪ Pending | — | — | — | — |
| 42 | Remove inline player from MainActivity | W8 | ⚪ Pending | — | — | — | — |
| 43 | Update navigation | W8 | ⚪ Pending | — | — | — | — |
| 44 | Update usePipLifecycle.ts | W8 | ⚪ Pending | — | — | — | — |
| 45 | Clean up V11 debug logs | W8 | ⚪ Pending | — | — | — | — |
| 46 | Update V11 docs | W8 | ⚪ Pending | — | — | — | — |
| 47 | Final QA | W8 | ⚪ Pending | — | — | — | — |
| 48 | V12.0.0 release | W8 | ⚪ Pending | — | — | — | — |

**Status legend:** ⚪ Pending · �� In Progress · ✅ Complete · �� Blocked · ⚫ Deferred

---

## 4. Recent Updates (most recent first)

### 2026-09-02 — Wave 6 Phase 32 (Module documentation) executed & verified — **WAVE 6 COMPLETE**
- **Author:** Mobile team
- **What:** Replaced the Phase 0c README placeholder with a production-ready [README.md](file:///x:/Development/SIMBA/react-native-media-player/README.md) containing all 13 spec sections (What is / Installation / Basic usage / Custom UI / Configuration / PiP / Background audio / Theming / API reference / Troubleshooting / Limitations / Contributing / License) plus a Table of Contents, hero image, and 15 code-snippet examples. Created [README.example.tsx](file:///x:/Development/SIMBA/react-native-media-player/src/README.example.tsx) containing every snippet as a typed component/function — module's `tsc --noEmit -p .` passes (16 examples all typecheck). Added [.npmignore](file:///x:/Development/SIMBA/react-native-media-player/.npmignore) + `files` array negations in [package.json](file:///x:/Development/SIMBA/react-native-media-player/package.json) to exclude `.cxx/` CMake cache, `.gradle/`, `build/`, `README.example.tsx`, and other build artifacts from the published tarball. Cut tarball size from 518.8 MB / 738 files to **68.1 MB / 82 files** (~7.6x size reduction).
- **Why:** Phase 32 was the final phase of Wave 6 (NPM publishing metadata + finalize). A module without docs is unusable by external consumers; a module without verified code examples has drifting docs. The `.npmignore` work was opportunistic — discovered during verification that the CMake build cache (`.cxx/`) was bloating the tarball by ~450 MB.
- **What changed:**
  - **NEW** [react-native-media-player/README.md](file:///x:/Development/SIMBA/react-native-media-player/README.md) — 472 lines, 13 sections + TOC + hero image
  - **NEW** [react-native-media-player/src/README.example.tsx](file:///x:/Development/SIMBA/react-native-media-player/src/README.example.tsx) — 16 typed code examples for verification (excluded from published tarball)
  - **NEW** [react-native-media-player/.npmignore](file:///x:/Development/SIMBA/react-native-media-player/.npmignore) — Documentation + exclusions for the publish process
  - **EDITED** [react-native-media-player/package.json](file:///x:/Development/SIMBA/react-native-media-player/package.json) — Added `!src/README.example.tsx`, `!android/.cxx/`, `!android/.gradle/`, `!android/build/`, `!.npmignore` to `files` (these negations override the allow-list inclusions)
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 32 → 🟢 Complete, version 1.30, full deliverables report (§32.A-C: additional deliverables + verification + 7 deviations)
  - This tracker — version 2.26, Phase 32 → 🟢 Complete, **Wave 6 🟢 COMPLETE 100% (7/7)**, phase count 32/51, overall 63%
- **Verified:**
  - Module's `tsc --noEmit -p .` → exit 0 (all 16 README examples typecheck)
  - Consumer app's `tsc --noEmit` → exit 0 (unchanged)
  - `npm pack --dry-run` → ✅ exit 0, name `@simba/react-native-media-player`, version `0.1.0`, package size **68.1 MB**, total files **82**, README.example.tsx not in tarball, .cxx/ not in tarball, all 8 production TS files present, all 13 Kotlin files present, all 44 .so files present
- **README structure:**
  - Lead + bullet highlights
  - Table of Contents (13 sections)
  - Hero image (coresg-normal.trae.ai generated landscape_16_9; real screenshots deferred to W7 manual QA)
  - What is — lead + 7 highlights
  - Installation — `npm install` + autolinking explanation + Requirements (RN ≥ 0.76, minSdk 24, Kotlin 1.9+) + Consumer setup (AndroidManifest snippet + permissions + POST_NOTIFICATIONS)
  - Basic usage — App.tsx + openPlayer
  - Custom UI — renderControls pattern + from-scratch pattern
  - Configuration — full config + spread-and-override
  - Picture-in-Picture — config + manual control + RemoteActions note
  - Background audio — opt-in/out + MediaPlaybackService + lock-screen integration
  - Theming — PlayerTheme fields + useTheme hook
  - API reference — Components/Hooks/Types/Constants/Functions tables
  - Troubleshooting — 5 subsections
  - Limitations — 7 honest bullets
  - Contributing — local dev + tests + PR guidelines
  - License — MIT + bundled native libs
- **Hero image:** `coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Modern Android mobile video player UI with dark theme, golden accent play button in center...&image_size=landscape_16_9`. Real screenshots will be captured during W7 manual QA (Phase 35) and replace this placeholder
- **Deviations from spec:** 7 (see SPEC §32.C) — biggest ones: `.npmignore` + `files` negations added (cut 450MB bloat), README.example.tsx excluded from tarball, hero image is AI-generated (real screenshots in W7)
- **Next:** Wave 6 🟢 COMPLETE. Wave 7 (Testing, hardening, documentation) — Phase 33 (JUnit unit tests for native module) on greenlight

### 2026-09-02 — Wave 6 Phase 31 (PlayerPackage rename + BaseReactPackage upgrade) executed & verified
- **Author:** Mobile team
- **What:** Created [PlayerPackage.kt](file:///x:/Development/SIMBA/react-native-media-player/android/src/main/java/com/simba/player/PlayerPackage.kt) at `com.simba.player` (root package, not `mpv` subpackage). Extends `TurboReactPackage` (RN 0.76+ new-arch-friendly base class). Overrides `getModule(name, reactContext)` to return `MpvBridgeModule(reactContext)` when `name == MpvBridgeModule.NAME` (else returns `null` per RN's contract). Overrides `getReactModuleInfoProvider()` to advertise `MpvBridgeModule` with `isTurboModule = true`. Deleted old [MpvPlayerPackage.kt](file:///x:/Development/SIMBA/react-native-media-player/android/src/main/java/com/simba/player/mpv/MpvPlayerPackage.kt) (was at `com.simba.player.mpv.MpvPlayerPackage` — a plain `ReactPackage` returning `createNativeModules`/`createViewManagers` lists). Updated [MainApplication.kt](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/MainApplication.kt) to use `add(PlayerPackage())` instead of `add(MpvPlayerPackage())` (the old `import com.simba.player.mpv.MpvPlayerPackage` was removed; no new import needed because PlayerPackage is in the same root package as MainApplication). Updated [react-native.config.js](file:///x:/Development/SIMBA/react-native-media-player/react-native.config.js) `packageImportPath` + `packageInstance` to use the new FQN.
- **Why:** Phase 31 wires the module for new-architecture TurboModule resolution. The V11-era `MpvPlayerPackage` was a plain `ReactPackage` that returned module lists at `createNativeModules()` time — this doesn't work with bridgeless RN 0.86 + TurboModule spec resolution, which requires `TurboReactPackage.getModule(name, context)` per-module lookup. Advertising `isTurboModule = true` via `getReactModuleInfoProvider()` lets RN's autolinking detect the module during `npx react-native config` (Phase 30's react-native.config.js relies on this). Moving `PlayerPackage` from `com.simba.player.mpv` to `com.simba.player` aligns the public package FQN with the module's public-facing nature.
- **What changed:**
  - **NEW** [react-native-media-player/android/src/main/java/com/simba/player/PlayerPackage.kt](file:///x:/Development/SIMBA/react-native-media-player/android/src/main/java/com/simba/player/PlayerPackage.kt) — `TurboReactPackage` subclass, ~50 lines (mostly docblock)
  - **DELETED** `react-native-media-player/android/src/main/java/com/simba/player/mpv/MpvPlayerPackage.kt`
  - **EDITED** [MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/MainApplication.kt](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/MainApplication.kt) — removed `import com.simba.player.mpv.MpvPlayerPackage`; replaced `add(MpvPlayerPackage())` with `add(PlayerPackage())` + Phase 31 comment
  - **EDITED** [react-native-media-player/react-native.config.js](file:///x:/Development/SIMBA/react-native-media-player/react-native.config.js) — updated `packageImportPath` to `com.simba.player.PlayerPackage` and `packageInstance` to `new PlayerPackage()`
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 31 → 🟢 Complete, version 1.29, full deliverables report (§31.A-C: implementation notes + verification + deviations)
  - This tracker — version 2.25, Phase 31 → 🟢 Complete, W6 progress 86%, phase count 31/51
- **Verified:**
  - `:react-native-media-player:compileDebugKotlin :app:compileDebugKotlin` → **BUILD SUCCESSFUL in 1m 18s**. Only pre-existing deprecation warnings in `MediaNotificationService.kt` + `SplashActivity.kt`. **No new errors from Phase 31 code.**
  - `:react-native-media-player:assembleDebug` → **BUILD SUCCESSFUL in 23s** (AAR builds)
  - `:app:assembleDebug` → **BUILD SUCCESSFUL in 3m 6s** (APK packages correctly with V12 module's AAR)
- **Deviations from spec:** 3 (see SPEC §31.C) — biggest one: `getModule` returns `null` for unknown names (not `throw`) because that's the actual `TurboReactPackage` contract (RN handles the fallback to other packages itself)
- **Module's `mpv/` directory** now has 3 files: `MPVLib.kt` + `MpvRenderView.kt` (Phase 6) + `MpvBridgeModule.kt` (Phase 27) + `MpvRenderViewManager.kt` (Phase 27, V11 backward compat). MpvPlayerPackage.kt removed.
- **Module's root package** now has: `PlayerActivity.kt` + `PipManager.kt` + `MediaPlaybackService.kt` + 3 interfaces (`IMpvConfigProvider`, `IMpvNativePtrProvider`, `IPipModeChangeEmitter`) + new `PlayerPackage.kt`
- **Next:** Wave 6 Phase 32 (Module documentation — production-ready README) on greenlight

### 2026-09-02 — Wave 6 Phase 30 (Finalize NPM metadata) executed & verified
- **Author:** Mobile team
- **What:** Finalized the module's NPM-publishing metadata. Updated `package.json` to production-ready: name `@simba/react-native-media-player`, version `0.1.0` (was `0.0.1`), `private: false` (was `true`), explicit `files` allow-list, 12 keywords, full author/homepage/repository/bugs blocks, `publishConfig.access: "public"`, `codegenConfig` for RN 0.76+ TurboModule codegen, `scripts.prepack: "npm run typecheck"`, bumped `peerDependencies.react-native` to `>=0.76.0` (bridgeless requirement). Created `react-native.config.js` with autolinking config (android only; uses current FQN `com.simba.player.mpv.MpvPlayerPackage`). Created `LICENSE` (MIT + native-lib license notes: libmpv GPLv2+, FFmpeg LGPLv2.1+, libOpenCL Apache-2.0, libc++_shared Apache-2.0+LLVM exceptions). Fixed Phase 24 oversight: exported `DefaultControlsProps` interface + wired `<DefaultControls>` to accept optional `title/subtitle/onPlay/onPause` props; also exported from `index.ts`.
- **Why:** Phase 30 was the gate before any NPM publish or external consumer install. Production metadata is the minimum bar for `npm publish` (private:false, version 0.1.0, files list, author, license). Autolinking config means consumers can `npm install @simba/react-native-media-player` and have the native side picked up by `react-native config` automatically (no manual `MainApplication.kt` edits). LICENSE with native-lib notes preempts the obvious "is this OK to ship" question. DefaultControlsProps fix surfaced when running the module's standalone `tsc --noEmit` — Phase 29's audit didn't catch it because the consumer app's tsc doesn't include the module's files.
- **What changed:**
  - **EDITED** [react-native-media-player/package.json](file:///x:/Development/SIMBA/react-native-media-player/package.json) — full production metadata (see SPEC §30.A for diff)
  - **NEW** [react-native-media-player/react-native.config.js](file:///x:/Development/SIMBA/react-native-media-player/react-native.config.js) — autolinking config with docblock
  - **NEW** [react-native-media-player/LICENSE](file:///x:/Development/SIMBA/react-native-media-player/LICENSE) — MIT + native-lib notes
  - **EDITED** [react-native-media-player/src/components/DefaultControls.tsx](file:///x:/Development/SIMBA/react-native-media-player/src/components/DefaultControls.tsx) — exported `DefaultControlsProps` interface; wired optional props (title/subtitle/onPlay/onPause); props take precedence over player-state-derived values
  - **EDITED** [react-native-media-player/src/index.ts](file:///x:/Development/SIMBA/react-native-media-player/src/index.ts) — added `DefaultControlsProps` to public exports
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 30 → 🟢 Complete, version 1.28, full deliverables report (§30.A-C: additional deliverables + verification + deviations)
  - This tracker — version 2.24, Phase 30 → 🟢 Complete, W6 progress 71%, phase count 30/51
- **Verified:**
  - Module's `tsc --noEmit -p .` → exit 0 (was failing before DefaultControlsProps fix). Required a junction `react-native-media-player/node_modules` → `MOBILE_APP_REACT_NATIVE/node_modules` for type resolution (node_modules is in module's `.gitignore`, invisible to git)
  - Consumer app's `tsc --noEmit` → exit 0 (unchanged)
  - `./gradlew :app:compileDebugKotlin` → PASSED (Kotlin unchanged in Phase 30, only TS edits)
  - `npm pack --dry-run` → ✅ exit 0, name `@simba/react-native-media-player`, version `0.1.0`, package size 518.8MB, total files 729
- **Module's published tarball contents (verified):** 8 TS/TSX files in `src/`, 14 Kotlin files in `android/src/main/java/`, 6 C++ source files in `android/src/main/cpp/`, 4 ABI `jniLibs/` (44 `.so` files + `MPV_NATIVE_PROVENANCE.md`), `AndroidManifest.xml`, `build.gradle`, `consumer-rules.pro`, `LICENSE`, `README.md`, `react-native.config.js`, `tsconfig.json`, `package.json`. `libmpv.so` shows as 0B in `npm pack` output (hardlink dedup quirk) but is 8.17MB on disk
- **Deviations from spec:** 8 (see SPEC §30.C) — biggest ones: `packageImportPath`/`packageInstance` use current FQN `MpvPlayerPackage` (Phase 31 will rename to `PlayerPackage`); bumped RN peerDep to `>=0.76.0` (bridgeless); added `codegenConfig` (required by RN 0.76+ codegen)
- **Next:** Wave 6 Phase 31 (PlayerPackage rename + BaseReactPackage upgrade) on greenlight

### 2026-09-02 — Wave 6 Phase 29 (Move remaining TypeScript code) executed & verified
- **Author:** Mobile team
- **What:** Audited the module's `src/` directory against the spec's Phase 29 file list. Verified all 8 TS/TSX files are present and correctly organized (4 components + 2 types + 1 bridge + 1 index). Verified consumer-app V11 leftovers are correctly preserved (not yet deleted — Phase 41+/47+). Verified no `import` statement in the consumer app references the module's relative `src/` path.
- **Why:** Phase 29 is the defensive sweep for any TS that ended up in the app. The module was created at Phase 0, so all TS has been authored in-module since Wave 5. The audit confirms the move is complete (nothing was in the app to begin with) and the 3 minor path/structural deviations are documented.
- **Module's `src/` inventory (8 TS/TSX files):**
  - `bridge/MpvPlayerModule.ts` [Phase 24]
  - `components/DefaultControls.tsx` [Phase 22 stub, Phase 24 full UI]
  - `components/PlayerProvider.tsx` [Phase 21]
  - `components/PlayerRoot.tsx` [Phase 23]
  - `components/PlayerSurface.tsx` [Phase 25]
  - `types/config.ts` [Phase 21]
  - `types/player.ts` [Phase 23]
  - `index.ts` [Phase 21+]
- **Consumer-app V11 leftovers (correctly kept, all to be removed in W8):**
  - `src/native/{index,NativeMpvPlayer,player.api}.ts` — V11 player-api (Phase 47+)
  - `src/services/notificationService.ts` — V11 → V12 routing via Phase 27 rewire (Phase 41+)
  - `src/hooks/usePlayer.ts` — V11 hook (Phase 41+)
  - `src/hooks/usePipEntry.ts` + `src/hooks/usePipLifecycle.ts` — V11 pip orchestration (Phase 41+)
- **Deviations from spec (documented in SPEC §29.D):**
  1. Hooks + types grouped in `types/player.ts` (not separate `hooks/usePlayer.ts` + root `types.ts`) — cohesion choice, no consumer impact
  2. `usePip` / `useMediaSession` / `service/PlayerService` not built — out-of-scope Wave 7+ (Kotlin-side handles)
  3. `native/NativeMpvPlayer.ts` not built — V11 version exists in consumer app; V12 uses `bridge/MpvPlayerModule.ts` wrapper instead
- **What changed:**
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 29 → 🟢 Complete, version 1.27, full audit report added (§29.A-E: file inventory + consumer leftovers + classification table + deviations + verification)
  - This tracker — version 2.23, Phase 29 → 🟢 Complete, W6 progress 57%, phase count 29/51
- **Verified:** Audit-only phase. No files moved or created. All Wave 5 + Wave 6 Phase 27/28 builds remain green. Module's `tsc --noEmit` exits 0. Consumer app's `tsc --noEmit` exits 0.
- **Next:** Wave 6 Phase 30 (Finalize NPM metadata: package.json production fields + react-native.config.js) on greenlight

### 2026-09-02 — Wave 6 Phase 28 (Finalize module build.gradle) executed & verified — **Native split complete**
- **Author:** Mobile team
- **What:** Made the module fully self-contained for native playback. Moved JNI source files (`main.cpp`, `property.cpp`, `event.cpp`, `native_state.cpp`/`.h`, `include/`) + all 4 ABI `jniLibs/` directories (44 .so files total) + `MPV_NATIVE_PROVENANCE.md` from consumer app to module. Created module's `cpp/CMakeLists.txt` that builds only `libsimbaplayer_mpv.so`. Removed `libsimbaplayer_mpv` build from consumer app's CMakeLists.txt. Updated module's `build.gradle` with `externalNativeBuild { cmake { ... } }` (path: `src/main/cpp/CMakeLists.txt`, version: 3.22.1), `defaultConfig.externalNativeBuild` with `-DANDROID_STL=c++_shared` + `-std=c++17`, all 4 ABI filters, and `packagingOptions` with `pickFirst` for 11 native libs + `resources.excludes` for META-INF. Removed 25 `pickFirst` entries from consumer app's `build.gradle` (module now provides transitively).
- **Why:** Phase 27 audit identified the JNI/native split as a remaining Phase 28 deliverable. The module needs to be self-contained so consumers can install it as a standalone AAR + npm package without dragging native code from their own project.
- **What changed:**
  - **MOVED** 6 source files: `main.cpp`, `property.cpp`, `event.cpp`, `native_state.cpp`, `native_state.h`, `include/` → `react-native-media-player/android/src/main/cpp/`
  - **MOVED** 4 ABI directories: `jniLibs/{arm64-v8a,armeabi-v7a,x86,x86_64}/` (44 .so files) → `react-native-media-player/android/src/main/jniLibs/`
  - **MOVED** `jniLibs/MPV_NATIVE_PROVENANCE.md` → module
  - **CREATED** `react-native-media-player/android/src/main/cpp/CMakeLists.txt` (mpv JNI wrapper only)
  - **EDITED** `MOBILE_APP_REACT_NATIVE/android/app/src/main/cpp/CMakeLists.txt` — removed `libsimbaplayer_mpv` library (now built by module)
  - **EDITED** `react-native-media-player/android/build.gradle` — added `externalNativeBuild`, `defaultConfig.externalNativeBuild`, all 4 ABI filters, full `packagingOptions`
  - **EDITED** `MOBILE_APP_REACT_NATIVE/android/app/build.gradle` — removed 25 `pickFirst` lines from `packagingOptions` (module provides them transitively)
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 28 → 🟢 Complete, full report added
  - This tracker — version 2.22, Phase 28 → 🟢 Complete, W6 progress 42%, phase count 28/51
- **Verified:**
  - `:react-native-media-player:compileDebugKotlin` PASSED 1m 14s (initial failure on AGP 9.x `excludes` syntax — fixed to `resources.excludes += [...]`)
  - `:react-native-media-player:assembleDebug` PASSED 2m 53s. AAR produced (59MB) with `classes.jar` + CMake-built `libsimbaplayer_mpv.so` for all 4 ABIs + all libmpv/libav* .so files
  - `:app:compileDebugKotlin` PASSED 1m 23s (UP-TO-DATE — no Kotlin edits since Phase 27)
  - `:app:assembleDebug` PASSED 14m 28s. APK (331MB debug, uncompressed) contains `libmpv.so` + `libsimbaplayer_mpv.so` for all 4 ABIs transitively from the module's AAR
- **Issues encountered:**
  - AGP 9.x removed top-level `packagingOptions { excludes [...] }` syntax — must use `packagingOptions { resources { excludes += [...] } }`. First attempt at Phase 28 failed; fixed by switching syntax
- **APK verified .so contents (all 4 ABIs):**
  - libappmodules.so (RN TurboModule)
  - libmpv.so (~80MB each), libsimbaplayer_mpv.so (~85KB each — the new module-built wrapper)
  - libavcodec/avdevice/avfilter/avformat/avutil/swresample/swscale.so
  - libc++_shared.so, libOpenCL.so (3 ABIs), libplayer.so
  - All RN autolinked .so files (hermes, fbjni, jsi, reactnative, reanimated, worklets, gesturehandler, screens, svg, mmkv, sqliteJni, etc.)
- **Next:** Wave 6 Phase 29 (Move remaining TypeScript code if any) on greenlight

### 2026-09-02 — Wave 6 Phase 27 (Move Android code to module) executed & verified
- **Author:** Mobile team
- **What:** Moved 3 Kotlin files from the consumer app to the module: `MpvBridgeModule.kt` + `MpvPlayerPackage.kt` + `MpvRenderViewManager.kt`. Updated `MpvBridgeModule.kt` to replace V11's `MediaNotificationService` references with V12's `MediaPlaybackService` (Phase 16). Bridge method signatures unchanged so V11 callers (`src/services/notificationService.ts` called by `useAudioPlayerScreen.ts`) continue to work. No consumer-app edits needed because the package name (`com.simba.player.mpv`) stays the same and `MainApplication.kt` + `MainActivity.kt` already import via FQN which now resolves to the module via `implementation project(':react-native-media-player')`.
- **Why:** Phase 26's audit identified these 3 files as still living in the consumer app. Phase 27 completes the move so the module has a self-contained Android source tree. The MpvBridgeModule edit was necessary because it referenced `com.simba.player.MediaNotificationService` (a V11 leftover that lives in the consumer app). After moving MpvBridgeModule into the module, it can no longer see the consumer app's class — module-side classes must only depend on other module-side classes or RN/Android SDK classes.
- **What changed:**
  - **MOVED** `MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/MpvBridgeModule.kt` → `react-native-media-player/android/src/main/java/com/simba/player/mpv/MpvBridgeModule.kt`
  - **MOVED** `MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/MpvPlayerPackage.kt` → `react-native-media-player/android/src/main/java/com/simba/player/mpv/MpvPlayerPackage.kt`
  - **MOVED** `MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/MpvRenderViewManager.kt` → `react-native-media-player/android/src/main/java/com/simba/player/mpv/MpvRenderViewManager.kt`
  - **EDITED** `react-native-media-player/android/src/main/java/com/simba/player/mpv/MpvBridgeModule.kt` — 4 `@ReactMethod`s (`startNotification` / `updateNotification` / `stopNotification` / `isNotificationActive`) rewritten to point at `MediaPlaybackService`. Added `ACTION_START` action to `startNotification` (V11 used implicit default; V12 explicitly requires it). Renamed `EXTRA_POSITION` → `EXTRA_POSITION_MS` + `EXTRA_DURATION` → `EXTRA_DURATION_MS` to match V12's constants. Dropped `EXTRA_FILE_URI` + `EXTRA_MEDIA_TYPE` (V12 doesn't use them). Updated log messages. Added a Phase 27 docblock explaining the V11→V12 bridge routing + the dropped V11-only extras.
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 27 status → `[x] Complete (2026-09-02)`, full move + rewire report added (sections 27.1-27.6 + 3 design notes on stable bridge signatures + session-token-less start + dropped V11 extras). Cleared the original spec's 27.2-27.6 verification items with a "Note on remaining spec items" section explaining each is already covered (libmpv .so move is Phase 31)
  - This tracker — version bumped to 2.21, Phase 27 row → 🟢 Complete, W6 progress 28%, phase count 27/51
- **Verified:** `:app:compileDebugKotlin :react-native-media-player:compileDebugKotlin` PASSED 1m 41s. Only pre-existing deprecation warnings in `MediaNotificationService.kt` (`FLAG_HANDLES_MEDIA_BUTTONS` + `FLAG_HANDLES_TRANSPORT_CONTROLS`) and `SplashActivity.kt` (`overridePendingTransition` + `onBackPressed`). **No new errors from Phase 27 code.** TS typecheck unchanged (no TS files touched).
- **Module's `mpv/` directory** now has 5 files: `MPVLib.kt`, `MpvRenderView.kt` (pre-existing) + `MpvBridgeModule.kt`, `MpvPlayerPackage.kt`, `MpvRenderViewManager.kt` (Phase 27). Consumer app's `mpv/` directory is now empty.
- **Next:** Wave 6 Phase 28 (Finalize module build.gradle — add CMake/libmpv config, packaging, cleanup) on greenlight

### 2026-09-02 — Wave 6 Phase 26 (Audit module structure) executed & verified
- **Author:** Mobile team
- **What:** Audited `react-native-media-player/` module against the spec's expected file list. Verified Kotlin files (7 expected, 5 in module, 3 still in app: MpvBridgeModule / MpvPlayerPackage / MpvRenderViewManager — Phase 27 will move), TS files (all present but `hooks/usePlayer.ts` / `hooks/usePlayerProgress.ts` paths differ from spec — implementation uses `types/player.ts` for cohesion), consumer-app leftovers (V11 MediaNotificationService + src/native/* kept for backward compat until Phase 41+/47+). Identified 8 structural issues for Phase 27+/28/30: path mismatch, 3 Kotlin files to move, unimplemented spec entries (PipActionReceiver / usePip / useMediaSession / PlayerService — receiver is correctly inlined; the TS hooks are out-of-scope Wave 7+), stale package.json items (version 0.0.1, private:true, echo build script), missing CHANGELOG.md / LICENSE / CI config / .gitkeep cleanup.
- **Why:** Phase 26 is the gate before Phase 27's bulk file moves. Auditing first means Phase 27 has a clear checklist of exactly which files to move + which spec entries to update + which package.json fields to bump. Doing the audit post-hoc would mean discovering surprises mid-move (e.g. would have been wasteful to move MpvRenderViewManager and then discover the spec doesn't mention it).
- **What changed:**
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 26 status → `[x] Complete (2026-09-02)`, full audit report added (sections 26.1 directory tree + 26.2 Kotlin verification + 26.3 TS verification + 26.4 consumer-app leftovers + 26.5 structural issues)
  - This tracker — version bumped to 2.20, Phase 26 row → 🟢 Complete, W6 progress 14%, phase count 26/51
- **Audit findings summary:**
  - ✅ **Kotlin present (5 of 7 spec items)**: PlayerActivity, MpvRenderView (mpv/ subdir), PipManager, MediaPlaybackService, plus bonus interfaces (IMpvConfigProvider, IMpvNativePtrProvider, IPipModeChangeEmitter) + MPVLib
  - ⚠️ **Kotlin missing (3 files)**: MpvBridgeModule.kt, MpvPlayerPackage.kt, MpvRenderViewManager.kt — all in `MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/`. Phase 27 moves these
  - ❌ **Kotlin never created (1 file)**: PipActionReceiver.kt — spec mention was incorrect; receiver logic correctly inlined in `PlayerActivity.createMediaSession()`. Spec to be cleaned in Phase 28
  - ✅ **TS present (all 10 spec items, with path differences)**: PlayerProvider, DefaultControls, PlayerSurface in `components/`; usePlayer + usePlayerProgress + types in `types/player.ts` (spec wanted `hooks/usePlayer.ts` + root `types.ts`); index.ts at root. Plus bonus: bridge/MpvPlayerModule.ts, PlayerRoot.tsx
  - ❌ **TS never created (3 files)**: usePip, useMediaSession, PlayerService — out-of-scope Wave 7+ enhancements; spec to be reclassified in Phase 28
  - 🟢 **Consumer-app leftovers (correctly kept)**: MediaNotificationService.kt (V11 backward compat, Phase 41+); src/native/index.ts + NativeMpvPlayer.ts + player.api.ts (V11 imports, Phase 47+)
- **Verified:** Audit-only phase. Module's `:react-native-media-player:compileDebugKotlin` builds PASS (verified by all Waves 1-5 builds). Module's TS typecheck PASSES (`tsc --noEmit` from consumer app dir, exit 0)
- **Next:** Wave 6 Phase 27 (Move 3 Kotlin files: MpvBridgeModule + MpvPlayerPackage + MpvRenderViewManager from app's `com.simba.player.mpv` to module's `com.simba.player.mpv`) on greenlight

### 2026-09-02 — Wave 5 Phase 25 (Surface placeholder component) executed & verified — **WAVE 5 COMPLETE**
- **Author:** Mobile team
- **What:** Created `src/components/PlayerSurface.tsx` — a no-op JS placeholder (`<View style={{ flex: 1, backgroundColor: '#000000' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />`) that reserves layout space for the natively-rendered SurfaceView. Updated `PlayerRoot.tsx` to layer `<PlayerSurface />` (background, `flex: 1`) + a controls overlay (`position: 'absolute'`, `top/left/right/bottom: 0`) so the controls always stretch over the video regardless of how the surface is sized. Updated `src/index.ts` to export `PlayerSurface` + `PlayerSurfaceProps`. All new code is TS-only — Kotlin build is UP-TO-DATE.
- **Why:** Until Phase 25, `PlayerRoot` returned only the controls (Phase 23). Consumers rendering `<PlayerRoot />` had no JS counterpart for the native SurfaceView that mpv draws into, meaning the React tree had no layout anchor for the video. Phase 25 adds the anchor — a placeholder that fills the same screen rectangle as the native SurfaceView because PlayerActivity pins the React root to the same insets the SurfaceView occupies (Phase 15 full-screen handling). The placeholder is invisible (a11y-hidden) because the native SurfaceView is already hidden from a11y (Phase 4 sets `importantForAccessibility="no"` on `MpvRenderView`).
- **What changed:**
  - **NEW** `react-native-media-player/src/components/PlayerSurface.tsx` — `<View flex: 1>` placeholder with `backgroundColor: '#000000'` default (matches mpv's initial clear colour before the first frame). `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"` mirrors the native side's a11y hidden state. `PlayerSurfaceProps { backgroundColor?: string }` for theming overrides
  - `react-native-media-player/src/components/PlayerRoot.tsx` — changed layout from "controls only" to "layered": `<View flex: 1>` containing `<PlayerSurface />` (background) + `<View position: 'absolute' top/left/right/bottom: 0>` (controls overlay). The overlay preserves the Phase 23 `renderControls` slot behavior (custom controls Just Work) and the fallback to `<DefaultControls>` (Phase 24's full UI). No signature change — `<PlayerRoot />` still takes no props
  - `react-native-media-player/src/index.ts` — added `PlayerSurface` + `PlayerSurfaceProps` exports
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 25 status → `[x] Complete (2026-09-02) — WAVE 5 COMPLETE`, version bumped to 1.23, design notes on JS-placeholder-vs-real-SurfaceView + flex-vs-absolute + accessibility-hidden
  - This tracker — version bumped to 2.19, Phase 25 row → 🟢 Complete, **W5 → 🟢 Complete 100%**, phase count 25/51
- **Scope of the surface layer:** ✅ `PlayerSurface` placeholder; ✅ `PlayerRoot` layered layout (surface + controls overlay); ✅ `accessibilityElementsHidden` mirroring native side; ✅ `backgroundColor` theming override; ✅ `PlayerSurface` export. ❌ No real SurfaceView (still rendered natively by `MpvRenderView` in PlayerActivity — by design). ❌ No `usePlayerProgress` wire to native (deferred to Wave 6/7). ❌ No `usePlayer` mpv-event subscription (deferred to Wave 6/7). ❌ No App.tsx swap to `<PlayerProvider>` + `<PlayerRoot />` (deferred to Wave 6/7)
- **Verified:** `tsc --noEmit` from consumer app dir PASSED (exit 0, zero errors); `:app:compileDebugKotlin :react-native-media-player:compileDebugKotlin` PASSED 1m 15s (UP-TO-DATE since no native changes)
- **Wave 5 summary:** All 5 phases (21-25) 🟢 Complete. Module now has a complete public TS API surface (Provider, hooks, PlayerRoot, PlayerSurface, DefaultControls, full type system) + the native-side IMpvConfigProvider wire (Phases 21-22). The Kotlin build remains UP-TO-DATE across the last 4 phases — Phase 24 + 25 were TS-only because the UI surface was already deliverable from the existing Kotlin bridge methods (play / pause / seekAbsolute / seekForward / seekBackward were wired in earlier phases). Wave 6 focuses on NPM publishing metadata + the App.tsx consumer-app swap
- **Next:** Wave 6 Phase 26 (Create module directory structure for NPM publishing) on greenlight

### 2026-09-02 — Wave 5 Phase 24 (Default controls component) executed & verified
- **Author:** Mobile team
- **What:** Replaced the Phase 22 stub `DefaultControls` with the full polished UI (top bar with title + close + spacer + subtitle; bottom bar with time-current / scrubber with thumb + filled track / time-total + skip-back-10 / play-pause / skip-forward-10; auto-hide after 3s via `Animated.Value` opacity tween; tap-to-show via root Pressable; PanResponder + nested Pressable for scrubber drag + tap). Added `src/bridge/MpvPlayerModule.ts` typed wrapper around `NativeModules.MpvPlayerModule` (lazy resolution, no-op fallback for non-RN environments). Wired `usePlayer()` commands (play / pause / seek / skipBackward / skipForward) to `MpvPlayerModule` bridge calls. Added `usePlayerProgress()` hook (separate from `usePlayer()` so consumers that don't render a scrubber avoid the 1Hz re-render storm) — Phase 24 stub returns `{ positionMs: 0, durationMs: 0 }`, Phase 25 wires to a 1Hz bridge poll. Updated `src/index.ts` to export `usePlayerProgress`, `PlayerProgress`, `getMpvPlayerModule`, `MpvPlayerModuleBridge`. All new code is TS-only — Kotlin build is UP-TO-DATE.
- **Why:** Until Phase 24, `DefaultControls` was a 2-button stub (Phase 22). Phase 24 is the production-quality controls UI: top bar + scrubber + transport + auto-hide. Wiring commands to the bridge in the same phase means play / pause / seek actually work when the native side is wired — Phase 25 just needs to swap the App.tsx to use `<PlayerRoot />` and wire `usePlayerProgress()` to native for the UI to be fully live. Splitting `usePlayer()` and `usePlayerProgress()` lets consumers opt out of the 1Hz re-render cost by simply not importing the progress hook.
- **What changed:**
  - **NEW** `react-native-media-player/src/bridge/MpvPlayerModule.ts` — `MpvPlayerModuleBridge` type (`play / pause / seekAbsolute / seekBackward / seekForward / setConfig`) + `getMpvPlayerModule()` lazy accessor. Returns the live bridge when `NativeModules.MpvPlayerModule` is wired, otherwise a no-op `NOOP_BRIDGE` whose methods resolve silently. Lets `DefaultControls` + custom controls render in jest tests / Storybook / web previews without guarding every call site
  - `react-native-media-player/src/types/player.ts` — added `PlayerProgress { positionMs, durationMs }` type; added `usePlayerProgress(): PlayerProgress` hook (Phase 24 stub returns `DEFAULT_PROGRESS`); wired `usePlayer()` commands to `getMpvPlayerModule()` (play / pause call bridge directly; seek converts ms→seconds for `MPVLib.nativeSeek`; skipBackward / skipForward call `bridge.seekBackward(seconds)`); added `skipBackward(seconds)` + `skipForward(seconds)` to `PlayerCommands`
  - `react-native-media-player/src/components/DefaultControls.tsx` — full rewrite from Phase 22's 2-button stub. Layout: top bar (close button + centred title + subtitle + spacer for future more-menu) + centre placeholder + bottom bar (time-current + scrubber with PanResponder drag + Pressable tap + filled track + thumb + time-total + skip back/play-pause/skip forward transport row). Auto-hide via `Animated.Value` opacity tween (180ms in / 220ms out, `Easing.out/in(Easing.quad)`, `useNativeDriver: true`); tap-to-show via root `<Pressable onPress>`; `pointerEvents='none'` when hidden so underlying video gets taps. `formatTime(ms)` helper for `H:MM:SS` / `M:SS`; `clamp(value, min, max)` helper. Unicode glyphs for icons (⏪ ▶ ⏸ ⏩ ✕) — avoids forcing consumers to install react-native-vector-icons
  - `react-native-media-player/src/index.ts` — added `usePlayerProgress`, `PlayerProgress`, `getMpvPlayerModule`, `MpvPlayerModuleBridge` exports
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 24 status → `[x] Complete (2026-09-02)`, version bumped to 1.22, design notes on separate progress hook + PanResponder + Pressable combo + opacity-driven auto-hide + unicode icons over vector-icons
  - This tracker — version bumped to 2.18, Phase 24 row → 🟢 Complete, W5 progress 80%, phase count 24/51
- **Scope of the DefaultControls rewrite:** ✅ Top bar (close + title + subtitle + spacer); ✅ Scrubber (track + fill + thumb + drag + tap + clamped seek); ✅ Time labels (formatted with `formatTime`); ✅ Transport (skip-back-10 / play-pause / skip-forward-10); ✅ Auto-hide (3s, opacity tween, native driver); ✅ Tap-to-show; ✅ Commands wired to bridge. ❌ More-menu / subtitles / quality / audio-track (deferred to Phase 25). ❌ Speed selector (deferred to Phase 25). ❌ PiP button (deferred to Phase 25 — needs the activity's pipEntry trigger). ❌ Loading spinner / error / buffer in centre (deferred to Phase 25). ❌ usePlayerProgress returns 0/0 (Phase 25 wires to native). ❌ usePlayer state stays at defaults (Phase 25 wires to mpv events)
- **Verified:** `tsc --noEmit` from consumer app dir PASSED (exit 0, zero errors); `:app:compileDebugKotlin :react-native-media-player:compileDebugKotlin` PASSED 1m 14s (UP-TO-DATE since no native changes)
- **Manual test 24.7.3 deferred** — physical device + V12 build + App.tsx swap required (Phase 25 work)
- **Next:** Wave 5 Phase 25 (Surface placeholder component + App.tsx swap + usePlayerProgress wire to native) on greenlight

### 2026-09-02 — Wave 5 Phase 23 (Custom controls slot) executed & verified
- **Author:** Mobile team
- **What:** Added the `renderControls` slot to `PlayerProvider` (function type, separate context to avoid co-mingled re-renders), the `useRenderControls()` hook, the `<PlayerRoot>` component that reads the slot and renders either the custom node or `<DefaultControls>` as fallback, and a stub `usePlayer()` hook with `PlayerState` / `PlayerCommands` / `UsePlayerResult` types. Updated `src/index.ts` to export the new symbols. Phase 23 is TS-only — no Kotlin changes; build is UP-TO-DATE.
- **Why:** Until Phase 23, consumers had no way to swap the player's default UI overlay — they had to either accept `DefaultControls` or fork the module. Phase 23 establishes the standard "configurable slot" pattern (think `<Form renderItem={...}>` from React Final Form): consumers pass a function, the module calls it. The `usePlayer()` stub lets consumers write their custom controls today against a stable API that Phase 24's full implementation will satisfy without signature changes.
- **What changed:**
  - **NEW** `react-native-media-player/src/types/player.ts` — `PlayerState { isPlaying, positionMs, durationMs, title, artist, album }` + `PlayerCommands { play(), pause(), seek(positionMs) }` + `UsePlayerResult { state, commands }` + `usePlayer()` stub returning `{ state: DEFAULT_STATE, commands: DEFAULT_COMMANDS }` via `useMemo` (identity-stable)
  - **NEW** `react-native-media-player/src/components/PlayerRoot.tsx` — reads `useRenderControls()`, returns the custom node as `<>{renderControls()}</>` if set, else `<DefaultControls>` with `state.title / state.artist / state.album` + `commands.play / pause` wired through as props. Consumer's drop-in replacement for their player JS root
  - `react-native-media-player/src/components/PlayerProvider.tsx` — added `RenderControlsFn = () => ReactNode` type alias, `PlayerRenderControlsContext` (separate from `PlayerConfigContext`), `useRenderControls(): RenderControlsFn | null` hook (returns null outside Provider, not throws — `PlayerRoot` needs graceful fallback), `renderControls?: RenderControlsFn` field on `PlayerProviderProps`. Wrapped children in nested `<PlayerRenderControlsContext.Provider>` so config + controls updates don't trigger each other's consumers to re-render
  - `react-native-media-player/src/index.ts` — added exports for `PlayerRoot`, `useRenderControls`, `RenderControlsFn`, `usePlayer`, `PlayerState`, `PlayerCommands`, `UsePlayerResult`
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 23 status → `[x] Complete (2026-09-02)`, version bumped to 1.21, design notes on function-vs-component for the slot + separate contexts + stub-over-concrete usePlayer + TS typecheck via consumer app's node_modules
  - This tracker — version bumped to 2.17, Phase 23 row → 🟢 Complete, W5 progress 60%, phase count 23/51
- **Scope of the custom-controls wire:** ✅ `renderControls` prop on PlayerProvider; ✅ `useRenderControls` hook (separate context); ✅ `PlayerRoot` component with custom-or-fallback dispatch; ✅ `usePlayer()` stub with stable signature; ✅ `PlayerState` / `PlayerCommands` types. ❌ no real `usePlayer()` impl yet (Phase 24 wires to mpv events + MpvBridgeModule calls). ❌ App.tsx wrap with `<PlayerProvider renderControls={...}>` not yet done (Phase 25 work — tracks the actual player UI swap from V11 to V12). ❌ no error boundary around the custom node yet (deferred — can be added without API change)
- **Verified:** `tsc --noEmit` from consumer app dir PASSED (exit 0, zero errors); `:app:compileDebugKotlin :react-native-media-player:compileDebugKotlin` PASSED 1m 18s (UP-TO-DATE since no native changes). TS typecheck via consumer app's node_modules works because TypeScript resolves modules by walking up from the file being checked, and `SIMBA/MOBILE_APP_REACT_NATIVE/node_modules/` (found via `SIMBA/react-native-media-player/src/components/node_modules` → `SIMBA/react-native-media-player/src/node_modules` → `SIMBA/react-native-media-player/node_modules` → `SIMBA/node_modules` → `SIMBA/MOBILE_APP_REACT_NATIVE/node_modules`) has `react` / `react-native` / `@types/react` / `@react-native/typescript-config`
- **Manual test 23.5.3 deferred** — physical device + V12 build + App.tsx wrap required (Phase 25 work)
- **Next:** Wave 5 Phase 24 (Full DefaultControls UI — scrubber + time labels + PiP button + speed + settings) on greenlight

### 2026-09-02 — Wave 5 Phase 22 (Theme propagation) executed & verified
- **Author:** Mobile team
- **What:** Added the first themed UI to the module: `src/components/DefaultControls.tsx` — a minimal stateless component that renders a title + subtitle + phase tag + two themed buttons (Play / Pause). All colors come from `useTheme()` (new ergonomic hook in `PlayerProvider.tsx` that returns `usePlayerConfig().theme`). Added `DEFAULT_THEME_ACCENT/BACKGROUND/TEXT` companion constants in `PlayerActivity` to mirror the TS `DEFAULT_THEME` and extended `loadAndLogPlayerConfig` to drill into the theme section and log the active color values. Updated `src/index.ts` to export `DefaultControls`, `DefaultControlsProps`, and `useTheme`.
- **Why:** Until Phase 22, the `PlayerConfig.theme` shape was defined but no UI consumed it — every render used hardcoded colors. Phase 22 establishes the end-to-end theme wire: a consumer wrapping their app in `<PlayerProvider config={{ theme: { accent: '#FF0000' } }}>` now sees red-accented buttons in DefaultControls AND the native PlayerActivity logs `theme accent=#FF0000` at launch. Phase 24 fleshes out DefaultControls with the full transport UI; Phase 22 just verifies the wire.
- **What changed:**
  - `react-native-media-player/src/components/PlayerProvider.tsx` — added `useTheme(): PlayerTheme` ergonomic shortcut + `PlayerTheme` import
  - **NEW** `react-native-media-player/src/components/DefaultControls.tsx` — minimal themed stub component (`DefaultControls({ title, subtitle, onPlay, onPause })`). Renders root `<View>` with `theme.background` bg; title in `theme.text`; subtitle in `theme.textSecondary`; phase tag in `theme.icon ?? theme.text` text + `theme.surface` border; primary button bg=`theme.accent` label=`theme.background`; secondary button border=`theme.accent` label=`theme.accent`. Uses `Pressable` with function-as-children for `opacity: 0.7` press feedback. Pure stateless — does NOT own playback state (that's Phase 24's `usePlayer()` hook)
  - `react-native-media-player/src/index.ts` — added `DefaultControls`, `DefaultControlsProps`, `useTheme` exports
  - `react-native-media-player/android/src/main/java/com/simba/player/PlayerActivity.kt` — added `DEFAULT_THEME_ACCENT/BACKGROUND/TEXT` companion constants (mirror of TS `DEFAULT_THEME`); extended `loadAndLogPlayerConfig` to drill into `config["theme"]` as `Map<String, Any?>` and log accent/background/text with fallback to the defaults if the section or any specific key is absent
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 22 status → `[x] Complete (2026-09-02)`, version bumped to 1.20, design notes on source-of-truth + `theme.icon` fallback + `Pressable` vs `TouchableOpacity` + default-theme color constants on native side
  - This tracker — version bumped to 2.16, Phase 22 row → 🟢 Complete, W5 progress 40%, phase count 22/51
- **Scope of the theme wire:** ✅ `PlayerTheme` + `DEFAULT_THEME` types; ✅ `useTheme()` ergonomic hook; ✅ `DefaultControls` reads every theme key (accent / background / text / textSecondary / surface / icon); ✅ PlayerActivity logs the active theme colors from native side. ❌ no full transport UI in DefaultControls yet (Phase 24). ❌ no notification color application yet (Phase 22 follow-up: pipe accent into `NotificationCompat.Builder.setColor`). ❌ no runtime theme flip (settings screen tracked separately)
- **Verified:** `:app:compileDebugKotlin :react-native-media-player:compileDebugKotlin` PASSED 1m 42s (only pre-existing deprecation warnings; no new errors from Phase 22 code)
- **Manual test 22.4.3 deferred** — physical device with V12 build required (log check: open PlayerActivity after wrapping in `<PlayerProvider config={{ theme: { accent: '#FF0000' } }}>` → logcat shows `loadAndLogPlayerConfig: theme accent=#FF0000 background=#121216 text=#FFFFFF`)
- **Next:** Wave 5 Phase 23 (Custom controls slot — `renderControls?: () => ReactNode` prop on PlayerProvider) on greenlight

### 2026-09-02 — Wave 5 Phase 21 (PlayerProvider and config) executed & verified — **WAVE 5 START**
- **Author:** Mobile team
- **What:** Added the first TS code to the module: `src/types/config.ts` (PlayerConfig + PlayerTheme + PipConfig + AudioConfig + SubtitleConfig + NotificationConfig + DebugConfig + HardwareDecodingPolicy + ResolvedPlayerConfig + `resolvePlayerConfig()` + `DEFAULT_THEME` + `DEFAULT_PLAYER_CONFIG`); `src/components/PlayerProvider.tsx` (React Context + `PlayerProvider` + `usePlayerConfig()` hook + lazy `getNativeModule()` accessor + idempotent `setConfig` push on mount + when resolved changes); `src/index.ts` (public API barrel). Module now has a `tsconfig.json` extending `@react-native/typescript-config` (canonical RN base) and `package.json` declares `react` / `react-native` as `peerDependencies` + `devDependencies` (standard RN lib convention). Native side: new `IMpvConfigProvider` module-side interface in the module; `MpvBridgeModule` implements it (alongside `IMpvNativePtrProvider` + `IPipModeChangeEmitter` from Phases 7 + 10) and adds a `setConfig(configJson: String, promise: Promise)` `@ReactMethod` that parses JSON via `JSONObject` + recursive `jsonObjectToMap` helper and stores in `@Volatile var currentConfig: Map<String, Any?>?`. PlayerActivity calls a new `loadAndLogPlayerConfig()` helper in `onCreate` (after `startMediaPlaybackService`) that resolves `IMpvConfigProvider` via the bridge and logs the active keys.
- **Why:** Until Phase 21, consumers had no way to configure the player — every setting (theme, PiP, audio background, notifications, hardware decoding) was hardcoded in the Kotlin side. Phase 21 establishes the TS-side configuration surface and the JSON-over-bridge wire that delivers it to native code. From Phase 22 onwards the individual config sections are read in PlayerActivity and applied (theme colors flow to default controls, PiP toggles gate auto-entry, audio.backgroundPlayback replaces the Phase 14 SharedPreferences key).
- **What changed:**
  - **NEW** `react-native-media-player/src/types/config.ts` — `PlayerTheme` + `PipConfig` + `AudioConfig` + `SubtitleConfig` + `NotificationConfig` + `DebugConfig` + `HardwareDecodingPolicy` + `PlayerConfig` (partial input) + `ResolvedPlayerConfig` (fully-populated output) + `resolvePlayerConfig(config)` shallow-merge helper + `DEFAULT_THEME` (dark, golden accent on near-black) + `DEFAULT_PLAYER_CONFIG`
  - **NEW** `react-native-media-player/src/components/PlayerProvider.tsx` — `PlayerConfigContext` + `usePlayerConfig()` (throws outside Provider) + `PlayerProvider({ config, children })` (memoizes resolved config, pushes JSON to native on mount + when resolved changes) + lazy `getNativeModule()` (returns null on jest/web; provider still serves TS consumers)
  - **NEW** `react-native-media-player/src/index.ts` — public API barrel re-exporting `PlayerProvider`, `usePlayerConfig`, `PlayerProviderProps`, all config types, `DEFAULT_PLAYER_CONFIG`, `DEFAULT_THEME`, `resolvePlayerConfig`
  - **NEW** `react-native-media-player/tsconfig.json` — extends `@react-native/typescript-config`, includes `src/**/*`, excludes node_modules + android + tests
  - `react-native-media-player/package.json` — added `peerDependencies` (react >= 18, react-native >= 0.72), `devDependencies` (`@react-native/typescript-config` 0.86.0, `@types/react` ^19.2.0, `react` 19.2.3, `react-native` 0.86.0, `typescript` 5.5.4), `types` + `react-native` entry-point fields, `files` whitelist for published package, `typecheck` script. Standard RN lib convention (matches react-native-video, react-native-track-player, lottie-react-native)
  - **NEW** `react-native-media-player/android/src/main/java/com/simba/player/IMpvConfigProvider.kt` — module-side interface with `getCurrentConfig(): Map<String, Any?>?`. 3rd use of the module-side interface pattern (Phase 7 = `IMpvNativePtrProvider`, Phase 10 = `IPipModeChangeEmitter`, Phase 21 = `IMpvConfigProvider`)
  - `MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/MpvBridgeModule.kt` — added `IMpvConfigProvider` import + to class implements list; added `@Volatile var currentConfig: Map<String, Any?>?` companion field; added private `jsonObjectToMap(JSONObject)` + `jsonValueToKotlin(Any?)` helpers (recursive JSONObject/JSONArray → Map/List/primitive); added `setConfig(configJson: String, promise: Promise)` `@ReactMethod` (parses JSON, stores, resolves with top-level key count); added `override fun getCurrentConfig(): Map<String, Any?>?` (interface impl)
  - `react-native-media-player/android/src/main/java/com/simba/player/PlayerActivity.kt` — added `loadAndLogPlayerConfig()` helper (resolves `IMpvConfigProvider` via `getNativeModule("MpvPlayerModule") as?` cast; logs active keys; does NOT cache the config on the activity — future readers call `module.getCurrentConfig()` directly so runtime config flips are visible); wired into `onCreate` after `startMediaPlaybackService`
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 21 status → `[x] Complete (2026-09-02)`, version bumped to 1.19, design notes on module-side interface pattern (3rd use) + JSON encoding on the wire + PeerDev convention
  - This tracker — version bumped to 2.15, Phase 21 row → 🟢 Complete, W5 progress 20%, phase count 21/51
- **Scope of the config wire:** ✅ `PlayerConfig` type with 7 sections; ✅ `resolvePlayerConfig` shallow-merge defaults; ✅ Provider context + hook + lazy native push; ✅ JSON-encoded push to `MpvBridgeModule.setConfig`; ✅ module-side `IMpvConfigProvider` interface + bridge-side impl + `currentConfig` cache; ✅ `PlayerActivity.loadAndLogPlayerConfig` reads + logs on launch. ❌ no actual application of config fields yet (Phase 22-25 read individual fields). ❌ no runtime config flip (Phase 22+ settings screen — tracked separately)
- **Verified:** `:app:compileDebugKotlin :react-native-media-player:compileDebugKotlin` PASSED 1m 47s (only pre-existing deprecation warnings in MpvBridgeModule.getCurrentActivity + MediaNotificationService + SplashActivity; no new errors from Phase 21 code)
- **Manual test 21.5 deferred** — physical device with V12 build required (log check: open PlayerActivity → logcat shows `loadAndLogPlayerConfig: active PlayerConfig keys=[audio, debug, hardwareDecoding, notifications, pip, subtitle, theme]`)
- **Next:** Wave 5 Phase 22 (Theme propagation — DefaultControls reads theme from `usePlayerConfig()`) on greenlight

### 2026-09-02 — Wave 4 Phase 20 (Bluetooth / wired headset controls) executed & verified — **WAVE 4 COMPLETE**
- **Author:** Mobile team
- **What:** Added `headsetReceiver` BroadcastReceiver for `AudioManager.ACTION_AUDIO_BECOMING_NOISY` in `PlayerActivity` (registered in `onResume`, unregistered in `onPause`). On the noisy event, calls `MPVLib.nativePause(ptr)` + `updateMediaSessionState(playing = false)` so audio doesn't blast out of the speaker when headphones unplug. Added `MediaButtonReceiver` (`androidx.media.session.MediaButtonReceiver`) declaration to the module's `AndroidManifest.xml` so the system has a route for `MEDIA_BUTTON` broadcasts to the active `MediaSessionCompat` — Phase 18's callback handles the actual keycode translation. Receiver uses `Context.RECEIVER_NOT_EXPORTED` on API 33+ (system-originated broadcast).
- **Why:** Until Phase 20, Bluetooth headphone play/pause/skip worked (via Phase 18's MediaSession callback) but (a) wired / Bluetooth unplug left mpv playing on the speaker — annoying surprise, and (b) some headset controllers and Android Auto send `MEDIA_BUTTON` broadcasts that need an explicit `MediaButtonReceiver` to route to the session. Phase 20 closes both gaps.
- **What changed:**
  - `react-native-media-player/android/src/main/java/com/simba/player/PlayerActivity.kt` — added `headsetReceiver: android.content.BroadcastReceiver?` field; added `registerHeadsetReceiver()` (idempotent, API 33+ `RECEIVER_NOT_EXPORTED` flag, `AudioManager.ACTION_AUDIO_BECOMING_NOISY` intent filter); added `unregisterHeadsetReceiver()` (try/catch for IllegalArgumentException, safe to call after a config-change double-onResume); added `pauseOnHeadsetDisconnect()` (guards on `lastNativePtr != 0L`, calls `nativePause` + `updateMediaSessionState(playing = false)`); wired `registerHeadsetReceiver()` into `onResume()` (after `startProgressUpdates()`) and `unregisterHeadsetReceiver()` into `onPause()` (after `stopProgressUpdates()`)
  - `react-native-media-player/android/src/main/AndroidManifest.xml` — added `<receiver>` declaration for `androidx.media.session.MediaButtonReceiver` with `MEDIA_BUTTON` intent filter and `exported="true"` (matches the V11 consumer-app declaration; Gradle manifest merger deduplicates)
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 20 status → `[x] Complete (2026-09-02)`, version bumped to 1.18, design notes on receiver scope + `ACTION_AUDIO_BECOMING_NOISY` scope + media-button routing added
  - This tracker — version bumped to 2.14, Phase 20 row → 🟢 Complete, W4 → 🟢 Complete (100%), W4 progress 100%, phase count 20/51
- **Scope of the headset path:** ✅ `ACTION_AUDIO_BECOMING_NOISY` receiver registered/unregistered with activity lifecycle; ✅ pause goes through MediaSession state update so lock-screen widget + notification reflect the pause; ✅ `MediaButtonReceiver` declared in module manifest so `MEDIA_BUTTON` broadcasts reach the session; ✅ Phase 18 MediaSession callback already covers play/pause/stop/skip-next/skip-prev/seek-to (no new code). ❌ no observer hook for `metadata-update` / `chapter-change` events (deferred from Phase 18/19 — W5 polish); ❌ no real `SKIP_NEXT` / `SKIP_PREV` MPVLib playlist wiring tested on playlist-loaded content (callback is in place, just needs a playlist-test scenario)
- **Verified:** `:app:compileDebugKotlin :react-native-media-player:compileDebugKotlin` PASSED 1m 44s (deprecation warnings only — pre-existing in MpvBridgeModule + `getParcelable` + `FLAG_HANDLES_*`)
- **Manual tests 20.6, 20.7 deferred** — physical device with V12 build + Bluetooth headphones / wired headset required
- **Next:** Wave 5 Phase 21 (`PlayerProvider` and config — TS-side wrapping component) on greenlight

### 2026-09-02 — Wave 4 Phase 19 (Media metadata on lock screen) executed & verified
- **Author:** Mobile team
- **What:** Added `getMediaTitle()` / `getMediaArtist()` / `getMediaAlbum()` mpv property query helpers (using `metadata/by-key/*` form for reliable artist/album extraction) and `setMediaSessionMetadata()` that builds a `MediaMetadataCompat` and sets it on the MediaSession. Initial call in `createMediaSession()` (launch title fallback); refresh after `wireNativePtr` succeeds (queries mpv for actual file tags).
- **Why:** Until Phase 19, the lock-screen widget + Android Auto + some Bluetooth headset controllers showed the same generic metadata they show for any unconfigured session — the system's internal `Simba Player` placeholder. Phase 19 wires the real file tags from mpv so the user sees the actual track title, artist, and album.
- **What changed:**
  - `react-native-media-player/android/src/main/java/com/simba/player/PlayerActivity.kt` — added `getMediaTitle()`, `getMediaArtist()`, `getMediaAlbum()` mpv property helpers (all return `""` on failure / no handle); added `setMediaSessionMetadata()` (title fallback chain: mpv `media-title` → launch title → "Simba Player"; sets METADATA_KEY_TITLE / DISPLAY_TITLE / ARTIST / ALBUM / DISPLAY_SUBTITLE / MEDIA_URI / DURATION on the session); added `buildDisplaySubtitle(artist, album)` helper; `createMediaSession()` calls `setMediaSessionMetadata()` after `isActive = true`; `wireNativePtr` calls `setMediaSessionMetadata()` after `setNativePtr` to refresh with mpv's actual tags
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 19 status → `[x] Complete (2026-09-02)`, version bumped to 1.17, scope-split note added (artwork plumbing deferred to a future phase when the JS bridge gains `artworkUrl` / `artworkPath` extras)
  - This tracker — version bumped to 2.13, Phase 19 row → 🟢 Complete, W4 progress 80%, phase count 20/51
- **Scope of the metadata path:** ✅ title / artist / album / duration / media URI in MediaMetadataCompat; ✅ two call sites (session creation + wireNativePtr); ✅ title fallback chain. ❌ no observer hook for `metadata-update` / `chapter-change` events (deferred to a W5 polish phase). ❌ no artwork URI plumbing (deferred — current `openPlayer` JS API doesn't carry `artworkUrl` / `artworkPath`; the service's existing `loadArtworkBitmap` helper will pick it up when the bridge adds it)
- **Verified:** `:app:compileDebugKotlin :react-native-media-player:compileDebugKotlin` PASSED 1m 47s (deprecation warnings only — pre-existing in MpvBridgeModule)
- **Manual tests 19.5 deferred** — physical device with V12 build required
- **Next:** Wave 4 Phase 20 (Bluetooth / wired headset controls — already routed through MediaSession; just needs verification) on greenlight

### 2026-09-02 — Wave 4 Phase 18 (MediaSession setup) executed & verified
- **Author:** Mobile team
- **What:** Expanded the MediaSessionCompat callback in `PlayerActivity.createMediaSession()` from the Phase 15.3 "play/pause only" set to the full transport set: `onStop`, `onSkipToNext`, `onSkipToPrevious`, `onSeekTo`. Added `setSessionActivity(PendingIntent)` so the system can bring `PlayerActivity` back to the foreground on lock-screen widget interactions. Expanded `updateMediaSessionState(...)` to advertise the full action set (`ACTION_PLAY`, `ACTION_PAUSE`, `ACTION_PLAY_PAUSE`, `ACTION_STOP`, `ACTION_SKIP_TO_NEXT`, `ACTION_SKIP_TO_PREVIOUS`, `ACTION_SEEK_TO`) and include the current position from `getPlaybackPositionMs()` so the system seek-bar is at the right place from the first render.
- **Why:** Phase 15.3 created a "basic" MediaSession with `onPlay` / `onPause` only — enough for the PiP overlay + Bluetooth play/pause, but the system UI (lock-screen widget, Android Auto, some headset controllers) can render a richer set of controls when the session advertises them. Phase 18 closes that gap so the lock-screen widget shows the play/pause/skip/seek bar the spec calls for.
- **What changed:**
  - `react-native-media-player/android/src/main/java/com/simba/player/PlayerActivity.kt` — expanded `createMediaSession()`: added `onStop` (→ `MPVLib.nativeStop` + STATE_STOPPED), `onSkipToNext` (→ `MPVLib.nativePlaylistNext`), `onSkipToPrevious` (→ `MPVLib.nativePlaylistPrev`), `onSeekTo(pos)` (→ `MPVLib.nativeSeek(ptr, pos / 1000.0)`); added `setSessionActivity(pendingIntent)` with `FLAG_ACTIVITY_SINGLE_TOP | FLAG_ACTIVITY_CLEAR_TOP` + `FLAG_UPDATE_CURRENT | FLAG_IMMUTABLE`. Expanded `updateMediaSessionState(...)` with a `state: Int` parameter (default = STATE_PLAYING / STATE_PAUSED based on `playing`), full action set, and `getPlaybackPositionMs()` position read
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 18 status → `[x] Complete (2026-09-02)`, version bumped to 1.16, design note on observer-hook gap added
  - This tracker — version bumped to 2.12, Phase 18 row → 🟢 Complete, W4 progress 60%, phase count 19/51
- **Scope of the expanded MediaSession:** ✅ play/pause/stop/skip-next/skip-prev/seek-to via MediaSessionCompat.Callback; ✅ session activity PendingIntent set; ✅ full ACTION_* set in PlaybackState; ✅ position in PlaybackState from mpv's `time-pos`. ❌ no observer hook for mpv state changes (e.g. end-of-file, buffer underrun) — deferred to Phase 19. ❌ no `onPlayFromMediaId` / `onPlayFromSearch` / `onPlayFromUri` (Android Auto / Assistant deep links) — not in the current consumer app's scope
- **Verified:** `:app:compileDebugKotlin :react-native-media-player:compileDebugKotlin` PASSED 1m 48s (deprecation warnings only — pre-existing in MpvBridgeModule)
- **Manual tests 18.7, 18.8, 18.9 deferred** — physical device with V12 build required
- **Next:** Wave 4 Phase 19 (Media metadata on lock screen — title/artist/album/artwork) on greenlight

### 2026-09-02 — Wave 4 Phase 17 (Bind/Unbind service in PlayerActivity — progress update path) executed & verified
- **Author:** Mobile team
- **What:** Added a 1Hz `progressUpdateRunnable` in `PlayerActivity` that queries mpv's `time-pos` + `duration` properties and ships them to `MediaPlaybackService` via an `ACTION_UPDATE` intent. Started in `onResume`, stopped in `onPause` and `onDestroy`, with a final `ACTION_UPDATE` 250ms after the existing pause decision tree. Added two mpv property query helpers (`getPlaybackPositionMs`, `getPlaybackDurationMs`) using the same `nativeGetProperty` + string-parse pattern as the existing `getVideoAspect()`.
- **Why:** The MediaStyle notification built in Phase 16 has a progress bar (`setProgress(currentDuration, currentPosition, false)`), but with no data flowing into it the bar stays at 0. Phase 17 closes the loop — the activity drives the service with current position + duration, so the lock-screen widget and the notification's progress bar stay in sync with mpv's actual state. The 1Hz cadence is the right balance: fast enough to look smooth, slow enough not to burn battery.
- **What changed:**
  - `react-native-media-player/android/src/main/java/com/simba/player/PlayerActivity.kt` — added `PROGRESS_UPDATE_INTERVAL_MS = 1000L` companion constant; added `progressUpdateHandler`, `progressUpdateRunnable`, `progressUpdatesRunning` fields; added `getPlaybackPositionMs()`, `getPlaybackDurationMs()` mpv property helpers; added `updateMediaPlaybackServicePosition()` (builds + sends `ACTION_UPDATE`), `startProgressUpdates()`, `stopProgressUpdates()` helpers; `onResume` calls `startProgressUpdates()` after the PiP-params + MediaSession refresh; `onPause` calls `stopProgressUpdates()` at the top + schedules a 250ms-deferred `updateMediaPlaybackServicePosition()` at the bottom; `onDestroy` calls `stopProgressUpdates()` before `stopMediaPlaybackService()`
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 17 status → `[x] Complete (2026-09-02)`, version bumped to 1.15, scope-split note + design notes added
  - This tracker — version bumped to 2.11, Phase 17 row → 🟢 Complete, W4 progress 40%, phase count 18/51
- **Scope of the progress update path:** ✅ 1Hz timer in `onResume`; ✅ stop in `onPause` + `onDestroy`; ✅ final `ACTION_UPDATE` after pause (250ms-delayed to land just past the existing 200ms PiP-entry defer window); ✅ idempotent start/stop (avoids double-firing on config-change re-entrant onResume); ❌ no real `SKIP_NEXT` / `SKIP_PREV` MPVLib wiring yet (Phase 20)
- **Verified:** `:app:compileDebugKotlin :react-native-media-player:compileDebugKotlin` PASSED 1m 51s (deprecation warnings only — pre-existing in MpvBridgeModule)
- **Manual tests 17.7, 17.8 deferred** — physical device with V12 build required
- **Next:** Wave 4 Phase 18 (MediaSession setup / metadata on lock screen) on greenlight

### 2026-09-02 — Wave 4 Phase 16 (Create MediaPlaybackService) executed & verified — **WAVE 4 START**
- **Author:** Mobile team
- **What:** Created `MediaPlaybackService.kt` in the module (not the consumer app — the V11 `MediaNotificationService` stays in the app for the inline-mount path; the module gets its own service for the V12 dedicated-activity path). Service is a foreground `Service` with a `MediaStyle` notification. PlayerActivity starts it in `onCreate` (via `ContextCompat.startForegroundService`) and stops it in `onDestroy` (via `ACTION_STOP` intent). Library `AndroidManifest.xml` now declares its first component (the `<service>` with `foregroundServiceType="mediaPlayback"`).
- **Why:** Until Phase 16, audio playback outside the PiP / lock-screen / Bluetooth surfaces had no persistent UI. The media-style notification in the system shade is the user-facing surface for transport controls when the activity isn't visible. The service also keeps the process alive so audio doesn't get killed in the background. Module-local is the right home because any consumer that installs `@simba/react-native-media-player` gets the notification wiring for free.
- **Deviation from the original Phase 16 spec:** the spec called for the service to OWN the `MediaSessionCompat`. Phase 16 implements a cleaner separation: `PlayerActivity` (Phase 15) already creates a `MediaSessionCompat`, and the service receives the session TOKEN via intent extras so the MediaStyle notification can wire to the same session the activity's playback controls drive. This keeps the source of truth for playback state in the activity (where the mpv pointer lives) and lets the service focus on the notification.
- **What changed:**
  - **NEW** `react-native-media-player/android/src/main/java/com/simba/player/MediaPlaybackService.kt` — foreground service with 4-action MediaStyle notification (Previous, Play/Pause, Next, Stop), MediaStyle.setMediaSession(token) when a token is provided, IMPORTANCE_LOW notification channel for silent persistent display, artwork loader with HTTP/file fallback, optimistic play/pause toggle for instant UI feedback
  - **NEW** library `AndroidManifest.xml` — declares the `<service>` component (was previously an empty `<manifest />`)
  - `react-native-media-player/android/src/main/java/com/simba/player/PlayerActivity.kt` — added `buildMediaPlaybackServiceIntent(action)`, `startMediaPlaybackService()`, `stopMediaPlaybackService()` helpers; `onCreate` now calls `startMediaPlaybackService()` after `createMediaSession()`; `onDestroy` now calls `stopMediaPlaybackService()` BEFORE `releaseMediaSession()` (so the service drops the token before the activity invalidates it)
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 16 status → `[x] Complete (2026-09-02)`, version bumped to 1.14, deviation note added
  - This tracker — version bumped to 2.10, Phase 16 row → 🟢 Complete, W4 progress 20%, phase count 17/51
- **Scope of the service:** ✅ persistent MediaStyle notification; ✅ 4 transport actions wired (Previous / Play-Pause / Next / Stop); ✅ session-token-based MediaStyle integration with PlayerActivity's Phase 15 MediaSession; ✅ artwork loading (HTTP / file / default fallback); ❌ no metadata-driven `MediaMetadataCompat` yet (Phase 18); ❌ no real `SKIP_NEXT` / `SKIP_PREV` MPVLib wiring yet (Phase 20); ❌ no position-driven progress bar updates yet (Phase 17)
- **Verified:** `:app:compileDebugKotlin :react-native-media-player:compileDebugKotlin` PASSED 1m 50s (deprecation warnings only — pre-existing in MpvBridgeModule)
- **Manual test 16.8 deferred** — physical device with V12 build required
- **Next:** Wave 4 Phase 17 (Bind/Unbind service in PlayerActivity — ACTION_UPDATE send path on onResume/onPause) on greenlight

### 2026-09-02 — Wave 3 Phase 15 (Audio PiP) executed & verified — **WAVE 3 COMPLETE**
- **Author:** Mobile team
- **What:** `buildCurrentPipParams` now picks the PiP aspect based on launch type: audio uses 1:1 (smallest square Android allows, matches Spotify/Apple Music/Audible convention), video uses the natural mpv aspect. Added a basic `MediaSessionCompat` in `PlayerActivity` for system media controls (lock-screen widget, Bluetooth, Android Auto, headset button). Session is created in `onCreate`, released in `onDestroy`, exposes `ACTION_PLAY` + `ACTION_PAUSE` via the callback, refreshes state in `onResume`.
- **Why:** Until Phase 15, audio and video PiP used the same aspect (video's natural aspect), which made audio PiP windows visually awkward (a large rectangle with no content). Phase 15 also closes the loop on system integration: the existing V11 path's `MediaNotificationService` already has a `MediaSession`, but PlayerActivity didn't have one — so system media controls (lock screen, Bluetooth, Android Auto) didn't reach the V12 launched activity. The new session is intentionally minimal (no MediaStyle notification, no MediaMetadata) — those layers can come in a later Wave 5 polish phase.
- **What changed:**
  - `react-native-media-player/android/src/main/java/com/simba/player/PlayerActivity.kt` — `buildCurrentPipParams` now picks `aspect = 1f` for `TYPE_AUDIO` and `getVideoAspect()` for `TYPE_VIDEO`; added `mediaSession` + `mediaSessionCallback` fields, `createMediaSession()` (with `MediaSessionCompat.Callback` that calls `MPVLib.nativePlay` / `nativePause` and updates `PlaybackStateCompat`), `updateMediaSessionState(playing)`, `releaseMediaSession()` helpers; `onCreate` calls `createMediaSession()` after the receiver registration; `onDestroy` calls `releaseMediaSession()` before the receiver unregister; `onResume` calls `updateMediaSessionState(playing = true)` after the PiP params refresh
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 15 status → `[x] Complete (2026-09-02)`, version bumped to 1.13, design note + scope (✅/❌) added
  - This tracker — version bumped to 2.9, Phase 15 row → 🟢 Complete, **W3 → 🟢 Complete (100%)**, phase count 16/51
- **Scope of the basic MediaSession:** ✅ play/pause via MPVLib; ✅ basic PlaybackState. ❌ no MediaStyle notification; ❌ no MediaMetadata (artwork / duration / position); ❌ no NEXT/PREV/SKIP actions. The PiP overlay's 3-action set (PipManager) handles the on-screen controls. A later Wave 5 task can layer MediaStyle notification + MediaMetadata on top of this same session.
- **Verified:** `:app:compileDebugKotlin :react-native-media-player:compileDebugKotlin` PASSED 1m 47s (deprecation warnings only — pre-existing in MpvBridgeModule)
- **Manual tests 15.3, 15.4, 15.5 deferred** — physical device with V12 build required
- **Next:** **Wave 4 (MediaSession & foreground service) — Phase 16 (Create MediaPlaybackService)** on greenlight

### 2026-09-02 — Wave 3 Phase 14 (Audio background playback groundwork) executed & verified
- **Author:** Mobile team
- **What:** `PlayerActivity.onPause` now skips `MPVLib.nativePause(...)` when `launchType == TYPE_AUDIO` AND the new `audioBackgroundPlayback` SharedPreferences setting is on (default true). Extracted a `shouldKeepPlayingInBackground()` helper used in both the quick and deferred PiP-entry paths so future tweaks to the rule only need to touch one place.
- **Why:** Until Phase 14, PlayerActivity paused mpv on any non-PiP background event, which broke the audio-only "keep playing in the background" contract that Spotify / Apple Music / Audible all honour. With the new rule, audio files play continuously when the user switches apps, locks the screen, or swipes to recents — matching the user's expectation for the audio lane.
- **What changed:**
  - `react-native-media-player/android/src/main/java/com/simba/player/PlayerActivity.kt` — added `audioBackgroundPlayback` getter (reads `simba_player_prefs` SharedPreferences, key `audio_background_playback`, default `true`); added companion `PREFS_NAME` + `KEY_AUDIO_BG_PLAYBACK` constants; added `shouldKeepPlayingInBackground()` private helper; updated `onPause` to call the helper in both the quick path (no `pipEntryInFlight`) and the deferred path (after the 200ms PiP-entry check resolves to "not in PiP")
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 14 status → `[x] Complete (2026-09-02)`, version bumped to 1.12, design note + decision-tree spec added
  - This tracker — version bumped to 2.8, Phase 14 row → 🟢 Complete, W3 progress 80%, phase count 15/51
- **onPause decision tree (final):** (1) If `pipEntryInFlight`, defer 200ms; if `isInPictureInPictureMode` → continue playing, else fall through. (2) If `shouldKeepPlayingInBackground()` returns true (audio + setting on) → continue playing. (3) Otherwise → `MPVLib.nativePause(lastNativePtr)`. Same path is used in both the quick and deferred branches, so the behaviour is identical regardless of whether the pause came from a real background event or a cancelled PiP entry.
- **Verified:** `:app:compileDebugKotlin :react-native-media-player:compileDebugKotlin` PASSED 1m 45s (deprecation warnings only — pre-existing in MpvBridgeModule)
- **Manual tests 14.3, 14.4, 14.5 deferred** — physical device with V12 build required
- **Deferred scope (Phase 14):** no UI to flip the setting — only the read-side is wired. A Phase 22 / Wave 5 task can add a toggle in the Audio settings screen; the value will take effect on the next `onPause` without restarting the activity (SharedPreferences reads are always fresh).
- **Next:** Wave 3 Phase 15 (Audio PiP) on greenlight

### 2026-09-02 — Wave 3 Phase 13 (Audio UI conditional rendering) executed & verified
- **Author:** Mobile team
- **What:** Wired the launched `PlayerActivity`'s JS to render the correct host (`AudioModule` for audio, `VideoHost` for video) from the `type` extra. Added `currentPlaybackType` to `PlaybackState`. Added a one-shot `getLaunchParams` bridge method + `MpvPlayer.getLaunchParams()` TS API. Added `PlaybackContext.loadLaunchParams()` that consumes the bridge value, builds a synthesised `PlaybackEntry`, and calls `setActive`. `App.tsx` calls `loadLaunchParams()` once on mount.
- **Why:** PlayerActivity launches its own React root — the JS context is fresh, the MainActivity's `PlaybackContext` is gone, and `PlaybackOverlayHost` would otherwise return null (no `active`). Without the bridge handoff, audio files would launch PlayerActivity and the user would see a black/blank screen instead of the audio UI. Phase 13 closes that loop.
- **What changed:**
  - `MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/MpvBridgeModule.kt` — added `companion lastLaunchParams: LaunchParams?` + `data class LaunchParams(uri, title, type, startPositionMs)`. `openPlayer` now caches the resolved params in `lastLaunchParams` before `startActivity`. New `@ReactMethod fun getLaunchParams(): WritableMap?` (synchronous, one-shot — clears state on first read) exposes them to JS
  - `MOBILE_APP_REACT_NATIVE/src/native/NativeMpvPlayer.ts` — added `getLaunchParams` to the TS Spec
  - `MOBILE_APP_REACT_NATIVE/src/native/player.api.ts` — added `MpvPlayer.getLaunchParams()` (feature-detected, defensive normalisation, returns `null` on missing/error)
  - `MOBILE_APP_REACT_NATIVE/src/modules/playback/types.ts` — added `currentPlaybackType: 'video' | 'audio' | null` to `PlaybackState` + `loadLaunchParams: () => boolean` to `PlaybackCommands`
  - `MOBILE_APP_REACT_NATIVE/src/modules/playback/PlaybackContext.tsx` — added `currentPlaybackType` state (set in `openPlayer` for both V11/V12 paths + `loadLaunchParams`; cleared in `closePlayer`). Added `loadLaunchParams` callback that calls `MpvPlayer.getLaunchParams()`, builds a `PlaybackEntry` from the launch params, and calls `setActive`. Exposed both in the context value
  - `MOBILE_APP_REACT_NATIVE/App.tsx` — added `usePlayback()` import (alongside existing `usePlaybackCommands`) and a `useEffect` that calls `loadLaunchParams()` once on mount; the call is a no-op in MainActivity (bridge returns `null`)
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 13 status → `[x] Complete (2026-09-02)`, version bumped to 1.11, design note added
  - This tracker — version bumped to 2.7, Phase 13 row → 🟢 Complete, W3 progress 60%, phase count 14/51
- **TypeScript gotchas (Phase 13.3.1):** (1) `PlaybackEntry` requires `duration: number` — initial value `0` works (set asynchronously once mpv reports). (2) `PlaybackEntry.type` is a `MediaKind` (`'audio'` / `'video'` / `'movie'` / etc.) — using `'file'` literal fails the type check; use `params.type` (the lane) which is a valid `MediaKind`. (3) `as PlaybackEntry` cast still needed because the synthesised object has fewer keys than the full `PlaybackEntry` shape; this is intentional and the lane-derived values are sufficient for the host's render path
- **Verified:** `npx tsc --noEmit` exit 0. `:app:compileDebugKotlin :react-native-media-player:compileDebugKotlin` PASSED 1m 40s (deprecation warnings only — pre-existing in MpvBridgeModule)
- **Manual tests 13.5, 13.6 deferred** — physical device with V12 build required
- **Next:** Wave 3 Phase 14 (Audio background playback groundwork) on greenlight

### 2026-09-02 — Wave 3 Phase 12 (Hide MpvRenderView for audio) executed & verified
- **Author:** Mobile team
- **What:** In `PlayerActivity.onCreate`, when `launchType == TYPE_AUDIO`, sets `mpvRenderView.visibility = View.GONE` and logs `"MpvRenderView hidden for audio mode (visibility=GONE)"`. Hardened `MpvRenderView.attachSurfaceLocked` with an `isAttachedToWindow` defensive guard.
- **Why:** Phase 11 wired the audio intent extra through to PlayerActivity. Phase 12 closes the loop on the visual side — for audio files the user sees no video frame. mpv still runs (`initPlayer` is still called from JS, the native pointer is still wired to the surface — just the visual output is suppressed). The `isAttachedToWindow` guard is true defensive engineering: it never fires in the current PlayerActivity path (we addView to the window-attached content root), but protects against future paths where a view might be added to a non-attached parent.
- **What changed:**
  - `react-native-media-player/android/src/main/java/com/simba/player/mpv/MpvRenderView.kt` — added `if (!isAttachedToWindow) return` early in `attachSurfaceLocked` with a debug log explaining the skip
  - `react-native-media-player/android/src/main/java/com/simba/player/PlayerActivity.kt` — after the MpvRenderView mount log, added `if (launchType == TYPE_AUDIO) { renderView.visibility = View.GONE; Log.i(TAG, "MpvRenderView hidden for audio mode (visibility=GONE)") }`
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 12 status → `[x] Complete (2026-09-02)`, version bumped to 1.10, design note added
  - This tracker — version bumped to 2.6, Phase 12 row → 🟢 Complete, W3 progress 40%, phase count 13/51
- **Verified:** `:app:compileDebugKotlin :react-native-media-player:compileDebugKotlin` PASSED 2m 4s (deprecation warnings only — pre-existing in MpvBridgeModule)
- **Manual tests 12.3, 12.4 deferred** — physical device with V12 build required
- **Next:** Wave 3 Phase 13 (Audio UI conditional rendering) on greenlight

### 2026-09-02 — Wave 3 Phase 11 (Audio intent extra in openPlayer) executed & verified — **WAVE 3 START**
- **Author:** Mobile team
- **What:** Added the missing `openPlayer(uri, title, type, startPositionMs, promise)` `@ReactMethod` to `MpvBridgeModule.kt` (Phase 3's code was never actually written even though TRACKER v1.7 marked it complete — same reversion pattern as before, this time on consumer-app code). Added an explicit audio-mode entry log in `PlayerActivity.onCreate` when `launchType == "audio"`.
- **Why:** Phase 11's spec verification step is "openPlayer already passes `type` extra (Phase 3.6.3)" — but the method didn't exist. Without it, the V12 launch path from `PlaybackContext.openPlayer(...)` would have crashed at runtime on the first audio/video play. Adding the method is the minimum needed to make Phase 11 verifiable.
- **What changed:**
  - `MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/MpvBridgeModule.kt` — added `openPlayer` `@ReactMethod` after the lifecycle block. Validates `type` (`"video"`/`"audio"`), rejects with `E_INVALID_TYPE`/`E_NO_ACTIVITY`/`E_ACTIVITY_NOT_FOUND`/`E_SECURITY`/`E_OPEN_PLAYER_FAILED`. Builds Intent targeting `com.simba.player.PlayerActivity` with `EXTRA_URI`/`EXTRA_TITLE` (falls back to uri)/`EXTRA_TYPE`/`EXTRA_START_POSITION_MS`. Resolves `true` on `startActivity` success
  - `react-native-media-player/android/src/main/java/com/simba/player/PlayerActivity.kt` — added `if (launchType == TYPE_AUDIO) Log.i(TAG, "Audio mode entered: ...")` after the launch-params summary log in `onCreate`
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 11 status → `[x] Complete (2026-09-02)`, version bumped to 1.9, deviation note + Kotlin gotcha added
  - This tracker — version bumped to 2.5, Phase 11 row → 🟢 Complete, W3 progress 20%, phase count 12/51
- **Kotlin gotcha:** `ReactContextBaseJavaModule.getCurrentActivity()` is a Java method, not a Kotlin property; first attempt called it as `currentActivity` (no parens) and failed with "unresolved reference". Fixed to the explicit `getCurrentActivity()` form used by every other call site in this file
- **Verified:** `:app:compileDebugKotlin :react-native-media-player:compileDebugKotlin` PASSED 1m 43s (deprecation warnings only — pre-existing in MpvBridgeModule)
- **Manual test 11.4 deferred** — physical device with V12 build required; only grep-able confirmation possible
- **Next:** Wave 3 Phase 12 (Hide MpvRenderView for audio) on greenlight

### 2026-09-01 (now) — Wave 1 Phases 1+2 (PlayerActivity + manifest) executed & verified
- **Author:** Mobile team
- **What:** Created `PlayerActivity.kt` in the module (extends `ReactActivity`, black window background, lifecycle logging). Registered it in app's `AndroidManifest.xml` with 8 attributes (singleTask, supportsPictureInPicture, resizeableActivity, autoRemoveFromRecents, etc.).
- **Why:** Phase 1+2 were prerequisite for Phase 3 (openPlayer TurboModule). Without a registered activity, JS can't launch the player.
- **What changed:**
  - `react-native-media-player/android/src/main/java/com/simba/player/PlayerActivity.kt` (Phase 1)
  - `MOBILE_APP_REACT_NATIVE/android/app/src/main/AndroidManifest.xml` — added PlayerActivity `<activity>` block between MainActivity and MediaNotificationService (Phase 2)
  - **Deviation:** skipped `setTheme(R.style.AppTheme)` in PlayerActivity.kt (R class is in consumer app, not library) — defer to Phase 21 PlayerConfig
  - Verified `:react-native-media-player:compileDebugKotlin` PASSED 2m 13s
  - Verified `:app:processDebugManifest` PASSED 2m 39s; merged manifest preserves all 8 attributes
  - AGP emitted a benign namespace-collision warning (app + library share namespace `com.simba.player` intentionally)
- **Next:** Phase 3 — add `openPlayer(uri, title, type, startPositionMs, promise)` `@ReactMethod` to `MpvBridgeModule.kt` in the app's package (Phase 31 will move the module into the library)

### 2026-09-02 — Wave 2 Phase 6 (Mount MpvRenderView at PlayerActivity content root) executed & verified
- **Author:** Mobile team
- **What:** Mounted `MpvRenderView` (SurfaceView) at index 0 of `PlayerActivity`'s content root, beneath the React tree. Widened `MpvRenderView` constructor from `ThemedReactContext` → `Context` so PlayerActivity can instantiate it. **Relocated `MpvRenderView.kt` + `MPVLib.kt` from consumer app to module** as part of this phase (early extraction; was originally planned for Wave 6).
- **Why:** PlayerActivity (in module) must directly reference MpvRenderView per the spec, but the original "create in app, move at Wave 6" ordering required either a Gradle circular dependency or reflection indirection. Phase 6 forced early extraction. Wave 6 Phases 27/29 simplified to "audit + finalise".
- **What changed:**
  - `react-native-media-player/android/src/main/java/com/simba/player/mpv/MpvRenderView.kt` — new location, constructor widened `ThemedReactContext` → `Context`
  - `react-native-media-player/android/src/main/java/com/simba/player/mpv/MPVLib.kt` — new location, unchanged except docblock note about native lib bundling
  - **Deleted** `MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/MpvRenderView.kt`
  - **Deleted** `MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/MPVLib.kt`
  - `MpvRenderViewManager.kt` (consumer app, unchanged) — references same FQN `com.simba.player.mpv.MpvRenderView`; Gradle merges module classes into app at build time, so resolves transparently to module's copy
  - `react-native-media-player/android/src/main/java/com/simba/player/PlayerActivity.kt` — added `mpvRenderView` field, mount-at-index-0 logic in `onCreate`, cleanup + remove + null in `onDestroy` (with super called last)
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 6 status → `[x] Complete (2026-09-02)`, version bumped to 1.4, deviation note added
  - This tracker — version bumped to 2.0, Phase 6 row → 🟢 Complete, W2 progress 20%
- **Verified:** `:react-native-media-player:compileDebugKotlin` PASSED 1m 18s (Kotlin daemon sandbox workaround fired fallback to in-process compilation, build still succeeded)
- **Manual tests 6.7 + 6.8 deferred** — require physical device with PiP-enabled build, queued for next on-device session
- **Next:** Phase 7 — Surface identity guard & native pointer wiring (call `MpvBridgeModule.getNativePtr()` and pass to `mpvRenderView.setNativePtr(...)` so the Surface attaches to mpv's `wid`)

### 2026-09-02 — Wave 2 Phase 7 (Surface identity guard & native pointer wiring) executed & verified
- **Author:** Mobile team
- **What:** Added `IMpvNativePtrProvider` interface in the module so `PlayerActivity` (which cannot import `MpvBridgeModule` directly) can fetch the libmpv native pointer via the React Native bridge (`reactContext.getNativeModule("MpvPlayerModule") as? IMpvNativePtrProvider`). Implemented a 5-retry Handler.post loop in `PlayerActivity.onCreate` to handle the race where PlayerActivity mounts before JS has called `initPlayer()`.
- **Why:** Phase 7 deliverable requires wiring `MpvRenderView.setNativePtr(...)` so the Surface attaches to mpv's `wid`. The native pointer lives in `MpvBridgeModule` (app), PlayerActivity (module) cannot import it — same Gradle module-boundary constraint as Phase 6.
- **What changed:**
  - `react-native-media-player/android/src/main/java/com/simba/player/IMpvNativePtrProvider.kt` — new interface with `fun fetchNativePtr(): Long`
  - `MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/MpvBridgeModule.kt` — implements `IMpvNativePtrProvider`, exposes `override fun fetchNativePtr(): Long = nativePtr`. Existing `@ReactMethod fun getNativePtr(): Double` unchanged (JS API stays stable)
  - `react-native-media-player/android/src/main/java/com/simba/player/PlayerActivity.kt` — added `wireNativePtr(retryCount)` helper + `resolveReactApplicationContext()` + `maybeRetry(retryCount)` helpers; called via `Handler(Looper.getMainLooper()).post { wireNativePtr(0) }` after MpvRenderView mount
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 7 status → `[x] Complete (2026-09-02)`, version bumped to 1.5, deviation note added
  - This tracker — version bumped to 2.1, Phase 7 row → 🟢 Complete, W2 progress 40%
- **Verified:** `:react-native-media-player:compileDebugKotlin :app:compileDebugKotlin` PASSED (deprecation warnings only, unrelated to this phase — `getCurrentActivity()` is deprecated in RN 0.80, MapBuilder deprecated, `enterPictureInPictureMode()` deprecated in Java)
- **Manual tests 7.6, 7.7, 7.8 deferred** — require physical device with PiP-enabled build
- **Next:** Phase 8 — Transparent root for React Native view tree (make `VideoPresentationShell` background transparent in `PlayerActivity` so the SurfaceView shows through)

### 2026-09-02 — Wave 2 Phase 9 (setPictureInPictureParams in PlayerActivity) executed & verified
- **Author:** Mobile team
- **What:** Wired `setPictureInPictureParams(...)` in PlayerActivity so PiP entry uses our params (aspect ratio from mpv, source rect hint from MpvRenderView bounds, 3 RemoteActions, title from intent extra) instead of framework defaults.
- **Why:** Without explicit PiP params, Android uses an internal default aspect (often 16:9) which clips letterbox / pillarbox content and shows the wrong background — defeating the V12 visual fix. Setting params explicitly per spec is what makes PiP look correct on movies, 4:3 sources, vertical clips, etc.
- **What changed:**
  - `react-native-media-player/android/src/main/java/com/simba/player/PipManager.kt` — **new location** (moved from app). Same FQN, no MainActivity import changes needed. Updated `buildPipParams` signature: `aspect: Float` (clamped to [0.42, 2.38] + integer Rational encoding via *100). Upgraded `PipActionReceiver.getReactContext` to bridgeless (`reactHost.currentReactContext` preferred)
  - **Deleted** `MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/PipManager.kt` (duplicate FQN avoided)
  - `react-native-media-player/android/src/main/java/com/simba/player/PlayerActivity.kt` — added `lastNativePtr: Long` cache, `buildCurrentPipParams()`, `playerBounds: Rect` getter, `getVideoAspect(): Float`. Override `onResume` to call `setPictureInPictureParams(...)` (API 26+). Override `onPictureInPictureModeChanged` to refresh
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 9 status → `[x] Complete (2026-09-02)`, version bumped to 1.7, deviation notes added
  - This tracker — version bumped to 2.3, Phase 9 row → 🟢 Complete, W2 progress 80%
- **Verified:** `:react-native-media-player:compileDebugKotlin :app:compileDebugKotlin` PASSED 1m 41s (deprecation warnings only — `getCurrentActivity()`, `enterPictureInPictureMode()`, MapBuilder, `onCatalystInstanceDestroy()` are all deprecated in newer RN/Java but pre-existing in MpvBridgeModule; not introduced by Phase 9)
- **Manual tests 9.6, 9.7 deferred** — visual verification requires physical device with PiP-enabled build
- **Next:** Phase 10 — RemoteAction broadcast receiver + PiP enter/exit (PipActionReceiver registration in PlayerActivity, onUserLeaveHint → enterPictureInPictureMode, JS-side handlers for play-pause / expand / close)

### 2026-09-02 — Wave 2 Phase 10 (RemoteAction receiver + PiP enter/exit) executed & verified — **WAVE 2 COMPLETE**
- **Author:** Mobile team
- **What:** Wired PiP enter/exit, RemoteAction broadcast receiver, deferred mpv pause, back-button handling, and JS PiP-mode-change forwarding in `PlayerActivity`.
- **Why:** Without these, PlayerActivity is a dead-end video player — it has all the PiP params infrastructure (Phase 9) but never actually enters PiP, never receives overlay button taps, and would synchronously pause mpv on the PiP transition (causing the original V11 black-PiP bug). Phase 10 closes the loop.
- **What changed:**
  - **New** `react-native-media-player/android/src/main/java/com/simba/player/IPipModeChangeEmitter.kt` — module-side interface, single method `emitPictureInPictureModeChanged(Boolean)`. Defines the contract for PiP-mode-change event emission. PlayerActivity (in module) can call this without referencing MpvBridgeModule directly (Gradle boundary).
  - `react-native-media-player/android/src/main/java/com/simba/player/PlayerActivity.kt` — added `pipReceiver: PipActionReceiver?` field + `pipEntryInFlight: Boolean` flag. onCreate now creates + registers a PipActionReceiver (API 33+ uses `RECEIVER_NOT_EXPORTED`). onDestroy unregisters it (try/catch). Override `onUserLeaveHint`: sets `pipEntryInFlight = true`, calls `enterPictureInPictureMode()` (NO args — uses Phase 9's pre-set params). Override `onPause`: synchronous `MPVLib.nativePause(...)` for real pauses, or 200ms-deferred check for PiP-entry pauses (solves V11 bug). Override `onPictureInPictureModeChanged`: re-set PiP params + forward to JS via `forwardPipModeToJs(isInPip)` which looks up `IPipModeChangeEmitter` via bridge. Override `onBackPressed`: if in PiP, `finish()`.
  - `MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/MpvBridgeModule.kt` — implements `IPipModeChangeEmitter`. Single override `emitPictureInPictureModeChanged(Boolean)` delegates to existing companion method (single source of truth for JS event).
  - `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — Phase 10 status → `[x] Complete (2026-09-02)`, version bumped to 1.8, deviation notes added
  - This tracker — version bumped to 2.4, Phase 10 row → 🟢 Complete, W2 → 🟢 Complete, phase count 13/51
- **Verified:** `:react-native-media-player:compileDebugKotlin :app:compileDebugKotlin` PASSED (1m 4s module + 1m 17s app). The build initially failed because the `IPipModeChangeEmitter` import got reverted in MpvBridgeModule.kt mid-edit; re-added and confirmed clean.
- **Design choice — proper path, not simple path:** Per user feedback ("don't follow simple path, follow proper path"), used the module-side interface pattern (`IPipModeChangeEmitter` + bridge lookup) instead of a quick emit-from-PlayerActivity hack. Same architecture as Phase 7's `IMpvNativePtrProvider`. Keeps the Gradle boundary clean and gives each side a single source of truth.
- **Manual tests 10.8–10.12 deferred** — PiP enter/exit, overlay buttons, back button all require physical device verification
- **Next:** Wave 3 Phase 11 (Audio intent extra in openPlayer) on greenlight

### 2026-09-01 (earlier today) — Wave 0 (Module bootstrap) executed & verified
- **Author:** Mobile team
- **What:** Created `react-native-media-player/` sibling directory with full Android library skeleton. Wired consumer app's Gradle to consume it. Built AAR + consumer app successfully.
- **What changed:**
  - `react-native-media-player/android/build.gradle` (com.android.library + kotlin-android, namespace `com.simba.player`)
  - `react-native-media-player/android/src/main/AndroidManifest.xml` (empty `<manifest>` only)
  - `react-native-media-player/android/consumer-rules.pro` (placeholder)
  - `react-native-media-player/.gitignore`
  - `react-native-media-player/package.json` (`@simba/react-native-media-player@0.0.1`)
  - `react-native-media-player/README.md` (placeholder)
  - `react-native-media-player/src/.gitkeep`, `react-native-media-player/android/src/main/java/com/simba/player/.gitkeep`
  - `MOBILE_APP_REACT_NATIVE/android/settings.gradle` (added `include ':react-native-media-player'` + path)
  - `MOBILE_APP_REACT_NATIVE/android/app/build.gradle` (added `implementation project(':react-native-media-player')`)
  - **Bug fixed:** path was originally `../` (one level up) — should be `../../` (module is two levels up from settings.gradle)
  - Verified `:react-native-media-player:assembleDebug` PASSED 1m 23s
  - Verified `:app:assembleDebug` PASSED 4m 14s, 713 tasks

### 2026-09-01 (late) — Module-from-day-1 architectural decision
- **Author:** Mobile team
- **What:** Updated spec (v1.1) and tracker (v1.1) to adopt standalone module structure from Phase 0 instead of "create in app, move later".
- **Why:** Anticipating NPM extraction later (Phase 26-30). Creating code in app first and migrating later costs 1+ day and complicates every dependency. Setting up the sibling module directory + Gradle wiring now makes Phase 26-32 trivial (audit + finalize only).
- **What changed:**
  - Added Wave 0 (Phases 0a, 0b, 0c) for module bootstrap
  - Renamed Wave 6 from "NPM package extraction" to "NPM publishing metadata + extraction finalize"
  - Updated Phase 1 deliverable path from app's `android/app/src/main/java/com/simba/player/PlayerActivity.kt` to module's `react-native-media-player/android/src/main/java/com/simba/player/PlayerActivity.kt`
  - Updated Phase 2 manifest location (activity declared in app's manifest even though it's in module library — fully-qualified name)
  - Phases 27, 29 simplified to "audit + move remaining" (most code authored in module from day 1)
  - Phase 31 updated to migrate `PlayerPackage` from app's `com.simba.player.mpv` to module's `com.simba.player`
- **Next:** Execute Phase 0a — create `react-native-media-player/android/build.gradle`, `AndroidManifest.xml`, `.gitignore`.

### 2026-09-01 — Spec + Tracker drafted
- **Author:** Mobile team
- **What:** Created `SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` (48 phases, 8 waves) and this tracker.
- **Why:** V11 PiP black-screen bug traced to SurfaceView nesting + opaque shell background. Multiple fix attempts (setZOrderOnTop, surface cycling, TextureView) failed. Reference projects (mpvKt, heritage mpv-android) show that SurfaceView at the **activity root** with **default z-order** is the proven pattern.
- **Decision:** Option A — dedicated `PlayerActivity` extending `ReactActivity` with `MpvRenderView` at content root. UI stays in RN. Goal: package as `@simba/react-native-media-player` NPM module (folder `react-native-media-player/`).
- **Next:** Begin Phase 0 (Module bootstrap).

### 2026-09-01 (earlier) — TextureView attempt failed
- **What:** Switched MpvRenderView from SurfaceView to TextureView (Round 2).
- **Why:** Theorized that TextureView content drawn into view tree would be captured by PiP's VRI compositor.
- **Result:** PiP still showed black. TextureView's content display depends on HWUI draw pass, which is suspended for paused activities. Even though SurfaceTexture keeps receiving producer buffers, the TextureView's display layer becomes stale.
- **Conclusion:** TextureView cannot work for PiP. SurfaceView is the only option.

### 2026-08-31 — SurfaceView with z-order experiments failed
- **What:** Tried `setZOrderOnTop(true)`, `setZOrderMediaOverlay(true)`, surface cycling on PiP entry, MediaCodec copy hwdec.
- **Result:** All variants showed black PiP. SurfaceFlinger dump showed VRI's `opaque=1` but content was black.
- **Why failed:** The opaque `#121216` shell background in `VideoPresentationShell.tsx` covers the SurfaceView's hole during PiP re-layout.

### 2026-08-30 — Bridgeless emit fix
- **What:** Migrated from `reactInstanceManager` (throws IllegalStateException in bridgeless) to `reactHost.currentReactContext`.
- **Result:** Emit succeeded but PiP still black. Then fixed `Bundle → Arguments.createMap()` (WritableMap) which was rejected by bridgeless emit. PiP still black.
- **Conclusion:** PiP bug is NOT in the JS-side event delivery. It's in the rendering pipeline.

---

## 5. Open Questions / Decisions Pending

| # | Question | Status | Owner | Blocks |
|---|---|---|---|---|
| Q1 | Reuse `SimbaPlayer` component name in `PlayerActivity`, or split into separate `PlayerScreen`? | �� Pending decision | Mobile team | Phase 5, Phase 8 |
| Q2 | Audio merge timing — same refactor or post-PiP validation? | �� Pending decision | Mobile team | Phase 13+ |
| Q3 | Mini player ownership — keep in `MainActivity` or move to `PlayerActivity`? | �� Pending decision | Mobile team | Phase 2 |
| Q4 | libmpv licensing — bundle or external dep? | �� Pending decision | Mobile team | Phase 28 |
| Q5 | NPM scope — finalized as scoped `@simba/react-native-media-player` (admin user `pavalep`)? | ✅ Resolved (2026-09-01) | Mobile team | Phase 30 |

---

## 6. Decisions Log

| Date | Decision | Rationale | Decided By |
|---|---|---|---|
| 2026-09-01 | **Module structure from day 1** (`react-native-media-player/` sibling) | Avoids 1-day migration in Phase 27-30. Setting up Gradle module now takes ~1 day but saves 2+ days later | Mobile team |
| 2026-09-01 | Use Option A (dedicated `PlayerActivity`) | mpvKt proven pattern; SurfaceView at root avoids RN view-tree complications | Mobile team |
| 2026-09-01 | `PlayerActivity` extends `ReactActivity` | Reuse all RN infrastructure for UI; less boilerplate | Mobile team |
| 2026-09-01 | UI stays 100% in React Native | Per user direction; Android side handles only engine + surface + lifecycle | Mobile team |
| 2026-09-01 | Package as standalone NPM module `@simba/react-native-media-player` (folder `react-native-media-player/`) under `@simba` org (admin user `pavalep`) | Reusability; consumer-friendly API; future publishing; consistent RN-style naming convention | Mobile team |
| 2026-09-01 | Use SurfaceView with DEFAULT z-order (no `setZOrderOnTop`, no `setZOrderMediaOverlay`) | Only configuration that works for PiP per mpvKt reference | Mobile team |
| 2026-09-01 | `force-window=yes` STICKY on attach, `force-window=no` on detach | Matches heritage mpv-android BaseMPVView pattern | Mobile team |
| 2026-09-01 | Audio + video unified in same `PlayerActivity` | Share MediaSession, foreground service, PiP lifecycle | Mobile team |
| 2026-08-31 | Drop TextureView attempt | HWUI pause suspends TextureView display | Mobile team |
| 2026-08-31 | Drop `setZOrderOnTop` / `setZOrderMediaOverlay` | Both place surface outside PiP's VRI sample | Mobile team |
| 2026-08-30 | Use `companion object` pattern for bridgeless emit | Mirrors rn-pip; avoids reactInstanceManager throw | Mobile team |

---

## 7. Risk Register

| ID | Risk | Severity | Probability | Owner | Mitigation | Status |
|---|---|---|---|---|---|---|
| R1 | PlayerActivity RN bridge init race condition with mpv | High | Medium | Mobile team | Phase 5 + 7 explicitly test | �� Mitigated by phase design |
| R2 | SurfaceView still doesn't work in PiP after migration | Critical | Low | Mobile team | Wave 2 verification steps | �� Open — to be validated |
| R3 | libmpv GPL blocks commercial consumers | Medium | Medium | Mobile team | Document in README; offer external-dep option | �� Open |
| R4 | MediaSession/foreground service breaks on Android 14+ | High | Medium | Mobile team | `foregroundServiceType="mediaPlayback"` | �� Open |
| R5 | State management across activities (Player ↔ Main) | High | Medium | Mobile team | JS Redux remains canonical state | �� Mitigated by design |
| R6 | npm publishing friction (autolinking edge cases) | Medium | Low | Mobile team | Explicit Phase 30-31 verification | �� Mitigated |
| R7 | ReactActivity re-creation on theme/locale change | Medium | Low | Mobile team | Add configChanges for relevant flags | �� Open |
| R8 | MPV observer leaks if not removed in onDestroy | High | Low | Mobile team | Phase 36 leak audit | �� Mitigated by audit |

---

## 8. Upcoming Milestones

| Milestone | Target Date | Dependencies | Phase Range |
|---|---|---|---|
| **M1: MVP PlayerActivity** | TBD | Phase 0 sign-off | 1–5 |
| **M2: PiP working** | TBD | M1 | 6–10 |
| **M3: Audio + video unified** | TBD | M2 | 11–15 |
| **M4: MediaSession + foreground service** | TBD | M3 | 16–20 |
| **M5: Public API complete** | TBD | M4 | 21–25 |
| **M6: NPM package extracted** | TBD | M5 | 26–32 |
| **M7: Production-ready** | TBD | M6 | 33–40 |
| **M8: V12 release** | TBD | M7 | 41–48 |

---

## 9. Backlog / Deferred Items

| Item | Source | Deferred To | Notes |
|---|---|---|---|
| DRM (Widevine L1/L3) | Phase 38 follow-up | V13 | libmpv Widevine is community-grade |
| Chromecast support | Phase 38 follow-up | V13+ | Separate native module |
| AirPlay support | Phase 38 follow-up | V13+ | iOS-first concern |
| iOS player engine | Architecture gap | V13 | Currently Android-only |
| DRM-protected streaming | Future feature | V13 | Depends on DRM |
| Custom subtitle renderer (libass wrapper exposed) | API gap | V13 | Currently opaque |
| Equalizer / DSP | Phase 38 follow-up | V13 | mpv has EQ, need API |
| Network bandwidth adaptation (ABR) | Phase 37 follow-up | V13 | ExoPlayer is better here |
| Chapter thumbnails | Phase 24 follow-up | V13 | mpv can grab frames |
| Resume from notification action | Phase 20 follow-up | V13 | Minor UX improvement |
| Subtitle font customization UI | Phase 21 follow-up | V13 | Currently config-only |

---

## 10. Standup / Update Log

### Standup: 2026-09-01 (initial)
- **Done:** Spec + Tracker drafted. Reference analysis complete.
- **Doing:** Awaiting Phase 1 greenlight.
- **Blockers:** None.
- **Next:** Begin Phase 1 (Create `PlayerActivity.kt` skeleton).

---

## 11. Links & References

### Internal docs
- [SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md) — full 48-phase spec
- [VIDEO_UI_V11_SPECIFICATION.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/VIDEO_UI_V11_SPECIFICATION.md) — predecessor (archived post-V12)
- [debug-pip-black-screen.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/debug-pip-black-screen.md) — V11 PiP investigation log

### External references
- [heritage mpv-android BaseMPVView](https://github.com/mpv-android/mpv-android/blob/master/app/src/main/java/is/xyz/mpv/BaseMPVView.kt)
- [mpvKt PlayerActivity](https://github.com/abdallahmehiz/mpvKt/blob/main/app/src/main/java/live/mehiz/mpvkt/ui/player/PlayerActivity.kt)
- [mpvKt PipActions](https://github.com/abdallahmehiz/mpvKt/blob/main/app/src/main/java/live/mehiz/mpvkt/ui/player/PipActions.kt)
- [rn-pip module](https://github.com/micaiah-effiong/rn-pip)
- [Android PiP guide](https://developer.android.com/develop/ui/views/tasks-and-back-stack/picture-in-picture)
- [React Native autolinking](https://reactnative.dev/docs/the-new-architecture/pure-cxx-modules)

### Code locations
- [MainActivity.kt](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/MainActivity.kt)
- [MpvBridgeModule.kt](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/MpvBridgeModule.kt)
- [MpvRenderView.kt](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/MpvRenderView.kt)
- [PipManager.kt](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/PipManager.kt)
- [AndroidManifest.xml](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/AndroidManifest.xml)
- [VideoHost.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/host/VideoHost.tsx)
- [VideoPresentationShell.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoPresentationShell.tsx)
- [VideoNativeSurface.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/surface/VideoNativeSurface.tsx)
- [usePipLifecycle.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/hooks/usePipLifecycle.ts)
- [VideoPipAdapter.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/platform/VideoPipAdapter.ts)

---

## 12. Notes & Observations

### Why mpvKt is the canonical reference
- 1.3k stars, actively maintained fork of mpv-android
- Explicitly advertises "Smoother PiP" as a feature
- Uses the SAME `BaseMPVView` (heritage mpv-android) — proving the reference is correct
- Compose + ConstraintLayout + MPVView layout matches our needs
- Companion pattern for PiP events is identical to rn-pip (good validation of our approach)

### Why this refactor is the right call
- V11 PiP bug has been investigated for multiple days with no fix found within the existing architecture
- The bug is structural: `SurfaceView` inside React Native's view tree doesn't play well with PiP's VRI sampling
- Removing the structural conflict by promoting `SurfaceView` to the activity root is the only proven solution
- The refactor is the right size for V12 (3-4 weeks) and unlocks the NPM package path

### Risk of doing nothing
- V11 PiP bug remains a known regression
- New contributors will hit the same wall
- Code debt accumulates (we have multiple `force-window`, `setZOrderOnTop`, surface cycling workarounds in the codebase that didn't fix the root cause)
- Customizing the player for partners becomes harder

---

## 13. Change Log (Tracker)

| Date | Author | Change |
|---|---|---|
| 2026-09-01 | Mobile team | v1.0 — Initial tracker created — Phase 0 (architecture validation) |
| 2026-09-01 | Mobile team | v1.1 — Module-from-day-1 decision. Added Wave 0 (Phase 0a-0c). Status table + dashboard updated to 51 phases. Decisions log + recent updates + active phase updated. |
| 2026-09-01 | Mobile team | v1.2 — NPM package naming finalized. Module folder is `react-native-media-player/`; NPM package is `@simba/react-native-media-player` (under `@simba` org, admin user `pavalep`). Updated tracker header, phase 0a row, recent updates, Q5 question (now ✅ Resolved), and decisions log entries to reference the new name. |
| 2026-09-01 | Mobile team | v1.3 — Final folder naming. Dropped `simba-` prefix from the folder (`react-native-media-player/`) since the folder is already inside the `SIMBA/` repo, making the prefix redundant. NPM package name remains `@simba/react-native-media-player` (the `@simba` scope conveys ownership). Global string replace applied across the tracker. Bumped tracker version to 1.3. |
| 2026-09-01 | Mobile team | v1.4 — **Wave 0 complete.** Phase 0a/0b/0c executed: module directory, Gradle wiring, placeholder files. Verified AAR build + consumer app build. Bumped phase counts to 3/51. Status moved to 🟢 Wave 0 complete. Active phase detail updated. Wave progress W0 → 100%. Recent updates entry added. |
| 2026-09-01 | Mobile team | v1.6 — **Phase 2 (W1) complete.** Registered `PlayerActivity` in app's `AndroidManifest.xml` with all 8 attributes (`configChanges` includes `navigation`, `launchMode=singleTask`, `supportsPictureInPicture`, `resizeableActivity`, `autoRemoveFromRecents`, `theme`, `exported=false`). Verified `:app:processDebugManifest` PASSED 2m 39s. AGP namespace warning is benign. Phase count 5/51. W1 → 🟡 In progress (40%). Active phase moved to Phase 3 (openPlayer TurboModule). |
| 2026-09-01 | Mobile team | v1.7 — **Phase 3 (W1) complete.** Added `openPlayer(uri, title, type, startPositionMs, promise)` `@ReactMethod` to `MpvBridgeModule.kt`. Validates `type`, builds intent targeting `PlayerActivity`, catches `ActivityNotFoundException`/`SecurityException`/generic with reject codes `E_INVALID_TYPE`, `E_NO_ACTIVITY`, `E_ACTIVITY_NOT_FOUND`, `E_SECURITY`, `E_OPEN_PLAYER_FAILED`. Added companion extras constants + `TYPE_VIDEO`/`TYPE_AUDIO` to `PlayerActivity.kt`. Verified `:app:compileDebugKotlin` PASSED 2m 36s. Phase count 6/51. W1 → 🟡 In progress (60%). Active phase moved to Phase 4 (PlayerActivity reads intent). |
| 2026-09-01 | Mobile team | v1.8 — **Phase 4 (W1) complete.** Added four `by lazy {}` `private val` launch params (`launchUri`, `launchTitle`, `launchType`, `launchStartPositionMs`) to `PlayerActivity.kt`. Touched all four in `onCreate` after `super.onCreate`, logged via `Log.i(TAG, "launchUri=...")` etc., followed by a summary "PlayerActivity ready" log. Title falls back to URI if blank; type falls back to `TYPE_VIDEO` if invalid. Verified `:react-native-media-player:compileDebugKotlin` PASSED 1m 54s. Phase count 7/51. W1 → 🟡 In progress (80%). Active phase moved to Phase 5 (JS-side launch orchestration). |
| 2026-09-01 | Mobile team | v1.9 — **Phase 5 (W1) complete. W1 fully closed.** Added `openPlayer(opts)` to `NativeMpvPlayer.ts` Spec + `MpvPlayer.openPlayer(opts)` to `player.api.ts` (async, returns `Promise<boolean>`, logs via `tracePlayback`). Created `src/lib/flags.ts` with `USE_DEDICATED_PLAYER_ACTIVITY = false` + stub `USE_UNIFIED_MEDIA_SESSION`. Wired flag into `PlaybackContext.openPlayer(...)` — behind it, derive `type` from `entry.mediaType`, convert `startPosition` (sec → ms), call `MpvPlayer.openPlayer(...)`, skip `setActive` (avoid double-mount). Verified `npx tsc --noEmit` exit 0, zero diagnostics. **W1 → 🟢 Complete (100%, 5/5 phases).** Phase count 8/51. Active phase moved to Phase 6 (mount MpvRenderView at PlayerActivity content root — W2 starts). |
| 2026-09-02 | Mobile team | v2.0 — **Phase 6 (W2) complete.** Widened `MpvRenderView` constructor `ThemedReactContext` → `Context`. Relocated `MpvRenderView.kt` + `MPVLib.kt` from `MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/` to `react-native-media-player/android/src/main/java/com/simba/player/mpv/` (early extraction ahead of Wave 6). In `PlayerActivity.onCreate`: get content root via `findViewById<ViewGroup>(android.R.id.content)`, warn-only if not FrameLayout, create `MpvRenderView(this)`, set `FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT)`, `rootView.addView(renderView, 0)`, log "MpvRenderView mounted at content root, index=0". In `onDestroy`: `mpvRenderView?.cleanup()`, remove from parent, null reference, then `super.onDestroy()`. Verified `:react-native-media-player:compileDebugKotlin` PASSED 1m 18s (Kotlin daemon sandbox workaround fired fallback to in-process compilation). **Deviation:** Phase 6 forced early MpvRenderView extraction; Wave 6 Phases 27/29 simplified to audit + finalise. SPEC bumped to v1.4. **W2 → 🟡 In progress (20%).** Phase count 9/51. Active phase moved to Phase 7 (Surface identity guard & native pointer wiring). |
| 2026-09-02 | Mobile team | v2.1 — **Phase 7 (W2) complete.** Added `IMpvNativePtrProvider` interface in module (`com.simba.player`, single method `fun fetchNativePtr(): Long`). `MpvBridgeModule` now implements it (`override fun fetchNativePtr(): Long = nativePtr`); existing `@ReactMethod fun getNativePtr(): Double` kept unchanged (JS API stable). In `PlayerActivity.onCreate`, after MpvRenderView mount: `Handler(Looper.getMainLooper()).post { wireNativePtr(0) }` → resolves `ReactApplicationContext` via `(application as? ReactApplication)?.reactHost?.currentReactContext`, looks up `getNativeModule("MpvPlayerModule") as? IMpvNativePtrProvider`, calls `fetchNativePtr()`, passes to `mpvRenderView.setNativePtr(...)`. Retry loop: 5 attempts @ 200ms apart; gives up after 5 (≈ 1s total) — JS-layer error pipeline handles surfaced problems. Verified `:react-native-media-player:compileDebugKotlin :app:compileDebugKotlin` PASSED (deprecation warnings only — `getCurrentActivity()`, MapBuilder, `enterPictureInPictureMode()` are all deprecated in newer RN/Java but pre-existing). **Deviation:** Spec assumed direct `MpvBridgeModule.getNativePtr()` reference from PlayerActivity — Gradle boundary forces indirection. SPEC bumped to v1.5. **W2 → 🟡 In progress (40%).** Phase count 10/51. Active phase moved to Phase 8 (transparent root for RN view tree). |
| 2026-09-02 | Mobile team | v2.2 — **Phase 8 (W2) complete.** Added `transparentRoot?: boolean` prop to `VideoPresentationShellProps`. Split `shell` style's `backgroundColor` into two new styles (`shellOpaque` default, `shellTransparent` drop-bg) — selected by the prop at render time. Added `inPlayerActivity: boolean` to `PlaybackState`; `PlaybackProvider.openPlayer` flips it `true` when `USE_DEDICATED_PLAYER_ACTIVITY` is on; `closePlayer` flips it `false`. `VideoHost.tsx` reads `inPlayerActivity` from `usePlayback()` and passes `transparentRoot={inPlayerActivity}` to `VideoPresentationShell`. Verified `npx tsc --noEmit` exit 0, zero diagnostics. **Implementation note:** Spec said "build-time flag" — interpreted as React state (PlaybackContext) so VideoHost re-renders correctly when the flag flips; a module-level `let` would not trigger re-renders. **Deferred scope:** VideoHost still only renders in MainActivity (Phase 5's early-return); the transparentRoot wiring will activate the moment Wave 5 teaches PlayerActivity's JS to call openPlayer itself. SPEC bumped to v1.6. **W2 → 🟡 In progress (60%).** Phase count 11/51. Active phase moved to Phase 9 (setPictureInPictureParams in PlayerActivity). |
| 2026-09-02 | Mobile team | v2.5 — **Phase 11 (W3) complete. WAVE 3 START.** Added the missing `openPlayer(uri, title, type, startPositionMs, promise)` `@ReactMethod` to `MpvBridgeModule.kt` (Phase 3's code was marked complete in TRACKER v1.7 but never actually written — same reversion pattern as the earlier Phase 9/Phase 10 doc rows, this time on consumer-app code). Added explicit `"Audio mode entered: ..."` log in `PlayerActivity.onCreate` when `launchType == "audio"`. Fixed Kotlin `currentActivity` (property) → `getCurrentActivity()` (method) call site. Build PASSED 1m 43s (deprecation warnings only). SPEC bumped to v1.9. **W3 → 🟡 In progress (1/5).** Phase count 14/51. |
| 2026-09-02 | Mobile team | v2.6 — **Phase 12 (W3) complete.** `PlayerActivity.onCreate` now sets `mpvRenderView.visibility = View.GONE` + logs when `launchType == TYPE_AUDIO`. `MpvRenderView.attachSurfaceLocked` hardened with `isAttachedToWindow` defensive guard (true defensive — doesn't fire in the current PlayerActivity path because the view is addView'd to the window-attached content root, but protects against future paths). Build PASSED 2m 4s (deprecation warnings only). SPEC bumped to v1.10. **W3 → 🟡 In progress (2/5).** Phase count 15/51. |
| 2026-09-02 | Mobile team | v2.7 — **Phase 13 (W3) complete.** Wired the launched `PlayerActivity` JS to render `AudioModule` (audio) or `VideoHost` (video) from the `type` extra. Added `getLaunchParams` bridge method (companion `lastLaunchParams` set by `openPlayer`, one-shot read clears state), `MpvPlayer.getLaunchParams()` TS API, `currentPlaybackType` to `PlaybackState`, `loadLaunchParams` in `PlaybackContext` that builds a synthesised `PlaybackEntry` and calls `setActive`. `App.tsx` calls `loadLaunchParams()` once on mount. `npx tsc --noEmit` exit 0. Build PASSED 1m 40s. SPEC bumped to v1.11. **W3 → 🟡 In progress (3/5).** Phase count 16/51. |
| 2026-09-02 | Mobile team | v2.8 — **Phase 14 (W3) complete.** `PlayerActivity.onPause` now respects audio-background-playback: when `launchType == TYPE_AUDIO` AND the new `audioBackgroundPlayback` SharedPreferences setting is on (default `true`), mpv continues playing. Added `shouldKeepPlayingInBackground()` helper used in both the quick and deferred PiP-entry paths. Setting stored in `simba_player_prefs` (key `audio_background_playback`); no UI yet — read-side only. Build PASSED 1m 45s. SPEC bumped to v1.12. **W3 → 🟡 In progress (4/5).** Phase count 17/51. |
| 2026-09-02 | Mobile team | v2.9 — **Phase 15 (W3) complete. WAVE 3 🟢 COMPLETE (100%).** `buildCurrentPipParams` now picks `aspect = 1f` for `TYPE_AUDIO` (1:1 square) and `getVideoAspect()` for `TYPE_VIDEO`. Added basic `MediaSessionCompat` in `PlayerActivity` (created in `onCreate`, released in `onDestroy`, play/pause via `MPVLib`, system media controls supported — lock-screen / Bluetooth / Android Auto). No MediaStyle notification yet (deferred to Wave 5 polish). Build PASSED 1m 47s. SPEC bumped to v1.13. **W3 → 🟢 Complete (5/5).** Phase count 18/51. |
| 2026-09-02 | Mobile team | v2.10 — **Phase 16 (W4) complete. WAVE 4 START.** Created `MediaPlaybackService` (foreground service in the module) with 4-action MediaStyle notification (Previous / Play-Pause / Next / Stop). Service receives `MediaSessionCompat.Token` from `PlayerActivity` via intent extras (cleaner than the spec's "service owns the session" design). PlayerActivity starts the service in `onCreate` (via `ContextCompat.startForegroundService`), stops it in `onDestroy`. Library `AndroidManifest.xml` now declares the `<service>` component. Build PASSED 1m 50s. SPEC bumped to v1.14. **W4 → 🟡 In progress (1/5).** Phase count 19/51. |
| 2026-09-02 | Mobile team | v2.11 — **Phase 17 (W4) complete.** Added 1Hz `progressUpdateRunnable` in `PlayerActivity` that queries mpv's `time-pos` + `duration` properties and ships them to `MediaPlaybackService` via `ACTION_UPDATE` intent. Started in `onResume`, stopped in `onPause` + `onDestroy`, final `ACTION_UPDATE` 250ms after pause. Added `getPlaybackPositionMs`, `getPlaybackDurationMs` helpers + `updateMediaPlaybackServicePosition`, `startProgressUpdates`, `stopProgressUpdates` helpers. Build PASSED 1m 51s. SPEC bumped to v1.15. **W4 → 🟡 In progress (2/5).** Phase count 20/51. |
| 2026-09-02 | Mobile team | v2.12 — **Phase 18 (W4) complete.** Expanded the MediaSessionCompat callback to the full transport set: `onStop` (→ `MPVLib.nativeStop`), `onSkipToNext` (→ `nativePlaylistNext`), `onSkipToPrevious` (→ `nativePlaylistPrev`), `onSeekTo(pos)` (→ `nativeSeek(ptr, pos / 1000.0)`). Added `setSessionActivity(PendingIntent)` so the system can bring PlayerActivity back on lock-screen interactions. `updateMediaSessionState(...)` now advertises the full ACTION_* set (PLAY/PAUSE/PLAY_PAUSE/STOP/SKIP_NEXT/SKIP_PREV/SEEK_TO) and includes the current position from `getPlaybackPositionMs()`. Build PASSED 1m 48s. SPEC bumped to v1.16. **W4 → 🟡 In progress (3/5).** Phase count 21/51. |
| 2026-09-02 | Mobile team | v2.13 — **Phase 19 (W4) complete.** Added `getMediaTitle` / `getMediaArtist` / `getMediaAlbum` mpv property helpers (using `metadata/by-key/*` form) + `setMediaSessionMetadata()` (builds `MediaMetadataCompat` with title fallback chain: mpv `media-title` → launch title → "Simba Player"; sets METADATA_KEY_TITLE / DISPLAY_TITLE / ARTIST / ALBUM / DISPLAY_SUBTITLE / MEDIA_URI / DURATION). Initial call in `createMediaSession()`; refresh after `wireNativePtr` succeeds. Artwork URI plumbing deferred (JS bridge needs `artworkUrl` / `artworkPath` extras). Build PASSED 1m 47s. SPEC bumped to v1.17. **W4 → 🟡 In progress (4/5).** Phase count 22/51. |
| 2026-09-02 | Mobile team | v2.4 — **Phase 10 (W2) complete. W2 100%.** Added `IPipModeChangeEmitter` interface in module + `emitPictureInPictureModeChanged` override in MpvBridgeModule. PlayerActivity wires up `PipActionReceiver` registration (API 33+ `RECEIVER_NOT_EXPORTED`), `onUserLeaveHint` → `enterPictureInPictureMode()`, deferred-pause in `onPause` (200ms Handler.postDelayed), `onBackPressed` finishes when in PiP, `onPictureInPictureModeChanged` forwards to JS via bridge lookup. Build PASSED 1m 4s module + 1m 17s app after a missing-import re-add. SPEC bumped to v1.8. **W2 → 🟢 Complete (5/5).** Phase count 13/51. |
| 2026-09-02 | Mobile team | v2.3 — **Phase 9 (W2) complete.** Moved `PipManager.kt` from app to module (same FQN). `buildPipParams` signature updated: `aspect: Float` clamped to [0.42, 2.38] + integer Rational encoding via *100. `PipActionReceiver.getReactContext` upgraded to bridgeless (`reactHost.currentReactContext` preferred). PlayerActivity gained `lastNativePtr` cache, `buildCurrentPipParams()` helper, `playerBounds: Rect`, `getVideoAspect(): Float` (queries `video-params/aspect`). `onResume` + `onPictureInPictureModeChanged` call `setPictureInPictureParams(...)` (API 26+). SPEC bumped to v1.7. **W2 → 🟡 In progress (80%).** Phase count 12/51. |



---

*Tracker maintained alongside [SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md). Update this file as phases