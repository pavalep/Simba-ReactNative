import React from 'react';
import {
  Animated,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import {useTheme} from '../../../theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface BottomSheetBackdropProps {
  /** Animated translateY value from the sheet (0 = open at top) */
  animatedTranslateY: Animated.Value;
  /** Whether the backdrop is pressable to dismiss */
  dismissable?: boolean;
  /** Called when backdrop is pressed */
  onPress?: () => void;
}

export const BottomSheetBackdrop: React.FC<BottomSheetBackdropProps> = ({
  animatedTranslateY,
  dismissable = true,
  onPress,
}) => {
  const {colors} = useTheme();

  // Opacity: 0 when sheet is fully closed (translateY = screenHeight),
  // maxOpacity when sheet is at top (translateY = 0)
  const backdropOpacity = animatedTranslateY.interpolate({
    inputRange: [0, SCREEN_HEIGHT * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const backdrop = (
    <Animated.View
      style={[
        styles.backdrop,
        {
          opacity: backdropOpacity,
        },
      ]}>
      {Platform.OS === 'ios' ? (
        <BlurView
          blurType="dark"
          blurAmount={10}
          reducedTransparencyFallbackColor={colors.background.primary}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: colors.background.primary,
              opacity: backdropOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.7],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      )}
    </Animated.View>
  );

  if (dismissable && onPress) {
    return (
      <TouchableWithoutFeedback
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Close panel">
        {backdrop}
      </TouchableWithoutFeedback>
    );
  }

  return backdrop;
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
});
