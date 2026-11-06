# SIMBA — Picture-in-Picture: the industry-standard implementation plan

> ## ⚠ MEASURED RESULT 2026-11-04 — the crop hypothesis is NOT confirmed
>
> lib **v3.3.0** (commit `0f6decd`, published and verified) implemented §4 C1 as written
> below and was built into the app and **run on `emulator-5554` (API 37)**.
>
> **What the device showed**
>
> - The PiP window **opens via the platform's auto-enter** — `onUserLeaveHint` no longer asks
>   for the window on API 31+, and `companion.onPictureInPictureModeChanged: isInPip=true`
>   arrives at `17:41:34.457`. ✔
> - The **video plays live inside the PiP window** — the film frame is visible and moving. ✔
> - The params **are committed early** — `companion.commitPipParams: committed the PiP params`
>   at `17:40:04`, `17:40:05`, `17:40:52`, i.e. well before the entry. ✔
> - The **chrome hide executes** — `companion.hideConsumerChrome: hid the chrome view with
>   nativeID 'simba-expanded-chrome'` at `17:41:34.459`, 2 ms after the mode change. ✔
> - **⇒ `onUserLeaveHint()` NEVER FIRED AT ALL** on the HOME press — **zero** log lines for the
>   whole process, while the PiP window opened anyway. The platform's auto-enter transitions the
>   window through the **Shell**, and the app's hooks are never consulted. ✘
> - **⇒ BUT THE PiP WINDOW STILL PAINTS THE FULL APP CHROME** — the header band, the scrub row
>   with a **frozen clock (0:36)**, the ±10 buttons, the big pause button and the volume row,
>   all scaled down. ✘
>
> **What that proves, and what it retracts**
>
> 1. **The source-rect crop did NOT keep the chrome out.** The platform applied the PiP
>    window's *aspect ratio* (the window is 16:9, matching the video) but did **not** crop the
>    app's content to the source rect. `setSourceRectHint` is a **transition** hint — it is
>    what the PiP window animates *from* — not a content crop. **Every sentence in this
>    document, in the lib's `PipManager.kt` / `MpvBridgeModule.kt` docblocks and in the lib's
>    CHANGELOG/README that said "the platform crops the app's window to the source rect …
>    which keeps the chrome out" was a FALSE CLAIM.** It is **retracted in lib v3.3.1** — in
>    the README, in the CHANGELOG (as a `Retracted` section, and as an in-place note inside the
>    3.3.0 section), and in every docblock that asserted it.
> 2. **The PiP window shows the app window's last rendered frame, frozen.** The clock reads
>    `0:36` while the video had been playing for ~94 s — the app's UI layer is not redrawing,
>    and it does not redraw after the pause. So the chrome that is in the PiP window is the
>    chrome that was on screen when the app last drew.
> 3. **⇒ A chrome hide at or after the transition can never remove the chrome from the PiP
>    window.** The BUTTON path works because React unmounts the chrome **while the app is
>    still foregrounded**, a frame is drawn, and the OS is asked afterwards. The HOME path has
>    no such frame.
> 4. **⇒ The platform's auto-enter bypasses every app hook.** With the auto-enter switch
>    armed, the transition runs through the **Shell** — `Activity.onUserLeaveHint()` is never
>    called (AOSP: the framework sends the legacy callback only when
>    `onPictureInPictureRequested()` returns `false`), and ATMS refuses an explicit entry
>    while the switch is enabled (*"auto-enter should take in place instead"*). So on API 31+
>    the library's own native entry was **dead code**, and the app's chrome was painted into
>    the PiP window.
>
> **⇒ The answer, and what shipped**
>
> The PiP window is the Activity's own window, so for the chrome not to be in it, the app's UI
> layer must contain only the video **at the moment the window is captured**. Of the three
> options this plan weighed:
>
> - **(S1) The chrome must be gone from the app's last drawn frame.** ✔ **This is what shipped.**
>   But not from `onUserLeaveHint()`: on API 31+ that hook is **never called** when the
>   auto-enter switch is armed. The entry now runs from **`Activity.onPictureInPictureRequested()`**
>   — AOSP's own PiP entry hook — which is called while the Activity is still **RESUMED**. That
>   is the only moment `enterPictureInPictureMode()` is legal at all (`Activity.enterPictureInPictureMode`
>   throws `IllegalStateException` unless the Activity is resumed), and the moment the app is
>   still drawing, so the chrome-less window is presented before the platform transitions it.
> - **(S2) The PiP host must contain only the video** (re-parent the player into
>   `android.R.id.content` and `GONE` every sibling — react-native-video's and expo-video's
>   shape). **Not needed**, and deliberately not done: the chrome root is a **separate view**
>   from the picture, so hiding it makes the window video-only on its own. A re-parent would
>   detach the `SurfaceView` → `surfaceDestroyed` → mpv VO teardown → the decoder rebuilt in
>   software (`MpvBridgeModule.kt:235-250`) — mpv's decoder is not decoupled from its output
>   surface the way ExoPlayer's is. No measured benefit, real cost.
> - **(S3) A dedicated PiP Activity** that hosts only the video. The heaviest change, and it
>   would undo D1 (one Activity / one React root).
>
> **lib v3.3.1 (commit `1d96941`) ships exactly this:**
>
> - the platform's auto-enter switch is **not armed** — the app owns the entry;
> - the entry runs from `Activity.onPictureInPictureRequested()` (API 31+) and from
>   `onUserLeaveHint()` (API 24-30) — the **same** library call serves both, so there is one
>   entry and one owner;
> - the chrome is hidden **in the entry, BEFORE the window is asked for**;
> - and the **PiP play/pause button works**: it read mpv's `playback-state`, a property mpv
>   does **not** have, so the answer was always "not playing" and the button always called
>   PLAY on an already-playing video. The same broken read was in three other places; all four
>   now go through **one** owner, `PlaybackState`, which reads mpv's real properties.
>
> **v3.3.1 ships the MECHANISM; the 2026-11-05 measurement says the OUTCOME did not
> follow.** The HOME path opens the window and the video plays live in it — but the
> window still carries the app's full expanded chrome. The native hide ran
> **291 ms before** the entry and the chrome was still in the window, so "hide it
> before the window is asked for" is **not** sufficient: the hide has to reach the
> PIXELS. **B-050 is REOPENED** — see §5 and the bug tracker. The play/pause half of
> this release **is** proven on the device (§5).
>
> ---
>
> **Status:** plan approved by evidence, 2026-11-04. Replaces the ad-hoc PiP work of
> 2026-11-03 (lib v3.1.0 controls fix, lib v3.2.0 native HOME entry).
>
> **Sources of truth:** `md/SIMBA_BUG_TRACKER_2026_10_21.md` (B-049 … B-053),
> `md/SIMBA_V22_MASTER_PLAN.md` (D-10, D-12).
>
> **Repos:** app `MOBILE_APP_REACT_NATIVE` · lib `react-native-media-player`
> (published as `@simba-dev/react-native-media-player`).

---

## 0. Why this document exists

The 2026-11-03 PiP work fixed the *controls* (lib v3.1.0, device-proven) and then tried to
fix the *chrome* with a home-grown mechanism (lib v3.2.0). The chrome fix **did not work on
the device**: the PiP window still paints the app's expanded chrome. Each attempt added a
mechanism that no shipping React Native app uses.

This document replaces that with the mechanism **two shipping RN video libraries actually
implement**, read from source, with the citations inline.

---

## 1. The measured facts (device, emulator-5554, API 37, 2026-11-03)

| # | Fact | Where it was measured |
|---|---|---|
| M1 | The **BUTTON path** enters PiP correctly: the window shows the video only, and the action row's play/pause is delivered, pauses and resumes playback. | `dumpsys activity broadcasts` → `PIP_PLAY_PAUSE` record with `dispatchTime`, `caller=… realCallingUid=10188` (SystemUI); PiP-region crop SHA-256 differing / matching / differing across taps |
| M2 | The **HOME path** opens a PiP window, but the window shows the app's **full expanded chrome** — header band, scrub row with a **frozen clock**, ±10 buttons, the big pause button, the volume row. | `63-crop.png`; `dumpsys window windows` shows the PiP window |
| M3 | Forcing a full re-layout (`wm size 1080x2200` → `wm size reset`) does **not** remove the chrome, and the clock stays frozen. | `63-crop.png` after the probe |
| M4 | The native chrome hide **does execute** on the HOME path, in the right order, ~40 ms before the OS is asked for the window. | logcat `22:38:19.518 hid the chrome view with nativeID 'simba-expanded-chrome'` → `22:38:19.557 entered PiP` |
| M5 | The PiP window carries **two** action rows: the platform's own (settings/expand/close) **and** ours (play/zoom/close), at different centroids. | device centroids `(505,1589)/(739,1675)/(975,1589)` vs `(589,1799)/(736,1764)/(884,1764)` |
| M6 | The PiP play/pause button always shows `ic_media_play` — ▶ while the video is **playing**. | `PipManager.kt:100` hardcodes the drawable; the params are built once, at entry |
| M7 | The video surface is **not** destroyed/recreated on PiP entry. | `MpvRenderView.kt:510` identity guard; `onDropViewInstance` is the only teardown path |
| M8 | The **video is a `SurfaceView`** at default z-order, so it keeps compositing while the app window's UI layer is frozen. | `MpvRenderView.kt:62`; `MpvRenderView.kt:22-30` (the repo's own measured reason TextureView was rejected) |

**M2 + M3 + M4 together are the whole defect:** the hide runs, and the pixels do not change.

---

## 2. The correction: what actually stops in React Native 0.86

Our comments (app `usePipEntry.ts:12-21`, `:45-53`; lib `PipManager.kt:163-171`) say
*"RN pauses the React scheduler with the Activity"*. **That is not what RN does.** RN 0.86
has **two independent freezes**, and both matter:

1. **Fabric stops applying mount items.**
   `FabricUIManager.onHostPause()` removes the `DISPATCH_UI` frame callback
   (`fabric/FabricUIManager.java:1250-1253`, `:1567-1574`), and mount items are applied only
   from `doFrameGuarded` (`:1617-1624`). React still *renders*; the results never reach the
   native view tree.
2. **The JS timer manager freezes, so `requestAnimationFrame` never fires.**
   `JavaTimerManager.onHostPause()` sets `isPaused` (`modules/core/JavaTimerManager.kt:72-76`)
   and `doFrame` returns early while paused (`:290-293`). `requestAnimationFrame` is a
   zero-delay timer on the same registry (`ReactCommon/react/runtime/TimerManager.cpp:360-367`).

**Consequence for the HOME path:** a React-driven chrome removal can never land, and a
frame-gated entry can never fire. That is why the JS-driven HOME attempt produced **no PiP
window at all** on 2026-11-03 (the effect ran 5.7 s late; the rAF never fired).

**But it does not explain M2.** The native `visibility = GONE` is not a React commit, and it
still did not reach the pixels. Two facts explain that, and both are in our own code:

- **`MpvRenderView.kt:22-30`** — *"When the Activity pauses for PiP, HWUI suspends draw
  passes for paused activities"*. The app window's UI layer stops producing frames, so a
  tree mutation made at that moment has nothing to draw it into.
- The PiP window therefore keeps **the last frame the app window ever drew** — the
  full-screen expanded chrome, with the clock frozen at the moment of the last React commit
  (M2, M3).

⇒ **The chrome must be gone from the frame that is already on screen, or the platform must
be forced to produce a new one.** The shipping libraries solve it by doing the hide **inside
`onPictureInPictureModeChanged`** — i.e. *after* the OS has begun the transition and *before*
the platform's resize draw — and by making the platform lay the video out itself.

---

## 3. The standard: what two shipping RN video libraries do

Read from source at pinned versions. Full citations in §7.

### 3.1 react-native-video v6.19.3 (`com/brentvatne/...`)

| Concern | What it does |
|---|---|
| Entry | `Activity.enterPictureInPictureMode(params)`; on API 24–30 via an `onUserLeaveHint` listener, on **API 31+ via the platform's `setAutoEnterEnabled(true)`** (`PictureInPictureUtil.kt:52-62`, `:105-110`) |
| Params | `setAspectRatio` from the **video track size**, clamped to `[100/239, 239/100]` (`PictureInPictureUtil.kt:155-169`); `setSourceRectHint` from the player's on-screen rect (`:112-117`) |
| **Chrome** | **On the PiP-mode-changed callback** it re-parents the player view into `android.R.id.content` with `MATCH_PARENT` and sets **every other child of the content root to `GONE`**, remembering the original visibilities; on exit it restores them (`ReactExoplayerView.java:2561-2601`, `:2616-2634`) |
| Controls | **One** `RemoteAction` (play/pause) whose icon is **derived from the live state** (`exo_icon_play` when paused, `exo_icon_pause` when playing) (`PictureInPictureUtil.kt:129-138`); delivered by a runtime `BroadcastReceiver` registered `RECEIVER_NOT_EXPORTED` with `intent.setPackage(...)` (`PictureInPictureReceiver.kt:13-44`) |
| PiP state to JS | A component event, `onPictureInPictureStatusChanged` (`VideoEventEmitter.kt:46`, `:94`) |

### 3.2 expo-video 58.0.13 (`expo/modules/video`)

| Concern | What it does |
|---|---|
| Entry | `Activity.setPictureInPictureParams(...)` (sticky params) + `enterPictureInPictureMode()`; auto-enter via the **platform switch** on API 31+ (`PictureInPictureUtils.kt:79-106`) |
| **Chrome** | **The same technique as react-native-video**: re-parent the player into `android.R.id.content` as `MATCH_PARENT`, `GONE` every sibling (`PictureInPictureManager.kt:262-281`); restore on exit (`:283-299`). Additionally it turns the **native controller off at app-background** — *"the earliest place where we can hide the player controls so that they interfere as little as possible with the smoothness of the transition"* (`PictureInPictureManager.kt:172-197`) |
| Controls | **No `RemoteAction`s at all** — the native `PlayerView` controller only |

### 3.3 The three rules that fall out of the evidence

- **R1 — The PiP window's content is composed by the platform, not by React.** Both libraries
  hide the chrome with a **raw View-system mutation on `android.R.id.content`'s children**,
  never with a React commit, and never with a `nativeID` lookup.

  **Our implementation deliberately diverges, and the divergence is measured.** Both libraries
  **re-parent** the player into `android.R.id.content` and `GONE` every sibling. We do not,
  because **the chrome root is a separate view from the picture** — hiding it is enough, and a
  re-parent would detach the `SurfaceView` → `surfaceDestroyed` → mpv VO teardown → the decoder
  rebuilt in software (`MpvBridgeModule.kt:235-250`). mpv's decoder is not decoupled from its
  output surface the way ExoPlayer's is, so the two libraries can afford the re-parent and we
  cannot. What carries over from R1 is the part that matters: **the hide is a View-system
  mutation, not a React commit.**
- **R2 — The hide happens while the app is still drawing, BEFORE the transition.** ✔

  **This rule was written wrong, and the device proved it.** It used to read: *"The hide happens
  **after** the transition begins, inside `onPictureInPictureModeChanged` — not before the
  request. Before the request there is no frame to draw into (M4, M8, HWUI)."* That second
  sentence is **false**. The **BUTTON** path draws the chrome-less frame **before** the request
  and the PiP window is clean; the **HOME** path draws it in
  `Activity.onPictureInPictureRequested()`, where the Activity is still **RESUMED**.

  What survives is the narrower and more useful statement: **a hide applied at or after the
  transition cannot reach the PiP window's pixels**, because the platform has already frozen
  the window and the PiP window shows the app's **last drawn frame**. Measured on emulator-5554
  (API 37) on 2026-11-04: the hide from `onPictureInPictureModeChanged(true)` executed 2 ms
  after the mode change, and the PiP window still painted the full chrome, scaled down.
- **R3 — The action row is minimal and state-driven.** One play/pause, icon from the live
  playback state. **No precedent anywhere for three custom actions**, and no precedent for
  adding `expand`/`close` when the platform already renders its own.

  **The "state-driven" half of R3 was not true until lib v3.3.1.** The icon and the action
  read mpv's `playback-state`, a property mpv does **not** have, so every read answered "not
  playing": the icon was always the Play triangle, and the action always called **play**. Both
  now go through `PlaybackState`, which reads mpv's **real** properties (`idle-active`,
  `eof-reached`, `pause`).

---

## 4. The design

Four changes. Each is a separate lib release with its own device proof, so a regression is
bisectable and revertible.

### C0 — Correct the false claims (no behaviour change)

- App + lib: replace *"RN pauses the React scheduler"* with the two real freezes (§2).
- Lib: the **v3.2.0 CHANGELOG and README** claim that the library fixes the chrome in the PiP
  window. **That claim is false** — v3.2.0 made the window *open*; the chrome is still painted.
  It must be retracted in v3.3.0.
- Tracker: B-050 stays **OPEN** until the device proof lands.

### C1 — The PiP window shows the video and nothing else  *(lib v3.3.0 + app)*

**Owner:** the library, natively. The app supplies the chrome's identity; nothing else.

#### The hypothesis this section used to make — and why the device killed it

**The text that was here is kept below as the historical record. It is WRONG.**

The hypothesis was:

- The PiP window's content is the app's surface **cropped to
  `PictureInPictureParams.setSourceRectHint(...)`'s rect** and scaled into the window.
  `setSourceRectHint` is the platform's own mechanism for *"only the video should appear in
  PiP"*; Google's `androidx.core-pip` library (`VideoPlaybackPictureInPicture`) uses nothing
  else — it tracks the player view's bounds continuously (`ViewBoundsTracker`) and feeds them
  as the source rect. **It never asks the app to hide chrome.**
- ⇒ **Our `pipSourceRectInWindow()` returns the picture BOX's window rect.** In the expanded
  state the picture box is `StyleSheet.absoluteFill` of the lane — **the whole screen**. So the
  platform crops to the whole screen, and the chrome (drawn over that same area) comes along.
  **That is why the chrome is in the PiP window.**
- **⇒ ⇒ The primary mechanism is the crop. The chrome hide is the belt-and-braces.**

**The device disproved all of it** (emulator-5554, API 37, 2026-11-04, lib v3.3.0). The PiP
window showed the app's **full** chrome, scaled down — header band, scrub row with a frozen
clock, ±10 buttons, the big pause button, the volume row — **with the source rect committed**.
The platform applied the PiP window's *aspect ratio* and did **not** crop the app's content.

`setSourceRectHint` is a **TRANSITION hint**: it tells the platform which region of the window
the PiP window should animate **from**. It does not crop anything. Google's `androidx.core-pip`
and react-native-video both use it, and **neither** of them relies on it to keep chrome out —
they hide the chrome themselves. Reading their use of the hint as a crop was the mistake.

#### The measured root cause

Two facts, both measured on emulator-5554 (API 37) on 2026-11-04:

1. **The platform's auto-enter bypasses every app hook.** With the auto-enter switch armed, the
   transition runs through the **Shell**. `Activity.onUserLeaveHint()` **did not fire at all**
   on a HOME press — **zero** log lines for the whole process, while the PiP window opened
   anyway. So the library's own native entry never ran, and the app's chrome was still mounted
   when the window was captured. (AOSP: the framework sends the legacy `onUserLeaveHint()`
   callback only when `onPictureInPictureRequested()` returns `false`; and `ATMS` refuses an
   explicit entry while auto-enter is enabled — *"auto-enter should take in place instead"*.)
2. **The PiP window shows the app window's last drawn frame, frozen.** The clock read `0:36`
   while the video had been playing for ~94 s. A hide applied at or after the transition cannot
   reach those pixels.

⇒ **⇒ The primary mechanism is the ORDER: the chrome must be gone from the frame the platform
captures. The crop was never a mechanism.**

#### The changes that shipped (lib v3.3.1)

1. **The platform's auto-enter switch is NOT armed.** `autoEnter` stays a **consumer policy**,
   checked by the library before it enters — never a platform switch. With the switch armed
   there is no pre-transition hook to use.
2. **The entry runs from `Activity.onPictureInPictureRequested()`** (API 31+) and from
   `onUserLeaveHint()` (API 24-30) — the **same** library call serves both, so there is one
   entry and one owner. AOSP's own hook is called while the Activity is still **RESUMED**,
   which is the only moment `enterPictureInPictureMode()` is legal at all.
3. **The chrome is hidden IN THE ENTRY, BEFORE the window is asked for.** Not in
   `onPictureInPictureModeChanged(true)` — that is after the platform has already frozen the
   window. `findView` returning `null` means **"already hidden"**, not a refusal — the BUTTON
   path's React unmount removes the view first. The restore on exit stays, including when the
   React instance is gone.
4. **The entry is explicit on every API level.** The API-31+ early-return branch is gone.
5. **Everything that is not the picture is under the chrome root** — `VerticalSwipeGestures`
   (`VideoPlayer.tsx:545`), `VideoLoadingOverlay` (`:568`) and `VideoErrorOverlay` (`:569`)
   sit under it (`:663`), so one `GONE` provably leaves only the picture. The stacking is
   preserved — picture < gestures < overlays < chrome controls — and `styles.lane` /
   `styles.picture` / `styles.chrome` are all `absoluteFill` (`:708-719`), so the move is
   layout-equivalent.
6. **The surface is not touched.** No re-parent, no VO teardown, no software-decoder
   fallback. (react-native-video and expo-video re-parent because they have **no separate
   chrome view** to hide; we do, and re-parenting would detach the `SurfaceView` →
   `surfaceDestroyed` → `detachSurfaceLocked()` → `vo=null` → the mpv VO is destroyed → on
   re-attach the decoder is rebuilt in software. `MpvBridgeModule.kt:235-250` records that
   cost: *"~1s render gap, PiP shows black"*. ExoPlayer's decoder is decoupled from its output
   surface; mpv's is not.)
7. **The source rect stays as a TRANSITION hint** and is still committed early, outside the
   entry moment, so the entry animation starts from the picture rather than from a black
   rectangle. It is **not** a crop, and nothing depends on it being one.
8. **One owner for the playback state.** The PiP action, the action's icon, the library's
   media check and the consumer app's media check all read mpv's state through
   `PlaybackState` — mpv's **real** properties (`idle-active`, `eof-reached`, `pause`). They
   used to read `playback-state`, which mpv does **not** have, so every answer was wrong in the
   same direction.

### C2 — The action row is the platform's, minimal, and state-driven  *(lib v3.4.0)*

- **Start `MediaPlaybackService` on the video path**, so the `MediaSessionCompat` the library
  already owns is live while a video plays. It already has the right callbacks
  (`onPlay`/`onPause`/`onStop`/`onSeekTo` → mpv, `MediaPlaybackService.kt:417-452`) and
  publishes the real state (`:549-570`). Today it is started **only** by the audio path
  (`MpvBridgeModule.startAudioPlayback` → `:2510`).
- Hand the session to the platform via `PictureInPictureParams.Builder.setMediaSession(...)`
  so the platform builds the row from the session: **state-driven icon** (fixes **B-052**),
  **native delivery with no JS in the loop** (fixes the whole "controls are inert" class),
  and **one row** (fixes **B-053**).
- **Drop `setActions(...)`** (`PipManager.kt:94-130`). The platform's own expand / close /
  settings are the "essential minimal controls"; our custom expand and close duplicated them
  (M5).
- The bespoke broadcast receiver (`PipManager.kt:335-390`) and the `onPipPlayPause` /
  `onPipExpand` / `onPipClose` JS events are then **unused** and are removed — one owner for
  the PiP controls.
- The app's `usePipBridge` PiP-action handlers are removed with them.

### C3 — The entry: the platform's auto-enter  *(lib v3.5.0 — optional, decided after C1/C2)*

- RNV and expo both delegate auto-enter to the platform on API 31+ (`setAutoEnterEnabled`),
  armed by the **playback state** so browsing never auto-enters PiP. Our bespoke
  `MainActivity.onUserLeaveHint` → `MpvBridgeModule.notifyUserLeaveHint(activity)` bridge
  would then be **removed from both repos**, along with `PipNativeEntry.kt`.
- **Deferred**, because C1/C2 fix the reported defects without it, and each release should be
  small and bisectable. It is listed here so the plan is complete, not so it is rushed.

---

## 5. Sequencing and releases

| Release | Contents | Device proof (emulator-5554, API 37) |
|---|---|---|
| **v3.3.0** | C0 + C1 | **THE PROOF FAILED.** HOME → a PiP window opened and the video played in it, but the window showed the app's **full expanded chrome**, scaled down: the header band, the scrub row with a **frozen clock**, the ±10 buttons, the big pause button, the volume row. The crop was not happening. ✘ |
| **v3.3.1** | the retraction · the app owns the entry · one owner for the playback state | **MEASURED 2026-11-05** (emulator-5554, API 37, the app on **npm 3.3.2** — v3.3.2 changed comments and tests only, so this is v3.3.1's behaviour). What the proof had to show, and what actually happened: HOME → the PiP window opens and the **video plays live** in it ✔ — but the window **still carries the app's full expanded chrome**, scaled down: the header band, the ±10 buttons, the big pause button, the scrub row ✘. The native hide ran **291 ms BEFORE** the entry (`34.002 hide` → `34.293 entered PiP`) and the chrome was still in the window, so *"hide the chrome before the window is asked for"* is **not** sufficient. The PiP **play/pause action pauses and resumes** the video ✔ (the receiver logged `play/pause: played` → `paused` → `played` → `paused`) and the action's **icon follows the live state** ✔ (the ⏸ pause glyph while playing, the ▶ play glyph while paused). The **BUTTON path** was proven clean on 2026-11-04 (video only) and was **not re-measured** on 2026-11-05. **No jank: still OWED** — the frame stats from that run are polluted by a concurrent Gradle build and cannot be used as a measurement. **⇒ B-050 is REOPENED.** |
| **v3.3.2** | the retraction, **completed**: the source and the TypeScript API docs no longer assert the crop, and the two other stale PiP claims are corrected too | **Nothing behavioural.** 3.3.2 changes comments and adds tests only — the device proof for v3.3.1 covers the behaviour. It exists because a retraction that leaves the wrong claim standing in the source is not a retraction: v3.3.1 fixed the README and the CHANGELOG, and **four places in the source still asserted the crop**, plus two docblocks that contradicted the code. Three prose guards now pin the three PiP facts. |
| **v3.3.3** | the "the hide has to be DRAWN" mechanism — the entry gated on a `ViewTreeObserver.OnDrawListener` | **THE ENTRY BROKE.** Measured on emulator-5554 (API 37) on 2026-11-05, and again on 2026-11-06: the OS ask was deferred to the window's next draw, it landed **1.8 s** after the platform's request, the Activity had been paused by then, and the OS **refused** the entry — `dumpsys` reported `mLastReportedPictureInPictureMode=false`, so pressing HOME opened **no PiP window at all**. The release also stated the mechanism's cause ("the hide never reached the pixels") as a measured fact when it rested on one measurement that could not separate a stale frame from a draw that had not been scheduled yet. **⇒ v3.3.4 withdraws the claim and removes the mechanism.** |
| **v3.3.4** | the **synchronous** ask, restored — inside `onPictureInPictureRequested()`, in that tick, on every API level — and the 3.3.3 claim retracted in the same release | **MEASURED 2026-11-06** (emulator-5554, API 37, the app on **npm 3.3.4**): the platform asked at `16:39:03.238`, the chrome was hidden at `16:39:03.273` (`visibility=8`), the library reported **`entered PiP` at `16:39:03.307`** — **69 ms** after the request — and `dumpsys` reported `mLastReportedPictureInPictureMode=true`. **⇒ the P0 is FIXED: the HOME path opens a PiP window again.** The **chrome is still in the window** ✘, and the entry is **FLAKY (2 of 5 presses)** ✘. |
| **v3.3.5** | the entry path's **latency**: the engine's state is read **ONCE**, the params are built **ONCE**, and the separate `setPictureInPictureParams` round trip is gone (`enterPictureInPictureMode(params)` carries them) | **MEASURED 2026-11-06** (the same device, the npm 3.3.4 build, N=5 HOME presses with the video playing): **presses 2 and 4 opened a window; presses 1, 3 and 5 were REFUSED.** The log splits the path — `16:43:59.432 hide` → `16:43:59.805 commitPipParams` (**373 ms**) → `16:44:01.003 the OS refused` (**1.2 s** later) — because the path read the engine's state **FOUR times** (each read is three mpv properties over JNI, each blocking until mpv's core thread answers) and made **two** binder round trips. **⇒ twelve blocking reads become three, two builds become one, two round trips become one.** The state is still read LIVE at the entry — the play/pause icon is not a cached flag. **The fix was then measured on its own build — see the next row.** |
| **v3.3.5** *(device proof)* | the latency fix, proved on the **npm 3.3.5** build | **MEASURED 2026-11-06** (emulator-5554, API 37, the app on **npm 3.3.5**), N=5 HOME presses with the media loaded and the video PLAYING — the pre-press screenshots confirm the chrome was drawn and the video running at the moment of every press: **all 5 of 5 presses opened a PiP window** (`mLastReportedPictureInPictureMode=true` every time; v3.3.4 gave 2 of 5). The entry latency, from the platform's request to `entered PiP`: **100 ms, 21 ms, 34 ms, 42 ms, 7 ms** — against v3.3.4's 136/182 ms for the successes and 832-1570 ms for the refusals. **⇒ the path to the ask now fits inside the RESUMED window every time** (the second clause of the entry contract, **D-10**). The **paused** case opens too (11 ms) — on v3.3.4 it was REFUSED, so **that refusal was a LATENCY symptom, not a policy**. The **chrome is still in the window** ✘ in every capture. |
| — | **a REFUSED entry leaves the app with NO controls** (measured 2026-11-06) | With the platform appop `PICTURE_IN_PICTURE` denied, the OS refuses the entry 16 ms after the hide — and **`restoreConsumerChrome` never runs**, because it is called from exactly one place (`onPictureInPictureModeChanged(false)`) and a refusal never produces a mode change. The app comes back with the **whole chrome gone** (no header, no scrub row, no transport row), tapping the video does not bring it back, and **the only recovery is to kill the app**. **⇒ B-054, P1, OPEN.** |
| — | **the NO-JANK goal, attempted 2026-11-06** | Measured with `dumpsys gfxinfo com.simba.player` on an idle host, with a **baseline** of the app idle in the fullscreen player for the same 5 s window: baseline **12 frames, 12 janky (100 %), p50 29 ms**; PiP entry **7 frames, 85.71 % janky, p50 109 ms**; PiP exit **17 frames, 88.24 % janky, p50 23 ms**. **⇒ the metric is saturated before any transition happens** — the idle baseline is already 100 % janky, and the samples are 7-17 frames because the app's UI is static (the video is a separate SurfaceFlinger layer and is not counted in the app's own frame stats). **The goal stays UNPROVEN** and this emulator cannot prove it; it needs a real device. Raw numbers: `X:/Development/SIMBA/.scratch-pip-v335-jank2.log`. |
| — | **the chrome's cause, measured on 2026-11-06** | The PiP window's **video layer is LIVE** (the frame advanced between two captures two minutes apart) while its **UI layer is a FROZEN SNAPSHOT** (the scrub row still read `0:44 / 5:09` in both). The draw counter did **not** move between the hide and the entry (`6863 → 6863`): **the hide and the entry run in the SAME main-thread message**, and a traversal can only run *between* messages — so **the chrome-less frame is never drawn**, and the paused app never draws again. **⇒ the remaining fix is one sentence: the chrome-less frame has to be DRAWN before the window is asked for — one main-thread message between the hide and the ask, with the ask still inside the RESUMED window.** **NOT FIXED.** **⇒ B-050 stays REOPENED.** |
Every release: commit → push → **annotated** tag → Actions → npm → app bumps to the exact
published version → rebuild → install → prove → commit the app.

---

## 6. What is explicitly NOT in this plan

- **No new dependency.** No `react-native-video`, no `react-native-pip-android`, no
  `expo-video`. The library already owns the engine, the surface and the session.
- **No `TextureView`.** `MpvRenderView.kt:22-30` is the repo's measured reason.
- **No React-driven PiP.** React cannot commit in PiP (freeze #1); the PiP window is a
  native concern.
- **No second chrome-hiding mechanism.** After C1 there is exactly one: the native hide in the
  **entry**, before the window is asked for. The hide in `onPictureInPictureModeChanged` was the
  second one, it could never reach the PiP window's pixels, and it is gone.
- **No re-parenting of the `SurfaceView`** unless (a) measurably fails to fill the window.

---

## 7. Citations

**Shipping implementations (pinned versions)**

- react-native-video `v6.19.3` — npm `react-native-video@6.19.3`, gitHead `TheWidlarzGroup/react-native-video`
  - `android/src/main/java/com/brentvatne/exoplayer/PictureInPictureUtil.kt` — `:52-62` (entry), `:73-90` (`enterPictureInPictureMode`), `:105-110` (`setAutoEnterEnabled`), `:112-117` (`setSourceRectHint`), `:129-138` (state-driven action), `:155-169` (aspect clamp), `:171-212` (pre-flight guards)
  - `android/src/main/java/com/brentvatne/exoplayer/ReactExoplayerView.java` — `:388-398` (`onHostPause` + PiP), `:2561-2601` (chrome hide/restore), `:2603-2614` (entry), `:2616-2634` (exit)
  - `android/src/main/java/com/brentvatne/receiver/PictureInPictureReceiver.kt` — `:13-44`
  - `android/src/main/java/com/brentvatne/common/react/VideoEventEmitter.kt` — `:46`, `:94`
- expo-video `58.0.13` (`expo/expo` @ `sdk-58`)
  - `packages/expo-video/android/src/main/java/expo/modules/video/managers/PictureInPictureManager.kt` — `:87-99` (entry), `:172-197` (pre-hide at background), `:262-281` (chrome hide), `:283-299` (restore)
  - `packages/expo-video/android/src/main/java/expo/modules/video/utils/PictureInPictureUtils.kt` — `:60-64`, `:79-106`
  - `packages/expo-video/android/src/main/java/expo/modules/video/utils/PictureInPictureHelperFragment.kt`
- react-native-pip-android `1.0.1` — **negative control**: aspect ratio only, no chrome
  handling, no controls, no restore (`PipAndroidModule.java:16-65`).

**AOSP (read from source, `android.googlesource.com` @ `android-16` / API 36, 2026-11-04)**

- `frameworks/base/core/java/android/app/Activity.java`
  - `:3235-3252` — the `onPictureInPictureRequested()` contract: *"true if the activity received
    this callback regardless of if it acts on it or not. If false, the framework will assume the
    app hasn't been updated… and will in turn send a legacy callback of `onUserLeaveHint()`."*
  - `:~9310` — `performUserLeaving()` calls `onUserLeaveHint()` **right before `onPause`**
  - `enterPictureInPictureMode(params)` — throws `IllegalStateException` unless the Activity is
    **resumed** (`mCanEnterPictureInPicture`)
- `frameworks/base/services/core/java/com/android/server/wm/ATMS.java`
  - `:3780-3788` — `enterPictureInPictureMode` refuses a client entry only when
    `fromClient && r.isState(PAUSING) && params.isAutoEnterEnabled()`
  - `prepareAutoEnterPictureAndPictureMode` — driven by the **Shell**, so the app's hooks are
    never consulted under auto-enter
- `frameworks/base/core/java/android/app/ActivityThread.java`
  - `:4675-4688` — `handlePictureInPictureRequested(r)`: when the app returns `true`, the
    framework does **not** run `schedulePauseWithUserLeaveHintAndReturnToCurrentState`

**mpv (read from source, `mpv-player/mpv`, 2026-11-04)**

- `player/command.c` — `"playback-state"` appears **ZERO** times; `"idle-active"`, `"eof-reached"`,
  `"pause"` and `"playback-time"` all appear
- `DOCS/man/mpv.rst`, `DOCS/man/options.rst` — neither manual documents a `playback-state`

**React Native 0.86.0 (on disk)**

- `ReactAndroid/src/main/java/com/facebook/react/fabric/FabricUIManager.java` — `:1240-1253`, `:1567-1574`, `:1617-1624`
- `ReactAndroid/src/main/java/com/facebook/react/modules/core/JavaTimerManager.kt` — `:72-89`, `:285-293`
- `ReactCommon/react/runtime/TimerManager.cpp` — `:360-367`
- `ReactAndroid/src/main/java/com/facebook/react/uimanager/util/ReactFindViewUtil.kt` — `:47-63`, `:125-128`
- `ReactAndroid/src/main/java/com/facebook/react/views/view/BaseViewManager.java` — `:311` (`nativeID` → `R.id.view_tag_native_id`)

**This repo**

- lib `android/src/main/java/com/simba/player/mpv/MpvRenderView.kt` — `:22-30`, `:47-50`, `:62`, `:181-215`, `:254-292`, `:406-428`, `:489-534`
- lib `android/src/main/java/com/simba/player/mpv/MpvBridgeModule.kt` — `:221-261`, `:313-393`, `:412-478`, `:486-495`, `:235-250`
- lib `android/src/main/java/com/simba/player/PipManager.kt` — `:52-58`, `:76-204`, `:208-258`, `:295-307`, `:335-390`
- lib `android/src/main/java/com/simba/player/MediaPlaybackService.kt` — `:417-482`, `:549-570`
- app `src/components/player/video/VideoPlayer/VideoPlayer.tsx` — `:508`, `:545`, `:568-569`, `:573`, `:585`, `:663-666`
- app `android/app/src/main/AndroidManifest.xml` — `:67-90`

**Known gaps in the evidence**

- The Android developer docs page for Picture-in-Picture could not be retrieved (both fetch
  attempts returned only page chrome), so *"an Activity in PiP is paused but still rendering"*
  is carried from the earlier session's reading and is **not** re-cited here. **This gap is
  narrowed, not closed**: AOSP's own source is now cited above for every fact the fix depends
  on (`onPictureInPictureRequested`, `performUserLeaving`, `enterPictureInPictureMode`, ATMS's
  auto-enter refusal) — but the developer-docs sentence itself is still uncited.
- `api.github.com/search/code` requires authentication, so the set of RN libraries that hide
  chrome was established by reading the three libraries' full Android sources rather than by
  an exhaustive search.
- **The API 24-30 path has never been measured on a device.** The library's entry runs from
  `onUserLeaveHint()` there, and "the Activity is still resumed" comes from AOSP
  (`performUserLeaving()` calls it right before `onPause`) — but the emulator runs API 37, so
  the API 24-30 path is unproven on hardware.
- `api.github.com/search/code` requires authentication, so the set of RN libraries that hide
  chrome was established by reading the three libraries' full Android sources rather than by
  an exhaustive search.
