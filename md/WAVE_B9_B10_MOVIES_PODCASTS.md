# Wave B9 / B10 — Movies and Podcasts: the content and the filters

**2026-11-13 · branch `f5/w22-close-minimise-d9` · base `0507926` (Wave B)**

Two screens, one treatment: the **content** checked against the live
source, the **filters** checked against what they actually do, and every
"it works" claim backed by the device.

The audit found more than cosmetics. It found a crash that stopped the
Movies list dead at 40 rows, a filter chip that showed a filter the
source was not applying, a RESET button that could not be reached, and a
default order that put television news segments where the user asked for
films.

---

## 1 · The ask

The owner's words, on the device:

> "check the filters also, check its working or not, ui flaws im seeing it
> too below, also same way go through movies, from home page next, check
> content and filters etc, same way podcasts after completion of these two"

So: the Filters and the Search page were audited first (Wave B, `0507926`),
then **Movies** (B9), then **Podcasts** (B10) — each one the same way.

---

## 2 · The browse shell was three copies of one file

`MusicScreen`, `MoviesScreen` and `PodcastsScreen` each carried their own
`components/BrowseLayout.tsx`. The Music and the Movies copies were
character-for-character identical apart from a comment; the Podcasts copy
added one effect.

Three copies meant three places to fix one bug, and the audit found
exactly that: the Movies' dead "View" group, the permanently visible
RESET FILTERS footer and the disagreeing left gutters were each live in
one copy and inherited by the others.

**`src/screens/_shared/BrowseLayout.tsx` (new)** is the shell now. The
three per-screen copies were deleted after verifying that nothing imports
them (the only references left were in `graphify-out/` build artifacts).

The shell also owns ONE gutter: `spacing.lg` (16 dp). The chip strip used
to carry the gutter twice — the slot's own 12 dp plus the `FilterChips`
row's own 12 — so the first chip started 24 dp from the edge while the
search field above it started at 12. The `FilterChips` component is shared
app-wide, so the row's padding is overridden in the shell rather than
changed there; the other five screens that use it keep their own gutter.

---

## 3 · Movies

### 3.1 The default order was the archive's order, and it showed news segments

The Internet Archive's own order is **recency** — the newest uploads
first. The newest uploads under a subject tag are the long tail of user
uploads, not films.

Measured on 2026-11-12 against the live endpoint with the app's exact
query:

| category | archive's natural order | `downloads desc` |
|---|---|---|
| Documentaries | **38 of the first 40** were television news segments | 0 of 40 |
| Comedy | — | 0 of 40 |
| Western | — | 0 of 40 |
| Silent Films | — | 0 of 40 |

Under `downloads desc` the Documentaries category leads with Ken Burns,
The World at War and PBS Nova, and `collection:feature_films` leads with
Chaplin.

So the Movies default order is now **"Most popular"** (`downloads desc`).
The sheet says so: `defaultKey: 'popular'` draws that chip as the applied
state (gold) **without** counting it as an active filter — resetting a
group that is already at its default changes nothing, so the RESET
FILTERS footer must not offer it.

Device proof, first page of the Movies grid:

> CUKESIM's New Job! ( Charles Chaplin-1915) · Sex Madness, 1938 · Charlie
> Chaplin Festival, 1938 · The Fast And The Furious, 1955 · Dr. Sex. ·
> Voyage to the Planet of Prehistoric Women, 1967 · His Girl Friday, 1940 ·
> House on Haunted Hill, 1959 · Jungle Book, 1942 · Reefer Madness, 1938 ·
> Sita Sings the Blues, 2008 · Utopia, 1951 · The Pied Piper of Hamelin,
> 1957 · Escape From Sobibor, 1987

Switching the sheet to "Recently added" swaps the list for the recency
order (2026 uploads, `KonCategoryIII`) and puts **"Sort: Recently added"**
in the chip strip with a badge of **1** on the FAB. RESET FILTERS returns
it to the default.

### 3.2 The list could never page past 40 rows — and it was not the network

This is the finding that mattered most.

The Movies list fetched **one shot of 500 items** and sliced them
client-side. Three consequences:

1. the list stopped **silently** at 500 items while the source had
   **30,884** — the user scrolled to the end and the grid simply ended,
   with nothing on screen to say why;
2. "You're all caught up" was **unreachable** (it fires when
   `items.length >= numFound`, and 500 is never 30,884);
3. the footer's "Loading more…" branch was **dead code** (`isLoadingMore`
   was hard-coded `false`).

The hook now pages the source with `useInfiniteApiQuery` (`PAGE_SIZE` 40),
and the footer has four honest branches: loading / retry / "You're all
caught up" / **"Showing N of M movies — the archive stops paging here"**.
That last one exists because the Archive will not page past 10,000 rows:
with `rows=40`, page 250 answers normally and **page 251 answers HTTP
507 Insufficient Storage**.

The cache key is the **query string** (the category ids sorted ONCE, so
the key and the question can never disagree), and the key uses the
EFFECTIVE sort, so the default order and an explicit "Most popular" share
one cache entry instead of fetching the same page twice.

### 3.3 …and then the paging broke on a single item

With the pagination in place, page 2 failed every time. The footer said
**"Couldn't load more — tap to retry"** and retrying failed again.

The cause was not the network. A temporary `logger.error` in the query
path produced the stack:

```
TypeError: undefined is not a function
    at normalizeArchiveTitle
    at internetArchiveVideoResultFromRaw
    at internetArchiveVideoResultsFromRaw
```

**Internet Archive is a metadata API: a document can carry the same field
more than once, and the search API then answers with an ARRAY instead of
a string.** Measured on the live endpoint, page 2 of the app's own query
carries:

```json
"title": ["The Three Stooges - \"Color Craziness\"",
          "\"Color Craziness\" - The Three Stooges"]
```

The wire type said `string`, so the array went straight into the domain
object and the first `.trim()` on it threw — **taking the whole 40-row
page down, not just the one item**. The Movies list could not page past
its first 40 rows, and the failure was reported as a network problem.

**The fix** (`src/infrastructure/api/internetArchive/adapter.ts`): a
`firstString()` reader that takes the first non-empty entry of a
multi-valued field (IA puts the primary value first) and coerces a number
or a boolean to a string. It is applied to every field the adapter
reads — `title`, `description`, `creator`, `year`, `runtime`,
`image_url`, the track `title` and the track `length` — in the audio
search mapper, the audio metadata mapper, the video search mapper, the
video metadata mapper and the track mapper.

**Ten regression tests** (`__tests__/internetArchiveAdapter.test.ts`),
including one that keeps a whole 40-row page alive when one item has a
multi-valued title.

Device proof after the fix: the list scrolls past 120 rows, and the item
that used to kill the page renders correctly —
**"The Three Stooges - "Color Craziness""**.

### 3.4 The dead "View" group, and the permanently visible RESET button

The Movies sheet declared a **View (Grid / List)** group. Nothing consumed
it — the grid is hard-coded `numColumns={2}` — but `useSectionOptions`
seeded a default for it, and a group with a value counts as active. So
**RESET FILTERS was visible on every browse screen, at all times**, even
with nothing filtered.

The group was deleted rather than wired: there is no grid/list switch in
the app to wire it to, and inventing one would be a new affordance.

`view` is now optional in `useSectionOptions` and exists only where a
config declares a `view` group.

### 3.5 The rest of the Movies fixes

- **`collapsedRowLimit: 6`** on the Category group. `constants/movieCategories.ts`
  has claimed since v10.2b that "the FILTER sheet collapses these behind
  'SHOW MORE' so the first six categories stay instantly tappable" — the
  comment described a behaviour the config never asked for, so all 20
  chips were expanded and the sheet ran past the screen. The limit is
  now real.
- **The option icons are gone.** The filter sheet draws text pills; the
  genre icons were copied into the option model and then thrown away by
  the sheet. Dead data in the model is a lie about the sheet.
- **Dead sort mappings removed** (`oldest`, `za`, `rating` — nothing could
  produce them). The sheet offers three: Most popular / Recently added /
  A–Z.
- **The placeholder cover is used only when exactly ONE category is
  selected.** With two categories selected the cover would stand in for
  films it does not belong to.
- **The card's text padding moved 12 → 16** so the first column aligns
  with the page gutter. The grid itself stays full-bleed — a deliberate
  documented mosaic.
- **`heroMeta` weight**: `fontWeight: '500'` → `FONT_FAMILY.inter.medium`.
  On Android the family `Inter` + weight < 700 resolves to `Inter.ttf`
  (Regular), so the SemiBold face was unreachable.
- **`onEndReached` is guarded by a first-touch-scroll flag.** A scope
  whose whole result set fits on one screen fires `onEndReached` the
  moment the list mounts, and the page nobody asked for is a wasted
  request.

---

## 4 · The filter sheet — two flaws the three screens shared

### 4.1 The last chip row sat under the system gesture bar

The sheet is presented with `insetAdjustment="never"` (see
`components/sheets/BottomSheet/BottomSheet.tsx`), so true-sheet does NOT
lift the sheet above the gesture bar — the consumer's last child has to
carry the bottom inset. The RESET footer did; **the body did not**, so
with no active filter (no footer) the SORT BY chip row was drawn under
the gesture pill.

Measured on the device: the chip row sat at y 0.956–0.991 of the screen;
the gesture pill is at ~0.978–0.986. After the fix the body carries the
24 dp inset and the chip row sits at **0.930–0.965** — clear of it.

### 4.2 RESET FILTERS could be pushed off the sheet

The RESET footer was a **sibling** of the sheet's scrollable body. The
body takes the sheet's whole height, so a group opened with SHOW MORE
(the Podcasts sheet has **112** categories, the Movies sheet 20) pushed
the footer off the bottom of the sheet entirely — **and RESET became
unreachable**. Measured: with the Podcasts group expanded and Comedy
selected, the sheet's last element was "HIDE" and there was no Reset
button anywhere in the tree.

The footer now lives **inside** the scrollable body, as its last item.
In the collapsed sheet it sits under the chips (as before); in the
expanded sheet it is the end of the scroll. Device proof after the fix:
the expanded sheet ends with HIDE → **RESET FILTERS**, and tapping it
clears the selection, the chip strip and the FAB badge.

---

## 5 · Podcasts

### 5.1 Pull-to-refresh did nothing

The refresh called `setActiveCategoryId(categoryId)` with the value the
screen already had. React saw no change, so **nothing was refetched** —
the gesture spun and did nothing. It calls `retry()` now, and the gold
ActivityOrb is on screen while the page reloads (device proof: the
spinner appears and the list re-renders).

### 5.2 The list was unmounted while the first page resolved

The FlatList was replaced by the loading overlay during the first resolve
of a scope, which **unmounted the list and threw away the scroll
position** on every category change. The loading pill is an overlay, so
it does not need the list to be gone — the list is always mounted now.

### 5.3 The scope is a term OR a category, never both

The Podcast Index cannot answer both at once: `/search/byterm` takes `q`
but no `cat`, and the trending endpoint takes `cat` but no `q`. The two
cannot be combined — the category would be silently ignored.

The app already cleared the category when a term first arrived. The
other half was missing: a category picked **while a term was on screen**
stayed in the chip strip looking applied, while the source went on
answering the term alone. That is the exact lie the first rule exists to
prevent.

Both rules are now on (`autoClearFilterOnSearch` +
`autoClearSearchOnFilter`), so the scope has **one** source of truth:
the last thing the user chose is the one that applies, and the chip strip
always says what the source is really answering.

Device proof: typing `nasa` shows NASA Daily, NASA's Astronomy Picture
of the Day and five more; opening the sheet and picking **Arts** clears
the search field, leaves **Arts** in the chip strip with a badge of 1,
and the list becomes arts podcasts.

### 5.4 The rest of the Podcasts fixes

- **The list gutter 12 → 16.** The code comment claimed 16 while the
  style said 12; the style now says what the comment said.
- **`PodcastRow`'s title** `fontWeight: '600'` → `FONT_FAMILY.inter.semibold`
  (same Android weight-in-the-family rule as §3.5).
- **`collapsedRowLimit: 6`** on the Category group, and the option icons
  removed, like the Movies sheet.
- **The end-of-list line no longer shows under an empty result set.** An
  empty list already says "No podcasts match your search." above it;
  telling an empty list that you are "all caught up" underneath is a
  second end-of-list line saying nothing. The Movies footer had the same
  branch and the same fix.

### 5.5 Music (the sibling)

The Music screen shares the shell, so it inherits the gutter and the
sheet fixes. Its own two fixes: the list gutter 12 → 16, and
`TrackCard`'s `trackName` `fontWeight: '600'` →
`FONT_FAMILY.inter.semibold`.

---

## 6 · The navigation deprecation

The helper `navigate()` used the v7 options-object form
(`navigationRef.navigate({name, params})`), which React Navigation 7
deprecates. Every navigation through it logged:

> Passing an object as the argument to 'navigate' is deprecated. Use
> 'navigate(name, params, options)' instead.

The deprecation lives in `CommonActions.navigate` itself — its object
branch is the deprecated one — so the helper now dispatches the **string
form** through `navigationRef.dispatch`. The warning no longer appears in
logcat after a reload (verified).

`__tests__/navigation/navigationHelper.test.ts` pinned the old contract,
so it was rewritten to pin the new one: the dispatched action, and the
`isReady()` guard.

---

## 7 · The shared options model

`useSectionOptions` was seeding a `view` value for every screen, whether
or not the config declared a `view` group — the root of the permanently
visible RESET FILTERS footer (§3.4). `view` is now optional and exists
only where a config declares it.

The seeding also accepts **number** route params and compares
`String(value)` against the filter keys, which is what makes the
Podcasts screen's `categoryId?: number` reachable at all.

---

## 8 · What was measured, and where

| claim | how |
|---|---|
| the Movies default order is `downloads desc` | the live endpoint, 40 rows per category, 4 categories (2026-11-12) |
| the archive stops at 10,000 rows | page 250 answers, page 251 answers **HTTP 507** (2026-11-12) |
| page 2 broke on one item | the live payload at `docs[28]`, plus the device stack |
| the Movies grid pages past 40 rows | the device, scrolled past 120 rows |
| "You're all caught up" | the device, search `Altersporno` (2 results) |
| "Loading more…" | the device, mid-fetch |
| the sheet's chip row was under the gesture bar | the device screenshot + the a11y frame (0.956–0.991) |
| RESET was unreachable when expanded | the device a11y tree, expanded Podcasts sheet |
| RESET is reachable now | the device, expanded sheet, RESET at 0.910–0.957 |
| pull-to-refresh refetches | the device, the ActivityOrb spinner |
| the scope is a term OR a category | the device, `nasa` → Arts |
| the chip strip is at 16 dp | the device a11y frame, x = 0.039 |

The Movies, Podcasts and Music screens have **no honest Penpot board yet**
(the existing boards are placeholders), so there is no board-vs-device
geometry pass for them in this wave.

---

## 9 · Gates

`pwsh -NoProfile -File '.scratch-figcraft/gates.ps1'` — tsc, eslint,
boundaries, fonts, boards and jest all exit 0.

---

## 10 · Carried forward

Each item below is still open, with its own ID.

- **B9-01** — The Movies "window end" footer line ("Showing N of M movies
  — the archive stops paging here") is reachable only after 250 pages
  (10,000 rows). It is proven by construction and by the measured HTTP
  507, but it has **not** been seen on the device.
- **B9-02** — The Movies grid can surface an adult-titled item from the
  Archive (measured: "1970 Altersporno (Old Age Porn), 1970"). The junk
  filter drops test/template/trailer uploads but has no content policy.
  This is a product decision, not a bug fix.
- **B9-03** — The Movies category queries other than `all` are subject
  tags, and the archive's own order for them is still recency inside a
  category; only the DEFAULT sort is `downloads desc`.
- **B10-01** — The Podcasts sheet's expanded list is **112** chips from
  the live catalog. It works, but it is a wall; a search-within-the-sheet
  would be a new affordance and was not invented.
- **B10-02** — The Podcasts source caps at 100 results per query
  (`MAX_RESULTS_PER_QUERY`); the footer says "You're all caught up" at
  that cap, which is the source's limit rather than the list's.
- **B10-03** — The Podcasts categories are resolved live from the
  Podcast Index; the category list was measured on 2026-11-13 and can
  change under the app.
- **SHELL-01** — The Movies, Podcasts and Music screens still have no
  real Penpot boards, so the board-vs-device geometry pass cannot run
  for them. The remaining ~48 screens are in the same state.
- **B10-04** — The FilterSheet's RESET footer is now the last item of
  the scrollable body, so in the EXPANDED sheet it is one scroll away
  rather than pinned. A pinned footer would need the body to be bounded
  inside the sheet's content view, which true-sheet does not give it.
- **B9-04** — The Internet Archive adapter's multi-valued-field fix
  covers the fields the IA adapter reads. The other nine adapters
  (`src/infrastructure/api/*`) have not been swept for the same shape.
