/**
 * V21 W6 P21c — LibriVox adapter parse + signal tests.
 *
 * Mirrors the Jamendo (W22 F/U #4 proof-of-pattern), Audius
 * (F/U #5), Internet Archive (F/U #6), and IPTV (F/U #7)
 * patterns. LibriVox has 5 service functions + a complex
 * `normalizeBooks` helper that handles 3 envelope shapes
 * (single object / dict with numeric keys / undefined).
 *
 * Covers:
 *   - AdapterParseError on malformed wire payloads
 *     (per-book + envelope)
 *   - signal threading through apiFetch (TanStack Query
 *     cancellation on screen unmount / query-key change)
 *   - the documented retries constant
 *   - searchByGenre: transport failures fall back to
 *     full-text; shape failures propagate
 *     (the narrowed-catch + retry-fallback proof)
 */

import {
  searchAudiobooks,
  getAudiobookById,
  searchByAuthor,
  searchByGenre,
  getRecentAudiobooks,
  LIBRIVOX_RETRIES,
} from '../../../../src/infrastructure/api/librivox/adapter';
import {AdapterParseError} from '../../../../src/infrastructure/api/adapterErrors';

jest.mock('../../../../src/infrastructure/api/apiClient', () => ({
  apiFetch: jest.fn(),
  // The adapter tells "no books match" (a 404) from a failure by reading
  // the HTTP status off the error. The mock has to carry `ApiError` too, or
  // the `instanceof` check in the adapter throws a TypeError instead of
  // answering the question it was asked.
  ApiError: class MockApiError extends Error {
    status: number;
    kind: string;
    constructor(message: string, status: number, kind: string = 'http') {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.kind = kind;
    }
  },
}));
const {apiFetch, ApiError} = require('../../../../src/infrastructure/api/apiClient');
const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

beforeEach(() => {
  mockedApiFetch.mockReset();
});

function validBook(id = 1) {
  return {
    id,
    title: 'Book ' + id,
    description: 'd',
    url_zip_file: 'https://example.com/' + id + '.zip',
    url_librivox: 'https://librivox.org/' + id,
    url_iarchive: 'https://archive.org/' + id,
    totaltime: '1:30:00',
    language: 'English',
    authors: [{id: String(id), first_name: 'Author', last_name: String(id)}],
  };
}

describe('librivox adapter — V21 W6 P21c', () => {
  it('exposes a documented retries constant', () => {
    expect(LIBRIVOX_RETRIES).toBe(2);
  });

  /**
   * The author line.
   *
   * The wire carries `authors` as an ARRAY of records that split the name
   * into `first_name` / `last_name` — measured 2026-11-18 against
   * `librivox.org/api/feed/audiobooks/?format=json`:
   * `"authors":[{"id":"431","first_name":"Alexandre","last_name":"Dumas",…}]`.
   *
   * The adapter read `b.authors.name` — a property on an OBJECT, where the
   * wire has an array of objects with no `name` at all — so EVERY book in
   * the app was labelled "Unknown Author". The device proof of the
   * Audiobooks screen showed it, ten rows deep.
   */
  it('maps the author array to a full name', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      books: [
        {
          ...validBook(1),
          authors: [
            {id: '431', first_name: 'Alexandre', last_name: 'Dumas'},
          ],
        },
      ],
    });
    const results = await searchAudiobooks('count');
    expect(results[0].author).toBe('Alexandre Dumas');
  });

  it('names the second author, and says et al. for a third', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      books: [
        {
          ...validBook(1),
          authors: [
            {id: '1', first_name: 'A', last_name: 'One'},
            {id: '2', first_name: 'B', last_name: 'Two'},
          ],
        },
      ],
    });
    expect((await searchAudiobooks('count'))[0].author).toBe('A One & B Two');

    mockedApiFetch.mockResolvedValueOnce({
      books: [
        {
          ...validBook(1),
          authors: [
            {id: '1', first_name: 'A', last_name: 'One'},
            {id: '2', first_name: 'B', last_name: 'Two'},
            {id: '3', first_name: 'C', last_name: 'Three'},
          ],
        },
      ],
    });
    expect((await searchAudiobooks('count'))[0].author).toBe(
      'A One & B Two et al.',
    );
  });

  it('says "Unknown Author" when the wire carries no author', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      books: [{...validBook(1), authors: undefined}],
    });
    expect((await searchAudiobooks('count'))[0].author).toBe('Unknown Author');
  });

  it('searchAudiobooks threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce({books: [validBook(1)]});
    const controller = new AbortController();
    await searchAudiobooks('test', undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('searchByAuthor threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce({books: [validBook(1)]});
    const controller = new AbortController();
    await searchByAuthor('test', undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('searchByGenre threads the AbortSignal through the retry fallback', async () => {
    // First call (genre filter) → returns 0 books → fallback
    // to full-text search. Both calls should thread the signal.
    mockedApiFetch.mockResolvedValueOnce({books: []});
    mockedApiFetch.mockResolvedValueOnce({books: [validBook(1)]});
    const controller = new AbortController();
    await searchByGenre('fiction', undefined, controller.signal);
    expect(mockedApiFetch.mock.calls[0][0]).toEqual(
      expect.objectContaining({signal: controller.signal}),
    );
    expect(mockedApiFetch.mock.calls[1][0]).toEqual(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getRecentAudiobooks threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce({books: [validBook(1)]});
    const controller = new AbortController();
    await getRecentAudiobooks(undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getAudiobookById threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce({books: validBook(7)});
    const controller = new AbortController();
    await getAudiobookById(7, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('audiobookResultsFromResponseRaw throws AdapterParseError when a book has no title', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      books: [{...validBook(1), title: undefined}],
    });
    await expect(searchAudiobooks('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('audiobookResultsFromResponseRaw throws AdapterParseError when a book has no id', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      books: [{...validBook(1), id: undefined}],
    });
    await expect(searchAudiobooks('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('handles the single-object envelope (LibriVox returns {books: book} for one result)', async () => {
    mockedApiFetch.mockResolvedValueOnce({books: validBook(1)});
    const result = await searchAudiobooks('test');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 1,
      title: 'Book 1',
      author: 'Author 1',
      totalTime: 5400, // 1:30:00
      language: 'English',
    });
  });

  it('handles the dict-with-numeric-keys envelope (paginated results)', async () => {
    // LibriVox returns `{books: {'0': book0, '1': book1}}` for
    // multi-page responses. The `normalizeBooks` helper unwraps.
    mockedApiFetch.mockResolvedValueOnce({
      books: {
        '0': validBook(1),
        '1': validBook(2),
      },
    });
    const result = await searchAudiobooks('test');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
  });

  it('handles missing / empty books envelope as zero results (not a parse error)', async () => {
    mockedApiFetch.mockResolvedValueOnce({});
    expect(await searchAudiobooks('test')).toEqual([]);

    mockedApiFetch.mockResolvedValueOnce({books: undefined});
    expect(await searchAudiobooks('test')).toEqual([]);
  });

  it('returns parsed books on a valid array envelope', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      books: [validBook(1), validBook(2)],
    });
    const result = await searchAudiobooks('test');
    expect(result).toHaveLength(2);
  });

  it('getAudiobookById returns null on a not-found (missing books)', async () => {
    mockedApiFetch.mockResolvedValueOnce({});
    expect(await getAudiobookById(999)).toBeNull();
  });

  it('searchByGenre falls back to full-text when the genre filter returns 0 books', async () => {
    mockedApiFetch.mockResolvedValueOnce({books: []});
    mockedApiFetch.mockResolvedValueOnce({books: [validBook(1)]});
    const result = await searchByGenre('fiction');
    expect(result).toHaveLength(1);
    // The genre call uses LibriVox's prefix operator, and the fallback
    // call is the title search — NOT `q`, which the API ignores.
    expect(mockedApiFetch.mock.calls[0][0].params).toHaveProperty(
      'genre',
      '^fiction',
    );
    expect(mockedApiFetch.mock.calls[1][0].params).toHaveProperty(
      'title',
      '^fiction',
    );
  });

  it('searchByGenre propagates AdapterParseError from the genre call', async () => {
    // Pre-W22 the catch was generic — both transport and shape
    // failures fell through to the full-text path. Now only
    // transport failures fall through; shape failures
    // propagate so the caller can distinguish "server down"
    // from "server returned garbage".
    mockedApiFetch.mockResolvedValueOnce({
      books: [{...validBook(1), title: undefined}],
    });
    await expect(searchByGenre('fiction')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });
});

// ─── The feed's own contract (measured against the live API) ────────────
//
// `?q=` is IGNORED by LibriVox — it answers 200 with the first books in
// the catalogue, so the app used to "search" by showing the same shelf for
// every term. The search fields are PREFIX matches (`?title=^alice`), and
// the feed pages with `?offset=`, not `?page=`.

describe('librivox adapter — the feed contract', () => {
  it('searchAudiobooks asks for a TITLE prefix match, never `q`', async () => {
    mockedApiFetch.mockResolvedValueOnce({books: [validBook(1)]});
    await searchAudiobooks('alice');
    const params = mockedApiFetch.mock.calls[0][0].params as Record<
      string,
      string | number | undefined
    >;
    expect(params).toHaveProperty('title', '^alice');
    expect(params).not.toHaveProperty('q');
  });

  it('searchAudiobooks falls back to the AUTHOR search when no title matches', async () => {
    mockedApiFetch.mockResolvedValueOnce({books: []});
    mockedApiFetch.mockResolvedValueOnce({books: [validBook(2)]});
    const result = await searchAudiobooks('twain');
    expect(result).toHaveLength(1);
    expect(mockedApiFetch).toHaveBeenCalledTimes(2);
    expect(mockedApiFetch.mock.calls[1][0].params).toHaveProperty(
      'author',
      '^twain',
    );
  });

  it('pages with `offset`, not `page` — LibriVox counts ITEMS', async () => {
    mockedApiFetch.mockResolvedValueOnce({books: [validBook(1)]});
    await searchAudiobooks('alice', {limit: 20, page: 3});
    const params = mockedApiFetch.mock.calls[0][0].params as Record<
      string,
      string | number | undefined
    >;
    expect(params).toHaveProperty('offset', 40);
    expect(params).not.toHaveProperty('page');
  });

  it('a 404 means "no books match", not a failure', async () => {
    mockedApiFetch.mockRejectedValueOnce(
      new ApiError('Request failed with status code 404', 404),
    );
    expect(await searchAudiobooks('nothingmatchesthis')).toEqual([]);
  });

  it('a 500 is still a failure — it is not swallowed as "no results"', async () => {
    mockedApiFetch.mockRejectedValueOnce(
      new ApiError('Request failed with status code 500', 500, 'server'),
    );
    await expect(searchAudiobooks('alice')).rejects.toBeTruthy();
  });
});
