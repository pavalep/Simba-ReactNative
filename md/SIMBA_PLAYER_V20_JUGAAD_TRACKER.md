# SIMBA Player — V20 Jugaad Audit & Fix Tracker

**Status:** ACTIVE — WAVE 1
**Opened:** 2026-10-09
**Scope:** Every defect that is *placeholder*, *inert*, *lying*, or *absent* in the player,
Recently Played, Bookmarks and resume surfaces. No jugaad ships.

---

## How to read this file

Every row carries a **Confidence** mark. This is deliberate — a tracker that mixes
"proven on device" with "suspected by reading code" is worse than no tracker.

| Mark | Meaning |
| --- | --- |
| `DEVICE` | Reproduced on a real device/emulator with quoted evidence. |
| `CODE` | Read in source, cited `file:line`. Not yet reproduced. |
| `PENDING` | Awaiting the agent sweep in flight. |

**Status** values: `OPEN` · `FIXED` · `VERIFY` (code landed, device proof outstanding) ·
`BLOCKED` (needs a decision or a capability that doesn't exist yet).

---

## Wave 1 — the black screen, and the four defects the user named

The user's brief: *"black screen is for videoplayer… no cover art… where is option for
sound, mute, queues… reaudit, im seeing jugaad ui… start from homescreen, go through
recent, where recent is added, same for bookmark… it should resume for screenshot, but
alert is when started playing, after sometime it autocloses… check when added to recent
its properly badged, and im seeing no thumbnail image of video or audio in recent and
bookmarks, so incomplete."*

| ID | Sev | Defect | Confidence | Status |
| --- | --- | --- | --- | --- |
| `C-01` | P0 | **Stale APK — the real cause of the audio black screen.** JS bundle (1.13.0) calls `startAudioPlayback`; the installed binary predates the lib and lacks the method. | DEVICE | `OPEN` — rebuilding |
| `C-02` | P0 | **Audio black screen** — audio opened a `PlayerActivity` rendering *video* chrome. | DEVICE | `FIXED` |
| `C-03` | P0 | **Video black screen** — video renders black while position advances. | DEVICE | `OPEN` |
| `C-04` | P1 | **Resume dialog fires AFTER playback starts**, not before. | DEVICE | `OPEN` |
| `C-05` | P1 | **Resume dialog auto-closes** after a few seconds with no user action. | DEVICE | `OPEN` |
| `C-06` | P1 | **Resume dialog shows no screenshot** — text only. | DEVICE | `OPEN` |
| `C-07` | P1 | **Recently Played / Bookmarks render no artwork** — grey circle + generic play glyph. | DEVICE | `OPEN` |
| `C-08` | P1 | **Audio player shows no cover art** although the podcast rail renders artwork fine. | DEVICE | `OPEN` |
| `C-09` | P1 | **Audio player has no volume, no mute, no queue.** | DEVICE | `OPEN` |

### Evidence for `C-01` (this is the load-bearing diagnosis)

Three independent facts, no speculation:

1. `node_modules/@simba-dev/react-native-media-player` = **1.13.0**, and
   `android/.../MpvBridgeModule.kt` line **1969** declares `fun startAudioPlayback`.
2. `android/app/build/outputs/apk/debug/app-debug.apk` — `LastWriteTime **08-10-2026
   14:24:26**`, i.e. built *before* 1.13.0 was installed.
3. Device logcat after tapping **Continue** on a podcast episode, 14,101 lines:
   - `TypeError: undefined is not a function` — the only JS error
   - `startAudioPlayback` — **0 occurrences**
   - `MpvBridgeModule` — **0 occurrences**
   - `MediaPlaybackService` — **0 occurrences**

The JS was right and the binary was stale. The correct fix is a rebuild — **not** a JS
shim that fakes success. A shim here would have hidden a broken binary behind a
green checkmark, which is exactly the jugaad this audit exists to remove.

### Evidence for `C-02` (fixed)

After `npx react-native start --reset-cache` (the first half of the fix — Metro had been
serving the pre-fork module from cache, because `usePlayerActivity.ts` sits at the same
path in 1.12.0 and 1.13.0):

- `topResumedActivity = com.simba.player/.MainActivity t46` — **same task as before the tap**
- `PlayerActivity` occurrences in the activity dump: **0**
- The in-app chrome rendered: `audio-minimize`, `audio-close`, `audio-shuffle`,
  `audio-previous`, `audio-playpause`, `audio-next`, `audio-repeat`

Note the seek bar read *"Live stream — not seekable"* and the elapsed time showed `LIVE`.
That was **not** a live stream — it was `durationMs === 0` because playback never started
(`C-01`). Recorded here so it is not later mistaken for a duration bug.

---

## Wave 2 — Recently Played & Bookmarks: how they are written, and why they are wrong

Traced by the launch-type audit. Full detail in `SIMBA_PLAYER_V20_JUGAAD_AUDIT.md`.

| ID | Sev | Defect | Confidence | Status |
| --- | --- | --- | --- | --- |
| `C-10` | P1 | `src/types/media.ts:76-77` — a missing `type` **and** missing `mediaType` both default to **`'audio'`**. This is the movie-shows-a-music-note bug. | CODE | `OPEN` |
| `C-11` | P1 | Only **4 of 31** launch sites pass any identity field. The other 27 write a history entry the store silently retags as audio. | CODE | `OPEN` |
| `C-12` | P1 | `src/features/bookmarks/index.ts:139-140` defaults the *same* omitted fields to **`'video'`** while `media.ts` defaults them to `'audio'`. One field, two opposite answers, both persisted. | CODE | `OPEN` |
| `C-13` | P1 | `useBookmarkToggle.ts:127,132` also defaults to `'video'` for an unclassified session. | CODE | `OPEN` |
| `C-14` | P2 | Every badge consumer reads `mediaType`, never `type` (`MediaRailCard.tsx:85`, `HistoryScreen.tsx:184`, `StatsScreen.tsx:232`, `ProfileScreen.tsx:244`). The lane is the only thing that is wrong, so fixing the kind alone would change nothing visible. | CODE | `OPEN` |
| `C-15` | P2 | `usePlaybackCheckpointSync.ts:87-97` drops `source` and `folderId`, so provider history is re-normalised to `source:'local'`. | CODE | `OPEN` |
| `C-16` | P2 | Persisted rows already mis-tagged are **not repaired** by fixing the writers — `CURRENT_PERSIST_VERSION` migration may be required. | CODE | `OPEN` |

### The badge chain, end to end

```
launch site ──(mediaKind? mediaLane?)──> useResumeAwarePlayerActivity:212-224
                                              │  only 4/31 sites pass these
                                              ▼
                                        NowPlaying.type / .mediaLane
                                              │
                                              ▼
                                  usePlaybackCheckpointSync:95  → recentHistoryStore
                                              │  mediaLane absent ⇒ field omitted
                                              ▼
                              src/types/media.ts:77  `?? 'audio'`   ← THE BUG
                                              │
                                              ▼
                                   RecentHistoryEntry.mediaType = 'audio'
                                              │
                                              ▼
                    MediaRailCard.tsx:85  lane === 'audio' ? 'music' : 'video'
                                              │
                                              ▼
                              🎵 on "Namus Kanla Yazılır, Turkish Movie"
```

The fix is **not** at the card. The card is honestly drawing what it was told. The fix is
that the seam must always know the lane, because it already has it: `bridgeOpts.type` is
`'video' | 'audio'` at every single launch site and is currently thrown away.

---

## Wave 3 — launch routing: audio must open audio, video must open video

| ID | Sev | Defect | Confidence | Status |
| --- | --- | --- | --- | --- |
| `C-17` | P0 | **`openPlaylist` bypasses the app seam entirely.** It is the *library's* `useOpenPlaylist`, calling the *library's* `usePlayerActivity`. So: no `beginSession` (NowPlaying keeps the *previous* session), no `expandAudioPlayer()` for audio, no `mediaLane`/`mediaKind` recorded. | CODE | `OPEN` |
| `C-18` | P1 | `resolveStreamType('episode')` → `'video'`. A podcast episode is audio. Today no caller passes it, so it is a loaded gun rather than a live bug. | CODE | `OPEN` |
| `C-19` | P1 | `'archive-video'` is a valid `MediaKind` but is **absent** from the library's video branch, so it falls through to `default → 'audio'`. | CODE | `OPEN` |
| `C-20` | P1 | `src/screens/History/components/HistoryScreen.tsx:99` — `mediaType ?? 'video'`. Inverted: a row missing its lane opens a **video window** for audio content. | CODE | `OPEN` |
| `C-21` | P1 | `src/services/fileService.ts:58` — unknown extension → `'video'`, consumed **un-wrapped** at `FolderBrowserScreen.tsx:190`. `.opus`, `.m4b`, `.aac`, `.oga` all open a full-screen video window. | CODE | `OPEN` |
| `C-22` | P2 | `src/screens/QueueScreen/hooks/useQueueScreen.ts:197` — `entry.type ?? 'video'`. | CODE | `OPEN` |
| `C-23` | P2 | `src/screens/Home/hooks/useHomeScreen.ts:187` — `item.type ?? item.mediaType ?? 'video'`. | CODE | `OPEN` |
| `C-24` | P2 | 8 call sites pass a persisted `MediaKind` straight into `resolveStreamType`, so their resolved lane depends on a string mapping, not on observed data. | CODE | `OPEN` |

### Why the fork lives in the library

`openPlayer` is called from three library entry points (`openPlayer`, `useOpenWithResume`,
`useOpenPlaylist`) and a consumer cannot tell which one a given screen used. So the
audio/video decision is made once, in `usePlayerActivity.openPlayer`, where
`opts.type === 'audio'` routes to `startAudioPlayback` (no window) and everything else
routes to `bridge.openPlayer` (PlayerActivity). `C-17` is the one path that escapes it.

---

## Wave 4 — dead and placeholder code (the "jugaad code" sweep)

Agent sweep in flight. Seeded with what is already known:

| ID | Item | Confidence | Status |
| --- | --- | --- | --- |
| `C-25` | `AudioLyricsView` — 525 lines, **0 call sites**. | CODE | `OPEN` — delete |
| `C-26` | `AudioVisualizer` — 143 lines, **0 call sites**. | CODE | `OPEN` — delete |
| `C-27` | `NowPlayingScreen` — returns `null` unconditionally. | CODE | `OPEN` — delete |
| `C-28` | `useSongScreen.ts:229` — `handleViewFullLyrics` does not open lyrics; it starts playback. The label is the lie. | CODE | `OPEN` |
| `C-29` | Help / Changelog copy advertising audio features that do not exist. | CODE | `OPEN` |
| `C-30` | `useQueueSync.ts:102` writes a phantom queue entry with `uri: ''`. | CODE | `OPEN` |
| `C-31` | `recentHistoryStore.ts:112` comment claims a "20-item cap"; the cap is 10. | CODE | `OPEN` |

---

## Definition of done for Wave 1

- [x] Audio black screen closed — no `PlayerActivity`, in-app player renders (`b52d462` + `142047f`)
- [ ] `C-01` APK rebuilt against 1.13.0, installed, and audio **actually plays**
- [ ] `C-03` video black screen diagnosed to a cause, not guessed at
- [ ] `C-04`/`C-05`/`C-06` resume prompt: before playback, screenshot, no silent auto-close
- [ ] `C-07` real artwork on Recently Played and Bookmarks
- [ ] `C-08` audio player cover art
- [ ] `C-09` volume + mute + queue in the audio player, built on existing components
- [ ] Gates green at every commit; every new test mutation-checked

---

## Carried forward

<!-- Every deferred item is enumerated individually. Nothing is rolled up. -->

- `C-03` — video black screen, cause unknown. Blocked on a decision: is the emulator's
  SurfaceView capture limitation the whole story, or is there a real defect? Needs one
  physical-device or MediaCodec-level check before any code is written.
- `C-16` — already-persisted mis-tagged rows need a version migration, or the badges stay
  wrong for existing users regardless of writer fixes.
- `C-29` — Help/Changelog copy needs the real feature list before it can be corrected.
- Argent 0.25.0 → 0.27.0 update is pending and **has not** been applied. Needs explicit
  user consent before any update.