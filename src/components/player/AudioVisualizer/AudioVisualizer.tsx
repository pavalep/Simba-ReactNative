import React, {useEffect, useRef, useMemo} from 'react';
import {View, Animated, StyleSheet, Easing} from 'react-native';
import {useTheme} from '../../../theme';

// ─── Constants ──────────────────────────────────────────────

const BAR_COUNT = 32;
const BAR_MIN = 0.08;
const BAR_MAX = 1;

// Pre-generate random base heights for organic look
const BASE_PEAKS = Array.from({length: BAR_COUNT}, () =>
  0.3 + Math.random() * 0.7,
);

// ─── Props ──────────────────────────────────────────────────

export interface AudioVisualizerProps {
  /** Whether audio is actively playing */
  isPlaying: boolean;
  /** Bar width override (default: 3) */
  barWidth?: number;
  /** Bar gap override (default: 2) */
  barGap?: number;
  /** Visualizer height override (default: 60) */
  height?: number;
}

// ─── Component ──────────────────────────────────────────────

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  barWidth = 3,
  barGap = 2,
  height = 60,
}) => {
  const {colors} = useTheme();

  // Create animated values for each bar
  const animValues = useRef(
    Array.from({length: BAR_COUNT}, () => new Animated.Value(BAR_MIN)),
  ).current;

  // ── Animate each bar independently ──
  useEffect(() => {
    const animations = animValues.map((anim, i) => {
      const basePeak = BASE_PEAKS[i];
      const duration = 400 + Math.random() * 600;
      const targetHeight = isPlaying ? BAR_MIN + basePeak * (BAR_MAX - BAR_MIN) : BAR_MIN;

      return Animated.sequence([
        Animated.timing(anim, {
          toValue: targetHeight,
          duration: isPlaying ? duration : 300,
          easing: isPlaying ? Easing.inOut(Easing.sin) : Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        // When playing, bounce back down and then oscillate
        ...(isPlaying
          ? [
              Animated.timing(anim, {
                toValue: BAR_MIN,
                duration: duration * 0.6,
                easing: Easing.out(Easing.quad),
                useNativeDriver: false,
              }),
            ]
          : []),
      ]);
    });

    const loop = Animated.loop(
      Animated.stagger(80, animations),
      {iterations: isPlaying ? -1 : 1},
    );

    loop.start();
    return () => loop.stop();
  }, [isPlaying, animValues]);

  // ── Styles ──
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          height,
          paddingHorizontal: 16,
          gap: barGap,
        },
        barWrapper: {
          width: barWidth,
          height,
          justifyContent: 'flex-end',
          alignItems: 'center',
        },
        bar: {
          width: barWidth,
          borderRadius: barWidth / 2,
          backgroundColor: colors.accent.gold,
        },
      }),
    [colors, height, barWidth, barGap],
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
                  outputRange: [2, height * 0.85],
                }),
                opacity: anim.interpolate({
                  inputRange: [0, 0.3, 1],
                  outputRange: [0.25, 0.6, 1],
                }),
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
};

export default AudioVisualizer;
