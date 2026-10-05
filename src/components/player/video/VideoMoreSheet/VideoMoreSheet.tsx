/**
 * V19 W7.4 — `VideoMoreSheet`, rebuilt as an information architecture.
 *
 * ## The four reported defects, and what each one actually was
 *
 * **"It goes full screen."**  The sheet had `maxHeight: '90%'` and a
 * long `ScrollView`, so it covered nine tenths of the player and the
 * video became a sliver. The resting detent is now `62%`, which leaves
 * the picture visible above it — the sheet is a panel over the film,
 * not a page that replaced it.
 *
 * **"It cannot be closed."**  The backdrop was a plain `View`. Not
 * pressable, so tapping outside did nothing, and the only remaining
 * affordance was a "Close" button at the very BOTTOM of a scroll that
 * was 90% of the screen tall — i.e. off-screen. The user was trapped
 * except by the hardware back button. Three exits now exist and all
 * three are reachable without scrolling:
 *
 *   1. tap the backdrop,
 *   2. drag the sheet down past a dismissal threshold,
 *   3. the ✕ in the pinned header.
 *
 * The header is PINNED (outside the `ScrollView`) specifically so the
 * close control cannot scroll away. That is the structural half of the
 * fix; adding a third close button while leaving it inside the scroll
 * would have reproduced the same trap.
 *
 * **"The content is wrong."**  Every setting was a wall of chips. Worse,
 * three of them were not just ugly but incorrect:
 *
 *   - Skip silence was TWO chips, "Off" and "On", and **both** called
 *     `skipSilence.toggle()`. Tapping the chip labelled "Off" while it
 *     was already off turned it ON. That is a control that lies — SPEC
 *     invariant I3. It is now ONE row that sets an explicit boolean.
 *   - The `Chip` primitive contained `color={active ? 'inverse' :
 *     'inverse'}` — a ternary with two identical branches, so the
 *     "active" styling was an accident of the background colour alone.
 *   - Auto-play next had the same two-chip shape as a boolean.
 *
 * A setting that has a small fixed set of values is a VALUE ROW —
 * `label` on the left, the current value on the right, a chevron, and
 * the options revealed inline on tap. That is the iOS/Tencent
 * settings idiom, and it scales: the sheet stays four rows tall per
 * group no matter whether a setting has 2 options or 7, which is
 * exactly what pushed the old version to 90% of the screen.
 *
 * **Sections.** Groups are now PLAYBACK / LIBRARY under small eyebrow
 * headers, not `variant="h2"` display type. Six `h2` headers in a
 * settings panel is a document, not a menu.
 *
 * ## Where the volume control is NOT
 *
 * Volume lives in the transport bar (`VolumeControl`). It is
 * deliberately absent here: a second editor for the same lib property,
 * mounted at the same time, is two owners of one value and they will
 * drift. The same reasoning keeps Captions out — the transport bar's
 * captions pill already owns it.
 *
 * ## Why this sheet is still the ONLY more-menu surface
 *
 * SPEC §3.4: "no two paths to the same secondary action". Nothing else
 * in the chrome opens this sheet.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_UI_OVERHAUL.md`
 * §1.4 and §3.3; `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md` §3.10.
 */

import * as React from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type PanResponderGestureState,
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
import {SvgIcon} from '../../../utility/SvgIcon';
import {PlayerControl, CONTROL_ICON_SIZE} from '../PlayerControl/PlayerControl';

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

/**
 * V19 W7.4 — the resting height of the sheet.
 *
 * 90% (the old value) covered nine tenths of the player and left the
 * video as a sliver, which is the "it goes full screen" complaint. 62%
 * keeps the film visible above the panel — enough to see what you are
 * adjusting — while still fitting four groups of value rows without an
 * internal scroll on a landscape phone.
 */
export const SHEET_MAX_HEIGHT = '62%';

/**
 * How far the sheet must be dragged down before it dismisses, in px.
 *
 * A fixed distance rather than a velocity test, because velocity alone
 * dismisses on a fast flick that was clearly a fling-to-scroll. 88 px
 * is roughly a thumb's worth of travel.
 */
export const DISMISS_DRAG_PX = 88;

/** Drag velocity that dismisses regardless of distance (a real flick). */
export const DISMISS_VELOCITY = 0.6;

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
 */
export function useSleepTimer(onExpire: () => void): void {
  const minutes = useSleepTimerStore(s => s.minutes);
  const setMinutes = useSleepTimerStore(s => s.setMinutes);
  const handleRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (handleRef.current) {
      clearTimeout(handleRef.current);
      handleRef.current = null;
    }
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    const ms = minutes * 60_000;
    handleRef.current = setTimeout(() => {
      handleRef.current = null;
      // Reset to "Off" so the next arm requires explicit user action,
      // and so the value row stops reporting a timer that has expired.
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
  const title = state.title;
  const artist = state.artist;
  const currentUri = state.currentUri;
  const durationMs = state.durationMs;

  /**
   * V19 W7.4 — which value row is expanded. Exactly ONE at a time, and
   * it lives here rather than inside each row, because a settings panel
   * with three sections all open at once is a wall again — the thing
   * the value-row design exists to avoid.
   */
  const [expanded, setExpanded] = React.useState<string | null>(null);

  // Close and collapse together. A dismissed sheet that reopens still
  // showing an open row is a sheet that did not really close.
  const handleClose = React.useCallback(() => {
    setExpanded(null);
    onClose();
  }, [onClose]);

  const toggleRow = React.useCallback((key: string) => {
    setExpanded(prev => (prev === key ? null : key));
  }, []);

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

  const handleAddToPlaylist = React.useCallback(() => {
    if (!currentUri) {
      toast.show('Nothing to add', 'info');
      return;
    }
    usePlayerStore.getState().addToPlaylist({
      uri: currentUri,
      title: title || 'Untitled',
      duration: durationMs,
      mediaType: 'video',
      type: 'movie',
    });
    toast.show('Added to playlist', 'success');
  }, [currentUri, title, durationMs, toast]);

  const qualityPreset = useQualityStore(s => s.preset);
  const setQualityPreset = useQualityStore(s => s.setPreset);
  const applyQuality = React.useCallback(
    (preset: VideoQualityPreset) => {
      const {hwdec, profile} = presetToMpv(preset);
      // **Order matters — write mpv FIRST, persist SECOND.**
      //
      // This used to persist the preset and then swallow any bridge
      // failure, so a rejected `hwdec` write still left the UI
      // showing the new preset while mpv kept running the old one: a
      // control that lies about the state of the player. Persisting
      // only after the bridge accepts means the stored preset always
      // reflects what mpv was actually told.
      try {
        commands.setProperty('hwdec', hwdec);
        commands.setProperty('profile', profile);
      } catch (e) {
        if (__DEV__) {
          console.warn(
            `[VideoMoreSheet] quality preset '${preset}' rejected by the bridge; stored preset unchanged.`,
            e,
          );
        }
        return;
      }
      setQualityPreset(preset);
      onAction('setQuality');
    },
    [setQualityPreset, commands, onAction],
  );

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

  const skipSilence = useSkipSilence();

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
      setExpanded(null);
    },
    [commands, onAction],
  );

  const handleSleep = React.useCallback(
    (minutes: number) => {
      setSleepMinutes(minutes);
      onAction('setSleep');
      setExpanded(null);
    },
    [setSleepMinutes, onAction],
  );

  const handleLegacy = React.useCallback(
    (action: LegacyMoreAction) => {
      switch (action) {
        case 'share':
          // W7.4 fix: this hardcoded `route: 'SongScreen'` — an AUDIO
          // route — from a VIDEO player's share action, so sharing a
          // movie deep-linked the receiver into the audio song screen.
          //
          // `NowPlaying` is the correct target: it is lane-agnostic
          // (both lanes render the same player) and it takes the
          // `fileUri` / `fileTitle` path tokens that
          // `src/navigation/linking.ts` declares for it.
          //
          // Guarded on `currentUri`, not `title`: a URI is what the
          // route actually needs, and a file can legitimately have no
          // title while still being shareable. Sharing nothing because
          // the metadata is thin would be a silent no-op.
          if (currentUri) {
            shareContent({
              route: 'NowPlaying',
              params: {
                fileUri: currentUri,
                fileTitle: title || undefined,
              },
              title: title || 'Untitled',
              subtitle: artist || undefined,
            }).catch(() => {
              // Cancelled by the user, or no share target installed.
              // Neither is an error worth surfacing from a menu row.
            });
          } else {
            toast.show('Nothing to share', 'info');
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
    [onAction, title, artist, currentUri, toast, handleSave, handleAddToPlaylist, showTrackInfo],
  );

  /**
   * Drag-to-dismiss. Wired to the HEADER only, never to the body — a
   * responder on the body would fight the `ScrollView`'s own pan and
   * the sheet would become impossible to scroll. The header is a fixed,
   * non-scrolling strip, so taking the gesture there costs nothing.
   */
  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g: PanResponderGestureState) =>
          g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderRelease: (
          _e,
          g: PanResponderGestureState,
        ) => {
          if (g.dy > DISMISS_DRAG_PX || g.vy > DISMISS_VELOCITY) {
            handleClose();
          }
        },
      }),
    [handleClose],
  );

  const currentSpeed = state.speed ?? 1;
  const speedLabel =
    SPEED_OPTIONS.find(o => approxEqual(o.value, currentSpeed))?.label ??
    `${currentSpeed}×`;
  const qualityLabel =
    VIDEO_QUALITY_PRESETS.find(o => o.value === qualityPreset)?.label ??
    'Balanced';
  const qualityDescription =
    VIDEO_QUALITY_PRESETS.find(o => o.value === qualityPreset)?.description ??
    '';
  const sleepLabel =
    SLEEP_TIMER_OPTIONS.find(o => o.value === sleepMinutes)?.label ??
    (sleepMinutes > 0 ? `${sleepMinutes} min` : 'Off');

  return (
    <Modal
      visible={visible}
      // `fade`, not `slide`: the sheet is a panel over a still-playing
      // film. A slide-up implies the video is being covered by a new
      // page; a cross-fade says a layer arrived over the top.
      animationType="fade"
      transparent
      onRequestClose={handleClose}
      accessibilityViewIsModal
    >
      <View style={styles.root}>
        {/* ── Backdrop: NOW PRESSABLE ───────────────────────────────
            It was a plain `View`, so tapping outside did nothing and
            the only exit was a Close button scrolled off-screen. */}
        <Pressable
          testID="more-backdrop"
          style={[styles.backdrop, {backgroundColor: colors.background.scrim}]}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close more menu"
          accessibilityHint="Dismisses this panel"
        />

        <View
          testID="more-sheet"
          style={[
            styles.sheet,
            {
              maxHeight: SHEET_MAX_HEIGHT,
              backgroundColor: colors.background.surfaceDark,
            },
          ]}
        >
          {/* ── Pinned header ───────────────────────────────────────
              Outside the ScrollView, so the close control can never
              scroll out of reach. Drag it to dismiss. */}
          <View style={styles.header} {...panResponder.panHandlers}>
            <View
              style={[styles.handle, {backgroundColor: colors.border.emphasis}]}
            />
            <View style={styles.titleRow}>
              <AppText
                variant="h3"
                color={colors.text.inverse}
                style={styles.sheetTitle}
              >
                More
              </AppText>
              <PlayerControl
                testID="more-close"
                icon="close"
                iconSize={CONTROL_ICON_SIZE}
                onPress={handleClose}
                accessibilityLabel="Close more menu"
                accessibilityHint="Dismisses this panel"
                tint={colors.text.onMediaSoft}
              />
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── PLAYBACK ─────────────────────────────────────────── */}
            <SectionHeader>Playback</SectionHeader>

            <ValueRow
              testID="speed-row"
              label="Speed"
              value={speedLabel}
              expanded={expanded === 'speed'}
              onToggle={() => toggleRow('speed')}
              options={SPEED_OPTIONS.map(o => ({
                key: String(o.value),
                label: o.label,
                active: approxEqual(o.value, currentSpeed),
                onPress: () => handleSpeed(o.value),
              }))}
            />

            <ValueRow
              testID="quality-row"
              label="Quality"
              value={qualityLabel}
              description={qualityDescription}
              expanded={expanded === 'quality'}
              onToggle={() => toggleRow('quality')}
              options={VIDEO_QUALITY_PRESETS.map(o => ({
                key: o.value,
                label: o.label,
                active: o.value === qualityPreset,
                onPress: () => {
                  applyQuality(o.value);
                  setExpanded(null);
                },
              }))}
            />

            {/* W7.4: was two chips, "Off" and "On", and BOTH called
                `skipSilence.toggle()` — so tapping the chip labelled
                "Off" while already off turned it ON. One row that sets
                an explicit boolean removes the possibility. */}
            <ToggleRow
              testID="skip-silence-row"
              label="Skip silence"
              description={
                skipSilence.enabled
                  ? 'Silence is detected and skipped.'
                  : 'Plays silence as-is.'
              }
              value={skipSilence.enabled}
              onPress={() => skipSilence.toggle()}
            />

            <ToggleRow
              testID="auto-play-next-row"
              label="Auto-play next"
              description={
                autoPlayNextEnabled
                  ? 'The Up-next countdown plays automatically.'
                  : 'Up next waits for Cancel or Play now.'
              }
              value={autoPlayNextEnabled}
              onPress={() => setAutoPlayNextEnabled(!autoPlayNextEnabled)}
            />

            <ValueRow
              testID="sleep-row"
              label="Sleep timer"
              value={sleepLabel}
              expanded={expanded === 'sleep'}
              onToggle={() => toggleRow('sleep')}
              options={SLEEP_TIMER_OPTIONS.map(o => ({
                key: String(o.value),
                label: o.label,
                active: o.value === sleepMinutes,
                onPress: () => handleSleep(o.value),
              }))}
            />

            {/* ── LIBRARY ──────────────────────────────────────────── */}
            <SectionHeader>Library</SectionHeader>

            <ActionRow
              label="Save"
              onPress={() => handleLegacy('save')}
              testID="legacy-save"
            />
            <ActionRow
              label="Add to playlist"
              onPress={() => handleLegacy('addToPlaylist')}
              testID="legacy-add-to-playlist"
            />
            <ActionRow
              label="Share"
              onPress={() => handleLegacy('share')}
              testID="legacy-share"
            />
            <ActionRow
              label="Track info"
              onPress={() => handleLegacy('trackInfo')}
              testID="legacy-track-info"
              isLast
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

function approxEqual(a: number, b: number, eps = 0.01): boolean {
  return Math.abs(a - b) < eps;
}

/* ─────────────────────────────────────────────────────────────────────────
 *                              INTERNAL PRIMITIVES
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * A small uppercase group label.
 *
 * Was `variant="h2"` display type, six times. Six display headers in a
 * settings panel makes it read as a document rather than a menu, and
 * each one ate a whole line of vertical space.
 */
const SectionHeader: React.FC<React.PropsWithChildren> = ({children}) => {
  const {colors} = useTheme();
  return (
    <AppText
      variant="overline"
      color={colors.text.onMediaMuted}
      style={styles.sectionHeader}
    >
      {children}
    </AppText>
  );
};

export interface SettingOption {
  key: string;
  label: string;
  active: boolean;
  onPress: () => void;
}

interface ValueRowProps {
  label: string;
  /** The current value, shown on the right so the state is never a guess. */
  value: string;
  description?: string;
  expanded: boolean;
  onToggle: () => void;
  options: ReadonlyArray<SettingOption>;
  testID?: string;
}

/**
 * A setting with a small fixed set of values: `label ......... value ›`,
 * revealing its options inline when tapped.
 *
 * The height of a setting is therefore INDEPENDENT of how many values
 * it has. That is the whole point — the old chip wall grew taller with
 * the number of speed options, which is what forced the sheet to 90%
 * of the screen.
 */
const ValueRow: React.FC<ValueRowProps> = ({
  label,
  value,
  description,
  expanded,
  onToggle,
  options,
  testID,
}) => {
  const {colors} = useTheme();
  return (
    <View style={styles.settingBlock}>
      <Pressable
        testID={testID}
        onPress={onToggle}
        style={({pressed}) => [styles.settingRow, pressed ? styles.pressed : null]}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value}`}
        accessibilityHint={expanded ? 'Hides the options' : 'Shows the options'}
        accessibilityState={{expanded}}
      >
        <AppText variant="body1" color={colors.text.inverse}>
          {label}
        </AppText>
        <View style={styles.settingValueGroup}>
          <AppText
            variant="body1"
            color={colors.accent.gold}
            style={styles.settingValue}
          >
            {value}
          </AppText>
          <SvgChevron open={expanded} color={colors.text.onMediaMuted} />
        </View>
      </Pressable>

      {description ? (
        <AppText
          variant="caption"
          color={colors.text.onMediaMuted}
          style={styles.settingDescription}
        >
          {description}
        </AppText>
      ) : null}

      {expanded ? (
        <View
          testID={testID ? `${testID}-options` : undefined}
          style={[
            styles.options,
            {backgroundColor: colors.background.onMediaPill},
          ]}
        >
          {options.map(opt => (
            <Pressable
              key={opt.key}
              testID={testID ? `${testID}-option-${opt.key}` : undefined}
              onPress={opt.onPress}
              style={({pressed}) => [
                styles.optionRow,
                pressed ? styles.pressed : null,
              ]}
              accessibilityRole="menuitem"
              accessibilityLabel={opt.label}
              accessibilityState={{selected: opt.active}}
            >
              <AppText
                variant="body1"
                color={opt.active ? colors.accent.gold : colors.text.onMediaSoft}
              >
                {opt.label}
              </AppText>
              {opt.active ? (
                <AppText
                  variant="body1"
                  color={colors.accent.gold}
                  style={styles.optionCheck}
                >
                  ✓
                </AppText>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
};

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onPress: () => void;
  testID?: string;
}

/**
 * A boolean setting: ONE row that sets an explicit value.
 *
 * The old two-chip form ("Skip silence: Off" / "Skip silence: On") had
 * a defect, not just a look: both chips called `toggle()`, so pressing
 * the chip that said "Off" while it was already off turned it on. An
 * explicit setter makes that state unrepresentable.
 */
const ToggleRow: React.FC<ToggleRowProps> = ({
  label,
  description,
  value,
  onPress,
  testID,
}) => {
  const {colors} = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({pressed}) => [
        styles.settingRow,
        styles.settingBlockRow,
        pressed ? styles.pressed : null,
      ]}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{checked: value}}
    >
      <AppText variant="body1" color={colors.text.inverse}>
        {label}
      </AppText>
      <View style={styles.settingValueGroup}>
        <AppText
          variant="body1"
          color={value ? colors.accent.gold : colors.text.onMediaMuted}
          style={styles.settingValue}
        >
          {value ? 'On' : 'Off'}
        </AppText>
        {/* The switch track is a second, non-colour channel for the
            state, so it does not rely on gold-vs-grey alone. */}
        <View
          style={[
            styles.switchTrack,
            {
              backgroundColor: value
                ? colors.accent.gold
                : colors.background.onMediaPillBorder,
            },
          ]}
        >
          <View
            style={[
              styles.switchThumb,
              {backgroundColor: colors.text.inverse},
              value ? styles.switchThumbOn : styles.switchThumbOff,
            ]}
          />
        </View>
      </View>
    </Pressable>
  );
};

interface ActionRowProps {
  label: string;
  onPress: () => void;
  testID?: string;
  isLast?: boolean;
}

/** A one-shot action — no value, no state, nothing to expand. */
const ActionRow: React.FC<ActionRowProps> = ({
  label,
  onPress,
  testID,
  isLast,
}) => {
  const {colors} = useTheme();
  return (
    <>
      <Pressable
        testID={testID}
        onPress={onPress}
        style={({pressed}) => [
          styles.settingRow,
          styles.settingBlockRow,
          pressed ? styles.pressed : null,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <AppText variant="body1" color={colors.text.inverse}>
          {label}
        </AppText>
        <SvgChevron open={false} color={colors.text.onMediaMuted} />
      </Pressable>
      {!isLast ? (
        <View
          style={[styles.listDivider, {backgroundColor: colors.border.emphasis}]}
        />
      ) : null}
    </>
  );
};

/**
 * Chevron affordance. Rotates to point UP when its row is expanded.
 *
 * This is a PLAIN GLYPH, deliberately not a `PlayerControl`. It was
 * first written as one with a no-op `onPress`, which is precisely the
 * defect this sheet exists to remove: a focusable, labelled, tappable
 * node that does nothing when tapped. A decorative indicator must not
 * be in the accessibility tree or the tap order at all — the ROW is
 * the control, and the chevron only reports its state.
 */
const SvgChevron: React.FC<{open: boolean; color: string}> = ({
  open,
  color,
}) => (
  <View pointerEvents="none" style={styles.chevron} accessibilityElementsHidden>
    <SvgIcon
      name={open ? 'chevronUp' : 'chevronDown'}
      size={18}
      color={color}
    />
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sheetTitle: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    letterSpacing: 1.2,
  },
  settingBlock: {
    marginBottom: spacing.xs,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // 52 px, above the 44 pt floor, because these are the sheet's
    // primary targets and they sit densely.
    minHeight: 52,
    paddingHorizontal: spacing.xs,
  },
  settingBlockRow: {
    paddingHorizontal: 0,
  },
  pressed: {
    opacity: 0.6,
  },
  settingValueGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingValue: {
    fontVariant: ['tabular-nums'],
  },
  settingDescription: {
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  options: {
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  optionCheck: {
    marginLeft: spacing.sm,
  },
  chevron: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchTrack: {
    width: 40,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    // The fill is `text.inverse` (the app's dark-ink token, #0A0A0C in
    // dark theme) — the correct pairing for a thumb sitting on the gold
    // track. It is applied inline in `ToggleRow` rather than here,
    // because these are module-scope styles and `colors` is only in
    // reach inside a component.
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  switchThumbOff: {
    alignSelf: 'flex-start',
  },
  listDivider: {
    height: StyleSheet.hairlineWidth,
  },
});

// re-export typed action enum so it shows in module exports at the path.
export type {VideoQualityPreset};
