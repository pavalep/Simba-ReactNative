import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../theme';
import {SimbaStatusBar} from '../../components/StatusBar';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {AppText} from '../../components/core/AppText/AppText';
import {EmptyState} from '../../components/feedback/EmptyState/EmptyState';
import {useAppSelector} from '../../store';
import {useSearch} from '../../hooks/useSearch';
import type {RootStackScreenProps} from '../../navigation/types';
import {spacing} from '../../theme/tokens';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {isVideoFile} from '../../utils/timeAgo';

import {SearchBar} from './components/SearchBar';
import {RecentSearches} from './components/RecentSearches';
import {FilterAndSortControls} from './components/FilterAndSortControls';
import {SearchResults} from './components/SearchResults';

type SearchScreenProps = RootStackScreenProps<'Search'>;
type Props = SearchScreenProps;

const GRID_COLUMNS = 2;
const GRID_GAP = 12;

type FilterMode = 'all' | 'videos' | 'audio';
type SortMode = 'relevance' | 'date' | 'name';

export const SearchScreen: React.FC<Props> = ({navigation}) => {
  const {theme, colors, spacing: s} = useTheme();
  const isDark = theme === 'dark';
  const {width: screenWidth} = useWindowDimensions();

  const recentFiles = useAppSelector(state => state.session.recentFiles);
  const playlist = useAppSelector(state => state.player.playlist);
  const videoFolders = useAppSelector(state => state.settings.videoFolders);
  const audioFolders = useAppSelector(state => state.settings.audioFolders);

  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterMode>('all');
  const [activeSort, setActiveSort] = useState<SortMode>('relevance');

  const {
    searchText,
    setSearchText,
    debouncedQuery,
    allResults,
    isSearching,
  } = useSearch(recentFiles, playlist, videoFolders, audioFolders);

  const tileWidth = Math.floor(
    (screenWidth - 20 * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
  );

  // ── Filter & sort ──
  const filteredResults = useMemo(() => {
    let results = allResults;
    if (activeFilter === 'videos') {
      results = results.filter(
        r => r.group === 'videos' || r.group === 'recent',
      );
    } else if (activeFilter === 'audio') {
      results = results.filter(r => r.group === 'audio');
    }
    const sorted = [...results];
    switch (activeSort) {
      case 'relevance':
        sorted.sort((a, b) => b.relevanceScore - a.relevanceScore);
        break;
      case 'date':
        sorted.sort((a, b) => {
          const aTime = a.lastPlayedAt ? new Date(a.lastPlayedAt).getTime() : 0;
          const bTime = b.lastPlayedAt ? new Date(b.lastPlayedAt).getTime() : 0;
          return bTime - aTime;
        });
        break;
      case 'name':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
    return sorted;
  }, [allResults, activeFilter, activeSort]);

  // ── Group results for display ──
  const groupedResults = useMemo(() => {
    const groups: {key: string; label: string; items: any[]}[] = [];
    const recent = filteredResults.filter(r => r.group === 'recent');
    const videos = filteredResults.filter(r => r.group === 'videos');
    const audio = filteredResults.filter(r => r.group === 'audio');
    const artistsGroup = filteredResults.filter(r => r.group === 'artists');
    const albumsGroup = filteredResults.filter(r => r.group === 'albums');
    const playlistsGroup = filteredResults.filter(r => r.group === 'playlists');
    const folders = filteredResults.filter(r => r.group === 'folders');
    if (recent.length > 0) groups.push({key: 'recent', label: 'Recent', items: recent});
    if (artistsGroup.length > 0) groups.push({key: 'artists', label: 'Artists', items: artistsGroup});
    if (albumsGroup.length > 0) groups.push({key: 'albums', label: 'Albums', items: albumsGroup});
    if (playlistsGroup.length > 0) groups.push({key: 'playlists', label: 'Playlists', items: playlistsGroup});
    if (videos.length > 0) groups.push({key: 'videos', label: 'Videos', items: videos});
    if (audio.length > 0) groups.push({key: 'audio', label: 'Audio', items: audio});
    if (folders.length > 0) groups.push({key: 'folders', label: 'Folders', items: folders});
    return groups;
  }, [filteredResults]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {flex: 1},
        scroll: {flex: 1},
        scrollContent: {
          paddingHorizontal: 20,
          paddingTop: Platform.OS === 'android' ? 16 : 0,
          paddingBottom: 32,
        },
        glowWarm: {
          position: 'absolute',
          top: -120,
          left: -80,
          width: 280,
          height: 280,
          borderRadius: 140,
        },
        centerContainer: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.lg,
          minHeight: 200,
        },
        retryButton: {
          marginTop: spacing.md,
          paddingVertical: 10,
          paddingHorizontal: 24,
          borderRadius: 10,
          backgroundColor: colors.accent.goldDim,
        },
      }),
    [colors],
  );

  // ── Handlers ──
  const handleClearSearch = useCallback(() => setSearchText(''), [setSearchText]);
  const handleChipTap = useCallback((term: string) => setSearchText(term), [setSearchText]);
  const handleClearRecent = useCallback(() => setRecentSearches([]), []);
  const handlePlayFile = useCallback(
    (fileUri: string, fileTitle: string) => {
      navigation.navigate(
        isVideoFile(fileTitle) ? 'VideoPlayer' : 'AudioPlayer',
        {fileUri, fileTitle},
      );
    },
    [navigation],
  );
  const handleRetry = useCallback(() => setError(null), []);
  const handleSubmitSearch = useCallback(() => {
    const trimmed = searchText.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(t => t !== trimmed);
      return [trimmed, ...filtered].slice(0, 10);
    });
  }, [searchText]);

  const hasResults = groupedResults.length > 0;
  const showRecentSection = searchText.length === 0;
  const showResultsSection = searchText.length > 0;

  return (
    <SafeAreaView style={styles.root}>
      <SimbaStatusBar variant="home" />
      <LinearGradient
        colors={
          isDark
            ? [colors.background.primary, colors.background.elevated]
            : [colors.background.elevated, colors.background.primary]
        }
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.glowWarm,
          {
            backgroundColor: colors.accent.gold,
            opacity: isDark ? 0.22 : 0.12,
          },
        ]}
        pointerEvents="none"
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <InternalHeader title="Search" />

        <SearchBar
          searchText={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSubmitSearch}
          onClear={handleClearSearch}
        />

        {showRecentSection && (
          <RecentSearches
            recentSearches={recentSearches}
            onChipTap={handleChipTap}
            onClearRecent={handleClearRecent}
          />
        )}

        {showResultsSection && (
          <FilterAndSortControls
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            activeSort={activeSort}
            onSortChange={setActiveSort}
          />
        )}

        {/* ── Loading ── */}
        {showResultsSection && isSearching && (
          <View style={styles.centerContainer}>
            <ActivityOrb size={48} />
          </View>
        )}

        {/* ── Error ── */}
        {showResultsSection && error && !isSearching && (
          <View style={styles.centerContainer}>
            <AppText
              variant="body1"
              color="error"
              style={{textAlign: 'center', marginBottom: spacing.sm}}>
              {error}
            </AppText>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              activeOpacity={0.7}>
              <AppText variant="button" color="accent">
                Retry
              </AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* ── No Results ── */}
        {showResultsSection && !isSearching && !error && !hasResults && (
          <View style={{marginTop: s.lg}}>
            <EmptyState
              icon="music"
              title="No results found"
              description={`No media matches "${debouncedQuery}"`}
            />
          </View>
        )}

        {/* ── Grouped Results ── */}
        {showResultsSection && !isSearching && !error && hasResults && (
          <SearchResults
            groups={groupedResults}
            debouncedQuery={debouncedQuery}
            tileWidth={tileWidth}
            onPlayFile={handlePlayFile}
            onNavigate={(route, params) =>
              (navigation.navigate as any)(route, params)
            }
          />
        )}

        <View style={{height: spacing.xxxl}} />
      </ScrollView>
    </SafeAreaView>
  );
};
