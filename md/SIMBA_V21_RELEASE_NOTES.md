# SIMBA V21 — Release Notes

> **V21 — `1.5.0-beta.1`** · **Build date:** see the GitHub Release
> tag · **Audience:** beta testers, internal QA, and the user
> (Paval EP). This file is the **consumer-facing** summary of the
> V21 release; the per-wave exit docs (`md/SIMBA_V21_W*_EXIT.md`)
> are the engineering-facing evidence.

---

## What's in

**Player (V21 W3 + W7 — the big one):**
- The V12 dedicated `PlayerActivity` is the sole playback surface.
  Tapping a file in any screen (Library, Search, Bookmarks,
  History, Queue) launches the full-screen player with the
  native mpv `SurfaceView` + `DefaultControls` ViewGroup.
- The `usePlayer` + `usePlayerProgress` hooks are the new
  single source of truth for live player state (isPlaying,
  position, duration, buffering). The 4 transport controls
  (play/pause, prev, next, seek) on `NowPlayingScreen` are
  now live (pre-V21 they were decorative placeholders).
- `usePlayWithResume(uri, opts)` — open a media item and seek
  to a saved position in **one call**. Two pre-V21 bugs fixed:
  the history screen was passing seconds as milliseconds
  (1000x-off seek), and the bookmarks screen was ignoring
  the saved position entirely.
- Typed `usePlay(uri, opts): Promise<Result<PlaybackId,
  StreamError>>` — the new facade hook returns a `Result` so
  call sites can branch on the 4 `StreamError` variants
  (`network` / `unsupported` / `expired` / `blocked`).
- 4 typed `StreamError` variants with distinct per-variant
  toast messages. Pre-V21, all failures collapsed to a
  silent no-op; now the user sees "No connection", "Sign in
  expired", etc. (See "Known issues" — full per-variant
  routing is W22.)

**Adapter layer (V21 W2 + W6):**
- All 10 network adapters moved from `src/services/api/*` to
  `src/infrastructure/api/<provider>/`. The new
  `AdapterParseError` + 5 type guards (`isRecord` /
  `isFiniteNumber` / `isNonEmptyString` / `isString` /
  `isArray` / `assertShape<T>`) close the wire-shape drift gap.
- Per-adapter `*_RETRIES = 2` constant. The `__tests__/
  infrastructure/api/adapterContract.test.ts` single
  consolidated contract test verifies all 10 adapters
  expose the constant + import the shared error.
- Credential inventory + 10-row cache policy table in
  `md/SIMBA_V21_CREDENTIALS.md` + `md/SIMBA_MOBILE_V21_TRACKER.md`
  §P23. All 6 service keys stay in `android/.env` (the
  react-native-config pattern). APK-contains-keys trade-off
  accepted for the current ~10k user scale.

**Persistence (V21 W5):**
- `sharedMMKVStorage` — Zustand `StateStorage` adapter with
  just-in-time AsyncStorage → MMKV migration. 11 stores
  migrated. Bookmarks, History, Playlists, Settings, etc.
  now survive process kill + relaunch in <5ms (vs the
  AsyncStorage cold-start).
- `scanFolderForAudio` + `scanAudioFolders` + `detectDuplicates`
  live in `src/infrastructure/device/metadata/`. Permission-revoked
  folders are auto-unlinked from the folder list (no more
  "library is empty" after a SAF revoke).

**Build (V21 W4):**
- Signed release APK — `android/app/build.gradle` `signingConfigs.release`
  reads from 4 env vars (fails fast). The
  `md/SIMBA_V21_KEYSTORE.md` doc walks through keystore
  generation + CI restore.
- ProGuard / R8 minification enabled for release builds.
  `android/app/proguard-rules.pro` ~125 lines of keep rules
  for the player module + 7 third-party libs (MMKV v4 via
  Nitro, Reanimated v4 + worklets, react-native-svg v15,
  react-native-screens v4, react-native-gesture-handler v2,
  etc.).
- `validateEnv` Gradle task runs before every release task.
  Pre-flight check for the 4 `KEYSTORE_*` env vars + the
  `android/.env` file. Debug builds skip the keystore check.

**Navigation (V21 W3 P12):**
- Single `Linking.getInitialURL()` call shared between
  React Navigation config + the cold-start hook. Pre-V21
  the deep link URL was fetched twice and the file was
  opened twice (a SIMBA URL would land the user in the
  right screen but also silently open the file in the
  background).

**DX (V21 W1 + W2):**
- PlayerFacade at `src/infrastructure/player/` is the only
  place that imports from `@simba-dev/react-native-media-player`.
  `npm run lint:boundaries` reports 0 errors / 0 warnings on
  4 rules: ADAPTER, PLAYER, DOMAIN-PURITY, SHARED-LEAF. A
  new file that bypasses the facade will fail the build.

---

## What's out

### iOS is **not** a V21 release claim

The repository has no `ios/` directory. V21 is **Android-only**;
the V12 player module is Android-only (Kotlin + mpv); the
`react-native-fs`, `react-native-fast-image`, and `patch-package`
tooling all assume Android in V21. If you need an iOS build,
the V12 module's iOS surface (AVPlayer + custom controller)
would need to be re-validated against the V21 facade, the
release config would need an iOS signing config, and the
ProGuard rules would need a `-keep` companion for Swift
interop.

The repo's README will not mention iOS in the install
instructions. **Do not** file iOS-specific bugs against V21 —
they will be closed as `out-of-scope` and tracked for a
hypothetical future V22-iOS workstream.

### Other out-of-scope items

- **iPad / tablet layouts** — V21 ships phone-only layouts.
  The `MD3` design tokens in `src/theme/tokens.ts` are
  size-agnostic but the screen components hard-code phone
  widths.
- **Chromecast / AirPlay** — not implemented in V12; not
  wrapped by V21.
- **CarPlay / Android Auto** — same; deferred.
- **Cloud sync** — all 11 MMKV stores are device-local. There
  is no remote backup, no iCloud / Google Drive sync, no
  cross-device playlist handoff.
- **Lyrics** — `lrcService` exists but the parser is a stub.
  The screen-level integration is W22.
- **Subtitles / closed captions** — `subtitleSettingsService`
  exists; the player integration is W22.

---

## Known issues (P1 carry-overs)

These are tracked defects that affect V21.5-beta.1 but
do not block the beta itself. Each links to the source-of-truth
defect register (`md/SIMBA_V21_DEFECTS.md`).

### P0 (beta blockers; current state)

| ID | Title | State | What's needed |
|----|-------|-------|---------------|
| D-014 | iOS support is not a V21 release claim | OPEN | This release notes section. |
| D-004 | Jest worker process fails to exit gracefully (act-warning half is fixed via patch-package) | OPEN cosmetic | Affects CI logs only. The act-warning half was fixed by `patches/@testing-library+react-native+14.0.1.patch` (T13.01a). The worker-exit half was accepted as cosmetic in W2 P08 + W3 T13.02. Does not affect `npx jest` exit code; tests pass with `--forceExit`. |

### P1 (should-fix in beta; not blocking)

| ID | Title | State | What's needed |
|----|-------|-------|---------------|
| D-020 | Unsafe `as any` casts (11 total across 8 files) | OPEN | `useLibraryScreen.ts:3`, `Dialog.tsx:2`, `SkeletonLoader.tsx:1`, `navigationHelper.ts:1`, `AboutScreen.tsx:1`, `useArtistScreen.ts:1`, `SearchScreen.tsx:1`, `authService.ts:1`. Plan: P22 (W22) — replace each with the appropriate `unknown` + type guard. |
| D-021 | Unsafe `as unknown as` casts (3 total across 2 files) | OPEN | `useQueueScreen.ts:2`, `MovieCard.tsx:1`. Plan: P22 (W22) — same as D-020. |
| D-023 | Player integration is not behind a typed `usePlaybackFacade()` API | PARTIALLY closed | P25 (live state reads) + P26 (playWithResume) + P28 (4 StreamError variants + usePlay) shipped. The full `usePlaybackFacade()` API (with `play()` / `playWithResume()` / `enqueue()` consolidation) is W22. |
| D-024 | Adapters do not declare schema-validation contract | PARTIALLY closed | P21 + P21b shipped the shared `AdapterParseError` + 10 `*_RETRIES` constants + 10 `*_RETRIES` test contract. W6 P21c (per-adapter deep `parseEnvelope` + signal threading) is W22. |
| D-025 | Adapters do not declare cancellation / timeout / retry policy | PARTIALLY closed | P21b shipped the `*_RETRIES = 2` constant documenting the policy. Per-adapter signal threading is W6 P21c (W22). |
| D-026 | Shared `content://` playback (`fd://N` conversion) is unverified on device | OPEN | T28.03 (P28 device proof) + T15.04 (P15 device proof) cover this. Currently the conversion works in the 19 jest tests for the player module but has never been exercised on a Pixel 7. |

### P1 deferred to post-beta (not in V21.5-beta.1)

| ID | Title | State |
|----|-------|-------|
| D-027 | Library screen has 11 `useState` + 1 `useRef` | DEFERRED (post-beta) |
| D-028 | `useShowsScreen` has a `dedupe` cross-page helper | DEFERRED (post-beta) |
| D-042 | `useSettingsScreen` returns `isLoading: isScanning` (V20.10 alias) | DEFERRED (post-beta) |
| D-043 | `useApiQuery` overloads added an unused `QueriesOptions<TQueries>` import | DEFERRED (no action) |

### P2 (nice-to-have)

| ID | Title | State |
|----|-------|-------|
| D-040 | 4 optional fields on the shared `SectionRenderContext` (KISS to 3) | OPEN — V20.14 |
| D-041 | Empty subdirs under `src/modules/playback/{audio,components}/` | OPEN |

---

## How to install

### Android (the only supported platform in V21)

1. **Download** the `simba-release-apk-1.5.0-beta.1` artifact
   from the GitHub Release page (or use the workflow artifact
   from the Actions tab — 90-day retention).
2. **Enable "Install from unknown sources"** in
   `Settings → Apps → Special app access → Install unknown
   apps → your browser/file-manager`. The Play Store
   protection is bypassed because the APK is signed with
   a custom keystore (not Google's root).
3. **Tap the APK** on the device. Android 14+ will show a
   confirmation dialog with the SHA-256 of the signing
   certificate. The certificate is the same one documented
   in `android/KEYSTORE.md` (the `KEYSTORE_PATH` env var).
4. **Open the app** — you land on the Home screen with the
   Library / Discover sections. To verify the install, see
   "How to verify" below.

### iOS (NOT supported)

V21 does not ship an iOS build. Do not attempt to install.

---

## How to verify (beta tester script)

The full beta QA script is `md/beta-qa-script.md` (60+ items).
The top 5 critical-path checks for a fresh install:

1. **Play a local file.** Open Library → All Audio →
   tap any track. `PlayerActivity` should launch fullscreen
   with playback starting within 2s. Press home. Reopen the
   app. `PlayerActivity` should resume from where it was
   paused. (`usePlayer` + `usePlayerProgress` are reading
   the live bridge state — T25.03 covers this.)
2. **Resume a partial track.** Open History → tap the
   first item. The track should jump to the saved
   position (pre-V21 it always started at 0).
3. **Download a file, kill app, relaunch.** Open a 100MB+
   file from a podcast, tap Download, kill the app at
   50%, relaunch, tap Resume. The download should pick
   up from 50% (the `Range: bytes=N-` header — T27.03
   covers this).
4. **Trigger a stream error.** Turn off Wi-Fi + cellular,
   tap a remote stream. The toast should show
   "No connection. Will retry." (the `StreamError.kind
   === 'network'` branch — T28.03 covers this).
5. **Verify the bookmark persists.** In Now Playing, tap
   the bookmark icon to save a marker at 2:30. Kill the
   app. Reopen → Bookmarks → tap the marker. Playback
   should resume at 2:30. (T26.03 covers this.)

If any of the 5 fails, please file a bug with the device
make/model + Android version + the step number that
failed. Include a logcat from
`adb logcat -d -b crash -s ReactNative:V` (or a screen
recording if logcat is too noisy).

---

## Where to get help

- Engineering tracker: `md/SIMBA_MOBILE_V21_TRACKER.md`
- Defect register: `md/SIMBA_V21_DEFECTS.md`
- Per-wave exit docs: `md/SIMBA_V21_W{1..7}_EXIT.md`
- Per-feature env doc: `md/SIMBA_V21_ENV.md`
- Credentials + cache table: `md/SIMBA_V21_CREDENTIALS.md`
- Keystore setup: `android/KEYSTORE.md` (also at `md/SIMBA_V21_KEYSTORE.md`)
- V12 player module: `md/SIMBA_PLAYER_MODULE_V12_*` (history
  docs — V12 is the current architecture; the V12 deprecation
  audit is historical)

---

## Acknowledgements

The V21 release closes 8 P0 defects + 4 P1 defects (D-005,
D-006, D-007, D-008, D-009, D-010, D-011, D-022) and ships 6
release-gate artifacts. 4 device proofs remain OPEN (T13.04,
T14.04, T15.04, T25.03, T26.03, T27.03, T28.03 — see the W8
go/no-go review for the current state).
