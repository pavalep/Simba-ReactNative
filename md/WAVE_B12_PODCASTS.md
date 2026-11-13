# Wave B12 — Podcasts: the API defect, the audit, and the redesign

**Date:** 2026-11-13
**Branch:** `f5/w22-close-minimise-d9`
**Scope:** the whole Podcasts surface — `PodcastsScreen` (the catalogue), `PodcastDetailScreen` (a podcast + its episodes), `FollowedPodcasts` ("My Podcasts"), and the `podcastIndex` adapter underneath them.

**The owner's ask, in order:** fix the Podcasts API → deep-analyse the surface (UI, UX, dead code, bad code, half-baked code, wrong implementation) → create a cohesive UI for Podcasts and its sub-pages → put it in Penpot → apply it to the real code, with the code fixes.

**Status of this document:** §1 the API root cause (fixed), §2 the API truth, §3 the audit (the findings), §4 the design direction and the spec, §5 the fix list, §6 gates, §7 Carried forward. The Penpot boards and the code application land in §4/§5 and are marked as they happen.

---

## 1. The API "defect" — it was the device's clock, not the API

### 1.1 The symptom

Opening Podcasts showed:

```
Couldn't load podcasts.
Network Error
[ Retry ]
Couldn't load more — tap to retry
```

A bare axios `Network Error` means **no HTTP response was received at all** — a transport-level failure, not a parse error and not an HTTP error. `src/infrastructure/api/apiClient.ts:73-83` turns any axios rejection without `err.response` into `new ApiError(err.message, 0)`, and `err.message` for that class of failure is the literal string `Network Error`.

Movies and Music worked at the same moment, over the same emulator, on the same Wi-Fi. So the failure was specific to one host.

### 1.2 What it was NOT

The owner's first instinct — "its api got mangled" — was wrong, and it is worth recording why it was wrong, because the same wrong turn is available again:

* The adapter was not mangled. `src/infrastructure/api/podcastIndex/adapter.ts` last changed on 2026-10-09 (`fa0a459`) and that change was the *`episodeCount` optionality* fix, which is correct.
* The auth was not mangled. A host-side `fetch` to the **same URL with the same headers** returned HTTP 200 and a valid `{"status":"true","feeds":[…]}` envelope.
* The query was not mangled. `q = (term) AND mediatype:(audio)` for search, `cat=<id>` for trending — both correct per the Podcast Index's own docs.

If the API were mangled, the host-side probe would have failed too. It did not.

### 1.3 The actual cause

Chrome on the same emulator, pointed at the same URL, answered with a page that said:

> **Your clock is behind**
> A private connection to `api.podcastindex.org` can't be created…

That is Chrome's TLS-validation failure page. The clocks:

| | UTC | epoch |
|---|---|---|
| Host | 2026-11-13 15:00:33 | 1794582033 |
| Emulator | 2026-11-13 02:26:28 | 1794536788 |

The emulator was **12 h 34 min (45 245 s) behind**. The cause: `adb shell settings get global auto_time` returned **0** — automatic time sync was off, so the emulator had been drifting since it was last synced.

And the certificate that made it fatal:

| Host | cert notBefore (UTC) | notAfter |
|---|---|---|
| `api.podcastindex.org` | **2026-11-13 13:28:54** | 2027-02-11 |
| `archive.org` | 2026-01-08 22:02:42 | 2027-02-09 |
| `api.tvmaze.com` | 2026-10-08 22:48:08 | 2027-01-06 |

`api.podcastindex.org` sits behind Cloudflare, which rotates short-lived certificates. The current one was issued at **13:28 UTC — about 90 minutes before the host's "now"**. The emulator's clock said 02:26 UTC, i.e. **before the certificate's `notBefore`**, so the TLS handshake was refused before a single byte of HTTP was sent.

`archive.org` (Movies, Music) and `api.tvmaze.com` carry long-lived certificates whose validity windows comfortably cover the skewed clock — which is exactly why they kept working and Podcasts did not. **The failure was a calendar accident, not a code defect.**

### 1.4 The fix

```powershell
adb -s emulator-5554 shell settings put global auto_time 1
```

Device epoch moved to 1794582082 against a host epoch of 1794582086 — **4 seconds** apart. The Podcasts screen then loaded its first page normally on the next cold start (`pod-06-podcasts-ok.png`).

> **Environment fix, not an app fix.** The app was correct. This is recorded because the same emulator will drift again, and because the next "one API is broken" report should start with `adb shell settings get global auto_time` and a host-vs-device epoch comparison, not with the adapter.

### 1.5 What the app SHOULD do about it

A user's own phone can have a wrong clock. When that happens the app currently says `Network Error`, which tells the user nothing and the developer nothing — axios in React Native collapses every transport failure into that one string.

**Finding P-13 (see §3.4)** captures the fix: the API client should keep the transport detail so the UI can say something actionable ("Your device clock looks wrong — check Settings → Date & time"). That is a real robustness gap for a shipped app, and it is the one part of this incident that *is* the app's problem.

---

## 2. The API, as it actually is

Measured against the live endpoint on 2026-11-13 (script `X:/Development/SIMBA/.scratch-figcraft/pi-*.js`).

### 2.1 Endpoints and pagination

| Endpoint | Page window (`max`) | Returns |
|---|---|---|
| `/podcasts/trending` | 25 → 50 → 100 | 25 / 50 / **99** feeds |
| `/search/byterm` | 25 → 50 → 100 | 25 / 50 / — feeds |
| `/episodes/byfeedid` | 10 → 20 → 40 … 1000 | 10 / 20 / **22** episodes |
| `/podcasts/byfeedid` | — | one feed (the only endpoint that carries `episodeCount`) |
| `/categories/list` | — | **112** categories |

Podcast Index has **no offset pagination**. `max` is a *limit*, not a window: `max=50` returns the **top 50** by the endpoint's own ordering, so the first 25 of it are byte-identical to the `max=25` response. Measured:

```
first 25 of max=50  === max=25   → true
first 50 of max=100 === max=50   → true
```

The app's pagination therefore works by *growing the limit* and concatenating the pages. That strategy is fine — but only if the pages are de-duplicated when they are concatenated. They are not. See **P-01**, the worst defect in this wave.

### 2.2 The category taxonomy is 112 items and it is raw

`/categories/list` returns Podcast Index's own taxonomy, in full:

```
1:Arts  2:Books  3:Design  4:Fashion  5:Beauty  6:Food  7:Performing  8:Visual
9:Business  10:Careers  11:Entrepreneurship  12:Investing  …  112 in all
```

…including `Sexuality`, `Buddhism`, `Islam`, `Baseball`, `Golf`, `Wilderness`. The app ships a *curated* 12-category catalogue with its own cover art and icons (`src/constants/podcastCategories.ts`) — and then throws it away the moment the API answers, because `usePodcastCategories` merges the API's **names** onto the static catalogue's **ids** (§3.1, P-02).

### 2.3 `episodeCount` exists on exactly one of the three feed endpoints

| Endpoint | `episodeCount` present? |
|---|---|
| `/podcasts/byfeedid` (detail) | **yes** — e.g. `211` |
| `/podcasts/trending` (catalogue) | **no** — the key is absent |
| `/search/byterm` (catalogue) | **no** — the key is absent |

The catalogue row has a "{count} ep." badge wired to that field, so on the catalogue screen it can never render. See **P-06**.

---

## 3. The audit

Every finding below is anchored to a file and a line, and each was verified against the source, against the live API, or against the device. Severity: **S1** = the user is actively harmed · **S2** = wrong or missing behaviour · **S3** = dead / half-baked code · **S4** = polish.

### 3.1 Wrong implementation

#### P-01 · S1 · The pagination duplicates every row, on both screens

`src/screens/PodcastsScreen/hooks/usePodcastsScreen.ts:120-121`

```ts
const allPages = q.data?.pages ?? [];
const items = allPages.flat();
```

`src/screens/PodcastDetailScreen/hooks/usePodcastDetailScreen.ts:70-71` — the same two lines.

The pages are the *growing-limit* pages described in §2.1, so page 2 contains page 1. `flat()` concatenates them without de-duplication. The pre-V18 implementation had a `dedupe` / `dedupeEpisodes` helper; the V18 rewrite deleted it and left the comment claiming *"0 dedupe helper"* as a simplification. It was a regression.

**Measured on the live API for the podcast on screen ("The Big Story | WIRED", id 8048224, 22 episodes):**

| | |
|---|---|
| Rows the app renders | **52** (10 + 20 + 22) |
| Distinct episodes | **22** |
| Duplicate rows | **30** |

**Measured on the device**, same podcast, `PodcastDetailScreen`:

> Console Error
> Encountered two children with the same key, `63158178455`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted…
> — `VirtualizedList.js` (810:9)

and the API confirms that key appears **3 times** in the flattened list. Device and API agree exactly.

The catalogue list has the same defect: the warning toast fires on `PodcastsScreen` too, and the catalogue's own numbers are `flat length 174 | unique 99 | duplicates 75` by the third page.

**Consequence:** the user scrolls and sees the same podcasts and the same episodes repeated, and React is in an unsupported state that may duplicate *or omit* rows outright.

**Fix:** de-duplicate by `id` when flattening, preserving order. The API gives no offset, so growing the limit is the only pagination available — the de-dupe is what makes it correct.

#### P-02 · S1 · Ten of the twelve curated categories point at the wrong Podcast Index category

`src/constants/podcastCategories.ts:19-33` declares `id → name` pairs. Measured against `/categories/list`:

| static id | declared name | the API's actual name for that id | |
|---|---|---|---|
| 1 | Arts | Arts | ok |
| 10 | Music | **Careers** | **wrong** |
| 15 | Business | **Non-Profit** | **wrong** |
| 20 | Comedy | **Education** | **wrong** |
| 25 | Education | **Self-Improvement** | **wrong** |
| 29 | Health | Health | ok |
| 30 | Technology | **Fitness** | **wrong** |
| 33 | History | **Mental** | **wrong** |
| 35 | News | **Sexuality** | **wrong** |
| 49 | Science | **Hobbies** | **wrong** |
| 55 | Sports | **News** | **wrong** |
| 60 | TV & Film | **Buddhism** | **wrong** |

Two consequences:

1. **Offline, the app is wrong.** `usePodcastCategories.ts:47` returns `PODCAST_CATEGORIES` verbatim when the API has not answered. The user picks "Comedy"; the app sends `cat=20`; Podcast Index answers with *Education* podcasts. The label and the content disagree, and nothing on screen says so.
2. **Online, the icons are wrong.** `usePodcastCategories.ts:52-60` takes the API's **name** and the static catalogue's **icon and cover** by id. So category 10 is labelled "Careers" and wears the *Music* disc glyph and the music cover.

**Fix:** correct the static catalogue's ids against the live taxonomy (and add a test that asserts the mapping, so it cannot rot again), and make the merge name-and-asset consistent.

#### P-03 · S2 · The `categoryId` route parameter is declared and then ignored

`src/navigation/types.ts:66` — `PodcastsScreen: {categoryId?: number} | undefined`.
`src/hooks/useSectionOptions.ts:19-25` — `categoryId` is in `FILTER_SEED_PARAMS`, and the seeding logic *does* work (it string-normalises, §the comment at `useSectionOptions.ts:74-79`).

But **no caller ever passes it**: the only navigation to `PodcastsScreen` is `src/screens/Home/components/BrowseAllShelf.tsx:61`, which passes nothing. So the parameter is a dead end — a declared capability with no user. Not harmful, but it is a promise the app does not keep, and it is the obvious hook for "Home → Podcasts → a specific category".

### 3.2 Dead code

#### P-04 · S3 · Six things in the Podcasts surface that nothing uses

Verified by repo-wide grep:

| What | Where | Note |
|---|---|---|
| `SearchBar` import | `PodcastDetailScreen/index.tsx:8` | imported, never rendered |
| `radius` import | `PodcastDetailScreen/index.tsx:5` | imported, never used |
| `handleRetry` | `PodcastDetailScreen/index.tsx:134-139` | defined, never called — `ListStates` gets the hook's `retry` instead |
| `LOAD_MORE_THROTTLE_MS` | `PodcastDetailScreen/related/constants.ts:18` | **zero** references repo-wide; the V18 rewrite removed the throttle it belonged to but left the constant |
| `PODCASTS_SECTION_CONFIG` | `PodcastsScreen/related/browseConfig.ts:57` | **zero** references repo-wide |
| `podcastTitle` route param | `navigation/types.ts:99` | every caller passes it; **no screen ever reads it** |

`podcastTitle` is the interesting one: `PodcastDetail` is navigated with `{podcastId, podcastTitle}` from three places, `navigation/linking.ts:189` even parses it out of a deep link — and then `PodcastDetailScreen` throws it away and shows the constant `HEADER_TITLE` ("Podcast Details") instead.

#### P-05 · S3 · The catalogue row's episode badge can never appear

`src/screens/PodcastsScreen/components/PodcastRow.tsx:65-74` renders the badge only `if (item.episodeCount > 0)`. The catalogue's two endpoints do not send `episodeCount` (§2.3), and the adapter defaults it to `0` (`adapter.ts:215-218`). So on `PodcastsScreen` the badge is unreachable — dead UI, and a field the adapter carries for nothing on that path.

#### P-06 · S3 · `PodcastRow`'s badge style breaks the house font rule

`src/screens/PodcastsScreen/styles/PodcastRow.styles.ts:62-66`

```ts
badgeText: { fontSize: 11, fontWeight: '700', color: colors.accent.gold },
```

The house rule is that the weight lives in the **family key** (`FONT_FAMILY.inter.semibold`), never in a `fontWeight` prop — and the comment nine lines above, in the same file, explains exactly why. This style has no `fontFamily` at all, so it inherits the variant's `Inter` and resolves `fonts/Inter_bold.ttf`; that file ships, so it renders — but it is the rule the file itself documents, broken. (The font gate does not catch it: it only resolves *named* families, so a bare `fontWeight` is outside its reach — the known 426-tag blind spot.)

### 3.3 UI / UX

#### P-07 · S2 · The filter sheet is an uncurated 112-item dump of the API's taxonomy

`usePodcastCategories` hands the API's whole category list to the filter. On the device, `SHOW MORE` opens a sheet that runs: Learning · Self-Improvement · Fiction · Drama · History · Health · Fitness · Alternative · Medicine · Mental · Nutrition · **Sexuality** · Kids · Family · Parenting · Pets · Animals · Stories · Leisure · Animation · Manga · Automotive · Aviation · Crafts · Games · Hobbies · Home · Garden · Video-Games · Music · Commentary · News · Daily · Entertainment · Government · Politics · **Buddhism** · Christianity · Hinduism · Islam · Judaism · Religion · Spirituality · Science · Astronomy · Chemistry · Earth · Life · Mathematics · Natural · Nature · Physics · Social · Society · Culture · Documentary · Personal · Journals · Philosophy · Places · Travel · Relationships · Sports · Baseball · Basketball · Cricket · Fantasy · Football · Golf · Hockey · Rugby · Running · Soccer · Swimming · Tennis · Volleyball · Wilderness · Wrestling · Technology · True Crime · TV · Film · After Midnight · Gaming · …

Every one of these is a real Podcast Index category, and every one of them is also a decision the user should not have to make. The app's own curated 12 — with cover art, with icons — is invisible. **This is the single largest UX failure on the screen.** The fix is curation, not a bigger sheet.

Two smaller points in the same sheet:

* There is **no "All"** option. The `'all'` entry is filtered out (`browseConfig.ts:33`), so once a category is chosen the only way back to trending is to dismiss the chip in the strip above.
* The sheet's first six are alphabetical (`Arts, Books, Design, Fashion, Beauty, Food`), so the most-used categories are not first.

#### P-08 · S2 · The detail header shows "Podcast Details" instead of the podcast's name

`PodcastDetailScreen/index.tsx:189` — `<InternalHeader title={HEADER_TITLE} />`, where `HEADER_TITLE` is the literal `"Podcast Details"` (`related/constants.ts:8`).

The podcast's real title is available three ways — the `podcastTitle` route param (ignored, §P-04), the loaded `podcast.title` (in the hero, below the fold), and `podcastTitle` again — and none of them reach the header. The user opens "The Big Story | WIRED" and the bar says "Podcast Details". `PodcastsScreen` gets this right (its header is the screen's own title), so the detail screen is the outlier.

#### P-09 · S2 · The share action shares the constant, not the podcast

`PodcastDetailScreen/index.tsx:85-91`

```ts
const handleShare = useCallback(() => {
  shareContent({ route: 'PodcastDetail', params: {podcastId}, title: HEADER_TITLE });
}, [podcastId]);
```

`title: HEADER_TITLE` — the shared link is titled "Podcast Details". Every other share in the app shares the item's own name (see `useEpisodeActions.ts:142`, `title: ep.title`).

#### P-10 · S2 · Music-note iconography across a podcasts surface

Three places draw a **music note** where a podcast belongs:

| Where | Glyph | Line |
|---|---|---|
| `PodcastRow` thumbnail fallback | `music` | `PodcastRow.tsx:50` |
| `HeroSection` episode-count badge | `music` | `HeroSection.tsx:81` |
| `HeroSection` artwork placeholder | `music` | `HeroSection.tsx:44` |

The device shows a ♫ badge next to "22 episodes" and ♫ placeholders down the catalogue list. The app already ships `micVocal` (used for the empty state and the Home's Podcasts tile) and `headphones` (used by "My Podcasts"). The Follow button's **bookmark** glyph (`HeroSection.tsx:101`) collides with the app's separate Bookmarks feature.

#### P-11 · S2 · The error state says the failure twice, and the second copy is wrong

When the catalogue fails, the device shows, stacked:

```
Couldn't load podcasts.
Network Error
[ Retry ]
Couldn't load more — tap to retry          ← the footer's error branch
```

Two problems: the same failure is announced twice, and the footer's copy is a lie — the load-more never started, so "Couldn't load **more**" is not what happened. `PodcastsFooter.tsx:46` renders its error branch on `!!error && hasLoaded` regardless of whether a *page* failed.

#### P-12 · S3 · The footer has no scroll-to-top affordance

`PodcastsFooter` renders one line — loading, retry, caught-up, or a spacer. Nothing in the catalogue's long list offers a way back to the top. `FollowedPodcasts` has the same shape.

#### P-13 · S2 · "Network Error" is not a message (the one real gap from §1)

`src/infrastructure/api/apiClient.ts:73-83` discards the transport-level detail. In React Native, axios reports every failure that is not an HTTP status as the string `Network Error` — a wrong clock, a captive portal, a dead cell connection and a blocked host all produce the same one line, and the user sees it verbatim.

#### P-14 · S3 · The Followed Podasts page does not follow the house style

`src/screens/FollowedPodcasts/components/FollowedPodcastsScreen.tsx:153-201` builds its styles with a module-level `StyleSheet.create`, not the `create<Screen>Styles(colors)` pattern every other screen in the app uses. Colours are inlined into the style objects at call time (`style={[styles.row, {borderBottomColor: colors.border.subtle}]}`) instead of being resolved once. The result: this page cannot be themed from the token layer the way the rest of the app can.

#### P-15 · S3 · The Home rail and "My Podcasts" disagree about the episode count

`FollowedPodcastsShelf` shows title + author. `FollowedPodcastsScreen` shows title + author + **`N episodes`**. The same podcast, two different amounts of information, on two screens a swipe apart.

### 3.4 What is NOT broken (checked, and clean)

Worth recording, so a later wave does not re-audit it:

* **The auth is correct.** SHA-1 over `key + secret + timestamp`, sent as `Authorization`, with `X-Auth-Key` and `X-Auth-Date`, and a `User-Agent` — the Podcast Index's documented scheme.
* **The `api_key` query parameter** added by `apiFetch` is harmless; the API accepts both the header and the parameter.
* **The envelope check is right.** `parseRawEnvelope` rejects `status !== 'true'` and a missing array field, and `firstString`-style guarding is applied to every IA field.
* **`autoClearFilterOnSearch` / `autoClearSearchOnFilter` work.** Both are implemented in `BrowseLayout.tsx:155-190` with the "fire on the transition" rule, and the podcasts screen passes both. The rule the screen's comment claims is the rule the code implements.
* **The `cat` parameter is a string and the API accepts it.** `getTrendingPodcasts` sends `cat=29`; the API's category ids are numeric but a numeric string is fine.
* **The drag guard on `onEndReached` is right** — a list shorter than the viewport fires `onEndReached` on mount, and `userDraggedRef` prevents the wasted request.
* **The `usePodcastCategories` merge keeps the API's name**, which is the right owner for a taxonomy the API owns. Only the *ids* and the *asset mapping* are wrong (P-02).

---

## 4. The design direction

### 4.1 What "cohesive" has to mean here

The Podcasts surface today is three screens that were each designed alone:

* the **catalogue** is a generic browse list — fine as far as it goes, but it shows the API's raw taxonomy and the API's raw ranking;
* the **detail** is a generic detail page whose header is a placeholder string, whose badge is a music note, and whose follow button is a bookmark;
* **"My Podcasts"** is a list built to a different house style from everything around it.

They do not read as one feature. The design job is to make the three screens feel like one product, and to stop the app from dumping the API's taxonomy on the user.

### 4.2 The direction, in one line

> **A curated, art-forward podcast catalogue that matches the app's editorial voice, over a detail page that names the podcast it is about, over a "My Podcasts" list that looks like the rest of the app.**

### 4.2b THE COVER SHELF — the decided design (2026-11-13)

The category surface becomes a **grid of cover plates**, inside the app's existing filter sheet. Not a new screen, not a chip rail.

**The rule:** the filter sheet's category group is a **4 × 3 grid of cover tiles** — the app's own `categories/podcasts/*.png` artwork, the app's per-genre glyph inside a **32 dp badge disc** centred on the plate (the `CategoryCard` grammar the app already uses for its own category shelves), and the genre name **underneath**. A selected tile carries a **2 dp gold ring** and a gold name.

The tile metrics, all derived from the app's own tokens:

| Metric | Value | Where it comes from |
|---|---|---|
| tile | 88 × 88 dp | 4 columns across the sheet's 440 dp content width, 9 dp gaps: 4 × 88 + 3 × 9 = 379 dp |
| badge disc | 32 dp | the `CategoryCard` badge |
| glyph | 24 dp gold | the app's per-genre icon set |
| label | caption 13 / 18, semibold | `theme/tokens.ts` caption |
| ring | 2 dp gold | the selected state |
| row pitch | 124 dp | tile 88 + label gap + label line 18 + row gap |

**Why a grid and not chips.** A chip rail can carry at most a few genres before it becomes a scrolling strip of words. A grid of *plates* shows twelve genres at once with the artwork that makes the feature feel curated — which is exactly what Apple Podcasts' category browse and Spotify's browse spine do. The app already owns this grammar in `CategoryCard`, so the sheet inherits it rather than inventing a pattern.

**The curated set — the app's own list, with the ids corrected** against the live Podcast Index taxonomy (2026-11-13, `/categories/list`, 112 items):

| Tile | Podcast Index id | Live name |
|---|---|---|
| All | — | (no category) |
| Arts | 1 | Arts ✓ |
| Music | 53 | Music ✓ |
| Business | 9 | Business ✓ |
| Comedy | 16 | Comedy ✓ |
| Education | 20 | Education ✓ |
| Health | 29 | Health & Fitness ✓ |
| Technology | 102 | Technology ✓ |
| History | 28 | History ✓ |
| News | 55 | News ✓ |
| Science | 67 | Science ✓ |
| Sports | 86 | Sports ✓ |

**TV & Film is deliberately excluded.** Podcast Index splits it into TV (104) and Film (105), and the app has no cover plate for either; a tile that cannot be drawn is a tile that does not ship. *Owner decision point: if TV & Film must appear, it needs two plates (TV, Film) and two glyphs.*

**Science and Sports have no cover plate** in `src/assets/images/categories/podcasts/`, and the image-generation connector is not available in this session — so those two tiles draw the app's own `goldSoft` plate with the glyph badge on top, which is the Local Files card's existing grammar. A plate that is not a photograph of a genre is still a plate; the shelf reads as one system.

**"All" is tile one**, not a chip above the grid — the user can always get back to the unfiltered catalogue, and it is the first thing they see.

### 4.3 The principles, each tied to a shipping app that already does it

No affordance is invented here. Each is named, with the app that ships it:

| # | Decision | Who already does this |
|---|---|---|
| D1 | **Curate the categories.** Ship a fixed, art-led set (the app's own 12, with the *correct* Podcast Index ids) instead of the API's 112. Keep the API list as a "More genres" second tier if the owner wants it. | Apple Podcasts (a fixed category shelf); Spotify (a curated browse spine); Pocket Casts (a short genre list) |
| D2 | **"All" is the first chip**, and it is a chip the user can always return to. | Apple Podcasts; every filter sheet with a default option |
| D3 | **The catalogue row carries the podcast's own artwork, its title and its author** — and *one* metadata line that is real (the publisher or the category), not a badge that can never render. | Apple Podcasts; Spotify; Pocket Casts |
| D4 | **Podcast iconography is podcast iconography** — `micVocal` / `headphones`, never a music note, and the Follow affordance never borrows the Bookmarks glyph. | Every podcast app; the app's own `FollowedPodcastsShelf` already uses `headphones` |
| D5 | **The detail header shows the podcast's name**, not "Podcast Details". | Apple Podcasts; Spotify |
| D6 | **The detail hero keeps one clear primary action** (Follow) and the episode rows keep one clear per-row action (Play), with the secondary actions behind the long-press sheet the app already has. | Apple Podcasts; Spotify; Pocket Casts |
| D7 | **One failure, one message.** The error card is the error; the footer stays out of it. | Every well-behaved list app |
| D8 | **"My Podcasts" is the same row grammar as the catalogue**, in the house token style, with the same metadata line — so the three screens read as one feature. | The app's own house rule for one feature, one row grammar |
| D9 | **The empty and error states say something true** — and a transport failure says something *actionable*. | The app's own `ListStates` component, done properly |

### 4.4 The screen inventory for the Penpot boards

The Penpot wave draws these (light + dark each), derived from the app's source rules, not hand-typed:

| Board | Screen | Contents |
|---|---|---|
| 1 | Podcasts catalogue | header, search field, rows, FAB, footer slot |
| 2 | Podcasts filter | the Cover Shelf (D1/D2 + §4.2b) — 12 cover tiles over the sheet |
| 3 | Podcast detail | header **with the podcast's name** (D5), hero + artwork + follow pill, episode list, episode row |
| 4 | My Podcasts | the house-style followed list, with the Unfollow action |

Four boards, **light + dark each** — eight boards. The generator is `designs/penpot/podcasts.js`; every number on them is derived from the app's source rules (`HeroSection.styles.ts`, `DetailItem.styles.ts`, `PodcastRow.styles.ts`, `theme/tokens.ts`), not hand-typed.

The catalogue's **empty** and **error** states are the app's shared `ListStates` component — one component for every list in the app, so they need no board of their own.

### 4.5 The fix list this wave will land

**Code (P-01 … P-14):**

1. **P-01** — de-duplicate by `id` when flattening the pages, in *both* `usePodcastsScreen` and `usePodcastDetailScreen`. One shared helper, so the two cannot drift apart again.
2. **P-02** — correct the static catalogue's ids against the live taxonomy; make the merge's name and asset agree; add a test that pins the mapping.
3. **P-03** — either wire `categoryId` through to a real caller or remove it. (Decision pending the owner's call; the analysis says remove it if nothing uses it.)
4. **P-04** — delete the six dead items.
5. **P-05 / P-06** — the row's badge: give it something real to show, or drop it; fix the `fontWeight` to the family key either way.
6. **P-07** — curate the category set; add the "All" chip.
7. **P-08 / P-09** — the detail header and the share title carry the podcast's name.
8. **P-10** — podcast glyphs, and a Follow glyph that is not the Bookmarks glyph.
9. **P-11** — the footer stays out of the first-load error state.
10. **P-13** — the API client keeps the transport detail; the error state can say something true.
11. **P-14** — "My Podcasts" moves to the house's token style pattern.
12. **P-15** — the rail and the page agree.

**Tests:** the podcast surface has **no tests at all** today (only `__tests__/screens/FollowedPodcasts/FollowedPodcastsScreen.test.tsx` exists). At minimum: the de-dupe helper, the category-id mapping, and the adapter's pagination contract.

### 4.7 One decision that changed while the code was being written

§3.4 said the merge's **API name** was the right owner. The implementation reversed that, and the reason is worth stating: the API's half of the merge *was* the P-07 defect. The old merge took the API's 112-item list and looked the app's assets up by id — so online, the shelf's labels came from the API ("Health & Fitness") and offline from the app ("Health"), and the same tile could be labelled with one genre's name while carrying another genre's picture.

The **curated catalogue now owns the id, the name and the asset**, and the live taxonomy is only a **liveness check**: a curated genre the live taxonomy does not know is dropped, so the app can never offer a tile whose `cat` the API has no category for. The labels are now the same online and offline, and they are the app's editorial voice.

### 4.8 Carried into the Penpot wave

The boards are the design; the numbers on them come from the app's source rules, and the board-vs-device check runs against the same frame the Movies wave established (the screen, with the 24 dp status band, the nav bar overlaid).

---

## 5. Gates

Run on the wave's tree, from the app repo (`X:/Development/SIMBA/.scratch-figcraft/gates.ps1`):

| Gate | Command | Result |
|---|---|---|
| types | `tsc --noEmit` | **exit 0** — no output |
| lint | `eslint . --ext .ts,.tsx --max-warnings 0` | **exit 0** — no output |
| boundaries | `scripts/check-import-boundaries.js` | **exit 0** — 568 files scanned, 0 errors, 0 warnings |
| fonts | `scripts/check-font-resolution.js` | **exit 0** — 672 text usages, every one resolves to a shipped font file |
| boards | `designs/check-board-routes.js` | **exit 0** — 51 app routes, 48 boards, 4 "no board, on purpose" |
| tests | `jest --silent` | **exit 0** — **180 suites / 1777 tests** (1 todo), 27.0 s |

Baseline for Wave B11 was 174 suites / 1742 tests; this wave adds 6 suites and 35 tests, all of them on the Podcasts surface, which had **no tests at all** before it.

**What the new tests cover** (`__tests__/`):

| Suite | What it pins |
|---|---|
| `infrastructure/api/podcastIndex/pagination.test.ts` | the de-dupe helper (174 → 99 rows, 52 → 22 rows) and the window rule |
| `constants/podcastCategories.test.ts` | the id → name mapping, so the ids cannot rot again |
| `screens/PodcastsScreen/coverShelf.test.tsx` | 12 tiles, "All" first, the exact id order, the ring, and the tap behaviour |
| `screens/PodcastsScreen/PodcastRow.test.tsx` | the row carries art + title + author and **no** episode count |
| `screens/PodcastDetailScreen/PodcastDetailScreen.header.test.tsx` | the header names the podcast, and the share title follows it |
| `screens/PodcastDetailScreen/HeroSection.follow.test.tsx` | Follow is a state pill, not a bookmark |
| `screens/FollowedPodcasts/FollowedPodcastsScreen.test.tsx` | the house row grammar and the 44 dp Unfollow target |

### The board-vs-device check

`X:/Development/SIMBA/.scratch-figcraft/check-podcasts-board-vs-device.js` compares the Penpot board (read back as plain data) with the device (Argent's accessibility tree on emulator-5554, 1080 × 2400 px, 2.625 px/dp). Both sides are in the **screen's** space, so the numbers are directly comparable.

**The catalogue and the Cover Shelf match.** Every measured row is inside the measurement's own quantum (Argent reports a frame normalised to three decimals over 2400 px, so one step of the reported number is 0.91 dp):

* the back button, the header title, the search field, the eight rows and the FAB: all within 1.5 dp;
* the sheet's top edge, the "CATEGORY" title, the twelve tiles' positions and the 88 dp tile: all within 0.9 dp;
* the tile arithmetic (88 plate, 9 gap, 32 disc, 24 glyph, 6 label gap, 18 label line, 12 row gap, 2 dp ring, 124 dp pitch) is the app's own, number for number.

**The check found three real differences, and all three are now fixed in the board:**

1. **The selected tile's ring was painted over its own plate.** The kit's `rect()` defaulted a stroke-only rectangle to the elevated background, so the "All" tile's ring covered the plate, the badge and the glyph — it rendered as a blank white tile. `kit.rect` now honours `fill: null` (which `kit.ellipse` had always done), and the ring is drawn with no fill.
2. **The ring sat outside the plate.** The app draws it as the plate's own 2 dp border (`borderWidth: 2` on the plate's box), so the board now draws it on the plate's bounds with an inward-aligned stroke.
3. **The plate's radius was `radius.sm` (8) and the badge a hard-coded `rgba(0,0,0,0.45)`.** The app uses `radius.md` (12) and the token `background.scrimDim`, which differs between the themes. Both now come from the app.

**The detail board's numbers are the app's rule, and the device proves it.** The two boards look different only because the device's podcast title wrapped to **four** lines where the board's is two:

| | board | device | the rule |
|---|---|---|---|
| title box | 240 + 112 (2 × 56) | 240.46 + 224 (4 × 56) | `displaySerif` 48 / 56 |
| author below the title | +4 | +4 | `titleGap` = `spacing.xs` |
| description below the author | +12 | +11.66 | `authorGap` = `spacing.md` |
| "Show more" below the description | +44 | +44.8 | 2 × 20 + `descGap` = 4 |

Every gap is the same; the two extra lines of the title account for the whole difference.

**"My Podcasts" was the board that did not match, and it was the app that had changed.** P-14/P-15 rewrote the row, so the board was redrawn from the app's new source (`FollowedPodcastsScreen.styles.ts`): a **56 dp circular** artwork (was 60 dp square), the info column at x 84 (was 96), an **80 dp** row (was 84), **no chevron**, the Unfollow action on a 44 dp target at x 323 (was 319), and the row's own hairline. Measured against the device: the artwork at 16.05 / 105.14 (board 16 / 104), the title at 84.34 / 112.46 (board 84 / 112), the author at 134.4 (board 134), the Unfollow target at 324.19 / 110.63 / 71.17 × 43.89 (board 323 / 110 / 72 × 44).

**The Follow pill was 28 dp tall on the board and 44 dp on the device.** The app gave the pill a 44 dp touch target and centred its content; the board now draws the pill at 44 and puts the tick and the label **side by side** as a centred pair (they were drawn on top of each other, both at the screen's centre).

### The device proof

Measured on emulator-5554 with the wave's code, after the clock fix:

* `b12-04-catalogue.png` — the catalogue loads the live trending stream, the rows carry art + title + author and **no** episode badge, and the FAB is the filter.
* `b12-05-covershelf.png` — **the Cover Shelf**, live: twelve tiles, four across, "All" first with the gold ring, Science and Sports on the `goldSoft` plate with their glyphs.
* `b12-07-detail.png` — the detail page's header carries **the podcast's name**, the episode pill carries the podcast glyph, and Follow is an outlined pill.
* `b12-10-followed.png` — Follow's active state: a solid gold pill with a tick and "Following".
* `b12-12-mypodcasts.png` — "My Podcasts" in the house style: circular art, title, author, an Unfollow action, and a hairline between rows.
* `b12-24-music.png` — **the corrected category ids, functionally proven**: tapping the "Music" tile (Podcast Index category **53**) filtered the catalogue to music shows — "Global Pulsation", "Plenitud Piano para Meditar", "Rest of Kfm Mornings with Darren S" — with the tile ringed in gold, its name in gold, a "Music" chip above the list and the sheet's RESET footer. Before the fix, that tile asked the API for category **10** (Careers) and showed careers shows under a Music label.

The device's data was put back the way it was found: the one podcast that was followed before the proof is followed, and the one that was followed to reach "My Podcasts" (whose "See All" only appears when the rail holds more than one item) was unfollowed again.

---

## 6. Carried forward

Every item deferred by this wave, one by one.

### Deferred by Wave B12 itself

| # | Item | Why it is deferred | What it needs |
|---|---|---|---|
| B12-1 | **P-12 — the scroll-to-top affordance** for the long catalogue list | Not in the wave's work list, and no shipping app names a precedent the app does not already have | A decision on the affordance, then the gesture |
| B12-2 | **The 112-item API taxonomy is hidden but unreachable** | The curated shelf is the decision the owner made; a "More genres" tier is a *second* decision | The owner's call on whether the raw list is ever shown |
| B12-3 | **TV & Film is not on the shelf** | Podcast Index splits it into TV (104) and Film (105), and the app ships no plate and no glyph for either — a tile that cannot be drawn does not ship | Two plates, two glyphs, and the owner's call |
| B12-4 | **Science and Sports draw the `goldSoft` plate, not artwork** | `src/assets/images/categories/podcasts/` has no file for either, and the image-generation connector is **not available in this session** (only the stock library) | Two cover plates |
| B12-5 | **The detail hero's cover is blank when a feed carries no artwork** | Found on the device with "Enough-ism" (a feed with no image); the fix is a fallback tile, which is a design decision | A fallback, and the owner's call on which |
| B12-6 | **`eslint .` reports 4 errors and 15 warnings in `designs/penpot/*.js`** | The repo's own gate lints `.ts,.tsx` only, so this is not a gate failure; the designs' JavaScript has never been lint-clean | A decision to lint the designs' JS, or to exclude it |
| B12-7 | **The detail board is proven by the layout rule, not by a numeric comparison** | The device's podcast title wrapped to four lines where the board's is two, so the two boards are not the same picture | A feed whose title is two lines, to close the comparison numerically |
| B12-8 | **The Movies, Search, Radio and Live TV sheets were not re-measured on the device** | The Cover Shelf is opt-in (`layout: 'coverGrid'`), and every other group renders the chip flow it always has | A device pass over the other three sheets |
| B12-9 | **The board's content is a recorded snapshot** | The live trending stream changes between runs, so the board cannot show what the device shows at the same moment | Nothing — this is the intended behaviour |
| B12-10 | **The "a short page ends the stream" rule is unproven against a feed that returns a short page mid-stream** | Every feed measured on 2026-11-13 returns a short page only at the end of its result set | A feed that truncates mid-stream |
| B12-11 | **`FILTER_SEED_PARAMS['categoryId']` is kept** | The seeding mechanism is shared with Movies, Live TV, Radio and Archive; only the Podcasts-specific param was removed. No caller passes `categoryId` to any screen today | The owner's call on the shared mechanism |
| B12-12 | **The shared `FilterSheet`'s own `fontWeight: '700'`** (the toggle label and the reset text) | Pre-existing, shared with Movies and Search, and not one of the findings | A separate wave for the shared sheet |

### Still open from the previous waves

| # | Item |
|---|---|
| B-11-2 | The Search board's chip paint order (the pill over the label) — decide whether to fix it |
| B-11-3 | The footer's ~11 dp offset from the FAB's centre — establish the reason from the source |
| B-11-4 | The status band for the other 67 boards (`kit.js`'s `INSETS_TOP = 32` is 8 dp more than the device's 24 dp) |
| B-11-5 | Device-prove Music's and Podcasts' end-of-list states |
| B-11-6 | The Movies footer's `windowEnd` copy was never seen on the device |
| B-11-7 | Visually spot-check the Movies boards at full zoom after the status-band fix |
| R3 | Bookmarks' destructive "N saved" chip → a plain label + a named "Clear all"; finished Downloads playable with Play; Library's "Playlists" mode and create FAB removed, title dropdown → All Playlists; History's dead pull-to-refresh removed |
| R4 | Stats untouched |
| R5 | The dead-code sweep: 68 dead runtime exports, the 8 store-key deletions per D-B, the unused Bookmarks `textContent` strings |
| R6 | Re-enable `@typescript-eslint/no-unused-vars` |
| F-10, F-13, F-15, F-17 | The native plain "Simba" against the Login's script "Simba" |
| — | The 75-site weight-intent sweep |
| — | Un-measured device proofs: the empty library, "first run", a pinned playlist, a bookmark, the long-press menu |
| — | The Penpot Play hand walk |
| B-050 | PiP chrome |
| F-065 ×2, F-066 | The seeded-data proofs |
| — | The 2026-11-03 native crash |
| — | `graphify-out/` |
| — | The API 24–30 PiP path |
| — | NO-JANK |
| B-018 | |
| — | The v7 doc rename banners, and the iOS verification |
| — | Dark-theme variants for the remaining screens, and the optional `Allura.ttf` upload |
| — | The page-by-page board-vs-device loop for the remaining ~48 screens |
| — | `md/HOME_V2_REFACTOR.md` §16's item |

### CF / CO items still open

| # | Item |
|---|---|
| CF-01 | Fixed and device-proven — close it |
| CF-03, CF-04 | Addressed by the InternalHeader change — verify and close |
| CF-12 | `preferredLanguages` default `'eng, jpn, und'` |
| CF-21 | `Avatar`'s no-initials fallback draws a music note |
| CF-22 | Closed — the constant +24 dp status-bar offset |
| CO-05 | The privacy chain Profile → About Simba → Privacy policy |
| CO-06 | The Profile's quiet space |
| CO-07 | The Downloads page owns the auto-delete preference |
| CO-08 | Fixed — verify and close |
| — | The **iOS URL scheme** is unregistered |
| — | The **font gate's 426-tag blind spot** (a bare `fontWeight` in a style object is invisible to it) — P-06 was caught by hand, not by the gate |
| — | **Argent 0.33.0 is available** — explicit informed consent required, and it must be done LAST |
