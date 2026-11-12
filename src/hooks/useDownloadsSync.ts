import {useEffect} from 'react';
import {downloadService, type DownloadRecord} from '../services/downloadService';
import {useDownloadsStore} from '../state';

/**
 * 49.1/49.3: keeps the downloads slice in sync with the service manifest.
 * Hydrates immediately (awaiting the in-flight boot load), then subscribes to
 * service events (progress ticks, status transitions, removals). Used by
 * DownloadButton and the Downloads screen so state is always live.
 *
 * V18.7.3 audit (out of scope — no change): this hook is **not a
 * network query**. `downloadService.ensureLoaded()` reads from
 * AsyncStorage (the offline-first manifest), not from a network
 * adapter. `downloadService.subscribe()` is a pub-sub for
 * progress events. Neither maps to the V18 wire / query / screen
 * 3-layer architecture; both are service-internal concerns that
 * belong to the downloads store. The hook is correctly outside
 * V18's data layer refactor — the V19 carryover list flagged
 * this as "no change needed" and the audit confirms it.
 *
 * ── 2026-11-12: CO-08, verified ────────────────────────────────────────
 *
 * This hook was on the "unverified" list, so it was read against the
 * service rather than assumed. It was **correct in what it did** and
 * wrong in **how many times it did it**:
 *
 *  • `DownloadButton` calls `useDownloadsSync()` — and there is ONE
 *    DownloadButton per media row. A screen with 30 rows mounted 30
 *    hooks, so the service had 30 listeners, and every service event
 *    (a download's progress tick fires constantly) ran 30 identical
 *    `hydrateDownloads(records)` calls — 30 full store writes and 30
 *    re-renders of every subscriber, for one event.
 *
 *  • `ensureLoaded()` had no `.catch()`. The service's own load path
 *    catches internally and resolves, but `emit()` sits OUTSIDE that
 *    try block, so a listener that threw would reject the promise and
 *    the hook left an unhandled rejection behind.
 *
 *  • The subscriber wrote straight into the store, and `emit()` calls
 *    every listener in a plain `forEach` — a throw inside a listener
 *    would break the service's own emit loop.
 *
 * THE FIX: ONE subscription, ref-counted. The first consumer creates
 * it; the last one to unmount disposes of it. The hook's API is
 * unchanged, so no call site moves — but the service now has exactly
 * one listener no matter how many rows are on screen, and one store
 * write per event.
 */

/** How many consumers currently hold the sync open. */
let consumers = 0;

/** The single service subscription, while `consumers > 0`. */
let unsubscribe: (() => void) | null = null;

/**
 * Write the service's records into the store, without ever throwing.
 *
 * A throw here would escape into the service's `emit()` loop and break
 * the download machinery itself, so it is caught and reported.
 */
function hydrate(records: DownloadRecord[]): void {
  try {
    useDownloadsStore.getState().hydrateDownloads(records);
  } catch (error) {
    console.warn('[downloads] could not hydrate the downloads store', error);
  }
}

function acquire(): void {
  consumers += 1;
  if (unsubscribe) return;

  // The boot load. `ensureLoaded()` resolves with an empty list when
  // the manifest cannot be read, and rejects only if a listener throws
  // inside the service's own `emit()` — so the rejection is caught
  // here rather than left unhandled.
  downloadService.ensureLoaded().then(hydrate).catch(() => {
    // The service is already down to its own recovery; the store keeps
    // whatever it had.
  });

  unsubscribe = downloadService.subscribe(hydrate);
}

function release(): void {
  consumers = Math.max(0, consumers - 1);
  if (consumers > 0 || !unsubscribe) return;
  unsubscribe();
  unsubscribe = null;
}

export function useDownloadsSync(): void {
  useEffect(() => {
    acquire();
    return release;
  }, []);
}
