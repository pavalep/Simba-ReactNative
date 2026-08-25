# SIMBA Video Player V2 — UI/UX and Playback Specification

**Revision:** 1.0 — ground-up video experience  
**Date:** 23 August 2026  
**Status:** Implementation specification  
**Scope:** Route-free video overlay, local and remote video, live video constraints, edge-to-edge layout, playback state, seeking, buffering, captions, audio tracks, speed, orientation, fullscreen, Picture-in-Picture, queue transitions, accessibility, and V1 decoupling

## 1. Product decision

Video Player V2 is a new product surface, not a restyled version of the current video player. It must not import, render, wrap, or visually depend on the V1 presentation components under `src/modules/playback/video/components`, `src/modules/playback/video/ui`, or the former V1 composition boundary. Native video rendering and stable playback orchestration may be reused where they are contractual infrastructure; presentation, layout, iconography, gesture vocabulary, and control grouping must be independently designed.

The player’s primary task is to **watch without interruption**. The frame receives the largest stable surface. Controls appear as a quiet, state-aware overlay and disappear when the user is watching. Secondary functions are grouped behind deliberate surfaces rather than competing with the frame.

This direction follows current platform guidance. Android media controls derive their actions from the player’s state and support playback resumption [1]. Apple’s current video guidance treats playback controls as contextual and emphasizes clear, familiar controls over permanent UI [2]. W3C guidance requires captions and accessible controls for audio and video content [3]. Apple’s Picture-in-Picture documentation treats PiP as a system-managed continuation mode that requires a correctly configured media session [4].

> “Starting in Android 13 (API level 33 ...), action buttons on media controls are derived from the Player state.” — Android Developers [1]

> “Provide captions (also called subtitles) so that people who are Deaf and hard-of-hearing get a text version of the speech and non-speech audio information.” — W3C WAI [3]

## 2. Design principles

| Principle | SIMBA Video V2 interpretation |
|---|---|
| Frame first | The video frame is the visual anchor. Controls never permanently occupy the frame when the user is watching. |
| State truth | Playing, paused, seeking, buffering, ended, connecting, and error are derived from native transport and explicit controller policy. |
| Presentation continuity | Fullscreen, minimized overlay, orientation changes, and PiP change presentation only; they do not reload or silently pause the current item. |
| Progressive disclosure | Play, pause, seek, fullscreen, captions, and more are discoverable in the primary control layer. Audio track, speed, equalizer, screenshot, info, and playlist functions live in a focused secondary surface. |
| Honest buffering | Buffered ranges, seekability, and live-window limitations are represented truthfully. The UI never paints a false bridge over a cache gap. |
| Lane integrity | Video queues contain video items only. Audio and video transition services remain separate. |
| Accessible by default | Touch targets, labels, contrast, captions, lock state, focus order, and non-color state cues are part of the component contract. |
| No V1 contamination | V2 has no imports, styles, SVG geometry, layout wrappers, or presentation components from V1. |

## 3. Visual system

Video V2 uses the existing SIMBA theme tokens and adapts them to the frame. The default viewing state is visually quiet: a near-transparent charcoal control veil, warm ivory text where controls sit outside the frame, and mustard-gold for the active progress and primary action. The player must not introduce neon blue, purple, glossy glass, or unrelated gradients.

| Role | Treatment |
|---|---|
| Video surface | Native frame at the correct aspect ratio, with a deep charcoal backdrop for letterbox/pillarbox space. |
| Watching state | Minimal overlay, no persistent card around the video, no decorative white panel. |
| Primary action | A balanced circular gold Play/Pause control with a 44-point minimum hit region. |
| Progress | Thin base track, darker real buffered ranges, gold played range, clear thumb, elapsed and duration labels. |
| Top controls | Quiet back/minimize, title/context, lock, fullscreen, and one More button. |
| Bottom controls | Play/Pause, previous/next when a meaningful lane exists, seek bar, captions state, and fullscreen. |
| State cues | Text or icon label in addition to color for Buffering, Paused, Finished, Live, Locked, and Error. |
| Panels | Soft SIMBA surface with restrained border, one clear title, predictable dismissal, and no nested panel maze. |

## 4. Presentation model

Video playback remains route-free and is hosted by `PlaybackOverlayHost`. The host owns presentation selection; the video controller owns playback policy; the native bridge owns mpv; V2 components render state and emit named commands.

| Presentation | Behavior |
|---|---|
| Expanded portrait | Full-height player surface using safe-area-context insets and edge-to-edge background coverage. |
| Expanded landscape | Immersive frame-first layout. Controls overlay the frame and respect cutouts. Orientation is a presentation decision, not a media reload. |
| Minimized | If the product supports a video mini-player, it is a compact frame thumbnail with Play/Pause, expand, and Close. It must not pause an actively playing item merely because the presentation changes. If video mini is not supported for a surface, the controller remains alive while the video presentation is hidden. |
| Picture-in-Picture | Native PiP entry preserves the current item, position, play intent, and system media actions. Leaving PiP restores the video surface without reloading. |
| Closed | Explicit Close/reset ends the session, clears active playback state, and releases native resources according to the controller lifecycle policy. |

The edge-to-edge rule is strict: the outer background extends behind system bars, while all interactive content is inset with `react-native-safe-area-context`. No fixed status-bar offset is permitted.

## 5. Full-player information architecture

### 5.1 Watching state

When controls are hidden, the frame is unobstructed except for unavoidable captions and a small state cue when buffering or seeking. A single tap reveals controls. A second tap on the frame pauses or resumes only when the controls are visible and the player is not locked. Double-tap left/right seeks by the configured interval and presents transient, non-blocking feedback.

### 5.2 Primary control layer

The primary layer contains the following order:

```text
[ back/minimize ]         title/context          [ lock ] [ more ]

                 video frame

[ elapsed ]  buffered + played progress / thumb  [ duration ]

[ previous ]       [ Play/Pause ]       [ next ]

[ captions ]   [ fullscreen ]   [ PiP when supported ]
```

The exact arrangement may adapt between portrait and landscape, but the semantic order must remain stable. The frame is never placed inside a white card solely to contain controls.

### 5.3 Secondary actions

More opens one focused action surface with grouped rows. No action is represented twice in the persistent control layer.

| Group | Actions |
|---|---|
| Playback | Speed, Audio track, Equalizer when supported |
| Accessibility | Captions, subtitle appearance, caption language |
| Content | Track information, Add to playlist, Share, Screenshot |
| Navigation | Chapters when available, Queue/Up next when a real next item exists |

Rows must be real commands or real navigation. Unsupported actions are omitted rather than displayed as dead controls.

## 6. Video state machine

The controller exposes a discriminated state model to the V2 adapter. Boolean flags may be derived for rendering, but the controller must not allow contradictory states such as `playing && ended` or `buffering && userPaused`.

| State | Meaning | Primary control |
|---|---|---|
| `idle` | No active video item | No player surface |
| `connecting` | URI accepted; native item is opening | Loading indicator, no false duration |
| `ready` | Media metadata is available but playback is not active | Play |
| `playing` | Native playback is advancing | Pause |
| `paused` | User intentionally paused | Play |
| `seeking` | Native seek is resolving, including remote range fetch | Play/Pause remains stable; seek feedback is visible |
| `buffering` | Playback is waiting for data or cache fill | Buffering cue; user pause is not implied |
| `finished` | Natural EOF in Play once mode | Play from beginning |
| `error` | Terminal native or validation error | Retry or close |
| `live` | Live stream without a stable duration | Live indicator; arbitrary seek is disabled unless a real DVR window exists |

Natural EOF is the only event that enters `finished`. Explicit stop, replacement, close, reload, or error must not be mislabeled as Finished.

```tsx
type VideoPlaybackState =
  | {kind: 'idle'}
  | {kind: 'connecting'; uri: string}
  | {kind: 'ready'; duration: number}
  | {kind: 'playing'; position: number; duration: number}
  | {kind: 'paused'; position: number; duration: number}
  | {kind: 'seeking'; target: number; position: number; duration: number}
  | {kind: 'buffering'; position: number; duration: number; reason: 'initial' | 'rebuffer' | 'remote-seek'}
  | {kind: 'finished'; position: number; duration: number}
  | {kind: 'live'; position: number; seekable: boolean}
  | {kind: 'error'; message: string; recoverable: boolean};
```

## 7. Seeking and buffered ranges

Seeking is a transaction owned by the controller and transport boundary. For VOD, the target is clamped to the known duration. For remote media, a seek outside the current buffered window issues a native seek on the same media item, displays Seeking/Buffering, and waits for native confirmation. It must not call `loadFile` or silently return to zero. For live media, the seek bar is enabled only when the native source reports a real seekable window.

Transport keeps canonical normalized ranges for the active item. The UI may render the range containing the playhead or the current contiguous window, but it must not discard valid transport data merely because an island is not currently visible. Ranges clear at the media-identity boundary (`onFileLoaded`) or explicit Close/reset, not on pause, fullscreen, minimize, PiP, or ordinary seek.

| Seek case | UI behavior |
|---|---|
| Buffered target | Immediate seek; no misleading loading overlay. |
| Unbuffered but seekable target | Native seek on the same item; Seeking/Buffering cue; resume according to prior user intent. |
| Target at buffer edge | Continue until cache stalls; show Buffering, hold position, and resume when data arrives. |
| Non-seekable/live target | Disable arbitrary seek and explain the limitation through an accessible label. |
| Failed seek | Keep the current item loaded, restore the last confirmed position, and show recoverable feedback; never reload the URI automatically. |

## 8. Playback policy and queue transitions

The controller is the only owner of repeat and transition policy.

| Mode | Natural EOF behavior |
|---|---|
| Play once | Stop at duration, enter Finished, show Play from beginning, retain current-item cache. |
| Repeat one | Restart the same item intentionally after EOF. |
| Repeat all | Resolve the next video item through the video transition service. |

Previous and Next use the active video lane and resolve the current index by URI when Redux metadata is stale. Previous restarts the current item after the restart threshold; otherwise it resolves the prior item. Next resolves queue/playlist order or returns an ended result when none exists. A video controller never inserts audio into a video lane.

## 9. Captions, audio tracks, and playback tools

Captions are a first-class viewing feature. The primary layer shows a captions state indicator when a track is active. More opens caption language and appearance controls. Caption styling must preserve contrast against the current frame and support size, color, background opacity, and position without making the control layer permanent.

Audio-track selection displays only native-discovered tracks, including language, title, codec where available, and selected state. Speed selection exposes a finite list of meaningful values and reflects the native speed after confirmation. Equalizer controls appear only when the native path supports them. Screenshot is a real operation with success/error feedback and never blocks the playback thread.

## 10. PiP, orientation, and lifecycle

PiP entry and orientation changes are presentation transitions. They must preserve the native item, position, playback intent, selected subtitle/audio tracks, and cache. The native video surface must not be recreated on ordinary control-state changes. Native resources are released only by explicit Close/reset or a real controller teardown, not by moving between full and compact presentation.

When a video screen is minimized or hidden, the controller remains mounted if the session remains active. If the product intentionally disables video continuation on a given host, that policy must be explicit and must call a named stop action—not be an accidental consequence of component unmounting.

## 11. SOLID ownership review

| Responsibility | Owner | Prohibited leakage |
|---|---|---|
| mpv commands and native events | `NativeMpvPlayer` / bridge | No UI policy or queue decisions |
| Position, duration, buffering, seeking, ranges, and native video parameters | `TransportContext` | No repeat or navigation policy |
| Loading, resume precedence, EOF, repeat, queue transitions, PiP policy | Video controller | No SVG, layout, or color decisions |
| Active item and expanded/mini/none presentation | `PlaybackContext` | No native seek or pause side effects during expansion |
| Mapping to V2 state | `VideoV2Module` adapter | No duplicated command implementations |
| Frame surface | Dedicated V2 surface primitive | No queue or panel ownership |
| Controls | Dedicated V2 control primitives | No direct Redux/native internals |
| Panels | Dedicated V2 action panels | No hidden playback reloads |

The V2 presentation must accept a typed view model and named commands. It must not receive an undifferentiated legacy hook object with unrelated panel state, gesture state, Redux internals, and native pointers mixed together.

## 12. Accessibility contract

Every icon-only action has a state-aware accessible label. The primary control says Play, Pause, or Play from beginning. Seeking exposes an adjustable role, current value, bounds, disabled state, and busy state. Captions expose selected language and visibility. Lock exposes whether controls are locked. PiP and fullscreen expose their current mode.

Interactive targets are at least 44 by 44 points, have visible pressed feedback, and remain reachable in portrait, landscape, large text, and high-contrast contexts. State is never conveyed by color alone. Captions remain readable over high-motion and high-contrast footage. Focus/traversal order is header, frame state, progress, transport, captions/fullscreen/PiP, then More.

## 13. V1 decoupling and implementation gates

The V1 presentation is inactive source only during migration and must not remain mounted or imported by Video V2. The V2 entry point should be the only active video presentation in `PlaybackOverlayHost` after cutover. Native surface infrastructure may be retained only when it is presentation-neutral and independently documented.

| Gate | Acceptance criterion |
|---|---|
| V2 isolation | No V1 UI/component/style/icon imports in `video/v2`. |
| Edge-to-edge | Header and controls clear status/navigation insets in portrait and landscape. |
| Open remote video | Frame renders, playback state advances, and errors are explicit. |
| Open local video | Permission/validation failures are actionable; valid files play. |
| Play/Pause | One command, native-confirmed state, no duplicate toggles. |
| Far seek | Same media item seeks to requested target; no reload to zero. |
| Buffering | Rebuffer state is distinct from user pause and resumes on data. |
| Buffered ranges | Honest range rendering; no false continuous bridge. |
| Finish Play once | Finished state and Play from beginning; no unintended replay. |
| Repeat one/all | Repeat behavior occurs only when selected. |
| Captions | Discover, select, toggle, and style real subtitle tracks. |
| Audio tracks | Discover and select real native audio tracks. |
| Speed | Native playback speed changes and UI confirms it. |
| Fullscreen/orientation | Presentation changes preserve item and position. |
| PiP | Entry/exit preserve item, position, play intent, and system controls. |
| More actions | Every displayed action works; unsupported actions are omitted. |
| Close | Explicit close releases session; minimize does not. |
| Accessibility | Labels, target sizes, state semantics, captions, and contrast pass. |
| Runtime acceptance | Controlled emulator tests pass; static checks and Android build pass. |

## References

[1]: https://developer.android.com/media/implement/surfaces/mobile "Android Developers — Media controls"

[2]: https://developer.apple.com/design/human-interface-guidelines/playing-video "Apple Human Interface Guidelines — Playing video"

[3]: https://www.w3.org/WAI/media/av/ "W3C WAI — Making Audio and Video Media Accessible"

[4]: https://developer.apple.com/documentation/avkit/avpictureinpicturecontroller "Apple Developer — AVPictureInPictureController"

[5]: https://developer.android.com/media/media3/exoplayer/hello-world "Android Developers — ExoPlayer playback"

[6]: https://developer.android.com/develop/ui/views/touch-and-input/gestures "Android Developers — Touch and gesture input"

[7]: https://developer.apple.com/design/human-interface-guidelines/accessibility "Apple Human Interface Guidelines — Accessibility"


## 14. Implementation status after the hardening pass

The first production-hardening pass is now implemented in the V2 source tree. The active overlay host renders `VideoV2Module`, and `video/v2` has no imports from the legacy video presentation directories. The new presentation is organized around a narrow controller port, a typed adapter/view model, a native surface primitive, a core control primitive, and independent action panels.

The V2 surface now includes a functional compact video presentation. The mini-player deliberately contains only the native frame, title/state, compact buffered seek bar, Play/Pause, Expand, and Close. Previous and Next remain available in the full player, where they have enough space for clear targets and directional recognition. This is an intentional hierarchy decision rather than a missing feature.

The More surface is progressive and stateful. It exposes Speed, Volume/Mute, Repeat, Shuffle when meaningful, native Audio Track choices when discovered, caption track selection, caption appearance, queue/up-next when populated, chapters when discovered, metadata, video-only playlist actions, Share, and Screenshot. The UI omits unavailable track, queue, chapter, and playlist rows instead of showing disabled-looking placeholders. Caption appearance currently provides size, text opacity, background opacity, and vertical position controls through the controller’s native mpv property path.

The hardening pass also corrected several architectural risks. The V2 adapter now consumes `useVideoV2Controller`, which explicitly selects its controller port instead of passing the full legacy hook result to presentation. Minimize and expand preserve the existing playback session and do not reapply stale one-time start-position intent. Surface taps reveal hidden controls first and then play or pause when controls are visible and unlocked. While playing, controls auto-hide after a short quiet interval; paused, buffering, finished, and locked states remain discoverable. Finished playback is represented by one primary Play-from-beginning action rather than a duplicate replay overlay.

The implementation is statically validated, but runtime acceptance remains intentionally open. Android and iOS manual testing must still confirm native surface attachment, local and remote playback, remote seeks outside the current buffer, cache/rebuffer recovery, EOF and repeat policy, queue transitions, native track changes, caption rendering, orientation, PiP, mini continuity, screenshot output, and explicit close teardown. The build and static gates must not be interpreted as proof of those device behaviors.

| Hardening decision | Result |
|---|---|
| Frame-first hierarchy | Full controls are quiet overlays; secondary actions are grouped in More. |
| Narrow-phone mini layout | Previous/Next removed from mini; Play/Pause, Expand, and Close remain. |
| Caption completeness | Track selection, visibility, size, opacity, background, and position are exposed through real controller actions. |
| Playlist integrity | Only video/movie entries can enter video-only playlists; immediate add-after-create uses live Redux state. |
| Surface interaction | Hidden controls reveal first; visible unlocked surface taps play/pause; locked taps reveal/unlock through the controller boundary. |
| Finished behavior | Natural EOF presents a single Play-from-beginning action and preserves the current session until explicit close or replacement. |
| Validation boundary | Static TypeScript, targeted ESLint, and Android debug build are complete; device acceptance is not claimed. |


## 15. Mini-to-full surface lifecycle rule

A Video V2 presentation change must not replace the native render view. The module owns one `VideoV2Surface` for the active video session, and the full and mini chrome layers render around that persistent surface. Fullscreen uses edge-to-edge geometry; mini uses a memoized compact rectangle. The surface remains mounted while the `PlaybackContext` presentation changes from `expanded` to `mini` or back.

This rule is required because the Android `MpvRenderViewManager` performs native surface cleanup when React Native drops a render view. Mounting a second render view while dropping the first can detach the mpv surface and reinitialize the video output during a presentation transition. The V2 implementation therefore changes layout and background treatment only, keeps the native view non-interactive so the chrome owns touches, and reserves surface teardown for explicit close or actual controller destruction.

| Transition requirement | V2 implementation |
|---|---|
| Native render continuity | One module-level `VideoV2Surface`; full and mini components contain no native render view. |
| Mini visibility | The mini preview is transparent over the persistent surface rather than an opaque placeholder. |
| Touch ownership | The persistent surface uses `pointerEvents="none"`; controls and mini actions receive interaction. |
| Layout stability | Compact surface geometry is memoized and changes only when safe-area geometry changes. |
| Teardown boundary | Native cleanup occurs only on explicit close or true module teardown, not on presentation change. |


## 16. Lifecycle audit and transition animation contract

The persistent Video V2 surface must have one clear owner and one clear teardown boundary. The module owns the native render view for the entire active video session. Full-player and mini-player components own only their respective chrome, controls, and panels. A presentation change must not create or destroy an `MpvRenderView`, reload media, or reset transport state.

The controller now treats delayed work and event registrations as explicit resources. Native event subscriptions, notification subscriptions, surface-attachment listeners, auto-advance intervals, loading fallbacks, thumbnail callbacks, resume-seek callbacks, seek-release callbacks, and overlay timers must either be removed at the event boundary or cancelled during controller teardown. The shared transport provider remains responsible for its own native event and property-observer cleanup.

The mini/full transition uses one persistent animated progress value. The surface interpolates between compact preview geometry and full-frame geometry; the full and mini chrome layers crossfade and switch pointer ownership according to the requested presentation. This provides a smooth visual transition without risking native surface handoff. The animation uses layout-safe values and stops an in-flight animation before starting the next transition.

| Requirement | Implementation rule |
|---|---|
| Surface ownership | `VideoV2Module` owns the only `VideoV2Surface` for the active session. |
| Surface teardown | Native cleanup occurs on actual view/module teardown or explicit close, never on ordinary mini/full changes. |
| Listener cleanup | Every video-controller subscription has an unsubscribe path; the one-shot surface listener is additionally held in a ref for cancellation. |
| Timer cleanup | All delayed callbacks that can touch native playback or controller state are held in refs or guarded by cancellation and mount state. |
| Animation continuity | One persistent `Animated.Value` interpolates surface geometry and chrome opacity; the native surface is not recreated. |
| Panel safety | Full-player More, playlist, and context panels close when full chrome becomes hidden. |
| Manual gate | Repeated expand/collapse, paused/playing transitions, EOF, buffering, PiP, and explicit close still require user device confirmation. |


## V3 clean-room redesign decision — 24 August 2026

Following manager review that the current player remains below professional quality, the next redesign is specified independently as **Video Player V3**. The complete new specification is in [`video player V3 UI UX.md`](./video%20player%20V3%20UI%20UX.md).

V3 is not a cosmetic continuation of V2. Before implementation, V3 will receive a new media-session port, state contract, presentation host, visual language, control hierarchy, and transition model. No V2 presentation file, icon, layout, style, loading treatment, panel structure, or interaction idea may be imported or copied into V3. The lower-level native mpv bridge and route-free playback identity may be reused only through newly designed, presentation-neutral adapters.

The V3 specification incorporates current research from Mux’s 2026 React Native player architecture, Netflix playback-UI performance findings, Android Media3 and PiP guidance, Apple’s Playing Video Human Interface Guidelines, and Huawei/HarmonyOS responsive and safe-area guidance. It defines six waves with 36 checkable steps, a Netflix-level content-first hierarchy, Cinema Obsidian media surfaces, explicit loading/buffering/error semantics, Huawei-aware responsive layout, native-truth state ownership, and a complete edge-case matrix.

**Status:** V3 specification complete; implementation intentionally not started until the clean-room boundary and product direction are accepted.
