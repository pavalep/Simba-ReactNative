// ─── Radio — Browse Content ──────────────────────────────────────────
// The list the browse shell hosts.
//
// It used to draw its own shell — its own `InternalHeader`, `SearchBar`,
// gold active-filter chips, `Fab` and `FilterSheet` — so navigating from
// Music to Radio changed the page's furniture. It is now the same
// content component every other browse screen has:
//
//   • the SHELL owns the header, the search field, the chip strip, the
//     filter FAB and the filter sheet;
//   • `ListStates` owns loading / error / empty;
//   • `BrowseFooter` owns the four footer branches;
//   • `useListEnd` tells the shell when the list is finished AND the
//     user is at its end, so the filter button can step aside;
//   • the drag guard stops a list that fits on one screen from fetching
//     a page nobody asked for;
//   • `usePullToRefresh` owns the refresh spinner, so it tracks the
//     GESTURE and not the query.
//
// THE THREE AXES
// --------------
// The shell owns the filter selections, and it holds them PER AXIS
// (`ctx.options.filters?.genre` / `.country` / `.language`) because a
// flat list cannot say which axis a key belongs to — the genre 'Rock'
// and a country called 'Rock' are the same string.
//
// THE ROW MENU
// ------------
// The app's ONE media menu (`MediaActionsSheet`), offering what a
// station can actually do:
//
//   • Play Next / Add to Queue — a station IS a playable stream URL, and
//     both go through the app's ONE queue wrapper (`useQueueActions`),
//     which owns the toast and the Undo.
//
//   • Favourite — the station's own save action.
//
//   • Share — the app's ONE share target.
//
// "Add to Playlist" is GONE. The app's playlist rule refuses radio
// (`PLAYLIST_ALLOWED_MEDIA_KINDS` in `src/types/playlist.ts`: "a lane is
// not a permission"), so the sheet it opened listed NO compatible
// playlist — a control that cannot act must not occupy space. A
// bookmark is gone for the same reason it does not belong to a live
// stream: a bookmark is a POSITION in a file, and a station has none.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, RefreshControl, View} from 'react-native';
import {FAB_SIZE} from '../../../components/core/Fab/Fab';
import {useBottomChromeInset} from '../../../infrastructure/player/miniPlayerChrome';
import {useListEnd} from '../../_shared/useListEnd';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {MediaActionsSheet, type MediaAction} from '../../../components/sheets/MediaActionsSheet/MediaActionsSheet';
import {useQueueActions} from '../../../hooks/useQueueActions';
import {useToast} from '../../../components/feedback/Toast';
import {useHaptics} from '../../../hooks/useHaptics';
import {shareContent} from '../../../services/shareService';
import {useRadioData} from './RadioDataProvider';
import {RadioStationCard} from './RadioStationCard';
import {ListStates} from './ListStates';
import {BrowseFooter} from '../../_shared/BrowseListFooter';
import {createRadioScreenStyles} from '../styles';
import {toRow, stationQueueItem, type StationRow} from '../related/stationRow';
import text from '../related/textContent.json';
import type {SectionRenderContext} from '../types';

export const RadioContent: React.FC<{ctx: SectionRenderContext}> = ({ctx}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createRadioScreenStyles(colors), [colors]);
  // The app's ONE bottom-chrome rule: the safe area, or the mini-player
  // dock if one is up, plus a spacing step. The FAB's own height goes
  // on top so the last row clears the BUTTON.
  const bottomChromeInset = useBottomChromeInset();
  const {
    items,
    hasLoaded,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    pageError,
    loadMore,
    retry,
    refreshing,
    refresh,
    isSearchActive,
    isFavoriteId,
    toggleFavorite,
    handleStationPress,
    setScope,
  } = useRadioData();
  const {offline} = ctx;

  // The shell owns the three axes. A group's selection is a LIST (the
  // shell's model), and each axis is single-select, so the FIRST key is
  // the only key there can be.
  const filters = ctx.options.filters;
  const genre = filters?.genre?.[0] ?? '';
  const country = filters?.country?.[0] ?? '';
  const language = filters?.language?.[0] ?? '';
  const hasFilters = Boolean(genre || country || language);

  // Keep the fetch scope keyed by the shell's scope: the three axes and
  // the debounced search term. The scope is part of the queryKey, so
  // changing it re-points the query (or returns the cached result if the
  // user has visited that scope before).
  useEffect(() => {
    setScope({
      genre,
      country,
      language,
      searchTerm: ctx.query,
    });
  }, [genre, country, language, ctx.query, setScope]);

  const rows = useMemo(() => items.map(toRow), [items]);

  // ── The station menu ───────────────────────────────────────────────
  const toast = useToast();
  const haptics = useHaptics();
  // The app's ONE queue wrapper: it owns the queue-store call AND the
  // toast (with its Undo), so this screen never calls the queue store
  // directly and never raises a queue toast by hand.
  const {playNext, addToQueue} = useQueueActions();
  const [menuRow, setMenuRow] = useState<StationRow | null>(null);

  const handleLongPress = useCallback((row: StationRow) => {
    setMenuRow(row);
  }, []);

  const menuActions = useMemo<MediaAction[]>(() => {
    if (!menuRow) return [];
    const queueItem = stationQueueItem(menuRow);
    const isFavorite = isFavoriteId(menuRow.id);
    return [
      {
        label: text.menu.playNext,
        icon: 'skipForward',
        onPress: () => playNext(queueItem),
      },
      {
        label: text.menu.addToQueue,
        icon: 'list',
        onPress: () => addToQueue(queueItem),
      },
      {
        label: isFavorite ? text.menu.removeFavorite : text.menu.addFavorite,
        icon: 'heart',
        onPress: () => {
          toggleFavorite(menuRow);
          haptics.light();
          toast.show(
            isFavorite
              ? text.toasts.removedFromFavorites
              : text.toasts.savedToFavorites,
          );
        },
      },
      {
        label: text.menu.share,
        icon: 'share',
        onPress: () =>
          shareContent({
            // ONE share target for the whole feature, and the params the
            // linking config actually parses: `SongScreen` parses
            // `fileUri` and `title` (`navigation/linking.ts`).
            route: 'SongScreen',
            params: {fileUri: menuRow.url, title: menuRow.name, source: 'radio'},
            title: menuRow.name,
            subtitle: menuRow.subtitle,
          }),
      },
    ];
  }, [
    menuRow,
    isFavoriteId,
    toggleFavorite,
    playNext,
    addToQueue,
    haptics,
    toast,
  ]);

  // ── Content states ──
  const listState: 'loading' | 'error' | 'empty' | undefined =
    !hasLoaded && isLoading
      ? 'loading'
      : !!error && rows.length === 0
      ? 'error'
      : !error && rows.length === 0
      ? 'empty'
      : undefined;

  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  const showLoadingEarly = !hasMounted || (!hasLoaded && isLoading);

  // The source has nothing further to give.
  const reachedEnd = hasLoaded && !error && !hasMore;

  // The list tells the shell when it is finished AND the user is at its
  // end, so the shell can get the floating filter button out of the way
  // (see `_shared/useListEnd.ts`).
  const {onScroll, onContentSizeChange} = useListEnd(
    ctx.setAtListEnd,
    reachedEnd,
  );

  // Set by the first touch-scroll — see the `onEndReached` guard below.
  const userDraggedRef = useRef(false);

  // The sheet renders in BOTH branches: a long press can only happen
  // while the list is up, but a scope change must not unmount an open
  // sheet mid-gesture.
  const sheet = (
    <MediaActionsSheet
      visible={menuRow !== null}
      onClose={() => setMenuRow(null)}
      title={menuRow?.name ?? ''}
      subtitle={menuRow?.subtitle}
      actions={menuActions}
    />
  );

  if (showLoadingEarly) {
    return (
      <View style={styles.sectionRoot}>
        <ListStates
          state="loading"
          offline={offline}
          isSearchActive={isSearchActive}
          hasFilters={hasFilters}
        />
        {sheet}
      </View>
    );
  }

  return (
    <View style={styles.sectionRoot}>
      <FlatList
        testID="section-RadioScreen-list"
        style={styles.list}
        data={rows}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <RadioStationCard
            row={item}
            isFavorite={isFavoriteId(item.id)}
            onPress={handleStationPress}
            onLongPress={handleLongPress}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          {paddingBottom: bottomChromeInset + FAB_SIZE + spacing.md},
          listState ? styles.listSlotGrow : null,
        ]}
        ListEmptyComponent={
          listState ? (
            <ListStates
              state={listState}
              offline={offline}
              isSearchActive={isSearchActive}
              hasFilters={hasFilters}
              error={error}
              onRetry={retry}
            />
          ) : null
        }
        ListFooterComponent={
          <BrowseFooter
            isLoadingMore={isLoadingMore}
            hasLoaded={hasLoaded}
            // The LOAD-MORE error, not the list's error: a first-load
            // failure is the error card's business, and the footer
            // saying it too announced the same failure twice.
            error={pageError}
            reachedEnd={reachedEnd}
            shown={rows.length}
            onLoadMore={loadMore}
          />
        }
        onScrollBeginDrag={() => {
          userDraggedRef.current = true;
        }}
        onEndReached={() => {
          // The drag guard: a list that is shorter than the viewport
          // fires `onEndReached` the moment it mounts, and a page that
          // nobody asked for is a wasted request.
          if (!userDraggedRef.current) return;
          loadMore();
        }}
        onEndReachedThreshold={0.4}
        onScroll={onScroll}
        onContentSizeChange={onContentSizeChange}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            // The GESTURE owns the spinner, not the query — see
            // `_shared/pullToRefresh.ts`.
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.accent.gold}
            colors={[colors.accent.gold]}
          />
        }
      />
      {sheet}
    </View>
  );
};
