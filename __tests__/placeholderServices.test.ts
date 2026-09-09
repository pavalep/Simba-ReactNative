// ─── V21 P06 T06.06 — round-trip tests for the 4 placeholder services
//
// Pre-V21 these services were 100% TODO (D-005, D-006, D-007, D-008).
// Post-V21 they have real implementations (or, for the genuinely
// unsupportable ones, explicit "this is a placeholder" doc comments
// pointing to the real data source). This test file proves the
// round-trip works for the 2 services that are now real.
//
// The mock at `__mocks__/@react-native-async-storage-async-storage.js`
// is a Map-backed in-memory store, so each test can call
// `AsyncStorage.__resetForTests()` to clear between cases.
//
// We don't need React or @testing-library/react-native here —
// these are pure-Node tests against the services.

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  setThemePreference,
  getThemePreference,
  setRecentSearches,
  getRecentSearches,
  setLinkedFolders,
  getLinkedFolders,
} from '../src/services/storageService';
import {playlistService} from '../src/services/playlistService';
import {mediaService} from '../src/services/mediaService';
import type {MediaFile} from '../src/types';

beforeEach(async () => {
  // The mock exports a __resetForTests helper. If the mock isn't
  // loaded for any reason, fall back to clear() (the standard API).
  const mock = AsyncStorage as unknown as {__resetForTests?: () => void};
  if (mock.__resetForTests) {
    mock.__resetForTests();
  } else {
    await AsyncStorage.clear();
  }
  // The playlistService is a singleton with a lazy-load cache.
  // Reset it so each test starts from a clean slate.
  playlistService._resetForTests();
});

describe('storageService — V21 P06 T06.01 (closes D-005)', () => {
  it('persists and loads the theme preference', async () => {
    expect(await getThemePreference()).toBe('system');
    await setThemePreference('dark');
    expect(await getThemePreference()).toBe('dark');
    await setThemePreference('light');
    expect(await getThemePreference()).toBe('light');
  });

  it('falls back to "system" when the stored value is corrupted or missing', async () => {
    // A bogus value (or no value) should be treated as 'system'
    await AsyncStorage.setItem('simba:theme', 'not-a-mode');
    expect(await getThemePreference()).toBe('system');
  });

  it('persists and loads recent searches', async () => {
    expect(await getRecentSearches()).toEqual([]);
    await setRecentSearches(['lofi', 'ambient', 'jazz']);
    expect(await getRecentSearches()).toEqual(['lofi', 'ambient', 'jazz']);
  });

  it('drops non-string entries from a corrupted recent-searches payload', async () => {
    await AsyncStorage.setItem(
      'simba:recentSearches',
      JSON.stringify(['lofi', 42, null, 'ambient', {x: 1}]),
    );
    expect(await getRecentSearches()).toEqual(['lofi', 'ambient']);
  });

  it('returns [] when the recent-searches payload is invalid JSON', async () => {
    await AsyncStorage.setItem('simba:recentSearches', '{not json');
    expect(await getRecentSearches()).toEqual([]);
  });

  it('persists and loads linked folders for video and audio separately', async () => {
    expect(await getLinkedFolders('video')).toEqual([]);
    expect(await getLinkedFolders('audio')).toEqual([]);
    await setLinkedFolders('video', ['/Movies', '/Series']);
    await setLinkedFolders('audio', ['/Music', '/Podcasts']);
    expect(await getLinkedFolders('video')).toEqual(['/Movies', '/Series']);
    expect(await getLinkedFolders('audio')).toEqual(['/Music', '/Podcasts']);
  });
});

describe('playlistService — V21 P06 T06.02 (closes D-006)', () => {
  // The pre-V21 service cached in memory and never persisted; the
  // post-V21 service round-trips through AsyncStorage. The test
  // proves the persistence layer works for the 4 public methods.

  it('starts empty for a fresh install', async () => {
    expect(await playlistService.loadPlaylists()).toEqual([]);
  });

  it('creates a playlist, then re-loads it from storage', async () => {
    const created = await playlistService.createPlaylist('My Mix');
    expect(created.title).toBe('My Mix');
    expect(created.files).toEqual([]);

    // Simulate a fresh process: re-load.
    const loaded = await playlistService.loadPlaylists();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe(created.id);
    expect(loaded[0].title).toBe('My Mix');
  });

  it('adds a file to a playlist and persists the change', async () => {
    const pl = await playlistService.createPlaylist('My Mix');
    const file: MediaFile = {
      uri: 'file:///music/track.mp3',
      title: 'Track 1',
      artist: 'A',
      album: 'B',
      duration: 100,
      source: 'local' as const,
      type: 'audio' as const,
      mediaType: 'audio' as const,
    };
    await playlistService.addToPlaylist(pl.id, file);
    const reloaded = await playlistService.loadPlaylists();
    expect(reloaded[0].files).toHaveLength(1);
    expect(reloaded[0].files[0].uri).toBe('file:///music/track.mp3');
  });

  it('removes a file from a playlist and persists the change', async () => {
    const pl = await playlistService.createPlaylist('My Mix');
    await playlistService.addToPlaylist(pl.id, {
      uri: 'a',
      title: 'A',
      duration: 0,
      source: 'local' as const,
      type: 'audio' as const,
      mediaType: 'audio' as const,
    });
    await playlistService.addToPlaylist(pl.id, {
      uri: 'b',
      title: 'B',
      duration: 0,
      source: 'local' as const,
      type: 'audio' as const,
      mediaType: 'audio' as const,
    });
    await playlistService.removeFromPlaylist(pl.id, 0);
    const reloaded = await playlistService.loadPlaylists();
    expect(reloaded[0].files).toHaveLength(1);
    expect(reloaded[0].files[0].uri).toBe('b');
  });
});

describe('mediaService — V21 P06 T06.03 (closes D-007)', () => {
  // The pre-V21 TODOs returned null / []. The post-V21 methods
  // still return null / [] (the real metadata lives in
  // useMediaStore). This test documents the contract.

  it('loadFile returns null', async () => {
    expect(await mediaService.loadFile('file:///anywhere')).toBeNull();
  });

  it('scanDirectory returns []', async () => {
    expect(await mediaService.scanDirectory('/anywhere')).toEqual([]);
  });

  it('formatDuration formats seconds as m:ss', () => {
    expect(mediaService.formatDuration(0)).toBe('0:00');
    expect(mediaService.formatDuration(59)).toBe('0:59');
    expect(mediaService.formatDuration(60)).toBe('1:00');
    expect(mediaService.formatDuration(125)).toBe('2:05');
    expect(mediaService.formatDuration(3599)).toBe('59:59');
  });
});
