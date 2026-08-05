import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon, IconName} from '../../utility/SvgIcon';
import {BackButton} from '../../utility/BackButton/BackButton';

interface InternalHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: {
    icon?: IconName;
    label?: string;
    onPress: () => void;
  };
}

export const InternalHeader: React.FC<InternalHeaderProps> = ({
  title,
  subtitle,
  rightAction,
}) => {
  const {colors} = useTheme();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background.primary,
          borderBottomColor: colors.border.subtle,
        },
      ]}>
      {/* Back arrow — shared BackButton, 44px elevated circular target */}
      <BackButton />

      {/* Title area */}
      <View style={styles.titleSection}>
        <AppText
          color="primary"
          numberOfLines={1}
          style={styles.title}>
          {title}
        </AppText>
        {subtitle && (
          <AppText
            variant="caption"
            color="tertiary"
            numberOfLines={1}>
            {subtitle}
          </AppText>
        )}
      </View>

      {/* Right action slot */}
      <View style={styles.spacer} />
      {rightAction && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={rightAction.onPress}
          style={[styles.rightButton, {backgroundColor: colors.background.elevated}]}>
          {rightAction.icon ? (
            <SvgIcon name={rightAction.icon} size={22} color={colors.text.secondary} />
          ) : rightAction.label ? (
            <AppText variant="body1" color="accent">
              {rightAction.label}
            </AppText>
          ) : null}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  titleSection: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  spacer: {
    width: 44,
  },
  rightButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
