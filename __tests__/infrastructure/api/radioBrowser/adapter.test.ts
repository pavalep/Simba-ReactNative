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
  browseTagsFromRaw,
  drawableBrowseTagsFromRaw,
  RADIO_BROWSER_RETRIES,
} from '../../../../src/infrastructure/api/radioBrowser/adapter';
import {AdapterParseError} from '../../../../src/infrastructure/api/adapterErrors';

jest.mock('../../../../src/infrastructure/api/apiClient', () => ({
  apiFetch: jest.fn(),
}));
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

  it('browseTagsFromRaw throws AdapterParseError when a tag has an empty name', () => {
    // The STRICT convertor keeps the W6 P21c contract: a malformed tag is
    // an error, not a silently skipped row. The MENU path (the one the
    // tag sheets use) is the separate function below.
    expect(() =>
      browseTagsFromRaw([{name: '', stationcount: 50}]),
    ).toThrow(/expected non-empty string/);
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

/**
 * The MENU path — a bulk tag list must survive a bulk list's bad rows.
 *
 * MEASURED on 2026-11-16 against the live API: `/json/countries` answers
 * with 225 records, and **2 of them have an EMPTY `name`** (the ISO codes
 * `UN` and `ZZ`). The strict parser rejects an empty name and the strict
 * batch convertor maps over the WHOLE batch — so ONE unusable record
 * voided all 223 good countries, and the Radio screen's COUNTRY group
 * rendered its header with no chips under it, with no error and no retry.
 *
 * Proven on device on 2026-11-16: the sheet's COUNTRY group was empty
 * while GENRE and LANGUAGE were full.
 */
describe('radio-browser adapter — the tag menus survive a bad row', () => {
  it('drawableBrowseTagsFromRaw keeps the drawable rows and drops the rest', () => {
    const tags = drawableBrowseTagsFromRaw([
      {name: 'Germany', stationcount: 5604},
      {name: '', stationcount: 1},
      {name: 'France', stationcount: 2801},
      null,
    ]);
    expect(tags).toEqual([
      {name: 'Germany', stationCount: 5604},
      {name: 'France', stationCount: 2801},
    ]);
  });

  it('drawableBrowseTagsFromRaw still rejects a payload that is not an array', () => {
    expect(() => drawableBrowseTagsFromRaw({not: 'an array'})).toThrow(
      AdapterParseError,
    );
  });

  it('getCountries keeps 223 good countries when 2 have no name', async () => {
    // The live payload's shape: 223 named countries + the two unnamed
    // ones (UN, ZZ).
    const payload = [
      ...Array.from({length: 223}, (_v, i) => ({
        name: `Country ${i}`,
        stationcount: 100,
      })),
      {name: '', stationcount: 1},
      {name: '', stationcount: 1},
    ];
    mockedApiFetch.mockResolvedValueOnce(payload);

    const countries = await getCountries(30);

    expect(countries).toHaveLength(30);
    expect(countries.every(c => c.name.length > 0)).toBe(true);
  });

  it('getGenres drops an unnamed tag instead of voiding the whole menu', async () => {
    mockedApiFetch.mockResolvedValueOnce([
      validTag('pop', 900),
      {name: '', stationcount: 1},
      validTag('rock', 700),
    ]);

    const genres = await getGenres(40);

    expect(genres).toEqual([
      {name: 'pop', stationCount: 900},
      {name: 'rock', stationCount: 700},
    ]);
  });

  it('getLanguages drops an unnamed language instead of voiding the menu', async () => {
    mockedApiFetch.mockResolvedValueOnce([
      validTag('english', 11334),
      {name: '', stationcount: 1},
      validTag('german', 3979),
    ]);

    const languages = await getLanguages(30);

    expect(languages).toHaveLength(2);
  });

  it('orders the country menu by station count', async () => {
    // MEASURED: without an order the API answers in an arbitrary order
    // (Andorra, 5 stations, first). With `order=stationcount&reverse=true`
    // the list opens with the United States, Germany, France.
    mockedApiFetch.mockResolvedValueOnce([validTag('Germany', 5604)]);

    await getCountries(30);

    expect(mockedApiFetch.mock.calls[0][0].params).toMatchObject({
      order: 'stationcount',
      reverse: 'true',
    });
  });

  it('orders the language menu by station count, not alphabetically', async () => {
    // MEASURED: in the API's own order the language menu opens with
    // "1", "111", "123" — the stations that report a numeric language
    // code. Ordered by station count it opens with english, german,
    // spanish.
    mockedApiFetch.mockResolvedValueOnce([validTag('english', 11334)]);

    await getLanguages(30);

    expect(mockedApiFetch.mock.calls[0][0].params).toMatchObject({
      order: 'stationcount',
      reverse: 'true',
    });
  });
});
