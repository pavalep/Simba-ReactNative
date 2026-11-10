# SIMBA — UI/UX Prototype Rebuild

**This file is the source of truth for the app's visual redesign.** It records the
design pattern every page follows, and then — page by page — what was wrong with
that page, what the new design is, what changed in the **app**, what changed in the
**Penpot prototype**, and what was **deleted**. Nothing about a page's design is
decided anywhere else.

- **Owner:** the app source (`src/`) is the source of truth for *values*.
  This file is the source of truth for *decisions and rationale*.
- **The design tool:** a Penpot file named `Simba_UI_UX_Complete_Design`, one
  page (`SIMBA`), one board per screen **per theme**, connected by prototype
  connectors so **Play** walks the app.
- **Order:** one page at a time. A page is not "done" until the Penpot board
  exists, the app matches it, the device proof is captured, and this file says so.

---

## 1. Why the redesign exists

The app was built feature by feature. Each screen grew its own header, its own
empty state, its own spacing. The result is a set of screens that each work and
that, together, do not feel like one product. This is the same class of defect
the login lockup had: the screen was functional and the *hierarchy* was wrong.

The redesign therefore has two halves that always move together:

1. **The Penpot board** — the intended design, drawn before the code changes.
2. **The app change** — the screen refactored to match.

And a third half that this project inherits from the login work:

3. **The dead-code sweep** — every page is also an audit. Code that no longer
   earns its place is removed, not left behind "because it might be useful".

---

## 2. The pattern

These are the rules. Every page obeys them; when a page needs an exception, the
exception is written down **here**, not just in the page's own section.

### P1 · One shelf header, in the whole app

Every horizontal rail on every screen uses **one** header component.

| Part | Spec |
|---|---|
| Leading badge | 32 × 32 circle, `accent.goldSoft` fill, 18 px glyph in `accent.gold` |
| Title | Manrope SemiBold 22 px (`displaySans`), `text.primary` |
| Trailing "See All" | Inter 13 px (`caption`), `accent.gold` — optional |
| Trailing chevron | 18 px, `text.tertiary` — optional, see P3 |
| Badge gutter | 16 px from the screen edge; title starts 56 px in |
| Header row height | 44 px (the badge is vertically centred in it) |

**Why:** the app had two header implementations — `MediaRail`'s own and
`SectionHeader` — and each one appeared on different rails of the *same screen*.
On Home, "Recently Played" and "Bookmarks" had a gold badge while "Pinned
Playlists" and "Followed Podcasts" did not. The page read as four unrelated
lists rather than one page.

### P2 · One vertical rhythm

Fixed steps, not per-component margins:

| Step | Value |
|---|---|
| Section divider ("Your Library", "Discover") | margin-top 8, padding-vertical 12 |
| Shelf block | margin-top 20 |
| Shelf header row | height 44 |
| Rail content | margin-top 12 |
| Next shelf block | margin-top 20 |

**Why:** Home's measured gaps between blocks were **50, 80, 102, 80, 78, 58 dp**.
Every block contributed its own height (empty vs. populated) plus its own
margins, so the page had no beat. The eye reads a page as "one thing after
another" only when the gaps are equal.

### P3 · An empty rail is a quiet line, not a card

A rail with nothing in it keeps its **header** (it is the feature's front door —
a Home page that never mentions Bookmarks is how a feature goes missing
unnoticed) and renders **one line of tertiary text** beneath it.

It does **not** render:
- a chevron — there is nothing to collapse,
- an icon card — the `EmptyState` component's card is a different visual
  language from the quiet caption the neighbouring rail uses.

**Why:** Home currently shows four different empty treatments for the same idea
(a collapsed `EmptyState` card, a plain caption, a bare heading with a
chevron, and nothing at all). Two neighbouring rails that are both empty must
look like the same kind of row.

### P4 · "See All" means "this rail is a window onto a bigger page"

"See All" appears **iff the rail shows a subset** of what the destination page
shows. It is not a data-dependent rule and it is not a per-component rule.

| Rail | Destination | Subset? | "See All" |
|---|---|---|---|
| Recently Played | History | yes (the rail is capped) | yes |
| Pinned Playlists | All Playlists | yes (pinned only) | yes |
| Bookmarks | Bookmarks | no (the same set) | no |
| Followed Podcasts | Podcasts | yes (followed vs. the whole catalogue) | yes |
| Explore Contents | — | no single destination | no |

**Why:** the app's rule was `items.length > 1`, implemented inside the rail
component. The result was that the same control appeared on one rail and not
on the next, and vanished from a rail the moment it had one item — even though
one item is exactly when a user is most likely to want the rest of the page.

### P5 · Never render a placeholder for data that does not exist

If the data is missing, the element is **absent** — not tinted, not
greyed-out, not a placeholder box.

**Why:** the Home greeting card always drew its 56 × 56 weather chip,
"tinted if no snapshot so the card silhouette stays stable". On a fresh install
(no weather) or after a failed fetch, that chip was a flat **blue** square — the
loudest element on a warm parchment-and-gold page, showing nothing. It also
drew a two-line right-aligned "Weather unavailable", which is an error string
on a greeting card.

### P6 · One card surface

Elevated card = `background.elevated` fill, 1 px `border.subtle`, radius 12
(`radius.md` / `radius.lg` for the greeting card).

### P7 · The dividers stay

Section dividers remain the Cormorant Garamond **Italic 18 px** label at
**0.9 alpha** brand gold with hairline rules at `accent.goldGlow` (0.25).
This is the v9f calibration and it is not being changed.

### P8 · The page has a hierarchy, not a list of sections

A screen's blocks are ordered by **what the user can act on**, not by which
feature was implemented first. See §3 (Home) for how this decided the order.

### P9 · The rules above are enforced by tests where they can be

Anything about layout that can be asserted is asserted. A rule that only
exists in a comment is a rule that will be broken.

### P10 · The whole card is the target, not the picture of the card

In the app a card is one `Pressable`: the cover, the title and the subtitle
are all inside it, and tapping any of them does the same thing. **The
prototype has to behave the same way, or it is lying about the app.**

This is not a style opinion — it is a fact about Penpot's Play viewer, and it
was measured (§4.7): the viewer gives the click to the **topmost** shape under
the pointer and does **not** fall through to the shape below it. So a
connector on a card's cover is dead wherever the title sits on top of it.

The rule for the design tool: **every shape of a unit carries the unit's
connector.** In the generator that is the `family` field on a link — a name
prefix, matched against the drawing kit's own shape names, so the rule cannot
drift from the drawing:

```
{from: 'Home', to: 'MoviesScreen', trigger: 'click',
 shape: 'Browse card Movies artwork', family: 'Browse card Movies'}
```

expands to the six shapes of that card (cover, scrim, icon disc, icon glyph,
title, description). `also` covers the units whose parts do not share a prefix
(the Login screen's button label and Google mark).

**`blocked` is not a hit-test escape hatch.** Marking the overlay `blocked`
was tried first and measured: it changes nothing in the viewer. The overlay
needs the connector.

---

## 3. The page ledger

| # | Page | Route | Penpot board | App refactor | Device proof | Dead code swept |
|---|---|---|---|---|---|---|
| 1 | Home | `Home` | ☑ V1 + ☑ **V2 (under review)** | ☐ held | ☐ | ☐ |
| 2 | Library | `Library` | ☐ | ☐ | ☐ | ☐ |
| 3 | Search | `Search` | ☐ | ☐ | ☐ | ☐ |
| 4 | Profile | `Profile` | ☐ | ☐ | ☐ | ☐ |
| 5 | Settings | `Settings` | ☐ | ☐ | ☐ | ☐ |
| … | *43 more* | | ☐ | ☐ | ☐ | ☐ |

**Scope rule — "actually being used".** A screen gets a board if it is reachable
by an in-app tap from the signed-in state, or if it is part of the auth flow
(`Splash`, `Login`). That excludes four routes that are deep-link-only
(`SongScreen`, `AllVideosScreen`, `MusicDetail`, `NowPlaying`) — `NowPlaying`
additionally renders `null`.

---

## 4. Page 1 — Home

**Route:** `Home` · **Component:** `src/screens/Home/index.tsx`

### 4.1 What the screen is

The app's front door. A greeting, then two groups of rails:

- **Your Library** — Recently Played · Pinned Playlists · Bookmarks · Followed Podcasts
- **Discover** — Explore Contents (Movies, Podcasts, Music, Radio, Live TV,
  Audiobooks, Shows, Archive, Local Files) · Genre chips

plus a FAB that opens a local media file.

### 4.2 The flaws, as measured on the device

Measured on emulator-5554 (API 37, 411 × 914 dp) against the running app, via
the accessibility tree and a full-resolution capture.

| # | Flaw | Evidence |
|---|---|---|
| H1 | **A placeholder for missing weather.** The greeting card always drew its 56 × 56 weather chip, "tinted if no snapshot so the card silhouette stays stable". With no weather it was a flat **blue** square — the loudest thing on the page, showing nothing. | Device capture: solid blue tile, top-left of the greeting card |
| H2 | **"Weather unavailable" on a greeting card.** A two-line, right-aligned error string, wrapping to "Weather / unavailable", competing with the user's name. | A11y tree: `StaticText "Weather\nunavailable" (0.758, 0.158, 0.181, 0.044)` |
| H3 | **Two header implementations on one screen.** `MediaRail` and `SectionHeader` each drew a rail header. | Source: `MediaRail.tsx` header vs `SectionHeader.tsx`; `QuickAccessShelf`/`FollowedPodcastsShelf` use one, `HomeMediaShelf`/`HomeBookmarksList` use the other |
| H4 | **No vertical rhythm.** The gaps between consecutive blocks were 50, 80, 102, 80, 78 and 58 dp. | A11y tree: block tops at y = 0.313, 0.400, 0.512, 0.600, 0.685, 0.748 |
| H5 | **Empty rails still show a collapse chevron.** "Recently Played" and "Bookmarks" were empty, and each still rendered a header with an "Expand section" chevron — a control whose only effect is to reveal an empty card. | A11y tree: `Button "Expand section"` under both |
| H6 | **Four empty treatments for one idea.** `EmptyState` card (MediaRail), plain caption (Pinned Playlists), bare heading (Recently Played), and nothing at all (Bookmarks, collapsed). | Source + device capture |
| H7 | **"See All" is data-dependent and component-dependent.** Only "Pinned Playlists" showed it. The rule lived inside the rail component (`items.length > 1`). | A11y tree: `Button "See All"` only on the Pinned Playlists row |
| H8 | **The best-practice hero slot does not exist.** `ContinueWatchingHero` and `FeaturedHeroBanner` are fully built and **never mounted** — no file in `src/` imports either. Meanwhile the page leads with a greeting and, on a fresh install, three empty rails before the only content. | Grep across `src/`: zero importers of either symbol |
| H9 | **The order does not follow what the user can act on.** On a fresh install the page is: greeting → "Your Library" divider → three empty rails → "Discover" divider → the only real content. | Device capture |

### 4.3 The new design

**There are now TWO Home designs on the page, and they are not revisions of
each other — they are two proposals.**

| Board | What it is | Status |
|---|---|---|
| `Home / light`, `Home / dark` (+ the two `— viewport` frames) | **V1** — the app's Home, drawn honestly: its own header, its own boxed greeting card, its own badge-and-chevron shelf headers, text over the artwork | the app as it is today; this is the board the prototype walks |
| `Home_V2_Light`, `Home_V2_Dark` | **V2** — the redesign: unboxed greeting, one card grammar, plain shelf titles, no genre shelf | **the proposal, under review** |

The V1 boards are kept because they are the truth about the app today, and
because a proposal is only legible next to what it replaces. The V2 boards
are drawn **beside** them, not on top of them.

**V2, in one paragraph.** The greeting loses its box and becomes three lines
on the page — the salutation, the name as the only large type, and one
quiet weather line — with the app's own weather chip at the top right.
Every card on the page then uses **one** grammar: the artwork whole, the
text underneath it. The shelf headers lose their gold badge circles and
their collapse chevrons and become a plain title with a "See All" action.
Everything sits on **one** left gutter instead of two. The genre shelf is
gone — it is obsolete, and it is being removed from the app.

**Rules applied:** one shelf header (P1), one vertical rhythm (P2), a
semantic "See All" (P4), no placeholders (P5), one card surface (P6), the
existing dividers (P7).

**Not changed:** the header (lion + Allura wordmark + search + avatar), the
Cormorant dividers, the FAB's position and its overlap behaviour, the FAB's
own action.

**The order — and the empty case.** V2 keeps "Your Library" **above**
"Discover", and the reason is in §4.8.3.

#### 4.3.1 The Home boards

The prototype draws Home three times per theme, and the names say what each one
is:

| Board | Size | What it is |
|---|---|---|
| `Home / light` | **1348 × 1500** | the **whole scroll** — the board the prototype walks |
| `Home / light — viewport` | 411 × 914 | the **device frame** — the first screenful, exactly as the phone shows it |

The flow's Home is the **full page**, and that is a deliberate choice: the
rails, the "See All" links, the pinned tiles and the podcast circles all sit
below 914 dp. On the viewport board those elements have no shape to carry
their connector, and a connector with no shape is a connector to nowhere.

**Why the full-page board is wider than the phone.** A Penpot board **clips
its children**: a shape outside the board is not drawn and cannot be clicked.
The Explore Contents rail is nine 140 dp cards, and on a 411 dp board only
about two and a half of them are inside it. That would put six of the nine
catalogue sections outside the board — invisible and unclickable — and
**"Shows" has no second route in the app** (`BrowseAllShelf` is the only place
that navigates to `ShowsScreen`), so the walk would end in a dead end.

So the full-page board is **1348 wide**: the 411 dp phone column is exactly the
viewport board's content, and the rail runs on to the right, the way the app's
rail continues off the screen. A hairline at x = 411 marks where the device's
own right edge is. It is drawn **first**, so it sits *behind* the content — on
the device the rail is clipped by the screen edge, and a hairline painted
across the Music card's artwork would read as a defect rather than as an edge.

The viewport board keeps the device's geometry exactly: the rail is clipped at
411 dp there, which is what the phone does.

#### 4.3.2 The Explore Contents rail

The app draws **one** horizontal rail of nine `CategoryCard`s
(`BrowseAllShelf.tsx` → `BROWSE_ALL_SECTIONS`), each 140 × 160, of which
about two and a half fit on a 411 dp screen. The prototype draws the **whole
rail** on the full-page board: the cards past the third run on past x = 411,
exactly as they run off the right edge of the screen in the app. That is
deliberate — every one of the nine categories is then a real shape with a real
connector, so the walk reaches all of them. Each card carries the cover the
app itself ships for that section (`CATEGORY_COVERS`), so the rail shows the
product's own art.

The consequence, measured in Play (§4.7):

- **All nine categories are clickable in the walk** — including **Shows**,
  which has no other route in the app. Clicking a card's **title** works, not
  just its cover (P10).
- On the **device**, the six categories beyond Movies / Podcasts / Music are
  one swipe away. That is the normal behaviour of a media rail (Netflix,
  Plex and Disney+ all hide their long tails behind a swipe), so it is not
  recorded as a flaw — but it is the reason the prototype draws the rail in
  full.

### 4.4 What changed in the app

**Nothing yet — deliberately.** The rule for this project is that the
**Penpot board is designed and signed off first**, and the app is changed to
match it afterwards. Two Home boards now exist (V1 and V2, §4.3); the app
refactor for Home is **held** until one of them is approved.

The app pass for Home is the list in **§4.8.4** — delete the genre shelf,
unbox the greeting, one card grammar, one gutter, plain shelf headers, and
do not draw an empty rail.

The **hero slot is not in it.** The first plan of this page adopted the
orphan `ContinueWatchingHero` as a hero. That is withdrawn: the app has no
hero slot, V2 does not draw one, and a hero that only exists for the
part-watched item is the "continue watching" row that Netflix, Plex and
YouTube already have a place for — the "Recently Played" rail. So
`ContinueWatchingHero.tsx` is a **DELETE**, alongside `FeaturedHeroBanner.tsx`
and `HomeEmptyState.tsx` (§4.6).

The uncommitted edits that already exist in the working tree for this page
(`WeatherGreeting.tsx`, `MediaRail.tsx`, `SectionHeader.tsx`,
`HomeMediaShelf.tsx`, `HomeBookmarksList.tsx`, `FollowedPodcastsShelf.tsx`,
`QuickAccessShelf.tsx`) are the first half of the P1–P5 work — they are
**not committed** until the board is approved, and they will be reworked
against whichever board is approved.

### 4.5 What changed in the design tool

**The Penpot file** `Simba_UI_UX_Complete_Design`, page `SIMBA`, 52 boards.

| | |
|---|---|
| Boards | **55** — 2 Login (the orb's two states) + 4 Home V1 (light/dark × full page/viewport) + **3 Home V2** (`Home_V2_Light`, `Home_V2_Dark`, `Home_V2_Light — first run`) + 46 placeholders |
| Interactions | **238** (the V2 boards carry none yet — they are a proposal, and a connector to a proposal that may change is a connector to a dead end) |
| Flows | **1** — `SIMBA app`, starting at `Splash / light` |
| Artwork | the app's own bundled images plus its own rasterised SVG glyphs, uploaded into the file as real media — **67 media** |

**The generators** (all under `designs/`, all uncommitted):

| File | What it owns |
|---|---|
| `designs/penpot/app-spec.js` | reads the app's own `tokens.ts` and `fontFamily.ts` through the TypeScript AST — the colours and the type scale cannot drift |
| `designs/penpot/kit.js` | the drawing vocabulary (shelf header, card, tile, chip, divider, hero, FAB) |
| `designs/penpot/kit-v2.js` | the **V2** vocabulary (unboxed greeting, plain shelf title, the one card grammar) |
| `designs/penpot/home.js` | the Home screen itself, in both themes |
| `designs/penpot/home-v2.js` | the **V2** Home screen — the design under review |
| `designs/penpot/app-boards.js` | the screen registry and the connector graph |
| `designs/penpot/media.js` | the artwork registry, with a drift guard that fails the build if the app renames a cover, and a **fingerprint per media** so a regenerated asset is uploaded again instead of silently reused |
| `designs/penpot/collage.js` | the playlist cover collages — one SVG that carries the cells and the clip path |
| `designs/penpot/icons.js` | the app's own SVG glyphs, rasterised per theme |
| `designs/build-penpot-app.js` | the MCP payloads: media uploads, board batches, connector chunks, the flow tidy-up |

**Three things changed while this page was being built**, each because a
measurement said so:

1. **The shelf header's "See All" anchor** was `spacing.lg` instead of the
   screen's right edge, so every "See All" landed at x = −27 — clipped off the
   left of the board. Now `SCREEN_W - spacing.lg - (chevron ? 34 : 0)`.
2. **The connector fan-out** (P10). The first pass put one connector on one
   shape per unit, and Play showed the whole thing was dead wherever a text
   overlay sat on top. Every shape of a unit now carries the unit's connector.
3. **The full-page Home board is 1348 wide**, not 411 (§4.3.1), because a
   Penpot board clips its children and six of the nine catalogue sections were
   outside it.

**The flow is tidied up last, on purpose.** Penpot creates a flow of its own
for any board that ends up with a connector, so wiring the connectors leaves
stray flows behind ("Flow 1", "Flow 2", …) that start wherever a board
happened to get its first link. The build therefore ends with a
`penpot-app-flow-1` payload that removes every flow except `SIMBA app` and
re-creates it if it is missing. It has to run *after* the connector chunks.

### 4.6 Dead code found

**Method.** A static import graph over all 603 code files under `src/`, built
from the real entry points (`index.js` → `App.tsx` →
`src/navigation/RootNavigator.tsx`), resolving relative imports only (the
repo declares no path aliases, so relative resolution is complete). Runtime
edges and `import type` edges were counted separately, and **every** orphan
was re-checked by basename across `src/`, `__tests__/` and `__mocks__/` — a
file is alive if a reachable file imports it, *or* if a registry keys it by
name as a string.

**What the app already has.** The Home screen has no hero slot at all:
`src/screens/Home/types/index.ts:6-14` has no `HERO` member, and the switch
in `src/screens/Home/index.tsx:102-175` has no hero case. Continue-watching
exists, but as a **rail**, not a hero: `useHomeScreen.ts:390-399` builds
`{type: 'SHELF', title: 'Recently Played', items: recentFiles.slice(0, …)}`
and `HomeMediaShelf.tsx:88-89` draws each card's progress bar. That is also
where the part-watched item lives, so the hero slot is not needed — the
first plan of this page adopted it and that plan is withdrawn (§4.4).

#### The four named candidates

| File | Verdict | Why |
|---|---|---|
| `src/screens/Home/components/ContinueWatchingHero.tsx` | **DELETE** | No importer anywhere. It was *adopted* in the first plan of this page as the hero slot — **that plan is withdrawn** (§4.4): the app has no hero slot, V2 draws none, and the part-watched item already has a place (the "Recently Played" rail, whose cards already draw a progress bar). Two things were true of it and are still true: it declares `thumbnailPath` and `mediaType` props and renders neither (only `title`/`position`/`duration` are read, lines 26/48/52), so it cannot draw the artwork; and its local time formatter (lines 29-33) prints `0:00` for a zero position — exactly the lie `src/utils/mediaTime.ts:14-27` forbids. |
| `src/screens/Home/components/FeaturedHeroBanner.tsx` | **DELETE** | No importer. It is the older, larger idea (a 220 px full-bleed gradient banner, line 171) and it is stale: its "circular progress ring" is a static border with three transparent sides (lines 257-260), so the `progressOffset` it computes at line 58 is **discarded**; and it hard-codes `fontSize: 10`/`9` and `fontWeight: '700'` (lines 204, 235, 269) instead of the typography tokens — the v8 rule the app already applies at `SectionHeader.tsx:149-156`. |
| `src/screens/Home/components/HomeEmptyState.tsx` | **DELETE** | No importer. Superseded by the shared `src/components/feedback/EmptyState/EmptyState.tsx`, which is what the app's other screens use (e.g. `StatsScreen.tsx:15`, `HistoryScreen.tsx:20`). Keeping a second empty-state vocabulary on Home is exactly what P3 forbids. |
| `src/screens/Home/components/HomeFab.tsx` | **does not exist** | Confirmed absent. It was deleted in commit `51da1b4` ("feat(app): one floating action button, and one rule for the bottom chrome"), together with `__tests__/screens/Home/HomeFab.test.tsx`, and replaced by `src/components/core/Fab/Fab.tsx` (imported at `src/screens/Home/index.tsx:29`). **But three comments still name it** — `Fab.tsx:8-11` refer to `screens/Home/components/HomeFab.tsx`, `screens/{Movies,Music,Podcasts}Screen/components/BrowseFab.tsx` and `screens/{Radio,LiveTV}ScreenNew/browse/Fab.tsx`, none of which exist. That is a stale comment to fix in this pass. |

#### The whole app, so the next page starts from facts

Of the 603 code files under `src/`:

| | count |
|---|---|
| Reachable from the entry points (runtime) | 516 |
| Reachable only through `import type` (not runtime, but `tsc`-relevant) | 36 |
| **Orphans** | **51** |
| — no reference at all | 36 |
| — referenced only by other orphans (dies with them) | 13 |
| — alive only because a test asserts it | 2 |
| — dead as code but **adopted** instead of deleted | 0 |

Two orphans are **not** safe to delete without thought: `src/types/svg.d.ts`
is an ambient `declare module '*.svg'` picked up by `tsconfig.json`'s
`include`, so it is compiled as a global even with no importer — deleting it
needs a `tsc` run to prove nothing else breaks. And `src/services/mediaService.ts`
is both an orphan *and* asserted by
`__tests__/placeholderservices.test.ts:25`, so the barrel link and the test
have to move together.

**Nothing has been deleted yet.** The orphan list is evidence, not a
work order: the deletions happen page by page, with this file's page section
as the receipt, and each one is proved by the gates (see §4.7).

#### Stale comments found (18 sites)

The highest-value ones, all naming files that do not exist:

- `src/components/core/Fab/Fab.tsx:8-11` — three deleted FAB components.
- `src/infrastructure/player/usePlaybackState.ts:35` — `VideoController.ts`.
- `src/state/bookmarksStore.ts:14,21` — `bookmarkPersistence.ts`.
- `src/services/downloadService.ts:14,21` — `player.api.ts`.
- `src/hooks/useSectionOptions.ts:3` — `screens/{Music,Movies,Podcasts}Screen/hooks/useOptions.ts`.
- `src/utils/weatherLocale.ts:4` and `src/utils/startupPerf.ts:10` — Redux-era
  `store/slices/weatherSlice.ts` and `store/index.ts`.
- `src/state/index.ts:3` — `src/index.ts`.
- `src/infrastructure/api/*/adapter.ts:4` — eight `*Service.ts` files that the
  adapter layer replaced.
- `src/infrastructure/player/resumePolicy.ts:211` and
  `useResumeAwareLaunch.ts:156` — `useOpenWithResume.tsx`, which now lives in
  the **library**, not in the app.
- `src/components/player/video/VideoPlayer/VideoPlayer.tsx:211` — `VideoPlayerRef.test.tsx`.
- `src/theme/typographyStyles.ts:167` — an `@/theme/typographyStyles` alias
  that is not configured anywhere.

Three more name a file that exists but at a **different path** (a path
mismatch, not a dead name): `useClosePlayback.ts:66` → `PlayerChrome.tsx`,
`AudioPlayer.tsx:277` → `HelpScreen.tsx:79`, and
`ChromeAutoHideController.tsx:22` → `useChromeAutoHide.tsx`.

### 4.7 Verification

**What was proved, and how.**

*By API* (the file's own state, read back through the plugin):

| Check | Result |
|---|---|
| Boards on the page | **55** |
| Interactions | **149 edges** in 15 connector chunks (the V2 boards carry the same app edges, §4.8) |
| Flows | **1** — `SIMBA app`, start `Splash / light` (no strays) |
| Every link target reachable from `Splash / light` | **yes** — no orphan target |
| Boards reachable by the walk | **50 of 55** |

The five boards the walk does not reach are **reference** boards, and that is
by design: `Home / light — viewport` and `Home / dark — viewport` are the
device frames, `Home / dark` is the dark variant of a light-themed flow,
`Home_V2_Dark` is the dark variant of a light-themed proposal, and
`Home_V2_Light — first run` is a STATE of a proposal rather than a step in
the app. They are on the page with their own connectors; they are not steps
in the app's flow. `Home_V2_Light` **is** reachable — the wordmark on the V1
Home carries the disclosed "see the redesign" edge (§4.7.2).

**The order of the passes matters, and it is not obvious.** A board that is
rebuilt loses its connectors, and the flow loses its starting board — so
every board rebuild must be followed by the connector pass and the flow
tidy-up. Twice in this session the flow vanished because a rebuild touched
`Splash / light`, which is where the flow starts. The fix is the pass
order, and the build script now says so.

*By clicking* (Penpot **Play**, the real viewer, the real flow):

| # | Action | Landed on | Note |
|---|---|---|---|
| 1 | the flow opens | `Splash / light` → `Login / light — orb rest` after 1.2 s | the splash's own `after-delay` connector fires, as in the app |
| 2 | click the **text** of "Sign in with Google" | `Home / light` | **this was dead before P10** — the label sat on top of the pill and took the click |
| 3 | click the **lion** in the middle of the orb | `Login / light — orb peak` | the orb's pulse is an animation state, carried by the orb |
| 4 | click the **"Shows" title** on a card | `ShowsScreen / light` | **this was dead before P10**, and Shows had no other route — it was unreachable in the walk |
| 5 | click "Recently Played **See All**" | `History / light` | |
| 6 | click the **hero's title** | `Queue / light` | the hero plays in place; the Queue was an orphan board (§4.7.1) |
| 7 | click the **search icon's lens** | `Search / light` | the lens is a separate shape on top of the search button |
| 8 | click the **avatar's "P"** | `Profile / light` | |

**The fact that was measured and is now a rule (P10):** the Play viewer gives
the click to the **topmost** shape under the pointer and does **not** fall
through. Marking an overlay `blocked` was tried first — it changed nothing in
the viewer. Every shape of a unit now carries the unit's connector.

#### 4.7.1 The one edge the app does not make

**`Home` → `Queue` is a prototype-only edge, and it is disclosed here.**

The hero card is the app's entry into the player: tapping it resumes
playback. The **only** route into the Queue screen in the app is
`navigate('Queue', {from: 'audio'})` in the audio player's minimise handler
(`src/components/player/audio/AudioPlayer/AudioPlayer.tsx:229`) — and the
player is a *component*, not a screen. The screen route that would stand in
for it (`NowPlaying`) renders `null`, so the prototype has no board to put
between the hero and the Queue.

Without this edge the Queue board is an orphan that Play can never reach.
With it, the walk is complete. Every other connector is read out of the app's
own `navigate(…)` calls, and the file:line for each one is in
`designs/penpot/app-boards.js` — with **one** exception, disclosed in
§4.7.2.

#### 4.7.2 The second prototype-only edge

**`Home / light` → `Home_V2_Light` is a prototype-only edge, and it is
disclosed here.**

The app has no route from its Home to a redesign of its Home. The edge
exists so that a reviewer can reach the V2 board **from the walk** instead
of hunting for it on the page: the wordmark and the lion on the V1 Home
carry it, and it is labelled "see the redesign".

It is the only non-app edge besides the Queue edge, and it points at a board
that is a **proposal** — which is exactly why it is labelled: nothing in the
app pretends that a redesign of the Home is a screen of the app.

**Still unproven for this page:**

- The **app** has not been refactored to match the board — that is held until
  the board is approved (§4.4).
- The dark Home board has **not** been walked in Play (it is not in the flow);
  it has been verified by API only.
- The 46 placeholder boards say "Not designed yet" and point here. They are
  honest placeholders, **not** designs, and each one is a page still to do.
- The **V2 boards** have been walked by API only so far: `Home_V2_Light` is
  reachable in Play (the wordmark on the V1 Home carries the "see the
  redesign" edge), and it carries the same app edges as V1 — but nobody has
  clicked through it yet. The V2 board's own walk has to be walked before the
  redesign can be called verified.

---

## 4.8 The V2 redesign — the boards under review

**Boards:** `Home_V2_Light` and `Home_V2_Dark`, 1568 × 1619 each (the phone
column plus the whole Explore rail, exactly as the V1 full-page boards are
built), and **`Home_V2_Light — first run`** (1568 × 599) — the FRESH INSTALL
state, which is the state that decides what the top of the page looks like
(§4.8.3). They were drawn from `designs/penpot/home-v2.js` with
`designs/penpot/kit-v2.js` — a second kit, because the redesign changes the
**grammar** of the page, not just its numbers. Every colour, font, size and
spacing value still comes from the app's own tokens through `app-spec.js`.

### 4.8.1 What changed, and the reason for each

| # | V1 | V2 | Why |
|---|---|---|---|
| 1 | The greeting is a 96 dp elevated card with three columns (chip / greeting / weather) | **No card.** Three lines on the page: the salutation, the name, one weather line | The card wrapped a sentence in a rectangle, and the weather column took a third of the width away from the name. The app's own comment says the split exists so the caption can never sit "under" the name (`WeatherGreeting.tsx:14-31`); V2 answers that differently — a 13 px footnote cannot compete with a 32 px gold name, and the name now has the full width. |
| 2 | The weather is a separate 26 px column | **One quiet line:** `Mainly clear in San Jose · 11°` | Fewer elements, one more reading of the weather instead of two. |
| 3 | The chip sits in the card's left column | **The chip moves to the top right, aligned with the NAME** | The chip is the weather; the name is what the greeting is about. |
| 4 | Media cards lay the title and the position line **over** the artwork on a scrim | **Artwork whole, text underneath**; the progress bar still rides the artwork's bottom edge, inset by the corner radius | The scrim covered the bottom half of the picture and made the type fight the image. |
| 5 | The playlist tile is a 160 × 110 box with a 32 dp cover in its corner and the words "Jump back in" | **A 160 × 160 art tile**, the name under it, the item count in the app's own `overline` style | The picture was the smallest thing on the tile and the words said nothing. |
| 6 | The podcast circle has a heavy drop shadow | **No shadow** | A shadow on a circle of artwork over parchment is noise; the circle's own edge is enough. |
| 7 | Every shelf header is a 32 dp gold-soft badge + a glyph + a title + "See All" + a chevron | **A plain title (h3) with a "See All"** — the badge and the chevron are gone | Four identical gold discs on one screen pull the eye away from the artwork. One action per row. |
| 8 | The Explore cards are 140 × 160 with the title and description **over** the poster, and the description was one unbroken line that ran past the card and was cut off by the next card | **A 160 × 183 poster with the name and a two-line description underneath** | The description is the app's own copy, broken the way the app's `numberOfLines={2}` breaks it. Nothing is cut off. |
| 9 | Two left gutters: 16 dp for the labels, 12 dp for the cards | **One gutter — 16 dp — for everything** | A mixed gutter is what makes a screen look assembled rather than designed. |
| 10 | The "Browse by Genre" shelf is the last thing on the page | **Gone** | The genre list is obsolete; it is removed from the app too (the app pass is in §4.8.4). |

**What V2 deliberately did NOT touch:** the header, the Cormorant dividers,
the FAB, the app's own artwork and copy, and the section order.

### 4.8.2 The card grammar

Every card on the V2 page is the same shape: **artwork above, label below**,
160 dp wide, 12 dp apart, on the 16 dp gutter.

| Card | Artwork | Label | Extra |
|---|---|---|---|
| Recently Played / Bookmarks | 160 × 90 (16:9) | title (14/600) + one meta line (13/400) | a 3 dp progress bar on the artwork's bottom edge, inset 12 dp — only when there is a position |
| Pinned Playlists | 160 × 160, the app's 2 × 2 collage | title + `12 ITEMS` | the app's 22 dp pin badge |
| Followed Podcasts | a 132 dp circle | title + author | — |
| Explore Contents | a 160 × 183 poster | name + two-line description | the app's 40 dp icon disc |

Apple Music, Spotify, Plex, Jellyfin and the Apple TV app all draw their
rails this way. It is the reason V2 reads as one page instead of four
widgets — V1 had four different card grammars.

### 4.8.3 The order — and the empty library

**"Your Library" stays ABOVE "Discover".** The user's own material is why
they open a media app, and every shipping app that shows both leads with the
personal: **Netflix**'s Continue Watching, **Plex**'s Continue Watching,
**YouTube**'s History, **Spotify**'s "Jump back in".

**But the empty case is not drawn.** The weakness of personal-first is a
fresh install: the library is empty, and the app today renders four empty
rails — as quiet lines — before the only content on the page. Netflix, Plex
and Spotify never do that: **a row with nothing in it is not drawn at all.**

So the rule V2 encodes, and the app pass implements:

> A rail with no items is not drawn. When every rail is empty, the
> "Your Library" divider is not drawn either — so on a fresh install the
> page **starts with Discover**, not because Discover moved up, but because
> there is no library to show.

`designs/penpot/home-v2.js` builds the library from a data list and filters
the empty rails out, so the populated board and the empty state are the same
code path.

**The first-run board proves it.** `Home_V2_Light — first run` is the screen a
new user sees, and it is:

```
  header
  Good afternoon,
  Paval                      ← no chip, no weather line: a fresh install has
                                neither a location permission nor a snapshot
  ── Discover ──────────
  Explore Contents           ← the 9 catalogue posters
```

There is no "Your Library" divider, no four empty rails, and no quiet empty
line — **the page starts with Discover**, and it does so because there is
nothing above it to show. The weather chip and the weather line are gone too,
which is the app's own rule (`WeatherGreeting.tsx:95-113`: the chip is drawn
only when there is a real snapshot behind it, and the weather column says
nothing when there is none).

So the answer to "should Discover be at the top?" is: **not as a fixed
position — as a consequence.** With a library, Your Library is first. Without
one, Discover is first. The order is personal-first and the empty state is
not drawn, and the two rules together make the screen right in both states.

### 4.8.4 The app pass — HELD until the board is approved

Nothing in the app has been changed for V2. When the board is signed off:

1. **Delete the genre shelf** — `GenreChipsShelf.tsx`, the `GENRE` section
   type in `src/screens/Home/types/index.ts`, the builder in
   `useHomeScreen.ts:143-155` and the push at `:421-424`, and the genre
   count on the local track store.
2. **Unbox the greeting** — drop the card surface, stack the salutation /
   name / weather, move the chip to the top right.
3. **One card grammar** — the four rail components render art above and text
   below; the scrim overlays go; the playlist tile becomes an art tile.
4. **One gutter** — the rails and the labels share the 16 dp gutter.
5. **Plain shelf headers** — the badge circle and the collapse chevron go.
6. **Do not draw an empty rail** — and skip the "Your Library" divider when
   the library is empty.
7. **Re-measure on the device** and record the numbers here.

### 4.8.5 What the build pipeline got wrong on the way (and is now fixed)

| # | Problem | Cause | Fix |
|---|---|---|---|
| 1 | The three playlist covers rendered as **black squares** | The collage renderer composited the four cells and then applied a rounded-corner mask with libvips' `dest-in`, which keeps the alpha and throws the colour away (measured: mean RGB **0.0** on every pixel) | The collage is now ONE SVG that carries the clip path and the four cells, rasterised by librsvg (mean RGB **84**) |
| 2 | The collage could not be uploaded at all (HTTP 413) | A lossless PNG of four photographs is ~280 KB and the endpoint rejects a body over ~85 KB | The cells are JPEG at quality 75 and the collage goes over the wire as a JPEG; Penpot rounds the corners of the one image (`borderRadius`) |
| 3 | The build reused the **old** upload after an asset was regenerated | The media id says *which* picture is in the file; nothing said whether the file on disk was still that picture | Every media now carries a fingerprint of the picture that was uploaded (`media-fingerprints.json`); a changed file is uploaded again |
| 4 | The build lost five media ids and then failed with "no media for ph.rail2" | The media results were written to numbered per-call files, and a later call **overwrote** an earlier one | One accumulating store (`penpot-media-ids.json`); the per-call files are still read, but nothing overwrites them |
| 5 | A build call died on the endpoint's 120-second ceiling with 21 boards in it | Every board waits for the canvas to lay it out before its texts are measured (~4.6 s for a placeholder board) | The batches are capped by board COUNT as well as by bytes (`BUILD_MAX_BOARDS = 8`) |
| 6 | Seven calls in a row died with "the Penpot plugin tab appears to be suspended by the browser" | The Penpot **Desktop** window was backgrounded, and Chromium suspends a backgrounded renderer | The window is kept in the foreground while a batch runs (`keep-penpot-awake.ps1`) |
| 7 | An export came back with five of the nine Explore artworks missing | Penpot's export rasterises the canvas while the images on it are still being decoded | The exporter takes the biggest of four exports (`export-best.js`) — the biggest PNG is the one with the most picture on it |

---

## 5. How to read a page's section

Every page section answers the same six questions:

1. **What the screen is** — and who it is for.
2. **The flaws**, each with the evidence that proves it (a measurement, a
   capture, a line number). A flaw without evidence is an opinion.
3. **The new design** — what it should be, and which pattern rules it follows.
4. **What changed in the app** — the files, and what each change did.
5. **What changed in the design tool** — the board, and what it contains.
6. **Verification** — the gates, the device proof, and what is still unproven.

---

## 6. Global notes

- **The prototype is one page, one flow.** Every screen is a board on the page
  `SIMBA`, and the connectors between them live in a single flow, `SIMBA app`,
  which starts at the app's entry point (`Splash / light`). The flow is tidied
  up last, because Penpot creates a flow of its own for any board that ends up
  with a connector.
- **Coverage, honestly.** 50 of the 55 boards are reachable by the walk. The
  five that are not are the reference boards (the two device frames, the dark
  Home, the dark V2 proposal, and the V2 first-run state). No connector points
  at a board the walk cannot get to — that was checked, not assumed.
- **Images.** The prototype uses **the app's own artwork** — the category
  covers in `src/assets/images/categories/` and the media placeholders in
  `src/assets/images/placeholders/`. Those are the exact files the app
  renders, so the boards show the product's own art (free, already licensed,
  and impossible to drift from the app) instead of stand-in photographs. The
  registry that binds them is `designs/penpot/media.js`, and it fails the
  build if the app renames or drops a cover it uses.
- **Themes.** Every screen is drawn in **both** themes, from the app's own
  `lightColors` and `darkColors` tokens.
- **Dark theme.** The dark palette is in `src/theme/tokens.ts`; the prototype
  reads it from the same source, so the two cannot drift.
