import React, {useEffect, useRef} from 'react';
import {
  Animated,
  StyleSheet,
  Dimensions,
  View,
} from 'react-native';
import {AppText} from '../../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../../components/utility/SvgIcon/SvgIcon';
import {useTheme} from '../../../../theme';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

interface SeekFeedbackOverlayProps {
  /** Side of the double-tap that triggered the seek */
  side: 'left' | 'right';
  /** Whether the seek feedback should be visible */
  visible: boolean;
}

/**
 * Animated seek direction indicator shown on double-tap gesture.
 *
 * A circular glass disc with a vector skip-back/skip-forward icon and
 * a gold "10" label. Animates in with scale + soft glow, holds, fades.
 */
export const SeekFeedbackOverlay: React.FC<SeekFeedbackOverlayProps> = ({
  side,
  visible,
}) => {
  const {colors} = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.4)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Entrance: scale 0.4 → 1.0 with a slight overshoot, fade in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 4,
          tension: 120,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Exit: scale down + fade
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.4,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
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
        },
      ]}
      pointerEvents="none">
      <View style={[styles.disc, {backgroundColor: 'rgba(10,10,12,0.78)', borderColor: 'rgba(255,255,255,0.14)'}]}>
        <SvgIcon
          name={side === 'left' ? 'skipBack' : 'skipForward'}
          size={28}
          color={colors.accent.gold}
        />
        <AppText style={[styles.label, {color: '#FFFFFF'}]}>10</AppText>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '38%',
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  left: {
    left: SCREEN_WIDTH * 0.18,
  },
  right: {
    right: SCREEN_WIDTH * 0.18,
  },
  disc: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.3,
  },
});
