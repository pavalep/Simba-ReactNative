/**
 * Audio seek bar — audio's own, purpose-built.
 *
 * ## Why this is not the video scrubber
 *
 * The video bar is entangled with things audio does not have: keyframe
 * thumbnails (`ScrubPreview`), chapter markers, buffered-range fills and
 * the PiP chrome. Reusing it here would mean half the props are
 * permanent no-ops for audio, which is the exact shape of a control that
 * looks real and does nothing.
 *
 * What audio actually needs is the plain one every shipping player
 * ships (Spotify, YouTube Music, Apple Music, Plex, Jellyfin): a track,
 * a filled portion, a thumb, and a drag that commits on release.
 *
 * ## The rule this control exists to enforce
 *
 * A live radio stream has `durationMs === 0` forever. There is no
 * position to seek TO, so the bar renders disabled at 0% and says so —
 * it does not animate, does not accept a drag, and does not pretend. A
 * seek bar that moves but cannot seek is the single most common fake
 * control in a media app.
 */

import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  GestureResponderEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useTheme} from '../../../../theme';
import {formatMsAsClock} from '../../../../infrastructure/player/useTransport';

/** Minimum drag height. 44 is the repo's floor (CONTROL_TARGET) and the
 *  smallest target that still meets the 44pt iOS / 48dp Android guidance
 *  for a control this easy to miss. */
const TRACK_HEIGHT = 44;
const BAR_HEIGHT = 4;
const THUMB_SIZE = 14;

export interface AudioSeekBarProps {
  /** Current playback position. */
  readonly positionMs: number;
  /** Total duration. 0 or negative means "unknown" — a live stream. */
  readonly durationMs: number;
  /** Whether the engine reports the position is seekable at all. */
  readonly seekable: boolean;
  /** Commit a seek. Called on release, not on every drag frame. */
  readonly onSeek: (positionMs: number) => void;
}

export const AudioSeekBar: React.FC<AudioSeekBarProps> = ({
  positionMs,
  durationMs,
  seekable,
  onSeek,
}) => {
  const {colors} = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragPositionMs, setDragPositionMs] = useState<number | null>(null);

  // Read inside the responder callbacks without re-creating them: these
  // handlers are attached once, and a stale `durationMs` closure would
  // clamp a drag against the length of the PREVIOUS track.
  const durationRef = useRef(durationMs);
  durationRef.current = durationMs;
  const widthRef = useRef(0);
  widthRef.current = trackWidth;

  const hasDuration = durationMs > 0;
  const enabled = hasDuration && seekable;

  const shownMs = dragPositionMs ?? positionMs;
  const ratio = useMemo(() => {
    if (!enabled || durationMs <= 0) return 0;
    return Math.max(0, Math.min(1, shownMs / durationMs));
  }, [enabled, durationMs, shownMs]);

  const positionToMs = useCallback((x: number) => {
    const width = widthRef.current;
    const duration = durationRef.current;
    if (width <= 0 || duration <= 0) return 0;
    return Math.max(0, Math.min(duration, (x / width) * duration));
  }, []);

  // While dragging, the label follows the thumb. On release the value is
  // committed and local state is cleared, so the bar falls back to the
  // engine's position — which is the only authority for where playback
  // actually is.
  const responder = useMemo(
    () => ({
      onStartShouldSetResponder: () => enabled,
      onMoveShouldSetResponder: () => enabled,
      onResponderGrant: (e: GestureResponderEvent) => {
        if (enabled) setDragPositionMs(positionToMs(e.nativeEvent.locationX));
      },
      onResponderMove: (e: GestureResponderEvent) => {
        if (enabled) setDragPositionMs(positionToMs(e.nativeEvent.locationX));
      },
      onResponderRelease: (e: GestureResponderEvent) => {
        if (!enabled) return;
        const next = positionToMs(e.nativeEvent.locationX);
        setDragPositionMs(null);
        onSeek(next);
      },
      onResponderTerminate: () => setDragPositionMs(null),
    }),
    [enabled, onSeek, positionToMs],
  );

  const remainingMs = hasDuration ? Math.max(0, durationMs - shownMs) : 0;

  return (
    <View
      style={styles.container}
      accessible={false}
      testID="audio-seek-bar">
      <View
        style={styles.touchArea}
        {...responder}
        accessibilityRole="adjustable"
        accessibilityLabel="Seek"
        // A live stream has no position to adjust to, and saying so is
        // the honest thing rather than announcing a control that does
        // nothing.
        accessibilityValue={
          enabled
            ? {min: 0, max: Math.round(durationMs), now: Math.round(shownMs)}
            : {text: 'Live stream — not seekable'}
        }
        accessibilityState={{disabled: !enabled}}
        onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}>
        <View
          style={[
            styles.bar,
            {backgroundColor: colors.background.seekTrack.empty},
          ]}>
          <View
            style={[
              styles.fill,
              {width: `${ratio * 100}%`, backgroundColor: colors.accent.gold},
            ]}
          />
          {enabled ? (
            <View
              style={[
                styles.thumb,
                {
                  left: Math.max(0, ratio * trackWidth - THUMB_SIZE / 2),
                  borderColor: colors.accent.gold,
                  backgroundColor: colors.background.onMediaPill,
                },
              ]}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.times}>
        <Text style={[styles.time, {color: colors.text.onMediaMuted}]}>
          {enabled ? formatMsAsClock(shownMs) : '--:--'}
        </Text>
        <Text style={[styles.time, {color: colors.text.onMediaMuted}]}>
          {enabled ? `-${formatMsAsClock(remainingMs)}` : 'LIVE'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  touchArea: {
    height: TRACK_HEIGHT,
    justifyContent: 'center',
  },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    justifyContent: 'center',
  },
  fill: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 3,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});