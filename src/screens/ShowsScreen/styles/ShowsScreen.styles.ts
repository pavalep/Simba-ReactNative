// ─── Shows — screen styles ──────────────────────────────────────────────
// FlatList scaffolding and the "Airing Today" rail, owned by the
// content component.
//
// The styles are a FACTORY, not a `StyleSheet.create` object: the rail
// needs the theme's colours (the artwork's plate), and a factory is how
// every other migrated screen hands them over.

import {StyleSheet} from 'react-native';
import {spacing, radius} from '../../../theme/tokens';
import {FONT_FAMILY} from '../../../constants/fontFamily';
import type {ColorTokens} from '../../../theme/tokens';

export const createShowsScreenStyles = (colors: ColorTokens) =>
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
      flexGrow: 1,
    },
    // ── The "Airing Today" rail ─────────────────────────────────────
    // It lives in the LIST's header slot, so it scrolls WITH the
    // catalogue — which is what a header slot is for — and it bleeds to
    // the screen's own gutter instead of the list's padded content, so
    // the posters are not squeezed in by it.
    railWrap: {
      marginTop: spacing.sm,
      marginBottom: spacing.md,
      marginHorizontal: -spacing.lg,
    },
    railTitle: {
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      // The weight lives in the FAMILY key, not in a `fontWeight` prop.
      fontFamily: FONT_FAMILY.inter.semibold,
    },
    railContent: {
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
    },
    railCard: {
      width: 92,
      alignItems: 'center',
      gap: spacing.xs,
    },
    railPosterWrap: {
      width: 92,
      height: 138,
      borderRadius: radius.sm,
      overflow: 'hidden',
      backgroundColor: colors.background.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    railPoster: {
      width: 92,
      height: 138,
    },
    railPosterPlaceholder: {
      // The artwork's plate — the SAME vocabulary as the row's and the
      // audiobook row's: a gold-dim plate with the glyph on it.
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent.goldDim,
    },
    railName: {
      textAlign: 'center',
    },
  });
