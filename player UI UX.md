# SIMBA Audio Player V2 — UI/UX Specification

**Revision:** 2.0 — uncluttered 2026 listening experience  
**Date:** 23 August 2026  
**Scope:** Audio-only full player, mini-player, playback states, seeking, buffering, completion, queue transitions, repeat modes, volume/output interaction, accessibility, and presentation synchronization  
**Status:** Product direction for implementation review

## 1. Design decision

The previous proposal exposed too many secondary actions and used a full-width volume row that competed with the listening task. This revision changes the hierarchy rather than decorating the same layout.

The Audio V2 full player will have **one primary task surface**: identify the track, understand its current state, change its position, and control playback. The two high-frequency secondary actions, Save and Queue, remain immediately available in a compact primary-action row. Less-frequent actions such as Add to playlist, Lyrics, Info, and Share are progressively disclosed through one More/Actions surface. The volume control will become a compact output affordance that expands only during adjustment. The mini-player will remain a compact transport dock, not a second full player.

This direction follows current platform guidance. Apple recommends choosing toolbar items deliberately to avoid overcrowding, grouping actions logically, and moving less-important actions into a More menu on narrow screens [1]. Apple also recommends one or two prominent actions per view, familiar symbols, press feedback, and a minimum 44-point hit region [2]. Android derives system media actions from player state and distinguishes ended, buffering, ready, and paused states [3]. Progressive disclosure keeps essential content visible while making advanced functions available on request [4].

> “Choose items deliberately to avoid overcrowding.” — Apple Human Interface Guidelines, Toolbars [1]

> “In general, use a button that has a prominent visual style for the most likely action in a view.” — Apple Human Interface Guidelines, Buttons [2]

> “Starting in Android 13 (API level 33 ...), action buttons on media controls are derived from the Player state.” — Android Developers [3]

## 2. Product principles

| Principle | SIMBA interpretation |
|---|---|
| Listening first | The track, position, and Play/Pause action receive the visual emphasis. |
| Progressive disclosure | Infrequent actions live behind one More/Actions surface, not a seven-item permanent strip. |
| One primary action | Play/Pause is the only dominant filled control on the full player. |
| State truth | UI state is derived from native transport state and explicit controller state, not optimistic visual guesses. |
| Presentation continuity | Mini/full changes only visibility; it never creates a new playback request. |
| Honest buffering | Only real buffered data is represented; meaningful cache gaps are never painted over. |
| Familiar semantics | Previous points left, Next points right, Play is a right-facing triangle, Pause is two vertical bars. |
| Calm density | Fewer groups, fewer borders, fewer labels, and stronger spacing hierarchy replace decorative complexity. |
| Accessibility by construction | Labels, hit areas, focus order, busy state, and non-color state cues are part of the component contract. |

## 3. SIMBA visual system

The palette must match the existing SIMBA theme instead of introducing unrelated blue, neon, or generic dark-player styling. Light mode uses warm ivory/cream as the page surface, elevated cream or soft white as the player surface, charcoal for primary text, warm slate for secondary text, deep slate for buffered data, and mustard-gold for active playback.

| Role | Treatment | Avoid |
|---|---|---|
| Page | Warm ivory or theme background | Flat hospital white or unrelated gray. |
| Player surface | Soft elevated cream with restrained border/shadow | Heavy glass, excessive blur, or black card on an ivory app. |
| Primary text | Charcoal, high contrast | Low-contrast gray titles. |
| Secondary text | Warm slate | Too many competing text weights. |
| Active accent | SIMBA mustard-gold | Blue/purple accent drift. |
| Buffered range | Deep slate neutral, visibly darker than the base track | Pale gray that disappears or gold that competes with played progress. |
| Secondary controls | Monochrome charcoal/slate icons | Individual colored icons for every action. |

The visual language is contemporary because hierarchy comes from spacing, weight, and state—not from large glossy circles, gradients, ornamental borders, or a row of text-labelled utilities. Album artwork may be expressive; the transport system remains stable and neutral.

## 4. Full-player layout

The full player is a vertically scrollable listening surface with a stable header and a single main content card. The layout must adapt to compact Android screens by reducing artwork size before compressing the primary transport.

### 4.1 Header

The header contains a circular down-chevron control at the leading edge, a centered two-line context label, and one overflow button at the trailing edge. The down-chevron means **Minimize player** in the overlay context. It must not be confused with a navigation back action. The header does not display the app name as the only title; the contextual title “Now playing” remains visible.

```text
[ down chevron ]          SIMBA AUDIO
                            Now playing          [ more ]
```

Header controls are visually quiet. No persistent Save, Share, Queue, Lyrics, or Playlist icons are placed beside the title.

### 4.2 State and identity

Below the header, show one concise state row: Playing now, Paused, Seeking, Buffering, Finished, Connecting, or Playback error. A source badge such as API or Local is optional and visually subordinate.

Artwork is the main identity anchor. Under it, show title, artist, and one metadata line such as album or source. The heart/bookmark action is optional only if it is a genuinely frequent product action; otherwise it belongs in More. It must not appear as a second dominant action.

### 4.3 Progress and transport

The progress system is the main interaction surface after Play/Pause. It contains elapsed time, duration, played progress, current buffered window, and a thumb. The visible bar must be dark enough to distinguish buffer from the base track while preserving gold for played progress.

The transport row contains exactly five controls in this order:

```text
[ rewind 10 ] [ previous ] [ Play/Pause ] [ next ] [ forward 10 ]
```

The center control is a moderate, balanced 64 px target. It is prominent through filled gold treatment, not excessive size. Previous and Next use correct directional geometry and remain monochrome. Rewind and Forward use circular-arrow symbols with a clear 10-second semantic.

### 4.4 Mode and output controls

Playback mode is represented by one compact control showing its current value: **Play once**, **Repeat one**, or **Repeat all**. Tapping it opens a single-choice popover or sheet. The selected mode uses gold emphasis; the other modes remain neutral.

Shuffle is a separate compact toggle only when the active lane has a meaningful multi-item order. It should not be shown as a large labelled button beside repeat when shuffle is unavailable or irrelevant.

Volume is not a permanent full-width row. The resting state is a compact output control placed below the transport, for example:

```text
[ speaker ]  Volume                         [ output/route ]
```

Tapping the speaker/output control opens a small anchored control surface containing the volume slider and, when supported, output-route selection. The percentage is not shown by default. While the user is actively adjusting volume, the slider and optional percentage appear in the temporary surface; after dismissal, the player returns to the compact output affordance. This reduces visual noise and avoids making volume look like a second progress bar.

### 4.5 Secondary actions

The persistent seven-item action strip is removed. Save and Queue remain as two compact actions beneath the playback modes because they are frequently needed during listening. More/Actions opens one contextual surface with the following grouped choices:

| Group | Actions |
|---|---|
| Library | Add to playlist |
| Navigation | Open lyrics |
| Information | Track information, Share |

Queue may also be represented by a small **Up next** summary card when there is an actual next item. If the queue is empty, show a compact empty state without dummy tracks. The surface must use one level of disclosure, a clear title, a close affordance, and return attention to More when dismissed.

## 5. Mini-player layout

The mini-player is a transport dock that remains visible over app content. Its job is to preserve continuity and expose only the most common actions.

```text
[ artwork + title + state ] [ expand ] [ Play/Pause ] [ close ]
[ previous ]          progress / current time          [ next ]
```

The track-information region and every control are separate hit targets. The track region and the explicit expand button both call `expandPlayer()`; neither creates a new playback request. Play/Pause, Previous, Next, and Close cannot be nested inside the expand Pressable.

The mini-player uses the same theme tokens as the full player. It does not use a hardcoded black surface or a second accent color. Its buffered strip uses the same current-window selector as the full player, so the two surfaces never disagree about what is actively buffered.

| State | Mini-player presentation |
|---|---|
| Playing | Gold activity dot, Pause icon, concise Playing label. |
| Paused | Muted dot, Play icon, Paused label. |
| Seeking | Gold busy cue, current position preserved, no false completion. |
| Buffering | Distinct busy cue, position held, no user-pause wording. |
| Finished | Muted dot, Finished label, Play icon labelled Play from beginning. |
| Error | Muted danger cue and expansion/retry path; no automatic reload loop. |

Closing is different from minimizing. Minimize preserves the session. Close/reset ends the active session according to playback policy and is the only presentation action allowed to clear the active session state.

## 6. State-management contract

The component state model uses four independent boundaries:

| Boundary | Owns |
|---|---|
| Native bridge | mpv properties, events, and commands. |
| TransportContext | Position, duration, playing, buffering, seeking, ended, seekability, and canonical cache ranges. |
| Audio controller | Load lifecycle, resume precedence, Play once/repeat policy, queue transitions, and user intent. |
| PlaybackContext | Active item identity and `mini`/`expanded` presentation. |
| V2 adapter | Maps controller and transport into the view model. |
| V2 views | Render state and emit named commands. |

The views must not call `loadFile`, inspect Redux queue internals, or calculate next/previous semantics. The controller must not own SVG geometry or spacing. The transport provider must not decide whether a finished item should repeat.

### 6.1 Completion state

`isEnded` is an explicit state. It is set only from natural EOF for the current item and reset on a new file, a seek away from the endpoint, or intentional playback restart.

```tsx
const [isEnded, setIsEnded] = useState(false);

const onEndFile = ({reason}: {reason: number}) => {
  if (reason !== 0) return;
  setIsPlaying(false);
  setIsEnded(true);
  dispatch(setPlaybackState('stopped'));
};

const onFileLoaded = () => {
  setIsEnded(false);
  setBufferedRanges([]);
};

const onSeeking = ({seeking}: {seeking: boolean}) => {
  setIsSeeking(seeking);
  if (seeking) setIsEnded(false);
};
```

The primary action is then deterministic:

```tsx
const primaryLabel = isPlaying
  ? 'Pause'
  : isEnded
    ? 'Play from beginning'
    : 'Play';

const primaryIcon = isPlaying ? 'pause' : 'play';
```

After Play once reaches EOF, the native item remains loaded at its duration. Reopening the mini-player does not call `loadFile`, does not consume a recent-history checkpoint, and does not schedule a fallback resume. Pressing Play after Finished explicitly seeks to zero and resumes.

### 6.2 Mini/full expansion synchronization

`startPosition` is an initial open intent, not current playback state. It must be cleared when the full player collapses so it cannot be reused during mini expansion.

```tsx
const collapsePlayer = useCallback(() => {
  setActive(current => current
    ? {...current, presentation: 'mini', startPosition: undefined}
    : current,
  );
}, []);

const canReuseLoadedItem = !startPosition && currentFile?.uri === fileUri;

if (canReuseLoadedItem && MpvPlayer.getPlaybackState() !== 'idle') {
  setIsReady(true);
  setIsLoading(false);
  setResumePrompt(null);
  // Reuse native position, ended state, play intent, and cache.
} else {
  MpvPlayer.loadFile(fileUri);
}
```

The root overlay owns one provider around both presentations:

```tsx
<TransportProvider>
  {presentation === 'mini'
    ? <MiniAudioV2 />
    : <AudioV2Module active={active} />}
</TransportProvider>
```

### 6.3 Buffer retention

Transport stores the canonical normalized range list for the current native item. It clears the list only after `onFileLoaded`, which is the media-identity boundary. Pause, natural EOF, seeking, buffering, collapse, and expansion do not clear it.

For rendering, the full and mini progress primitives select the current contiguous window containing the playhead. This hides disconnected forward islands from the user-facing bar without discarding transport data. A gap remains a gap; the UI never paints from zero to the furthest cached endpoint and never creates a fake range at the seek target.

## 7. Repeat and queue behavior

The user-facing mode vocabulary is explicit:

| Mode | Natural EOF behavior |
|---|---|
| Play once | Stop at duration, set Finished, show Play from beginning. |
| Repeat one | Restart the current item intentionally. |
| Repeat all | Resolve the next audio item through the queue/playlist transition service. |

The controller is the policy owner. Native loop flags are synchronized defensively, and both `loop-file` and `loop-playlist` are cleared before enabling one selected mode. This prevents stale native flags from replaying the wrong item.

Previous and Next are commands, not view calculations. Previous restarts the current item when the playhead is past the restart threshold; otherwise it resolves the previous audio item. Next resolves the next queue/playlist item or returns an ended result when none exists. Audio and video lanes remain separate.

## 8. Accessibility and interaction quality

Every icon-only control has a state-aware accessible label. The primary button uses Play, Pause, or Play from beginning. Previous and Next use their action names, not “left arrow” or “right arrow.” Seeking exposes an adjustable role, current value, min/max values, disabled state when the item is not seekable, and busy state while Seeking or Buffering.

All controls have a minimum 44 by 44 point hit region, visible pressed feedback, and enough spacing to avoid accidental activation [2]. The visible icon can be smaller than the hit target. State is never conveyed through color alone: Finished has a label and Play icon; Buffering has a busy state and label; repeat selection has a selected semantic state and text.

The focus/traversal order is header, state, artwork identity, progress, transport, mode, output, More/Actions. The More surface closes predictably and returns attention to the More control. There is no nested action-strip maze and no duplicate access path for the same secondary action.

## 9. Responsive behavior

On compact devices, the player prioritizes in this order: header, title/artist, progress, primary transport, mode/output, then secondary actions. Artwork reduces before transport controls become cramped. Secondary actions remain available through More even when they move below the fold.

The mini-player remains above the bottom safe-area inset. The full player uses safe-area padding and scrolls only secondary content when necessary. The design must remain readable with large text settings and must not rely on artwork brightness to maintain control contrast.

## 10. Acceptance matrix

| Test | Acceptance criterion |
|---|---|
| Open remote item | Audio starts or presents a clear Connecting state; position advances. |
| Pause/resume | Native playback stops and resumes without reloading the URI. |
| Remote far seek | One current-item seek; Seeking/Buffering feedback; no restart at zero. |
| Cache edge | Buffering is distinct from user pause and position remains stable. |
| Disconnected ranges | Transport retains real ranges; UI hides disconnected forward islands and never paints a false bridge. |
| Collapse/expand | Same native item, position, ended state, user intent, and cache. |
| Play once EOF | Finished state at duration with Play icon; no automatic replay. |
| Finished mini → full | Full player opens at duration with Finished and Play; no stale resume position. |
| Play after Finished | Explicit seek to zero followed by resume. |
| Repeat one | Same item restarts only when selected. |
| Repeat all | Next audio item resolves through the transition service. |
| Play once no next item | No replay and no unintended same-URI reload. |
| Secondary actions | Save and Queue are immediately available; Add to playlist, Lyrics, Info, and Share are discoverable through one More/Actions surface without permanent strip clutter. |
| Volume | Compact at rest; expanded only during adjustment; no childish full-width percentage row. |
| Mini controls | Expand, Play/Pause, Previous, Next, and Close each fire their own action. |
| Accessibility | Labels, 44-point targets, pressed state, busy state, and logical traversal are present. |
| Lane integrity | Audio player and queue contain audio items only. |

## 11. Implementation order

Implementation must follow the product hierarchy. First preserve native state correctness and current-track cache. Second stabilize presentation-only mini/full synchronization and completion. Third replace the persistent action strip with the single More/Actions surface. Fourth replace the full-width volume row with the compact output interaction. Fifth validate compact and tall devices. Motion polish is last and must remain subtle; animation cannot compensate for unclear hierarchy or broken commands.

The player is ready for release only when it feels calm during ordinary listening, remains understandable at EOF, and never makes the listener recover from a layout or state mismatch. A screenshot is not acceptance. The runtime state, touch behavior, cache truth, and system-control semantics must agree.

## 12. Implementation revision 2.1

The revised direction is represented by dedicated V2 primitives rather than by adding more conditional markup to the player screens.

| Component | Responsibility |
|---|---|
| `AudioV2MiniProgress.tsx` | Owns the mini-player seek hit target, width measurement, accessible adjustable semantics, current-window buffered rendering, and pending/busy thumb treatment. It emits a fraction and does not load media. |
| `AudioV2PriorityActions.tsx` | Keeps only Save and Queue immediately available on the full player. It does not know about Redux, native mpv, or queue resolution. |
| `AudioV2OutputControl.tsx` | Keeps volume compact at rest and reveals the existing volume adjustment primitive only while the user requests it. It does not invent output-route data. |
| `AudioV2TransportControls.tsx` | Keeps the full-player Previous / Play-Pause / Next / Rewind / Forward contract consistent and state-aware. |
| `MiniAudioV2.tsx` | Renders artwork and identity, a dedicated corner Expand and Close pair, one grouped Previous / Play-Pause / Next row, and the interactive mini seek bar. |
| `AudioV2Player.tsx` | Renders the full-player hierarchy with Save and Queue as priority actions and less-frequent actions inside More/Actions. |

The mini-player progress bar is a real `Pressable` with an adjustable accessibility role. Its visual track contains the normalized current buffered window and played fill; it no longer uses `pointerEvents="none"`. A seek gesture calls the transport seek boundary without creating a new media item or changing presentation state.

The full and mini layouts now follow a simpler 2026 hierarchy: one prominent action, one compact mode control, two high-frequency secondary actions, and one progressive-disclosure surface. This satisfies the product requirement to reduce clutter while keeping Save and Queue quick to reach.

## 13. Runtime correction revision 2.2

The implementation now enforces the edge-to-edge and continuity requirements that were missing from the first visual pass.

| Correction | Required behavior |
|---|---|
| Edge-to-edge header | The full player uses the safe-area-context `SafeAreaView` with explicit top and bottom edges. Header content begins below the status-bar inset instead of relying on a fixed top margin. |
| Surface treatment | The player is no longer presented as a large white card inside another page. The full player uses the page surface directly, with the artwork and controls forming the visual hierarchy. |
| Mini-player continuity | `AudioV2Module` remains mounted while MiniAudioV2 is visible. The overlay changes visibility/presentation only, so the controller, native session, playback intent, and cache remain alive. |
| Minimize behavior | `handleGoBack` records recent position but does not call pause, stop, notification shutdown, or any other playback command. An actively playing track continues playing under the mini-player. |
| Volume | `AudioV2Volume` measures its actual track width and responds to press, touch-start, and touch-move positions. It converts the pointer location to a 0–100 target and sends only the required delta to the controller/native setter. |
| Full-player priority actions | Save and Queue remain available as two compact actions; the former seven-item strip is not restored. |

The result is intentionally flatter and quieter than the previous screenshot: the page is the surface, artwork is the content anchor, transport is the only dominant control, Save and Queue are compact utilities, and volume is an on-demand adjustment surface. Runtime acceptance must confirm that edge-to-edge insets, active playback during minimize, volume movement, and mini-player seeking all work on the emulator.

## References

[1]: https://developer.apple.com/design/human-interface-guidelines/toolbars "Apple Human Interface Guidelines — Toolbars"

[2]: https://developer.apple.com/design/human-interface-guidelines/buttons "Apple Human Interface Guidelines — Buttons"

[3]: https://developer.android.com/media/implement/surfaces/mobile "Android Developers — Media controls"

[4]: https://ixdf.org/literature/topics/progressive-disclosure "Interaction Design Foundation — Progressive disclosure"

[5]: https://developer.apple.com/design/human-interface-guidelines/playing-audio "Apple Human Interface Guidelines — Playing audio"

[6]: https://www.w3.org/WAI/media/av/ "W3C WAI — Making Audio and Video Media Accessible"

[7]: https://ux.redhat.com/elements/audio-player/accessibility/ "Red Hat Design System — Audio player accessibility"
