// ────────────────────────────────────────────────────────
// Simba Player — History Screen (Phase 47)
// Full playback history · filters + search · per-item remove
// · clear-all behind confirm · resumable rows with progress
// ────────────────────────────────────────────────────────

import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {BackButton} from '../../../components/utility/BackButton/BackButton';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {useConfirmDialog} from '../../../components/core/Dialog/ConfirmDialog';
import {useToast} from '../../../components/feedback/Toast/Toast';
import {SearchBar} from '../../../components/core/SearchBar/SearchBar';
import {useRecentHistory, type RecentHistoryEntry} from '../../../features/recentHistory';
import {usePlaybackCommands} from '../../../modules/playback';
import {MediaActionsSheet} from '../../../components/sheets/MediaActionsSheet/MediaActionsSheet';
import {useQueueActions} from '../../../components/sheets/MediaActionsSheet/useQueueActions';
import {formatDuration} from '../../../utils/timeAgo';
import type {HistoryScreenProps} from '../types';

type Props = HistoryScreenProps;

type HistoryFilter = 'all' | 'video' | 'audio' | 'streaming';

const FILTERS: Array<{key: HistoryFilter; label: string}> = [
  {key: 'all', label: 'All'},
  {key: 'video', label: 'Video'},
  {key: 'audio', label: 'Audio'},
  {key: 'streaming', label: 'Streaming'},
];

/** 47.3: streaming = remote URIs (http/https), local = file/content. */
function isStreamingUri(uri: string): boolean {
  return /^https?:\/\//i.test(uri);
}

export const HistoryScreen: React.FC<Props> = ({navigation}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const {confirm, dialog} = useConfirmDialog();
  const {list: recentFiles, removeRecent, clearRecent} = useRecentHistory();
  const {openPlayer} = usePlaybackCommands();
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [query, setQuery] = useState('');
  // 58.4/58.5: standard long-press menu (Play Next / Queue / Remove)
  const [menuItem, setMenuItem] = useState<RecentHistoryEntry | null>(null);
  const {playNext, addToQueue} = useQueueActions();
  // 54.3: pull-to-refresh — local store data, so just pulse the spinner
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    requestAnimationFrame(() => setRefreshing(false));
  }, []);

  const filtered = useMemo(() => {
    let items = recentFiles;
    if (filter === 'video') {
      items = items.filter(e => e.mediaType === 'video');
    } else if (filter === 'audio') {
      items = items.filter(e => e.mediaType === 'audio');
    } else if (filter === 'streaming') {
      items = items.filter(e => isStreamingUri(e.fileUri));
    }
    const q = query.trim().toLowerCase();
    if (q) {
      items = items.filter(e => e.title.toLowerCase().includes(q));
    }
    return items;
  }, [recentFiles, filter, query]);

  const handlePress = useCallback(
    (fileUri: string, mediaType?: 'video' | 'audio', title?: string, position?: number) => {
      const lane = mediaType ?? 'video';
      // 58.2: explicit tap intent — silent seek to the saved position
      openPlayer({
        uri: fileUri,
        title: title ?? 'Untitled',
        duration: 0,
        startPosition: position,
        source: isStreamingUri(fileUri) ? 'api' : 'local',
        type: lane === 'audio' ? 'audio' : 'video',
        mediaType: lane,
      });
    },
    [openPlayer],
  );

  const handleRemove = useCallback(
    async (fileUri: string, title: string) => {
      const ok = await confirm({
        title: 'Remove from History',
        message: `Remove "${title}" from your history?`,
        confirmLabel: 'Remove',
        destructive: true,
      });
      if (ok) {
        removeRecent(fileUri);
      }
    },
    [confirm, removeRecent],
  );

  const handleClearAll = useCallback(async () => {
    const ok = await confirm({
      title: 'Clear History',
      message: 'This removes all playback history from this device. This cannot be undone.',
      confirmLabel: 'Clear History',
      destructive: true,
    });
    if (ok) {
      clearRecent();
      toast.show('History cleared');
    }
  }, [clearRecent, confirm, toast]);

  const renderRow = useCallback(
    ({item}: {item: (typeof recentFiles)[number]}) => {
      const pct =
        item.duration > 0
          ? Math.min(100, Math.max(0, (item.position / item.duration) * 100))
          : 0;
      return (
        <TouchableOpacity
          style={[
            styles.row,
            {backgroundColor: colors.background.elevated},
          ]}
          onPress={() =>
            handlePress(item.fileUri, item.mediaType, item.title, item.position)
          }
          onLongPress={() => setMenuItem(item)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}, resume at ${formatDuration(item.position)}`}>
          <View style={[styles.rowIcon, {backgroundColor: colors.border.subtle}]}>
            <SvgIcon
              name={item.mediaType === 'audio' ? 'music' : 'video'}
              size={20}
              color={colors.accent.gold}
            />
          </View>
          <View style={styles.rowBody}>
            <AppText variant="body2" color="primary" numberOfLines={1}>
              {item.title}
            </AppText>
            <AppText variant="caption" color="tertiary">
              {formatDuration(item.position)} / {formatDuration(item.duration)}
            </AppText>
            {/* 47.2: row progress bar */}
            <View
              style={[styles.progressTrack, {backgroundColor: colors.border.subtle}]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${pct}%`,
                    backgroundColor: colors.accent.gold,
                  },
                ]}
              />
            </View>
          </View>
          <TouchableOpacity
            onPress={() => handleRemove(item.fileUri, item.title)}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.title} from history`}>
            <SvgIcon name="close" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [colors, handlePress, handleRemove],
  );

  return (
    <View
      style={[
        styles.root,
        {backgroundColor: colors.background.primary, paddingTop: insets.top},
      ]}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <AppText variant="displaySans" color="primary" style={styles.headerTitle}>
          History
        </AppText>
        {recentFiles.length > 0 && (
          <TouchableOpacity
            onPress={handleClearAll}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
            accessibilityRole="button"
            accessibilityLabel="Clear history">
            <AppText variant="caption" style={{color: colors.semantic.error}}>
              Clear All
            </AppText>
          </TouchableOpacity>
        )}
      </View>

      {/* Search (47.3) — core SearchBar (53.6) */}
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search history..."
        style={styles.searchBarWrap}
      />

      {/* Filters (47.3) */}
      <FlatList
        data={FILTERS}
        keyExtractor={f => f.key}
        horizontal
        renderItem={({item: f}) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: active
                    ? colors.accent.gold
                    : colors.background.elevated,
                },
              ]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{selected: active}}
              accessibilityLabel={`Filter: ${f.label}`}>
              <AppText
                variant="bodySmall"
                style={{
                  color: active ? colors.text.inverse : colors.text.secondary,
                  fontWeight: active ? '700' : '400',
                }}>
                {f.label}
              </AppText>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.filterRow}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        initialNumToRender={FILTERS.length}
      />

      {/* List (47.1/47.5) */}
      {filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="list"
            title="No History"
            description={
              query || filter !== 'all'
                ? 'Nothing matches this filter or search. Try another combination.'
                : 'Play any video or audio file and it will appear here with your progress.'
            }
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.fileUri}
          renderItem={renderRow}
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
        />
      )}

      {/* 58.4/58.5: standard long-press menu — Play Next / Queue / Remove */}
      <MediaActionsSheet
        visible={menuItem !== null}
        onClose={() => setMenuItem(null)}
        title={menuItem?.title ?? 'History Item'}
        actions={
          menuItem
            ? [
                {
                  label: 'Play Next',
                  icon: 'skipForward',
                  onPress: () =>
                    playNext({
                      uri: menuItem.fileUri,
                      title: menuItem.title,
                      duration: menuItem.duration,
                      source: menuItem.source,
                      mediaType: menuItem.mediaType,
                    }),
                },
                {
                  label: 'Add to Queue',
                  icon: 'list',
                  onPress: () =>
                    addToQueue({
                      uri: menuItem.fileUri,
                      title: menuItem.title,
                      duration: menuItem.duration,
                      source: menuItem.source,
                      mediaType: menuItem.mediaType,
                    }),
                },
                {
                  label: 'Remove from History',
                  icon: 'close',
                  destructive: true,
                  onPress: () => {
                    setMenuItem(null);
                    handleRemove(menuItem.fileUri, menuItem.title);
                  },
                },
              ]
            : []
        }
      />

      {dialog}
    </View>
  );
};

export default HistoryScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    flex: 1,
    marginLeft: 8,
  },
  searchBarWrap: {
    marginHorizontal: 16,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 56,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 60,
  },
});
