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

---

## 4. What the pages become

### NEW — `AddToPlaylistScreen`

A **full page**, not a sheet, because it has to gather items from **several
sections at once**. Today "add to playlist" only ever adds the one item you
arrived with.

* Reached from `PlaylistDetailScreen`'s "Add items" action.
* Section picker: **Movies · Music · Podcasts · Archive · Downloads** — the
  sections that hold playlist-legal media.
* Two panes on a wide screen, a push-and-pop on a phone: pick a section, tick
  items, tick a playlist.
* Every item it offers is **lane-tagged**, so a `MIXED` playlist can be fed
  from more than one section in one visit.

### NEW — `PinnedPlaylistsScreen`

The management page the Home shelf's "VIEW ALL" should eventually open, or
that `AllPlaylistsScreen` grows into:

* Pin / unpin, reorder, rename, delete.
* Pinned first, then recency — the same order as the Home shelf, so the two
  agree.

### CHANGED — `AllPlaylistsScreen`

* Its inline create modal is **replaced** by `PlaylistCreateModal`.
* The kind row gains **Mixed** — the label is already in the file
  (`AllPlaylistsScreen.tsx:112-116`).
* Gains the pin action.

### CHANGED — `PlaylistDetailScreen` (967 lines today)

* Plays a mixed playlist **in order, across lanes** (D-P2).
* Gains an "Add items" action → `AddToPlaylistScreen`.

### CHANGED — `PlaylistSheet`

* Offers **mixed** playlists to both lanes.
* Its inline create mode is **replaced** by `PlaylistCreateModal`.
* Wired at the Movies sections (D-P5).

### CHANGED — `PlaylistCard`

* A mixed playlist's badge reads **"Mixed"**.
* A pin glyph, for a pinned playlist.

### CHANGED — Home's "Pinned Playlists" shelf

* Pinned first, then recency (D-P3).

### CHANGED — the Library's playlist filter rail

* Gains a **Mixed** chip.

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

**Still to decide, and it does not block phase 1:**

* **Does the mixed playlist switch lanes, or does it play only one lane?** —
  D-P2 says it switches. If the handover proves too fragile in the device
  proof, the fallback is a mixed playlist that plays its **audio** items only,
  with the video items listed but not playable. That fallback is recorded so
  it is a decision rather than a failure.
* **Does the Home shelf keep the non-pinned playlists below the pinned ones,
  or show pinned only?** The shelf is small; showing both may crowd it.

---

## 9. Links

* **Tracker:** [`SIMBA_V22_PINNED_PLAYLIST_TRACKER.md`](SIMBA_V22_PINNED_PLAYLIST_TRACKER.md)
* **Master plan:** [`SIMBA_V22_MASTER_PLAN.md`](SIMBA_V22_MASTER_PLAN.md) — §1
  document register, §8 register item 60.
* **Bug tracker:** [`SIMBA_BUG_TRACKER_2026_10_21.md`](SIMBA_BUG_TRACKER_2026_10_21.md)
  — the finding record; this feature's *defects* (the silent batch-drop,
  the unwired Movies sections) are logged there as they are confirmed.
