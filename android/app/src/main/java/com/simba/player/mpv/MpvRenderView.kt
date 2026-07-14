package com.simba.player.mpv

import android.graphics.SurfaceTexture
import android.util.Log
import android.view.Surface
import android.view.TextureView
import android.view.View
import android.view.ViewGroup
import com.facebook.react.uimanager.ThemedReactContext

/**
 * A simple Surface-backed view that attaches an Android Surface
 * to the native mpv handle for video rendering.
 *
 * This is a lightweight Fabric-compatible view. In a full production
 * build you would use the React Native ViewManager pipeline; here we
 * provide the essential rendering glue.
 */
class MpvRenderView(context: ThemedReactContext) : TextureView(context),
    TextureView.SurfaceTextureListener {

    private var surface: Surface? = null
    private var nativePtr: Long = 0L

    companion object {
        private const val TAG = "MpvRenderView"
    }

    init {
        surfaceTextureListener = this
        layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
    }

    // ── SurfaceTextureListener ─────────────────────────────────────────────

    override fun onSurfaceTextureAvailable(st: SurfaceTexture, width: Int, height: Int) {
        surface = Surface(st)
        attachSurface()
    }

    override fun onSurfaceTextureSizeChanged(st: SurfaceTexture, width: Int, height: Int) {
        // Resize handled internally by mpv
    }

    override fun onSurfaceTextureDestroyed(st: SurfaceTexture): Boolean {
        detachSurface()
        surface?.release()
        surface = null
        return true
    }

    override fun onSurfaceTextureUpdated(st: SurfaceTexture) {
        // no-op
    }

    // ── Surface attachment ─────────────────────────────────────────────────

    /**
     * Call when the native mpv handle is available.
     */
    fun setNativePtr(ptr: Long) {
        nativePtr = ptr
        if (surface != null && surface!!.isValid) {
            attachSurface()
        }
    }

    private fun attachSurface() {
        if (nativePtr == 0L || surface == null) return
        if (!surface!!.isValid) return
        Log.d(TAG, "Attaching surface to mpv")
        MPVLib.nativeSetSurface(nativePtr, surface)
    }

    private fun detachSurface() {
        if (nativePtr == 0L) return
        Log.d(TAG, "Detaching surface from mpv")
        MPVLib.nativeSetSurface(nativePtr, null)
    }

    /**
     * Must be called when the mpv instance is destroyed.
     */
    fun cleanup() {
        detachSurface()
        nativePtr = 0L
    }
}
