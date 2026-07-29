import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import {useTheme} from '../../theme';
import {AppText} from '../../components/core/AppText/AppText';
import {RootStackScreenProps} from '../../navigation/types';
import {TransportProvider, useTransport} from '../../contexts/TransportContext';

// ── Extracted Components ──
import {VideoPlayerSurfaceLayer} from './components/VideoPlayerSurfaceLayer';
import {VideoPlayerTopBar} from './components/VideoPlayerTopBar';
import {PrimaryControls} from './components/PrimaryControls';
import {SecondaryToolbar} from './components/SecondaryToolbar';
import {VideoPlayerSubtitlePanel} from './components/VideoPlayerSubtitlePanel';
import {VideoPlayerAudioPanel} from './components/VideoPlayerAudioPanel';
import {VideoPlayerEqualizerPanel} from './components/VideoPlayerEqualizerPanel';
import {VideoPlayerVolumePanel} from './components/VideoPlayerVolumePanel';
import {VideoPlayerSpeedPanel} from './components/VideoPlayerSpeedPanel';
import {VideoPlayerPlaylistPanel} from './components/VideoPlayerPlaylistPanel';
import {SimbaStatusBar} from '../../components/StatusBar';
import {VideoPlayerLoadingOverlay} from './components/VideoPlayerLoadingOverlay';
import {SeekFeedbackOverlay} from './components/SeekFeedbackOverlay';
import {VolumeBrightnessOverlay} from './components/VolumeBrightnessOverlay';
import {BottomSheet} from '../../components/sheets/BottomSheet/BottomSheet';
import {ChapterList} from '../../components/player/NowPlayingInfo/ChapterList';
import {InfoSheet} from '../../components/player/NowPlayingInfo/InfoSheet';
import {PlaylistSheet} from '../../components/sheets/PlaylistSheet';
import {QueueSheet} from '../../components/sheets/QueueSheet/QueueSheet';
// ── Types ──
import type {ScannedTrack} from '../../store/slices/mediaSlice';
import type {PlaylistEntry} from '../../store/slices/playerSlice';
import {MpvChapter} from '../../native';

// ── Hook ──
import {useVideoPlayerScreen} from './hooks/useVideoPlayerScreen';

// ── Types ──
type Props = RootStackScreenProps<'VideoPlayer'>;

// ── Screen ──
export const VideoPlayerScreen: React.FC<Props> = (props) => {
  return (
    <TransportProvider>
      <VideoPlayerScreenInner {...props} />
    </TransportProvider>
  );
};

const VideoPlayerScreenInner: React.FC<Props> = ({navigation, route}) => {
  const {
    colors,
    title,
    fileUri,

    // Core playback state
    secondaryVisible,
    setSecondaryVisible,
    volume,
    nativePtr,
    showVideoSurface,
    loadingPhase,
    error,
    errorIsPermission,
    chapters,

    // Subtitle state
    subtitleTracks,
    activeSubtitle,
    subtitleVisible,
    subtitlePanelOpen,
    setSubtitlePanelOpen,
    subtitleFontSize,
    subtitleOpacity,
    subtitlePosition,

    // Audio track state
    audioTracks,
    activeAudioTrack,
    audioPanelOpen,
    setAudioPanelOpen,
    volumePanelOpen,
    setVolumePanelOpen,
    muted,
    speed,
    speedPanelOpen,
    setSpeedPanelOpen,
    bookmarkSaved,

    // Equalizer state
    eqGains,
    eqEnabled,
    eqPanelOpen,
    setEqPanelOpen,

    // Playlist state
    playlistPanelOpen,
    setPlaylistPanelOpen,

    // Chapters panel state
    chaptersPanelOpen,
    setChaptersPanelOpen,

    // Info Sheet state
    infoSheetVisible,
    setInfoSheetVisible,

    // Playlist Sheet state
    playlistSheetVisible,
    setPlaylistSheetVisible,
    currentTrackMetadata,

    // Queue Sheet state
    queueSheetVisible,
    setQueueSheetVisible,
    queueMultiSelect,
    setQueueMultiSelect,

    // PiP
    pipUiVisible,

    // Gesture overlay state
    seekSide,
    seekFeedbackVisible,
    volumeOverlayValue,
    volumeOverlayVisible,
    brightnessOverlayValue,
    brightnessOverlayVisible,

    // Expanded mode
    isLandscape,
    screenWidth,
    screenHeight,
    uiTopInset,
    uiBottomInset,

    // Redux
    playlist,
    queue,
    currentIndex,
    loopMode,
    shuffle,
    playbackHistory,
    selectedQueueIndices,

    // Derived data
    relatedTracks,
    errorStyles,
    loadingMessage,

    // PiP animation values
    pipScale,
    pipTranslateX,
    pipTranslateY,

    // Navigation / lifecycle handlers
    handleGoBack,
    handleRetry,

    // Transport / playback handlers
    handlePlayPause,
    handleSurfaceTap,
    handlePrev,
    handleNext,
    handleSeek,
    handleChapterSeek,

    // Volume handlers
    handleVolumeChange,
    handleToggleMute,
    handleVolumeValueChange,
    handleSpeedSelect,
    handleAddBookmark,

    // Gesture handlers
    handleDoubleTapLeft,
    handleDoubleTapRight,
    handleSwipeUp,
    handleSwipeDown,
    handleScreenshot,

    // InfoSheet handlers
    handleInfo,
    handleInfoAddToPlaylist,
    handleMorePress,
    handlePlayRelatedTrack,

    // Volume/Brightness gesture handlers
    handleVolumeSwipe,
    handleBrightnessSwipe,
    handleVolumeGestureEnd,
    handleBrightnessGestureEnd,

    // Shuffle / Loop
    handleToggleShuffle,
    handleToggleLoop,

    // Subtitle handlers
    handleSelectSubtitle,
    handleToggleSubtitleVisibility,
    handleLoadExternalSubtitle,
    handleFontSizeChange,
    handleOpacityChange,
    handleSubtitlePositionChange,

    // Audio track handlers
    handleSelectAudioTrack,

    // Equalizer handlers
    handleBandChange,
    handleApplyPreset,
    handleResetEq,
    handleToggleEq,

    // Playlist handlers
    handleAddToPlaylist,
    handleRemoveFromPlaylist,
    handlePlayFromPlaylist,
    handleClearPlaylist,

    // Queue handlers
    handleQueueMoveItem,
    handleQueueRemoveItem,
    handleQueueSelectItem,
    handleSelectQueueItem,
    handleSelectHistoryItem,
    handlePlayNext,
    handleAddToQueue,
    handleCloseQueueSheet,

    // Queue multi-select handlers
    handleEnterMultiSelect,
    handleExitMultiSelect,
    handleToggleSelection,
    handleRemoveSelected,
    handleMoveSelectedToTop,
    handleClearAll,

    // Panel toggle handlers
    handleToggleRotate,
    handleToggleChapters,
    handleToggleAudio,
    handleToggleSubtitles,
    handleToggleEqPanel,
    handleTogglePlaylist,

    // Push position ref handler
    handlePushPositionRef,
  } = useVideoPlayerScreen(navigation, route);

  // ── VideoTransportDependentContent: reads transport state to isolate frequent re-renders ──
  interface VideoTransportDependentContentProps {
    showVideoSurface: boolean;
    secondaryVisible: boolean;
    chapters: MpvChapter[];
    onPlayPause: () => void;
    onPrev: () => void;
    onNext: () => void;
    onSeek: (pct: number) => void;
    bottomInset: number;
    chaptersPanelOpen: boolean;
    onCloseChapters: () => void;
    onChapterSeek: (time: number) => void;
    infoSheetVisible: boolean;
    onCloseInfo: () => void;
    infoMetadata: {
      title: string;
      artist: string;
      album: string;
      year: number;
      genre: string;
      trackNumber: number;
      albumArtUri: string;
      language: string;
      raw: Record<string, string>;
    };
    infoRelatedTracks: ScannedTrack[];
    onAddToPlaylistFromInfo: () => void;
    onPlayRelatedTrack: (track: ScannedTrack) => void;
    seekSide: 'left' | 'right';
    seekFeedbackVisible: boolean;
    pipUiVisible: boolean;
    playlistSheetVisible: boolean;
    onClosePlaylistSheet: () => void;
    playlistSheetFileUri: string;
    playlistSheetTitle: string;
    playlistSheetArtist?: string;
    playlistSheetAlbum?: string;
    queueSheetVisible: boolean;
    onCloseQueueSheet: () => void;
    queue: PlaylistEntry[];
    playbackHistory: PlaylistEntry[];
    selectedQueueIndices: number[];
    queueMultiSelect: boolean;
    currentFileUri: string;
    currentTitle: string;
    onSelectQueueItem: (idx: number) => void;
    onSelectHistoryItem: (idx: number) => void;
    onQueueMoveUp: (idx: number) => void;
    onQueueMoveDown: (idx: number) => void;
    onQueueRemoveItem: (idx: number) => void;
    onEnterMultiSelect: () => void;
    onExitMultiSelect: () => void;
    onToggleSelection: (idx: number) => void;
    onRemoveSelected: () => void;
    onMoveSelectedToTop: () => void;
    onClearAll: () => void;
    onPlayNext: (entry: PlaylistEntry) => void;
    onAddToQueue: (entry: PlaylistEntry) => void;
    onPushPositionRef: (fn: (pos: number) => void) => void;
  }

  const VideoTransportDependentContent: React.FC<VideoTransportDependentContentProps> = ({
    showVideoSurface, secondaryVisible,
    chapters, onPlayPause, onPrev, onNext, onSeek, bottomInset,
    chaptersPanelOpen, onCloseChapters, onChapterSeek,
    infoSheetVisible, onCloseInfo, infoMetadata, infoRelatedTracks,
    onAddToPlaylistFromInfo, onPlayRelatedTrack,
    seekSide, seekFeedbackVisible, pipUiVisible,
    playlistSheetVisible, onClosePlaylistSheet,
    playlistSheetFileUri, playlistSheetTitle, playlistSheetArtist, playlistSheetAlbum,
    queueSheetVisible, onCloseQueueSheet, queue, playbackHistory, selectedQueueIndices,
    queueMultiSelect, currentFileUri, currentTitle,
    onSelectQueueItem, onSelectHistoryItem,
    onQueueMoveUp, onQueueMoveDown, onQueueRemoveItem,
    onEnterMultiSelect, onExitMultiSelect, onToggleSelection,
    onRemoveSelected, onMoveSelectedToTop, onClearAll,
    onPlayNext, onAddToQueue,
    onPushPositionRef,
  }) => {
    const {position, duration, isPlaying, pushPosition} = useTransport();

    // Sync pushPosition to parent ref for event-driven position updates
    React.useEffect(() => {
      onPushPositionRef(pushPosition);
    }, [pushPosition, onPushPositionRef]);

    return (
      <>
        {/* ── Primary Controls — Always Visible outside PiP (seek bar + transport) ── */}
        {showVideoSurface && pipUiVisible && (
          <PrimaryControls
            visible={secondaryVisible}
            position={position}
            duration={duration}
            isPlaying={isPlaying}
            chapters={chapters}
            onPlayPause={onPlayPause}
            onPrev={onPrev}
            onNext={onNext}
            onSeek={onSeek}
            bottomInset={bottomInset}
          />
        )}

        {/* ── BottomSheet: Chapters ── */}
        <BottomSheet
          title="Chapters"
          visible={chaptersPanelOpen}
          onClose={onCloseChapters}>
          <ChapterList
            chapters={chapters.map(ch => ({
              title: ch.title,
              startTime: ch.startTime as number,
              endTime: ch.endTime as number,
            }))}
            currentTime={position}
            onSeek={onChapterSeek}
          />
        </BottomSheet>

        {/* ── Info Sheet (Phase 8) ── */}
        <InfoSheet
          visible={infoSheetVisible}
          onClose={onCloseInfo}
          metadata={infoMetadata}
          chapters={chapters.map(ch => ({
            title: ch.title,
            startTime: ch.startTime as number,
            endTime: ch.endTime as number,
          }))}
          currentTime={position}
          onSeek={onChapterSeek}
          relatedTracks={infoRelatedTracks}
          onAddToPlaylist={onAddToPlaylistFromInfo}
          onPlayRelatedTrack={onPlayRelatedTrack}
        />

        {/* ── Seek feedback overlay (3.5) ── */}
        {pipUiVisible && (
          <SeekFeedbackOverlay
            side={seekSide}
            visible={seekFeedbackVisible}
          />
        )}

        {/* ── Playlist Sheet (Phase 9) ── */}
        <PlaylistSheet
          visible={playlistSheetVisible}
          onClose={onClosePlaylistSheet}
          currentItem={{
            fileUri: playlistSheetFileUri,
            title: playlistSheetTitle,
            duration,
            artist: playlistSheetArtist,
            album: playlistSheetAlbum,
          }}
        />

        {/* ── Queue Sheet (Phase 23) ── */}
        <QueueSheet
          visible={queueSheetVisible}
          onClose={onCloseQueueSheet}
          currentTrack={{uri: currentFileUri, title: currentTitle, duration}}
          queue={queue}
          playbackHistory={playbackHistory}
          selectedQueueIndices={selectedQueueIndices}
          mode={queueMultiSelect ? 'multiSelect' : 'view'}
          onSelectQueueItem={onSelectQueueItem}
          onSelectHistoryItem={onSelectHistoryItem}
          onMoveUp={onQueueMoveUp}
          onMoveDown={onQueueMoveDown}
          onRemoveItem={onQueueRemoveItem}
          onEnterMultiSelect={onEnterMultiSelect}
          onExitMultiSelect={onExitMultiSelect}
          onToggleSelection={onToggleSelection}
          onRemoveSelected={onRemoveSelected}
          onMoveSelectedToTop={onMoveSelectedToTop}
          onClearAll={onClearAll}
          onPlayNext={onPlayNext}
          onAddToQueue={onAddToQueue}
        />
      </>
    );
  };

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════

  // ── Error full-screen overlay ──
  if (error) {
    return (
      <View style={[styles.root, errorStyles.container]}>
        <View style={errorStyles.iconCircle}>
          <AppText style={errorStyles.icon}>!</AppText>
        </View>
        <AppText
          variant="h2"
          color="primary"
          style={errorStyles.title}>
          {error.title}
        </AppText>
        <AppText
          variant="body2"
          color="secondary"
          style={errorStyles.message}>
          {error.message}
        </AppText>
        {error.detail && (
          <AppText
            variant="caption"
            color="tertiary"
            style={errorStyles.detail}>
            {error.detail}
          </AppText>
        )}
        <View style={errorStyles.actions}>
          <TouchableOpacity
            style={[errorStyles.btn, errorStyles.btnPrimary]}
            onPress={handleRetry}
            activeOpacity={0.8}>
            <AppText style={errorStyles.btnPrimaryLabel}>Retry</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[errorStyles.btn, errorStyles.btnSecondary]}
            onPress={handleGoBack}
            activeOpacity={0.8}>
            <AppText variant="body2" color="primary">
              Choose Different File
            </AppText>
          </TouchableOpacity>
          {errorIsPermission && (
            <TouchableOpacity
              style={[errorStyles.btn, errorStyles.btnSecondary, {borderColor: colors.accent.gold}]}
              onPress={() => Linking.openSettings()}
              activeOpacity={0.8}>
              <AppText variant="body2" color="primary">
                Open Settings
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ── Main player layout ──
  return (
    <View style={[styles.root, {backgroundColor: colors.background.primary}]}>
      <SimbaStatusBar variant="player" />

      {/* ── View-rotation wrapper (instead of device rotation) ── */}
      <View
        style={
          isLandscape
            ? {
                width: screenHeight,
                height: screenWidth,
                alignSelf: 'center',
                transform: [{rotate: '90deg'}],
                marginVertical: (screenHeight - screenWidth) / 2,
              }
            : styles.rotationNeutral
        }>
      <VideoPlayerSurfaceLayer
        pipScale={pipScale}
        pipTranslateX={pipTranslateX}
        pipTranslateY={pipTranslateY}
        nativePtr={nativePtr}
        showVideoSurface={showVideoSurface}
        controlsVisible={secondaryVisible}
        onSingleTap={handleSurfaceTap}
        onDoubleTapLeft={handleDoubleTapLeft}
        onDoubleTapRight={handleDoubleTapRight}
        onSwipeUp={handleSwipeUp}
        onSwipeDown={handleSwipeDown}
        onVolumeChange={handleVolumeSwipe}
        onBrightnessChange={handleBrightnessSwipe}
        onVolumeGestureEnd={handleVolumeGestureEnd}
        onBrightnessGestureEnd={handleBrightnessGestureEnd}
      />
      <VideoTransportDependentContent
        showVideoSurface={showVideoSurface}
        secondaryVisible={secondaryVisible}
        chapters={chapters}
        onPlayPause={handlePlayPause}
        onPrev={handlePrev}
        onNext={handleNext}
        onSeek={handleSeek}
        bottomInset={uiBottomInset}
        chaptersPanelOpen={chaptersPanelOpen}
        onCloseChapters={() => setChaptersPanelOpen(false)}
        onChapterSeek={handleChapterSeek}
        infoSheetVisible={infoSheetVisible}
        onCloseInfo={() => setInfoSheetVisible(false)}
        infoMetadata={currentTrackMetadata || {
          title,
          artist: '',
          album: '',
          year: 0,
          genre: '',
          trackNumber: 0,
          albumArtUri: '',
          language: '',
          raw: {},
        }}
        infoRelatedTracks={relatedTracks}
        onAddToPlaylistFromInfo={handleInfoAddToPlaylist}
        onPlayRelatedTrack={handlePlayRelatedTrack}
        seekSide={seekSide}
        seekFeedbackVisible={seekFeedbackVisible}
        pipUiVisible={pipUiVisible}
        playlistSheetVisible={playlistSheetVisible}
        onClosePlaylistSheet={() => setPlaylistSheetVisible(false)}
        playlistSheetFileUri={fileUri || ''}
        playlistSheetTitle={title}
        playlistSheetArtist={currentTrackMetadata?.artist}
        playlistSheetAlbum={currentTrackMetadata?.album}
        queueSheetVisible={queueSheetVisible}
        onCloseQueueSheet={handleCloseQueueSheet}
        queue={queue}
        playbackHistory={playbackHistory}
        selectedQueueIndices={selectedQueueIndices}
        queueMultiSelect={queueMultiSelect}
        currentFileUri={fileUri || ''}
        currentTitle={title}
        onSelectQueueItem={handleSelectQueueItem}
        onSelectHistoryItem={handleSelectHistoryItem}
        onQueueMoveUp={(idx) => handleQueueMoveItem(idx, 'up')}
        onQueueMoveDown={(idx) => handleQueueMoveItem(idx, 'down')}
        onQueueRemoveItem={handleQueueRemoveItem}
        onEnterMultiSelect={handleEnterMultiSelect}
        onExitMultiSelect={handleExitMultiSelect}
        onToggleSelection={handleToggleSelection}
        onRemoveSelected={handleRemoveSelected}
        onMoveSelectedToTop={handleMoveSelectedToTop}
        onClearAll={handleClearAll}
        onPlayNext={handlePlayNext}
        onAddToQueue={handleAddToQueue}
        onPushPositionRef={handlePushPositionRef}
      />

      {/* ── Top Bar (hidden during PiP) ── */}
      {showVideoSurface && pipUiVisible && (
        <VideoPlayerTopBar
          title={title}
          onGoBack={handleGoBack}
          topInset={uiTopInset}
          isLandscape={isLandscape}
          onToggleRotate={handleToggleRotate}
          onMorePress={handleMorePress}
          visible={secondaryVisible}
          onBookmark={handleAddBookmark}
          bookmarkActive={bookmarkSaved}
        />
      )}

      {/* ── Secondary Toolbar — Collapsible (hidden during PiP) ── */}
      {showVideoSurface && pipUiVisible && (
        <SecondaryToolbar
          visible={secondaryVisible}
          enabled={true}
          eqEnabled={eqEnabled}
          shuffleActive={shuffle}
          loopMode={loopMode}
          playlistLength={playlist.length}
          activeSubtitle={activeSubtitle}
          activeAudioTrack={activeAudioTrack}
          onToggleChapters={handleToggleChapters}
          onToggleAudio={handleToggleAudio}
          onToggleSubtitles={handleToggleSubtitles}
          onToggleEq={handleToggleEqPanel}
          onTogglePlaylist={handleTogglePlaylist}
          onInfo={handleInfo}
          onToggleShuffle={handleToggleShuffle}
          onToggleLoop={handleToggleLoop}
          onVolume={handleVolumeChange}
          onSpeed={() => setSpeedPanelOpen(true)}
          onScreenshot={handleScreenshot}
          onToggleQueue={() => setQueueSheetVisible(true)}
          onAutoHide={() => setSecondaryVisible(false)}
          bottomInset={uiBottomInset}
        />
      )}

      {/* ── BottomSheet: Audio Tracks ── */}
      <BottomSheet
        title="Audio Tracks"
        snapPoints={['55%', '85%']}
        visible={audioPanelOpen}
        onClose={() => setAudioPanelOpen(false)}>
        <VideoPlayerAudioPanel
          audioTracks={audioTracks}
          activeAudioTrack={activeAudioTrack}
          onSelectTrack={handleSelectAudioTrack}
        />
      </BottomSheet>

      <BottomSheet
        title="Volume"
        visible={volumePanelOpen}
        onClose={() => setVolumePanelOpen(false)}>
        <VideoPlayerVolumePanel
          volume={volume}
          muted={muted}
          onVolumeChange={handleVolumeValueChange}
          onToggleMute={handleToggleMute}
        />
      </BottomSheet>

      {/* ── BottomSheet: Subtitles ── */}
      <BottomSheet
        title="Subtitles"
        snapPoints={['65%', '92%']}
        visible={subtitlePanelOpen}
        onClose={() => setSubtitlePanelOpen(false)}>
        <VideoPlayerSubtitlePanel
          subtitleTracks={subtitleTracks}
          activeSubtitle={activeSubtitle}
          subtitleVisible={subtitleVisible}
          onSelectTrack={handleSelectSubtitle}
          onToggleVisibility={handleToggleSubtitleVisibility}
          onLoadExternal={handleLoadExternalSubtitle}
          subtitleFontSize={subtitleFontSize}
          onFontSizeChange={handleFontSizeChange}
          subtitleOpacity={subtitleOpacity}
          onOpacityChange={handleOpacityChange}
          subtitlePosition={subtitlePosition}
          onPositionChange={handleSubtitlePositionChange}
        />
      </BottomSheet>

      <BottomSheet
        title="Playback speed"
        visible={speedPanelOpen}
        onClose={() => setSpeedPanelOpen(false)}>
        <VideoPlayerSpeedPanel speed={speed} onSelect={handleSpeedSelect} />
      </BottomSheet>

      {/* ── BottomSheet: Equalizer ── */}
      <BottomSheet
        title="Equalizer"
        visible={eqPanelOpen}
        onClose={() => setEqPanelOpen(false)}>
        <VideoPlayerEqualizerPanel
          eqGains={eqGains}
          eqEnabled={eqEnabled}
          onBandChange={handleBandChange}
          onToggle={handleToggleEq}
          onApplyPreset={handleApplyPreset}
          onReset={handleResetEq}
        />
      </BottomSheet>

      {/* ── BottomSheet: Playlist ── */}
      <BottomSheet
        title="Playlist"
        visible={playlistPanelOpen}
        onClose={() => setPlaylistPanelOpen(false)}>
        <VideoPlayerPlaylistPanel
          playlist={playlist.map(e => ({
            fileUri: e.uri,
            title: e.title,
            duration: e.duration,
          }))}
          currentIndex={currentIndex}
          onPlayFromPlaylist={handlePlayFromPlaylist}
          onRemoveFromPlaylist={handleRemoveFromPlaylist}
          onClearPlaylist={handleClearPlaylist}
          onAddToPlaylist={handleAddToPlaylist}
        />
      </BottomSheet>

      {/* ── Volume overlay (3.6) ── */}
      {pipUiVisible && (
        <VolumeBrightnessOverlay
          type="volume"
          value={volumeOverlayValue}
          visible={volumeOverlayVisible}
        />
      )}

      {/* ── Brightness overlay (3.6) ── */}
      {pipUiVisible && (
        <VolumeBrightnessOverlay
          type="brightness"
          value={brightnessOverlayValue}
          visible={brightnessOverlayVisible}
        />
      )}

      {/* ── Loading overlay ── */}
      <VideoPlayerLoadingOverlay
        visible={pipUiVisible && loadingPhase !== 'ready' && !error}
        message={loadingMessage}
      />
    </View>
    {/* ── End view-rotation wrapper ── */}
  </View>
  );
};

// ── Static styles ──
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rotationNeutral: {
    flex: 1,
  },
});
