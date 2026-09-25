# SIMBA Player Module — V19 Specification: Cinematic Video Player

**Author:** Senior dev review (pavalep + AI pair) · **Date:** 2026-09-25
**Status:** Draft for review — supersedes V18's "shit" video UI
**Builds on:** V12 native layer (libmpv + MpvBridgeModule), V18 API adapter layer, V11/V2 player UX lessons

> **Architecture source of truth:** `md/SIMBA_PLAYER_V19_ARCHITECTURE_AUDIT.md` (29.4 KB). Every architectural decision in this SPEC traces to a section of that audit. The audit enumerates the 10 mistakes in the V19 SPEC draft and the 10 architectural decisions that V19 locks in. **Read the audit first** if you want the rationale. This SPEC has been corrected against the audit's findings; the §2.1 isolation contract, §3 chrome primitives, §5 API surface, §6 state machine, §9 system integration, §10 acceptance matrix, §12 out-of-scope, and §13 references all reference back to it.

---

## 0. Purpose - and what this is fixing

V18 shipped a working V12-native video player stack (libmpv loads files, the JNI bridge reaches mpv, the Internet Archive streams land in the bridge), but the **consumer-side video UI** is still the V11 ad-hoc throwback — 6 placeholder `useState` hooks, four `TouchableOpacity` press-only handlers, a seek bar with `pointerEvents="none"` (the exact anti-pattern V11 specifically called out as wrong in commit `f3c7f84a`), and no buffered-range, mini-player, or state-boundary discipline. The manager review ("current UI is shit") and the V11/V2 reference doc ("average, but better") are the diagnostic. **V19 rewrites the video UI from scratch on top of the new native layer**, inheriting the V11/V2 visual hierarchy + acceptance matrix + state-boundary contract, while extending it to video (aspect ratio, captions, full-screen, PiP, scrubbing during playback).

V19 is also the chance to retire three legacy MVPs:

| Legacy MVP | V19 replacement | Reason |
|---|---|---|
| `NowPlayingScreen` (17.3 KB, monolithic, 6 placeholder states) | Decomposed into `usePlaybackSurface`, `useTransportBar`, `useVideoStateMachine`, video-only primitives | Ant-Pattern: a screen that knows every layer |
| `pointerEvents="none"` on the seek track inside a press-only `TouchableOpacity` | Real `Pressable` with `accessibilityRole="adjustable"` + `onPanResponderMove` + visible thumb + clean idle state | Per f3c7f84a revision 2.2 — seek is a gesture, not a tap |
| Buffered range = invisible / missing | `BufferedRangeFill` derived from canonical mpv `demuxer-cache-range` events, normalized to the current contiguous window containing the playhead | The defining visual difference between a streamer and a video player |

The endpoint is **a video player whose runtime state, touch behavior, cache truth, and system-control semantics agree** — not a screenshot.

### 0.1 The gap matrix — what V11/V2 had, what V18 broke, what V19 ships

| Capability | V11/V2 (audio, "average") | V18 (video, "shit") | V19 (target) |
|---|---|---|---|
| Volume control | ✅ Compact output affordance (V11 §4.4) | ⚠️ Permanent row + 4 emoji icons + hardcoded "70%" label | ✅ Compact at rest + vertical-swipe gesture + proper icon set + no permanent percentage label |
| Scrub preview thumbnails | ❌ N/A (audio) | ❌ Missing | ✅ Netflix-style: thumbnail + timestamp on seek-touch |
| Buffered range fill | ✅ Deep slate (V11 §6.3) | ❌ Missing | ✅ Deep slate via canonical mpv `demuxer-cache-range` |
| Tap-anywhere-to-show-chrome | ❌ (audio always shows) | ❌ Missing | ✅ Tap on frame toggles chrome |
| Chrome auto-hide 3s | ❌ | ❌ Missing | ✅ 3 s on `playing`; stays on `paused`/`buffering`/`error` |
| Tap-to-play/pause on frame | ❌ (button only) | ❌ Missing | ✅ Single tap on frame |
| Double-tap zones ±10s | ❌ | ❌ Missing | ✅ Left half = -10s, right half = +10s, ripple + label |
| Vertical-swipe volume gesture | ❌ | ❌ Missing | ✅ Left half = volume, right half = brightness |
| Long-press 2× speed preview | ❌ | ❌ Missing | ✅ Hold finger to preview at 2×, release to restore |
| Subtitle/caption toggle | ❌ N/A (audio) | ❌ Missing | ✅ Track list sheet, renders only when tracks exist |
| Playback speed selector | ❌ | ❌ Missing | ✅ 0.5× / 1× / 1.25× / 1.5× / 2× |
| Quality selector | ❌ | ❌ Missing | ✅ Auto / native mpv `video-quality` options |
| Sleep timer | ❌ | ❌ Missing | ✅ 15 / 30 / 60 / Off (YouTube/VLC pattern) |
| Mini ↔ full sync | ✅ (V11 §5) | ❌ Missing | ✅ Presentation-only toggle, native session preserved |
| Repeat modes | ✅ (V11 §7) | ❌ Missing | ✅ Off / Repeat one / Repeat all |
| System PiP | ❌ (audio) | ❌ Missing | ✅ Android activity PiP — no app collapse |
| Pressable seek with `adjustable` role | ✅ (V11 §13 fix) | ❌ `TouchableOpacity` + `pointerEvents="none"` | ✅ Real `Pressable` + `accessibilityRole="adjustable"` + `onPanResponderMove` |
| SVG icon set | ✅ | ❌ Raw emoji (◀◀⏸▶▶▶♫🔊) | ✅ lucide / Phosphor / custom SVG — no emoji |
| 5-category error classifier | ✅ | ⚠️ Partial | ✅ Network / Unsupported / Blocked / Expired / Codec |
| 1-import + 1-wrapper surface | ✅ (audio) | ❌ 3 hooks + 4 type guards | ✅ `SimbaPlayer` + `usePlayerActivity` |

**Manager bar:** V19 lands every row's right-hand column. If we ship a row at the middle column, that's a regression. If we ship a row at the left column when the right column is achievable in a wave, that's a missed "impress management" opportunity.

### 0.2 The 2026 research pass — what the accessibility-first and podcast-first communities surfaced

These rows are not in V11/V2 (audio-only) or V18 (video "shit" baseline). They come from this research pass and are folded into the V19 target column.

| Capability | Reference | V19 target |
|---|---|---|
| **Subtitles vs CC vs SDH distinction** (legally distinct — FCC/CVAA/AVMSD/EAA) | [Vexascribe 2026 guide](https://vexascribe.com/what-are-captions), [Rev SDH guide](https://www.rev.com/blog/sdh-subtitles-for-the-deaf-and-hard-of-hearing) | ✅ Track metadata carries `kind: 'subtitle' \| 'caption' \| 'sdh'`; UI labels as "English (Subtitles)" vs "English [CC]" vs "English [SDH]" |
| **Caption customization** (font size, color, background, position) — Apple TV pattern | [WAI media player guide](https://www.w3.org/WAI/media/av/player/), [Fora Soft accessibility stack](https://www.forasoft.com/learn/audio-for-video/articles-audio/accessibility-captions-audio-description-stack) | ✅ Font size + background opacity + position (top/bottom); persists via AsyncStorage |
| **Audio description track** (WCAG 1.2.5 AA — *required* at AA for prerecorded video) | [WAI 1.2.5](https://www.w3.org/WAI/WCAG22/Understanding/audio-description-prerecorded) | ✅ Separate `audioDescriptionTracks[]` selector in More sheet; when AD active, mixer routes AD into mpv's audio output alongside main track |
| **Interactive transcript** (WCAG AAA but Netflix/YouTube pattern) | [WAI Transcripts](https://www.w3.org/WAI/media/av/transcripts/) | ✅ Captions file rendered as scrollable text; current phrase highlighted; tap → seek. In More sheet under "Transcript" group |
| **Skip silence** (podcasts — `#1 most-requested` podcast UX) | [mpv-skipsilence](https://github.com/ferreum/mpv-skipsilence), [vantezzen/skip-silence](https://github.com/vantezzen/skip-silence) | ✅ Toggle in More sheet (default OFF); wired to mpv `af-add=scaletempo2=max-speed=32.0` filter |
| **Reduce motion respect** (WCAG 2.3.3 AAA) | [Apple Reduce Motion](https://www.apple.com/accessibility/features/) — "decrease the movement of onscreen elements" | ✅ Queries `AccessibilityInfo.isReduceMotionEnabled()`; disables ripple animations, scrub preview fade-in, long-press transition; auto-hide chrome becomes instant (no fade) |
| **Dim Flashing Lights** (iOS 17+ feature) | [Apple Dim Flashing Lights](https://www.apple.com/accessibility/features/) — "automatically darkens the video display when flashes or strobe effects are detected" | ✅ Surface only (lib passes through; player UI renders a small "flashing lights detected" badge when system reports it). Not a player feature per se but we surface the badge |
| **D-pad / external keyboard** (Android TV / CarPlay / Bluetooth keyboards) | [Android TV controllers](https://developer.android.com/training/tv/get-started/controllers) — KEYCODE_DPAD_*, MediaSession `play()`/`pause()`/`fastForward()` mapping | ✅ `MediaSession` wired to all transport commands; chrome focus order is left-to-right, top-to-bottom; visible focus ring |
| **Smart resume prompt** (Netflix/YouTube pattern) | [Panda Video resume](https://www.pandavideo.com/features/resume-playback), [YouTube Resume](https://chromewebstore.google.com/detail/youtube-resume/ofjdhidbckonobbcgogkmgkjniopcjkh) | ✅ Reopen at 30%+ watched → "Resume from 12:34?" with thumbnail; <30% → play from 0; 95%+ → "Restart" prompt |
| **Post-play next-up overlay** (Netflix pattern) | [Puneet Patwari on Skip Intro](https://www.linkedin.com/posts/puneet-patwari_a-candidate-interviewing-for-l5-netflix-activity-7468285281444548610-JElU) (related: up-next overlay) | ✅ 10s before EOF, show "Up next: <title>" overlay with countdown; user can cancel or play-now |
| **Skip-prev smart threshold** (Apple Music / Spotify) | [Think Design 10 Principles](https://think.design/blog/how-to-design-a-media-player/) — "give users precise control over time navigation" | ✅ If position > 3s → prev restarts current; <3s → prev goes to previous item. Threshold configurable in More |
| **Haptic feedback** (iOS Taptic Engine) | [Apple HIG](https://developer.apple.com/design/human-interface-guidings/) | ✅ Subtle haptic on play/pause/skip (iOS only); toggle in More; default ON |
| **Network change handling** | [Think Design 10 Principles](https://think.design/blog/how-to-design-a-media-player/) — performance + reliability | ✅ Wifi → cellular → offline detection; pause + "Continue on cellular data?" prompt; auto-resume on reconnect |
| **WCAG 2.2 AA floor** | [WCAG 2.2](https://www.w3.org/TR/WCAG22/) — 1.2.x captions/AD, 2.1.1 keyboard, 2.2.2 pause, 2.3.1 three-flash, 2.4.7 focus, 2.5.8 target-size | ✅ All controls keyboard-reachable, ≥24×24 px hit areas (44×44 pt on mobile), no flashes >3 Hz, focus ring visible, pause controls on all auto-playing content |
| **Auto-play next toggle** (user-agency-first) | [Think Design](https://think.design/blog/how-to-design-a-media-player/) — "never skip automatically without consent" (Puneet Patwari) | ✅ Toggle in More sheet; default OFF; post-play countdown only runs when ON |

**Subtitles/CC/SDH — the legal distinction we missed:**

| Track type | For whom | Includes | Legal status | Streaming format |
|---|---|---|---|---|
| Subtitles | Hearing viewer, foreign language | Dialogue only | Not legally required | WebVTT / IMSC |
| Closed Captions (CC) | Deaf / hard of hearing, same language | Dialogue + speaker IDs + sound effects + non-speech | **Required** in US (FCC 47 CFR §79.1, CVAA, ADA case law), UK (Ofcom), EU (AVMSD, EAA effective 28 Jun 2025) | CEA-608/708 broadcast, WebVTT for streaming |
| SDH | Deaf / hard of hearing, often translated | Same as CC but delivered via subtitle track | Where legal framework applies to online video (most) | WebVTT / IMSC |

V19 labels tracks correctly per the source's actual format. We do NOT collapse "English (Subtitles)" and "English [CC]" into one — that's a WCAG 2.2 §1.2.2 violation.

---

## 1. Product principles (inherited + tightened)

| # | Principle | SIMBA interpretation |
|---|---|---|
| 1 | **Media first, chrome last** | The video frame is the product. Chrome is transient, low-contrast, and vanishes within ~3 s of inactivity. |
| 2 | **One primary action** | The Play/Pause primary is the only dominant filled control on the full player. Everything else is text-tertiary or quiet-icon. |
| 3 | **Progressive disclosure** | Two high-frequency secondary actions are inline (the mode control + the captions toggle); the rest live behind exactly one More/Actions surface. |
| 4 | **State truth, never optimistic** | The UI renders native transport state. The view never invents duration, never paints a buffered bar to the seek target, never shows "Play" while mpv is `pause` from a native error. |
| 5 | **Presentation continuity** | Mini ↔ full is one presentation change, not a new playback. The native session, position, cache, and ends state are preserved across the toggle. |
| 6 | **Honest buffering** | Only real cached ranges are painted. Forward islands beyond the playhead are hidden, not bridged. Genuine gaps stay visible until the cache catches up. |
| 7 | **Calm density** | The original V18 was a single 17 KB file. V19 replaces it with a layered directory whose composing primitives are individually small and individually re-readable. |
| 8 | **Accessibility by construction** | 44-pt minimum hit targets, state-aware labels, logical focus order, disabled + busy states on every transport control, no color-only cues for play/pause/buffering. |
| 9 | **Safe-area first** | Every chrome surface uses `react-native-safe-area-context` insets. Status bar + home indicator on the full player are explicitly reserved, not implicit. |
| 10 | **Aspect-ratio truth** | The video frame preserves source ratio. Letterboxing is rendered, never cropped. |

---

## 2. The state-boundary contract (the keystone)

V11's `player UI UX.md` §6 named four boundaries, but the V18 audio rewrite did not enforce them on the video side. V19 codifies the contract into a five-boundary diagram and forbids cross-boundary calls. The contract compiles to a single rule: **a layer reaches outward (toward view) for state and inward (toward native) for commands; never sideways.**

```
┌────────────────────────────────────────────────────────────────┐
│                   Native (libmpv via MpvBridgeModule)        │
│  • mpv properties + events (`time-pos`, `duration`,         │
│    `pause`, `demuxer-cache-range`, `track-list`, `eof-reached`)│
│  • Commands: loadFile, play, pause, seek_absolute, setProperty │
└────────────────────────────────────────────────────────────────┘
                            ▲              │
                  property  │              │ command
                  events    │              │ calls
                            │              ▼
┌────────────────────────────────────────────────────────────────┐
│                TransportContext (the source of truth)         │
│  Owns: positionMs, durationMs, isPlaying, isBuffering,        │
│  isSeeking, isEnded, bufferedRanges[], seekability,           │
│  normalizedWindow{start,end} containing the playhead.           │
│  Normalizes raw mpv events; never invents state. Clears          │
│  bufferedRanges[] only on `onFileLoaded` (media-identity         │
│  boundary); never on pause / EOF / seek / collapse / expand.    │
└────────────────────────────────────────────────────────────────┘
                            ▲              │
                  useTransport │              │ useTransportCommands
                   (read-only)  │              │ (command-issuing)
                                │              ▼
┌────────────────────────────────────────────────────────────────┐
│                PlaybackContext (active item + presentation)  │
│  Owns: {itemId, kind: 'video' | 'audio', presentation:        │
│  'mini' | 'expanded', startPositionMs? (open intent only)}.     │
│  Never owns range data, never owns commands, never owns native  │
│  session. `startPositionMs` is cleared on collapse so it can't   │
│  be re-applied as a "remembered position" on the next expand.  │
└────────────────────────────────────────────────────────────────┘
                            ▲              │
                  usePlayback()│              │ usePlaybackCommands
                                │              ▼
┌────────────────────────────────────────────────────────────────┐
│                VideoController (the orchestrator)            │
│  Owns: loadFile lifecycle, resume precedence, finish policies, │
│  repeat-one mode, queue transitions, video↔audio lane         │
│  integrity (audio queue never returns video and vice versa),    │
│  error classification (network / unsupported / blocked /         │
│  expired / codec).                                              │
│  Never owns SVG geometry. Never owns colors. Never knows about │
│  React. The view just listens.                                  │
└────────────────────────────────────────────────────────────────┘
                            ▲              │
                  useVideoStateMachine                              │
                                │              ▼
┌────────────────────────────────────────────────────────────────┐
│                       Views (chrome)                          │
│  • `VideoSurface.tsx`           — frames the native SurfaceView │
│  • `TransportBar.tsx`           — seek + skip + play/pause     │
│  • `VideoTitleOverlay.tsx`      — top bar with title + back    │
│  • `ModeAndMoreOverlay.tsx`     — bottom: mode + captions + ⋯ │
│  • `VideoMiniPlayer.tsx`         — compact dock                 │
│  • `VideoErrorOverlay.tsx`       — terminal error with retry    │
│  • `VideoLoadingOverlay.tsx`     — initial-spinner + skeleton   │
│  Each owns only its SVG geometry, its hit regions, and its       │
│  accessibility semantics.                                       │
└────────────────────────────────────────────────────────────────┘
```

The five boundaries exist so that one bug can be located in one file without spelunking through 600 lines. The original V11 audio boundary schema (4 layers, dropped on the V18 video side) is restored and extended with `VideoController` so that repeat-policy + lane-integrity have a single owner — not scattered across `NowPlayingScreen` local handlers.

### 2.1 The isolation contract (the senior's "don't shit around the code" rule)

**The video player is a black box.** The rest of the app must not contain any video-player logic - not state, not commands, not gestures, not chrome composition, not analytics wiring. Everything lives inside `src/components/player/video/` + `src/infrastructure/player/`. Cross-boundary imports are ESLint-forbidden.

**Critical correction from the audit (§1-§3 of `md/SIMBA_PLAYER_V19_ARCHITECTURE_AUDIT.md`):** the three-symbol public surface is imported from **`src/infrastructure/player/`** (the APP'S FACADE), NOT from `@simba-dev/react-native-media-player` (the npm package). The facade IS the boundary - 40+ consumer files already import through it, and the existing `scripts/check-import-boundaries.js` import-boundary linter enforces this. Junior-dev integration uses the facade; the lib's barrel is never touched.

The contract compiles to **nine rules**, all enforced:

| # | Rule | Why |
|---|---|---|
| 1 | **Three-symbol consumer surface.** The app imports exactly `{ SimbaPlayer, usePlayerActivity, useOpenWithResume }` from `src/infrastructure/player/` (the app's facade). No other path. | A junior dev can't import the wrong thing if there is no wrong thing to import. |
| 2 | **No internal path imports.** `import { usePlayer } from 'src/infrastructure/player'` is OK (the barrel). `import { usePlayer } from '@simba-dev/react-native-media-player'` is BANNED - consumers never reach past the facade. | The facade IS the boundary; the lib is implementation detail. |
| 3 | **No native-knowledge reach-through.** The consumer must not import `MpvBridgeModule`, `libmpv`, `mpv` properties, demuxer events, JNI types, NDK modules, or AGP classes. | If we ever swap libmpv for Media3 / ExoPlayer / a custom decoder, the consumer code does not change. |
| 4 | **No internal state ownership.** No `useState` for `isPlaying`/`positionMs`/`durationMs`/etc. in the consumer. Everything reads from `usePlayer()` + `usePlayerProgress()` (or via the facade's higher-level wrappers). | Two sources of truth = bugs. |
| 5 | **No command functions outside the ref.** No `setVolume`/`pause`/`seek` calls outside `playerRef.current.*` or the imperative `commands` returned by the hook. | Same reason. |
| 6 | **No chrome composition by the consumer.** The consumer does not compose `<VideoSurface />` + `<TransportBar />` themselves. `<SimbaPlayer />` is the chrome. The **only** layout-level exception is `<VideoMiniPlayer />` because it is a layout participant (sits over app content), not a modal. | The chrome is the player's job. The page is for the page. |
| 7 | **No gesture handlers in the consumer.** Double-tap, long-press, vertical-swipe volume/brightness, tap-to-toggle-chrome - all internal. The consumer only sees the imperative `playerRef.current.*` and the declarative `<SimbaPlayer />` props. | Gestures compose poorly across boundaries. The player owns the gesture detector tree. |
| 8 | **`SimbaPlayer` mounted ONLY in `App.tsx`.** ESLint rule + CI grep: `grep -rn "<SimbaPlayer" src/ | grep -v "App.tsx"` returns 0 hits. | The shell-mounting rule (SPEC §3.4.1). One bridge bind forever. |
| 9 | **`<VideoMiniPlayer />` imported only by `App.tsx`** (or the chrome primitives themselves). Same ESLint + CI grep pattern. | Same reason. The dock is a shell-level overlay, not a screen-level component. |

**What this means for a Movies page** (the entire integration, end-to-end):

```tsx
// pages/MoviesPage.tsx — junior-dev integration
import { SimbaPlayer, usePlayerActivity } from '@simba-dev/react-native-media-player';
import type { SimbaPlayerRef } from '@simba-dev/react-native-media-player';

export const MoviesPage = () => {
  const playerRef = useRef<SimbaPlayerRef>(null);
  const { isPlaying, positionMs, durationMs, presentation } = usePlayerActivity();

  return (
    <View>
      {/* All video player complexity lives inside <SimbaPlayer />.
          The page knows nothing about libmpv, JNI, gestures, chrome,
          scrub preview, buffered ranges, or the state machine. */}
      <SimbaPlayer
        ref={playerRef}
        source={{ uri: movie.url, title: movie.title, kind: 'video' }}
        aspectRatio="contain"
        autoPlay={false}
        onError={(e) => toast.error(e.message)}
        onEnded={() => track('player_ended', { id: movie.id })}
      />

      {/* Consumer reads via the hook; never holds its own. */}
      <Text>{formatTime(positionMs)} / {formatTime(durationMs)}</Text>

      {/* Imperative commands via the ref — the only way to drive playback. */}
      <Button
        title="Restart"
        onPress={() => {
          playerRef.current?.seek(0);
          playerRef.current?.play();
        }}
      />
    </View>
  );
};
```

That is the **entire** integration surface — declarative props + imperative ref + one read-only hook. No business logic, no Redux, no analytics wiring, no internal imports. The page is a page.

**Where every kind of complexity lives:**

| Concern | Lives in | NOT in |
|---|---|---|
| libmpv / MpvBridgeModule / JNI | `@simba-dev/react-native-media-player` (npm package) | consumer |
| mpv property mapping, demuxer-cache-range events, EOF handling | `src/infrastructure/player/transport/` | consumer |
| `VideoController` (load lifecycle, repeat policy, lane integrity, error classifier) | `src/infrastructure/player/video/` | consumer |
| Chrome primitives (`VideoSurface`, `TransportBar`, `ScrubPreview`, gesture detectors) | `src/components/player/video/` | consumer |
| State machine (idle → preparing → … → finished → error) | `src/infrastructure/player/video/VideoController.ts` | consumer |
| Five-boundary enforcement (no cross-imports) | ESLint `no-restricted-imports` rule | n/a |

The contract is symmetric with the lib boundary. The lib masks libmpv from the app; the app's `src/infrastructure/player/` masks the lib's surface from the screens. Two layers of isolation. Both ESLint-enforced. The rest of the app stays a junior-dev codebase.

---

## 3. The screen catalog (what each chrome surface owns)

### 3.1 `VideoSurface` — the frame, and only the frame
- **Owns:** layout (`flex: 1`), aspect-ratio preservation (`resizeMode="contain"` on the native `SurfaceView`), letterbox/pillarbox region rendering (dark by default — see §3.5), accessibility-hidden (`importantForAccessibility="no-hide-descendants"`).
- **Does not own:** any chrome — no play button, no seek bar, no title.
- **Reads:** the parent's geometry constraints (only — the native surface is a true opaque region).
- **Why:** a frame that knows about controls is a frame that fights them. The native `SurfaceView` (provided by `@simba-dev/react-native-media-player`'s `<SimbaPlayer>`) is the only surface that should ever render pixels.

### 3.2 `VideoTitleOverlay` — the top bar
- Sits on a gradient scrim (top → transparent over the media) so titles remain legible on any frame.
- Contains: 1 minimize affordance, 1 title, 1 lock affordance (expanded only), 1 More affordance. Nothing else.
- Behavior: title truncates rather than pushes actions off-screen.
- Auto-hides in 3 s on `onLayout → bottom-of-stack`; reappears on tap-anywhere-within-chrome.

### 3.3 `TransportBar` — the bottom transport row
- Three logical rows, drawn as a single fixed-position gradient scrim:
  - **Row 1 — Progress**: `TimeLabel + BufferedRangeFill + PlayedRangeFill + Thumb + TimeLabel`. The whole row is a `Pressable` whose `accessibilityRole="adjustable"` exposes `min/max` from `useTransport()`'s `seekability`. `onPanResponderMove` drives incremental seek; `onPanResponderRelease` commits (cancel-by-jump not supported; commit = seek).
  - **Row 2 — Transport controls**: exactly five controls in order `Rewind 10` `Previous` `Play/Pause` `Next` `Forward 10`. Previous/Next disappear when `currentItem?.hasPrev = false` / `hasNext = false` — they MUST NOT become dead spacers.
  - **Row 3 — Mode + More**: `ModeControl (compact single-value)` + `CaptionsToggle (compact, optional)` + `PiPToggle (compact, optional)` + `More` (single entry point to the secondary surface).

### 3.4 `VideoMiniPlayer` — the dock (NOT a second full player)
- Composition: `artwork + title + state` · `expand` · `Play/Pause` · `close`. Up/down navigation arrows optional, but Previous/Next are NOT exposed — those are full-player features.
- Critical: the track region and the explicit expand button are two separate hit targets, both calling the same `expandMini → 'expanded'` state transition. `Play/Pause`, `Previous`, `Next`, and `Close` cannot be nested inside the expand Pressable. (Inheritance from V11 §6.2.)
- The mini-player is mounted ONCE and toggles its visibility — never destroys and remounts. This is the only way to guarantee one native session across the toggle.

### 3.4.1 The shell-mounting rule (navigation independence)

The mini player's survival across navigation is the **defining correctness property** of V19. Without it, the dock disappears every time the user leaves a screen, and audio actually does pause (because the JS-side `<SimbaPlayer />` remounts the native bridge).

**The rule: SimbaPlayer is ALWAYS mounted at the app shell, and toggles its own visibility based on `presentation` state. It does NOT mount inside any screen route.**

This is the **always-mount with conditional rendering** pattern (correcting an earlier draft that proposed mount/unmount — that pattern had visible glitches and unnecessary calculations from re-binding the native bridge on every open). YouTube, Netflix, and Apple Music use the always-mount pattern for the same reason: chrome that toggles visibility is the **same view at different sizes**, not a different screen.

**Architectural shape (corrected):**

```
App.tsx                                  ← shell, always mounted
  ├── SafeAreaProvider
  ├── NavigationContainer
  │    └── RootNavigator                  ← navigation for screens
  │         ├── TabsNavigator
  │         │    ├── HomeScreen
  │         │    ├── SearchScreen
  │         │    ├── MoviesScreen          ← user browses here
  │         │    └── LibraryScreen
  │         └── ModalStack
  │              └── (movie detail, etc.)
  └── SimbaPlayer                         ← ALWAYS mounted, ALWAYS bound
       ├── presentation === 'idle'   → null
       ├── presentation === 'mini'   → <VideoMiniPlayer />
       └── presentation === 'expanded' → <VideoSurface /> + full chrome
```

**Single-instance SimbaPlayer (no remount):**

```tsx
// SimbaPlayer.tsx — a true shell-level overlay
const SimbaPlayer = forwardRef<SimbaPlayerRef>((_, ref) => {
  const innerRef = useRef<SimbaPlayerRef>(null);
  useImperativeHandle(ref, () => innerRef.current!, []);

  const { videoState, presentation } = usePlayerActivity();

  if (videoState === 'idle') return null;

  if (presentation === 'mini') {
    return (
      <VideoMiniPlayer
        playerRef={innerRef}
        onExpand={() => innerRef.current?.setPresentation('expanded')}
      />
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <VideoSurface />
      <ChromeAutoHideController playerRef={innerRef}>
        <VideoTitleOverlay />
        <TransportBar />
        <VideoMoreSheet />
      </ChromeAutoHideController>
      <VideoLoadingOverlay />
      <VideoErrorOverlay />
    </View>
  );
});
```

**Navigation lifecycle (corrected):**

| User action | JS tree change | Native state |
|---|---|---|
| Open app, browse Movies | `MoviesScreen` mounts | idle |
| Tap a movie | `setPresentation('expanded')` + `loadFile(uri)` — **no navigation** | playing |
| Tap "minimize" in chrome | `setPresentation('mini')` — **no navigation** | **playing unchanged** |
| Navigate Movies → Search → Movies | screens swap; SimbaPlayer stays mounted | **playing unchanged** |
| Background app | Android 12+ auto-PiP via `setAutoEnterEnabled(true)` | **playing unchanged** |
| Tap mini dock | `setPresentation('expanded')` — **no navigation** | **playing unchanged**, position continues |

**Why this works at the native level:**

`com.simba.player.PlayerActivity` is a separate Android activity with `launchMode="singleTask"` (verified at `android/app/src/main/AndroidManifest.xml:116`). The native session is owned by PlayerActivity. JS-side SimbaPlayer is a thin conditional renderer over the same native session — it never unmounts the bridge.

**ESLint enforcement (additions to Phase 0.0):**

- **Rule 6**: Consumer must NOT import chrome primitives. (Existing.)
- **Rule 8** (new): `<SimbaPlayer />` MUST be rendered only inside `App.tsx`. ESLint rule: `no-restricted-imports` blocks `SimbaPlayer` from any path matching `src/screens/**`. CI grep: `grep -rn "<SimbaPlayer" src/ | grep -v "App.tsx"` returns 0.
- **Rule 9** (removed — was about restricting SimbaPlayer to FullPlayerScreen; obsolete because SimbaPlayer is no longer in FullPlayerScreen at all).

**Edge cases V19 handles:**

- **App backgrounding**: Android 12+ auto-PiP via `setAutoEnterEnabled(true)` (already in `AndroidManifest.xml`). User continues using other apps while watching.
- **App killed**: Playback stops (expected). On relaunch, `SmartResumePrompt` fires if saved progress > 30%.
- **Native bridge crash**: Native session in `PlayerActivity` survives. Audio continues; JS observers stop. Recovery: re-bind JS observer on bridge reconnect (the always-mount SimbaPlayer does this automatically).
- **Multiple `SimbaPlayer` mounts**: FORBIDDEN by Rule 8. The lib's `PlayerActivity` is a singleton (`launchMode="singleTask"`); mounting two `<SimbaPlayer />` instances would race for the same native session. ESLint + grep enforce this at CI time.

### 3.5 `VideoErrorOverlay` — only ever terminal
- Visible only when `videoState === 'error'`. Renders a dark scrim with: a short error title (e.g. "Couldn't load this video"), the human-readable error message (from `VideoController.errorMessage(error)`), and exactly two actions: `Retry` and `Close`.
- Buffering is **NOT** an error. Buffering uses `VideoLoadingOverlay` (a small spinner over the last known frame), not this surface.

### 3.6 `VideoLoadingOverlay` — restrained
- Visible when `isBuffering === true` OR `videoState === 'preparing'` OR `videoState === 'connecting'`.
- Surface: small spinner + concise state label ("Preparing video" / "Connecting" / "Buffering"). No fake percentage. No full-page card.

### 3.7 `ChromeAutoHideController` — tap-anywhere + 3-second timer
- Owns the chrome's visibility state machine. Independent of `VideoController`. The chrome is visible on:
  - **State entry** — `preparing`, `paused`, `buffering`, `seeking`, `error`, `finished` keep chrome pinned
  - **Touch** — any tap inside the chrome region OR on the video frame (outside chrome bounds)
  - **User activity** — any transport interaction (seek, skip, pause) re-shows for 3 s
- The chrome hides after **3 s of no input** on `playing` only. Every other state pins the chrome visible.
- During hide animation, chrome fades 200 ms ease-out. Re-show is instantaneous (no fade-in delay — users want feedback).

### 3.8 `ScrubPreview` — Netflix-style timeline preview (V19's defining new feature)
- Visible only while the user is actively seeking (touch-down on `TransportBar` progress row).
- Surface: a floating tooltip above the thumb with **two** elements:
  1. A small thumbnail of the frame at the touched timestamp (sourced from mpv's `--screenshot` or a cached keyframe strip; if no thumbnails available, show a flat slate pill — never a fake thumbnail)
  2. The would-be timestamp (e.g. `1:42`)
- Thumbnail generation: on first paint, the lib pre-samples 10 evenly-spaced keyframes during `preparing` (when mpv has the demuxer open but before first frame paint). Cache is per-item; cleared on `onFileLoaded`.
- **If pre-sample fails or no keyframes available**, the tooltip shows only the timestamp pill. Never a placeholder square. Never a loading spinner (it would block the seek).
- Surface bounds: centered horizontally on the thumb, clamped to the bar's horizontal extent. Pointer events off (does not steal seek gesture).

### 3.9 Vertical-swipe gesture system (volume + brightness)
- Implemented via `react-native-gesture-handler` `Gesture.Pan()` on the `VideoSurface`. Two side zones:
  - **Left third**: vertical swipe adjusts **brightness** (0..1)
  - **Right third**: vertical swipe adjusts **volume** (0..1)
  - **Middle third**: vertical swipe is a no-op (it would conflict with future horizontal scrub gesture)
- During gesture, render a centered vertical pill (`VolumeIndicator` / `BrightnessIndicator`) — slate background, white foreground, the same shape as YouTube. Auto-hides 600 ms after gesture release.
- Brightness uses the native `Window.brightness` API (Android) / `UIScreen.main.brightness` (iOS). Volume goes through `SimbaPlayer.setVolume()` (mpv).
- **Gestures never override the tap-to-toggle-chrome behavior.** Gesture priority: long-press > double-tap > single-tap > pan (per `Gesture.Exclusive` ordering).

### 3.10 `VideoMoreSheet` — the single secondary-actions surface
- One `BottomSheet` from `react-native-bottom-sheet` (or platform-equivalent). Five groups, in this order:
  1. **Playback speed** — single-choice chips: `0.5× · 0.75× · 1× · 1.25× · 1.5× · 2×`. Default `1×`. Wired to `SimbaPlayer.setSpeed()`.
  2. **Quality** — single-choice from `controls.videoQualityOptions` (auto + mpv-reported heights). Default `Auto`. Wired to `SimbaPlayer.setVideoQuality()`.
  3. **Captions** — single-choice from `controls.captionTracks`. Default `Off`. Renders the row only if tracks exist; otherwise hidden.
  4. **Sleep timer** — single-choice: `Off · 15 min · 30 min · 60 min`. Starts a cancellable countdown. Renders a small "Sleeping in 14:32" badge on the chrome when active.
  5. **Cast / output route** — placeholder for V20; renders "Cast coming soon" if `outputRoute` is unimplemented.
- **No "Share" or "Add to playlist" inside the sheet** — those are page-level actions (Notion's pattern: chrome is for playback, the page is for sharing).
- Sheet closes on backdrop tap, drag-down, or any transport command. Re-open does not lose state.

### 3.11 `LongPressSpeedPreview` — 2× speed on hold
- Long-press anywhere on the frame (500 ms) → playback rate jumps to 2×.
- A small `2×` badge appears at the top center for the duration of the press.
- Release → rate restores to the user's previous setting. The rate setting in the More sheet is NOT modified (the press is a preview, not a commit).
- Incompatible with PiP (no gestures in PiP); the controller disables this when `presentation === 'pip'`.

### 3.12 `CaptionTrackSelector` (subtitles vs CC vs SDH — correctly labeled)
- Track metadata carries `kind: 'subtitle' | 'caption' | 'sdh'` — emitted by the lib from mpv's `track-list` `title` and `lang` fields. The lib strips vendor-specific tags (e.g., Netflix's `[CC]` vs `[SDH]` markers) and normalizes to the kind enum.
- UI renders labels per the kind enum:
  - `subtitle` → "English (Subtitles)" / "Español (Subtítulos)"
  - `caption` → "English [CC]" / "English [CC]"
  - `sdh` → "English [SDH]" / "English [SDH]"
- Default-off. Selecting a track calls `commands.selectCaptionTrack(trackId)`. Selecting "Off" calls `selectCaptionTrack(null)`.
- This is the WCAG 2.2 §1.2.2 surface — captions (CC/SDH) and subtitles (translation) are NEVER collapsed.

### 3.13 `CaptionCustomizer` (font size + background + position)
- Lives in More sheet under "Captions" submenu. Persistent across sessions (AsyncStorage key: `player.captionStyle`).
- Settings (V19 minimum):
  - **Font size**: `Small / Medium / Large / Extra-Large` (default: `Medium`)
  - **Background opacity**: `None / 50% / Solid` (default: `50%`)
  - **Position**: `Bottom / Top / Custom` (default: `Bottom`; `Custom` reserved for V20)
- The lib receives the custom style as mpv `--sub-font-size` / `--sub-back-color` / `--sub-pos` overrides; the player UI does NOT render captions in JS (mpv owns the subtitle renderer).
- **NEVER** ships without these controls if captions are advertised — WCAG 2.2 §1.2.2 requires the user be able to make them readable.

### 3.14 `AudioDescriptionTrackSelector` (WCAG 1.2.5 AA — required)
- Separate from captions. An audio description track is an alternative audio track that narrates visual content.
- Renders ONLY when `controls.audioDescriptionTracks.length > 0`. (If the source has no AD track, the row is hidden — no "AD not available" stub.)
- Selecting a track calls `commands.selectAudioDescriptionTrack(trackId)`; the lib routes AD as a secondary mpv `--audio-add` channel that mixes with the main track (per WAI G187 technique).
- Default off. Selecting "Off" returns to main audio only.

### 3.15 `InteractiveTranscript` (Netflix/YouTube pattern — WCAG AAA)
- Lives in More sheet under "Transcript" group. Opens a full-screen scrollable sheet (`<BottomSheet snapPoints={['40%', '90%']}>`).
- Source: the active caption file (WebVTT / IMSC) parsed by `webvtt-parser` (lightweight, ~5 KB).
- Render: each cue is a `<Pressable>` row with `accessibilityRole="button"`. The currently-active cue is gold-highlighted (`useTheme().colors.accent.gold`) and scrolls into view automatically.
- Tap any cue → `commands.seek(cue.startMs)`; sheet remains open.
- Pinch-to-zoom and large-text respects system Dynamic Type / sp.
- Disabled when `captionTracks.length === 0` (no transcript available).
- **NEVER** ships with synthetic/stub data — only renders real captions.

### 3.16 `SkipSilenceToggle` (podcast killer feature — opt-in)
- Toggle in More sheet under "Playback" group. Default **OFF** (per Puneet Patwari's "never skip automatically without consent" rule).
- When ON: lib injects `af-add=scaletempo2=max-speed=32.0` filter via mpv profile. Tracks RMS amplitude at 21 ms windows; ramps to 8× during silence; snaps to 1× on speech onset. Hysteresis prevents flapping (500 ms hold before speeding up).
- When OFF: no filter; native speed only.
- **Podcasts benefit massively.** Movies / music are not affected (silence is intentional).
- Implementation note: the lib owns the filter; the player UI just toggles a `playerRef.current.setSkipSilence(true | false)` flag.

### 3.17 `SmartResumePrompt` (Netflix/YouTube pattern)
- Triggered when `usePlayerActivity().videoState === 'preparing'` AND a saved progress exists for the current item via `useOpenWithResume({ uri }).progressMs`.
- Threshold table:
  - `progressMs / durationMs >= 0.95` → "Restart from beginning" prompt (item is "done")
  - `progressMs / durationMs >= 0.30` → "Resume from 12:34" prompt with thumbnail + "Play from beginning" option
  - `< 0.30` → silent (no prompt — play from 0)
- The prompt renders as a centered card with a thumbnail (`useOpenWithResume().thumbnailUri`), the time, and two buttons: `Resume` (calls `commands.seek(progressMs).then(commands.play())`) and `Play from beginning` (calls `commands.seek(0).then(commands.play())`).
- Auto-dismisses after 8 s of no interaction; default action is Resume.
- The progress source is `playerResumeProgress` in AsyncStorage — written by `VideoController` on every 10-second tick during playback.

### 3.18 `NextUpOverlay` (Netflix pattern — post-play countdown)
- Triggers at `durationMs - 10000` (10 s before EOF) on `Repeat all` mode (only — never on Repeat one / Play once).
- Renders as a full-bleed card overlaying the bottom 40% of the frame: thumbnail + title + "Up next" label + countdown `7 ... 6 ... 5 ...` + `Cancel` + `Play now` buttons.
- Countdown is a simple `<Text>` re-render every 1 s — no animation library needed.
- `Cancel` → pause the countdown; user remains on the now-finished item.
- `Play now` → `commands.next()` immediately.
- Auto-fires `commands.next()` when countdown reaches 0 AND `autoPlayNext === true` (More toggle, default OFF).
- Disabled when `commands.canGoNext === false`.

### 3.19 `ReduceMotionController` (system accessibility)
- Subscribes to `AccessibilityInfo.isReduceMotionEnabled()` (iOS) / `AccessibilityManager` (Android via `react-native`).
- When ON: passes `reduceMotion: true` flag to:
  - `ChromeAutoHideController` — instant show, instant hide (no 200 ms fade)
  - `ScrubPreview` — instant show, instant hide
  - `LongPressSpeedPreview` — instant 2× badge appear
  - `NextUpOverlay` countdown — text-only, no animated digits
- When OFF: default 200 ms ease-out fades.
- `AccessibilityInfo.addEventListener('reduceMotionChanged', ...)` lifecycle: registered on mount, removed on unmount.

### 3.20 `FlashingLightsBadge` (iOS 17+ Dim Flashing Lights)
- iOS 17+ automatically dims the display when flashing lights are detected in supported media. The `AVPlayerItem.preferredForwardBufferDuration` API exposes the detection to apps.
- When the lib reports `flashingLightsDetected: true` (via a custom mpv hook), the chrome renders a small accessibility-style badge in the top-right: `⚠ Flashing lights` with `accessibilityLabel="Video contains flashing lights that may trigger photosensitivity"`.
- Tap the badge → opens a static info sheet with the WCAG explanation and a "Dismiss for this video" action.
- Android equivalent: do nothing (no system support). The badge only renders on iOS.

### 3.21 `DpadController` + hardware media keys (TV / CarPlay / Bluetooth)
- Subscribes to:
  - `KEYCODE_DPAD_UP/DOWN/LEFT/RIGHT/CENTER` → focus traversal (chrome order is left-to-right, top-to-bottom per WCAG 2.4.3)
  - `KEYCODE_MEDIA_PLAY/PAUSE/STOP/NEXT/PREVIOUS/REWIND/FAST_FORWARD` → wired to `MediaSession` (lib handles the routing)
  - `KEYCODE_VOLUME_UP/DOWN/MUTE` → wired to `SimbaPlayer.setVolume()` when player is foreground; system volume when in PiP
- Visible focus ring: 2 px gold outline (`useTheme().colors.accent.gold`) at 100% alpha — meets WCAG 2.4.7.
- Disabled when no D-pad / external keyboard is connected (focus ring hidden, but the code paths remain).
- This is the WCAG 2.1.1 surface - every transport action reachable by keyboard alone.

### 3.22 `useQueueSync()` - the native queue ↔ `usePlayerStore` wire (FOUNDATIONAL)

**This is the most important new V19 primitive.** Without it, every consumer has its own view of "what's playing" and they drift. The Home screen's "Now Playing" tile, the Queue screen, the PlaylistDetail screen, and the player's own chrome all need to read the same `currentFile` - and that single source of truth is the lib's native session, not the consumer's Zustand store.

**Mounted ONCE at App.tsx shell** (same mount point as SimbaPlayer). Subscribes to:
- `usePlayer().state` (isPlaying, title, artist) - fires on every state change
- `usePlayerProgress().positionMs` - fires at 1Hz
- `useQueue()` (whatever the lib exposes for queue inspection)
- `useOpenPlaylist()` - fires on playlist launch
- `usePlayerActivity().openPlayer` - fires on single-file launch

**Writes to:**
- `usePlayerStore.setCurrentFile(...)` on every launch - so Home / Queue / PlaylistDetail / NowPlaying all see the same item
- `usePlayerStore.playFromPlaylist(index)` on every `next()` / `previous()` - so the currentIndex tracks the native queue
- `usePlayerStore.clearPlaylist()` when the native session is empty

**Performance:** the middleware uses Zustand selector slices (`usePlayerStore(s => s.currentFile)` in dependent components, not `usePlayerStore()`) so a position update doesn't trigger a render in components that only read `currentFile`.

**Failure modes:**
- Lib's queue contents are opaque (§4 of the audit). If the lib doesn't expose "what's next", `useQueueSync` falls back to maintaining a parallel queue based on the `openPlaylist` argument - matching what was launched, advancing on `next()`, shrinking on `removeFromPlaylist`. The `NextUpOverlay` (§3.18) reads from `usePlayerStore.playlist[currentIndex + 1]`, which is this maintained list.
- If the lib exposes a richer queue API in the future, `useQueueSync` upgrades its subscription without breaking consumers.

### 3.23 `usePresentation()` + `usePresentationStore` - the shell-level chrome toggle (FOUNDATIONAL)

**`presentation` is an app-side concept, not a lib concept.** The lib's `PlayerActivity` is `launchMode="singleTask"` - there's only one presentation at the native level (fullscreen activity). Mini/expanded is a JS-side CSS visibility toggle.

**`usePresentationStore`** is a new Zustand store with MMKV persistence (matches the app's existing persistence layer):

```ts
interface PresentationState {
  mode: 'mini' | 'expanded' | 'pip';
  setMode: (mode: 'mini' | 'expanded' | 'pip') => void;
  togglePip: () => Promise<void>;
}
```

**`usePresentation()`** is the hook the chrome reads. SimbaPlayer reads it and conditionally renders:

```tsx
const { mode } = usePresentation();
const { videoState } = usePlayer();
if (videoState === 'idle') return null;
if (mode === 'mini') return <VideoMiniPlayer ... />;
return <FullChrome ... />;
```

**Behavior:**
- Default on cold start: `mode === 'expanded'` if there's an active session, else `mode === 'mini'` (no chrome visible).
- User taps mini dock → `setMode('expanded')`. The SimbaPlayer at the shell re-renders to show full chrome. **No navigation. No mount/unmount. The chrome is the same view, just bigger.**
- User taps "minimize" in chrome → `setMode('mini')`. Re-renders to dock.
- PiP: `setMode('pip')` triggers `enterPip()`. On PiP exit, the lib fires a callback → `setMode('expanded')` (or `mini` if no session).
- Survives app kill (MMKV-persisted). On relaunch, if a session is active, the chrome opens in `expanded` (not `mini`) so the user sees their video.
- Survives navigation: this is the whole point of the shell-mounting rule (§3.4.1).

### 3.24 `validateLane()` - the JS-side lane integrity guard (FOUNDATIONAL)

**Native-level lane integrity is unverified.** The lib takes `type: 'video' | 'audio'` at the bridge level but doesn't enforce that all items in a playlist share the lane, and doesn't surface a typed rejection on mismatch. JS-side filtering in `usePlayerStore.addToPlaylist` is best-effort (filters at write time, doesn't catch programmatic launch paths).

**`validateLane()` is the runtime guard** wrapping every launch path in the facade (`open`, `openWithResume`, `openPlaylist`):

```ts
function validateLane(
  input: { mediaType: MediaKind | MediaLane | 'video' | 'audio' },
  activeLane: MediaLane | undefined,
): Result<void, StreamError> {
  const itemLane = mediaTypeToLane(input.mediaType);
  if (activeLane && activeLane !== itemLane) {
    return err({
      kind: 'lane',
      message: `Can't play ${itemLane} while ${activeLane} is active. Stop playback first.`,
      activeLane,
      attemptedLane: itemLane,
      userFixable: true,
    });
  }
  return ok(undefined);
}
```

**The guard is enforced in the facade's launch functions**, not in the consumer. The consumer calls `commands.open(input)`; the facade checks `activeLane` (from `usePlayerStore.currentFile.mediaType`) before calling the lib. If mismatched, returns `err({kind: 'lane', ...})`. The consumer shows a toast "Stop playback first."

**Why this matters:** without `validateLane()`, a junior dev could add a video to a music playlist launch by accident. The lib would happily try to play it; the native session might handle it (mpv is format-agnostic), but the chrome (which is lane-aware) would show wrong controls.

**Native-level enforcement is V20** (§12). The lib would need an `E_LANE_MISMATCH` rejection code. Today's bridge collapses everything to `networkError` (§12).

---

## 4. Buffering (the defining difference)

### 4.1 Why V18 fails here

V18's `NowPlayingScreen` has a `seekTrackFill` width animated from transport's `positionMs / durationMs`. There is **no buffered-range display** at all. The user has no signal that "we have 10 seconds of video cached" or "we are stalling — the cache only covers up to where you see the thumb." This is exactly the V11/V2 spec §6.3 warning: *"A user should be able to distinguish preparing, buffering, seeking, paused, playing, finished, live, and terminal error from a short label, motion indicator, or button state."*

### 4.2 What V19 ships

`TransportContext` exposes `bufferedRanges: ReadonlyArray<{startMs: number; endMs: number}>` (raw, possibly disconnected) and `normalizedWindow: {startMs: number; endMs: number}` (the single contiguous window containing the playhead, OR the full range if playhead is in a gap, OR `null` if no file is loaded). The `BufferedRangeFill` primitive consumes `normalizedWindow` and renders it as a slate-colored region behind the played fill. The rendering rules — strict, no cheating:

| Scenario | Render |
|---|---|
| Empty buffer (no file loaded) | No buffered region |
| Single contiguous window covering the whole media | One buffered region |
| Window containing the playhead | One buffered region, drawn up to `endMs` even if there are beyond-the-playhead islands |
| Playhead in a gap between two windows | The active window (containing playhead); the other windows are **suppressed** (not painted) so the user doesn't see a misleading bridge |
| Playhead beyond all windows (file ended, seek into non-buffered region) | No buffered region (would be misleading) |
| File ended at duration | Buffer up to `duration`, played at `duration`; thumb sits at the right edge |

**Rule 0:** a UI bar that stretches to the seek target is a lie. The bar paints exactly what native reported, normalized.

### 4.3 Buffer retention

`bufferedRanges[]` is cleared only on `onFileLoaded` (the media-identity boundary). Pause, natural EOF, seeking, buffering, collapse, and expansion do NOT clear it.

---

## 5. The 1-import + 1-wrapper public surface (concrete API)

The V12 rule was that every public piece of the player module reads as a single composable surface. V19 applies the same rule to the consumer side, and the isolation contract (§2.1) makes it load-bearing.

**Critical correction from the audit:** the public surface is **`src/infrastructure/player/`** (the app's facade), NOT `@simba-dev/react-native-media-player` (the lib). The facade is the boundary; the lib is implementation detail.

### 5.1 Three symbols - the entire API

```ts
// The full consumer surface, end-to-end:
import {
  SimbaPlayer,           // <SimbaPlayer source={...} onError={...} ref={ref} />
  usePlayerActivity,     // launch surface (lib's API): {openPlayer, getLaunchParams}
  useOpenWithResume,     // launch helper: open(uri, kind) with resume precedence
} from 'src/infrastructure/player';

import type {
  SimbaPlayerRef,        // imperative ref API (5.3)
  VideoSource,           // { uri, title, kind }
  OpenInput,             // { uri, title, mediaType }
  OpenWithResumeInput,   // OpenInput + positionSec
  OpenPlaylistInput,     // { entries, title?, mediaType?, startIndex?, startPositionSec?, shuffle? }
  Result,                // ok | err
  StreamError,           // network | unsupported | expired | blocked | launch | codec | lane
} from 'src/infrastructure/player';
```

Six named imports. That is the universe.

**Naming reconciliation** (from the audit):
- `usePlayerActivity()` in the FACADE = the lib's `usePlayerActivity()` = `{openPlayer, getLaunchParams}`. The state surface is reached via `usePlayer()` + `usePlayerProgress()` (also re-exported from the facade), NOT via `usePlayerActivity()`.
- The old V19 draft redefined `usePlayerActivity()` to return the state surface. That collided with the lib's name. Fixed.
- `SimbaPlayer` is the new V19 component. The lib already has a `SimbaPlayer` (the V16 root) - see §3.4.1 for the migration: V19 REPLACES the V16 root.

### 5.2 Declarative props (`<SimbaPlayer />`)

```ts
interface SimbaPlayerProps {
  /** Required. The media source. `null` = unload + reset to idle. */
  source: VideoSource | null;

  /** Deep-link / scrub-to-time only. Mini-expand NEVER sets this. */
  initialPositionMs?: number;

  /** Default `false`. The consumer decides when to play. */
  autoPlay?: boolean;

  /** Default `'contain'`. Letterbox/pillarbox, never crop. */
  aspectRatio?: 'contain' | 'cover';

  /** Volume on mount, 0..1. Default = system media volume. */
  initialVolume?: number;

  /** Speed on mount. Default = 1. */
  initialSpeed?: number;

  /** Optional. Fires on every state transition. */
  onStateChange?: (state: VideoState) => void;

  /** Optional. Fires on terminal error. Recover via ref. */
  onError?: (error: PlayerError) => void;

  /** Optional. Fires on natural EOF (not user-close). */
  onEnded?: () => void;

  /** Optional. Fires on `demuxer-cache-range` updates — for analytics only. */
  onBufferUpdate?: (range: { startMs: number; endMs: number }) => void;

  /** Optional. Override style. The chrome still owns its layout. */
  style?: ViewStyle;
}
```

The chrome primitives (`VideoSurface`, `TransportBar`, `ScrubPreview`, etc.) are **not** exposed as props. The consumer does not compose them. `<SimbaPlayer />` is one tree.

### 5.3 Imperative ref API (`playerRef.current`)

```ts
interface SimbaPlayerRef {
  // ── Transport (re-exposed from the lib's usePlayer().commands)
  play(): Promise<void>;
  pause(): Promise<void>;
  togglePlayPause(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  seekRelative(deltaMs: number): Promise<void>;
  skip(direction: 'forward' | 'backward'): Promise<void>;  // ±10s semantic

  // ── Output (NEW — wrap lib commands)
  setVolume(volume: number): Promise<void>;             // 0..1
  setSpeed(speed: number): Promise<void>;                // 0.5..2
  setVideoQuality(quality: string): Promise<void>;      // 'auto' | mpv height
  setLoopMode(mode: 'none' | 'file' | 'playlist'): Promise<void>;  // source of truth for Repeat UI
  setShuffle(enabled: boolean): Promise<void>;
  selectCaptionTrack(trackId: string | null): Promise<void>;
  selectAudioDescriptionTrack(trackId: string | null): Promise<void>;
  setSkipSilence(enabled: boolean): Promise<void>;      // W3.6 podcast UX

  // ── Launch (re-exposed from the lib's openPlayer / openPlaylist)
  open(input: OpenInput): Promise<Result<PlaybackId, StreamError>>;
  openWithResume(input: OpenWithResumeInput): Promise<Result<PlaybackId, StreamError>>;
  openPlaylist(input: OpenPlaylistInput): Promise<Result<PlaybackId, StreamError>>;
  close(): Promise<void>;

  // ── Presentation (NEW - app-side only, NOT lib)
  setPresentation(mode: 'mini' | 'expanded' | 'pip'): void;
  // Writes to usePresentationStore. Native PlayerActivity stays the same instance.

  // ── PiP (lib command)
  enterPip(): Promise<void>;
  exitPip(): Promise<void>;

  // ── Read-only for the mini player dock
  getCurrentUri(): string | null;
  getCurrentTitle(): string | null;
  getCurrentArtwork(): string | null;
}
```

The consumer never calls these via direct bridge imports - always via the ref. The ref is `useRef<SimbaPlayerRef>(null)`; the player attaches the methods on the imperative object so a ref-forwarded `useImperativeHandle` is the wiring.

**Naming reconciliation** (from the audit):
- The V19 draft named the launch method `loadFile()`. The lib calls it `openPlayer()`. V19 aligns to the lib's name; the imperative ref method is `open(input)`.
- `attach()` is internal to SimbaPlayer's mount lifecycle (see §5.3.1) - NOT exposed on the public ref.
- `setPresentation()` is app-side Zustand, not a lib command. Calling it never touches the native bridge.

### 5.3.1 Mount behavior - the navigation-independence contract

`SimbaPlayer` mount lifecycle is **strictly defined** so navigation independence works:

| SimbaPlayer event | Behavior |
|---|---|
| Mount with `source !== null` AND no existing native session | Call `loadFile(source)` (cold start) |
| Mount with `source !== null` AND existing native session with SAME `source.uri` | Call `attach()` — no `loadFile()`. Position continues from where the native session left off. **No reset to 0.** |
| Mount with `source !== null` AND existing native session with DIFFERENT `source.uri` | Call `loadFile(source)` (user opened a different video from the dock) |
| `source` prop changes (same mount cycle) | Call `loadFile(newSource)` |
| Unmount | **Do NOT** call `close()`. Native session persists in `PlayerActivity`. The next mount will `attach()` to the same session. |

**This is the contract that makes mini ↔ full expand work across navigation.** Without it, every time the user pops back from full player and re-taps the mini dock, the position would reset to 0 — defeating the entire point of mini-player continuity.

**Implementation note (lib side):** The lib's `MpvBridgeModule` already exposes the native session state via a singleton handle (PlayerActivity is `launchMode="singleTask"`). `attach()` queries the handle for `currentUri` and `currentPositionMs`. If `currentUri === source.uri`, no `loadFile` is dispatched; the JS observer just re-binds. If different, `loadFile` fires with the new source.

### 5.4 Read-only hook (`usePlayerActivity()`)

### 5.4 Read-only hook (`usePlayerActivity()`)

```ts
function usePlayerActivity(): {
  // State — read-only, no setters.
  videoState: VideoState;
  isPlaying: boolean;                                    // derived: videoState === 'playing'
  positionMs: number;
  durationMs: number;
  bufferedRanges: ReadonlyArray<{ startMs: number; endMs: number }>;
  normalizedWindow: { startMs: number; endMs: number } | null;
  error: PlayerError | null;
  canEnterPip: boolean;
  captionTracks: ReadonlyArray<CaptionTrack>;
  videoQualityOptions: ReadonlyArray<QualityOption>;
  currentCaptionTrackId: string | null;
  currentVideoQuality: string;
  speed: number;
  volume: number;                                        // 0..1
  presentation: 'mini' | 'expanded' | 'pip';

  /** Thin wrapper around the ref, for code paths where carrying a ref is awkward. */
  commands: {
    play: () => Promise<void>;
    pause: () => Promise<void>;
    seek: (ms: number) => Promise<void>;
    // ... mirrors SimbaPlayerRef — same methods
  };
};
```

`commands` is sugar, not an alternative source of truth. It calls the same ref methods under the hood. The consumer picks ref or `commands` based on what reads better; both produce identical native calls.

### 5.5 Internal composition (invisible to the consumer)

Inside `<SimbaPlayer />`:

```
<VideoSurface />                                  ← the only place that draws frames
<VideoTitleOverlay />                             ← top bar
<ChromeAutoHideController>                        ← visibility state
  <TransportBar>                                  ← bottom transport row
    <ScrubPreview />                              ← seek tooltip
    <TransportRow />                              ← 5 controls
    <ModeRow />                                   ← mode + captions + pip
    <More />                                      ← secondary sheet entry
  </TransportBar>
  <VideoMoreSheet />                              ← speed / quality / captions / sleep
  <VideoLoadingOverlay />                         ← spinner
  <VideoErrorOverlay />                           ← terminal error
  <VideoMiniPlayer />                             ← dock (always mounted, visibility toggled)
</ChromeAutoHideController>
```

**The consumer never sees this tree.** The `VideoSurface` is the only thing that paints. Every other primitive composes inside `<SimbaPlayer />`. If a junior dev opens the lib source, they should be able to ship a working integration without reading the internals.

This is the inverse of the V18 bug. V18 had `<NowPlayingScreen />` compose `<TouchableOpacity />` + a `<View />` + an inline seek handler + three hook calls + four type guards. That's three layers in the consumer's head. V19 collapses that into one import + one component + one hook + one ref. The rest of the app stays a junior codebase.

---

## 6. The state machine

```
idle ──open(input)──▶ preparing ──ready──▶ resumePrompt? ──confirm/dismiss──▶ playing
                       │                         │                            │
                       │                         ▼                            │
                       │                   (progress > 30% saved)              │
                       │                                                      │
                       │             ├──pause()──▶ paused ──play()──▶ playing  │
                       │             │                                        │
                       │             ├──seek()──▶ seeking ──▶ playing         │
                       │             │                                        │
                       │             ├──eof ──▶ finished ──play()──▶ playing  │
                       │             │                                        │
                       │             └──pre-EOF──▶ nextUpCountdown            │
                       │                        (10s before EOF)              │
                       │                        ├──cancel──▶ finished         │
                       │                        ├──playNow──▶ playing (next)   │
                       │                        └──timeout ──▶ playing (next) │
                       │                                  (autoPlayNext only)  │
                       │                                                      │
                       └──error──▶ error ──retry()──▶ preparing               │
                                                                              │
                                    close()──▶ idle                          │
```

**Presentation axis (orthogonal, app-side via `usePresentationStore`):**

```
mini ──setPresentation('expanded')──▶ expanded ──setPresentation('mini')──▶ mini
                                          │
                                          └──setPresentation('pip')──▶ pip
                                                  │
                                                  └──setPresentation('expanded')──▶ expanded
```

**The two axes are decoupled.** Mini/full expand/collapse is a presentation toggle, not a playback transition. Audio keeps playing through the toggle. Native `PlayerActivity` stays the same instance (`launchMode="singleTask"`).

**Auto-transitions on presentation:**

- On `usePlayer().state.isPlaying` going from `false` to `true` AND `usePresentationStore.mode === 'mini'` AND app is foregrounded → keep mini (user is browsing)
- On cold start with active session → `mode === 'expanded'` (user expects to see their video)
- On PiP enter (`enterPip()` resolves) → `setMode('pip')`
- On PiP exit callback → `setMode('expanded')` (or `'mini'` if no session)
- App-backgrounded while playing on Android 12+ → `setMode('pip')` via `setAutoEnterEnabled(true)` (already in `AndroidManifest.xml`)
- App-foregrounded while pip + still playing → `setMode('expanded')`

| State | chrome behavior | mini player behavior |
|---|---|---|
| `idle` | nothing rendered | hidden (or "open a track to begin") |
| `preparing` | small spinner + "Preparing video"; frame stays black | centered spinner + "Preparing" |
| `connecting` | small spinner + "Connecting"; frame stays black | spinner + "Connecting" |
| `playing` | full chrome fades out after 3 s; visible on tap | gold activity dot + Pause icon |
| `paused` | chrome stays visible (or until next activity) | muted dot + Play icon |
| `seeking` | Thumb holds steady under the user's finger; played fill recomputes only after commit | gold busy cue, position preserved |
| `buffering` | last frame stays + small spinner over it (NOT a black card) | buffer spinner, no pause wording |
| `finished` | "Play from beginning" affordance; no auto replay | muted dot + Play icon labelled "Play from beginning" |
| `error` | full dark scrim + retry + close | muted danger cue + retry |

There is no visual state we paint that is not driven from one of these. Period.

---

## 7. Responsive rules (V11 §9 inherited)

| Device class | Adjustment |
|---|---|
| Compact phone portrait | Artwork `min(screenWidth - 64, 280)`; transport row respects the 44-pt touch targets |
| Compact phone landscape | Hide the title row, push chrome to letterbox bars; expand Previous/Next remain visible, More stays |
| Tablet portrait | Same as portrait + max transport row width `600`, centered |
| Tablet landscape / foldable | Title overflows with ellipsis; transport row stretches to 720 px max then centers |
| PiP | Hide *all* chrome; controls live on the system overlay (MediaSession) |

Safe-area insets come from `react-native-safe-area-context` and are applied to the chrome's interactive region. The video frame itself runs edge-to-edge behind system bars.

---

## 8. Playback integrity (V11 §6/§7 extended to video)

### 8.1 Resume vs reuse
When `NowPlaying` opens with a `startPositionMs`, the controller decides:
1. If a matching native item is already loaded AND `startPositionMs === undefined`, **reuse the session** — same position, same ended state, same cache.
2. If `startPositionMs` is set OR no matching item, **loadFile**.

The mini player never sets `startPositionMs`. The full player only sets it when the caller explicitly opts in (deep-link, scrub-to-time) — never on mini → full expand.

### 8.2 Lane integrity

Video and audio are different `kind`s. A `Next` on a video lane never returns an audio item and vice versa. Each lane has its own queue.

### 8.3 Repeat behavior

| Mode | Natural EOF behavior |
|---|---|
| Off | Stop at duration; finished state; no auto-replay |
| Repeat one | Restart the same item on demand |
| Repeat all | Queue transition (next-item service) |

The mode control renders one compact single-value display (current mode). Tap → sheet with three single-choice options. The native mpv `loop-file` and `loop-playlist` flags are managed defensively — both are cleared before the active one is set, to avoid stale loops replaying the wrong item.

---

## 9. System integration (extras the V18 monolith ignored)

### 9.1 MediaSession
Title / artist / duration surface in Android's system media controls. Reuses the bridge's MediaSession integration (provided by `SimbaPlayer`).

### 9.2 Picture-in-Picture
Native PiP is owned by `SimbaPlayer`. The compact PiP control in row 3 of `TransportBar` only renders if `controls.canEnterPip() === true` (reported by the native bridge). **An unavailable PiP control is not rendered** — never an inert button.

### 9.3 Captions
Optional captions control in row 3 of `TransportBar` renders only if `controls.captionTracks.length > 0`. Selection opens a single-choice sheet.

### 9.4 Errors (classifier)

| Source symptom | classifier | UI message | recover affordance |
|---|---|---|---|
| mpv EXIT_FATAL | `codec` | "Codec not supported" | Retry + Close + auto-fallback to `software` decoding on next play |
| mpv NETWORK | `network` | "Couldn't reach the server" | Retry + Close |
| mpv EOF after seek-beyond-duration | `unsupported` | "Cannot seek to that position" | Reset to 0 + Resume |
| `Config.X` undefined | `expired` | "API token expired — reauth" | Sign-out + Reload |
| SurfaceView null | `blocked` | "Blocked by another player" | Stop the other + Retry |

Error classification is the **only** place that surfaces cause to the user. The view layer never infers a reason.

### 9.5 Captions / Subtitles / SDH (track selection + customization)

See §3.12 (track selector) and §3.13 (customizer). The tracks are surfaced via `controls.captionTracks: ReadonlyArray<CaptionTrack>` where each track carries `kind: 'subtitle' | 'caption' | 'sdh'` and `lang: string`. The lib normalizes vendor-specific naming (Netflix `[CC]` / `[SDH]`, YouTube auto-generated vs manual) into the kind enum.

### 9.6 Audio description (WCAG 1.2.5 AA)

See §3.14. Required by WCAG 2.2 AA for prerecorded video with essential visual content. V19 ships the surface; whether the source actually has an AD track is the content producer's responsibility.

### 9.7 Interactive transcript (WCAG AAA)

See §3.15. Optional but adds the most for accessibility. Disabled when no captions file is available.

### 9.8 Skip silence (podcast UX)

See §3.16. Default OFF (user-agency-first per [Puneet Patwari's design checklist](https://www.linkedin.com/posts/puneet-patwari_a-candidate-interviewing-for-l5-netflix-activity-7468285281444548610-JElU)). Implementation lives in the lib via `mpv-skipsilence` profile.

### 9.9 Smart resume (Netflix/YouTube pattern)

See §3.17. The progress source is `AsyncStorage` key `playerResumeProgress:<contentUri>`, written every 10 s during playback. Read on item open via `useOpenWithResume({ uri })`.

### 9.10 Next-up countdown (post-play)

See §3.18. Fires only in `Repeat all` mode AND when `commands.canGoNext`. Never auto-plays without the explicit `autoPlayNext` toggle being on.

### 9.11 Accessibility system integrations

- **Reduce Motion** (iOS Settings > Accessibility > Motion > Reduce Motion) — see §3.19. Subscribes to `AccessibilityInfo.isReduceMotionEnabled()`.
- **Dim Flashing Lights** (iOS 17+) — see §3.20. Surfaces the badge when the lib reports detection.
- **D-pad / hardware media keys** (Android TV / CarPlay / Bluetooth) — see §3.21. Wired to `MediaSession`.

### 9.12 WCAG 2.2 AA compliance matrix

V19 targets WCAG 2.2 AA. The verification is in §10 acceptance matrix rows; the full clause-by-clause audit is in `md/SIMBA_PLAYER_WCAG_2.2_AA_AUDIT.md` (separate document, owned by the a11y lead — not in V19 scope to author).

| WCAG clause | What V19 ships |
|---|---|
| 1.2.2 Captions (Prerecorded, A) | §3.12 track selector + §3.13 customizer; tracks labeled CC / SDH per source kind |
| 1.2.4 Captions (Live, AA) | Out of scope — SIMBA is VOD-only (deferred to V20 if live added) |
| 1.2.5 Audio Description (AA) | §3.14 AD track selector |
| 2.1.1 Keyboard (A) | §3.21 D-pad / external keyboard; every chrome control has `accessibilityRole` |
| 2.2.2 Pause, Stop, Hide (A) | All auto-playing content (Next-up countdown, auto-play next) has a 2-tap pause path |
| 2.3.1 Three Flashes (A) | §3.20 iOS 17+ flashing-light badge; lib never decodes >3 Hz flash content without warning |
| 2.4.7 Focus Visible (AA) | §3.21 visible focus ring on every interactive chrome element |
| 2.4.11 Focus Not Obscured (AA) | Chrome never overlaps the focused element; safe-area insets applied |
| 2.5.5 Target Size Enhanced (AAA) | Every chrome control ≥44×44 pt (iOS HIG baseline) |
| 2.5.8 Target Size Minimum (AA) | Every chrome control ≥24×24 pt (WCAG baseline) — we exceed this |

---

## 10. The acceptance matrix (V11 §10 extended to video)

| Test | Acceptance criterion |
|---|---|
| Open remote video | Preparing → Connecting → Playing within the network budget (≤3 s on broadband); position advances from 0 |
| Pause/resume | Native playback stops and resumes; **URI is not reloaded**; bufferedRanges unchanged |
| Remote far seek | One current-item seek; UI shows seeking then playing; thumb lands at the press position; buffer survives |
| Scrub preview | While seeking, tooltip shows timestamp pill + thumbnail (when keyframes available); no fake thumbnail |
| Cache edge | "Buffering" surfaces instead of pause; position holds steady; bufferedRanges grow from seek target forward |
| Disconnected forward ranges | Buffered fill renders only the current contiguous window; beyond-playhead islands are hidden |
| Tap-to-toggle-chrome | Single tap on frame shows chrome if hidden, hides if visible; does not pause playback |
| Tap-to-play/pause | Single tap on frame (when chrome is visible) toggles play/pause |
| Chrome auto-hide | On `playing`, chrome fades out 3 s after last input; on `paused`/`buffering`/`error`/`finished`, chrome stays visible |
| Double-tap ±10s | Left half = -10s with ripple + label; right half = +10s with ripple + label; does not conflict with single-tap |
| Vertical-swipe volume | Right-half vertical pan adjusts `setVolume()`; centered pill indicator shows current value; auto-hides 600 ms after release |
| Vertical-swipe brightness | Left-half vertical pan adjusts `Window.brightness`; same indicator pattern |
| Long-press 2× preview | 500 ms hold on frame = 2× rate; release restores prior rate; `2×` badge visible during press |
| Speed selector | More → Playback speed → single-choice from `{0.5, 0.75, 1, 1.25, 1.5, 2}`; wired to mpv `speed` |
| Quality selector | More → Quality → single-choice from `controls.videoQualityOptions`; wired to mpv quality |
| Sleep timer | More → Sleep timer → countdown starts; chrome shows "Sleeping in MM:SS" badge; reaches 0 = pause + chrome sleep message |
| Collapse/expand | Same native item, position, ended state, lane, cache; no `loadFile` is called; no fade flash |
| Natural EOF | `finished` state; Play affordance labelled "Play from beginning"; no auto replay |
| Finished mini → full | Full player opens at duration; Play label is "Play from beginning" (NOT a stale resume position) |
| Play after Finished | Explicit seek to zero + resume; no new file load |
| Repeat one | Same item restarts on demand |
| Repeat all | Next item is the next video in the queue; transition is silent (no reload flash) |
| Lane integrity | Audio `Next` never returns a video; Video `Next` never returns an audio |
| Accessibility | Every chrome control carries a state-aware label; transport uses `adjustable` with min/max; seek thumb has accessibility value; gesture-only controls have a button-equivalent |
| Responsive | Compact portrait, compact landscape, tablet portrait, tablet landscape all rendering per §7 |
| PiP | Enters and exits cleanly; no second player created; app does not collapse (Android activity in paused-but-rendering state) |
| Captions | Toggle renders only when tracks exist; selecting switches the active track on the native side |
| Secondary state | Captions, Speed, Quality, Sleep timer are immediately available through one More sheet |
| Lifecycle | App-background → PiP enter; app-foreground → PiP exit; native session survives both |
| Volume control | Compact at rest; expanded only during adjustment; vertical-swipe gesture; no permanent percentage row |
| Icon set | SVG icon set (lucide / Phosphor) — no emoji, no font-icons |
| **Subtitles vs CC vs SDH distinction** | UI labels tracks as "English (Subtitles)" / "English [CC]" / "English [SDH]" — never collapsed |
| **Caption customization** | Font size + background opacity + position persisted via AsyncStorage |
| **Audio description (WCAG 1.2.5 AA)** | AD track selector renders only when tracks exist; AD mixer wired to mpv `--audio-add` |
| **Interactive transcript** | Captions file rendered as scrollable text; current cue highlighted gold; tap-to-seek; disabled when no captions |
| **Skip silence (podcasts)** | Toggle in More; default OFF; wired to `af-add=scaletempo2=max-speed=32.0` filter |
| **Smart resume prompt** | 30%+ watched → "Resume from 12:34" with thumbnail + "Play from beginning" option; auto-dismisses 8 s; default action = Resume |
| **Post-play next-up overlay** | 10 s before EOF on Repeat all; Cancel + Play Now + countdown; auto-fires only when `autoPlayNext` toggle is ON |
| **Skip-prev smart threshold** | position > 3s → prev restarts current; <3s → prev goes to previous item; threshold configurable |
| **Reduce Motion respect** | `AccessibilityInfo.isReduceMotionEnabled()` subscribed; ripple/scrub-preview/fade-out chrome animations disabled when ON |
| **Dim Flashing Lights badge** | Renders "⚠ Flashing lights" badge when iOS reports detection; tap opens info sheet |
| **D-pad / external keyboard** | KEYCODE_DPAD_* + KEYCODE_MEDIA_* wired to MediaSession; visible gold focus ring (WCAG 2.4.7) |
| **Auto-play next** | Default OFF; toggle in More sheet; countdown only runs when ON |
| **Network change** | Wifi → cellular → offline detection; pause + "Continue on cellular data?" prompt; auto-resume on reconnect |
| **Haptic feedback** | iOS Taptic Engine on play/pause/skip; toggle in More; default ON (iOS only) |
| **WCAG 2.2 AA floor** | All clauses in §9.12 verified per the audit doc |

A unit test in this matrix failing is a release blocker.

---

## 11. Definition of done (the 5 gates)

1. The five-boundary state contract (§2) is enforced by ESLint (no cross-imports between boundaries beyond the documented direction).
2. `tsc --noEmit` passes with strict mode.
3. `jest` covers: every view state in §6, every buffer-normalization case in §4.2, every error class in §9.4, every mini/full/collapse contract in §8.1.
4. The acceptance matrix in §10 has a green check for every row on at least one device (compact phone portrait is the minimum).
5. The 1-import + 1-wrapper rule (§5) is satisfied: a junior dev can ship a working video player with `import { SimbaPlayer } from '...'`.

---

## 12. Out of scope for V19 (deferred)

These are real needs but they are not on the V19 critical path:

- **A-B loop** for language learning — needs separate UX research and is a per-feature spec, not a player refactor.
- **Live (HLS / DASH) streams** — the player should *not* seek-beyond-duration on live; this is a future `kind: 'live'` extension. V19 fails closed (Play/Pause + the duration remains "—" for live).
- **Gesture-only controls (no buttons)** — accessibility is non-negotiable; gestures are a complement, not a replacement.
- **Vertical-video / short-form Reels layout** — a different player shape; defer to V20.
- **Theme tokens unification** — every chrome primitive uses `useTheme()`'s tokens; this already exists, no per-V19 work.
- **Skip intro / skip credits / skip recap buttons** (Netflix pattern). Requires a batch fingerprinting pipeline that pre-computes chapter metadata from source video — that's a content-team workflow, not a player UI feature. When the content team ships chapter metadata in V20+, the player UI just reads `controls.chapters[]` and the button is one widget. Until then, no fake chapter strip.
- **Watch-with-friends / sync playback** — separate feature module.
- **Sign-language interpreter pin** (WCAG 1.2.6 AAA) — specialty; deferred.
- **Widevine / FairPlay / PlayReady DRM** — the lib supports it; the player UI shows a "Protected" badge when `controls.drmScheme` is non-empty. Informational only; no playback-gating UI in V19.
- **Subtitle customization beyond font size / background / position** (color, edge style, font family) — V20 (Apple TV pattern, low ROI for V19).
- **Continue Watching / Up Next carousel** across the app — cross-feature data contract only; the player UI emits `usePlayerActivity().getProgress()` and downstream screens consume it.
- **Voice-control intents** (Siri / Assistant "Hey Simba, pause") — partially available via MediaSession; dedicated intent registration is V20.
- **Smart resume deep-link** (deep-linking into a specific timestamp from a push notification) — V20; V19 supports `initialPositionMs` but the deep-link plumbing is owned by the navigation layer.
- **Live captions (WCAG 1.2.4 AA)** — out of scope for VOD-only; add when live sources are integrated.
- **Network change handling** (`NetworkChangeHandler`) — deferred to V20. Reasons: AsyncStorage-based preference system + cross-cutting listener lifecycle + harder to test in isolation. V19 ships with manual pause-only on `appStateChange`.
- **Flashing Lights badge** (iOS 17+ `Dim Flashing Lights`) — deferred to V20. Reasons: iOS-only, low priority for non-movie content, the lib's flashing-light detection hook needs more validation first.
- **Skip intro / skip credits / skip recap buttons** (Netflix pattern) — deferred to V20. Requires a batch fingerprinting pipeline that pre-computes chapter metadata from source video. That's a content-team workflow (their team owns the pipeline), not a player UI feature. When the content team ships chapter metadata in V20+, the player UI just reads `controls.chapters[]` and the button is one widget. Until then, no fake chapter strip.

---

## 13. Design references (the bar we're chasing)

V19 does not invent a video player. It ports the established patterns into SIMBA's visual system and the lib's primitive surface. Every chrome decision in §3 cites a reference below.

### 13.1 Platform guidance (the floor)

| Source | What we adopt |
|---|---|
| [Apple HIG — AVPlayerViewController](https://developer.apple.com/documentation/avkit/avplayerviewcontroller) | Title above scrubber, transport row centered, PiP affordance `canStartPictureInPictureAutomaticallyFromInline`. iOS is `AVPlayerViewController` reference; we ship a custom UI but the affordances and labels match. |
| [Apple HIG — Toolbar buttons](https://developer.apple.com/design/human-interface-guidelines/toolbars) (V11 §1 already cited this) | "Choose items deliberately to avoid overcrowding." One primary + two high-frequency secondary + one More. |
| [Android Developers — Picture-in-picture](https://developer.android.com/develop/ui/views/picture-in-picture) | Activity-level PiP (API 26+). `android:supportsPictureInPicture="true"`, `launchMode="singleTask"`, `configChanges="screenSize\|smallestScreenSize\|screenLayout\|orientation"`. `setAutoEnterEnabled(true)` on Android 12+ for auto-PiP on home press. **In PiP the activity is "paused but rendering" — the app does not collapse, but it does not receive touch.** This is the user's exact observation. |
| [Android Developers — Media3 Compose](https://developer.android.com/media/media3/ui/compose) (the `media3-ui-compose-material3` reference primitive set) | Reference primitive list: `PlayPauseButton`, `SeekBackButton`, `SeekForwardButton`, `NextButton`, `PreviousButton`, `RepeatButton`, `ShuffleButton`, `MuteButton`, `PositionAndDurationText`, `RemainingDurationText`, `ContentFrame` (aspect-ratio handling), `PlayerSurface` (wraps `SurfaceView`/`TextureView`). V19 ships a JS-equivalent for each. The lib uses libmpv, not Media3, so we cannot import the Material components — but the primitive set is the canonical reference. |
| [Material Design 3 — Material 3 Expressive (May 2025)](https://android-developers.googleblog.com/2025/05/whats-new-in-jetpack-compose.html) | Motion and shape language for chrome. The `2×` badge + scrub preview tooltip use M3's small floating surface treatment. |

### 13.2 Free Figma references (for the manager review deck)

| File | License | Use it for |
|---|---|---|
| [Figma Community — Video Player For Web & Mobile](https://www.figma.com/community/file/1255154860016123505/video-player-for-web-mobile) by Asadbek | CC BY 4.0 | Single-screen 16:9 with auto-layout — the geometry template for our full-screen layout |
| [Figma Community — Vimeo player](https://www.figma.com/community/file/1128985806466447472/vimeo-player) | CC BY 4.0 | Cinematic minimal chrome — the V11 hierarchy ported to video |
| [Figma Community — Youtube player](https://www.figma.com/community/file/781224391038982560/youtube-player) | (free) | Classic YouTube chrome hierarchy — the canonical double-tap-zone + scrub reference |
| [Figma Community — Video Player (Asadbek)](https://www.figma.com/community/file/1086683662677600814/video-player) | CC BY 4.0 | Compact transport row reference — five controls layout |

### 13.3 Real-app reference library (for inspiration, not copy)

[Mobbin — Video Player](https://mobbin.com/explore/mobile/screens/video-player) (990+ screens from real shipping apps). Spot-check three screens during W3 to anchor the chrome against Netflix, Vimeo, YouTube, and the Material3 sample. We do not copy pixels; we verify our hierarchy is at parity.

### 13.4 Pattern libraries (the gestures)

| Pattern | Source | Adopt |
|---|---|---|
| Vertical-swipe volume on right / brightness on left | [React Native Video Toolkit — Gestures](https://2004durgesh-react-native-video-toolkit.mintlify.app/guides/gestures) (YouTube-equivalent behavior) | §3.9 |
| Double-tap zones ±10s | [React Native Video Controls](https://www.npmjs.com/package/react-native-video-controls) (`doubleTapTime=130`) | §3.9 + V19 extended with ripple + label |
| Tap-anywhere + 3-second auto-hide | [mobileappdesign.io — Video player UI](https://www.mobileappdesign.io/blog/video-player-ui) (the rule: "Controls should fade after roughly three seconds of no input and return on a tap anywhere on the frame … paused players stay visible") | §3.7 |
| Long-press 2× preview | [Reddit VideoSwipes](https://www.reddit.com/r/jailbreak/comments/bj3cpi/) + Netflix hold-to-preview | §3.11 |
| Scrub preview thumbnail | Netflix mobile app, [Untitled UI Video Players](https://www.untitledui.com/components/video-players) (paid Figma kit, public reference page) | §3.8 |

### 13.5 Honest lineage (what V19 does NOT copy)

- **No copy-paste from f3c7f84a.** V19 inherits design lessons + state-boundary contract + acceptance matrix template. It does NOT inherit code.
- **No fork of `@simba-dev/react-native-media-player`.** The lib wraps libmpv + JNI; V19 wraps the lib's React-facing API.
- **No imported Media3 components.** The lib uses libmpv; Media3 components would not bind to libmpv's surface. V19's primitives are JS-equivalents.
- **No copied Figma file.** Figma Community files are geometry references for the manager review, not assets we ship.

### 13.6 Research lineage (the 2026 UI/UX + a11y pass)

These resources are the documented citations behind §3.12–3.21. They came from this research pass; the SPEC cites them where the design decision lives.

| Citation | Used in |
|---|---|
| [Apple Reduce Motion + Dim Flashing Lights](https://www.apple.com/accessibility/features/) + [Apple Support Reduce Motion](https://support.apple.com/guide/iphone/customize-onscreen-motion-iph0b691d3ed/ios) | §3.19, §3.20 |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) — clauses 1.2.2, 1.2.5, 2.1.1, 2.2.2, 2.3.1, 2.4.7, 2.4.11, 2.5.5, 2.5.8 | §9.12 + every chrome primitive |
| [WAI Media Player Guide](https://www.w3.org/WAI/media/av/player/) | §3.12 (track labels), §3.13 (customizer) |
| [WAI Transcripts](https://www.w3.org/WAI/media/av/transcripts/) | §3.15 |
| [Vexascribe Subtitles vs Captions 2026 guide](https://vexascribe.com/what-are-captions) | §3.12 (legal distinction) |
| [Rev SDH guide](https://www.rev.com/blog/sdh-subtitles-for-the-deaf-and-hard-of-hearing) | §3.12 (kind enum) |
| [mpv-skipsilence plugin](https://github.com/ferreum/mpv-skipsilence) | §3.16 (filter design) |
| [Panda Video resume playback](https://www.pandavideo.com/features/resume-playback) + [YouTube Resume pattern](https://chromewebstore.google.com/detail/youtube-resume/ofjdhidbckonobbcgogkmgkjniopcjkh) | §3.17 (thresholds) |
| [Puneet Patwari — Netflix PM skip-auto design checklist](https://www.linkedin.com/posts/puneet-patwari_a-candidate-interviewing-for-l5-netflix-activity-7468285281444548610-JElU) | §3.16 (default OFF), §3.18 (auto-fires only with toggle) |
| [Think Design — How to Design a Media Player](https://think.design/blog/how-to-design-a-media-player/) (10 principles) | §3.17, §3.18, §3.21 |
| [Android TV controllers](https://developer.android.com/training/tv/get-started/controllers) + [Android media buttons](https://developer.android.com/media/legacy/media-buttons) | §3.21 (KEYCODE_MEDIA_* mapping) |
| [Fora Soft accessibility stack](https://www.forasoft.com/learn/audio-for-video/articles-audio/accessibility-captions-audio-description-stack) | §3.14 (AD mixer) |

---

## 14. References

- f3c7f84a (V11 audio) — `manus: audio player improved` — the source of V19's visual hierarchy + state-boundary contract + acceptance matrix template.
- `MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` — the native bridge contract this V19 inherits.
- `MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V18_SPECIFICATION.md` — the API adapter layer; V19 keeps that intact.
- `@simba-dev/react-native-media-player` docs — the npm module that V19 wraps, not forking.
- §13 above — every V19 chrome primitive cites its platform / Figma / Mobbin source.

---

**End of V19 specification.**
