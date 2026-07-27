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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Good night';
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
      {/* Left: Greeting + Subtitle */}
      <View style={styles.greetingSection}>
        <View style={styles.greetingRow}>
          <AppText variant="h2" color="accent">
            {getGreeting()}
          </AppText>
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
        <AppText variant="caption" color="secondary">
          Your premium media player
        </AppText>
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
    borderBottomWidth: 1,
  },
  greetingSection: {
    flexDirection: 'column',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
