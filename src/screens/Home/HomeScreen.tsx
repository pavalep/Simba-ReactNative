import React, {useCallback} from 'react';
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
import {MusicCategoriesShelf} from './components/MusicCategoriesShelf';
import {GenreChipsShelf} from './components/GenreChipsShelf';
import {useAnimatedEntrance} from '../../hooks/useAnimatedEntrance';

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

  const handleMusicCategoryPress = useCallback(
    (genre: string) => {
      navigation.navigate('MusicScreen', {genre});
    },
    [navigation],
  );

  const handleMusicSeeAll = useCallback(() => {
    navigation.navigate('MusicScreen', {});
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
          return <QuickAccessShelf title="Pinned Playlists" playlists={item.items} onPlaylistPress={handlePlaylistPress} />;
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
        case 'PREFILLED_MUSIC':
          return (
            <MusicCategoriesShelf
              onCategoryPress={handleMusicCategoryPress}
              onSeeAll={handleMusicSeeAll}
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
    [dispatch, greeting, handleItemPress, handlePlaylistPress, handleGenrePress, handleMovieCategoryPress, handleMovieSeeAll, handleSeeAll, handlePodcastCategoryPress, handlePodcastSeeAll, handleMusicCategoryPress, handleMusicSeeAll, entrance.styles],
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
