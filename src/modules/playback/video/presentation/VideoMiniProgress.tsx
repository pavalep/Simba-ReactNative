import React, {useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {darkColors as cinemaColors} from '../../../../theme/tokens';
import type {VideoSessionSnapshot} from '../domain/VideoTypes';

/**
 * v11 T7.2 \u2014 2 px hairline progress for the mini player.
 *
 * The full-chrome rail (`VideoProgressRail`) is 30+ px tall
 * (4 px track + 12 px thumb + tooltip + chapter markers). That's
 * a lot of vertical real estate in the mini. The mini's spec is
 * a 2 px hairline \u2014 a non-interactive thin line so the user
 * gets position feedback without the mini looking like a chunky
 * bar. No thumb, no tooltip, no markers, no tap target.
 *
 * Like `VideoProgressRail`, the mini progress throttles its
 * re-renders to \u2264 1 Hz. The session's 750 ms poll produces ~1.3
 * Hz render triggers; this hook coalesces them. The mini's
 * scrub interaction is not supported \u2014 the full chrome owns
 * seeking; the mini is a glanceable surface.
 */
export interface VideoMiniProgressProps {
  readonly session: VideoSessionSnapshot;
  readonly testID?: string;
}

const HAIRLINE_THROTTLE_MS = 1000;
const HAIRLINE_HEIGHT = 2;

function clampFraction(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function VideoMiniProgress({session, testID}: VideoMiniProgressProps) {
  const [displayedPosition, setDisplayedPosition] = useState<number>(session.position);
  const lastDisplayedAt = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    if (now - lastDisplayedAt.current >= HAIRLINE_THROTTLE_MS) {
      setDisplayedPosition(session.position);
      lastDisplayedAt.current = now;
    }
  }, [session.position]);

  const duration = session.duration;
  const fraction =
    duration !== null && duration > 0
      ? clampFraction(displayedPosition / duration)
      : 0;

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel="Video position"
      accessibilityValue={{
        min: 0,
        max: duration ?? 0,
        now: displayedPosition,
      }}
      style={styles.track}
    >
      <View
        testID={testID ? `${testID}:played` : undefined}
        style={[styles.played, {width: `${fraction * 100}%`}]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    height: HAIRLINE_HEIGHT,
    backgroundColor: cinemaColors.text.tertiary,
    borderRadius: HAIRLINE_HEIGHT / 2,
    overflow: 'hidden',
  },
  played: {
    height: HAIRLINE_HEIGHT,
    backgroundColor: cinemaColors.accent.gold,
  },
});
