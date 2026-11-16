// ─── Music — screen styles ──────────────────────────────────────────
// FlatList scaffolding owned by index.tsx.

import {StyleSheet} from 'react-native';
import {spacing} from '../../../theme/tokens';

export const createMusicScreenStyles = () =>
  StyleSheet.create({
    sectionRoot: {
      flex: 1,
    },
    list: {
      flex: 1,
    },
    listContent: {
      // The page's one gutter — 16 dp, the same as the search field and
      // the chip strip above it.
      paddingHorizontal: spacing.lg,
    },
    listSlotGrow: {
      // Let the empty/error slot fill the viewport so the centred
      // EmptyState / ErrorState has real height to anchor against.
      // It does NOT also centre the slot: the Movies and Podcasts screens
      // anchor it to the top, so Music did too.
      flexGrow: 1,
    },
  });
