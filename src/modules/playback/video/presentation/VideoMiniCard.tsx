import React, {useCallback, useState} from 'react';
import {Animated, Pressable, StyleSheet, Text, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {runOnJS} from 'react-native-reanimated';
import {darkColors as cinemaColors} from '../../../../theme/tokens';
import {FONT_FAMILY} from '../../../../constants/fontFamily';
import strings from '../../../../constants/strings';
import type {
  VideoSessionSnapshot,
} from '../domain/VideoTypes';
import {VideoControlButton} from './VideoControlButton';
import {VideoMiniFrame} from './VideoMiniFrame';
import {VideoMiniProgress} from './VideoMiniProgress';
import {VIDEO_UI_FLAGS} from './videoUiFlags';

/**
 * v11 T7.2 \u2014 Mini player card.
 *
 * Replaces the legacy `MiniControls` block in `VideoControlLayer`.
 * Spec \u00a74.8:
 *   - Card on `background.floating` (translucent dark), radius 12,
 *     elevation `md` so it floats above the screen content.
 *   - 96\u00d754 live frame slot on the left (radius 8) with the
 *     fallback chain in `VideoMiniFrame`. Tap the frame to expand.
 *   - Title (Inter Bold 14) + time (Inter Regular 12) stacked
 *     vertically in the middle.
 *   - 2 px hairline progress under the title.
 *   - 32\u00d732 play / expand / close on the right.
 *   - Swipe-down on the grab handle dismisses the mini.
 *
 * The 32\u00d732 mini buttons (size="mini" on `VideoControlButton`)
 * were added in T7.2; the legacy 44 px "compact" was too chunky
 * for a card of this size.
 */
export interface VideoMiniCardProps {
  readonly session: VideoSessionSnapshot;
  readonly title: string;
  /** Active native pointer; passed to the frame for the live
   *  surface. When 0, the frame falls back to entry image / gold
   *  placeholder. */
  readonly nativePtr: number;
  /** Entry's poster / artwork URI; used as the second fallback
   *  in the frame chain (after the live surface). */
  readonly fallbackUri?: string;
  readonly onPlayPause: () => void;
  readonly onExpand: () => void;
  readonly onClose: () => void;
  readonly onSeek: (position: number) => void;
}

const SWIPE_DOWN_THRESHOLD_PX = 60;
const HAIRLINE_GAP = 6;
const TIME_FORMAT = (s: number): string => {
  if (!Number.isFinite(s) || s < 0) return '--:--';
  const total = Math.floor(s);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
};

function primaryIcon(session: VideoSessionSnapshot) {
  return session.isPlaying ? ('pause' as const) : ('play' as const);
}

function primaryLabel(session: VideoSessionSnapshot): string {
  if (session.phase === 'finished' || session.isEnded) return 'Play from beginning';
  if (session.isPlaying) return 'Pause';
  return 'Play';
}

export function VideoMiniCard({
  session,
  title,
  nativePtr,
  fallbackUri,
  onPlayPause,
  onExpand,
  onClose,
  onSeek,
}: VideoMiniCardProps) {
  // T7.2: swipe-down dismisses the card. Same threshold + same
  // pattern as the legacy mini, lifted here so the card owns the
  // gesture surface end-to-end.
  const [dismissOffset] = useState(() => new Animated.Value(0));
  const handleSwipeDismiss = useCallback(() => {
    Animated.timing(dismissOffset, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start(({finished}) => {
      if (finished) onClose();
    });
  }, [dismissOffset, onClose]);
  const handleSwipeUpdate = useCallback(
    (translationY: number) => {
      const ratio = Math.min(1, Math.max(0, translationY / SWIPE_DOWN_THRESHOLD_PX));
      Animated.timing(dismissOffset, {
        toValue: ratio,
        duration: 0,
        useNativeDriver: true,
      }).start();
    },
    [dismissOffset],
  );
  const handleSwipeCancel = useCallback(() => {
    Animated.spring(dismissOffset, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 6,
    }).start();
  }, [dismissOffset]);
  const swipe = Gesture.Pan()
    .activeOffsetY([12, 9999])
    .failOffsetX([-12, 12])
    .onUpdate(event => {
      'worklet';
      const ty = event.translationY ?? 0;
      if (ty > 0) runOnJS(handleSwipeUpdate)(ty);
    })
    .onEnd(event => {
      'worklet';
      if ((event.translationY ?? 0) > SWIPE_DOWN_THRESHOLD_PX) {
        runOnJS(handleSwipeDismiss)();
      } else {
        runOnJS(handleSwipeCancel)();
      }
    });

  const translateY = dismissOffset.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 80],
    extrapolate: 'clamp',
  });
  const opacity = dismissOffset.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const remainingText = (() => {
    if (session.duration === null) return '';
    const remaining = session.duration - session.position;
    if (!Number.isFinite(remaining) || remaining <= 0) return '';
    return `\u2212${TIME_FORMAT(remaining)}`;
  })();

  return (
    <Animated.View
      testID="videoMiniCard"
      style={[
        styles.card,
        {opacity, transform: [{translateY}]},
      ]}
    >
      <GestureDetector gesture={swipe}>
        <View style={styles.grabHandle} accessibilityElementsHidden>
          <View style={styles.grabBar} />
        </View>
      </GestureDetector>
      <View style={styles.row}>
        <VideoMiniFrame
          nativePtr={nativePtr}
          fallbackUri={fallbackUri}
          title={title}
          tappable
          onPress={onExpand}
          testID="videoMiniCard:frame"
          // v11 T7.3: the master switch is read from the env-
          // backed flag. The card doesn't re-read the flag per
          // render \u2014 it captures the value at module load. To
          // override at runtime, set the env var and rebuild.
          liveSurfaceEnabled={VIDEO_UI_FLAGS.miniLiveSurface}
        />
        <View style={styles.meta} pointerEvents="none">
          <Text numberOfLines={1} style={styles.title}>
            {title || session.source?.title || ''}
          </Text>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>
              {TIME_FORMAT(session.position)}
            </Text>
            <View style={styles.spacer} />
            {remainingText ? (
              <Text style={styles.timeText}>{remainingText}</Text>
            ) : null}
          </View>
          <View style={styles.progressRow}>
            <VideoMiniProgress
              session={session}
              testID="videoMiniCard:progress"
            />
          </View>
        </View>
        <View style={styles.actions}>
          <VideoControlButton
            icon={primaryIcon(session)}
            label={primaryLabel(session)}
            size="mini"
            onPress={onPlayPause}
            testID="videoMiniCard:playPause"
          />
          <VideoControlButton
            icon="expand"
            label={strings.videoExpandPlayerFull}
            size="mini"
            onPress={onExpand}
            testID="videoMiniCard:expand"
          />
          <VideoControlButton
            icon="close"
            label={strings.videoClosePlayer}
            size="mini"
            onPress={onClose}
            testID="videoMiniCard:close"
          />
        </View>
      </View>
      {/* T7.2: the card's frame is the tap target for expand; the
          Pressable lives on the title strip as a sibling target so
          a tap on the title also expands. The frame's onPress is
          still wired (see VideoMiniFrame). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.videoExpandByName.replace('{title}', title)}
        onPress={onExpand}
        style={StyleSheet.absoluteFill}
        pointerEvents="box-none"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 96,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: 12,
    backgroundColor: cinemaColors.background.floating,
    // T7.2: elevation + shadow per the spec \u2014 the card floats
    // above the screen. Android uses `elevation`; iOS uses
    // `shadow*`. Tokens expose `shadow.md` so both work.
    elevation: 6,
    shadowColor: cinemaColors.shadow,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  grabHandle: {
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grabBar: {
    width: 36,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: cinemaColors.text.onMediaMuted,
    opacity: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meta: {
    flex: 1,
    paddingHorizontal: 12,
  },
  title: {
    color: cinemaColors.text.bright,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.inter.bold,
  },
  timeRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
  },
  timeText: {
    color: cinemaColors.text.onMediaSoft,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.inter.regular,
    fontVariant: ['tabular-nums'],
  },
  progressRow: {
    marginTop: HAIRLINE_GAP,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
