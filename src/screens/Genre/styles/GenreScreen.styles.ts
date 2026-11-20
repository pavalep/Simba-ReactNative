// ─── Genre — screen styles ─────────────────────────────────────────────
// The list scaffolding owned by the content component.

import {StyleSheet} from 'react-native';
import {spacing, radius} from '../../../theme/tokens';
import {FONT_FAMILY} from '../../../constants/fontFamily';

export const createGenreScreenStyles = () =>
  StyleSheet.create({
    sectionRoot: {
      flex: 1,
    },
    list: {
      flex: 1,
    },
    listContent: {
      // The page's one gutter — 16 dp, the same as the shell's search
      // field and chip strip above it.
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
      // The empty state has real height to centre itself in.
      flexGrow: 1,
    },
    hero: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
      gap: spacing.xs,
    },
    genreIcon: {
      width: 88,
      height: 88,
      borderRadius: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    genreName: {
      fontWeight: '700',
      textAlign: 'center',
    },
    toggleRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    chip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      borderWidth: 1,
    },
    chipText: {
      fontSize: 13,
      // 'Inter SemiBold' + 700 opens a file that is not shipped; the plain
      // 'Inter' family + 700 is what reaches Inter_bold.ttf.
      fontFamily: FONT_FAMILY.inter.bold,
      fontWeight: '700',
    },
    trackItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      marginBottom: spacing.xs,
      gap: spacing.md,
    },
    trackNumber: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    trackInfo: {flex: 1},
    emptyWrapper: {
      // The empty state is centred in the space the list would have
      // taken, so it does not sit at the top of an otherwise blank
      // page.
      flex: 1,
      justifyContent: 'center',
    },
  });