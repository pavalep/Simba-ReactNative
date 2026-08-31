import {Platform} from 'react-native';
import MpvPlayer from '../../../../native/player.api';
import type {VideoPlatformCapabilities} from '../domain/VideoTypes';

/**
 * Reports only capabilities backed by the current platform bridge.
 *
 *   • Android PiP: exposed via `MpvPlayer.enterPip` (activity / module
 *     contract). Available since the V3 surface landed.
 *   • Fullscreen / orientation (v11 T8.1): both `MpvPlayer.setOrientation`
 *     and `MpvPlayer.setImmersive` are added by the T8.1 native
 *     bridge on Android. When both are present the chip renders
 *     as a tappable control; otherwise it renders as a muted
 *     non-tappable chip per the v11 spec Rule 12.
 *   • canChangeOrientation tracks the same pair (orientation is
 *     a prerequisite for fullscreen on Android).
 */
export function createVideoPlatformCapabilities(): VideoPlatformCapabilities {
  const isAndroid = Platform.OS === 'android';
  const hasSetOrientation = typeof MpvPlayer.setOrientation === 'function';
  const hasSetImmersive = typeof MpvPlayer.setImmersive === 'function';
  const canPictureInPicture = isAndroid && typeof MpvPlayer.enterPip === 'function';
  const canFullscreen = isAndroid && hasSetOrientation && hasSetImmersive;
  const canChangeOrientation = canFullscreen;
  return {
    canPictureInPicture,
    canFullscreen,
    canChangeOrientation,
  };
}
