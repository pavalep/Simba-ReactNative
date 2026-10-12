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
import com.simba.player.mpv.MPVLib
import com.simba.player.mpv.MpvBridgeModule
import com.simba.player.mpv.MpvRenderView
import com.simba.player.mpv.PlayerSurface

class MainActivity : ReactActivity() {

  private var pipReceiver: PipActionReceiver? = null

  /**
   * The mounted video surface, or `null` when [PlayerSurface.mount] refused.
   *
   * Held only so [onDestroy] can unmount the exact view it mounted. It is not
   * a cache of "is there a surface" — the library's `PlayerSurface.current()`
   * is the authority for that, and it is deliberately read at the moment of
   * use rather than mirrored here.
   */
  private var videoSurface: MpvRenderView? = null

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
    // V21 F2b — mount the video surface in THIS window.
    //
    // `PlayerSurface.mount()` is the library's single implementation of
    // "create the render view, place it beneath the React root, register it".
    // It is the same call `PlayerActivity` makes, so there is one mount path
    // rather than two that can drift — the app never constructs a lib view,
    // it only hands over an Activity.
    //
    // The surface comes up GONE at 0x0. Presenting video is therefore always
    // two explicit calls — size it (`setVideoBounds` / `fillBounds`), then
    // show it (`setSurfaceVisible(true)`) — which is what F3's in-app route and
    // F4's mini player will drive. Until then this window is pure app UI with
    // no full-bleed surface over it, so the V11 "opaque React root covers the
    // video" failure is prevented by construction rather than by anyone
    // remembering to set a background correctly.
    videoSurface = PlayerSurface.mount(this)
    if (videoSurface == null) {
      // mount() already logged the concrete reason (no content root, wrong
      // container type, wrong thread). Say it again at the host level: from
      // the app's point of view this window simply cannot present video.
      android.util.Log.e(TAG, "no render surface mounted; this window cannot present video")
    }
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
    // V21 F2b — tear the surface down through the same library call that
    // mounted it, so removing the view and withdrawing it from the registry
    // stay one identity-checked step. Unmounting without clearing the
    // registration would leave `PlayerSurface` publishing a detached view and
    // the surface mutators reporting success against a surface with no window.
    videoSurface?.let { PlayerSurface.unmount(it) }
    videoSurface = null
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
    private const val TAG = "MainActivity"

    /** Initial-prop key read by `App.tsx` → `PlayerHostProvider`. */
    const val EXTRA_IS_PLAYER_ACTIVITY = "isPlayerActivity"
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
  override fun onBackPressed() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && isInPictureInPictureMode) {
      // Finish exits PiP mode and restores the activity to foreground
      finish()
      return
    }
    super.onBackPressed()
  }
}
