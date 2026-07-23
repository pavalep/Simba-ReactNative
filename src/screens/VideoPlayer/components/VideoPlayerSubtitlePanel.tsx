import React, {useMemo, useCallback} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';

// ─── Props ───────────────────────────────────────────────────

export interface VideoPlayerSubtitlePanelProps {
  subtitleTracks: Array<{
    id: number;
    title?: string;
    lang?: string;
    selected?: boolean;
  }>;
  activeSubtitle: number | null;
  subtitleVisible: boolean;
  onSelectTrack: (trackId: number | null) => void;
  onToggleVisibility: () => void;
  onLoadExternal: () => void;
  onClose: () => void;
  subtitleFontSize: 'small' | 'medium' | 'large';
  onFontSizeChange: (size: 'small' | 'medium' | 'large') => void;
  subtitleOpacity: number;
  onOpacityChange: (opacity: number) => void;
}

// ─── Component ───────────────────────────────────────────────

export const VideoPlayerSubtitlePanel: React.FC<VideoPlayerSubtitlePanelProps> = ({
  subtitleTracks,
  activeSubtitle,
  subtitleVisible,
  subtitleFontSize,
  subtitleOpacity,
  onSelectTrack,
  onToggleVisibility,
  onLoadExternal,
  onFontSizeChange,
  onOpacityChange,
  onClose,
}) => {
  const {colors} = useTheme();

  const handleOpacityDown = useCallback(() => {
    const newVal = Math.max(0.3, Math.round((subtitleOpacity - 0.1) * 10) / 10);
    onOpacityChange(newVal);
  }, [subtitleOpacity, onOpacityChange]);

  const handleOpacityUp = useCallback(() => {
    const newVal = Math.min(1.0, Math.round((subtitleOpacity + 0.1) * 10) / 10);
    onOpacityChange(newVal);
  }, [subtitleOpacity, onOpacityChange]);

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
          maxHeight: '70%',
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
        trackRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.sm,
        },
        radioOuter: {
          width: 16,
          height: 16,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: colors.border.subtle,
          alignItems: 'center',
          justifyContent: 'center',
        },
        radioFilled: {
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: colors.accent.gold,
        },
        trackInfo: {
          flex: 1,
          marginLeft: spacing.md,
        },
        trackIdText: {
          marginLeft: spacing.sm,
        },
        divider: {
          height: 1,
          backgroundColor: colors.border.subtle,
          marginVertical: spacing.xs,
        },
        toggleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.sm,
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
        loadBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing.md,
          marginTop: spacing.sm,
          borderRadius: radius.sm,
          backgroundColor: colors.accent.goldDim,
        },
        loadBtnIcon: {
          marginRight: spacing.sm,
        },
        sectionLabel: {
          marginTop: spacing.md,
          marginBottom: spacing.sm,
        },
        styleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.xs,
        },
        sizeChips: {
          flexDirection: 'row',
          gap: spacing.sm,
        },
        sizeChip: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radius.sm,
          backgroundColor: colors.border.subtle,
        },
        sizeChipActive: {
          backgroundColor: colors.accent.goldDim,
        },
        opacityBtn: {
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: colors.border.subtle,
          alignItems: 'center',
          justifyContent: 'center',
        },
        opacityValue: {
          minWidth: 32,
          textAlign: 'center',
        },
      }),
    [colors],
  );

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
            Subtitles
          </AppText>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close panel" accessibilityRole="button">
            <AppText variant="body1" color="secondary">
              ✕
            </AppText>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Disable subtitles option */}
          <TouchableOpacity
            style={styles.trackRow}
            onPress={() => onSelectTrack(null)}>
            <View
              style={
                activeSubtitle === null
                  ? styles.radioFilled
                  : styles.radioOuter
              }
            />
            <View style={styles.trackInfo}>
              <AppText variant="body2" color="primary">
                Disable subtitles
              </AppText>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Track list */}
          {subtitleTracks.map(track => {
            const isSelected = track.id === activeSubtitle;
            return (
              <TouchableOpacity
                key={track.id}
                style={styles.trackRow}
                onPress={() => onSelectTrack(track.id)}>
                <View
                  style={isSelected ? styles.radioFilled : styles.radioOuter}
                />
                <View style={styles.trackInfo}>
                  <AppText variant="body2" color="primary">
                    {track.title || `Track ${track.id}`}
                  </AppText>
                  {track.lang ? (
                    <AppText variant="caption" color="secondary">
                      {track.lang}
                    </AppText>
                  ) : null}
                </View>
                <AppText
                  variant="caption"
                  color="secondary"
                  style={styles.trackIdText}>
                  #{track.id}
                </AppText>
              </TouchableOpacity>
            );
          })}

          <View style={styles.divider} />

          {/* Toggle visibility row */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={onToggleVisibility}>
            <AppText variant="body2" color="primary">
              Show Subtitles
            </AppText>
            <View
              style={[
                styles.toggleTrack,
                subtitleVisible && styles.toggleTrackOn,
              ]}>
              <View
                style={[
                  styles.toggleThumb,
                  subtitleVisible && styles.toggleThumbOn,
                ]}
              />
            </View>
          </TouchableOpacity>

          {/* Load external subtitle file button */}
          <TouchableOpacity style={styles.loadBtn} onPress={onLoadExternal}>
            <AppText
              variant="body2"
              color="accent"
              style={styles.loadBtnIcon}>
              +
            </AppText>
            <AppText variant="body2" color="accent">
              Load external subtitle file
            </AppText>
          </TouchableOpacity>

          {/* Style section */}
          <View style={styles.divider} />
          <AppText variant="caption" color="secondary" style={styles.sectionLabel}>
            Style
          </AppText>

          {/* Font size chips */}
          <View style={styles.styleRow}>
            <AppText variant="body2" color="primary">
              Font Size
            </AppText>
            <View style={styles.sizeChips}>
              {(['small', 'medium', 'large'] as const).map(size => {
                const label = size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L';
                const isActive = subtitleFontSize === size;
                return (
                  <TouchableOpacity
                    key={size}
                    style={[styles.sizeChip, isActive && styles.sizeChipActive]}
                    onPress={() => onFontSizeChange(size)}>
                    <AppText
                      variant="caption"
                      color={isActive ? 'accent' : 'secondary'}>
                      {label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Opacity slider */}
          <View style={styles.styleRow}>
            <AppText variant="body2" color="primary">
              Opacity
            </AppText>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm}}>
              <TouchableOpacity style={styles.opacityBtn} onPress={handleOpacityDown}>
                <AppText variant="body2" color="secondary">
                  -
                </AppText>
              </TouchableOpacity>
              <AppText
                variant="body2"
                color="primary"
                style={styles.opacityValue}>
                {subtitleOpacity.toFixed(1)}
              </AppText>
              <TouchableOpacity style={styles.opacityBtn} onPress={handleOpacityUp}>
                <AppText variant="body2" color="secondary">
                  +
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};
