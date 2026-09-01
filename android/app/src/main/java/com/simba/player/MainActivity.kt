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

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  // ── PiP mode change callback ──
  override fun onPictureInPictureModeChanged(
    isInPictureInPictureMode: Boolean,
    newConfig: Configuration,
  ) {
    super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
    android.util.Log.i("MainActivity", "onPictureInPictureModeChanged: isInPip=$isInPictureInPictureMode")
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
