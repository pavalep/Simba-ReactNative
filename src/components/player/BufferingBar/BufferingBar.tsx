import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../theme';
import {useAccessibility} from '../../../hooks/useAccessibility';
import {ActivityOrb} from '../../feedback/ActivityOrb/ActivityOrb';

interface BufferingBarProps {
  visible: boolean;
}

const BUFFERING_BAR_HEIGHT = 3;

/**
 * Buffering indicator (31.4): a centered branded ActivityOrb over the video
 * during stalls, plus a thin gold shimmer bar pinned below the SeekBar
 * (YouTube-style).  Both fade in/out together on `visible`.
 */
export const BufferingBar: React.FC<BufferingBarProps> = ({visible}) => {
  const {colors} = useTheme();
  const {reduceMotion} = useAccessibility();
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
    if (reduceMotion) {
      // 59.7: reduced motion — static shimmer bar, no slide loop
      shimmerAnim.setValue(0);
      return;
    }
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
  }, [visible, shimmerAnim, reduceMotion]);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 400],
  });

  return (
    <>
      {/* Centered branded buffering orb over the video (31.4) */}
      <Animated.View
        pointerEvents="none"
        accessibilityLiveRegion="polite"
        accessibilityLabel={visible ? 'Buffering' : undefined}
        style={[styles.overlay, {opacity: opacityAnim}]}>
        <ActivityOrb size={52} label="Buffering…" />
      </Animated.View>

      {/* Thin gold shimmer bar pinned below the seek bar */}
      <View style={styles.barRow} pointerEvents="none">
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
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 16,
  },
  barRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 4,
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
