import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {darkColors as cinemaColors} from '../../../../../theme/tokens';
import type {
  VideoV3Capabilities,
  VideoV3SessionSnapshot,
} from '../domain/VideoV3Types';
import type {
  VideoV3PresentationMode,
  VideoV3SafeGeometry,
} from './VideoV3PresentationTypes';
import {VideoV3ControlButton} from './VideoV3ControlButton';
import {VideoV3Icon} from './VideoV3Icon';
import {VideoV3ProgressRail} from './VideoV3ProgressRail';

export interface VideoV3ControlLayerProps {
  readonly mode: VideoV3PresentationMode;
  readonly session: VideoV3SessionSnapshot;
  readonly capabilities: VideoV3Capabilities;
  readonly geometry: VideoV3SafeGeometry;
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
  readonly onToggleLock?: () => void;
  readonly isLocked?: boolean;
}

function primaryLabel(session: VideoV3SessionSnapshot): string {
  if (session.phase === 'finished' || session.isEnded) return 'Play from beginning';
  if (session.isPlaying) return 'Pause';
  return 'Play';
}

function primaryIcon(session: VideoV3SessionSnapshot) {
  return session.isPlaying ? 'pause' as const : 'play' as const;
}

function statusLabel(session: VideoV3SessionSnapshot): string | null {
  switch (session.phase) {
    case 'preparing': return 'Preparing';
    case 'connecting': return 'Connecting';
    case 'first-frame': return 'Starting';
    case 'buffering': return 'Buffering';
    case 'seeking': return 'Seeking';
    case 'error': return session.error?.message ?? 'Playback error';
    default: return null;
  }
}

export function VideoV3ControlLayer(props: VideoV3ControlLayerProps) {
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
  onToggleLock,
  isLocked = false,
}: VideoV3ControlLayerProps) {
  const status = statusLabel(session);
  const showCenterAction = chromeVisible && (
    session.phase === 'paused' ||
    session.phase === 'finished' ||
    session.phase === 'error' ||
    (session.phase === 'ready' && !session.isPlaying)
  );
  return (
    <View style={styles.fullRoot} pointerEvents="box-none">
      {chromeVisible ? (
        <View style={[styles.topScrim, {paddingTop: geometry.topContentInset, paddingHorizontal: geometry.horizontalContentInset}]} pointerEvents="box-none">
          <View style={styles.topRow}>
            <VideoV3ControlButton icon="back" label="Back" size="regular" onPress={onBack} />
            <Text numberOfLines={1} style={styles.title}>{title ?? session.source?.title ?? ''}</Text>
            <View style={styles.topActions}>
              {onToggleLock ? <VideoV3ControlButton icon={isLocked ? 'unlock' : 'lock'} label={isLocked ? 'Unlock controls' : 'Lock controls'} size="compact" onPress={onToggleLock} /> : null}
              {onOpenMore ? <VideoV3ControlButton icon="more" label="More video options" size="compact" onPress={onOpenMore} /> : null}
            </View>
          </View>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={chromeVisible ? 'Hide video controls' : 'Show video controls'}
        onPress={onToggleChrome}
        style={styles.frameTapTarget}
      />

      {status ? (
        <View pointerEvents="none" style={styles.statusWrap}>
          <View style={styles.statusLine}>
            <View style={styles.statusMark} />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>
      ) : null}

      {showCenterAction ? (
        <View pointerEvents="box-none" style={styles.centerAction}>
          <VideoV3ControlButton
            icon={primaryIcon(session)}
            iconColor={cinemaColors.accent.gold}
            label={session.phase === 'error' ? 'Retry video' : primaryLabel(session)}
            hint={session.phase === 'error' ? 'Try loading the video again' : undefined}
            size="primary"
            onPress={onPlayPause}
          />
        </View>
      ) : null}

      {chromeVisible ? (
        <View style={[styles.bottomScrim, {paddingBottom: geometry.bottomContentInset, paddingHorizontal: geometry.horizontalContentInset}]} pointerEvents="box-none">
          <VideoV3ProgressRail session={session} onSeek={onSeek} />
          <View style={[styles.transportRow, {gap: geometry.controlGap}]}>
            {onPrevious ? <VideoV3ControlButton icon="previous" label="Previous video" size="regular" disabled={!capabilities.canPlay} onPress={onPrevious} /> : null}
            {capabilities.canSeek ? <VideoV3ControlButton icon="rewind" label="Seek backward 10 seconds" size="regular" onPress={() => onSkip(-10)} /> : null}
            <VideoV3ControlButton
              icon={primaryIcon(session)}
              iconColor={cinemaColors.text.bright}
              label={primaryLabel(session)}
              size="regular"
              disabled={session.phase === 'connecting' || session.phase === 'preparing'}
              onPress={onPlayPause}
            />
            {capabilities.canSeek ? <VideoV3ControlButton icon="forward" label="Seek forward 10 seconds" size="regular" onPress={() => onSkip(10)} /> : null}
            {onNext ? <VideoV3ControlButton icon="next" label="Next video" size="regular" onPress={onNext} /> : null}
          </View>
          <View style={[styles.utilityRow, {gap: geometry.utilityGap}]}>
            {capabilities.canSelectCaptionTrack && onToggleCaptions ? <VideoV3ControlButton icon="captions" label="Captions" size="compact" onPress={onToggleCaptions} /> : null}
            {capabilities.canFullscreen && onToggleFullscreen ? <VideoV3ControlButton icon="expand" label="Enter fullscreen" size="compact" onPress={onToggleFullscreen} /> : null}
            {capabilities.canPictureInPicture && onEnterPictureInPicture ? <VideoV3ControlButton icon="collapse" label="Enter picture in picture" size="compact" onPress={onEnterPictureInPicture} /> : null}
            <View style={styles.utilitySpacer} />
            {onClose ? <VideoV3ControlButton icon="close" label="Close video player" size="compact" onPress={onClose} /> : null}
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
}: VideoV3ControlLayerProps) {
  return (
    <View style={[styles.miniRoot, {paddingBottom: geometry.bottomContentInset, paddingLeft: geometry.horizontalContentInset, paddingRight: geometry.horizontalContentInset}]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Expand ${title ?? session.source?.title ?? 'video'}`}
        onPress={onBack}
        style={styles.miniFrameTarget}
      />
      <View style={styles.miniText} pointerEvents="none">
        <Text numberOfLines={1} style={styles.miniTitle}>{title ?? session.source?.title ?? ''}</Text>
        <VideoV3ProgressRail session={session} onSeek={onSeek} />
      </View>
      <View style={styles.miniActions}>
        <VideoV3ControlButton icon={primaryIcon(session)} label={primaryLabel(session)} size="compact" onPress={onPlayPause} />
        <VideoV3ControlButton icon="expand" label="Expand video player" size="compact" onPress={onToggleChrome} />
        <VideoV3ControlButton icon="close" label="Close video player" size="compact" onPress={onClose} />
      </View>
      <View style={styles.miniIconHint} pointerEvents="none"><VideoV3Icon name="expand" size={16} color={cinemaColors.text.onMediaMuted} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullRoot: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
  },
  topScrim: {
    zIndex: 2,
    paddingTop: 12,
    paddingBottom: 32,
    backgroundColor: cinemaColors.background.scrimMid,
  },
  topRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    color: cinemaColors.text.bright,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    marginHorizontal: 10,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  frameTapTarget: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  statusWrap: {
    position: 'absolute',
    top: '46%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  statusLine: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    backgroundColor: cinemaColors.background.scrim,
  },
  statusMark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: cinemaColors.accent.gold,
    marginRight: 9,
  },
  statusText: {
    color: cinemaColors.text.bright,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  centerAction: {
    zIndex: 3,
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    marginTop: -34,
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
  utilitySpacer: {
    flex: 1,
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
  miniIconHint: {
    position: 'absolute',
    left: 34,
    top: 12,
  },
});
