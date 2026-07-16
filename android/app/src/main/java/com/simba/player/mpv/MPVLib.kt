package com.simba.player.mpv

import android.graphics.SurfaceTexture
import android.util.Log
import android.view.Surface
import org.json.JSONArray
import org.json.JSONObject

/**
 * JNI bridge to native libmpv via C++ glue in main.cpp / property.cpp / event.cpp.
 *
 * All native methods are designed as static so the C side can hold a single
 * mpv_handle* without needing a Java object reference.
 */
object MPVLib {

    private const val TAG = "MPVLib"

    // ── Lifecycle ──────────────────────────────────────────────────────────

    /** Create mpv instance. Returns native pointer as Long. */
    external fun nativeCreate(): Long

    /** Destroy mpv instance. */
    external fun nativeDestroy()

    /** Attach/detach an Android Surface for video output (wid API). */
    external fun nativeAttachSurface(nativePtr: Long, surface: Surface?)

    // ── Playback Control ───────────────────────────────────────────────────

    external fun nativeLoadFile(nativePtr: Long, path: String)
    external fun nativePlay(nativePtr: Long)
    external fun nativePause(nativePtr: Long)
    external fun nativeStop(nativePtr: Long)
    external fun nativeTogglePlayPause(nativePtr: Long)
    external fun nativeSeek(nativePtr: Long, position: Double)
    external fun nativeSeekRelative(nativePtr: Long, seconds: Double)
    external fun nativeStepFrame(nativePtr: Long, direction: Int)
    external fun nativeScreenshot(nativePtr: Long): String

    // ── Volume ─────────────────────────────────────────────────────────────

    external fun nativeSetVolume(nativePtr: Long, volume: Double)
    external fun nativeGetVolume(nativePtr: Long): Double
    external fun nativeSetMuted(nativePtr: Long, muted: Boolean)
    external fun nativeGetMuted(nativePtr: Long): Boolean

    // ── Speed ──────────────────────────────────────────────────────────────

    external fun nativeSetSpeed(nativePtr: Long, speed: Double)
    external fun nativeGetSpeed(nativePtr: Long): Double

    // ── Loop ───────────────────────────────────────────────────────────────

    external fun nativeSetLoopMode(nativePtr: Long, mode: Int)
    external fun nativeGetLoopMode(nativePtr: Long): Int

    // ── Playlist ───────────────────────────────────────────────────────────

    external fun nativeLoadPlaylist(nativePtr: Long, paths: Array<String>, startIndex: Int)
    external fun nativePlaylistNext(nativePtr: Long)
    external fun nativePlaylistPrev(nativePtr: Long)
    external fun nativePlaylistRemove(nativePtr: Long, index: Int)
    external fun nativePlaylistShuffle(nativePtr: Long)
    external fun nativePlaylistClear(nativePtr: Long)

    // ── Tracks ─────────────────────────────────────────────────────────────

    external fun nativeSelectTrack(nativePtr: Long, trackId: Int)

    // ── Properties ─────────────────────────────────────────────────────────

    external fun nativeGetProperty(nativePtr: Long, name: String): String
    external fun nativeSetProperty(nativePtr: Long, name: String, valueJson: String?)
    external fun nativeObserveProperty(nativePtr: Long, name: String)
    external fun nativeUnobserveProperty(nativePtr: Long, name: String)

    // ── Filters ────────────────────────────────────────────────────────────

    external fun nativeSetVideoFilter(nativePtr: Long, filter: String, enable: Boolean)
    external fun nativeSetAudioFilter(nativePtr: Long, filter: String, enable: Boolean)

    // ── State Queries ──────────────────────────────────────────────────────

    external fun nativeGetPosition(nativePtr: Long): Double
    external fun nativeGetDuration(nativePtr: Long): Double

    // ── Callbacks invoked from C++ event thread ────────────────────────────

    /** Called from native event loop thread via JNI. */
    @JvmStatic
    fun onNativeEvent(event: String, jsonPayload: String) {
        Log.d(TAG, "onNativeEvent: $event $jsonPayload")
        listeners.forEach { it.onMpvEvent(event, jsonPayload) }
    }

    /** Called from native event loop when an observed property changes. */
    @JvmStatic
    fun onNativePropertyChanged(name: String, jsonValue: String) {
        Log.d(TAG, "onNativePropertyChanged: $name = $jsonValue")
        listeners.forEach { it.onMpvPropertyChanged(name, jsonValue) }
    }

    /** Called from native on error. */
    @JvmStatic
    fun onNativeError(code: Int, message: String) {
        Log.e(TAG, "onNativeError: code=$code msg=$message")
        listeners.forEach { it.onMpvError(code, message) }
    }

    // ── Listener pattern ───────────────────────────────────────────────────

    interface MpvEventListener {
        fun onMpvEvent(event: String, jsonPayload: String) = Unit
        fun onMpvPropertyChanged(name: String, jsonValue: String) = Unit
        fun onMpvError(code: Int, message: String) = Unit
    }

    private val listeners = mutableListOf<MpvEventListener>()

    fun addListener(listener: MpvEventListener) {
        listeners.add(listener)
    }

    fun removeListener(listener: MpvEventListener) {
        listeners.remove(listener)
    }

    // ── Load native library ────────────────────────────────────────────────

    init {
        System.loadLibrary("simbaplayer_mpv")
    }
}
