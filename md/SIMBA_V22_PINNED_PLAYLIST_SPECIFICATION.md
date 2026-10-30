# SIMBA V22 — Pinned Playlists & Mixed-Lane Playlists

> **Opened:** 2026-10-29, at the user's request.
> **Status:** 🟡 **PLANNED — nothing implemented.** Every claim below was read
> out of the source on 2026-10-29, with `file:line`.
> **Tracker:** [`SIMBA_V22_PINNED_PLAYLIST_TRACKER.md`](SIMBA_V22_PINNED_PLAYLIST_TRACKER.md)
> — phases, tasks, evidence lines.
> **Register:** [`SIMBA_V22_MASTER_PLAN.md`](SIMBA_V22_MASTER_PLAN.md) §8 item 60
> — the link that stops it being forgotten.
> **Why it is its own document:** this is a **feature with a data-model change**
> (the playlist kind), not a defect and not a player-module change. The player
> module's spec and tracker do not own the app's playlist domain.

---

## 1. What the user asked for

> "there is a section called pinned playlist, which can create playlist of vids
> and audio (from different sections, if possible), some pages might need to be
> created with matching Ui, also i think the UX part is also untouched there"

Broken into three claims, each of which the source confirms:

1. **One playlist must hold videos AND audio.** Today it cannot — the kind is
   single-lane by design and the store actively destroys mixed data.
2. **Items must come from different sections** (Movies, Music, Podcasts,
   Archive…). Today an item can only be added from the one section you
   navigated from, and the **app's own Movies section is not wired at all**.
3. **The UX there is untouched.** There are **three** implementations of
   "create a playlist" for one action, and **two** "add to playlist" sheets
   that disagree about which playlists an item may go into.

---

## 2. The gap, in the source

### 2.1 The kind is single-lane, and the store destroys mixed playlists

| Fact | Where |
|---|---|
| `PlaylistKind = 'AUDIO_ONLY' \| 'VIDEO_ONLY'` — "Mixed audio/video playlists are intentionally unsupported" | `src/types/playlist.ts:3-4` |
| `isPlaylistMediaKindAllowed(kind, mediaKind, mediaLane)` — the lane must match the kind **and** the media kind must be on the allowlist | `src/types/playlist.ts:58-64` |
| `PLAYLIST_ALLOWED_MEDIA_KINDS` — audio: `audio, music, podcast`; video: `video, movie` | `src/types/playlist.ts:53-56` |
| `splitLegacyMixed()` **splits** a mixed playlist into an audio one and a video one, on every rehydrate | `src/state/playlistsStore.ts:90-135` |
| The rehydrate filter then drops any item whose kind no longer matches | `src/state/playlistsStore.ts:108-109` |

So a mixed playlist is not merely unsupported — it is **destroyed on the way
out of storage**. The `MIXED` vocabulary still exists as
`PlaylistLegacyKind` (`src/types/playlist.ts:66`), and `AllPlaylistsScreen`
still renders a `'Mixed'` label for it (`src/screens/AllPlaylists/components/AllPlaylistsScreen.tsx:112-116`) — the code remembers a concept the type no longer has.

### 2.2 "Add to playlist" exists — but not from the app's own video sections

`PlaylistSheet` is the wired "add to playlist" sheet. It is live at **nine**
surfaces:

`ArchiveItemDetailScreen` · `AudiobookDetailScreen` · `LiveTVContent` ·
`LiveTVFavoritesScreen` · `MusicDetailScreen` · `PodcastDetailScreen` ·
`RadioContent` · `RadioFavoritesScreen` · `Song/SongActions`

It is **not** wired at `MoviesScreen`, `MovieDetailScreen`, `AllVideos`,
`AllAudio`, `ArchiveScreen` (only its item detail), `ShowsScreen`,
`PodcastsScreen` (only its detail), or `DownloadsScreen`.

**The consequence:** a video can only be added to a playlist from the Internet
Archive item detail — not from the app's own Movies section, which is where
the user's videos actually live. The sheet also filters the playlist list by
lane (`PlaylistSheet.tsx:79-88`), so a video item can only ever be offered a
`VIDEO_ONLY` playlist, and its inline create-mode offers only the current
lane's kind (`PlaylistSheet.tsx:91-94`).

### 2.3 "Pinned" is a name with nothing behind it

`useHomeScreen.ts:375-379` builds the Home shelf as:

```
[...playlists]
  .sort(by updatedAt desc)
  .slice(0, 3)
```

and `src/screens/Home/index.tsx:139` titles it **"Pinned Playlists"**. So the
section shows **the three most recently updated playlists**. Nothing is
pinned, nothing can be pinned, and a playlist the user never touches falls
off the shelf when three others are edited. The `VIEW ALL` link goes to
`AllPlaylistsScreen` — a screen with **no pin affordance at all**.

### 2.4 Three implementations of "create a playlist", and two sheets that disagree

| Flow | Where | State |
|---|---|---|
| `PlaylistCreateModal` | `src/components/playlist/PlaylistCreateModal/PlaylistCreateModal.tsx` | live — `LibraryScreenContent.tsx:490`, `FolderBrowserScreen.tsx:645` |
| `AllPlaylistsScreen`'s inline modal | `src/screens/AllPlaylists/components/AllPlaylistsScreen.tsx:54-60`, `:188-271` | live — its **own** `createName` / `createKind` state |
| `PlaylistSheet`'s inline create mode | `src/components/sheets/PlaylistSheet/PlaylistSheet.tsx:96-110` | live — its **own** `creating` / `newName` / `newKind` state |

**Three** implementations of one action, and the shared one is used by only
**two** of the four surfaces. A shared component exists and two surfaces
ignore it. There is no single owner for "create a playlist".

**And there are two "add to playlist" sheets that disagree.** `PlaylistSheet`
(single item, 9 surfaces) **filters** the playlist list by the item's lane
(`PlaylistSheet.tsx:79-88`); `PlaylistContextMenu` (batch, 1 surface —
`FolderBrowserScreen.tsx:635`) lists **every** playlist
(`PlaylistContextMenu.tsx:102`, `data={allPlaylists}`) with no lane check.

That disagreement is not cosmetic. `addItemToPlaylist` **silently refuses**
an item whose lane does not match the playlist's kind —
`src/state/playlistsStore.ts:180` returns the playlist unchanged, with no
error and no toast — so the batch picker offers playlists that will quietly
drop what the user picked. See bug `B-034`.

### 2.5 The player queue is single-lane **by construction**

`src/state/playerStore.ts:97-101`:

```ts
function normalizeSingleLane(entries: PlaybackEntryInput[]): PlaylistEntry[] {
  const normalized = entries.map(normalizePlaybackEntry);
  const lane = normalized[0]?.mediaType;
  return lane ? normalized.filter(entry => entry.mediaType === lane) : normalized;
}
```

`loadPlaylistToPlayer` (`:126-133`) runs every entry through it. So
**loading a mixed playlist silently drops every item that is not in the
first item's lane** — the rest of the playlist is not queued, not paused and
not marked: gone. `addToPlaylist` (`:135-149`) applies the same rule against
`activeLane` (`:103-105`).

This is the **one** owner of the single-lane constraint on the queue, and
D-P2 has to change it. (It is *not* `useQueueSync` — that hook is a
middleware that mirrors the now-playing session into `currentFile` and
never touches the queue.)

### 2.6 The Library's playlist filter rail has no Mixed bucket

`LOCAL_PLAYLIST_FILTERS` is `All · Audio · Video`
(`src/features/library/presentation/related/localFilesConfig.ts:51-58`). A
mixed playlist would need a fourth chip.

---

## 3. The decisions

### D-P1 — A playlist may hold both lanes ✅ DECIDED 2026-10-29

`PlaylistKind` gains `'MIXED'` back, as a **first-class kind** rather than a
legacy one.

* `splitLegacyMixed()` stops splitting. It becomes a **preserve**, and the
  rehydrate filter accepts both lanes for a `MIXED` playlist.
* `PLAYLIST_ALLOWED_MEDIA_KINDS.MIXED` is the union of the two lanes
  (`audio, music, podcast, video, movie`).
* **Migration is a no-op for existing users.** Every rehydrate has been
  splitting mixed playlists since V13, so **no `MIXED` data survives on
  disk**. There is nothing to migrate — `MIXED` can only be created new.

### D-P2 — "Play all" on a mixed playlist plays every item, in order ✅ DECIDED 2026-10-29

The lane follows the item. Both lanes are already mounted (D9: one mounted
player **per lane**), so crossing an audio→video boundary is a **session
change, not a remount** — the same mechanism `useInWindowVideoLaunch` uses
for the video lane.

* The queue must be able to hold items of both lanes. Today it cannot:
  `normalizeSingleLane` (`src/state/playerStore.ts:97-101`) drops every
  entry that is not in the **first** entry's lane, and
  `loadPlaylistToPlayer` (`:126-133`) runs every playlist through it. That
  function is the **one owner** of the single-lane rule and it is what has
  to change.
* The lane switch must be **one owner**. It belongs in the launch seam, next
  to the lane decision the seam already makes — not in the playlist screen.
* A mixed playlist's queue is therefore **one queue with a lane change at
  each boundary**, not two queues. The queue stays in
  `usePlayerStore.playlist`; what changes is that it may contain both lanes
  and the *next* action re-launches through the seam when the lane differs
  from the item that is playing.

### D-P3 — "Pinned" becomes real ✅ DECIDED 2026-10-29

`Playlist` gains `pinned: boolean` (default `false`) and `pinnedAt?: string`.

* Home's shelf = **pinned first** (most recently pinned first), then the rest
  by recency — so the title "Pinned Playlists" tells the truth.
* `AllPlaylistsScreen` gains a pin action, so the VIEW ALL target can pin.
* **Precedent (named, not invented):** Spotify's playlist context menu has
  "Pin playlist"; YouTube Music has "Pin to top" on a playlist. Both put the
  pinned list at the top of the user's list.

### D-P4 — One owner for "create a playlist", one rule for "which playlists can take this item" ✅ DECIDED 2026-10-29

**One** component creates a playlist. `PlaylistCreateModal` is the one — it is
already written, and it is already the one two of the four surfaces use.

* `AllPlaylistsScreen`'s inline modal is **replaced** by it.
* `PlaylistSheet`'s inline create mode is **replaced** by it.
* The Library's and the Folder Browser's create modals already call it.

**And one rule decides which playlists an item may go into.** Today
`PlaylistSheet` filters by lane and `PlaylistContextMenu` does not
(`PlaylistSheet.tsx:79-88` vs `PlaylistContextMenu.tsx:102`). That rule is
extracted into **one** helper — `compatiblePlaylistsFor(item)` — and both
sheets call it.

* `PlaylistContextMenu` is **not** deleted. It is the only **batch** picker —
  it takes a `batchCount`, `PlaylistSheet` takes a single `currentItem` — and
  the Folder Browser's batch bar needs it. It is **reconciled** with
  `PlaylistSheet`, not removed.

> **This is the "one owner per fact" rule applied to a UI kit.** Three
> implementations of one action is three chances to get it wrong, and two of
> them already disagree with the third about what a playlist may contain.

### D-P5 — The app's own video sections must be able to add to a playlist ✅ DECIDED 2026-10-29

`PlaylistSheet` is wired at `MoviesScreen`, `MovieDetailScreen` and
`AllVideos`. A user must not have to go to the Archive to add their own film
to a playlist.

### D-P6 — What may go in a playlist ✅ DECIDED 2026-10-29

`MIXED` accepts the union of the two lane allowlists. Radio, live TV and
audiobooks stay **out of the playlist domain** — they are live or
specialised, and the existing comment at `src/types/playlist.ts:48-52` says so
deliberately.

> **To verify in phase 1:** `ArchiveItemDetailScreen` and
> `AudiobookDetailScreen` already render a `PlaylistSheet`, but
> `normalizeMediaClassification` may map an archive item or an audiobook to a
> lane that the allowlist then rejects. If so, the sheet is showing an empty
> list today. The tracker's first phase answers this from the source.

### D-P7 — One page owns playlists ✅ DECIDED 2026-10-30

**There is no `PinnedPlaylistsScreen`.** `AllPlaylistsScreen` grows into the
management page.

The earlier draft of §4 offered one and hedged — "the management page the
Home shelf's VIEW ALL should eventually open, **or** that
`AllPlaylistsScreen` grows into". The hedge is resolved: a second page
holding the same list is a second list to keep in agreement with the first,
and the tracker already requires "one target, not two".

### D-P8 — The pin is a state you can SEE and an action you can REACH ✅ DECIDED 2026-10-30

* **The state** is a **pin badge** on the cover, on **every** surface a
  playlist is drawn. A state that cannot be seen is not a state.
* **The action** is a long-press menu item — **Pin to top** / **Unpin from
  top** — because that is where every shipping app puts it (YouTube Music's
  "Pin to top", Spotify's "Pin playlist", Plex's context menus). The app's
  own `MediaRailCard` already uses long-press for a card's secondary actions.
* **A browsing card does not get a permanent pin button.** A pin button on
  every card in a grid of fifty is noise.
* **A management surface does.** `AllPlaylistsScreen`'s row and
  `PlaylistDetailScreen`'s header carry a visible toggle, because a
  long-press is not reachable by a screen reader or a keyboard, and a pin
  that can only be reached by a gesture is a pin some users cannot use.

### D-P9 — The kind label and the playlist cover each have ONE owner ✅ DECIDED 2026-10-30

D-P4 applies the "one owner per fact" rule to **actions**. It applies just as
hard to **labels and artwork**, and both are currently broken:

* **The kind label has six owners** — the exported `PLAYLIST_KIND_LABELS`,
  **three** local `KIND_LABELS` copies, **one** inline ternary, and
  `src/constants/strings.ts`. The exported map is the one owner; the other
  four are deleted. ("Mixed" is **not** an invented word in this app —
  `strings.ts:280` already has `playlistKindMixed: 'Mixed'`.)
* **A playlist's cover has two owners** — `PlaylistCard` draws a 2 × 2
  collage and `AllPlaylistsScreen` draws a generic `listMusic` icon box for
  the same playlist. One renderer (`PlaylistCover`), three chromes: a wide
  card, a list row and a rail tile differ in chrome, and no longer in
  artwork.

---

## 4. The UI/UX

### 4.0 The rules this design obeys

1. **An affordance that no shipping app has does not ship.** Every control
   below names the app it is copied from. If a row has no precedent, the row
   does not exist.
2. **One owner per fact.** Not per screen — per fact. The kind label, the
   playlist's cover, and the pin state each have **exactly one** owner, and
   every surface reads it.
3. **A state that cannot be seen is not a state.** If "pinned" is a promise,
   a user can see which playlists are pinned without opening a menu.
4. **A title that lies is a bug.** "Pinned Playlists" may only head a
   collection that is all pinned.
5. **No new screen when an existing one can carry the job.** Two screens for
   one list is two lists to keep in agreement, and they will disagree.

### 4.1 What already exists, and is reused

| Reused | Where | What it brings |
|---|---|---|
| `MediaRail` | `src/components/media/MediaRail.tsx` | The canonical shelf: a 32 px `accent.goldSoft` icon badge, a `displaySans` title, a `See All` caption, a collapse chevron. `CARD_PITCH = 160 + spacing.md`. It **collapses when it has no items** — that is the empty-state behaviour, already built. `maxItems` is a **required** prop on purpose. |
| `MediaRailCard` | `src/components/media/MediaRailCard.tsx` | The canonical card: 160 × 90, `radius.md`, a bottom scrim strip carrying the title and subtitle, a 22 px type badge at the **top-right**, an optional progress bar, and **long-press for secondary actions** — the precedent this app already ships for a card's overflow. |
| `PlaylistCard` | `src/components/playlist/PlaylistCard/` | The playlist card: a 16:9 cover collage (up to four items, 2 × 2), the kind badge, the info area (name + "N items · Updated"), and a Play All / Shuffle action row. |
| `PlaylistCreateModal` | `src/components/playlist/PlaylistCreateModal/` | The create flow (D-P4). Its kind picker already has the shape a third kind needs: `k === 'AUDIO_ONLY' ? 'music' : k === 'VIDEO_ONLY' ? 'video' : 'listMusic'` — the **`listMusic` glyph is already the fallback for a third kind**, so `MIXED` needs no new lane glyph. |
| `PlaylistManageModal` | `src/components/playlist/PlaylistManageModal/` | Rename and delete, as a modal. It does not gain a pin mode: a pin is a **toggle**, not a confirmation. |
| `useConfirmDialog` | app-wide | The delete confirmation. Already used by `AllPlaylistsScreen`. |
| `AppText`, `AppButton`, `Fab`, `SvgIcon`, `SectionHeader`, `SubsectionTitle` | app-wide | The type, button, floating-action, icon and header kit. |

### 4.2 The cover — one owner

**NEW `PlaylistCover`** (`src/components/playlist/PlaylistCover/`), rendering
the collage that `PlaylistCard` draws today: one large cell for a single
item, 2 × 2 for up to four, a `listMusic` glyph on `accent.goldSoft` when the
playlist is empty.

It exists because the artwork of a playlist is currently drawn **twice, and
neither time by the same code** — `PlaylistCard` draws a 2 × 2 collage, and
`AllPlaylistsScreen`'s row draws a generic `listMusic` icon box for the same
playlist. The second one is why the management page and the Library show the
same playlist as two different things.

`PlaylistCover` is used by: `PlaylistCard`, `AllPlaylistsScreen`'s row, and
Home's playlist rail. **One renderer, three chromes.** The chrome around a
cover differs by context — a wide card, a list row, a rail tile — and that is
normal. The **artwork** is not context-dependent, and now it has one owner.

The collage draws a playlist's **first four items'** artwork. A `PlaylistItem`
carries `thumbnailPath` but **no** `resumeThumbnailPath` — a playlist item is
a thing you put in a list, not a position you were at — so the collage draws
catalogue artwork only. The captured frame belongs to the bookmark and the
history entry, which have their own field for it.

### 4.3 The pin — one glyph, one owner

**NEW assets** `src/assets/svg/ic_pin.svg` and `ic_pin_filled.svg`,
registered in `SvgIcon.tsx` as `pin` and `pinFilled`. The app already ships a
filled/outline pair for bookmarks (`bookmark` / `bookmarkFilled`), so the
pin follows the same convention rather than inventing one.

**The pin badge** is a 22 × 22 rounded square (`radius.sm`), absolutely
positioned at `top: spacing.xs` / `left: spacing.xs` over the cover —
**mirroring the kind badge at `top: spacing.xs` / `right: spacing.xs`**. It
holds the `pin` glyph at 14 px in `accent.gold` on a `background.scrimStrong`
fill, so it reads as an overlay and never competes with the kind badge's
text.

* The badge appears on **every** surface a playlist is drawn — the Library
  card, the management row, the Home tile. A state you cannot see is not a
  state.
* It is **decorative**. The pinned state is announced in the surface's
  accessibility label ("… , pinned"), because a glyph is not a label.

**The pin action** lives in the playlist's long-press menu, as
**Pin to top** / **Unpin from top**.

> **Precedent, named:** YouTube Music's playlist overflow menu has "Pin to
> top"; Spotify's playlist context menu has "Pin playlist". Both put the
> pinned list at the top of the user's list. Plex exposes a playlist's actions
> in a context menu. The app's own `MediaRailCard` already uses long-press
> for a card's secondary actions.

**No permanent pin button on a browsing card.** A pin button on every card in
a grid of fifty is noise; the badge says which are pinned and the menu says
how to change it. The **management** row is the exception — see 4.5.

### 4.4 The kind badge — a text badge, and one owner

The kind badge stays a **text** badge — `Audio` / `Video` / `Mixed` — in the
style `PlaylistCard` already uses: `background.accent.goldDim`, text
`accent.gold`, `AppText variant="caption"`, `fontSize: 9`,
`fontWeight: '700'`, `paddingHorizontal: 6`, at `top: spacing.xs` /
`right: spacing.xs`.

A text badge is the reason `MIXED` needs **no new glyph**: the badge says
"Mixed", and the cover shows two videos and two songs.

**But the label has six owners today, and that has to end.**

| # | Owner | Form |
|---|---|---|
| 1 | `src/types/playlist.ts:40` — `PLAYLIST_KIND_LABELS` | the exported map |
| 2 | `src/components/playlist/PlaylistCard/PlaylistCard.tsx:10` | a local `KIND_LABELS` |
| 3 | `src/components/sheets/PlaylistSheet/PlaylistSheet.tsx:51` | a local `KIND_LABELS` |
| 4 | `src/components/playlist/PlaylistCreateModal/PlaylistCreateModal.tsx:18` | a local `KIND_LABELS` |
| 5 | `src/screens/AllPlaylists/components/AllPlaylistsScreen.tsx:112-116` | an inline ternary |
| 6 | `src/constants/strings.ts:277-280` | `playlistKindAudio` / `playlistKindVideo` / **`playlistKindMixed`** |

Four copies of a two-entry map, one inline ternary, and — in `strings.ts` —
**the word "Mixed" already exists in this app.**

The change: `PLAYLIST_KIND_LABELS` in `src/types/playlist.ts` is the one
owner, gains `MIXED: 'Mixed'`, and owners 2, 3, 4 and 5 delete their copies
and import it. `strings.ts` keeps its copy for the generic strings surface,
but the playlist surfaces read the one owner. `KIND_OPTIONS` in
`PlaylistCreateModal.tsx:17` gains `'MIXED'`.

### 4.5 The one page that owns playlists — `AllPlaylistsScreen`

**There is no `PinnedPlaylistsScreen`.**

The earlier draft of this section offered one and hedged — "the management
page the Home shelf's VIEW ALL should eventually open, **or** that
`AllPlaylistsScreen` grows into". The hedge is resolved: **`AllPlaylistsScreen`
grows into it.** A second page holding the same list is a second list to keep
in agreement with the first, and the tracker already requires "one target,
not two".

The page, top to bottom:

```
┌──────────────────────────────────────────────┐
│  ←   Playlists                       [Create] │   header, one AppButton
├──────────────────────────────────────────────┤
│  All · Audio · Video · Mixed                 │   filter chips (one owner)
├──────────────────────────────────────────────┤
│  ▢  ▢  ▢  ▢                                  │
│  ▢  ▢                                       │   PlaylistCard — the
│  ▢  ▢                                       │   16:9 cover collage
├──────────────────────────────────────────────┤   + info + actions
│  …                                          │
└──────────────────────────────────────────────┘
```

* **The kind filter** gains a **Mixed** chip. It is the same chip set the
  Library uses (`src/features/library/presentation/related/localFilesConfig.ts:52-58`),
  and `FilterType` (`src/features/library/presentation/types/index.ts:3`) gains
  `'MIXED'`. The filter is a **filter**, not a lane switch — it narrows what
  is shown; it never changes what a playlist may contain.
* **The list is `PlaylistCard`s**, one column, in the Library's card design.
  The inline 44 × 44 row that duplicates the Library's card is **replaced** —
  it is the second playlist-card design, and two designs for one object is
  two chances to drift.
* **The pin action** is a long-press menu on each card, **and** a visible
  32 px pin toggle on the row, because this is the **management** page and it
  already shows visible management buttons. A long-press is not reachable by
  a screen reader or a keyboard, and a pin that can only be reached by a
  gesture is a pin some users cannot use.
* **Rename and delete** keep their existing `PlaylistManageModal` and
  `useConfirmDialog` paths.
* **The create action** is the existing header `AppButton`, and it opens
  **`PlaylistCreateModal`** — the inline create modal is replaced (D-P4).
* **The page has no FAB.** It already has a header `AppButton`, and the
  bottom-chrome rule says a FAB sits at `insets.bottom + spacing.lg` and
  **overlaps** what is under it. A second create affordance on one page is
  two ways to do one thing.

### 4.6 Home's playlist rail

The rail exists and is called **"Pinned Playlists"** today, and it renders
the **three most recently updated** playlists — pinned or not. The title is
a lie until this changes.

**Decision.** The rail is retitled **"Playlists"** and shows **pinned first
(most recently pinned first), then the rest by recency**, up to `maxItems`.

* A rail titled "Pinned Playlists" may only head a collection that is all
  pinned (rule 4). Since the rail also shows unpinned playlists, the
  honest title is "Playlists".
* The rail is **horizontal**, so showing both does not crowd it — it
  scrolls. This settles the open question in §8.
* The **pin badge** on each tile says which are pinned, so the ordering is
  legible without reading the title.
* The rail's tile keeps its own geometry — a `listMusic` glyph box becomes
  the **`PlaylistCover`** (4.2), so a playlist looks the same on Home as it
  does in the Library.
* **The rail collapses when there is nothing to show**, the way `MediaRail`
  does. An empty rail with a title is a lie of a different kind.

> **Precedent:** Spotify's home puts pinned playlists at the top of the
> playlist row; YouTube Music does the same. Neither hides the unpinned
> ones behind a separate screen — they order one list.

### 4.7 The Library's playlist segment

* `LibraryPlaylistsSegment` renders `PlaylistCard`s in a vertical `FlatList`
  with `scrollEnabled={false}` — it is a **list of cards**, not a filter
  rail. Its dead `colors` prop is deleted (it is never used).
* The Library's **filter chips** (`localFilesConfig.ts:52-58`) gain
  **Mixed**, and `FilterType` gains `'MIXED'`.
* A `MIXED` playlist appears under **Any** and under **Mixed** — never
  under Audio or Video alone, because it is neither.

### 4.8 The playlist detail page

`PlaylistDetailScreen` (967 lines today) gains:

* **An "Add items" action** → `AddToPlaylistScreen` (4.9).
* **A pin toggle** in the header's action row, next to rename and delete.
  The detail page is a management surface too, and the pin is a state the
  user came here to change.
* **Mixed playlists play in order, across lanes** (D-P2) — the item list
  itself does not change; the queue does.

### 4.9 "Add to playlist" — a full page

**NEW `AddToPlaylistScreen`.** A **full page**, not a sheet: it gathers
items from **several sections at once**, and a sheet is for one context.

> **Precedent:** Plex's "Add to playlist" is a full page, because it
> gathers from more than one library.

* **Section picker:** **Movies · Music · Podcasts · Archive · Downloads** —
  the sections that hold playlist-legal media (D-P6).
* Two panes on a wide screen; a push-and-pop on a phone: pick a section,
  tick items, tick a playlist.
* Every item it offers is **lane-tagged**, so a `MIXED` playlist can be fed
  from more than one section in one visit.
* The playlist list it offers is filtered by **one rule** —
  `compatiblePlaylistsFor(item)` (D-P4) — the same rule `PlaylistSheet` and
  `PlaylistContextMenu` both call. A `MIXED` playlist accepts both lanes.

`PlaylistSheet` **stays** — it is the single-item sheet reached from a
tile, and it is not replaced. It is **reconciled** with
`PlaylistContextMenu`: both call `compatiblePlaylistsFor()`, so they stop
disagreeing about which playlists may take the item.

### 4.10 The playlist's long-press menu

One menu, wherever a playlist is drawn. Its actions:

| Action | Precedent |
|---|---|
| **Play all** | already on `PlaylistCard`'s action row |
| **Pin to top** / **Unpin from top** | YouTube Music "Pin to top"; Spotify "Pin playlist" |
| **Rename** | `PlaylistManageModal` already exists |
| **Delete** | `useConfirmDialog` already exists |

`PlaylistContextMenu` is **not** this menu and is **not** deleted — it is
the **batch** picker (`batchCount`), while this one acts on a single
playlist. They are reconciled by the shared `compatiblePlaylistsFor()` rule,
not merged.

### 4.11 Empty states

| Where | What is shown |
|---|---|
| No playlists at all | "No playlists yet" + a **Create playlist** button. |
| Playlists exist, none pinned | The pinned **section** is not rendered at all. A section with nothing in it is noise. |
| A playlist with no items | "This playlist is empty" + **Add items** → `AddToPlaylistScreen`. |
| A filter matches nothing | "No playlists match this filter." |
| Home's rail with nothing to show | The rail **collapses** — the title goes with it. |

### 4.12 Motion

* The pin badge appears with a **fade + scale** on `motion.fast` (150 ms).
* The kind badge's text changes with no animation — it is a label.
* The Home rail's collapse uses `motion.normal` (250 ms); nothing in this
  feature animates past `motion.normal` except a rail collapse.
* Nothing animates on a **pin toggle** except the badge itself: the row
  does not slide, and no list re-orders under the finger. The re-order
  happens on the next render of the list, which is a list of at most a few
  dozen items.

### 4.13 Accessibility

* The pin badge is `accessibilityElementsHidden`; the pinned state is in the
  surface's **accessibility label** ("…, pinned").
* The pin toggle in a management row and in the detail header is a real
  `TouchableOpacity` with `accessibilityRole="button"` and a label that
  **changes with the state** ("Pin to top" / "Unpin from top"), and
  `accessibilityState={{selected: playlist.pinned}}`.
* Every filter chip states its selection, the way `PlaylistCreateModal`'s
  kind chips already do (`accessibilityState={{selected: isActive}}`).
* Tap targets: the pin toggle and the existing row buttons are **32 px**,
  matching the row's existing buttons; the hit slop is widened rather than
  the icon, so the row does not grow.
* A long-press menu is never the **only** way to reach an action that
  changes persistent state (the pin).

### 4.14 What this design deliberately does NOT add

* **No drag-to-reorder.** The pinned order is **recency of pinning**
  (D-P3), so it is automatic. A drag handle would be an affordance with
  nothing to reorder.
* **No separate "Pinned" screen.** (Rule 5, and 4.5.)
* **No pin button on a browsing card.** (4.3.)
* **No new lane glyph for `MIXED`.** The kind badge is text, and
  `PlaylistCreateModal` already falls back to `listMusic` for a third kind.
* **No new gold accent.** The palette already carries everything this
  feature needs: `accent.gold`, `goldDim`, `goldSoft`, `background.scrim*`,
  `border.subtle`.
* **No new typography.** The badge reuses `variant="caption"` at
  `fontSize: 9`; the page title reuses `displaySans`.

---

## 5. The data model

```ts
export type PlaylistKind = 'AUDIO_ONLY' | 'VIDEO_ONLY' | 'MIXED';

export interface Playlist {
  id: string;
  name: string;
  info?: string;
  kind: PlaylistKind;
  items: PlaylistItem[];
  /** D-P3: a pinned playlist sits at the top of the user's lists. */
  pinned: boolean;
  /** D-P3: when it was pinned — the pinned order is recency of pinning. */
  pinnedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

* `pinned` defaults to `false` for every existing playlist — the migration
  is a **field default**, not a data migration.
* `PlaylistLegacyKind` becomes unnecessary: `MIXED` is no longer legacy.

---

## 6. Out of scope

* **Radio, live TV and audiobooks in a playlist** (D-P6).
* **Drag-and-drop reordering of playlist items** — the store already has
  `reorderPlaylistItems`; surfacing it is a separate task.
* **The playlist file formats** (M3U / JSON export in `src/utils/m3uParser.ts`)
  — they already carry `mediaType` per item, so a mixed playlist exports
  without change, but the export UX is not in this wave.
* **The player module.** Nothing here changes the lib's API. The lane switch
  is an **app-side** session change.

---

## 7. The risks

| Risk | Why it is a risk |
|---|---|
| **The queue becomes cross-lane.** | `normalizeSingleLane` (`src/state/playerStore.ts:97-101`) is the single-lane rule, and `loadPlaylistToPlayer` runs every playlist through it. A mixed playlist's queue holds both lanes, and the audio lane must hand over to the video lane mid-playlist. The handover is the riskiest thing in this wave. |
| **The store's rehydrate must not split again.** | `splitLegacyMixed` is a split by design today. The day someone "tidies" it back, mixed playlists silently lose half their items. The behaviour needs a test that fails if the split returns. |
| **Three create implementations, and two sheets that disagree.** | The plan replaces two inline copies with the shared owner. If only some are replaced, the duplication survives — and the batch picker keeps offering playlists that will silently drop the item (`B-034`). |
| **The `MIXED` label already exists in two files** with no type behind it. | Code that renders a label the type cannot produce is a false claim; the change makes it true, and a test should hold it true. |

---

## 8. What is decided, and what is not

**Decided (2026-10-29):** D-P1 … D-P6 above, all of them.

**Decided (2026-10-30, the UI/UX):** §4 above. The decisions that changed a
plan:

* **There is no `PinnedPlaylistsScreen`.** `AllPlaylistsScreen` grows into
  it. The earlier hedge in §4 is resolved — one page owns playlists, so the
  Home shelf's "See All" and the management surface are the same list.
* **Home's rail is retitled "Playlists",** and shows pinned first, then
  recency. A rail titled "Pinned Playlists" may only head a collection that
  is all pinned, and the rail shows both. The pin badge says which are
  pinned. This answers the open question below.
* **The kind label gets one owner** (`PLAYLIST_KIND_LABELS`), replacing four
  local copies and one inline ternary. "Mixed" is **not** an invented word
  in this app — `src/constants/strings.ts:280` already has
  `playlistKindMixed: 'Mixed'`.
* **The playlist cover gets one owner** (`PlaylistCover`), so the Library's
  card, the management row and the Home tile show the same playlist the
  same way.
* **The pin is a badge plus a menu action,** not a permanent button on a
  browsing card. The management row and the detail header also carry a
  visible toggle, because a long-press is not reachable by a screen reader
  or a keyboard.
* **No drag-to-reorder.** The pinned order is recency of pinning, so there
  is nothing to drag.

**Decided (2026-10-30, phase 1 — the two facts the plan needed):**

* **The archive sheet works; the audiobook sheet is a dead control.**
  `ArchiveItemDetailScreen.tsx:142-151` builds the sheet item with
  `mediaType: 'audio'` and **no `type`**, so `normalizeMediaClassification`
  (`src/types/media.ts:47-59`) classifies it as `type: 'audio'` — which **is**
  on `PLAYLIST_ALLOWED_MEDIA_KINDS.AUDIO_ONLY`. The archive's playlist
  behaviour is sound, and the plan's suspicion was wrong.
  `AudiobookDetailScreen.tsx:149-158` sets `type: 'audiobook'`, which is
  **not** on the allow-list, so **every playlist refuses it** and the sheet
  opens empty. It is the worst kind of dead control: the empty state says
  *"No playlists yet. Create one to get started."* while the create row is
  hidden, so the instruction can never be followed — in **every** state.
* **The single-lane rule lives in three places, not one.**
  `normalizeSingleLane` (`src/state/playerStore.ts:97-101`) is the store's
  owner, called by `loadPlaylistToPlayer` (`:127`). But `addToPlaylist`
  (`:135-149`) carries **its own copy** of the rule (`:140-143`) and drops
  an incoming item of the other lane **silently**; and `useQueueScreen.ts`
  (`:112`, `:115`, `:128`) filters the queue, the up-next and the history by
  the same lane. `useQueueSync` is confirmed **not** one of them.
* **The rule is consulted with a kind nine call sites declare
  independently.** Five of the nine omit `type` and are classified by the
  broad `'audio'` / `'video'` fallback — which is why a **radio station** and
  a **TV channel** can enter a playlist today, while the audiobook and the
  live-TV favourites cannot. Same media, opposite outcomes, decided by an
  omitted field. **D-P6 is not enforced in the app today**, and the two dead
  sheets are its visible symptom. Phase 3 owns the fix.

**Still to decide, and it does not block phase 1:**

* **Does the mixed playlist switch lanes, or does it play only one lane?** —
  D-P2 says it switches. If the handover proves too fragile in the device
  proof, the fallback is a mixed playlist that plays its **audio** items only,
  with the video items listed but not playable. That fallback is recorded so
  it is a decision rather than a failure.

---

## 9. Links

* **Tracker:** [`SIMBA_V22_PINNED_PLAYLIST_TRACKER.md`](SIMBA_V22_PINNED_PLAYLIST_TRACKER.md)
* **Master plan:** [`SIMBA_V22_MASTER_PLAN.md`](SIMBA_V22_MASTER_PLAN.md) — §1
  document register, §8 register item 60.
* **Bug tracker:** [`SIMBA_BUG_TRACKER_2026_10_21.md`](SIMBA_BUG_TRACKER_2026_10_21.md)
  — the finding record; this feature's *defects* (the silent batch-drop,
  the unwired Movies sections) are logged there as they are confirmed.
