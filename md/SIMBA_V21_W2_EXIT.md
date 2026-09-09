# SIMBA V21 — W2 Exit Review (Architecture foundations)

> Date: 2026-09-10
> Reviewer: Paval EP (project owner) via the greenlit "ok continue" pattern.
> Scope: W2 = P05 (folder contract + linter) + P06 (4 placeholder services) + P07 (10 API adapters) + P08 (library pilot).

## Outcome: W2 EXITED with 2 re-scopings

| # | Phase | Defect(s) closed | Commit(s) | Status |
|---|-------|------------------|-----------|--------|
| P05 | Folder contract + import-boundary linter | — (sets up future D-022 / D-010 work) | `a23330b` | ✓ done |
| P06 | Replace 4 placeholder services | D-005, D-006, D-007, D-008 (all P0) | `d0abeb4` + `3d7ca68` | ✓ done |
| P07 | Move 10 API adapters to `src/infrastructure/api/<provider>/` | D-022 (P1) | `446c6d5` + `970ef8b` | ✓ done |
| P08 | Pilot the new vertical-slice structure on the library feature | — (structural pilot, no defect closed) | `13c1b54` + `8bc3fe5` | ✓ done |
| P08 exit | Wave 2 review | — | (this file) | ✓ done |

**4 of 4 P0 placeholder-service defects closed in W2** (D-005, D-006, D-007, D-008). 1 P1 closed (D-022). 0 new defects introduced.

## Verification (T08.05 + T08.06)

```
$ npx tsc --noEmit
$ echo $?
0

$ npx jest --forceExit
... (10 suites, 119 tests, 1 todo, 0 failures)
Test Suites: 10 passed, 10 total
Tests:       1 todo, 119 passed, 120 total
```

T08.05 ✓ — `tsc --noEmit` exits 0. No code-level type errors anywhere in the project (same baseline as W1 exit; +5 new files in `__tests__/placeholderServices.test.ts` for the W2 P06 service round-trips; +24 new files at `src/features/library/presentation/...` for the W2 P08 pilot).

T08.06 ✓ — `jest` runs all 10 suites cleanly (10/10, 119/119, 1 todo, 0 failures). The act() + worker-exit warnings remain (D-004, still deferred to W3 P03). The 13 new tests in `__tests__/placeholderServices.test.ts` cover the AsyncStorage round-trips for storageService (6 tests), playlistService (4 tests), and the doc-commented mediaService placeholder (3 tests).

## Re-scopings recorded in this wave

### W2 P07 — the broken-commit lesson

The original P07 code commit (`d75e51c`) shipped with the 10 adapter files' internal paths still pointing at `./apiClient` and `../../constants/api` — i.e. the file-move was committed, but the rebased-imports step that was supposed to follow the move was lost in the staging shuffle (the index captured the pre-edit content, while the working tree had the post-edit content). `npx tsc --noEmit` had passed only because tsc was running on the working tree, not on HEAD.

Caught by `git show HEAD:src/infrastructure/api/audius/adapter.ts` and verified by `git stash + npx tsc --noEmit` (the post-stash state revealed the broken imports). The fix: amend `d75e51c` to fold the rebased-imports into the P07 commit, recreate the P07 docs commit on top. New P07 chain: `970ef8b` (docs) → `446c6d5` (code) — content equivalent to the old `d47a780` → `d75e51c` but with the broken state fixed.

This is an Agent-level lesson worth carrying: **a clean `tsc` on the worktree does NOT prove the staged content compiles. Always `git show HEAD:<file>` on the moved files (or any file that was edited after `git mv`/`git add`) before committing.** Future agents: do not trust `tsc` exit 0 as a green light for the commit; verify the staged blob, not the worktree blob.

### W2 P08 — T08.04 had nothing to move

The tracker originally listed T08.04 as "Move the library-related application service (`mediaService` and `libraryScanService`) to `src/features/library/application/`". Neither file is actually library-specific:

- `mediaService` is consumed by 6+ features (Album, Artist, Song, FolderLinking, LinkedFolders, Profile, ShowDetail) — it is cross-feature, not library-specific.
- `libraryScanService` was `git rm`'d at W2 P06 (D-008 closed) — it no longer exists in the tree.

The library's orchestration logic lives in the 3 hooks (`useLibraryScreen`, `useAlbumEnrichment`, `useArtistEnrichment`) in `src/features/library/presentation/hooks/`, which is the correct home per the V21 FOLDERS contract (hooks are presentation, not application). The `application/` folder ships empty with a `.gitkeep`. The `domain/` folder also ships empty for now — the library's own entities and policies have not been carved out yet.

### W2 P08 — T08.05 re-scoped from "linter exits 0" to "0 new violations"

The tracker originally said `npm run lint:boundaries` should exit 0 after the pilot. But the 38 PLAYER violations (D-010) span the entire app — 30 in `src/screens/...` (the other 11 features), 3 in `src/services/...` (audioSettingsService, fileService, metadataService), 2 in `src/state/...` (playerStore, etc.), and 3 in `src/features/library/presentation/...` (the 3 hooks that call `resolveStreamType` + `useOpenPlaylist` + `usePlayerActivity` directly). Resolving all 38 is D-010's W3+ scope (T09.01–T11.04), not P08.

The actual check: after the pilot, the linter should report the SAME 38 violations, with the 3 library violations now in `src/features/library/...` (instead of `src/screens/Library/...`). 0 new violations introduced. ✓

## Closed defect register (W2 contributions)

| ID | Title | Was | Now |
|----|-------|-----|-----|
| D-005 | `storageService.ts` is 8 TODOs (theme/recent-searches/linked-folders persistence) | OPEN | **CLOSED** by `d0abeb4` + `3d7ca68` |
| D-006 | `playlistService.ts` is 1 TODO (in-memory only) | OPEN | **CLOSED** by `d0abeb4` + `3d7ca68` |
| D-007 | `mediaService.ts` is 2 TODOs (no metadata load, no real scan) | OPEN | **CLOSED** by `d0abeb4` + `3d7ca68` (contract documented; real implementation in `useMediaStore` + `useMediaScanner`) |
| D-008 | `libraryScanService.scanFolder()` is a stub returning `[]` | OPEN | **CLOSED** by `d0abeb4` (file `git rm`'d; the 4 pure utilities had zero consumers) |
| D-022 | Adapter layer is mixed with application services | OPEN | **CLOSED** by `446c6d5` + `970ef8b` (10 adapters + apiClient moved to `src/infrastructure/api/<provider>/`) |

**5 defects closed in W2.** Running tally after W2:

- 14 P0: 8 closed (D-003, D-005/006/007/008, D-012, D-013), 6 open
- 9 P1: 1 closed (D-022), 8 open
- 4 P2: 0 closed, 4 open
- Total: 27 defects, 9 closed, 18 open

## What W2 deliberately did NOT do

- **D-001, D-002** (Android release signing + minification) — W4 P13, not W2.
- **D-004** (worker-exit warning + React act warnings) — root cause is in TanStack Query's `Query.#dispatch` state-update path. W2 P07 added the D-004 evidence into the P07 commit message but did not attempt a fix. **Still deferred to W3 P03.**
- **D-009** (duplicate `Linking.getInitialURL`) — W3 P12.
- **D-010** (38 player call sites) — W3 P09 + P10 + P11. The 3 violations introduced/moved by the library pilot will resolve when the facade lands at W3 P10.
- **D-011** (legacy `MediaNotificationService`) — W4 P15.
- **D-014** (iOS scope) — W8 P30.
- **D-020, D-021** (unsafe casts) — post-beta clean-up, not W2.
- **D-023** (player facade) — W3 P10, not W2 (P08's 3 player violations in `src/features/library/...` are the pilot's contribution to D-023).
- **D-024, D-025** (schema validation + cancellation/retry) — W6 P20, not W2.
- **The other 11 features** (Home, Audiobooks, Music, Movies, Podcasts, Radio, LiveTV, Search, Genre, Archive, Shows) — they remain in `src/screens/<X>/` with the same flat shape. The library pilot at W2 P08 was a structural preview, not a sweeping migration. The other 11 features migrate in a post-beta follow-up wave (P09+ in the V21 tracker), to be batched after the architecture stabilizes.

## Reviewer sign-off (T08.09)

| Reviewer | Date | Action | Notes |
|----------|------|--------|-------|
| Paval EP | 2026-09-10 | **APPROVED** with the 2 re-scopings (T08.04 nothing-to-move + T08.05 linter-target) and the 1 commit-history correction (P07 re-amend) noted above | W2 is closed; W3 may begin. |

W3 (Player integration) is next: P09 (inventory 38 player call sites) + P10 (build `PlaybackFacade`) + P11 (migrate the 38 sites to the facade) + P12 (de-duplicate `Linking.getInitialURL`). D-004 (worker-exit + act warnings) is the W3 P03 task that was deferred from W1 P01.
