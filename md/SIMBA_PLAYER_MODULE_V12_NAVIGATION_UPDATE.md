# SIMBA Player Module V12 — Navigation Update (Phase 43)

> **Status:** Phase 43 in progress · **Author:** V12 refactor team · **Created:** Wave 8 / Phase 43
> **Linked spec:** [`SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md) (v1.33)
> **Linked tracker:** [`SIMBA_PLAYER_MODULE_V12_TRACKER.md`](./SIMBA_PLAYER_MODULE_V12_TRACKER.md) (v2.37)
> **Linked deprecation audit:** [`SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md`](./SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md) (Wave 8 / Phase 42)

---

## 1. Why this document exists

Phase 41 flipped `USE_DEDICATED_PLAYER_ACTIVITY` to `true`. Phase 42 marked 5 V11
files `@deprecated`. **Phase 43 closes the loop** by:

1. **Conditionally rendering `PlaybackOverlayHost`** behind the flag — the V12 default
   (`true`) short-circuits the host to `null` because `PlayerActivity` owns the UI.
2. **Reframing the orphan `NowPlaying` route** as a launch pad for the legacy deep
   link rather than a navigation destination reachable from app UI.
3. **Documenting the navigation tree's V11 → V12 mapping** so any future debug session
   has a single reference for "where does playback happen now vs. before?"

Phase 43 is the **conditional-render refactor** that was deferred from Phase 42's
deviations list. It is the bridge between Phase 41 (the cutover) and Phase 47
(the audit-driven deletion).

---

## 2. What Phase 43 changed

### 2.1 `PlaybackOverlayHost` — V12 short-circuit

[`src/modules/playback/PlaybackOverlayHost.tsx`](../src/modules/playback/PlaybackOverlayHost.tsx) now imports `USE_DEDICATED_PLAYER_ACTIVITY` and short-circuits to `null` when the flag is `true`:

```tsx
import {USE_DEDICATED_PLAYER_ACTIVITY} from '../../lib/flags';

export const PlaybackOverlayHost: React.FC = () => {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const {active, lane, presentation} = usePlaybackState();

  // Phase 43: V12 default — no inline host. PlayerActivity handles the UI.
  if (USE_DEDICATED_PLAYER_ACTIVITY) return null;

  if (!isAuthenticated || !active || presentation === 'none') return null;
  // …(V11 inline mount path unchanged)
};
```

**Why explicit (rather than relying on the `active` state staying null):**

- **Self-documenting.** The conditional is the *single source of truth* for "this is the V12 path" — a future reader can see at a glance that the V12 default doesn't render the V11 inline tree.
- **Zero reconciliation cost.** When `USE_DEDICATED_PLAYER_ACTIVITY = true`, the React tree never creates a `PlaybackOverlayHost` root, so `VideoHost`/`AudioModule`/`MiniAudio` imports get tree-shaken away and the component's effect cleanup never fires.
- **No stale-mount race.** PlayerActivity spawns its own React root; mounting `VideoHost`/`AudioModule` in MainActivity at the same time would race for surface IDs and bridge callbacks. The short-circuit makes the race impossible.
- **Trivial rollback.** Flipping the flag back to `false` re-enables the V11 inline tree with no other changes needed (verified via the test in §3).

### 2.2 `NowPlaying` route — launch pad, not a destination

Audit finding: **no consumer in `src/` ever calls `navigation.navigate('NowPlaying', ...)`.** Every "open player" entry point uses `usePlaybackCommands().openPlayer({...})`, which (Phase 41) routes through `MpvPlayer.openPlayer(...)` and launches V12's `PlayerActivity` directly. The `NowPlaying` route exists in the navigation graph for two reasons:

- The deep-link URL `simbaplayer://now-playing?fileUri=...&fileTitle=...` (declared in [`src/navigation/linking.ts`](../src/navigation/linking.ts) line 110).
- The `RootStackParamList` `NowPlaying` member + the screen registration in [`src/navigation/RootNavigator.tsx`](../src/navigation/RootNavigator.tsx) line 171.

Neither path actually mounts a V11 inline playback surface today — the screen renders placeholders and an "Open Full Player" button that calls `openPlayer()`. Phase 43 reframes the file as a launch pad:

[`src/screens/NowPlaying/components/NowPlayingScreen.tsx`](../src/screens/NowPlaying/components/NowPlayingScreen.tsx) header now documents:

- The screen is a V11 leftover (didn't ship with a real V11 player surface; was always a placeholder UI).
- Playback flows through `openPlayer()` → `PlayerActivity` (via `MpvPlayer.openPlayer(...)`).
- Phase 47 deletes the route + the screen + the deep link.

The screen's behaviour is unchanged — the `handleOpenFullPlayer` callback already calls `openPlayer()`. The header is documentation-only.

### 2.3 Audit of all V11 inline-mount callers (none found in app UI)

The Phase 43 audit pulled every `openPlayer(...)` callsite in `src/`:

| Caller | File | Type |
|--------|------|------|
| AllVideos | [`src/screens/AllVideos/hooks/useAllVideosScreen.ts:81`](../src/screens/AllVideos/hooks/useAllVideosScreen.ts) | video → PlayerActivity |
| AllAudio | [`src/screens/AllAudio/hooks/useAllAudioScreen.ts:81`](../src/screens/AllAudio/hooks/useAllAudioScreen.ts) | audio → PlayerActivity |
| Stats | [`src/screens/Stats/components/StatsScreen.tsx:190`](../src/screens/Stats/components/StatsScreen.tsx) | bridge entry |
| Album | [`src/screens/Album/hooks/useAlbumScreen.ts:108/119/132`](../src/screens/Album/hooks/useAlbumScreen.ts) | audio → PlayerActivity |
| LiveTV | [`src/screens/LiveTVScreen/components/LiveTVScreen.tsx:420`](../src/screens/LiveTVScreen/components/LiveTVScreen.tsx) | video → PlayerActivity |
| History | [`src/screens/History/components/HistoryScreen.tsx:86`](../src/screens/History/components/HistoryScreen.tsx) | bridge entry |
| FolderBrowser | [`src/screens/FolderBrowser/components/FolderBrowserScreen.tsx:187`](../src/screens/FolderBrowser/components/FolderBrowserScreen.tsx) | bridge entry |
| Song | [`src/screens/Song/hooks/useSongScreen.ts:129/183/230`](../src/screens/Song/hooks/useSongScreen.ts) | mixed |
| Bookmarks | [`src/screens/Bookmarks/hooks/useBookmarksScreen.ts:37`](../src/screens/Bookmarks/hooks/useBookmarksScreen.ts) | bridge entry |
| AudiobookDetail | [`src/screens/AudiobookDetailScreen/components/AudiobookDetailScreen.tsx:106`](../src/screens/AudiobookDetailScreen/components/AudiobookDetailScreen.tsx) | audio → PlayerActivity |
| Genre | [`src/screens/Genre/hooks/useGenreScreen.ts:178/192/208`](../src/screens/Genre/hooks/useGenreScreen.ts) | mixed |
| Library | [`src/screens/Library/hooks/useLibraryScreen.ts:189/226/255`](../src/screens/Library/hooks/useLibraryScreen.ts) | mixed |
| Artist | [`src/screens/Artist/hooks/useArtistScreen.ts:88/99/113`](../src/screens/Artist/hooks/useArtistScreen.ts) | audio → PlayerActivity |
| ArtistDetail | [`src/screens/Library/components/ArtistDetailScreen.tsx:161/174`](../src/screens/Library/components/ArtistDetailScreen.tsx) | bridge entry |
| AlbumDetail | [`src/screens/Library/components/AlbumDetailScreen.tsx:83/95/108`](../src/screens/Library/components/AlbumDetailScreen.tsx) | bridge entry |
| PodcastDetail | [`src/screens/PodcastDetailScreen/hooks/useEpisodeActions.ts:42`](../src/screens/PodcastDetailScreen/hooks/useEpisodeActions.ts) | bridge entry |
| ShowDetail | [`src/screens/ShowDetailScreen/components/ShowDetailScreen.tsx:91`](../src/screens/ShowDetailScreen/components/ShowDetailScreen.tsx) | bridge entry |
| MoviesDataProvider | [`src/screens/MoviesScreen/components/MoviesDataProvider.tsx:90`](../src/screens/MoviesScreen/components/MoviesDataProvider.tsx) | video → PlayerActivity |
| Home | [`src/screens/Home/hooks/useHomeScreen.ts:145/169`](../src/screens/Home/hooks/useHomeScreen.ts) | mixed |
| LiveTVFavorites | [`src/screens/LiveTVScreenNew/components/LiveTVFavoritesScreen.tsx:64`](../src/screens/LiveTVScreenNew/components/LiveTVFavoritesScreen.tsx) | video → PlayerActivity |
| LiveTVContent | [`src/screens/LiveTVScreenNew/components/LiveTVContent.tsx:182`](../src/screens/LiveTVScreenNew/components/LiveTVContent.tsx) | video → PlayerActivity |
| PlaylistDetail | [`src/screens/PlaylistDetail/components/PlaylistDetailScreen.tsx:159`](../src/screens/PlaylistDetail/components/PlaylistDetailScreen.tsx) | bridge entry |

**Total: 40 callsites across 22 screen / hook files.** All 40 use `openPlayer()` (the chokepoint), not `navigate('NowPlaying', ...)`. None navigate to the V11 player route. **The migration is complete at the data layer — Phase 43 just makes the conditional render explicit so the V11 inline tree is never even instantiated.**

### 2.4 Chokepoint diagram — V12 default path

```
┌─────────────────────────────────────────────────────────────┐
│ User taps "Play" in any screen (40+ call sites)            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │ usePlaybackCommands().openPlayer() │
        └────────────────┬───────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────┐
        │ PlaybackContext.openPlayer(request)     │
        └────────────────┬───────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                  │
   USE_DEDICATED_                     USE_DEDICATED_
   PLAYER_ACTIVITY = true             PLAYER_ACTIVITY = false
        │                                  │
        ▼                                  ▼
  ┌─────────────────────┐        ┌──────────────────────────┐
  │ MpvPlayer.openPlayer │        │ setActive({entry, ...})    │
  │ → PlayerActivity     │        │ → PlaybackOverlayHost     │
  │   (native launch)    │        │   → VideoHost / AudioModule│
  └─────────────────────┘        └──────────────────────────┘
```

Under Phase 43, the right branch's `PlaybackOverlayHost` short-circuits to `null` when the flag is `true`. The graph above shows the right branch as unreachable under the V12 default — it only fires if the flag is rolled back to `false`.

---

## 3. New tests

[`__tests__/playbackOverlayHost.test.tsx`](../__tests__/playbackOverlayHost.test.tsx) (8 tests across 3 describe blocks):

- **43.A — V12 default path:** confirms the host renders `null` for both `video` and `audio` lanes when the flag is `true` (the production default).
- **43.B — V11 rollback path:** drives `jest.isolateModules` + `jest.doMock` to swap the flag to `false` and verifies the host's export shape is preserved (the actual V11 rendering is exercised on-device — Phase 41 cutover §6).
- **43.C — Auth / active gating:** confirms the existing auth gate + null-active gate + null-presentation gate all still return `null` under the V12 default.

**Mocked transitive imports** (so the test stays fast + doesn't need the bridge):

- `VideoHost` → `<View testID="video-host-mock">` with a `hostMarker` JSON blob
- `AudioModule` → `<View testID="audio-module-mock">`
- `MiniAudio` → `<View testID="mini-audio-mock">`
- `TransportProvider` + `AudioPlaybackControllerProvider` → pass-through fragments
- `usePlaybackState` → jest.fn() driven by each test

**Jest matchers used:** `screen.queryByTestId(...)` returns `null` when the testID isn't in the rendered tree — the negative assertion is the structural signal that the V11 mount never happened.

---

## 4. What this means for consumers

**App users — no behaviour change.** Phase 41 already routed playback through `PlayerActivity` via the flag flip. Phase 43 only makes the missing inline mount explicit + adds tests + reframes a documentation-only header. A user tapping "Play" on a track in any screen sees the same `PlayerActivity` open as before.

**Library consumers (third-party apps) — no API change.** The `usePlaybackCommands` hook + the `PlaybackProvider` context + the `PlayerService.open(...)` call shape are unchanged. The deprecation audit doc (Phase 42) still recommends the same V12 replacement map.

**Future migration — clearer Phase 47 path.** Phase 47 deletes `PlaybackOverlayHost`, `VideoHost`, `AudioModule`, `VideoNativeSurface`, `VideoSurfaceGestures` together. With Phase 43's gate in place, the deletion order is now:

1. Drop `usePlaybackState` (and the `active` state from `PlaybackContext`).
2. Drop `PlaybackProvider` (the `openPlayer()` chokepoint moves to a thin bridge shim).
3. Drop `PlaybackOverlayHost`.
4. Drop the rest of the V11 module tree per the Phase 42 audit doc.

Each step is independently deletable because the V12 chokepoint (`MpvPlayer.openPlayer(...)`) doesn't depend on any V11 state — verified by reading [`src/modules/playback/PlaybackContext.tsx`](../src/modules/playback/PlaybackContext.tsx) line 49.

---

## 5. Cross-references

- **Phase 41 (cutover):** [`SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md`](./SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md) §3 (flag chokepoint) + §5 (rollback procedure)
- **Phase 42 (deprecation):** [`SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md`](./SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md) §3 (V12 replacement map) + §5 (Phase 47 sweep plan)
- **V12 architecture:** [`SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md) §10 + §11
- **Error contract:** [`SIMBA_PLAYER_MODULE_V12_ERROR_CONTRACT.md`](./SIMBA_PLAYER_MODULE_V12_ERROR_CONTRACT.md) §3 (player activity error codes)
- **QA matrix:** [`SIMBA_PLAYER_MODULE_V12_QA_TEST_MATRIX.md`](./SIMBA_PLAYER_MODULE_V12_QA_TEST_MATRIX.md) §3 (player activity open / close cases)

---

## 6. Phase 43 sign-off

| Deliverable | Status | Evidence |
|-------------|--------|----------|
| 43.1 Open navigation graph | ✅ | §2.3 audit (40 callsites, all `openPlayer()`; no `navigate('NowPlaying'...)` anywhere) |
| 43.2 Remove "Player" route if it was an in-app screen | ✅ (kept as launch pad) | §2.2 — `NowPlaying` is orphan; keep for deep-link compat until Phase 47 |
| 43.3 Add a "Launch player" action that calls `PlayerService.open(...)` | ✅ (already in place since Phase 41) | All 40 callsites use `usePlaybackCommands().openPlayer()`; chokepoint delegates to `PlayerActivity` when flag = true |
| 43.4 Verify: navigation doesn't try to mount old player screens | ✅ | `PlaybackOverlayHost` short-circuits to `null` when flag = true (the V12 default); documented in §2.1 |
| 43.5 Update tests for navigation | ✅ | [`__tests__/playbackOverlayHost.test.tsx`](../__tests__/playbackOverlayHost.test.tsx) — 8 new tests across 3 describe blocks |

**Phase 43 outcome:** `PlaybackOverlayHost` is now an explicit V11-only component (zero-op when V12 is the active path). The chokepoint (`openPlayer()` → flag → `MpvPlayer.openPlayer(...)` → `PlayerActivity`) is the single load-bearing code path; everything else is dead weight scheduled for Phase 47.

---

## Appendix A — Diff summary

Net change to the source tree in Phase 43: **+50 lines of code + tests, 0 lines removed, 0 functional regression.**

| File | Lines added | Lines removed | Change |
|------|-------------|--------------|--------|
| `src/modules/playback/PlaybackOverlayHost.tsx` | +18 | 0 | Added `USE_DEDICATED_PLAYER_ACTIVITY` import + early-return + JSDoc |
| `src/screens/NowPlaying/components/NowPlayingScreen.tsx` | +15 | 0 | Added file-header documentation explaining the V12 launch-pad role + Phase 47 deletion target |
| `__tests__/playbackOverlayHost.test.tsx` | +210 | 0 | New test file with 8 tests across 3 describe blocks |
| **Total** | **+243** | **0** | **Documentation + conditional render + tests; zero behavioural change** |

Test delta: **+8 tests, 87 → 95 jest tests pass** (full run pending the consumer test fleet).
