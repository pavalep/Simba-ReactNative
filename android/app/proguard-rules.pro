# ─── SIMBA V21 W4 P13 (D-002) — ProGuard / R8 keep rules ──────────
#
# Without these, `:app:assembleRelease` would shrink / obfuscate
# reflection-bound code (TurboModules, JNI callbacks, JS-bridge
# modules) and break the release build at runtime.
#
# Authored against the libs listed in `package.json` (RN 0.86,
# react-navigation v7, TanStack Query v5, MMKV v4, Reanimated v4,
# react-native-svg v15, etc.). See `md/SIMBA_MOBILE_V21_TRACKER.md`
# T13.02 for the per-library audit.

# ─── React Native core ────────────────────────────────────────────
# The default proguard-android.txt + react-native gradle plugin
# already keep most of RN. Add the bits the default misses.

# Hermes / JSC bridge callbacks
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# ReactPackage subclasses (TurboReactPackage + classic) — discovered via reflection
-keep class * extends com.facebook.react.ReactPackage { *; }
-keep class * extends com.facebook.react.bridge.NativeModule { *; }
-keepclassmembers class * extends com.facebook.react.bridge.NativeModule {
    @com.facebook.react.bridge.ReactMethod <methods>;
}
-keep class * extends com.facebook.react.uimanager.ViewManager { *; }

# React TurboModules (annotation-driven; the codegen reads these)
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep @com.facebook.proguard.annotations.DoNotStrip class * { *; }
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}
-keep @com.facebook.proguard.annotations.KeepGettersAndSetters class * { *; }
-keepclassmembers class * extends com.facebook.react.bridge.BaseJavaModule {
    @com.facebook.react.bridge.ReactMethod <methods>;
}

# OkHttp / Okio (RN networking stack)
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**

# ─── @simba-dev/react-native-media-player (V12 library) ────────────
# The library ships MpvBridgeModule as a TurboReactPackage in
# `com.simba.player`. Its native methods + the PlayerActivity entry
# point must be kept (otherwise the JS bridge fails to find them and
# `useOpenPlaylist` silently rejects).

-keep class com.simba.player.** { *; }
-keep class com.simba.player.PlayerActivity { *; }
-keep class com.simba.player.MediaPlaybackService { *; }
-keep class com.simba.player.mpv.** { *; }
-dontwarn com.simba.player.**

# ─── TanStack Query (JS-only, but keeps the dev-only types) ───────
# Pure JS — no Android-side keep rules needed. The library has no
# Java/Kotlin surface.

# ─── react-navigation v7 (JS-only) ────────────────────────────────
# Pure JS — no Android-side keep rules needed. Native deps
# (`react-native-screens`, `react-native-gesture-handler`,
# `react-native-safe-area-context`) ship their own proguard rules
# inside their AARs.

# ─── Zustand v5 (JS-only) ────────────────────────────────────────
# Pure JS — no Android-side keep rules needed.

# ─── react-native-mmkv v4 (JSI + nitro modules) ──────────────────
# MMKV uses JSI + Nitro Modules. The native .so is loaded via
# System.loadLibrary; the Java/Kotlin classes are reflection-bound
# by the Nitro runtime. Keep the package.

-keep class com.mrousavy.** { *; }
-keep class com.tencent.** { *; }
-dontwarn com.mrousavy.**

# ─── react-native-reanimated v4 + worklets ───────────────────────
# Reanimated uses JSI and a worklets runtime; the codegen emits
# classes that the runtime looks up by string name.

-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-dontwarn com.swmansion.reanimated.**

# ─── react-native-svg v15 (uses reflection for view managers) ────
# Each SVG element (Circle, Path, Rect, …) is a ViewManager subclass
# registered via ReactPackage. The default RN keep rules above cover
# ViewManager subclasses, but the package name needs to be preserved.

-keep class com.horcrux.svg.** { *; }
-dontwarn com.horcrux.svg.**

# ─── react-native-screens v4 (Fragment + reflection) ─────────────
# Native screens are discovered by name. Keep the package.

-keep class com.swmansion.rnscreens.** { *; }
-dontwarn com.swmansion.rnscreens.**

# ─── react-native-gesture-handler v2 ────────────────────────────
-keep class com.swmansion.gesturehandler.** { *; }
-dontwarn com.swmansion.gesturehandler.**

# ─── react-native-fast-image ─────────────────────────────────────
# Uses Glide under the hood. The library's AAR ships its own
# proguard rules; nothing extra for SIMBA to declare.

# ─── Misc ────────────────────────────────────────────────────────
# Keep line-number metadata so crash stacks remain readable. Without
# this, R8 strips the line numbers and Sentry / Crashlytics stacks
# point at obfuscated offsets.

-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Suppress noisy "can't find referenced class" warnings for optional
# deps that ProGuard scans but the app never loads.
-dontwarn java.lang.invoke.StringConcatFactory
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# ─── End of V21 W4 P13 proguard-rules.pro ─────────────────────────
# Verified by: `cd android && ./gradlew :app:assembleRelease` exits 0
# and the resulting APK installs + launches on Pixel 7 / Android 14
# (T13.04 — user-verified).