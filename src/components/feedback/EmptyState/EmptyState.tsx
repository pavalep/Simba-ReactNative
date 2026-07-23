import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon, IconName} from '../../utility/SvgIcon';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const {colors, spacing: s} = useTheme();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background.floating,
          borderColor: colors.border.subtle,
        },
      ]}>
      {/* Gold-accented icon wrapper */}
      <View
        style={[
          styles.iconWrapper,
          {backgroundColor: colors.accent.goldDim},
        ]}>
        <SvgIcon
          name={icon}
          size={48}
          color={colors.accent.gold}
        />
      </View>

      <AppText
        variant="h3"
        color="primary"
        style={{marginTop: s.md}}>
        {title}
      </AppText>

      <AppText
        variant="body2"
        color="tertiary"
        style={{marginTop: s.xs, textAlign: 'center'}}>
        {description}
      </AppText>

      {actionLabel && onAction && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.accent.gold,
              marginTop: s.lg,
            },
          ]}>
          <AppText variant="body2" color="primary">
            {actionLabel}
          </AppText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
    marginHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
});
