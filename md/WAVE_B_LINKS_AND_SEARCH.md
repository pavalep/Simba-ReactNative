# Wave B — the app's own facts, and the Search page

**2026-11-12 · branch `f5/w22-close-minimise-d9` · base `5d274e0`**

Two waves under one commit: the links and the copy (items 1–7) and the
Search page (B8). Both came out of the same audit pass, and both ended
with the same rule — **the app must say what is true, and the design must
say what the app draws.**

---

## 1 · The ask

The owner's words, on the device:

> "the search screen UI has unwanted circles etc, and not simple like home
> profile etc, we are going for simplicity, freshness, user friendliness,
> and good code quality, without any jugaads, and no dummy data. so make ui
> similar to home, profile etc,"

> "check the filters also, check its working or not, ui flaws im seeing it
> too below, also same way go through movies, from home page next, check
> content and filters etc, same way podcasts after completion of these two"

So: the Search page first, then **Movies** (B9), then **Podcasts** (B10),
each with the same treatment — the content checked and the filters checked.

Wave B is the Search page. Movies and Podcasts are B9 and B10, and their
audits are already done (the findings are in §7).

---

## 2 · Part one — the app's own facts (items 1–7)

Seven places where the app said something that was not true, or where it
did not work. Nothing here is cosmetic.

### 2.1 The support address — `support@simbaplayer.app` → `support@pavalep.cpm`

The domain `simbaplayer.app` does not exist and never did: the app's
repository is `pavalep/Simba-ReactNative`, the Play Store id is
`com.simba.player`, and the dead domain was still in the Help page, the
About page and the share sheet.

**`src/constants/links.ts` (new)** — one owner for the app's own links:

| constant | value |
|---|---|
| `PROJECT_URL` | the repository |
| `ISSUES_URL` | the repository's issue tracker |
| `PLAY_STORE_URL` | `id=com.simba.player` |
| `SUPPORT_EMAIL` | `support@pavalep.cpm` |
| `supportMailto(subject)` | a `mailto:` with the subject encoded |

The Play Store id is read from `android/app/build.gradle`'s
`applicationId`, so the two cannot drift.

### 2.2 The dead domain is gone — `CF-07`

`support@simbaplayer.app` appeared in three screens. All three now call
`supportMailto(...)`, and the only `simbaplayer.app` left in `src/` is
none — proven by a comment-aware sweep in `__tests__/app/links.test.ts`
(the sweep was proven non-vacuous with a temporary probe file that
deliberately carried the live domain and failed, then deleted).

### 2.3 The deep links did nothing on Android — `CF-01`

`src/navigation/linking.ts` advertised the prefixes `['simbaplayer://',
'https://simbaplayer.app']` — but **the Android manifest registered no
intent filter at all**, and the second prefix named a domain that does not
exist. So `simbaplayer://artist/Eminem` opened the app and then… nothing.

**`android/app/src/main/AndroidManifest.xml`** now carries a
`MainActivity` `VIEW` / `DEFAULT` / `BROWSABLE` intent filter for
`<data android:scheme="simbaplayer" />`, and `launchMode` is `singleTask`
(a warm start must reuse the task, not stack a second copy of the screen).

**Proven on the device:** three cold starts and one warm start of
`simbaplayer://artist/Eminem`; the warm start produced the `singleTask`
message rather than a second copy of the screen.

### 2.4 The Help page's claims were false

The Help page said the app had a **server**, a **cloud backup** and a
**PiP button in the player's top bar**. None of those are true:

* `src/services/authService.ts` has only `configure` / `signIn` /
  `signOut` / `revokeAccess` / `hasPlayServices`. There is no upload and
  no backup.
* The PiP control is in the player's **bottom** bar.

The copy now says what the app does, and the Play Store id, the support
address and the issue tracker are the same constants the rest of the app
uses.

### 2.5 The legal pages carried a gold slab — `PrivacyScreen`, `TermsScreen`

Both pages drew a hard-coded `#D4B47A` slab across the top — a colour
that exists nowhere in `src/theme/tokens.ts`. It is replaced by the app's
own `LinearGradient` inside a `View`, and both pages now use
`SafeAreaView edges={['top']}`.

### 2.6 The downloads sync subscribed once per screen — `CO-08`

`useDownloadsSync()` created a **new** subscription on every mount. With
the Downloads page, the player and the Library all mounted at once, the
store was told three times, and the ref-count was wrong. It is now one
ref-counted singleton subscription, `ensureLoaded()` has a `.catch()`, and
`hydrate()` runs in a try/catch.

### 2.7 The version was `0.0.1`

`package.json` said `0.0.1` while `android/app/build.gradle` said
`versionName "1.1.0"`. `package.json` now says `1.1.0`, and
`__tests__/app/appVersion.test.ts` pins the two together.

---

## 3 · Part two — the Search page

### 3.1 What was wrong, measured on the device

On 2026-11-12 the Search page was put on the emulator and every control
was exercised. The full inventory (D-1 … D-13) is in
`md/SEARCH_PAGE_REDESIGN.md` §2. The three that mattered most:

**The TYPE filter did nothing.** With `Videos` selected (the chip gold, the
FAB badge showing `1`), all eight visible rows were still music tracks —
`Music Soothe`, `Teaser Music`, `Baby Music`, `Trap No Copyright Music`,
`Free Music`, `Free Music Happy`, `n0mix#010`, `AIR (Extended Mix)`. The
filter was applied to `allResults` — the **local** results — while the
remote results were handed to the renderer raw
(`SearchScreen.tsx:259-283` vs `:601-606`).

**The SORT control did nothing.** `Name` selected, badge `2`, and the
order was byte-identical — the same cause.

**Two of the eight sources could never return anything.** The `Podcasts`
and `Radio` chips led to hard-coded empty arrays
(`useAggregatedSearch.ts:133-134`): the Podcast Index adapter needs SHA1
auth and Radio Browser needs a name-based query, and neither is built.

### 3.2 What the page is now

The design is in `md/SEARCH_PAGE_REDESIGN.md` §3. In short:

* **One header grammar** (`InternalHeader`), **one gutter** (16 dp), **one
  title grammar** (the gold Cormorant divider), **one row**
  (`SearchResultRow` — the Profile page's `SettingsRow` anatomy).
* **No cards, no discs, no chips.** Every result is an unboxed,
  hairline-separated row; the source scope is a **text** row with a gold
  underline (the Library's own segment grammar, lifted into
  `src/components/utility/SegmentRow/SegmentRow.tsx`).
* **The filters reach everything.** The scope, the media-kind filter and
  the sort are applied by two pure functions
  (`src/screens/Search/utils/searchFilters.ts`) to the local results **and**
  the remote ones.
* **"Date" is gone** from the sort — only the recent-history entries carry
  a date, so it was a control that did nothing.
* **The page does not autofocus.** It is a browse page first: the recent
  searches and the trending are real content.
* **The TV source really searches** now
  (`searchIPTVChannels(debouncedQuery, {limit: 6})`); before, the Live TV
  catalogue was drawn from its first six channels regardless of the query.

### 3.3 The files

**New**

| file | what it is |
|---|---|
| `src/screens/Search/utils/searchFilters.ts` | the pure filter core: `REMOTE_SOURCES`, `SCOPE_SOURCES`, `SEARCH_SCOPES`, `applyRemoteFilters`, `applyLocalFilters`, `countRemoteResults` |
| `src/screens/Search/components/SearchResultRow.tsx` | THE one row |
| `src/components/utility/SegmentRow/SegmentRow.tsx` | the source-scope row, promoted out of the Library |
| `src/constants/links.ts` | the app's own links |
| `__tests__/app/links.test.ts` | 9 tests: the Play Store id, the support address, the mailto encoding, and a comment-aware sweep proving no dead domain survives |
| `__tests__/app/searchFilters.test.ts` | the scope/kind/sort reaching **both** result sets, and the dead options staying dead |
| `__tests__/screens/Search/SearchResultRow.test.tsx` | the old `ResultTile`'s thumbnail-URI contract, retargeted to the new row |
| `md/SEARCH_PAGE_REDESIGN.md` | the spec |

**Rewritten**: `SearchScreen.tsx`, `SearchResults.tsx`,
`RemoteResults.tsx`, `RecentSearches.tsx`, `HighlightedText.tsx`.

**Changed**: `src/hooks/useSearch.ts` (a typed `SearchResultRoute`),
`useAggregatedSearch.ts` (the TV query), `FilterChips.tsx` (the inactive
chip is themed app-wide), `SearchBar.tsx` (the focus ring is
`border.emphasis`, never gold), `DownloadButton.tsx` (a new
`variant="bare"`), `SubsectionTitle.tsx` (an optional action slot).

**Deleted**: `ResultListRow.tsx`, `ResultTile.tsx`,
`FilterAndSortControls.tsx`, `SourceFilterChips.tsx`,
`__tests__/screens/Search/ResultTile.test.tsx` — all with zero inbound
references.

### 3.4 The device proof

| what | result |
|---|---|
| the empty state | the header, a calm field (no gold ring, no autofocus), the hint line, the gold Cormorant "Trending now" divider, unboxed full-bleed hairline rows with 40 dp artwork — **no cards, no discs** |
| the results state | the scope row (All/Local/Music/TV/Audiobooks/Archive — **no Podcasts, no Radio**), full-bleed rows with a **bare** download glyph, the FAB |
| **the TYPE filter now works** | `Videos` selected on the query `music` → every music row disappears and the page says `No results for "music"`, with the FAB badge at `1` and `Videos` the checked radio. **Before the fix, the same tap changed nothing.** |
| the scope row | six items, `All` gold and underlined, the others in `text.secondary` |

---

## 4 · The board-vs-device check

The Penpot boards are the app's design, and a design that does not match
the app is a second, lying design. So the Search boards were read back
out of Penpot (`execute_code`, plain data only) and compared with the
device's own accessibility frames.

**The two coordinate systems.** A Penpot board is 1 unit = 1 dp, and the
board's own origin is the screen's top. The device is 1080 × 2400 px at
2.625 px/dp, and the app applies `paddingTop: insets.top` itself, so the
device's frame is already the app's own layout coordinate. The board's
32 dp status band (`kit.js`'s `INSETS_TOP`) is the design's assumption; the
emulator's real status bar is 24 dp — a device constant, not a layout
difference, and it applies to every board in the file, not only this one.

### 4.1 What the first check found

Nine real mismatches, all of them invisible to `check-grid.js` (which
counts overlaps) and to the build (which reports what it drew, not what
the canvas kept):

| # | what | board | device | Δ |
|---|---|---|---|---|
| 1 | the FAB on the empty board | drawn | **absent** — the app's `Fab` is `visible={hasQuery}` and renders `null` | a whole gold disc |
| 2 | the recent rows' leading | no glyph | the app's gold `history` glyph in a 40 dp slot | 52 dp of text offset |
| 3 | the text column on a glyph row | 46 dp | **68 dp** (16 + the 40 dp slot + 12) | 22 dp |
| 4 | the recent row's height | 57 dp | 64 dp | 7 dp, compounding |
| 5 | the group divider's margin | `8 + 12` | `8` — the `SubsectionTitle`'s own `marginTop` | 12 dp per group |
| 6 | the scope row's item padding | 12 dp | **8 dp** (`spacing.sm`) | growing to 42 dp across the six items |
| 7 | the scope row's top | the field's bottom | the field's bottom **+ 12** (the field slot's own bottom padding) | 12 dp |
| 8 | the filter sheet's chips | every pill **28 dp wide** | the label's own width + 27 | the labels ran out of the pills |
| 9 | the divider with an action | the label at 226 dp | the label at **124.3 dp** | 102 dp |

Two of these had the same root cause, and it was not in the Search board.

### 4.2 The root cause of #8 — and of every board in the file

Penpot reports a text run's width as **1** until the canvas has laid it
out. A width taken on the first read is the placeholder plus the padding —
and it **sticks**.

Measured on a test board (2026-11-12): a text run reported `1` after the
first layout wait and its real width (`14` dp for "All" at Inter 13) only
after a later one. The builder's `lateWidths` pass read that `1`, so the
Search page's scope underline came out 25 dp wide instead of the label's
16 + its 16, and the filter sheet's five chips came out 28 dp wide — all
five the same width, because the label's width was the same placeholder.

The same bug was in the **inline** form (`{text, min, extra}`), which
every generator used: the Home board's genre chips and count badges were
sized from a placeholder too.

**The fix** (`designs/build-penpot-app.js`):

1. **Every** width that follows a text is now a late width — the inline
   form and the explicit `measured` form are the same path.
2. The late pass is a **loop**: settle, read, resize — until the text's
   width stops moving. A reading of `1` means "not measured yet", and such
   a pass is skipped rather than baked in. If the canvas never measures a
   text, the build **reports it** instead of pretending it did.

### 4.3 The divider with an action — a flex row, not a centred one

`SubsectionTitle` with an action is one row:

```
[rule flex:1][label wrap 20|label|20][rule flex:1][action 12|text]
```

The two rules are `flex: 1` and share what is left, so the label sits to
the **left** of the centre, not on it. Measured on the device: the label's
text runs 124.3 → 224.3 dp, the action's text 344.5 → 395.5 dp, and the
two rules are 88.3 and 88.2 dp — equal, as `flex: 1` makes them.

`designs/penpot/profile.js`'s `dividerAction` now lays the row out that
way. The rule's width is the **remainder** of the container, split between
the two rules — which the builder resolves after the texts are measured.
The Stats board's "Browse Library" divider uses the same helper and moves
with it (see §7).

### 4.4 The result

Every element of the Search board now sits where the app draws it:

| element | board | device | Δ |
|---|---|---|---|
| the back button | 12 | 12.6 | 0.6 |
| the header's hairline | 59 | 60 | 1 |
| the field's box | 76 | 76 | 0 |
| the hint's first line | 132 | 133.3 | 1.3 |
| the "Recent searches" label | 200 | 201.8 | 1.8 |
| the "Clear all" action's text | 345 | 344.5 | 0.5 |
| the first recent row's top | 236 | 237.5 | 1.5 |
| the scope row's first label | 24 | 24 | 0 |
| the scope row's second label | 60 | 60.3 | 0.3 |
| a result row's text column | 68 | 68 | 0 |
| the filter sheet's top edge | 689 | 690.1 | 1.1 |
| the "TYPE" title | 729 | 730.3 | 1.3 |
| the first chip row | 761 | 762.3 | 1.3 |
| the "SORT BY" title | 818 | 818.1 | 0.1 |
| the second chip row | 850 | 850.1 | 0.1 |

The check covers **37 measurements**; **36 of them are inside the ±2 dp
band**. The one outside it is the FAB's top: the board states the house's
24 dp bottom inset (the Home board states the same), while this emulator
has a 48 dp navigation bar, so the app's FAB sits 24 dp higher here. That
is a **device constant**, not a layout difference — the board cannot know
the device's inset.

The board-vs-device check was run on the **dark** theme, which is the
theme the emulator is in; the two boards differ only in colour.

---

## 5 · Two app-side changes the boards forced

### 5.1 The filter sheet's weights — `FilterSheet.tsx`

The sheet's group heading used `fontWeight: '600'` and its chip labels
`fontWeight: '700' | '500'`, all on the family `Inter`. Android resolves
`Inter` + a weight below 700 to `fonts/Inter.ttf` — **Regular** — so the
SemiBold face was unreachable and every chip label was drawn in Regular.
The only difference between a selected chip and an unselected one was the
fill.

The weight now lives in the family key (`FONT_FAMILY.inter.semibold` /
`FONT_FAMILY.inter.medium`), which is the app's own rule. **Verified on
the device**: the "TYPE" heading and the selected chip's label are now
visibly SemiBold.

This is an app-wide change (every browse screen opens this sheet) — see
§7, B9-6.

### 5.2 Jamendo's escaped names — `jamendo/adapter.ts`

The Search results showed `Besson&amp;sa`. Jamendo escapes the characters
that are not legal in its payload, and the adapter passed the escaped
string straight through. The **adapter** now decodes the entities in the
track, artist, album and genre fields — the wire shape is the adapter's
business, and nothing above it should ever see an entity.

---

## 6 · The gates

```
tsc          0 errors
eslint       0 problems
boundaries   0 violations
fonts        0 violations
boards       0 overlaps (68 boards)
jest         0 failures
```

---

## 7 · Carried forward

Every one of these is a **sub-task with its own id**, not a paragraph.

### From this wave (B8)

The ids below are the ones owned by `md/SEARCH_PAGE_REDESIGN.md` §6 — that
document is the single owner of the Search page's carried-forward list.

| id | what | where |
|---|---|---|
| **B8-1** | the Library's own segment row is **not** migrated onto the new shared `SegmentRow` — the grammar lives in two places until it is | `features/library/presentation/components/LibraryScreenContent.tsx` |
| **B8-2** | the Podcast Index and Radio Browser adapters are not built, so the two removed sources cannot come back until they are | `src/infrastructure/api/` |
| **B8-3** | the Internet Archive rows have no artwork for most items, so they fall back to the gold glyph | `RemoteResults.tsx` |
| **B8-4** | the IPTV adapter's `searchIPTVChannels` ignores its own `limit` on the result — the Search page slices its own six, the adapter is unchanged | `src/infrastructure/api/iptv/adapter.ts` |
| **B8-5** | the download affordance is a bare icon on the Search rows and a 40 dp disc everywhere else | `DownloadButton.tsx` |
| **B8-6** | the font gate's **426-tag blind spot** and the **iOS URL scheme** (`CFBundleURLTypes` is not registered) are untouched by this wave | the gates script · `ios/SimbaPlayer/Info.plist` |
| **B8-7** | the Movies and Podcasts pages are waves B9 and B10 — audited, not started | §7 below |
| **B8-8** | the Stats board's "Browse Library" divider moved with `dividerAction`'s new flex layout — the Stats screen has **not** been checked against the device | the Stats screen |
| **B8-9** | `FilterChips`' white-pill contract changed **app-wide** in this wave — it affects 8 screens and they have not had their visual check | the browse screens |
| **B8-10** | `SearchBar`'s focus ring changed **app-wide** in this wave (`accent.gold` → `border.emphasis`) — the same 8 screens carry it | the browse screens |
| **B8-11** | the remaining ~48 screens have **no** board-vs-device pass — the Search page is the first | the board set |
| **B8-12** | the Jamendo adapter now decodes the HTML entities in its text fields; the other adapters were checked for the same shape and only Jamendo escapes | `jamendo/adapter.ts` |

### The Movies page (B9) — audited, not started

| id | what |
|---|---|
| **B9-1** | the `view` (Grid/List) group is drawn, stored and has **zero** consumers — the grid is hard-coded `numColumns={2}` |
| **B9-2** | `state.view` defaults to `'grid'`, so `hasActive` is always true and the **RESET FILTERS footer is permanently visible** |
| **B9-3** | the Category group has no `collapsedRowLimit` — all **20** chips are expanded |
| **B9-4** | the 20 category icons were dropped: the sheet's rows carry no icon |
| **B9-5** | **five** different left gutters (grid 0, header 8, search 12, chip strip 24 = 12+12, sheet 16) |
| **B9-6** | `fontWeight` 500/600 on the family `Inter` renders **REGULAR** (the movie meta, the `FilterSheet` group title, the `FilterSheet` unselected chip, `FilterChips`' text) — `FilterSheet` is fixed in B8; the other three are not |
| **B9-7** | the "caught up" footer is **unreachable**: `numFound` is 30,884 and the list stops silently at 500 (`FULL_LIMIT`) |
| **B9-8** | the footer's loading branch is dead (`isLoadingMore: false`) |
| **B9-9** | three dead sort mappings (`oldest`, `za`, `rating`) |
| **B9-10** | A–Z leads with hashtag spam |
| **B9-11** | only category #1's cover is used as the placeholder |
| **B9-12** | the cache key sorts the ids but the query does not |
| **B9-13** | the Movies chip strip shows only **ACTIVE** filters, so the white pill is unreachable there |
| **B9-14** | **three** `BrowseLayout` copies exist (Music ≡ Movies; Podcasts differs by one effect) — the fix must reach all three or it will not reach the siblings |

### The Podcasts page (B10) — audited, not started

| id | what |
|---|---|
| **B10-1** | pull-to-refresh does nothing — `onRefresh` calls `setActiveCategoryId(categoryId)` with the same value, so nothing refetches (`retry()` exists and is wired to the error button) |
| **B10-2** | a search auto-clears the Category filter, and because `currentFilterCount` is a dependency, picking a category **while searching** re-wipes it — the filter can never be used while searching |
| **B10-3** | `view: ['grid']` is injected into the sheet's value, so the **RESET FILTERS footer is permanently visible** |
| **B10-4** | `fontWeight` 500/600 → REGULAR (the podcast row's title, the `FilterSheet` group heading, the `FilterSheet` chip label) |
| **B10-5** | the gutters disagree (header 8, search 12, chip strip 24, row 12, thumb 20, sheet 16) and a comment says 16 while the code uses 12 |
| **B10-6** | no nested virtualisation |
| **B10-7** | no `collapsedRowLimit` on the Category group |
| **B10-8** | the route-param seeding is unreachable (`categoryId?: number` against string filter keys; no caller) |
| **B10-9** | the `!hasLoaded && isLoading` branch drops the `FlatList`, and `onEndReached` is gated on a user drag |

### Closed in this wave

| id | why |
|---|---|
| **CF-01** | the Android deep link is fixed and **proven on the device** (3 cold + 1 warm) |
| **CF-07** | the dead domain's prefix is removed |
| **CF-13** | `support@simbaplayer.app` → `support@pavalep.cpm` |
| **CF-22** | the constant **+24 dp** status-bar offset — the emulator's real status bar is 24 dp, and the app applies `insets.top` itself, so the device's frame **is** the app's layout coordinate |
| **CO-08** | `useDownloadsSync()` is one ref-counted singleton |

### Still open from earlier waves

| id | what |
|---|---|
| **CF-03 / CF-04** | addressed by the `InternalHeader` change — to be verified and closed |
| **CF-12** | `preferredLanguages` defaults to `'eng, jpn, und'` |
| **CF-21** | `Avatar`'s no-initials fallback draws a music note |
| **CO-05** | the privacy chain Profile → About Simba → Privacy policy |
| **CO-06** | the Profile's quiet space |
| **CO-07** | the Downloads page owns the auto-delete preference |

### The R waves, unchanged

| id | what |
|---|---|
| **R3-1** | the Bookmarks' destructive "N saved" chip → a plain label and a named "Clear all" |
| **R3-2** | finished Downloads are playable with Play |
| **R3-3** | the Library's "Playlists" mode and create FAB are removed; the title dropdown → All Playlists |
| **R3-4** | the History's dead pull-to-refresh is removed |
| **R4** | Stats untouched |
| **R5-1** | 68 dead runtime exports |
| **R5-2** | the 8 store-key deletions per D-B |
| **R5-3** | the unused Bookmarks `textContent` strings |
| **R6** | re-enable `@typescript-eslint/no-unused-vars` |

### The standing backlog, unchanged

F-10 · F-13 · F-15 · F-17 (the native plain "Simba" vs the Login's script
"Simba") · the 75-site weight-intent sweep · the un-measured device proofs
(empty library / "first run", the pinned playlist, a bookmark, the
long-press menu) · the Penpot Play hand walk · B-050 (the PiP chrome) ·
F-065 ×2 and F-066 (the seeded-data proofs) · the 2026-11-03 native crash ·
`graphify-out/` · the API 24–30 PiP path · NO-JANK · B-018 · the v7 doc
rename banners · the iOS verification · the dark-theme variants for the
remaining screens · the optional `Allura.ttf` upload ·
`md/HOME_V2_REFACTOR.md` §16's item.

---

## 8 · What is NOT in this commit

* `UI.figcraft` — never committed.
* The Movies and Podcasts pages — B9 and B10. Their audits are above; their
  code is not written.
