# SIMBA Video Player V3 — Premium Product, UI/UX, and Logic Specification

**Status:** Waves A and B complete; Wave C surface, safe geometry, controls, and first-frame loading implemented; V3 transition animation and Android PiP bridge implemented; orientation, background, and manual gates remain open  
**Date:** 24 August 2026  
**Author:** **Manus AI**  
**Target:** Android first, Huawei/HarmonyOS-aware, then iOS parity  
**Product bar:** Netflix-level ease, native-platform discipline, production-safe lifecycle

> **V3 is a clean-room player track.** Its visual language, information architecture, interaction model, state contract, controller boundary, component tree, icons, styles, loading treatment, animation model, and error surfaces must be designed independently. V3 must not import, extend, wrap, copy, rename, or visually inherit any V2 file or presentation idea. V2 is an archived implementation reference only and is not a design source.

## 1. Why V3 exists

The manager’s feedback is that the current player does not meet a professional product standard. The problem is not limited to a background color. The player currently communicates like an unfinished technical screen: the media surface does not dominate, loading has weak hierarchy, controls compete for attention, and state changes are not presented with the confidence of a mature streaming product.

V3 therefore resets the presentation contract rather than applying another cosmetic pass. The goal is a player that behaves like a system-quality media surface: the image is primary, the controls appear only when needed, every visible action is trustworthy, and all presentation changes preserve one playback session.

The V3 decision is supported by current implementation research. Mux’s 2026 React Native player architecture keeps native playback truth in the native layer while JavaScript owns intent and UI state, and compares a source fingerprint before releasing/rebuilding a player. [1] Netflix’s playback UI engineering work shows that loading and control rendering must be measured separately, that rendering the full control tree while loading can delay startup, and that broad root-level rerenders can degrade playback performance. [2] Android Media3 guidance separates the media surface, subtitles, controls, buffering configuration, and surface choice. [3] Android PiP guidance treats PiP as a lifecycle/window presentation of one playback activity, not a second player. [4] Apple’s video guidance reinforces familiar controls, original aspect ratio, minimal loading screens, and limited supplementary information. [5] Huawei/HarmonyOS guidance requires responsive layout and safe-area-aware interaction across device classes. [6] [7]

## 2. Clean-room boundary

The following are **forbidden** in V3 production source:

| Forbidden dependency | V3 rule |
|---|---|
| V2 imports | No import from `video/v2`, no V2 barrel, no V2 types, no V2 primitives, no V2 hooks, no V2 icons, no V2 styles. |
| V2 visual reuse | Do not copy V2 spacing, gradients, layout geometry, button sizing, row order, loading copy, sheet shape, or animation constants. |
| V2 controller exposure | Do not pass the existing all-purpose controller object to V3 views. V3 consumes a new port with explicit source, native state, intent, and capability boundaries. |
| V2 surface assumptions | V3 defines its own surface host contract and session attachment lifecycle. A persistent native surface is a product requirement, but its ownership and API are newly specified. |
| V2 presentation state | V3 defines its own presentation state machine. It must not rely on V2 `expanded/mini` rendering behavior or V2 panel state. |
| Legacy V1 presentation | No V1 UI, V1 sheets, V1 control components, V1 layout wrappers, or V1 presentation exports. |
| Dead controls | A button is rendered only when its capability and command are both valid. No “coming soon”, fake selection, silent native call, or placeholder row is permitted. |

The only permitted reuse is lower-level infrastructure that is presentation-neutral and independently audited: the native mpv bridge, shared playback identity contracts, safe-area provider, Redux domain APIs, and platform capability probes. Even these dependencies must be wrapped by a new V3 adapter rather than leaked into presentation components.

## 3. Product principles

### 3.1 Content is the product

The frame receives the largest, darkest, quietest surface. Controls must not turn the player into a form or settings page. During normal playback, the viewer should see the image without a persistent status panel, a permanent spinner, or decorative chrome.

### 3.2 Familiar beats clever

Users should understand the player without training. V3 follows familiar system-player conventions for tap-to-reveal, play/pause, scrubbing, captions, fullscreen, PiP, and error recovery. Novelty is reserved for the brand surface and motion restraint, not for control semantics. [4] [5]

### 3.3 State must be truthful

The native session is authoritative for position, duration, buffering, seeking, seekability, tracks, end-of-file, and surface readiness. JavaScript is authoritative for user intent, panel navigation, and presentation state. The UI never manufactures duration, buffered ranges, track names, readiness, or success messages.

### 3.4 Reduce before adding

Every new action must answer three questions: Is it common enough to be direct? Does it have a real native/domain effect? Can a user recover if it fails? If any answer is no, the action stays hidden or is omitted. V3 prefers one excellent More destination over several competing rows.

### 3.5 One session, many presentations

Full player, inline mini player, system PiP, background continuation, and restoration are projections of one session. None may create a second player, queue, timer family, seek authority, or resume position.

## 4. V3 visual language: Cinema Obsidian

V3 introduces a dedicated player palette rather than using page-surface colors. The media plane is always near-black. Light-mode application pages must never turn the video surface into parchment, white, or pale grey. The following values are design targets for a new `videoV3` token namespace and must not be copied from the previous player’s style objects.

| Role | Direction |
|---|---|
| Media plane | Near-black obsidian with no visible page boundary. |
| Primary control | Soft ivory or white on media; active state uses a restrained SIMBA amber. |
| Secondary control | White at reduced opacity; never page-theme black on a dark frame. |
| Scrim | Transparent-to-obsidian gradients that protect text without creating panels. |
| Progress | Thin amber played line, low-contrast current buffer line, high-contrast thumb only during interaction. |
| Loading | Small ivory/amber activity mark; no large branded card. |
| Error | Same dark media plane with a clear recovery action; no red full-screen alarm unless the error is destructive. |
| Sheets | Dark elevated surfaces with a narrow top grab affordance, clear title, and compact rows; no white dialog card over video. |

The frame always preserves the source aspect ratio. Fit-to-screen is the default for standard video; fill/crop is an explicit user choice, never an accidental effect. Letterbox/pillarbox regions are intentional dark space. [5]

## 5. Information architecture

V3 has four presentation layers, each with one job:

1. **Media layer:** native frame, subtitles, and no application chrome.
2. **Transient feedback layer:** loading, buffering, seek feedback, retry, and a single paused/finished primary action.
3. **Transport layer:** top navigation, progress, essential transport, and capability-safe utility controls.
4. **Context layer:** More, queue, chapters, tracks, caption settings, playlist, information, share, and screenshot.

The context layer is not mounted while the player is preparing. Netflix’s engineering research specifically found that rendering controls in parallel with loading harmed startup performance. V3 mounts the minimum loading surface first and mounts the full transport only once the session reaches a renderable state. [2]

## 6. Full-player layout

### 6.1 Ready and playing

The ready/playing composition is visually sparse. The top layer has a back/minimize control, a single-line title, and one More entry. A lock control appears only after the user opts into locked controls; it is not permanently competing with the title.

The bottom layer contains one thin progress rail and one centered transport row. The transport row is deliberately asymmetric when necessary: Previous and Next are shown only when actionable; rewind and forward are always available for seekable non-live media; Play/Pause is the dominant action. Captions, fullscreen, and PiP appear in a compact utility cluster only when supported and only when the width allows them. Low-frequency actions move into More.

No permanent “PLAYING” badge, duplicate duration block, oversized play circle, decorative status dot, or repeated title appears during normal playback. The player should feel quiet while the content is running.

### 6.2 Paused and finished

Paused playback reveals the transport on user interaction and presents one central Play action if the transport is hidden. Finished playback presents one central “Play from beginning” action. The bottom transport does not present a second competing replay button. Repeat behavior changes the outcome, not the visual semantics: if repeat is active and a native end event is accepted, the controller performs one guarded restart and then returns to playing/buffering truth.

### 6.3 Loading and buffering

Initial preparation uses the dark media plane with no full transport tree. After a short threshold, the player shows a small centered activity mark and concise copy such as “Preparing” or “Connecting”. If a poster or retained frame exists, it remains visible behind the treatment. Once a frame is available and playback stalls, buffering is shown as a small transient indicator over the retained frame; the player does not turn blank or reset to zero.

Seeking is not loading. While seeking, the current frame remains visible and only the seek feedback changes. A spinner appears only when the native session reports an actual wait for data.

### 6.4 Error

An error is a controlled media state, not a crash fallback. The player retains the dark media plane, explains the problem in one short line, offers Retry when the source can reasonably be retried, and always offers Close. Retry invalidates the prior load generation before starting a new attempt. Stale errors from an older source cannot overwrite the new player.

## 7. Mini player and PiP

### 7.1 Inline mini

The inline mini player is a compact continuation surface with frame, title, a thin progress rail, Play/Pause, Expand, and Close. It does not contain full-player sheets, captions settings, queue rows, previous/next, or a second More action. The whole card is an expansion target except for explicit Play/Pause and Close targets.

The mini player has a dark surface and a subtle edge treatment. It must remain legible at narrow widths and must not become a light card merely because the surrounding screen is light.

### 7.2 System PiP

PiP is exposed only after a platform capability probe confirms it. Entering PiP changes system presentation; it does not create an in-app mini surface or replace the playback session. Normal V3 chrome is hidden while the system owns the PiP window. Playback, queue identity, position, and audio focus follow the native platform contract. Android recommends one playback activity and a polished PiP transition with appropriate configuration handling and source bounds. [4]

### 7.3 Transitions

V3 uses a motion model based on a single shared presentation progress value. The native surface remains attached while its transform/clip geometry changes. Surface movement uses native-driver-compatible transforms where possible; opacity and chrome movement are separate from layout computation. React transport ticks must not allocate animation graphs or trigger layout reconstruction.

If a transition is interrupted, the latest presentation intent wins. Animation completion callbacks must carry a generation token and may not reopen panels, replay media, or change playback state after a newer command.

## 8. Responsive Huawei/HarmonyOS rules

The design uses responsive breakpoints and safe-area insets rather than fixed phone coordinates. Media extends edge-to-edge. Top, bottom, left, and right insets are applied to interactive targets and text-safe regions only. Huawei’s responsive guidance favors adaptable layouts and components across device classes, while the safe-area guidance requires content to respect system-obscured regions. [6] [7]

| Width/orientation | V3 behavior |
|---|---|
| Compact portrait | Minimal top row, centered transport, only one or two utility controls direct; all other actions in More. |
| Standard portrait | Top title plus More; progress above centered transport; captions/fullscreen direct when supported. |
| Landscape phone | Reduced vertical gaps, edge-safe horizontal controls, single-line transport; no second utility toolbar. |
| Tablet/foldable | Constrain readable control width, preserve frame aspect ratio, allow larger hit spacing without adding actions. |
| Huawei/HarmonyOS device | Respect safe-area APIs and configuration changes; never position controls from a hard-coded status-bar height. |

All interactive targets are at least 44–48dp where platform conventions permit. Labels are accessible, dynamic content descriptions reflect current state, and lock mode provides an obvious unlock path. Aging-friendly and accessibility requirements are treated as layout constraints rather than post-release polish.

## 9. New V3 SOLID architecture

### 9.1 Core boundaries

`VideoV3PlaybackSession` owns the native mpv session, source fingerprint, load generation, native listener registry, surface attachment, seek serialization, queue transitions, and explicit release. It exposes a narrow typed port and never returns a UI object.

`VideoV3StateAdapter` maps native truth plus playback identity into a new immutable `VideoV3ViewState`. It normalizes invalid numbers, unknown durations, live media, track validity, capabilities, and end-of-file semantics.

`VideoV3IntentController` accepts user intents, guards them against state/capability, serializes rapid commands, and delegates to the session. It owns no layout and renders no React elements.

`VideoV3PresentationHost` owns only full/mini/PiP projection, panel state, transition generation, safe-area geometry, and which chrome layer is interactive.

`VideoV3MediaSurface`, `VideoV3LoadingState`, `VideoV3Transport`, `VideoV3ContextMenu`, `VideoV3TrackPicker`, `VideoV3QueuePanel`, and `VideoV3ErrorState` each have one narrow responsibility. They receive explicit props and emit typed intents. No component receives the complete controller object.

### 9.2 Source fingerprint and load generations

A source fingerprint includes URI, media lane, media type, provenance, provider, folder identity where applicable, live channel identity, and the requested start intent. A presentation change never changes the fingerprint. A source replacement increments the load generation, invalidates pending callbacks, detaches old listeners, resets item-scoped track/cache state, and loads the new source once.

Every asynchronous callback checks both mount/session validity and its generation token. A stale surface callback, delayed seek, retry callback, or end event is ignored. Cleanup is idempotent and can safely run after a partial initialization.

### 9.3 Render budget

High-frequency position and buffered-range events update the smallest possible state boundary. The root host must not rebuild the entire context tree for every tick. Transport rows use memoized primitives; animation nodes are allocated once per session; panels are mounted only when opened; and loading controls are not mounted together with the initial loading view unless the session is renderable. Playback milestone instrumentation records source request, surface attached, native load, first frame, ready, playing, buffering, error, EOF, and release.

## 10. Required command and capability matrix

| Capability | Direct or contextual | Must be truthful |
|---|---|---|
| Play/Pause | Direct | Native playing/paused state and EOF restart semantics. |
| Seek | Direct when seekable | Disabled or omitted for live/unseekable media; unknown duration never produces geometry. |
| Rewind/Forward | Direct when seekable | Clamped to valid duration and serialized against native seek. |
| Previous/Next | Direct only when target exists | No dead buttons or fake spacers. |
| Captions | Direct when a caption capability exists | Toggle and track selection are separate, native-backed commands. |
| Audio track | Contextual | Show only real native tracks; preserve valid selection only. |
| Speed | Contextual | Show selected rate and real options; no hard-coded selection callback. |
| Fullscreen/orientation | Direct when supported | Report actual orientation state; handle configuration changes. |
| PiP | Direct when supported | Omit if unsupported; hide normal chrome in system PiP. |
| Volume/mute | Contextual | Slider reflects native value; changing volume can restore sound only by explicit product rule. |
| Queue/chapters | Contextual | Items are lane-valid and selection changes native playback once. |
| Playlist | Contextual | Video-only validation, duplicate protection, atomic create/add flow. |
| Share/screenshot | Contextual | Success/failure feedback is explicit; playback state remains untouched. |
| Repeat/shuffle | Contextual | Policy is visible and applied once at EOF; shuffle never mixes invalid lanes. |

## 11. Edge-case hardening matrix

| Situation | V3 requirement |
|---|---|
| Slow first frame | Keep dark surface; delayed minimal preparation indicator; no full controls until renderable. |
| Surface attach arrives late | Keep one pending listener, remove it on first use or cancellation, and never duplicate load. |
| Native surface reattaches | Rebind the same session without resetting position or reapplying initial start. |
| Mini/full interruption | Stop prior animation, increment presentation generation, preserve session and panels according to destination. |
| Close during load | Cancel every timer/listener and release native resources exactly once. |
| Retry after error | Invalidate old generation; prevent error/retry loops and duplicate loads. |
| Duplicate EOF events | Accept only the active generation and one terminal transition. |
| Buffering after seek | Retain current frame and position intent; show buffering only from native wait state. |
| Unknown/infinite duration | No misleading progress or time labels; seek disabled until valid. |
| Live channel | No arbitrary seek; preserve channel identity and live controls. |
| Caption disappears | Close picker or clear invalid selection without invoking a missing track. |
| Audio focus lost | Follow native focus policy; never mix secondary audio sources unexpectedly. |
| Rapid Play/Pause | Serialize final intent; no alternating stale callbacks. |
| Orientation change | Preserve session, safe-area recalculation, and control visibility policy. |
| PiP entry/exit | One session, one queue, normal chrome hidden in PiP, restoration without reload. |
| App background/foreground | Explicit policy for audio/video continuation; no orphaned listeners. |
| Playlist maximum/duplicate | Domain result is surfaced as truthful feedback; no silent mutation. |
| Share/screenshot failure | Show failure feedback without changing playback. |
| Huawei device variation | Responsive layout, safe-area insets, configuration handling, and no fixed status-bar assumptions. |
| Accessibility focus | All actions have state-aware labels, sufficient targets, and a predictable traversal order. |

## 12. V3 waves and checkable delivery steps

### Wave A — Research and clean-room foundation

- [x] A1: Freeze V2 presentation imports and record the V3 clean-room boundary.
- [x] A2: Record primary Android, Apple, Huawei/HarmonyOS, Netflix engineering, and premium-player sources.
- [x] A3: Define V3 source fingerprint fields and load-generation rules.
- [x] A4: Define the native session port and explicit release contract.
- [x] A5: Define capability negotiation and unsupported-control omission rules.
- [x] A6: Add V3 reference provenance and licensing notes without importing reference UI.

### Wave B — Native session and state contract

- [x] B1: Implement the V3 session lifecycle around the existing native mpv bridge.
- [x] B2: Implement one listener registry with idempotent unsubscribe.
- [x] B3: Implement load generation and stale-callback guards.
- [x] B4: Implement native surface attachment and reattachment without reload.
- [x] B5: Implement serialized seek and cancellation behavior.
- [x] B6: Implement explicit preparing, connecting, buffering, seeking, ready, paused, playing, finished, and error states.

### Wave C — Presentation surface

- [x] C1: Add independent V3 media surface and tokenized Cinema Obsidian media palette.
- [x] C2: Add first-frame/loading treatment without mounting full controls prematurely.
- [x] C3: Add responsive safe-area geometry for portrait, landscape, tablet, and Huawei variations.
- [x] C4: Add top navigation layer with truncation and capability-safe actions.
- [x] C5: Add bottom transport with truthful seek and minimal direct controls.
- [x] C6: Add one center action for paused, finished, and retry-required states.

### Wave D — Context and premium behavior

- [ ] D1: Add independent contextual action destination and panel state machine.
- [ ] D2: Add native-backed audio track, caption track, speed, and caption appearance pickers.
- [ ] D3: Add video-only queue, chapters, playlist, metadata, share, and screenshot flows.
- [ ] D4: Add repeat/shuffle policy controls without cluttering the frame.
- [ ] D5: Add truthful volume/mute control with native state synchronization.
- [ ] D6: Add lock mode, accessibility labels, and predictable touch zones.

### Wave E — Presentation continuity and platform behavior

- [x] E1: Add one-session inline mini projection with essential controls only.
- [x] E2: Add native-surface-preserving full/mini transition animation.
- [x] E3: Add interrupted-transition generation guards.
- [x] E4: Add Android PiP capability bridge and one-activity continuity.
- [ ] E5: Add fullscreen/orientation and configuration-change handling.
- [ ] E6: Add background/foreground and audio-focus policy.

### Wave F — Proof and release gates

- [ ] F1: Run TypeScript, targeted lint, and production build checks.
- [ ] F2: Run forbidden-import and V2-reuse scans over the complete V3 tree.
- [ ] F3: Add playback milestone diagnostics without logging secrets or URLs unnecessarily.
- [ ] F4: Manually verify local, remote, live, unseekable, buffering, EOF, retry, and queue flows.
- [ ] F5: Manually verify Huawei-safe-area, compact-width, landscape, and orientation behavior.
- [ ] F6: Manually verify repeated mini/full/PiP transitions and exactly-once teardown.

## 13. Native buffering and disconnected-range policy

The native audit confirms that Android’s `MpvBridgeModule` maps `cache-buffering-state` and `paused-for-cache` into `onBuffering`, maps `demuxer-cache-state.seekable-ranges` into `onCacheState`, and exposes `seekable`, `seeking`, and `surfaceAttached` as separate signals. The C++ bridge uses absolute native seeks and configures mpv cache/readahead options; V3 therefore treats native cache ranges and seekability as facts rather than simulating progress from a single fill percentage.

V3 keeps the full normalized range set in session state, preserving genuine disconnected ranges for diagnostics and future cache policy. The presentation layer uses `createVideoV3BufferPresentation` to render only the normalized range containing the current playhead. Disconnected islands ahead of the current playback window are intentionally hidden so the seek rail does not promise uninterrupted playback that the active cache does not provide. A large gap is never filled by normalization, and unknown duration never produces invented seek geometry.

The visible buffering indicator is separate from the seek rail: `paused-for-cache` and native cache-buffering signals can show a transient buffering status, while the buffered rail remains a truthful time-range projection. A seek outside the active range is still sent as an absolute native seek when the media is seekable; the coordinator serializes and supersedes stale requests, while native mpv remains responsible for fetching and pausing at the cache boundary.

## 14. Transition and PiP implementation evidence

The V3 presentation shell animates the projection container’s width, height, position, and corner radius while leaving the single `VideoV3NativeSurface` mounted. Full and compact chrome projections cross-fade during the same transition, and only the target projection receives pointer events. Each transition increments a generation token; an interrupted animation invalidates the prior completion path and starts from the current animated value instead of resetting the surface or playback session.

Android PiP is exposed through the typed native `MpvPlayer` contract and `VideoV3PipAdapter`. The existing activity manifest is already PiP-enabled and the activity callback emits mode changes. V3 hides normal chrome while PiP is entering, active, or exiting, retains the session and native surface, and handles the existing play/pause, expand, and close remote actions through the V3 intent/session boundary. The PiP capability is Android-gated and unsupported platforms keep the action hidden.

The implementation does not claim device behavior: PiP entry/exit, remote actions, aspect-ratio behavior, task restoration, transition smoothness, and configuration changes require manual Android testing.

## 15. Definition of done

V3 is not complete because the screen looks darker. It is complete only when the visual hierarchy is content-first, controls are discoverable without clutter, loading and buffering are distinct, every visible command is functional, source identity survives presentation changes, native listeners and timers are released exactly once, and the manual acceptance matrix passes on the target Android emulator/device set and representative Huawei hardware where available.

The V3 clean-room folder, session contracts, state synchronization, surface bridge, control layer, first-frame loading sequence, and route-free host cutover are now implemented. No V3 component should be created by copying or editing a legacy player file. The V3 host must remain behind static/build/manual gates until production acceptance is complete; only then should remaining obsolete app-facing consumers be removed.

## References

[1]: https://www.mux.com/blog/react-native-needs-a-new-video-player "Mux — React Native needs a new video player"

[2]: https://netflixtechblog.com/modernizing-the-web-playback-ui-1ad2f184a5a0 "Netflix Technology Blog — Modernizing the Web Playback UI"

[3]: https://developer.android.com/media/media3/ui/playerview "Android Developers — PlayerView"

[4]: https://developer.android.com/develop/ui/views/picture-in-picture "Android Developers — Use picture-in-picture (PiP)"

[5]: https://developer.apple.com/design/human-interface-guidelines/playing-video "Apple Human Interface Guidelines — Playing video"

[6]: https://developer.huawei.com/consumer/en/doc/best-practices/bpta-multi-device-responsive-layout "HUAWEI Developers — Responsive Layout"

[7]: https://developer.huawei.com/consumer/en/doc/harmonyos-guides/web-safe-area-insets "HUAWEI Developers — Calculating and Adjusting Safe Area Insets"


## 16. Native lifecycle and load-correlation remediation

The P0 remediation introduces a shared native lifecycle contract in `android/app/src/main/cpp/native_state.h`. Native command and query entry points acquire a read lease tied to the active `mpv_handle`; creation, surface replacement, and destruction acquire the exclusive lifecycle lock. Destruction now rejects new work, wakes and joins the mpv event thread, deletes the global JNI Surface reference, clears pending load tokens, and only then destroys the handle.

V3 source replacement no longer depends solely on comparing a transformed path. Each V3 load receives a request token, the token travels through `VideoV3SessionPort`, `player.api.ts`, `MpvBridgeModule`, `MPVLib`, and the native load-request queue, and the `fileLoaded` callback returns the token with the resolved native path. This preserves correlation when Android converts a document-provider `content://` URI into `fd://N` or when the JavaScript layer remaps a downloaded source to a local path. A callback is not assigned to a pending load when its resolved path does not match, preventing stale cross-talk.

The JNI event thread now attaches to the JVM once for its lifetime instead of attaching and detaching for each event. It clears Java callback exceptions after dispatch and releases its attachment when the event loop exits. `MPVLib` uses `CopyOnWriteArrayList` and exception-isolated listener callbacks, preventing concurrent modification during React Native teardown and reducing callback-path synchronization risk. High-volume native informational payload logging was disabled in the event dispatcher.

### Audio implementation comparison

The audio range normalizer was audited as behavior evidence only; no audio presentation code was copied. The following neutral concepts are retained for V3: finite-value validation, duration clamping, sorting, epsilon-based merging of overlapping or genuinely adjacent ranges, preservation of meaningful gaps, and selection of only the buffered window containing the current playhead for the visible rail. V3 keeps its own independent `VideoV3BufferPolicy` and session types.

The audio implementation does not replace the native lifecycle boundary. Its useful transfer is the range policy, not its UI, hooks, icons, or controller structure. V3 remains responsible for native-path/request-token correlation, one-session ownership, generation guards, and Android surface lifecycle. Audio and video continue to use separate playback lanes.

Static and compile checks for this remediation are recorded in the manager tracker. Runtime validation remains mandatory for content-provider playback, replacement races, surface teardown, long-session callback pressure, and close/reopen behavior.


## 17. First-frame startup stall diagnosis and correction

A manual screenshot showed the V3 host mounted successfully while remaining in `Preparing video`, `Starting the first frame…`, and `0:00`. The captured Android logcat window contained no SIMBA, mpv, React Native, or V3 playback entries, so the runtime log capture itself did not prove the failure. The code-path audit did identify a deterministic startup vulnerability: `event.cpp` read mpv's `path` property during `MPV_EVENT_FILE_LOADED` and passed it to the pending-load queue; the queue returned `{}` whenever that value was empty or differed from the Android-resolved request path. `VideoV3MpvSession` then rejected the callback because its request token was absent, leaving `activeFileGeneration` unset and preventing the first-frame state from advancing.

The native queue now preserves the request token when there is exactly one pending request and mpv reports an empty or normalized path. It still refuses ambiguous correlation when multiple pending requests exist, and repeated requests for the same resolved path replace older pending tokens. The native event loop emits low-volume diagnostics containing only path length, token-match status, and payload length; media URLs are not logged. The TypeScript and Android external-native/Kotlin builds pass after the correction.

The next manual run must use a newly rebuilt and installed APK so the new `loadFileWithRequestId` JNI method and native fallback are present. Runtime acceptance remains open until a real `fileLoaded` token, `videoReconfig`, position progression, and playback-state sequence are observed on the device.


## 18. Native TextureView background-prop rule

The V3 native render surface must never receive `backgroundColor` or another React Native background drawable. Android `TextureView` rejects background drawables during Fabric property updates. The cinematic black surface is owned by the V3 projection shell outside `MpvRenderView`; `VideoV3NativeSurface` strips `backgroundColor` from caller styles at the native-component boundary as a defensive invariant. This prevents future host code from reintroducing the crash while preserving the surface geometry and edge-to-edge media treatment.
