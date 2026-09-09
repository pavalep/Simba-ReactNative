import AsyncStorage from '@react-native-async-storage/async-storage';
import {createJSONStorage, type StateStorage} from 'zustand/middleware';
import {sharedMMKVStorage} from '../infrastructure/persistence/mmkv';

/**
 * V18.10: central persistence shim for every Zustand `persist`
 * middleware. Two adapters live here:
 *
 *   - `sharedMMKVStorage` (preferred, V21 W5 P17) — backed by
 *     `react-native-mmkv` via the adapter in
 *     `src/infrastructure/persistence/mmkv.ts`. Includes a
 *     just-in-time migration from AsyncStorage on the first read.
 *     ~30× faster on the hot-path hydrate reads every Zustand store
 *     does at boot.
 *
 *   - `sharedAsyncStorage` (legacy, retained for the migration
 *     adapter's reads) — backed by `@react-native-async-storage`.
 *     Production code should not import this directly; the adapter
 *     uses it transparently during the one-time migration.
 *
 * Usage in a store:
 *   import {persist, createJSONStorage} from 'zustand/middleware';
 *   import {sharedMMKVStorage} from './persistence';
 *
 *   export const useFooStore = create<FooState>()(
 *     persist(
 *       (set) => ({...}),
 *       {name: 'foo', storage: createJSONStorage(() => sharedMMKVStorage)},
 *     ),
 *   );
 */
export {sharedMMKVStorage};

// Kept for the migration adapter's AsyncStorage reads. Production
// stores should not import this; the adapter handles the one-time
// migration transparently. The export is intentionally not removed
// so the migration adapter's import stays local + auditable.
export const sharedAsyncStorage: StateStorage = {
  getItem: (name) => AsyncStorage.getItem(name),
  setItem: (name, value) => AsyncStorage.setItem(name, value),
  removeItem: (name) => AsyncStorage.removeItem(name),
};

/** Re-export the zustand factory so each store doesn't import it twice. */
export {createJSONStorage};

/**
 * Each persisted store declares its version here so a future shape
 * change can ship a `migrate` callback. The beta-stage + reinstall
 * policy means no data is preserved across this migration, but the
 * version field is forward-compat for V18+.
 *
 * V21 W5 P17: stays at `1`. The AsyncStorage→MMKV migration is
 * transparent (same JSON shape, different backing store) — no
 * per-store `migrate` function is needed.
 */
export const CURRENT_PERSIST_VERSION = 1;