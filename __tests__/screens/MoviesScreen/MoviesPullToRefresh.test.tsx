/**
 * The pull-to-refresh spinner belongs to the GESTURE — not to the query.
 *
 * ## The bug this pins
 *
 * The three browse lists drove their `<RefreshControl>` from the query's
 * fetch flag:
 *
 *     refreshing={isLoading && hasLoaded}
 *
 * `isLoading` is TanStack's `isFetching`, and `isFetching` is true for
 * EVERY fetch the query makes — including `fetchNextPage`. So the moment
 * the user scrolled to the end of the Movies grid and the next page
 * started loading, the refresh spinner appeared at the TOP of the list:
 * a spinner for work the user did not ask for, in the one place that
 * says "refreshing".
 *
 * ## What is asserted
 *
 * The REAL hook (`useMoviesScreen`), the REAL TanStack query and the
 * REAL `usePullToRefresh` — only the Internet Archive adapter is
 * stubbed, so the pagination is driven exactly as the app drives it.
 *
 * The claim under test is not "a callback fired" but the STATE the
 * spinner is bound to:
 *
 *   1. while the NEXT PAGE is loading, the spinner is OFF — even though
 *      the query IS fetching (`isLoading` is true). This is the
 *      regression: the old expression was true in exactly this state.
 *   2. while the user's own pull-to-refresh is running, the spinner is
 *      ON — and it goes off again when the refetch settles.
 *
 * The list content's own binding to the `<RefreshControl>` is pinned in
 * `__tests__/screens/BrowsePullToRefresh.test.tsx`.
 */

import React from 'react';
import {Pressable, Text, View} from 'react-native';
import {act, fireEvent, screen, waitFor} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';
import {useMoviesScreen} from '../../../src/screens/MoviesScreen/hooks/useMoviesScreen';
import type {
  InternetArchiveVideoResult,
  PaginatedResult,
} from '../../../src/types/api';

// The Internet Archive is the network. The adapter is stubbed so the
// pagination can be held open on purpose.
jest.mock('../../../src/infrastructure/api/internetArchive/adapter', () => {
  const actual = jest.requireActual(
    '../../../src/infrastructure/api/internetArchive/adapter',
  );
  return {...actual, searchInternetArchiveVideos: jest.fn()};
});

const {searchInternetArchiveVideos: mockSearch} = jest.requireMock(
  '../../../src/infrastructure/api/internetArchive/adapter',
) as {searchInternetArchiveVideos: jest.Mock};

/** The hook's PAGE_SIZE. A short page means "no more pages". */
const PAGE_SIZE = 40;

function makeMovie(n: number): InternetArchiveVideoResult {
  return {
    identifier: `movie-${n}`,
    title: `Movie ${n}`,
    description: 'A test film.',
    creator: 'Studio',
    year: '1960',
    duration: 540,
    avgRating: 0,
    downloadCount: 0,
    imageUrl: '',
    streamingUrl: '',
    subtitles: [],
    audioTracks: [],
    downloadUrls: [],
    source: 'api',
    type: 'movie',
    mediaType: 'video',
  };
}

function makePage(count: number, numFound: number) {
  return {
    items: Array.from({length: count}, (_, i) => makeMovie(i + 1)),
    numFound,
  } satisfies PaginatedResult<InternetArchiveVideoResult>;
}

/**
 * The hook's own state, rendered as text so the test can read it.
 *
 * `loadMore` is pressed directly rather than by scrolling: the claim
 * under test is the query's STATE, not the scroll gesture that reaches
 * it.
 */
const Harness: React.FC = () => {
  const {data, loadMore, refreshing, refresh} = useMoviesScreen({
    categoryIds: ['all'],
    searchTerm: '',
  });
  return (
    <View>
      <Text testID="isLoading">{String(data.isLoading)}</Text>
      <Text testID="isLoadingMore">{String(data.isLoadingMore)}</Text>
      <Text testID="refreshing">{String(refreshing)}</Text>
      <Pressable testID="loadMore" onPress={loadMore} />
      <Pressable
        testID="pull"
        onPress={() => {
          refresh().catch(() => {});
        }}
      />
    </View>
  );
};

/** Read one of the harness's state texts. */
function stateOf(testID: string): string {
  return screen.getByTestId(testID).props.children as string;
}

describe('the Movies hook — the refresh spinner belongs to the gesture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does NOT spin the refresh spinner while the NEXT PAGE is loading', async () => {
    // Page 1 answers with a FULL page (so the source really does have
    // a page 2). Page 2 never settles until the test says so.
    let settlePage2: (page: PaginatedResult<InternetArchiveVideoResult>) => void;
    mockSearch
      .mockResolvedValueOnce(makePage(PAGE_SIZE, PAGE_SIZE * 2))
      .mockImplementationOnce(
        () =>
          new Promise<PaginatedResult<InternetArchiveVideoResult>>(resolve => {
            settlePage2 = resolve;
          }),
      );

    await renderWithProviders(Harness, {routeName: 'MoviesScreen'});

    // The first page is in and the list is idle.
    await waitFor(() => expect(stateOf('isLoading')).toBe('false'));
    expect(stateOf('isLoadingMore')).toBe('false');
    expect(stateOf('refreshing')).toBe('false');

    await fireEvent.press(screen.getByTestId('loadMore'));

    // The next page is now on its way…
    await waitFor(() => expect(stateOf('isLoadingMore')).toBe('true'));
    // …and the query IS fetching — this is exactly the state the old
    // `isLoading && hasLoaded` expression turned the spinner on for.
    expect(stateOf('isLoading')).toBe('true');

    // The refresh spinner stays OFF. Paging is not refreshing.
    expect(stateOf('refreshing')).toBe('false');

    // Let the page land so the test leaves nothing in flight.
    await act(async () => {
      settlePage2(makePage(PAGE_SIZE, PAGE_SIZE * 2));
    });
    await waitFor(() => expect(stateOf('isLoadingMore')).toBe('false'));
    expect(stateOf('refreshing')).toBe('false');
  });

  it('spins the refresh spinner ONLY while the user\'s pull-to-refresh runs', async () => {
    // The one page the source has, and its refetch is held open.
    let settleRefetch: () => void;
    mockSearch.mockImplementation(
      () =>
        new Promise<PaginatedResult<InternetArchiveVideoResult>>(resolve => {
          settleRefetch = () => resolve(makePage(PAGE_SIZE, PAGE_SIZE));
        }),
    );

    await renderWithProviders(Harness, {routeName: 'MoviesScreen'});

    // The first load is in flight — no gesture, so no spinner.
    await waitFor(() => expect(stateOf('isLoading')).toBe('true'));
    expect(stateOf('refreshing')).toBe('false');

    // The user pulls the list down.
    await fireEvent.press(screen.getByTestId('pull'));
    await waitFor(() => expect(stateOf('refreshing')).toBe('true'));

    // The refetch settles — the spinner goes off with it.
    await act(async () => {
      settleRefetch();
    });
    await waitFor(() => expect(stateOf('refreshing')).toBe('false'));
  });

  it('clears the spinner even when the refetch fails', async () => {
    // The first load answers. The REFETCH fails — and its failure is
    // held open, so the spinner is observed ON before it is cleared.
    let rejectRefetch: (reason: Error) => void;
    mockSearch
      .mockResolvedValueOnce(makePage(PAGE_SIZE, PAGE_SIZE))
      .mockImplementationOnce(
        () =>
          new Promise<PaginatedResult<InternetArchiveVideoResult>>(
            (_resolve, reject) => {
              rejectRefetch = reject;
            },
          ),
      );

    await renderWithProviders(Harness, {routeName: 'MoviesScreen'});
    await waitFor(() => expect(stateOf('isLoading')).toBe('false'));

    await fireEvent.press(screen.getByTestId('pull'));
    await waitFor(() => expect(stateOf('refreshing')).toBe('true'));

    // The gesture's `finally` clears the spinner, so a failed refresh
    // cannot leave a spinner running forever.
    await act(async () => {
      rejectRefetch(new Error('the source is down'));
    });
    await waitFor(() => expect(stateOf('refreshing')).toBe('false'));
  });
});
