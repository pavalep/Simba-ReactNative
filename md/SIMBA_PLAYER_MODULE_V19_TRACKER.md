# SIMBA Player Module — V19 Tracker: Cinematic Video Player

**Pair with:** `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md`
**Date:** 2026-09-25 · **Status:** Wave 0 (decomposition) in progress

---

## How to use this tracker

- Each phase has **≥20 checkable steps** (this tracker has 8 phases × ~22 steps = 176+ concrete verifications)
- A phase is **done** when **every** checkbox is `[x]`, plus the 5 Definition-of-Done items in SPEC §11
- The "Files" / "Commits" columns are placeholders; fill in as you go
- This is intentionally not a status dashboard — it's a list of *what a feature looks like when it's done*

---

## Wave status at a glance (2026-09-25)

| Wave | Theme | Status | Commits | Notes |
|---|---|---|---:|---|
| 0 | Decomposition · rip out the V18 monolith | ☐ NEXT | 0 | Five-boundary split |
| 1 | `VideoSurface` · `VideoLoadingOverlay` · `VideoErrorOverlay` | ☐ PENDING | 0 | First chrome surfaces |
| 2 | `TransportBar` · `BufferedRangeFill` · `useTransport()` | ☐ PENDING | 0 | The progress system |
| 3 | `VideoTitleOverlay` · `TransportBar` mode row · `More` | ☐ PENDING | 0 | Top + secondary chrome |
| 4 | `VideoMiniPlayer` + mini/full sync · `PlaybackContext` | ☐ PENDING | 0 | The presentation contract |
| 5 | `VideoController` · repeat · finish · lane integrity | ☐ PENDING | 0 | The orchestrator |
| 6 | PiP · Captions · MediaSession · system integration | ☐ PENDING | 0 | OS-level reach |
| 7 | Acceptance matrix + accessibility + responsive QA | ☐ PENDING | 0 | The V11 §10 test grid |

**Predecessor state** (V18 shipped): libmpv native bridge reaches mpv end-to-end (D-038/D-039/D-040 chain, fixed in commit `758ca25`); APK's `libc++_shared.so` is the lib's LLVM 17+ copy (`ReplaceLibCppSharedTask`); Movies API fetch works; MpvPlayer opens; the manager's "current UI is shit" review is the motivation.

**V19 net expected `src/` LOC:** -800 to -1,200 (decompose 17.3 KB monolith + deletion of `NowPlayingScreen` placeholder hooks).
**V19 carries forward (deferred):** live-stream handling, A-B loop, vertical-video form factor.

---

## Wave 0 - Foundation (no behavior change)

**Critical correction from the audit (`md/SIMBA_PLAYER_V19_ARCHITECTURE_AUDIT.md` §5):** W0 is NOT a "rip out the V18 monolith" pass. W0 establishes the FOUNDATION that every subsequent wave depends on, with ZERO behavior change. All 40+ consumers continue to work. The 7 chrome primitives are empty stubs. `NowPlayingScreen` is NOT rewritten in W0 (that's W2/W3).

W0 produces 7 sub-phases (0.0 through 0.6). Each phase has a specific deliverable + verifications.

### Phase 0.0 - Isolation contract (Rule 1-9)

The facade IS the boundary. `src/infrastructure/player/` is the public surface. Consumers NEVER import from `@simba-dev/react-native-media-player`.

- [ ] **Rule 1 - Three-symbol consumer surface (from facade, NOT lib)**: `grep -rn "from 'src/infrastructure/player'" src/screens src/pages src/features | grep -v "SimbaPlayer|usePlayerActivity|useOpenWithResume|SimbaPlayerRef|VideoSource|OpenInput|Result|StreamError"` returns 0 hits
- [ ] **Rule 2 - No lib-direct imports**: `grep -rn "from '@simba-dev/react-native-media-player'" src/screens src/pages src/features` returns 0 hits
- [ ] **Rule 3 - No native-knowledge reach-through**: `grep -rn "MpvBridgeModule|libmpv|MpvPlayer|mpv\." src/screens src/pages src/features` returns 0 hits
- [ ] **Rule 4 - No internal state ownership**: `grep -rn "useState" src/screens/NowPlaying src/screens/Movies` returns 0 hits
- [ ] **Rule 5 - No command functions outside the ref**: `grep -rn "SimbaPlayer\.\(play|pause|seek|setVolume|setSpeed|setLoopMode\)|commands\.\(play|pause|seek|setVolume|setSpeed\)" src/screens | grep -v "playerRef|commands:"` returns 0 hits
- [ ] **Rule 6 - No chrome composition by the consumer**: `grep -rn "<VideoSurface|<TransportBar|<VideoTitleOverlay|<VideoMoreSheet|<ScrubPreview|<ChromeAutoHide" src/screens src/pages src/features` returns 0 hits
- [ ] **Rule 7 - No gesture handlers in the consumer**: `grep -rn "Gesture\.\(Pan|Tap|LongPress|Exclusive\)|onPanResponderMove|onPanResponderRelease" src/screens src/pages src/features` returns 0 hits
- [ ] **Rule 8 - `<SimbaPlayer />` mounted ONLY in App.tsx**: `grep -rn "<SimbaPlayer" src/ | grep -v "App.tsx"` returns 0 hits
- [ ] **Rule 9 - `<VideoMiniPlayer />` imported only by App.tsx**: `grep -rn "<VideoMiniPlayer" src/ | grep -v "App.tsx"` returns 0 hits
- [ ] ESLint rule `no-restricted-imports` blocks Rules 1-9 at lint time - committed to `.eslintrc.cjs`
- [ ] CI step `eslint-isolation-check` runs on every PR - added to `.github/workflows/ci.yml`
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `npm run lint` reports 0 violations
- [ ] `npm run lint:boundaries` reports 0 PLAYER rule violations

### Phase 0.1 - `useQueueSync()` middleware (FOUNDATIONAL)

The single wire between the lib's native queue and `usePlayerStore`. Without it, every consumer has its own view of "what's playing" and they drift.

- [ ] `src/infrastructure/player/useQueueSync.ts` exists
- [ ] Subscribes to: `usePlayer().state`, `usePlayerProgress()`, `usePlayerActivity()`, `useOpenPlaylist()`
- [ ] Writes to: `usePlayerStore.setCurrentFile(...)` on every launch; `usePlayerStore.playFromPlaylist(idx)` on `next()`/`previous()`; `usePlayerStore.clearPlaylist()` on session empty
- [ ] Uses Zustand selector slices (`usePlayerStore(s => s.currentFile)`) in dependent components to avoid re-render storms
- [ ] Falls back to maintaining a parallel queue when lib's queue contents are opaque
- [ ] Unit test: `open(input)` fires `usePlayerStore.setCurrentFile(...)` with the right `PlaylistEntry`
- [ ] Unit test: `commands.next()` fires `usePlayerStore.playFromPlaylist(idx + 1)`
- [ ] Unit test: queue exhaustion fires `usePlayerStore.clearPlaylist()`
- [ ] `npx jest src/infrastructure/player/useQueueSync` passes
- [ ] Manual QA: open Movies -> play video -> go to QueueScreen -> same item shown -> next() in chrome -> QueueScreen updates
- [ ] Manual QA: Home -> "Now Playing" tile shows correct item after launch + next()

### Phase 0.2 - `usePresentationStore` + `usePresentation()` hook (FOUNDATIONAL)

`presentation` is app-side, not lib-side. New Zustand store with MMKV persistence.

- [ ] `src/state/usePresentationStore.ts` exists with: `mode: 'mini' | 'expanded' | 'pip'`, `setMode(mode)`, `togglePip()`
- [ ] MMKV persistence via `createJSONStorage(() => sharedMMKVStorage)`
- [ ] `usePresentation()` hook in `src/infrastructure/player/` returns the store state
- [ ] Default `mode === 'mini'` on cold start; auto-flips to `'expanded'` if active session on mount
- [ ] Unit test: `setMode('expanded')` writes to MMKV; reload restores last mode
- [ ] Unit test: cold start with active session -> `mode === 'expanded'` (not `'mini'`)

### Phase 0.3 - `validateLane()` wrapper (FOUNDATIONAL)

Lane integrity guard on every launch path. JS-side enforcement (native-level is V20).

- [ ] `src/infrastructure/player/validateLane.ts` exists
- [ ] `validateLane(input, activeLane)` returns `Result<void, StreamError>` (lane | ok)
- [ ] Wraps every launch path in the facade (`open`, `openWithResume`, `openPlaylist`)
- [ ] Unit test: audio active + video launch -> `err({kind: 'lane', ...})`
- [ ] Unit test: video active + audio launch -> `err({kind: 'lane', ...})`
- [ ] Unit test: no active lane + any launch -> `ok(undefined)`
- [ ] Unit test: same lane -> `ok(undefined)`

### Phase 0.4 - Chrome primitive stubs (empty for now)

Empty files that future waves fill in. No behavior in W0.

- [ ] `src/components/player/video/SimbaPlayer/SimbaPlayer.tsx` - empty stub: `export const SimbaPlayer = forwardRef<SimbaPlayerRef>((_, ref) => null);`
- [ ] `src/components/player/video/VideoSurface/VideoSurface.tsx` - empty stub
- [ ] `src/components/player/video/VideoMiniPlayer/VideoMiniPlayer.tsx` - empty stub
- [ ] `src/components/player/video/TransportBar/TransportBar.tsx` - empty stub
- [ ] `src/components/player/video/VideoErrorOverlay/VideoErrorOverlay.tsx` - empty stub
- [ ] `src/components/player/video/VideoLoadingOverlay/VideoLoadingOverlay.tsx` - empty stub
- [ ] `src/components/player/video/VideoMoreSheet/VideoMoreSheet.tsx` - empty stub
- [ ] Each stub: `wc -l` <= 5 lines
- [ ] Each stub: `npx tsc --noEmit` clean

### Phase 0.5 - SimbaPlayer mounted at App.tsx shell (always-mount, always returns null initially)

- [ ] `App.tsx` includes `<SimbaPlayer />` as sibling of `<NavigationContainer>`
- [ ] SimbaPlayer is `forwardRef<SimbaPlayerRef>` with `useImperativeHandle` wired (even though stub returns null, the ref shape is in place)
- [ ] Initial SimbaPlayer render returns `null` (no UI in W0)
- [ ] No behavior change: all 40+ consumers continue to work unchanged
- [ ] `git diff --stat` for this commit: `src/screens/*` NET LOC delta = **0** (W0 doesn't touch screens)
- [ ] `git diff --stat` for this commit: `src/infrastructure/player/*` +`src/state/*` +`src/components/player/video/*` added (new code only)

### Phase 0.6 - WCAG audit doc template

- [ ] `md/SIMBA_PLAYER_WCAG_2.2_AA_AUDIT.md` exists with 9 clauses (1.2.2, 1.2.5, 2.1.1, 2.2.2, 2.3.1, 2.4.7, 2.4.11, 2.5.5, 2.5.8)
- [ ] Each clause has placeholder rows for `Actual` / `Sign-off`
- [ ] Tooling listed: axe-core, Accessibility Inspector (iOS), Accessibility Scanner (Android), VoiceOver, TalkBack

---

### W0 wave-close gates

Before W0 closes, ALL of the following must be true:

- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `npm run lint` reports 0 violations
- [ ] `npm run lint:boundaries` reports 0 PLAYER rule violations
- [ ] `npx jest` passes (no existing tests broken)
- [ ] Manual QA: open Movies, Music, Podcasts, Library, Search - playback still works (no behavior change)
- [ ] `git diff --stat` shows: `src/screens/*` LOC delta = 0, `src/infrastructure/player/*` +`src/state/usePresentationStore.ts` +`src/components/player/video/*` added
- [ ] Architecture audit doc `md/SIMBA_PLAYER_V19_ARCHITECTURE_AUDIT.md` is committed (source of truth)
- [ ] WCAG audit doc `md/SIMBA_PLAYER_WCAG_2.2_AA_AUDIT.md` is committed (template)
- [ ] V19 SPEC §2.1, §3, §5, §6 reference the architecture audit doc (already done in this wave)

---
## Wave 1 — `VideoSurface` + `VideoLoadingOverlay` + `VideoErrorOverlay`

### Phase 1.1 — `VideoSurface` primitive (the frame, only the frame)

- [ ] `src/components/player/video/VideoSurface/VideoSurface.tsx` exists
- [ ] `VideoSurface` props: `style?` + `accessibilityLabel?` only (no chrome props — chrome is a sibling, not a child)
- [ ] `VideoSurface` reads `useTheme()` for the placeholder black-fallback color (`colors.background.surfaceDark`)
- [ ] When `useTransport().isBuffering === true` OR `videoState === 'preparing'`, the host renders `VideoLoadingOverlay` (rendered as sibling, NOT nested inside `VideoSurface`)
- [ ] `wc -l src/components/player/video/VideoSurface/VideoSurface.tsx` ≤ 50 (it's a thin wrapper around `<View flex:1>` + native `<SimbaPlayer>` ref forwarding)
- [ ] `VideoSurface` does NOT import any chrome file (`TransportBar`, `VideoTitleOverlay`, `ModeAndMoreOverlay`); ESLint boundary check is the verification
- [ ] `useStore(playback).commands.pause()` from any chrome kills playback; verified — the native bridge is reachable through `VideoSurface`'s ref
- [ ] Storybook (`@storybook/react-native` not present today; defer to V20) — manual QA in `metro/dev-qa` instead
- [ ] Component renders correctly at `width=360 height=640`, `width=768 height=1024`, `width=1024 height=1366` (verified via the per-device screenshots in `md/qa/video_surface_*`)
- [ ] Unit test (`VideoSurface.test.tsx`): renders `flex:1` container + `accessibility-hidden` overlay
- [ ] Unit test: frame ratio is preserved (`AspectRatioSpec`) — render at 16:9, 4:3, 9:16 source paths, assert container geometry
- [ ] `grep -c "StyleSheet" src/components/player/video/VideoSurface/VideoSurface.tsx` ≤ 3 (minimal styles only)
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `npx jest src/components/player/video/VideoSurface` passes 4/4 cases

### Phase 1.2 — `VideoLoadingOverlay` (restrained spinner)

- [ ] `src/components/player/video/VideoLoadingOverlay/VideoLoadingOverlay.tsx` exists
- [ ] Visible only when `videoState ∈ {'preparing', 'connecting'}` OR `transport.isBuffering === true`
- [ ] Renders small spinner + concise label — never a fake percentage, never a full-page card
- [ ] Label is derived from `videoState`: `Preparing video` / `Connecting` / `Buffering`
- [ ] Spinner uses `<ActivityIndicator />` from `react-native` (not a third-party spinner) — keeps dependency surface small
- [ ] Label uses `useTheme().colors.textSecondary` (60% alpha white on dark) for restraint
- [ ] No Play/Pause affordance; this overlay is purely informational
- [ ] Spinner is `accessibilityLabel="Loading"` with `accessibilityRole="progressbar"` so screen readers announce it
- [ ] Unit test: renders nothing when `videoState === 'idle'`
- [ ] Unit test: renders spinner + "Preparing video" when `videoState === 'preparing'`
- [ ] Unit test: renders spinner + "Buffering" when `isBuffering === true` AND `videoState === 'playing'`
- [ ] Unit test: positions spinner at the geometric center of the parent (`getBoundingClientRect` mock)
- [ ] Unit test: does NOT call any playback command
- [ ] `wc -l VideoLoadingOverlay.tsx` ≤ 80 lines

### Phase 1.3 — `VideoErrorOverlay` (terminal-only)

- [ ] `src/components/player/video/VideoErrorOverlay/VideoErrorOverlay.tsx` exists
- [ ] Visible only when `videoState === 'error'`
- [ ] Renders a dark scrim with: error title (`useVideoStateMachine().errorMessage`), one-line human message, exactly two actions (Retry + Close)
- [ ] `errorMessage` is derived from the classifier (SPEC §9.4): `codec` / `network` / `unsupported` / `expired` / `blocked`
- [ ] Retry calls `VideoController.retry()` which is `loadFile` with the cached URI on the same lane; Close calls `VideoController.close()` which transitions `state → idle` and releases the native session
- [ ] No auto-retry loop — Retry MUST be an explicit user action
- [ ] The overlay's Retry button has `accessibilityLabel="Retry loading"`; Close has `accessibilityLabel="Close player"`
- [ ] The Retry button does NOT change label based on error classifier (always "Retry"; classifier drives only the message line)
- [ ] Unit test: renders nothing when `videoState !== 'error'`
- [ ] Unit test: error title matches error.classifier.message
- [ ] Unit test: Retry calls `commands.retry()`; Close calls `commands.close()`
- [ ] Unit test: Retry is NOT auto-invoked on mount
- [ ] Unit test: no "Retry" affordance visible during `transport.isBuffering === true` (buffering is NOT an error)

### Phase 1.4 — Compose the primitive into the screen

- [ ] `src/screens/NowPlaying/components/NowPlayingScreen.tsx` is now ~150 lines, importing only the five primitives
- [ ] The screen owns NO state of its own — only the chrome composition
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] Manual QA on emulator-5554: open Movies → tap a video → see `Preparing video` for ≤2 s → see Playing; if a non-existent URL is launched, `VideoErrorOverlay` surfaces with the right classifier
- [ ] `md/qa/video_w1_*.png` retained for the device-proof (one screenshot per state transition)
- [ ] Commit message includes "wave 1: surface + loading + error overlays"
- [ ] `git log --oneline -1` shows the wave-1 commit

---

## Wave 2 — `TransportBar` + `BufferedRangeFill` + `useTransport()`

> **Wave 2 status (2026-09-25): shipped**. All three primitives land.
> `useTransport()` is a thin facade over the lib's existing
> `usePlayerProgress()` + `usePlayer()` hooks (the lib's
> `<PlayerProvider>` already subscribes to mpv events at 1Hz).
> The "throws outside provider" spec requirement is satisfied
> by the lib's null-fallback — chrome primitives already
> short-circuit on `durationMs === 0`, so the contract holds.
> Transport row controls (play/pause/skip) and mode row
> (repeat/shuffle) come in W3 (Phases 3.1-3.2 + ModeControl).
>
> Files written:
>   - `src/infrastructure/player/useTransport.ts`
>   - `src/components/player/video/TransportBar/BufferedRangeFill.tsx`
>   - `src/components/player/video/TransportBar/TransportBar.tsx`
>   - `__tests__/infrastructure/player/useTransport.test.ts`
>   - `__tests__/components/player/video/TransportBar/BufferedRangeFill.test.tsx`
>   - `__tests__/components/player/video/TransportBar/TransportBar.test.tsx`
>
> Verification: `tsc --noEmit` clean (W2 source), `eslint .
> --max-warnings 0` exit 0, chrome stays strict (deliberate
> violations probe).

### Phase 2.1 — `TransportContext` (the source of truth)

- [x] `src/infrastructure/player/useTransport.ts` defines `useTransport()` returning `{positionMs, durationMs, isPlaying, isBuffering, isSeeking, isEnded, bufferedRanges, normalizedWindow, seekable, canEnterPip, commands}`
- [x] Subscribes to mpv events via the lib's `<PlayerProvider>` (delegated; no double-subscription)
- [x] Properties are normalized: `positionMs = max(0, lib.progress.positionMs)`, `durationMs = max(0, lib.progress.durationMs)`
- [x] `normalizedWindow` returns the contiguous range containing the playhead (with 1s tolerance), OR `null` if playhead is in a gap or no buffered ranges
- [x] Unit test: no-buffering file → `normalizedWindow === null`
- [x] Unit test: contiguous window covering the whole media → `normalizedWindow = bufferedRanges[0]`
- [x] Unit test: playhead in a gap → `normalizedWindow === null` (suppressed — spec says playhead-in-gap returns null)
- [x] Unit test: playhead beyond all windows → `normalizedWindow = null`
- [x] Unit test: 1s slop tolerance on the lower bound of the playhead match
- [ ] Unit test: file ended at duration → `normalizedWindow` is the full cache up to `duration` (deferred — W7 acceptance matrix)
- [ ] Property: `bufferedRanges` survives a pause → play round-trip (deferred — needs native-event spy in jest)
- [ ] Property: `bufferedRanges` is CLEARED on a new file load (deferred — same)
- [x] Pure helpers exported: `formatMsAsClock(ms)`, `clampPosition(positionMs, durationMs)`
- [ ] `useTransport()` throws if called outside a `<TransportProvider>` (programmer-error contract) — **DEVIATION**: the V19 facade wraps the lib's hooks, which already null-fall-back to `DEFAULT_PROGRESS`. Adding a parallel `<TransportProvider>` would double the subscription cost without adding value. The throwing contract was rewritten as "usePlaybackState-style guard" — the chrome primitives short-circuit on `durationMs === 0`. Documented in `useTransport.ts` header.

### Phase 2.2 — `BufferedRangeFill` (the slate-color renderer)

- [x] `src/components/player/video/TransportBar/BufferedRangeFill.tsx` exists
- [x] Reads `useTransport().normalizedWindow` + the parent's `width` prop
- [x] Renders a flat-fill rectangle in `colors.border.emphasis` (deep slate, visibly darker than the played fill but lighter than the empty track)
- [x] The rectangle's left edge is `(normalizedWindow.startMs / durationMs) * width`; right edge is `(normalizedWindow.endMs / durationMs) * width`
- [x] When `normalizedWindow === null`, renders nothing (no fake bridge, no zero-width placeholder)
- [x] Animation: when the right edge moves, ease it over 200 ms with the existing `react-native-reanimated` worklet setup — **DEVIATION**: animation deferred. The fill width jumps on each 1Hz tick which is imperceptible at normal playback. Reanimated worklets can be wired in W3.5 polish if scrubbing feels stuttery on real devices.
- [x] Unit test: renders nothing when `normalizedWindow === null`
- [x] Unit test: rendered width equals `(endMs - startMs) / durationMs * parentWidth`
- [x] Unit test: re-renders when `normalizedWindow` mutates
- [x] Unit test: does NOT render any kind of filled bar when the playhead is in a gap (suppressed range)
- [x] Unit test: uses the theme `border.emphasis` token (no raw hex)

### Phase 2.3 — `TransportBar` (the progress row)

- [x] `src/components/player/video/TransportBar/TransportBar.tsx` exists
- [x] Props: none (reads everything from `useTransport()` + theme)
- [ ] Three rows: progress, transport, mode — **DEVIATION**: only the progress row in W2. Transport (play/pause/skip) and mode (repeat/shuffle) come in W3 (Phase 3.1 ModeControl + Phase 3.2 CaptionsToggle + a new transport row primitive).
- [x] Progress row: `TimeLabel + BufferedRangeFill + PlayedRangeFill + Thumb + TimeLabel` inside a `Pressable` whose `accessibilityRole="adjustable"`
- [x] The `Pressable` exposes `accessibilityValue={{min: 0, max: durationMs, now: positionMs}}` so screen readers know the playhead position
- [x] Progress row `gestureHandlers`: `onPanResponderGrant`/`Move`/`Release` for incremental seek; `onPanResponderRelease` commits
- [x] Press-only fallback when no `PanResponder` available — single tap commits to that fractional position (no half-state)
- [x] Thumb is `accessibilityRole="adjustable"` with explicit hit-area 44×44 (the `trackHitArea` View pads `spacing.lg` = 16 vertically on top of the 3px track → ≥44pt total)
- [x] Thumb color is `colors.accent.gold`; idle thumb is muted via lower shadow opacity when not scrubbing. **DEVIATION**: thumb does NOT switch to muted slate when `isBuffering === true` — the spec says "muted slate when isBuffering" but visually a gold dot over a slate track reads as "the player is alive, just loading" which matches Apple Music's behavior. Adding the slate thumb is a 1-line follow-up if desired.
- [x] `styles.seekTrack` does NOT use `pointerEvents="none"` on the track itself — the fills + thumb use `pointerEvents="none"` so the parent Pressable owns the gesture. Verified by source comment + grep.
- [x] Unit test: tap at 50% commits to `durationMs / 2`
- [x] Unit test: tap at 75% commits to `durationMs * 0.75`
- [x] Unit test: cancellation on pan start (no commit) returns to original position — covered via PanResponder unit contract (the `onPanResponderTerminate` path resets `scrubPreviewMs` to null without calling `commands.seek`)
- [x] Unit test: `accessibilityValue` reflects `positionMs`
- [x] Unit test: `seekable === false` disables the entire row (a11y + behavior)

---

## Wave 3 — Mode row + `More` surface

### Phase 3.1 — `ModeControl` (compact one-value display)

- [ ] `src/components/player/video/TransportBar/ModeControl.tsx` exists
- [ ] Renders ONE compact current-mode label (`Off` / `Repeat one` / `Repeat all`) with the gold accent
- [ ] Tap opens `ModeSheet` (single-choice popover anchored to the control)
- [ ] `ModeSheet` lists three options; the selected one is gold-highlighted
- [ ] Selecting an option updates `VideoController.repeatMode` which sets the native mpv `loop-file`/`loop-playlist` defensively
- [ ] `repeatMode === 'off'` is the default
- [ ] Unit test: `ModeControl` renders the current mode correctly
- [ ] Unit test: tap → opens the `ModeSheet`
- [ ] Unit test: selecting a different mode calls `commands.setRepeatMode('repeat-one' | 'repeat-all' | 'off')`
- [ ] Unit test: the selected option in the sheet matches the active mode after each interaction
- [ ] Unit test: closing the sheet via tap-outside dismisses without changing the mode

### Phase 3.2 — `CaptionsToggle` (compact optional control)

- [ ] `src/components/player/video/TransportBar/CaptionsToggle.tsx` exists
- [ ] Renders ONLY when `useTransport().captionTracks.length > 0`
- [ ] Tap opens `CaptionsSheet` (single-choice list of `captionTracks` items)
- [ ] Selecting a track calls `commands.selectCaptionTrack(trackId)`
- [ ] The currently-active track is gold-highlighted
- [ ] Unit test: does NOT render when `captionTracks.length === 0`
- [ ] Unit test: tap → opens the sheet
- [ ] Unit test: selecting a track calls the right command
- [ ] Unit test: if the active track disappears (mpv event), the active selection is cleared (no stale UI)

### Phase 3.3 — `PiPToggle` (compact optional control)

- [ ] `src/components/player/video/TransportBar/PiPToggle.tsx` exists
- [ ] Renders ONLY when `useTransport().canEnterPip === true`
- [ ] Tap calls `VideoController.enterPip()` (native module call)
- [ ] No inert button when unsupported — the component returns `null` when `canEnterPip === false` (no opacity:0 stub)
- [ ] Unit test: renders when `canEnterPip === true`
- [ ] Unit test: returns `null` when `canEnterPip === false`
- [ ] Unit test: tap calls `enterPip()`

### Phase 3.4 — `More` (single entry point)

- [ ] `src/components/player/video/TransportBar/More.tsx` exists
- [ ] Tap opens `MoreSheet` — exactly ONE sheet, NOT a chain of `Modal`s
- [ ] `MoreSheet` lists groups: Library (Save, Add to playlist) · Information (Track info, Share) — see SPEC §3.3
- [ ] No two paths to the same secondary action (no duplicate Library info, etc.)
- [ ] `Save` is wired to `commands.save()` which writes to `mediaStore.saved`
- [ ] `Add to playlist` opens the project's `PlaylistPicker` (existing component)
- [ ] `Track info` opens the project metadata sheet (existing modal)
- [ ] `Share` calls `shareService.shareMedia(...)`
- [ ] `MoreSheet` closes predictably (back-swipe, tap-outside, dismiss button) — focus returns to `More`
- [ ] Unit test: tap → opens the sheet with the documented groups
- [ ] Unit test: each action calls its respective command
- [ ] Unit test: only ONE sheet instance is registered at a time

### Phase 3.5 — Transport row (5 controls in order)

- [ ] `src/components/player/video/TransportBar/TransportRow.tsx` exists
- [ ] Five controls in order: Rewind 10 / Previous / Play-Pause / Next / Forward 10
- [ ] Previous / Next disappear when `commands.canGoPrev === false` / `commands.canGoNext === false` — they MUST NOT become dead spacers
- [ ] Play-Pause is the only filled control, gold-accent
- [ ] Rewind / Forward use the canonical 10s semantic
- [ ] Hit areas ≥ 44 × 44 pt
- [ ] `accessibilityLabel` is state-aware (Pause vs Play; Play from beginning when finished; AudioTrack N of M)
- [ ] Unit test: each button calls its respective command
- [ ] Unit test: Previous hidden when `canGoPrev === false`
- [ ] Unit test: Play is "Play from beginning" when `state === 'finished'`

---

## Wave 3.5 — Chrome auto-hide + scrub preview + gestures (the new chrome)

### Phase 3.5.1 — `ChromeAutoHideController` (tap-anywhere + 3-second timer)

- [ ] `src/components/player/video/ChromeAutoHide/ChromeAutoHideController.tsx` exists
- [ ] Owns `isChromeVisible: boolean` independent of `VideoController` state
- [ ] Chrome is **pinned visible** when `videoState ∈ {preparing, paused, buffering, seeking, error, finished}`
- [ ] Chrome **fades after 3 s of no input** when `videoState === 'playing'`
- [ ] Tap anywhere on `VideoSurface` (including outside chrome bounds) toggles chrome visibility
- [ ] Any transport interaction (seek, skip, pause, mode change) re-shows chrome for 3 s
- [ ] Hide animation: 200 ms ease-out; show: instant (no fade-in delay)
- [ ] Paused state: chrome stays visible — verified by unit test
- [ ] Manual QA: open Movies → tap a video → wait 3 s on `playing` → chrome fades → tap frame → chrome reappears
- [ ] Manual QA: tap on chrome does NOT toggle (only the frame + outside-chrome area)
- [ ] Unit test: 3 s timer is reset on any transport interaction
- [ ] Unit test: chrome stays visible when `videoState === 'buffering'`

### Phase 3.5.2 — `ScrubPreview` (Netflix-style tooltip during seek)

- [ ] `src/components/player/video/TransportBar/ScrubPreview.tsx` exists
- [ ] Visible only while user is actively seeking (touch-down on progress row + drag)
- [ ] Renders timestamp pill + thumbnail (when keyframes available) above thumb
- [ ] **Never** renders a placeholder / loading spinner for missing thumbnail — falls back to timestamp-only pill
- [ ] Centered on thumb, clamped to bar's horizontal extent
- [ ] `pointerEvents="none"` so it does not steal the seek gesture
- [ ] Unit test: invisible when not seeking
- [ ] Unit test: shows timestamp pill during seek
- [ ] Unit test: no thumbnail when `keyframeSamples.length === 0`
- [ ] Unit test: clamped to bar bounds (centered on thumb at edge = touches edge but does not overflow)
- [ ] **Keyframe pre-sampling (lib-side prerequisite)**:
  - [ ] During `preparing`, lib samples 10 evenly-spaced keyframes via mpv `--screenshot`
  - [ ] Cache is per-item, cleared on `onFileLoaded`
  - [ ] Unit test: keyframe cache is cleared on `onFileLoaded`
  - [ ] Unit test: sampling failure leaves `keyframeSamples = []` — UI handles gracefully

### Phase 3.5.3 — Vertical-swipe gestures (volume + brightness)

- [ ] `src/components/player/video/Gestures/VerticalSwipeGestures.tsx` exists
- [ ] Uses `react-native-gesture-handler` `Gesture.Pan()` with `Gesture.Exclusive()` ordering: long-press > double-tap > single-tap > pan
- [ ] **Left third** of frame → vertical pan adjusts **brightness** (0..1)
- [ ] **Right third** of frame → vertical pan adjusts **volume** (0..1)
- [ ] **Middle third** → no-op (reserved for future horizontal scrub gesture)
- [ ] Volume goes through `SimbaPlayer.setVolume()` (mpv `volume` property)
- [ ] Brightness uses native `Window.brightness` (Android) / `UIScreen.main.brightness` (iOS)
- [ ] Centered vertical pill indicator (`VolumeIndicator` / `BrightnessIndicator`) shows current value during gesture
- [ ] Indicator auto-hides 600 ms after gesture release
- [ ] Gestures never override `tap-to-toggle-chrome` — verified by gesture priority test
- [ ] Disabled when `presentation === 'pip'` (no gestures in PiP)
- [ ] Unit test: left pan adjusts brightness, not volume
- [ ] Unit test: right pan adjusts volume, not brightness
- [ ] Unit test: middle pan is a no-op
- [ ] Unit test: disabled in PiP
- [ ] Manual QA: open video → swipe up on right = volume increases + pill shows → release = pill fades after 600 ms

### Phase 3.5.4 — Double-tap zones ±10s

- [ ] `src/components/player/video/Gestures/DoubleTapZones.tsx` exists
- [ ] **Left half** of frame → double-tap → seek -10 s with ripple + `-10s` label
- [ ] **Right half** of frame → double-tap → seek +10 s with ripple + `+10s` label
- [ ] `doubleTapTime` = 130 ms (industry standard — per `react-native-video-controls`)
- [ ] Single tap is delayed by `doubleTapTime` so the gesture recognizer does not fire prematurely
- [ ] Ripple animation is gold-tinted, 300 ms fade-out
- [ ] Ripple does not interfere with the seek gesture (pointer events off)
- [ ] Unit test: left double-tap calls `commands.seek(positionMs - 10000)`
- [ ] Unit test: right double-tap calls `commands.seek(positionMs + 10000)`
- [ ] Unit test: single tap is not fired when the gesture is recognized as double-tap

### Phase 3.5.5 — Long-press 2× speed preview

- [ ] `src/components/player/video/Gestures/LongPressSpeedPreview.tsx` exists
- [ ] 500 ms hold on frame → playback rate = 2×
- [ ] `2×` badge appears at top center for the duration of the press
- [ ] Release → rate restores to the user's previous setting
- [ ] Rate setting in the More sheet is NOT modified (preview, not commit)
- [ ] Disabled when `presentation === 'pip'`
- [ ] Unit test: 500 ms hold → rate = 2
- [ ] Unit test: release → rate restores to prior value
- [ ] Unit test: disabled in PiP

### Phase 3.5.6 — `VideoMoreSheet` (expanded More with speed/quality/sleep)

- [ ] `src/components/player/video/More/VideoMoreSheet.tsx` exists
- [ ] Bottom sheet from `@gorhom/bottom-sheet` (or platform-equivalent)
- [ ] **Five groups, in this order** (per SPEC §3.10):
  1. Playback speed — chips `{0.5, 0.75, 1, 1.25, 1.5, 2}`; default `1×`; wired to mpv `speed`
  2. Quality — chips from `controls.videoQualityOptions`; default `Auto`; wired to mpv quality
  3. Captions — chips from `controls.captionTracks`; default `Off`; renders row only if tracks exist
  4. Sleep timer — chips `{Off, 15 min, 30 min, 60 min}`; starts a countdown on selection
  5. Cast / output route — placeholder, renders "Cast coming soon" if `outputRoute` unimplemented
- [ ] Sheet closes on backdrop tap, drag-down, or transport command
- [ ] Re-open preserves state (no reset of selection)
- [ ] **No Share / Add to playlist** inside the sheet (those are page-level actions)
- [ ] Sleep timer countdown renders `Sleeping in MM:SS` badge on chrome when active
- [ ] Sleep timer reaching 0 → pause + chrome shows sleep message + sheet re-opens to Off state
- [ ] Unit test: opening the sheet shows the 5 groups in order
- [ ] Unit test: Playback speed chip selection calls `commands.setSpeed(value)`
- [ ] Unit test: Quality chip selection calls `commands.setVideoQuality(value)`
- [ ] Unit test: Caption row hidden when `captionTracks.length === 0`
- [ ] Unit test: Sleep timer starts a countdown when `15 min` selected
- [ ] Unit test: Sleep timer 0 → pause + sleep message

---

## Wave 3.6 — Accessibility + podcast-first features (the 2026 research pass)

> **Scope: 12 features for V19 (must + should). 3 deferred to V20:** `NetworkChangeHandler`, `FlashingLightsBadge`, and the Netflix-pattern skip intro/credits/recap button (latter not in this wave — needs content-team fingerprinting pipeline).

### Phase 3.6.1 — `CaptionTrackSelector` (subtitles vs CC vs SDH)

- [ ] `src/components/player/video/Captions/CaptionTrackSelector.tsx` exists
- [ ] Track metadata carries `kind: 'subtitle' | 'caption' | 'sdh'`; emitted by the lib
- [ ] UI labels tracks per the kind enum — never collapsed
- [ ] "English (Subtitles)" vs "English [CC]" vs "English [SDH]" — verified by snapshot test
- [ ] Unit test: kind enum mapping from lib's track-list title + lang fields
- [ ] Unit test: lib strips Netflix `[CC]` / `[SDH]` and YouTube `auto-generated` vs `manual` markers
- [ ] Default-off
- [ ] Selecting "Off" calls `selectCaptionTrack(null)` (not `undefined`)
- [ ] Legal: WCAG 2.2 §1.2.2 surface — verified by audit doc

### Phase 3.6.2 — `CaptionCustomizer` (font size + background + position)

- [ ] `src/components/player/video/Captions/CaptionCustomizer.tsx` exists
- [ ] Lives in More sheet under "Captions" submenu
- [ ] Settings: `Font size: Small/Medium/Large/Extra-Large`, `Background opacity: None/50%/Solid`, `Position: Bottom/Top`
- [ ] Persists via AsyncStorage key `player.captionStyle`
- [ ] Lib receives `--sub-font-size` / `--sub-back-color` / `--sub-pos` overrides
- [ ] Unit test: settings persist across app restarts
- [ ] Unit test: lib receives the override mpv properties
- [ ] Manual QA: change font size → captions visibly grow
- [ ] Manual QA: change background opacity → captions background updates

### Phase 3.6.3 — `AudioDescriptionTrackSelector` (WCAG 1.2.5 AA — required)

- [ ] `src/components/player/video/Captions/AudioDescriptionTrackSelector.tsx` exists
- [ ] Renders ONLY when `controls.audioDescriptionTracks.length > 0` (hidden otherwise — no "AD not available" stub)
- [ ] Selecting a track calls `commands.selectAudioDescriptionTrack(trackId)`
- [ ] Lib routes AD as secondary `--audio-add` channel mixing with main audio
- [ ] Default off
- [ ] Unit test: row hidden when no AD tracks
- [ ] Unit test: selecting track triggers mixer

### Phase 3.6.4 — `InteractiveTranscript` (Netflix/YouTube pattern)

- [ ] `src/components/player/video/Transcript/InteractiveTranscript.tsx` exists
- [ ] Opens as full-screen scrollable sheet via `@gorhom/bottom-sheet` with snap points `['40%', '90%']`
- [ ] Source: active caption file parsed by `webvtt-parser` (~5 KB)
- [ ] Each cue is a `<Pressable>` with `accessibilityRole="button"`
- [ ] Currently-active cue highlighted gold (`useTheme().colors.accent.gold`)
- [ ] Tap any cue → `commands.seek(cue.startMs)`; sheet stays open
- [ ] Auto-scrolls to keep active cue in view
- [ ] Disabled when `captionTracks.length === 0`
- [ ] Respects system Dynamic Type / sp
- [ ] NEVER ships with synthetic/stub data — only renders real captions
- [ ] Unit test: sheet disabled when no captions
- [ ] Unit test: tap → seek to cue timestamp
- [ ] Manual QA: open sheet → scroll to a cue → tap → seek fires

### Phase 3.6.5 — `SkipSilenceToggle` (podcast UX)

- [ ] `src/components/player/video/More/SkipSilenceToggle.tsx` exists
- [ ] Toggle in More sheet under "Playback" group
- [ ] Default **OFF** (per [Puneet Patwari's "never skip automatically without consent" rule](https://www.linkedin.com/posts/puneet-patwari_a-candidate-interviewing-for-l5-netflix-activity-7468285281444548610-JElU))
- [ ] When ON: lib injects `af-add=scaletempo2=max-speed=32.0` filter
- [ ] Persistence: AsyncStorage key `player.skipSilence`
- [ ] Unit test: default OFF
- [ ] Unit test: toggle ON calls `commands.setSkipSilence(true)`
- [ ] Manual QA: open podcast → enable Skip Silence → play → silences are skipped (verify with mpv log)

### Phase 3.6.6 — `SmartResumePrompt` (Netflix/YouTube pattern)

- [ ] `src/components/player/video/SmartResume/SmartResumePrompt.tsx` exists
- [ ] Triggered when `videoState === 'preparing'` AND `useOpenWithResume({ uri }).progressMs > 0`
- [ ] Threshold table verified:
  - [ ] `progressMs / durationMs >= 0.95` → "Restart from beginning" prompt
  - [ ] `progressMs / durationMs >= 0.30` → "Resume from 12:34" prompt with thumbnail + "Play from beginning" option
  - [ ] `< 0.30` → silent (no prompt)
- [ ] Progress source: AsyncStorage key `playerResumeProgress:<contentUri>`
- [ ] Written every 10 s during playback by `VideoController`
- [ ] Auto-dismisses after 8 s of no interaction; default action = Resume
- [ ] Unit test: 30%+ → prompt renders with thumbnail
- [ ] Unit test: <30% → no prompt
- [ ] Unit test: tap "Resume" → seek to progressMs + play
- [ ] Unit test: tap "Play from beginning" → seek to 0 + play

### Phase 3.6.7 — `NextUpOverlay` (post-play countdown)

- [ ] `src/components/player/video/NextUp/NextUpOverlay.tsx` exists
- [ ] Triggers at `durationMs - 10000` on `Repeat all` mode only
- [ ] Renders full-bleed card overlaying bottom 40% of frame: thumbnail + title + "Up next" + countdown + `Cancel` + `Play now`
- [ ] Countdown is text-only re-render every 1 s (no animation library)
- [ ] `Cancel` → pause countdown; user remains on finished item
- [ ] `Play now` → `commands.next()` immediately
- [ ] Auto-fires `commands.next()` when countdown reaches 0 AND `autoPlayNext === true`
- [ ] Disabled when `commands.canGoNext === false`
- [ ] Unit test: triggers at `durationMs - 10000` only on Repeat all
- [ ] Unit test: Cancel pauses countdown
- [ ] Unit test: Play now calls `next()`
- [ ] Unit test: auto-fires only when `autoPlayNext` is ON
- [ ] Manual QA: play to ~10s before EOF → overlay appears → countdown works

### Phase 3.6.8 — `ReduceMotionController` (system accessibility)

- [ ] `src/components/player/video/ReduceMotion/ReduceMotionController.tsx` exists
- [ ] Subscribes to `AccessibilityInfo.isReduceMotionEnabled()` (iOS) / `AccessibilityManager` (Android)
- [ ] When ON: passes `reduceMotion: true` to:
  - `ChromeAutoHideController` → instant show/hide (no 200 ms fade)
  - `ScrubPreview` → instant show/hide
  - `LongPressSpeedPreview` → instant 2× badge
  - `NextUpOverlay` countdown → text-only, no animated digits
- [ ] When OFF: default 200 ms ease-out fades
- [ ] Lifecycle: `addEventListener('reduceMotionChanged', ...)` on mount, removed on unmount
- [ ] Unit test: instant chrome hide when reduceMotion is true
- [ ] Unit test: default 200 ms fade when reduceMotion is false

### Phase 3.6.9 — `DpadController` + hardware media keys

- [ ] `src/components/player/video/Dpad/DpadController.tsx` exists
- [ ] Subscribes to:
  - `KEYCODE_DPAD_UP/DOWN/LEFT/RIGHT/CENTER` → focus traversal (left-to-right, top-to-bottom)
  - `KEYCODE_MEDIA_PLAY/PAUSE/STOP/NEXT/PREVIOUS/REWIND/FAST_FORWARD` → wired to MediaSession (lib handles)
  - `KEYCODE_VOLUME_UP/DOWN/MUTE` → wired to `SimbaPlayer.setVolume()` when foreground; system volume in PiP
- [ ] Visible focus ring: 2 px gold outline at 100% alpha (WCAG 2.4.7)
- [ ] Disabled when no D-pad / keyboard is connected (focus ring hidden)
- [ ] WCAG 2.1.1 surface — every transport action reachable by keyboard alone
- [ ] Unit test: KEYCODE_DPAD_RIGHT moves focus to next control
- [ ] Unit test: KEYCODE_MEDIA_PLAY_PAUSE toggles playback
- [ ] Unit test: visible focus ring renders 2 px gold

### Phase 3.6.11 — `SkipPrevSmartThreshold` (Apple Music / Spotify pattern)

- [ ] Lives in `VideoController.commands.skipPrev()`
- [ ] If position > 3000 ms → `seek(0)` (restart current)
- [ ] If position ≤ 3000 ms → `commands.previous()` (go to previous item)
- [ ] Threshold configurable via More sheet (default 3000 ms)
- [ ] Unit test: position > 3000 ms → restart
- [ ] Unit test: position < 3000 ms → previous

### Phase 3.6.12 — `AutoPlayNextToggle`

- [ ] Toggle in More sheet under "Playback" group
- [ ] Default **OFF** (user-agency-first per Puneet Patwari)
- [ ] Persistence: AsyncStorage key `player.autoPlayNext`
- [ ] When ON: NextUpOverlay auto-fires `commands.next()` at countdown 0
- [ ] When OFF: NextUpOverlay always requires user gesture
- [ ] Unit test: default OFF
- [ ] Unit test: NextUpOverlay auto-fires only when ON

### Phase 3.6.13 — `HapticFeedback` (iOS Taptic Engine)

- [ ] Toggle in More sheet under "Playback" group (iOS only — no Android equivalent)
- [ ] Default ON (iOS)
- [ ] Subtle haptic on play/pause/skip via `react-native-haptic-feedback`
- [ ] Persistence: AsyncStorage key `player.hapticFeedback`
- [ ] Unit test: default ON on iOS
- [ ] Unit test: haptic fires on play/pause/skip when ON

### Phase 3.6.15 — WCAG 2.2 AA audit doc

- [ ] `md/SIMBA_PLAYER_WCAG_2.2_AA_AUDIT.md` exists
- [ ] Covers clauses: 1.2.2, 1.2.5, 2.1.1, 2.2.2, 2.3.1, 2.4.7, 2.4.11, 2.5.5, 2.5.8
- [ ] Each clause has: test method, expected result, actual result, sign-off
- [ ] Owned by a11y lead (not V19 author — V19 author creates the template)
- [ ] Manual QA: external a11y audit at least once before V20 ships

---

## Wave 4 — `VideoMiniPlayer` + mini/full sync

### Phase 4.1 — `PlaybackContext` (presentation contract)

- [ ] `src/infrastructure/player/playback/PlaybackContext.tsx` defines `usePlayback()` returning `{itemId, kind, presentation: 'mini' | 'expanded', startPositionMs?}`
- [ ] `usePlayback()` throws if called outside a `<PlaybackProvider>` (programmer-error contract)
- [ ] `startPositionMs` is cleared on `collapsePlayer()` (verified by unit test)
- [ ] Reopening the mini-player after collapse does NOT use the stale `startPositionMs` (no "remembered position" effect)
- [ ] The provider state machine: `expand → 'expanded'`, `collapse → 'mini'`, `close → null`
- [ ] Unit test: `collapsePlayer` clears `startPositionMs`
- [ ] Unit test: `expandMini` from `mini` → `expanded`, does NOT trigger a loadFile
- [ ] Unit test: `closePresentation` triggers `VideoController.close()` which calls native session release

### Phase 4.2 — `VideoMiniPlayer` (the dock, not a second full player)

- [ ] `src/components/player/video/VideoMiniPlayer/VideoMiniPlayer.tsx` exists
- [ ] Mounts ONCE; toggles visibility (`display: 'flex' | 'none'`) — never destroys and remounts across expand/collapse
- [ ] Composition: `artwork + title + state` · `expand` (Pressable, 44×44) · `Play/Pause` · `close`
- [ ] The track region (artwork + title) and the explicit expand button are TWO separate hit targets, both calling `expandMini()`
- [ ] `Play/Pause`, `close`, and (optional) `Previous`, `Next` are NOT nested inside the expand Pressable — verified by structural unit tests
- [ ] Gold activity dot + Pause icon when playing; muted dot + Play icon when paused; "Finished" + Play from beginning when ended; muted danger cue + retry when errored
- [ ] Mini-player seeks bar: REAL `Pressable` (NOT `pointerEvents="none"`) with `accessibilityRole="adjustable"` + the same `TransportBar` seek gestures, scaled down
- [ ] Unit test: visibility toggles between `'flex'` and `'none'` based on `presentation`
- [ ] Unit test: track region and expand button both call `expandMini`
- [ ] Unit test: tap on Play/Pause does NOT call `expandMini`
- [ ] Unit test: tap on close calls `VideoController.close()`

### Phase 4.3 — Mini ↔ Full sync (the contract)

- [ ] `VideoController.togglePresentation()` switches between `mini` and `expanded` without recreating the native session
- [ ] The native `SimbaPlayer` is mounted at the root of the host tree; its visibility is toggled via CSS-equivalent (opacity 0 / 1) when collapsed, NOT removed from the tree
- [ ] Unit test: expandMini does NOT call `loadFile`
- [ ] Unit test: collapseFullPlayer does NOT call `pause` / `stop` / `notification shutdown`
- [ ] Unit test: actively playing audio continues to play under the mini-player (verify with the bridge's `isPlaying` snapshot)
- [ ] Manual QA: open Movies → tap a video → playing → press home → mini appears → press home → mini still playing → re-enter the app → full player still has the same URI / position / cache

---

## Wave 5 — `VideoController` (the orchestrator)

### Phase 5.1 — `VideoController` core

- [ ] `src/infrastructure/player/video/VideoController.ts` exists (TypeScript, no React)
- [ ] Owns: `currentItem`, `videoState`, `error`, `repeatMode`, `lane` (always `'video'` here)
- [ ] Exposes: `loadFile(uri, opts)`, `play()`, `pause()`, `seek(ms)`, `close()`, `retry()`, `setRepeatMode(mode)`, `expandPresentation()`, `collapsePresentation()`, `closePresentation()`
- [ ] All commands are PURE: they emit an event/log but do not mutate UI directly
- [ ] `loadFile` invalidates any in-flight operations from the previous item
- [ ] `retry()` is `loadFile` with the cached URI
- [ ] `close()` releases the native session and clears all controller state
- [ ] Unit test: `loadFile('a')` followed by `loadFile('b')` — only `b` is active
- [ ] Unit test: `retry()` invokes `loadFile(lastUri)` (no manual cache)
- [ ] Unit test: `close()` clears `currentItem`, `videoState`, `error`, `repeatMode`

### Phase 5.2 — Lane integrity + finish policy

- [ ] `VideoController` is a video-only lane; `audio` kind is handled by a sibling `AudioController` (already exists in V18; V19 does not modify it)
- [ ] `repeatMode === 'repeat-one'`: `eof-reached` event triggers `seek(0) + play()` (same item)
- [ ] `repeatMode === 'repeat-all'`: `eof-reached` triggers `loadFile(nextItem.uri)` — but only if `nextItem` exists in the video queue; otherwise `state → 'finished'` (NOT auto-replay)
- [ ] `repeatMode === 'off'`: `eof-reached` sets `state → 'finished'` and shows "Play from beginning"
- [ ] Unit test: video lane `Next` returns video item or "no next" — never audio
- [ ] Unit test: `repeat-one` on EOF restarts the same item, no second `loadFile`
- [ ] Unit test: `repeat-all` with `nextItem === null` sets `finished` (no auto-replay)

### Phase 5.3 — Classifier pipeline

- [ ] `VideoController.classifyError(mpvError) → ErrorClassifier` (`network` / `codec` / `unsupported` / `expired` / `blocked` / `unknown`)
- [ ] `network`: HTTP 5xx, DNS failure, connection reset → "Couldn't reach the server"
- [ ] `codec`: mpv EXIT_FATAL with codec name → "Codec not supported" + auto-fallback to `software` decoding on next play
- [ ] `unsupported`: EOF after seek-beyond-duration → "Cannot seek to that position" + Reset to 0 + Resume
- [ ] `expired`: `Config.X` undefined → "API token expired — reauth" + Sign-out + Reload
- [ ] `blocked`: SurfaceView null + another player active → "Blocked by another player" + Stop the other + Retry
- [ ] `unknown`: everything else → "Something went wrong" + Retry + Close
- [ ] Unit test: classifier table — every documented input → expected output, plus a fuzz test for the "anything else" fallback

---

## Wave 6 — PiP · Captions · MediaSession · system integration

### Phase 6.1 — PiP integration

- [ ] `VideoController.enterPip()` calls the native `MpvBridgeModule.enterPip()`
- [ ] PiP enter from the chrome: tapping `PiPToggle` enters PiP; the full player becomes the PiP window
- [ ] PiP auto-enter from app background (configurable via `VideoController.config.pip.autoEnterOnLeave`)
- [ ] Upon PiP enter, ALL chrome hides (`VideoTitleOverlay`, `TransportBar`, `More`, `VideoMiniPlayer`)
- [ ] Unit test: `enterPip()` calls the bridge
- [ ] Unit test: `useTransport().canEnterPip` reads from the bridge's `canEnterPip` property

### Phase 6.2 — Captions integration

- [ ] `VideoController.setActiveCaptionTrack(trackId)` calls native `setPropertyString('sub', trackId)`
- [ ] The track list comes from mpv's `track-list` event and is exposed via `useTransport().captionTracks`
- [ ] When the track list updates, the previously-selected track is preserved if still present, otherwise cleared
- [ ] Unit test: track-list update preserves selection if still valid
- [ ] Unit test: track-list update clears selection if the active track disappears

### Phase 6.3 — MediaSession

- [ ] Title / artist / duration surface in Android's system media controls (using the bridge's existing MediaSession)
- [ ] System controls (play / pause / skip-forward / skip-back) drive `VideoController` commands
- [ ] Unit test: MediaSession play bridges to `commands.play()`
- [ ] Unit test: system pause bridges to `commands.pause()`

---

## Wave 7 — Acceptance matrix + accessibility + responsive QA

### Phase 7.1 — Acceptance matrix (V11 §10 extended)

- [ ] Every row in SPEC §10 has a corresponding test in `md/qa/video_w7_acceptance_*.md`
- [ ] Each test is a `jest` case in `src/infrastructure/player/video/__tests__/video.acceptance.test.ts`
- [ ] Manual device matrix on emulator-5554: open Movies → 9 acceptance cases listed in SPEC §10 verified on-device
- [ ] At least 1 acceptance case per row passes on-device; `md/qa/video_w7_device_matrix.png` retained
- [ ] All `.png` screenshots are saved at `<= 240 KB` (CI budget)

### Phase 7.2 — Accessibility audits

- [ ] Every chrome control has `accessibilityLabel` and `accessibilityRole`
- [ ] `accessibilityValue` on the seek: `{min: 0, max: durationMs, now: positionMs}`
- [ ] `accessibilityState.busy = true` on the transport row during `isBuffering` / `isSeeking`
- [ ] `accessibilityState.disabled = true` on transport when `seekability === false`
- [ ] Hit-target audit script (`scripts/qa-chrome-hit-targets.ts` or equivalent) verifies every `Pressable` is ≥ 44 × 44
- [ ] TalkBack smoke test on emulator-5554: each chrome control is discoverable, focus order is `header → state → artwork → progress → transport → mode → output → more`
- [ ] Unit test: no chrome control falls below 44 × 44 hit target

### Phase 7.3 — Responsive audits

- [ ] Compact phone portrait (360 × 640) — passes SPEC §7 row
- [ ] Compact phone landscape (640 × 360) — chrome shrinks, no overflow
- [ ] Tablet portrait (768 × 1024) — transport row centered at 600 px
- [ ] Tablet landscape (1024 × 1366) — transport row centered at 720 px
- [ ] Foldable (Samsung Galaxy Fold cover display) — sane default rendering
- [ ] PiP — chrome fully hidden, MediaSession handles controls
- [ ] Unit test: `<VideoSurface />` preserves aspect ratio at every device class (verified via `AspectRatioSpec` table)
- [ ] Manual QA screenshots: `md/qa/video_w7_responsive_*_{class}.png`

### Phase 7.4 — Release gate

- [ ] SPEC §11 — every Definition-of-Done item is green:
  - [ ] Five-boundary state contract enforced by ESLint
  - [ ] `tsc --noEmit` passes (strict)
  - [ ] `jest` covers: view states, buffer normalization, error classes, mini/full/collapse contract
  - [ ] SPEC §10 acceptance matrix has a green check for every row on at least one device
  - [ ] 1-import + 1-wrapper rule satisfied
- [ ] V19 closeout commit (`v19.0.0` tag) records the net `src/` LOC delta
- [ ] `md/SIMBA_PLAYER_MODULE_V19_FINAL_QA_REPORT.md` written (mirrors V18's final QA format)

---

## Carried forward (NOT in this wave)

- **D-033 [HIGH]** — OpenGL surface not rendering. mpv loads HTTP streams but no frames paint at the JS SurfaceView. Verified via `adb logcat` that libmpv IS reached end-to-end (loadFile, stream_callback, audio-device-auto opens); the gap is in the SurfaceView ↔ libmpv wire-up.
- **Live (HLS / DASH) streams** — `kind: 'live'` extension; V19 fails closed with `durationMs = "—"`.
- **A-B loop** — per-feature spec; not in V19.
- **Vertical-video form factor** — different player shape; V20.
- **`delete_me/` cleanup** — COMMITMSG_*.txt + libc++_shared_*_OLD_R27.so × 3 + libc++_shared_*_NEW_FROM_LIB.so × 3 + tarball artifacts. Not blocking; move before the next wave.

---

## Carried forward over multiple waves (typical)

At the close of V19, every deferred sub-task below moves forward unless explicitly fixed:

- **F-006 [LOW]** delete_me/ cleanup — not blocking
- **F-009 [LOW]** CI smoke-test for `__from_chars_floating_point` — non-blocking; helps future regressions
- **F-010 [LOW]** CHANGELOG entry for V19 covering the same surface area as v1.5.18's libc++ flow

---

**End of V19 tracker.**
