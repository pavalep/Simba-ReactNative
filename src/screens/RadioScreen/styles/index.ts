import {StyleSheet} from 'react-native';
import {radius, spacing} from '../../../theme/tokens';
import {FONT_FAMILY} from '../../../constants/fontFamily';

export const styles = StyleSheet.create({
  root: {flex: 1},
  searchSection: {
    // The house gutter — `spacing.lg` (16), the same as the shared
    // browse shell's search row and chip row. This screen used 12, so
    // its field and chips sat 4 dp inside every other browse surface.
    paddingHorizontal: spacing.lg,
    // The shell's OWN rhythm: 16 above the field, 12 below
    // (`BrowseLayout.tsx:299-303`). This screen used 8 and 8, so its
    // field sat 8 dp higher than the same field on Movies, Podcasts
    // and Music — the vertical drift of the same family.
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    // The shared `FilterChips` chip's OWN metrics (`FilterChips.tsx:207-217`):
    // 10 dp of horizontal padding, 4 dp of vertical padding, a pill radius
    // and a 1 dp border.
    //
    // This chip used to be 44 dp tall with a 12 px caption — a different
    // language from every other browse surface's strip. The family now
    // speaks ONE chip language.
    //
    // The 44 dp touch-target floor is a HOUSE item and it belongs in the
    // chip primitive itself — the shared `FilterChips` chip is 21 dp tall,
    // so this screen was never the odd one out. Carried forward.
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
  listContent: {padding: spacing.lg},
  listSlotGrow: {
    // Let the state slot fill the viewport, so the error card and the
    // empty state have real height to anchor against. The list itself
    // does not grow — the Movies and Podcasts screens anchor the slot to
    // the top, so this one does too.
    flexGrow: 1,
  },
  separator: {height: spacing.sm},
});
