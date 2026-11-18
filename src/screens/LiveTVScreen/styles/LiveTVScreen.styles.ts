// ─── Live TV — screen styles ──────────────────────────────────────────
//
// The FlatList scaffolding owned by the content component.
//
// The screen's OWN shell styles (the search row, the gold chip row) are
// GONE: the shared browse shell (`src/screens/_shared/BrowseLayout.tsx`)
// draws the search field, the chip strip, the filter button and the filter
// sheet, and a screen that draws its own copies of those is the drift the
// shared shell exists to end.

import {StyleSheet} from 'react-native';
import {spacing} from '../../../theme/tokens';

export const createLiveTVScreenStyles = () =>
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
      // The list's top inset is 16, the same as Radio's twin and the
      // same as the board that draws the Radio list. This screen used 8,
      // so the first row sat 8 dp higher than the same row on Radio.
      paddingTop: spacing.lg,
    },
    listSlotGrow: {
      // Let the state slot fill the viewport, so the error card and the
      // empty state have real height to anchor against. The list itself
      // does not grow — the Movies and Podcasts screens anchor the slot
      // to the top, so this one does too.
      flexGrow: 1,
    },
    separator: {
      height: spacing.sm,
    },
  });
