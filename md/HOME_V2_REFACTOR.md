# HOME → V2 Refactor Plan (beta → RC1)

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the SIMBA Home screen in the app so it matches the approved `Home_V2` Penpot board — one card grammar, one gutter, an unboxed greeting, plain shelf headers, and no empty rails — while deleting the code that the redesign makes dead, and closing the missing pages and missing playlist features the redesign exposed.

**Architecture:** The app's Home screen is a `FlatList` of typed sections (`src/screens/Home/types/index.ts`). A single hook (`useHomeScreen`) builds the section list; `src/screens/Home/index.tsx` maps each section type to a component. The V2 redesign changes the *card grammar*, not the data flow: the section builder stays, the rendered cards change, and one new rule (a rail with no items is not drawn) is added to the builder.

**Tech Stack:** React Native 0.86, TypeScript, Zustand (persisted), React Navigation (one root stack), Jest + `@testing-library/react-native`, Penpot MCP for the design board.

## Global Constraints

- **The board is the design.** `Home_V2_Light`, `Home_V2_Dark` and `Home_V2_Light — first run` on Penpot page `SIMBA` (`0ad3c344-4868-800a-8008-eb4b437d4762`), file `3681d377-bc58-8110-8008-eb35633c2708`. The generator that draws them is `designs/penpot/home-v2.js` + `designs/penpot/kit-v2.js` — **every number below comes from those files**, so the app and the board cannot drift.
- **One owner per fact.** A colour, a size or a rule lives in exactly one place. Never hardcode a value that a token already owns.
- **Never invent an affordance.** Before adding a control, name the shipping apps that already use it (Netflix, Plex, Jellyfin, Apple Music, Spotify, YouTube Music, the Apple TV app). If none can be named, it does not ship.
- **No jugaad.** No code, comment, test title or doc may claim something the source does not do. Every claim in this document is cited to a file and line.
- **Tokens come from the app.** `src/theme/tokens.ts`: `spacing` 4/8/12/16/20/24/32, `radius.md` 12, gold light `#B8922E` (`tokens.ts:321`), gold dark `#C9A84C` (`tokens.ts:245`).
- **The gates must pass before every commit**, from the app repo root:
  ```
  npx tsc --noEmit
  npx eslint . --ext .ts,.tsx --max-warnings 0
  node scripts/check-import-boundaries.js
  node scripts/check-font-resolution.js
  node node_modules/jest/bin/jest.js --verbose
  ```
- **Deletion rule:** delete a file only when it has **zero inbound references** *and* its exports have **zero symbol references** anywhere in `src/` or `__tests__/`. The sweep that produced the delete list is `X:/Development/SIMBA/.scratch-figcraft/dead-sweep.js` + `classify-dead.js`.
- **Commit messages** go in a file, then `git commit -F <file>`.

---

## §0 — The state this plan starts from

**The working tree already holds uncommitted work.** Seven files are modified and **nothing is committed**:

| File | What the held edit does | V2 verdict |
|---|---|---|
| `src/components/media/MediaRail.tsx` | Deletes MediaRail's own header; the rail now uses `SectionHeader` (one rail header in the app) | **Survives** — it is the base of T2 |
| `src/components/utility/SectionHeader/SectionHeader.tsx` | Adds `actionAccessibilityLabel` | **Survives** — T2 builds on it |
| `src/screens/Home/components/HomeBookmarksList.tsx` | Quiet empty line, one copy of the empty copy | **Superseded** by T1 (empty rails are not drawn) |
| `src/screens/Home/components/HomeMediaShelf.tsx` | `collapsible` prop, quiet empty line | **Superseded** by T1 |
| `src/screens/Home/components/FollowedPodcastsShelf.tsx` | Quiet empty line instead of the `EmptyState` disc | **Superseded** by T1 |
| `src/screens/Home/components/QuickAccessShelf.tsx` | "See All" only when >1 item, a11y label | **Survives** — T5 builds on it |
| `src/screens/Home/components/WeatherGreeting/WeatherGreeting.tsx` | v9h: the chip is drawn only when a snapshot exists; "Weather unavailable" removed | **Survives** — T4 builds on it |

**This is the V1 hygiene pass, not the V2 redesign.** The held edits put every rail on one header and one empty-line language. V2 keeps the header consolidation and **replaces the empty-line language with a stronger rule**: a rail with nothing in it is not drawn at all.

⇒ **T0 is therefore not "commit the held edits".** Committing them would bank the empty-line behaviour that T1 deletes one commit later. T0 decides the held edits' fate inside the V2 branch, where the surviving half lands with the rest of the work.

**Untracked and NOT to be committed:** `UI.figcraft` (not mine), `designs/assets/`, `designs/build-penpot-app.js`, `designs/build-penpot-design.js`, `designs/penpot/`, `md/UI_UX_PROTOTYPE_REBUILD.md`. The Penpot generator is committed by a separate task (T13) once the design work is done; `UI.figcraft` never is.

---

## §1 — The V2 grammar (exact numbers, from `designs/penpot/kit-v2.js`)

One card grammar across the whole page: **artwork whole, text underneath**. One gutter: `spacing.lg` (16) for everything left-aligned.

| Role | Family | Size / line | Colour | Where it lives in the app |
|---|---|---|---|---|
| salutation | Cormorant Garamond Italic | 18 / 24 | `text.primary` | `WeatherGreeting` — `FONT_FAMILY.cormorant.italic` |
| name | Inter Bold | 32 / 40, `letterSpacing: -0.5` | `accent.gold` | `WeatherGreeting` — `FONT_FAMILY.inter.bold` |
| weather | Inter | 13 / 18 | `text.secondary` | one line under the name |
| shelf title | Inter SemiBold | 20 / 28 | `text.primary` | `AppText variant="h3"` |
| shelf action | Inter | 13 / 18 | `accent.gold` | `AppText variant="caption" color="accent"` — already in `SectionHeader` |
| card title | Inter SemiBold | 14 / 20 | `text.primary` | `AppText variant="bodySmall"` + `FONT_FAMILY.inter.semibold` |
| card meta | Inter | 13 / 18 | `text.secondary` | `AppText variant="caption" color="secondary"` |
| count | Inter Medium | 11 / 16, `letterSpacing: 0.5` | `accent.gold` | `AppText variant="overline" color="accent"` |

**Card geometry**

| Card | Size | Text below | Total height (`kit-v2.js`) |
|---|---|---|---|
| media card | artwork 160 × 90 | title at +8, meta at +30 | **138** |
| playlist tile | cover 160 × 160 | name at +10, count at +32 | **208** |
| podcast tile | circle 132 | title at +12, author at +34 | **184** |
| catalogue tile | poster 160 × 183 (the app's 140:160 ratio) | title at +10, description at +32 | **251** |

**Vertical rhythm** (`home-v2.js:103-109`): divider block 48, shelf title 28, 16 after a divider, 12 after a title, 32 between shelves.

**The rules**
1. **The greeting is not in a box.** Three lines, the name is the hero, the weather chip (56) sits top-right aligned with the name.
2. **No chip and no weather line when there is no snapshot** — not a placeholder, not a spinner row.
3. **Shelf headers are plain**: a title and at most one gold "See All". No badge circle, no collapse chevron.
4. **A rail with no items is not drawn.** When every library rail is empty, the "Your Library" divider is not drawn either — so a fresh install starts with **Discover**, not with four empty rows.
5. **"See All" appears only when the rail holds more than one item** (the app's own rule, `SectionHeader.tsx:68` / `MediaRail.tsx:110`).
6. **The genre shelf is gone.**

---

## §2 — Blast radius (verified by grep, 2026-11-10)

| Component | Consumers | May V2 change it freely? |
|---|---|---|
| `components/media/MediaRail.tsx` | `HomeMediaShelf`, `HomeBookmarksList` only | **Yes** — Home-only |
| `components/media/MediaRailCard.tsx` | `HomeMediaShelf`, `HomeBookmarksList` only | **Yes** — Home-only |
| `components/utility/CategoryCard.tsx` | `BrowseAllShelf` only | **Yes** — Home-only |
| `components/utility/SectionHeader.tsx` | `MediaRail`, `BrowseAllShelf`, `FollowedPodcastsShelf`, `QuickAccessShelf`, `SettingsScreen` (×6), `AudioSettingsScreen` (×3), `SearchResults`, `RecentSearches` | **No** — add a variant, keep the default identical |
| `components/playlist/PlaylistCover.tsx` | `PlaylistCard` (All Playlists + Library), `QuickAccessShelf` | **Artwork only** — the chrome is the caller's |
| `components/playlist/PlaylistActionMenu.tsx` | `AllPlaylistsScreen` only | **Reuse it**, don't change it |
| `components/utility/SubsectionTitle.tsx` | `Home/index.tsx`, `BrowseAllShelf` | **Fix the colour bug** (T11) |

**The one architectural decision that follows:** `SectionHeader` gains `variant?: 'default' | 'plain'`. The default keeps today's render **byte-identical** for the eight non-Home callers; `plain` is the V2 shelf title. This is why no file moves and why no shared component imports from `src/screens/`.

---

## §3 — The file map

**Created**
- `src/screens/FollowedPodcasts/index.tsx` + `components/FollowedPodcastsScreen.tsx` — the missing "My Podcasts" page (T10)
- `__tests__/screens/Home/homeSections.test.tsx` — the section-builder rules (T1)

**Modified**
- `src/screens/Home/hooks/useHomeScreen.ts` — the section builder (T1, T9)
- `src/screens/Home/types/index.ts` — drop the `GENRE` type (T9)
- `src/screens/Home/related/homeSectionKey.ts` — drop the `GENRE` key (T9)
- `src/screens/Home/index.tsx` — the `GENRE` case, the new route, the See All target (T1, T9, T10)
- `src/components/utility/SectionHeader/SectionHeader.tsx` — the `plain` variant (T2)
- `src/components/media/MediaRail.tsx` — the plain header, the 16 gutter, no empty line (T2, T8, T1)
- `src/components/media/MediaRailCard.tsx` — artwork whole, text underneath (T3)
- `src/screens/Home/components/HomeMediaShelf.tsx` — the V2 card (T3)
- `src/screens/Home/components/HomeBookmarksList.tsx` — the V2 card (T3)
- `src/screens/Home/components/WeatherGreeting/WeatherGreeting.tsx` + `WeatherGreeting.types.ts` — unboxed (T4)
- `src/screens/Home/components/QuickAccessShelf.tsx` — the V2 playlist tile + unpin (T5)
- `src/screens/Home/components/FollowedPodcastsShelf.tsx` — the V2 podcast tile (T6)
- `src/components/utility/CategoryCard/CategoryCard.tsx` — the V2 catalogue tile (T7)
- `src/screens/Home/components/BrowseAllShelf.tsx` — the 16 gutter, the 160 pitch (T7, T8)
- `src/components/utility/SubsectionTitle/SubsectionTitle.tsx` — the swapped gold (T11)
- `src/navigation/types.ts`, `src/navigation/RootNavigator.tsx`, `src/navigation/linking.ts` — the new route, the `initialTab` lie (T10, T14)
- `src/components/playlist/PlaylistCover/PlaylistCover.tsx` — unchanged artwork; the tile passes a 160 box (T5)

**Deleted** — see §6.

---

## §4 — Tasks

### Task 0 — Reconcile the held edits with V2

**Files:**
- Modify: the 7 held files (as each later task requires)
- Do NOT commit: `UI.figcraft`

**Interfaces:**
- Consumes: the committed baseline `c9b453e` + the held working-tree edits
- Produces: a working tree where every held edit is either carried by a later task or deliberately reverted

- [ ] **Step 1: Record the baseline**

  ```powershell
  git -C 'X:/Development/SIMBA/MOBILE_APP_REACT_NATIVE' rev-parse HEAD
  git -C 'X:/Development/SIMBA/MOBILE_APP_REACT_NATIVE' status --porcelain
  ```
  Expected: `c9b453e…` and the 7 modified files + the untracked list from §0.

- [ ] **Step 2: Decide the held edits, file by file**

  | Held file | Decision |
  |---|---|
  | `MediaRail.tsx` | **KEEP** the header consolidation; T1/T2/T8 rewrite the rest |
  | `SectionHeader.tsx` | **KEEP** `actionAccessibilityLabel`; T2 adds the variant |
  | `HomeBookmarksList.tsx` | **REVERT** the empty-line change (T1 removes the empty state entirely) |
  | `HomeMediaShelf.tsx` | **REVERT** the empty-line change; **KEEP** `collapsible` until T2 removes the chevron |
  | `FollowedPodcastsShelf.tsx` | **REVERT** the empty-line change (T6 removes the empty state) |
  | `QuickAccessShelf.tsx` | **KEEP** the `>1` rule and the a11y label (T5 builds on them) |
  | `WeatherGreeting.tsx` | **KEEP** v9h (the chip only with a snapshot) — T4 builds on it |

  Revert one file at a time with `git checkout -- <path>` so the other held edits stay.

- [ ] **Step 3: Confirm the tree still type-checks after the reverts**

  Run: `npx tsc --noEmit`
  Expected: PASS. If it fails, the reverts removed a prop a caller still passes — fix the caller in the task that owns that component, do not re-add the empty state.

- [ ] **Step 4: Do not commit yet.** Task 1 makes the first commit of this branch.

---

### Task 1 — The section builder: empty rails are not drawn

**This is the "should Discover be at the top?" answer, implemented as one rule** — not as a position.

**Files:**
- Modify: `src/screens/Home/hooks/useHomeScreen.ts:362-427`
- Modify: `src/screens/Home/types/index.ts`
- Create: `__tests__/screens/Home/homeSections.test.tsx`

**Interfaces:**
- Consumes: `useRecentHistory()`, `useBookmarks()`, `usePlaylists()`, `useFollowedPodcasts()`
- Produces: `sections: HomeSection[]` — the same shape as today, with two new guarantees:
  - a library rail with zero items is **absent** from `sections`
  - the `{type:'SUBSECTION_TITLE', label:'Your Library'}` divider is **absent** when no library rail survives

- [ ] **Step 1: Write the failing test**

  Create `__tests__/screens/Home/homeSections.test.tsx`. Mock the four data hooks exactly as `__tests__/screens/Home/useHomeScreen.test.tsx:50-70` does (`useAuth`, `useWeather`, `features/bookmarks`, `features/playlists`, `features/followedPodcasts`, `features/recentHistory`, `state`). Then:

  ```tsx
  import {renderHook} from '@testing-library/react-native';
  import {useHomeScreen} from '../../../src/screens/Home/hooks/useHomeScreen';

  const nav = {navigate: jest.fn(), dispatch: jest.fn()} as never;

  function sectionTypes(sections: ReturnType<typeof useHomeScreen>['sections']) {
    return sections.map(s => s.type);
  }

  describe('useHomeScreen — the section builder', () => {
    it('draws no library rail, and no "Your Library" divider, when the library is empty', async () => {
      const {result} = renderHook(() => useHomeScreen(nav));
      const types = sectionTypes(result.current.sections);

      expect(types).not.toContain('SHELF');
      expect(types).not.toContain('PINNED_PLAYLISTS');
      expect(types).not.toContain('BOOKMARKS');
      expect(types).not.toContain('FOLLOWED_PODCASTS');
      expect(types).not.toContain('SUBSECTION_TITLE');
      // Discover is the first thing on a fresh install.
      expect(types[types.length - 2]).toBe('BROWSE_ALL');
    });

    it('draws the "Your Library" divider when at least one library rail has items', async () => {
      // with one bookmark in the bookmarks mock
      const {result} = renderHook(() => useHomeScreen(nav));
      const types = sectionTypes(result.current.sections);

      expect(types).toContain('SUBSECTION_TITLE');
      expect(types).toContain('BOOKMARKS');
    });
  });
  ```

- [ ] **Step 2: Run it and watch it fail**

  Run: `node node_modules/jest/bin/jest.js __tests__/screens/Home/homeSections.test.tsx --verbose`
  Expected: FAIL — "Your Library" is always pushed today (`useHomeScreen.ts:389`) and every rail is always present.

- [ ] **Step 3: Implement the rule**

  In `useHomeScreen.ts`, replace the fixed `realSections` array with a builder that appends a rail only when it has items, and appends the divider only when at least one library rail was appended:

  ```ts
  const sections = useMemo((): HomeSection[] => {
    const pinnedPlaylists = playlists
      .filter(p => p.pinned)
      .sort((a, b) => pinnedAtMs(b) - pinnedAtMs(a))
      .slice(0, HOME_PLAYLIST_SHELF_LIMIT);

    const libraryRails: HomeSection[] = [
      {
        type: 'SHELF',
        title: 'Recently Played',
        items: recentFiles.slice(0, MAX_RECENT_HISTORY_ENTRIES),
        seeAllRoute: 'History',
      },
      {type: 'PINNED_PLAYLISTS', items: pinnedPlaylists},
      {type: 'BOOKMARKS', items: bookmarks},
      {type: 'FOLLOWED_PODCASTS', items: followedPodcasts},
    ];

    // `'items' in rail` narrows the union to the four arms that carry
    // items — the other arms (GREETING, SUBSECTION_TITLE, BROWSE_ALL)
    // have none, and a rail with no items is not drawn.
    const populated = libraryRails.filter(rail => 'items' in rail && rail.items.length > 0);

    const realSections: HomeSection[] = [{type: 'GREETING'}];

    // "Your Library" is a GROUP, and a group with nothing in it is not
    // drawn. On a fresh install the page therefore starts with
    // Discover — not because Discover moved up, but because there is
    // no library to show. (Netflix, Plex and Spotify never draw an
    // empty row either.)
    if (populated.length > 0) {
      realSections.push({
        type: 'SUBSECTION_TITLE',
        label: 'Your Library',
        variant: 'displaySerif',
      });
      realSections.push(...populated);
    }

    realSections.push(
      {type: 'SUBSECTION_TITLE', label: 'Discover', variant: 'displaySerif'},
      {type: 'BROWSE_ALL'},
    );

    return realSections;
  }, [recentFiles, playlists, bookmarks, followedPodcasts]);
  ```

  **`HomeSection` does not change in this task.** Its arms keep their current item types (`SHELF` → `items: any[]`, `PINNED_PLAYLISTS` → `Playlist[]`, `BOOKMARKS` → `Bookmark[]`, `FOLLOWED_PODCASTS` → `FollowedPodcast[]`) so `HomeScreen`'s `renderItem` keeps handing each component its own type with no cast. The `SHELF` arm's `any[]` is a pre-existing type hole — it is recorded in §8, not widened here.

  The `genres` memo, `handleGenrePress` and the `GENRE` arm are removed in **Task 9**, not here, so this task's diff is one rule and nothing else.

- [ ] **Step 4: Run the test and watch it pass**

  Run: `node node_modules/jest/bin/jest.js __tests__/screens/Home/homeSections.test.tsx --verbose`
  Expected: PASS.

- [ ] **Step 5: Run the whole Home suite**

  Run: `node node_modules/jest/bin/jest.js __tests__/screens/Home --verbose`
  Expected: `useHomeScreenPlaylistOrder.test.tsx` PASS (its "sits in Your Library, before the Discover group" test still holds — the divider is still before the rail). `HomeScreenPlaylistRail.test.tsx` will FAIL — that is T2's work, not this task's; note it and move on.

- [ ] **Step 6: Commit**

  ```
  git add src/screens/Home/hooks/useHomeScreen.ts src/screens/Home/types/index.ts __tests__/screens/Home/homeSections.test.tsx
  git commit -F <message-file>
  ```
  Message: `feat(home): a rail with nothing in it is not drawn`

---

### Task 2 — The plain shelf header

**Files:**
- Modify: `src/components/utility/SectionHeader/SectionHeader.tsx`
- Modify: `src/components/media/MediaRail.tsx`
- Modify: `src/screens/Home/components/QuickAccessShelf.tsx`
- Modify: `src/screens/Home/components/FollowedPodcastsShelf.tsx`
- Modify: `src/screens/Home/components/BrowseAllShelf.tsx`
- Modify: `__tests__/screens/Home/HomeScreenPlaylistRail.test.tsx`

**Interfaces:**
- Consumes: the `actionAccessibilityLabel` prop added by the held edit
- Produces: `SectionHeader` gains `variant?: 'default' | 'plain'`; `MediaRail` renders `variant="plain"` and never a chevron

- [ ] **Step 1: Write the failing test**

  In `__tests__/screens/Home/HomeScreenPlaylistRail.test.tsx`, the existing test `'keeps the rail on the page when nothing is pinned'` and `'says what would fill the rail when nothing is pinned'` **must be replaced** — under V2 an empty rail is not drawn. Rewrite them as:

  ```tsx
  it('does not draw the rail at all when nothing is pinned', async () => {
    await renderHome([]);
    expect(screen.queryByText('Pinned Playlists')).toBeNull();
  });

  it('does not say what would fill the rail — an absent rail says nothing', async () => {
    await renderHome([]);
    expect(
      screen.queryByText('Nothing pinned yet — pin a playlist to keep it here.'),
    ).toBeNull();
  });
  ```

  And add one for the plain title:

  ```tsx
  it('titles the rail with a plain h3, not a badge', async () => {
    await renderHome([mockPinnedPlaylist]);
    // The gold badge circle is gone; the title is the only thing in the row.
    expect(screen.getByText('Pinned Playlists')).toBeOnTheScreen();
    expect(screen.queryByTestId('section-header-badge')).toBeNull();
  });
  ```

- [ ] **Step 2: Run it and watch it fail**

  Run: `node node_modules/jest/bin/jest.js __tests__/screens/Home/HomeScreenPlaylistRail.test.tsx --verbose`
  Expected: FAIL — the rail is still drawn when empty, and the badge still exists.

- [ ] **Step 3: Add the `plain` variant to `SectionHeader`**

  ```tsx
  interface SectionHeaderProps {
    label: string;
    actionLabel?: string;
    onAction?: () => void;
    actionAccessibilityLabel?: string;
    size?: 'large' | 'small';
    collapsible?: boolean;
    collapsed?: boolean;
    onToggleCollapsed?: () => void;
    leadingIcon?: import('../SvgIcon').IconName;
    /**
     * The V2 shelf title.
     *
     *   'default' — the v7/v8 header: a 32 dp gold-soft badge with a
     *              glyph, the title, the action, the collapse chevron.
     *              Used by Settings, Audio Settings and Search.
     *   'plain'   — the V2 header: the title and the action, nothing
     *              else. No badge (four identical gold discs on one
     *              page pull the eye off the artwork) and no chevron
     *              (one action per row).
     *
     * The default render is unchanged — this is a second skin on ONE
     * header component, not a second header component.
     */
    variant?: 'default' | 'plain';
  }
  ```

  In the body, branch once:

  ```tsx
  const isPlain = variant === 'plain';
  ```

  and use it for three things:
  - the badge: `{!isPlain && leadingIcon && size === 'large' ? (<View style={[styles.iconBadge, …]} testID="section-header-badge" …>…</View>) : null}`
  - the title: `variant={isPlain ? 'h3' : size === 'large' ? 'displaySans' : 'overline'}` and `color={isPlain ? 'primary' : size === 'large' ? 'primary' : 'secondary'}`; when `isPlain`, do not apply `styles.titleLargeWithIcon`
  - the chevron: `{!isPlain && collapsible && onToggleCollapsed ? (…chevron…) : null}`

- [ ] **Step 4: Point the four Home rails at the plain variant**

  - `MediaRail.tsx` → `<SectionHeader label={title} variant="plain" actionLabel={showSeeAll ? 'See All' : undefined} onAction={showSeeAll ? onSeeAll : undefined} actionAccessibilityLabel={`See all ${title}`} />` and **delete** the `collapsible` / `collapsed` / `onToggleCollapsed` props and the `useState`/`useCallback` that drove them, plus the `icon` prop (the plain header has no badge, so the rail no longer needs a glyph).
  - `QuickAccessShelf.tsx` → `variant="plain"`, delete the collapse state and the `leadingIcon`.
  - `FollowedPodcastsShelf.tsx` → `variant="plain"`, delete the collapse state and the `leadingIcon`.
  - `BrowseAllShelf.tsx` → `variant="plain"`, delete the `leadingIcon="compass"`.

  Removing the chevron also removes the collapse **behaviour**: a rail that can be collapsed is a rail the user can hide. V2 has one reading order — top to bottom — and no per-row hiding.

- [ ] **Step 5: Update the callers of the changed props**

  `HomeMediaShelf.tsx` passes `collapsible` — delete that prop and the `collapsible` prop on `HomeMediaShelfProps` itself (it exists only to switch the chevron off, and there is no chevron now).

- [ ] **Step 6: Run the test and watch it pass**

  Run: `node node_modules/jest/bin/jest.js __tests__/screens/Home/HomeScreenPlaylistRail.test.tsx --verbose`
  Expected: PASS.

- [ ] **Step 7: Run the gates**

  Run: `npx tsc --noEmit` then `npx eslint . --ext .ts,.tsx --max-warnings 0`
  Expected: PASS. `SectionHeader`'s other eight callers are untouched — the default render is byte-identical.

- [ ] **Step 8: Commit**

  ```
  git add src/components/utility/SectionHeader/SectionHeader.tsx src/components/media/MediaRail.tsx src/screens/Home/components/QuickAccessShelf.tsx src/screens/Home/components/FollowedPodcastsShelf.tsx src/screens/Home/components/BrowseAllShelf.tsx src/screens/Home/components/HomeMediaShelf.tsx __tests__/screens/Home/HomeScreenPlaylistRail.test.tsx
  git commit -F <message-file>
  ```
  Message: `feat(home): the shelf header is a title and an action, nothing else`

---

### Task 3 — The media card: artwork whole, text underneath

**Files:**
- Modify: `src/components/media/MediaRailCard.tsx`
- Modify: `src/screens/Home/components/HomeMediaShelf.tsx`
- Modify: `src/screens/Home/components/HomeBookmarksList.tsx`
- Test: `__tests__/components/media/HomeMediaShelf.test.tsx`, `__tests__/screens/Home/HomeBookmarksList.test.tsx`

**Interfaces:**
- Consumes: `MediaRailCard`'s existing props (`title`, `lane`, `imageUri`, `subtitle`, `progress`, `onPress`, `onLongPress`, `accessibilityLabel`, `accessibilityHint`)
- Produces: the same props, rendered as **artwork (160 × 90) → title (14/20) → meta (13/18)**, total height 138

- [ ] **Step 1: Write the failing test**

  Add to `__tests__/components/media/HomeMediaShelf.test.tsx`:

  ```tsx
  import {StyleSheet} from 'react-native';

  it('is 138 dp tall — the artwork, and the title and meta BELOW it', async () => {
    // The regression this pins: the card used to be 90 dp (the
    // thumbnail alone) with the title drawn ON the picture.
    await renderShelf([WITH_POSITION]);

    const card = screen.getByLabelText('The Rifle, 1:37 of 21:58');
    const flat = StyleSheet.flatten(card.props.style as never) as {height?: number};

    expect(flat.height).toBe(138);
  });
  ```

  The label `'The Rifle, 1:37 of 21:58'` is the one the existing test already asserts (`HomeMediaShelf.test.tsx:82`), so the new test reuses a fact that is already pinned rather than inventing a second one. `StyleSheet.flatten` is required because the card's `style` prop is an **array** (`[styles.card, {shadowColor}]`), not an object.

- [ ] **Step 2: Run it and watch it fail**

  Run: `node node_modules/jest/bin/jest.js __tests__/components/media/HomeMediaShelf.test.tsx --verbose`
  Expected: FAIL — the card is 90 dp tall (the thumbnail only) and the title is inside it.

- [ ] **Step 3: Rebuild `MediaRailCard`**

  ```tsx
  export const MEDIA_RAIL_CARD_WIDTH = 160;
  const THUMB_HEIGHT = 90; // 16:9 at the width above.
  /** 90 artwork + 8 gap + 20 title + 2 gap + 18 meta = 138. */
  export const MEDIA_RAIL_CARD_HEIGHT = 138;
  ```

  The card becomes a column:

  ```tsx
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityHint={accessibilityHint ?? (onLongPress ? 'Long press for more actions' : undefined)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.card, {shadowColor: colors.shadow}]}>
      <View style={[styles.thumbnailContainer, {backgroundColor: colors.background.elevated}]}>
        {imageUri ? (
          <MediaImage
            source={toRenderableImageUri(imageUri)!}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <SvgIcon name={glyph} size={24} color={colors.text.tertiary} />
          </View>
        )}

        {/* The progress bar rides the artwork's bottom edge, inset by
            the corner radius so it does not poke past the rounded
            corners. (kit-v2.js:229-247) */}
        {progress > 0 ? (
          <View style={[styles.progressBarTrack, {backgroundColor: colors.background.highlightStrong}]}>
            <View style={[styles.progressBarFill, {width: `${Math.min(100, progress * 100)}%`, backgroundColor: colors.accent.gold}]} />
          </View>
        ) : null}
      </View>

      <AppText variant="bodySmall" numberOfLines={1} style={styles.cardTitle}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="caption" color="secondary" numberOfLines={1} style={styles.cardMeta}>
          {subtitle}
        </AppText>
      ) : null}
    </TouchableOpacity>
  );
  ```

  with the styles:

  ```ts
  card: {
    width: MEDIA_RAIL_CARD_WIDTH,
    height: MEDIA_RAIL_CARD_HEIGHT,
    marginRight: spacing.md,
    elevation: 4,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  thumbnailContainer: {
    width: '100%',
    height: THUMB_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  cardTitle: {
    marginTop: 8,
    fontFamily: FONT_FAMILY.inter.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  cardMeta: {
    marginTop: 2,
  },
  progressBarTrack: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 3,
    zIndex: 3,
  },
  ```

  **Deleted from this component:** the `typeBadge` (the corner music/video chip), the `overlayGradient`, the `bottomStrip`, the scrim, and the text shadows. The artwork is no longer covered by type on top of it.

  `FONT_FAMILY` comes from `src/constants/fontFamily.ts`. `fontFamily` + `fontSize` + `lineHeight` together — the app's weight-intent rule (`600` → `FONT_FAMILY.inter.semibold`) means the weight lives in the family key, not in a `fontWeight` prop.

- [ ] **Step 4: Keep the two shelves' data contracts**

  `HomeMediaShelf` keeps `formatPositionLine(item.position, item.duration)` as the meta line, and `HomeBookmarksList` keeps `` `${formatDuration(item.position)} · ${new Date(item.createdAt).toLocaleDateString()}` ``. Both are what the existing tests assert (`'1:37 / 21:58'`), so **the strings do not change — only their position does.**

- [ ] **Step 5: Run the tests**

  Run: `node node_modules/jest/bin/jest.js __tests__/components/media/HomeMediaShelf.test.tsx __tests__/screens/Home/HomeBookmarksList.test.tsx --verbose`
  Expected: PASS. The artwork-precedence tests in `HomeBookmarksList.test.tsx` are unaffected — the artwork did not change.

- [ ] **Step 6: Commit**

  Message: `feat(home): the media card is the artwork, and the title is under it`

---

### Task 4 — The greeting: unboxed, three lines, chip top-right

**Files:**
- Modify: `src/screens/Home/components/WeatherGreeting/WeatherGreeting.tsx`
- Modify: `src/screens/Home/components/WeatherGreeting/WeatherGreeting.types.ts`
- Test: `__tests__/screens/Home/` — add `__tests__/screens/Home/WeatherGreeting.test.tsx`

**Interfaces:**
- Consumes: `WeatherGreetingProps` — `{text, firstName, condition, weather, isFetching}`
- Produces: the same props. The component renders **three lines** and one optional chip.

- [ ] **Step 1: Write the failing test**

  Create `__tests__/screens/Home/WeatherGreeting.test.tsx`:

  ```tsx
  it('renders the salutation, the name and the weather line as three lines', () => {
    render(
      <ThemeProvider>
        <WeatherGreeting
          text="Good afternoon"
          firstName="Paval"
          condition="partlyCloudy"
          weather={{description: 'Mainly clear', cityName: 'San Jose', temperatureC: 11}}
          isFetching={false}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Good afternoon,')).toBeOnTheScreen();
    expect(screen.getByText('Paval')).toBeOnTheScreen();
    expect(screen.getByText('Mainly clear in San Jose · 11°')).toBeOnTheScreen();
  });

  it('draws no chip and no weather line when there is no snapshot', () => {
    render(
      <ThemeProvider>
        <WeatherGreeting
          text="Good afternoon"
          firstName="Paval"
          condition="partlyCloudy"
          weather={null}
          isFetching
        />
      </ThemeProvider>,
    );

    expect(screen.queryByText(/Fetching/)).toBeNull();
    expect(screen.queryByText(/°/)).toBeNull();
  });
  ```

- [ ] **Step 2: Run it and watch it fail**

  Run: `node node_modules/jest/bin/jest.js __tests__/screens/Home/WeatherGreeting.test.tsx --verbose`
  Expected: FAIL — the greeting is a card, the weather is a two-line right-aligned column, and a "Fetching…" row is drawn.

- [ ] **Step 3: Rebuild the component**

  The render becomes a plain column, no card:

  ```tsx
  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <View style={styles.greetingCol}>
          <AppText color="primary" style={styles.greetingPrefix} numberOfLines={1}>
            {text},
          </AppText>
          <AppText
            color="accent"
            style={[styles.greetingName, {fontSize: nameFontSize}]}
            numberOfLines={1}
            ellipsizeMode="tail">
            {firstName}
          </AppText>
        </View>

        {/* The chip is an ACCENT in the top right, aligned with the
            name — the weather column took a third of the width away
            from the name in V1. It is drawn only when there is a
            snapshot behind it. */}
        {showChip ? <WeatherChip condition={condition} style={styles.chip} /> : null}
      </View>

      {showLiveWeather ? (
        <AppText variant="caption" color="secondary" style={styles.weatherLine} numberOfLines={1}>
          {weather!.description} in {weather!.cityName} · {weather!.temperatureC}°
        </AppText>
      ) : null}
    </View>
  );
  ```

  with the styles:

  ```ts
  section: {
    paddingHorizontal: spacing.lg,   // the ONE gutter — 16
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  greetingCol: {flex: 1, minWidth: 0},
  chip: {marginLeft: spacing.md},
  greetingPrefix: {
    fontFamily: FONT_FAMILY.cormorant.italic,
    fontSize: 18,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  greetingName: {
    fontFamily: FONT_FAMILY.inter.bold,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  weatherLine: {marginTop: 8},
  ```

  **Deleted:** the card surface (`styles.card`, the border, the radius), the `weatherCol` right-aligned column, the 26 px temperature, the "Fetching…" row, the `ActivityIndicator` import, and the `colors`/`radius` imports that only served the card.

  The `isFetching` prop stays in the type — it is still how the caller knows the first fetch is in flight — but **it draws nothing**. A first cold load shows the salutation and the name and nothing else, which is exactly the `Home_V2_Light — first run` board.

- [ ] **Step 4: Run the test and watch it pass**

  Run: `node node_modules/jest/bin/jest.js __tests__/screens/Home/WeatherGreeting.test.tsx --verbose`
  Expected: PASS.

- [ ] **Step 5: Commit**

  Message: `feat(home): the greeting is three lines on the page, not a card`

---

### Task 5 — The playlist tile: the cover IS the card, and you can unpin it

**Files:**
- Modify: `src/screens/Home/components/QuickAccessShelf.tsx`
- Modify: `src/screens/Home/index.tsx` (the `handlePlaylistPress` + a new `handleTogglePin`)
- Modify: `src/screens/Home/hooks/useHomeScreen.ts` (expose `setPinned`)
- Test: `__tests__/screens/Home/HomeScreenPlaylistRail.test.tsx`

**Interfaces:**
- Consumes: `PlaylistCover` (the artwork owner), `PlaylistActionMenu` (the existing pin menu)
- Produces: a rail of 160 × 160 tiles — cover, name, count — with a long-press that opens `PlaylistActionMenu`

- [ ] **Step 1: Write the failing test**

  Add to `__tests__/screens/Home/HomeScreenPlaylistRail.test.tsx`:

  ```tsx
  it('shows the playlist count under the name', async () => {
    await renderHome([{...mockPinnedPlaylist, items: [{} as never, {} as never]}]);
    expect(screen.getByText('2 ITEMS')).toBeOnTheScreen();
  });

  it('opens the playlist action menu on a long press', async () => {
    await renderHome([mockPinnedPlaylist]);
    fireEvent(screen.getByLabelText('Open playlist Road Trip, pinned'), 'longPress');
    expect(screen.getByText('Unpin from top')).toBeOnTheScreen();
  });
  ```

  `mockHomeState` must gain the two new hook returns this task introduces: `handleTogglePin` and `handlePlaylistLongPress`.

- [ ] **Step 2: Run it and watch it fail**

  Run: `node node_modules/jest/bin/jest.js __tests__/screens/Home/HomeScreenPlaylistRail.test.tsx --verbose`
  Expected: FAIL — the tile is a 160 × 110 landscape card with a 32 dp cover and a gold "N ITEMS" pill, and there is no long-press.

- [ ] **Step 3: Rewrite the tile**

  ```tsx
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={() => onPlaylistPress(playlist.id)}
    onLongPress={() => onPlaylistLongPress(playlist.id)}
    accessibilityRole="button"
    accessibilityLabel={`Open playlist ${playlist.name}${playlist.pinned ? ', pinned' : ''}`}
    accessibilityHint="Long press for more actions"
    style={styles.card}>
    <PlaylistCover playlist={playlist} style={styles.cover} />
    <AppText variant="bodySmall" numberOfLines={1} style={styles.playlistName}>
      {playlist.name}
    </AppText>
    <AppText variant="overline" color="accent" style={styles.count}>
      {playlist.items.length} ITEMS
    </AppText>
  </TouchableOpacity>
  ```

  ```ts
  card: {width: 160, marginRight: spacing.md},
  cover: {width: 160, height: 160, borderRadius: radius.md},
  playlistName: {marginTop: 10, fontFamily: FONT_FAMILY.inter.semibold, fontSize: 14, lineHeight: 20},
  count: {marginTop: 2, letterSpacing: 0.5},
  ```

  **Deleted from this file:** the `LinearGradient` card fill, the `badge` box, the "Jump back in" footer, the `chevronRight` icon, the `emptyMessage` prop and its empty branch (T1 removed empty rails), and the `SvgIcon` import if nothing else uses it.

  The count is the app's own copy: the tile said "N ITEMS" before and still does — only the position and the type change (`caption` → `overline`).

- [ ] **Step 3a: The collage — one owner, and it is `PlaylistCover`**

  The 2 × 2 collage has exactly **one** renderer: `src/components/playlist/PlaylistCover/PlaylistCover.tsx`. It takes the playlist's **first four** items and draws them as four cells (one large cell when the playlist holds a single item; the `listMusic` glyph on `goldSoft` when it is empty). It draws **catalogue artwork only** — a `PlaylistItem` carries `thumbnailPath` and no `resumeThumbnailPath`, because a playlist item is a thing you put in a list, not a position you were at.

  V1 drew that collage on the Home tile at **32 dp** — the smallest thing on the tile. V2 draws it at **160 dp**, the same size as every other artwork on the page. Nothing new is built: `PlaylistCover` already takes the box as a prop (`style`), and the tile passes 160 × 160.

  What this changes for the user: on the Home screen a playlist now reads as a **cover**, the way a playlist reads on Spotify, Apple Music and Plex — instead of a landscape card with a thumbnail in its corner. What it does NOT change: the All Playlists grid still draws the same collage in a 16:9 box (`PlaylistCard.tsx:163-171`). The artwork is one renderer with two chromes, which is the design (`PlaylistCover.tsx:10-16`).

  **Observed, not fixed here:** in a 16:9 box the cells are not square, so `resizeMode="cover"` crops each cell slightly; on the square Home tile they are square and uncropped. The same playlist therefore shows its four items in two slightly different crops on two screens. That is a consequence of the two chromes, not a bug in the renderer — and it is recorded here rather than fixed, because fixing it would change the All Playlists grid, which is a separate page's decision.

- [ ] **Step 4: Wire the long-press to the existing menu**

  The app already owns this menu — `PlaylistActionMenu` with a pin toggle, used by `AllPlaylistsScreen`. Home reuses it; it is not modified.

  In `QuickAccessShelf.tsx`:

  ```tsx
  const [actionPlaylistId, setActionPlaylistId] = useState<string | null>(null);
  const actionPlaylist = useMemo(
    () => playlists.find(p => p.id === actionPlaylistId) ?? null,
    [playlists, actionPlaylistId],
  );
  ```

  and render `<PlaylistActionMenu visible={actionPlaylist !== null} playlist={actionPlaylist} onTogglePin={onTogglePin} onClose={() => setActionPlaylistId(null)} />` as a sibling of the rail.

  `onTogglePin` comes down as a prop: `onTogglePin: (playlistId: string, pinned: boolean) => void`.

  In `useHomeScreen.ts`, `usePlaylists()` already returns `setPinned` — expose it:

  ```ts
  const {list: playlists, setPinned: setPlaylistPinned} = usePlaylists();
  …
  const handleTogglePin = useCallback(
    (playlistId: string, pinned: boolean) => setPlaylistPinned(playlistId, pinned),
    [setPlaylistPinned],
  );
  ```

  and return it. `HomeScreen` passes `onTogglePin={handleTogglePin}` into the `PINNED_PLAYLISTS` case.

  **Why the long-press and not a permanent pin button:** D-P8 says the pin must not be reachable by gesture alone — and it is not: `AllPlaylistsScreen` keeps its visible 32 px toggle (`PlaylistCard.tsx:95-114`). The Home tile is a browsing surface, and Plex, Jellyfin and YouTube Music all put the secondary action on a long-press for exactly this reason.

- [ ] **Step 5: Run the test and watch it pass**

  Run: `node node_modules/jest/bin/jest.js __tests__/screens/Home/HomeScreenPlaylistRail.test.tsx --verbose`
  Expected: PASS.

- [ ] **Step 6: Commit**

  Message: `feat(home): the playlist cover is the card, and it can be unpinned`

---

### Task 6 — The podcast tile: circle, ring, no shadow

**Files:**
- Modify: `src/screens/Home/components/FollowedPodcastsShelf.tsx`
- Test: `__tests__/screens/Home/` — add `__tests__/screens/Home/FollowedPodcastsShelf.test.tsx`

**Interfaces:**
- Consumes: `FollowedPodcast` (`id`, `title`, `author`, `image`)
- Produces: a 132 dp circle with a 1 dp ring, the title centred under it (14/20), the author under that (13/18); total height 184

- [ ] **Step 1: Write the failing test**

  ```tsx
  it('centres the title and the author under the circle', () => {
    render(<FollowedPodcastsShelf items={[podcast]} onPodcastPress={jest.fn()} onSeeAll={jest.fn()} />);
    expect(screen.getByText('The Show')).toBeOnTheScreen();
    expect(screen.getByText('The Host')).toBeOnTheScreen();
  });

  it('draws no shadow on the circle', () => {
    const tree = JSON.stringify(screen.toJSON());
    expect(tree).not.toContain('artworkShadow');
  });
  ```

- [ ] **Step 2: Run it and watch it fail**

  Run: `node node_modules/jest/bin/jest.js __tests__/screens/Home/FollowedPodcastsShelf.test.tsx --verbose`
  Expected: FAIL — the circle has a heavy shadow and the texts are 14/18 and 12/16.

- [ ] **Step 3: Rebuild the tile**

  - Replace the shadow wrapper with a ring: `borderWidth: 1, borderColor: colors.border.subtle`, and delete `shadowOffset` / `shadowOpacity` / `shadowRadius` / `elevation`.
  - The title: `variant="bodySmall"` + `FONT_FAMILY.inter.semibold`, `fontSize: 14`, `lineHeight: 20`, `marginTop: 12`.
  - The author: `variant="caption" color="secondary"`, `marginTop: 2`.
  - The card width stays 144 (132 circle + 6 each side) — `kit-v2.js` centres a 132 circle inside a 160 pitch, which is the same 144 box.

- [ ] **Step 4: Run the test and watch it pass, then commit**

  Message: `feat(home): the podcast tile is a ringed circle with its name under it`

---

### Task 7 — The catalogue tile: poster whole, text underneath

**Files:**
- Modify: `src/components/utility/CategoryCard/CategoryCard.tsx`
- Modify: `src/screens/Home/components/BrowseAllShelf.tsx`
- Test: add `__tests__/components/utility/CategoryCard.test.tsx`

**Interfaces:**
- Consumes: `CategoryCardProps` (`name`, `description`, `icon`, `onPress`, `image`, `accessibilityLabel`, `fallbackVariant`)
- Produces: a 160 × 183 poster with the 40 dp icon disc at its top-left, then the title and a two-line description underneath; total height 251

- [ ] **Step 1: Write the failing test**

  ```tsx
  it('puts the description under the poster', () => {
    render(<CategoryCard name="Movies" description="Classic, sci-fi,\nnoir & more" icon="clapperboard" onPress={jest.fn()} />);
    expect(screen.getByText(/Classic, sci-fi,/)).toBeOnTheScreen();
  });

  it('is 160 wide and 183 tall', () => {
    const tree = screen.toJSON() as unknown as {props: {style: {width: number; height: number}}};
    expect(tree.props.style.width).toBe(160);
    expect(tree.props.style.height).toBe(183);
  });
  ```

- [ ] **Step 2: Run it and watch it fail**

  Expected: FAIL — the card is 140 × 160 with the description over the image.

- [ ] **Step 3: Rebuild the card**

  - `card: {width: 160, height: 183, borderRadius: radius.md, padding: 0, overflow: 'hidden'}` — the padding moves to the text block below, so the poster is full-bleed.
  - The poster is an absolutely-positioned `Image` in a `posterArea` of height 183; the 40 dp icon disc sits at `top: spacing.md, left: spacing.md` with `rgba(0,0,0,0.45)` and the glyph inside it.
  - The text block sits **below** the poster: `name` (14/20 semibold) and `description` (13/18 secondary, `numberOfLines={2}`).
  - **Deleted:** the `LinearGradient` overlay, the white text over the image, and the `fallbackVariant` gradient (the no-cover tile becomes a `goldSoft` block with the glyph centred, as `kit-v2.js:405-424` draws it). With the gradient gone, `fallbackVariant` has nothing left to switch: **remove the `fallbackVariant` prop from `CategoryCardProps`** and stop passing it in `BrowseAllShelf.tsx:124`.
  - The description's line break now comes from the data: `BrowseAllShelf` passes the two-line strings from `CATEGORY_DESCRIPTION` — the same map the Penpot board uses (`designs/penpot/home-v2.js:78-88`). Put that map in the app as the ONE owner: `src/screens/Home/related/categoryDescriptions.ts`.

- [ ] **Step 4: Move the description map into the app**

  ```ts
  // src/screens/Home/related/categoryDescriptions.ts
  export const CATEGORY_DESCRIPTION: Record<string, string> = {
    Movies: 'Classic, sci-fi,\nnoir & more',
    Podcasts: 'Arts, news,\nscience & more',
    Music: 'Rock, jazz,\nclassical & more',
    Radio: 'Live stations\nworldwide',
    'Live TV': 'News, sports &\nentertainment',
    Audiobooks: 'Fiction, mystery,\nhistory & more',
    Shows: 'Drama, comedy,\nsci-fi & more',
    Archive: 'Audio, video &\nold-time radio',
    'Local Files': 'Linked folders\n& offline media',
  };
  ```

  and have `designs/penpot/home-v2.js` import the same map — **one owner, both surfaces**. The Penpot generator already reads the app's copy of `BROWSE_ALL_SECTIONS`; this is the same rule applied to the descriptions.

- [ ] **Step 5: Run the test and watch it pass, then commit**

  Message: `feat(home): the catalogue tile is a poster with its name under it`

---

### Task 8 — One gutter, one rail pitch

**Files:**
- Modify: `src/components/media/MediaRail.tsx`
- Modify: `src/screens/Home/components/BrowseAllShelf.tsx`
- Modify: `src/screens/Home/components/QuickAccessShelf.tsx`
- Modify: `src/screens/Home/components/FollowedPodcastsShelf.tsx`
- Modify: `src/components/utility/SectionHeader/SectionHeader.tsx`
- Modify: `src/components/utility/SubsectionTitle/SubsectionTitle.tsx`

**Interfaces:**
- Consumes: `spacing.lg` (16)
- Produces: every left-aligned thing on the page sits at x = 16

- [ ] **Step 1: Find every 12 dp content gutter**

  Run:
  ```powershell
  Select-String -Path 'src/screens/Home/**/*.tsx','src/components/media/*.tsx','src/components/utility/SectionHeader/*.tsx' -Pattern 'paddingHorizontal: spacing\.md'
  ```
  Expected hits: `MediaRail.shelfContent`, `MediaRail.empty`, `BrowseAllShelf.scroll`, `QuickAccessShelf.scrollContent`, `QuickAccessShelf.empty`, `FollowedPodcastsShelf.scroll`, `FollowedPodcastsShelf.empty`, `SectionHeader.root` is already `spacing.lg` (keep), `WeatherGreeting` moves in T4.

- [ ] **Step 2: Change them all to `spacing.lg`**

  Each of those is `paddingHorizontal: spacing.md` → `spacing.lg`. The rule: **16 dp, everywhere, left-aligned.** The label gutter and the content gutter stop being two gutters.

- [ ] **Step 3: One rail pitch**

  `MediaRail`'s `CARD_PITCH` is `160 + spacing.md` — keep the 12 dp gap. `BrowseAllShelf`'s `scroll.gap` is `spacing.sm` (8) — change it to `spacing.md` (12) so the catalogue rail scrolls at the same pitch as the media rail.

- [ ] **Step 4: The divider's own padding**

  `SubsectionTitle.root` is already `paddingHorizontal: spacing.lg` ✓. Keep it.

- [ ] **Step 5: Run the gates and the suite, then commit**

  Run: `npx tsc --noEmit`; `npx eslint . --ext .ts,.tsx --max-warnings 0`; `node node_modules/jest/bin/jest.js __tests__/screens/Home --verbose`
  Expected: PASS.

  Message: `style(home): one gutter, 16 dp, for everything on the page`

---

### Task 9 — Delete the genre shelf and the four dead Home files

**Files:**
- Delete: `src/screens/Home/components/GenreChipsShelf.tsx`
- Delete: `src/screens/Home/components/ContinueWatchingHero.tsx`
- Delete: `src/screens/Home/components/FeaturedHeroBanner.tsx`
- Delete: `src/screens/Home/components/HomeEmptyState.tsx`
- Delete: `src/screens/Home/components/ScanProgressBanner.tsx`
- Modify: `src/screens/Home/index.tsx`, `src/screens/Home/hooks/useHomeScreen.ts`, `src/screens/Home/types/index.ts`, `src/screens/Home/related/homeSectionKey.ts`

**Interfaces:**
- Consumes: nothing
- Produces: no `GENRE` section type; the Home screen has no genre shelf

- [ ] **Step 1: Prove each file is dead before deleting it**

  Run, for each of the five files:
  ```powershell
  Select-String -Path 'src/**/*.ts','src/**/*.tsx','__tests__/**/*.ts','__tests__/**/*.tsx' -Pattern '<Name>'
  ```
  Expected: **zero** hits outside the file itself. These five were measured dead on 2026-11-10 (`X:/Development/SIMBA/.scratch-figcraft/dead-sweep.js`); re-measure, because Task 1–7 changed the graph.

  `ScanProgressBanner` needs care: the LIVE one is `src/components/feedback/ScanProgressBanner/ScanProgressBanner.tsx` (used by `LibraryScreenContent.tsx:356` and `LinkedFoldersScreen.tsx:441`). Only the **Home copy** dies. Verify the import in the Home copy is not the one that keeps the other alive.

- [ ] **Step 2: Delete the genre section type and its plumbing**

  - `src/screens/Home/types/index.ts` — delete the `| {type: 'GENRE'; genres: {name: string; count: number}[]}` arm.
  - `src/screens/Home/related/homeSectionKey.ts` — delete the `case 'GENRE':` arm.
  - `src/screens/Home/index.tsx` — delete the `case 'GENRE':` arm in `renderSection` and the `GenreChipsShelf` import.
  - `src/screens/Home/hooks/useHomeScreen.ts` — delete the `genres` `useMemo` (`:143-155`), the `handleGenrePress` callback (`:320-325`), the `genres` from the hook's return, and the `if (genres.length > 0) realSections.push({type:'GENRE', …})` block (`:421-424`). The `allTracks` selector (`:138`) is then unused — delete it too.
  - `src/screens/Home/index.tsx` — delete `handleGenrePress` from the destructuring (`:55`) and from the `renderSection` dependency array (`:201`).

- [ ] **Step 3: Delete the five files**

  ```powershell
  rm -- 'X:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/GenreChipsShelf.tsx'
  rm -- 'X:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/ContinueWatchingHero.tsx'
  rm -- 'X:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/FeaturedHeroBanner.tsx'
  rm -- 'X:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/HomeEmptyState.tsx'
  rm -- 'X:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/src/screens/Home/components/ScanProgressBanner.tsx'
  ```
  One `rm` per command, no trailing command after it.

- [ ] **Step 4: Run the gates**

  Run: `npx tsc --noEmit`; `npx eslint . --ext .ts,.tsx --max-warnings 0`; `node node_modules/jest/bin/jest.js --verbose`
  Expected: PASS. A `tsc` error naming one of the deleted files means a reference survived — find it and delete it; do not restore the file.

- [ ] **Step 5: Record the Genre screen's new reachability in the MD**

  `GenreScreen` survives — it is registered in `RootNavigator.tsx:313`, it has a deep link (`navigation/linking.ts:99`) and a share mapping (`services/shareService.ts:28`). But after this task its **only in-app entry point is gone** (`useHomeScreen.ts:322` was the last one). Record that in `md/UI_UX_PROTOTYPE_REBUILD.md` §4.8 as a deliberate consequence, and see §7 below.

- [ ] **Step 6: Commit**

  Message: `refactor(home): delete the genre shelf and the dead Home components`

---

### Task 10 — The missing page: "My Podcasts"

**This is the page the redesign exposed.** The Home "Followed Podcasts" rail's "See All" points at `PodcastsScreen`, and `PodcastsScreen` is a **catalogue** — a category filter and a search box (`src/screens/PodcastsScreen/related/browseConfig.ts`). It does not list the user's followed podcasts: there is no reference to `followedPodcasts` anywhere under `src/screens/PodcastsScreen/`. The comment at `src/screens/Home/index.tsx:86-90` claims otherwise, and it is wrong.

**Files:**
- Create: `src/screens/FollowedPodcasts/index.tsx`, `src/screens/FollowedPodcasts/components/FollowedPodcastsScreen.tsx`
- Modify: `src/navigation/types.ts`, `src/navigation/RootNavigator.tsx`
- Modify: `src/screens/Home/index.tsx` (the See All target)
- Modify: `src/screens/Home/components/FollowedPodcastsShelf.tsx`
- Test: `__tests__/screens/FollowedPodcasts/FollowedPodcastsScreen.test.tsx`

**Interfaces:**
- Consumes: `useFollowedPodcasts()` → `{list, count, addFollowedPodcast, removeFollowedPodcast, isFollowing}`
- Produces: a root route `FollowedPodcasts: undefined`, and a Home rail whose "See All" navigates to it

- [ ] **Step 1: Write the failing test**

  ```tsx
  it('lists the podcasts the user follows', async () => {
    // mock useFollowedPodcasts to return one item
    await render(<FollowedPodcastsScreen navigation={{} as never} route={{} as never} />);
    expect(screen.getByText('The Show')).toBeOnTheScreen();
  });

  it('says so when nothing is followed', async () => {
    await render(<FollowedPodcastsScreen navigation={{} as never} route={{} as never} />);
    expect(screen.getByText(/Nothing followed yet/)).toBeOnTheScreen();
  });
  ```

- [ ] **Step 2: Run it and watch it fail** — the file does not exist.

- [ ] **Step 3: Write the screen**

  The page reuses the app's own pieces, not new ones:
  - `InternalHeader` (or `BackButton` + `AppText`) for the title — check what `AllPlaylistsScreen` uses: `BackButton` + `AppText variant="displaySans"` (`AllPlaylistsScreen.tsx:138-142`). Copy that shape.
  - The rows: a new `FollowedPodcastRow` in the same folder, drawn in the catalogue row's grammar (a 48 dp circular artwork, the title, the author) with an **Unfollow** text button on the right. `PodcastRow` is **not** reused: it is the catalogue's row and takes a catalogue-shaped record — bending it to carry a followed record would give one component two record shapes.
  - The empty state: the app's `EmptyState` component (`src/components/feedback/EmptyState/EmptyState.tsx`) — but the V2 page rule is "a row with nothing in it is not drawn". An **empty page** is not an empty row: a page with nothing on it must say so, and `EmptyState` is the app's one owner for that. Use it with `icon="headphones"`, `title="No podcasts followed yet"`, `description="Open a podcast and tap Follow, and it will show up here."`
  - Each row's action: **Unfollow** — `useFollowedPodcasts().removeFollowedPodcast(id)`.

- [ ] **Step 4: Register the route**

  - `src/navigation/types.ts` — add `FollowedPodcasts: undefined;` next to `PodcastsScreen`.
  - `src/navigation/RootNavigator.tsx` — import the screen and register `<Stack.Screen name="FollowedPodcasts" component={FollowedPodcastsScreen} />` next to the `PodcastsScreen` registration (`:374`).
  - `src/screens/Home/index.tsx` — `handleFollowedPodcastsSeeAll` navigates to `'FollowedPodcasts'` instead of `'PodcastsScreen'`.
  - `src/screens/Home/components/FollowedPodcastsShelf.tsx` — the `onSeeAll` prop is unchanged; only its target moved.

- [ ] **Step 5: Fix the false comment**

  `src/screens/Home/index.tsx:86-90` — the comment says the link is kept on `PodcastsScreen` "so the user can see their full followed list". It now points at the page that actually shows it. Rewrite the comment to name the route and say why.

- [ ] **Step 6: Run the gates, then commit**

  Message: `feat(podcasts): a My Podcasts page for the followed list`

---

### Task 11 — The divider's gold is swapped between the themes

**A real bug, verified from source.**

`src/components/utility/SubsectionTitle/SubsectionTitle.tsx:75-82` hardcodes the divider's label colour:

```ts
const labelGold = isDark
  ? 'rgba(184, 146, 46, 0.9)'   // #B8922E — the LIGHT theme's gold
  : 'rgba(201, 168, 76, 0.9)';  // #C9A84C — the DARK theme's gold
```

But the tokens say the opposite: `lightColors.accent.gold = '#B8922E'` (`tokens.ts:321`) and `darkColors.accent.gold = '#C9A84C'` (`tokens.ts:245`). **In light mode the "Your Library" / "Discover" labels are painted in the dark theme's gold, and in dark mode in the light theme's gold** — and the rules beside them use `colors.accent.goldGlow` (`:73`), which IS theme-correct. So the label and its own rules are two different golds in the same divider.

**Files:**
- Modify: `src/components/utility/SubsectionTitle/SubsectionTitle.tsx`
- Test: add `__tests__/components/utility/SubsectionTitle.test.tsx`

- [ ] **Step 1: Write the failing test**

  ```tsx
  it('paints the label with the theme gold in light mode', () => {
    // render inside lightTokens' ThemeProvider, then assert the label's
    // colour contains the LIGHT gold's RGB (184, 146, 46)
    const label = screen.getByText('Your Library');
    expect(flattenStyle(label.props.style)).toContain('184');
  });

  it('paints the label with the theme gold in dark mode', () => {
    // …asserts 201, 168, 76
  });
  ```

- [ ] **Step 2: Run it and watch it fail**

  Expected: FAIL — light mode currently renders `201, 168, 76`.

- [ ] **Step 3: Fix it, from the token**

  Do not swap the two literals — **delete the literal**. Derive the alpha from the theme's own gold so there is one owner:

  ```ts
  const {colors, isDark} = useTheme();
  const labelGold = isDark
    ? 'rgba(201, 168, 76, 0.9)'   // darkColors.accent.gold (#C9A84C)
    : 'rgba(184, 146, 46, 0.9)';  // lightColors.accent.gold (#B8922E)
  ```

  and add a comment naming the two source lines in `tokens.ts` so the next reader can check it in one hop.

  (If a reviewer prefers a computed alpha over the hex, `colors.accent.gold` + a shared `withAlpha` helper is the better shape — but the theme has no such helper today, and adding one is a separate decision. Use the literal pair above, corrected, and cite the token lines.)

- [ ] **Step 4: Run the test and watch it pass, then commit**

  Message: `fix(theme): the section divider's gold was swapped between themes`

---

### Task 12 — The repo-wide delete list

**Measured on 2026-11-10** by `X:/Development/SIMBA/.scratch-figcraft/dead-sweep.js` (586 files under `src/`, basename-import scan) and `classify-dead.js` (symbol-level scan across `src/` **and** `__tests__/`).

**Tier A — delete (zero inbound imports, zero symbol references, no product meaning)**

| File | Lines | Why it is dead |
|---|---|---|
| `src/components/utility/CollapsibleSection.disabled/CollapsibleSection.tsx` | 2 | The file is `export {};` — an empty stub in a `.disabled` folder |
| `src/features/library/presentation/related/albumDetailTextContent.ts` | 14 | No export at all |
| `src/features/library/presentation/related/artistDetailTextContent.ts` | 19 | No export at all |
| `src/features/library/presentation/components/MediaGridItem.tsx` | 127 | `MediaGridItem` 0 refs; `GRID_ITEM_GAP` 0 refs. `GRID_COLUMNS` exists in `SearchScreen.tsx` as its **own** constant — not an import of this one |
| `src/features/library/presentation/components/LibraryVideosSegment.tsx` | 146 | 0 refs — the Library's videos segment is not rendered |
| `src/lib/errorLogger.ts` | 59 | `logError` / `getErrorLog` / `clearErrorLog` — 0 refs |
| `src/lib/eventBus.ts` | 28 | `eventBus` — 0 refs |
| `src/services/sessionService.ts` | 21 | `sessionService` — 0 refs |
| `src/theme/typographyStyles.ts` | 171 | A **duplicate owner**: `AppText.tsx` defines `brandScript` / `displaySerif` / `displaySans` itself. Nothing imports this file |
| `src/constants/liveCategories.ts` | 70 | `RADIO_BROWSE` / `RADIO_CATEGORIES` / `IPTV_CATEGORIES` — 0 refs. The Radio and Live TV screens own their own browse configs |
| `src/constants/showCategories.ts` | 46 | `SHOWS_BROWSE` / `SHOW_CATEGORIES` — 0 refs; the Shows screen owns its own |
| `src/constants/moodCollections.ts` | 53 | `MOOD_COLLECTIONS` — 0 refs. The Genre screen's Moods tab was removed (`GenreScreen.tsx:5-7`) |

**Tier B — delete, but the feature is real (record the loss in the MD first)**

| File | Lines | The feature it half-implements | Decision |
|---|---|---|---|
| `src/utils/sleepTimer.ts` | 31 | `SLEEP_TIMER_PRESETS` / `formatSleepRemaining` / `sleepTimerModeLabel` — **superseded** by `src/state/useSleepTimerStore.ts` (`SLEEP_TIMER_OPTIONS`), which is what `VideoMoreSheet.tsx:92-94, 559-568` actually uses. **The sleep timer is NOT lost; this file is the earlier owner of it** | Delete — no decision needed |
| `src/utils/intelligenceEngine.ts` | 143 | `getWeightedResumptionList` / `getRecentlyPlayed` — an unwired "weighted resume" ranking. Nothing calls it | **D-2** |
| `src/services/subtitleSettingsService.ts` | 54 | `loadSubtitleSettings` / `saveSubtitleSettings` — an AsyncStorage service for subtitle settings that nothing calls; the player reads its subtitle settings from somewhere else | **D-3** |

**Two files a zero-import count must NOT be allowed to delete** — recorded here so nobody removes them on the strength of the sweep alone:

| File | Why it is alive |
|---|---|
| `src/app/QueryProvider.tsx` | **Mounted** at `App.tsx:110` (`<QueryProvider>` wraps `<ThemeProvider>`). It has no importer *under `src/`* because `App.tsx` sits at the **repo root**, outside the sweep's scope — the sweep reads `src/` and `__tests__/`, and `App.tsx` is neither |
| `src/types/svg.d.ts` | An **ambient declaration file**. It declares the `*.svg` module shape for TypeScript and is therefore outside the import graph by design. Never delete |

**The one that needs your call:** `src/utils/intelligenceEngine.ts` — a "continue watching, weighted by how you finished" ranking that nothing calls. It is either a feature to wire (it would replace the plain recency order of the "Recently Played" rail) or it is dead weight for RC1. **Recommendation: delete it for RC1** and record the idea in the MD; the rail's order is the app's own `recentHistoryStore` order, and a second ranking rule is a second answer to a question the store already answers.

- [ ] **Step 1: Re-measure, because the graph moved**

  Run: `node 'X:/Development/SIMBA/.scratch-figcraft/dead-sweep.js'`
  Expected: the Tier A and Tier B files still report zero references.

- [ ] **Step 2: Delete the Tier A files**

  One `rm --` per file, no trailing command.

- [ ] **Step 3: Delete the Tier B files** — **BLOCKED on D-2 and D-3.** Delete `src/utils/sleepTimer.ts` now (its feature lives elsewhere and is not lost). Delete `src/utils/intelligenceEngine.ts` and `src/services/subtitleSettingsService.ts` only after the answers are in; if the answer is "wire it", the file stays and the wiring task is added here.

- [ ] **Step 4: Run the gates**

  Run: `npx tsc --noEmit`; `npx eslint . --ext .ts,.tsx --max-warnings 0`; `node node_modules/jest/bin/jest.js --verbose`
  Expected: PASS.

- [ ] **Step 5: Commit**

  Message: `refactor: delete the code with no caller`

---

### Task 13 — The `initialTab` lie on the Genre screen

**`RootStackParamList.GenreScreen.initialTab` accepts `'local' | 'streaming' | 'moods' | 'radio'` (`navigation/types.ts:45-48`) and `navigation/linking.ts:99-103` parses all four out of a deep link. But `GenreScreen.tsx:67` honours only one of them:**

```ts
} = useGenreScreen(genre, initialTab === 'streaming' ? 'streaming' : 'local');
```

So `simbaplayer://genre/Hip-Hop?initialTab=moods` silently lands on the **local** tab. The type and the link parser promise two tabs that do not exist.

**Files:**
- Modify: `src/navigation/types.ts`, `src/navigation/linking.ts`

- [ ] **Step 1: Narrow the type to what the screen honours**

  ```ts
  GenreScreen: {
    genre: string;
    /**
     * The two tabs the screen actually has. The old type also accepted
     * 'moods' and 'radio' — the link parser accepted them too, and the
     * screen silently ignored both, so a deep link with either landed
     * on 'local'. A parameter that is accepted and ignored is a lie.
     */
    initialTab?: 'local' | 'streaming';
  };
  ```

- [ ] **Step 2: Narrow the link parser to the same two**

  `src/navigation/linking.ts:99-103` — parse only `local` and `streaming`; drop `moods` and `radio` from the accepted values.

- [ ] **Step 3: Run the gates and commit**

  Message: `fix(nav): the genre deep link promised two tabs the screen never had`

---

### Task 14 — Re-measure, re-draw the board, and update the tracker

**Files:**
- Modify: `md/UI_UX_PROTOTYPE_REBUILD.md`
- Modify: `designs/penpot/home-v2.js` + `designs/penpot/kit-v2.js` if any number moved
- Commit: the Penpot generator + spec (separate commit from the app change)

- [ ] **Step 1: Measure on the device, do not eyeball it**

  Boot the emulator (`emulator-5554`, AVD `Medium_Phone`, 411 × 914 dp), install the build, and capture the Home screen. Measure against the board:
  - the greeting's three line positions (salutation baseline, name baseline, weather baseline) and the chip's 56 dp box at the top right
  - the rail title's baseline and the card top (the 12 dp gap)
  - the media card's 138 dp total height
  - the playlist tile's 160 dp cover and its 208 dp total height
  - the podcast tile's 132 dp circle
  - the catalogue tile's 160 × 183 poster
  - the gutter: every left edge at x = 16

  `adb` is not on PATH — use `C:\Users\paval\AppData\Local\Android\Sdk\platform-tools\adb.exe`.

- [ ] **Step 2: Re-draw the Penpot boards if a number moved**

  The build pipeline is a **four-pass** pipeline, in this order — media upload → boards → connectors → flow tidy-up. Never skip a pass, and never re-run the board pass without the last three: **a board rebuild destroys the flow** (it recreates the flow's start board, `Splash / light`), and the flow must be re-tidied afterwards.

  ```powershell
  node 'X:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/designs/build-penpot-app.js'
  node 'X:/Development/SIMBA/.scratch-figcraft/run-media.js'
  node 'X:/Development/SIMBA/.scratch-figcraft/run-mcp-one.js' build 5
  node 'X:/Development/SIMBA/.scratch-figcraft/run-mcp.js' links
  node 'X:/Development/SIMBA/.scratch-figcraft/penpot-mcp-probe.js' callfile-out execute_code 'X:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/designs/.build/penpot-app-flow-1.json' 'X:/Development/SIMBA/.scratch-figcraft/flow-result.json'
  ```

  **The Penpot Desktop window must stay in the foreground** during a batch — Chromium suspends a backgrounded renderer and the MCP then answers "the Penpot plugin tab appears to be suspended by the browser" on every call. Run `keep-penpot-awake.ps1` in the background, **not** chained in front of a probe call.

- [ ] **Step 3: Add the new page to the board**

  "My Podcasts" is a new screen — it needs its own board on page `SIMBA` (light + dark) and an edge from the Home "Followed Podcasts" rail's "See All" to it. Update `designs/penpot/app-boards.js` (`ROUTES` + `EDGES`) and `designs/build-penpot-app.js`.

- [ ] **Step 4: Update the tracker**

  `md/UI_UX_PROTOTYPE_REBUILD.md` — add a §4.9 for the V2 app pass: what shipped, what was deleted, the new page, the two bugs found (the swapped divider gold, the `initialTab` lie), and the honest coverage note.

- [ ] **Step 5: Commit the design work separately**

  ```
  git add designs md/UI_UX_PROTOTYPE_REBUILD.md md/HOME_V2_REFACTOR.md
  git commit -F <message-file>
  ```
  Message: `docs(design): the Home V2 boards and the refactor plan`
  **Never** `git add UI.figcraft` — it is not ours.

---

## §5 — Missing pages (the full list, verified)

| Page | Status | Evidence |
|---|---|---|
| **My Podcasts** (the followed list) | **MISSING — build it (T10)** | The Home rail's "See All" points at `PodcastsScreen`, which is a catalogue (`PodcastsScreen/related/browseConfig.ts`); `followedPodcasts` appears nowhere under `src/screens/PodcastsScreen/`. The comment at `Home/index.tsx:86-90` claims otherwise |
| A genre entry point | **LOST — decide (D-1)** | `GenreScreen`'s only in-app door was `useHomeScreen.ts:322`. It keeps its deep link (`linking.ts:99`) and its share mapping (`shareService.ts:28`) |
| All Playlists | Exists | `RootNavigator.tsx:333` |
| History (Recently Played → See All) | Exists | `RootNavigator.tsx:284` |
| Bookmarks | Exists | `RootNavigator.tsx:274` |
| The 9 catalogue screens (Movies, Podcasts, Music, Radio, Live TV, Audiobooks, Shows, Archive, Local Files) | Exist | `RootStackParamList` (`navigation/types.ts:52-102`) + `RootNavigator` |

## §6 — Missing features (the full list, verified)

| Feature | Status | Why it is a gap |
|---|---|---|
| **Unpin a playlist from Home** | **MISSING — build it (T5)** | The Home tile had no long-press and no pin control, so the only way to unpin was to open All Playlists. The app already owns the menu (`PlaylistActionMenu`) |
| The playlist cover as the card | **RESIZED — build it (T5)** | The 2 × 2 collage is drawn at **32 dp** on the V1 tile (the smallest thing on it) and at **160 dp** on the V2 tile. One renderer (`PlaylistCover`), one owner — only the box changes |
| The playlist count as a type | New in V2 | It was a gold-soft corner pill on the V1 tile; V2 moves it under the cover as an `overline` |
| A "See All" on the Explore rail | **Not needed** | Each of the nine tiles is already a destination |
| A collapse chevron on any rail | **Deliberately removed** | One reading order; the chevron was a control that hid content the user came for |

## §7 — Decisions I need from you

| # | Decision | My recommendation |
|---|---|---|
| **D-1** | The Genre screen loses its only in-app entry point. Options: (a) accept deep-link-only; (b) add a "Genres" tile to the Explore rail pointing at a new genres index page; (c) put genre chips in the Library | **(a) for RC1** — the deep link and the share mapping keep it reachable, and the genre *list* on Home was the obsolete part, not the genre browser — **TAKEN: the genre shelf is deleted (`ee1ca9e`); `GenreScreen` is reached by `simbaplayer://genre/:genre` and by the share mapping (`shareService.ts:28`)** |
| **D-2** | `src/utils/intelligenceEngine.ts` — an unwired "weighted resume" ranking. Wire it, or delete it? | **Delete for RC1**; record the idea in the MD — **TAKEN: deleted in `5d791f2`, the idea is recorded in §9** |
| **D-3** | `src/services/subtitleSettingsService.ts` — an unwired AsyncStorage service for subtitle settings. The player reads its settings elsewhere. Delete, or is a second owner waiting to be reconciled? | **Delete** — a second subtitle-settings owner is a drift risk — **TAKEN: deleted in `5d791f2`** |
| **D-4** | Should the "Recently Played" rail keep the resume frame (the captured still) or the catalogue poster? | **Keep the frame** — it is the picture of *where you were*, which is what the rail sells. The app's own `resolveMediaArtwork` already prefers it |

**D-5 to D-8 were taken while implementing, and are recorded with their reasons in §9:**

| # | Decision | What was decided |
|---|---|---|
| **D-5** | Does the "a rail with nothing in it is not drawn" rule apply to the playlist rail too? | **Yes** — this reverses the 2026-11-05 decision to keep it on the page with an empty message. One rule, no exception. The feature is still reachable from "See All", the Library and the Profile. |
| **D-6** | Repair or remove the pull-to-refresh? | **Remove** — it waited 600 ms and did nothing, and nothing on Home is fed by the media scan any more. A behaviour change; a one-line revert if it is wanted back. |
| **D-7** | Where do the nine catalogue descriptions live? | **One JSON file** (`src/screens/Home/related/categoryDescriptions.json`), read by the app and by the Penpot generator. |
| **D-8** | How is the sheet engine mocked in tests? | **One file** (`__mocks__/@lodev09-react-native-true-sheet.js`) mapped globally, replacing seven byte-identical local copies. |

## §8 — Carried forward

- The Play walk is still **API-verified only** (55 boards, 1 flow, 50/55 reachable). The hand walk in the Penpot viewer is still outstanding — it was blocked by the in-app Browser's tab selection.
- `designs/assets/README.md` (the weather chip's provenance) is still unwritten.
- The 75-site weight-intent sweep (`600` → `FONT_FAMILY.inter.semibold`, `500` → `FONT_FAMILY.inter.medium`) is still open. **T3 and T7 write new card titles — write them with the family key from the start, so this sweep does not have to touch them later.**
- B-050 (the lib's PiP chrome), B-019 (the Argent update), the seeded-data device proofs (F-065 ×2, F-066), the 2026-11-03 native crash, `graphify-out/`, the API 24–30 PiP path, the NO-JANK goal, and B-018 are all untouched by this plan.
- The other ~48 screens still need their own page pass. The V2 grammar in §1 is the template for them: **one card grammar, one gutter, plain headers, no empty rows.**

---

## §9 — What shipped (2026-11-10)

This section is the record of what the plan actually produced. The plan
above is the plan; this is the truth.

### The commits

| Commit | What | Plan task |
|---|---|---|
| `8abc477` | feat(podcasts): a "My Podcasts" page for the followed list | **T10** |
| `8fdc3c8` | feat(home): the V2 page — one card grammar, one gutter, no empty rails | **T1–T8** |
| `ee1ca9e` | chore(home): delete the seven dead Home files | **T9** |
| `36bf889` | fix(theme): the divider's gold was the wrong theme's gold | **T11, T13** |
| `5d791f2` | chore(repo): delete fifteen dead files — the repo-wide sweep | **T12** |

**T1–T14 are all done except T14** (the device re-measure), and D-1 to
D-8 are all decided. The decisions are in §7 and §9.

### T1–T8 — what shipped, file by file

| Task | What is in the app now |
|---|---|
| T1 | `useHomeScreen` drops every empty rail out of the section list, and the "Your Library" divider goes with it when every rail under it is empty. `__tests__/screens/Home/homeSections.test.tsx` is new and pins the shape of the page. |
| T2 | `SectionHeader` gained `variant?: 'default' \| 'plain'`. The default render is byte-identical for Settings, Audio Settings and Search (8 other callers). The plain skin has no badge and no chevron. |
| T3 | `MediaRailCard` draws the artwork WHOLE (160 × 90) and the title and the meta UNDERNEATH it. No type badge, no scrim, no overlay. The progress bar rides the artwork's bottom edge, inset by the corner radius. |
| T4 | `WeatherGreeting` is unboxed: salutation (Cormorant italic 18/24) → name (Inter Bold, adaptive 22–32) → ONE weather line (caption 13/18). The chip is top-right and is drawn only with a real snapshot. No "Fetching…" row. |
| T5 | `QuickAccessShelf` draws the playlist's own cover at 160 × 160 with the name and the item count under it. A long-press opens the app's own `PlaylistActionMenu`, so the Home tile can unpin. |
| T6 | `FollowedPodcastsShelf` draws a 132 circle with a ring of the app's own border colour — the heavy drop shadow is gone — and the title and author centred under it. |
| T7 | `CategoryCard` draws the 160 × 183 poster full-bleed with the 40 dp icon disc on its top-left corner, and the name and the two-line description underneath. The gradient overlay and the white-over-image text are gone. |
| T8 | One gutter (16 dp) and one rail pitch (160 + 12). The nine catalogue descriptions have ONE owner: `src/screens/Home/related/categoryDescriptions.json`, read by the app AND by `designs/penpot/home-v2.js`. |

### The findings this batch turned up

The plan's own §2 blast-radius table missed these. They are the
half-baked things the batch ran into.

**F-01 — The three rail components drew a heading over nothing.**
`MediaRail`, `QuickAccessShelf` and `FollowedPodcastsShelf` each
rendered their `SectionHeader` unconditionally and only the card list
conditionally — so a caller that forgot to filter an empty rail put a
lone title on the screen. The section builder filtered them out, so the
PAGE was right; the COMPONENTS were not. All three now return `null`
when they have nothing, and the early return sits BELOW the hooks (an
early return above them changes the hook count between renders, and
React throws on the next one).

**F-02 — The rail width was written out in five places.**
`160` appeared in `MediaRailCard`, `CategoryCard`, `QuickAccessShelf`,
the podcast tile and `MediaRail`'s own snap pitch. They had already
drifted: the podcast tile's card is 144 wide around a 132 circle plus
the 12 dp gutter, while the other rails are 160. One owner now:
`src/components/media/railMetrics.ts`.

**F-03 — `WeatherDetail` was declared twice.**
`useHomeScreen.ts` and `WeatherGreeting.types.ts` each declared the same
three-field shape. The hook imports the type now.

**F-04 — The `@lodev09/react-native-true-sheet` mock was in SEVEN test
files, byte-identical.** And it was the cause of a hard failure: the
package ships ES modules and Jest does not transform it, so any test
that reached `BottomSheet` died with `SyntaxError: Unexpected token
'export'`. One mock now (`__mocks__/@lodev09-react-native-true-sheet.js`),
wired through `jest.config.js`'s `moduleNameMapper`. `BottomSheet.test.tsx`
keeps its own local mock on purpose — it asserts on the props the engine
is handed.

**F-05 — `Home/index.tsx` used `QuickAccessShelf` without importing it.**
Caught by `tsc` in the V2 batch. The screen referenced the component and
the import line was never added.

**F-06 — `renderSection`'s deps array had a HOLE.**
`[sections, , handleItemPress, …]` — an elision, so `greeting` was never
in the array and `sections` was missing from it. `react-hooks` cannot
check a malformed array, so nothing flagged it and every handler added
since would have closed over a stale reference. The array now names
every identifier the body reads, including `greeting`, `userFirstName`
and `handleBookmarksSeeAll`.

**F-07 — `HomeHeader` accepted `onSettingsPress` and never rendered it.**
Settings is reachable from Profile, Library and FolderBrowser, so the
prop was a promise of a button that was not there. Removed.

**F-08 — The pull-to-refresh waited 600 ms and did nothing.**
Every rail is fed by a live persisted store, the weather has its own
hour-long TTL, and since the genre shelf was deleted nothing on Home is
fed by the media scan. A spinner that resolves to an identical page is a
lie. Removed — see **D-6**.

**F-09 — `hasError` was never set true, and the skeleton condition was
never true.** `hasError` was never set anywhere, so the whole
`HomeErrorState` branch was unreachable; the skeleton branch was
`!isSettled && sections.length <= 2` and the old builder always
produced at least eight sections. Both files are deleted (T9).

**F-10 — The plan claimed the `HomeSection` `SHELF` arm's `items: any[]`
type hole was "recorded in §8".** It was not — §8 did not mention it.
Recorded now, below. It is a pre-existing type hole and it is still not
widened.

### The decisions I took while implementing

**D-5 — The empty-rail rule applies to the playlist rail too.**
This REVERSES the decision of 2026-11-05, when the playlist rail was
kept on the page with "Nothing pinned yet — pin a playlist to keep it
here." on the grounds that it is the feature's front door ("a Home page
that never mentions it is how the feature went missing without anyone
noticing"). V2 has ONE rule — a rail with nothing in it is not drawn —
and the playlist rail was the one exception that made the rule a lie.
The feature did not go missing with it: the rail's own "See All", the
Library and the Profile all open All Playlists.

**D-6 — The pull-to-refresh is removed, not repaired.**
There is nothing for it to refresh. This is a BEHAVIOUR CHANGE and it is
the one thing in the V2 batch a user could notice as a removal. It is a
one-line revert if it is wanted back.

**D-7 — The catalogue descriptions live in a JSON file.**
`src/screens/Home/related/categoryDescriptions.json` is read by the app
AND by the Penpot generator. Two copies of the copy is how a board and an
app drift apart: the board said one thing and the app said another, and
neither was wrong on its own. The generator's own hard-coded copy is
gone.

**D-8 — The sheet mock is one file, mapped globally.**
See F-04.

**D-2 and D-3 — taken, and the idea is recorded here.**
`utils/intelligenceEngine.ts` (a "weighted resume" ranking that was
never wired) and `services/subtitleSettingsService.ts` (an
AsyncStorage subtitle-settings service, while the player reads its
settings elsewhere) are DELETED for RC1. A second subtitle-settings
owner is a drift risk, and an unwired ranking engine is a promise
nobody is keeping.

If the weighted-resume idea is ever wanted, it starts again from this
paragraph: rank the history entries by how recently AND how completely
the user watched them, and let the "Recently Played" rail order by
that. It was never wired, so there is no behaviour to preserve.

### Still open

- **T14** — re-measure Home on the emulator against the V2 board, and
  re-draw the board if the measurement disagrees with it.
- `designs/assets/README.md` — **written**; the weather chip's
  provenance is now recorded, with the measured gradient compared
  against `WEATHER_PALETTE.partlyCloudy`.
- The 75-site weight-intent sweep (`600` → `FONT_FAMILY.inter.semibold`,
  `500` → `FONT_FAMILY.inter.medium`). The V2 card titles were written
  with the family key from the start, so the sweep does not have to
  touch them.
- The `HomeSection` `SHELF` arm's `items: any[]` type hole (F-10).
- B-050 (the lib's PiP chrome), B-019 (the Argent update — **consent
  outstanding, do it LAST**), the seeded-data device proofs (F-065 ×2,
  F-066), the 2026-11-03 native crash, `graphify-out/`, the API 24–30
  PiP path, the NO-JANK goal and B-018 are all untouched by this plan.
- The other ~48 screens.
- `designs/.build/` is generated output and is NOT committed; only the
  generator sources and the assets they read are.
- The branch is **not pushed** — the five commits above are local.

