import {Platform} from 'react-native';
import MpvPlayer from '../../../../native/player.api';
import type {VideoPlatformCapabilities} from '../domain/VideoTypes';

/**
 * Reports only capabilities backed by the current platform bridge. Android PiP
 * is available through the activity/module contract; fullscreen and orientation
 * remain hidden until V3 owns dedicated bridges for them.
 */
export function createVideoPlatformCapabilities(): VideoPlatformCapabilities {
  const canPictureInPicture = Platform.OS === 'android' && typeof MpvPlayer.enterPip === 'function';
  return {
    canPictureInPicture,
    canFullscreen: false,
    canChangeOrientation: false,
  };
}
