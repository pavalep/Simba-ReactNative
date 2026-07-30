// ────────────────────────────────────────────────────────
// Simba Player — ActivityOrb Component (Phase 3)
//
// 3 concentric pulsing rings + center gold orb.
// Replace ActivityIndicator with this branded spinner.
// ────────────────────────────────────────────────────────

import React, {useRef, useMemo, useEffect} from 'react';
import {View, Animated, Easing, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {AppText} from '../../core/AppText/AppText';
import {useAccessibility} from '../../../hooks/useAccessibility';

// ─── Props ───────────────────────────────────────────────────

export interface ActivityOrbProps {
  /** Overall size in px (default 48) */
  size?: number;
  /** Accent color (default uses theme gold) */
  color?: string;
  /** Optional label below the orb */
  label?: string;
}

// ─── Component ───────────────────────────────────────────────

export const ActivityOrb: React.FC<ActivityOrbProps> = ({
  size = 48,
  color: colorProp,
  label,
}) => {
  const {colors} = useTheme();
  const {reduceMotion} = useAccessibility();

  const activeColor = colorProp ?? colors.accent.gold;
  const ringSize = size;
  const orbSize = size * 0.35;

  // ── Animated values ──
  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.25)).current;
  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0.25)).current;
  const ring3Scale = useRef(new Animated.Value(1)).current;
  const ring3Opacity = useRef(new Animated.Value(0.25)).current;
  const orbScale = useRef(new Animated.Value(1)).current;

  // ── Animation ──
  useEffect(() => {
    if (reduceMotion) {
      // Static state for reduced motion
      ring1Opacity.setValue(0.15);
      ring2Opacity.setValue(0.15);
      ring3Opacity.setValue(0.15);
      ring1Scale.setValue(1);
      ring2Scale.setValue(1);
      ring3Scale.setValue(1);
      orbScale.setValue(1);
      return;
    }

    const loopDuration = 1200;
    const staggerOffset = 180; // ms between rings

    const createRingAnim = (
      scale: Animated.Value,
      opacity: Animated.Value,
      delay: number,
    ) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 1.6,
              duration: loopDuration * 0.5,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: loopDuration * 0.5,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 1,
              duration: loopDuration * 0.5,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.25,
              duration: loopDuration * 0.5,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]),
      );

    const ring1 = createRingAnim(ring1Scale, ring1Opacity, 0);
    const ring2 = createRingAnim(ring2Scale, ring2Opacity, staggerOffset);
    const ring3 = createRingAnim(ring3Scale, ring3Opacity, staggerOffset * 2);

    // Center orb gentle pulse
    const orbPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, {
          toValue: 1.12,
          duration: loopDuration * 0.5,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbScale, {
          toValue: 1,
          duration: loopDuration * 0.5,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    ring1.start();
    ring2.start();
    ring3.start();
    orbPulse.start();

    return () => {
      ring1.stop();
      ring2.stop();
      ring3.stop();
      orbPulse.stop();
    };
  }, [reduceMotion, ring1Scale, ring1Opacity, ring2Scale, ring2Opacity, ring3Scale, ring3Opacity, orbScale]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: 'center',
          justifyContent: 'center',
        },
        ringContainer: {
          width: ringSize,
          height: ringSize,
          alignItems: 'center',
          justifyContent: 'center',
        },
        ring: {
          position: 'absolute',
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          borderWidth: 2.5,
        },
        orb: {
          position: 'absolute',
          width: orbSize,
          height: orbSize,
          borderRadius: orbSize / 2,
        },
        label: {
          marginTop: 8,
          textAlign: 'center',
        },
      }),
    [ringSize, orbSize],
  );

  const ringStyle = (scale: Animated.Value, opacity: Animated.Value) => ({
    transform: [{scale}],
    opacity,
  });

  return (
    <View style={styles.container}>
      <View style={styles.ringContainer}>
        {/* Ring 3 (outermost, starts latest) */}
        <Animated.View
          style={[
            styles.ring,
            {
              borderColor: activeColor,
              ...ringStyle(ring3Scale, ring3Opacity),
            },
          ]}
        />
        {/* Ring 2 */}
        <Animated.View
          style={[
            styles.ring,
            {
              borderColor: activeColor,
              ...ringStyle(ring2Scale, ring2Opacity),
            },
          ]}
        />
        {/* Ring 1 (innermost, starts first) */}
        <Animated.View
          style={[
            styles.ring,
            {
              borderColor: activeColor,
              ...ringStyle(ring1Scale, ring1Opacity),
            },
          ]}
        />
        {/* Center orb */}
        <Animated.View
          style={[
            styles.orb,
            {
              backgroundColor: activeColor,
              transform: [{scale: orbScale}],
            },
          ]}
        />
      </View>
      {label && (
        <AppText variant="caption" color="secondary" style={styles.label}>
          {label}
        </AppText>
      )}
    </View>
  );
};
