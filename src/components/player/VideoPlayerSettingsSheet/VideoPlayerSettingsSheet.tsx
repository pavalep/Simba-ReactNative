import React, {useCallback, useMemo} from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon';
import {BottomSheet} from '../../sheets/BottomSheet/BottomSheet';

// ─── Props ───────────────────────────────────────────────────

export interface VideoPlayerSettingsSheetProps {
  visible: boolean;
  onClose: () => void;

  // Group: Playback
  shuffleActive: boolean;
  loopMode: 'none' | 'file' | 'playlist';
  onToggleShuffle: () => void;
  onToggleLoop: () => void;
  onSpeed: () => void;

  // Group: Audio (kept for users who still want EQ from the video
  // player; the spec says audio features belong in the audio player,
  // but we surface a quick toggle for parity with the existing behaviour
  // until that migration is done in a follow-up).
  eqEnabled: boolean;
  eqGains: number[];
  onToggleEq: () => void;
  onResetEq: () => void;

  // Group: Playlist
  playlistLength: number;
  onTogglePlaylist: () => void;
  onToggleQueue: () => void;

  // Group: Info
  onInfo: () => void;
  onScreenshot: () => void;
}

// ─── Helpers ────────────────────────────────────────────────

type Group = 'playback' | 'audio' | 'playlist' | 'info';

// ─── Component ───────────────────────────────────────────────

/**
 * V6 7.2: VideoPlayerSettingsSheet
 *
 * A single grouped settings sheet for the video player. Replaces the
 * cluster of one-off bottom sheets the player used to need for shuffle,
 * loop, speed, EQ, playlist, queue, info, and screenshot.
 *
 * Groups (in order):
 *   1. Playback  — Shuffle, Loop, Speed
 *   2. Audio     — EQ toggle + Reset
 *   3. Playlist  — Playlist, Queue (visible when length > 0)
 *   4. Info      — Details, Screenshot
 *
 * Each row is a single tap target; toggles use the project's Switch.
 */
export const VideoPlayerSettingsSheet: React.FC<
  VideoPlayerSettingsSheetProps
> = ({
  visible,
  onClose,
  shuffleActive,
  loopMode,
  onToggleShuffle,
  onToggleLoop,
  onSpeed,
  eqEnabled,
  eqGains,
  onToggleEq,
  onResetEq,
  playlistLength,
  onTogglePlaylist,
  onToggleQueue,
  onInfo,
  onScreenshot,
}) => {
  const {colors} = useTheme();

  const loopLabel = useMemo(() => {
    if (loopMode === 'file') return 'Loop One';
    if (loopMode === 'playlist') return 'Loop All';
    return 'Loop Off';
  }, [loopMode]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: {
          flex: 1,
        },
        content: {
          paddingBottom: spacing.lg,
        },
        group: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
        },
        groupHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: spacing.sm,
        },
        groupTitle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: colors.text.tertiary,
        },
        groupSub: {
          fontSize: 11,
          opacity: 0.6,
          marginLeft: 'auto',
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 52,
          paddingVertical: spacing.sm,
          gap: spacing.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border.subtle,
        },
        rowFirst: {
          borderTopWidth: 0,
        },
        rowLabel: {
          flex: 1,
        },
        rowTitle: {
          fontSize: 15,
          fontWeight: '500',
          color: colors.text.primary,
        },
        rowSub: {
          fontSize: 11,
          color: colors.text.tertiary,
          marginTop: 2,
        },
        badge: {
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: radius.pill,
          backgroundColor: eqEnabled
            ? colors.accent.gold
            : colors.background.overlay,
          marginLeft: 4,
        },
        badgeText: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.4,
          color: eqEnabled ? colors.text.inverse : colors.text.secondary,
        },
        iconChip: {
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background.overlay,
        },
        iconChipActive: {
          backgroundColor: colors.accent.gold,
        },
        resetBtn: {
          paddingHorizontal: spacing.md,
          paddingVertical: 6,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: colors.border.subtle,
        },
      }),
    [colors, eqEnabled],
  );

  const handleLoop = useCallback(() => {
    onToggleLoop();
  }, [onToggleLoop]);

  const renderGroupHeader = (label: string, sub?: string) => (
    <View style={styles.groupHeader}>
      <AppText style={styles.groupTitle}>{label}</AppText>
      {sub ? <AppText style={styles.groupSub}>{sub}</AppText> : null}
    </View>
  );

  const renderRow = (
    icon: React.ComponentProps<typeof SvgIcon>['name'],
    title: string,
    sub: string | null,
    onPress: () => void,
    extra: React.ReactNode,
    isFirst: boolean,
    iconActive = false,
  ) => (
    <TouchableOpacity
      style={[styles.row, isFirst && styles.rowFirst]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={sub ?? undefined}>
      <View
        style={[styles.iconChip, iconActive && styles.iconChipActive]}>
        <SvgIcon
          name={icon}
          size={18}
          color={iconActive ? colors.text.inverse : colors.text.primary}
        />
      </View>
      <View style={styles.rowLabel}>
        <AppText style={styles.rowTitle}>{title}</AppText>
        {sub ? <AppText style={styles.rowSub}>{sub}</AppText> : null}
      </View>
      {extra}
    </TouchableOpacity>
  );

  return (
    <BottomSheet
      title="More"
      visible={visible}
      onClose={onClose}
      snapPoints={['60%', '90%']}
      initialSnap={0}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* ── Group: Playback ── */}
        <View style={styles.group}>
          {renderGroupHeader('Playback')}
          {renderRow(
            'shuffle',
            'Shuffle',
            shuffleActive ? 'On' : 'Off',
            onToggleShuffle,
            <Switch
              value={shuffleActive}
              onValueChange={onToggleShuffle}
              trackColor={{
                true: colors.accent.gold,
                false: colors.background.overlay,
              }}
            />,
            true,
            shuffleActive,
          )}
          {renderRow(
            'repeat',
            'Loop',
            loopLabel,
            handleLoop,
            <AppText variant="caption" color="secondary">
              {loopLabel}
            </AppText>,
            false,
            loopMode !== 'none',
          )}
          {renderRow(
            'speed',
            'Speed',
            'Playback rate',
            onSpeed,
            <SvgIcon
              name="chevronRight"
              size={16}
              color={colors.text.tertiary}
            />,
            false,
          )}
        </View>

        {/* ── Group: Audio ── */}
        <View style={styles.group}>
          {renderGroupHeader('Audio')}
          {renderRow(
            'sliders',
            'Equalizer',
            eqEnabled
              ? `${eqGains.length} bands active`
              : 'Flat response',
            onToggleEq,
            <View style={styles.badge}>
              <AppText style={styles.badgeText}>
                {eqEnabled ? 'ON' : 'OFF'}
              </AppText>
            </View>,
            true,
            eqEnabled,
          )}
          {eqEnabled ? (
            <View style={[styles.row, styles.rowFirst]}>
              <View style={styles.rowLabel}>
                <AppText style={styles.rowSub}>
                  Reset all bands to flat (0 dB) and disable EQ.
                </AppText>
              </View>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={onResetEq}
                accessibilityRole="button"
                accessibilityLabel="Reset equalizer">
                <AppText variant="caption" color="accent">
                  Reset
                </AppText>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* ── Group: Playlist ── */}
        <View style={styles.group}>
          {renderGroupHeader(
            'Playlist',
            playlistLength > 0
              ? `${playlistLength} item${playlistLength === 1 ? '' : 's'}`
              : undefined,
          )}
          {renderRow(
            'listMusic',
            'Playlist',
            playlistLength > 0
              ? `${playlistLength} item${playlistLength === 1 ? '' : 's'}`
              : 'Empty',
            onTogglePlaylist,
            <SvgIcon
              name="chevronRight"
              size={16}
              color={colors.text.tertiary}
            />,
            true,
            playlistLength > 0,
          )}
          {renderRow(
            'layoutList',
            'Queue',
            'Up next',
            onToggleQueue,
            <SvgIcon
              name="chevronRight"
              size={16}
              color={colors.text.tertiary}
            />,
            false,
          )}
        </View>

        {/* ── Group: Info ── */}
        <View style={styles.group}>
          {renderGroupHeader('Info')}
          {renderRow(
            'info',
            'Details',
            'Metadata, chapters, related tracks',
            onInfo,
            <SvgIcon
              name="chevronRight"
              size={16}
              color={colors.text.tertiary}
            />,
            true,
          )}
          {renderRow(
            'camera',
            'Screenshot',
            'Capture the current frame',
            onScreenshot,
            <SvgIcon
              name="chevronRight"
              size={16}
              color={colors.text.tertiary}
            />,
            false,
          )}
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

export default React.memo(VideoPlayerSettingsSheet);
