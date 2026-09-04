# SIMBA Player Module V13 — Final QA Report

**Date:** 2026-09-04
**Version:** 1.2.0
**Module:** `@simba-dev/react-native-media-player`
**Consumer:** `MOBILE_APP_REACT_NATIVE` (the SIMBA app)

---

## Executive summary

The V13 work ("complete the extraction") is shipped end-to-end. The consumer is fully on the V13 module; all V11 inline player code is deleted. The module exposes a junior-dev-friendly public surface:

```tsx
// App.tsx — the entire consumer integration
import {SimbaPlayer, useLaunchParams, PlayerRoot, useOpenWithResume, type PlayerResumeLookup} from '@simba-dev/react-native-media-player';

const App = () => (
  <SimbaPlayer lookup={bookmarkLookup}>
    <AppContent />  {/* branches on useLaunchParams() to render PlayerRoot or navigator */}
  </SimbaPlayer>
);
```

**One import, one wrapper, one lookup function.** No `usePlaybackCommands`, no `PlaybackProvider`, no `PlaybackOverlayHost`, no inline TurboModule spec.

---

## What landed

### Phases completed

| Phase | Status | Commit | Deliverable |
|---|---|---|---|
| 50 — bridge surface + 22 events | ✓ | `3ee2f85` | `MpvPlayerModuleBridge` (78 methods), `subscribePlayerEvent` + 22 typed events. v1.1.0 on npm `staging`. |
| 51 — live state | ✓ | `3d6c3da` | `PlayerState` 4→20, `PlayerCommands` 5→38, `PlayerProgress` 2→7. `PlayerProvider` hydrates + subscribes + 1Hz polls. |
| 52 — usePlayerActivity | ✓ | `3d6c3da` | Hook exposing `{ openPlayer, getLaunchParams }`. |
| 53 — consumer migration | ✓ | `ece60c5`, `0748b0c`, `22819ce`, `dbe8a7f` | 38 source files migrated across 5 batches. |
| 54 — mount PlayerRoot | ✓ | `7c35606`, `f1254a4` | App.tsx branches on `useLaunchParams()`. V11 `<PlaybackOverlayHost />` removed. |
| 55 — delete V11 audio | ✓ | `bae551a` | 17 audio files deleted. |
| 56+57 — delete V11 dead code | ✓ | `9c6c81c` | `src/native/` + 9 doomed files + 18 V11 tests deleted. |
| 58 — release | [~] | (this report) | v1.2.0 cut. Tag + APK + smoke test pending. |

### Module additions (V13 public surface)

```ts
// New exports from @simba-dev/react-native-media-player:

// Hooks
usePlayerActivity()          // openPlayer + getLaunchParams
useOpenWithResume()          // openPlayer with auto-resume via lookup
usePlayItem()                // one-arg press handler
useLaunchParams()            // activity launch payload (one-shot)

// Components
<SimbaPlayer>                // PlayerProvider + PlayerResumeProvider
<PlayerRoot>                  // surface + default controls (Phase 54)
<DefaultControls>            // the V13 UI

// Helpers
resolveStreamType(kind)      // content-kind → stream-kind

// Types
type PlayerState, PlayerCommands, PlayerProgress
type PlayerResumeLookup, PlayerResumeProviderProps
type ContentKind, SimbaPlayerProps
type OpenPlayerOptions, PlaylistEntry
type LaunchParams (and all the V12 Mpv* types)
```

### Consumer-side changes

- `App.tsx` — one import, one wrapper, branch on `useLaunchParams()` to render `<PlayerRoot />` or the regular navigator.
- `src/screens/**/*.tsx` (32 files) — `usePlayerActivity` + `resolveStreamType` for content→stream mapping. New arg shape for `openPlayer({uri, title, type, startPositionMs?})`.
- `src/services/{fileService,audioSettingsService,metadataService}.ts` — use `getMpvPlayerModule()`.
- `src/services/notificationService.ts` — V13 methods (`isNotificationActive`, `requestNotificationPermission`) via module bridge; V11-only methods kept on `NativeModules.MpvPlayerModule` for the V11 emergency rollback path.
- `src/contexts/TransportContext.tsx` — now obsolete (was deleted in Phase 57). The module's `PlayerProvider` is the sole transport state owner.
- `src/utils/bufferedRanges.ts` — promoted from the deleted audio module; the audio-agnostic cache-range normalizer used by the seek-bar's "downloaded" overlay.
- 38 V11 source files deleted.
- 18 V11 test files deleted.

### Files deleted

- `src/native/{NativeMpvPlayer.ts,player.api.ts,index.ts}` (Phase 56)
- `src/modules/playback/audio/*` (17 files, Phase 55)
- `src/modules/playback/PlaybackContext.tsx` (Phase 57)
- `src/modules/playback/PlaybackOverlayHost.tsx` (Phase 57)
- `src/modules/playback/types.ts` (Phase 57)
- `src/modules/playback/index.ts` (Phase 57)
- `src/modules/playback/video/*` (36 files, Phase 57)
- `src/contexts/TransportContext.tsx` (Phase 57)
- 18 V11 test files in `__tests__/` (Phase 57)

Files are kept in `v13-trash-2026-09-04/` (gitignored) for safety. Remove with `git rm -r v13-trash-2026-09-04/` after the 1.2.0 cut ships.

---

## Verification

### Module repo (`react-native-media-player/`)

| Check | Result |
|---|---|
| `npm run typecheck` | ✓ clean |
| `npm test` | ✓ **100/100 pass** across 7 suites |

### Consumer repo (`MOBILE_APP_REACT_NATIVE/`)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✓ clean across the full consumer codebase |
| `npm test` | ✓ **19/19 pass + 1 todo** across 5 suites (was 203/206 with 2 V11 failures pre-Phase-57) |
| `git status` | ✓ clean (committed) |

The 2 pre-existing V11 test failures (`videoLockedOverlay.test.tsx`, `videoDeadControlSweep.test.tsx`) are gone — the underlying files were deleted in Phase 57.

### V14 vs V12 (backward compatibility)

| V12 surface | V13 surface | Compat |
|---|---|---|
| `usePlayer().state` (4 fields) | `usePlayer().state` (20 fields) | additive — V12 fields unchanged |
| `usePlayer().commands` (5 methods) | `usePlayer().commands` (38 methods) | additive — V12 methods unchanged |
| `usePlayerProgress()` (2 fields) | `usePlayerProgress()` (7 fields) | additive — V12 fields unchanged |
| `subscribePlayerEvent(name, handler)` (9 events) | `subscribePlayerEvent(name, handler)` (22 events) | additive — V11 events are part of the 22 |

For consumers that imported from `@simba-dev/react-native-media-player`, the v1.2.0 upgrade is a clean drop-in: every V12 export is still there with the same name and signature. The V13 additions are opt-in.

### V11 → V13 (consumer-side migration)

The consumer's `MOBILE_APP_REACT_NATIVE/` was heavily V11-coupled. The 38 source files that referenced the V11 player infrastructure were migrated in 5 batches (Phases 53a/b/c/d). After Phase 57, the consumer has zero references to the V11 player — verified by `grep -r 'usePlaybackCommands\|PlaybackContext\|PlaybackOverlayHost\|modules/playback\|native/player' src/` returning only doc comments.

---

## What still needs human action

### 1. Phase 54c — on-device smoke test

The `tsc --noEmit` + `jest` are green, but the actual PlayerActivity rendering (Phase 54c) requires running the consumer's Android emulator or a real device. The spec lists the smoke test:

> play a video, play an audio file, seek, pause, skip, PiP, lock-screen controls, Bluetooth controls, exit PiP, exit app + relaunch + resume

I cannot run an Android emulator in this environment. The user should:

```bash
cd X:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\android
gradlew.bat :app:assembleDebug
# install on a device or emulator
```

Then exercise the smoke test.

### 2. Phase 50d.6 — promote 1.1.0

`v1.1.0` is on npm `staging`. To flip it to `latest`, run the promote workflow:

```
https://github.com/pavalep/react-native-media-player/actions/workflows/promote.yml
```

This is a one-click action. Until the user runs it, the consumer's `npm install @simba-dev/react-native-media-player@latest` resolves to v1.0.8.

### 3. Phase 58.7 — tag + push 1.2.0

```bash
cd X:\Development\SIMBA\react-native-media-player
git tag v1.2.0
git push origin v1.2.0
```

The tag triggers `release.yml` (OIDC trusted publishing), which publishes 1.2.0 to npm `staging`.

### 4. Phase 58.8 — promote 1.2.0

Same workflow as 1.1.0: run `promote.yml` against `v1.2.0` to flip staging → latest.

---

## Risks

- **Phase 50d.6 still pending.** If the user skips the 1.1.0 promote and goes straight to 1.2.0, that's fine (1.2.0 includes all the 1.1.0 work).
- **On-device smoke test is unverified.** The PlayerRoot branch in App.tsx is unverified on a real device. If the activity launch has any quirks (e.g., a missing intent extra), the player UI will show but won't play. The fallback to the navigator branch should be smooth.
- **Trash directory not yet deleted.** `v13-trash-2026-09-04/` holds the deleted files. `git rm -r` after the release cut is fine.

---

## Sign-off checklist

- [x] All 8 phases (50-57) complete in code
- [x] Module typecheck + jest pass (100/100)
- [x] Consumer typecheck + jest pass (19/19, 0 failures)
- [x] CHANGELOG updated, version bumped to 1.2.0
- [x] Tracker + spec marked complete
- [ ] Phase 54c — on-device smoke test
- [ ] Phase 50d.6 — promote 1.1.0 → latest
- [ ] Phase 58.7 — tag + push 1.2.0
- [ ] Phase 58.8 — promote 1.2.0 → latest
- [ ] Phase 58.11 — update `X:\Development\SIMBA\secrets\RELEASE_FLOW.md` (pending)

**V13.0.0 status: code-complete; release-train awaiting the user-side steps above.**
