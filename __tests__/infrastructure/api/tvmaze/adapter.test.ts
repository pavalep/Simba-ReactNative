/**
 * V21 W6 P21c — TVMaze adapter parse + signal tests.
 *
 * Mirrors the Jamendo / Audius / Internet Archive / IPTV /
 * LibriVox / MusicBrainz / RadioBrowser patterns. TVMaze has
 * 5 service functions + 1 convertor (`showsFromSearchRaw`).
 *
 * Covers:
 *   - AdapterParseError on malformed wire payloads
 *     (per-show + envelope)
 *   - signal threading through apiFetch (TanStack Query
 *     cancellation on screen unmount / query-key change)
 *   - the documented retries constant
 */

import {
  searchShows,
  getPopularShows,
  getShowById,
  getEpisodeList,
  getSchedule,
  TVMAZE_RETRIES,
} from '../../../../src/infrastructure/api/tvmaze/adapter';
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

function validShow(id = 1) {
  return {
    id,
    name: 'Show ' + id,
    type: 'Scripted',
    language: 'English',
    genres: ['Drama'],
    status: 'Running',
    runtime: 30,
    premiered: '2020-01-01',
    ended: null,
    officialSite: null,
    schedule: {time: '21:00', days: ['Monday']},
    rating: {average: 8.5},
    weight: 100,
    network: null,
    webChannel: null,
    externals: {tvrage: null, thetvdb: null, imdb: null},
    image: null,
    summary: 'A show.',
    updated: 1600000000,
    _links: {self: {href: ''}, previousepisode: {href: ''}},
  };
}

function validSearchResult(id = 1) {
  return {score: 0.95, show: validShow(id)};
}

describe('tvmaze adapter — V21 W6 P21c', () => {
  it('exposes a documented retries constant', () => {
    expect(TVMAZE_RETRIES).toBe(2);
  });

  it('searchShows threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce([validSearchResult(1)]);
    const controller = new AbortController();
    await searchShows('test', controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getPopularShows threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce([validShow(1)]);
    const controller = new AbortController();
    await getPopularShows(1, undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getShowById threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce(validShow(1));
    const controller = new AbortController();
    await getShowById(1, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getEpisodeList threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce([]);
    const controller = new AbortController();
    await getEpisodeList(1, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('getSchedule threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce([]);
    const controller = new AbortController();
    await getSchedule(undefined, undefined, controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('searchShows throws AdapterParseError when a show has a non-finite id', async () => {
    mockedApiFetch.mockResolvedValueOnce([
      {score: 0.95, show: {...validShow(1), id: Number.POSITIVE_INFINITY}},
    ]);
    await expect(searchShows('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('searchShows throws AdapterParseError when a show has a missing name', async () => {
    mockedApiFetch.mockResolvedValueOnce([
      {score: 0.95, show: {...validShow(1), name: ''}},
    ]);
    await expect(searchShows('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('searchShows throws AdapterParseError when envelope is not an array', async () => {
    mockedApiFetch.mockResolvedValueOnce({not: 'an array'});
    await expect(searchShows('test')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('returns parsed shows on a valid payload', async () => {
    mockedApiFetch.mockResolvedValueOnce([
      validSearchResult(1),
      validSearchResult(2),
    ]);
    const result = await searchShows('test');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({id: 1, name: 'Show 1'});
  });

  it('handles missing / empty envelope as zero results (not a parse error)', async () => {
    mockedApiFetch.mockResolvedValueOnce(null);
    expect(await searchShows('test')).toEqual([]);

    mockedApiFetch.mockResolvedValueOnce([]);
    expect(await searchShows('test')).toEqual([]);
  });
});
