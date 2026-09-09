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

- [ ] **T06.01** `src/services/storageService.ts:8,12,17,21,26,30` — replace each `// TODO` with a real MMKV or AsyncStorage call. The interface is already correct (theme, recent searches, linked folders); the implementation is what's missing. Evidence: each function returns the persisted value across a Jest test that does `await service.persistX(...)` then `await service.loadX()`.
- [ ] **T06.02** `src/services/playlistService.ts:7` — replace `// TODO: Load playlists from storage` with a real persistent read. Evidence: same pattern as T06.01.
- [ ] **T06.03** `src/services/mediaService.ts:5,10` — replace each `// TODO` with a real implementation. The library scan is already done by `useMediaScanner` in `src/hooks/useMediaScanner.ts`; the placeholder service can call that. Evidence: `mediaService.scanAll()` returns the same list as `useMediaScanner().scanHistory`.
- [ ] **T06.04** `src/services/libraryScanService.ts:9-13` — `scanFolder` returns `[]`. Replace with a call to the real scanner. Evidence: after replacement, `useLibraryScreen` reads the same list it reads via `useMediaStore`.
- [ ] **T06.05** Delete the now-redundant `libraryScanService.ts` (it duplicates `useMediaScanner` exactly). Evidence: file gone, no remaining imports.
- [ ] **T06.06** Add a Jest test file that round-trips through all 4 services (persist + reload). Evidence: 1 new test file, all tests pass.

### P07 — Move the 10 API adapters to `src/infrastructure/api/<provider>/` (closes D-022)

- [ ] **T07.01** List the 10 adapters: `jamendoAdapter`, `audiusAdapter`, `libriVoxAdapter`, `internetArchiveAdapter`, `iptvAdapter`, `musicBrainzAdapter`, `podcastIndexAdapter`, `radioBrowserAdapter`, `tvmazeAdapter`, `weatherAdapter`. Evidence: `Get-ChildItem src/services/api` returns 10 files.
- [ ] **T07.02** Create `src/infrastructure/api/<provider>/index.ts` for each provider with a re-export of the public functions. This is the bridge that lets consumers continue to import from the new path without a giant sed. Evidence: each `index.ts` re-exports the same surface.
- [ ] **T07.03** Move each `*.ts` from `src/services/api/` to `src/infrastructure/api/<provider>/adapter.ts` (the new home). No code change. Evidence: `git mv` for each.
- [ ] **T07.04** Update the 50+ import sites across the app. Use `git grep -l "from '.*services/api/"` to find them, then sed the path. Evidence: `git grep -l "services/api"` returns 0 matches after the change.
- [ ] **T07.05** Run `npx tsc --noEmit` — must exit 0. Evidence: clean.
- [ ] **T07.06** Run `npx jest` — all 10 adapter tests must pass without modification (the public surface didn't change). Evidence: test count is the same.

### P08 — Pilot the new vertical-slice structure on 1 feature (prepares the full migration, doesn't do it)

- [ ] **T08.01** Pick the **library** feature for the pilot (it's the largest and most-coupled, so any problems surface here). Evidence: documented in the tracker.
- [ ] **T08.02** Move `src/screens/Library/` → `src/features/library/presentation/screens/Library/`. The component / hook / provider subdirs move too. Evidence: `git mv` for each.
- [ ] **T08.03** Move `useLibraryScreen.ts`, `useAlbumEnrichment.ts`, `useArtistEnrichment.ts` to `src/features/library/presentation/hooks/`. Evidence: same.
- [ ] **T08.04** Move the library-related application service (T06's `mediaService` and `libraryScanService`) to `src/features/library/application/`. Evidence: same.
- [ ] **T08.05** Confirm the pilot has no boundary violations. Evidence: `npm run lint:boundaries` exits 0.
- [ ] **T08.06** Run the full test suite — no regressions. Evidence: same test count.
- [ ] **T08.07** Do NOT migrate the other 11 features in this phase. Note them as out-of-scope-for-pilot, to be batched in a follow-up wave after the architecture stabilizes. Evidence: the other 11 features are unchanged.

### P08 exit — Wave 2 review

- [ ] **T08.08** Reviewer confirms: 1 pilot feature lives in the new layout, no boundary violations, no test regressions. Evidence: reviewer initials + date.

---

## W3 — Player integration

### P09 — Inventory the 38 player call sites (closes the analysis half of D-010)

- [ ] **T09.01** List the 37 files (38 sites, 1 file has 2 sites). Use `git grep -l "@simba-dev/react-native-media-player"` to enumerate. Evidence: 37-file table in this tracker with 1 row per file.
- [ ] **T09.02** For each file, classify the import: `usePlayerActivity` (most common), `useQueue`, `useOpenWithResume`, `resolveStreamType`, `usePlayerFacade` (none yet). Evidence: column in the table.
- [ ] **T09.03** Identify the 5–10 distinct *use cases* these imports serve (e.g. "play this URI", "play with resume", "add to queue", "show now playing", "enqueue next"). Evidence: a 5–10 row use-case map.

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
