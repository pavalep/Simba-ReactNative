// ─── Weather Slice (Phase 61) ─────────────────────────────────────
// Caches the latest weather snapshot for the Home greeting.
//
// P66: now persisted via redux-persist. The previous "in-memory only"
// behavior left the greeting chip blank on every cold start until the
// cascade finished — a flicker of nothing for ~1s. Persisting the
// last good snapshot means cold start shows the cached chip
// immediately, then the hook quietly refreshes in the background
// after the 1-hour TTL.
//
// The slice itself does NOT enforce the TTL — `useWeather` compares
// `fetchedAt` against now and re-fetches when stale. We persist the
// full snapshot (condition, temp, cityName, description, isDay, source,
// fetchedAt) so the chip + caption render verbatim before any new
// fetch lands.
//
// State machine: `idle` → `loading` → `success` | `error`.
// The slice never goes back to `idle` after a first load — `error`
// means "the most recent fetch failed" but we still keep the previous
// snapshot around so the UI doesn't flicker.
//
// ─── Cascade (P62) ──────────────────────────────────────────────
//
//   1. Exact coords (asks for permission, but only once)
//   2. Manual homeCity from settings
//   3. IANA timezone (native RNLocalize → JS Intl fallback) → city
//   4. Device locale country code → city (true last resort)
//
// If every tier fails (no permission, no homeCity, no timezone
// resolvable, locale unknown), the greeting renders without a
// caption rather than showing fake data. But in practice the
// locale step almost always lands a city — the device knows its
// own country even on emulators.
//
// Every tier logs its decision via `console.log` so the cascade
// is traceable from `adb logcat *:S ReactNativeJS:V` (Android) or
// the Metro terminal (iOS sim). Look for `[WEATHER]` lines.

import {createSlice, createAsyncThunk, type PayloadAction} from '@reduxjs/toolkit';
import * as RNLocalize from 'react-native-localize';
import {
  fetchWeatherByCity,
  fetchWeatherByCoords,
  type WeatherSnapshot,
} from '../../services/api/weatherService';
import {getCurrentCoords, reverseGeocodeCity} from '../../services/device/geolocation';
import {cityFromTimezone, cityFromLocale} from '../../utils/timezoneToCity';
import {logger} from '../../lib/logger';
import type {RootState} from '../index';

/** Single log prefix so all cascade lines are greppable in logcat. */
const LOG = '[WEATHER]';

export type WeatherStatus = 'idle' | 'loading' | 'success' | 'error';

interface WeatherState {
  status: WeatherStatus;
  snapshot: WeatherSnapshot | null;
  /** epoch ms of last successful fetch. 0 = never. */
  fetchedAt: number;
  /** last error message; cleared on next success. */
  error: string | null;
}

const initialState: WeatherState = {
  status: 'idle',
  snapshot: null,
  fetchedAt: 0,
  error: null,
};

/**
 * Resolve the device timezone. Tries the native RNLocalize first
 * (most accurate — reads the OS-level zone), then falls back to
 * Hermes' built-in `Intl.DateTimeFormat` (pure JS, no native
 * bridge). Returns null if both fail.
 *
 * Exported so the same resolution can be reused outside the
 * thunk if needed.
 */
export function resolveTimezone(): string | null {
  // 3a. Native — react-native-localize
  try {
    const tz = RNLocalize.getTimeZone();
    if (tz) {
      console.log(`${LOG} timezone from RNLocalize: ${tz}`);
      return tz;
    }
  } catch (nativeErr) {
    console.log(
      `${LOG} RNLocalize.getTimeZone() threw:`,
      nativeErr instanceof Error ? nativeErr.message : String(nativeErr),
    );
  }
  // 3b. JS-only — Intl.DateTimeFormat (Hermes-supported, no native bridge)
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      console.log(`${LOG} timezone from Intl.DateTimeFormat: ${tz}`);
      return tz;
    }
  } catch (intlErr) {
    console.log(
      `${LOG} Intl.DateTimeFormat threw:`,
      intlErr instanceof Error ? intlErr.message : String(intlErr),
    );
  }
  return null;
}

/** Resolve the device locale, same try/cascade pattern. */
export function resolveLocale(): string | null {
  // RNLocalize first
  try {
    const locales = RNLocalize.getLocales();
    if (locales && locales.length > 0 && locales[0].languageTag) {
      const tag = locales[0].languageTag;
      console.log(`${LOG} locale from RNLocalize: ${tag}`);
      return tag;
    }
  } catch (nativeErr) {
    console.log(
      `${LOG} RNLocalize.getLocales() threw:`,
      nativeErr instanceof Error ? nativeErr.message : String(nativeErr),
    );
  }
  // Intl fallback
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale;
    if (loc) {
      console.log(`${LOG} locale from Intl: ${loc}`);
      return loc;
    }
  } catch (intlErr) {
    console.log(
      `${LOG} Intl locale threw:`,
      intlErr instanceof Error ? intlErr.message : String(intlErr),
    );
  }
  return null;
}

export const fetchWeather = createAsyncThunk<
  WeatherSnapshot | null,
  void,
  {state: RootState; rejectValue: string}
>('weather/fetch', async (_, {getState, rejectWithValue}) => {
  // Defensive: the persisted `settings` slice is from before the P61
  // work added `homeCity`, so the hydrated state may be missing this
  // field — `.trim()` would throw and kill the whole cascade. Optional
  // chain + nullish-coalesce to '' so the cascade can still run.
  const homeCity = (getState().settings?.homeCity ?? '').trim();
  console.log(`${LOG} cascade start, homeCity="${homeCity}"`);

  // 1. Exact coords (asks for permission on first call).
  try {
    console.log(`${LOG} tier 1: trying getCurrentCoords()...`);
    const coords = await getCurrentCoords();
    if (coords) {
      console.log(`${LOG} tier 1: got coords ${coords.lat},${coords.lon}`);
      const hint = await reverseGeocodeCity(coords.lat, coords.lon);
      console.log(`${LOG} tier 1: reverse-geocode hint=${hint ?? 'none'}`);
      const snap = await fetchWeatherByCoords(coords.lat, coords.lon, hint ?? undefined);
      if (snap) {
        console.log(`${LOG} tier 1 SUCCESS: ${snap.cityName} ${snap.temperatureC}° ${snap.condition}`);
        return snap;
      }
      console.log(`${LOG} tier 1: fetchWeatherByCoords returned null`);
    } else {
      console.log(`${LOG} tier 1: getCurrentCoords returned null (denied or unavailable)`);
    }
  } catch (err) {
    console.log(
      `${LOG} tier 1 threw:`,
      err instanceof Error ? err.message : String(err),
    );
  }

  // 2. Manual override from Settings.
  if (homeCity.length > 0) {
    console.log(`${LOG} tier 2: trying manual homeCity="${homeCity}"`);
    try {
      const snap = await fetchWeatherByCity(homeCity);
      if (snap) {
        console.log(`${LOG} tier 2 SUCCESS: ${snap.cityName} ${snap.temperatureC}° ${snap.condition}`);
        return snap;
      }
      console.log(`${LOG} tier 2: fetchWeatherByCity returned null`);
    } catch (err) {
      console.log(
        `${LOG} tier 2 threw:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  } else {
    console.log(`${LOG} tier 2: skipped (no homeCity set)`);
  }

  // 3. Timezone-derived city (no permission, no network until
  // we hit Open-Meteo for the actual forecast).
  try {
    const tz = resolveTimezone();
    if (tz) {
      const city = cityFromTimezone(tz);
      console.log(`${LOG} tier 3: tz=${tz} → city=${city ?? 'null'}`);
      if (city) {
        try {
          const snap = await fetchWeatherByCity(city);
          if (snap) {
            console.log(`${LOG} tier 3 SUCCESS: ${snap.cityName} ${snap.temperatureC}° ${snap.condition}`);
            return snap;
          }
          console.log(`${LOG} tier 3: fetchWeatherByCity("${city}") returned null`);
        } catch (err) {
          console.log(
            `${LOG} tier 3: fetchWeatherByCity("${city}") threw:`,
            err instanceof Error ? err.message : String(err),
          );
        }
      }
    } else {
      console.log(`${LOG} tier 3: no timezone resolvable`);
    }
  } catch (err) {
    console.log(
      `${LOG} tier 3 threw:`,
      err instanceof Error ? err.message : String(err),
    );
  }

  // 4. Locale-country fallback (true last resort).
  try {
    const locale = resolveLocale();
    const city = cityFromLocale(locale);
    console.log(`${LOG} tier 4: locale=${locale ?? 'null'} → city=${city ?? 'null'}`);
    if (city) {
      try {
        const snap = await fetchWeatherByCity(city);
        if (snap) {
          console.log(`${LOG} tier 4 SUCCESS: ${snap.cityName} ${snap.temperatureC}° ${snap.condition}`);
          return snap;
        }
        console.log(`${LOG} tier 4: fetchWeatherByCity("${city}") returned null`);
      } catch (err) {
        console.log(
          `${LOG} tier 4: fetchWeatherByCity("${city}") threw:`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }
  } catch (err) {
    console.log(
      `${LOG} tier 4 threw:`,
      err instanceof Error ? err.message : String(err),
    );
  }

  // 5. Nothing worked. Greeting renders without a caption.
  console.log(`${LOG} cascade FAILED — all paths exhausted`);
  return rejectWithValue('all-weather-paths-failed');
});

const weatherSlice = createSlice({
  name: 'weather',
  initialState,
  reducers: {
    /** Force a re-fetch on next mount. */
    invalidate(state) {
      state.fetchedAt = 0;
      state.status = 'idle';
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchWeather.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(
        fetchWeather.fulfilled,
        (state, action: PayloadAction<WeatherSnapshot | null>) => {
          if (action.payload) {
            state.status = 'success';
            state.snapshot = action.payload;
            state.fetchedAt = action.payload.fetchedAt;
            state.error = null;
          } else {
            // fulfilled with null — unusual, but keep the previous
            // snapshot rather than blanking the UI.
            state.status = 'success';
            state.error = null;
          }
        },
      )
      .addCase(fetchWeather.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload ?? action.error.message ?? 'unknown';
        // Keep last known snapshot if we have one; otherwise null.
      });
  },
});

export const {invalidate: invalidateWeather} = weatherSlice.actions;
export default weatherSlice.reducer;

// ─── Selectors ───────────────────────────────────────────────────

export const selectWeather = (state: RootState) => state.weather.snapshot;
export const selectWeatherStatus = (state: RootState) => state.weather.status;
export const selectWeatherFetchedAt = (state: RootState) => state.weather.fetchedAt;
export const selectWeatherError = (state: RootState) => state.weather.error;

// Silence the unused-var lint on logger — we still want to keep
// logger.debug/warn calls elsewhere in the codebase consistent.
void logger;
