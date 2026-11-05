/**
 * Home's playlist rail — WHAT IS IN IT, and in what order.
 *
 * ## What this pins
 *
 * The rail is headed **"Pinned Playlists"**, so what is under that title
 * has to be the truth the title claims: **PINNED playlists only**, and the
 * pinned order is the RECENCY OF PINNING (`pinnedAt`) — not the playlist's
 * own `updatedAt` (D-P3, spec §4.6). The unpinned playlists are NOT in
 * this rail; they live behind "See All" → All Playlists, the page that
 * owns them.
 *
 * ## How this changed, and why
 *
 * The rail used to hold the pinned playlists FIRST and then every other
 * playlist by recency — which is why F-050 retitled it "Playlists": under
 * a title that said "Pinned", an unpinned playlist was a lie (spec §4.0
 * rule 4). It no longer mixes the two, so the title is true again and the
 * unpinned ones have one home instead of two.
 *
 * It also used to be pushed AFTER the "Discover" group, which filed a
 * personal shelf under discovery. It is now in "Your Library", where the
 * other two per-user rails live.
 *
 * The evidence the tracker asks for is here verbatim — an unpinned,
 * recently-updated playlist and a pinned, older one, and the rail shows
 * ONLY the pinned one.
 */

import {renderHook} from '@testing-library/react-native';
import type {Playlist} from '../../../src/types/playlist';

jest.mock('../../../src/infrastructure/player', () => ({
  resolveStreamType: (kind: string) => kind,
  useResumeAwareLaunch: () => ({openPlayer: jest.fn()}),
}));
jest.mock('../../../src/components/feedback/Toast', () => ({
  useToast: () => ({show: jest.fn(), hide: jest.fn()}),
}));
jest.mock('../../../src/components/core/Dialog', () => ({
  useConfirmDialog: () => ({confirm: jest.fn()}),
}));
jest.mock('../../../src/theme', () => ({
  useTheme: () => ({
    theme: 'dark',
    colors: {accent: {gold: '#c9a84c'}, text: {inverse: '#000000'}},
  }),
}));
jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => ({user: null}),
}));
jest.mock('../../../src/hooks/useWeather', () => ({
  useWeather: () => ({snapshot: null, isFirstLoad: false}),
}));
jest.mock('../../../src/features/bookmarks', () => ({
  useBookmarks: () => ({allBookmarks: [], remove: jest.fn()}),
}));
jest.mock('../../../src/features/followedPodcasts', () => ({
  useFollowedPodcasts: () => ({list: []}),
}));
jest.mock('../../../src/features/recentHistory', () => ({
  useRecentHistory: () => ({list: [], removeRecent: jest.fn()}),
}));
jest.mock('../../../src/state', () => ({
  useMediaStore: (selector: (s: {tracks: unknown[]; isScanning: boolean}) => unknown) =>
    selector({tracks: [], isScanning: false}),
}));
// The playlist list is created INSIDE the factory and handed back on a
// `__`-prefixed property: a factory that closed over a `const` declared
// in this file would run before that `const` initialised, and the mock
// would cache `undefined`.
jest.mock('../../../src/features/playlists', () => {
  const mockPlaylistState: {list: Playlist[]} = {list: []};
  return {
    // The REAL `pinnedAtMs` — the rail's pinned order comes from the
    // facade's one owner, so this mock must not hand the hook a second
    // implementation of the rule to read instead.
    ...jest.requireActual('../../../src/features/playlists'),
    __mockPlaylistState: mockPlaylistState,
    usePlaylists: () => ({list: mockPlaylistState.list}),
  };
});

import {useHomeScreen} from '../../../src/screens/Home/hooks/useHomeScreen';

const {__mockPlaylistState} = jest.requireMock('../../../src/features/playlists') as {
  __mockPlaylistState: {list: Playlist[]};
};

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: 'pl_1',
    name: 'Playlist',
    kind: 'AUDIO_ONLY',
    items: [],
    pinned: false,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function fakeNavigation() {
  return {
    navigate: jest.fn(),
    dispatch: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  } as never;
}

/** The names on Home's playlist rail, in the order the rail shows them. */
async function railNames(playlists: Playlist[]): Promise<string[]> {
  __mockPlaylistState.list = playlists;
  const {result} = await renderHook(() => useHomeScreen(fakeNavigation()));
  const section = result.current.sections.find(s => s.type === 'PINNED_PLAYLISTS');
  if (!section || section.type !== 'PINNED_PLAYLISTS') {
    throw new Error('Home rendered no PINNED_PLAYLISTS section');
  }
  return (section.items as Playlist[]).map(p => p.name);
}

/** The section types Home renders, in order. */
async function sectionTypes(playlists: Playlist[]): Promise<string[]> {
  __mockPlaylistState.list = playlists;
  const {result} = await renderHook(() => useHomeScreen(fakeNavigation()));
  return result.current.sections.map(s => s.type);
}

describe('useHomeScreen — the pinned playlist rail', () => {
  it('holds the pinned playlist and leaves the unpinned one out', async () => {
    const names = await railNames([
      makePlaylist({
        id: 'pl_unpinned',
        name: 'Edited Yesterday',
        pinned: false,
        updatedAt: '2026-10-29T00:00:00.000Z',
      }),
      makePlaylist({
        id: 'pl_pinned',
        name: 'Pinned Last Week',
        pinned: true,
        pinnedAt: '2026-10-20T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      }),
    ]);

    expect(names).toEqual(['Pinned Last Week']);
  });

  it('orders the pinned playlists by when they were pinned', async () => {
    const names = await railNames([
      makePlaylist({
        id: 'pl_old_pin',
        name: 'Pinned First',
        pinned: true,
        pinnedAt: '2026-10-10T00:00:00.000Z',
        updatedAt: '2026-10-25T00:00:00.000Z',
      }),
      makePlaylist({
        id: 'pl_new_pin',
        name: 'Pinned Last',
        pinned: true,
        pinnedAt: '2026-10-26T00:00:00.000Z',
        updatedAt: '2026-10-02T00:00:00.000Z',
      }),
    ]);

    expect(names).toEqual(['Pinned Last', 'Pinned First']);
  });

  it('is empty when nothing is pinned', async () => {
    const names = await railNames([
      makePlaylist({id: 'pl_a', name: 'Unpinned Recent', pinned: false, updatedAt: '2026-10-29T00:00:00.000Z'}),
      makePlaylist({id: 'pl_b', name: 'Unpinned Older', pinned: false, updatedAt: '2026-10-28T00:00:00.000Z'}),
    ]);

    expect(names).toEqual([]);
  });

  it('shows at most three pinned playlists', async () => {
    const names = await railNames([
      makePlaylist({id: 'pl_1', name: 'One', pinned: true, pinnedAt: '2026-10-03T00:00:00.000Z'}),
      makePlaylist({id: 'pl_2', name: 'Two', pinned: true, pinnedAt: '2026-10-02T00:00:00.000Z'}),
      makePlaylist({id: 'pl_3', name: 'Three', pinned: true, pinnedAt: '2026-10-01T00:00:00.000Z'}),
      makePlaylist({id: 'pl_4', name: 'Four', pinned: true, pinnedAt: '2025-10-01T00:00:00.000Z'}),
    ]);

    expect(names).toEqual(['One', 'Two', 'Three']);
  });

  it('sits in "Your Library", before the "Discover" group', async () => {
    // A personal shelf filed under "Discover" is how it went missing: the
    // user had to scroll past the whole catalogue to reach their own
    // playlists.
    const types = await sectionTypes([
      makePlaylist({id: 'pl_1', name: 'Pinned', pinned: true, pinnedAt: '2026-10-03T00:00:00.000Z'}),
    ]);

    const rail = types.indexOf('PINNED_PLAYLISTS');
    const library = types.indexOf('SUBSECTION_TITLE');
    const discover = types.lastIndexOf('SUBSECTION_TITLE');

    expect(rail).toBeGreaterThan(-1);
    expect(library).toBeGreaterThan(-1);
    expect(discover).toBeGreaterThan(library);
    expect(rail).toBeGreaterThan(library);
    expect(rail).toBeLessThan(discover);
  });

  it('does not reorder the playlist list it was given', async () => {
    // The rail's order is the RAIL's. The Library shows the same list,
    // and a sort that ran in place would reorder it there too.
    // The PINNED one is the more recently updated one, so a sort that
    // ran in place over the list it was given WOULD reorder it - and
    // the assertion below is what catches that.
    const list = [
      makePlaylist({
        id: 'pl_1',
        name: 'Unpinned',
        pinned: false,
        updatedAt: '2026-10-10T00:00:00.000Z',
      }),
      makePlaylist({
        id: 'pl_2',
        name: 'Pinned',
        pinned: true,
        pinnedAt: '2026-10-12T00:00:00.000Z',
        updatedAt: '2026-10-29T00:00:00.000Z',
      }),
    ];

    await railNames(list);

    expect(list.map(p => p.name)).toEqual(['Unpinned', 'Pinned']);
  });
});
