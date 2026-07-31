// ────────────────────────────────────────────────────────
// Simba Player — OperationProgress Component (Phase 54.5)
// Global long-operation progress pattern: a floating card
// above the bottom of the screen with a branded spinner,
// optional progress bar and cancel action. Replaces ad-hoc
// per-screen progress UIs (media scan, export/import…).
// ────────────────────────────────────────────────────────

import React, {useEffect, useMemo, useRef} from 'react';
import {View, Animated, TouchableOpacity, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {radius, spacing} from '../../../theme/tokens';
import type {ColorTokens} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {ActivityOrb} from '../../feedback/ActivityOrb/ActivityOrb';

interface OperationProgressProps {
  visible: boolean;
  /** Short label, e.g. "Scanning library…" */
  title: string;
  /** Secondary detail line, e.g. current folder / file count */
  detail?: string;
  /** 0–100 progress; when provided shows an animated bar */
  percent?: number;
  /** Optional cancel action */
  onCancel?: () => void;
  cancelLabel?: string;
}

/** Animated progress bar (shared with ScanProgressBanner style). */
const ProgressBar: React.FC<{percent: number; color: string}> = ({
  percent,
  color,
}) => {
  const {colors} = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        track: {
          flex: 1,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.background.highlight,
          overflow: 'hidden',
        },
        fill: {
          height: '100%',
          borderRadius: 2,
        },
      }),
    [colors],
  );

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
    <View style={styles.track}>
      <Animated.View
        style={[styles.fill, {width: interpolatedWidth, backgroundColor: color}]}
      />
    </View>
  );
};

export const OperationProgress: React.FC<OperationProgressProps> = ({
  visible,
  title,
  detail,
  percent,
  onCancel,
  cancelLabel = 'Cancel',
}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!visible) return null;

  return (
    <View
      style={[styles.wrapper, {bottom: insets.bottom + spacing.lg}]}
      pointerEvents="box-none"
      accessibilityRole="progressbar"
      accessibilityLabel={title}
      accessibilityLiveRegion="polite">
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.background.elevated,
            borderColor: colors.accent.goldDim,
          },
        ]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <ActivityOrb size={28} />
            <AppText variant="body2" color="accent" style={styles.title}>
              {title}
            </AppText>
          </View>
          {onCancel && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              style={styles.cancelBtn}>
              <AppText variant="caption" color="tertiary">
                {cancelLabel}
              </AppText>
            </TouchableOpacity>
          )}
        </View>

        {detail ? (
          <AppText
            variant="caption"
            color="tertiary"
            numberOfLines={1}
            style={styles.detail}>
            {detail}
          </AppText>
        ) : null}

        {percent !== undefined && (
          <View style={styles.progressRow}>
            <ProgressBar percent={percent} color={colors.accent.gold} />
            <AppText variant="caption" color="tertiary" style={styles.percentText}>
              {Math.min(percent, 100)}%
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
};

const createStyles = (colors: ColorTokens) => StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 90,
  },
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: 4,
    shadowColor: colors.shadow,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
    elevation: 8,
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
    flex: 1,
  },
  title: {
    fontWeight: '500',
    flex: 1,
  },
  cancelBtn: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  detail: {
    marginLeft: 28 + spacing.sm,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: 28 + spacing.sm,
  },
  percentText: {
    width: 32,
    textAlign: 'right',
  },
});
