import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon} from '../SvgIcon';

interface SectionHeaderProps {
  label: string;
  actionLabel?: string;
  onAction?: () => void;
  /**
   * Visual size of the section title.
   *   • 'large' (default) — used for Home rails; prominent h2-style title
   *   • 'small'           — used for sub-sections; smaller, lighter
   */
  size?: 'large' | 'small';
  // P56: optional chevron toggle. When `collapsible` is true, a
  // chevron sits to the right of the action label and `onToggle`
  // fires when tapped. The chevron rotates 180° based on `collapsed`.
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  label,
  actionLabel,
  onAction,
  size = 'large',
  collapsible = false,
  collapsed = false,
  onToggleCollapsed,
}) => {
  const {colors} = useTheme();
  return (
    <View style={[styles.root, size === 'small' && styles.rootSmall]}>
      <AppText
        variant={size === 'large' ? 'h2' : 'overline'}
        color={size === 'large' ? 'primary' : 'secondary'}
        style={
          size === 'large'
            ? styles.titleLarge
            : {letterSpacing: 0.5}
        }>
        {label}
      </AppText>
      <View style={styles.actions}>
        {actionLabel && onAction ? (
          <TouchableOpacity
            onPress={onAction}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            style={styles.actionBtn}>
            <AppText variant="caption" color="accent">
              {actionLabel}
            </AppText>
          </TouchableOpacity>
        ) : null}
        {collapsible && onToggleCollapsed ? (
          <TouchableOpacity
            onPress={onToggleCollapsed}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={collapsed ? 'Expand section' : 'Collapse section'}
            style={styles.chevronBtn}>
            <SvgIcon
              name="chevronDown"
              size={18}
              color={colors.text.tertiary}
              style={collapsed ? styles.chevronUp : styles.chevronDown}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rootSmall: {
    paddingVertical: spacing.sm,
  },
  titleLarge: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  // P56: right-side cluster for action + chevron.
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionBtn: {
    paddingVertical: spacing.xs,
  },
  chevronBtn: {
    padding: spacing.xs,
  },
  chevronDown: {
    transform: [{rotate: '0deg'}],
  },
  chevronUp: {
    transform: [{rotate: '180deg'}],
  },
});

