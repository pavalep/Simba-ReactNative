# SEARCH_PAGE_REDESIGN — the Search page, on the Home/Profile grammar

**Date:** 2026-11-12 (rewritten the same day — the first draft described a page the owner rejected on screen)
**Branch:** `f5/w22-close-minimise-d9`
**Scope:** the Search page (`src/screens/Search/`), the four shared components it touched (`SearchBar`, `FilterChips`, `DownloadButton`, `SubsectionTitle`), and the `Search / light` + `Search / dark` boards in the prototype.

> **History.** The first version of this document described the redesign the owner rejected. He had it on the device and wrote: *"the search screen UI has unwanted circles etc, and not simple like home profile etc, we are going for simplicity, freshnes, user freindliness, and good code quality, without any jugaads, and no dummy datas. so make ui similar to home ,proile etc"*. The **structure** of that first draft (a browse page in the app's own `BrowseLayout` shape, one 16 dp gutter, the filter sheet instead of two rows of chips, the dead `recent` group removed) was kept. **The visual treatment was thrown away**: it was white pill chips, gold-outlined pill fields, rounded row cards, circular download and play controls, and a 20 px Inter title above a gold 18 px Cormorant divider — four title/row grammars on one page. This document is the second version, and it is the one the boards and the code are built from.

---

## 1. The ask

Two owner messages, in order:

> "after this form home page there is a search page, which looks **fancy, but is not the design we are following**, also it looks **congsuted, and tedius to use**, create the penpot ui for search page for without and with search text, etc, any other conditions"

> "the search screen UI has **unwanted circles** etc, and **not simple like home profile** etc, we are going for **simplicity, freshnes, user freindliness, and good code quality**, without any jugaads, and **no dummy datas**. so make ui similar to home, proile etc"

And a third instruction, on the same screen:

> "**check the filters also, check its working or not**, ui flaws im seeing it too below, also same way go through **movies**, from home page next, check content and filters etc, same way **podcasts** after completion of these two"

So this is three waves, not one:

| Wave | Page | Status |
|---|---|---|
| **B8** | Search | this document |
| **B9** | Movies (from Home → Browse All) | audited, queued |
| **B10** | Podcasts | audited, queued |

### 1.1 What "similar to Home, Profile" means in this codebase

It is not a mood. It is two page grammars that already exist, measured:

**Home** (`src/screens/Home/index.tsx`)
- `HomeHeader` — the wordmark, a search icon, an avatar. No title bar.
- The greeting, **unboxed** — no card, no container.
- `SubsectionTitle variant="displaySerif"` — the gold Cormorant italic 18/24 divider with `goldGlow` rules: "Your Library", "Discover".
- `SectionHeader variant="plain"` — Inter SemiBold 20/28, the rail title with a "See All" action.
- Media as **poster cards** in horizontal rails (`MediaRailCard`: 160×138, 12 radius, 90 dp artwork).
- **One** gold FAB disc.

**Profile / About** (`src/screens/Profile/components/ProfileScreen.tsx`)
- `InternalHeader` — a 36 dp back circle and a centred Manrope SemiBold 22/28 title.
- The same gold Cormorant divider between the groups.
- **Unboxed, full-bleed rows** (`SettingsRow`): 16 dp gutter, a hairline under the row, `body2` label, `caption` description, an optional 18 dp **gold** leading glyph, an optional 14 dp chevron.
- **No cards. No discs. No chips.**

The Search page is a list of results, so the Profile's row grammar is the one that fits it. The gold divider is the one that fits its titles. That is the whole design.

---

## 2. What is wrong on the screen today — measured

Everything below was measured on the source and confirmed on the device (`emulator-5554`, 2026-11-12, 1080×2400, 2.625 px/dp).

### 2.1 The filters do not work — proven on the device

The page holds two sets of results: the **local** ones (the device's own library) and the **remote** ones (five free APIs). The filter sheet's controls are applied to the local set only:

```ts
// SearchScreen.tsx:259 — the filter and the sort read `allResults` (local)
const filteredResults = useMemo(() => { let results = allResults; … }, [allResults, activeFilter, activeSort]);
// SearchScreen.tsx:601 — the remote results get the RAW arrays
<RemoteResults results={remoteResults} isLoading={remoteLoading} source={activeSource} handlers={remoteHandlers} />
```

`RemoteResults` receives no filter and no sort. On a query whose results come from the APIs — which is most queries, because the local library is small — **the sheet does nothing at all**.

**Device proof #1 — TYPE.** Query `music`, sheet open, `Videos` tapped. The chip turned gold, the FAB badge counted `1`, and every visible row was still a music track (`Music Soothe`, `Teaser Music`, `Baby Music`, `Trap No Copyright Music`, `Free Music`, `Free Music Happy`, `n0mix#010`, `AIR (Extended Mix)`). Not one row changed.

**Device proof #2 — SORT BY.** `Name` tapped on top of that. The chip turned gold, the badge counted `2`, and the order was **byte-identical** to the order before. Alphabetical, `AIR (Extended Mix)` would be first.

**Device proof #3 — the dead source.** `Podcasts` tapped → *"No results found"*. Its adapter is not built: `podcasts: []` and `radioStations: []` are hard-coded (`useAggregatedSearch.ts:133-134`) because Podcast Index needs SHA1 auth and Radio Browser needs a name-based query. **Two of the eight source chips can never return anything.**

### 2.2 The other measured defects

| # | Defect | Evidence |
|---|---|---|
| D-1 | **The inactive chip is hard-coded white.** `FilterChips` paints an inactive chip `#FFFFFF` with `rgba(0, 0, 0, 0.08)` and `#1A1A1A` — **literal values, not theme tokens** (`FilterChips.tsx:118-119`), so it is a white pill on the dark theme too. Eight of them, in a row. | source + screenshot |
| D-2 | **TYPE and SORT reach only the local results.** | `SearchScreen.tsx:259-283` vs `:601-606`; device proof #1/#2 |
| D-3 | **"Date" can only order one of seven local sources.** `lastPlayedAt` is set on the recent-history entries alone (`useSearch.ts:246`); the media-store tracks (`:167-176`), artists, albums, playlists, queue entries and folders carry none, and no remote result carries one. Everywhere else it was a no-op. | source |
| D-4 | **The TV source ignored the query.** `getAllIPTVChannels({limit: 6})` (`useAggregatedSearch.ts:101`) returns the **first six channels of the whole IPTV-org list**, whatever was typed. The comment at `:96-100` says "the consumer filters by `debouncedQuery` at the render layer" — no consumer does. The adapter that does exactly that already exists and was unused: `searchIPTVChannels` (`iptv/adapter.ts:201`). | source |
| D-5 | **Two of the eight source chips are dead** (`Podcasts`, `Radio`). | `useAggregatedSearch.ts:133-134`; device proof #3 |
| D-6 | **The result rows are cards.** `MediaRow` (`RemoteResults.tsx:65-93`) is `background.elevated`, 12 radius, a hairline, 14 dp padding, 8 dp below the row — the `StreamingRow` card. `ResultListRow` is a second card with different numbers (`:62-77`). | source |
| D-7 | **Every row carries a circle.** The trailing control is a 32 dp gold disc (`borderRadius: 16`) or the `DownloadButton`, which is a **40 dp disc** (`borderRadius: 20`, `background.elevated` + hairline). | source + screenshot |
| D-8 | **The videos/audio results are a 2-column poster grid** (`ResultTile`), a browse-shelf pattern, on a page whose every other result is a list. | source |
| D-9 | **Two title grammars.** "Recent searches" is `SectionHeader variant="plain"` (Inter SemiBold **20/28**, `SectionHeader.tsx:189`); every other title on the page is the gold Cormorant **18/24** divider. | source + screenshot |
| D-10 | **The field opens as a gold-outlined capsule.** `SearchBar` is `radius.pill` (9999) and its border turns `accent.gold` on focus (`SearchBar.tsx:151, 105`); the page passes `autoFocus` (`SearchScreen.tsx:539`), so the ring is on before the user touches anything. | source |
| D-11 | **The no-results state is a gold disc.** `EmptyState` draws its icon in a circle (`borderRadius: discSize / 2`, `EmptyState.tsx:65-67`). | source + screenshot |
| D-12 | **The chip row is told to allow multiple selection** — `singleSelect={false}` (`SearchScreen.tsx:551`) — while the page holds a single `activeSource` value. | source |
| D-13 | **The query took 750 ms**: 300 ms in `useSearch` + 450 ms in `useAggregatedSearch`. *(Fixed in the first draft: the aggregator's debounce is 0 now. Kept.)* | source |

---

## 3. The design

### 3.1 The page

```
┌──────────────────────────────────────────────┐
│ (←)                 Search                   │  InternalHeader — 36 dp back circle,
├──────────────────────────────────────────────┤  Manrope SemiBold 22/28 title, hairline
│  ┌────────────────────────────────────────┐  │
│  │ ⌕  Search your library, music, live TV… │  │  the field: 16 dp gutter, height 44,
│  └────────────────────────────────────────┘  │  radius.pill (the app's own field),
│  Search your library, music, live TV, …      │  bg background.elevated, border subtle →
│                                              │  emphasis on focus (never gold)
│   All   Local   Music   TV   Audiobooks      │  the source scope: text only, no chip,
│   ━━━━  Archive                              │  gold 2 dp underline on the active one
│                                              │
│  ───────── Recent searches ───────── Clear all│  SubsectionTitle displaySerif + action
│  music                                       │  unboxed hairline rows, Inter 15
│  ───────────────────────────────────────────  │
│                                              │
│  ───────── Trending now ─────────            │  SubsectionTitle displaySerif
│  ▢  Free Music Happy          StimiBeats     │  the row: 40 dp art, body2 + caption,
│  ───────────────────────────────────────────  │  no card, no disc
│                                              │
│  ───────── Music ─────────                   │  one divider per result group
│  ▢  Music Soothe - Meditation   StimiBeats  │
│  ───────────────────────────────────────────  │
│                                        ( ⚙ ) │  the app's one FAB → the filter sheet
└──────────────────────────────────────────────┘
```

### 3.2 The row — one row, for every result on the page

The Profile's `SettingsRow` anatomy, with artwork where a result has some.

| Part | Value | From |
|---|---|---|
| container | full-bleed, `paddingHorizontal 16`, `paddingVertical 12`, `minHeight 56`, `borderBottomWidth: hairline`, `borderBottomColor: border.subtle` | `SettingsRow` |
| leading | a **40 dp slot**: **40×40 artwork, `borderRadius 8`** when the result has art; otherwise an **18 dp gold glyph** (`accent.gold`) centred in that slot | `SettingsRow`'s gold glyph; `MediaRailCard`'s 12 radius |
| text column | starts at **68 dp** — 16 (the gutter) + 40 (the slot) + 12 (the margin). The slot is 40 dp whether it holds artwork or a glyph, so the column starts on the same left edge either way | `SearchResultRow` |
| title | `AppText variant="body2"` — Inter 400 **15/22**, `text.primary`, 1 line | `SettingsRow` |
| subtitle | `AppText variant="caption"` — Inter 400 **13/18**, `text.tertiary`, 1 line | `SettingsRow` |
| trailing | **chevronRight 14 `text.tertiary`** when the row navigates; a **bare download glyph 20 `text.secondary`** when the row can be downloaded; **nothing** when the row plays | `SettingsRow`'s chevron |

**No card. No border box. No elevated background. No circle.**

The download control loses its disc: `DownloadButton` gains a `variant="bare"` (no background, no border, no 40 dp disc) and the Search rows use it. The disc stays the default for every other caller.

### 3.3 The source scope — a segment row, not eight chips

The app already has this grammar on the **Library** page: a horizontal row of text items with a **2 dp gold underline** on the active one and `accent.gold` for its label (`features/library/presentation/components/LibraryScreenContent.tsx:293-311`, styles `:140-152`). The Search page adopts it, minus the per-item icons (six items with icons will not fit in 411 dp).

It is promoted to a shared component, `src/components/utility/SegmentRow/SegmentRow.tsx`, with an optional icon, so the grammar has one owner. The Library's own row is **not** migrated in this wave — carried forward as **B8-1** (§6).

| Part | Value |
|---|---|
| item | `paddingVertical 10`, `paddingHorizontal 8`, `borderBottomWidth 2`, `borderBottomColor: transparent` → `accent.gold` when active |
| label | `AppText variant="caption"` (Inter 400 13/18) with the family override `FONT_FAMILY.inter.medium`; colour `text.secondary` → `accent.gold` when active |
| rail | horizontal `FlatList`, `paddingHorizontal 16`, `contentContainerStyle.gap 4` |

The item's own padding is **8**, and the gap between two items is 8 + 8 + 4 = **20** — so the first label's text starts at 24 dp and the second at 60. Measured on the device, 2026-11-12.

**The six live sources** — `All`, `Local`, `Music`, `TV`, `Audiobooks`, `Archive`. `Podcasts` and `Radio` are **removed**: their adapters are not built, so they could only ever draw an empty page.

The scope row is part of the **results** state: it appears with the results and disappears when the query is cleared, at which point the scope resets to `All`. It is never a hidden state.

### 3.4 The filter sheet — the app's own, and it now reaches everything

`FilterSheet` (`components/sheets/FilterSheet/FilterSheet.tsx`) opened from the app's one `Fab` with the `sliders` glyph — the same affordance the browse screens use. Its chips are already dark and quiet (`background.primary` + `border.subtle`, gold when selected), so **the sheet is not the problem; the wiring is.**

| Group | Options | What it now does |
|---|---|---|
| **TYPE** | All · Videos · Audio | Applied to **both** sets. `videos` → the local `videos` group + the IPTV channels. `audio` → the local `audio` group + music (Jamendo, Audius), audiobooks and the Internet Archive. The entity groups (artists, albums, playlists, folders) are hidden under both, because they are neither. |
| **SORT BY** | Relevance · Name | Applied to **both** sets. `Relevance` → the local `relevanceScore` (descending) and the API's own order for the remote set. `Name` → the title A→Z, for both. |

**"Date" is removed.** It was D-3: only the recent-history entries carry a date, so on every other result it was a control that did nothing. A control that cannot work is not a control.

### 3.5 The field

`SearchBar` keeps the app's capsule shape (it is shared by eight browse screens; a second field shape would be a second grammar). Two changes:

1. **The focus ring is not gold.** The border goes `border.subtle` → `border.emphasis` on focus (`rgba(255,255,255,0.06)` → `rgba(255,255,255,0.12)` dark). The search glyph still turns gold — that is the focus cue, and it is inside the field, not around it.
2. **The page does not autofocus.** The Search page is a browse page first — recent searches and trending are real content — and the page opens on them, calm.

### 3.6 The empty state

- The **hint** under the field is one caption line, and it is **true**: *"Search your library, music, live TV, audiobooks and the Internet Archive"*. The old copy ("tracks, artists, albums, playlists, and linked folders") described less than half of what the page searches.
- **Recent searches** are unboxed rows with a hairline, the same grammar as every other row, each with the app's own gold **history** glyph in the row's 40 dp leading slot. The section title is the gold divider, and it gains an optional action slot for **"Clear all"** (a named action, not a destructive chip).
- **Trending now** is the gold divider + the same row.
- **No results** is ONE quiet caption line — the app's own copy for the scope ("No music matches"), with the query in quotes. There is **no** divider above it: the app draws the caption on its own (`SearchScreen.tsx:562`), and a gold rule there would be a second title grammar the app does not have. The `EmptyState` disc (D-11) is not drawn on this page either.
- **There is no filter button until there is a query.** The app's `Fab` is `visible={hasQuery}` and renders nothing at all without one — the sheet has nothing to filter.

---

## 4. The files

### New
| File | What it is |
|---|---|
| `src/components/utility/SegmentRow/SegmentRow.tsx` | the source scope row — the Library's segment grammar, promoted to a shared owner, with an optional icon |
| `src/screens/Search/components/SearchResultRow.tsx` | **the one row** — artwork or gold glyph, title, subtitle, chevron / bare download / nothing |
| `__tests__/app/searchFilters.test.ts` | the filter wiring: TYPE reaches the remote set, SORT reaches the remote set, "Date" is gone, the dead sources are gone |

### Changed
| File | What changes |
|---|---|
| `src/screens/Search/components/SearchScreen.tsx` | rewritten: one gutter, one header, the scope row, the rows, the sheet. The `recent` group, the error block and the grid are gone. |
| `src/screens/Search/components/RecentSearches.tsx` | rewritten: gold divider + unboxed rows + "Clear all" |
| `src/screens/Search/components/RemoteResults.tsx` | rewritten: the remote groups draw `SearchResultRow`; the `MediaRow` card and its 32 dp gold disc are gone |
| `src/screens/Search/components/SearchResults.tsx` | the grid is gone; every group draws rows |
| `src/screens/Search/hooks/useAggregatedSearch.ts` | the IPTV query uses `searchIPTVChannels(query)` instead of `getAllIPTVChannels({limit: 6})` (D-4) |
| `src/components/core/SearchBar/SearchBar.tsx` | the focus border is `border.emphasis`, not gold (app-wide) |
| `src/components/core/DownloadButton/DownloadButton.tsx` | a `variant="bare"` — the icon without the 40 dp disc |
| `src/components/utility/SubsectionTitle/SubsectionTitle.tsx` | an optional action slot (`actionLabel` + `onAction`) for "Clear all" |
| `src/components/utility/FilterChips/FilterChips.tsx` | the inactive chip stops being a hard-coded white pill (D-1) — **this one is app-wide**, see §5 |
| `designs/penpot/search.js` | the boards |
| `designs/build-penpot-app.js` | the boards registered; the `Search / light` placeholder removed |

### Deleted
| File | Why |
|---|---|
| `src/screens/Search/components/ResultListRow.tsx` | the second card grammar (§2.2 D-6) |
| `src/screens/Search/components/ResultTile.tsx` | the poster grid on a results page (D-8) |

(`SourceFilterChips.tsx` and `FilterAndSortControls.tsx` were already deleted in the first draft.)

---

## 5. The one app-wide change: `FilterChips`

The inactive chip is `#FFFFFF` / `rgba(0,0,0,0.08)` / `#1A1A1C` — **literal values, not tokens** (`FilterChips.tsx:118-119`). It is white in the dark theme, and it is white on the eight screens that use it.

The fix is one owner: the inactive chip becomes `background.elevated` + `border.subtle` + `text.secondary`, the active chip stays `accent.gold` + `text.inverse`. The **shape** does not change — the chip row is still the app's one chip row — but it stops shouting.

This is app-wide on purpose: the owner asked for the same treatment on Movies and then Podcasts, and both carry the same chip row. Fixing it on the Search page alone would have produced a third grammar.

---

## 6. What this does not fix — carried forward

| ID | Item |
|---|---|
| B8-1 | The **Library's** segment row is not migrated onto the new shared `SegmentRow`. The grammar is now in two places (the Library's own styles and the shared component). |
| B8-2 | The **Podcast Index** and **Radio Browser** adapters are not built, so the two sources that were removed cannot come back until they are. |
| B8-3 | The **Internet Archive** rows have no artwork for most items, so they fall back to the gold glyph. |
| B8-4 | The **IPTV** adapter's `searchIPTVChannels` ignores its own `limit` on the **result** (it filters the first 500 channels and returns every match). The Search page slices its own six; the adapter is unchanged, so the Live TV screen's behaviour is unchanged. |
| B8-5 | The **download affordance** is a bare icon on the Search rows and a 40 dp disc everywhere else. |
| B8-6 | The **font gate's 426-tag blind spot** and the **iOS URL scheme** are untouched by this wave. |
| B8-7 | The **Movies** and **Podcasts** pages are waves **B9** and **B10**; their audits are already done and their fixes are not in this document. |
| B8-8 | The **Stats board's** "Browse Library" divider moved when `dividerAction` was rebuilt on the app's flex row (see `md/WAVE_B_LINKS_AND_SEARCH.md` §4.3). The Stats screen has **not** been checked against the device. |
| B8-9 | `FilterChips`' white-pill contract changed **app-wide** in this wave (the inactive chip is now themed). It affects **8** screens and they have not had their visual check. |
| B8-10 | `SearchBar`'s focus ring changed **app-wide** in this wave (`accent.gold` → `border.emphasis`). The same 8 screens carry it. |
| B8-11 | The **remaining ~48 screens** have no board-vs-device pass. The Search page is the first. |
| B8-12 | The **Jamendo adapter** now decodes the HTML entities in its text fields (`decodeJamendoText`). The other adapters were checked for the same shape and only Jamendo escapes. |
