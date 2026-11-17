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
| 1 | the font gate, B13.5, B13.7, B13.11, B13.1-4, the Live TV share link, the list inset | **done** |
| 2 | the cheap VALID code fixes: B12-6 (CI red), B12-14, B13-14, B13-15, B13-16 + B12-11, B13-17, B13-19, A-01/A-02/A-03 | pending |
| 3 | the fontWeight sweep — **corrected scope** — and the board pass that follows | pending |
| 4 | B13-9 + B13-10 — `MusicDetailScreen` as a real detail screen, + a new board | pending |
| 5 | B13-3 / B13-4 / B13-13 — Radio + Live TV onto the shared shell, + the board redraw | pending |
| 6 | B13-12 — Audiobooks / Archive / Shows onto the shared shell (A-01 … A-31) | pending |
| 7 | the design items — B13-6, B13-1-2, B12-3/4, B12-7/8/9, B-11-4/7 | pending |
| 8 | the E and F audit slices (B-11-*, R3–R6, CF-*, CO-*, the iOS URL scheme) | pending |
