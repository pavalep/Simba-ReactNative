// ─── SegmentRow ──────────────────────────────────────────────────────────
// The app's TEXT scope row.
//
// A horizontal set of options where the active one is marked by a 2 dp
// gold underline and a gold label — and by nothing else. No fill, no
// border, no pill, no disc.
//
// WHERE IT CAME FROM
// ──────────────────
// The Library page already had exactly this grammar — a horizontal row of
// text items with a gold underline on the active one
// (`features/library/presentation/components/LibraryScreenContent.tsx`,
// the `Folders / Audio / Artists / Albums` row). It was written inline in
// that one file, with its own styles.
//
// 2026-11-12 (SEARCH_PAGE_REDESIGN): the Search page needed the same
// grammar for its source scope, and the alternative was a SECOND
// implementation of a row the app already had. So the grammar is lifted
// out here and the Search page uses it.
//
// The Library's own row is NOT migrated in this wave — it still carries
// its inline styles. That is carried forward as B8-1 in
// `md/SEARCH_PAGE_REDESIGN.md`: until the Library adopts this component
// the grammar lives in two places, which is one too many.
//
// WHY A TEXT ROW AND NOT A CHIP ROW
// ─────────────────────────────────
// The app has ONE chip row (`components/utility/FilterChips`). It was the
// obvious candidate for a source selector, and the Search page used it —
// as eight white pills (see that component's header for why the inactive
// chip was white). A chip says "a filter you may or may not have
// applied"; a scope row says "which of these are you looking at". Apple
// Music's search results, Plex's library filters and the app's own
// Library page all use the underline form for a scope.
//
// THE TYPEFACE
// ────────────
// The weight lives in the FAMILY key (`FONT_FAMILY.inter.medium`), not in
// a `fontWeight` prop. `fontWeight: '500'` on the family `Inter` asks
// Android for `fonts/Inter.ttf` (the rule in `constants/fontFamily.ts`
// drops the suffix below weight 700), so `Inter Medium.ttf` — which does
// ship — would be unreachable.

import React, {useCallback} from 'react';
import {FlatList, StyleSheet, TouchableOpacity} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {FONT_FAMILY} from '../../../constants/fontFamily';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon, type SvgIconName} from '../SvgIcon';

export interface SegmentItem {
  /** Stable identifier — compared against `selectedKey`. */
  key: string;
  label: string;
  /** Optional leading glyph (the Library's rows carry one). */
  icon?: SvgIconName;
}

interface SegmentRowProps {
  items: SegmentItem[];
  /** The active item's key. */
  selectedKey: string;
  onSelect: (key: string) => void;
  /** The spoken name of the row itself, e.g. "Search source". */
  accessibilityLabel?: string;
}

export const SegmentRow: React.FC<SegmentRowProps> = React.memo(
  ({items, selectedKey, onSelect, accessibilityLabel}) => {
    const {colors} = useTheme();

    const renderItem = useCallback(
      ({item}: {item: SegmentItem}) => {
        const active = item.key === selectedKey;
        return (
          <TouchableOpacity
            onPress={() => onSelect(item.key)}
            accessibilityRole="tab"
            accessibilityState={{selected: active}}
            accessibilityLabel={item.label}
            style={[
              styles.item,
              {borderBottomColor: active ? colors.accent.gold : 'transparent'},
            ]}>
            {item.icon ? (
              <SvgIcon
                name={item.icon}
                size={16}
                color={active ? colors.accent.gold : colors.text.tertiary}
              />
            ) : null}
            <AppText
              variant="caption"
              style={[
                styles.label,
                {
                  fontFamily: FONT_FAMILY.inter.medium,
                  color: active ? colors.accent.gold : colors.text.secondary,
                },
              ]}>
              {item.label}
            </AppText>
          </TouchableOpacity>
        );
      },
      [colors, onSelect, selectedKey],
    );

    return (
      <FlatList
        horizontal
        data={items}
        keyExtractor={item => item.key}
        renderItem={renderItem}
        style={styles.container}
        contentContainerStyle={styles.rail}
        showsHorizontalScrollIndicator={false}
        accessibilityLabel={accessibilityLabel}
        initialNumToRender={items.length}
        windowSize={5}
        maxToRenderPerBatch={12}
      />
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
  },
  rail: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    // The underline is the active mark. It is always laid out — only its
    // colour changes — so the row does not jump when the selection moves.
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  label: {
    // `variant="caption"` is Inter 400 13/18; the family override above
    // makes it Inter MEDIUM 13/18. The size stays the app's caption size.
    fontSize: 13,
    lineHeight: 18,
  },
});
