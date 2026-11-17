# Wave B13.1 — Live TV: a source that answers, and the three things the other pages already have

> **Status:** code, tests, device proof and gates all done — §5–§9. The commit follows
> this file.
>
> **Branch:** `f5/w22-close-minimise-d9` · **Predecessor:** `8db9e56` (Wave B13)
>
> **The one-line version:** Live TV never worked, because the app asked a JSON file for
> a field that file does not have; the fix is a different file — the M3U playlist the
> source publishes for players, which carries the stream URL, the logo and the category
> in ONE file — and the wave also answers the three things the user asked about: the
> pagination footer, the loading component and the pull-to-refresh are now the SAME on
> every browse page.

---

## 1. What the user asked, and what the screenshot showed

The user sent a screenshot of Live TV in an error state and asked for four things:

> *"also check, the pagination loading footer is same, when we navigate to page, the
> loading component is same, refresing is not causing issue on first laod of page, and is
> working, also the screenssot issue, in live tv fix"*

and then, on the size of the data:

> *"do we need to save all these channel details at once 17.7mb, cant we fetch on
> demand"*

Read together, the ask is one thing: **Live TV is broken, and while you are in there,
make Live TV behave like the other pages** — the same footer, the same loading
component, a refresh that works — **without hauling 17.7 MB around.**

### 1.1 What the screenshot showed

The screen was the house `ErrorState`:

> **Could not load channels** — *We could not reach the channel directory.*
> `[iptv] channels[0].url: expected non-empty stream url` — **Retry**

plus a red toast, *"Could not load channels."* **Zero channels rendered.**

That raw detail is the whole bug in one line, and it is not a transport failure: the
app **reached** the server, downloaded the answer, and then rejected it because the
answer does not contain the field the app demanded.

`src/infrastructure/api/iptv/adapter.ts:81-87` (before):

```ts
if (typeof c.url !== 'string' || c.url.length === 0) {
  throw new AdapterParseError('iptv', `${path}.url`, 'expected non-empty stream url');
}
```

and `iptv/adapter.ts:195`:

```ts
const all = channelResultsFromRaw(raw);   // ← rejects the WHOLE batch on the FIRST row
```

`/channels.json` has **no `url` key at all** — measured: **31,843 records, 0
occurrences of `url`**, and no `logo`, no `languages`, no `is_playable`, no
`country_code`. The file carries *names and taxonomy*, not streams. The app demanded a
stream from a file that has none, so every channel was rejected and the screen showed
the error card. The B13 error-state work did exactly what it was built to do: it gave a
permanently failing source an honest error card instead of a blank list.

**The same defect is in the Search screen.** `useAggregatedSearch.ts:122` calls
`searchIPTVChannels`, which goes through the same convertor, so the "TV" group of the
search page has always been empty — the query throws, `data` is undefined, the section
does not render. It was never noticed because the error was swallowed by the
per-source error isolation.

---

## 2. The measurements — what the source actually serves

Every number below was measured on 2026-11-17 against the live source, not read from
its documentation. The probes live in `X:/Development/SIMBA/.scratch-figcraft/`:
`probe-iptv-join.js`, `probe-iptv-ondemand.js`, `probe-iptv-m3u-shape.js`,
`probe-b131-catalogue.js`, `probe-b131-undefined.js`, `probe-b131-wire-size.js`.

### 2.1 The JSON route — three files, and a join

| endpoint | bytes (decoded) | bytes (wire) | records | the keys that matter |
|---|---:|---:|---:|---|
| `/api/channels.json` | 8,002,773 | **1,047,201** | 31,843 | `id,name,alt_names,network,owners,country,categories,is_nsfw,launched,closed,replaced_by,website` |
| `/api/streams.json` | 3,926,086 | 619,700 | 18,766 | `channel,feed,title,url,quality,labels,user_agent,referrer` |
| `/api/logos.json` | 5,808,536 | 851,163 | 35,713 | `channel,feed,in_use,tags,width,height,format,url` |
| `/api/categories.json` | 2,773 | 856 | 30 | `id,name,description` — **no `channel_count`** |
| `/api/countries.json` | 18,955 | 4,248 | 250 | `name,code,languages,flag` |

* The **17.7 MB** in the user's question is the DECODED size of the three big files
  (`channels` + `streams` + `logos`). On the wire that join is **2,518,064 bytes** —
  the JSON is served gzipped.
* Joining them client-side yields **10,474 channels with a stream**, 30,688 with a
  logo, 26,474 with a category — and it needs all three raw arrays in memory at once
  (17.7 MB) to do it.
* `/api/streams.json` has **2,092 records with `channel: null`** — rows that join to
  nothing.
* There are **no per-item endpoints** (`/channels/<id>.json`, `/logos/<id>.json`,
  `/logos/<id>.png` → 404), and `?limit=` is ignored.
* **And the app only ever fetched one of the three** — `channels.json` — which is the
  one with no stream URL. So the app paid **1.05 MB on the wire / 8 MB decoded on
  EVERY scope change** (the query key was `['iptv','browse', category, term]`) and
  rendered **nothing**, every time.

### 2.2 The M3U route — one file, no join

`https://iptv-org.github.io/iptv/index.category.m3u` — the playlist the source
publishes for players:

| source | bytes (wire) | bytes (decoded) | entries | ms |
|---|---:|---:|---:|---:|
| `iptv/index.category.m3u` | **2,822,591** | 2,822,591 | **12,269** | 1,983 |
| `iptv/index.m3u` | 2,657,905 | 2,657,905 | 11,558 | 1,590 |
| `iptv/categories/news.m3u` | 249,920 | 249,920 | 1,069 | 138 |
| `iptv/countries/us.m3u` | 332,526 | 332,526 | 1,498 | 178 |

> The M3U is served with `content-encoding: identity` — **GitHub Pages does not
> compress it**, so 2.82 MB is what goes over the wire. The JSON is gzipped, so
> 8 MB becomes 1.05 MB. The comparison is therefore honest in both directions and it is
> made in §4.2.

One entry looks like this:

```
#EXTINF:-1 tvg-id="3ABNKids.us@SD" tvg-logo="https://i.imgur.com/z3npqO1.png" group-title="Animation",3ABN Kids (720p)
https://3abn.bozztv.com/3abn2/Kids_live/smil:Kids_live.smil/playlist.m3u8
```

Everything the app needs — the id, the logo, the category and the stream URL — is in
the same two lines. Measured over the whole index:

| fact | value |
|---|---:|
| entries | 12,269 |
| entries with a `tvg-id` | 12,269 (100 %) |
| **unique `tvg-id`** | **11,558** (711 duplicate entries) |
| unique channel ids before `@` | 10,437 |
| entries with a non-http(s) URL | **15** (rtmp 11, mmsh 2, srt 1, rtsp 1) |
| **playable rows** | **11,543** |
| entries with no name | 0 |
| entries with no logo | 141 |
| entries with a `tvg-name` | **0** — the display name is the only name |
| display names ending in `(720p)`-style | 7,591 |
| distinct group-titles | 30 + `Undefined` |
| distinct country codes | 181 — **all 181 present in `/api/countries.json`** |

Three facts that shape the parser:

1. **The `@feed` suffix must stay in the id.** 11,558 unique `tvg-id` vs 10,437 unique
   channel ids before `@` — two feeds of one channel are two entries (`AnimaxAsia.sg@India`
   and `AnimaxAsia.sg@Taiwan`), and both are playable.
2. **The group-title is the category id, in a different case.** `Animation` vs the
   id `animation` — the match is case-insensitive, and all 30 group-titles resolve.
   The one group-title with no category is `Undefined` (**1,558 rows**).
3. **`categories/xxx.m3u` is empty** (status 200, **0 entries**), so the category `xxx`
   ("XXX") has **no channels at all** — the filter sheet must not offer it.

### 2.3 The answer to "can't we fetch on demand?"

**Yes — and the on-demand unit is the index itself, fetched once.**

The per-scope playlists exist (`categories/<slug>.m3u` ≈ 250 KB, `countries/<code>.m3u`
≈ 330 KB), but the Live TV screen's DEFAULT scope is "All channels", and "All" needs
the index. A second data path would only help a user who opens Live TV and immediately
picks a category — a scope that cannot be reached before the index has been fetched
anyway. So the catalogue is fetched **once**, cached, and every scope after that is a
filter over memory. That is both smaller and simpler than the join.

---

## 3. The three checks — what the code says

The user asked whether these are the same across the pages. Each answer below is
"**no**" or "**yes**", with the file and line that says it.

### 3.1 The pagination footer — **NOT the same**

| surface | the footer | the file |
|---|---|---|
| Music | the shared owner | `screens/_shared/BrowseListFooter.tsx` |
| Radio | the shared owner | same |
| Live TV | the shared owner | same |
| **Movies** | **its own copy** + a fifth branch (the archive refuses to page past 10,000 rows) | `screens/MoviesScreen/components/MoviesFooter.tsx` |
| **Podcasts** | **its own copy** (`pageError` semantics instead of `error`) | `screens/PodcastsScreen/components/PodcastsFooter.tsx` |
| Audiobooks | a bare `ActivityOrb` with no words, inline | `screens/AudiobooksScreen/components/AudiobooksContent.tsx:235-241` |

Three owners for one grammar. The shared footer already accepts per-surface label
overrides, so the Movies' "window end" line is a **label**, not a second component.

*(Audiobooks/Archive/Shows are not on the browse shell at all — they have no FAB, no
filter sheet and no shell footer. They stay out of this wave: B13-12.)*

### 3.2 The loading component — **NOT the same**

There are **two** loading languages in the app:

| language | the component | orb | text | anchor | used by |
|---|---|---:|---|---|---|
| **A — the pill** | a local `centerLoader` in each screen's styles | 24 | `caption`, secondary, 0.85 | 20 % from the top, inside an elevated rounded pill | Music, Movies, Podcasts |
| **B — the placeholder** | the shared `Placeholder variant="loading"` | 36 | `body2`, tertiary | 30 % from the top, no pill | **Radio, Live TV**, Audiobooks, Archive, Shows, Genre, Search, FolderBrowser |

The wave's own grammar — `md/WAVE_B13_MUSIC_RADIO.md` §2, element 5 — names **A**:

> **The content** — four states, and only four: **loading** (an `ActivityOrb` in an
> elevated pill), **error** (the shared `ErrorState`…), **empty** (the shared
> `EmptyState`), **list**

So Radio and Live TV were the two surfaces that did not follow the grammar they are
part of. And A is copied **three times** (`MusicScreen/styles/ListStates.styles.ts`,
`MoviesScreen/styles/ListStates.styles.ts`,
`PodcastsScreen/styles/PodcastsOverlays.styles.ts`) with identical geometry.

### 3.3 The pull-to-refresh — the gesture is right, the LIST is not always there

The gesture itself is **one owner** on all five browse screens
(`screens/_shared/pullToRefresh.ts`, used by `useMusicScreen.ts:150`,
`useMoviesScreen.ts:250`, `usePodcastsScreen.ts:146`, `useRadioBrowser.ts:247`,
`useLiveTVBrowser.ts:197`): the spinner belongs to the *gesture*, never to the query's
`isFetching`, so it cannot fire on a background refetch or on the next page.

But **the list is not always mounted**:

* On **Radio and Live TV** the screen returns the loading state *instead of* the
  `FlatList` (`RadioContent.tsx:328-331`, `LiveTVContent.tsx:331-338`), and the error
  state replaces it too (`:339-358`). So during the first load — and after a failed
  first load — **there is no `RefreshControl` at all**: the pull gesture does not
  exist.
* On **Music and Movies** the first load also swaps the list out, but the ERROR state
  lives *inside* the list (`ListEmptyComponent`), so the gesture survives a failure.
* On **Podcasts** the list is always mounted and the states float over it
  (`PodcastsOverlays`).

So the honest answer to *"is refreshing causing an issue on the first load, and is it
working?"* is: **the spinner never misfires — but on Radio and Live TV there is nothing
to pull, because the page is not a list until the list arrives.** The fix is the one
Music and Movies already use: **the list is always mounted, and the states live inside
it.**

---

## 4. The design

### 4.1 The catalogue — one owner, one query key, one file on the wire

```
GET https://iptv-org.github.io/iptv/index.category.m3u     2,822,591   the catalogue
GET https://iptv-org.github.io/api/categories.json               856   id → name
GET https://iptv-org.github.io/api/countries.json              4,248   code → name
                                                              ─────────
                                                              2,827,695   once
```

* **One TanStack query key**: `['iptv', 'catalogue']`. The old key was
  `['iptv','browse', category, term]`, so **every filter change and every search
  re-downloaded the file**. Now a scope change is a `useMemo` over memory.
* **The categories and the countries are resolved inside the catalogue**, so a channel
  carries its human-readable category name and country name — the row subtitle
  (`News · United States`) is built from the source's own vocabulary, not from a
  client-side join.
* **`channelCount` is computed**, because `/api/categories.json` does not serve one
  (measured: 0 occurrences). The type stays honest: the count is real, and it is real
  because the app counted the rows it holds.
* **The sheet offers only the categories that answer**: 29 of the 30 (the `xxx`
  category has zero channels and an empty playlist). The `Undefined` group — 1,558
  channels with no category — is kept, with no category, and is reachable under "All".

### 4.2 Why the M3U and not the JSON join

| | JSON join | M3U index |
|---|---|---|
| files on the wire | 3 (`channels` + `streams` + `logos`) | 1 |
| wire bytes | 2,518,064 | 2,827,695 |
| decoded bytes held in memory | 17,737,395 | 2,822,591 |
| client-side join | 3 arrays, 86,322 records | none |
| channels with a stream | 10,474 | **11,543** |
| logos | 30,688 | 11,402 of 11,543 |
| categories | 26,474 | every row (the group-title) |
| fetch count per scope change | **3, every time** | 0 — the index is cached |

The join is 310 KB **smaller on the wire** but 6× larger in memory, needs a
three-array join to answer "give me a channel with a stream, a logo and a category",
and yields 1,069 fewer channels. The M3U is the format the source publishes *for
players*: it is the file a TV app is meant to read, and it is already one file with
everything in it. The app's total wire cost drops from **1.05 MB per scope change,
forever, for nothing** to **2.83 MB once per session**.

### 4.3 One loading component, one footer, one list that is always there

* **`screens/_shared/BrowseLoadingState.tsx` (new)** — the ONE owner of the loading
  pill (orb 24 + `caption` + the elevated pill, anchored 20 % from the top). Music,
  Movies, Podcasts, Radio and Live TV all render it; the three copies of the geometry
  are deleted.
* **`screens/_shared/BrowseListFooter.tsx`** — stays the ONE owner of the footer. It
  grows ONE optional prop, `endLabel`, so the Movies' archive "window end" line is a
  label on the shared footer instead of a second component. `MoviesFooter.tsx` and
  `PodcastsFooter.tsx` are deleted.
* **The list is always mounted** on Radio and Live TV. The loading / error / empty
  states become the `FlatList`'s `ListEmptyComponent`, exactly as Music and Movies do
  it — so the pull-to-refresh exists in every state, and the page does not swap its
  whole content area when the first page fails.

### 4.4 What this wave does NOT change

* The **Penpot boards** need no change: no board in `designs/penpot/` draws a loading
  state or a footer (verified — no `Loading`, no `caught up` anywhere in the design
  sources), and the Radio/Live TV boards draw the loaded list, whose structure is
  unchanged. The boards' row data remains a snapshot (B12-9).
* **Radio's own source** (radio-browser) is untouched — it already works.
* **Audiobooks / Archive / Shows** stay off the browse shell (B13-12).
* The `IPTVCategory.channelCount` type stays **required** — it is computed now, not
  optional.

---

## 5. The code

**31 files changed, +740 / −1237, plus 7 new files.** The deletions are almost half of
it: three copies of the loading geometry, two copies of the footer, and the whole
JSON-join machinery.

### 5.1 New — the IPTV source (3 files)

| file | what it owns |
|---|---|
| `src/infrastructure/api/iptv/m3u.ts` | the **parser**. Pure. `parseIPTVM3U(text)` → `IPTVM3UEntry[]`; `cleanIPTVName(name)`; `countryCodeFromIPTVId(id)`. |
| `src/infrastructure/api/iptv/catalogue.ts` | the **domain**. Pure. `buildIPTVCatalogue(entries, categoryNames, countryNames)` → `IPTVCatalogue`; `filterIPTVChannels(channels, {categoryId, term})`. |
| `src/screens/_shared/BrowseLoadingState.tsx` | the **ONE loading pill** (orb 24 + caption, elevated pill, 20 % anchor, `testID="browse-loading-state"`). |

The parser's rules, each one measured against the live index:

* the display name is everything after the **first** comma, minus the resolution
  token — anywhere in the name, because the source writes *"Animation+ (1080p)
  [Geo-blocked]"*;
* `[Geo-blocked]` is **kept** — it tells the user something they need;
* the `@feed` suffix stays in the id — two feeds of one channel are two entries, and
  both are playable;
* the **URL scan stops at the next `#EXTINF`** — otherwise an entry borrows the
  next channel's URL (this was a real bug, caught by the test below);
* non-http(s) URLs are dropped (15 of them: rtmp 11, mmsh 2, srt 1, rtsp 1);
* duplicates are dropped by `tvg-id` (711 of the 12,269 entries);
* the country code is the last dot-segment before the `@`.

The catalogue resolves the **category name** and the **country name** from the two
small maps, and **computes** the category's `channelCount` — `/api/categories.json`
does not serve one (30 records, 0 occurrences of `channel_count`).

### 5.2 Rewritten — the IPTV adapter

`src/infrastructure/api/iptv/adapter.ts` is now ~90 lines instead of ~250:

* `getIPTVCatalogue(signal)` fetches the playlist (as **text**) and the two maps
  **in parallel**;
* `apiFetch` grew one option, `responseType?: 'json' | 'text'` — the playlist is not
  JSON;
* `categoryNameMapFromRaw` / `countryNameMapFromRaw` — a bad row is **dropped**, a
  non-array payload throws `AdapterParseError`;
* `IPTV_RETRIES = 2` is kept (the contract test asserts it).

**Dead exports removed:** `getAllIPTVChannels`, `searchIPTVChannels`,
`getChannelsByCountry`, `getChannelsByCategory`, `getIPTVCategories`,
`getIPTVChannelById`, `channelResultFromRaw`, `categoryResultFromRaw`.

`src/constants/api.ts` keeps the IPTV api base and replaces the dead `m3uBaseUrl`
with `iptvPlaylist` (`https://iptv-org.github.io/iptv`, `timeoutMs: 30_000` — the
playlist is served uncompressed, so it needs a longer budget than the JSON).

`src/types/api.ts`: `IPTVChannelResult.categoryId` is added. **`category` stays the
display NAME** — the type says which is which.

### 5.3 The Live TV screen

`useLiveTVBrowser.ts` — one query, `['iptv','catalogue']` (`staleTime` 30 min,
`gcTime` 60 min). The category filter now holds the **ID**; the scope is a
`useMemo`; the sheet offers only the categories with `channelCount > 0`; the chip
shows the **name**; `usePullToRefresh(catalogueQuery.refetch)` owns the gesture.

`LiveTVContent.tsx` — the list is **always mounted** (`testID="section-LiveTVScreen-list"`);
the states live in `ListEmptyComponent`; the loading state is the shared pill; the
footer's `error` is deliberately `null` — the catalogue is already in memory, so
there is no next page that can fail.

**The category filter speaks the ID everywhere** — the sheet's row keys, the deep
link, the channel's `categoryId`. The name is only ever *displayed*. That removes
the id↔name translation which made the deep links inert.

### 5.4 The other surfaces

| surface | change |
|---|---|
| `RadioContent.tsx` | the list is always mounted (`testID="section-RadioScreen-list"`), the shared loading pill, the dead `footer`/`loadMoreRetry` styles and the unused `ActivityOrb` import are gone |
| `MusicScreen`, `MoviesScreen`, `PodcastsScreen` | the three copies of the loading geometry are deleted; each renders `BrowseLoadingState` |
| `MoviesContent.tsx` | on the shared footer, with `endLabel={windowEndLabel}` — the archive's *"Showing N of M movies — the archive stops paging here"* is a **label**, not a second component |
| `PodcastsContent.tsx` | on the shared footer, with `error={pageError}` (the load-more error, not the list's error) |
| `PodcastsOverlays.tsx` | the floating *"Refreshing…"* pill is **deleted** — it fired on the NEXT PAGE, not on a refresh; the platform `RefreshControl` + the shared `usePullToRefresh` is the house's one refresh indicator |
| `BrowseListFooter.tsx` | gains ONE optional prop, `endLabel` |
| `useAggregatedSearch.ts` | the IPTV leg uses the shared catalogue query + an in-memory filter — **the Search screen's "TV" group was permanently empty** |

### 5.5 Deleted

`MoviesFooter.tsx`, `PodcastsFooter.tsx`, `MusicScreen/styles/ListStates.styles.ts`,
`MoviesScreen/styles/ListStates.styles.ts`, `MoviesFooter.styles.ts`,
`PodcastsFooter.styles.ts`.

---

## 6. The tests

| file | describes | cases | what it pins |
|---|---:|---:|---|
| `__tests__/infrastructure/api/iptv/m3u.test.ts` | 1 | 11 | the parser: the name after the FIRST comma, the resolution token anywhere in the name, `[Geo-blocked]` kept, the `@feed` suffix kept, the country code, the non-http URLs dropped, the duplicates dropped, **and the URL scan stopping at the next `#EXTINF`** (the bug that let an entry borrow the next channel's URL) |
| `__tests__/infrastructure/api/iptv/catalogue.test.ts` | 2 | 10 | the catalogue: the name resolution, the computed `channelCount`, the `Undefined` group kept with no category, and `filterIPTVChannels` by category and by term |
| `__tests__/infrastructure/api/iptv/adapter.test.ts` | 2 | 8 | the adapter: the three fetches, the playlist read as **text**, the bad-row drop, the non-array throw, `IPTV_RETRIES` |
| `__tests__/screens/LiveTVScreenNew/liveTvRules.test.tsx` | 2 | 6 | the screen rules: one query key, the filter holding the ID, the list always mounted, the sheet offering only non-empty categories |

`__tests__/paginatedAdapters.test.ts` lost its IPTV block (94 lines) — the adapter it
described is gone.

**Full suite: 189 suites, 1846 passed, 1 todo, 0 failed.**

---

## 7. The device proof

Device: `emulator-5554` (1080×2400, density 420), the **live** source (no stubs, no
fixtures). Screenshots in `X:/Development/SIMBA/.scratch-figcraft/`.

### 7.1 The screenshot that started this — Live TV loads

* `b131-loading.png` — **Live TV renders the catalogue.** Rows read *"3ABN Kids —
  Animation · United States"*, *"ADN TV+ — Animation · France"*, *"Animation+
  [Geo-blocked]"*, *"Anime Vision — Animation · Spain"*. The logos load, and the
  logo-less row gets the gold-dim placeholder tile.
* **The error card and the toast are GONE.** That was the user's screenshot.

### 7.2 The three checks

**(a) The loading component is the SAME across pages.** Two captures, taken on two
different screens, with the same component:

| capture | screen | what it shows |
|---|---|---|
| `b131-loading.png` | Live TV | the pill: a gold orb in an elevated rounded pill, 20 % down, caption **"Loading channels…"** |
| `b131-radio-loading.png` | Live Radio | **the same orb in the same pill at the same anchor**, caption **"Loading stations…"** |

Same geometry, same component, **only the words differ** — each surface says what is
loading. That is the shared `BrowseLoadingState` doing its job.

(The Radio capture needed a deliberate fetch delay: the radio-browser answer arrives
in well under a second, so the loading state was too short to photograph. The delay
was applied to the app's `fetch` from the debugger and removed by reloading the
bundle afterwards — a screenshot of a state the app really renders, not a mock.)

**(b) The pagination footer is the SAME.** One owner: `src/screens/_shared/
BrowseListFooter.tsx`. All five browse surfaces import it:

| surface | the footer |
|---|---|
| Music | `BrowseFooter` (shared) |
| Movies | `BrowseFooter` (shared) + `endLabel` |
| Podcasts | `BrowseFooter` (shared) + `error={pageError}` |
| Radio | `BrowseFooter` (shared) |
| Live TV | `BrowseFooter` (shared), `error={null}` |

Device-proven on Live TV: the end-of-list line reads **"You're all caught up."**
(`b131-search.png`), rendered by the shared footer's own end branch.

*What was NOT photographed:* the Movies' and Podcasts' **end-of-list** on device. The
Movies archive is a two-column grid that pages to a 10,000-row window — its end is
thousands of swipes away, and the Music/Podcasts lists page infinitely, so their
footer keeps moving. The migration is pinned by the code and the tests; the
*photograph* of the Movies' window-end label is still open (B13.1-5).

**(c) The pull-to-refresh works and does not misfire on the first load.**

* `b131-refresh.png` — the pull gesture shows the platform spinner **with the list
  visible underneath**. The list is always mounted now, so the gesture exists in
  every state.
* The misfire is gone by construction: the spinner belongs to the **gesture**
  (`usePullToRefresh`), never to the query's `isFetching` — so it cannot fire on a
  background refetch or on the next page. The Podcasts' floating *"Refreshing…"*
  pill, which **did** fire on the next page, is deleted.

### 7.3 The filter, the chip and the search

* `b131-sheet.png` — the filter sheet lists **29 category chips and no "XXX"** —
  the category whose playlist is empty (0 entries) is not offered.
* `b131-filtered.png` — tapping **News** gives a gold **"News"** chip, a badge
  **1** on the FAB, and a News-only list — **with no re-download** (the catalogue is
  already in memory).
* `b131-search.png` — searching **"2GB"** with News gives one row and the shared
  footer's **"You're all caught up."**

### 7.4 The stream itself

Tapping a channel hands the **real** stream URL to the player. The stream that was
tried is geo-blocked at the source (mpv reports `E_LOAD_FAILED`), which is the
source's business, not the app's: the app's job is to deliver the URL, and it does.

---

## 8. The gates

`pwsh -NoProfile -File 'X:/Development/SIMBA/.scratch-figcraft/gates.ps1' -Out
'X:/Development/SIMBA/.scratch-figcraft/gates-waveB13.1'`

| gate | result |
|---|---|
| `tsc` | **exit 0** |
| `eslint . --ext .ts,.tsx --max-warnings 0` | **exit 0** |
| `boundaries` (`scripts/check-import-boundaries.js`) | **exit 0** |
| `fonts` (`scripts/check-font-resolution.js`) | **exit 0** |
| `boards` (`designs/check-board-routes.js`) | **exit 0** |
| `jest` | **exit 0** — 189 suites, 1846 passed, 1 todo, 0 failed |

### 8.1 The bite-checks

A green suite only means something if it would go red when the rule is broken. Two
rules were broken on purpose, the suite was run, and both changes were reverted:

| the rule broken | the suite said |
|---|---|
| the parser's URL scan no longer stops at the next `#EXTINF` — an entry may borrow the next channel's stream | **1 failed, 10 passed** (the parser test) |
| the Live TV list is unmounted while the first page loads — the old behaviour, with no pull-to-refresh | **1 failed, 5 passed** (the screen test) |

---

## 9. Carried forward

Every item below is **open**. The ids are this wave's.

### Closed by this wave

* **B13-1** — the IPTV adapter redesign. **Closed** by B13.1: the M3U catalogue,
  one query key, one file on the wire.
* **B13-2** — Live TV's catalogue size and the three pools. **Closed** by B13.1: one
  2.83 MB file instead of a 17.7 MB decoded join.

### New — opened by this wave

* **B13.1-1** — the playlist's **960 `#EXTVLCOPT`** directives (`http-user-agent`,
  `http-referrer`) are **dropped by the app**. The lib's `OpenPlayerOptions`
  (`react-native-media-player/src/hooks/usePlayerActivity.ts`) has **no headers
  field**, so they cannot be forwarded. **Needs a new lib option + a lib release** —
  the app cannot fix this alone.
* **B13.1-2** — Radio and Live TV's **empty state** is still `Placeholder
  variant="empty"`, while Music/Movies/Podcasts use the shared `EmptyState`. Left
  alone on purpose: it is a visual change outside the user's ask, with no board to
  check it against.
* **B13.1-3** — the Live TV footer's `error` branch is **deliberately `null`**
  (`error={null}`), because the catalogue is in memory and no next page can fail.
  If the catalogue ever becomes paged, that argument has to be revisited.
* **B13.1-4** — the Search page's **first** IPTV search pays the 2.8 MB catalogue
  download (it shares Live TV's cache entry, so a user who opened Live TV first
  never pays it twice).
* **B13.1-5** — the **Movies' and Podcasts' end-of-list on device** was not
  photographed (see §7.2b). The Movies archive's window-end label needs a
  screenshot, and the two screens' footers need one each.
* **B13.1-6** — **individual IPTV streams are frequently dead or geo-blocked at the
  source** (measured: 3ABN Kids 200, ADN TV+ 206, Animation+ 403 geo-blocked, Anime
  Vision 504). The app hands over the real URL; the source decides whether it plays.

### Still open from Wave B13

* **B13-3** — Radio and Live TV → the shared `BrowseLayout`.
* **B13-4** — Radio and Live TV are ~90 % the same file.
* **B13-5** — `FilterSheet.title` is dead app-wide.
* **B13-6** — the 44 dp floor belongs in the `FilterChips` primitive.
* **B13-7** — the footer's retry pill is ≈26–30 dp.
* **B13-8** — a radio-browser tag name is not unique across groups.
* **B13-9** — `MusicDetailScreen`: keep-and-fix, wire, or delete.
* **B13-10** — `MusicDetailScreen`'s own defects.
* **B13-11** — a Music deep link can arrive without `source`.
* **B13-12** — Audiobooks / Archive / Shows → the shared shell (A-01…A-31).
* **B13-13** — the Radio sheet's three groups do not belong in one panel.
* **B13-14** — the `*_RETRIES` constants lie.
* **B13-15** — the vestigial `ScreenNew` suffix.
* **B13-16** — the dead route params.
* **B13-17** — the dead exports on the Music side.
* **B13-18** — the `fontWeight` sweep beyond this wave's surfaces.
* **B13-19** — the Jamendo flakiness is worked around, not fixed upstream.
* **B13-20** — the GENRE menu is the whole tag list.
* **B13-21** — the language menu's numeric leftovers.

### Still open from Wave B12 and before

* **B12-1** (P-12 scroll-to-top) · **B12-2** (the raw taxonomy unreachable) ·
  **B12-3** (TV & Film plates + glyphs) · **B12-4** (Science/Sports cover plates) ·
  **B12-6** (`eslint .` reports 4 errors + 15 warnings in `designs/penpot/*.js`) ·
  **B12-7** (the detail board proven by rule, not numerically) · **B12-8** (the
  Movies/Search/Radio/Live TV sheets not re-measured) · **B12-9** (the board's content
  is a snapshot) · **B12-11** (`FILTER_SEED_PARAMS['categoryId']` kept) · **B12-12**
  (the shared `FilterSheet`'s own `fontWeight: '700'`) · **B12-13** (the catalogue's
  full-resolution artwork payload) · **B12-14** (7/100 trending feeds carry `http://`
  artwork) · **B-11-2** (Search chip paint order) · **B-11-3** (the footer's ~11 dp FAB
  offset) · **B-11-4** (the status band for the other 67 boards) · **B-11-5**
  (Podcasts' end-of-list state) · **B-11-6** (the Movies footer's `windowEnd` copy) ·
  **B-11-7** (a full-zoom Movies board pass) · **R3** (Bookmarks "N saved" chip,
  finished Downloads playable, Library's Playlists mode, History's dead
  pull-to-refresh) · **R4** (Stats) · **R5** (the dead-code sweep) · **R6**
  (re-enable `@typescript-eslint/no-unused-vars`).
* **CF-01** (fixed, device-proven — close it) · **CF-03/CF-04** (verify and close) ·
  **CF-12** (`preferredLanguages` default `'eng, jpn, und'`) · **CF-21** (`Avatar`'s
  no-initials fallback draws a music note) · **CO-05** (the privacy chain) · **CO-06**
  (the Profile's quiet space) · **CO-07** (the Downloads auto-delete preference) ·
  **CO-08** (fixed — verify and close) · the **iOS URL scheme** is unregistered · the
  **font gate's 426-tag blind spot**.
