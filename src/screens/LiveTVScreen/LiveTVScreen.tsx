// ─── Live TV Browse Screen ──────────────────────────────────
// Phase 36.4/36.5: IPTV-org channels (all / by real category /
// favorites) + search. Tap → VideoPlayer live mode with the
// channel list for channel up/down.

import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {radius, spacing} from '../../theme/tokens';
import type {RootStackScreenProps} from '../../navigation/types';
import {useLiveTVScreen, type LiveTVMode} from './hooks/useLiveTVScreen';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ErrorState} from '../../components/feedback/ErrorState/ErrorState';
import {SkeletonList} from '../../components/core/Skeleton/SkeletonList';
import {SearchBar} from '../../components/core/SearchBar/SearchBar';
import FastImage from 'react-native-fast-image';
import {shareContent} from '../../services/shareService';
import {useBookmarks} from '../../hooks/useBookmarks';
import {useToast} from '../../components/feedback/Toast';
import {useHaptics} from '../../hooks/useHaptics';
import {PlaylistSheet} from '../../components/sheets/PlaylistSheet/PlaylistSheet';
import {OptionSheetDialog} from '../../components/core/OptionSheetDialog/OptionSheetDialog';
import type {IPTVChannelResult} from '../../types/api';
import type {LiveFavoriteItem} from '../../store/slices/liveFavoritesSlice';

type Props = RootStackScreenProps<'LiveTVScreen'>;

// ─── Modes ──────────────────────────────────────────────────

const MODES: Array<{id: LiveTVMode; label: string}> = [
  {id: 'all', label: 'All Channels'},
  {id: 'categories', label: 'Categories'},
  {id: 'favorites', label: 'Favorites'},
];

// ─── Normalized row ─────────────────────────────────────────

interface ChannelRow {
  id: string;
  name: string;
  url: string;
  image: string;
  subtitle: string;
}

function toRow(channel: IPTVChannelResult): ChannelRow {
  return {
    id: channel.id,
    name: channel.name,
    url: channel.url,
    image: channel.logo || '',
    subtitle: [channel.category, channel.country, channel.language]
      .filter(Boolean)
      .join(' · '),
  };
}

function favToRow(fav: LiveFavoriteItem): ChannelRow {
  return {
    id: fav.id,
    name: fav.name,
    url: fav.url,
    image: fav.image,
    subtitle: fav.subtitle,
  };
}

// ─── List separator (module-level to satisfy react/no-unstable-nested-components) ──

const ItemSeparator = () => <View style={styles.separator} />;

// ─── Channel Card ───────────────────────────────────────────

interface ChannelCardProps {
  row: ChannelRow;
  isFavorite: boolean;
  onPress: (row: ChannelRow) => void;
  onLongPress: (row: ChannelRow) => void;
}

const ChannelCard: React.FC<ChannelCardProps> = React.memo(
  ({row, isFavorite, onPress, onLongPress}) => {
    const {colors} = useTheme();
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(row)}
        onLongPress={() => onLongPress(row)}
        delayLongPress={400}
        style={[styles.card, {backgroundColor: colors.background.elevated}]}>
        <View style={[styles.thumb, {backgroundColor: colors.border.subtle}]}>
          {row.image ? (
            <FastImage
              source={{uri: row.image}}
              style={styles.thumb}
              resizeMode={FastImage.resizeMode.contain}
            />
          ) : (
            <SvgIcon name="video" size={22} color={colors.accent.gold} />
          )}
        </View>
        <View style={styles.info}>
          <AppText variant="bodySmall" numberOfLines={1} style={styles.name}>
            {row.name}
          </AppText>
          {row.subtitle ? (
            <AppText variant="caption" color="secondary" numberOfLines={1}>
              {row.subtitle}
            </AppText>
          ) : null}
        </View>
        <SvgIcon
          name="bookmark"
          size={18}
          color={isFavorite ? colors.accent.gold : colors.text.tertiary}
        />
        <View style={styles.playButton}>
          <SvgIcon name="play" size={16} color={colors.accent.gold} />
        </View>
      </TouchableOpacity>
    );
  },
);

// ─── Screen ─────────────────────────────────────────────────

export const LiveTVScreen: React.FC<Props> = ({navigation, route}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const haptics = useHaptics();
  const {add: addBookmark} = useBookmarks();
  const {
    mode,
    setMode,
    selectedCategory,
    setSelectedCategory,
    categories,
    channels,
    favorites,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    isOnline,
    refreshing,
    handleRefresh,
    retry,
    isFavoriteId,
    toggleFavorite,
    removeFavorite,
  } = useLiveTVScreen(route.params?.categoryId);

  const [menuRow, setMenuRow] = useState<ChannelRow | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [sheetItem, setSheetItem] = useState<
    React.ComponentProps<typeof PlaylistSheet>['currentItem'] | null
  >(null);

  const handleChannelPress = useCallback(
    (row: ChannelRow) => {
      const list = channels.map(toRow);
      const index = Math.max(0, list.findIndex(c => c.id === row.id));
      navigation.navigate('VideoPlayer', {
        fileUri: row.url,
        fileTitle: row.name,
        source: 'iptv',
        liveChannels: list.map(c => ({
          id: c.id,
          name: c.name,
          url: c.url,
          logo: c.image || undefined,
        })),
        liveChannelIndex: index,
      });
    },
    [navigation, channels],
  );

  const handleLongPress = useCallback((row: ChannelRow) => {
    setMenuRow(row);
    setMenuVisible(true);
  }, []);

  const handleMenuSelect = useCallback(
    (value: string | number) => {
      const row = menuRow;
      if (!row) return;
      switch (value) {
        case 'favorite': {
          const channel = channels.find(c => c.id === row.id);
          if (channel) {
            const wasFavorite = isFavoriteId(row.id);
            toggleFavorite(channel);
            toast.show(
              wasFavorite
                ? 'Removed from favorites'
                : 'Saved to favorites',
            );
          } else {
            removeFavorite(row.id);
            toast.show('Removed from favorites');
          }
          haptics.light();
          break;
        }
        case 'playlist':
          setSheetItem({
            fileUri: row.url,
            title: row.name,
            duration: 0,
            thumbnailPath: row.image || undefined,
            source: 'iptv',
            mediaType: 'video',
          });
          break;
        case 'bookmark':
          addBookmark({
            fileUri: row.url,
            title: row.name,
            position: 0,
            duration: 0,
            label: '',
            thumbnailPath: row.image || undefined,
            mediaType: 'video',
            source: 'iptv',
          });
          toast.show('Channel bookmarked');
          break;
        case 'share':
          shareContent({
            route: 'VideoPlayer',
            params: {fileUri: row.url, fileTitle: row.name, source: 'iptv'},
            title: row.name,
            subtitle: row.subtitle,
          });
          break;
      }
      setMenuRow(null);
    },
    [
      menuRow,
      channels,
      isFavoriteId,
      removeFavorite,
      toggleFavorite,
      addBookmark,
      toast,
      haptics,
    ],
  );

  const rows: ChannelRow[] = useMemo(() => {
    if (mode === 'favorites') {
      return favorites.map(favToRow);
    }
    return channels.map(toRow);
  }, [mode, favorites, channels]);

  const showCategories =
    !searchQuery.trim() && mode === 'categories' && categories.length > 0;

  const isEmpty =
    rows.length === 0 && !isLoading && !error && mode !== 'favorites';

  const favoritesEmpty = mode === 'favorites' && favorites.length === 0;

  return (
    <View
      style={[
        styles.root,
        {backgroundColor: colors.background.primary, paddingTop: insets.top},
      ]}>
      <SimbaStatusBar variant="home" />
      <InternalHeader title="Live TV" />

      {/* ── Search ── */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search channels…"
        />
      </View>

      {/* ── Mode chips ── */}
      <View
        style={[
          styles.chipSection,
          {borderBottomColor: colors.border.subtle},
        ]}>
        {/* 59.1: virtualized rail (FlatList) instead of ScrollView+map */}
        <FlatList
          horizontal
          data={MODES}
          keyExtractor={m => m.id}
          renderItem={({item: m}) => (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setMode(m.id)}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    mode === m.id
                      ? colors.accent.gold
                      : colors.background.elevated,
                  borderColor:
                    mode === m.id
                      ? colors.accent.gold
                      : colors.background.highlight,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{selected: mode === m.id}}>
              <AppText
                variant="button"
                style={[
                  styles.chipText,
                  {
                    color:
                      mode === m.id
                        ? colors.text.inverse
                        : colors.text.secondary,
                  },
                ]}>
                {m.label}
              </AppText>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.chipScroll}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          initialNumToRender={MODES.length}
        />
      </View>

      {/* ── Category chips (real iptv-org data) ── */}
      {showCategories && (
        <View style={styles.tagSection}>
          {/* 59.1: virtualized — iptv-org exposes hundreds of categories */}
          <FlatList
            horizontal
            data={categories}
            keyExtractor={cat => cat.id}
            renderItem={({item: cat}) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSelectedCategory(cat.name)}
                  style={[
                    styles.chip,
                    styles.tagChip,
                    {
                      backgroundColor: isSelected
                        ? colors.accent.goldDim
                        : colors.background.elevated,
                      borderColor: isSelected
                        ? colors.accent.gold
                        : colors.border.subtle,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{selected: isSelected}}>
                  <AppText
                    variant="caption"
                    style={[
                      styles.tagText,
                      {
                        color: isSelected
                          ? colors.accent.gold
                          : colors.text.secondary,
                      },
                    ]}>
                    {cat.name} · {cat.channelCount}
                  </AppText>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.chipScroll}
            showsHorizontalScrollIndicator={false}
            initialNumToRender={24}
            windowSize={5}
            maxToRenderPerBatch={12}
          />
        </View>
      )}

      {/* ── Content ── */}
      <View style={styles.contentArea}>
        {isLoading && rows.length === 0 && (
          <SkeletonList count={6} hasImage lines={2} />
        )}

        {error && rows.length === 0 && (
          <ErrorState
            title={isOnline ? 'Couldn\'t load channels' : 'You\'re offline'}
            message={
              isOnline
                ? error
                : 'Connect to the internet, then retry to watch.'
            }
            onRetry={retry}
            retryLabel="Retry"
          />
        )}

        {favoritesEmpty && (
          <View style={styles.centerState}>
            <SvgIcon name="bookmark" size={40} color={colors.accent.goldDim} />
            <AppText variant="body2" color="tertiary" style={styles.stateText}>
              No favorite channels yet.
            </AppText>
            <AppText variant="caption" color="tertiary" style={styles.stateText}>
              Long-press any channel to save it here.
            </AppText>
          </View>
        )}

        {isEmpty && (
          <View style={styles.centerState}>
            <SvgIcon name="video" size={40} color={colors.accent.goldDim} />
            <AppText variant="body2" color="tertiary" style={styles.stateText}>
              No channels found.
            </AppText>
          </View>
        )}

        {!isLoading && !error && rows.length > 0 && (
          <FlatList
            data={rows}
            keyExtractor={item => item.id}
            renderItem={({item}) => (
              <ChannelCard
                row={item}
                isFavorite={isFavoriteId(item.id)}
                onPress={handleChannelPress}
                onLongPress={handleLongPress}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={ItemSeparator}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.accent.gold}
                colors={[colors.accent.gold]}
              />
            }
          />
        )}
      </View>

      <OptionSheetDialog
        visible={menuVisible}
        title={menuRow?.name ?? 'Channel Options'}
        options={[
          {
            label: isFavoriteId(menuRow?.id ?? '')
              ? 'Remove Favorite'
              : 'Add to Favorites',
            value: 'favorite',
          },
          {label: 'Add to Playlist', value: 'playlist'},
          {label: 'Bookmark', value: 'bookmark'},
          {label: 'Share', value: 'share'},
        ]}
        selectedValue={null}
        onSelect={handleMenuSelect}
        onClose={() => setMenuVisible(false)}
        colors={colors}
      />
      <PlaylistSheet
        visible={sheetItem !== null}
        onClose={() => setSheetItem(null)}
        currentItem={sheetItem ?? {fileUri: '', title: '', duration: 0}}
      />
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  chipSection: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  tagSection: {
    paddingVertical: spacing.sm,
  },
  chipScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tagChip: {
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  contentArea: {
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
  },
  separator: {
    height: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    fontWeight: '600',
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
