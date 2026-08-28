import {Platform} from 'react-native';
import MpvPlayer from '../../../../native/player.api';
import type {VideoPlatformCapabilities} from '../domain/VideoTypes';

/**
 * Reports only capabilities backed by the current platform bridge.
 *
 *   • Android PiP: exposed via `MpvPlayer.enterPip` (activity / module
 *     contract). Available since the V3 surface landed.
 *   • Fullscreen / orientation: W2.7 is intentionally deferred. The
 *     native bridge needs an Android `setRequestedOrientation` call
 *     and a `WindowInsetsController`-driven immersive mode hook
 *     (replaces the deprecated `setSystemUiVisibility`). Both live in
 *     `MpvBridgeModule` once the team decides to own them — until
 *     then `canFullscreen` and `canChangeOrientation` stay false so
 *     the UI doesn't show a button that does nothing.
 *
 * To enable later: add a `setOrientation(mode: 'portrait' | 'landscape' | 'sensor')`
 * and `setImmersive(enabled: boolean)` `@ReactMethod` to
 * `MpvBridgeModule.kt`, expose them via `player.api.ts`, and flip
 * the two booleans below based on the new methods' presence.
 */
export function createVideoPlatformCapabilities(): VideoPlatformCapabilities {
  const canPictureInPicture = Platform.OS === 'android' && typeof MpvPlayer.enterPip === 'function';
  return {
    canPictureInPicture,
    canFullscreen: false,
    canChangeOrientation: false,
  };
}
