import {useCallback, useEffect, useRef} from 'react';
import {useAppDispatch, useAppSelector} from '../store';
import {
  setScanning,
  setTracks,
  setScanProgress,
  setScanHistory,
  requestCancelScan,
  resetScanState,
  selectAllTracks,
  selectScanProgress,
  selectScanHistory,
  selectCancelRequested,
  type ScanHistory,
} from '../store/slices/mediaSlice';
import {setLastScanTimestamp} from '../store/slices/settingsSlice';
import {
  scanFoldersIncremental,
  fileEntriesToTracks,
  type IncrementalScanResult,
} from '../services/fileService';

// ══════════════════════════════════════════════════════════════
// useMediaScanner — Scanner hook with progress, cancellation,
// incremental scanning, and auto-scan on app launch.
// ══════════════════════════════════════════════════════════════

/**
 * 54.3: module-level guard so multiple mounted instances
 * (Library tab, AllAudio, AllVideos…) can never start two
 * concurrent scans — the store flag alone is not enough
 * because every instance holds a stale closure.
 */
let scanInFlight = false;

export function useMediaScanner() {
  const dispatch = useAppDispatch();

  // ── Selectors ──
  const allTracks = useAppSelector(selectAllTracks);
  const scanProgress = useAppSelector(selectScanProgress);
  const scanHistory = useAppSelector(selectScanHistory);
  const cancelRequested = useAppSelector(selectCancelRequested);
  const videoFolders = useAppSelector(s => s.settings?.videoFolders ?? []);
  const audioFolders = useAppSelector(s => s.settings?.audioFolders ?? []);
  const settingsLastScan = useAppSelector(s => s.settings?.lastScanTimestamp ?? null);
  const isMediaScanning = useAppSelector(s => s.media?.isScanning ?? false);

  // ── Refs ──
  const cancelRef = useRef(false);
  /** Track previously-seen folder count for auto-scan detection */
  const prevFolderHashRef = useRef('');
  const isScanningRef = useRef(false);

  // Sync isMediaScanning into the ref so callbacks see latest value
  useEffect(() => {
    isScanningRef.current = isMediaScanning;
  }, [isMediaScanning]);

  // ── Cancel ──
  const cancelScan = useCallback(() => {
    cancelRef.current = true;
    dispatch(requestCancelScan());
  }, [dispatch]);

  // ── Start scan ──
  const startScan = useCallback(
    async (forceFullRescan: boolean = false) => {
      if (isScanningRef.current || scanInFlight) return;
      if (videoFolders.length === 0 && audioFolders.length === 0) return;

      scanInFlight = true;
      cancelRef.current = false;
      dispatch(setScanning(true));

      // Determine last scan timestamp for incremental scanning
      const lastScanTimestamp =
        !forceFullRescan && settingsLastScan !== null ? settingsLastScan : null;

      // Collect all folders to scan
      const allFolders = [...new Set([...videoFolders, ...audioFolders])];

      try {
        // Phase 1: Enumerate files (incremental)
        const result: IncrementalScanResult = await scanFoldersIncremental(
          allFolders,
          lastScanTimestamp,
          progress => {
            // Map progress callback to Redux
            dispatch(
              setScanProgress({
                currentFolder: progress.currentFolder,
                filesFound: progress.filesFound,
                totalFiles: progress.totalFiles,
                percentComplete: progress.percentComplete,
              }),
            );
            return cancelRef.current;
          },
          cancelRef,
        );

        // If cancelled, preserve already-found files
        if (cancelRef.current) {
          dispatch(resetScanState());
          return;
        }

        // Phase 2: Convert file entries to ScannedTrack[]
        const newTracks = fileEntriesToTracks(result.files);

        // Phase 3: Merge with existing tracks
        const existingUris = new Set(allTracks.map(t => t.uri));
        const trulyNew = newTracks.filter(t => !existingUris.has(t.uri));

        if (trulyNew.length > 0 || result.skippedCount === 0) {
          // Full replacement for first scan, append for incremental
          if (allTracks.length === 0) {
            dispatch(setTracks(trulyNew));
          } else {
            dispatch(setTracks([...allTracks, ...trulyNew]));
          }
        }

        // Phase 4: Update scan history
        const newHistory: ScanHistory = {
          lastScanTime: result.scanTimestamp,
          filesAdded: trulyNew.length,
          filesRemoved: 0,
          errorsCount: result.errorsCount,
          unsupportedCount: result.unsupportedCount,
        };
        dispatch(setScanHistory(newHistory));

        // Also update settingsSlice's lastScanTimestamp for banner display
        dispatch(setLastScanTimestamp(result.scanTimestamp));
      } catch {
        // Silently fail — user can retry
      } finally {
        scanInFlight = false;
        dispatch(setScanning(false));
        dispatch(
          setScanProgress({
            currentFolder: null,
            filesFound: 0,
            totalFiles: 0,
            percentComplete: 100,
          }),
        );
        cancelRef.current = false;
      }
    },
    [dispatch, videoFolders, audioFolders, settingsLastScan, allTracks],
  );

  // ── Auto-scan on app launch if linked folders changed ──
  useEffect(() => {
    // Build a hash of current folder list
    const currentHash = [...videoFolders, ...audioFolders].sort().join('|');
    const prevHash = prevFolderHashRef.current;

    if (!prevHash && currentHash.length > 0) {
      // First mount — check if we have a last scan time
      if (settingsLastScan === null) {
        // Never scanned before — auto-scan
        prevFolderHashRef.current = currentHash;
        startScan();
      } else {
        prevFolderHashRef.current = currentHash;
      }
    } else if (prevHash && currentHash !== prevHash) {
      // Folders changed since last check — auto-scan
      prevFolderHashRef.current = currentHash;
      startScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoFolders, audioFolders]);

  return {
    /** Start scanning all linked folders. Pass true to force a full re-scan. */
    startScan,
    /** Cancel the current scan (preserves already-found files). */
    cancelScan,
    /** Whether a scan is currently in progress. */
    isScanning: isMediaScanning,
    /** Live scan progress (currentFolder, filesFound, totalFiles, percentComplete). */
    scanProgress,
    /** History of the most recent completed scan. */
    scanHistory,
    /** Whether a cancellation has been requested. */
    cancelRequested,
  };
}
