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

/**
 * B-047 — the run must CONTAIN what is playing.
 *
 * ## The defect this pins
 *
 * The session and the RUN are two records, and a launch that does not go
 * through the run updated only ONE of them: the session became the new
 * track while the run kept the old playlist and the old index.
 * `useArtistScreen.ts:103-121` (`handlePlayTrack`) is the clearest case —
 * its own sibling `handlePlayAll` (`:123-127`) loads the run first, and
 * this one does not.
 *
 * So the run described something the user was no longer listening to, and
 * the SAME `currentIndex` feeds two surfaces: the transport's ⏭ advanced
 * into the old album, and the queue screen's "Up Next" showed the old
 * album's tail. One defect, two surfaces.
 *
 * ## The rule
 *
 * Playing something from outside the queue starts a new queue — Plex
 * replaces the playback queue when the user starts a different item.
 */
describe('useQueueSync — the run must contain what is playing (B-047)', () => {
  const ALBUM = [
    {
      uri: AUDIO_URI,
      title: 'Pale Matter',
      duration: 240,
      source: 'local' as const,
      type: 'music' as const,
      mediaType: 'audio' as const,
    },
    {
      uri: 'file:///music/nausicaa/lumine/02.mp3',
      title: 'The Great Passage',
      duration: 260,
      source: 'local' as const,
      type: 'music' as const,
      mediaType: 'audio' as const,
    },
    {
      uri: 'file:///music/nausicaa/lumine/03.mp3',
      title: 'Library Table',
      duration: 280,
      source: 'local' as const,
      type: 'music' as const,
      mediaType: 'audio' as const,
    },
  ];
  const OUTSIDE_URI = 'file:///music/somewhere-else/single.mp3';

  it('replaces the stale run when the launch is from OUTSIDE it', async () => {
    // The defect. The run still held the album, so ⏭ advanced into an
    // album the user was no longer listening to.
    usePlayerStore.getState().loadPlaylistToPlayer(ALBUM);

    beginSession({
      uri: OUTSIDE_URI,
      title: 'A Single Track',
      type: 'music',
      streamType: 'audio',
      mediaLane: 'audio',
    });
    renderHook(() => useQueueSync());

    await waitFor(() =>
      expect(usePlayerStore.getState().playlist).toHaveLength(1),
    );
    expect(usePlayerStore.getState().playlist[0]?.uri).toBe(OUTSIDE_URI);
    expect(usePlayerStore.getState().currentIndex).toBe(0);
  });

  it('leaves the run alone when the launch IS in it', async () => {
    // The counterpart — without it, a fix that replaced the run on every
    // launch would pass.
    usePlayerStore.getState().loadPlaylistToPlayer(ALBUM);
    usePlayerStore.getState().playFromPlaylist(1);

    beginSession({
      uri: ALBUM[1]!.uri,
      title: ALBUM[1]!.title,
      type: 'music',
      streamType: 'audio',
      mediaLane: 'audio',
    });
    renderHook(() => useQueueSync());

    await waitFor(() =>
      expect(usePlayerStore.getState().currentFile?.uri).toBe(ALBUM[1]!.uri),
    );
    // The run is UNCHANGED: three items, still positioned at the second.
    expect(usePlayerStore.getState().playlist).toHaveLength(3);
    expect(usePlayerStore.getState().currentIndex).toBe(1);
  });

  it('compares the run against the CANONICAL uri, not the raw one', async () => {
    // The session's URI is canonical (`nowPlayingStore.begin` applies
    // `mediaKey`) while the run's entries carry the raw catalogue URI.
    // Comparing the raw strings would miss every local path and replace
    // a perfectly good run on every tick.
    const raw = '/music/nausicaa/lumine/01.mp3';
    usePlayerStore.getState().loadPlaylistToPlayer([
      {
        uri: raw,
        title: 'Pale Matter',
        duration: 240,
        source: 'local',
        type: 'music',
        mediaType: 'audio',
      },
    ]);

    beginSession({
      uri: raw,
      title: 'Pale Matter',
      type: 'music',
      streamType: 'audio',
      mediaLane: 'audio',
    });
    renderHook(() => useQueueSync());

    await waitFor(() =>
      expect(usePlayerStore.getState().currentFile?.uri).toBe(
        'file:///music/nausicaa/lumine/01.mp3',
      ),
    );
    // The run still holds its own entry, under its own URI.
    expect(usePlayerStore.getState().playlist).toHaveLength(1);
    expect(usePlayerStore.getState().playlist[0]?.uri).toBe(raw);
  });

  it('leaves an EMPTY run empty', async () => {
    // Nothing is playing from a queue, so there is no stale run to
    // replace — and the queue screen's own empty state stays true.
    beginSession({
      uri: OUTSIDE_URI,
      title: 'A Single Track',
      type: 'music',
      streamType: 'audio',
      mediaLane: 'audio',
    });
    renderHook(() => useQueueSync());

    await waitFor(() =>
      expect(usePlayerStore.getState().currentFile?.uri).toBe(OUTSIDE_URI),
    );
    expect(usePlayerStore.getState().playlist).toEqual([]);
    expect(usePlayerStore.getState().currentIndex).toBe(-1);
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