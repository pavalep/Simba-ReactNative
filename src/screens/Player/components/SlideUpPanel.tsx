import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {useTheme} from '../../../theme';

interface SlideUpPanelProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const ENTER_DURATION = 350;
const EXIT_DURATION = 250;

export const SlideUpPanel: React.FC<SlideUpPanelProps> = ({
  visible,
  onClose,
  children,
}) => {
  const {height: screenHeight} = useWindowDimensions();
  const {colors} = useTheme();
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(1)).current; // 1 = fully off-screen
  const [mounted, setMounted] = useState(visible);

  const animateIn = useCallback(() => {
    setMounted(true);
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: ENTER_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: ENTER_DURATION,
        easing: (t: number) => 1 - Math.pow(1 - t, 3), // decelerate ease-out
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, slideAnim]);

  const animateOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: EXIT_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: EXIT_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setMounted(false);
    });
  }, [backdropOpacity, slideAnim]);

  useEffect(() => {
    if (visible) {
      animateIn();
    } else {
      animateOut();
    }
  }, [visible, animateIn, animateOut]);

  const backdropInterpolated = useMemo(
    () =>
      backdropOpacity.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5],
      }),
    [backdropOpacity],
  );

  const translateY = useMemo(
    () =>
      slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, screenHeight],
      }),
    [slideAnim, screenHeight],
  );

  if (!mounted) {
    return null;
  }

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
      collapsable={false}>
      {/* Backdrop scrim */}
      <Animated.View
        style={[
          styles.backdrop,
          {opacity: backdropInterpolated, backgroundColor: colors.background.overlay},
          StyleSheet.absoluteFill,
        ]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      {/* Panel */}
      <Animated.View
        style={[
          styles.panel,
          {transform: [{translateY}]},
        ]}>
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {},
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
