// ─── SearchScreen ────────────────────────────────────────────────────────
// The page that follows Home.
//
// 2026-11-12 (SEARCH_PAGE_REDESIGN) — the page was rebuilt on the
// app's own Home/Profile grammar. The full inventory of what was wrong
// and the design it was rebuilt to are in `md/SEARCH_PAGE_REDESIGN.md`.
// The short version:
//
//   • ONE header grammar (`InternalHeader`), ONE gutter (16 dp), ONE
//     title grammar (the gold Cormorant divider), ONE row (the Profile's
//     `SettingsRow` anatomy).
//   • NO white pill chips: the source scope is a text row with a gold
//     underline, the app's own segment grammar.
//   • NO rounded cards and NO discs: every result is an unboxed,
//     hairline-separated row.
//   • THE FILTERS REACH EVERYTHING. The scope, the media-kind filter and
//     the sort are applied to the local results AND the remote ones.
//     Before this, the filter sheet only reached the local results, so on
//     a query answered by the APIs it did nothing at all — proven on the
//     device, in `md/SEARCH_PAGE_REDESIGN.md` §2.1.
//
// The page is a BROWSE page first: the recent searches and the trending
// are real content, so the field does NOT autofocus and the page opens
// on them, calm.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../../theme';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {SimbaStatusBar} from '../../../components/StatusBar';
import {AppText} from '../../../components/core/AppText/AppText';
import {Placeholder} from '../../../components/feedback/Placeholder';
import {useSettingsStore, usePlayerStore} from '../../../state';
import {
  isBlockedError,
  isExpiredError,
  isLaunchError,
  isNetworkError,
  isUnsupportedError,
  usePlay,
} from '../../../infrastructure/player';
import {useToast} from '../../../components/feedback/Toast';

import {useSearch} from '../../../hooks/useSearch';
import {useRecentHistory} from '../../../features/recentHistory';
import type {SearchScreenProps} from '../types';
import {spacing} from '../../../theme/tokens';
import {InternalHeader} from '../../../components/layout/InternalHeader/InternalHeader';
import {isVideoFile} from '../../../utils/timeAgo';

import {SearchBar} from '../../../components/core/SearchBar/SearchBar';
import {RecentSearches} from '../components/RecentSearches';
import {SearchResults} from '../components/SearchResults';
import {useAggregatedSearch} from '../hooks/useAggregatedSearch';
import {SegmentRow} from '../../../components/utility/SegmentRow/SegmentRow';
import {FilterSheet, type FilterSheetGroup} from '../../../components/sheets/FilterSheet/FilterSheet';
import {Fab, FAB_SIZE} from '../../../components/core/Fab/Fab';
import {SubsectionTitle} from '../../../components/utility/SubsectionTitle/SubsectionTitle';
import {RemoteResults, type RemoteResultsHandlers} from '../components/RemoteResults';
import {SearchResultRow} from '../components/SearchResultRow';
import {
  getRecentSearches,
  saveRecentSearches,
} from '../../../services/recentSearchService';
import {
  applyLocalFilters,
  applyRemoteFilters,
  countRemoteResults,
  SEARCH_SCOPES,
  type MediaKindFilter,
  type SearchScope,
  type SearchSort,
} from '../utils/searchFilters';
import type {SearchResultItem} from '../../../hooks/useSearch';
import type {
  AudiobookResult,
  AudiusTrackResult,
  InternetArchiveItemResult,
  IPTVChannelResult,
  JamendoTrackResult,
} from '../../../types/api';

type Props = SearchScreenProps;

/**
 * The page's gutter.
 *
 * The rows are FULL BLEED — the hairline runs the whole width — and each
 * one carries its own 16 dp, exactly like the Profile page's
 * `SettingsRow`. The dividers (`SubsectionTitle`), the scope row
 * (`SegmentRow`) and the field wrapper carry the same 16. One number,
 * one left edge.
 */
const GUTTER = spacing.lg;

/**
 * The two groups that live BEHIND the filter button.
 *
 * 2026-11-12 (SEARCH_PAGE_REDESIGN): these were six always-visible
 * controls (three type chips, a "Sort:" label and three sort options)
 * taking two whole rows of the screen to operate one value each. They
 * are the app's own `FilterSheet` groups now — the same component the
 * browse screens feed a `filter` group and a `sort` group.
 *
 * "Date" is GONE: only the recent-history entries carry a date
 * (`useSearch.ts` sets `lastPlayedAt` on that one source), so on every
 * other result it was a control that did nothing.
 */
const FILTER_GROUPS: FilterSheetGroup[] = [
  {
    id: 'type',
    title: 'Type',
    multiSelect: false,
    rows: [
      {key: 'all', label: 'All'},
      {key: 'videos', label: 'Videos'},
      {key: 'audio', label: 'Audio'},
    ],
  },
  {
    id: 'sort',
    title: 'Sort by',
    multiSelect: false,
    rows: [
      {key: 'relevance', label: 'Relevance'},
      {key: 'name', label: 'Name'},
    ],
  },
];

/**
 * The local groups, in the order they are drawn.
 *
 * The order is the library's own order: who it is by, then what it is,
 * then the files. "Folders" is last — it is a path, not a thing.
 */
const LOCAL_GROUPS: {key: string; label: string}[] = [
  {key: 'artists', label: 'Artists'},
  {key: 'albums', label: 'Albums'},
  {key: 'playlists', label: 'Playlists'},
  {key: 'videos', label: 'Videos'},
  {key: 'audio', label: 'Audio'},
  {key: 'folders', label: 'Folders'},
];

/**
 * What the page says when a scope has nothing.
 *
 * One line, in the scope's own words — a page that says "No results"
 * when the user asked for the TV catalogue is not answering the question
 * they asked.
 */
const NO_RESULTS_COPY: Record<SearchScope, string> = {
  all: 'No results for',
  local: 'Nothing in your library matches',
  music: 'No music matches',
  tv: 'No channels match',
  audiobooks: 'No audiobooks match',
  archive: 'No archive items match',
};

export const SearchScreen: React.FC<Props> = ({navigation}) => {
  const {theme, colors} = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();

  const {list: recentFiles} = useRecentHistory();
  // V21 typed facade — awaited + Result pattern-match so failures
  // surface as toasts. The 4 call sites below (file/track/audius/
  // live-tv) all share this helper.
  const play = usePlay();
  const toast = useToast();
  // Centralised error-to-toast mapping. Pre-V21 the 4 call sites
  // called `openPlayer` directly: not awaited (rejection became
  // unhandled promise rejection) and `false` return discarded
  // silently.
  const playWithToast = useCallback(
    async (input: {
      uri: string;
      title: string;
      mediaType: 'movie' | 'music' | 'podcast' | 'live-tv' | 'audiobook' | 'video' | 'audio';
      /**
       * The artwork this result has in hand, when it has one.
       *
       * B-026: the seam ACCEPTED artwork (`openPlayer` takes a
       * `thumbnailPath` and forwards it as the notification's
       * `artworkPath`) and every caller left the field out, so the
       * session carried no artwork, the checkpoint wrote the history
       * entry with `thumbnailPath: ''`, and the tile the user can
       * actually reach — the one for a film they have already watched
       * — had nothing to draw.
       */
      thumbnailPath?: string;
    }) => {
      const result = await play(input);
      if (result.ok) return;
      if (isNetworkError(result.error)) {
        toast.show(
          'No connection. The media will open when you are online.',
          'warning',
          {duration: 6000},
        );
      } else if (isUnsupportedError(result.error)) {
        toast.show(
          'This media format is not supported by the player.',
          'error',
          {duration: 6000},
        );
      } else if (isExpiredError(result.error)) {
        toast.show('Sign in expired. Please sign in again.', 'warning', {
          duration: 6000,
        });
      } else if (isBlockedError(result.error)) {
        toast.show(
          'This content is not available in your region.',
          'error',
          {duration: 6000},
        );
      } else if (isLaunchError(result.error)) {
        // B-009: surface the typed bridge rejection code.
        const detail = result.error.code ? ` [${result.error.code}]` : '';
        toast.show(
          `Player couldn’t start${detail ? ` — ${detail}` : ''}. ${result.error.message}`,
          'error',
          {duration: 8000},
        );
      } else {
        toast.show(
          'Could not open the player. Please try again.',
          'error',
          {duration: 6000},
        );
      }
    },
    [play, toast],
  );

  const playlist = usePlayerStore(s => s.playlist);
  const videoFolders = useSettingsStore(state => state.videoFolders);
  const audioFolders = useSettingsStore(state => state.audioFolders);

  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  /**
   * The scope — which catalogue the results come from.
   *
   * It is part of the RESULTS state: it appears with the results and
   * disappears when the query is cleared, at which point it resets to
   * "All". It is never a hidden state.
   */
  const [scope, setScope] = useState<SearchScope>('all');
  const [kind, setKind] = useState<MediaKindFilter>('all');
  const [sort, setSort] = useState<SearchSort>('relevance');
  const [sheetVisible, setSheetVisible] = useState(false);
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

  // V18.6.2a: remote sources via 5 parallel useApiQuery calls inside
  // useAggregatedSearch (per-source error isolation). The pre-V18.6
  // searchAggregator was deleted in V18.6.2d; the hook is
  // now the only aggregation entry point.
  //
  // 2026-11-12: the hook's own 450 ms debounce is gone (it is 0 now),
  // so the remote results answer at the SAME 300 ms as the local ones
  // instead of 750 ms after the last keystroke.
  const {
    results: remoteResults,
    isLoading: remoteLoading,
    trending,
  } = useAggregatedSearch(debouncedQuery);

  const hasQuery = searchText.trim().length > 0;

  /**
   * The scope follows the query.
   *
   * The scope row is part of the results state, so an empty query means
   * no scope — and the scope resets rather than lingering invisibly.
   */
  useEffect(() => {
    if (!hasQuery && scope !== 'all') {
      setScope('all');
    }
  }, [hasQuery, scope]);

  // ── The filters ──
  //
  // Both sets of results go through the same two functions, so the sheet
  // reaches everything that is on screen.
  const localResults = useMemo(
    () => applyLocalFilters(allResults, scope, kind, sort),
    [allResults, scope, kind, sort],
  );

  const visibleRemote = useMemo(
    () => applyRemoteFilters(remoteResults, scope, kind, sort),
    [remoteResults, scope, kind, sort],
  );

  // ── Group the local results for display ──
  const groupedResults = useMemo(() => {
    const groups: {key: string; label: string; items: SearchResultItem[]}[] = [];
    LOCAL_GROUPS.forEach(group => {
      const items = localResults.filter(r => r.group === group.key);
      if (items.length > 0) {
        groups.push({key: group.key, label: group.label, items});
      }
    });
    return groups;
  }, [localResults]);

  const hasAnyResults =
    groupedResults.length > 0 || countRemoteResults(visibleRemote) > 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {flex: 1},
        page: {flex: 1},
        scroll: {flex: 1},
        scrollContent: {
          // The rows are full bleed — each one carries its own 16 dp —
          // so the scroller has NO horizontal padding of its own.
          paddingBottom: FAB_SIZE + spacing.xxl + spacing.xl,
        },
        fieldSlot: {
          paddingHorizontal: GUTTER,
          paddingTop: spacing.lg,
          paddingBottom: spacing.md,
        },
        scopeSlot: {
          paddingBottom: spacing.sm,
        },
        hint: {
          paddingHorizontal: GUTTER,
          paddingBottom: spacing.md,
        },
        emptyLine: {
          paddingHorizontal: GUTTER,
          paddingTop: spacing.md,
        },
      }),
    [],
  );

  // ── Handlers ──
  const handleClearSearch = useCallback(() => setSearchText(''), [setSearchText]);
  const handleTermTap = useCallback((term: string) => setSearchText(term), [setSearchText]);
  const handleClearRecent = useCallback(() => setRecentSearches([]), []);
  const handlePlayFile = useCallback(
    (fileUri: string, fileTitle: string, thumbnailPath?: string) => {
      const mediaType = isVideoFile(fileTitle) ? 'video' : 'audio';
      void playWithToast({
        uri: fileUri,
        title: fileTitle,
        mediaType,
        // The grid's own artwork. A result that came from the media
        // store carries the catalogue art; one that came from the
        // history carries whatever the last launch handed over.
        ...(thumbnailPath ? {thumbnailPath} : {}),
      });
    },
    [playWithToast],
  );
  const handleSubmitSearch = useCallback(() => {
    const trimmed = searchText.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(t => t !== trimmed);
      return [trimmed, ...filtered].slice(0, 10);
    });
  }, [searchText]);

  const handleScopeSelect = useCallback((key: string) => {
    setScope(key as SearchScope);
  }, []);

  // ── P40.5: remote rows route to their correct destination ──
  const handlePlayTrack = useCallback(
    (track: JamendoTrackResult) => {
      void playWithToast({
        uri: track.audioUrl,
        title: track.name,
        mediaType: 'music',
        // The cover Jamendo already gave us — it reaches the
        // notification and the history entry from here.
        ...(track.imageUrl ? {thumbnailPath: track.imageUrl} : {}),
      });
    },
    [playWithToast],
  );

  const handlePlayAudius = useCallback(
    (track: AudiusTrackResult) => {
      void playWithToast({
        uri: track.streamUrl,
        title: track.title,
        mediaType: 'music',
        ...(track.artworkUrl ? {thumbnailPath: track.artworkUrl} : {}),
      });
    },
    [playWithToast],
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
      void playWithToast({
        uri: channel.url,
        title: channel.name,
        mediaType: 'live-tv',
        // The channel's logo — the same picture the row draws.
        ...(channel.image ? {thumbnailPath: channel.image} : {}),
      });
    },
    [playWithToast],
  );

  const remoteHandlers: RemoteResultsHandlers = {
    onPlayTrack: handlePlayTrack,
    onPlayAudius: handlePlayAudius,
    onOpenAudiobook: handleOpenAudiobook,
    onOpenArchive: handleOpenArchive,
    onOpenChannel: handleOpenChannel,
  };

  /**
   * How many of the two sheet groups are off their default.
   *
   * The badge counts what the user has NARROWED, so it is 0 in the
   * common case and the button says nothing.
   */
  const activeFilterCount =
    (kind === 'all' ? 0 : 1) + (sort === 'relevance' ? 0 : 1);

  return (
    <View style={styles.root}>
      <SimbaStatusBar variant="home" />
      <LinearGradient
        colors={
          isDark
            ? [colors.background.primary, colors.background.elevated]
            : [colors.background.elevated, colors.background.primary]
        }
        style={StyleSheet.absoluteFill}
      />

      {/*
        The page's own top inset.

        The OLD page wrapped everything in React Native's `SafeAreaView`,
        which applies an inset on iOS and NOTHING on Android — so on
        Android the header sat under the status bar. The browse screens
        do it the other way round: the inset goes on the ROOT's inner
        container, so the gradient still covers the status bar and the
        FAB still measures from the bottom of the screen.
      */}
      <View style={[styles.page, {paddingTop: insets.top}]}>
        {/*
          The FIXED chrome: the header, the field and the scope row do
          not scroll. The field is the page's reason to exist, and losing
          it half a screen down is what made the old page tedious — you
          had to scroll back up to change the query. (YouTube, Apple TV,
          Plex and VLC all keep the field pinned.)
        */}
        <InternalHeader title="Search" />

        <View style={styles.fieldSlot}>
          <SearchBar
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSubmitSearch}
            onClear={handleClearSearch}
            placeholder="Search…"
            accessibilityLabel="Search"
          />
        </View>

        {hasQuery ? (
          <View style={styles.scopeSlot}>
            <SegmentRow
              items={SEARCH_SCOPES}
              selectedKey={scope}
              onSelect={handleScopeSelect}
              accessibilityLabel="Search scope"
            />
          </View>
        ) : null}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {hasQuery ? (
            <>
              {/* ── Loading ── */}
              {isSearching || (remoteLoading && !hasAnyResults) ? (
                <Placeholder variant="loading" anchor="top-third" />
              ) : null}

              {/* ── Local Grouped Results ── */}
              {!isSearching && groupedResults.length > 0 ? (
                <SearchResults
                  groups={groupedResults}
                  query={debouncedQuery}
                  onPlayFile={handlePlayFile}
                  // W22 D-020: the `onNavigate` prop is now typed with
                  // `keyof RootStackParamList` (see `SearchResults.tsx`).
                  // The cast remains `as any` because of the variadic
                  // signature limitation (see `navigationHelper.ts`
                  // for the full rationale + W22 follow-up).
                  onNavigate={(route, params) =>
                    navigation.navigate(route as any, params as any)
                  }
                />
              ) : null}

              {/* ── Remote Results ── */}
              <RemoteResults results={visibleRemote} handlers={remoteHandlers} />

              {/* ── No Results ── */}
              {!isSearching && !remoteLoading && !hasAnyResults ? (
                <View style={styles.emptyLine}>
                  <AppText variant="body2" color="secondary">
                    {NO_RESULTS_COPY[scope]}
                    {debouncedQuery ? ` "${debouncedQuery}"` : ''}
                  </AppText>
                </View>
              ) : null}
            </>
          ) : (
            <>
              {/* ── The empty state: the hint, the recent searches and
                  the trending ── */}
              <View style={styles.hint}>
                <AppText variant="caption" color="tertiary">
                  Search your library, music, live TV, audiobooks and the
                  Internet Archive
                </AppText>
              </View>

              <RecentSearches
                recentSearches={recentSearches}
                onSelect={handleTermTap}
                onClear={handleClearRecent}
              />

              {/* P40.7: trending from real API data when the query is empty */}
              {trending.length > 0 ? (
                <View>
                  <SubsectionTitle label="Trending now" variant="displaySerif" />
                  {trending.map(t => (
                    <SearchResultRow
                      key={String(t.id)}
                      title={t.name}
                      subtitle={t.artistName}
                      artwork={t.imageUrl}
                      icon="music"
                      onPress={() => handlePlayTrack(t)}
                    />
                  ))}
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </View>

      {/*
        The filter button. The app's own `Fab`, with the app's own
        `sliders` glyph — the same button that opens the same sheet on
        Movies, Music, Podcasts, Radio, Live TV and Shows. It appears
        with the results, because that is the only time the sheet has
        anything to filter.
      */}
      <Fab
        icon="sliders"
        onPress={() => setSheetVisible(true)}
        accessibilityLabel="Search filters"
        visible={hasQuery}
        badgeCount={activeFilterCount}
      />

      <FilterSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="Search filters"
        groups={FILTER_GROUPS}
        value={{
          type: [kind],
          sort: [sort],
        }}
        onChange={(groupId, keys) => {
          if (groupId === 'type') {
            setKind((keys[0] ?? 'all') as MediaKindFilter);
          } else {
            setSort((keys[0] ?? 'relevance') as SearchSort);
          }
        }}
      />
    </View>
  );
};
