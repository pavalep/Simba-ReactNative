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
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.DeviceEventManagerModule

class MainActivity : ReactActivity() {

  private var pipReceiver: PipActionReceiver? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    // Switch from splash theme to app theme before RN renders
    setTheme(R.style.AppTheme)
    super.onCreate(savedInstanceState)
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
    val params = Bundle().apply {
      putBoolean("isInPip", isInPictureInPictureMode)
    }
    try {
      reactInstanceManager?.currentReactContext
        ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        ?.emit("onPipModeChanged", params)
    } catch (_: Exception) {
      // React context not yet available
    }
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
