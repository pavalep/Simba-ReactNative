package com.simba.player

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.AudioManager
import android.os.Build
import android.os.IBinder
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import android.util.Log
import androidx.core.app.NotificationCompat
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.net.URL

/**
 * Android foreground service that manages a media playback notification
 * with MediaSession for lock-screen and Bluetooth controls.
 *
 * Lifecycle:
 *   - Started via [startService] from MpvBridgeModule when playback begins
 *   - Runs as foreground with [startForeground] and a MediaStyle notification
 *   - Stops via [stopSelf] when playback is explicitly ended
 *   - Automatically persists across app backgrounding (prevents Android kill)
 */
class MediaNotificationService : Service() {

    companion object {
        const val TAG = "MediaNotification"
        const val CHANNEL_ID = "simba_media_playback"
        const val NOTIFICATION_ID = 1001

        // Action strings matching the notification button intents
        const val ACTION_PLAY_PAUSE   = "com.simba.player.NOTIFICATION_PLAY_PAUSE"
        const val ACTION_SKIP_NEXT    = "com.simba.player.NOTIFICATION_SKIP_NEXT"
        const val ACTION_SKIP_PREV    = "com.simba.player.NOTIFICATION_SKIP_PREV"
        const val ACTION_STOP         = "com.simba.player.NOTIFICATION_STOP"
        const val ACTION_SEEK_TO      = "com.simba.player.NOTIFICATION_SEEK_TO"
        const val ACTION_UPDATE       = "com.simba.player.NOTIFICATION_UPDATE"

        // Internal broadcast for self-updating the notification
        const val ACTION_UPDATE_SELF  = "com.simba.player.NOTIFICATION_UPDATE_SELF"

        // Intent extras
        const val EXTRA_POSITION      = "position"
        const val EXTRA_DURATION      = "duration"
        const val EXTRA_IS_PLAYING    = "isPlaying"
        const val EXTRA_TITLE         = "title"
        const val EXTRA_ARTIST        = "artist"
        const val EXTRA_ALBUM         = "album"
        const val EXTRA_FILE_URI      = "fileUri"
        const val EXTRA_ARTWORK_PATH  = "artworkPath"
        const val EXTRA_MEDIA_TYPE    = "mediaType"

        // Notification actions indices (for compact notification ordering)
        private const val INDEX_PREV     = 0
        private const val INDEX_PLAY     = 1
        private const val INDEX_NEXT     = 2

        @Volatile
        private var isRunning = false

        fun isRunning(): Boolean = isRunning

        /**
         * Build a [PendingIntent] for a specific notification action targeting
         * this service. Uses FLAG_IMMUTABLE for Android 12+ safety.
         */
        private fun buildActionIntent(context: Context, action: String): PendingIntent {
            val intent = Intent(context, MediaNotificationService::class.java).apply {
                this.action = action
            }
            return PendingIntent.getService(
                context,
                action.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        /**
         * Build a PendingIntent that opens the app's MainActivity.
         * Used when the user taps the notification body.
         */
        private fun buildContentIntent(context: Context): PendingIntent {
            val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            return PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }
    }

    // ── Instance State ─────────────────────────────────────────────────────

    private lateinit var notificationManager: NotificationManager
    private var mediaSession: MediaSessionCompat? = null
    private var updateReceiver: BroadcastReceiver? = null

    // Cached metadata for notification updates
    private var currentTitle: String = "Simba Player"
    private var currentArtist: String = ""
    private var currentAlbum: String = ""
    private var currentFileUri: String = ""
    private var currentArtworkPath: String = ""
    private var currentMediaType: String = "audio"
    private var currentPosition: Long = 0L
    private var currentDuration: Long = 0L
    private var isCurrentlyPlaying: Boolean = true

    // ── Lifecycle ──────────────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        notificationManager = getSystemService(NotificationManager::class.java)
        createNotificationChannel()
        registerUpdateReceiver()
        Log.i(TAG, "MediaNotificationService created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_PLAY_PAUSE   -> handlePlayPause()
            ACTION_SKIP_NEXT    -> handleSkipNext()
            ACTION_SKIP_PREV    -> handleSkipPrev()
            ACTION_STOP         -> handleStop()
            ACTION_UPDATE       -> handleUpdate(intent)
            ACTION_UPDATE_SELF  -> refreshNotification()
            else                -> handleStart(intent)
        }
        return START_REDELIVER_INTENT
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        isRunning = false
        unregisterUpdateReceiver()
        mediaSession?.release()
        notificationManager.cancel(NOTIFICATION_ID)
        Log.i(TAG, "MediaNotificationService destroyed")
        super.onDestroy()
    }

    // ── Notification Channel (Android 8+) ──────────────────────────────────

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Media Playback",
                NotificationManager.IMPORTANCE_LOW // Low = no sound, shows in shade
            ).apply {
                description = "Playback controls for Simba Player"
                setShowBadge(false)
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    // ── Broadcast Receiver for Internal Updates ────────────────────────────

    private fun registerUpdateReceiver() {
        val filter = IntentFilter(ACTION_UPDATE_SELF)
        updateReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                handleUpdate(intent)
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(updateReceiver, filter, RECEIVER_EXPORTED)
        } else {
            registerReceiver(updateReceiver, filter)
        }
    }

    private fun unregisterUpdateReceiver() {
        updateReceiver?.let {
            try { unregisterReceiver(it) } catch (_: IllegalArgumentException) { }
        }
    }

    // ── Event Emission to JS ───────────────────────────────────────────────

    /**
     * Emit an event to the React Native JS layer via [DeviceEventManagerModule.RCTDeviceEventEmitter].
     * Follows the same pattern used by [PipActionReceiver].
     */
    private fun emitEvent(eventName: String, params: WritableMap?) {
        try {
            val reactContext = getReactContext()
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(eventName, params)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to emit event $eventName: ${e.message}")
        }
    }

    private fun getReactContext(): ReactContext {
        val app = applicationContext as ReactApplication
        return app.reactHost!!.currentReactContext!!
    }

    // ── Action Handlers ────────────────────────────────────────────────────

    private fun handleStart(intent: Intent?) {
        isRunning = true
        val extras = intent?.extras
        currentTitle = extras?.getString(EXTRA_TITLE, "Simba Player") ?: "Simba Player"
        currentArtist = extras?.getString(EXTRA_ARTIST, "") ?: ""
        currentAlbum = extras?.getString(EXTRA_ALBUM, "") ?: ""
        currentFileUri = extras?.getString(EXTRA_FILE_URI, "") ?: ""
        currentArtworkPath = extras?.getString(EXTRA_ARTWORK_PATH, "") ?: ""
        currentMediaType = extras?.getString(EXTRA_MEDIA_TYPE, "audio") ?: "audio"
        currentPosition = extras?.getLong(EXTRA_POSITION, 0L) ?: 0L
        currentDuration = extras?.getLong(EXTRA_DURATION, 0L) ?: 0L
        isCurrentlyPlaying = extras?.getBoolean(EXTRA_IS_PLAYING, true) ?: true

        val notification = buildNotification()
        mediaSession = createMediaSession()
        startForeground(NOTIFICATION_ID, notification)
        Log.i(TAG, "Media notification started: $currentTitle")
    }

    private fun handleUpdate(intent: Intent) {
        val extras = intent.extras ?: return
        extras.getString(EXTRA_TITLE)?.let { currentTitle = it }
        extras.getString(EXTRA_ARTIST)?.let { currentArtist = it }
        extras.getString(EXTRA_ALBUM)?.let { currentAlbum = it }
        extras.getString(EXTRA_FILE_URI)?.let { currentFileUri = it }
        extras.getString(EXTRA_ARTWORK_PATH)?.let { currentArtworkPath = it }
        extras.getString(EXTRA_MEDIA_TYPE)?.let { currentMediaType = it }
        extras.getLong(EXTRA_POSITION, -1L).let { if (it >= 0L) currentPosition = it }
        extras.getLong(EXTRA_DURATION, -1L).let { if (it >= 0L) currentDuration = it }
        extras.getBoolean(EXTRA_IS_PLAYING, isCurrentlyPlaying).also { isCurrentlyPlaying = it }

        val notification = buildNotification()
        notificationManager.notify(NOTIFICATION_ID, notification)
        updateMediaSession()
    }

    private fun refreshNotification() {
        val notification = buildNotification()
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    private fun handlePlayPause() {
        if (isCurrentlyPlaying) {
            emitEvent("onNotificationPause", null)
        } else {
            emitEvent("onNotificationPlay", null)
        }
        // Optimistically toggle local state so the notification UI responds immediately
        isCurrentlyPlaying = !isCurrentlyPlaying
        refreshNotification()
        updateMediaSession()
    }

    private fun handleSkipNext() {
        emitEvent("onNotificationNext", null)
    }

    private fun handleSkipPrev() {
        emitEvent("onNotificationPrevious", null)
    }

    private fun handleStop() {
        // Emit stop event, then let JS call stopNotification() when ready
        emitEvent("onNotificationStop", null)
    }

    // ── Notification Building ──────────────────────────────────────────────

    private fun buildNotification(): Notification {
        val playbackAction = if (isCurrentlyPlaying)
            android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play
        val playbackContent = if (isCurrentlyPlaying) "Pause" else "Play"

        // Subtitle: "Artist • Album" or just "Artist" or empty
        val subtitle = when {
            currentArtist.isNotBlank() && currentAlbum.isNotBlank() ->
                "$currentArtist • $currentAlbum"
            currentArtist.isNotBlank() -> currentArtist
            else -> null
        }

        // Artwork: try local file path first, fall back to default icon
        val artwork = loadArtworkBitmap(currentArtworkPath) ?:
            BitmapFactory.decodeResource(resources, android.R.drawable.ic_media_play)

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setLargeIcon(artwork)
            .setContentTitle(currentTitle)
            .setContentText(subtitle)
            .setSubText(subtitle)
            .setContentIntent(buildContentIntent(this))
            .setDeleteIntent(buildActionIntent(this, ACTION_STOP))
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(isCurrentlyPlaying)
            .setShowWhen(false)
            .setSilent(true)
            .setOnlyAlertOnce(true)

        // Add media style with up to 5 actions (only compact slots show on some devices)
        builder.setStyle(
            androidx.media.app.NotificationCompat.MediaStyle()
                .setMediaSession(mediaSession?.sessionToken)
                .setShowActionsInCompactView(INDEX_PREV, INDEX_PLAY, INDEX_NEXT)
                .setShowCancelButton(true)
                .setCancelButtonIntent(buildActionIntent(this, ACTION_STOP))
        )

        // Action buttons
        builder.addAction(android.R.drawable.ic_media_previous, "Previous", buildActionIntent(this, ACTION_SKIP_PREV))
        builder.addAction(playbackAction, playbackContent, buildActionIntent(this, ACTION_PLAY_PAUSE))
        builder.addAction(android.R.drawable.ic_media_next, "Next", buildActionIntent(this, ACTION_SKIP_NEXT))
        builder.addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", buildActionIntent(this, ACTION_STOP))

        // Progress bar (seekable on Android 12+)
        if (currentDuration > 0L) {
            builder.setProgress(
                currentDuration.toInt(),
                currentPosition.toInt(),
                false // determinate
            )
        }

        return builder.build()
    }

    // ── Artwork Loading ────────────────────────────────────────────────────

    private fun loadArtworkBitmap(path: String): Bitmap? {
        if (path.isBlank()) return null
        return try {
            if (path.startsWith("http://") || path.startsWith("https://")) {
                // Load remote artwork (may be slow — consider caching)
                val url = URL(path)
                val connection = url.openConnection()
                connection.connectTimeout = 3000
                connection.readTimeout = 5000
                val inputStream = connection.getInputStream()
                BitmapFactory.decodeStream(inputStream)
            } else {
                val file = File(path)
                if (file.exists()) {
                    BitmapFactory.decodeFile(file.absolutePath)
                } else {
                    null
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to load artwork: ${e.message}")
            null
        }
    }

    // ── MediaSession (Lock screen / Bluetooth controls) ────────────────────

    private fun createMediaSession(): MediaSessionCompat {
        val session = MediaSessionCompat(this, TAG)
        session.setFlags(
            MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or
            MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        )
        session.setCallback(mediaSessionCallback)
        session.isActive = true
        updateMediaSession()
        return session
    }

    private fun updateMediaSession() {
        mediaSession?.let { session ->
            val state = if (isCurrentlyPlaying)
                PlaybackStateCompat.STATE_PLAYING else PlaybackStateCompat.STATE_PAUSED
            val pbState = PlaybackStateCompat.Builder()
                .setActions(
                    PlaybackStateCompat.ACTION_PLAY or
                    PlaybackStateCompat.ACTION_PAUSE or
                    PlaybackStateCompat.ACTION_PLAY_PAUSE or
                    PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                    PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                    PlaybackStateCompat.ACTION_STOP or
                    PlaybackStateCompat.ACTION_SEEK_TO
                )
                .setState(state, currentPosition.toLong(), 1.0f)
                .build()
            session.setPlaybackState(pbState)

            // Set metadata (title, artist, album, artwork)
            val metadata = android.support.v4.media.MediaMetadataCompat.Builder()
                .putString(android.support.v4.media.MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
                .putString(android.support.v4.media.MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
                .putString(android.support.v4.media.MediaMetadataCompat.METADATA_KEY_ALBUM, currentAlbum)
                .putString(android.support.v4.media.MediaMetadataCompat.METADATA_KEY_MEDIA_URI, currentFileUri)
            session.setMetadata(metadata.build())
        }
    }

    private val mediaSessionCallback = object : MediaSessionCompat.Callback() {
        override fun onPlay() {
            emitEvent("onNotificationPlay", null)
        }

        override fun onPause() {
            emitEvent("onNotificationPause", null)
        }

        override fun onSkipToNext() {
            emitEvent("onNotificationNext", null)
        }

        override fun onSkipToPrevious() {
            emitEvent("onNotificationPrevious", null)
        }

        override fun onStop() {
            emitEvent("onNotificationStop", null)
        }

        override fun onSeekTo(pos: Long) {
            val params = Arguments.createMap()
            params.putDouble(EXTRA_POSITION, pos.toDouble())
            emitEvent("onNotificationSeekTo", params)
        }
    }
}
