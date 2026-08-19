// ─── Podcast Detail — Hero Section styles ──────────────────────────────
// Artwork, title, author, collapsible description, episode-count badge
// and the follow toggle. Consumed only by components/HeroSection.

import {StyleSheet} from 'react-native';
import {spacing, radius} from '../../../theme/tokens';
import type {ColorTokens} from '../../../theme/tokens';

export const createHeroSectionStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    heroSection: {
      alignItems: 'center',
      paddingHorizontal: spacing.xxl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
    },
    imagePlaceholder: {
      width: 120,
      height: 120,
      borderRadius: radius.lg,
      backgroundColor: colors.accent.goldDim,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    heroImage: {
      width: 120,
      height: 120,
      borderRadius: radius.lg,
      marginBottom: spacing.lg,
    },
    podcastTitle: {
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    authorText: {
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    descriptionText: {
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    showMoreButton: {
      paddingVertical: spacing.xs,
      marginBottom: spacing.md,
    },
    showMoreLabel: {
      textAlign: 'center',
    },
    episodeCountBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.accent.goldDim,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
      gap: spacing.xs,
    },
    episodeCountText: {
      color: colors.accent.gold,
    },
    followButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: colors.accent.gold,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      marginTop: spacing.sm,
    },
    followButtonActive: {
      backgroundColor: colors.accent.goldDim,
    },
    followLabel: {
      color: colors.accent.gold,
    },
  });
