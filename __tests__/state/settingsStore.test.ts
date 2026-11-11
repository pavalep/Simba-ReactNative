/// <reference types="node" />
/**
 * The settings store after the JS splash was deleted (2026-11-11).
 *
 * `hasLaunched` used to gate the JS `Splash` route. That screen is gone —
 * the app's splash is the native `SplashActivity` — so the flag went with
 * it. An install that still carries the key persisted has to SHED it, not
 * merely ignore it.
 *
 * Covers:
 *   - the rehydrated state carries no `hasLaunched`
 *   - the persisted blob is rewritten without it (zustand v5 does not write
 *     the merged state back on rehydrate, so the store forces one write)
 *   - a blob that never had the key is left untouched — no write per launch
 *   - the next launch does not rewrite it again
 */

type MMKVShape = {
  set: (key: string, value: string) => void;
  getString: (key: string) => string | undefined;
};

type StoreShape = {
  getState: () => Record<string, unknown>;
};

/** Let the persist middleware's promise chain settle. */
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Seed the MMKV mock with a `settings` blob, then load the store against
 * it — the shape of a launch on an install that already has a blob.
 *
 * The module registry is reset first so the store is CREATED against the
 * seeded blob (it hydrates at import time), and the mock is re-required
 * after the reset so the test and the store share one Map.
 */
async function loadStore(seed: Record<string, unknown>) {
  jest.resetModules();
  const {CURRENT_PERSIST_VERSION} = require('../../src/state/persistence');
  const {MMKV} = require('react-native-mmkv');
  const mmkv: MMKVShape = new MMKV({id: 'simba'});
  const seedRaw = JSON.stringify({
    state: seed,
    version: CURRENT_PERSIST_VERSION,
  });
  mmkv.set('settings', seedRaw);

  const {useSettingsStore} = require('../../src/state/settingsStore');
  await flush();
  await flush();

  return {
    useSettingsStore: useSettingsStore as StoreShape,
    mmkv,
    seedRaw,
    version: CURRENT_PERSIST_VERSION,
  };
}

const has = (o: object, key: string) =>
  Object.prototype.hasOwnProperty.call(o, key);

describe('useSettingsStore — the removed JS splash flag', () => {
  it('drops the stale hasLaunched out of the rehydrated state', async () => {
    const {useSettingsStore} = await loadStore({
      themeMode: 'light',
      hasLaunched: true,
    });

    const state = useSettingsStore.getState();
    expect(has(state, 'hasLaunched')).toBe(false);
    // The rest of the persisted state still comes through.
    expect(state.themeMode).toBe('light');
  });

  it('rewrites the persisted blob so the dead key leaves the disk', async () => {
    const {mmkv, version} = await loadStore({
      themeMode: 'light',
      hasLaunched: true,
    });

    const raw = mmkv.getString('settings');
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw as string);
    expect(has(parsed.state, 'hasLaunched')).toBe(false);
    expect(parsed.state.themeMode).toBe('light');
    expect(parsed.version).toBe(version);
  });

  it('leaves a clean blob untouched — no write on every launch', async () => {
    const {mmkv, seedRaw} = await loadStore({themeMode: 'dark'});

    expect(mmkv.getString('settings')).toBe(seedRaw);
  });

  it('does not rewrite the blob again on the next launch', async () => {
    const first = await loadStore({themeMode: 'light', hasLaunched: true});
    const afterFirstLaunch = first.mmkv.getString('settings') as string;
    expect(JSON.parse(afterFirstLaunch).state.hasLaunched).toBeUndefined();

    // Second launch, same on-disk contents.
    jest.resetModules();
    const {MMKV} = require('react-native-mmkv');
    const mmkv: MMKVShape = new MMKV({id: 'simba'});
    mmkv.set('settings', afterFirstLaunch);
    require('../../src/state/settingsStore');
    await flush();
    await flush();

    expect(mmkv.getString('settings')).toBe(afterFirstLaunch);
  });
});
