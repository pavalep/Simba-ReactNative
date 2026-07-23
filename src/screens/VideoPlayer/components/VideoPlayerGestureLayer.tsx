import React, { useRef, useCallback } from 'react';
import {
  View,
  PanResponder,
  StyleSheet,
  type GestureResponderEvent,
  type PanResponderGestureState,
  type LayoutChangeEvent,
} from 'react-native';
import { useTheme } from '../../../theme';

export interface VideoPlayerGestureLayerProps {
  onSingleTap: () => void;
  onDoubleTapLeft: () => void;
  onDoubleTapRight: () => void;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  children: React.ReactNode;
}

const DOUBLE_TAP_DELAY = 300;
const DOUBLE_TAP_TOLERANCE = 100;
const SWIPE_THRESHOLD = 50;
const SWIPE_HORIZONTAL_TOLERANCE = 30;

interface TapState {
  timestamp: number;
  x: number;
  y: number;
}

const VideoPlayerGestureLayer: React.FC<VideoPlayerGestureLayerProps> = ({
  onSingleTap,
  onDoubleTapLeft,
  onDoubleTapRight,
  onSwipeUp,
  onSwipeDown,
  children,
}) => {
  const theme = useTheme();
  const lastTapRef = useRef<TapState | null>(null);
  const layoutWidthRef = useRef<number>(0);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    layoutWidthRef.current = event.nativeEvent.layout.width;
  }, []);

  const isDoubleTap = useCallback(
    (currentTap: TapState): boolean => {
      const lastTap = lastTapRef.current;
      if (!lastTap) {
        return false;
      }
      const timeDelta = currentTap.timestamp - lastTap.timestamp;
      if (timeDelta > DOUBLE_TAP_DELAY) {
        return false;
      }
      const distance = Math.sqrt(
        (currentTap.x - lastTap.x) ** 2 + (currentTap.y - lastTap.y) ** 2,
      );
      if (distance > DOUBLE_TAP_TOLERANCE) {
        return false;
      }
      return true;
    },
    [],
  );

  const callbacksRef = useRef({
    onSingleTap,
    onDoubleTapLeft,
    onDoubleTapRight,
    onSwipeUp,
    onSwipeDown,
  });
  callbacksRef.current = {onSingleTap, onDoubleTapLeft, onDoubleTapRight, onSwipeUp, onSwipeDown};

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event: GestureResponderEvent) => {
        const { locationX, locationY } = event.nativeEvent;
        const now = Date.now();
        const currentTap: TapState = {
          timestamp: now,
          x: locationX,
          y: locationY,
        };

        if (isDoubleTap(currentTap)) {
          // Double tap detected — prevent single tap from firing
          lastTapRef.current = null;

          const midX = layoutWidthRef.current / 2;
          if (locationX < midX) {
            callbacksRef.current.onDoubleTapLeft();
          } else {
            callbacksRef.current.onDoubleTapRight();
          }
        } else {
          lastTapRef.current = currentTap;
        }
      },
      onPanResponderRelease: (
        _event: GestureResponderEvent,
        gestureState: PanResponderGestureState,
      ) => {
        const { dx, dy } = gestureState;

        // Swipe detection: vertical movement > threshold with minimal horizontal movement
        if (Math.abs(dy) > SWIPE_THRESHOLD && Math.abs(dx) < SWIPE_HORIZONTAL_TOLERANCE) {
          // Clear last tap so single tap doesn't fire after a swipe
          lastTapRef.current = null;

          if (dy < 0) {
            callbacksRef.current.onSwipeUp();
          } else {
            callbacksRef.current.onSwipeDown();
          }
          return;
        }

        // If no swipe, schedule single tap check after the double-tap window
        if (lastTapRef.current !== null) {
          const currentTimestamp = lastTapRef.current.timestamp;
          setTimeout(() => {
            // Only fire single tap if a double tap hasn't since consumed this tap
            if (
              lastTapRef.current !== null &&
              lastTapRef.current.timestamp === currentTimestamp
            ) {
              lastTapRef.current = null;
              callbacksRef.current.onSingleTap();
            }
          }, DOUBLE_TAP_DELAY);
        }
      },
    }),
  ).current;

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { borderColor: theme.colors.background.floating },
      ]}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      {children}
    </View>
  );
};

export default VideoPlayerGestureLayer;
