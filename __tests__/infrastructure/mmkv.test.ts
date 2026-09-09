// ─── V21 W5 P17 — MMKV infrastructure tests ──────────────────────────
// Covers the just-in-time AsyncStorage→MMKV migration + the typed
// KV helpers. Run via `npx jest --forceExit`.

import AsyncStorage from '@react-native-async-storage/async-storage';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {MMKV} = require('react-native-mmkv');
import {
  sharedMMKVStorage,
  kvGet,
  kvSet,
  kvDelete,
  kvListKeys,
  simbaMMKV,
} from '../../src/infrastructure/persistence/mmkv';

beforeEach(() => {
  // Reset both mocks. The AsyncStorage one exposes `__resetForTests`
  // (see __mocks__/@react-native-async-storage-async-storage.js);
  // MMKV's mock exposes `MMKV.__resetForTests`. Tests that need to
  // pre-populate the MMKV side should call `simbaMMKV.set(...)` —
  // going through the singleton (not the inner Map) ensures the
  // lazy-create path in the mock re-registers the inner Map under
  // the right id after a reset.
  (AsyncStorage as unknown as {__resetForTests: () => void}).__resetForTests();
  MMKV.__resetForTests();
});

describe('sharedMMKVStorage (just-in-time migration)', () => {
  it('returns null when neither side has the key', async () => {
    expect(await sharedMMKVStorage.getItem('settings')).toBeNull();
  });

  it('returns the value when MMKV already has it', async () => {
    simbaMMKV.set('settings', JSON.stringify({theme: 'dark'}));
    expect(await sharedMMKVStorage.getItem('settings')).toBe(
      JSON.stringify({theme: 'dark'}),
    );
  });

  it('migrates a key from AsyncStorage on first read', async () => {
    // Simulate pre-V21 AsyncStorage data.
    await AsyncStorage.setItem('settings', JSON.stringify({theme: 'light'}));

    const value = await sharedMMKVStorage.getItem('settings');
    expect(value).toBe(JSON.stringify({theme: 'light'}));

    // MMKV should now hold the migrated value.
    expect(simbaMMKV.getString('settings')).toBe(JSON.stringify({theme: 'light'}));
  });

  it('clears the AsyncStorage entry after migration', async () => {
    await AsyncStorage.setItem('playlists', JSON.stringify([{id: 'p1'}]));

    await sharedMMKVStorage.getItem('playlists');

    // The migration kicks off `AsyncStorage.removeItem` but it's
    // fire-and-forget (async). Give the microtask queue a turn.
    await Promise.resolve();
    await Promise.resolve();

    expect(await AsyncStorage.getItem('playlists')).toBeNull();
  });

  it('round-trips through setItem + getItem', async () => {
    sharedMMKVStorage.setItem('settings', JSON.stringify({theme: 'sepia'}));
    expect(await sharedMMKVStorage.getItem('settings')).toBe(
      JSON.stringify({theme: 'sepia'}),
    );
  });

  it('does not re-read AsyncStorage once MMKV has the key', async () => {
    // First read — migrates.
    await AsyncStorage.setItem('settings', JSON.stringify({theme: 'dark'}));
    await sharedMMKVStorage.getItem('settings');
    await Promise.resolve();

    // Wipe AsyncStorage (simulates a later session).
    await AsyncStorage.removeItem('settings');

    // MMKV still has it; subsequent reads shouldn't look at
    // AsyncStorage. We assert by checking the returned value
    // matches the MMKV-side data, not any future AsyncStorage write.
    const value = await sharedMMKVStorage.getItem('settings');
    expect(value).toBe(JSON.stringify({theme: 'dark'}));

    // No-op writes AsyncStorage — confirm getItem still returns MMKV.
    await AsyncStorage.setItem('settings', JSON.stringify({theme: 'stale'}));
    expect(await sharedMMKVStorage.getItem('settings')).toBe(
      JSON.stringify({theme: 'dark'}),
    );
  });

  it('removeItem clears the key from MMKV', async () => {
    sharedMMKVStorage.setItem('settings', 'data');
    expect(await sharedMMKVStorage.getItem('settings')).toBe('data');

    sharedMMKVStorage.removeItem('settings');
    expect(await sharedMMKVStorage.getItem('settings')).toBeNull();
  });

  it('concurrent reads of the same key both observe the migration', async () => {
    await AsyncStorage.setItem('settings', JSON.stringify({theme: 'light'}));

    const [a, b] = await Promise.all([
      sharedMMKVStorage.getItem('settings'),
      sharedMMKVStorage.getItem('settings'),
    ]);

    expect(a).toBe(JSON.stringify({theme: 'light'}));
    expect(b).toBe(JSON.stringify({theme: 'light'}));
    // Whichever promise ran the migration first wins; both
    // ultimately see the same value.
  });
});

describe('typed KV helpers', () => {
  it('kvGet returns null when key is missing', () => {
    expect(kvGet('missing')).toBeNull();
  });

  it('kvGet returns null for malformed JSON', () => {
    simbaMMKV.set('bad', 'this is not json');
    expect(kvGet('bad')).toBeNull();
  });

  it('kvSet + kvGet round-trip', () => {
    expect(kvSet('theme', 'dark')).toBe(true);
    expect(kvGet('theme')).toBe('dark');
  });

  it('kvSet handles objects + arrays', () => {
    const payload = {items: [1, 2, 3], name: 'folders'};
    kvSet('folders', payload);
    expect(kvGet('folders')).toEqual(payload);
  });

  it('kvDelete returns true when the key existed', () => {
    kvSet('k', 'v');
    expect(kvDelete('k')).toBe(true);
    expect(kvGet('k')).toBeNull();
  });

  it('kvDelete returns false when the key was absent', () => {
    expect(kvDelete('absent')).toBe(false);
  });

  it('kvListKeys lists every key in the MMKV instance', () => {
    kvSet('a', 1);
    kvSet('b', 2);
    const keys = kvListKeys().sort();
    expect(keys).toEqual(['a', 'b']);
  });
});