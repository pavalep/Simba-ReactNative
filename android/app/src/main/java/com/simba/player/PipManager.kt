package com.simba.player

import android.app.PendingIntent
import android.app.RemoteAction
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.drawable.Icon
import android.os.Build
import android.util.Rational
import androidx.annotation.RequiresApi
import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceManager

/**
 * Manages Android Picture-in-Picture (PiP) overlay actions and parameters.
 *
 * v3 redesign:
 * - 3 RemoteAction buttons max: [Play/Pause] [Expand] [Close]
 * - Notification text with chapter title + progress percentage (Android 12+)
 * - No NEXT/PREV actions (removed for simplicity)
 */
@RequiresApi(Build.VERSION_CODES.N)
object PipManager {

    // ── Action Constants ───────────────────────────────────────────────────

    const val ACTION_PLAY_PAUSE = "com.simba.player.PIP_PLAY_PAUSE"
    const val ACTION_EXPAND = "com.simba.player.PIP_EXPAND"
    const val ACTION_CLOSE = "com.simba.player.PIP_CLOSE"

    private const val REQ_PLAY_PAUSE = 1001
    private const val REQ_EXPAND = 1002
    private const val REQ_CLOSE = 1003

    // ── PiP Params Builder ─────────────────────────────────────────────────

    /**
     * Build PictureInPictureParams with 3 overlay actions:
     * [Pause/Resume] [Expand to Fullscreen] [Close].
     *
     * On Android 12+, also sets notification subtitle with chapter/progress info.
     *
     * @param context            Application or Activity context for PendingIntents.
     * @param aspectWidth        Numerator of the PiP window aspect ratio (default 16).
     * @param aspectHeight       Denominator of the PiP window aspect ratio (default 9).
     * @param sourceRectHint     Optional bounds for smooth PiP entry animation.
     * @param chapterTitle       Current chapter title for notification text (Android 12+).
     * @param progressPercentage Percentage string like "45%" for notification text (Android 12+).
     */
    fun buildPipParams(
        context: Context,
        aspectWidth: Int = 16,
        aspectHeight: Int = 9,
        sourceRectHint: android.graphics.Rect? = null,
        chapterTitle: String? = null,
        progressPercentage: String? = null,
    ): android.app.PictureInPictureParams {
        val actions = mutableListOf<RemoteAction>()

        // Play/Pause
        actions.add(buildRemoteAction(
            context = context,
            iconResId = android.R.drawable.ic_media_play,
            title = "Play/Pause",
            contentDescription = "Toggle playback",
            action = ACTION_PLAY_PAUSE,
            requestCode = REQ_PLAY_PAUSE,
        ))

        // Expand to Fullscreen
        actions.add(buildRemoteAction(
            context = context,
            iconResId = android.R.drawable.ic_menu_zoom,
            title = "Expand",
            contentDescription = "Expand to fullscreen",
            action = ACTION_EXPAND,
            requestCode = REQ_EXPAND,
        ))

        // Close
        actions.add(buildRemoteAction(
            context = context,
            iconResId = android.R.drawable.ic_menu_close_clear_cancel,
            title = "Close",
            contentDescription = "Close player",
            action = ACTION_CLOSE,
            requestCode = REQ_CLOSE,
        ))

        val builder = android.app.PictureInPictureParams.Builder()
            .setAspectRatio(Rational(aspectWidth, aspectHeight))
            .setActions(actions)

        // Source rect hint for smooth entry animation (Android 12+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && sourceRectHint != null) {
            builder.setSourceRectHint(sourceRectHint)
        }

        // Notification text (Android 12+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            chapterTitle?.let { builder.setTitle(it) }
            progressPercentage?.let { builder.setSubtitle(it) }
        }

        return builder.build()
    }

    // ── RemoteAction Builder ───────────────────────────────────────────────

    private fun buildRemoteAction(
        context: Context,
        iconResId: Int,
        title: String,
        contentDescription: String,
        action: String,
        requestCode: Int,
    ): RemoteAction {
        val intent = Intent(action).apply {
            setClass(context, PipActionReceiver::class.java)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        return RemoteAction(
            Icon.createWithResource(context, iconResId),
            title,
            contentDescription,
            pendingIntent,
        )
    }

    // ── Intent Filter ──────────────────────────────────────────────────────

    fun intentFilter(): IntentFilter {
        return IntentFilter().apply {
            addAction(ACTION_PLAY_PAUSE)
            addAction(ACTION_EXPAND)
            addAction(ACTION_CLOSE)
        }
    }
}

// ── BroadcastReceiver for PiP Actions ──────────────────────────────────────

/**
 * Receives PiP RemoteAction broadcasts and forwards them to the React Native
 * event layer via [DeviceEventManagerModule.RCTDeviceEventEmitter].
 *
 * Registered/unregistered in [MainActivity] lifecycle.
 *
 * v3: Handles 3 actions — play/pause, expand (restore fullscreen), close (end session).
 */
class PipActionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            PipManager.ACTION_PLAY_PAUSE -> {
                emitEvent(context, "onPipPlayPause", null)
            }
            PipManager.ACTION_EXPAND -> {
                emitEvent(context, "onPipExpand", null)
            }
            PipManager.ACTION_CLOSE -> {
                emitEvent(context, "onPipClose", null)
            }
        }
    }

    private fun emitEvent(context: Context, eventName: String, params: android.os.Bundle?) {
        try {
            val reactContext = getReactContext(context)
            reactContext
                .getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(eventName, params)
        } catch (_: Exception) {
            // React context not available
        }
    }

    private fun getReactContext(context: Context): com.facebook.react.bridge.ReactContext {
        val app = context.applicationContext as? ReactApplication
            ?: throw IllegalStateException("Application is not a ReactApplication")
        return app.reactNativeHost.reactInstanceManager.currentReactContext
            ?: throw IllegalStateException("ReactContext not available")
    }
}
