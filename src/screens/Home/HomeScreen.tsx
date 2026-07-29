import React, {useCallback} from 'react';
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
import {NoNetworkBanner} from './components/NoNetworkBanner';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {AppText} from '../../components/core/AppText/AppText';
import {HomeBookmarksList} from './components/HomeBookmarksList';

// ── Screen ──

export const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
  const {
    colors,
    insets,
    refreshing,
    isSettled,
    hasError,
    isOnline,
    isScanning,
    sections,
    greeting,
    dispatch,
    handleOpenMedia,
    handleItemPress,
    handlePlaylistPress,
    handleSettingsPress,
    handleSearchPress,
    onRefresh,
    setHasError,
  } = useHomeScreen(navigation);

  // ── Render Item ──
  const renderSection = useCallback(
    ({item}: {item: HomeSection}) => {
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
          return <HomeMediaShelf title={item.title} items={item.items} onItemPress={handleItemPress} />;
        case 'PLAYLISTS':
          return <QuickAccessShelf title="Pinned Playlists" playlists={item.items} onPlaylistPress={handlePlaylistPress} />;
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
    },
    [dispatch, greeting, handleItemPress, handlePlaylistPress],
  );

  if (hasError) {
    return (
      <View style={[styles.root, {backgroundColor: colors.background.primary, paddingTop: insets.top}]}>
        <SimbaStatusBar variant="home" />
        <HomeHeader isScanning={isScanning} onSettingsPress={handleSettingsPress} onSearchPress={handleSearchPress} />
        <HomeErrorState onRetry={() => setHasError(false)} colors={colors} />
      </View>
    );
  }

  if (!isSettled && sections.length <= 2) {
    return (
      <View style={[styles.root, {backgroundColor: colors.background.primary, paddingTop: insets.top}]}>
        <SimbaStatusBar variant="home" />
        <HomeHeader isScanning={isScanning} onSettingsPress={handleSettingsPress} onSearchPress={handleSearchPress} />
        <HomeLoadingSkeleton colors={colors} />
      </View>
    );
  }

  return (
    <View style={[styles.root, {backgroundColor: colors.background.primary, paddingTop: insets.top}]}>
      <SimbaStatusBar variant="home" />
      <HomeHeader isScanning={isScanning} onSettingsPress={handleSettingsPress} onSearchPress={handleSearchPress} />

      <NoNetworkBanner isVisible={!isOnline} colors={colors} />

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
      />

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleOpenMedia}
        style={[styles.fab, {backgroundColor: colors.accent.gold, bottom: insets.bottom + 100}]}>
        <SvgIcon name="play" size={24} color="#000" />
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
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.3,
    shadowRadius: 4.5,
    zIndex: 99,
  },
});
