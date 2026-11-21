/**
 * The Movies screen follows the browse grammar - and its ENDING is derived
 * from WHICH STOP RULE FIRED.
 *
 * ## What this pins
 *
 * B-11-6. The Movies footer's `windowEnd` copy - "Showing {shown} of
 * {total} movies - the archive stops paging here" - was computed from
 * `numFound > items.length`, and the SHORT PAGE produces that too. There
 * the archive had NOT stopped paging: the source simply ran out of rows,
 * so the sentence was false.
 *
 * There are exactly two endings, and only these two:
 *
 *   - the source ran out of rows -> "You're all caught up." (true);
 *   - the archive's paging cap stopped the list (10,000 rows, with more
 *     rows behind it) -> the archive's own ending, with both numbers.
 *
 * The REAL hook, the REAL TanStack query and the REAL shared footer are
 * used - only the Internet Archive adapter is stubbed, so the scope, the
 * pagination and the footer's ending are driven exactly as the app drives
 * them.
 *
 * The device photograph of the second ending is
 * `device_proof/B16_G04_movies_window_end.png` (2026-11-22,
 * emulator-5554, API 37) - the label ON THE DEVICE, carrying the proof
 * harness's own numbers. This file pins the REAL numbers.
 */

import {screen, waitFor} from '@testing-library/react-native';

import {renderWithProviders} from '../../helpers/renderWithProviders';
import {MoviesScreen} from '../../../src/screens/MoviesScreen';
import type {
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
    searchInternetArchiveVideos: jest.fn(),
  };
});

const {searchInternetArchiveVideos: mockVideo} = jest.requireMock(
  '../../../src/infrastructure/api/internetArchive/adapter',
) as {searchInternetArchiveVideos: jest.Mock};

/** The hook's PAGE_SIZE (`useMoviesScreen.ts`). A short page means "no more pages". */
const PAGE_SIZE = 40;

/** The archive's paging ceiling - the endpoint will not serve past it. */
const IA_MAX_RETRIEVABLE = 10_000;

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

function makeVideoPage(
  count: number,
  numFound: number,
): PaginatedResult<InternetArchiveVideoResult> {
  return {
    items: Array.from({length: count}, (_, i) => makeVideoItem(i + 1)),
    numFound,
  };
}

describe('the Movies screen - the browse grammar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVideo.mockResolvedValue(makeVideoPage(PAGE_SIZE, PAGE_SIZE));
  });

  it('renders the shared shell - the search field and the filter button', async () => {
    await renderWithProviders(MoviesScreen, {routeName: 'MoviesScreen'});

    await waitFor(() =>
      expect(screen.getByPlaceholderText('Search movies…')).toBeTruthy(),
    );
    expect(screen.getByLabelText('Filter Movies options')).toBeTruthy();
    expect(screen.getAllByText('Movies').length).toBeGreaterThan(0);
  });

  it('asks the archive for the movies scope', async () => {
    await renderWithProviders(MoviesScreen, {routeName: 'MoviesScreen'});

    await waitFor(() => expect(mockVideo).toHaveBeenCalled());
  });

  it('says "You\'re all caught up." when the SOURCE ran out of rows', async () => {
    // A short page: the archive served FEWER rows than it says it has,
    // so the list ends - but the archive did NOT stop paging. This is
    // the case that made the window sentence FALSE: `numFound >
    // items.length` holds here too, so the rule has to be the CEILING,
    // not the total.
    mockVideo.mockResolvedValue(makeVideoPage(3, 55));

    await renderWithProviders(MoviesScreen, {routeName: 'MoviesScreen'});

    await waitFor(() =>
      expect(screen.getByText("You're all caught up.")).toBeTruthy(),
    );
    // The archive's own window ending is NOT shown - the source really
    // did give everything it had.
    expect(screen.queryByText(/the archive stops paging here/)).toBeNull();
  });

  it('says the archive stopped paging when the CEILING ended the list', async () => {
    // The list is exactly ON the ceiling (10,000 rows) and the archive
    // still has rows it will not serve (the total is larger). Asking for
    // page 251 would earn an HTTP 507, so the hook stops there - and the
    // footer must describe THAT, not claim the user caught up.
    mockVideo.mockResolvedValue(
      makeVideoPage(IA_MAX_RETRIEVABLE, IA_MAX_RETRIEVABLE * 2),
    );

    await renderWithProviders(MoviesScreen, {routeName: 'MoviesScreen'});

    await waitFor(() =>
      expect(
        screen.getByText(
          `Showing ${IA_MAX_RETRIEVABLE.toLocaleString()} of ${(
            IA_MAX_RETRIEVABLE * 2
          ).toLocaleString()} movies — the archive stops paging here`,
        ),
      ).toBeTruthy(),
    );
    // The caught-up sentence would be a lie here.
    expect(screen.queryByText("You're all caught up.")).toBeNull();
  });
});
