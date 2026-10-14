/**
 * V21 F5 A6 — `useQueueSync` derives `currentFile` from the session.
 *
 * ## The defect this pins
 *
 * `useQueueSync` rebuilt `currentFile` out of the lib's lossy state plus
 * three literals:
 *
 * ```ts
 * {uri: '', duration: 0, source: 'local', type: 'audio',
 *  mediaType: 'audio' as MediaLane}
 * ```
 *
 * The empty `uri` was the damaging one. `loadPlaylistToPlayer` writes a
 * real `currentFile` on every playlist launch; the first lib state tick
 * then replaced it with this entry. Every consumer matches tracks by
 * `currentFile?.uri`, and `''` matches no real URI — so the "now playing"
 * indicator went dark on every launch.
 *
 * The hardcoded audio lane had a second victim: `activeLane`
 * (`playerStore.ts:104`) reads `currentFile?.mediaType`, so a VIDEO
 * session reported the audio lane.
 *
 * ## Why mock only the lib
 *
 * `usePlayer` is stubbed because it needs the native module. Everything
 * the fix touches is real: the real hook, the real `usePlayerStore`, the
 * real `useNowPlayingStore`, and the real `normalizeMediaClassification`.
 * A test that stubbed the classifier would only prove that a value
 * reached a function it had just been told what to return.
 */

import {renderHook, waitFor} from '@testing-library/react-native';

const libState = {
  title: '',
  artist: '',
  isPlaying: false,
  durationMs: 0,
};

jest.mock('@simba-dev/react-native-media-player', () => ({
  usePlayer: () => ({state: libState}),
}));

import {useQueueSync} from '../../../src/infrastructure/player/useQueueSync';
import {usePlayerStore} from '../../../src/state/playerStore';
import {useNowPlayingStore} from '../../../src/state/nowPlayingStore';

const AUDIO_URI = 'file:///music/nausicaa/lumine/01.mp3';
const VIDEO_URI = 'file:///movies/namus-kanla-yazilir.mkv';

function currentFile() {
  return usePlayerStore.getState().currentFile;
}

/** Seed the session exactly the way the launch seam does. */
function beginSession(input: {
  uri: string;
  title: string;
  type?: 'music' | 'movie';
  streamType?: 'audio' | 'video';
  mediaLane?: 'audio' | 'video';
}) {
  useNowPlayingStore.getState().begin({
    ...input,
    startPositionMs: 0,
  });
}

beforeEach(() => {
  libState.title = '';
  libState.artist = '';
  libState.isPlaying = false;
  libState.durationMs = 0;
  useNowPlayingStore.getState().reset();
  usePlayerStore.getState().reset();
});

describe('useQueueSync — currentFile carries the real URI', () => {
  it('mirrors the session URI rather than an empty string', async () => {
    // The regression. `uri: ''` matched no real track, so
    // `isCurrentTrack` was false everywhere and the Library waveform's
    // `currentAudioUri` was '' rather than null.
    beginSession({
      uri: AUDIO_URI,
      title: 'Pale Matter',
      type: 'music',
      streamType: 'audio',
      mediaLane: 'audio',
    });
    renderHook(() => useQueueSync());

    await waitFor(() => expect(currentFile()?.uri).toBe(AUDIO_URI));
    expect(currentFile()!.uri).not.toBe('');
  });

  it('carries the session title', async () => {
    beginSession({
      uri: AUDIO_URI,
      title: 'Pale Matter',
      type: 'music',
      streamType: 'audio',
      mediaLane: 'audio',
    });
    renderHook(() => useQueueSync());

    await waitFor(() => expect(currentFile()?.title).toBe('Pale Matter'));
  });

  it('does not overwrite the entry loadPlaylistToPlayer already wrote', async () => {
    // The user-visible shape: play an album, the row lights up, then the
    // first lib tick blanked it. The queue's own currentFile must survive.
    const queued = {
      uri: AUDIO_URI,
      title: 'Pale Matter',
      duration: 240,
      source: 'local' as const,
      type: 'music' as const,
      mediaType: 'audio' as const,
    };
    usePlayerStore.getState().loadPlaylistToPlayer([queued]);

    beginSession({
      uri: AUDIO_URI,
      title: 'Pale Matter',
      type: 'music',
      streamType: 'audio',
      mediaLane: 'audio',
    });
    renderHook(() => useQueueSync());

    // Still matching the real track after the hook has run.
    await waitFor(() => expect(currentFile()?.uri).toBe(AUDIO_URI));
    expect(currentFile()!.uri).toBe(queued.uri);
  });
});

describe('useQueueSync — lane is derived, not hardcoded', () => {
  it('reports the video lane for a video session', async () => {
    // The second half of the defect. `activeLane` reads this field to
    // decide which queue a launch belongs to.
    beginSession({
      uri: VIDEO_URI,
      title: 'Namus Kanla Yazilir',
      type: 'movie',
      streamType: 'video',
      mediaLane: 'video',
    });
    renderHook(() => useQueueSync());

    await waitFor(() => expect(currentFile()?.mediaType).toBe('video'));
  });

  it('reports the audio lane for an audio session', async () => {
    // The counterpart — without it, an always-'video' fix would pass.
    beginSession({
      uri: AUDIO_URI,
      title: 'Pale Matter',
      type: 'music',
      streamType: 'audio',
      mediaLane: 'audio',
    });
    renderHook(() => useQueueSync());

    await waitFor(() => expect(currentFile()?.mediaType).toBe('audio'));
  });

  it('keeps the semantic kind distinct from the lane', async () => {
    // `type` is the catalogue kind ('movie'), `mediaType` the lane. A
    // fix that collapsed one into the other would lose the badge.
    beginSession({
      uri: VIDEO_URI,
      title: 'Namus Kanla Yazilir',
      type: 'movie',
      streamType: 'video',
      mediaLane: 'video',
    });
    renderHook(() => useQueueSync());

    await waitFor(() => expect(currentFile()?.type).toBe('movie'));
    expect(currentFile()!.mediaType).toBe('video');
  });

  it('falls back to streamType when the launcher knew no kind', async () => {
    // Many call sites pass a stream type but no catalogue kind.
    beginSession({
      uri: AUDIO_URI,
      title: 'Untitled',
      streamType: 'audio',
      mediaLane: 'audio',
    });
    renderHook(() => useQueueSync());

    await waitFor(() => expect(currentFile()?.type).toBe('audio'));
    expect(currentFile()!.mediaType).toBe('audio');
  });
});

describe('useQueueSync — duration is derived, not zero', () => {
  it('converts the lib durationMs to seconds', async () => {
    libState.durationMs = 245_600;
    beginSession({
      uri: AUDIO_URI,
      title: 'Pale Matter',
      type: 'music',
      streamType: 'audio',
      mediaLane: 'audio',
    });
    renderHook(() => useQueueSync());

    // Seconds, matching ScannedTrack.duration / PlaylistItem.duration.
    await waitFor(() => expect(currentFile()?.duration).toBe(246));
  });
});

describe('useQueueSync — no session means nothing is current', () => {
  it('clears the playlist when no session is loaded', async () => {
    // The hook used to infer this from the lib's `state.title`, which is
    // a heuristic; `useNowPlayingStore.current === null` is the same
    // condition `PlayerChrome` gates on, so there is one owner.
    usePlayerStore.getState().loadPlaylistToPlayer([
      {
        uri: AUDIO_URI,
        title: 'Pale Matter',
        duration: 240,
        source: 'local',
        type: 'music',
        mediaType: 'audio',
      },
    ]);
    renderHook(() => useQueueSync());

    await waitFor(() => expect(currentFile()).toBeNull());
    expect(usePlayerStore.getState().playlist).toEqual([]);
  });
});