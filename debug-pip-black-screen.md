# Debug Session: pip-black-screen
- **Status**: [FIX APPLIED — pending user verification]
- **Issue**: Video playback enters Picture-in-Picture, but the PiP window turns blank/black while fullscreen playback remains visible when expanded back.
- **Debug Server**: N/A (logcat-only analysis)
- **Log Files**:
  - `adb_logcat_2026-09-01_13-53-35_pip-investigation.txt` (first capture, 314 KB, real PiP transition)
  - `adb_logcat_2026-09-01_13-56-31_pip-investigation.txt` (second capture, 759 KB, two PiP transitions, full mpv lifecycle)

## Reproduction Steps
1. Install latest APK on `emulator-5554`.
2. Start video playback.
3. Tap PiP control.
4. PiP window shows ~1 stale frame, then goes black.
5. Tap to expand back → video is visible again.

## Hypotheses & Verification (revised after fresh captures)
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | Surface (TextureView/SurfaceView) rebind not firing or mpv wid stale | High | Low | **Rejected** — SurfaceView `surfaceChanged 598x336` *did* fire on PiP entry in capture 1; mpv `time-pos` advances through PiP without pause in capture 2. Rebind logic is not the cause. |
| B | mpv `hwdec=mediacodec` direct mode fails on PiP surface churn | Medium | Low | **Rejected** — playback keeps decoding across PiP transition (`time-pos` 88.42 → 89.06 inside the PiP window). Decoder chain is healthy. |
| C | Animated transform layer desyncs the SurfaceView's SurfaceFlinger layer | Medium | Low | **Rejected** — capture 1 shows `MpvRenderView: [seq=N] surfaceChanged` events firing correctly under the existing layout. No transform-related anomaly in the log. |
| D | Native PiP callback throws on bridgeless React Native, JS never receives `onPipModeChanged`, React tree keeps fullscreen layout | High | Low | **Confirmed** — `adb_logcat_2026-09-01_13-56-31_pip-investigation.txt:4516-4523` shows `MainActivity: onPictureInPictureModeChanged: JS emit failed` → `java.lang.IllegalStateException: Cannot get ReactInstanceManager without a ReactNativeHost.` at `MainActivity.kt:85`. |
| E | Earlier log set (Aug 25) was too stale to diagnose | High | Low | **Confirmed** — deleted; replaced with the two fresh dated captures above. |

## Log Evidence (from the dated 2026-09-01 captures)

Capture 1 (`adb_logcat_2026-09-01_13-53-35_pip-investigation.txt`):

```
09-01 13:56:15.122  ReactNativeJS: [PlaybackTrace][V3][pip:enter:native] calling enterPip title='The Vanishing Shadow: Chapter 10 - The Iron Death'
09-01 13:56:15.125  MpvBridgeModule: [PipTrace] enterPip called: ...
09-01 13:56:15.141  MpvBridgeModule: [PipTrace] enterPip: calling enterPictureInPictureMode(pipParams)
09-01 13:56:15.156  MpvBridgeModule: [PipTrace] enterPip: enterPictureInPictureMode returned
09-01 13:56:17.221  MainActivity: onPictureInPictureModeChanged: isInPip=true bounds=337
09-01 13:56:17.256  MainActivity: onPictureInPictureModeChanged: JS emit failed
09-01 13:56:17.256  java.lang.IllegalStateException: Cannot get ReactInstanceManager without a ReactNativeHost.
                   at com.facebook.react.ReactDelegate.getReactInstanceManager(ReactDelegate.kt:418)
                   at com.facebook.react.ReactActivityDelegate.getReactInstanceManager(ReactActivityDelegate.java:123)
                   at com.facebook.react.ReactActivity.getReactInstanceManager(ReactActivity.java:179)
                   at com.simba.player.MainActivity.onPictureInPictureModeChanged(MainActivity.kt:85)
```

Capture 2 (`adb_logcat_2026-09-01_13-56-31_pip-investigation.txt`) — same trace, twice (entry & exit), plus mpv keeps decoding:

```
09-01 13:58:20.960  ReactNativeJS: [V3][pip:enter:native] calling enterPip ...
09-01 13:58:20.975  MpvBridgeModule: [PipTrace] enterPip: enterPictureInPictureMode returned
09-01 13:58:21.045  ActivityTaskManager: Skip adjustForMinimalTaskDimensions for pip task
09-01 13:58:21.229  MpvJNI: [getPosition] result=0 position=89.055722   (mpv still decoding, ~88.4 -> 89.0)
09-01 13:58:22.727  MainActivity: onPictureInPictureModeChanged: isInPip=true bounds=337
09-01 13:58:22.770  MainActivity: onPictureInPictureModeChanged: JS emit failed
09-01 13:58:22.770  java.lang.IllegalStateException: Cannot get ReactInstanceManager without a ReactNativeHost.
```

## Verification Conclusion

- **D is the root cause**: a single line, [MainActivity.kt:85](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/MainActivity.kt#L85), calls `reactInstanceManager?.currentReactContext`. In bridgeless React Native this getter throws `IllegalStateException`. The exception is caught (the `catch (_: Exception)` block swallows it), so the JS layer never receives `onPipModeChanged`. JS therefore keeps the fullscreen React tree mounted inside the now-PiP'd activity window.
- mpv keeps decoding (capture 2), SurfaceView keeps producing frames — those frames just never reach a correctly-shaped PiP layer because the JS tree didn't re-layout. The PiP window shows ~1 stale frame ("came in initially"), then goes black. Expanding to fullscreen restores the original layout, so frames become visible again.

## Fix

[MainActivity.kt](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/android/app/src/main/java/com/simba/player/MainActivity.kt):

- Added import: `com.facebook.react.ReactApplication`
- In `onPictureInPictureModeChanged`, replaced the bridgeless-incompatible access with the bridgeless host:

```kotlin
(application as? ReactApplication)?.reactHost?.currentReactContext
  ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
  ?.emit("onPipModeChanged", params)
```

## Cleanup completed this session

- Reverted to HEAD (no diff vs HEAD): `android/app/src/main/cpp/main.cpp`, `MpvRenderView.kt`, `MpvBridgeModule.kt`, `VideoHost.tsx`, `VideoPresentationShell.tsx`, `VideoPipAdapter.ts`. Earlier surface/transform/hwdec changes were red herrings.
- Deleted 7 stale `adb_logcat_*` files dated `25-08-2026`.
- Kept: the new capture script files (`capture-pip-logs.ps1`, `run-capture-pip-logs.bat`, `RUN_CAPTURE.txt`) and the two fresh dated log captures, for post-fix verification.

## Verification step (user action)

After rebuild + reinstall on `emulator-5554`:

```powershell
X:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\run-capture-pip-logs.bat
```

Then in the app: open a video, tap PiP, screenshot the PiP window, expand back, Ctrl-C to flush the file. Filter for `MainActivity` in the resulting dated log — you should see `MainActivity: onPictureInPictureModeChanged: emitted onPipModeChanged to JS` (instead of `JS emit failed`), and the PiP window should now show live video.
