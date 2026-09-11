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
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {apiFetch} = require('../../../../src/infrastructure/api/apiClient');
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
    authors: {name: 'Author ' + id},
  };
}

describe('librivox adapter — V21 W6 P21c', () => {
  it('exposes a documented retries constant', () => {
    expect(LIBRIVOX_RETRIES).toBe(2);
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
    // The fallback call used `q=...` instead of `genre=...`.
    expect(mockedApiFetch.mock.calls[1][0].params).toHaveProperty('q', 'fiction');
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
