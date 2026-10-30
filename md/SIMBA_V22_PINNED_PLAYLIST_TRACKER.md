# SIMBA V22 — Pinned Playlists & Mixed-Lane Playlists
## Tracker & Execution Plan

> **Source spec:** [`SIMBA_V22_PINNED_PLAYLIST_SPECIFICATION.md`](SIMBA_V22_PINNED_PLAYLIST_SPECIFICATION.md)
> — the decisions (D-P1 … D-P6), the pages, the data model.
> **Status:** 🟡 **PLANNED — the UI/UX is designed (2026-10-30); phase 1 not started.**
> **Opened:** 2026-10-29, at the user's request.
> **UI/UX specified:** 2026-10-30 — the specification's §4 grew from a page
> list into a real design: the rules, the reused primitives, the new
> `PlaylistCover` and pin badge, the one management page, the empty states,
> the motion and the accessibility. It added **D-P7 … D-P9** and **steps
> 39–48**, and it **removed** the `PinnedPlaylistsScreen` (step 31).
> **Register:** [`SIMBA_V22_MASTER_PLAN.md`](SIMBA_V22_MASTER_PLAN.md) §8 item 60.
>
> **Conventions** (inherited from the repo's other trackers):
> - Every task names the `file:line` it touches and the defect/decision it
>   closes.
> - A task is complete when it has a checkmark **and** an `Evidence:` line the
>   next owner can verify.
> - A phase ends with an **Error fix** step and a **Validation** step.
> - **No proof by `tsc`.** Green typecheck ≠ the feature works ≠ the device
>   proof. A device claim needs `device: <model> + <commit>`.

---

## 0. Locked decisions (do NOT revisit)

- **D-P1** — A playlist may hold **both** lanes. `PlaylistKind` gains
  `'MIXED'` as a first-class kind. The store stops splitting mixed playlists.
- **D-P2** — "Play all" on a mixed playlist plays every item in order, and the
  **lane follows the item**.
- **D-P3** — "Pinned" is real: `Playlist.pinned` + `pinnedAt`. Home's shelf
  shows pinned first. Precedent: Spotify's "Pin playlist", YouTube Music's
  "Pin to top".
- **D-P4** — **One** owner for "create a playlist": `PlaylistCreateModal`.
  **One** rule for "which playlists can take this item": a shared
  `compatiblePlaylistsFor(item)` helper, used by both `PlaylistSheet` and
  `PlaylistContextMenu`. `PlaylistContextMenu` is **not** deleted — it is the
  only batch picker.
- **D-P5** — The app's own video sections can add to a playlist.
- **D-P6** — Radio, live TV and audiobooks stay out of the playlist domain.
- **D-P7** — **One page owns playlists.** There is **no**
  `PinnedPlaylistsScreen`; `AllPlaylistsScreen` grows into the management
  page. One list, one target.
- **D-P8** — The pin is a **state you can see** (a badge on the cover, on
  every surface) and an **action you can reach** (a long-press menu item,
  plus a visible toggle on the management row and the detail header). A
  browsing card gets **no** permanent pin button.
- **D-P9** — The **kind label** and the **playlist cover** each have exactly
  **one** owner. The label has six today; the cover has two.

---

## PHASE 1 — Verify the two open facts, and pin them with tests

> **Goal:** answer the two questions the spec could not answer from the
> source alone, and make sure the behaviour the plan depends on is *pinned*
> before it is changed.

1. **Read `normalizeMediaClassification`** (`src/types/media.ts`) and work out
   what `type` / `mediaType` an **archive item** and an **audiobook** are
   classified as. Both `ArchiveItemDetailScreen` and `AudiobookDetailScreen`
   render a `PlaylistSheet` today — if their classification is not on
   `PLAYLIST_ALLOWED_MEDIA_KINDS`, the sheet shows an **empty playlist list**
   and the user is looking at a dead control.
   *Evidence:* the two classified values, quoted from the source, with
   `file:line`.
2. **Read the single-lane rule on the queue.** The owner is
   `normalizeSingleLane` in `src/state/playerStore.ts:97-101`, applied by
   `loadPlaylistToPlayer` (`:126-133`) and by `addToPlaylist` (`:135-149`).
   It filters every entry to the **first** entry's lane, so a mixed playlist
   is silently truncated at load. **Note:** it is *not* `useQueueSync` — that
   hook only mirrors the now-playing session into `currentFile` and never
   touches the queue. Write the rule down with `file:line` and confirm it
   is the **only** place the queue is narrowed.
   *Evidence:* the scoping rule, quoted, with `file:line`.
3. **Write the test that fails if the mixed-split comes back.** A test on
   `normalizePersistedPlaylists` that feeds it a mixed playlist and asserts it
   survives **whole** — not split, not filtered.
   *Evidence:* the test file and the assertion.
4. **Write the test that pins the current single-lane rule** so the change in
   phase 2 is visible: an audio item is rejected by a `VIDEO_ONLY` playlist
   today.
   *Evidence:* the test file and the assertion.
5. **Phase exit:** `npx tsc --noEmit` exit 0; `npx eslint . --ext .ts,.tsx
   --max-warnings 0` exit 0; the two new tests pass; **and the two answers
   from steps 1 and 2 are written into the spec** (§8 "Still to decide" is
   updated, or moved to "Decided").

---

## PHASE 2 — The data model

> **Goal:** `MIXED` and `pinned` exist in the type, the store keeps mixed
> playlists whole, and the migration is a no-op.

6. **`PlaylistKind`** gains `'MIXED'`; `PlaylistLegacyKind` is retired (it is
   no longer legacy). `src/types/playlist.ts:3-4`, `:66`.
   *Evidence:* `tsc` exit 0 and the type in the file.
7. **`PLAYLIST_ALLOWED_MEDIA_KINDS.MIXED`** = the union of the two lanes.
   `src/types/playlist.ts:53-56`.
   *Evidence:* the table in the file.
8. **`isPlaylistMediaKindAllowed`** accepts a `MIXED` playlist for either
   lane. `src/types/playlist.ts:58-64`.
   *Evidence:* the phase-1 test, amended, passes.
9. **`splitLegacyMixed` becomes a preserve.** The rehydrate path must keep a
   mixed playlist whole and must not filter its items by lane.
   `src/state/playlistsStore.ts:90-135`, `:108-109`.
   *Evidence:* the phase-1 step-3 test passes **and still passes** after a
   deliberately broken split is reintroduced (mutation-checked).
10. **`Playlist` gains `pinned: boolean` and `pinnedAt?: string`**, with
    `pinned` defaulting to `false` for every persisted playlist. The
    migration is a **field default**, not a data migration.
    `src/state/playlistsStore.ts`, `src/types/playlist.ts:29-38`.
    *Evidence:* a test that rehydrates a playlist with no `pinned` field and
    reads `pinned === false`.
11. **Phase exit:** `tsc` exit 0; `eslint` exit 0; the store's own test suite
    green; the mixed playlist survives a save/rehydrate round trip.

---

## PHASE 3 — One owner for "create a playlist", one rule for "which playlists may take an item"

> **Goal:** three create implementations become **one**, and the two "add to
> playlist" sheets stop disagreeing about which playlists an item may go
> into.

12. **Enumerate the create surfaces.** `PlaylistCreateModal` is live at
    `LibraryScreenContent.tsx:490` and `FolderBrowserScreen.tsx:645`;
    `AllPlaylistsScreen.tsx:54-60` has its **own** inline modal;
    `PlaylistSheet.tsx:96-110` has its **own** inline create mode.
    `PlaylistContextMenu` is live at `FolderBrowserScreen.tsx:635` and is the
    only **batch** picker. Re-verify all four at the moment of the change
    and record the search output.
    *Evidence:* the repo-wide search and its output, quoted.
13. **`PlaylistCreateModal` becomes the owner.** Its `KIND_OPTIONS` gains
    `'MIXED'`. `src/components/playlist/PlaylistCreateModal/PlaylistCreateModal.tsx:17-21`.
    *Evidence:* the three kinds in the file, and a test that creates one of
    each kind.
14. **`AllPlaylistsScreen`'s inline create modal is replaced** by the owner —
    the inline `Modal` at
    `src/screens/AllPlaylists/components/AllPlaylistsScreen.tsx:188-271` is
    deleted and the button opens the owner.
    *Evidence:* the inline modal is gone from the file; the screen's test
    shows the owner opens.
15. **`PlaylistSheet`'s inline create mode is replaced** by the owner — the
    `creating` / `newName` / `newKind` state at
    `src/components/sheets/PlaylistSheet/PlaylistSheet.tsx:96-110` is deleted.
    *Evidence:* the state is gone; the sheet's test shows the owner opens.
16. **Extract the lane rule into one helper** — `compatiblePlaylistsFor(item)`
    — and make **both** sheets call it. Today `PlaylistSheet.tsx:79-88`
    filters by lane and `PlaylistContextMenu.tsx:102` does not.
    *Evidence:* the helper, and both sheets calling it.
17. **Fix `B-034` — the batch add must not lie.** `addItemToPlaylist`
    **silently refuses** a lane mismatch (`src/state/playlistsStore.ts:180`),
    but `FolderBrowserScreen.handleBatchAddConfirm` (`:263-298`) and
    `handleCreatePlaylistFromBatch` (`:314-351`) always toast
    `Added ${selectedItems.length} items to …` — the count the user
    **selected**, not the count actually added. The toast must report what
    was added, and say so when something was skipped.
    *Evidence:* the toast, with a test that selects a video and an audio file
    for an `AUDIO_ONLY` playlist and asserts the toast does not claim both
    were added.
18. **The Library's create modal calls the same owner.**
    `src/features/library/presentation/components/LibraryScreenContent.tsx:490`.
    *Evidence:* one implementation, four call sites, one test.
19. **Phase exit:** `tsc` exit 0; `eslint` exit 0; `jest` green; a repo-wide
    search finds **one** "create playlist" implementation.

---

## PHASE 4 — Pinning

20. **`PlaylistCard` gains a pin glyph** for a pinned playlist, and the pin
    action. Precedent: Spotify's "Pin playlist", YouTube Music's "Pin to
    top".
    `src/components/playlist/PlaylistCard/PlaylistCard.tsx`.
    *Evidence:* the badge and the action, with the a11y label.
21. **Home's shelf is pinned first**, then recency. Today it is recency
    only, under a title that says "Pinned".
    `src/screens/Home/hooks/useHomeScreen.ts:375-379`.
    *Evidence:* a test that puts an unpinned, recently-updated playlist and a
    pinned, older one in the store and asserts the pinned one is first.
22. **`AllPlaylistsScreen` gains the pin action**, so the VIEW ALL target can
    pin what the shelf shows.
    `src/screens/AllPlaylists/components/AllPlaylistsScreen.tsx`.
    *Evidence:* the action, with a test.
23. **The Library's playlist filter rail gains a `Mixed` chip.**
    `src/features/library/presentation/related/localFilesConfig.ts:51-58`.
    *Evidence:* the four chips in the file.
24. **Phase exit:** `tsc` exit 0; `eslint` exit 0; `jest` green; the Home
    ordering test passes.

---

## PHASE 5 — Mixed playlist playback (the risky one)

25. **Make the queue able to hold both lanes.** The single-lane rule is
    `normalizeSingleLane` (`src/state/playerStore.ts:97-101`), applied by
    `loadPlaylistToPlayer` (`:126-133`) and `addToPlaylist` (`:135-149`).
    It has to stop narrowing the queue to the first entry's lane.
    `src/state/playerStore.ts`.
    *Evidence:* a test that loads a mixed playlist and asserts the queue holds
    **every** item, both lanes.
26. **Give the lane handover ONE owner**, in the launch seam next to the lane
    decision the seam already makes — **not** in the playlist screen and not
    in the queue store.
    `src/infrastructure/player/useResumeAwareLaunch.ts`.
    *Evidence:* the owner, with a test that a mixed playlist's item N hands
    over to the other lane at item N+1.
27. **Playback crosses the boundary.** Both lanes are already mounted (D9), so
    the handover is a session change, not a remount. Prove it does not remount
    the picture.
    *Evidence:* a test that the video lane's mount is not torn down at the
    boundary.
28. **The `PlaylistDetailScreen` plays a mixed playlist in order.**
    `src/screens/PlaylistDetail/components/PlaylistDetailScreen.tsx` (967
    lines today).
    *Evidence:* the screen's test, plus the device proof in phase 8.
29. **Phase exit:** `tsc` exit 0; `eslint` exit 0; `jest` green; the handover
    tests pass.

---

## PHASE 6 — The pages

30. **NEW — `AddToPlaylistScreen`**: a full page that gathers items from
    **several sections at once** (Movies · Music · Podcasts · Archive ·
    Downloads), tagged by lane so a mixed playlist can be fed from more than
    one section in one visit. Reached from `PlaylistDetailScreen`'s "Add
    items" action.
    *Evidence:* the screen, its route in `src/navigation/RootNavigator.tsx`
    and `src/navigation/types.ts`, and its test.
31. **NO new screen — `AllPlaylistsScreen` grows into the management page.**
    The earlier draft of this tracker had a NEW `PinnedPlaylistsScreen` here
    and hedged on which page the Home shelf's "VIEW ALL" should open. The
    hedge is **resolved**: there is **no** `PinnedPlaylistsScreen`. A second
    page holding the same list is a second list to keep in agreement with the
    first, and step 35 demands **one** target, not two.
    * What it gains: the **Mixed** filter chip; the pin action; the list
      becomes `PlaylistCard`s (the inline 44 × 44 row that duplicates the
      Library's card design is replaced — see step 44); the inline create
      modal is replaced by `PlaylistCreateModal` (phase 3).
    * What it does **not** gain: a FAB. It already has a header `AppButton`,
      and a second create affordance on one page is two ways to do one thing.
    *Evidence:* the screen, its test, and the absence of a new route.
32. **`PlaylistDetailScreen` gains the "Add items" action** → the new page.
    *Evidence:* the action and the navigation.
33. **`PlaylistSheet` offers mixed playlists to both lanes**, and is wired at
    `MoviesScreen`, `MovieDetailScreen` and `AllVideos` (D-P5).
    `src/components/sheets/PlaylistSheet/PlaylistSheet.tsx:79-94`.
    *Evidence:* the sheet's test, and the three new call sites.
34. **Phase exit:** `tsc` exit 0; `eslint` exit 0; `jest` green; the import
    boundary check passes with 0 errors.

---

## PHASE 7 — The UX sweep

35. **The Home shelf's "VIEW ALL" points at `AllPlaylistsScreen`** — **decided
    2026-10-30**: the page that can pin IS `AllPlaylistsScreen` (step 31).
    **One** target, named in one place.
    *Evidence:* the navigation target, named in one place.
36. **The playlist badges say the truth** — "Audio" / "Video" / "Mixed"
    everywhere a playlist's kind is shown, and the label has **ONE owner**.
    The kind label is currently spelled out in **six** places: the exported
    `PLAYLIST_KIND_LABELS` (`src/types/playlist.ts:40`), **three** local
    `KIND_LABELS` copies (`PlaylistCard.tsx:10`, `PlaylistSheet.tsx:51`,
    `PlaylistCreateModal.tsx:18`), **one** inline ternary
    (`AllPlaylistsScreen.tsx:112-116`, whose `'Mixed'` branch is unreachable
    today), and `src/constants/strings.ts:277-280` — which **already** has
    `playlistKindMixed: 'Mixed'`, so the word is not new to this app. The
    exported map is the one owner; the four copies are deleted. See step 42.
    *Evidence:* the badges, the single import, and the test.
37. **Empty states.** Every one of them, with its copy:
    * No playlists at all → "No playlists yet" + a **Create playlist** button.
    * Playlists exist, **none pinned** → the pinned **section** is not
      rendered at all. A section with nothing in it is noise.
    * A playlist with no items → "This playlist is empty" + **Add items**.
    * A filter that matches nothing → "No playlists match this filter."
    * Home's rail with nothing to show → the rail **collapses**; the title
      goes with it.
    *Evidence:* each state, rendered and asserted.
38. **Accessibility.** Every new action carries a role and a label; the pin
    glyph is not a bare icon.
    * The pin **badge** is `accessibilityElementsHidden` — the pinned state
      is in the surface's **accessibility label** ("…, pinned"). A glyph is
      not a label.
    * The pin **toggle** states its role, its action ("Pin to top" /
      "Unpin from top") and `accessibilityState={{selected: pinned}}`.
    * Every filter chip states its selection, the way
      `PlaylistCreateModal`'s kind chips already do
      (`accessibilityState={{selected: isActive}}`).
    * Tap targets stay **32 px** — the hit slop widens, the icon does not
      grow, so the row does not.
    * A long-press is **never** the only way to reach an action that changes
      persistent state. The pin is reachable from the management row and the
      detail header without a gesture.
    *Evidence:* the labels, asserted.

### The UI/UX build — the tasks the specification added

39. **NEW `PlaylistCover`** (`src/components/playlist/PlaylistCover/`) — **one
    owner for a playlist's artwork**. The 2 × 2 collage moves out of
    `PlaylistCard` into it; `AllPlaylistsScreen`'s generic `listMusic` icon
    box is **replaced** by it. One renderer, three chromes: a wide card, a
    list row and a rail tile differ in chrome, and no longer in artwork.
    The collage draws catalogue artwork only — a `PlaylistItem` has no
    `resumeThumbnailPath`, because a playlist item is a thing you put in a
    list, not a position you were at.
    *Evidence:* the component, its test, and both call sites rendering it.
40. **NEW the pin glyph** — `src/assets/svg/ic_pin.svg` and
    `ic_pin_filled.svg`, registered in `SvgIcon.tsx` as `pin` / `pinFilled`.
    The app already ships a filled/outline pair for bookmarks
    (`bookmark` / `bookmarkFilled`), so the pin follows that convention
    rather than inventing one.
    *Evidence:* the assets, the registration, and the icon test.
41. **NEW the pin badge** — 22 × 22, `radius.sm`, absolutely positioned at
    `top: spacing.xs` / `left: spacing.xs` over the cover, **mirroring** the
    kind badge at `top: spacing.xs` / `right: spacing.xs`. It holds the
    `pin` glyph at 14 px in `accent.gold` on a `background.scrimStrong`
    fill, so it reads as an overlay and never competes with the kind badge's
    text. It appears on **every** surface a playlist is drawn — the Library
    card, the management row, the Home tile — because a state you cannot see
    is not a state.
    *Evidence:* the badge, and a test asserting it on each surface.
42. **The kind label gets ONE owner** — `PLAYLIST_KIND_LABELS` in
    `src/types/playlist.ts` gains `MIXED: 'Mixed'`; the three local
    `KIND_LABELS` copies and the one inline ternary are **deleted** and
    import it. `KIND_OPTIONS` in `PlaylistCreateModal.tsx:17` gains
    `'MIXED'`, and its kind picker already has the shape a third kind needs:
    `k === 'AUDIO_ONLY' ? 'music' : k === 'VIDEO_ONLY' ? 'video' :
    'listMusic'` — the `listMusic` glyph is **already** the fallback, so
    `MIXED` needs no new lane glyph.
    *Evidence:* the single import, the deleted copies, and the test.
43. **`AllPlaylistsScreen` becomes a list of `PlaylistCard`s** — the inline
    44 × 44 row that duplicates the Library's card design is replaced. It
    gains a **Mixed** filter chip, and `FilterType`
    (`src/features/library/presentation/types/index.ts:3`) gains `'MIXED'`.
    The filter is a **filter**: it narrows what is shown and never changes
    what a playlist may contain.
    *Evidence:* the screen, the chip, and the test.
44. **The pin action** — a long-press menu on a playlist, offering
    **Pin to top** / **Unpin from top** (precedent: YouTube Music's "Pin to
    top", Spotify's "Pin playlist"), plus a **visible 32 px pin toggle** on
    the management row and in `PlaylistDetailScreen`'s header. The browsing
    cards do **not** get a permanent pin button — a pin button on every card
    in a grid of fifty is noise.
    *Evidence:* the menu, the two toggles, and the tests.
45. **Home's rail is retitled "Playlists"** — a rail titled "Pinned
    Playlists" may only head a collection that is all pinned, and the rail
    shows pinned first **then** recency, so the honest title is "Playlists".
    The pin badge says which are pinned. The tile's icon box becomes a
    `PlaylistCover`, and the rail **collapses** when it has nothing to show.
    This answers the specification's open question: the rail is horizontal,
    so showing both does not crowd it — it scrolls.
    *Evidence:* the title, the ordering, the tile, and the tests.
46. **The Library's playlist segment** — the filter chips gain **Mixed**, and
    `LibraryPlaylistsSegment`'s dead `colors` prop is deleted (it is never
    used). A `MIXED` playlist appears under **Any** and under **Mixed**,
    never under Audio or Video alone — it is neither.
    *Evidence:* the chips, the deleted prop, and the test.
47. **Motion** — the pin badge fades and scales in on `motion.fast`
    (150 ms). The kind badge's text changes with **no** animation; it is a
    label. The rail's collapse uses `motion.normal` (250 ms). Nothing in
    this feature animates past `motion.normal` except a rail collapse, and
    **nothing animates on a pin toggle** except the badge itself — no row
    slides, and no list re-orders under the finger.
    *Evidence:* the timings, asserted.
48. **Phase exit for the UI/UX:** `tsc` exit 0; `eslint` exit 0; `jest`
    green; the import boundary check passes with 0 errors.
    *Evidence:* the four results, quoted.

---

## PHASE 8 — Gates, and the device proof

49. **Full app gates:** `npx tsc --noEmit` · `npx eslint . --ext .ts,.tsx
    --max-warnings 0` · `node scripts/check-import-boundaries.js` ·
    `node node_modules/jest/bin/jest.js --verbose`.
    *Evidence:* the four results, quoted.
50. **Mutation-check** every "must not" test in this wave: the mixed-split
    returning, the pinned ordering, the single-owner rule, the lane
    handover, the batch-add toast, and the kind label's single owner. A test
    that cannot fail is a comment with a `.test.tsx` extension.
    *Evidence:* the harness output, with the killer test named.
51. **Device proof** (deferred until the emulator is available):
    `device: <model> + <commit>` — create a mixed playlist from Movies AND
    Music, pin it, see it at the top of the Home rail with its pin badge,
    play it across the lane boundary, and confirm the picture does not
    remount.
    *Evidence:* the device line.

---

## Carried forward from this tracker

- [ ] **Phase 1 step 1** — archive / audiobook classification: are their
      `PlaylistSheet`s showing an empty list today?
- [ ] **Phase 1 step 2** — confirm `normalizeSingleLane`
      (`src/state/playerStore.ts:97-101`) is the **only** place the queue is
      narrowed to one lane.
- [ ] **Phase 8 step 51** — the device proof of the whole feature.
- [ ] **The spec's §8 fallback** — if the lane handover proves too fragile,
      a mixed playlist that plays its audio items only (video items listed,
      not playable) is the recorded fallback, not a failure.
- [ ] **The spec's §8 open question** — does the Home shelf show the
      non-pinned playlists below the pinned ones, or pinned only?
