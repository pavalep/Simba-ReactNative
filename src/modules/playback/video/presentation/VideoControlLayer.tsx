import React, {useCallback, useState} from 'react';
import {Animated, Pressable, StyleSheet, Text, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {runOnJS} from 'react-native-reanimated';
import {darkColors as cinemaColors} from '../../../../theme/tokens';
import type {
  VideoCapabilities,
  VideoSessionSnapshot,
} from '../domain/VideoTypes';
import type {
  VideoPresentationMode,
  VideoSafeGeometry,
} from './VideoPresentationTypes';
import {VideoControlButton} from './VideoControlButton';
import {VideoIcon} from './VideoIcon';
import {VideoProgressRail} from './VideoProgressRail';
import {VideoTopBar} from './VideoTopBar';
import {VideoCenterAction, type VideoCenterPhase} from './VideoCenterAction';

export interface VideoControlLayerProps {
  readonly mode: VideoPresentationMode;
  readonly session: VideoSessionSnapshot;
  readonly capabilities: VideoCapabilities;
  readonly geometry: VideoSafeGeometry;
  readonly chromeVisible: boolean;
  readonly title?: string;
  readonly onToggleChrome: () => void;
  readonly onBack: () => void;
  readonly onClose: () => void;
  readonly onPlayPause: () => void;
  readonly onSeek: (position: number) => void;
  readonly onSkip: (seconds: number) => void;
  readonly onPrevious?: () => void;
  readonly onNext?: () => void;
  readonly onToggleCaptions?: () => void;
  readonly onToggleFullscreen?: () => void;
  readonly onEnterPictureInPicture?: () => void;
  readonly onOpenMore?: () => void;
  readonly onOpenSpeed?: () => void;
  readonly onOpenTracks?: () => void;
  readonly onOpenChapters?: () => void;
  readonly onToggleBookmark?: () => void;
  readonly isBookmarked?: boolean;
  readonly onToggleLock?: () => void;
  readonly isLocked?: boolean;
  readonly onOpenQueue?: () => void;
}

function primaryLabel(session: VideoSessionSnapshot): string {
  if (session.phase === 'finished' || session.isEnded) return 'Play from beginning';
  if (session.isPlaying) return 'Pause';
  return 'Play';
}

function primaryIcon(session: VideoSessionSnapshot) {
  return session.isPlaying ? 'pause' as const : 'play' as const;
}

export function VideoControlLayer(props: VideoControlLayerProps) {
  return props.mode === 'mini' ? <MiniControls {...props} /> : <FullControls {...props} />;
}

function FullControls({
  session,
  capabilities,
  geometry,
  chromeVisible,
  title,
  onToggleChrome,
  onBack,
  onClose,
  onPlayPause,
  onSeek,
  onSkip,
  onPrevious,
  onNext,
  onToggleCaptions,
  onToggleFullscreen,
  onEnterPictureInPicture,
  onOpenMore,
  onOpenSpeed,
  onOpenTracks,
  onOpenChapters,
  onToggleBookmark,
  isBookmarked = false,
  onToggleLock,
  isLocked = false,
  onOpenQueue,
}: VideoControlLayerProps) {
  // v11 T5.2: FSM-driven visibility contract per spec §4.3 / §4.12.
  // The centre action is visible when the session is paused / finished /
  // error AND the loading FSM is idle (or error, so the retry button
  // can sit alongside the pill's retry affordance per spec §0.7).
  // During any other loading state (preparing / buffering / seeking /
  // reconnecting) the centre stays hidden — the pill owns the moment.
  const centerActionPhase: VideoCenterPhase | null =
    session.phase === 'paused'
      ? 'paused'
      : session.phase === 'finished'
        ? 'finished'
        : session.phase === 'error'
          ? 'error'
          : null;
  const centerActionVisible =
    chromeVisible &&
    centerActionPhase !== null &&
    (session.loadingState.kind === 'idle' ||
      session.loadingState.kind === 'error');
  return (
    <View style={styles.fullRoot} pointerEvents="box-none">
      {chromeVisible ? (
        <VideoTopBar
          title={title ?? session.source?.title ?? ''}
          onBack={onBack}
          onClose={onClose}
          onToggleLock={onToggleLock}
          isLocked={isLocked}
          onOpenMore={onOpenMore}
        />
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={chromeVisible ? 'Hide video controls' : 'Show video controls'}
        onPress={onToggleChrome}
        style={styles.frameTapTarget}
      />

      {centerActionPhase !== null ? (
        <VideoCenterAction
          phase={centerActionPhase}
          onPress={onPlayPause}
          visible={centerActionVisible}
        />
      ) : null}

      {chromeVisible && !isLocked ? (
        <View style={[styles.bottomScrim, {paddingBottom: geometry.bottomContentInset, paddingHorizontal: geometry.horizontalContentInset}]} pointerEvents="box-none">
          <VideoProgressRail session={session} onSeek={onSeek} />
          <View style={[styles.transportRow, {gap: geometry.controlGap}]}>
            {onPrevious ? <VideoControlButton icon="previous" label="Previous video" size="regular" disabled={!capabilities.canPlay} onPress={onPrevious} /> : null}
            {capabilities.canSeek ? <VideoControlButton icon="rewind" label="Seek backward 10 seconds" size="regular" onPress={() => onSkip(-10)} /> : null}
            <VideoControlButton
              icon={primaryIcon(session)}
              iconColor={cinemaColors.text.bright}
              label={primaryLabel(session)}
              size="regular"
              disabled={session.phase === 'connecting' || session.phase === 'preparing'}
              onPress={onPlayPause}
            />
            {capabilities.canSeek ? <VideoControlButton icon="forward" label="Seek forward 10 seconds" size="regular" onPress={() => onSkip(10)} /> : null}
            {onNext ? <VideoControlButton icon="next" label="Next video" size="regular" onPress={onNext} /> : null}
          </View>
          <View style={[styles.utilityRow, {gap: geometry.utilityGap}]}>
            {capabilities.canSelectCaptionTrack && onToggleCaptions ? <VideoControlButton icon="captions" label="Captions" size="compact" onPress={onToggleCaptions} /> : null}
            {onOpenTracks ? <VideoControlButton icon="more" label="Tracks and quality" size="compact" onPress={onOpenTracks} /> : null}
            {capabilities.canViewChapters && onOpenChapters ? <VideoControlButton icon="chapters" label="Chapters" size="compact" onPress={onOpenChapters} /> : null}
            {onToggleBookmark ? <VideoControlButton icon={isBookmarked ? 'bookmarkFilled' : 'bookmark'} label={isBookmarked ? 'Remove bookmark' : 'Save bookmark'} size="compact" onPress={onToggleBookmark} /> : null}
            {onOpenQueue ? <VideoControlButton icon="queue" label="Open queue" size="compact" onPress={onOpenQueue} /> : null}
            {capabilities.canFullscreen && onToggleFullscreen ? <VideoControlButton icon="expand" label="Enter fullscreen" size="compact" onPress={onToggleFullscreen} /> : null}
            {capabilities.canPictureInPicture && onEnterPictureInPicture ? <VideoControlButton icon="collapse" label="Enter picture in picture" size="compact" onPress={onEnterPictureInPicture} /> : null}
            {capabilities.canChangeSpeed && onOpenSpeed ? <VideoSpeedChip speed={session.speed} onPress={onOpenSpeed} /> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function MiniControls({
  session,
  geometry,
  title,
  onToggleChrome,
  onBack,
  onClose,
  onPlayPause,
  onSeek,
}: VideoControlLayerProps) {
  // W5.5: swipe-down on the title strip dismisses the mini player.
  // We render a thin "grab handle" above the title that owns the
  // gesture so the buttons / progress / tap-to-expand areas stay
  // untouched. A 60 px downward translation is the dismiss threshold.
  const SWIPE_DOWN_THRESHOLD_PX = 60;
  const dismissOffset = useState(() => new Animated.Value(0))[0];
  const handleSwipeDismiss = useCallback(() => {
    Animated.timing(dismissOffset, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start(({finished}) => {
      if (finished) onClose();
    });
  }, [dismissOffset, onClose]);
  const handleSwipeUpdate = useCallback((translationY: number) => {
    // Show the user a visual cue by translating the mini down. The
    // ratio is the actual drag distance vs the threshold, capped to
    // 1 so a long swipe doesn't fly off-screen.
    const ratio = Math.min(1, Math.max(0, translationY / SWIPE_DOWN_THRESHOLD_PX));
    Animated.timing(dismissOffset, {
      toValue: ratio,
      duration: 0,
      useNativeDriver: true,
    }).start();
  }, [dismissOffset]);
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
  return (
    <Animated.View
      style={[
        styles.miniRoot,
        {
          paddingBottom: geometry.bottomContentInset,
          paddingLeft: geometry.horizontalContentInset,
          paddingRight: geometry.horizontalContentInset,
          opacity,
          transform: [{translateY}],
        },
      ]}>
      <GestureDetector gesture={swipe}>
        <View style={styles.miniGrabHandle}>
          <View style={styles.miniGrabBar} />
        </View>
      </GestureDetector>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Expand ${title ?? session.source?.title ?? 'video'}`}
        onPress={onBack}
        style={styles.miniFrameTarget}
      />
      <View style={styles.miniText} pointerEvents="none">
        <Text numberOfLines={1} style={styles.miniTitle}>{title ?? session.source?.title ?? ''}</Text>
        <VideoProgressRail session={session} onSeek={onSeek} />
      </View>
      <View style={styles.miniActions}>
        <VideoControlButton icon={primaryIcon(session)} label={primaryLabel(session)} size="compact" onPress={onPlayPause} />
        <VideoControlButton icon="expand" label="Expand video player" size="compact" onPress={onToggleChrome} />
        <VideoControlButton icon="close" label="Close video player" size="compact" onPress={onClose} />
      </View>
    </Animated.View>
  );
}

/**
 * W2.1: speed chip — a small text pill that shows the current playback speed
 * (e.g. "1×" / "1.5×") and opens the speed picker sheet on press. Text is
 * used instead of an icon because the speed value IS the affordance; an icon
 * would force a second step to learn what speed is active.
 */
function VideoSpeedChip({speed, onPress}: {speed: number; onPress: () => void}) {
  const label = formatSpeedLabel(speed);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Playback speed ${label}. Tap to change.`}
      onPress={onPress}
      style={({pressed}) => [styles.speedChip, pressed && styles.speedChipPressed]}>
      <Text style={styles.speedChipText}>{label}</Text>
    </Pressable>
  );
}

function formatSpeedLabel(speed: number): string {
  if (!Number.isFinite(speed) || speed <= 0) return '1×';
  // Strip trailing zeros from fixed precision (1.0 → 1, 0.50 → 0.5).
  const rounded = Math.round(speed * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  return `${text}×`;
}

const styles = StyleSheet.create({
  fullRoot: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
  },
  frameTapTarget: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  bottomScrim: {
    zIndex: 2,
    paddingTop: 34,
    backgroundColor: cinemaColors.background.scrimStrong,
  },
  transportRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilityRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedChip: {
    minWidth: 52,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedChipPressed: {
    opacity: 0.68,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  speedChipText: {
    color: cinemaColors.text.bright,
    fontSize: 13,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  miniRoot: {
    minHeight: 86,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: cinemaColors.background.surfaceDark,
    borderTopWidth: 1,
    borderTopColor: cinemaColors.border.emphasis,
    paddingTop: 8,
  },
  miniFrameTarget: {
    width: 52,
    height: 58,
    backgroundColor: cinemaColors.background.elevated,
  },
  miniText: {
    flex: 1,
    paddingHorizontal: 12,
  },
  miniTitle: {
    color: cinemaColors.text.bright,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  miniActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // `miniIconHint` removed under W5.2 (see MiniControls).
  // W5.5: grab handle — a thin strip at the top of the mini player
  // that hosts the swipe-down-to-dismiss gesture. A subtle horizontal
  // bar in the middle hints at the affordance.
  miniGrabHandle: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniGrabBar: {
    width: 36,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: cinemaColors.text.onMediaMuted,
    opacity: 0.5,
  },
});
