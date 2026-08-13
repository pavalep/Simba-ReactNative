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
  /**
   * v7: optional leading icon. Renders a 32×32 gold-soft circular
   * badge with an 18 px glyph in SIMBA gold, 8 px to the left of
   * the title. Used by the 3 "Your Library" rails (Recently
   * Played → clock, Bookmarks → bookmark, Followed Podcasts →
   * podcastRings). Only honored when `size === 'large'` — the
   * small sub-section headers don't get a leading icon.
   */
  leadingIcon?: import('../SvgIcon').IconName;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  label,
  actionLabel,
  onAction,
  size = 'large',
  collapsible = false,
  collapsed = false,
  onToggleCollapsed,
  leadingIcon,
}) => {
  const {colors} = useTheme();
  return (
    <View style={[styles.root, size === 'small' && styles.rootSmall]}>
      <View style={styles.titleRow}>
        {leadingIcon && size === 'large' ? (
          <View
            style={[
              styles.iconBadge,
              {backgroundColor: colors.accent.goldSoft},
            ]}
            accessibilityElementsHidden
            importantForAccessibility="no">
            <SvgIcon
              name={leadingIcon}
              size={18}
              color={colors.accent.gold}
            />
          </View>
        ) : null}
        <AppText
          variant={size === 'large' ? 'displaySans' : 'overline'}
          color={size === 'large' ? 'primary' : 'secondary'}
          style={[
            size === 'large' ? styles.titleLarge : {letterSpacing: 0.5},
            leadingIcon ? styles.titleLargeWithIcon : null,
          ]}>
          {label}
        </AppText>
      </View>
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
  // v7: title + leading icon live in a horizontal row so the
  // badge can sit 8 px to the left of the title without
  // affecting the right-side action cluster.
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  // v7: 32×32 circular gold-soft badge. 18 px glyph inside.
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // v7: when a leading icon is present, drop the title's
  // letterSpacing slightly so the two read as a unit.
  titleLargeWithIcon: {
    letterSpacing: -0.3,
  },
  // v8: NO fontWeight or fontSize override. The displaySans
  // typography token supplies fontFamily (Manrope SemiBold)
  // and fontSize (22) and lineHeight (28) — encoding the
  // weight in the family key means Android's font manager
  // deterministically picks Manrope-SemiBold.ttf. Previously
  // this had `fontWeight: '800'` which forced Android to
  // pick Manrope-Bold.ttf (chunky). v8 makes the inline
  // weight override structurally impossible.
  titleLarge: {},
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

