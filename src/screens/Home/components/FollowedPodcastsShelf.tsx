// ─── Followed Podcasts Shelf ─────────────────────────────────
//
// Phase 35.5: horizontal cards of followed podcasts for Home.
//
// V2: A CIRCLE OF ARTWORK, AND ITS NAME UNDER IT.
//
// The circle is the app's own 132 dp. V2 drops the heavy drop shadow
// for a ring of the app's own border colour, which separates the
// artwork from the parchment without the blur.
//
// The card's text is centred under the circle — the same hierarchy
// Apple Podcasts and Spotify use — and it is the app's `bodySmall`
// metrics with the semibold family, so the title can actually be read
// at arm's length.
//
// The rail is NOT drawn when the user follows nothing: the section
// builder leaves it out of the section list entirely, and the "Your
// Library" divider above it goes with it when every rail under it is
// empty. A rail with nothing in it is not drawn.

import React from 'react';
import {View, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import {MediaImage} from '../../../components/utility/MediaImage';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {AppText} from '../../../components/core/AppText/AppText';
import {FONT_FAMILY} from '../../../constants/fontFamily';
import type {FollowedPodcast} from '../../../features/followedPodcasts';

interface FollowedPodcastsShelfProps {
  items: FollowedPodcast[];
  onPodcastPress: (item: FollowedPodcast) => void;
  onSeeAll: () => void;
}

const ARTWORK_SIZE = 132; // premium "album art" feel — a touch larger than the
                          // 104px rounded square it replaces, but the card
                          // stays compact because there's no chrome around
                          // the circle (no card background, no border).

export const FollowedPodcastsShelf: React.FC<FollowedPodcastsShelfProps> =
  React.memo(({items, onPodcastPress, onSeeAll}) => {
    const {colors} = useTheme();

    // A RAIL WITH NOTHING IN IT IS NOT DRAWN.
    //
    // The header is not drawn either. A title over no circles is a
    // heading over nothing, and the section builder already leaves this
    // rail out of the page entirely when the user follows nothing.
    //
    // The early return is BELOW the hooks on purpose: an early return
    // above them would change the hook count between renders, and React
    // would throw on the next one.
    if (items.length === 0) {
      return null;
    }

    return (
      <View style={styles.container}>
        <SectionHeader
          label="Followed Podcasts"
          variant="plain"
          // P58: "See All" only appears when the rail has more than
          // one item — if there's only one, the See All link is
          // misleading (nothing more to "see"). Hidden when the
          // list is empty too.
          actionLabel={items.length > 1 ? 'See All' : undefined}
          onAction={onSeeAll}
          actionAccessibilityLabel="See all Followed Podcasts"
        />
        <FlatList
          horizontal
          data={items}
          keyExtractor={podcast => String(podcast.id)}
          renderItem={({item: podcast}) => (
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={() => onPodcastPress(podcast)}
              style={styles.card}
              accessibilityRole="button"
              accessibilityLabel={`Open podcast ${podcast.title}${podcast.author ? ` by ${podcast.author}` : ''}`}>
              {/* ── Circular artwork ──
                  V2: a RING of the app's own border colour instead of
                  the heavy drop shadow. The shadow blurred the
                  artwork's edge into the parchment; the ring separates
                  them without the blur. */}
              <View
                style={[
                  styles.artworkRing,
                  {
                    width: ARTWORK_SIZE,
                    height: ARTWORK_SIZE,
                    borderRadius: ARTWORK_SIZE / 2,
                    borderColor: colors.border.subtle,
                  },
                ]}>
                {podcast.image ? (
                  <MediaImage
                    source={podcast.image}
                    style={styles.artwork}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.artwork,
                      styles.artworkFallback,
                      {backgroundColor: colors.accent.goldDim},
                    ]}>
                    <SvgIcon
                      name="headphones"
                      size={36}
                      color={colors.accent.gold}
                    />
                  </View>
                )}
              </View>

              {/* ── Details underneath ──
                  Two centered lines. Title is the primary read,
                  author is the secondary read — same hierarchy
                  Apple Podcasts / Spotify use. */}
              <AppText
                variant="bodySmall"
                color="primary"
                numberOfLines={1}
                style={styles.title}>
                {podcast.title}
              </AppText>
              {podcast.author ? (
                <AppText
                  variant="caption"
                  color="secondary"
                  numberOfLines={1}
                  style={styles.author}>
                  {podcast.author}
                </AppText>
              ) : null}
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.scroll}
          showsHorizontalScrollIndicator={false}
          initialNumToRender={Math.min(items.length, 24)}
          windowSize={5}
          maxToRenderPerBatch={12}
        />
      </View>
    );
  });

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  scroll: {
    // The card itself is `width: 144` (132 circle + 6px each side).
    // Padding the scroll container the same as every other Home rail
    // (`spacing.lg`) keeps the first card visually aligned with the
    // page gutter.
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    width: 144,
    alignItems: 'center', // centers the circle + the two text lines
  },
  artworkRing: {
    // The ring that replaces the shadow. The artwork itself gets the
    // matching borderRadius so it reads as a true circle.
    borderWidth: 1,
    overflow: 'hidden',
  },
  artwork: {
    width: '100%',
    height: '100%',
    borderRadius: ARTWORK_SIZE / 2,
  },
  artworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: spacing.md, // 12px between circle bottom and title — same
                           // rhythm Apple Podcasts uses.
    fontFamily: FONT_FAMILY.inter.semibold,
    textAlign: 'center',
    width: '100%',
  },
  author: {
    marginTop: 2, // tight pairing so title + author read as one block
    textAlign: 'center',
    width: '100%',
  },
});
