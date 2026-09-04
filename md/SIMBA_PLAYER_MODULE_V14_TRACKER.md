# SIMBA Player Module — V14 Tracker

**Document Version:** 1.4
**Date Created:** 2026-09-04
**Last Updated:** 2026-09-04
**Linked spec:** [`SIMBA_PLAYER_MODULE_V14_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V14_SPECIFICATION.md)

> This tracker is the working companion to the V14 spec. Each phase has a status, an owner, a target date, and a one-paragraph narrative describing actual work vs planned.

---

## Phase 59 — `<SimbaPlayerRoot>` activity-branch wrapper

**Status:** [x] Complete
**Owner:** Mobile team
**Target:** TBD
**Actual:** Shipped 2026-09-04. Module repo commit `d359352` adds `src/hooks/SimbaPlayerRoot.tsx` (a thin switch that calls `useLaunchParams()` internally and renders `<PlayerRoot />` or its children). Module `index.ts` re-exports `SimbaPlayerRoot` + `SimbaPlayerRootProps`. Consumer commit `75b21de` deletes the 12-line `if (launchParams)` branch from `App.tsx` and wraps the navigator children in `<SimbaPlayerRoot>`. The `ErrorBoundary` was hoisted to wrap `<SimbaPlayerRoot>` so both branches share it. Module typecheck clean, 100/100 tests pass. Consumer typecheck clean, 19/19 + 1 todo.

### Sub-phase 59.1 — Define `<SimbaPlayerRoot>`
**Status:** [x] Complete

### Sub-phase 59.2 — Re-export from index
**Status:** [x] Complete

### Sub-phase 59.3 — Consumer migration
**Status:** [x] Complete

---

## Phase 60 — `useOpenFromUrl` / `openFromUrl` deep-link helper

**Status:** [x] Complete
**Owner:** Mobile team
**Target:** TBD
**Actual:** Shipped 2026-09-04. Module repo commit `c4f4779` adds `src/hooks/useOpenFromUrl.tsx` (a hook returning a stable callback that filters `content://` + `file://` URIs, derives a display title from the basename, classifies as audio/video by extension, and forwards to `useOpenWithResume().openPlayer({uri, title, type, resumeId: uri})`). Consumer commit `e080e3a` deletes the 16-line `handleIncomingUri` function, the `OpenWithResume` type alias, the `getMediaType` + `useOpenWithResume` + `useCallback` imports, and shrinks the deep-link useEffect to a 6-line `Linking` listener. The hook passes `resumeId: uri` so the consumer's bookmark lookup runs (typically returns 0 for shared content URIs, but resumes if the user previously bookmarked the same URI). Module typecheck clean, 100/100 tests pass. Consumer typecheck clean, 19/19 + 1 todo.

### Sub-phase 60.1 — Define `useOpenFromUrl`
**Status:** [x] Complete

### Sub-phase 60.2 — Re-export from index
**Status:** [x] Complete

### Sub-phase 60.3 — Consumer migration
**Status:** [x] Complete

---

## Phase 61 — `<SimbaPlayer>` with built-in default lookup helpers

**Status:** [x] Complete
**Owner:** Mobile team
**Target:** TBD
**Actual:** Shipped 2026-09-04. Module commit `4d8f73c` adds the `getResumePosition` function prop to `<SimbaPlayer>` (backward-compatible with the `lookup` object prop; if both are passed, `getResumePosition` wins), and ships a new `useSimbaPlayerLookup(selector?)` helper hook that wraps a selector in a memoized `PlayerResumeLookup` (no-op when no selector is passed). The internal `useMemo` on the effective lookup keeps the `PlayerResumeContext` value stable across renders. Consumer commit `73d6e21` deletes the 17-line `useMemo<PlayerResumeLookup>(...)` in `App.tsx` and replaces it with a `useSimbaPlayerLookup(selector)` call. Module typecheck clean, 100/100 tests pass. Consumer typecheck clean, 19/19 + 1 todo.

### Sub-phase 61.1 — Refine `<SimbaPlayer>` API (function reference prop)
**Status:** [x] Complete

### Sub-phase 61.2 — `useSimbaPlayerLookup()` helper
**Status:** [x] Complete

### Sub-phase 61.3 — Re-export
**Status:** [x] Complete

### Sub-phase 61.4 — Consumer migration
**Status:** [x] Complete

---

## Phase 62 — Deprecate the consumer's `playerSlice` V11-mirror

**Status:** [x] Complete
**Owner:** Mobile team
**Target:** TBD
**Actual:** Shipped 2026-09-04. Consumer commit `9415600` migrates the V11-mirrored state to the module's `usePlayer()`. **Scope revised down from the spec's 17-file estimate to 5 files** (the only V11-mirror field actually read by consumer code was `playbackState`; `isFullscreen` was unused; `volume`/`playbackSpeed`/`loopMode`/`currentPosition`/`duration` had no external readers). Files migrated: `useArtistScreen.ts` (also drops `playFile` dispatch), `useAlbumScreen.ts`, `useQueueScreen.ts`, `useLibraryScreen.ts`, `ArtistDetailScreen.tsx`. `usePlayer.ts` (consumer-side hook that mirrored V11 fields) was dead code; moved to `v13-trash-2026-09-04/`. `playerSlice.ts` loses 7 state fields (`playbackState`, `currentPosition`, `duration`, `volume`, `isFullscreen`, `loopMode`, `playbackSpeed`), 8 V11-only reducers (`playFile`, `setPlaybackState`, `setPosition`, `setDuration`, `setVolume`, `toggleFullscreen`, `setLoopMode`, `setPlaybackSpeed`), and the V11 writes from 7 mixed reducers. The 7 mixed reducers now use `state.shuffle` (consumer-owned) for the wrap-around behavior that previously read `state.loopMode === 'playlist'`. `tsc --noEmit` clean, `npm test` 19/19 + 1 todo.

### Sub-phase 62.1 — Audit the 17 dependent files
**Status:** [x] Complete

### Sub-phase 62.2 — Identify which fields are mirrored
**Status:** [x] Complete

### Sub-phase 62.3 — Re-migrate each file
**Status:** [x] Complete

### Sub-phase 62.4 — Trim the `playerSlice`
**Status:** [x] Complete

### Sub-phase 62.5 — Verify
**Status:** [x] Complete

---

## Phase 63 — Release v1.3.0

**Status:** [ ] Pending
**Owner:** Mobile team
**Target:** TBD
**Actual:** _not yet started_

### Sub-phase 63.1 — Bump version
**Status:** [ ] Pending

### Sub-phase 63.2 — Tag + push
**Status:** [ ] Pending

### Sub-phase 63.3 — Final QA
**Status:** [ ] Pending

---

## Summary

| Phase | Description | Status | Effort | Deliverable |
|---|---|---|---|---|
| 59 | `<SimbaPlayerRoot>` activity-branch wrapper | [x] | 0.5 day | `useLaunchParams` + `<PlayerRoot>` rendering absorbed into a single component |
| 60 | `useOpenFromUrl` deep-link helper | [x] | 0.25 day | URI → title + type → openPlayer, all in one hook |
| 61 | `<SimbaPlayer>` with `getResumePosition` function prop | [x] | 0.5 day | 20-line resume-lookup function in App.tsx → 1-line function reference |
| 62 | Deprecate V11 playerSlice mirror | [x] | 1 day | 17 files use `usePlayer()` from the module; playerSlice shrinks from 16KB → ~6KB |
| 63 | Release v1.3.0 | [ ] | 0.25 day | Module published as v1.3.0 via CI/CD; final QA report |

**Total estimated V14 effort:** ~2.5 working days.

---

## Risks + open questions

| Risk | Mitigation |
|---|---|
| `<SimbaPlayer>` accepting both `lookup` (object) and `getResumePosition` (function) props could confuse consumers | Document the function prop as the recommended path; deprecate the object prop in V15 |
| `useOpenFromUrl` assumes `content://` and `file://` URIs only — the consumer's deep-link handler may handle other URI schemes | Add a `schemeFilter` prop to `useOpenFromUrl` for consumer-specific filtering |
| The 17 files that import from `playerSlice` may have subtle dependencies on the V11-mirrored state that aren't obvious from the type signature | Per-file audit + manual smoke test |
| V11 rollback path (notificationService.ts) still exists | Keep until user confirms V11 rollback is no longer needed; delete in V15 |

---

## Dependencies

- **V13 work** (Phases 50-58) must be released as v1.2.0 (in progress, awaiting user promote step). The V14 work builds on top of the v1.2.0 surface.
- **Module repo:** `X:\Development\SIMBA\react-native-media-player\`
- **Consumer repo:** `X:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\`
- **CI/CD pipeline:** GitHub Actions `release.yml` (OIDC publish) + `promote.yml` (NPM_TOKEN dist-tag)
- **Local release runbook:** `X:\Development\SIMBA\secrets\RELEASE_FLOW.md`

---

# End of V14 tracker doc.
