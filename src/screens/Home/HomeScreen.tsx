import React, {useCallback, useEffect} from 'react';
import {View, FlatList, RefreshControl, StyleSheet, TouchableOpacity, Animated} from 'react-native';
import {spacing} from '../../theme/tokens';
import {type HomeScreenProps} from '../../navigation/types';
import {useHomeScreen, type HomeSection} from './hooks/useHomeScreen';
import {removeBookmark} from '../../store/slices/sessionSlice';

// ── Components ──
import {SimbaStatusBar} from '../../components/StatusBar';
import {HomeHeader} from '../../components/layout/HomeHeader/HomeHeader';
import {FeaturedHeroBanner} from './components/FeaturedHeroBanner';
import {HomeMediaShelf} from './components/HomeMediaShelf';
import {QuickAccessShelf} from './components/QuickAccessShelf';
import {HomeLoadingSkeleton} from './components/HomeLoadingSkeleton';
import {HomeErrorState} from './components/HomeErrorState';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {AppText} from '../../components/core/AppText/AppText';
import {HomeBookmarksList} from './components/HomeBookmarksList';
import {MovieCategoriesShelf} from './components/MovieCategoriesShelf';
import {PodcastCategoriesShelf} from './components/PodcastCategoriesShelf';
import {FollowedPodcastsShelf} from './components/FollowedPodcastsShelf';
import {MusicCategoriesShelf} from './components/MusicCategoriesShelf';
import {GenreChipsShelf} from './components/GenreChipsShelf';
import {RadioCategoriesShelf} from './components/RadioCategoriesShelf';
import {LiveTVCategoriesShelf} from './components/LiveTVCategoriesShelf';
import {AudiobooksShelf} from './components/AudiobooksShelf';
import {ArchiveShelf} from './components/ArchiveShelf';
import {ShowsShelf} from './components/ShowsShelf';
import type {
  AudiobooksBrowseEntry,
  ArchiveBrowseEntry,
} from '../../constants/audiobookCategories';
import type {ShowsBrowseEntry} from '../../constants/showCategories';
import {useAnimatedEntrance} from '../../hooks/useAnimatedEntrance';
import {mark, logStartupSummary} from '../../utils/startupPerf';

// ── Screen ──

export const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
  const {
    colors,
    insets,
    refreshing,
    isSettled,
    hasError,
    isScanning,
    sections,
    greeting,
    dispatch,
    user,
    bookmarkCount,
    handleOpenMedia,
    handleItemPress,
    handlePlaylistPress,
    handleGenrePress,
    handleSeeAll,
    handleSettingsPress,
    handleSearchPress,
    handleAvatarPress,
    handleBookmarksPress,
    onRefresh,
    setHasError,
  } = useHomeScreen(navigation);

  const entrance = useAnimatedEntrance(sections.length, {staggerDelay: 80});

  // 59.3: cold-start milestone — initial screen mounted → log the summary
  useEffect(() => {
    mark('first-screen');
    logStartupSummary();
  }, []);

  const handleMovieCategoryPress = useCallback(
    (categoryId: string) => {
      navigation.navigate('MoviesScreen', {categoryId});
    },
    [navigation],
  );

  const handleMovieSeeAll = useCallback(() => {
    navigation.navigate('MoviesScreen', {});
  }, [navigation]);

  const handlePodcastCategoryPress = useCallback(
    (categoryId: number) => {
      navigation.navigate('PodcastsScreen', {categoryId});
    },
    [navigation],
  );

  const handlePodcastSeeAll = useCallback(() => {
    navigation.navigate('PodcastsScreen', {});
  }, [navigation]);

  // 35.5: followed podcast card → podcast detail
  const handleFollowedPodcastPress = useCallback(
    (item: {id: number; title: string}) => {
      navigation.navigate('PodcastDetail', {
        podcastId: item.id,
        podcastTitle: item.title,
      });
    },
    [navigation],
  );

  const handleMusicCategoryPress = useCallback(
    (genre: string) => {
      navigation.navigate('MusicScreen', {genre});
    },
    [navigation],
  );

  const handleMusicSeeAll = useCallback(() => {
    navigation.navigate('MusicScreen', {});
  }, [navigation]);

  // P36.7: live radio + live TV browse shelves
  const handleRadioBrowsePress = useCallback(
    (tab: string) => {
      navigation.navigate('RadioScreen', {initialTab: tab});
    },
    [navigation],
  );

  const handleRadioSeeAll = useCallback(() => {
    navigation.navigate('RadioScreen', {});
  }, [navigation]);

  const handleLiveTVCategoryPress = useCallback(
    (categoryId: string) => {
      navigation.navigate('LiveTVScreen', {categoryId});
    },
    [navigation],
  );

  const handleLiveTVSeeAll = useCallback(() => {
    navigation.navigate('LiveTVScreen', {});
  }, [navigation]);

  // P37.7: audiobooks + Internet Archive browse shelves
  const handleAudiobookBrowsePress = useCallback(
    (entry: AudiobooksBrowseEntry) => {
      navigation.navigate('AudiobooksScreen', {initialTab: entry.id});
    },
    [navigation],
  );

  const handleAudiobookGenrePress = useCallback(
    (genre: string) => {
      navigation.navigate('AudiobooksScreen', {initialTab: 'genres', genre});
    },
    [navigation],
  );

  const handleAudiobookSeeAll = useCallback(() => {
    navigation.navigate('AudiobooksScreen', {});
  }, [navigation]);

  const handleArchiveBrowsePress = useCallback(
    (entry: ArchiveBrowseEntry) => {
      navigation.navigate('ArchiveScreen', {initialTab: entry.id});
    },
    [navigation],
  );

  const handleArchiveQuickSearch = useCallback(
    (query: string) => {
      navigation.navigate('ArchiveScreen', {query});
    },
    [navigation],
  );

  const handleArchiveSeeAll = useCallback(() => {
    navigation.navigate('ArchiveScreen', {});
  }, [navigation]);

  // P38.7: TV shows (TVMaze) browse shelf
  const handleShowsBrowsePress = useCallback(
    (entry: ShowsBrowseEntry) => {
      navigation.navigate('ShowsScreen', {initialTab: entry.id});
    },
    [navigation],
  );

  const handleShowsSeeAll = useCallback(() => {
    navigation.navigate('ShowsScreen', {});
  }, [navigation]);

  // P41.5: See All coverage — pinned playlists link to the full list
  const handlePlaylistsSeeAll = useCallback(() => {
    navigation.navigate('AllPlaylistsScreen');
  }, [navigation]);

  // ── Render Item ──
  const renderSection = useCallback(
    ({item, index}: {item: HomeSection; index: number}) => {
      const animStyle = entrance.styles[index];
      const sectionContent = (() => {
        switch (item.type) {
          case 'GREETING':
            return (
              <View style={styles.welcomeSection}>
                <AppText variant="h2" color="primary" style={styles.greetingMain}>
                  {greeting}, Paval
                </AppText>
              </View>
            );
        case 'HERO':
          return item.data ? <FeaturedHeroBanner item={item.data} onPress={handleItemPress} /> : null;
        case 'SHELF':
          return (
            <HomeMediaShelf
              title={item.title}
              items={item.items}
              onItemPress={handleItemPress}
              onSeeAll={item.seeAllRoute ? () => handleSeeAll(item.seeAllRoute!) : undefined}
            />
          );
        case 'GENRE':
          return <GenreChipsShelf genres={item.genres} onGenrePress={handleGenrePress} />;
        case 'PLAYLISTS':
          return (
            <QuickAccessShelf
              title="Pinned Playlists"
              playlists={item.items}
              onPlaylistPress={handlePlaylistPress}
              onSeeAll={handlePlaylistsSeeAll}
            />
          );
        case 'MOVIES':
          return (
            <MovieCategoriesShelf
              onCategoryPress={handleMovieCategoryPress}
              onSeeAll={handleMovieSeeAll}
            />
          );
        case 'PREFILLED_PODCASTS':
          return (
            <PodcastCategoriesShelf
              onCategoryPress={handlePodcastCategoryPress}
              onSeeAll={handlePodcastSeeAll}
            />
          );
        case 'FOLLOWED_PODCASTS':
          return (
            <FollowedPodcastsShelf
              items={item.items}
              onPodcastPress={handleFollowedPodcastPress}
              onSeeAll={handlePodcastSeeAll}
            />
          );
        case 'PREFILLED_MUSIC':
          return (
            <MusicCategoriesShelf
              onCategoryPress={handleMusicCategoryPress}
              onSeeAll={handleMusicSeeAll}
            />
          );
        case 'RADIO':
          return (
            <RadioCategoriesShelf
              onBrowsePress={handleRadioBrowsePress}
              onSeeAll={handleRadioSeeAll}
            />
          );
        case 'LIVE_TV':
          return (
            <LiveTVCategoriesShelf
              onCategoryPress={handleLiveTVCategoryPress}
              onSeeAll={handleLiveTVSeeAll}
            />
          );
        case 'AUDIOBOOKS':
          return (
            <AudiobooksShelf
              onBrowsePress={handleAudiobookBrowsePress}
              onGenrePress={handleAudiobookGenrePress}
              onSeeAll={handleAudiobookSeeAll}
            />
          );
        case 'ARCHIVE':
          return (
            <ArchiveShelf
              onBrowsePress={handleArchiveBrowsePress}
              onQuickSearch={handleArchiveQuickSearch}
              onSeeAll={handleArchiveSeeAll}
            />
          );
        case 'SHOWS':
          return (
            <ShowsShelf
              onBrowsePress={handleShowsBrowsePress}
              onSeeAll={handleShowsSeeAll}
            />
          );
        case 'BOOKMARKS':
          return (
            <HomeBookmarksList
              items={item.items}
              onPress={bookmark => handleItemPress({...bookmark, startPosition: bookmark.position})}
              onRemove={id => dispatch(removeBookmark(id))}
            />
          );
          default:
            return null;
        }
      })();
      return animStyle ? (
        <Animated.View style={animStyle}>{sectionContent}</Animated.View>
      ) : (
        sectionContent
      );
    },
    [dispatch, greeting, handleItemPress, handlePlaylistPress, handleGenrePress, handleMovieCategoryPress, handleMovieSeeAll, handleSeeAll, handlePodcastCategoryPress, handlePodcastSeeAll, handleFollowedPodcastPress, handleMusicCategoryPress, handleMusicSeeAll, handleRadioBrowsePress, handleRadioSeeAll, handleLiveTVCategoryPress, handleLiveTVSeeAll, handleAudiobookBrowsePress, handleAudiobookGenrePress, handleAudiobookSeeAll, handleArchiveBrowsePress, handleArchiveQuickSearch, handleArchiveSeeAll, handleShowsBrowsePress, handleShowsSeeAll, handlePlaylistsSeeAll, entrance.styles],
  );

  if (hasError) {
    return (
      <View style={[styles.root, {backgroundColor: colors.background.primary, paddingTop: insets.top}]}>
        <SimbaStatusBar variant="home" />
        <HomeHeader
          isScanning={isScanning}
          onSettingsPress={handleSettingsPress}
          onSearchPress={handleSearchPress}
          onAvatarPress={handleAvatarPress}
          onBookmarksPress={handleBookmarksPress}
          avatarUrl={user?.photo ?? null}
          bookmarkCount={bookmarkCount}
        />
        <HomeErrorState onRetry={() => setHasError(false)} colors={colors} />
      </View>
    );
  }

  if (!isSettled && sections.length <= 2) {
    return (
      <View style={[styles.root, {backgroundColor: colors.background.primary, paddingTop: insets.top}]}>
        <SimbaStatusBar variant="home" />
        <HomeHeader
          isScanning={isScanning}
          onSettingsPress={handleSettingsPress}
          onSearchPress={handleSearchPress}
          onAvatarPress={handleAvatarPress}
          onBookmarksPress={handleBookmarksPress}
          avatarUrl={user?.photo ?? null}
          bookmarkCount={bookmarkCount}
        />
        <HomeLoadingSkeleton colors={colors} />
      </View>
    );
  }

  return (
    <View style={[styles.root, {backgroundColor: colors.background.primary, paddingTop: insets.top}]}>
      <SimbaStatusBar variant="home" />
      <HomeHeader
        isScanning={isScanning}
        onSettingsPress={handleSettingsPress}
        onSearchPress={handleSearchPress}
        onAvatarPress={handleAvatarPress}
        onBookmarksPress={handleBookmarksPress}
        avatarUrl={user?.photo ?? null}
        bookmarkCount={bookmarkCount}
      />

      <FlatList
        data={sections}
        renderItem={renderSection}
        keyExtractor={(item, index) => item.type + (item.type === 'SHELF' ? item.title : index.toString())}
        contentContainerStyle={[styles.scrollContent, {paddingBottom: insets.bottom + 100}]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.gold}
            colors={[colors.accent.gold]}
          />
        }
        getItemLayout={(_, index) => ({length: 76, offset: 76 * index, index})}
        windowSize={5}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
      />

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleOpenMedia}
        accessibilityRole="button"
        accessibilityLabel="Play media file"
        style={[
          styles.fab,
          {
            backgroundColor: colors.accent.gold,
            bottom: insets.bottom + 100,
            // Shadow (colors.shadow — inline; static styles are color-free)
            shadowColor: colors.shadow,
            shadowOffset: {width: 0, height: 3},
            shadowOpacity: 0.3,
            shadowRadius: 4.5,
          },
        ]}>
        <SvgIcon name="play" size={24} color={colors.text.inverse} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  scrollContent: {paddingTop: spacing.md},
  welcomeSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  greetingMain: {fontWeight: '700', opacity: 0.9},
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    zIndex: 99,
  },
});
