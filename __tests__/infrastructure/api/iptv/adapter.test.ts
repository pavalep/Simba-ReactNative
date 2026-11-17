/**
 * WAVE B13.1 — the IPTV adapter: the fetch layer.
 *
 * The adapter is the ONLY thing in the IPTV feature that touches the
 * network. It reads three things at once:
 *
 *   - the PLAYLIST the source publishes for players (2,822,591 bytes,
 *     12,269 entries) — as TEXT, not as JSON;
 *   - `api/categories.json` (856 bytes) — the id → name map;
 *   - `api/countries.json` (4,248 bytes) — the code → name map.
 *
 * and hands back the whole catalogue: every channel with its logo, its
 * category and its country, plus the categories with the count the app
 * counted.
 *
 * The adapter this replaces read `api/channels.json` and demanded a
 * stream URL from every record — a field that file does not have
 * (measured: 31,843 records, 0 occurrences of `url`) — so it rejected
 * the whole batch and Live TV showed an error card for every channel.
 */

import {
  getIPTVCatalogue,
  categoryNameMapFromRaw,
  countryNameMapFromRaw,
  IPTV_RETRIES,
} from '../../../../src/infrastructure/api/iptv/adapter';
import {AdapterParseError} from '../../../../src/infrastructure/api/adapterErrors';

jest.mock('../../../../src/infrastructure/api/apiClient', () => ({
  apiFetch: jest.fn(),
}));
const {apiFetch} = require('../../../../src/infrastructure/api/apiClient');
const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

beforeEach(() => {
  mockedApiFetch.mockReset();
});

const PLAYLIST = [
  '#EXTM3U',
  '#EXTINF:-1 tvg-id="3ABNKids.us@SD" tvg-logo="https://example.com/kids.png" group-title="Animation",3ABN Kids (720p)',
  'https://example.com/kids.m3u8',
  '#EXTINF:-1 tvg-id="AnimaxAsia.sg@Taiwan" group-title="Animation",Animax Asia Taiwan',
  'https://example.com/animax.m3u8',
].join('\n');

const CATEGORIES = [
  {id: 'animation', name: 'Animation'},
  {id: 'xxx', name: 'XXX'},
];

const COUNTRIES = [
  {name: 'United States', code: 'us'},
  {name: 'Singapore', code: 'sg'},
];

describe('iptv adapter — the catalogue', () => {
  it('exposes a documented retries constant', () => {
    expect(IPTV_RETRIES).toBe(2);
  });

  it('reads the playlist, the categories and the countries', async () => {
    mockedApiFetch.mockResolvedValueOnce(PLAYLIST);
    mockedApiFetch.mockResolvedValueOnce(CATEGORIES);
    mockedApiFetch.mockResolvedValueOnce(COUNTRIES);

    const catalogue = await getIPTVCatalogue();

    expect(mockedApiFetch).toHaveBeenCalledTimes(3);

    const [playlistCall, categoryCall, countryCall] = mockedApiFetch.mock.calls;

    // The playlist is TEXT. Asking for JSON would be asking the wrong
    // question of a body that is a playlist.
    expect(playlistCall[0]).toEqual(
      expect.objectContaining({
        path: '/index.category.m3u',
        responseType: 'text',
      }),
    );
    expect(playlistCall[0].headers?.Accept).toContain('audio/x-mpegurl');

    expect(categoryCall[0]).toEqual(
      expect.objectContaining({path: '/categories.json'}),
    );
    expect(countryCall[0]).toEqual(
      expect.objectContaining({path: '/countries.json'}),
    );

    expect(catalogue.channels).toHaveLength(2);
    expect(catalogue.channels[0]).toMatchObject({
      id: '3ABNKids.us@SD',
      name: '3ABN Kids',
      country: 'United States',
      category: 'Animation',
      categoryId: 'animation',
    });
  });

  it('threads the AbortSignal through every request', async () => {
    mockedApiFetch.mockResolvedValueOnce(PLAYLIST);
    mockedApiFetch.mockResolvedValueOnce(CATEGORIES);
    mockedApiFetch.mockResolvedValueOnce(COUNTRIES);

    const controller = new AbortController();
    await getIPTVCatalogue(controller.signal);

    for (const call of mockedApiFetch.mock.calls) {
      expect(call[0]).toEqual(
        expect.objectContaining({signal: controller.signal}),
      );
    }
  });

  it('counts the channels per category', async () => {
    mockedApiFetch.mockResolvedValueOnce(PLAYLIST);
    mockedApiFetch.mockResolvedValueOnce(CATEGORIES);
    mockedApiFetch.mockResolvedValueOnce(COUNTRIES);

    const catalogue = await getIPTVCatalogue();
    const byId = new Map(catalogue.categories.map(c => [c.id, c]));

    expect(byId.get('animation')?.channelCount).toBe(2);
    // The category the source serves that has no channels at all.
    expect(byId.get('xxx')?.channelCount).toBe(0);
  });
});

describe('iptv adapter — the two maps are MENUS', () => {
  it('drops a category row it cannot draw and keeps the rest', () => {
    // One bad row must not void every category — the menu is the thing
    // the user filters with.
    const map = categoryNameMapFromRaw([
      {id: 'news', name: 'News'},
      {id: '', name: 'Nameless id'},
      {id: 'no-name', name: ''},
      {id: 'sports', name: 'Sports'},
    ]);

    expect(map.get('news')).toBe('News');
    expect(map.get('sports')).toBe('Sports');
    expect(map.size).toBe(2);
  });

  it('drops a country row it cannot draw and keeps the rest', () => {
    const map = countryNameMapFromRaw([
      {name: 'United States', code: 'us'},
      {name: '', code: 'zz'},
      {name: 'Nowhere', code: ''},
    ]);

    expect(map.get('us')).toBe('United States');
    expect(map.size).toBe(1);
  });

  it('throws when a map is not an array', () => {
    expect(() => categoryNameMapFromRaw({not: 'an array'})).toThrow(
      AdapterParseError,
    );
    expect(() => countryNameMapFromRaw({not: 'an array'})).toThrow(
      AdapterParseError,
    );
  });

  it('treats a missing map as an empty one', () => {
    expect(categoryNameMapFromRaw(null).size).toBe(0);
    expect(countryNameMapFromRaw(undefined).size).toBe(0);
  });
});
