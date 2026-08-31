import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {darkColors as cinemaColors} from '../../../../theme/tokens';
import strings from '../../../../constants/strings';
import type {
  VideoCapabilities,
  VideoSessionSnapshot,
} from '../domain/VideoTypes';

const noop = () => {};
import type {
  VideoPresentationMode,
  VideoSafeGeometry,
} from './VideoPresentationTypes';
import {VideoControlButton} from './VideoControlButton';
import {VideoIcon} from './VideoIcon';
import {VideoLockedOverlay} from './VideoLockedOverlay';
import {VideoMiniCard} from './VideoMiniCard';
import {VideoProgressRail, type VideoProgressBookmark} from './VideoProgressRail';
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
  /** v11 T5.3: single retry affordance — both the pill and the
   *  centre action's "Retry" button call this handler. The host is
   *  expected to guard against double-dispatch (see `retryInFlight`). */
  readonly onRetry?: () => void;
  /** v11 T5.3: true while a retry load is in flight. The centre
   *  action's press handler short-circuits while this is true. The
   *  pill also self-disables via the FSM (loadingState.kind flips
   *  away from 'error' immediately after the load dispatches). */
  readonly retryInFlight?: boolean;
  /** v11 T6.2: bookmark positions for the current source. Forwarded
   *  to `VideoProgressRail` so the rail can render gold diamond
   *  markers at each saved position. The host owns the data source
   *  (the `useBookmarks` hook), so the rail stays decoupled from
   *  the bookmarks store. */
  readonly bookmarks?: readonly VideoProgressBookmark[];
  /** v11 T7.2: active native pointer, passed through to the mini
   *  card's frame so the live surface renders in the 96\u00d754 slot.
   *  When 0, the frame falls back to the entry image / gold
   *  placeholder. */
  readonly nativePtr?: number;
  /** v11 T7.2: entry's poster / artwork URI. Second step of the
   *  mini-frame fallback chain (after the live surface). */
  readonly fallbackUri?: string;
  /** v11 T8.3: fullscreen state — when true, the top bar back
   *  button label flips to "Exit fullscreen" and the utility
   *  row rotate button shows the collapse icon + "Exit
   *  fullscreen" label. The host is the source of truth. */
  readonly isFullscreen?: boolean;
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
  onRetry,
  retryInFlight = false,
  bookmarks,
  isFullscreen = false,
}: VideoControlLayerProps) {
  // v11 T5.3: the centre action's onPress is "retry when in error,
  // otherwise play/pause". This is the same handler the pill's
  // "Try loading the video again" calls — one affordance, two entry
  // points, per spec §0.7.
  const centerActionPress = session.phase === 'error' && onRetry
    ? onRetry
    : onPlayPause;
  // v11 T5.2: FSM-driven visibility contract per spec §4.3 / §4.12.
  // The centre action is visible when the session is paused / finished /
  // error AND the loading FSM is idle (or error, so the retry button
  // can sit alongside the pill's retry affordance per spec §0.7).
  // During any other loading state (preparing / buffering / seeking /
  // reconnecting) the centre stays hidden — the pill owns the moment.
  // v11 T9.1: also hidden when locked (lock = no chrome changing).
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
    !isLocked &&
    centerActionPhase !== null &&
    (session.loadingState.kind === 'idle' ||
      session.loadingState.kind === 'error');
  return (
    <View style={styles.fullRoot} pointerEvents="box-none">
      {chromeVisible && !isLocked ? (
        <VideoTopBar
          title={title ?? session.source?.title ?? ''}
          onBack={onBack}
          onClose={onClose}
          onToggleLock={onToggleLock}
          isLocked={isLocked}
          onOpenMore={onOpenMore}
          isFullscreen={isFullscreen}
        />
      ) : null}

      {/* v11 T9.1: floating unlock overlay. The ONLY tappable
          surface while locked (top/bottom bars + centre are
          gated by !isLocked below; the frame tap is gated
          by the same condition). The handler is the host's
          lock toggle \u2014 it both unlocks AND shows chrome +
          a 3 s auto-hide. */}
      {isLocked ? <VideoLockedOverlay onUnlock={onToggleLock ?? noop} /> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={chromeVisible ? 'Hide video controls' : 'Show video controls'}
        onPress={onToggleChrome}
        style={styles.frameTapTarget}
      />

      {centerActionPhase !== null ? (
        <VideoCenterAction
          phase={centerActionPhase}
          onPress={centerActionPress}
          // When the host is mid-retry, both the pill and the centre
          // self-disable via this flag (the FSM would hide them a
          // frame later anyway; the flag closes the small race).
          visible={centerActionVisible && !retryInFlight}
        />
      ) : null}

      {chromeVisible && !isLocked ? (
        <View style={[styles.bottomScrim, {paddingBottom: geometry.bottomContentInset, paddingHorizontal: geometry.horizontalContentInset}]} pointerEvents="box-none">
          <VideoProgressRail session={session} onSeek={onSeek} bookmarks={bookmarks} />
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
            {/*
              v11 T10.1: utility row order per spec 4.5:
                captions \u00b7 bookmark \u00b7 speed chip \u00b7 PiP \u00b7 spacer \u00b7 rotate \u00b7 more
              Each chip uses the new `utility` size (36\u00d736
              visual + 44 px hit slop). The `spacer` is a flex-1
              View that pushes the right-cluster (rotate + more)
              to the right edge \u2014 a standard utility-bar layout
              pattern. The bookmark chip swaps to `bookmarkFilled`
              when the current position is bookmarked; the speed
              chip's own styling tints gold when the speed \u2260 1.
            */}
            {capabilities.canSelectCaptionTrack && onToggleCaptions ? (
              <VideoControlButton icon="captions" label="Captions" size="utility" onPress={onToggleCaptions} />
            ) : null}
            {onToggleBookmark ? (
              <VideoControlButton
                icon={isBookmarked ? 'bookmarkFilled' : 'bookmark'}
                label={isBookmarked ? strings.videoBookmarkRemove : strings.videoBookmarkAdd}
                size="utility"
                onPress={onToggleBookmark}
              />
            ) : null}
            {capabilities.canChangeSpeed && onOpenSpeed ? (
              <VideoSpeedChip speed={session.speed} onPress={onOpenSpeed} />
            ) : null}
            {capabilities.canPictureInPicture && onEnterPictureInPicture ? (
              <VideoControlButton
                icon="collapse"
                label={strings.videoEnterPip}
                size="utility"
                onPress={onEnterPictureInPicture}
              />
            ) : null}
            <View style={styles.utilitySpacer} />
            {capabilities.canFullscreen && !isLocked && onToggleFullscreen ? (
              <VideoControlButton
                icon={isFullscreen ? 'collapse' : 'expand'}
                label={isFullscreen ? strings.videoExitFullscreen : strings.videoEnterFullscreen}
                size="utility"
                onPress={onToggleFullscreen}
              />
            ) : null}
            {onOpenMore ? (
              <VideoControlButton
                icon="more"
                label={strings.videoMoreOptions}
                size="utility"
                onPress={onOpenMore}
              />
            ) : null}
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
  nativePtr = 0,
  fallbackUri,
}: VideoControlLayerProps) {
  // v11 T7.2: the mini player is now a `VideoMiniCard` — card on
  // `background.floating` (translucent), 96×54 frame slot with the
  // live surface / entry image / gold placeholder fallback chain,
  // title + time + 2 px hairline progress, 32×32 play/expand/close.
  // The legacy inline mini chrome (the `miniRoot` row + grab
  // handle + 44 px buttons + chunky rail) was deleted in T7.2 in
  // favour of the card.
  return (
    <View
      style={{
        paddingBottom: geometry.bottomContentInset,
        paddingLeft: geometry.horizontalContentInset,
        paddingRight: geometry.horizontalContentInset,
      }}
    >
      <VideoMiniCard
        session={session}
        title={title ?? session.source?.title ?? ''}
        nativePtr={nativePtr}
        fallbackUri={fallbackUri}
        onPlayPause={onPlayPause}
        // T7.2: both `onToggleChrome` (legacy "expand from the
        // expand button") and `onBack` (legacy "expand by tapping
        // the frame") map to the same expand intent — the host's
        // `expandPlayer` handler.
        onExpand={onBack}
        onClose={onClose}
        // The mini doesn't expose scrubbing (the spec keeps it a
        // glanceable surface). Pass `onSeek` through to satisfy
        // the type; the rail / hairline don't call it in mini mode.
        onSeek={onSeek}
      />
    </View>
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
  // v11 T10.1: the spacer between the left cluster (captions /
  // bookmark / speed / PiP) and the right cluster (rotate / more).
  // flex: 1 + 0 width pushes the right cluster to the end of
  // the row. The same pattern the iOS apps use for the
  // toolbars in the Photos / Music apps.
  utilitySpacer: {
    flex: 1,
    minWidth: 8,
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
  // v11 T7.2: the legacy mini styles (miniRoot, miniFrameTarget,
  // miniText, miniTitle, miniActions, miniGrabHandle, miniGrabBar)
  // are gone — `VideoMiniCard` owns its own styles now.
});
