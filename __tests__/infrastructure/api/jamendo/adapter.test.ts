/**
 * V21 W6 P21c — Jamendo adapter parse + signal tests.
 *
 * Covers the W6 P21c additions (mirrors the Podcast Index
 * pattern from `__tests__/infrastructure/api/podcastIndex/adapter.test.ts`):
 *   - AdapterParseError on malformed wire payloads
 *   - signal threading through apiFetch (so TanStack Query
 *     can cancel stale requests on screen unmount / query-key
 *     change)
 *   - per-track shape validation (rejects a track with the
 *     wrong field type instead of silently skipping it)
 *   - the documented retries constant
 *
 * The other 8 adapters (`audius`, `internetArchive`, `iptv`,
 * `librivox`, `musicbrainz`, `radioBrowser`, `tvmaze`,
 * `weather`) get the same shape in their own test files —
 * jamendo is the proof-of-pattern reference.
 */

import {
  searchJamendoTracks,
  getJamendoTracksByGenre,
  getPopularJamendoTracks,
  getJamendoTrackById,
  decodeJamendoText,
  JAMENDO_RETRIES,
} from '../../../../src/infrastructure/api/jamendo/adapter';
import {AdapterParseError} from '../../../../src/infrastructure/api/adapterErrors';

jest.mock('../../../../src/infrastructure/api/apiClient', () => ({
  apiFetch: jest.fn(),
}));
const {apiFetch} = require('../../../../src/infrastructure/api/apiClient');
const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

// Override the default empty react-native-config mock so
// `clientId()` returns a non-empty string (the env-mocked
// value below is what JAMENDO_CLIENT_ID resolves to).
jest.mock('react-native-config', () => ({
  JAMENDO_CLIENT_ID: 'test-client-id',
}));

beforeEach(() => {
  mockedApiFetch.mockReset();
});

// Minimal valid track shape for the happy-path mocks.
function validTrack(id = 1) {
  return {
    id: String(id),
    name: 'Track ' + id,
    artist_name: 'Artist ' + id,
    album_name: 'Album ' + id,
    duration: 180,
    audio: `https://example.com/audio-${id}.mp3`,
    image: `https://example.com/image-${id}.jpg`,
  };
}

describe('jamendo adapter — V21 W6 P21c', () => {
  it('exposes a documented retries constant', () => {
    expect(JAMENDO_RETRIES).toBe(2);
  });

  it('throws AdapterParseError when the envelope status is "error"', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'error', code: 10, error_message: 'invalid client_id'},
      results: [],
    });
    await expect(searchJamendoTracks('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('throws AdapterParseError when results is not an array', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: 'not-an-array',
    });
    await expect(searchJamendoTracks('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('threads the AbortSignal to apiFetch on search', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: [validTrack(1)],
    });
    const controller = new AbortController();
    await searchJamendoTracks('test', undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('threads the AbortSignal on getJamendoTracksByGenre', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: [validTrack(1)],
    });
    const controller = new AbortController();
    await getJamendoTracksByGenre('rock', undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('threads the AbortSignal on getPopularJamendoTracks', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: [validTrack(1)],
    });
    const controller = new AbortController();
    await getPopularJamendoTracks(20, 1, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('threads the AbortSignal on getJamendoTrackById', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: [validTrack(7)],
    });
    const controller = new AbortController();
    await getJamendoTrackById(7, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('parseRawJamendoTrack rejects a record with the wrong id type', async () => {
    // `id` is required to be a parseable integer; the mock
    // returns a non-numeric string.
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: [{...validTrack(1), id: 'not-a-number'}],
    });
    await expect(searchJamendoTracks('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('parseRawJamendoTrack rejects a record with a missing audio url', async () => {
    // `audio` is required (non-empty string) — the API would
    // never return a playable track without it.
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: [{...validTrack(1), audio: ''}],
    });
    await expect(searchJamendoTracks('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('returns parsed results on a valid payload', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: [validTrack(1), validTrack(2)],
    });
    const results = await searchJamendoTracks('test');
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      id: 1,
      name: 'Track 1',
      artistName: 'Artist 1',
      audioUrl: 'https://example.com/audio-1.mp3',
    });
  });

  it('getJamendoTrackById returns null on a not-found (empty results)', async () => {
    // An empty by-id answer is a DECLINED answer, so it is asked again
    // before the adapter believes it — measured 2026-11-19, the endpoint
    // answers empty on roughly half the requests. The full contract of
    // the retry is pinned in `byIdRetry.test.ts`; this case only pins
    // that the final answer for a track that never comes back is null.
    mockedApiFetch.mockResolvedValue({
      headers: {status: 'success'},
      results: [],
    });
    expect(await getJamendoTrackById(999)).toBeNull();
    expect(mockedApiFetch).toHaveBeenCalledTimes(4);
  });

  it('getJamendoTrackById swallows transport errors but propagates AdapterParseError', async () => {
    // Pre-W22 the catch was generic — both transport and shape
    // failures returned `null`. Now only transport-level
    // failures (ApiError from apiFetch, signal aborts) are
    // swallowed; shape failures propagate so the caller can
    // distinguish "server is down" from "server returned garbage".
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'error', error_message: 'oops'},
      results: [],
    });
    await expect(getJamendoTrackById(1)).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });
});

/**
 * The EMPTY response is the defect this suite now pins.
 *
 * MEASURED on 2026-11-16 against the live API: the SAME url with the
 * SAME parameters returns 20 rows on one call and 0 rows on the next. Over
 * 30 requests (3 passes x 10 genres) a fixed-order request came back
 * EMPTY TEN TIMES — a third of all requests — and an empty array is a
 * SUCCESS to TanStack Query, so it was cached as the truth and the screen
 * showed "No Rock tracks found" for a genre with thousands of tracks.
 *
 * The retry measured out as: 23 of 30 succeeded first time, 5 needed a
 * second attempt, 1 a third and 1 a fourth — all 30 recovered.
 */
describe('jamendo adapter — an empty response is not an answer', () => {
  it('retries the search when the API answers with nothing', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: [],
    });
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: [validTrack(1)],
    });

    const results = await searchJamendoTracks('test');

    expect(results).toHaveLength(1);
    expect(mockedApiFetch).toHaveBeenCalledTimes(2);
  });

  it('retries the genre query when the API answers with nothing', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: [],
    });
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: [validTrack(2)],
    });

    const results = await getJamendoTracksByGenre('rock');

    expect(results).toHaveLength(1);
    expect(mockedApiFetch).toHaveBeenCalledTimes(2);
  });

  it('repeats the request UNCHANGED — the order selects a pool, not a sort', async () => {
    // MEASURED: `search=love` with no `order` and `search=love` with
    // `order=popularity_total` share 0 of 20 tracks. Varying `order`
    // would return DIFFERENT tracks, so the retry must vary nothing.
    mockedApiFetch.mockResolvedValue({
      headers: {status: 'success'},
      results: [],
    });

    await searchJamendoTracks('test');

    const calls = mockedApiFetch.mock.calls.map(
      (c: [{params: Record<string, string | number>}]) => c[0].params,
    );
    expect(calls.length).toBeGreaterThan(1);
    for (const params of calls) {
      expect(params.order).toBeUndefined();
      expect(params.search).toBe('test');
      expect(typeof params.client_id).toBe('string');
      expect(String(params.client_id).length).toBeGreaterThan(0);
    }
  });

  it('gives up after four empty answers and returns empty', async () => {
    mockedApiFetch.mockResolvedValue({
      headers: {status: 'success'},
      results: [],
    });

    const results = await searchJamendoTracks('test');

    expect(results).toEqual([]);
    expect(mockedApiFetch).toHaveBeenCalledTimes(4);
  });

  it('a genre query keeps its own order on every attempt', async () => {
    mockedApiFetch.mockResolvedValue({
      headers: {status: 'success'},
      results: [],
    });

    await getJamendoTracksByGenre('rock');

    const calls = mockedApiFetch.mock.calls.map(
      (c: [{params: Record<string, string | number>}]) => c[0].params,
    );
    expect(calls.length).toBeGreaterThan(1);
    for (const params of calls) {
      expect(params.order).toBe('popularity_total');
      expect(params.tags).toBe('rock');
    }
  });
});

/**
 * Jamendo paginates with `offset`, NOT with `page`.
 *
 * MEASURED on 2026-11-16 against the live API (limit 30):
 *
 *   search=love           → 30 rows
 *   search=love&page=2    → **0 rows**
 *   search=love&offset=30 → 30 rows, **0 shared** with page 1
 *
 *   tags=rock&order=popularity_total            → 30 rows
 *   tags=rock&order=popularity_total&page=2     → 30 rows, **30 shared**
 *   tags=rock&order=popularity_total&offset=30  → 30 rows, **0 shared**
 *
 * The genre path therefore answered "page 2" with page 1's rows again —
 * the screen's dedupe-by-id threw them away, the list never grew,
 * `hasNextPage` stayed true forever, and the end-of-list footer never
 * said "You're all caught up." The search path answered "page 2" with
 * nothing at all, after four retried requests.
 */
describe('jamendo adapter — the page is turned into an offset', () => {
  function paramsOfCall(index = 0): Record<string, string | number> {
    return mockedApiFetch.mock.calls[index][0].params;
  }

  it('never sends a `page` parameter — Jamendo has no such parameter', async () => {
    mockedApiFetch.mockResolvedValue({
      headers: {status: 'success'},
      results: [validTrack(1)],
    });

    await searchJamendoTracks('love', {limit: 20, page: 3});
    await getJamendoTracksByGenre('rock', {limit: 20, page: 3});
    await getPopularJamendoTracks(20, 3);

    for (const call of mockedApiFetch.mock.calls) {
      expect(call[0].params.page).toBeUndefined();
    }
  });

  it('sends offset = (page - 1) * limit on the search path', async () => {
    mockedApiFetch.mockResolvedValue({
      headers: {status: 'success'},
      results: [validTrack(1)],
    });

    await searchJamendoTracks('love', {limit: 20, page: 3});

    expect(paramsOfCall()).toMatchObject({limit: 20, offset: 40, search: 'love'});
  });

  it('sends offset = (page - 1) * limit on the genre path', async () => {
    mockedApiFetch.mockResolvedValue({
      headers: {status: 'success'},
      results: [validTrack(1)],
    });

    await getJamendoTracksByGenre('rock', {limit: 20, page: 2});

    expect(paramsOfCall()).toMatchObject({
      limit: 20,
      offset: 20,
      tags: 'rock',
      order: 'popularity_total',
    });
  });

  it('sends offset = (page - 1) * limit on the popular path', async () => {
    mockedApiFetch.mockResolvedValue({
      headers: {status: 'success'},
      results: [validTrack(1)],
    });

    await getPopularJamendoTracks(20, 2);

    expect(paramsOfCall()).toMatchObject({limit: 20, offset: 20});
  });

  it('sends offset 0 for the first page, whatever the page number means', async () => {
    mockedApiFetch.mockResolvedValue({
      headers: {status: 'success'},
      results: [validTrack(1)],
    });

    await searchJamendoTracks('love', {limit: 20, page: 1});

    expect(paramsOfCall()).toMatchObject({limit: 20, offset: 0});
  });

  it('never sends a negative offset', async () => {
    mockedApiFetch.mockResolvedValue({
      headers: {status: 'success'},
      results: [validTrack(1)],
    });

    await searchJamendoTracks('love', {limit: 20, page: 0});

    expect(Number(paramsOfCall().offset)).toBeGreaterThanOrEqual(0);
  });
});

describe('jamendo adapter — the escaped text fields', () => {
  // Jamendo escapes the characters that are not legal in its payload, so
  // the artist "Besson & Sa" arrives as "Besson&amp;sa" — and the app
  // used to draw the ESCAPED name on the row (seen on the Search page's
  // results on 2026-11-12: "Bad Intentions, Bessonn&amp;sa").
  it('decodes the named entities in the track, artist, album and genre', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: [
        {
          ...validTrack(1),
          name: 'Rock &amp; Roll',
          artist_name: 'Besson&amp;sa',
          album_name: 'Hits &lt;Live&gt;',
        },
      ],
    });
    const results = await searchJamendoTracks('test');
    expect(results[0]).toMatchObject({
      name: 'Rock & Roll',
      artistName: 'Besson&sa',
      albumName: 'Hits <Live>',
    });
  });

  it('decodes the numeric entities', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      headers: {status: 'success'},
      results: [{...validTrack(1), name: 'Caf&#233; &#x26; Bar'}],
    });
    const results = await searchJamendoTracks('test');
    expect(results[0].name).toBe('Café & Bar');
  });

  it('leaves an unknown entity alone', () => {
    expect(decodeJamendoText('Foo &bar; Baz')).toBe('Foo &bar; Baz');
  });

  it('leaves a text without an ampersand alone', () => {
    expect(decodeJamendoText('Plain Name')).toBe('Plain Name');
  });
});
