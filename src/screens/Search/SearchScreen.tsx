import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  useWindowDimensions,
  Platform,
  ActivityIndicator,

} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../theme';
import {SimbaStatusBar} from '../../components/StatusBar';

import {AppText} from '../../components/core/AppText/AppText';
import {SectionHeader} from '../../components/utility/SectionHeader/SectionHeader';
import {EmptyState} from '../../components/feedback/EmptyState/EmptyState';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {useAppSelector} from '../../store';
import {useSearch, SearchResultItem as SearchResultItemT} from '../../hooks/useSearch';
import {SearchScreenProps} from '../../navigation/types';
import {radius, spacing} from '../../theme/tokens';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';

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

  // ── UseSearch hook ──
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

  // ════════════════════════════════════════════════════════
  //  22.4 — Gold Highlight: highlights matched keywords
  // ════════════════════════════════════════════════════════

  /** Split text into highlighted/non-highlighted parts for the matched query. */
  const renderHighlightedText = useCallback(
    (text: string, style?: any) => {
      const q = debouncedQuery;
      if (!q || !text) {
        return (
          <AppText variant="body2" color="primary" numberOfLines={1} style={style}>
            {text}
          </AppText>
        );
      }

      const lowerText = text.toLowerCase();
      const lowerQuery = q.toLowerCase();
      const parts: {t: string; hl: boolean}[] = [];
      let lastIdx = 0;
      let idx = lowerText.indexOf(lowerQuery, lastIdx);
      while (idx !== -1) {
        if (idx > lastIdx) {
          parts.push({t: text.slice(lastIdx, idx), hl: false});
        }
        parts.push({t: text.slice(idx, idx + q.length), hl: true});
        lastIdx = idx + q.length;
        idx = lowerText.indexOf(lowerQuery, lastIdx);
      }
      if (lastIdx < text.length) {
        parts.push({t: text.slice(lastIdx), hl: false});
      }

      if (parts.length === 0) {
        return (
          <AppText variant="body2" color="primary" numberOfLines={1} style={style}>
            {text}
          </AppText>
        );
      }

      return (
        <Text
          numberOfLines={1}
          style={[{color: colors.text.primary, fontSize: 14}, style]}>
          {parts.map((part, i) => (
            <Text
              key={i}
              style={
                part.hl
                  ? {color: colors.accent.gold, fontWeight: '600'}
                  : {color: colors.text.primary}
              }>
              {part.t}
            </Text>
          ))}
        </Text>
      );
    },
    [debouncedQuery, colors],
  );

  /** Highlighted version of subtitle (tertiary color with gold for matches). */
  const renderHighlightedSubtitle = useCallback(
    (text?: string) => {
      const q = debouncedQuery;
      if (!q || !text) {
        return text ? (
          <AppText variant="caption" color="tertiary" numberOfLines={1}>
            {text}
          </AppText>
        ) : null;
      }

      const lowerText = text.toLowerCase();
      const lowerQuery = q.toLowerCase();
      const parts: {t: string; hl: boolean}[] = [];
      let lastIdx = 0;
      let idx = lowerText.indexOf(lowerQuery, lastIdx);
      while (idx !== -1) {
        if (idx > lastIdx) parts.push({t: text.slice(lastIdx, idx), hl: false});
        parts.push({t: text.slice(idx, idx + q.length), hl: true});
        lastIdx = idx + q.length;
        idx = lowerText.indexOf(lowerQuery, lastIdx);
      }
      if (lastIdx < text.length) parts.push({t: text.slice(lastIdx), hl: false});

      return (
        <Text
          numberOfLines={1}
          style={{color: colors.text.tertiary, fontSize: 12}}>
          {parts.map((part, i) => (
            <Text
              key={i}
              style={
                part.hl
                  ? {color: colors.accent.gold, fontWeight: '500'}
                  : {color: colors.text.tertiary}
              }>
              {part.t}
            </Text>
          ))}
        </Text>
      );
    },
    [debouncedQuery, colors],
  );

  // ── Filter & sort ──
  const filteredResults = useMemo((): SearchResultItemT[] => {
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
    const groups: {key: string; label: string; items: SearchResultItemT[]}[] = [];

    const recent = filteredResults.filter(r => r.group === 'recent');
    const videos = filteredResults.filter(r => r.group === 'videos');
    const audio = filteredResults.filter(r => r.group === 'audio');
    const artistsGroup = filteredResults.filter(r => r.group === 'artists');
    const albumsGroup = filteredResults.filter(r => r.group === 'albums');
    const playlistsGroup = filteredResults.filter(r => r.group === 'playlists');
    const folders = filteredResults.filter(r => r.group === 'folders');

    if (recent.length > 0) {
      groups.push({key: 'recent', label: 'Recent', items: recent});
    }
    if (artistsGroup.length > 0) {
      groups.push({key: 'artists', label: 'Artists', items: artistsGroup});
    }
    if (albumsGroup.length > 0) {
      groups.push({key: 'albums', label: 'Albums', items: albumsGroup});
    }
    if (playlistsGroup.length > 0) {
      groups.push({key: 'playlists', label: 'Playlists', items: playlistsGroup});
    }
    if (videos.length > 0) {
      groups.push({key: 'videos', label: 'Videos', items: videos});
    }
    if (audio.length > 0) {
      groups.push({key: 'audio', label: 'Audio', items: audio});
    }
    if (folders.length > 0) {
      groups.push({key: 'folders', label: 'Folders', items: folders});
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
        // ── List row styles ──
        listResultRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: radius.sm,
          borderWidth: 0.5,
          gap: 10,
        },
        listIcon: {
          width: 24,
          height: 24,
          resizeMode: 'contain',
          opacity: 0.5,
        },
        listTextContainer: {
          flex: 1,
        },
        centerContainer: {
          flex: 1,
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
    [s.md, colors],
  );

  // ── Handlers ──
  const handleClearSearch = useCallback(() => {
    setSearchText('');
  }, [setSearchText]);

  const handleChipTap = useCallback(
    (term: string) => {
      setSearchText(term);
    },
    [setSearchText],
  );

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

  const handleRetry = useCallback(() => {
    setError(null);
  }, []);

  const handleSubmitSearch = useCallback(() => {
    const trimmed = searchText.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(t => t !== trimmed);
      return [trimmed, ...filtered].slice(0, 10);
    });
  }, [searchText]);

  // ── Render item tile (with gold highlight) ──
  const renderResultTile = useCallback(
    (item: SearchResultItemT) => {
      if (item.fileUri) {
        const percent =
          item.duration && item.duration > 0
            ? Math.round(((item.position ?? 0) / item.duration) * 100)
            : 0;
        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.75}
            onPress={() => handlePlayFile(item.fileUri!, item.title)}
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
                      encodeURIComponent(item.lastPlayedAt ?? ''),
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
            <View style={styles.resultTitle}>
              {renderHighlightedText(item.title, {fontSize: 12})}
            </View>
          </TouchableOpacity>
        );
      }

      return (
        <TouchableOpacity
          key={item.id}
          activeOpacity={0.75}
          onPress={() => handlePlayFile(item.fileUri!, item.title)}
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
          <View style={styles.resultTitle}>
            {renderHighlightedText(item.title, {fontSize: 12})}
          </View>
        </TouchableOpacity>
      );
    },
    [tileWidth, colors, styles, handlePlayFile, renderHighlightedText],
  );

  // ── Render list row (with gold highlight) ──
  const renderListRow = useCallback(
    (item: SearchResultItemT) => {
      const onPress = () => {
        if (item.navigateTo) {
          const nt = item.navigateTo;
          if (nt.route) {
            (navigation.navigate as any)(nt.route, nt.params);
          } else if (nt.screen) {
            (navigation.navigate as any)(nt.screen, nt.params);
          }
        } else if (item.fileUri) {
          handlePlayFile(item.fileUri, item.title);
        }
      };

      let iconName: React.ComponentProps<typeof SvgIcon>['name'] = 'folder';
      if (item.group === 'artists') iconName = 'headphones';
      else if (item.group === 'albums') iconName = 'folder';
      else if (item.group === 'playlists') iconName = 'listMusic';
      else if (item.group === 'folders') iconName = 'folderFill';

      return (
        <TouchableOpacity
          key={item.id}
          activeOpacity={0.75}
          onPress={onPress}
          style={[
            styles.listResultRow,
            {
              backgroundColor: colors.background.elevated,
              borderColor: colors.border.subtle,
            },
          ]}>
          <SvgIcon
            name={iconName}
            size={20}
            color={colors.text.secondary}
            style={styles.listIcon}
          />
          <View style={styles.listTextContainer}>
            {renderHighlightedText(item.title)}
            {renderHighlightedSubtitle(item.subtitle)}
          </View>
          <SvgIcon
            name="chevronRight"
            size={16}
            color={colors.text.tertiary}
          />
        </TouchableOpacity>
      );
    },
    [colors, styles, navigation, handlePlayFile, renderHighlightedText, renderHighlightedSubtitle],
  );

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
          <SvgIcon
            name="search"
            size={20}
            color={colors.text.secondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, {color: colors.text.primary}]}
            placeholder="Search tracks, artists, albums, folders…"
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
              <SvgIcon name="close" size={18} color={colors.text.secondary} />
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
                  Search tracks, artists, albums, playlists, and linked folders
                </AppText>
              </View>
            )}
          </View>
        )}

        {/* ── Filters & Sort (shown when searching) ── */}
        {showResultsSection && (
          <View style={{marginTop: s.sm}}>
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
                        color={isActive ? 'primary' : 'secondary'}
                        style={{fontWeight: isActive ? '600' : '400'}}>
                        {f.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

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

        {/* ── Loading ── */}
        {showResultsSection && isSearching && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.accent.gold} />
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
        {showResultsSection &&
          !isSearching &&
          !error &&
          hasResults &&
          groupedResults.map(group => {
            const isListGroup =
              group.key === 'artists' ||
              group.key === 'albums' ||
              group.key === 'playlists' ||
              group.key === 'folders';
            return (
              <View key={group.key} style={styles.sectionGap}>
                <SectionHeader label={group.label} />
                {isListGroup
                  ? group.items.map(item => renderListRow(item))
                  : (
                  <View style={styles.resultsGrid}>
                    {group.items.map(item => renderResultTile(item))}
                  </View>
                  )}
              </View>
            );
          })}

        <View style={{height: spacing.xxxl}} />
      </ScrollView>
    </SafeAreaView>
  );
}
