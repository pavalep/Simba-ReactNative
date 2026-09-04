# SIMBA Player Re-analysis — Current Renamed Architecture

**Date:** 2026-08-25  
**Scope:** Current source under `src/modules/playback/audio/**`, `src/modules/playback/video/**`, root playback context/overlay, Java/Kotlin/C++ mpv bridge, and navigation callers.  
**Important naming correction:** The repository no longer has `video/v2`, `video/v3`, or an active dedicated `VideoPlayer`/`AudioPlayer` navigation route. The active video implementation is now the plain `src/modules/playback/video/**` module. The active audio implementation is `src/modules/playback/audio/**`. The analysis below uses only those current names.

> The existing `PLAYER_AUDIT_v11_FULL_FINDINGS.md` is directionally useful, but parts of its wording and file links still describe the former V3 naming. Its core engine findings remain materially applicable after the rename; the rename did not automatically close the lifecycle, observer, or route seams.

## 1. Current architecture map

| Boundary | Current implementation | Assessment |
|---|---|---|
| Root playback state | `src/modules/playback/PlaybackContext.tsx` | Correct direction: playback is an overlay projection rather than a player route. |
| Root overlay | `src/modules/playback/PlaybackOverlayHost.tsx` | Correctly separates audio and video lanes. Audio receives `TransportProvider`; video does not. |
| Video host | `src/modules/playback/video/host/VideoHost.tsx` | Active video entry point. It creates a playback unit, attaches the surface, loads the source, and projects full/mini/PiP chrome. |
| Video session | `src/modules/playback/video/session/VideoMpvSession.ts` | Owns native mpv calls and a session snapshot, but currently lacks the audio lane’s property-observer/polling parity. |
| Video command boundary | `src/modules/playback/video/controller/VideoIntentController.ts` | Good SOLID boundary in intent, but disposal still contains a self-wait hazard when release is dispatched through the same queue. |
| Video synchronizer | `src/modules/playback/video/state/VideoNativeStateSynchronizer.ts` | Refreshes only at lifecycle boundaries; its own comment explicitly says polling was intentionally avoided. |
| Video surface | `src/modules/playback/video/surface/VideoNativeSurface.tsx` and `VideoSurfaceController.ts` | Native surface boundary exists. The previous TextureView background-prop fix and ANativeWindow correction are separate runtime changes that still require installed-APK validation. |
| Audio controller | `src/modules/playback/audio/hooks/useAudioPlayerScreen.ts` | Functionally richer than video, but still a very large controller hook with duplicated presentation/session responsibilities. |
| Audio transport | `src/contexts/TransportContext.tsx` | The strongest current playback reference: native subscriptions, explicit mpv property observers, cleanup, and a polling fallback. |
| Audio presentation | `AudioModule.tsx`, `AudioPlayer.tsx`, `MiniAudio.tsx` | Expanded and mini projections exist, but several actions remain no-ops and mini mode duplicates control/listener logic. |

## 2. Findings that remain confirmed in the current code

### P0 — Video playback truth is still incomplete

`VideoMpvSession.ts` subscribes to `onPositionChanged`, `onDurationChanged`, `onPlaybackStateChanged`, `onBuffering`, `onCacheState`, `onSeekable`, and `onSeeking`, but the session itself never calls `MpvPlayer.observeProperty(...)`. The root overlay supplies `TransportProvider` only to the audio lane (`PlaybackOverlayHost.tsx:21-46`). The current video synchronizer also refreshes only on `file-loaded`, `surface-attached`, `first-frame`, and `ended` (`VideoNativeStateSynchronizer.ts:34-43`), and explicitly avoids polling (`:7-10`).

This means the video lane can successfully load or attach a surface while still showing stale position, duration, playback phase, and buffering state. The repair must be owned by the video session/synchronizer boundary, not by adding a second audio provider around the video UI. The video lane needs idempotent observer registration for `time-pos`, `duration`, `pause`, `paused-for-cache`, `cache-buffering-state`, `demuxer-cache-state`, `seekable`, and `seeking`, plus a bounded polling fallback for position/duration/play-state.

### P0 — Global native singleton teardown is still vulnerable to an old-session/new-session race

`VideoHost.tsx:83-88` calls `playback.release()` from cleanup without awaiting it. `createVideoPlayback.ts:32-38` detaches the surface and then awaits `commands.dispose()`. `VideoMpvSession.ts:311-335` schedules stop/destroy work through a microtask. Since the native mpv bridge is global, an old cleanup can destroy the handle after a new host has initialized or reused it. The current native pointer in React state can then refer to an already-destroyed singleton.

The fix must make ownership explicit. A released playback unit needs a lease/generation identity, and destruction must be conditional on that identity still owning the global native handle. Cleanup must not destroy a handle acquired by a newer unit. This is separate from the previous ANativeWindow correction.

### P0 — Release dispatched through the intent queue can wait on itself

`VideoIntentController.dispatch()` assigns the current command promise to `tail` (`:27-37`). Its `release` branch calls `dispose()` (`:95-97`), while `dispose()` waits on `this.tail` (`:40-47`). Therefore `dispatch({type: 'release'})` can create a circular promise dependency. The public release path should be a dedicated terminal operation that first prevents new commands, drains only the commands preceding release, releases the seek coordinator, and then releases the session without awaiting the current release promise.

### P1 — Buffering phase transitions are not unified

The current video session sets `phase: 'buffering'` only when an `onBuffering` fill is between zero and one (`VideoMpvSession.ts:383-391`). Its seeking handler then computes the next phase from `seeking` and `isPlaying` only (`:409-415`), so a seek ending during a cache stall can incorrectly become `playing` or `paused`. The session also lets `onCacheState` overwrite `cacheFill` (`:393-399`), even though the audio transport treats fill telemetry and buffered ranges as different signals.

The next implementation should use one reducer precedence rule: `error/finished` terminal states first, then `seeking`, then actual cache wait, then playing/paused. `playbackRestart` should clear a cache stall only when it belongs to the active generation. `cacheFill` must not be replaced with a fabricated or unrelated value when only ranges changed.

### P1 — Video session callbacks and metadata hydration need stronger contracts

`onError` calls `setError(this.snapshot.generation, ...)` without a callback generation, so an older native error can poison a newer source if it arrives late. `handleFileLoaded()` reads tracks and chapters through `MpvPlayer.getTracks()` and `MpvPlayer.getChapters()` (`VideoMpvSession.ts:501-514`), while the JS wrapper’s native contract returns JSON strings in the corresponding methods (`player.api.ts` around `getTracks`/`getChapters`). Those boundaries need explicit JSON parsing and schema validation in the wrapper, not a UI-side catch that silently converts contract errors into empty arrays.

### P1 — The current host still allocates a playback unit during render

`VideoHost.tsx:35` uses `useMemo(() => createVideoPlayback(), [])`. Resource-owning objects that register native/session listeners should be created after commit or behind a stable ownership hook with a guaranteed disposal path. Render-time allocation is unsafe under StrictMode, interrupted rendering, and speculative work. This can leave orphan listeners or make a released object get reused by a subsequent mount.

### P1 — Same-source start-position changes are not an explicit host input

The host load effect depends on `sourceFingerprint` (`VideoHost.tsx:90-109`), while the start position is stored separately in `requestRef`. Reopening the same URI at a new start position can therefore fail to trigger a new request. The host needs a request identity that includes the source fingerprint plus the start-position intent, or a separate explicit resume command that is serialized through the video controller.

### P1 — Stale navigation callers still target removed routes

The current navigation contract contains no `VideoPlayer` or `AudioPlayer` route, yet the scan still finds callers such as `AllVideos/hooks/useAllVideosScreen.ts:81`, Live TV callers, Album/Artist/Genre callers, and audiobook/archive/radio callers. These paths must call the root playback API with typed `ActivePlayback` entries. Using `navigation as any` only hides the compile-time mismatch and produces dead taps at runtime.

## 3. Audio status after the rename

Audio is not in the same condition as video. `TransportContext.tsx:245-421` confirms that audio has explicit native event listeners, five property observers, cleanup with matching `unobserveProperty` calls, and a polling fallback. Its buffering-range handling also normalizes ranges rather than inventing a continuous bar. Those parts should be preserved as the behavioral reference, not copied as a UI structure.

However, the audit’s audio cleanup findings still map to current files:

| Priority | Current issue | Evidence in renamed code |
|---|---|---|
| P1 | Multiple play-state authorities remain: controller-local state, Redux/player state, and `TransportContext` state. | `AudioModule.tsx:61-90` builds the view model from both `controller` and `transport`. |
| P1 | Mini mode has a second native control/listener path and timing-based load/resume behavior. | `MiniAudio.tsx` is mounted independently by `PlaybackOverlayHost.tsx:41-44`; the audit’s duplicate-listener/timer concern remains relevant. |
| P1 | Several expanded-player actions are visibly wired as no-ops. | `AudioModule.tsx:105-112`: lyrics, info, share, and More are `() => undefined`; queue only toggles a controller flag. |
| P1 | Panel state and sheet state are split. | Queue/playlist visibility is stored in controller callbacks while `AudioPlayer` owns presentation panel state. |
| P1 | Controller object is used as a broad dependency. | `AudioModule.tsx:117` includes the whole `controller` object in the memo dependency list, encouraging recomputation on every render. |
| P2 | The audio player still contains dead or duplicate presentation code. | `AudioActionStrip.tsx` remains in the current audio directory while the active module uses `AudioPriorityActions`. |
| P2 | `MpvPlayer.once()` still returns no unsubscribe handle. | `src/native/player.api.ts:370-379`. This is an API cleanup item for both lanes. |
| P2 | Sleep timer, speed, lyrics, chapters, and information need end-to-end UI verification. | The controller/transport contracts exist, but visible action reachability must be checked against the current active `AudioPlayer` tree rather than assumed from backend methods. |

## 4. Findings that should not be carried forward blindly

The previous audit is not an authority for obsolete folder names. References such as `video/v3`, `VideoV3Host`, `VideoV3MpvSession`, and old V3 documentation labels must be translated to the current `video/host/VideoHost.tsx`, `video/session/VideoMpvSession.ts`, and related files before implementation.

The previous TextureView `backgroundColor` crash is also a separate issue from the observer and singleton-lifecycle findings. Its fix must remain intact: visual background belongs to a normal React Native wrapper, while the native `TextureView` receives only safe layout/native-surface props. The ANativeWindow/fdsan correction likewise needs installed-APK runtime evidence before it is marked accepted.

## 5. Correct fix order for the current repository

| Order | Workstream | Why it comes first |
|---:|---|---|
| 1 | Video native truth: observers, polling, generation-scoped events, and duration/range normalization | Without this, video controls cannot truthfully display state or support reliable seeking. |
| 2 | Native singleton ownership and release ordering | Prevents the old host from destroying a newly opened session and removes the most dangerous crash path. |
| 3 | Video surface lifecycle validation on the rebuilt APK | Confirms the ANativeWindow and TextureView fixes on the actual emulator/device. |
| 4 | Video routing migration from removed navigation routes to `openPlayer` | Restores playback entry points from All Videos, Live TV, albums, artists, genres, archives, and audiobooks. |
| 5 | Audio single-source-of-truth and mini/full listener consolidation | Prevents duplicate commands and state drift without disturbing the currently working buffering model. |
| 6 | Wire or deliberately remove audio panels and actions | No visible control should remain a no-op. |
| 7 | Video controls and presentation polish | Speed, tracks, captions, queue, bookmark, chapters, fullscreen, lock, gestures, auto-hide, and mini behavior become meaningful only after engine truth is stable. |

## 6. Current conclusion

The rename is real and the active architecture is now easier to reason about: `playback/audio` and `playback/video` are the implementation boundaries, and `PlaybackOverlayHost` is the root projection boundary. The repository is not yet production-ready, however. The most serious remaining issue is not visual polish; it is that video does not yet have the same native observation and polling contract that audio already has, while video release remains unsafe against a global singleton. The next code batch should therefore repair video engine truth and ownership first, then migrate stale route callers, and only then complete the missing control surfaces.
