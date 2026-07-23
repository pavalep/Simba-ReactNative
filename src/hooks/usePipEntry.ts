import {useCallback, useRef} from 'react';
import {PanResponder, Platform} from 'react-native';
import {NativeModules} from 'react-native';

const {MpvPlayerModule} = NativeModules;

const SWIPE_THRESHOLD = 80; // minimum downward distance (px)
const VELOCITY_THRESHOLD = 0.3; // minimum downward velocity (px/ms)

/**
 * Hook that provides a PanResponder for swipe-down gesture detection
 * to trigger Android Picture-in-Picture entry on the video player surface.
 *
 * Usage:
 * ```tsx
 * const {pipPanResponder} = usePipEntry();
 * <View {...pipPanResponder.panHandlers}> ... </View>
 * ```
 *
 * Only effective on Android. Returns a no-op responder on iOS.
 */
export function usePipEntry() {
  const gestureStateRef = useRef({
    startY: 0,
    accumulatedDy: 0,
  });

  const enterPip = useCallback(() => {
    // Call Android native PiP entry — this uses the activity's
    // enterPictureInPictureMode() which is exposed via MpvPlayerModule
    // or the native module's own PiP method.
    try {
      MpvPlayerModule?.enterPip?.();
    } catch {
      // Module not available or PiP not supported
    }
  }, []);

  if (Platform.OS !== 'android') {
    return {pipPanResponder: PanResponder.create({onStartShouldSetPanResponder: () => false})};
  }

  const pipPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      // Only respond to significant downward swipe with sufficient velocity
      return (
        gestureState.dy > SWIPE_THRESHOLD * 0.3 &&
        gestureState.vy > VELOCITY_THRESHOLD
      );
    },
    onPanResponderGrant: (_, gestureState) => {
      gestureStateRef.current = {
        startY: gestureState.y0,
        accumulatedDy: 0,
      };
    },
    onPanResponderMove: (_, gestureState) => {
      gestureStateRef.current.accumulatedDy = gestureState.dy;
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > SWIPE_THRESHOLD && gestureState.vy > VELOCITY_THRESHOLD) {
        enterPip();
      }
    },
    onPanResponderTerminate: () => {
      // Gesture interrupted — do nothing
    },
  });

  return {pipPanResponder};
}
