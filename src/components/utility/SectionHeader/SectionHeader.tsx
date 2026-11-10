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
   * The action's accessibility label.
   *
   * "See All" on its own tells a screen-reader user which "See All" it
   * is — there are usually several on a page. The visible label stays
   * short; this carries the rail's name ("See all Recently Played").
   */
  actionAccessibilityLabel?: string;
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
  /**
   * The two skins of the ONE header.
   *
   *   'default' — the v7/v8 header: a 32 dp gold-soft badge with a
   *              glyph in it, the title, the action, the collapse
   *              chevron. Used by Settings, Audio Settings and Search.
   *
   *   'plain'   — the V2 header: the title (h3, Inter SemiBold 20/28)
   *              and at most one gold action. NO badge and NO chevron.
   *
   * Why the plain skin exists: four identical gold discs on one screen
   * pull the eye away from the artwork, which is the thing the user
   * came for; and a collapse chevron is a control that hides content
   * the user came for. V2 has one reading order — top to bottom — and
   * one action per row.
   *
   * This is a second skin on ONE component, not a second component:
   * the default render is byte-identical to what every other caller
   * has always got.
   */
  variant?: 'default' | 'plain';
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  label,
  actionLabel,
  onAction,
  actionAccessibilityLabel,
  size = 'large',
  collapsible = false,
  collapsed = false,
  onToggleCollapsed,
  leadingIcon,
  variant = 'default',
}) => {
  const {colors} = useTheme();
  const isPlain = variant === 'plain';
  return (
    <View style={[styles.root, size === 'small' && styles.rootSmall]}>
      <View style={styles.titleRow}>
        {!isPlain && leadingIcon && size === 'large' ? (
          <View
            style={[
              styles.iconBadge,
              {backgroundColor: colors.accent.goldSoft},
            ]}
            testID="section-header-badge"
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
          variant={isPlain ? 'h3' : size === 'large' ? 'displaySans' : 'overline'}
          color={isPlain ? 'primary' : size === 'large' ? 'primary' : 'secondary'}
          style={[
            isPlain
              ? styles.titlePlain
              : size === 'large'
                ? styles.titleLarge
                : {letterSpacing: 0.5},
            !isPlain && leadingIcon ? styles.titleLargeWithIcon : null,
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
            accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
            style={styles.actionBtn}>
            <AppText variant="caption" color="accent">
              {actionLabel}
            </AppText>
          </TouchableOpacity>
        ) : null}
        {!isPlain && collapsible && onToggleCollapsed ? (
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
  // V2: the plain title is the `h3` token — Inter SemiBold 20/28 —
  // and nothing else. No override, for the same reason the
  // `titleLarge` above has none: the weight lives in the family key.
  titlePlain: {},
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
