import React, {useEffect, useRef} from 'react';
import {View, TouchableOpacity, StyleSheet, Animated} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon';

interface HomeHeaderProps {
  onSettingsPress?: () => void;
  onSearchPress?: () => void;
  isScanning?: boolean;
}


export const HomeHeader: React.FC<HomeHeaderProps> = ({
  onSettingsPress,
  onSearchPress,
  isScanning,
}) => {
  const {colors, spacing: s} = useTheme();
  const navigation = useNavigation<any>();
  const scanAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isScanning) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isScanning, scanAnim]);

  const handleSettingsPress = () => {
    if (onSettingsPress) {
      onSettingsPress();
    } else {
      navigation.navigate('Settings');
    }
  };

  const handleSearchPress = () => {
    if (onSearchPress) {
      onSearchPress();
    }
  };

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background.primary,
          borderBottomColor: colors.border.subtle,
        },
      ]}>
      {/* Left: Logo + Greeting + Subtitle */}
      <View style={styles.greetingSection}>
        <View style={styles.greetingRow}>
          <View style={[styles.logoContainer, {backgroundColor: colors.accent.gold + '15'}]}>
            <SvgIcon name="lion" size={36} color={colors.accent.gold} />
          </View>
          <View>
            <AppText variant="h2" color="accent" style={styles.greetingText}>
              SIMBA
            </AppText>
            <AppText variant="caption" color="secondary" style={styles.subtitleText}>
              Play Anything.
            </AppText>
          </View>
          {isScanning && (
            <Animated.View
              style={[
                styles.scanningDot,
                {
                  backgroundColor: colors.accent.gold,
                  opacity: scanAnim,
                },
              ]}
            />
          )}
        </View>
      </View>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Search icon */}
      {onSearchPress && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleSearchPress}
          style={[styles.iconButton, {backgroundColor: colors.background.elevated}]}
          accessibilityLabel="Search"
          accessibilityRole="button">
          <SvgIcon name="search" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      )}

      {/* Settings icon */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleSettingsPress}
        style={[styles.iconButton, {backgroundColor: colors.background.elevated}]}
        accessibilityLabel="Settings"
        accessibilityRole="button">
        <SvgIcon name="settings" size={22} color={colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    // Removed borderBottomWidth for a cleaner "hero" look
  },
  greetingSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingText: {
    fontSize: 22,
    lineHeight: 28,
  },
  subtitleText: {
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  scanningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  spacer: {
    flex: 1,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
});
