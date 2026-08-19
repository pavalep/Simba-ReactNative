// ─── Podcasts — overlay pill styles ───────────────────────────────────
// Floating status pills rendered by components/PodcastsOverlays.

import {StyleSheet} from 'react-native';
import {spacing, radius} from '../../../theme/tokens';
import type {ColorTokens} from '../../../theme/tokens';

export const createPodcastsOverlaysStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    centerLoader: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      // Anchor the pill at ~20% from the top of the list area so it reads
      // as a status pill, not a splash-screen placeholder.
      justifyContent: 'flex-start',
      paddingTop: '20%',
      zIndex: 10,
    },
    centerLoaderPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.background.elevated,
    },
    centerLoaderText: {
      opacity: 0.85,
    },
    refreshPillWrap: {
      position: 'absolute',
      top: spacing.sm,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 10,
    },
    refreshPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.background.elevated,
      // Soft elevation so the pill reads as floating above the cards.
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4,
    },
    refreshPillText: {
      opacity: 0.85,
    },
  });
