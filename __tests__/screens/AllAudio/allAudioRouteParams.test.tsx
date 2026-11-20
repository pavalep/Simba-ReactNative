/**
 * The All Audio page honours its route params.
 *
 * ## The defect this pins
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
 * ## Where the params live now
 *
 * WAVE B16 (Wave B) moved the page onto the shared browse grammar, and
 * the params moved with it — into the OPTION MODEL, which is the one
 * owner of a page's scope:
 *
 *   • the `sort` param seeds the SORT group (`useSectionOptions`);
 *   • the `filter` param seeds the ARTIST group — a filter axis, so
 *     the chip strip says what the list is answering.
 *
 * The hook is a pure function of that scope, so the two halves are
 * tested where they live: the option model's SEED here, and the
 * hook's APPLICATION in the second block.
 */

import {renderHook} from '@testing-library/react-native';
import {useSectionOptions} from '../../../src/hooks/useSectionOptions';
import {createAllAudioSectionConfig} from '../../../src/screens/AllAudio/related/browseConfig';
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
  resolveStreamType: (kind: string) => kind,
}));

// Imported AFTER the mocks so the module under test picks them up.
import {useAllAudioScreen} from '../../../src/screens/AllAudio/hooks/useAllAudioScreen';

const titles = (hook: {visibleTracks: ScannedTrack[]}) =>
  hook.visibleTracks.map(t => t.title);

// `@testing-library/react-native` v14's `renderHook` is ASYNC — the
// hook is not mounted until the returned promise settles. Destructuring
// `{result}` synchronously reads `undefined`.
async function renderAllAudioHook(scope: {
  artist?: string;
  query?: string;
  sort?: string;
} = {}) {
  return renderHook(() => useAllAudioScreen(scope));
}

/** The option model, seeded from the route's params. */
async function renderOptions(params: {filter?: string; sort?: string}) {
  const config = createAllAudioSectionConfig(mockTracks, params.filter);
  return renderHook(() => useSectionOptions(config, params));
}

describe('the All Audio page seeds its scope from the route', () => {
  it('seeds the SORT group from the route', async () => {
    const {result} = await renderOptions({sort: 'artist'});
    expect(result.current.state.sort).toBe('artist');
    expect(result.current.options.sort).toBe('artist');
  });

  it('seeds the ARTIST group from the route', async () => {
    const {result} = await renderOptions({filter: 'Kavinsky'});
    expect(result.current.state.filters.filter).toEqual(['Kavinsky']);
    expect(result.current.options.filter).toEqual(['Kavinsky']);
  });

  it('matches the artist case-insensitively and keeps the LIBRARY spelling', async () => {
    const {result} = await renderOptions({filter: 'kavinsky'});
    expect(result.current.state.filters.filter).toEqual(['Kavinsky']);
  });

  it('keeps an artist the library does not hold VISIBLE', async () => {
    // The filter has to be visible even when it matches nothing: an
    // invisible filter cannot be removed, and the page would show an
    // empty list with no reason on screen.
    const {result} = await renderOptions({filter: 'Ghost'});
    expect(result.current.state.filters.filter).toEqual(['Ghost']);
  });

  it('ignores a sort the group does not offer', async () => {
    const {result} = await renderOptions({sort: 'bogus'});
    expect(result.current.state.sort).toBeUndefined();
    // The page still opens in the config's default order.
    expect(result.current.options.sort).toBe('title');
  });
});

describe('the All Audio list applies its scope', () => {
  it('sorts by TITLE when no sort is given', async () => {
    const {result} = await renderAllAudioHook();
    expect(titles(result.current)).toEqual(['Alpha', 'Beta', 'Zeta']);
    expect(result.current.sortLabel).toBe('Title');
  });

  it('sorts by ARTIST when the scope asks for it', async () => {
    const {result} = await renderAllAudioHook({sort: 'artist'});
    expect(result.current.sortLabel).toBe('Artist');
    // Both artists' names sort Autechre before Kavinsky; within an
    // artist the track's own title still decides.
    expect(titles(result.current)).toEqual(['Alpha', 'Beta', 'Zeta']);
  });

  it('keeps only the artist the scope asks for', async () => {
    const {result} = await renderAllAudioHook({artist: 'Kavinsky'});
    expect(titles(result.current)).toEqual(['Beta', 'Zeta']);
  });

  it('matches the artist case-insensitively', async () => {
    const {result} = await renderAllAudioHook({artist: 'kavinsky'});
    expect(titles(result.current)).toEqual(['Beta', 'Zeta']);
  });

  it('shows everything when the scope asks for no artist', async () => {
    const {result} = await renderAllAudioHook();
    expect(result.current.visibleTracks).toHaveLength(3);
  });

  it('narrows the list to the search term', async () => {
    const {result} = await renderAllAudioHook({query: 'zet'});
    expect(titles(result.current)).toEqual(['Zeta']);
  });
});
