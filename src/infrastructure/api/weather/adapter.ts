/**
 * V18 + V21 W6 P21c — weatherAdapter
 *
 * Replaces `src/services/api/weatherService.ts` (V17 + pre-V18) with the
 * adapter + convertor pattern. The wire layer here is Open-Meteo
 * (geocoding + current weather). The convertor is the only place
 * that crosses from the wire shape (`*Raw`) to the domain shape
 * (`*Result`). The screen / hook / store only ever see the domain
 * type.
 *
 * Type contract (see SIMBA_PLAYER_MODULE_V18_SPECIFICATION §2):
 * - `*Raw` DTOs are file-local (not exported).
 * - `*Result` / `CityCoords` / `WeatherSnapshot` are domain types
 *   and ARE exported.
 * - Convertors are pure, exported, named, single-purpose.
 * - Service functions return `Promise<DomainType>` — never
 *   `Promise<RawType>`.
 *
 * Public surface (junior-dev rule, 1 import):
 *   import {fetchWeatherByCity, fetchWeatherByCoords,
 *           getCityCoords, type WeatherSnapshot,
 *           type CityCoords, type WeatherCondition} from
 *           '../infrastructure/api/weather/adapter';
 *
 * **V21 W6 P21c (T21.04) — typed `AdapterParseError` + signal:**
 * `cityCoordsFromRaw` and `weatherSnapshotFromCurrentRaw` were
 * already doing shape validation pre-W22 (the `typeof number`
 * checks are documented in their docstrings as "defensive — the
 * wire shape says number, but at the boundary we don't trust
 * it"). The W6 P21c migration converts the silent-`null` returns
 * to typed `AdapterParseError` for the wire-shape failures
 * (non-numeric lat/lon, missing current.temperature_2m) while
 * keeping the legitimate "no results" returns as `null`
 * (transport failures and the no-city-found case).
 *
 * The Jamendo / Audius / Internet Archive / IPTV / LibriVox /
 * MusicBrainz / RadioBrowser adapters are the proof-of-pattern
 * references for the W6 P21c shape; this file follows the
 * same pattern.
 */
import {apiFetch} from '../apiClient';
import type {ApiConfig} from '../../../types/api';
import {logger} from '../../../lib/logger';
import {AdapterParseError} from '../adapterErrors';

// ─── Domain types (exported) ─────────────────────────────────────

/**
 * Coarse weather conditions for the Lottie icons. Five states cover
 * ~95% of WMO weather codes — anything we don't recognise falls back
 * to 'cloudy' so the UI always has something to show.
 */
export type WeatherCondition =
  | 'sunny'
  | 'partlyCloudy'
  | 'cloudy'
  | 'rainy'
  | 'snowy'
  | 'clearNight';

/**
 * The domain shape that the screen + store consume.
 *
 * `source` records which resolution path produced the snapshot. The
 * cascade in `useWeather` chooses between 'coords' (device GPS),
 * 'manual' (settings.homeCity), and 'timezone' (IANA fallback).
 */
export interface WeatherSnapshot {
  condition: WeatherCondition;
  /** Temperature in degrees Celsius, rounded. */
  temperatureC: number;
  /** Display name of the city (e.g. "Mumbai"). */
  cityName: string;
  /** Whether it's day at the user's location — affects sun icon. */
  isDay: boolean;
  /** Description text for the UI (e.g. "Partly cloudy"). */
  description: string;
  source: 'coords' | 'manual' | 'timezone';
  /** Epoch ms when this snapshot was fetched. */
  fetchedAt: number;
}

export interface CityCoords {
  city: string;
  lat: number;
  lon: number;
}

// ─── File-local raw DTOs (NEVER exported) ────────────────────────

interface OpenMeteoGeocodingRaw {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
  }>;
}

interface OpenMeteoCurrentRaw {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    is_day?: number; // 0 or 1
  };
}

// ─── WMO code → condition mapper (exported for testability) ──────
// Reference: https://open-meteo.com/en/docs (WMO Weather
// interpretation codes).

export interface WmoMapping {
  condition: WeatherCondition;
  description: string;
}

export function wmoCodeToCondition(code: number, isDay: boolean): WmoMapping {
  // 0: Clear sky
  if (code === 0) {
    return {
      condition: isDay ? 'sunny' : 'clearNight',
      description: isDay ? 'Clear' : 'Clear night',
    };
  }
  // 1, 2, 3: Mainly clear, partly cloudy, overcast
  if (code === 1) {
    return {
      condition: isDay ? 'sunny' : 'partlyCloudy',
      description: 'Mainly clear',
    };
  }
  if (code === 2) {
    return {condition: 'partlyCloudy', description: 'Partly cloudy'};
  }
  if (code === 3) {
    return {condition: 'cloudy', description: 'Overcast'};
  }
  // 45, 48: Fog / depositing rime fog
  if (code === 45 || code === 48) {
    return {condition: 'cloudy', description: 'Fog'};
  }
  // 51, 53, 55: Drizzle (light / moderate / dense)
  if (code === 51 || code === 53 || code === 55) {
    return {condition: 'rainy', description: 'Drizzle'};
  }
  // 56, 57: Freezing drizzle
  if (code === 56 || code === 57) {
    return {condition: 'rainy', description: 'Freezing drizzle'};
  }
  // 61, 63, 65: Rain (slight / moderate / heavy)
  if (code === 61 || code === 63 || code === 65) {
    return {condition: 'rainy', description: 'Rain'};
  }
  // 66, 67: Freezing rain
  if (code === 66 || code === 67) {
    return {condition: 'rainy', description: 'Freezing rain'};
  }
  // 71, 73, 75: Snow fall (slight / moderate / heavy)
  if (code === 71 || code === 73 || code === 75) {
    return {condition: 'snowy', description: 'Snow'};
  }
  // 77: Snow grains
  if (code === 77) {
    return {condition: 'snowy', description: 'Snow grains'};
  }
  // 80, 81, 82: Rain showers (slight / moderate / violent)
  if (code === 80 || code === 81 || code === 82) {
    return {condition: 'rainy', description: 'Rain showers'};
  }
  // 85, 86: Snow showers
  if (code === 85 || code === 86) {
    return {condition: 'snowy', description: 'Snow showers'};
  }
  // 95, 96, 99: Thunderstorm
  if (code === 95 || code === 96 || code === 99) {
    return {condition: 'rainy', description: 'Thunderstorm'};
  }
  // Unknown — default to cloudy so the UI still has a sensible icon.
  return {condition: 'cloudy', description: 'Unknown'};
}

// ─── Convertors (the only place raw crosses to domain) ──────────

/**
 * Geocoding response → CityCoords.
 *
 * V21 W6 P21c: the shape validation here was already in place
 * pre-W22 (the `typeof number` checks are documented as
 * "defensive — the wire shape says number, but at the boundary
 * we don't trust it"). The W6 P21c migration distinguishes:
 *   - Missing `results` or empty array → `null` (legitimate
 *     "no city found" — the caller falls through to the next
 *     source in the cascade).
 *   - Non-numeric `latitude` / `longitude` in the first result
 *     → `AdapterParseError` (wire-shape failure).
 *   - Non-object envelope → `AdapterParseError` (wire-shape
 *     failure).
 */
export function cityCoordsFromRaw(raw: unknown): CityCoords | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'object') {
    throw new AdapterParseError(
      'weather',
      'envelope',
      'expected object envelope',
    );
  }
  const e = raw as Partial<OpenMeteoGeocodingRaw>;
  const first = e.results?.[0];
  if (!first) return null;
  if (typeof first.latitude !== 'number' || !Number.isFinite(first.latitude)) {
    throw new AdapterParseError(
      'weather',
      'results[0].latitude',
      `expected finite number, got ${first.latitude}`,
    );
  }
  if (typeof first.longitude !== 'number' || !Number.isFinite(first.longitude)) {
    throw new AdapterParseError(
      'weather',
      'results[0].longitude',
      `expected finite number, got ${first.longitude}`,
    );
  }
  return {city: first.name, lat: first.latitude, lon: first.longitude};
}

/**
 * Current-weather response → WeatherSnapshot.
 *
 * The `context` argument carries the values that the wire shape
 * doesn't know about: which cascade branch produced this fetch,
 * the display name to show, and the fetch timestamp. Keeping these
 * out of the wire response is what makes the convertor pure
 * (no `Date.now()`, no implicit "current caller").
 *
 * V21 W6 P21c: distinguishes missing `current` (legitimate
 * "no current data" — `null`) from malformed inner fields
 * (non-numeric `temperature_2m` / `weather_code` —
 * `AdapterParseError`).
 */
export function weatherSnapshotFromCurrentRaw(
  raw: unknown,
  context: {
    source: WeatherSnapshot['source'];
    cityName: string;
    fetchedAt: number;
  },
): WeatherSnapshot | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'object') {
    throw new AdapterParseError(
      'weather',
      'envelope',
      'expected object envelope',
    );
  }
  const e = raw as Partial<OpenMeteoCurrentRaw>;
  const current = e.current;
  if (!current) return null;
  if (
    typeof current.temperature_2m !== 'number' ||
    !Number.isFinite(current.temperature_2m)
  ) {
    throw new AdapterParseError(
      'weather',
      'current.temperature_2m',
      `expected finite number, got ${current.temperature_2m}`,
    );
  }
  if (typeof current.weather_code !== 'number') {
    throw new AdapterParseError(
      'weather',
      'current.weather_code',
      `expected number, got ${typeof current.weather_code}`,
    );
  }
  const isDay = current.is_day === 1;
  const {condition, description} = wmoCodeToCondition(current.weather_code, isDay);
  return {
    condition,
    description,
    temperatureC: Math.round(current.temperature_2m),
    isDay,
    cityName: context.cityName,
    source: context.source,
    fetchedAt: context.fetchedAt,
  };
}

// ─── Per-API configs (apiFetch needs baseUrl + path; Open-Meteo
//     spans two hostnames, so two configs) ────────────────────────

const FORECAST_CONFIG: ApiConfig = {
  baseUrl: 'https://api.open-meteo.com',
};

const GEOCODING_CONFIG: ApiConfig = {
  baseUrl: 'https://geocoding-api.open-meteo.com',
};

// ─── Service functions (the public surface) ──────────────────────

/**
 * Geocode a manual city name into lat/lon. Returns `null` on
 * any transport failure or "no city found" (the caller falls
 * through to the next source in the cascade). Wire-shape
 * failures (`AdapterParseError`) propagate.
 */
export async function getCityCoords(
  city: string,
  signal?: AbortSignal,
): Promise<CityCoords | null> {
  try {
    const raw = await apiFetch<OpenMeteoGeocodingRaw>({
      config: GEOCODING_CONFIG,
      path: '/v1/search',
      params: {name: city, count: 1, language: 'en', format: 'json'},
      signal,
    });
    return cityCoordsFromRaw(raw);
  } catch (e) {
    // Transport failures → `null` (the cascade in `useWeather`
    // falls through to the next source). Wire-shape failures
    // propagate so the hook layer can distinguish "server
    // down" from "server returned garbage".
    if (e instanceof AdapterParseError) throw e;
    logger.warn('[weatherAdapter] city geocoding error', e);
    return null;
  }
}

/**
 * Resolve a full snapshot from a manual city name. Used when the
 * user has set a home city in Settings.
 */
export async function fetchWeatherByCity(
  city: string,
  signal?: AbortSignal,
): Promise<WeatherSnapshot | null> {
  const coords = await getCityCoords(city, signal);
  if (!coords) return null;
  return fetchWeatherForCoords(
    coords.lat,
    coords.lon,
    coords.city,
    'manual',
    signal,
  );
}

/**
 * Resolve a full snapshot from raw lat/lon (the device's exact
 * coordinates, after the user grants location permission). The
 * `cityNameHint` comes back from a reverse-geocode step via
 * Open-Meteo; if not provided, we fall back to a "lat, lon" string.
 */
export async function fetchWeatherByCoords(
  lat: number,
  lon: number,
  cityNameHint?: string,
  signal?: AbortSignal,
): Promise<WeatherSnapshot | null> {
  return fetchWeatherForCoords(
    lat,
    lon,
    cityNameHint ?? `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
    'coords',
    signal,
  );
}

// Internal: shared "fetch + convert" path. Exposed only via the two
// public service functions above.
async function fetchWeatherForCoords(
  lat: number,
  lon: number,
  cityName: string,
  source: WeatherSnapshot['source'],
  signal?: AbortSignal,
): Promise<WeatherSnapshot | null> {
  try {
    const raw = await apiFetch<OpenMeteoCurrentRaw>({
      config: FORECAST_CONFIG,
      path: '/v1/forecast',
      params: {
        latitude: lat.toFixed(4),
        longitude: lon.toFixed(4),
        current: 'temperature_2m,weather_code,is_day',
        timezone: 'auto',
      },
      signal,
    });
    return weatherSnapshotFromCurrentRaw(raw, {
      source,
      cityName,
      fetchedAt: Date.now(),
    });
  } catch (e) {
    // Transport failures → `null`. Wire-shape failures propagate.
    if (e instanceof AdapterParseError) throw e;
    logger.warn('[weatherAdapter] current weather error', e);
    return null;
  }
}

// V21 W6 P21 (T21.04): documented retries for TanStack Query.
// Adapter itself doesn't retry — hook layer honors this constant.
export const WEATHER_RETRIES = 2;
