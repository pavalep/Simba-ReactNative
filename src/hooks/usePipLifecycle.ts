import {useEffect} from 'react';
import {Platform, DeviceEventEmitter} from 'react-native';
import {useAppDispatch, useAppSelector} from '../store';
import {
  enterPip,
  exitPip,
  resetPipState,
  selectIsInPipMode,
} from '../store/slices/pipSlice';
import {MpvPlayer} from '../native';
import {clearAllRecent} from '../store/slices/sessionSlice';

/**
 * Hook that listens for native PiP mode change events and PiP RemoteAction
 * events, synchronizing Redux state and player lifecycle accordingly.
 *
 * Must be called inside a component that manages the player surface
 * (e.g. VideoPlayerScreen).
 */
export function usePipLifecycle(fileUri: string | undefined, fileTitle: string) {
  const dispatch = useAppDispatch();
  const isInPipMode = useAppSelector(selectIsInPipMode);
  const position = useAppSelector(state => state.pip.pipedPosition);

  // ── PiP mode change (enter / exit) ──
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = DeviceEventEmitter.addListener(
      'onPipModeChanged',
      (params: {isInPip: boolean}) => {
        if (params.isInPip) {
          // Entering PiP — save current state
          const currentPos = MpvPlayer.getPosition();
          dispatch(
            enterPip({
              uri: fileUri ?? '',
              position: currentPos,
              title: fileTitle,
            }),
          );
          // Pause playback while in PiP
          try {
            MpvPlayer.pause();
          } catch {
            // player may already be idle
          }
        } else {
          // Exiting PiP — restore full UI
          dispatch(exitPip());
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [dispatch, fileUri, fileTitle]);

  // ── PiP RemoteAction events ──
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const playPauseSub = DeviceEventEmitter.addListener(
      'onPipPlayPause',
      () => {
        try {
          MpvPlayer.togglePlayPause();
        } catch {
          // player not available
        }
      },
    );

    const closeSub = DeviceEventEmitter.addListener('onPipClose', () => {
      // Close PiP: destroy player, clear session, reset pip state
      try {
        MpvPlayer.stop();
        MpvPlayer.destroy();
      } catch {
        // player already destroyed
      }
      dispatch(clearAllRecent());
      dispatch(resetPipState());
    });

    const nextSub = DeviceEventEmitter.addListener('onPipNext', () => {
      try {
        MpvPlayer.next();
      } catch {
        // not in playlist mode
      }
    });

    const prevSub = DeviceEventEmitter.addListener('onPipPrev', () => {
      try {
        MpvPlayer.previous();
      } catch {
        // not in playlist mode
      }
    });

    return () => {
      playPauseSub.remove();
      closeSub.remove();
      nextSub.remove();
      prevSub.remove();
    };
  }, [dispatch]);

  return {isInPipMode, position};
}
