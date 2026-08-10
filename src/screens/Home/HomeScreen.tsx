import React, {useCallback, useEffect} from 'react';
import {View, FlatList, RefreshControl, StyleSheet, TouchableOpacity} from 'react-native';
import FastImage from 'react-native-fast-image';
import {spacing} from '../../theme/tokens';
import {type HomeScreenProps} from '../../navigation/types';
import {useHomeScreen, type HomeSection} from './hooks/useHomeScreen';
import {removeBookmark} from '../../store/slices/sessionSlice';
import {GREETING_IMAGES} from '../../assets/images/greeting';

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
import {SubsectionTitle} from '../../components/utility/SubsectionTitle/SubsectionTitle';
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
import type {AudiobookCategory, ArchiveCategory} from '../../constants/audiobookCategories';
import type {ShowCategory} from '../../constants/showCategories';
import type {RadioCategory} from '../../constants/liveCategories';
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
    handleOpenMedia,
    handleItemPress,
    handlePlaylistPress,
    handleGenrePress,
    handleSeeAll,
    handleSettingsPress,
    handleSearchPress,
    handleAvatarPress,
    handleBookmarksSeeAll,
    onRefresh,
    setHasError,
  } = useHomeScreen(navigation);

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

  const handlePodcastCategoryPress = useCallback(
    (categoryId: number | 'all') => {
      // The synthetic 'all' category id rides the same PodscastsScreen
      // route — the screen's hook detects it and uses /podcasts/trending.
      navigation.navigate('PodcastsScreen', {categoryId: categoryId as number});
    },
    [navigation],
  );

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

  // 35.5: per-user rail — keep the "View All" link to the Podcasts screen
  // so the user can see their full followed list.
  const handleFollowedPodcastsSeeAll = useCallback(() => {
    navigation.navigate('PodcastsScreen', {});
  }, [navigation]);

  const handleMusicCategoryPress = useCallback(
    (genre: string) => {
      // 'all' is a synthetic tile — landing on the Popular tab gives
      // the user a populated "everything trending" view instead of an
      // empty search box.
      if (genre === 'all') {
        navigation.navigate('MusicScreen', {initialTab: 'popular'});
        return;
      }
      navigation.navigate('MusicScreen', {genre});
    },
    [navigation],
  );

  // P36.7 + P53: live radio + live TV browse shelves
  // Rail tiles are now RadioCategory objects (id + radio-browser tag).
  const handleRadioCategoryPress = useCallback(
    (cat: RadioCategory) => {
      if (cat.id === 'all') {
        navigation.navigate('RadioScreen', {});
        return;
      }
      navigation.navigate('RadioScreen', {initialTab: 'genres', initialTag: cat.tag});
    },
    [navigation],
  );

  const handleLiveTVCategoryPress = useCallback(
    (categoryId: string) => {
      navigation.navigate('LiveTVScreen', {categoryId});
    },
    [navigation],
  );

  // P37.7 + P53: audiobooks + Internet Archive browse shelves
  // Rail tiles are now AudiobookCategory objects (id + libriVox tag).
  const handleAudiobookCategoryPress = useCallback(
    (cat: AudiobookCategory) => {
      if (cat.id === 'all') {
        navigation.navigate('AudiobooksScreen', {});
        return;
      }
      navigation.navigate('AudiobooksScreen', {initialTab: 'genres', initialGenre: cat.tag});
    },
    [navigation],
  );

  // P53: rail tiles are now ArchiveCategory objects (id + IA query).
  const handleArchiveCategoryPress = useCallback(
    (cat: ArchiveCategory) => {
      if (cat.id === 'all') {
        navigation.navigate('ArchiveScreen', {});
        return;
      }
      if (cat.id === 'audio' || cat.id === 'video') {
        navigation.navigate('ArchiveScreen', {initialTab: cat.id});
        return;
      }
      navigation.navigate('ArchiveScreen', {query: cat.query});
    },
    [navigation],
  );

  // P38.7 + P53: rail tiles are now ShowCategory objects (id + TVMaze genre).
  const handleShowsCategoryPress = useCallback(
    (cat: ShowCategory) => {
      if (cat.id === 'all') {
        navigation.navigate('ShowsScreen', {});
        return;
      }
      navigation.navigate('ShowsScreen', {initialTab: 'browse', initialGenre: cat.genre});
    },
    [navigation],
  );

  // P41.5: Pinned Playlists' "VIEW ALL" link — kept on the per-user
  // QuickAccessShelf only (not on the API-backed category rails).
  const handlePlaylistsSeeAll = useCallback(() => {
    navigation.navigate('AllPlaylistsScreen');
  }, [navigation]);

  // ── Render Item ──
  const renderSection = useCallback(
    ({item}: {item: HomeSection; index: number}) => {
      const sectionContent = (() => {
        switch (item.type) {
          case 'GREETING':
            // P60 (Direction 1 + image): the greeting is a clean
            // h2 line — "Good evening, Paval" — with a small
            // watercolor illustration on the right. The image
            // tracks the time of day (sun / coffee / moon /
            // stars) and is the page's first visual hint of
            // // "this is a friendly, illustrated app" — not text.
            return (
              <View style={styles.welcomeSection}>
                <View style={styles.welcomeRow}>
                  <AppText
                    variant="h2"
                    color="primary"
                    style={styles.greetingMain}>
                    {greeting.text}, Paval
                  </AppText>
                  <FastImage
                    source={GREETING_IMAGES[greeting.image]}
                    style={styles.greetingImage}
                    resizeMode={FastImage.resizeMode.contain}
                    accessibilityIgnoresInvertColors
                  />
                </View>
              </View>
            );
        case 'HERO':
          return item.data ? <FeaturedHeroBanner item={item.data} onPress={handleItemPress} /> : null;
        case 'SUBSECTION_TITLE':
          return <SubsectionTitle label={item.label} />;
        case 'SHELF':
          // P56: per the user's spec, only Recently Played, Bookmarks,
          // and Followed Podcasts get the chevron — and only the latter
          // two can actually collapse. Recently Played is the SHELF
          // we render here and it's `forceExpanded`; no chevron. The
          // other two are handled in their dedicated cases below.
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
            />
          );
        case 'PREFILLED_PODCASTS':
          return (
            <PodcastCategoriesShelf
              onCategoryPress={handlePodcastCategoryPress}
            />
          );
        case 'FOLLOWED_PODCASTS':
          return (
            <FollowedPodcastsShelf
              items={item.items}
              onPodcastPress={handleFollowedPodcastPress}
              onSeeAll={handleFollowedPodcastsSeeAll}
            />
          );
        case 'PREFILLED_MUSIC':
          return (
            <MusicCategoriesShelf
              onCategoryPress={handleMusicCategoryPress}
            />
          );
        case 'RADIO':
          return (
            <RadioCategoriesShelf
              onCategoryPress={handleRadioCategoryPress}
            />
          );
        case 'LIVE_TV':
          return (
            <LiveTVCategoriesShelf
              onCategoryPress={handleLiveTVCategoryPress}
            />
          );
        case 'AUDIOBOOKS':
          return (
            <AudiobooksShelf
              onCategoryPress={handleAudiobookCategoryPress}
            />
          );
        case 'ARCHIVE':
          return (
            <ArchiveShelf
              onCategoryPress={handleArchiveCategoryPress}
            />
          );
        case 'SHOWS':
          return (
            <ShowsShelf
              onCategoryPress={handleShowsCategoryPress}
            />
          );
        case 'BOOKMARKS':
          return (
            <HomeBookmarksList
              items={item.items}
              onPress={bookmark => handleItemPress({...bookmark, startPosition: bookmark.position})}
              onRemove={id => dispatch(removeBookmark(id))}
              onSeeAll={handleBookmarksSeeAll}
            />
          );
          default:
            return null;
        }
      })();
      // P57: the staggered entrance animation got stuck on iOS once
      // the section count grew past ~10. With `removeClippedSubviews`
      // on the parent FlatList, an `Animated.View` starting at
      // `opacity: 0` was being clipped from the native hierarchy
      // and never came back when the animation tried to reveal it —
      // leaving the page showing only the GREETING. We just render
      // the section content directly; the warm parchment background
      // and the section structure are doing the visual work now.
      return sectionContent;
    },
    [dispatch, greeting, handleItemPress, handlePlaylistPress, handleGenrePress, handleMovieCategoryPress, handleSeeAll, handlePodcastCategoryPress, handleFollowedPodcastPress, handleFollowedPodcastsSeeAll, handleMusicCategoryPress, handleRadioCategoryPress, handleLiveTVCategoryPress, handleAudiobookCategoryPress, handleArchiveCategoryPress, handleShowsCategoryPress, handlePlaylistsSeeAll],
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
          avatarUrl={user?.photo ?? null}
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
          avatarUrl={user?.photo ?? null}
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
        avatarUrl={user?.photo ?? null}
      />

      <FlatList
        data={sections}
        renderItem={renderSection}
        keyExtractor={(item, index) =>
          item.type === 'SHELF' ? `SHELF:${item.title}` :
          item.type === 'SUBSECTION_TITLE' ? `SUBSECTION:${item.label}` :
          `${item.type}:${index}`
        }
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
    // P60: greeting row (text + illustration) sits flush with the
    // page gutter. The illustration is a visual hint, not a
    // second focal point — it lives to the right of the text,
    // vertically centered, and the page hero (HERO section)
    // below it is still the dominant element.
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingMain: {
    // h2 is 24 / 700 / lineHeight 32 in the token set. flex: 1
    // so the text takes the available space and the image sits
    // flush right. No font tweaks — the greeting is a friendly
    // open, not a hero.
    fontWeight: '700',
    flex: 1,
    paddingRight: spacing.md,
  },
  greetingImage: {
    width: 48,
    height: 48,
  },
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
