/**
 * V21 F5 A5 — Album and Artist derive the playback lane from the track.
 *
 * ## The defect this pins
 *
 * All six launch sites in these two hooks passed a literal `type: 'audio'`.
 * That was wrong, not merely fragile: `useMediaStore.tracks` holds BOTH
 * lanes. `fileEntriesToTracks` (`src/services/fileService.ts:691`) sets
 * `type` from the file extension —
 *
 * ```ts
 * const mediaType = isScanVideoExt(ext) ? 'video' : 'audio';
 * ```
 *
 * — and neither hook filters by it; both select purely on
 * artist/album name. So a music video sitting in an artist's album folder
 * appeared in the track list, and tapping it opened the AUDIO player.
 *
 * `useLibraryScreen` and `PlaylistDetailScreen` already derived the lane
 * with `resolveStreamType(first.type)`. These two did not. That split is
 * the defect: the same intent, two different implementations, one of them
 * wrong.
 *
 * ## Why mock only the seam
 *
 * `useResumeAwareLaunch` is mocked, which is the app's launch
 * boundary. Above it everything runs for real: the screen hook, the real
 * `useOpenPlaylist`, the real `orderPlaylist` (including its shuffle), and
 * the REAL `resolveStreamType`. Stubbing `resolveStreamType` instead would
 * make every assertion tautological — the test would only prove that a
 * value reached a function it had itself just been told to return.
 */

import {act, renderHook} from '@testing-library/react-native';

const mockOpenPlayer = jest.fn(
  async (_opts: Record<string, unknown>): Promise<boolean> => true,
);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: jest.fn(), goBack: jest.fn()}),
  useRoute: () => ({params: mockRouteParams}),
}));

// The app seam. Mocking it here captures exactly what the screen asked to
// launch; the lib hook underneath it is never reached.
jest.mock('../../src/infrastructure/player/useResumeAwareLaunch', () => ({
  useResumeAwareLaunch: () => ({openPlayer: mockOpenPlayer}),
}));

// `usePlayer` is read for `isPlaying` only, and it needs the native module.
// The barrel is NOT `requireActual`-ed: it re-exports the whole VideoPlayer
// graph, which pulls in token modules this suite has no business loading.
// Instead the barrel is rebuilt from exactly the four symbols these two
// hooks use — with `resolveStreamType` and `useOpenPlaylist` the REAL ones,
// so the lane is derived by the real table and the playlist is ordered by
// the real seam.
jest.mock('../../src/infrastructure/player', () => {
  const realLib = jest.requireActual('@simba-dev/react-native-media-player');
  const realLaunch = jest.requireActual(
    '../../src/infrastructure/player/usePlaylistLaunch',
  );
  return {
    resolveStreamType: realLib.resolveStreamType,
    useOpenPlaylist: realLaunch.useOpenPlaylist,
    useResumeAwareLaunch: () => ({openPlayer: mockOpenPlayer}),
    usePlayer: () => ({state: {isPlaying: false}}),
  };
});

import {useMediaStore, type ScannedTrack} from '../../src/state';
import {useAlbumScreen} from '../../src/screens/Album/hooks/useAlbumScreen';
import {useArtistScreen} from '../../src/screens/Artist/hooks/useArtistScreen';

let mockRouteParams: Record<string, unknown> = {};

const ARTIST = 'Nausicaa';
const ALBUM = 'Lumine';
const OTHER_ALBUM = 'Ashes';

/**
 * A music video and a song in the SAME album. Sorting is by `trackNumber`,
 * so the video is deliberately NOT first — that is what makes "derive
 * from the tapped entry" distinguishable from "derive from entry 0".
 */
const SONG: ScannedTrack = {
  uri: 'file:///music/nausicaa/lumine/01.mp3',
  title: '01 Pale Matter',
  artist: ARTIST,
  album: ALBUM,
  year: 2021,
  genre: '',
  trackNumber: 1,
  duration: 240,
  albumArtUri: '',
  folderPath: 'file:///music/nausicaa/lumine',
  folderId: 'lumine',
  source: 'local',
  type: 'music',
  mediaType: 'audio',
};

const VIDEO: ScannedTrack = {
  ...SONG,
  uri: 'file:///music/nausicaa/lumine/02.mkv',
  title: '02 The Fall',
  trackNumber: 2,
  duration: 300,
  folderId: 'lumine',
  type: 'video',
  mediaType: 'video',
};

/** A different album by the same artist — proves the lane is per-entry. */
const SONG_ELSEWHERE: ScannedTrack = {
  ...SONG,
  uri: 'file:///music/nausicaa/ashes/01.mp3',
  album: OTHER_ALBUM,
  trackNumber: 1,
  folderId: 'ashes',
};

function seed(tracks: ScannedTrack[]) {
  useMediaStore.setState({tracks});
}

/** The `type` the screen asked the seam to launch with. */
function launchedLane(): string {
  expect(mockOpenPlayer).toHaveBeenCalledTimes(1);
  return mockOpenPlayer.mock.calls[0]![0].type as string;
}

/**
 * Every handler calls `loadPlaylistToPlayer`, which writes the player store.
 * That store is subscribed by the mounted hook, so the write has to be
 * flushed inside `act` or React reports an unwrapped update.
 */
async function fire(fn: () => Promise<unknown> | unknown) {
  await act(async () => {
    await fn();
  });
}

beforeEach(() => {
  mockOpenPlayer.mockClear();
  seed([SONG, VIDEO, SONG_ELSEWHERE]);
});

describe('useAlbumScreen — lane is derived, not assumed', () => {
  beforeEach(() => {
    mockRouteParams = {albumName: ALBUM, artistName: ARTIST};
  });

  it('opens the tapped VIDEO in the video lane', async () => {
    // The regression. A literal 'audio' here passes this test.
    const {result} = await renderHook(() => useAlbumScreen());

    await fire(() => result.current.handlers.playTrack(1));

    expect(launchedLane()).toBe('video');
  });

  it('still opens a tapped song in the audio lane', async () => {
    // The counterpart. Without it, a fix that simply always returns
    // 'video' would satisfy the test above.
    const {result} = await renderHook(() => useAlbumScreen());

    await fire(() => result.current.handlers.playTrack(0));

    expect(launchedLane()).toBe('audio');
  });

  it('derives the play-all lane from the first track', async () => {
    const {result} = await renderHook(() => useAlbumScreen());

    await fire(() => result.current.handlers.playAll());

    expect(launchedLane()).toBe('audio');
  });

  it('derives the play-all lane from the first track when it is a video', async () => {
    // Same handler, different first entry. This is what pins the
    // derivation itself rather than the alphabet.
    useMediaStore.setState({
      tracks: [VIDEO, SONG].map((t, i) => ({...t, trackNumber: i + 1})),
    });
    const {result} = await renderHook(() => useAlbumScreen());

    await fire(() => result.current.handlers.playAll());

    expect(launchedLane()).toBe('video');
  });

  it('shuffles into the same lane as play-all', async () => {
    // Shuffling reorders inside the seam, but the LANE is a property of the
    // playlist, not of the pick — the queue is single-lane by design
    // (`normalizeSingleLane` in playerStore).
    const {result} = await renderHook(() => useAlbumScreen());

    await fire(() => result.current.handlers.shuffleAll());

    expect(launchedLane()).toBe('audio');
  });
});

describe('useArtistScreen — lane is derived, not assumed', () => {
  beforeEach(() => {
    mockRouteParams = {artistName: ARTIST};
  });

  it('opens a tapped VIDEO in the video lane', async () => {
    // The regression. Single-track play took a different code path from
    // play-all, and had to be fixed separately.
    const {result} = await renderHook(() => useArtistScreen());

    await fire(() => result.current.handlers.playTrack(VIDEO));

    expect(launchedLane()).toBe('video');
  });

  it('still opens a tapped song in the audio lane', async () => {
    const {result} = await renderHook(() => useArtistScreen());

    await fire(() => result.current.handlers.playTrack(SONG));

    expect(launchedLane()).toBe('audio');
  });

  it('derives the play-all lane from the artist first track', async () => {
    const {result} = await renderHook(() => useArtistScreen());

    await fire(() => result.current.handlers.playAll());

    expect(launchedLane()).toBe('audio');
  });

  it('shuffles into the same lane as play-all', async () => {
    const {result} = await renderHook(() => useArtistScreen());

    await fire(() => result.current.handlers.shuffleAll());

    expect(launchedLane()).toBe('audio');
  });
});