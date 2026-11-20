// ─── Archive — Browse Content ──────────────────────────────────────────
// The list the browse shell hosts.
//
// WAVE B22 — rewritten from the screen's own hand-rolled shell.
//
// It used to draw its own `InternalHeader`, its own `SearchBar`, TWO
// `FilterChips` rows (quick-search presets AND the media scope), its own
// `Placeholder` states and NO footer at all — so the list simply stopped
// where the first page ended, with nothing on screen to say why.
//
// It is now the same content component every other browse screen has:
//
//   • the shell owns the header, the search field, the chip strip, the
//     filter FAB and the filter sheet;
//   • `ListStates` owns loading / error / empty;
//   • `BrowseFooter` owns the four footer branches;
//   • `useListEnd` tells the shell when the list is finished AND the user
//     is at its end, so the filter button can step aside;
//   • the drag guard stops a list that fits on one screen from fetching a
//     page nobody asked for;
//   • `usePullToRefresh` owns the refresh spinner, so it tracks the
//     GESTURE and not the query.
//
// THE FOOTER'S ENDING
// ------------------
// The shared footer's default end-of-list sentence is "You're all caught
// up." — and it is only true when the source really gave everything it
// has. The archive does not: it reports a total (`numFound`) and it
// pages, but it refuses to serve rows past 10,000 (measured 2026-11-18:
// `rows=20` page 500 answers, page 501 answers HTTP 507). A list that
// stopped there has NOT caught up, so it carries the archive's OWN ending
// — the same `endLabel` the Movies screen uses for the same reason, with
// the archive's own numbers and the archive's own wording.
//
// The label may ONLY claim the archive stopped paging when the archive's
// paging cap is what ended the list. A SHORT page ends the list too (the
// source simply ran out of rows) and there "You're all caught up." is
// the truth.

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, RefreshControl, View} from 'react-native';
import {FAB_SIZE} from '../../../components/core/Fab/Fab';
import {useBottomChromeInset} from '../../../infrastructure/player/miniPlayerChrome';
import {useListEnd} from '../../_shared/useListEnd';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {useArchiveData} from './ArchiveDataProvider';
import {ArchiveRowCard} from './ArchiveRowCard';
import {BrowseFooter} from '../../_shared/BrowseListFooter';
import {ListStates} from './ListStates';
import {createArchiveScreenStyles} from '../styles';
import text from '../related/textContent.json';
import type {ArchiveListItem} from '../hooks/useArchiveScreen';
import type {
  ArchiveMediaType,
  ArchiveRow,
  SectionBrowseConfig,
  SectionRenderContext,
} from '../types';

/**
 * One row of either mediatype.
 *
 * The audio shape carries a `runtime` string; the video shape a
 * `duration` in seconds. The row shows the audio runtime and the video's
 * year — the meta the screen has always shown for each.
 */
function toArchiveRow(item: ArchiveListItem): ArchiveRow {
  if ('runtime' in item) {
    return {
      identifier: item.identifier,
      title: item.title,
      creator: item.creator,
      image: item.imageUrl,
      subtitle: [item.year, item.runtime].filter(Boolean).join(' · '),
    };
  }
  return {
    identifier: item.identifier,
    title: item.title,
    creator: item.creator,
    image: item.imageUrl,
    subtitle: item.year,
  };
}

 const ArchiveContent: React.FC<{ctx: SectionRenderContext}> = ({ctx}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createArchiveScreenStyles(colors), [colors]);
  // The app's ONE bottom-chrome rule: the safe area, or the mini-player
  // dock if one is up, plus a spacing step. The FAB's own height goes
  // on top so the last row clears the BUTTON.
  const bottomChromeInset = useBottomChromeInset();
  const {
    scope,
    items,
    numFound,
    hasLoaded,
    isLoading,
    isLoadingMore,
    hasNextPage,
    error,
    pageError,
    fetchNextPage,
    refetch,
    refreshing,
    refresh,
    isSearchActive,
    activeTerm,
    isUsingScopeDefault,
    reachedPagingCeiling,
    setScope,
    setSearchTerm,
    handleRowPress,
  } = useArchiveData();
  const {offline} = ctx;

  // The shell owns the selected scope; the content hands it down.
  //
  // The scope group is SINGLE-select (the archive's adapter exposes two
  // searches — audio and movies — and two mediatypes at once is not a
  // scope), so the first key is the only key there can be. An empty
  // selection means the group's DEFAULT ('audio'), which is what the
  // sheet draws as applied.
  const rawFilter = ctx.options.filter;
  const scopeKey = Array.isArray(rawFilter)
    ? rawFilter[0] ?? ''
    : rawFilter ?? '';
  const nextScope: ArchiveMediaType = scopeKey === 'video' ? 'video' : 'audio';

  // Keep the fetch scope keyed by the shell's debounced search term.
  useEffect(() => {
    setSearchTerm(ctx.query);
  }, [ctx.query, setSearchTerm]);

  // Sync the FAB filter → the hook's active scope.
  useEffect(() => {
    setScope(nextScope);
  }, [nextScope, setScope]);

  const rows = useMemo<ArchiveRow[]>(
    () => items.map(toArchiveRow),
    [items],
  );

  const userDraggedRef = useRef(false);
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
  const reachedEnd = hasLoaded && !error && !hasNextPage;

  // The archive stops paging at 10,000 rows, so the list can end at a
  // WINDOW and not at "everything". That ending is a LABEL on the shared
  // footer, not a second footer — and it may only say so when the
  // archive's paging cap is what ended the list.
  const windowEndLabel = useMemo(() => {
    if (!reachedPagingCeiling) {
      return undefined;
    }
    return text.footer.windowEnd
      .replace('{shown}', rows.length.toLocaleString())
      .replace('{total}', numFound.toLocaleString());
  }, [reachedPagingCeiling, rows.length, numFound]);

  // The list tells the shell when it is finished AND the user is at its
  // end, so the shell can get the floating filter button out of the way
  // (see `_shared/useListEnd.ts`).
  const {onScroll, onContentSizeChange} = useListEnd(
    ctx.setAtListEnd,
    reachedEnd,
  );

  // WHAT THE LIST IS BROWSING.
  //
  // The archive's scope has a curated browse default, and while the
  // search field is empty the source answers THAT term — so the list
  // was answering a question the user could not see (B16-J-ARCHIVE-
  // DEFAULT). The caption says which term is being browsed, in the
  // shell's own caption affordance (the All Videos screen's "Sorted by
  // Title" is the same one).
  //
  // It appears ONLY while the scope's default is what is being browsed:
  // a term the user typed is already visible in the search field, and
  // saying it twice is noise.
  const caption = isUsingScopeDefault ? (
    <View style={styles.caption}>
      <AppText variant="caption" color="tertiary">
        {text.caption.browsing.replace('{term}', activeTerm)}
      </AppText>
    </View>
  ) : null;

  if (showLoadingEarly) {
    return (
      <View style={styles.sectionRoot}>
        {caption}
        <ListStates
          state="loading"
          offline={offline}
          isSearchActive={isSearchActive}
          onRetry={() => {}}
        />
      </View>
    );
  }

  return (
    <View style={styles.sectionRoot}>
      {caption}
      <FlatList
        testID="section-ArchiveScreen-list"
        style={styles.list}
        numColumns={1}
        data={rows}
        keyExtractor={item => item.identifier}
        renderItem={({item}) => (
          <ArchiveRowCard row={item} scope={scope} onPress={handleRowPress} />
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
              errorMessage={error}
              onRetry={refetch}
            />
          ) : null
        }
        ListFooterComponent={
          <BrowseFooter
            isLoadingMore={isLoadingMore}
            hasLoaded={hasLoaded}
            // The LOAD-MORE error, not the list's error: a first-load
            // failure is the error card's business, and the footer saying
            // it too announced the same failure twice — and wrongly
            // ("Couldn't load MORE" for a load-more that never started).
            error={pageError}
            reachedEnd={reachedEnd}
            shown={rows.length}
            onLoadMore={fetchNextPage}
            endLabel={windowEndLabel}
          />
        }
        onScrollBeginDrag={() => {
          userDraggedRef.current = true;
        }}
        onEndReached={() => {
          // The drag guard: a scope whose whole result set fits on one
          // screen fires `onEndReached` the moment the list mounts, and
          // the page nobody asked for is a wasted request.
          if (!userDraggedRef.current) return;
          if (hasNextPage && !isLoadingMore) fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        onScroll={onScroll}
        onContentSizeChange={onContentSizeChange}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            // The GESTURE owns the spinner, not the query. See
            // `_shared/pullToRefresh.ts`.
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.accent.gold}
            colors={[colors.accent.gold]}
          />
        }
      />
    </View>
  );
};

export const renderArchiveContent: SectionBrowseConfig['renderContent'] = ctx => (
  <ArchiveContent ctx={ctx} />
);
