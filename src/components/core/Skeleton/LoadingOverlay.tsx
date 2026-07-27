// ────────────────────────────────────────────────────────
// Simba Player — Loading Overlay Component
// ────────────────────────────────────────────────────────
// Phase 15: Full-screen semi-transparent overlay with
// animated gold spinner and descriptive message.

import React, {useEffect, useRef} from 'react';
import {
  View,
  Animated,
  StyleSheet,
  Easing,
} from 'react-native';
import {useTheme} from '../../../theme';
import {AppText} from '../AppText/AppText';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Loading...',
}) => {
  const {colors} = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  useEffect(() => {
    if (visible) {
      const loop = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [visible, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <Animated.View
      accessible={true}
      accessibilityLabel={message}
      accessibilityRole="progressbar"
      style={[
        styles.overlay,
        {
          backgroundColor: colors.background.overlay,
          opacity: fadeAnim,
        },
      ]}
      pointerEvents="auto">
      <View style={styles.content}>
        {/* Spinner ring */}
        <Animated.View
          style={[
            styles.spinner,
            {
              borderColor: colors.border.subtle,
              borderTopColor: colors.accent.gold,
              transform: [{rotate: spin}],
            },
          ]}
        />
        <AppText variant="body1" color="secondary" style={styles.message}>
          {message}
        </AppText>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
  },
  message: {
    textAlign: 'center',
  },
});
