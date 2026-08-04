# SIMBA Mobile: UI/UX Elevation v6 — VideoPlayerV2 Complete Rebuild

> **Document Version:** 6.0.0
> **Supersedes:** `UI_UX_Elevation_Specification_v5.md`
> **Target Platform:** React Native (Android-primary, iOS-compatible)
> **Core Focus:** Complete VideoPlayerV2 rebuild — fix crashes, bookmarking, rotation, seek, stream guardrails, icon placement, subtitle/audio selection, polish
> **Completion Milestone:** Netflix/YouTube-grade video player that a non-tech-savvy user can use without cursing

---

## TABLE OF CONTENTS

1. Deep Analysis: All Issues Found (40+)
2. Industry Standards Reference
3. MPV Player Standards
4. Design Philosophy v6
5. The 40 Phases (10 Waves × 4 Phases)
6. Stream Seeking Guardrails Spec
7. Icon Placement Spec
8. Bottom Sheet / Popup Decision Tree
9. Verification and Quality Assurance Suite

---

## 1. DEEP ANALYSIS: ALL ISSUES FOUND

### 1.1 NAVIGATION CRASH (Home → Internet Archives)

**Root Cause Analysis:**

1. **Race condition in handleGoBack** (`useVideoPlayerScreen.ts:435-476`):
   - Async `savePlaybackPosition` dispatch fires before `navigation.goBack()`
   - If new player mounts before dispatch completes, MpvPlayer state corrupts
   - No cleanup guards for native player instance

2. **PiP lifecycle not cleaned** (`useVideoPlayerScreen.ts:479-490`):
   - `usePipLifecycle` not properly cleaned on navigation
   - Native texture may still be referenced → leak/crash
   - `onNavigateBack` callback chain could cause double-navigation

3. **Timer refs not cleared on unmount**:
   - `loadingFallbackTimer` (line 171) — `setTimeout` not always cleared
   - `overlayHideTimer` (line 172) — `setTimeout` not always cleared
   - `autoAdvanceTimerRef` (line 119) — `setInterval` not always cleared
   - Timer callbacks fire after navigation → potential crash

4. **Debug code in production** (`VideoPlayer.tsx:329-347, 544-558`):
   - HTTP POST to `http://10.0.2.2:7777/event` (Android emulator debug endpoint)
   - Could hang JS thread on real devices
   - Debug `#region` blocks still present

5. **TransportContext stale references** (`VideoPlayerV2.tsx:109`):
   - If player hasn't initialized when navigating away, `position=0, duration=0`
   - Division-by-zero in seek calculations possible

### 1.2 BOOKMARKING NOT WORKING

**Root Cause Analysis:**

1. **Silent failure on position=0** (`useVideoPlayerScreen.ts:663-665`):
```ts
const position = MpvPlayer.getPosition?.() ?? 0;  // returns 0 if MPV not ready
if (position < 1) return;  // silently fails - no feedback to user
```
- User taps "Save" → nothing happens
- No toast, no error, no indication of failure

2. **Stale position in BookmarkSheet** (`VideoPlayerV2.tsx:412`):
```ts
currentPosition={MpvPlayer.getPosition?.() ?? 0}
```
- Position evaluated only on render, may be stale
- If user pauses and opens bookmark sheet, position is correct
- But if user seeks then opens sheet, position shows seek target not actual

3. **No thumbnail in bookmark list** (`BookmarkSheet.tsx:160-170`):
- Just shows time/label, no visual cue
- Hard to find a specific scene in long videos

4. **No edit label after creation**:
- User creates bookmark, can't rename it later
- No way to organize bookmarks

5. **Bookmark icon doesn't show "saved" state clearly**:
- `bookmarkActive` prop exists but is passed from `bookmarkCountForFile > 0`
- Counts all bookmarks, doesn't show if current position is bookmarked

### 1.3 ROTATE SCREEN NOT WORKING

**Root Cause Analysis:**

1. **Known issue with `react-native-orientation-locker`**:
   - iOS requires 600ms delay for `lockToLandscape` to work
   - Android has issues with new React Native architecture
   - Documented in [GitHub issues](https://github.com/wonday/react-native-orientation-locker/issues/210)

2. **No setTimeout in handleToggleRotate** (`useVideoPlayerScreen.ts:1089-1100`):
```ts
const handleToggleRotate = useCallback(() => {
  setIsLandscape(p => {
    const next = !p;
    if (next) {
      lockToLandscape();  // <-- no setTimeout, may fail on iOS
    } else {
      lockToPortrait();
    }
    return next;
  });
}, []);
```

3. **`isLandscape` is just state, not tied to actual rotation**:
   - The `VideoPlayerV2` has a rotation transform at lines 539-548
   - But the V2 architecture may not have that transform
   - Locking orientation changes device rotation, but UI doesn't re-render

4. **Video surface doesn't handle rotation**:
   - Native TextureView doesn't auto-rotate
   - Need to re-attach surface after rotation

5. **Restore on unmount uses try/catch but may not execute**:
   - `useEffect` cleanup at line 1103-1110 runs on unmount
   - But if app crashes, cleanup doesn't run

### 1.4 SEEK NOT WORKING

**Root Cause Analysis:**

1. **Duration = 0 for live streams causes division by zero** (`useVideoPlayerScreen.ts:621-626`):
```ts
const handleSeek = useCallback((pct: number) => {
  isSeeking.current = true;
  const target = pct * (MpvPlayer.getDuration?.() ?? 1);  // <-- ?? 1 causes 0-1 sec range
  MpvPlayer.seekTo(target);
  ...
});
```
- For live streams, `getDuration()` returns 0
- `0 ?? 1 = 0` (nullish coalescing only triggers on null/undefined, NOT on 0)
- `pct * 0 = 0` always seeks to start
- **Live stream seeking is broken!**

2. **No stream vs file detection**:
   - Same `handleSeek` used for both files and streams
   - For streams: should not allow arbitrary seek
   - Should show "Live" indicator and disable seek bar

3. **No seek guardrails (industry standard)**:
   - HLS/DASH streams have a "seekable range" (DVR window)
   - Should clamp seek to `[seekable.start, seekable.end - 3*targetDuration]`
   - MPV exposes this via `demuxer-cache-state` or `time-pos`/`duration`

4. **SeekBar `useDebounce(rawPosition, 80)` causes lag**:
   - 80ms debounce on position update
   - During active seek, bar feels sluggish

5. **`trackWidthRef` measurement race**:
   - Measured via both `onLayout` and `ref.measure`
   - On first render, may be 0
   - User taps before measurement → seek goes to wrong position

6. **No `isScrubbing` cancellation**:
   - If user starts scrubbing then video ends, scrub state stays true
   - Bar shows wrong position

7. **For live streams, the duration shows "Live" but seek bar is still active**:
   - User can drag seek bar, but it does nothing
   - Confusing UX

### 1.5 CONTROL PLACEMENT WRONG

**User Complaint:** "play pause, seek icon previous next icon are to be placed facing opposite side now its not"

**Current order** (`PrimaryControls.tsx:231-292`):
```
[Prev Track] [-10s] [▶/⏸] [+10s] [Next Track]
```

**Industry Standard:**

| App | Layout |
|-----|--------|
| YouTube | [-10s] [▶/⏸] [+10s] |
| Netflix | [-10s] [▶/⏸] [+10s] |
| Disney+ | [-10s] [▶/⏸] [+10s] |
| Plex | [⏮] [-10s] [▶/⏸] [+10s] [⏭] |

**Issue Analysis:**

1. **Icons use the same `skipBack`/`skipForward` for both track-skip and 10s-skip**:
   - Visually identical
   - User can't tell which is which without label
   - Industry uses: ⏪ (rewind) for 10s, ⏮ (prev track) for previous file
   - Or different stroke widths

2. **For a single video (e.g., from Internet Archives), Prev/Next Track shouldn't show**:
   - User just wants ±10s and play/pause
   - Showing 5 controls when 3 would do is overwhelming

3. **Visual flow is wrong for a non-tech user**:
   - The order should be: backward actions on left, forward on right
   - Play/pause in center
   - All buttons equidistant from play

### 1.6 SUBTITLE/AUDIO TRACK SELECTION ISSUES

**Current Implementation** (`useVideoPlayerScreen.ts:817-825`):
- Tap subtitle icon → opens `SubtitlePanel` bottom sheet
- List of tracks with selection
- Tapping a track closes sheet

**Issues:**

1. **No visual indication of current selection on toolbar**:
   - Subtitle icon should show "ON" state if a track is active
   - Audio icon should show track language
   - Currently only shows in tooltip

2. **Bottom sheet is overkill for track selection**:
   - YouTube uses a popup/dropdown
   - Industry: small popup near icon, not full screen sheet

3. **No "Off" option in subtitle track**:
   - User can only select another track, not turn off
   - The `handleToggleSubtitleVisibility` exists but is buried

4. **External subtitle loading is hidden**:
   - "Load external subtitle" is a button in sheet
   - Should be more prominent (drag-and-drop, file picker)

5. **Track list doesn't show codec info**:
   - Just title/language
   - Should show: language, codec (AAC, AC3), channels (stereo, 5.1)

### 1.7 UI/UX FOR NON-TECH SAVVY USERS

**User Complaint:** "a non tech savvy person will curse this ui at current stage"

**Issues:**

1. **13+ icons in SecondaryToolbar with no labels**:
   - Users don't know what EQ, Suffle, Loop mean
   - Should have labels under icons (Netflix style)
   - Or progressive disclosure (hide advanced)

2. **Audio features in video player**:
   - EQ, Sleep Timer, Shuffle, Loop are audio concepts
   - Should be moved to audio player
   - Or behind a "More" menu in video player

3. **Bookmark vs Share vs More icons look similar**:
   - Three vertical dots vs bookmark icon vs share icon
   - No clear differentiation

4. **No "what is this" feedback on long press**:
   - Long press on icon shows tooltip after 500ms
   - Too slow for quick exploration

5. **Auto-hide behavior is confusing**:
   - Controls disappear after 4s
   - User looks for them, taps screen
   - If tap toggles play/pause, video pauses unexpectedly

6. **No "minimap" or "thumbnail preview" while seeking**:
   - User drags seek bar but doesn't know what scene is at that time
   - Should show thumbnail at scrub position

7. **Settings spread across multiple sheets**:
   - Chapters, Audio, Subtitles, EQ, Playlist, Queue, Volume, Speed, Info
   - 9 different sheets!
   - Should be consolidated

8. **Inconsistent icon styles**:
   - Some filled, some outlined
   - Mixed stroke widths
   - No design system

### 1.8 SMOOTHNESS & PERFORMANCE

**Issues:**

1. **No `React.memo` on SecondaryToolbar**:
   - Re-renders on every parent update
   - All icons re-render

2. **No `useCallback` on many handlers**:
   - `handleToggleChapters` etc. all create new function on each render

3. **Animation values not shared**:
   - `Animated.Value` created with `useRef` per instance
   - Some animations use `useNativeDriver: true`, others not

4. **Bottom sheets rendered even when invisible**:
   - All 8 bottom sheets in VideoPlayerV2 are always mounted
   - Just hidden via `visible` prop
   - Heavy on initial render

5. **Theme provider called in every component**:
   - `useTheme()` called 10+ times
   - Each component re-renders on theme change

### 1.9 SELECTION UX (BottomSheet vs Popup)

**Current:** All selections use `BottomSheet` (slides up from bottom, full height)

**Industry Patterns:**

| Selection Type | Best Pattern | Examples |
|----------------|--------------|----------|
| Track (audio/subtitle) | Popup/Dropdown near icon | YouTube, Plex |
| Chapter | BottomSheet with list | Netflix, Prime |
| Speed | Segmented control or slider in sheet | All |
| Volume | Slider (always visible) | YouTube |
| Quality | Popup with preview | Netflix, YouTube |
| EQ | BottomSheet (full controls needed) | All audio apps |
| Playlist/Queue | BottomSheet with drag-reorder | Plex, Spotify |
| Settings | BottomSheet with grouped options | All |

**Issue:** SIMBA uses BottomSheet for everything, which is heavy for simple track selection.

### 1.10 STREAM-SPECIFIC ISSUES

**Internet Archives videos are typically progressive MP4/HLS streams.**

Issues:
1. **No "Live" detection** — `isLive: isReady && playerDuration <= 0` at line 1706
   - But this is only set, not used to gate seek
2. **No seek guardrails** — Can seek past buffered region
3. **No bitrate/quality switching** — Stream at one quality only
4. **No connection quality indicator** — User doesn't know if buffering is network
5. **No offline support** — Can't download for later
6. **No error recovery for stream** — On error, just shows error screen
7. **No "Stream not seekable" message** — User drags bar, nothing happens

---

## 2. INDUSTRY STANDARDS REFERENCE

### 2.1 Bottom Control Layout (YouTube/Netflix/Disney+ Standard)

```
[Skip 10s] [Play/Pause] [Skip 10s]
```

**When playlist exists:**
```
[Prev Track] [Skip 10s] [Play/Pause] [Skip 10s] [Next Track]
```

**Icon differentiation:**
- Skip back 10s: ⏪ or -10 (small arc arrow)
- Prev track: ⏮ (filled triangle with bar) or |◀
- Skip forward 10s: ⏩ or +10
- Next track: ⏭ (filled triangle with bar) or ▶|

### 2.2 Track Selection UX (Best Practice)

**YouTube pattern:**
- Tap CC icon → small popup appears below icon
- Popup shows: language list + "Off" option
- Tap outside to dismiss
- No full-screen sheet

**Plex pattern:**
- Tap CC icon → bottom sheet with track list
- Tapping track immediately applies
- "Off" as first option

**Recommendation for SIMBA:**
- Subtitle/Audio: small popup near icon
- Chapter: bottom sheet (long list)
- Speed: small popup with segmented control
- Volume: slider always visible
- EQ/Settings: bottom sheet

### 2.3 Stream Seeking Guardrails (DASH/HLS)

From W3C Media Extensions spec:
- **Live stream seek**: should be disabled or limited to "DVR window"
- **VOD stream seek**: can seek anywhere, but show "buffering" if unbuffered
- **MP4 file seek**: can seek anywhere instantly
- **Live edge**: when within 5s of live, show "LIVE" badge
- **"Skip to live" button**: appears when not at live edge

### 2.4 Bookmark UX (VLC/Plex Pattern)

- **Save**: tap bookmark icon → instant save with default name
- **Named**: long press → opens "name + delete" dialog
- **List**: bottom sheet with thumbnails (10 thumbnails in a grid)
- **Jump**: tap thumbnail → seeks
- **Edit**: swipe left on bookmark → delete option

### 2.5 Rotation Handling (Netflix/YouTube)

- **iOS**: needs 600ms delay before lockToLandscape
- **Android**: lockToLandscape works but `screenOrientation="portrait"` in manifest blocks programmatic change
- **Modern approach**: use `expo-screen-orientation` or `react-native-orientation-director` (v2.6.5+)

---

## 3. MPV PLAYER STANDARDS

From MPV documentation:

### 3.1 Key Properties

| Property | Purpose | Used for |
|----------|---------|----------|
| `time-pos` | Current playback position | Position tracking |
| `duration` | Total duration | Seek bar |
| `pause` | Pause state | Play/pause |
| `volume` | Volume 0-130 | Volume control |
| `mute` | Mute state | Mute toggle |
| `speed` | Playback speed | Speed control |
| `sid` | Subtitle track ID | Subtitle selection |
| `aid` | Audio track ID | Audio selection |
| `sub-visibility` | Show/hide subtitles | CC toggle |

### 3.2 Live Stream Properties

- `demuxer-via-network` — true for network streams
- `demuxer-cache-state` — buffer state info
- `hr-seek` — whether seek is supported
- `seekable` — seekable range (if supported)

### 3.3 Issue: `MpvPlayer.getDuration()` returns 0 for live

For live streams:
- `duration` = 0 or undefined
- `time-pos` keeps incrementing
- Need special handling for live streams

---

## 4. DESIGN PHILOSOPHY v6

### 4.1 Core Principles

1. **Stability First** — No crashes on any navigation. Clean teardown.
2. **Progressive Disclosure** — Essential controls visible, advanced in menus.
3. **Industry Standard Gestures** — YouTube/Netflix patterns only.
4. **Visual Feedback** — Every action has immediate visual response.
5. **Stream-Aware** — Live vs VOD behavior differs.
6. **Non-Tech-Savvy Friendly** — Labels, hints, and clear icons.

### 4.2 Player UX Flow (v6 Target)

```
Player Opens
    ↓
"Loading video…" with progress
    ↓
First frame renders → loader lifts
    ↓
Auto-plays (or shows center play button if autoplay disabled)
    ↓
Controls auto-hide after 3s
    ↓
Single tap center → Play/Pause (with haptic)
    ↓
Vertical swipe right → Volume with % overlay
    ↓
Vertical swipe left → Brightness with % overlay
    ↓
Double tap left/right → Seek ±10s with feedback
    ↓
Tap any non-control area → Show controls
    ↓
Tap bookmark icon → Save bookmark at current position
    ↓
Tap share icon → Share dialog
    ↓
Tap rotate icon → Portrait/Landscape toggle (with delay for iOS)
    ↓
Tap back → Save position + go back (or exit if initial route)
```

---

## 5. THE 40 PHASES (10 WAVES × 4 PHASES)

### WAVE 1: STABILITY (Phases 1-4)

**Goal:** Fix all navigation crashes, clean up all timer refs, remove debug code.

| Phase | Title | Focus |
|-------|-------|-------|
| 1 | Timer Ref Cleanup | clearTimeout/clearInterval on unmount |
| 2 | Async Operation Cancellation | Cancel savePlaybackPosition, use refs |
| 3 | PiP Lifecycle Cleanup | Exit PiP, clear subscriptions |
| 4 | Debug Code Removal | Remove HTTP debug calls |

### WAVE 2: ROTATION FIX (Phases 5-8)

**Goal:** Fix rotation, add iOS delay, fix surface re-attach.

| Phase | Title | Focus |
|-------|-------|-------|
| 5 | Orientation Library Migration | Switch to orientation-director (RN 0.82+ compatible) |
| 6 | iOS Rotation Delay | Add 600ms setTimeout for lockToLandscape |
| 7 | Surface Re-attach on Rotation | Re-attach native surface after rotation |
| 8 | Orientation Cleanup on Unmount | Ensure lockToPortrait on unmount works |

### WAVE 3: SEEK & STREAM GUARDRAILS (Phases 9-12)

**Goal:** Fix seek for live streams, add DVR window guardrails, prevent divide-by-zero.

| Phase | Title | Focus |
|-------|-------|-------|
| 9 | Live Stream Detection | isLive flag, stream type detection |
| 10 | Seek Duration Guard | Handle duration=0 for live, clamp to buffered |
| 11 | DVR Window Guardrails | Limit seek to seekable range, show "Go to live" |
| 12 | Seek Debounce Fix | Reduce from 80ms to 16ms for responsiveness |

### WAVE 4: BOOKMARK REBUILD (Phases 13-16)

**Goal:** Fix bookmarking, add thumbnails, allow edit, show "saved at this position" state.

| Phase | Title | Focus |
|-------|-------|-------|
| 13 | Bookmark Save Feedback | Toast on success, error on position=0 |
| 14 | Bookmark Thumbnail Capture | Capture frame at bookmark position |
| 15 | Bookmark Edit/Rename | Allow label edit after creation |
| 16 | Bookmark List Thumbnails | Show frame grid in bookmark list |

### WAVE 5: CONTROL LAYOUT (Phases 17-20)

**Goal:** Fix icon order, differentiate skip-back from prev-track, simplify layout.

| Phase | Title | Focus |
|-------|-------|-------|
| 17 | Bottom Control Order Fix | Skip10s-PlayPause-Skip10s for single, add Prev/Next for playlist |
| 18 | Icon Differentiation | Different icons/strokes for -10s vs prev-track |
| 19 | Prev/Next Visibility Logic | Hide when no playlist |
| 20 | TopBar Icon Order | Lock-More-Bookmark-Share-Rotate (current) verified |

### WAVE 6: SUBTITLE/AUDIO SELECTION (Phases 21-24)

**Goal:** Use popup instead of bottom sheet, show "Off" option, show current state.

| Phase | Title | Focus |
|-------|-------|-------|
| 21 | Track Selection Popup | Small popup near icon, not full sheet |
| 22 | Subtitle/Audio Current State | Show "ON" / language on icon |
| 23 | Track "Off" Option | First item in list is "Off" |
| 24 | External Subtitle Drag-Drop | File picker with preview |

### WAVE 7: UI SIMPLIFICATION (Phases 25-28)

**Goal:** Reduce visible controls, move advanced to menus, add labels.

| Phase | Title | Focus |
|-------|-------|-------|
| 25 | Move EQ/Sleep/Shuffle/Loop | Out of video player entirely |
| 26 | Consolidate Settings | Single settings sheet with groups |
| 27 | Add Icon Labels | Netflix-style labels under icons |
| 28 | Progressive Disclosure | Tap to reveal advanced controls |

### WAVE 8: SMOOTHNESS (Phases 29-32)

**Goal:** Performance, memo, animations, render optimization.

| Phase | Title | Focus |
|-------|-------|-------|
| 29 | React.memo on All Components | Avoid re-renders |
| 30 | useCallback on All Handlers | Stable references |
| 31 | Lazy Mount BottomSheets | Mount only when visible |
| 32 | Native Driver for All Animations | Consistent performance |

### WAVE 9: POLISH (Phases 33-36)

**Goal:** Tooltips, haptic feedback, micro-interactions.

| Phase | Title | Focus |
|-------|-------|-------|
| 33 | Haptic Feedback | Every action: play/pause, seek, bookmark |
| 34 | Tooltips on Long Press | 200ms (not 500ms) |
| 35 | Scrub Thumbnail Preview | Thumbnail at scrub position |
| 36 | Animated Volume/Brightness Sliders | Smooth transition |

### WAVE 10: FINAL INTEGRATION (Phases 37-40)

**Goal:** Integration testing, build, production ready.

| Phase | Title | Focus |
|-------|-------|-------|
| 37 | Full Navigation Flow Test | Home → IA → Local → Exit |
| 38 | Stream Type Compatibility Test | HLS, DASH, MP4, WebM |
| 39 | Build & Type Check | tsc --noEmit, eslint |
| 40 | Beta QA Pass | Real device testing |

---

## 6. STREAM SEEKING GUARDRAILS SPEC

### 6.1 Detection

```typescript
interface StreamInfo {
  isLive: boolean;          // duration <= 0
  isSeekable: boolean;      // 'no-seek' or 'hr-seek' available
  seekableStart: number;    // earliest seek position
  seekableEnd: number;      // latest seek position (live edge - holdback)
  bufferedRanges: Array<{start: number, end: number}>;  // what's downloaded
  type: 'hls' | 'dash' | 'mp4' | 'webm' | 'other';
}
```

### 6.2 Behavior Rules

| Stream Type | Seekable | Buffered | Action |
|-------------|----------|----------|--------|
| Live (duration=0) | No | N/A | Disable seek, show "LIVE" badge, "Go to live" button if not at edge |
| Live DVR (duration=0, seekable) | Yes (DVR window) | N/A | Allow seek within window, show "Go to live" if not at edge |
| VOD (file://) | Yes (full) | N/A | Allow full seek |
| VOD (http://, seekable) | Yes (full) | Partial | Allow seek, show "Buffering..." if outside buffered |

### 6.3 UI Behavior

1. **Disable seek bar for live non-DVR streams**
2. **Show "LIVE" badge with "Go to Live" button if not at edge**
3. **For VOD streams: show buffered region, allow seek only to buffered OR show "Buffering..." if outside**
4. **Tap to seek shows a seek preview thumbnail (3-5 frames in future)**
5. **Loading overlay if seek goes outside buffered**

### 6.4 Implementation

```typescript
// In useVideoPlayerScreen.ts
const handleSeek = useCallback((pct: number) => {
  const duration = MpvPlayer.getDuration?.() ?? 0;
  const isLive = duration <= 0;
  
  if (isLive) {
    // Live stream - don't allow arbitrary seek
    toast.show('Live stream - seeking not available', 'info');
    return;
  }
  
  const target = pct * duration;
  const bufferedEnd = bufferedPercent * duration;
  
  if (target > bufferedEnd) {
    // Seek to unbuffered region - show buffering
    setIsBuffering(true);
  }
  
  isSeeking.current = true;
  MpvPlayer.seekTo(target);
  setTimeout(() => { isSeeking.current = false; }, 200);
}, [bufferedPercent, toast]);
```

---

## 7. ICON PLACEMENT SPEC

### 7.1 Bottom Controls (PrimaryControls)

**For single video (no playlist):**
```
[⏪ -10s] [▶/⏸] [⏩ +10s]
```

**For playlist:**
```
[⏮ Prev] [⏪ -10s] [▶/⏸] [⏩ +10s] [⏭ Next]
```

**Icon spec:**
- ⏪ Skip back 10s: curved arrow with "10" text, or arc arrow
- ⏮ Previous track: filled triangle with vertical bar
- ⏩ Skip forward 10s: curved arrow with "10" text
- ⏭ Next track: filled triangle with vertical bar
- ▶ Play: filled triangle
- ⏸ Pause: two vertical bars

### 7.2 Top Bar (VideoPlayerTopBar)

**Order from left to right:**
```
[Back] | [Title] | [Lock] [More] [Bookmark] [Share] [Rotate]
```

**Icon spec:**
- Back: ← arrow (filled, not outlined)
- Lock: 🔒/🔓
- More: ⋯ (three dots vertical)
- Bookmark: bookmark icon
- Share: ↗ arrow
- Rotate: phone/landscape icon

### 7.3 SecondaryToolbar (After Wave 7 Simplification)

**Before (current 13+):**
```
[Chapters] [Audio] [Subs] [EQ] [Playlist] [Queue] [Speed] [Shuffle] [Loop] [Volume] [Info] [Screenshot] [Sleep]
```

**After Wave 7 (6 max):**
```
[Chapters] [Audio] [Subs] [Speed] [Volume] [More]
```

**"More" opens consolidated settings sheet with:**
- EQ (audio feature)
- Sleep Timer (audio feature)
- Shuffle (audio feature)
- Loop (audio feature)
- Playlist
- Queue
- Info
- Screenshot

### 7.4 Track Selection Popup (Wave 6)

**Position:** Below the icon that triggered it
**Size:** Width = icon container width, height = auto
**Items:** List with checkmark for active
**Dismiss:** Tap outside

```
[CC icon tap]
   ↓
┌──────────────┐
│ ☑ English    │
│ ○ Spanish    │
│ ○ French     │
│ ○ Off        │
└──────────────┘
```

---

## 8. BOTTOM SHEET / POPUP DECISION TREE

```
User wants to select:
│
├── Single value from short list (< 5 items)?
│   YES → Use POPUP (new component, near icon)
│   NO ↓
│
├── Single value from long list (> 5 items)?
│   YES → Use BOTTOM SHEET (existing BottomSheet)
│   NO ↓
│
├── Multiple values (sliders, toggles)?
│   YES → Use BOTTOM SHEET (existing BottomSheet)
│   NO ↓
│
└── Default: BOTTOM SHEET
```

**Mapping:**

| Selection | Count | Component |
|-----------|-------|-----------|
| Audio Track | 1-10 | POPUP |
| Subtitle Track | 1-10 | POPUP |
| Speed | 5 fixed values | POPUP |
| Chapter | 0-50+ | BOTTOM SHEET |
| Quality | 0-10 | POPUP |
| Volume | 0-100 | ALWAYS VISIBLE SLIDER |
| EQ | 10 bands + presets | BOTTOM SHEET |
| Playlist/Queue | 0-100+ | BOTTOM SHEET |
| Info | Read-only | BOTTOM SHEET |
| Settings | Multi | BOTTOM SHEET |
| Bookmarks | 0-50+ | BOTTOM SHEET |
| Share | Single action | SYSTEM DIALOG |
| Sleep Timer | 5 fixed values | POPUP |

---

## 9. VERIFICATION AND QUALITY ASSURANCE SUITE

### 9.1 Stability Tests

- [ ] Navigate Home → Internet Archives → Home → no crashes
- [ ] Navigate mid-buffer → no crashes
- [ ] Navigate mid-load → no crashes
- [ ] Enter PiP → exit → navigate → no leaks
- [ ] Press back repeatedly → no double-navigation
- [ ] Rapidly rotate portrait/landscape 10x → no crashes

### 9.2 Bookmark Tests

- [ ] Save bookmark at 1:23 → toast "Bookmark saved" appears
- [ ] Save at 0:00 → error "Cannot bookmark at start"
- [ ] List shows 5+ bookmarks → all visible with thumbnails
- [ ] Tap bookmark → seeks to that position
- [ ] Long press bookmark → rename option
- [ ] Swipe bookmark left → delete option
- [ ] Bookmark icon shows "saved" state when current position matches

### 9.3 Rotation Tests

- [ ] Portrait → tap rotate → landscape (within 1s on iOS, instant on Android)
- [ ] Landscape → tap rotate → portrait
- [ ] Video continues playing during rotation
- [ ] Native surface re-attaches correctly
- [ ] Back navigation from landscape → app stays portrait

### 9.4 Seek Tests

- [ ] VOD file: seek to 50% → instant play
- [ ] VOD stream: seek to 50% → "Buffering..." → plays
- [ ] Live stream: seek bar disabled
- [ ] Live DVR stream: seek within window works
- [ ] Live stream: "Go to live" button appears when not at edge
- [ ] Tap "Go to live" → seeks to current edge

### 9.5 Control Layout Tests

- [ ] Single video: 3 controls in bottom (skip-play-skip)
- [ ] Playlist: 5 controls in bottom (prev-skip-play-skip-next)
- [ ] Icons visually distinct (prev track ≠ skip back)
- [ ] Top bar: back, title, [lock, more, bookmark, share, rotate]

### 9.6 Track Selection Tests

- [ ] Tap CC icon → popup appears with track list
- [ ] Popup shows "Off" as first option
- [ ] Tap track → applies immediately, popup closes
- [ ] Current track has checkmark
- [ ] Audio popup shows codec info (e.g., "English (AAC, stereo)")

### 9.7 UI Simplification Tests

- [ ] Video player shows ≤6 controls in secondary toolbar
- [ ] EQ, Sleep, Shuffle, Loop moved to settings (or removed from video)
- [ ] Settings has clear grouping: Video | Audio | Playback
- [ ] Icons have labels on long press (200ms tooltip)

### 9.8 Smoothness Tests

- [ ] Open video → no jank during initial load
- [ ] Rotate → smooth animation, no dropped frames
- [ ] Open settings → smooth slide-up
- [ ] Scroll bookmark list → smooth, virtualized
- [ ] Theme switch → only themed components re-render

### 9.9 Stream Compatibility

- [ ] HLS live stream → seek disabled, LIVE badge shown
- [ ] HLS VOD → seek works, buffered region shown
- [ ] DASH stream → seek works
- [ ] MP4 file → seek works instantly
- [ ] WebM stream → seek works
- [ ] Internet Archives MP4 → loads and plays

### 9.10 Build & QA

- [ ] `tsc --noEmit` → exit 0
- [ ] `eslint src/` → exit 0
- [ ] No debug network calls in production
- [ ] No unused imports or dead code
- [ ] Production build → APK size < 80MB
- [ ] Cold start < 3s
- [ ] Time to first frame < 2s

---

> **Document Version:** 6.0.0
> **Created:** 2026-08-03
> **Supersedes:** `UI_UX_Elevation_Specification_v5.md`
> **Companion:** `UI_UX_Elevation_Progress_Tracker_v6.md`
> **Status:** READY FOR EXECUTION
