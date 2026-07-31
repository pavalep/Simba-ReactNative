// ────────────────────────────────────────────────────────
// Simba Player — GlobalOperationProgress (Phase 54.5)
// Mounted once at the app root; drives the OperationProgress
// card straight from the media scan slice so every screen
// shows scan progress without mounting its own banner.
// Reads the store directly (no useMediaScanner) to avoid
// duplicate auto-scan watchers.
// ────────────────────────────────────────────────────────

import React from 'react';
import {useAppDispatch, useAppSelector} from '../../../store';
import {selectScanProgress, requestCancelScan} from '../../../store/slices/mediaSlice';
import {OperationProgress} from '../OperationProgress/OperationProgress';

export const GlobalOperationProgress: React.FC = () => {
  const dispatch = useAppDispatch();
  const isScanning = useAppSelector(s => s.media?.isScanning ?? false);
  const scanProgress = useAppSelector(selectScanProgress);

  if (!isScanning) return null;

  const folder = scanProgress?.currentFolder
    ? scanProgress.currentFolder.replace(/^file:\/\//, '')
    : undefined;

  const detailParts: string[] = [];
  if (folder) detailParts.push(folder);
  if (scanProgress && scanProgress.filesFound > 0) {
    detailParts.push(`${scanProgress.filesFound} files found`);
  }

  return (
    <OperationProgress
      visible
      title="Scanning library…"
      detail={detailParts.join('  ·  ') || undefined}
      percent={scanProgress?.percentComplete ?? 0}
      onCancel={() => dispatch(requestCancelScan())}
      cancelLabel="Cancel"
    />
  );
};
