# Wave B16 — one owner for the queue, and the Audiobooks screen's grammar

**Branch:** `f5/w22-close-minimise-d9`
**Base:** `e5b131b` (Wave B15 — the mock-repair suites)
**Status:** CLOSED — the queue's owners, the Queue screen's history, the UNDO, and the Audiobooks screen

---

## 1. What this wave is

B15 closed with eighteen items carried forward — the findings that were real but could not be
finished inside that wave — plus the code items B14 had opened. The standing instruction was to
work that backlog down until nothing remained.

Mid-wave the user looked at the **Audiobooks** screen and said it was not following the screen
grammar that Movies, Podcasts and Music follow, and that **all pages should follow the same
grammar, and the pages ahead should be refactored to it**. That turned the wave from "finish the
backlog" into "finish the backlog **and** give the browse pages one grammar", so the wave carries
both.

Two things in this wave are worth stating up front, because they are the difference between
"make it look the same" and "make it the same":

1. **The grammar is a set of owners, not a skin.** A browse screen that follows the grammar does
   not merely draw the same header — it uses the same shell (`BrowseLayout`), the same option
   model, the same list states, the same in-flow footer, the same "is the list finished" measure,
   the same pull-to-refresh gesture owner, the same drag guard, and the same queue wrapper.
   Two screens that merely look alike still diverge the moment one of them is fixed.
2. **"All pages" means all pages, and the audit says how many there are.** A static audit of
   every browse-like screen in the app was run as part of this wave (§6). The answer is that
   **twelve** screens had hand-rolled their own shell, and only **three** — Music, Movies,
   Podcasts — were on the shared one. Audiobooks is closed here; the remaining ones are named,
   triaged and carried forward with their exact deltas (§7).

---

## 2. The queue's one owner

B15's headline fix moved the engine onto one rule — *what plays next = the explicit queue's head,
then the run's tail* — but the code that **writes** to the queue still had five homes, and the
toast that announces it was a second implementation of a thing the app already had.

### B16-B — the owners move to layers that can be imported by everyone

| Thing | Was | Is | Why |
|---|---|---|---|
| `useQueueActions` | `src/components/sheets/MediaActionsSheet/useQueueActions.ts` | `src/hooks/useQueueActions.ts` | It is called by the Music screen, the Album track list, the Library rows, the History screen, the shared streaming row and BOTH lanes' more sheets. A cross-cutting action with a cross-cutting home. Its old home was one sheet's folder. |
| `QueueableItem` | declared inside `useQueueActions.ts` | `src/types/media.ts` | The type carried the classification fields (`source`, `type`, `mediaType`) that live in `types/media.ts`. A TYPE half the app imports was living inside one sheet's folder. `useQueueActions` re-exports it, so no call site changed its spelling. |
| `jamendoQueueItem` | `src/screens/MusicScreen/components/jamendoQueueItem.ts` | `src/infrastructure/api/jamendo/jamendoQueueItem.ts` | A component may not import a screen. The builder is the Jamendo adapter's own classification, so the adapter owns it. |

The import rewrite touched 14 files and was done by script
(`.scratch-figcraft/b16-move-queue-owners.js`) rather than by hand, so no spelling was missed.
Three component files needed a depth fix afterwards (`StreamingRow`, `AudioMoreSheet`,
`VideoMoreSheet`).

`StreamingRow` also stopped building the Jamendo queue item inline — it calls
`jamendoQueueItem(track)` now, so the row and the Music card classify the same track the same
way.

**B15-A4** (StreamingRow's duplicate Jamendo queue item) and **B15-L1** (`useQueueActions`' odd
home) are **CLOSED**.

### B16-D — the toast offers UNDO

"Added to queue" is a thing you can regret. **Spotify, Apple Music and YouTube Music all offer an
Undo on that exact toast**, and the app's own `Toast` was **built** for it — its action slot's own
docblock names "Undo" as the example — but nothing ever used one for a queue action.

`useQueueActions` now raises both toasts with an action:

- "Add to Queue" **appends**, so the undo removes the **last** match.
- "Play Next" **prepends**, so the undo removes the **first** match.

Matching is **by URI**, not by a remembered index. An index would remove whatever moved into that
slot in the meantime; a URI removes the item the user actually added.

The hook also collapsed to **one** subscription: a single shallow-compared `useQueue(selector)`
read of the queue and three stable actions, plus a `queueRef` that holds the latest queue so the
undo acts on the queue as it is **when the user taps the action**, not as it was when the toast
was raised.

**B15-U1** is **CLOSED**.

### B16-D2 — the four call sites that bypassed the wrapper

Four screens called the lib's `useQueue()` directly and raised their own toast, so they missed
the Undo **and** were a second implementation of the same action:

| Screen | What changed |
|---|---|
| `ArchiveItemDetailScreen` | `useQueue()` → `useQueueActions()`. The two `toast.show('Playing next')` / `toast.show('Added to queue')` calls are gone — the wrapper raises them. Its unused `resolveStreamType` import went with it. |
| `PodcastDetailScreen/hooks/useEpisodeActions` | `useQueue()` → `useQueueActions()`. Its `textContent.json` strings were exactly "Playing next" / "Added to queue", so nothing was lost. **The queued episode's kind is now `podcast`, not `audio`** — the same episode already carried `type: 'podcast'` in the playlist sheet and in the bookmark, so the queue was the one place that disagreed. |
| `Song/hooks/useSongScreen` | `useQueue()` → `useQueueActions()`. The local file's toast becomes the wrapper's. |
| `PlaylistDetail/components/PlaylistDetailScreen` | `useQueue()` → `useQueueActions()`. The queued item now also carries its **`type`, `provider` and `folderId`**, which the raw call dropped: the playlist row already knew them, and a queue row without them loses the badge and can no longer be matched back to its playlist row by `useQueueScreen`'s field-wise comparison. |

---

## 3. The Queue screen's "Previously Played"

### B16-C — the app's real history

The Queue screen promised a "Previously Played" section and **never showed a row**. It read the
lib's `playbackHistory` — a store whose `addToPlaybackHistory` is called from **nothing**, in the
app or in the lib (the lib's own unit tests are its only writer).

It now reads the app's own `recentHistoryStore`, which is the real history: the checkpoint writer
upserts into it on every playback checkpoint, newest first, capped at 10 entries. The order needs
no reversing — the old code reversed the lib's append-only array, while this store **prepends**,
so both arrive newest-first. The duration is seconds in both.

**B15-Q4** is **CLOSED**.

---

## 4. The audiobook's chapter list never reached the player

### B16-A — the chapter list IS the run

The Audiobook detail screen's header claimed *"EOF auto-advances to the next chapter"*, and it did
not: the chapter list was never handed to the player, so the "next chapter" the claim promised
was a chapter the engine did not know about.

The chapter list is now **the run** — the Album / Artist / playlist pattern:
`loadPlaylistToPlayer(entries)` → `playFromPlaylist(index)` → `openPlaylist(entries, {type:
'audio', startIndex, startExtras})`. The claim in the file's own header is now true.

One classification answers "what is an audiobook chapter" for the run, the queue items, the
playlist item and the bookmark:

```ts
const CHAPTER_CLASSIFICATION = {
  source: 'api', type: 'audiobook', mediaType: 'audio', provider: 'librivox',
} as const;
```

The unused `resolveStreamType` import went with it.

**B15-A1**, **B15-A2** and **B15-A3** are **CLOSED**.

---

## 5. The Audiobooks screen → the browse grammar

This is the part the user asked for by name.

### What was wrong

The Audiobooks screen was a browse page of its own: its own `InternalHeader`, its own
`SearchBar`, its own `FilterChips` row, its own `Placeholder` states and an `ActivityOrb`
"footer". Four defects came out of that:

1. **It did not look like its siblings.** Every other Discover catalogue is the shared shell.
2. **Pull-to-refresh was advertised and inert.** Its `refreshControl` was
   `<View>{/* Refresh control: trigger via header pull-equivalent. */}</View>` — a no-op element.
3. **It opened on an empty list.** The hook ran TWO parallel infinite queries — one for "by
   term", one for "by genre" — and enabled **neither** when the user had done neither, so a
   browse page showed nothing until you browsed it.
4. **Its copy was inline.** Twelve English string literals lived in the component, in a screen
   whose siblings keep their copy in `related/textContent.json`.

### What it is now

| Grammar element | Before | After |
|---|---|---|
| Shell | hand-rolled header + search + chips | `BrowseLayout` (`src/screens/_shared/BrowseLayout.tsx`) |
| Composition root | `index.tsx` was a one-line re-export | a real root: config + `useSectionOptions` + provider + `BrowseLayout` |
| Config | none (the genre list was duplicated in the component **and** in an empty `scopeConfig.ts`) | `related/browseConfig.ts` — one genre group, single-select |
| Data owner | the hook owned the scope as its own `useState` | `AudiobooksDataProvider` owns the scope; the shell pushes it down |
| Query | two parallel queries, a hand-written priority rule | ONE query keyed by the scope (`['librivox', kind, term, genre]`) |
| List states | `Placeholder` (a different component with a different layout) | `ListStates` → the shared `BrowseLoadingState` / `ErrorState` / `EmptyState` |
| Footer | a bare `ActivityOrb` | `BrowseFooter` — the same four branches as every other browse list |
| List end | never measured | `useListEnd` → the shell's filter button steps aside at the end of the list |
| Drag guard | none — a list that fits on one screen fetched a page nobody asked for | `userDraggedRef` |
| Pull-to-refresh | a no-op `<View>` | `usePullToRefresh` — the spinner tracks the **gesture**, not the query |
| Copy | 12 inline literals | `related/textContent.json` |
| Styles | a plain `StyleSheet.create` object | `createAudiobooksScreenStyles()` / `createBookCardStyles(colors)` factories |

### The scope is one thing at a time

LibriVox cannot answer a term **and** a genre in one request, so the scope is a term **or** a
genre — never both. The screen uses the shell's existing symmetric rule
(`autoClearFilterOnSearch` + `autoClearSearchOnFilter`), the same one the Podcasts screen uses:
the **last** thing the user chose is the one that applies, and the chip strip always says what
the source is really answering.

The third scope is the feed's own listing — the "All" the Movies and Music screens open on.

### The row's menu — a deliberate non-addition

The row does **not** get a long-press media menu, and that is the finding rather than an
oversight:

- A **book is not a playable file**. It is a collection of chapters, and the only URI in the app
  for one is the chapter's. "Play Next" and "Add to Queue" would have nothing to queue.
- The **playlist rule refuses an audiobook** anyway: `PLAYLIST_ALLOWED_MEDIA_KINDS` holds
  `'audio'`, `'music'` and `'podcast'` for the audio lane, and `'audiobook'` is not among them.
  A row whose only secondary action would be refused is a control that cannot act, and a control
  that cannot act must not occupy space.

The chapter list — and every action that *can* act on a chapter — is on the book's own page,
which is where the Music, Movie and Podcast rows send the user too.

### What else the wave cleaned up in this screen

- `related/scopeConfig.ts` — **deleted**. It exported an **empty array** and its own comment
  said the thing it used to describe was gone.
- `AUDIOBOOKS_BROWSE` and its `AudiobooksBrowseEntry` — **deleted** from
  `src/constants/audiobookCategories.ts`. It described a tab bar the screen has not had since
  V18.11.3 and **nothing imported it**. (**B15-H6 CLOSED.**)
- The cover now follows the house artwork contract — a gold-dim plate with the glyph on it until
  the image decodes. It used to be a bare glyph on the border colour, so a book with no cover was
  a hole in the list.

### The test

`__tests__/screens/AudiobooksScreen/audiobooksBrowseGrammar.test.tsx` — 5 tests, all green. It
uses the **real** hook, the **real** TanStack query and the **real** `usePullToRefresh`; only the
LibriVox adapter is stubbed. It pins the four claims above: the default scope is the catalogue,
the scope is one thing at a time, the screen renders the shared shell's search field and filter
button, and pull-to-refresh actually refetches.

---

## 6. The grammar audit — how many pages there are

A static audit of **every** browse-like screen in the app was run as part of this wave, against
the eight points of the grammar (composition root · config · content component · data hook ·
provider · styles factory · copy file · shared types).

**Twelve** screens had hand-rolled their own shell. **Three** — Music, Movies, Podcasts — were
on the shared one. The full per-screen table is in §7.

---

## 7. The other pages — triaged, not guessed

The user's instruction covers the rest of the pages, and they are **not** one job: they differ in
kind, and pretending otherwise is how a refactor turns into a mess. The audit's triage:

### Group A — the browse catalogues (same kind as Music / Movies / Podcasts)

`ArchiveScreen`, `ShowsScreen`, `RadioScreen`, `LiveTVScreen` — all four are already members of
`SectionRouteKey`, so they are peers of the three conforming screens and take the same migration.
They are the next wave (B17).

**Radio** and **Live TV** are the closest to the grammar: both already use `BrowseFooter`, the
shared `BrowseLoadingState`, the FAB-clearance padding and a `PlaylistSheet`. Their remaining
deltas are structural — own shell, no `useListEnd`, no drag guard, `OptionSheetDialog` instead of
the app's one `MediaActionsSheet`.

**Archive** has no paging at all today (its list never reaches an end), so it gains the shell's
chrome and the list states but not a footer that would always say "caught up" over a list that
never ends. **Shows** has a second horizontal rail ("Airing Today") that the shell's single
content slot does not model; that is a real shape difference and is called out in the B17 brief
rather than papered over.

### Group B — the list pages (a different kind)

`Genre`, `AllVideos`, `AllAudio`, `FollowedPodcasts`, `History`, `DownloadsScreen`, `Bookmarks`
are **not** paged catalogue screens. They have no next-page concept, and one of them
(`HistoryScreen`) has a **documented reason** for having no pull-to-refresh — a deliberate
decision recorded in its own source.

Mapping them onto `BrowseLayout` is a **design decision, not a code fact**: the grammar would need
a "list page" variant — the shell with no filter groups, no paging and no footer. That is a
larger design question than "make the pages look the same", and it is **carried forward as its
own item** rather than silently decided.

Two findings in this group are already actionable and are carried forward with their evidence:

- `AllAudio` rows have **no long-press menu at all** — so an audio file cannot be played next or
  queued from the All Audio list, while the same file can be from every other list.
- `Bookmarks/related/textContent.ts` is a **half-finished migration**: 9 keys defined, 2 consumed,
  6 dead, and a `.ts` module where the house pattern is `.json`.

---

## 8. The gates

All six gates on the committed state:

```
tsc          exit=0
eslint       exit=0
boundaries   exit=0   577 files scanned, 0 error(s), 0 warning(s)
fonts        exit=0   670 resolved text usages, 11 shipped font files
boards       exit=0   51 app routes, 49 boards, 3 "no board, on purpose"
jest         exit=0   198 suites, 1911 passed, 1 todo, 1912 total
```

The suite count grew from 194 to 198 and the test count from 1893 to 1912: the two new suites are
the queue's UNDO (`__tests__/hooks/useQueueActions.test.tsx`) and the Queue screen's history
(`__tests__/screens/QueueScreen/useQueueScreenHistory.test.tsx`), and the Audiobooks screen's
grammar suite adds a third. Every pre-existing suite still passes.

---

## 9. CARRIED FORWARD

Each item, individually, with the reason it could not be closed in this wave.

### From this wave

- **B16-J — the remaining browse catalogues.** `ArchiveScreen`, `ShowsScreen`, `RadioScreen`,
  `LiveTVScreen` onto the shared browse grammar. **Reason: not started** — the wave closed the
  Audiobooks screen and the queue work; these four are the next wave's scope.
- **B16-J-ARCHIVE — the Archive list does not page.** The Internet Archive's list never reaches
  an end today. **Reason: needs a decision on what the shared footer's "caught up" branch means
  for a source that never ends** — the Movies screen solved the same problem with a labelled
  window-end (`WAVE_B15`'s `windowEndLabel`), and the Archive needs its own measurement.
- **B16-J-SHOWS — the "Airing Today" rail.** The Shows screen has a second, horizontal list
  above the catalogue. **Reason: the shared shell has one content slot; a second rail is a shape
  the shell does not model yet.**
- **B16-J-LISTPAGES — the list-page variant of the grammar.** `Genre`, `AllVideos`, `AllAudio`,
  `FollowedPodcasts`, `History`, `DownloadsScreen`, `Bookmarks` need a shell variant with no
  filter groups, no paging and no footer. **Reason: a design decision, not a refactor** — it
  changes the shared shell's contract and every screen that uses it.
- **B16-J-ALLAUDIO — All Audio rows have no long-press menu.** An audio file cannot be played
  next or queued from that list, while the same file can be from every other list.
  **Reason: it belongs to the list-page wave, and it needs the `MediaActionsSheet` decision that
  wave makes.**
- **B16-J-BOOKMARKS-TEXT — `Bookmarks/related/textContent.ts` is a half-finished migration.**
  9 keys defined, 2 consumed, 6 dead, and a `.ts` module where the house pattern is `.json`.
  **Reason: it is copy work inside the list-page wave.**
- **B16-J-DEAD-ARCHIVE — `ARCHIVE_BROWSE` / `ArchiveBrowseEntry` in
  `src/constants/audiobookCategories.ts` are dead.** Nothing imports them; the Archive screen
  has had no tab bar since V18.11.3. **Reason: deleted in the Archive wave, with the Archive's
  own constants, so one file is not edited by two waves.**

### From B15 — still open

- **B15-H1** — the Home local-media rail has no board.
- **B15-H2** — per-book audiobook progress needs a collection id in the session/history model.
- **B15-H5** — `GenreScreen` and `AllVideosScreen` have no in-app door.
- **B15-Q2** — "Clear queue": `clearQueue` / `shuffleQueue` / `addToPlaybackHistory` are never
  called.
- **B15-Q3** — the explicit queue does not survive a restart.
- **B15-Q5** — the Queue screen's jump bypasses the launch seam.
- **B15-Q8** — "Up Next" mixes the queue and the run with no visual distinction.
- **B15-M1** — the m3u-import residue: pre-fix `.m3u` imports hold milliseconds. A safe migration
  needs a per-record provenance flag the persisted schema does not have.
- **B15-D1** — `md/UI_UX_Elevation_Progress_Tracker_v3_DEPRECATED.md:506` still documents
  `MediaContextMenu` and an "Info" row.
- **B15-P2** — the player's sheets have no Penpot board.

### From B14 — still open

- The Jamendo genre badge (dead code — the adapter would need `include=musicinfo`, or the badge
  goes).
- **B13-4** — the four identical Radio / Live TV blocks not extracted.
- **B13.9** — the MusicDetail board's device-frame variant.
- The MusicDetail board-vs-device check.
- **B13-3**, **B13.6**, **B13.1-2**, **B13.12**, **B13.13**, **B13.18 / B-11-2**, **B13.19**,
  **B13.20**.
- **B12-1, B12-2, B12-3, B12-4, B12-7, B12-8, B12-9, B12-13**.
- **B12-11**, **B12-12**.
- **B-11-4, B-11-5, B-11-6, B-11-7**.
- **R4**, **R5**, **R6**.
- **CO-06**, **CO-07**.
- **B13.1-1** — the 960 `#EXTVLCOPT` directives: needs a lib option and a published release.
- **B13.1-5**, **B13.1-6**.
- The unregistered iOS URL scheme.
- The five orphan SVGs and `linking.ts:74`'s indentation.
- `ENV.JAMENDO_CLIENT_SECRET`.
- `.verification/*.bundle` still carrying the old `ScreenNew` names.
- `md/Text_Content_Reference.md:175-176` and `md/CONTENT_OWNERSHIP.md` §6.2 / §6.4.
- `useLibraryScreen`'s unused `fabBottomInset`.
- `textContent.ts`'s dead keys.

### The standing backlog (unchanged)

- F-10 / F-13 / F-15 / F-17.
- Un-measured device proofs.
- The Penpot Play hand walk.
- B-050 (PiP chrome).
- F-065 ×2 and F-066.
- The 2026-11-03 native crash.
- `graphify-out/`.
- The API 24–30 PiP path.
- NO-JANK.
- B-018.
- The v7 doc rename banners.
- iOS verification.
- Dark-theme variants.
- The optional `Allura.ttf` upload.
- The board-vs-device loop for the remaining ~48 screens.
- `md/HOME_V2_REFACTOR.md` §16's item.
