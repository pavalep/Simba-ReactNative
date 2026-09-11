/**
 * V21 W6 P21c — IPTV adapter parse + signal tests.
 *
 * Mirrors the Jamendo (W22 F/U #4 proof-of-pattern), Audius
 * (W22 F/U #5), and Internet Archive (W22 F/U #6) patterns.
 * IPTV has 6 service functions + 4 convertors; the migration
 * adds `signal?: AbortSignal` to all 6 and converts silent
 * `null` skips to `AdapterParseError`.
 *
 * Covers:
 *   - AdapterParseError on malformed wire payloads
 *     (per-channel + envelope)
 *   - signal threading through apiFetch (TanStack Query
 *     cancellation on screen unmount / query-key change)
 *   - the documented retries constant
 *   - getIPTVChannelById propagates AdapterParseError
 *     (the narrowed-catch proof)
 */

import {
  getAllIPTVChannels,
  searchIPTVChannels,
  getChannelsByCountry,
  getChannelsByCategory,
  getIPTVCategories,
  getIPTVChannelById,
  IPTV_RETRIES,
} from '../../../../src/infrastructure/api/iptv/adapter';
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

function validChannel(id = 'ch-1') {
  return {
    id,
    name: 'Channel ' + id,
    url: `https://example.com/${id}/stream.m3u8`,
    logo: `https://example.com/${id}/logo.png`,
    country: 'US',
    country_code: 'us',
    languages: ['en'],
    categories: ['news'],
    is_playable: true,
  };
}

function validCategory(id = 'cat-1', channelCount = 5) {
  return {id, name: 'Category ' + id, channel_count: channelCount};
}

describe('iptv adapter — V21 W6 P21c', () => {
  it('exposes a documented retries constant', () => {
    expect(IPTV_RETRIES).toBe(2);
  });

  it('getAllIPTVChannels threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce([validChannel('a')]);
    const controller = new AbortController();
    await getAllIPTVChannels(undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('searchIPTVChannels threads the AbortSignal (via getAllIPTVChannels)', async () => {
    mockedApiFetch.mockResolvedValueOnce([validChannel('a')]);
    const controller = new AbortController();
    await searchIPTVChannels('news', undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getChannelsByCountry threads the AbortSignal (via getAllIPTVChannels)', async () => {
    mockedApiFetch.mockResolvedValueOnce([validChannel('a')]);
    const controller = new AbortController();
    await getChannelsByCountry('US', undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getChannelsByCategory threads the AbortSignal (via getAllIPTVChannels)', async () => {
    mockedApiFetch.mockResolvedValueOnce([validChannel('a')]);
    const controller = new AbortController();
    await getChannelsByCategory('news', undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getIPTVCategories threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce([validCategory()]);
    const controller = new AbortController();
    await getIPTVCategories(controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getIPTVChannelById threads the AbortSignal (via getAllIPTVChannels)', async () => {
    mockedApiFetch.mockResolvedValueOnce([validChannel('a')]);
    const controller = new AbortController();
    await getIPTVChannelById('a', controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('channelResultsFromRaw throws AdapterParseError when envelope is not an array', async () => {
    mockedApiFetch.mockResolvedValueOnce({not: 'an array'});
    await expect(getAllIPTVChannels()).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('channelResultsFromRaw throws AdapterParseError when a channel has a missing url', async () => {
    // `url` is required (non-empty) — a channel without a stream
    // url isn't playable.
    mockedApiFetch.mockResolvedValueOnce([
      {...validChannel('a'), url: ''},
    ]);
    await expect(getAllIPTVChannels()).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('channelResultsFromRaw throws AdapterParseError when a channel has a missing id', async () => {
    mockedApiFetch.mockResolvedValueOnce([
      {...validChannel('a'), id: ''},
    ]);
    await expect(getAllIPTVChannels()).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('categoryResultsFromRaw throws AdapterParseError when envelope is not an array', async () => {
    mockedApiFetch.mockResolvedValueOnce({not: 'an array'});
    await expect(getIPTVCategories()).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('categoryResultsFromRaw throws AdapterParseError when a category has a negative channel_count', async () => {
    mockedApiFetch.mockResolvedValueOnce([
      {...validCategory('a'), channel_count: -1},
    ]);
    await expect(getIPTVCategories()).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('returns parsed channels on a valid payload', async () => {
    mockedApiFetch.mockResolvedValueOnce([
      validChannel('a'),
      validChannel('b'),
    ]);
    const results = await getAllIPTVChannels();
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      id: 'a',
      name: 'Channel a',
      url: 'https://example.com/a/stream.m3u8',
      country: 'US',
      countryCode: 'us',
    });
  });

  it('returns parsed categories on a valid payload', async () => {
    mockedApiFetch.mockResolvedValueOnce([
      validCategory('news', 100),
      validCategory('sports', 50),
    ]);
    const results = await getIPTVCategories();
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({id: 'news', name: 'Category news', channelCount: 100});
  });

  it('handles missing / empty response as zero results (not a parse error)', async () => {
    mockedApiFetch.mockResolvedValueOnce(null);
    expect(await getAllIPTVChannels()).toEqual([]);

    mockedApiFetch.mockResolvedValueOnce([]);
    expect(await getAllIPTVChannels()).toEqual([]);
  });

  it('getIPTVChannelById returns null on a not-found (no matching id)', async () => {
    mockedApiFetch.mockResolvedValueOnce([validChannel('a')]);
    expect(await getIPTVChannelById('not-present')).toBeNull();
  });

  it('getIPTVChannelById propagates AdapterParseError', async () => {
    // Pre-W22 the catch was generic — both transport and shape
    // failures returned `null`. Now only transport failures are
    // swallowed; shape failures propagate so the caller can
    // distinguish "server is down" from "server returned garbage".
    mockedApiFetch.mockResolvedValueOnce({not: 'an array'});
    await expect(getIPTVChannelById('a')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });
});
