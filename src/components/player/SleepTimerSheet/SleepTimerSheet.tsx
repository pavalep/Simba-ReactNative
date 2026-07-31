import React, {useMemo, useState} from 'react';
import {View, StyleSheet, TouchableOpacity} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {AppTextInput} from '../../core/AppTextInput/AppTextInput';
import {SvgIcon} from '../../utility/SvgIcon';
import {BottomSheet} from '../../sheets/BottomSheet/BottomSheet';
import {SLEEP_TIMER_PRESETS, formatSleepRemaining, sleepTimerModeLabel} from '../../../utils/sleepTimer';

export interface SleepTimerSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 'time' | 'track' | 'chapter' — how the armed timer triggers */
  activeMode: 'time' | 'track' | 'chapter';
  /** Absolute end time (ms) of the active countdown, if any */
  activeEndTime: number | null;
  onSelectMinutes: (minutes: number) => void;
  onSelectMode: (mode: 'track' | 'chapter') => void;
  onCancel: () => void;
}

/**
 * Shared sleep timer picker (P50) — presets, custom minutes, and
 * end-of-track / end-of-chapter modes. Used by the video player.
 */
export const SleepTimerSheet: React.FC<SleepTimerSheetProps> = ({
  visible,
  onClose,
  activeMode,
  activeEndTime,
  onSelectMinutes,
  onSelectMode,
  onCancel,
}) => {
  const {colors} = useTheme();
  const [customMin, setCustomMin] = useState('');

  // Live countdown while the sheet is open
  const [nowTick, setNowTick] = useState(() => Date.now());
  React.useEffect(() => {
    if (!visible || activeEndTime === null) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [visible, activeEndTime]);

  const remainingMs = activeEndTime !== null ? Math.max(0, activeEndTime - nowTick) : 0;
  const active = activeEndTime !== null && remainingMs > 0;
  const activeLabel = active
    ? `${formatSleepRemaining(remainingMs)} left`
    : sleepTimerModeLabel(activeMode);

  const customValid = useMemo(() => {
    const n = Number(customMin);
    return Number.isFinite(n) && n > 0 && n <= 480;
  }, [customMin]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {
          padding: spacing.lg,
          paddingBottom: spacing.xxxl,
        },
        statusRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing.lg,
        },
        statusIcon: {
          marginRight: spacing.sm,
        },
        statusLabel: {
          flex: 1,
        },
        chipRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
          marginBottom: spacing.md,
        },
        chip: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radius.sm,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border.subtle,
          backgroundColor: colors.background.elevated,
        },
        chipActive: {
          backgroundColor: 'rgba(201,168,76,0.15)',
          borderColor: '#C9A84C',
        },
        chipLabel: {
          fontWeight: '600',
        },
        chipLabelActive: {
          color: '#C9A84C',
        },
        customRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: spacing.md,
        },
        customInputWrap: {
          flex: 1,
        },
        customInput: {
          minHeight: 44,
          borderRadius: radius.sm,
          paddingHorizontal: spacing.md,
        },
        cancelChip: {
          borderColor: colors.border.subtle,
        },
        hint: {
          marginBottom: spacing.md,
        },
      }),
    [colors],
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Sleep Timer"
      snapPoints={['45%', '60%']}>
      <View style={styles.content}>
        {activeMode !== 'time' || active ? (
          <View style={styles.statusRow}>
            <SvgIcon name="sliders" size={16} color={colors.accent.gold} style={styles.statusIcon} />
            <AppText variant="body2" color="secondary" style={styles.statusLabel}>
              Active — {activeLabel}
            </AppText>
            <TouchableOpacity
              onPress={onCancel}
              activeOpacity={0.7}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
              accessibilityRole="button"
              accessibilityLabel="Cancel sleep timer">
              <SvgIcon name="close" size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        ) : null}

        <AppText variant="caption" color="tertiary" style={styles.hint}>
          Pause playback after…
        </AppText>

        <View style={styles.chipRow}>
          {SLEEP_TIMER_PRESETS.map(min => {
            const isActive = active && Math.ceil(remainingMs / 60000) === min;
            return (
              <TouchableOpacity
                key={min}
                style={[styles.chip, isActive ? styles.chipActive : undefined]}
                onPress={() => {
                  setCustomMin('');
                  onSelectMinutes(min);
                  onClose();
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${min} minutes`}
                accessibilityState={{selected: isActive}}>
                <AppText
                  variant="caption"
                  color={isActive ? 'accent' : 'primary'}
                  style={[styles.chipLabel, isActive ? styles.chipLabelActive : undefined]}>
                  {min} min
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.customRow}>
          {/* 53.3: AppTextInput for the custom minutes field */}
          <AppTextInput
            value={customMin}
            onChangeText={setCustomMin}
            placeholder="Custom minutes"
            keyboardType="number-pad"
            maxLength={3}
            accessibilityLabel="Custom sleep timer minutes"
            containerStyle={styles.customInputWrap}
            inputContainerStyle={styles.customInput}
          />
          <TouchableOpacity
            style={[styles.chip, !customValid ? {opacity: 0.4} : undefined]}
            disabled={!customValid}
            onPress={() => {
              onSelectMinutes(Number(customMin));
              setCustomMin('');
              onClose();
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Set custom sleep timer">
            <AppText variant="caption" color="accent" style={styles.chipLabel}>
              Set
            </AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, activeMode === 'track' ? styles.chipActive : undefined]}
            onPress={() => {
              onSelectMode('track');
              onClose();
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="End of track"
            accessibilityState={{selected: activeMode === 'track'}}>
            <AppText
              variant="caption"
              color={activeMode === 'track' ? 'accent' : 'primary'}
              style={[styles.chipLabel, activeMode === 'track' ? styles.chipLabelActive : undefined]}>
              End of track
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, activeMode === 'chapter' ? styles.chipActive : undefined]}
            onPress={() => {
              onSelectMode('chapter');
              onClose();
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="End of chapter"
            accessibilityState={{selected: activeMode === 'chapter'}}>
            <AppText
              variant="caption"
              color={activeMode === 'chapter' ? 'accent' : 'primary'}
              style={[styles.chipLabel, activeMode === 'chapter' ? styles.chipLabelActive : undefined]}>
              End of chapter
            </AppText>
          </TouchableOpacity>
          {active && (
            <TouchableOpacity
              style={[styles.chip, styles.cancelChip]}
              onPress={onCancel}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Cancel sleep timer">
              <AppText variant="caption" color="secondary">
                Cancel
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </BottomSheet>
  );
};

export default SleepTimerSheet;
