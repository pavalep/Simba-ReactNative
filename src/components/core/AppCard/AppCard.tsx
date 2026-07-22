import React from 'react';
import {View, ViewStyle, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';

interface AppCardProps {
  children: React.ReactNode;
  elevated?: boolean;
  accent?: boolean;
  style?: ViewStyle;
}

export const AppCard: React.FC<AppCardProps> = ({
  children,
  elevated = false,
  accent = false,
  style,
}) => {
  const {colors, shadows} = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.background.elevated,
          borderRadius: radius.md,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: accent ? colors.accent.goldDim : colors.border.subtle,
          ...(elevated ? shadows.md : shadows.sm),
        },
        style,
      ]}>
      {children}
    </View>
  );
};
