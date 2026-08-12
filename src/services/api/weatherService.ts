// ─── Weather Service ──────────────────────────────────────────────
// P61: live weather data for the Home greeting card.
//
//   • IP-based geolocation via ip-api.com (open source, no API key).
//   • Current weather via Open-Meteo (no API key, generous free tier).
//   • Manual city override via Open-Meteo geocoding API.
//
//   The service returns a normalized `WeatherSnapshot` regardless of
//   source. The slice maps that to a small `weatherCondition` enum
//   that the Lottie icons key off of.
//
//   All HTTP goes through the shared `axiosInstance` from apiClient
//   — no local axios.create() — so the User-Agent, timeout, and
//   request/response logging are consistent with every other API
//   in the app. The base URLs live in API_CONFIG.weather so they
//   can be swapped or mocked in one place.
//
//   All network calls are best-effort. If everything fails (no
//   network, VPN blocks geo, Open-Meteo rate limit), we still
//   return a sensible fallback so the greeting renders.

import {getAxiosInstance} from './apiClient';
import {API_CONFIG} from '../../constants/api';
import {logger} from '../../lib/logger';

// ─── Public types ────────────────────────────────────────────────

/**
 * Coarse weather conditions for the Lottie icons. Five states
 * covers ~95% of WMO weather codes — anything we don't recognise
 * falls back to 'cloudy' so the UI always has something to show.
 */
export type WeatherCondition =
  | 'sunny'
  | 'partlyCloudy'
  | 'cloudy'
  | 'rainy'
  | 'snowy'
  | 'clearNight';

export interface WeatherSnapshot {
  condition: WeatherCondition;
  /** Temperature in degrees Celsius. */
  temperatureC: number;
  /** Display name of the city (e.g. "Mumbai"). */
  cityName: string;
  /** Whether it's day at the user's location — affects sun icon. */
  isDay: boolean;
  /** Description text for the UI (e.g. "Partly cloudy"). */
  description: string;
  /** Which resolution path produced the snapshot. */
  source: 'coords' | 'manual' | 'timezone';
  /** Epoch ms when this snapshot was fetched. */
  fetchedAt: number;
}

// ─── Network shapes ─────────────────────────────────────────────

interface OpenMeteoCurrentResponse {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    is_day?: number; // 0 or 1
  };
}

interface OpenMeteoGeocodingResponse {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
  }>;
}

// ─── Axios helper ────────────────────────────────────────────────
// The shared `getAxiosInstance()` from `apiClient.ts` already has the
// SIMBA User-Agent, 10s timeout, and request/response interceptors.
// We use it for every call so logs and behaviour are consistent.

function api() {
  return getAxiosInstance();
}

// ─── WMO weather code → condition mapping ───────────────────────
// Reference: https://open-meteo.com/en/docs (WMO Weather interpretation codes)

function mapWmoCodeToCondition(
  code: number,
  isDay: boolean,
): {condition: WeatherCondition; description: string} {
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
      description: isDay ? 'Mainly clear' : 'Mainly clear',
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
  // Unknown — default to cloudy so the UI still has a sensible icon
  return {condition: 'cloudy', description: 'Unknown'};
}

// ─── Manual city → lat/lon (Open-Meteo geocoding) ──────────────

interface IpGeoResult {
  city: string;
  lat: number;
  lon: number;
}

export async function getCityCoords(city: string): Promise<IpGeoResult | null> {
  try {
    console.log(`[WEATHER] getCityCoords("${city}") → ${API_CONFIG.weather.geocoding}`);
    const {data} = await api().get<OpenMeteoGeocodingResponse>(
      API_CONFIG.weather.geocoding,
      {
        params: {
          name: city,
          count: 1,
          language: 'en',
          format: 'json',
        },
      },
    );
    const first = data?.results?.[0];
    if (first && typeof first.latitude === 'number' && typeof first.longitude === 'number') {
      console.log(
        `[WEATHER] getCityCoords("${city}") → ${first.name} (${first.latitude}, ${first.longitude})`,
      );
      return {
        city: first.name,
        lat: first.latitude,
        lon: first.longitude,
      };
    }
    console.log(`[WEATHER] getCityCoords("${city}") → no results in response`);
    return null;
  } catch (err) {
    console.log(
      `[WEATHER] getCityCoords("${city}") threw:`,
      err instanceof Error ? err.message : String(err),
    );
    logger.warn('[weather] city geocoding error', err);
    return null;
  }
}

// ─── Current weather ────────────────────────────────────────────

interface CurrentWeatherInput {
  condition: WeatherCondition;
  description: string;
  temperatureC: number;
  isDay: boolean;
}

async function getCurrentWeather(lat: number, lon: number): Promise<CurrentWeatherInput | null> {
  try {
    console.log(`[WEATHER] getCurrentWeather(${lat.toFixed(4)},${lon.toFixed(4)}) → ${API_CONFIG.weather.forecast}`);
    const {data} = await api().get<OpenMeteoCurrentResponse>(
      API_CONFIG.weather.forecast,
      {
        params: {
          latitude: lat.toFixed(4),
          longitude: lon.toFixed(4),
          current: 'temperature_2m,weather_code,is_day',
          timezone: 'auto',
        },
      },
    );
    const current = data?.current;
    if (!current || typeof current.temperature_2m !== 'number' || typeof current.weather_code !== 'number') {
      console.log(
        `[WEATHER] getCurrentWeather(${lat.toFixed(4)},${lon.toFixed(4)}) → no usable current data`,
      );
      return null;
    }
    const isDay = current.is_day === 1;
    const {condition, description} = mapWmoCodeToCondition(current.weather_code, isDay);
    console.log(
      `[WEATHER] getCurrentWeather(${lat.toFixed(4)},${lon.toFixed(4)}) → ${description} ${current.temperature_2m}° isDay=${isDay}`,
    );
    return {
      condition,
      description,
      temperatureC: Math.round(current.temperature_2m),
      isDay,
    };
  } catch (err) {
    console.log(
      `[WEATHER] getCurrentWeather(${lat.toFixed(4)},${lon.toFixed(4)}) threw:`,
      err instanceof Error ? err.message : String(err),
    );
    logger.warn('[weather] current weather error', err);
    return null;
  }
}

// ─── Public entry points ────────────────────────────────────────

/**
 * Resolve the snapshot from a manual city name. Used when the
 * user has set a home city in Settings.
 */
export async function fetchWeatherByCity(city: string): Promise<WeatherSnapshot | null> {
  const geo = await getCityCoords(city);
  if (!geo) {return null;}
  const weather = await getCurrentWeather(geo.lat, geo.lon);
  if (!weather) {return null;}
  return {
    ...weather,
    cityName: geo.city,
    source: 'manual',
    fetchedAt: Date.now(),
  };
}

/**
 * Resolve the snapshot from raw lat/lon (the device's exact
 * coordinates, after the user grants location permission). The
 * city name comes back from a reverse-geocode step via Open-Meteo.
 */
export async function fetchWeatherByCoords(
  lat: number,
  lon: number,
  cityNameHint?: string,
): Promise<WeatherSnapshot | null> {
  const weather = await getCurrentWeather(lat, lon);
  if (!weather) {return null;}
  return {
    ...weather,
    cityName: cityNameHint ?? `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
    source: 'coords',
    fetchedAt: Date.now(),
  };
}
