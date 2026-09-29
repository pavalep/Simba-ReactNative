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
 * Track info / Share) at the bottom.
 *
 * **W5/W6 cleanup — all four are now real:**
 *   - Share     → `shareService.shareContent` (unchanged).
 *   - Save      → `downloadService.startDownload` for the current URI.
 *   - Add to playlist → `playerStore.addToPlaylist`.
 *   - Track info → a read-only summary of values the lib reports.
 *
 * They used to be `console.warn` placeholders blocked on a "current
 * track facade" that never existed. It turns out the identity was
 * always available: the lib's `PlayerState.playlist[currentIndex]`
 * carries the filename, now surfaced as `useTransport().state
 * .currentUri` (see `useTransport.ts` — "W5/W6 cleanup, current-track
 * URI facade identity"). A visible menu row that only warns is an
 * inert control, which this project forbids outright.
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
import {useTransport, useSkipSilence} from '../../../../infrastructure/player';
import {usePlayerStore} from '../../../../state/playerStore';
import {startDownload} from '../../../../services/downloadService';
import {useToast} from '../../../feedback/Toast';
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
import {useAutoPlayNextStore} from '../../../../state/useAutoPlayNextStore';
import {shareContent} from '../../../../services/shareService';

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
  const toast = useToast();
  const {state, commands} = useTransport();
  // V19 chrome surface — current track title + artist. The
  // facade (useTransport) reads these from the lib's
  // `usePlayer().state.title` / `.artist`, so the chrome never
  // reaches into the lib directly (audit §5 Rule 2 spirit —
  // the rule's grep is screens/pages/features only, but the
  // facade-as-public-surface architecture applies chrome-wide).
  const title = state.title;
  const artist = state.artist;
  // The REAL current URI, resolved structurally from the lib's
  // playlist (W5/W6 cleanup). This is what the Save / Add to
  // playlist actions act on — previously they had no identity to
  // work with and could only warn.
  const currentUri = state.currentUri;
  const durationMs = state.durationMs;

  /**
   * Track info — a read-only summary of values the lib actually
   * reports, surfaced in-sheet (never an invented value, and never
   * a `console.log` a user cannot see).
   */
  const showTrackInfo = React.useCallback(() => {
    if (!currentUri) {
      toast.show('No track loaded', 'info');
      return;
    }
    const seconds = Math.round(durationMs / 1000);
    toast.show(
      [
        title || 'Untitled track',
        artist ? `Artist: ${artist}` : null,
        `Duration: ${seconds}s`,
        `Source: ${currentUri}`,
      ]
        .filter(Boolean)
        .join(' · '),
      'info',
    );
  }, [title, artist, durationMs, currentUri, toast]);

  /** Save — a real `downloadService.startDownload` for the current URI. */
  const handleSave = React.useCallback(() => {
    if (!currentUri) {
      toast.show('Nothing to save', 'info');
      return;
    }
    startDownload({uri: currentUri, title: title || 'Untitled', mediaType: 'video'})
      .then(() => {
        toast.show('Download started', 'success');
      })
      .catch((e: unknown) => {
        if (__DEV__) console.warn('[VideoMoreSheet] save failed', e);
        toast.show('Download failed', 'error');
      });
  }, [currentUri, title, toast]);

  /** Add to playlist — a real `playerStore.addToPlaylist` call. */
  const handleAddToPlaylist = React.useCallback(() => {
    if (!currentUri) {
      toast.show('Nothing to add', 'info');
      return;
    }
    usePlayerStore.getState().addToPlaylist({
      uri: currentUri,
      title: title || 'Untitled',
      // `PlaybackEntryInput` requires a duration; the lib reports
      // the loaded item's, so use the real value rather than 0.
      duration: durationMs,
      mediaType: 'video',
      type: 'movie',
    });
    toast.show('Added to playlist', 'success');
  }, [currentUri, title, durationMs, toast]);

  // Quality store
  const qualityPreset = useQualityStore(s => s.preset);
  const setQualityPreset = useQualityStore(s => s.setPreset);
  const applyQuality = React.useCallback(
    (preset: VideoQualityPreset) => {
      const {hwdec, profile} = presetToMpv(preset);
      // **Order matters — write mpv FIRST, persist SECOND.**
      //
      // This used to persist the preset and then swallow any bridge
      // failure, so a rejected `hwdec` write still left the chip
      // highlighted on the new preset while mpv kept running the
      // old one: a control that lies about the state of the
      // player. Persisting only after the bridge accepts means the
      // stored preset always reflects what mpv was actually told.
      try {
        commands.setProperty('hwdec', hwdec);
        commands.setProperty('profile', profile);
      } catch (e) {
        // Bridge rejected the write (unavailable platform, missing
        // property). Leave the stored preset untouched so the chip
        // keeps showing what is genuinely in effect, and report it.
        if (__DEV__) {
          console.warn(
            `[VideoMoreSheet] quality preset '${preset}' rejected by the bridge; stored preset unchanged.`,
            e,
          );
        }
        onAction('setQuality');
        return;
      }
      setQualityPreset(preset);
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

  // Skip-silence (W3.6.5). The `useSkipSilence()` hook from
  // infrastructure/player auto-fires `commands.setAudioFilter`
  // (`scaletempo2=max-speed=32.0`) on toggle — calling it here
  // subscribes the side-effect while the sheet is mounted. We use
  // the hook's return value for BOTH the `enabled` read AND the
  // toggle (via `.toggle()`) — no separate direct store
  // subscription is needed; the hook IS the single source of truth
  // for the chrome's read+write surface.
  const skipSilence = useSkipSilence();

  // Auto-play-next (W3.6.12). The NextUpOverlay (Phase 3.6.7)
  // reads `useAutoPlayNextStore.getState().enabled` when its
  // countdown hits zero — when TRUE, it auto-fires
  // `commands.next()`. Default OFF (Puneet Patwari).
  const autoPlayNextEnabled = useAutoPlayNextStore(s => s.enabled);
  const setAutoPlayNextEnabled = useAutoPlayNextStore(s => s.setEnabled);

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
          if (title) {
            shareContent({
              route: 'SongScreen',
              params: {},
              title,
              subtitle: artist || undefined,
            }).catch(() => {
              // Cancelled — swallow.
            });
          }
          break;
        case 'save':
          handleSave();
          break;
        case 'addToPlaylist':
          handleAddToPlaylist();
          break;
        case 'trackInfo':
          showTrackInfo();
          break;
      }
      onAction(action);
    },
    [onAction, title, artist, handleSave, handleAddToPlaylist, showTrackInfo],
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

            <AppText variant="h2" color="inverse" style={styles.sectionHeader}>
              Playback
            </AppText>
            <ChipRow>
              <Chip
                label="Skip silence: Off"
                active={!skipSilence.enabled}
                onPress={() => skipSilence.toggle()}
                testID="skip-silence-chip-off"
              />
              <Chip
                label="Skip silence: On"
                active={skipSilence.enabled}
                onPress={() => skipSilence.toggle()}
                testID="skip-silence-chip-on"
              />
            </ChipRow>
            <AppText variant="caption" color="secondary" style={styles.descriptionText}>
              {skipSilence.enabled
                ? 'Silence is detected and skipped (mpv scaletempo2=max-speed=32.0).'
                : 'Plays silence as-is.'}
            </AppText>
            <ChipRow>
              <Chip
                label="Auto-play next: Off"
                active={!autoPlayNextEnabled}
                onPress={() => setAutoPlayNextEnabled(false)}
                testID="auto-play-next-chip-off"
              />
              <Chip
                label="Auto-play next: On"
                active={autoPlayNextEnabled}
                onPress={() => setAutoPlayNextEnabled(true)}
                testID="auto-play-next-chip-on"
              />
            </ChipRow>
            <AppText variant="caption" color="secondary" style={styles.descriptionText}>
              {autoPlayNextEnabled
                ? 'When on, the NextUp countdown auto-fires when it reaches zero.'
                : 'Auto-play off; Cancel + Play now are always required.'}
            </AppText>

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
