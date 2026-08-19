// ─── Podcasts — screen styles ─────────────────────────────────────────
// Root + FlatList scaffolding owned by PodcastsScreen.tsx. Row styles
// live in PodcastRow.styles, footer in PodcastsFooter.styles, floating
// pills in PodcastsOverlays.styles.

import {StyleSheet} from 'react-native';
import {spacing} from '../../../theme/tokens';
import type {ColorTokens} from '../../../theme/tokens';

export const createPodcastsScreenStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    sectionRoot: {
      flex: 1,
    },
    list: {
      flex: 1,
    },
    listContent: {
      // Same 16px edge padding as the old SectionContent list contract
      // (grid ↔ list toggle never drifts the outer margin rhythm).
      paddingHorizontal: spacing.md,
    },
    listSlotGrow: {
      // Let the empty/error slot fill the viewport so Placeholder's
      // anchor math has real height to work with.
      flexGrow: 1,
    },
  });
