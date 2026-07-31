import React, {useEffect, useRef} from 'react';
import {
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {useTheme} from '../../../theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface SeekFeedbackOverlayProps {
  /** Side of the double-tap that triggered the seek */
  side: 'left' | 'right';
  /** Whether the seek feedback should be visible */
  visible: boolean;
}

/**
 * Animated seek direction indicator shown on double-tap gesture.
 *
 * Animation flow:
 * 1. Scale 0.5→1.0 + Opacity 0→1 over 200ms
 * 2. Hold for 600ms
 * 3. Opacity 1→0 over 200ms
 *
 * Total ~1s visibility window. Renders "-10s" on left or "+10s" on right.
 */
export const SeekFeedbackOverlay: React.FC<SeekFeedbackOverlayProps> = ({
  side,
  visible,
}) => {
  const {colors} = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        side === 'left' ? styles.left : styles.right,
        {
          opacity: opacityAnim,
          transform: [{scale: scaleAnim}],
          backgroundColor: colors.background.scrimDeep,
        },
      ]}
      pointerEvents="none">
      <AppText
        style={[
          styles.label,
          {
            color: colors.accent.gold,
            textShadowColor: colors.background.primary + '80',
          },
        ]}>
        {side === 'left' ? '-10s' : '+10s'}
      </AppText>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '40%',
    zIndex: 100,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  left: {
    left: SCREEN_WIDTH * 0.15,
  },
  right: {
    right: SCREEN_WIDTH * 0.15,
  },
  label: {
    fontSize: 24,
    fontWeight: '700',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },
});
