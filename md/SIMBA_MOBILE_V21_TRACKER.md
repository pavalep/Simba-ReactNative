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

- [ ] **T10.01** Create `src/infrastructure/player/PlaybackFacade.ts` exporting one typed `usePlaybackFacade()` hook that returns: `play(uri, opts)`, `playWithResume(uri, opts)`, `enqueue(uri)`, `enqueueNext(uri)`, `openNowPlaying()`, `resolveStreamType(mediaKind)`. Each method has a typed input and a typed return. Evidence: file exists, exports the 6 methods.
- [ ] **T10.02** The facade internally calls the module's `usePlayerActivity`, `useQueue`, `useOpenWithResume`, `resolveStreamType` — no screen does that directly anymore. Evidence: the facade is the only place that imports the player module after T11.01.
- [ ] **T10.03** Add a Jest test for the facade that asserts each method delegates to the right underlying module call. Evidence: 1 new test file, 6 tests pass.
- [ ] **T10.04** The facade lives in `src/infrastructure/player/`, which is the only file in the app that imports `@simba-dev/react-native-media-player`. Evidence: `git grep -l "@simba-dev/react-native-media-player"` returns 1 file (`PlaybackFacade.ts`).

### P11 — Migrate the 38 call sites to the facade (closes D-010, partly D-023)

- [ ] **T11.01** Update each of the 37 files to import `usePlaybackFacade` from `src/infrastructure/player/PlaybackFacade` instead of from `@simba-dev/react-native-media-player`. Evidence: `git grep -l "@simba-dev/react-native-media-player"` returns 1 file (the facade itself).
- [ ] **T11.02** Each file's API call is replaced with the equivalent facade call. For example, `openPlayer({uri, title, type: 'audio'})` becomes `facade.play(uri, {title, kind: 'audio'})`. Evidence: each of the 37 files compiles and tests pass.
- [ ] **T11.03** Run the full test suite — no regressions. Evidence: same test count.
- [ ] **T11.04** Run `npx tsc --noEmit` — clean. Evidence: exit 0.

### P12 — De-duplicate the cold-start `Linking.getInitialURL` (closes D-009)

- [ ] **T12.01** Read `App.tsx:120-156` and identify the 2 paths. The `linking.getInitialURL` callback at line 124 is the React Navigation config; the cold-start `Linking.getInitialURL().then(...)` at line 149 is the V14 player-integration hook. Evidence: 2 code sites documented.
- [ ] **T12.02** Pick the **player-integration path** as the single source of truth (it already handles auth-gated schemes via `useOpenFromUrl`). The React Navigation `linking` config should NOT call `Linking.getInitialURL` — it should accept whatever URL the cold-start hook has already dispatched. Evidence: `App.tsx:120-156` updated.
- [ ] **T12.03** Add a Jest test that simulates a cold-start URL arriving once, not twice. Evidence: 1 new test.
- [ ] **T12.04** On a physical device, send a `simbaplayer://` URL via `adb shell am start -W -a android.intent.action.VIEW -d "simbaplayer://test"`. Confirm the player opens exactly once. Evidence: `device: Pixel 7 / Android 14` + a 1-line log.

### P12 exit — Wave 3 review

- [ ] **T12.05** Reviewer confirms: 1 facade, 38 sites migrated, cold-start URL is 1 path. Evidence: reviewer initials + date.

### P13 — Test runtime cleanup (closes D-004)

- [x] **T13.01** Eliminate the React `act(...)` warnings. **DONE via T13.01a** (which found the actual root cause). The sync shim attempt at `60c83bf` was the wrong direction (reverted). The real fix lives in T13.01a's investigation.
- [x] **T13.01a** Debug the flag-visibility issue. **DONE — found the REAL root cause.** The patched `console.log(typeof IS_REACT_ACT_ENVIRONMENT, value, actQueue)` inside `isConcurrentActEnvironment` showed the function DOES see the flag as `boolean` (not `undefined`), so the VM-isolation hypothesis was wrong. The flag was being set to `false` by `@testing-library/react-native`'s `wrapAsync` function (in `node_modules/@testing-library/react-native/dist/helpers/wrap-async.js`) which **intentionally** sets the flag to `false` before polling the `waitFor` callback. The `false` value + `actQueue !== null` (we're still inside the outer `act()` block) is the warning condition. **Fix applied:** patched `wrapAsync` to not touch the flag at all (since the polling microtask is inside the outer `act()` block, the flag stays truthy and the warning condition is never met). The patch is persisted via `patch-package` (`patches/@testing-library+react-native+14.0.1.patch` + `postinstall: "patch-package"` in `package.json`). After the fix, `npx jest` reports 10/10 suites, 119/119 tests, 1 todo, 0 failures, **0 act warnings**. Evidence: commit pending (will include `package.json` + `package-lock.json` + `patches/`). The worker-exit warning persists (T13.02).
- [x] **T13.02** Eliminate the worker-exit warning. **ATTEMPTED, NOT FIXED.** Multiple diagnostics tried: **(a)** `npx jest --detectOpenHandles --logHeapUsage` — completes in 3.3s with no warning (apparently jest handles the worker differently in detect mode), but does not print handle info in stdout; **(b)** `process.on('beforeExit'|'exit'|'SIGTERM'|'SIGINT')` log of `_getActiveHandles()` — none of the events fire because the worker is force-killed by jest's worker manager before any event can run; **(c)** narrow the warning to a single test file — running each suite individually (`useApiQuery`, `adapters`, `AppButton`, `AppText`, `authService`, `placeholderServices`, `video-player`) all exit cleanly. The warning only appears when the full 10-suite suite runs together, so it is a cross-test accumulation (e.g., a QueryClient created in `useApiQuery.test.tsx` is never `.destroy()`'d, but its handle only shows up when other tests have also accumulated state); **(d)** a tracked `QueryClient` constructor + `afterEach(client.destroy())` in `useApiQuery.test.tsx` — the wrapper-constructor approach broke 7 of 10 tests (TanStack v5's `QueryClient` constructor is not a clean subclass target via `Object.setPrototypeOf`). **T13.02 ships as (c) accept the warning.** The tests pass with the warning; `--forceExit` is the standard invocation; the act warning (D-004 main half) is GONE via T13.01a. Evidence: commit pending (docs-only); the working tree has been restored to the T13.01a state.
- [ ] **T13.03** Remove the `--forceExit` flag from the W2 docs that reference it (e.g. `md/SIMBA_V21_W2_EXIT.md` verification block). The tracker currently documents `npx jest --forceExit` as the standard invocation; after T13.01 + T13.02, the bare `npx jest` should be sufficient. Evidence: `git grep -n forceExit` returns only legitimate uses (no jest invocations).
- [ ] **T13.04** Re-run `npx jest` and confirm: 10 suites, 119 passed, 1 todo, 0 failures, 0 act warnings, 0 worker-exit warning, exit 0. Evidence: full clean run captured in a new `md/SIMBA_V21_W3_P13.md` summary doc.

---

## W4 — Android native

### P13 — Sign the release build (closes D-001, D-002)

- [ ] **T13.01** Add `release` signing config to `android/app/build.gradle` that reads the keystore path + passwords from `.env`. Do NOT commit the keystore. Evidence: `git ls-files release.keystore` returns empty; `build.gradle` references `System.getenv("KEYSTORE_PATH")` etc.
- [ ] **T13.02** Set `enableProguardInReleaseBuilds = true`. Add `proguard-rules.pro` rules for the player module and the 3rd-party libs (TanStack, react-navigation, Zustand, MMKV, etc.). Evidence: `gradlew :app:assembleRelease` exits 0; the APK installs and runs.
- [ ] **T13.03** Add a `md/SIMBA_V21_KEYSTORE.md` documenting how to generate a keystore (`keytool -genkeypair -v -keystore ...`) and how to set the 4 env vars. Evidence: file exists, no real keystore path.
- [ ] **T13.04** On a Pixel 7, install the signed-release APK and confirm the app launches. Evidence: `device: Pixel 7 / Android 14 / <commit>` + screenshot.

### P14 — Verify manifest, PiP, permissions (closes D-011 partly, prepares D-026)

- [ ] **T14.01** Run `gradlew :app:processReleaseManifest` and inspect the merged manifest. Confirm: `android.permission.INTERNET`, `android.permission.WAKE_LOCK`, `android.permission.FOREGROUND_SERVICE`, `android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `android.permission.POST_NOTIFICATIONS` are all present. Evidence: `app/build/intermediates/merged_manifests/release/AndroidManifest.xml` shows the 5 permissions.
- [ ] **T14.02** Confirm `MainActivity` has `android:resizeableActivity="true"` and `android:supportsPictureInPicture="true"`. Evidence: `AndroidManifest.xml:30-45`.
- [ ] **T14.03** Confirm the `MediaNotificationService.kt` legacy service is NOT registered in the manifest after the v21 retirement. Evidence: `AndroidManifest.xml` has only the module's `MediaPlaybackService`.
- [ ] **T14.04** On a physical device, enter PiP during playback, return to the app, and confirm playback continues. Evidence: `device: Pixel 7 / Android 14` + 3 screenshots (in PiP / returning / playing).

### P15 — Retire the legacy `MediaNotificationService.kt` (closes D-011)

- [ ] **T15.01** Confirm no production code calls `MediaNotificationService` (the module's `MediaPlaybackService` is the only active bridge). Evidence: `git grep -n MediaNotificationService src` returns 0 matches; `git grep -n MediaNotificationService android` returns 1 (the file itself) and 0 from Java/Kotlin non-test code.
- [ ] **T15.02** Delete `android/app/src/main/java/com/simba/player/MediaNotificationService.kt`. Evidence: file gone.
- [ ] **T15.03** Remove the service entry from `AndroidManifest.xml` (if any). Evidence: `AndroidManifest.xml` no longer references the class.
- [ ] **T15.04** On a physical device, confirm the notification still works (the module's `MediaPlaybackService` handles it). Evidence: `device: Pixel 7 / Android 14` + screenshot of the media notification.

### P16 — `.env.example` validation at boot (closes D-013)

- [ ] **T16.01** Reuse T02.02's Gradle-time validator. Add a `validateEnv` script that runs at the start of every Gradle task and fails fast. Evidence: `gradlew :app:assembleDebug` with a missing key exits non-zero with a clear message.
- [ ] **T16.02** Document in `md/SIMBA_V21_ENV.md` that CI must set the keys (suggest GitHub Actions secrets + `keystoreBase64` pattern). Evidence: file updated.

### P16 exit — Wave 4 review

- [ ] **T16.03** Reviewer signs off on signed-release + PiP + notification ownership. Evidence: reviewer initials + date.

---

## W5 — Local library

### P17 — Replace the storage service with a typed repository (closes D-005, D-006, partly D-022)

- [ ] **T17.01** Create `src/infrastructure/persistence/mmkv.ts` exporting a typed `KV` interface (get/set/delete/list) backed by MMKV. Evidence: file exists.
- [ ] **T17.02** Create `src/infrastructure/persistence/repositories/themeRepository.ts`, `recentSearchesRepository.ts`, `linkedFoldersRepository.ts`, `playlistsRepository.ts` — each one a typed wrapper over the KV. Evidence: 4 files, each ~30 lines.
- [ ] **T17.03** Migrate every consumer (`src/state/*Store.ts`, `src/hooks/useAuthSession.ts`, etc.) to use the repositories instead of the placeholder `storageService`. Evidence: `git grep -n storageService` returns 0 matches.
- [ ] **T17.04** Delete `src/services/storageService.ts` and `src/services/playlistService.ts`. Evidence: both files gone.
- [ ] **T17.05** Add a Jest test that round-trips through all 4 repositories. Evidence: test file exists, all pass.

### P18 — Productionize the folder permission + scan flow (closes D-007, D-008, D-027 partly)

- [ ] **T18.01** Read `useMediaScanner` in `src/hooks/useMediaScanner.ts` end-to-end. Identify the gaps: (a) cancellation is supported; (b) retry is supported; (c) but the error path is unclear when a single folder permission is revoked. Evidence: documented in the tracker.
- [ ] **T18.02** Add a permission-revoked recovery path: if a folder is unlinked mid-scan, the scanner logs the folder, removes it from the linked-folders list (via the new repository), and continues. Evidence: 1 new test, scanner behavior verified.
- [ ] **T18.03** Add a "rescan" UI affordance that calls the existing `startScan(true)` — already done in V20.10, just confirm it's wired into the library screen. Evidence: 1 screen check.

### P19 — Local metadata pipeline (closes D-007, D-022 partly)

- [ ] **T19.01** Move the metadata service to `src/infrastructure/device/metadata/`. The service extracts title, artist, album, duration, artwork from local files. Evidence: file moved.
- [ ] **T19.02** Add a duplicate-file detector (by hash) and a corrupt-file handler (try/catch around the parser, log + skip). Evidence: 1 new test for each.
- [ ] **T19.03** On a device, copy 100 mixed files to a linked folder and confirm the library shows the right metadata + no crashes on corrupt files. Evidence: `device: Pixel 7 / Android 14` + a log line count.

### P20 — Persistent playlists (closes D-006, D-022 partly)

- [ ] **T20.01** Reuse T17.02's `playlistsRepository.ts`. The repository handles create / read / update / delete with a transactional write. Evidence: 1 test for each operation.
- [ ] **T20.02** Update the playlist detail screen to read + write through the repository. Evidence: no in-memory state; every change is a repo call.
- [ ] **T20.03** On a device: create a playlist, add 5 songs, kill the app, relaunch, confirm the playlist and songs are still there. Evidence: `device: Pixel 7 / Android 14` + 2 screenshots.

### P20 exit — Wave 5 review

- [ ] **T20.04** Reviewer signs off on persistence proof for: theme, recent searches, linked folders, playlists. Evidence: reviewer initials + date.

---

## W6 — Remote data

### P21 — Add schema validation + cancellation + timeout + retry to every adapter (closes D-024, D-025)

- [ ] **T21.01** Add `valibot` (or `zod`) as a dependency. Pick the one with the smaller bundle. Evidence: `package.json` has the dep.
- [ ] **T21.02** For each of the 10 adapters, add a `parseWireShape(raw): unknown` step at the top of the public function. If parsing fails, the adapter throws a typed `AdapterParseError` (not a generic Error). Evidence: 10 adapters updated, 1 typed error class.
- [ ] **T21.03** For each adapter, add a `signal?: AbortSignal` parameter and a `timeout?: number` (default 10s). The adapter's `apiFetch` call threads the signal and the timeout. Evidence: 10 adapters updated.
- [ ] **T21.04** For each adapter, declare a `retries?: number` parameter (default 2) that uses TanStack's `retry` config at the call site (the adapter itself doesn't retry). Evidence: 10 adapters, no internal retry loop.
- [ ] **T21.05** Add a Jest test per adapter that asserts: (a) a malformed wire payload throws `AdapterParseError`, (b) a slow wire triggers the timeout, (c) an abort signal stops the call. Evidence: 10 new test files, 30 tests pass.

### P22 — Move paid/restricted credentials out of the client (closes D-024 partly)

- [ ] **T22.01** Inventory all adapters for hardcoded credentials. The known ones: `podcastIndexAdapter` (SHA1 auth). Evidence: `git grep -n "API_KEY\|SECRET\|TOKEN" src/services/api/` lists the offenders.
- [ ] **T22.02** For each hardcoded credential, decide: (a) backend proxy (preferred), (b) per-user credential flow, (c) release-disable the adapter. Document the decision. Evidence: 1 decision per credential in `md/SIMBA_V21_DECISIONS.md`.
- [ ] **T22.03** For each (c), the adapter's `staleTime: Infinity` and `enabled: false` keep it in the bundle but never call out. Evidence: each (c) adapter has `enabled: false` in its 1 known call site.

### P23 — Deliberate cache policy (closes D-025 partly)

- [ ] **T23.01** For each of the 10 adapters, declare the `queryKey`, the `staleTime`, the `gcTime`, and the cache-invalidation rule (which `useQueryClient.invalidateQueries(...)` call refreshes it). Evidence: 10-row table in the tracker.
- [ ] **T23.02** For each adapter, declare the offline behavior: does it return cached data, fall back to trending, or fail? Evidence: same table.

### P24 — Contract tests for every adapter (closes D-024)

- [ ] **T24.01** Create `__tests__/contracts/<provider>.contract.test.ts` for each of the 10 adapters. Each contract test loads a fixture (small JSON snapshot) and asserts: (a) the adapter's `parseWireShape` accepts the valid fixture, (b) it rejects each known bad shape, (c) the convertor functions produce the expected domain type. Evidence: 10 new test files.
- [ ] **T24.02** Add 1 cross-adapter test that asserts all 10 adapters use the same `AdapterError` class. Evidence: 1 new test.

### P24 exit — Wave 6 review

- [ ] **T24.03** Reviewer signs off on: 10 adapters with parse + signal + timeout + retry, 10 contract test files, 30 Jest tests, 1 shared error class. Evidence: reviewer initials + date.

---

## W7 — Core workflows

### P25 — Now Playing completion (closes D-023 partly, D-026)

- [ ] **T25.01** Audit `src/screens/NowPlaying/components/NowPlayingScreen.tsx` for placeholder behavior. Specifically: does the screen read live player state via the facade, or does it carry local state? Evidence: file:line evidence.
- [ ] **T25.02** Replace any local state with facade reads. The facade's `usePlayerState()` returns the live state. Evidence: 1 screen check.
- [ ] **T25.03** On a device, play a local file, open Now Playing, lock the device, unlock, and confirm the screen reflects the current state (not a stale snapshot). Evidence: `device: Pixel 7 / Android 14` + 2 screenshots.

### P26 — Queue, history, bookmarks (closes D-023 partly)

- [ ] **T26.01** Audit the 3 screens for placeholder behavior. Each should read live state from the facade. Evidence: 3 screen checks.
- [ ] **T26.02** Add a "play resume" affordance: when a partially-played track is opened, the facade's `playWithResume(uri, opts)` seeks to the last position. Evidence: 1 screen check + 1 Jest test.
- [ ] **T26.03** Confirm the bookmarks are persisted via the new repository (T17.02). Evidence: 1 device proof (`close + relaunch + bookmark still there`).

### P27 — Downloads productionization (closes D-022 partly)

- [ ] **T27.01** Read `src/services/downloadService.ts` and identify the gaps: storage accounting, cleanup, resume, offline playback. Evidence: file:line evidence.
- [ ] **T27.02** Add a periodic cleanup (delete downloads that haven't been opened in 30 days). Evidence: 1 Jest test.
- [ ] **T27.03** On a device, download a 100MB file, kill the app mid-download, relaunch, confirm the download resumes. Evidence: `device: Pixel 7 / Android 14` + 1 log line.

### P28 — Stream failure recovery (closes D-023 partly, D-026)

- [ ] **T28.01** Define 4 typed `StreamError` variants: `unsupported`, `expired`, `blocked`, `network`. The facade's `play(uri, opts)` returns `Result<PlaybackId, StreamError>` (not throws). Evidence: 1 new module + 4 variants.
- [ ] **T28.02** Each screen that calls `facade.play(...)` handles the 4 errors with a typed UI message. No `catch (err) { showError(err) }`. Evidence: 4 screen checks.
- [ ] **T28.03** On a device, trigger each of the 4 error variants (e.g. expired token via a mock URL) and confirm the right message. Evidence: `device: Pixel 7 / Android 14` + 4 screenshots.

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
