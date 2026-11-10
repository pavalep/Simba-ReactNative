// ─── FollowedPodcastsScreen — "My Podcasts" ─────────────────────────
//
// WHY THIS PAGE EXISTS
// --------------------
// The Home page's "Followed Podcasts" rail carried a "See All" link
// that pointed at `PodcastsScreen` — which is the CATALOGUE: a category
// filter and a search box over the Podcast Index. It does NOT list the
// podcasts the user follows; there is no reference to the followed list
// anywhere under `src/screens/PodcastsScreen/`.
//
// So the link answered a question the page could not answer. This page
// IS the answer: the podcasts the user follows, and the way to unfollow
// one.
//
// It is a LIST, not a rail, because the list is the content — the same
// shape Apple Podcasts ("Following"), Pocket Casts and Spotify use.
//
// The unfollow behaviour is the app's own: `PodcastDetailScreen` does
// the same three things — remove it, tick the haptic, say so in a
// toast — and this page does the same three things, so following a
// podcast and unfollowing it feel the same wherever the user does it.

import React, {useCallback} from 'react';
import {View, FlatList, TouchableOpacity, StyleSheet} from 'react-native';
import {ScreenContainer} from '../../../components/layout/ScreenContainer/ScreenContainer';
import {InternalHeader} from '../../../components/layout/InternalHeader/InternalHeader';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {MediaImage} from '../../../components/utility/MediaImage';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {AppText} from '../../../components/core/AppText/AppText';
import {SimbaStatusBar} from '../../../components/StatusBar';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {FONT_FAMILY} from '../../../constants/fontFamily';
import {useFollowedPodcasts} from '../../../features/followedPodcasts';
import {useToast} from '../../../components/feedback/Toast';
import {useHaptics} from '../../../hooks/useHaptics';
import type {RootStackScreenProps} from '../../../navigation/types';

type Props = RootStackScreenProps<'FollowedPodcasts'>;

/** The circular cover on a row. */
const ARTWORK_SIZE = 56;

export const FollowedPodcastsScreen: React.FC<Props> = ({navigation}) => {
  const {colors} = useTheme();
  const {list, unfollow} = useFollowedPodcasts();
  const toast = useToast();
  const haptics = useHaptics();

  const handleOpen = useCallback(
    (podcastId: number, title: string) => {
      navigation.navigate('PodcastDetail', {podcastId, podcastTitle: title});
    },
    [navigation],
  );

  const handleUnfollow = useCallback(
    (podcastId: number, title: string) => {
      unfollow(podcastId);
      haptics.light();
      toast.show(`Unfollowed "${title}"`, 'info');
    },
    [haptics, toast, unfollow],
  );

  const renderItem = useCallback(
    ({item}: {item: (typeof list)[number]}) => (
      <View style={[styles.row, {borderBottomColor: colors.border.subtle}]}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => handleOpen(item.id, item.title)}
          accessibilityRole="button"
          accessibilityLabel={`Open podcast ${item.title}${item.author ? ` by ${item.author}` : ''}`}
          style={styles.artwork}>
          {item.image ? (
            <MediaImage source={item.image} style={styles.artworkImage} resizeMode="cover" />
          ) : (
            <View style={[styles.artworkFallback, {backgroundColor: colors.accent.goldDim}]}>
              <SvgIcon name="headphones" size={24} color={colors.accent.gold} />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => handleOpen(item.id, item.title)}
          accessibilityRole="button"
          accessibilityLabel={`Open podcast ${item.title}`}
          style={styles.info}>
          <AppText variant="bodySmall" color="primary" numberOfLines={1} style={styles.title}>
            {item.title}
          </AppText>
          {item.author ? (
            <AppText variant="caption" color="secondary" numberOfLines={1} style={styles.author}>
              {item.author}
            </AppText>
          ) : null}
          {item.episodeCount ? (
            <AppText variant="caption" color="tertiary" numberOfLines={1} style={styles.meta}>
              {item.episodeCount} {item.episodeCount === 1 ? 'episode' : 'episodes'}
            </AppText>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleUnfollow(item.id, item.title)}
          accessibilityRole="button"
          accessibilityLabel={`Unfollow ${item.title}`}
          style={styles.unfollow}>
          <AppText variant="caption" color="accent">
            Unfollow
          </AppText>
        </TouchableOpacity>
      </View>
    ),
    [colors, handleOpen, handleUnfollow],
  );

  return (
    <ScreenContainer
      header={
        <>
          <SimbaStatusBar variant="home" />
          <InternalHeader title="My Podcasts" />
        </>
      }>
      {list.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState
            icon="headphones"
            title="No podcasts followed yet"
            description="Open a podcast and tap Follow, and it will show up here."
          />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={podcast => String(podcast.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          initialNumToRender={Math.min(list.length, 12)}
          windowSize={5}
          maxToRenderPerBatch={8}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  list: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: ARTWORK_SIZE / 2,
    overflow: 'hidden',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  artworkFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: FONT_FAMILY.inter.semibold,
  },
  author: {
    marginTop: 2,
  },
  meta: {
    marginTop: 2,
  },
  unfollow: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
