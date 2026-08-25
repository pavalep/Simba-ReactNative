import React, {useEffect, useMemo, useState} from 'react';
import MpvPlayer from '../../../../native/player.api';
import {createVideoSourceFingerprint} from '../domain/VideoFingerprint';
import {
  emptyVideoSnapshot,
  type VideoSourceIdentity,
  type VideoViewState,
} from '../domain/VideoTypes';
import type {VideoPipState} from '../platform/VideoPipAdapter';
import {VideoFirstFrameLoading} from '../loading/VideoFirstFrameLoading';
import {VideoPresentationShell} from '../presentation/VideoPresentationShell';
import {VideoSafeControlLayer} from '../presentation/VideoSafeControlLayer';
import {createVideoPlayback} from '../session/createVideoPlayback';
import {VideoNativeSurface} from '../surface/VideoNativeSurface';
import {usePlaybackCommands} from '../../PlaybackContext';
import type {ActivePlayback, PlaybackPresentation} from '../../types';

type VideoPlaybackUnit = ReturnType<typeof createVideoPlayback>;

const EMPTY_VIDEO_VIEW_STATE: VideoViewState = {
  session: emptyVideoSnapshot(),
  capabilities: {
    canPlay: false,
    canPause: false,
    canSeek: false,
    canAdjustVolume: false,
    canChangeSpeed: false,
    canSelectAudioTrack: false,
    canSelectCaptionTrack: false,
    canViewChapters: false,
    canPictureInPicture: false,
    canFullscreen: false,
    canChangeOrientation: false,
  },
};

export interface VideoHostProps {
  readonly active: ActivePlayback;
}

function toVideoSource(active: ActivePlayback): VideoSourceIdentity {
  const entry = active.entry;
  return {
    uri: entry.uri,
    title: entry.title,
    source: entry.source,
    type: entry.type,
    mediaLane: 'video',
    ...(entry.provider === undefined ? {} : {provider: entry.provider}),
    ...(entry.folderId === undefined ? {} : {folderId: entry.folderId}),
  };
}

export function VideoHost({active}: VideoHostProps) {
  const {expandPlayer, collapsePlayer, closePlayer} = usePlaybackCommands();
  const [playback, setPlayback] = useState<VideoPlaybackUnit | null>(null);
  const source = useMemo(() => toVideoSource(active), [active]);
  const sourceFingerprint = useMemo(() => createVideoSourceFingerprint(source), [source]);
  const startPosition = active.startPosition;
  const autoplay = active.entry.autoplay ?? true;
  const requestIdentity = `${sourceFingerprint}|${startPosition ?? ''}|${autoplay ? 'autoplay' : 'paused'}`;
  const [viewState, setViewState] = useState<VideoViewState>(EMPTY_VIDEO_VIEW_STATE);
  const [nativePtr, setNativePtr] = useState(0);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [pipState, setPipState] = useState<VideoPipState | null>(null);
  const session = viewState.session;
  const presentation: PlaybackPresentation = active.presentation;
  const isPipLike = pipState?.mode === 'entering' || pipState?.mode === 'pip' || pipState?.mode === 'exiting';
  const shellPresentation = isPipLike || presentation === 'expanded' ? 'full' : 'mini';
  const surfacePresentation = isPipLike ? 'pip' : shellPresentation;

  useEffect(() => {
    if (!playback) return;
    setViewState(playback.state.getState());
    return playback.state.subscribe(setViewState);
  }, [playback]);

  useEffect(() => {
    if (!playback) return;
    setPipState(playback.pip.getState());
    return playback.pip.subscribe(setPipState);
  }, [playback]);

  useEffect(() => {
    const nextPlayback = createVideoPlayback();
    setPlayback(nextPlayback);
    return () => {
      nextPlayback.release().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (!playback) return;
    const unsubscribe = playback.pip.subscribeToActions(action => {
      if (action === 'play-pause') {
        playback.commands.dispatch({type: session.isPlaying ? 'pause' : 'play'}).catch(() => undefined);
      } else if (action === 'expand') {
        playback.pip.exit().catch(() => undefined);
        expandPlayer();
      } else {
        closePlayer();
        playback.pip.close().catch(() => undefined);
      }
    });
    return unsubscribe;
  }, [closePlayer, expandPlayer, playback, session.isPlaying]);

  useEffect(() => {
    if (!playback) return;
    playback.surface.attach().catch(() => undefined);
  }, [playback]);

  useEffect(() => {
    if (!playback) return;
    let cancelled = false;
    const load = async () => {
      try {
        await playback.session.load({source, startPosition, autoplay});
        if (cancelled) return;
        try {
          setNativePtr(MpvPlayer.getNativePtr());
        } catch {
          setNativePtr(0);
        }
      } catch {
        if (!cancelled) setNativePtr(0);
      }
    };
    load().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [autoplay, playback, requestIdentity, source, startPosition]);

  useEffect(() => {
    if (!playback) return;
    playback.surface.setPresentation(surfacePresentation).catch(() => undefined);
  }, [playback, surfacePresentation]);

  const dispatchPlayPause = async () => {
    if (!playback) return;
    if (session.phase === 'finished') {
      await playback.commands.dispatch({
        type: 'load',
        request: {source, startPosition: 0, autoplay: true},
      });
      return;
    }
    if (session.phase === 'error') {
      await playback.commands.dispatch({
        type: 'load',
        request: {source, startPosition: session.position, autoplay: true},
      });
      return;
    }
    await playback.commands.dispatch({type: session.isPlaying ? 'pause' : 'play'});
  };

  const dispatchSeek = (position: number) => {
    if (!playback) return;
    playback.commands.dispatch({
      type: 'seek',
      position,
      generation: session.generation,
    }).catch(() => undefined);
  };

  const dispatchSkip = (seconds: number) => {
    if (session.duration === null) return;
    dispatchSeek(Math.max(0, Math.min(session.duration, session.position + seconds)));
  };

  const showFullChrome = !isPipLike && presentation === 'expanded';
  const showMiniChrome = !isPipLike && presentation === 'mini';
  const requestPip = () => {
    playback?.pip.enter(session).catch(() => undefined);
  };
  const retryVideo = () => {
    if (!playback) return;
    playback.commands.dispatch({
      type: 'load',
      request: {source, startPosition: 0, autoplay: true},
    }).catch(() => undefined);
  };
  const fullChrome = showFullChrome ? (
    <VideoSafeControlLayer
      mode="full"
      session={session}
      capabilities={viewState.capabilities}
      chromeVisible={chromeVisible}
      title={source.title}
      onToggleChrome={() => setChromeVisible(current => !current)}
      onBack={collapsePlayer}
      onClose={closePlayer}
      onPlayPause={() => { dispatchPlayPause().catch(() => undefined); }}
      onSeek={dispatchSeek}
      onSkip={dispatchSkip}
      onEnterPictureInPicture={requestPip}
    />
  ) : null;
  const miniChrome = showMiniChrome ? (
    <VideoSafeControlLayer
      mode="mini"
      session={session}
      capabilities={viewState.capabilities}
      chromeVisible
      title={source.title}
      onToggleChrome={expandPlayer}
      onBack={expandPlayer}
      onClose={closePlayer}
      onPlayPause={() => { dispatchPlayPause().catch(() => undefined); }}
      onSeek={dispatchSeek}
      onSkip={dispatchSkip}
    />
  ) : null;

  return (
    <VideoPresentationShell
      presentation={shellPresentation}
      fullChrome={fullChrome}
      miniChrome={miniChrome}
    >
      {nativePtr > 0 ? <VideoNativeSurface nativePtr={nativePtr} /> : null}
      <VideoFirstFrameLoading session={session} onRetry={retryVideo} />
    </VideoPresentationShell>
  );
}

