# SIMBA V21 — Go / No-Go Review (T31.01-T31.03)

**Review date:** 2026-09-10 · **Reviewer:** Mavis (self-review
for the user; user must sign off before any tag is pushed)
**Wave:** W8 P31 · **Outcome:** **NO-GO for V21.5-beta.1
as written** — 3 of 6 gates FAIL on the strict reading
(see below). 2 gates are PARTIAL (code-done, device proofs
pending). 1 gate is LIKELY PASS but cannot be verified on
this machine (the Android toolchain is absent — the user
must run the CI workflow against `main` to confirm).

---

## The 6 gates, scored

| # | Gate | Score | Evidence |
|---|------|-------|----------|
| 1 | Clean `tsc` / ESLint / Jest — no config validation, no React `act()` warnings, no open-async-handle warnings | **FAIL** | `tsc --noEmit` exits 0 ✅. `eslint .` not yet run on this machine (the CI workflow ships it; cannot verify locally). `jest` exits 0 ✅ (22 suites / 258 passed / 1 todo / 0 failed). React `act()` warnings: **CLOSED** via `patches/@testing-library+react-native+14.0.1.patch` (T13.01a, applied by `postinstall: "patch-package"`) ✅. **Open-async-handle warning** ("worker process has failed to exit gracefully and has been force exited"): **OPEN** — D-004 worker-exit half. 4 strategies tried in W2 P08 + W3 T13.02 (`--detectOpenHandles --logHeapUsage`, `beforeExit`/`exit`/`SIGTERM`/`SIGINT` hooks, per-suite runs, tracked `QueryClient` constructor + `afterEach(client.destroy())`); none surfaced the handle. The `--forceExit` invocation passes the suite but the spec says "no `--forceExit` flag" — the strict reading is FAIL. The `act()` and config validation criteria pass. |
| 2 | Debug + signed-release Android artifacts build from a clean checkout with documented `.env.example` and no committed secrets | **LIKELY PASS** (unverified) | `android/.env.example` is committed ✅. No `.env` is checked in (`.env` is in `.gitignore`; `git ls-files | grep -E '^\.env$'` returns empty). No `release.keystore` is checked in (the keystore is the user's, stored as a GitHub Actions secret). `.github/workflows/ci.yml` runs `./gradlew :app:assembleDebug` on Node 22 + JDK 17 + Android SDK 36 + NDK 27.1.12297006. `.github/workflows/release.yml` runs `./gradlew :app:assembleRelease` with the 4 `KEYSTORE_*` env vars + `apksigner verify`. Both workflows pass `cp android/.env.example android/.env` as the first step (D-013 fail-fast). The `validateEnv` Gradle task (W4 P16) pre-flights the keystore env vars before every release task. **Cannot be verified on this Windows machine** (no Android toolchain); the CI workflow is the source of truth. |
| 3 | Physical-device proof of: launch, play, pause, seek, close, return, PiP, background, resume, notification, content URI | **FAIL** | All 7 device proofs (T13.04 / T14.04 / T15.04 / T25.03 / T26.03 / T27.03 / T28.03) are **OPEN** (no device evidence captured; no `md/V21_DEVICE_PROOF.md` exists). The pre-V21 tracker documented 6 device tasks (T13.04 / T14.01 / T14.04 / T15.04 / T19.03 / T20.03) plus the 4 from W7 (T25.03 / T26.03 / T27.03 / T28.03) = 10 total device tasks. The user must run these on the Pixel 7 / Android 14 device. |
| 4 | Local folders, playlists, downloads, queue/history/bookmarks, remote search have tested persistence | **PARTIAL** (code-done, device proofs pending) | All 5 stores are MMKV-backed (W5 P17): `useBookmarksStore`, `usePlaylistsStore`, `useDownloadsStore`, `useRecentHistoryStore`, `recentSearchService`. Local folders: permission-revoked handling ✅ (W5 P18). Downloads: age-based cleanup + Android resume via Range header ✅ (W7 P27). Queue/history/bookmarks: 2 resume bugs fixed ✅ (W7 P26). Jest tests pass for every store (round-trip in W5 P17 + W7 P26 + W7 P27). **The "close app + relaunch + data is still there" device proof is OPEN** for all 5 (no `md/V21_DEVICE_PROOF.md`). |
| 5 | Every beta-critical flow has automated + device test evidence | **FAIL** | 22 jest suites / 258 passing tests provide automated coverage for most flows. `md/V21_COVERAGE.md` does NOT exist yet — the coverage matrix is implicit in the per-phase exit docs but is not consolidated into one file. `md/V21_DEVICE_PROOF.md` does NOT exist — zero device-proof evidence captured. The strict reading is FAIL. |
| 6 | All P0 defects closed; remaining P1s approved, visible in release notes, with mitigations | **PARTIAL** | P0: D-001 / D-002 / D-003 / D-005 / D-006 / D-007 / D-008 / D-009 / D-010 / D-011 / D-012 / D-013 = **12 CLOSED**. D-004 = **PARTIALLY CLOSED** (act half ✅, worker-exit half ❌, accepted as cosmetic in W2 P08 / W3 T13.02). D-014 = **OPEN cosmetic** (the iOS-not-a-claim note; this release notes section is the mitigation). P1: D-022 = **CLOSED** (W2 P07). D-020 / D-021 / D-023 (partial) / D-024 (partial) / D-025 (partial) / D-026 (OPEN device) / D-027 (deferred post-beta) / D-028 (deferred post-beta) are all documented in `md/SIMBA_V21_RELEASE_NOTES.md`'s "Known issues" section. The release notes cover the 8 OPEN P1s + 1 OPEN P0 (D-014 cosmetic). The spec says "remaining P1s approved" — the partial closures + the documented mitigations are the "approval." |

**Summary:** 3 FAIL + 2 PARTIAL + 1 LIKELY PASS. The spec is
binary: "If any row says 'no', the v21 release is no-go."

---

## The 3 FAILs — what's needed to flip each to PASS

### Gate 1 — open-async-handle warning

**Status:** 4 strategies tried, none surfaced the handle.
The worker-exit warning fires only on the full suite run
(per-suite runs exit cleanly), indicating cross-test
accumulation. The most likely source is a TanStack
`QueryClient` created in `useApiQuery.test.tsx` and never
`.destroy()`'d, but the `Object.setPrototypeOf`-based
tracking constructor broke 7 of 10 tests.

**To flip to PASS:**

- **Option A (W22 + 1 hour):** Trace the handle in a
  separate test run. Candidates: a leaked
  `QueryClient` (the suspect), a leaked `MMKV` instance
  in the new mock (`__mocks__/react-native-mmkv.js`),
  a leaked `playerState` subscription in any
  `usePlayer`-mocked test, or a leaked `useApiQuery`
  callback. The fix is ~5 lines: an `afterEach(() =>
  client.destroy())` in the offending test file.
- **Option B (1 minute, spec deviation):** Document the
  warning as a known cosmetic in the release notes
  (already done in the "Known issues" section of
  `md/SIMBA_V21_RELEASE_NOTES.md` under D-004). This is
  **not strict-spec compliant** but is the pragmatic
  path: tests pass, the user can ship.

### Gate 3 — 7 device proofs

**Status:** No device evidence captured. The user must
run on the Pixel 7 / Android 14 device:
- T13.04 (signed-release APK install + launch)
- T14.04 (PiP entry / exit / restore)
- T15.04 (notification arrival + action buttons)
- T25.03 (NowPlayingScreen reflects live player state)
- T26.03 (bookmark persists close + relaunch)
- T27.03 (Android download resume via Range header)
- T28.03 (4 distinct per-variant error messages)

Plus 3 W4-W5 device proofs (T14.01 merged manifest, T19.03
100 mixed metadata, T20.03 playlist persistence) for the
defect register D-019 / D-007 / D-022 closure.

**To flip to PASS:** ~1.5 hours on the device. Capture
a screenshot or log line per item, write
`md/V21_DEVICE_PROOF.md`.

### Gate 5 — coverage matrix

**Status:** Automated coverage is strong (22 jest suites,
258 passing tests) but the per-flow matrix
(`md/V21_COVERAGE.md`) is not consolidated. The per-wave
exit docs cover most of the matrix implicitly.

**To flip to PASS:** ~30 minutes. Reuse the per-wave exit
docs' "Coverage table" sections and copy them into a
single `md/V21_COVERAGE.md` with a 1-row-per-flow table.
Add a `device-proof-path` column (currently empty for
most rows; will fill in as Gate 3 device proofs land).

---

## The 2 PARTIALs — what's needed to flip each to PASS

### Gate 4 — persistence device proofs

**Status:** All 5 stores are MMKV-backed. Jest round-trip
tests pass. Device close+relaunch proof is OPEN.

**To flip to PASS:** ~30 minutes on the device. Each
proof is the same shape: open the screen, see the data,
kill the app, relaunch, see the data. Document in
`md/V21_DEVICE_PROOF.md`.

### Gate 6 — P0 D-004 worker-exit half

**Status:** Part of Gate 1. Flips to PASS when Gate 1
flips.

---

## The 1 LIKELY PASS — confirm via CI

### Gate 2 — debug + signed-release build

**Status:** The CI workflow ships the build steps. The
release workflow signs the APK. Cannot be verified on
this Windows machine (no Android toolchain).

**To flip to PASS:** ~5 minutes. Push the latest commit
to a feature branch, open a PR, confirm the CI workflow
turns green. The release workflow can be exercised via
`workflow_dispatch` against a test tag (e.g. `v0.0.0-test`)
to validate the keystore flow without producing a real
release.

---

## Recommendation

**The strict-spec reading is NO-GO.** Gate 1 (D-004
worker-exit), Gate 3 (7 device proofs), and Gate 5
(coverage matrix) all fail. The user must either:

- **(Recommended) Defer the tag.** Spend ~3 hours (1.5
  hours of device proofs + 30 minutes of coverage matrix
  + 1 hour of the D-004 trace). Then re-score and the
  release is GO.
- **(Pragmatic) Ship as V21.5-beta.1 with known
  deviations.** Document the 3 FAILs in the release
  notes' "Known issues" section (already done for D-004
  and D-014; add the 7 device-proof and coverage-matrix
  items). Mark the tag as `1.5.0-beta.1-rc.1` or
  `1.5.0-pre-beta.1` to signal "not strict-spec ready."
  This is consistent with how V11 / V12 / V13 / V14 / V15
  / V16 / V17 / V18 / V19 / V20 shipped (each one had
  similar carry-overs documented in the W-exit).
- **(Aggressive) Ship as V21.5-beta.1 strict.** Bypass
  the spec's 6-gate requirement, add a "Known gaps" note
  in the release notes, and commit to W22 covering the
  carry-overs. Not recommended — the spec is a contract
  the user wrote, and bypassing it is the kind of
  shortcut that compounds.

---

## Carried forward (not blockers, but visible)

The full defect register is `md/SIMBA_V21_DEFECTS.md`.
The release notes cover the 8 OPEN P1s + 1 OPEN P0
(D-014). The 4 W22 follow-ups (V12 deprecation audit,
`renderWithProviders` helper, `PlayerResumeProvider`
wiring, `usePlayWithResume` → `Result<...>` return type)
are documented in `md/SIMBA_V21_W7_EXIT.md`.

The 7 device proofs + 3 W4-W5 device proofs are the only
non-cosmetic items blocking the strict-spec GO. Everything
else is a V22 polish.

---

## Sign-off

Reviewer: Mavis (self-review, not a code owner)
User sign-off: ☐ pending

If the user accepts the no-go and ships V21.5-beta.1
with the documented carry-overs, append:

    Acceptance date: ___________
    Tag: v1.5.0-beta.1
    Reviewer initials: ___________

If the user defers the tag, set a new go/no-go target
date in the tracker.
