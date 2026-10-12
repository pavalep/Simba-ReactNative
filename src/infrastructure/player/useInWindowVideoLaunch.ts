/**
 * V21 F3 — load video into the window that is already open.
 *
 * ## What replaces what
 *
 * Video used to launch through `openPlayer`, which starts a second Android
 * Activity and hands the payload over as Intent extras. That is the whole
 * mechanism this phase removes: a `SurfaceView`'s Surface belongs to its
 * window, so with video in a different Activity an in-app mini player is not
 * merely awkward but impossible.
 *
 * The library already anticipated this. `useLaunchPlayback` is exported
 * "so a consumer using `<SimbaPlayerRoot headless>` can call it directly
 * for a payload the module did not originate", and it takes a plain
 * `LaunchParams` — it does not care where the payload came from. So the
 * in-window path is the library's own load half, not a second mechanism
 * invented alongside it.
 *
 * ## Why the payload is rebuilt from the session
 *
 * `nowPlayingStore` is already the app's record of what is playing, and the
 * launch seam writes it before it launches. Rebuilding the payload from
 * there means one source of truth: the session a screen can read, the
 * checkpoint writer can read, and the loader can read are the same object.
 * A second copy of the payload would be a second thing to fall out of sync —
 * and the lane bug that produced films-with-music-badges was exactly that.
 *
 * `requestId` is `sessionId`, which is monotonic per launch. It is not
 * optional bookkeeping: `useLaunchPlayback` keys its load effect on the
 * payload, and `uri + startPositionMs` is not a unique identity for a
 * launch. Without it, backing out of a film and tapping it again produces
 * the same key and no load happens at all.
 *
 * ## Video only
 *
 * Audio never comes here. It has no render target, it plays through the
 * media service, and its chrome is owned by `useAudioPresentationStore`.
 * Routing audio through this hook would load it a second time.
 */

import {useMemo} from 'react';
import {useLaunchPlayback, type LaunchParams} from './playbackFacade';
import {useNowPlayingStore} from '../../state/nowPlayingStore';

export function useInWindowVideoLaunch(): void {
  const session = useNowPlayingStore(s => s.current);

  const payload = useMemo<LaunchParams | null>(() => {
    if (session == null || session.streamType !== 'video') {
      return null;
    }
    return {
      uri: session.uri,
      title: session.title,
      type: 'video',
      startPositionMs: session.startPositionMs,
      requestId: String(session.sessionId),
    };
  }, [session]);

  useLaunchPlayback(payload);
}