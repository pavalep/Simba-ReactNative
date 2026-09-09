// ─── V21 W5 P17 (D-005 / D-006 / D-022 partly) — MMKV persistence ───
//
// One MMKV instance per app, namespace `simba`. Every Zustand store's
// `persist` middleware should point at `sharedMMKVStorage` (see
// `src/state/persistence.ts`); keys are the same string identifiers
// the stores already use (`'settings'`, `'playlists'`, `'auth'`, etc.).
//
// **Just-in-time AsyncStorage → MMKV migration:** the first time
// `sharedMMKVStorage.getItem(key)` is called for a given key, the
// adapter reads from AsyncStorage, copies the value into MMKV, and
// removes the AsyncStorage entry. After that, all reads/writes go
// straight to MMKV — no boot-time sweep, no migration flag in
// AsyncStorage, no separate migrate() function per store.
//
// Why MMKV instead of AsyncStorage? MMKV is ~30× faster on the small
// reads a Zustand store does on hydrate, and it's all-in-process
// (no JNI bridge to Java/Kotlin on every write). AsyncStorage is
// fine for boot-time config; for hot-path reads it's the wrong tool.

import {createMMKV} from 'react-native-mmkv';
import type {MMKV} from 'react-native-mmkv';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {StateStorage} from 'zustand/middleware';

/**
 * Single MMKV instance, namespace `simba`. All persisted Zustand
 * stores live under this id; the on-disk file is
 * `<app-sandbox>/mmkv/simba` on Android (and
 * `<app-sandbox>/Documents/mmkv/simba` on iOS, but iOS is V12/V21
 * scope — out of V21 W5).
 *
 * MMKV v4 API note: `react-native-mmkv` v4 ships only the factory
 * function `createMMKV()` and the `MMKV` *type* — no constructor.
 * Pre-v4 code used `new MMKV({id})`; that's now `createMMKV({id})`.
 */
export const simbaMMKV: MMKV = createMMKV({id: 'simba'});

/**
 * Zustand `StateStorage` adapter backed by MMKV with a just-in-time
 * migration from AsyncStorage. Drop-in replacement for the old
 * `sharedAsyncStorage` — every persisted store's config can swap
 * `storage: createJSONStorage(() => sharedAsyncStorage)` to
 * `storage: createJSONStorage(() => sharedMMKVStorage)` with no
 * other change.
 *
 * Migration semantics:
 *   - `getItem(key)`: if MMKV has the key, return it; otherwise read
 *     AsyncStorage, write-through to MMKV, delete the AsyncStorage
 *     entry, and return the value (or null if neither side has it).
 *   - `setItem(key, value)`: write to MMKV only. AsyncStorage is
 *     considered legacy at this point.
 *   - `removeItem(key)`: delete from MMKV only.
 *
 * Concurrent reads of the same key from different stores during
 * hydration: each `getItem` independently runs the migration; both
 * observe the same value (the first wins the write, the second is
 * a no-op MMKV.set). AsyncStorage.removeItem is idempotent.
 */
export const sharedMMKVStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (simbaMMKV.contains(name)) {
      return simbaMMKV.getString(name) ?? null;
    }
    const fromAsync = await AsyncStorage.getItem(name);
    if (fromAsync !== null) {
      simbaMMKV.set(name, fromAsync);
      // Fire-and-forget: AsyncStorage.removeItem doesn't block the
      // hydrate. If the next launch's `getItem` finds the same
      // AsyncStorage entry, the migration is idempotent.
      AsyncStorage.removeItem(name).catch(() => {
        // AsyncStorage removal failure is benign — at worst the
        // legacy entry persists (read-only, ignored on subsequent
        // launches because MMKV already has the key).
      });
    }
    return fromAsync;
  },
  setItem: (name: string, value: string): void => {
    simbaMMKV.set(name, value);
  },
  removeItem: (name: string): void => {
    simbaMMKV.remove(name);
  },
};

// ─── Typed KV helpers (T17.01 partial) ──────────────────────────────
//
// These are convenience wrappers around the MMKV singleton for the
// rare non-Zustand caller (e.g. one-off flags, transient caches).
// The Zustand persist path uses `sharedMMKVStorage` directly — it
// already passes through `JSON.parse/stringify` via `createJSONStorage`.

/** Read a JSON-encoded value, or `null` if missing / malformed. */
export function kvGet<T>(key: string): T | null {
  const raw = simbaMMKV.getString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Write a value (JSON). Returns true on success; false on quota/serialization failure. */
export function kvSet(key: string, value: unknown): boolean {
  try {
    simbaMMKV.set(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Delete a key. Returns true if it existed, false otherwise. */
export function kvDelete(key: string): boolean {
  const existed = simbaMMKV.contains(key);
  simbaMMKV.remove(key);
  return existed;
}

/** List all keys currently in MMKV (excluding AsyncStorage legacy). */
export function kvListKeys(): string[] {
  return simbaMMKV.getAllKeys();
}