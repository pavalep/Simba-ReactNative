/**
 * Player chrome host — decides between the dock and the full player.
 *
 * V21 F4. This used to be `AudioChrome` and it was named for what it
 * rendered: an audio-only bar, or `null` for a video session. It now hosts
 * the shared `MiniPlayer` dock for BOTH lanes, so the name would have been
 * the first thing to mislead the next reader.
 *
 * One component owns the switch so that "is anything showing", "which
 * surface", and "what does close do" have exactly one answer. The dock and
 * the full player never both mount, and neither is mounted when there is
 * nothing playing.
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
 * The dock, by contrast, is shared. One component, one set of play/pause,
 * close and progress controls, and the lanes differ only in whether the
 * leading square shows artwork or live video.
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
 */

import React, {useCallback} from 'react';
import {getMpvPlayerModule} from '@simba-dev/react-native-media-player';
import {useToast} from '../feedback/Toast';
import {useNowPlayingStore} from '../../state/nowPlayingStore';
import {useAudioPresentationStore} from '../../state/useAudioPresentationStore';
import {usePresentation} from '../../infrastructure/player';
import {AudioPlayer} from './audio/AudioPlayer/AudioPlayer';
import {MiniPlayer} from './mini/MiniPlayer';

export const PlayerChrome: React.FC = () => {
  const toast = useToast();
  const nowPlaying = useNowPlayingStore(s => s.current);
  const endSession = useNowPlayingStore(s => s.end);
  const audioMode = useAudioPresentationStore(s => s.mode);
  const presentation = usePresentation();

  const onClose = useCallback(() => {
    try {
      // Stops the engine and sends ACTION_STOP, so the session is
      // released and the notification is dismissed. A plain
      // `commands.stop()` would leave both.
      //
      // `stopPlayback` is named for what it does, not for a lane: the
      // same primitive is what the VIDEO dock's X calls. Video and audio
      // share one process-global engine, so there is one teardown, and the
      // old `stopAudioPlayback` name was only ever true for the lane that
      // happened to use it first.
      getMpvPlayerModule().stopPlayback();
    } catch (error) {
      toast.show(
        error instanceof Error ? error.message : 'Could not stop playback',
        'error',
      );
      return;
    }
    // Only now is it true that nothing is playing. Clearing first would
    // hide a player whose audio is still going.
    endSession();
  }, [endSession, toast]);

  // V21 F5: this used to also bail when `useIsPlayerActivity()` was true —
  // "the dedicated player Activity is up, this tree is behind it, so a
  // dock here would animate something nobody can see". There is now one
  // React root and one Activity, so that condition can never be true and
  // the gate was dropped rather than left as a branch that reads as a
  // live check.
  if (!nowPlaying) return null;

  if (nowPlaying.streamType === 'video') {
    // The dock only. `isMini` is not `!isExpanded`: during PiP the mode is
    // also not-expanded, but the OS window owns the surface and a second
    // dock underneath it would be a competing presentation of one video.
    return presentation.isMini ? <MiniPlayer onClose={onClose} /> : null;
  }

  return audioMode === 'expanded' ? (
    <AudioPlayer onClose={onClose} />
  ) : (
    <MiniPlayer onClose={onClose} />
  );
};