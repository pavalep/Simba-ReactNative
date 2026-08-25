import {useVideoPlayerScreen} from '../hooks/useVideoPlayerScreen';
import type {PlaybackNavigation, VideoPlaybackParams} from '../../types';

type LegacyVideoController = ReturnType<typeof useVideoPlayerScreen>;

/**
 * The narrow orchestration port consumed by the V2 adapter. The legacy hook
 * remains an implementation detail of this boundary; presentation never sees
 * its unrelated gesture, Redux, or panel state.
 */
export type VideoV2Controller = Pick<LegacyVideoController,
  | 'colors' | 'insets' | 'title' | 'fileUri' | 'isLive' | 'uiTopInset' | 'uiBottomInset'
  | 'nativePtr' | 'showVideoSurface' | 'isReady' | 'secondaryVisible' | 'setSecondaryVisible'
  | 'controlsLocked' | 'isBuffering' | 'volume' | 'muted' | 'speed' | 'loopMode' | 'shuffle' | 'subtitleVisible'
  | 'activeSubtitle' | 'activeAudioTrack' | 'subtitleFontSize' | 'subtitleOpacity' | 'subtitlePosition' | 'subtitleTextColor' | 'subtitleBgOpacity' | 'subtitleTracks' | 'audioTracks' | 'chapters'
  | 'queue' | 'playlist' | 'currentIndex' | 'error' | 'loadingPhase' | 'showReplay' | 'isLandscape' | 'currentTrackMetadata'
  | 'handleReplay' | 'handleSurfaceTap' | 'handlePlayPause' | 'handlePrev' | 'handleNext'
  | 'handleDoubleTapLeft' | 'handleDoubleTapRight' | 'handleToggleLock' | 'handleSeek' | 'handleToggleSubtitleVisibility' | 'handleToggleRotate'
  | 'triggerShrinkAndEnterPip' | 'handleShare' | 'handleScreenshot' | 'handleRetry'
  | 'handleVolumeValueChange' | 'handleToggleMute' | 'handleSelectSubtitle'
  | 'handleSelectAudioTrack' | 'handleSpeedSelect' | 'handleFontSizeChange' | 'handleOpacityChange' | 'handleSubtitlePositionChange' | 'handleTextColorChange' | 'handleBgOpacityChange' | 'handleToggleLoop' | 'handleToggleShuffle' | 'handleQueueSelectItem'
  | 'handleChapterSeek'
>;

export function useVideoV2Controller(navigation: PlaybackNavigation, route: {params?: VideoPlaybackParams}): VideoV2Controller {
  const legacy = useVideoPlayerScreen(navigation, route);
  return {
    colors: legacy.colors,
    insets: legacy.insets,
    title: legacy.title,
    fileUri: legacy.fileUri,
    isLive: legacy.isLive,
    uiTopInset: legacy.uiTopInset,
    uiBottomInset: legacy.uiBottomInset,
    nativePtr: legacy.nativePtr,
    showVideoSurface: legacy.showVideoSurface,
    isReady: legacy.isReady,
    secondaryVisible: legacy.secondaryVisible,
    setSecondaryVisible: legacy.setSecondaryVisible,
    controlsLocked: legacy.controlsLocked,
    isBuffering: legacy.isBuffering,
    volume: legacy.volume,
    muted: legacy.muted,
    speed: legacy.speed,
    loopMode: legacy.loopMode,
    shuffle: legacy.shuffle,
    subtitleVisible: legacy.subtitleVisible,
    activeSubtitle: legacy.activeSubtitle,
    activeAudioTrack: legacy.activeAudioTrack,
    subtitleFontSize: legacy.subtitleFontSize,
    subtitleOpacity: legacy.subtitleOpacity,
    subtitlePosition: legacy.subtitlePosition,
    subtitleTextColor: legacy.subtitleTextColor,
    subtitleBgOpacity: legacy.subtitleBgOpacity,
    subtitleTracks: legacy.subtitleTracks,
    audioTracks: legacy.audioTracks,
    chapters: legacy.chapters,
    queue: legacy.queue,
    playlist: legacy.playlist,
    currentIndex: legacy.currentIndex,
    error: legacy.error,
    loadingPhase: legacy.loadingPhase,
    showReplay: legacy.showReplay,
    isLandscape: legacy.isLandscape,
    currentTrackMetadata: legacy.currentTrackMetadata,
    handleReplay: legacy.handleReplay,
    handleSurfaceTap: legacy.handleSurfaceTap,
    handlePlayPause: legacy.handlePlayPause,
    handlePrev: legacy.handlePrev,
    handleNext: legacy.handleNext,
    handleDoubleTapLeft: legacy.handleDoubleTapLeft,
    handleDoubleTapRight: legacy.handleDoubleTapRight,
    handleToggleLock: legacy.handleToggleLock,
    handleSeek: legacy.handleSeek,
    handleToggleSubtitleVisibility: legacy.handleToggleSubtitleVisibility,
    handleToggleRotate: legacy.handleToggleRotate,
    triggerShrinkAndEnterPip: legacy.triggerShrinkAndEnterPip,
    handleShare: legacy.handleShare,
    handleScreenshot: legacy.handleScreenshot,
    handleRetry: legacy.handleRetry,
    handleVolumeValueChange: legacy.handleVolumeValueChange,
    handleToggleMute: legacy.handleToggleMute,
    handleSelectSubtitle: legacy.handleSelectSubtitle,
    handleSelectAudioTrack: legacy.handleSelectAudioTrack,
    handleSpeedSelect: legacy.handleSpeedSelect,
    handleFontSizeChange: legacy.handleFontSizeChange,
    handleOpacityChange: legacy.handleOpacityChange,
    handleSubtitlePositionChange: legacy.handleSubtitlePositionChange,
    handleTextColorChange: legacy.handleTextColorChange,
    handleBgOpacityChange: legacy.handleBgOpacityChange,
    handleToggleLoop: legacy.handleToggleLoop,
    handleToggleShuffle: legacy.handleToggleShuffle,
    handleQueueSelectItem: legacy.handleQueueSelectItem,
    handleChapterSeek: legacy.handleChapterSeek,
  };
}
