# Wave B14 — the carried-forward validity audit and the fixes that follow

**Branch:** `f5/w22-close-minimise-d9`
**Base:** `8a2befb` (Wave B13.1 — Live TV)
**Status:** OPEN — phases 1..8 in progress (see §5)

---

## 1. What this wave is

The user asked to *"fix all these, check if they are valid concerns, and doesn't create
unwanted issues, and jugaad codes etc"* against the full carried-forward list
(~50 items spanning B13.1, B13, B12, B-11, R3–R6, CF-*, CO-*, the iOS URL scheme and the
font gate's blind spot).

The house rule that governs this wave is **verify before fixing**: every item is triaged
against the live source into

| verdict | meaning | what happens to it |
|---|---|---|
| **VALID** | the defect is real in today's source | it is fixed, with evidence |
| **INVALID** | the claim does not hold — the code is already correct | it is **closed with the reason**, not "fixed" |
| **STALE** | it was true, the code has since changed | closed with the reason |
| **NOT-A-CODE-FIX** | real, but the fix is a design wave, a device pass, an owner decision or a lib release | carried forward **with the reason** |

**Nothing is fixed on the strength of the carried-forward text alone.** Where the carried
text's own evidence was wrong, the correction is recorded here — several of the carried
findings had mis-stated evidence, and fixing them as written would have broken working
code.

The audit was run by six read-only agents, each owning one slice of the list:

| agent | slice |
|---|---|
| A | B13.1-1 … B13.1-6 |
| B | B13-3 … B13-10 |
| C | B13-11 … B13-21 |
| D | B12-1 … B12-14 |
| E | B-11-2 … B-11-7, R3, R4, R5, R6 |
| F | CF-01, CF-03/04, CF-12, CF-21, CO-05…CO-08, the iOS URL scheme |

---

## 2. The verdict table (audits A–D)

### 2.1 B13.1 carry-forward

| id | verdict | evidence | action |
|---|---|---|---|
| **B13.1-1** | **NOT-A-CODE-FIX** | The lib has no headers option (`react-native-media-player/src/hooks/usePlayerActivity.ts:12-49`); native `MPVLib.kt:37` `nativeLoadFile(nativePtr, path)` takes no options argument. The app-side `setProperty` workaround is a **global sticky mpv option** that would leak a UA onto unrelated playback. | Carried forward — needs a lib option + native change + a release. |
| **B13.1-2** | **NOT-A-CODE-FIX** (design) + **the carried claim was false** | Podcasts uses `Placeholder`, not `EmptyState` (`PodcastsScreen/components/ListStates.tsx:65-86`) — the carried text said only Radio/Live TV. `EmptyState` is not a drop-in: it carries card chrome, `h3` vs `body1`, and anchors at 30% vs top-aligned. No Radio/Live TV empty-state board exists. | Carried forward — needs a board. The doc's claim is corrected. |
| **B13.1-3** | **INVALID** | Paging is a client-side slice (`useLiveTVBrowser.ts:199-202`), `isLoadingMore: false`, so no next-page failure is reachable and `error={null}` is correct. | Closed — no change. |
| **B13.1-4** | **VALID** | The cache is already shared; the fixable parts were (a) the IPTV leg ran for **every** scope although `SCOPE_SOURCES` only shows TV for `all`/`tv` (`searchFilters.ts:109-121`), and (b) `getIPTVCatalogue()` got **no signal** (`:134`) while Live TV passes one. Prefetch is not free. | **Fixed** — see §3.1. |
| **B13.1-5** | **NOT-A-CODE-FIX** (device pass) | The Podcasts end-of-list **is** reachable by hand (windows 25 → 50 → 100, ~13 swipes). The Movies window-end label needs the 10,000-row window (250 requests / 5,000 grid rows) — not by hand. | Carried forward — device pass. |
| **B13.1-6** | **INVALID** (the source's problem) | The app already surfaces mpv's terminal failure with Retry/Close (`errorClassifier.ts:149-184`, `VideoErrorOverlay.tsx:112-124`). | Closed — no change. |

Extra defects found by audit A and fixed in Phase 1: the Search page downloaded 2.8 MB for
scopes that exclude TV; the Search catalogue fetch could not be aborted; `IPTV_RETRIES`
was decorative (folded into B13-14).

### 2.2 B13-3 … B13-11

| id | verdict | evidence | action |
|---|---|---|---|
| **B13-3** | **NOT-A-CODE-FIX** (design wave) | The shared `BrowseLayout` lacks `rightAction`, group-aware labels, multi-group routing and a keyboard-aware FAB. Moving Radio/Live TV as-is would **lose** the header heart, the chip × clear glyph and the keyboard-aware FAB, and would **misroute** genre/country/language into `sort`/`view`. | Carried forward — design wave (Phase 5). |
| **B13-4** | **VALID** — but *"~90%"* is wrong | Longest-common-subsequence over the two files: **298 of 409 lines identical (73%)**; the hooks are only **27%** similar. | Phase 2 — extract the **4 identical blocks**, never merge the screens. |
| **B13-5** | **VALID** | `FilterSheet.title` is dead: 5 call sites; `FilterSheet.tsx:274` destructures it and `:365` passes `title={undefined}`. | **Fixed** — the prop is **deleted, not rendered** (no board draws a sheet heading; rendering it would make 8 boards wrong). |
| **B13-6** | **NOT-A-CODE-FIX** (design) | The 44 dp floor is applied **nowhere**; the shared chip is **23 dp** (not 21 as carried) and the sheet chip is **32 dp**. A 44 dp chip changes the shell rhythm and 8 boards. | Carried forward — design wave (Phase 7). |
| **B13-7** | **VALID** | The retry pill is **28 dp** (`BrowseListFooter.tsx:159-165` + caption `lineHeight` 18) against the house floor of 44 (`PlayerControl.tsx:135-136`, *"Never smaller"*). | **Fixed** — one style; the footer slot is `minHeight: 56` so nothing moves and no board draws it. |
| **B13-8** | **INVALID** | The doc's evidence is false (the live `/json/countries` has no `pop`/`music`; the three visible slices intersect ∅). The proposed fix (key = group + name) would **break the filter**: `toRadioTagRow` uses one string as both the React key and the API value. | Closed — the proposed fix is explicitly **not** applied. |
| **B13-9** | **user decision** | — | **Wire it up** (user's answer): promote `MusicDetailScreen` to a real detail screen, with a tap target on Music rows and a new board. Deliberately breaks the *"the row IS the play action"* grammar (`TrackCard.tsx:3-4`). Phase 4. |
| **B13-10** | **VALID (6/6)** | M-07 four bare `fontWeight`; M-09 hand-rolled loading/error; M-11 title ×3; M-12 `FlatList` inside `ScrollView`; M-13 pre-V21 `openPlayer` not awaited; M-28 `source` in deps, unused. | Phase 4, with B13-9. |
| **B13-11** | **VALID** | `simbaplayer://music/42` → the `source` param is absent (the path segment is optional) → the Audius branch ran against a Jamendo id → *"Track not found"*. No crash. | **Fixed** — `source` is optional and defaults to `'jamendo'`. |

Extra defects found by audit B and fixed in Phase 1: the Live TV share link carried
nothing (the Radio twin had been fixed to `SongScreen`); Radio and Live TV disagreed on
the list's top inset (16 vs 8); `MusicDetailScreen` owns a second duration formatter.

### 2.3 B13-12 … B13-21

| id | verdict | evidence | action |
|---|---|---|---|
| **B13-12** | **VALID** (umbrella) | None of Audiobooks / Archive / Shows is on the shared shell. **31 sub-findings (A-01 … A-31), all VALID.** The shell move closes only **4** of them (A-09, A-10, A-11, A-15); 25 need their own fix. | Phase 6. |
| **B13-13** | **NOT-A-CODE-FIX** (the split) — the underlying UX defect is **VALID** | `RadioContent.tsx:466-498` passes three groups (genre/country/language) to the shared `FilterSheet`, which renders every group in **one** ScrollView body (`FilterSheet.tsx:374-373`). The counts are live: 40 + 40 + 40 = **120 chips**. The board bakes the one-panel sheet (`designs/penpot/music-radio.js:1060-1063` — *"the LANGUAGE group and the RESET footer are below the board's bottom edge"*). | Carried forward — design wave (Phase 5). A 3-line symptom fix exists (`collapsedRowLimit: 6` per group) but still leaves one panel and still invalidates the board. |
| **B13-14** | **VALID** — **all ten constants lie** | Ten `*_RETRIES = 2` constants each carry the comment *"hook layer honors this constant"*. **Not one is imported by any hook.** The only importers are the tests that assert `=== 2`. The retry that actually happens is the app-wide TanStack default `DEFAULT_RETRY = 2` (`src/app/QueryProvider.tsx:28,50`) — a different mechanism that merely shares the number. `WEATHER_RETRIES` is contradicted by its own consumer (`useWeather.ts:118` sets `retry: false`). | Phase 2 — wire them to their real call sites. |
| **B13-15** | **VALID** | The legacy screens were deleted (`5f239c2`, `ad0c3f0`); only `RadioScreenNew/` and `LiveTVScreenNew/` remain. 15 files, 10 import/name sites, 4 test files, plus **one runtime path** in `ZustandSelectorStability.test.ts:312` that an import grep does not find. The Penpot registry keys on **route names**, so it is unaffected. | Phase 2 — rename. |
| **B13-16** | **VALID** | Five route params are declared but no linking path can carry them; `MusicDetailScreen`'s type is defined twice; Radio's `initialTab` is dead. | Phase 2 — make the declared params **reachable** (adding `:genre` to the path) rather than deleting them, which would remove the seed the Movies/Podcasts filters use. |
| **B13-17** | **VALID**, with one **STALE** sub-item | `API_CONFIG.jamendo` has **zero** references; `musicCategories.ts`'s `icon`/`genre`/`image` are never read; 10 per-genre covers are reachable only from that dead map; `MusicScreen/types/index.ts` has **6 of 8** dead re-exports (the doc said 5 of 7). **STALE:** *"Couldn't load tracks."* now renders (`MusicScreen/components/ListStates.tsx:13,53`). | Phase 2 — delete the dead code; keep the string. |
| **B13-18** | **VALID — but the carried rule is mis-stated** | 116 literal `fontWeight:` props. The app's rule is **not** *"never a `fontWeight` prop"*: `theme/tokens.ts:416-433` pairs family + weight on every variant, and `'Inter'` + `'700'` is exactly what selects `fonts/Inter_bold.ttf` (`fontFamily.ts:111-113`) — **that is correct**. What breaks is a **sub-700 weight on a plain family** (`'Inter'` + 600 → `fonts/Inter.ttf` = Regular) and a **700 on a baked-weight family** (`'Inter SemiBold'` + 700 → `fonts/Inter SemiBold_bold.ttf`, not shipped → system font). | Phase 3 — the **corrected** scope. Sweeping the `'700'`s as carried would break the bold faces. |
| **B13-19** | **VALID** | `jamendo/adapter.ts:330` `EMPTY_RETRY_ATTEMPTS = 4`; the loop repeats the request **unchanged** (correct — `order` selects a *pool*, not a sort, so varying it would mix pools across pages). It cannot tell a flaky empty from a legitimate one, so a page past the end of the catalogue burns 4 requests. It also **amplifies** with TanStack's `retry: 2` → up to 12 requests per page. | Phase 2 — bound it without losing the coverage the retry buys. |
| **B13-20** | **VALID** | `radioBrowser/adapter.ts:376-393` `getGenres()` takes the live tag list (40 of 80) and it is the whole tag list — `hits`, `oldies`, `80s`, `top 40`, `fm`, plus non-English tags (`entretenimiento`, `estación`, `méxico`). No curated list exists in the repo (`musicCategories.ts` is the **Jamendo/Audius** list, 11 entries, not radio-browser tags). The board bakes the live 12 (`designs/penpot/music-radio.js:289-291`). | Carried forward — the **list itself is an owner decision**, and it must be reconciled with the country group (B13-8) before either is narrowed. |
| **B13-21** | **INVALID** | `radioBrowser/adapter.ts:439-453` `getLanguages()` sends `order:'stationcount', reverse:'true'` and **slices to the limit** (`:452`); the hook asks for 40. The live top-40 by station count contains **no numeric code** (`1`/`111`/`123` are outside the slice). | Closed — no change. |

Extra defects found by audit C: `ErrorState.tsx:107` hard-codes `fontFamily: 'monospace'`
(the app ships JetBrains Mono and exposes it); five route params are unreachable through
the deep-link config; `MusicScreen/types/index.ts` has **6** dead re-exports, not 5; the
Jamendo retry amplifies with TanStack's; `parsePageParam` (`apiClient.ts:227`) has **no**
importer at all; `searchByAuthor` / `getRecentAudiobooks` / `searchInternetArchiveMusic`
are **test-only**, not import-free — deleting them breaks three existing tests.

### 2.4 B12-1 … B12-14

| id | verdict | evidence | action |
|---|---|---|---|
| **B12-1** | **NOT-A-CODE-FIX** | There is **no** `scrollTo` anywhere in `src/`. The wave doc's own resolution is *"a decision on the affordance, then the gesture"*, and no shipping app names a precedent the app does not already have — so the affordance cannot be picked by an implementer. | Carried forward — owner decision. |
| **B12-2** | **NOT-A-CODE-FIX** | The live 112-item taxonomy is used only as an **existence check** and the curated set is filtered against it (`usePodcastCategories.ts:45-53`); the sheet's options come from `PODCAST_CATEGORIES` only (`browseConfig.ts:38-43`). A "More genres" tier is a second product decision. | Carried forward — owner decision. |
| **B12-3** | **NOT-A-CODE-FIX** (design) | `podcastCategories.ts:41-55` has 12 entries, **no 104/105**; the asset folder has 10 plates, **no tv/film**; the glyphs **do** exist (`SvgIcon.tsx:167` `clapperboard`, `:191` `tv`). The board draws 12 tiles, no TV/Film (`designs/penpot/podcasts.js:250-263`). | Carried forward — needs 2 artwork plates + 2 shelf entries + a board re-draw (a 13th tile becomes a 4th grid row). |
| **B12-4** | **NOT-A-CODE-FIX** (design) | No `image` for ids 67/86 (`podcastCategories.ts:53-54`); no science/sports asset. The fallback **is** the decided behaviour today (`CoverGrid.tsx:100-113` goldSoft + badge) and the board agrees (`media: null` → `:554` goldSoft). | Carried forward — creating artwork would remove the only live example of the goldSoft fallback. |
| **B12-6** | **VALID — and the carried "not a gate failure" is wrong** | `eslint .` exits **1** with **4 errors + 15 warnings**, exactly the recorded figure. But only 2 errors + 10 warnings are in `designs/penpot/*`; the other 2 errors + 5 warnings are in `designs/*.js` outside it. **`.github/workflows/ci.yml:64` runs `npm run lint -- --max-warnings 0` — the CI JS gate is RED on this branch today.** The wave doc's "not a gate failure" was true only of its own ad-hoc gate (`.scratch-figcraft/gates.ps1:36`, `--ext .ts,.tsx`). | Phase 2 — **fix** the 4 errors + 15 warnings rather than ignore `designs/`, which would permanently drop lint coverage of the board generators. |
| **B12-7** | **NOT-A-CODE-FIX** (device pass) | "Proven by rule" means every gap equals the app's own token rule with **exactly one free variable** — the title's line count. The comparison script reads **only** the Podcasts screen and filter boards (`check-podcasts-board-vs-device.js:45-46`); there is no detail-board comparison. | Carried forward — device/measurement pass. |
| **B12-8** | **NOT-A-CODE-FIX** (device pass) | The scripts live **outside** the repo; **no** radio/live-TV sheet variant exists and nothing in `scripts/` or `designs/` measures a sheet. | Carried forward — device pass. |
| **B12-9** | **NOT-A-CODE-FIX** (intended) | The board's content is a **recorded snapshot** (`designs/penpot/podcasts.js:268-323`, *"read off the live Podcast Index on 2026-11-13"*); the generator pushes static shapes and never fetches. The wave doc records this as intended. | Closed — no change. |
| **B12-11** | **VALID** (dead) | `'categoryId'` is still in `FILTER_SEED_PARAMS` (`useSectionOptions.ts:21`), but of the three screens that call the hook, none can receive it: Podcasts' route type is `undefined`, Movies' deep link is bare `'movies'` and nothing navigates with params, and LiveTV — the one route that *can* carry it (`linking.ts:197`) — does not use the hook at all. | Phase 2. Note the trap: deleting the **type** field alone re-creates the "declared and ignored" defect; the correct direction is to make the param reachable. |
| **B12-12** | **VALID — but the premise is wrong** | `FilterSheet.tsx:515-519` (`toggleLabel`) and `:539-543` (`resetText`) use `fontWeight: '700'` with no family. Those **resolve correctly** — `AppText.tsx:82-86` merges `[color, typography[variant], style]`, so the effective style is family `'Inter'` + weight 700 → `fonts/Inter_bold.ttf`, and the font gate passes. The real defect is that the file **contradicts its own rule** 35 lines above (`:480-485`, *"the weight lives in the FAMILY key"*). The sheet is shared by **five** surfaces, so swapping to `inter.semibold` is a visible 700→600 change — a design decision, not a pure fix. | Phase 3 — the zero-visual-change form (`fontFamily: FONT_FAMILY.inter.bold` beside the existing weight), matching the `tokens.ts` idiom. |
| **B12-13** | **NOT-A-CODE-FIX** (owner + dependency) | The URL passes through untouched (`podcastIndex/adapter.ts:207,304` → `PodcastRow.tsx:51` → `MediaImage.tsx:121`); the thumb is **60×60 dp** and a page is **25 feeds** growing to 100. **Live measurement: the 25 covers total 11,083,213 B ≈ 10.6 MB for 60 dp thumbs** (the largest single cover is 4,197,769 B). | Carried forward — a resize proxy is a dependency **and** a privacy decision about which host sees the user's requests. |
| **B12-14** | **VALID — and "harmless" is only true of a debug build** | The app never rewrites the scheme. **Live today: 3 of 100** trending feeds carry `http://` artwork. Cleartext is `android:usesCleartextTraffic="${usesCleartextTraffic}"`, resolved by RN's Gradle plugin to **debug `true`, release `false`** (`AgpConfiguratorUtils.kt:39-42`); the repo does not override it and has no `networkSecurityConfig`; `targetSdk 36`. In a **release** build those covers are blocked by the platform and the row shows the placeholder tile permanently. | Phase 2 — upgrade the scheme at the adapter boundary. All three observed hosts answer https 200 (pwtorch 50,043 B; ytn 4,197,769 B; bbc 208,285 B — verified). |

Extra defects found by audit D: CI's JS gate is red (§2.4, B12-6); release builds block the
catalogue's cleartext artwork; `MediaImage` never resets its three-state machine when
`source` changes (`MediaImage.tsx:122` — `useState` with no effect keyed on `source`), so a
row whose artwork URL changes renders the new image over nothing; the first page pulls
**10.6 MB** of artwork for 60 dp thumbs on first paint.

---

## 3. Phase 1 — the code fixes

### 3.1 B13.1-4 — the Search page's IPTV leg (VALID → fixed)

`useAggregatedSearch.ts` now takes the scope and gates the IPTV leg on it:

```ts
export function useAggregatedSearch(
  query: string,
  debounceMs = 0,
  scope: SearchScope = 'all',
)
```

* `enabled: enabled && scopeShowsTV(scope)` — `scopeShowsTV` is a **new exported helper in
  `searchFilters.ts`** that asks `SCOPE_SOURCES`, the single owner of the scope→source
  mapping. The Search page no longer downloads 2.8 MB of TV catalogue for a Music search.
* `queryFn: ({signal}: QueryFunctionContext) => getIPTVCatalogue(signal)` — the
  catalogue fetch is now **abortable**, exactly like Live TV's. The context is annotated
  explicitly because `useApiQueries` types its queries through a tuple spread
  (`readonly [...QueriesOptions<T>]`), which does not contextually type the `queryFn`
  parameter.
* `SearchScreen.tsx` passes the scope.

**The page-level loading flag was deliberately NOT split** so the TV group does not block
the other sources: when the scope shows TV, the TV group is part of the answer, so waiting
for it is honest.

### 3.2 B13.5 — `FilterSheet.title` (VALID → fixed by deletion)

The prop was dead at all five call sites. It is **removed from the interface, the destructure
and every call site** (`LiveTVContent.tsx`, `RadioContent.tsx`, `BrowseLayout.tsx`,
`SearchScreen.tsx`). A doc comment in `FilterSheet.tsx` records *why* it was deleted and
*why it must not be rendered*: no board draws a sheet heading, so rendering it would make
8 boards wrong.

### 3.3 B13.7 — the retry pill's hit area (VALID → fixed)

`BrowseListFooter.tsx`'s `loadMoreRetry` gained `minHeight: 44, justifyContent: 'center'`.
The pill measured **28 dp** against the house floor of 44. The footer slot is
`minHeight: 56`, so nothing moves and no board draws the pill.

### 3.4 B13.11 — the Music deep link without `source` (VALID → fixed)

`navigation/types.ts`: `MusicDetail: {trackId: string; source?: 'jamendo' | 'audius'}`.
`MusicDetailScreen.tsx`: `const {trackId, source = 'jamendo'} = route.params;`.

The linking path is `music/:trackId/:source?` — the `source` segment is **optional**, so
`simbaplayer://music/42` yields `params = {trackId: '42'}` with **no `source` key at all**
(React Navigation only creates a param entry for a matched segment). The old code read
`source === 'jamendo'`, which was false, so it fell through to the **Audius** branch and
asked Audius for a Jamendo id → *"Track not found"*. The default is Jamendo because Jamendo
is the app's only real source (`shareService.ts:36` always writes a Jamendo source).

### 3.5 The Live TV share link (extra defect → fixed)

`LiveTVContent.tsx` shared `route: 'LiveTVScreen'` with a `categoryId` param — but
`LiveTVScreen`'s linking path parses **only** `categoryId`, so the link carried nothing
playable. It now mirrors the Radio twin: `route: 'SongScreen'`, `params: {fileUri, title,
source: 'iptv'}`.

### 3.6 The Radio / Live TV list inset (extra defect → fixed)

`LiveTVScreenNew/styles/index.ts` `listContent.paddingTop` was `spacing.sm` (8) where
Radio's is `spacing.lg` (16). Radio is the boarded twin
(`designs/penpot/music-radio.js:820` — stations at chip bottom + 12 + 16), so Radio's 16 is
the boarded value and Live TV's 8 was the drift. A comment cites the board line.

### 3.7 The font gate's 426-tag blind spot (VALID → fixed)

`scripts/check-font-resolution.js` was rewritten. The old gate resolved **582 of 660** tags
with the real font and **78 with the variant's default** — it could not see inside style
arrays, conditional style props, local `const` style objects, imported style modules or
conditional variants.

The new gate resolves **678** usages (tags + branch candidates) and exits 0. Its model is
the one React Native actually implements:

* RN merges **per property**; a style array merges **in order**; a conditional's branches
  are **alternatives**.
* A variant and a style that share a condition are **paired branch-by-branch**, so the
  gate never asks for fonts that are never rendered together.

Shipped fonts: Allura, Cormorant Garamond (+bold, +italic — **no `_bold_italic`**), Inter,
Inter Medium, Inter SemiBold, Inter_bold, JetBrains Mono, Manrope SemiBold, Manrope_bold
(11 files).

**Bite-check (done and reverted):** adding `fontFamily: FONT_FAMILY.inter.semibold` +
`fontWeight: '700'` to `EmptyState.titleCompact` makes the gate exit 1 and name
`EmptyState.tsx:77`. The probe is kept at
`X:/Development/SIMBA/.scratch-figcraft/probe-font-blindspot.js` and still reports
*"660 tags, 78 mis-resolved by the old gate"*.

---

## 4. The gates

Phase 1 gates — `pwsh -NoProfile -File 'X:/Development/SIMBA/.scratch-figcraft/gates.ps1'`:

```
tsc          exit=0
eslint       exit=0
boundaries   exit=0
fonts        exit=0
boards       exit=0
jest         exit=0
ALL GATES DONE
```

---

## 5. The phase plan

| phase | content | state |
|---|---|---|
| 1 | the font gate, B13.5, B13.7, B13.11, B13.1-4, the Live TV share link, the list inset | **done** (30bb2f7) |
| 2 | the cheap VALID code fixes: B12-6 (CI red), B12-14, B13-14, B13-17, A-01/A-02/A-03, CF-08, plus the extras | **done** |
| 3 | the fontWeight sweep — **corrected scope** — and the board pass that follows | **done** (the sweep; the board pass is §8) |
| 4 | B13-15 (the rename), B13-16 + B12-11 (the route params), CF-21, A-2, R3a/R3c/R3d, the footer's error | pending |
| 5 | B13-9 + B13-10 — `MusicDetailScreen` as a real detail screen, + a new board | pending |
| 6 | B13-3 / B13-4 / B13-13 — Radio + Live TV onto the shared shell, + the board redraw | pending |
| 7 | B13-12 — Audiobooks / Archive / Shows onto the shared shell (A-01 … A-31) | pending |
| 8 | the design items — B13-6, B13-1-2, B12-3/4, B12-7/8/9, B-11-4/7, B-11-2's board rebuild | pending |

---

## 6. Audits E and F

### 6.1 B-11-2 … B-11-7, R3, R4, R5, R6 (audit E)

| id | verdict | evidence | action |
|---|---|---|---|
| **B-11-2** | **VALID** (generator defect) | `designs/penpot/search.js:777-804` pushed the label BEFORE the pill; the plan's order IS the painting order (`build-penpot-app.js:1429-1432`) and the pill's fill is opaque — so the pill painted over its own label. The Movies board already paints the pill first (`movies.js:823-851`). | **Fixed** — the Search board now paints the pill first. The board itself is re-drawn in §8. |
| **B-11-3** | **INVALID** | The arithmetic says the two centres coincide: the list reserves `B + 56 + 12`; the footer's −68 puts the 56 dp wrap's bottom at `B`; the 18 dp caption is centred in it, so its line-box centre is at `B + 28` — and the FAB disc's centre is at `B + 28` too. The wave's "11 dp" was measured from **ink bands** (32 px ≈ a 13 dp cap-to-descender band, not the 18 dp line box) and mixes a spinner arc with text. | Closed — no change. A device re-measure of the **line boxes** would settle it. |
| **B-11-4** | **NOT-A-CODE-FIX** (design wave) | The band is `STATUS_INSET = 24`; `kit.js:62`'s `INSETS_TOP = 32` is still 8 dp over the device's 24. **The carried counts are stale:** the plan holds **82 boards**, of which **20 carry the 24 dp band** and **62 do not** — not "the other 67". | Carried forward — one decision for every board + a re-draw. |
| **B-11-5** | **NOT-A-CODE-FIX** (device proof) | The state exists (`BrowseListFooter.tsx:113-121`); `PodcastsContent.tsx:151-152` binds it. Nothing to fix in code. | Carried forward — a device proof. |
| **B-11-6** | **NOT-A-CODE-FIX** (device proof) + a copy nit | The sentence *"Showing {shown} of {total} movies — the archive stops paging here"* (`MoviesScreen/related/textContent.json:5`) is computed when `numFound > items.length`, which the **short-page** stop also produces (`useMoviesScreen.ts:196-197`) — and there the archive did *not* stop paging, so the sentence can be false. | Carried forward — the label needs to be derived from which stop rule fired. |
| **B-11-7** | **NOT-A-CODE-FIX** (Penpot pass) | The 4 Movies boards; the numeric read-back already passed. | Carried forward — a 100 %-zoom pass. |
| **R3a** | **VALID** | `BookmarksScreen.tsx:84` makes the count label the ONLY clear-all entry point (`useBookmarksScreen.ts:92-94`). `CONTENT_OWNERSHIP.md:330` asks for a separate named "Clear all bookmarks" control. | Phase 4. |
| **R3b** | **VALID** | `DownloadsScreen.tsx:84` — the row is a `View`, not pressable, so a finished file cannot be opened; and on a `done` record the action shows a **download glyph** labelled "Resume download" that calls `resumeDownload` → `downloadService.ts:484-496`, which **restarts** the download. | Phase 4 — a row-grammar change, not a one-liner. |
| **R3c** | **VALID** | The Library's `playlists` content mode still exists (`features/library/presentation/types/index.ts:2`, `localFilesConfig.ts:43-49`, `useLibraryScreen.ts:92,148-151`, `LibraryScreenContent.tsx:469,514-527,428-432`) although AllPlaylists owns that list and the same kind chips. | Phase 4 — the dropdown's "Playlists" entry must navigate to AllPlaylists in the same change. |
| **R3d** | **VALID** | `HistoryScreen.tsx:336-343` — a `RefreshControl` whose handler is `setRefreshing(true); requestAnimationFrame(() => setRefreshing(false))` over a local store that re-reads nothing. | Phase 4 — delete the control, the state and the handler. |
| **R4** | **VALID** (the Profile half is done) | `StatsScreen.tsx:37,78-111` reads the **persisted** 10-entry recent-history store for days/streak, and the **transient** `sessionStore` for playCounts/mediaLibrary. `sessionStore.ts:67` creates the store with no `persist` and its only writer is `features/recentHistory/index.ts:24` — so after a cold start the page says "Plays 0" next to a real day streak. | Carried forward — it needs a persisted, timestamped roll-up, not a screen change. |
| **R5** | **VALID** (a specific list, not a sweep) | The 68 named dead exports in `md/PROFILE_RC1_REFACTOR.md:280-291`, the 8 store keys and their setters, the Help FAQ answers, and 6 of 8 Bookmarks strings — all still present. | Phase 4 — deletion needs a jest run per removal (the rule is zero inbound refs across `src/` AND `__tests__/`). |
| **R6** | **VALID** | `@typescript-eslint/no-unused-vars` is off in two places (`.eslintrc.js:67` for tests, `:118` for the legacy surface) and the deferral comment says the V20 sweep never happened. Read-only run: **89 violations in 59 files**. | Carried forward — turning the rule on is 89 errors in 59 files. |

Audit E also found, outside the list: **Movies and Music give the shared footer the LIST's error, not the load-more's** (`MoviesContent.tsx:314`, `MusicContent.tsx:152` pass the whole query's error, while the Podcasts fix at `PodcastsContent.tsx:150` passes `pageError`) — so a first-page failure shows two error messages and the footer names a load-more that never started. The Movies `windowEnd` sentence can be false (the A-06 note above), and `sessionStore.ts:50-53`'s `incrementPlayCount` is dead.

### 6.2 CF-01, CF-03/04, CF-08, CF-12, CF-21, CO-05…CO-08, the iOS URL scheme (audit F)

| id | verdict | evidence | action |
|---|---|---|---|
| **CF-01** | **STALE** (fixed in `0507926`) | The Android chain is complete end-to-end: the manifest filter (`AndroidManifest.xml:105-110`) → `MainActivity : ReactActivity` → `linking.ts:58` → `AppContent.tsx:113-136`. | Closed — the residual is a device re-proof. |
| **CF-03** | **VALID** | `HomeHeader.tsx:274-277` sets `fontWeight: '700'` on `variant="h3"`, whose family is `Inter SemiBold` → RN resolves `fonts/Inter SemiBold_bold.ttf` → **not shipped** → the system font. | **Fixed** in the sweep. |
| **CF-04** | **STALE** (fixed in `5d274e0`) | `InternalHeader.tsx:127-135` has no `fontWeight`; the file's only three hits are comments. | Closed. |
| **CF-08** | **VALID** | `cacheService.ts:28`'s `getCacheSize` and its private `dirSize` have **no consumer** in `src/` or `__tests__`. `formatBytes` IS used. | **Fixed** — both deleted. |
| **CF-12** | **INVALID** | The value is mpv's own `slang` format; every reader splits it correctly, the Settings row renders **names**, and `und` already maps to "Default (auto)". | Closed. Changing the *default* is a product decision. |
| **CF-21** | **VALID** | `Avatar.tsx:107-109` draws `<SvgIcon name="music"/>` for the no-initials case, so every signed-out user sees a media glyph as their account avatar. | Phase 4 — reuse the HomeHeader **monogram** treatment; a new person glyph would be an asset + board wave. |
| **CO-05** | **INVALID** (the chain is intact) | Profile → About → Privacy/Terms → `RootNavigator` → the real policy screens. There is **no first-run consent prompt anywhere** — nothing to accept, so the only gap is reachability. | Closed — a device proof. |
| **CO-06** | **NOT-A-CODE-FIX** | "a judgement call, not a measurement". The Profile now has **21** `SettingsRow`s across 8 sections. | Carried forward — a device look + a design call. |
| **CO-07** | **NOT-A-CODE-FIX** (placement) | The policy lives on the page it affects, deliberately (`CONTENT_OWNERSHIP.md:335,377`), and the chips are real and persisted. | Carried forward — but it exposed a real defect, below. |
| **CO-08** | **STALE** (fixed in `0507926`) | `useDownloadsSync.ts:50-54,70-91` — one `ensureLoaded().then(hydrate).catch()`, one `subscribe`, a `release()`. | Closed. |
| **the iOS URL scheme** | **VALID** | `ios/CinePlayer/Info.plist` has **no** `CFBundleURLTypes`, and `AppDelegate.swift` has no `application(_:open:options:)` — so registering the scheme alone would make iOS open the app and **drop the link**. The wave doc also points at the wrong path (`ios/SimbaPlayer/`; the target was renamed to `CinePlayer`). | Carried forward — it must be plist + AppDelegate + the module name (`AppDelegate.swift:27` starts RN with `"CinePlayer"` while the JS registers `"SimbaPlayer"`), then one macOS build. It cannot be compiled on this host. |

Audit F also found, outside the list: **7 live font fallbacks** on Android (the gate's blind spot hid all of them), **the download auto-delete policy has two owners** — the store's default is `0` ("Off") but the service's own default is `5`, and the store's value only reaches the service when the **Downloads page is mounted**, so on a fresh install the app silently keeps 5 completed downloads while the chip says "Off"; and the service's **age** half (30 days) is always enforced with no UI at all. Plus: `MediaImage` never resets its three-state machine when `source` changes; five orphan SVG assets; `linking.ts:74`'s mis-indented `Stats: 'stats',`.

---

## 7. Phases 2 and 3 — the fixes

### 7.1 B12-6 — CI's JS gate was RED on this branch

`eslint .` exits **1** with 4 errors + 15 warnings, and `.github/workflows/ci.yml:64` runs
`npm run lint -- --max-warnings 0`. The wave doc filed this as "not a gate failure" because
its own ad-hoc gate only linted TS/TSX.

The fix is to make the generators clean, not to hide them — `ignorePatterns: ['designs/']`
would drop lint coverage of exactly the files the design waves edit. A scoped override for
`designs/**/*.js` turns off `no-restricted-syntax` (a Penpot payload's `color:` field is
Penpot's RPC field name, and the generators are the other END of the token rule — they
*read* `src/theme/tokens.ts`) and sets `env: {node: true}` (`Buffer` is not defined under
the RN config, and three generators use it).

The 15 warnings were fixed at the source: two shadowed names renamed, five unused bindings
removed, and the three bitwise operations in the TrueType cmap parser kept with an explicit
`eslint-disable-next-line no-bitwise` (they ARE the algorithm).

**One ESLint detail worth recording:** the description syntax (`-- why`) is only honoured in
a **block** comment. In a `//` line comment the directive does not apply, and
`eslint-comments/no-unused-disable` then removes it as "unused" — which is exactly what
happened on the first attempt. The probe that settled it is recorded in the commit.

### 7.2 B12-14 — the release build blocked the podcast artwork

The app never rewrote the scheme. **3 of 100** trending feeds carry `http://` artwork.
Cleartext is `android:usesCleartextTraffic="${usesCleartextTraffic}"`, resolved by RN's
Gradle plugin to **debug `true`, release `false"`** — so in a release build those covers are
blocked by the platform and the row shows the placeholder tile for good.

`podcastResultFromRaw` and `podcastEpisodeResultFromRaw` now upgrade the scheme at the one
boundary where the app produces the URL. When the host serves https it works in release
too; when it does not, the image fails exactly as it already does — the placeholder — so it
is never worse.

### 7.3 B13-14 — the ten retry constants that all lied

Ten constants, each with the comment *"hook layer honors this constant"*. **Not one was
imported by any hook.** The retry that actually happened was the app-wide TanStack default
`DEFAULT_RETRY = 2` — a different mechanism that merely shares the number.

**36 queries across 23 hook files** now declare their source's policy explicitly.
`QueryProvider.tsx`'s `DEFAULT_RETRY = 2` stays as the fallback for queries with no
explicit policy (the LRC query).

Every constant is 2 and the app-wide default was also 2, so **this is a zero-behaviour-change
refactor**: it moves the policy from an accidental global default to an explicit per-source
declaration. The one exception is `useWeather.ts`, whose `retry: false` was replaced by
`retry: WEATHER_RETRIES` — the cascade catches its own throws and returns `null`, so the
queryFn effectively never throws and TanStack never retries either way.

### 7.4 A-01 / A-02 / A-03 — the LibriVox contract

Measured against the live API on 2026-11-17, not read from a doc:

| the app sent | the API did |
|---|---|
| `?q=alice` | **IGNORED** — 200 with the first books in the catalogue. The Audiobooks search never searched. |
| `?title=alice` | 404 — an exact match, and no book is titled exactly "alice". |
| `?title=^alice` | **the Alice books** — `^` is LibriVox's prefix operator. |
| `?subject=alice` | IGNORED, like `q`. |
| `?page=3` | IGNORED — the feed pages with `?offset=`, which counts ITEMS. |
| `?offset=3&limit=3` | books 4..6 ✓ |
| `?genre=fiction` | 500 — and `?genre=^mystery` 500s too, which is why the genre path keeps a fallback. |

So: the searches are now **prefix** matches (`title=^…`, `author=^…`, `genre=^…`), the
paging is `offset = (page − 1) × limit`, and **a 404 is "no books match", not a failure** —
one `librivoxSearch` helper owns that rule, because treating a 404 as an error would turn
every empty search into a failure state.

The free-text search does the title search first and the **author** search only when the
title search found nothing, because the field says *"Search titles or authors…"* and
LibriVox cannot OR across two fields in one request (it answers 500). The author search
therefore only costs a request when the title search missed.

Five new tests pin the contract: the title prefix and the absence of `q`, the author
fallback, `offset` instead of `page`, the 404 → empty rule, and that a 500 is still a
failure.

### 7.5 B13-17 — the dead code

Deleted, after verifying each has no consumer:

* `API_CONFIG.jamendo` — zero references (the Jamendo adapter has its own config).
* `musicCategories.ts`'s `icon` / `genre` / `image` — only `id` and `name` are read (the
  browse sheet's rows and the active chip's lookup).
* **the ten per-genre music cover plates** — 595,495 bytes of dead bundle weight. The Home
  rail's one music card uses `CATEGORY_COVERS.music.all`; the other ten were reachable only
  from the field nothing read.
* **six dead re-exports in EACH of the three screen type barrels** (`MusicScreen/types`,
  `MoviesScreen/types`, `PodcastsScreen/types`) — their real consumers import the types from
  `_shared/` directly. (The carried list named only the Music one; the same six were dead in
  the other two.)

`CF-08`'s `getCacheSize` + `dirSize` went the same way.

### 7.6 The fontWeight sweep — the CORRECTED scope

The carried rule was *"never a `fontWeight` prop"*. That is **not** the app's rule, and
following it would have broken the bold faces: `theme/tokens.ts:416-433` pairs family +
weight on every variant, and `'Inter'` + `'700'` is exactly what selects
`fonts/Inter_bold.ttf`. What actually breaks is:

1. a **sub-700 weight on a plain family** (`'Inter'` + 600 → `fonts/Inter.ttf` = the 400
   Regular), and
2. a **700 on a baked-weight family** (`'Inter SemiBold'` + 700 →
   `fonts/Inter SemiBold_bold.ttf`, which does not ship → the system font).

**55 sites across 30 files**, all fixed: the weight moved into the family key
(`FONT_FAMILY.inter.semibold` / `.medium` / `.bold`), exactly as `src/constants/fontFamily.ts`
and the typography tokens already document.

### 7.7 The font gate — it was STILL blind after the rewrite

This is the most important correction of the wave. The Phase 1 rewrite closed the
style-array, conditional-style and imported-style blind spots, but three holes remained,
and the gate was reporting **0 findings while 224 of 660 tags (34%) were audited with a
different font than the one rendered**:

1. **The literal-variant regex was broken.** `/\svariant=\{?['"]([A-Za-z0-9_]+)['"]\}/`
   requires a closing `}` after the quote, so the dominant unbraced form `variant="h3"`
   never matched — **606 of 660 tags were audited as AppText's `body1` default**.
2. **The array path threw the fonts away.** `arrayCandidates()` returns merged **objects**,
   and `main()` merged them again as strings — which stringified to `"[object Object]"`, so
   every `fontFamily`/`fontWeight` inside a style array was discarded. **32 of 66
   array-style tags carried a font prop that was dropped**, including the very case the
   rewrite's own doc comment claimed to handle.
3. **The report dropped the duplicates.** It deduped by `family|weight|style` and then
   **skipped** the duplicates, so only the first occurrence of each missing font was ever
   listed.

Plus a fourth, found later in the wave: **only the FIRST `StyleSheet.create(` per file was
parsed**, so a second sheet (a `swipeStyles`, a themed sheet) was invisible — it hid one
more lost weight.

All four are fixed. The gate now also reads each shipped TTF's **OS/2 `usWeightClass`**,
so it can tell "the file exists" from "the file is the RIGHT face" — which is the only way
to catch class 1 above (a `?q=`-style silent wrong-weight). The corrected gate found the
**7 real fallbacks** the blind gate reported none of, and then the 55-site sweep.

The gate's two finding classes are now:

```
FALLBACKS (these render in the system font):
  Inter SemiBold + weight 700 -> fonts/Inter SemiBold_bold.ttf MISSING
      src\screens\Genre\components\GenreScreen.tsx:150
  Inter + weight 600 opens Inter.ttf, whose weight is 400 — the 600 is LOST
      src\app\ErrorBoundary.tsx:104
```

### 7.8 The two tests my own changes broke

* `__tests__/paginatedAdapters.test.ts` asserted the artwork URL came out as `http://x/i`.
  It is `https://x/i` now — the input stays `http://` so the test still proves the upgrade.
* `__tests__/screens/MoviesScreen/MoviesPullToRefresh.test.tsx` — "clears the spinner even
  when the refetch fails". The harness's QueryClient sets `retry: false`, so the old mock
  only had to fail the FIRST attempt; with the explicit `retry: 2` the later attempts fell
  through to a stub that resolves nothing and **the refetch never settled** — the spinner
  stayed on for 30 s. The mock now fails every attempt, which is what "the source is down"
  means, and the wait covers the retry backoff.

**That second one is a property of the harness, not of the app**: the app's QueryProvider
already retried twice, so the production behaviour is unchanged.

---

## 8. Phase 4 — the code fixes (the screens, the policy, the deep links)

Phase 4 is the batch of carried items that turned out to be **code**, not design: the
rename, the three content-ownership defects, the footer's error, the artwork's state
machine, the download policy's second owner, and the route params.

### 8.1 B13-15 — the `ScreenNew` folders are gone

`src/screens/RadioScreenNew/` and `src/screens/LiveTVScreenNew/` are now
`src/screens/RadioScreen/` and `src/screens/LiveTVScreen/` — **18 files**, 10 import/name
sites, and the **one runtime path** an import grep cannot find
(`__tests__/app/ZustandSelectorStability.test.ts:312` builds the path with
`path.join('screens', 'RadioScreen', 'hooks', 'useRadioBrowser.ts')`).

The route names, the deep-link paths and the Penpot registry are untouched: the rename is a
folder name, not a route name.

Two things the rename did **not** cover, and must not be claimed as covered:

* `.verification/index.android.bundle` and `.verification/index.android.final.bundle` are
  tracked, pre-built JS bundles and still contain the old names. They are build artefacts,
  not source; regenerating them is a bundling step, not a rename.
* `md/`, `graphify-out/` and `scripts/` still mention the old names in prose.

### 8.2 R3d — History's pull-to-refresh did nothing

`HistoryScreen.tsx` carried a `RefreshControl` whose handler was
`setRefreshing(true); requestAnimationFrame(() => setRefreshing(false))` over a local store
that re-reads nothing — the same reasoning that already removed Home's pull-to-refresh. The
control, the state and the handler are gone.

### 8.3 R3a — the count that was a delete button

`BookmarksScreen.tsx` rendered the bookmark count as the header's **right action**, and that
action's press was `handleClearAll` → a confirm dialog → `clearAllBookmarks()`. A user who
tapped "12 saved" because it looked like information was offered a wipe of every bookmark
they had. **A count must not be a destructive control** (`md/CONTENT_OWNERSHIP.md` §6.3.1).

The count is now the header's **plain subtitle**, and the destructive control is a **named**
one — a "Clear All" button in the error colour, with the accessible name "Clear all
bookmarks".

That needed one change in the shared header: `InternalHeader`'s `rightAction.label` branch
existed but **the slot was a fixed 36 dp circle**, so a label was always drawn spilling out
of a circle meant for an icon (the Folder Browser's "Select" / "Cancel" had the same
problem). The slot now sizes to its own label — a pill — and the title's reserved gutter
grows with it, symmetrically, so the title stays centred in the full header width. The
icon case is unchanged.

### 8.4 R3b — a finished download could not be opened, and its action re-downloaded it

Two defects in one row (`md/CONTENT_OWNERSHIP.md` §6.3.2):

* the row body was a plain `View`, so a completed download could not be played from the
  list; and
* on a `done` row the first action button drew a **download** glyph labelled "Resume
  download" and called `resumeDownload` — which **restarts the transfer**, re-downloading a
  file that is already on disk.

Now: the row body is pressable **only** when the record is `done`, and it plays the **local**
file (`record.localPath`, never the remote `record.uri`) through the app's own launch seam
(`useResumeAwareLaunch().openPlayer` + `resolveStreamType`) — the same path the Library's
row uses. The first action on a finished row is a **play** action. `handlePauseResume` now
pauses a running transfer and resumes a paused one, and **nothing else**, so a `done` record
cannot reach `resumeDownload` by a second route.

If the file is gone from the device, the row says so ("This file is no longer on the
device.") and deletes nothing — the manifest is the app's record of what it owns, and the
row's own delete action is how a stale row goes away.

**12 new tests** (2 suites) pin the row grammar and the launch.

### 8.5 R3c — the Library's "Playlists" content mode

The Library rendered the playlist list, the same kind chips **and** a second "+" create
affordance — while All Playlists owns all three. The mode is gone; the Library's title
dropdown keeps two entries and **"Playlists" navigates to All Playlists**.

The dropdown's sheet header changed from "Select View" to **"Go to"**, because one of the
two entries now leaves the page — the old words would have been a lie.

With the mode gone, `LibraryPlaylistsSegment` (the component), its test and the long-press
test that covered its pin gesture went with it: they tested a screen the app no longer has.

### 8.6 The footer said "Couldn't load MORE" for a load-more that never started

Movies and Music passed the **whole query's** error to the shared footer, while Podcasts
passed the **page** error. So a first-page failure showed the error card **and** the footer's
retry pill — the same failure twice, and the pill named a load-more that never started.

Both screens now carry a `pageError` — the error of the failed NEXT page
(`q.isFetchNextPageError`) — and the footer gets that one. One failure, one message.

**The Movies `windowEnd` sentence could be false.** "Showing {shown} of {total} movies — the
archive stops paging here" was computed from `numFound > items.length`, which a **short
page** also produces — and there the archive did not stop paging, the source simply ran out
of rows. The sentence is now derived from **which stop rule fired**: only the archive's own
10,000-row paging cap (`IA_MAX_RETRIEVABLE`, now exported by the hook that owns the rule)
may claim that the archive stopped.

### 8.7 `MediaImage` never reset when the artwork changed

The component owns a three-state machine (pending / loaded / failed) and the state belonged
to **one** artwork — but nothing keyed it on the `source`, so a row whose artwork URL
changed rendered the new image over **nothing**. The machine now restarts when the source
changes, using React's own "adjust the state when a prop changes" pattern (the reset
happens during the render, so the new artwork never paints once with the old state).

The comparison is on the source **key** (the URI), not the `source` object: a caller that
builds `{uri}` inline gets a new object every render, and comparing objects would reset the
state on every render.

### 8.8 A-2 — the download policy had two owners

`downloadService` owned the policy (it persists it and applies it) and its default was
**5**. The settings store owned a second copy (`autoDeleteDownloads`, default **0**), and
that copy only reached the service **when the Downloads page was mounted**. So on a fresh
install the app silently kept the last 5 finished downloads while the chip said "Off" — and
the chip said "Off" until the user happened to open the page.

The service is now the **one** owner: its default is **0** (the value the app shows), the
screen reads the value from the service once the manifest has loaded, and the chip's press
writes straight to the service. The settings store's field, setter and persisted key are
gone (the key is dropped in the store's `merge`, exactly as the retired `hasLaunched` key
is).

The policy's **age** half — 30 days, always enforced — had no UI at all. The page now says
both halves out loud.

### 8.9 B13-16 / B12-11 — the route params

The carried claim was *"five route params are declared but no linking path can carry them"*.
**That claim is wrong**, and the correction matters: React Navigation puts **every** query
param on the route it resolved (`@react-navigation/core`'s `getStateFromPath.tsx` —
`parseQueryParams()` collects the whole query string and merges it into the focused route's
params). `simbaplayer://movies?categoryId=5` reaches MoviesScreen today.

What was actually wrong was four other things, all now fixed:

1. **The favourites deep links were broken.** React Navigation matches the **first** config
   whose regex fits (the loop over the configs returns on the first match), and
   `radio/:initialTab?` and `tv/:categoryId?` were declared **before** `radio/favorites` and
   `tv/favorites` — so both favourites pages were swallowed by the browse screen's
   parametric path. The static paths are now declared first.
2. **`RadioScreen.initialTab` was dead.** The Radio screen replaced the old TabView screen
   and is **tab-less**; the route declared five tab values, the config parsed one, and
   nobody read it. The path is now the bare `radio`, and the param the screen **does** read
   (`initialTag`, the genre chip it starts on) is a decoded query param.
3. **`AudiobooksScreen.initialTab` was dead** for the same reason (the three-tab layout was
   dropped in V18.11.3), and the config parsed `genre` while the screen read `initialGenre`
   — so the genre could never arrive. The parse key is now the name the screen reads.
4. **Six params a screen reads were never decoded**: Music's `genre`, Movies' `categoryId`,
   Shows' `initialGenre`, Archive's `query`, Movie Detail's `title` and All Audio's
   `filter`/`sort`. A query param that is not in the route's `parse` map arrives exactly as
   it was typed — `?genre=Rock%20Roll` reached the screen as the literal string
   "Rock%20Roll".

`shareService.ts`'s route → path table is kept in step (`RadioScreen` → `radio`).

**Seven new tests** in `__tests__/navigation/navigationGraph.test.ts` resolve the real paths
against the real parser: the two favourites links, the browse screens, the decoded query
params, and the absence of the dead tab promises in the nav types.

### 8.10 CF-21 — the Avatar's fallback

The no-initials branch drew a music glyph; the Home header's signed-out treatment draws a
**monogram**. The branch now renders the same monogram in the same `AppText` treatment
(`FONT_FAMILY.inter.semibold`, `colors.text.secondary`), and the `SvgIcon` import is gone.

---

## 9. Phase 5 — the Music row opens the track's page

### 9.1 B13-9 — the decision, and what it broke

`MusicDetailScreen` existed, was routed, and was **unreachable from a tap**: the Music list's
row was the play action, so a track had no page of its own. The carried item offered three
answers — keep-and-fix, wire, or delete — and the **owner's decision was to promote it to a
real detail screen**.

That is a grammar change, so it was made carefully:

* the Music row now **opens the track's page** (`navigate('MusicDetail', {trackId, source})`);
* the **play action lives on the detail screen**, where the Movie and Podcast details keep
  theirs; and
* **no trailing play button was invented.** The row used to be the play action and now it is
  the navigation, so a row that carried both would be two actions in one target — the same
  mistake the Music board's own comment warned about ("a second affordance inside it read as
  a button that did nothing").

The deep link keeps working: `source` is optional and **defaults to `'jamendo'`** (B13.11), so
an old `simbaplayer://music/123` still resolves.

### 9.2 B13-10 — the six defects the old screen carried

| id | the defect | now |
|---|---|---|
| M-07 | four bare `fontWeight` props | the weight lives in the family key, like every other style |
| M-09 | hand-rolled loading and error states | the shared `Placeholder`, inside the list |
| M-11 | the title drawn **three** times | drawn **twice** — the header and the hero — like the Movie detail |
| M-12 | a `FlatList` inside a `ScrollView` | **one** list: the hero is its `ListHeaderComponent`, the states its `ListEmptyComponent` |
| M-13 | the launch was the pre-V21 `openPlayer`, unawaited | the typed `usePlay()` facade, awaited, with the five typed failure messages |
| M-28 | `source` sat in the play handler's deps unread | gone |

The share action moved to the **header** (the Movie detail's treatment). It used to be a third
button in the actions block, which made three buttons for two actions.

The screen's **second duration formatter** is gone: `formatDuration` comes from
`utils/timeAgo`, the app's one. A duration of zero means "unknown", so the badge is not drawn
at all rather than drawn empty.

### 9.3 The All Audio list honours its route params

`AllAudioScreen` declared `{filter?: string; sort?: string}`, and the app **sent** both:

* the Artist screen's "view all tracks" sent `filter: artistName`, and the page opened
  showing **every track on the device**; and
* the Library's "View All Artists" sent `sort: 'artist'`, and the page opened **sorted by
  title**.

A param the screen ignores is a promise the app does not keep. The hook now reads both — the
artist filter case-insensitively, exactly, because the caller sends the name it knows the
track by.

**One extra fix, found by writing the test.** The artist sort compared the artists only, so
two tracks by the same artist kept the **device's scan order** — the list's order would change
with the folder the media happened to be found in. The comparator now breaks the tie on the
title.

### 9.4 A note for the next person writing a jest mock

The All Audio suite's fixture is built by a `makeTrack(...)` helper rather than an object
literal, and that made jest's **hoist plugin** refuse the file: the plugin lifts the
`jest.mock` calls above the binding and then refuses to let a factory close over an
out-of-scope variable whose name does not start with `mock` (or whose initialiser is not a
pure literal). The fixture is named `mockTracks` for that reason — the prefix is the
exemption, and renaming it back breaks the suite.


