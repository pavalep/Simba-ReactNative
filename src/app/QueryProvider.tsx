/**
 * V18 — QueryProvider
 *
 * Wraps the app in a TanStack QueryClientProvider with the
 * project's default query options. The QueryClient is created
 * once per mount (via `useState` lazy init) so it survives
 * re-renders.
 *
 * Defaults (see SIMBA_PLAYER_MODULE_V18_SPECIFICATION §2 + §TRACKER V18.1.2):
 * - staleTime: 60_000 ms (1 minute — typical "good enough" for content)
 * - gcTime:    5 * 60_000 ms (5 minutes — TanStack's "cache" time)
 * - retry:     2 (TanStack default; matches the rest of the app)
 * - refetchOnWindowFocus: false (RN has no "window focus" concept)
 *
 * Why a project-level default: every screen used to set its own
 * staleTime / cacheTtlMs by hand. The default lives here so the
 * 99% case is one-liner; the 1% case (e.g. weather wants 15min)
 * passes staleTime explicitly.
 */
import React, {useState} from 'react';
import {
  QueryClient,
  QueryClientProvider as TanstackQueryClientProvider,
} from '@tanstack/react-query';

const DEFAULT_STALE_TIME_MS = 60_000;
const DEFAULT_GC_TIME_MS = 5 * 60_000;
const DEFAULT_RETRY = 2;

export interface QueryProviderProps {
  children: React.ReactNode;
  /**
   * Optional override of the QueryClient. Mostly for tests; production
   * callers should use the default.
   */
  client?: QueryClient;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({
  children,
  client,
}) => {
  const [defaultClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: DEFAULT_STALE_TIME_MS,
            gcTime: DEFAULT_GC_TIME_MS,
            retry: DEFAULT_RETRY,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <TanstackQueryClientProvider client={client ?? defaultClient}>
      {children}
    </TanstackQueryClientProvider>
  );
};
