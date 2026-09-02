package com.simba.player

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Phase 31: the V12 module ships its own `PlayerPackage`
          // (a `TurboReactPackage` in the `com.simba.player` root
          // package). It registers `MpvBridgeModule` as a TurboModule
          // and supersedes the V11 `com.simba.player.mpv.MpvPlayerPackage`
          // (which was deleted in Phase 31).
          add(PlayerPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
