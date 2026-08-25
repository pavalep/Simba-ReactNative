package com.simba.player.mpv

import android.content.Intent
import android.util.Log
import java.io.File
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

    /**
     * Property observers requested by JS before native initialization completes.
     * Keep them until the handle exists instead of silently dropping them.
     */
    private val pendingObservedProperties = linkedSetOf<String>()

    // ── MPVLib Listener → JS Event Bridge ──────────────────────────────────

    private val mpvListener = object : MPVLib.MpvEventListener {
        override fun onMpvEvent(event: String, jsonPayload: String) {
            Log.i(TAG, "[PlaybackTrace][Bridge][listener:event] name=$event payload=$jsonPayload")
            // Map to JS event name conventions
            val jsEvent = when (event) {
                "fileLoaded"        -> "onFileLoaded"
                "startFile"         -> "onStartFile"
                "endFile"           -> "onEndFile"
                "playbackRestart"   -> "onPlaybackRestart"
                "seek"              -> "onSeek"
                "surfaceAttached"   -> "onSurfaceAttached"
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
            Log.i(TAG, "[PlaybackTrace][Bridge][listener:property] name=$name value=$jsonValue")
            try {
                val payload = Arguments.createMap().apply {
                    putString("property", name)
                    putString("value", jsonValue)
                }
                eventEmitter.emit("onPropertyChanged", payload)
            } catch (e: Exception) {
                Log.w(TAG, "Property change emit failed: ${e.message}")
            }
            // P33.4: re-emit `cache-buffering-state` updates as `onBuffering`
            // so the JS UI can show a buffering spinner for slow streams
            // (notably archive.org which progressively buffers before the
            // first frame). mpv reports the property as:
            //   • a node map {"percent": <0..100>} while actively buffering
            //   • the literal string "false" once the cache is full / idle
            // We always emit 100 on the "false" case so the JS guard
            //   `percent > 0 && percent < 100` correctly drops the spinner.
            when (name) {
                "cache-buffering-state" -> {
                    val percent = parseBufferingPercent(jsonValue)
                    try {
                        val bufPayload = Arguments.createMap().apply {
                            putDouble("percent", percent)
                            putBoolean("isBuffering", percent < 100.0)
                        }
                        eventEmitter.emit("onBuffering", bufPayload)
                    } catch (e: Exception) {
                        Log.w(TAG, "onBuffering emit failed: ${e.message}")
                    }
                }
                // `paused-for-cache` is the universal stall signal. Do not
                // encode it as a fabricated fill percentage; the JS layer gets
                // the explicit boolean and preserves the last honest cache fill.
                "paused-for-cache" -> {
                    val isBuffering = jsonValue.trim().equals("true", ignoreCase = true)
                    try {
                        val bufPayload = Arguments.createMap().apply {
                            putDouble("percent", if (isBuffering) 0.0 else 100.0)
                            putBoolean("isBuffering", isBuffering)
                        }
                        eventEmitter.emit("onBuffering", bufPayload)
                    } catch (e: Exception) {
                        Log.w(TAG, "onBuffering (paused-for-cache) emit failed: ${e.message}")
                    }
                }
                // `demuxer-cache-state` carries the buffered ranges — the
                // grey overlay on the seek bar. Each range is
                // `{start, end, flags}` in MPV; we extract `start`/`end`
                // (in seconds, relative to the stream start) and forward
                // them as a list so JS can paint the buffered region.
                "demuxer-cache-state" -> {
                    try {
                        val parsed = parseCacheState(jsonValue)
                        val rangesArray = Arguments.createArray()
                        parsed.ranges.forEach { r ->
                            val range = Arguments.createMap().apply {
                                putDouble("start", r.first)
                                putDouble("end", r.second)
                            }
                            rangesArray.pushMap(range)
                        }
                        val cachePayload = Arguments.createMap().apply {
                            putArray("ranges", rangesArray)
                            putDouble("fill", parsed.fill)
                        }
                        eventEmitter.emit("onCacheState", cachePayload)
                    } catch (e: Exception) {
                        Log.w(TAG, "onCacheState emit failed: ${e.message}")
                    }
                }
                // `seekable` is a flag — true once MPV knows enough about
                // the stream to permit seeks. False for live streams and
                // unknown-length sources. The seek bar dims when false.
                "seekable" -> {
                    val seekable = jsonValue.trim().equals("true", ignoreCase = true)
                    try {
                        val seekablePayload = Arguments.createMap().apply {
                            putBoolean("seekable", seekable)
                        }
                        eventEmitter.emit("onSeekable", seekablePayload)
                    } catch (e: Exception) {
                        Log.w(TAG, "onSeekable emit failed: ${e.message}")
                    }
                }
                "seeking" -> {
                    val seeking = jsonValue.trim().equals("true", ignoreCase = true)
                    try {
                        val seekingPayload = Arguments.createMap().apply {
                            putBoolean("seeking", seeking)
                        }
                        eventEmitter.emit("onSeeking", seekingPayload)
                    } catch (e: Exception) {
                        Log.w(TAG, "onSeeking emit failed: ${e.message}")
                    }
                }
                // Keep the dedicated JS event contract backed by mpv's generic
                // property observer stream. These events are consumed by both
                // the playback controller and TransportContext for low-latency
                // state updates; polling remains as a defensive fallback.
                "time-pos" -> emitNumericEvent("onPositionChanged", "position", jsonValue)
                "duration" -> emitNumericEvent("onDurationChanged", "duration", jsonValue)
                "volume" -> emitNumericEvent("onVolumeChanged", "volume", jsonValue)
                "speed" -> emitNumericEvent("onSpeedChanged", "speed", jsonValue)
                "pause" -> {
                    val paused = jsonValue.trim().trim('"').equals("true", ignoreCase = true)
                    emitPlaybackStateEvent(if (paused) "paused" else "playing")
                }
                "idle-active", "eof-reached" -> emitPlaybackStateEvent(getPlaybackState())
            }
        }

        override fun onMpvError(code: Int, message: String, requestId: String?) {
            Log.e(TAG, "[PlaybackTrace][Bridge][listener:error] code=$code requestId=${requestId ?: "none"} message=$message")
            val payload = Arguments.createMap().apply {
                putInt("code", code)
                putString("message", message)
                if (!requestId.isNullOrBlank()) putString("requestId", requestId)
            }
            eventEmitter.emit("onError", payload)
        }
    }

    private fun emitNumericEvent(eventName: String, key: String, rawValue: String) {
        val value = rawValue.trim().trim('"').toDoubleOrNull() ?: return
        try {
            val payload = Arguments.createMap().apply {
                putDouble(key, value)
            }
            eventEmitter.emit(eventName, payload)
        } catch (e: Exception) {
            Log.w(TAG, "$eventName emit failed: ${e.message}")
        }
    }

    private fun emitPlaybackStateEvent(state: String) {
        try {
            val payload = Arguments.createMap().apply {
                putString("state", state)
            }
            eventEmitter.emit("onPlaybackStateChanged", payload)
        } catch (e: Exception) {
            Log.w(TAG, "onPlaybackStateChanged emit failed: ${e.message}")
        }
    }

    // ── Screen Brightness ──

    @ReactMethod
    fun setScreenBrightness(brightness: Double) {
        val activity = getCurrentActivity() ?: return
        val layout = activity.window.attributes
        layout.screenBrightness = brightness.toFloat().coerceIn(0.0f, 1.0f)
        activity.window.attributes = layout
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getScreenBrightness(): Double {
        val activity = getCurrentActivity() ?: return 1.0
        val b = activity.window.attributes.screenBrightness
        return if (b < 0f) 1.0 else b.toDouble()
    }

    // ── Playback ──

    @ReactMethod
    fun play() {
        ensurePtr()
        Log.i(TAG, "[PlaybackTrace][Bridge][play] ptr=$nativePtr")
        MPVLib.nativePlay(nativePtr)
        Log.i(TAG, "[PlaybackTrace][Bridge][play] nativePlay returned")
    }

    @ReactMethod
    fun pause() {
        ensurePtr()
        Log.i(TAG, "[PlaybackTrace][Bridge][pause] ptr=$nativePtr")
        MPVLib.nativePause(nativePtr)
        Log.i(TAG, "[PlaybackTrace][Bridge][pause] nativePause returned")
    }

    @ReactMethod
    fun stop() {
        ensurePtr()
        Log.i(TAG, "[PlaybackTrace][Bridge][stop] ptr=$nativePtr")
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
        Log.i(TAG, "[PlaybackTrace][Bridge][seekAbsolute] position=$position ptr=$nativePtr")
        MPVLib.nativeSeek(nativePtr, position)
    }

    @ReactMethod
    fun stepFrame(direction: Double) {
        ensurePtr()
        MPVLib.nativeStepFrame(nativePtr, direction.toInt())
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun screenshot(): String {
        ensurePtr()
        val tempFile = File(reactApplicationContext.cacheDir, "screenshot_temp.png")
        return MPVLib.nativeScreenshot(nativePtr, tempFile.absolutePath)
    }

    /**
     * Capture a thumbnail screenshot for a given file URI and save it to the
     * app's cache directory with a unique name derived from the URI hash.
     * Returns the absolute path to the saved thumbnail file.
     *
     * The thumbnail persists in cache and is used by the recent-files list to
     * show a preview of where the user left off.
     */
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun captureThumbnail(uri: String): String {
        ensurePtr()
        val cacheDir = reactApplicationContext.cacheDir
        val hash = uri.hashCode().toLong() and 0x7FFFFFFF
        val thumbFile = File(cacheDir, "thumb_${hash}.png")
        return MPVLib.nativeScreenshot(nativePtr, thumbFile.absolutePath)
    }

    // ── File Loading ───────────────────────────────────────────────────────

    @ReactMethod
    fun loadFile(path: String) {
        ensurePtr()
        val resolvedPath = normalizeMpvInput(resolveContentUri(path))
        Log.i(TAG, "[PlaybackTrace][Bridge][loadFile] requested=$path resolved=$resolvedPath ptr=$nativePtr")
        try {
            MPVLib.nativeLoadFile(nativePtr, resolvedPath)
            Log.i(TAG, "[PlaybackTrace][Bridge][loadFile] nativeLoadFile returned")
        } catch (e: Exception) {
            Log.e(TAG, "[PlaybackTrace][Bridge][loadFile] nativeLoadFile threw: ${e.message}", e)
            throw e
        }
    }

    @ReactMethod
    fun loadFileWithRequestId(path: String, requestId: String) {
        ensurePtr()
        if (requestId.isBlank()) {
            loadFile(path)
            return
        }
        val resolvedPath = normalizeMpvInput(resolveContentUri(path))
        Log.i(TAG, "[PlaybackTrace][Bridge][loadFileWithRequestId] requested=$path resolved=$resolvedPath requestId=$requestId ptr=$nativePtr")
        try {
            MPVLib.nativeLoadFileWithRequestId(nativePtr, resolvedPath, requestId)
            Log.i(TAG, "[PlaybackTrace][Bridge][loadFileWithRequestId] nativeLoadFileWithRequestId returned requestId=$requestId")
        } catch (e: Exception) {
            Log.e(TAG, "[PlaybackTrace][Bridge][loadFileWithRequestId] failed: ${e.message}", e)
            throw e
        }
    }

    /**
     * Grant persistable URI permission for a content:// URI so it survives
     * app restarts and device reboots.
     *
     * We only request READ permission because we never write to user files.
     * Requesting WRITE when the picker only granted READ causes a
     * SecurityException that silently fails the entire grant, leaving the
     * URI inaccessible after restart.
     */
    @ReactMethod
    fun grantPersistablePermission(uri: String) {
        try {
            val contentUri = android.net.Uri.parse(uri)
            val takeFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION
            reactApplicationContext.contentResolver
                .takePersistableUriPermission(contentUri, takeFlags)
            Log.i(TAG, "Persistable read permission granted for: $uri")
        } catch (e: SecurityException) {
            Log.e(TAG, "Persistable permission DENIED for $uri: ${e.message}")
        } catch (e: Exception) {
            Log.w(TAG, "Could not grant persistable permission for $uri: ${e.message}")
        }
    }

    /**
     * Verify that a content:// URI is still accessible (returns true/false).
     * This is used by JS to check whether a recent-file entry with a content://
     * URI is still valid — it tries to open the URI via ContentResolver and
     * checks if it returns a valid file descriptor.
     *
     * Returns false if the file was deleted or the persistable permission was
     * revoked (e.g. after app data clear or OS-level permission reset).
     */
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun verifyContentUri(uri: String): Boolean {
        if (!uri.startsWith("content://")) return true // non-content URIs assumed valid
        return try {
            val context = reactApplicationContext
            val contentUri = android.net.Uri.parse(uri)
            val parcelFd = context.contentResolver.openFileDescriptor(contentUri, "r")
            if (parcelFd != null) {
                parcelFd.close()
                true
            } else {
                false
            }
        } catch (e: Exception) {
            Log.w(TAG, "verifyContentUri FAILED for $uri: ${e.message}")
            false
        }
    }

    /**
     * Resolve a content:// URI to an fd://N path so MPV can read it directly
     * from the original file without copying to cache.
     *
     * Uses Android's ContentResolver to open the content URI, extracts the raw
     * file descriptor, and returns "fd://<N>" for MPV's built-in fd:// protocol.
     * MPV closes the fd automatically when playback ends.
     */
    private fun normalizeMpvInput(uri: String): String {
        if (!uri.startsWith("http://") && !uri.startsWith("https://")) return uri
        // Archive and other API providers occasionally return raw spaces in
        // path segments. libmpv's curl backend rejects those as an illegal
        // URL, so encode only whitespace/control characters and preserve
        // already-escaped URLs and valid query delimiters.
        return uri
            .replace(" ", "%20")
            .replace("\t", "%09")
            .replace("\r", "%0D")
            .replace("\n", "%0A")
    }

    private fun resolveContentUri(uri: String): String {
        if (!uri.startsWith("content://")) return uri
        try {
            val context = reactApplicationContext
            val contentUri = android.net.Uri.parse(uri)
            val parcelFd = context.contentResolver.openFileDescriptor(contentUri, "r")
                ?: return uri
            val fd = parcelFd.detachFd()
            val fdUri = "fd://$fd"
            Log.i(TAG, "Resolved content:// URI to $fdUri")
            return fdUri
        } catch (e: Exception) {
            Log.e(TAG, "Failed to resolve content:// URI: ${e.message}")
            return uri
        }
    }

    @ReactMethod
    fun loadPlaylist(paths: ReadableArray, startIndex: Double) {
        ensurePtr()
        val arr = Array(paths.size()) { i ->
            normalizeMpvInput(resolveContentUri(paths.getString(i) ?: ""))
        }
        MPVLib.nativeLoadPlaylist(nativePtr, arr, startIndex.toInt())
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getFileInfo(): String {
        ensurePtr()
        return JSONObject().apply {
            put("path", try { MPVLib.nativeGetProperty(nativePtr, "path") } catch (_: Exception) { "" })
            put("title", try { MPVLib.nativeGetProperty(nativePtr, "media-title") } catch (_: Exception) { "" })
            put("duration", getDuration())
        }.toString()
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getVideoParams(): String {
        ensurePtr()
        val w = try { MPVLib.nativeGetProperty(nativePtr, "width") } catch (_: Exception) { "0" }
        val h = try { MPVLib.nativeGetProperty(nativePtr, "height") } catch (_: Exception) { "0" }
        val fps = try { MPVLib.nativeGetProperty(nativePtr, "estimated-vf-fps") } catch (_: Exception) { "0" }
        val codec = try { MPVLib.nativeGetProperty(nativePtr, "video-codec") } catch (_: Exception) { "" }
        return JSONObject().apply {
            put("videoWidth", w.toDoubleOrNull() ?: 0.0)
            put("videoHeight", h.toDoubleOrNull() ?: 0.0)
            put("aspectRatio", if (h.toDoubleOrNull() ?: 0.0 > 0)
                (w.toDoubleOrNull() ?: 1.0) / (h.toDoubleOrNull() ?: 1.0) else 1.0)
            put("fps", fps.toDoubleOrNull() ?: 0.0)
            put("codec", codec.trim('"'))
        }.toString()
    }

    // ── Tracks ─────────────────────────────────────────────────────────────

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getTracks(): String {
        ensurePtr()
        return try {
            MPVLib.nativeGetProperty(nativePtr, "track-list")
        } catch (_: Exception) { "[]" }
    }

    @ReactMethod
    fun selectTrack(trackId: Double) {
        ensurePtr()
        MPVLib.nativeSelectTrack(nativePtr, trackId.toInt())
    }

    @ReactMethod
    fun setTrack(type: String, trackId: Double) {
        ensurePtr()
        val prop = when (type) {
            "video" -> "vid"
            "audio" -> "aid"
            "sub" -> "sid"
            else -> return
        }
        val id = trackId.toInt()
        val value = if (id < 0) "no" else id.toString()
        MPVLib.setPropertyString(nativePtr, prop, value)
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

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getChapters(): String {
        ensurePtr()
        return try {
            MPVLib.nativeGetProperty(nativePtr, "chapter-list")
        } catch (_: Exception) { "[]" }
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

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getCurrentChapter(): String {
        ensurePtr()
        return try {
            MPVLib.nativeGetProperty(nativePtr, "chapter-metadata")
        } catch (_: Exception) { "{}" }
    }

    // ── Volume / Audio ─────────────────────────────────────────────────────

    @ReactMethod
    fun setVolume(volume: Double) {
        ensurePtr()
        Log.i(TAG, "[PlaybackTrace][Bridge][setVolume] volume=$volume ptr=$nativePtr")
        MPVLib.nativeSetVolume(nativePtr, volume)
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getVolume(): Double {
        ensurePtr()
        return MPVLib.nativeGetVolume(nativePtr)
    }

    @ReactMethod
    fun setMuted(muted: Boolean) {
        ensurePtr()
        MPVLib.nativeSetMuted(nativePtr, muted)
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getMuted(): Boolean {
        ensurePtr()
        return MPVLib.nativeGetMuted(nativePtr)
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getAudioDevices(): String {
        ensurePtr()
        return try {
            val devices = MPVLib.nativeGetProperty(nativePtr, "audio-device-list")
            Log.i(TAG, "[PlaybackTrace][Bridge][getAudioDevices] $devices")
            devices
        } catch (e: Exception) {
            Log.e(TAG, "[PlaybackTrace][Bridge][getAudioDevices] failed: ${e.message}", e)
            "[]"
        }
    }

    @ReactMethod
    fun setAudioDevice(deviceName: String) {
        ensurePtr()
        Log.i(TAG, "[PlaybackTrace][Bridge][setAudioDevice] device=$deviceName ptr=$nativePtr")
        MPVLib.nativeSetProperty(nativePtr, "audio-device", "\"$deviceName\"")
    }

    // ── Playback Speed ─────────────────────────────────────────────────────

    @ReactMethod
    fun setSpeed(speed: Double) {
        ensurePtr()
        MPVLib.nativeSetSpeed(nativePtr, speed)
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
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

    @ReactMethod(isBlockingSynchronousMethod = true)
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

    @ReactMethod(isBlockingSynchronousMethod = true)
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
        if (name.isBlank()) return
        Log.i(TAG, "[PlaybackTrace][Bridge][observeProperty] name=$name initialized=${nativePtr != 0L}")
        pendingObservedProperties.add(name)
        if (nativePtr == 0L) {
            Log.i(TAG, "Queued property observer '$name' until initPlayer()")
            return
        }
        try {
            MPVLib.nativeObserveProperty(nativePtr, name)
        } catch (e: Exception) {
            Log.w(TAG, "observeProperty('$name') failed: ${e.message}")
        }
    }

    @ReactMethod
    fun unobserveProperty(name: String) {
        pendingObservedProperties.remove(name)
        if (nativePtr == 0L) return
        try {
            MPVLib.nativeUnobserveProperty(nativePtr, name)
        } catch (e: Exception) {
            Log.w(TAG, "unobserveProperty('$name') failed: ${e.message}")
        }
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

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getPlaylist(): String {
        ensurePtr()
        return try {
            MPVLib.nativeGetProperty(nativePtr, "playlist")
        } catch (_: Exception) { "[]" }
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
        val position = if (nativePtr != 0L) MPVLib.nativeGetPosition(nativePtr) else 0.0
        Log.d(TAG, "[PlaybackTrace][Bridge][getPosition] ptr=$nativePtr position=$position")
        return position
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getDuration(): Double {
        val duration = if (nativePtr != 0L) MPVLib.nativeGetDuration(nativePtr) else 0.0
        Log.d(TAG, "[PlaybackTrace][Bridge][getDuration] ptr=$nativePtr duration=$duration")
        return duration
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getPlaybackState(): String {
        if (nativePtr == 0L) {
            Log.d(TAG, "[PlaybackTrace][Bridge][getPlaybackState] ptr=0 state=idle")
            return "idle"
        }
        return try {
            val idle = MPVLib.nativeGetProperty(nativePtr, "idle-active")
                .trim('"').toBoolean()
            if (idle) {
                Log.d(TAG, "[PlaybackTrace][Bridge][getPlaybackState] ptr=$nativePtr state=idle idle=true")
                return "idle"
            }

            val ended = MPVLib.nativeGetProperty(nativePtr, "eof-reached")
                .trim('"').toBoolean()
            if (ended) {
                Log.d(TAG, "[PlaybackTrace][Bridge][getPlaybackState] ptr=$nativePtr state=stopped eof=true")
                return "stopped"
            }

            val paused = MPVLib.nativeGetProperty(nativePtr, "pause")
                .trim('"').toBoolean()
            val state = if (paused) "paused" else "playing"
            Log.d(TAG, "[PlaybackTrace][Bridge][getPlaybackState] ptr=$nativePtr state=$state idle=$idle eof=$ended pause=$paused")
            state
        } catch (e: Exception) {
            Log.e(TAG, "[PlaybackTrace][Bridge][getPlaybackState] failed: ${e.message}", e)
            "idle"
        }
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun isMuted(): Boolean {
        return if (nativePtr != 0L) MPVLib.nativeGetMuted(nativePtr) else false
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────

    private fun prepareMpvCaBundle(): String {
        val target = File(reactApplicationContext.filesDir, "mpv/cacert.pem")
        return try {
            if (!target.exists() || target.length() < 1024L) {
                target.parentFile?.mkdirs()
                reactApplicationContext.assets.open("mpv/cacert.pem").use { input ->
                    target.outputStream().use { output -> input.copyTo(output) }
                }
            }
            Log.i(TAG, "[PlaybackTrace][Bridge][tls] caFile=${target.absolutePath} bytes=${target.length()}")
            target.absolutePath
        } catch (error: Exception) {
            Log.e(TAG, "[PlaybackTrace][Bridge][tls] failed to prepare CA bundle: ${error.message}", error)
            ""
        }
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun initPlayer(): Boolean {
        Log.i(TAG, "[PlaybackTrace][Bridge][initPlayer] call currentPtr=$nativePtr")
        if (nativePtr != 0L) {
            Log.w(TAG, "[PlaybackTrace][Bridge][initPlayer] Already initialized ptr=$nativePtr")
            return true
        }
        val caFilePath = prepareMpvCaBundle()
        nativePtr = MPVLib.nativeCreate(caFilePath)
        Log.i(TAG, "[PlaybackTrace][Bridge][initPlayer] nativeCreate returned ptr=$nativePtr")
        if (nativePtr == 0L) {
            Log.e(TAG, "Failed to create mpv instance")
            return false
        }
        pendingObservedProperties.forEach { property ->
            try {
                MPVLib.nativeObserveProperty(nativePtr, property)
            } catch (e: Exception) {
                Log.w(TAG, "Deferred observeProperty('$property') failed: ${e.message}")
            }
        }
        Log.i(TAG, "mpv initialized, nativePtr=$nativePtr, observers=${pendingObservedProperties.size}")
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

    @ReactMethod
    fun addListener(eventName: String) {
        // Required by NativeEventEmitter. MPVLib listener registration is
        // owned by initialize()/onCatalystInstanceDestroy(), not JS callers.
    }

    @ReactMethod
    fun removeListeners(count: Double) {
        // Required by NativeEventEmitter. Keep the native listener attached
        // for the lifetime of this module instance.
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

    // ── Picture-in-Picture ─────────────────────────────────────────────────

    /**
     * Enter Android Picture-in-Picture mode for the current activity.
     * Called from JS after UI elements have been hidden.
     *
     * @param chapterTitle  Optional — current chapter title shown in PiP notification.
     * @param progressPct   Optional — progress percentage string like "45 %".
     */
    @ReactMethod
    fun enterPip(chapterTitle: String? = null, progressPct: String? = null) {
        val activity = getCurrentActivity()
        if (activity == null || android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.N) return
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                val pipParams = com.simba.player.PipManager.buildPipParams(
                    context = activity,
                    chapterTitle = chapterTitle,
                    progressPercentage = progressPct,
                )
                activity.enterPictureInPictureMode(pipParams)
            } else {
                // API 24–25 support PiP but not PictureInPictureParams.
                activity.enterPictureInPictureMode()
            }
        } catch (_: IllegalStateException) {
            // Activity not in foreground or PiP not supported
        }
    }

    /**
     * Exit PiP mode by bringing the activity to the front.
     * Called from JS when user taps "Expand" in PiP RemoteActions.
     */
    @ReactMethod
    fun exitPip() {
        val activity = getCurrentActivity()
        if (activity == null || android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.N) return
        if (activity.isInPictureInPictureMode) {
            activity.finish()
        }
    }

    /**
     * Exit PiP mode and finish the activity (close player session).
     * Called from JS when user taps "Close" in PiP RemoteActions.
     */
    @ReactMethod
    fun exitPipAndFinish() {
        val activity = getCurrentActivity()
        if (activity == null) return
        activity.finishAndRemoveTask()
    }

    // ── Media Notification Service ─────────────────────────────────────────

    /**
     * Start the foreground [MediaNotificationService] with current track details.
     * The service posts a MediaStyle notification with play/pause/prev/next
     * controls and persists until [stopNotification] is called.
     */
    @ReactMethod
    fun startNotification(
        title: String,
        artist: String,
        album: String,
        fileUri: String,
        artworkPath: String,
        mediaType: String,
        position: Double,
        duration: Double,
    ) {
        val intent = Intent(reactApplicationContext, com.simba.player.MediaNotificationService::class.java).apply {
            putExtra(com.simba.player.MediaNotificationService.EXTRA_TITLE, title)
            putExtra(com.simba.player.MediaNotificationService.EXTRA_ARTIST, artist)
            putExtra(com.simba.player.MediaNotificationService.EXTRA_ALBUM, album)
            putExtra(com.simba.player.MediaNotificationService.EXTRA_FILE_URI, fileUri)
            putExtra(com.simba.player.MediaNotificationService.EXTRA_ARTWORK_PATH, artworkPath)
            putExtra(com.simba.player.MediaNotificationService.EXTRA_MEDIA_TYPE, mediaType)
            putExtra(com.simba.player.MediaNotificationService.EXTRA_POSITION, position.toLong())
            putExtra(com.simba.player.MediaNotificationService.EXTRA_DURATION, duration.toLong())
            putExtra(com.simba.player.MediaNotificationService.EXTRA_IS_PLAYING, true)
        }
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            reactApplicationContext.startForegroundService(intent)
        } else {
            reactApplicationContext.startService(intent)
        }
        Log.i(TAG, "MediaNotificationService started: $title")
    }

    /**
     * Update the existing media notification with fresh playback state.
     * Called periodically (every ~1s) while the service is running.
     */
    @ReactMethod
    fun updateNotification(
        title: String,
        artist: String,
        album: String,
        fileUri: String,
        artworkPath: String,
        mediaType: String,
        position: Double,
        duration: Double,
        isPlaying: Boolean,
    ) {
        val intent = Intent(reactApplicationContext, com.simba.player.MediaNotificationService::class.java).apply {
            action = com.simba.player.MediaNotificationService.ACTION_UPDATE
            putExtra(com.simba.player.MediaNotificationService.EXTRA_TITLE, title)
            putExtra(com.simba.player.MediaNotificationService.EXTRA_ARTIST, artist)
            putExtra(com.simba.player.MediaNotificationService.EXTRA_ALBUM, album)
            putExtra(com.simba.player.MediaNotificationService.EXTRA_FILE_URI, fileUri)
            putExtra(com.simba.player.MediaNotificationService.EXTRA_ARTWORK_PATH, artworkPath)
            putExtra(com.simba.player.MediaNotificationService.EXTRA_MEDIA_TYPE, mediaType)
            putExtra(com.simba.player.MediaNotificationService.EXTRA_POSITION, position.toLong())
            putExtra(com.simba.player.MediaNotificationService.EXTRA_DURATION, duration.toLong())
            putExtra(com.simba.player.MediaNotificationService.EXTRA_IS_PLAYING, isPlaying)
        }
        reactApplicationContext.startService(intent)
    }

    /**
     * Stop the foreground [MediaNotificationService] and remove the notification.
     * Called when playback is explicitly ended (stop/destroy/reset).
     */
    @ReactMethod
    fun stopNotification() {
        val intent = Intent(reactApplicationContext, com.simba.player.MediaNotificationService::class.java).apply {
            action = com.simba.player.MediaNotificationService.ACTION_STOP
        }
        reactApplicationContext.startService(intent)
        Log.i(TAG, "MediaNotificationService stopped")
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun isNotificationActive(): Boolean {
        return com.simba.player.MediaNotificationService.isRunning()
    }

    /**
     * Request the POST_NOTIFICATIONS permission on Android 13+.
     * Calling this on lower APIs is a no-op (permission auto-granted).
     *
     * JS should call this before [startNotification] on Android 13+.
     * The result is delivered via the standard
     * `PermissionsAndroid.check/request` flow.
     */
    @ReactMethod
    fun requestNotificationPermission() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            val activity = getCurrentActivity() ?: return
            androidx.core.app.ActivityCompat.requestPermissions(
                activity,
                arrayOf(android.Manifest.permission.POST_NOTIFICATIONS),
                9001 // arbitrary request code
            )
        }
    }

    // ── Native Pointer (for MpvRenderView) ─────────────────────────────────

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getNativePtr(): Double {
        return nativePtr.toDouble()
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private fun ensurePtr() {
        if (nativePtr == 0L) {
            Log.e(TAG, "[PlaybackTrace][Bridge][ensurePtr] native pointer is zero")
            throw IllegalStateException("MpvPlayerModule not initialized. Call initPlayer() first.")
        }
    }

    /**
     * Extract the cache fill percentage from a `cache-buffering-state`
     * payload that the native property bridge has already serialised to JSON.
     *
     * While the stream is actively buffering, mpv emits a node map like
     * `{"percent": 37}`. When the cache is full (or buffering stops for any
     * other reason) the property is reported as the boolean `false`, which
     * our C++ property serializer emits as the literal string `"false"`.
     *
     * Anything we can't parse (malformed JSON, missing field) defaults to
     * `100.0` so the JS `percent > 0 && percent < 100` guard treats the
     * unknown state as "not buffering" and avoids a stuck spinner.
     */
    private fun parseBufferingPercent(jsonValue: String): Double {
        val trimmed = jsonValue.trim()
                if (trimmed == "false" || trimmed.isEmpty() || trimmed == "null") return 100.0
        trimmed.toDoubleOrNull()?.let { return it.coerceIn(0.0, 100.0) }
        return try {
            val obj = JSONObject(trimmed)

            when {
                obj.has("percent") -> obj.getDouble("percent").coerceIn(0.0, 100.0)
                obj.has("percentage") -> obj.getDouble("percentage").coerceIn(0.0, 100.0)
                else -> 100.0
            }
        } catch (e: Exception) {
            Log.w(TAG, "parseBufferingPercent: bad json '$jsonValue': ${e.message}")
            100.0
        }
    }

    /**
     * Parse a `demuxer-cache-state` payload into buffered ranges + fill.
     *
          * MPV serialises this property as a node map whose documented fields
     * include `seekable-ranges`, `bof-cached`, `eof-cached`, `fw-bytes`,
     * `file-cache-bytes`, `cache-end`, `reader-pts`, and `cache-duration`.
     * The seekable ranges are the authoritative buffered timeline ranges.
     *
     * We extract only those ranges here. Cache fill is intentionally not
     * fabricated from byte counts: mpv exposes the user-facing fill percentage
     * through the separate `cache-buffering-state` property, which is mapped
     * to `onBuffering` and consumed by TransportContext.

     */
    private data class CacheStatePayload(
        val ranges: List<Pair<Double, Double>>,
        val fill: Double,
    )

    private fun parseCacheState(jsonValue: String): CacheStatePayload {
        val trimmed = jsonValue.trim()
        if (trimmed.isEmpty() || trimmed == "null") {
            return CacheStatePayload(emptyList(), 0.0)
        }
        return try {
            val obj = JSONObject(trimmed)
            val rangesJson = obj.optJSONArray("seekable-ranges")
                ?: obj.optJSONArray("ranges") // compatibility with older native payloads

            val ranges = mutableListOf<Pair<Double, Double>>()
            if (rangesJson != null) {
                for (i in 0 until rangesJson.length()) {
                    val r = rangesJson.optJSONObject(i) ?: continue
                    val start = r.optDouble("start", Double.NaN)
                    val end = r.optDouble("end", Double.NaN)
                    if (!start.isNaN() && !end.isNaN() && end > start) {
                        ranges.add(start to end)
                    }
                }
            }
                        CacheStatePayload(ranges, 0.0)

        } catch (e: Exception) {
            Log.w(TAG, "parseCacheState: bad json '$jsonValue': ${e.message}")
            CacheStatePayload(emptyList(), 0.0)
        }
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
