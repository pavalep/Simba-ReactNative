// ────────────────────────────────────────────────────────
// Simba Player — PulseRing Component (Phase 3)
//
// Single expanding/fading ring. Can be stacked for effect.
// ────────────────────────────────────────────────────────

import React, {useRef, useMemo, useEffect} from 'react';
import {View, Animated, Easing, StyleSheet} from 'react-native';
import {useAccessibility} from '../../../hooks/useAccessibility';

// ─── Props ───────────────────────────────────────────────────

export interface PulseRingProps {
  /** Ring diameter in px (default 80) */
  size?: number;
  /** Ring color (default uses gold) */
  color?: string;
  /** Delay before animation starts in ms (default 0) */
  delay?: number;
  /** Ring border width (default 2) */
  borderWidth?: number;
}

// ─── Component ───────────────────────────────────────────────

export const PulseRing: React.FC<PulseRingProps> = ({
  size = 80,
  color = '#C9A84C',
  delay = 0,
  borderWidth = 2,
}) => {
  const {reduceMotion} = useAccessibility();

  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0.2);
      scale.setValue(1);
      return;
    }

    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.8,
            duration: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    anim.start();

    return () => anim.stop();
  }, [reduceMotion, delay, scale, opacity]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        ring: {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
          borderColor: color,
          position: 'absolute',
        },
      }),
    [size, borderWidth, color],
  );

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          transform: [{scale}],
          opacity,
        },
      ]}
    />
  );
};
