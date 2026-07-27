import React from 'react';
import {
  Animated,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
} from 'react-native';
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
    outputRange: [0.7, 0],
    extrapolate: 'clamp',
  });

  const backdrop = (
    <Animated.View
      style={[
        styles.backdrop,
        {
          backgroundColor: colors.background.primary,
          opacity: backdropOpacity,
        },
      ]}
    />
  );

  if (dismissable && onPress) {
    return (
      <TouchableWithoutFeedback onPress={onPress}>
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
