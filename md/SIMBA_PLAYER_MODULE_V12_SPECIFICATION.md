# SIMBA Player Module — V12 Specification & Tracker

**Document Version:** 1.0
**Date Created:** 2026-09-01
**Target Release:** V12.0.0
**Codename:** `simba-player` (NPM package)
**Status:** Planning / Phase 0 — Architecture validation in progress
**Owners:** Mobile team
**Replaces:** V11 inline RN player architecture (deprecated after V12 cutover)

---

## 0. Purpose

V12 extracts the SIMBA video/audio player from being an in-app React Native
component into a **standalone, reusable NPM package** (`simba-player`) that
any React Native app can consume. The package owns:

- The native mpv-backed playback engine (libmpv + JNI bridge)
- The `SurfaceView`-based renderer (mpvKt/heritage mpv-android pattern)
- The Picture-in-Picture lifecycle
- The `MediaSession` integration
- The foreground media-playback service
- A clean, customizable TypeScript API surface (hooks + components)

Consumers bring their own UI via a `renderControls` prop or a
`usePlayer()` hook. The default UI is provided for zero-config usage.

### V11 → V12 migration goals

1. **Fix the Picture-in-Picture black-screen bug** that has plagued V11
   (SurfaceView nested inside React Native's view tree, opaque shell
   background covering the surface during PiP re-layout).
2. **Unify audio + video** on the same player engine (libmpv). V11 has
   two separate RN components (`VideoHost`, `AudioModule`) that share
   the same backend but inconsistent lifecycle, MediaSession, and PiP
   handling.
3. **Decouple player from `MainActivity`** so it can run as a dedicated
   `PlayerActivity` (mpvKt pattern), giving the renderer a clean
   window-level surface and avoiding React Native view-tree
   complications.
4. **Package for distribution** as an NPM module with autolinking,
   `react-native.config.js`, AAR, and bundled libmpv `.so` files.

### Non-goals (V12)

- DRM (Widevine L1/L3) — V13
- Chromecast / AirPlay — V13+
- iOS player engine — V13 (V12 is Android-only)
- Replacing libmpv with a custom codec/renderer

---

## 1. Status Legend

- [ ] = Pending
- [~] = In Progress
- [x] = Complete
- [!] = Blocked
- [-] = Deferred (out of V12 scope)

Each phase has a **status** field. Each step is a checkbox.

---

## 2. Wave & Phase Index

| Wave | Phases | Theme | Status |
|---|---|---|---|
| **W1** | 1–5 | MVP `PlayerActivity` | [~] In progress |
| **W2** | 6–10 | Surface migration & PiP fix | [ ] Pending |
| **W3** | 11–15 | Audio unification | [ ] Pending |
| **W4** | 16–20 | MediaSession & foreground service | [ ] Pending |
| **W5** | 21–25 | Configuration, theming & control slots | [ ] Pending |
| **W6** | 26–32 | NPM package extraction | [ ] Pending |
| **W7** | 33–40 | Testing, hardening, documentation | [ ] Pending |
| **W8** | 41–48 | V11 deprecation & cleanup | [ ] Pending |

**Total: 48 phases**

---

## 3. Wave 1 — MVP `PlayerActivity` (validate architecture)

> **Goal:** Prove that the "dedicated `PlayerActivity` extending
> `ReactActivity` with `MpvRenderView` at the content view root" approach
> works for fullscreen video. No PiP yet, no audio yet, no service yet.
> Just: open a video file from the home screen → see it play fullscreen
> in `PlayerActivity` → back to home.

### Phase 1 — Create `PlayerActivity` skeleton

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** —
**Estimated effort:** 0.5 day
**Deliverable:** `PlayerActivity.kt` compiles, registers in manifest, can
be launched but does nothing useful yet.

- [ ] 1.1 Create `android/app/src/main/java/com/simba/player/PlayerActivity.kt`
- [ ] 1.2 Extend `ReactActivity` (NOT AppCompatActivity) so RN infra is inherited
- [ ] 1.3 Override `getMainComponentName(): String` — return `"SimbaPlayer"` (reuse root component for MVP)
- [ ] 1.4 Override `createReactActivityDelegate()` — return `DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)` (mirror `MainActivity`)
- [ ] 1.5 Override `onCreate(savedInstanceState)`:
  - [ ] 1.5.1 Call `super.onCreate(savedInstanceState)` first
  - 1.5.2 Set window background drawable to opaque black via `window.setBackgroundDrawable(ColorDrawable(Color.BLACK))` so RN loading flicker shows black, not white
  - 1.5.3 Set theme via `setTheme(R.style.AppTheme)` (mirror `MainActivity` so splash transition works)
- [ ] 1.6 Add stub `onResume()` that calls super only (no orientation pinning — let PlayerActivity be free orientation)
- [ ] 1.7 Add stub `onDestroy()` that calls super only
- [ ] 1.8 Add Log.i TAG and log on `onCreate`, `onResume`, `onDestroy`
- [ ] 1.9 Verify compiles via `./gradlew.bat :app:compileDebugKotlin`
- [ ] 1.10 Verify file structure matches project conventions (no lint warnings)

### Phase 2 — Register `PlayerActivity` in `AndroidManifest.xml`

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 1
**Estimated effort:** 0.25 day
**Deliverable:** `PlayerActivity` is discoverable to the Android system.

- [ ] 2.1 Open `android/app/src/main/AndroidManifest.xml`
- [ ] 2.2 Add new `<activity android:name=".PlayerActivity" .../>` block AFTER `MainActivity`
- [ ] 2.3 Set `android:configChanges="keyboard|keyboardHidden|navigation|orientation|screenLayout|uiMode|screenSize|smallestScreenSize"` (mirror mpvKt — includes `navigation`)
- [ ] 2.4 Set `android:launchMode="singleTask"` (mirror mpvKt — different from `MainActivity`'s `singleTop`)
- [ ] 2.5 Set `android:supportsPictureInPicture="true"`
- [ ] 2.6 Set `android:resizeableActivity="true"` (CRITICAL — missing in V11, may explain PiP issues)
- [ ] 2.7 Set `android:autoRemoveFromRecents="true"` (mirror mpvKt — clean up recents on finish)
- [ ] 2.8 Set `android:theme="@style/AppTheme"`
- [ ] 2.9 Set `android:exported="false"` (we launch via explicit intent from our own app — no external deep links in MVP)
- [ ] 2.10 Verify build with `./gradlew.bat :app:processDebugManifest`

### Phase 3 — `openPlayer` TurboModule method

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 1, Phase 2
**Estimated effort:** 0.5 day
**Deliverable:** JS can call `MpvPlayer.openPlayer(...)` to launch
`PlayerActivity` with file URI, title, type.

- [ ] 3.1 Open `MpvBridgeModule.kt`
- [ ] 3.2 Add new `@ReactMethod`:
  ```kotlin
  @ReactMethod
  fun openPlayer(uri: String, title: String?, type: String, startPositionMs: Double, promise: Promise)
  ```
- [ ] 3.3 Validate `type` is `"video"` or `"audio"`
- [ ] 3.4 Get `currentActivity` — return rejected promise if null
- [ ] 3.5 Build `Intent(currentActivity, PlayerActivity::class.java)`
- [ ] 3.6 Add extras:
  - [ ] 3.6.1 `EXTRA_URI` = uri
  - [ ] 3.6.2 `EXTRA_TITLE` = title ?: uri
  - [ ] 3.6.3 `EXTRA_TYPE` = type ("video" | "audio")
  - [ ] 3.6.4 `EXTRA_START_POSITION_MS` = startPositionMs.toLong()
- [ ] 3.7 Start activity: `currentActivity.startActivity(intent)`
- [ ] 3.8 Resolve promise with `true` on success
- [ ] 3.9 Catch exceptions, reject promise with error code on failure
- [ ] 3.10 Add Log.i calls with TAG for each branch
- [ ] 3.11 Verify build

### Phase 4 — `PlayerActivity` reads intent, logs

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 3
**Estimated effort:** 0.25 day
**Deliverable:** `PlayerActivity.onCreate` reads intent extras and logs
them. No playback yet.

- [ ] 4.1 In `PlayerActivity.onCreate`, after `super.onCreate`:
  - [ ] 4.1.1 Read `intent.getStringExtra("uri")`
  - [ ] 4.1.2 Read `intent.getStringExtra("title")`
  - [ ] 4.1.3 Read `intent.getStringExtra("type")`
  - [ ] 4.1.4 Read `intent.getLongExtra("startPositionMs", 0)`
- [ ] 4.2 Store as `private val` properties on the activity
- [ ] 4.3 Log all four values via Log.i
- [ ] 4.4 Add a Log.i at end of `onCreate` saying "PlayerActivity ready"
- [ ] 4.5 Add intent constant strings in a companion object:
  - [ ] 4.5.1 `EXTRA_URI = "uri"`
  - [ ] 4.5.2 `EXTRA_TITLE = "title"`
  - [ ] 4.5.3 `EXTRA_TYPE = "type"`
  - [ ] 4.5.4 `EXTRA_START_POSITION_MS = "startPositionMs"`
- [ ] 4.6 Verify build
- [ ] 4.7 Manual test: launch from adb shell:
  ```bash
  adb shell am start -n com.simba.player/.PlayerActivity \
    -e uri "/sdcard/Movies/sample.mp4" \
    -e title "Test" \
    -e type "video" \
    --el startPositionMs 0
  ```

### Phase 5 — JS-side launch orchestration

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 3
**Estimated effort:** 1 day
**Deliverable:** Tapping a video file in the home screen launches
`PlayerActivity` instead of mounting the player inline. The existing
inline player remains untouched (fallback path).

- [ ] 5.1 Open `src/native/player.api.ts`
- [ ] 5.2 Add new method on `MpvPlayer` namespace:
  ```typescript
  openPlayer(opts: {
    uri: string;
    title?: string;
    type: 'video' | 'audio';
    startPositionMs?: number;
  }): Promise<boolean>
  ```
- [ ] 5.3 Implement via `ensureModule().openPlayer(...)`
- [ ] 5.4 Open `src/native/NativeMpvPlayer.ts` (TurboModule spec)
- [ ] 5.5 Add `openPlayer` to the spec interface with correct TS types
- [ ] 5.6 Find the JS-side handler that mounts the player inline on file tap
  (likely in `VideoHost.tsx` / `VideoSurfaceGestures` parent or a
  navigation action)
- [ ] 5.7 Add a feature flag `USE_DEDICATED_PLAYER_ACTIVITY` (default
  `false` in MVP — flip to `true` only after manual test passes)
- [ ] 5.8 Behind the flag: replace inline-mount logic with a call to
  `MpvPlayer.openPlayer(...)`
- [ ] 5.9 Pass correct `type` based on whether the URI is a video or
  audio file
- [ ] 5.10 Add Log.d in the JS launch path (track via `logger`)
- [ ] 5.11 Manual test: tap a video file → `PlayerActivity` opens, fullscreen, plays video
- [ ] 5.12 Manual test: back button → returns to `MainActivity` cleanly

---

## 4. Wave 2 — Surface migration & PiP fix

> **Goal:** Fix the V11 PiP black-screen bug. Move `MpvRenderView` to be
> a direct child of `PlayerActivity`'s content view root (BENEATH the
> ReactRootView). Wire up PiP the mpvKt way. Validate against the V11
> bug — PiP must show live video.

### Phase 6 — Mount `MpvRenderView` at PlayerActivity content root

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 1
**Estimated effort:** 1 day
**Deliverable:** `MpvRenderView` (SurfaceView) is added to
`PlayerActivity`'s content view at index 0, AFTER `super.onCreate` (which
adds `ReactRootView` at a later index).

- [ ] 6.1 In `PlayerActivity.onCreate`, after super and theme setup:
  - [ ] 6.1.1 Get root via `findViewById<ViewGroup>(android.R.id.content)`
  - [ ] 6.1.2 Verify it's a `FrameLayout` (the standard content view root)
- [ ] 6.2 Create `MpvRenderView` instance:
  ```kotlin
  mpvRenderView = MpvRenderView(this)
  ```
- [ ] 6.3 Set layout params to `FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT)`
- [ ] 6.4 Add to root at index 0:
  ```kotlin
  rootView.addView(mpvRenderView, 0)
  ```
- [ ] 6.5 Log via `Log.i(TAG, "MpvRenderView mounted at content root, index=0")`
- [ ] 6.6 Override `onDestroy`:
  - [ ] 6.6.1 Call `mpvRenderView?.cleanup()`
  - [ ] 6.6.2 Remove `mpvRenderView` from root
  - [ ] 6.6.3 Null the reference
  - [ ] 6.6.4 Call super
- [ ] 6.7 Manual test: open PlayerActivity, verify SurfaceView is at the root (visible in hierarchyviewer or via dumpsys)
- [ ] 6.8 Manual test: video plays in fullscreen — should look identical to V11

### Phase 7 — Surface identity guard & native pointer wiring

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 6
**Estimated effort:** 0.5 day
**Deliverable:** `MpvRenderView.setNativePtr(...)` is called when the
mpv handle becomes available, attaching the Surface correctly.

- [ ] 7.1 Locate where `MpvPlayer.getNativePtr()` is called in `MpvBridgeModule` (current call site from `VideoHost.tsx` flow)
- [ ] 7.2 For MVP, the `nativePtr` flow stays in JS — `VideoHost.tsx` calls `getNativePtr()`, gets the pointer, passes it via `<VideoNativeSurface nativePtr={...} />`
- [ ] 7.3 For Wave 2, we need a NEW flow: `PlayerActivity` reads the pointer from `MpvBridgeModule` companion
- [ ] 7.4 Add a `@ReactMethod` to `MpvBridgeModule`:
  ```kotlin
  @ReactMethod fun getNativePtr(): Double = nativePtr.toDouble()
  ```
  (Double for cross-platform TurboModule compatibility)
- [ ] 7.5 In `PlayerActivity.onCreate`, after mounting `MpvRenderView`:
  - [ ] 7.5.1 Use `lifecycleScope.launch` (or `Handler.post`) to defer the pointer fetch
  - [ ] 7.5.2 Call `MpvBridgeModule.getNativePtr()` and pass to `mpvRenderView.setNativePtr(...)`
- [ ] 7.6 Verify `MpvRenderView.attachSurfaceLocked()` fires (log check)
- [ ] 7.7 Manual test: video plays in `PlayerActivity` (Surface attached correctly)
- [ ] 7.8 Manual test: closing activity, surface detached, mpv wid reset

### Phase 8 — Transparent root for React Native view tree

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 6
**Estimated effort:** 1 day
**Deliverable:** The player UI in `PlayerActivity` does NOT have an
opaque background covering the SurfaceView's video. The video shows
through.

- [ ] 8.1 Open `src/modules/playback/video/presentation/VideoPresentationShell.tsx`
- [ ] 8.2 Identify the `shell` style: `backgroundColor: SHELL_BACKGROUND` (where `SHELL_BACKGROUND = '#121216'`)
- [ ] 8.3 Decision: change `SHELL_BACKGROUND` to `'transparent'` OR add a `transparent` variant
- [ ] 8.4 Option A: change to `backgroundColor: 'transparent'` (simplest, applies everywhere)
- [ ] 8.5 Option B: add a new prop `transparentRoot?: boolean` and conditionally apply
- [ ] 8.6 Pick Option B (less risky — mini player still needs opaque background on home screen)
- [ ] 8.7 Pass `transparentRoot={true}` from `VideoHost.tsx` when in `PlayerActivity` (we'll need a way to detect this — Phase 8.8)
- [ ] 8.8 Add a build-time flag `__IN_PLAYER_ACTIVITY__` set by the JS-side launcher
- [ ] 8.9 Apply the flag conditionally in `VideoPresentationShell`
- [ ] 8.10 Verify: fullscreen video shows correctly (no white/black border around video)
- [ ] 8.11 Verify: mini player on home screen still has its opaque background (no regression)

### Phase 9 — `setPictureInPictureParams` in `PlayerActivity`

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 8
**Estimated effort:** 1 day
**Deliverable:** PiP entry uses proper params: source rect hint, aspect
ratio, RemoteActions.

- [ ] 9.1 Create a `PipController` class (or inline functions) in `PlayerActivity.kt`
- [ ] 9.2 Implement `createPipParams(playerBounds: Rect, videoAspect: Float): PictureInPictureParams`:
  - [ ] 9.2.1 Builder with `setAspectRatio(Rational(videoAspect))` clamped to 0.42..2.38
  - [ ] 9.2.2 `setActions(listOf(playPauseAction, expandAction, closeAction))`
  - [ ] 9.2.3 `setSourceRectHint(playerBounds)` (API 31+)
  - [ ] 9.2.4 `setTitle(mediaTitle)` (API 33+)
  - [ ] 9.2.5 `setSubtitle(progressText)` (API 33+)
- [ ] 9.3 Move `PipManager.buildPipParams` logic into `PlayerActivity`, OR keep `PipManager` as a utility class
- [ ] 9.4 In `PlayerActivity.onResume` or `onStart`:
  - [ ] 9.4.1 Compute player bounds: `Rect(0, 0, mpvRenderView.width, mpvRenderView.height)`
  - [ ] 9.4.2 Get video aspect from mpv: `MPVLib.getPropertyDouble("video-params/aspect")`
  - [ ] 9.4.3 Call `setPictureInPictureParams(createPipParams(bounds, aspect))` (API 26+)
- [ ] 9.5 In `PlayerActivity.onPictureInPictureModeChanged`:
  - [ ] 9.5.1 Re-call `setPictureInPictureParams` to refresh actions/state
- [ ] 9.6 Verify: log shows `setPictureInPictureParams` called with correct values
- [ ] 9.7 Verify: entering PiP uses our params (not defaults)

### Phase 10 — RemoteAction broadcast receiver + PiP enter/exit

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 9
**Estimated effort:** 1.5 days
**Deliverable:** PiP enter via swipe-down works; play/pause/expand/close
actions in the PiP overlay send events to JS; events back to mpv for
state changes.

- [ ] 10.1 Move `PipActionReceiver` from `MainActivity` ownership to `PlayerActivity` ownership
- [ ] 10.2 In `PlayerActivity.onCreate`:
  - [ ] 10.2.1 Create `pipReceiver = PipActionReceiver()`
  - [ ] 10.2.2 Register via `registerReceiver(pipReceiver, PipManager.intentFilter(), RECEIVER_NOT_EXPORTED)` (API 33+)
  - [ ] 10.2.3 For API < 33: register without flag
- [ ] 10.3 In `PlayerActivity.onDestroy`:
  - [ ] 10.3.1 Unregister `pipReceiver`
- [ ] 10.4 Override `onUserLeaveHint()`:
  - [ ] 10.4.1 If `Build.VERSION.SDK_INT >= N && packageManager.hasSystemFeature(FEATURE_PICTURE_IN_PICTURE)`:
  - [ ] 10.4.2 Call `enterPictureInPictureMode()` — NO params, they're set via setPictureInPictureParams
- [ ] 10.5 Override `onPictureInPictureModeChanged(isInPip, newConfig)`:
  - [ ] 10.5.1 Call `super.onPictureInPictureModeChanged(isInPip, newConfig)`
  - [ ] 10.5.2 If `isInPip`: re-call `setPictureInPictureParams` (refresh actions)
  - [ ] 10.5.3 Forward to `MpvBridgeModule.onPictureInPictureModeChanged(isInPip)` (companion emit, same pattern as V11)
- [ ] 10.6 Override `onPause()`:
  - [ ] 10.6.1 If NOT `isInPictureInPictureMode`: pause mpv (mirror mpvKt)
  - [ ] 10.6.2 If in PiP: do NOT pause mpv — let it keep playing
- [ ] 10.7 Override `onBackPressed()`:
  - [ ] 10.7.1 If in PiP: `finish()` (returns to MainActivity)
  - [ ] 10.7.2 Else: super (default back behavior)
- [ ] 10.8 Manual test: swipe down to enter PiP — MUST show live video (not black)
- [ ] 10.9 Manual test: tap play/pause action in PiP overlay — playback toggles
- [ ] 10.10 Manual test: tap expand action — returns to fullscreen
- [ ] 10.11 Manual test: tap close action — finishes PlayerActivity
- [ ] 10.12 Manual test: back button in PiP — returns to home

---

## 5. Wave 3 — Audio unification

> **Goal:** Same `PlayerActivity` handles audio files (URI to `.mp3`,
> `.m4a`, `.flac`, etc.). `MpvRenderView` is hidden. The audio engine,
> MediaSession, PiP, and foreground service are shared with video.

### Phase 11 — Audio intent extra in `openPlayer`

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 3
**Estimated effort:** 0.25 day
**Deliverable:** `openPlayer` correctly passes `type=audio` to
`PlayerActivity`.

- [ ] 11.1 Verify `MpvBridgeModule.openPlayer` already passes `type` extra (Phase 3.6.3)
- [ ] 11.2 Verify `PlayerActivity.onCreate` reads `EXTRA_TYPE` (Phase 4.1.3)
- [ ] 11.3 Add logging when `type == "audio"`
- [ ] 11.4 Manual test: launch with `type=audio` — log shows audio mode entered

### Phase 12 — Hide `MpvRenderView` for audio

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 6, Phase 11
**Estimated effort:** 0.5 day
**Deliverable:** For audio files, the `MpvRenderView` is hidden
(`View.GONE`) but the underlying mpv instance still runs.

- [ ] 12.1 In `PlayerActivity.onCreate`, after mounting `MpvRenderView`:
  - [ ] 12.1.1 If `type == "audio"`: `mpvRenderView.visibility = View.GONE`
  - [ ] 12.1.2 Log: "MpvRenderView hidden for audio mode"
- [ ] 12.2 Override `MpvRenderView` to handle GONE without crashing:
  - [ ] 12.2.1 In `attachSurfaceLocked`: skip if view is not attached to window
  - [ ] 12.2.2 Surface still attaches — just visually hidden
- [ ] 12.3 Verify: mpv audio playback still works when SurfaceView is GONE
- [ ] 12.4 Verify: mpv does not log surface errors when SurfaceView is hidden

### Phase 13 — Audio UI conditional rendering

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 11
**Estimated effort:** 1 day
**Deliverable:** The same root React Native component (`SimbaPlayer`)
renders different controls based on `type` — video controls for video,
audio controls (artwork, waveform, transport) for audio.

- [ ] 13.1 Identify the entry point component (`App.tsx` or root screen)
- [ ] 13.2 Add a global state or context: `currentPlaybackType: 'video' | 'audio'`
- [ ] 13.3 When `PlayerActivity` launches with `type=audio`:
  - [ ] 13.3.1 JS-side knows via the launch flag
  - [ ] 13.3.2 Root component renders `AudioModule` instead of `VideoHost`
- [ ] 13.4 Use the existing `AudioModule.tsx` (no changes needed)
- [ ] 13.5 Verify: audio file → artwork/waveform UI, video file → video frame UI
- [ ] 13.6 Verify: same playback engine used (log check via mpv observer)

### Phase 14 — Audio background playback groundwork

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 13
**Estimated effort:** 1 day
**Deliverable:** When `PlayerActivity` is backgrounded (not in PiP),
audio continues playing. mpvKt's `onPause` rule applies.

- [ ] 14.1 In `PlayerActivity.onPause`:
  - [ ] 14.1.1 If `isInPictureInPictureMode`: do NOT pause
  - [ ] 14.1.2 If type == "audio" AND user wants background playback: do NOT pause
  - [ ] 14.1.3 If type == "video" AND user is leaving (not PiP): pause
- [ ] 14.2 Add a setting `audioBackgroundPlayback` (default: true)
- [ ] 14.3 Verify: audio file → swipe to recents → audio keeps playing
- [ ] 14.4 Verify: video file → swipe to recents → video pauses
- [ ] 14.5 Verify: video file → swipe-down PiP → video keeps playing

### Phase 15 — Audio PiP

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 10, Phase 13
**Estimated effort:** 0.5 day
**Deliverable:** Audio files can enter PiP. The PiP overlay shows the
artwork (background) and play/pause/expand/close actions.

- [ ] 15.1 For `type=audio`, the PiP window shows the activity content
  - [ ] 15.1.1 Audio UI must be designed to look good in a small window
  - [ ] 15.1.2 Background: artwork image (cover art)
  - [ ] 15.1.3 Foreground: title, progress, play/pause button
- [ ] 15.2 Verify: audio PiP shows artwork + controls
- [ ] 15.3 Verify: tapping audio PiP plays/pauses
- [ ] 15.4 Verify: expanding audio PiP returns to fullscreen

---

## 6. Wave 4 — MediaSession & foreground service

> **Goal:** Lock-screen controls, Bluetooth/wired-headset controls,
> notification media controls, and a foreground service so audio keeps
> playing when the activity is destroyed.

### Phase 16 — Create `MediaPlaybackService`

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** —
**Estimated effort:** 2 days
**Deliverable:** A foreground `Service` that owns the MediaSession and
keeps the process alive when audio is playing.

- [ ] 16.1 Create `android/app/src/main/java/com/simba/player/MediaPlaybackService.kt`
- [ ] 16.2 Extend `Service` (NOT IntentService — deprecated)
- [ ] 16.3 Define `companion object` with constants:
  - [ ] 16.3.1 `ACTION_PLAY = "com.simba.player.action.PLAY"`
  - [ ] 16.3.2 `ACTION_PAUSE = "com.simba.player.action.PAUSE"`
  - [ ] 16.3.3 `ACTION_TOGGLE = "com.simba.player.action.TOGGLE"`
  - [ ] 16.3.4 `ACTION_STOP = "com.simba.player.action.STOP"`
  - [ ] 16.3.5 `EXTRA_SESSION_ACTIVITY = "sessionActivity"`
- [ ] 16.4 Override `onCreate`:
  - [ ] 16.4.1 Create a notification channel (API 26+) via `NotificationManager`
  - [ ] 16.4.2 Initialize MediaSession
  - [ ] 16.4.3 Set callback for transport controls
- [ ] 16.5 Override `onStartCommand`:
  - [ ] 16.5.1 Switch on `intent.action`
  - [ ] 16.5.2 For PLAY/PAUSE/TOGGLE: forward to MediaSession callback
  - [ ] 16.5.3 For STOP: stopForeground, stopSelf
- [ ] 16.6 Implement `buildNotification(state)`:
  - [ ] 16.6.1 MediaStyle notification
  - [ ] 16.6.2 Action buttons (play/pause + optional skip)
  - [ ] 16.6.3 Title, subtitle, artwork
- [ ] 16.7 Override `onDestroy`:
  - [ ] 16.7.1 Release MediaSession
  - [ ] 16.7.2 Log
- [ ] 16.8 Override `onBind`:
  - [ ] 16.8.1 Return null (we use startCommand, not bind)
- [ ] 16.9 Add to `AndroidManifest.xml`:
  ```xml
  <service android:name=".MediaPlaybackService"
           android:exported="false"
           android:foregroundServiceType="mediaPlayback" />
  ```
- [ ] 16.10 Verify build

### Phase 17 — Bind/Unbind service in `PlayerActivity`

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 16
**Estimated effort:** 1 day
**Deliverable:** `PlayerActivity` starts the service when playback
begins, stops it when playback ends.

- [ ] 17.1 In `PlayerActivity.onCreate`, after mounting MpvRenderView:
  - [ ] 17.1.1 Start service: `startService(Intent(this, MediaPlaybackService::class.java))`
  - [ ] 17.1.2 Log "MediaPlaybackService started"
- [ ] 17.2 In `PlayerActivity.onDestroy`:
  - [ ] 17.2.1 If NOT in PiP: `stopService(Intent(this, MediaPlaybackService::class.java))`
  - [ ] 17.2.2 If in PiP: keep service running (audio continues in PiP)
- [ ] 17.3 Add a ServiceConnection for bound mode (future — for state queries)
- [ ] 17.4 Verify: launch audio file, swipe to recents, audio keeps playing (service alive)
- [ ] 17.5 Verify: launch audio file, force-kill app, audio stops (cleanup correct)

### Phase 18 — MediaSession setup

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 16
**Estimated effort:** 2 days
**Deliverable:** MediaSession properly registered with the system. Lock
screen shows media controls.

- [ ] 18.1 Create `MediaSessionController` class in `PlayerActivity.kt` (or separate file)
- [ ] 18.2 Create `MediaSession` with tag `"simba-player-session"`
- [ ] 18.3 Set callback:
  - [ ] 18.3.1 `onPlay()` → resume mpv via `MpvPlayer.setPause(false)`
  - [ ] 18.3.2 `onPause()` → pause mpv
  - [ ] 18.3.3 `onStop()` → stop playback, release session
  - [ ] 18.3.4 `onSkipToNext()` → playlist next
  - [ ] 18.3.5 `onSkipToPrevious()` → playlist previous
  - [ ] 18.3.6 `onSeekTo(pos)` → seek to position
- [ ] 18.4 Set session activity (PendingIntent to launch `PlayerActivity`)
- [ ] 18.5 Activate session on playback start, deactivate on stop
- [ ] 18.6 Update `PlaybackState` on mpv state changes:
  - [ ] 18.6.1 ACTION_PLAYING, ACTION_PAUSED, ACTION_STOPPED, ACTION_BUFFERING
  - [ ] 18.6.2 Position in ms
- [ ] 18.7 Verify: lock screen shows media controls
- [ ] 18.8 Verify: lock screen play/pause works
- [ ] 18.9 Verify: lock screen seek works

### Phase 19 — Media metadata on lock screen

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 18
**Estimated effort:** 1 day
**Deliverable:** Lock screen / notification shows track title, artist,
album, artwork.

- [ ] 19.1 When file loads, query mpv for metadata:
  - [ ] 19.1.1 `mpv.getPropertyString("media-title")`
  - [ ] 19.1.2 `mpv.getPropertyString("metadata/artist")`
  - [ ] 19.1.3 `mpv.getPropertyString("metadata/album")`
- [ ] 19.2 Build `MediaMetadata` with title, artist, album, duration
- [ ] 19.3 If artwork is local file URI or URL, load it asynchronously:
  - [ ] 19.3.1 For URL: download to cache, set as Bitmap
  - [ ] 19.3.2 For local URI: load via `BitmapFactory.decodeStream`
  - [ ] 19.3.3 Default: use app icon
- [ ] 19.4 Set on MediaSession: `session.setMetadata(metadata)`
- [ ] 19.5 Verify: lock screen shows track info + artwork

### Phase 20 — Bluetooth / wired headset controls

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 18
**Estimated effort:** 1 day
**Deliverable:** Bluetooth headphone play/pause/skip buttons work.
Wired headset button works.

- [ ] 20.1 Register a `BroadcastReceiver` for `ACTION_AUDIO_BECOMING_NOISY`
- [ ] 20.2 On noisy: pause playback (headphones unplugged)
- [ ] 20.3 MediaSession callback already handles media button events
- [ ] 20.4 Add `MediaButtonReceiver` declaration in `AndroidManifest.xml`:
  ```xml
  <receiver android:name="androidx.media.session.MediaButtonReceiver"
            android:exported="true">
      <intent-filter>
          <action android:name="android.intent.action.MEDIA_BUTTON" />
      </intent-filter>
  </receiver>
  ```
- [ ] 20.5 Verify: Bluetooth headphone play button toggles playback
- [ ] 20.6 Verify: Wired headset click pauses

---

## 7. Wave 5 — Configuration, theming & control slots

> **Goal:** Make `simba-player` truly customizable. Consumers can
> override the entire UI, theme, default controls, hardware decoding
> policy, notification config, etc.

### Phase 21 — `PlayerProvider` and config

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 5
**Estimated effort:** 1.5 days
**Deliverable:** Consumers wrap their app in `<PlayerProvider config={...}>`
to configure the player globally.

- [ ] 21.1 Create `src/components/PlayerProvider.tsx`
- [ ] 21.2 Define `PlayerConfig` type:
  ```typescript
  interface PlayerConfig {
    theme?: PlayerTheme;
    pip?: { enabled: boolean; autoEnterOnLeave: boolean };
    hardwareDecoding?: 'auto' | 'mediacodec' | 'no';
    notifications?: { enabled: boolean; channelId: string };
    defaultControls?: React.ComponentType<any> | null;
    audio?: { backgroundPlayback: boolean; respectAudioFocus: boolean };
    subtitle?: { preferredLanguages: string[]; fontSize: number };
    debug?: { verboseLogging: boolean };
  }
  ```
- [ ] 21.3 Implement Provider context + hook (`usePlayerConfig()`)
- [ ] 21.4 Pass config to TurboModule via a `setConfig` method on mount
- [ ] 21.5 Verify: config is picked up by PlayerActivity (log check)

### Phase 22 — Theme propagation

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 21
**Estimated effort:** 1 day
**Deliverable:** Theme colors flow from config → default controls.

- [ ] 22.1 Define `PlayerTheme`:
  ```typescript
  interface PlayerTheme {
    accent: string;
    background: string;
    text: string;
    textSecondary: string;
    surface: string;
    icon?: string;
  }
  ```
- [ ] 22.2 Default theme:
  ```typescript
  const DEFAULT_THEME: PlayerTheme = {
    accent: '#FFD700',
    background: '#121216',
    text: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.6)',
    surface: 'rgba(255,255,255,0.1)',
  };
  ```
- [ ] 22.3 `DefaultControls` reads theme from `usePlayerConfig()`
- [ ] 22.4 Verify: custom theme propagates to all default UI elements

### Phase 23 — Custom controls slot (`renderControls` prop)

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 22
**Estimated effort:** 1 day
**Deliverable:** Consumer can replace the entire UI overlay by passing
a component as `renderControls`.

- [ ] 23.1 `PlayerProvider` accepts `renderControls?: () => ReactNode` prop
- [ ] 23.2 When `PlayerActivity` opens, the JS-side reads this prop
- [ ] 23.3 PlayerActivity's root React component renders the custom controls (or `DefaultControls` if null)
- [ ] 23.4 The custom controls component receives a `usePlayer()` hook with full state + commands
- [ ] 23.5 Verify: custom controls component renders, mpv state changes propagate

### Phase 24 — Default controls component

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 22
**Estimated effort:** 3 days
**Deliverable:** A polished, production-quality default controls
component (transport bar, time labels, PiP button, settings).

- [ ] 24.1 Create `src/components/DefaultControls.tsx`
- [ ] 24.2 Render structure:
  - [ ] 24.2.1 Top bar: title, back button, more menu
  - [ ] 24.2.2 Center: loading spinner / error state / buffer indicator
  - [ ] 24.2.3 Bottom: scrubber, time labels, play/pause, skip, speed, PiP
- [ ] 24.3 Use `usePlayer()` for state, `usePlayerProgress()` for position
- [ ] 24.4 Auto-hide controls after 3 seconds of inactivity
- [ ] 24.5 Show controls on tap
- [ ] 24.6 Tap-to-seek on scrubber
- [ ] 24.7 Verify: looks polished in video and audio modes

### Phase 25 — Surface placeholder component

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 6
**Estimated effort:** 0.25 day
**Deliverable:** A no-op JS component (`<PlayerSurface />`) that reserves
layout space for the natively-rendered SurfaceView.

- [ ] 25.1 Create `src/components/PlayerSurface.tsx`
- [ ] 25.2 Render `<View style={{flex: 1}} />` — no native bridge
- [ ] 25.3 Used by `DefaultControls` parent for layout
- [ ] 25.4 Add a doc comment: "Surface is rendered natively by PlayerActivity"

---

## 8. Wave 6 — NPM package extraction

> **Goal:** Extract the player code into a standalone directory,
> configure for NPM publishing, ensure autolinking works.

### Phase 26 — Create module directory structure

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** —
**Estimated effort:** 1 day
**Deliverable:** A new directory `simba-player/` at the repo root, with
the standard layout for an RN package.

- [ ] 26.1 Create `simba-player/` at the same level as `MOBILE_APP_REACT_NATIVE/`
- [ ] 26.2 Create subdirectories:
  - [ ] 26.2.1 `simba-player/android/`
  - [ ] 26.2.2 `simba-player/android/src/main/java/com/simba/player/`
  - [ ] 26.2.3 `simba-player/src/`
  - [ ] 26.2.4 `simba-player/src/components/`
  - [ ] 26.2.5 `simba-player/src/hooks/`
  - [ ] 26.2.6 `simba-player/src/native/`
  - [ ] 26.2.7 `simba-player/src/service/`
- [ ] 26.3 Create `simba-player/package.json`
- [ ] 26.4 Create `simba-player/tsconfig.json`
- [ ] 26.5 Create `simba-player/react-native.config.js`
- [ ] 26.6 Create `simba-player/README.md` (placeholder)
- [ ] 26.7 Create `simba-player/.gitignore`
- [ ] 26.8 Create `simba-player/.npmignore`

### Phase 27 — Move Android code to module

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 26, Wave 4 complete
**Estimated effort:** 2 days
**Deliverable:** All player-related Android code lives in `simba-player/android/`,
not in `MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/mpv/`.

- [ ] 27.1 Move files:
  - [ ] 27.1.1 `PlayerActivity.kt`
  - [ ] 27.1.2 `MpvRenderView.kt`
  - [ ] 27.1.3 `MpvBridgeModule.kt`
  - [ ] 27.1.4 `MpvRenderViewManager.kt`
  - [ ] 27.1.5 `PipManager.kt`
  - [ ] 27.1.6 `PipActionReceiver.kt`
  - [ ] 27.1.7 `MediaPlaybackService.kt` (if exists)
- [ ] 27.2 Keep in app:
  - [ ] 27.2.1 `MainActivity.kt` (host app)
  - [ ] 27.2.2 `MainApplication.kt` (host app)
  - [ ] 27.2.3 `SplashActivity.kt`
- [ ] 27.3 Update package paths from `com.simba.player.mpv` → `com.simba.player`
- [ ] 27.4 Update imports across the project
- [ ] 27.5 Move libmpv .so files to `simba-player/android/src/main/jniLibs/`
- [ ] 27.6 Verify build

### Phase 28 — Create module `build.gradle`

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 27
**Estimated effort:** 1.5 days
**Deliverable:** The module's `android/build.gradle` compiles
independently as an AAR.

- [ ] 28.1 Create `simba-player/android/build.gradle`
- [ ] 28.2 Apply `com.android.library` plugin
- [ ] 28.3 Apply `kotlin-android` plugin
- [ ] 28.4 Add `ext.kotlinVersion = "1.9.x"` (match app)
- [ ] 28.5 Configure compileSdk, minSdk, targetSdk (match app)
- [ ] 28.6 Add dependencies:
  - [ ] 28.6.1 `com.facebook.react:react-android`
  - [ ] 28.6.2 `com.facebook.react:hermes-android`
  - [ ] 28.6.3 `androidx.core:core-ktx`
  - [ ] 28.6.4 `androidx.media:media`
  - [ ] 28.6.5 `androidx.appcompat:appcompat`
- [ ] 28.7 Configure CMake build for libmpv (or use prebuilt AAR)
- [ ] 28.8 Verify `gradlew :simba-player:assembleRelease` produces AAR
- [ ] 28.9 Verify AAR has all expected classes

### Phase 29 — Move TypeScript code

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 26, Wave 5 complete
**Estimated effort:** 2 days
**Deliverable:** All player-related TypeScript lives in
`simba-player/src/`. App's `MOBILE_APP_REACT_NATIVE/src/` imports
from the module.

- [ ] 29.1 Move files to `simba-player/src/`:
  - [ ] 29.1.1 `components/PlayerProvider.tsx`
  - [ ] 29.1.2 `components/DefaultControls.tsx`
  - [ ] 29.1.3 `components/PlayerSurface.tsx`
  - [ ] 29.1.4 `hooks/usePlayer.ts`
  - [ ] 29.1.5 `hooks/usePlayerProgress.ts`
  - [ ] 29.1.6 `hooks/usePip.ts`
  - [ ] 29.1.7 `native/NativeMpvPlayer.ts`
  - [ ] 29.1.8 `service/PlayerService.ts`
  - [ ] 29.1.9 `types.ts`
  - [ ] 29.1.10 `index.ts` (public API)
- [ ] 29.2 Update import paths in app code:
  - [ ] 29.2.1 `MOBILE_APP_REACT_NATIVE/src/native/player.api.ts` — import from `'simba-player'` instead of `'./NativeMpvPlayer'`
  - [ ] 29.2.2 Any consumer of `MpvPlayer` — same
- [ ] 29.3 Verify app builds with module imported

### Phase 30 — `package.json` and `react-native.config.js`

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 26
**Estimated effort:** 1 day
**Deliverable:** Module is autolinkable. Installable via `npm install`.

- [ ] 30.1 Create `simba-player/package.json`:
  ```json
  {
    "name": "simba-player",
    "version": "0.1.0",
    "description": "React Native video/audio player powered by libmpv",
    "main": "src/index.ts",
    "types": "src/index.ts",
    "scripts": {
      "build": "tsc",
      "lint": "eslint src",
      "test": "jest"
    },
    "peerDependencies": {
      "react": "*",
      "react-native": ">=0.70.0"
    },
    "files": ["src/", "android/", "README.md", "LICENSE"],
    "keywords": ["react-native", "video", "audio", "mpv", "player", "pip"],
    "license": "MIT",
    "repository": "https://github.com/yourorg/simba-player"
  }
  ```
- [ ] 30.2 Create `simba-player/react-native.config.js`:
  ```js
  module.exports = {
    dependency: {
      platforms: {
        android: {
          sourceDir: './android',
          packageImportPath: 'import com.simba.player.PlayerPackage;',
          packageInstance: 'new PlayerPackage()',
        },
        ios: null,
      },
    },
  };
  ```
- [ ] 30.3 Verify autolinking works in app (`react-native config` shows module)

### Phase 31 — `PlayerPackage` for ReactPackage registration

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 27
**Estimated effort:** 0.5 day
**Deliverable:** A `ReactPackage` class is auto-registered and the
TurboModule is exposed.

- [ ] 31.1 Create `android/src/main/java/com/simba/player/PlayerPackage.kt`
- [ ] 31.2 Extend `BaseReactPackage` (or `TurboReactPackage` for new arch)
- [ ] 31.3 Override `getModule(name, context)`:
  - [ ] 31.3.1 If `name == MpvBridgeModule.NAME`: return `MpvBridgeModule(context)`
  - [ ] 31.3.2 Else: throw
- [ ] 31.4 Override `getReactModuleInfoProvider()`:
  - [ ] 31.4.1 Return info for `MpvBridgeModule` with `isTurboModule = true`
- [ ] 31.5 Verify: TurboModule is detected by RN's autolinking

### Phase 32 — Module documentation

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 30
**Estimated effort:** 2 days
**Deliverable:** A complete README that lets a new consumer install
and use the module in under 5 minutes.

- [ ] 32.1 Section: "What is simba-player?"
- [ ] 32.2 Section: "Installation" (npm install, autolinking)
- [ ] 32.3 Section: "Basic usage" (open file, default controls)
- [ ] 32.4 Section: "Custom UI" (renderControls slot, usePlayer hook)
- [ ] 32.5 Section: "Configuration" (PlayerConfig reference)
- [ ] 32.6 Section: "PiP" (how it works, customization)
- [ ] 32.7 Section: "Background audio" (MediaSession, foreground service)
- [ ] 32.8 Section: "Theming" (PlayerTheme reference)
- [ ] 32.9 Section: "API reference" (every exported function/type)
- [ ] 32.10 Section: "Troubleshooting" (common issues, debug logging)
- [ ] 32.11 Section: "Limitations" (DRM, casting, GPL)
- [ ] 32.12 Section: "Contributing" (how to run locally, run tests)
- [ ] 32.13 Section: "License" (MIT for code, GPL for libmpv)
- [ ] 32.14 Add 5-10 example code snippets
- [ ] 32.15 Add a GIF/screenshot of the player in action
- [ ] 32.16 Verify all code examples compile

---

## 9. Wave 7 — Testing, hardening, documentation

> **Goal:** Production-quality. Tests, edge cases, performance, memory
> safety, error handling.

### Phase 33 — Unit tests for native module

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Wave 6 complete
**Estimated effort:** 3 days
**Deliverable:** Unit tests for `MpvBridgeModule` and `PipManager`.

- [ ] 33.1 Set up JUnit test framework in module's `android/src/test/`
- [ ] 33.2 Test `buildPipParams` with various input combinations
- [ ] 33.3 Test `PipActionReceiver` for each action
- [ ] 33.4 Test `MpvBridgeModule.companion.onPictureInPictureModeChanged` with null instance
- [ ] 33.5 Test `MpvRenderView.attachSurfaceLocked` with null surface
- [ ] 33.6 Test `MpvRenderView.detachSurfaceLocked` idempotency
- [ ] 33.7 Aim for ≥70% code coverage
- [ ] 33.8 Configure CI to run tests on push

### Phase 34 — TypeScript unit tests

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Wave 6 complete
**Estimated effort:** 3 days
**Deliverable:** Unit tests for hooks and components.

- [ ] 34.1 Set up Jest + React Native Testing Library in module
- [ ] 34.2 Test `usePlayer` returns initial state
- [ ] 34.3 Test `usePlayerProgress` updates on event
- [ ] 34.4 Test `usePip` enters/exits correctly
- [ ] 34.5 Test `PlayerProvider` applies config
- [ ] 34.6 Test `PlayerService.open` builds correct intent
- [ ] 34.7 Test `DefaultControls` renders correctly
- [ ] 34.8 Aim for ≥70% coverage

### Phase 35 — Manual QA test matrix

**Status:** [ ]
**Owner:** QA team
**Depends on:** Wave 6 complete
**Estimated effort:** 5 days
**Deliverable:** A signed-off QA report covering the matrix below.

- [ ] 35.1 Local MP4 playback (small, medium, large files)
- [ ] 35.2 Local MKV playback
- [ ] 35.3 Local MP3 playback
- [ ] 35.4 Local FLAC playback
- [ ] 35.5 HLS streaming playback
- [ ] 35.6 HTTP progressive download playback
- [ ] 35.7 Audio playback in background (lock screen, recents)
- [ ] 35.8 Video playback in PiP (180s test, must show live video)
- [ ] 35.9 Audio playback in PiP (artwork visible)
- [ ] 35.10 Bluetooth headphone controls
- [ ] 35.11 Wired headset controls
- [ ] 35.12 Notification controls (play/pause/stop)
- [ ] 35.13 Lock screen controls
- [ ] 35.14 Rotate device while playing video
- [ ] 35.15 Switch audio output (speaker → Bluetooth → speaker)
- [ ] 35.16 Network interruption (airplane mode mid-stream)
- [ ] 35.17 Low battery scenarios
- [ ] 35.18 Memory pressure (background apps)
- [ ] 35.19 Rapid enter/exit PiP (no crashes, no leaks)
- [ ] 35.20 Long playback (1+ hour session stability)

### Phase 36 — Memory leak audit

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 35
**Estimated effort:** 2 days
**Deliverable:** Zero leaks verified via LeakCanary / Android Profiler.

- [ ] 36.1 Add LeakCanary to debug build
- [ ] 36.2 Open/close `PlayerActivity` 100 times → no leaks
- [ ] 36.3 Enter/exit PiP 100 times → no leaks
- [ ] 36.4 Switch audio/video 50 times → no leaks
- [ ] 36.5 Background/foreground 50 times → no leaks
- [ ] 36.6 Verify mpv observer is removed in `onDestroy`
- [ ] 36.7 Verify `ReactRootView` is unmounted properly
- [ ] 36.8 Verify `BroadcastReceiver` is unregistered

### Phase 37 — Performance benchmarks

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Wave 6 complete
**Estimated effort:** 2 days
**Deliverable:** Baseline performance numbers documented.

- [ ] 37.1 Cold-start time (app launch → first frame on screen)
- [ ] 37.2 File-open time (open() call → playback starts)
- [ ] 37.3 Frame drop rate (90th, 99th percentile over 10 min playback)
- [ ] 37.4 Memory footprint (idle, playing, paused)
- [ ] 37.5 CPU usage (idle, playing)
- [ ] 37.6 Battery drain (mAh/hour)
- [ ] 37.7 PiP entry latency (swipe-down → PiP visible)
- [ ] 37.8 Compare against V11 baseline numbers
- [ ] 37.9 Document regression / improvement

### Phase 38 — Error handling & recovery

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Wave 6 complete
**Estimated effort:** 3 days
**Deliverable:** Graceful handling of every error scenario.

- [ ] 38.1 Corrupted file → show error UI, emit error event
- [ ] 38.2 Network failure → retry with exponential backoff
- [ ] 38.3 Unsupported codec → show "format not supported" UI
- [ ] 38.4 Missing audio focus → pause, queue resume
- [ ] 38.5 Surface lost during PiP → re-attach
- [ ] 38.6 mpv crash → restart instance, recover state
- [ ] 38.7 Out of memory → release caches, reduce surface size
- [ ] 38.8 Audio routing change → handle Bluetooth disconnect
- [ ] 38.9 Verify all errors emit events to JS
- [ ] 38.10 Verify JS can recover from each error

### Phase 39 — Logging & debug mode

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Wave 6 complete
**Estimated effort:** 1 day
**Deliverable:** Verbose logging that helps debug issues in the field.

- [ ] 39.1 Add `verboseLogging: boolean` config flag
- [ ] 39.2 When enabled:
  - [ ] 39.2.1 Log all mpv commands
  - [ ] 39.2.2 Log all property changes
  - [ ] 39.2.3 Log all PiP events
  - [ ] 39.2.4 Log all MediaSession state changes
  - [ ] 39.2.5 Log all surface attach/detach events
- [ ] 39.3 Provide a "Copy logs to clipboard" function in debug builds
- [ ] 39.4 Document how to enable verbose logging in README

### Phase 40 — Example app

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 32
**Estimated effort:** 2 days
**Deliverable:** A standalone example app demonstrating all features.

- [ ] 40.1 Create `simba-player/example/` RN app
- [ ] 40.2 Demonstrate: local file playback
- [ ] 40.3 Demonstrate: streaming URL playback
- [ ] 40.4 Demonstrate: audio playback with MediaSession
- [ ] 40.5 Demonstrate: PiP
- [ ] 40.6 Demonstrate: custom controls (replace default)
- [ ] 40.7 Demonstrate: custom theme
- [ ] 40.8 Demonstrate: background audio
- [ ] 40.9 Verify example app builds and runs on a fresh checkout

---

## 10. Wave 8 — V11 deprecation & cleanup

> **Goal:** Remove V11 code paths from the consumer app, keep only the
> V12 (simba-player) flow. Update documentation. Cut V12 release.

### Phase 41 — Feature flag cutover

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Wave 7 complete
**Estimated effort:** 0.25 day
**Deliverable:** The `USE_DEDICATED_PLAYER_ACTIVITY` flag is flipped to
`true` permanently.

- [ ] 41.1 Search codebase for `USE_DEDICATED_PLAYER_ACTIVITY`
- [ ] 41.2 Set default to `true`
- [ ] 41.3 Verify all player entry points use the new flow
- [ ] 41.4 Manual regression: all player features work

### Phase 42 — Remove inline player from `MainActivity`

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 41
**Estimated effort:** 1 day
**Deliverable:** `MainActivity` no longer hosts any video/audio playback
inline. Only the mini-player card on home.

- [ ] 42.1 Identify the inline-mounting code paths in `VideoHost.tsx`
- [ ] 42.2 Replace with calls to `PlayerService.open(...)`
- [ ] 42.3 Identify inline-mounting code in `AudioModule.tsx`
- [ ] 42.4 Replace with calls to `PlayerService.open(...)`
- [ ] 42.5 Remove now-dead code paths
- [ ] 42.6 Remove `VideoNativeSurface.tsx`
- [ ] 42.7 Remove `VideoSurfaceGestures.tsx`
- [ ] 42.8 Verify: app launches, taps video file → PlayerActivity opens
- [ ] 42.9 Verify: app launches, taps audio file → PlayerActivity opens

### Phase 43 — Update navigation

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 42
**Estimated effort:** 0.5 day
**Deliverable:** Navigation reflects the new flow.

- [ ] 43.1 Open navigation graph
- [ ] 43.2 Remove "Player" route if it was an in-app screen
- [ ] 43.3 Add a "Launch player" action that calls `PlayerService.open(...)`
- [ ] 43.4 Verify: navigation doesn't try to mount old player screens
- [ ] 43.5 Update tests for navigation

### Phase 44 — Update `usePipLifecycle.ts`

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 42
**Estimated effort:** 0.25 day
**Deliverable:** The V6 PiP lifecycle hook (which has the pause-on-PiP
bug fixed in V11) is fully replaced by `usePip` from simba-player.

- [ ] 44.1 Open `src/hooks/usePipLifecycle.ts`
- [ ] 44.2 Replace body with a wrapper around simba-player's `usePip`
- [ ] 44.3 OR: delete the hook entirely and update consumers
- [ ] 44.4 Verify: PiP still works
- [ ] 44.5 Remove dead code

### Phase 45 — Clean up V11 debug logs

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 41
**Estimated effort:** 0.5 day
**Deliverable:** All the diagnostic logging added during V11 PiP
debugging is removed.

- [ ] 45.1 Search codebase for V11-era debug log tags (`PipDiag`, `MainActivity.onPicture`, `companion.onPicture`, etc.)
- [ ] 45.2 Remove each (or move to `verboseLogging` gate)
- [ ] 45.3 Verify build

### Phase 46 — Update V11 docs

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 45
**Estimated effort:** 1 day
**Deliverable:** V11 specifications are archived, V12 spec is the
authoritative document.

- [ ] 46.1 Move `md/VIDEO_UI_V11_SPECIFICATION.md` → `md/archive/`
- [ ] 46.2 Update `md/` index
- [ ] 46.3 Move `md/SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` → top-level `md/`
- [ ] 46.4 Update other docs that reference V11 architecture
- [ ] 46.5 Verify all docs are consistent

### Phase 47 — Final QA

**Status:** [ ]
**Owner:** QA team
**Depends on:** Wave 8 complete
**Estimated effort:** 3 days
**Deliverable:** Signed-off final QA report.

- [ ] 47.1 Re-run full test matrix from Phase 35
- [ ] 47.2 Verify no regressions from V11
- [ ] 47.3 Verify PiP works on at least 3 device types
- [ ] 47.4 Verify audio works on at least 3 device types
- [ ] 47.5 Verify MediaSession on at least 2 Android versions (12, 14)
- [ ] 47.6 Sign-off

### Phase 48 — V12.0.0 release

**Status:** [ ]
**Owner:** Mobile team
**Depends on:** Phase 47
**Estimated effort:** 1 day
**Deliverable:** V12.0.0 tagged and released.

- [ ] 48.1 Tag `v12.0.0` in git
- [ ] 48.2 Build release APK
- [ ] 48.3 Update version in module's `package.json`
- [ ] 48.4 Publish to NPM (if external) or mark internal release
- [ ] 48.5 Announce internally
- [ ] 48.6 Begin V13 planning (DRM, casting)

---

## 11. Critical Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|---|---|---|---|
| PlayerActivity RN bridge initialization has race condition with mpv | Playback never starts | Medium | Phase 5 + Phase 7 explicitly test this |
| SurfaceView still doesn't work in PiP after migration | V12 fails its primary goal | Low | Wave 2 (Phase 8-10) has explicit verification steps |
| libmpv GPL licensing blocks consumer adoption | Package unusable in commercial apps | Medium | Phase 32 documents clearly; option to make libmpv external dep |
| MediaSession + foreground service combo breaks on Android 14+ | Background audio stops | Medium | Phase 16 specifies `foregroundServiceType="mediaPlayback"` |
| Performance regression vs V11 | CPU/memory higher | Low | Phase 37 benchmarks |
| State management across activities (Player ↔ Main) | UI desync | Medium | Phase 29 design: JS Redux remains canonical |
| npm publishing friction (autolinking edge cases) | Module unusable | Low | Phase 30-31 explicit verification |

---

## 12. Phase Status Table

| Phase | Title | Wave | Status | Owner | Start | End |
|---|---|---|---|---|---|---|
| 1 | Create PlayerActivity skeleton | W1 | [ ] | Mobile | — | — |
| 2 | Register PlayerActivity in manifest | W1 | [ ] | Mobile | — | — |
| 3 | openPlayer TurboModule method | W1 | [ ] | Mobile | — | — |
| 4 | PlayerActivity reads intent | W1 | [ ] | Mobile | — | — |
| 5 | JS-side launch orchestration | W1 | [ ] | Mobile | — | — |
| 6 | Mount MpvRenderView at PlayerActivity content root | W2 | [ ] | Mobile | — | — |
| 7 | Surface identity guard & native pointer wiring | W2 | [ ] | Mobile | — | — |
| 8 | Transparent root for React Native view tree | W2 | [ ] | Mobile | — | — |
| 9 | setPictureInPictureParams in PlayerActivity | W2 | [ ] | Mobile | — | — |
| 10 | RemoteAction broadcast receiver + PiP enter/exit | W2 | [ ] | Mobile | — | — |
| 11 | Audio intent extra in openPlayer | W3 | [ ] | Mobile | — | — |
| 12 | Hide MpvRenderView for audio | W3 | [ ] | Mobile | — | — |
| 13 | Audio UI conditional rendering | W3 | [ ] | Mobile | — | — |
| 14 | Audio background playback groundwork | W3 | [ ] | Mobile | — | — |
| 15 | Audio PiP | W3 | [ ] | Mobile | — | — |
| 16 | Create MediaPlaybackService | W4 | [ ] | Mobile | — | — |
| 17 | Bind/Unbind service in PlayerActivity | W4 | [ ] | Mobile | — | — |
| 18 | MediaSession setup | W4 | [ ] | Mobile | — | — |
| 19 | Media metadata on lock screen | W4 | [ ] | Mobile | — | — |
| 20 | Bluetooth / wired headset controls | W4 | [ ] | Mobile | — | — |
| 21 | PlayerProvider and config | W5 | [ ] | Mobile | — | — |
| 22 | Theme propagation | W5 | [ ] | Mobile | — | — |
| 23 | Custom controls slot (renderControls prop) | W5 | [ ] | Mobile | — | — |
| 24 | Default controls component | W5 | [ ] | Mobile | — | — |
| 25 | Surface placeholder component | W5 | [ ] | Mobile | — | — |
| 26 | Create module directory structure | W6 | [ ] | Mobile | — | — |
| 27 | Move Android code to module | W6 | [ ] | Mobile | — | — |
| 28 | Create module build.gradle | W6 | [ ] | Mobile | — | — |
| 29 | Move TypeScript code | W6 | [ ] | Mobile | — | — |
| 30 | package.json and react-native.config.js | W6 | [ ] | Mobile | — | — |
| 31 | PlayerPackage for ReactPackage registration | W6 | [ ] | Mobile | — | — |
| 32 | Module documentation | W6 | [ ] | Mobile | — | — |
| 33 | Unit tests for native module | W7 | [ ] | Mobile | — | — |
| 34 | TypeScript unit tests | W7 | [ ] | Mobile | — | — |
| 35 | Manual QA test matrix | W7 | [ ] | QA | — | — |
| 36 | Memory leak audit | W7 | [ ] | Mobile | — | — |
| 37 | Performance benchmarks | W7 | [ ] | Mobile | — | — |
| 38 | Error handling & recovery | W7 | [ ] | Mobile | — | — |
| 39 | Logging & debug mode | W7 | [ ] | Mobile | — | — |
| 40 | Example app | W7 | [ ] | Mobile | — | — |
| 41 | Feature flag cutover | W8 | [ ] | Mobile | — | — |
| 42 | Remove inline player from MainActivity | W8 | [ ] | Mobile | — | — |
| 43 | Update navigation | W8 | [ ] | Mobile | — | — |
| 44 | Update usePipLifecycle.ts | W8 | [ ] | Mobile | — | — |
| 45 | Clean up V11 debug logs | W8 | [ ] | Mobile | — | — |
| 46 | Update V11 docs | W8 | [ ] | Mobile | — | — |
| 47 | Final QA | W8 | [ ] | QA | — | — |
| 48 | V12.0.0 release | W8 | [ ] | Mobile | — | — |

---

## 13. Glossary

| Term | Definition |
|---|---|
| **mpv** | The open-source media player (`mpv-player/mpv`), written in C99 with C++ for the renderer. |
| **libmpv** | The embeddable library form of mpv. What we link against. |
| **wid** | mpv's "window ID" property. We bind it to a `Surface` so mpv renders into our SurfaceView. |
| **vo=gpu** | mpv's GPU-accelerated video output driver. Uses EGL/GLES on Android. |
| **VRI** | Virtual Rendering Instance. The activity's drawing output buffer that the PiP compositor samples. |
| **SurfaceFlinger** | Android's window compositor. Combines all visible surfaces into the final display. |
| **BLAST** | Buffer Layer Allocator for Surface Texture. Modern SurfaceFlinger buffer queue mechanism. |
| **Z-order** | Layer stacking order. SurfaceView's default is BELOW the activity window. |
| **HWUI** | Android's hardware-accelerated UI renderer (draws the view tree). Pauses for paused activities. |
| **TurboModule** | React Native's new (post-2022) native module system. Type-safe, lazy-loaded. |
| **Companion pattern** | Kotlin `companion object` holding a static reference for accessing module state from non-module contexts (e.g., MainActivity → MpvBridgeModule companion). |
| **Heritage mpv-android** | `github.com/mpv-android/mpv-android`. The reference SurfaceView-based mpv player we mirror. |
| **mpvKt** | `github.com/abdallahmehiz/mpvKt`. Compose-based fork of mpv-android with "Smoother PiP" as an explicit feature. |
| **rn-pip** | `github.com/micaiah-effiong/rn-pip`. Reference RN PiP module whose companion pattern we adopted. |
| **Autolinking** | React Native's mechanism for automatically linking native modules from NPM packages. |
| **AAR** | Android Archive. The compiled output of an Android library module. |

---

## 14. References

- **heritage mpv-android** (`BaseMPVView.kt`):
  https://github.com/mpv-android/mpv-android/blob/master/app/src/main/java/is/xyz/mpv/BaseMPVView.kt
- **mpvKt PlayerActivity**:
  https://github.com/abdallahmehiz/mpvKt/blob/main/app/src/main/java/live/mehiz/mpvkt/ui/player/PlayerActivity.kt
- **mpvKt PipActions**:
  https://github.com/abdallahmehiz/mpvKt/blob/main/app/src/main/java/live/mehiz/mpvkt/ui/player/PipActions.kt
- **rn-pip module**:
  https://github.com/micaiah-effiong/rn-pip/blob/main/android/src/main/java/com/rnpip/RnPipModule.java
- **React Native Autolinking docs**:
  https://reactnative.dev/docs/the-new-architecture/pure-cxx-modules
- **Android PiP developer guide**:
  https://developer.android.com/develop/ui/views/tasks-and-back-stack/picture-in-picture
- **Android MediaSession guide**:
  https://developer.android.com/media/session/building-a-media-app

---

## 15. Change Log

| Date | Author | Change |
|---|---|---|
| 2026-09-01 | Mobile team | Initial draft — V12.0.0 planning based on V11 PiP investigation |

---

*End of document. Next step: begin Phase 1 (Create PlayerActivity skeleton).*