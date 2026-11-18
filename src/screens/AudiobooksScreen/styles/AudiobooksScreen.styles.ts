// ─── Audiobooks — screen styles ─────────────────────────────────────────
// FlatList scaffolding owned by the content component.

import {StyleSheet} from 'react-native';
import {spacing} from '../../../theme/tokens';

export const createAudiobooksScreenStyles = () =>
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
      //
      // It used to be `spacing.md` (12 dp) with the search field above it
      // also on 12, while the shell's own gutter is 16 — so the screen
      // disagreed with the shell it now lives in.
      paddingHorizontal: spacing.lg,
    },
    listSlotGrow: {
      // Let the empty/error slot fill the viewport so the centred
      // EmptyState / ErrorState has real height to anchor against.
      flexGrow: 1,
    },
  });
