import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  useWindowDimensions,
  Platform,
  FlatList,
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

import {SearchBar} from '../../components/core/SearchBar/SearchBar';
import {RecentSearches} from './components/RecentSearches';
import {FilterAndSortControls} from './components/FilterAndSortControls';
import {SearchResults} from './components/SearchResults';
// ── P40: unified search (aggregator + source chips + history + trending) ──
import {useAggregatedSearch} from './hooks/useAggregatedSearch';
import {
  SourceFilterChips,
  type SearchSource,
} from './components/SourceFilterChips';
import {
  RemoteResults,
  type RemoteResultsHandlers,
} from './components/RemoteResults';
import {StreamingRow} from '../../components/media/StreamingRow/StreamingRow';
import {
  getRecentSearches,
  saveRecentSearches,
} from '../../services/recentSearchService';
import type {
  AudiobookResult,
  AudiusTrackResult,
  InternetArchiveItemResult,
  IPTVChannelResult,
  JamendoTrackResult,
} from '../../types/api';

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
  // P40.2: source filter chips (All/Local/Music/Podcasts/Radio/TV/…)
  const [activeSource, setActiveSource] = useState<SearchSource>('all');
  const recentLoadedRef = useRef(false);

  // P40.4: persisted search history (re-run, clear)
  useEffect(() => {
    getRecentSearches().then(list => {
      recentLoadedRef.current = true;
      setRecentSearches(list);
    });
  }, []);

  useEffect(() => {
    if (!recentLoadedRef.current) return;
    saveRecentSearches(recentSearches);
  }, [recentSearches]);

  const {
    searchText,
    setSearchText,
    debouncedQuery,
    allResults,
    isSearching,
  } = useSearch(recentFiles, playlist, videoFolders, audioFolders);

  // P40.1: remote sources via searchAggregator (debounced + cancelled)
  const {
    results: remoteResults,
    isLoading: remoteLoading,
    trending,
  } = useAggregatedSearch(debouncedQuery);

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

  // ── Source visibility (P40.2) ──
  const hasLocalResults = groupedResults.length > 0;
  const showLocalResults = activeSource === 'all' || activeSource === 'local';

  const remoteVisibleCount = useMemo(() => {
    if (activeSource === 'local') return 0;
    if (activeSource === 'all') {
      return (
        remoteResults.jamendoTracks.length +
        remoteResults.audiusTracks.length +
        remoteResults.podcasts.length +
        remoteResults.radioStations.length +
        remoteResults.iptvChannels.length +
        remoteResults.audiobooks.length +
        remoteResults.internetArchiveItems.length
      );
    }
    switch (activeSource) {
      case 'music':
        return (
          remoteResults.jamendoTracks.length +
          remoteResults.audiusTracks.length
        );
      case 'podcasts':
        return remoteResults.podcasts.length;
      case 'radio':
        return remoteResults.radioStations.length;
      case 'tv':
        return remoteResults.iptvChannels.length;
      case 'audiobooks':
        return remoteResults.audiobooks.length;
      case 'archive':
        return remoteResults.internetArchiveItems.length;
      default:
        return 0;
    }
  }, [remoteResults, activeSource]);

  const hasAnyResults = hasLocalResults || remoteVisibleCount > 0;

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
        trendingSection: {
          paddingTop: spacing.lg,
        },
        trendingTitle: {
          fontWeight: '700',
          marginBottom: spacing.sm,
          paddingHorizontal: spacing.md,
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

  // ── P40.5: remote rows route to their correct destination ──
  const handlePlayTrack = useCallback(
    (track: JamendoTrackResult) => {
      navigation.navigate('AudioPlayer', {
        fileUri: track.audioUrl,
        fileTitle: track.name,
        artworkUri: track.imageUrl || undefined,
        source: 'jamendo',
      });
    },
    [navigation],
  );

  const handlePlayAudius = useCallback(
    (track: AudiusTrackResult) => {
      navigation.navigate('AudioPlayer', {
        fileUri: track.streamUrl,
        fileTitle: track.title,
        artworkUri: track.artworkUrl || undefined,
        source: 'audius',
      });
    },
    [navigation],
  );

  const handleOpenAudiobook = useCallback(
    (book: AudiobookResult) => {
      navigation.navigate('AudiobookDetail', {
        bookId: book.id,
        bookTitle: book.title,
      });
    },
    [navigation],
  );

  const handleOpenArchive = useCallback(
    (item: InternetArchiveItemResult) => {
      navigation.navigate('ArchiveItemDetail', {
        identifier: item.identifier,
        title: item.title,
      });
    },
    [navigation],
  );

  const handleOpenChannel = useCallback(
    (channel: IPTVChannelResult) => {
      navigation.navigate('VideoPlayer', {
        fileUri: channel.url,
        fileTitle: channel.name,
        source: 'iptv',
      });
    },
    [navigation],
  );

  const remoteHandlers: RemoteResultsHandlers = {
    onPlayTrack: handlePlayTrack,
    onPlayAudius: handlePlayAudius,
    onOpenAudiobook: handleOpenAudiobook,
    onOpenArchive: handleOpenArchive,
    onOpenChannel: handleOpenChannel,
  };

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
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSubmitSearch}
          onClear={handleClearSearch}
          autoFocus
          style={{marginBottom: 16}}
        />

        {showRecentSection && (
          <RecentSearches
            recentSearches={recentSearches}
            onChipTap={handleChipTap}
            onClearRecent={handleClearRecent}
          />
        )}

        {/* P40.7: trending from real API data when the query is empty */}
        {showRecentSection && trending.length > 0 && (
          <View style={styles.trendingSection}>
            <AppText variant="h3" color="primary" style={styles.trendingTitle}>
              Trending Now
            </AppText>
            {/* 59.1: virtualized instead of .map */}
            <FlatList
              data={trending}
              keyExtractor={t => String(t.id)}
              renderItem={({item: t}) => (
                <StreamingRow track={t} onPlay={handlePlayTrack} />
              )}
              scrollEnabled={false}
              initialNumToRender={trending.length}
            />
          </View>
        )}

        {/* P40.2: source filter chips */}
        {showResultsSection && (
          <SourceFilterChips
            active={activeSource}
            onChange={setActiveSource}
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
              activeOpacity={0.7}
              accessibilityRole="button">
              <AppText variant="button" color="accent">
                Retry
              </AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* ── No Results ── */}
        {showResultsSection &&
          !isSearching &&
          !remoteLoading &&
          !error &&
          !hasAnyResults && (
            <View style={{marginTop: s.lg}}>
              <EmptyState
                icon="music"
                title="No results found"
                description={`No media matches "${debouncedQuery}"`}
              />
            </View>
          )}

        {/* ── Local Grouped Results ── */}
        {showResultsSection &&
          !isSearching &&
          !error &&
          showLocalResults &&
          hasLocalResults && (
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

        {/* ── P40.1/40.6: Remote Results (per-source sections) ── */}
        {showResultsSection && activeSource !== 'local' && (
          <RemoteResults
            results={remoteResults}
            isLoading={remoteLoading}
            source={activeSource}
            handlers={remoteHandlers}
          />
        )}

        <View style={{height: spacing.xxxl}} />
      </ScrollView>
    </SafeAreaView>
  );
};
