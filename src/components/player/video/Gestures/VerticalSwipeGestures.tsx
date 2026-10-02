/**
 * V19 W3.5 Phases 3.5.3 + 3.5.4 + 3.5.5 (unified).
 *
 *   `VerticalSwipeGestures` — composite gesture orchestrator.
 *
 * Why one file for three SPEC phases:
 *   `react-native-gesture-handler` only allows ONE `GestureDetector`
 *   per View hierarchy. The V19 spec's "exclusive ordering:
 *   long-press > double-tap > single-tap > pan" requires composing
 *   all four gestures in a single `Gesture.Exclusive(...)` call.
 *   Splitting them across three sibling files would break the
 *   priority arbitration. So W3.5.3 (vertical swipe — brightness +
 *   volume), W3.5.4 (double-tap — ±10s), and W3.5.5 (long-press —
 *   2× preview) live together here.
 *
 *   The TRACKER §3.5.3 / §3.5.4 / §3.5.5 boxes all reference this
 *   file. Visual indicators (VolumeIndicator, BrightnessIndicator,
 *   LongPressSpeedBadge, DoubleTapRipple) live as private components
 *   inside this file — small enough that splitting them would
 *   add ceremony without clarity.
 *
 * Inputs (mapped to mpv via `useTransport()` + `useChromeAutoHide()`):
 *   - Vertical pan, left half of frame  → brightness 0..1
 *                                         (`commands.setScreenBrightness`,
 *                                          + indicator pill)
 *   - Vertical pan, right half of frame → volume 0..100
 *                                         (`commands.setVolume`,
 *                                          + indicator pill)
 *   - Vertical pan, middle third         → no-op (currently; the
 *                                            middle is mapped to
 *                                            the closer side within
 *                                            ±33% of the half-line,
 *                                            i.e. left|right split
 *                                            on the CENTERLINE not
 *                                            thirds — matches
 *                                            YouTube / Netflix UX)
 *   - Double-tap, left half              → seek -10s  (`commands.seekBy`)
 *                                           + ripple
 *   - Double-tap, right half             → seek +10s  (`commands.seekBy`)
 *                                           + ripple
 *   - Long-press (500ms)                 → playback rate = 2×
 *                                           (`commands.setSpeed(2)`)
 *                                           + 2× badge; release restores
 *   - Single tap (delayed ~280ms while
 *     waiting for potential double-tap)  → toggle chrome visibility
 *                                           (`useChromeAutoHide.toggle()`)
 *
 * Pip / not-pip gating:
 *   When `presentation === 'pip'`, none of the gestures fire
 *   (PiP has no chrome to interact with). Verified by test.
 *
 * Ordering (per SPEC):
 *   `Gesture.Exclusive(longPress, doubleTap, pan, singleTap)` —
 *   priority: long-press > double-tap > pan > single-tap.
 *
 * Auto-hide wiring:
 *   Each gesture handler calls `useChromeAutoHide().kick()` so
 *   the chrome re-shows for 3s after any interaction, matching
 *   the W3.5.1 contract.
 *
 * Architecture source of truth: `md/SIMBA_PLAYER_V19_ARCHITECTURE_AUDIT.md`
 * §4.D (chrome composition) + `md/SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md`
 * §3.9, §3.11, §3.12.
 */

import * as React from 'react';
import {Animated, Dimensions, StyleSheet, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {useTheme} from '../../../../theme';
import {spacing, radius} from '../../../../theme/tokens';
import {AppText} from '../../../../components/core/AppText/AppText';
import {
  useChromeAutoHide,
  usePresentation,
  useReduceMotion,
  useTransport,
} from '../../../../infrastructure/player';

const DOUBLE_TAP_MAX_DELAY_MS = 280;
const LONG_PRESS_MIN_MS = 500;
const PAN_ACTIVE_OFFSET_PX = 10;
const PAN_FAIL_OFFSET_X_PX = 18;
const INDICATOR_TIMEOUT_MS = 600;
const RIPPLE_FADE_MS = 300;
const SKIP_STEP_MS = 10_000;

/** A gesture event the orchestrator fires to a test consumer. */
export type GestureEventKind =
  | 'singleTap'
  | 'rewind10'
  | 'forward10'
  | 'longPress2x';

export const VerticalSwipeGestures: React.FC<{
  /** Optional test seam. Called once per gesture event. */
  onGesture?: (kind: GestureEventKind) => void;
}> = ({onGesture}) => {
  const {colors} = useTheme();
  const {state, commands} = useTransport();
  const {toggle, kick} = useChromeAutoHide();
  const presentation = usePresentation();
  // V19 W3.6.8 — system "reduce motion" preference; collapses the
  // indicator fade durations to 0 ms when the user has enabled
  // the accessibility flag in their OS.
  const reduceMotion = useReduceMotion();

  // Seeded from the window rather than 0.
  //
  // The probe below is `StyleSheet.absoluteFill`, so `onLayout` will
  // report the window size — but only AFTER the first commit. Until it
  // does, `width === 0` makes `isLeft = x < width / 2` evaluate to
  // `false` for every x, so a pan on the LEFT half would drive VOLUME,
  // and `height === 0` collapses `normDelta` to 0, so the drag would
  // apply no change at all. Seeding removes that one-frame window in
  // which the left/right split is simply wrong.
  const windowFrame = React.useMemo(() => Dimensions.get('window'), []);
  const [width, setWidth] = React.useState(windowFrame.width);
  const [height, setHeight] = React.useState(windowFrame.height);
  const [brightnessValue, setBrightnessValue] = React.useState<number>(
    // Lazy init reads the lib synchronously on mount. The bridge
    // is reachable by the time React calls useState (the lib's
    // <PlayerProvider> wraps this component via App.tsx). Fallback
    // `0.5` covers jest / web preview where the bridge isn't wired.
    () => {
      try {
        const v = commands.getScreenBrightness();
        return Number.isFinite(v) ? clamp01(v) : 0.5;
      } catch {
        return 0.5;
      }
    },
  );
  const [volumeValue, setVolumeValue] = React.useState<number>(
    () => clamp100(state.volume ?? 100),
  );
  const [brightnessVisible, setBrightnessVisible] = React.useState(false);
  const [volumeVisible, setVolumeVisible] = React.useState(false);
  const [longPressActive, setLongPressActive] = React.useState(false);
  const [doubleTapRipple, setDoubleTapRipple] =
    React.useState<{side: 'left' | 'right'; key: number} | null>(null);

  const brightnessTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const volumeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Pan start values captured at gesture-begun time (RNGH
  // releases `onBegin` after the activeOffset is exceeded).
  const panStartBrightnessRef = React.useRef<number>(brightnessValue);
  const panStartVolumeRef = React.useRef<number>(volumeValue);

  // For long-press restoration.
  const previousSpeedBeforeLongPressRef = React.useRef<number | null>(null);

  // Keep volume mirror synced with the lib (e.g. system volume
  // changes via hardware buttons should still reflect when the
  // user opens the indicator again). Brightness doesn't need this
  // sync — the lib's `getScreenBrightness()` is the source of truth
  // and the chrome only writes through `setScreenBrightness`.
  React.useEffect(() => {
    setVolumeValue(clamp100(state.volume));
  }, [state.volume]);

  // Clear pending timers on unmount.
  React.useEffect(() => {
    return () => {
      if (brightnessTimerRef.current) {
        clearTimeout(brightnessTimerRef.current);
        brightnessTimerRef.current = null;
      }
      if (volumeTimerRef.current) {
        clearTimeout(volumeTimerRef.current);
        volumeTimerRef.current = null;
      }
    };
  }, []);

  const isPip = presentation.mode === 'pip';

  const armBrightnessTimer = React.useCallback(() => {
    if (brightnessTimerRef.current) clearTimeout(brightnessTimerRef.current);
    brightnessTimerRef.current = setTimeout(() => {
      setBrightnessVisible(false);
      brightnessTimerRef.current = null;
    }, INDICATOR_TIMEOUT_MS);
  }, []);

  const armVolumeTimer = React.useCallback(() => {
    if (volumeTimerRef.current) clearTimeout(volumeTimerRef.current);
    volumeTimerRef.current = setTimeout(() => {
      setVolumeVisible(false);
      volumeTimerRef.current = null;
    }, INDICATOR_TIMEOUT_MS);
  }, []);

  const dismissRipple = React.useCallback(() => {
    setDoubleTapRipple(null);
  }, []);

  /* ─── Gesture handlers ─────────────────────────────────────────────── */

  // Every gesture below sets `.runOnJS(true)`.
  //
  // WHY (this is not optional, and removing it silently breaks every
  // gesture in this file):
  //
  //   The Worklets Babel plugin — required by Reanimated 4 — AUTOMATICALLY
  //   workletizes callbacks that are passed INLINE in a gesture
  //   configuration chain. `Gesture.Pan().onUpdate(e => …)` is exactly
  //   that shape, so each handler below was being compiled into a worklet
  //   and executed on the **UI runtime**. The RNGH typings say it
  //   outright: "the callbacks passed to the gestures are automatically
  //   workletized and run on the UI thread when called."
  //
  //   Nothing in these handlers is UI-runtime work. They call the mpv
  //   bridge (`commands.setVolume` / `setScreenBrightness` / `seekBy` /
  //   `setSpeed`), React state setters for the indicator pills, ripple and
  //   badge, `setTimeout` timers, and the test seam. All of those are
  //   JS-thread objects, and calling one from a worklet throws:
  //
  //     Uncaught Error: [Worklets] Tried to synchronously call a Remote
  //     Function. Called "setSpeed" on the UI Runtime.
  //
  //   which aborts the handler mid-gesture — so brightness/volume swipe,
  //   double-tap ±10s, long-press 2× and the single-tap chrome toggle were
  //   all throwing instead of working.
  //
  // WHY `.runOnJS(true)` RATHER THAN WRAPPING CALLS IN `scheduleOnRN`:
  //
  //   `pan.onUpdate` drives mpv on EVERY frame of the drag. Routing that
  //   through the UI→JS bridge per frame would be strictly slower than
  //   running the whole handler on the JS thread, and it would still leave
  //   a React re-render per frame for the indicator. `.runOnJS(true)` is
  //   RNGH's documented switch for "these callbacks are JS-thread work",
  //   and it keeps the per-frame path exactly as cheap as it already was.

  // PAN — vertical only, brightness (left half) or volume (right half).
  const pan = React.useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-PAN_ACTIVE_OFFSET_PX, PAN_ACTIVE_OFFSET_PX])
        .failOffsetX([-PAN_FAIL_OFFSET_X_PX, PAN_FAIL_OFFSET_X_PX])
        .enabled(!isPip)
        .runOnJS(true)
        .onBegin(_e => {
          panStartBrightnessRef.current = brightnessValue;
          panStartVolumeRef.current = volumeValue;
        })
        .onUpdate(e => {
          const x = (e as {x: number}).x;
          const translationY = (e as {translationY: number}).translationY;
          const isLeft = x < width / 2;
          // Map the gesture's vertical travel into a [0, 1]
          // fraction of the visible axis (`height`). A swipe the
          // full height of the frame = 100% change. We invert
          // because Android convention: drag up = increase.
          const normDelta =
            height > 0 ? -translationY / height : 0;
          if (isLeft) {
            const next = panStartBrightnessRef.current + normDelta;
            const clamped = clamp01(next);
            setBrightnessValue(clamped);
            commands.setScreenBrightness(clamped);
            setBrightnessVisible(true);
            armBrightnessTimer();
          } else {
            const next = panStartVolumeRef.current + normDelta * 100;
            const clamped = clamp100(next);
            setVolumeValue(clamped);
            commands.setVolume(clamped);
            setVolumeVisible(true);
            armVolumeTimer();
          }
        })
        .onFinalize(() => {
          kick();
        }),
    [
      isPip,
      width,
      height,
      commands,
      brightnessValue,
      volumeValue,
      kick,
      armBrightnessTimer,
      armVolumeTimer,
    ],
  );

  // DOUBLE-TAP — seek ±10s with a ripple.
  const doubleTap = React.useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .maxDelay(DOUBLE_TAP_MAX_DELAY_MS)
        .maxDuration(250)
        .enabled(!isPip)
        .runOnJS(true)
        .onEnd(e => {
          const x = (e as {x: number}).x;
          const isLeft = x < width / 2;
          if (isLeft) {
            commands.seekBy(-SKIP_STEP_MS);
            onGesture?.('rewind10');
          } else {
            commands.seekBy(SKIP_STEP_MS);
            onGesture?.('forward10');
          }
          setDoubleTapRipple({
            side: isLeft ? 'left' : 'right',
            key: Date.now(),
          });
          kick();
        }),
    [isPip, width, commands, kick, onGesture],
  );

  // LONG-PRESS — rate = 2× while held, restore on release.
  const longPress = React.useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(LONG_PRESS_MIN_MS)
        .enabled(!isPip)
        .runOnJS(true)
        .onStart(() => {
          previousSpeedBeforeLongPressRef.current = state.speed;
          commands.setSpeed(2);
          setLongPressActive(true);
          kick();
          onGesture?.('longPress2x');
        })
        .onFinalize(() => {
          const restore = previousSpeedBeforeLongPressRef.current ?? 1;
          previousSpeedBeforeLongPressRef.current = null;
          commands.setSpeed(restore);
          setLongPressActive(false);
        }),
    [isPip, commands, kick, onGesture, state.speed],
  );

  // SINGLE-TAP — toggle chrome. The `Gesture.Exclusive(longPress,
  // doubleTap, pan, singleTap)` ordering ensures singleTap only
  // fires after `doubleTap`'s maxDelay passes without a second tap.
  const singleTap = React.useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(1)
        .maxDuration(250)
        .enabled(!isPip)
        .runOnJS(true)
        .onEnd(() => {
          toggle();
          onGesture?.('singleTap');
        }),
    [isPip, toggle, onGesture],
  );

  const composed = React.useMemo(
    () => Gesture.Exclusive(longPress, doubleTap, pan, singleTap),
    [longPress, doubleTap, pan, singleTap],
  );

  /* ─── Render ───────────────────────────────────────────────────────── */

  return (
    <>
      {/* Geometry probe — pointerEvents="box-none" so it never
          blocks the GestureDetector. We use onLayout for the
          `width` + `height` state above to compute "left half" /
          "right half" boundaries. */}
      <View
        style={StyleSheet.absoluteFill}
        onLayout={e => {
          setWidth(e.nativeEvent.layout.width);
          setHeight(e.nativeEvent.layout.height);
        }}
        pointerEvents="box-none"
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        <GestureDetector gesture={composed}>
          <View style={styles.gestureSurface} collapsable={false} />
        </GestureDetector>
      </View>

      {/* Indicator overlays — `pointerEvents="none"` so they don't
          intercept their own gestures. `reduceMotion` collapses
          the fade to 0 ms when the user has the OS-level reduce-
          motion accessibility flag on (WCAG 2.3.3). */}
      <BrightnessIndicator
        visible={brightnessVisible}
        value={brightnessValue}
        reduceMotion={reduceMotion}
      />
      <VolumeIndicator
        visible={volumeVisible}
        value={volumeValue}
        reduceMotion={reduceMotion}
      />
      <LongPressSpeedBadge
        visible={longPressActive}
        reduceMotion={reduceMotion}
      />
      {doubleTapRipple && (
        <DoubleTapRipple
          key={doubleTapRipple.key}
          side={doubleTapRipple.side}
          colors={colors}
          onDone={dismissRipple}
        />
      )}
    </>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
 *                              VISUAL PRIMITIVES
 * ──────────────────────────────────────────────────────────────────────── */

const useFadingOpacity = (
  visible: boolean,
  reduceMotion: boolean,
  inMs = 100,
  outMs = 200,
) => {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const fadeIn = reduceMotion ? 0 : inMs;
  const fadeOut = reduceMotion ? 0 : outMs;
  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: visible ? fadeIn : fadeOut,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity, fadeIn, fadeOut]);
  return opacity;
};

/** Pill showing the current OS screen brightness (0..1, displayed %). */
const BrightnessIndicator: React.FC<{visible: boolean; value: number; reduceMotion: boolean}> = ({
  visible,
  value,
  reduceMotion,
}) => {
  const opacity = useFadingOpacity(visible, reduceMotion);
  const {colors} = useTheme();
  const percent = Math.round(clamp01(value) * 100);
  return (
    <Animated.View
      style={[
        styles.indicator,
        styles.indicatorLeft,
        {opacity, backgroundColor: colors.background.floating},
      ]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no"
      testID="brightness-indicator"
    >
      {/* `text.inverse` (NOT the on-media pair) because this pill
          carries its own fill — `background.floating`, which is a
          LIGHT parchment in light theme and a dark scrim in dark
          theme. The inverse ink flips with it, so the pairing holds
          in both. The on-media tokens are only correct for text
          painted straight onto the video. */}
      <AppText variant="overline" color="inverse">
        ☀ {percent}%
      </AppText>
    </Animated.View>
  );
};

/** Pill showing the current mpv volume (0..100, displayed %). */
const VolumeIndicator: React.FC<{visible: boolean; value: number; reduceMotion: boolean}> = ({
  visible,
  value,
  reduceMotion,
}) => {
  const opacity = useFadingOpacity(visible, reduceMotion);
  const {colors} = useTheme();
  const percent = Math.round(clamp100(value));
  return (
    <Animated.View
      style={[
        styles.indicator,
        styles.indicatorRight,
        {opacity, backgroundColor: colors.background.floating},
      ]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no"
      testID="volume-indicator"
    >
      {/* Same fill + inverse-ink pairing as `BrightnessIndicator`. */}
      <AppText variant="overline" color="inverse">
        ♪ {percent}%
      </AppText>
    </Animated.View>
  );
};

/** Top-center "2×" badge shown while the user holds the long-press. */
const LongPressSpeedBadge: React.FC<{visible: boolean; reduceMotion: boolean}> = ({visible, reduceMotion}) => {
  const opacity = useFadingOpacity(visible, reduceMotion, 100, 150);
  // Unlike the two pills above, `styles.speedBadge` has NO fill — the
  // "2×" is painted straight onto the video, which is a dark surface
  // in BOTH themes. `text.inverse` (near-black in both) therefore made
  // the badge invisible in light AND dark; the on-media pair is what
  // this surface needs.
  const {colors} = useTheme();
  return (
    <Animated.View
      style={[styles.speedBadge, {opacity}]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no"
      testID="speed-preview-badge"
    >
      <AppText variant="h3" color={colors.text.onMediaSoft}>
        2×
      </AppText>
    </Animated.View>
  );
};

/** Gold ripple at the tap location. Fades out on its own. */
const DoubleTapRipple: React.FC<{
  side: 'left' | 'right';
  colors: ReturnType<typeof useTheme>['colors'];
  onDone: () => void;
}> = ({side, colors, onDone}) => {
  const opacity = React.useRef(new Animated.Value(0.85)).current;
  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: RIPPLE_FADE_MS,
      useNativeDriver: true,
    }).start(({finished}) => {
      if (finished) onDone();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no"
      testID={`double-tap-ripple-${side}`}
      style={[
        styles.ripple,
        side === 'left' ? styles.rippleLeft : styles.rippleRight,
        {backgroundColor: colors.accent.gold, opacity},
      ]}
    />
  );
};

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0.5;
  return Math.max(0, Math.min(1, v));
}
function clamp100(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

const styles = StyleSheet.create({
  gestureSurface: {
    flex: 1,
  },
  indicator: {
    position: 'absolute',
    top: '40%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  indicatorLeft: {left: spacing.lg},
  indicatorRight: {right: spacing.lg},
  speedBadge: {
    position: 'absolute',
    top: spacing.xl,
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  ripple: {
    position: 'absolute',
    top: '40%',
    width: 96,
    height: 96,
    borderRadius: 48,
    opacity: 0.85,
  },
  rippleLeft: {left: spacing.lg},
  rippleRight: {right: spacing.lg},
});

export default VerticalSwipeGestures;
