/**
 * V18 — weatherAdapter convertor tests
 *
 * These tests prove the convertor contract:
 * - happy paths produce the expected domain shape
 * - missing fields produce `null` (never throw)
 * - `undefined` input produces `null` (transport-failure case)
 *
 * They DO NOT touch the network. The HTTP layer is exercised in
 * V18.2.4 (manual smoke + the migrated useWeather hook's
 * integration test).
 */
import {
  cityCoordsFromRaw,
  weatherSnapshotFromCurrentRaw,
  wmoCodeToCondition,
} from '../src/services/api/weatherAdapter';

describe('cityCoordsFromRaw', () => {
  it('maps a valid geocoding response to CityCoords', () => {
    expect(
      cityCoordsFromRaw({
        results: [{name: 'Mumbai', latitude: 19.076, longitude: 72.8777}],
      }),
    ).toEqual({city: 'Mumbai', lat: 19.076, lon: 72.8777});
  });

  it('returns null when results is missing', () => {
    expect(cityCoordsFromRaw({})).toBeNull();
  });

  it('returns null when results is empty', () => {
    expect(cityCoordsFromRaw({results: []})).toBeNull();
  });

  it('returns null when latitude is non-numeric', () => {
    expect(
      cityCoordsFromRaw({
        results: [
          {name: 'Bad', latitude: '19.076' as unknown as number, longitude: 72.8777},
        ],
      }),
    ).toBeNull();
  });

  it('returns null for undefined input (transport failure)', () => {
    expect(cityCoordsFromRaw(undefined)).toBeNull();
  });
});

describe('weatherSnapshotFromCurrentRaw', () => {
  const context = {source: 'coords' as const, cityName: 'Mumbai', fetchedAt: 1234};

  it('maps a complete current-weather response to a snapshot', () => {
    expect(
      weatherSnapshotFromCurrentRaw(
        {current: {temperature_2m: 28.4, weather_code: 2, is_day: 1}},
        context,
      ),
    ).toEqual({
      condition: 'partlyCloudy',
      description: 'Partly cloudy',
      temperatureC: 28,
      isDay: true,
      cityName: 'Mumbai',
      source: 'coords',
      fetchedAt: 1234,
    });
  });

  it('rounds the temperature (does not floor)', () => {
    expect(
      weatherSnapshotFromCurrentRaw(
        {current: {temperature_2m: 28.6, weather_code: 0, is_day: 1}},
        context,
      )?.temperatureC,
    ).toBe(29);
  });

  it('treats is_day=0 as night', () => {
    expect(
      weatherSnapshotFromCurrentRaw(
        {current: {temperature_2m: 18, weather_code: 0, is_day: 0}},
        context,
      ),
    ).toMatchObject({condition: 'clearNight', isDay: false, description: 'Clear night'});
  });

  it('returns null when current is missing', () => {
    expect(weatherSnapshotFromCurrentRaw({}, context)).toBeNull();
  });

  it('returns null when temperature_2m is missing', () => {
    expect(
      weatherSnapshotFromCurrentRaw(
        {current: {weather_code: 2, is_day: 1}},
        context,
      ),
    ).toBeNull();
  });

  it('returns null when weather_code is missing', () => {
    expect(
      weatherSnapshotFromCurrentRaw(
        {current: {temperature_2m: 20, is_day: 1}},
        context,
      ),
    ).toBeNull();
  });

  it('returns null for undefined input (transport failure)', () => {
    expect(weatherSnapshotFromCurrentRaw(undefined, context)).toBeNull();
  });

  it('passes the context fields through verbatim', () => {
    const ctx = {source: 'manual' as const, cityName: 'Delhi', fetchedAt: 9999};
    expect(
      weatherSnapshotFromCurrentRaw(
        {current: {temperature_2m: 30, weather_code: 0, is_day: 1}},
        ctx,
      ),
    ).toMatchObject({source: 'manual', cityName: 'Delhi', fetchedAt: 9999});
  });
});

describe('wmoCodeToCondition', () => {
  it('maps code 0 + day to sunny', () => {
    expect(wmoCodeToCondition(0, true)).toEqual({condition: 'sunny', description: 'Clear'});
  });

  it('maps code 0 + night to clearNight', () => {
    expect(wmoCodeToCondition(0, false)).toEqual({
      condition: 'clearNight',
      description: 'Clear night',
    });
  });

  it('maps code 2 to partlyCloudy', () => {
    expect(wmoCodeToCondition(2, true)).toEqual({
      condition: 'partlyCloudy',
      description: 'Partly cloudy',
    });
  });

  it('maps code 61 to rainy with "Rain" description', () => {
    expect(wmoCodeToCondition(61, true)).toEqual({condition: 'rainy', description: 'Rain'});
  });

  it('maps code 71 to snowy with "Snow" description', () => {
    expect(wmoCodeToCondition(71, true)).toEqual({condition: 'snowy', description: 'Snow'});
  });

  it('falls back to cloudy for unknown codes', () => {
    expect(wmoCodeToCondition(999, true)).toEqual({condition: 'cloudy', description: 'Unknown'});
  });
});
