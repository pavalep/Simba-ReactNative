# SIMBA Mobile: UI/UX Elevation v5 — Player Behavior Refinement Specification

> **Document Version:** 5.0.0
> **Supersedes:** `UI_UX_Elevation_Specification_v4.md`
> **Target Platform:** React Native (Android-primary, iOS-compatible)
> **Core Focus:** Netflix-grade video player behavior — fix lock default, buffering visualization, rotation UX, back-button nav, missing controls, and buffering input handling
> **Completion Milestone:** Elevate player from "functional but rough" to "Netflix-quality feel" on device

---

## TABLE OF CONTENTS

1. v5 Diagnosis: What's Wrong With The Player Today
2. Design Philosophy v5: Netflix-Grade Player Behavior
3. The 10 Phases
4. Animation & Motion System v5 Addendum
5. Verification and Quality Assurance Suite

---

## 1. v5 DIAGNOSIS: WHAT'S WRONG WITH THE PLAYER TODAY

Based on the 2026-08-03 audit of the current player implementation across [`useVideoPlayerScreen.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts), [`VideoPlayer.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayer.tsx), and related components:

### 1.1 Controls Are Locked by Default
- **Current:** `controlsLocked` state initializes to `false` at [useVideoPlayerScreen.ts:113](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts#L113), but the lock is being set to `true` somewhere during init or the lock button is appearing as locked. User sees the lock icon showing "locked" state by default. Controls should start **unlocked**.
- **v5 Fix:** Ensure `controlsLocked` starts `false` and stays `false` on first load. The padlock icon should show the **unlocked** glyph by default. Debug why the lock appears active on first render.

### 1.2 No Volume Control in Primary Player UI
- **Current:** Volume is adjustable via swipe gesture (left/right edge) and via the `VideoPlayerVolumePanel` bottom sheet, but there is **no visible slider or icon button** in the primary player controls. Users can't see current volume level or adjust it without opening the volume panel.
- **v5 Fix:** Add a volume icon button + inline slider to the SecondaryToolbar (the auto-hiding bar) so users can visually adjust volume without hunting for the panel.

### 1.3 No Play/Pause Button Visible
- **Current:** The play/pause button is in `PrimaryControls.tsx` at [lines 153-168](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/PrimaryControls.tsx#L153-169), gated behind `h.loadingPhase === 'ready'`. But during loading, controls are hidden, and there's no play button visible in the loading state. After loading, the play/pause shows, but user reports it's "missing now."
- **v5 Fix:** Ensure play/pause is always visible after `loadingPhase === 'ready'`. The `centerPlayBtn` in `VideoPlayerVideoSurface` only shows when `!isPlaying` — verify it doesn't disappear when it shouldn't.

### 1.4 Back Button Closes App Instead of Going Back
- **Current:** Android back button handler at [useVideoPlayerScreen.ts:1351-1359](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts#L1351-L1359) calls `handleGoBack()` which calls `navigation.goBack()`. But user reports back button is "closing app not correct."
- **Root Cause:** The BackHandler returns `true` always (consuming the event), but `handleGoBack` tries to `navigation.canGoBack()` first. If the player was opened as the **initial route** (cold start), `canGoBack()` returns `false`, and it falls through to `navigation.navigate('MainTabs')`. But if the stack is structured differently, this could trigger app exit.
- **v5 Fix:** Implement a proper back-button stack policy — first back press on VideoPlayer should go to the previous screen in the stack; if there's nowhere to go back, show a "Press back again to exit" toast.

### 1.5 Landscape Default, No Portrait Icon Button
- **Current:** `isLandscape` starts `false` at [useVideoPlayerScreen.ts:233](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts#L233). The rotate button is in the top bar ([VideoPlayerTopBar.tsx:265-274](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerTopBar.tsx#L265-L274)). But user reports "by default is coming as landscape, not correct" — suggesting something is setting landscape on init.
- **v5 Fix:** Ensure portrait is always the default. Add a prominent, always-visible rotate toggle button. When in portrait → icon shows "landscape" arrow. When in landscape → icon shows "portrait" arrow. Tapping switches orientation without native device rotation.

### 1.6 Buffering Not Visualized Properly
- **Current:** `isBuffering` is set from `onBuffering` event at [useVideoPlayerScreen.ts:1572-1573](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts#L1572-L1574). The `BufferingBar` component exists at [`BufferingBar.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/BufferingBar/BufferingBar.tsx) and renders at [VideoPlayer.tsx:373](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayer.tsx#L373). But user reports "buffered video shows in light color how much is bufferd" and "if already buffered region if input will it play."
- **Issues:**
  1. The BufferingBar is a thin shimmer bar — doesn't show buffered percentage visually on the seek bar.
  2. No buffered-progress visualization on the SeekBar itself (like YouTube's gray buffer fill).
  3. If the video is already buffered and the user seeks to a buffered region, it should play immediately — but there's no buffering indicator showing that region is pre-loaded.
- **v5 Fix:** Add buffered-progress indication on the SeekBar (gray fill behind the gold progress), and ensure `isBuffering` properly gates whether the play/pause responds during stalls.

### 1.7 All Controls Missing During Normal Interaction
- **Current:** PrimaryControls, TopBar, and SecondaryToolbar are all gated on `h.loadingPhase === 'ready'` AND `!h.controlsLocked`. If controls are locked (which the user says they are by default), the user sees **nothing** — no play/pause, no volume, no seek bar, no top bar.
- **Root Cause:** The lock state issue (#1.1) cascades — if controls are locked, the SecondaryToolbar (which contains the volume control and most settings) is hidden. The PrimaryControls are also hidden.
- **v5 Fix:** Fix the lock default (controls unlocked by default). Even when locked, the top bar should remain visible with an "unlock chip" to restore controls (Netflix behavior — lock hides gestures, not all UI).

---

## 2. DESIGN PHILOSOPHY v5

### 2.1 Core Principles

1. **Netflix-Grade Feel** — Every interaction must feel polished, intentional, and immediate. No missing controls, no locked-by-default surprises.
2. **Progressive Disclosure** — Primary controls (play/pause, seek, fullscreen) always accessible. Secondary controls (volume, subtitles, audio, EQ) in auto-hiding bars. Lock state is a conscious choice, not the default.
3. **Buffered Awareness** — Users see at a glance how much is buffered. Seeking into a buffered region plays instantly.
4. **Orientation is a Toggle, Not a Lock** — Portrait by default. One-tap toggle to landscape. No native device rotation needed.
5. **Back Button is Predictable** — Back = go to previous screen. Only exits app on double-tap with confirmation.

### 2.2 Player UX Flow (Netflix-style)

```
Player Opens
    ↓
Full-screen black loader ("Initializing player…")
    ↓
videoReconfig fires → first frame rendering
    ↓
Loader lifts instantly — Surface + TopBar + PrimaryControls appear together
    ↓
User can tap to show/hide SecondaryToolbar (auto-hides after 4s)
    ↓
Lock button in TopBar = prevent accidental touches (NOT default)
    ↓
Rotate button in TopBar = toggle portrait/landscape (portrait = default)
    ↓
SeekBar shows buffered region (gray fill) + played region (gold fill)
    ↓
Buffering stalls show full-screen ActivityOrb + thin shimmer bar
```

---

## 3. THE 10 PHASES

### PHASE 1 — Fix Controls Locked Default

**Goal:** Controls must start **unlocked** by default. The padlock icon shows unlocked state.

**Root Cause Analysis:**
The state `controlsLocked` is declared as `useState(false)` at [useVideoPlayerScreen.ts:113](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts#L113). However, the user observes the lock icon showing as "locked" by default. This suggests either:
- A state initialization issue where `controlsLocked` gets set to `true` during player init
- The icon rendering logic at [VideoPlayerTopBar.tsx:231-232](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerTopBar.tsx#L231-L232) shows the wrong icon for the state

**Files:**
- [`useVideoPlayerScreen.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts) — debug `controlsLocked` initialization
- [`VideoPlayerTopBar.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerTopBar.tsx) — fix icon rendering

**Checklist:**
- [ ] 1.1 Verify `controlsLocked` initializes to `false` and stays `false` on first render
- [ ] 1.2 Fix padlock icon: unlocked glyph (🔓) when `false`, locked glyph (🔒) when `true`
- [ ] 1.3 Debug: log `controlsLocked` state changes during init to find why it appears locked
- [ ] 1.4 Even when locked, TopBar must remain visible with an "unlock chip" (Netflix behavior)
- [ ] 1.5 All gesture handlers (`handleDoubleTapLeft`, `handleSwipeUp`, etc.) properly check `controlsLocked` and return early when locked — verified working
- [ ] 1.6 Verify: fresh app launch → open video → controls visible immediately after load

### PHASE 2 — Add Volume Control to Primary UI

**Goal:** Visible volume adjustment in the player controls — not hidden in a bottom sheet.

**Current State:**
- Volume swipe gestures work via [handleVolumeSwipe](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts#L772-L783) (left edge swipe)
- `VideoPlayerVolumePanel` exists but is a bottom-sheet panel — [VideoPlayerVolumePanel.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerVolumePanel.tsx)
- No inline volume slider or icon button in the SecondaryToolbar

**Files:**
- [`VideoPlayer.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayer.tsx) — add volume control to SecondaryToolbar area
- [`VideoPlayerSecondaryToolbar.tsx` or equivalent](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/PrimaryControls.tsx) — add volume icon + slider

**Checklist:**
- [ ] 2.1 Add volume icon button (🔊/🔇) to SecondaryToolbar, next to playback speed
- [ ] 2.2 Inline volume slider appears when icon is tapped (or always visible in expanded mode)
- [ ] 2.3 Volume icon reflects mute state (🔊 for 1-100%, 🔇 for muted)
- [ ] 2.4 Slider thumb color = gold accent (`colors.accent.gold`)
- [ ] 2.5 Volume swipe gesture still works (left edge) — no conflict
- [ ] 2.6 Test: volume adjustable without opening the volume panel sheet

### PHASE 3 — Fix Play/Pause Visibility

**Goal:** Play/pause button always visible after video loads. No disappearing act.

**Current State:**
- Play/pause in [`PrimaryControls.tsx:153-168`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/PrimaryControls.tsx#L153-L169)
- Gated on `h.loadingPhase === 'ready'` in [`VideoPlayer.tsx:355`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayer.tsx#L355)
- Center play button in [`VideoPlayerVideoSurface.tsx:86`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerVideoSurface.tsx#L86) gated on `!controlsVisible && !isPlaying && isLoaded`
- User says play button is "missing now" — likely because controls are locked (Phase 1 fix) or the gating logic is wrong

**Files:**
- [`VideoPlayer.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayer.tsx)
- [`PrimaryControls.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/PrimaryControls.tsx)
- [`VideoPlayerVideoSurface.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerVideoSurface.tsx)

**Checklist:**
- [ ] 3.1 PrimaryControls play/pause always renders when `loadingPhase === 'ready'` and surface is visible
- [ ] 3.2 Play/pause responds to tap immediately (< 100ms perceived)
- [ ] 3.3 Center play button only shows when paused + controls hidden + loaded (not playing)
- [ ] 3.4 Play/pause icon reflects actual playing state (not lagging from TransportProvider polling)
- [ ] 3.5 On tap of paused video, play/pause works even if SecondaryToolbar is hidden
- [ ] 3.6 Verify: load video → wait for load → play/pause button visible and functional

### PHASE 4 — Fix Back Button Navigation

**Goal:** Back button goes back. Never silently exits the app.

**Current State:**
- Android back handler at [useVideoPlayerScreen.ts:1351-1359](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts#L1351-L1359):
```ts
const onBackPress = () => {
  handleGoBack();
  return true;
};
```
- `handleGoBack` at [useVideoPlayerScreen.ts:436-477](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts#L436-L477):
  - Calls `MpvPlayer.stop()`
  - Sets `showVideoSurface(false)`
  - Resets landscape
  - Saves playback position
  - Then `navigation.canGoBack()` → `navigation.goBack()` OR `navigation.navigate('MainTabs')`
- **Problem:** If the back handler fires twice (or the stack is empty), the app exits. User has no "undo" or confirmation.

**Files:**
- [`useVideoPlayerScreen.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts)

**Checklist:**
- [ ] 4.1 Back button on VideoPlayer → `navigation.goBack()` if `canGoBack()` is true
- [ ] 4.2 If `canGoBack()` is false (player opened as initial route) → show "Press back again to exit" toast, not immediate exit
- [ ] 4.3 Second back press within 2 seconds → exit app (or go to Home, never just kill)
- [ ] 4.4 `handleGoBack` properly stops mpv, hides surface, saves position, resets landscape
- [ ] 4.5 Back button does NOT fire while controls are locked (or shows unlock prompt instead)
- [ ] 4.6 Test: open video from Library → back button → returns to Library, not app exit

### PHASE 5 — Portrait Default + Landscape Toggle Fix

**Goal:** Always starts in portrait. Tap rotate icon → landscape. Clear visual toggle.

**Current State:**
- `isLandscape` = `useState(false)` at [useVideoPlayerScreen.ts:233](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts#L233)
- `handleToggleRotate` at [useVideoPlayerScreen.ts:1090-1095](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts#L1090-L1095):
```ts
const handleToggleRotate = useCallback(() => {
  setIsLandscape(p => {
    const next = !p;
    StatusBar.setHidden(next, 'fade');
    return next;
  });
```
- Rotate button in [`VideoPlayerTopBar.tsx:265-274`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerTopBar.tsx#L265-L274):
  - Portrait → shows `⛶` (mountain) icon
  - Landscape → shows `⤢` (arrow) icon
- **Problem:** User says "by default is coming as landscape" — the visual rotation transform may be applying incorrectly, or the state is flipped.

**Files:**
- [`useVideoPlayerScreen.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts)
- [`VideoPlayer.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayer.tsx) (rotation transform at L539-548)
- [`VideoPlayerTopBar.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerTopBar.tsx)

**Checklist:**
- [ ] 5.1 `isLandscape` initializes to `false` (portrait) — verified
- [ ] 5.2 Portrait: icon shows landscape-enter icon (⛷️ or ↻), label "Enter landscape"
- [ ] 5.3 Landscape: icon shows portrait-exit icon ( 📱 or ↺), label "Exit to portrait"
- [ ] 5.4 The rotate button is always visible in TopBar (not gated by controlsLocked)
- [ ] 5.5 Rotation transform in [VideoPlayer.tsx:539-548](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayer.tsx#L539-L548) correctly maps width/height swap
- [ ] 5.6 Tapping rotate toggles within 100ms
- [ ] 5.7 Test: open video → portrait by default → tap rotate → landscape → tap again → portrait

### PHASE 6 — Buffered Region Visualization on SeekBar

**Goal:** Show how much of the video is buffered on the seek bar (like YouTube's gray fill). Seeking into buffered region plays instantly.

**Current State:**
- `isBuffering` boolean set from `onBuffering` event at [useVideoPlayerScreen.ts:1572-1573](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts#L1572-L1574):
```ts
const unsubBuffering = MpvPlayer.on('onBuffering', ({percent}) => {
  setIsBuffering(percent > 0 && percent < 100);
});
```
- `BufferingBar` component shows ActivityOrb + thin shimmer bar — [BufferingBar.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/BufferingBar/BufferingBar.tsx)
- SeekBar at [`SeekBar.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/SeekBar/SeekBar.tsx) — no buffered-progress visualization
- **Problem:** User can't see what's buffered. If they seek to an unbuffered region, it may stall without feedback.

**Files:**
- [`useVideoPlayerScreen.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts) — capture buffered percentage
- [`SeekBar.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/SeekBar/SeekBar.tsx) — add buffered progress bar
- [`PrimaryControls.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/PrimaryControls.tsx) — pass buffered data to SeekBar

**Checklist:**
- [ ] 6.1 Capture `bufferedPercent` from `onBuffering` event (not just boolean)
- [ ] 6.2 SeekBar renders a gray/secondary fill behind the gold progress representing buffered range
- [ ] 6.3 When seeking into buffered region, playback starts immediately (no stall)
- [ ] 6.4 BufferingBar (full-screen ActivityOrb) shows on initial buffer + during playback stalls
- [ ] 6.5 Buffered percentage updates in real-time as mpv reports cache fill
- [ ] 6.6 Visual: buffered fill color = `colors.background.overlay` (light gray), distinct from gold progress fill
- [ ] 6.7 Test: stream video → watch buffer fill grow on seek bar → seek ahead → buffer shows, then plays

### PHASE 7 — Integrated Buffering State (Loader Reuse)

**Goal:** The loading overlay component (`VideoPlayerLoadingOverlay`) is reused for buffering during playback — same component, different message. No separate UI for buffering.

**Current State:**
- `VideoPlayerLoadingOverlay` renders for `loadingPhase !== 'ready'` at [VideoPlayer.tsx:809-812](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayer.tsx#L809-L812):
```tsx
<h.VideoPlayerLoadingOverlay
  visible={h.pipUiVisible && h.loadingPhase !== 'ready' && !h.error}
  message={h.loadingMessage}
/>
```
- `BufferingBar` renders separately at [VideoPlayer.tsx:373](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayer.tsx#L373):
```tsx
{h.pipUiVisible && <BufferingBar visible={h.isBuffering} />}
```
- **Problem:** Two different buffering/loading UIs. The overlay is full-screen black (correct for initial load), but BufferingBar is a thin bar + ActivityOrb (too subtle for stalls during playback).

**Files:**
- [`VideoPlayer.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayer.tsx)
- [`VideoPlayerLoadingOverlay.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerLoadingOverlay.tsx)
- [`useVideoPlayerScreen.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts)

**Checklist:**
- [ ] 7.1 When `isBuffering` is true during playback (not initial load), show `VideoPlayerLoadingOverlay` with message "Buffering…" instead of thin BufferingBar
- [ ] 7.2 When `isBuffering` is true during initial load, show `VideoPlayerLoadingOverlay` with `loadingMessage` (existing behavior)
- [ ] 7.3 The loader overlay is inside the player component (confirmed — renders at VideoPlayer.tsx:809)
- [ ] 7.4 When buffering resolves, overlay lifts and controls remain visible (no flicker)
- [ ] 7.5 ActivityOrb shows "Buffering…" label during playback stalls
- [ ] 7.6 Remove or deprecate thin `BufferingBar` component (replaced by overlay reuse)
- [ ] 7.7 Test: play video → force stall → overlay shows "Buffering…" → resumes → overlay lifts

### PHASE 8 — Volume Bar and Play/Pause in All States

**Goal:** Every control the user needs is visible and functional in every non-loading, non-locked state. No missing controls.

**Current State:**
- PrimaryControls shows play/pause + seek bar (bottom bar)
- TopBar shows back, title, lock, rotate, more, bookmark
- SecondaryToolbar (auto-hiding) shows chapters, subtitles, audio, EQ, playlist, speed, screenshot, sleep timer
- Volume is only in the VolumePanel sheet — not inline
- When `controlsLocked === true`, SecondaryToolbar hides entirely — user can't access volume, subtitles, etc.

**Files:**
- [`VideoPlayer.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayer.tsx)
- [`PrimaryControls.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/PrimaryControls.tsx)
- [`SecondaryToolbar.tsx` or its component file](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/PrimaryControls.tsx)

**Checklist:**
- [ ] 8.1 Volume icon button always visible in SecondaryToolbar (even if locked, TopBar stays visible)
- [ ] 8.2 Play/pause always in PrimaryControls (bottom bar)
- [ ] 8.3 SeekBar always in PrimaryControls with buffered region visualization
- [ ] 8.4 When locked: gestures disabled, but TopBar + a small unlock-chip visible
- [ ] 8.5 SecondaryToolbar auto-hides after 4s of inactivity, reappears on tap
- [ ] 8.6 Lock icon in TopBar always tappable (toggles lock state)
- [ ] 8.7 All icons have proper accessibility labels
- [ ] 8.8 Test: load video → all controls visible → lock → top bar + unlock chip visible → unlock → all controls back

### PHASE 9 — Double-Tap to Seek + Edge Swipe Gestures

**Goal:** YouTube/Netflix-style gestures work intuitively — double-tap left/right for ±10s, vertical edge swipes for volume/brightness.

**Current State:**
- [`VideoPlayerGestureLayer`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerGestureLayer.tsx) exists
- `handleDoubleTapLeft` at [useVideoPlayerScreen.ts:698](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts#L698) — seeks -10s
- `handleDoubleTapRight` at [useVideoPlayerScreen.ts:708](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts#L708) — seeks +10s
- `handleVolumeSwipe` at [useVideoPlayerScreen.ts:772](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts#L772) — left edge
- `handleBrightnessSwipe` at [useVideoPlayerScreen.ts:785](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts#L785) — right edge
- **Problem:** These gestures are gated behind `controlsLocked` check — if controls are locked (which they shouldn't be by default per Phase 1), gestures are disabled. Also need visual feedback (the ±10s pill).

**Files:**
- [`VideoPlayerGestureLayer.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerGestureLayer.tsx)
- [`SeekBarFeedbackOverlay` or `SeekFeedbackOverlay`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/SeekFeedbackOverlay.tsx)
- [`VideoPlayerVolumePanel.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerVolumePanel.tsx)
- [`VolumeBrightnessOverlay.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VolumeBrightnessOverlay.tsx)

**Checklist:**
- [ ] 9.1 Double-tap left half → seek -10s + show "−10s" pill overlay
- [ ] 9.2 Double-tap right half → seek +10s + show "+10s" pill overlay
- [ ] 9.3 Left edge swipe → volume control with overlay bar (already exists)
- [ ] 9.4 Right edge swipe → brightness control with overlay bar (already exists)
- [ ] 9.5 Gestures respect `controlsLocked` — disabled when locked (Phase 1 fix ensures lock isn't default)
- [ ] 9.6 Gestures respect `loadingPhase` — disabled during initial load
- [ ] 9.7 Visual feedback pill animates: spring scale 0.85 → 1.0 over 300ms
- [ ] 9.8 Test: play video → double-tap right → +10s pill → seek works → double-tap left → -10s pill → seek works

### PHASE 10 — Input Region Buffering (Seek Into Buffered = Instant Play)

**Goal:** When the user seeks (scrub) to a region that is already buffered, playback starts immediately without re-buffering. If seeking to an unbuffered region, show buffering overlay.

**Current State:**
- `handleSeek` at [useVideoPlayerScreen.ts:622](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts#L622) calls `MpvPlayer.seekTo(time)`
- mpv internally handles cache/buffering — seeking to a cached position should be instant
- `isBuffering` fires from `onBuffering` event
- **Problem:** User asks "if already buffered region if input will it play" — they want confirmation that seeking into buffer is instant, and if not, the buffering overlay should show.

**Files:**
- [`useVideoPlayerScreen.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts)
- [`SeekBar.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/SeekBar/SeekBar.tsx)

**Checklist:**
- [ ] 10.1 Seeking via SeekBar scrub to buffered region → mpv plays from cache (no re-buffer)
- [ ] 10.2 Seeking to unbuffered region → `isBuffering` fires → overlay shows "Buffering…"
- [ ] 10.3 After seek, `loadingPhase` stays `'ready'` (don't re-trigger initial load gate)
- [ ] 10.4 Seek preview thumbnail bubble follows finger (optional polish)
- [ ] 10.5 Test: load remote stream → let buffer 30% → scrub to 20% → instant play → scrub to 80% → buffering overlay → plays when ready

---

## 4. ANIMATION AND MOTION SYSTEM v5 ADDENDUM

### 4.1 New Animation Tokens

```ts
// src/utils/animations.ts — V5 ADDITIONS
export const PLAYER_TIMING = {
  controlShow: 200,    // 26.8 / §5.3: controls fade+slide in
  controlHide: 150,    // 26.8 / §5.3: controls fade+slide out
  bufferReveal: 150,   // V5: buffering overlay fade in/out
  lockTap: 120,        // V5: lock icon tap feedback
};
```

### 4.2 Player Transition Animations

| Transition | Animation | Duration |
|---|---|---|
| Initial load complete (videoReconfig → ready) | Instant overlay lift + controls fade in | 0ms (instant, then 200ms for controls) |
| Buffering overlay show | Fade in | 150ms |
| Buffering overlay hide | Fade out | 150ms |
| Lock toggle tap | Spring scale | 120ms |
| Rotate toggle tap | Fade + scale | 100ms |
| Seek scrub | Thumb enlarges (16→24px) | spring |
| Buffered fill reveal | Grow from left | 300ms |

---

## 5. VERIFICATION AND QUALITY ASSURANCE SUITE

### 5.1 v5 Quality Metrics

| Metric | v4 Baseline | v5 Target |
|---|---|---|
| Controls visible on load | ❌ (locked by default) | ✅ All controls visible |
| Play/pause visible | ❌ (missing) | ✅ Always visible after load |
| Volume control visible | ❌ (hidden in sheet) | ✅ Inline in SecondaryToolbar |
| Back button exits app | ❌ (closes app) | ✅ Goes back, confirm to exit |
| Rotation default | ❌ (sometimes landscape) | ✅ Always portrait, toggle available |
| Buffered region shown | ❌ (no visualization) | ✅ Gray fill on seek bar |
| Buffering feedback | ❌ (thin bar only) | ✅ Full overlay + seek bar fill |
| Lock default state | ❌ (locked) | ✅ Unlocked |

### 5.2 v5 Gate Check (All 10 Phases)

**Required:** Every checkbox across all 10 phases verified on a physical Android device. tsc --noEmit + eslint src/ exit 0. The player feels Netflix-grade — no missing controls, no locked-by-default, buffering is visualized, back button is predictable, rotation is a toggle.

**On-device verification checklist:**
- [ ] Fresh video load: black loader → video frame → all controls appear together
- [ ] Lock button: starts unlocked, tap → locked (gestures disabled, top bar + unlock chip remain)
- [ ] Play/pause: visible immediately after load, responds instantly
- [ ] Volume: icon button + slider in SecondaryToolbar, swipe gesture still works
- [ ] Back button: goes back to Library/History, not app exit
- [ ] Rotate: portrait default, tap icon → landscape, tap again → portrait
- [ ] Buffered region: gray fill grows on seek bar as content buffers
- [ ] Buffering overlay: full-screen "Buffering…" when seeking to unbuffered region
- [ ] Double-tap seek: ±10s with visual pill feedback
- [ ] Seek into buffered: instant play, no stall

---

> **Document Version:** 5.0.0
> **Created:** 2026-08-03
> **Supersedes:** `UI_UX_Elevation_Specification_v4.md`
> **Companion:** `UI_UX_Elevation_Progress_Tracker_v5.md`
> **Status:** ACTIVE — Ready for implementation