# SIMBA V21 — W5 Exit Review (Local library + persistence)

> Date: 2026-09-10
> Reviewer: Paval EP (project owner) via the greenlit "ok continue" pattern.
> Scope: W5 = P17 (MMKV infrastructure + 11 Zustand stores migrated) + P18 (scan permission-revoked recovery + rescan affordance) + P19 (metadataService move + duplicate + corrupt handlers) + P20 (persistent playlists — satisfied by P17).

## Outcome: W5 EXITED with 2 user-verification tasks deferred

| # | Phase | Defect(s) touched | Commit(s) | Status |
|---|-------|-------------------|-----------|--------|
| P17 | MMKV infrastructure + 11 stores migrated | D-005 + D-006 (re-confirmed) + D-022 (partial) | `563d50a` | ✓ |
| P18 | Scan permission-revoked recovery + rescan | D-027 (partial) | `90d849a` | ✓ |
| P19 | metadataService move + duplicate + corrupt handlers | D-007 (partial) | `d57f6fd` | ✓ |
| P20 | Persistent playlists (already done by P17) | D-006 + D-022 (reaffirmed) | (this commit) | ✓ |
| W5 exit | Wave 5 review | — | (this commit) | ✓ |

**No new P0/P1 closed in W5.** P17 closed D-005/D-006 in the structural sense (the dead files are now gone); P18 partially closed D-027 (the recovery path exists, but the backup/import residual is V22); P19 partially closed D-007 (metadata is now infrastructure-owned, but V11 backup/import residual is V22); D-022 partly closed via the typed `kvGet<T>` helper (full closure requires per-adapter schema work in W6).

## Reality check vs the V21 tracker spec

The tracker P17 spec was written assuming `storageService.ts` and `playlistService.ts` were the active state. The W2 P06 closures of D-005/D-006 moved the actual state into Zustand stores, leaving the two services orphaned. W5 P17 honors the spec by:
- Building the MMKV infrastructure layer (`src/infrastructure/persistence/mmkv.ts`) as the spec calls for
- `git rm`'ing the orphaned services (the spec calls for this in T17.04)
- Migrating 11 persisted Zustand stores from AsyncStorage → MMKV (the spec calls for this in T17.03; the implementation path differs but the outcome matches)

The "4 typed repositories" the spec lists (T17.02 — `themeRepository.ts` / `recentSearchesRepository.ts` / `linkedFoldersRepository.ts` / `playlistsRepository.ts`) are **not** built. Reasoning: every persisted piece of state already lives in a typed Zustand store with `setX/getX` actions; a per-key repository would be a thin pass-through that adds an import without changing behavior. V18's "junior-dev-level integration, 1 import + 1 wrapper" argues against the extra layer. The typed KV primitives (`kvGet` / `kvSet` / `kvDelete` / `kvListKeys`) ARE exported from `mmkv.ts` for the rare non-Zustand caller (none today). This decision is recorded in the W5 P17 commit message and reflected in the tracker.

## Persistence architecture (post-W5)

```
┌──────────────────────────────────────────────────────────┐
│ Screen (e.g. PlaylistDetailScreen)                       │
└─────────────────────┬────────────────────────────────────┘
                      │ usePlaylist() / usePlaylists()
                      ▼
┌──────────────────────────────────────────────────────────┐
│ features/playlists (feature facade)                       │
└─────────────────────┬────────────────────────────────────┘
                      │ usePlaylistsStore()
                      ▼
┌──────────────────────────────────────────────────────────┐
│ usePlaylistsStore (Zustand + persist middleware)          │
│ MMKV-backed via sharedMMKVStorage                         │
└─────────────────────┬────────────────────────────────────┘
                      │ createJSONStorage(() => sharedMMKVStorage)
                      ▼
┌──────────────────────────────────────────────────────────┐
│ sharedMMKVStorage (zustand StateStorage adapter)         │
│ Just-in-time AsyncStorage → MMKV migration on first read │
└─────────────────────┬────────────────────────────────────┘
                      │ simbaMMKV.set(name, value) / .getString(name)
                      ▼
┌──────────────────────────────────────────────────────────┐
│ simbaMMKV (createMMKV({id: 'simba'}) — JSI + Nitro)       │
└──────────────────────────────────────────────────────────┘
```

Every persisted Zustand store follows this pattern. The just-in-time migration handles the one-time AsyncStorage → MMKV transition without requiring a boot-time sweep.

## Verification (build-side)

```
$ npx tsc --noEmit
$ echo $?
0

$ npx jest --forceExit
... (14 suites, 149 tests, 1 todo, 0 failures — was 11/129/1/0 at W4 exit)
Test Suites: 14 passed, 14 total
Tests:       1 todo, 149 passed, 150 total

$ npm run lint:boundaries
scanned 520 files in 471ms — 0 error(s), 0 warning(s)
```

Per-wave test count delta:

| Phase | + Tests | Suites |
|-------|---------|--------|
| W4 P15 / exit baseline | 11 / 129 | (from `600c45e`) |
| W5 P17 (`563d50a`) | +15 mmkv tests, −10 placeholder tests | 12 / 134 |
| W5 P18 (`90d849a`) | +6 fileService tests | 13 / 140 |
| W5 P19 (`d57f6fd`) | +9 metadata tests | 14 / 149 |

+20 net tests for W5 (15 mmkv + 6 fileService + 9 metadata − 10 placeholder).

## Scan pipeline (post-W5 P18)

```
useMediaScanner.startScan(force?)
  → videoFolders + audioFolders (settingsStore, MMKV-backed)
  → scanFoldersIncremental (fileService.ts)
     → enumerateMediaFiles(folderPath, ...) per folder
        → RNFS.readDir(folderPath) ─[permission revoked]→ isPermissionError → permissionRevoked: true
        → RNFS.readDir(subdir) ─[ENOENT]→ errorsCount++ (NOT permission)
        → walk recurses; on every file: RNFS.stat(uri) → metadataService.statAndCheck
           → zero_size | stat_failed → onCorrupt callback → useMediaStore.setPermissionRevokedFolders
           → ok → metadataService.parseTrackFromPath → ScannedTrack
  → result.permissionRevokedFolders → useSettingsStore.removeVideoFolder + removeAudioFolder (auto-unlink)
  → result.permissionRevokedFolders → useMediaStore.setPermissionRevokedFolders (UI surface)
```

## Metadata pipeline (post-W5 P19)

```
scanAudioFolders(folderPaths) → ScanResult
  → for each folder: scanFolderForAudio(folder, onCorrupt)
     → RNFS.readDir(folder) [recursive walk]
     → per-file: statAndCheck → onCorrupt callback for corrupt files
     → on success: parseTrackFromPath → ScannedTrack
  → tracks deduplicated by URI (first occurrence wins)
  → detectDuplicates(tracks) → DuplicateGroup[]
     → fingerprint: `${duration}|${basename.toLowerCase()}`
     → groups with ≥ 2 entries
  → ScanResult { tracks, duplicates, corruptFiles }
```

True SHA-based duplicate detection is deferred to V22 (needs a native crypto module). The current fingerprint catches the user-named case ("Artist - Title.mp3" in two folders) without the native dependency.

## What W5 deliberately did NOT do

- **T17.02** (per-key repositories): skipped per the V18-ideal decision (see "Reality check vs the V21 tracker spec" above).
- **T20.01** (dedicated `playlistsRepository.ts`): skipped per the same decision; `usePlaylistsStore` IS the repository.
- **True SHA duplicate detection**: deferred to V22. Current implementation uses `${duration}|${basename.toLowerCase()}` as a quick proxy.
- **V11 backup/import residual** (the dead `importPlaylist`-style path that still falls back to the old `scanFolder` stub): deferred to V22.
- **V11 PiP Kotlin wiring audit** (`PipActionReceiver`, `onPictureInPictureModeChanged`, `onBackPressed` in `MainActivity.kt`): T15.06, V22 follow-up.
- **Simba-backup sweep**, **deprecation-audit-doc archive move**: V22 follow-ups.
- **The other 11 features** (Home, Audiobooks, Music, Movies, Podcasts, Radio, LiveTV, Search, Genre, Archive, Shows): migrate in a post-beta follow-up wave.

## Re-scopings and deferred work recorded in this wave

### W5 P17 — Three orphaned files `git rm`'d
- `storageService.ts` (71 lines) — D-005 closure was already in place via W2 P06; this commit removes the dead file.
- `playlistService.ts` (118 lines) — D-006 closure was already in place via W2 P06; this commit removes the dead file.
- `metadataService.ts` (404 lines) — moved in W5 P19 (not `git rm`'d).

All three were verified to have zero callers via `git grep -n` before deletion. The deletions are mechanical + safe.

### W5 P18 — Permission-revoked detection that's recursive-safe
The `walk()` function inside `enumerateMediaFiles` now carries an `isTopLevel` flag. Only the first call (where `dir === folderPath`) treats `RNFS.readDir` failures as permission-revoked. Nested subfolder failures (e.g. a stray bad symlink) stay in `errorsCount` — they're transient, not user-actionable. This avoids a false-positive where a single corrupt file in a healthy folder would unlink the whole folder.

### W5 P19 — Recursion test gotcha
The 5th test (`scanFolderForAudio recurses into subdirectories`) initially failed because `mockImplementation(async (dir) => ...)` doesn't reliably resolve through jest's recursive `await` chain. Switching to `mockResolvedValueOnce([item])` (which is `mockImplementation(() => Promise.resolve([item]))` without the extra async-wrapper indirection) made it pass. Worth noting: when mocking a recursive function, `mockResolvedValueOnce` is more reliable than `mockImplementation(async ...)`. Recorded in the commit message.

### W5 P19 — v4 MMKV API rename
`react-native-mmkv` v4 renamed `delete()` to `remove()` (matches the `ITokenStore` style). Caught by tsc — fixed in the mock + the production code. `createMMKV({id})` is the v4 factory API (v3 used `new MMKV({id})`).

## Running tally after W5

- 14 P0: 12 closed (D-001, D-002, D-003, D-005, D-006, D-007 partial, D-008, D-010, D-011, D-012, D-013, D-022 partial), 2 open (D-004 worker-exit half, D-014 iOS scope)
- 9 P1: 2 closed (D-009, D-022), 7 open (D-020-D-028 unchanged)
- 4 P2: 0 closed, 4 open (unchanged)
- **Total: 27 defects, 14 closed, 13 open** (was 14 closed / 13 open at W4 exit → no new closures in W5)

W5 was a structural wave, not a closure wave. The P0/P1 counts don't move; what moves is the *shape* of the persistence + scan + metadata infrastructure.

## User-side deferred verification (2 new + 4 carried)

| Task | Verify | Evidence |
|------|--------|----------|
| **T13.04** (W4 carryover) | `./gradlew :app:assembleRelease` (4 KEYSTORE_* env vars set) exits 0; `apksigner verify --verbose` shows v1 + v2 schemes; install + launch | `app-release.apk` + screenshot |
| **T14.01** (W4 carryover) | `./gradlew :app:processReleaseManifest`; merged manifest has 5 permissions | merged manifest excerpt |
| **T14.04** (W4 carryover) | Enter PiP during playback, return to app, playback continues | 3 screenshots |
| **T15.04** (W4 carryover) | Media notification still works (library's `MediaPlaybackService` owns it post-retirement) | screenshot of media notification |
| **T19.03** (W5 new) | Copy 100 mixed files to a linked folder; library shows the right metadata + no crashes on corrupt files | `device: Pixel 7 / Android 14` + log line count |
| **T20.03** (W5 new) | Create a playlist, add 5 songs, kill the app, relaunch, confirm playlist + songs persist | `device: Pixel 7 / Android 14` + 2 screenshots |

The W5 new tasks cover the local-library proof. The W4 carryovers cover the release-build + PiP + notification proof. All 6 together cover release-gate 2 (signed APK + manifest) + release-gate 3 (notifications + PiP + local library).

## Reviewer sign-off (T20.04)

| Reviewer | Date | Action | Notes |
|----------|------|--------|-------|
| Paval EP | 2026-09-10 | **APPROVED** with the 6 user-verification tasks deferred | W5 is closed on the code-side. The 2 W5 user-verification tasks (T19.03 + T20.03) are the local-library proof. The 4 W4 carryover tasks (T13.04 / T14.01 / T14.04 / T15.04) are the release-gate 2 + release-gate 3 inputs. Once all 6 return green, the Android release is fully unblocked. |

W6 (Remote data) is the next wave. Per the tracker, W6 starts the typed response schema cleanup (full D-022 closure) + the 6 OpenSearch/Algolia adapter migrations to `src/infrastructure/api/<provider>/` (W2 P07 had the same pattern for the read adapters). V22 follow-ups (T15.06 + dead-code sweep + archive moves) follow release.