// ─── Followed Podcasts Shelf ─────────────────────────────────
// Phase 35.5: horizontal cards of followed podcasts for Home.
// Rendered only when at least one podcast is followed.

import React from 'react';
import {View, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {SectionHeader} from '../../../components/utility/SectionHeader/SectionHeader';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {AppText} from '../../../components/core/AppText/AppText';
import type {FollowedPodcast} from '../../../store/slices/followedPodcastsSlice';

interface FollowedPodcastsShelfProps {
  items: FollowedPodcast[];
  onPodcastPress: (item: FollowedPodcast) => void;
  onSeeAll: () => void;
}

export const FollowedPodcastsShelf: React.FC<FollowedPodcastsShelfProps> =
  React.memo(({items, onPodcastPress, onSeeAll}) => {
    const {colors} = useTheme();

    return (
      <View style={styles.container}>
        <SectionHeader
          label="Followed Podcasts"
          actionLabel="See All"
          onAction={onSeeAll}
        />
        <FlatList
          horizontal
          data={items}
          keyExtractor={podcast => String(podcast.id)}
          renderItem={({item: podcast}) => (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onPodcastPress(podcast)}
              style={[
                styles.card,
                {backgroundColor: colors.background.elevated},
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Open podcast ${podcast.title}`}>
              {podcast.image ? (
                <FastImage
                  source={{uri: podcast.image}}
                  style={styles.cover}
                  resizeMode={FastImage.resizeMode.cover}
                />
              ) : (
                <View
                  style={[
                    styles.cover,
                    styles.coverFallback,
                    {backgroundColor: colors.accent.goldDim},
                  ]}>
                  <SvgIcon
                    name="headphones"
                    size={22}
                    color={colors.accent.gold}
                  />
                </View>
              )}
              <AppText
                variant="bodySmall"
                style={styles.cardTitle}
                numberOfLines={1}>
                {podcast.title}
              </AppText>
              {podcast.author ? (
                <AppText
                  variant="caption"
                  color="secondary"
                  numberOfLines={1}>
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
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  card: {
    width: 120,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  cover: {
    width: 104,
    height: 104,
    borderRadius: radius.sm,
    alignSelf: 'center',
  },
  coverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontWeight: '700',
    lineHeight: 16,
  },
});
