import React, {useMemo} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import {AppText} from '../../../components/core/AppText/AppText';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';

// ─── Constants ───────────────────────────────────────────────

export const EQ_BANDS = [
  {freq: 31, label: '31'},
  {freq: 62, label: '62'},
  {freq: 125, label: '125'},
  {freq: 250, label: '250'},
  {freq: 500, label: '500'},
  {freq: 1000, label: '1K'},
  {freq: 2000, label: '2K'},
  {freq: 4000, label: '4K'},
  {freq: 8000, label: '8K'},
  {freq: 16000, label: '16K'},
];

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Rock: [5, 5, 3, 1, -1, 0, 1, 3, 4, 5],
  Pop: [-2, -1, 2, 4, 5, 4, 2, 0, -1, -2],
  Jazz: [3, 3, 2, 1, 0, 1, 2, 3, 3, 3],
  Classical: [4, 3, 2, 1, 0, 0, 1, 2, 3, 4],
  Dance: [6, 5, 3, 1, -1, -1, 0, 2, 4, 5],
};

// ─── Props ───────────────────────────────────────────────────

export interface PlayerEqualizerPanelProps {
  eqGains: number[];
  eqEnabled: boolean;
  onBandChange: (index: number, value: number) => void;
  onToggle: () => void;
  onApplyPreset: (name: string) => void;
  onReset: () => void;
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────

export const PlayerEqualizerPanel: React.FC<PlayerEqualizerPanelProps> = ({
  eqGains,
  eqEnabled,
  onBandChange,
  onToggle,
  onApplyPreset,
  onReset,
  onClose,
}) => {
  const {colors} = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.background.overlay,
          zIndex: 50,
          justifyContent: 'flex-end',
        },
        panel: {
          backgroundColor: colors.background.elevated,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          paddingBottom: spacing.xxl,
          maxHeight: '80%',
        },
        handleRow: {
          alignItems: 'center',
          paddingTop: spacing.sm,
          paddingBottom: spacing.xs,
        },
        handle: {
          width: 16,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border.emphasis,
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
        closeBtn: {
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
        },
        scrollContent: {
          paddingHorizontal: spacing.lg,
        },
        // ── Toggle row ──
        toggleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.sm,
          marginBottom: spacing.sm,
        },
        toggleTrack: {
          width: 36,
          height: 20,
          borderRadius: 10,
          backgroundColor: colors.border.emphasis,
          justifyContent: 'center',
          paddingHorizontal: 2,
        },
        toggleTrackOn: {
          backgroundColor: colors.accent.goldDim,
        },
        toggleThumb: {
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: colors.text.primary,
        },
        toggleThumbOn: {
          alignSelf: 'flex-end',
          backgroundColor: colors.accent.gold,
        },
        // ── Presets ──
        presetsRow: {
          flexDirection: 'row',
          marginBottom: spacing.lg,
          gap: spacing.sm,
        },
        presetChip: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radius.pill,
          backgroundColor: colors.border.subtle,
        },
        presetChipActive: {
          backgroundColor: colors.accent.goldDim,
        },
        // ── Band sliders ──
        bandRow: {
          marginBottom: spacing.sm,
        },
        bandLabelRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.xs,
        },
        // ── EQ Visual Curve ──
        curveContainer: {
          height: 80,
          borderRadius: radius.sm,
          marginBottom: spacing.md,
          justifyContent: 'center',
          overflow: 'hidden',
          paddingHorizontal: 4,
        },
        curveRefLine: {
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          height: 1,
          opacity: 0.5,
        },
        curveBars: {
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          height: '100%',
          paddingVertical: 8,
        },
        curveBarWrapper: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'flex-end',
          height: 64,
        },
        curveBar: {
          width: 6,
          minHeight: 2,
        },
        // ── Reset button ──
        resetBtn: {
          alignItems: 'center',
          paddingVertical: spacing.md,
          marginTop: spacing.sm,
          borderRadius: radius.sm,
          backgroundColor: colors.border.subtle,
        },
      }),
    [colors],
  );

  const MAX_BAR_HEIGHT = 64;
  const mapGainToHeight = useMemo(
    () => (gain: number): number => ((gain + 12) / 24) * MAX_BAR_HEIGHT,
    [],
  );

  const presetNames = Object.keys(EQ_PRESETS);

  return (
    <SafeAreaView style={styles.overlay}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={styles.panel}>
        {/* Handle bar */}
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <AppText variant="h3" color="primary">
            Equalizer
          </AppText>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <AppText variant="body1" color="secondary">
              ✕
            </AppText>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Enable/Disable toggle */}
          <TouchableOpacity style={styles.toggleRow} onPress={onToggle}>
            <AppText variant="body2" color="primary">
              Equalizer
            </AppText>
            <View
              style={[
                styles.toggleTrack,
                eqEnabled && styles.toggleTrackOn,
              ]}>
              <View
                style={[
                  styles.toggleThumb,
                  eqEnabled && styles.toggleThumbOn,
                ]}
              />
            </View>
          </TouchableOpacity>

          {/* Presets */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.presetsRow}>
            {presetNames.map(name => {
              const isActive =
                eqGains.every(
                  (g, i) => g === (EQ_PRESETS[name]?.[i] ?? 0),
                );
              return (
                <TouchableOpacity
                  key={name}
                  style={[
                    styles.presetChip,
                    isActive && styles.presetChipActive,
                  ]}
                  onPress={() => onApplyPreset(name)}>
                  <AppText
                    variant="caption"
                    color={isActive ? 'accent' : 'secondary'}>
                    {name}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── EQ Visual Curve ── */}
          {eqEnabled && (
            <View
              style={[
                styles.curveContainer,
                {backgroundColor: colors.background.primary},
              ]}>
              {/* 0dB reference line */}
              <View
                style={[
                  styles.curveRefLine,
                  {backgroundColor: colors.border.subtle},
                ]}
              />
              <View style={styles.curveBars}>
                {eqGains.map((gain, idx) => (
                  <View key={idx} style={styles.curveBarWrapper}>
                    <View
                      style={[
                        styles.curveBar,
                        {
                          height: mapGainToHeight(gain),
                          backgroundColor: eqEnabled
                            ? colors.accent.gold
                            : colors.text.tertiary,
                          opacity: eqEnabled ? 0.8 : 0.3,
                          borderRadius: 2,
                        },
                      ]}
                    />
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Band sliders */}
          {EQ_BANDS.map((band, index) => (
            <View key={band.freq} style={styles.bandRow}>
              <View style={styles.bandLabelRow}>
                <AppText variant="caption" color="secondary">
                  {band.label} Hz
                </AppText>
                <AppText variant="mono" color="accent">
                  {eqGains[index] != null ? eqGains[index] : 0} dB
                </AppText>
              </View>
              <Slider
                minimumValue={-12}
                maximumValue={12}
                step={1}
                value={eqGains[index] ?? 0}
                onValueChange={(val: number) => onBandChange(index, val)}
                minimumTrackTintColor={colors.accent.gold}
                maximumTrackTintColor={colors.border.subtle}
                thumbTintColor={colors.accent.gold}
              />
            </View>
          ))}

          {/* Reset button */}
          <TouchableOpacity style={styles.resetBtn} onPress={onReset}>
            <AppText variant="body2" color="error">
              Reset
            </AppText>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};
