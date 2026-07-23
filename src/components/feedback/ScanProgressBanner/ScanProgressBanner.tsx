import React, {useEffect, useRef} from 'react';
import {
  View,
  Animated,
  StyleSheet,
} from 'react-native';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';

interface ScanProgressBannerProps {
  /** Whether a scan is currently in progress */
  isScanning: boolean;
  /** Timestamp (ms) of last completed scan, or null if never scanned */
  lastScanTimestamp: number | null;
}

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
 * A compact banner that shows the current scan state.
 *
 * - When scanning: shows an animated pulsing gold indicator + "Scanning..."
 * - When not scanning: shows a dim dot + last-scanned timestamp
 */
export const ScanProgressBanner: React.FC<ScanProgressBannerProps> = ({
  isScanning,
  lastScanTimestamp,
}) => {
  const {colors} = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isScanning) {
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
    // Reset opacity when not scanning
    pulseAnim.setValue(1);
  }, [isScanning, pulseAnim]);

  return (
    <View style={[styles.root, {backgroundColor: colors.background.floating, borderColor: colors.border.subtle}]}>
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: isScanning ? colors.accent.gold : colors.text.tertiary,
            opacity: isScanning ? pulseAnim : 0.6,
          },
        ]}
      />
      <AppText variant="caption" color={isScanning ? 'accent' : 'tertiary'}>
        {isScanning ? 'Scanning linked folders...' : formatLastScan(lastScanTimestamp)}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignSelf: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
