// ─── Followed Podcasts Shelf ─────────────────────────────────
// Phase 35.5: horizontal cards of followed podcasts for Home.
// P54: always renders — if the user has no followed podcasts, the
// section header stays visible with an empty-state hint.
// P55 (premium redesign): large circular artwork (the established
// Apple Podcasts / Spotify / Pocket Casts pattern) with the title
// and author centered *underneath* the circle. No card background
// — the circle is the visual anchor and lifts off the surface via
// a soft shadow. The two text lines do all the metadata work.

import React, {useCallback, useState} from 'react';
import {View, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {EmptyState} from '../../../components/utility/EmptyState/EmptyState';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {AppText} from '../../../components/core/AppText/AppText';
import type {FollowedPodcast} from '../../../store/slices/followedPodcastsSlice';

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

    // P58: the rail owns its collapse state — default is
    // collapsed when empty, expanded when has data. The user can
    // flip with the chevron; the choice is in-memory only.
    const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null);
    const hasData = items.length > 0;
    const collapsed = userCollapsed ?? !hasData;
    const onToggleCollapsed = useCallback(() => {
      setUserCollapsed(prev => (prev ?? !hasData) ? false : true);
    }, [hasData]);
    // P58: the rail always renders. `collapsed` is owned here.
    //   • collapsed === true  → header only (collapsed tile)
    //   • collapsed === false → header + body
    //       └─ body = podcast list when items.length > 0
    //       └─ body = empty-state when items.length === 0
    const showBody = !collapsed;

    return (
      <View style={styles.container}>
        <SectionHeader
          label="Followed Podcasts"
          leadingIcon="podcastRings"
          // P58: "See All" only appears when the rail has more than
          // one item — if there's only one, the See All link is
          // misleading (nothing more to "see"). Hidden when the
          // list is empty too.
          actionLabel={items.length > 1 ? 'See All' : undefined}
          onAction={onSeeAll}
          collapsible
          collapsed={collapsed}
          onToggleCollapsed={onToggleCollapsed}
        />
        {showBody && items.length === 0 ? (
          <EmptyState
            icon="headphones"
            title="No Followed Podcasts"
            description="Open a podcast page and tap Follow — it will show up here for quick access."
            variant="compact"
          />
        ) : null}
        {showBody && items.length > 0 ? (
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
                    The outer View carries the shadow so it renders
                    correctly across iOS + Android. The inner image
                    gets a matching borderRadius so it reads as a true
                    circle. */}
                <View
                  style={[
                    styles.artworkShadow,
                    {
                      width: ARTWORK_SIZE,
                      height: ARTWORK_SIZE,
                      borderRadius: ARTWORK_SIZE / 2,
                      shadowColor: colors.shadow,
                    },
                  ]}>
                  {podcast.image ? (
                    <FastImage
                      source={{uri: podcast.image}}
                      style={styles.artwork}
                      resizeMode={FastImage.resizeMode.cover}
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
        ) : null}
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
    // (`spacing.md`) keeps the first card visually aligned with the
    // page gutter.
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  card: {
    width: 144,
    alignItems: 'center', // centers the circle + the two text lines
  },
  artworkShadow: {
    // Soft lift under the circle — premium "album art" look. iOS uses
    // real shadows; Android falls back to elevation. Opacity is on the
    // low side so the shadow doesn't fight the dark surface.
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.32,
    shadowRadius: 12,
    elevation: 10,
    backgroundColor: 'transparent', // shadow wrapper must be transparent
                                    // or the circle gets a square fill.
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
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
    width: '100%',
  },
  author: {
    marginTop: 2, // tight pairing so title + author read as one block
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    width: '100%',
  },
});
