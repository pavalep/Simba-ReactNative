// ────────────────────────────────────────────────────────
// Simba Player — WaveformBars Component (Phase 3)
//
// Animated equalizer-style bars. Thematic loading indicator
// for audio contexts (library scan, audio loading, etc).
// ────────────────────────────────────────────────────────

import React, {useRef, useMemo, useEffect} from 'react';
import {View, Animated, Easing, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {useAccessibility} from '../../../hooks/useAccessibility';

// ─── Helpers ────────────────────────────────────────────────

/** Generate random-ish base heights that look like an EQ */
const BASE_HEIGHTS = [0.4, 0.7, 1.0, 0.6, 0.3];

// ─── Props ───────────────────────────────────────────────────

export interface WaveformBarsProps {
  /** Bar color (default uses theme gold) */
  color?: string;
  /** Number of bars (default 5) */
  barCount?: number;
  /** Whether animation should play (default true) */
  isPlaying?: boolean;
  /** Bar width in px (default 4) */
  barWidth?: number;
  /** Total height in px (default 32) */
  height?: number;
  /** Gap between bars in px (default 3) */
  gap?: number;
}

// ─── Component ───────────────────────────────────────────────

export const WaveformBars: React.FC<WaveformBarsProps> = ({
  color: colorProp,
  barCount = 5,
  isPlaying = true,
  barWidth = 4,
  height = 32,
  gap = 3,
}) => {
  const {colors} = useTheme();
  const {reduceMotion} = useAccessibility();

  const activeColor = colorProp ?? colors.accent.gold;

  // Create animated values for each bar
  const barAnims = useRef<Animated.Value[]>([]);
  if (barAnims.current.length !== barCount) {
    barAnims.current = Array.from({length: barCount}, () => new Animated.Value(1));
  }

  const heights = useMemo(
    () =>
      Array.from({length: barCount}, (_, i) => {
        const base = BASE_HEIGHTS[i % BASE_HEIGHTS.length];
        return base * height;
      }),
    [barCount, height],
  );

  // ── Animation ──
  useEffect(() => {
    if (!isPlaying || reduceMotion) {
      // Set all to static 0.5 (mid position)
      barAnims.current.forEach(a => a.setValue(0.5));
      return;
    }

    const createBarAnim = (anim: Animated.Value, index: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0,
            duration: 400 + index * 60,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 1,
            duration: 400 + index * 60,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );

    const animations = barAnims.current.map((anim, i) => {
      // Each bar starts at a different point in the cycle
      const initialDelay = i * 120;
      anim.setValue(0.5);
      return Animated.sequence([
        Animated.delay(initialDelay),
        createBarAnim(anim, i),
      ]);
    });

    animations.forEach(a => a.start());

    return () => {
      animations.forEach(a => a.stop());
    };
  }, [isPlaying, barCount, reduceMotion]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          alignItems: 'center',
          height,
          gap,
        },
        bar: {
          width: barWidth,
          borderRadius: barWidth / 2,
          backgroundColor: activeColor,
        },
      }),
    [height, gap, barWidth, activeColor],
  );

  return (
    <View style={styles.container}>
      {barAnims.current.slice(0, barCount).map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              height,
              transform: [
                {
                  scaleY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.25, 1],
                  }),
                },
              ],
              opacity: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.6, 1],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
};
