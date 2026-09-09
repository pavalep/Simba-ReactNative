// react-native-mmkv mock — Map-backed, in-memory, jest-friendly.
//
// The real `react-native-mmkv` v4 ships a Nitro + JSI native module
// (requires the Android toolchain to run). The mock supports just
// enough of the v4 surface for jest tests:
//   - `createMMKV({id})` returns an MMKV-shaped instance scoped to
//     the `id`. MMKV is exported as a TYPE only (no constructor).
//   - `set` / `getString` / `getBoolean` / `getNumber` / `remove` /
//     `contains` / `clearAll` / `getAllKeys`.
//   - `recrypt` is a a no-op (production re-encryption isn't exercised
//     in tests).
//
// Tests that exercise the just-in-time AsyncStorage→MMKV migration
// (see `__tests__/infrastructure/mmkv.test.ts`) use the exposed
// `__resetForTests` helper to clear this mock between cases. The
// mock auto-creates an inner Map on first access, so reset wipes
// cleanly and the next `simbaMMKV.set(...)` re-registers the inner
// Map under the right id.

class MMKV {
  constructor({id} = {id: 'mmkv.default'}) {
    this._id = id;
    this._ensureStore();
  }

  _ensureStore() {
    let store = MMKV._stores.get(this._id);
    if (!store) {
      store = new Map();
      MMKV._stores.set(this._id, store);
    }
    this._store = store;
    return store;
  }

  set(key, value) {
    this._ensureStore().set(String(key), value);
  }

  getString(key) {
    const v = this._ensureStore().get(String(key));
    return typeof v === 'string' ? v : undefined;
  }

  getBoolean(key) {
    const v = this._ensureStore().get(String(key));
    return typeof v === 'boolean' ? v : undefined;
  }

  getNumber(key) {
    const v = this._ensureStore().get(String(key));
    return typeof v === 'number' ? v : undefined;
  }

  contains(key) {
    return this._ensureStore().has(String(key));
  }

  remove(key) {
    return this._ensureStore().delete(String(key));
  }

  clearAll() {
    this._ensureStore().clear();
  }

  getAllKeys() {
    return Array.from(this._ensureStore().keys());
  }

  recrypt() {
    // No-op in mock.
  }
}

MMKV._stores = new Map();

function createMMKV(configuration = {id: 'mmkv.default'}) {
  return new MMKV(configuration);
}

module.exports = {
  // `MMKV` exported as a *class* (object identity) so tests can do
  // `require('react-native-mmkv').MMKV.__resetForTests()`. The
  // production code imports `MMKV` as a type only, so the class
  // existence at runtime is harmless.
  MMKV,
  createMMKV,
};

// Test helper: clear every Map-backed MMKV instance. Production
// code never calls this. Subsequent operations on existing
// MMKV-shaped instances will re-register the inner Map under the
// right id (lazy via `_ensureStore()`).
MMKV.__resetForTests = () => MMKV._stores.clear();