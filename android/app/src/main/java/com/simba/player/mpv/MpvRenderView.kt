package com.simba.player.mpv

import android.util.Log
import android.view.Surface
import android.view.SurfaceHolder
import android.view.SurfaceView
import android.view.ViewGroup
import com.facebook.react.uimanager.ThemedReactContext

/**
 * A Surface-backed view that attaches an Android Surface to the native
 * mpv handle for video rendering.
 *
 * Uses SurfaceView (not TextureView) so the rendering surface lives on
 * its own composition layer, which Android's Picture-in-Picture compositor
 * handles correctly out of the box. The previous TextureView-based
 * implementation re-used the same SurfaceTexture identity when the
 * activity shrank into PiP, causing mpv to keep pushing frames into the
 * pre-PiP ANativeWindow while the PiP overlay showed an empty composition.
 * SurfaceView's surface is on a separate layer from the activity's view
 * hierarchy, so PiP entry/exit doesn't leave a stale wid behind.
 */
class MpvRenderView(context: ThemedReactContext) : SurfaceView(context),
    SurfaceHolder.Callback {

    private var surface: Surface? = null
    private var nativePtr: Long = 0L
    // Idempotency is keyed on the SURFACE identity, not the ptr: a re-applied
    // nativePtr prop (view recycling, same surface) is a no-op, but a genuinely
    // new surface (PiP transition, view re-layout) ALWAYS rebinds — the old
    // wid would otherwise keep rendering into a defunct window.
    private var attachedSurface: Surface? = null
    private val surfaceLock = Any()

    companion object {
        private const val TAG = "MpvRenderView"
    }

    init {
        holder.addCallback(this)
        // setZOrderOnTop(true) is REQUIRED for PiP. Verified empirically
        // from `adb shell dumpsys SurfaceFlinger`: the SurfaceView BLAST
        // layer (where mpv pushes frames) is composited at z=11 BELOW
        // the activity's VRI at z=12. The PiP compositor samples the
        // VRI, so without setZOrderOnTop the SurfaceView's separate
        // layer is invisible in PiP (renders black).
        //
        // setZOrderMediaOverlay(true) is NOT sufficient — that puts the
        // SurfaceView above the activity window's view hierarchy but
        // still BELOW the VRI on the SurfaceFlinger z-axis. Only
        // setZOrderOnTop promotes the SurfaceView above the VRI so the
        // PiP compositor captures its content.
        setZOrderOnTop(true)
        layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
    }

    // ── SurfaceHolder.Callback ─────────────────────────────────────────────

    override fun surfaceCreated(holder: SurfaceHolder) {
        surface = holder.surface
        attachSurface()
    }

    override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
        // Notify mpv of new surface size (orientation / PiP / view re-layout).
        if (nativePtr != 0L) {
            MPVLib.nativeSurfaceChanged(nativePtr, width, height)
        }
    }

    override fun surfaceDestroyed(holder: SurfaceHolder) {
        detachSurface()
        // SurfaceView contract: return true tells the framework we have
        // finished using the surface and it's safe to destroy.
        surface = null
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
        if (attachedSurface === surface) return // same surface → nothing to do
        Log.d(TAG, "Attaching surface to mpv")
        // Mirror mpv-android BaseMPVView's attach sequence: bind the
        // Surface to mpv's wid FIRST, then force the gpu VO to render
        // into it. force-window=yes tells mpv to keep rendering into the
        // window even when its internal state would otherwise stop
        // (idle, after a hide-window event, during a PiP transition).
        MPVLib.nativeAttachSurface(nativePtr, surface)
        MPVLib.setPropertyString(nativePtr, "force-window", "yes")
        MPVLib.setPropertyString(nativePtr, "vo", "gpu")
        attachedSurface = surface
    }

    private fun detachSurface() {
        synchronized(surfaceLock) {
            if (nativePtr == 0L) return@synchronized
            Log.d(TAG, "Detaching surface from mpv")
            // Stop the gpu VO first so any in-flight render command does
            // not access the ANativeWindow after we release the global ref.
            MPVLib.setPropertyString(nativePtr, "vo", "null")
            MPVLib.setPropertyString(nativePtr, "force-window", "no")
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
