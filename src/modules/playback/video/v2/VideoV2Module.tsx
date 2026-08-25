import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Animated, NativeModules, Platform, StyleSheet, View, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTransport} from '../../../../contexts/TransportContext';
import {usePlaybackCommands} from '../../PlaybackContext';
import type {ActivePlayback, PlaybackNavigation, VideoPlaybackParams, PlaybackPresentation} from '../../types';
import {usePlaylists} from '../../../../features/playlists';
import {useToast} from '../../../../components/feedback/Toast/Toast';
import {useVideoV2Controller} from './useVideoV2Controller';
import {VideoV2Player} from './VideoV2Player';
import {MiniVideoV2} from './MiniVideoV2';
import {VideoV2Surface} from './VideoV2Surface';
import type {VideoV2Model} from './VideoV2Types';

interface VideoV2ModuleProps {
  active: ActivePlayback;
  presentation: Exclude<PlaybackPresentation, 'none'>;
}

export const VideoV2Module: React.FC<VideoV2ModuleProps> = ({active, presentation}) => {
  const {openPlayer, expandPlayer, collapsePlayer, closePlayer} = usePlaybackCommands();
  const insets = useSafeAreaInsets();
  const {width: windowWidth, height: windowHeight} = useWindowDimensions();
  const [surfaceProgress] = useState(() => new Animated.Value(presentation === 'mini' ? 0 : 1));
  const [chromeProgress] = useState(() => new Animated.Value(presentation === 'mini' ? 0 : 1));
  const transport = useTransport();
  const playlistController = usePlaylists();
  const toast = useToast();
  const routeIntentRef = useRef<{uri: string; startPosition?: number}>({uri: active.entry.uri, startPosition: active.startPosition});
  const previousEntryRef = useRef(active.entry);
  if (previousEntryRef.current !== active.entry) {
    previousEntryRef.current = active.entry;
    routeIntentRef.current = {uri: active.entry.uri, startPosition: active.startPosition};
  }

  const replaceVideo = useCallback((params: VideoPlaybackParams) => {
    if (!params.fileUri) return;
    openPlayer({
      uri: params.fileUri,
      title: params.fileTitle ?? params.fileUri,
      duration: 0,
      source: params.source,
      type: params.type,
      mediaType: params.mediaType ?? 'video',
      provider: params.provider,
      folderId: params.folderId,
      startPosition: params.startPosition,
      liveChannels: params.liveChannels,
      liveChannelIndex: params.liveChannelIndex,
      initialError: params.initialError,
    });
  }, [openPlayer]);
  const navigation = useMemo<PlaybackNavigation>(() => ({
    canGoBack: () => true,
    goBack: closePlayer,
    navigateHome: closePlayer,
    replaceVideo,
  }), [closePlayer, replaceVideo]);

  const route = useMemo<{params?: VideoPlaybackParams}>(() => ({
    params: {
      fileUri: active.entry.uri,
      fileTitle: active.entry.title,
      source: active.entry.source,
      type: active.entry.type,
      mediaType: active.entry.mediaType,
      provider: active.entry.provider,
      folderId: active.entry.folderId,
      startPosition: routeIntentRef.current.startPosition,
      liveChannels: active.liveChannels,
      liveChannelIndex: active.liveChannelIndex,
      initialError: active.initialError,
    },
  }), [active]);

  const controller = useVideoV2Controller(navigation, route);
  const {controlsLocked, handleSurfaceTap, handlePlayPause, secondaryVisible, setSecondaryVisible, showReplay} = controller;
  const pipSupported = Platform.OS === 'android' && typeof NativeModules.MpvPlayerModule?.enterPip === 'function';
  const handleV2SurfaceTap = useCallback(() => {
    if (controlsLocked) {
      handleSurfaceTap();
      return;
    }
    if (!secondaryVisible) {
      setSecondaryVisible(true);
      return;
    }
    if (showReplay) return;
    handlePlayPause();
  }, [controlsLocked, handlePlayPause, handleSurfaceTap, secondaryVisible, setSecondaryVisible, showReplay]);
  useEffect(() => {
    if (!secondaryVisible || !transport.isPlaying || controlsLocked) return;
    const timer = setTimeout(() => setSecondaryVisible(false), 4500);
    return () => clearTimeout(timer);
  }, [controlsLocked, secondaryVisible, setSecondaryVisible, transport.isPlaying]);
  useEffect(() => {
    surfaceProgress.stopAnimation();
    chromeProgress.stopAnimation();
    const target = presentation === 'mini' ? 0 : 1;
    Animated.spring(surfaceProgress, {
      toValue: target,
      useNativeDriver: false,
      tension: 72,
      friction: 12,
    }).start();
    Animated.timing(chromeProgress, {
      toValue: target,
      duration: 220,
      useNativeDriver: true,
    }).start();
    return () => {
      surfaceProgress.stopAnimation();
      chromeProgress.stopAnimation();
    };
  }, [chromeProgress, presentation, surfaceProgress]);
  const miniChromeOpacity = useMemo(() => chromeProgress.interpolate({inputRange: [0, 1], outputRange: [1, 0]}), [chromeProgress]);
  const animatedSurfaceStyle = useMemo(() => ({
    position: 'absolute' as const,
    left: surfaceProgress.interpolate({inputRange: [0, 1], outputRange: [20, 0]}),
    top: surfaceProgress.interpolate({inputRange: [0, 1], outputRange: [windowHeight - Math.max(insets.bottom, 8) - 98, 0]}),
    width: surfaceProgress.interpolate({inputRange: [0, 1], outputRange: [122, windowWidth]}),
    height: surfaceProgress.interpolate({inputRange: [0, 1], outputRange: [76, windowHeight]}),
    borderRadius: surfaceProgress.interpolate({inputRange: [0, 1], outputRange: [12, 0]}),
  }), [insets.bottom, surfaceProgress, windowHeight, windowWidth]);
  const duration = Number.isFinite(transport.duration) ? Math.max(0, transport.duration) : 0;
  const position = Number.isFinite(transport.position) ? Math.max(0, transport.position) : 0;
  const hasNext = controller.queue.length > 0 || controller.currentIndex < controller.playlist.length - 1;
  const canAddToPlaylist = active.entry.mediaType === 'video' && (active.entry.type === 'video' || active.entry.type === 'movie');
  const addCurrentVideoToPlaylist = useCallback((playlistId: string) => {
    if (!canAddToPlaylist) return;
    const result = playlistController.addItem(playlistId, {
      fileUri: active.entry.uri,
      title: active.entry.title,
      duration,
      position,
      source: active.entry.source,
      type: active.entry.type,
      mediaType: 'video',
      provider: active.entry.provider,
      folderId: active.entry.folderId,
    });
    if (result.status === 'added') toast.show(`Added to ${result.playlist.name}.`, 'success');
    else if (result.status === 'duplicate') toast.show(`Already in ${result.playlist.name}.`, 'info');
    else if (result.status === 'lane-mismatch' || result.status === 'unsupported-media-kind') toast.show('Video playlists accept videos and movies only.', 'error');
    else if (result.status === 'playlist-full') toast.show(`That playlist is full (${result.max} items).`, 'error');
  }, [active.entry, canAddToPlaylist, duration, playlistController, position, toast]);
  const createVideoPlaylist = useCallback((name: string) => {
    const result = playlistController.createPlaylist({name, kind: 'VIDEO_ONLY'});
    if (result.status === 'created') {
      addCurrentVideoToPlaylist(result.playlist.id);
    } else {
      toast.show(`You can have up to ${result.max} playlists.`, 'error');
    }
  }, [addCurrentVideoToPlaylist, playlistController, toast]);
  const hasPrevious = controller.currentIndex > 0 || position > 5;
  const isEnded = transport.isEnded || controller.showReplay;
  const playbackState: VideoV2Model['playbackState'] = controller.error
    ? 'error'
    : controller.isLive
      ? 'live'
      : controller.isBuffering || transport.isBuffering
        ? 'buffering'
        : transport.isSeeking
          ? 'seeking'
          : isEnded
            ? 'finished'
            : transport.isPlaying
              ? 'playing'
              : controller.isReady
                ? 'paused'
                : 'connecting';

  const model = useMemo<VideoV2Model>(() => ({
    colors: controller.colors,
    insets: {top: Math.max(insets.top, controller.uiTopInset), bottom: Math.max(insets.bottom, controller.uiBottomInset), left: insets.left, right: insets.right},
    title: controller.title,
    fileUri: controller.fileUri,
    nativePtr: controller.nativePtr,
    showVideoSurface: controller.showVideoSurface,
    playbackState,
    isPlaying: transport.isPlaying,
    isBuffering: controller.isBuffering || transport.isBuffering,
    isSeeking: transport.isSeeking,
    isEnded,
    isLive: controller.isLive,
    position,
    duration,
    bufferedRanges: transport.bufferedRanges,
    isSeekable: transport.isSeekable,
    controlsVisible: controller.secondaryVisible,
    controlsLocked: controller.controlsLocked,
    isLandscape: controller.isLandscape,
    volume: controller.volume,
    muted: controller.muted,
    speed: controller.speed,
    loopMode: controller.loopMode,
    shuffle: controller.shuffle,
    subtitleVisible: controller.subtitleVisible,
    activeSubtitle: controller.activeSubtitle,
    activeAudioTrack: controller.activeAudioTrack,
    subtitleFontSize: controller.subtitleFontSize,
    subtitleOpacity: controller.subtitleOpacity,
    subtitlePosition: controller.subtitlePosition,
    subtitleTextColor: controller.subtitleTextColor,
    subtitleBgOpacity: controller.subtitleBgOpacity,
    subtitles: controller.subtitleTracks,
    audioTracks: controller.audioTracks,
    chapters: controller.chapters,
    queue: controller.queue,
    playlists: playlistController.playlists.filter(playlist => playlist.kind === 'VIDEO_ONLY'),
    canAddToPlaylist,
    metadata: controller.currentTrackMetadata,
    hasNext,
    hasPrevious,
    error: typeof controller.error === 'string' ? controller.error : controller.error?.message ?? null,
    loadingMessage: controller.loadingPhase === 'initializing' ? 'Preparing video' : controller.loadingPhase === 'loading' ? 'Loading video' : 'Buffering video',
    showReplay: controller.showReplay,
    pipSupported,
    commands: {
      onSurfaceTap: handleV2SurfaceTap,
      onMinimize: collapsePlayer,
      onExpand: expandPlayer,
      onPlayPause: controller.showReplay || transport.isEnded ? controller.handleReplay : controller.handlePlayPause,
      onPrevious: controller.handlePrev,
      onNext: controller.handleNext,
      onRewind: controller.handleDoubleTapLeft,
      onForward: controller.handleDoubleTapRight,
      onSeek: controller.handleSeek,
      onToggleControlsLock: controller.handleToggleLock,
      onToggleSubtitles: controller.handleToggleSubtitleVisibility,
      onToggleFullscreen: controller.handleToggleRotate,
      onEnterPip: controller.triggerShrinkAndEnterPip,
      onShare: controller.handleShare,
      onScreenshot: controller.handleScreenshot,
      onRetry: controller.handleRetry,
      onReplay: controller.handleReplay,
      onVolumeChange: controller.handleVolumeValueChange,
      onToggleMute: controller.handleToggleMute,
      onSelectSubtitle: controller.handleSelectSubtitle,
      onChangeSubtitleFontSize: controller.handleFontSizeChange,
      onChangeSubtitleOpacity: controller.handleOpacityChange,
      onChangeSubtitlePosition: controller.handleSubtitlePositionChange,
      onChangeSubtitleTextColor: controller.handleTextColorChange,
      onChangeSubtitleBgOpacity: controller.handleBgOpacityChange,
      onSelectAudio: controller.handleSelectAudioTrack,
      onSelectSpeed: controller.handleSpeedSelect,
      onSelectPlaylist: addCurrentVideoToPlaylist,
      onCreatePlaylist: createVideoPlaylist,
      onSelectQueueItem: controller.handleQueueSelectItem,
      onSelectChapter: controller.handleChapterSeek,
      onToggleLoop: controller.handleToggleLoop,
      onToggleShuffle: controller.handleToggleShuffle,
      onClose: closePlayer,
    },
  }), [addCurrentVideoToPlaylist, canAddToPlaylist, closePlayer, collapsePlayer, controller, createVideoPlaylist, duration, expandPlayer, handleV2SurfaceTap, hasNext, hasPrevious, insets.bottom, insets.left, insets.right, insets.top, isEnded, pipSupported, playbackState, playlistController.playlists, position, transport.bufferedRanges, transport.isBuffering, transport.isEnded, transport.isPlaying, transport.isSeekable, transport.isSeeking]);

  return (
    <View pointerEvents="box-none" style={styles.root}>
      <Animated.View pointerEvents="none" style={[styles.surfaceHost, animatedSurfaceStyle]}>
        <VideoV2Surface nativePtr={model.nativePtr} showVideoSurface={model.showVideoSurface && !model.error} backgroundColor={controller.colors.background.surfaceDark} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View pointerEvents={presentation === 'expanded' ? 'auto' : 'none'} style={[styles.chromeHost, {opacity: chromeProgress}]}>
        <VideoV2Player model={model} visible={presentation === 'expanded'} />
      </Animated.View>
      <Animated.View pointerEvents={presentation === 'mini' ? 'auto' : 'none'} style={[styles.chromeHost, {opacity: miniChromeOpacity}]}>
        <MiniVideoV2 model={model} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  surfaceHost: {overflow: 'hidden'},
  chromeHost: {...StyleSheet.absoluteFill},
});

export type {VideoV2ModuleProps};
