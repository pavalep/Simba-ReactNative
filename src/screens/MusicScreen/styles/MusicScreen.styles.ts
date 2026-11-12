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
      flexGrow: 1,
      justifyContent: 'center',
    },
  });
