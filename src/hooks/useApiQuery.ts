/**
 * V18 — useApiQuery family
 *
 * Thin wrappers around @tanstack/react-query that bake in the
 * project's cache-key shape and a couple of ergonomic defaults.
 * The wrappers are intentionally narrow: the consumer still
 * passes `queryKey` and `queryFn` the same way as raw TanStack.
 *
 * Three hooks exported (one-per-shape, see SPEC §7):
 * - useApiQuery          — single fetch (search-by-page, by-id, trending)
 * - useInfiniteApiQuery  — load-more pagination
 * - useApiMutation       — user action (write-side)
 *
 * Cache-key convention: `[<serviceName>, <methodName>, ...args]`.
 * Example: `['audius', 'search', query, page]`.
 *
 * Type-safety reminder: pass `<TResult>` (or rely on inference
 * from queryFn). The convertor inside the service function
 * guarantees the return type is the domain type, not the raw
 * wire shape. See SIMBA_PLAYER_MODULE_V18_SPECIFICATION §2.
 *
 * Stale-closure warning: `queryFn` closes over its arguments.
 * If those arguments come from local state, wrap the function
 * in `useCallback` so the key and the fetcher don't drift.
 */
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueries,
  type UseQueryOptions,
  type UseInfiniteQueryOptions,
  type UseMutationOptions,
  type QueryKey,
  type InfiniteData,
} from '@tanstack/react-query';

/**
 * Project-wide cache key shape: `[<serviceName>, <methodName>, ...args]`.
 * The first two elements are required; the rest are stable per-call
 * arguments that the fetcher closure will need.
 */
export type ApiQueryKey = readonly [service: string, method: string, ...args: unknown[]];

/**
 * Single-fetch query.
 *
 * The `TData` generic is usually inferred from `queryFn`. Pass it
 * explicitly only when `queryFn` returns `any` or a union.
 */
export function useApiQuery<TData, TError = Error>(
  options: Omit<UseQueryOptions<TData, TError, TData>, 'queryKey'> & {
    queryKey: ApiQueryKey | QueryKey;
  },
) {
  return useQuery<TData, TError, TData>(options);
}

/**
 * Load-more (infinite scroll) query.
 *
 * The first page is fetched on mount; `fetchNextPage` triggers the
 * next page when the consumer asks. The convertor pattern is unchanged
 * — the `queryFn` still returns the domain type.
 *
 * `data` is typed as `InfiniteData<TPageData>` (TanStack's envelope:
 * `{pages: TPageData[], pageParams: unknown[]}`). The first page
 * is `data.pages[0]`; to flatten, use `data.pages.flat()`.
 */
export function useInfiniteApiQuery<TPageData, TError = Error>(
  options: Omit<
    UseInfiniteQueryOptions<TPageData, TError, InfiniteData<TPageData>>,
    'queryKey'
  > & {
    queryKey: ApiQueryKey | QueryKey;
  },
) {
  return useInfiniteQuery<TPageData, TError, InfiniteData<TPageData>>(options);
}

/**
 * User-action mutation (write-side). The fetcher may be a service
 * function (e.g. `addBookmark(item)`) or a direct axios call; the
 * mutation invalidates query keys via `onSuccess` at the call site.
 */
export function useApiMutation<TData, TVariables, TError = Error>(
  options: UseMutationOptions<TData, TError, TVariables>,
) {
  return useMutation<TData, TError, TVariables>(options);
}

/**
 * Parallel queries (V18.6 — `useAggregatedSearch`).
 *
 * The "5 parallel `Promise.allSettled` calls collapsed into
 * 5 TanStack `useQuery` calls" pattern. Each entry in the
 * `queries` array is its own query with its own `queryKey`,
 * its own `queryFn`, and its own `enabled` flag — TanStack
 * tracks the loading / error / data state for each
 * independently.
 *
 * Per-source error isolation: if a single source fails, its
 * `error` is set; the others still render with their data.
 * The consumer is responsible for translating `error` to
 * `[]` at the data-assembly boundary (this is the same
 * pattern `Promise.allSettled` gave us, but TanStack now
 * owns the cancellation / dedup / retry logic).
 *
 * The generic `TCombined` is the shape the consumer wants
 * back (e.g. `AggregatedSearchResults`); `combine` is the
 * mapper from the per-source results to the combined shape.
 * If `combine` is omitted, the raw array is returned.
 *
 * V18.6 type note: TanStack v5's `useQueries` has rich
 * inference (`T extends Array<any>` for both the input
 * tuple and the result tuple) but exposing those generics
 * through a wrapper is brittle. We take a permissive input
 * type and let the consumer use the `combine` callback to
 * type-assert the per-source result shape. The wrapper
 * returns the raw result array when `combine` is omitted
 * and `TCombined` when it's present.
 */
export function useApiQueries<TCombined = unknown>(
  options: {
    queries: ReadonlyArray<Parameters<typeof useQueries>[0]['queries'][number]>;
    combine?: (results: ReadonlyArray<unknown>) => TCombined;
  },
): TCombined | ReadonlyArray<unknown> {
  const {combine, queries} = options;
  const result = useQueries({queries});
  return combine ? combine(result as ReadonlyArray<unknown>) : result;
}
