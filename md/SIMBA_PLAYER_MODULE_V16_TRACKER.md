# SIMBA Player Module — V16 Tracker

**Document Version:** 1.0
**Date Created:** 2026-09-07
**Last Updated:** 2026-09-07
**Linked spec:** [`SIMBA_PLAYER_MODULE_V16_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V16_SPECIFICATION.md)

> This tracker is the working companion to the V16 spec. Each phase has a status, an owner, a target date, and a one-paragraph narrative describing actual work vs planned.

---

## Phase 69 — Module: `PlayerQueueItem` generic + remove module `as unknown as`

**Status:** [ ] In progress
**Owner:** Mobile team
**Target:** 2026-09-07
**Planned:**
- `src/stores/playerQueueStore.ts` — make `PlayerQueueItem` generic over 3 classification fields (TSource/TKind/TLane), default to `string`.
- `src/hooks/useQueue.tsx:39` — replace `as unknown as T` with a generic selector pattern.
- `src/hooks/useQueueSelection.tsx:24` — same fix.
- Module `npm run typecheck` clean; 100/100 + 1 todo tests pass.

### Sub-phase 69.1 — `PlayerQueueItem` generic
**Status:** [ ] Pending

### Sub-phase 69.2 — Remove `useQueue.tsx:39` cast
**Status:** [ ] Pending

### Sub-phase 69.3 — Remove `useQueueSelection.tsx:24` cast
**Status:** [ ] Pending

### Sub-phase 69.4 — Module verification
**Status:** [ ] Pending

---

## Phase 70 — Consumer: type-bridge adoption + `resolveStreamType` sweep

**Status:** [ ] Pending
**Owner:** Mobile team
**Target:** 2026-09-07
**Planned:**
- `src/store/slices/playerSlice.ts:10` — `PlaylistEntry extends PlayerQueueItem<MediaSource, MediaKind, MediaLane> & { origin? }`. Add `resumePosition?` and `autoplay?` to `PlayerQueueItem` in the module (Phase 69 carries this).
- `src/screens/QueueScreen/hooks/useQueueScreen.ts:110, 120, 131` — remove the 3 `as unknown as PlaylistEntry` casts.
- `resolveStreamType` triple-nest collapse — 20 files, 35 sites, via Node.js script + manual review.
- Consumer `npx tsc --noEmit` clean; 19/19 + 1 todo tests pass.

### Sub-phase 70.1 — `playerSlice.ts` PlaylistEntry specialization
**Status:** [ ] Pending

### Sub-phase 70.2 — `useQueueScreen.ts` cast removal
**Status:** [ ] Pending

### Sub-phase 70.3 — `resolveStreamType` sweep (script)
**Status:** [ ] Pending

### Sub-phase 70.4 — `resolveStreamType` sweep (manual review)
**Status:** [ ] Pending

### Sub-phase 70.5 — Consumer verification
**Status:** [ ] Pending

---

## Phase 71 — `<SimbaPlayer>` v2: fold 4 paths into 1 `resumePolicy`

**Status:** [ ] Pending
**Owner:** Mobile team
**Target:** 2026-09-07
**Planned:**
- Module: drop `lookup?: PlayerResumeLookup` from `SimbaPlayerProps`. Add `resumePolicy?: (resumeId: string) => number | undefined`. Delete `useSimbaPlayerLookup.tsx`. Mark `PlayerResumeProvider` `@deprecated`.
- Consumer: `App.tsx:199-229` — replace `useSimbaPlayerLookup(...)` + `<SimbaPlayer lookup={...}>` with a single `<SimbaPlayer resumePolicy={...}>`.
- Module + consumer typecheck + tests green.

### Sub-phase 71.1 — Module `SimbaPlayer.tsx` refactor
**Status:** [ ] Pending

### Sub-phase 71.2 — Delete `useSimbaPlayerLookup.tsx`
**Status:** [ ] Pending

### Sub-phase 71.3 — Module `index.ts` surface update
**Status:** [ ] Pending

### Sub-phase 71.4 — Consumer `App.tsx` migration
**Status:** [ ] Pending

### Sub-phase 71.5 — Verification
**Status:** [ ] Pending

---

## Phase 72 — `playFromQueue` no-op fix + dead-feature decision

**Status:** [ ] Pending
**Owner:** Mobile team
**Target:** 2026-09-07
**Planned:**
- Sub-decision A.1 (rename): `playFromQueue` → `removeFromQueueByIndex`. JSDoc clarifies the rename.
- Sub-decision B.1 (drop dead): delete 4 zustand stores + 9 hooks (sleep timer, equalizer, liked, shuffle). `~4100` bytes of dead module code removed.
- Consumer `useQueueScreen.ts` updated to call renamed action.
- Module + consumer typecheck + tests green.

### Sub-phase 72.1 — Rename `playFromQueue` → `removeFromQueueByIndex`
**Status:** [ ] Pending

### Sub-phase 72.2 — Delete 4 dead zustand stores
**Status:** [ ] Pending

### Sub-phase 72.3 — Delete 9 dead hooks
**Status:** [ ] Pending

### Sub-phase 72.4 — Module `index.ts` surface update
**Status:** [ ] Pending

### Sub-phase 72.5 — Consumer migration
**Status:** [ ] Pending

### Sub-phase 72.6 — Verification
**Status:** [ ] Pending

---

## Phase 73 — Type-safety sweep (media-player only)

**Status:** [ ] Pending
**Owner:** Mobile team
**Target:** 2026-09-07
**Planned:**
- 12 silent `catch {}` → `logger.warn(...)` in 6 files (`audioSettingsService.ts`, `artCacheService.ts`, `cacheService.ts`, `fileService.ts`, `useHomeScreen.ts`, `useQueueScreen.ts`).
- 7 `navigate as any` → typed `NavigationProp<RootStackParamList>` in 2 files (`useLibraryScreen.ts`, `useArtistScreen.ts`).
- Consumer `npx tsc --noEmit` + `npm test` green.

### Sub-phase 73.1 — Silent catches (6 files, 12 sites)
**Status:** [ ] Pending

### Sub-phase 73.2 — `navigate as any` typed (2 files, 7 sites)
**Status:** [ ] Pending

### Sub-phase 73.3 — Verification
**Status:** [ ] Pending

---

## Phase 74 — V16 release: tag v1.5.0

**Status:** [ ] Pending
**Owner:** Mobile team
**Target:** 2026-09-07
**Planned:**
- Bump `package.json` to `1.5.0`. Update `CHANGELOG.md` V16.0.0 entry.
- Tag `v1.5.0`, push → triggers `release.yml`.
- After `release.yml` completes, run `npm dist-tag add @simba-dev/react-native-media-player@1.5.0 staging --otp=<code>` locally (or use the `NPM_TOKEN` bypass path).
- Trigger `promote.yml` workflow → `latest=1.5.0`.
- Verify: `npm view dist-tags` → `{ latest: '1.5.0', staging: '1.5.0' }`.

### Sub-phase 74.1 — Bump version + CHANGELOG
**Status:** [ ] Pending

### Sub-phase 74.2 — Tag + release.yml
**Status:** [ ] Pending

### Sub-phase 74.3 — Promote.yml
**Status:** [ ] Pending

### Sub-phase 74.4 — Verify dist-tags + GH release
**Status:** [ ] Pending

---

## Phase 75 — Consumer: switch to npm `^1.5.0`

**Status:** [ ] Pending
**Owner:** Mobile team
**Target:** 2026-09-07
**Planned:**
- `package.json` — bump dep from `^1.4.0` to `^1.5.0`.
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
