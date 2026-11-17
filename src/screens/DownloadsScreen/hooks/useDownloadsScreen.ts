import {useCallback, useEffect, useState} from 'react';
import RNFS from 'react-native-fs';
import {downloadService} from '../../../services/downloadService';
import type {DownloadRecord} from '../../../services/downloadService';
import {resolveStreamType, useResumeAwareLaunch} from '../../../infrastructure/player';
import {useToast} from '../../../components/feedback/Toast';

import {useDownloadsSync} from '../../../hooks/useDownloadsSync';
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

  const {openPlayer} = useResumeAwareLaunch();
  const toast = useToast();

  const records = useDownloadsStore(s => s.records);
  const downloadsBytes = useDownloadsTotalBytes();
  // The auto-delete policy has ONE owner: the download service. It
  // persists the policy, reads it back when the manifest loads, and
  // applies it — so the chip shows the value that is actually in force.
  //
  // The settings store used to keep a second copy of the same fact, and
  // its value only reached the service when THIS screen was mounted: on
  // a fresh install the app silently kept the last 5 finished downloads
  // while the chip said "Off", and the chip said "Off" until the user
  // happened to open this page.
  const [autoDeleteDownloads, setAutoDeleteDownloads] = useState(() =>
    downloadService.getKeepLastN(),
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

  // The download service owns the policy; this screen shows it.
  //
  // The persisted value arrives WITH the manifest, so the chip reads the
  // value that is really in force once the service has loaded. The
  // effect does NOT push the state back into the service: the local
  // state starts as the service's DEFAULT, and pushing that before the
  // load finished would overwrite the persisted policy with the default
  // on every visit.
  useEffect(() => {
    let cancelled = false;
    void downloadService.ensureLoaded().then(() => {
      if (!cancelled) setAutoDeleteDownloads(downloadService.getKeepLastN());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePolicyChange = useCallback(
    (n: number) => {
      // The service owns the policy (see the note above) and persists it;
      // the chip's state is only what the screen draws.
      setAutoDeleteDownloads(n);
      void downloadService.setKeepLastN(n);
    },
    [],
  );

  /**
   * Pause a running transfer, resume a paused one — and NOTHING else.
   *
   * `resumeDownload` RESTARTS the transfer from the source, so a record
   * that is already `done` must never reach it: that is the defect
   * §6.3.2 names — the finished row's action re-downloaded the file that
   * was already on disk. The row routes a finished record to
   * `handlePlay`, and this guard makes a second route to it impossible.
   */
  const handlePauseResume = useCallback((uri: string, status: string) => {
    if (status === 'downloading') downloadService.pauseDownload(uri);
    else if (status === 'paused') downloadService.resumeDownload(uri);
  }, []);

  const handleRetry = useCallback((uri: string) => {
    downloadService.retryDownload(uri);
  }, []);

  /**
   * Play a finished download — the LOCAL file, never the remote source.
   *
   * `record.uri` is the address the file was fetched FROM; `record.localPath`
   * is where it landed on this device. Playing the local copy is the whole
   * point of a download, so the launch is handed the local path.
   *
   * The launch goes through the app's own seam (`useResumeAwareLaunch`),
   * exactly as the Library's row does, so it writes a now-playing session,
   * honours the saved resume position and opens the right lane.
   */
  const handlePlay = useCallback(
    async (record: DownloadRecord) => {
      const localPath = record.localPath;
      const onDisk = localPath
        ? await RNFS.exists(localPath).catch(() => false)
        : false;
      if (!onDisk) {
        // The file is gone — removed outside the app, or reclaimed by the
        // OS. Say so plainly and delete NOTHING: the manifest is the
        // app's record of what it owns, and the row's own delete action
        // is how a stale row goes away.
        toast.show('This file is no longer on the device.', 'error');
        return;
      }
      await openPlayer({
        uri: localPath,
        title: record.title,
        type: resolveStreamType(record.mediaType),
      }).catch(() => {
        toast.show('Could not open this download.', 'error');
      });
    },
    [openPlayer, toast],
  );

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
    handlePlay,

    handleDelete,
  };
}

export type DownloadsScreenResult = ReturnType<typeof useDownloadsScreen>;
