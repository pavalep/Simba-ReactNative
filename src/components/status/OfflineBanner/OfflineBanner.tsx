// ────────────────────────────────────────────────────────
// Simba Player — Global OfflineBanner (Phase 54.1)
// Mounted once at the app root; slides down from the top
// whenever connectivity drops and hides when it returns.
// Replaces the Home-only NoNetworkBanner.
// ────────────────────────────────────────────────────────

import React, {useEffect, useRef} from 'react';
import {View, Animated, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {useNetworkStatus} from '../../../hooks/useNetworkStatus';
import {AppText} from '../../core/AppText/AppText';
import {spacing} from '../../../theme/tokens';

export const OfflineBanner: React.FC = () => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {isOnline} = useNetworkStatus();

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOnline ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOnline, slideAnim]);

  if (isOnline) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 0],
  });

  return (
    <View
      style={[styles.wrapper, {paddingTop: insets.top}]}
      testID="offline-banner"
      pointerEvents="none">
      <Animated.View
        style={[
          styles.banner,
          {
            backgroundColor: colors.semantic.error + '26',
            transform: [{translateY}],
          },
        ]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        importantForAccessibility="yes">
        <AppText
          variant="bodySmall"
          style={{color: colors.semantic.error}}
          accessibilityLabel="No internet connection — showing saved content">
          {'\u26A0'} No internet connection — showing saved content
        </AppText>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: 'hidden',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
  },
});
