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
    // Crash hotfix: attach/detach must be atomic (vo=null → wid swap → vo=gpu).
    // Idempotency is keyed on the SURFACE identity, not the ptr: a re-applied
    // nativePtr prop (view recycling, same texture) is a no-op, but a genuinely
    // new texture (PiP window surface churn) ALWAYS rebinds — the old wid would
    // otherwise keep rendering into a defunct window, leaving the PiP frame
    // black.
    private var attachedSurface: Surface? = null
    private val surfaceLock = Any()

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
        // Notify mpv of new surface size (fixes orientation change skew)
        if (nativePtr != 0L) {
            MPVLib.nativeSurfaceChanged(nativePtr, width, height)
        }
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
        synchronized(surfaceLock) {
            nativePtr = ptr
            // New handle — any previously attached surface must be rebound
            // (wid still points at the old handle's surface).
            attachedSurface = null
            if (surface != null && surface!!.isValid) {
                attachSurfaceLocked()
            }
        }
    }

    private fun attachSurface() {
        synchronized(surfaceLock) { attachSurfaceLocked() }
    }

    private fun attachSurfaceLocked() {
        if (nativePtr == 0L || surface == null) return
        if (!surface!!.isValid) return
        if (attachedSurface === surface) return // same texture → nothing to do
        Log.d(TAG, "Attaching surface to mpv")
        // Stop the gpu VO FIRST so nothing is using the previous wid value
        // while the native side swaps the Surface global ref.
        MPVLib.setPropertyString(nativePtr, "vo", "null")
        MPVLib.nativeAttachSurface(nativePtr, surface)
        // Restore the gpu video output; the VO re-init picks up the new wid
        // (a global ref to the Surface — mpv derives its own ANativeWindow).
        MPVLib.setPropertyString(nativePtr, "vo", "gpu")
        attachedSurface = surface
    }

    private fun detachSurface() {
        synchronized(surfaceLock) {
            if (nativePtr == 0L) return@synchronized
            Log.d(TAG, "Detaching surface from mpv")
            // Kill the gpu video output FIRST so mpv releases the
            // ANativeWindow it derived from the global ref before the native
            // side deletes the ref. If we delete the ref first, mpv still
            // holds a stale jobject → JNI abort.
            MPVLib.setPropertyString(nativePtr, "vo", "null")
            MPVLib.nativeAttachSurface(nativePtr, null)
            attachedSurface = null
        }
    }

    /**
     * Must be called when the mpv instance is destroyed.
     */
    fun cleanup() {
        detachSurface()
        nativePtr = 0L
    }
}
