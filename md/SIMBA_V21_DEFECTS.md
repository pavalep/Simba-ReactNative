# SIMBA V21 — Defect Register

> Numbered list of every defect surfaced by the V21 source-of-truth
> audit (2026-09-09). Every V21 phase in `SIMBA_MOBILE_V21_TRACKER.md`
> references defects by ID. This file is the single source of truth
> for "what's broken" — the tracker is the source of truth for
> "how we fix it."
>
> Update the Status column on every commit. Move a defect to CLOSED
> only when its phase's exit evidence is recorded.
>
> Severity legend:
> - **P0** — beta release blocker. Must close before gate is met.
> - **P1** — should-fix in beta. Tracked; not strictly blocking.
> - **P2** — nice-to-have. Tracked; may slip.

---

## P0 — Beta blockers

| ID | Title | Evidence | Status |
|----|-------|----------|--------|
| **D-001** | Android release build is signed with the debug keystore | `android/app/build.gradle:7,22-26` — `signingConfig signingConfigs.debug` for the `release` build type; `storeFile file('debug.keystore')` | OPEN |
| **D-002** | Android release build has minification disabled | `android/app/build.gradle:6` — `def enableProguardInReleaseBuilds = false`; `release.minifyEnabled enableProguardInReleaseBuilds` → false | OPEN |
| **D-003** | Jest config uses invalid key `setupFilesAfterEach` | `jest.config.js:12` — Jest 29 valid keys are `setupFiles` and `setupFilesAfterEnv`; the current key is silently ignored (jest still runs because the preset includes a default setup, but the V18.10 notifyManager shim in `jest.setup.ts:2` is NOT loaded — explaining the open-handle warning that `--forceExit` masks). **W1 P01 commit `0523ddf`** closed this by switching the key to `setupFilesAfterEnv` | **CLOSED** |
| **D-004** | `npm test` reports open async handle (worker process fails to exit gracefully) AND React `act(...)` warnings | Originally attributed to D-003 (shim not loaded). After **W1 P01 commit `0523ddf`**, the shim IS loaded (microtask scheduler) — but the warning persists. `--detectOpenHandles` doesn't identify a specific handle; the act warnings trace to `Query.#dispatch` → `notifyManager.batch` → `forceStoreRerender` (a TanStack Query state-update firing outside `act`). This is a deeper issue than D-003; deferred to **V21 P03 (Test runtime cleanup)** where the root cause can be fixed properly (e.g. wrap renders in `act`, or set `IS_REACT_ACT_ENVIRONMENT = true` in jest.setup) | OPEN (deferred to P03) |
| **D-005** | `src/services/storageService.ts` is 8 TODOs (theme/recent-searches/linked-folders persistence) | `src/services/storageService.ts:8,12,17,21,26,30` — every function is a `// TODO` returning `[]` or `null`. P0 because linked folders persistence is a beta requirement (release gate 4) | OPEN |
| **D-006** | `src/services/playlistService.ts` is 1 TODO (in-memory only) | `src/services/playlistService.ts:7` — `// TODO: Load playlists from storage`. P0 because playlist persistence is a beta requirement (release gate 4) | OPEN |
| **D-007** | `src/services/mediaService.ts` is 2 TODOs (no metadata load, no real scan) | `src/services/mediaService.ts:5,10` — `// TODO: Load media file metadata` and `// TODO: Scan a directory for media files`. P0 because the library screen depends on metadata | OPEN |
| **D-008** | `src/services/libraryScanService.scanFolder()` is a stub returning `[]` | `src/services/libraryScanService.ts:9-13` — `return [];` with a comment "actual scan is handled by the native media scanner service" but `useMediaScanner` (in `src/hooks/useMediaScanner.ts`) already does the real scan, so this service is dead | OPEN |
| **D-009** | App startup has duplicate `Linking.getInitialURL()` calls | `App.tsx:124` (inside React Navigation's `linking.getInitialURL`) AND `App.tsx:149` (cold-start hook). Both fire on every app launch. The cold-start hook calls `openFromUrl(url)` and the React Navigation config independently dispatches the same URL — the user gets the shared file twice | OPEN |
| **D-010** | 38 player call sites across 37 files for `@simba-dev/react-native-media-player` — no facade | `__tests__/.../useApiQuery.test.tsx` is exempt; the 38 sites are listed in `V21 Phase 09`. Concentration risk: any change to the player module API is 38 call-site breakage | OPEN |
| **D-011** | Legacy `MediaNotificationService.kt` exists alongside module-owned `MediaPlaybackService` | `android/app/src/main/java/com/simba/player/MediaNotificationService.kt` (app-owned) vs the module's `MediaPlaybackService` (module-owned). Notification ownership unclear. P0 because release gate 3 requires "Notifications and background playback" device proof | OPEN |
| **D-012** | 4 legacy empty/near-empty roots in `src/` | `src/contexts/` is empty; `src/modules/playback/{audio,components}/` are empty subdirs; `src/native/` is empty. Plus `src/context/index.ts` is a 1-file backward-compat re-export of `src/theme` (the spec calls this "context vs contexts" — it's not a duplicate, it's a re-export shim that can be retired once consumers move). **W1 P03 commit `ea842a5`** closed this by relocating all 4 to `md/_v21_p03_dead_code/` (3 untracked empty dirs, 1 `git mv` for the tracked shim with `.txt` extension so `tsc` ignores the now-broken relative imports). The `src/` tree drops from 18 directories to 14 | **CLOSED** |
| **D-013** | No `.env.example` for the missing Android Gradle prerequisite | `android/app/build.gradle:7` — `release: ".env"`; no `.env.example` is checked in. Blocks CI (release gate 2). **W1 P02 commit `650c04c`** closed this by adding `android/.env.example` (the 6 keys the app actually reads), a fail-fast Gradle validator at the top of `android/app/build.gradle`, the `md/SIMBA_V21_ENV.md` quick-start, and a Step-0 section in `README.md` | **CLOSED** |
| **D-014** | iOS support is not a V21 release claim but the README / marketing may imply it | Repo has no `ios/` directory in scope. Spec says "explicitly out of scope" — must be reflected in release notes | OPEN |

## P1 — Should-fix in beta

| ID | Title | Evidence | Status |
|----|-------|----------|--------|
| **D-020** | Unsafe `as any` casts (11 total) across 8 files | `useLibraryScreen.ts:3`, `Dialog.tsx:2`, `SkeletonLoader.tsx:1`, `navigationHelper.ts:1`, `AboutScreen.tsx:1`, `useArtistScreen.ts:1`, `SearchScreen.tsx:1`, `authService.ts:1` — the spec lists the first 5; the next 3 are new findings | OPEN |
| **D-021** | Unsafe `as unknown as` casts (3 total) across 2 files | `useQueueScreen.ts:2`, `MovieCard.tsx:1` — neither called out in the original spec; new finding | OPEN |
| **D-022** | Adapter layer is mixed with application services | `src/services/api/*` (10 adapters) live alongside `src/services/{auth,download,media,playlist,storage,libraryScan,file,metadata}Service.ts`. The clean rule is `src/infrastructure/api/<provider>/` for adapters, application services live in `src/features/*/application/` | OPEN |
| **D-023** | Player integration is not behind a typed `PlaybackFacade` | No `usePlaybackFacade()` hook in `src/infrastructure/player/`. The 38 call sites each call `openPlayer({...})` directly from the module — no contract enforcement | OPEN |
| **D-024** | Adapters do not declare schema-validation contract | None of the 10 adapters in `src/services/api/*` use a schema library (zod, yup, valibot). Wire-shape drift is caught only at TypeScript build time, not at runtime | OPEN |
| **D-025** | Adapters do not declare cancellation / timeout / retry policy | None of the 10 adapters pass `signal`, `timeout`, or `retry` options. Network failures are the consumer's problem (TanStack Query handles retry on `useQuery` calls, but the adapter itself doesn't) | OPEN |
| **D-026** | Shared `content://` playback (`fd://N` conversion) is unverified on device | The module converts content URIs to `fd://N`. Release gate 3 requires physical-device proof. No automated test covers this — only the module's own Jest tests | OPEN |
| **D-027** | Library screen segment / mode / view state is 11 `useState` calls + 1 `useRef` | `src/screens/Library/hooks/useLibraryScreen.ts` — many of these are presentational toggles that could be derived, but the hook is otherwise clean per V20.10 | DEFERRED (post-beta) |
| **D-028** | `useShowsScreen` carries a `dedupe` cross-page helper | `src/screens/ShowsScreen/hooks/useShowsScreen.ts:158-165` — legitimate today (API may return overlapping results across pages), but a `select` callback on the `useInfiniteApiQuery` could do this in TanStack instead of post-hoc | DEFERRED (post-beta) |

## P2 — Nice-to-have

| ID | Title | Evidence | Status |
|----|-------|----------|--------|
| **D-040** | The 4 optional fields on the shared `SectionRenderContext` | `src/screens/_shared/sectionRenderContext.ts` — `activeChips?`, `refreshing?`, `onRetry?`, `routeParams?`. Music/Movies BrowseLayout pass 7 fields, Podcasts passes 3. KISS to 3 fields (V20.14 follow-up) | OPEN |
| **D-041** | Empty subdirs under `src/modules/playback/{audio,components}/` | Visible in the directory listing but no file content. Can be deleted with a directory-existence check | OPEN |
| **D-042** | `useSettingsScreen` returns `isLoading: isScanning` (V20.10 alias) but the surface name still says `isLoading` | Cosmetic; rename would be a breaking change to the consumer | DEFERRED |
| **D-043** | `useApiQuery` overloads (V20.5) added a `QueriesOptions<TQueries>` import that is only used in `useApiQueries` — not exposed on `useApiQuery` | Clean abstraction; nothing to fix | DEFERRED (no action) |

---

## Status legend

- **OPEN** — defect confirmed, not yet fixed
- **IN PROGRESS** — work underway, linked to a tracker phase
- **CLOSED** — defect fixed, exit evidence recorded in tracker
- **DEFERRED** — consciously postponed, will not block beta

## Source-of-truth audit date

2026-09-09 — 14 P0 + 9 P1 + 4 P2 = 27 defects total.

The audit was a single-pass read of:
- `App.tsx`, `jest.config.js`, `jest.setup.ts`
- `src/services/{media,playlist,storage,libraryScan}Service.ts` (placeholders)
- `src/services/api/*` (10 adapters — interface shape, not implementation)
- `src/context{,/s}`, `src/modules`, `src/native` (legacy roots)
- `android/app/build.gradle` (release config)
- `android/app/src/main/java/com/simba/player/MediaNotificationService.kt` (legacy service)
- The 38 `from '@simba-dev/react-native-media-player'` import sites
- All 14 `as any` / `as unknown as` / `@ts-ignore` casts in `src/`
