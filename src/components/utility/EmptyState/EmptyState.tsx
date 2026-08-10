// ─── EmptyState (utility / Home-rail variant) ─────────────────────
// Premium empty-state block for per-user Home shelves (Recently
// Played, Followed Podcasts, Bookmarks, etc.).
//
// Two visual modes:
//   • default — full premium treatment: gold-accented 72px icon
//     disc, h3 title, body2 description, optional CTA button. Used
//     inside an unstyled container (e.g. HomeBookmarksList slot).
//   • compact — slimmer, no CTA, smaller spacing. Designed to drop
//     inside a Home rail that already has a SectionHeader and its
//     own gutter (HomeMediaShelf / FollowedPodcastsShelf).
//
// Matches the visual language of `components/feedback/EmptyState`
// but stays a sibling — the feedback one is for full-screen empty
// screens; this one is for inline empty rails.

import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon, type IconName} from '../SvgIcon';

interface EmptyStateProps {
  icon: IconName;
  /** Short headline. */
  title: string;
  /** Longer body copy — what to do, where to go, etc. */
  description: string;
  /** Optional CTA button. Omit for a passive hint. */
  actionLabel?: string;
  onAction?: () => void;
  /**
   * 'compact' — slimmer spacing, no top/bottom padding, smaller icon
   *             disc (52px). Designed to live inside a Home rail.
   * 'default' — full premium treatment (72px disc, generous padding).
   *             Designed to live in a bare container.
   */
  variant?: 'default' | 'compact';
}

export const EmptyState: React.FC<EmptyStateProps> = React.memo(
  ({icon, title, description, actionLabel, onAction, variant = 'default'}) => {
    const {colors} = useTheme();
    const isCompact = variant === 'compact';

    const discSize = isCompact ? 52 : 72;
    const discRadius = discSize / 2;
    const iconSize = isCompact ? 24 : 36;

    return (
      <View
        style={[
          isCompact ? styles.rootCompact : styles.root,
          isCompact
            ? null
            : {
                backgroundColor: colors.background.elevated,
                borderColor: colors.border.subtle,
              },
        ]}
        accessibilityRole="text"
        accessibilityLabel={`${title}. ${description}`}>
        {/* Gold-accented icon disc — the visual anchor of the empty
            state, mirroring the gold disc on the CategoryCard tiles
            so the page reads as one design system. */}
        <View
          style={[
            styles.iconDisc,
            {
              width: discSize,
              height: discSize,
              borderRadius: discRadius,
              backgroundColor: colors.accent.goldDim,
            },
          ]}>
          <SvgIcon
            name={icon}
            size={iconSize}
            color={colors.accent.gold}
          />
        </View>

        <AppText
          variant={isCompact ? 'bodySmall' : 'h3'}
          color="primary"
          style={[styles.title, isCompact ? styles.titleCompact : null]}>
          {title}
        </AppText>
        <AppText
          variant={isCompact ? 'caption' : 'body2'}
          color="tertiary"
          style={styles.description}>
          {description}
        </AppText>

        {actionLabel && onAction ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            style={[
              styles.action,
              {
                backgroundColor: colors.accent.gold,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
              },
            ]}>
            <AppText variant="body2" color="primary" style={styles.actionLabel}>
              {actionLabel}
            </AppText>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  // ── Default (full) ──
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  // ── Compact (Home rail) ──
  rootCompact: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    // No card chrome — the parent shelf already has a SectionHeader;
    // adding a background here would double-frame the empty state.
  },
  // ── Icon disc ──
  iconDisc: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Text ──
  title: {
    marginTop: spacing.md,
    textAlign: 'center',
    fontWeight: '700',
  },
  titleCompact: {
    marginTop: spacing.sm,
  },
  description: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  // ── CTA ──
  action: {
    marginTop: spacing.md,
    borderRadius: radius.md,
  },
  actionLabel: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
