import React, {useEffect, useMemo, useRef, useState} from 'react';
import MpvPlayer from '../../../../../native/player.api';
import {createVideoV3SourceFingerprint} from '../domain/VideoV3Fingerprint';
import type {
  VideoV3SourceIdentity,
  VideoV3ViewState,
} from '../domain/VideoV3Types';
import {VideoV3FirstFrameLoading} from '../loading/VideoV3FirstFrameLoading';
import {VideoV3PresentationShell} from '../presentation/VideoV3PresentationShell';
import {VideoV3SafeControlLayer} from '../presentation/VideoV3SafeControlLayer';
import {createVideoV3Playback} from '../session/createVideoV3Playback';
import {VideoV3NativeSurface} from '../surface/VideoV3NativeSurface';
import {usePlaybackCommands} from '../../../PlaybackContext';
import type {ActivePlayback, PlaybackPresentation} from '../../../types';

export interface VideoV3HostProps {
  readonly active: ActivePlayback;
}

function toVideoV3Source(active: ActivePlayback): VideoV3SourceIdentity {
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

export function VideoV3Host({active}: VideoV3HostProps) {
  const {expandPlayer, collapsePlayer, closePlayer} = usePlaybackCommands();
  const playback = useMemo(() => createVideoV3Playback(), []);
  const source = useMemo(() => toVideoV3Source(active), [active]);
  const sourceFingerprint = useMemo(() => createVideoV3SourceFingerprint(source), [source]);
  const requestRef = useRef({
    source,
    startPosition: active.startPosition,
    autoplay: active.entry.autoplay ?? true,
  });
  requestRef.current = {
    source,
    startPosition: active.startPosition,
    autoplay: active.entry.autoplay ?? true,
  };
  const [viewState, setViewState] = useState<VideoV3ViewState>(() => playback.state.getState());
  const [nativePtr, setNativePtr] = useState(0);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [pipState, setPipState] = useState(() => playback.pip.getState());
  const session = viewState.session;
  const presentation: PlaybackPresentation = active.presentation;
  const isPipLike = pipState.mode === 'entering' || pipState.mode === 'pip' || pipState.mode === 'exiting';
  const shellPresentation = isPipLike || presentation === 'expanded' ? 'full' : 'mini';
  const surfacePresentation = isPipLike ? 'pip' : shellPresentation;

  useEffect(() => {
    const unsubscribe = playback.state.subscribe(setViewState);
    return unsubscribe;
  }, [playback]);

  useEffect(() => {
    const unsubscribe = playback.pip.subscribe(setPipState);
    return unsubscribe;
  }, [playback]);

  useEffect(() => {
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
    playback.surface.attach().catch(() => undefined);
    return () => {
      playback.release().catch(() => undefined);
    };
  }, [playback]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        await playback.session.load(requestRef.current);
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
  }, [playback, sourceFingerprint]);

  useEffect(() => {
    playback.surface.setPresentation(surfacePresentation).catch(() => undefined);
  }, [playback, surfacePresentation]);

  const dispatchPlayPause = async () => {
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
    playback.pip.enter(session).catch(() => undefined);
  };
  const fullChrome = showFullChrome ? (
    <VideoV3SafeControlLayer
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
    <VideoV3SafeControlLayer
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
    <VideoV3PresentationShell
      presentation={shellPresentation}
      fullChrome={fullChrome}
      miniChrome={miniChrome}
    >
      {nativePtr > 0 ? <VideoV3NativeSurface nativePtr={nativePtr} /> : null}
      <VideoV3FirstFrameLoading session={session} />
    </VideoV3PresentationShell>
  );
}

