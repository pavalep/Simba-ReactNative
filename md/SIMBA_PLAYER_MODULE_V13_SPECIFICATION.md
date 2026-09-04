# SIMBA Player Module — V13 Specification & Tracker

**Document Version:** 1.0
**Date Created:** 2026-09-03
**Last Updated:** 2026-09-03
**Target Release:** V13.0.0
**Package Name:** `@simba-dev/react-native-media-player` (renamed from `@simba/react-native-media-player` in V12.0.0 release)
**Folder Name:** `react-native-media-player/` (sibling of consumer app)
**NPM Org:** `@simba-dev` (admin: `pavalep`)
**Status:** Wave 9 kickoff · **Phases 49-58 (8 phases, ~16 working days)**
**Owners:** Mobile team
**Replaces:** V11 inline RN player (deprecated V12) + V12 partial extraction (V13 completes the extraction)
**Linked spec:** [`SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md)
**Linked planning:** [`SIMBA_PLAYER_MODULE_V13_PLANNING.md`](./SIMBA_PLAYER_MODULE_V13_PLANNING.md) — V13 planning doc (this spec overrides its themes 3-4)

---

## 0. Purpose

V12 extracted SIMBA Player's *native* side (Kotlin mpv engine + `PlayerActivity` + Android manifest) into `@simba-dev/react-native-media-player`. V12 published v1.0.0 + v1.0.2 + v1.0.4 + v1.0.8 to npm and shipped CI/CD via OIDC trusted publishing.

**V13's charter is different from V13_PLANNING.md's scoping.** V13_PLANNING.md proposed DRM + Casting + iOS as the next themes. After V12 shipped, **auditing the consumer-side call sites revealed that V12's TypeScript layer is severely under-extracted** — the consumer still owns 60+ source files (`src/modules/playback/`, `src/native/`, `src/contexts/TransportContext.tsx`, plus inline player UI in 33+ screens) that should have been in the module but were left behind.

**V13 = Complete the extraction, not add new features.** This is a "do what V12 should have done" wave. The package's native (Kotlin) layer is comprehensive (78 `@ReactMethod`s), but its TypeScript bridge surface exposes only **9 of those 78 methods** and provides no event subscription API. The consumer therefore reaches into `NativeModules.MpvPlayerModule` directly in dozens of places.

**V13 outcome:** the consumer's `src/modules/playback/`, `src/native/`, and `src/contexts/TransportContext.tsx` directories are deleted. All player-related JS code lives in the module. The consumer mounts `<PlayerProvider>` + `<PlayerRoot>` in its `PlayerActivity` and uses the module's hooks + `<DefaultControls>` for the UI. New features (DRM, Cast, iOS) are deferred to V14.

### Why we changed scope from V13_PLANNING.md

The original V13 planning doc listed 4 themes: DRM, Casting, Cleanup, iOS. After V12 shipped we audited:

| Audit dimension | Finding |
|---|---|
| Native Kotlin methods (`MpvBridgeModule.kt`) | 78 `@ReactMethod`s — comprehensive |
| TS typed bridge (`MpvPlayerModuleBridge` in `src/bridge/MpvPlayerModule.ts`) | **9 methods** — `play`, `pause`, `seekAbsolute`, `seekBackward`, `seekForward`, `setConfig`, `setDebugLogging`, `dumpObservedProperties` |
| `usePlayer()` hook (`src/types/player.ts`) | Returns hardcoded `DEFAULT_STATE` — **never subscribes to mpv events** |
| `usePlayerProgress()` | Returns hardcoded `{0, 0}` — **never polls mpv** |
| `PlayerState` interface | 4 fields: `isPlaying`, `title`, `artist`, `album` |
| `PlayerCommands` interface | 6 methods: `play`, `pause`, `seek`, `skipBackward`, `skipForward` |
| Module exposes `openPlayer` / `getLaunchParams`? | **No** — these are typed on the Kotlin spec but not exported on the JS bridge |
| Module exposes an event subscription API? | **No** — `MpvPlayerModuleBridge` has no `addListener` |
| Module's `MpvPlayer` event types | None on the JS side (the Kotlin side emits 22 events: `onFileLoaded`, `onPlaybackStateChanged`, `onPositionChanged`, `onDurationChanged`, `onPropertyChanged`, `onTracksChanged`, `onChapterChanged`, `onVideoParamsChanged`, `onError`, `onBuffering`, `onCacheState`, `onSeekable`, `onSeeking`, `onEndFile`, `onPlaybackRestart`, `onEndReached`, `onAudioDeviceChanged`, `onVolumeChanged`, `onSpeedChanged`, `videoReconfig`, `onPipModeChanged`, `onPipPlayPause`, `onPipExpand`, `onPipClose`) |

**Result:** consumers reach into `NativeModules.MpvPlayerModule` directly in 13+ source files (`TransportContext.tsx`, `notificationService.ts`, `fileService.ts`, `audioSettingsService.ts`, `metadataService.ts`, `VideoHost.tsx`, `VideoMpvSession.ts`, etc.) and use the legacy `MpvPlayer` wrapper from `src/native/player.api.ts` (633 lines). The module's "extraction" stopped at the native boundary and the consumer never let go of the JS-side bridge.

### V12 → V13 migration goals

1. **Expand `MpvPlayerModuleBridge`** from 9 methods to all 78 native methods (typed, lazy-resolved, no-op fallback for jest).
2. **Add event subscription API** (`subscribePlayerEvent(name, handler) → unsubscribe()`) covering all 22 mpv events emitted by the Kotlin side.
3. **Rewrite `usePlayer`/`usePlayerProgress`** to subscribe to events (Phase 25 was supposed to do this in V12 but didn't).
4. **Expand `PlayerState`/`PlayerCommands`/`PlayerProgress`** interfaces to cover what the consumer actually uses (volume, mute, speed, loop, seekable, isBuffering, cache ranges, playlist, etc.).
5. **Expose `openPlayer` / `getLaunchParams`** via `usePlayerActivity()` hook so the consumer no longer needs its `usePlaybackCommands`.
6. **Migrate all 33+ consumer call sites** to import from `@simba-dev/react-native-media-player`.
7. **Mount `<PlayerProvider>` + `<PlayerRoot>`** in `PlayerActivity` so the module's `DefaultControls` renders.
8. **Delete `src/modules/playback/`, `src/native/`, `src/contexts/TransportContext.tsx`** + their tests + their imports across the consumer.

### Non-goals (V13)

- DRM (Widevine / FairPlay) — V14
- Casting (Chromecast / DLNA / AirPlay) — V14
- iOS port — V14 (deferred; the architecture is platform-agnostic but the rewrite is large)
- Replacing `<DefaultControls>` with the consumer's existing custom UI (e.g. `VideoMiniCard`, `VideoLockedOverlay`, `VideoMoreSheet`) — V14. V13 ships with `<DefaultControls>` and the consumer deletes its custom video UI components as part of the cleanup.

---

## 1. Status Legend

- [ ] = Pending
- [~] = In Progress
- [x] = Complete
- [!] = Blocked
- [-] = Deferred (out of V13 scope)

Each phase has a **status** field. Each step is a checkbox.

---

## 2. Wave & Phase Index

| Wave | Phases | Theme | Status |
|---|---|---|---|
| **W9** | 49–58 | Complete the extraction | [ ] Pending |

**Total: 1 wave, 10 sub-phases (49-58).**

The V12 spec used 8 waves / 49 phases. V13 collapses to a single wave because the work is one cohesive extraction — splitting it across waves would create artificial intermediate states where the consumer is half-migrated.

---

### Phase 49 — Audit consumer call sites + module gaps (kickoff)

**Status:** [~] In Progress
**Estimated effort:** 0.5 day
**Deliverable:** A complete map of every consumer call site, with classification (already in module / needs bridge extension / needs new native method / consumer-only and stays).

- [x] 49.1 Audit `import {usePlaybackCommands} from '../../modules/playback'` references across consumer — found 33 sites
- [x] 49.2 Audit `import {MpvPlayer} from '../native'` references across consumer — found 8 sites
- [x] 49.3 Audit `import MpvPlayer from '../native/player.api'` references — found 4 sites
- [x] 49.4 Audit `import {MpvPlayer} from '../native/player.api'` references — found 2 sites
- [x] 49.5 Audit `NativeModules.MpvPlayerModule` direct accesses — found 3 sites (`TransportContext.tsx`, `notificationService.ts`, `notificationService.ts` again)
- [x] 49.6 Audit `MpvPlayer` method calls in `TransportContext.tsx` — list every method called: `setProperty`, `getProperty`, `pause`, `play`, `resume`, `seekTo`, `getPosition`, `getDuration`, `getPlaybackState`, `observeProperty`, `unobserveProperty`, `on` (event subscribe), `off` (event unsubscribe)
- [x] 49.7 Audit `MpvPlayer` method calls in `notificationService.ts` — `requestNotificationPermission`, `on('onPositionChanged', ...)`, `on('onPlaybackStateChanged', ...)`, `on('onEndFile', ...)`, `on('onError', ...)`, `on('onFileLoaded', ...)`
- [x] 49.8 Audit `MpvPlayer` method calls in `audioSettingsService.ts` — `setProperty(name, value)` for: `replaygain`, `gapless-audio`, `audio-delay`, `audio-samplerate`, `af` (audio filter)
- [x] 49.9 Audit `MpvPlayer` method calls in `metadataService.ts` — `getProperty('metadata')`, `getProperty('media-title')`
- [x] 49.10 Audit `MpvPlayer` method calls in `fileService.ts` — `grantPersistablePermission`, `verifyContentUri`
- [x] 49.11 Confirm Kotlin native side has all 78 methods (no native additions needed for V13 — the work is pure TypeScript bridge expansion)
- [x] 49.12 Confirm module has `setScreenBrightness` / `getScreenBrightness` / `requestNotificationPermission` native methods (Kotlin `MpvBridgeModule.kt` lines 398, 406, 1593)
- [x] 49.13 Confirm module has `openPlayer` / `getLaunchParams` (Kotlin `MpvBridgeModule.kt` openPlayer at line 1422, getLaunchParams at line 1486 — both `@ReactMethod`)
- [x] 49.14 Output: gap analysis table (see §3 below)

---

### Phase 50 — Expand `MpvPlayerModuleBridge` typed surface

**Status:** [~] In Progress (code complete, promote workflow pending user trigger)
**Estimated effort:** 1.5 days
**Deliverable:** `MpvPlayerModuleBridge` interface in `src/bridge/MpvPlayerModule.ts` exposes all 78 native methods, typed, with no-op fallbacks for jest.

#### Sub-phase 50a — Add typed method signatures

- [x] 50a.1 Open `react-native-media-player/src/bridge/MpvPlayerModule.ts`
- [x] 50a.2 Replace the 9-method `MpvPlayerModuleBridge` interface with the full 78-method surface (see §3.1 for the full list)
- [x] 50a.3 All methods typed to match the Kotlin `@ReactMethod` signatures (sync methods return their declared type, async return `Promise<T>`)
- [x] 50a.4 Methods that exist in Kotlin but not in the consumer's usage list are **included** (the bridge is the module's contract — we don't want consumers to reach into `NativeModules` ever again)

#### Sub-phase 50b — No-op fallback expansion

- [x] 50b.1 Expand `NOOP_BRIDGE` to provide no-op fallbacks for every method (jest / Storybook / web preview)
- [x] 50b.2 Sync methods return their default value (`false` / `0` / `''` / `[]` / `'{}'`)
- [x] 50b.3 Async methods return `Promise.resolve(undefined)` for void and `Promise.resolve(default)` for typed returns
- [x] 50b.4 `resolveBridge()` now checks `play + pause + seekAbsolute + loadFile` (was: just play/pause/seekAbsolute) to ensure the bridge is actually fully wired

#### Sub-phase 50c — Event subscription API

- [x] 50c.1 Add `subscribePlayerEvent<E extends PlayerEventName>(event: E, handler: (payload: PlayerEventPayloads[E]) => void): () => void` to the bridge
- [x] 50c.2 Add `removeAllListeners(event?: PlayerEventName): void` to the bridge
- [x] 50c.3 Define `PlayerEventName` as a string-literal union of all 22 mpv events
- [x] 50c.4 Define `PlayerEventPayloads` as an interface map (typed payload per event, matching the Kotlin side)
- [x] 50c.5 Internal: use `NativeEventEmitter(NativeModules.MpvPlayerModule)` to subscribe; expose unsubscribe as `return () => subscription.remove()`
- [x] 50c.6 No-op fallback returns `() => {}` (so `useEffect` cleanup is a no-op in jest)

#### Sub-phase 50d — Bump version + publish 1.1.0

- [x] 50d.1 Bump `package.json` to `1.1.0` (semver minor — added bridge surface is backward-compatible)
- [x] 50d.2 Update `CHANGELOG.md` with the surface expansion
- [x] 50d.3 Run `npm test` (87 tests must still pass — typed changes only, no runtime change)
- [x] 50d.4 Run `npm run typecheck` (must pass — example file should still compile)
- [x] 50d.5 `git tag v1.1.0 && git push origin v1.1.0` — `release.yml` publishes to npm `staging`
- [ ] 50d.6 Trigger `promote.yml` workflow → flips `1.1.0` to `latest` (user step from GitHub UI)

---

### Phase 51 — Expand `PlayerState` / `PlayerCommands` / `PlayerProgress` + wire to events

**Status:** [x] Complete (committed as `3d6c3da` on 2026-09-04)
**Estimated effort:** 2 days
**Deliverable:** `usePlayer` returns live state from mpv events; `usePlayerProgress` polls position/duration at 1Hz; `PlayerCommands` covers every method the consumer uses.

#### Sub-phase 51a — Expand interfaces

- [x] 51a.1 Open `react-native-media-player/src/types/player.ts`
- [x] 51a.2 Expand `PlayerState` (currently 4 fields) to add: `positionMs`, `durationMs`, `isBuffering`, `isSeeking`, `seekable`, `volume`, `isMuted`, `speed`, `loopMode`, `playlist`, `currentIndex`, `tracks`, `chapters`, `currentChapter`, `videoParams`, `error` (and the existing 4 stay)
- [x] 51a.3 Expand `PlayerCommands` (currently 6 methods) to add: `togglePlayPause`, `stop`, `seekBy`, `seekToChapter(index)`, `next()`, `previous()`, `setVolume(v)`, `setMuted(m)`, `toggleMute()`, `setSpeed(s)`, `setLoopMode(m)`, `loadFile(uri)`, `loadPlaylist(paths, startIndex)`, `next()`, `playlistRemove(index)`, `shuffle()`, `clear()`, `selectTrack(trackId)`, `cycleTrack(type)`, `setTrack(type, trackId)`, `enterPip()`, `exitPip()`, `exitPipAndFinish()`, `setOrientation(mode)`, `setImmersive(enabled)`, `setKeepScreenOn(enabled)`, `setScreenBrightness(value)`, `requestNotificationPermission()`, `openPlayer(opts)`, `getLaunchParams()`, `getProperty(name)`, `setProperty(name, value)`, `observeProperty(name)`, `unobserveProperty(name)`
- [x] 51a.4 Expand `PlayerProgress` (currently 2 fields) to add: `isBuffering`, `isSeeking`, `seekable`, `cacheRanges`, `cacheFill`
- [x] 51a.5 Keep `usePlayerProgress()` returning a 1Hz-pollable subset of `PlayerProgress` (so consumers that only need position/duration can opt out of the heavier subscription)

#### Sub-phase 51b — Internal provider state

- [x] 51b.1 Inside `PlayerProvider`, hold a `PlayerState` in a `useRef` + `useState` pair
- [x] 51b.2 On mount, subscribe to ALL `PlayerEventName`s via `subscribePlayerEvent` and dispatch updates to the state
- [x] 51b.3 On mount, start a 1Hz `setInterval` calling `bridge.getPosition()` + `bridge.getDuration()` (both sync React methods) → updates `positionMs` / `durationMs` in state
- [x] 51b.4 On unmount, clear interval + remove all event subscriptions
- [x] 51b.5 The `usePlayer()` hook reads from a `PlayerContext` provided by `PlayerProvider` (currently it returns hardcoded defaults — Phase 25 was supposed to do this in V12)

#### Sub-phase 51c — Re-export from `src/index.ts`

- [x] 51c.1 Add the new types (`PlayerEventName`, `PlayerEventPayloads`) to the index
- [x] 51c.2 Add `subscribePlayerEvent`, `removeAllListeners` exports

---

### Phase 52 — Add `usePlayerActivity()` hook for `openPlayer` + `getLaunchParams`

**Status:** [x] Complete (committed as `3d6c3da` on 2026-09-04)
**Estimated effort:** 0.5 day
**Deliverable:** Consumer's `usePlaybackCommands` and `usePlayback` are replaced by `usePlayerActivity` + thin consumer-side wrappers.

- [x] 52.1 Create `react-native-media-player/src/hooks/usePlayerActivity.ts`
- [x] 52.2 Hook returns `{ openPlayer(opts): Promise<boolean>, getLaunchParams(): LaunchParams | null }`
- [x] 52.3 `openPlayer` calls `bridge.openPlayer(uri, title, type, startPositionMs)` with the option object unpacked
- [x] 52.4 `getLaunchParams` calls `bridge.getLaunchParams()` and normalizes the result (`null` → `null`, otherwise `{ uri, title, type, startPositionMs }`)
- [x] 52.5 Re-export from `src/index.ts`
- [x] 52.6 Add a typed `LaunchParams` interface

---

### Phase 53 — Migrate consumer to module

**Status:** [ ] Pending
**Estimated effort:** 2 days
**Deliverable:** All consumer call sites import from `@simba-dev/react-native-media-player` instead of `./modules/playback` or `./native`. Typecheck passes.

#### Sub-phase 53a — `usePlaybackCommands` → `usePlayerActivity`

- [ ] 53a.1 In each of the 33 consumer files using `usePlaybackCommands`, replace the import:
  ```diff
  - import {usePlaybackCommands} from '../../modules/playback';
  + import {usePlayerActivity} from '@simba-dev/react-native-media-player';
  ```
- [ ] 53a.2 Replace `const {openPlayer} = usePlaybackCommands()` with `const {openPlayer} = usePlayerActivity()`
- [ ] 53a.3 Verify each call site's `openPlayer` arg shape still matches the new signature. The consumer's old `openPlayer` takes `{uri, title, duration, source, type, mediaType}`; the module's takes `{uri, title, type, startPositionMs}`. **Diff is significant** — many call sites need reshaping
- [ ] 53a.4 Where `duration` / `source` are passed to the old `openPlayer` for legacy V11 reasons (Redux dispatch), they become no-ops — V13 doesn't need them because there's no Redux dispatch path anymore

#### Sub-phase 53b — `MpvPlayer` (player.api.ts) → `getMpvPlayerModule()`

- [ ] 53b.1 In `src/services/fileService.ts`: replace `import {MpvPlayer} from '../native/player.api'` → `import {getMpvPlayerModule} from '@simba-dev/react-native-media-player'`
- [ ] 53b.2 Replace `MpvPlayer.grantPersistablePermission(uri)` → `getMpvPlayerModule().grantPersistablePermission(uri)`
- [ ] 53b.3 Replace `MpvPlayer.verifyContentUri(uri)` → `getMpvPlayerModule().verifyContentUri(uri)`
- [ ] 53b.4 In `src/services/audioSettingsService.ts`: same migration for `MpvPlayer.setProperty(...)` calls
- [ ] 53b.5 In `src/services/metadataService.ts`: same migration for `MpvPlayer.getProperty(...)` calls
- [ ] 53b.6 In `src/services/notificationService.ts`: replace `import MpvPlayer from '../native/player.api'` and `import {MpvPlayer} from '../native'`. All `MpvPlayer.on(event, handler)` calls → `getMpvPlayerModule().subscribePlayerEvent(event, handler)`
- [ ] 53b.7 In `src/contexts/TransportContext.tsx`: same migration for all `MpvPlayer.*` calls

#### Sub-phase 53c — Direct `NativeModules.MpvPlayerModule` → module bridge

- [ ] 53c.1 In `src/services/notificationService.ts`: replace `(NativeModules.MpvPlayerModule as ...)` with `getMpvPlayerModule()` typed
- [ ] 53c.2 In `src/contexts/TransportContext.tsx`: same

#### Sub-phase 53d — Verify typecheck + jest

- [ ] 53d.1 Run `npm run typecheck` from `MOBILE_APP_REACT_NATIVE/` — must pass
- [ ] 53d.2 Run `npm test` from `MOBILE_APP_REACT_NATIVE/` — must pass (consumer-side tests + module-side tests)
- [ ] 53d.3 Fix any remaining type errors (likely in `TransportContext.tsx` due to `MpvPlayer.on()` event types changing)

---

### Phase 54 — Mount module UI in `PlayerActivity`

**Status:** [ ] Pending
**Estimated effort:** 1 day
**Deliverable:** The consumer's `PlayerActivity` (Kotlin side launches the React tree) renders `<PlayerProvider>` + `<PlayerRoot>`. The module's `<DefaultControls>` is the player UI. Custom UI components (`VideoMiniCard`, `VideoLockedOverlay`, `VideoMoreSheet`, etc.) are deleted.

#### Sub-phase 54a — Wire `PlayerActivity`

- [ ] 54a.1 Open the consumer's `PlayerActivity` entry point (or where the launched activity's React tree is mounted)
- [ ] 54a.2 Wrap the root component in `<PlayerProvider>`:
  ```tsx
  import {PlayerProvider, PlayerRoot} from '@simba-dev/react-native-media-player';

  <PlayerProvider config={{/* V12 config */}}>
    <PlayerRoot />
  </PlayerProvider>
  ```
- [ ] 54a.3 On mount, call `usePlayerActivity().getLaunchParams()` to seed the player's initial file

#### Sub-phase 54b — Replace custom UI

- [ ] 54b.1 Delete `src/modules/playback/video/presentation/VideoControlLayer.tsx`
- [ ] 54b.2 Delete `src/modules/playback/video/presentation/VideoCenterAction.tsx`
- [ ] 54b.3 Delete `src/modules/playback/video/presentation/VideoControlButton.tsx`
- [ ] 54b.4 Delete `src/modules/playback/video/presentation/VideoLockedOverlay.tsx`
- [ ] 54b.5 Delete `src/modules/playback/video/presentation/VideoMiniCard.tsx`
- [ ] 54b.6 Delete `src/modules/playback/video/presentation/VideoMiniFrame.tsx`
- [ ] 54b.7 Delete `src/modules/playback/video/presentation/VideoMiniProgress.tsx`
- [ ] 54b.8 Delete `src/modules/playback/video/presentation/VideoMoreSheet.tsx`
- [ ] 54b.9 Delete `src/modules/playback/video/presentation/VideoPresentationShell.tsx`
- [ ] 54b.10 Delete `src/modules/playback/video/presentation/VideoPresentationTypes.ts`
- [ ] 54b.11 Delete `src/modules/playback/video/presentation/VideoProgressRail.tsx`
- [ ] 54b.12 Delete `src/modules/playback/video/presentation/VideoResumePrompt.tsx`
- [ ] 54b.13 Delete `src/modules/playback/video/presentation/VideoSafeControlLayer.tsx`
- [ ] 54b.14 Delete `src/modules/playback/video/presentation/VideoStatusPill.tsx`
- [ ] 54b.15 Delete `src/modules/playback/video/presentation/VideoSurfaceGestures.tsx`
- [ ] 54b.16 Delete `src/modules/playback/video/presentation/VideoTopBar.tsx`
- [ ] 54b.17 Delete `src/modules/playback/video/presentation/VideoUnlockHint.tsx`
- [ ] 54b.18 Delete `src/modules/playback/video/presentation/autoHideTriggerContract.ts`
- [ ] 54b.19 Delete `src/modules/playback/video/presentation/useVideoPresentationGeometry.ts`
- [ ] 54b.20 Delete `src/modules/playback/video/presentation/videoShellConstants.ts`
- [ ] 54b.21 Delete `src/modules/playback/video/presentation/videoUiFlags.ts`
- [ ] 54b.22 Delete `src/modules/playback/video/presentation/VideoIcon.tsx`

#### Sub-phase 54c — Verify the activity launches with module UI

- [ ] 54c.1 Build the consumer app + module: `./gradlew.bat :app:assembleDebug` from `MOBILE_APP_REACT_NATIVE/android/`
- [ ] 54c.2 Install on a test device, tap a video file — verify the PlayerActivity opens with the module's `<DefaultControls>` (top bar + scrubber + transport)
- [ ] 54c.3 Verify play / pause / seek / skip work
- [ ] 54c.4 Verify PiP enters + exits cleanly
- [ ] 54c.5 Verify audio-only launches with the same UI (the module doesn't differentiate audio vs video in `<DefaultControls>`)

---

### Phase 55 — Delete legacy V11 audio components

**Status:** [ ] Pending
**Estimated effort:** 1 day
**Deliverable:** The audio lane stops using its custom UI components; everything renders through `<PlayerRoot>` + `<DefaultControls>`.

- [ ] 55.1 Delete `src/modules/playback/audio/AudioModule.tsx`
- [ ] 55.2 Delete `src/modules/playback/audio/AudioPlayer.tsx`
- [ ] 55.3 Delete `src/modules/playback/audio/AudioPlaybackControllerContext.tsx`
- [ ] 55.4 Delete `src/modules/playback/audio/AudioTransportControls.tsx`
- [ ] 55.5 Delete `src/modules/playback/audio/AudioProgress.tsx`
- [ ] 55.6 Delete `src/modules/playback/audio/AudioOutputControl.tsx`
- [ ] 55.7 Delete `src/modules/playback/audio/AudioPriorityActions.tsx`
- [ ] 55.8 Delete `src/modules/playback/audio/AudioArtwork.tsx`
- [ ] 55.9 Delete `src/modules/playback/audio/AudioButton.tsx`
- [ ] 55.10 Delete `src/modules/playback/audio/AudioIcon.tsx`
- [ ] 55.11 Delete `src/modules/playback/audio/AudioMiniProgress.tsx`
- [ ] 55.12 Delete `src/modules/playback/audio/MiniAudio.tsx`
- [ ] 55.13 Delete `src/modules/playback/audio/AudioTypes.ts`
- [ ] 55.14 Delete `src/modules/playback/audio/hooks/useAudioPlayerScreen.ts`
- [ ] 55.15 Delete `src/modules/playback/audio/rangeNormalization.ts`
- [ ] 55.16 Delete `src/modules/playback/audio/index.tsx`
- [ ] 55.17 Replace all `import {MiniAudio}` references in the consumer with `<PlayerRoot>` (or a thin wrapper)

---

### Phase 56 — Delete the inline bridge code

**Status:** [ ] Pending
**Estimated effort:** 0.5 day
**Deliverable:** `src/native/` is gone; the module is the only source of player bridge types.

- [ ] 56.1 Delete `src/native/NativeMpvPlayer.ts`
- [ ] 56.2 Delete `src/native/player.api.ts`
- [ ] 56.3 Delete `src/native/index.ts`
- [ ] 56.4 Remove `codegenConfig` block from consumer's `package.json` (the `jsSrcsDir: "src/native"` no longer applies)
- [ ] 56.5 Verify `npm run typecheck` still passes

---

### Phase 57 — Delete `PlaybackContext.tsx` + `PlaybackOverlayHost.tsx` + `TransportContext.tsx`

**Status:** [ ] Pending
**Estimated effort:** 1 day
**Deliverable:** The consumer's `src/modules/playback/` directory is gone. `<PlayerProvider>` is the only player state owner.

- [ ] 57.1 Delete `src/modules/playback/PlaybackContext.tsx`
- [ ] 57.2 Delete `src/modules/playback/PlaybackOverlayHost.tsx`
- [ ] 57.3 Delete `src/modules/playback/types.ts`
- [ ] 57.4 Delete `src/modules/playback/index.ts`
- [ ] 57.5 Delete `src/modules/playback/video/` (entire folder)
- [ ] 57.6 Delete `src/modules/playback/audio/` (already deleted in Phase 55 — verify)
- [ ] 57.7 Delete `src/contexts/TransportContext.tsx`
- [ ] 57.8 Delete `__tests__/playbackOverlayHost.test.tsx`
- [ ] 57.9 Delete `__tests__/videoCenterAction.test.tsx`, `__tests__/videoDeadControlSweep.test.tsx`, `__tests__/videoLoadingState.test.ts`, `__tests__/videoLockedOverlay.test.tsx`, `__tests__/videoManifestUnpinned.test.ts`, `__tests__/videoMiniCard.test.tsx`, `__tests__/videoMoreSheet.test.tsx`, `__tests__/videoProgressRail.test.tsx`, `__tests__/videoResumePrompt.test.tsx`, `__tests__/videoRotateAffordance.test.tsx`, `__tests__/videoStatusPill.test.tsx`, `__tests__/videoTopBar.test.tsx`, `__tests__/videoUiFlags.test.tsx`, `__tests__/videoUtilityRow.test.tsx` (V11 video tests)
- [ ] 57.10 Update `App.tsx`: remove `<PlaybackProvider>` + `<PlaybackOverlayHost>`, replace with `<PlayerProvider>` at the root
- [ ] 57.11 Run `npm run typecheck` from consumer — must pass
- [ ] 57.12 Run `npm test` from consumer — must pass

---

### Phase 58 — V13.0.0 release

**Status:** [~] In Progress (v1.2.0 tagged + pushed; release.yml running; on-device smoke test + promote to `latest` are user steps)
**Estimated effort:** 1 day
**Deliverable:** Module published as `1.2.0` (V13 minor; the bridge expansion + new hooks are backward-compatible consumer-facing changes). Final QA report + cross-reference updates.

- [x] 58.1 Bump module `package.json` to `1.2.0` (commit `9ea0456`)
- [x] 58.2 Update `CHANGELOG.md` (commit `9ea0456`)
- [x] 58.3 Final QA: `npm test` + `npm run typecheck` from the module repo must pass (100/100 pass, typecheck clean)
- [x] 58.4 Final QA: `npm run typecheck` + `npm test` from the consumer repo must pass (19/19 + 1 todo pass, typecheck clean)
- [ ] 58.5 Build consumer APK + install on a test device: `MOBILE_APP_REACT_NATIVE/android/gradlew.bat :app:assembleDebug`
- [ ] 58.6 Smoke test: play a video, play an audio file, seek, pause, skip, PiP, lock-screen controls, Bluetooth controls, exit PiP, exit app + relaunch + resume
- [x] 58.7 `git tag v1.2.0 && git push origin v1.2.0` (tag pushed; release.yml is running in CI)
- [ ] 58.8 Trigger `promote.yml` → flips `1.2.0` to `latest` ([run workflow](https://github.com/pavalep/react-native-media-player/actions/workflows/promote.yml))
- [x] 58.9 Write `md/SIMBA_PLAYER_MODULE_V13_FINAL_QA_REPORT.md` (sign-off)
- [x] 58.10 Update V13 planning doc's status note (link to the V13 spec + tracker)
- [x] 58.11 Update `X:\Development\SIMBA\secrets\RELEASE_FLOW.md` if any release flow steps changed (added V13.0.0 release notes section)

---

## 3. Gap analysis (output of Phase 49)

### 3.1 Bridge method expansion (Phase 50)

The 78 methods that `MpvPlayerModuleBridge` should expose after Phase 50. Grouped by the consumer's usage pattern:

**Group A — Already in module's bridge (9 methods, copy from Phase 24):**
- `play`, `pause`, `seekAbsolute`, `seekBackward`, `seekForward`, `setConfig`, `setDebugLogging`, `dumpObservedProperties`

**Group B — Used by consumer's `TransportContext.tsx` (12 methods):**
- `setProperty(name, value)`, `getProperty(name)`, `observeProperty(name)`, `unobserveProperty(name)`, `getPosition()`, `getDuration()`, `getPlaybackState()`, `resume()` (alias for `play()`), `seekTo(position)` (alias for `seekAbsolute()`)

**Group C — Used by consumer's `notificationService.ts` (3 methods):**
- `requestNotificationPermission()`, `subscribePlayerEvent('onPositionChanged', ...)`, `subscribePlayerEvent('onPlaybackStateChanged', ...)`, `subscribePlayerEvent('onEndFile', ...)`, `subscribePlayerEvent('onError', ...)`, `subscribePlayerEvent('onFileLoaded', ...)` (covered by event subscription API, Phase 50c)

**Group D — Used by consumer's `audioSettingsService.ts` (1 method, already in Group B):**
- `setProperty(name, value)`

**Group E — Used by consumer's `metadataService.ts` (1 method, already in Group B):**
- `getProperty(name)`

**Group F — Used by consumer's `fileService.ts` (2 methods):**
- `grantPersistablePermission(uri)`, `verifyContentUri(uri)`

**Group G — Used by consumer's `usePlaybackCommands.openPlayer` (1 method):**
- `openPlayer(uri, title, type, startPositionMs)`

**Group H — Used by consumer's `usePlayback.loadLaunchParams` (1 method):**
- `getLaunchParams()`

**Group I — Lifecycle + state (from Kotlin Spec):**
- `initPlayer()`, `destroy()`, `getNativePtr()`, `loadFile(path)`, `loadFileWithRequestId(path, requestId)`, `loadPlaylist(paths, startIndex?)`, `stop()`, `togglePlayPause()`, `stepFrame(direction)`, `screenshot()`, `getFileInfo()`, `getVideoParams()`, `captureThumbnail(uri)`

**Group J — Tracks + chapters (from Kotlin Spec):**
- `getTracks()`, `selectTrack(trackId)`, `cycleTrack(type)`, `setTrackVisibility(trackType, visible)`, `setTrack(type, trackId)`, `getChapters()`, `seekChapter(direction)`, `getCurrentChapter()`

**Group K — Volume + audio devices (from Kotlin Spec):**
- `setVolume(volume)`, `getVolume()`, `setMuted(muted)`, `getMuted()`, `isMuted()`, `getAudioDevices()`, `setAudioDevice(deviceName)`, `toggleMute()`, `setAudioFilter(filter, enabled)`, `setVideoFilter(filter, enabled)`

**Group L — Speed + loop (from Kotlin Spec):**
- `setSpeed(speed)`, `getSpeed()`, `setLoopMode(mode)`, `getLoopMode()`, `setPlaylistLoop(loop)`

**Group M — Playlist (from Kotlin Spec):**
- `getPlaylist()`, `playlistNext()`, `playlistPrev()`, `playlistRemove(index)`, `playlistShuffle()`, `playlistClear()`

**Group N — PiP (from Kotlin Spec):**
- `enterPip(chapterTitle?, progressPct?)`, `exitPip()`, `exitPipAndFinish()`, `setKeepScreenOn(enabled)`

**Group O — Orientation + immersive (from Kotlin Spec, feature-detected):**
- `setOrientation(mode)`, `setImmersive(enabled)`

**Group P — Brightness (from Kotlin Spec):**
- `setScreenBrightness(value)`, `getScreenBrightness()`

**Group Q — Property load (from Kotlin Spec):**
- `loadExternalSubtitle(uri)` (alias for `setProperty('sub-add', uri)`)

**Total: 78 methods.**

### 3.2 Event subscription expansion (Phase 50c)

The 22 events that `subscribePlayerEvent` should accept. Payload types match the Kotlin side (`MpvBridgeModule.kt` lines 779-1102 for the `RCTEventEmitter` constant strings):

- `onFileLoaded` — `{ requestId?: string; resolvedPath?: string; file?: MpvFileInfo }`
- `onPlaybackStateChanged` — `{ state: 'idle' | 'playing' | 'paused' | 'stopped' | 'error' }`
- `onPositionChanged` — `{ position: number }`
- `onDurationChanged` — `{ duration: number }`
- `onPropertyChanged` — `{ property: string; value: unknown }`
- `onTracksChanged` — `{ tracks: MpvTrack[] }`
- `onChapterChanged` — `{ chapter: MpvChapter | null }`
- `onVideoParamsChanged` — `{ params: MpvVideoParams }`
- `onError` — `{ code: number; recoverable: boolean; message: string; requestId?: string }`
- `onBuffering` — `{ percent: number; isBuffering?: boolean }`
- `onCacheState` — `{ ranges: Array<{start: number; end: number}>; fill: number }`
- `onSeekable` — `{ seekable: boolean }`
- `onSeeking` — `{ seeking: boolean }`
- `onEndFile` — `{ reason: number; error: number; requestId?: string }`
- `onPlaybackRestart` — `{}`
- `onEndReached` — `{}` (deprecated)
- `onAudioDeviceChanged` — `{ device: string }`
- `onVolumeChanged` — `{ volume: number }`
- `onSpeedChanged` — `{ speed: number }`
- `videoReconfig` — `{}`
- `onPipModeChanged` — `{ isInPip: boolean }`
- `onPipPlayPause` — `{}`
- `onPipExpand` — `{}`
- `onPipClose` — `{}`

### 3.3 Consumer call sites — migration map

| File | Migration |
|---|---|
| `App.tsx` | Remove `<PlaybackProvider>` + `<PlaybackOverlayHost>`; wrap root in `<PlayerProvider>` |
| `src/services/fileService.ts` | `MpvPlayer.grantPersistablePermission` / `verifyContentUri` → `getMpvPlayerModule()` |
| `src/services/audioSettingsService.ts` | `MpvPlayer.setProperty` → `getMpvPlayerModule().setProperty` |
| `src/services/metadataService.ts` | `MpvPlayer.getProperty` → `getMpvPlayerModule().getProperty` |
| `src/services/notificationService.ts` | `MpvPlayer.on(...)` → `subscribePlayerEvent(...)`; `NativeModules.MpvPlayerModule` → `getMpvPlayerModule()` |
| `src/contexts/TransportContext.tsx` | All `MpvPlayer.*` calls → `getMpvPlayerModule()` |
| 33× screen files (NowPlaying, AllVideos, Bookmarks, …) | `usePlaybackCommands().openPlayer` → `usePlayerActivity().openPlayer` (signature reshape) |

---

## 4. Cross-references

- V12 spec: [`SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md)
- V13 planning (superseded themes): [`SIMBA_PLAYER_MODULE_V13_PLANNING.md`](./SIMBA_PLAYER_MODULE_V13_PLANNING.md)
- V12 release runbook: [`SIMBA_PLAYER_MODULE_V12_RELEASE_RUNBOOK.md`](./SIMBA_PLAYER_MODULE_V12_RELEASE_RUNBOOK.md)
- V12 final QA report: [`SIMBA_PLAYER_MODULE_V12_FINAL_QA_REPORT.md`](./SIMBA_PLAYER_MODULE_V12_FINAL_QA_REPORT.md)
- Module repo: `X:\Development\SIMBA\react-native-media-player\`
- Module CI/CD runbook (local): `X:\Development\SIMBA\secrets\RELEASE_FLOW.md`

---

# End of V13 specification doc.
