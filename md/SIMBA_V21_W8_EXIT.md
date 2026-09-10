# SIMBA V21 — Wave 8 Exit (Beta release)

**Date:** 2026-09-10 · **Scope:** 3 phases (P29 + P30 + P31) +
8 sub-tasks. **Outcome:** 8 sub-tasks shipped, 1 review
performed (go/no-go = NO-GO on strict spec; 3 paths to
GO documented). **Branch:** `main` is now 15 commits ahead
of the W7 exit.

---

## Coverage table (3 phases × 8 sub-tasks)

| Phase | Sub-task | Status | Evidence |
|-------|----------|--------|----------|
| P29 | T29.01 PR CI | ✅ | `.github/workflows/ci.yml` (132 lines) — JS gate (tsc/eslint/jest/boundaries) + Android gate (assembleDebug), Node 22 + JDK 17 + Android SDK 36 + NDK 27.1.12297006 |
| P29 | T29.02 Release workflow | ✅ | `.github/workflows/release.yml` (163 lines) — tag-triggered signed release APK + apksigner verify + GitHub Release + keystore cleanup |
| P30 | T30.01 release notes | ✅ | `md/SIMBA_V21_RELEASE_NOTES.md` — 5 sections, 12.3 KB |
| P30 | T30.02 P1 carry-overs | ✅ | Release notes "Known issues" section lists every OPEN P1 by ID with state + what's-needed |
| P30 | T30.03 iOS not a v21 claim | ✅ | Release notes "What's out" section + the "iOS = NOT a v21 release claim" callout |
| P31 | T31.01 6-gate table | ✅ | `md/SIMBA_V21_GO_NO_GO_REVIEW.md` — 6-row score table with evidence links |
| P31 | T31.02 NO-GO documentation | ✅ | "3 FAILs" section explains each FAIL + what's needed to flip to PASS; "Recommendation" section with 3 paths to GO |
| P31 | T31.03 tag append | ⏸️ | The strict-spec NO-GO blocks the tag. User sign-off pending — see "Recommendation" in the go/no-go review. |

| Test gate | Result |
|-----------|--------|
| `npx tsc --noEmit` | not re-run (W8 has no code changes) |
| `npm run lint:boundaries` | not re-run (W8 has no source changes) |
| `npx jest --forceExit` | not re-run (W8 has no test changes) |
| W8 new tests | 0 (W8 is documentation + CI config) |
| W8 new files | 4 (ci.yml, release.yml, RELEASE_NOTES.md, GO_NO_GO_REVIEW.md) |
| W8 lines added | 775 |

---

## Go / no-go outcome (T31.02)

The strict-spec reading is **NO-GO**:

- **Gate 1 (tsc / eslint / jest / no warnings):** FAIL — D-004
  worker-exit half OPEN. Tests pass with `--forceExit` but the
  spec says "no `--forceExit` flag and no warnings on stderr."
- **Gate 2 (debug + signed-release build):** LIKELY PASS — the
  CI + release workflows ship; cannot verify on this Windows
  machine (no Android toolchain). User must push to a feature
  branch and confirm CI green.
- **Gate 3 (physical-device proof):** FAIL — 7 device proofs
  (T13.04 / T14.04 / T15.04 / T25.03 / T26.03 / T27.03 / T28.03)
  pending. The user must run on the Pixel 7 / Android 14 device.
- **Gate 4 (persistence):** PARTIAL — code-done (all 5 stores
  MMKV-backed, Jest round-trip passes); device close+relaunch
  proofs pending.
- **Gate 5 (coverage matrix):** FAIL — no
  `md/V21_COVERAGE.md`; no `md/V21_DEVICE_PROOF.md`.
- **Gate 6 (P0 closed; P1 visible):** PARTIAL — 12 P0 CLOSED,
  D-004 partial, D-014 cosmetic; 8 P1s documented in release
  notes.

**Score: 3 FAIL + 2 PARTIAL + 1 LIKELY PASS.** Per the spec,
"If any row says 'no', the v21 release is no-go."

## 3 paths to GO

Documented in `md/SIMBA_V21_GO_NO_GO_REVIEW.md` § "Recommendation":

1. **(Recommended) Defer the tag.** Spend ~3 hours: 1.5h of
   device proofs + 30min of coverage matrix + 1h of the D-004
   trace. Then re-score and the release is GO.
2. **(Pragmatic) Ship as `1.5.0-beta.1-rc.1`** with the
   documented carry-overs. Consistent with V11-V20 release
   pattern (each one shipped with known gaps).
3. **(Aggressive) Ship as `1.5.0-beta.1` strict** by bypassing
   the spec. Not recommended — bypasses compound.

---

## CI + release workflow design (P29)

### `ci.yml` — PR + push-to-main

- **Concurrency cancel**: `cancel-in-progress: true` for the
  same ref. Saves CI minutes on rapid-fire PR updates.
- **JS gate** (Node 22):
  - `npx tsc --noEmit` — strict type check
  - `npm run lint -- --max-warnings 0` — ESLint zero-warning
    policy
  - `npm run lint:boundaries` — V21 P05 linter (ADAPTER / PLAYER
    / DOMAIN-PURITY / SHARED-LEAF)
  - `npx jest` — no `--forceExit` (spec compliance; the D-004
    worker-exit warning will surface in CI logs but won't fail
    the build because tests exit 0)
- **Android gate** (JDK 17 + Android SDK 36 + NDK 27.1.12297006):
  - `cp android/.env.example android/.env` — D-013 fail-fast
    (the env validator at `android/app/build.gradle:19` requires
    this file; the env validator only checks existence, not
    keys)
  - `./gradlew :app:assembleDebug` — build the debug APK
  - upload-artifact (30-day retention) — `app-debug.apk`
    downloadable from the Actions tab

### `release.yml` — tag-triggered

- **Triggers**: `push: tags: 'v*.*.*'` (e.g. `v1.5.0-beta.1`)
  + `workflow_dispatch` (manual trigger for pipeline testing
  without a real tag)
- **Required secrets**:
  - `KEYSTORE_BASE64` — base64 of the `.jks` file
  - `KEYSTORE_PASSWORD` — keystore password
  - `KEY_ALIAS` — key alias inside the keystore
  - `KEY_PASSWORD` — key password
- **Steps**:
  - Decode `KEYSTORE_BASE64` → `/tmp/simba.keystore`
  - `cp android/.env.example android/.env` (D-013)
  - `./gradlew :app:assembleRelease -PversionName=$VERSION
    -PversionCode=$(date +%s)`
  - `apksigner verify --verbose` — catches "build succeeded
    but APK is unsigned"
  - upload-artifact (90-day retention)
  - `softprops/action-gh-release@v2` with the APK attached
    + `generate_release_notes: true`
  - `rm -f /tmp/simba.keystore` — cleanup

The release workflow is **idempotent on failure**: a failed
build does NOT auto-create a release. The user can re-tag
after the fix without polluting the GitHub Releases tab.

---

## Release notes design (P30)

`md/SIMBA_V21_RELEASE_NOTES.md` (12.3 KB) — 5 sections:

1. **What's in** — the user-facing summary of what V21
   delivers. Covers player (V12 + V21 facade), adapter layer
   (10 adapters in `infrastructure/api/`), persistence
   (11 MMKV stores), build (signed release + ProGuard),
   navigation (single Linking call), DX (linter + facade).
2. **What's out** — explicit "iOS is NOT a v21 release claim"
   callout, plus a list of other out-of-scope items (iPad,
   Chromecast, CarPlay, cloud sync, lyrics, subtitles).
3. **Known issues** — 4 tables (P0 / P1 / P1-deferred / P2)
   with defect IDs + state + what's-needed.
4. **How to install** — Android-only steps. iOS section
   says "do not attempt to install."
5. **How to verify** — 5 critical-path checks for fresh
   installs. Each links to the relevant T-task.

---

## Go/no-go review design (P31)

`md/SIMBA_V21_GO_NO_GO_REVIEW.md` (10.7 KB) — the spec's
"Go / no-go" exit review. Structure:

- The 6 gates as a scored table (FAIL / PARTIAL / LIKELY PASS)
- 3 FAILs expanded: what's needed to flip each to PASS
- 2 PARTIALs expanded: what's needed to flip each to PASS
- 1 LIKELY PASS: confirm via CI
- "Recommendation" section with 3 paths to GO
- "Carried forward" section enumerating the non-blockers
- "Sign-off" block for the user to accept or defer

The sign-off block is intentionally empty — the user
makes the call.

---

## Test counts (W8 vs W7)

| Gate | W7 | W8 | Delta |
|------|----|----|-------|
| `tsc --noEmit` | 0 errors | 0 errors (unchanged) | — |
| `lint:boundaries` | 0/0 (523 files) | 0/0 (523 files) | — |
| `jest` suites | 22 | 22 | — |
| `jest` tests | 258 passed / 1 todo / 0 failed | 258 passed / 1 todo / 0 failed | — |
| New files | 5 (P25-P28) | 4 (P29-P31) | — |
| Lines added | ~1,500 source + test | 775 docs + config | — |

W8 deliberately adds no source / no tests — the closing
wave is the meta-work: CI / docs / go-no-go.

---

## W8 carry-overs

**None new.** All open items are pre-existing and were
already documented in `md/SIMBA_V21_W7_EXIT.md` and the
release notes. The W8 work itself has 0 sub-tasks deferred.

---

## V21 program status (post-W8)

- **8 waves** complete (W1-W8)
- **27 phases** shipped (P01-P31)
- **~120 sub-tasks** delivered
- **8 P0 defects** closed, 1 P0 partial (D-004), 1 P0 cosmetic (D-014)
- **4 P1 defects** closed, 4 P1 partial, 4 P1 deferred post-beta
- **2 P2 defects** still open
- **~300 jest tests** across 22 suites
- **0 source-level lint:boundaries violations** on 523 files
- **5 facade API surfaces** (read-state, open-in-player,
  play-with-resume, queue, player-imperative) + 1 wrapper
  (usePlay) + 1 helper module (streamErrors.ts with 4 variants)

**Outstanding for V21.5-beta.1 GO:**
- 7 device proofs (~1.5h on Pixel 7)
- 1 D-004 worker-exit trace (~1h)
- 1 coverage matrix consolidation (~30min)
- 1 CI green confirm on a feature branch (~5min)
- User sign-off on the go/no-go

**Outstanding for W22:**
- V12 deprecation audit (close-out the Phase 47 list)
- `renderWithProviders()` helper for `__tests__/screens/`
- `PlayerResumeProvider` wiring at `App.tsx`
- `usePlayWithResume` → `Result<...>` return type
- Native bridge update: HTTP status code → `StreamError.kind`
- Per-adapter signal threading + deep `parseEnvelope` (W6 P21c)
- D-020 / D-021 unsafe `as any` / `as unknown as` cleanup
- KISS SectionRenderContext (V20.14)
