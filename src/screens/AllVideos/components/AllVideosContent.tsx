// ─── All Videos — Browse Content ───────────────────────────────────────
// The list the browse shell hosts.
//
// WAVE B16 (Wave B2) — rewritten from the screen's own hand-rolled shell.
//
// The shell owns the header, the search field, the filter FAB and the
// filter sheet. This component owns the list, the list's states, and the
// ROW MENU — the long-press menu the All Videos rows already had, kept
// on the same menu the app uses everywhere else.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {FlatList, RefreshControl, TouchableOpacity, View} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {FAB_SIZE} from '../../../components/core/Fab/Fab';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {MediaActionsSheet} from '../../../components/sheets/MediaActionsSheet/MediaActionsSheet';
import {PlaylistSheet, type PlaylistSheetProps} from '../../../components/sheets/PlaylistSheet';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {useAnimatedEntrance} from '../../../hooks/useAnimatedEntrance';
import {useQueueActions} from '../../../hooks/useQueueActions';
import {useBottomChromeInset} from '../../../infrastructure/player/miniPlayerChrome';
import type {ScannedTrack} from '../../../state';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {formatDuration} from '../../../utils/timeAgo';
import {artistNameOf} from '../hooks/useAllVideosScreen';
import {useAllVideosData} from './AllVideosDataProvider';
import {createAllVideosScreenStyles, COLUMN_COUNT, GAP} from '../styles';
import type {SectionRenderContext} from '../types';
import text from '../related/textContent.json';

/**
 * The row's second line.
 *
 * The duration is dropped when the scan does not know it — the shared
 * formatter answers '' for a zero length — so the row does not end in a
 * separator with nothing after it.
 */
function rowSubtitle(track: ScannedTrack): string {
  const artist = artistNameOf(track);
  const duration = formatDuration(track.duration);
  return duration ? artist + ' · ' + duration : artist;
}

export const AllVideosContent: React.FC<{ctx: SectionRenderContext}> = ({ctx}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createAllVideosScreenStyles(), []);
  // The app's ONE bottom-chrome rule: the safe area, or the mini-player
  // dock if one is up, plus a spacing step. The FAB's own height goes on
  // top so the last row clears the BUTTON.
  const bottomChromeInset = useBottomChromeInset();
  const {
    videoTracks,
    visibleTracks,
    sortLabel,
    playTrack,
    refreshing,
    refresh,
    setQuery,
    setSort,
  } = useAllVideosData();

  // ── The scope the shell owns, pushed down into the provider ──────────
  const sort = ctx.options.sort ?? 'title';
  useEffect(() => {
    setQuery(ctx.query);
  }, [ctx.query, setQuery]);
  useEffect(() => {
    setSort(sort);
  }, [sort, setSort]);

  // The VIEW — a rendering choice rather than a data scope, so it is
  // read from the shell's context directly.
  const isGrid = ctx.options.view !== 'list';

  // ── The row menu ────────────────────────────────────────────────────
  // A long press opens `MediaActionsSheet` — the app's ONE media menu
  // (58.4/58.5). Its "Add to Playlist" row opens `PlaylistSheet` with
  // the video, so a local film can live in a playlist.
  const {playNext, addToQueue} = useQueueActions();
  const [menuTrack, setMenuTrack] = useState<ScannedTrack | null>(null);
  const [sheetItem, setSheetItem] = useState<PlaylistSheetProps['currentItem'] | null>(
    null,
  );

  const handleMenuAction = useCallback(
    async (
      action: 'play-next' | 'add-queue' | 'add-playlist',
      track: ScannedTrack,
    ) => {
      // A scanned local file already carries its own classification
      // (`type: 'video'`, `mediaType: 'video'`, `source: 'local'`) — the
      // scanner owns it, so the playlist rule sees the truth.
      const queueItem = {
        uri: track.uri,
        title: track.title,
        duration: track.duration,
        source: track.source,
        type: track.type,
        mediaType: track.mediaType,
        folderId: track.folderId,
      };
      if (action === 'play-next') {
        playNext(queueItem);
        return;
      }
      if (action === 'add-queue') {
        addToQueue(queueItem);
        return;
      }
      setSheetItem({
        fileUri: track.uri,
        title: track.title,
        duration: track.duration,
        artist: track.artist,
        thumbnailPath: track.albumArtUri || undefined,
        source: track.source,
        type: track.type,
        mediaType: track.mediaType,
        folderId: track.folderId,
      });
    },
    [addToQueue, playNext],
  );

  const menuActions = useMemo(() => {
    const track = menuTrack;
    if (!track) {
      return [];
    }
    return [
      {
        label: text.menu.playNext,
        icon: 'skipForward' as const,
        onPress: async () => {
          await handleMenuAction('play-next', track);
        },
      },
      {
        label: text.menu.addToQueue,
        icon: 'list' as const,
        onPress: async () => {
          await handleMenuAction('add-queue', track);
        },
      },
      {
        label: text.menu.addToPlaylist,
        icon: 'listMusic' as const,
        onPress: async () => {
          await handleMenuAction('add-playlist', track);
        },
      },
    ];
  }, [handleMenuAction, menuTrack]);

  const {styles: animStyles} = useAnimatedEntrance(
    Math.min(visibleTracks.length, 12),
    {staggerDelay: 50, direction: 'fade', duration: 300},
  );

  // 59.2: stable renderItem — prevents cell re-renders on incidental
  // screen re-renders (search typing) while playback runs.
  const renderGridItem = useCallback(
    ({item, index}: {item: ScannedTrack; index: number}) => (
      <TouchableOpacity
        style={[
          styles.card,
          {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle},
          animStyles[index] || {},
        ]}
        activeOpacity={0.7}
        onPress={() => playTrack(item)}
        onLongPress={() => setMenuTrack(item)}
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityLabel={item.title}
        accessibilityHint={text.menu.longPressHint}>
        <View style={[styles.thumb, {backgroundColor: colors.accent.goldDim}]}>
          <SvgIcon name="video" size={28} color={colors.accent.gold} />
        </View>
        <AppText variant="caption" color="primary" numberOfLines={2} style={styles.cardTitle}>
          {item.title}
        </AppText>
        {/* The SAME artist the row and the media catalogue name — an
            unnamed track is 'Unknown Artist' everywhere in the app. */}
        <AppText variant="caption" color="tertiary" numberOfLines={1} style={styles.cardArtist}>
          {artistNameOf(item)}
        </AppText>
      </TouchableOpacity>
    ),
    [colors, animStyles, playTrack],
  );

  const renderListItem = useCallback(
    ({item, index}: {item: ScannedTrack; index: number}) => (
      <TouchableOpacity
        style={[
          styles.listItem,
          {backgroundColor: colors.background.elevated, borderColor: colors.border.subtle},
          animStyles[index] || {},
        ]}
        activeOpacity={0.7}
        onPress={() => playTrack(item)}
        onLongPress={() => setMenuTrack(item)}
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityLabel={item.title}
        accessibilityHint={text.menu.longPressHint}>
        <View style={[styles.listThumb, {backgroundColor: colors.accent.goldDim}]}>
          <SvgIcon name="video" size={20} color={colors.accent.gold} />
        </View>
        <View style={styles.listInfo}>
          <AppText variant="body2" color="primary" numberOfLines={1}>
            {item.title}
          </AppText>
          <AppText variant="caption" color="tertiary" numberOfLines={1}>
            {rowSubtitle(item)}
          </AppText>
        </View>
        <SvgIcon name="chevronRight" size={16} color={colors.text.tertiary} />
      </TouchableOpacity>
    ),
    [colors, animStyles, playTrack],
  );

  // The caption — what the list is ordered by, and how much of it the
  // search term kept.
  const caption =
    videoTracks.length > 0 ? (
      <View style={styles.caption}>
        <AppText variant="caption" color="tertiary">
          {text.caption.sortedBy.replace('{sort}', sortLabel)}
          {ctx.query.trim()
            ? ' · ' +
              text.caption.count
                .replace('{shown}', String(visibleTracks.length))
                .replace('{total}', String(videoTracks.length))
            : ''}
        </AppText>
      </View>
    ) : null;

  // The list's two empty states: the page has no video AT ALL, or the
  // search term kept none of it.
  const emptyState =
    videoTracks.length === 0 ? (
      <EmptyState
        icon="video"
        title={text.states.emptyTitle}
        description={text.states.emptyMessage}
      />
    ) : visibleTracks.length === 0 ? (
      <EmptyState
        icon="search"
        title={text.states.noResultsTitle}
        description={text.states.noResultsMessage}
      />
    ) : null;

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={refresh}
      tintColor={colors.accent.gold}
      colors={[colors.accent.gold]}
    />
  );

  return (
    <View style={styles.sectionRoot}>
      {caption}
      {visibleTracks.length === 0 ? (
        <View style={[styles.listSlotGrow, styles.emptyWrapper]}>
          {emptyState}
        </View>
      ) : isGrid ? (
        <FlatList
          testID="section-AllVideosScreen-list"
          style={styles.list}
          data={visibleTracks}
          renderItem={renderGridItem}
          keyExtractor={item => item.uri}
          numColumns={COLUMN_COUNT}
          columnWrapperStyle={{gap: GAP}}
          contentContainerStyle={[
            styles.listContent,
            {paddingBottom: bottomChromeInset + FAB_SIZE + spacing.md},
          ]}
          showsVerticalScrollIndicator={false}
          windowSize={5}
          maxToRenderPerBatch={10}
          removeClippedSubviews={true}
          refreshControl={refreshControl}
        />
      ) : (
        <FlatList
          testID="section-AllVideosScreen-list"
          style={styles.list}
          data={visibleTracks}
          renderItem={renderListItem}
          keyExtractor={item => item.uri}
          contentContainerStyle={[
            styles.listContent,
            {paddingBottom: bottomChromeInset + FAB_SIZE + spacing.md},
          ]}
          showsVerticalScrollIndicator={false}
          windowSize={5}
          maxToRenderPerBatch={10}
          removeClippedSubviews={true}
          refreshControl={refreshControl}
        />
      )}

      <MediaActionsSheet
        visible={menuTrack !== null}
        onClose={() => setMenuTrack(null)}
        title={menuTrack?.title ?? ''}
        actions={menuActions}
      />
      <PlaylistSheet
        visible={sheetItem !== null}
        onClose={() => setSheetItem(null)}
        currentItem={sheetItem ?? {fileUri: '', title: '', duration: 0}}
      />
    </View>
  );
};