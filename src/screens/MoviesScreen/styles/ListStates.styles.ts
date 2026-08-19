// ─── Movies — List states styles ──────────────────────────────────────
// The centered loading pill (mirrors PodcastsScreen's
// `PodcastsOverlays.centerLoader` — ActivityOrb in an elevated pill,
// anchored ~20% from the top so it reads as a status pill rather than
// a splash placeholder). Error / empty states use the shared
// ErrorState / EmptyState components which style themselves.

import {StyleSheet} from 'react-native';
import {radius, spacing} from '../../../theme/tokens';

export const createListStatesStyles = () =>
  StyleSheet.create({
    centerLoader: {
      flex: 1,
      alignItems: 'center',
      // Anchor the pill at ~20% from the top so it reads as a status pill
      // (perceived as "working near the top"), not as a splash-screen
      // placeholder (which sits at 50% and blocks content preview).
      justifyContent: 'flex-start',
      paddingTop: '20%',
    },
    centerLoaderPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    centerLoaderText: {
      opacity: 0.85,
    },
  });
