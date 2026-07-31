import React, {useState, useMemo, useCallback} from 'react';
import {View, ScrollView, TouchableOpacity, StyleSheet, FlatList} from 'react-native';
import FastImage from 'react-native-fast-image';
import {SimbaStatusBar} from '../../components/StatusBar';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import type {PodcastDetailScreenProps} from '../../navigation/types';
import type {PodcastEpisodeResult} from '../../types/api';
import {usePodcastDetailScreen} from './hooks/usePodcastDetailScreen';
import {shareContent} from '../../services/shareService';
import {useAppDispatch, useAppSelector} from '../../store';
import {addToQueue, prependToQueue} from '../../store/slices/playerSlice';
import {
  addFollowedPodcast,
  removeFollowedPodcast,
  selectIsPodcastFollowed,
} from '../../store/slices/followedPodcastsSlice';
import {useBookmarks} from '../../hooks/useBookmarks';
import {useToast} from '../../components/feedback/Toast';
import {useHaptics} from '../../hooks/useHaptics';
import {sourceFromUri} from '../../utils/mediaUri';
import {PlaylistSheet} from '../../components/sheets/PlaylistSheet/PlaylistSheet';
import {MediaActionsSheet} from '../../components/sheets/MediaActionsSheet/MediaActionsSheet';

type Props = PodcastDetailScreenProps;

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0min';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}min`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString();
}

export const PodcastDetailScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const haptics = useHaptics();
  const {add: addBookmark} = useBookmarks();
  const {podcastId, podcastTitle: paramTitle} = route.params;
  const {podcast, episodes, isLoading, error} =
    usePodcastDetailScreen(podcastId);

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  // 35.6: episode long-press actions
  const [menuEpisode, setMenuEpisode] = useState<PodcastEpisodeResult | null>(
    null,
  );
  const [episodeMenuVisible, setEpisodeMenuVisible] = useState(false);
  const [sheetItem, setSheetItem] = useState<
    React.ComponentProps<typeof PlaylistSheet>['currentItem'] | null
  >(null);
  const title = podcast?.title ?? paramTitle ?? 'Podcast';

  // 35.5: follow/unfollow this podcast (persisted via redux-persist)
  const isFollowed = useAppSelector(s =>
    selectIsPodcastFollowed(s, podcastId),
  );

  // 35.4: per-episode playback progress (keyed by enclosure URL)
  const recentFiles = useAppSelector(s => s.session.recentFiles);
  const episodeProgress = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ep of episodes) {
      const entry = recentFiles.find(f => f.fileUri === ep.enclosureUrl);
      if (entry && entry.duration > 0) {
        map[ep.enclosureUrl] = Math.min(1, entry.position / entry.duration);
      }
    }
    return map;
  }, [episodes, recentFiles]);

  // 56.4: share the podcast via deep link + https fallback
  const handleShare = useCallback(() => {
    shareContent({
      route: 'PodcastDetail',
      params: {podcastId},
      title,
    });
  }, [podcastId, title]);

  const handleToggleFollow = useCallback(() => {
    if (!podcast) return;
    if (isFollowed) {
      dispatch(removeFollowedPodcast(podcast.id));
      haptics.light();
      toast.show(`Unfollowed "${podcast.title}"`, 'info');
    } else {
      dispatch(
        addFollowedPodcast({
          id: podcast.id,
          title: podcast.title,
          author: podcast.author,
          image: podcast.image,
          feedUrl: podcast.feedUrl,
          episodeCount: podcast.episodeCount,
          followedAt: new Date().toISOString(),
        }),
      );
      haptics.medium();
      toast.show(`Following "${podcast.title}"`, 'success');
    }
  }, [podcast, isFollowed, dispatch, haptics, toast]);

  // 35.2: play an episode with art + origin metadata
  const handleEpisodePress = useCallback(
    (episode: PodcastEpisodeResult) => {
      navigation.navigate('AudioPlayer', {
        fileUri: episode.enclosureUrl,
        fileTitle: episode.title,
        artworkUri: episode.image || podcast?.image || undefined,
        source: sourceFromUri(episode.enclosureUrl),
      });
    },
    [navigation, podcast],
  );

  // 35.6: long-press → play next / queue / playlist / bookmark / share
  const handleEpisodeLongPress = useCallback(
    (episode: PodcastEpisodeResult) => {
      setMenuEpisode(episode);
      setEpisodeMenuVisible(true);
    },
    [],
  );

  const handleEpisodeMenuSelect = useCallback(
    (value: string | number) => {
      const ep = menuEpisode;
      if (!ep) return;
      const art = ep.image || podcast?.image || undefined;
      const source = sourceFromUri(ep.enclosureUrl);
      switch (value) {
        case 'play-next':
          dispatch(
            prependToQueue({
              uri: ep.enclosureUrl,
              title: ep.title,
              duration: ep.duration,
              source,
              mediaType: 'audio',
            }),
          );
          toast.show('Playing next');
          break;
        case 'add-queue':
          dispatch(
            addToQueue({
              uri: ep.enclosureUrl,
              title: ep.title,
              duration: ep.duration,
              source,
              mediaType: 'audio',
            }),
          );
          toast.show('Added to queue');
          break;
        case 'add-playlist':
          setSheetItem({
            fileUri: ep.enclosureUrl,
            title: ep.title,
            duration: ep.duration,
            artist: podcast?.author,
            thumbnailPath: art,
            source,
            mediaType: 'audio',
          });
          break;
        case 'bookmark':
          addBookmark({
            fileUri: ep.enclosureUrl,
            title: ep.title,
            position: 0,
            duration: ep.duration,
            label: '',
            thumbnailPath: art,
            mediaType: 'audio',
            source,
          });
          toast.show('Bookmarked episode');
          break;
        case 'share':
          shareContent({
            route: 'AudioPlayer',
            params: {fileUri: ep.enclosureUrl, fileTitle: ep.title, source},
            title: ep.title,
            subtitle: podcast?.author,
          });
          break;
      }
      setMenuEpisode(null);
    },
    [menuEpisode, podcast, dispatch, toast, addBookmark],
  );

  const handleRetry = useCallback(() => {
    // Re-trigger by navigating back and forth — the hook re-fetches on mount.
    // We simply trigger a re-render by toggling a state if needed, but the hook
    // already runs the effect on mount. The user can go back and re-enter.
    navigation.replace('PodcastDetail', {podcastId, podcastTitle: paramTitle});
  }, [navigation, podcastId, paramTitle]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.background.primary,
        },
        scrollContent: {
          paddingBottom: 40,
        },
        // ── Hero ──
        heroSection: {
          alignItems: 'center',
          paddingHorizontal: spacing.xxl,
          paddingTop: spacing.xl,
          paddingBottom: spacing.lg,
        },
        imagePlaceholder: {
          width: 120,
          height: 120,
          borderRadius: radius.lg,
          backgroundColor: colors.accent.goldDim,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.lg,
        },
        heroImage: {
          width: 120,
          height: 120,
          borderRadius: radius.lg,
          marginBottom: spacing.lg,
        },
        podcastTitle: {
          textAlign: 'center',
          marginBottom: spacing.xs,
        },
        authorText: {
          textAlign: 'center',
          marginBottom: spacing.md,
        },
        descriptionText: {
          textAlign: 'center',
          marginBottom: spacing.xs,
        },
        showMoreButton: {
          paddingVertical: spacing.xs,
          marginBottom: spacing.md,
        },
        showMoreLabel: {
          textAlign: 'center',
        },
        episodeCountBadge: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.accent.goldDim,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radius.pill,
          gap: spacing.xs,
        },
        episodeCountText: {
          color: colors.accent.gold,
        },
        followButton: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          borderWidth: 1,
          borderColor: colors.accent.gold,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          marginTop: spacing.sm,
        },
        followButtonActive: {
          backgroundColor: colors.accent.goldDim,
        },
        followLabel: {
          color: colors.accent.gold,
        },
        // ── Episodes Section ──
        episodesSection: {
          paddingHorizontal: spacing.lg,
        },
        sectionHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.md,
        },
        episodeCard: {
          flexDirection: 'row',
          backgroundColor: colors.background.elevated,
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.sm,
          borderWidth: 1,
          borderColor: colors.border.subtle,
        },
        episodeInfo: {
          flex: 1,
          marginRight: spacing.sm,
        },
        episodeTitle: {
          marginBottom: 2,
        },
        episodeMeta: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginTop: spacing.xs,
          marginBottom: spacing.xs,
        },
        episodeDescription: {
          marginTop: spacing.xs,
        },
        playButton: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.accent.goldDim,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'center',
        },
        progressTrack: {
          height: 3,
          borderRadius: 2,
          backgroundColor: colors.border.subtle,
          marginTop: spacing.sm,
          overflow: 'hidden',
        },
        progressFill: {
          height: 3,
          borderRadius: 2,
          backgroundColor: colors.accent.gold,
        },
        playedText: {
          color: colors.accent.gold,
          marginTop: spacing.xs,
        },
        // ── Loading ──
        loadingContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
        // ── Error ──
        errorContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.xxl,
        },
        errorText: {
          textAlign: 'center',
          marginBottom: spacing.lg,
        },
        retryButton: {
          backgroundColor: colors.accent.goldDim,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
        },
        retryText: {
          color: colors.accent.gold,
        },
      }),
    [colors],
  );

  // ── Loading State ──
  if (isLoading) {
    return (
      <View style={[styles.root, styles.loadingContainer]}>
        <SimbaStatusBar variant="home" />
        <InternalHeader title={title} />
        <View style={styles.loadingContainer}>
          <ActivityOrb size={48} />
        </View>
      </View>
    );
  }

  // ── Error State ──
  if (error || !podcast) {
    return (
      <View style={styles.root}>
        <SimbaStatusBar variant="home" />
        <InternalHeader title={title} />
        <View style={styles.errorContainer}>
          <AppText variant="body1" color="error" style={styles.errorText}>
            {error ?? 'Podcast not found'}
          </AppText>
          <TouchableOpacity
            style={styles.retryButton}
            activeOpacity={0.7}
            onPress={handleRetry}
            accessibilityLabel="Retry loading podcast"
            accessibilityRole="button">
            <AppText variant="button" style={styles.retryText}>
              Retry
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SimbaStatusBar variant="home" />
      <InternalHeader
        title={title}
        rightAction={{icon: 'share', onPress: handleShare}}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* ── Hero Section ── */}
        <View style={styles.heroSection}>
          {podcast.image ? (
            <FastImage
              source={{uri: podcast.image}}
              style={styles.heroImage}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <SvgIcon name="music" size={48} color={colors.accent.gold} />
            </View>
          )}

          <AppText variant="h2" color="primary" style={styles.podcastTitle}>
            {podcast.title}
          </AppText>

          <AppText variant="body1" color="secondary" style={styles.authorText}>
            {podcast.author}
          </AppText>

          {podcast.description ? (
            <>
              <AppText
                variant="bodySmall"
                color="tertiary"
                style={styles.descriptionText}
                numberOfLines={isDescriptionExpanded ? undefined : 2}>
                {podcast.description}
              </AppText>
              <TouchableOpacity
                style={styles.showMoreButton}
                activeOpacity={0.7}
                onPress={() =>
                  setIsDescriptionExpanded(prev => !prev)
                }
                accessibilityLabel={
                  isDescriptionExpanded ? 'Show less' : 'Show more'
                }
                accessibilityRole="button">
                <AppText
                  variant="caption"
                  color="accent"
                  style={styles.showMoreLabel}>
                  {isDescriptionExpanded ? 'Show less' : 'Show more'}
                </AppText>
              </TouchableOpacity>
            </>
          ) : null}

          <View style={styles.episodeCountBadge}>
            <SvgIcon name="music" size={14} color={colors.accent.gold} />
            <AppText
              variant="caption"
              style={styles.episodeCountText}>
              {podcast.episodeCount} episode
              {podcast.episodeCount !== 1 ? 's' : ''}
            </AppText>
          </View>

          <TouchableOpacity
            style={[
              styles.followButton,
              isFollowed && styles.followButtonActive,
            ]}
            activeOpacity={0.7}
            onPress={handleToggleFollow}
            accessibilityRole="button"
            accessibilityState={{selected: isFollowed}}
            accessibilityLabel={
              isFollowed ? 'Unfollow podcast' : 'Follow podcast'
            }>
            <SvgIcon name="bookmark" size={16} color={colors.accent.gold} />
            <AppText variant="caption" style={styles.followLabel}>
              {isFollowed ? 'Following' : 'Follow'}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* ── Episodes List ── */}
        <View style={styles.episodesSection}>
          <View style={styles.sectionHeader}>
            <AppText variant="h3" color="primary">
              Episodes
            </AppText>
            <AppText variant="caption" color="tertiary">
              {episodes.length} available
            </AppText>
          </View>

          <FlatList
            data={episodes}
            keyExtractor={episode => String(episode.id)}
            renderItem={({item: episode}) => (
            <TouchableOpacity
              style={styles.episodeCard}
              activeOpacity={0.7}
              onPress={() => handleEpisodePress(episode)}
              onLongPress={() => handleEpisodeLongPress(episode)}
              delayLongPress={400}
              accessibilityLabel={`Play episode ${episode.title}`}
              accessibilityRole="button">
              <View style={styles.episodeInfo}>
                <AppText
                  variant="body2"
                  color="primary"
                  style={styles.episodeTitle}
                  numberOfLines={1}>
                  {episode.title}
                </AppText>

                <View style={styles.episodeMeta}>
                  <AppText variant="caption" color="tertiary">
                    {formatDate(episode.datePublished)}
                  </AppText>
                  {episode.duration > 0 && (
                    <>
                      <AppText variant="caption" color="tertiary">
                        •
                      </AppText>
                      <AppText variant="caption" color="tertiary">
                        {formatDuration(episode.duration)}
                      </AppText>
                    </>
                  )}
                </View>

                {episode.description ? (
                  <AppText
                    variant="caption"
                    color="secondary"
                    style={styles.episodeDescription}
                    numberOfLines={2}>
                    {episode.description.replace(/<[^>]*>/g, '')}
                  </AppText>
                ) : null}

                {(() => {
                  const pct = episodeProgress[episode.enclosureUrl];
                  if (!pct) return null;
                  if (pct >= 0.95) {
                    return (
                      <AppText
                        variant="caption"
                        style={styles.playedText}>
                        Played
                      </AppText>
                    );
                  }
                  return (
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {width: `${Math.round(pct * 100)}%`},
                        ]}
                      />
                    </View>
                  );
                })()}
              </View>

              <View style={styles.playButton}>
                <SvgIcon name="play" size={20} color={colors.accent.gold} />
              </View>
            </TouchableOpacity>
            )}
            scrollEnabled={false}
            initialNumToRender={episodes.length}
          />
        </View>
      </ScrollView>

      {/* 58.4/58.5: one bottom-sheet menu — same actions as before */}
      <MediaActionsSheet
        visible={episodeMenuVisible}
        onClose={() => setEpisodeMenuVisible(false)}
        title={menuEpisode?.title ?? 'Episode Options'}
        subtitle={podcast?.title}
        actions={[
          {
            label: 'Play Next',
            icon: 'skipForward',
            onPress: () => handleEpisodeMenuSelect('play-next'),
          },
          {
            label: 'Add to Queue',
            icon: 'list',
            onPress: () => handleEpisodeMenuSelect('add-queue'),
          },
          {
            label: 'Add to Playlist',
            icon: 'listMusic',
            onPress: () => handleEpisodeMenuSelect('add-playlist'),
          },
          {
            label: 'Bookmark',
            icon: 'bookmark',
            onPress: () => handleEpisodeMenuSelect('bookmark'),
          },
          {
            label: 'Share',
            icon: 'share',
            onPress: () => handleEpisodeMenuSelect('share'),
          },
        ]}
      />
      <PlaylistSheet
        visible={sheetItem !== null}
        onClose={() => setSheetItem(null)}
        currentItem={sheetItem ?? {fileUri: '', title: '', duration: 0}}
      />
    </View>
  );
};
