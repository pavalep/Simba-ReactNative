import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  Image,
  TextInput,
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

import {AppText} from '../../components/core/AppText/AppText';
import {SectionHeader} from '../../components/utility/SectionHeader/SectionHeader';
import {EmptyState} from '../../components/feedback/EmptyState/EmptyState';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {useAppSelector} from '../../store';
import {SearchScreenProps} from '../../navigation/types';
import {radius, spacing} from '../../theme/tokens';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';

type Props = SearchScreenProps;

const GRID_COLUMNS = 2;
const GRID_GAP = 12;

type FilterMode = 'all' | 'videos' | 'audio';
type SortMode = 'relevance' | 'date' | 'name';

/** Shape shared by all search result items for rendering in the grid. */
interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
  /** Used for grouping sections */
  group: 'recent' | 'videos' | 'audio';
  fileUri?: string;
  thumbnailPath?: string;
  position?: number;
  duration?: number;
  lastPlayedAt?: string;
  /** Score for relevance sorting */
  relevanceScore: number;
}

/** Extract last segment of a URI/path for display */
const displayNameFromPath = (path: string): string => {
  const segments = path.replace(/\/$/, '').split('/');
  return segments[segments.length - 1] || path;
};

export const SearchScreen: React.FC<Props> = ({navigation}) => {
  const {theme, colors, spacing: s} = useTheme();
  const isDark = theme === 'dark';
  const {width: screenWidth} = useWindowDimensions();

  const recentFiles = useAppSelector(state => state.session.recentFiles);
  const playlist = useAppSelector(state => state.player.playlist);
  const videoFolders = useAppSelector(state => state.settings.videoFolders);
  const audioFolders = useAppSelector(state => state.settings.audioFolders);

  const [searchText, setSearchText] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterMode>('all');
  const [activeSort, setActiveSort] = useState<SortMode>('relevance');

  const tileWidth = Math.floor(
    (screenWidth - 20 * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
  );

  const FILTERS: {key: FilterMode; label: string}[] = [
    {key: 'all', label: 'All'},
    {key: 'videos', label: 'Videos'},
    {key: 'audio', label: 'Audio'},
  ];

  const SORTS: {key: SortMode; label: string}[] = [
    {key: 'relevance', label: 'Relevance'},
    {key: 'date', label: 'Date'},
    {key: 'name', label: 'Name'},
  ];

  // ── Search across all sources ──
  const allResults = useMemo((): SearchResultItem[] => {
    const query = searchText.trim().toLowerCase();
    if (!query) return [];

    const items: SearchResultItem[] = [];

    // 1. Recent files
    recentFiles.forEach(entry => {
      if (entry.title.toLowerCase().includes(query)) {
        items.push({
          id: `recent-${entry.fileUri}`,
          title: entry.title,
          group: 'recent',
          fileUri: entry.fileUri,
          thumbnailPath: entry.thumbnailPath,
          position: entry.position,
          duration: entry.duration,
          lastPlayedAt: entry.lastPlayedAt,
          relevanceScore: entry.title.toLowerCase().indexOf(query) === 0 ? 100 : 50,
        });
      }
    });

    // 2. Playlist entries
    playlist.forEach(entry => {
      if (entry.title.toLowerCase().includes(query)) {
        const isAudio = entry.uri.match(/\.(mp3|flac|wav|aac|ogg|wma|m4a)$/i);
        items.push({
          id: `playlist-${entry.uri}`,
          title: entry.title,
          group: isAudio ? 'audio' : 'videos',
          fileUri: entry.uri,
          duration: entry.duration,
          relevanceScore: entry.title.toLowerCase().indexOf(query) === 0 ? 90 : 45,
        });
      }
    });

    // 3. Linked folder paths
    videoFolders.forEach(folder => {
      const name = displayNameFromPath(folder);
      if (name.toLowerCase().includes(query)) {
        items.push({
          id: `video-folder-${folder}`,
          title: name,
          subtitle: folder,
          group: 'videos',
          relevanceScore: 30,
        });
      }
    });
    audioFolders.forEach(folder => {
      const name = displayNameFromPath(folder);
      if (name.toLowerCase().includes(query)) {
        items.push({
          id: `audio-folder-${folder}`,
          title: name,
          subtitle: folder,
          group: 'audio',
          relevanceScore: 30,
        });
      }
    });

    return items;
  }, [searchText, recentFiles, playlist, videoFolders, audioFolders]);

  // ── Filter & sort ──
  const filteredResults = useMemo((): SearchResultItem[] => {
    let results = allResults;

    // Apply filter
    if (activeFilter === 'videos') {
      results = results.filter(r => r.group === 'videos' || r.group === 'recent');
    } else if (activeFilter === 'audio') {
      results = results.filter(r => r.group === 'audio');
    }

    // Apply sort
    const sorted = [...results];
    switch (activeSort) {
      case 'relevance':
        sorted.sort((a, b) => b.relevanceScore - a.relevanceScore);
        break;
      case 'date':
        sorted.sort((a, b) => {
          // Items without dates sort last
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
    const groups: {key: string; label: string; items: SearchResultItem[]}[] = [];

    const recent = filteredResults.filter(r => r.group === 'recent');
    const videos = filteredResults.filter(r => r.group === 'videos');
    const audio = filteredResults.filter(r => r.group === 'audio');

    if (recent.length > 0) {
      groups.push({key: 'recent', label: 'Recent', items: recent});
    }
    if (videos.length > 0) {
      groups.push({key: 'videos', label: 'Videos', items: videos});
    }
    if (audio.length > 0) {
      groups.push({key: 'audio', label: 'Audio', items: audio});
    }

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
        searchBar: {
          flexDirection: 'row',
          alignItems: 'center',
          height: 48,
          borderRadius: radius.pill,
          borderWidth: 1,
          paddingHorizontal: 14,
          marginBottom: 16,
        },
        searchIcon: {
          width: 18,
          height: 18,
          resizeMode: 'contain',
          opacity: 0.6,
          marginRight: 10,
        },
        searchInput: {
          flex: 1,
          fontSize: 16,
          fontWeight: '400',
          paddingVertical: 0,
        },
        clearButton: {
          marginLeft: 8,
          paddingLeft: 4,
        },
        filterRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        },
        chipsContainer: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
        },
        chip: {
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: radius.pill,
          borderWidth: 0.5,
        },
        chipActive: {
          borderWidth: 1,
        },
        sortRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        sortLabel: {
          opacity: 0.5,
        },
        sortOption: {
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: radius.sm,
        },
        sortOptionActive: {},
        hintContainer: {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
        resultsCount: {
          paddingHorizontal: spacing.lg,
          marginBottom: spacing.sm,
        },
        sectionGap: {
          marginTop: s.md,
        },
        resultsGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: GRID_GAP,
        },
        resultTile: {
          borderRadius: radius.sm,
          borderWidth: 0.5,
          overflow: 'hidden',
        },
        resultThumb: {
          width: '100%',
          height: 100,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        },
        resultThumbImg: {
          width: '100%',
          height: '100%',
          resizeMode: 'cover',
        },
        resultThumbPlaceholder: {
          width: 28,
          height: 28,
          resizeMode: 'contain',
          opacity: 0.45,
        },
        resultProgressTrack: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
        },
        resultProgressFill: {
          height: '100%',
        },
        resultTitle: {
          paddingHorizontal: 8,
          paddingVertical: 6,
        },
        folderResultRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: radius.sm,
          borderWidth: 0.5,
          gap: 10,
        },
        folderIcon: {
          width: 24,
          height: 24,
          resizeMode: 'contain',
          opacity: 0.5,
        },
        folderTextContainer: {
          flex: 1,
        },
      }),
    [s.md, colors],
  );

  // ── Handlers ──
  const handleClearSearch = useCallback(() => {
    setSearchText('');
  }, []);

  const handleChipTap = useCallback((term: string) => {
    setSearchText(term);
  }, []);

  const handleClearRecent = useCallback(() => {
    setRecentSearches([]);
  }, []);

  const handlePlayFile = useCallback(
    async (fileUri: string, fileTitle: string) => {
      navigation.navigate('VideoPlayer', {
        fileUri,
        fileTitle,
      });
    },
    [navigation],
  );

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

      {/* ══ BACKGROUND ══ */}
      <LinearGradient
        colors={
          isDark
            ? [colors.background.primary, '#0B0F13']
            : ['#F7F7F7', colors.background.primary]
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

      {/* ══ MAIN CONTENT ══ */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <InternalHeader title="Search" />
        {/* ── SearchBar ── */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.background.elevated,
              borderColor: colors.border.subtle,
            },
          ]}>
          {/* Search icon (left of input) */}
          <SvgIcon
            name="bell"
            size={20}
            color={colors.text.secondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, {color: colors.text.primary}]}
            placeholder="Search your media…"
            placeholderTextColor={colors.text.tertiary}
            autoFocus
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSubmitSearch}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
              style={styles.clearButton}
              accessibilityLabel="Clear search"
              accessibilityRole="button">
              <AppText variant="body1" color="secondary">
                ✕
              </AppText>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Recent Searches ── */}
        {showRecentSection && (
          <View style={{marginTop: s.sm}}>
            <SectionHeader
              label="Recent Searches"
              actionLabel={recentSearches.length > 0 ? 'Clear' : undefined}
              onAction={
                recentSearches.length > 0 ? handleClearRecent : undefined
              }
            />
            {recentSearches.length > 0 ? (
              <View style={styles.chipsContainer}>
                {recentSearches.map((term, idx) => (
                  <TouchableOpacity
                    key={term + idx}
                    activeOpacity={0.7}
                    onPress={() => handleChipTap(term)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: colors.border.subtle,
                        borderColor: colors.border.emphasis,
                      },
                    ]}>
                    <AppText variant="caption" color="secondary">
                      {term}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.hintContainer}>
                <AppText variant="body2" color="tertiary">
                  Search for recently played media, playlist entries, or linked
                  folders
                </AppText>
              </View>
            )}
          </View>
        )}

        {/* ── Filters & Sort (shown when searching) ── */}
        {showResultsSection && (
          <View style={{marginTop: s.sm}}>
            {/* Filter chips */}
            <View style={styles.filterRow}>
              <View style={styles.chipsContainer}>
                {FILTERS.map(f => {
                  const isActive = activeFilter === f.key;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      activeOpacity={0.7}
                      onPress={() => setActiveFilter(f.key)}
                      style={[
                        styles.chip,
                        styles.chipActive,
                        {
                          backgroundColor: isActive
                            ? colors.accent.gold
                            : colors.border.subtle,
                          borderColor: isActive
                            ? colors.accent.gold
                            : colors.border.emphasis,
                        },
                      ]}>
                      <AppText
                        variant="caption"
                        color={isActive ? '#0A0A0C' : 'secondary'}
                        style={{fontWeight: isActive ? '600' : '400'}}>
                        {f.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Sort row */}
            <View style={styles.sortRow}>
              <AppText
                variant="caption"
                color="tertiary"
                style={styles.sortLabel}>
                Sort:
              </AppText>
              {SORTS.map(s => {
                const isActive = activeSort === s.key;
                return (
                  <TouchableOpacity
                    key={s.key}
                    onPress={() => setActiveSort(s.key)}
                    style={[
                      styles.sortOption,
                      isActive && {
                        backgroundColor: colors.accent.goldDim,
                      },
                    ]}>
                    <AppText
                      variant="caption"
                      color={isActive ? 'accent' : 'secondary'}
                      style={{fontWeight: isActive ? '600' : '400'}}>
                      {s.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── No Results ── */}
        {showResultsSection && !hasResults && (
          <View style={{marginTop: s.lg}}>
            <EmptyState
              icon="music"
              title="No results found"
              description={`No media matches "${searchText}"`}
            />
          </View>
        )}

        {/* ── Grouped Results ── */}
        {showResultsSection &&
          hasResults &&
          groupedResults.map(group => (
            <View key={group.key} style={styles.sectionGap}>
              <SectionHeader label={group.label} />

              {/* Total count */}
              <AppText
                variant="caption"
                color="secondary"
                style={styles.resultsCount}>
                {group.items.length}{' '}
                {group.items.length === 1 ? 'result' : 'results'}
              </AppText>

              {/* Grid for file results */}
              {group.key === 'recent' && (
                <View style={styles.resultsGrid}>
                  {group.items.map(item => {
                    const percent =
                      item.duration && item.duration > 0
                        ? Math.round(
                            ((item.position ?? 0) / item.duration) * 100,
                          )
                        : 0;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.75}
                        onPress={() =>
                          item.fileUri &&
                          handlePlayFile(item.fileUri, item.title)
                        }
                        style={[
                          styles.resultTile,
                          {
                            width: tileWidth,
                            backgroundColor: colors.background.elevated,
                            borderColor: colors.border.subtle,
                          },
                        ]}>
                        <View
                          style={[
                            styles.resultThumb,
                            {backgroundColor: colors.accent.goldDim},
                          ]}>
                          {item.thumbnailPath ? (
                            <Image
                              source={{
                                uri:
                                  'file://' +
                                  item.thumbnailPath +
                                  '?t=' +
                                  encodeURIComponent(
                                    item.lastPlayedAt ?? '',
                                  ),
                              }}
                              style={styles.resultThumbImg}
                            />
                          ) : (
                          <SvgIcon
                            name="music"
                            size={28}
                            color={colors.text.tertiary}
                            style={styles.resultThumbPlaceholder}
                          />
                        )}
                          <View
                            style={[
                              styles.resultProgressTrack,
                              {backgroundColor: colors.text.tertiary},
                            ]}>
                            <View
                              style={[
                                styles.resultProgressFill,
                                {
                                  width: `${percent}%`,
                                  backgroundColor: colors.accent.gold,
                                },
                              ]}
                            />
                          </View>
                        </View>
                        <AppText
                          variant="caption"
                          color="primary"
                          numberOfLines={1}
                          style={styles.resultTitle}>
                          {item.title}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Grid for videos (from playlist) */}
              {(group.key === 'videos' || group.key === 'audio') && (
                <View style={styles.resultsGrid}>
                  {group.items.map(item => {
                    // Folder items render as rows
                    if (!item.fileUri) {
                      return (
                        <TouchableOpacity
                          key={item.id}
                          activeOpacity={0.75}
                          style={[
                            styles.folderResultRow,
                            {
                              width: '100%',
                              backgroundColor: colors.background.elevated,
                              borderColor: colors.border.subtle,
                            },
                          ]}>
                          <SvgIcon
                            name="folder"
                            size={20}
                            color={colors.text.secondary}
                            style={styles.folderIcon}
                          />
                          <View style={styles.folderTextContainer}>
                            <AppText
                              variant="body2"
                              color="primary"
                              numberOfLines={1}>
                              {item.title}
                            </AppText>
                            {item.subtitle && (
                              <AppText
                                variant="caption"
                                color="tertiary"
                                numberOfLines={1}>
                                {item.subtitle}
                              </AppText>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    }

                    // Playlist entries with media info
                    return (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.75}
                        onPress={() =>
                          item.fileUri &&
                          handlePlayFile(item.fileUri, item.title)
                        }
                        style={[
                          styles.resultTile,
                          {
                            width: tileWidth,
                            backgroundColor: colors.background.elevated,
                            borderColor: colors.border.subtle,
                          },
                        ]}>
                        <View
                          style={[
                            styles.resultThumb,
                            {backgroundColor: colors.accent.goldDim},
                          ]}>
                          <SvgIcon
                            name="music"
                            size={28}
                            color={colors.text.tertiary}
                            style={styles.resultThumbPlaceholder}
                          />
                        </View>
                        <AppText
                          variant="caption"
                          color="primary"
                          numberOfLines={1}
                          style={styles.resultTitle}>
                          {item.title}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          ))}

        {/* ── BottomSpacer (xxxl) ── */}
        <View style={{height: spacing.xxxl}} />
      </ScrollView>
    </SafeAreaView>
  );
};
