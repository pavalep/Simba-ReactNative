# SIMBA Audio Playback V2: Production Buffering and Seeking Blueprint

**Status:** Research and architecture decision record; implementation changes are intentionally not included in this document.

**Date:** 22 August 2026

## Executive conclusion

SIMBA’s latest APK has crossed the most important infrastructure boundary: the HTTPS stream now loads and produces audible audio. The remaining behavior is not best explained as “the progress bar needs another poll.” The fresh trace shows repeated `loadAndResume` → `loadFile` → `resume` activity for the same URI within seconds. That behavior is incompatible with an ordinary cache underrun. In a correct network-player model, a cache underrun keeps the same media item loaded, exposes `paused-for-cache=true`, waits for data, and resumes without issuing another `loadfile` command.

The immediate production issue is therefore a **state-model and retry-loop defect**, with buffering support still incomplete. SIMBA must separate user intent, effective playback, network buffering, seek progress, media loading, and terminal failure. A remote-stream `onError` must not automatically reload the current URI unless it represents a genuine terminal load failure and the retry is guarded against duplicate/stale events.

The target behavior is:

> **If the requested point is already buffered, play immediately. If it is seekable but not buffered, seek there and show buffering while mpv fetches data. If playback consumes the forward cache, pause for cache, keep the item loaded, show a buffering state, and resume automatically when the configured cache threshold is reached. If the source is not seekable, communicate that limitation instead of pretending arbitrary seeking is guaranteed.**

## Evidence collected from the current runtime

| Observation | Meaning | Decision consequence |
|---|---|---|
| The TLS-fixed APK produces audible audio | Android certificate validation and the basic mpv audio-output path are now functional | Do not keep changing CA or initialization code as the primary fix |
| Position begins to advance before the reported restart | mpv can decode and output the stream | The zero-position symptom was partly a stale-state problem, not total inability to play |
| The same URI receives repeated `loadFile` and `resume` calls in a short interval | JavaScript is restarting the item | A normal cache underrun should not invoke `loadFile`; investigate and remove the reload trigger |
| The controller currently retries every remote `onError` up to three times using `loadAndResume` | Non-terminal native errors can become a destructive reload storm | Retry only classified terminal failures, with a single-flight guard and generation token |
| `onEndFile` is now narrowed to natural EOF for queue advancement | Reload/stop transitions should not advance the queue | Preserve this behavior and add explicit reason/error classification |
| `paused-for-cache` and cache properties are now bridged | The native layer has the primitives for a proper buffering state | Use those properties as first-class state, not position stagnation heuristics |

A cache pause has a recognizable signature: the current file remains loaded; `paused-for-cache` becomes true; `cache-buffering-state` reports progress toward resumption; no new `loadfile` command is issued; and the player resumes after enough data arrives. A repeated `loadfile` sequence is a different failure class.

## Verified source principles

### mpv/libmpv

The current mpv manual documents `cache=yes`, `cache-pause=yes`, `cache-pause-wait`, and `cache-pause-initial`. With cache pause enabled, mpv pauses when the cache runs out and resumes after more data is available. `paused-for-cache` is the intended property for detecting this condition. `cache-buffering-state` reports the fill percentage toward automatic resumption. `demuxer-thread=yes` should remain enabled for prefetching and network recovery. `demuxer-seekable-cache=auto` lets mpv use the cache for short seeks and perform a network seek when the requested position is outside the cached range.

The documented `demuxer-cache-state` property is a node map. Its canonical cached-range field is `seekable-ranges`, an array of timestamp ranges such as `{start, end}`. Ranges can be unordered or overlap and may need normalization and merging before they are rendered. Approximate cache-duration fields are useful diagnostics but should not be the only source for a buffered-range UI.

`prefetch-playlist` concerns future playlist entries and is not a current-item buffering solution. `drop-buffers` is disruptive and should not be used as ordinary recovery. A large cache is not automatically better on mobile: it increases memory pressure and can make a seek/recovery policy feel slow.

Sources: [mpv manual](https://mpv.io/manual/stable/), [mpv input/property documentation](https://raw.githubusercontent.com/mpv-player/mpv/master/DOCS/man/input.rst), and [mpv buffering discussion](https://github.com/mpv-player/mpv/issues/9279).

### Android Media3

Current Android Media3 separates **loading**, **playback state**, **user play intent**, **effective playing**, **seeking**, **errors**, and **playlist transitions**. `STATE_BUFFERING` is not the same as user pause. `isLoading` is not the same as effective playback. A player can intend to play while temporarily buffering, and it can be paused by the user while loading data for a seek.

Media3 also distinguishes startup and rebuffer thresholds. This supports a SIMBA model with a deliberate startup buffer policy and a separate, usually shorter, rebuffer wait policy. A seek to a non-buffered position is treated as a seek on the same media item, not as a new item transition.

Sources: [Media3 player events](https://developer.android.com/media/media3/exoplayer/listening-to-player-events), [Media3 Player API](https://developer.android.com/reference/androidx/media3/common/Player), [DefaultLoadControl](https://developer.android.com/reference/androidx/media3/exoplayer/DefaultLoadControl), and [Media3 troubleshooting](https://developer.android.com/media/media3/exoplayer/troubleshooting).

### Maintained Android/libmpv reference

The current `mpv-android` application observes typed `time-pos`, `duration/full`, `pause`, `paused-for-cache`, and `speed` properties. It configures Android audio output with `audiotrack,opensles`, keeps TLS verification enabled, uses an application CA file, and limits demuxer forward/back cache to mobile-sized byte budgets rather than assuming desktop memory availability. Its activity logic treats cache-paused playback as distinct from user pause for audio focus and background behavior.

This is an implementation reference, not a reason to copy app-specific UI or settings blindly. SIMBA should retain its own module boundaries and tune cache budgets against supported devices and stream classes.

Sources: [mpv-android](https://github.com/mpv-android/mpv-android), [MPVView.kt](https://raw.githubusercontent.com/mpv-android/mpv-android/master/app/src/main/java/is/xyz/mpv/MPVView.kt), and [MPVActivity.kt](https://raw.githubusercontent.com/mpv-android/mpv-android/master/app/src/main/java/is/xyz/mpv/MPVActivity.kt).

### Platform and maintained-library UX

MDN distinguishes downloaded `buffered` ranges from `seekable` ranges. A position may be seekable through HTTP range requests even when it is not currently downloaded, and a buffered range can contain holes. AVFoundation exposes the analogous distinction through `loadedTimeRanges` and `seekableTimeRanges`, with separate empty/full buffer signals. React Native Track Player similarly separates buffering state, effective `isPlaying`, and progress values including `buffered`.

The practical implication is that the progress bar must not draw one “buffered-to” value and assume it represents all playable media. It should render normalized buffered ranges behind the played position, while the seekable contract controls whether and how the user can request a position.

Sources: [MDN buffering and seeking](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery/buffering_seeking_time_ranges), [AVPlayer loaded ranges](https://developer.apple.com/documentation/avfoundation/avplayeritem/loadedtimeranges), [AVPlayer seekable ranges](https://developer.apple.com/documentation/avfoundation/avplayeritem/seekabletimeranges), and [React Native Track Player hooks](https://www.rntp.dev/docs/hooks).

## SIMBA’s required playback state contract

The native bridge and the V2 adapter should expose a state object equivalent to the following contract. The exact TypeScript names may be adapted to existing SIMBA conventions, but the meanings must remain separate.

| Field | Meaning | Source |
|---|---|---|
| `mediaId` / `loadGeneration` | Identity of the loaded item and protection against stale callbacks | JS controller |
| `position` | Current playback position in seconds | `time-pos`, polled at normal progress interval |
| `duration` | Known duration, or unknown for live/indefinite sources | `duration` or `duration/full` |
| `userIntent` | Whether the user has requested play or pause | JS command state; do not infer from `pause` alone |
| `effectiveState` | `idle`, `loading`, `buffering`, `playing`, `paused`, `seeking`, `ended`, or `error` | Combined native properties and command state |
| `isPlaying` | Audio is actually advancing/outputting, not merely requested | `pause`, `paused-for-cache`, readiness, and position changes |
| `isBuffering` | The stream is waiting for cache/data | `paused-for-cache` and cache-buffering state |
| `bufferingPercent` | Progress toward mpv’s cache-pause resume threshold | `cache-buffering-state` |
| `bufferedRanges` | One or more normalized `{start, end}` ranges in media seconds | `demuxer-cache-state.seekable-ranges` |
| `seekableRanges` | Positions mpv can request, which may exceed downloaded ranges | `seekable` and available range metadata |
| `isSeekable` | Whether user seeking is supported for this item | mpv `seekable` / range capability |
| `isSeeking` | A seek operation is in progress | mpv `seeking` plus JS seek transaction |
| `terminalError` | A genuine unrecoverable item error | terminal `END_FILE` reason/error or fatal error only |

The UI must never derive `isBuffering` solely from `pause=true`, `position` staying constant, or `duration` being temporarily zero. Conversely, it must not show “Paused” when `paused-for-cache=true`; the user needs to know that the app is waiting for the network and will resume automatically.

## Buffering policy

### Startup

Startup should use a small deliberate prebuffer rather than immediately forcing playback on the first decoded packet. `cache-pause-initial=yes` is appropriate only when the source class and mpv build behave correctly with it. It should be tested with the actual archive/API streams because an overly large initial wait damages perceived responsiveness. The startup policy should be bounded and visible: show the artwork and a loading/buffering indicator, keep the play intent as “play,” and begin once the native threshold is met.

`cache-pause-wait` should represent a practical packet-data threshold for resuming after underrun. It must not be coupled to an unreasonably large `cache-secs` value. A 120-second cache paired with a 120-second wait would be unacceptable for ordinary mobile playback. The first implementation should use a mobile-tuned time/byte budget and measure startup and recovery on real streams.

### Steady-state playback

Keep `cache-pause=yes` and `demuxer-thread=yes`. When the forward cache is consumed, mpv should pause itself for cache. SIMBA should hold `userIntent=play`, expose `effectiveState=buffering`, keep the current position, and wait for the native state to leave `paused-for-cache`. It must not call `loadFile`, reset position to zero, advance the queue, or increment the retry counter.

When the cache is replenished, native state should return to effective playing and the UI should remove the buffering indicator without user action. If the network remains unavailable past a bounded recovery policy, surface a recoverable network error with a retry action that resumes from the current position; do not repeatedly reload in a tight loop.

### Memory and device policy

SIMBA’s current values of `cache-secs=120`, `demuxer-max-bytes=150MiB`, and `demuxer-max-back-bytes=75MiB` should not be accepted as production defaults merely because they compile. They are materially larger than the maintained Android reference and can create memory pressure, especially when background playback, artwork, Redux state, and other screens coexist.

The recommended design is a device-aware policy with an explicit upper bound. Start with a conservative mobile budget comparable to the maintained Android reference, then validate on low-memory and modern devices. Time-based prefetch may remain useful for short compressed audio, but byte limits must remain the final safety boundary. The policy should be documented and configurable by source class if archive streams and ordinary API tracks have materially different behavior.

## Seek behavior

### Seek inside an already-buffered range

A seek within a normalized buffered range should be immediate. The UI may update the thumb optimistically for the duration of the seek transaction, but the next native `time-pos` event remains authoritative. No media reload should occur.

### Seek to a seekable but unbuffered position

A seek outside the currently buffered ranges but inside the source’s seekable capability should issue a normal mpv seek on the current item. mpv may perform a network range request and establish a new cache range. SIMBA should mark `isSeeking=true`; after the seek begins, show `buffering` only if native reports cache waiting or loading. The controller must not interpret this as an end-file or stream error.

The progress UI should preserve the user’s requested target, then reconcile with native position. If the server does not support byte ranges or the format has imprecise time-to-byte mapping, the UI should show a brief “seeking…” state and settle at the closest native position rather than pretending the target is exact.

### Seek on an unseekable source

When `seekable=false`, disable or constrain the seek bar and explain the limitation through accessible text. Do not send arbitrary seek commands and then report a false success. Live or indefinite sources may expose a different live-edge model rather than a conventional duration bar.

### Resume from a saved position

Resume should use one seek transaction after the item is loaded. It must not call `loadFile` again. The saved position should be clamped to a known duration when available, ignored when it is beyond the valid seekable range, and treated as an explicit user intent when the user chose “Continue.”

## Buffered-range progress UI

The V2 progress primitive should render at least four independent layers:

1. **Track background:** the full known duration or seekable timeline.
2. **Buffered ranges:** one or more low-contrast ranges from `demuxer-cache-state.seekable-ranges`, normalized, sorted, clamped to duration, and merged when overlapping or adjacent.
3. **Played position:** the current `time-pos`, shown with the primary accent and thumb.
4. **Interaction/loading state:** a visible seeking or buffering treatment that never changes the meaning of the played position.

The UI should use a small accessible label such as “Buffered through 2 minutes 14 seconds” only when the range is contiguous from the current position; otherwise it should say “Multiple buffered ranges” or expose the range information through accessibility actions. A spinner or animated indicator belongs to the buffering state, not to the progress track itself.

The current V2 screenshot’s single progress line should therefore evolve into a layered track, while preserving the clean visual language of the new V2. This is a functional enhancement, not a V1 visual reuse.

## Retry and recovery rules

The current controller’s broad remote `onError` retry is the most dangerous part of the implementation because it can turn a recoverable or non-terminal diagnostic into repeated reloads. The corrected policy is:

| Condition | Action |
|---|---|
| `paused-for-cache=true` | Do not retry or reload. Keep the item loaded and wait for native recovery. |
| `cache-buffering-state` changes | Update buffering UI only. Do not alter queue or load generation. |
| User presses pause | Set user intent to pause; never label as buffering. |
| User presses play while cache-paused | Preserve play intent and allow mpv to continue; do not reload. |
| Seek begins | Mark seeking; do not increment retry count. |
| Natural EOF | Advance once according to queue/loop rules. |
| Stop/reload end-file reason | Ignore for queue advancement and do not auto-retry. |
| Terminal network/load error before successful file load | Permit one guarded retry, preserving URI and explicit generation. |
| Terminal error after playback has started | Show recoverable error and offer “Retry from current position”; avoid automatic reload storms. |
| Fatal native error | Stop normal transport commands, surface a diagnostic, and require a controlled reinitialization. |

Every load should have a monotonically increasing `loadGeneration`. All asynchronous callbacks, delayed resumes, retry timers, and `onFileLoaded` handlers must verify that their generation is still current. A timer from an old load must never call `resume`, `seek`, or `loadFile` on a newly selected item.

Retry needs a single-flight guard. At most one retry timer may exist for a generation, and a successful load or user action must cancel it. Backoff can remain exponential, but it must be bounded and applied only to classified terminal failures. Ordinary mpv log messages, cache pauses, seeks, and stop/reload events must never enter this path.

## Native bridge requirements

The native bridge is close to having the required primitives, but the production contract should be checked carefully before UI work is considered complete.

| Requirement | Required behavior |
|---|---|
| Typed property observation | Observe `time-pos`, `duration/full`, `pause`, `paused-for-cache`, `cache-buffering-state`, `demuxer-cache-state`, `seekable`, `seeking`, `idle-active`, and `eof-reached` with formats that preserve numeric, boolean, and node values. |
| Cache ranges | Parse `demuxer-cache-state.seekable-ranges`, not only a legacy `ranges` field. Normalize and merge ranges before emitting to JS. |
| Playback event translation | Emit dedicated events with stable payloads, while retaining generic property events for diagnostics. |
| Error classification | Keep ordinary mpv log messages as diagnostics. Promote only terminal end-file errors or fatal native failures to the controller’s retry/error path. |
| Audio output | Use the maintained Android pattern `audiotrack,opensles` unless device testing proves a better compatible configuration. |
| TLS | Keep certificate verification enabled with the app CA bundle already added. |
| Observability | Log load generation/URI hash, command result, end-file reason/error, cache-pause transitions, cache fill, range payload size, and audio reconfiguration. Avoid logging full bearer URLs or credentials. |

The bridge should avoid emitting high-frequency position logs at INFO level in production. Position can be sampled or emitted at a debug level, while state transitions and terminal errors remain easy to filter. The current diagnostic build can remain verbose for verification.

## SIMBA implementation sequence

### Phase A: freeze the evidence

Preserve the fresh restart trace and add a small regression artifact containing the ordered event sequence: first load, file loaded, first play, first position advancement, first error/end-file, first cache pause, and every subsequent load command. The expected result for a cache underrun is zero additional `loadFile` commands while the same item is buffering.

### Phase B: repair the controller state machine

Replace the broad remote-error reload effect with a classifier and single-flight retry coordinator. Introduce a load-generation ref and cancel stale delayed resumes. Keep natural EOF queue transitions separate from all stop/reload/error transitions. Make buffering a first-class state that preserves play intent.

### Phase C: correct native cache-range semantics

Update the parser to accept the current `seekable-ranges` shape, normalize ranges, and expose both buffered ranges and cache fill. Observe `paused-for-cache`, `cache-buffering-state`, `seeking`, and `seekable` independently. Confirm the exact JSON generated by the compiled native target on the emulator.

### Phase D: tune mobile cache policy

Use a bounded mobile cache budget and explicit startup/rebuffer settings. Do not select final numeric values from desktop assumptions. Measure startup latency, memory use, rebuffer recovery, and seek latency across at least one ordinary API stream, one archive/progressive stream, one local file, and one stream that lacks reliable range seeking.

### Phase E: implement V2 progress and buffering UX

Extend the independent V2 progress primitive with buffered-range layers, disabled/unseekable behavior, seeking feedback, cache buffering state, and accessible labels. Keep all presentation code inside the V2 module. The V2 UI must never display a user-paused icon while native reports a cache pause.

### Phase F: acceptance

The release gate must include startup play, five minutes of uninterrupted network playback, forced network throttling or temporary loss, resume after cache underrun, seek within buffer, seek outside buffer, seek on a non-range source, pause/resume, next/previous, queue transition, saved-position resume, background/miniplayer playback, and restart persistence. Each test must record whether the item remained loaded and whether any unexpected `loadFile` command occurred.

## Decisions and non-decisions

| Decision | Rationale |
|---|---|
| Treat `paused-for-cache` as first-class state | It is the documented mpv signal and is distinct from user pause. |
| Keep user intent separate from effective playback | Matches Media3 and maintained Android behavior; avoids false “paused” UI. |
| Render buffered ranges, not one guessed buffered endpoint | mpv and web/Apple APIs allow multiple ranges and distinguish them from seekable ranges. |
| Use normal mpv seek for unbuffered seekable positions | Seeking is a current-item operation, not a reload. |
| Guard retries by terminal error classification and load generation | Prevents the exact restart storm observed in SIMBA. |
| Use current maintained mpv/libmpv concepts | Avoids deprecated tick/idle control patterns and avoids copying an old UI package. |
| Do not disable TLS verification | Secure streaming is now working through the bundled CA path. |

| Not a solution | Why it is rejected |
|---|---|
| Increasing cache to 120 seconds and 150 MiB without measurement | Can increase memory pressure and does not stop a JS reload loop. |
| Calling `loadFile` whenever position stalls | Confuses buffering, pause, seek, and decoder startup. |
| Treating every `onError` as retryable | Creates repeated reloads and can reset a playable stream. |
| Treating `pause=true` as buffering | User pause and cache pause have different UX and audio-focus semantics. |
| Drawing buffered progress from `duration` or `cache-time` alone | Those values are approximate and do not represent disjoint buffered ranges. |
| Promising arbitrary seek on every URL | Server byte-range support and media format determine actual seekability. |
| Copying V1 player components or icons | Violates the V2 isolation requirement and does not solve the state model. |

## References

1. [mpv Manual](https://mpv.io/manual/stable/)
2. [mpv Input and Property Documentation](https://raw.githubusercontent.com/mpv-player/mpv/master/DOCS/man/input.rst)
3. [mpv buffering discussion: `paused-for-cache`](https://github.com/mpv-player/mpv/issues/9279)
4. [Android Media3 player events](https://developer.android.com/media/media3/exoplayer/listening-to-player-events)
5. [Android Media3 Player API](https://developer.android.com/reference/androidx/media3/common/Player)
6. [Android Media3 DefaultLoadControl](https://developer.android.com/reference/androidx/media3/exoplayer/DefaultLoadControl)
7. [Android Media3 troubleshooting](https://developer.android.com/media/media3/exoplayer/troubleshooting)
8. [Maintained mpv-android repository](https://github.com/mpv-android/mpv-android)
9. [Maintained mpv-android MPVView.kt](https://raw.githubusercontent.com/mpv-android/mpv-android/master/app/src/main/java/is/xyz/mpv/MPVView.kt)
10. [Maintained mpv-android MPVActivity.kt](https://raw.githubusercontent.com/mpv-android/mpv-android/master/app/src/main/java/is/xyz/mpv/MPVActivity.kt)
11. [MDN buffering, seeking, and time ranges](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Audio_and_video_delivery/buffering_seeking_time_ranges)
12. [Apple AVPlayer loaded time ranges](https://developer.apple.com/documentation/avfoundation/avplayeritem/loadedtimeranges)
13. [Apple AVPlayer seekable time ranges](https://developer.apple.com/documentation/avfoundation/avplayeritem/seekabletimeranges)
14. [React Native Track Player hooks](https://www.rntp.dev/docs/hooks)
15. [Expo Audio documentation](https://docs.expo.dev/versions/latest/sdk/audio/)
