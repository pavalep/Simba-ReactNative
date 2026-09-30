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
// **V21 W4 P15 (2026-09-10) — half of the V11 surface retired:**
//   • `MediaNotificationService.kt` (387 lines) — REMOVED. Manifest
//     registration deleted. The library's `MediaPlaybackService` is
//     now the sole foreground-notification owner.
//   • `android:supportsPictureInPicture="true"` on MainActivity — REMOVED
//     from the manifest. MainActivity has zero PiP consumers since
//     Phase 44 retired the inline-mount hooks.
//   • This file (MainActivity.kt) — REMAINS. It's the JS bundle host —
//     deleting it would break the entire app launch flow.
//   • Remaining V11 cleanup deferred to V22:
//       - `PipActionReceiver`, `onPictureInPictureModeChanged`,
//         `onBackPressed`-to-PiP exit handler are dead code (T15.06).
//       - The `USE_DEDICATED_PLAYER_ACTIVITY = false` rollback path is
//         itself likely dead (NowPlayingScreen.tsx has zero callers).
package com.simba.player

import android.app.PictureInPictureParams
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.util.Rational
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.DeviceEventManagerModule
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
    // v11 T8.2: re-pin to USER_PORTRAIT on every resume. This
    // catches the "user went to home screen in landscape, then
    // returned to the app" case — the manifest pin no longer
    // exists, so the activity would otherwise stay in whatever
    // orientation the user left it in. The JS layer's unmount
    // cleanup (T8.1) also calls setOrientation('portrait') on
    // close, but the resume path is the safety net for any
    // other backgrounding flow (notification panel, recent
    // apps, in-app modal that pauses the activity).
    requestedOrientation = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT
  }

  override fun onDestroy() {
    super.onDestroy()
    pipReceiver?.let { unregisterReceiver(it) }
    pipReceiver = null
  }

  override fun getMainComponentName(): String = "SimbaPlayer"

  /**
   * W6.0 — hand the React root a PER-TREE "am I the player activity?"
   * fact.
   *
   * The lib's `MpvBridgeModule.isCurrentActivityPlayer()` cannot answer
   * this question honestly: its backing field is a process-wide
   * `@Volatile @JvmStatic` on the companion object, so while
   * `PlayerActivity` is alive EVERY React root in the process — including
   * this background one — reads `true`. That is the right answer for the
   * lib's own "don't steal launch params" guard, but it is the wrong
   * answer for the app's chrome gate, which needs to know whether
   * *this* tree has a player surface underneath it.
   *
   * React context and `initialProps` are per-ROOT, so the launch
   * options are the correct channel: each activity's delegate supplies
   * the flag when it creates its own React root, and the flag can never
   * be observed by the other activity's tree. `App.tsx` reads it from
   * the root component's props and publishes it through
   * `PlayerHostProvider`.
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
        override fun getLaunchOptions(): Bundle = Bundle().apply {
          putBoolean(EXTRA_IS_PLAYER_ACTIVITY, false)
        }
      }

  companion object {
    /** Initial-prop key read by `App.tsx` → `PlayerHostProvider`. */
    const val EXTRA_IS_PLAYER_ACTIVITY = "isPlayerActivity"
  }

  // ── PiP mode change callback ──
  override fun onPictureInPictureModeChanged(
    isInPictureInPictureMode: Boolean,
    newConfig: Configuration,
  ) {
    super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
    // ── Phase 45 (Wave 8) cleanup ──
    // V11-era diagnostic log from the PiP black-screen investigation
    // (see `debug-pip-black-screen.md` — Hypothesis D + capture 2).
    // Gated behind `BuildConfig.DEBUG` so production users see no log
    // spam; release builds preserve the diagnostic locally for dev runs.
    //
    // The V12 active path logs the equivalent event at
    // `react-native-media-player/android/.../PlayerActivity.kt:1210`
    // (`Log.i(TAG, "onPictureInPictureModeChanged: isInPip=...")`).
    // When `USE_DEDICATED_PLAYER_ACTIVITY = true` (Phase 41 cutover),
    // the V12 `PlayerActivity` is the activity that enters PiP — this
    // V11 log only fires under the emergency rollback path
    // (`USE_DEDICATED_PLAYER_ACTIVITY = false`). Phase 47 deletes the
    // whole V11 MainActivity PiP path; see
    // [`SIMBA_PLAYER_MODULE_V12_DEBUG_LOG_CLEANUP.md`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_DEBUG_LOG_CLEANUP.md) §3.1.
    if (BuildConfig.DEBUG) {
      android.util.Log.i("MainActivity", "onPictureInPictureModeChanged: isInPip=$isInPictureInPictureMode")
    }
    // Delegate to MpvBridgeModule which holds the ReactApplicationContext
    // captured at module construction. Bridgeless RN: MainActivity cannot
    // resolve the ReactContext reliably at PiP entry time, so the actual
    // DeviceEventManagerModule emit happens in the module companion.
    MpvBridgeModule.onPictureInPictureModeChanged(isInPictureInPictureMode)
  }

  // ── Back button while in PiP: exit PiP mode to return to app ──
  override fun onBackPressed() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && isInPictureInPictureMode) {
      // Finish exits PiP mode and restores the activity to foreground
      finish()
      return
    }
    super.onBackPressed()
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
  }
}
