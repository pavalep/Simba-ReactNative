/**
 * The Jamendo empty-page retry is BOUNDED.
 *
 * ## What this pins
 *
 * Jamendo answers intermittently with nothing: the same URL with the same
 * parameters returns 20 rows on one call and 0 rows on the next (measured
 * 2026-11-16 — 10 of 30 requests came back empty, and every one of the 30
 * recovered within three retries). So the adapter repeats the request,
 * UNCHANGED, while it answers with nothing.
 *
 * The retry used to be UNCONDITIONAL, which meant every empty page cost
 * four requests — including a page that legitimately has no rows. The
 * search path measured exactly that: "four retried requests for a page
 * that does not exist".
 *
 * The envelope already carries the answer. `headers.results_count` is how
 * many rows the query HAS, so an empty page can be classified:
 *
 *   1. `results_count === 0` → the query has no rows at all → ONE
 *      request, no retry.
 *   2. the page's offset is at or past `results_count` → the page is past
 *      the end of the catalogue → ONE request, no retry.
 *   3. otherwise the page is INSIDE the catalogue and came back empty →
 *      the API declined to answer it → retry, unchanged, as before.
 *
 * The coverage the retry buys must not shrink: a flaky page inside the
 * catalogue still gets its four attempts.
 */

import {
  searchJamendoTracks,
  getJamendoTracksByGenre,
} from '../../../../src/infrastructure/api/jamendo/adapter';

jest.mock('../../../../src/infrastructure/api/apiClient', () => ({
  apiFetch: jest.fn(),
}));
const {apiFetch} = require('../../../../src/infrastructure/api/apiClient');
const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

jest.mock('react-native-config', () => ({
  JAMENDO_CLIENT_ID: 'test-client-id',
}));

/** An envelope with no rows. */
function emptyEnvelope(resultsCount?: number) {
  return {
    headers: {
      status: 'success' as const,
      ...(resultsCount === undefined ? {} : {results_count: resultsCount}),
    },
    results: [],
  };
}

beforeEach(() => {
  mockedApiFetch.mockReset();
});

describe('the Jamendo empty-page retry is bounded', () => {
  it('asks ONCE when the query has no rows at all', async () => {
    mockedApiFetch.mockResolvedValue(emptyEnvelope(0));

    const result = await searchJamendoTracks('love');

    expect(result).toEqual([]);
    expect(mockedApiFetch).toHaveBeenCalledTimes(1);
  });

  it('asks ONCE when the page is past the end of the catalogue', async () => {
    // The catalogue holds 20 rows; the page's offset is 20, so page 2 is
    // past the end and cannot have rows however many times it is asked.
    mockedApiFetch.mockResolvedValue(emptyEnvelope(20));

    const result = await getJamendoTracksByGenre('rock', {
      limit: 20,
      page: 2,
    });

    expect(result).toEqual([]);
    expect(mockedApiFetch).toHaveBeenCalledTimes(1);
  });

  it('still retries a page INSIDE the catalogue that comes back empty', async () => {
    // The catalogue holds 500 rows and the page's offset is 0, so this is
    // the API declining to answer — the case the retry exists for.
    mockedApiFetch.mockResolvedValue(emptyEnvelope(500));

    const result = await getJamendoTracksByGenre('rock', {
      limit: 20,
      page: 1,
    });

    expect(result).toEqual([]);
    // The coverage the retry buys is unchanged: four attempts.
    expect(mockedApiFetch).toHaveBeenCalledTimes(4);
  });

  it('stops as soon as the page answers', async () => {
    mockedApiFetch
      .mockResolvedValueOnce(emptyEnvelope(500))
      .mockResolvedValueOnce({
        headers: {status: 'success' as const, results_count: 500},
        results: [
          {
            id: '1',
            name: 'Track 1',
            artist_name: 'Artist 1',
            album_name: 'Album 1',
            duration: 180,
            audio: 'https://example.com/a.mp3',
            image: 'https://example.com/i.jpg',
          },
        ],
      });

    const result = await getJamendoTracksByGenre('rock', {
      limit: 20,
      page: 1,
    });

    expect(result).toHaveLength(1);
    // One declined answer, one answer. It stops there.
    expect(mockedApiFetch).toHaveBeenCalledTimes(2);
  });
});
