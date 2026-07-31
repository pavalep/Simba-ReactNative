import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Animated,
  Easing,
} from 'react-native';
import {useTheme} from '../../../theme';
import {AppText} from '../../core/AppText/AppText';
import {TransportProvider, useTransport} from '../../../contexts/TransportContext';
import {SimbaStatusBar} from '../../StatusBar';
import {BookmarkSheet} from '../../bookmark/BookmarkSheet';
import {BottomSheet} from '../../sheets/BottomSheet/BottomSheet';
import {ChapterBrowser} from '../ChapterBrowser/ChapterBrowser';
import {SleepTimerSheet} from '../SleepTimerSheet/SleepTimerSheet';
import {InfoSheet} from '../NowPlayingInfo/InfoSheet';
import {PlaylistSheet} from '../../sheets/PlaylistSheet';
import {QueueSheet} from '../../sheets/QueueSheet/QueueSheet';
import {BufferingBar} from '../BufferingBar/BufferingBar';
import {ReplayButton} from '../ReplayButton/ReplayButton';
import {VideoPlayerResumeOverlay} from '../../../screens/VideoPlayer/components/VideoPlayerResumeOverlay';
import {VideoPlayerAutoAdvanceCard} from '../../../screens/VideoPlayer/components/VideoPlayerAutoAdvanceCard';
import {MpvPlayer} from '../../../native';
import {useAppDispatch, useAppSelector} from '../../../store';
import {setSleepTimer, setSleepTimerMode} from '../../../store/slices/playerSlice';
import {formatSleepRemaining, sleepTimerModeLabel} from '../../../utils/sleepTimer';
import type {ScannedTrack} from '../../../store/slices/mediaSlice';
import type {PlaylistEntry} from '../../../store/slices/playerSlice';
import type {MpvChapter} from '../../../native';

// ─── Hook Data Type ──────────────────────────────────────────

export interface VideoPlayerHookData {
  colors: ReturnType<typeof useTheme>['colors'];
  title: string;
  fileUri: string | null;

  // Core playback state
  secondaryVisible: boolean;
  setSecondaryVisible: (v: boolean) => void;
  controlsLocked: boolean;
  handleToggleLock: () => void;
  resumePrompt: {position: number} | null;
  autoAdvance: {uri: string; title: string} | null;
  autoAdvanceCountdown: number;
  handleResumeChoice: (shouldResume: boolean) => void;
  handleAutoAdvanceNow: () => void;
  handleCancelAutoAdvance: () => void;
  volume: number;
  nativePtr: number;
  showVideoSurface: boolean;
  loadingPhase: string;
  error: any;
  errorIsPermission: boolean;
  chapters: MpvChapter[];
  isBuffering: boolean;
  showReplay: boolean;

  // Subtitle state
  subtitleTracks: any[];
  activeSubtitle: number | null;
  subtitleVisible: boolean;
  subtitlePanelOpen: boolean;
  setSubtitlePanelOpen: (v: boolean) => void;
  subtitleFontSize: 'small' | 'medium' | 'large';
  subtitleOpacity: number;
  subtitlePosition: number;
  subtitleTextColor: string;
  subtitleBgOpacity: number;
  subtitleLabel: string;
  audioLabel: string;

  // Audio track state
  audioTracks: any[];
  activeAudioTrack: number | null;
  audioPanelOpen: boolean;
  setAudioPanelOpen: (v: boolean) => void;
  volumePanelOpen: boolean;
  setVolumePanelOpen: (v: boolean) => void;
  muted: boolean;
  speed: number;
  speedPanelOpen: boolean;
  setSpeedPanelOpen: (v: boolean) => void;
  bookmarkSaved: boolean;
  bookmarkSheetVisible: boolean;
  bookmarksForFile: any[];
  bookmarkCountForFile: number;

  // Equalizer state
  eqGains: number[];
  eqEnabled: boolean;
  eqPanelOpen: boolean;
  setEqPanelOpen: (v: boolean) => void;

  // Playlist state
  playlistPanelOpen: boolean;
  setPlaylistPanelOpen: (v: boolean) => void;

  // Chapters panel state
  chaptersPanelOpen: boolean;
  setChaptersPanelOpen: (v: boolean) => void;

  // Info Sheet state
  infoSheetVisible: boolean;
  setInfoSheetVisible: (v: boolean) => void;

  // Playlist Sheet state
  playlistSheetVisible: boolean;
  setPlaylistSheetVisible: (v: boolean) => void;
  currentTrackMetadata: any;

  // Queue Sheet state
  queueSheetVisible: boolean;
  setQueueSheetVisible: (v: boolean) => void;
  queueMultiSelect: boolean;
  setQueueMultiSelect: (v: boolean) => void;

  // PiP
  pipUiVisible: boolean;

  // Gesture overlay state
  seekSide: 'left' | 'right';
  seekFeedbackVisible: boolean;
  volumeOverlayValue: number;
  volumeOverlayVisible: boolean;
  brightnessOverlayValue: number;
  brightnessOverlayVisible: boolean;

  // Expanded mode
  isLandscape: boolean;
  screenWidth: number;
  screenHeight: number;
  uiTopInset: number;
  uiBottomInset: number;
  /** 46.1: accessibility scale for control sizes (1 = default, >1 = larger) */
  controlScale?: number;

  // Redux
  playlist: any[];
  queue: PlaylistEntry[];
  currentIndex: number;
  loopMode: string;
  shuffle: boolean;
  playbackHistory: PlaylistEntry[];
  selectedQueueIndices: number[];

  // Derived
  relatedTracks: ScannedTrack[];
  errorStyles: any;
  loadingMessage: string;

  // PiP animation values
  pipScale: any;
  pipTranslateX: any;
  pipTranslateY: any;

  // Handlers
  handleGoBack: () => void;
  handleReplay: () => void;
  handleRetry: () => void;
  handlePlayPause: () => void;
  handleSurfaceTap: () => void;
  handlePrev: () => void;
  handleNext: () => void;
  handleSeek: (pct: number) => void;
  handleChapterSeek: (time: number) => void;
  handleVolumeChange: () => void;
  handleToggleMute: () => void;
  handleVolumeValueChange: (v: number) => void;
  handleSpeedSelect: (v: number) => void;
  handleAddBookmark: (label: string) => void;
  handleOpenBookmarkSheet: () => void;
  handleCloseBookmarkSheet: () => void;
  handleBookmarkJumpTo: (pos: number) => void;
  handleRemoveBookmark: (id: string) => void;
  handleDoubleTapLeft: () => void;
  handleDoubleTapRight: () => void;
  handleSwipeUp: () => void;
  handleSwipeDown: () => void;
  handleScreenshot: () => void;
  handleInfo: () => void;
  handleInfoAddToPlaylist: () => void;
  handleMorePress: () => void;
  handlePlayRelatedTrack: (track: ScannedTrack) => void;
  handleVolumeSwipe: (v: number) => void;
  handleBrightnessSwipe: (v: number) => void;
  handleVolumeGestureEnd: () => void;
  handleBrightnessGestureEnd: () => void;
  handleToggleShuffle: () => void;
  handleToggleLoop: () => void;
  handleSelectSubtitle: (idx: number) => void;
  handleToggleSubtitleVisibility: () => void;
  handleLoadExternalSubtitle: () => void;
  handleFontSizeChange: (size: 'small' | 'medium' | 'large') => void;
  handleOpacityChange: (v: number) => void;
  handleSubtitlePositionChange: (v: number) => void;
  handleTextColorChange: (color: string) => void;
  handleBgOpacityChange: (opacity: number) => void;
  handleSelectAudioTrack: (idx: number) => void;
  handleBandChange: (idx: number, v: number) => void;
  handleApplyPreset: (preset: string) => void;
  handleResetEq: () => void;
  handleToggleEq: () => void;
  handleAddToPlaylist: () => void;
  handleRemoveFromPlaylist: (idx: number) => void;
  handlePlayFromPlaylist: (idx: number) => void;
  handleClearPlaylist: () => void;
  handleQueueMoveItem: (idx: number, dir: 'up' | 'down') => void;
  handleQueueRemoveItem: (idx: number) => void;
  handleQueueSelectItem: (fileUri: string) => void;
  handleSelectQueueItem: (idx: number) => void;
  handleSelectHistoryItem: (idx: number) => void;
  handlePlayNext: (entry: PlaylistEntry) => void;
  handleAddToQueue: (entry: PlaylistEntry) => void;
  handleCloseQueueSheet: () => void;
  handleEnterMultiSelect: () => void;
  handleExitMultiSelect: () => void;
  handleToggleSelection: (idx: number) => void;
  handleRemoveSelected: () => void;
  handleMoveSelectedToTop: () => void;
  handleClearAll: () => void;
  handleToggleRotate: () => void;
  handleToggleChapters: () => void;
  handleToggleAudio: () => void;
  handleToggleSubtitles: () => void;
  handleToggleEqPanel: () => void;
  handleTogglePlaylist: () => void;
  handlePushPositionRef: (fn: (pos: number) => void) => void;

  // Panels / screens sub-components
  VideoPlayerSurfaceLayer: React.ComponentType<any>;
  VideoPlayerTopBar: React.ComponentType<any>;
  PrimaryControls: React.ComponentType<any>;
  SecondaryToolbar: React.ComponentType<any>;
  VideoPlayerSubtitlePanel: React.ComponentType<any>;
  VideoPlayerAudioPanel: React.ComponentType<any>;
  VideoPlayerEqualizerPanel: React.ComponentType<any>;
  VideoPlayerVolumePanel: React.ComponentType<any>;
  VideoPlayerSpeedPanel: React.ComponentType<any>;
  VideoPlayerPlaylistPanel: React.ComponentType<any>;
  VideoPlayerLoadingOverlay: React.ComponentType<any>;
  SeekFeedbackOverlay: React.ComponentType<any>;
  VolumeBrightnessOverlay: React.ComponentType<any>;
}

// ─── VideoPlayer Component ───────────────────────────────────

export const VideoPlayer: React.FC<VideoPlayerHookData> = (h) => {
  if (h.error) {
    return (
      <View style={[styles.root, h.errorStyles.container]}>
        <View style={h.errorStyles.iconCircle}>
          <AppText style={h.errorStyles.icon}>!</AppText>
        </View>
        <AppText variant="h2" color="primary" style={h.errorStyles.title}>
          {h.error.title}
        </AppText>
        <AppText variant="body2" color="secondary" style={h.errorStyles.message}>
          {h.error.message}
        </AppText>
        {h.error.detail && (
          <AppText variant="caption" color="tertiary" style={h.errorStyles.detail}>
            {h.error.detail}
          </AppText>
        )}
        <View style={h.errorStyles.actions}>
          <TouchableOpacity
            style={[h.errorStyles.btn, h.errorStyles.btnPrimary]}
            onPress={h.handleRetry}
            activeOpacity={0.8}>
            <AppText style={h.errorStyles.btnPrimaryLabel}>Retry</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[h.errorStyles.btn, h.errorStyles.btnSecondary]}
            onPress={h.handleGoBack}
            activeOpacity={0.8}>
            <AppText variant="body2" color="primary">Choose Different File</AppText>
          </TouchableOpacity>
          {h.errorIsPermission && (
            <TouchableOpacity
              style={[h.errorStyles.btn, h.errorStyles.btnSecondary, {borderColor: h.colors.accent.gold}]}
              onPress={() => Linking.openSettings()}
              activeOpacity={0.8}>
              <AppText variant="body2" color="primary">Open Settings</AppText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <TransportProvider
      chapters={h.chapters.map((ch, i, arr) => ({
        startTime: ch.startTime,
        endTime: i < arr.length - 1 ? arr[i + 1].startTime : Number.MAX_SAFE_INTEGER,
      }))}>
      <VideoPlayerInner h={h} />
    </TransportProvider>
  );
};

// ─── Inner Component (has TransportContext) ──────────────────

interface InnerProps {
  h: VideoPlayerHookData;
}

const VideoTransportDependentContent: React.FC<{
  h: VideoPlayerHookData;
  position: number;
  duration: number;
  isPlaying: boolean;
  pushPosition: (pos: number) => void;
}> = ({h, position, duration, isPlaying, pushPosition}) => {
  React.useEffect(() => {
    h.handlePushPositionRef(pushPosition);
  }, [pushPosition, h]);

  // ── Primary controls fade + slide (26.8 / §5.3: 200ms in, 150ms out) ──
  const controlsOpacity = React.useRef(new Animated.Value(h.secondaryVisible ? 1 : 0)).current;
  const controlsTranslateY = React.useRef(new Animated.Value(h.secondaryVisible ? 0 : 60)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(controlsOpacity, {
        toValue: h.secondaryVisible ? 1 : 0,
        duration: h.secondaryVisible ? 200 : 150,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(controlsTranslateY, {
        toValue: h.secondaryVisible ? 0 : 60,
        duration: h.secondaryVisible ? 200 : 150,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [h.secondaryVisible, controlsOpacity, controlsTranslateY]);

  return (
    <>
      {h.showVideoSurface && h.pipUiVisible && !h.controlsLocked && (
        <Animated.View style={{opacity: controlsOpacity, transform: [{translateY: controlsTranslateY}]}}>
          <h.PrimaryControls
          visible={h.secondaryVisible}
          position={position}
          duration={duration}
          isPlaying={isPlaying}
          chapters={h.chapters}
          onPlayPause={h.handlePlayPause}
          onPrev={h.handlePrev}
          onNext={h.handleNext}
          onSeek={h.handleSeek}
          bottomInset={h.uiBottomInset}
          controlScale={h.controlScale ?? 1}
        />
        </Animated.View>
      )}

      {h.pipUiVisible && <BufferingBar visible={h.isBuffering} />}

      <BottomSheet
        title="Chapters"
        visible={h.chaptersPanelOpen}
        onClose={() => h.setChaptersPanelOpen(false)}>
        <ChapterBrowser
          chapters={h.chapters.map(ch => ({
            title: ch.title,
            startTime: ch.startTime as number,
            endTime: ch.endTime as number,
          }))}
          currentTime={position}
          onSeek={h.handleChapterSeek}
        />
      </BottomSheet>

      <InfoSheet
        visible={h.infoSheetVisible}
        onClose={() => h.setInfoSheetVisible(false)}
        metadata={h.currentTrackMetadata || {
          title: h.title, artist: '', album: '', year: 0,
          genre: '', trackNumber: 0, albumArtUri: '', language: '', raw: {},
        }}
        chapters={h.chapters.map(ch => ({
          title: ch.title,
          startTime: ch.startTime as number,
          endTime: ch.endTime as number,
        }))}
        currentTime={position}
        onSeek={h.handleChapterSeek}
        relatedTracks={h.relatedTracks}
        onAddToPlaylist={h.handleInfoAddToPlaylist}
        onPlayRelatedTrack={h.handlePlayRelatedTrack}
      />

      {h.pipUiVisible && (
        <h.SeekFeedbackOverlay
          side={h.seekSide}
          visible={h.seekFeedbackVisible}
        />
      )}

      <PlaylistSheet
        visible={h.playlistSheetVisible}
        onClose={() => h.setPlaylistSheetVisible(false)}
        currentItem={{
          fileUri: h.fileUri || '',
          title: h.title,
          duration,
          artist: h.currentTrackMetadata?.artist,
          album: h.currentTrackMetadata?.album,
        }}
      />

      <QueueSheet
        visible={h.queueSheetVisible}
        onClose={h.handleCloseQueueSheet}
        currentTrack={{uri: h.fileUri || '', title: h.title, duration}}
        queue={h.queue}
        playbackHistory={h.playbackHistory}
        selectedQueueIndices={h.selectedQueueIndices}
        mode={h.queueMultiSelect ? 'multiSelect' : 'view'}
        onSelectQueueItem={h.handleSelectQueueItem}
        onSelectHistoryItem={h.handleSelectHistoryItem}
        onMoveUp={(idx) => h.handleQueueMoveItem(idx, 'up')}
        onMoveDown={(idx) => h.handleQueueMoveItem(idx, 'down')}
        onRemoveItem={h.handleQueueRemoveItem}
        onEnterMultiSelect={h.handleEnterMultiSelect}
        onExitMultiSelect={h.handleExitMultiSelect}
        onToggleSelection={h.handleToggleSelection}
        onRemoveSelected={h.handleRemoveSelected}
        onMoveSelectedToTop={h.handleMoveSelectedToTop}
        onClearAll={h.handleClearAll}
        onPlayNext={h.handlePlayNext}
        onAddToQueue={h.handleAddToQueue}
      />
    </>
  );
};

// ─── Main render ─────────────────────────────────────────────

const VideoPlayerInner: React.FC<InnerProps> = ({h}) => {
  const {position, duration, isPlaying, pushPosition, sleepRemainingMs, sleepTimerActive, sleepTimerMode} = useTransport();
  const dispatch = useAppDispatch();
  const sleepTimerEndTime = useAppSelector(state => state.player.sleepTimerEndTime);
  const [sleepTimerSheetVisible, setSleepTimerSheetVisible] = React.useState(false);

  // ── 31.5: fade-from-black on every file load ──
  const blackFade = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    if (h.loadingPhase !== 'ready') {
      blackFade.setValue(1);
    } else {
      Animated.timing(blackFade, {
        toValue: 0,
        duration: 400,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }).start();
    }
  }, [h.loadingPhase, blackFade]);

  // ── 31.5: dimmed ambient backdrop behind sheets ──
  const sheetOpen =
    h.chaptersPanelOpen ||
    h.audioPanelOpen ||
    h.subtitlePanelOpen ||
    h.eqPanelOpen ||
    h.playlistPanelOpen ||
    h.speedPanelOpen ||
    h.volumePanelOpen ||
    h.infoSheetVisible ||
    h.playlistSheetVisible ||
    h.queueSheetVisible ||
    h.bookmarkSheetVisible;
  const sheetDim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(sheetDim, {
      toValue: sheetOpen ? 1 : 0,
      duration: sheetOpen ? 200 : 150,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [sheetOpen, sheetDim]);

  // ── Top bar / toolbar fade + slide (26.8 / §5.3: 200ms in, 150ms out) ──
  const overlayOpacity = React.useRef(new Animated.Value(h.secondaryVisible ? 1 : 0)).current;
  const overlayTranslateYTop = React.useRef(new Animated.Value(h.secondaryVisible ? 0 : -60)).current;
  const overlayTranslateYBottom = React.useRef(new Animated.Value(h.secondaryVisible ? 0 : 60)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: h.secondaryVisible ? 1 : 0,
        duration: h.secondaryVisible ? 200 : 150,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(overlayTranslateYTop, {
        toValue: h.secondaryVisible ? 0 : -60,
        duration: h.secondaryVisible ? 200 : 150,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(overlayTranslateYBottom, {
        toValue: h.secondaryVisible ? 0 : 60,
        duration: h.secondaryVisible ? 200 : 150,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [h.secondaryVisible, overlayOpacity, overlayTranslateYBottom, overlayTranslateYTop]);

  return (
    <View style={[styles.root, {backgroundColor: h.colors.background.primary}]}>
      <SimbaStatusBar variant="player" />

      <View
        style={
          h.isLandscape
            ? {
                width: h.screenHeight,
                height: h.screenWidth,
                alignSelf: 'center',
                transform: [{rotate: '90deg'}],
                marginVertical: (h.screenHeight - h.screenWidth) / 2,
              }
            : styles.rotationNeutral
        }>
        <h.VideoPlayerSurfaceLayer
          pipScale={h.pipScale}
          pipTranslateX={h.pipTranslateX}
          pipTranslateY={h.pipTranslateY}
          nativePtr={h.nativePtr}
          showVideoSurface={h.showVideoSurface}
          controlsVisible={h.secondaryVisible}
          onSingleTap={h.handleSurfaceTap}
          onDoubleTapLeft={h.handleDoubleTapLeft}
          onDoubleTapRight={h.handleDoubleTapRight}
          onSwipeUp={h.handleSwipeUp}
          onSwipeDown={h.handleSwipeDown}
          onVolumeChange={h.handleVolumeSwipe}
          onBrightnessChange={h.handleBrightnessSwipe}
          onVolumeGestureEnd={h.handleVolumeGestureEnd}
          onBrightnessGestureEnd={h.handleBrightnessGestureEnd}
        />

        {/* 31.5: cinematic fade-from-black on load (above surface, below overlays) */}
        {h.pipUiVisible && (
          <Animated.View
            pointerEvents="none"
            style={[styles.blackFade, {opacity: blackFade}]}
          />
        )}

        {/* 31.5: dimmed ambient backdrop when any sheet is open */}
        {h.pipUiVisible && (
          <Animated.View
            pointerEvents="none"
            style={[styles.sheetDim, {opacity: sheetDim}]}
          />
        )}

        {/* 31.2: Resume / Start Over choice on load */}
        {h.pipUiVisible && h.resumePrompt && (
          <VideoPlayerResumeOverlay
            position={h.resumePrompt.position}
            onResume={() => h.handleResumeChoice(true)}
            onStartOver={() => h.handleResumeChoice(false)}
          />
        )}

        {/* 31.3: Up Next in 5s auto-advance card */}
        {h.pipUiVisible && h.autoAdvance && (
          <VideoPlayerAutoAdvanceCard
            title={h.autoAdvance.title}
            countdown={h.autoAdvanceCountdown}
            onNext={h.handleAutoAdvanceNow}
            onCancel={h.handleCancelAutoAdvance}
          />
        )}

        <VideoTransportDependentContent
          h={h}
          position={position}
          duration={duration}
          isPlaying={isPlaying}
          pushPosition={pushPosition}
        />

        {h.showVideoSurface && h.pipUiVisible && (
          <Animated.View style={{opacity: overlayOpacity, transform: [{translateY: overlayTranslateYTop}]}}>
            <h.VideoPlayerTopBar
              title={h.title}
              onGoBack={h.handleGoBack}
              topInset={h.uiTopInset}
              isLandscape={h.isLandscape}
              onToggleRotate={h.handleToggleRotate}
              onMorePress={h.handleMorePress}
              visible={h.secondaryVisible}
              onBookmark={h.handleOpenBookmarkSheet}
              bookmarkActive={h.bookmarkCountForFile > 0}
              controlsLocked={h.controlsLocked}
              onToggleLock={h.handleToggleLock}
            />

            {/* 50.3: countdown badge when a sleep timer is armed */}
            {sleepTimerActive && !h.controlsLocked && (
              <View style={[styles.sleepBadge, {top: h.uiTopInset + 52}]}>
                <AppText variant="caption" color="primary" style={styles.sleepBadgeText}>
                  {sleepTimerMode === 'time'
                    ? `Sleep ${formatSleepRemaining(sleepRemainingMs)}`
                    : sleepTimerModeLabel(sleepTimerMode)}
                </AppText>
              </View>
            )}
          </Animated.View>
        )}

        <BookmarkSheet
          visible={h.bookmarkSheetVisible}
          onClose={h.handleCloseBookmarkSheet}
          currentPosition={MpvPlayer.getPosition?.() ?? 0}
          duration={MpvPlayer.getDuration?.() ?? 0}
          fileUri={h.fileUri ?? ''}
          fileTitle={h.title}
          mediaType="video"
          bookmarks={h.bookmarksForFile}
          onSave={label => { h.handleAddBookmark(label); }}
          onDelete={h.handleRemoveBookmark}
          onJumpTo={h.handleBookmarkJumpTo}
        />

        <SleepTimerSheet
          visible={sleepTimerSheetVisible}
          onClose={() => setSleepTimerSheetVisible(false)}
          activeMode={sleepTimerMode}
          activeEndTime={sleepTimerEndTime}
          onSelectMinutes={minutes => dispatch(setSleepTimer(minutes))}
          onSelectMode={mode => dispatch(setSleepTimerMode(mode))}
          onCancel={() => dispatch(setSleepTimer(null))}
        />

        {h.showVideoSurface && h.pipUiVisible && !h.controlsLocked && (
          <Animated.View style={{opacity: overlayOpacity, transform: [{translateY: overlayTranslateYBottom}]}}>
            <h.SecondaryToolbar
              visible={h.secondaryVisible}
              enabled={true}
              eqEnabled={h.eqEnabled}
              shuffleActive={h.shuffle}
              loopMode={h.loopMode}
              playlistLength={h.playlist.length}
              activeSubtitle={h.activeSubtitle}
              subtitleVisible={h.subtitleVisible}
              activeAudioTrack={h.activeAudioTrack}
              subtitleLabel={h.subtitleLabel}
              audioLabel={h.audioLabel}
              onToggleChapters={h.handleToggleChapters}
              onToggleAudio={h.handleToggleAudio}
              onToggleSubtitles={h.handleToggleSubtitles}
              onToggleSubtitleVisibility={h.handleToggleSubtitleVisibility}
              onToggleEq={h.handleToggleEqPanel}
              onTogglePlaylist={h.handleTogglePlaylist}
              onInfo={h.handleInfo}
              onToggleShuffle={h.handleToggleShuffle}
              onToggleLoop={h.handleToggleLoop}
              onVolume={h.handleVolumeChange}
              onSpeed={() => h.setSpeedPanelOpen(true)}
              onScreenshot={h.handleScreenshot}
              onToggleQueue={() => h.setQueueSheetVisible(true)}
              onSleepTimer={() => setSleepTimerSheetVisible(true)}
              onAutoHide={() => h.setSecondaryVisible(false)}
              bottomInset={h.uiBottomInset}
            />
          </Animated.View>
        )}

        <BottomSheet
          title="Audio Tracks"
          snapPoints={['55%', '85%']}
          visible={h.audioPanelOpen}
          onClose={() => h.setAudioPanelOpen(false)}>
          <h.VideoPlayerAudioPanel
            audioTracks={h.audioTracks}
            activeAudioTrack={h.activeAudioTrack}
            onSelectTrack={h.handleSelectAudioTrack}
          />
        </BottomSheet>

        <BottomSheet
          title="Volume"
          visible={h.volumePanelOpen}
          onClose={() => h.setVolumePanelOpen(false)}>
          <h.VideoPlayerVolumePanel
            volume={h.volume}
            muted={h.muted}
            onVolumeChange={h.handleVolumeValueChange}
            onToggleMute={h.handleToggleMute}
          />
        </BottomSheet>

        <BottomSheet
          title="Subtitles"
          snapPoints={['65%', '92%']}
          visible={h.subtitlePanelOpen}
          onClose={() => h.setSubtitlePanelOpen(false)}>
          <h.VideoPlayerSubtitlePanel
            subtitleTracks={h.subtitleTracks}
            activeSubtitle={h.activeSubtitle}
            subtitleVisible={h.subtitleVisible}
            onSelectTrack={h.handleSelectSubtitle}
            onToggleVisibility={h.handleToggleSubtitleVisibility}
            onLoadExternal={h.handleLoadExternalSubtitle}
            subtitleFontSize={h.subtitleFontSize}
            onFontSizeChange={h.handleFontSizeChange}
            subtitleOpacity={h.subtitleOpacity}
            onOpacityChange={h.handleOpacityChange}
            subtitlePosition={h.subtitlePosition}
            onPositionChange={h.handleSubtitlePositionChange}
            subtitleTextColor={h.subtitleTextColor}
            onTextColorChange={h.handleTextColorChange}
            subtitleBgOpacity={h.subtitleBgOpacity}
            onBgOpacityChange={h.handleBgOpacityChange}
          />
        </BottomSheet>

        <BottomSheet
          title="Playback speed"
          visible={h.speedPanelOpen}
          onClose={() => h.setSpeedPanelOpen(false)}>
          <h.VideoPlayerSpeedPanel
            speed={h.speed}
            onSelect={h.handleSpeedSelect}
          />
        </BottomSheet>

        <BottomSheet
          title="Equalizer"
          visible={h.eqPanelOpen}
          onClose={() => h.setEqPanelOpen(false)}>
          <h.VideoPlayerEqualizerPanel
            eqGains={h.eqGains}
            eqEnabled={h.eqEnabled}
            onBandChange={h.handleBandChange}
            onToggle={h.handleToggleEq}
            onApplyPreset={h.handleApplyPreset}
            onReset={h.handleResetEq}
          />
        </BottomSheet>

        <BottomSheet
          title="Playlist"
          visible={h.playlistPanelOpen}
          onClose={() => h.setPlaylistPanelOpen(false)}>
          <h.VideoPlayerPlaylistPanel
            playlist={h.playlist.map(e => ({
              fileUri: e.uri,
              title: e.title,
              duration: e.duration,
            }))}
            currentIndex={h.currentIndex}
            onPlayFromPlaylist={h.handlePlayFromPlaylist}
            onRemoveFromPlaylist={h.handleRemoveFromPlaylist}
            onClearPlaylist={h.handleClearPlaylist}
            onAddToPlaylist={h.handleAddToPlaylist}
          />
        </BottomSheet>

        {h.pipUiVisible && (
          <h.VolumeBrightnessOverlay
            type="volume"
            value={h.volumeOverlayValue}
            visible={h.volumeOverlayVisible}
          />
        )}

        {h.pipUiVisible && (
          <h.VolumeBrightnessOverlay
            type="brightness"
            value={h.brightnessOverlayValue}
            visible={h.brightnessOverlayVisible}
          />
        )}

        <h.VideoPlayerLoadingOverlay
          visible={h.pipUiVisible && h.loadingPhase !== 'ready' && !h.error}
          message={h.loadingMessage}
        />

        {h.pipUiVisible && (
          <ReplayButton
            visible={h.showReplay}
            onReplay={h.handleReplay}
          />
        )}
      </View>
    </View>
  );
};

// ─── Static styles ───────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rotationNeutral: {
    flex: 1,
  },
  blackFade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    zIndex: 22,
  },
  sheetDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 25,
  },
  // 50.3: sleep timer countdown badge (top bar area)
  sleepBadge: {
    position: 'absolute',
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(201,168,76,0.85)',
  },
  sleepBadgeText: {
    fontSize: 12,
    color: '#000000',
  },
});

export default VideoPlayer;
