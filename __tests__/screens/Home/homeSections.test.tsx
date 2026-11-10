/**
 * Home's SECTION LIST — what the page is made of, and what it is not.
 *
 * ## The rule this pins
 *
 * **A rail with nothing in it is not drawn.**
 *
 * V1 rendered four rails on every launch — Recently Played, Pinned
 * Playlists, Bookmarks and Followed Podcasts — and each one collapsed to
 * a quiet line when it was empty. On a fresh install that is four empty
 * rows between the greeting and the only content on the page. Netflix,
 * Plex, Jellyfin and Spotify never draw an empty row to get to their
 * content.
 *
 * So the rule is: the section builder leaves an empty rail out of the
 * list entirely, and the "Your Library" divider — a heading over no
 * rails — goes with it when every rail under it is empty.
 *
 * **"Discover at the top" is a CONSEQUENCE, not a position.** On a fresh
 * install the page starts with Discover because there is no library to
 * show, not because Discover was moved up. These tests pin the
 * consequence, so a future change that reorders the sections cannot
 * quietly bring the empty rails back.
 *
 * ## What is NOT under test here
 *
 * The contents of a rail (which playlists are in it, in what order) is
 * `useHomeScreenPlaylistOrder.test.tsx`. This file is about the SHAPE of
 * the page: which sections exist, and which do not.
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
jest.mock('../../../src/state', () => ({
  useMediaStore: (selector: (s: {tracks: unknown[]; isScanning: boolean}) => unknown) =>
    selector({tracks: [], isScanning: false}),
}));

// Each mock owns its own mutable state INSIDE the factory, handed back on a
// `__`-prefixed property. A factory that closed over a `const` declared in
// this file would run before that `const` initialised, and the mock would
// cache `undefined`.
jest.mock('../../../src/features/recentHistory', () => {
  const state: {list: unknown[]} = {list: []};
  return {
    __mockRecentState: state,
    useRecentHistory: () => ({list: state.list, removeRecent: jest.fn()}),
  };
});
jest.mock('../../../src/features/bookmarks', () => {
  const state: {list: unknown[]} = {list: []};
  return {
    __mockBookmarkState: state,
    useBookmarks: () => ({allBookmarks: state.list, remove: jest.fn()}),
  };
});
jest.mock('../../../src/features/followedPodcasts', () => {
  const state: {list: unknown[]} = {list: []};
  return {
    __mockPodcastState: state,
    useFollowedPodcasts: () => ({list: state.list}),
  };
});
jest.mock('../../../src/features/playlists', () => {
  const state: {list: Playlist[]} = {list: []};
  return {
    // The REAL `pinnedAtMs` — the rail's pinned order comes from the
    // facade's one owner, so this mock must not hand the hook a second
    // implementation of the rule to read instead.
    ...jest.requireActual('../../../src/features/playlists'),
    __mockPlaylistState: state,
    usePlaylists: () => ({list: state.list, setPinned: jest.fn()}),
  };
});

import {useHomeScreen} from '../../../src/screens/Home/hooks/useHomeScreen';

const {__mockRecentState} = jest.requireMock('../../../src/features/recentHistory') as {
  __mockRecentState: {list: unknown[]};
};
const {__mockBookmarkState} = jest.requireMock('../../../src/features/bookmarks') as {
  __mockBookmarkState: {list: unknown[]};
};
const {__mockPodcastState} = jest.requireMock('../../../src/features/followedPodcasts') as {
  __mockPodcastState: {list: unknown[]};
};
const {__mockPlaylistState} = jest.requireMock('../../../src/features/playlists') as {
  __mockPlaylistState: {list: Playlist[]};
};

const RECENT_ITEM = {fileUri: 'file:///movies/a.mp4', title: 'A Film'};
const BOOKMARK_ITEM = {id: 'bm-1', fileUri: 'file:///movies/b.mp4', title: 'B Film', position: 60};
const PODCAST_ITEM = {id: 7, title: 'A Podcast', author: 'Someone'};

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: 'pl_1',
    name: 'Road Trip',
    kind: 'AUDIO_ONLY',
    items: [],
    pinned: true,
    pinnedAt: '2026-10-18T10:00:00.000Z',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
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

/** The section types Home renders, in order. */
async function sectionTypes(): Promise<string[]> {
  const {result} = await renderHook(() => useHomeScreen(fakeNavigation()));
  return result.current.sections.map(s => s.type);
}

/** The labels of the section dividers Home renders, in order. */
async function dividerLabels(): Promise<string[]> {
  const {result} = await renderHook(() => useHomeScreen(fakeNavigation()));
  return result.current.sections
    .filter((s): s is Extract<typeof s, {type: 'SUBSECTION_TITLE'}> => s.type === 'SUBSECTION_TITLE')
    .map(s => s.label);
}

describe('useHomeScreen — the shape of the page', () => {
  beforeEach(() => {
    __mockRecentState.list = [];
    __mockBookmarkState.list = [];
    __mockPodcastState.list = [];
    __mockPlaylistState.list = [];
  });

  it('draws no rail at all on an empty library — not even an empty one', async () => {
    const types = await sectionTypes();

    expect(types).not.toContain('SHELF');
    expect(types).not.toContain('PINNED_PLAYLISTS');
    expect(types).not.toContain('BOOKMARKS');
    expect(types).not.toContain('FOLLOWED_PODCASTS');
  });

  it('does not draw the "Your Library" divider when every rail under it is empty', async () => {
    // A heading over no rails is a heading over nothing. On a fresh
    // install the page starts with Discover — because there is no
    // library to show, not because Discover was moved up.
    const labels = await dividerLabels();

    expect(labels).toEqual(['Discover']);
  });

  it('draws the "Your Library" divider as soon as ONE rail has something in it', async () => {
    __mockRecentState.list = [RECENT_ITEM];

    const labels = await dividerLabels();

    expect(labels).toEqual(['Your Library', 'Discover']);
  });

  it('draws only the rails that have something in them', async () => {
    __mockRecentState.list = [RECENT_ITEM];
    __mockPodcastState.list = [PODCAST_ITEM];

    const types = await sectionTypes();

    expect(types).toContain('SHELF');
    expect(types).toContain('FOLLOWED_PODCASTS');
    // These two are empty, so they are not drawn at all.
    expect(types).not.toContain('BOOKMARKS');
    expect(types).not.toContain('PINNED_PLAYLISTS');
  });

  it('always draws Discover — the catalogue is there on every launch', async () => {
    const types = await sectionTypes();

    expect(types).toContain('BROWSE_ALL');
  });

  it('draws the bookmarks rail when the user has a bookmark', async () => {
    __mockBookmarkState.list = [BOOKMARK_ITEM];

    const types = await sectionTypes();

    expect(types).toContain('BOOKMARKS');
  });

  it('draws the pinned-playlists rail when a playlist is pinned', async () => {
    __mockPlaylistState.list = [makePlaylist()];

    const types = await sectionTypes();

    expect(types).toContain('PINNED_PLAYLISTS');
  });

  it('leads with the greeting, then the library, then Discover', async () => {
    __mockRecentState.list = [RECENT_ITEM];

    const types = await sectionTypes();

    expect(types[0]).toBe('GREETING');
    const library = types.indexOf('SHELF');
    const discover = types.lastIndexOf('SUBSECTION_TITLE');
    expect(library).toBeGreaterThan(0);
    expect(discover).toBeGreaterThan(library);
  });

  it('starts a fresh install with Discover — the greeting, then Discover', async () => {
    const types = await sectionTypes();

    expect(types).toEqual(['GREETING', 'SUBSECTION_TITLE', 'BROWSE_ALL']);
  });
});
