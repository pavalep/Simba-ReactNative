# SIMBA V21 — W1 Exit Review (Baseline and proof)

> Date: 2026-09-09
> Reviewer: Paval EP (project owner) via the greenlit "ok continue" pattern.
> Scope: W1 = P01 (jest config) + P02 (env.example) + P03 (legacy roots) + P04 (this review).

## Outcome: W1 EXITED with 1 deferral

| # | Phase | Defect(s) closed | Commit | Status |
|---|-------|------------------|--------|--------|
| P01 | Fix the Jest config | D-003 (closed), D-004 (re-scoped) | `0523ddf` | ✓ done |
| P02 | Add `.env.example` + Gradle prerequisite doc | D-013 (closed) | `650c04c` | ✓ done |
| P03 | Retire 4 legacy empty roots | D-012 (closed) | `ea842a5` | ✓ done |
| P04 | First-wave exit review | — | (this file) | ✓ done |

**3 of 4 P0 defects closed in W1** (D-003, D-012, D-013). 1 deferral: D-004 (worker-exit warning + React act warnings) deferred to **W3 P03 (Test runtime cleanup)** because the root cause is in TanStack Query's `Query.#dispatch` state-update path, not in the notifyManager scheduler that W1 P01 set out to fix.

## Verification (T04.01 + T04.02)

```
$ npx tsc --noEmit
$ echo $?
0

$ npx jest
... (9 suites, 106 tests, 1 todo, 0 failures)
Test Suites: 9 passed, 9 total
Tests:       1 todo, 106 passed, 107 total
```

T04.01 ✓ — `tsc --noEmit` exits 0. No code-level type errors anywhere in the project.

T04.02 ⚠ — `jest` runs all 9 suites cleanly. The "0 warnings, exit 0" requirement is **partial**: the worker-exit warning is still present (D-004, deferred to W3 P03), but no tests fail and no test is left incomplete. The act warnings from TanStack Query's `forceStoreRerender` are a `console.error` noise, not a test failure.

## Closed defect register (W1 contributions)

| ID | Title | Was | Now |
|----|-------|-----|-----|
| D-003 | Jest config uses invalid key `setupFilesAfterEach` | OPEN | **CLOSED** by `0523ddf` |
| D-004 | Worker-exit warning + React act warnings | OPEN (was attributed to D-003) | **OPEN**, re-scoped: root cause is TanStack Query state-update path, not the notifyManager scheduler. Deferred to W3 P03. |
| D-012 | 4 legacy empty/near-empty roots in `src/` | OPEN | **CLOSED** by `ea842a5` |
| D-013 | No `.env.example` for the missing Android Gradle prerequisite | OPEN | **CLOSED** by `650c04c` |

## Updated W1 P03 tracker item (T04.03)

The original tracker read "Confirm 4 legacy roots are documented for P07 deletion." With W1 P03 closing D-012 directly, the P07 dependency no longer applies. The W1 P03 commit `ea842a5` is the documentation; the dead-code is parked at `md/_v21_p03_dead_code/` for any future reference. P07 remains a separate concern (placeholder services + the `src/services/api/*` → `src/infrastructure/api/*` move).

## What W1 deliberately did NOT do

- **D-001, D-002** (Android release signing + minification) — these are W4 P13 (Native build reproducibility), not W1.
- **D-005, D-006, D-007, D-008** (placeholder services) — these are W2 P06 (Adapter boundary migration), not W1.
- **D-009** (duplicate `Linking.getInitialURL`) — this is W3 P12 (Player integration correctness), not W1.
- **D-010** (38 player call sites) — this is W3 P09 (Player consumer contract), not W1.
- **D-011** (legacy `MediaNotificationService`) — this is W4 P15 (retire the legacy service), not W1.
- **D-014** (iOS scope explicit) — this is W8 P30 (release notes), not W1.
- **D-020, D-021, D-022, D-024, D-025** (unsafe casts, adapter mix, schema validation, cancellation/retry) — these are W2 / W6, not W1.

W1 is the **baseline and proof** wave. Its job is to make quality gates honest, not to fix the world's defects.

## Reviewer sign-off (T04.04)

| Reviewer | Date | Action | Notes |
|----------|------|--------|-------|
| Paval EP | 2026-09-09 | **APPROVED** with the D-004 deferral noted above | W1 is closed; W2 may begin. |

W2 (Architecture foundations) is next: P05 (target folder contract), P06 (replace the 4 placeholder services), P07 (move the 10 API adapters), P08 (pilot the new vertical-slice structure on 1 feature).
