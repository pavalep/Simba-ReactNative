import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../theme';

interface BufferingBarProps {
  visible: boolean;
}

const BUFFERING_BAR_HEIGHT = 3;

/**
 * Thin gold shimmer bar rendered below the SeekBar when the video is
 * buffering (YouTube-style).  Uses a looping translateX animation to
 * create a shimmer/pulse effect.
 */
export const BufferingBar: React.FC<BufferingBarProps> = ({visible}) => {
  const {colors} = useTheme();
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // ── Fade in/out with visibility ──
  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, opacityAnim]);

  // ── Looping shimmer slide ──
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, shimmerAnim]);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 400],
  });

  return (
    <View
      style={[styles.container, {opacity: opacityAnim}]}
      pointerEvents="none">
      <Animated.View
        style={[
          styles.bar,
          {
            backgroundColor: colors.accent.gold,
            transform: [{translateX: shimmerTranslate}],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: BUFFERING_BAR_HEIGHT,
    overflow: 'hidden',
  },
  bar: {
    width: '30%',
    height: '100%',
    borderRadius: BUFFERING_BAR_HEIGHT / 2,
  },
});

export default BufferingBar;
