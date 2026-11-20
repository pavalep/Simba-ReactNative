// ────────────────────────────────────────────────────────
// Simba Player — Animation Presets (Phase 3)
// ────────────────────────────────────────────────────────

import {Animated, Easing} from 'react-native';

/** Standard duration presets */
 const DURATION = {
  fast: 200,
  normal: 350,
  slow: 600,
  verySlow: 1000,
} as const;

// ── Single-value animations ────────────────────────────

/** Fade in: 0 → 1 */
export function fadeIn(
  value: Animated.Value,
  duration: number = DURATION.normal,
): Animated.CompositeAnimation {
  return Animated.timing(value, {
    toValue: 1,
    duration,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  });
}


/** Scale in: `from` (default 0.85) → 1 */
export function scaleIn(
  value: Animated.Value,
  duration: number = DURATION.normal,
  from: number = 0.85,
): Animated.CompositeAnimation {
  value.setValue(from);
  return Animated.timing(value, {
    toValue: 1,
    duration,
    easing: Easing.out(Easing.back(1.2)),
    useNativeDriver: true,
  });
}




// ── Group / staggered animations ───────────────────────

/**
 * Run an array of pre-built Animated.CompositeAnimation in parallel.
 * Each animation is triggered at `index * staggerDelay` ms.
 */



