import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {AppText} from '../../core/AppText/AppText';
import {SvgIcon} from '../../utility/SvgIcon';

// ─── Props ───────────────────────────────────────────────────

export interface TrackItem {
  /** Internal id used by MPV (MpvTrack.id). */
  id: number;
  /** Human label shown in the popup (e.g. "English"). */
  title: string;
  /** Optional codec info shown as a sub-label (e.g. "AAC, stereo"). */
  codec?: string;
  /** True when this is the currently-selected track. */
  selected?: boolean;
}

export interface TrackSelectionPopupProps {
  visible: boolean;
  /** Title at the top of the popup, e.g. "Subtitles" or "Audio". */
  title: string;
  /** The list of tracks to display (without the Off row). */
  tracks: TrackItem[];
  /** The id of the currently active track, or null if "Off" is active. */
  activeId: number | null;
  /** Whether to show the "Off" row as the first selectable item. */
  showOffOption?: boolean;
  /** Label for the off option (defaults to "Off"). */
  offLabel?: string;
  /** Called when the user picks a track (or null for Off). */
  onSelect: (id: number | null) => void;
  /** Called when the user dismisses the popup without choosing. */
  onDismiss: () => void;
}

// ─── Component ───────────────────────────────────────────────

/**
 * V6 6.1: TrackSelectionPopup
 *
 * A small, focused picker for short track lists (subtitles, audio,
 * quality). Designed to replace the full-screen BottomSheet for ≤5
 * options — YouTube/Netflix pattern.
 *
 * Renders as a Modal so it floats above the rest of the player UI
 * (including the secondary toolbar and any other sheets). The
 * semi-transparent backdrop captures tap-outside-to-dismiss.
 */
export const TrackSelectionPopup: React.FC<TrackSelectionPopupProps> = ({
  visible,
  title,
  tracks,
  activeId,
  showOffOption = true,
  offLabel = 'Off',
  onSelect,
  onDismiss,
}) => {
  const {colors} = useTheme();
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(8)).current;
  const [mounted, setMounted] = useState(visible);

  // Mount/unmount the modal lazily so we never render off-screen.
  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 160,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(slide, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 0,
          duration: 140,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(slide, {
          toValue: 8,
          duration: 140,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({finished}) => {
        if (finished) {
          setMounted(false);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handlePick = useCallback(
    (id: number | null) => {
      onSelect(id);
    },
    [onSelect],
  );

  const isOffActive = activeId === null;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.55)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.lg,
        },
        card: {
          width: '100%',
          maxWidth: 360,
          backgroundColor: colors.background.elevated,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border.subtle,
          paddingVertical: spacing.sm,
          overflow: 'hidden',
          // Soft shadow to lift above the rest of the player
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 6},
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 12,
        },
        title: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
          fontWeight: '700',
          fontSize: 13,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: colors.text.tertiary,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: 12,
          gap: spacing.md,
        },
        rowActive: {
          backgroundColor: colors.accent.goldWash,
        },
        rowLabel: {
          flex: 1,
        },
        rowTitle: {
          fontSize: 15,
          fontWeight: '500',
        },
        rowTitleActive: {
          fontWeight: '700',
          color: colors.accent.gold,
        },
        rowSub: {
          fontSize: 11,
          opacity: 0.6,
          marginTop: 2,
        },
        checkIcon: {
          width: 22,
          alignItems: 'center',
        },
        divider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border.subtle,
          marginHorizontal: spacing.lg,
        },
        empty: {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.lg,
          alignItems: 'center',
        },
      }),
    [colors],
  );

  if (!mounted) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}>
      <Animated.View
        style={[styles.backdrop, {opacity: fade}]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss track selector"
        />
        <Animated.View
          style={[
            styles.card,
            {transform: [{translateY: slide}]},
          ]}>
          <AppText style={styles.title}>{title}</AppText>
          <View style={styles.divider} />

          {/* Off option (always first when enabled) */}
          {showOffOption && (
            <TouchableOpacity
              style={[styles.row, isOffActive && styles.rowActive]}
              onPress={() => handlePick(null)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityLabel={offLabel}
              accessibilityState={{selected: isOffActive}}>
              <View style={styles.checkIcon}>
                {isOffActive && (
                  <SvgIcon name="check" size={18} color={colors.accent.gold} />
                )}
              </View>
              <View style={styles.rowLabel}>
                <AppText
                  style={[
                    styles.rowTitle,
                    isOffActive && styles.rowTitleActive,
                  ]}>
                  {offLabel}
                </AppText>
              </View>
            </TouchableOpacity>
          )}

          {tracks.length === 0 ? (
            <View style={styles.empty}>
              <AppText variant="caption" color="tertiary">
                No tracks available
              </AppText>
            </View>
          ) : (
            tracks.map(track => {
              const isActive = track.id === activeId;
              return (
                <TouchableOpacity
                  key={String(track.id)}
                  style={[styles.row, isActive && styles.rowActive]}
                  onPress={() => handlePick(track.id)}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityLabel={track.title}
                  accessibilityState={{selected: isActive}}>
                  <View style={styles.checkIcon}>
                    {isActive && (
                      <SvgIcon
                        name="check"
                        size={18}
                        color={colors.accent.gold}
                      />
                    )}
                  </View>
                  <View style={styles.rowLabel}>
                    <AppText
                      style={[
                        styles.rowTitle,
                        isActive && styles.rowTitleActive,
                      ]}>
                      {track.title}
                    </AppText>
                    {track.codec ? (
                      <AppText style={styles.rowSub}>{track.codec}</AppText>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default React.memo(TrackSelectionPopup);
