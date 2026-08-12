// ─── useWeather hook (Phase 61 + P66) ────────────────────────────────
// Thin wrapper around the weather slice. Enforces a 1-hour TTL so
// repeated mounts (Home tab focus) don't hammer ip-api / Open-Meteo.
//
// P66: the slice is now persisted (last successful snapshot is in
// AsyncStorage). On cold start:
//   - if no snapshot ever → status='idle', snapshot=null → the
//     greeting shows the "Fetching weather…" placeholder while the
//     cascade runs.
//   - if snapshot is fresh (fetchedAt < 1h ago) → no fetch fires.
//     The cached chip + caption render immediately.
//   - if snapshot is stale (>1h) → dispatch fetchWeather. The slice
//     keeps the old snapshot until the new one arrives, so the UI
//     does not flicker.
//
// The hook is intentionally a one-shot (no polling). The greeting
// re-renders whenever the user navigates back to Home because the
// Home screen unmounts/remounts; if that doesn't work for the user's
// flow, we'd add a foreground listener.

import {useEffect, useRef} from 'react';
import {useAppDispatch, useAppSelector} from '../store';
import {
  fetchWeather,
  selectWeather,
  selectWeatherStatus,
  selectWeatherFetchedAt,
} from '../store/slices/weatherSlice';
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
  const dispatch = useAppDispatch();
  const snapshot = useAppSelector(selectWeather);
  const status = useAppSelector(selectWeatherStatus);
  const fetchedAt = useAppSelector(selectWeatherFetchedAt);

  // Per-mount guard: only dispatch once even if StrictMode double-invokes
  // the effect. The slice itself doesn't dedupe, so we dedupe here.
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) {
      return;
    }
    didFetch.current = true;

    const isStale = Date.now() - fetchedAt > ONE_HOUR_MS;
    if (fetchedAt === 0 || isStale) {
      dispatch(fetchWeather());
    }
  }, [dispatch, fetchedAt]);

  const isFirstLoad = status === 'loading' && snapshot === null;
  return {snapshot, status, isFirstLoad};
}
