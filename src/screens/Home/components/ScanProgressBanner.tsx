import React, {useEffect, useRef} from 'react';
import {View, Animated, StyleSheet} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';

interface ScanProgressBannerProps {
  isScanning: boolean;
  scanProgress: number; // 0-100 percentage
  colors: any; // ColorTokens
}

export const ScanProgressBanner: React.FC<ScanProgressBannerProps> = ({
  isScanning,
  scanProgress,
  colors,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isScanning ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isScanning, slideAnim]);

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
            backgroundColor: colors.accent.goldDim,
            transform: [{translateY}],
          },
        ]}>
        <AppText variant="caption" color="secondary">
          Scanning media...
        </AppText>
        <View style={[styles.progressTrack, {backgroundColor: colors.border.subtle}]}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(100, Math.max(0, scanProgress))}%`,
                backgroundColor: colors.accent.gold,
              },
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    overflow: 'hidden',
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    height: 40,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBar: {
    height: 3,
    borderRadius: 1.5,
  },
});
