/**
 * The three browse lists bind the refresh spinner to the GESTURE.
 *
 * ## Why this file exists separately from the hook test
 *
 * `__tests__/screens/MoviesScreen/MoviesPullToRefresh.test.tsx` proves
 * the HOOK's state: while the next page loads, the spinner is off; while
 * the user's own pull-to-refresh runs, it is on.
 *
 * This file proves the BINDING — that each list's `<RefreshControl>`
 * reads that state and NOT the query's fetch flag. The binding is where
 * the bug actually lived:
 *
 *     refreshing={isLoading && hasLoaded}   // ← the old line
 *     refreshing={refreshing}               // ← the gesture's state
 *
 * `isLoading` is TanStack's `isFetching`, which is true for every fetch
 * the query makes, `fetchNextPage` included. So the old line turned the
 * spinner on the moment the user scrolled to the end of the list.
 *
 * All three lists (Music, Movies, Podcasts) carried the same line, so
 * all three are pinned here — one screen fixed is not three screens
 * fixed.
 *
 * The hooks are stubbed so the state under test can be set EXACTLY:
 * the query is fetching the next page (`isLoading` true,
 * `isLoadingMore` true, `hasLoaded` true) while the gesture is idle.
 */

import React from 'react';
import {act, screen} from '@testing-library/react-native';

import {renderWithProviders} from '../helpers/renderWithProviders';
import {MoviesContent} from '../../src/screens/MoviesScreen/components/MoviesContent';
import {MoviesDataProvider} from '../../src/screens/MoviesScreen/components/MoviesDataProvider';
import {MusicContent} from '../../src/screens/MusicScreen/components/MusicContent';
import {MusicDataProvider} from '../../src/screens/MusicScreen/components/MusicDataProvider';
import {PodcastsContent} from '../../src/screens/PodcastsScreen/components/PodcastsContent';
import {PodcastsDataProvider} from '../../src/screens/PodcastsScreen/components/PodcastsDataProvider';
import type {SectionRenderContext} from '../../src/screens/_shared/sectionRenderContext';
import type {
  InternetArchiveVideoResult,
  JamendoTrackResult,
  PodcastResult,
} from '../../src/types/api';

// ─── The stubbed hooks ──────────────────────────────────────────────
//
// Each stub reports the state that used to light the spinner up —
// the query IS fetching the next page — and carries the gesture's own
// state separately.

const mockMoviesHook = {
  data: {
    items: [] as InternetArchiveVideoResult[],
    numFound: 0,
    hasLoaded: true,
    // The query is fetching — this is the pagination state.
    isLoading: true,
    isLoadingMore: true,
    error: null,
    categoryIds: ['all'],
    term: '',
    hasMore: true,
  },
  loadMore: jest.fn(),
  refetch: jest.fn(),
  refreshing: false,
  refresh: jest.fn(async () => {}),
};

jest.mock('../../src/screens/MoviesScreen/hooks/useMoviesScreen', () => ({
  ...jest.requireActual('../../src/screens/MoviesScreen/hooks/useMoviesScreen'),
  useMoviesScreen: () => mockMoviesHook,
}));

const mockMusicHook = {
  activeGenre: '',
  setActiveGenre: jest.fn(),
  setSearchTerm: jest.fn(),
  isSearchActive: false,
  items: [] as JamendoTrackResult[],
  hasLoaded: true,
  isLoading: true,
  isLoadingMore: true,
  hasNextPage: true,
  error: null,
  fetchNextPage: jest.fn(),
  refetch: jest.fn(),
  refreshing: false,
  refresh: jest.fn(async () => {}),
};

jest.mock('../../src/screens/MusicScreen/hooks/useMusicScreen', () => ({
  ...jest.requireActual('../../src/screens/MusicScreen/hooks/useMusicScreen'),
  useMusicScreen: () => mockMusicHook,
}));

const mockPodcastsHook = {
  searchTerm: '',
  setSearchTerm: jest.fn(),
  isSearchActive: false,
  activeCategoryId: 'all',
  setActiveCategoryId: jest.fn(),
  items: [] as PodcastResult[],
  hasLoaded: true,
  isLoading: true,
  isLoadingMore: true,
  hasMore: true,
  error: null,
  loadMore: jest.fn(),
  retry: jest.fn(),
  refreshing: false,
  refresh: jest.fn(async () => {}),
};

jest.mock('../../src/screens/PodcastsScreen/hooks/usePodcastsScreen', () => ({
  ...jest.requireActual('../../src/screens/PodcastsScreen/hooks/usePodcastsScreen'),
  usePodcastsScreen: () => mockPodcastsHook,
}));

// ─── The three screens ──────────────────────────────────────────────

const CTX: SectionRenderContext = {query: '', options: {}, offline: false};

async function renderMovies() {
  const Harness: React.FC = () => (
    <MoviesDataProvider>
      <MoviesContent ctx={CTX} />
    </MoviesDataProvider>
  );
  return renderWithProviders(Harness, {routeName: 'MoviesScreen'});
}

async function renderMusic() {
  const Harness: React.FC = () => (
    <MusicDataProvider>
      <MusicContent ctx={CTX} />
    </MusicDataProvider>
  );
  return renderWithProviders(Harness, {routeName: 'MusicScreen'});
}

async function renderPodcasts() {
  const Harness: React.FC = () => (
    <PodcastsDataProvider>
      <PodcastsContent ctx={CTX} categories={[]} />
    </PodcastsDataProvider>
  );
  return renderWithProviders(Harness, {routeName: 'PodcastsScreen'});
}

/** The `<RefreshControl>` the list rendered, and the props it was given. */
function refreshControlProps(): {refreshing: boolean; onRefresh: () => void} {
  // The refresh control's own NATIVE view cannot be asked: the native
  // view config keeps only the attributes the platform understands, so
  // `refreshing` is dropped on the way down.
  //
  // The ELEMENT the list handed to the scroll view is still in the
  // tree — RN's ScrollView passes it down to the native scroll view —
  // and the element carries the props the list actually set.
  const scrolls = screen.root!.queryAll(i => i.type === 'RCTScrollView');
  const scroll = scrolls.find(s => s.props.refreshControl);
  const element = scroll?.props.refreshControl as
    | React.ReactElement<{refreshing: boolean; onRefresh: () => void}>
    | undefined;
  if (!element) {
    throw new Error('the list rendered no <RefreshControl>');
  }
  return element.props;
}

const SCREENS = [
  {name: 'Movies', render: renderMovies},
  {name: 'Music', render: renderMusic},
  {name: 'Podcasts', render: renderPodcasts},
];

describe('the browse lists — the refresh spinner is the gesture\'s, not the query\'s', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The pagination state: the query is fetching the next page.
    mockMoviesHook.data.isLoading = true;
    mockMoviesHook.data.isLoadingMore = true;
    mockMoviesHook.refreshing = false;
    mockMusicHook.isLoading = true;
    mockMusicHook.isLoadingMore = true;
    mockMusicHook.refreshing = false;
    mockPodcastsHook.isLoading = true;
    mockPodcastsHook.isLoadingMore = true;
    mockPodcastsHook.refreshing = false;
  });

  it.each(SCREENS)(
    '$name does NOT spin the refresh spinner while the next page loads',
    async ({render}) => {
      await render();

      // The query IS fetching (the state the old expression read)…
      // …and the spinner is still off, because the gesture is idle.
      expect(refreshControlProps().refreshing).toBe(false);
    },
  );

  it.each(SCREENS)(
    '$name spins the refresh spinner while the gesture runs',
    async ({render}) => {
      mockMoviesHook.refreshing = true;
      mockMusicHook.refreshing = true;
      mockPodcastsHook.refreshing = true;

      await render();

      expect(refreshControlProps().refreshing).toBe(true);
    },
  );

  it('the Movies list runs the GESTURE on a pull, not the bare query refetch', async () => {
    await renderMovies();

    await act(async () => {
      await refreshControlProps().onRefresh();
    });

    // The gesture ran…
    expect(mockMoviesHook.refresh).toHaveBeenCalled();
    // …and the query's bare refetch was NOT the thing wired to the
    // gesture (the gesture owns the spinner and calls the refetch).
    expect(mockMoviesHook.refetch).not.toHaveBeenCalled();
  });
});
