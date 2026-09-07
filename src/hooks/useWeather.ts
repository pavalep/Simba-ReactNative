// ─── useWeather hook (Phase 61 + P66 + V17) ──────────────────────
// Thin wrapper around the weather store. Enforces a 1-hour TTL so
// repeated mounts (Home tab focus) don't hammer ip-api / Open-Meteo.
//
// P66: the store is now persisted (last successful snapshot is in
// AsyncStorage). On cold start:
//   - if no snapshot ever → status='idle', snapshot=null → the
//     greeting shows the "Fetching weather…" placeholder while the
//     cascade runs.
//   - if snapshot is fresh (fetchedAt < 1h ago) → no fetch fires.
//     The cached chip + caption render immediately.
//   - if snapshot is stale (>1h) → run the cascade. The store
//     keeps the old snapshot until the new one arrives, so the UI
//     does not flicker.
//
// V17 Phase 79: the redux `fetchWeather` thunk (and the 17+
// `console.log` lines it carried) is replaced by a plain async
// function `fetchWeatherThunk` at the bottom of this file. The
// store is the only state owner; the cascade is the only writer.
//
// The hook is intentionally a one-shot (no polling). The greeting
// re-renders whenever the user navigates back to Home because the
// Home screen unmounts/remounts; if that doesn't work for the user's
// flow, we'd add a foreground listener.

import {useEffect, useRef} from 'react';
import {useWeatherStore} from '../state';
import type {WeatherSnapshot} from '../services/api/weatherService';

const ONE_HOUR_MS = 60 * 60 * 1000;

export interface UseWeatherResult {
  /** Current snapshot, or null if the very first fetch is still loading. */
  snapshot: WeatherSnapshot | null;
  /** 'loading' only on the first cold fetch; subsequent fetches stay 'success'. */
  status: 'idle' | 'loading' | 'success' | 'error';
  /** True while the first fetch is in flight — used to skip rendering the caption. */
  isFirstLoad: boolean;
}

export function useWeather(): UseWeatherResult {
  const snapshot = useWeatherStore(s => s.snapshot);
  const status = useWeatherStore(s => s.status);
  const fetchedAt = useWeatherStore(s => s.fetchedAt);

  // Per-mount guard: only fetch once even if StrictMode double-invokes
  // the effect. The store itself doesn't dedupe, so we dedupe here.
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) {
      return;
    }
    didFetch.current = true;

    const isStale = Date.now() - fetchedAt > ONE_HOUR_MS;
    if (fetchedAt === 0 || isStale) {
      void fetchWeatherThunk();
    }
  }, [fetchedAt]);

  const isFirstLoad = status === 'loading' && snapshot === null;
  return {snapshot, status, isFirstLoad};
}

/**
 * V17 Phase 79: the old redux `fetchWeather` thunk (with its
 * `console.log` noise and the 4-tier cascade: exact coords ->
 * manual homeCity -> IANA timezone -> locale country) becomes a
 * plain async function. The store's `setStatus` / `setSnapshot` /
 * `setError` actions are called directly.
 */
async function fetchWeatherThunk(): Promise<void> {
  const {useSettingsStore} = await import('../state');
  const {fetchWeatherByCity, fetchWeatherByCoords} = await import(
    '../services/api/weatherService'
  );
  const {getCurrentCoords, reverseGeocodeCity} = await import(
    '../services/device/geolocation'
  );
  const {cityFromTimezone, cityFromLocale} = await import(
    '../utils/timezoneToCity'
  );
  const {resolveTimezone, resolveLocale} = await import(
    '../utils/weatherLocale'
  );
  const {logger} = await import('../lib/logger');

  useWeatherStore.getState().setStatus('loading');
  try {
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
      if (snap) {
        useWeatherStore.getState().setSnapshot({snapshot: snap, fetchedAt: Date.now()});
        return;
      }
    }
    // 2. Manual homeCity from settings.
    const homeCity = useSettingsStore.getState().homeCity;
    if (homeCity) {
      const snap = await fetchWeatherByCity(homeCity);
      if (snap) {
        useWeatherStore.getState().setSnapshot({snapshot: snap, fetchedAt: Date.now()});
        return;
      }
    }
    // 3. IANA timezone.
    const tz = resolveTimezone();
    if (tz) {
      const city = cityFromTimezone(tz);
      if (city) {
        const snap = await fetchWeatherByCity(city);
        if (snap) {
          useWeatherStore.getState().setSnapshot({snapshot: snap, fetchedAt: Date.now()});
          return;
        }
      }
    }
    // 4. Locale country (true last resort).
    const locale = resolveLocale();
    const city = cityFromLocale(locale);
    if (city) {
      const snap = await fetchWeatherByCity(city);
      if (snap) {
        useWeatherStore.getState().setSnapshot({snapshot: snap, fetchedAt: Date.now()});
        return;
      }
    }
    useWeatherStore.getState().setError('No location source available');
  } catch (e) {
    logger.warn('[useWeather] fetch failed', e);
    useWeatherStore.getState().setError(e instanceof Error ? e.message : String(e));
  }
}
