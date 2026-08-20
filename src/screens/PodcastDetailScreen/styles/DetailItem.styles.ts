// ─── Podcast Detail — Episode list item styles ─────────────────────────
// One episode row rendered by components/DetailItem: card, meta row,
// description, playback progress and the play button.

import {StyleSheet} from 'react-native';
import {spacing, radius} from '../../../theme/tokens';
import type {ColorTokens} from '../../../theme/tokens';

export const createDetailItemStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    episodeCard: {
      flexDirection: 'row',
      backgroundColor: colors.background.elevated,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border.subtle,
    },
    episodeInfo: {
      flex: 1,
      marginRight: spacing.sm,
    },
    episodeTitle: {
      marginBottom: 2,
    },
    episodeMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xs,
      marginBottom: spacing.xs,
    },
    episodeDescription: {
      marginTop: spacing.xs,
    },
    actionColumn: {
      width: 44,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      gap: spacing.xs,
    },
    playButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accent.goldDim,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressTrack: {
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.border.subtle,
      marginTop: spacing.sm,
      overflow: 'hidden',
    },
    progressFill: {
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.accent.gold,
    },
    playedText: {
      color: colors.accent.gold,
      marginTop: spacing.xs,
    },
  });
