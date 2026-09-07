# Simba Player Module - V16 Specification

**Document Version:** 1.0
**Date Created:** 2026-09-07
**Last Updated:** 2026-09-07
**Target Release:** V16.0.0 (shipped in 1.5.0)
**Package Name:** `@simba-dev/react-native-media-player`
**Folder Name:** `react-native-media-player/`
**NPM Org:** `@simba-dev`
**Status:** Wave 12 kickoff — **Phases 69-75 (7 phases, ~2 working days)**
**Owners:** Mobile team
**Replaces:** nothing — V16 is a forward-looking **API hardening + type-safety sweep** on top of the V15 state consolidation
**Linked spec:** [`SIMBA_PLAYER_MODULE_V15_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V15_SPECIFICATION.md) (V15 = state consolidation; V16 = public-API de-baking)
**Linked tracker:** [`SIMBA_PLAYER_MODULE_V16_TRACKER.md`](./SIMBA_PLAYER_MODULE_V16_TRACKER.md)

---

## 0. Purpose

V15 (Phases 64-68) shipped the **state consolidation layer**: 6 zustand stores in the module, 13 reducers deleted from the consumer's `playerSlice`, and the per-screen `useOpenPlaylist()` migration. Codebase is now in a "feature-complete" state.

V15 left three categories of residue that look "half-baked" to a reviewer:

1. **Type leaks at the queue boundary** — the module's `PlayerQueueItem` exposes `source?: string`, `type?: string`, `mediaType?: string` (wide types for "consumer flexibility"). The consumer is forced to `as unknown as PlaylistEntry` at three call sites to recover the narrow literal unions (`'local' | 'api'`, `MediaKind`, `'audio' | 'video'`). Same wide types in `playbackHistory`.

2. **4 wiring paths for one concept** — `<SimbaPlayer>` accepts `lookup?: PlayerResumeLookup` (legacy object), `getResumePosition?: GetResumePosition` (function), and a no-op default. The consumer uses `useSimbaPlayerLookup(selector)` to bridge the two. There's also a publicly-exported `<PlayerResumeProvider>` for manual wraps. Five APIs for the same internal context.

3. **Production noise** — 23 sites of `resolveStreamType(resolveStreamType(resolveStreamType(X)))` (the function is idempotent, so the outer two are dead code). 11 silent `catch {}` blocks in media-player-adjacent services. 8 `navigate as any` casts in screens that touch the player.

V16's charter is: **make the public API type-safe, fold the wiring paths, and clean the production noise in media-player-touching code only.** Out of scope: non-player catch blocks, non-player `as any` sites, and the wider type-safety sweep (those are deferred to V17).

---

## 1. Scope

### In scope (this V16)

- **Type-bridge `PlayerQueueItem`** — make the 3 classification fields generic, default to `string` for backward compat, document the consumer's specialization pattern. Remove 3 `as unknown as PlaylistEntry` sites in `useQueueScreen.ts`.
- **`<SimbaPlayer>` v2** — single `resumePolicy?: (resumeId: string) => number | undefined` prop. Drop the `lookup` object prop. Drop the `useSimbaPlayerLookup` factory hook. Mark `<PlayerResumeProvider>` as `@deprecated` for the rare advanced case.
- **`playFromQueue` no-op fix** — the store action splices the item from the queue but does not promote it to the active playlist. Either rename to `removeFromQueueByIndex` (make the no-op honest) or wire it to call `useOpenPlaylist()` internally (make the name honest).
- **Dead-feature decision** — `useSleepTimer` / `useEqualizer` / `useIsLiked` / `useShuffle` exported but no consumer UI wires them. Either drop the public surface or wire the consumer UI. **Default: drop the surface (no half-baked public API).** Decision is final at end of Phase 72.
- **`resolveStreamType` sweep** — collapse the 23 triple-nests and 6 double-nests to single calls (35 sites across 20 files). The function is idempotent; the outer wrappers are dead code.
- **Type-safety sweep (media-player only)** — replace 12 silent `catch {}` blocks in `audioSettingsService.ts`, `artCacheService.ts`, `cacheService.ts`, `fileService.ts`, `useHomeScreen.ts`, `useQueueScreen.ts` with `logger.warn(...)`. Replace 6 `navigate as any` sites in `useLibraryScreen.ts` + 1 in `useArtistScreen.ts` with `NavigationProp<RootStackParamList>`-typed calls.
- **V16 release** — bump to `1.5.0`, tag, push, run `release.yml`, run `promote.yml`.

### Out of scope (deferred)

- Non-player `as any` sites (`Dialog.tsx`, `SkeletonLoader.tsx`, `authService.ts`, `AboutScreen.tsx`, `SearchScreen.tsx`, `navigationHelper.ts`).
- Non-player silent catches (`useHomeScreen.ts:150` and `useQueueScreen.ts:152` ARE in scope; the 5 in `useBookmarksScreen` are not unless they touch the player).
- The wider type-safety sweep (V17 candidate — V16.0 only touches the 1 module + ~25 media-player-touching consumer files).
- New features (equalizer UI, sleep timer UI, like button, shuffle button). If the dead surface is kept, those are V17+ work.
- V15 spec items that haven't shipped (e.g., on-device smoke test for the V15 wrap-semantics change).

---

## 2. Phases

### Phase 69 — Module: `PlayerQueueItem` generic + remove module `as unknown as`
**Module only.**

Changes:
- `src/stores/playerQueueStore.ts` — `PlayerQueueItem` becomes `PlayerQueueItem<TSource extends string = string, TKind extends string = string, TLane extends string = string>`. All other interfaces (`PlayerQueueStore`, `PlayerQueueActions`) stay on the default `string` types.
- `src/hooks/useQueue.tsx:39` — replace `as unknown as T` with a generic selector pattern: `useStore(usePlayerQueueStore, useShallow(selector))` where `selector` is properly typed. The bare-store fallback (no selector) returns the full state.
- `src/hooks/useQueueSelection.tsx:24` — same fix.

Acceptance:
- Module `npm run typecheck` clean.
- Module `npm test` 100/100 + 1 todo.
- Zero `as unknown as` casts in non-test module source.
- Backward-compat: `PlayerQueueItem` (no generics) still resolves to `PlayerQueueItem<string, string, string>`.

### Phase 70 — Consumer: type-bridge adoption + `resolveStreamType` sweep
**Consumer only.**

Changes (4 sub-batches):
- `src/store/slices/playerSlice.ts:10` — `PlaylistEntry` now `extends PlayerQueueItem<MediaSource, MediaKind, MediaLane> & { origin?: PlaybackOrigin }`. Adds the 2 missing fields (`resumePosition?`, `autoplay?`) to `PlayerQueueItem` so the consumer's `PlaybackEntry` is a structural subset (no extra fields needed in module).
- `src/screens/QueueScreen/hooks/useQueueScreen.ts:110, 120, 131` — remove the 3 `as unknown as PlaylistEntry` casts. Items are now structurally `PlaylistEntry`.
- `resolveStreamType` triple-nest collapse — 20 files, 35 sites. Replace `resolveStreamType(resolveStreamType(resolveStreamType(X)))` with `resolveStreamType(X)`, and `resolveStreamType(resolveStreamType(X))` with `resolveStreamType(X)`. Use a Node.js script to do the mechanical replacement safely, then manual review for the few files that have the output in a typed context.
- `src/types/playback.ts` — no change (already uses `MediaSource`/`MediaKind`/`MediaLane` via `MediaClassification`).

Acceptance:
- Consumer `npx tsc --noEmit` clean.
- Consumer `npm test` 19/19 + 1 todo across 5 suites.
- Zero `as unknown as PlaylistEntry` in `useQueueScreen.ts`.
- Zero `resolveStreamType(resolveStreamType(...))` in any consumer file (collapsed to single calls).

### Phase 71 — `<SimbaPlayer>` v2: fold 4 paths into 1 `resumePolicy`
**Module + consumer App.tsx.**

Module changes:
- `src/hooks/SimbaPlayer.tsx` — drop `lookup?: PlayerResumeLookup` from `SimbaPlayerProps`. Add `resumePolicy?: (resumeId: string) => number | undefined`. Internally the same `useMemo<PlayerResumeLookup>` pattern. Document the deprecation in the JSDoc.
- `src/hooks/useSimbaPlayerLookup.tsx` — drop the entire file (no longer needed). The new `<SimbaPlayer>` accepts a function directly.
- `src/index.ts` — drop `useSimbaPlayerLookup` and `GetResumePosition` from the public surface. Keep `PlayerResumeProvider` + `PlayerResumeLookup` + `PlayerResumeProviderProps` exported but mark `@deprecated` (for the rare consumer that needs a manual wrap).
- `src/hooks/useOpenWithResume.tsx` — no change (still uses `PlayerResumeContext` internally).

Consumer changes:
- `App.tsx:199-229` — replace the `useSimbaPlayerLookup(...)` + `<SimbaPlayer lookup={...}>` pair with a single `<SimbaPlayer resumePolicy={...}>`. The selector body is unchanged.

Acceptance:
- Module `npm run typecheck` + `npm test` green.
- Consumer `npx tsc --noEmit` + `npm test` green.
- Zero references to `useSimbaPlayerLookup` or `lookup=` in the consumer.
- Public surface: 4 paths → 1 prop + 1 deprecated manual wrap (with clear migration note).

### Phase 72 — `playFromQueue` no-op fix + dead-feature decision
**Module only.**

Sub-decision A (playFromQueue):
- The current impl is a no-op splice. The action name implies "play this item" but the behavior is "remove from queue". Two options:
  - **A.1 (rename)**: rename to `removeFromQueueByIndex`. JSDoc clarifies: "Use `useOpenPlaylist()` to promote a queue item to the active playlist. This action only removes from the queue."
  - **A.2 (wire)**: change the impl to call `useOpenPlaylist()` (requires the activity bridge to be available; the zustand store doesn't have access to it). Likely requires a new module hook that wraps the bridge call.
  - **Default: A.1 (rename)**. Reason: the store has no clean way to invoke the activity bridge without a circular dep. Renaming is honest about what the action does.
- Update the consumer's `useQueueScreen.ts:108, 165-172` to call the renamed action.
- Update `src/hooks/usePlayerFeatureHooks.tsx` if `playFromQueue` was re-exported there.

Sub-decision B (dead features):
- 4 zustand stores + 9 hooks (sleep timer × 3, equalizer × 2, liked × 2, shuffle × 2) are exported but no consumer UI wires them.
- Two options:
  - **B.1 (drop)**: delete `playerSleepTimerStore`, `playerEqualizerStore`, `playerLikedStore`, `playerShuffleStore` + their hooks from the public surface. Removes 4 stores + 9 hooks from `index.ts`. Removes ~4100 bytes of dead module code.
  - **B.2 (keep + deprecate)**: keep the surface, add `@deprecated` JSDoc, document the future-UI roadmap in `md/`.
  - **Default: B.1 (drop)**. Reason: "no half-baked public API" is the V16 charter. A future re-introduction is a 1-day feature (copy the store from git history, wire a UI).
- Delete the dead files; remove from `index.ts`; remove from module tests.

Acceptance:
- Module `npm run typecheck` + `npm test` green.
- If B.1: 4 stores + 9 hooks gone, no breakage in consumer (consumer never imported them).
- If A.1: `playFromQueue` action renamed everywhere; consumer still typechecks.

### Phase 73 — Type-safety sweep (media-player only)
**Consumer only.**

Changes:
- `src/services/audioSettingsService.ts:87, 90, 93, 96, 99, 103` — 6 silent catches → `logger.warn(...)` with the error and key. No `as any` introduced.
- `src/services/artCacheService.ts:100, 102` — same.
- `src/services/cacheService.ts:54` — same.
- `src/services/fileService.ts:262` — same.
- `src/hooks/useHomeScreen.ts:150` — same.
- `src/hooks/useQueueScreen.ts:152` — same.
- `src/screens/Library/hooks/useLibraryScreen.ts:152, 157, 164, 170, 175, 182` — 6 `navigate as any` → typed `NavigationProp<RootStackParamList>`. Either inline the prop type or use `useNavigation<NativeStackNavigationProp<RootStackParamList>>()`.
- `src/screens/Artist/hooks/useArtistScreen.ts:129` — same.

Out of scope (deferred to V17):
- `Dialog.tsx`, `SkeletonLoader.tsx`, `authService.ts`, `AboutScreen.tsx`, `SearchScreen.tsx`, `navigationHelper.ts` (non-media-player).

Acceptance:
- Consumer `npx tsc --noEmit` clean.
- Consumer `npm test` 19/19 + 1 todo.
- Zero silent `catch {}` in media-player-touching files.
- Zero `navigate as any` in media-player-touching files.

### Phase 74 — V16 release: tag v1.5.0
**Both repos.**

- Module: bump `package.json` to `1.5.0`, update `CHANGELOG.md` with the V16.0.0 entry, commit, push.
- Tag `v1.5.0`, push → triggers `release.yml` (OIDC trusted publish).
- Wait for `release.yml` to complete (all checks pass; `npm publish --tag=staging` publishes 1.5.0 to npm).
- Set `staging=1.5.0` via local OTP command (the consumer ran into the `npmrc` E401 issue in V15; this V16 release flow expects the same recovery).
- Trigger `promote.yml` workflow at https://github.com/pavalep/react-native-media-player/actions/workflows/promote.yml with `version: 1.5.0`.
- Approve the `production` environment.

Acceptance:
- `npm view @simba-dev/react-native-media-player dist-tags` → `{ latest: '1.5.0', staging: '1.5.0' }`.
- GitHub Release v1.5.0 published at https://github.com/pavalep/react-native-media-player/releases/tag/v1.5.0.

### Phase 75 — Consumer: switch to npm `^1.5.0`
**Consumer only.**

- `package.json` — bump dep from `^1.4.0` to `^1.5.0`.
- `npm install` (using the project `.npmrc` with `legacy-peer-deps=true`).
- `npx tsc --noEmit` + `npm test` green.
- Commit + push.

Acceptance:
- Consumer pulls `1.5.0` from npm (no more `file:../react-native-media-player`).
- `node_modules/@simba-dev/react-native-media-player/package.json#version` = `1.5.0`.

---

## 3. Files touched (summary)

### Module (`react-native-media-player/`)

| Phase | Files |
|---|---|
| 69 | `src/stores/playerQueueStore.ts`, `src/hooks/useQueue.tsx`, `src/hooks/useQueueSelection.tsx` |
| 71 | `src/hooks/SimbaPlayer.tsx`, `src/hooks/useSimbaPlayerLookup.tsx` (deleted), `src/index.ts` |
| 72 | `src/stores/playerQueueStore.ts`, `src/hooks/usePlayerFeatureHooks.tsx` (slimmed), `src/index.ts`, plus 4 dead store files (deleted) |
| 74 | `package.json`, `CHANGELOG.md` |

### Consumer (`MOBILE_APP_REACT_NATIVE/`)

| Phase | Files |
|---|---|
| 70 | `src/store/slices/playerSlice.ts`, `src/screens/QueueScreen/hooks/useQueueScreen.ts`, plus 20 files for `resolveStreamType` sweep |
| 71 | `App.tsx` |
| 72 | `src/screens/QueueScreen/hooks/useQueueScreen.ts` (if A.1) |
| 73 | 7 service/hook files (catches) + 2 screen files (navigate types) |
| 75 | `package.json`, `package-lock.json` |

---

## 4. Risks

- **Phase 69 (type-bridge)** — the generic adds 3 type parameters. If any external consumer (third-party) imported `PlayerQueueItem` and assigned to a non-string union, the change is a compile error for them. Mitigation: defaults preserve current behavior. Document in CHANGELOG.
- **Phase 70 (`resolveStreamType` sweep)** — the script is mechanical but a typo in the regex would break 20 files at once. Mitigation: dry-run on a single file first, manual review for 2-3 files, then sweep the rest.
- **Phase 71 (`<SimbaPlayer>` v2)** — dropping `lookup` is a breaking API change. Mitigation: we're the only consumer; CHANGELOG documents the migration. Add `@deprecated` to `useSimbaPlayerLookup` for one release before full removal (we're doing removal in this same phase — acceptable).
- **Phase 72 (playFromQueue + dead features)** — if B.1 (drop dead features), any third-party consumer of the deleted hooks breaks. Mitigation: CHANGELOG documents; we're the only consumer.
- **Phase 73 (silent catches)** — replacing silent catches with `logger.warn(...)` could surface bugs that were previously hidden. The `audioSettingsService.ts` 6-catch block is particularly suspect (one catch per settings key; if all 6 fail silently, the user thinks their settings saved but they didn't). Mitigation: each `logger.warn` includes the key + error; the runtime behavior doesn't change (the failure was already happening silently).

---

## 5. Out-of-scope (deferred)

Documented as V17+ candidates:
- Non-player `as any` sites (8 in non-player code).
- V15 on-device smoke test (Phase 58.6 — still pending).
- V16 on-device smoke test (need to verify `SimbaPlayer` v2 + type-bridge work on a real device, especially the resume lookup).
- DRM / Casting / iOS support (deferred since V13).
- Equalizer / Sleep timer / Like / Shuffle UI (if B.1, dropped for now).
