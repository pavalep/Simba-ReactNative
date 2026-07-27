import {useRef, useCallback} from 'react';
import {Animated, Dimensions} from 'react-native';

const SHRINK_SCALE = 0.35; // Final scale of the PiP preview
const SHRINK_DURATION = 250; // ms
const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

export interface UsePipEntryOptions {
  /** Called when shrink animation completes (after all UI is hidden) */
  onEnterPip: () => void;
  /** Whether PiP is currently active (disables gesture while in PiP) */
  isInPipMode: boolean;
}

export interface UsePipEntryReturn {
  /** Animated value for shrink scale (1 = full, SHRINK_SCALE = PiP-sized) */
  pipScale: Animated.Value;
  /** Animated value for X translation during shrink */
  pipTranslateX: Animated.Value;
  /** Animated value for Y translation during shrink */
  pipTranslateY: Animated.Value;
  /** Whether the shrink animation is currently playing */
  isAnimatingRef: React.MutableRefObject<boolean>;
  /**
   * Manually trigger the shrink-to-PiP animation.
   * Called from VideoPlayerGestureLayer's onSwipeDown handler.
   * After the animation completes, onEnterPip fires.
   */
  triggerShrinkAndEnterPip: () => void;
}

/**
 * Hook that provides animated values and a trigger function for the
 * shrink-to-PiP transition.
 *
 * The shrink animation preview transforms the video surface:
 * - Scale down to ~35%
 * - Translate to bottom-right corner
 * - After animation completes, calls onEnterPip (which hides UI + enters PiP)
 *
 * NOTE: This hook does NOT provide its own PanResponder to avoid conflicts
 * with VideoPlayerGestureLayer. Use triggerShrinkAndEnterPip from the
 * gesture layer's onSwipeDown handler.
 */
export function usePipEntry(options: UsePipEntryOptions): UsePipEntryReturn {
  const {onEnterPip, isInPipMode} = options;

  const pipScale = useRef(new Animated.Value(1)).current;
  const pipTranslateX = useRef(new Animated.Value(0)).current;
  const pipTranslateY = useRef(new Animated.Value(0)).current;
  const isAnimatingRef = useRef(false);
  const onEnterPipRef = useRef(onEnterPip);
  const isInPipModeRef = useRef(isInPipMode);

  onEnterPipRef.current = onEnterPip;
  isInPipModeRef.current = isInPipMode;

  const triggerShrinkAndEnterPip = useCallback(() => {
    // Guard: don't trigger if already in PiP or animating
    if (isInPipModeRef.current || isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    const targetTranslateX = SCREEN_WIDTH * (1 - SHRINK_SCALE) / 2 - 50; // offset right
    const targetTranslateY = SCREEN_HEIGHT * (1 - SHRINK_SCALE) - 40; // offset to bottom

    Animated.parallel([
      Animated.timing(pipScale, {
        toValue: SHRINK_SCALE,
        duration: SHRINK_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(pipTranslateX, {
        toValue: targetTranslateX,
        duration: SHRINK_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(pipTranslateY, {
        toValue: targetTranslateY,
        duration: SHRINK_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Animation complete — reset values for next use
      pipScale.setValue(1);
      pipTranslateX.setValue(0);
      pipTranslateY.setValue(0);
      isAnimatingRef.current = false;
      // Enter PiP (hides UI + calls native enterPip)
      onEnterPipRef.current();
    });
  }, [pipScale, pipTranslateX, pipTranslateY]);

  return {
    pipScale,
    pipTranslateX,
    pipTranslateY,
    isAnimatingRef,
    triggerShrinkAndEnterPip,
  };
}
