// ────────────────────────────────────────────────────────
// Simba Player — Screen Transition Animations (Atlas 13.2)
// ────────────────────────────────────────────────────────

import {useRef, useCallback, useEffect} from 'react';
import {Animated} from 'react-native';
import {animations} from '../theme/animations';

// ─── Enter Animation ─────────────────────────────────────

export function useEnterAnimation(): {
  animatedValue: Animated.Value;
  ref: React.RefObject<Animated.AnimatedComponent<typeof Animated.View> | null>;
} {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const ref = useRef<Animated.AnimatedComponent<typeof Animated.View> | null>(
    null,
  );

  useEffect(() => {
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: animations.duration.normal,
      easing: animations.easing.decelerate,
      useNativeDriver: true,
    }).start();
  }, [animatedValue]);

  return {animatedValue, ref};
}

// ─── Exit Animation ──────────────────────────────────────

export function useExitAnimation(
  onFinish?: () => void,
): {
  animatedValue: Animated.Value;
  triggerExit: () => void;
} {
  const animatedValue = useRef(new Animated.Value(0)).current;

  const triggerExit = useCallback(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: animations.duration.normal,
      easing: animations.easing.accelerate,
      useNativeDriver: true,
    }).start(onFinish);
  }, [animatedValue, onFinish]);

  return {animatedValue, triggerExit};
}

// ─── Tab Press Animation ─────────────────────────────────

export function useTabPressAnimation(): {
  animatedValue: Animated.Value;
  onPressIn: () => void;
  onPressOut: () => void;
} {
  const animatedValue = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(animatedValue, {
      toValue: 0.92,
      useNativeDriver: true,
      ...animations.spring.snappy,
    }).start();
  }, [animatedValue]);

  const onPressOut = useCallback(() => {
    Animated.spring(animatedValue, {
      toValue: 1.0,
      useNativeDriver: true,
      ...animations.spring.snappy,
    }).start();
  }, [animatedValue]);

  return {animatedValue, onPressIn, onPressOut};
}
