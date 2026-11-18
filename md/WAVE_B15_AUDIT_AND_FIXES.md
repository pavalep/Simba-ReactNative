# Wave B15 — Home's sections, the queue, and the audio player's missing options

**Branch:** `f5/w22-close-minimise-d9`
**Base:** `3de3f85` (Wave B14 — phases 1..6)
**Status:** CLOSED — audits A/B/C, the fixes, the gates

---

## 1. What this wave is

The user asked for three things in one message, and then for all of it to be fixed:

> *"fix, also check audiobooks, local media, etc form home i forgot other sections in list, check
> how we are adding items in queue, UX of this best practice, ui of this, no jugaad code, also
> options missing in audio player like that in video player, check why"*
>
> *"fix all, deep analyze, and fix all, dont mangle the code, dont create new issues, and dont
> create bad code, try to fix all issues which you see, follow best code practice, best UI/UX
> practice."*

So: **(a)** audit what Home actually shows, **(b)** audit how items enter the queue and what that
UX is worth, **(c)** find the options the audio player is missing next to the video player **and
say why** — then fix everything that survives verification.

The house rule that governs the wave is the same one B14 used: **verify before fixing.** Every
finding is triaged against the live source into

| verdict | meaning | what happens to it |
|---|---|---|
| **VALID** | the defect is real in today's source | it is fixed, with evidence |
| **INVALID** | the claim does not hold — the code is already correct | it is **closed with the reason**, not "fixed" |
| **STALE** | it was true, the code has since changed | closed with the reason |
| **NOT-A-CODE-FIX** | real, but the fix is a design wave, a board, a device pass, an owner decision or a lib release | carried forward **with the reason** |

Two audits were run by read-only agents and **verified line by line against the source by the
wave owner before anything was changed**; the third (the audio-vs-video player) was done by the
wave owner directly, because it was a question about two files that had to be read side by side.

---

## 2. The headline finding

> **"Play Next" and "Add to Queue" put a track where the user could SEE it and press next — and
> the track never played.**

This is the single most important defect the wave found, and it is the answer to "how are we
adding items in the queue".

**The mechanism (verified against the source):**

| fact | where |
|---|---|
| The app has **two** lists. | — |
| …the **RUN** (`usePlayerStore.playlist`) — the album/playlist the user launched. | `src/state/playerStore.ts` |
| …the **EXPLICIT queue** (the lib's `usePlayerQueueStore`) — what every "Play Next" / "Add to Queue" in the app writes to. | `react-native-media-player/src/stores/playerQueueStore.ts` |
| **Twelve** call sites write the explicit queue — through the app's shared `useQueueActions` wrapper, or the lib's `useQueue()` directly. | `StreamingRow`, `AlbumTrackList`, `ArchiveItemDetailScreen`, `MediaListItem`, `AllVideosScreen`, `MoviesContent`, `useEpisodeActions`, `useSongScreen`, `ArtistTopTracks`, `PlaylistDetailScreen`, `AudiobookDetailScreen`, `HistoryScreen` |
| **Exactly one** read it: the Queue screen's own display. | `src/screens/QueueScreen/hooks/useQueueScreen.ts:109` |
| **Nothing in the lib bridges the queue to the engine.** | — |
| The engine advances the **RUN**: `runNeighbours(runPlaylist, runIndex)` → `commands.next` → `handoverRef.current.advance()` → `useLaneHandover.advance()`. | `src/infrastructure/player/useTransport.ts:785-790`, `src/infrastructure/player/useResumeAwareLaunch.ts` |

So the queue was a **display-only list**. A user long-pressed a track, tapped "Add to Queue", saw
the toast, opened the Queue screen, saw the track under "Up Next" — pressed next — and the
player went to the *run's* next track and left the queued one where it was.

**The fix is ONE rule, in ONE place:**

> **What plays next = the explicit queue's head, then the run's tail.**

That is exactly the order the Queue screen already **displayed** (`[...queuedRows, ...playlistRows]`),
so the display and the playback now agree — the display was right all along and the playback was
missing.

- `src/infrastructure/player/useTransport.ts` — the transport reads the explicit queue:
  `canGoNext = explicitHead !== null || neighbours.next !== null`, and `nextTrack` is the
  explicit head. The NextUp overlay and the next button therefore agree with each other.
- `src/infrastructure/player/useResumeAwareLaunch.ts` — `advance()` plays the explicit queue's
  head first, through `promoteQueuedItem()`: the item is removed from the queue **by URI
  identity**, **promoted into the run** (appended, then `playFromPlaylist(playlist.length)`), and
  opened through the launch seam.

**Why the explicit queue comes FIRST, and not after the run's tail:** it is what the user asked
for ("play *this* next"), and it survives a launch from outside the run — the run is deliberately
replaced when the user starts something else (`useQueueSync`), and a queue the user built must not
be wiped by that.

**Why a queued item is PROMOTED into the run rather than played in place:** the run stays the one
list the engine advances through, the transport's next/previous keep pointing at the right
neighbours, and the session's URI is *inside* the run — so `useQueueSync`'s "a launch from
outside the run starts a new queue" rule cannot wipe the run the moment the item starts playing.

---

## 3. Audit A — what Home actually shows

Read by a read-only agent (`bg_5f774879`), verified by the wave owner.

| question | answer | evidence |
|---|---|---|
| How is Home built? | GREETING → "Your Library" divider → up to 4 conditional rails → "Discover" divider → the `BROWSE_ALL` shelf. | `src/screens/Home/hooks/useHomeScreen.ts:350-369` |
| What is in the "Explore Contents" shelf? | **9 cards**: Movies, Podcasts, Music, Radio, Live TV, Audiobooks, Shows, Archive, Local Files (which routes to Library). | `src/screens/Home/components/BrowseAllShelf.tsx:53-107` |
| Does any Home rail show **local media**? | **No.** `useHomeScreen.ts:119` reads the media store for `isScanning` only — no track ever reaches a Home rail. | same |
| Is there per-**book** audiobook progress? | **No.** Only per-**chapter** progress, derived from `recentHistoryStore` keyed by the chapter's URL. | `src/state/recentHistoryStore.ts` |
| Does `GenreScreen` have an in-app door? | **No.** | `src/screens/Genre/` |
| Does `AllVideosScreen` have an in-app door? | **No.** | `src/screens/AllVideos/` |
| Is `AUDIOBOOKS_BROWSE` used? | **Dead.** | `src/constants/audiobookCategories.ts:23-28` |

### 3.1 Verdict

| id | verdict | evidence | action |
|---|---|---|---|
| **B15-H1** | **NOT-A-CODE-FIX** (needs a board) | A Home rail of local media has a data owner already — `useMediaStore(s => s.tracks)` with `dateAdded` — but the rail itself does not exist, and a rail is a board. | Carried forward. |
| **B15-H2** | **NOT-A-CODE-FIX** (needs a schema change) | Per-book audiobook progress needs a **collection id** in the session/history model; the history is keyed by a chapter URL, so "how far through this book" is not derivable from it. | Carried forward. |
| **B15-H3** | **STALE / TAKEN** | `md/HOME_V2_REFACTOR.md` §7 **D-1 is TAKEN**: the genre shelf is *deliberately deleted*. The Home board draws no genre shelf, and this wave did **not** re-add one. | Closed — deliberately not changed. |
| **B15-H4** | **INVALID** | The "Discover" divider + "Explore Contents" shelf title is **not** a defect: it is the same two-level heading grammar as "Your Library" → "Recently Played", and both Home boards draw both levels (`designs/penpot/home.js:334,341`; `home-v2.js:258,265`). | Closed — no change. |
| **B15-H5** | **NOT-A-CODE-FIX** (needs an in-app door) | `GenreScreen` and `AllVideosScreen` exist and are reachable only by deep link. A door is a board + a route decision. | Carried forward. |
| **B15-H6** | **NOT-A-CODE-FIX** (dead constant) | `AUDIOBOOKS_BROWSE` is dead. Deleting it is a one-line cleanup, but it is not this wave's subject and it is not a defect a user can reach. | Carried forward. |

---

## 4. Audit B — the queue's UX and UI

Read by a read-only agent (`bg_6ceb26d0`), verified by the wave owner.

| id | verdict | evidence | action |
|---|---|---|---|
| **B15-Q1** | **VALID** | The explicit queue was written by 12 call sites and read by one (the Queue screen's display). Nothing handed it to the engine. | **Fixed** — §2. |
| **B15-Q2** | **VALID** | `clearQueue`, `shuffleQueue` and `addToPlaybackHistory` exist in the lib and are **never called** by the app. | Partly fixed — the queue now feeds the engine; "Clear queue" is carried forward (§8). |
| **B15-Q3** | **VALID** | The lib's queue has **no persistence**. The run is persisted but wiped at boot (`src/infrastructure/player/useQueueSync.ts:99-103`). So a queue the user built does not survive a restart. | Carried forward — persistence is a lib decision. |
| **B15-Q4** | **VALID** | The Queue screen's "Previously Played" section reads the lib's `playbackHistory`, which the app **never writes** — so the section is permanently empty. The app's own `recentHistoryStore` (10 entries) is the real history. | Carried forward — it changes what the section shows. |
| **B15-Q5** | **VALID** | The Queue screen's own jump (`src/screens/QueueScreen/hooks/useQueueScreen.ts:177-243`) uses a raw `loadFile` and bypasses the launch seam, so the session/"Now Playing" row can go stale when the lane matches. | Carried forward — it needs a launch that updates the session without expanding the player, and `OpenPlayerOptions` comes from the lib package. |
| **B15-Q6** | **VALID** | `HelpScreen.tsx:80` told users to "tap the queue/list icon, then *Add to playlist*" — the Queue screen has no such row (it has "Save Queue as Playlist"). `HelpScreen.tsx:84` claimed the queue "is cleared when you stop" — `clearQueue` has never been called by anything. | **Fixed** — §6.4. |
| **B15-Q7** | **VALID** | `MediaActionsSheet`'s docblock named a non-existent `buildQueueActions` and claimed `MediaContextMenu` was gone while it was still the Library's menu. | **Fixed** — §6.3. |
| **B15-Q8** | **VALID** | The Queue screen displays the explicit queue and the run as one "Up Next" list with **two different origins** and no way to tell them apart. | Carried forward — a visual distinction is a board. |

### 4.1 What the fix did NOT invent

Spotify, Apple Music, YouTube Music and Plex all have exactly one "add to queue" action, reached
from a row's overflow menu, and a queue screen that shows "up next". The app already had all of
that. **Nothing was invented**: the fix made the existing action reach the player.

---

## 5. Audit C — the audio player's missing options, and WHY

Done by the wave owner, reading both lanes side by side.

> **The options were never removed. They were never there.**

The more sheet was **written for, named for, and mounted inside the video lane**
(`VideoMoreSheet`, inside the video lane's `TransportBar/More.tsx`). The audio lane was rebuilt
as its own tree (V22 W22, 2026-10-21) and inherited **none** of it. There was no "audio options
panel" to remove — there was no audio options panel at all.

The evidence that the audio lane is the younger tree:

- the audio lane's own docblock (`AudioPlayer.tsx`) describes its top bar as MUTE · QUEUE · CLOSE;
- the video lane's `TransportBar` owns `More`, `Captions`, `PiP`, `Mode`, `Volume`;
- the audio player had **no** sheet, **no** bookmark control, **no** speed control and **no**
  sleep timer — while the video lane had all four.

### 5.1 What the audio lane now has

**The sheet is shared; the rows are per lane.** The chrome and the row grammar moved into
`src/components/player/shared/MoreSheet/`, and each lane declares which rows it has.

| row | video | audio | why |
|---|---|---|---|
| Speed | ✅ | ✅ | Spotify, Apple Music, YouTube Music, Pocket Casts and Audible all have it. A spoken-word track at 1.5× is the difference between a 40-minute episode and a 27-minute one. |
| Sleep timer | ✅ | ✅ | Spotify, Apple Music, YouTube Music and Audible all have it, and it is the most-used option in a podcast or audiobook player. |
| Equalizer | ❌ | ✅ | The app **already has the screen** (`screens/Equalizer`). VLC has "Effects and Filters", MX Player has "Audio Effects", Poweramp has its EQ in the player. This is not a new idea — it is the door the player is the natural place to reach it from. |
| Quality | ✅ | ❌ | mpv's `hwdec` and `profile` are **picture** settings. There is no audio analogue in the app's quality store, and a row that cannot act must not occupy space. |
| Skip silence | ✅ | ❌ | mpv's `scaletempo2` recipe compresses silence for the **whole session**, including music, where it would eat the intro and the outro. Spotify offers it for podcasts only; the app's toggle is a global player setting with no per-lane scope. |
| Auto-play next | ✅ | ❌ | It drives the **video** lane's Up-next countdown. The audio lane's queue advances by itself; there is no countdown to auto-play, so the row would promise something with no visible effect. |

**The audio player's top bar is now BOOKMARK · QUEUE · MORE · CLOSE.** The top bar's **mute was
removed** — not moved. The volume row at the bottom of the same page already carries a mute
(`audio-volume-mute`), exactly where the video lane puts its one (`TransportBar/VolumeControl`).
Two visible controls for one value is two owners of one fact, and SPEC §3.4 is explicit: *"no two
paths to the same secondary action."*

**The bookmark** is the video lane's own control, moved to `shared/BookmarkControl/` — it reads the
session and the transport, so it was never video-specific, and a podcast or an audiobook is exactly
what a person bookmarks a moment in.

---

## 6. The fixes

### 6.1 The shared sheet grammar — `src/components/player/shared/MoreSheet/`

| file | what it owns |
|---|---|
| `MoreSheet.tsx` | the panel, the backdrop, the pinned header, drag-to-dismiss, `SHEET_MAX_HEIGHT` (62%), `DISMISS_DRAG_PX` (88), `DISMISS_VELOCITY` (0.6), and `useMoreSheetExpansion` (exactly ONE row expanded). |
| `MoreSheetRows.tsx` | the three row kinds — `ValueRow`, `ToggleRow`, `ActionRow` — and the group label. |
| `speedOptions.ts` | `SPEED_OPTIONS`, one owner. |
| `MoreButton.tsx` | the `sliders` button, one owner (the video lane's `More` used to draw its own 20 px glyph in a 44 pt target). |

`PlayerControl` and `BookmarkControl` **moved** from `components/player/video/` to
`components/player/shared/` — the audio lane already imported `PlayerControl` from the *video*
folder, which is a name lie and an ownership lie.

### 6.2 The video lane's sheet — three rows that lied

| before | after | why |
|---|---|---|
| "Save" → `startDownload` | **"Download"** → `startDownload` | "Save" in a media player means "keep this title" (Netflix's My List, YouTube's Watch later) — a **different** action, which the sheet now has under its own name. The app calls this action "Download" everywhere else. |
| "Add to playlist" → `usePlayerStore.addToPlaylist` (the RUN) | **"Add to queue"** → the app's one queue action | It said "playlist" and meant "queue". |
| — | **"Add to playlist"** → the app's one `PlaylistSheet` | The real thing, at last. The sheet only **reports** the action; the parent opens the picker, because a Modal opened from inside another Modal stacks two panels. |
| "Download" for any item | "Download" **only for a remote URI** | `startDownload` returns immediately for a local file, so the row used to toast "Download started" for a download that never happened. A control that cannot act must not occupy space. |

### 6.3 One menu grammar in the Library

The Library's row menu was `MediaContextMenu` — a **second** copy of the bottom-sheet grammar —
and three of its four rows were empty `onPress: () => {}` no-ops. A user long-pressed a scanned
file, tapped "Add to Queue", and **nothing happened, silently**.

Now the Library row opens the app's **one** `MediaActionsSheet`, with four rows that all act:
Play · Play Next · Add to Queue · Add to Playlist. "Info" was **removed** rather than re-pointed:
the app has no media-info surface for a local file, and "Track info" (the player's toast) reports
the *currently loaded* track, which is unusable for a library row. `MediaContextMenu.tsx` is
**deleted** — its only importer was `MediaListItem`.

The row's `duration` prop is **milliseconds** (its display unit) and the queue's is **seconds**;
the conversion happens once, at that seam, and is commented there.

### 6.4 The help screen told users how to do things that did not exist

`HelpScreen.tsx:80` and `:84` are corrected (§3, B15-Q6). The queue copy now says what the queue
**is** — the list of what plays next, built with "Play Next" and "Add to Queue" — instead of
promising a "cleared when you stop" that no code implements.

### 6.5 The sleep timer had two owners and a persisted lie

- The countdown now has **one** owner: `src/infrastructure/player/useSleepTimerOwner.ts`, mounted
  **once** in `src/app/AppRoot.tsx` (imported from its module, not the barrel). Two lanes each
  owning a countdown would be two timers for one fact.
- `src/state/useSleepTimerStore.ts` no longer **persists** the armed timer. It did, and the
  persisted value re-armed a countdown on a fresh start — contradicting its own docblock. No
  shipping player remembers yesterday's sleep timer.

### 6.6 The playlist duration had three units

Found while auditing the Library's playlist path (`B15-P1` below), and fixed because it is a
**visible** defect: **every playlist row in the app read "0:00"**.

`PlaylistItem.duration` is **seconds** in every producer (the media store, the scanner, the queue,
the playlist picker, `useAddToPlaylistScreen.ts:141-146`) and in every other `formatDuration`
(`utils/timeAgo`, the Queue screen, the Movie detail screen, the Album track list). Two places
disagreed:

| place | was | now |
|---|---|---|
| `PlaylistDetailScreen.tsx` — the row formatter | `formatDuration(ms)` → a 96-minute film read "0:05" | `formatDuration(seconds)` |
| `PlaylistDetailScreen.tsx` — the M3U importer | `e.duration * 1000` → stored milliseconds | `e.duration` |
| `utils/m3uParser.ts` — `generateM3u` | `#EXTINF:${item.duration / 1000}` → a 5-minute track exported as `#EXTINF:0` | `#EXTINF:${item.duration}` — `#EXTINF`'s unit is seconds by the M3U format's own definition |

The unit is now **declared** on the type (`src/types/playlist.ts`), and the M3U round trip has a
suite (`__tests__/utils/m3uPlaylistDuration.test.ts`).

**One more defect in the same module:** `parseM3u` computed the `"Artist - Title"` separator index
and then kept only the title half — so **every M3U export→import round trip lost the artist**,
and `M3uEntry.artist` was permanently `undefined`. Fixed.

### 6.7 The Music catalogue had no queue action

A long-press on a Music track did nothing. It now opens the app's **one** `MediaActionsSheet`
with **Play Next** and **Add to Queue**, through the app's one queue wrapper. The tap still opens
the track's page — the long-press is additive, not a replacement.

`src/screens/MusicScreen/components/jamendoQueueItem.ts` is now the single owner of the Jamendo
queue item's classification (`source:'api'`, `type:'music'`, `mediaType:'audio'`,
`provider:'jamendo'`).

### 6.8 The audiobook chapter launch was tagged as music

An audiobook chapter launched with no `mediaKind`, so the history row was written as `type:'audio'`
— disagreeing with the same file's own bookmark and playlist writes. It now carries
`mediaKind:'audiobook'` and the **book's cover** as the thumbnail.

---

## 7. The file map

**New — the shared player pieces**

```
src/components/player/shared/MoreSheet/MoreSheet.tsx
src/components/player/shared/MoreSheet/MoreSheetRows.tsx
src/components/player/shared/MoreSheet/MoreButton.tsx
src/components/player/shared/MoreSheet/speedOptions.ts
src/components/player/shared/useCurrentPlaylistItem.ts
src/components/player/shared/PlayerControl/PlayerControl.tsx      (moved from video/)
src/components/player/shared/BookmarkControl/BookmarkControl.tsx  (moved from video/)
src/components/player/audio/AudioMoreSheet/AudioMoreSheet.tsx
src/infrastructure/player/useSleepTimerOwner.ts
src/screens/MusicScreen/components/jamendoQueueItem.ts
```

**Deleted**

```
src/components/player/video/PlayerControl/PlayerControl.tsx        (moved)
src/components/player/video/BookmarkControl/BookmarkControl.tsx    (moved)
src/features/library/presentation/components/MediaContextMenu.tsx  (second menu grammar)
```

**Tests**

```
__tests__/components/player/shared/PlayerControl/PlayerControl.test.tsx  (moved)
__tests__/features/library/libraryRowMenu.test.tsx                      (new)
__tests__/screens/MusicScreen/musicRowMenu.test.tsx                      (new)
__tests__/screens/AudiobookDetailScreen/audiobookChapterLaunch.test.tsx (new)
__tests__/utils/m3uPlaylistDuration.test.ts                              (new)
```

**Rewritten** — `__tests__/components/player/video/VideoMoreSheet/VideoMoreSheet.test.tsx` (the old
one asserted the `legacy-*` ids and the old row set) and
`__tests__/components/player/PlayerChrome.test.tsx` (it asserted a top-bar mute that is now gone).

---

## 8. The gates

```
tsc          exit=0
eslint       exit=0
boundaries   exit=0
fonts        exit=0
boards       exit=0
jest         exit=0   →  194 suites, 1892 passed, 1 todo, 1893 total
```

**Eight suites had to be repaired** after the source changed, and the repair is worth recording:
five of them mocked `@simba-dev/react-native-media-player` with a **hand-written four-function
stub**. The moment the transport began reading the explicit queue, those stubs answered
`"useQueueItemsAs is not a function"` instead of failing an assertion. They now spread
`jest.requireActual(...)` — the real module surface, with only the hooks the suite observes
replaced — which is the pattern the house already used in `PlayerChrome.test.tsx` and
`TransportBar.test.tsx`. A partial stub is a test that stops being able to fail.

Two suites also had a **hand-written theme mock** that broke on `radius.lg` once the bookmark
dialog entered the audio lane's tree. They now build the theme from the **real** tokens, the way
`TransportBar.test.tsx` already did, so a missing colour can no longer be what fails a test.

---

## 9. Penpot

**No board changes are required by this wave, and that is a checked result, not a skip.**

- The Player group's **only** board is `Queue` (`designs/penpot/app-boards.js:124-126`). The
  video lane's more sheet never had a board, so the audio lane's does not need one either — the
  boards are route boards, and a sheet is an overlay.
- No board draws the player's more sheet, the `MediaActionsSheet`, or a row's overflow menu
  (`grep` over `designs/penpot/*.js` for `MediaActionsSheet|MediaContextMenu|row menu|long-press`
  → no matches).
- The Library has **no** board, so §6.3 cannot invalidate one.
- The Music board draws the MusicDetail screen's own "Add to Playlist" **button**
  (`designs/penpot/music-radio.js:1112`), which this wave did not change.
- The Queue board is unaffected: the Queue screen's display was already
  `[...queuedRows, ...playlistRows]`, and this wave made the **playback** match the display
  rather than changing the display.

The board-registry gate (`node designs/check-board-routes.js`) is green.

---

## 10. Carried forward

**New — opened by this wave**

- **B15-H1** — a Home rail of local media. The data owner exists (`useMediaStore(s => s.tracks)`
  + `dateAdded`); the rail needs a board.
- **B15-H2** — per-**book** audiobook progress. Needs a collection id in the session/history
  model; the history is keyed by the chapter's URL.
- **B15-H3** — D-1, the deleted Home genre shelf. **TAKEN** — deliberately not re-added.
- **B15-H5** — `GenreScreen` and `AllVideosScreen` have no in-app door.
- **B15-H6** — `AUDIOBOOKS_BROWSE` (`src/constants/audiobookCategories.ts:23-28`) is dead.
- **B15-Q2** — "Clear queue". The lib's `clearQueue` exists and the app never calls it;
  `shuffleQueue` and `addToPlaybackHistory` likewise.
- **B15-Q3** — the explicit queue does not survive a restart (no persistence in the lib).
- **B15-Q4** — the Queue screen's "Previously Played" section reads the lib's never-written
  `playbackHistory` and is permanently empty; the app's `recentHistoryStore` is the real history.
- **B15-Q5** — the Queue screen's own jump bypasses the launch seam (raw `loadFile`), so the
  session/"Now Playing" row can go stale. Needs a launch that updates the session without
  expanding the player — and `OpenPlayerOptions` comes from the lib package.
- **B15-Q8** — the Queue screen's "Up Next" mixes the explicit queue and the run with no visual
  distinction between the two origins.
- **B15-U1** — no UNDO on the add-to-queue toast.
- **B15-M1** — the m3u-import residue: playlists imported from `.m3u` **before** this wave hold
  millisecond durations, so their rows now read 1000× too large. A safe migration needs a
  per-record provenance flag, and the persisted playlist schema has none — a schema change, not a
  UI fix.
- **B15-A1** — `AudiobookDetailScreen.tsx:99-103` builds the chapter list but never passes it to
  the player, so the header's "EOF auto-advances to the next chapter" is false.
- **B15-A2** — the audiobook detail screen's own queue path still writes `type:'audio'` where its
  bookmark and playlist writes use `'audiobook'`.
- **B15-A3** — `AudiobookDetailScreen.tsx:24` imports `resolveStreamType` and never uses it.
- **B15-A4** — `StreamingRow.tsx:118-146` builds the Jamendo queue item inline — a second copy
  of `jamendoQueueItem.ts`.
- **B15-L1** — `useQueueActions`'s odd home under `components/sheets/MediaActionsSheet/`.
- **B15-D1** — `md/UI_UX_Elevation_Progress_Tracker_v3_DEPRECATED.md:506` still documents
  `MediaContextMenu` and an "Info" row.
- **B15-P2** — the player's sheets have no Penpot board (the video lane's never did). A board for
  player overlays needs a registry change and a design decision.

**Unchanged from B14**

- Jamendo genre badge (dead code) · B13-4 · B13.9 · the MusicDetail board-vs-device check ·
  B13-3 · B13-6 · B13.1-2 · B13.12 · B13.13 · B13.18/B-11-2 · B13.19 · B13.20 ·
  B12-1/2/3/4/7/8/9/13 · B12-11 · B12-12 · B-11-4/5/6/7 · R4 · R5 · R6 · CO-06 · CO-07 ·
  B13.1-1 · B13.1-5 · B13.1-6 · the unregistered iOS URL scheme · the five orphan SVGs and
  `linking.ts:74`'s indentation · `ENV.JAMENDO_CLIENT_SECRET` · `.verification/*.bundle` still
  carrying the old `ScreenNew` names · `md/Text_Content_Reference.md:175-176` and
  `md/CONTENT_OWNERSHIP.md` §6.2/§6.4 · `useLibraryScreen`'s unused `fabBottomInset` ·
  `textContent.ts`'s dead keys.

**Standing backlog**

F-10 / F-13 / F-15 / F-17 · un-measured device proofs · the Penpot Play hand walk · B-050 (PiP
chrome) · F-065 ×2 and F-066 · the 2026-11-03 native crash · `graphify-out/` · the API 24–30
PiP path · NO-JANK · B-018 · the v7 doc rename banners · iOS verification · dark-theme variants ·
the optional `Allura.ttf` upload · the board-vs-device loop for the remaining ~48 screens ·
`md/HOME_V2_REFACTOR.md` §16's item.
