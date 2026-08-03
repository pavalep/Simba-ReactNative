# SIMBA Mobile: UI/UX Elevation v5 — Progress Tracker & Execution Plan

> **Source Spec:** [`UI_UX_Elevation_Specification_v5.md`](UI_UX_Elevation_Specification_v5.md)
> **Supersedes:** `UI_UX_Elevation_Progress_Tracker_v4.md`
> **Purpose:** Track all 10 phases of v5 — Netflix-grade video player behavior fixes. Execute without waiting for further orders.
> **Strict Rules:** Follow v5 spec exactly. Hook pattern (`useXxxScreen.ts`), component-only UI, `AppButton`/`IconButton` usage, `ActivityOrb` for all loading states, theme tokens for colors, player-as-component architecture.

---

## Implementation Strategy

The 10 phases are executed in strict sequential order. Each phase builds on the previous one — Phase 1 (lock fix) is a prerequisite for Phase 8 (controls in all states), etc.

```
PHASE 1: Fix Controls Locked Default
  → Phase 2: Add Volume Control to Primary UI
    → Phase 3: Fix Play/Pause Visibility
      → Phase 4: Fix Back Button Navigation
        → Phase 5: Portrait Default + Landscape Toggle Fix
          → Phase 6: Buffered Region Visualization on SeekBar
            → Phase 7: Integrated Buffering State (Loader Reuse)
              → Phase 8: Volume Bar and Play/Pause in All States
                → Phase 9: Double-Tap to Seek + Edge Swipe Gestures
                  → Phase 10: Input Region Buffering (Seek Into Buffered = Instant Play)
```

---

## Current Status Summary

| Phase | Title | ✅ Done | 🟡 Partial | ⚪ Remaining | Status |
|---|---|---|---|---|---|
| Phase 1 | Fix Controls Locked Default | 0/5 | 0 | 5 | ⚪ NOT STARTED |
| Phase 2 | Add Volume Control to Primary UI | 0/6 | 0 | 6 | ⚪ NOT STARTED |
| Phase 3 | Fix Play/Pause Visibility | 0/6 | 0 | 6 | ⚪ NOT STARTED |
| Phase 4 | Fix Back Button Navigation | 0/6 | 0 | 6 | ⚪ NOT STARTED |
| Phase 5 | Portrait Default + Landscape Toggle Fix | 0/7 | 0 | 7 | ⚪ NOT STARTED |
| Phase 6 | Buffered Region Visualization on SeekBar | 0/7 | 0 | 7 | ⚪ NOT STARTED |
| Phase 7 | Integrated Buffering State (Loader Reuse) | 0/7 | 0 | 7 | ⚪ NOT STARTED |
| Phase 8 | Volume Bar and Play/Pause in All States | 0/8 | 0 | 8 | ⚪ NOT STARTED |
| Phase 9 | Double-Tap to Seek + Edge Swipe Gestures | 0/8 | 0 | 8 | ⚪ NOT STARTED |
| Phase 10 | Input Region Buffering | 0/5 | 0 | 5 | ⚪ NOT STARTED |
| **TOTAL** | | **0/60** | **0** | **60** | ⚪ NOT STARTED |

---

## PHASE 1 — Fix Controls Locked Default

**Status:** ⚪ NOT STARTED
**Spec Ref:** Phase 1 (v5 spec)
**Dependencies:** None
**Files:** [`useVideoPlayerScreen.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts), [`VideoPlayerTopBar.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerTopBar.tsx)

**Problem:** Controls appear locked by default. The padlock icon shows the locked glyph (🔒). Users see no controls after video loads because PrimaryControls, SecondaryToolbar are gated on `!controlsLocked`.

**Checklist:**

- [ ] 1.1 Verify `controlsLocked` initializes to `false` at [useVideoPlayerScreen.ts:113](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts#L113) and stays `false` on first render
- [ ] 1.2 Debug: trace all `setControlsLocked` calls — find where `true` is set during init
- [ ] 1.3 Fix padlock icon at [VideoPlayerTopBar.tsx:231-232](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerTopBar.tsx#L231-L232): unlocked glyph (🔓) when `false`, locked glyph (🔒) when `true`
- [ ] 1.4 Even when locked, TopBar must remain visible with an "unlock chip" (Netflix behavior) — modify render gating in [`VideoPlayer.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayer.tsx)
- [ ] 1.5 Verify: fresh app launch → open video → controls visible immediately after `loadingPhase === 'ready'`

---

## PHASE 2 — Add Volume Control to Primary UI

**Status:** ⚪ NOT STARTED
**Spec Ref:** Phase 2 (v5 spec)
**Dependencies:** Phase 1 (controls must be unlocked to see volume)
**Files:** [`VideoPlayer.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_PUBLIC/src/components/player/VideoPlayer/VideoPlayer.tsx), [`PrimaryControls.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/PrimaryControls.tsx), [`VideoPlayerVolumePanel.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerVolumePanel.tsx)

**Problem:** Volume is only adjustable via edge swipe or opening the `VideoPlayerVolumePanel` bottom sheet. No visible volume slider or icon in the primary controls.

**Checklist:**

- [ ] 2.1 Add volume icon button (🔊/🔇) to SecondaryToolbar in [`VideoPlayer.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayer.tsx), next to playback speed
- [ ] 2.2 Inline volume slider appears when icon is tapped (or always visible in expanded mode)
- [ ] 2.3 Volume icon reflects mute state (🔊 for 1-100%, 🔇 for muted)
- [ ] 2.4 Slider thumb color = gold accent (`colors.accent.gold`)
- [ ] 2.5 Volume swipe gesture (left edge) still works — no conflict with inline slider
- [ ] 2.6 Test: volume adjustable via inline slider without opening the volume panel sheet

---

## PHASE 3 — Fix Play/Pause Visibility

**Status:** ⚪ NOT STARTED
**Spec Ref:** Phase 3 (v5 spec)
**Dependencies:** Phase 1 (controls unlocked)
**Files:** [`VideoPlayer.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayer.tsx), [`PrimaryControls.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/PrimaryControls.tsx), [`VideoPlayerVideoSurface.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerVideoSurface.tsx)

**Problem:** Play/pause button is "missing now" — likely because controls are locked (Phase 1 fix) or the gating logic in [`VideoPlayerVideoSurface.tsx:86`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerVideoSurface.tsx#L86) is wrong.

**Checklist:**

- [ ] 3.1 PrimaryControls play/pause always renders when `loadingPhase === 'ready'` and surface is visible — verify at [VideoPlayer.tsx:355](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayer.tsx#L355)
- [ ] 3.2 Play/pause responds to tap immediately (< 100ms perceived)
- [ ] 3.3 Center play button in `VideoPlayerVideoSurface.tsx:86` only shows when paused + controls hidden + loaded (not playing)
- [ ] 3.4 Play/pause icon reflects actual playing state (not lagging from TransportProvider polling)
- [ ] 3.5 On tap of paused video, play/pause works even if SecondaryToolbar is hidden
- [ ] 3.6 Test: load video → wait for load → play/pause button visible and functional

---

## PHASE 4 — Fix Back Button Navigation

**Status:** ⚪ NOT STARTED
**Spec Ref:** Phase 4 (v5 spec)
**Dependencies:** None
**Files:** [`useVideoPlayerScreen.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts)

**Problem:** Android back button "closing app not correct." The handler at [useVideoPlayerScreen.ts:1351-1359](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts#L1351-L1359) calls `handleGoBack()` which may navigate to `MainTabs` or exit if the stack is empty.

**Checklist:**

- [ ] 4.1 Back button on VideoPlayer → `navigation.goBack()` if `canGoBack()` is true
- [ ] 4.2 If `canGoBack()` is false (player opened as initial route) → show "Press back again to exit" toast, not immediate exit
- [ ] 4.3 Second back press within 2 seconds → exit app
- [ ] 4.4 `handleGoBack` properly stops mpv, hides surface, saves position, resets landscape
- [ ] 4.5 Back button does NOT fire while controls are locked (or shows unlock prompt instead)
- [ ] 4.6 Test: open video from Library → back button → returns to Library, not app exit

---

## PHASE 5 — Portrait Default + Landscape Toggle Fix

**Status:** ⚪ NOT STARTED
**Spec Ref:** Phase 5 (v5 spec)
**Dependencies:** None
**Files:** [`useVideoPlayerScreen.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts), [`VideoPlayer.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayer.tsx), [`VideoPlayerTopBar.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerTopBar.tsx)

**Problem:** "by default is coming as landscape, not correct." `isLandscape` starts `false` but something causes landscape to be the effective default. The rotate toggle icon and behavior may also be confusing.

**Checklist:**

- [ ] 5.1 Verify `isLandscape` initializes to `false` (portrait) at [useVideoPlayerScreen.ts:233](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts#L233)
- [ ] 5.2 Portrait: rotate icon shows "enter landscape" glyph, label "Enter landscape"
- [ ] 5.3 Landscape: rotate icon shows "exit to portrait" glyph, label "Exit to portrait"
- [ ] 5.4 The rotate button is always visible in TopBar — not gated by controlsLocked
- [ ] 5.5 Rotation transform in [VideoPlayer.tsx:539-548](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayer.tsx#L539-L548) correctly maps width/height swap
- [ ] 5.6 Tapping rotate toggles within 100ms
- [ ] 5.7 Test: open video → portrait by default → tap rotate → landscape → tap again → portrait

---

## PHASE 6 — Buffered Region Visualization on SeekBar

**Status:** ⚪ NOT STARTED
**Spec Ref:** Phase 6 (v5 spec)
**Dependencies:** None
**Files:** [`useVideoPlayerScreen.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts), [`SeekBar.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/SeekBar/SeekBar.tsx), [`PrimaryControls.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/PrimaryControls.tsx)

**Problem:** "buffered video shows in light color how much is bufferd" — no buffered-progress visualization on the SeekBar. Users can't see what's pre-loaded.

**Checklist:**

- [ ] 6.1 Capture `bufferedPercent` from `onBuffering` event at [useVideoPlayerScreen.ts:1572](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts#L1572) (not just boolean `isBuffering`)
- [ ] 6.2 SeekBar renders a gray/secondary fill behind the gold progress representing buffered range
- [ ] 6.3 When seeking into buffered region, playback starts immediately (no stall)
- [ ] 6.4 BufferingBar (full-screen ActivityOrb) shows on initial buffer + during playback stalls
- [ ] 6.5 Buffered percentage updates in real-time as mpv reports cache fill
- [ ] 6.6 Visual: buffered fill color = `colors.background.overlay` (light gray)
- [ ] 6.7 Test: stream video → watch buffer fill grow on seek bar → seek ahead → buffer shows, then plays

---

## PHASE 7 — Integrated Buffering State (Loader Reuse)

**Status:** ⚪ NOT STARTED
**Spec Ref:** Phase 7 (v5 spec)
**Dependencies:** Phase 6 (buffered percent), existing `VideoPlayerLoadingOverlay`
**Files:** [`VideoPlayer.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayer.tsx), [`VideoPlayerLoadingOverlay.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerLoadingOverlay.tsx), [`useVideoPlayerScreen.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts)

**Goal:** The `VideoPlayerLoadingOverlay` (already inside the player component at [VideoPlayer.tsx:809](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayer.tsx#L809)) is reused for buffering during playback. Same component, different message.

**Checklist:**

- [ ] 7.1 When `isBuffering` is true during playback, show `VideoPlayerLoadingOverlay` with message "Buffering…" instead of thin `BufferingBar`
- [ ] 7.2 When `isBuffering` is true during initial load, show `VideoPlayerLoadingOverlay` with `loadingMessage` (existing behavior)
- [ ] 7.3 The loader overlay is inside the player component (confirmed — renders at [VideoPlayer.tsx:809](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayer.tsx#L809))
- [ ] 7.4 When buffering resolves, overlay lifts and controls remain visible (no flicker)
- [ ] 7.5 ActivityOrb shows "Buffering…" label during playback stalls
- [ ] 7.6 Remove or deprecate thin `BufferingBar` component (`BufferingBar.tsx`) — replaced by overlay reuse
- [ ] 7.7 Test: play video → force stall → overlay shows "Buffering…" → resumes → overlay lifts

---

## PHASE 8 — Volume Bar and Play/Pause in All States

**Status:** ⚪ NOT STARTED
**Spec Ref:** Phase 8 (v5 spec)
**Dependencies:** Phases 1, 2, 3
**Files:** [`VideoPlayer.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayer.tsx), [`PrimaryControls.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/PrimaryControls.tsx), [`SecondaryToolbar.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/PrimaryControls.tsx)

**Goal:** Every control is visible and functional in every non-loading, non-locked state. No missing controls.

**Checklist:**

- [ ] 8.1 Volume icon button always visible in SecondaryToolbar (TopBar visible even when locked)
- [ ] 8.2 Play/pause always in PrimaryControls (bottom bar)
- [ ] 8.3 SeekBar always in PrimaryControls with buffered region visualization
- [ ] 8.4 When locked: gestures disabled, but TopBar + small unlock chip remain visible
- [ ] 8.5 SecondaryToolbar auto-hides after 4s of inactivity, reappears on tap
- [ ] 8.6 Lock icon in TopBar always tappable (toggles lock state)
- [ ] 8.7 All icons have proper accessibility labels
- [ ] 8.8 Test: load video → all controls visible → lock → top bar + unlock chip visible → unlock → all controls back

---

## PHASE 9 — Double-Tap to Seek + Edge Swipe Gestures

**Status:** ⚪ NOT STARTED
**Spec Ref:** Phase 9 (v5 spec)
**Dependencies:** Phase 1 (controls unlocked), existing gesture layer
**Files:** [`VideoPlayerGestureLayer.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerGestureLayer.tsx), [`SeekFeedbackOverlay.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/SeekFeedbackOverlay.tsx), [`useVideoPlayerScreen.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts)

**Goal:** YouTube/Netflix-style gestures — double-tap left/right for ±10s, vertical edge swipes for volume/brightness.

**Checklist:**

- [ ] 9.1 Double-tap left half → seek -10s + show "−10s" pill overlay
- [ ] 9.2 Double-tap right half → seek +10s + show "+10s" pill overlay
- [ ] 9.3 Left edge swipe → volume control with overlay bar
- [ ] 9.4 Right edge swipe → brightness control with overlay bar
- [ ] 9.5 Gestures respect `controlsLocked` — disabled when locked
- [ ] 9.6 Gestures respect `loadingPhase` — disabled during initial load
- [ ] 9.7 Visual feedback pill animates: spring scale 0.85 → 1.0 over 300ms
- [ ] 9.8 Test: play video → double-tap right → "+10s" pill → seek works → double-tap left → "−10s" pill → seek works

---

## PHASE 10 — Input Region Buffering (Seek Into Buffered = Instant Play)

**Status:** ⚪ NOT STARTED
**Spec Ref:** Phase 10 (v5 spec)
**Dependencies:** Phase 6 (buffered percent), Phase 7 (integrated buffering)
**Files:** [`useVideoPlayerScreen.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts), [`SeekBar.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/SeekBar/SeekBar.tsx)

**Goal:** Seeking into a buffered region plays instantly. Seeking to unbuffered region shows buffering overlay.

**Checklist:**

- [ ] 10.1 Seeking via SeekBar scrub to buffered region → mpv plays from cache (no re-buffer)
- [ ] 10.2 Seeking to unbuffered region → `isBuffering` fires → overlay shows "Buffering…"
- [ ] 10.3 After seek, `loadingPhase` stays `'ready'` (don't re-trigger initial load gate)
- [ ] 10.4 Seek preview thumbnail bubble follows finger (optional polish)
- [ ] 10.5 Test: load remote stream → let buffer 30% → scrub to 20% → instant play → scrub to 80% → buffering overlay → plays when ready

---

## Wave Gate Check (All Phases)

**Required:** Every checkbox across all 10 phases verified on a physical Android device. The player feels Netflix-grade:

- [ ] Controls visible on load (not locked by default)
- [ ] Play/pause visible and functional
- [ ] Volume control visible inline (not just in sheet)
- [ ] Back button goes back (not app exit)
- [ ] Rotate: portrait default, toggle works
- [ ] Buffered region shown on seek bar
- [ ] Buffering overlay reuses `VideoPlayerLoadingOverlay`
- [ ] All controls present in all non-locked states
- [ ] Double-tap seek + edge swipes work
- [ ] Seek into buffer = instant play
- [ ] `tsc --noEmit` exit 0
- [ ] `eslint src/` exit 0

---

> **Document Version:** 5.0.0
> **Created:** 2026-08-03
> **Supersedes:** `UI_UX_Elevation_Progress_Tracker_v4.md`
> **Companion:** `UI_UX_Elevation_Specification_v5.md`
> **Status:** ACTIVE — Executing without waiting for further orders