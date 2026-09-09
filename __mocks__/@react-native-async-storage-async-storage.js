// AsyncStorage mock — Map-backed, in-memory, jest-friendly.
//
// The V21 P06 placeholder-services test (`__tests__/placeholderServices.test.ts`)
// exercises `storageService` and `playlistService`, which both use
// AsyncStorage. The pre-V21 mock was `module.exports = {}`, which
// made `AsyncStorage.getItem` / `setItem` throw `undefined is not a
// function` the first time a service tried to persist.
//
// The V21 mock is a Map-backed store with the same API as the
// real AsyncStorage (getItem / setItem / removeItem / multiGet /
// multiSet / clear / getAllKeys). It supports parallel calls and
// returns the same shape as the real module.

const store = new Map();

module.exports = {
  getItem: jest.fn(key => Promise.resolve(store.has(key) ? store.get(key) : null)),
  setItem: jest.fn((key, value) => {
    store.set(key, String(value));
    return Promise.resolve();
  }),
  removeItem: jest.fn(key => {
    store.delete(key);
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    store.clear();
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Array.from(store.keys()))),
  multiGet: jest.fn(keys =>
    Promise.resolve(keys.map(k => [k, store.has(k) ? store.get(k) : null])),
  ),
  multiSet: jest.fn(pairs => {
    for (const [k, v] of pairs) store.set(k, String(v));
    return Promise.resolve();
  }),
  multiRemove: jest.fn(keys => {
    for (const k of keys) store.delete(k);
    return Promise.resolve();
  }),
  // Test helper: reset between tests so prior state doesn't leak.
  __resetForTests: () => store.clear(),
};
