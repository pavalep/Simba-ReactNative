import AsyncStorage from '@react-native-async-storage/async-storage';
import {createJSONStorage, type StateStorage} from 'zustand/middleware';

/**
 * V17 Phase 78: shared AsyncStorage factory for the zustand `persist`
 * middleware. One place to swap the backing store (e.g. to MMKV
 * later for performance) so each persisted store just uses
 * `storage: sharedAsyncStorage`.
 *
 * Usage in a store:
 *   import {persist, createJSONStorage} from 'zustand/middleware';
 *   import {sharedAsyncStorage} from './persistence';
 *
 *   export const useFooStore = create<FooState>()(
 *     persist(
 *       (set) => ({...}),
 *       {name: 'foo', storage: createJSONStorage(() => sharedAsyncStorage)},
 *     ),
 *   );
 */
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
 */
export const CURRENT_PERSIST_VERSION = 1;
