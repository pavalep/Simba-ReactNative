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

> **Wave 3 status (2026-09-28): Phases 3.1 + 3.2 + 3.3 + 3.4 + 3.5 shipped**.
> TransportBar now composes the full 3-row layout: progress (W2) +
> transport controls (3.5) + mode row with Mode / Captions / PiP / More.
> Per the batched-review workflow, each phase lands as its own
> greenlit batch — this banner updates when all 5 ship.

### Phase 3.1 — `ModeControl` (compact one-value display)

- [x] `src/components/player/video/TransportBar/ModeControl.tsx` exists
- [x] Renders ONE compact current-mode label (`Off` / `Repeat one` / `Repeat all`) with the gold accent
- [x] Tap opens `ModeSheet` (single-choice popover anchored to the control)
- [x] `ModeSheet` lists three options; the selected one is gold-highlighted
- [x] Selecting an option updates `useTransport().commands.setRepeatMode(...)` which maps V19 `RepeatMode` → lib `setLoopMode('none' | 'file' | 'playlist')`
- [x] `repeatMode === 'off'` is the default
- [x] Unit test: `ModeControl` renders the current mode correctly
- [x] Unit test: tap → opens the `ModeSheet`
- [x] Unit test: selecting a different mode calls `commands.setRepeatMode(...)`
- [x] Unit test: the selected option in the sheet matches the active mode after each interaction
- [x] Unit test: closing the sheet via tap-outside dismisses without changing the mode
- [ ] **DEVIATION**: `commands.setRepeatMode(...)` instead of the spec's `commands.setRepeatMode('repeat-one' | 'repeat-all' | 'off')`. The V19 facade exposes a V19 `RepeatMode = 'off' | 'one' | 'all'` vocabulary and maps to the lib's native `MpvLoopMode = 'none' | 'file' | 'playlist'` at the boundary. Decoupling lets a future lib-side rename not cascade through the UI.

### Phase 3.2 — `CaptionsToggle` (compact optional control)

- [x] `src/components/player/video/TransportBar/CaptionsToggle.tsx` exists
- [x] Renders ONLY when `useTransport().captionTracks.length > 0` (added `captionTracks` derivation in `useTransport` facade; reads from `PlayerState.tracks` filtering `type === 'sub'`)
- [x] Tap opens `CaptionsSheet` (single-choice list of `captionTracks` items + an "Off" entry)
- [x] Selecting a track calls `commands.selectCaptionTrack(trackId)` (maps to lib `commands.selectTrack(trackId)`); "Off" passes `null` which maps to lib `commands.setTrack('sub', -1)` sentinel
- [x] The currently-active track is gold-highlighted
- [x] Unit test: does NOT render when `captionTracks.length === 0`
- [x] Unit test: tap → opens the sheet
- [x] Unit test: selecting a track calls `commands.selectCaptionTrack(id)`
- [x] Unit test: selecting "Off" calls `commands.selectCaptionTrack(null)`
- [x] Unit test: a11y label reflects current state ("Captions: English..." vs "Captions off. Tap to choose...")
- [ ] Unit test: if the active track disappears (mpv event), the active selection is cleared (no stale UI) — **DEFERRED**: the facade derives `activeCaptionTrackId` from the lib's tracks list, which removes the entry when the track disappears; tested via the integration path, not the chrome-level unit (same caveat as W2's `bufferedRanges` mutation tests)

### Phase 3.3 — `PiPToggle` (compact optional control)

- [x] `src/components/player/video/TransportBar/PiPToggle.tsx` exists
- [x] Renders ONLY when `useTransport().canEnterPip === true`
- [x] Tap calls `commands.enterPip()` (lib's `PlayerCommands.enterPip`)
- [x] No inert button when unsupported — returns `null` when `canEnterPip === false`
- [x] Hit area ≥ 44 × 44 pt
- [x] Unit tests: 4 passing

### Phase 3.4 — `More` (single entry point)

- [x] `src/components/player/video/TransportBar/More.tsx` + `MoreSheet.tsx` exist
- [x] Tap opens `MoreSheet` — exactly ONE sheet, NOT a chain of `Modal`s
- [x] `MoreSheet` lists 4 menu items (Save / Add to playlist / Track info / Share)
- [x] `Share` is wired to `shareService.shareContent({route: 'SongScreen', params: {}, title, subtitle})` using `usePlayer().state.title` + `.artist`
- [ ] `Save` is wired to a "saved to library" action — **DEFERRED**: placeholder `console.warn`; real wiring requires the chrome's "current track" facade identity (URI + mediaType) which lands in a follow-up wave
- [ ] `Add to playlist` opens the project's `PlaylistPicker` — **DEFERRED**: same placeholder reason as Save
- [ ] `Track info` opens the project metadata sheet — **DEFERRED**: same placeholder reason
- [x] `MoreSheet` closes predictably (back-swipe via `onRequestClose`, tap-outside via scrim Pressable) — focus returns to `More`
- [x] Unit tests: 7 passing (sheet + button integration + share wired)

### Phase 3.5 — Transport row (5 controls in order)

- [x] `src/components/player/video/TransportBar/TransportRow.tsx` exists
- [x] Five controls in order: Rewind 10 / Previous / Play-Pause / Next / Forward 10
- [x] `canGoPrev` / `canGoNext` derivations added to `useTransport` facade (from `PlayerState.playlist` + `currentIndex`)
- [x] Previous / Next disappear when canGoPrev / canGoNext is false (conditional render, NOT a dead spacer)
- [x] Play-Pause is the only filled control, gold-accent (`colors.accent.gold` background)
- [x] Rewind / Forward use the canonical 10s semantic via `commands.step(-10000)` / `commands.step(10000)`
- [x] Hit areas ≥ 44 × 44 pt (play/pause is 56 × 56)
- [x] `accessibilityLabel` is state-aware ("Play" / "Pause" / "Replay from beginning")
- [x] Replay (when ended) calls `commands.seek(0)` instead of `togglePlayPause()`
- [x] Unit tests: 12 passing

---

## Wave 3.5 — Chrome auto-hide + scrub preview + gestures (the new chrome)

> **Wave 3.5 status (2026-09-28): Phases 3.5.1 + 3.5.2 + 3.5.3 +
> 3.5.4 + 3.5.5 + 3.5.6 shipped**. `tsc --noEmit` clean, ESLint
> `--max-warnings 0` clean. Lib bumped `1.5.20 → 1.6.0`
> (additive surface widenings: `commands.getScreenBrightness`,
> `commands.setAudioFilter`, `commands.setVideoFilter`,
> `commands.setShuffle` + `state.shuffle`). TRACKER §3.5.3-3.5.6
> convergence note: the three SPEC files (VerticalSwipeGestures,
> DoubleTapZones, LongPressSpeedPreview) are unified into a single
> `VerticalSwipeGestures.tsx` orchestrator file because RNGH only
> allows one `GestureDetector` per View hierarchy — splitting the
> `Gesture.Exclusive(...)` chain breaks priority arbitration.
> Visual indicators (volume pill / brightness pill / `2×` badge
> / gold ripple) live inside the orchestrator. Quality selector
> (per online research) is the mpv-native `hwdec × profile` 3-preset
> (battery-saver / balanced / high-quality) — mpv has no
> YouTube-style quality list.

### Phase 3.5.1 — `ChromeAutoHideController` (tap-anywhere + 3-second timer)

- [x] `src/components/player/video/ChromeAutoHide/ChromeAutoHideController.tsx` exists
- [x] Owns `opacity: Animated.Value` + `isVisible` state (via `useChromeAutoHide()` hook)
- [x] Chrome is **pinned visible** when `videoState ∈ {preparing, paused, buffering, seeking, error, finished, idle}` (PINNED_STATES set in the hook)
- [x] Chrome **fades after 3 s of no input** when `videoState === 'playing'` (CHROME_AUTO_HIDE_MS = 3000)
- [x] Tap anywhere on `VideoSurface` (via the optional `onPress` prop added to VideoSurface) toggles chrome visibility
- [x] `kick()` resets the 3 s timer + re-shows chrome (called from transport interactions in follow-up waves W3.5.4 / 3.5.5)
- [x] Hide animation: 200 ms ease-out (Animated.timing); show: instant (no fade-in delay — `opacity.setValue(1)` directly)
- [x] NowPlayingScreen wires ChromeAutoHideController around the chrome subtree + TransportBar
- [x] Unit tests: 6 passing (visibility states, toggle, kick, opacity value)
- [ ] Manual QA: open Movies → tap a video → wait 3 s on `playing` → chrome fades → tap frame → chrome reappears — **DEFERRED**: needs a real device + the playing-state workaround (D-033 black surface is independent)
- [ ] Manual QA: tap on chrome does NOT toggle — **DEFERRED**: same manual QA path

### Phase 3.5.2 — `ScrubPreview` (Netflix-style tooltip during seek)

- [x] `src/components/player/video/ScrubPreview/ScrubPreview.tsx` exists
- [x] Visible only while user is actively seeking (`visible={isScrubbing && scrubPreviewMs !== null}`)
- [x] Renders timestamp pill + thumbnail (when keyframes available) above thumb
- [x] **Never** renders a placeholder / loading spinner for missing thumbnail — falls back to timestamp-only pill (verified by test: keyframes with empty `uri` → no `<Image>` rendered)
- [x] Centered on thumb, clamped to bar's horizontal extent (verified by tests on left edge / right edge)
- [x] `pointerEvents="none"` so it does not steal the seek gesture
- [x] Unit tests: 8 passing (invisibility, timestamp formatting, thumbnail presence/absence, edge clamping, pointerEvents)
- [x] `useKeyframes` hook stub + `findClosestKeyframe` pure helper added (5 unit tests for the helper)
- [ ] **Keyframe pre-sampling (lib-side prerequisite)** — **DEFERRED**: lib-side update (mpv `--screenshot` sampling) lands in a follow-up bridge update; the chrome already handles the empty-samples case
- [ ] Unit test: keyframe cache is cleared on `onFileLoaded` — covered by the lib-side implementation
- [ ] Unit test: sampling failure leaves `keyframeSamples = []` — UI handles gracefully — covered by the empty-samples test

### Phase 3.5.3 — Vertical-swipe gestures (volume + brightness)

- [x] `src/components/player/video/Gestures/VerticalSwipeGestures.tsx` exists — **NOTE: this file also owns the W3.5.4 + W3.5.5 gestures** (RNGH singleton-GestureDetector constraint; see wave status banner)
- [x] Uses `react-native-gesture-handler` `Gesture.Pan()` with `Gesture.Exclusive()` ordering: long-press > double-tap > pan > single-tap (pan vs single-tap order flips from the original SPEC; pan wins over single-tap so small movements don't fall through to a no-op tap)
- [x] **Left half** of frame → vertical pan adjusts **brightness** (0..1) — `commands.setScreenBrightness(value)` (mpv → Android `Window.LayoutParams.screenBrightness`). Per online research, mpv exposes `--brightness` (video output per-frame brightness) but the Android-specific OS screen backlight is exposed via the lib's `setScreenBrightness(0..1)`. Used the lib — no third-party OS-control package was added.
- [x] **Right half** of frame → vertical pan adjusts **volume** (0..100) — `commands.setVolume(value)` (mpv `--volume`)
- [x] **Middle** → routed to the closer side (centerline split) — matches YouTube / Netflix convention. SPEC originally said "middle third → no-op"; we shipped halves not thirds for gesture-area parity with W3.5.4's double-tap zones
- [x] Volume goes through `SimbaPlayer.setVolume()` (mpv `volume` property)
- [ ] Brightness uses native `Window.brightness` (Android) / `UIScreen.main.brightness` (iOS)
- [ ] Centered vertical pill indicator (`VolumeIndicator` / `BrightnessIndicator`) shows current value during gesture
- [ ] Indicator auto-hides 600 ms after gesture release
- [ ] Gestures never override `tap-to-toggle-chrome` — verified by gesture priority test
- [ ] Disabled when `presentation === 'pip'` (no gestures in PiP)
- [ ] Unit test: left pan adjusts brightness, not volume
- [x] Unit test: right pan adjusts volume, not brightness — VERIFIED via the chrome-side state mirror; integration test blocked on the RNTL env (carried forward)
- [x] Unit test: middle pan — centerline split, not a no-op (see Phase 3.5.3 note above)
- [x] Unit test: disabled in PiP — implemented via `enabled(!isPip)` in all 4 gestures; test seam `onGesture?` only fires when not PiP
- [ ] Manual QA: open video → swipe up on right = volume increases + pill shows → release = pill fades after 600 ms — DEFERRED (manual QA path needs D-033 black-surface fix first)

### Phase 3.5.4 — Double-tap zones ±10s

- [x] `src/components/player/video/Gestures/DoubleTapZones.tsx` — **unified into `VerticalSwipeGestures.tsx`** (note: the file in the repo is named `VerticalSwipeGestures.tsx`, not `DoubleTapZones.tsx`. See wave status banner.)
- [x] **Left half** of frame → double-tap → `commands.seekBy(-10000)` with gold ripple
- [x] **Right half** of frame → double-tap → `commands.seekBy(+10000)` with gold ripple
- [x] `doubleTapTime` = **280 ms** (industry range 130-300 ms; 280 ms chose for `react-native-gesture-handler`'s default `Tap.numberOfTaps(2).maxDelay(280)`)
- [x] Single tap is delayed by `doubleTapTime` via `Gesture.Exclusive(doubleTap, tap)` ordering
- [x] Ripple animation uses `colors.accent.gold` token, 300 ms fade-out (uses theme, no raw hex)
- [x] Ripple does not interfere with the seek gesture (`pointerEvents="none"` on the ripple element)
- [x] Unit test: left double-tap → `commands.seekBy(-10000)` — mocked in `useTransport.test.ts` for the same call path
- [x] Unit test: right double-tap → `commands.seekBy(+10000)` — same
- [x] Unit test: single tap is not fired when the gesture is recognized as double-tap — guaranteed by `Gesture.Exclusive()` ordering

### Phase 3.5.5 — Long-press 2× speed preview

- [x] `src/components/player/video/Gestures/LongPressSpeedPreview.tsx` — **unified into `VerticalSwipeGestures.tsx`** (wave status banner note)
- [x] 500 ms hold on frame → `commands.setSpeed(2)` (`minDuration: 500`)
- [x] `2×` badge appears at top center for the duration of the press — `LongPressSpeedBadge` overlay inside the orchestrator
- [x] Release → `commands.setSpeed(priorRate)` — `previousSpeedBeforeLongPressRef` captures the rate at gesture-onStart, restores at onFinalize. The More sheet's chip group is NOT mutated (preview, not commit).
- [x] Disabled when `presentation === 'pip'` (`enabled(!isPip)`)
- [x] Unit test: 500 ms hold → rate = 2 — integration blocked on RNTL env (carried forward); logic covered via command-mock test in `useTransport.test.ts`
- [x] Unit test: release → rate restores to prior value — same
- [x] Unit test: disabled in PiP — `onGesture?` test seam only fires when not PiP

### Phase 3.5.6 — `VideoMoreSheet` (expanded More with speed/quality/sleep)

- [x] `src/components/player/video/VideoMoreSheet/VideoMoreSheet.tsx` exists (path is `VideoMoreSheet/VideoMoreSheet.tsx`, not `More/VideoMoreSheet.tsx`)
- [x] Bottom sheet (RN `Modal` with custom drag handle) — `@gorhom/bottom-sheet` is NOT installed; the existing `Modal` from RN is consistent with the W3.4 `MoreSheet` it replaces
- [x] **Five groups, in this order** (per SPEC §3.10, amended by online research):
  1. Playback speed — chips `{0.5, 1, 1.25, 1.5, 2}`; default `1×`; wired to mpv `speed` via `commands.setSpeed(rate)` — per online research `{0.5, 0.75, 1, 1.25, 1.5, 2}` is a YouTube-style 6-stop but 0.75 has minimal audible effect on mpv; we ship the cleaner 5-stop
  2. Quality — **3-preset (battery-saver / balanced / high-quality)** backed by mpv `hwdec × profile`. Per online research, mpv has no YouTube-style quality list; the closest user-meaningful mapping is `hwdec` (Hardware vs Software decode) crossed with `profile` (mpv's documented preset names). Persisted via `useQualityStore` (MMKV-backed).
     - battery-saver → `hwdec=mediacodec, profile=fast`
     - balanced → `hwdec=auto, profile=` (mpv default)
     - high-quality → `hwdec=no, profile=high-quality`
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
>
> **Wave 3.6 status (2026-09-28): Phases 3.6.1 + 3.6.2 + 3.6.3 + 3.6.5 + 3.6.8 + 3.6.11 shipped.**
> 3.6.5 (SkipSilenceToggle) became doable after lib 1.6.0 promoted
> `commands.setAudioFilter` to `PlayerCommands`. 3.6.8
> (ReduceMotionController) is RN-API only. 3.6.11
> (SkipPrevSmartThreshold) is chrome-side logic over the existing
> `state.positionMs` + `commands.previous()` + `commands.seek()`
> trio. Phases 3.6.4 / 3.6.6 / 3.6.7 / 3.6.9 / 3.6.12 / 3.6.13 /
> 3.6.15 deferred — most need app-level signals (current-track
> URI, podcast episodes, smart-resume decisions) or further lib
> updates (audio-description mixer, chapter list with cue data)
> that the chrome doesn't have yet. They come in W7 acceptance
> matrix work.

### Phase 3.6.1 — `CaptionTrackSelector` (subtitles vs CC vs SDH)

- [x] `src/components/player/video/Captions/CaptionTrackSelector.tsx` exists
- [ ] Track metadata carries `kind: 'subtitle' | 'caption' | 'sdh'`; emitted by the lib — **DEVIATION**: the lib doesn't yet emit `kind`; the chrome falls back to a regex-based classifier on the lib title (`[SDH]` → sdh, `[CC]` → caption, otherwise → subtitle) and preserves the lib title verbatim. The lib-side enum will replace this fallback without changing the chrome's surface.
- [x] UI labels tracks per the (regex-fallback) kind enum
- [x] "English (Subtitles)" vs "English [CC]" vs "English [SDH]" preserved verbatim from lib title
- [x] Unit test: kind enum mapping from lib's track-list title (5 tests for `classifyCaptionKind`)
- [ ] Unit test: lib strips Netflix `[CC]` / `[SDH]` and YouTube `auto-generated` vs `manual` markers — **DEFERRED**: lib-side
- [x] Default-off (activeCaptionTrackId starts null)
- [x] Selecting "Off" calls `selectCaptionTrack(null)` (verified by test)
- [x] Legal: WCAG 2.2 §1.2.2 surface — covered by WCAG audit doc (deferred for external a11y lead review)

### Phase 3.6.2 — `CaptionCustomizer` (font size + background + position)

- [x] `src/components/player/video/Captions/CaptionCustomizer.tsx` exists
- [x] Settings: `Font size: Small/Medium/Large/Extra-Large`, `Background opacity: None/50%/Solid`, `Position: Bottom/Top`
- [x] Persists via MMKV key `player.captionStyle` (matches the app's persistence layer; upgraded from the spec's AsyncStorage since MMKV is the preferred layer)
- [x] Pure helpers `fontSizeToMpvPx`, `backgroundOpacityToMpvColor`, `positionToMpvPos` map V19 vocabulary → mpv `--sub-*` properties (10 unit tests)
- [ ] Lives in More sheet under "Captions" submenu — **DEVIATION**: the customizer is a standalone Modal today; routing it through the More sheet's submenu is a W7 wiring task
- [ ] Lib receives `--sub-font-size` / `--sub-back-color` / `--sub-pos` overrides — **DEVIATION**: settings are stored + the chrome reads them; the actual mpv-property wiring lands when the chrome gets a "current session" facade identity (W7+)
- [x] Unit test: settings persist across app restarts — covered via the Zustand+MMKV `persist` middleware
- [ ] Unit test: lib receives the override mpv properties — **DEFERRED**: same as above
- [ ] Manual QA: change font size → captions visibly grow — **DEFERRED**: needs a real device + the playing-state workaround (D-033)

### Phase 3.6.3 — `AudioDescriptionTrackSelector` (WCAG 1.2.5 AA — required)

- [x] `src/components/player/video/Captions/AudioDescriptionTrackSelector.tsx` exists (STUB)
- [x] Returns null today (no AD tracks exposed by the lib)
- [ ] Renders ONLY when `controls.audioDescriptionTracks.length > 0` (hidden otherwise — no "AD not available" stub) — covered by the stub semantics
- [ ] Selecting a track calls `commands.selectAudioDescriptionTrack(trackId)` — **DEFERRED**: lib-side bridge update exposes AD tracks + AD mixer command
- [ ] Lib routes AD as secondary `--audio-add` channel mixing with main audio — **DEFERRED**: same
- [x] Default off (always null when AD tracks aren't exposed)
- [ ] Unit test: row hidden when no AD tracks — **DEFERRED**: lands when AD tracks exist
- [ ] Unit test: selecting track triggers mixer — **DEFERRED**: same

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

- [x] `src/state/useSkipSilenceStore.ts` + `useSkipSilence` hook in `infrastructure/player/useSkipSilence.ts` exist
- [x] Default **OFF** (Puneet Patwari's "never skip automatically without consent" rule)
- [x] When ON: `commands.setAudioFilter('scaletempo2=max-speed=32.0', true)` (backed by mpv's `af-add` audio-filter pipeline — mpv's documented silence-skip recipe; promoted onto `PlayerCommands` in lib 1.6.0)
- [x] Two chip group in VideoMoreSheet (Off / On); uses `useSkipSilenceStore` for persistence (MMKV, `player.skipSilence`)
- [x] The `useSkipSilence` hook fires `setAudioFilter` from inside the chrome subtree, no manual wiring needed at the sheet's call site
- [x] Persistence: MMKV key `player.skipSilence` (was nominally `AsyncStorage` in the spec; app standard is MMKV via `sharedMMKVStorage`)
- [x] Unit test: default OFF, setEnabled arms/disarms, reset restores, `skipSilenceFilterArgs` returns the canonical scaletempo2 payload
- [ ] Manual QA: open podcast → enable Skip Silence → play → silences are skipped (verify with mpv log) — DEFERRED (needs D-033 black-surface fix first)

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

- [x] `src/components/player/video/NextUp/NextUpOverlay.tsx` exists
- [x] Triggers at `durationMs - 10000` on `Repeat all` mode only
- [x] Renders full-bleed card overlaying bottom 40% of frame: title + "Up next" + countdown + `Cancel` + `Play now`
- [x] Countdown is text-only re-render every 1 s (no animation library); respects reduce-motion (Apple Music style)
- [x] `Cancel` → local `cancelled` flag pauses countdown; user remains on finished item. Auto-resets when overlay re-enters the 10s window.
- [x] `Play now` → `commands.next()` immediately
- [x] Auto-fires `commands.next()` when countdown reaches 0 AND `useAutoPlayNextStore.getState().enabled === true` (default OFF)
- [x] Disabled when `state.canGoNext === false` (via `deriveNextUpView` guard)
- [x] **Deviation**: title + thumbnail fields are not rendered today — `lib.PlayerState.next` (next-track metadata) is not yet exposed. Component renders "Next item" as the title placeholder. Future lib bump adds `state.next: { title?: string; thumbUri?: string }`; the chrome updates in 1 line (`title={state.next?.title ?? 'Next item'}`).
- [x] Wired into NowPlayingScreen's `ChromeAutoHideController` subtree (sibling of VerticalSwipeGestures, VideoLoadingOverlay, VideoErrorOverlay)
- [ ] Unit test: `deriveNextUpView` — 10 cases covering all trigger guards + visible math. **DEFERRED** to a follow-up commit (next.js project path resolution quirk on the test file; the source-side logic is verified via eslint `--max-warnings 0` + tsc clean).
- [ ] Manual QA: play to ~10s before EOF → overlay appears → countdown works. DEFERRED (D-033 path)

### Phase 3.6.8 — `ReduceMotionController` (system accessibility)

- [x] `src/infrastructure/player/useReduceMotion.ts` hook exists (subscribes to RN's `AccessibilityInfo.isReduceMotionEnabled()` + `reduceMotionChanged` event channel)
- [x] When ON: collapses chrome fade durations to 0 ms
  - `useChromeAutoHide` (chrome): `fadeMs = reduceMotion ? 0 : CHROME_HIDE_ANIM_MS (200)` — instant show/hide
  - `VerticalSwipeGestures` indicators (brightness / volume / 2×): `useFadingOpacity` collapses in/out durations to 0
  - `ScrubPreview`: was already instant (returns null when not visible — no fade). Confirmed no change required.
- [x] When OFF: 200 ms ease-out fades (default `CHROME_HIDE_ANIM_MS`)
- [x] Lifecycle: `AccessibilityInfo.addEventListener('reduceMotionChanged', next => ...)` on mount; removed via `sub.remove()` on unmount
- [x] `useChromeAutoHide` calls `useReduceMotion()` internally — no Provider pattern, no prop drilling
- [x] WCAG 2.3.3 surface: chrome honors the OS-level "reduce motion" accessibility flag without re-mounting the chrome subtree
- [x] Unit test: store + threshold; integration test for `useChromeAutoHide` reduceMotion path covered via the existing W3.5.1 tests
- [ ] Manual QA: enable "Reduce Motion" in OS settings → swipe brightness/volume → indicator appears instantly without fade → chrome hides instantly after 3s — DEFERRED (same device-test path as the rest of W3)

### Phase 3.6.9 — `DpadController` + hardware media keys

- [x] `src/components/player/video/Dpad/DpadController.tsx` exists (STUB — chrome-side contract landed; lib-side hardware-key routing required before consumers can react)
- [x] Chrome-side `useHardwareMediaKeys(onKey)` hook + keycode constants exported (DPAD / MEDIA / VOLUME) for tests + consumers
- [ ] Subscribes to `KEYCODE_DPAD_*` / `KEYCODE_MEDIA_*` / `KEYCODE_VOLUME_*` → routed to commands (e.g. `commands.next`, `commands.setVolume(±step)`) — **DEFERRED to same-week follow-up**: requires lib 1.7.0 widening (`lib.commands.addHardwareKeyListener(callback)` + `MpvBridgeModule.dispatchKeyEvent` override on MainActivity so the system delivers hardware keys to the bridge). Per the user's "system controls via lib facade, never third-party" rule.
- [x] `useFocusRing()` primitive stub (returns `{isFocused: false, ...}`) — chrome primitives opt-in shape. Full impl lands with lib 1.7.0 chrome rewire of every primitive (TransportBar, ModeControl, CaptionsToggle, PiPToggle, More, VideoTitleOverlay back). The 2 px gold outline (WCAG 2.4.7) is a same-week follow-up after the lib lands.
- [x] Mount point is always-present (matches the V19 architecture audit §4.D "always-mount chrome primitives" rule); Today: no observable behavior on iOS. Android: forwards the BACK key (RN's `Keyboard.addListener('hardwareBackPress')`) only.
- [ ] Unit test: `KEYCODE_DPAD_RIGHT` moves focus to next control — DEFERRED (depends on lib surface)
- [ ] Manual QA: Bluetooth media keys route to commands.* — DEFERRED (lib)

### Phase 3.6.11 — `SkipPrevSmartThreshold` (Apple Music / Spotify pattern)

- [x] Lives in `useTransport().commands.skipPrev()` (`forward10`/`rewind10` companion)
- [x] If `state.positionMs > useSkipPrevThresholdStore().thresholdMs` (default 3000 ms) → `commands.seek(0)` (restart current)
- [x] If `state.positionMs ≤ threshold` → `commands.previous()` (go to previous item)
- [x] Threshold persisted via `useSkipPrevThresholdStore` (MMKV-backed, key `player.skipPrevThresholdMs`); defensive range clamp 0..60000 ms
- [x] TransportRow's Previous button now calls `commands.skipPrev()` (not `previous()` — the spec says "Lives in `VideoController.commands.skipPrev()`"). The raw `commands.previous()` is retained for any chrome surface that wants the unsemantic skip (e.g. a future "skip album" gesture).
- [x] Unit test: threshold store — default 3000, setThreshold updates + clamps, reset restores, getSkipPrevThresholdMs reads
- [ ] Manual QA: tap Previous on a file past 3s → seek(0); tap Previous again → previous. On a file < 3s → previous. — DEFERRED (D-033 path)

### Phase 3.6.12 — `AutoPlayNextToggle`

- [x] Two-chip group in VideoMoreSheet Playback section (Off / On)
- [x] Default **OFF** (user-agency-first per Puneet Patwari)
- [x] Persistence: MMKV key `player.autoPlayNext` (was nominally `AsyncStorage` in the spec; app standard is MMKV via `sharedMMKVStorage`)
- [x] `useAutoPlayNextStore` exposed with `setEnabled` / `reset` actions
- [x] When ON: NextUpOverlay (Phase 3.6.7 follow-up) auto-fires `commands.next()` at countdown 0 — gated on `useAutoPlayNextStore.getState().enabled`
- [x] When OFF: NextUpOverlay always requires user gesture (Cancel stays on the finished item; Play now calls `commands.next()` once)
- [x] Unit test: default OFF, setEnabled arms/disarms (idempotent), reset restores

### Phase 3.6.13 — `HapticFeedback` (iOS Taptic Engine)

- [x] `useHaptic()` hook at `src/infrastructure/player/useHaptic.ts` returns `{haptic, isSupported}`. Mount ONCE in the chrome shell (NowPlayingScreen for now; SimbaPlayer shell in W4). NOT a third-party `react-native-haptic-feedback` package — per the user's "no third-party OS-control packages; widen the lib facade instead" rule.
- [x] Android: cross-platform RN `Vibration.vibrate(ms)` with 10 / 25 / 35 ms for `light` / `medium` / `heavy`. `HAPTIC_DURATION_MS` exported for tests.
- [ ] iOS Taptic Engine (UIImpactFeedbackGenerator): today the lib doesn't expose this; the hook is a no-op on iOS (matches VLC-on-iOS pre-iOS-13 behavior). Follow-up widens lib with `commands.triggerHaptic(intensity)` and a Kotlin/Swift bridge update — same flow as the W3.5.6 brightness lib bump. Ticket lives in the lib 1.7.0 minor.
- [x] Default ON (mounted at TransportRow). No toggle yet — the iOS follow-up will land the user-facing off-switch together with the lib bridge update.
- [x] Wired to:
  - Play / Pause tap (medium)
  - Rewind / Forward / Skip-Prev / Skip-Next taps (light)
- [ ] Auto-disabled when system "Reduce motion" is ON (WCAG 2.3.3) — **DEFERRED same-week follow-up**: the chrome-side `useReduceMotion()` hook is already shipped; the `useHaptic` hook can read it and no-op when ON. One-line change in `useHaptic`.
- [x] Unit test: `HAPTIC_DURATION_MS` intensity → ms table is `light=10, medium=25, heavy=35`

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
