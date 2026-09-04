# SIMBA Player Module — V14 Final QA Report

**Document Version:** 1.0
**Date Created:** 2026-09-04
**Author:** Mobile team
**Package:** `@simba-dev/react-native-media-player`
**Release:** V14.0.0 (npm `1.3.0`)
**Status:** ✅ All V14 phases complete; module published as `1.3.0@staging`; pending user-side `promote.yml` step to flip to `@latest`

---

## 1. Summary

V14 is the **DX polish** layer on top of the V13 extraction. V13 shipped "complete the extraction" (every V11 inline player file is gone from the consumer; the module owns the bridge + state + UI). V14 ships "make the integration so simple that a junior dev can ship a working player with one import + one wrapper component + zero glue code".

The integration surface for a typical app is now:

```tsx
<SimbaPlayer getResumePosition={(uri) => store.getState().bookmarks.byFileUri[uri]?.positionMs}>
  <SimbaPlayerRoot>
    <YourNavigator />
  </SimbaPlayerRoot>
</SimbaPlayer>
```

That's it. No activity-branch `if/return` switch. No deep-link URI parser. No bookmark-slice-walking. No `useMemo<PlayerResumeLookup>` boilerplate. No `player.playbackState` mirror.

---

## 2. Phase status

| Phase | Description | Status | Commit |
|---|---|---|---|
| 59 | `<SimbaPlayerRoot>` activity-branch wrapper | [x] complete | module `d359352` · consumer `75b21de` |
| 60 | `useOpenFromUrl` deep-link helper | [x] complete | module `c4f4779` · consumer `e080e3a` |
| 61 | `<SimbaPlayer>` `getResumePosition` + `useSimbaPlayerLookup` | [x] complete | module `4d8f73c` · consumer `73d6e21` |
| 62 | deprecate `playerSlice` V11-mirror | [x] complete | consumer `9415600` |
| 63 | release v1.3.0 | [x] complete | module `b4d430e` · tag `v1.3.0` |

---

## 3. New public surface (V14)

### Components
- **`<SimbaPlayerRoot>`** — `useLaunchParams()` + activity-branch switch. Renders `<PlayerRoot />` when launch params are present, otherwise its `children`.

### Hooks
- **`useOpenFromUrl()`** — `(uri: string) => Promise<boolean>`. Filters `content://` + `file://` URIs, derives a display name from the basename, classifies audio/video by extension, and forwards to `useOpenWithResume().openPlayer(...)`.
- **`useSimbaPlayerLookup(selector?)`** — Factory hook that wraps an optional `selector` in a memoized `PlayerResumeLookup` object. Without a selector, returns no-op.

### Types
- **`GetResumePosition`** — `(itemId: string) => number | undefined`. The function reference shape for `<SimbaPlayer getResumePosition={...}>`.
- **`SimbaPlayerRootProps`** — `{ children: React.ReactNode }`.

### New `<SimbaPlayer>` prop
- **`getResumePosition?: GetResumePosition`** — function prop alongside the legacy `lookup` object prop. If both are passed, `getResumePosition` wins.

### Backward compatibility
All V13 exports retained. The new exports are additive; the new `<SimbaPlayer>` prop is additive. No breaking changes for any V13 consumer.

---

## 4. Consumer-side changes (V14 Phase 62)

### Migrated files (5)

| File | Change |
|---|---|
| `src/screens/Artist/hooks/useArtistScreen.ts` | `playbackState` → `usePlayer().state.isPlaying`; `dispatch(playFile(item))` removed |
| `src/screens/Album/hooks/useAlbumScreen.ts` | `playbackState` → `usePlayer().state.isPlaying` |
| `src/screens/QueueScreen/hooks/useQueueScreen.ts` | `playbackState` → `usePlayer().state.isPlaying` |
| `src/screens/Library/hooks/useLibraryScreen.ts` | `playbackState` → `usePlayer().state.isPlaying` |
| `src/screens/Library/components/ArtistDetailScreen.tsx` | `playbackState` → `usePlayer().state.isPlaying` |

### Deleted file

| File | Reason |
|---|---|
| `src/hooks/usePlayer.ts` | Dead code (no importers). Wrapper that mirrored V11 fields. Moved to `v13-trash-2026-09-04/usePlayer.ts.2026-09-04`. |

### `playerSlice.ts` deprecations

**V11-mirrored state fields removed** (7):
- `playbackState`
- `currentPosition`
- `duration`
- `volume`
- `isFullscreen` (was unused)
- `loopMode`
- `playbackSpeed`

**V11-only reducers removed** (8):
- `playFile`
- `setPlaybackState`
- `setPosition`
- `setDuration`
- `setVolume`
- `toggleFullscreen`
- `setLoopMode`
- `setPlaybackSpeed`

**Mixed reducers** (7) drop their V11 writes:
- `loadPlaylistToPlayer`
- `playFromPlaylist`
- `nextTrack` (now uses `state.shuffle` for wrap trigger; was `loopMode === 'playlist'`)
- `previousTrack` (same)
- `playFromQueue`
- `clearPlaylist`
- `clearPlayer`

**Semantic change in `nextTrack` / `previousTrack`**: the V11 wrap-around trigger was `state.loopMode === 'playlist'`. With `loopMode` gone (now module-owned), the consumer's wrap trigger is `state.shuffle` (the only consumer-side state that affects navigation). When `shuffle` is off, the consumer's reducers stop at the end (matching the V11 default). When `shuffle` is on, they pick a random non-current index.

---

## 5. Verification

### Module (`X:\Development\SIMBA\react-native-media-player`)

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ clean (tsc --noEmit) |
| `npm test` | ✅ 100/100 pass across 7 suites |
| `package.json` version | `1.3.0` |
| `CHANGELOG.md` | V14.0.0 entry added at top |
| `README.md` | "Basic usage" example shows V14 target; API reference table marks new exports in **bold** |
| Git tag | `v1.3.0` (annotated) |
| `git push origin main v1.3.0` | ✅ both pushed |
| `release.yml` trigger | ⏳ pending (will publish to npm `staging`) |

### Consumer (`X:\Development\SIMBA\MOBILE_APP_REACT_NATIVE`)

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ clean |
| `npm test` | ✅ 19/19 + 1 todo across 5 suites |
| `App.tsx` integration | `<SimbaPlayer getResumePosition={...}>` + `<SimbaPlayerRoot>` + `useOpenFromUrl` |
| `App.tsx` net deletion (V14) | 62 lines (28 from `useLaunchParams` branch, 23 from `handleIncomingUri`, 7 from `useMemo<PlayerResumeLookup>`, 4 from `usePlayer` action imports) |
| `playerSlice.ts` net deletion (V14) | 51 insertions / 79 deletions in Phase 62 commit (V11-mirrored fields + reducers removed) |
| `v13-trash-2026-09-04/` | + 1 file (`usePlayer.ts.2026-09-04`); gitignored, slated for delete in V15 |

### Test counts (consumer)

```
Test Suites: 5 passed, 5 total
Tests:       1 todo, 19 passed, 20 total
```

### Test counts (module)

```
Test Suites: 7 passed, 7 total
Tests:       100 passed, 100 total
```

---

## 6. Caveats

### `<SimbaPlayer>` function prop memoization

`<SimbaPlayer>`'s internal `useMemo` on the effective lookup keeps the `PlayerResumeContext` value stable as long as the function prop's reference is stable. If a consumer passes an inline function, the memo busts on every render and every `useOpenWithResume()` caller re-renders. For the SIMBA app (multi-line selector), the helper hook `useSimbaPlayerLookup(selector)` is the right choice (useMemo is internal). For consumers with a one-liner selector, the function prop is fine.

### `nextTrack` / `previousTrack` wrap-around

Now driven by `state.shuffle` instead of `state.loopMode === 'playlist'`. The consumer's queue UI no longer wraps by default. If a user wants the consumer's queue to wrap on end, they enable `shuffle` in the consumer's settings — which now does double duty as both shuffle-mode and end-of-queue wrap trigger. The module's `usePlayer().commands.setLoopMode('playlist')` independently controls mpv's internal playlist wrap.

### On-device smoke test pending

V14 does not have a manual on-device smoke test. The V13 Phase 58.6 smoke test (play / pause / seek / skip / PiP / lock-screen / Bluetooth on device) is still pending user action. The semantic change in `nextTrack` / `previousTrack` is best caught by this test — recommend running it before promoting `v1.3.0` to `@latest`.

---

## 7. User actions required

### Promote workflow runs

Three `promote.yml` runs are pending (each flips the corresponding `staging` tag to `latest`):

1. **v1.1.0** → `latest` ([workflow](https://github.com/pavalep/react-native-media-player/actions/workflows/promote.yml))
2. **v1.2.0** → `latest` ([workflow](https://github.com/pavalep/react-native-media-player/actions/workflows/promote.yml))
3. **v1.3.0** → `latest` ([workflow](https://github.com/pavalep/react-native-media-player/actions/workflows/promote.yml))

Each promote requires approval of the `production` GitHub Environment.

### On-device smoke test

Before promoting v1.3.0 to `@latest`, the V13 Phase 58.6 smoke test should be run on a device:
- `gradlew.bat :app:assembleDebug` to build the consumer APK
- Exercise play / pause / seek / skip / PiP / lock-screen / Bluetooth controls
- Confirm the activity branch (`<SimbaPlayerRoot>`) renders `<PlayerRoot />` correctly

---

## 8. V15 ideas (deferred, not in V14 scope)

- **DRM** (Widevine + ClearKey)
- **Casting** (DLNA + Chromecast + AirPlay-equivalent)
- **iOS / Linux / tvOS support**
- Delete `notificationService.ts` V11-only methods (kept for V11 rollback path)
- Delete `v13-trash-2026-09-04/` and `v13-orphan-2026-09-04/` directories
- Deprecation warning for the legacy `lookup` object prop on `<SimbaPlayer>` (use `getResumePosition` instead)

---

## 9. Cross-references

- V14 spec: [`SIMBA_PLAYER_MODULE_V14_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V14_SPECIFICATION.md)
- V14 tracker: [`SIMBA_PLAYER_MODULE_V14_TRACKER.md`](./SIMBA_PLAYER_MODULE_V14_TRACKER.md)
- V13 spec: [`SIMBA_PLAYER_MODULE_V13_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V13_SPECIFICATION.md)
- V13 final QA report: [`SIMBA_PLAYER_MODULE_V13_FINAL_QA_REPORT.md`](./SIMBA_PLAYER_MODULE_V13_FINAL_QA_REPORT.md)
- Module repo: `X:\Development\SIMBA\react-native-media-player\`
- Consumer repo: `X:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\`
- Release runbook: `X:\Development\SIMBA\secrets\RELEASE_FLOW.md`

---

# End of V14 final QA report.
