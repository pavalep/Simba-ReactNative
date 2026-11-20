// ─── All Audio — Browse Content ─────────────────────────────────────────
// The list the browse shell hosts.
//
// WAVE B16 (Wave B) — rewritten from the screen's own hand-rolled shell.
//
// The shell owns the header, the search field, the chip strip, the
// filter FAB and the filter sheet. This component owns the list, the
// list's states, and the ROW MENU — the long-press menu the All Audio
// rows had no way to open (B16-J-ALLAUDIO).

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {FlatList, RefreshControl, TouchableOpacity, View} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {FAB_SIZE} from '../../../components/core/Fab/Fab';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {MediaActionsSheet} from '../../../components/sheets/MediaActionsSheet/MediaActionsSheet';
import {
  PlaylistSheet,
  type PlaylistSheetProps,
} from '../../../components/sheets/PlaylistSheet';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {useAnimatedEntrance} from '../../../hooks/useAnimatedEntrance';
import {useQueueActions} from '../../../hooks/useQueueActions';
import {useBottomChromeInset} from '../../../infrastructure/player/miniPlayerChrome';
import type {ScannedTrack} from '../../../state';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {formatDuration} from '../../../utils/timeAgo';
import {useAllAudioData} from './AllAudioDataProvider';
import {artistNameOf} from '../related/browseConfig';
import {createAllAudioScreenStyles, COLUMN_COUNT, GAP} from '../styles';
import type {SectionRenderContext} from '../types';
import text from '../related/textContent.json';

/**
 * The row's second line.
 *
 * The duration is dropped when the scan does not know it — the shared
 * formatter answers '' for a zero length — so the row does not end in
 * a separator with nothing after it.
 */
function rowSubtitle(track: ScannedTrack): string {
  const artist = track.artist || 'Unknown Artist';
  const duration = formatDuration(track.duration);
  return duration ? artist + ' · ' + duration : artist;
}

export const AllAudioContent: React.FC<{ctx: SectionRenderContext}> = ({ctx}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createAllAudioScreenStyles(), []);
  // The app's ONE bottom-chrome rule: the safe area, or the mini-player
  // dock if one is up, plus a spacing step. The FAB's own height goes on
  // top so the last row clears the BUTTON.
  const bottomChromeInset = useBottomChromeInset();
  const {
    tracks,
    visibleTracks,
    scopeArtist,
    sortLabel,
    playTrack,
    refreshing,
    refresh,
    setArtist,
    setQuery,
    setSort,
  } = useAllAudioData();

  // ── The scope the shell owns, pushed down into the provider ──────────
  // The ARTIST filter, the search term and the SORT all live in the
  // option model; the provider owns the data they scope.
  const artist = ctx.options.filter?.[0] ?? '';
  const sort = ctx.options.sort ?? '';
  useEffect(() => {
    setArtist(artist);
  }, [artist, setArtist]);
  useEffect(() => {
    setQuery(ctx.query);
  }, [ctx.query, setQuery]);
  useEffect(() => {
    setSort(sort);
  }, [sort, setSort]);

  // The VIEW — a rendering choice rather than a data scope, so it is
  // read from the shell's context directly.
  const isGrid = ctx.options.view !== 'list';

  // ── The row menu (B16-J-ALLAUDIO) ───────────────────────────────────
  // A long press opens `MediaActionsSheet` — the app's ONE media menu
  // (58.4/58.5) — with the same three rows the All Videos list offers:
  // Play Next, Add to Queue and Add to Playlist. The All Audio rows had
  // NO menu at all, so an audio file could not be played next or queued
  // from that list while the same file could be from every other one.
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
      // (`type: 'music'`, `mediaType: 'audio'`, `source: 'local'`) — the
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
          <SvgIcon name="music" size={28} color={colors.accent.gold} />
        </View>
        <AppText variant="caption" color="primary" numberOfLines={2} style={styles.cardTitle}>
          {item.title}
        </AppText>
        {/* The SAME artist the row and the artist axis name — an
            unnamed track is 'Unknown Artist' everywhere on the page. */}
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
          <SvgIcon name="music" size={20} color={colors.accent.gold} />
        </View>
        <View style={styles.listInfo}>
          <AppText variant="body2" color="primary" numberOfLines={1}>
            {item.title}
          </AppText>
          <AppText variant="caption" color="tertiary" numberOfLines={1}>
            {rowSubtitle(item)}
          </AppText>
        </View>
        <SvgIcon
          name="chevronRight"
          size={16}
          color={colors.text.tertiary}
        />
      </TouchableOpacity>
    ),
    [colors, animStyles, playTrack],
  );

  // The caption — what the list is ordered by, and how much of it the
  // search term kept.
  const caption =
    tracks.length > 0 ? (
      <View style={styles.caption}>
        <AppText variant="caption" color="tertiary">
          {text.caption.sortedBy.replace('{sort}', sortLabel)}
          {ctx.query.trim()
            ? ' · ' +
              text.caption.count
                .replace('{shown}', String(visibleTracks.length))
                .replace('{total}', String(tracks.length))
            : ''}
        </AppText>
      </View>
    ) : null;

  // The list's two empty states: the page has no audio AT ALL, or the
  // scope it is under has none.
  const emptyState =
    tracks.length === 0 ? (
      <EmptyState
        icon="music"
        title={text.states.emptyTitle}
        description={text.states.emptyMessage}
      />
    ) : visibleTracks.length === 0 ? (
      <EmptyState
        icon="search"
        title={
          scopeArtist
            ? text.states.noArtistTitle.replace('{artist}', scopeArtist)
            : text.states.noResultsTitle
        }
        description={
          scopeArtist
            ? text.states.noArtistMessage.replace('{artist}', scopeArtist)
            : text.states.noResultsMessage
        }
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
          testID="section-AllAudioScreen-list"
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
          testID="section-AllAudioScreen-list"
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
