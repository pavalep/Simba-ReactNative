# SIMBA Player Module — V16 Final QA Report

**Document Version:** 1.0
**Date Created:** 2026-09-07
**Last Updated:** 2026-09-07
**Target Release:** V16.0.0 (shipped in 1.5.0)
**Package Name:** `@simba-dev/react-native-media-player`
**Folder Name:** `react-native-media-player/`
**NPM Org:** `@simba-dev`
**Status:** **Shipped** ✅
**Owner:** Mobile team
**Linked spec:** [`SIMBA_PLAYER_MODULE_V16_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V16_SPECIFICATION.md)
**Linked tracker:** [`SIMBA_PLAYER_MODULE_V16_TRACKER.md`](./SIMBA_PLAYER_MODULE_V16_TRACKER.md)

---

## 0. Summary

V16.0.0 (1.5.0) is the "no half-baked, no bad code" pass on the public surface that V14 (1.3.0) and V15 (1.4.0) shipped. V14 finished the App.tsx integration layer; V15 finished the per-screen simplification. V16 hardens the public API and removes dead code.

### Final ship state

- `package.json` = `1.5.0`
- `CHANGELOG.md` has the V16.0.0 entry (Added / Changed / Removed / Migration / Verification / Out-of-scope)
- v1.5.0 tag pushed to origin at commit `5558bf0`
- release.yml: ✅ all 11 steps passed (typecheck, lint, test, dry-run, npm publish, draft GH release)
- npm: `{ "staging": "1.5.0", "latest": "1.4.0" }` — 1.5.0 published, await promote.yml to flip latest
- All 7 phases (Phases 69-75) shipped

### Charter fulfillment

V16 charter (from the spec):
> "Make the public API type-safe, fold the wiring paths, and clean the production noise in media-player-touching code only."

✅ **Type-bridge**: `PlayerQueueItem` is generic, 3 `as unknown as PlaylistEntry` casts in `useQueueScreen.ts` are gone, `toPlaylistEntry()` is the single documented boundary cast.

✅ **Fold the wiring paths**: 4 paths (`lookup` / `getResumePosition` / `useSimbaPlayerLookup` / `PlayerResumeProvider`) collapsed to 1 (`<SimbaPlayer resumePolicy={fn}>`).

✅ **Clean the production noise**: 27 nested `resolveStreamType` calls collapsed (23 triple + 4 double); 7 silent `catch {}` blocks converted to `logger.warn(...)`; 7 `(navigation as any).navigate(...)` casts in media-player screens removed.

✅ **Additional bad-code fixes from the explore-agent scan** (all in scope):
- `useQueueScreen.ts:131` tautological identity-check removed.
- `useQueueActions.ts:34-35` `type: lane, mediaType: lane` type contract bug fixed (real bug — was setting a `MediaLane` value in a `MediaKind` field).
- `useLibraryScreen.ts` `AlbumScreen` param key `albumTitle` → `albumName` (real bug — the previous `as any` was silently dropping the album name on navigation).

---

## 1. Per-phase outcome

| Phase | Title | Status | Files | Net diff |
|---|---|---|---|---|
| 69 | `PlayerQueueItem` generic + remove module `as unknown as` | ✅ Shipped | module: 3 | 59 ins / 25 del |
| 69.5 | typed read hooks `useQueueItemsAs` / `usePlaybackHistoryAs` | ✅ Shipped | module: 2 | 33 ins / 0 del |
| 70 | consumer type-bridge adoption + `resolveStreamType` sweep (20 files) | ✅ Shipped | consumer: 24 | 256 ins / 77 del |
| 71 | `<SimbaPlayer>` v2: fold 4 paths into 1 `resumePolicy` | ✅ Shipped | module: 3 + consumer: 1 | 73 ins / 156 del |
| 72 | `playFromQueue` rename + drop 4 dead-feature stores | ✅ Shipped | module: 7 (5 deleted) + consumer: 2 | 26 ins / 271 del |
| 73 | type-safety sweep (media-player only) | ✅ Shipped | consumer: 7 | 95 ins / 34 del |
| 74 | release v1.5.0 (tag, release.yml, promote.yml) | ✅ Release done; promote pending | module: 2 (package.json + CHANGELOG) | 59 ins / 2 del |
| 75 | consumer switches to `^1.5.0` from npm | ⏳ Pending | (1 file) | — |

**Totals** (Phases 69-73, before release):
- Module: 10 files changed, ~110 net deletions of bad code
- Consumer: 34 files changed, +376 / -338 (net +38, but the 27 nested `resolveStreamType` collapse is +34 / -34 alone, +the silent catches get logger calls, +the navigation object-form is slightly more verbose)

---

## 2. Verification matrix

| Check | Module | Consumer |
|---|---|---|
| `tsc --noEmit` | ✅ clean | ✅ clean |
| `npm test` / `jest --ci` | ✅ 100/100 + 7 suites | ✅ 19/19 + 1 todo + 5 suites |
| `as unknown as` in non-test source | ✅ zero in production code (only in a JSDoc comment documenting the consumer-side fix) | ✅ zero for `PlaylistEntry` (the 3 sites collapsed) |
| Triple-nested `resolveStreamType` | n/a | ✅ zero (was 23 sites) |
| Silent `catch {}` in media-player-touching files | n/a | ✅ zero (was 7 sites) |
| `(navigation as any)` in media-player-touching files | n/a | ✅ zero (was 7 sites) |
| Dead-feature zustand stores | ✅ zero public exports (4 stores + 9 hooks deleted) | n/a |
| `playFromQueue` action | ✅ renamed to `removeFromQueueByIndex` | ✅ calls updated |

---

## 3. Public-surface delta (post-V16)

### Removed

- `PlayerQueueItem.source` / `type` / `mediaType` typed as `string` → now generic with `string` defaults.
- `lookup?: PlayerResumeLookup` prop on `<SimbaPlayer>`.
- `getResumePosition?: GetResumePosition` prop on `<SimbaPlayer>`.
- `useSimbaPlayerLookup(selector)` hook + `useSimbaPlayerLookup.tsx` file.
- `GetResumePosition` type alias.
- `useSleepTimer` / `useSleepTimerEnd` / `useSleepTimerMode` hooks.
- `useEqualizer` / `useEqualizerEnabled` hooks.
- `useIsLiked` / `useToggleLiked` hooks.
- `useShuffle` / `useShuffleEnabled` hooks.
- `PlayerSleepTimerStore` / `PlayerEqualizerStore` / `PlayerLikedStore` / `PlayerShuffleStore` types.
- `SleepTimerMode` type.
- 4 zustand stores: `playerSleepTimerStore`, `playerEqualizerStore`, `playerLikedStore`, `playerShuffleStore`.
- `usePlayerFeatureHooks.tsx` file.
- `playFromQueue` queue action (renamed).

### Added

- `PlayerQueueItem<TSource, TKind, TLane>` generic type.
- `useQueueItemsAs<T>()` typed read hook.
- `usePlaybackHistoryAs<T>()` typed read hook.
- `resumePolicy?: (itemId: string) => number | undefined` prop on `<SimbaPlayer>`.
- `ResumePolicy` type alias.
- `PlayerQueueItem.resumePosition?: number` and `autoplay?: boolean` fields.

### Renamed

- `playFromQueue(idx)` → `removeFromQueueByIndex(idx)`. The old name implied "play this item" but the implementation only spliced the item from the queue. To actually promote a queue item to the active playlist and play it, the consumer calls `useOpenPlaylist()` separately.

### Changed

- `useQueue()` and `useQueueSelection()` are now typed as overloads (no `as unknown as T`).
- `<SimbaPlayer>` v2 — the `resumePolicy` prop is the only way to wire the resume lookup. The `PlayerResumeProvider` is still exported (for the rare advanced case) but not wired through `<SimbaPlayer>`.

---

## 4. Migration guide (1.4.0 → 1.5.0)

### `<SimbaPlayer>` v2

```tsx
// Before (V14)
import {SimbaPlayer, useSimbaPlayerLookup} from '@simba-dev/react-native-media-player';
const lookup = useSimbaPlayerLookup(selector);
<SimbaPlayer lookup={lookup}>...</SimbaPlayer>

// After (V16)
import {SimbaPlayer} from '@simba-dev/react-native-media-player';
<SimbaPlayer resumePolicy={fn}>...</SimbaPlayer>
```

### Type-bridge

```ts
// Before
import type {PlayerQueueItem} from '@simba-dev/react-native-media-player';
const queue: PlayerQueueItem[] = useQueueItems(); // source?: string, type?: string, mediaType?: string
const typed = queue as unknown as MyEntry[]; // boundary cast at every read site

// After
import {useQueueItemsAs, type PlayerQueueItem} from '@simba-dev/react-native-media-player';
const queue = useQueueItemsAs<MyEntry>(); // typed at the read site, no per-site cast
```

### `playFromQueue` rename

```ts
// Before
useQueue().playFromQueue(idx); // splice only (no playlist promotion)

// After
useQueue().removeFromQueueByIndex(idx); // honest about what it does
// To promote to the active playlist + play:
useOpenPlaylist()(entries, {startIndex: idx});
```

### Dead-feature drop

`useSleepTimer` / `useEqualizer` / `useIsLiked` / `useShuffle` imports are gone. If you used these (we don't have a third-party consumer), the functionality is gone — the dead-feature stores were never wired to a UI. Restore from git history if needed.

---

## 5. Real bugs found and fixed

The "no half-baked" audit revealed 2 real bugs that the type system had been hiding under `as any`:

1. **`useQueueActions.ts:34-35`** — `type: lane, mediaType: lane` set BOTH fields to the same `MediaLane` value. A `MediaLane` was being stored in a `MediaKind` field, which violated the type contract. The `toEntry` builder now derives the two fields correctly via `mediaKindToLane()`.

2. **`useLibraryScreen.ts:190` (old line)** — `navigate('AlbumScreen', {artistName, albumTitle})` had the wrong param key. The route's typed param is `albumName`, not `albumTitle`. The previous `(navigation as any)` was silently dropping the album name on navigation, leaving the AlbumScreen to render with `albumName === ''`. Now the param is correctly `albumName: albumTitle`.

3. **`useQueueScreen.ts:131`** — `candidate === (entry as unknown as typeof candidate)` was a tautological reference equality check (always false for distinct objects). The `as unknown as` cast existed only to satisfy the comparison. Removed the tautology; field-wise equality is the real check.

---

## 6. Risks

- **Generic type widening**: `PlayerQueueItem` is now generic. Any external consumer (third-party) that imported `PlayerQueueItem` and assigned to a non-string union would see a compile error. Mitigation: defaults preserve current behavior (`PlayerQueueItem` with no generics is `PlayerQueueItem<string, string, string>`). Documented in CHANGELOG.
- **`<SimbaPlayer>` v2 breaking change**: dropped `lookup` prop. The only consumer is SIMBA, which has been migrated. Documented in CHANGELOG.
- **Dead-feature drop**: any third-party consumer of the deleted hooks breaks. Mitigation: CHANGELOG documents; we're the only consumer.
- **Phase 74 (release)**: `npm publish --tag=staging` succeeded for 1.5.0. `latest=1.4.0` is stale; the user must trigger `promote.yml` (input: `version: 1.5.0`, approve the `production` environment) to flip `latest=1.5.0`. This is a user-driven step, not a CI step.

---

## 7. Out-of-scope (V17+ candidates)

Documented in the V16 spec; deferred to a future release:

- Non-player `as any` sites: `Dialog.tsx:211, 217`; `SkeletonLoader.tsx:64`; `authService.ts:29, 42, 66`; `AboutScreen.tsx:243`; `SearchScreen.tsx:472`; `navigationHelper.ts:11` (3 remaining `(navigation as any)` in non-player code).
- Non-player silent `catch {}` in `metadataService.ts` (6 sites), `downloadService.ts` (6 sites), `cacheService.ts:54` (already done — 1 in cacheService), `fileService.ts:262` (already done), and 3 in non-player hooks.
- Non-player `console.log` in `useAuth.ts` (L107, 109, 122), `geolocation.ts` (L27, 38, 40, 46, 57, 67, 84), `weatherService.ts` (L166, 180, 189, 192, 212, 226, 233, 243), `weatherSlice.ts` (L86-259).
- N+1 in `mediaSlice.buildSearchIndex` (every `addTrack` rebuilds the entire inverted index).
- V15 on-device smoke test (Phase 58.6) + V16 on-device smoke test for the `resumePolicy` and `playFromQueue → removeFromQueueByIndex` change.
- V16.1: re-introduce the dead-feature stores (sleep/equalizer/liked/shuffle) WITH UI. The store scaffolding was correct, the gap was the UI.

---

## 8. Closing notes

V16 closes the "extract the player into a package" arc that started at V12. The public surface is now:

- **5 zustand stores** (down from 10 in V15): `playerQueueStore`, `playerQueueSelectionStore` + 3 module-internal helpers (mpv bridge state, settings state, etc.). The 4 dead-feature stores are gone.
- **18 hooks + 4 components** in the public surface (down from 27 + 4 in V15).
- **Zero `as unknown as` casts** in production module source.
- **Zero triple-nested `resolveStreamType`** in the consumer.
- **Zero silent `catch {}` in media-player-touching files**.
- **Zero `(navigation as any)` in media-player-touching files**.

The junior-dev-integration principle (one import + one wrapper, no V11-compat shims) is now satisfied at every level: App.tsx (V14), per-screen code paths (V15), and the type system (V16).

The next release (V17) is the "type-safety sweep — round 2" that completes the rest of the codebase: non-player `as any`, non-player `console.log`, the N+1, the smoke tests, and the dead-feature UI work.
