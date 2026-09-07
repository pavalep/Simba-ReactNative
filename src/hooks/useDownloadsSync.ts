import {useEffect} from 'react';
import {useAppDispatch} from '../store';

import {downloadService} from '../services/downloadService';
import {useDownloadsStore} from '../state';

/**
 * 49.1/49.3: keeps the downloads slice in sync with the service manifest.
 * Hydrates immediately (awaiting the in-flight boot load), then subscribes to
 * service events (progress ticks, status transitions, removals). Used by
 * DownloadButton and the Downloads screen so state is always live.
 */
export function useDownloadsSync(): void {
  const dispatch = useAppDispatch();

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
  }, [dispatch]);
}
