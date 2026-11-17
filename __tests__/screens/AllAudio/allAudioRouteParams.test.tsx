/**
 * The All Audio list honours the route's `filter` and `sort`.
 *
 * ## The defect
 *
 * The route declared `{filter?: string; sort?: string}` and the app
 * SENT both — and the screen read neither:
 *
 *   • `src/screens/Artist/hooks/useArtistScreen.ts:151` sends
 *     `filter: artistName` for the artist screen's "view all tracks",
 *     and the page opened showing **every track on the device**; and
 *   • `src/features/library/presentation/components/LibraryScreenContent.tsx:327`
 *     sends `sort: 'artist'` for the Library's "View All Artists", and
 *     the page opened **sorted by title**.
 *
 * A param the screen ignores is a promise the app does not keep.
 *
 * ## What is asserted
 *
 * The hook's own output — the list it hands the screen — because that
 * is where the two params are read.
 */

import {renderHook} from '@testing-library/react-native';
import type {ScannedTrack} from '../../../src/state';

/** A local track, with the fields the media store's own shape requires. */
function makeTrack(over: Partial<ScannedTrack>): ScannedTrack {
  return {
    uri: 'file:///music/track.mp3',
    title: 'Track',
    artist: 'Artist',
    album: 'Album',
    year: 2020,
    genre: 'Electronic',
    trackNumber: 1,
    duration: 200,
    albumArtUri: '',
    folderPath: '/music',
    folderId: 'local-folder:audio:/music',
    source: 'local',
    type: 'music',
    mediaType: 'audio',
    ...over,
  };
}

/**
 * The library's tracks, in a deliberate order.
 *
 * The `mock` prefix is REQUIRED, not decoration: jest's hoist plugin lifts
 * the `jest.mock` calls above this binding and then refuses to let a mock
 * factory close over an out-of-scope variable whose name does not start
 * with `mock` (or whose initialiser is not a pure literal). Built by
 * `makeTrack(...)`, this array is neither — so the name carries the
 * exemption.
 */
const mockTracks: ScannedTrack[] = [
  makeTrack({
    uri: 'file:///music/zeta.mp3',
    title: 'Zeta',
    artist: 'Kavinsky',
    album: 'OutRun',
    year: 2013,
    trackNumber: 1,
    duration: 240,
  }),
  makeTrack({
    uri: 'file:///music/alpha.mp3',
    title: 'Alpha',
    artist: 'Autechre',
    album: 'Amber',
    year: 2014,
    trackNumber: 1,
    duration: 180,
  }),
  makeTrack({
    uri: 'file:///music/beta.mp3',
    title: 'Beta',
    artist: 'Kavinsky',
    album: 'OutRun',
    year: 2013,
    trackNumber: 2,
    duration: 200,
  }),
];

jest.mock('../../../src/state', () => ({
  useMediaAudioTracks: () => mockTracks,
}));

jest.mock('../../../src/hooks/useMediaScanner', () => ({
  useMediaScanner: () => ({startScan: jest.fn(), isScanning: false}),
}));

jest.mock('../../../src/infrastructure/player', () => ({
  useResumeAwareLaunch: () => ({openPlayer: jest.fn()}),
}));

// Imported AFTER the mocks so the module under test picks them up.
import {useAllAudioScreen} from '../../../src/screens/AllAudio/hooks/useAllAudioScreen';

const titles = (hook: {filteredTracks: ScannedTrack[]}) =>
  hook.filteredTracks.map(t => t.title);

// `@testing-library/react-native` v14's `renderHook` is ASYNC — the
// hook is not mounted until the returned promise settles. Destructuring
// `{result}` synchronously reads `undefined`.
async function renderAllAudioHook(
  sort?: string,
  filter?: string,
) {
  return renderHook(() => useAllAudioScreen(sort, filter));
}

describe('the All Audio list honours its route params', () => {
  it('sorts by TITLE when no sort is given', async () => {
    const {result} = await renderAllAudioHook();
    expect(titles(result.current)).toEqual(['Alpha', 'Beta', 'Zeta']);
    expect(result.current.sortMode).toBe('title');
  });

  it('sorts by ARTIST when the route asks for it', async () => {
    const {result} = await renderAllAudioHook('artist');
    expect(result.current.sortMode).toBe('artist');
    // Both artists' names sort Autechre before Kavinsky; within an
    // artist the track's own title still decides.
    expect(titles(result.current)).toEqual(['Alpha', 'Beta', 'Zeta']);
  });

  it('keeps only the artist the route asks for', async () => {
    const {result} = await renderAllAudioHook(undefined, 'Kavinsky');
    expect(titles(result.current)).toEqual(['Beta', 'Zeta']);
  });

  it('matches the artist case-insensitively', async () => {
    const {result} = await renderAllAudioHook(undefined, 'kavinsky');
    expect(titles(result.current)).toEqual(['Beta', 'Zeta']);
  });

  it('shows everything when the route asks for no artist', async () => {
    const {result} = await renderAllAudioHook(undefined, undefined);
    expect(result.current.filteredTracks).toHaveLength(3);
  });
});
