/**
 * V19 W3.5.6 — `VideoMoreSheet`.
 *
 * The expanded secondary-action sheet. Replaces `MoreSheet.tsx`
 * (W3.4) for the transport-bar More button by adding three
 * new groups:
 *
 *   1. Speed — chips for `0.5x | 1x | 1.25x | 1.5x | 2x`.
 *              Backed by `commands.setSpeed(rate)`.
 *   2. Video quality — three presets:
 *                 Battery saver  (mpv `hwdec=mediacodec`,  `profile=fast`)
 *                 Balanced        (mpv `hwdec=auto`,        `profile=`     )
 *                 High quality    (mpv `hwdec=no`,          `profile=high-quality`)
 *      Backed by `commands.setProperty('hwdec', …)` +
 *                `commands.setProperty('profile', …)`.
 *                The preset selection persists via
 *                `useQualityStore` (MMKV-backed).
 *   3. Sleep timer — chips for `Off | 5m | 10m | 15m | 30m | 45m | 60m`.
 *                    Selecting "Off" (or 0) cancels any running
 *                    timer. Selecting a positive minutes value
 *                    starts a countdown via `useSleepTimer` that
 *                    calls `commands.pause()` at zero.
 *                    The chip selection persists via
 *                    `useSleepTimerStore` (MMKV-backed); the
 *                    running countdown does NOT.
 *
 * Plus the four legacy W3.4 actions (Save / Add to playlist /
 * Track info / Share) at the bottom — Share wired to
 * `shareService.shareContent`; the other three remain
 * placeholders pending a "current track" facade.
 *
 * Important: this sheet is the SINGLE more-menu surface. No other
 * chrome surface opens it. W3.4's "no two paths to the same
 * secondary action" still holds.
 *
 * Architecture source of truth:
 *   `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md` §3.10 + §3.4
 *   + TRACKER Phase 3.5.6.
 */

import * as React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {useTheme} from '../../../../theme';
import {spacing, radius} from '../../../../theme/tokens';
import {AppText} from '../../../../components/core/AppText/AppText';
import {useTransport} from '../../../../infrastructure/player';
import {
  useQualityStore,
  VIDEO_QUALITY_PRESETS,
  presetToMpv,
  type VideoQualityPreset,
} from '../../../../state/useQualityStore';
import {
  useSleepTimerStore,
  SLEEP_TIMER_OPTIONS,
} from '../../../../state/useSleepTimerStore';
import {shareContent} from '../../../../services/shareService';
import {usePlayer} from '@simba-dev/react-native-media-player';

/* ─────────────────────────────────────────────────────────────────────────
 *                                CONSTANTS
 * ──────────────────────────────────────────────────────────────────────── */

export const SPEED_OPTIONS: ReadonlyArray<{value: number; label: string}> = [
  {value: 0.5, label: '0.5×'},
  {value: 1, label: '1×'},
  {value: 1.25, label: '1.25×'},
  {value: 1.5, label: '1.5×'},
  {value: 2, label: '2×'},
];

/** Legacy W3.4 actions retained at the bottom of the sheet. */
export type LegacyMoreAction = 'save' | 'addToPlaylist' | 'trackInfo' | 'share';
export type VideoMoreAction = LegacyMoreAction | 'setSpeed' | 'setQuality' | 'setSleep';

export interface VideoMoreSheetProps {
  visible: boolean;
  onAction: (action: VideoMoreAction) => void;
  onClose: () => void;
}

/* ─────────────────────────────────────────────────────────────────────────
 *                              SLEEP TIMER HOOK
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Owns the running countdown. Reads the selected minutes from the
 * store. When > 0, starts a setTimeout(pause) of that duration.
 * Auto-resets to `0` in the store after firing so re-arming
 * requires user intent.
 *
 * NOTE: this hook returns no React state — it's a fire-and-forget
 * effect. The store IS the source of truth; the UI chips are bound
 * to the store, not to this hook's lifecycle.
 */
export function useSleepTimer(
  onExpire: () => void,
): void {
  const minutes = useSleepTimerStore(s => s.minutes);
  const setMinutes = useSleepTimerStore(s => s.setMinutes);
  const handleRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    // Clear any prior timer.
    if (handleRef.current) {
      clearTimeout(handleRef.current);
      handleRef.current = null;
    }
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    const ms = minutes * 60_000;
    handleRef.current = setTimeout(() => {
      handleRef.current = null;
      // Reset to "Off" so the next arm requires explicit user action,
      // and so the chip group redraws the "Off" selection.
      setMinutes(0);
      onExpire();
    }, ms);
    return () => {
      if (handleRef.current) {
        clearTimeout(handleRef.current);
        handleRef.current = null;
      }
    };
  }, [minutes, setMinutes, onExpire]);
}

/* ─────────────────────────────────────────────────────────────────────────
 *                                 COMPONENT
 * ──────────────────────────────────────────────────────────────────────── */

export const VideoMoreSheet: React.FC<VideoMoreSheetProps> = ({
  visible,
  onAction,
  onClose,
}) => {
  const {colors} = useTheme();
  const {state, commands} = useTransport();
  const {state: playerState} = usePlayer();

  // Quality store
  const qualityPreset = useQualityStore(s => s.preset);
  const setQualityPreset = useQualityStore(s => s.setPreset);
  const applyQuality = React.useCallback(
    (preset: VideoQualityPreset) => {
      setQualityPreset(preset);
      const {hwdec, profile} = presetToMpv(preset);
      try {
        commands.setProperty('hwdec', hwdec);
        commands.setProperty('profile', profile);
      } catch {
        // Bridge not wired (jest / web preview). Skip silently.
      }
      onAction('setQuality');
    },
    [setQualityPreset, commands, onAction],
  );

  // Sleep timer store
  const sleepMinutes = useSleepTimerStore(s => s.minutes);
  const setSleepMinutes = useSleepTimerStore(s => s.setMinutes);
  const handleSleepExpire = React.useCallback(() => {
    try {
      commands.pause();
    } catch {
      // ignore
    }
  }, [commands]);
  useSleepTimer(handleSleepExpire);

  const handleSpeed = React.useCallback(
    (rate: number) => {
      try {
        commands.setSpeed(rate);
      } catch {
        // ignore
      }
      onAction('setSpeed');
    },
    [commands, onAction],
  );

  const handleSleep = React.useCallback(
    (minutes: number) => {
      setSleepMinutes(minutes);
      onAction('setSleep');
    },
    [setSleepMinutes, onAction],
  );

  const handleLegacy = React.useCallback(
    (action: LegacyMoreAction) => {
      switch (action) {
        case 'share':
          if (playerState.title) {
            shareContent({
              route: 'SongScreen',
              params: {},
              title: playerState.title,
              subtitle: playerState.artist || undefined,
            }).catch(() => {
              // Cancelled — swallow.
            });
          }
          break;
        case 'save':
        case 'addToPlaylist':
        case 'trackInfo':
          console.warn(
            `[VideoMoreSheet] legacy action '${action}' is a placeholder. Wire in follow-up.`,
          );
          break;
      }
      onAction(action);
    },
    [onAction, playerState.title, playerState.artist],
  );

  const currentSpeed = state.speed ?? 1;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={[styles.backdrop, {backgroundColor: colors.background.scrim}]}>
        <View style={[styles.sheet, {backgroundColor: colors.background.surfaceDark}]}>
          {/* Drag handle (chrome convention). */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, {backgroundColor: colors.border.emphasis}]} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <AppText variant="h2" color="inverse" style={styles.sectionHeader}>
              Speed
            </AppText>
            <ChipRow>
              {SPEED_OPTIONS.map(opt => {
                const active = approxEqual(opt.value, currentSpeed);
                return (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    active={active}
                    onPress={() => handleSpeed(opt.value)}
                    testID={`speed-chip-${opt.value}`}
                  />
                );
              })}
            </ChipRow>

            <AppText variant="h2" color="inverse" style={styles.sectionHeader}>
              Video quality
            </AppText>
            <ChipRow>
              {VIDEO_QUALITY_PRESETS.map(opt => {
                const active = opt.value === qualityPreset;
                return (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    active={active}
                    onPress={() => applyQuality(opt.value)}
                    testID={`quality-chip-${opt.value}`}
                  />
                );
              })}
            </ChipRow>
            <AppText variant="caption" color="secondary" style={styles.descriptionText}>
              {VIDEO_QUALITY_PRESETS.find(o => o.value === qualityPreset)
                ?.description ?? ''}
            </AppText>

            <AppText variant="h2" color="inverse" style={styles.sectionHeader}>
              Sleep timer
            </AppText>
            <ChipRow>
              {SLEEP_TIMER_OPTIONS.map(opt => {
                const active =
                  sleepMinutes === 0
                    ? opt.value === 0
                    : opt.value === sleepMinutes;
                return (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    active={active}
                    onPress={() => handleSleep(opt.value)}
                    testID={`sleep-chip-${opt.value}`}
                  />
                );
              })}
            </ChipRow>

            <View style={styles.dividerRow}>
              <View style={[styles.divider, {backgroundColor: colors.border.emphasis}]} />
            </View>

            <ListRow
              label="Save"
              onPress={() => handleLegacy('save')}
              testID="legacy-save"
            />
            <ListRow
              label="Add to playlist"
              onPress={() => handleLegacy('addToPlaylist')}
              testID="legacy-add-to-playlist"
            />
            <ListRow
              label="Track info"
              onPress={() => handleLegacy('trackInfo')}
              testID="legacy-track-info"
            />
            <ListRow
              label="Share"
              onPress={() => handleLegacy('share')}
              testID="legacy-share"
              isLast
            />

            <View style={styles.closeRow}>
              <Pressable
                onPress={onClose}
                style={({pressed}) => [
                  styles.closeButton,
                  {borderColor: colors.border.emphasis},
                  pressed ? {opacity: 0.7} : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Close more menu"
              >
                <AppText variant="button" color="inverse">
                  Close
                </AppText>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default VideoMoreSheet;

/* ─────────────────────────────────────────────────────────────────────────
 *                              INTERNAL PRIMITIVES
 * ──────────────────────────────────────────────────────────────────────── */

const ChipRow: React.FC<React.PropsWithChildren> = ({children}) => (
  <View style={styles.chipRow}>{children}</View>
);

const Chip: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
}> = ({label, active, onPress, testID}) => {
  const {colors} = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.chip,
        {
          borderColor: active ? colors.accent.gold : colors.border.emphasis,
          backgroundColor: active ? colors.accent.gold : 'transparent',
        },
        pressed ? {opacity: 0.7} : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{selected: active}}
      testID={testID}
    >
      <AppText
        variant="button"
        color={active ? 'inverse' : 'inverse'}
      >
        {label}
      </AppText>
    </Pressable>
  );
};

const ListRow: React.FC<{
  label: string;
  onPress: () => void;
  testID?: string;
  isLast?: boolean;
}> = ({label, onPress, testID, isLast}) => {
  const {colors} = useTheme();
  return (
    <>
      <Pressable
        onPress={onPress}
        style={({pressed}) => [
          styles.listRow,
          pressed ? {opacity: 0.7} : null,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
        testID={testID}
      >
        <AppText variant="body1" color="inverse">
          {label}
        </AppText>
      </Pressable>
      {!isLast && (
        <View
          style={[styles.listDivider, {backgroundColor: colors.border.emphasis}]}
        />
      )}
    </>
  );
};

function approxEqual(a: number, b: number, eps = 0.01): boolean {
  return Math.abs(a - b) < eps;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.md,
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  sectionHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  descriptionText: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  dividerRow: {
    marginVertical: spacing.lg,
  },
  divider: {
    height: 1,
  },
  listRow: {
    paddingVertical: spacing.md,
  },
  listDivider: {
    height: 1,
  },
  closeRow: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  closeButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});

// re-export typed action enum so it shows in module exports at the path.
export type {VideoQualityPreset};
