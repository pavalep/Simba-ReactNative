/**
 * Notification Service — bridges the Android foreground media notification
 * (MediaNotificationService.kt + MpvBridgeModule.kt) to the JS layer.
 *
 * Provides:
 *   - start / update / stop lifecycle for the persistent notification
 *   - Event listeners for notification action buttons (play/pause, next, prev, stop, seek)
 *   - Android 13+ notification permission request
 *
 * Usage in a player screen:
 *   const unsub = NotificationService.onPlayPause(() => handlePlayPause());
 *   // ... on file load / first play:
 *   NotificationService.start({title, artist, fileUri, ...}, {position, duration, isPlaying});
 *   // ... on each position tick:
 *   NotificationService.update({position, duration});
 *   // ... on unmount / back:
 *   NotificationService.stop();
 *
 * @deprecated V11 inline-mount path. Phase 41 flipped `USE_DEDICATED_PLAYER_ACTIVITY` to `true`,
 * which means V12's `PlayerActivity` is now the default — and V12 brings its own
 * `MediaPlaybackService` for the foreground notification. This V11 service is
 * now dead code in the default flow but is kept around for the emergency
 * rollback path (set `USE_DEDICATED_PLAYER_ACTIVITY = false` to restore V11).
 *
 * Phase 47 (V11 deprecation & cleanup) will delete this file entirely. The
 * module's `@simba/react-native-media-player` package replaces this with
 * `MediaPlaybackService` + `onAudioFocusChange` + `onPipModeChanged` events
 * documented in [`SIMBA_PLAYER_MODULE_V12_ERROR_CONTRACT.md`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_ERROR_CONTRACT.md).
 */

import {NativeModules, NativeEventEmitter, Platform} from 'react-native';
import {logger} from '../lib/logger';

// ── Types ──────────────────────────────────────────────────────────────────

export interface NotificationMetadata {
  title: string;
  artist?: string;
  album?: string;
  fileUri: string;
  artworkPath?: string;
  mediaType: 'audio' | 'video';
}

export interface NotificationPlaybackState {
  position: number;
  duration: number;
  isPlaying: boolean;
}

// ── Native Module Reference ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MpvPlayerModule = NativeModules.MpvPlayerModule as {
  startNotification(
    title: string,
    artist: string,
    album: string,
    fileUri: string,
    artworkPath: string,
    mediaType: string,
    position: number,
    duration: number,
  ): void;
  updateNotification(
    title: string,
    artist: string,
    album: string,
    fileUri: string,
    artworkPath: string,
    mediaType: string,
    position: number,
    duration: number,
    isPlaying: boolean,
  ): void;
  stopNotification(): void;
  isNotificationActive(): boolean;
  requestNotificationPermission(): void;
} | null;

// Try to get the native module (fails gracefully on iOS / web)
const native = (NativeModules.MpvPlayerModule ?? null) as typeof MpvPlayerModule;

// ── Event Emitter for notification action events ───────────────────────────
// The MediaNotificationService.kt emits via RCTDeviceEventEmitter (same channel
// as mpv events). We create a separate NativeEventEmitter to avoid polluting the
// MpvPlayer event type system with notification-specific events.

const notificationEmitter = native
  ? new NativeEventEmitter(NativeModules.MpvPlayerModule as any)
  : null;

// ── Helpers ────────────────────────────────────────────────────────────────

function requireModule(): typeof MpvPlayerModule {
  if (!native) {
    logger.warn('[NotificationService] MpvPlayerModule not available');
    return null as any;
  }
  return native;
}

// ── Event Listener Map ─────────────────────────────────────────────────────

type Listener = () => void;
type SeekListener = (position: number) => void;

const listeners = {
  onPlayPause: new Set<Listener>(),
  onNext: new Set<Listener>(),
  onPrevious: new Set<Listener>(),
  onStop: new Set<Listener>(),
  onSeekTo: new Set<SeekListener>(),
};

// ── Public API ─────────────────────────────────────────────────────────────

export const NotificationService = {
  // ── Lifecycle ──────────────────────────────────────────────────────────

  /**
   * Start the foreground notification service.
   * Call this when playback begins (first play or file load).
   */
  start(meta: NotificationMetadata, state: NotificationPlaybackState): void {
    const mod = requireModule();
    if (!mod) return;
    mod.startNotification(
      meta.title,
      meta.artist ?? '',
      meta.album ?? '',
      meta.fileUri,
      meta.artworkPath ?? '',
      meta.mediaType,
      state.position,
      state.duration,
    );
  },

  /**
   * Update the notification with new playback state (position, duration, playing).
   * Call this every ~250ms from the position polling interval.
   */
  update(meta: NotificationMetadata, state: NotificationPlaybackState): void {
    const mod = requireModule();
    if (!mod) return;
    mod.updateNotification(
      meta.title,
      meta.artist ?? '',
      meta.album ?? '',
      meta.fileUri,
      meta.artworkPath ?? '',
      meta.mediaType,
      state.position,
      state.duration,
      state.isPlaying,
    );
  },

  /**
   * Stop the notification and foreground service.
   * Call this when playback is explicitly ended or the player unmounts.
   */
  stop(): void {
    const mod = requireModule();
    if (!mod) return;
    mod.stopNotification();
  },

  /**
   * Check whether the notification service is currently running.
   */
  isActive(): boolean {
    const mod = requireModule();
    if (!mod) return false;
    try {
      return mod.isNotificationActive();
    } catch {
      return false;
    }
  },

  // ── Permission (Android 13+) ───────────────────────────────────────────

  /**
   * Request POST_NOTIFICATIONS permission on Android 13+.
   * Safe to call on older versions (no-op).
   */
  requestPermission(): void {
    if (Platform.OS !== 'android') return;
    const mod = requireModule();
    if (!mod) return;
    try {
      mod.requestNotificationPermission();
    } catch {
      // Permission request not available
    }
  },

  // ── Event Subscriptions ────────────────────────────────────────────────

  /**
   * Called when the notification play/pause button is tapped, OR
   * when a Bluetooth / lock-screen media command fires play/pause.
   * The screen should toggle its play/pause state.
   */
  onPlayPause(callback: Listener): () => void {
    listeners.onPlayPause.add(callback);
    return () => { listeners.onPlayPause.delete(callback); };
  },

  /**
   * Called when the notification "Next" button is tapped.
   */
  onNext(callback: Listener): () => void {
    listeners.onNext.add(callback);
    return () => { listeners.onNext.delete(callback); };
  },

  /**
   * Called when the notification "Previous" button is tapped.
   */
  onPrevious(callback: Listener): () => void {
    listeners.onPrevious.add(callback);
    return () => { listeners.onPrevious.delete(callback); };
  },

  /**
   * Called when the notification "Stop" button is tapped or the user
   * dismisses the notification.
   */
  onStop(callback: Listener): () => void {
    listeners.onStop.add(callback);
    return () => { listeners.onStop.delete(callback); };
  },

  /**
   * Called when the user seeks via the notification progress bar
   * (Android 12+).
   */
  onSeekTo(callback: SeekListener): () => void {
    listeners.onSeekTo.add(callback);
    return () => { listeners.onSeekTo.delete(callback); };
  },
};

// ── Wire Native Events → Listener Sets ─────────────────────────────────────

if (notificationEmitter) {
  notificationEmitter.addListener('onNotificationPlay', () => {
    listeners.onPlayPause.forEach(cb => cb());
  });
  notificationEmitter.addListener('onNotificationPause', () => {
    listeners.onPlayPause.forEach(cb => cb());
  });
  notificationEmitter.addListener('onNotificationNext', () => {
    listeners.onNext.forEach(cb => cb());
  });
  notificationEmitter.addListener('onNotificationPrevious', () => {
    listeners.onPrevious.forEach(cb => cb());
  });
  notificationEmitter.addListener('onNotificationStop', () => {
    listeners.onStop.forEach(cb => cb());
  });
  notificationEmitter.addListener('onNotificationSeekTo', (payload: {position: number}) => {
    listeners.onSeekTo.forEach(cb => cb(payload.position));
  });
}
