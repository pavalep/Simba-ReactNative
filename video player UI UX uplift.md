# SIMBA Video Player V2 — UI/UX Uplift and Logic-Hardening Specification

**Status:** Implementation target for the current V2 architecture  
**Date:** 24 August 2026  
**Author:** **Manus AI**  
**Scope:** Android-first React Native presentation, shared native mpv session, route-free overlay host, Huawei/HarmonyOS-aware responsive behavior, and future iOS parity.

> This specification responds to the observed player symptom: a large pale empty surface, weak loading treatment, low cinematic contrast, and an overloaded control area. The screenshot is treated as evidence of a hierarchy problem, not as a visual target to copy. The desired result is a focused, content-first player that feels familiar to users of major streaming services while remaining an original SIMBA implementation.

## 1. Evidence and design decision

The research baseline combines maintained open-source player code with primary platform guidance. The current TheWidlarzGroup player separates the native video component from custom controls and explicitly owns control visibility, progress references, timeout cleanup, and capability flags. Its code is useful as a pattern reference, but it is built over `react-native-video`, not SIMBA’s mpv bridge, so it is not copied into production. The older `react-native-video-controls` project confirms the conventional baseline of back, title, play/pause, seek, fullscreen, volume, timer, and error handling, while also showing why control animation timing and optional capabilities must be explicit rather than accidental. [7] [8]

Android’s current guidance treats playback controls, buffering indicators, surface choice, and PiP as distinct responsibilities. Media3 `PlayerView` displays video, subtitles, album art, and controls through a connected player contract, and its documented buffering mode is conditional on actual playback rather than a permanent loading screen. [1] [2] Android PiP is a window/lifecycle mode around the existing playback activity; the application must continue playback, hide normal UI in PiP, use one playback activity, handle configuration changes, and provide a polished transition. [3]

Apple’s video guidance reinforces the same product principles: preserve the original aspect ratio, provide only useful information that does not obscure playback, follow familiar system-player behavior, keep loading screens minimal and black when loading takes more than a short threshold, start playback promptly, and avoid mixing audio sources during mode changes. [4] Huawei’s responsive-layout and safe-area guidance supports adaptive layouts and inset-aware interactive controls across compact phones, tablets, foldables, and other device classes rather than fixed phone dimensions. [5] [6]

### Decision: remain on V2; do not create V3 yet

A V3 folder is **not justified at this point**. The current V2 already has the correct high-level boundaries: route-free module, narrow controller port, typed view model, independent primitives, one persistent native surface, and explicit secondary panels. The current defects are presentation-state and orchestration hardening issues that can be corrected inside V2. V3 should be considered only if a future audit proves that the controller port cannot express native truth without leaking legacy presentation state, or if a different rendering engine is selected.

## 2. Product goals

The player must put the moving image first. During normal playback, controls should be quiet and transient; when the user interacts, the player should reveal a small number of immediately useful controls with predictable placement. The full player must never look like a light application page containing a grey control card. The media surface, loading state, error state, and transition scrim must remain visually coherent even when the app’s general theme is light.

The player must communicate state without requiring interpretation. A user should be able to distinguish preparing, buffering, seeking, paused, playing, finished, live, and terminal error from a short label, motion indicator, or button state. Loading is not the same as buffering, and buffering is not the same as a paused video. No progress value, duration, buffered range, track, or capability may be invented for visual completeness.

The player must remain one playback session. Full, mini, and PiP are presentations of the same session, not separate decoders, controllers, surfaces, queues, or resume intents. A presentation change must not reload the URI, reset the position, clear the buffered ranges, detach the native surface, or reapply an old start position.

## 3. Visual language: cinematic media surface

The video surface is always a near-black media surface, independent of the light/dark page background. In the SIMBA token system this maps to `colors.background.surfaceDark` for the media root and to the scrim family for transient overlays. The surface may reveal letterboxing or pillarboxing, but those regions remain dark and intentional. The player must preserve the source aspect ratio; it must not stretch the frame or crop content by default. [4]

The player does not show a permanent pale background, a large white card, or a full-height grey loading panel. The loading state uses a dark surface with a restrained center treatment: a small activity indicator, a concise state label such as “Preparing video” or “Connecting”, and optional content title only when it helps identify the requested item. If the first frame is not available after a short threshold, the treatment may include a restrained poster/thumbnail or a faint progress accent, but never a large collection of unrelated metadata.

The control system uses three visual layers: a top navigation scrim, a minimal center action when needed, and a bottom transport scrim. Scrims are gradients or translucent dark tokens where possible; they must not resemble opaque desktop panels. The accent gold identifies the primary action, active caption state, selected policy, and seek progress. White-on-media text and icons remain the default control color because light-mode primary text tokens are not safe over a video frame.

## 4. Full-player hierarchy

The top layer contains only the minimize/back affordance, a single-line title, lock state, and More. The title truncates rather than pushing actions off-screen. The lock action is visible only in the expanded player. More is the single entry point for secondary functions and must not duplicate actions already visible in the bottom transport.

The bottom transport contains the seek bar and time labels, then one balanced primary transport row: Previous when available, rewind ten seconds, Play/Pause, forward ten seconds, and Next when available. The primary Play/Pause control is visually dominant but must not become a huge isolated circle that consumes the viewing experience. Its target remains accessible while its visual diameter is restrained. Previous and Next use unambiguous directional glyphs and disappear when there is no meaningful target rather than becoming dead spacers that look like broken controls.

The utility row contains captions, fullscreen/orientation, and PiP only when supported by the current native capability and platform. Volume, speed, repeat, shuffle, audio language, caption language, caption appearance, queue, chapters, metadata, playlist, share, and screenshot belong in More. A secondary action is not rendered merely because a controller method exists; it must have real state, a real effect, and a meaningful unavailable state.

The center of the frame is reserved for a single primary action. It is shown when paused with controls hidden, when playback is finished, or when retry is required. It is not shown as a second replay layer while the bottom transport already contains the same action. During normal playing playback the center remains visually empty.

## 5. Loading and failure states

| State | Surface | User-facing treatment | Forbidden behavior |
|---|---|---|---|
| Preparing | Near-black | Small spinner and “Preparing video” after the short initial threshold | Pale full-screen background, fake percentage, or full-page card |
| Connecting | Near-black | Small spinner and “Connecting” with title retained in the top layer | Treating a network wait as a terminal error |
| Buffering | Current frame when available | Small buffering indicator and “Buffering” while playback is waiting | Resetting the URI, jumping to zero, or replacing the frame with a blank page |
| Seeking | Current frame when available | Seek feedback and a stable thumb/track; disable conflicting transport only when necessary | Starting multiple concurrent seek timers or creating fake buffered islands |
| Paused | Current frame | Play affordance and “Paused” only when controls are visible | Showing a spinner or implying a network problem |
| Finished | Last frame or dark frame | One “Play from beginning” action and “Finished” state | Automatic replay when repeat is off |
| Terminal error | Near-black | Short error title, useful message, Retry, and Close | Silent failure, infinite reload loop, or exposing a dead action |
| Unsupported/unseekable | Current frame or dark frame | Omit seek affordance or make its disabled state clear; retain play/pause | Multiplying duration by zero or pretending a live stream is seekable |

A terminal error is classified before retry. Retry invalidates the previous load generation, cancels pending delayed work, and performs one new load attempt. Ordinary buffering, surface reattachment, and native diagnostic events must never trigger broad reloads. The controller must reject stale callbacks by load generation and mount state.

## 6. Safe-area and responsive layout rules

The media root draws edge-to-edge behind system bars. Safe-area insets apply to interactive controls, not to the video itself. Top controls add the top inset plus a small design gap; bottom controls add the bottom inset plus a design gap. Left and right controls use the corresponding inset on notched, rounded, or landscape devices.

The full player uses adaptive groups rather than hard-coded coordinates. Compact portrait devices use the smallest utility row and may move low-frequency actions entirely into More. Landscape devices reduce vertical padding and preserve a single transport row. Wider layouts may increase spacing and title width without creating a second toolbar. Tablets and foldables may center the transport group within a maximum readable width while retaining edge-safe top and bottom chrome. This follows Huawei’s responsive-layout direction rather than assuming a single mobile viewport. [5] [6]

## 7. Mini-player and transition behavior

The mini-player contains the persistent video frame, title, state, compact seek bar, Play/Pause, Expand, and Close. It does not display full-player panels, large status rows, previous/next, or repeated utility controls. When the mini player is entered, expanded-only panels are closed before the transition completes.

The native surface remains mounted throughout the transition. The surface geometry interpolates from compact preview bounds to full-frame bounds, while the mini and full chrome crossfade. Pointer ownership switches at the presentation boundary so hidden chrome cannot intercept touches. A running animation is stopped before a new presentation animation begins. The transition must not invoke `loadFile`, `stop`, `destroy`, or a native surface detach.

The animation is a presentation concern. It cannot change playback state, transport position, buffered ranges, repeat policy, or queue identity. If a transition is interrupted by close, PiP, orientation change, or a replacement request, the latest command wins and all intermediate animation callbacks are ignored.

## 8. Logic-hardening matrix

| Edge case | Required logic |
|---|---|
| Same URI reopened after EOF | Preserve EOF state and position; do not apply old initial start intent; Play restarts only after explicit user action. |
| Mini/full toggle during seek | Preserve the pending seek generation; do not issue a second load or reset the thumb. |
| Mini/full toggle during buffering | Keep the current item and native session; show buffering state in the new chrome without forcing replay. |
| Full player closed during delayed load | Cancel surface listener, load timer, thumbnail timer, resume timer, fallback timer, and all native subscriptions before destroy. |
| New item replaces old item | Invalidate old generation, clear item-scoped cache/track state, keep lane/provenance identity, then load the new item once. |
| Unknown duration | Render no misleading range geometry; disable arbitrary seek until native seekability is known. |
| Live video | Omit or disable time seek; retain play/pause and supported live controls. |
| Native track list changes | Replace track state from native truth, preserve only a still-valid selected track, and close selection panels when the item changes. |
| Caption track disappears | Hide the stale caption selection, reset visibility if necessary, and never invoke a missing track id. |
| PiP unavailable | Omit the PiP control; do not show an inert button. |
| PiP entry/exit | Keep one activity/session, hide normal chrome in PiP, preserve playback, and restore full chrome without a second player. [3] |
| Queue transition at EOF | Apply repeat/queue policy once; prevent duplicate end events from starting multiple transitions. |
| Rapid repeated Play/Pause | Serialize intent against native state or use a command generation so rapid taps do not invert the final state. |
| Share/Screenshot failure | Show truthful failure feedback and leave playback state untouched. |
| Authentication/root transition | The host may hide presentation chrome, but it must not leave orphaned listeners or native surfaces. |

## 9. SOLID ownership contract

The controller owns orchestration, load generations, native subscriptions, queue transitions, playback policy, track selection, lifecycle, and error classification. The adapter owns conversion from the narrow controller port plus transport state into `VideoV2Model`. The surface primitive owns only the native render bridge and geometry. Controls own intent emission and visual state. More and context panels own progressive disclosure and selection UI. The playback context owns only active identity and presentation. No layer reaches around its boundary to mutate another layer’s state.

The view model must remain the single presentation contract. If a control cannot be represented with typed state and a real command, it is not placed on screen. Panel visibility belongs to the V2 composition rather than the legacy controller. Native capabilities are checked before commands are advertised.

## 10. Manual acceptance gates

The implementation is not release-complete until the user manually verifies local video, remote video, first-frame loading, remote buffering, seek within and outside the current cached range, unseekable/live media, pause/resume, finished state, repeat-off/repeat-one/repeat-all, previous/next, queue transitions, audio tracks, captions, caption appearance, speed, volume/mute, fullscreen/orientation, PiP entry/exit, repeated mini/full transitions, close during loading, close during buffering, and reload after a terminal error.

Manual verification must specifically confirm that the dark media surface remains dark before the first frame, that the current frame is not replaced by an empty pale background during buffering, that expanding from mini does not restart or reload the video, and that closing the player releases the session exactly once.

## 11. Implementation plan

The first implementation batch applies the media-surface and loading-state corrections: near-black root/background, token-driven media scrims, compact delayed loading treatment, explicit error presentation, and no fake state. The second batch applies adaptive control density, hidden-panel reset, and persistent-surface transition behavior. The third batch performs logic hardening for load generations, delayed callbacks, end-of-file policy, track validity, PiP capability, and rapid intent handling.

No V3 folder is created in this batch. The V2 boundary remains the production path while evidence is collected from the user’s manual test pass.

## References

[1]: https://developer.android.com/develop/ui/views/playback-controls "Android Developers — Add media playback controls to your app"

[2]: https://developer.android.com/media/media3/ui/playerview "Android Developers — PlayerView"

[3]: https://developer.android.com/develop/ui/views/picture-in-picture "Android Developers — Use picture-in-picture (PiP)"

[4]: https://developer.apple.com/design/human-interface-guidelines/playing-video "Apple Human Interface Guidelines — Playing video"

[5]: https://developer.huawei.com/consumer/en/doc/best-practices/bpta-multi-device-responsive-layout "HUAWEI Developers — Responsive Layout"

[6]: https://developer.huawei.com/consumer/en/doc/harmonyos-guides/web-safe-area-insets "HUAWEI Developers — Calculating and Adjusting Safe Area Insets"

[7]: https://github.com/TheWidlarzGroup/react-native-video-player "TheWidlarzGroup — react-native-video-player"

[8]: https://github.com/itsnubix/react-native-video-controls "itsnubix — react-native-video-controls"
