# SIMBA Player Audit — Video & Audio (v11)

**Date:** 2026-08-25
**Scope:** Full audit of the video player (`src/modules/playback/video/**`), audio player (`src/modules/playback/audio/**`), shared playback context, and native MPV bridge (`android/app/src/main/java/com/simba/player/mpv/MpvBridgeModule.kt`, `android/app/src/main/cpp/*`).
**Verdict:** The engine layer is built, but the video lane is wired to a dead event bus, the release lifecycle can destroy a live player, and most of the feature surface (speed, tracks, captions, queue, bookmarks, chapters, gestures) exists as unreachable dead code. Audio is healthier but ships with dead panels, an unarmable sleep timer, and split-brain state. Every finding below is cited `file:line`.

---

## 0. Executive Summary

| Area | Grade | One-line |
|---|---|---|
| Video MPV integration | **F** | Position/state/buffering events never reach the video session; release() destroys the player another session just initialized. |
| Video buffering UX | **D** | Cache telemetry is collected but clobbered, stuck phases, frozen seek bar on streams. |
| Video controls surface | **F** | Speed/queue/bookmark/chapters/lock/fullscreen/gestures: all missing or unwired. Backend exists for most. |
| Video page design | **D** | JS-thread layout animation, tap-only scrub, magic-number placement, no auto-hide. |
| Audio MPV integration | **B** | Event-driven + polling, buffering fix is real (paused-for-cache policy, honest ranges, terminal-only error). |
| Audio UX | **C** | Speed UI, sleep-timer arm, lyrics/info panels, chapter display are dead; collapse re-runs init. |
| Cross-cutting | **D** | Dead routes (`'VideoPlayer'`), duplicate listeners, three parallel play-state sources. |

**Root cause pattern:** the refactor layered session/port/presentation correctly, but two fatal seams were never closed:
1. **Property observation was never added for the video lane** — the native bridge emits position/play-state/buffering *only* from mpv property observers, and only the audio `TransportContext` registers them.
2. **Session teardown is async fire-and-forget against a global native singleton** — a closing session's deferred `destroy()` runs *after* the opening session's `initPlayer()`, killing the new handle.

---

## 1. VIDEO PLAYER — ENGINE / MPV INTEGRATION

### 1.1 Playback start flow (as built)

```
PlaybackContext.openPlayer → PlaybackOverlayHost (video lane, z100/z90)
→ VideoHost (useMemo createVideoPlayback)
→ surface.attach() + session.load(request)
→ VideoMpvSession: bump generation → snapshot='preparing' → initPlayer()
→ MpvPlayer.loadFileWithRequestId(uri, token)
→ bridge: getLocalPath remap → native loadfile + enqueueLoadRequest(token)
→ MPV_EVENT_FILE_LOADED → onFileLoaded{requestId} (token-correlated)
→ applyPendingStart: seek(start) + play()
→ videoReconfig → hasFirstFrame → getNativePtr() → mount MpvRenderView
```

References: [VideoHost.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/host/VideoHost.tsx#L35), [VideoMpvSession.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L158-L189), [native_state.cpp](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/cpp/native_state.cpp#L51-L84).

---

### 1.2 CRITICAL

#### C1 — Video lane never observes mpv properties → position, play state, and buffering events never fire
The video session subscribes to `onPositionChanged`, `onDurationChanged`, `onPlaybackStateChanged`, `onBuffering`, `onCacheState`, `onSeekable`, `onSeeking`
([VideoMpvSession.ts:351-478](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L351-L478)).
But the bridge emits all of these **only from mpv property observers**
([MpvBridgeModule.kt:93-186](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/MpvBridgeModule.kt#L93-L186)),
and observers are only registered when JS calls `observeProperty`
([property.cpp:143](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/cpp/property.cpp#L143)).
The only caller is `TransportContext` — and `TransportProvider` is mounted **only for the audio lane**
([PlaybackOverlayHost.tsx:21-47](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/PlaybackOverlayHost.tsx#L21-L47)).
Nothing in `src/modules/playback/video/**` calls `observeProperty`.

Consequences:
- Progress rail frozen during playback ([VideoProgressRail.tsx:39,88-89](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoProgressRail.tsx#L39)).
- Play/pause button never reflects reality — `play()/pause()` only call native, no state event ever returns ([VideoMpvSession.ts:240-248](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L240-L248)).
- "Buffering" label and cache bar are dead for video ([VideoControlLayer.tsx:54](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoControlLayer.tsx#L54), [VideoFirstFrameLoading.tsx:65-69](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/loading/VideoFirstFrameLoading.tsx#L65-L69)).
- On streams, duration is unknown at `FILE_LOADED` and `onDurationChanged` never fires → `duration=null`, `canSeek=false` forever ([VideoStateAdapter.ts:27](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/state/VideoStateAdapter.ts#L27)).

#### C2 — `dispatch({type:'release'})` deadlocks
`dispatch` chains `this.tail = result.then(...)` ([VideoIntentController.ts:30-34](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/controller/VideoIntentController.ts#L30-L34)); `'release'` calls `dispose()` which awaits `this.tail` (lines 44-47, 95-97) — circular wait on its own promise. Anything queued behind never runs.

#### C3 — Deferred destroy of the old session kills the newly initialized player
`VideoHost` cleanup fires `playback.release()` fire-and-forget ([VideoHost.tsx:85-87](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/host/VideoHost.tsx#L85-L87)); `release()` defers `stop()/destroy()` into a microtask ([VideoMpvSession.ts:313,326-331](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L313)) against the **global singleton** module.
On close-then-open: new `initPlayer()` returns `true` without creating a handle because one exists ([MpvBridgeModule.kt:813-816](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/MpvBridgeModule.kt#L813-L816)), load runs, `getNativePtr()` returns the handle — then the queued microtask calls `destroy()` and zeroes it (lines 836-843). Result: dangling `nativePtr` in React state, surface rendering against a destroyed handle, and every later command throws `IllegalStateException` from `ensurePtr()` (lines 1037-1042). No generation/lease check in `release()`.

---

### 1.3 BUFFERING

| # | Finding | Evidence |
|---|---|---|
| B1 | Phase sticks at `'buffering'` after the stall ends. `onBuffering` only transitions *into* buffering; ending `paused-for-cache` doesn't change the `pause` property so no state event fires. Native *does* emit `playbackRestart` — the session ignores it. | [VideoMpvSession.ts:383-392](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L383-L392), [MpvBridgeModule.kt:113-123](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/MpvBridgeModule.kt#L113-L123), [event.cpp:267](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/cpp/event.cpp#L267) |
| B2 | Seek while buffering hides the stall: `onSeeking` computes `seeking ? 'seeking' : isPlaying ? 'playing' : 'paused'`, ignoring `isBuffering`. The pure reducer says `seeking > buffering > playing` — the imperative handlers disagree. | [VideoMpvSession.ts:258-264,409-416](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L409-L416), [reduceVideoSessionEvent.ts:8-17](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/state/reduceVideoSessionEvent.ts#L8-L17) |
| B3 | `onCacheState` overwrites `cacheFill` with hardcoded native `0.0`, clobbering the real fill from `onBuffering`. First-frame bar flickers/disappears. | [VideoMpvSession.ts:393-400](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L393-L400), [MpvBridgeModule.kt:1115](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/MpvBridgeModule.kt#L1115) |
| B4 | `paused-for-cache` re-emitted as fabricated `percent: 50` — a fixed half-bar, not the true fill. | [MpvBridgeModule.kt:113-119](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/MpvBridgeModule.kt#L113-L119) |
| B5 | `onDurationChanged` stores `finiteOrNull(duration)` unconditionally — a transient NaN can null a known duration and disable seeking. The reducer guards this; the session doesn't. | [VideoMpvSession.ts:376-382](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L376-L382) vs [reduceVideoSessionEvent.ts:19-21](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/state/reduceVideoSessionEvent.ts#L19-L21) |

**Contrast — audio's working solution** (this is what video must mirror):
- Four observed properties: `cache-buffering-state`, `paused-for-cache`, `demuxer-cache-state`, `seekable` ([TransportContext.tsx:286-309](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/contexts/TransportContext.tsx#L286-L309)).
- Same-URI reload storm killed: `onError` reserved for fatal failures; underruns stay inside the same load as `paused-for-cache` ([useAudioPlayerScreen.ts:1222-1224](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/hooks/useAudioPlayerScreen.ts#L1222-L1224)).
- End-file reason guard: only `reason === 0` advances ([useAudioPlayerScreen.ts:1252-1257](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/hooks/useAudioPlayerScreen.ts#L1252-L1257)).
- Honest buffered ranges: never fakes continuous fill; renders only the window containing the playhead ([rangeNormalization.ts:6-69](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/rangeNormalization.ts#L6-L69)).
- Cache reset on file load ([TransportContext.tsx:276-285](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/contexts/TransportContext.tsx#L276-L285)).

---

### 1.4 EVENT SUBSCRIPTION BUGS

| # | Finding | Evidence |
|---|---|---|
| E1 | `onError` not generation-scoped; a stale error from file A poisons generation B after `load(B)`. | [VideoMpvSession.ts:464-466](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L464-L466) |
| E2 | `getTracks()`/`getChapters()` return JSON **strings** natively but are never parsed (unlike `getFileInfo`) → `.map` throws inside try/catch → tracks/chapters always `[]`, permanently. | [player.api.ts:172-174,189-191](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/native/player.api.ts#L172-L191), [VideoMpvSession.ts:506-515](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L506-L515) |
| E3 | `onTracksChanged`/`onChapterChanged`/`onVideoParamsChanged` are never emitted — the C++ loop only emits fileLoaded/startFile/endFile/playbackRestart/seek/queueOverflow/reconfig/surfaceAttached. Dead listeners. | [VideoMpvSession.ts:417-441](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L417-L441), [event.cpp:221-337](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/cpp/event.cpp#L221-L337) |
| E4 | Playback unit created in `useMemo` during render → ~14 session + 4 PiP listeners registered before commit; discarded speculative renders / StrictMode orphans leak them. | [VideoHost.tsx:35](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/host/VideoHost.tsx#L35), [VideoMpvSession.ts:128-130](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L128-L130) |
| E5 | `subscribe()` invokes the listener synchronously with the snapshot; if it throws, the caller never gets the unsubscribe but the listener stays registered. Same in `VideoStateAdapter`, `VideoSurfaceController`, `VideoPipAdapter`. | [VideoMpvSession.ts:136-141](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L136-L141) |
| E6 | `MpvPlayer.once()` casts to `any` and returns void — un-removable subscription hazard. | [player.api.ts:370-379](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/native/player.api.ts#L370-L379) |

### 1.5 RACE CONDITIONS

| # | Finding | Evidence |
|---|---|---|
| R1 | C3 above is the primary race. | — |
| R2 | Re-opening the same source with a new `startPosition` is silently dropped: load effect deps are `[playback, sourceFingerprint]` only. Second open of the same URI at a different resume position does nothing. | [VideoHost.tsx:90-109](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/host/VideoHost.tsx#L90-L109), [VideoMpvSession.ts:147-156](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L147-L156) |
| R3 | Mount-time load bypasses the intent serializer (`session.load` direct) while recovery loads go through `commands.dispatch` — two unsynchronized entry points. | [VideoHost.tsx:94,117-128](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/host/VideoHost.tsx#L94) |
| R4 | Stale-generation seeks are dropped by `session.seek` but reported `{ok:true}` — callers can't tell. | [VideoHost.tsx:133-139](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/host/VideoHost.tsx#L133-L139), [VideoMpvSession.ts:252](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L252) |
| R5 | Token-less `onFileLoaded` (`payload.requestId === undefined`) is rejected forever with no timeout; the path fallback can't match because native resolves `content://` → `fd://N`. | [VideoMpvSession.ts:161,483-496](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L483-L496), [native_state.cpp:53-84](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/cpp/native_state.cpp#L53-L84) |

### 1.6 MEMORY / LIFECYCLE LEAKS

| # | Finding | Evidence |
|---|---|---|
| L1 | Orphaned native listeners from discarded render-time instances (E4). | — |
| L2 | StrictMode double-mount: cleanup `release()`s the memoized playback, second mount reuses the released instance → `'The V3 video session has been released.'` throw → `nativePtr=0`. Lifecycle not re-entrant. | [VideoHost.tsx:35,83-88](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/host/VideoHost.tsx#L83-L88), [VideoMpvSession.ts:593-595](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L593-L595) |
| L3 | Native pending-load entries never reaped when superseded before FILE_LOADED; queue grows on rapid switches, corrupting the single-pending heuristic. | [native_state.cpp:37-49,71-73](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/cpp/native_state.cpp#L37-L73) |
| L4 | PiP active at release time: nothing calls `exitPip` → activity stuck in PiP with no action listeners. | [createVideoPlayback.ts:32-38](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/createVideoPlayback.ts#L32-L38) |

### 1.7 MISSING ERROR HANDLING

| # | Finding | Evidence |
|---|---|---|
| M1 | **No load/first-frame timeout or watchdog.** If `onFileLoaded` or `videoReconfig` never arrives, phase sits at preparing/connecting and the spinner runs forever. No retry, no escape. | [VideoMpvSession.ts:188-189](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L188-L189), [VideoFirstFrameLoading.tsx:36-38](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/loading/VideoFirstFrameLoading.tsx#L36-L38) |
| M2 | `ensurePtr` throws `IllegalStateException` after C3; direct session callers (`applyPendingStart`) don't guard — synchronous throw inside a native event handler. | [VideoMpvSession.ts:534-547](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L534-L547) |
| M3 | `loadFileWithRequestId` wrapper has no try/catch diagnostics (unlike `loadFile`). | [player.api.ts:126-129](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/native/player.api.ts#L126-L129) |
| M4 | Recovery reload from error phase can be poisoned by stale errors (E1). | [VideoHost.tsx:123-128](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/host/VideoHost.tsx#L123-L128) |
| M5 | Errors hardcoded `recoverable: true` — terminal end-file errors indistinguishable from transient. | [VideoMpvSession.ts:558-575](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L558-L575), [event.cpp:252-261](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/cpp/event.cpp#L252-L261) |

### 1.8 PIP / SURFACE / RESIZE

| # | Finding | Evidence |
|---|---|---|
| P1 | PiP mode sticks in `'entering'` forever when native entry fails silently (swallowed exception → no `onPipModeChanged`). Chrome hidden, no timeout revert. Same for `'exiting'`. | [VideoPipAdapter.ts:78,91-101](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/platform/VideoPipAdapter.ts#L78), [MpvBridgeModule.kt:893-895](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/MpvBridgeModule.kt#L893-L895) |
| P2 | **`exitPip()` finishes the whole app.** Single `singleTop` activity + `activity.finish()` on expand → app terminates instead of restoring. `exitPipAndFinish()` → `finishAndRemoveTask()` kills the task. | [MpvBridgeModule.kt:902-920](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/MpvBridgeModule.kt#L902-L920), [MainActivity.kt:66-72](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/MainActivity.kt#L66-L72) |
| P3 | Surface port/controller are inert bookkeeping: geometry never passed, state never consumed. | [VideoHost.tsx:111-113](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/host/VideoHost.tsx#L111-L113), [VideoSurfaceController.ts:40-57](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/surface/VideoSurfaceController.ts#L40-L57) |
| P4 | Mini↔full transition animates width/height/left/bottom with `useNativeDriver: false` — full layout pass per frame on the JS thread + `onSurfaceTextureSizeChanged` storms during the 280ms transition. | [VideoPresentationShell.tsx:43-73](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoPresentationShell.tsx#L43-L73) |
| P5 | `nativeSurfaceChanged` is a pure log no-op; relies entirely on ANativeWindow reflow. | [main.cpp:379-385](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/cpp/main.cpp#L379-L385) |
| P6 | **No position polling on the video lane.** `VideoNativeStateSynchronizer` refreshes only on file-loaded/surface-attached/first-frame/ended; nobody dispatches `refresh`. Combined with C1, the timeline is frozen during playback. Audio avoids this with a 1s poll + observers. | [VideoNativeStateSynchronizer.ts:8-10,34-43](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/state/VideoNativeStateSynchronizer.ts#L8-L43), [TransportContext.tsx:367-391](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/contexts/TransportContext.tsx#L367-L391) |

---

## 2. VIDEO PLAYER — CONTROLS & PAGE DESIGN

### 2.1 Hosting architecture (no dedicated screen)
Video playback is a **root overlay**, not a route: `PlaybackOverlayHost` mounts `<VideoHost active>` in a fullscreen (z100) or mini (z90) layer ([PlaybackOverlayHost.tsx:21-29,50-65](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/PlaybackOverlayHost.tsx#L21-L29)). Opened via `openPlayer(...)` from MovieDetail, ShowDetail, ArchiveItemDetail, Home, History, FolderBrowser, MoviesDataProvider, LiveTV.

**Broken routes (real bugs):**
- `useAllVideosScreen.ts:81` navigates to `'VideoPlayer'` — **route does not exist** in `RootNavigator.tsx`, `navigation/types.ts`, or `linking.ts`. Masked by `useNavigation<any>()`. Tapping a video in AllVideos goes nowhere.
- Live TV share/deep links target the same dead route (`LiveTVContent.tsx:250`, `LiveTVFavoritesScreen.tsx:138`, `LiveTVScreen.tsx:491`).

### 2.2 Controls that EXIST

| Control | Evidence |
|---|---|
| Back + title | [VideoControlLayer.tsx:98-99](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoControlLayer.tsx#L98-L99) |
| Tap-anywhere chrome toggle | [VideoControlLayer.tsx:108-113](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoControlLayer.tsx#L108-L113) |
| Status line (preparing/connecting/buffering/seeking/error) | [VideoControlLayer.tsx:115-122](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoControlLayer.tsx#L115-L122) |
| Center play/pause/retry | [VideoControlLayer.tsx:124-135](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoControlLayer.tsx#L124-L135) |
| Tap-to-seek rail w/ buffered range | [VideoProgressRail.tsx:64-99](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoProgressRail.tsx#L64-L99) |
| Rewind 10s / play / forward 10s | [VideoControlLayer.tsx:142-151](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoControlLayer.tsx#L142-L151) |
| PiP (Android only) | [VideoPlatformCapabilities.ts:11](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/infrastructure/VideoPlatformCapabilities.ts#L11) |
| Close | [VideoControlLayer.tsx:159](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoControlLayer.tsx#L159) |

### 2.3 Controls that are MISSING

| Feature | Status | Evidence |
|---|---|---|
| **Playback speed** | Backend complete (`set-speed` intent, dispatch, session impl, capability) — **zero UI, nobody dispatches it** | [VideoCommands.ts:11](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/ports/VideoCommands.ts#L11), [VideoIntentController.ts:82-87](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/controller/VideoIntentController.ts#L82-L87) |
| **Quality / track selection** | `select-track` intent exists; ready-made `TrackSelectionPopup` component exists — **never imported by the player** (dead component) | [components/player/TrackSelectionPopup](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/TrackSelectionPopup/TrackSelectionPopup.tsx#L60) |
| **Subtitle selection / toggle** | `onToggleCaptions` never passed by the host → button never renders even with subtitle tracks. Only global Settings dialogs exist. | [VideoHost.tsx:151-166](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/host/VideoHost.tsx#L151-L166), [VideoControlLayer.tsx:155](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoControlLayer.tsx#L155) |
| **Queue** | `QueueScreen` registered and supports `from: 'video'` — **zero `navigate('Queue')` calls anywhere**. No queue button, no episode progression (`onPrevious/onNext` props dangling). | [RootNavigator.tsx:271-275](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/navigation/RootNavigator.tsx#L271-L275), [VideoControlLayer.tsx:29-30](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoControlLayer.tsx#L29-L30) |
| **Bookmark** | No bookmark intent or button in the video module. Bookmarks exist only outside the player (audio side + Live TV context menu). | [VideoCommands.ts:3-14](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/ports/VideoCommands.ts#L3-L14) |
| **Chapters** | Data model complete (`VideoChapter`, snapshot, `canViewChapters`) — no list UI, no markers on the rail. Shared `ChapterList` used only by audio. | [VideoTypes.ts:42-47](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/domain/VideoTypes.ts#L42-L47), [VideoStateAdapter.ts:32](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/state/VideoStateAdapter.ts#L32) |
| **Fullscreen / rotation** | Hardcoded off: `canFullscreen: false, canChangeOrientation: false` ("hidden until V3 owns dedicated bridges"). "Full" is just a portrait overlay. | [VideoPlatformCapabilities.ts:14-15](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/infrastructure/VideoPlatformCapabilities.ts#L14-L15) |
| **Lock screen** | Props + icons + state all scaffolded — never wired. No locked-chrome behavior. | [VideoControlLayer.tsx:35-36,101](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoControlLayer.tsx#L35-L36) |
| **Double-tap seek** | Tap surface is a plain chrome toggle. Complete legacy impl in `usePlayerGestures.ts` — **dead code, zero importers**. | [hooks/usePlayerGestures.ts:55-99](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/hooks/usePlayerGestures.ts#L55-L99) |
| **Volume/brightness gestures** | Only in dead `usePlayerGestures.ts`. `set-volume`/`set-muted` backend exists; `volume`/`mute` icons defined but never used. | [VideoCommands.ts:9-10](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/ports/VideoCommands.ts#L9-L10), [VideoIcon.tsx:73-76](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoIcon.tsx#L73-L76) |
| **Next/previous** | Props rendered only if passed; host omits both. | [VideoControlLayer.tsx:141,152](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoControlLayer.tsx#L141) |
| **Chrome auto-hide** | `chromeVisible` starts true, toggled only by tap. **No timer anywhere.** Controls burned onto the video indefinitely. | [VideoHost.tsx:50,158](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/host/VideoHost.tsx#L50) |
| **Keep-awake** | Not used during playback. | — |

**Core pattern:** the domain/session layers already implement speed, volume, track selection, caption visibility, and chapters — the presentation layer simply never exposes them, while legacy components (`TrackSelectionPopup`, `usePlayerGestures`, `ChapterList`) sit unused.

### 2.4 Page design / layout issues

| Issue | Evidence |
|---|---|
| JS-thread layout animation (`useNativeDriver:false` on width/height/left/bottom) — jank on low-end devices | [VideoPresentationShell.tsx:43-73](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoPresentationShell.tsx#L43-L73) |
| Fixed `MINI_HEIGHT=112` but miniRoot minHeight 86 → 26px dead space; `flex-end` projection makes mini look like a bottom bar inside an empty rounded box | [VideoPresentationShell.tsx:15,108-110](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoPresentationShell.tsx#L15), [VideoControlLayer.tsx:287](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoControlLayer.tsx#L287) |
| Magic-number placement: status at `top:'46%'`, center action at `top:'50%' marginTop:-34` — relative to overlay, not letterboxed video | [VideoControlLayer.tsx:231-237,258-266](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoControlLayer.tsx#L231-L237) |
| Utility row nearly empty (captions/fullscreen/more/lock unwired) — lopsided sparse bottom | [VideoControlLayer.tsx:154-160](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoControlLayer.tsx#L154-L160) |
| No display of current speed / active track / live indicator despite snapshot carrying all | — |
| Mini mode: 3 redundant expand affordances (gray block + hint icon + button) | [VideoControlLayer.tsx:296-320](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoControlLayer.tsx#L296-L320) |
| Hardcoded off-theme color `#14532D` for primary button | [VideoControlButton.tsx:48](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoControlButton.tsx#L48) |
| Seek: tap-only, no drag scrub, no preview tooltip; thumb hangs off track ends at 0/100%; duration label shows total not remaining; `isLive` ignored | [VideoProgressRail.tsx:51-58,118,136-142,92-96](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoProgressRail.tsx#L51-L58) |
| First-frame overlay stays mounted at opacity 0 forever; bottom bar shows cacheFill mislabeled as first-frame progress; no inline retry | [VideoFirstFrameLoading.tsx:44-51,65-69](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/loading/VideoFirstFrameLoading.tsx#L44-L51) |
| Mini player pinned bottom-left — no drag-to-dismiss/reposition, no swipe-down | [VideoPresentationShell.tsx:62-69](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoPresentationShell.tsx#L62-L69) |
| Movie detail: static hero placeholder, `startPosition: 0` always (no resume), subtitle chips not selectable | [MovieDetailScreen.tsx:119-156,222-258,369](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/MovieDetailScreen/index.tsx) |

---

## 3. AUDIO PLAYER

### 3.1 Architecture

One 1,300-line controller hook (`useAudioPlayerScreen.ts`) owns the whole lifecycle — transitions, resume policy, bookmarks, notifications, chapter advance — while `TransportContext` acts as the session layer for position/cache telemetry.

```
openPlayer → PlaybackOverlayHost → TransportProvider (poll + observers)
→ AudioModule (expanded) / MiniAudio (mini)
→ useAudioPlayerScreen controller → player.api.ts → TurboModule → libmpv
```

Startup effect ([useAudioPlayerScreen.ts:308-544](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/hooks/useAudioPlayerScreen.ts#L308-L544)): generation-bumped load, local validation, `initPlayer`, loop-mode sync, subscribe-before-load `onFileLoaded` (race fix), reuse path for same URI, `loadFile` with offline remap, persisted speed re-apply, 700ms defensive resume fallback, Redux `playFile`.

### 3.2 Buffering (the fixed part — keep)
See §1.3 contrast box. Four observed properties, same-URI storm killed, reason-guarded EOF, honest range rendering, cache reset on load, offline remap, user-tunable cache settings.

### 3.3 Audio issues

#### High impact

| # | Finding | Evidence |
|---|---|---|
| A1 | **Three parallel play-state sources**: hook-local `isPlaying`, Redux `playbackState`, `TransportContext.isPlaying`. UI consumes only transport's; hook copy drifts. | [useAudioPlayerScreen.ts:125,386-391](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/hooks/useAudioPlayerScreen.ts#L386-L391), [TransportContext.tsx:264-268](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/contexts/TransportContext.tsx#L264-L268), [AudioModule.tsx:72](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/AudioModule.tsx#L72) |
| A2 | **Duplicate native listeners in mini mode**: `AudioContent` stays mounted in mini, so its `onPlaybackStateChanged`→dispatch listener coexists with MiniAudio's and TransportContext's. Every state change dispatched ≥2×. | [MiniAudio.tsx:35-38](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/MiniAudio.tsx#L35-L38), [AudioModule.tsx:125](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/AudioModule.tsx#L125) |
| A3 | **Sleep timer fully wired but unarmable**: countdown, end-of-track/chapter modes, 10s fade all implemented — but **no component dispatches `setSleepTimer`** (repo-wide grep: only the internal disarm). Dead feature. | [TransportContext.tsx:155-239](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/contexts/TransportContext.tsx#L155-L239), [playerSlice.ts:365-377](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/state/playerSlice.ts#L365-L377) |
| A4 | `TransportProvider` mounted without `isReady` or `chapters` → polling runs before init; chapter sleep mode can never see real chapters despite the controller parsing them. | [PlaybackOverlayHost.tsx:34](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/PlaybackOverlayHost.tsx#L34), [TransportContext.tsx:212-222](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/contexts/TransportContext.tsx#L212-L222) |
| A5 | Doc says "default 250" poll interval; actual default is `1000` — 1s granularity for position + sleep ticks. | [TransportContext.tsx:72,91](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/contexts/TransportContext.tsx#L72) |
| A6 | Synchronous `MpvPlayer.getDuration()` during render — non-reactive, stale. | [useAudioPlayerScreen.ts:226](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/hooks/useAudioPlayerScreen.ts#L226) |
| A7 | **Collapse re-triggers the init effect**: `collapsePlayer` clears `startPosition`, which is in the init effect deps → listeners torn down/re-registered and `playFile` re-dispatched on every collapse (reuse path avoids reload, but still churns). | [PlaybackContext.tsx:48-56](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/PlaybackContext.tsx#L48-L56), [useAudioPlayerScreen.ts:544](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/hooks/useAudioPlayerScreen.ts#L544) |

#### Medium impact

| # | Finding | Evidence |
|---|---|---|
| A8 | Dead panel commands: `onOpenLyrics/onOpenInfo/onShare/onMore` are `() => undefined` → LyricsPanel, InfoPanel, PlaylistPanel unreachable; MorePanel items no-op. | [AudioModule.tsx:105-112](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/AudioModule.tsx#L105-L112) |
| A9 | Sheet-state vs panel-state split brain: `onOpenQueue` flips hook `queueSheetVisible`, but the visible queue is driven by AudioPlayer's local `panel` state. Same for bookmark/playlist/info sheets — none rendered. | [AudioModule.tsx:104](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/AudioModule.tsx#L104), [AudioPlayer.tsx:32,178](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/AudioPlayer.tsx#L32) |
| A10 | `cacheFill` computed end-to-end but never displayed for audio. | [TransportContext.tsx:310-314](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/contexts/TransportContext.tsx#L310-L314), [AudioPlayer.tsx:34-62](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/AudioPlayer.tsx#L34-L62) |
| A11 | Mini player re-implements transition logic with gaps: no chapter-list/loop-file handling, `handlePrevious` misses queue transitions, load-then-resume via fixed 320ms timeout (the exact race the controller's subscribe-before-load fix addresses). | [MiniAudio.tsx:78-130](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/MiniAudio.tsx#L78-L130) |
| A12 | Two seeking systems: hook's `isSeeking` ref + timeout vs UI consuming transport's `onSeeking`. Hook's ref unused by presentation. | [useAudioPlayerScreen.ts:238,982-990](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/hooks/useAudioPlayerScreen.ts#L982-L990), [TransportContext.tsx:338-346](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/contexts/TransportContext.tsx#L338-L346) |
| A13 | `useMemo` deps include the whole `controller` object — fresh every render → memos recompute every render. | [AudioModule.tsx:61-123](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/AudioModule.tsx#L61-L123) |
| A14 | Bookmark toggle is file-scoped not position-scoped: pressing Save at minute 30 deletes the minute-5 bookmark. Positions <1s silently ignored. | [AudioModule.tsx:52-59](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/AudioModule.tsx#L52-L59), [useAudioPlayerScreen.ts:153](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/hooks/useAudioPlayerScreen.ts#L153) |
| A15 | **Speed UI missing**: speed persisted in Redux (0.25–3.0 clamp), applied to mpv, synced back from native — but **no speed picker anywhere in the audio player**. | [useAudioPlayerScreen.ts:282-289,474-481](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/hooks/useAudioPlayerScreen.ts#L282-L289) |
| A16 | Chapters parsed and drive transitions but never displayed; `model.chapters` never rendered. | [useAudioPlayerScreen.ts:670-684](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/hooks/useAudioPlayerScreen.ts#L670-L684), [AudioTypes.ts:88,128](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/AudioTypes.ts#L88) |
| A17 | Lyrics loaded (`.lrc`) and `LyricsPanel` exists — unreachable (`onOpenLyrics: () => undefined`). | [useAudioPlayerScreen.ts:686-691](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/hooks/useAudioPlayerScreen.ts#L686-L691), [AudioModule.tsx:105](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/AudioModule.tsx#L105) |
| A18 | `AudioActionStrip` (7-action strip) is dead code — zero importers; superseded by `AudioPriorityActions`. | [AudioActionStrip.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/AudioActionStrip.tsx#L25-L35) |

#### Low impact / observations

| # | Finding | Evidence |
|---|---|---|
| A19 | "Like" heart is ephemeral local state — lost on remount, never persisted. | [AudioPlayer.tsx:33,126](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/AudioPlayer.tsx#L33) |
| A20 | `onCacheState` calls `setBufferedRanges` unconditionally; dedup only gates logging. | [TransportContext.tsx:323-332](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/contexts/TransportContext.tsx#L323-L332) |
| A21 | `isBuffering` heuristic: 0% fill reads as not-buffering. | [TransportContext.tsx:310-313](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/contexts/TransportContext.tsx#L310-L313) |
| A22 | Defensive double-resume patterns (timing-based, not event-driven) indicate native autoplay unreliability. | [useAudioPlayerScreen.ts:561-571,489-498](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/hooks/useAudioPlayerScreen.ts#L561-L571), [MiniAudio.tsx:52-54](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/MiniAudio.tsx#L52-L54) |
| A23 | Volume default hardcoded 65 until first native event. | [useAudioPlayerScreen.ts:108](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/audio/hooks/useAudioPlayerScreen.ts#L108) |

---

## 4. CROSS-CUTTING / DEAD CODE

| Item | Evidence |
|---|---|
| Dead `'VideoPlayer'` route referenced by AllVideos + Live TV deep links (§2.1) | — |
| Dead components: `TrackSelectionPopup`, `usePlayerGestures`, `ChapterList` (video-side), `AudioActionStrip` | §2.3, A18 |
| Duplicate transport logic in `MiniAudio` vs controller (A11) | — |
| `MpvPlayer.once()` un-removable (E6) | — |
| EQ panel for video lives at `screens/Equalizer` + `VideoPlayerEqualizerPanel`; audio EQ is settings-level — inconsistent entry points | [screens/Equalizer/index.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Equalizer/index.tsx) |

---

## 5. RECOMMENDED FIX ORDER

### Phase 1 — Make video actually work (engine correctness)
1. **C1/P6**: Register mpv property observers (`time-pos`, `duration`, `pause`, `paused-for-cache`, `cache-buffering-state`, `demuxer-cache-state`, `seekable`) in `VideoMpvSession.load()` + add a 500ms–1s position poll fallback (mirror `TransportContext`).
2. **C3**: Kill the deferred-destroy race — generation/lease check in `release()`, or make destroy synchronous-before-next-init, and guard `ensurePtr` failures with recovery.
3. **C2**: Remove the `release` deadlock (dispose must not await its own tail).
4. **B1–B5**: Unify phase precedence with the reducer (`seeking > buffering > playing`), handle `playbackRestart` to clear stalls, stop overwriting `cacheFill` with 0, guard duration nulling.
5. **E1/E2**: Generation-scope `onError`; JSON-parse `getTracks`/`getChapters` in `player.api.ts`.
6. **M1/M5**: Load + first-frame watchdog with retry surface; classify terminal vs recoverable errors.
7. **R2/R4**: Re-load same source on new `startPosition`; report dropped seeks honestly.

### Phase 2 — Video UX parity (the missing controls)
8. Speed menu (backend exists — wire `set-speed`).
9. Track/subtitle selection sheet (revive `TrackSelectionPopup`; wire `onToggleCaptions`).
10. Queue button → `navigate('Queue', {from:'video'})`; wire `onNext/onPrevious`.
11. Bookmark button + intent (mirror audio's bookmark flow, position-scoped).
12. Chapters list + rail markers (data exists; E2 fix required).
13. Fullscreen/rotation bridge; lock screen behavior; double-tap seek (revive `usePlayerGestures`); volume/brightness edge gestures.
14. Chrome auto-hide timer; drag scrubbing with preview; keep-awake.

### Phase 3 — Design polish
15. Native-driver mini↔full transition; fix mini dead-space & triple expand affordances; center status/action on video area; fix thumb overflow; remaining-time label; inline retry on first-frame overlay.

### Phase 4 — Audio cleanup
16. Single source of truth for play state (kill hook-local + dedupe listeners).
17. Arm the sleep timer (MorePanel item).
18. Speed picker UI.
19. Wire lyrics/info panels or delete them; resolve sheet/panel split brain.
20. Fix collapse-re-runs-init (remove `startPosition` from init deps); pass `isReady`/`chapters` to `TransportProvider`.

### Phase 5 — Housekeeping
21. Fix dead `'VideoPlayer'` route (or repoint callers to `openPlayer`).
22. Delete or integrate dead code (`AudioActionStrip`, `once()`).
23. Fix PiP `exitPip` killing the app (P2) + stuck entering/exiting (P1).

---

## 6. FINDING INDEX

| ID | Sev | Title |
|---|---|---|
| C1 | Critical | Video lane never observes mpv properties → no position/state/buffering events |
| C2 | Critical | `dispatch({type:'release'})` deadlocks on its own tail |
| C3 | Critical | Deferred destroy of old session kills newly initialized player |
| B1–B5 | Major/Minor | Buffering: stuck phase, hidden stalls, clobbered fill, fake 50%, duration nulling |
| E1–E6 | Major/Minor | Error scoping, unparsed tracks/chapters, dead listeners, orphaned subs, `once()` |
| R1–R5 | Major/Minor | Destroy race, dropped reopen, unsynchronized load paths, silent seek drops |
| L1–L4 | Moderate/Minor | Listener orphans, non-reentrant lifecycle, native queue growth, PiP leak |
| M1–M5 | Major/Minor | No watchdog, unguarded throws, no diagnostics, poisoned recovery, fake recoverability |
| P1–P6 | Major/Minor | PiP stuck states, exitPip kills app, inert surface port, JS-thread resize, no polling |
| UX | Major | Speed/quality/subtitle/queue/bookmark/chapters/fullscreen/lock/gestures/auto-hide missing |
| A1–A23 | Various | Audio: triple play state, duplicate listeners, dead sleep timer, dead panels, missing speed UI |
| X1–X3 | Major | Dead `'VideoPlayer'` route; dead components; EQ entry-point inconsistency |
