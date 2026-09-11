/**
 * V21 W6 P21c — radio-browser adapter parse + signal tests.
 *
 * Mirrors the Jamendo / Audius / Internet Archive / IPTV /
 * LibriVox / MusicBrainz patterns. radio-browser has 9 service
 * functions + 4 convertors (station single/list, tag single/
 * list). The migration adds `signal?: AbortSignal` to all 9
 * service funcs and converts silent `null` skips to
 * `AdapterParseError`.
 *
 * Covers:
 *   - AdapterParseError on malformed wire payloads
 *     (per-station + per-tag + envelope)
 *   - signal threading through apiFetch (TanStack Query
 *     cancellation on screen unmount / query-key change)
 *   - the documented retries constant
 *   - getStationById returns null on a not-found
 */

import {
  searchStations,
  getStationsByCountry,
  getStationsByGenre,
  getStationsByLanguage,
  getStationsByFilters,
  getTopStations,
  getStationById,
  getGenres,
  getCountries,
  getLanguages,
  RADIO_BROWSER_RETRIES,
} from '../../../../src/infrastructure/api/radioBrowser/adapter';
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

function validStation(id = 's-1') {
  return {
    stationuuid: id,
    name: 'Station ' + id,
    url: `https://example.com/${id}/stream.mp3`,
    url_resolved: `https://example.com/${id}/resolved.mp3`,
    favicon: `https://example.com/${id}/favicon.png`,
    tags: 'rock,pop',
    country: 'US',
    language: 'english',
    codec: 'MP3',
    bitrate: 128,
    clickcount: 100,
  };
}

function validTag(name = 'rock', stationcount = 100) {
  return {name, stationcount};
}

describe('radio-browser adapter — V21 W6 P21c', () => {
  it('exposes a documented retries constant', () => {
    expect(RADIO_BROWSER_RETRIES).toBe(2);
  });

  it('searchStations threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce([validStation('s1')]);
    const controller = new AbortController();
    await searchStations('rock', undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getStationsByCountry threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce([validStation('s1')]);
    const controller = new AbortController();
    await getStationsByCountry('US', undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getStationsByGenre threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce([validStation('s1')]);
    const controller = new AbortController();
    await getStationsByGenre('rock', undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getStationsByLanguage threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce([validStation('s1')]);
    const controller = new AbortController();
    await getStationsByLanguage('english', undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getStationsByFilters threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce([validStation('s1')]);
    const controller = new AbortController();
    await getStationsByFilters({genre: 'rock'}, undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getTopStations threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce([validStation('s1')]);
    const controller = new AbortController();
    await getTopStations(undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getStationById threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce([validStation('s1')]);
    const controller = new AbortController();
    await getStationById('s1', controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getGenres threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce([validTag('rock')]);
    const controller = new AbortController();
    await getGenres(40, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getCountries threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce([validTag('US')]);
    const controller = new AbortController();
    await getCountries(30, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getLanguages threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce([validTag('english')]);
    const controller = new AbortController();
    await getLanguages(30, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('stationsFromRaw throws AdapterParseError when envelope is not an array', async () => {
    mockedApiFetch.mockResolvedValueOnce({not: 'an array'});
    await expect(searchStations('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('stationsFromRaw throws AdapterParseError when a station has a missing uuid', async () => {
    mockedApiFetch.mockResolvedValueOnce([
      {...validStation('s1'), stationuuid: ''},
    ]);
    await expect(searchStations('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('stationsFromRaw throws AdapterParseError when a station has a missing name', async () => {
    mockedApiFetch.mockResolvedValueOnce([
      {...validStation('s1'), name: ''},
    ]);
    await expect(searchStations('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('browseTagsFromRaw throws AdapterParseError when envelope is not an array', async () => {
    mockedApiFetch.mockResolvedValueOnce({not: 'an array'});
    await expect(getGenres()).rejects.toBeInstanceOf(AdapterParseError);
  });

  it('browseTagsFromRaw throws AdapterParseError when a tag has an empty name', async () => {
    mockedApiFetch.mockResolvedValueOnce([{name: '', stationcount: 50}]);
    await expect(getGenres()).rejects.toBeInstanceOf(AdapterParseError);
  });

  it('returns parsed stations on a valid payload', async () => {
    mockedApiFetch.mockResolvedValueOnce([
      validStation('s1'),
      validStation('s2'),
    ]);
    const result = await searchStations('rock');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 's1',
      name: 'Station s1',
      url: 'https://example.com/s1/resolved.mp3', // url_resolved preferred
      image: 'https://example.com/s1/favicon.png',
      country: 'US',
    });
  });

  it('returns parsed tags on a valid payload', async () => {
    mockedApiFetch.mockResolvedValueOnce([
      validTag('rock', 100),
      validTag('pop', 50),
    ]);
    const result = await getGenres(40);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({name: 'rock', stationCount: 100});
  });

  it('handles missing / empty envelope as zero results (not a parse error)', async () => {
    mockedApiFetch.mockResolvedValueOnce(null);
    expect(await searchStations('test')).toEqual([]);

    mockedApiFetch.mockResolvedValueOnce([]);
    expect(await searchStations('test')).toEqual([]);
  });

  it('getStationById returns null on a not-found (empty stations)', async () => {
    mockedApiFetch.mockResolvedValueOnce([]);
    expect(await getStationById('missing')).toBeNull();
  });
});
