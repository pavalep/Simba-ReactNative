# SIMBA Player Module — V16 Tracker

**Document Version:** 1.6
**Date Created:** 2026-09-07
**Last Updated:** 2026-09-07
**Linked spec:** [`SIMBA_PLAYER_MODULE_V16_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V16_SPECIFICATION.md)
**Linked final QA:** [`SIMBA_PLAYER_MODULE_V16_FINAL_QA_REPORT.md`](./SIMBA_PLAYER_MODULE_V16_FINAL_QA_REPORT.md)

> This tracker is the working companion to the V16 spec. Each phase has a status, an owner, a target date, and a one-paragraph narrative describing actual work vs planned.

---

## Phase 69 — Module: `PlayerQueueItem` generic + remove module `as unknown as`

**Status:** [x] Complete
**Owner:** Mobile team
**Target:** 2026-09-07
**Actual:** Shipped 2026-09-07. Module commit `85070e8` makes `PlayerQueueItem` generic over `TSource/TKind/TLane` (defaults to `string`), adds `resumePosition?` + `autoplay?` so a consumer's `PlaybackEntry` can extend the type directly. `useQueue.tsx` + `useQueueSelection.tsx` lose their `as unknown as T` casts and become typed as overloads (no-arg returns the full store, selector-arg returns the selector's return type). Module typecheck + 100/100 tests pass.

### Sub-phase 69.1 — `PlayerQueueItem` generic
**Status:** [x] Complete

### Sub-phase 69.2 — Remove `useQueue.tsx:39` cast
**Status:** [x] Complete

### Sub-phase 69.3 — Remove `useQueueSelection.tsx:24` cast
**Status:** [x] Complete

### Sub-phase 69.4 — Module verification
**Status:** [x] Complete (tsc clean, 100/100 + 7 suites)

---

## Phase 69.5 — Module: typed read hooks `useQueueItemsAs` / `usePlaybackHistoryAs`

**Status:** [x] Complete
**Owner:** Mobile team
**Target:** 2026-09-07
**Actual:** Shipped 2026-09-07. Module commit `93bb3e8` adds `useQueueItemsAs<T>()` and `usePlaybackHistoryAs<T>()` typed read hooks. The cast from the default `PlayerQueueItem[]` to the consumer's narrow `T[]` lives in ONE place (the module) instead of being scattered across every read site. Both new hooks exported from `src/index.ts`. The consumer adopts them in Phase 70.

---

## Phase 70 — Consumer: type-bridge adoption + `resolveStreamType` sweep

**Status:** [x] Complete
**Owner:** Mobile team
**Target:** 2026-09-07
**Actual:** Shipped 2026-09-07. Consumer commit `8387b99`:
- `playerSlice.ts`: `PlaylistEntry extends Omit<PlayerQueueItem<MediaSource, MediaKind, MediaLane>, 'source' | 'type' | 'mediaType'>` + re-adds the 3 fields as required + `origin?`. New `toPlaylistEntry()` helper is the single, documented boundary cast.
- `useQueueScreen.ts`: imports `useQueueItemsAs<...>` + `usePlaybackHistoryAs<...>` from the module. `QueueDisplayRow.entry` is now `PlaylistEntry`. The 3 `as unknown as PlaylistEntry` casts are gone. The line-131 tautological identity-check is removed. The silent `catch {}` in `handleJumpTo` is now `logger.warn(...)`. The double-nested `resolveStreamType` is collapsed to a single call.
- `useQueueActions.ts`: `toEntry` builder now derives `type` (MediaKind) and `mediaType` (MediaLane) correctly via `mediaKindToLane()`. Real bug fix — the previous code set BOTH to the same `MediaLane` value, which violated the type contract.
- `resolveStreamType` sweep: 23 triple-nests + 4 double-nests collapsed across 20 files via `scripts/collapse-resolveStreamType.cjs`. Zero `resolveStreamType(resolveStreamType(...))` remaining in the consumer.
- Plus the V15 dev-cycle cleanup that wasn't committed: `tsconfig.json` paths mapping removed, `.npmrc` legacy-peer-deps=true, `package.json` back at `file:../react-native-media-player` for V16 dev cycle.
- Consumer typecheck + 19/19 + 1 todo tests pass.

### Sub-phase 70.1 — `playerSlice.ts` PlaylistEntry specialization
**Status:** [x] Complete

### Sub-phase 70.2 — `useQueueScreen.ts` cast removal
**Status:** [x] Complete

### Sub-phase 70.3 — `resolveStreamType` sweep (script)
**Status:** [x] Complete

### Sub-phase 70.4 — `resolveStreamType` sweep (manual review)
**Status:** [x] Complete (script verified all collapses are safe)

### Sub-phase 70.5 — Consumer verification
**Status:** [x] Complete (tsc clean, 19/19 + 1 todo)

---

## Phase 71 — `<SimbaPlayer>` v2: fold 4 paths into 1 `resumePolicy`

**Status:** [x] Complete
**Owner:** Mobile team
**Target:** 2026-09-07
**Actual:** Shipped 2026-09-07. Module commit `a3b1049` collapses the 4 wiring paths (`lookup` / `getResumePosition` / `useSimbaPlayerLookup` / `PlayerResumeProvider`) into a single `resumePolicy?: (itemId: string) => number | undefined` prop on `<SimbaPlayer>`. The `useSimbaPlayerLookup.tsx` file is deleted. `useSimbaPlayerLookup` and `GetResumePosition` removed from `src/index.ts`. Consumer commit `85aa040` migrates `App.tsx`: the 16-line `useSimbaPlayerLookup(...)` factory + `<SimbaPlayer lookup={...}>` pair collapse to a 12-line plain function + `<SimbaPlayer resumePolicy={...}>`. Net: -19 lines + 1 fewer import.

### Sub-phase 71.1 — Module `SimbaPlayer.tsx` refactor
**Status:** [x] Complete

### Sub-phase 71.2 — Delete `useSimbaPlayerLookup.tsx`
**Status:** [x] Complete

### Sub-phase 71.3 — Module `index.ts` surface update
**Status:** [x] Complete

### Sub-phase 71.4 — Consumer `App.tsx` migration
**Status:** [x] Complete

### Sub-phase 71.5 — Verification
**Status:** [x] Complete (module: tsc clean, 100/100; consumer: tsc clean, 19/19)

---

## Phase 72 — `playFromQueue` no-op fix + dead-feature decision

**Status:** [x] Complete
**Owner:** Mobile team
**Target:** 2026-09-07
**Actual:** Shipped 2026-09-07. Module commit `51b9c95` (amended):
- `playFromQueue` renamed to `removeFromQueueByIndex` (honest about the splice-only behavior).
- 4 dead zustand stores + 9 hooks deleted: `playerSleepTimerStore`, `playerEqualizerStore`, `playerLikedStore`, `playerShuffleStore` + `useSleepTimer` / `useSleepTimerEnd` / `useSleepTimerMode` / `useEqualizer` / `useEqualizerEnabled` / `useIsLiked` / `useToggleLiked` / `useShuffle` / `useShuffleEnabled`. ~6834 bytes of dead module code removed.
- `usePlayerFeatureHooks.tsx` deleted.
- `index.ts` updated to drop the dead exports.
Consumer commit `597085e`:
- `useQueueScreen.ts` destructures `removeFromQueueByIndex` instead of `playFromQueue`.
- `playerSlice.ts` dead-code-documentation comment updated to reflect V16 reality.

### Sub-phase 72.1 — Rename `playFromQueue` → `removeFromQueueByIndex`
**Status:** [x] Complete

### Sub-phase 72.2 — Delete 4 dead zustand stores
**Status:** [x] Complete

### Sub-phase 72.3 — Delete 9 dead hooks
**Status:** [x] Complete (rolled up into the stores deletion in 72.2)

### Sub-phase 72.4 — Module `index.ts` surface update
**Status:** [x] Complete

### Sub-phase 72.5 — Consumer migration
**Status:** [x] Complete

### Sub-phase 72.6 — Verification
**Status:** [x] Complete (module: tsc clean, 100/100; consumer: tsc clean, 19/19)

---

## Phase 73 — Type-safety sweep (media-player only)

**Status:** [x] Complete
**Owner:** Mobile team
**Target:** 2026-09-07
**Actual:** Shipped 2026-09-07. Consumer commit `7c98c45`:
- 7 silent `catch {}` → `logger.warn(...)` in 5 files: `audioSettingsService.ts` (6 → 1 helper), `artCacheService.ts` (2), `cacheService.ts` (1), `fileService.ts` (1), `useHomeScreen.ts` (1). The 6 in `audioSettingsService.ts` were a copy-paste pattern; consolidated into a single `setProp(name, value)` helper.
- 7 `(navigation as any).navigate(...)` casts removed in `useLibraryScreen.ts` (6) + `useArtistScreen.ts` (1). The typed `navigate` required the object form (`{name, params?}`) for 3 routes. The `as any` was hiding a real bug: `navigate('AlbumScreen', {artistName, albumTitle})` had the wrong param key (the route's typed param is `albumName`, not `albumTitle`) — the previous `as any` was silently dropping the album name on navigation, leaving the AlbumScreen to render with an empty title.
- 3 `(navigation as any)` remain in non-player files (AboutScreen, SearchScreen, navigationHelper); deferred to V17 per scope.

### Sub-phase 73.1 — Silent catches (5 files, 7 sites)
**Status:** [x] Complete

### Sub-phase 73.2 — `navigate as any` typed (2 files, 7 sites)
**Status:** [x] Complete

### Sub-phase 73.3 — Verification
**Status:** [x] Complete (tsc clean, 19/19 + 1 todo)

---

## Phase 74 — V16 release: tag v1.5.0

**Status:** [~] In progress (release.yml ✅; promote.yml ⏳)
**Owner:** Mobile team
**Target:** 2026-09-07
**Actual:**
- Module commit `5558bf0`: `package.json` bumped to `1.5.0`; CHANGELOG.md has the V16.0.0 entry (Added / Changed / Removed / Migration / Verification / Out-of-scope).
- Tag `v1.5.0` pushed to origin at commit `5558bf0`.
- release.yml (run #28, https://github.com/pavalep/react-native-media-player/actions/runs/34100633925): all 11 steps passed. `npm publish --tag=staging` succeeded for 1.5.0.
- npm dist-tags: `{ "staging": "1.5.0", "latest": "1.4.0" }`. 1.5.0 is on npm; `latest` is still stale.
- ⏳ **Next step (user)**: trigger `promote.yml` at https://github.com/pavalep/react-native-media-player/actions/workflows/promote.yml with `version: 1.5.0` + approve the `production` environment. This flips `latest=1.5.0` and publishes the GitHub Release draft.

### Sub-phase 74.1 — Bump version + CHANGELOG
**Status:** [x] Complete

### Sub-phase 74.2 — Tag + release.yml
**Status:** [x] Complete

### Sub-phase 74.3 — Promote.yml
**Status:** [ ] Pending (user-driven)

### Sub-phase 74.4 — Verify dist-tags + GH release
**Status:** [ ] Pending

---

## Phase 75 — Consumer: switch to npm `^1.5.0`

**Status:** [ ] Pending
**Owner:** Mobile team
**Target:** 2026-09-07
**Planned:**
- `package.json` — bump dep from `file:../react-native-media-player` (V16 dev cycle) to `^1.5.0`.
- `npm install` (with project `.npmrc` `legacy-peer-deps=true`).
- `npx tsc --noEmit` + `npm test` green.
- Commit + push.

### Sub-phase 75.1 — Bump + install
**Status:** [ ] Pending

### Sub-phase 75.2 — Verification + commit
**Status:** [ ] Pending

---

## Decisions log

- **2026-09-07**: Phase 72 default = A.1 (rename) + B.1 (drop dead surface). Confirmed by "no half-baked public API" charter.
- **2026-09-07**: Phase 73 scope = media-player-touching files only. Non-player `as any` / silent catches deferred to V17.
- **2026-09-07**: Version bump = `1.5.0` (minor, not `2.0.0`). Reasoning: the type-bridge change is backward-compatible at the `string` default. The `<SimbaPlayer>` v2 `lookup`-prop removal is breaking, but we're the only consumer.
- **2026-09-07**: Phase 69 added a missing 69.5 — typed read hooks (`useQueueItemsAs<T>` / `usePlaybackHistoryAs<T>`). The generic variance rules required these to make the read side type-safe at the boundary; the cast now lives in ONE place (the module) instead of being scattered across every consumer read site.

## Closeout

- **Final QA report**: [`SIMBA_PLAYER_MODULE_V16_FINAL_QA_REPORT.md`](./SIMBA_PLAYER_MODULE_V16_FINAL_QA_REPORT.md)
- **Public-surface delta**: see the report's "Public-surface delta" section.
- **Real bugs found and fixed** (under `as any` covers): see the report's "Real bugs found and fixed" section.
- **Out-of-scope (V17+ candidates)**: see the report's "Out-of-scope" section.
