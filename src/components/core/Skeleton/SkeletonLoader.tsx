// ────────────────────────────────────────────────────────
// Simba Player — Base Skeleton Shimmer Component
// ────────────────────────────────────────────────────────
// Phase 15: Animated shimmer placeholder for loading states.

import React, {useEffect, useRef} from 'react';
import {View, Animated, StyleSheet, ViewStyle} from 'react-native';
import {useTheme} from '../../../theme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 6,
  style,
}) => {
  const {colors} = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <Animated.View
      accessible={true}
      accessibilityLabel="Loading content"
      accessibilityRole="progressbar"
      style={[
        styles.base,
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.border.subtle,
          opacity,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
