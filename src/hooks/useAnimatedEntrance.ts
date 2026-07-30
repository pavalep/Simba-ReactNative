// ────────────────────────────────────────────────────────
// Simba Player — useAnimatedEntrance Hook (Phase 3)
// ────────────────────────────────────────────────────────

import {useRef, useEffect, useMemo} from 'react';
import {Animated} from 'react-native';
import {useAccessibility} from './useAccessibility';
import {fadeIn} from '../utils/animations';

type EntranceDirection = 'fade' | 'up' | 'scale' | 'right';

interface UseAnimatedEntranceOptions {
  /** Delay between each item in ms (default 80) */
  staggerDelay?: number;
  /** Entrance animation direction (default 'fade') */
  direction?: EntranceDirection;
  /** Duration for each item's entrance (default 350) */
  duration?: number;
}

interface EntranceResult {
  /** Animated style objects — pass to each item's `style` prop */
  styles: object[];
  /** Start the entrance sequence (auto-started by default). Call to re-trigger. */
  play: () => void;
}

/**
 * Staggered entrance animation for lists of items.
 *
 * @example
 * const {styles} = useAnimatedEntrance(3);
 * // In render:
 * items.map((item, i) => <Animated.View key={i} style={styles[i]} />)
 */
export function useAnimatedEntrance(
  itemCount: number,
  options: UseAnimatedEntranceOptions = {},
): EntranceResult {
  const {staggerDelay = 80, direction = 'fade', duration = 350} = options;
  const {reduceMotion} = useAccessibility();

  // Create stable Animated.Value references
  const valuesRef = useRef<Animated.Value[]>([]);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const values = useMemo(() => {
    if (valuesRef.current.length !== itemCount) {
      valuesRef.current = Array.from({length: itemCount}, () => new Animated.Value(0));
    }
    return valuesRef.current.slice(0, itemCount);
  }, [itemCount]);

  const play = () => {
    // If reduceMotion is on, set all to 1 instantly
    if (reduceMotion) {
      values.forEach(v => v.setValue(1));
      return;
    }

    // Stop any running animation
    if (animRef.current) {
      animRef.current.stop();
    }

    // Reset all to 0
    values.forEach(v => v.setValue(0));

    // Staggered fade-in
    const animations = values.map((v, i) => {
      const delayedAnim = Animated.sequence([
        Animated.delay(i * staggerDelay),
        fadeIn(v, duration),
      ]);
      return delayedAnim;
    });

    animRef.current = Animated.parallel(animations);
    animRef.current.start();
  };

  useEffect(() => {
    play();
    return () => {
      if (animRef.current) {
        animRef.current.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemCount, reduceMotion]);

  const styles = useMemo(
    () =>
      values.map(v => {
        const base: any = {opacity: v};
        if (direction === 'up') {
          base.transform = [
            {translateY: v.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            })},
          ];
        } else if (direction === 'scale') {
          base.transform = [
            {scaleX: v},
            {scaleY: v},
          ];
        } else if (direction === 'right') {
          base.transform = [
            {translateX: v.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            })},
          ];
        }
        return base;
      }),
    [values, direction],
  );

  return {styles, play};
}
