/**
 * Audio chrome host — decides between the mini bar and the full player.
 *
 * One component owns the switch so that "is anything showing", "which
 * surface", and "what does close do" have exactly one answer. The two
 * surfaces never both mount, and neither is mounted when there is
 * nothing playing.
 *
 * ## The visibility gate
 *
 * `useNowPlayingStore.current === null` means nothing is loaded, and
 * that — not a `'hidden'` mode in the presentation store — is what hides
 * everything. One owner per fact: the launch seam writes it, close
 * clears it, `usePlaybackCheckpointSync` already reads it. Duplicating it
 * would be two owners of one fact, which is how W5's `videoState` and
 * `VideoController.videoState` came to disagree.
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
import {
  getMpvPlayerModule,
  useIsPlayerActivity,
} from '@simba-dev/react-native-media-player';
import {useToast} from '../../feedback/Toast';
import {useNowPlayingStore} from '../../../state/nowPlayingStore';
import {useAudioPresentationStore} from '../../../state/useAudioPresentationStore';
import {AudioPlayer} from './AudioPlayer/AudioPlayer';
import {AudioMiniBar} from './AudioMiniBar/AudioMiniBar';

export const AudioChrome: React.FC = () => {
  // The video player lives in its own Activity. While that window is up,
  // this tree is behind it, so rendering audio chrome would animate
  // something nobody can see.
  const isPlayerActivity = useIsPlayerActivity();
  const toast = useToast();
  const nowPlaying = useNowPlayingStore(s => s.current);
  const endSession = useNowPlayingStore(s => s.end);
  const mode = useAudioPresentationStore(s => s.mode);

  const onClose = useCallback(() => {
    try {
      // Stops the engine and sends ACTION_STOP, so the session is
      // released and the notification is dismissed. A plain
      // `commands.stop()` would leave both.
      getMpvPlayerModule().stopAudioPlayback();
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

  if (isPlayerActivity || !nowPlaying) return null;

  // A VIDEO launch also records a session — it just happens to have one,
  // because video lives in its own Activity and has no in-app chrome.
  // Without this the audio player drew over the video player's Home
  // screen, which is exactly what the first device run showed: a movie
  // ("Turkish Movie", 1:06:31) opened PlayerActivity correctly, and the
  // audio chrome mounted over MainActivity regardless.
  if (nowPlaying.streamType !== 'audio') return null;

  return mode === 'expanded' ? (
    <AudioPlayer onClose={onClose} />
  ) : (
    <AudioMiniBar onClose={onClose} />
  );
};