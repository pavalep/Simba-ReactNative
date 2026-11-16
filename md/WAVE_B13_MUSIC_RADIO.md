# Wave B13 — Music and Radio: the browse grammar, the two screens that were not using it, and the API that answers a quarter of the time with nothing

**Date:** 2026-11-16
**Branch:** `f5/w22-close-minimise-d9`
**Scope:** the Music surface, the Radio surface, its Live TV twin, the browse grammar the whole family shares, and the two APIs behind them.

**The owner's ask, in order:** analyse the Music and Radio code → find the dead code, the bad implementation and the bad UI elements, and say what can be deleted → update the UI in Penpot → then perfect it again in code and UI/UX. Then, widened: *"deep analyze rest also, since we will be creating a cohesive, UI/UX flow, which is uniform in nature right, so check all from movies, podcasts, to live tv, audiobooks etc, the design should feel cohesive, when we refactor others also."*

---

## 1. The finding that shaped this wave

### 1.1 The family is one page with eight contents

The app's own shell says it outright (`src/screens/_shared/BrowseLayout.tsx:3-5`):

> *"Music, Movies and Podcasts are the same page with different content: a header, a search field, a strip of the ACTIVE filters, the content itself, the filter FAB and the filter sheet."*

Eight surfaces answer to that description:

| Surface | On the shared shell? | Its own copy of the shell? |
|---|---|---|
| Movies | **yes** | no |
| Podcasts | **yes** | no |
| Music | **yes** | no |
| Radio | no | **yes** — `RadioContent.tsx:347-422` rebuilds the header, the field, the chip row, the FAB and the sheet |
| Live TV | no | **yes** — `LiveTVContent.tsx:379-440` |
| Audiobooks | — | audited in §5 |
| Archive | — | audited in §5 |
| Shows | — | audited in §5 |

The shared shell was created because the shell used to exist in **three** copies — "Three copies meant three places to fix one bug, and the wave's audit found exactly that" (`BrowseLayout.tsx:14-16`). Two more copies were added later and never moved.

### 1.2 The measurements — Jamendo answers a quarter of the time with nothing

This is the finding no source-read would have found, and it is the reason the Music screen sometimes shows **"No Rock tracks found"** for a genre with thousands of tracks.

Jamendo's `/tracks/` endpoint returns HTTP 200 with an **empty** `results` array, intermittently, for the *same* URL with the *same* parameters. Measured on 2026-11-16 with the app's own client id:

| Strategy | Empty results over 3 passes × 10 genres |
|---|---|
| **A — one fixed `order`** (what the genre path sends today) | **10 / 30** |
| **B — the app's existing five-order chain** | **1 / 30** |
| **C — no `order` parameter at all** (what the search path sends today) | **12 / 30** |

The search path, measured on its own over 10 passes with `search=love`: **3 / 10 empty**. And a plain retry closes the gap completely — 30 of 30 requests recovered within three retries (23 on the first try, 5 on the second, 1 on the third, 1 on the fourth).

**The app already knows this.** The Jamendo adapter carries a five-order fallback chain and says why (`src/infrastructure/api/jamendo/adapter.ts:21-25`):

> *"`getPopularJamendoTracks` is a special case: it tries multiple `order` params (Jamendo's per-order availability is unreliable) and remembers the first one that yields rows."*

**Only the popular path has it.** The genre path sends one fixed `order: 'popularity_total'` and gives up (`adapter.ts:271`); the search path sends no `order` at all (`adapter.ts:243-250`). So the screen's three scopes have three different reliability profiles, and the two worst ones are the ones the user actually touches.

The chain plus one retry, measured over the same 10 genres: **0 failures / 10**, at 13 requests. Over the search path: **0 failures / 10**, at 15 requests.

**Why an empty result is not an answer:** TanStack Query treats an empty array as a **success**. Its retry policy only fires on a thrown error, so a flaky-empty page is cached as the truth and the empty state is shown. The retry has to live in the adapter, where the empty response is still visible.

### 1.3 The measurements — radio-browser's tags have no id

The Radio filter sheet's rows are built by `RadioContent.tsx:56-60`:

```ts
function toRadioTagRow(t: unknown): {key: string; label: string} {
  return typeof t === 'string'
    ? {key: t, label: t}
    : {key: (t as {id: string}).id, label: (t as {name: string}).name};
}
```

It reads `.id`. The adapter's tag type has no `id` (`radioBrowser/adapter.ts:72-75`):

```ts
export interface RadioBrowseTag {
  name: string;
  stationCount: number;
}
```

and the **live endpoint** agrees — `/json/tags?type=genre` returns records whose only keys are `name` and `stationcount`:

```
record count: 80
first record keys: name, stationcount
first record: {"name":"pop","stationcount":5139}
```

So `t.id` is `undefined` for every genre, country and language. The `as unknown[]` cast at `RadioContent.tsx:395` is what kept the compiler quiet about it.

### 1.4 One claim that measurement refuted

The Music audit reported that *"Hip-Hop" queries a Jamendo tag that cannot exist* and that the real tag is `hiphop` (which lives in the app's unused `JAMENDO_GENRES` list). **The measurement does not support it.** With the endpoint retried until it answers:

```
tags=hip-hop    rows=20  empties-before-success=2
             the genres the rows actually carry: hiphop, rap, pop, rnb, soul, electronic, …
tags=hiphop     rows=20  empties-before-success=0
             the genres the rows actually carry: hiphop, rap, pop, rnb, soul, electronic, …
tags=hip hop    rows=0   empties-before-success=8   ← the one that genuinely has no rows
```

`hip-hop` **is** a valid Jamendo tag. The earlier "Hip-Hop returns empty" reading was the flakiness of §1.2, not a bad tag. The finding is recorded here so the next agent does not "fix" a spelling that was never broken.

### 1.5 The Music filter is declared multi-select and consumed as single-select

`related/browseConfig.ts:22-33` declares `multiSelect: true` and its own comment says *"the selected genres OR together"*. `MusicContent.tsx:57-61` reads only `rawFilter[0]`. The user can hold "Rock" **and** "Jazz" in the chip strip while the list answers **Rock only** — the exact *"a filter that looks applied and is not"* failure the shared shell has two flags for (`BrowseLayout.tsx:53-81`) and that Podcasts turns on (`PodcastsScreen/index.tsx:40-47`).

Jamendo's `/tracks/` accepts `search` **and** `tags` together, so the genre filter can genuinely survive a search — measured: `search=love&tags=rock` returns rows whose genres are the rock set (`(search+genre) ∩ genre = 3`, `(search+genre) ∩ search = 0`), while `search ∩ genre = 0`.

---

## 2. THE GRAMMAR — the nine elements

One contract, for every surface that browses a catalogue. Every number below is read out of the app's own source — the file and line are given, so a board can be drawn from the rule and not from a screenshot.

| # | Element | The rule | Where the number lives |
|---|---|---|---|
| 1 | **The page** | `background.primary` + `SimbaStatusBar variant="home"`; the content starts **24 dp** down (the status bar is a strip, not an overlay) | `BrowseLayout.tsx:203-208`; the 24 dp measured on `emulator-5554` |
| 2 | **The header** | `InternalHeader` — one centred title, `displaySans` (Manrope SemiBold 22), no subtitle on a browse page | `InternalHeader.tsx:66-98`; `theme/tokens.ts:433` |
| 3 | **The search field** | 44 dp tall, `radius.pill`, `background.elevated`, a 1 px `border.subtle` hairline, 12 dp of padding, an 18 dp magnifier, Inter 15 px, 8 dp after the glyph | `SearchBar.tsx`; `BrowseLayout.tsx:299-303` — the field sits in a `spacing.lg` gutter with `spacing.lg` above and `spacing.md` below |
| 4 | **The active-filter strip** | the shared `FilterChips` — a 11 px Inter SemiBold label in a 1 dp-bordered pill, `paddingVertical: 4`, `spacing.sm + 2` of horizontal padding, `radius.pill`; the row's own 12 dp padding is **dropped** so the gutter is 16 and not 16 + 12 | `FilterChips.tsx:207-231`; `BrowseLayout.tsx:224-236, 304-310` |
| 5 | **The content** | four states, and only four: **loading** (an `ActivityOrb` in an elevated pill), **error** (the shared `ErrorState`, which owns the retry button), **empty** (the shared `EmptyState`), **list** | `MoviesScreen/components/ListStates.tsx`; `components/feedback/ErrorState`; `components/feedback/EmptyState` |
| 6 | **The rows** | artwork → title → meta → one trailing affordance. The title is `bodySmall` on `FONT_FAMILY.inter.semibold`; the meta is `caption`; the artwork is a **square** tile with the surface's own glyph on a `goldDim` plate until the image decodes | `PodcastRow.styles.ts:36-52`; `TrackCard.styles.ts`; `RadioStationCard.tsx` |
| 7 | **The in-flow footer** | four branches: **loading more** (an orb), **failed** (a tap-to-retry pill), **caught up** (one line), **idle** (a spacer). The list's end is always *stated* | `MoviesFooter.tsx:78-93`; `PodcastsFooter.tsx:64-76` |
| 8 | **The filter button** | a 56 dp gold disc with the `sliders` glyph, `spacing.xl` from the right edge, floating at `insets.bottom + spacing.lg` (**40 dp** above the bottom), a badge carrying the active-filter count, and it **gets out of the way** at the end of the list | `Fab.tsx:63, 143-152`; `BrowseLayout.tsx:101-116, 240-249` |
| 9 | **The filter sheet** | the shared `FilterSheet`: a 32 dp chip with a 1.5 dp border and 12 dp of padding, an 11 px `groupTitle` in Inter SemiBold, a 40 dp grabber zone, a divider with 12 dp either side, and a RESET footer that appears **only when something is active** | `FilterSheet.tsx:471-540`; `useSectionOptions.ts:126-132` |

### 2.1 The rules that are NOT in the app's own source — the deletions

Some things the surfaces do today are inventions of their own. The grammar removes them, because the app has one way of doing each of these:

1. **A second play affordance inside a play row.** The row is the action; a gold disc inside it reads as a second button that does nothing. Spotify and YouTube Music do not put a play button inside a row that already plays.
2. **A glyph that shows one state with another feature's icon.** The Radio row draws the **bookmark** glyph to show the **favourite** state, while the app's own favourite language is a heart (`heartPulse`, used by the Radio header).
3. **A raw error message in place of the friendly one.** The house pattern is the friendly message with the raw error **under** it as `errorDetail` (`MoviesScreen/components/ListStates.tsx:67-83`).
4. **A copy string that names a control that is not there** — *"Use Retry at the bottom of the screen to try again."* over a screen with no bottom retry.
5. **A second gutter.** 12 dp where the shell says 16.
6. **A hard-coded bottom padding** where the house has one rule (`useBottomChromeInset() + FAB_SIZE + spacing.md`).

### 2.2 The font rule, which the whole family breaks

`src/constants/fontFamily.ts:8-18` records how a font is really resolved on Android: RN builds `fonts/<family><suffix>.ttf`, where the suffix comes from the weight — **below 700 the suffix is empty**. So a style with `fontWeight: '600'` over the family `Inter` opens `fonts/Inter.ttf`, i.e. the **Regular** face, and the SemiBold is unreachable.

The typography tokens confirm it: `bodySmall` is `FONT_FAMILY.inter.regular` + `fontWeight: '400'` (`theme/tokens.ts:422`).

So **every browse row that writes `fontWeight: '600'` is drawn in Regular while the design says SemiBold.** It is the same line in five places:

| file:line | what |
|---|---|
| `RadioScreenNew/components/RadioStationCard.tsx:143` | the station name |
| `LiveTVScreenNew/components/ChannelCard.tsx:137-139` | the channel name |
| `ArchiveScreen/styles/index.ts:31` | the archive row name |
| `AudiobooksScreen/styles/index.ts:35` | the audiobook row name |
| `RadioScreenNew/styles/index.ts:22` + `LiveTVScreenNew/styles/index.ts:26` | the filter chip label |

Music's own row was already fixed the right way — `TrackCard.styles.ts:42-50` carries the family key and a comment explaining exactly this failure. The rule is not new; it is not applied.

---

## 3. The Music audit — thirty findings

Severity 1 = wrong behaviour · 2 = bad implementation · 3 = dead code or bad UI.

| id | sev | the finding | the evidence |
|---|---|---|---|
| M-01 | 1 | **Pagination never terminates.** The comment describes a short-page guard that is not in the code: `lastPage` is bound to `_lastPage` and never read, so `getNextPageParam` always returns `page + 1` and `hasNextPage` is permanently `true`. The filter FAB therefore never gets out of the way (`MusicContent.tsx:92` → `BrowseLayout.tsx:247`), and every scroll to the end fetches another page — on the "All" branch, up to **four** HTTP requests | `useMusicScreen.ts:109-116` |
| M-02 | 1 | **The genre group is multi-select in the sheet and single-select in the data** — see §1.5 | `browseConfig.ts:25` vs `MusicContent.tsx:57-61` |
| M-03 | 1 | **The search silently drops the genre**, and the chip stays on screen — see §1.5. Jamendo can do both; the app asks for one | `useMusicScreen.ts:59-61` |
| M-04 | 1 | **The Jamendo endpoint answers a quarter of the time with nothing**, and the app caches that emptiness — see §1.2 | `jamendo/adapter.ts:243-250, 264-271` |
| M-05 | 1 | **A deep link can arrive without `source`.** The path is `music/:trackId/:source?` but the route type requires it, so `simbaplayer://music/42` reaches the hook with `source === undefined` and falls into the Audius branch: `getAudiusTrackById(undefined)` | `linking.ts:172-178` vs `navigation/types.ts:103` |
| M-06 | 2 | **The row's artwork is a hole while it loads** — a glyph at `opacity: 0.4` over a `goldDim` colour, i.e. ≈6 % gold. The identical pattern was measured at max (21,19,16) on a (10,10,12) background and deleted in the Podcasts wave | `TrackCard.styles.ts:31-36` |
| M-07 | 2 | **Bare `fontWeight` over token families** — one broken file lookup (`Inter SemiBold_bold.ttf` is not shipped, so it falls back to the system font) and two silently dropped semibold | `MusicDetailScreen.tsx:165, 215, 230, 245` |
| M-08 | 2 | **Two duration formatters, and one can print `3:60`** — `Math.round` on the seconds in the row, `Math.floor` on the detail, and they disagree on the empty case too | `TrackCard.tsx:20-27` vs `MusicDetailScreen.tsx:29-34` |
| M-09 | 2 | **The detail screen hand-rolls its loading and error UI** — a bare `TouchableOpacity` with no role, no label and a 24 dp height | `MusicDetailScreen.tsx:285-303` |
| M-10 | 2 | **The raw error replaces the friendly copy**, and `errorLoadFailed` can therefore never render | `ListStates.tsx:64-76` |
| M-11 | 2 | **The title is drawn three times** — the header, the hero overlay and the info section. The reference draws it twice | `MusicDetailScreen.tsx:308, 336-341, 349-352` |
| M-12 | 2 | **A `FlatList` nested inside a `ScrollView`** — the case RN explicitly warns about, and it measures every row eagerly | `MusicDetailScreen.tsx:310, 436-448` |
| M-13 | 2 | **The detail screen launches through the legacy `openPlayer`** — the result is neither awaited nor inspected, so a rejection is unhandled and a `false` is discarded. The list screen's own comment records that this was the bug | `MusicDetailScreen.tsx:40, 53-63` |
| M-14 | 3 | `MusicDataContextValue.activeGenre` has **no consumer** | `MusicDataProvider.tsx:27, 130, 147` |
| M-15 | 3 | `JAMENDO_GENRES` and `genreLabel()` are **unreachable**, and they are a second, divergent owner of the genre list | `useMusicScreen.ts:28-41`; `MusicContent.tsx:9, 17-21` |
| M-16 | 3 | `"Couldn't load tracks."` can never render | `related/textContent.json:12` |
| M-17 | 3 | `MusicCategory.icon` / `.genre` / `.image` are **never read** — ten bundled per-genre covers are dead assets, and the file's header claims *"each entry also carries a local `image` cover for the Home rail"*; there is no such consumer | `constants/musicCategories.ts:13-17, 22-32` |
| M-18 | 3 | `API_CONFIG.jamendo` is dead and duplicates the adapter's own base URL | `constants/api.ts:33-37` |
| M-19 | 3 | Five of the seven re-exports in `MusicScreen/types/index.ts` have no importer (the same in Movies and Podcasts) | `MusicScreen/types/index.ts:10-17` |
| M-20 | 3 | `MusicDetailScreen/types/index.ts` and the `default` export are unused; the type is defined twice | `MusicDetailScreen/index.tsx:1-2` |
| M-21 | 3 | The `MusicScreen` route param `genre` is **never passed by any caller** | `navigation/types.ts:102` |
| M-22 | 3 | The whole `MusicDetailScreen` is unreachable **in-app** — the list plays directly, and the only inbound is an external deep link that the app only ever generates from that same screen | `RootNavigator.tsx`; `linking.ts:172` |
| M-23 | 3 | **The footer never says the list is finished** — no "caught up" branch, no spacer, while Movies and Podcasts have both | `MusicFooter.tsx:37-54` |
| M-24 | 3 | The play disc inside the play row is a **duplicate, non-interactive affordance** | `TrackCard.tsx:84-86` |
| M-25 | 3 | An **empty artist line** is rendered when the wire carries no artist | `TrackCard.tsx:70-72` |
| M-26 | 3 | Music's empty slot is **centred**; the two reference screens anchor it to the top | `MusicScreen.styles.ts:20-23` |
| M-27 | 3 | The config object is rebuilt on every render, and it is a **different object** from the one given to `useSectionOptions` | `MusicScreen/index.tsx:21-26` |
| M-28 | 3 | `handlePlay` lists `source` in its deps and does not use it | `MusicDetailScreen.tsx:64` |
| M-29 | 3 | `JAMENDO_RETRIES` documents a contract **no hook honours** | `jamendo/adapter.ts:360-362` |
| M-30 | 3 | The footer's retry pill is **≈26–30 dp** tall — the same in Movies and Podcasts, so a house-level item | `MusicFooter.styles.ts:31-37` |

---

## 4. The Radio and Live TV audit — forty-one findings

Radio and Live TV are near-twins, so every asymmetry between them is a finding in both directions.

| id | sev | the finding | the evidence |
|---|---|---|---|
| R-01 | 1 | **Radio's Genre / Country / Language filter can never be applied** — every row key is `undefined`. The chips collapse onto one React key, the selection is never marked, the value is destroyed (`''` → `null`), and the request never carries the filter. The screen's headline feature is inert | `RadioContent.tsx:56-60`; §1.3 |
| R-02 | 1 | **A page-1 failure renders a BLANK screen** — Radio and Live TV. `hasLoaded` means "the query settled", so on a failure `hasLoaded` is `true`, the toast branch (`!hasLoaded && …`) never fires, the error placeholder never fires, and control falls through to an **empty `FlatList`**. No message, no spinner, no button | `useRadioBrowser.ts:207`; `RadioContent.tsx:158-181, 271-280` |
| R-03 | 1 | **Bookmarking at the 20-item cap silently does nothing and toasts success** — `addBookmark` returns a result that must be inspected; the browse screens discard it. The *same feature's* favourites screen gets it right | `RadioContent.tsx:228-242` vs `RadioFavoritesScreen.tsx:106-122` |
| R-04 | 2 | **The station launch drops the kind and the artwork** — `resolveStreamType('radio')` is the *lane*, so the station is recorded in Recently Played as type `'audio'` instead of `'radio'`. Live TV is worse: the browse side passes a raw `'video'` while its own favourites side passes `resolveStreamType('live-tv')`, so the same channel is labelled differently depending on which screen you tapped it from | `RadioContent.tsx:183-192`; `LiveTVContent.tsx:187-191` |
| R-05 | 2 | **The same station shows two different subtitles** — browse reads `"Germany · pop,rock,news"`, favourites reads `"Germany · pop"` | `RadioStationCard.tsx:35` vs `useRadioBrowser.ts:268-270` |
| R-06 | 2 | **Favourites lose `codec` and `bitrate`** — the store type carries them and the card renders them, but the write drops them, so the same station shows "MP3 · 128 kbps" in browse and nothing in favourites | `useRadioBrowser.ts:262-272` |
| R-07 | 2 | **Playlist entries omit the kind** — a radio station is filed as `type: 'video'`. The favourites screen passes it; the browse screen does not | `RadioContent.tsx:218-226` |
| R-08 | 2 | **The two Radio share paths disagree, and the favourites one carries nothing** — browse shares to `SongScreen` with `fileTitle` (a param `SongScreen` does not parse, so the title is dropped); favourites shares to `RadioScreen`, whose linking config parses only `initialTab`, so the station is lost entirely | `RadioContent.tsx:243-250`; `RadioFavoritesScreen.tsx:125-132` |
| R-09 | 2 | **`hasMore` is re-derived in the screen** from a second copy of the page size, while the hook already owns the truth and never returns it. When the proxy is wrong the footer's "tap to retry" button renders and **does nothing** | `useRadioBrowser.ts:200`; `RadioContent.tsx:49, 154, 320-339` |
| R-10 | 2 | **Live TV filters on the category id, the adapter matches the category name** — the identity used for selection is provably not the identity used for matching, and the chip shows the id rather than the name | `LiveTVContent.tsx:429-432` vs `iptv/adapter.ts:227-236` |
| R-11 | 2 | **Radio and Live TV hand-roll the browse shell**, including a bespoke chip component, so the filter chip **lies during a search** — the source drops the filters while the chip row and the FAB badge keep showing them. The shell has two flags for exactly this and Podcasts turns them on | `RadioContent.tsx:347-422`; `BrowseLayout.tsx:53-81` |
| R-12 | 2 | **One failing tag query empties all three groups** of the filter sheet | `useRadioBrowser.ts:235-236` |
| R-13 | 2 | **Bare `fontWeight` props ×5** — see §2.2 | `RadioStationCard.tsx:143, 150`; `styles/index.ts:22`; `ChannelCard.tsx:137-139`; Live TV `styles/index.ts:26` |
| R-14 | 2 | **The Live TV channel row has no `accessibilityLabel` at all** — the Radio twin has one | `ChannelCard.tsx:66-70` |
| R-15 | 3 | Five dead exports in `RadioScreenNew/types/index.ts` — and one of them (`ActiveRadioFilterChipProps`) is **wrong**: its `onClear` is typed as the filter *id* rather than a callback | `types/index.ts:4-14` |
| R-16 | 3 | Seven dead exports in `LiveTVScreenNew/types/index.ts` | `types/index.ts:1, 10-15` |
| R-17 | 3 | Four dead imports, including `useLiveFavoritesStore` in **both** card files — the favourite state arrives as a prop | `RadioStationCard.tsx:15`; `ChannelCard.tsx:18`; `LiveTVFavoritesScreen.tsx:11, 20` |
| R-18 | 3 | Dead constants: `EMPTY_SCOPE` ×2, the hook's own unused `hasMore`, `IPTVChannelResultType` | `useRadioBrowser.ts:94-100, 200`; `useLiveTVBrowser.ts:57-63, 234` |
| R-19 | 3 | The `else { removeFavorite(...) }` branch is **unreachable** — `rows` is derived from `items`, so the lookup always succeeds, and the hook's `removeFavorite` has no live caller | `RadioContent.tsx:210-213`; `LiveTVContent.tsx:216-219` |
| R-20 | 3 | *"Use Retry at the bottom of the screen to try again."* — **there is no bottom retry**, and the footer cannot render in that branch anyway | `RadioContent.tsx:278`; `LiveTVContent.tsx:307` |
| R-21 | 3 | The trailing **bookmark** glyph carries the **favourite** state, is not a control, and is not announced — two concepts, one glyph, and a screen-reader user cannot tell a favourite station from an ordinary one | `RadioStationCard.tsx:114-121`; `ChannelCard.tsx:104-108` |
| R-22 | 3 | The **`ScreenNew` suffix is vestigial** — both legacy screens were deleted; these two folders are the only `*New` folders left | `git log --diff-filter=D` on both paths |
| R-23 | 3 | The `initialTab` radio route param is **dead** — the screen has no tabs, yet the deep link and the share map both promise them | `navigation/types.ts:108`; `linking.ts:192` |
| R-24 | 3 | The filter chip's touch target is **≈32 dp** against the 44 dp floor (and the shared `FilterChips` chip is ≈21 dp) | `styles/index.ts:13-21` |
| R-25 | 3 | `React.memo` on the chip row is **defeated by an inline arrow** | `RadioContent.tsx:371-374` |
| R-26 | 3 | The bottom padding is a **hard-coded `80`** instead of the house's one bottom-chrome rule, so it does not grow with the mini-player | `styles/index.ts:23` |
| R-27 | 3 | TanStack's `AbortSignal` is **never forwarded** to the adapter, so a scope change leaves the previous request running | `useRadioBrowser.ts:159-173` |
| R-28 | 3 | Radio's three scopes send **three different request shapes** — the `hidebroken` promise is made only in the filtered scope — and the country/language calls fetch ~100 rows to keep 30 | `useRadioBrowser.ts:159-173`; `adapter.ts:332-354` |
| R-29 | 3 | **Gutter drift** — Radio and Live TV use `spacing.md` (12) where the shell uses `spacing.lg` (16), and the two screens disagree with each other on the list's top inset | `styles/index.ts:6, 9, 23` |

### 4.1 The Live TV adapter — a surface that never had a row to draw

The Radio twin works because radio-browser's payload is what the adapter expects. Live TV's is not. **Measured on the live endpoints on 2026-11-16**, with the app's own `API_CONFIG.iptv.baseUrl` (`src/constants/api.ts:29-32`):

| endpoint | bytes | the key the adapter requires | occurrences in the payload |
|---|---|---|---|
| `/channels.json` | **7,956,760** | `url` | **0** |
| `/channels.json` | 7,956,760 | `logo` | **0** |
| `/channels.json` | 7,956,760 | `languages` | **0** |
| `/channels.json` | 7,956,760 | `is_playable` | **0** |
| `/channels.json` | 7,956,760 | `country` | 31,843 (one per record) |
| `/categories.json` | **2,773** | `channel_count` | **0** |
| `/streams.json` | **3,897,483** | — | `url` × 18,689, of which **16,597** carry a `channel` id and **2,092** are `channel: null` |

The live record is:

```json
{"id":"002RadioTV.do","name":"002 Radio TV","alt_names":[],"network":null,"owners":[],
 "country":"DO","categories":["general"],"is_nsfw":false,"launched":null,"closed":null,
 "replaced_by":null,"website":"https://www.002radio.com/"}
```

The stream URL lives in **a different endpoint** (`/streams.json` → `{channel, feed, title, url, quality, labels, user_agent, referrer}`) and the logo in a third (`/logos.json`). So:

| id | sev | the finding | the evidence |
|---|---|---|---|
| R-30 | 1 | **The adapter validates a field the API does not serve, so every Live TV channel query rejects.** `parseRawIPTVChannel` throws `AdapterParseError` when `url` is missing — and `/channels.json` has no `url` in 7,956,760 bytes. The catalogue holds **31,843** channels and the app surfaces **zero**. The comment at `adapter.ts:4` describes *"IPTV-org returns an array of channel metadata"* — which is true, and is not the shape the adapter then demands | `iptv/adapter.ts:81-87`; measured |
| R-31 | 1 | **The category filter sheet is empty for the same reason.** `getIPTVCategories()` rejects on `channel_count`, which `/categories.json` does not serve (`{id, name, description}`). `tagsLoaded` is therefore `false` forever → the sheet renders the heading **CATEGORY** and **no chips**, and no RESET row. The Live TV category filter is unreachable by the user, even though all the machinery for it is present and wired | `iptv/adapter.ts:154-160, 238-247`; `useLiveTVBrowser.ts:107` |
| R-32 | 1 | **The rejection is invisible**, because of R-02: `hasLoaded` was true when the query failed, so the screen fell through to an empty list. R-02 made a failure look like "no channels"; R-30 makes every load a failure | `useLiveTVBrowser.ts:178`; `LiveTVContent.tsx` |
| R-33 | 2 | **The row's logo tile can never show a logo**, and `countryCode` and `language` are permanently `''` — the mapping reads `c.logo`, `c.country_code` and `c.languages?.[0]`, none of which the payload has. So the 56×56 tile always draws the fallback glyph, and the subtitle is always the bare slug (`general`), never `General · US` | `iptv/adapter.ts:88-98` |
| R-34 | 3 | **The whole 7.9 MB catalogue is re-downloaded on every scope change**, and then sliced to 1,000 of 31,843 (3 %). The query key is `['iptv','browse', category, term]`, so every category change and every debounced search re-fetches all 7.9 MB. The comment *"IPTV-org returns the full list; we slice client-side"* is false in both places — the API returns the list, the client truncates it with no indication to the user | `useLiveTVBrowser.ts:39, 90-99`; `iptv/adapter.ts:196-198` |
| R-35 | 3 | **Three different pools.** The browse view keeps 1,000; `searchIPTVChannels` and `getChannelsByCategory` each re-fetch with a hard-coded `limit: 500` — so search and the category filter look at a *smaller* catalogue than the plain browse does | `iptv/adapter.ts:206, 221, 232` |

**The fix is a join, not a patch.** `/channels.json` (31,843) ⨝ `/streams.json` (16,597 with a channel id) on the channel id gives a real, playable catalogue; `/logos.json` gives the logos. That is an adapter redesign, not a one-line validation change, so it is **carried forward** with the measurement above rather than smuggled into this wave.

### 4.2 The rest of the Live TV twin

The two screens are near-twins, so every asymmetry between them is a finding in both directions. These are the ones the first Radio/Live TV audit could not see because it read the tree before this wave's edits landed.

| id | sev | the finding | the evidence |
|---|---|---|---|
| R-36 | 2 | **`refreshing` was hardcoded `false`** on Live TV, so the pull-to-refresh spinner **never appeared** — the user pulled, the list refetched, and nothing said so. Radio bound the query's fetch flag, which is the anti-pattern the shared owner documents (*"a spinner for work the user did not ask for, in the one place that says 'refreshing'"*) | `useLiveTVBrowser.ts:246` (before) |
| R-37 | 2 | **`isLoadingMore` was hardcoded `false`** on Live TV, and its footer's second arm needs `hasMore && error` — but an error means no rows, and `hasMore` is false when there are no rows. **Both arms were unreachable**: the loading orb and the "tap to retry" pill were dead UI | `useLiveTVBrowser.ts:180` (before) |
| R-38 | 2 | **The header's right action has no `accessibilityLabel`** on either screen — the heart announces to a screen reader as an unnamed button. `InternalHeader` takes the prop and documents why (*"A button that carries only an icon has no name"*) | `InternalHeader.tsx:45-51`; both screens' headers |
| R-39 | 3 | **`FilterSheet`'s `title` prop is dead app-wide.** Every call site passes one — *"Filter radio stations"*, *"Filter channels"*, `` `${config.title} filter` `` — and the component destructures it and never renders it (`title={undefined}` at the `BottomSheet` call). The sheet opens with no heading, only the group headings | `FilterSheet.tsx:274, 365` |
| R-40 | 3 | **Radio and Live TV are ~90 % the same file** — the chip strip, the page-1 failure toast, the content-state ladder, the `FlatList` block, the long-press menu, the playlist sheet, the favourites screen and both hooks are duplicated with no owner. The shell owns the first four for Music/Movies/Podcasts already | both surfaces, file by file |
| R-41 | 3 | **Smaller dead code on the Live TV side**: the store's `setLiveFavorites` action (no caller), `IPTV_RETRIES` — whose comment claims *"hook layer honors this constant"* and **no hook in the app honours any `*_RETRIES` constant** — five dead adapter exports (`getChannelsByCountry`, `getIPTVChannelById`, `channelResultFromRaw`, `categoryResultFromRaw`, `IPTV_RETRIES`), `useBookmarks` imported from two different paths inside the same surface, an inline `ItemSeparatorComponent` (a new component type on every render), `borderRadius: 999` where the token `radius.pill` exists, and the `PAGE_SIZE = 50` constant duplicated in the hook and the screen | `liveFavoritesStore.ts:35, 58`; `iptv/adapter.ts:108, 167, 216, 254, 272`; `LiveTVFavoritesScreen.tsx:195` |

---

## 5. Audiobooks, Archive and Shows — thirty-one findings

These three are the "rest" the owner's second ask names: *"check all from movies, podcasts, to live tv, audiobooks etc, the design should feel cohesive, when we refactor others also."*

**None of the three is on the shared shell.** `git grep BrowseLayout -- src` returns `_shared/`, `MusicScreen/`, `MoviesScreen/` and `PodcastsScreen/` only. Each of the three hand-rolls the shell's anatomy in its own file — and all three **document the shell in their comments without using it** (A-31).

Severity 1 = wrong behaviour · 2 = bad implementation · 3 = dead code or bad UI.

### 5.1 The measurements

LibriVox and TVMaze were probed live on 2026-11-16.

**LibriVox has no `q` parameter.** The documented parameters are `id, since, author, title, genre, fields, extended, coverart, limit, offset, format, sort_order`. The adapter sends the search term as `q`:

```
https://librivox.org/api/feed/audiobooks?q=alice&format=json&limit=3&page=1
  -> ids 47, 52, 53   ("Count of Monte Cristo", "Letters of Two Brides", "Bleak House")
```

None of the three contains "alice". **Every term returns the same first 20 books of the catalogue.**

**LibriVox is offset-based, not page-based.**

```
...?format=json&limit=3&page=3   -> ids 47, 52, 53   (identical to page 1 — `page` ignored)
...?format=json&limit=3&offset=3 -> ids 54, 55, 56   (`offset` works)
```

**Eleven of the twenty genre chips return HTTP 500.** Probed live, `limit=2`:

```
OK   Comedy (347,348)      OK   Drama (346,645)      OK   Historical (762,814)
OK   History (170,171)      OK   Poetry (67,106)      OK   Romance (86,99)
OK   Science (479,497)      OK   Science Fiction (381,382)   OK  Short works (180,1050)
FAIL Adventure 500   FAIL Children 500   FAIL Fairy tales 500   FAIL Fantasy 500
FAIL Fiction 500    FAIL Horror 500      FAIL Mystery 500      FAIL Non-fiction 500
FAIL Thriller 500   FAIL Travel 500      FAIL Western 500
```

Case is not the cause: `science fiction` and `Science Fiction` both work; `fiction` and `Fiction` both 500.

**TVMaze's `/shows` has no `genre` parameter.** `https://api.tvmaze.com/shows?page=1&genre=comedy` returns the *unfiltered* page 1 (ids 250–499, mixed genres).

**Today's TVMaze schedule is 82 entries / 79 unique shows** — which is what the Shows screen renders as a vertical rail above the list.

### 5.2 The findings

| id | sev | the finding | the evidence |
|---|---|---|---|
| A-01 | 1 | **The Audiobooks search field has no effect** — LibriVox ignores the `q` parameter the adapter sends. Every term returns the same first 20 books | `librivox/adapter.ts:146-163`; measured |
| A-02 | 1 | **The genre chip lies for 11 of the 20 genres** — the 500 is swallowed and the code falls back to an *unfiltered* search, so the user gets the first books of the whole catalogue under a gold "Fiction" chip. It also means the screen can never say *"No audiobooks in this genre."* | `librivox/adapter.ts:215-244`; measured |
| A-03 | 1 | **Audiobooks pagination is a no-op** — the API is offset-based, `page` is ignored, so "load more" re-fetches the same page forever. The dedupe hides it: the user scrolls to the end, the spinner runs, no new row ever appears, and `hasNextPage` never turns false | `librivox/adapter.ts:156-158`; `useAudiobooksScreen.ts:60-64, 121-128` |
| A-04 | 1 | **Archive's error branch is unreachable** — the empty state requires `!error`, and the only other branch is the list. A failed load renders a `FlatList` with zero rows: no message, no icon, no retry | `ArchiveContent.tsx:259-289` |
| A-05 | 1 | **Tapping the *active* chip blanks the screen** — `FilterChips` fires `onSelect('')` on the active chip; `''` disables the query, and the screen falls through to a list with zero rows. On Archive the value can also be `''` although the cast says `'audio' \| 'video'` | `AudiobooksContent.tsx:185-190`; `ArchiveContent.tsx:207-211, 252-256` |
| A-06 | 1 | **The Shows "Search / Browse" chips do not control anything** — the hook picks the query from the *term* alone, so the chip says "Search" while the browse list is shown. It is a dead affordance | `ShowsScreen.tsx:42-45, 133-142`; `useShowsScreen.ts:96-117` |
| A-07 | 2 | **The "Airing Today" rail buries the list** — a vertical `FlatList` of 79 text-only rows above the content, with no artwork and no time | `ShowsScreen.tsx:143-168`; measured |
| A-08 | 2 | **Shows and Archive drive the refresh spinner off `isFetching`** — the exact anti-pattern `_shared/pullToRefresh.ts` documents and fixed for Music/Movies/Podcasts. Shows is an infinite list, so it fires on every page load | `ShowsScreen.tsx:216-223`; `ArchiveContent.tsx:280-287` |
| A-09 | 2 | **Archive's search field sits at x = 0** while its own chip row and its rows sit at x = 12 — three left edges inside one screen | `ArchiveScreen/styles/index.ts:6-9` |
| A-10 | 2 | **Shows' chips start 28 dp** while its search field starts at 16 — the shared `FilterChips` adds its own 12 dp, which the shell explicitly strips | `ShowsScreen.tsx:127`; `FilterChips.tsx:246-249` |
| A-11 | 2 | **Audiobooks and Shows send one query per keystroke** — no debounce, no cancellation | `AudiobooksContent.tsx:180-184`; `ShowsScreen.tsx:128-132` |
| A-12 | 2 | **Audiobooks' pull-to-refresh is a placeholder `<View/>`** — React Native clones it with `refreshing`/`onRefresh` and it ignores both. The hook's `refreshing` and `handleRefresh` are dead plumbing on both sides | `AudiobooksContent.tsx:242-246`; `useAudiobooksScreen.ts:93-95, 116-117` |
| A-13 | 2 | **Archive shows 20 of N results and can never show the rest** — `hasNextPage: false`, `fetchNextPage: () => {}`, and `numFound` is exposed and never read | `useArchiveScreen.ts:113, 116-119` |
| A-14 | 2 | **The Audiobooks error copy says "Use Retry at the bottom of the screen"** — there is no Retry at the bottom of the screen; the only retry is a toast action that disappears | `AudiobooksContent.tsx:199-206` |
| A-15 | 2 | **Archive silently searches `'old time radio'` / `'classic films'`** while the search field is empty — the user sees a blank field, a populated list, and quick-search chips that claim nothing is active | `useArchiveScreen.ts:30-31, 75` |
| A-16 | 2 | **Shows has no error state in the content** — both empty branches require `!error`, so a failed load renders an empty list | `ShowsScreen.tsx:171-225` |
| A-17 | 2 | **Forbidden bare `fontWeight` on the row titles** — see §2.2. The emphasis is silently lost | `AudiobooksScreen/styles/index.ts:35`; `ArchiveScreen/styles/index.ts:31` |
| A-18 | 2 | **The Shows row is a different grammar from every other row** — name only: no artwork, no metadata, no `accessibilityRole`, no `accessibilityLabel` | `ShowsScreen.tsx:196-208` |
| A-19 | 2 | **Archive does not use the app's one bottom-chrome rule** — it reserves a hard-coded `spacing.xxl + 80` (104 dp), so with the mini-player up the last row sits under the dock | `ArchiveScreen/styles/index.ts:12` |
| A-20 | 2 | **Dead and mismatched route params** — Audiobooks `initialTab` is never read; the deep link parses `genre` while the type declares `initialGenre`; Shows `initialTab: 'today'` is not honoured; Archive `query` is never passed; and Shows' `initialGenre` reaches TVMaze's `/shows`, which has no `genre` parameter | `navigation/types.ts:119-137`; `linking.ts:201-207` |
| A-21 | 3 | **Dead style keys** — `scopeSection`, `footer`, `loadMoreRetry` ×2, and a `paddingBottom` that the screen overrides | `AudiobooksScreen/styles/index.ts:10, 16, 36, 42`; `ArchiveScreen/styles/index.ts:32, 38` |
| A-22 | 3 | **Dead exports** — `AUDIOBOOK_GENRE_OPTIONS` (a whole file whose export is an empty array nobody imports), `AUDIOBOOKS_BROWSE`, `ARCHIVE_BROWSE`, and three screen-local props re-exports | `AudiobooksScreen/related/scopeConfig.ts`; `constants/audiobookCategories.ts:16, 69` |
| A-23 | 3 | **Dead hook fields** — Audiobooks `refreshing`/`handleRefresh`; Archive `numFound`/`isLoadingMore`/`hasNextPage`/`fetchNextPage`; Shows `todaysLoading`/`todaysError`/`retryTodays` and an effect whose body is only a comment | `useAudiobooksScreen.ts`; `useArchiveScreen.ts`; `ShowsScreen.tsx:95-100` |
| A-24 | 3 | **Dead adapter exports** — `searchByAuthor`, `getRecentAudiobooks`, `searchInternetArchiveMusic`, `parsePageParam`, and two `*_RETRIES` constants whose comments claim a hook honours them | `librivox/adapter.ts:183, 246, 265`; `tvmaze/adapter.ts:180`; `internetArchive/adapter.ts:721`; `apiClient.ts:212` |
| A-25 | 3 | **`BookRow.language` is written and never read** — the row renders `row.subtitle`, which already carries it | `AudiobooksContent.tsx:53-55` |
| A-26 | 3 | **An unused type import** — `SvgIconName` | `AudiobooksContent.tsx:28` |
| A-27 | 3 | **A hard-coded number inline** — `paddingHorizontal: 12` where `spacing.md` exists | `AudiobooksContent.tsx:87` |
| A-28 | 3 | **Shows has no stylesheet at all** — every style is an inline object with hard-coded `16 / 12 / 8 / 6 / 4` | `ShowsScreen.tsx` |
| A-29 | 3 | **The rows have no artwork placeholder** — the gold glyph is drawn only when there is no URL, so the cell is an empty hole while the image loads | `AudiobooksContent.tsx:77-85`; `ArchiveContent.tsx:86-98` |
| A-30 | 3 | **Zero test coverage** for the three surfaces — the only browse screens with no screen-level test at all | `__tests__/` |
| A-31 | 2 | **The headers describe a FAB that does not exist** — all three say *"single content stream + FAB"* / *"switches via a FAB"* in their file headers, and **no `Fab` import exists in any of them**. The comment is the spec of the shared shell; the code is not the shell | `AudiobooksContent.tsx:3`; `ArchiveContent.tsx:2-7`; `ShowsScreen.tsx:3-4`; `useArchiveScreen.ts:4-5`; `useShowsScreen.ts:4-6` |

### 5.3 Why these three are the same wave

All three have the same four structural facts, and each one is a decision the shared shell already made:

1. **They hand-roll the shell's anatomy** instead of importing `BrowseLayout` — so the gutter, the chip row, the search field, the content states and the footer all differ from the rest of the family (A-09, A-10, A-11, A-14, A-16, A-19).
2. **They have no footer at all** — not a broken one, none. Grammar element 7 says the end of the list is always *stated*; these three never state it.
3. **They have no FAB and no filter sheet** — grammar elements 8 and 9 do not exist on them, and the chip rows that do exist are not the active-filter strip (they are *all* the options, not *what is active*).
4. **Their rows are three different grammars** — Audiobooks 52 dp with a creator line, Archive 64 dp with a year line, Shows a name with nothing else (A-18).

**The shell can already host all three.** `SectionRouteKey` already lists them (`_shared/sectionRoute.ts:19, 21, 22`); `useSectionOptions` already seeds `genre / categoryId / initialTab / initialGenre / initialTag` from route params (`src/hooks/useSectionOptions.ts:19-25`); `useSectionSearch` already seeds the field **and** the query from the same value (`useSectionSearch.ts:32-39`) — which is the correct home for Archive's silent default query (A-15).

**What this wave does about it:** the audit lands here as analysis, and the fixes are carried forward with IDs (§9). The three surfaces are not silently rewritten inside a wave that is about Music and Radio; what they get here is the **grammar they will be built against**, and the two lessons this wave produced — the shared footer and the shared pull-to-refresh — are already in place for them to copy.

---

## 6. The design — eight new boards

### 6.1 What was drawn

| board | what it shows |
|---|---|
| `MusicScreen / light — screen` | the page as it opens, with **one genre active** |
| `MusicScreen / light — filter` | the page with the app's own `FilterSheet` over it — the GENRE group, collapsed to six chips with a SHOW MORE toggle, **Rock** drawn as the applied state |
| `MusicScreen / dark — screen` | the same page in the dark theme |
| `MusicScreen / dark — filter` | the same sheet in the dark theme |
| `RadioScreen / light — screen` | the page with **one genre active**, the heart in the header, the station rows |
| `RadioScreen / light — filter` | the page with the app's own sheet over it — the GENRE group, **pop** drawn as the applied state |
| `RadioScreen / dark — screen` | the same page in the dark theme |
| `RadioScreen / dark — filter` | the same sheet in the dark theme |

The Movies page established the pattern (2026-11-13): the page and its filter are two boards of their own, in both themes. Music and Radio follow it.

### 6.2 Why the pages are drawn with a filter ACTIVE

Grammar element 4 — the **active-filter strip** — is invisible when nothing is filtered. A board drawn in the default state would not show the family at all, and the strip is the one place where a filter says so.

So both pages are drawn with one filter active: **Rock** on Music, **pop** on Radio. The strip carries the chip, the list answers the filter, and the filter board shows the *same* choice highlighted in the sheet — which is the connection the strip exists to make.

### 6.3 Where the geometry comes from

Every number is read out of the app's own component — the file and line are in `designs/penpot/music-radio.js`, and the board generator reads the same tokens the app reads (`designs/penpot/app-spec.js` parses `src/theme/tokens.ts` through the TypeScript AST). **No number on these boards was typed in by hand.**

| element | the rule | the app's own source |
|---|---|---|
| the canvas | 411 × 914 dp | the emulator's viewport; the app's window starts 24 dp down it |
| the header | 60 dp (12 + a 36 dp button + 12), a hairline rule, the title centred | `InternalHeader.tsx:106-135` |
| the search field | 44 dp, `radius.pill`, `background.elevated`, a 1 px `border.subtle` hairline, 12 dp of padding, an 18 dp magnifier, Inter 15 px | `SearchBar.tsx:147-155` |
| the search row | **16 dp above the field, 12 dp below** | `BrowseLayout.tsx:299-303` |
| the strip chip | 10 dp of horizontal padding, 4 dp of vertical padding, a 1 dp border, a pill radius, an 11 px Inter SemiBold label | `FilterChips.tsx:207-232` |
| the Music row | a 52 dp thumb, a 14 px SemiBold title, a 13 px artist line, a 13 px album line, the duration on the right | `TrackCard.styles.ts`, `TrackCard.tsx` |
| the Radio row | a 48 dp favicon, a 14 px SemiBold name, a 13 px "country · tag" subtitle, a codec badge, a bitrate, the heart, the play mark | `RadioStationCard.tsx` |
| the FAB | a 56 dp gold disc, 20 dp from the right, the 24 px `sliders` glyph, floating at `insets.bottom + spacing.lg` | `Fab.tsx:63, 143-159` |
| the sheet | a 32 dp chip with a 1.5 dp border and 12 dp of padding, an 11 px group title, a 40 dp grabber zone, a divider with 12 dp either side | `FilterSheet.tsx:426-509` |

The chip **widths** are the one thing a board cannot measure for itself, so they are measured from the app's own font files (`designs/penpot/text-metrics.js`) on the device's pixel grid — which is what decides which chips share a row.

### 6.4 The content is the app's own

The Music titles, artists, albums and durations are **Jamendo's own first screenful**, fetched on 2026-11-16 with the app's own client id and the app's own `order` chain. The Radio stations are **radio-browser's own `/json/stations/topclick` first screenful**, same day, and their subtitles are the app's OWN rule (`country · first tag`, `related/stationRow.ts:58-64`).

The artwork cannot be the app's own: the Music row draws Jamendo's album art and the Radio row draws a station favicon, and both are remote URLs a Penpot board cannot fetch. So the rows carry the app's **own bundled audio placeholders** — the same pictures the app ships for audio with no artwork of its own.

### 6.5 What the boards changed in the design

Two things came out of drawing them, and both went back into the code:

1. **The chip language.** Radio's and Live TV's active-filter chips were a 44 dp gold-dim pill with a 12 px caption — a different language from every other browse surface's strip. The boards draw the **shared `FilterChips` chip** (10/4 dp padding, a 1 dp border, a pill radius, an 11 px SemiBold label, ACTIVE = a gold fill with inverse text), and the code now does the same.
2. **The vertical rhythm.** Radio's and Live TV's search rows used 8 dp above and below the field where the shell says 16 and 12 — so their field sat 8 dp higher than the same field on Movies, Podcasts and Music. The code now uses the shell's rhythm.

### 6.6 What the boards found

**The Radio filter sheet is not a sheet.** Its three groups carry **40 genres, 30 countries and 30 languages** — 100 chips — so its body is far taller than the screen, and the app's own `FilterSheet` caps it at `snapPoints={['auto', '92%']}`. It therefore opens at **92 % of the window** (841 dp on a 914 dp canvas): the panel's top edge is at 73 dp, which is *above* the app's own search field. The board draws that, because that is what the user sees.

That is a real UX finding and it is carried forward as **B13-13** — the three groups do not belong in one panel.

---

## 7. What changed in the code

### 7.1 The two new owners

| file | what it owns now |
|---|---|
| `src/screens/_shared/BrowseListFooter.tsx` — **NEW** | the in-flow footer (grammar element 7): its four branches, its three strings and its geometry. Music had it, Radio and Live TV had a two-branch version whose branches were **unreachable**, and the three screens disagreed about what a footer is. There is one owner now |
| `src/features/bookmarks/confirmAdd.ts` — **NEW** | the bookmark cap's one owner: `confirmBookmarkAdd` asks before evicting the oldest bookmark. Radio's and Live TV's browse screens discarded the result of `addBookmark` and toasted success while nothing happened |

### 7.2 The Jamendo adapter — an empty response is a QUESTION, not an answer

`src/infrastructure/api/jamendo/adapter.ts`

- **One shared `fetchTracksWithRetry`** for the search path and the genre path, with `EMPTY_RETRY_ATTEMPTS = 4`. TanStack treats an empty array as a **success**, so the retry has to live where the empty response is still visible.
- **The request is repeated UNCHANGED.** `order` selects a **pool**, not a sort: `search=love` with no `order` and `search=love` with `order=popularity_total` share **0 of 20** tracks. Varying the parameter to "try harder" returns different tracks, not the missing ones.
- `searchJamendoTracks` now accepts `tags`, so the genre can survive a search — Jamendo answers `search` and `tags` **together** (measured: `search=love&tags=rock` returns rows whose genres are the rock set).

### 7.3 Music

| finding | the change | file |
|---|---|---|
| M-01 | the end-of-stream rule is now a **named function** — `nextMusicPage(lastPageLength, lastPageParam)` — so it can be pinned by a test instead of described in a comment | `hooks/useMusicScreen.ts` |
| M-02 | the genre group is **single-select**, with the reason in the file | `related/browseConfig.ts` |
| M-03 | the genre is sent **with** the search | `hooks/useMusicScreen.ts` |
| M-04 | the adapter's empty-response retry | `infrastructure/api/jamendo/adapter.ts` |
| M-06 | the artwork's plate: a `goldDim` tile with the surface's own glyph on it, replacing the bare glyph at `opacity: 0.4` (≈6 % gold) | `styles/TrackCard.styles.ts`, `components/TrackCard.tsx` |
| M-08 | **one** duration formatter, exported and **floored** — `Math.round` produced `3:60` | `components/TrackCard.tsx` |
| M-10 | the friendly message is back, with the raw error **under** it as `errorDetail` | `components/ListStates.tsx` |
| M-14 | the dead `activeGenre` removed | `components/MusicDataProvider.tsx` |
| M-15 | `JAMENDO_GENRES` and `genreLabel()` deleted | `hooks/useMusicScreen.ts`, `components/MusicContent.tsx` |
| M-23, M-26 | the footer states the end of the list; the empty slot is no longer centred | `components/MusicContent.tsx`, `styles/MusicScreen.styles.ts` |
| M-24 | the **duplicate play disc deleted** — the row is the play action | `components/TrackCard.tsx` |
| M-25 | the artist line is guarded | `components/TrackCard.tsx` |
| M-27 | the config object is hoisted to module scope | `index.tsx` |
| M-30 | the footer moved to the shared owner, which carries the shared geometry | `components/MusicFooter.tsx` **deleted** |
| M-31 | the **paging rule is fixed** — Jamendo paginates with `offset`, not `page`, so the list could never grow. One owner, `jamendoPaging`, turns the app's page into the wire's offset | `infrastructure/api/jamendo/adapter.ts` (§7.7) |

### 7.4 Radio

| finding | the change | file |
|---|---|---|
| R-01 | the filter rows now carry a real **key** — the tag's NAME, which is the only identity radio-browser gives it | `related/stationRow.ts` (**NEW**), `components/RadioContent.tsx` |
| R-02 | `hasLoaded` means **"the query settled WITH DATA"** (`!!stationsQ.data`), and the screen's error branch no longer depends on it. A page-1 failure now shows the house `ErrorState` with its own retry | `hooks/useRadioBrowser.ts`, `components/RadioContent.tsx` |
| R-03 | the bookmark cap asks before evicting | `features/bookmarks/confirmAdd.ts` (**NEW**) |
| R-04 | the launch carries the **kind** and the **lane**, not just the lane — the station was recorded as type `'audio'` instead of `'radio'` | `components/RadioContent.tsx` |
| R-05, R-06 | one subtitle rule, and the favourite carries the codec and the bitrate | `related/stationRow.ts`, `hooks/useRadioBrowser.ts` |
| R-07 | the playlist entry carries the kind | `components/RadioContent.tsx` |
| R-08 | one share target, carrying the station's name | `components/RadioContent.tsx`, `components/RadioFavoritesScreen.tsx` |
| R-09 | `hasMore` is the **source's own** — the hook owns it and the screen does not re-derive it from a second copy of the page size | `hooks/useRadioBrowser.ts` |
| R-12 | each tag group gates on **its own** query — one failing endpoint no longer empties all three | `hooks/useRadioBrowser.ts` |
| R-13, R-21 | the bookmark glyph became the app's own **heart**, the weight lives in the **family key**, and the favourite state is announced | `components/RadioStationCard.tsx` |
| R-18, R-19 | the dead constants and the unreachable `removeFavorite` branch deleted | `hooks/useRadioBrowser.ts` |
| R-20, R-22, R-23 | the copy that named a control that is not there is gone; the dead route param is carried forward | `components/RadioContent.tsx` |
| R-24, R-25, R-26, R-29 | the chip row is the **shared chip** with a stable callback; the gutter is `spacing.lg`; the rhythm is the shell's 16/12; the bottom padding follows the app's one bottom-chrome rule | `styles/index.ts`, `components/RadioContent.tsx` |
| R-27 | TanStack's `AbortSignal` is forwarded | `hooks/useRadioBrowser.ts` |
| R-42 | the **COUNTRY menu is no longer empty** — 2 of 225 countries have no name, and the strict convertor voided all 223 good ones. The menu path drops the rows it cannot draw | `infrastructure/api/radioBrowser/adapter.ts` (§7.7) |
| R-43 | the **country and language menus are ordered by station count** — the country menu opened with Andorra (5 stations) and the language menu with "1", "111", "123" | `infrastructure/api/radioBrowser/adapter.ts` (§7.7) |
| R-44 | the **`type` parameter is documented as ignored** — five live requests with five different `type` values returned the identical 80 records | `infrastructure/api/radioBrowser/adapter.ts` (§7.7) |
| — | the pull-to-refresh is the app's **shared owner** — the gesture, not the query | `hooks/useRadioBrowser.ts` |

### 7.5 Live TV

Its findings are in §4, and the wave landed the same defect classes so the two twins match:

| finding | the change | file |
|---|---|---|
| R-30, R-31, R-33, R-34, R-35 | **the IPTV adapter is not changed** — it is a redesign (a join with `/streams.json` and `/logos.json`), and it is carried forward with the measurement | — |
| R-32 | `hasLoaded: !!data` and the house `ErrorState` | `hooks/useLiveTVBrowser.ts`, `components/LiveTVContent.tsx` |
| R-36 | the pull-to-refresh is the app's **shared owner** — it was a hardcoded `false`, so the spinner never appeared | `hooks/useLiveTVBrowser.ts` |
| R-37 | the footer is the **shared footer** — both of Live TV's branches were unreachable | `components/LiveTVContent.tsx` |
| R-38 | the header's heart has an **accessible name** | `components/LiveTVContent.tsx`, `components/RadioContent.tsx` |
| R-39 | the sheet's dead `title` prop is carried forward — it is app-wide, not Live TV's | — |
| R-41 | the dead exports deleted, one `useBookmarks` import path, the separator hoisted, `radius.pill` instead of `999` | `types/index.ts`, `state/liveFavoritesStore.ts`, `components/LiveTVFavoritesScreen.tsx`, `styles/index.ts` |
| R-11, R-13, R-14, R-21, R-22, R-24, R-26, R-29 | the same chip, the same rhythm, the same gutter, the same heart and the same family-key font as Radio | `styles/index.ts`, `components/ChannelCard.tsx` |

### 7.6 The tests

| file | what it pins |
|---|---|
| `__tests__/infrastructure/api/jamendo/adapter.test.ts` | the empty-response retry, the **unchanged request** rule, the **page → offset** rule, and the signal — **27 tests** (6 of them new in §7.7) |
| `__tests__/infrastructure/api/radioBrowser/adapter.test.ts` | the strict convertor stays strict, the **menu path survives a bad row**, and the two menus are **ordered by station count** — **7 tests** new in §7.7 |
| `__tests__/screens/MusicScreen/musicRules.test.tsx` — **NEW** | the pagination rule, the floored duration, the artwork tile's three states, the artist guard — 9 tests |
| `__tests__/screens/RadioScreenNew/radioRules.test.ts` — **NEW** | the tag's key, the subtitle rule |
| `__tests__/screens/RadioScreenNew/radioScopeState.test.ts` — **NEW** | the hook's `hasLoaded` — **4 tests**, and they BITE: with the old `!!data \|\| !!error` the first one fails |
| `__tests__/screens/RadioScreenNew/radioFailureState.test.tsx` — **NEW** | the rendered failure state — **7 tests**, and they BITE: with the old `!hasLoaded && …` branch the adversarial case fails |

The two Radio tests were written to be **regression tests that fail against the old code**, and both were verified that way: the hook test fails with `hasLoaded: !!data || !!error`, and the screen test fails with the `!hasLoaded`-gated branch. They are in separate files because the hook's contract and the screen's branch are two different defects.

**All four device-found fixes were bite-checked the same way:**

| the regression | the result |
|---|---|
| the Jamendo search path sends `page` instead of `offset` | **4 tests fail** |
| the Jamendo genre path sends `page` instead of `offset` | **4 tests fail** |
| `getCountries` uses the strict convertor again | **1 test fails** |
| the tag menus lose their station-count order | **2 tests fail** |

The whole suite: **186 suites, 1833 passed, 1 todo.**

### 7.7 What the DEVICE found — two defects the static audit could not see

The device proof on 2026-11-16 was not a confirmation pass. It found **two defects that the code read correctly** and that only a live screen could show: a list that never ends, and a filter group that is silently empty.

Both were found by looking for **grammar element 7** — *the end of the list is always stated*. On the Music screen the footer said nothing.

#### M-31 — Jamendo has no `page` parameter, so the Music list could never grow

**The symptom.** The Music list stopped at 30 rows, the footer showed the idle spacer instead of *"You're all caught up."*, and the filter button never stepped aside at the end of the list.

**The measurement** (live, 2026-11-16, limit 30):

| request | rows | shared with page 1 |
|---|---|---|
| `search=love` | 30 | — |
| `search=love&page=2` | **0** | — |
| `search=love&offset=30` | 30 | **0** |
| `tags=rock&order=popularity_total` | 30 | — |
| `tags=rock&order=popularity_total&page=2` | 30 | **30** |
| `tags=rock&order=popularity_total&offset=30` | 30 | **0** |

**The cause.** The search path and the genre path sent `page`; Jamendo paginates with **`offset`**. The two paths failed *differently*, and both failed silently:

- the **genre** path asked for "page 2", Jamendo ignored it and answered with **page 1's rows again**. The screen's dedupe-by-id threw them all away, so the list never grew, `hasNextPage` stayed true forever, and the end-of-list footer never said a word;
- the **search** path asked for "page 2" and Jamendo answered with **nothing at all** — four retried requests for a page that does not exist.

The POPULAR path already sent `offset` and was the only branch that paged correctly.

**The fix.** One owner for the rule, in the adapter: `jamendoPaging(page, limit)` turns the app's page number into Jamendo's offset, and all three paths use it. The app still speaks in pages; the adapter owns the wire.

#### R-42 — the COUNTRY group was silently EMPTY, because two of 225 countries have no name

**The symptom.** The Radio filter sheet opened with GENRE full of chips, **COUNTRY showing its header and nothing under it**, and LANGUAGE full of chips. No error, no spinner, no retry.

**The measurement** (live, 2026-11-16): `/json/countries` answers with **225 records, and 2 of them have an EMPTY `name`** — the ISO codes `UN` and `ZZ`, the stations that report an unknown country. The strict tag parser rejects an empty name, and the strict batch convertor maps over the **whole** batch — so **one unusable record voided all 223 good countries**.

**The fix.** The MENU path is now a separate function, `drawableBrowseTagsFromRaw`, which keeps the strict per-record parse and **drops the rows it cannot draw**. The strict convertor `browseTagsFromRaw` stays strict — the contract test pins it, and a caller asking for ONE tag still wants to hear about a malformed one. A bulk list must survive a bulk list's bad rows.

The dropped rows are not information the user could have used: an unnamed country cannot be drawn, and it cannot be selected either — the filter's key would be the empty string, which the hook reads as *"no filter"*.

#### R-43 — the LANGUAGE menu opened with "1", "111", "123"

`/json/languages` answers with 586 records in the API's own order, and the first ones are `1`, `111`, `123`, `128 brazilian portuguese`, `17 addtional languages` — the stations that report a numeric language code. A menu that opens with "1" is a menu nobody reads.

With `order=stationcount&reverse=true` the same 586 records open with **english (11334), german (3979), spanish (3881), french (2486), chinese (2029), russian (1408)** — and the numeric leftovers sink out of the first screen. The **country** menu got the same order: without it the API answers in an arbitrary order (Andorra, 5 stations, first); with it the menu opens with The United States Of America (7000), Germany (5604), France (2801).

#### R-44 — radio-browser's `/json/tags` ignores its `type` parameter

The adapter asks for `type: 'genre'`. **Five live requests — no `type` at all, `type=genre`, `type=country`, `type=language`, `type=tag` — returned the IDENTICAL 80 records, with the identical name sequence.** The parameter is a request the API does not answer.

The param is still sent, because it is the documented way to ask and a future radio-browser may honour it — but the comment now says what the group actually contains: the full tag list ordered by station count, whose top 40 are the genres a listener means by "genre" (pop, music, news, rock, talk, dance, hits, oldies, 80s, classical, jazz).

#### The device proof, in full

Every step below was taken on `emulator-5554` against the **live APIs**, with the B13 bundle applied through a Metro reload.

| what | the result |
|---|---|
| the Music screen | the page opens with the header, the search field, the rows and the gold filter disc; **the duplicate play disc is gone**; the artwork decodes on the row tile |
| the filter sheet | the GENRE group opens with **Rock, Pop, Electronic, Jazz, Classical, Hip-Hop** — the `hip-hop` tag that §1.4 measured as valid |
| selecting a genre | the chip turns **gold with inverse text**, the **active-filter strip** appears under the field, and the **RESET FILTERS** footer appears — it appears only when something is active |
| the search field with a genre active | typing `love` keeps the **Rock chip in the strip** and the list answers both — the genre survives the search (M-03) |
| the FAB's badge | the FAB carries the **active-filter count**, and its accessible name is *"Filter Music options, 1 active"*; with no filter it is *"Filter Music options"* |
| RESET | the chip leaves the strip and the sheet's RESET footer disappears |
| the list's growth | with Rock applied the list runs **past the first 20 rows into rows the first page never contained** — the paging fix at work |
| the end of the list | searching `abum` (a 16-row pool, measured) ends the list and the footer says **"You're all caught up."** — and the FAB steps aside |
| the Radio screen | the header's heart carries the accessible name *"Radio favorites"*; the rows draw the favicon, the *"country · tag"* subtitle, the codec badge and the bitrate; a station with no favicon draws the app's own headphones tile |
| the Radio sheet | **COUNTRY now lists 30 real countries** ordered by station count, and **LANGUAGE opens with english, german, spanish, french, chinese** — the two device-found defects, fixed |

---

## 8. The gates

`pwsh -NoProfile -File 'X:/Development/SIMBA/.scratch-figcraft/gates.ps1' -Out 'X:/Development/SIMBA/.scratch-figcraft/gates-waveB13'` — **every gate exits 0.**

| gate | the result |
|---|---|
| `tsc` | **exit 0** — `npx tsc --noEmit -p tsconfig.json`, no output |
| `eslint` | **exit 0** — no output at all, so no error and no warning |
| `boundaries` | **exit 0** — 569 files scanned, **0 errors, 0 warnings** |
| `fonts` | **exit 0** — 671 text usages in `src/`, 11 shipped font files, **every usage resolves to a shipped font** |
| `boards` | **exit 0** — 51 app routes, 48 boards, 4 "no board, on purpose" — **the registry covers every app route** |
| `jest` | **exit 0** — **186 suites, 1833 passed, 1 todo** (1834 total) |

The suite grew by **13 tests** against the B12.1 baseline of 1821: the 6 Jamendo paging tests and the 7 radio-browser menu tests. Nothing was deleted to make room.

### 8.1 The design pipeline

| pass | the calls | the result |
|---|---|---|
| media | `run-media.js` | 14 + 4 uploaded, the store holds **179 media** |
| fingerprints | `record-uploaded-fingerprints.js` | 18 added, the file now holds **179 keys** — without this the build reports the new keys as missing media for ever |
| build | `run-mcp-one.js build 1…29` | **82 boards** created |
| links | `run-mcp-one.js links 1…16` | **453 links**, 8 skipped |
| flow | `run-mcp-one.js flow 1` | the flow **"SIMBA app"**, starting at *Splash / light*, 13 old flows removed |

The build reported **"media ids known: 175/175 — ready to build"** before the first call, which is the check that the media store and the fingerprint file agree.

### 8.2 The device proof

Taken on `emulator-5554` against the **live APIs**, with the B13 bundle applied through a Metro reload (`mcp__argent__debugger-reload-metro`). Every row of §7.7's table is a screenshot, not a claim.

---

## 9. Carried forward

Every item is listed on its own, with the finding it came from. Nothing is rolled into a wave number.

### 9.1 This wave's deferrals

| id | what is deferred | from |
|---|---|---|
| **B13-1** | **The IPTV adapter redesign** — the fix is a **join**: `/channels.json` (31,843) ⨝ `/streams.json` (16,597 carrying a channel id) on the channel id, plus `/logos.json` for the artwork. `/categories.json` serves no `channel_count`, so the category counts must come from the join. Until then the catalogue surfaces **zero** channels | R-30, R-31, R-33 |
| **B13-2** | **Live TV's catalogue size** — the whole 7.9 MB is re-downloaded on every scope change and then sliced to 1,000 of 31,843, while search and the category filter each re-fetch with a hard-coded `limit: 500` — three pools, and the smallest is the one the user searches | R-34, R-35 |
| **B13-3** | **Radio's and Live TV's structural migration onto the shared `BrowseLayout`** — this wave made them *match* the grammar in place; it did not *move* them onto the shell | R-11 |
| **B13-4** | **Radio and Live TV are ~90 % the same file** — the chip strip, the page-1 failure toast, the content-state ladder, the `FlatList` block, the long-press menu, the playlist sheet, the favourites screen and both hooks are duplicated with no owner | R-40 |
| **B13-5** | **`FilterSheet`'s `title` prop is dead app-wide** — every call site passes one and the component destructures it and never renders it, so every sheet in the app opens with no heading | R-39 |
| **B13-6** | **The 44 dp touch-target floor belongs in the shared `FilterChips` chip primitive** — the shared chip is ≈21 dp and Radio's own was ≈32 dp | R-24 |
| **B13-7** | **The footer's retry pill is ≈26–30 dp tall** — the same in Movies, Podcasts and now the shared footer, so it is a house-level item, not a Music one | M-30 |
| **B13-8** | **A radio-browser tag's name is not unique across groups** — `/json/countries` itself contains "pop" and "music", so the same name can be a genre and a country. The chip key must become group-scoped | R-01 (the identity half) |
| **B13-9** | **`MusicDetailScreen`: keep-and-fix, wire, or delete** — it is unreachable in-app and the only inbound is a deep link the app itself generates. This wave fixed its typography and its duration; the structural decision is still open | M-22 |
| **B13-10** | **`MusicDetailScreen`'s own defects** — the bare `fontWeight` ×4, the hand-rolled loading and error UI, the title drawn **three** times, a `FlatList` nested inside a `ScrollView`, the launch through the legacy `openPlayer`, and `handlePlay`'s unused `source` dep | M-07, M-09, M-11, M-12, M-13, M-28 |
| **B13-11** | **A Music deep link can arrive without `source`** — the path is `music/:trackId/:source?` but the route type requires it, so `simbaplayer://music/42` falls into the Audius branch with `undefined` | M-05 |
| **B13-12** | **Audiobooks, Archive and Shows → the shared shell** — none of the three is on `BrowseLayout`; all three have no footer, no FAB and no filter sheet, and their rows are three different grammars. Their 31 findings are enumerated one by one in §5.2 | A-01 … A-31 |
| **B13-13** | **The Radio filter sheet's three groups do not belong in one panel** — 40 genres + 30 countries + 30 languages = 100 chips, so the sheet opens at **92 % of the window** and its top edge sits above the app's own search field | §6.6 |
| **B13-14** | **The `*_RETRIES` constants lie** — the adapter contract test requires one per adapter, but **no hook in the app honours any of them** | M-29, R-41 |
| **B13-15** | **`RadioScreenNew` / `LiveTVScreenNew`** — the `ScreenNew` suffix is vestigial; both legacy screens are deleted | R-22 |
| **B13-16** | **The dead route params** — `MusicScreen`'s `genre` is never passed by any caller; `MusicDetailScreen`'s type is defined twice and its `default` export is unused; Radio's `initialTab` is dead | M-20, M-21, R-23 |
| **B13-17** | **The dead exports on the Music side** — five re-exports with no importer, `API_CONFIG.jamendo` (dead, and duplicating the adapter's own base URL), `musicCategories`' unread `icon` / `genre` / `image` and its ten dead cover assets, and the `"Couldn't load tracks."` string that can never render | M-16 … M-19 |
| **B13-18** | **The `fontWeight` sweep beyond this wave's surfaces** — §2.2 names the five places in Music, Radio and Live TV that break the family-key rule; the shared `FilterSheet`'s own `fontWeight: '700'` and the rest of the app are still to be swept | §2.2, B12-12 |
| **B13-19** | **The Jamendo flakiness is worked around, not fixed upstream** — the four-attempt retry is a client-side band-aid over an unstable pool, and it burns four requests when a page legitimately does not exist | M-04 |
| **B13-20** | **The GENRE menu is the whole tag list** — radio-browser ignores `type`, so the group holds decade tags ("80s", "90s", "top 40") and format tags ("oldies", "hits") beside the genres. Decide whether the menu should be narrowed | R-44 |
| **B13-21** | **The language menu's numeric leftovers** — out of the first screen now, but still in the list ("1", "111", "123") | R-43 |

### 9.2 Still open from earlier waves

**B12** — B12-1 (the scroll-to-top behaviour) · B12-2 (the raw taxonomy is unreachable) · B12-3 (the TV & Film plates and glyphs) · B12-4 (the Science/Sports cover plates) · B12-6 (`eslint .` reports 4 errors + 15 warnings in `designs/penpot/*.js`) · B12-7 (the detail board is proven by rule, not numerically) · B12-8 (the Movies/Search/Radio/Live TV sheets are not re-measured) · B12-9 (the board's content is a snapshot) · B12-10 (the short-page stop rule is unproven mid-stream) · B12-11 (`FILTER_SEED_PARAMS['categoryId']` is kept) · B12-12 (the shared `FilterSheet`'s own `fontWeight: '700'`) · B12-13 (the catalogue's full-resolution artwork payload — a resize-proxy and privacy decision) · B12-14 (7 of 100 trending feeds carry `http://` artwork — a cleartext decision).

> **B12-10 is now partly closed by this wave.** The short-page stop rule was unproven mid-stream; §7.7 proves it on device — a 16-row first page ends the list and the footer says *"You're all caught up."*, and the filter button steps aside. What is still open is the rule's behaviour when a **full** page is the last one, which no source here produces.

**B11** — B-11-2 (the Search chip's paint order) · B-11-3 (the footer's ~11 dp FAB offset) · B-11-4 (the status band for the other 67 boards) · B-11-5 (Music's and Podcasts' end-of-list states on device) · B-11-6 (the Movies footer's `windowEnd` copy) · B-11-7 (a full-zoom Movies board pass).

> **B-11-5 is now closed for Music** — §7.7 proves the end-of-list state on device. **Podcasts' is still open.**

**R3** — the Bookmarks "N saved" chip · the finished Downloads being playable · Library's Playlists mode · History's dead pull-to-refresh.

**R4** — Stats.

**R5** — the dead-code sweep: 68 runtime exports, 8 store-key deletions, the unused Bookmarks strings.

**R6** — re-enable `@typescript-eslint/no-unused-vars`.

### 9.3 Standing backlog

F-10 / F-13 / F-15 / F-17 (the native plain "Simba" against the Login's script "Simba") · the 75-site weight-intent sweep · the un-measured device proofs (an empty library / "first run", a pinned playlist, a bookmark, the long-press menu) · the Penpot Play hand walk · B-050 (the PiP chrome) · F-065 ×2 and F-066 · the 2026-11-03 native crash · `graphify-out/` · the API 24–30 PiP path · NO-JANK · B-018 · the v7 doc rename banners · iOS verification · the dark-theme variants for the remaining screens · the optional `Allura.ttf` upload · the page-by-page board-vs-device loop for the remaining ~48 screens · `md/HOME_V2_REFACTOR.md` §16's item.

### 9.4 CF and CO

CF-01 (fixed and device-proven — **close it**) · CF-03 / CF-04 (addressed by the `InternalHeader` change — **verify and close**) · CF-12 (`preferredLanguages` defaults to `'eng, jpn, und'`) · CF-21 (`Avatar`'s no-initials fallback draws a music note) · CF-22 (closed) · CO-05 (the privacy chain) · CO-06 (the Profile's quiet space) · CO-07 (the Downloads auto-delete preference) · CO-08 (fixed — **verify and close**) · the **iOS URL scheme is unregistered** · the **font gate's 426-tag blind spot**.

### 9.5 The user's call

**Argent 0.33.0 is available** (0.30.1 is installed). It needs **explicit, informed consent** and must be done **LAST** — after the wave is committed and pushed. It was not applied in this wave.
