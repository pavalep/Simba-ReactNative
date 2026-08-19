import React, {useState, useMemo, useCallback, useRef} from 'react';
import {View, FlatList, TouchableOpacity} from 'react-native';
import {SimbaStatusBar} from '../../components/StatusBar';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {AppText} from '../../components/core/AppText/AppText';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {SearchBar} from '../../components/core/SearchBar/SearchBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {ScreenContainer} from '../../components/layout/ScreenContainer/ScreenContainer';
import type {PodcastDetailScreenProps} from '../../navigation/types';
import {usePodcastDetailScreen} from './hooks/usePodcastDetailScreen';
import {useEpisodeActions} from './hooks/useEpisodeActions';
import {createPodcastScreenStyles} from './styles';
import {HeroSection} from './components/HeroSection';
import {DetailItem} from './components/DetailItem';
import {ListStates} from './components/ListStates';
import {shareContent} from '../../services/shareService';
import {useAppDispatch, useAppSelector} from '../../store';
import {
  addFollowedPodcast,
  removeFollowedPodcast,
  selectIsPodcastFollowed,
} from '../../store/slices/followedPodcastsSlice';
import {useToast} from '../../components/feedback/Toast';
import {useHaptics} from '../../hooks/useHaptics';
import {PlaylistSheet} from '../../components/sheets/PlaylistSheet/PlaylistSheet';
import {MediaActionsSheet} from '../../components/sheets/MediaActionsSheet/MediaActionsSheet';
import text from './related/textContent.json';
import {HEADER_TITLE, EPISODE_MENU_ACTIONS} from './related/constants';

type Props = PodcastDetailScreenProps;

export const PodcastDetailScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const haptics = useHaptics();
  const {podcastId} = route.params;
  const {
    podcast,
    episodes,
    isLoading,
    isLoadingMore,
    error,
    hasLoaded,
    reachedEnd,
    loadMore,
    retry,
  } = usePodcastDetailScreen(podcastId);

  // Episode-level interactions (play / long-press menu / playlist sheet).
  const {
    menuEpisode,
    episodeMenuVisible,
    setEpisodeMenuVisible,
    sheetItem,
    setSheetItem,
    handleEpisodePress,
    handleEpisodeLongPress,
    handleEpisodeMenuSelect,
  } = useEpisodeActions({podcast, navigation});

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

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
      title: HEADER_TITLE,
    });
  }, [podcastId]);

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

  const handleRetry = useCallback(() => {
    navigation.replace('PodcastDetail', {
      podcastId,
      podcastTitle: HEADER_TITLE,
    });
  }, [navigation, podcastId]);

  const styles = useMemo(() => createPodcastScreenStyles(colors), [colors]);

  // Mount-time pagination guard: FlatList fires `onEndReached` once
  // during initial layout (distanceFromEnd reads 0 before content is
  // measured). Without a gate, that fire would silently pre-fetch
  // page 2 the moment page 1 renders. Gate pagination on a real user
  // scroll; from the first drag onward normal onEndReached applies.
  const userDraggedRef = useRef(false);

  // Footer for the episodes list — "Loading more…" while the next page
  // is in flight, retry pill on a load-more error, "You're all caught
  // up" once reachedEnd, idle spacer otherwise (so the bottom edge of
  // the FlatList doesn't jump between states).
  const episodesFooter = (
    <View style={styles.listFooter}>
      {isLoadingMore ? (
        <View style={styles.footerRow}>
          <ActivityOrb size={22} />
          <AppText variant="caption" color="secondary" style={styles.footerText}>
            {text.footer.loadingMore}
          </AppText>
        </View>
      ) : !!error && hasLoaded && episodes.length > 0 ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={loadMore}
          style={styles.loadMoreRetry}
          accessibilityRole="button"
          accessibilityLabel={text.footer.loadMoreRetry}>
          <AppText variant="caption" color="secondary">
            {text.footer.loadMoreRetry}
          </AppText>
        </TouchableOpacity>
      ) : reachedEnd && hasLoaded && episodes.length > 0 ? (
        <AppText variant="caption" color="secondary" style={styles.footerText}>
          {text.footer.caughtUp}
        </AppText>
      ) : null}
    </View>
  );

  // One return path, one FlatList — loading, error and content all ride
  // inside the list (ListHeaderComponent / ListEmptyComponent), so there
  // is no layout flicker when the API resolves.
  return (
    <ScreenContainer
      header={
        <InternalHeader
          title={HEADER_TITLE}
          rightAction={{icon: 'share', onPress: handleShare}}
        />
      }>
      <SimbaStatusBar variant="home" />

      {/* ── Episodes — the single scrollable on this screen ──────────────
          KISS: no nested FlatList-in-ScrollView conflict. The hero + the
          section header ride as ListHeaderComponent so the whole page
          scrolls together, and the cards stretch the full content width.
          Loading / error / empty states render through ListEmptyComponent. */}
      <FlatList
        data={episodes}
        keyExtractor={episode => String(episode.id)}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          podcast ? (
            <>
              <HeroSection
                podcast={podcast}
                isFollowed={isFollowed}
                isDescriptionExpanded={isDescriptionExpanded}
                onToggleDescription={() =>
                  setIsDescriptionExpanded(prev => !prev)
                }
                onToggleFollow={handleToggleFollow}
              />

              <View style={styles.sectionHeader}>
                <AppText variant="displaySans" color="primary">
                  {text.screen.episodesSection}
                </AppText>
              </View>
            </>
          ) : null
        }
        renderItem={({item}) => (
          <DetailItem
            episode={item}
            progress={episodeProgress[item.enclosureUrl]}
            onPress={() => handleEpisodePress(item)}
            onLongPress={() => handleEpisodeLongPress(item)}
          />
        )}
        ListEmptyComponent={
          <ListStates
            isLoading={isLoading}
            error={error}
            hasPodcast={!!podcast}
            onRetry={retry}
          />
        }
        ListFooterComponent={episodesFooter}
        // Only paginate after a real user scroll — never on the
        // mount-time spurious fire (see the comment above).
        onScrollBeginDrag={() => {
          userDraggedRef.current = true;
        }}
        onEndReached={() => {
          if (!userDraggedRef.current) return;
          loadMore();
        }}
        onEndReachedThreshold={0.4}
      />
      <MediaActionsSheet
        visible={episodeMenuVisible}
        onClose={() => setEpisodeMenuVisible(false)}
        title={menuEpisode?.title ?? text.screen.episodeOptionsFallback}
        subtitle={podcast?.title}
        actions={EPISODE_MENU_ACTIONS.map(a => ({
          label: a.label,
          icon: a.icon,
          onPress: () => handleEpisodeMenuSelect(a.value),
        }))}
      />
      <PlaylistSheet
        visible={sheetItem !== null}
        onClose={() => setSheetItem(null)}
        currentItem={sheetItem ?? {fileUri: '', title: '', duration: 0}}
      />
    </ScreenContainer>
  );
};
