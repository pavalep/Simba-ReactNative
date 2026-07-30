// ────────────────────────────────────────────────────────
// Simba Player — Animation Presets (Phase 3)
// ────────────────────────────────────────────────────────

import {Animated, Easing} from 'react-native';

/** Standard duration presets */
export const DURATION = {
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

/** Slide in from below: translateY from `from` px to 0 */
export function slideInUp(
  value: Animated.Value,
  duration: number = DURATION.normal,
  from: number = 30,
): Animated.CompositeAnimation {
  value.setValue(from);
  return Animated.timing(value, {
    toValue: 0,
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

/** Spring-based scale: 0.85 → 1 */
export function springScale(
  value: Animated.Value,
): Animated.CompositeAnimation {
  value.setValue(0.85);
  return Animated.spring(value, {
    toValue: 1,
    damping: 10,
    mass: 0.8,
    stiffness: 200,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
    useNativeDriver: true,
  });
}

/** Pulsing loop: oscillates `value` between `min` and `max` */
export function pulseLoop(
  value: Animated.Value,
  min: number = 0.08,
  max: number = 0.16,
  duration: number = 1200,
): Animated.CompositeAnimation {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: max,
        duration: duration / 2,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: min,
        duration: duration / 2,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]),
  );
}

/** Pulsing scale loop: oscillates between `minScale` and `maxScale` */
export function pulseScaleLoop(
  value: Animated.Value,
  minScale: number = 0.95,
  maxScale: number = 1.05,
  duration: number = 1200,
): Animated.CompositeAnimation {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: maxScale,
        duration: duration / 2,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: minScale,
        duration: duration / 2,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]),
  );
}

// ── Group / staggered animations ───────────────────────

/**
 * Run an array of pre-built Animated.CompositeAnimation in parallel.
 * Each animation is triggered at `index * staggerDelay` ms.
 */
export function staggerAnimations(
  animations: Animated.CompositeAnimation[],
  staggerDelay: number = 80,
): Animated.CompositeAnimation {
  const timed = animations.map((anim, i) =>
    Animated.sequence([
      Animated.delay(i * staggerDelay),
      anim,
    ]),
  );
  return Animated.parallel(timed);
}

/**
 * Staggered entrance: fade + slide up for a list of animated values.
 * Returns a single parallel animation.
 */
export function staggerEntrance(
  values: Animated.Value[],
  {
    staggerDelay = 80,
    slideFrom = 20,
    duration = DURATION.normal,
  }: {
    staggerDelay?: number;
    slideFrom?: number;
    duration?: number;
  } = {},
): Animated.CompositeAnimation {
  return staggerAnimations(
    values.map(v => {
      const slideV = new Animated.Value(0);
      const fadeV = v;
      slideV.setValue(slideFrom);
      const slideAnim = Animated.timing(slideV, {
        toValue: 0,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      return slideAnim;
    }),
    staggerDelay,
  );
}

/** Rotate loop: 0deg → 360deg */
export function rotateLoop(
  value: Animated.Value,
  duration: number = 1200,
): Animated.CompositeAnimation {
  return Animated.loop(
    Animated.timing(value, {
      toValue: 1,
      duration,
      easing: Easing.linear,
      useNativeDriver: true,
    }),
  );
}

/** Simple linear interpolation helper */
export function interpolateRotate(value: Animated.Value): Animated.AnimatedInterpolation<string> {
  return value.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
}
