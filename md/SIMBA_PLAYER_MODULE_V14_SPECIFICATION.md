# SIMBA Player Module — V14 Specification

**Document Version:** 1.0
**Date Created:** 2026-09-04
**Last Updated:** 2026-09-04
**Target Release:** V14.0.0
**Package Name:** `@simba-dev/react-native-media-player`
**Folder Name:** `react-native-media-player/`
**NPM Org:** `@simba-dev`
**Status:** Wave 10 kickoff · **Phases 59-63 (5 phases, ~2 working days)**
**Owners:** Mobile team
**Replaces:** nothing — V14 is a forward-looking DX polish on top of the V13 extraction
**Linked spec:** [`SIMBA_PLAYER_MODULE_V13_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V13_SPECIFICATION.md) (V13 = the extraction; V14 = the public surface polish)
**Linked tracker:** [`SIMBA_PLAYER_MODULE_V14_TRACKER.md`](./SIMBA_PLAYER_MODULE_V14_TRACKER.md)

---

## 0. Purpose

V13 (Phases 50-58) **completed the extraction** — every V11 inline player file is deleted from the consumer; the module owns the bridge + state + UI. V14's charter is different and explicit: **make the integration so simple that a junior dev can ship a working player with one import + one wrapper component + zero glue code.**

V13 left a residue of glue in the consumer's app:

- A 20-line `resumeLookup` function (bookmark-slice-walking) in `App.tsx`.
- A 12-line `handleIncomingUri` deep-link handler that re-implements URI → title parsing.
- A 25-line activity branch (`useLaunchParams()` → conditional `<PlayerRoot />` or navigator) in `App.tsx`.
- A 16KB V11 `playerSlice` whose 7 fields (`playbackState`, `currentPosition`, `duration`, `volume`, `playbackSpeed`, `loopMode`, `isFullscreen`) duplicate fields the module's `PlayerState` already owns.
- A `usePlayer()` consumer hook in `src/hooks/usePlayer.ts` that dispatches the V11-mirrored slice.

A junior dev integrating `@simba-dev/react-native-media-player` for the first time should not need to write any of this. V14 absorbs it.

### Why we changed scope from V14_PLANNING.md

V14_PLANNING.md originally scoped DRM + Casting + iOS + Cleanup for V14. After V13 shipped, the post-V13 audit surfaced a higher-priority gap: **the public surface is too complex for a junior dev to integrate cleanly**. The V13 extraction was a necessary cleanup; the V14 DX polish is the **production-readiness** layer that makes the module genuinely usable by anyone other than the SIMBA team.

DRM, Casting, and iOS are deferred to V15.

---

## 1. Status Legend

- [ ] = Pending
- [~] = In Progress
- [x] = Complete
- [!] = Blocked
- [-] = Deferred (out of V14 scope)

Each phase has a **status** field. Each step is a checkbox.

---

## 2. Wave & Phase Index

| Wave | Phases | Theme | Status |
|---|---|---|---|
| **W10** | 59-63 | Junior-dev-level integration polish | [ ] Pending |

**Total: 1 wave, 5 phases, ~2 working days.**

V14 stays in one wave because every phase is a small, self-contained addition to the module's public surface. No consumer-side migration is required — V14 is backward-compatible additive.

---

### Phase 59 — `<SimbaPlayerRoot>` activity-branch wrapper

**Status:** [ ] Pending
**Estimated effort:** 0.5 day
**Deliverable:** A single component that handles the `useLaunchParams()` + activity branch. The consumer's `AppContent` no longer needs to write the `if (launchParams) return <PlayerRoot />` switch.

#### Sub-phase 59.1 — Define `<SimbaPlayerRoot>`

The component is a thin wrapper around `useLaunchParams()` + conditional render:

- If `launchParams` is non-null → render `<PlayerRoot />` (the activity's content)
- Else → render `children` (the regular app)

```tsx
// Module API
<SimbaPlayerRoot fallback={<YourApp />}>
  {/* nothing — SimbaPlayerRoot is the entire branch */}
</SimbaPlayerRoot>
```

Or with children for the fallback path:

```tsx
<SimbaPlayerRoot>
  <YourNavigator />
</SimbaPlayerRoot>
```

#### Sub-phase 59.2 — Re-export from index

Add `SimbaPlayerRoot` + `SimbaPlayerRootProps` to the module's `src/index.ts`.

#### Sub-phase 59.3 — Consumer migration

- Update `App.tsx` to use `<SimbaPlayerRoot>` instead of the manual `useLaunchParams()` branch. Net deletion: ~25 lines.
- Verify typecheck + jest.

---

### Phase 60 — `useOpenFromUrl` / `openFromUrl` deep-link helper

**Status:** [ ] Pending
**Estimated effort:** 0.25 day
**Deliverable:** A single hook (or function) that takes a `content://` or `file://` URI and calls `openPlayer` with the right title + type. The consumer's `handleIncomingUri` is deleted.

#### Sub-phase 60.1 — Define `useOpenFromUrl`

A hook returning a single function:

```tsx
const openFromUrl = useOpenFromUrl();

useEffect(() => {
  const sub = Linking.addEventListener('url', ({ url }) => openFromUrl(url));
  return () => sub.remove();
}, [openFromUrl]);

Linking.getInitialURL().then(url => url && openFromUrl(url));
```

The hook internally:
- Filters for `content://` and `file://` URIs
- Derives a display name from the URI's basename
- Classifies the media type via `getMediaType()` (or an internal URI-extension check)
- Calls `useOpenWithResume().openPlayer({uri, title, type, resumeId: uri})` (so the bookmark lookup runs)

#### Sub-phase 60.2 — Re-export from index

Add `useOpenFromUrl` to the module's `src/index.ts`.

#### Sub-phase 60.3 — Consumer migration

- Replace the `handleIncomingUri` function in `App.tsx` (12 lines) with the hook + the `Linking.addEventListener` boilerplate.
- Net deletion: ~10 lines + 1 function.

---

### Phase 61 — `<SimbaPlayer>` with built-in default lookup helpers

**Status:** [ ] Pending
**Estimated effort:** 0.5 day
**Deliverable:** The `<SimbaPlayer>` component accepts a `getResumePosition` adapter directly (instead of the current `PlayerResumeLookup` object shape), and ships a `useSimbaPlayerLookup()` hook that returns a sensible default for a Redux-backed bookmarks slice. The consumer's 20-line resume-lookup function in `App.tsx` collapses to a 2-line hook call.

#### Sub-phase 61.1 — Refine `<SimbaPlayer>` API

Two API shapes (we ship both for compatibility):

1. **Current shape (backward-compat):**
   ```tsx
   <SimbaPlayer lookup={lookupObj}>...</SimbaPlayer>
   ```

2. **New shape (DX):**
   ```tsx
   <SimbaPlayer getResumePosition={(uri) => store.getState().bookmarks.byFileUri[uri]?.positionMs}>
     ...
   </SimbaPlayer>
   ```

If both are passed, `getResumePosition` wins. The new shape is one function reference instead of an object literal.

#### Sub-phase 61.2 — `useSimbaPlayerLookup()` helper

A thin factory hook that the consumer can drop in:

```tsx
// Module
export function useSimbaPlayerLookup(): PlayerResumeLookup {
  return useMemo(() => ({
    getResumePosition: (uri) => {
      // no-op default; the consumer can compose with their slice
      return 0;
    },
  }), []);
}
```

The consumer overrides or composes with their slice. The point of `useSimbaPlayerLookup` is to ship the **shape** so the consumer's `lookup={}` is always type-safe.

#### Sub-phase 61.3 — Re-export

Add the new prop to `<SimbaPlayer>` + export `useSimbaPlayerLookup` from the index.

#### Sub-phase 61.4 — Consumer migration

- Replace the 20-line `resumeLookup` function in `App.tsx` with a 2-line `useSimbaPlayerLookup()` call (or a direct function reference to a slice selector).
- Net deletion: ~18 lines.

---

### Phase 62 — Deprecate the consumer's `playerSlice` V11-mirror

**Status:** [ ] Pending
**Estimated effort:** 1 day
**Deliverable:** The 17 consumer files that read `state.player.playbackState` / `state.player.currentPosition` / etc. switch to the module's `usePlayer()` (or `usePlayerActivity()`) for those fields. The 16KB `playerSlice` retains only the consumer-specific state (playlist, queue, currentIndex, playbackHistory, liked, equalizer, sleep timer).

#### Sub-phase 62.1 — Audit the 17 dependent files

The 17 files importing from `playerSlice`:

- `useQueueScreen`, `useArtistScreen`, `useAlbumScreen`, `useAudiobookDetailScreen`, `useArchiveItemDetailScreen`, `useSongScreen`, `useEpisodeActions`, `usePlaylistDetailScreen`, `useLibraryScreen`
- `useQueueScreen` (the screen file, not the hook)
- `useQueueActions`, `ArtistTopTracks`, `PlaylistPreviewSheet`, `QueueManagementSheet`, `QueueItem`, `QueueSheet`
- `usePlayer` (the consumer's hook in `src/hooks/usePlayer.ts`)

#### Sub-phase 62.2 — Identify which fields are mirrored

For each file, audit which of the `state.player.X` reads are for the V11-mirrored fields:

- `playbackState` (= `isPlaying`)
- `currentPosition` (= `positionMs`)
- `duration` (= `durationMs`)
- `volume` (= `volume`)
- `playbackSpeed` (= `speed`)
- `loopMode` (= `loopMode`)
- `isFullscreen` (= ??? — not in the module)

Each consumer file that reads one of these switches to `usePlayer()` / `usePlayerActivity()` for the source of truth.

The list-management fields (`playlist`, `queue`, `currentIndex`, `playbackHistory`, `selectedQueueIndices`, `liked`, `equalizerGains`, `equalizerEnabled`, `sleepTimerEndTime`, `sleepTimerMode`) stay in the consumer's `playerSlice` — they're consumer-specific persistence / UI state.

#### Sub-phase 62.3 — Re-migrate each file

For each of the 17 files, swap `useAppSelector(state => state.player.playbackState)` (etc.) for `usePlayer().state.isPlaying` (etc.). The `usePlayer` hook in `src/hooks/usePlayer.ts` either:
- Is rewritten to delegate to the module's `usePlayer()`, OR
- Is deleted and the 17 files switch to `usePlayer()` directly.

#### Sub-phase 62.4 — Trim the `playerSlice`

Remove the V11-mirrored fields from `playerSlice` (and the corresponding reducers). The slice shrinks from 16KB to ~6KB. The `playFile` reducer (which dispatches to the module) is replaced by the consumer's UI calling `usePlayerActivity().openPlayer(...)` directly.

#### Sub-phase 62.5 — Verify

- `tsc --noEmit` clean
- `npm test` 19/19 (no new failures; the 2 previously-failing V11 tests are gone from Phase 57)
- Manual smoke test: play / pause / seek / skip / volume / speed / loopMode still work

---

### Phase 63 — Release v1.3.0

**Status:** [ ] Pending
**Estimated effort:** 0.25 day
**Deliverable:** Module published as `1.3.0` with the new V14 public surface. Final QA report.

#### Sub-phase 63.1 — Bump version

- Bump `package.json` to `1.3.0`
- Update `CHANGELOG.md` with V14.0.0 entry
- Update `README.md` to document the new APIs
- Update V14 spec + tracker

#### Sub-phase 63.2 — Tag + push

- `git tag v1.3.0 && git push origin v1.3.0` — `release.yml` publishes to npm `staging`
- Run `promote.yml` workflow → flips `1.3.0` to `latest`

#### Sub-phase 63.3 — Final QA

- `npm test` + `npm run typecheck` from both repos
- `md/SIMBA_PLAYER_MODULE_V14_FINAL_QA_REPORT.md` (sign-off)
- Update `X:\Development\SIMBA\secrets\RELEASE_FLOW.md`

---

## 3. Public surface (V14 target)

After V14, the consumer's `App.tsx` for any app that wants a working player with bookmarks + deep links + activity launch is:

```tsx
import { SimbaPlayer, SimbaPlayerRoot, useOpenFromUrl, getMpvPlayerModule, PlayerRoot } from '@simba-dev/react-native-media-player';

const App = () => (
  <SimbaPlayer getResumePosition={(uri) => store.getState().bookmarks.byFileUri[uri]?.positionMs}>
    <AppContent />
  </SimbaPlayer>
);

const AppContent = () => {
  const openFromUrl = useOpenFromUrl();
  useEffect(() => Linking.addEventListener('url', ({url}) => openFromUrl(url)).remove, [openFromUrl]);
  return (
    <SimbaPlayerRoot>
      <YourNavigator />
    </SimbaPlayerRoot>
  );
};
```

That's it. **Two components, two hooks, one function reference for the lookup.** The launch-params branch, the deep-link parser, the bookmark-slice-walking — all gone. Every consumer's `App.tsx` reads identically.

For consumers that don't need bookmarks or deep links, the integration is even smaller:

```tsx
<SimbaPlayer>
  <YourApp />
</SimbaPlayer>
```

That's the entire integration. The "junior-dev-level" goal.

---

## 4. Out of scope (V15+)

- DRM (Widevine + ClearKey) — V15
- Casting (DLNA + Chromecast + AirPlay-equivalent) — V15
- iOS / Linux / tvOS support — V15
- The consumer's `notificationService.ts` V11-only methods (kept for the V11 rollback path) — could be deleted in V15 once the user confirms V11 rollback is no longer needed
- The `v13-trash-2026-09-04/` + `v13-orphan-2026-09-04/` directories — delete after V14 ships

---

## 5. Cross-references

- V13 spec: [`SIMBA_PLAYER_MODULE_V13_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V13_SPECIFICATION.md) — the extraction
- V14 tracker: [`SIMBA_PLAYER_MODULE_V14_TRACKER.md`](./SIMBA_PLAYER_MODULE_V14_TRACKER.md) — live status
- V13 final QA report: [`SIMBA_PLAYER_MODULE_V13_FINAL_QA_REPORT.md`](./SIMBA_PLAYER_MODULE_V13_FINAL_QA_REPORT.md)
- Module repo: `X:\Development\SIMBA\react-native-media-player\`
- Consumer repo: `X:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\`

---

# End of V14 specification doc.
