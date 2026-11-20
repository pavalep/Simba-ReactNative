// ─── Archive — screen styles ───────────────────────────────────────────
// FlatList scaffolding owned by the content component. The row's own
// styles live in `ArchiveRow.styles.ts`; the footer and the loading pill
// are the SHARED ones (`screens/_shared/`), so there is no footer style
// here to drift.

import {StyleSheet} from 'react-native';
import {spacing} from '../../../theme/tokens';
import type {ColorTokens} from '../../../theme/tokens';

export const createArchiveScreenStyles = (_colors: ColorTokens) =>
  StyleSheet.create({
    sectionRoot: {
      flex: 1,
    },
    list: {
      flex: 1,
    },
    caption: {
      // The caption sits above the list and under the shell's own
      // chrome, so it carries the shell's gutter.
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    listContent: {
      // The page's one gutter — 16 dp, the same as the search field and
      // the chip strip above it.
      paddingHorizontal: spacing.lg,
    },
    listSlotGrow: {
      // Let the empty/error slot fill the viewport so the centred
      // EmptyState / ErrorState has real height to anchor against.
      flexGrow: 1,
    },
  });
