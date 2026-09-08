import {useEffect} from 'react';
import {downloadService} from '../services/downloadService';
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
 */
export function useDownloadsSync(): void {

  useEffect(() => {
    let active = true;
    downloadService.ensureLoaded().then(records => {
      if (active) useDownloadsStore.getState().hydrateDownloads(records);
    });
    const unsubscribe = downloadService.subscribe(records => {
      useDownloadsStore.getState().hydrateDownloads(records);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
}
