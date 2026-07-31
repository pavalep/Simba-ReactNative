import React, {useEffect, useState} from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import type {ScanProgress, ScanHistory} from '../../../store/slices/mediaSlice';

interface ScanProgressBannerProps {
  /** Whether a scan is currently in progress */
  isScanning: boolean;
  /** Timestamp (ms) of last completed scan, or null if never scanned */
  lastScanTimestamp: number | null;
  /** Live scan progress data */
  scanProgress?: ScanProgress;
  /** History from the most recent completed scan */
  scanHistory?: ScanHistory;
  /** Called when user taps cancel */
  onCancel?: () => void;
  /** Total track count in the library */
  trackCount?: number;
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Formats a millisecond timestamp into a human-readable "time ago" string.
 */
function formatLastScan(timestamp: number | null): string {
  if (timestamp === null) return 'Never scanned';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Scanned just now';
  if (minutes < 60) {
    return `Scanned ${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Scanned ${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  const days = Math.floor(hours / 24);
  return `Scanned ${days} day${days !== 1 ? 's' : ''} ago`;
}

// ─── Main Component ─────────────────────────────────────────

/**
 * A compact banner that shows the current scan state.
 *
 * - Scanning: animated progress bar + folder name + file count + cancel btn
 * - Complete: dim dot + last-scanned timestamp + summary of results
 * - Never scanned: dim dot + "Never scanned" text
 */
export const ScanProgressBanner: React.FC<ScanProgressBannerProps> = ({
  isScanning,
  lastScanTimestamp,
  scanHistory,
  trackCount,
}) => {
  const {colors} = useTheme();
  const [showSummary, setShowSummary] = useState(false);

  // Show summary briefly when scan completes
  useEffect(() => {
    if (!isScanning && scanHistory && scanHistory.lastScanTime) {
      setShowSummary(true);
      const timer = setTimeout(() => setShowSummary(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [isScanning, scanHistory]);

  // ── Scanning view ──
  // 54.5: while scanning, the global OperationProgress card takes over;
  // this banner only shows the summary / idle states to avoid duplicates.
  if (isScanning) {
    return null;
  }

  // ── Post-scan summary (shown briefly after scan completes) ──
  if (showSummary && scanHistory && scanHistory.lastScanTime) {
    const hasData =
      scanHistory.filesAdded > 0 ||
      scanHistory.errorsCount > 0 ||
      scanHistory.unsupportedCount > 0;

    return (
      <View
        style={[
          styles.root,
          {
            backgroundColor: colors.background.floating,
            borderColor: colors.border.subtle,
          },
        ]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.dot, {backgroundColor: colors.semantic.success, opacity: 0.8}]} />
            <AppText variant="caption" color="secondary" style={styles.label}>
              Scan complete
            </AppText>
          </View>
        </View>
        {hasData && (
          <View style={styles.summaryRow}>
            {scanHistory.filesAdded > 0 && (
              <AppText variant="caption" color="secondary">
                +{scanHistory.filesAdded} added
              </AppText>
            )}
            {scanHistory.errorsCount > 0 && (
              <AppText variant="caption" color="tertiary">
                {scanHistory.errorsCount} error{scanHistory.errorsCount !== 1 ? 's' : ''}
              </AppText>
            )}
            {scanHistory.unsupportedCount > 0 && (
              <AppText variant="caption" color="tertiary">
                {scanHistory.unsupportedCount} unsupported
              </AppText>
            )}
            {trackCount !== undefined && (
              <AppText variant="caption" color="tertiary">
                {trackCount} total
              </AppText>
            )}
          </View>
        )}
        <AppText variant="caption" color="tertiary">
          {formatLastScan(lastScanTimestamp)}
        </AppText>
      </View>
    );
  }

  // ── Idle / default view ──
  if (lastScanTimestamp === null && (!trackCount || trackCount === 0)) {
    return null;
  }

  return (
    <View
      style={[
        styles.root,
        styles.idleRoot,
        {
          backgroundColor: colors.background.floating,
          borderColor: colors.border.subtle,
        },
      ]}>
      <View style={[styles.dot, {backgroundColor: colors.text.tertiary, opacity: 0.6}]} />
      <AppText variant="caption" color="tertiary">
        {formatLastScan(lastScanTimestamp)}
      </AppText>
      {trackCount !== undefined && trackCount > 0 && (
        <AppText variant="caption" color="tertiary" style={styles.trackCount}>
          {trackCount} file{trackCount !== 1 ? 's' : ''} in library
        </AppText>
      )}
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  idleRoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontWeight: '500',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cancelBtn: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  folderText: {
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  percentText: {
    width: 32,
    textAlign: 'right',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  trackCount: {
    marginLeft: 'auto',
  },
});
