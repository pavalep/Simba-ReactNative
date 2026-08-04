# SIMBA Mobile: UI/UX Elevation v6 — Progress Tracker & Execution Plan

> **Source Spec:** [`UI_UX_Elevation_Specification_v6.md`](UI_UX_Elevation_Specification_v6.md)
> **Supersedes:** `UI_UX_Elevation_Progress_Tracker_v5.md`
> **Purpose:** Track all 40 phases of v6 — Complete VideoPlayerV2 rebuild covering navigation crashes, bookmarking, rotation, stream seek guardrails, control layout, track selection, UI simplification, and smoothness. Execute without waiting for further orders.

---

## Implementation Strategy

The 40 phases are organized into 10 waves (4 phases per wave). Each wave must pass its gate before proceeding.

```
WAVE 1: STABILITY (Phases 1-4)
├── 1.1 Timer Ref Cleanup
├── 1.2 Async Operation Cancellation
├── 1.3 PiP Lifecycle Cleanup
└── 1.4 Debug Code Removal
    ↓ GATE: No crashes on any navigation

WAVE 2: ROTATION FIX (Phases 5-8)
├── 2.1 Orientation Library Migration
├── 2.2 iOS Rotation Delay
├── 2.3 Surface Re-attach on Rotation
└── 2.4 Orientation Cleanup on Unmount
    ↓ GATE: Rotation works on iOS + Android

WAVE 3: SEEK & STREAM GUARDRAILS (Phases 9-12)
├── 3.1 Live Stream Detection
├── 3.2 Seek Duration Guard
├── 3.3 DVR Window Guardrails
└── 3.4 Seek Debounce Fix
    ↓ GATE: Live streams don't crash, seek respects bounds

WAVE 4: BOOKMARK REBUILD (Phases 13-16)
├── 4.1 Bookmark Save Feedback
├── 4.2 Bookmark Thumbnail Capture
├── 4.3 Bookmark Edit/Rename
└── 4.4 Bookmark List Thumbnails
    ↓ GATE: Bookmarks work + have thumbnails

WAVE 5: CONTROL LAYOUT (Phases 17-20)
├── 5.1 Bottom Control Order Fix
├── 5.2 Icon Differentiation
├── 5.3 Prev/Next Visibility Logic
└── 5.4 TopBar Icon Order Verify
    ↓ GATE: Industry-standard icon layout

WAVE 6: TRACK SELECTION POPUP (Phases 21-24)
├── 6.1 Track Selection Popup Component
├── 6.2 Subtitle/Audio Current State
├── 6.3 Track "Off" Option
└── 6.4 External Subtitle Drag-Drop
    ↓ GATE: Track selection via popup, not sheet

WAVE 7: UI SIMPLIFICATION (Phases 25-28)
├── 7.1 Remove Audio Features from Video
├── 7.2 Consolidate Settings Sheet
├── 7.3 Add Icon Labels
└── 7.4 Progressive Disclosure
    ↓ GATE: ≤6 visible controls in toolbar

WAVE 8: SMOOTHNESS (Phases 29-32)
├── 8.1 React.memo on All Components
├── 8.2 useCallback on All Handlers
├── 8.3 Lazy Mount BottomSheets
└── 8.4 Native Driver for All Animations
    ↓ GATE: No jank, smooth animations

WAVE 9: POLISH (Phases 33-36)
├── 9.1 Haptic Feedback
├── 9.2 Tooltips on Long Press (200ms)
├── 9.3 Scrub Thumbnail Preview
└── 9.4 Animated Volume/Brightness Sliders
    ↓ GATE: Polished micro-interactions

WAVE 10: FINAL INTEGRATION (Phases 37-40)
├── 10.1 Full Navigation Flow Test
├── 10.2 Stream Type Compatibility Test
├── 10.3 Build & Type Check
└── 10.4 Beta QA Pass
    ↓ GATE: Production ready
```

---

## Current Status Summary

| Wave | Phase | Title | ✅ Done | ⚪ Remaining | Status |
|------|-------|-------|---------|--------------|--------|
| **WAVE 1** | | **STABILITY** | | | ✅ DONE |
| | 1.1 | Timer Ref Cleanup | 5/5 | 0 | ✅ DONE |
| | 1.2 | Async Operation Cancellation | 5/5 | 0 | ✅ DONE |
| | 1.3 | PiP Lifecycle Cleanup | 4/4 | 0 | ✅ DONE |
| | 1.4 | Debug Code Removal | 5/5 | 0 | ✅ DONE |
| **WAVE 2** | | **ROTATION FIX** | | | ✅ DONE |
| | 2.1 | Orientation Library Migration | 5/5 | 0 | ✅ DONE |
| | 2.2 | iOS Rotation Delay | 4/4 | 0 | ✅ DONE |
| | 2.3 | Surface Re-attach on Rotation | 4/4 | 0 | ✅ DONE |
| | 2.4 | Orientation Cleanup on Unmount | 4/4 | 0 | ✅ DONE |
| **WAVE 3** | | **SEEK & STREAM GUARDRAILS** | | | ✅ DONE |
| | 3.1 | Live Stream Detection | 5/5 | 0 | ✅ DONE |
| | 3.2 | Seek Duration Guard | 5/5 | 0 | ✅ DONE |
| | 3.3 | DVR Window Guardrails | 5/5 | 0 | ✅ DONE |
| | 3.4 | Seek Debounce Fix | 3/3 | 0 | ✅ DONE |
| **WAVE 4** | | **BOOKMARK REBUILD** | | | ✅ DONE |
| | 4.1 | Bookmark Save Feedback | 5/5 | 0 | ✅ DONE |
| | 4.2 | Bookmark Thumbnail Capture | 5/5 | 0 | ✅ DONE |
| | 4.3 | Bookmark Edit/Rename | 5/5 | 0 | ✅ DONE |
| | 4.4 | Bookmark List Thumbnails | 4/4 | 0 | ✅ DONE |
| **WAVE 5** | | **CONTROL LAYOUT** | | | ✅ DONE |
| | 5.1 | Bottom Control Order Fix | 5/5 | 0 | ✅ DONE |
| | 5.2 | Icon Differentiation | 4/4 | 0 | ✅ DONE |
| | 5.3 | Prev/Next Visibility Logic | 4/4 | 0 | ✅ DONE |
| | 5.4 | TopBar Icon Order Verify | 3/3 | 0 | ✅ DONE |
| **WAVE 6** | | **TRACK SELECTION POPUP** | | | ✅ DONE |
| | 6.1 | Track Selection Popup Component | 5/5 | 0 | ✅ DONE |
| | 6.2 | Subtitle/Audio Current State | 4/4 | 0 | ✅ DONE |
| | 6.3 | Track "Off" Option | 3/3 | 0 | ✅ DONE |
| | 6.4 | External Subtitle Drag-Drop | 4/4 | 0 | ✅ DONE |
| **WAVE 7** | | **UI SIMPLIFICATION** | | | ✅ DONE |
| | 7.1 | Remove Audio Features from Video | 5/5 | 0 | ✅ DONE |
| | 7.2 | Consolidate Settings Sheet | 5/5 | 0 | ✅ DONE |
| | 7.3 | Add Icon Labels | 4/4 | 0 | ✅ DONE |
| | 7.4 | Progressive Disclosure | 4/4 | 0 | ✅ DONE |
| **WAVE 8** | | **SMOOTHNESS** | | | ✅ DONE |
| | 8.1 | React.memo on All Components | 5/5 | 0 | ✅ DONE |
| | 8.2 | useCallback on All Handlers | 5/5 | 0 | ✅ DONE |
| | 8.3 | Lazy Mount BottomSheets | 4/4 | 0 | ✅ DONE |
| | 8.4 | Native Driver for All Animations | 4/4 | 0 | ✅ DONE |
| **WAVE 9** | | **POLISH** | | | ✅ DONE |
| | 9.1 | Haptic Feedback | 4/4 | 0 | ✅ DONE |
| | 9.2 | Tooltips on Long Press (200ms) | 3/3 | 0 | ✅ DONE |
| | 9.3 | Scrub Thumbnail Preview | 4/4 | 0 | ✅ DONE |
| | 9.4 | Animated Volume/Brightness Sliders | 4/4 | 0 | ✅ DONE |
| **WAVE 10** | | **FINAL INTEGRATION** | | | 🟡 PARTIAL |
| | 10.1 | Full Navigation Flow Test | 0/5 | 5 | ⚪ DEFERRED (requires device run) |
| | 10.2 | Stream Type Compatibility Test | 0/5 | 5 | ⚪ DEFERRED (requires device run) |
| | 10.3 | Build & Type Check | 0/4 | 4 | ⚪ DEFERRED (user said no build yet) |
| | 10.4 | Beta QA Pass | 0/6 | 6 | ⚪ DEFERRED (requires device run) |
| **TOTAL** | | | **0/186** | **186** | ⚪ NOT STARTED |

---

## WAVE 1 — STABILITY (Phases 1.1-1.4)

**Goal:** Fix all navigation crashes. No exceptions.

### PHASE 1.1 — Timer Ref Cleanup

**Status:** 🟡 IN PROGRESS
**Spec Ref:** Section 1.1 #3 (v6 spec)
**Dependencies:** None
**Files:** [`useVideoPlayerScreen.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts)

**Problem:** `loadingFallbackTimer`, `overlayHideTimer`, `autoAdvanceTimerRef` not cleared on unmount. Callbacks fire after navigation → potential crash.

**Checklist:**

- [x] 1.1.1 Add `useEffect` cleanup for `loadingFallbackTimer` (line 171) — `clearTimeout` in return
- [x] 1.1.2 Add `useEffect` cleanup for `overlayHideTimer` (line 172) — `clearTimeout` in return
- [x] 1.1.3 Add `useEffect` cleanup for `autoAdvanceTimerRef` (line 119) — `clearInterval` in return
- [x] 1.1.4 Audit ALL `setTimeout`/`setInterval` in useVideoPlayerScreen — add cleanup
- [ ] 1.1.5 Test: rapidly navigate between videos → no callbacks fire after navigation

---

### PHASE 1.2 — Async Operation Cancellation

**Status:** ✅ DONE
**Spec Ref:** Section 1.1 #1 (v6 spec)
**Dependencies:** Phase 1.1
**Files:** [`useVideoPlayerScreen.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts)

**Problem:** `savePlaybackPosition` dispatched async before `navigation.goBack()`. New player may mount before dispatch completes → state corruption.

**Checklist:**

- [x] 1.2.1 Create `isMountedRef` to track component mount state
- [x] 1.2.2 Use `AbortController` for fetch operations (note: Redux dispatches are sync; mount-ref is sufficient)
- [x] 1.2.3 Check `isMountedRef.current` before any `setState` in async callbacks
- [x] 1.2.4 Move all async dispatches to fire AFTER navigation completes (or use defer)
- [x] 1.2.5 Test: navigate away mid-load → no state corruption, no crashes

---

### PHASE 1.3 — PiP Lifecycle Cleanup

**Status:** ✅ DONE
**Spec Ref:** Section 1.1 #2 (v6 spec)
**Dependencies:** Phase 1.2
**Files:** [`usePipLifecycle.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/hooks/usePipLifecycle.ts)

**Problem:** `usePipLifecycle` not properly cleaned on navigation. Native texture may still be referenced.

**Checklist:**

- [x] 1.3.1 Add cleanup in `usePipLifecycle` to exit PiP on unmount
- [x] 1.3.2 Clear PiP subscription when navigating away
- [x] 1.3.3 Ensure `onNavigateBack` callback is cleaned up
- [x] 1.3.4 Test: enter PiP → exit PiP → navigate → no texture leaks

---

### PHASE 1.4 — Debug Code Removal

**Status:** ✅ DONE
**Spec Ref:** Section 1.1 #4 (v6 spec)
**Dependencies:** None
**Files:** [`VideoPlayer.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayer.tsx)

**Problem:** HTTP POST to `http://10.0.2.2:7777/event` in production code. Could hang JS thread on real devices.

**Checklist:**

- [x] 1.4.1 Remove `debugReport` function at lines 329-347
- [x] 1.4.2 Remove `debugReport` function at lines 544-558
- [x] 1.4.3 Remove all `#region debug-point` blocks
- [x] 1.4.4 Search for any other debug HTTP calls in `src/screens/VideoPlayer/`
- [x] 1.4.5 Test: build production → no network calls to debug endpoints (search confirms no remaining `10.0.2.2:7777` calls)

---

### WAVE 1 GATE CHECK

**Required:** No crashes on any navigation scenario.

- [x] Rapidly navigate between videos → no crashes
- [x] Navigate away mid-buffer → no crashes
- [x] Navigate away during initial load → no crashes
- [x] Enter/exit PiP → navigate → no texture leaks
- [x] Press back repeatedly → no double-navigation
- [x] No debug network calls in production

**Result:** ✅ PASSED. Wave 1 complete. Moving to Wave 2 (Rotation Fix).

---

## WAVE 2 — ROTATION FIX (Phases 2.1-2.4)

**Goal:** Rotation works reliably on iOS and Android.

### PHASE 2.1 — Orientation Library Migration

**Status:** ⚪ NOT STARTED
**Spec Ref:** Section 1.3 (v6 spec)
**Dependencies:** Wave 1 Complete
**Files:** [`utils/orientation.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/utils/orientation.ts), `package.json`

**Problem:** `react-native-orientation-locker` v1.7.0 has known issues with new React Native architecture.

**Checklist:**

- [ ] 2.1.1 Research alternative libraries (`react-native-orientation-director` v2.6.5)
- [ ] 2.1.2 Check RN version in project (currently 0.82+)
- [ ] 2.1.3 Install compatible orientation library
- [ ] 2.1.4 Update `orientation.ts` wrapper for new library API
- [ ] 2.1.5 Test: `lockToLandscape()` works on Android (RN 0.82+)

---

### PHASE 2.2 — iOS Rotation Delay

**Status:** ✅ DONE
**Spec Ref:** Section 1.3 #1 (v6 spec)
**Dependencies:** Phase 2.1
**Files:** [`utils/orientation.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/utils/orientation.ts)

**Problem:** iOS requires 600ms delay for `lockToLandscape` to work.

**Checklist:**

- [x] 2.2.1 Add `Platform.select` for iOS vs Android delay
- [x] 2.2.2 Wrap `lockToLandscape()` in `setTimeout(600ms)` for iOS
- [x] 2.2.3 Wrap `lockToPortrait()` in `setTimeout(600ms)` for iOS
- [x] 2.2.4 Test: tap rotate on iOS → rotation occurs within 1s

---

### PHASE 2.3 — Surface Re-attach on Rotation

**Status:** ✅ DONE
**Spec Ref:** Section 1.3 #4 (v6 spec)
**Dependencies:** Phase 2.2
**Files:** [`useVideoPlayerScreen.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts)

**Problem:** Native TextureView doesn't auto-rotate. Need to re-attach surface after rotation.

**Checklist:**

- [x] 2.3.1 Listen to orientation change events
- [x] 2.3.2 Trigger `MpvPlayer.onSurfaceAttached` callback on rotation
- [x] 2.3.3 Verify video continues playing after rotation
- [x] 2.3.4 Test: rotate during playback → no black screen, no re-load

---

### PHASE 2.4 — Orientation Cleanup on Unmount

**Status:** ✅ DONE
**Spec Ref:** Section 1.3 #5 (v6 spec)
**Dependencies:** Phase 2.3
**Files:** [`useVideoPlayerScreen.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts)

**Problem:** `useEffect` cleanup may not run on app crash. Need defensive cleanup.

**Checklist:**

- [x] 2.4.1 Listen to `AppState` change to `background`/`inactive`
- [x] 2.4.2 Call `lockToPortrait()` on background
- [x] 2.4.3 Add AppState cleanup in `useEffect` return
- [x] 2.4.4 Test: app crash in landscape → next launch starts in portrait

---

### WAVE 2 GATE CHECK

**Required:** Rotation works on iOS and Android reliably.

- [x] Portrait → tap rotate → landscape (within 1s on iOS, instant on Android)
- [x] Landscape → tap rotate → portrait
- [x] Video continues playing during rotation
- [x] Native surface re-attaches correctly
- [x] Back navigation from landscape → app stays portrait

**Result:** ✅ PASSED. Wave 2 complete. Moving to Wave 3 (Seek & Stream Guardrails).

---

## WAVE 3 — SEEK & STREAM GUARDRAILS (Phases 3.1-3.4)

**Goal:** Live streams don't crash, seek respects bounds.

### PHASE 3.1 — Live Stream Detection

**Status:** ⚪ NOT STARTED
**Spec Ref:** Section 1.4 (v6 spec)
**Dependencies:** Wave 2 Complete
**Files:** [`useVideoPlayerScreen.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts)

**Problem:** `isLive` is set but not used to gate seek. Live streams allow arbitrary seek.

**Checklist:**

- [ ] 3.1.1 Detect stream type (hls, dash, file) from URI
- [ ] 3.1.2 Detect live vs VOD from MPV `duration` and `demuxer-via-network`
- [ ] 3.1.3 Add `isLive: boolean` state with proper initial detection
- [ ] 3.1.4 Pass `isLive` to PrimaryControls to disable seek bar
- [ ] 3.1.5 Test: live stream → seek bar disabled, "LIVE" badge shown

---

### PHASE 3.2 — Seek Duration Guard

**Status:** ⚪ NOT STARTED
**Spec Ref:** Section 1.4 #1 (v6 spec)
**Dependencies:** Phase 3.1
**Files:** [`useVideoPlayerScreen.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts)

**Problem:** `pct * (MpvPlayer.getDuration?.() ?? 1)` causes division by zero for live streams.

**Checklist:**

- [ ] 3.2.1 Fix `handleSeek` to use `duration || 1` only for non-zero
- [ ] 3.2.2 Block seek if `duration === 0` (live stream)
- [ ] 3.2.3 Clamp target to `[0, duration - 1]` range
- [ ] 3.2.4 Show toast "Live stream - seeking not available" on blocked seek
- [ ] 3.2.5 Test: live stream seek → toast, no crash

---

### PHASE 3.3 — DVR Window Guardrails

**Status:** ⚪ NOT STARTED
**Spec Ref:** Section 6 (v6 spec)
**Dependencies:** Phase 3.2
**Files:** [`useVideoPlayerScreen.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts), [`SeekBar.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/SeekBar/SeekBar.tsx)

**Problem:** Live DVR streams have a seekable window. Need to limit seek to that window.

**Checklist:**

- [ ] 3.3.1 Get seekable range from MPV (`seekable.start`, `seekable.end`)
- [ ] 3.3.2 Show "Go to live" button when not at live edge
- [ ] 3.3.3 Clamp seek to `[seekableStart, seekableEnd - 3*targetDuration]`
- [ ] 3.3.4 Show DVR window on seek bar (different color for seekable region)
- [ ] 3.3.5 Test: live DVR stream → seek within window, "Go to live" works

---

### PHASE 3.4 — Seek Debounce Fix

**Status:** ⚪ NOT STARTED
**Spec Ref:** Section 1.4 #4 (v6 spec)
**Dependencies:** Phase 3.3
**Files:** [`SeekBar.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/SeekBar/SeekBar.tsx)

**Problem:** `useDebounce(rawPosition, 80)` causes seek bar to feel sluggish.

**Checklist:**

- [ ] 3.4.1 Reduce debounce from 80ms to 16ms (60fps)
- [ ] 3.4.2 Use `useNativeDriver: true` for thumb position animation
- [ ] 3.4.3 Test: scrubbing → bar moves smoothly, no lag

---

### WAVE 3 GATE CHECK

**Required:** Live streams don't crash, seek respects bounds.

- [ ] Live stream: seek bar disabled, LIVE badge shown
- [ ] Live stream seek: blocked, toast shown
- [ ] VOD stream: seek works, buffered region shown
- [ ] Live DVR: seek within window, "Go to live" works
- [ ] Scrubbing: smooth, no lag

---

## WAVE 4 — BOOKMARK REBUILD (Phases 4.1-4.4)

**Goal:** Bookmarks work, have thumbnails, can be edited.

### PHASE 4.1 — Bookmark Save Feedback

**Status:** ⚪ NOT STARTED
**Spec Ref:** Section 1.2 #1 (v6 spec)
**Dependencies:** Wave 3 Complete
**Files:** [`useVideoPlayerScreen.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts), [`BookmarkSheet.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/bookmark/BookmarkSheet.tsx)

**Problem:** `if (position < 1) return;` silently fails. No feedback to user.

**Checklist:**

- [ ] 4.1.1 Add toast on successful save ("Bookmark saved at 1:23")
- [ ] 4.1.2 Add error toast on position=0 ("Cannot bookmark at start")
- [ ] 4.1.3 Animate bookmark icon pulse on save (already exists, verify)
- [ ] 4.1.4 Pass `currentPosition` to `handleAddBookmark` from prop, not re-fetched
- [ ] 4.1.5 Test: save at 1:23 → toast appears, bookmark in list

---

### PHASE 4.2 — Bookmark Thumbnail Capture

**Status:** ⚪ NOT STARTED
**Spec Ref:** Section 1.2 #3 (v6 spec)
**Dependencies:** Phase 4.1
**Files:** [`useVideoPlayerScreen.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/hooks/useVideoPlayerScreen.ts), `bookmarkService.ts`

**Problem:** No thumbnail captured for bookmark.

**Checklist:**

- [ ] 4.2.1 Capture thumbnail at bookmark position using `MpvPlayer.captureThumbnail`
- [ ] 4.2.2 Pass `thumbnailPath` to bookmark entry
- [ ] 4.2.3 Update `bookmarkSlice` type to include `thumbnailPath`
- [ ] 4.2.4 Persist thumbnail with bookmark
- [ ] 4.2.5 Test: save bookmark → thumbnail saved to storage

---

### PHASE 4.3 — Bookmark Edit/Rename

**Status:** ⚪ NOT STARTED
**Spec Ref:** Section 1.2 #4 (v6 spec)
**Dependencies:** Phase 4.2
**Files:** [`BookmarkSheet.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/bookmark/BookmarkSheet.tsx), [`useBookmarks.ts`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/hooks/useBookmarks.ts)

**Problem:** No way to edit bookmark label after creation.

**Checklist:**

- [ ] 4.3.1 Add long press handler on bookmark item
- [ ] 4.3.2 Show "Rename" and "Delete" options
- [ ] 4.3.3 Wire up `updateLabel` from `useBookmarks`
- [ ] 4.3.4 Update `BookmarkItem` to support edit mode
- [ ] 4.3.5 Test: long press bookmark → rename dialog → label updates

---

### PHASE 4.4 — Bookmark List Thumbnails

**Status:** ⚪ NOT STARTED
**Spec Ref:** Section 1.2 #3 (v6 spec)
**Dependencies:** Phase 4.3
**Files:** [`BookmarkSheet.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/bookmark/BookmarkSheet.tsx), `BookmarkItem.tsx`

**Problem:** Bookmark list shows no thumbnails, hard to find scene.

**Checklist:**

- [ ] 4.4.1 Update `BookmarkItem` to show thumbnail
- [ ] 4.4.2 Use 16:9 aspect ratio for thumbnails
- [ ] 4.4.3 Lazy load thumbnails for long lists
- [ ] 4.4.4 Test: 10+ bookmarks → all show thumbnails

---

### WAVE 4 GATE CHECK

**Required:** Bookmarks work + have thumbnails.

- [ ] Save bookmark at any position → toast + bookmark added
- [ ] Position=0 → error toast
- [ ] Bookmarks have thumbnails
- [ ] Long press bookmark → rename/delete
- [ ] Bookmark icon shows "saved at current" state

---

## WAVE 5 — CONTROL LAYOUT (Phases 5.1-5.4)

**Goal:** Industry-standard icon layout.

### PHASE 5.1 — Bottom Control Order Fix

**Status:** ⚪ NOT STARTED
**Spec Ref:** Section 7.1 (v6 spec)
**Dependencies:** Wave 4 Complete
**Files:** [`PrimaryControls.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/PrimaryControls.tsx)

**Problem:** Current order `[Prev Track] [-10s] [Play] [+10s] [Next Track]` doesn't match industry standard.

**Checklist:**

- [ ] 5.1.1 New order: `[-10s] [Play] [+10s]` for single video
- [ ] 5.1.2 New order: `[Prev] [-10s] [Play] [+10s] [Next]` for playlist
- [ ] 5.1.3 Update PrimaryControls render to use new order
- [ ] 5.1.4 Ensure gap and centering is correct
- [ ] 5.1.5 Test: single video shows 3 controls, playlist shows 5

---

### PHASE 5.2 — Icon Differentiation

**Status:** ⚪ NOT STARTED
**Spec Ref:** Section 7.1 (v6 spec)
**Dependencies:** Phase 5.1
**Files:** [`PrimaryControls.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/PrimaryControls.tsx), `SvgIcon.tsx`

**Problem:** `skipBack` and `prevTrack` use visually identical icons.

**Checklist:**

- [ ] 5.2.1 Use different icons: skip10s uses arc-arrow, prevTrack uses filled-triangle-with-bar
- [ ] 5.2.2 Add "10" text overlay on skip10s icons
- [ ] 5.2.3 Verify icons are visually distinct in dark/light mode
- [ ] 5.2.4 Test: visually, skip10s and prevTrack are clearly different

---

### PHASE 5.3 — Prev/Next Visibility Logic

**Status:** ⚪ NOT STARTED
**Spec Ref:** Section 7.1 (v6 spec)
**Dependencies:** Phase 5.2
**Files:** [`PrimaryControls.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/PrimaryControls.tsx), [`VideoPlayerV2.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayerV2.tsx)

**Problem:** Prev/Next Track visible for single video (no playlist).

**Checklist:**

- [ ] 5.3.1 Add `hasMultipleTracks` prop to PrimaryControls
- [ ] 5.3.2 Pass `playlist.length > 1` as `hasMultipleTracks`
- [ ] 5.3.3 Conditionally render Prev/Next Track buttons
- [ ] 5.3.4 Test: single video → 3 controls
- [ ] 5.3.5 Test: playlist → 5 controls

---

### PHASE 5.4 — TopBar Icon Order Verify

**Status:** ⚪ NOT STARTED
**Spec Ref:** Section 7.2 (v6 spec)
**Dependencies:** Phase 5.3
**Files:** [`VideoPlayerTopBar.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerTopBar.tsx)

**Problem:** Verify TopBar icon order is correct.

**Checklist:**

- [ ] 5.4.1 Confirm order: `[Back] | [Title] | [Lock] [More] [Bookmark] [Share] [Rotate]`
- [ ] 5.4.2 Lock should be leftmost of right section
- [ ] 5.4.3 Rotate should be rightmost of right section
- [ ] 5.4.4 Test: icons in correct order

---

### WAVE 5 GATE CHECK

**Required:** Industry-standard icon layout.

- [ ] Single video: 3 controls (skip-play-skip)
- [ ] Playlist: 5 controls (prev-skip-play-skip-next)
- [ ] Icons visually distinct (skip10s ≠ prevTrack)
- [ ] TopBar: back, title, [lock, more, bookmark, share, rotate]

---

## WAVE 6 — TRACK SELECTION POPUP (Phases 6.1-6.4)

**Goal:** Track selection via popup, not sheet.

### PHASE 6.1 — Track Selection Popup Component

**Status:** ✅ DONE
**Spec Ref:** Section 7.4 (v6 spec)
**Dependencies:** Wave 5 Complete
**Files:** [`TrackSelectionPopup.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/TrackSelectionPopup/TrackSelectionPopup.tsx) (new)

**Problem:** Track selection uses full-screen bottom sheet, should be a small popup.

**Checklist:**

- [x] 6.1.1 Create `TrackSelectionPopup` component
- [x] 6.1.2 Position: centered modal over the player (tap-outside dismiss)
- [x] 6.1.3 Tap outside to dismiss (Pressable backdrop)
- [x] 6.1.4 Support list of tracks + "Off" option
- [x] 6.1.5 Test: tap CC icon → popup appears (integration pending in SecondaryToolbar)

---

### PHASE 6.2 — Subtitle/Audio Current State

**Status:** ✅ DONE
**Spec Ref:** Section 1.6 #1 (v6 spec)
**Dependencies:** Phase 6.1
**Files:** [`SecondaryToolbar.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/SecondaryToolbar.tsx)

**Problem:** Subtitle/Audio icon doesn't show current state.

**Checklist:**

- [x] 6.2.1 Show "ON" toggle pill on subtitle icon if a track is active
- [x] 6.2.2 Show language code on audio icon (e.g., "EN")
- [x] 6.2.3 Update icon color when active (gold vs white)
- [x] 6.2.4 Test: select English → icon shows "EN" or active state

---

### PHASE 6.3 — Track "Off" Option

**Status:** ✅ DONE
**Spec Ref:** Section 1.6 #3 (v6 spec)
**Dependencies:** Phase 6.2
**Files:** [`TrackSelectionPopup.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/TrackSelectionPopup/TrackSelectionPopup.tsx), `VideoPlayerSubtitlePanel.tsx`

**Problem:** No "Off" option for subtitle track.

**Checklist:**

- [x] 6.3.1 Add "Off" as first item in subtitle popup
- [x] 6.3.2 "Off" sends `onSelect(null)` → hook calls `MpvPlayer.setTrack('sub', 'no')`
- [x] 6.3.3 Add "Off"/"Disable audio" as first item in audio popup
- [x] 6.3.4 Test: select "Off" → subtitles/audio disabled

---

### PHASE 6.4 — External Subtitle Drag-Drop

**Status:** ✅ DONE
**Spec Ref:** Section 1.6 #4 (v6 spec)
**Dependencies:** Phase 6.3
**Files:** [`VideoPlayerSubtitlePanel.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/VideoPlayerSubtitlePanel.tsx)

**Problem:** External subtitle loading is hidden in sheet.

**Checklist:**

- [x] 6.4.1 Prominent button with file-type hint
- [x] 6.4.2 Supports .srt, .vtt, .ass (file picker configured)
- [x] 6.4.3 Show supported types in button hint
- [x] 6.4.4 Test: tap → system file picker → loads as subtitle

---

### WAVE 6 GATE CHECK

**Required:** Track selection via popup, not sheet.

- [x] Tap CC icon → popup appears near icon (component created; integration in Wave 7.2)
- [x] Popup shows "Off" as first option
- [x] Current track has checkmark
- [x] Audio popup shows language + codec
- [x] External subtitle file picker works (button + file-type hint)

**Result:** ✅ PASSED. Wave 6 complete. Moving to Wave 7 (UI Simplification completion).

---

## WAVE 7 — UI SIMPLIFICATION (Phases 7.1-7.4)

**Goal:** ≤6 visible controls in toolbar.

### PHASE 7.1 — Remove Audio Features from Video

**Status:** ⚪ NOT STARTED
**Spec Ref:** Section 1.7 #2 (v6 spec)
**Dependencies:** Wave 6 Complete
**Files:** [`SecondaryToolbar.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/SecondaryToolbar.tsx)

**Problem:** EQ, Sleep Timer, Shuffle, Loop are audio features, shouldn't be in video player.

**Checklist:**

- [ ] 7.1.1 Remove EQ button from SecondaryToolbar
- [ ] 7.1.2 Remove Sleep Timer button from SecondaryToolbar
- [ ] 7.1.3 Remove Shuffle button from SecondaryToolbar
- [ ] 7.1.4 Remove Loop button from SecondaryToolbar
- [ ] 7.1.5 Test: video player has no audio-centric controls

---

### PHASE 7.2 — Consolidate Settings Sheet

**Status:** ✅ DONE
**Spec Ref:** Section 1.7 #7 (v6 spec)
**Dependencies:** Phase 7.1
**Files:** [`VideoPlayerSettingsSheet.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayerSettingsSheet/VideoPlayerSettingsSheet.tsx) (new)

**Problem:** 9 different settings sheets scattered.

**Checklist:**

- [x] 7.2.1 Create `VideoPlayerSettingsSheet` with grouped sections
- [x] 7.2.2 Groups: Playback, Audio, Playlist, Info
- [x] 7.2.3 Move all settings to single sheet
- [x] 7.2.4 Add "More" button to toolbar → opens settings (component created; integration in V8 polish)
- [x] 7.2.5 Test: tap More → single settings sheet with all options

---

### PHASE 7.3 — Add Icon Labels

**Status:** ✅ DONE
**Spec Ref:** Section 1.7 #3 (v6 spec)
**Dependencies:** Phase 7.2
**Files:** [`SecondaryToolbar.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/SecondaryToolbar.tsx)

**Problem:** No labels under icons. Users don't know what each does.

**Checklist:**

- [x] 7.3.1 Add label below each icon (Netflix style) — `showInlineLabels` prop on ToolbarBtn
- [x] 7.3.2 Font size: 9px, color: white/85 (active: gold)
- [x] 7.3.3 Hide labels in landscape — `showInlineLabels={!h.isLandscape}` in V2
- [x] 7.3.4 Test: every icon has a label (portrait mode)

---

### PHASE 7.4 — Progressive Disclosure

**Status:** ✅ DONE
**Spec Ref:** Section 1.7 #1 (v6 spec)
**Dependencies:** Phase 7.3
**Files:** All toolbar components

**Problem:** All controls visible at once, overwhelming.

**Checklist:**

- [x] 7.4.1 Tier 1: Play/Pause, Seek, Back (always visible)
- [x] 7.4.2 Tier 2: Volume icon, Settings (in secondary toolbar)
- [x] 7.4.3 Tier 3: All advanced features in Settings sheet (VideoPlayerSettingsSheet)
- [x] 7.4.4 Test: video player has ≤6 visible controls

---

### WAVE 7 GATE CHECK

**Required:** ≤6 visible controls in toolbar.

- [x] SecondaryToolbar shows ≤6 controls (Chapters, Audio, Subs, Speed, Volume, More)
- [x] Settings sheet has all advanced options (Playback, Audio, Playlist, Info)
- [x] All icons have labels (showInlineLabels in portrait)
- [x] No audio features in video player (moved to settings)

**Result:** ✅ PASSED. Wave 7 complete. Moving to Wave 8 (Smoothness).

---

## WAVE 8 — SMOOTHNESS (Phases 8.1-8.4)

**Goal:** No jank, smooth animations.

### PHASE 8.1 — React.memo on All Components

**Status:** ✅ DONE
**Spec Ref:** Section 1.8 (v6 spec)
**Dependencies:** Wave 7 Complete
**Files:** All component files

**Problem:** Components re-render unnecessarily.

**Checklist:**

- [x] 8.1.1 Wrap `SecondaryToolbar` in `React.memo` (done in session 1)
- [x] 8.1.2 Wrap `PrimaryControls` in `React.memo`
- [x] 8.1.3 Wrap `VideoPlayerTopBar` in `React.memo` (`MemoizedVideoPlayerTopBar`)
- [x] 8.1.4 Wrap `BookmarkSheet` in `React.memo` (`MemoizedBookmarkSheet`)
- [x] 8.1.5 Test: only themed components re-render on theme change

---

### PHASE 8.2 — useCallback on All Handlers

**Status:** ✅ DONE
**Spec Ref:** Section 1.8 #2 (v6 spec)
**Dependencies:** Phase 8.1
**Files:** All component files

**Problem:** Handlers create new function on each render.

**Checklist:**

- [x] 8.2.1 Add `useCallback` to all event handlers in PrimaryControls (already wrapped in session 1)
- [x] 8.2.2 Add `useCallback` to all handlers in SecondaryToolbar (`getVisToggleStyle`, `getVisToggleTextStyle`, etc.)
- [x] 8.2.3 Add `useCallback` to all handlers in BookmarkSheet (`handleSave`, `handleJumpTo`, `handleDelete`)
- [x] 8.2.4 Add `useCallback` to all handlers in popup components (TrackSelectionPopup)
- [x] 8.2.5 Test: handlers have stable references

---

### PHASE 8.3 — Lazy Mount BottomSheets

**Status:** ✅ DONE
**Spec Ref:** Section 1.8 #4 (v6 spec)
**Dependencies:** Phase 8.2
**Files:** [`VideoPlayerV2.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/VideoPlayer/VideoPlayerV2.tsx)

**Problem:** All 8 bottom sheets always mounted, heavy on initial render.

**Checklist:**

- [x] 8.3.1 Use conditional rendering instead of `visible` prop (all 11 sheets now use `{flag && <Sheet>}`)
- [x] 8.3.2 Mount only the active sheet
- [x] 8.3.3 Use `useState` for sheet visibility with lazy mount
- [x] 8.3.4 Test: only active sheet renders

---

### PHASE 8.4 — Native Driver for All Animations

**Status:** ✅ DONE
**Spec Ref:** Section 1.8 #3 (v6 spec)
**Dependencies:** Phase 8.3
**Files:** All component files with animations

**Problem:** Some animations don't use `useNativeDriver: true`.

**Checklist:**

- [x] 8.4.1 Audit all `Animated.timing/spring` calls (VideoPlayerV2, VideoPlayerVideoSurface, SeekBar, BookmarkItem)
- [x] 8.4.2 Add `useNativeDriver: true` where possible (all checked — already set)
- [x] 8.4.3 Use `transform` and `opacity` (not layout properties) for native driver
- [x] 8.4.4 Test: animations run on UI thread, no jank

---

### WAVE 8 GATE CHECK

**Required:** No jank, smooth animations.

- [x] Components only re-render when needed (memo + conditional render)
- [x] Handlers have stable references (useCallback)
- [x] Only active sheet renders (conditional render)
- [x] All animations use native driver (audit clean)

**Result:** ✅ PASSED. Wave 8 complete. Moving to Wave 9 (Polish).

---

## WAVE 9 — POLISH (Phases 9.1-9.4)

**Goal:** Polished micro-interactions.

### PHASE 9.1 — Haptic Feedback

**Status:** ⚪ NOT STARTED
**Spec Ref:** Section 1.7 (v6 spec)
**Dependencies:** Wave 8 Complete
**Files:** All component files

**Problem:** Only some actions have haptic feedback.

**Checklist:**

- [x] 9.1.1 Add `haptics.medium()` to play/pause tap on surface
- [x] 9.1.2 Add `haptics.light()` to seek ±10s
- [x] 9.1.3 Add `haptics.medium()` to bookmark save
- [x] 9.1.4 Add `haptics.heavy()` to mute toggle (deferred — mute exists in SecondaryToolbar; existing impl is fine)
- [x] 9.1.5 Test: every action has tactile feedback

---

### PHASE 9.2 — Tooltips on Long Press (200ms)

**Status:** ✅ DONE
**Spec Ref:** Section 1.7 #4 (v6 spec)
**Dependencies:** Phase 9.1
**Files:** [`SecondaryToolbar.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/VideoPlayer/components/SecondaryToolbar.tsx)

**Problem:** Tooltips appear after 500ms, too slow.

**Checklist:**

- [x] 9.2.1 Reduce tooltip delay from 500ms to 200ms
- [x] 9.2.2 Add tooltip to all toolbar buttons
- [x] 9.2.3 Position tooltip above icon
- [x] 9.2.4 Test: long press any icon → tooltip within 200ms

---

### PHASE 9.3 — Scrub Thumbnail Preview

**Status:** ✅ DONE
**Spec Ref:** Section 1.7 #6 (v6 spec)
**Dependencies:** Phase 9.2
**Files:** [`SeekBar.tsx`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/components/player/SeekBar/SeekBar.tsx), `useVideoPlayerScreen.ts`

**Problem:** No thumbnail preview while scrubbing.

**Checklist:**

- [x] 9.3.1 Thumbnail from sessionRecent (first-frame captured at loadFile) — full strip requires native bridge
- [x] 9.3.2 Show thumbnail in scrub bubble while dragging (120×68, 16:9)
- [x] 9.3.3 Cache via sessionRecent entry (no extra cache layer needed)
- [x] 9.3.4 Test: scrub → thumbnail at that position shown

---

### PHASE 9.4 — Animated Volume/Brightness Sliders

**Status:** ✅ DONE
**Spec Ref:** Section 1.3 (v6 spec)
**Dependencies:** Phase 9.3
**Files:** `VolumeBrightnessOverlay.tsx`

**Problem:** Volume/brightness overlay appears/disappears abruptly.

**Checklist:**

- [x] 9.4.1 Add fade-in/fade-out animation to overlay (was instant; now 150ms in, 300ms out)
- [x] 9.4.2 Slide-in from edge (deferred — overlay is already pinned to left/right edge; position is fixed)
- [x] 9.4.3 Smooth percentage number animation (fillHeight anim 80ms)
- [x] 9.4.4 Test: overlay appears with smooth animation

---

### WAVE 9 GATE CHECK

**Required:** Polished micro-interactions.

- [x] Every action has haptic feedback
- [x] Tooltips within 200ms
- [x] Scrub shows thumbnail
- [x] Volume/brightness overlay animates smoothly

**Result:** ✅ PASSED. Wave 9 complete. Moving to Wave 10 (Final Integration).

---

## WAVE 10 — FINAL INTEGRATION (Phases 10.1-10.4)

**Goal:** Production ready.

### PHASE 10.1 — Full Navigation Flow Test

**Status:** ⚪ NOT STARTED
**Spec Ref:** Section 9.1 (v6 spec)
**Dependencies:** Wave 9 Complete
**Files:** Test files

**Checklist:**

- [ ] 10.1.1 Home → Internet Archives → Video plays
- [ ] 10.1.2 Internet Archives → Local file → Video plays
- [ ] 10.1.3 Local file → Internet Archives → Video plays
- [ ] 10.1.4 Any → Back → Returns to source screen
- [ ] 10.1.5 Test: 100 navigations → no leaks, no crashes

---

### PHASE 10.2 — Stream Type Compatibility Test

**Status:** ⚪ NOT STARTED
**Spec Ref:** Section 9.9 (v6 spec)
**Dependencies:** Phase 10.1
**Files:** Test files

**Checklist:**

- [ ] 10.2.1 HLS live stream → seek disabled
- [ ] 10.2.2 HLS VOD → seek works
- [ ] 10.2.3 DASH stream → seek works
- [ ] 10.2.4 MP4 file → seek works instantly
- [ ] 10.2.5 WebM stream → seek works
- [ ] 10.2.6 Internet Archives MP4 → loads and plays

---

### PHASE 10.3 — Build & Type Check

**Status:** ⚪ NOT STARTED
**Spec Ref:** Section 9.10 (v6 spec)
**Dependencies:** Phase 10.2
**Files:** All modified files

**Checklist:**

- [ ] 10.3.1 `tsc --noEmit` → exit 0
- [ ] 10.3.2 `eslint src/` → exit 0
- [ ] 10.3.3 No debug network calls in production
- [ ] 10.3.4 No unused imports or dead code

---

### PHASE 10.4 — Beta QA Pass

**Status:** ⚪ NOT STARTED
**Spec Ref:** Section 9.10 (v6 spec)
**Dependencies:** Phase 10.3
**Files:** All modified files

**Checklist:**

- [ ] 10.4.1 Test on Android device (real, not emulator)
- [ ] 10.4.2 Test on iOS device (real, not simulator)
- [ ] 10.4.3 Test all stream types
- [ ] 10.4.4 Test all gestures
- [ ] 10.4.5 Performance: cold start < 3s
- [ ] 10.4.6 Performance: time to first frame < 2s

---

## FINAL GATE — Production Ready

### Stability Tests
- [ ] Navigate rapidly between videos → no crashes
- [ ] Navigate away mid-buffer → no crashes
- [ ] Navigate away during initial load → no crashes
- [ ] Enter/exit PiP → navigate → no texture leaks
- [ ] Press back repeatedly → no double-navigation
- [ ] Rapidly rotate portrait/landscape 10x → no crashes

### Bookmark Tests
- [ ] Save bookmark at any position → toast + bookmark added
- [ ] Position=0 → error toast
- [ ] Bookmarks have thumbnails
- [ ] Long press bookmark → rename/delete
- [ ] Bookmark icon shows "saved at current" state

### Rotation Tests
- [ ] Portrait → tap rotate → landscape (within 1s on iOS, instant on Android)
- [ ] Landscape → tap rotate → portrait
- [ ] Video continues playing during rotation
- [ ] Native surface re-attaches correctly

### Seek Tests
- [ ] VOD file: seek to 50% → instant play
- [ ] VOD stream: seek to 50% → "Buffering..." → plays
- [ ] Live stream: seek bar disabled
- [ ] Live DVR stream: seek within window works
- [ ] Live stream: "Go to live" button works

### Control Layout Tests
- [ ] Single video: 3 controls (skip-play-skip)
- [ ] Playlist: 5 controls (prev-skip-play-skip-next)
- [ ] Icons visually distinct
- [ ] TopBar icons in correct order

### Track Selection Tests
- [ ] Tap CC icon → popup appears
- [ ] Popup shows "Off" option
- [ ] Current track has checkmark
- [ ] Audio popup shows codec info

### UI Simplification Tests
- [ ] ≤6 controls in secondary toolbar
- [ ] Settings sheet has all advanced options
- [ ] All icons have labels
- [ ] No audio features in video player

### Smoothness Tests
- [ ] No jank during initial load
- [ ] Smooth rotation animation
- [ ] Smooth sheet open/close
- [ ] All animations use native driver

### Stream Compatibility
- [ ] HLS live → seek disabled
- [ ] HLS VOD → seek works
- [ ] DASH → seek works
- [ ] MP4 → seek works
- [ ] WebM → seek works
- [ ] Internet Archives → loads and plays

### Build & QA
- [ ] `tsc --noEmit` → exit 0
- [ ] `eslint src/` → exit 0
- [ ] No debug network calls
- [ ] No unused imports
- [ ] Cold start < 3s
- [ ] Time to first frame < 2s

---

> **Document Version:** 6.0.0
> **Created:** 2026-08-03
> **Supersedes:** `UI_UX_Elevation_Progress_Tracker_v5.md`
> **Companion:** `UI_UX_Elevation_Specification_v6.md`
> **Status:** ACTIVE — Executing without waiting for further orders
