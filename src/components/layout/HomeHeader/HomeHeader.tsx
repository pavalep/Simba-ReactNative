import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon';

interface HomeHeaderProps {
  isScanning?: boolean;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({isScanning}) => {
  const {colors, spacing: s} = useTheme();
  const navigation = useNavigation<any>();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background.primary,
          borderBottomColor: colors.border.subtle,
        },
      ]}>
      {/* Lion logo with ambient gold glow */}
      <View style={styles.logoSection}>
        <View
          style={[
            styles.aura,
            {backgroundColor: colors.accent.goldGlow},
          ]}
        />
        <SvgIcon name="lion" size={36} color={colors.accent.gold} />
      </View>

      {/* Title */}
      <AppText variant="h2" color="primary" style={{marginLeft: s.sm}}>
        Simba Player
      </AppText>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Settings icon */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('Settings')}
        style={[styles.iconButton, {backgroundColor: colors.background.elevated}]}
        accessibilityLabel="Settings"
        accessibilityRole="button">
        <SvgIcon name="settings" size={22} color={colors.text.secondary} />
      </TouchableOpacity>

      {/* Scan status indicator */}
      {isScanning && (
        <View
          style={[
            styles.scanBadge,
            {backgroundColor: colors.accent.gold},
          ]}
        />
      )}
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
  logoSection: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aura: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
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
  },
  scanBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
