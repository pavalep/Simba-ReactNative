/**
 * MediaRail — a horizontal shelf of media cards with ONE header.
 *
 * THE HEADER
 * ----------
 * The header is `SectionHeader`'s, in its PLAIN skin: the title and at
 * most one action. There is no badge circle and no collapse chevron —
 * four identical gold discs on one screen pull the eye away from the
 * artwork, and a chevron is a control that hides content the user came
 * for. One reading order: top to bottom.
 *
 * THE EMPTY RAIL
 * --------------
 * There is no empty rail. A rail with nothing in it is NOT DRAWN — the
 * section builder (`useHomeScreen`) leaves it out of the section list
 * entirely, and the "Your Library" divider above it goes with it when
 * every rail under it is empty.
 *
 * Netflix, Plex and Spotify never draw an empty row to get to their
 * content either.
 *
 * "SEE ALL"
 * ---------
 * The link appears when the rail holds more than one item. One item means
 * the destination page has nothing more to show, so a "See All" would be
 * pointing at the item the user is already looking at.
 */

import React from 'react';
import {FlatList, StyleSheet, View} from 'react-native';
import {spacing} from '../../theme/tokens';
import {SectionHeader} from '../utility/SectionHeader/SectionHeader';
import {RAIL_CARD_PITCH} from './railMetrics';

export interface MediaRailProps<T> {
  title: string;
  items: readonly T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => React.ReactElement;
  /**
   * How many cards this rail may show. Required on purpose — see the
   * file docstring for the silent-truncation bug this replaces.
   */
  maxItems: number;
  onSeeAll?: () => void;
}

export function MediaRail<T>({
  title,
  items,
  keyExtractor,
  renderItem,
  maxItems,
  onSeeAll,
}: MediaRailProps<T>): React.ReactElement | null {
  const displayItems = items.slice(0, maxItems);

  // A RAIL WITH NOTHING IN IT IS NOT DRAWN.
  //
  // Not "drawn with an empty state" — not drawn. A title over no cards
  // is a heading over nothing, and the section builder already leaves an
  // empty rail out of the page entirely. This is the component-level
  // half of the same rule, so a caller that forgets to filter it still
  // cannot put a lone heading on the screen.
  if (displayItems.length === 0) {
    return null;
  }

  // "See All" only exists where the destination has more to show.
  const showSeeAll = !!onSeeAll && displayItems.length > 1;

  return (
    <View style={styles.container}>
      <SectionHeader
        label={title}
        variant="plain"
        actionLabel={showSeeAll ? 'See All' : undefined}
        onAction={showSeeAll ? onSeeAll : undefined}
        actionAccessibilityLabel={`See all ${title}`}
      />

      <FlatList
        horizontal
        data={displayItems}
        keyExtractor={keyExtractor}
        renderItem={({item, index}) => renderItem(item, index)}
        contentContainerStyle={styles.shelfContent}
        showsHorizontalScrollIndicator={false}
        snapToInterval={RAIL_CARD_PITCH}
        decelerationRate="fast"
        initialNumToRender={displayItems.length}
        windowSize={5}
        maxToRenderPerBatch={12}
      />
    </View>
  );
}

// Card width + the gap after it, which is what the rail actually snaps
// to. Deriving it here is why the two shelves scroll at the same rate:
// the old lists each hard-coded their own and one of them snapped to a
// pitch its cards did not have. The numbers live in `railMetrics.ts` —
// the ONE owner of the page's card pitch.

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xxl,
  },
  shelfContent: {
    // The ONE gutter: 16 dp, like every left-aligned thing on the page.
    paddingHorizontal: spacing.lg,
    paddingBottom: 8,
  },
});
