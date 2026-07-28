import React, {useEffect, useRef} from 'react';
import {View, Animated, StyleSheet} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import type {ColorTokens} from '../../../theme/tokens';

interface NoNetworkBannerProps {
  isVisible: boolean;
  colors: ColorTokens;
}

export const NoNetworkBanner: React.FC<NoNetworkBannerProps> = ({
  isVisible,
  colors,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible, slideAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 0],
  });

  return (
    <View style={styles.banner}>
      <Animated.View
        style={[
          styles.bannerInner,
          {
            backgroundColor: colors.semantic.error + '26', // 15% opacity ≈ hex 26
            transform: [{translateY}],
          },
        ]}>
        <AppText variant="bodySmall" style={{color: colors.semantic.error}}>
          {'\u26A0'} No internet connection
        </AppText>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 16,
  },
});
