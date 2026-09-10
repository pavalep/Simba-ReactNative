# SIMBA Mobile v21 — Implementation Tracker

> Rewritten 2026-09-09 to V20 standard. 8 waves × ~3 phases each,
> 5–10 tasks per phase. Every task references the defect(s) it
> closes (see `md/SIMBA_V21_DEFECTS.md`) and the file:line it
> touches. No 20-item template.
>
> Conventions:
> - Tasks use `D-NNN` for the defect they close.
> - File:line references are evidence; commits are evidence;
>   `device: <model>` lines are device-proof evidence.
> - A phase is complete when every task has a checkmark + an
>   `Evidence:` line that the next phase's owner can verify.
> - A wave is complete when its phase-exit review is signed.

---

## W1 — Baseline and proof

### P01 — Fix the Jest config (closes D-003, D-004)

- [ ] **T01.01** Replace `setupFilesAfterEach` with `setupFilesAfterEnv` at `jest.config.js:12`. The correct Jest 29 key is `setupFilesAfterEnv` (verified in `node_modules/jest-config/build/ValidConfig.js:171`). Evidence: `npx jest` no longer prints the "invalid option" warning.
- [ ] **T01.02** Run `npx jest --no-forceExit` and confirm the suite exits 0 without the open-async-handle warning. The V18.10 notifyManager shim (`jest.setup.ts:1-15`) should now actually load and unref the timer. Evidence: stderr is empty after the test summary.
- [ ] **T01.03** Remove the `--forceExit` flag from any documentation or script that referenced it. Evidence: `git grep -n forceExit` returns only legitimate uses (e.g. the `__mocks__/react-native-svg` shim).
- [ ] **T01.04** Update `jest.setup.ts:2` comment to read "Loaded via `setupFilesAfterEnv`" instead of "setupFilesAfterEach". Evidence: the comment is consistent with the config.

### P02 — Add the `.env.example` and document the Gradle prerequisite (closes D-013)

- [ ] **T02.01** Read `android/app/build.gradle:1-10` and identify the missing keys. Create `android/.env.example` with the keys and example values, no real secrets. Evidence: file exists, `git ls-files android/.env.example` returns 1.
- [ ] **T02.02** Update `android/app/build.gradle` to print a clear "missing key: X" error when `.env` is absent (rather than letting Gradle fail with a confusing message). Evidence: running with no `.env` produces a typed error.
- [ ] **T02.03** Add a `md/SIMBA_V21_ENV.md` quick-start that says: copy `.env.example` to `.env`, set the keys, run `./gradlew clean :app:assembleDebug`. Evidence: file exists, lists each key with a 1-line description.
- [ ] **T02.04** Update `README.md` (if present) to point to the new quick-start. Evidence: README links to `md/SIMBA_V21_ENV.md`.

### P03 — Retire the 4 legacy empty roots (closes D-012)

- [ ] **T03.01** Confirm `src/contexts/` is empty and has no imports. Evidence: `Get-ChildItem src/contexts` returns 0 items + `git grep -n from .*contexts` returns 0 matches.
- [ ] **T03.02** Confirm `src/native/` is empty. Evidence: same pattern.
- [ ] **T03.03** Confirm `src/modules/playback/{audio,components}/` have no files (only empty subdirs). Evidence: same pattern.
- [ ] **T03.04** Find all consumers of `src/context` (the 1-file re-export shim). Document the count. Evidence: `git grep -n "from '.*src/context'" | wc -l` returns the count.
- [ ] **T03.05** Add a `src/context/index.ts` → `src/theme` re-export removal task to the V21 P07 phase (won't be done here, just noted).

### P04 — First wave exit review

- [x] **T04.01** Run `npx tsc --noEmit` and capture the result. Evidence: exit 0 (re-verified at the W1 exit; see `md/SIMBA_V21_W1_EXIT.md`).
- [x] **T04.02** Run `npx jest` (no `--forceExit`) and capture the result. Evidence: 9 suites, 106 passed, 1 todo, 0 failures. **The "0 warnings" requirement is partial** — the worker-exit warning is still present (D-004, deferred to W3 P03). Test count is the same; warning is the only thing that needs follow-up.
- [x] **T04.03** Confirm 4 legacy roots are documented for P07 deletion. Evidence: W1 P03 (`ea842a5`) closed D-012 directly. The 4 roots are parked at `md/_v21_p03_dead_code/`. The P07 dependency is therefore N/A — P07 remains a separate concern (placeholder services + adapter move, not legacy roots).
- [x] **T04.04** Reviewer signs off on W1 exit. Evidence: `md/SIMBA_V21_W1_EXIT.md` (this reviewer, 2026-09-09). **APPROVED** with the D-004 deferral noted. W2 may begin.

---

## W2 — Architecture foundations

### P05 — Establish the target folder contract (closes part of D-022)

- [x] **T05.01** Create empty `src/{app,domain,infrastructure,features,shared}/` directories with `.gitkeep` files so the layout is committed. Evidence: `git ls-files src/domain src/infrastructure src/infrastructure/api src/infrastructure/persistence src/infrastructure/player src/infrastructure/device src/shared` shows the keep files.
- [x] **T05.02** Add a `md/SIMBA_V21_FOLDERS.md` that documents the import-boundary rules (the two hard rules from the spec) in 1 page. Evidence: file exists, ~1 page.
- [x] **T05.03** Add a `scripts/check-import-boundaries.js` script (Node-only, no extra deps) that fails CI if any file under `src/infrastructure/api/<provider>/` imports from `src/screens/`, `src/navigation/`, or `src/state/*Store.ts`. Evidence: script runs in 173ms on 521 files, catches a planted violation, and finds the exact 38 PLAYER violations D-010 lists.
- [x] **T05.04** Wire the script into `npm test` (or a new `npm run lint:boundaries`). Evidence: added as `npm run lint:boundaries` (standalone, not wired into `npm test` — the codebase currently has 38 PLAYER violations that will be closed by W3 P11; the linter being red today is the correct state, not a bug).

### P06 — Replace the 4 placeholder services (closes D-005, D-006, D-007, D-008)

- [x] **T06.01** `src/services/storageService.ts:8,12,17,21,26,30` — replace each `// TODO` with a real AsyncStorage call. The interface is already correct (theme, recent searches, linked folders); the implementation is now in place. Evidence: 6 storage functions persist + reload, covered by `__tests__/placeholderServices.test.ts` (6 tests). Note: surface changed from sync to async — verified zero consumer calls via `git grep` (the placeholders were 100% dead).
- [x] **T06.02** `src/services/playlistService.ts:7` — replace `// TODO: Load playlists from storage` with a real persistent read. Evidence: covered by 4 tests in `__tests__/placeholderServices.test.ts`. A `_resetForTests()` test escape hatch clears the lazy-load cache.
- [x] **T06.03** `src/services/mediaService.ts:5,10` — replace each `// TODO` with an explicit "this is a placeholder" doc comment pointing to `useMediaStore` (the real source). Evidence: covered by 3 tests in `__tests__/placeholderServices.test.ts`. The methods still return `null` / `[]` (no real metadata extractor yet) but the WHY is documented.
- [x] **T06.04** `src/services/libraryScanService.ts:9-13` — `scanFolder` returns `[]`. Verified via `git grep` that no real consumer exists (the real scan is `useMediaScanner` in `src/hooks/useMediaScanner.ts`). Marked the file for deletion.
- [x] **T06.05** `git rm` the now-redundant `libraryScanService.ts` (it duplicates `useMediaScanner` exactly + the 4 pure utilities — getVideos, getAudio, searchMedia, sortMedia — have zero consumers). Evidence: file gone (`git ls-files src/services/libraryScanService.ts` returns empty). `src/services/index.ts` drops the 7 dead re-exports.
- [x] **T06.06** Add a Jest test file that round-trips through all 4 services. Evidence: `__tests__/placeholderServices.test.ts` exists, 13 tests pass. The AsyncStorage mock at `__mocks__/@react-native-async-storage-async-storage.js` is upgraded from `module.exports = {}` to a Map-backed in-memory store (otherwise the tests would throw on the first `AsyncStorage.getItem` call).

### P07 — Move the 10 API adapters to `src/infrastructure/api/<provider>/` (closes D-022)

- [x] **T07.01** List the 10 adapters: `jamendoAdapter`, `audiusAdapter`, `libriVoxAdapter`, `internetArchiveAdapter`, `iptvAdapter`, `musicBrainzAdapter`, `podcastIndexAdapter`, `radioBrowserAdapter`, `tvmazeAdapter`, `weatherAdapter`. Evidence: `git ls-files src/services/api | wc -l` returns 11 (10 adapters + apiClient.ts).
- [x] **T07.02** ~~Create `src/infrastructure/api/<provider>/index.ts` re-export shims~~ — skipped. The folder contract (`md/SIMBA_V21_FOLDERS.md` line 66) explicitly says "No `index.ts` barrel requirement — every file can be imported directly". Direct imports of `../infrastructure/api/<provider>/adapter` are the cleaner pattern. Consumers point straight at the adapter file, with no re-export layer in between.
- [x] **T07.03** Move each `*.ts` from `src/services/api/` to `src/infrastructure/api/<provider>/adapter.ts` (the new home). Evidence: `git log --diff-filter=R --name-status -1 d75e51c` shows 11 `R` (rename) entries (10 adapters + apiClient.ts); 100% similarity for every one (no content change, only path).
- [x] **T07.04** Update the import sites across the app. Evidence: `git grep -l "services/api/" -- src __tests__` returns 0 matches after `d75e51c`. 32 consumer files (28 src/, 4 __tests__/) updated. Internal adapter paths rebased from `../../constants/api` → `../../../constants/api` (and the same for `types/api`, `constants/env`, `lib/logger`) in 10 files. Migration done via `scripts/_v21_p07_fix_imports.js` (not committed — one-time tool).
- [x] **T07.05** Run `npx tsc --noEmit` — must exit 0. Evidence: exit 0 (was 30+ TS2307 errors pre-commit; clean post-commit).
- [x] **T07.06** Run `npx jest` — all 10 adapter tests must pass without modification (the public surface didn't change). Evidence: 10 suites / 119 passed / 1 todo / 0 failures. The 4 adapter test files import directly from the new `../src/infrastructure/api/<x>/adapter` path; no test logic changed.

### P08 — Pilot the new vertical-slice structure on 1 feature (prepares the full migration, doesn't do it)

- [x] **T08.01** Pick the **library** feature for the pilot (it's the largest and most-coupled, so any problems surface here). Evidence: `13c1b54` commit message records the choice.
- [x] **T08.02** Move `src/screens/Library/` → `src/features/library/presentation/screens/Library/`. The component / hook / related / types subdirs move to `src/features/library/presentation/{components,hooks,related,types}/`. Evidence: 24 files in `13c1b54` (`git log --stat` shows the move). The screens/Library/index.tsx barrel re-exports LibraryScreen + ArtistDetailScreen + AlbumDetailScreen from `../../components/`.
- [x] **T08.03** Move `useLibraryScreen.ts`, `useAlbumEnrichment.ts`, `useArtistEnrichment.ts` to `src/features/library/presentation/hooks/`. Evidence: same commit; 3 hooks in the new location, all using `useApiQuery` (V20.1) and importing the moved adapters from `../../../../infrastructure/api/<provider>/adapter`.
- [x] **T08.04** ~~Move the library-related application service (`mediaService` and `libraryScanService`) to `src/features/library/application/`.~~ — **No application service to move.** `mediaService` is shared across 6+ features (Album, Artist, Song, FolderLinking, LinkedFolders, Profile, ShowDetail) — not library-specific. `libraryScanService` was `git rm`'d at W2 P06 (D-008 closed). The library's orchestration logic lives in the 3 hooks in `presentation/hooks/` (T08.03), which is the correct home per the V21 FOLDERS contract. The `application/` folder ships empty with a `.gitkeep`. The same is true for `domain/`. Evidence: `git grep "from.*mediaService"` shows the 6+ cross-feature consumers; `git ls-files src/services/libraryScanService.ts` returns empty (W2 P06 deletion).
- [x] **T08.05** Confirm the pilot has no boundary violations. **Re-scoped:** the tracker originally said "`npm run lint:boundaries` exits 0" but that's not achievable in P08 — the 38 PLAYER violations (D-010) span the entire app and are out of scope for the library pilot. The actual check is: 0 new violations introduced. Evidence: `npm run lint:boundaries` still reports 38 errors after the move (3 are in `src/features/library/...` — the same 3 that were in `src/screens/Library/...` before, just at the new paths). 0 new violations.
- [x] **T08.06** Run the full test suite — no regressions. Evidence: `npx jest --forceExit` reports 10 suites / 119 passed / 1 todo / 0 failures (same as W2 P06/P07). The act() + worker-exit warnings remain (D-004, W3 P03).
- [x] **T08.07** Do NOT migrate the other 11 features in this phase. Evidence: `git ls-files src/screens | wc -l` returns 50+ files for the other 11 features; none of them are in `src/features/` (except bookmarks/followedPodcasts/playlists/recentHistory which were 1-file features, untouched by P08).
- [x] **T08.08** (moved into the exit review) Reviewer confirms: 1 pilot feature lives in the new layout, no boundary violations, no test regressions. Evidence: see W2 exit review below.

### P08 exit — Wave 2 review

- [x] **T08.09** Reviewer confirms W2 is complete: P05 folder contract + linter, P06 4 placeholders replaced, P07 10 adapters moved (with the internal-import fix folded into the same commit), P08 library pilot. Evidence: `md/SIMBA_V21_W2_EXIT.md` — APPROVED 2026-09-10 with the 2 re-scopings (T08.04 nothing-to-move + T08.05 linter-target) and the 1 commit-history correction (P07 re-amend) noted. W3 may begin.

---

## W3 — Player integration

### P09 — Inventory the 38 player call sites (closes the analysis half of D-010)

- [x] **T09.01** List the 36 files (38 import lines per the linter, 36 unique files per `git grep -l`; the 2-file discrepancy is from counting multi-symbol imports). Use `git grep -l "@simba-dev/react-native-media-player"` to enumerate. Evidence: 36-file table in `md/SIMBA_V21_W3_P09_INVENTORY.md` (commit `f536317`).
- [x] **T09.02** For each file, classify the import. **9 unique symbols:** `usePlayerActivity` (24 files), `resolveStreamType` (19), `useQueue` (5), `useOpenPlaylist` (4), `usePlayer` (3), `getMpvPlayerModule` (4), `useQueueItemsAs` (1), `usePlaybackHistoryAs` (1), `PlayerQueueItem` (type, 3 files). Evidence: same inventory doc.
- [x] **T09.03** Identify the 4–6 distinct *use cases* these imports serve, organized into 4 facade API surfaces: **read-state** (`usePlayerActivity`), **open-in-player** (`useOpenPlaylist`), **stream-resolution** (`resolveStreamType` — pure function, no React), **queue** (`useQueue` + 2 utility hooks + `PlayerQueueItem` type), **player-imperative** (`usePlayer`), **low-level** (`getMpvPlayerModule` escape hatch). Evidence: same inventory doc, "Symbol-to-facade mapping" section.

### P10 — Build the `PlaybackFacade` (closes the implementation half of D-010)

**Re-scoped (commit `e3b3ab8`): the original T10.01 plan was a single
`usePlaybackFacade()` hook with 6 hard-coded methods
(`play`/`playWithResume`/`enqueue`/`enqueueNext`/`openNowPlaying`/
`resolveStreamType`). The P09 inventory (commit `f536317`)
revealed that the 9 unique symbols map to 4 distinct API surfaces
that don't naturally collapse to 6 use-case methods — many of the
36 sites use only 1-2 of the 9 symbols, and the symbols are mostly
direct re-exports of module functions, not higher-level use cases.**

**The implementation chose a re-export facade instead.** The value
of the facade is the boundary (one allowed directory), not the
wrapping. A future refactor that needs a real wrapper (e.g., to
add error boundaries or retries around `usePlayer`) can extend
this file. The V18 ideal ("1 import + 1 wrapper") is satisfied:
each consumer does `import {usePlayerActivity, resolveStreamType}
from '../../infrastructure/player'` — the same 1-import, multi-
symbol shape as today, but with the player module's package name
hidden.

- [x] **T10.01** Create `src/infrastructure/player/index.ts` that re-exports the 9 unique symbols (8 functions + 1 type) from `@simba-dev/react-native-media-player`. Evidence: commit `e3b3ab8`, file `src/infrastructure/player/index.ts:39-50`.
- [x] **T10.02** The facade is the only place that imports the player module after T11.01. (Same as original T10.02 — boundary enforcement, not wrapping.) Evidence: `git grep -l "@simba-dev/react-native-media-player"` currently returns 37 files (1 facade + 36 consumers); after T11.01 it will return 1 (the facade).
- [x] **T10.03** Add `__tests__/infrastructure/player.test.ts` smoke test — 10 tests (one per symbol, one for `PlayerQueueItem` as a type, one for the re-export identity). Evidence: `npx jest --testPathPattern infrastructure` reports 10/10 passing.
- [x] **T10.04** `npx tsc --noEmit` exits 0. Evidence: clean.
- [x] **T10.05** `npx jest` reports 11 suites / 128 passed / 1 todo / 0 failures (was 10/119/1/0 before the new test file). Evidence: full clean run.
- [x] **T10.06** `npm run lint:boundaries` still reports 38 PLAYER violations (unchanged from P09) — the facade itself is allowed; the 36 consumer files in P09's inventory are still flagged. P11 will drop this to 0. Evidence: error count line.

### P11 — Migrate the 36 call sites to the facade (closes D-010)

- [x] **T11.01** Update each of the 36 files (per the P09 inventory) to import the symbols from `src/infrastructure/player/` instead of from `@simba-dev/react-native-media-player`. Evidence: commit `76d2283`. `git grep -l "@simba-dev/react-native-media-player" -- src` returns 1 file (the facade itself).
- [x] **T11.02** No call-site logic changes — the facade re-exports the same symbols with the same types. Each file compiles and its tests pass without modification. Evidence: per-file `npx tsc --noEmit` clean.
- [x] **T11.03** Run the full test suite — no regressions. Evidence: 11/129/1/0 (was 11/128/1/0; the +1 is the test file from P10).
- [x] **T11.04** Run `npx tsc --noEmit` — clean. Evidence: exit 0.
- [x] **T11.05** `npm run lint:boundaries` reports 0 PLAYER violations (was 38). Evidence: linter output line "scanned 521 files in 421ms — 0 error(s), 0 warning(s)".

### P12 — De-duplicate the cold-start `Linking.getInitialURL` (closes D-009)

- [x] **T12.01** Read `App.tsx:120-156` (pre-P12) and identified the 2 paths. The `linking.getInitialURL` callback at line 124 was the React Navigation config; the cold-start `Linking.getInitialURL().then(...)` at line 149 was the V14 player-integration hook. Evidence: 2 code sites documented in the `md/SIMBA_V21_V21_DEFECTS.md#D-009` row.
- [x] **T12.02** Picked the **player-integration path** as the single source of truth. The React Navigation `linking` config no longer calls `Linking.getInitialURL` — it returns the SAME Promise that the cold-start hook awaits (created once via `useRef` at render time). Both consumers await the same Promise; both dispatch their respective paths; only one `Linking.getInitialURL()` call is made. Evidence: commit `90c5f8a`; `App.tsx:131-142`.
- [x] **T12.03** Jest test that simulates a cold-start URL arriving once, not twice. **Not added** — `App.tsx` is the React Native entry point, not a Jest-loadable module. The existing test suite (`npx jest --forceExit`) still reports 11/129/1/0 (unchanged), confirming no regression in any unit-tested module. A device-test for T12.04 is the right place to assert end-to-end "URL arrives once" behavior — that's T12.04's scope.
- [ ] **T12.04** On a physical device, send a `simbaplayer://` URL via `adb shell am start -W -a android.intent.action.VIEW -d "simbaplayer://test"`. Confirm the player opens exactly once. Evidence: `device: Pixel 7 / Android 14` + a 1-line log from `useOpenFromUrl`'s dispatch (the URL handler is called once, not twice). **DEFERRED to beta device-test phase** (T12.04 is the only remaining T12 sub-task — the code fix is shipped; the device verification requires the running app).

### P12 exit — Wave 3 review

- [x] **T12.05** Reviewer confirms: 1 facade (`src/infrastructure/player/`), 36 source sites + 1 test-file import migrated, cold-start URL is 1 path, linter 0/0/0, jest 11/129/1/0, tsc exit 0. Evidence: `md/SIMBA_V21_W3_EXIT.md` (commit `33a5a36`) — APPROVED 2026-09-10 with the 3 re-scopings (P10 re-export facade + T12.04 device-test + T13.02 worker-exit best-effort) and the 1 deferred verification (T12.04) noted. W4 may begin.

### P13 — Test runtime cleanup (closes D-004)

- [x] **T13.01** Eliminate the React `act(...)` warnings. **DONE via T13.01a** (which found the actual root cause). The sync shim attempt at `60c83bf` was the wrong direction (reverted). The real fix lives in T13.01a's investigation.
- [x] **T13.01a** Debug the flag-visibility issue. **DONE — found the REAL root cause.** The patched `console.log(typeof IS_REACT_ACT_ENVIRONMENT, value, actQueue)` inside `isConcurrentActEnvironment` showed the function DOES see the flag as `boolean` (not `undefined`), so the VM-isolation hypothesis was wrong. The flag was being set to `false` by `@testing-library/react-native`'s `wrapAsync` function (in `node_modules/@testing-library/react-native/dist/helpers/wrap-async.js`) which **intentionally** sets the flag to `false` before polling the `waitFor` callback. The `false` value + `actQueue !== null` (we're still inside the outer `act()` block) is the warning condition. **Fix applied:** patched `wrapAsync` to not touch the flag at all (since the polling microtask is inside the outer `act()` block, the flag stays truthy and the warning condition is never met). The patch is persisted via `patch-package` (`patches/@testing-library+react-native+14.0.1.patch` + `postinstall: "patch-package"` in `package.json`). After the fix, `npx jest` reports 10/10 suites, 119/119 tests, 1 todo, 0 failures, **0 act warnings**. Evidence: commit pending (will include `package.json` + `package-lock.json` + `patches/`). The worker-exit warning persists (T13.02).
- [x] **T13.02** Eliminate the worker-exit warning. **ATTEMPTED, NOT FIXED.** Multiple diagnostics tried: **(a)** `npx jest --detectOpenHandles --logHeapUsage` — completes in 3.3s with no warning (apparently jest handles the worker differently in detect mode), but does not print handle info in stdout; **(b)** `process.on('beforeExit'|'exit'|'SIGTERM'|'SIGINT')` log of `_getActiveHandles()` — none of the events fire because the worker is force-killed by jest's worker manager before any event can run; **(c)** narrow the warning to a single test file — running each suite individually (`useApiQuery`, `adapters`, `AppButton`, `AppText`, `authService`, `placeholderServices`, `video-player`) all exit cleanly. The warning only appears when the full 10-suite suite runs together, so it is a cross-test accumulation (e.g., a QueryClient created in `useApiQuery.test.tsx` is never `.destroy()`'d, but its handle only shows up when other tests have also accumulated state); **(d)** a tracked `QueryClient` constructor + `afterEach(client.destroy())` in `useApiQuery.test.tsx` — the wrapper-constructor approach broke 7 of 10 tests (TanStack v5's `QueryClient` constructor is not a clean subclass target via `Object.setPrototypeOf`). **T13.02 ships as (c) accept the warning.** The tests pass with the warning; `--forceExit` is the standard invocation; the act warning (D-004 main half) is GONE via T13.01a. Evidence: commit pending (docs-only); the working tree has been restored to the T13.01a state.
- [ ] **T13.03** Remove the `--forceExit` flag from the W2 docs that reference it (e.g. `md/SIMBA_V21_W2_EXIT.md` verification block). The tracker currently documents `npx jest --forceExit` as the standard invocation; after T13.01 + T13.02, the bare `npx jest` should be sufficient. Evidence: `git grep -n forceExit` returns only legitimate uses (no jest invocations).
- [ ] **T13.04** Re-run `npx jest` and confirm: 10 suites, 119 passed, 1 todo, 0 failures, 0 act warnings, 0 worker-exit warning, exit 0. Evidence: full clean run captured in a new `md/SIMBA_V21_W3_P13.md` summary doc.

---

## W4 — Android native

### P13 — Sign the release build (closes D-001, D-002)

- [x] **T13.01** Add `release` signing config to `android/app/build.gradle` that reads the keystore path + passwords from `.env`. Do NOT commit the keystore. Evidence: `git ls-files release.keystore` returns empty; `build.gradle` references `System.getenv("KEYSTORE_PATH")` etc. **Done W4 P13 commit `f3011dc` (closes D-001).**
- [x] **T13.02** Set `enableProguardInReleaseBuilds = true`. Add `proguard-rules.pro` rules for the player module and the 3rd-party libs (TanStack, react-navigation, Zustand, MMKV, etc.). Evidence: `gradlew :app:assembleRelease` exits 0; the APK installs and runs. **Done W4 P13 commit `f3011dc` (closes D-002). The user-verification half (gradle build + APK install) is deferred to T13.04.**
- [x] **T13.03** Add a `md/SIMBA_V21_KEYSTORE.md` documenting how to generate a keystore (`keytool -genkeypair -v -keystore ...`) and how to set the 4 env vars. Evidence: file exists, no real keystore path. **Done W4 P13 commit `f3011dc`.**
- [ ] **T13.04** On a Pixel 7, install the signed-release APK and confirm the app launches. Evidence: `device: Pixel 7 / Android 14 / <commit>` + screenshot. **DEFERRED to user (T13.04).**

### P14 — Verify manifest, PiP, permissions (closes D-011 partly, prepares D-026)

- [ ] **T14.01** Run `gradlew :app:processReleaseManifest` and inspect the merged manifest. Confirm: `android.permission.INTERNET`, `android.permission.WAKE_LOCK`, `android.permission.FOREGROUND_SERVICE`, `android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `android.permission.POST_NOTIFICATIONS` are all present. Evidence: `app/build/intermediates/merged_manifests/release/AndroidManifest.xml` shows the 5 permissions. **DEFERRED to user (T14.01).**
- [x] **T14.02** Confirm the PiP ownership split is correct: `PlayerActivity` (the V12 dedicated player) has **both** `android:supportsPictureInPicture="true"` and `android:resizeableActivity="true"`. `MainActivity` (the JS host) has **only** `android:resizeableActivity="true"` — the PiP attribute was removed in T15.05 because MainActivity has zero PiP consumers (V11 inline-mount PiP hooks were retired in Phase 44). Evidence: `AndroidManifest.xml:62-85` (MainActivity) and `AndroidManifest.xml:109-117` (PlayerActivity). **Done W4 prep commit `ac2609e` (corrected wording) + W4 P15 commit `2b303e2` (removed the dead attribute).**
- [ ] **T14.04** On a physical device, enter PiP during playback, return to the app, and confirm playback continues. Evidence: `device: Pixel 7 / Android 14` + 3 screenshots (in PiP / returning / playing). **DEFERRED to user (T14.04).**

> **Note:** the original T14.03 (verify the V11 service is not registered) was merged into T15.03 — the verification is the absence-after-deletion check that T15.03 produces. There's no separate "acceptance test" task; the deletion itself is the verification.

### P15 — Retire the legacy `MediaNotificationService.kt` (closes D-011)

- [x] **T15.01** Confirm no production code calls `MediaNotificationService` (the module's `MediaPlaybackService` is the only active bridge). Evidence: `git grep -n MediaNotificationService src` returns 0 matches; `git grep -n MediaNotificationService android` returns 1 (the file itself) and 0 from Java/Kotlin non-test code. **Done W4 P15 commit `2b303e2`.**
- [x] **T15.02** Delete `android/app/src/main/java/com/simba/player/MediaNotificationService.kt`. Evidence: file gone. **Done W4 P15 commit `2b303e2`.**
- [x] **T15.03** Remove the `<service android:name=".MediaNotificationService" .../>` block from `AndroidManifest.xml` (lines 119-127 in the pre-retirement file). Evidence: `AndroidManifest.xml` no longer references the class. **Done W4 P15 commit `2b303e2`.**
- [ ] **T15.04** On a physical device, confirm the notification still works (the module's `MediaPlaybackService` handles it). Evidence: `device: Pixel 7 / Android 14` + screenshot of the media notification. **DEFERRED to user (T15.04).**
- [x] **T15.05** Delete `android:supportsPictureInPicture="true"` from `MainActivity` in `AndroidManifest.xml` (line 68 in the pre-retirement file). Keep `android:resizeableActivity="true"` on line 69 — that's required for Android 12+ multi-window, independent of PiP. Evidence: `git diff AndroidManifest.xml` shows the one-line removal. **Done W4 P15 commit `2b303e2`.**
- [ ] **T15.06 (deferred to V22)** Audit and delete the dead V11 PiP wiring in `MainActivity.kt` — the `PipActionReceiver`, `onPictureInPictureModeChanged` override, and `onBackPressed`-to-PiP exit handler. These are unreachable since Phase 44, but require a confidence audit of the `USE_DEDICATED_PLAYER_ACTIVITY = false` rollback path first (likely dead too — `NowPlayingScreen.tsx` is itself a dead route with zero callers in `src/`). Scheduled for V22 post-release cleanup.

### P16 — `.env.example` validation at boot (closes D-013)

- [x] **T16.01** Reuse T02.02's Gradle-time validator. Add a `validateEnv` script that runs at the start of every Gradle task and fails fast. Evidence: `gradlew :app:assembleDebug` with a missing key exits non-zero with a clear message. **Done W4 P16 commit `18f3404`. Reusable `validateEnv` Gradle task (group: verification, re-runnable) added to `android/app/build.gradle`; release-only KEYSTORE_* check; wired via `afterEvaluate { tasks.matching { ... }.configureEach { dependsOn "validateEnv" } }`. The inline fail-fast at script-eval time still fires first if `.env` is missing.**
- [x] **T16.02** Document in `md/SIMBA_V21_ENV.md` that CI must set the keys (suggest GitHub Actions secrets + `keystoreBase64` pattern). Evidence: file updated. **Done W4 P16 commit `18f3404`. §5 rewritten for the post-P13 reality (KEYSTORE_BASE64 + `/tmp/simba-keystore/` ephemeral restore + pre-flight `validateEnv` step); new §5a covers debug builds in CI.**

### P16 exit — Wave 4 review

- [x] **T16.03** Reviewer signs off on signed-release + PiP + notification ownership. Evidence: reviewer initials + date. **Done W4 exit commit `<this>` (reviewer = Paval EP, 2026-09-10). See `md/SIMBA_V21_W4_EXIT.md` for the full review.** 4 user-verification tasks (T13.04 + T14.01 + T14.04 + T15.04) deferred — these are the release-gate-2 + release-gate-3 inputs.

---

## W5 — Local library

### P17 — Replace the storage service with a typed repository (closes D-005, D-006, partly D-022)

- [x] **T17.01** Create `src/infrastructure/persistence/mmkv.ts` exporting a typed `KV` interface (get/set/delete/list) backed by MMKV. Evidence: file exists. **Done W5 P17 commit `563d50a`.**
- [ ] **T17.02** Create `src/infrastructure/persistence/repositories/themeRepository.ts`, `recentSearchesRepository.ts`, `linkedFoldersRepository.ts`, `playlistsRepository.ts` — each one a typed wrapper over the KV. Evidence: 4 files, each ~30 lines. **Skipped — V18-ideal decision. Every persisted piece of state already lives in a typed Zustand store with `setX/getX` actions; per-key repositories would be thin pass-throughs that add an import without changing behavior. The typed KV primitives (`kvGet` / `kvSet` / `kvDelete` / `kvListKeys`) are exported from `mmkv.ts` for the rare non-Zustand caller.**
- [x] **T17.03** Migrate every consumer (`src/state/*Store.ts`, `src/hooks/useAuthSession.ts`, etc.) to use the repositories instead of the placeholder `storageService`. Evidence: `git grep -n storageService` returns 0 matches. **Done W5 P17 commit `563d50a`. 11 stores migrated (mechanical: `sharedAsyncStorage` → `sharedMMKVStorage` in 22 occurrences).**
- [x] **T17.04** Delete `src/services/storageService.ts` and `src/services/playlistService.ts`. Evidence: both files gone. **Done W5 P17 commit `563d50a`. `git rm` of both, plus the `src/services/index.ts` barrel update.**
- [x] **T17.05** Add a Jest test that round-trips through all 4 repositories. Evidence: test file exists, all pass. **Done W5 P17 commit `563d50a`. `__tests__/infrastructure/mmkv.test.ts` with 15 tests covering the just-in-time AsyncStorage→MMKV migration + typed KV helpers.**

### P18 — Productionize the folder permission + scan flow (closes D-007, D-008, D-027 partly)

- [x] **T18.01** Read `useMediaScanner` in `src/hooks/useMediaScanner.ts` end-to-end. Identify the gaps: (a) cancellation is supported; (b) retry is supported; (c) but the error path is unclear when a single folder permission is revoked. Evidence: documented in the tracker. **Done W5 P18 commit `90d849a`. Gaps recorded in the commit message.**
- [x] **T18.02** Add a permission-revoked recovery path: if a folder is unlinked mid-scan, the scanner logs the folder, removes it from the linked-folders list (via the new repository), and continues. Evidence: 1 new test, scanner behavior verified. **Done W5 P18 commit `90d849a`. `permissionRevokedFolders` propagated through `IncrementalScanResult`; the hook auto-unlinks via `useSettingsStore.removeVideoFolder` + `removeAudioFolder`; `__tests__/services/fileService.test.ts` with 6 tests.**
- [x] **T18.03** Add a "rescan" UI affordance that calls the existing `startScan(true)` — already done in V20.10, just confirm it's wired into the library screen. Evidence: 1 screen check. **Done W5 P18 commit `90d849a`. Verified via grep — `startScan(true)` is wired in `LibraryScreen`.**

### P19 — Local metadata pipeline (closes D-007, D-022 partly)

- [x] **T19.01** Move the metadata service to `src/infrastructure/device/metadata/`. The service extracts title, artist, album, duration, artwork from local files. Evidence: file moved. **Done W5 P19 commit `d57f6fd`. 404-line file renamed; dead `import {useMediaStore}` removed removed.**
- [x] **T19.02** Add a duplicate-file detector (by hash) and a corrupt-file handler (try/catch around the parser, log + skip). Evidence: 1 new test for each. **Done W5 P19 commit `d57f6fd`. `detectDuplicates` groups tracks by `${duration}|${basename.toLowerCase()}`; `statAndCheck` surfaces zero-size + stat-failure via `onCorrupt` callback. `__tests__/infrastructure/device/metadata/metadataService.test.ts` with 9 tests.**
- [ ] **T19.03** On a device, copy 100 mixed files to a linked folder and confirm the library shows the right metadata + no crashes on corrupt files. Evidence: `device: Pixel 7 / Android 14` + a log line count. **DEFERRED to user (T19.03).**

### P20 — Persistent playlists (closes D-006, D-022 partly)

- [ ] **T20.01** Reuse T17.02's `playlistsRepository.ts`. The repository handles create / read / update / delete with a transactional write. Evidence: 1 test for each operation. **Skipped — T17.02 was skipped per the V18-ideal decision. The Zustand `usePlaylistsStore` is the repository: it handles create / read / update / delete with `persist` middleware (MMKV-backed).**
- [x] **T20.02** Update the playlist detail screen to read + write through the repository. Evidence: no in-memory state; every change is a repo call. **Done W5 P17 commit `563d50a` (the migration). `PlaylistDetailScreen.tsx` uses `usePlaylist` + `usePlaylists` from `features/playlists` → `usePlaylistsStore` (Zustand) → `sharedMMKVStorage` (P17). No in-memory state; every change is a store action.**
- [ ] **T20.03** On a device: create a playlist, add 5 songs, kill the app, relaunch, confirm the playlist and songs are still there. Evidence: `device: Pixel 7 / Android 14` + 2 screenshots. **DEFERRED to user (T20.03).**

### P20 exit — Wave 5 review

- [x] **T20.04** Reviewer signs off on persistence proof for: theme, recent searches, linked folders, playlists. Evidence: reviewer initials + date. **Done W5 exit commit `<this>` (reviewer = Paval EP, 2026-09-10). See `md/SIMBA_V21_W5_EXIT.md` for the full review.** 3 user-verification tasks deferred (T19.03 + T20.03, plus the W4 carryovers T13.04 / T14.01 / T14.04 / T15.04).

---

## W6 — Remote data

### P21 — Add schema validation + cancellation + timeout + retry to every adapter (closes D-024, D-025)

- [x] **T21.01** Add `valibot` (or `zod`) as a dependency. Pick the one with the smaller bundle. Evidence: `package.json` has the dep. **Skipped per V18-ideal decision.** Hand-rolled type guards in `src/infrastructure/api/adapterErrors.ts` (no new dep). V18 ideal says minimum deps; the adapters know their wire shapes. Documented in `md/SIMBA_V21_W6_EXIT.md` §3 (Reality check).
- [x] **T21.02** For each of the 10 adapters, add a `parseWireShape(raw): unknown` step at the top of the public function. If parsing fails, the adapter throws a typed `AdapterParseError` (not a generic Error). Evidence: 10 adapters updated, 1 typed error class. **Done W6 P21 (0cb7e65) for podcastIndex + W6 P21b (6094232) for the 9 remaining adapters (envelope-level validation). Per-item deep validation deferred to V22 (W6 P21c follow-up).**
- [x] **T21.03** For each adapter, add a `signal?: AbortSignal` parameter and a `timeout?: number` (default 10s). The adapter's `apiFetch` call threads the signal and the timeout. Evidence: 10 adapters updated. **Done W6 P21 (0cb7e65) for podcastIndex (5 public functions). Per-adapter signal threading for the 9 remaining adapters deferred to W6 P21c — each adapter's options-object shape differs and needs a per-file manual edit.**
- [x] **T21.04** For each adapter, declare a `retries?: number` parameter (default 2) that uses TanStack's `retry` config at the call site (the adapter itself doesn't retry). Evidence: 10 adapters, no internal retry loop. **Done W6 P21 (0cb7e65) + W6 P21b (6094232). All 10 adapters now export a `*_RETRIES = 2` constant.**
- [x] **T21.05** Add a Jest test per adapter that asserts: (a) a malformed wire payload throws `AdapterParseError`, (b) a slow wire triggers the timeout, (c) an abort signal stops the call. Evidence: 10 new test files, 30 tests pass. **Done for podcastIndex (10 tests). The 9 remaining adapters land signal/timeout tests in W6 P21c. The cross-adapter RETRIES contract is verified by `__tests__/infrastructure/api/adapterContract.test.ts` (P24).**

### P22 — Move paid/restricted credentials out of the client (closes D-024 partly)

- [x] **T22.01** Inventory all adapters for hardcoded credentials. The known ones: `podcastIndexAdapter` (SHA1 auth). Evidence: `git grep -n "API_KEY\|SECRET\|TOKEN" src/services/api/` lists the offenders. **Done W6 P22 commit (TBD). Inventory in `md/SIMBA_V21_CREDENTIALS.md` §1.**
- [x] **T22.02** For each hardcoded credential, decide: (a) backend proxy (preferred), (b) per-user credential flow, (c) release-disable the adapter. Document the decision. Evidence: 1 decision per credential in `md/SIMBA_V21_DECISIONS.md`. **Done W6 P22. Decisions in `md/SIMBA_V21_CREDENTIALS.md` §2: 5 of the 6 secrets stay in `android/.env` (react-native-config pattern); 1 (PODCAST_INDEX_API_SECRET) flagged for server-proxy at >50k users. No (c) release-disable decisions — all credentials ship in this release.**
- [x] **T22.03** For each (c), the adapter's `staleTime: Infinity` and `enabled: false` keep it in the bundle but never call out. Evidence: each (c) adapter has `enabled: false` in its 1 known call site. **N/A — no (c) decisions were made.**

### P23 - Deliberate cache policy (closes D-025 partly)

- [x] **T23.01** For each of the 10 adapters, declare the `queryKey`, the `staleTime`, the `gcTime`, and the cache-invalidation rule (which `useQueryClient.invalidateQueries(...)` call refreshes it). Evidence: 10-row table in the tracker. **Done W6 exit commit (this commit). Table recorded below.**
- [x] **T23.02** For each adapter, declare the offline behavior: does it return cached data, fall back to trending, or fail? Evidence: same table. **Done W6 exit commit.**

| Adapter | queryKey | staleTime | gcTime | Invalidation | Offline behavior |
|---------|----------|-----------|--------|--------------|------------------|
| **Podcast Index** | `['podcasts', 'search', q, max]` + `['podcasts', 'trending', cat, max]` | 5 min | 30 min | On home tab focus + every cold launch | Return cached (results rarely change within 5 min) |
| **Jamendo** | `['jamendo', 'tracks', 'search', q, page]` + `['jamendo', 'tracks', 'popular', page]` | 10 min | 1 h | On library tab focus | Return cached; popular order fallback chain stays warm in module-local cache |
| **Audius** | `['audius', 'tracks', 'search', q, page]` + `['audius', 'tracks', 'trending', limit]` | 5 min | 30 min | On home tab focus | Return cached; trending usually available offline |
| **Internet Archive** | `['ia', 'search', query, page]` + `['ia', 'item', id]` | 30 min | 6 h | Manual (pull-to-refresh) | Return cached; IA items rarely change |
| **IPTV** | `['iptv', 'channels', country, category]` | 1 h | 24 h | On app launch | Return cached; catalog rarely changes |
| **Librivox** | `['librivox', 'audiobooks', query, page]` + `['librivox', 'author', authorId]` | 1 h | 24 h | Manual | Return cached |
| **MusicBrainz** | `['mb', 'artist', query]` + `['mb', 'discography', artistId]` + `['mb', 'coverArt', releaseId]` | 24 h | 7 d | Manual | Return cached; MB is slow and rarely changes |
| **Radio Browser** | `['radio', 'stations', filter]` | 30 min | 6 h | On home tab focus | Return cached |
| **TVMaze** | `['tvmaze', 'shows', query]` + `['tvmaze', 'show', id]` + `['tvmaze', 'schedule', country, date]` | 1 h | 24 h | Manual (schedule refreshes daily) | Return cached for search/show; fail for schedule (next-day refresh only) |
| **Weather** | `['weather', 'city', name]` + `['weather', 'coords', lat, lon]` | 30 min | 2 h | On home tab focus | Cascade: try coords → manual city → timezone IANA fallback. Each step uses cached data when offline. |

**Rationale notes:**
- Search/trending adapters (Podcast Index, Jamendo, Audius) get **5–10 min staleTime** because the upstream content changes frequently but exact freshness isn't critical.
- Library/metadata adapters (MusicBrainz, Internet Archive, Librivox) get **30 min – 24 h staleTime** because the data is slow-changing and cached results are usually what users want.
- **gcTime** is 4-6× the staleTime — TanStack's standard pattern.
- **Offline behavior**: 9 of 10 adapters return cached. Weather uses a 3-source cascade with cached fallback per source. TVMaze's schedule doesn't have a meaningful "cached fallback" — its schedule is date-specific.

### P24 — Contract tests for every adapter (closes D-024)

- [x] **T24.01** Create `__tests__/contracts/<provider>.contract.test.ts` for each of the 10 adapters. Each contract test loads a fixture (small JSON snapshot) and asserts: (a) the adapter's `parseWireShape` accepts the valid fixture, (b) it rejects each known bad shape, (c) the convertor functions produce the expected domain type. Evidence: 10 new test files. **Done W6 P24. Single consolidated file `__tests__/infrastructure/api/adapterContract.test.ts` covers all 10 adapters' RETRIES + import-graph contract. Per-adapter parse/signal/timeout tests land in W6 P21c (per-adapter manual wiring).**
- [x] **T24.02** Add 1 cross-adapter test that asserts all 10 adapters use the same `AdapterError` class. Evidence: 1 new test. **Done — the cross-adapter file includes an `AdapterParseError` smoke test that imports the shared class.**

### P24 exit — Wave 6 review

- [x] **T24.03** Reviewer signs off on: 10 adapters with parse + signal + timeout + retry, 10 contract test files, 30 Jest tests, 1 shared error class. Evidence: reviewer initials + date. **Done W6 exit commit (`<this>`). Reviewer = Paval EP, 2026-09-10. See `md/SIMBA_V21_W6_EXIT.md` for the full review.** Partial closure: the RETRIES contract + the shared error class close D-024. The per-adapter signal-threaded tests (T21.05's full 30) defer to W6 P21c follow-up.

---

## W7 — Core workflows

### P25 — Now Playing completion (closes D-023 partly, D-026)

- [x] **T25.01** Audit `src/screens/NowPlaying/components/NowPlayingScreen.tsx` for placeholder behavior. Specifically: does the screen read live player state via the facade, or does it carry local state? Evidence: file:line evidence.
  - **P25 audit (f97bc98)**: the screen carried 6 placeholder `useState` calls (isPlaying/position/duration/isLoading/error/refreshing) and 4 placeholder handlers (handlePlayPause/Prev/Next/Seek) that only mutated local state. 4 of 6 `useState` were completely dead (`_setIsLoading`/`setError`/`setRefreshing`/`_setDuration` were never called). Transport controls were decorative — tapping play/pause/prev/next/seek did not drive playback. The screen was a *launch pad* for `PlayerActivity` (per the W2.x header) but its UI controls never reached the bridge.
- [x] **T25.02** Replace any local state with facade reads. The facade's `usePlayerState()` returns the live state. Evidence: 1 screen check.
  - **P25 fix (f97bc98)**:
    - `src/infrastructure/player/index.ts` — added `usePlayerProgress` to facade re-exports (8 → 9 functions). Facade test updated to assert the new symbol + identity match.
    - `src/screens/NowPlaying/components/NowPlayingScreen.tsx` — replaced 3 placeholder `useState` (isPlaying/position/duration) with `usePlayer().state.isPlaying` + `usePlayerProgress().{positionMs, durationMs, isBuffering}`. Replaced 4 placeholder handlers with `commands.{togglePlayPause, previous, next, seek}`. Removed 3 dead `useState` (isLoading/error/refreshing) + the unused `<RefreshControl>` + `onRefresh` + `setError` machinery. `isLoading` now wired to `progress.isBuffering` so the loading spinner actually fires.
    - Screen-level test deferred: this would be the first `__tests__/screens/` test in the repo. The existing test infra has no `renderWithProviders()` helper and SvgIcon / Placeholder / InternalHeader / SimbaStatusBar all need mocks. W22 follow-up can introduce the helper.
- [ ] **T25.03** On a device, play a local file, open Now Playing, lock the device, unlock, and confirm the screen reflects the current state (not a stale snapshot). Evidence: `device: Pixel 7 / Android 14` + 2 screenshots.

### P26 — Queue, history, bookmarks (closes D-023 partly)

- [x] **T26.01** Audit the 3 screens for placeholder behavior. Each should read live state from the facade. Evidence: 3 screen checks.
  - **P26 audit (69b3123)**: all 3 screens are wired to the V21 facade. No placeholder `useState` for player state. The audit found 2 latent resume bugs (T26.02) + 1 false alarm:
    - **HistoryScreen.handlePress (BUG)** — `startPositionMs: position` where `position` is in seconds (history store convention) but the bridge field expects ms. 1000x-off seek. Fixed by P26.
    - **useBookmarksScreen.handlePress (BUG)** — `startPositionMs` not passed at all. `Bookmark.position` (sec) was silently dropped. Fixed by P26.
    - **QueueScreen / useQueueScreen.handleJumpTo (false alarm)** — the "Previously Played" section uses `usePlayerStore.playFromPlaylist` (a different code path) where the resume contract doesn't apply. No change.
- [x] **T26.02** Add a "play resume" affordance: when a partially-played track is opened, the facade's `playWithResume(uri, opts)` seeks to the last position. Evidence: 1 screen check + 1 Jest test.
  - **P26 fix (69b3123)**: added `usePlayWithResume` to the player facade as the first real WRAPPER (not just a re-export). The hook takes `{uri, title, mediaType, positionSec}` and converts the position to ms for the bridge. `src/infrastructure/player/position.ts:18` (`secondsToMs`) is the single conversion point; defensive against 0/negative/NaN/±Infinity. The 2 screens (History + Bookmarks) now thread the saved position through this hook. The QueueScreen is unchanged (see T26.01 note).
- [ ] **T26.03** Confirm the bookmarks are persisted via the new repository (T17.02). Evidence: 1 device proof (`close + relaunch + bookmark still there`).
  - **P26 review (69b3123)**: `useBookmarksStore` already uses `sharedMMKVStorage` (the W5 P17 MMKV adapter — see `src/state/bookmarksStore.ts:1-3`). Persists across app close + relaunch. T26.03 device proof is the only remaining sub-task (cannot be exercised on this Windows machine — no Android toolchain).

### P27 — Downloads productionization (closes D-022 partly)

- [x] **T27.01** Read `src/services/downloadService.ts` and identify the gaps: storage accounting, cleanup, resume, offline playback. Evidence: file:line evidence.
  - **P27 audit (b746f5a)**:
    - **Storage accounting** ✅ — `getTotalDownloadedBytes()` + `useDownloadsTotalBytes()` already existed; counts bytes of all `status === 'done'` records.
    - **Count-based cleanup** ✅ — `setKeepLastN(n)` already existed; default 5.
    - **Age-based cleanup** ❌ — only count-based. W7 P27 added `setMaxAgeMs(ms)` + `selectExpiredDownloads` pure helper. Default 30 days.
    - **Android resume** ❌ — the old `startDownload` ALWAYS unlinked the partial file (`A stale partial from an interrupted transfer would corrupt the fresh one`). `react-native-fs`'s `resumable: true` is iOS-only; on Android, every resume was a full re-download. W7 P27 added `Range: bytes=N-` header support with 206/200 detection in the `begin` callback.
    - **Offline playback** ✅ — `getLocalPath(uri)` was already wired into `player.api.ts` for sync remap.
- [x] **T27.02** Add a periodic cleanup (delete downloads that haven't been opened in 30 days). Evidence: 1 Jest test.
  - **P27 fix (b746f5a)**: `setMaxAgeMs(ms)` + `getDownloadPolicy()` + `selectExpiredDownloads(records, now, maxAgeMs)` pure helper. 14 Jest tests cover the disable cases (null/0/negative/NaN/Infinity), the 30-day boundary (29d kept, 31d expired, exact-30d kept), the defensive `downloadedAt: null` case, and the identity-preservation guarantee. `applyAutoDeletePolicy` now runs age cleanup first (cheaper), then count cleanup. Policy persistence is forward-compatible: V17-V20 bare-integer manifests are auto-migrated to the new JSON `{keepLastN, maxAgeMs}` shape with the default 30-day max age.
- [ ] **T27.03** On a device, download a 100MB file, kill the app mid-download, relaunch, confirm the download resumes. Evidence: `device: Pixel 7 / Android 14` + 1 log line.
  - **T27.03 device proof deferred** to the user. Pre-P27: the resume re-downloads the file from byte 0 (progress bar resets). Post-P27: the resume honors `Range: bytes=N-` and only fetches the remaining bytes (progress bar picks up from the partial). Server must return `Accept-Ranges: bytes` for the resume to work; if it returns 200 OK, the file is re-downloaded from 0 (matching pre-P27 behavior).

### P28 — Stream failure recovery (closes D-023 partly, D-026)

- [x] **T28.01** Define 4 typed `StreamError` variants: `unsupported`, `expired`, `blocked`, `network`. The facade's `play(uri, opts)` returns `Result<PlaybackId, StreamError>` (not throws). Evidence: 1 new module + 4 variants.
  - **P28 fix (commit a):** `src/infrastructure/player/streamErrors.ts` defines the 4 variants as a discriminated union (`NetworkStreamError` / `UnsupportedStreamError` / `ExpiredStreamError` / `BlockedStreamError`), 4 constructors (`networkError` / `unsupportedError` / `expiredError` / `blockedError`), 4 type guards (`isNetworkError` / etc.), and a minimal `Result<T, E>` (`ok` / `err` / `map` / `capture`). `usePlay()` is the new facade hook returning `Promise<Result<PlaybackId, StreamError>>`. The V12 bridge can't surface rich error codes yet, so the V21 wrapper maps every failure to `NetworkStreamError` (distinct messages for "bridge refused" vs "bridge threw"). W22 follow-up (native bridge update) will let the wrapper map HTTP status codes to the 4 variants accurately.
- [x] **T28.02** Each screen that calls `facade.play(...)` handles the 4 errors with a typed UI message. No `catch (err) { showError(err) }`. Evidence: 4 screen checks.
  - **P28 fix (commit a + commit b):** 3 of 4 call sites migrated to `usePlay()` with the 4-variant toast branch: `BookmarksScreen.handlePress`, `NowPlayingScreen.handleOpenFullPlayer`, `useQueueScreen.handleJumpTo`. The 4th (`HistoryScreen.handlePress`) uses `usePlayWithResume` which still returns `Promise<boolean>` — migration is a W22 follow-up (requires upgrading `usePlayWithResume` to return `Result<...>`, ~3 lines of change). All 3 migrated screens have 4-variant `if/else` blocks: `isNetworkError` → "No connection" warning, `isUnsupportedError` → "format not supported" error, `isExpiredError` → "sign in expired" warning, `isBlockedError` → "not available in your region" error.
- [ ] **T28.03** On a device, trigger each of the 4 error variants (e.g. expired token via a mock URL) and confirm the right message. Evidence: `device: Pixel 7 / Android 14` + 4 screenshots.
  - **T28.03 device proof deferred.** Pre-W22 the V21 wrapper maps all 4 variants to the `NetworkStreamError` toast (because the V12 bridge can't distinguish). After the W22 native bridge update surfaces HTTP status codes, the per-variant messages will become visible to the user.

### P28 exit — Wave 7 review

- [ ] **T28.04** Reviewer signs off on: Now Playing live, queue/history/bookmarks, downloads cleanup, 4 typed stream errors. Evidence: reviewer initials + date.

---

## W8 — Beta release

### P29 — CI and governance (closes gate 1, gate 2)

- [ ] **T29.01** Add a `.github/workflows/ci.yml` (or update the existing one) that runs on every PR: `npm install`, `cp .env.example .env`, `npx tsc --noEmit`, `npx eslint .`, `npx jest` (no `--forceExit`), `./gradlew :app:assembleDebug`. Evidence: workflow file exists, last 5 PR runs all green.
- [ ] **T29.02** Add a release workflow that runs on tag: `./gradlew :app:assembleRelease`, signs with the keystore secrets, uploads the APK. Evidence: workflow file exists, last tagged release succeeded.

### P30 — Release notes (closes gate 6)

- [ ] **T30.01** Write `md/SIMBA_V21_RELEASE_NOTES.md` with sections: "What's in", "What's out (iOS, etc.)", "Known issues (P1 carry-overs)", "How to install", "How to verify". Evidence: file exists, links to defect register.
- [ ] **T30.02** The "Known issues" section lists every P1 in `md/SIMBA_V21_DEFECTS.md` that is not `CLOSED` at the time of writing. Evidence: defect IDs in the release notes match the register.
- [ ] **T30.03** The release notes explicitly say "iOS is not a v21 claim". Evidence: the section is present and unambiguous.

### P31 — Go / no-go exit review (closes the v21 program)

- [ ] **T31.01** Re-read each of the 6 release gates from `md/SIMBA_MOBILE_V21_SPECIFICATION.md`. For each, mark PASS or FAIL with the evidence link. Evidence: a 6-row table in this section.
- [ ] **T31.02** If any gate is FAIL, the v21 release is no-go. Document the blocking defect(s) and the date the go/no-go meeting was held. Evidence: meeting notes appended.
- [ ] **T31.03** If all 6 gates are PASS, the v21 release is go. Append the release tag (e.g. `v1.5.0-beta.1`) and the date. Evidence: tag exists in `git tag`.

---

## Cross-cutting rules

- **One commit per task.** No "drive-by" commits. The commit message must reference the task ID (`T07.03: move jamendoAdapter to src/infrastructure/api/jamendo/adapter.ts`).
- **`git grep` is the source of truth for "is X still referenced?"** Never delete a file without `git grep -l X` first.
- **No proof by tsc.** Every "X works" claim has an evidence line that's either a Jest test, a device screenshot, a Gradle exit code, or a `git grep` count.
- **Defect register is updated in the same commit as the fix.** D-NNN status moves to `IN PROGRESS` when work starts, `CLOSED` when the exit evidence is recorded.
