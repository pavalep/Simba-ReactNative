import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {createJSONStorage, sharedMMKVStorage, CURRENT_PERSIST_VERSION} from './persistence';
import type {WeatherSnapshot} from '../infrastructure/api/weather/adapter';

/**
 * V17 Phase 79: replaces `weatherSlice` (Redux + createAsyncThunk)
 * with `useWeatherStore` (Zustand + persist). The async fetch
 * logic that lived in the redux `fetchWeather` thunk moves to
 * `useWeather` (a plain async function) so the store stays a
 * pure state container.
 *
 * **V16 out-of-scope fix:** the 17+ `console.log` calls in the
 * old weatherSlice are gone. The store uses `logger.debug` (from
 * `src/lib/logger`) for any non-error log surface; the cascade
 * decision is traceable via the `useWeather` hook's dev-mode
 * log path.
 */

export type WeatherStatus = 'idle' | 'loading' | 'success' | 'error';

export interface WeatherStoreState {
  status: WeatherStatus;
  snapshot: WeatherSnapshot | null;
  /** epoch ms of last successful fetch. 0 = never. */
  fetchedAt: number;
  /** last error message; cleared on next success. */
  error: string | null;
}

export interface WeatherStoreActions {
  setStatus: (status: WeatherStatus) => void;
  setSnapshot: (input: {snapshot: WeatherSnapshot; fetchedAt: number}) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: WeatherStoreState = {
  status: 'idle',
  snapshot: null,
  fetchedAt: 0,
  error: null,
};

export const useWeatherStore = create<WeatherStoreState & WeatherStoreActions>()(
  persist(
    (set) => ({
      ...initialState,
      setStatus: (status) => set({status}),
      setSnapshot: ({snapshot, fetchedAt}) =>
        set({status: 'success', snapshot, fetchedAt, error: null}),
      setError: (error) => set({status: 'error', error}),
      reset: () => set({...initialState}),
    }),
    {
      name: 'weather',
      version: CURRENT_PERSIST_VERSION,
      storage: createJSONStorage(() => sharedMMKVStorage),
    },
  ),
);
