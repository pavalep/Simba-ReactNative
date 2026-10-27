import React, {useCallback, useEffect} from 'react';
import {View, FlatList, RefreshControl} from 'react-native';
import {
  homeScreenStyles as styles,
  HOME_FAB_SIZE,
} from './styles/HomeScreen.styles';
import {spacing} from '../../theme/tokens';
import {type HomeScreenProps} from '../../navigation/types';
import {useHomeScreen} from './hooks/useHomeScreen';
import type {HomeSection} from './types';
import {getHomeSectionKey} from './related/homeSectionKey';

// ── Components ──
import {SimbaStatusBar} from '../../components/StatusBar';
import {HomeHeader} from '../../components/layout/HomeHeader/HomeHeader';
import {HomeMediaShelf} from './components/HomeMediaShelf';
import {QuickAccessShelf} from './components/QuickAccessShelf';
import {HomeLoadingSkeleton} from './components/HomeLoadingSkeleton';
import {HomeErrorState} from './components/HomeErrorState';

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
import {HomeFab} from './components/HomeFab';
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
    handleRemoveRecent,
    handleRemoveBookmark,
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
              onItemLongPress={handleRemoveRecent}
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
              onPress={handleItemPress}
              onRemove={handleRemoveBookmark}
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
    // W9.5: this array started with a HOLE (`, greeting`), omitted
    // `sections` — the very thing the memo body iterates — and ended
    // with a string literal instead of a handler. `react-hooks` cannot
    // check a malformed array, so nothing flagged it and every handler
    // added since would have closed over a stale reference. Rebuilt
    // from the identifiers the body actually reads.
    [
      sections,
      handleItemPress,
      handleRemoveRecent,
      handleRemoveBookmark,
      handlePlaylistPress,
      handleGenrePress,
      handleSeeAll,
      handleFollowedPodcastPress,
      handleFollowedPodcastsSeeAll,
      handlePlaylistsSeeAll,
    ],
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
        keyExtractor={getHomeSectionKey}
        contentContainerStyle={[
          styles.scrollContent,
          {
            // The padding has to reach the FAB's TOP edge — one
            // spacing step above the safe area, plus the button's own
            // 56 dp — or the last section stops UNDER the button
            // instead of above it.
            //
            // The number used to be `insets.bottom + 100 + 56`. The
            // `100` was the clearance for the floating bottom tab bar
            // the app used to have (60 dp plus a 10 dp margin); that
            // bar was deleted in v11 Wave 1 and the offset was never
            // revised. The app's other five FAB screens (Movies, Music,
            // Podcasts, Radio, Live TV) have always used this shape.
            paddingBottom: insets.bottom + spacing.lg + HOME_FAB_SIZE + spacing.md,
          },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        updateCellsBatchingPeriod={50}
        windowSize={5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.gold}
            colors={[colors.accent.gold]}
          />
        }
      />

      <HomeFab onPress={handleOpenMedia} />
    </View>
  );
};

export default HomeScreen;


