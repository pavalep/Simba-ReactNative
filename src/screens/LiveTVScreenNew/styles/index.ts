import {StyleSheet} from 'react-native';
import {radius, spacing} from '../../../theme/tokens';
import {FONT_FAMILY} from '../../../constants/fontFamily';

export const styles = StyleSheet.create({
  root: {flex: 1},
  searchSection: {
    // The house gutter — `spacing.lg` (16), the same as the shared
    // browse shell's search row, the chip row and Radio's twin. This
    // screen used 12, so its field and chips sat 4 dp inside every
    // other browse surface.
    paddingHorizontal: spacing.lg,
    // The shell's OWN rhythm: 16 above the field, 12 below
    // (`BrowseLayout.tsx:299-303`).
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    // The shared `FilterChips` chip's OWN metrics (`FilterChips.tsx:207-217`)
    // — the family now speaks ONE chip language.
    //
    // The 44 dp touch-target floor is a HOUSE item and it belongs in the
    // chip primitive itself — the shared `FilterChips` chip is 21 dp tall.
    // Carried forward.
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  // The weight lives in the FAMILY key, not a `fontWeight` prop:
  // `fontWeight: '600'` on the family `Inter` asks Android for
  // `fonts/Inter.ttf` (the rule in `constants/fontFamily.ts` drops the
  // suffix below weight 700), so the SemiBold face was unreachable.
  chipText: {
    fontFamily: FONT_FAMILY.inter.semibold,
    fontSize: 11,
    lineHeight: 13,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  separator: {height: spacing.sm},
});
