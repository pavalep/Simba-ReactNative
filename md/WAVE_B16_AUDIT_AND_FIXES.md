# Wave B16 — one owner for the queue, and one grammar for the browse pages

**Branch:** `f5/w22-close-minimise-d9`
**Base:** `e5b131b` (Wave B15 — the mock-repair suites)
**Status:** CLOSED — the queue's owners, the Queue screen's history, the UNDO, and **all eight** browse catalogues on the shared grammar

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
   Podcasts — were on the shared one. **All eight browse catalogues are on the shared shell
   now** (§8): Music, Movies and Podcasts already were, Audiobooks joined in the first half
   of this wave, and Archive, Shows, Radio and Live TV joined in the second. The seven
   LIST pages are a different kind of thing and are carried forward as a design decision
   (§7, Group B).

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

---

## 8. The four remaining catalogues → the same grammar

The instruction after the Audiobooks screen was: *"i checked the Audiobooks screen, its not foloowing the screen grammer as in movies, podcasts, music etc, all pages should follow same grammar, refactor the pages ahead to same"*. §7's Group A — `ArchiveScreen`, `ShowsScreen`, `RadioScreen`, `LiveTVScreen` — was therefore closed in this wave, not deferred to a later one.

All four are now on the shared `BrowseLayout` shell, with the eight grammar points each. What each screen *can* do is its own; the furniture is the same.

### 8.1 Radio — three axes, and now ONE request

**The shell.** The screen used to hand-roll its own header, search field, gold chips, FAB and filter sheet; it is now the shared shell, with three filter axes — **genre / country / language** — and a config FACTORY, because the axis rows are the radio-browser API's own tag lists, fetched at runtime.

**The scope is now ONE request, not one thing at a time.** The migration first landed on the shell's "one thing at a time" rules (`autoClearFilterOnSearch` + `autoClearSearchOnFilter`), because the adapter exposed two mutually exclusive request shapes: `searchStations(term)` carries `name` and no `tag`, and `getStationsByFilters(filters)` carries `tag`/`country`/`language` and no `name`. That was an ADAPTER gap, not a source limit — and the source is not limited. Measured 2026-11-18 against `de1.api.radio-browser.info`:

- `?name=jazz&tag=rock` returns a set that is **neither** the name-only set **nor** the tag-only set.
- `?name=&tag=rock` returns exactly the tag-only set, so an empty term is safe to send.
- `?name=jazz&tag=rock&country=Germany` answers — and `country=germany` (lower case) or `country=DE` answers **nothing**: the country value must be the country's NAME as the API spells it, which is what `/json/countries` gives.

So `searchStationsWithFilters(query, filters, …)` is now the adapter's ONE request, and the shell's clear-on-search rules are **off** — a filter that is really answering the list must not be thrown away.

**The row menu.** "Add to Playlist" is **gone**: `PLAYLIST_ALLOWED_MEDIA_KINDS` holds `['audio','music','podcast']` / `['video','movie']`, and `radio` is in neither list — "a lane is not a permission". The sheet it opened listed NO compatible playlist, so the control could not act. What replaced it: **Play Next / Add to Queue** through the app's ONE wrapper (`useQueueActions`), because a station IS a playable stream URL. "Bookmark" is gone from the browse row: a bookmark is a POSITION in a file, and a live stream has none.

**The favourites route** was on a different menu entirely — an `OptionSheetDialog` of its own, with "Add to Playlist" (which could not act) and **no** queue action at all. It is now the app's one `MediaActionsSheet`, with Play Next / Add to Queue / Remove Favorite / Bookmark / Share, and its copy lives in `related/textContent.json`.

**The header's heart.** The saved-stations route had exactly one entry point, and the shared shell had no header slot for it — so the button drew itself ON TOP of the header, in the slot the header reserves. `InternalHeader` has carried a right-action slot all along; the shell now passes it through (`headerRightAction`), and both overlay buttons (Radio's and Live TV's) are deleted.

### 8.2 Live TV — the catalogue is one fetch, the scope is in memory

The IPTV source has **no per-scope endpoint**: the whole directory (2.8 MB, 12,269 entries) is fetched once and the scope is applied IN MEMORY over the same rows (`filterIPTVChannels` tests the category AND the term against the same row). So a category and a search term really do narrow the list together, and the shell's clear-on-search rules stay **off** here for the same reason as Radio.

The row is a channel — a playable stream — so it gets Play Next / Add to Queue and **not** "Add to Playlist" (`live-tv` is in neither playlist list).

The deep link `tv/:categoryId?` seeds the scope on a **cold start**: the categories are runtime data, so the option list is empty when the options are first read — and `useSectionOptions` seeds a group ONLY IF the param's value is one of the group's option keys. The config factory therefore puts the seed's own value in the option list up front, and the catalogue's entry replaces it (with the source's name) when the catalogue arrives.

### 8.3 Archive — the footer's ending is now honest

The Archive's list never ends: with `rows=40`, page 250 (10,000 items) answers normally and **page 251 answers HTTP 507 Insufficient Storage** (re-measured 2026-11-18). So the shared footer's "You're all caught up." would have been a lie for a list that stopped at the archive's cap.

The ending is therefore TWO honest branches: the source ran out of rows → "You're all caught up."; the list stopped at the 10,000-row cap while the source has more → the archive's own label, **"Showing 10,000 of 52,794 items — the archive stops paging here"**. The window-end label may only appear when the cap is what ended the list.

`IA_MAX_RETRIEVABLE` moved from the Movies screen's hook to **the adapter** that would earn the 507 — one owner, so the two screens cannot disagree about where the source stops.

The scope is the media type (Audio / Video), and a scope + a term are ONE request, so the clear-on-search rules are off. The quick-search presets are **gone**: they were pre-typed search terms — a second path to the search field — and the curated archive subjects are what the scope browses by default.

### 8.4 Shows — the rail is a header, and the catalogue pages honestly

TVMaze's `/shows` accepts **only** `page`: `?page=1&genre=Comedy`, `&genres=Comedy` and `&type=Scripted` all return the **identical 245 shows** (measured 2026-11-18). `GET /genres` is a **404**. So the screen's `initialGenre` never filtered anything, and no genre option list can be built without inventing it — there is no genre axis.

**A real paging bug, found and fixed.** The old hook used `PAGE_SIZE = 250` and stopped when a page came back short. Page 1 holds **245** shows, so the list **never paged**: 245 of ~95,000 shows, while the footer said "You're all caught up." The next page is now asked for by the **id window** (TVMaze pages by ids `[N·250 … N·250+249]`; the last populated page is 382 and page 383 is a 404), and a 404 past the end is translated into an empty page — the end, not an error.

The "Airing Today" rail is a **different list** (a different endpoint, episode-level, unpaged), so it is the FlatList's `ListHeaderComponent` — a horizontal list inside the header, scrolling with the catalogue — and it is drawn in the catalogue scope only.

The Search/Browse toggle is gone: the search field IS the scope switch, so the toggle was a second path to the same choice. And the route's promises now match what the screen can keep: `initialTab` is `'browse' | 'today'` (the scope group's own option keys), `initialGenre` is **deleted**, and a `query` param carries the term.

### 8.5 The adapter that lied about its own data

`getPopularShows(page, genre?)` was renamed `getShowsPage(page, signal?)`. TVMaze's `/shows` is **id-ascending** — page 1 is Downton Abbey and Hell's Kitchen, not Peaky Blinders — so nothing there is "popular", and the `genre` argument was ignored by the API.

---

## 9. The shared changes the four screens needed

The four migrations asked for six shared changes; all six landed.

| # | Change | Why |
|---|---|---|
| 1 | `BrowseLayout` gained a `headerRightAction` slot | `InternalHeader` had the slot all along; two screens were drawing their own button on top of the header |
| 2 | `radioBrowser/adapter.ts` gained `searchStationsWithFilters` | the endpoint answers a term AND the axes; the adapter did not expose it |
| 3 | `internetArchive/adapter.ts` gained `IA_MAX_RETRIEVABLE` | the 10,000-row cap is the ENDPOINT's, and it belongs beside the request that earns the 507 |
| 4 | `navigation/types.ts` — the Shows params now say what the screen can honour | `initialGenre` was a promise TVMaze cannot keep; `initialTab: 'search'` promised a tab the screen does not have |
| 5 | `navigation/linking.ts` — `parseShowsInitialTab` drops what it cannot honour | the same rule the Genre screen's parser uses |
| 6 | `tvmaze/adapter.ts` — `getPopularShows` → `getShowsPage` | the name lied and the `genre` argument was ignored |

Plus the three dead-constant deletions the Archive migration asked for (`ARCHIVE_QUICK_SEARCHES`, `ARCHIVE_BROWSE`, `ARCHIVE_CATEGORIES` — all three described a shell the screen has not had since V18.11.3).

---

## 10. The rest of the wave — the code items B14 and B15 left behind

### 10.1 R6 — `no-unused-vars` is ON again

The legacy override switched `@typescript-eslint/no-unused-vars` **off** for the whole legacy surface, and the test override switched it off for the tests too. That is how ~79 dead imports and bindings accumulated across 55 files without anything complaining.

Both are on now, with the `_` convention as the escape hatch, and the dead code is **removed** rather than hidden: dead imports, dead local declarations, dead functions, dead parameters.

Three of the removals were not mechanical and are worth naming:

- `SectionRouteParams<T extends SectionRouteKey>` declared a **phantom type parameter** the body never used. It is gone; `BrowseLayout` reads `SectionRouteParams` bare. A type parameter that constrains nothing is a lie about what the type guarantees.
- `podcastIndex/adapter.ts`'s `unwrap` / `unwrapArray` / `unwrapSingle` / `categoryFromRaw` were four dead functions. Deleting them revealed that `unwrap` was the only caller of a status guard — but the LIVE guard is `parseRawEnvelope`, which every endpoint calls. No behaviour changed.
- `src/state/settingsStore.ts`'s `_droppedAutoDelete` was already `_`-prefixed, which is exactly the convention the rule now honours.

### 10.2 The Jamendo genre badge — removed, and the wire claim with it

The Music detail screen drew a genre badge from `genreName`, and the badge was **dead for every track the app can show**: Jamendo's v3.0 track row has no `genre_name` at all.

Measured against the live API on 2026-11-18:

- `GET /v3.0/tracks/?limit=2` → the row carries `id, name, duration, artist_id, artist_name, album_id, license_ccurl, position, releasedate, album_image, audio, audiodownload, prourl, shorturl, shareurl, audiodownload_allowed, content_id_free, image` — **no `genre_name`**, no `musicinfo`.
- `GET /v3.0/tracks/?q=love&limit=2` → the identical key set. The search endpoint does not send it either.
- `GET /v3.0/tracks/?limit=1&include=musicinfo` → `musicinfo.tags.genres = ["rock","metal","hardcore"]`, +169 bytes on the row.

So the adapter's `JamendoTrackRaw.genre_name` was a **false claim about the wire**, and `decodeJamendoText(t.genre_name ?? '')` could only ever yield `''`.

The badge is gone, the false wire field is gone, `JamendoTrackResult.genreName` is gone, and the Audius result's `genre` — whose only reader was the same badge — is gone with it. The Music detail board already drew exactly two badges (duration and album), so the board and the app now agree, and nothing visible changed for the user.

### 10.3 The Audiobooks screen said "Unknown Author" on every row — found by the device proof

The device proof of the migrated Audiobooks screen showed ten rows, every one of them labelled **"Unknown Author"**. The cause was in the adapter, not the screen: LibriVox carries `authors` as an **array** of records that split the name into `first_name` / `last_name` —

```
"authors":[{"id":"431","first_name":"Alexandre","last_name":"Dumas","dob":"1802","dod":"1870"}]
```

(measured 2026-11-18, in both the list response and the single-book response) — and the adapter read `b.authors.name`: a property on an OBJECT, where the wire has an array of objects with **no `name` field at all**. The wire type said `authors?: {name?: string}`, so the type agreed with the reader and both were wrong.

The adapter now reads the array and joins the first and last name; a second author is added and a third makes it "et al.". The re-shot proof shows Alexandre Dumas, Honoré de Balzac, Charles Dickens, Anatole France, F. Scott Fitzgerald, Frances Hodgson Burnett, Mark Twain.

Three tests pin it: the full name, the two- and three-author lines, and the "Unknown Author" fallback.

### 10.4 The other cleanups

- The six orphan SVGs are gone (`ic_film_reel`, `ic_globe`, `ic_mountain`, `ic_music`, `ic_search_zoom`, `ic_volume_x` — zero references outside `graphify-out/`).
- `ENV.JAMENDO_CLIENT_SECRET` is out of `env.json`, `env.ts`, the Android asset, `.env.example` and the two credential docs. The Jamendo v3 **read** API needs `client_id` alone, and the secret shipped inside the APK for nothing.
- `Bookmarks/related/textContent.ts` (9 keys defined, 2 consumed, 6 dead, a `.ts` where the house pattern is `.json`) is now `textContent.json`, with the dead keys gone.
- `linking.ts:74`'s indentation was verified **already correct** → the finding is closed as STALE, not "fixed".
- `.verification/` (a stale Metro build artefact that was version-controlled) is untracked. The files stay on disk; `.gitignore` carries the rule now.
- `md/Text_Content_Reference.md`'s library table was rewritten against the real owners, and `md/CONTENT_OWNERSHIP.md` §6.2's first row was marked CLOSED.

---

## 11. The Penpot boards — no change was required

B16-G asked for boards for the four migrated screens. **The boards that exist already draw the shared browse grammar**, and the screens that changed are still honest placeholders in the prototype:

- The prototype's board generators draw the browse chrome (`designs/penpot/kit-v2.js`'s `browseKit` + each file's `chrome()`): the header with its trailing action, the search field, the active-filter chip strip and the floating filter FAB. The Radio board already drew the heart in the header's trailing slot — the very slot the shell now passes through.
- `ArchiveScreen`, `ShowsScreen`, `LiveTVScreen` and `AudiobooksScreen` have **no board of their own yet** — the registry carries them as placeholders. Drawing them is part of the standing "~48 screens" board work, not something this wave's code changes forced.
- The Music detail board drew **two** badges (duration and album), which is exactly what the app draws now that the dead genre badge is gone.

So no board change was needed, and none was made. The board gate is green: 51 app routes, 49 boards, 3 "no board, on purpose".

## 12. The device proofs

Five screens, photographed on the emulator (`emulator-5554`, the debug build against Metro), each reached by its deep link:

| proof | screen | what it shows |
|---|---|---|
| `device_proof/B16_J01_radio_browse.png` | Radio | the header with the heart in its trailing slot, the search field, live stations, the filter FAB |
| `device_proof/B16_J02_livetv_browse.png` | Live TV | the same furniture, live IPTV channels |
| `device_proof/B16_J03_archive_browse.png` | Archive | the same furniture, live Internet Archive rows |
| `device_proof/B16_J04_shows_browse.png` | Shows | the same furniture, with the "Airing Today" rail inside the list's header |
| `device_proof/B16_J05_audiobooks_browse.png` | Audiobooks | the same furniture, with the author names that the adapter had been dropping |

The same header, the same search field, the same floating filter button, the same list: that is the grammar, and it is now the app's, not the board's.

---

## 13. The gates

All six gates on the committed state:

```
tsc          exit=0
eslint       exit=0
boundaries   exit=0   606 files scanned, 0 error(s), 0 warning(s)
fonts        exit=0   668 resolved text usages, 11 shipped font files
boards       exit=0   51 app routes, 49 boards, 3 "no board, on purpose"
jest         exit=0   204 suites, 1955 passed, 1 todo, 1956 total
```

The suite count grew from 198 to 204 and the test count from 1912 to 1956: four new grammar suites (Archive, Shows, Radio, Live TV) and the LibriVox author's three new tests. Every pre-existing suite still passes.

---

## 14. Wave B16-K — the screens that dead-ended

The report: *"from music, when i click on some tracks it reaches here, not correct, also check live tv, audiobooks, and subsequent, its not reaching a proper place"* — with a screenshot of the Music detail screen reading **"Track not found"**.

Then: *"ui is also not darkmode, as we are in darkmdoe all through out now"*.

And the method: *"from live tv and others issue is different, but for some issues are there for the secordary pages, for some its ok, validate whuch has issues first, then only fix"*.

So this wave was a **sweep first and a fix second**. Every browse screen was reached on `emulator-5554`, its row tapped, and the landing page read off the accessibility tree and photographed. Only what actually broke was fixed.

### 14.1 The sweep — seven screens, seven landings

| screen | the row lands at | verdict |
|---|---|---|
| **Music** | `MusicDetail` → **"Track not found"** | **BROKEN** |
| **Live TV** | the full-screen player, the channel playing | OK — a live stream has no detail page |
| **Movies** | the full-screen player, the film playing (Elapsed 0:29) | OK — the same reason |
| **Shows** | `ShowDetail` — poster, meta, description, Bookmark, Season 1's episodes — **on a light page** | **BROKEN (theme)** |
| **Audiobooks** | `AudiobookDetail` — the data loads, but **"0 chapters"** and **no cover** — on a light page | **BROKEN (chapters + theme)** |
| **Archive** | `ArchiveItemDetail` — poster, description, "1 track", a playable track row — on a light page | **BROKEN (theme)** |
| **Radio** | the stream starts playing, and then the process **aborts natively** | **BROKEN (native)** |

Four defects in three screens, plus one that is not the app's code.

### 14.2 FIX 1 — a by-id lookup's empty answer is a DECLINED answer

The Music detail screen resolves the track by id: `getJamendoTrackById(trackId)`. Measured on the live API on 2026-11-19, eight identical requests to `GET https://api.jamendo.com/v3.0/tracks/?id=1932670` came back:

```
1,1,1,1,0,0,1,0
```

— HTTP 200, `headers.status = "success"`, `code = 0`, `error_message = ""`, and an EMPTY `results` array. A second run of twelve requests missed once more. The track exists; the endpoint declined to answer that time.

The LIST path already knew this — `fetchTracksWithRetry` repeats a request whose empty page is not an answer. The by-id path did not, so one declined answer became `null` and the screen said "Track not found" for the track the user had just tapped. Reproduced on the device by tapping "RED LIGHT, Egor Budennyy" (id 1932670).

The list path's rule could not be reused: the DECLINED by-id answers carry `results_count: 0` too, so the envelope's own count would call every empty "an answer" and the retry would never run. **For a by-id lookup the id is already known-good — it came from a list that showed the track — so an empty is never an answer.**

So the retry lives in the adapter (`BY_ID_RETRY_ATTEMPTS = 4`), not in the hook: the hook's TanStack `retry` only fires on a thrown error, and the adapter swallows transport failures by contract.

Proved on the device, inside the app's own runtime, by driving the adapter directly and counting the requests on the wire:

```json
[{"i":0,"ok":true,"attempts":1,"rows":[1]},   {"i":1,"ok":true,"attempts":1,"rows":[1]},
 {"i":2,"ok":true,"attempts":2,"rows":[0,1]}, {"i":3,"ok":true,"attempts":2,"rows":[0,1]},
 {"i":4,"ok":true,"attempts":1,"rows":[1]},   {"i":5,"ok":true,"attempts":1,"rows":[1]}]
```

Two of the six calls got an EMPTY first answer (`rows: 0`) and the adapter asked again and got the track (`rows: 1`). All six resolved. Before the fix those two were "Track not found".

### 14.3 FIX 2 — LibriVox sends the identifier, just not in the field the adapter read

Every audiobook page said "0 chapters" and showed no cover, because the chapter list AND the cover are both derived from the Internet Archive item identifier — and the identifier was empty.

Measured on the live feed on 2026-11-19 (`?format=json&limit=12`): **LibriVox sends `url_iarchive` for NO books.** Twelve of twelve had the key ABSENT. It sends `url_zip_file`, and that URL carries the identifier:

```
https://archive.org/compress/count_monte_cristo_0711_librivox/formats=…&file=/count_monte_cristo_0711_librivox.zip
```

So the identifier was on the wire all along and the adapter was reading a field the API does not send. The adapter now normalises it into the canonical `https://archive.org/details/<identifier>` form, so the IA adapter's `archiveIdentifierFromUrl` keeps its one job. Both IA URL forms are handled (`/compress/<id>/` and `/download/<id>/`).

Verified against IA: `https://archive.org/metadata/count_monte_cristo_0711_librivox` → HTTP 200, 1052 files, 256 mp3.

On the device, "Count of Monte Cristo" now reads **128 chapters**, shows its cover, and lists its chapters.

### 14.4 FIX 3 — the navigator owns the theme

`src/app/AppContent.tsx` rendered `<NavigationContainer ref={navigationRef} linking={linkingConfig}>` with **no `theme` prop**. React Navigation therefore used its DEFAULT (light) theme, and that theme's `card` background sat behind every screen.

A screen that paints its own background (the browse shell, `ScreenContainer`) covered it. A screen that did not showed the navigator's light card behind its own dark-theme text — the Audiobook detail, the Show detail and the Archive item detail, whose roots are `flex: 1` with no `backgroundColor`.

The theme belongs to the ONE owner that can set it: the navigator. One `theme` prop fixes every screen that does not paint its own background, rather than each screen patching its own root. The four font roles mirror the app's own typography tokens (`body1` / `overline` / `button` / `display`), and every baked family keeps its weight below 700, so Android's asset path stays `fonts/<Family>.ttf`.

### 14.5 The test that broke — and why the TEST was the thing that was wrong

`__tests__/app/AppContentOrientationLock.test.tsx` rendered `<AppContent />` bare. `AppContent` now reads `useTheme()`, so the suite threw `useTheme must be used within a ThemeProvider` — the one red gate of the wave.

The app never renders `AppContent` bare: `App` mounts `ThemeProvider`, `AppRoot` is its child, and `AppContent` is inside `AppRoot`. The test was testing a tree the app does not have. The suite now mounts the real `ThemeProvider` around `AppContent`, which is the world the component actually lives in.

### 14.6 The Radio crash — still open, and it is not the app's code

Tapping a radio station starts the stream and then aborts the process: **SIGABRT on the main thread**, `pid 7874`, `om.simba.player`. The tombstone (11,521 lines) says:

```
Abort message: 'fdsan: failed to exchange ownership of file descriptor:
fd 223 is owned by unique_fd 0x79cc1c6e311c, was expected to be unowned'
```

and the frames run `Notification.Builder.build()` → `Notification.reduceImageSizes()` → `Icon.scaleDownToAshmem()` → `Icon.scaleDownIfNecessary()` → `BitmapCache.getShared()` → `Bitmap.asShared()` → `Bitmap_copyAshmem` → `ashmem_create_region`, out of **`MediaPlaybackService.buildNotification`**.

That is the media lib's own notification, in `android/src/main/java/com/simba/player/MediaPlaybackService.kt`:

- `loadArtworkBitmap(path)` decodes the artwork **on the notification thread** — for a REMOTE url that is a network fetch, on EVERY ticker tick (the logcat shows `Failed to load artwork: null` once per second);
- the fallback is `BitmapFactory.decodeResource(resources, android.R.drawable.ic_media_play)`, and `decodeResource` hands back the SAME cached framework bitmap every time;
- the resulting bitmap goes to `setLargeIcon`, and the framework's own downscale-and-share path then aborts the process when that bitmap is shared twice.

**It did not reproduce on the re-test.** The same station, tapped again on the same build, played for the whole observation window (position 21947 → 22946 → 23850 → 24939 ms) with the process alive — so it is INTERMITTENT, and it depends on the artwork the notification happens to be holding.

The fix belongs in the LIB, not the app: the notification must not hand the framework a bitmap that can be shared twice, and it must not fetch a remote image on the notification thread. That is a lib change, a lib release, an app dependency bump and a NATIVE rebuild — see **B16-K-RADIO-NOTIFICATION** in the carried-forward list.

### 14.7 The device proofs

Four screens, photographed on `emulator-5554` after the fixes:

| proof | screen | what it shows |
|---|---|---|
| `device_proof/B16_K01_music_detail.png` | Music detail | the exact track from the bug report — id 1932670, "LOW" by Egor Budennyy — with its artwork, duration, album and the Play button, instead of "Track not found" |
| `device_proof/B16_K02_audiobook_detail.png` | Audiobook detail | "Count of Monte Cristo" in DARK, with its cover, **128 chapters** and the chapter list |
| `device_proof/B16_K03_show_detail.png` | Show detail | "Downton Abbey" in DARK, with its poster, meta, Bookmark and Season 1's episodes |
| `device_proof/B16_K04_archive_detail.png` | Archive item detail | "The Avenger and The Six Shooter" in DARK, with its poster, description, "1 track" and the playable track row |

### 14.8 The gates

```
tsc          exit=0
eslint       exit=0
boundaries   exit=0   606 files scanned, 0 error(s), 0 warning(s)
fonts        exit=0   668 resolved text usages, 11 shipped font files
boards       exit=0   51 app routes, 49 boards, 3 "no board, on purpose"
jest         exit=0   205 suites, 1968 passed, 1 todo, 1969 total
```

One suite and thirteen tests more than the last wave: the new `byIdRetry` suite (8 tests) and the LibriVox identifier tests (5).

---


## 15. Wave B16-L — the notification handed the framework the same bitmap twice

### 15.1 The cause, measured from the tombstone

The crash is the lib's media notification, not the app's navigation. The tombstone of the abort
(`X:/Development/SIMBA/.scratch-figcraft/tombstone_12.txt`, 11,521 lines, pid 7874, SIGABRT on the
main thread) says:

```
Abort message: 'fdsan: failed to exchange ownership of file descriptor:
fd 223 is owned by unique_fd 0x79cc1c6e311c, was expected to be unowned'
```

and the frames run:

```
MediaPlaybackService.buildNotification
MediaPlaybackService.handleStart
Notification$Builder.build
Notification.reduceImageSizes
Icon.scaleDownToAshmem
Icon.scaleDownIfNecessary
BitmapCache.getShared
Bitmap.asShared
Bitmap.createAshmemBitmap
Bitmap_copyAshmem
bitmapCopyTo
SkBitmap::tryAllocPixels
AshmemPixelAllocator::allocPixelRef
Bitmap::allocateAshmemBitmap
ashmem_create_region
ashmem_open
unique_fd_impl::reset
android_fdsan_exchange_owner_tag
fdsan_error
```

The fd table in that same tombstone holds **TWO descriptors on the SAME ashmem region** — fd 145
(unowned) and fd 223 (owned by unique_fd) — which is the framework in the middle of making a shared
copy of an icon bitmap whose pixels already lived in a shared region.

**⇒ THE CAUSE: the notification handed the framework a bitmap it had already been handed.** The
framework SHARES the icon bitmap it is given — `Icon.scaleDownToAshmem` turns it into an
ashmem-backed bitmap so the system UI can read it. Hand it the same instance twice and the second
handover operates on a bitmap that is already shared.

And the same instance WAS handed twice, back to back, on every start:

- `handleStart` builds the notification **twice** — once inside `applyMetadata()` (which notifies)
  and once for `startForeground()`;
- when the artwork could not be loaded, BOTH builds fell back to
  `BitmapFactory.decodeResource(resources, android.R.drawable.ic_media_play)` — the
  **RESOURCES-CACHED** bitmap, one instance shared with every other user of that drawable.

The radio rows are what made it reachable: they pass a **REMOTE** image URL, that fetch failed on
device (`Failed to load artwork: null` once per second in the logcat — measured again on the old
build at 16:54:26 → 16:54:31, one line per ticker tick), and so every notification build took the
fallback.

### 15.2 The fix — in the LIB

The lib now has one owner for the notification's artwork: `NotificationArtwork`
(`android/src/main/java/com/simba/player/NotificationArtwork.kt`). Three rules:

1. **The framework is handed a FRESH copy on every notification build.** The bitmap the class owns
   is never handed over — only copies of it are — so the framework's sharing can never touch the
   source.
2. **The fallback is OUR copy of the drawable**, not the Resources-cached instance.
3. **The artwork is fetched OFF the notification thread**, once per artwork path. It used to be
   fetched while the notification was being built — once a second, with a 3 s connect and a 5 s read
   timeout, on the main thread.

The service no longer decodes bitmaps at all. `setArtworkPath()` is the one owner of the artwork
path; it tells the artwork, and the artwork fetches in the background.

### 15.3 The release

- lib `@simba-dev/react-native-media-player` **3.3.7** — committed as `a4c4564`, tagged `v3.3.7`,
  published to npm by the tag-driven CI (run 44524499746) at 12:36:55 UTC.
- the app now depends on `^3.3.7`, installed from npm (no local reference), and the APK was
  rebuilt NATIVELY — the change is Kotlin, so a JS reload would not have carried it.

### 15.4 The gates

The lib's gates, on the 3.3.7 tree:

```
:simba-dev_react-native-media-player:testDebugUnitTest   BUILD SUCCESSFUL
    NotificationArtworkTest   15 tests, 0 failures, 0 skipped
    every pre-existing suite passes with the same skip counts
npm run typecheck                                            clean
npm test -- --ci                                             20 suites, 289 tests, all pass
npm pack --dry-run                                           3.3.7, 59 files, android/src/test excluded
```

The Kotlin unit tests are run through the **example app's** gradle project (the lib has no gradle
project of its own — it inherits the consumer's `rootProject.ext`).

### 15.5 The device proof

Measured on **emulator-5554** (AVD `Medium_Phone`, `sdk_gphone16k_x86_64`, Android 17 / API 37),
on the natively rebuilt **3.3.7** APK installed with `adb install -r`. The station was driven
through the app's own UI with argent — the Radio screen via the app's own
`navigationRef.navigate('RadioScreen')` over the Metro debugger, then the row's play button — and
the station was **Radio Armisa** (`https://onair.armisa.it/listen/armisa/radio.mp3`, MP3, 128 kbps).

**The old build, for comparison:** `Failed to load artwork: null` once per ticker tick
(16:54:26.117 → 16:54:31.323 — six lines in six seconds), then the process aborted with the fdsan
message in §15.1 (tombstone, pid 7874).

**The new build — the fallback path, deliberately exercised.** The crash needed the artwork fetch
to FAIL, so the fetch was made to fail: the app's own
`startAudioPlayback({ uri, title, artworkPath })` call — the same call the catalogue rows make —
was handed an unreachable artwork URL (`http://127.0.0.1:9/unreachable-artwork.png`). The
notification then had to fall back to the drawable, which is the exact state the old build died in.

What the logcat shows after the marker `19:23:35` (3,403 lines scanned):

| Measure | Old build | New build (3.3.7) |
|---|---|---|
| `Failed to load artwork` | once per ticker tick | **1** line in 78 s — `11-20 19:23:35.836 W/NotificationArtwork(22187): Failed to load artwork: Failed to connect to /127.0.0.1:9` |
| `fdsan` / `Fatal signal` / `Abort message` | SIGABRT, pid 7874 | **none** |
| the app process | aborted | **pid 22187 before and after** — no restart, no crash |
| playback | died with the process | position advanced 75,139 ms → 77,175 ms, `PLAYING` throughout |

The position ticker rebuilt the notification **once per second** for the whole 78 seconds — 78
notification builds, 78 handovers of the fallback bitmap to the framework, and not one abort. The
old build died on the second handover.

Screenshots: `device_proof/B16_L01_radio_notification.png` (the media notification showing
"Radio Armisa" with the **fallback** artwork — the failure path, visible on screen) and
`device_proof/B16_L02_now_playing.png` (the Now Playing screen).

Raw captures, outside the repo: `X:/Development/SIMBA/.scratch-figcraft/b16l-21-after.log` (the
scanned logcat), `b16l-30-notification.png`, `b16l-31-nowplaying.png`.

### 15.6 The app's gates

All six, on the app tree with the 3.3.7 dependency installed:

```
tsc          exit=0
eslint       exit=0    (--max-warnings 0)
boundaries   exit=0
fonts        exit=0
boards       exit=0
jest         exit=0    205 suites, 1968 passed + 1 todo, 0 failed, 50.9 s
```

Outputs: `X:/Development/SIMBA/.scratch-figcraft/gates-waveB16l/`.

---

## 16. Wave B16-K — the three screens that borrowed their background

### 16.1 The carried-forward item named a defect that was real, and a count that was not

The item said **"30 screens still have no themed root background"**. The first sweep agreed
with it — 22 screens whose root container had no `backgroundColor` — and the first uniform
edit painted all of them. That edit was **reverted, not shipped**: it was wrong, and the
device said so.

A screen in this codebase owns its background in TWO ways, and the first sweep only knew
one of them:

1. **the root paints it** — `Home`, the list pages, the detail pages;
2. **the root carries a full-bleed themed gradient** — `<LinearGradient colors={[colors.background.primary,
   colors.background.elevated]} style={StyleSheet.absoluteFill} />`. That gradient paints OVER
   the root, so it IS the screen's surface, and a root background under it would never be seen.

The gradient form covers **20** screens: About, Album, AllAudio, AllPlaylists, AllVideos,
Artist, Changelog, Credits, Downloads, Equalizer, FolderBrowser, Genre, Help, Licenses,
PlaylistDetail, Privacy, Queue, Search, Song and Terms. Re-running the first sweep's rule
set today (the two false negatives below fixed) names exactly those 20.

The device caught the rest of it. On the About screen the page surface was measured before
and after the first edit:

| build | light mode, top of the page → bottom | dark mode, top → bottom |
|---|---|---|
| before (the screen's own gradient) | `#F6F2EB` → `#FDFCFB` | `#0B0B0D` → `#121214` |
| after (the first edit's flat background) | `#F5F0E8` everywhere | `#0A0A0C` everywhere |

The first edit had put a background on a container that **wrapped** the gradient, so it
replaced the app's surface with a flat colour — a regression in three screens (About,
Privacy, Terms). The whole edit was reverted and the gate was rewritten to know about the
gradient form.

### 16.2 The corrected gate, and the two false negatives it had

`scripts/check-themed-roots.js` decides whether a screen owns its background. A screen passes
when

- its root IS `ScreenContainer` or `BrowseLayout` (both paint `colors.background.primary`), or
- its root paints a themed background — `backgroundColor:` with a `colors.background.*` colour,
  inline or through its style block, or
- its root carries a full-bleed themed gradient (the form above).

Anything else fails, and the gate names the file and the line.

Two things had to be fixed before the gate could be trusted, and both were found by RUNNING
it rather than by reading it:

- **A `return null` in a NESTED helper skipped the whole file.** FolderBrowser's empty state
  returns null; the gate read that as "this screen renders nothing" and never looked at
  FolderBrowser's root. The check now reads only the screen's own shallowest `return`.
- **A screen that reads its colours from its own hook was skipped.** Home does not call
  `useTheme()` — it takes `colors` from its own hook — so the old scope test left Home
  unchecked. The scope test is the theme colour itself now.

With both fixed, the gate names **three** screens on the pristine tree:

```
src/screens/ArchiveItemDetailScreen/components/ArchiveItemDetailScreen.tsx:426  <View>
src/screens/AudiobookDetailScreen/components/AudiobookDetailScreen.tsx:581     <View>
src/screens/ShowDetailScreen/components/ShowDetailScreen.tsx:232                <View>
```

Those are exactly the three screens §14.4 named when React Navigation's default LIGHT
card showed through their transparent roots.

### 16.3 The fix

Each of the three now paints `colors.background.primary` on its root — and on **all three**
of its roots (the loading state, the error state and the loaded screen), because a loading
state is a full screen too, and it was transparent as well.

```
3 files changed, 9 insertions(+), 9 deletions(-)
```

### 16.4 The gate is wired into CI

`package.json` gains `lint:themed-roots`, and `.github/workflows/ci.yml` runs it next to the
import-boundary linter — so a screen cannot go back to borrowing its background.

### 16.5 The device proof — and what it does NOT show

Measured on `emulator-5554`: the Show detail (Downton Abbey), reached the same way on both
builds (Shows screen → the show row), each time from a FRESH app start in the app's own
dark theme, with the page surface sampled at five points:

| build | page surface at (40,300) (40,900) (40,1500) (40,2000) (1040,2000) |
|---|---|
| without the fix | `#0A0A0C` `#0A0A0C` `#0A0A0C` `#0A0A0C` `#0A0A0C` |
| with the fix | `#0A0A0C` `#0A0A0C` `#0A0A0C` `#0A0A0C` `#0A0A0C` |

**The two builds are identical, and that is the honest result.** §14.4 already gave the
navigator a themed card of the same colour (`card: colors.background.primary`,
`src/app/AppContent.tsx:160`), so a transparent root on a pushed screen shows a surface of
the right colour anyway. The fix does not change what the user sees on the push path — it
removes the screen's DEPENDENCE on what happens to be behind it, and the gate stops that
dependency from coming back.

Proofs: `device_proof/B16_K05_show_detail_dark_before.png` and
`device_proof/B16_K06_show_detail_dark_after.png`.

One thing the measurements cleared up, and it is worth recording because the first sweep
got it wrong: the light page of §14.4 was **not** a hard-coded light palette anywhere (the
theme has one source: `src/theme/index.tsx` → `useTheme()` → the settings store). It was
the navigator's default theme. FIX 3 fixed the symptom at the navigator; this wave removes
the class of screen that made it visible.

A second measurement, recorded because it is easy to misread a before/after pair:
**switching the theme while a screen is open does not repaint that screen.** With the Show
detail open, the store was set to `light` and the page stayed `#0A0A0C` at every sampled
point — the open screen does not re-render on a theme change. An earlier before/after pair
taken across such a switch looked exactly like the light-page symptom; it was the stale
frame, not the transparent root. The pair above was retaken from a fresh start on both
builds for exactly that reason.

### 16.6 The gates

```
tsc          exit=0
eslint       exit=0
boundaries   exit=0   scanned 606 files — 0 error(s), 0 warning(s)
fonts        exit=0   every usage resolves to a shipped font file (11 shipped)
boards       exit=0   the board registry covers every app route
themed       exit=0   every screen owns a themed background.
jest         exit=0   205 suites, 1968 passed, 1 todo, 1969 total
```

---
## 17. CARRIED FORWARD

Each item, individually, with the reason it could not be closed in this wave.

### From this wave

- **B16-J-LISTPAGES — the list-page variant of the grammar.** `Genre`, `AllVideos`, `AllAudio`,
  `FollowedPodcasts`, `History`, `DownloadsScreen`, `Bookmarks` need a shell variant with no
  filter groups, no paging and no footer. **Reason: a design decision, not a refactor** — it
  changes the shared shell's contract and every screen that uses it.
- **B16-J-ALLAUDIO — All Audio rows have no long-press menu.** An audio file cannot be played
  next or queued from that list, while the same file can be from every other list. **Reason: it
  belongs to the list-page wave, and it needs the `MediaActionsSheet` decision that wave makes.**
- **B16-J-ARCHIVE-DEFAULT — the Archive's curated browse default is invisible.** The scope
  browses "old time radio" / "classic films" while the search field stays empty, so the list
  answers a question the user cannot see. **Reason: the grammar's search field owns the visible
  term** — surfacing the default would need the shell to pre-fill the field, which is a shell
  contract change.
- **B16-J-ARCHIVE-VIDEO — the Archive's video scope opens `MovieDetail`** (today's behaviour)
  rather than resolving and playing the way the Movies screen's rows do. **Reason: a separate
  decision about what an archive collection is.**
- **B16-J-SHOWS-ORDER — the Shows catalogue opens oldest-first.** TVMaze's `/shows` is
  id-ascending, so page 1 is Downton Abbey and Hell's Kitchen. **Not a bug — the source's order.**
  It is recorded because `getPopularShows` used to promise "popular".
- **B16-J-RADIO-BOOKMARK — the two Radio routes now disagree about "Bookmark".** The browse row
  dropped it (a bookmark is a POSITION in a file, and a live stream has none); the favourites
  route still offers it. **Reason: one decision is needed — drop it from both, or keep it on
  both with the same reason.**
- **B16-J-LIVE-TV-SORT — no sort axis on Live TV.** **Reason: no shipping app sorts a live-TV
  guide** (Plex / YouTube TV keep the guide's order), and the catalogue publishes one order.
- **B16-J-DEEP-LINK-PROOFS — the deep links are pinned by tests, not photographed.** `tv/news`,
  `shows/today` and `radio?initialTag=pop` seed their scopes in tests against a stubbed adapter;
  the device proofs show the screens, not the seeded states. **Reason: each seeded state needs
  its own cold start on the emulator.**
- **B13-3 (remainder) — the shared shell's FAB is not keyboard-aware.** The header's
  `rightAction` slot, the group-aware chip keys and the multi-group routing are all in. **The
  keyboard-aware FAB is not:** the shell has no `KeyboardAvoidingView`, so the floating filter
  button stays under the keyboard. **Reason: it changes the shell's layout contract.**
- **B13-13 (remainder) — the Live TV board.** Radio and Live TV are on the shared shell (the code
  half). **The Live TV board is still a placeholder** in the prototype. **Reason: part of the
  standing board work for the ~48 screens that have no board yet.**

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
- **B15-P2** — the player's sheets have no Penpot board.

### From B14 — still open

- **B13.9** — the MusicDetail board's device-frame variant.
- The MusicDetail board-vs-device check.
- **B13-6** — the 44 dp floor is applied nowhere; the shared chip is 23 dp and the sheet chip is
  32 dp.
- **B13.1-2**, **B13.18 / B-11-2**.
- **B12-1, B12-2, B12-3, B12-4, B12-7, B12-8, B12-9, B12-13**.
- **B-11-4, B-11-5, B-11-7**.
- **R4** — a persisted, timestamped roll-up for the Stats screen.
- **R5** — the 68 named dead exports, the 8 store keys and the Help FAQ answers.
- **CO-06**, **CO-07**.
- **B13.1-1** — the 960 `#EXTVLCOPT` directives: needs a lib option and a published release.
- **B13.1-5**, **B13.1-6**.
- The unregistered iOS URL scheme.

### Closed in this wave (from the carried-forward lists)

- **B16-K-THEME-SWEEP** — the three screens that borrowed their background (the Show detail, the
  Audiobook detail and the Archive item detail) now paint their own; the 20 screens that own a
  full-bleed themed gradient were left alone, and `scripts/check-themed-roots.js` is in CI.
- The Jamendo genre badge (dead code) — the badge, the false `genre_name` wire field and the
  Audius `genre` field are gone; the board already drew two badges.
- **B13-4** — the four identical Radio / Live TV blocks: they were the shell's own chrome, and
  both screens now use the shared shell.
- **B13-12** — Audiobooks, Archive and Shows are all on the shared shell.
- **B13.19** — the Jamendo empty-page retry is bounded by the envelope's own `results_count`.
- **B13.20** — the Radio GENRE list: the whole tag list IS the genre axis, because the source has
  no other list (`/json/tags` ignores its `type` parameter — measured), and the chip's key is the
  tag's NAME because the record carries no id.
- **B12-11** — `categoryId` is reachable: the Live TV deep link seeds the scope on a cold start.
- **B12-12** — `FilterSheet`'s `toggleLabel` / `resetText` carry the baked-weight family.
- **R6** — `no-unused-vars` is ON for the legacy surface and the tests, and the dead code is gone.
- `ENV.JAMENDO_CLIENT_SECRET` — the v3 read API needs `client_id` alone.
- `.verification/*.bundle` — the stale build artefact is untracked and gitignored.
- The five orphan SVGs (deleted) and `linking.ts:74`'s indentation (verified already correct —
  closed as STALE, not "fixed").
- `md/Text_Content_Reference.md:175-176` and `md/CONTENT_OWNERSHIP.md` §6.2 / §6.4.
- `useLibraryScreen`'s unused `fabBottomInset`.
- `Bookmarks/related/textContent.ts`'s dead keys — the file is `textContent.json` now.

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
