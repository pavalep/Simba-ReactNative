package com.simba.player.mpv

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray
import org.json.JSONObject

/**
 * Turbo Module / Native Module bridge between React Native JS and libmpv.
 *
 * Registered as "MpvPlayerModule" — matches the TS Spec name in
 * NativeMpvPlayer.ts.
 */
@ReactModule(name = MpvBridgeModule.NAME)
class MpvBridgeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "MpvPlayerModule"
        private const val TAG = "MpvBridgeModule"
    }

    override fun getName(): String = NAME

    // ── State ──────────────────────────────────────────────────────────────

    /** Native mpv_handle* stored as Long (0 = uninitialized). */
    private var nativePtr: Long = 0

    /** Event emitter for JS-side event listeners. */
    private val eventEmitter: DeviceEventManagerModule.RCTDeviceEventEmitter by lazy {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
    }

    // ── MPVLib Listener → JS Event Bridge ──────────────────────────────────

    private val mpvListener = object : MPVLib.MpvEventListener {
        override fun onMpvEvent(event: String, jsonPayload: String) {
            // Map to JS event name conventions
            val jsEvent = when (event) {
                "fileLoaded"        -> "onFileLoaded"
                "startFile"         -> "onStartFile"
                "endFile"           -> "onEndFile"
                "playbackRestart"   -> "onPlaybackRestart"
                "seek"              -> "onSeek"
                else                -> event
            }
            try {
                val payload = JsonUtil.jsonStringToReactMap(jsonPayload)
                eventEmitter.emit(jsEvent, payload)
            } catch (e: Exception) {
                Log.w(TAG, "Failed to emit event $jsEvent: ${e.message}")
            }
        }

        override fun onMpvPropertyChanged(name: String, jsonValue: String) {
            try {
                val payload = Arguments.createMap().apply {
                    putString("property", name)
                    putString("value", jsonValue)
                }
                eventEmitter.emit("onPropertyChanged", payload)
            } catch (e: Exception) {
                Log.w(TAG, "Property change emit failed: ${e.message}")
            }
        }

        override fun onMpvError(code: Int, message: String) {
            val payload = Arguments.createMap().apply {
                putInt("code", code)
                putString("message", message)
            }
            eventEmitter.emit("onError", payload)
        }
    }

    // ── Playback Control ───────────────────────────────────────────────────

    @ReactMethod
    fun play() {
        ensurePtr()
        MPVLib.nativePlay(nativePtr)
    }

    @ReactMethod
    fun pause() {
        ensurePtr()
        MPVLib.nativePause(nativePtr)
    }

    @ReactMethod
    fun stop() {
        ensurePtr()
        MPVLib.nativeStop(nativePtr)
    }

    @ReactMethod
    fun togglePlayPause() {
        ensurePtr()
        MPVLib.nativeTogglePlayPause(nativePtr)
    }

    @ReactMethod
    fun seekForward(seconds: Double) {
        ensurePtr()
        MPVLib.nativeSeekRelative(nativePtr, seconds)
    }

    @ReactMethod
    fun seekBackward(seconds: Double) {
        ensurePtr()
        MPVLib.nativeSeekRelative(nativePtr, -seconds)
    }

    @ReactMethod
    fun seekAbsolute(position: Double) {
        ensurePtr()
        MPVLib.nativeSeek(nativePtr, position)
    }

    @ReactMethod
    fun stepFrame(direction: Double) {
        ensurePtr()
        MPVLib.nativeStepFrame(nativePtr, direction.toInt())
    }

    @ReactMethod
    fun screenshot(): String {
        ensurePtr()
        return MPVLib.nativeScreenshot(nativePtr)
    }

    // ── File Loading ───────────────────────────────────────────────────────

    @ReactMethod
    fun loadFile(path: String) {
        ensurePtr()
        MPVLib.nativeLoadFile(nativePtr, path)
    }

    @ReactMethod
    fun loadPlaylist(paths: ReadableArray, startIndex: Double) {
        ensurePtr()
        val arr = Array(paths.size()) { i -> paths.getString(i) ?: "" }
        MPVLib.nativeLoadPlaylist(nativePtr, arr, startIndex.toInt())
    }

    @ReactMethod
    fun getFileInfo(): ReadableMap {
        ensurePtr()
        val title = try {
            MPVLib.nativeGetProperty(nativePtr, "media-title")
        } catch (_: Exception) { "" }
        val path = try {
            MPVLib.nativeGetProperty(nativePtr, "path")
        } catch (_: Exception) { "" }
        val duration = getDuration()
        return Arguments.createMap().apply {
            putString("path", path)
            putString("title", title)
            putDouble("duration", duration)
        }
    }

    @ReactMethod
    fun getVideoParams(): ReadableMap {
        ensurePtr()
        val w = try { MPVLib.nativeGetProperty(nativePtr, "width") } catch (_: Exception) { "0" }
        val h = try { MPVLib.nativeGetProperty(nativePtr, "height") } catch (_: Exception) { "0" }
        val fps = try { MPVLib.nativeGetProperty(nativePtr, "estimated-vf-fps") } catch (_: Exception) { "0" }
        val codec = try { MPVLib.nativeGetProperty(nativePtr, "video-codec") } catch (_: Exception) { "" }
        return Arguments.createMap().apply {
            putDouble("videoWidth", w.toDoubleOrNull() ?: 0.0)
            putDouble("videoHeight", h.toDoubleOrNull() ?: 0.0)
            putDouble("aspectRatio", if (h.toDoubleOrNull() ?: 0.0 > 0)
                (w.toDoubleOrNull() ?: 1.0) / (h.toDoubleOrNull() ?: 1.0) else 1.0)
            putDouble("fps", fps.toDoubleOrNull() ?: 0.0)
            putString("codec", codec.trim('"'))
        }
    }

    // ── Tracks ─────────────────────────────────────────────────────────────

    @ReactMethod
    fun getTracks(): ReadableArray {
        ensurePtr()
        val json = try {
            MPVLib.nativeGetProperty(nativePtr, "track-list")
        } catch (_: Exception) { "[]" }
        return try {
            jsonStringToReactArray(json)
        } catch (_: Exception) {
            Arguments.createArray()
        }
    }

    @ReactMethod
    fun selectTrack(trackId: Double) {
        ensurePtr()
        MPVLib.nativeSelectTrack(nativePtr, trackId.toInt())
    }

    @ReactMethod
    fun cycleTrack(type: String) {
        ensurePtr()
        when (type) {
            "video" -> MPVLib.nativeSetProperty(nativePtr, "cycle", "\"video\"")
            "audio" -> MPVLib.nativeSetProperty(nativePtr, "cycle", "\"audio\"")
            "sub"   -> MPVLib.nativeSetProperty(nativePtr, "cycle", "\"sub\"")
        }
    }

    @ReactMethod
    fun setTrackVisibility(trackType: String, visible: Boolean) {
        // No-op: mpv handles track visibility automatically
    }

    // ── Chapters ───────────────────────────────────────────────────────────

    @ReactMethod
    fun getChapters(): ReadableArray {
        ensurePtr()
        val json = try {
            MPVLib.nativeGetProperty(nativePtr, "chapter-list")
        } catch (_: Exception) { "[]" }
        return try {
            jsonStringToReactArray(json)
        } catch (_: Exception) {
            Arguments.createArray()
        }
    }

    @ReactMethod
    fun seekChapter(direction: Double) {
        ensurePtr()
        if (direction > 0) {
            MPVLib.nativeSetProperty(nativePtr, "chapter", "1")
        } else {
            MPVLib.nativeSetProperty(nativePtr, "chapter", "-1")
        }
    }

    @ReactMethod
    fun getCurrentChapter(): ReadableMap {
        ensurePtr()
        val json = try {
            MPVLib.nativeGetProperty(nativePtr, "chapter-metadata")
        } catch (_: Exception) { "null" }
        if (json == "null" || json.isEmpty()) return Arguments.createMap()
        return try {
            JsonUtil.jsonStringToReactMap(json)
        } catch (_: Exception) {
            Arguments.createMap()
        }
    }

    // ── Volume / Audio ─────────────────────────────────────────────────────

    @ReactMethod
    fun setVolume(volume: Double) {
        ensurePtr()
        MPVLib.nativeSetVolume(nativePtr, volume)
    }

    @ReactMethod
    fun getVolume(): Double {
        ensurePtr()
        return MPVLib.nativeGetVolume(nativePtr)
    }

    @ReactMethod
    fun setMuted(muted: Boolean) {
        ensurePtr()
        MPVLib.nativeSetMuted(nativePtr, muted)
    }

    @ReactMethod
    fun getMuted(): Boolean {
        ensurePtr()
        return MPVLib.nativeGetMuted(nativePtr)
    }

    @ReactMethod
    fun getAudioDevices(): ReadableArray {
        ensurePtr()
        val json = try {
            MPVLib.nativeGetProperty(nativePtr, "audio-device-list")
        } catch (_: Exception) { "[]" }
        return try {
            jsonStringToReactArray(json)
        } catch (_: Exception) {
            Arguments.createArray()
        }
    }

    @ReactMethod
    fun setAudioDevice(deviceName: String) {
        ensurePtr()
        MPVLib.nativeSetProperty(nativePtr, "audio-device", "\"$deviceName\"")
    }

    // ── Playback Speed ─────────────────────────────────────────────────────

    @ReactMethod
    fun setSpeed(speed: Double) {
        ensurePtr()
        MPVLib.nativeSetSpeed(nativePtr, speed)
    }

    @ReactMethod
    fun getSpeed(): Double {
        ensurePtr()
        return MPVLib.nativeGetSpeed(nativePtr)
    }

    // ── Loop / Repeat ──────────────────────────────────────────────────────

    @ReactMethod
    fun setLoopMode(mode: String) {
        ensurePtr()
        val m = when (mode) {
            "file"     -> 1
            "playlist" -> 2
            else       -> 0
        }
        MPVLib.nativeSetLoopMode(nativePtr, m)
    }

    @ReactMethod
    fun getLoopMode(): String {
        ensurePtr()
        return when (MPVLib.nativeGetLoopMode(nativePtr)) {
            1 -> "file"
            2 -> "playlist"
            else -> "none"
        }
    }

    @ReactMethod
    fun setPlaylistLoop(loop: Boolean) {
        ensurePtr()
        MPVLib.nativeSetLoopMode(nativePtr, if (loop) 2 else 0)
    }

    // ── Properties ─────────────────────────────────────────────────────────

    @ReactMethod
    fun getProperty(name: String): String {
        ensurePtr()
        return MPVLib.nativeGetProperty(nativePtr, name)
    }

    @ReactMethod
    fun setProperty(name: String, value: String) {
        ensurePtr()
        MPVLib.nativeSetProperty(nativePtr, name, value)
    }

    @ReactMethod
    fun observeProperty(name: String) {
        ensurePtr()
        MPVLib.nativeObserveProperty(nativePtr, name)
    }

    @ReactMethod
    fun unobserveProperty(name: String) {
        ensurePtr()
        MPVLib.nativeUnobserveProperty(nativePtr, name)
    }

    // ── Video/Audio Filters ────────────────────────────────────────────────

    @ReactMethod
    fun setVideoFilter(filter: String, enabled: Boolean) {
        ensurePtr()
        MPVLib.nativeSetVideoFilter(nativePtr, filter, enabled)
    }

    @ReactMethod
    fun setAudioFilter(filter: String, enabled: Boolean) {
        ensurePtr()
        MPVLib.nativeSetAudioFilter(nativePtr, filter, enabled)
    }

    // ── Playlist ───────────────────────────────────────────────────────────

    @ReactMethod
    fun getPlaylist(): ReadableArray {
        ensurePtr()
        val json = try {
            MPVLib.nativeGetProperty(nativePtr, "playlist")
        } catch (_: Exception) { "[]" }
        val arr = Arguments.createArray()
        try {
            val jArr = JSONArray(json)
            for (i in 0 until jArr.length()) {
                val entry = jArr.getJSONObject(i)
                arr.pushString(entry.optString("filename", ""))
            }
        } catch (_: Exception) {}
        return arr
    }

    @ReactMethod
    fun playlistNext() {
        ensurePtr()
        MPVLib.nativePlaylistNext(nativePtr)
    }

    @ReactMethod
    fun playlistPrev() {
        ensurePtr()
        MPVLib.nativePlaylistPrev(nativePtr)
    }

    @ReactMethod
    fun playlistRemove(index: Double) {
        ensurePtr()
        MPVLib.nativePlaylistRemove(nativePtr, index.toInt())
    }

    @ReactMethod
    fun playlistShuffle() {
        ensurePtr()
        MPVLib.nativePlaylistShuffle(nativePtr)
    }

    @ReactMethod
    fun playlistClear() {
        ensurePtr()
        MPVLib.nativePlaylistClear(nativePtr)
    }

    // ── State Queries ──────────────────────────────────────────────────────

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getPosition(): Double {
        return if (nativePtr != 0L) MPVLib.nativeGetPosition(nativePtr) else 0.0
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getDuration(): Double {
        return if (nativePtr != 0L) MPVLib.nativeGetDuration(nativePtr) else 0.0
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getPlaybackState(): String {
        if (nativePtr == 0L) return "idle"
        val state = try {
            MPVLib.nativeGetProperty(nativePtr, "core-idle").trim('"')
        } catch (_: Exception) { "true" }
        return if (state.toBoolean()) "paused" else "playing"
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun isMuted(): Boolean {
        return if (nativePtr != 0L) MPVLib.nativeGetMuted(nativePtr) else false
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────

    @ReactMethod
    fun initPlayer(): Boolean {
        if (nativePtr != 0L) {
            Log.w(TAG, "Already initialized")
            return true
        }
        nativePtr = MPVLib.nativeCreate()
        if (nativePtr == 0L) {
            Log.e(TAG, "Failed to create mpv instance")
            return false
        }
        Log.i(TAG, "mpv initialized, nativePtr=$nativePtr")
        return true
    }

    @ReactMethod
    fun destroy() {
        if (nativePtr != 0L) {
            MPVLib.nativeDestroy()
            nativePtr = 0L
            Log.i(TAG, "mpv destroyed")
        }
    }

    override fun initialize() {
        super.initialize()
        MPVLib.addListener(mpvListener)
    }

    override fun onCatalystInstanceDestroy() {
        destroy()
        MPVLib.removeListener(mpvListener)
        super.onCatalystInstanceDestroy()
    }

    // ── Native Pointer (for MpvRenderView) ─────────────────────────────────

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getNativePtr(): Double {
        return nativePtr.toDouble()
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private fun ensurePtr() {
        if (nativePtr == 0L) {
            throw IllegalStateException("MpvPlayerModule not initialized. Call initPlayer() first.")
        }
    }

    private fun jsonStringToReactArray(json: String): ReadableArray {
        val arr = Arguments.createArray()
        val jArr = JSONArray(json)
        for (i in 0 until jArr.length()) {
            val item = jArr.get(i)
            when (item) {
                is JSONObject -> arr.pushMap(JsonUtil.jsonStringToReactMap(item.toString()))
                is JSONArray -> arr.pushArray(jsonStringToReactArray(item.toString()))
                is String -> arr.pushString(item)
                is Number -> arr.pushDouble(item.toDouble())
                is Boolean -> arr.pushBoolean(item)
            }
        }
        return arr
    }
}

/**
 * Utility for JSON string <-> ReadableMap conversions.
 */
internal object JsonUtil {
    fun jsonStringToReactMap(json: String): ReadableMap {
        val map = Arguments.createMap()
        val obj = JSONObject(json)
        for (key in obj.keys()) {
            val value = obj.get(key)
            when (value) {
                is String -> map.putString(key, value)
                is Int -> map.putInt(key, value)
                is Long -> map.putDouble(key, value.toDouble())
                is Double -> map.putDouble(key, value)
                is Boolean -> map.putBoolean(key, value)
                is JSONObject -> map.putMap(key, jsonStringToReactMap(value.toString()))
                is JSONArray -> {
                    val arr = Arguments.createArray()
                    for (i in 0 until value.length()) {
                        val el = value.get(i)
                        when (el) {
                            is String -> arr.pushString(el)
                            is Number -> arr.pushDouble(el.toDouble())
                            is Boolean -> arr.pushBoolean(el)
                            is JSONObject -> arr.pushMap(jsonStringToReactMap(el.toString()))
                        }
                    }
                    map.putArray(key, arr)
                }
            }
        }
        return map
    }
}
