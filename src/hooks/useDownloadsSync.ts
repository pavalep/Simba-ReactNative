import {useEffect} from 'react';
import {useAppDispatch} from '../store';
import {hydrateDownloads} from '../store/slices/downloadsSlice';
import {downloadService} from '../services/downloadService';

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
      if (active) dispatch(hydrateDownloads(records));
    });
    const unsubscribe = downloadService.subscribe(records => {
      dispatch(hydrateDownloads(records));
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [dispatch]);
}
