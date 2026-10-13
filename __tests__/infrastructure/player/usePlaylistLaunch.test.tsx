/**
 * V21 F5 A1 — playlist launches go through the app seam.
 *
 * ## What is pinned, and why each one earns its place
 *
 * A1 exists because playlist launches were the one path that skipped
 * `useResumeAwarePlayerActivity`. Three defects came from that, and each
 * has its own test below:
 *
 *   1. no lane/kind on the session → the `C-16` badge bug for playlists
 *   2. no resume → "play all" restarted a half-finished album
 *   3. a live route to `bridge.openPlayer` → `startActivity(PlayerActivity)`
 *
 * The third is why this suite asserts on the SEAM and not on a return value:
 * a test that only checks the resolved boolean passes equally well whether
 * the launch went through the seam or straight down the lib's own path,
 * which is the branch that has to disappear before F5 A2 can delete the
 * Activity.
 */

import {renderHook} from '@testing-library/react-native';

const mockOpenPlayer = jest.fn(
  async (_opts: Record<string, unknown>): Promise<boolean> => true,
);
const mockLibOpenPlayer = jest.fn(async () => true);

jest.mock('../../../src/infrastructure/player/useResumeAwarePlayerActivity', () => ({
  usePlayerActivity: () => ({openPlayer: mockOpenPlayer}),
}));

// Modelled so that a regression — someone re-exporting the LIB's
// `useOpenPlaylist` from the barrel — fails on "the lib path ran" instead of
// on `undefined is not a function`, which would prove nothing.
jest.mock('@simba-dev/react-native-media-player', () => ({
  usePlayerActivity: () => ({openPlayer: mockLibOpenPlayer}),
  useOpenPlaylist: () => ({
    openPlaylist: jest.fn(async () => {
      mockLibOpenPlayer();
      return true;
    }),
  }),
}));

import {
  useOpenPlaylist,
  orderPlaylist,
  type PlaylistLaunchEntry,
} from '../../../src/infrastructure/player/usePlaylistLaunch';

const ENTRIES: PlaylistLaunchEntry[] = [
  {uri: 'file:///a.mkv', title: 'A', type: 'movie', mediaType: 'video'},
  {uri: 'file:///b.mp3', title: 'B', type: 'music', mediaType: 'audio'},
  {uri: 'file:///c.m4b', title: 'C', type: 'audiobook', mediaType: 'audio'},
];

describe('usePlaylistLaunch — routes through the app seam', () => {
  beforeEach(() => {
    mockOpenPlayer.mockClear();
    mockLibOpenPlayer.mockClear();
  });

  it('launches the start track through the SEAM, never the lib path', async () => {
    // The A1 contract. `bridge.openPlayer` → `startActivity(PlayerActivity)`
    // is what F5 A2 deletes; if this assertion ever fails, A2 is unsafe.
    const {result} = await renderHook(() => useOpenPlaylist());

    await result.current.openPlaylist(ENTRIES);

    expect(mockOpenPlayer).toHaveBeenCalledTimes(1);
    expect(mockLibOpenPlayer).not.toHaveBeenCalled();
  });

  it('records the lane and kind the entry already carried', async () => {
    // The `C-16` fix, for playlists. `PlaylistEntry` has `type` and
    // `mediaType` on every entry and the lib hook discarded both, so the
    // session recorded no lane and downstream fills the hole with 'audio'.
    const {result} = await renderHook(() => useOpenPlaylist());

    await result.current.openPlaylist(ENTRIES, {type: 'video'});

    expect(mockOpenPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaKind: 'movie',
        mediaLane: 'video',
      }),
    );
  });

  it('omits the lane entirely when the entry has none, rather than guessing', async () => {
    // A `uri`-only caller is legitimate. Inventing a lane here would be the
    // same defect one layer up: a value nobody asked for, treated as fact.
    const {result} = await renderHook(() => useOpenPlaylist());

    await result.current.openPlaylist([{uri: 'file:///x.mkv', title: 'X'}]);

    const opts = mockOpenPlayer.mock.calls[0]![0];
    expect(opts).not.toHaveProperty('mediaLane');
    expect(opts).not.toHaveProperty('mediaKind');
  });

  it('forwards the start position when the caller knows one', async () => {
    const {result} = await renderHook(() => useOpenPlaylist());

    await result.current.openPlaylist(ENTRIES, {startPositionMs: 90_000});

    expect(mockOpenPlayer).toHaveBeenCalledWith(
      expect.objectContaining({startPositionMs: 90_000}),
    );
  });

  it('does not send an explicit 0 when no position was given', async () => {
    // An explicit `0` suppresses the seam's resume policy. Omitting the
    // field is what lets "play all" resume the album you were halfway
    // through — the defect this hook was written to close.
    const {result} = await renderHook(() => useOpenPlaylist());

    await result.current.openPlaylist(ENTRIES);

    expect(mockOpenPlayer.mock.calls[0]![0]).not.toHaveProperty(
      'startPositionMs',
    );
  });

  it('is a no-op for an empty list', async () => {
    const {result} = await renderHook(() => useOpenPlaylist());

    await expect(result.current.openPlaylist([])).resolves.toBe(false);
    expect(mockOpenPlayer).not.toHaveBeenCalled();
  });

  it('launches the requested index, not the first entry', async () => {
    const {result} = await renderHook(() => useOpenPlaylist());

    await result.current.openPlaylist(ENTRIES, {startIndex: 2});

    expect(mockOpenPlayer).toHaveBeenCalledWith(
      expect.objectContaining({uri: 'file:///c.m4b'}),
    );
  });

  // ── startExtras ──────────────────────────────────────────────

  it('forwards startExtras artwork under the name the seam consumes', async () => {
    // `PlaylistDetailScreen` passed `artworkUri`, which matches nothing
    // downstream, so playlist launches silently had no notification artwork
    // while every single-track launch did. The options type now names the
    // real field, which makes the mistake a compile error.
    const {result} = await renderHook(() => useOpenPlaylist());

    await result.current.openPlaylist(ENTRIES, {
      startExtras: {provider: 'trakt', thumbnailPath: 'file:///art.jpg'},
    });

    expect(mockOpenPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'trakt',
        thumbnailPath: 'file:///art.jpg',
      }),
    );
  });

  it('startExtras overrides the entry, field by field', async () => {
    // An override that sets only artwork must not erase the entry's lane —
    // a wholesale replace would reintroduce the missing-lane defect.
    const {result} = await renderHook(() => useOpenPlaylist());

    await result.current.openPlaylist(ENTRIES, {
      startExtras: {thumbnailPath: 'file:///art.jpg'},
    });

    const opts = mockOpenPlayer.mock.calls[0]![0];
    expect(opts.thumbnailPath).toBe('file:///art.jpg');
    expect(opts.mediaLane).toBe('video');
    expect(opts.mediaKind).toBe('movie');
  });
});

describe('orderPlaylist', () => {
  it('starts at 0 with no options', () => {
    const {ordered, startIndex} = orderPlaylist(ENTRIES);
    expect(startIndex).toBe(0);
    expect(ordered).toEqual(ENTRIES);
  });

  it('clamps an out-of-range start index instead of launching nothing', () => {
    const {startIndex} = orderPlaylist(ENTRIES, {startIndex: 99});
    expect(startIndex).toBe(2);
  });

  it('never shuffles to the input array itself', () => {
    // Mutating the caller's array is how a playlist reorders itself after
    // one "shuffle" press and looks broken on the second.
    const input = [...ENTRIES];
    orderPlaylist(input, {shuffle: true});
    expect(input).toEqual(ENTRIES);
  });

  it('keeps every entry when shuffling', () => {
    const {ordered} = orderPlaylist(ENTRIES, {shuffle: true});
    expect(ordered).toHaveLength(ENTRIES.length);
    expect([...ordered].sort((a, b) => a.uri.localeCompare(b.uri))).toEqual(
      [...ENTRIES].sort((a, b) => a.uri.localeCompare(b.uri)),
    );
  });

  it('does not start a shuffle at index 0', () => {
    // Inherited from the lib hook: a shuffle that begins on track 1 is
    // indistinguishable from "play all", which is not what the user asked
    // for. Only meaningful when there is more than one entry.
    for (let i = 0; i < 40; i += 1) {
      const {startIndex} = orderPlaylist(ENTRIES, {shuffle: true});
      expect(startIndex).toBeGreaterThan(0);
    }
  });

  it('starts a single-entry shuffle at 0 — there is nowhere else to go', () => {
    const {startIndex} = orderPlaylist([ENTRIES[0]!], {shuffle: true});
    expect(startIndex).toBe(0);
  });

  it('honours an explicit start index even when shuffling', () => {
    const {startIndex} = orderPlaylist(ENTRIES, {shuffle: true, startIndex: 2});
    expect(startIndex).toBe(2);
  });
});