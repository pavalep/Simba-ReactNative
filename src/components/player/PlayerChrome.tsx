/**
 * Player chrome host — decides between the dock and the full player.
 *
 * V21 F4. This used to be `AudioChrome` and it was named for what it
 * rendered: an audio-only bar, or `null` for a video session. It now hosts
 * the shared `MiniPlayer` dock for BOTH lanes, so the name would have been
 * the first thing to mislead the next reader.
 *
 * ## V22 W22 (2026-10-21) — this is now the AUDIO lane's host, and the
 * shared `MiniPlayer` is gone
 *
 * There used to be a second player component — the `MiniPlayer` dock —
 * and the two of them TOOK TURNS: the full audio player mounted, then the
 * dock mounted, then the full player again. Every presentation change was
 * an unmount of one and a mount of the other, so the audio lane re-ran its
 * subscriptions, reset its animations and threw away its scroll position
 * each time — and the app had a "mini player" that was a separate UI from
 * the player it minimised, which is the opposite of the decision the app
 * had already made for the video picture (SPEC D9: one mounted player per
 * lane, presentation is style not component identity).
 *
 * So each lane now owns its whole life:
 *
 *   • the AUDIO lane is `AudioPlayer`, mounted here, which renders both
 *     the full page and the dock and switches between them with style and
 *     per-part visibility.
 *   • the VIDEO lane is `VideoPlayer`, whose `VideoLane` holds the picture
 *     AND the video dock. It is mounted by `AppRoot` for the whole app
 *     session, because the PiP reconciliation listener has to outlive
 *     every presentation mode (see `VideoPlayerChrome`).
 *
 * This host is therefore the audio lane's gate: nothing is rendered when
 * there is no session, which is the ONE legal unmount.
 *
 * ## The visibility gate
 *
 * `useNowPlayingStore.current === null` means nothing is loaded, and
 * that — not a `'hidden'` mode in a presentation store — is what hides
 * everything. One owner per fact: the launch seam writes it, close
 * clears it, `usePlaybackCheckpointSync` already reads it. Duplicating it
 * would be two owners of one fact, which is how W5's `videoState` and
 * `VideoController.videoState` came to disagree.
 *
 * ## Why video expanded renders nothing here
 *
 * A video session used to return `null` outright, because video lived in its
 * own Activity and had no in-app chrome. It still renders nothing *expanded*
 * — but for the opposite reason now: `VideoPlayer` owns the expanded video
 * chrome in this same tree, and rendering a second compositor over the same
 * surface would be two owners of one presentation.
 *
 * ## Close is a real teardown, not a UI dismissal
 *
 * X stops the engine AND tears down the foreground service, through the
 * native primitive. It is not `commands.stop()`, which would silence the
 * engine while leaving the media session registered and the notification
 * posted — a "closed" player that is still holding the media button and
 * still showing in the shade. If the native stop fails, the UI is left
 * standing and the failure is surfaced, because dismissing the player
 * while audio keeps playing is a lie the user cannot detect until they
 * wonder why sound is coming from a closed screen.
 *
 * V22 W22 (2026-10-21): that teardown now lives in ONE place —
 * `useClosePlayback()` in `src/infrastructure/player/` — because the
 * video player's back button offers the same close, and two owners of
 * one teardown drift. The step-by-step meaning of "close" is documented
 * on the hook.
 */

import React from 'react';
import {useNowPlayingStore} from '../../state/nowPlayingStore';
import {AudioPlayer} from './audio/AudioPlayer/AudioPlayer';

export const PlayerChrome: React.FC = () => {
  const nowPlaying = useNowPlayingStore(s => s.current);

  // The one legal unmount: nothing is loaded, so there is nothing to show.
  if (!nowPlaying) return null;

  // The video lane is hosted by `VideoPlayer`, which `AppRoot` mounts for
  // the whole app session. Rendering it here as well would be two owners
  // of one video — and the picture's surface would be bound twice.
  if (nowPlaying.streamType === 'video') return null;

  return <AudioPlayer />;
};
