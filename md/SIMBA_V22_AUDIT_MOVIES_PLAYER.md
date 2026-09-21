# SIMBA V22 Audit — Movies Navigation + Player Correctness

**Date**: 2026-09-12
**Author**: Claude (Mavis, root session `mvs_1f7a5b651c12499eb6b3163ea2a551d2`)
**Scope**: Movies screen navigation, Player launch from Movies, parallel sites that suffer the same bug shape, NowPlayingScreen visual bugs, supporting infrastructure
**Method**: Code audit (read) + Argent-driven UI verification (emulator-5554, Medium_Phone API 37)
**Working tree**: 9 files modified. `tsc --noEmit` clean. No commit (awaiting green-light per workflow rule).

---

## Bug summary

| ID | Severity | Status | Where |
|----|----------|--------|-------|
| **B-009** | **CRITICAL** — blocks Player launch from Movies | **OPEN — fix first** | `MoviesDataProvider.handleMoviePress` |
| B-001 | High | **FIXED** | `MoviesDataProvider.handleMoviePress` (typed facade) |
| B-002 | High | **FIXED** | `MusicDataProvider`, `SearchScreen` (4 sites), `useAllVideosScreen` |
| B-003 | Medium | **FIXED** | `NowPlayingScreen` volume |
| B-004 | Medium | **FIXED** | `NowPlayingScreen` artist + `PlaybackState` facade |
| B-005 | Low (warning) | **DEFERRED** | `@lodev09/react-native-true-sheet@3.11.11` codegen |
| B-007 | — | **RECLASSIFIED** (cold-cache timeout, not code) | `apiFetch` to `archive.org` |
| B-008 | Low (UX) | **FIXED** | `ListStates` + `ErrorState` error-detail |

---

## B-009 (NEW, CRITICAL) — Player not showing from Movies screen

**Status**: **FIXED (code quality)** + revealed **B-010 (real root cause)**

**Symptom (original)**: Tap a movie card on the Movies screen → toast "No connection. The movie will open when you are online." appears, but no PlayerActivity launches. User never sees the player UI.

**Root cause analysis**:

The pre-V22 facade collapsed every bridge failure to `networkError`. When the actual error is "PlayerActivity can't launch", the user sees a misleading "No connection" toast.

The Kotlin `MpvBridgeModule.openPlayer` (`node_modules/@simba-dev/react-native-media-player/android/src/main/java/com/simba/player/mpv/MpvBridgeModule.kt:1240-1320`) rejects with one of 5 documented codes:
- `E_INVALID_TYPE` — `type` arg wasn't 'video' or 'audio'
- `E_NO_ACTIVITY` — no current activity to launch from
- `E_ACTIVITY_NOT_FOUND` — `PlayerActivity` not in manifest
- `E_SECURITY` — manifest restriction refused
- `E_OPEN_PLAYER_FAILED` — catch-all startActivity failure

### Fix (shipped)

1. **New `LaunchStreamError` variant** in `src/infrastructure/player/streamErrors.ts` — 5th variant alongside `network` / `unsupported` / `expired` / `blocked`. Carries the typed `code` (e.g. `E_ACTIVITY_NOT_FOUND`) + `cause` + `userFixable` flag.
2. **New `mapBridgeLaunchError()` helper** at `src/infrastructure/player/bridgeErrors.ts` — pulls `e.code` off the rejection and routes each of the 5 codes to the right `StreamError` variant.
3. **`usePlay()` and `usePlaybackFacade.open/openWithResume/openPlaylist`** now use the mapper. The pre-V22 "Player refused launch" → `networkError` collapse is gone.
4. **All 4 call sites** (MoviesDataProvider, MusicDataProvider, SearchScreen, useAllVideosScreen) handle `isLaunchError` with a dedicated 8s error toast that surfaces the typed code: `Player couldn't start — [E_XXX]. <message>`.

**Verified live** (post-fix): tapping a movie now shows the new "Player refused launch" toast — which then led directly to B-010.

---

## B-010 (NEW, TRULY CRITICAL) — v1.5.3 broke the bridge codegen

**Symptom**: After B-009, the misleading "No connection" toast was correctly replaced with "Player couldn't start. Player refused launch" — but the player still doesn't show.

**Root cause**: Your `v1.5.3` removed `apply plugin: "com.facebook.react"` from the lib's `android/build.gradle`. That line is what triggers codegen output for the lib's TurboModule spec. Without it:

1. App-level codegen produces **no** Java files for `MpvPlayerModule`
2. RN 0.86's TurboModule resolver can't find `NativeSimbaPlayerSpec` for `MpvPlayerModule`
3. `NativeModules.MpvPlayerModule` is `undefined` at runtime
4. JS-side `resolveBridge()` (`MpvPlayerModule.ts:resolveBridge`) returns `null`
5. Falls back to `NOOP_BRIDGE` whose `openPlayer` returns `Promise.resolve(false)`
6. PlayerActivity never launches

**Fix**: Two changes were needed in the lib repo (`X:\Development\SIMBA\react-native-media-player\`), both staged on `2026-09-14` for the v1.5.4 publish:

1. **`android/build.gradle`** — restored `apply plugin: "com.facebook.react"` after the kotlin plugin (the v1.5.3 publish had removed it; that alone is enough to silently disable the consumer-app codegen pipeline for the lib).
2. **`src/bridge/NativeMpvPlayer.ts`** (NEW) — declares `interface Spec extends TurboModule` mirroring `MpvPlayerModuleBridge` (`src/bridge/MpvPlayerModule.ts:182`) and default-exports `TurboModuleRegistry.getEnforcing<Spec>('MpvPlayerModule')`. This is the second half of the bug: codegen at `@react-native/codegen/lib/cli/combine/combine-js-to-schema.js:22` ONLY processes files whose contents match `/extends TurboModule/` or `/export default codegenNativeComponent</`. The lib's old source tree had no `Native*.ts` file, so the lib's codegen task emitted `No modules to process in combine-js-to-schema-cli.` and produced zero Java glue. Adding the Spec file makes the filter pass; codegen then writes `com.facebook.fbreact.specs.NativeMpvPlayerSpec` with `NAME = "MpvPlayerModule"`, which RN's new-arch TurboModule resolver uses to wire `NativeModules.MpvPlayerModule` to `MpvBridgeModule` (the Kotlin `@ReactModule(name = MpvBridgeModule.NAME)` where `NAME = "MpvPlayerModule"`).

3. **`package.json`** — bumped 1.5.3 → 1.5.4, description updated.
4. **`CHANGELOG.md`** — 1.5.4 entry with the full root-cause analysis, detection recipe, and type-mapping notes (codegen doesn't support nullable strings, literal-union narrowing, etc.).
5. **`COMMIT_MSG_V154_D032_fix.txt`** — commit message staged in the lib repo.

**Why v1.5.3 broke this (full picture)**: the prior D-032 memory note said "removing the line fixes the lib" — that was wrong direction. The line is required for new-arch codegen. Additionally, v1.5.3 (and v1.5.2, going back further) shipped without any `Native*.ts` spec file, so even with the line present, codegen had nothing to scan. The Kotlin-side `PlayerPackage : TurboReactPackage()` was always correct — the gap was on the TS side.

**Verification** (consumer side, in-session): ran
`./gradlew :simba-dev_react-native-media-player:generateCodegenArtifactsFromSchema --rerun-tasks --no-daemon` after staging the new `NativeMpvPlayer.ts`. Output:
```
> Task :simba-dev_react-native-media-player:generateCodegenSchemaFromJavaScript
> Task :simba-dev_react-native-media-player:generateCodegenArtifactsFromSchema
BUILD SUCCESSFUL in 1m 35s
```
(no more "No modules to process in combine-js-to-schema-cli" — the Spec was picked up). The generated file at `node_modules/@simba-dev/react-native-media-player/android/build/generated/source/codegen/java/com/facebook/fbreact/specs/NativeMpvPlayerSpec.java` starts with:
```java
public abstract class NativeMpvPlayerSpec extends ReactContextBaseJavaModule implements TurboModule {
  public static final String NAME = "MpvPlayerModule";
  ...
```

**Follow-up**: user publishes v1.5.4 → bumps `@simba-dev/react-native-media-player` to `^1.5.4` in mobile `package.json` → `npm install` → `gradlew :app:installDebug` → Argent-driven tap on a Movies card → `PlayerActivity` launches (mpv surface + media controls visible) instead of the toast.


---

## B-001 — MoviesDataProvider.handleMoviePress: openPlayer rejections swallowed

**Status**: **FIXED** (verified live on emulator).

**Before**: Direct `usePlayerActivity().openPlayer()` call — rejection became unhandled promise rejection, `false` return discarded silently.

**Fix** (`src/screens/MoviesScreen/components/MoviesDataProvider.tsx:1-160`):

- Imported `usePlay` + 4 error type-guards from `infrastructure/player`.
- Replaced `const {openPlayer} = usePlayerActivity();` with `const play = usePlay();`.
- Made `handleMoviePress` `async`; `await play({uri, title, mediaType: 'movie'})` then pattern-match `Result<PlaybackId, StreamError>`.
- Per-variant toast:
  - `isNetworkError` → "No connection. The movie will open when you are online." (warning, 6s)
  - `isUnsupportedError` → "This video format is not supported by the player." (error, 6s)
  - `isExpiredError` → "Sign in expired. Please sign in again." (warning, 6s)
  - `isBlockedError` → "This content is not available in your region." (error, 6s)
  - other → "Could not open the player. Please try again." (error, 6s)

**Verification**: Tapped "1940 Das Leichte Mädchen" → toast "No connection. The movie will open when you are online." fired as expected.

---

## B-002 — Same bug shape in 3 other sites

**Status**: **FIXED**. tsc clean.

| Site | Before | After |
|------|--------|-------|
| `src/screens/MusicScreen/components/MusicDataProvider.tsx` | `usePlayerActivity().openPlayer()` direct | `usePlay()` + per-variant toast, async `handleTrackPress` |
| `src/screens/Search/components/SearchScreen.tsx` | 4 sites: `handlePlayFile`, `handlePlayTrack`, `handlePlayAudius`, `handleOpenChannel` — all `openPlayer()` direct | Centralised `playWithToast` helper, 4 call sites use it |
| `src/screens/AllVideos/hooks/useAllVideosScreen.ts` | `handlePlayTrack` direct | `usePlay()` + per-variant toast |

---

## B-003 — NowPlayingScreen volume hardcoded 70%

**Status**: **FIXED**.

**Before** (`src/screens/NowPlaying/components/NowPlayingScreen.tsx:470-484`):
```jsx
<View style={[styles.volumeFill, {width: '70%'}]} />
<AppText>70%</AppText>
```

**After**:
```jsx
<View style={[styles.volumeFill, {width: `${Math.max(0, Math.min(100, state.volume))}%`}]} />
<AppText>{`${Math.round(Math.max(0, Math.min(100, state.volume)))}%`}</AppText>
```

Volume icon also switches by threshold (`🔇`/`🔈`/`🔉`/`🔊`). Clamped to [0, 100] so a misbehaving bridge state can't break the layout.

---

## B-004 — NowPlayingScreen artist hardcoded; title falls back to fileTitle

**Status**: **FIXED**.

**Changes**:

1. `src/infrastructure/player/playbackFacade.ts` — added `artist: string` to `PlaybackState` interface (mapped from `state.artist ?? ''` in the facade builder). Underlying `PlayerState.artist` was already exposed by `@simba-dev/react-native-media-player/src/types/player.ts`; the facade was hiding it.
2. `src/screens/NowPlaying/components/NowPlayingScreen.tsx:380-393`:
   - Title: `state.title || fileTitle || 'Unknown Track'` (live mpv title preferred)
   - Artist: `state.artist || 'Unknown Artist'` (live metadata preferred)

---

## B-005 (DEFERRED) — TrueSheet 3.11.11 codegen mismatch

**Status**: **Functional, but with warnings + rare dismiss-during-unmount runtime error**. Deferred to user opt-in.

**Evidence** (`adb logcat --pid=5564 -d`):
```
W unknown:ViewManagerPropertyUpdater: Could not find generated setter
  for class com.lodev09.truesheet.TrueSheetContainerViewManager
  for class com.lodev09.truesheet.TrueSheetFooterViewManager
  for class com.lodev09.truesheet.TrueSheetHeaderViewManager
  for class com.lodev09.truesheet.TrueSheetViewManager
  for class com.lodev09.truesheet.TrueSheetContentViewManager
  for class com.lodev09.truesheet.TrueSheetPeekViewManager
W ReactNativeJS: TrueSheet: sheet is already dismissed. No need to dismiss it again.
E ReactNativeJS: [Error: Uncaught (in promise, id: 0): "Error: TrueSheetView with tag 790 not found"]
```

**Root cause**: Only `TrueSheetView` implements the codegen `ViewManagerInterface`; `Container/Footer/Header/Content/Peek` use legacy `@ReactProp` directly. RN 0.86's codegen-driven prop pipeline (`ViewManagerPropertyUpdater`) can't find generated setters for these.

**Impact**: The Filter sheet actually works correctly when opened (verified live — all categories + sort + view options rendered fine). The runtime error only fires when a sheet is being dismissed after the underlying view is already gone (e.g., screen unmount races).

**Upgrade path**: Bump to `^3.11.14` (latest stable) → `npm install` → APK rebuild (~30 min). Working tree currently at `^3.11.11` to keep it clean until user opts in.

---

## B-007 (RECLASSIFIED) — Movies "Couldn't load movies"

**Original hypothesis**: archive.org HTTP failure (network-level).

**Actual**: Cold-cache timeout on first call to `archive.org/advancedsearch.php`. `API_CONFIG.internetArchive.timeoutMs: 30_000` is the right ceiling (the API is genuinely slow on cold CDN node, ~10s first load per the comment in `constants/api.ts`). After first cache warm, 14 movies loaded fine.

**Conclusion**: Not a code bug. The IA adapter's 30s timeout handles the worst-case cold latency.

---

## B-008 (UX) — Error UI hides the actual error

**Status**: **FIXED**.

**Before**: Every error showed "Something went wrong / Couldn't load movies." — identical for timeouts, network failures, parse errors, etc. Users couldn't tell what was wrong.

**After**:

1. `src/components/feedback/ErrorState/ErrorState.tsx` — added `errorDetail?: string` prop. When provided, renders under the generic message as a monospace small caption.
2. `src/screens/MoviesScreen/components/ListStates.tsx` — added `errorMessage?: string | null` prop, forwards to `ErrorState.errorDetail`.
3. `src/screens/MoviesScreen/components/MoviesContent.tsx` — wires `errorMessage={error}` through.

Result: when a query fails, the UI shows both "Couldn't load movies." AND the underlying diagnostic (e.g., "TimeoutError: Request took longer than 30000ms"). Users can now report what's wrong.

---

## Files modified

| File | Bugs |
|------|------|
| `src/screens/MoviesScreen/components/MoviesDataProvider.tsx` | B-001 |
| `src/screens/MusicScreen/components/MusicDataProvider.tsx` | B-002 |
| `src/screens/Search/components/SearchScreen.tsx` | B-002 |
| `src/screens/AllVideos/hooks/useAllVideosScreen.ts` | B-002 |
| `src/screens/NowPlaying/components/NowPlayingScreen.tsx` | B-003, B-004 |
| `src/infrastructure/player/playbackFacade.ts` | B-004 (artist field) |
| `src/screens/MoviesScreen/components/ListStates.tsx` | B-008 |
| `src/screens/MoviesScreen/components/MoviesContent.tsx` | B-008 |
| `src/components/feedback/ErrorState/ErrorState.tsx` | B-008 |

`tsc --noEmit` clean.

---

## v1.5.3 finding (separate from above)

**v1.5.3 tarball verified on npm** (sha256 `1DD7148F5...`, 182 KB). Key: **v1.5.3 REMOVED `apply plugin: "com.facebook.react"` from the lib's `android/build.gradle`** — opposite of D-032. The codegen path must now resolve through a different mechanism (consumer-app codegen or autolink). Local `node_modules` still at v1.5.2 (still has the in-session `com.facebook.react` line). Needs `npm install` from your side to pull v1.5.3 and verify the in-session patch is now obsolete.

---

## Next batch (per workflow rule)

1. **B-009** — Player not showing from Movies screen (CRITICAL, fix first)
2. **T19.03 / D-033** — RNFS.readDir returns 0 on Android 13+ scoped storage (SAF or MediaStore)
3. Original 10-task drive: T13.04, T14.01, T14.04, T15.04, T19.03, T20.03, T25.03, T26.03, T27.03, T28.03
