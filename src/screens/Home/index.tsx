import React, {useCallback, useEffect} from 'react';
import {View, FlatList} from 'react-native';
import {homeScreenStyles as styles} from './styles/HomeScreen.styles';
import {spacing} from '../../theme/tokens';
import {type HomeScreenProps} from '../../navigation/types';
import {useHomeScreen} from './hooks/useHomeScreen';
import type {HomeSection} from './types';
import {getHomeSectionKey} from './related/homeSectionKey';

// ── Components ──
import {SimbaStatusBar} from '../../components/StatusBar';
import {HomeHeader} from '../../components/layout/HomeHeader/HomeHeader';
import {HomeMediaShelf} from './components/HomeMediaShelf';
import {SubsectionTitle} from '../../components/utility/SubsectionTitle/SubsectionTitle';
import {WeatherGreeting} from './components/WeatherGreeting';
import {HomeBookmarksList} from './components/HomeBookmarksList';
import {FollowedPodcastsShelf} from './components/FollowedPodcastsShelf';
import {QuickAccessShelf} from './components/QuickAccessShelf';
// v10.2: Discover is one "Browse All" rail — the 8 per-category shelves
// (MovieCategoriesShelf, PodcastCategoriesShelf, MusicCategoriesShelf,
// RadioCategoriesShelf, LiveTVCategoriesShelf, AudiobooksShelf,
// ArchiveShelf, ShowsShelf) were removed with their handlers.
import {BrowseAllShelf} from './components/BrowseAllShelf';
import {Fab, FAB_SIZE} from '../../components/core/Fab/Fab';
import {useBottomChromeInset} from '../../infrastructure/player/miniPlayerChrome';
import {mark, logStartupSummary} from '../../utils/startupPerf';

// ── Screen ──

export const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
  // The app's ONE bottom-chrome rule: the safe area, or the mini-player
  // dock if one is up, plus a spacing step.
  const bottomChromeInset = useBottomChromeInset();
  const {
    colors,
    insets,
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
    handleTogglePin,
    handleSeeAll,
    handleSearchPress,
    handleAvatarPress,
    handleBookmarksSeeAll,
  } = useHomeScreen(navigation);

  // 59.3: cold-start milestone — initial screen mounted → log the summary
  useEffect(() => {
    mark('first-screen');
    logStartupSummary();
  }, []);

  // 35.5: followed podcast card → podcast detail
  const handleFollowedPodcastPress = useCallback(
    (item: {id: number; title: string}) => {
      navigation.navigate('PodcastDetail', {podcastId: item.id});
    },
    [navigation],
  );

  // 35.5: per-user rail — the "See All" link goes to the page that owns
  // the user's full followed list.
  //
  // It used to point at `PodcastsScreen`, which is the CATALOGUE — a
  // category filter and a search box over the Podcast Index. It does not
  // list the podcasts the user follows, so the link answered a question
  // the page could not answer. `FollowedPodcasts` is the page that can.
  const handleFollowedPodcastsSeeAll = useCallback(() => {
    navigation.navigate('FollowedPodcasts');
  }, [navigation]);

  // P41.5: the Playlists rail's "VIEW ALL" link — kept on the per-user
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
            //
            // V2: it is NOT in a box. The salutation, the name and one
            // quiet weather line sit directly on the page, and the
            // weather chip moves to the top right.
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
            // P56: the Recently Played rail is always expanded and
            // carries no chevron. Bookmarks and Followed Podcasts live
            // in their own cases below.
            return (
              <HomeMediaShelf
                title={item.title}
                items={item.items}
                onItemPress={handleItemPress}
                onItemLongPress={handleRemoveRecent}
                onSeeAll={item.seeAllRoute ? () => handleSeeAll(item.seeAllRoute!) : undefined}
              />
            );
          case 'PINNED_PLAYLISTS':
            // Spec §4.6 + the decision of 2026-11-05: the rail is titled
            // "Pinned Playlists" and holds ONLY the pinned playlists, so
            // the title is true of every tile in it. The unpinned ones live
            // behind "See All" → All Playlists, the page that owns them.
            //
            // The rail is NOT drawn when nothing is pinned: a rail with
            // nothing in it is not drawn at all, and the divider above it
            // goes with it.
            return (
              <QuickAccessShelf
                title="Pinned Playlists"
                playlists={item.items}
                onPlaylistPress={handlePlaylistPress}
                onTogglePin={handleTogglePin}
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
    //
    // V2: the list now also names `greeting`, `userFirstName` and
    // `handleBookmarksSeeAll` — the three the body reads and the array
    // did NOT name. A stale greeting is a wrong time-of-day on screen.
    [
      sections,
      greeting,
      userFirstName,
      handleItemPress,
      handleRemoveRecent,
      handleRemoveBookmark,
      handlePlaylistPress,
      handleTogglePin,
      handleSeeAll,
      handleFollowedPodcastPress,
      handleFollowedPodcastsSeeAll,
      handlePlaylistsSeeAll,
      handleBookmarksSeeAll,
    ],
  );

  return (
    <View style={[styles.root, {backgroundColor: colors.background.primary, paddingTop: insets.top}]}>
      <SimbaStatusBar variant="home" />
      <HomeHeader
        isScanning={isScanning}
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
            // `bottomChromeInset` is the app's ONE bottom-chrome rule
            // (see `infrastructure/player/miniPlayerChrome`): the safe
            // area, or the mini-player dock if one is up, plus a spacing
            // step. The FAB's own height goes on top so the last row
            // clears the BUTTON.
            paddingBottom: bottomChromeInset + FAB_SIZE + spacing.md,
          },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        updateCellsBatchingPeriod={50}
        windowSize={5}
        // NO pull-to-refresh.
        //
        // There used to be one, and it waited 600 ms and did nothing:
        // the spinner resolved to an identical page.
        //
        // It cannot be anything else now. Every rail on this page is
        // fed by a persisted store that is live and updates on its own,
        // and the ONE remote datum — the weather — has its own hour-
        // long TTL. The media SCAN used to be the thing a refresh could
        // re-read, but since the genre shelf was deleted nothing on
        // this page is fed by the scan at all.
        //
        // The scan's own door is the Library, where the scan's results
        // are what you can see.
      />

      <Fab
        icon="play"
        onPress={handleOpenMedia}
        accessibilityLabel="Play media file"
      />
    </View>
  );
};

export default HomeScreen;
