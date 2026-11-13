// ─── Pull-to-refresh (the ONE owner of the gesture) ────────────────────
//
// WHY THIS FILE EXISTS
// --------------------
// The three browse lists (Music, Movies, Podcasts) each drove their
// <RefreshControl> from the QUERY's fetch flag:
//
//     refreshing={isLoading && hasLoaded}
//
// `isLoading` is TanStack's `isFetching`, and `isFetching` is true for
// EVERY fetch a query makes — including `fetchNextPage`. So the moment
// the user scrolled to the end of the Movies grid and the next page
// started loading, the flag went on, and the refresh spinner appeared
// at the TOP of the list: a spinner for work the user did not ask for,
// in the one place that says "refreshing".
//
// WHY "IS FETCHING MINUS IS FETCHING NEXT PAGE" IS NOT THE FIX
// -----------------------------------------------------------
// `isFetching` is ALSO true for a BACKGROUND refetch — the query is
// stale, the app comes back to the foreground, TanStack refetches
// silently (staleTime is 60 s in all three screens, and
// `refetchOnWindowFocus` is left at its default). That would put the
// same spinner in the same place for a fetch nobody started.
//
// The spinner belongs to the GESTURE. It is on exactly while a
// pull-to-refresh the USER started is still running, and it is off
// otherwise — whether the query is paging, refetching in the
// background, or sitting still.
//
// ONE OWNER
// ---------
// The Movies line, the Music line and the Podcasts line were the same
// line of code, so the bug was the same bug in three places. A fix
// that lives in three files is a fix that gets made in one file. This
// hook is that file: the gesture's state and its callback are defined
// once and the three screens bind them.

import {useCallback, useEffect, useRef, useState} from 'react';

export interface PullToRefreshState {
  /**
   * True while a user-started pull-to-refresh is still running.
   *
   * False at rest, and false for every fetch the user did NOT ask for
   * (paging, background refetch, a scope change).
   */
  refreshing: boolean;
  /**
   * Run a pull-to-refresh and resolve when the refetch has settled.
   *
   * Awaitable on purpose: the spinner is cleared by the promise's
   * `finally`, so the flag cannot be left on by a refetch that throws.
   */
  refresh: () => Promise<void>;
}

/**
 * Own the pull-to-refresh gesture for one list.
 *
 * @param refetch The query's refetch. It must RETURN a promise that
 *   settles when the refetch is done — that promise is what the
 *   spinner waits on. TanStack's `refetch()` does exactly that (it
 *   resolves with the result, and carries the error in the result
 *   rather than rejecting).
 */
export function usePullToRefresh(
  refetch: () => Promise<unknown>,
): PullToRefreshState {
  const [refreshing, setRefreshing] = useState(false);

  // The refetch's identity is not guaranteed to be stable (the hooks
  // hand down a fresh closure per render), so the callback is read
  // from a ref at call time and the gesture's own function stays
  // stable for the lifetime of the screen.
  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  // Two refreshes can overlap (the user pulls again the moment the
  // first settles). The counter keeps the spinner on until the LAST
  // one is done — a plain boolean would be cleared by the older
  // promise while the newer fetch was still running.
  const inFlightRef = useRef(0);

  const refresh = useCallback(async () => {
    inFlightRef.current += 1;
    setRefreshing(true);
    try {
      await refetchRef.current();
    } finally {
      inFlightRef.current -= 1;
      if (inFlightRef.current === 0) {
        setRefreshing(false);
      }
    }
  }, []);

  return {refreshing, refresh};
}
