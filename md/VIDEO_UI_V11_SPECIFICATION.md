# SIMBA Mobile: Video UI v11 — Cinema-Grade Player Revamp
## Specification

> **Document Version:** 11.1.0 — revised spec (2026-08-25)
> **Status:** 🔄 READY FOR EXECUTION — this revision supersedes 11.0.0.
> **Why revised:** 11.0.0 contained three factual errors (verified against source), one performance-hostile design (base64 mini-frame screenshots), and several internal contradictions (more-sheet vs utility row, centre-arc vs pill, phantom tracker file). This revision re-grounds every claim in the current codebase, resolves the contradictions with explicit decisions, and adds the missing layers a top-tier player needs: gesture timing contract, scrub preview, lock-mode behavior, resume prompt, landscape contract, copy table, performance budget, and an inline execution plan.

### Changes from 11.0.0

| # | 11.0.0 claim | Reality (verified) | Decision in 11.1.0 |
|---|---|---|---|
| 1 | "`VideoQueueScreen` route is pushed by `onOpenQueue`" | No `VideoQueueScreen` exists anywhere. There is one shared `Queue` route ([RootNavigator.tsx:272-273](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/navigation/RootNavigator.tsx#L272-L273)) and `VideoHost.openQueue` **closes the player first**, then navigates ([VideoHost.tsx:285-288](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/host/VideoHost.tsx#L285-L288)) | Regression re-worded: the real defect is *"opening the queue kills the video session"*. Target: a sheet over the live player. The shared `Queue` route stays for audio/deep links. |
| 2 | "Mini frame via `MpvPlayer.screenshot()` base64 PNG at 4 Hz" + "No new `@ReactMethod` needed" | Self-contradictory (`screenshot` would be a new method), and 4 Hz PNG→base64→`<Image>` decode is a JS-thread perf disaster on low-end devices | **Single-surface mini**: keep the live `VideoNativeSurface` mounted inside the shell across full↔mini; re-lay the container, don't capture frames. Bitmap fallback only when the surface is detached (PiP). |
| 3 | Execution tracked in `VIDEO_UI_V11_TRACKER.md` (30 phases, 10 themes) | File does not exist | Execution plan is now **inline in §10** of this document. |
| 4 | Centre "progress arc" around the play button during loading (§4.10 C3) while §4.11 says the centre play is never visible during loading | Contradiction | **Decision: no arc.** The unified pill is the only loading surface; the centre action exists only for `paused | ended | error`. One loading surface, period. |
| 5 | Bottom utility row = captions/tracks/chapters/speed/PiP/more (§4.10), while MoreSheet also contains speed/tracks/chapters/PiP (§4.6) | Double placement | **Decision:** utility row keeps only high-frequency chips; tracks/chapters/queue/fullscreen/EQ live exclusively in the MoreSheet. See §4.6. |
| 6 | "Watchdog stays at 12 s" implied pre-existing | True — verified: `FIRST_FRAME_WATCHDOG_MS = 12_000` ([VideoMpvSession.ts:41](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L41), armed at `:404-420`) | Keep, and make it the sole producer of the pill's `error` state for first-frame failure. |

---

## 0. Current baseline (what already exists — do not rebuild)

Verified in source on 2026-08-25. These items are **done** and this spec must not regress them:

| Capability | Evidence |
|---|---|
| Native truth for video: property observers (`time-pos`, `duration`, `pause`, `paused-for-cache`, `cache-buffering-state`, `demuxer-cache-state`, `seekable`, `seeking`) + 750 ms poll fallback | [VideoMpvSession.ts:40-51,428-437,439-445](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L40-L51) |
| Native singleton ownership lease (close/reopen race closed) | [VideoNativeLease.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoNativeLease.ts) |
| First-frame watchdog (12 s) with cancel/retry UX | [VideoMpvSession.ts:404-426](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L404-L426), [VideoFirstFrameLoading.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/loading/VideoFirstFrameLoading.tsx) |
| Buffer-stall recovery via `playbackRestart` | [VideoMpvSession.ts:573-584](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/session/VideoMpvSession.ts#L573-L584) |
| Gestures: double-tap ±10 s, left-edge vertical pan → brightness, right-edge vertical pan → volume, transient HUD | [VideoSurfaceGestures.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoSurfaceGestures.tsx) |
| Full chrome: top bar (back/title/lock), inline status line, centre play/retry, rail, transport (prev/rewind/play/forward/next), utility row (captions/tracks/chapters/bookmark/queue/PiP/speed), speed FilterSheet, tracks FilterSheet, chapters sheet | [VideoControlLayer.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoControlLayer.tsx), [VideoHost.tsx](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/host/VideoHost.tsx) |
| 3 s chrome auto-hide while playing; keep-awake during playback | [VideoHost.tsx:236-260](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/host/VideoHost.tsx#L236-L260) |
| Mini: swipe-down-to-dismiss, tap-to-expand, play/expand/close | [VideoControlLayer.tsx:186-289](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoControlLayer.tsx#L186-L289) |
| Theme tokens incl. cinema palette (`accent.gold #C9A84C`, `accent.primaryCTA #14532D`, `text.bright`, `text.onMediaSoft/Muted`, `background.surfaceDark`, scrim scale) | [src/theme/tokens.ts](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/theme/tokens.ts) |

**Why this doc exists:** seven user-visible regressions remain in the live APK despite the baseline above:

1. **Loading-indicator overload** — the `VideoFirstFrameLoading` overlay competes with the inline status line, the centre retry, and the watchdog. Up to three "while loading" surfaces can appear at once.
2. **Mini player shows no video frame** — mini is text + controls; the native surface is only projected in full mode.
3. **Close button at the bottom-right** of the utility row ([VideoControlLayer.tsx:178](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoControlLayer.tsx#L178)) — opposite of the iOS/Android standard.
4. **Fullscreen / landscape impossible** — both activities pinned `android:screenOrientation="portrait"` ([AndroidManifest.xml:30,56](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/AndroidManifest.xml#L30)); the `onToggleFullscreen` slot exists ([VideoControlLayer.tsx:174](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoControlLayer.tsx#L174)) but `VideoHost` never passes it.
5. **Queue kills the session** — `openQueue` calls `closePlayer()` then navigates to the shared `Queue` route ([VideoHost.tsx:285-288](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/host/VideoHost.tsx#L285-L288)). Expected: a sheet over the live player.
6. **Top-right `more` (⋯) is dead** — the slot renders only when `onOpenMore` is passed ([VideoControlLayer.tsx:116](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/modules/playback/video/presentation/VideoControlLayer.tsx#L116)); `VideoHost` never passes it.
7. **Two retry affordances on error** — the centre button flips to retry AND `VideoFirstFrameLoading` shows its own inline Retry. *Resolution (do not re-flag):* per §4.4, after this wave both the pill and the centre call the **same** `onRetry` handler — the visual redundancy is intentional, the affordance is singular. The defect being killed is the legacy overlay's *independent* retry, not the second entry point.

**Goal:** one canonical player surface, one loading state at a time, close top-right, mini with live frame, true landscape fullscreen, queue as a sheet, and a real MoreSheet. Quality bar: V10.1 Movies / V10.2 Podcasts.

---

## 1. TL;DR

1. **Top bar** — `back | title (ellipsised) | lock · more · close`. Close always top-right in full chrome.
2. **Video frame** — content aspect, `fit` default, pinch → `fill`, gold-soft letterbox, never pure black.
3. **Centre action** — 96×96 gold play/pause/replay/retry with phase-aware hint copy. Visible only for `paused | ended | error`. Never during loading.
4. **Single loading pill** — replaces the first-frame overlay, inline status line, and watchdog surface. One shape, one position, states `preparing | buffering | seeking | reconnecting | error`.
5. **Bottom bar** — progress rail (drag-scrub + preview tooltip + chapter/bookmark markers + LIVE pill) → transport row → compact utility row (captions · bookmark · speed chip · PiP · more).
6. **MoreSheet (the only modal)** — Queue / Tracks & quality / Chapters / Fullscreen / Equalizer.
7. **Mini player** — the *live native surface* re-laid into a compact card: frame + title + time + play/expand/close. Swipe-down dismiss stays.
8. **Fullscreen** — programmatic landscape + immersive via new native `setOrientation`/`setImmersive`; manifest pin removed; chrome adapts; rotation button on the bottom bar.
9. **Nothing about the playback engine changes in this wave** — observers, lease, watchdog, gestures are locked as-is (§0).

---

## 2. Rules (locked)

0. **One loading surface at a time.** A finite-state machine drives it: `idle | preparing | buffering | seeking | reconnecting | error`. Only the active state renders. `VideoFirstFrameLoading` is **deleted**; its cancel/retry behavior moves into the pill + centre action.
1. **Close is top-right.** It leaves the utility row. In mini, close stays in the mini's action cluster (mini has no top bar).
2. **Mini shows the live surface.** The single `VideoNativeSurface` stays mounted across full↔mini transitions; the shell re-lays the container. No screenshot pipeline. Poster/placeholder only before first frame or when the surface is detached (PiP) — never a black box.
3. **Top-bar right cluster is `lock · more · close`**, 44×44 icon buttons, 8 px gap, right-aligned. `more` renders when at least one MoreSheet section is available.
4. **One modal in the player: the MoreSheet.** Queue, tracks, chapters, fullscreen, EQ are sections inside it. The existing standalone speed/tracks/chapters FilterSheets are folded into it; their sheet primitives (`FilterSheet`) are reused, not reinvented.
5. **Watchdog = 12 s** and is the sole trigger of the pill's `error` state for first-frame failure.
6. **Drag-scrub stays** and gains a preview tooltip + markers.
7. **Auto-hide = 3 s** after last activity while playing. Chrome always visible when paused/error/ended. Top bar stays visible in full mode even during auto-hide (close is too critical to hide); only bottom bar + centre fade.
8. **Centre action visibility:** `phase ∈ {paused, ended, error}` only. On `error` the icon is `replay` and the hint reads "Try loading the video again".
9. **No new colors.** Cinema palette only: `accent.gold`, `accent.primaryCTA`, `text.bright`, `text.onMediaSoft`, `text.onMediaMuted`, `background.surfaceDark`, the scrim scale, and `semantic.error`. The LIVE pill uses `semantic.error` (existing token), not a new red.
10. **No new type shapes except one:** `VideoSessionSnapshot` gains the discriminated `loadingState` union (§3.1). `isLoading: boolean` survives one release as a derived alias.
11. **Native driver only** for chrome animations (`translateY`/`opacity`). Zero `useNativeDriver: false` layout animations in this wave.
12. **Every visible control works.** No rendered no-ops. If a capability is missing, hide the control — never render a dead icon.

---

## 3. Architecture

```
VideoHost.tsx                                    (owns playback unit + sheets; slim)
 ├─ VideoPresentationShell.tsx                   (single animated container for full/mini)
 │   └─ VideoSurfaceGestures.tsx                 (wraps surface; double-tap + pans; HUD)
 │       └─ VideoNativeSurface.tsx               (LIVE in both full and mini)
 │   └─ VideoSafeControlLayer.tsx
 │       └─ VideoControlLayer.tsx
 │           ├─ VideoTopBar.tsx          NEW     (back | title | lock · more · close)
 │           ├─ VideoCenterAction.tsx    NEW     (play / pause / replay / retry + hint)
 │           ├─ VideoStatusPill.tsx      NEW     (the only loading surface)
 │           ├─ VideoProgressRail.tsx    UPDATE  (drag-scrub, tooltip, markers, LIVE)
 │           ├─ VideoBottomBar.tsx       NEW     (rail + transport + utility row)
 │           └─ VideoMoreSheet.tsx       NEW     (single modal: queue/tracks/chapters/fullscreen/EQ)
 ├─ VideoPipAdapter.tsx                          (gated; see §9.4)
 ├─ VideoStateAdapter + reduceVideoSessionEvent  (loadingState union)
 └─ VideoMpvSession.ts                           (locked — observers/lease/watchdog stay)
```

### 3.1 `loadingState` union (the only type change)

```ts
type VideoLoadingState =
  | {kind: 'idle'}
  | {kind: 'preparing'}                        // load issued → first frame
  | {kind: 'buffering'; cacheFill: number}     // 0..1 mid-stream stall
  | {kind: 'seeking'; to: number}              // scrub or programmatic seek
  | {kind: 'reconnecting'}                     // transport reset (future wave)
  | {kind: 'error'; message: string; recoverable: boolean};
```

`loadingState` is always present. The view layer switches on `kind`; it never sees `isLoading: boolean` (kept one release as `loadingState.kind !== 'idle'` for unmigrated consumers, then removed).

**Derivation rules (session → pill):**
- `phase === 'preparing' | 'connecting'` → `preparing`
- `isSeeking` → `seeking` (wins over buffering — matches reducer precedence `seeking > buffering > playing`)
- `paused-for-cache` / fill ∈ (0,1) → `buffering{cacheFill}`
- `phase === 'error'` or watchdog fire → `error`
- otherwise → `idle` (pill hidden)

### 3.2 Mini = the same surface, re-laid (replaces screenshot plan)

The shell renders **one** `VideoNativeSurface`. Full↔mini is a container layout change:

```
full:  surface fills shell; chrome overlays it
mini:  shell shrinks to card; surface occupies the frame slot (16:9 crop),
       text + controls sit beside/below it
```

- Transition uses `transform`/`opacity` (native driver) on the shell + `onLayout`-driven frame slot sizing. The TextureView reflows via `onSurfaceTextureSizeChanged` (already handled natively).
- Before first frame: frame slot shows the entry's `image`/`thumbnailUrl`, else a gold placeholder with the brand mark. Never black.
- During PiP (surface detached by the system): frame slot shows the last-known poster; on expand, the surface re-attaches and live resumes.
- No new native methods. No base64 pipeline. No `<Image>` decode churn.

### 3.3 Fullscreen / landscape native surface (new bridge work)

Two new `@ReactMethod`s on `MpvBridgeModule.kt` (the only native additions in this wave):

```kotlin
@ReactMethod fun setOrientation(mode: String)   // "portrait" | "landscape" | "sensor"
@ReactMethod fun setImmersive(enabled: Boolean) // WindowInsetsController hide/show,
                                                  // BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
```

- `setOrientation` maps to `requestedOrientation` (`USER_LANDSCAPE` / `PORTRAIT` / `FULL_SENSOR`) and emits `onOrientationChanged(mode)` back to JS.
- Manifest: both activities drop `android:screenOrientation="portrait"`; default becomes `unspecified`. JS is the orientation authority while the player is open; on player close, `setOrientation('portrait')` restores app behavior.
- Capability gate: `VideoPlatformCapabilities.canFullscreen = typeof MpvPlayer.setOrientation === 'function' && typeof MpvPlayer.setImmersive === 'function'`. When false, the Fullscreen row renders as muted, non-tappable text — never a dead control (Rule 12).

---

## 4. Component specs

### 4.1 VideoTopBar

```
┌─────────────────────────────────────────────┐
│ [←]     Champion…              [🔒] [⋯] [✕] │
└─────────────────────────────────────────────┘
```

| Element | Spec |
|---|---|
| root | `position: absolute, top/left/right: 0`; `paddingTop: geometry.topContentInset`; `paddingHorizontal: geometry.horizontalContentInset`; scrim gradient `background.scrimStrong → transparent`, 96 px tall, `pointerEvents: 'box-none'` |
| back | 44×44, icon `back`, `onBack` (closes in full; no-op slot otherwise) |
| title | `flex: 1, textAlign: 'center'`, Cormorant Italic 18, `text.bright`, `numberOfLines: 1`; left/right margins 8 px so it never collides with buttons |
| lock | 44×44, icon `lock`/`unlock` (gold when locked); renders only when `onToggleLock` provided |
| more | 44×44, icon `more`; renders when ≥1 MoreSheet section is available |
| close | 44×44, icon `close`, `text.bright`; **always present in full chrome**; `accessibilityHint: 'Closes the video player and returns to the previous screen'` |
| visibility | top bar itself never auto-hides in full mode (Rule 7); it fades with chrome in mini |

### 4.2 Video frame & gesture surface

| Element | Spec |
|---|---|
| background | `background.surfaceDark` (near-black warm), never `#000` |
| letterbox | natural `contain`; when `fill` active, `cover` crop; toggle via pinch or double-tap-center (future); mode persisted per-session in `viewState.aspectMode` |
| single tap | toggles chrome **immediately** (no delay); if a double-tap lands within 300 ms, the seek gesture runs and chrome is forced visible |
| double tap | left half −10 s, right half +10 s (existing); cumulative ripple label ("20 seconds", "30 seconds") stacks while repeated within 1 s |
| vertical pan left | brightness, 2%/event step (existing), HUD icon + bar |
| vertical pan right | volume 0–100 (existing), HUD icon + bar |
| HUD | 1.1 s timeout (existing); re-centered inside safe area; `pointerEvents: 'none'` |
| lock mode | all gestures disabled except the unlock float (§4.10) |

### 4.3 VideoCenterAction

| Element | Spec |
|---|---|
| container | absolute-centered on the **video content rect** (not the overlay rect); `marginTop: -48` for a 96 px button |
| button | 96×96, radius 48, `accent.primaryCTA` fill, 2 px `accent.gold` border; press animation scale 1→0.92→1 (120 ms spring) |
| icon | `play` / `pause` / `replay` (ended) / `replay` (error); 48 px, `accent.gold` |
| hint | below button, `AppText body`, `text.bright`; error → "Try loading the video again"; ended → "Play from beginning" |
| visibility | `phase ∈ {paused, ended, error}` AND `loadingState.kind ∈ {idle, error}`. Hidden during any other loading state (Rule 8) |
| a11y | label per phase: "Play" / "Pause" / "Replay" / "Retry loading the video" |

### 4.4 VideoStatusPill — the only loading surface

```
            ╭──────────────────────╮
            │ ● Buffering · 62%    │
            │ ▓▓▓▓▓▓▓▓▓░░░░░░░░░░  │
            ╰──────────────────────╯
```

| Element | Spec |
|---|---|
| container | `top: geometry.topContentInset + 56`, horizontally centered, `pointerEvents: 'none'` except in `error` |
| pill | radius 18, `paddingVertical: 10, paddingHorizontal: 18`, `rgba(0,0,0,0.55)` bg, hairline `accent.gold` border |
| mark | 8 px dot, `accent.gold`; pulses (opacity 0.4↔1, 1.2 s loop) while `preparing | buffering | reconnecting` |
| label | `bodySmall` 700, `text.bright`: `Preparing video` / `Buffering · {Math.round(cacheFill*100)}%` / `Seeking` / `Reconnecting` / `{error.message}` |
| progress | 3 px inner bar, white 18% track, `accent.gold` fill at `cacheFill`; rendered only when `cacheFill > 0` |
| error state | pill gains `pointerEvents: 'auto'`; whole pill tappable = retry; label `semantic.error`-tinted dot; retry also available on centre action — **both call the same handler; they are one affordance expressed twice, never two different ones** |
| enter/exit | 200 ms slide-in (`translateY: -8 → 0` + fade, native driver); 120 ms label crossfade on kind change |
| a11y | `accessibilityLiveRegion: 'polite'`; announces every kind change |

### 4.5 VideoBottomBar

```
┌─────────────────────────────────────────────┐
│  1:23 ━━━━━●▬▬▬▬▬▬▬▬▬▬▬▬▬▬○────── -1:04:11 │  ← rail row (times outside rail)
│                                             │
│        [|◀]  [⏪10]  [▶]  [10⏩]  [▶|]       │  ← transport
│                                             │
│   [CC] [🔖] [1×] [⧉]            [⤢]  […]   │  ← utility (close is NOT here)
└─────────────────────────────────────────────┘
```

| Element | Spec |
|---|---|
| root | absolute bottom; `paddingBottom: geometry.bottomContentInset`; scrim gradient transparent → `scrimStrong` |
| rail row | `VideoProgressRail` flanked by elapsed (left) and **remaining** (right, `-H:MM:SS`); tap on the time toggles remaining↔total |
| transport | `prev(44) · rewind(44) · play(56 gold) · forward(44) · next(44)`; prev/next hidden when no queue/chapter context (no dead buttons) |
| utility | 36×36 chips, 8 px gap, left-to-right: **captions** (gated `canSelectCaptionTrack`) · **bookmark** (filled gold when current position bookmarked) · **speed chip** (shows `1×`, gold when ≠ 1) · **PiP** (Android gate) · spacer · **fullscreen rotate** (Rule 12 gate) · **more** (opens MoreSheet) |
| never here | close, queue, tracks, chapters, EQ (all moved up or into MoreSheet) |

### 4.6 VideoProgressRail (upgrade)

| Feature | Spec |
|---|---|
| drag-scrub | existing tap/drag stays; while dragging, a **preview tooltip** floats above the thumb: `H:MM:SS` + chapter name when the thumb is inside a chapter |
| thumb | 12 px circle, clamped inside the track (fix current `marginLeft: -6` overhang) |
| buffered | single active window around the playhead (honest-range policy — keep) |
| chapter markers | 2×8 px ticks, `text.onMediaMuted`, at chapter starts when `chapters.length > 1` |
| bookmark markers | 4 px gold diamonds at bookmark positions for the current source |
| LIVE | when `isLive`: rail replaced by a non-interactive track + `LIVE` pill (`semantic.error` dot + label) at the right edge; tap on pill = seek-to-live-edge when seekable |
| updates | position-driven re-render throttled to 1 Hz; scrub preview is gesture-local state (no session writes until release) |

### 4.7 VideoMoreSheet — the single modal

```
┌─────────────────────────────────────────────┐
│                  ▔▔▔▔                       │
│ UP NEXT                            Queue (3)│
│  ▸ row: current item (gold-soft)            │
│  ▸ row / row / row …         [Clear queue] │
│─────────────────────────────────────────────│
│ TRACKS & QUALITY                            │
│  Video [720p ▾]  Audio [English ▾]          │
│  Subtitles [Off ▾]                          │
│─────────────────────────────────────────────│
│ CHAPTERS (12)                               │
│  ▸ chapter rows, active gold                │
│─────────────────────────────────────────────│
│ WINDOW                                      │
│  [Fullscreen] [Picture in picture]          │
│─────────────────────────────────────────────│
│ AUDIO        [Equalizer]                    │
│─────────────────────────────────────────────│
│                            [Done]           │
└─────────────────────────────────────────────┘
```

| Element | Spec |
|---|---|
| container | `Modal transparent animationType="none"` + `FilterSheet` slide primitive; 240 ms `translateY` (native driver); scrim 0→0.55 in 200 ms; swipe-down on handle or scrim tap dismisses |
| sections | **rendered only when non-empty**: Queue (queue length > 0 or current entry has siblings), Tracks (tracks.length > 0), Chapters (chapters.length > 1), Window (always), Audio (EQ available) |
| queue body | reuses the `QueueScreen` list rows verbatim (thumb, title, meta, VIDEO badge); row tap = `playVideo(id)` + dismiss; current row highlighted; `Clear queue` destructive-soft |
| tracks body | the existing tracks FilterSheet options, re-rendered inline as chip groups (video / audio / subtitles, `Off` allowed for subtitles) |
| chapters body | the existing chapters sheet rows; tap seeks + dismisses |
| speed | **stays a chip on the utility row** (high-frequency), not a MoreSheet section; the existing speed FilterSheet remains its surface |
| state | sheet visibility is host-owned; opening it pauses auto-hide; dismissing restores it |
| a11y | `accessibilityViewIsModal: true`; focus → first row on open; focus returns to the `more` button on dismiss |

### 4.8 Mini player (single-surface)

```
┌─────────────────────────────────────────────┐
│ ┌──────────┐  Champion                ▶ ⤢ ✕ │
│ │ LIVE FRAME│  1:23 / 1:34:34               │
│ └──────────┘  ▔▔▔▔▔▔▔▔▔▔▔▔ (progress)       │
└─────────────────────────────────────────────┘
```

| Element | Spec |
|---|---|
| root | card above bottom inset; `background.floating`; radius 12; elevation shadow; swipe-down-to-dismiss (existing 60 px threshold) |
| frame | 96×54 (16:9) slot rendering the **live surface**; radius 8; tap = expand |
| fallback | before first frame / PiP-detached: entry `image` → `thumbnailUrl` → gold placeholder |
| text | title Inter SemiBold 14 `text.primary` one line; time Inter Regular 12 `text.secondary` |
| controls | 32×32: play/pause · expand · close |
| progress | 2 px hairline at the card bottom edge (existing rail, non-interactive in mini) |
| gestures | card drag follows finger vertically (rubber-band) past 60 px → dismiss; tap anywhere outside controls = expand |

### 4.9 Fullscreen / landscape

| Element | Spec |
|---|---|
| entry | utility-row rotate button OR MoreSheet "Fullscreen" row → `setOrientation('landscape')` + `setImmersive(true)` |
| chrome adaptation | top bar: back icon becomes "exit fullscreen" (`accessibilityLabel: 'Exit fullscreen'`), close stays right. Bottom bar sits 24 px from the physical bottom (nav bar hidden) |
| auto-entry | when the user rotates the device physically and the app is in the player, honor sensor → landscape (only while player open; `setOrientation('sensor')` on player open is optional per Settings later — default off this wave) |
| exit | rotate button again, close, or system back → `setOrientation('portrait')` + `setImmersive(false)`; chrome fades back in after rotation settles |
| failure | if `onOrientationChanged` does not arrive within 1.5 s (OEM rotation lock), revert state, show pill `error`-lite transient "Could not enter fullscreen" auto-clearing in 2 s |
| announcement | `AccessibilityInfo.announceForAccessibility('Entered fullscreen')` / `'Exited fullscreen'` |

### 4.10 Lock mode

| Rule | Behavior |
|---|---|
| entering | lock button (top bar) → `isLocked = true`; all chrome fades except a floating unlock button (left edge, vertically centered, 44×44, `scrimStrong` bg) |
| while locked | top/bottom bars hidden and inert; all gestures disabled (tap, double-tap, pans); centre action hidden; pill still renders (status is information, not control) |
| unlock tap | first tap reveals the full chrome for 3 s with an "Unlocked" hint; the lock button toggles back. No accidental single-tap unlock |
| persistence | lock state resets on close/expand; never persisted across sessions |

### 4.11 Resume prompt

| Rule | Behavior |
|---|---|
| trigger | open with saved position > 30 s AND < duration − 60 s, and no explicit `startPosition` in the request |
| surface | pill-region card: "Continue from {time}?" with `[Resume]` (gold) and `[Start over]` (ghost); auto-"Start over" after 8 s |
| during prompt | media loads paused at 0; first frame visible behind the card |
| source | existing bookmark/history resume plumbing in `VideoHost` (resume-from-bookmark already wired) — this formalizes the UX |

### 4.12 States — the complete FSM

```
phase:  idle → preparing → ready ⇄ playing ⇄ paused
                              ↓         ↓↑
                            error    buffering (paused-for-cache)
                                        ↓
                            seeking (transient flag over any phase)
                                        ↓
                                     ended
loadingState (pill): idle | preparing | buffering | seeking | reconnecting | error
```

**Rendering contract:**
- centre visible ⇔ `phase ∈ {paused, ended, error}` ∧ `loadingState.kind ∈ {idle, error}`
- pill visible ⇔ `loadingState.kind ≠ idle`
- chrome (bars) visible ⇔ `!chromeHidden ∨ !playing ∨ locked-visible`
- the three sets never produce two loading surfaces simultaneously by construction

### 4.13 Edge cases

| Case | Behavior |
|---|---|
| rapid close during seek | `release` cancels in-flight seek (existing lease chain); pill hides immediately |
| retry tap during buffering | no-op (retry exists only in `error`) |
| watchdog fire | once per generation → `error{recoverable: true}` (network may be transient); message "Video did not produce a first frame. Check the connection and retry." |
| PiP | pill hidden while in PiP (system owns chrome); state re-syncs on expand |
| error then new load | generation-scoped (existing) — stale errors cannot poison the retry |
| queue empty | MoreSheet hides the Queue section; utility queue icon absent (Rule 12) |
| live stream | seek disabled, LIVE pill, no remaining-time, no chapters/bookmarks |
| rotation during sheet open | MoreSheet stays open; layout reflows (it's a Modal) |

---

## 5. Animation & micro-interactions

| Trigger | Animation |
|---|---|
| chrome hide/show | 240 ms, top bar `translateY(-100%)` (but top bar stays in full mode per Rule 7 — only bottom + centre animate), bottom bar `translateY(100%)`, centre `opacity`; **all native driver** |
| pill kind change | 120 ms label crossfade; 200 ms pill slide-in on first show |
| centre press | 120 ms spring scale 1→0.92→1, `bounciness: 4` |
| shell full↔mini | 280 ms, `transform` + `borderRadius` via native-driver-safe interpolation on the container; surface TextureView reflows natively (this replaces the current `useNativeDriver: false` layout animation — fixed in this wave) |
| MoreSheet / QueueSheet | 240 ms slide (`translateY: 100%→0`), scrim 200 ms fade, in parallel; dismiss 200 ms reversed |
| double-tap seek ripple | existing HUD; cumulative seconds label scales 1→1.08 on each stacked tap |
| bookmark tap | icon morphs outline→filled gold + 90 ms haptic (`useHaptics` existing) + toast "Bookmark saved" |
| fullscreen rotation | no JS fake-rotation animation — rely on the system rotation (cleaner, no double-animation); chrome fades out pre-rotation, fades in post-`onOrientationChanged` |

---

## 6. Accessibility

- Every control ≥ 44×44 hit target (36 px utility chips carry 44 px hit slop).
- Labels locked: Play/Pause/Replay/Retry per phase; "Open queue", "Playback speed, currently 1×", "Picture in picture", "Enter fullscreen", "Exit fullscreen", "Lock controls", "Unlock controls", "Bookmark this moment", "Remove bookmark".
- Pill: `accessibilityLiveRegion: 'polite'` announces kind changes; takes over announcements while centre is hidden.
- Sheets: `accessibilityViewIsModal`; focus management per §4.7.
- Gestures: every gesture has a control-equivalent (double-tap seek ⇔ rewind/forward buttons; pans are informational-only for a11y users).
- Reduced motion: when `AccessibilityInfo.isReduceMotionEnabled`, shell transition duration → 0 and pill slide → fade-only.

---

## 7. Performance budget

| Item | Budget |
|---|---|
| chrome animations | 100% native driver; zero JS-thread layout animation (kills the current `useNativeDriver: false` shell animation) |
| rail re-render | ≤ 1 Hz from session position; scrub tooltip is local state |
| session → React | `VideoStateAdapter` subscription memoized; host subscribes once (no per-render re-subscribe) |
| MoreSheet rows | `FlatList`/memo rows; queue rows keyed by entry id |
| mini surface | TextureView size change storm damped: shell animates 280 ms, surface receives ≤ 2 size changes (start/end) via `setWillNotDraw`-free layout pass |
| no new decode work | mini uses the live surface — zero screenshot/decode cost (the 11.0.0 base64 pipeline is abandoned) |

---

## 8. Copy table (canonical strings)

| Key | Text |
|---|---|
| pill.preparing | `Preparing video` |
| pill.buffering | `Buffering · {pct}%` |
| pill.seeking | `Seeking` |
| pill.reconnecting | `Reconnecting` |
| pill.errorWatchdog | `Video did not produce a first frame. Check the connection and retry.` |
| centre.errorHint | `Try loading the video again` |
| centre.endedHint | `Play from beginning` |
| resume.title | `Continue from {time}?` |
| resume.resume | `Resume` · resume.startOver | `Start over` |
| queue.empty (sheet hidden) | — |
| queue.clear | `Clear queue` |
| fullscreen.fail | `Could not enter fullscreen` |
| bookmark.saved | `Bookmark saved` · bookmark.removed | `Bookmark removed` |
| lock.unlockedHint | `Controls unlocked` |
| live.label | `LIVE` |

All strings route through `constants/strings.ts` (existing pattern); no inline literals in components.

---

## 9. Native prerequisites & gates

1. **`setOrientation` / `setImmersive`** (§3.3) — required for T8. Gated via `VideoPlatformCapabilities.canFullscreen`.
2. **PiP defects** (from `PLAYER_AUDIT_v11_FULL_FINDINGS.md` P1/P2): `exitPip()` finishes the whole activity and PiP entry can stick in `entering`. **This UI wave does not touch PiP behavior**; the PiP chip renders only because the adapter exists, and its native correctness is owned by `PLAYER_FIX_TRACKER_v1.md`. If that tracker's PiP fix is not landed, gate the chip off — a broken PiP is worse than no PiP (Rule 12).
3. **Manifest change** — removing the portrait pin affects the whole app: every other screen must remain portrait-locked via JS (`setOrientation('portrait')` on player close) until per-screen orientation is owned properly. Validation on at least 2 devices (one Huawei, one Pixel) is mandatory before merge.

---

## 10. Execution plan (inline — replaces the phantom tracker)

Each theme ends with: `npx tsc --noEmit` exit 0 + one commit. No theme regresses a §0 baseline item.

| Theme | Scope | Validation |
|---|---|---|
| T1 Unified loading pill | Add `loadingState` union; build `VideoStatusPill`; delete `VideoFirstFrameLoading`; fold its cancel/retry into pill+centre; wire derivation rules §3.1 | Only one loading surface visible in every phase (manual pass matrix); watchdog still fires at 12 s |
| T2 Top bar rework | Build `VideoTopBar`; move close top-right; remove close from utility row; wire `onOpenMore` (MoreSheet stub OK) | Close visible top-right in full; utility row has no close |
| T3 MoreSheet | Build `VideoMoreSheet` with sections §4.7; fold queue/tracks/chapters/fullscreen/EQ; delete standalone sheets after parity | Every row acts; empty sections hidden; queue plays without closing the player |
| T4 Queue-as-sheet | Move queue body into MoreSheet; delete `openQueue` close-then-navigate path; shared `Queue` route remains for audio/deep links | Opening queue keeps playback alive; row tap switches video |
| T5 Centre action + single retry | Build `VideoCenterAction` §4.3; error shows one logical retry; hint copy per §8 | No phase renders two retry affordances |
| T6 Rail upgrade | Drag-scrub tooltip, chapter/bookmark markers, remaining-time, thumb clamp, LIVE pill | Scrub preview accurate ±1 s; markers visible on sources with chapters/bookmarks |
| T7 Mini with live surface | Single-surface re-lay §3.2; shell native-driver animation; card layout §4.8 | Mini shows live frame while playing; transition ≥ 55 fps on mid-tier device |
| T8 Fullscreen/landscape | Native `setOrientation`/`setImmersive`; manifest unpin; chrome adaptation §4.9; capability gate | Rotate in/out on 2 devices; app remains portrait elsewhere; failure path shows transient pill |
| T9 Lock mode + resume prompt + auto-hide polish | §4.10, §4.11; auto-hide trigger list (tap, scrub release, volume/brightness change reset the 3 s timer) | Locked player ignores all gestures except unlock float; resume card obeys 8 s default |
| T10 Utility row consolidation + dead-control sweep | Final utility row §4.5; audit every rendered control has a handler (Rule 12); delete unused icon slots | Zero no-op controls in full/mini/landscape |

**Order rationale:** T1–T2 unblock the visual contract; T3–T4 consolidate modality; T5–T6 finish the main surface; T7–T8 are the two high-risk native-touching themes (kept late, independent, revertible); T9–T10 are polish and the final no-op sweep.

---

## 11. Risks / Rollback

| Risk | Mitigation |
|---|---|
| `loadingState` breaking change | Keep derived `isLoading` alias one release; remove in v11.2 |
| TextureView reflow jank in mini transition (T7) | Cap size changes to start/end of the 280 ms animation; fallback: static poster in mini frame slot (feature flag) |
| OEM orientation locks (T8) | 1.5 s `onOrientationChanged` timeout → revert + transient pill; capability gate hides the control permanently on failing builds |
| Manifest unpin affects app-wide orientation | Player close always restores `portrait`; QA pass on Home/Library/Sheets in forced-landscape dev mode before merge |
| PiP native defects unresolved | Chip gated off until `PLAYER_FIX_TRACKER_v1.md` PiP items land |
| MoreSheet scope creep | Sections are a closed list (§4.7); new actions require a spec change |
| Rollback | Per-theme commits are revertible; capability gates (`canFullscreen`, PiP) flip features off without rebuild; pill has a feature flag falling back to the legacy overlay if T1 must be unwound |

---

## 12. References

- **V10.1 Movies spec** — [`UI_UX_Elevation_Specification_v10.1.md`](UI_UX_Elevation_Specification_v10.1.md)
- **V10.2 Podcasts spec** — [`UI_UX_Elevation_Specification_v10.2.md`](UI_UX_Elevation_Specification_v10.2.md)
- **Execution tracker** — [`VIDEO_UI_V11_TRACKER.md`](VIDEO_UI_V11_TRACKER.md) (mirrors §10 exactly: 10 themes × 3 phases = 30 phases, 10 GATEs, per-phase Error-fix + Validation + Commit)
- **Player audit (51 findings)** — [`PLAYER_AUDIT_v11_FULL_FINDINGS.md`](PLAYER_AUDIT_v11_FULL_FINDINGS.md)
- **Post-rename reanalysis** — [`PLAYER_REANALYSIS_CURRENT_STATE.md`](PLAYER_REANALYSIS_CURRENT_STATE.md)
- **Engine fix tracker** — [`PLAYER_FIX_TRACKER_v1.md`](PLAYER_FIX_TRACKER_v1.md) (owns PiP/native correctness; orthogonal to this UI wave)
- **Player source** — `src/modules/playback/video/**`
