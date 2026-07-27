import {useRef, useMemo, useCallback} from 'react';
import {
  Animated,
  PanResponder,
  Dimensions,
  type GestureResponderEvent,
  type PanResponderGestureState,
  type PanResponderInstance,
} from 'react-native';
import {useKeyboard} from './useKeyboard';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_THRESHOLD = SCREEN_HEIGHT * 0.15; // 15% drag to dismiss
const SNAP_VELOCITY_THRESHOLD = 0.5; // points per frame velocity threshold

/**
 * Parse a snap point string to a pixel offset from the top of the screen.
 * Supports: '25%', '50%', '75%', '100%', or absolute pixel values like '300'.
 * The value represents how far from the TOP of the screen the sheet top sits.
 */
function parseSnapPoint(snap: string): number {
  if (snap.endsWith('%')) {
    const pct = parseFloat(snap);
    return (SCREEN_HEIGHT * pct) / 100;
  }
  return parseFloat(snap);
}

export interface UseBottomSheetOptions {
  /** Snap points: e.g. ['25%', '50%', '75%', '100%'] */
  snapPoints: string[];
  /** Initial snap index (default: 0 = first/farthest snap) */
  initialSnap?: number;
  /** Called when sheet fully closes (dismiss gesture completes) */
  onClose?: () => void;
  /** Called when snap index changes */
  onSnapChange?: (index: number) => void;
}

export interface UseBottomSheetReturn {
  /** Current animated translateY value (0 = fully open at top, screenHeight = closed) */
  animatedTranslateY: Animated.Value;
  /** PanResponder to attach to the sheet's drag handle / content area */
  panResponder: PanResponderInstance;
  /** Snap to a specific index */
  snapToIndex: (index: number) => void;
  /** Close the sheet (animate out + call onClose) */
  closeSheet: () => void;
  /** Current snap index */
  currentSnapIndex: number;
  /** Keyboard height for avoidance adjustment */
  keyboardHeight: number;
  /** Convert a snap point index to the pixel offset from bottom (for positioning content) */
  getSnapOffset: (index: number) => number;
}

export function useBottomSheet(options: UseBottomSheetOptions): UseBottomSheetReturn {
  const {snapPoints, initialSnap = 0, onClose, onSnapChange} = options;
  const {keyboardHeight} = useKeyboard();

  // ── Compute pixel snap points ──
  const pixelSnaps = useMemo(
    () => snapPoints.map(parseSnapPoint),
    [snapPoints],
  );

  // ── Ref-based state (avoid re-renders from gesture updates) ──
  const currentSnapIndexRef = useRef(initialSnap);
  const animatedTranslateY = useRef(new Animated.Value(pixelSnaps[initialSnap] ?? 0)).current;
  const isAnimatingRef = useRef(false);
  const lastGestureDy = useRef(0);

  // ── Snap helper ──
  const snapToIndex = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(index, pixelSnaps.length - 1));
      const target = pixelSnaps[clampedIndex];
      if (target === undefined) return;

      isAnimatingRef.current = true;
      currentSnapIndexRef.current = clampedIndex;

      Animated.spring(animatedTranslateY, {
        toValue: target,
        useNativeDriver: true,
        friction: 8,
        tension: 80,
      }).start(() => {
        isAnimatingRef.current = false;
      });

      onSnapChange?.(clampedIndex);
    },
    [pixelSnaps, animatedTranslateY, onSnapChange],
  );

  // ── Close sheet ──
  const closeSheet = useCallback(() => {
    isAnimatingRef.current = true;
    Animated.timing(animatedTranslateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      isAnimatingRef.current = false;
      currentSnapIndexRef.current = 0;
      onClose?.();
    });
  }, [animatedTranslateY, onClose]);

  // ── Find nearest snap index ──
  const findNearestSnap = useCallback(
    (currentY: number, velocityY: number): number => {
      const currentIndex = currentSnapIndexRef.current;

      // If dragging down fast enough past threshold, dismiss
      if (velocityY > SNAP_VELOCITY_THRESHOLD && currentY > pixelSnaps[currentIndex] + DISMISS_THRESHOLD) {
        return -1; // signal dismiss
      }

      // If dragging up fast, go to previous (further down) snap
      if (velocityY < -SNAP_VELOCITY_THRESHOLD && currentIndex < pixelSnaps.length - 1) {
        return currentIndex + 1;
      }
      // If dragging down fast, go to next (less down) snap
      if (velocityY > SNAP_VELOCITY_THRESHOLD && currentIndex > 0) {
        return currentIndex - 1;
      }

      // Find nearest snap by distance
      let nearest = currentIndex;
      let minDist = Math.abs(currentY - pixelSnaps[currentIndex]);
      for (let i = 0; i < pixelSnaps.length; i++) {
        const dist = Math.abs(currentY - pixelSnaps[i]);
        if (dist < minDist) {
          minDist = dist;
          nearest = i;
        }
      }
      return nearest;
    },
    [pixelSnaps],
  );

  // ── PanResponder ──
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isAnimatingRef.current,
        onMoveShouldSetPanResponder: (_, gs: PanResponderGestureState) => {
          // Only respond to vertical drags
          return !isAnimatingRef.current && Math.abs(gs.dy) > 5 && Math.abs(gs.dy) > Math.abs(gs.dx);
        },
        onPanResponderGrant: () => {
          lastGestureDy.current = 0;
          animatedTranslateY.extractOffset();
        },
        onPanResponderMove: (
          _: GestureResponderEvent,
          gs: PanResponderGestureState,
        ) => {
          lastGestureDy.current = gs.dy;
          const currentBase = pixelSnaps[currentSnapIndexRef.current];
          const newValue = currentBase + gs.dy;

          // Clamp: don't let the sheet go above the top snap point
          const topmost = pixelSnaps[pixelSnaps.length - 1] ?? 0;
          const clampedValue = Math.max(topmost, Math.min(SCREEN_HEIGHT, newValue));

          animatedTranslateY.setOffset(clampedValue - currentBase);
          animatedTranslateY.setValue(currentBase);
        },
        onPanResponderRelease: (
          _: GestureResponderEvent,
          gs: PanResponderGestureState,
        ) => {
          animatedTranslateY.flattenOffset();
          const currentPos = pixelSnaps[currentSnapIndexRef.current] + gs.dy;
          const clampedPos = Math.max(
            pixelSnaps[pixelSnaps.length - 1] ?? 0,
            Math.min(SCREEN_HEIGHT, currentPos),
          );

          const nearest = findNearestSnap(clampedPos, gs.vy);

          if (nearest === -1) {
            closeSheet();
          } else {
            snapToIndex(nearest);
          }
        },
        onPanResponderTerminate: () => {
          animatedTranslateY.flattenOffset();
          snapToIndex(currentSnapIndexRef.current);
        },
      }),
    [animatedTranslateY, pixelSnaps, findNearestSnap, snapToIndex, closeSheet],
  );

  // ── Public API ──
  const getSnapOffset = useCallback(
    (index: number): number => {
      const snap = pixelSnaps[index];
      return snap !== undefined ? SCREEN_HEIGHT - snap : 0;
    },
    [pixelSnaps],
  );

  return {
    animatedTranslateY,
    panResponder,
    snapToIndex,
    closeSheet,
    currentSnapIndex: currentSnapIndexRef.current,
    keyboardHeight,
    getSnapOffset,
  };
}
