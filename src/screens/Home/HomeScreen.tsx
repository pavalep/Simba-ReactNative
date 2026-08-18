import React, {useCallback, useEffect} from 'react';
import {View, FlatList, RefreshControl, StyleSheet, TouchableOpacity} from 'react-native';
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
import {SubsectionTitle} from '../../components/utility/SubsectionTitle/SubsectionTitle';
import {WeatherGreeting} from './components/WeatherGreeting';
import {HomeBookmarksList} from './components/HomeBookmarksList';
import {FollowedPodcastsShelf} from './components/FollowedPodcastsShelf';
import {GenreChipsShelf} from './components/GenreChipsShelf';
// v10.2: Discover is one "Browse All" rail — the 8 per-category shelves
// (MovieCategoriesShelf, PodcastCategoriesShelf, MusicCategoriesShelf,
// RadioCategoriesShelf, LiveTVCategoriesShelf, AudiobooksShelf,
// ArchiveShelf, ShowsShelf) were removed with their handlers.
import {BrowseAllShelf} from './components/BrowseAllShelf';
// v10.3: placeholder rails for not-yet-built Home sub-sections
// (Playlists module polish + AI-curated recommendations). These
// render as "Coming soon" shelves with dummy data and will be
// dropped in-place with real loaders once the underlying
// modules land.
import {ComingSoonShelf} from './components/ComingSoonShelf';
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
    userFirstName,
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

  // v10.2: the per-category press handlers for Movies / Podcasts / Music /
  // Radio / Live TV / Audiobooks / Archive / Shows were removed together
  // with their shelves — Discover now navigates via handleSeeAll.

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
            // P61: greeting block extracted to its own component
            // (WeatherGreeting). Owns its styles and the Lottie
            // container — easier to iterate on without touching
            // the rest of the page.
            return (
              <WeatherGreeting
                text={greeting.text}
                firstName={userFirstName}
                condition={greeting.condition}
                weather={greeting.weather}
                isFetching={greeting.isFirstLoad}
              />
            );
        case 'HERO':
          return item.data ? <FeaturedHeroBanner item={item.data} onPress={handleItemPress} /> : null;
        case 'SUBSECTION_TITLE':
          return <SubsectionTitle label={item.label} variant={item.variant} />;
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
        case 'BROWSE_ALL':
          // v10.2: one rail, one card per top-level section.
          return <BrowseAllShelf onSectionPress={handleSeeAll} />;
        case 'COMING_SOON':
          // v10.3: placeholder shelf for not-yet-built sections
          // (Playlists, AI-Curated). Renders dummy "Coming soon"
          // cards now; will be swapped for real loaders later.
          return <ComingSoonShelf reason={item.reason} />;
        case 'FOLLOWED_PODCASTS':
          return (
            <FollowedPodcastsShelf
              items={item.items}
              onPodcastPress={handleFollowedPodcastPress}
              onSeeAll={handleFollowedPodcastsSeeAll}
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
    [dispatch, greeting, userFirstName, handleItemPress, handlePlaylistPress, handleGenrePress, handleSeeAll, handleFollowedPodcastPress, handleFollowedPodcastsSeeAll, handlePlaylistsSeeAll],
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
  // P61: greeting block lives in components/WeatherGreeting/ now —
  // its styles are owned there. Nothing left in this StyleSheet for
  // the greeting (welcomeSection/welcomeRow/greetingMain/etc all
  // removed when the component was extracted).
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
