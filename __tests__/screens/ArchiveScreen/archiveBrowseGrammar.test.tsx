/**
 * The Archive screen follows the browse grammar.
 *
 * ## What this pins
 *
 * The Archive screen used to be a browse page of its own: its own
 * `InternalHeader`, its own `SearchBar`, TWO `FilterChips` rows (one of
 * quick-search PRESETS and one of the media scope), its own `Placeholder`
 * states and NO footer at all. Its list never paged: the page was
 * hard-coded to 1, `hasNextPage` was `false` and `fetchNextPage` was
 * `() => {}`, so the list stopped at 20 rows — out of 52,794 — and said
 * nothing about it.
 *
 * The claims under test:
 *
 *   1. THE SCREEN IS A BROWSE SCREEN. It renders the shared shell's
 *      search field and its filter button — the same affordances the
 *      Music, Movies and Podcasts screens have — instead of its own.
 *   2. THE MEDIA SCOPE IS THE SCREEN'S ONE FILTER GROUP, and the route
 *      param seeds it: `initialTab: 'video'` opens the screen on the
 *      VIDEO scope, and the shell's chip strip says so.
 *   3. THE SCOPE AND THE TERM COMPOSE IN ONE REQUEST. The archive can
 *      answer `({term}) AND mediatype:(audio)` in one call, so the
 *      scope is NOT cancelled by a search (the shell's
 *      `autoClearFilterOnSearch` / `autoClearSearchOnFilter` stay off on
 *      this screen) and a term is not cancelled by a scope.
 *   4. THE LIST PAGES. The old screen never asked for a second page.
 *   5. THE FOOTER'S ENDING IS WHAT WAS MEASURED. The archive reports a
 *      total (`numFound`) and pages, but it refuses to serve rows past
 *      10,000 (measured 2026-11-18: `rows=20` page 500 answers, page
 *      501 answers HTTP 507). So a list that stops there has NOT caught
 *      up, and the footer must NOT claim it has:
 *
 *        • the source ran out of rows → "You're all caught up." (true);
 *        • the archive's paging cap stopped the list → the archive's own
 *          ending, with both numbers.
 *
 * The REAL hook, the REAL TanStack query and the REAL `usePullToRefresh`
 * are used — only the Internet Archive adapter is stubbed, so the scope,
 * the pagination and the footer are driven exactly as the app drives
 * them.
 */

import React from 'react';
import {Pressable, Text, View} from 'react-native';
import {fireEvent, screen, waitFor, within} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';
import {ArchiveScreen} from '../../../src/screens/ArchiveScreen';
import {useArchiveScreen} from '../../../src/screens/ArchiveScreen/hooks/useArchiveScreen';
import type {
  InternetArchiveItemResult,
  InternetArchiveVideoResult,
  PaginatedResult,
} from '../../../src/types/api';

// The Internet Archive is the network. The adapter is stubbed so the
// scope, the pagination and the footer's ending can be driven on purpose.
jest.mock('../../../src/infrastructure/api/internetArchive/adapter', () => {
  const actual = jest.requireActual(
    '../../../src/infrastructure/api/internetArchive/adapter',
  );
  return {
    ...actual,
    searchInternetArchiveAudio: jest.fn(),
    searchInternetArchiveVideos: jest.fn(),
  };
});

const {searchInternetArchiveAudio: mockAudio} = jest.requireMock(
  '../../../src/infrastructure/api/internetArchive/adapter',
) as {searchInternetArchiveAudio: jest.Mock};
const {searchInternetArchiveVideos: mockVideo} = jest.requireMock(
  '../../../src/infrastructure/api/internetArchive/adapter',
) as {searchInternetArchiveVideos: jest.Mock};

/** The hook's PAGE_SIZE. A short page means "no more pages". */
const PAGE_SIZE = 20;

/** The archive's paging ceiling — the endpoint will not serve past it. */
const IA_MAX_RETRIEVABLE = 10_000;

/** The scope's curated browse default — see `related/scopeConfig.ts`. */
const AUDIO_DEFAULT_TERM = 'old time radio';
const VIDEO_DEFAULT_TERM = 'classic films';

function makeAudioItem(n: number): InternetArchiveItemResult {
  return {
    identifier: `audio-${n}`,
    title: `Audio Item ${n}`,
    description: '',
    creator: 'A Broadcaster',
    year: '1954',
    runtime: '30:00',
    avgRating: 0,
    downloadCount: 0,
    imageUrl: '',
    streamingUrl: '',
    downloadUrls: [],
    source: 'api',
    type: 'archive-audio',
    mediaType: 'audio',
  };
}

function makeVideoItem(n: number): InternetArchiveVideoResult {
  return {
    identifier: `video-${n}`,
    title: `Video Item ${n}`,
    description: '',
    creator: 'A Studio',
    year: '1962',
    duration: 540,
    avgRating: 0,
    downloadCount: 0,
    imageUrl: '',
    streamingUrl: '',
    subtitles: [],
    audioTracks: [],
    downloadUrls: [],
    source: 'api',
    type: 'archive-video',
    mediaType: 'video',
  };
}

function makeAudioPage(
  count: number,
  numFound: number,
): PaginatedResult<InternetArchiveItemResult> {
  return {
    items: Array.from({length: count}, (_, i) => makeAudioItem(i + 1)),
    numFound,
  };
}

function makeVideoPage(
  count: number,
  numFound: number,
): PaginatedResult<InternetArchiveVideoResult> {
  return {
    items: Array.from({length: count}, (_, i) => makeVideoItem(i + 1)),
    numFound,
  };
}

/**
 * The hook's own state, rendered as text so the test can read it.
 *
 * The paging is driven from inside the harness — the claim under test is
 * the query's STATE, not the scroll gesture that reaches it.
 */
const PagingHarness: React.FC = () => {
  const {items, hasNextPage, loadMore} = useArchiveScreen({
    scope: 'audio',
    searchTerm: '',
  });
  return (
    <View>
      <Text testID="count">{String(items.length)}</Text>
      <Text testID="hasNextPage">{String(hasNextPage)}</Text>
      <Pressable testID="loadMore" onPress={loadMore} />
    </View>
  );
};

describe('the Archive screen — the browse grammar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAudio.mockResolvedValue(makeAudioPage(PAGE_SIZE, PAGE_SIZE));
    mockVideo.mockResolvedValue(makeVideoPage(PAGE_SIZE, PAGE_SIZE));
  });

  it('renders the shared shell — the search field and the filter button', async () => {
    await renderWithProviders(ArchiveScreen, {routeName: 'ArchiveScreen'});

    // The shared shell's search field, with THIS screen's placeholder.
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Search the archive…')).toBeTruthy(),
    );
    // The shared shell's filter button.
    expect(
      screen.getByLabelText('Filter Internet Archive options'),
    ).toBeTruthy();
    // The shared shell's header.
    expect(screen.getByText('Internet Archive')).toBeTruthy();
  });

  it('opens the AUDIO scope by default and asks the archive for it', async () => {
    await renderWithProviders(ArchiveScreen, {routeName: 'ArchiveScreen'});

    await waitFor(() => expect(mockAudio).toHaveBeenCalled());
    expect(mockAudio.mock.calls[0][0]).toBe(AUDIO_DEFAULT_TERM);
    // The video scope was NOT asked for.
    expect(mockVideo).not.toHaveBeenCalled();
  });

  it('seeds the media scope from the route param (initialTab: video)', async () => {
    await renderWithProviders(ArchiveScreen, {
      routeName: 'ArchiveScreen',
      initialParams: {initialTab: 'video'},
    });

    // The VIDEO search is the one that is asked — and it is asked ONCE:
    // the screen must not fire an audio request first and then correct
    // itself.
    await waitFor(() => expect(mockVideo).toHaveBeenCalled());
    expect(mockVideo.mock.calls[0][0]).toBe(VIDEO_DEFAULT_TERM);
    expect(mockAudio).not.toHaveBeenCalled();

    // The shell's active-filter chip strip says which scope is applied.
    await waitFor(() => {
      const strip = screen.getByTestId('browse-active-filters');
      expect(within(strip).getByLabelText('Video')).toBeTruthy();
    });
  });

  it('seeds the media scope from the route param (initialTab: audio)', async () => {
    await renderWithProviders(ArchiveScreen, {
      routeName: 'ArchiveScreen',
      initialParams: {initialTab: 'audio'},
    });

    await waitFor(() => expect(mockAudio).toHaveBeenCalled());
    expect(mockAudio.mock.calls[0][0]).toBe(AUDIO_DEFAULT_TERM);
    expect(mockVideo).not.toHaveBeenCalled();
  });

  it('seeds the search field from the route param (query)', async () => {
    await renderWithProviders(ArchiveScreen, {
      routeName: 'ArchiveScreen',
      initialParams: {query: 'jazz'},
    });

    // The route's term is what the archive is asked for — the scope's
    // curated default only applies while the user has typed nothing.
    await waitFor(() => expect(mockAudio).toHaveBeenCalled());
    expect(mockAudio.mock.calls[0][0]).toBe('jazz');
  });

  it('answers a search term AND the scope in ONE request', async () => {
    await renderWithProviders(ArchiveScreen, {
      routeName: 'ArchiveScreen',
      initialParams: {initialTab: 'audio'},
    });

    await waitFor(() => expect(mockAudio).toHaveBeenCalled());
    mockAudio.mockClear();

    // The user types a term into the shell's search field.
    await fireEvent.changeText(
      screen.getByPlaceholderText('Search the archive…'),
      'beethoven',
    );

    // The archive is asked for the term — on the SAME scope. The scope is
    // not cancelled by the term (the endpoint answers both in one
    // request), and the term is not cancelled by the scope.
    await waitFor(() =>
      expect(mockAudio).toHaveBeenCalledWith('beethoven', expect.anything()),
    );
    expect(mockVideo).not.toHaveBeenCalled();
  });

  it('never asks the archive for an EMPTY query', async () => {
    await renderWithProviders(ArchiveScreen, {routeName: 'ArchiveScreen'});

    await waitFor(() => expect(mockAudio).toHaveBeenCalled());

    // A term of only quotes leaves nothing to search for, and an empty
    // query answers with no total and no rows at all (measured:
    // `() AND mediatype:(audio)` → no numFound, no docs).
    await fireEvent.changeText(
      screen.getByPlaceholderText('Search the archive…'),
      '""',
    );

    await waitFor(() =>
      expect(screen.getByText('Audio Item 1')).toBeTruthy(),
    );
    // The archive was never asked for the empty term, and the list is
    // still the scope's browse — not an empty list.
    expect(
      mockAudio.mock.calls.every(call => call[0] === AUDIO_DEFAULT_TERM),
    ).toBe(true);
  });

  it('pages the list — the old screen never asked for a second page', async () => {
    // Page 1 is FULL (so the source really does have a page 2) and the
    // total says so.
    mockAudio.mockResolvedValue(makeAudioPage(PAGE_SIZE, PAGE_SIZE * 2));

    await renderWithProviders(PagingHarness, {routeName: 'ArchiveScreen'});

    await waitFor(() =>
      expect(screen.getByTestId('count').props.children).toBe('20'),
    );
    expect(screen.getByTestId('hasNextPage').props.children).toBe('true');

    await fireEvent.press(screen.getByTestId('loadMore'));

    await waitFor(() =>
      expect(screen.getByTestId('count').props.children).toBe('40'),
    );
  });

  it('says "You\'re all caught up." when the SOURCE ran out of rows', async () => {
    // A short page: the archive has nothing more.
    mockAudio.mockResolvedValue(makeAudioPage(3, 3));

    await renderWithProviders(ArchiveScreen, {routeName: 'ArchiveScreen'});

    await waitFor(() =>
      expect(screen.getByText("You're all caught up.")).toBeTruthy(),
    );
    // The archive's own window ending is NOT shown — the source really
    // did give everything it had.
    expect(screen.queryByText(/the archive stops paging here/)).toBeNull();
  });

  it('does NOT say "You\'re all caught up." when the archive\'s paging cap ended the list', async () => {
    // The list is exactly ON the ceiling (10,000 rows) and the archive
    // still has rows it will not serve (the total is larger). Asking for
    // page 501 would earn an HTTP 507, so the hook stops there — and the
    // footer must describe THAT, not claim the user caught up.
    mockAudio.mockResolvedValue(
      makeAudioPage(IA_MAX_RETRIEVABLE, IA_MAX_RETRIEVABLE * 2),
    );

    await renderWithProviders(ArchiveScreen, {routeName: 'ArchiveScreen'});

    await waitFor(() =>
      expect(
        screen.getByText(
          `Showing ${IA_MAX_RETRIEVABLE.toLocaleString()} of ${(
            IA_MAX_RETRIEVABLE * 2
          ).toLocaleString()} items — the archive stops paging here`,
        ),
      ).toBeTruthy(),
    );
    // The caught-up sentence would be a lie here.
    expect(screen.queryByText("You're all caught up.")).toBeNull();
  });

  it('gives the archive row NO media menu — every action would be refused', async () => {
    await renderWithProviders(ArchiveScreen, {routeName: 'ArchiveScreen'});

    const row = await screen.findByLabelText('Open Audio Item 1');
    await fireEvent(row, 'longPress');

    // An archive item is a COLLECTION: there is no single playable URI
    // for it, and the playlist kinds refuse archive items outright
    // (`PLAYLIST_ALLOWED_MEDIA_KINDS` holds neither 'archive-audio' nor
    // 'archive-video'). So the app's one media menu has nothing it could
    // do — and a control that cannot act must not occupy space.
    expect(screen.queryByText('Play Next')).toBeNull();
    expect(screen.queryByText('Add to Queue')).toBeNull();
    expect(screen.queryByText('Add to Playlist')).toBeNull();
  });

  it('SAYS what it is browsing — the scope default is on screen', async () => {
    await renderWithProviders(ArchiveScreen, {routeName: 'ArchiveScreen'});

    // The search field is EMPTY, so the archive is answering the scope's
    // curated default — and the list must SAY so. The field does not:
    // it holds the user's term, and the term in use is not in it
    // (B16-J-ARCHIVE-DEFAULT). Without this the list answered a
    // question the user could not see.
    await waitFor(() =>
      expect(screen.getByText(`Browsing “${AUDIO_DEFAULT_TERM}”`)).toBeTruthy(),
    );
  });

  it('the caption follows the SCOPE — the video scope browses its own default', async () => {
    await renderWithProviders(ArchiveScreen, {
      routeName: 'ArchiveScreen',
      initialParams: {initialTab: 'video'},
    });

    await waitFor(() =>
      expect(screen.getByText(`Browsing “${VIDEO_DEFAULT_TERM}”`)).toBeTruthy(),
    );
  });

  it('does NOT repeat the term the USER typed', async () => {
    await renderWithProviders(ArchiveScreen, {
      routeName: 'ArchiveScreen',
      initialParams: {query: 'jazz'},
    });

    // The user's term is already in the search field. Saying it again
    // would be noise.
    await waitFor(() => expect(screen.getByText('Audio Item 1')).toBeTruthy());
    expect(screen.queryByText(/Browsing/)).toBeNull();
  });
});
