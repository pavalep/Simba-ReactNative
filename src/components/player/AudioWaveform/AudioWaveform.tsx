import React, {useEffect, useRef, useMemo} from 'react';
import {View, Animated, StyleSheet, Easing} from 'react-native';
import {useTheme} from '../../../theme';
import {useAccessibility} from '../../../hooks/useAccessibility';

// ─── Constants ──────────────────────────────────────────────

const BAR_COUNT = 5;

// Pre-generate distinct peak heights for each bar
const BASE_PEAKS = [0.45, 0.85, 0.55, 0.95, 0.40];

// ─── Props ──────────────────────────────────────────────────

export interface AudioWaveformProps {
  /** Whether audio is actively playing */
  isPlaying: boolean;
  /** Bar color (defaults to theme gold) */
  color?: string;
  /** Overall size in points (controls bar height range, default: 24) */
  size?: number;
  /** Bar width override (default: 3) */
  barWidth?: number;
  /** Gap between bars (default: 3) */
  barGap?: number;
}

// ─── Component ──────────────────────────────────────────────

const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isPlaying,
  color,
  size = 24,
  barWidth = 3,
  barGap = 3,
}) => {
  const {colors} = useTheme();
  const {reduceMotion} = useAccessibility();
  const barColor = color ?? colors.accent.gold;

  // Create animated values for each bar
  const animValues = useRef(
    Array.from({length: BAR_COUNT}, () => new Animated.Value(0.5)),
  ).current;

  // Paused state: freeze each bar at a unique mid-range height.
  // 59.7: also freeze when reduced motion is on (static, no dance loop).
  useEffect(() => {
    if (!isPlaying || reduceMotion) {
      animValues.forEach((anim, i) => {
        Animated.timing(anim, {
          toValue: 0.35 + BASE_PEAKS[i] * 0.25, // freeze between 0.35-0.60
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start();
      });
      return;
    }
  }, [isPlaying, animValues, reduceMotion]);

  // ── Animate bars when playing ──
  useEffect(() => {
    if (!isPlaying || reduceMotion) return;

    const staggerAnimations = animValues.map((anim, i) => {
      const basePeak = BASE_PEAKS[i];
      const duration = 350 + Math.random() * 400;

      return Animated.sequence([
        // Rise to peak
        Animated.timing(anim, {
          toValue: 0.15 + basePeak * 0.75,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        // Fall back
        Animated.timing(anim, {
          toValue: 0.25 + basePeak * 0.25,
          duration: duration * 0.6,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
      ]);
    });

    const loop = Animated.loop(
      Animated.stagger(100, staggerAnimations),
      {iterations: -1},
    );

    loop.start();
    return () => loop.stop();
  }, [isPlaying, animValues, reduceMotion]);

  // ── Styles ──
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          height: size,
          gap: barGap,
        },
        barWrapper: {
          width: barWidth,
          height: size,
          justifyContent: 'flex-end',
          alignItems: 'center',
        },
        bar: {
          width: barWidth,
          borderRadius: barWidth / 2,
          backgroundColor: barColor,
        },
      }),
    [size, barGap, barWidth, barColor],
  );

  return (
    <View style={styles.container}>
      {animValues.map((anim, i) => (
        <View key={i} style={styles.barWrapper}>
          <Animated.View
            style={[
              styles.bar,
              {
                height: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [3, size * 0.9],
                }),
                opacity: anim.interpolate({
                  inputRange: [0, 0.3, 1],
                  outputRange: [0.3, 0.7, 1],
                }),
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
};

export default AudioWaveform;
