# v11 libmpv Integration Audit

**Audit date:** 22 August 2026  
**Scope:** Android libmpv bridge, React Native playback lifecycle, remote audio streaming, video surface ownership, event delivery, and current/deprecated implementation patterns.

## Executive conclusion

SIMBA’s previous streaming failure was consistent with a native lifecycle defect: mpv initialization was coupled too closely to the first video surface, while audio playback has no video surface. The bridge has now been hardened so the mpv handle is initialized independently of video rendering, stream loads are guarded until initialization is complete, and command calls use explicit argument arrays rather than fragile string concatenation.

The audit also confirmed that `Dusk-Labs/react-native-mpv` is useful as a bridge reference but is not a production-ready player architecture. The strongest maintained Android reference is [`mpv-android/mpv-android`](https://github.com/mpv-android/mpv-android), while [`pigeonmal/react-native-video-mpv`](https://github.com/pigeonmal/react-native-video-mpv) is useful for modern React Native/Fabric component and typed-event patterns. [`abdallahmehiz/mpvKt`](https://github.com/abdallahmehiz/mpvKt) is archived and must not be used as a dependency or as a source for new build patterns. [`marlboro-advance/mpvEx`](https://github.com/marlboro-advance/mpvEx) is an active Android application reference, but it vendors an application-specific mpv AAR and is not a drop-in React Native bridge.

> No new third-party player package was added. The safe changes are behavior-level improvements to SIMBA’s existing bridge, avoiding unverified version or dependency changes.

## Current reference comparison

| Reference | Current value | Safe use in SIMBA | Do not copy |
|---|---|---|---|
| [`Dusk-Labs/react-native-mpv`](https://github.com/Dusk-Labs/react-native-mpv) | Small React Native/libmpv proof of concept; visible upstream history is old relative to this audit | Basic native bridge shape, event-thread separation, surface attach/detach concepts | Treating it as a complete audio controller, queue, background playback, or production error model |
| [`pigeonmal/react-native-video-mpv`](https://github.com/pigeonmal/react-native-video-mpv) | Current Fabric-style React Native package, version `0.2.2` in the inspected manifest | Typed view events, explicit load/error/buffer/end events, imperative source and seek patterns | Assuming its smaller package scope is sufficient for SIMBA’s shared audio/video/background architecture |
| [`mpv-android/mpv-android`](https://github.com/mpv-android/mpv-android) | Actively maintained Android application with current Kotlin/Gradle work and background/PiP support | Player ownership independent from the surface, property observation, buffering distinction, lifecycle order | Copying its application architecture or assuming its app-specific AAR/configuration can be imported directly |
| [`abdallahmehiz/mpvKt`](https://github.com/abdallahmehiz/mpvKt) | Archived/read-only as of 30 March 2026 | Historical behavior comparison only | Dependencies, build configuration, or future-facing APIs |
| [`marlboro-advance/mpvEx`](https://github.com/marlboro-advance/mpvEx) | Active Android application line with recent release activity | Network streaming, PiP/background behavior, surface and playback UX ideas | Its vendored `mpv-android` AAR or application-specific integration as SIMBA source code |
| [Current libmpv embedding guidance](https://mpv-player-mpv.mintlify.app/embedding/libmpv) | Current C API and embedding behavior reference | Asynchronous command model, one event-loop owner, negative error codes, pre-init options | Assuming `loadfile()` is synchronous or using multiple `mpv_wait_event()` owners |

## Confirmed implementation risks and applied fixes

### 1. Audio initialization must not depend on a video surface

The bridge now creates and initializes mpv before any surface is attached. Audio-only remote streams can therefore load without waiting for a `TextureView` or `Surface` callback. Video surface attachment remains a separate concern and can bind or rebind the video output later.

This follows the current maintained Android pattern of separating player ownership from view ownership, while adapting it for SIMBA’s global audio overlay. Collapsing the overlay must not destroy the shared mpv instance.

### 2. `loadfile` is asynchronous

The JavaScript controller already added explicit resume behavior after load. The native bridge now rejects load requests made before initialization and logs the native error code when a command fails. This prevents a silent no-op stream request.

The controller also has a delayed resume fallback for the event-listener timing edge case. The final runtime state must still distinguish user pause from buffering pause; a future acceptance pass should expose `paused-for-cache` and cache state as first-class UI state rather than treating every paused state as user pause.

### 3. Native command arguments must be explicit

Fragile string-form commands were replaced with argument-array calls for stream loading and playback controls, including stop, frame-step, playlist next/previous, shuffle, and clear. This avoids URI and filename escaping errors and matches current libmpv command usage.

### 4. Event payload strings must be JSON-safe

The native event bridge now escapes quotes, backslashes, control characters, and other characters below U+0020 before emitting string-valued properties to JavaScript. This prevents a title containing a quote, newline, or backslash from corrupting the JSON payload and breaking state updates.

Native error-level log messages are also forwarded to JavaScript for actionable stream diagnostics instead of being visible only in Android logcat.

### 5. Metadata and mini-player state must be non-destructive

The audio controller now preserves route artwork and provenance when local metadata lookup returns empty values for a remote stream. Redux current-track metadata is patched without resetting playback state or position. The mini-player has filename/title fallbacks and no longer depends on a complete native metadata response to render useful content.

### 6. Playback-state and observer semantics are current-version safe

The Kotlin module previously derived playback state from `core-idle`, which conflated an actually paused file with an idle player. It now uses `idle-active`, `eof-reached`, and `pause` in that order, returning `idle`, `stopped`, `paused`, or `playing` with distinct meanings. This prevents the UI from treating a valid loaded stream as an idle/paused player.

Property observers requested before `initPlayer()` are now queued and registered immediately after native initialization. The previous behavior silently dropped these subscriptions, which could leave position, duration, pause, buffering, or cache state permanently stale during the first playback request.

### 7. Deprecated event patterns are excluded

New control flow must not be based on `MPV_EVENT_IDLE` or `MPV_EVENT_TICK`; current maintained Android code marks those event constants deprecated. SIMBA should use `FILE_LOADED`, `PLAYBACK_RESTART`, `END_FILE`, typed property changes, buffering properties, and structured native errors instead.

## Remaining production-hardening items

The following items were identified but intentionally not guessed or copied from an unrelated application:

| Item | Status | Next safe action |
|---|---|---|
| Structured end-of-file reason and error | Open | Extend the native event contract with `END_FILE` reason/error and map it into the shared queue transition controller. |
| Buffering state | Open | Observe `paused-for-cache`, `cache-buffering-state`, and cache duration using the bundled libmpv version; show `BUFFERING` separately from `PAUSED`. |
| Audio focus and media role | Open | Verify the existing Android service/audio-focus implementation against the current bundled libmpv and Android media APIs before changing options. |
| Surface loss/rebind | Hardened at bridge level | Test rotation, overlay collapse, PiP entry/exit, and temporary surface destruction on a real emulator. |
| TLS/CA and network protocol options | Open | Confirm the bundled libmpv build’s TLS support and certificate path before enabling additional options. |
| Background playback/PiP | Architecture present, acceptance open | Verify service lifetime, notification/media session state, and video surface transitions on device. |
| Native Android build | Not conclusively completed in this audit | The full Gradle native task exceeded the attached workspace timeout before reaching SIMBA’s own C++ compile output; rerun locally from the Windows workspace when convenient. |

## Verification evidence

The following checks completed successfully after the audit edits:

```text
DIFF_CHECK_EXIT=0
TSC_EXIT=0
```

The Android Gradle/native task was attempted independently, but the attached Windows workspace spent the available time compiling React Native dependency CMake targets and did not reach a definitive SIMBA C++ success/failure result before it was stopped. The timeout is therefore not reported as a native compile failure.

## Source links

1. [Dusk-Labs/react-native-mpv](https://github.com/Dusk-Labs/react-native-mpv)
2. [pigeonmal/react-native-video-mpv](https://github.com/pigeonmal/react-native-video-mpv)
3. [mpv-android/mpv-android](https://github.com/mpv-android/mpv-android)
4. [abdallahmehiz/mpvKt](https://github.com/abdallahmehiz/mpvKt)
5. [marlboro-advance/mpvEx](https://github.com/marlboro-advance/mpvEx)
6. [mpv libmpv embedding guide](https://mpv-player-mpv.mintlify.app/embedding/libmpv)
7. [mpv stable manual](https://mpv.io/manual/stable/)
