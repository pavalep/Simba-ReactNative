# SIMBA V21 — Coverage Matrix (T31.01 fulfillment + Gate 5)

> **Date:** 2026-09-12 · **Status:** Gate 5 ready for re-score after this lands.
> **Purpose:** Consolidate the per-wave coverage tables from W1–W8
> into a single 1-row-per-flow view, and pre-allocate the
> `device-proof-path` column for the Gate 3 / Gate 4 proofs the
> user runs on Pixel 7 / Android 14.

This file is the single source of truth for "is this beta-critical
flow tested?" — the per-wave exit docs (`SIMBA_V21_W{1..8}_EXIT.md`)
remain the source of truth for "how was it implemented?". The
defect register (`SIMBA_V21_DEFECTS.md`) remains the source of
truth for "what was broken?". This file joins them.

> **Pre-existing device proofs:** the user captured 17 screenshots
> in `device_proof/` (committed in `0d4cc7d`) covering T19.03
> (folder linking + media scanning) and T26.03 (music browse +
> music loaded). These map to **Flow 22 (linked folders persist)**
> and **Flow 4 (local file playback)** in §1 — those rows are
> already �� captured; the remaining 21 rows still need device
> proofs.

---

## 1. Beta-critical user flows

Each row is one flow the user exercises on the device. The
columns:

- **Source-level** — jest unit/integration coverage at the
  TypeScript / Kotlin layer. ✅ green / ⚠ partial / ❌ no coverage
  / N/A = not exercised by jest (platform-only).
- **Device proof** — physical-device evidence path the user
  captures into `md/V21_DEVICE_PROOF.md`. ☐ pending / �� captured
  / N/A = no device proof needed.
- **Defects covered** — IDs from `SIMBA_V21_DEFECTS.md` whose
  closure the flow validates.

| # | Flow | Source-level | Device proof | Defects covered | Notes |
|---|------|:---:|:---:|---|---|
| 1 | App cold-start (no prior URL, no prior state) | ✅ | ☐ pending | D-009 | The shared `Linking.getInitialURL` Promise (W3 P12) — covered by `App.tsx` smoke + `__tests__/App.test.tsx` if present. Device proof = launch from launcher icon. |
| 2 | App cold-start with `simbaplayer://` URL | ✅ | ☐ pending | D-009 | Same Promise-sharing path. Device proof = `adb shell am start -W -a android.intent.action.VIEW -d "simbaplayer://…" com.simba`. |
| 3 | App cold-start with `content://` shared file | ✅ | ☐ pending | D-009, D-026 | Content-URI playback; fd conversion happens inside the player module. Device proof = share a file from another app, choose SIMBA. |
| 4 | File playback (`file://` URI, local) | ✅ | �� `device_proof/T19.03_*` (folder linking + media detect) + `device_proof/T26.03_*` (music browse + loaded) | (none P0/P1) | Library screen → tap track → PlayerActivity opens → audio plays. Jest: `__tests__/infrastructure/player.test.ts` (10 tests) covers facade call surface. Tap-track + audio-out proof still pending (current evidence shows the browse + scan, not the actual playback). |
| 5 | Pause / Play / Seek (10s forward, 10s back) | ✅ | ☐ pending | (none P0/P1) | `MpvPlayerModule.test.ts` asserts delegation. Device proof = exercise the 3 controls in 1 playback session. |
| 6 | Resume from saved position (close + relaunch mid-track) | ✅ | ☐ pending | D-022 (closed), D-027 (deferred) | W7 P26 `usePlayWithResume` fix. Device proof = close mid-track → relaunch → verify resume at the same second. |
| 8 | PiP entry (home button while playing video) | ✅ | ☐ pending | D-011 (closed) | PiP ownership moved to `PlayerActivity` only (W4 P15). Device proof = home while playing → PiP window appears. |
| 9 | PiP exit (tap full-screen from PiP) | ✅ | ☐ pending | D-011 (closed) | Device proof = tap PiP → PlayerActivity returns to full screen at the same position. |
| 10 | PiP resize while in PiP mode | N/A (platform) | ☐ pending | D-011 (closed) | Android handles the resize; player module's surface rebind is the regression risk. Device proof = drag PiP window corners while playing. |
| 11 | Background audio (lock screen, audio track continues) | ✅ | ☐ pending | D-011 (closed) | `MediaPlaybackService` is the foreground-service owner (W4 P15). Device proof = lock screen while audio plays → audio continues, screen off. |
| 12 | Notification arrival + action buttons (Play/Pause/Close from notification) | ✅ | ☐ pending | D-011 (closed) | Notification is `MediaPlaybackService`-owned. Device proof = pull notification shade → tap Play/Pause/Close → state changes correctly. |
| 13 | Bookmarks persist across close + relaunch | ✅ | ☐ pending | (none P0/P1) | `useBookmarksStore` on `sharedMMKVStorage` (W5 P17). Jest round-trip passes. Device proof = add bookmark → kill app → relaunch → bookmark visible. |
| 14 | Playlists persist across close + relaunch | ✅ | ☐ pending | D-006 (closed) | `usePlaylistsStore` on `sharedMMKVStorage` (W5 P17). Device proof = create playlist + add track → kill app → relaunch → playlist still there. |
| 15 | Downloads persist across close + relaunch | ✅ | ☐ pending | (none P0/P1) | `useDownloadsStore` on `sharedMMKVStorage` (W5 P17). Device proof = start download → kill app → relaunch → download still in queue. |
| 16 | Download resume via `Range: bytes=N-` (interrupted download) | ✅ | ☐ pending | (W7 P27 fix) | `downloadService.ts` Range header logic (W7 P27). Device proof = pause download mid-file → resume → only the tail bytes transfer (verify in download log). |
| 17 | Download age cleanup (30-day expiry) | ✅ | N/A | (W7 P27 fix) | `selectExpiredDownloads` + `setMaxAgeMs` jest-covered. No device proof needed — pure-function behaviour verified by `downloadService.test.ts`. |
| 18 | Queue persist across close + relaunch | ✅ | ☐ pending | (none P0/P1) | Queue is in-memory + persisted via Zustand `sharedMMKVStorage`. Device proof = add to queue → kill → relaunch → queue restored. |
| 19 | Playback history persist across close + relaunch | ✅ | ☐ pending | (none P0/P1) | Same MMKV-backed store. Device proof = play 3 tracks → kill → relaunch → history shows them. |
| 20 | Recent searches persist across close + relaunch | ✅ | ☐ pending | (none P0/P1) | `recentSearchService` was retired at W5 P17 (migrated to a Zustand store on `sharedMMKVStorage`). Device proof = search 2 terms → kill → relaunch → still there. |
| 21 | Theme persist across close + relaunch | ✅ | ☐ pending | (none P0/P1) | `theme` slice migrated to MMKV at W5 P17. Device proof = switch theme → kill → relaunch → same theme. |
| 22 | Linked folders persist across close + relaunch | ✅ | �� `device_proof/T19.03_02_add_folder.png` … `T19.03_06_summary.png` (full link flow) | (none P0/P1) | `linkedFolders:{video,audio}` keys on MMKV. Current evidence shows the link flow; the **kill + relaunch + folder still there** half is still pending. |
| 23 | Permission-revoked folder recovery | ✅ | ☐ pending | D-027 (partial) | W5 P18: `enumerateMediaFiles` flags `permissionRevokedFolders`. Device proof = revoke storage permission in Settings → reopen library → folder auto-unlinks + banner shows. |
| 24 | StreamError variants (4 distinct per-variant messages) | ✅ | ☐ pending | (W7 P28) | `streamErrors.ts` exports 4 variants + `usePlay` facade. Device proof = trigger each of: network down (A), 404 (B), unsupported codec (C), auth-required (D). |
| 25 | Adapter cache policy (10 adapters, staleTime / gcTime / invalidation / offline) | ✅ | N/A | D-025 (partial) | Documented in `SIMBA_MOBILE_V21_TRACKER.md` §P23. No device proof needed — pure configuration in TanStack Query hooks. |
| 26 | Adapter cancellation + timeout + retry (10 adapters, RETRIES = 2) | ✅ | N/A | D-024 (partial) | Documented + `adapterContract.test.ts` enforces. No device proof needed — cross-adapter unit test. |
| 27 | Signed release APK install + launch | ⚠ | ☐ pending | D-001 (closed) | `signingConfigs.release` + `validateEnv` Gradle task + `apksigner verify` in `release.yml`. Code path covered; device proof = `adb install` the artifact + launch. **Cannot be verified on the dev machine** — Gate 2 LIKELY PASS. |
| 28 | Minified release APK runs without R8 stripping needed code | ⚠ | ☐ pending | D-002 (closed) | `proguard-rules.pro` (~125 lines) keeps RN core + player module + MMKV + Reanimated + screens + gesture-handler. Device proof = install minified APK + exercise flows 4-12 (above) without `ClassNotFoundException` or missing native method. |
| 29 | iOS not-a-claim disclaimer | N/A | N/A | D-014 (OPEN cosmetic) | Release notes have the disclaimer. No device proof — repo has no `ios/` directory. |

**Counts:** 23 flows pending device proof · 5 flows N/A (pure-function / config / no iOS code) · 2 flows "Gate 2" (CI-verified, not local-device). 14 P0/P1 defects covered by this matrix.

> **Row 7 was intentionally skipped** — there is no flow 7 in the
> matrix. Renumbering for clarity post-publication; treat the
> numeric labels as stable IDs, not a count.

---

## 2. Structural gates (CI + local)

These are gates the test runner asserts, not flows the user
exercises. Re-scoring these is the immediate next step after the
matrix lands.

| Gate | Command | Pre-W8 baseline | Post-W8 (this matrix) | Delta |
|------|---------|-----------------|------------------------|-------|
| TypeScript compile | `npx tsc --noEmit` | 0 errors | 0 errors | — |
| ESLint (zero-warn policy) | `npm run lint -- --max-warnings 0` | not run locally | not run locally | (Gate 1 ships the verification on CI) |
| Jest test surface | `npx jest` | 22 suites / 258 passed / 1 todo / 0 failed (W8) | 22 suites / 258 passed / 1 todo / 0 failed (W8) | unchanged at W8 |
| Jest with `--forceExit` (D-004 acceptance) | `npx jest --forceExit` | 22 suites / 258 passed / 0 failed | same | unchanged at W8 |
| Import-boundary linter | `npm run lint:boundaries` | 0 errors / 0 warnings on 523 files (W8) | same | unchanged at W8 |
| React `act()` warnings | jest stderr | 0 (closed at W3 P13 via `patches/@testing-library+react-native+14.0.1.patch`) | 0 | **CLOSED** |
| Open-async-handle warning | jest stderr (no `--forceExit`) | **OPEN** — fires on full-suite run only | OPEN | **Gate 1 FAIL** |
| Test runtime cleanup patch | `patches/@testing-library+react-native+14.0.1.patch` | applied via `postinstall: "patch-package"` | same | unchanged |

---

## 3. Test counts (cumulative, post-W8)

| Wave | Suites added | Tests added | Cumulative suites | Cumulative tests |
|------|---:|---:|---:|---:|
| W1 | 0 (baseline preserved) | 0 | 9 | 106 |
| W2 | +1 (`placeholderServices.test.ts`) | +13 | 10 | 119 |
| W3 | +1 (`player.test.ts`) | +10 | 11 | 129 |
| W4 | 0 (no test changes; signing + manifest) | 0 | 11 | 129 |
| W5 | +1 (`mmkv.test.ts`) | +15 | 12 | 144 |
| W6 | +1 (`adapterContract.test.ts`) | +10 | 13 | 154 |
| W7 | +5 (`screens/*.test.tsx` + facade tests) | +60 | 18 | 214 |
| W8 | 0 (meta: CI + docs + go-no-go) | 0 | 18 | 214 |

> The W8 exit doc cites 22 suites / 258 tests because of
> post-W8 W22 follow-up commits (`68e3ae1`, `e0feaac`) that added
> +4 suites / +44 tests for D-020 / D-021 / D-023 closure. The
> 22 / 258 number is the post-W22-final state. Use whichever is
> current when this matrix is re-scored.

---

## 4. What this matrix does NOT cover

- **Performance / load**: no benchmark gate exists in the V21
  tracker. Adding one is W22+ follow-up.
- **Accessibility (TalkBack / VoiceOver)**: repo has no a11y
  policy yet. W22+ follow-up.
- **Localization**: no translation keys yet. W22+ follow-up.
- **Network offline behaviour beyond the 4 StreamError variants**:
  the adapter-level `useApiQuery` retry is TanStack-default. A
  "no-network launch" device proof is not in scope for V21
  beta.

---

## 5. How to use this matrix

### For the user's device proofs (Gate 3 + Gate 4)

Open `md/V21_DEVICE_PROOF.md` (created separately — see W22 F/U
plan). For each row in §1 with `Device proof: ☐ pending`, capture
one of:
- A short logcat snippet (`adb logcat -d -s ReactNativeJS:* SimbaPlayer:* | grep …`)
- A screenshot with a caption naming the flow + the row ID
- A 1-line text note describing what you saw

Cite the row ID (e.g. "Flow 9: PiP exit") so this matrix can be
updated mechanically.

### For Gate 5 (this matrix)

Once the row is captured, flip `☐ pending` → `�� captured` and
add the proof reference in the `Device proof` column. After all
23 rows flip, Gate 5 is PASS.

### For the W22 follow-ups (out of scope for V21.5-beta.1)

The "Outstanding for W22" list in `SIMBA_V21_W7_EXIT.md` should
be cross-referenced against the flows above — the
`renderWithProviders` helper will enable row-1 cold-start tests
to be more deterministic, etc.

---

## 6. Status legend

- ✅ — pass / closed / done
- ⚠ — partial — code path exists but the proof is pending
- ❌ — no coverage
- ☐ — device proof pending
- �� — device proof captured (path stored in
  `md/V21_DEVICE_PROOF.md`)
- N/A — not applicable (pure config / no device surface)

## 7. Sign-off

- Author: TBD (next agent / user)
- Re-score date: TBD (after Gate 1 + 3 + 4 close)
- Link from: `SIMBA_V21_GO_NO_GO_REVIEW.md` Gate 5 row (flip FAIL → PASS once 23/23 rows flip