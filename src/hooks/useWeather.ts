// ─── useWeather hook (V18.2.3) ────────────────────────────────────
// The Home greeting card's data hook. Reads the persisted
// `useWeatherStore` for the cached snapshot, and uses
// `useApiQuery` to refresh it on mount and on the 1-hour TTL.
//
// The 4-tier cascade (coords → manual homeCity → IANA timezone →
// locale country) is the `queryFn` for a single `useApiQuery`.
// TanStack handles loading state, retries, and the
// fetchedAt-driven re-fetch; the cascade's only job is to
// produce a `WeatherSnapshot | null`.
//
// V18.2.3: replaces the pre-V18 hook (which had a `useRef` dedupe
// guard, a `useEffect` that fired the cascade on mount, and a
// lazy-imported `fetchWeatherThunk` at the bottom of the file).
// All of that is gone — TanStack IS the state machine now.
//
// P66: the store is persisted (last successful snapshot is in
// AsyncStorage). On cold start:
//   - if no snapshot ever → fetchedAt=0 → cascade fires
//   - if snapshot is fresh (< 1h ago) → shouldFetch=false → no fetch
//   - if snapshot is stale (> 1h) → shouldFetch=true → cascade runs
//     The store keeps the old snapshot until the new one arrives
//     (setSnapshot is called only when the new data is in hand),
//     so the UI does not flicker.

import {useCallback, useEffect} from 'react';
import {useApiQuery} from './useApiQuery';
import {useWeatherStore, useSettingsStore} from '../state';
import {
  fetchWeatherByCity,
  fetchWeatherByCoords,
  type WeatherSnapshot,
} from '../services/api/weatherAdapter';
import {getCurrentCoords, reverseGeocodeCity} from '../services/device/geolocation';
import {cityFromTimezone, cityFromLocale} from '../utils/timezoneToCity';
import {resolveTimezone, resolveLocale} from '../utils/weatherLocale';
import {logger} from '../lib/logger';

const ONE_HOUR_MS = 60 * 60 * 1000;

export interface UseWeatherResult {
  /** Current snapshot, or null if the very first fetch is still loading. */
  snapshot: WeatherSnapshot | null;
  /** 'loading' only on the first cold fetch; subsequent fetches stay 'success'. */
  status: 'idle' | 'loading' | 'success' | 'error';
  /** True while the first fetch is in flight — used to skip rendering the caption. */
  isFirstLoad: boolean;
}

/**
 * 4-tier cascade. Pure async function: tries the most specific
 * source first, falls through to the most general. Returns the
 * first snapshot it can build, or `null` if every source failed.
 *
 * Called by TanStack as the `queryFn` — TanStack handles retry /
 * dedup / staleTime, the cascade just decides WHAT to fetch.
 */
async function weatherCascade(): Promise<WeatherSnapshot | null> {
  // 1. Exact coords (asks for permission on first call).
  const coords = await getCurrentCoords().catch(() => null);
  if (coords) {
    const hint = await reverseGeocodeCity(coords.lat, coords.lon).catch(
      () => null,
    );
    const snap = await fetchWeatherByCoords(
      coords.lat,
      coords.lon,
      hint ?? undefined,
    );
    if (snap) return snap;
  }
  // 2. Manual homeCity from settings.
  const homeCity = useSettingsStore.getState().homeCity;
  if (homeCity) {
    const snap = await fetchWeatherByCity(homeCity);
    if (snap) return snap;
  }
  // 3. IANA timezone.
  const tz = resolveTimezone();
  if (tz) {
    const city = cityFromTimezone(tz);
    if (city) {
      const snap = await fetchWeatherByCity(city);
      if (snap) return snap;
    }
  }
  // 4. Locale country (true last resort).
  const locale = resolveLocale();
  const city = cityFromLocale(locale);
  if (city) {
    const snap = await fetchWeatherByCity(city);
    if (snap) return snap;
  }
  return null;
}

export function useWeather(): UseWeatherResult {
  const snapshot = useWeatherStore(s => s.snapshot);
  const status = useWeatherStore(s => s.status);
  const fetchedAt = useWeatherStore(s => s.fetchedAt);

  // 1-hour TTL. The hook enables the query only when the cached
  // snapshot is missing or stale. `staleTime: ONE_HOUR_MS` makes
  // TanStack consider a fresh fetch "good" for the same window.
  const isStale = fetchedAt > 0 && Date.now() - fetchedAt > ONE_HOUR_MS;
  const shouldFetch = fetchedAt === 0 || isStale;

  const queryFn = useCallback(weatherCascade, []);

  const {data, isLoading, error} = useApiQuery<WeatherSnapshot | null>({
    queryKey: ['weather', 'cascade'],
    queryFn,
    enabled: shouldFetch,
    staleTime: ONE_HOUR_MS,
    // Don't surface a network blip as a hard error — the cascade
    // catches its own throws and returns null. The store then
    // records the soft "no location source" message.
    retry: false,
  });

  // Single sync point: when the query settles, mirror its result
  // into the persisted store. The store remains the UI's source
  // of truth (the Home screen reads `useWeatherStore`, not the
  // hook's local query state).
  //
  // V20.6 note: TanStack v5 removed the `onSuccess` / `onError`
  // callbacks from `useQuery` (they only exist on `useMutation`
  // now). The "react to query state changes" pattern is a
  // useEffect that watches `data` / `error`. This 4-branch mirror
  // is the canonical v5 shape — there's no shorter form to
  // compress it to.
  useEffect(() => {
    if (isLoading) {
      useWeatherStore.getState().setStatus('loading');
      return;
    }
    if (data) {
      useWeatherStore
        .getState()
        .setSnapshot({snapshot: data, fetchedAt: Date.now()});
      return;
    }
    if (error) {
      logger.warn('[useWeather] cascade threw', error);
      useWeatherStore
        .getState()
        .setError(error instanceof Error ? error.message : String(error));
      return;
    }
    // No error, no data, not loading — the cascade completed and
    // every branch returned null. This is a soft "no location"
    // state, not a network error.
    useWeatherStore.getState().setError('No location source available');
  }, [data, error, isLoading]);

  const isFirstLoad = status === 'loading' && snapshot === null;
  return {snapshot, status, isFirstLoad};
}
