import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Animated,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {WaveformBars} from '../WaveformBars/WaveformBars';
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

/**
 * Abbreviate a long folder path for display.
 */
function abbreviateFolder(folderPath: string, maxLen: number = 30): string {
  if (folderPath.length <= maxLen) return folderPath;
  const segments = folderPath.replace(/^file:\/\//, '').split('/').filter(Boolean);
  if (segments.length <= 2) return '.../' + segments.slice(-1);
  return '.../' + segments.slice(-2).join('/');
}

/**
 * Animated progress bar component.
 */
const ProgressBar: React.FC<{percent: number; color: string}> = ({percent, color}) => {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: Math.min(percent, 100),
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [percent, widthAnim]);

  const interpolatedWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={progressStyles.track}>
      <Animated.View
        style={[
          progressStyles.fill,
          {
            width: interpolatedWidth,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
};

const progressStyles = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});

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
  scanProgress,
  scanHistory,
  onCancel,
  trackCount,
}) => {
  const {colors} = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [showSummary, setShowSummary] = useState(false);

  // Pulse animation for scanning indicator
  useEffect(() => {
    if (isScanning) {
      setShowSummary(false);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    pulseAnim.setValue(1);
  }, [isScanning, pulseAnim]);

  // Show summary briefly when scan completes
  useEffect(() => {
    if (!isScanning && scanHistory && scanHistory.lastScanTime) {
      setShowSummary(true);
      const timer = setTimeout(() => setShowSummary(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [isScanning, scanHistory]);

  // ── Scanning view ──
  if (isScanning) {
    const pct = scanProgress?.percentComplete ?? 0;
    const filesFound = scanProgress?.filesFound ?? 0;
    const folder = scanProgress?.currentFolder
      ? abbreviateFolder(scanProgress.currentFolder)
      : null;

    return (
      <View
        style={[
          styles.root,
          {
            backgroundColor: colors.background.floating,
            borderColor: colors.accent.goldDim,
          },
        ]}>
        {/* Header row: dot + label + cancel */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <WaveformBars
              color={colors.accent.gold}
              barCount={4}
              barWidth={3}
              height={16}
              gap={2}
              isPlaying={true}
            />
            <AppText variant="caption" color="accent" style={styles.label}>
              Scanning...
            </AppText>
          </View>
          {onCancel && (
            <TouchableOpacity onPress={onCancel} style={styles.cancelBtn} activeOpacity={0.7}>
              <AppText variant="caption" color="tertiary">
                Cancel
              </AppText>
            </TouchableOpacity>
          )}
        </View>

        {/* Folder and file count */}
        <AppText variant="caption" color="tertiary" numberOfLines={1} style={styles.folderText}>
          {folder ? `${folder}` : ''}
          {filesFound > 0 ? `  ·  ${filesFound} file${filesFound !== 1 ? 's' : ''} found` : ''}
        </AppText>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <ProgressBar percent={pct} color={colors.accent.gold} />
          <AppText variant="caption" color="tertiary" style={styles.percentText}>
            {pct}%
          </AppText>
        </View>
      </View>
    );
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
