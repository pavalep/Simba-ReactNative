import React, {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from 'react';
import {normalizePlaybackEntry} from '../../types/playback';
import {logger} from '../../lib/logger';
import {USE_DEDICATED_PLAYER_ACTIVITY} from '../../lib/flags';
import MpvPlayer from '../../native/player.api';
import {
  getPlaybackLane,
  toPlaybackEntryInput,
  type ActivePlayback,
  type PlaybackContextValue,
  type PlaybackOpenRequest,
  type PlaybackPresentation,
} from './types';
import type {PlaybackEntry} from '../../types/playback';

const PlaybackStateContext = createContext<PlaybackContextValue | null>(null);
let nextOpenRequestId = 0;

export interface PlaybackProviderProps {
  children: ReactNode;
}

export const PlaybackProvider: React.FC<PlaybackProviderProps> = ({children}) => {
  const [active, setActive] = useState<ActivePlayback | null>(null);
  // V12 Phase 8: tracks whether a dedicated `PlayerActivity` is
  // currently on screen. Set to `true` when `openPlayer` launches
  // the activity (gated by `USE_DEDICATED_PLAYER_ACTIVITY`); cleared
  // by `closePlayer` when the activity tears down. Read by hosts
  // (VideoHost) to decide whether to make their presentation shell
  // transparent.
  const [inPlayerActivity, setInPlayerActivity] = useState<boolean>(false);
  // V12 Phase 13: explicit playback type for the current launch.
  // Set when `openPlayer` is invoked (in either V11 or V12 path) so
  // hosts can pick `VideoHost` vs `AudioModule` from the very first
  // render. `null` until the first `openPlayer` fires.
  const [currentPlaybackType, setCurrentPlaybackType] = useState<'video' | 'audio' | null>(null);

  const openPlayer = useCallback((request: PlaybackOpenRequest) => {
    const entry = normalizePlaybackEntry({
      ...toPlaybackEntryInput(request),
      mediaType: request.mediaType ?? request.mediaLane,
    });

    // V12 Phase 5: when the dedicated-activity flag is on, hand off
    // to the library PlayerActivity via the bridge instead of
    // setting inline-mount state. The launched activity hosts its own
    // React root; we don't want a duplicate VideoHost mounted in
    // MainActivity behind it.
    if (USE_DEDICATED_PLAYER_ACTIVITY) {
      // Derive PlayerActivity's `type` from the media lane.
      // Audio-only entries use `'audio'`; everything else is
      // `'video'` (the activity defaults to `video` on the native
      // side when type is missing/invalid).
      const activityType: 'video' | 'audio' =
        entry.mediaType === 'audio' ? 'audio' : 'video';
      const startPositionMs = Math.max(
        0,
        Math.floor((request.startPosition ?? request.resumePosition ?? 0) * 1000),
      );
      logger.debug('[PlaybackTrace][JS][openPlayer:flag] delegating to PlayerActivity', {
        uri: entry.uri,
        title: entry.title,
        type: activityType,
        startPositionMs,
        mediaType: entry.mediaType,
        kind: entry.type,
      });
      // V12 Phase 8: flip the `inPlayerActivity` flag so any
      // presentation shell that mounts in the launched activity
      // drops its opaque background. Cleared by `closePlayer()`
      // when the activity finishes (or by the user closing the
      // activity, which routes through closePlayer via the JS
      // back-button handler in PlayerActivity's chrome — wired in
      // a later phase; for now the flag stays true until the JS
      // bundle is unloaded, which is the safe default).
      setInPlayerActivity(true);
      // V12 Phase 13: set the explicit playback type so the host
      // can pick the right renderer from the very first render,
      // even before the bridge round-trip completes for
      // `loadLaunchParams` in the PlayerActivity context.
      setCurrentPlaybackType(activityType);
      MpvPlayer.openPlayer({
        uri: entry.uri,
        title: entry.title,
        type: activityType,
        startPositionMs,
      }).catch((error: unknown) => {
        logger.error('[PlaybackTrace][JS][openPlayer:flag:error]', error);
      });
      return;
    }

    nextOpenRequestId += 1;
    // V12 Phase 13: also set currentPlaybackType in the V11 inline
    // path for consistency. The host already infers the lane from
    // `active.entry.mediaType` via `getPlaybackLane`, but having
    // both signals available avoids any race during the first
    // render.
    setCurrentPlaybackType(
      entry.mediaType === 'audio' ? 'audio' : 'video',
    );
    setActive({
      entry,
      presentation: 'expanded',
      openRequestId: nextOpenRequestId,
      startPosition: request.startPosition ?? request.resumePosition,
      ...(request.subtitleLanguage !== undefined ? {subtitleLanguage: request.subtitleLanguage} : {}),
      chapterList: request.chapterList,
      chapterIndex: request.chapterIndex,
      liveChannels: request.liveChannels,
      liveChannelIndex: request.liveChannelIndex,
      initialError: request.initialError,
    });
  }, []);

  // V12 Phase 13: rebuild PlaybackContext state from the bridge on
  // mount. Called from `App.tsx` once on mount. Returns true if
  // launch params were applied (we're in PlayerActivity), false
  // otherwise (we're in MainActivity and the regular V11 path
  // should run).
  const loadLaunchParams = useCallback((): boolean => {
    const params = MpvPlayer.getLaunchParams();
    if (!params) return false;
    logger.debug('[PlaybackTrace][JS][loadLaunchParams] applying bridge params', {
      uri: params.uri,
      title: params.title,
      type: params.type,
      startPositionMs: params.startPositionMs,
    });
    // Phase 13.3.1: flip the inPlayerActivity flag so any
    // presentation shell that mounts in this activity drops its
    // opaque background.
    setInPlayerActivity(true);
    setCurrentPlaybackType(params.type);
    // Phase 13.3.1: build a minimal PlaybackEntry from the launch
    // params. The `entry.source` defaults to `'local'` because the
    // PlayerActivity is launched with a content:// / file:// URI
    // (in-app library taps) or an http(s) URL (deep link / share
    // sheet). We can't reliably classify 'local' vs 'remote' from
    // the bridge alone, so we pick the more common path (`'local'`
    // covers content:// + file://; the http(s) case will still
    // load because the MpvBridgeModule handles it the same way).
    // A future phase can pass the source through as a separate
    // launch extra if we need to distinguish.
    const entry: PlaybackEntry = {
      uri: params.uri,
      title: params.title || params.uri,
      source: 'local',
      // The PlaybackEntry's `type` is a MediaKind (`'audio'` /
      // `'video'` / `'movie'` / etc.); the bridge only ships the
      // broad lane so we use the lane itself. A future phase can
      // carry a more specific kind through the launch params if
      // the call site needs it.
      type: params.type,
      mediaType: params.type,
      duration: 0,
    } as PlaybackEntry;
    nextOpenRequestId += 1;
    setActive({
      entry,
      presentation: 'expanded',
      openRequestId: nextOpenRequestId,
      startPosition: params.startPositionMs / 1000,
    });
    return true;
  }, []);

  const setPresentation = useCallback((presentation: PlaybackPresentation) => {
    setActive(current => {
      if (!current) return current;
      if (presentation === 'none') return null;
      return {...current, presentation};
    });
  }, []);

  const expandPlayer = useCallback(() => setPresentation('expanded'), [setPresentation]);
  const collapsePlayer = useCallback(() => {
    setActive(current => {
      if (!current) return current;
      // `startPosition` is an initial open intent, not presentation state.
      // Once the full player has been collapsed, mini expansion must preserve
      // the native item and position instead of replaying that old timestamp.
      return {...current, presentation: 'mini', startPosition: undefined};
    });
  }, []);
  const closePlayer = useCallback(() => {
    // V12 Phase 8: closing the player also clears the
    // `inPlayerActivity` flag so the next inline mount (if any)
    // uses the v11 hotfix opaque background again.
    setInPlayerActivity(false);
    // V12 Phase 13: also clear the explicit playback type.
    setCurrentPlaybackType(null);
    setPresentation('none');
  }, [setPresentation]);

  const value = useMemo<PlaybackContextValue>(
    () => ({
      active,
      inPlayerActivity,
      currentPlaybackType,
      openPlayer,
      expandPlayer,
      collapsePlayer,
      closePlayer,
      loadLaunchParams,
    }),
    [active, inPlayerActivity, currentPlaybackType, closePlayer, collapsePlayer, expandPlayer, openPlayer, loadLaunchParams],
  );

  return <PlaybackStateContext.Provider value={value}>{children}</PlaybackStateContext.Provider>;
};

export function usePlayback(): PlaybackContextValue {
  const context = useContext(PlaybackStateContext);
  if (!context) {
    throw new Error('usePlayback must be used inside PlaybackProvider');
  }
  return context;
}

export function usePlaybackState() {
  const {active} = usePlayback();
  return {
    active,
    presentation: active?.presentation ?? 'none',
    lane: active ? getPlaybackLane(active) : null,
  };
}

export function usePlaybackCommands() {
  const {openPlayer, expandPlayer, collapsePlayer, closePlayer} = usePlayback();
  return {openPlayer, expandPlayer, collapsePlayer, closePlayer};
}
