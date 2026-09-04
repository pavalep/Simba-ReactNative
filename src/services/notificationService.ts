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
 * V13 Phase 53b/53c migration: the two methods that exist in the V13 module
 * bridge (`isNotificationActive`, `requestNotificationPermission`) are routed
 * through `getMpvPlayerModule()`. The four V11-only methods
 * (`startNotification`, `updateNotification`, `stopNotification`,
 * `requestNotificationPermission` as a different RPC) are still accessed via
 * `NativeModules.MpvPlayerModule` directly because they were never published
 * as part of the V13 typed bridge — V12's `MediaPlaybackService` handles
 * them natively and the JS path is only kept alive for V11 emergency
 * rollback.
 *
 * This file is slated for full deletion once the V11 rollback path is
 * decommissioned (no Phase 57 deletion for this file — only the contexts
 * + modules/playback/* tree).
 */

import {NativeModules, NativeEventEmitter, Platform} from 'react-native';
import {getMpvPlayerModule} from '@simba-dev/react-native-media-player';
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

// ── Native Module Reference (V11 methods) ──────────────────────────────────
// The V11-only notification RPCs (`startNotification`, `updateNotification`,
// `stopNotification`) are not part of the V13 module's typed bridge. We
// still reach into `NativeModules.MpvPlayerModule` for them with a local
// typed cast so the V11 rollback path keeps working. The V13 methods
// (`isNotificationActive`, `requestNotificationPermission`) go through
// `getMpvPlayerModule()` below.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MpvPlayerModuleV11 = NativeModules.MpvPlayerModule as {
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
} | null;

// Try to get the native module (fails gracefully on iOS / web)
const nativeV11 = (NativeModules.MpvPlayerModule ?? null) as typeof MpvPlayerModuleV11;

// ── Event Emitter for notification action events ───────────────────────────
// The MediaNotificationService.kt emits via RCTDeviceEventEmitter (same channel
// as mpv events). We create a separate NativeEventEmitter to avoid polluting the
// MpvPlayer event type system with notification-specific events.

const notificationEmitter = nativeV11
  ? new NativeEventEmitter(NativeModules.MpvPlayerModule as any)
  : null;

// ── Helpers ────────────────────────────────────────────────────────────────

function requireV11Module(): typeof MpvPlayerModuleV11 {
  if (!nativeV11) {
    logger.warn('[NotificationService] MpvPlayerModule not available');
    return null as any;
  }
  return nativeV11;
}

/** V13: resolve the module bridge lazily so jest / web previews fall back to no-op. */
function getBridge() {
  try {
    return getMpvPlayerModule();
  } catch {
    return null;
  }
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
    const mod = requireV11Module();
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
    const mod = requireV11Module();
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
    const mod = requireV11Module();
    if (!mod) return;
    mod.stopNotification();
  },

  /**
   * Check whether the notification service is currently running.
   *
   * V13: routed through `getMpvPlayerModule()` (the typed bridge has
   * this method). The V11 `MpvPlayerModule.isNotificationActive` RPC
   * is the same call under the hood — just typed now.
   */
  isActive(): boolean {
    const bridge = getBridge();
    if (!bridge) return false;
    try {
      return bridge.isNotificationActive();
    } catch {
      return false;
    }
  },

  // ── Permission (Android 13+) ───────────────────────────────────────────

  /**
   * Request POST_NOTIFICATIONS permission on Android 13+.
   * Safe to call on older versions (no-op).
   *
   * V13: routed through `getMpvPlayerModule()` (the typed bridge has
   * this method). Identical to the V11 RPC.
   */
  requestPermission(): void {
    if (Platform.OS !== 'android') return;
    const bridge = getBridge();
    if (!bridge) return;
    try {
      bridge.requestNotificationPermission();
    } catch {
      // Permission request not available
    }
  },

  // ── Event Subscriptions ────────────────────────────────────────────────
  //
  // V13 note: the V11 `MpvPlayer.on(event, handler)` API has been
  // replaced by the module's `subscribePlayerEvent(event, handler)` —
  // but the notification events (`onNotificationPlay`, `onNotificationPause`,
  // etc.) are V11-specific MediaNotificationService.kt events that are
  // NOT part of the module's typed PlayerEventName union. They live on a
  // separate native event channel and are not routable through
  // `subscribePlayerEvent`. So this file keeps the `NativeEventEmitter`
  // path for the V11 notification events.

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
