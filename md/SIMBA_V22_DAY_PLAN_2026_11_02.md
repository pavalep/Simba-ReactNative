# SIMBA — the day's plan (2026-11-02)

**Status:** PROPOSED. Nothing in it has been executed. It starts on your
confirmation.

**Baseline:** app `a2ba371` on `f5/w22-close-minimise-d9` (clean, pushed) ·
lib `7b29563` (clean, pushed), npm `latest` = 2.1.0.

**Goal:** finish the pinned-playlist feature — phases 5, 6 and the rest of 7 —
and close the AI-slop sweep, in the least wall-clock time **without cutting
code quality or the feature's intent**.

---

## 0. What I checked in the source this morning (and it changes the plan)

These are not assumptions; each one was read out of the source before this
plan was written.

| # | Finding | Effect |
|---|---|---|
| 1 | **Step 36 is already DONE.** Every kind label reads `PLAYLIST_KIND_LABELS` — `PlaylistCard.tsx:9,61`, `PlaylistCreateModal.tsx:16,138,148`, `PlaylistSheet.tsx:14,224`, `localFilesConfig.ts:2,63-65`. The inline ternary in `AllPlaylistsScreen` is gone. The only remaining copy is `src/constants/strings.ts:278-280`, kept by §4.4's decision. | Step 36 drops out of the build — it is **10 min of verification**, not an increment. |
| 2 | **`FilterType` already includes `MIXED`** (`src/features/library/presentation/types/index.ts` → `'ALL' \| PlaylistKind`). | Step 43's Mixed chip needs **no type work**. |
| 3 | **The app ships TWO `EmptyState` components** — `components/feedback/EmptyState` (19 importers) and `components/utility/EmptyState` (2 importers: `MediaRail.tsx`, `FollowedPodcastsShelf.tsx`). | Step 37 must pick **one**; the sweep deletes the other. **A new AI-slop finding.** |
| 4 | **The app already has the long-press pattern** — `MediaRailCard.tsx:92`: `onLongPress` with `accessibilityHint="Long press for more actions"`. | Step 44 **copies** a shipped pattern instead of inventing one. |
| 5 | **`MoviesScreen` exists** (`src/screens/MoviesScreen/` — `MoviesContent.tsx`, `MovieCard.tsx`, `ListStates.tsx`), plus `MovieDetailScreen` and `AllVideosScreen`. None of the three has a `PlaylistSheet` call site; all nine existing call sites are music / podcast / radio / live-TV. | Step 33 = **three new call sites**, not edits. |
| 6 | **The single-lane rule lives in THREE places** — `playerStore.ts`'s `normalizeSingleLane`, a second copy inside `addToPlaylist`, and `useQueueScreen.ts:112,115,128`. | Phase 5 must land **all three at once** or the queue holds items nobody can see. |

---

## 1. How the parallelism is kept safe

One shared working tree, so **the dependency graph is by FILE, not by phase
number.** Workers get disjoint file ownership; the parent owns the
integration points.

- **Disjoint ownership only.** No two streams touch the same file. Where two
  steps need the same file, they go to the **same** stream.
- **The parent owns the keystone.** The card (Stream 1) and the queue
  (Stream 5) are the two files everything else leans on — the parent keeps
  both, because a half-applied rewrite there breaks every other stream.
- **Workers do NOT `git add` / `commit` / `push`.** The parent commits, once
  the whole wave is green.
- **After every worker ends, the parent reads `git diff` for its files.** A
  worker that dies leaves half-applied edits that still type-check — the
  diff is the evidence, the report is a claim.
- **Concurrency: 3 workers + parent = 4**, which is the runtime's child-task
  limit. One slot is kept free in each wave for a retry.
- **Every wave ends with the parent's own full gate**, and only a green gate
  is reported as landed.

**Not being done, by design:** no renaming, no restructuring for its own sake,
no "while I'm here". Every line changed must answer to a tracker step or a
bug ID.

---

## 2. The streams

### WAVE 1 — four streams in parallel · **~1 h 50 wall clock**

---

#### Stream 1 — the card grows a menu · **parent · 50 min**

**Steps:** 44 (the card's half), 38 (a11y on the card)

**Files**
- `src/components/playlist/PlaylistCard/PlaylistCard.tsx` — **modify**
- `src/components/playlist/PlaylistActionMenu/PlaylistActionMenu.tsx` — **NEW**
- `src/components/playlist/PlaylistActionMenu/index.ts` — **NEW**
- `__tests__/components/playlist/PlaylistActionMenu/PlaylistActionMenu.test.tsx` — **NEW**
- `__tests__/components/playlist/PlaylistCard/PlaylistCard.test.tsx` — **extend**

**What changes**
- `PlaylistCard` gains an optional `onLongPress` and an optional
  `showPinToggle` (the visible 32 px toggle), both **off by default** so the
  Library's browsing card keeps D-P8's "no permanent pin button on a
  browsing card".
- The long-press copies `MediaRailCard`'s pattern: `onLongPress` +
  `accessibilityHint="Long press for more actions"`.
- NEW `PlaylistActionMenu` — a bottom sheet with **"Pin to top"** /
  **"Unpin from top"**, the label changing with the state and
  `accessibilityState={{selected: pinned}}`. It reuses the app's existing
  `BottomSheet`, and `PlaylistManageModal` stays where it is (rename and
  delete are **not** the pin's business).
- The pin toggle is a **button**, never the only way in — the long-press
  menu is a shortcut, the button is the reachable path.

**Tests** — the menu opens on a long-press; the label changes with the state;
the toggle is 32 px; the card's own label says ", pinned".

**Acceptance:** `tsc` 0 · `eslint` 0 · the card suite green · **mutation-checked**
(removing the `, pinned` label must fail the suite).

---

#### Stream 2 — the detail screen + the new page · **worker A · 90 min**

**Steps:** 30, 32, 44 (the detail header's half), 37 (the detail screen's empty state)

**Files**
- `src/screens/PlaylistDetail/components/PlaylistDetailScreen.tsx` — **modify** (967 lines today)
- `src/screens/AddToPlaylistScreen/components/AddToPlaylistScreen.tsx` — **NEW**
- `src/screens/AddToPlaylistScreen/index.ts` — **NEW**
- `src/screens/AddToPlaylistScreen/hooks/useAddToPlaylistScreen.ts` — **NEW**
- `src/navigation/RootNavigator.tsx` — **modify** (the route)
- `src/navigation/types.ts` — **modify** (the route + params)
- `__tests__/screens/AddToPlaylistScreen/AddToPlaylistScreen.test.tsx` — **NEW**

**What changes**
- NEW `AddToPlaylistScreen` — a full page that gathers items from **several
  sections at once** (Movies · Music · Podcasts · Archive · Downloads),
  tagged by lane, so a mixed playlist can be fed from more than one section
  in one visit. It uses the **one** create owner (`PlaylistCreateModal`) and
  the **one** compatibility rule (`compatiblePlaylistsFor`) — no second copy
  of either.
  **AMENDED 2026-11-02 — it ships with THREE sections: Movies · Music ·
  Downloads.** Podcasts and Archive return **containers** — a feed, a
  collection — not playable files, and a row the user could tick but the
  player could not play would be a lie. Their playable items are added from
  their own detail screens (`PodcastDetailScreen` → `PlaylistSheet`,
  `ArchiveItemDetailScreen` → `PlaylistSheet`). The spec's §4.9 and the
  tracker's step 30 carry the same amendment.
- The route goes into `RootNavigator.tsx` + `types.ts`.
- `PlaylistDetailScreen` gains the **"Add items"** action → the new page, and
  a **header pin toggle** (32 px, "Pin to top" / "Unpin from top") so the
  detail header reaches the pin without a gesture (D-P8).
- `PlaylistDetailScreen`'s empty state → **"This playlist is empty"** + an
  **Add items** button, using the **feedback** `EmptyState` (the live one).

**Tests** — the route exists; the screen lists items from two sections; the
pin toggle reaches the store; the empty state offers "Add items".

**Acceptance:** `tsc` 0 · `eslint` 0 · the boundary check 0 errors (a new
route is a boundary event).

---

#### Stream 3 — the sheet reaches the video surfaces · **worker B · 50 min**

**Step:** 33

**Files**
- `src/components/sheets/PlaylistSheet/PlaylistSheet.tsx` — **modify** (the mixed offer)
- `src/screens/MoviesScreen/components/MoviesContent.tsx` — **modify** (call site)
- `src/screens/MovieDetailScreen/components/MovieDetailScreen.tsx` — **modify** (call site)
- `src/screens/AllVideos/components/AllVideosScreen.tsx` — **modify** (call site)
- `__tests__/components/sheets/PlaylistSheet/PlaylistSheet.test.tsx` — **extend**

**What changes**
- `PlaylistSheet` already offers MIXED playlists to both lanes through
  `compatiblePlaylistsFor` — the change is to prove it and to add the three
  call sites.
- The three new call sites pass the item **truthfully**: a movie item
  declares `type: 'movie'` / `mediaType: 'video'`, so the sheet offers it
  the **video** and mixed playlists and refuses it the audio ones. This is
  the D-P6 fix, at the three surfaces that had no sheet at all.
- `MoviesScreen` already has a `MovieCard` with a long-press — the sheet is
  wired to the same gesture the screen already established.

**Tests** — a movie item is offered the video + mixed playlists and not the
audio ones; a mixed playlist appears in all three surfaces.

**Acceptance:** `tsc` 0 · `eslint` 0 · the sheet suite green.

---

#### Stream 4 — the AI-slop sweep, take 1 · **worker C · 50 min**

**Items:** register item 69, the unreferenced `strings.ts`, and the duplicate
`EmptyState`

**Files**
- `src/constants/strings.ts` — **DELETE** (it is not re-exported by
  `src/constants/index.ts`, and all 19 `playlist*` constants have zero
  consumers — it is an entirely unreferenced module)
- `src/components/utility/EmptyState/` — **DELETE** (2 importers)
- `src/components/media/MediaRail.tsx` — **modify** (point at the feedback
  `EmptyState`)
- `src/screens/Home/components/FollowedPodcastsShelf.tsx` — **modify** (same)
- `src/utils/orientation.ts` — **modify** (delete the dead
  `lockToLandscape()` / `unlockAll()` exports — item 69)
- `src/app/AppContent.tsx` — **modify** only if the dead exports are
  referenced there
- `__tests__/**` — **modify** only if a test imports a deleted symbol

**What changes**
- Two owners for one fact become one owner. `strings.ts` was a whole module
  of copy with **zero consumers** — not a "used once" problem, a dead file.
- `lockToLandscape()` and `unlockAll()` have **zero call sites**. Dead
  exports are not API; they are promises the code does not keep.
- `src/constants/index.ts` — **modify** only if it re-exports `strings.ts`
  (verified: it does not).

**Tests** — the surviving `EmptyState` still renders everywhere it is used.

**Acceptance:** `tsc` 0 · `eslint` 0 · **the full jest suite green** (a
deleted module that a test imported would show here, not in `tsc`).

**Risk:** a `strings.ts` symbol may be used by a string-literal search rather
than an import — the worker must grep for the **symbols**, not just the
imports, and report what it found.

---

#### Stream 5 — the native rebuild · **background bash · 0 agent time**

Runs in parallel with everything else; it touches only
`android/**/build/**`.

- `cd android` → `./gradlew :app:assembleDebug` (or the project's own
  assemble task) so the APK's DEX carries **lib 2.1.0's Kotlin** — the
  B-007 (`runMpvCommand`) and B-039 (PiP auto-enter) fixes are Kotlin, and
  no device proof of them means anything until this lands.
- **It is not on the critical path.** If it fails, the wave still completes
  and the failure is reported with its real output.

---

### WAVE 2 — three streams in parallel · **~2 h 15 wall clock**

*Starts when Wave 1 is green and committed.*

---

#### Stream 6 — the queue holds both lanes · **parent · 2 h** ⚠ the risky one

**Steps:** 25, 26, 27, 29

**Files**
- `src/state/playerStore.ts` — **modify** (`normalizeSingleLane`, `loadPlaylistToPlayer`, `addToPlaylist`)
- `src/infrastructure/player/useResumeAwareLaunch.ts` — **modify** (the handover owner)
- `src/screens/QueueScreen/hooks/useQueueScreen.ts` — **modify** (the third copy of the lane filter)
- `src/infrastructure/player/useQueueSync.ts` — **modify** (the session mirror)
- `__tests__/state/playerStore.test.ts` — **extend**
- `__tests__/infrastructure/player/useResumeAwareLaunch.test.tsx` — **NEW / extend**
- `__tests__/screens/QueueScreen/useQueueScreen.test.tsx` — **NEW / extend**

**Staged, so the fallback stays cheap**

| Stage | Time | What | Test |
|---|---|---|---|
| 6a | 30 min | The queue stops narrowing to one lane. `loadPlaylistToPlayer` keeps **every** item of a mixed playlist; `addToPlaylist` stops **dropping** the other lane. | A mixed playlist's queue holds **every** item, both lanes. |
| 6b | 60 min | The lane handover gets **ONE** owner, in the launch seam next to the lane decision the seam already makes — **not** in the playlist screen, **not** in the queue store. | A mixed playlist's item N hands over to the other lane at item N+1. |
| 6c | 30 min | Playback crosses the boundary. Both lanes are already mounted (D9), so the handover is a **session change, not a remount**. | The video lane's mount is **not** torn down at the boundary. |

**The three rules this stream must not break**
1. **Steps 25–27 land together.** Landing 25 alone creates **invisible items**
   — `useQueueScreen` filters by `activeLane`, so a queued video would be
   invisible in the queue screen.
2. **One owner for the lane handover.** The seam, not the screen, not the
   store.
3. **The app's "now playing" session is written only by the launch seam**
   (`useResumeAwareLaunch.ts:212-247`); `useQueueSync` mirrors it. An
   automatic advance must not leave the app's session stale.

**The recorded fallback, if 6b/6c prove intractable in the time box:** a
mixed playlist that plays its **audio** items only, with the video items
listed but not playable. 6a still stands; the feature stays honest. I will
**stop and tell you** rather than quietly shipping the fallback.

**Note:** acceptance needs a **device proof**, which is deferred. The code
lands on unit-test evidence and the device proof stays an open item.

---

#### Stream 7 — the management page · **worker A · 75 min**

**Steps:** 37, 38, 43

**Files**
- `src/screens/AllPlaylists/components/AllPlaylistsScreen.tsx` — **modify**
- `src/screens/AllPlaylists/hooks/useAllPlaylistsScreen.ts` — **modify**
- `__tests__/screens/AllPlaylists/AllPlaylistsScreen.test.tsx` — **extend**
- `__tests__/screens/AllPlaylists/useAllPlaylistsScreen.test.tsx` — **extend**

**What changes**
- The list becomes **`PlaylistCard`s** — the inline 44 × 44 row that
  duplicated the Library's card design is replaced (step 43). The card now
  carries the **visible pin toggle** (Stream 1's prop) and the long-press
  menu.
- The **Mixed** filter chip joins All / Audio / Video, reading
  `PLAYLIST_KIND_LABELS`.
- The **empty states**, each with its copy:
  - no playlists at all → *"No playlists yet"* + a **Create playlist** button
  - playlists exist, **none pinned** → the pinned **section** is not
    rendered at all
  - a filter that matches nothing → *"No playlists match this filter."*
- **No FAB.** The page already has a header `AppButton`; a second create
  affordance is two ways to do one thing.
- The a11y pass: the filter chips state their selection, the hit slop
  widens and the icon does not grow, and the row's own label says ", pinned".

**Depends on:** Stream 1's card props. **Starts after Wave 1 is committed.**

**Acceptance:** `tsc` 0 · `eslint` 0 · the screen's suite green · the empty
states each asserted.

---

#### Stream 8 — the low-value carry-overs · **worker B · 30 min**

**Items:** 39 / 40 / 5 / 6, 52, `setExpandedAspectRatio`

**Files**
- `md/SIMBA_V22_MASTER_PLAN.md` — **modify** (the register entries)
- `md/SIMBA_BUG_TRACKER_2026_10_21.md` — **modify** (only if a finding needs
  a row)

**What changes** — inspection and register bookkeeping, not code:
- **item 39** — the jest force-exit flake: reproduce, and either fix it or
  record it with its real symptom.
- **item 40** — the emulator wipe-data item.
- **item 5 / 6** — the force-window re-verification and the Stage 9 device
  verification. **Both need a device** → recorded as **deferred**, not
  guessed at.
- **item 52** — answered by inspection: `F-023` is already RESOLVED in the
  register. This only needs the entry closed out.
- **`setExpandedAspectRatio`** — still md prose only and does not exist in
  code. Recorded as such in register item 33; the check here is that the
  prose and the code agree.

**Acceptance:** every item either closed with evidence, or recorded as
deferred with the reason.

---

### WAVE 3 — the gates, the docs, the commit · **parent · 45 min**

- **Step 48** — the phase exit: the four gates, read from their output.
- **Step 28** — `PlaylistDetailScreen` plays a mixed playlist in order
  (30 min; depends on Stream 6's API).
- **Step 51** — the device proof: **deferred**, recorded.
- The tracker, the spec, the bug tracker and the master plan updated with
  **evidence**, the way yesterday's `a2ba371` was.
- **Commit + push** — one commit per wave, message via file, gates read from
  output.

---

## 3. The time estimate

| | Serial | Wall clock (parallel) |
|---|---|---|
| Wave 1 (Streams 1–5) | 4 h 10 | **~1 h 50** |
| Wave 2 (Streams 6–8) | 3 h 45 | **~2 h 15** |
| Wave 3 (gates, step 28, docs) | 1 h 15 | **~45 min** |
| **Total** | **9 h 10** | **~4 h 50** |

**Honest caveats.** These are estimates for work of this size, and they
assume no worker dies mid-flight (yesterday one did, and it cost a
re-inspection pass). Treat them as **±25 %**. The parent stream in Wave 2
(2 h) is the long pole and is **not** parallelisable — it is the queue and
the launch seam, and splitting them across two agents would put two writers
in the same state file.

**The rule I will follow:** if a stream overruns its box by more than 50 %,
I **stop it and report** rather than let it eat the next wave. You would
rather have six finished increments than one finished-and-one-half.

---

## 4. Two decisions I need from you

Both are **blocked on your call** and both are cheap to act on the moment
you answer. I have a recommendation for each, but I will not guess.

### D-1 · B-035 — `PlayerRoot` / `PlayerSurface` are vestigial

The app's own video tree has two components that render nothing. Two ways
out:

- **(a) Delete them.** They are dead code; dead code is a promise the repo
  does not keep. *Recommendation.*
- **(b) Make `PlayerRoot` render `<SimbaVideo />`** and give `PlayerSurface`
  a real job — a thin wrapper whose only purpose is to own the surface's
  props. This keeps a name some people may expect to find.

### D-2 · B-036 — the PiP source rect

The PiP window's source rect needs the aspect arithmetic, and the decision
is *what the rect means*:

- **(a) The video's own rect** — the picture's real on-screen bounds, so the
  PiP window crops exactly to the picture. Needs the aspect arithmetic done
  properly against the live surface.
- **(b) The whole view's rect** — simpler, and what most players do; the
  PiP window shows the surface's full bounds including any letterboxing.

Both are defensible; (b) is what Plex and VLC do, and it is much less
arithmetic.

**There is a third thing I need from you, and it is not a decision — it is a
scope call:**

### D-3 · Phase 5's device proof, and the native rebuild

Stream 5's acceptance needs a device, and device tests are deferred. The
rebuild (Stream 5 of Wave 1) is in the plan so the DEX carries lib 2.1.0's
Kotlin — but **no device proof runs today**. Confirm: the code lands on
unit-test evidence, and the device proof stays open? *(My plan assumes
yes.)*

---

## 5. What is **not** in today's plan, and why

| Item | Why not |
|---|---|
| The native rebuild's **device proof** (B-007, B-039) | Device tests are deferred. The rebuild runs; the proof does not. |
| B-012's native half | Needs a device trace. |
| B-018 | The system document picker's tree is unreadable to `uiautomator` — an OS limitation, not an app defect. |
| B-019 / item 37 | CDP `Runtime.enable` times out. Blocked upstream. |
| The Argent 0.30.1 bump | `argent update` is still broken on this machine (upstream `resolvePackageRoot`); it needs the `npm install -g` bypass, **and any bump still needs your explicit consent**. |
| B-009's residual (the `onCacheState` render churn) | It needs a **decision** first — the resolution the buffered band is drawn at — then a quantisation. Not a blind fix. |
| Any refactor with no tracker step behind it | Out of scope by rule. |

---

## 6. The order, and what I need from you

1. **Confirm this plan** — or tell me what to change.
2. **Answer D-1 and D-2** (and confirm D-3) so they can ride along instead
   of waiting.
3. I run **Wave 1**, gate it, commit it, and report — with the same coverage
   table and the same "Carried forward" list as yesterday.

Then Wave 2, then Wave 3. I will not run ahead of a wave you have not seen.
