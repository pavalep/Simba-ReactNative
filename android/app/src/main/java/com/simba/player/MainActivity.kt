// ─── Wave 8 / Phase 45 — V11 debug-log cleanup ─────────────────
//
// This is the V11 consumer-app MainActivity — kept around as the
// emergency rollback path when `USE_DEDICATED_PLAYER_ACTIVITY = false`
// (see [`SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md)
// + [`SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md) §5).
//
// **Phase 45 changes:**
//   • `onPictureInPictureModeChanged` PiP log gated behind `BuildConfig.DEBUG`
//     (the V11-era diagnostic from the PiP black-screen investigation)
//   • Documented in [`SIMBA_PLAYER_MODULE_V12_DEBUG_LOG_CLEANUP.md`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_DEBUG_LOG_CLEANUP.md) §3.1
//
// **V21 (2026-10-12) — this file is now the ONLY player activity.**
//   The statements below described the V11/V12 rollback path. Two of them
//   were still being read as current fact, and both were wrong:
//   • `android:supportsPictureInPicture="true"` is **PRESENT** on
//     MainActivity (re-added in 9879a3e). It was removed in Phase 44 and
//     restored when the collapse to one Activity made MainActivity the
//     PiP host. Android's guidance is that PiP is entered by the *top*
//     activity, so once video plays here, this is the activity that must
//     declare it — see `md/SIMBA_PLAYER_V21_SPECIFICATION.md`.
//   • `onPictureInPictureModeChanged` / the PiP back handler below are NOT
//     dead code. They only become the live path in this commit series, once
//     MainActivity renders video. They are load-bearing.
//   What actually is still deferred:
//       - `USE_DEDICATED_PLAYER_ACTIVITY = false` rollback path references
//         elsewhere point at a constant this file no longer has.
//       - `NowPlayingScreen.tsx` is NOT dead (F5's earlier note claiming
//         zero callers was wrong — it has one live call site, so deleting
//         it breaks navigation).
package com.simba.player

import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.simba.player.mpv.MPVLib
import com.simba.player.mpv.MpvBridgeModule

class MainActivity : ReactActivity() {

  private var pipReceiver: PipActionReceiver? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    // Switch from splash theme to app theme before RN renders
    setTheme(R.style.AppTheme)
    super.onCreate(savedInstanceState)
    // v11 T8.2: pin to USER_PORTRAIT so the rest of the app
    // (Home / Library / Sheets / modals) stays portrait-locked
    // even though the manifest no longer has the
    // `android:screenOrientation="portrait"` attribute. The
    // player (MpvBridgeModule.setOrientation) is the only
    // authority that can change it during a session.
    requestedOrientation = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT
    // 2026-10-16: no surface is mounted here any more.
    //
    // This window used to call `PlayerSurface.mount(this)`, which created an
    // `MpvRenderView`, inserted it at `android.R.id.content` index 0 and
    // registered it — a SIBLING of the React root, not a descendant. That
    // arrangement is why an opaque React root could paint over every decoded
    // frame (the V11 bug this block was written to "prevent by
    // construction"), why presenting video took two explicit calls in a fixed
    // order (size, then reveal, because a 0x0 SurfaceView is an invalid libmpv
    // target), and why the dock had to hand window pixels to the engine.
    //
    // The picture is now `<SimbaVideo>` from the player library: a real
    // `codegenNativeComponent` view registered by the library's
    // `PlayerPackage`, rendered inside the React tree. React Native owns its
    // layout, its z-order and its lifecycle.
    //
    // Mounting it here as well would be actively wrong, not merely redundant:
    // both views bind the SAME mpv handle, and `attachSurfaceLocked` rebinds on
    // every `setNativePtr`, so two surfaces would fight over one engine and the
    // symptom would be a black picture with nothing in the log.
    //
    // Register PiP action broadcast receiver (API 33+ requires flag)
    pipReceiver = PipActionReceiver()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      registerReceiver(pipReceiver, PipManager.intentFilter(), Context.RECEIVER_EXPORTED)
    } else {
      registerReceiver(pipReceiver, PipManager.intentFilter())
    }
    // NOTE: Auto PiP removed intentionally. PiP entry is now explicit only —
    // triggered by JS swipe-down gesture or programmatic enterPip() call.
    // This prevents the full activity (including UI chrome) from rendering in PiP.
  }

  override fun onResume() {
    super.onResume()
    // V21 — this used to pin USER_PORTRAIT unconditionally on every
    // resume. That was a workaround for the TWO-Activity architecture:
    // video lived in `PlayerActivity`, so "MainActivity resumed" always
    // meant "the user is browsing", and forcing portrait was harmless.
    //
    // Once video plays *here*, the same line becomes the opposite of
    // correct — it fights the session's own orientation, so returning to
    // the app snaps a landscape film to portrait mid-playback.
    //
    // Orientation during a session is owned by the session
    // (`MpvBridgeModule.setOrientation`), so the only thing resume owes is
    // the safety net: never come back to a landscape app that has nothing
    // playing. That is answered by asking mpv, not by guessing from our own
    // flags — `PlaybackHost` is the process-global owner of the libmpv
    // handle and is documented as the read path for exactly this.
    //
    // `idle` and `stopped` are mpv's "no media" states. `loading`, `play`,
    // `pause` and `eof-reached` all mean something is still loaded, so the
    // session's orientation is left alone.
    if (!isMediaLoaded()) {
      requestedOrientation = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT
    }
  }

  /**
   * Whether mpv currently has media loaded.
   *
   * A live read through [PlaybackHost], never cached — the same rule that
   * file documents ("read it at the moment of use"). Everything that can go
   * wrong here degrades to "no media", which is the conservative answer for
   * this one question: it can restore portrait a moment early, but it can
   * never leave a browsing app stuck in landscape.
   */
  private fun isMediaLoaded(): Boolean {
    val ptr = PlaybackHost.handle()
    if (ptr == 0L) return false
    return try {
      val state = MPVLib.nativeGetProperty(ptr, "playback-state").trim().trim('"')
      state.isNotEmpty() && state != "idle" && state != "stopped"
    } catch (e: Exception) {
      // The native lease guard refuses calls against a destroyed engine;
      // that is a normal outcome, not a crash.
      false
    }
  }

  override fun onDestroy() {
    super.onDestroy()
    pipReceiver?.let { unregisterReceiver(it) }
    pipReceiver = null
    // Nothing to unmount: the video picture is a React view now, so React
    // Native owns its teardown along with every other view in the tree.
  }

  override fun getMainComponentName(): String = "SimbaPlayer"


  // V21 F5: `createReactActivityDelegate()` is gone. Its only job was to
  // hand the React root a per-tree "am I the player activity?" fact via
  // `initialProps`, which `PlayerHostProvider` published to the chrome.
  // Both ends are deleted: one Activity means one React root, so there is
  // nothing for the flag to disambiguate. RN's default delegate applies.
  //
  // What this file still owns, and must keep: `onPictureInPictureModeChanged`
  // (below) and the PiP-aware back handler. Android enters PiP from the
  // *top* activity, so this Activity is the PiP host and these are
  // load-bearing, not rollback leftovers.

  companion object {
    private const val TAG = "MainActivity"
  }

  // ── PiP mode change callback ──
  override fun onPictureInPictureModeChanged(
    isInPictureInPictureMode: Boolean,
    newConfig: Configuration,
  ) {
    super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
    // V21 — this handler is now the LIVE path, not the V11 rollback path.
    // Its comment used to describe it as the emergency branch, citing a
    // `USE_DEDICATED_PLAYER_ACTIVITY` constant that no longer exists and a
    // "Phase 47 deletes the whole V11 MainActivity PiP path" that never
    // happened. Android enters PiP from the *top* activity, so once playback
    // lives in MainActivity this is the only PiP callback there will be.
    if (BuildConfig.DEBUG) {
      android.util.Log.i(TAG, "onPictureInPictureModeChanged: isInPip=$isInPictureInPictureMode")
    }
    // Delegate to MpvBridgeModule which holds the ReactApplicationContext
    // captured at module construction. Bridgeless RN: MainActivity cannot
    // resolve the ReactContext reliably at PiP entry time, so the actual
    // DeviceEventManagerModule emit happens in the module companion.
    MpvBridgeModule.onPictureInPictureModeChanged(isInPictureInPictureMode)
  }

  // ── Back button while in PiP: exit PiP mode to return to app ──
  //
  // V21 F5: the fallback below is `super.onBackPressed()`, which finishes
  // the Activity and closes the app. That was correct when this file was
  // one of two Activities and the player lived in the other one. It is
  // wrong now: this is the only Activity, and back on a video screen is
  // "minimise to the dock", which is a JS concern — the JS layer already
  // owns that gesture via the presentation store.
  //
  // Dispatching the key to the view hierarchy lets the JS `BackHandler`
  // registered by `MiniPlayer` consume it. If JS does not handle it (for
  // example on the Home screen), `super` still runs and the app closes as
  // the user expects. The order matters: PiP is checked first because a
  // PiP window has no JS back handler behind it.
  override fun onBackPressed() {
    // PiP is checked FIRST: a PiP window has no JS behind it, so the
    // Activity has to close itself.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && isInPictureInPictureMode) {
      // Finish exits PiP mode and restores the activity to foreground
      finish()
      return
    }
    // Everything else goes to React Native, and ONLY to React Native.
    //
    // `super.onBackPressed()` IS `ReactActivity.onBackPressed()` ->
    // `mDelegate.onBackPressed()` -> `ReactHostImpl.onBackPressed()` ->
    // `DeviceEventManagerModule.emitHardwareBackPressed()` -> the JS
    // `hardwareBackPress` event -> the app's `BackHandler` subscribers.
    // The JS side then decides what the press means: a subscriber that
    // returns true has consumed it (the player lanes close), and if nobody
    // consumes it RN calls `exitApp()`, which finishes the Activity — the
    // platform default.
    //
    // V22 W22c (2026-10-26) — this override used to dispatch a SYNTHETIC
    // `KEYCODE_BACK` into the view hierarchy first, and returned early when
    // the hierarchy said it had handled the key. The file's own comment
    // said the dispatch existed "so the JS BackHandler can consume it".
    //
    // It could never do that. The JS `BackHandler` is not a key-event
    // listener: it subscribes to the `hardwareBackPress` DEVICE EVENT, and
    // that event is emitted only by `emitHardwareBackPressed()`. A
    // view-level `dispatchKeyEvent` does not emit it. So the dispatch never
    // gave the press to JS, and its early return stopped RN's own route
    // from ever running.
    //
    // Measured on device (emulator-5554, API 37), 2026-10-26, with
    // `Log.i` on each branch:
    //
    //   [BACKPROBE] onBackPressed entered pip=false sdk=37
    //   [BACKPROBE] synthetic dispatch down=true up=false
    //   [BACKPROBE] EARLY RETURN — super.onBackPressed() was NOT called
    //
    // and the JS probe never fired. The Android back button was DEAD
    // everywhere in the app — in the player and on Home alike, where it
    // should have closed the app. The header chevron closed the player
    // correctly in the same state, so the close verb itself was fine; only
    // the hardware path into it was missing.
    //
    // See bug `B-011` in md/SIMBA_BUG_TRACKER_2026_10_21.md, and
    // `__tests__/app/MainActivityBackPress.test.ts` for the guard that keeps
    // this from coming back.
    super.onBackPressed()
  }
}
