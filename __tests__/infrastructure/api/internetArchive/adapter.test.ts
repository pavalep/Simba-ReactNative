/**
 * V21 W6 P21c — Internet Archive adapter parse + signal tests.
 *
 * Mirrors the Jamendo (W22 F/U #4 proof-of-pattern) and Audius
 * (W22 F/U #5) patterns. The IA adapter is larger than the
 * others (6 service functions + a retry helper) so this test
 * file focuses on the W6 P21c additions: signal threading +
 * AdapterParseError throws on malformed wire payloads.
 *
 * Covers:
 *   - AdapterParseError on malformed wire payloads (envelope
 *     + per-item shape)
 *   - signal threading through apiFetch (TanStack Query
 *     cancellation on screen unmount / query-key change)
 *   - the documented retries constant
 *   - getInternetArchiveItemDetails propagates AdapterParseError
 *     (the narrowed-catch proof)
 */

import {
  searchInternetArchiveAudio,
  searchInternetArchiveMusic,
  getInternetArchiveItemDetails,
  getArchiveTracks,
  searchInternetArchiveVideos,
  getInternetArchiveVideoDetails,
  resolveInternetArchiveVideoDetails,
  INTERNET_ARCHIVE_RETRIES,
} from '../../../../src/infrastructure/api/internetArchive/adapter';
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

function validItem(id = 'item-1') {
  return {
    identifier: id,
    title: 'Title ' + id,
    description: '',
    creator: 'Creator',
    year: '',
    runtime: '',
    avg_rating: 0,
    download_count: 0,
    image_url: '',
  };
}

function validMetadata(identifier = 'item-1') {
  return {
    metadata: {
      identifier,
      title: 'Title ' + identifier,
      description: '',
      creator: '',
      year: '',
      mediatype: 'movies',
    },
    files: [],
  };
}

describe('internetArchive adapter — V21 W6 P21c', () => {
  it('exposes a documented retries constant', () => {
    expect(INTERNET_ARCHIVE_RETRIES).toBe(2);
  });

  it('searchInternetArchiveAudio threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce({response: {docs: []}});
    const controller = new AbortController();
    await searchInternetArchiveAudio('test', undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('searchInternetArchiveMusic threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce({response: {docs: []}});
    const controller = new AbortController();
    await searchInternetArchiveMusic('test', undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('searchInternetArchiveVideos threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce({response: {docs: []}});
    const controller = new AbortController();
    await searchInternetArchiveVideos('test', undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getInternetArchiveItemDetails threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce(validMetadata());
    const controller = new AbortController();
    await getInternetArchiveItemDetails('item-1', controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getArchiveTracks threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce(validMetadata());
    const controller = new AbortController();
    await getArchiveTracks('item-1', controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getInternetArchiveVideoDetails threads the AbortSignal through the retry helper', async () => {
    // Empty files + no `files_count` → `internetArchiveVideoDetailsFromRaw`
    // returns the metadata with a fallback `directoryUrl` (not
    // partial-replication, which needs `files_count > 0`). The
    // retry helper resolves on the first attempt. The signal
    // is threaded to that attempt.
    mockedApiFetch.mockResolvedValueOnce(validMetadata());
    const controller = new AbortController();
    const result = await getInternetArchiveVideoDetails(
      'item-1',
      controller.signal,
    );
    expect(result).not.toBeNull();
    expect(result?.identifier).toBe('item-1');
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('resolveInternetArchiveVideoDetails threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce(validMetadata());
    const controller = new AbortController();
    const result = await resolveInternetArchiveVideoDetails(
      'item-1',
      undefined,
      3,
      controller.signal,
    );
    expect(result).not.toBeNull();
    expect(result?.identifier).toBe('item-1');
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('internetArchiveItemResultsFromRaw throws AdapterParseError when envelope is not an object', async () => {
    mockedApiFetch.mockResolvedValueOnce('not-an-object');
    await expect(searchInternetArchiveAudio('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('internetArchiveItemResultsFromRaw throws AdapterParseError when a doc is missing identifier', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      response: {docs: [{...validItem(), identifier: ''}]},
    });
    await expect(searchInternetArchiveAudio('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('internetArchiveVideoResultsFromRaw throws AdapterParseError when a doc is missing identifier', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      response: {docs: [{...validItem(), identifier: ''}]},
    });
    await expect(searchInternetArchiveVideos('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('handles missing / empty response envelope as zero results (not a parse error)', async () => {
    mockedApiFetch.mockResolvedValueOnce({});
    const r1 = await searchInternetArchiveAudio('test');
    expect(r1).toEqual({items: [], numFound: 0});

    mockedApiFetch.mockResolvedValueOnce({response: {docs: []}});
    const r2 = await searchInternetArchiveAudio('test');
    expect(r2).toEqual({items: [], numFound: 0});
  });

  it('returns parsed results on a valid payload', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      response: {docs: [validItem('a'), validItem('b')], numFound: 2},
    });
    const result = await searchInternetArchiveAudio('test');
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({identifier: 'a'});
    expect(result.numFound).toBe(2);
  });

  it('getInternetArchiveItemDetails returns null on a not-found (missing metadata)', async () => {
    // The API returns `{}` for a missing item — that's a
    // legitimate "not found", not a parse error.
    mockedApiFetch.mockResolvedValueOnce({});
    expect(await getInternetArchiveItemDetails('missing')).toBeNull();
  });

  it('getInternetArchiveItemDetails propagates AdapterParseError', async () => {
    // Pre-W22 the catch was generic — both transport and shape
    // failures returned `null`. Now only transport failures are
    // swallowed; shape failures propagate.
    mockedApiFetch.mockResolvedValueOnce({
      metadata: {
        identifier: '',
        title: '',
        description: '',
        creator: '',
        year: '',
      },
      files: [],
    });
    await expect(getInternetArchiveItemDetails('item-1')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });
});
