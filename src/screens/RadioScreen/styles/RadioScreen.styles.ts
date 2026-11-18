// ─── Radio — screen styles ───────────────────────────────────────────
// The list scaffolding owned by `components/RadioContent.tsx`.
//
// The SHELL's styles (the header row, the search field's gutter, the
// chip strip) are NOT here: the shared browse shell owns them, and the
// Radio screen used to carry its own copy of the gutter and the chip
// metrics — which is how its field sat 4 dp inside every other browse
// surface's.

import {StyleSheet} from 'react-native';
import {spacing} from '../../../theme/tokens';
import type {ColorTokens} from '../../../theme/tokens';

// The factory takes the palette so every style group in the app has ONE
// shape (`create…Styles(colors)`) — this group paints no colour of its
// own today, because the shell paints the page's background.
export const createRadioScreenStyles = (_colors: ColorTokens) =>
  StyleSheet.create({
    sectionRoot: {
      flex: 1,
    },
    list: {
      flex: 1,
    },
    listContent: {
      // The page's ONE gutter — 16 dp, the same as the search field and
      // the chip strip above it.
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
    },
    listSlotGrow: {
      // Let the empty/error slot fill the viewport, so the centred
      // EmptyState / ErrorState has real height to anchor against. It
      // does NOT also centre the slot — the Music, Movies and Podcasts
      // screens anchor it to the top, so this one does too.
      flexGrow: 1,
    },
  });
