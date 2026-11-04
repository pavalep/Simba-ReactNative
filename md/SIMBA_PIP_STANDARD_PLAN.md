# SIMBA — Picture-in-Picture: the industry-standard implementation plan

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
- **R2 — The hide happens *after* the transition begins**, inside
  `onPictureInPictureModeChanged` — not before the request. Before the request there is no
  frame to draw into (M4, M8, HWUI).
- **R3 — The action row is minimal and state-driven.** One play/pause, icon from the live
  playback state. **No precedent anywhere for three custom actions**, and no precedent for
  adding `expand`/`close` when the platform already renders its own.

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

#### The corrected root cause — the platform CROPS to `setSourceRectHint`

The plan below was rewritten on 2026-11-04 after the Android platform source was read.

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
- The picture box is portrait; the film is 16:9. mpv runs `keepaspect=yes`, so the frame is
  **letterboxed inside the box**. The video's real rect is a 16:9 strip inside that box — and
  that strip is what the source rect must name.
- **No platform API guarantees a post-entry draw** — the PiP window's first buffer is the
  pre-existing buffer, and there is no "wait for the first PiP frame" handshake anywhere in
  `Activity`/`ActivityRecord`/`ATMS`/`PipTaskOrganizer`. ⇒ v3.2.0's pre-emptive hide could
  never work.
- **But** the platform is explicit: *"In PIP, the activity is in a paused, but rendering,
  state"* — so an invalidation made **after** the transition begins **is** drawn. ⇒ a hide in
  `onPictureInPictureModeChanged(true)` does land. It is a **second line of defence**, not the
  mechanism.

⇒ **⇒ The primary mechanism is the crop. The chrome hide is the belt-and-braces.**

#### The changes

1. **The source rect becomes the VIDEO's rendered rect.** Compute the rect the video pixels
   actually occupy: the picture box's window rect fitted to the **video's aspect** with
   `contain` semantics, converted back to window coordinates. The library already knows the
   video's dimensions (`currentVideoAspect()`) and the box's rect (`MpvRenderView`'s cached
   window bounds). When the box and the video have the same aspect they coincide; in our
   portrait box with a 16:9 film they do not — and that difference is the whole bug.
2. **The params are committed EARLY, outside the entry moment**, with
   `Activity.setPictureInPictureParams(...)`, and re-committed whenever the picture's
   geometry or the playback state changes. Google's canonical sequence is explicit:
   *"Keep params current, OUTSIDE the entry moment."*
3. **Auto-enter on API 31+** — `setAutoEnterEnabled(true)`, armed **only while a video is
   loaded**, disarmed when playback stops (otherwise browsing would auto-enter PiP). With
   auto-enter enabled, **ATMS rejects** an explicit `enterPictureInPictureMode()`
   (`ATMS.java:3784-3788`), so on API 31+ the library's `notifyUserLeaveHint` becomes a
   logged no-op and the explicit entry is kept for API 24–30 only. **The consumer app's call
   site does not change** — it stays correct on every API level.
4. **The chrome hide moves into `onPictureInPictureModeChanged(true)`** and stays as the
   second line of defence. `findView` returning `null` must mean **"already hidden"**, not a
   refusal — the BUTTON path's React unmount removes the view first. The restore on exit
   stays, including when the React instance is gone.
5. **Everything that is not the picture must also leave the crop** — the crop names the
   video's rect, so the chrome, the loading/error overlays and the gesture layer are outside
   it by construction. The app-side change still moves `VerticalSwipeGestures`
   (`VideoPlayer.tsx:545`), `VideoLoadingOverlay` (`:568`) and `VideoErrorOverlay` (`:569`)
   **under the chrome root** (`:663`), so that the second line of defence is complete and one
   `GONE` provably leaves only the picture. Today a chrome-only hide leaves a **full-screen
   native gesture view mounted inside the PiP window** that swallows every tap aimed at the
   picture. The stacking is preserved — picture < gestures < overlays < chrome controls — and
   `styles.lane` / `styles.picture` / `styles.chrome` are all `absoluteFill` (`:708-719`), so
   the move is layout-equivalent.
6. **The surface is not touched.** The platform crops and scales the existing surface;
   changing the surface's bounds on top of that would double-scale the picture. A re-parent
   into `android.R.id.content` (react-native-video's and expo-video's shape) is **rejected**:
   it detaches the `SurfaceView` → `surfaceDestroyed` → `detachSurfaceLocked()` → `vo=null` →
   the mpv VO is destroyed → on re-attach the decoder is rebuilt in software.
   `MpvBridgeModule.kt:235-250` records that cost: *"~1s render gap, PiP shows black"*.
   react-native-video and expo-video can afford it because ExoPlayer's decoder is decoupled
   from its output surface; mpv's is not.
7. **No jank on the way in and out** (the user's requirement):
   - the surface is never detached, so there is no VO teardown and no black frame;
   - `setAspectRatio` comes from the **video track size** (RNV parity), so the PiP window's
     shape matches the picture and the platform's seamless resize has nothing to stretch;
   - `setSourceRectHint` is lowered from API 31+ to **API 26+** (RNV and expo both do it) so
     the entry animation starts from the picture, not from a black rectangle.

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
| **v3.3.0** | C0 + C1 | HOME → PiP window shows **video only**: no header, no scrub row, no transport row, no gesture layer; clock gone; **video playing** (crop hashes differ across 3 s); tap the picture → no swallowed tap |
| **v3.4.0** | C2 | PiP window shows **one** action row; the icon is ⏸ while playing and ▶ while paused; tapping it pauses and resumes **without a JS round trip**; the platform's expand/close still work; exiting PiP restores the chrome and the layout exactly |
| **v3.5.0** | C3 (optional) | HOME → PiP; recents → PiP; video stops → **no** PiP window; PiP → fullscreen transition is smooth |

Every release: commit → push → **annotated** tag → Actions → npm → app bumps to the exact
published version → rebuild → install → prove → commit the app.

---

## 6. What is explicitly NOT in this plan

- **No new dependency.** No `react-native-video`, no `react-native-pip-android`, no
  `expo-video`. The library already owns the engine, the surface and the session.
- **No `TextureView`.** `MpvRenderView.kt:22-30` is the repo's measured reason.
- **No React-driven PiP.** React cannot commit in PiP (freeze #1); the PiP window is a
  native concern.
- **No second chrome-hiding mechanism.** After C1 there is exactly one: the native hide in
  `onPictureInPictureModeChanged`.
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
  is carried from the earlier session's reading and is **not** re-cited here. The two shipping
  libraries' own code is the load-bearing evidence, and they disagree with our current code in
  exactly the way that matters.
- `api.github.com/search/code` requires authentication, so the set of RN libraries that hide
  chrome was established by reading the three libraries' full Android sources rather than by
  an exhaustive search.
