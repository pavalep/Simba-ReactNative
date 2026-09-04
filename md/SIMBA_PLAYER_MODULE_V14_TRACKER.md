# SIMBA Player Module — V14 Tracker

**Document Version:** 1.1
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

**Status:** [ ] Pending
**Owner:** Mobile team
**Target:** TBD
**Actual:** _not yet started_

### Sub-phase 60.1 — Define `useOpenFromUrl`
**Status:** [ ] Pending

### Sub-phase 60.2 — Re-export from index
**Status:** [ ] Pending

### Sub-phase 60.3 — Consumer migration
**Status:** [ ] Pending

---

## Phase 61 — `<SimbaPlayer>` with built-in default lookup helpers

**Status:** [ ] Pending
**Owner:** Mobile team
**Target:** TBD
**Actual:** _not yet started_

### Sub-phase 61.1 — Refine `<SimbaPlayer>` API (function reference prop)
**Status:** [ ] Pending

### Sub-phase 61.2 — `useSimbaPlayerLookup()` helper
**Status:** [ ] Pending

### Sub-phase 61.3 — Re-export
**Status:** [ ] Pending

### Sub-phase 61.4 — Consumer migration
**Status:** [ ] Pending

---

## Phase 62 — Deprecate the consumer's `playerSlice` V11-mirror

**Status:** [ ] Pending
**Owner:** Mobile team
**Target:** TBD
**Actual:** _not yet started_

### Sub-phase 62.1 — Audit the 17 dependent files
**Status:** [ ] Pending

### Sub-phase 62.2 — Identify which fields are mirrored
**Status:** [ ] Pending

### Sub-phase 62.3 — Re-migrate each file
**Status:** [ ] Pending

### Sub-phase 62.4 — Trim the `playerSlice`
**Status:** [ ] Pending

### Sub-phase 62.5 — Verify
**Status:** [ ] Pending

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
| 60 | `useOpenFromUrl` deep-link helper | [ ] | 0.25 day | URI → title + type → openPlayer, all in one hook |
| 61 | `<SimbaPlayer>` with `getResumePosition` function prop | [ ] | 0.5 day | 20-line resume-lookup function in App.tsx → 1-line function reference |
| 62 | Deprecate V11 playerSlice mirror | [ ] | 1 day | 17 files use `usePlayer()` from the module; playerSlice shrinks from 16KB → ~6KB |
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
