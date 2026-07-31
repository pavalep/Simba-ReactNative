// ─── TV Shows Browse Screen ────────────────────────────────────────────
// Phase 38.1/38.3: search / today's schedule / popular catalog via TVMaze.
// Tap a show → ShowDetail (poster, summary, seasons → episodes).

import React, {useCallback, useMemo} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import {useTheme} from '../../theme';
import {radius, spacing} from '../../theme/tokens';
import type {RootStackScreenProps} from '../../navigation/types';
import {useShowsScreen, type ShowsMode} from './hooks/useShowsScreen';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ActivityOrb} from '../../components/feedback/ActivityOrb/ActivityOrb';
import {ErrorState} from '../../components/feedback/ErrorState/ErrorState';
import {SkeletonList} from '../../components/core/Skeleton/SkeletonList';
import {SearchBar} from '../../components/core/SearchBar/SearchBar';
import FastImage from 'react-native-fast-image';
import type {TVMazeShow} from '../../types/api';

type Props = RootStackScreenProps<'ShowsScreen'>;

const MODES: {id: ShowsMode; label: string}[] = [
  {id: 'search', label: 'Search'},
  {id: 'today', label: 'On Today'},
  {id: 'browse', label: 'Popular'},
];

function formatMeta(show: TVMazeShow): string {
  const parts: string[] = [];
  if (show.premiered) {
    parts.push(show.premiered.slice(0, 4));
  }
  if (show.genres && show.genres.length > 0) {
    parts.push(show.genres.slice(0, 2).join(', '));
  }
  if (show.status && show.status !== 'Running') {
    parts.push(show.status);
  }
  return parts.join(' · ');
}

export const ShowsScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const {
    mode,
    setMode,
    searchQuery,
    setSearchQuery,
    searchResults,
    todayShows,
    browseShows,
    isLoading,
    isLoadingMore,
    error,
    refreshing,
    handleRefresh,
    retry,
    handleLoadMore,
  } = useShowsScreen(route.params?.initialTab);

  const rows = useMemo(() => {
    if (mode === 'search') return searchResults;
    if (mode === 'today') return todayShows;
    return browseShows;
  }, [mode, searchResults, todayShows, browseShows]);

  const handleShowPress = useCallback(
    (show: TVMazeShow) => {
      navigation.navigate('ShowDetail', {
        showId: show.id,
        showName: show.name,
      });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({item}: {item: TVMazeShow}) => (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => handleShowPress(item)}
        style={[
          styles.card,
          {backgroundColor: colors.background.elevated},
        ]}
        accessibilityRole="button">
        {item.image?.medium ? (
          <FastImage
            source={{uri: item.image.medium}}
            style={styles.thumb}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <View
            style={[
              styles.thumb,
              styles.thumbPlaceholder,
              {backgroundColor: colors.accent.goldDim},
            ]}>
            <SvgIcon name="video" size={22} color={colors.accent.gold} />
          </View>
        )}
        <View style={styles.cardInfo}>
          <AppText variant="bodySmall" numberOfLines={1} style={styles.cardTitle}>
            {item.name}
          </AppText>
          <AppText variant="caption" color="secondary" numberOfLines={1}>
            {formatMeta(item)}
          </AppText>
          {item.rating?.average ? (
            <AppText variant="caption" style={{color: colors.accent.gold}}>
              ★ {item.rating.average.toFixed(1)}
            </AppText>
          ) : null}
        </View>
        <SvgIcon name="chevronRight" size={18} color={colors.text.tertiary} />
      </TouchableOpacity>
    ),
    [colors, handleShowPress],
  );

  const ItemSeparator = useCallback(
    () => <View style={styles.separator} />,
    [],
  );

  const listEmpty = !isLoading && !error && rows.length === 0;

  return (
    <View style={[styles.root, {backgroundColor: colors.background.primary}]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title="TV Shows" />

      {/* ── Mode chips ── */}
      <View style={styles.modeRow}>
        <FlatList
          horizontal
          data={MODES}
          keyExtractor={m => m.id}
          renderItem={({item: m}) => {
            const active = mode === m.id;
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setMode(m.id)}
                style={[
                  styles.modeChip,
                  {
                    backgroundColor: active
                      ? colors.accent.gold
                      : colors.background.elevated,
                    borderColor: active
                      ? colors.accent.gold
                      : colors.border.subtle,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{selected: active}}>
                <AppText
                  variant="caption"
                  style={[
                    styles.modeChipText,
                    {
                      color: active
                        ? colors.background.primary
                        : colors.text.secondary,
                    },
                  ]}>
                  {m.label}
                </AppText>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.modeRail}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          initialNumToRender={MODES.length}
        />
      </View>

      {mode === 'search' && (
        <View style={styles.searchSection}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search TV shows…"
          />
        </View>
      )}

      <View style={styles.content}>
        {isLoading && <SkeletonList count={6} />}

        {error && !isLoading && (
          <ErrorState
            title="Couldn't load shows"
            message={error}
            onRetry={retry}
          />
        )}

        {listEmpty && (
          <View style={styles.centerState}>
            <SvgIcon name="video" size={40} color={colors.accent.goldDim} />
            <AppText variant="body2" color="tertiary" style={styles.stateText}>
              {mode === 'search'
                ? 'Type a show name to search TVMaze'
                : mode === 'today'
                  ? 'Nothing airing today — try again later'
                  : 'No shows found'}
            </AppText>
          </View>
        )}

        {!isLoading && !error && rows.length > 0 && (
          <FlatList
            data={rows}
            renderItem={renderItem}
            keyExtractor={item => `show-${item.id}`}
            ItemSeparatorComponent={ItemSeparator}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.accent.gold}
                colors={[colors.accent.gold]}
              />
            }
            ListFooterComponent={
              mode === 'browse' && browseShows.length > 0 ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleLoadMore}
                  disabled={isLoadingMore}
                  style={[
                    styles.loadMore,
                    {backgroundColor: colors.accent.goldDim},
                  ]}
                  accessibilityRole="button">
                  {isLoadingMore ? (
                    <ActivityOrb size={18} />
                  ) : (
                    <AppText variant="button" style={{color: colors.accent.gold}}>
                      Load more
                    </AppText>
                  )}
                </TouchableOpacity>
              ) : null
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  modeRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  modeRail: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  modeChipText: {
    fontWeight: '700',
  },
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  content: {
    flex: 1,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  stateText: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl + 80,
  },
  separator: {
    height: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.md,
  },
  thumb: {
    width: 56,
    height: 76,
    borderRadius: radius.sm,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontWeight: '700',
  },
  loadMore: {
    marginTop: spacing.md,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
});
