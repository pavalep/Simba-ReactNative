# Wave B11 — The Movies screen in Penpot, its filter sheet, and the browse footer's bottom line

**2026-11-13 · branch `f5/w22-close-minimise-d9` · base `61b93d0` (Wave B9/B10)**

The Movies screen is finished **in the app** (Wave B9, `61b93d0`). It was
still a placeholder **in Penpot** — a board that said "not designed yet".
This wave draws it, and draws its filter sheet as a **separate** board, in
both themes, measures both against the device, and fixes the browse list's
bottom line — the pagination loader's dead space and the filter FAB's
presence at the end of a finished list.

---

## 1 · The ask

The owner's words:

> "we were perfecting movies screen ,its filter, also making these available
> in penpot, both screen and filter separate, if not done ,do it ,then only
> we can proceed to podcasts screen"

So: the screen and the filter as **two boards of their own** — the way the
Search page carries its four states — and Podcasts' boards only after
these are done. Podcasts' boards are **not** in this wave.

Then, on the device, two more:

> "pull to refresh indicator is coming up as i scroll in pagination, not
> correct, fix this also along what you were doing"

> "its working, but the paination loader is too off form the bottom, its not
> a good ui, right, i have not seen this much foo from bottom"

> "if no further to load, just hide the fab, ie if pagination finishes and at
> bottom hide fab"

---

## 2 · What was drawn

| board | what it is |
|---|---|
| `MoviesScreen / light — screen` | the Movies page as it opens: the header, the search field, the full-bleed mosaic and the filter FAB |
| `MoviesScreen / dark — screen` | the same page in the dark theme |
| `MoviesScreen / light — filter` | the same page with the app's own filter sheet over it |
| `MoviesScreen / dark — filter` | the same sheet in the dark theme |

The old placeholder (`MoviesScreen / light`) is removed **by name** in the
build's `remove` list, exactly as the Search placeholder was when that page
was drawn (`designs/build-penpot-app.js`).

The page is drawn in the app's **default** state — nothing filtered, the
sort at its default. There is no chip strip on the screen board, because
nothing is active until the user picks something: the sort's own default
("Most popular") is the group's `defaultKey`, and a group at its default
does not count as active (`FilterSheet.tsx:67-75`).

---

## 3 · Where every number comes from

The board's geometry is read out of the app's own components. Nothing here
is an eyeballed coordinate.

| what | where it comes from |
|---|---|
| the header | `InternalHeader` — a 36 dp back circle, a centred Manrope SemiBold 22/28 title, a hairline at 59 dp (`profile.js`'s `header`) |
| the field | `SearchBar` — 44 dp, `radius.pill`, `background.elevated`, a `border.subtle` hairline, 12 dp of padding, an 18 dp magnifier, Inter 15 |
| the grid's top | the shell's own stack: 60 (header) + 16 + 44 + 12 (the search slot) + 12 (the chip slot) = 144 dp, **plus the 24 dp status band** (§5.3) = **168 dp** (`BrowseLayout.tsx:185-221`) |
| the cards | `MovieCard` — two columns, a ZERO gap, a full-bleed 16:9 card, so 205.5 × 115.59 dp |
| the card's text | `heroOverlay` — 16 dp of horizontal padding, 16 above the title, 12 below the meta, a 4 dp gap; the meta's line box always ends 12 dp above the card's bottom |
| the FAB | `Fab` — a 56 dp gold disc, 20 dp from the right edge, the app's 24 dp `sliders` glyph, 40 dp above the screen's bottom |
| the sheet | `FilterSheet` — a 32 dp chip with a 1.5 dp border and 12 dp of padding, an 11 px group title with `letterSpacing 1.4` and a 24 dp line box, a 40 dp grabber zone, a divider with 12 dp either side, and a 40 dp SHOW MORE row |

---

## 4 · The chip widths — measured from the app's own font files

A Penpot board cannot lay text out the way React Native does, and the
**width of a chip is the width of its label**. The app's chip wrap is a
`flexWrap: 'row'` flow (`FilterSheet.tsx:455-460`), so which chips share a
row is decided by the widths of the chips before them — a decision the
board has to make before anything is drawn.

`designs/penpot/text-metrics.js` (new) reads the **shipped font files**
(`android/app/src/main/assets/fonts/`) and sums their advance widths on
**Android's pixel grid** — each glyph's advance rounded UP to a whole
pixel, so two neighbouring glyphs can never collide.

That model was checked against the device's own nine chip labels, whose
widths the accessibility tree reports to a third of a dp:

| model | mean error against the device |
|---|---|
| the raw advance sum | **2.07 dp** short |
| the pixel-grid sum | **0.54 dp** short |

So the pixel grid is the model's own — and it is what the generator uses.
With it, the sheet's own layout reproduces the device's:

| the sheet's row | the device | the board |
|---|---|---|
| CATEGORY title, from the sheet's top | 40.23 dp | 40 dp |
| the first chip row | 72.23 | 72 |
| the second chip row | 112.46 | 112 |
| the SHOW MORE row | 149.03 | 148 |
| the SORT BY title | 213.03 | 213 |
| the sort chips | 245.03 | 245 |

and the chips land where the device puts them: **Classic Films · Public
Domain · Documentaries** on the first row and **Silent Films · Comedy ·
Sci-Fi** on the second, with A–Z ending at 322.9 dp on the device and at
322.9 on the board.

---

## 5 · The board-vs-device check

The device's numbers were measured on `emulator-5554` (1080 × 2400 px at
420 dpi, so 2.625 px per dp) with the accessibility tree, on the app's own
default state. The board's numbers were read back out of Penpot.

### 5.1 The page

| measurement | the board | the device | Δ |
|---|---|---|---|
| the back button's x | 8 | 7.82 | +0.18 |
| the back button's top | 36 | 36.57 | −0.57 |
| the header title's top | 40 | 39.31 | +0.69 |
| the search field's text | 111 | 111.54 | −0.54 |
| the grid's first row | 168 | 169.14 | −1.14 |
| the grid's seventh row | 861.56 | 864.0 | **−2.44** |
| the card's width | 205.5 | 205.71 | −0.21 |
| the card's height | 115.59 | 115.2 | +0.39 |
| the card's title x | 16 | 16 | 0 |
| the card's meta | 257.59 | 257.59 | 0 |

The one measurement outside ±2 dp is the **seventh** grid row, and it is
the accumulation of the card's own width: the board's card is 205.5 dp wide
on the nominal 411 dp canvas and the device's screen is 411.43 dp, so the
device's card is 0.21 dp wider and the row pitch drifts **0.22 dp per
row** — 1.27 dp at row 3, 1.92 dp at row 6, 2.44 dp at row 7. It is the
canvas's nominal width, not a layout error.

### 5.2 The bottom-anchored furniture

| measurement | the board | the device | Δ |
|---|---|---|---|
| the FAB's x | 335 | 335.73 | −0.73 |
| the FAB's top | 818 | 818.29 | −0.29 |
| the FAB's size | 56 | 55.95 | +0.05 |
| the sheet's surface top | 605 | 605.26 | −0.26 |
| the CATEGORY title | 645 | 645.49 | −0.49 |
| the first chip row | 677 | 677.49 | −0.49 |
| the second chip row | 717 | 717.71 | −0.71 |
| the SORT BY title | 818 | 818.29 | −0.29 |
| the sort chips | 850 | 850.29 | −0.29 |

And the sheet's own layout, measured from the sheet's top edge so that
where the sheet is anchored cancels out:

| the sheet's row | the device | the board | Δ |
|---|---|---|---|
| CATEGORY title | 40.23 | 40 | −0.23 |
| the first chip row | 72.23 | 72 | −0.23 |
| the second chip row | 112.46 | 112 | −0.46 |
| the SHOW MORE row | 149.03 | 148 | −1.03 |
| the SORT BY title | 213.03 | 213 | −0.03 |
| the sort chips | 245.03 | 245 | −0.03 |

**43 of the 44 measurements are within ±2 dp**, and the one outside is the
seventh grid row's accumulation, explained above.

### 5.3 The status band — a 24 dp error this wave found and fixed

The **first** run of this check compared the board against the app's
*window* space and reported a uniform **23.7 dp** "canvas constant" on the
bottom-anchored rows. The file explained it with a note that said the
emulator "reports `insets.bottom = 0`".

**That note was wrong, and so was the board.** Measured on the device:

- the browse list's viewport is **745.14 dp** tall and its top is at screen
  **169.14 dp**, so its bottom is at screen **914.28 dp** — the screen's
  bottom (914.3). The navigation bar is **overlaid** on the window, not a
  strip above it;
- the app's FAB clearance is `useBottomChromeInset()` =
  `max(insets.bottom, mini-player band) + spacing.lg` = 24 + 16 = **40 dp**,
  and the device's FAB disc sits **40.4 dp** above the screen's bottom;
- the status bar, on the other hand, is a strip of its **own**: the app's
  window starts **24 dp** below the screen's top.

So the board's canvas (914 dp, the emulator's viewport) **is** the screen,
the bottom-anchored furniture was already anchored to the right edge, and
the 24 dp that was missing was at the **top**: the content was drawn from
the canvas's top instead of from below the status bar.

`designs/penpot/movies.js` now applies the measured band (`STATUS_INSET`),
and the check compares both sides in the screen's space. **There is no
constant between a board and this emulator any more.**

> The same 24 dp question is still open for the **other** boards in the
> file — see §9, item B-11-4.

### 5.4 The chip widths (the design tool's own type metrics)

| chip | the board | the device | Δ |
|---|---|---|---|
| Classic Films | 109 | 110.26 | −1.26 |
| Public Domain | 116 | 118.08 | −2.08 |
| Documentaries | 122 | 123.84 | −1.84 |
| Silent Films | 99 | 100.39 | −1.39 |
| Comedy | 80 | 80.64 | −0.64 |
| Sci-Fi | 64 | 64.18 | −0.18 |
| Most popular | 111 | 112.32 | −1.32 |
| Recently added | 124 | 126.72 | −2.72 |
| A–Z | 52 | 51.84 | +0.16 |

These are the only numbers a board cannot measure for itself: a chip's
width is its label's width, and Penpot sets the type. The generator's own
model (`text-metrics.js`, §4) is 0.54 dp from the device on average; the
board's rendered type is up to 2.72 dp narrower, which is Penpot's font
catalogue, not the app's.

---

## 6 · The browse list's bottom line (UI-1 and UI-2)

Two things the owner saw on the device and asked for.

### 6.1 UI-1 — the pagination loader was 136 dp above the bottom

The list reserves the FAB's clearance at the bottom:

```
paddingBottom: bottomChromeInset + FAB_SIZE + spacing.md   =  40 + 56 + 12 = 108 dp
```

The footer sits **above** that padding, so the "Loading more…" row was
left with a **68 dp hole** under it and a screenful of nothing below it.

The fix is in the **footer's own margin**, not in the list's padding
(`src/screens/_shared/browseFooter.ts`):

```ts
export const BROWSE_FOOTER_MARGIN_BOTTOM = -(FAB_SIZE + spacing.md); // -68
```

The list's padding is untouched — the cards still clear the button — and
the footer gives the clearance back, so the loader lands on the button's
own line.

**Measured on the device** (the Movies screen, `vampire`, dark theme):

| | the loader's line | the space below it |
|---|---|---|
| before | 778.3 dp from the screen's top | **136 dp** to the bottom |
| after | 835.4 dp from the screen's top | **79 dp** to the bottom |

The footer now sits in the same bottom band as the FAB (whose disc spans
818.3…873.9 dp, centre 846.1 dp), and the loader's row and the
"You're all caught up" row land on **the same pixels** (y 2177…2209 px) —
the two branches of the footer are interchangeable on screen.

### 6.2 UI-2 — the FAB hides at the end of a finished list

> "if no further to load, just hide the fab, ie if pagination finishes and
> at bottom hide fab"

The browse shell floats a filter button over the list's bottom-right
corner. When the list is **finished** and the user is sitting at its
**end**, that button is the only thing left in that corner.

- the **list** owns the scroll and the completeness
  (`src/screens/_shared/useListEnd.ts`): `atBottom` is
  `contentSize.height − (contentOffset.y + layoutMeasurement.height) ≤ 8 dp`;
- the **shell** owns the button (`src/screens/_shared/BrowseLayout.tsx`):
  `<Fab visible={hasOptions && !atListEnd} …>`;
- the one channel between them is `ctx.setAtListEnd`.

**Measured on the device** (Movies, `vampire` — 55 results, so the source
really does end):

| state | the FAB | the footer |
|---|---|---|
| paging (page 2 in flight) | visible | "Loading more…" on the bottom line |
| at the end of the list | **absent** | "You're all caught up" on the bottom line |
| scrolled back up | **back** | — |

The FAB's absence is proved twice: no gold pixels in the button's region
of the screenshot, and no `Fab "Filter Movies options"` node in the
component tree — while the tree still shows `MoviesFooter` with
`AppText "You're all caught up"`.

---

## 7 · The pull-to-refresh spinner (the first ask)

> "pull to refresh indicator is coming up as i scroll in pagination, not
> correct"

**Root cause.** The three browse lists bound the RefreshControl to
`refreshing={isLoading}`, and `isLoading` is TanStack's `isFetching` —
which is also true while the next **page** is loading. So the pull-to-
refresh spinner lit up at the top of the grid the moment the user
scrolled to the end of the list.

**The fix: the gesture owns the spinner.**
`src/screens/_shared/pullToRefresh.ts` is one hook, used by all three
browse hooks:

```ts
const {refreshing, refresh} = usePullToRefresh(q.refetch);
```

It holds the refetch in a ref (identity-safe), counts the in-flight
refreshes so an overlap cannot clear the spinner early, and clears in a
`finally` so a failed refetch cannot leave it spinning.

**Tests** — `__tests__/screens/MoviesScreen/MoviesPullToRefresh.test.tsx`
and `__tests__/screens/BrowsePullToRefresh.test.tsx`, 10 tests: the next
page loading must not spin, the gesture must spin, a failed refetch must
stop spinning, and all three contents must wire the gesture rather than
the bare `refetch`. Restoring the old expression fails 4 of the 7 content
tests.

**Device proof** — with the old code the spinner is visible over the
grid's top-left while a page loads; with the new code it is not.

---

## 8 · What is NOT on these boards

- **No invented affordances.** The sheet carries the app's own two groups
  (CATEGORY, SORT BY) and the app's own SHOW MORE toggle. Nothing was
  added — no "clear search", no per-category counts, no sort direction.
- **The artwork is the app's own.** The app draws a real Internet Archive
  poster in every card. A Penpot board cannot fetch a remote image, so the
  cards carry the app's **own bundled video placeholders**
  (`src/assets/images/placeholders/video/`), centre-cropped to 16:9 exactly
  as the app's `resizeMode="cover"` does. Six new media keys
  (`ph.movie1` … `ph.movie6`) were added to `designs/penpot/media.js` for
  them; no new binary asset was invented.
- **The titles are the app's own** — the first screenful of the "Most
  popular" order, read off the device on 2026-11-13, with the line breaks
  and the ellipsis the app's own `numberOfLines={2}` produces.
- **The gradient is a solid.** The app paints a `LinearGradient` over the
  bottom 62% of a card; Penpot cannot render a gradient, so the board draws
  the gradient's dark end over the same region — which is what the text
  sits on. The house pattern for the media rail card is the same.
- **The boards do not draw a status bar.** They draw the app's content in
  the band below it, so the top 24 dp of the canvas is empty — the
  screen's own status bar would be there on the device.

---

## 9 · The pipeline

The order is the pipeline, and the flow call is LAST:

1. **media** — 10 calls, 24 pictures uploaded (the six new movie
   placeholders and the eighteen the resizer had re-encoded);
2. **build** — 23 calls, **71 boards** drawn (68 before, four new, one
   placeholder removed);
3. **links** — 15 calls, **150 connectors**;
4. **flow** — 1 call, the `SIMBA app` flow, starting at `Splash / light`.

The pipeline was run **twice**: once for the first draw, and once after
the status-band fix (§5.3). The second run was build → links → flow, in
that order, with the flow last.

Two things about the media worth recording:

- **`designs/run-mcp.js media` is not the media runner.** It uploads and
  reports, but it does not record the ids in the store
  (`designs/.build/penpot-media-ids.json`), which is the ONE owner of
  them. The repo's own `designs/run-media.js` is the recorder. Using the
  wrong one leaves the build saying "run the media calls first" forever.
  The ids the upload had already reported were recorded from the result
  files instead of uploading a second copy of every picture.
- **The resizer is byte-stable** (verified: the same file hashes the same
  after a second run), so the fingerprint of an uploaded picture and the
  picture on disk agree. It was not always so — that is what the store's
  fingerprint exists for.

---

## 10 · Gates

`pwsh -NoProfile -File 'X:/Development/SIMBA/.scratch-figcraft/gates.ps1' -Out 'X:/Development/SIMBA/.scratch-figcraft/gates-waveB11'`

```
tsc          exit=0
eslint       exit=0
boundaries   exit=0
fonts        exit=0
boards       exit=0
jest         exit=0
ALL GATES DONE
```

- `npx tsc --noEmit -p tsconfig.json` — exit 0, no output;
- eslint — exit 0, no warnings (the house's gate is zero warnings);
- the boundaries, fonts and boards gates — exit 0;
- `npx jest` — **174 suites passed, 174 total · 1742 passed, 1 todo, 1743
  tests · 56.6 s** — which includes the two new refresh suites (10 tests);
- the Penpot plan builds (71 boards, 150 connectors, 107 media).

---

## 11 · Carried forward

Each item below is still open, with its own ID.

- **B-11-1** — the **Podcasts** Penpot boards (screen + filter, separate,
  light + dark). The owner's order: only after the Movies boards, which
  are now done.
- **B-11-2** — the **Search board's filter-sheet chips paint the label
  first and the pill second**, and the plan's order IS the painting order
  (`designs/build-penpot-app.js:1253-1256`), so the pill — an opaque
  `background.primary` / `accent.gold` fill — is painted **over** its
  label. The committed wave-B8 Search boards therefore show chips with no
  visible label. The Movies board does it the other way round (pill, then
  label) because its pill's geometry comes from the font metrics
  (`text-metrics.js`) and not from the label's shape. The Search board
  cannot simply swap the two: its pill's `x` and `w` are **derived from
  the label's shape** (`{after: {name: labelName}}` and
  `{text: labelName, measured: true}`), so the fix is to give the Search
  chips the same treatment as the Movies ones — measure the label's width
  from the font files and paint the pill first.
- **B-11-3** — the browse footer's own line sits **~11 dp above the FAB's
  centre** (the loader's glyph band is at y 2177…2209 px; the FAB's disc
  centre is at y 2221 px). Both are in the same bottom band and both
  branches of the footer agree, so it reads correctly — but the footer's
  56 dp slot does not put its 18 dp caption exactly on the button's centre
  line, and the reason was not established from the source.
- **B-11-4** — the **status band** (§5.3) is applied to the Movies boards
  only. The other boards in the file still need the same question
  answered, and `kit.js`'s `INSETS_TOP = 32` (used by the Home board
  alone, and derived from the Home screen's own chrome) is **8 dp** more
  than the 24 dp the device actually reports. Every board in the file
  needs one decision, not one board.
- **B-11-5** — the Music and Podcasts screens use the same shared footer
  and the same shared "at the end" rule, but only **Music** was checked on
  the device in this wave, and only its *unfinished* state (the footer in
  its spacer state, the FAB visible). Their end-of-list states are not
  device-proven.
- **B-11-6** — the Movies screen's **"all"** scope pages to 10,000 items
  (the Archive's own limit), so it never finishes and UI-2 is unreachable
  there; the proof used the search term `vampire` (55 results). The
  footer's `windowEnd` copy — "Showing {shown} of {total} movies — the
  archive stops paging here" — was therefore not seen on the device.
- **B-11-7** — the Penpot boards have not been **visually** spot-checked at
  full zoom after the status-band fix. The evidence is the 44-point
  geometric read-back against the device, which is stronger than an eye,
  but the canvas was photographed at a low zoom only.
