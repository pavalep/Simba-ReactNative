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
      // The page's one gutter — 16 dp, the same as the search field and
      // the chip strip above it. The comment here used to claim 16
      // while the code said 12 (spacing.md), so the rows sat 4 dp
      // inside the field above them.
      paddingHorizontal: spacing.lg,
    },
    listSlotGrow: {
      // Let the empty/error slot fill the viewport so Placeholder's
      // anchor math has real height to work with.
      flexGrow: 1,
    },
  });
