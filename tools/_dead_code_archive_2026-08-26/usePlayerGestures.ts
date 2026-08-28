// ────────────────────────────────────────────────────────
// Simba Player — Unified Gesture Handler Hook
// ────────────────────────────────────────────────────────
// Phase 13: Extracts gesture logic into a reusable hook
// for both VideoPlayerGestureLayer and other surfaces.

import {useRef, useCallback, useEffect} from 'react';
import {Dimensions, PanResponder, GestureResponderEvent, PanResponderGestureState} from 'react-native';

const EDGE_THRESHOLD = 0.15;
const VERTICAL_SLOP = 8;
const PX_PER_PERCENT = 3;
const SWIPE_VELOCITY_THRESHOLD = 0.5;
const SWIPE_DISTANCE_THRESHOLD = 50;
const DOUBLE_TAP_DELAY = 300;

export type GestureZone = 'none' | 'center' | 'volume' | 'brightness';

export interface GestureCallbacks {
  onSingleTap?: () => void;
  onDoubleTapLeft?: () => void;
  onDoubleTapRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onVolumeChange?: (delta: number) => void;
  onBrightnessChange?: (delta: number) => void;
  onVolumeGestureEnd?: () => void;
  onBrightnessGestureEnd?: () => void;
}

export interface PlayerGestureHandle {
  panHandlers: ReturnType<typeof PanResponder.create>['panHandlers'];
  gestureZone: React.MutableRefObject<GestureZone>;
}

/**
 * Unified gesture hook for video player surfaces.
 * Handles double-tap, single-tap, edge volume/brightness, center swipes.
 * Returns panHandlers to spread onto a View.
 */
export function usePlayerGestures(callbacks: GestureCallbacks): PlayerGestureHandle {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapX = useRef(0);
  const gestureType = useRef<GestureZone>('none');
  const lastVerticalPos = useRef(0);
  const startX = useRef(0);

  const handleSingleTap = useCallback(() => {
    callbacksRef.current.onSingleTap?.();
  }, []);

  const handleDoubleTap = useCallback((x: number) => {
    // Read the current window width at gesture time. The old module-level
    // width stayed portrait-sized after rotation, making the right half seek
    // backward and making edge volume/brightness zones inaccurate.
    const screenWidth = Dimensions.get('window').width;
    if (x < screenWidth / 2) {
      callbacksRef.current.onDoubleTapLeft?.();
    } else {
      callbacksRef.current.onDoubleTapRight?.();
    }
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => {
        return Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5;
      },

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const x = evt.nativeEvent.locationX;
        const screenWidth = Dimensions.get('window').width;
        startX.current = x;
        gestureType.current = 'none';
        lastVerticalPos.current = evt.nativeEvent.pageY;

        if (x < screenWidth * EDGE_THRESHOLD) {
          gestureType.current = 'volume';
        } else if (x > screenWidth * (1 - EDGE_THRESHOLD)) {
          gestureType.current = 'brightness';
        } else {
          gestureType.current = 'center';
          lastTapX.current = x;

          tapCount.current += 1;
          if (tapCount.current === 1) {
            tapTimer.current = setTimeout(() => {
              tapCount.current = 0;
              handleSingleTap();
            }, DOUBLE_TAP_DELAY);
          } else if (tapCount.current === 2) {
            if (tapTimer.current) clearTimeout(tapTimer.current);
            tapCount.current = 0;
            handleDoubleTap(lastTapX.current);
          }
        }
      },

      onPanResponderMove: (
        evt: GestureResponderEvent,
        _gestureState: PanResponderGestureState,
      ) => {
        if (gestureType.current === 'volume') {
          const deltaY = evt.nativeEvent.pageY - lastVerticalPos.current;
          if (Math.abs(deltaY) >= VERTICAL_SLOP) {
            const delta = -Math.round(deltaY / PX_PER_PERCENT);
            callbacksRef.current.onVolumeChange?.(delta);
            lastVerticalPos.current = evt.nativeEvent.pageY;
          }
        } else if (gestureType.current === 'brightness') {
          const deltaY = evt.nativeEvent.pageY - lastVerticalPos.current;
          if (Math.abs(deltaY) >= VERTICAL_SLOP) {
            const delta = -Math.round(deltaY / PX_PER_PERCENT);
            callbacksRef.current.onBrightnessChange?.(delta);
            lastVerticalPos.current = evt.nativeEvent.pageY;
          }
        }
      },

      onPanResponderRelease: (
        _evt: GestureResponderEvent,
        gestureState: PanResponderGestureState,
      ) => {
        if (gestureType.current === 'volume') {
          callbacksRef.current.onVolumeGestureEnd?.();
        } else if (gestureType.current === 'brightness') {
          callbacksRef.current.onBrightnessGestureEnd?.();
        } else if (gestureType.current === 'center') {
          const {vy, dy} = gestureState;
          if (Math.abs(vy) > SWIPE_VELOCITY_THRESHOLD || Math.abs(dy) > SWIPE_DISTANCE_THRESHOLD) {
            if (dy < -SWIPE_DISTANCE_THRESHOLD) {
              callbacksRef.current.onSwipeUp?.();
            } else if (dy > SWIPE_DISTANCE_THRESHOLD) {
              callbacksRef.current.onSwipeDown?.();
            }
          }
        }
        gestureType.current = 'none';
      },

      onPanResponderTerminate: () => {
        if (gestureType.current === 'volume') {
          callbacksRef.current.onVolumeGestureEnd?.();
        } else if (gestureType.current === 'brightness') {
          callbacksRef.current.onBrightnessGestureEnd?.();
        }
        gestureType.current = 'none';
      },
    }),
  ).current;

  // Clean up pending tap timer on unmount to prevent stale closure callback
  useEffect(() => {
    return () => {
      if (tapTimer.current) {
        clearTimeout(tapTimer.current);
      }
    };
  }, []);

  return {
    panHandlers: panResponder.panHandlers,
    gestureZone: gestureType,
  };
}
