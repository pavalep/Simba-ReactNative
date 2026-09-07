import {useCallback, useEffect, useState} from 'react';
import RNFS from 'react-native-fs';
import {downloadService} from '../../../services/downloadService';

import {useDownloadsSync} from '../../../hooks/useDownloadsSync';
import {useSettingsStore} from '../../../state';
import {useDownloadsStore, useDownloadsTotalBytes} from '../../../state';

/**
 * 49.3/49.6: Downloads screen state — live records (via service sync),
 * device storage stats for the usage bar, and the auto-delete policy.
 */
export interface StorageInfo {
  total: number;
  free: number;
  loaded: boolean;
}

export function useDownloadsScreen() {
  useDownloadsSync();

  const records = useDownloadsStore(s => s.records);
  const downloadsBytes = useDownloadsTotalBytes();
  const autoDeleteDownloads = useSettingsStore(s => s.autoDeleteDownloads,
  );

  const [storage, setStorage] = useState<StorageInfo>({
    total: 0,
    free: 0,
    loaded: false,
  });
  const [confirmUri, setConfirmUri] = useState<string | null>(null);

  const refreshStorage = useCallback(() => {
    RNFS.getFSInfo()
      .then(info => {
        setStorage({
          total: info.totalSpace,
          free: info.freeSpace,
          loaded: true,
        });
      })
      .catch(() => {
        // storage bar stays hidden when getFSInfo is unavailable
      });
  }, []);

  useEffect(() => {
    refreshStorage();
    // Re-measure after downloads complete/delete (free space changes).
    const unsubscribe = downloadService.subscribe(() => refreshStorage());
    return unsubscribe;
  }, [refreshStorage]);

  // The redux setting is the UI source of truth; keep the service in sync.
  useEffect(() => {
    downloadService.setKeepLastN(autoDeleteDownloads);
  }, [autoDeleteDownloads]);

  const handlePolicyChange = useCallback(
    (n: number) => {
      useSettingsStore.getState().setAutoDeleteDownloads(n);
    },
    [],
  );

  const handlePauseResume = useCallback((uri: string, status: string) => {
    if (status === 'downloading') downloadService.pauseDownload(uri);
    else downloadService.resumeDownload(uri);
  }, []);

  const handleRetry = useCallback((uri: string) => {
    downloadService.retryDownload(uri);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!confirmUri) return;
    const uri = confirmUri;
    setConfirmUri(null);
    await downloadService.removeDownload(uri);
  }, [confirmUri]);

  const confirmRecord = confirmUri
    ? records.find(r => r.uri === confirmUri) ?? null
    : null;

  return {
    records,
    downloadsBytes,
    autoDeleteDownloads,
    storage,
    confirmUri,
    confirmRecord,
    setConfirmUri,
    handlePolicyChange,
    handlePauseResume,
    handleRetry,

    handleDelete,
  };
}

export type DownloadsScreenResult = ReturnType<typeof useDownloadsScreen>;
