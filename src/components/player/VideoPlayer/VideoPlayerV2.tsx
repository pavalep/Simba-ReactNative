import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Animated,
  Easing,
} from 'react-native';
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
import {ReplayButton} from '../ReplayButton/ReplayButton';
import {VideoPlayerResumeOverlay} from '../../../screens/VideoPlayer/components/VideoPlayerResumeOverlay';
import {VideoPlayerAutoAdvanceCard} from '../../../screens/VideoPlayer/components/VideoPlayerAutoAdvanceCard';
import {MpvPlayer} from '../../../native';
import {navigate} from '../../../navigation/navigationHelper';
import {useAppDispatch, useAppSelector} from '../../../store';
import {setSleepTimer, setSleepTimerMode} from '../../../store/slices/playerSlice';
import {formatSleepRemaining, sleepTimerModeLabel} from '../../../utils/sleepTimer';
import type {VideoPlayerHookData} from './VideoPlayer';

// ═══════════════════════════════════════════════════════════════
// VideoPlayerV2 — Clean layered architecture
//
// Layer 0 (z:0):   Native video surface + gestures (absoluteFill)
// Layer 1 (z:5):   Black fade veil (absoluteFill, pointerEvents=none)
// Layer 2 (z:8):   Sheet dim backdrop (absoluteFill, pointerEvents=none)
// Layer 3 (z:15):  Bottom panel = PrimaryControls + embedded SecondaryToolbar
// Layer 4 (z:20):  Top bar (absolute, top)
// Layer 5 (z:50):  Loading/buffering overlay (absoluteFill)
// Layer 6+:        Resume overlay, auto-advance, feedback overlays
// Layer 7+:        Bottom sheets (own z-index managed by BottomSheet)
//
// Every overlay layer uses StyleSheet.absoluteFill so it never
// collapses to height:0.  PrimaryControls handles its own abs
// positioning internally (bottom:0); the V2 wrapper routes only
// opacity & translateY animations.
// ═══════════════════════════════════════════════════════════════

export const VideoPlayerV2: React.FC<VideoPlayerHookData> = (h) => {
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
            activeOpacity={0.8}
            accessibilityRole="button">
            <AppText style={h.errorStyles.btnPrimaryLabel}>Retry</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[h.errorStyles.btn, h.errorStyles.btnSecondary]}
            onPress={h.handleGoBack}
            activeOpacity={0.8}
            accessibilityRole="button">
            <AppText variant="body2" color="primary">Choose Different File</AppText>
          </TouchableOpacity>
          {h.errorIsPermission && (
            <TouchableOpacity
              style={[h.errorStyles.btn, h.errorStyles.btnSecondary, {borderColor: h.colors.accent.gold}]}
              onPress={() => Linking.openSettings()}
              activeOpacity={0.8}
              accessibilityRole="button">
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
      <VideoPlayerV2Inner h={h} />
    </TransportProvider>
  );
};

// ─── Inner (has TransportContext) ─────────────────────────────

const VideoPlayerV2Inner: React.FC<{h: VideoPlayerHookData}> = ({h}) => {
  const {position, duration, isPlaying, pushPosition, sleepRemainingMs, sleepTimerActive, sleepTimerMode} = useTransport();
  const dispatch = useAppDispatch();
  const sleepTimerEndTime = useAppSelector(state => state.player.sleepTimerEndTime);
  const [sleepTimerSheetVisible, setSleepTimerSheetVisible] = React.useState(false);

  // ── Push position ref for bookmark sheet ──
  React.useEffect(() => {
    h.handlePushPositionRef(pushPosition);
  }, [pushPosition, h]);

  // ── Black fade: covers video until first frame renders ──
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

  // ── Sheet dim backdrop ──
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

  // ── Top bar animation ──
  const topOpacity = React.useRef(new Animated.Value(h.secondaryVisible ? 1 : 0)).current;
  const topTranslateY = React.useRef(new Animated.Value(h.secondaryVisible ? 0 : -60)).current;
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(topOpacity, {
        toValue: h.secondaryVisible ? 1 : 0,
        duration: h.secondaryVisible ? 200 : 150,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(topTranslateY, {
        toValue: h.secondaryVisible ? 0 : -60,
        duration: h.secondaryVisible ? 200 : 150,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [h.secondaryVisible, topOpacity, topTranslateY]);

  // ── Bottom controls animation (shared by Primary + Secondary) ──
  const bottomOpacity = React.useRef(new Animated.Value(h.secondaryVisible ? 1 : 0)).current;
  const bottomTranslateY = React.useRef(new Animated.Value(h.secondaryVisible ? 0 : 60)).current;
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(bottomOpacity, {
        toValue: h.secondaryVisible ? 1 : 0,
        duration: h.secondaryVisible ? 200 : 150,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(bottomTranslateY, {
        toValue: h.secondaryVisible ? 0 : 60,
        duration: h.secondaryVisible ? 200 : 150,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [h.secondaryVisible, bottomOpacity, bottomTranslateY]);

  // ── Gate: should controls be rendered? ──
  const showTopBar = h.showVideoSurface && h.pipUiVisible;
  const showPrimaryControls = h.showVideoSurface && h.pipUiVisible && !h.controlsLocked;
  const showSecondaryToolbar = h.showVideoSurface && h.pipUiVisible && !h.controlsLocked;

  return (
    <View style={[styles.root, {backgroundColor: '#000000'}]}>
      <SimbaStatusBar variant="player" />

      {/* ═══ Layer 0: Video surface + gestures (absoluteFill) ═══ */}
      <h.VideoPlayerSurfaceLayer
        pipScale={h.pipScale}
        pipTranslateX={h.pipTranslateX}
        pipTranslateY={h.pipTranslateY}
        nativePtr={h.nativePtr}
        showVideoSurface={h.showVideoSurface}
        controlsVisible={h.secondaryVisible}
        loadingPhase={h.loadingPhase}
        onSingleTap={h.handleSurfaceTap}
        onDoubleTapLeft={h.handleDoubleTapLeft}
        onDoubleTapRight={h.handleDoubleTapRight}
        onSwipeUp={h.handleSwipeUp}
        onSwipeDown={h.handleSwipeDown}
        onVolumeChange={h.handleVolumeSwipe}
        onBrightnessChange={h.handleBrightnessSwipe}
        onVolumeGestureEnd={h.handleVolumeGestureEnd}
        onBrightnessGestureEnd={h.handleBrightnessGestureEnd}
        onPlayPause={h.handlePlayPause}
      />

      {/* ═══ Layer 1: Black fade veil (z:5, absoluteFill) ═══ */}
      {h.pipUiVisible && (
        <Animated.View
          pointerEvents="none"
          style={[styles.absolute, styles.blackFade, {opacity: blackFade}]}
        />
      )}

      {/* ═══ Layer 2: Sheet dim backdrop (z:8, absoluteFill) ═══ */}
      {h.pipUiVisible && (
        <Animated.View
          pointerEvents="none"
          style={[styles.absolute, styles.sheetDim, {opacity: sheetDim}]}
        />
      )}

      {/* ═══ Layer 4: Unified Bottom Controls Panel (z:15) ═══ */}
      {/* PrimaryControls handles its own position:absolute;bottom:0 internally */}
      {showPrimaryControls && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.bottomPanel,
            {opacity: bottomOpacity, transform: [{translateY: bottomTranslateY}]},
          ]}>
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
            bufferedFraction={h.bufferedPercent}
            controlScale={h.controlScale ?? 1}
            SecondaryToolbar={
              showSecondaryToolbar ? (
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
                  volume={h.volume}
                  muted={h.muted}
                  onVolumeValueChange={h.handleVolumeValueChange}
                  onToggleMute={h.handleToggleMute}
                />
              ) : null
            }
          />
        </Animated.View>
      )}

      {/* ═══ Layer 5: Top bar (z:20, absolute top) ═══ */}
      {showTopBar && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.topBar,
            {opacity: topOpacity, transform: [{translateY: topTranslateY}]},
          ]}>
          <h.VideoPlayerTopBar
            title={h.title}
            onGoBack={h.handleGoBack}
            topInset={h.uiTopInset}
            isLandscape={h.isLandscape}
            onToggleRotate={h.handleToggleRotate}
            onMorePress={h.handleMorePress}
            onShare={h.handleShare}
            visible={h.secondaryVisible}
            onBookmark={h.handleOpenBookmarkSheet}
            bookmarkActive={h.bookmarkCountForFile > 0}
            controlsLocked={h.controlsLocked}
            onToggleLock={h.handleToggleLock}
            liveBadge={h.isLive}
            channelUp={h.channelUp}
            channelDown={h.channelDown}
          />

          {/* Sleep timer badge */}
          {sleepTimerActive && !h.controlsLocked && (
            <View style={[styles.sleepBadge, {top: h.uiTopInset + 52}]}>
              <AppText variant="caption" style={styles.sleepBadgeText}>
                {sleepTimerMode === 'time'
                  ? `Sleep ${formatSleepRemaining(sleepRemainingMs)}`
                  : sleepTimerModeLabel(sleepTimerMode)}
              </AppText>
            </View>
          )}
        </Animated.View>
      )}

      {/* ═══ Layer 6: Loading / buffering overlay (z:50, absoluteFill) ═══ */}
      <h.VideoPlayerLoadingOverlay
        visible={
          h.pipUiVisible &&
          !h.error &&
          (h.loadingPhase !== 'ready' || h.isBuffering)
        }
        message={
          h.loadingPhase !== 'ready'
            ? h.loadingMessage
            : 'Buffering…'
        }
        onBack={h.handleGoBack}
      />

      {/* ═══ Layer 7+: Resume overlay, auto-advance, feedback ═══ */}
      {h.pipUiVisible && h.resumePrompt && (
        <VideoPlayerResumeOverlay
          position={h.resumePrompt.position}
          onResume={() => h.handleResumeChoice(true)}
          onStartOver={() => h.handleResumeChoice(false)}
        />
      )}

      {h.pipUiVisible && h.autoAdvance && (
        <VideoPlayerAutoAdvanceCard
          title={h.autoAdvance.title}
          countdown={h.autoAdvanceCountdown}
          onNext={h.handleAutoAdvanceNow}
          onCancel={h.handleCancelAutoAdvance}
        />
      )}

      {h.pipUiVisible && (
        <h.SeekFeedbackOverlay
          side={h.seekSide}
          visible={h.seekFeedbackVisible}
        />
      )}

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

      {h.pipUiVisible && (
        <ReplayButton
          visible={h.showReplay}
          onReplay={h.handleReplay}
        />
      )}

      {/* ═══ Layer 8+: Bottom sheets ═══ */}
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
        onOpenFullPage={() => {
          h.handleCloseQueueSheet();
          navigate('Queue', {from: 'video'});
        }}
      />

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
    </View>
  );
};

// ─── Static styles ───────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  /** Base absolute-fill for overlay layers */
  absolute: {
    ...StyleSheet.absoluteFill,
  },
  /** V2: zIndex below controls (5) so it tints the video but never covers top/bottom bars */
  blackFade: {
    zIndex: 5,
    backgroundColor: '#000000',
  },
  /** V2: dim backdrop below sheets, above video */
  sheetDim: {
    zIndex: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  /**
   * V2: Bottom panel wrapper — NOT absolutely positioned.
   * PrimaryControls handles its own position:absolute;bottom:0 internally.
   * This wrapper exists only for opacity/translateY animation routing.
   */
  bottomPanel: {
    zIndex: 15,
  },
  /** V2: Top bar — absolutely pinned to top */
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  /** Sleep timer countdown badge pinned top-right */
  sleepBadge: {
    position: 'absolute',
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#D4B47A',
  },
  sleepBadgeText: {
    fontSize: 12,
    color: '#000000',
  },
});

export default VideoPlayerV2;
