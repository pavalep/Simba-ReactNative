import AsyncStorage from '@react-native-async-storage/async-storage';
import {createJSONStorage, type StateStorage} from 'zustand/middleware';
import {sharedMMKVStorage} from '../infrastructure/persistence/mmkv';
import {normalizeMediaClassification} from '../types/media';

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
 * V21 W5 P17: stayed at `1`. The AsyncStorage→MMKV migration is
 * transparent (same JSON shape, different backing store) — no
 * per-store `migrate` function is needed.
 *
 * V21: raised to `2`. This is NOT cosmetic — it is the repair for the
 * mis-tagged-row defect. See `repairPersistedLanes`.
 */
export const CURRENT_PERSIST_VERSION = 2;

/**
 * V21: repair the media lane on already-persisted rows.
 *
 * ## The defect
 *
 * `MediaClassification` carries both `type` (a `MediaKind`) and `mediaType`
 * (a `MediaLane`), and the writer used to let the lane win when the two
 * disagreed. Rows persisted before the seam started recording a lane were
 * therefore written as e.g. `{type: 'movie', mediaType: 'audio'}` — and the
 * old normalizer, which also preferred `mediaType`, normalised them straight
 * back to `'audio'`. Fixing only the writer and the normalizer stops NEW bad
 * rows but leaves every existing one intact forever: they are on disk, they
 * are read verbatim, and nothing re-runs the derivation on them.
 *
 * That is why this has to be a migration rather than a code fix.
 *
 * ## Why the migration can repair rather than guess
 *
 * `normalizeMediaClassification` now derives the lane from the kind
 * unconditionally, so a row that retains enough information to know what it
 * is (`type`) can be repaired exactly rather than guessed at.
 *
 * ## Why it also rewrites rows that were already correct
 *
 * Idempotent by construction: a row whose lane already agrees with its kind
 * normalises to itself. Rewriting every row rather than only the
 * disagreeing ones keeps this a single code path — a "only fix the bad
 * ones" migration needs a second predicate that can itself be wrong, and the
 * bug we are repairing existed precisely because two places disagreed about
 * a default. One rule, applied to everything.
 *
 * Rows are rewritten in place in the persisted blob; no row is dropped, so
 * a user's history is never lost to a repair.
 */
export function repairPersistedLanes<T>(rows: T[] | undefined): T[] | undefined {
  if (!Array.isArray(rows)) return rows;
  let changed = false;
  const next = rows.map(row => {
    if (row === null || typeof row !== 'object') return row;
    const record = row as Record<string, unknown>;
    const repaired = normalizeMediaClassification({
      source: record.source as never,
      type: record.type as never,
      mediaType: record.mediaType as never,
      provider: record.provider as never,
      folderId: record.folderId as never,
    });
    if (
      repaired.mediaType === record.mediaType &&
      repaired.type === record.type &&
      repaired.source === record.source
    ) {
      return row;
    }
    changed = true;
    // Preserve every other persisted field (position, duration,
    // lastPlayedAt, thumbnailPath, ...) — this is a classification repair,
    // not a rewrite of the row.
    //
    // Cast back to `T`: the spread provably keeps the row's own fields and
    // only overrides the four classification ones, so widening and then
    // narrowing is safe here. The cast is confined to this branch; the
    // caller's `T` is never otherwise violated.
    return {...record, ...repaired} as T;
  });
  return changed ? next : rows;
}