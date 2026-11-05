# SIMBA V23 — W24 tracker: the Home pinned rail, the single-lane playlist, and the render crash

> Date: 2026-11-05
> Reviewer: Paval EP (project owner)
> App repo: `MOBILE_APP_REACT_NATIVE`, branch `f5/w22-close-minimise-d9`
> Scope: three defects found and fixed in one wave — the Home rail that made
> pinning invisible, the `MIXED` playlist kind, and the "Maximum update depth
> exceeded" redbox on the Radio screen.
>
> **This file records what is true as of 2026-11-05.** The live defect
> register is [`SIMBA_BUG_TRACKER_2026_10_21.md`](SIMBA_BUG_TRACKER_2026_10_21.md);
> the current architecture decisions are
> [`SIMBA_V22_MASTER_PLAN.md`](SIMBA_V22_MASTER_PLAN.md).

## Outcome

| # | Defect | What changed | Device proof | Status |
|---|--------|--------------|--------------|--------|
| F-064 | Home's playlist rail made the **pin state invisible** — pinning had almost no effect anywhere | ONE rail titled **"Pinned Playlists"**, pinned playlists only, inside "Your Library", always visible, "See All" → All Playlists | **PROVEN** on emulator-5554 (API 37), 2026-11-05 | ✓ done |
| F-065 | The `MIXED` playlist kind — a list that spans two lanes | The kind is **deleted**; a persisted mixed record is **split** into its two halves; a cross-lane queue is **refused with a reason** | code-level (the migration runs at rehydrate) | ✓ done |
| F-066 | "Maximum update depth exceeded" on `<RadioScreenNew />` | 7 zustand selectors that allocated a new reference per call | **NOT YET** on the device | code done, device proof owed |

---

## F-064 — the pin state had no home

### What it was

`Playlist.pinned` existed in the model, `setPlaylistPinned` existed in the
store, `setPinned` existed in the facade — and after F-050 there was a pin
**toggle** on the management page. But nothing on **Home** showed the user
which of their playlists were pinned, so the pin state had no visible effect
anywhere except a badge on a management page.

Three defects stacked on top of each other:

1. **The rail's title.** F-050 (app `9c22f56`) retitled Home's rail from
   "Pinned Playlists" to "Playlists", because the rail rendered *unpinned*
   playlists too and a title that lies is a bug (spec §4.0 rule 4). That was
   the right call **then** — but it removed the only word on Home that said
   "pinned".
2. **The rail's place.** The playlist section was pushed **after** the
   "Discover" group (`useHomeScreen.ts:426` before this change). A personal
   shelf filed under discovery.
3. **The rail's existence.** `QuickAccessShelf.tsx:44` did
   `if (playlists.length === 0) { return null; }`. With no playlists at all,
   the rail **and its title** vanished — so there was nothing to grow into.

Measured on the emulator: the account had **zero** playlists, so Home showed
no playlist section at all. Pinning a playlist reordered a mixed rail that
the user could not see the meaning of.

### The decision (taken with the user, 2026-11-05)

- **One rail: "Pinned Playlists", pinned only.** Unpinned playlists live
  behind "See All" → All Playlists, where they can also be created and
  pinned.
- **The rail is always visible**, with an empty state that says what would
  fill it: *"Nothing pinned yet — pin a playlist to keep it here."*

### What landed

- `src/screens/Home/types/index.ts` — the section type is `PINNED_PLAYLISTS`
  and it carries `Playlist[]`.
- `src/screens/Home/hooks/useHomeScreen.ts` — the pinned list is computed
  from `playlists.filter(p => p.pinned)`, ordered by `pinnedAtMs` (recency of
  pinning, the ONE owner of that rule) and capped at
  `HOME_PLAYLIST_SHELF_LIMIT` (3). The section sits **inside "Your
  Library"**, right after "Recently Played" and before Bookmarks. The old
  mixed `pinned`/`unpinned`/`shelfPlaylists` computation is **deleted**.
- `src/screens/Home/index.tsx` — renders
  `<QuickAccessShelf title="Pinned Playlists" … emptyMessage="Nothing pinned yet — pin a playlist to keep it here." />`.
- `src/screens/Home/components/QuickAccessShelf.tsx` — a new **optional**
  `emptyMessage` prop. The collapse (`return null` when empty) is now
  **conditional**: callers that pass a message keep the rail; callers that
  do not still get the §4.11 collapse.

### The retractions, stated plainly

This change **supersedes two earlier decisions**, and the supersession is
recorded here rather than left to be discovered:

- **F-050's retitle to "Playlists"** is reversed — for **this** rail. It is
  legal now for one reason and one reason only: the rail holds **only**
  pinned playlists, so the title is true. It was not true in B-043, which is
  why it was renamed then.
- **Spec §4.11's collapse rule** is not broken globally — the
  `QuickAccessShelf` component still collapses by default. It is bypassed
  for this rail only, because an always-visible rail is what makes the pin
  state discoverable. The empty state is not a placeholder: it names the
  action that fills it.

### Evidence

- 10 new assertions, written **before** the implementation and failing
  first: `__tests__/screens/Home/HomeScreenPlaylistRail.test.tsx`,
  `__tests__/screens/Home/useHomeScreenPlaylistOrder.test.tsx`,
  `__tests__/screens/Home/QuickAccessShelf.test.tsx`,
  `__tests__/features/playlists/pinnedOrderAgrees.test.tsx`.
- The suite `__tests__/screens/Home/` — **5 suites / 25 tests**, all passing.
- **Device proof (emulator-5554, API 37, 2026-11-05).** A playlist named
  "Road Trip" was created through the New Playlist dialog and pinned. Home
  then showed, inside "Your Library" and between "Recently Played" and
  "Bookmarks": the title **"Pinned Playlists"**, a **"See All"** action, and
  the playlist card with its **pin badge** (`testID=playlist-pin-badge`,
  accessibility label "Pinned") and the caption "Jump back in". Tapping
  "See All" landed on **All Playlists**. The empty state was proven first
  (before any playlist existed): the rail was on screen with *"Nothing
  pinned yet — pin a playlist to keep it here."*

---

## F-065 — the mixed playlist kind is gone

### What it was

`MIXED` was a first-class `PlaylistKind`: one list carrying both audio and
video. It was made first-class in V13 on purpose — the pre-V13 store split
a mixed record into an audio sibling and a video sibling on the way in,
which destroyed the playlist (name, id, half its items) and told the user
nothing.

It was still the wrong shape. A list that spans two lanes is a **queue**,
not a playlist, and the mixed kind made every lane rule a special case:
`isPlaylistMediaKindAllowed` carried a second branch, the create modal
offered a third kind, the kind filter offered a chip on two pages, the
queue's "save as playlist" wrote one, and the store needed its own rehydrate
rule for it.

### The decision (taken with the user, 2026-11-05)

| Question | Answer |
|----------|--------|
| A mixed playlist already saved on a user's device | **Split into two** — "Name (Audio)" and "Name (Video)". Every item survives; the name survives on both halves. |
| "Save queue as playlist" on a queue that crosses lanes | **Refused**, with the reason on screen: *"This queue holds audio and video. A playlist holds one or the other — remove one lane to save it."* Nothing is dropped silently. |
| The `mixed` **folder** type in the Folder Linking Wizard | **Left alone.** A linked folder is a different domain, and the user chose to keep it. |

### What landed

- `src/types/playlist.ts` — `PlaylistKind` is now `'AUDIO_ONLY' |
  'VIDEO_ONLY'`. `SingleLanePlaylistKind` is **deleted** (it had two
  members). `PLAYLIST_KIND_LABELS` has two entries.
  `isPlaylistMediaKindAllowed` has **one** rule, not a rule and a special
  case.
- `src/state/playlistsStore.ts` — `normalizePlaylistRecord` is now **ONE
  record in, ONE OR TWO playlists out**. A record persisted with the removed
  kind is split into its audio half and its video half, each keeping the
  name plus its lane. The video half's id is **derived** (`<id>-video`), not
  generated, so the split is the same split on every boot until the
  normalised state is written back. A record that only ever held ONE lane
  folds into the playlist it actually is, under its own name and with no
  suffix. `LEGACY_MIXED_KIND` is the ONE place in `src/` that may name the
  removed kind.
- `src/features/playlists/index.ts` — the facade's lane check loses its
  mixed branch. It gains `playlistKindForItems(items)` (the ONE owner of
  "what kind is this playlist, if any") and `CROSS_LANE_QUEUE_REASON`.
- `src/features/library/presentation/related/localFilesConfig.ts` — the ONE
  chip list loses the Mixed entry, so the chip disappears from the Library
  **and** from the management page together.
- `src/components/playlist/PlaylistCreateModal/PlaylistCreateModal.tsx` —
  two kind options, and the `listMusic` fallback glyph goes with the third.
- `src/screens/QueueScreen/hooks/useQueueScreen.ts` + `components/QueueScreen.tsx`
  — the queue screen asks `playlistKindForItems`, and a cross-lane queue is
  refused. The reason is shown **in the modal** (the count line is replaced
  by it) and the Save button is disabled while it applies — a disabled
  control whose reason is on screen is not a dead control.
- `src/screens/PlaylistDetail/components/PlaylistDetailScreen.tsx` — the
  import refusal now says what the rule is: *"This file has audio and
  video — a playlist holds one or the other"*.

### What did NOT change, and why

- **The queue still crosses lanes.** The lane handover
  (`useLaneHandover` in `src/infrastructure/player/useResumeAwareLaunch.ts`)
  stays, and it is still needed: the user can play an album and then add a
  film to the queue. That is a **run**, not a playlist. The docblocks that
  used to cite the mixed playlist as the example now cite the queue.
- **The player's run still holds every lane.** `loadPlaylistToPlayer` and
  `addToPlaylist` are untouched.
- **The mixed FOLDER type** in the Folder Linking Wizard is untouched — see
  the decision table above.

### The retractions, stated plainly

Four places asserted the old behaviour and were rewritten in the same change,
because a claim that the code no longer supports is a false claim:

| Place | Was | Now |
|-------|-----|-----|
| `__tests__/state/playlistsStore.test.ts` | "A `MIXED` playlist is preserved WHOLE" | "a record persisted with the removed mixed kind is SPLIT into its two halves" |
| `__tests__/components/playlist/PlaylistCreateModal/PlaylistCreateModal.test.tsx` | "offers all THREE kinds" | "offers exactly two kinds" — and a **count**, so a third kind cannot slip in beside them |
| `__tests__/features/library/libraryPlaylistFilter.test.tsx` | "the Library playlist filter — the Mixed chip" | "the kind chips" |
| `__tests__/screens/AllPlaylists/AllPlaylistsScreen.filterChips.test.tsx` | "offers a MIXED chip" | "offers a chip for every kind" |

### Evidence

- **NEW** `__tests__/features/playlists/playlistKindIsSingleLane.test.ts`
  (10 tests) — the kind union is pinned twice (at runtime, through the
  labels, and at **compile time**, through an exact type equality that
  `tsc --noEmit` fails on), the chip list is pinned, and a source scan
  asserts the removed kind is named as a **value** in exactly one file under
  `src/` — the migration. The scan proves itself: it is fed a synthetic
  source it must flag and a prose source it must NOT flag, and the walker
  is asserted to reach the tree.
- **NEW** `__tests__/features/playlists/playlistKindForItems.test.ts`
  (6 tests) — the rule itself.
- **NEW** `__tests__/screens/QueueScreen/useQueueScreenSaveAsPlaylist.test.tsx`
  (3 tests) — a single-lane queue IS saved with the kind its items imply; a
  cross-lane queue is REFUSED and **nothing is written**; the refusal
  carries a reason that names both sides.
- `__tests__/state/playlistsStore.test.ts` — rewritten: the split keeps
  every item, keeps the name on both halves, gives the halves different ids,
  splits the **same way on every read**, keeps the pin on both halves, folds
  a single-lane record into one playlist under its own name, and still
  refuses a kind the allow-list refuses.
- **8 mutations, all killed**, every file restored byte-for-byte (SHA-256
  identical before and after):

  | # | Mutation | Killer |
  |---|----------|--------|
  | M1 | re-add `'MIXED'` to the `PlaylistKind` union | `playlistKindIsSingleLane.test.ts` (jest **and** tsc) |
  | M2 | stop splitting a persisted mixed record | `playlistsStore.test.ts` |
  | M3 | drop the "(Audio)" / "(Video)" name suffixes | `playlistsStore.test.ts` |
  | M4 | re-add the Mixed chip to the ONE chip list | `playlistKindIsSingleLane.test.ts` |
  | M5 | let a cross-lane set pick a kind instead of refusing | `playlistKindForItems.test.ts` |
  | M6 | let the queue save a cross-lane queue anyway | `useQueueScreenSaveAsPlaylist.test.tsx` |
  | M7 | re-add the Mixed option to the create modal | `PlaylistCreateModal.test.tsx` + `playlistKindIsSingleLane.test.ts` |
  | M8 | name the removed kind in a SECOND `src/` file | `playlistKindIsSingleLane.test.ts` |

  **M7 survived the first sweep.** The create-modal test asserted that the
  two known kinds were offered, and a THIRD chip beside them satisfied
  that. The test now **counts** the chips, and the mutation kills it.

---

## F-066 — "Maximum update depth exceeded" on the Radio screen

### What it was

React threw *"Maximum update depth exceeded"* on `<RadioScreenNew />`.

**Root cause (verified, not guessed).** zustand **5.0.15** compares a
selector's result with `Object.is` to decide whether the subscriber must
re-render. A selector that returns a **fresh array** on every call —
`s.items.filter(...)` — produces a reference that is never equal to the
previous one, so `useSyncExternalStore` re-renders forever. React throws at
50 nested updates.

Measured on emulator-5554 (API 37) on 2026-11-05 against
`src/screens/RadioScreenNew/hooks/useRadioBrowser.ts:239`:

```ts
const favorites = useLiveFavoritesStore(s =>
  s.items.filter(f => f.kind === 'radio'),
);
```

A sweep of `src/` found **seven** sites with the same shape — the Radio
browser, the Radio favourites screen, the Live TV browser, the Live TV
favourites screen, the album detail screen, the artist detail screen and
the album enrichment hook. The repo had already been bitten by this exact
class twice and fixed it the same way both times
(`src/screens/Artist/hooks/useArtistScreen.ts:31-42` and
`src/screens/Album/hooks/useAlbumScreen.ts:31-46`): **select the stable
array, derive outside the selector.**

### What landed

All seven now select the raw array and derive with `useMemo` — the repo's
own established pattern:

| File | Line | Change |
|------|------|--------|
| `src/features/library/presentation/components/AlbumDetailScreen.tsx` | 56 | `allLibraryTracks` + `useMemo` |
| `src/features/library/presentation/components/ArtistDetailScreen.tsx` | 120 | `allLibraryTracks` + `useMemo` |
| `src/features/library/presentation/hooks/useAlbumEnrichment.ts` | 36 | `localTracks` + `useMemo` |
| `src/screens/LiveTVScreenNew/components/LiveTVFavoritesScreen.tsx` | 46 | `allFavorites` + `useMemo` (the `rows` derivation is memoised too) |
| `src/screens/LiveTVScreenNew/hooks/useLiveTVBrowser.ts` | 167 | `allFavorites` + `useMemo` |
| `src/screens/RadioScreenNew/components/RadioFavoritesScreen.tsx` | 39 | `allFavorites` + `useMemo` |
| `src/screens/RadioScreenNew/hooks/useRadioBrowser.ts` | 239 | `allFavorites` + `useMemo` |

### Evidence

- **NEW** `__tests__/app/ZustandSelectorStability.test.ts` — a **source
  scan** (a bug that is a SHAPE of code, not a runtime value), written
  first and failing with all seven offenders listed. It has four
  self-tests — it flags a synthetic filter selector, flags a synthetic
  sort selector, does NOT flag a stable slice, and does NOT flag a comment
  that merely mentions `.filter(` — plus a walker assertion (> 200 files,
  reaching `state/mediaStore.ts` and
  `screens/RadioScreenNew/hooks/useRadioBrowser.ts`) so the scanner cannot
  silently become a no-op.
- An exhaustive sweep of **all 173 zustand selectors** in `src/` (excluding
  `node_modules`/`android`/`ios`) found exactly the seven offenders. The
  four other non-simple selectors were checked and are safe — they return a
  primitive or a stable store slice
  (`useBookmarkToggle.ts:124`, `useTransport.ts:800`,
  `useVideoOwnsWindow.ts:74`, `LinkedFoldersScreen.tsx:278`).
- **7 mutations, all killed**, every file restored byte-for-byte.

### What is NOT yet proven

**The device proof is owed.** The Radio screen and every affected section
have to render on the emulator without the redbox. The fix is a
pattern the repo already uses twice, and the guard scan proves the shape is
gone from the source — but neither is a screenshot.

---

## Verification

```
$ npx tsc --noEmit
$ echo $?
0

$ npx eslint . --ext .ts,.tsx --max-warnings 0
$ echo $?
0

$ node scripts/check-import-boundaries.js
scanned 587 files in 216ms — 0 error(s), 0 warning(s)

$ node node_modules/jest/bin/jest.js --verbose
Test Suites: 158 passed, 158 total
Tests:       1 todo, 1603 passed, 1604 total
```

---

## Carried forward

Every item that is **not** closed, listed on its own:

1. **F-066 device proof** — the Radio screen and every affected section
   must render on emulator-5554 without the redbox.
2. **F-065 device proof** — the split migration must be seen on the
   device: a mixed playlist persisted by an older build, rehydrated into
   "Name (Audio)" and "Name (Video)". The emulator's account has no mixed
   playlist, so the migration has not been seen end-to-end.
3. **F-065 queue-refusal device proof** — the cross-lane queue must be
   refused on the device with the reason on screen.
4. **F-064 device proof** — **DONE** (above). Nothing carried.
5. **`graphify-out/`** — tracked and stale since `e1d77f77`.
6. **B-050** — the HOME-path PiP window still shows the app's chrome scaled
   down. **OPEN**, unrelated to this wave.
7. **B-052** — the PiP play/pause fix is proven on the device; the tracker's
   status line still says "device proof pending" and has not been closed.
8. **The `md/` sweep** — the plan and tracker docs still carry the
   "JS-driven HOME entry" claim, which was **disproven by measurement**
   (the Activity pauses 11 ms after `onPictureInPictureRequested` returns
   true), and any claim that "the platform crops the app's window".
9. **The plan doc's §5 row** for lib v3.3.1 still reads "PENDING — measured
   on the v3.3.1 build".
10. **D-10 / D-12** in `SIMBA_V22_MASTER_PLAN.md` do not yet record the
    `pip.autoEnterOnLeave` semantic change.
