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
 * Provides:
 * - [buildPipParams]: Creates [android.app.PictureInPictureParams] with RemoteActions
 * - [ACTION_PLAY_PAUSE] / [ACTION_CLOSE] / [ACTION_NEXT] / [ACTION_PREV]: Action constants
 *   consumed by [PipActionReceiver] inside [MainActivity]
 *
 * PiP is available on API 24+. RemoteAction requires API 24+.
 */
@RequiresApi(Build.VERSION_CODES.N)
object PipManager {

    // ── Action Constants ───────────────────────────────────────────────────

    const val ACTION_PLAY_PAUSE = "com.simba.player.PIP_PLAY_PAUSE"
    const val ACTION_CLOSE = "com.simba.player.PIP_CLOSE"
    const val ACTION_NEXT = "com.simba.player.PIP_NEXT"
    const val ACTION_PREV = "com.simba.player.PIP_PREV"

    private const val REQ_PLAY_PAUSE = 1001
    private const val REQ_CLOSE = 1002
    private const val REQ_NEXT = 1003
    private const val REQ_PREV = 1004

    // ── PiP Params Builder ─────────────────────────────────────────────────

    /**
     * Build PictureInPictureParams with overlay actions.
     *
     * @param context Application or Activity context for PendingIntents.
     * @param aspectWidth  Numerator of the PiP window aspect ratio (default 16).
     * @param aspectHeight Denominator of the PiP window aspect ratio (default 9).
     * @param showNextPrev Whether to include next/previous track actions.
     * @param sourceRectHint Optional bounds for smooth PiP entry animation.
     */
    fun buildPipParams(
        context: Context,
        aspectWidth: Int = 16,
        aspectHeight: Int = 9,
        showNextPrev: Boolean = false,
        sourceRectHint: android.graphics.Rect? = null,
    ): android.app.PictureInPictureParams {
        val actions = mutableListOf<RemoteAction>()

        // Play/Pause
        actions.add(buildRemoteAction(
            context = context,
            iconResId = android.R.drawable.ic_media_play, // will be toggled by JS state
            title = "Play/Pause",
            contentDescription = "Toggle playback",
            action = ACTION_PLAY_PAUSE,
            requestCode = REQ_PLAY_PAUSE,
        ))

        // Previous
        if (showNextPrev) {
            actions.add(buildRemoteAction(
                context = context,
                iconResId = android.R.drawable.ic_media_previous,
                title = "Previous",
                contentDescription = "Previous track",
                action = ACTION_PREV,
                requestCode = REQ_PREV,
            ))
        }

        // Next
        if (showNextPrev) {
            actions.add(buildRemoteAction(
                context = context,
                iconResId = android.R.drawable.ic_media_next,
                title = "Next",
                contentDescription = "Next track",
                action = ACTION_NEXT,
                requestCode = REQ_NEXT,
            ))
        }

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

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && sourceRectHint != null) {
            builder.setSourceRectHint(sourceRectHint)
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
            addAction(ACTION_CLOSE)
            addAction(ACTION_NEXT)
            addAction(ACTION_PREV)
        }
    }
}

// ── BroadcastReceiver for PiP Actions ──────────────────────────────────────

/**
 * Receives PiP RemoteAction broadcasts and forwards them to the React Native
 * event layer via [DeviceEventManagerModule.RCTDeviceEventEmitter].
 *
 * Registered/unregistered in [MainActivity] lifecycle.
 */
class PipActionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            PipManager.ACTION_PLAY_PAUSE -> {
                emitEvent(context, "onPipPlayPause", null)
            }
            PipManager.ACTION_CLOSE -> {
                emitEvent(context, "onPipClose", null)
            }
            PipManager.ACTION_NEXT -> {
                emitEvent(context, "onPipNext", null)
            }
            PipManager.ACTION_PREV -> {
                emitEvent(context, "onPipPrev", null)
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
