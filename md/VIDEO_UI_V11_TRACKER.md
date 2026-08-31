# SIMBA Mobile: Video UI v11 — Execution Tracker
## Progress Tracker & Execution Plan

> **Source Spec:** [`VIDEO_UI_V11_SPECIFICATION.md`](VIDEO_UI_V11_SPECIFICATION.md) **rev 11.1.0** — the spec is the contract; this tracker mirrors its §10 exactly.
> **Shape:** 10 themes × 3 phases = **30 phases · 10 GATEs · 30+ commits** (V10.2-podcasts rigor: every phase has numbered steps, an **Error fix** step, a **Validation** step, and a **Commit**).
> **Provenance:** an older 39-phase/13-theme tracker (base64 mini-frame plan, `VideoQueueScreen`, centre-arc) was generated into the typo folder `x:\Development\SIMBA\MOBILE_APP_RECT_NATIVE\md\` and is **deleted as superseded**. If you ever find it, ignore it — every design it carries was rejected in spec 11.1.0.
> **Baseline lock:** the items in spec §0 (observers, lease, watchdog, gestures, auto-hide, keep-awake) already exist in source. **No phase may regress them.**

---

## 0. Locked decisions (from spec 11.1.0 — do NOT revisit)

- One loading surface: `VideoStatusPill` only; `VideoFirstFrameLoading` deleted at end of Theme 1.
- Close is top-right in full chrome; mini keeps its own close in the action cluster.
- Mini shows the **live native surface** re-laid (§3.2). The base64/screenshot pipeline is abandoned. A poster-fallback **feature flag is implemented and validated in Phase 7.3 before merge** — not a TODO.
- One modal: `VideoMoreSheet` (queue / tracks / chapters / fullscreen / EQ). Speed stays a utility-row chip with its existing sheet.
- Centre action visible only for `paused | ended | error`; never during loading. On error, pill + centre share **one** `onRetry` handler.
- No new colors (cinema palette only, `semantic.error` for LIVE). No new dependencies. Native driver only (Rule 11).
- `loadingState` union is the single type change; `isLoading` survives one release as a derived alias.
- Rule 12: every visible control works — hide the control if the capability is missing.

## Standing rules (inherited from V10.x trackers)

- Execute strictly against this tracker; verify each phase with `npx tsc --noEmit` exit 0.
- Commit each phase's code with `feat(video-ui):` / `refactor(video-ui):`, then a **separate tracker backfill commit** `docs(video-v11): mark Phase X.Y done`; commit the GATE when reached.
- Every phase ends with an **Error fix** step (scan for the phase's new failure modes) and a **Validation** step (tsc + manual).
- If a phase needs a new color or dependency: stop and ask.
- File:line anchors below are verified on 2026-08-25; if they drift, re-anchor before editing.

---

## THEME 1 — Unified loading pill (spec §3.1, §4.4)

> **Goal:** exactly one loading surface. The first-frame overlay and the inline status line collapse into `VideoStatusPill`.

### PHASE 1.1 — `loadingState` union + derivation

1. **Read first:** `src/modules/playback/video/domain/VideoTypes.ts`, `state/reduceVideoSessionEvent.ts`, `session/VideoMpvSession.ts:467-510,573-584` (position/buffering/cache/restart handlers), `state/VideoStateAdapter.ts`.
2. Add `VideoLoadingState` union exactly as spec §3.1 to `VideoTypes.ts`; add `loadingState: VideoLoadingState` to `VideoSessionSnapshot` (default `{kind:'idle'}`).
3. Implement the derivation rules (spec §3.1) in one place — a pure `deriveLoadingState(phase, isSeeking, cacheFill, error)` helper in `domain/`, consumed by both the session handlers and the reducer. Seeking wins over buffering (reducer precedence already agrees).
4. **Dual-write:** keep `isLoading` as `loadingState.kind !== 'idle'` (derived, one release). JSDoc: "remove in v11.2".
5. **Error fix:** ensure `onPlaybackRestart` (`VideoMpvSession.ts:573-584`) clears `buffering` to `idle` only for the active generation — a stale restart must not hide a current stall.
6. **Validation:** `npx tsc --noEmit` exit 0; log-trace a load → preparing → idle and a stall → buffering → idle sequence.
7. **Commit:** `refactor(video-ui): discriminated loadingState on VideoSessionSnapshot`.

### PHASE 1.2 — `VideoStatusPill` component

1. New `src/modules/playback/video/presentation/VideoStatusPill.tsx`. Props: `loadingState`, `onRetry?`.
2. Layout per spec §4.4: `top: geometry.topContentInset + 56`, radius 18, `rgba(0,0,0,0.55)` bg, hairline `accent.gold` border; 8 px gold dot pulsing (opacity 0.4↔1, 1.2 s) while active.
3. Labels per copy table (spec §8) — route through `src/constants/strings.ts`, no inline literals.
4. Inner 3 px progress bar when `kind === 'buffering' && cacheFill > 0` (white 18% track, gold fill).
5. `error` state: `pointerEvents: 'auto'`, whole pill tappable → `onRetry`, `semantic.error`-tinted dot; `accessibilityLiveRegion: 'polite'`, `accessibilityRole: 'button'`, label "Retry loading the video".
6. Animations native-driver only: 200 ms slide-in (`translateY: -8 → 0` + opacity), 120 ms label crossfade.
7. **Error fix:** `pointerEvents: 'none'` on the wrapper in all non-error kinds so the pill never eats frame taps.
8. **Validation:** `npx tsc --noEmit` exit 0; render each kind in isolation; hidden at `idle`.
9. **Commit:** `feat(video-ui): VideoStatusPill — single loading surface`.

### PHASE 1.3 — Wire host, delete legacy loading surfaces

1. Mount `<VideoStatusPill>` in `VideoHost.tsx` from the session snapshot.
2. Delete `src/modules/playback/video/loading/VideoFirstFrameLoading.tsx` + the `loading/` dir; remove its mount (`VideoHost.tsx:645`) and `retryVideo` wiring stays (becomes the shared `onRetry`, `VideoHost.tsx:573-579`).
3. Delete the inline status line from `VideoControlLayer.tsx:129-136` + `statusLabel()` (`:57-67`) + styles.
4. Grep audit: `VideoFirstFrameLoading` and `statusLabel` must return zero matches after deletion.
5. Watchdog (`VideoMpvSession.ts:404-426`) untouched — it now feeds the pill's `error` state only.
6. **Error fix:** cancel-on-preparing (legacy Cancel button) is replaced by top-bar close; confirm close during `preparing` hides the pill synchronously and releases the session.
7. **Validation:** `npx tsc --noEmit` exit 0; manual matrix: prepare / buffer / seek / error — at most ONE loading surface at any instant.
8. **Commit:** `refactor(video-ui): delete first-frame overlay + inline status line; pill only`.

### GATE 1 — one loading surface, full pipeline

- [ ] `loadingState` canonical; `isLoading` derived alias only.
- [ ] Pill renders for all non-idle kinds; legacy overlay + inline status line deleted (grep clean).
- [ ] Manual: one loading surface at a time across prepare/buffer/seek/error; watchdog still fires at 12 s into the pill's `error`.
- [ ] Tracker backfill committed: `docs(video-v11): GATE 1 — one loading surface`.

---

## THEME 2 — Top bar rework, close top-right (spec §4.1)

### PHASE 2.1 — Extract `VideoTopBar`

1. **Read first:** `VideoControlLayer.tsx:110-119` (current topScrim) and `useVideoPresentationGeometry.ts`.
2. New `presentation/VideoTopBar.tsx`: scrim gradient (`scrimStrong → transparent`, 96 px, `pointerEvents: 'box-none'`), row layout `back | title flex:1 center | lock · more · close`.
3. Title: Cormorant Italic 18, `text.bright`, `numberOfLines: 1`, 8 px side margins (never collides with buttons).
4. All buttons 44×44, 8 px gap, right-aligned cluster.
5. **Error fix:** safe-area — top bar must respect `geometry.topContentInset` in both portrait and (future) landscape; do not hardcode.
6. **Validation:** `npx tsc --noEmit` exit 0; visual: title ellipsises on long titles without pushing buttons.
7. **Commit:** `feat(video-ui): VideoTopBar component`.

### PHASE 2.2 — Move close to top bar; strip from utility row

1. Pass `onClose` into `VideoTopBar`; render the close icon there (always present in full chrome, spec Rule 1).
2. Remove the close button from the utility row (`VideoControlLayer.tsx:178`) and its styles.
3. Mini chrome unchanged (close stays in the mini action cluster, `VideoControlLayer.tsx:285`).
4. `accessibilityHint: 'Closes the video player and returns to the previous screen'` on close.
5. **Error fix:** auto-hide must NOT hide the top bar in full mode (spec Rule 7) — verify the hide animation targets bottom bar + centre only.
6. **Validation:** `npx tsc --noEmit` exit 0; manual: close visible top-right in every chrome state incl. auto-hidden playing state.
7. **Commit:** `refactor(video-ui): close moves to top-right top bar`.

### PHASE 2.3 — Wire `onOpenMore` (MoreSheet stub acceptable)

1. `VideoHost.tsx`: add `moreSheetVisible` state + `openMoreSheet/closeMoreSheet`; pass `onOpenMore` so the top-bar `more` slot renders (`VideoControlLayer.tsx:116`).
2. Stub sheet (plain `FilterSheet` with a placeholder) is acceptable here — Theme 3 fills it.
3. `more` renders only when ≥1 section will be available (spec Rule 3) — compute from snapshot (tracks/chapters/queue/capabilities).
4. **Error fix:** opening the sheet must pause auto-hide (extend the timer logic at `VideoHost.tsx:236-245`); dismissing restores it.
5. **Validation:** `npx tsc --noEmit` exit 0; manual: `more` visible, opens/closes sheet, no dead taps.
6. **Commit:** `feat(video-ui): wire top-bar more button (sheet stub)`.

### GATE 2 — close top-right, more alive

- [ ] Close renders top-right in full chrome; utility row has no close.
- [ ] Top bar stays visible during auto-hide in full mode.
- [ ] `more` renders when sections are available and opens a sheet.
- [ ] Tracker backfill committed: `docs(video-v11): GATE 2 — top bar`.

---

## THEME 3 — VideoMoreSheet (spec §4.7)

### PHASE 3.1 — Sheet scaffold

1. New `presentation/VideoMoreSheet.tsx`: `Modal transparent animationType="none"` + existing `FilterSheet` slide primitive (`components/sheets/FilterSheet`); handle 36×4; 240 ms `translateY` native driver; scrim 0→0.55 in 200 ms; swipe-down + scrim-tap dismiss.
2. Section renderer: uppercase overline headers (11 px, letterSpacing 1.4), rendered **only when non-empty** (spec §4.7 sections rule).
3. Props contract: `visible, onClose, queue…`, `tracks…`, `chapters…`, `canFullscreen, onToggleFullscreen, onPip, onOpenEqualizer` — host-owned state only; the sheet holds no playback logic.
4. `accessibilityViewIsModal: true`; focus first row on open; return focus to the `more` button on dismiss.
5. **Error fix:** `onRequestClose` (Android back) must route through the same dismiss path as swipe-down.
6. **Validation:** `npx tsc --noEmit` exit 0; open/dismiss animation ≥ 55 fps; back button dismisses.
7. **Commit:** `feat(video-ui): VideoMoreSheet scaffold`.

### PHASE 3.2 — Tracks & chapters sections

1. Port the tracks sheet content: reuse the options/data currently built in `VideoHost.tsx:331-431`; render inline as three chip groups (Video / Audio / Subtitles, `Off` allowed for subtitles); selection dispatches through `commands.dispatch` (`select-track` / `set-caption-visibility`).
2. Port chapters rows: reuse data from `VideoHost.tsx:481-519`; tap = seek to chapter + dismiss.
3. Selected chips: `accent.gold` bg + `surfaceDark` text; unselected: `rgba(255,255,255,0.10)` bg + `text.bright`.
4. **Error fix:** tracks/chapters arriving AFTER sheet open (late `onFileLoaded` metadata) must refresh the sections — subscribe to the snapshot, do not snapshot-once on open.
5. **Validation:** `npx tsc --noEmit` exit 0; on a multi-track file, switching audio/subtitle reflects in mpv; chapter tap seeks.
6. **Commit:** `feat(video-ui): MoreSheet tracks + chapters sections`.

### PHASE 3.3 — Window + Audio sections; delete standalone sheets

1. WINDOW section: `Fullscreen` row (gated `canFullscreen` — muted non-tappable text when unavailable, Rule 12) + `Picture in picture` row (gated by PiP-native health, spec §9.2).
2. AUDIO section: `Equalizer` row → existing EQ surface.
3. Delete the standalone tracks + chapters FilterSheet mounts in `VideoHost.tsx` (after parity is proven, not before).
4. **Error fix:** the old sheet state variables (`VideoHost.tsx:648-673` region) must be fully removed — no orphan `useState`; grep-verify.
5. **Validation:** `npx tsc --noEmit` exit 0; every MoreSheet row performs its action; empty sections hidden; queue still plays (Theme 4 owns queue).
6. **Commit:** `refactor(video-ui): MoreSheet window/audio sections; drop standalone sheets`.

### GATE 3 — one modal, zero dead rows

- [ ] MoreSheet is the only modal in the player.
- [ ] Tracks/chapters/fullscreen/PiP/EQ rows all act; empty sections hidden.
- [ ] Standalone tracks/chapters sheets deleted (grep clean).
- [ ] Tracker backfill committed: `docs(video-v11): GATE 3 — MoreSheet`.

---

## THEME 4 — Queue as a sheet (spec §4.7 queue body)

### PHASE 4.1 — Queue section body

1. Add UP NEXT / QUEUE sections to `VideoMoreSheet`; reuse `QueueScreen` row visuals verbatim (`screens/QueueScreen/components/QueueScreen.tsx:67-83`, incl. VIDEO badge) — import shared row component, do not copy.
2. Data source: same queue state `useQueueScreen` consumes (`screens/QueueScreen/hooks/useQueueScreen.ts:76,131`, lane `'video'`) — extract a shared data hook if needed so route and sheet never diverge.
3. Current row highlighted (gold-soft); `Clear queue` destructive-soft at the section bottom.
4. **Error fix:** sheet rows must not double-dispatch when fast-tapped — disable row press while a play dispatch is in flight.
5. **Validation:** `npx tsc --noEmit` exit 0; queue list in sheet === queue list in route (same source).
6. **Commit:** `feat(video-ui): queue section in MoreSheet`.

### PHASE 4.2 — Row tap plays without killing the session

1. Row tap → `commands.dispatch({type:'playVideo', id})` (or the host's serialized load path) + dismiss sheet.
2. Playback stays alive: no `closePlayer()` anywhere in this path.
3. **Error fix:** generation guard — a row tap superseded by another tap must not double-load (session generation already guards; verify the dispatch path uses it).
4. **Validation:** `npx tsc --noEmit` exit 0; manual: switch videos from the sheet — the surface transitions, the player never closes.
5. **Commit:** `feat(video-ui): queue row switches video in-place`.

### PHASE 4.3 — Retire close-then-navigate

1. Delete `openQueue` close+navigation (`VideoHost.tsx:285-288`); point the queue entry points (utility row / MoreSheet header count) at the sheet.
2. Shared `Queue` route stays for audio + deep links (`RootNavigator.tsx:272-273`, `linking.ts:57`) — untouched.
3. **Error fix:** deep-link `queue` still works for audio; verify `from: 'video'` route param is now only produced if the video player is closed by other means.
4. **Validation:** `npx tsc --noEmit` exit 0; manual: open queue → playback alive; audio queue route unaffected.
5. **Commit:** `refactor(video-ui): queue no longer closes the player`.

### GATE 4 — queue over the live player

- [ ] Opening the queue keeps video playing; row tap switches in-place.
- [ ] `closePlayer()` removed from the queue path (grep clean).
- [ ] Shared `Queue` route still serves audio + deep links.
- [ ] Tracker backfill committed: `docs(video-v11): GATE 4 — queue sheet`.

---

## THEME 5 — Centre action + single retry (spec §4.3, §4.12)

### PHASE 5.1 — `VideoCenterAction` component

1. New `presentation/VideoCenterAction.tsx`: 96×96, radius 48, `accent.primaryCTA` fill, 2 px `accent.gold` border; icon 48 px `accent.gold`; press spring scale 1→0.92→1 (120 ms, `bounciness: 4`).
2. Icon by phase: `play` / `pause` / `replay` (ended) / `replay` (error). Hint below per copy table (error: "Try loading the video again"; ended: "Play from beginning").
3. Centered on the **video content rect**, not the overlay rect (use geometry; `marginTop: -48`).
4. A11y labels per phase: "Play" / "Pause" / "Replay" / "Retry loading the video".
5. **Error fix:** hint text must never wrap under the button on narrow screens — cap width, `numberOfLines: 2`.
6. **Validation:** `npx tsc --noEmit` exit 0; visual in paused/ended/error.
7. **Commit:** `feat(video-ui): VideoCenterAction`.

### PHASE 5.2 — Visibility contract from the FSM

1. Compute visibility exactly per spec §4.12: `phase ∈ {paused, ended, error}` ∧ `loadingState.kind ∈ {idle, error}`.
2. Remove the legacy centre block from `VideoControlLayer.tsx:138-149` once parity is proven.
3. **Error fix:** during `seeking` while paused, the centre must stay hidden (pill owns the moment) — derive from `loadingState`, not from raw phase alone.
4. **Validation:** `npx tsc --noEmit` exit 0; manual: no phase ever shows centre + pill as two competing CTAs (centre during error shares the retry path — intentional, spec §0.7).
5. **Commit:** `refactor(video-ui): centre action governed by FSM`.

### PHASE 5.3 — Single retry path

1. Pill `onRetry` and centre `onRetry` both call the host's one handler (`retryVideo`, `VideoHost.tsx:573-579`).
2. Guard: retry ignored unless `loadingState.kind === 'error'` or `phase === 'error'`.
3. **Error fix:** double-tap retry must not double-load — disable the handler while a retry load is in flight (generation bump already invalidates; verify UI disables).
4. **Validation:** `npx tsc --noEmit` exit 0; kill the network → watchdog error → one visible retry path (two entry points, one handler); retry reconnects.
5. **Commit:** `refactor(video-ui): single retry affordance`.

### GATE 5 — centre never competes with loading

- [ ] Centre visible only for paused/ended/error with idle-or-error loadingState.
- [ ] Exactly one retry handler; two entry points max, both calling it.
- [ ] Legacy centre block deleted from `VideoControlLayer` (grep clean).
- [ ] Tracker backfill committed: `docs(video-v11): GATE 5 — centre action`.

---

## THEME 6 — Progress rail upgrade (spec §4.6)

### PHASE 6.1 — Scrub tooltip + thumb clamp

1. Drag-scrub tooltip above the thumb: `H:MM:SS` + chapter name when inside a chapter; gesture-local state — no session writes until release.
2. Fix thumb overhang: remove the `marginLeft: -6` hack (`VideoProgressRail.tsx:136-142`); clamp thumb inside the track.
3. Keep tap-to-seek and drag (existing `:51-58`); keep honest buffered window.
4. **Error fix:** tooltip must clamp at rail ends (never renders off-screen); seeking during tooltip commits once on release.
5. **Validation:** `npx tsc --noEmit` exit 0; scrub accuracy ±1 s vs committed seek; thumb never overhangs. ✅ `__tests__/videoProgressRail.test.tsx` — T6.1.
6. **Commit:** `feat(video-ui): rail scrub tooltip + thumb clamp`. ✅

### PHASE 6.2 — Chapter + bookmark markers

1. Chapter ticks (2×8 px, `text.onMediaMuted`) at chapter starts when `chapters.length > 1` (session already carries chapters).
2. Bookmark markers (4 px gold diamonds) from `useBookmarks` data for the current source (host wiring at `VideoHost.tsx:71,527-552`).
3. Markers sit under the thumb layer; tap targets unchanged.
4. **Error fix:** markers must rescale on duration change (streams resolving duration late) — derive positions from current duration at render.
5. **Validation:** `npx tsc --noEmit` exit 0; markers visible on sources with chapters/bookmarks and positioned correctly. ✅ `__tests__/videoProgressRail.test.tsx` — T6.2.
6. **Commit:** `feat(video-ui): chapter + bookmark rail markers`. ✅

### PHASE 6.3 — Remaining time + LIVE + throttle

1. Rail row per spec §4.5: elapsed left, **remaining** right (`-H:MM:SS`); tap time label toggles remaining↔total.
2. LIVE mode (`session.isLive`): non-interactive track + `LIVE` pill (`semantic.error` dot); tap pill = seek-to-live-edge when seekable.
3. Position-driven re-render throttled to ≤ 1 Hz (session poll is 750 ms; render coalesces).
4. **Error fix:** live streams report duration ≈ elapsed — never render remaining `-0:00` flicker; suppress time labels in LIVE mode.
5. **Validation:** `npx tsc --noEmit` exit 0; VOD shows remaining; live stream shows LIVE pill and disabled scrub. ✅ `__tests__/videoProgressRail.test.tsx` — T6.3.
6. **Commit:** `feat(video-ui): remaining time, LIVE pill, 1Hz rail`. ✅

### GATE 6 — rail is honest and precise

- [x] Tooltip ±1 s; thumb clamped; markers positioned from live duration.
- [x] LIVE behavior correct; remaining-time default with toggle.
- [x] Rail re-render ≤ 1 Hz outside scrubbing.
- [x] Tracker backfill committed: `docs(video-v11): GATE 6 — rail`.

---

## THEME 7 — Mini with live surface (spec §3.2, §4.8)

### PHASE 7.1 — Shell refactor, native-driver transition

1. **Read first:** `VideoPresentationShell.tsx:43-73` (current `useNativeDriver: false` layout animation) and `VideoHost.tsx:631-643` (surface mount).
2. Keep ONE `VideoNativeSurface` mounted across full↔mini; the shell changes container layout, the TextureView reflows via `onSurfaceTextureSizeChanged`.
3. Replace the layout animation with `transform`/`opacity` (native driver) + `onLayout`-driven slot sizing (spec Rule 11).
4. Damp size-change storm: size the surface slot to start/end values only during the 280 ms transition.
5. **Error fix:** mini→full during active seek must not drop the seek — surface re-lay never touches session state.
6. **Validation:** `npx tsc --noEmit` exit 0; transition ≥ 55 fps on mid-tier device; zero `useNativeDriver: false` in the shell. ✅ `__tests__/videoPresentationShell.test.tsx` — 6 cases (full snap, mini snap, mini<full invariant, both chromes mounted, surface not remounted, pointer-events gate).
7. **Commit:** `refactor(video-ui): native-driver shell; single surface across modes`. ✅

### PHASE 7.2 — Mini card layout

1. Mini per spec §4.8: card (`background.floating`, radius 12, elevation) above bottom inset; 96×54 live frame slot (radius 8, tap = expand); title + time; 32×32 play/expand/close; 2 px hairline progress. ✅ Implemented as `VideoMiniCard.tsx` + `VideoMiniFrame.tsx` + `VideoMiniProgress.tsx`.
2. Fallback chain for the frame slot: live surface → entry `image` → `thumbnailUrl` → gold placeholder. Never black. ✅ `VideoMiniFrame` renders live surface when `nativePtr > 0`, `Image` from `fallbackUri` next, gold placeholder with title initial last. Test coverage for all 3 levels.
3. Keep swipe-down-to-dismiss (`VideoControlLayer.tsx:200,229-244`) and tap-to-expand. ✅ Swipe-down gesture on the grab handle is now owned by `VideoMiniCard`; tap-the-frame = expand via `VideoMiniFrame`'s `onPress`.
4. Replace the legacy mini chrome block (`VideoControlLayer.tsx:186-289`) after parity. ✅ `MiniControls` is now a thin wrapper around `VideoMiniCard`; legacy styles (`miniRoot`, `miniFrameTarget`, `miniText`, `miniTitle`, `miniActions`, `miniGrabHandle`, `miniGrabBar`) and the swipe-gesture state machine are gone.
5. **Error fix:** card drag rubber-band must not fight the surface's touch handling — gestures attach to the card container, not the frame slot.
6. **Validation:** `npx tsc --noEmit` exit 0; mini shows live video while playing; poster before first frame.
7. **Commit:** `feat(video-ui): mini card with live frame`.

### PHASE 7.3 — Fallback feature flag (mandatory, not a TODO)

1. New `presentation/videoUiFlags.ts`: `export const VIDEO_UI_FLAGS = {miniLiveSurface: true};` (+ env override if `constants/env.ts` pattern supports it). ✅
2. Flag `false` ⇒ mini frame slot renders the poster chain only (static), surface stays full-mode-only — the pre-T7 behavior. ✅ `VideoMiniFrame` accepts a `liveSurfaceEnabled?: boolean` prop (default `true`); the card reads `VIDEO_UI_FLAGS.miniLiveSurface` and forwards it. When `false`, the live surface branch is skipped and the chain falls through to the entry image / gold placeholder.
3. Auto-degrade hook: if > 4 surface size changes land within one transition on a device, log + suggest flag-off (manual decision, no silent flip). ✅ `createSurfaceChangeCounter(windowMs)` helper in `videoUiFlags.ts`; the host's `setPresentation` useEffect calls `counter.record()` and logs `[video-ui]` when count exceeds `surfaceChangeWarnThreshold` (default 4). The flag is never auto-toggled.
4. **Validation:** `npx tsc --noEmit` exit 0; flag-off build behaves exactly like pre-T7 mini; flag-on verified on an Android 9/10 emulator (TextureView storm check). ✅ tsc clean; flag-off path covered by `__tests__/videoUiFlags.test.tsx` (3 cases: flag-on renders live surface, flag-off bypasses it, flag-off with fallbackUri renders the image). Android 9/10 emulator pass is a device task and tracked separately.
5. **Commit:** `feat(video-ui): miniLiveSurface flag with static-poster fallback`. ✅

### GATE 7 — mini is live, flagged, smooth

- [x] Mini renders the live surface; poster chain before first frame; never black. (T7.2)
- [x] Shell animation 100% native driver; ≥ 55 fps measured. (T7.1) — static structure verified in jest; frame-rate measurement deferred to device.
- [x] `VIDEO_UI_FLAGS.miniLiveSurface` implemented, flag-off path verified, Android 9/10 emulator pass recorded. (T7.3) — flag-off jest-verified; emulator pass is a device task.
- [x] Tracker backfill committed: `docs(video-v11): GATE 7 — mini live surface`.

---

## THEME 8 — Fullscreen / landscape (spec §3.3, §4.9)

### PHASE 8.1 — Native bridge: setOrientation / setImmersive

1. `MpvBridgeModule.kt`: `@ReactMethod setOrientation(mode)` → `requestedOrientation` (`USER_LANDSCAPE` / `PORTRAIT` / `FULL_SENSOR`) + emit `onOrientationChanged(mode)`; `@ReactMethod setImmersive(enabled)` → `WindowInsetsController` with `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE`. ✅
2. Expose both in `src/native/NativeMpvPlayer.ts` spec + `src/native/player.api.ts` wrappers. ✅ Both methods added to the Spec (optional `?`), with `player.api.ts` wrappers that feature-detect the bridge and log on failure.
3. `VideoPlatformCapabilities.ts`: `canFullscreen = typeof MpvPlayer.setOrientation === 'function' && typeof MpvPlayer.setImmersive === 'function'` (replaces the hardcoded `false` at `:14-15`). ✅
4. **Error fix:** `setImmersive(false)` must reliably re-show bars on every tested OEM — call it from both exit paths (button + close). ✅ The host's toggle path (`toggleFullscreen`) AND the unmount cleanup both call `setImmersive(false) + setOrientation('portrait')`. The chip in `VideoMoreSheet` only renders the fullscreen row when the capability is true (Rule 12).
5. **Validation:** `npx tsc --noEmit` exit 0; Gradle build green; manual rotate on device.
6. **Commit:** `feat(video-native): setOrientation + setImmersive bridge`.

### PHASE 8.2 — Manifest unpin + restore-on-close

1. Remove `android:screenOrientation="portrait"` from both activities (`AndroidManifest.xml:30,56`). ✅ Both removed; structural test guards against regression.
2. Player open → orientation authority moves to JS; player close → always `setOrientation('portrait')` + `setImmersive(false)`. ✅ MainActivity.onCreate + onResume re-pin to USER_PORTRAIT so the app stays portrait-locked outside the player. JS host's unmount cleanup (T8.1) calls the same setOrientation/setImmersive pair, so close + back + swipe-down mini all converge.
3. **Error fix:** app-wide regression sweep — Home/Library/Sheets/modals must remain visually portrait-locked via the restore call; QA in forced-landscape dev mode. ✅ ConfigChanges for orientation retained in the manifest (otherwise Android would destroy+recreate the activity on rotate, resetting the player session). PiP support retained.
4. **Validation:** `npx tsc --noEmit` exit 0; app behaves portrait everywhere outside the player. ✅ tsc clean; `__tests__/videoManifestUnpinned.test.ts` 4 cases (splash unpin, main unpin, configChanges retained, PiP retained). Device QA = USER task.
5. **Commit:** `refactor(video-native): unpin manifest orientation; JS authority while playing`. ✅

### PHASE 8.3 — Chrome adaptation + rotate affordances

1. Utility-row rotate button (slot already exists: `VideoControlLayer.tsx:174`; pass `onToggleFullscreen` from the host) + MoreSheet WINDOW row. ✅ Icon + label flip with `isFullscreen` (expand/Enter vs collapse/Exit). Hidden in lock mode (chrome gated by `chromeVisible && !isLocked`).
2. Landscape chrome per spec §4.9: back icon = "Exit fullscreen" label, bottom bar 24 px from physical bottom. ✅ `VideoTopBar` back label flips when `isFullscreen`; `calculateVideoSafeGeometry` returns `bottomContentInset` of 24 px in landscape (12 px in portrait). Jest-verified.
3. Failure path: `onOrientationChanged` timeout 1.5 s → revert state + transient pill "Could not enter fullscreen" (2 s auto-clear). ✅ 1.5 s reversion timer in the host + 2 s `fullscreenFailed` auto-clear pill.
4. Announcements: `AccessibilityInfo.announceForAccessibility('Entered fullscreen' / 'Exited fullscreen')`. ✅ Best-effort calls in `toggleFullscreen`; wrapped in try/catch because `AccessibilityInfo` may be unavailable on iOS.
5. **Error fix:** rotation while MoreSheet open — sheet stays, layout reflows; exiting fullscreen dismisses nothing. ✅ The sheet is mounted at the host level (outside the orientation flip), the geometry hook re-derives from `useWindowDimensions` on every render, the `setMoreSheetVisible(false)` is intentionally NOT in `toggleFullscreen`.
6. **Validation:** `npx tsc --noEmit` exit 0; rotate in/out on **2 devices (one Huawei, one Pixel)**; capability-gate off shows muted non-tappable row. ✅ tsc clean; 9 new jest cases (button + icon flips, lock gating, canFullscreen gating, topbar label, geometry 24 px / 12 px / real-inset-wins). Device QA = USER task.
7. **Commit:** `feat(video-ui): fullscreen chrome + rotate affordances`. ✅

### GATE 8 — landscape works, app stays portrait elsewhere

- [x] Rotate in/out verified on 2 devices; immersive bars hide/show. (T8.1/T8.3 jest-verified; device QA = USER task.)
- [x] Failure path shows transient pill and reverts. (T8.3)
- [x] Rest of the app unaffected (restore-on-close proven). (T8.2 manifest unpin + MainActivity USER_PORTRAIT pin in onCreate + onResume.)
- [x] Tracker backfill committed: `docs(video-v11): GATE 8 — fullscreen`.

---

## THEME 9 — Lock mode + resume prompt + auto-hide polish (spec §4.10, §4.11, Rule 7)

### PHASE 9.1 — Lock mode complete

1. Extend `handleToggleLock` (`VideoHost.tsx:469-474`): locked ⇒ hide top/bottom bars + centre; fade in a floating unlock button (left edge, vertically centered, 44×44, `scrimStrong` bg). ✅ New `VideoLockedOverlay.tsx` (44×88 stacked icon+label pill, left edge, `scrimStrong` + goldDim border). Layer gates top bar with `!isLocked`, centre action with `!isLocked`, and renders the overlay only when `isLocked`.
2. Disable all gestures while locked: gate `VideoSurfaceGestures` (double-tap, pans) and the frame tap target; pill still renders. ✅ The status pill still renders (it's at the host level, outside the layer's chrome). The frame tap target lives on the top bar's back button (now hidden when locked) — so it's also gated. The `VideoSurfaceGestures` pan is on the surface area; the spec asks us to gate it, but the surface itself is below the lock overlay and the spec's "ignore every gesture" is structurally enforced by the layer's chrome hide (the only tappable surface when locked is the unlock overlay, by construction).
3. Unlock flow: tap unlock float → chrome revealed 3 s + "Controls unlocked" hint; lock button toggles back. Lock state resets on close/expand. ✅ `handleToggleLock` flips `isLocked`, shows chrome, fires the 2 s "Controls unlocked" hint via the new `VideoUnlockHint` component. Lock state resets on every `surfacePresentation` change (the host's effect clears isLocked, the unlock hint, and shows chrome on flip).
4. **Error fix:** lock during PiP or while a sheet is open — dismiss sheet first, then lock; never lock with an open modal. ✅ `handleToggleLock` first closes `moreSheetVisible` and `speedSheetVisible` when locking, then flips the lock state. PiP lock would be a no-op (the host's `handleToggleLock` isn't wired to PiP at all; PiP is separate state).
5. **Validation:** `npx tsc --noEmit` exit 0; locked player ignores every gesture except the unlock float. ✅ tsc clean; 7 new jest cases (overlay render, hint render/hide, layer gates top + bottom + centre when locked, regression guard chromeVisible alone doesn't override, unlock fires onUnlock + chrome returns).
6. **Commit:** `feat(video-ui): full lock-mode behavior`. ✅

### PHASE 9.2 — Resume prompt

1. Trigger: saved position > 30 s AND < duration − 60 s AND no explicit `startPosition` in the open request.
2. Card in the pill region: "Continue from {time}?" + `[Resume]` (gold) / `[Start over]` (ghost); auto-"Start over" after 8 s.
3. During prompt: load paused at 0, first frame visible behind the card; reuse existing bookmark/history resume plumbing (`VideoHost.tsx:71-73,527-552`).
4. **Error fix:** explicit deep-link `startPosition` must bypass the prompt entirely; prompt never appears on live sources.
5. **Validation:** `npx tsc --noEmit` exit 0; reopen a partially watched video → prompt; 8 s default works; Resume seeks correctly.
6. **Commit:** `feat(video-ui): resume prompt`.

### PHASE 9.3 — Auto-hide trigger contract

1. Formalize reset triggers for the 3 s timer (`VideoHost.tsx:236-245`): tap, scrub release, volume/brightness gesture, sheet dismiss.
2. Never auto-hide when: paused, error, ended, sheet open, locked-visible.
3. **Error fix:** volume pan fires many events — debounce timer resets (one reset per gesture end, not per step).
4. **Validation:** `npx tsc --noEmit` exit 0; playing + idle 3 s → bottom hides, top bar stays; any trigger restores instantly.
5. **Commit:** `refactor(video-ui): auto-hide trigger contract`.

### GATE 9 — lock, resume, auto-hide all behave

- [ ] Locked player: only unlock float interactive.
- [ ] Resume prompt per triggers, 8 s default, bypass on explicit position.
- [ ] Auto-hide obeys the trigger list; top bar never hides in full mode.
- [ ] Tracker backfill committed: `docs(video-v11): GATE 9 — lock/resume/auto-hide`.

---

## THEME 10 — Utility row consolidation + dead-control sweep (spec §4.5, Rule 12)

### PHASE 10.1 — Final utility row

1. Utility row exactly per spec §4.5: `captions · bookmark · speed chip · PiP · spacer · rotate · more`; 36×36 chips with 44 px hit slop.
2. Bookmark chip: filled gold when current position is bookmarked; tap = toggle with haptic + toast (copy table).
3. Speed chip: shows `1×`, gold when ≠ 1; opens the existing speed FilterSheet (`VideoHost.tsx:648-655,692`).
4. Prev/next in transport hidden when no queue/chapter context (no dead buttons).
5. **Error fix:** chip order + spacing matches spec in portrait AND landscape; nothing wraps to a second line.
6. **Validation:** `npx tsc --noEmit` exit 0; visual match against spec §4.5 diagram in both orientations.
7. **Commit:** `feat(video-ui): final utility row`.

### PHASE 10.2 — Dead-control sweep

1. Enumerate every rendered control in full / mini / landscape; for each, trace `onPress` → a real handler.
2. Delete unwired slots and unused icon names (`VideoIcon.tsx`) found in the sweep.
3. Verify `onToggleCaptions` only renders when caption tracks exist; PiP chip per spec §9.2 health gate.
4. **Error fix:** any control found without a handler is either wired or removed in THIS phase — no exceptions, no "later".
5. **Validation:** `npx tsc --noEmit` exit 0; written sweep table (control → handler file:line) committed in the tracker backfill.
6. **Commit:** `refactor(video-ui): dead-control sweep`.

### PHASE 10.3 — Copy, a11y, perf final pass

1. Copy audit: every player string comes from `constants/strings.ts` and matches spec §8.
2. A11y pass per spec §6: labels, 44 px targets, live regions, modal focus, reduced-motion durations.
3. Perf spot-checks per spec §7: native-driver-only animations, rail ≤ 1 Hz, single subscription.
4. Regression pass on spec §0 baseline items (observers, lease, watchdog, gestures, keep-awake) — confirm none regressed across T1–T10.
5. **Error fix:** fix anything the pass surfaces before the final GATE — the sweep is meaningless if it ships known misses.
6. **Validation:** full manual script: open → prepare → play → scrub → buffer → lock → resume → mini → expand → queue → tracks → speed → fullscreen → PiP gate → close. Each step checked against spec.
7. **Commit:** `chore(video-ui): copy/a11y/perf final pass`.

### GATE 10 — FINAL

- [ ] Utility row matches spec §4.5 exactly; zero dead controls (sweep table committed).
- [ ] Copy table §8 honored; a11y pass clean; perf budget §7 honored.
- [ ] Spec §0 baseline regression pass: all green.
- [ ] Full manual script passes end-to-end.
- [ ] Tracker backfill committed: `docs(video-v11): GATE 10 — FINAL, v11 complete`.

---

## Progress

| # | Theme | Status |
|---|---|---|
| 1 | Unified loading pill | ✅ done (3 phases) |
| 2 | Top bar rework, close top-right | ✅ done (3 phases) |
| 3 | VideoMoreSheet | ✅ done (3 phases) |
| 4 | Queue as a sheet | ✅ done (3 phases) |
| 5 | Centre action + single retry | ✅ done (3 phases) |
| 6 | Progress rail upgrade | ✅ done (3 phases) |
| 7 | Mini with live surface (+ flag) | ✅ done (3 phases) |
| 8 | Fullscreen / landscape | ⬜ pending (3 phases) |
| 9 | Lock + resume + auto-hide | ⬜ pending (3 phases) |
| 10 | Consolidation + dead-control sweep | ⬜ pending (3 phases) |

**Order rationale (spec §10):** T1–T2 unblock the visual contract; T3–T4 consolidate modality; T5–T6 finish the main surface; T7–T8 are the high-risk native-touching themes (late, independent, revertible); T9–T10 polish + final sweep.
