/**
 * V21 W6 P21c — Weather adapter parse + signal tests.
 *
 * Mirrors the Jamendo / Audius / Internet Archive / IPTV /
 * LibriVox / MusicBrainz / RadioBrowser / TVMaze patterns.
 * Weather has 4 service functions + 2 convertors
 * (`cityCoordsFromRaw` + `weatherSnapshotFromCurrentRaw`).
 *
 * The shape validation here was already in place pre-W22
 * (the `typeof number` checks are documented as
 * "defensive — the wire shape says number, but at the
 * boundary we don't trust it"). The W6 P21c migration
 * distinguishes:
 *   - Missing `results` / missing `current` / empty array
 *     → `null` (legitimate "no data" — the caller falls
 *     through to the next source in the cascade).
 *   - Non-numeric lat / lon / temperature / weather_code
 *     → `AdapterParseError` (wire-shape failure).
 *
 * Covers:
 *   - AdapterParseError on malformed wire payloads
 *   - signal threading through apiFetch
 *   - the documented retries constant
 *   - getCityCoords swallows transport errors but
 *     propagates AdapterParseError (the narrowed-catch proof)
 *   - fetchWeatherByCity / fetchWeatherByCoords thread
 *     signal through the internal two-call flow
 */

import {
  getCityCoords,
  fetchWeatherByCity,
  fetchWeatherByCoords,
  WEATHER_RETRIES,
} from '../../../../src/infrastructure/api/weather/adapter';
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

function validGeocoding(city = 'Mumbai', lat = 19.0, lon = 72.8) {
  return {
    results: [{name: city, latitude: lat, longitude: lon, country: 'IN'}],
  };
}

function validCurrent(tempC = 25, weatherCode = 0, isDay = 1) {
  return {
    current: {
      temperature_2m: tempC,
      weather_code: weatherCode,
      is_day: isDay,
    },
  };
}

describe('weather adapter — V21 W6 P21c', () => {
  it('exposes a documented retries constant', () => {
    expect(WEATHER_RETRIES).toBe(2);
  });

  it('getCityCoords threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce(validGeocoding());
    const controller = new AbortController();
    await getCityCoords('Mumbai', controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('fetchWeatherByCity threads the AbortSignal to BOTH calls', async () => {
    // First call: geocoding. Second call: forecast.
    mockedApiFetch.mockResolvedValueOnce(validGeocoding());
    mockedApiFetch.mockResolvedValueOnce(validCurrent());
    const controller = new AbortController();
    await fetchWeatherByCity('Mumbai', controller.signal);
    expect(mockedApiFetch.mock.calls[0][0]).toEqual(
      expect.objectContaining({signal: controller.signal}),
    );
    expect(mockedApiFetch.mock.calls[1][0]).toEqual(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('fetchWeatherByCoords threads the AbortSignal', async () => {
    mockedApiFetch.mockResolvedValueOnce(validCurrent());
    const controller = new AbortController();
    await fetchWeatherByCoords(19.0, 72.8, 'Mumbai', controller.signal);
    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.objectContaining({signal: controller.signal}),
    );
  });

  it('cityCoordsFromRaw throws AdapterParseError on non-finite latitude (V21 W6 P21c)', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      results: [{name: 'X', latitude: Number.POSITIVE_INFINITY, longitude: 0}],
    });
    await expect(getCityCoords('X')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('cityCoordsFromRaw throws AdapterParseError on non-numeric longitude (V21 W6 P21c)', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      results: [{name: 'X', latitude: 0, longitude: 'not-a-number' as never}],
    });
    await expect(getCityCoords('X')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('weatherSnapshotFromCurrentRaw throws AdapterParseError on non-finite temperature', async () => {
    // Two-call flow: geocoding returns valid, forecast returns
    // malformed current. The wire-shape error propagates.
    mockedApiFetch.mockResolvedValueOnce(validGeocoding());
    mockedApiFetch.mockResolvedValueOnce({
      current: {temperature_2m: Number.POSITIVE_INFINITY, weather_code: 0, is_day: 1},
    });
    await expect(fetchWeatherByCity('Mumbai')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('getCityCoords returns null on a not-found (empty results)', async () => {
    // Legitimate "no city found" — the caller falls through to
    // the next source in the cascade.
    mockedApiFetch.mockResolvedValueOnce({results: []});
    expect(await getCityCoords('nonexistent')).toBeNull();
  });

  it('getCityCoords returns null on a transport error (ApiError swallowed)', async () => {
    mockedApiFetch.mockRejectedValueOnce(new Error('network'));
    expect(await getCityCoords('Mumbai')).toBeNull();
  });

  it('getCityCoords propagates AdapterParseError (V21 W6 P21c narrowed catch)', async () => {
    // Pre-W22 the catch was generic — both transport and shape
    // failures returned `null`. Now only transport failures are
    // swallowed; shape failures propagate.
    mockedApiFetch.mockResolvedValueOnce('not-an-object');
    await expect(getCityCoords('Mumbai')).rejects.toBeInstanceOf(
      AdapterParseError,
    );
  });

  it('returns parsed coords on a valid payload', async () => {
    mockedApiFetch.mockResolvedValueOnce(validGeocoding('Mumbai', 19.0, 72.8));
    const coords = await getCityCoords('Mumbai');
    expect(coords).toEqual({city: 'Mumbai', lat: 19.0, lon: 72.8});
  });

  it('returns parsed snapshot on a valid payload', async () => {
    mockedApiFetch.mockResolvedValueOnce(validCurrent(25.4, 0, 1));
    const snapshot = await fetchWeatherByCoords(19.0, 72.8, 'Mumbai');
    expect(snapshot).not.toBeNull();
    expect(snapshot?.temperatureC).toBe(25);
    expect(snapshot?.condition).toBe('sunny');
    expect(snapshot?.isDay).toBe(true);
    expect(snapshot?.source).toBe('coords');
  });

  it('handles missing / empty current envelope as null (legitimate "no data")', async () => {
    mockedApiFetch.mockResolvedValueOnce({});
    expect(await fetchWeatherByCoords(19.0, 72.8, 'X')).toBeNull();

    mockedApiFetch.mockResolvedValueOnce({current: undefined});
    expect(await fetchWeatherByCoords(19.0, 72.8, 'X')).toBeNull();
  });
});
