// ─── W2.9 / W2.10 — Video surface gestures ────────────────────
//
// Single-tap chrome toggle stays in VideoControlLayer (`frameTapTarget`
// Pressable). This component sits on top of the native surface (and
// below the chrome) to capture double-tap seek and vertical pan
// volume / brightness. The gestures use react-native-gesture-handler's
// `GestureDetector` with `Gesture.Race` so a fast double-tap wins
// over a pan and a pan wins over a stray single tap.
//
//   • Double-tap on the left half  → seek -10 s
//   • Double-tap on the right half → seek +10 s
//   • Vertical pan on the left half  → adjust brightness (0..1)
//   • Vertical pan on the right half → adjust volume (0..100)
//
// A small HUD at the top of the surface briefly shows the new
// volume / brightness / seek-delta so the user gets feedback.

import React, {useCallback, useRef, useState} from 'react';
import {StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {runOnJS} from 'react-native-reanimated';
import {darkColors as cinemaColors} from '../../../../theme/tokens';
import {VideoNativeSurface} from '../surface/VideoNativeSurface';
import {ScreenBrightness, MpvPlayer} from '../../../../native/player.api';

export interface VideoSurfaceGesturesProps {
  readonly nativePtr: number;
  readonly sessionDuration: number | null;
  readonly sessionPosition: number;
  readonly isSeekable: boolean;
  readonly onSeek: (position: number) => void;
  readonly onSetVolume: (volume: number) => void;
  readonly style?: StyleProp<ViewStyle>;
}

type HudKind = 'volume' | 'brightness' | 'seek';

interface HudState {
  kind: HudKind;
  value: number; // 0..1 for vol / brightness, 0..1 (frac of 60s) for seek
  label: string;
}

const HUD_TIMEOUT_MS = 1100;
const VOLUME_STEP_PCT = 1.0; // per 1% of the gesture
const BRIGHTNESS_STEP = 0.02; // per 2% of the gesture

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function VideoSurfaceGestures({
  nativePtr,
  sessionDuration,
  sessionPosition,
  isSeekable,
  onSeek,
  onSetVolume,
  style,
}: VideoSurfaceGesturesProps) {
  const [hud, setHud] = useState<HudState | null>(null);
  const hudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Width is measured once on layout; used to split the surface into
  // left/right halves for seek + vol/brightness gestures.
  const widthRef = useRef<number>(0);

  const showHud = useCallback((next: HudState) => {
    setHud(next);
    if (hudTimerRef.current !== null) {
      clearTimeout(hudTimerRef.current);
    }
    hudTimerRef.current = setTimeout(() => {
      setHud(null);
      hudTimerRef.current = null;
    }, HUD_TIMEOUT_MS);
  }, []);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    widthRef.current = event.nativeEvent.layout.width;
  }, []);

  // ── JS callbacks invoked from worklets via runOnJS ──
  const seekBy = useCallback(
    (deltaSeconds: number) => {
      if (!isSeekable || sessionDuration === null || sessionDuration <= 0) return;
      const next = clamp(sessionPosition + deltaSeconds, 0, sessionDuration);
      onSeek(next);
      const label = deltaSeconds >= 0 ? `+${deltaSeconds}s` : `${deltaSeconds}s`;
      showHud({kind: 'seek', value: Math.min(1, Math.abs(deltaSeconds) / 60), label});
    },
    [isSeekable, sessionDuration, sessionPosition, onSeek, showHud],
  );

  const adjustVolume = useCallback(
    (startVolume: number, deltaPct: number) => {
      const next = clamp(startVolume + deltaPct, 0, 100);
      onSetVolume(next);
      showHud({kind: 'volume', value: next / 100, label: `${Math.round(next)}%`});
    },
    [onSetVolume, showHud],
  );

  const adjustBrightness = useCallback(
    (startBrightness: number, delta: number) => {
      const next = clamp(startBrightness + delta, 0, 1);
      ScreenBrightness.setBrightness(next);
      showHud({kind: 'brightness', value: next, label: `${Math.round(next * 100)}%`});
    },
    [showHud],
  );

  // ── Double-tap seek (worklet) ──
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(280)
    .onEnd(event => {
      'worklet';
      const width = widthRef.current;
      if (width <= 0) return;
      const goingRight = (event.x ?? 0) > width / 2;
      runOnJS(seekBy)(goingRight ? 10 : -10);
    });

  // ── Vertical pan: brightness (left) / volume (right) (worklet) ──
  // Snapshots of the start values are taken on `onBegin` and reused
  // for the duration of the gesture so the drag is incremental from
  // the user's current level, not from a stale state.
  const startBrightnessRef = useRef<number>(0);
  const startVolumeRef = useRef<number>(0);
  const isLeftRef = useRef<boolean>(false);

  const pan = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .failOffsetX([-30, 30])
    .onBegin(event => {
      'worklet';
      const width = widthRef.current;
      if (width <= 0) return;
      isLeftRef.current = (event.x ?? 0) < width / 2;
      if (isLeftRef.current) {
        startBrightnessRef.current = ScreenBrightness.getBrightness();
      } else {
        startVolumeRef.current = Number(MpvPlayer.getVolume?.() ?? 0);
      }
    })
    .onUpdate(event => {
      'worklet';
      const width = widthRef.current;
      if (width <= 0) return;
      const dragUnits = (event.translationY ?? 0) / 100;
      if (isLeftRef.current) {
        runOnJS(adjustBrightness)(startBrightnessRef.current, -dragUnits * BRIGHTNESS_STEP);
      } else {
        runOnJS(adjustVolume)(startVolumeRef.current, -dragUnits * VOLUME_STEP_PCT);
      }
    })
    .onEnd(() => {
      'worklet';
      startBrightnessRef.current = 0;
      startVolumeRef.current = 0;
    });

  // Race: double-tap wins over pan.
  const composed = Gesture.Race(doubleTap, pan);

  return (
    <View style={[styles.wrapper, style]} onLayout={onLayout} pointerEvents="box-none">
      <VideoNativeSurface nativePtr={nativePtr} />
      <GestureDetector gesture={composed}>
        <View style={styles.gestureLayer} />
      </GestureDetector>
      {hud ? (
        <View pointerEvents="none" style={styles.hudWrap}>
          <View style={styles.hud}>
            <Text style={styles.hudLabel}>
              {hud.kind === 'volume' ? 'Volume' : hud.kind === 'brightness' ? 'Brightness' : 'Seek'} · {hud.label}
            </Text>
            <View style={styles.hudTrack}>
              <View
                style={[
                  styles.hudFill,
                  {width: `${Math.round(hud.value * 100)}%`},
                ]}
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFill,
  },
  gestureLayer: {
    ...StyleSheet.absoluteFill,
  },
  hudWrap: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hud: {
    minWidth: 180,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    borderColor: cinemaColors.accent.gold,
    borderWidth: StyleSheet.hairlineWidth,
  },
  hudLabel: {
    color: cinemaColors.text.bright,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
    textAlign: 'center',
  },
  hudTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    overflow: 'hidden',
  },
  hudFill: {
    height: 4,
    backgroundColor: cinemaColors.accent.gold,
  },
});
