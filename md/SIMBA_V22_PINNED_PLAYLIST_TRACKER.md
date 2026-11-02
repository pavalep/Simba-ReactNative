# SIMBA V22 — Pinned Playlists & Mixed-Lane Playlists
## Tracker & Execution Plan

> **Source spec:** [`SIMBA_V22_PINNED_PLAYLIST_SPECIFICATION.md`](SIMBA_V22_PINNED_PLAYLIST_SPECIFICATION.md)
> — the decisions (D-P1 … D-P6), the pages, the data model.
> **Status:** 🟡 **IN BUILD — the UI/UX is designed (2026-10-30); phases 1 and 2 are DONE; phase 3 onward has not started.**
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
>
> **Status: DONE (2026-10-30).** The two answers are in the spec's §8 and the
> two tests are in `__tests__/state/playlistsStore.test.ts`. The tracker's
> suspicion about the archive was **wrong**, and the single-lane rule turned
> out to live in **three** places, not one.

1. ✅ **Read `normalizeMediaClassification`** (`src/types/media.ts`) and work out
   what `type` / `mediaType` an **archive item** and an **audiobook** are
   classified as. Both `ArchiveItemDetailScreen` and `AudiobookDetailScreen`
   render a `PlaylistSheet` today — if their classification is not on
   `PLAYLIST_ALLOWED_MEDIA_KINDS`, the sheet shows an **empty playlist list**
   and the user is looking at a dead control.
   *Evidence:* **the archive sheet works; the audiobook sheet is a dead
   control.**
   - **Archive item** — `ArchiveItemDetailScreen.tsx:142-151` builds the
     sheet item with `mediaType: 'audio'` and **no `type`**, so
     `normalizeMediaClassification` (`src/types/media.ts:47-59`) classifies it
     as `type: 'audio'`, `mediaType: 'audio'`. `'audio'` **is** on
     `PLAYLIST_ALLOWED_MEDIA_KINDS.AUDIO_ONLY` → the list is **not** empty.
     **The tracker's suspicion was wrong.**
   - **Audiobook** — `AudiobookDetailScreen.tsx:149-158` sets
     `type: 'audiobook'`, `mediaType: 'audio'`. `'audiobook'` is **not** on
     `AUDIO_ONLY`, and the lane does not match `VIDEO_ONLY` → **every
     playlist refuses it** → the sheet's list is empty. A **dead control**.
   - **And the rule is consulted with a kind nine call sites declare
     independently.** Five of the nine omit `type` and are classified by the
     broad `'audio'` / `'video'` fallback — which is why a **radio station**
     and a **TV channel** can enter a playlist today
     (`RadioContent.tsx:218-226`, `RadioFavoritesScreen.tsx:77-85`,
     `LiveTVContent.tsx:224-232`), while the audiobook
     (`AudiobookDetailScreen.tsx:149-158`) and the live-TV favourites
     (`LiveTVFavoritesScreen.tsx:84-92`, the only live-TV site that declares
     `type: 'live-tv'`) **cannot**. Same media, opposite outcomes, decided by
     an omitted field. **D-P6 is not enforced in the app today**, and the two
     dead sheets are its visible symptom. Carried into phase 3.
2. ✅ **Read the single-lane rule on the queue.** The owner is
   `normalizeSingleLane` in `src/state/playerStore.ts:97-101`, applied by
   `loadPlaylistToPlayer` (`:126-133`) and by `addToPlaylist` (`:135-149`).
   It filters every entry to the **first** entry's lane, so a mixed playlist
   is silently truncated at load. **Note:** it is *not* `useQueueSync` — that
   hook only mirrors the now-playing session into `currentFile` and never
   touches the queue. Write the rule down with `file:line` and confirm it
   is the **only** place the queue is narrowed.
   *Evidence:* **it is not the only place — the rule lives in three.**
   - `normalizeSingleLane` (`src/state/playerStore.ts:97-101`), called by
     `loadPlaylistToPlayer` (`:127`).
   - **A second copy inside the store** — `addToPlaylist` (`:135-149`) does
     **not** call `normalizeSingleLane`; it re-implements the rule at
     `:140-143` (`const lane = activeLane(s) ?? incoming[0]?.mediaType;`
     then `incoming.filter(entry => entry.mediaType === lane)`). An incoming
     item of the other lane is **dropped silently**.
   - **A third copy in the queue screen** — `useQueueScreen.ts:112`, `:115`
     and `:128` filter the queue, the up-next and the history by
     `activeLane`. Those are read filters, not store mutations, but they are
     a third statement of "the lane is the first entry's lane".
   - `useQueueSync` is confirmed **not** one of them: it derives
     `currentFile` from the session and never touches the queue
     (`src/infrastructure/player/useQueueSync.ts:75-89`).
3. ✅ **Write the test that fails if the mixed-split comes back.** A test on
   `normalizePersistedPlaylists` that feeds it a mixed playlist and asserts it
   survives **whole** — not split, not filtered.
   *Evidence:* `__tests__/state/playlistsStore.test.ts` — *"a MIXED playlist
   survives rehydrate WHOLE - not split, not filtered"*. It asserts **one**
   playlist, its **id**, its **name**, its **kind** and **both** item ids.
   **Mutation-checked**: reintroducing the split (`.git/MUTATE_MIXED_SPLIT.js`)
   fails the suite, and the production file was restored byte-identically
   (sha256 `0f2874cc0acaaf7446cb8abc9a76359943467bbea6be336598da64c9fa1dbef9`).
4. ✅ **Write the test that pins the current single-lane rule** so the change in
   phase 2 is visible: an audio item is rejected by a `VIDEO_ONLY` playlist
   today.
   *Evidence:* the same file — *"refuses an audio item in a VIDEO_ONLY
   playlist"* and its mirror, *"refuses a video item in an AUDIO_ONLY
   playlist"*.
5. ✅ **Phase exit:** `npx tsc --noEmit` exit 0; `npx eslint . --ext .ts,.tsx
   --max-warnings 0` exit 0; the two new tests pass; **and the two answers
   from steps 1 and 2 are written into the spec** (§8 "Still to decide" is
   updated, or moved to "Decided").
   *Evidence:* tsc 0 · eslint 0 · boundaries 578 files / 0 errors / 0
   warnings · jest **117 suites / 1326 passed / 1 todo** · the answers are in
   the spec's §8.

---

## PHASE 2 — The data model

> **Goal:** `MIXED` and `pinned` exist in the type, the store keeps mixed
> playlists whole, and the migration is a no-op.
>
> **Status: DONE (2026-10-30).** Landed with phase 1, in **one** increment:
> the phase-1 step-3 test asserts a mixed playlist survives whole, so it
> cannot be green before the store preserves it. The two phases were always
> one commit.

6. ✅ **`PlaylistKind`** gains `'MIXED'`; `PlaylistLegacyKind` is retired (it is
   no longer legacy). `src/types/playlist.ts:3-4`, `:66`.
   *Evidence:* `src/types/playlist.ts` — `SingleLanePlaylistKind` is
   `'AUDIO_ONLY' | 'VIDEO_ONLY'`, `PlaylistKind` is that plus `'MIXED'`, and
   `PlaylistLegacyKind` is **gone** (its four uses in
   `src/state/playlistsStore.ts` now say `PlaylistKind`).
7. ✅ **`PLAYLIST_ALLOWED_MEDIA_KINDS.MIXED`** = the union of the two lanes.
   `src/types/playlist.ts:53-56`.
   *Evidence:* the table is keyed by `SingleLanePlaylistKind`, and the mixed
   case is **not a second table** — `isPlaylistMediaKindAllowed` asks the
   same table twice, once per lane, so a mixed playlist is bound by the
   **same** allow-list. *"a MIXED playlist still refuses a kind the
   allow-list refuses"* pins that.
8. ✅ **`isPlaylistMediaKindAllowed`** accepts a `MIXED` playlist for either
   lane. `src/types/playlist.ts:58-64`.
   *Evidence:* the phase-1 test, amended, passes — and *"refuses an audio
   item in a VIDEO_ONLY playlist"* still passes, so a mixed playlist is a
   third kind and not a loosening of the first two.
9. ✅ **`splitLegacyMixed` becomes a preserve.** The rehydrate path must keep a
   mixed playlist whole and must not filter its items by lane.
   `src/state/playlistsStore.ts:90-135`, `:108-109`.
   *Evidence:* `splitLegacyMixed` is **gone**; `normalizePlaylistRecord`
   returns **one** playlist for **one** record, and `normalizePersistedPlaylists`
   maps one record to one playlist. The phase-1 step-3 test passes, **and the
   mutation check proves it is sensitive**: reintroducing the split fails the
   suite, and the production file was restored byte-identically.
10. ✅ **`Playlist` gains `pinned: boolean` and `pinnedAt?: string`**, with
    `pinned` defaulting to `false` for every persisted playlist. The
    migration is a **field default**, not a data migration.
    `src/state/playlistsStore.ts`, `src/types/playlist.ts:29-38`.
    *Evidence:* two tests — *"defaults to false for a playlist persisted
    before pinning existed"* and *"keeps the pin and when it was pinned"*.
    A new playlist starts unpinned (`src/features/playlists/index.ts`).
11. ✅ **Phase exit:** `tsc` exit 0; `eslint` exit 0; the store's own test suite
    green; the mixed playlist survives a save/rehydrate round trip.
    *Evidence:* tsc 0 · eslint 0 · boundaries 0 errors · jest **117 suites /
    1326 passed / 1 todo** · the mixed playlist's **id**, **name**, **kind**
    and **both items** survive `normalizePersistedPlaylists`.

### The label owners, collapsed (D-P9)

The model change is what forced D-P9: `PlaylistKind` gained `'MIXED'`, so
every `Record<PlaylistKind, string>` copy of the kind labels stopped
compiling. Rather than add `MIXED: 'Mixed'` to each copy, **three copies and
one inline ternary were deleted** — owners 2, 3, 4 and 5 of the spec's §4.4
table — and all of them now read `PLAYLIST_KIND_LABELS`:

| Was | Now |
|---|---|
| `PlaylistSheet.tsx:51-54` | `PLAYLIST_KIND_LABELS` |
| `PlaylistCard.tsx:10-13` | `PLAYLIST_KIND_LABELS` |
| `PlaylistCreateModal.tsx:18-21` | `PLAYLIST_KIND_LABELS` |
| `PlaylistSheet` (the local `SingleLanePlaylistKind` alias, `:56`) | the real type, imported from `src/types/playlist.ts` |
| `AllPlaylistsScreen.tsx:112-116` (the inline ternary) | `PLAYLIST_KIND_LABELS[item.kind]` |

`strings.ts` **kept** its copy, as §4.4 decided — it was the generic strings
surface, and the word "Mixed" already lived there. *(That module was
**deleted** on 2026-11-02 — it had zero consumers. See register item 72.)*
`PlaylistCreateModal`'s
glyph already fell back to `listMusic` for a third kind (`:140`) — that
branch was written before the kind existed. `MIXED` is now in its
`KIND_OPTIONS`, so the branch is live.

---

## PHASE 3 — One owner for "create a playlist", one rule for "which playlists may take an item"

> **Goal:** three create implementations become **one**, and the two "add to
> playlist" sheets stop disagreeing about which playlists an item may go
> into.

> **Status 2026-10-30: DONE** — steps 12–19 landed in app `9c22f56`.
> Evidence, step by step:
>
> - **12 (enumerate the create surfaces).** The repo-wide search, run
>   2026-10-30: `PlaylistCreateModal` is rendered at **four** call sites —
>   `src/components/sheets/PlaylistSheet/PlaylistSheet.tsx:355`,
>   `src/features/library/presentation/components/LibraryScreenContent.tsx:490`,
>   `src/screens/AllPlaylists/components/AllPlaylistsScreen.tsx:212` and
>   `src/screens/FolderBrowser/components/FolderBrowserScreen.tsx:667`.
>   A search for `setCreating` / `newKind` / `createKind` across `src/`
>   returns **nothing**: no inline create form is left.
> - **13 (`PlaylistCreateModal` is the owner).** Its `KIND_OPTIONS` is
>   `['AUDIO_ONLY', 'VIDEO_ONLY', 'MIXED']`
>   (`src/components/playlist/PlaylistCreateModal/PlaylistCreateModal.tsx:21`).
>   Pinned by 7 tests in
>   `__tests__/components/playlist/PlaylistCreateModal/PlaylistCreateModal.test.tsx`,
>   including one that creates a playlist of **each** kind, and one that
>   reads every kind's label from `PLAYLIST_KIND_LABELS` — a local copy
>   with a different word would fail it.
> - **14 / 15 (the inline create UIs are gone).** `AllPlaylistsScreen`'s
>   inline `Modal` and `PlaylistSheet`'s inline create MODE are deleted;
>   both open the owner. Pinned by the sheet's own test:
>   "opens PlaylistCreateModal when the create row is pressed".
> - **16 (one rule).** `compatiblePlaylistsFor(item, playlists)`
>   (`src/features/playlists/index.ts`) is called by **both** surfaces —
>   `PlaylistSheet.tsx` and `PlaylistContextMenu.tsx`. Pinned by 11 sheet
>   tests and 6 menu tests, including "offers NO playlist for a radio
>   station" in **both**.
> - **17 (B-034).** `reportBatchAdd` now lives with the feature that
>   produces the statuses (`src/features/playlists/batchAddReport.ts`) and
>   reports what HAPPENED. Pinned by 10 tests in
>   `__tests__/features/playlists/batchAddReport.test.ts`.
> - **18 (the Library calls the same owner).** Four call sites, one
>   implementation.
> - **19 (phase exit).** `tsc` exit 0 · `eslint` exit 0 · boundaries 582
>   files / 0 errors / 0 warnings · `jest` **130 suites / 1409 passed /
>   1 todo**.

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

> **Status 2026-10-30: DONE** — steps 20–24 landed in app `9c22f56`.
> Evidence, step by step:
>
> - **20 (the pin glyph).** `src/assets/svg/ic_pin.svg` and
>   `ic_pin_filled.svg`, registered in `SvgIcon.tsx` as `pin` / `pinFilled`.
> - **20 (the pin badge).** It lives inside `PlaylistCover`, so it appears
>   on **every** surface a playlist is drawn — the Library card and Home's
>   tile. 22 × 22, `radius.sm`, `top/left: spacing.xs`,
>   `background.scrimStrong`, `pinFilled` at 14 px in `accent.gold`, and
>   the SURFACE's own label says ", pinned".
> - **21 (Home is pinned first).** `useHomeScreen.ts` orders pinned
>   playlists by `pinnedAt` desc, then the rest by `updatedAt` desc,
>   capped at 3. Pinned by 6 tests in
>   `__tests__/screens/Home/useHomeScreenPlaylistOrder.test.tsx`.
> - **22 (the pin action).** `AllPlaylistsScreen` carries a visible 32 px
>   pin toggle — "Pin to top" / "Unpin from top", with
>   `accessibilityState={{selected: pinned}}` — because a long-press is
>   not reachable by a screen reader or a keyboard (D-P8). Pinned by 8
>   screen tests and 2 hook tests in `__tests__/screens/AllPlaylists/`.
> - **23 (the Mixed chip).** `localFilesConfig.ts` carries four chips, the
>   `Mixed` one labelled from `PLAYLIST_KIND_LABELS`.
> - **24 (phase exit).** The four gates, as above.

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

> **Status 2026-11-02: DONE** — steps 25, 26, 27, 28 and 29 landed. The
> **device proof** of step 28 stays deferred. Evidence, step by step:
>
> - **25 (the queue holds both lanes).** `normalizeSingleLane` is
>   **deleted**. `loadPlaylistToPlayer` and `addToPlaylist` keep every
>   item, in every lane. `addToPlaylist` used to drop an item in another
>   lane **without a word** — the user tapped "add", nothing appeared, and
>   nothing said why. The lane rule still exists where it belongs: the
>   **playlist store** refuses an item a single-lane playlist may not hold
>   (`isPlaylistMediaKindAllowed`).
>   The queue screen stopped filtering by lane too, so a run that crosses
>   lanes no longer shows the half the user cannot play and hides the half
>   they can.
>   *Evidence:* `__tests__/state/playerStore.test.ts` — a mixed run holds
>   every item, an item added in another lane is not dropped, and the run
>   still starts at its first item.
> - **26 (the handover has ONE owner).** NEW `useLaneHandover()` in
>   `src/infrastructure/player/useResumeAwareLaunch.ts` — in the launch
>   seam, next to the lane decision the seam already makes, and **not** in
>   the playlist screen and **not** in the queue store. It owns `next`,
>   `handoverTo`, `advance` and `lane`.
>   The rule used to live in three places: the queue store (narrowed the
>   run), the queue screen (filtered it) and `validateLane` — which
>   refused a cross-lane launch with *"Can't play video while audio is
>   active"* and which **nothing called**, so it was a guard that guarded
>   nothing. It has since been **deleted** (register item 77).
>   *Evidence:* `__tests__/infrastructure/player/useLaneHandover.test.tsx` —
>   item N hands over to the other lane at item N+1, and the session takes
>   the new lane.
> - **27 (the boundary does not remount the picture).** The handover goes
>   through the seam, which writes the session and moves the
>   **presentation** — it does not rebuild the tree. A video handover does
>   **not** ask the bridge for a new player, because the video lane is
>   already mounted in the tree and the session tells it what to load.
>   *Evidence:* the same suite — "a video handover does not ask the bridge
>   for a new player" — plus "moves the presentation with the lane".
> - **28 (the screen plays a mixed playlist in order, and the transport
>   advances the RUN).** The screen's half: "Play all" loads the WHOLE run
>   (`loadPlaylistToPlayer`, which keeps every lane) and launches its first
>   item. The transport's half was a defect of its own — bug `B-046`, now
>   `F-053`: `useTransport`'s `canGoNext` and its `next` read the **lib's**
>   mpv playlist, and `loadfile` REPLACES mpv's playlist, so it held
>   exactly one entry and the ⏭ button was greyed out for every album and
>   playlist launch. The transport now advances the app's RUN through the
>   handover's one owner, `useLaneHandover()`, which gained `previous()` /
>   `retreat()` as the siblings of `next()` / `advance()`. The rule for
>   "what plays next" has ONE owner — `runNeighbours` in
>   `src/state/playerStore.ts` — and it is the same rule the queue screen
>   already used for its "Up Next" list. What is PLAYING is the
>   **session's** URI, so a single-file launch has an identity too.
>   *Evidence:* `__tests__/infrastructure/player/useTransport.run.test.tsx`
>   (9 tests) and `useLaneHandover.test.tsx` (8). **7 mutations, all
>   killed**, every file restored byte-identically. The **device proof
>   stays deferred**.
> - **29 (the phase exit).** `tsc` exit 0 · `eslint` exit 0 · import
>   boundaries `scanned 584 files — 0 error(s), 0 warning(s)` · `jest`
>   **148 suites / 1517 passed / 1 todo / 0 failed**.
> - **Every "must not" test was mutation-checked.** Putting the narrowing
>   back, putting the silent drop back, dropping the lane from the
>   handover, and forcing the handover's lane to `audio` were each applied
>   in turn; each failed the test meant to catch it, and the source was
>   restored byte-identically afterwards. One test was found to pass
>   **vacuously** under the first mutation — it asserted that the bridge
>   was not asked, which is trivially true when the run had been narrowed
>   to one lane and there was no handover to make — so it now asserts that
>   the handover **happened** as well.

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
    **DONE 2026-11-02** — the screen's half: "Play all" loads the WHOLE run
    (`loadPlaylistToPlayer`, which now keeps every lane) and launches its
    first item, so a MIXED playlist starts at the right place and holds
    every item in order.
    **And the transport's half, which was a defect of its own (bug `B-046`
    → `F-053`):** `useTransport`'s `canGoNext` and its `next` read the
    **lib's** mpv playlist, and `loadfile` REPLACES mpv's playlist — so it
    held exactly one entry and the ⏭ button was greyed out for every
    album and playlist launch. The transport now advances the app's RUN
    through the handover's one owner (`useLaneHandover`), which gained
    `previous()` / `retreat()` as the siblings of `next()` / `advance()`.
    The rule for "what plays next" has ONE owner — `runNeighbours` in
    `src/state/playerStore.ts` — and it is the same rule the queue screen
    already used for its "Up Next" list.
    *Evidence:* 9 new tests in
    `__tests__/infrastructure/player/useTransport.run.test.tsx` and 3 in
    `useLaneHandover.test.tsx`; **7 mutations, all killed**, every file
    restored byte-identically. The **device proof stays deferred**.
29. **Phase exit:** `tsc` exit 0; `eslint` exit 0; `jest` green; the handover
    tests pass.
    **DONE 2026-11-02** — `tsc` exit 0 · `eslint` exit 0 · import boundaries
    `scanned 584 files — 0 error(s), 0 warning(s)` · `jest` **148 suites /
    1517 passed / 1 todo / 0 failed**. The handover tests are
    `__tests__/infrastructure/player/useLaneHandover.test.tsx` (8) and
    `__tests__/infrastructure/player/useTransport.run.test.tsx` (9).

---

## PHASE 6 — The pages

> **Status 2026-11-02: DONE** — steps 30, 32, 33 and 34 landed. Step 31
> (the `AllPlaylistsScreen` management page) is **still open**. Evidence,
> step by step:
>
> - **30 (`AddToPlaylistScreen`).** NEW `src/screens/AddToPlaylistScreen/`,
>   routed at `src/navigation/RootNavigator.tsx` and typed at
>   `src/navigation/types.ts`. It gathers items from **three** sections —
>   Movies, Music, Downloads — and tags each by lane, so one visit can feed
>   a mixed playlist from more than one section.
>   **The two sections it does NOT list are named, and the reason is
>   recorded rather than papered over:** Podcasts and Archive return
>   **containers** — a feed, a collection — not playable files, and a row
>   the user could tick but the player could not play would be a lie. Their
>   playable items live one level down, on the detail screens the app
>   already adds them from (`PodcastDetailScreen`,
>   `ArchiveItemDetailScreen`). The spec's §4.9 section list therefore needs
>   amending; the page's purpose — several sections at once — is met.
> - **32 (the "Add items" action).** `PlaylistDetailScreen`'s header gained
>   "Add items" → the new page, and a **visible 32 px pin toggle** in the
>   same header. The local-files "Add" moved into the ⋮ menu: the header
>   would otherwise carry five controls, and the local-files flow needs the
>   playlist id, which the page's own flow does not.
> - **33 (the sheet at three video surfaces).** `MoviesScreen` (long press →
>   `MediaActionsSheet` → "Add to Playlist" → `PlaylistSheet`),
>   `AllVideosScreen` (the same, on the grid tile and the list row) and
>   `MovieDetailScreen` (a **visible** "Add to Playlist" button — the
>   `MusicDetailScreen` precedent, because that screen shows one film and no
>   list of playlist-able items). Every surface passes a **truthfully
>   classified** item (`type: 'movie'`, `mediaType: 'video'`), so the ONE
>   compatibility rule offers it the video and mixed playlists and refuses
>   the audio ones.
> - **34 (the phase exit).** `tsc` exit 0 · `eslint` exit 0 · the import
>   boundary check scanned 585 files with 0 errors and 0 warnings · `jest`
>   137 suites / 1453 passed / 1 todo.

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

> **Status 2026-11-02: PART DONE** — steps 35, 39, 40, 41, 42, 45, 46 and
> 47 landed in app `9c22f56`; steps **36** and **44** landed in the 2026-11-02
> wave. Steps 37, 38, 43 and 48 are **still open**. Evidence, step by step:
>
> - **35 (VIEW ALL).** Home's rail's "VIEW ALL" navigates to
>   `AllPlaylistsScreen` — one target, named in one place
>   (`src/screens/Home/index.tsx`).
> - **39 (`PlaylistCover`).** NEW `src/components/playlist/PlaylistCover/`.
>   The 2 × 2 collage moved out of `PlaylistCard` into it, so a playlist's
>   artwork has ONE renderer.
> - **40 (the pin glyph).** The assets and the registration, with step 20.
> - **41 (the pin badge on every surface).** The badge is inside
>   `PlaylistCover`, so it is on the Library card and Home's tile.
> - **42 (the kind label's one owner).** The copies were deleted in the
>   model wave. `strings.ts` kept its copy, as §4.4 decided — and was then
>   **deleted outright** on 2026-11-02 (register item 72: an entirely
>   unreferenced module with zero consumers).
> - **45 (the rail is retitled).** The rail was titled "Pinned Playlists"
>   while it shows unpinned playlists too — a title that lies is a bug
>   (spec rule 4). It now reads "Playlists", and the tile's icon box is a
>   `PlaylistCover`.
> - **46 (the Library segment).** The dead `colors` prop is deleted and
>   nothing passes it.
> - **47 (motion).** The pin badge fades and scales in on `motion.fast`
>   (150 ms); nothing else animates.
> - **36 (the kind label's remaining sites).** The last copy was
>   `src/constants/strings.ts`, and that module was **deleted outright** on
>   2026-11-02 (register item 72: zero consumers, `src/constants/index.ts`
>   never re-exported it, `StringKey` appears nowhere else in the repo). The
>   count today is **one owner, five copies gone**.
> - **44 (the long-press pin MENU and `PlaylistDetailScreen`'s pin toggle).**
>   NEW `src/components/playlist/PlaylistActionMenu/` — a `BottomSheet` with
>   ONE row, "Pin to top" / "Unpin from top", whose label changes with the
>   state. `PlaylistCard` gained `onLongPress` (with the app's existing
>   `accessibilityHint="Long press for more actions"`, copied from
>   `MediaRailCard`) and a **visible 32 px pin toggle**; the Library's
>   `PlaylistCard` grid opens the menu. `PlaylistDetailScreen`'s header
>   gained its own 32 px toggle. The long-press is never the only way in.
> - **STILL OPEN:** 48 (the phase exit).

35. **The Home shelf's "VIEW ALL" points at `AllPlaylistsScreen`** — **decided
    2026-10-30**: the page that can pin IS `AllPlaylistsScreen` (step 31).
    **One** target, named in one place.
    *Evidence:* the navigation target, named in one place.
36. **The playlist badges say the truth** — "Audio" / "Video" / "Mixed"
    everywhere a playlist's kind is shown, and the label has **ONE owner**.
    The kind label **was** spelled out in **six** places: the exported
    `PLAYLIST_KIND_LABELS` (`src/types/playlist.ts:40`), **three** local
    `KIND_LABELS` copies (`PlaylistCard.tsx:10`, `PlaylistSheet.tsx:51`,
    `PlaylistCreateModal.tsx:18`), **one** inline ternary
    (`AllPlaylistsScreen.tsx:112-116`, whose `'Mixed'` branch was unreachable
    then), and `src/constants/strings.ts:277-280` — which **already** had
    `playlistKindMixed: 'Mixed'`, so the word was not new to this app. The
    exported map is the one owner; the other four copies are deleted — and
    `strings.ts` itself was **deleted** on 2026-11-02 (register item 72),
    so the count today is **one owner, five copies gone**. See step 42.
    *Evidence:* the badges, the single import, and the test.
    **DONE 2026-11-02** — the last copy was `src/constants/strings.ts`, and
    that module was deleted outright (register item 72). One owner, five
    copies gone.
37. **Empty states.** Every one of them, with its copy:
    * No playlists at all → "No playlists yet" + a **Create playlist** button.
    * Playlists exist, **none pinned** → the pinned **section** is not
      rendered at all. A section with nothing in it is noise.
    * A playlist with no items → "This playlist is empty" + **Add items**.
    * A filter that matches nothing → "No playlists match this filter."
    * Home's rail with nothing to show → the rail **collapses**; the title
      goes with it.
    *Evidence:* each state, rendered and asserted.
    **DONE 2026-11-02** — each one rendered and asserted:
    - **No playlists at all** → "No playlists yet" **+ a "Create playlist"
      button** — an empty state with no action is a dead end.
    - **Playlists exist, none pinned** → the **pinned section is not
      rendered at all**. A section with nothing in it is noise.
    - **A playlist with no items** → "This playlist is empty" + **Add
      items** — already landed on `PlaylistDetailScreen`.
    - **A filter that matches nothing** → "No playlists match this
      filter." — a different claim from "you have no playlists"; the page
      must not blur the two.
    - **Home's rail with nothing to show** → the rail **collapses**, and
      the title goes with it — already landed.
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
    **DONE 2026-11-02** — every new action carries a role and a label:
    - The **filter chips** state their selection
      (`accessibilityState={{selected: isActive}}`), the way
      `PlaylistCreateModal`'s kind chips already do.
    - The pin **badge** is `accessible={false}` +
      `importantForAccessibility="no"` — **amended 2026-11-02**:
      `accessibilityElementsHidden` is iOS-only.
    - The pin **toggle** states its role, its action ("Pin to top" /
      "Unpin from top") and `accessibilityState={{selected: pinned}}`, and
      stays **32 px** — the hit slop widens, the icon does not grow.
    - A long-press is **never** the only way in: the card's visible toggle
      pins without a gesture, and the menu is the shortcut.

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
    **DONE 2026-11-02** — the inline 44 × 44 row is replaced by the card.
    The card carries the **visible 32 px pin toggle**; a **long-press**
    opens `PlaylistActionMenu` — the Library's pattern. The kind filter
    gains **Mixed**, reading `LOCAL_PLAYLIST_FILTERS` (one owner; labels
    from `PLAYLIST_KIND_LABELS`), and it is a **filter**: it narrows what
    is shown and never changes what a playlist may contain. The create
    action is the header `AppButton` and it opens **`PlaylistCreateModal`**
    — the one owner. **No FAB.** The list splits into a **"Pinned"**
    section (rendered only when something is pinned) and **"Other
    playlists"**, so a playlist is rendered once, in the section that
    describes its state.
    **Rename and delete left this page** — the card has no rename/delete
    slot and `PlaylistActionMenu` has ONE row, and both live in
    `src/components/playlist/**`. Rename and delete remain on
    `PlaylistDetailScreen` via `PlaylistManageModal` +
    `useConfirmDialog` — spec §4.5's named components — so there is one
    place that does them rather than two.
    **One duplication is recorded, not hidden:** the pinned-order helper
    is a second copy of Home's `pinnedAtMs`. A shared owner would be
    better; Home is not this wave's file.
44. **The pin action** — a long-press menu on a playlist, offering
    **Pin to top** / **Unpin from top** (precedent: YouTube Music's "Pin to
    top", Spotify's "Pin playlist"), plus a **visible 32 px pin toggle** on
    the management row and in `PlaylistDetailScreen`'s header. The browsing
    cards do **not** get a permanent pin button — a pin button on every card
    in a grid of fifty is noise.
    *Evidence:* the menu, the two toggles, and the tests.
    **DONE 2026-11-02** — `src/components/playlist/PlaylistActionMenu/`,
    the card's long press and its visible 32 px toggle, the Library's
    wiring, and `PlaylistDetailScreen`'s header toggle. The menu offers ONE
    row, and the row does not render when no playlist is selected — a menu
    that offered a pin for a playlist that was not there was a defect, and a
    test caught it.
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

- [x] **Phase 1 step 1** — archive / audiobook classification — **ANSWERED
      2026-10-30**: the **archive** sheet is sound (its item omits `type`,
      is classified `'audio'`, and `'audio'` is allowed); the **audiobook**
      sheet is the dead one. Fixed by the shared rule in app `9c22f56`.
- [x] **Phase 1 step 2** — `normalizeSingleLane` is **not** the only
      narrowing — **ANSWERED 2026-10-30**: the rule lives in **three**
      places — `src/state/playerStore.ts`'s `normalizeSingleLane`, a
      **second copy** inside `addToPlaylist`, and
      `src/screens/QueueScreen/hooks/useQueueScreen.ts`. The queue's
      narrowing is **phase 5's** job.
- [ ] **Phase 8 step 51** — the device proof of the whole feature.
- [ ] **The spec's §8 fallback** — if the lane handover proves too fragile,
      a mixed playlist that plays its audio items only (video items listed,
      not playable) is the recorded fallback, not a failure.
- [x] **The spec's §8 open question** — does the Home shelf show the
      non-pinned playlists below the pinned ones, or pinned only? —
      **ANSWERED 2026-10-30**: the rail shows the **pinned** playlists
      first (most recently pinned first) and the rest by recency, in **one**
      list, and it scrolls (spec §4.6). Landed in app `9c22f56`.
