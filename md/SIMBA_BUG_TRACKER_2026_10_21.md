# SIMBA — Bug tracker (opened 2026-10-21)

**A living register of everything found and fixed, so nothing is found twice
and nothing is forgotten.**

Started: **2026-10-21** (late afternoon → evening), during the W22 wave
("the resume that never resumed, and the card that never had a frame") and the
verb/layout restructure that followed it.

## How to read this file

| Column | Meaning |
|---|---|
| **ID** | `B-nnn`, permanent. Never reused, never renumbered. |
| **State** | `OPEN` · `FIXED` (shipped) · `DEFERRED` (a named later wave owns it) · `ACCEPTED` (a product decision — not a defect) · `EXTERNAL` (not our bug) |
| **Severity** | `P0` broken · `P1` wrong/lies to the user · `P2` degraded · `P3` cosmetic/cleanup |
| **Lane** | `video` · `audio` · `both` · `lib` · `app-shell` · `tooling` |

Every entry records **evidence**, not suspicion. "Device-proven" means a
logcat line, a screenshot, a file listing or an `adb` result. "Source-proven"
means the code or the upstream source was read and quoted. Anything weaker is
labelled as such.

Entries are appended as work proceeds — this file is the record, not a
summary written at the end.

**A note on the OPEN section.** An entry stays here after it is fixed when
its **evidence** is worth keeping — the symptom, the source excerpt, the
reason it happened. Those entries are marked `**RESOLVED (F-nnn)**` in the
heading, and the `FIXED` table is the index. An entry that is still unmarked
is genuinely open.

---

## OPEN

### B-001 · P0 · lib+app · the resume never resumed — the seek was silently refused

**Symptom.** After restarting the app, the "Continue at X" prompt resumed the
film at **0:00**. The picture was the opening title card. The elapsed clock and
the picture disagreed with the saved position.

**Evidence (source-proven, mpv 0.41.0 source, cloned and read).**
`src/bridge/loadAndPlay.ts` did `bridge.loadFile(uri)` and then
`bridge.seekAbsolute(startPositionSec)`. In mpv 0.41:

- `player/command.c:5997` — `cmd_seek` bails out with `cmd->success = false`
  while `!mpctx->playback_initialized`;
- `player/loadfile.c:2049-2053` — `playback_initialized = true` is set
  immediately **before** `MPV_EVENT_FILE_LOADED`.

So the seek was issued before mpv was ready and was refused.

**Evidence (device-proven, emulator-5554).** `[Bridge][seekAbsolute]
position=1060.727` was logged and mpv **never emitted a `name=seek` event**.
A manual scrub (a seek issued after the file was open) landed exactly.

**Root cause.** The lib's `main.cpp` discards mpv's return code, so the
refusal was invisible. And a `seek` after a load is the wrong mechanism for a
start position in mpv.

**Fix.** Lib **1.22.0** (commit `5089850`, tag `v1.22.0`): the start position
is written to mpv's `start` option **before** the load, via the `options/start`
property path (`src/bridge/MpvPlayerModule.ts` → `applyStartPosition`), and
the post-load `seekAbsolute` is gone. The value is written on **every** load,
`0` included, because mpv's `start` is persistent and a resume must not leak
into the next file.

**Also fixed:** `onPlaybackRestart` used to zero `positionMs`. The position
belongs to `time-pos`; a new file resets it in `onFileLoaded`.

**Device proof:** still outstanding — see B-002 for the blocker.

---

### B-002 · P0 · app · the teardown checkpoint flush never wrote

**Symptom.** The "Recently Played" card had no frame. The folder that holds
them did not exist.

**Evidence (device-proven).**
`adb shell run-as com.simba.player ls files/simba-resume-thumbs/` →
**"No such file or directory"** — not one frame had ever been captured.

**Root cause.** `usePlaybackCheckpointSync`'s cleanup read
`snapshotRef.current`, but the render that *ends* a session nulls the session
and runs **before** React runs the effect cleanup — so `writeCheckpoint`
returned false at `!session` and nothing was written. The flush was also
gated on the session still playing, which is exactly when it is not.

**Why the suite was green.** It only exercised **tree unmount**, never the
**session ends** path.

**Fix (app `ba8e17d`).** `writeCheckpoint(snapshot, resumeThumbnailPath?,
requirePlaying = true)`; a new `sessionSnapshotsRef: Map<number, Snapshot>`
keeps each live session's own last snapshot; the teardown cleanup reads
`sessionSnapshotsRef.current.get(ownedSessionId)`, deletes it, and writes with
`requirePlaying = false` before capturing the frame.

**Device proof:** outstanding.

---

### B-003 · P1 · app · `skipPrev` read a frozen playhead

**Symptom.** "Previous track" restarted the track instead of going back ~10 s
when the playhead was more than a few seconds in.

**Root cause.** `useTransport`'s `skipPrev` read `state.positionMs` from the
memo's closure, but the `wrapped` memo's dependency list is
`[commands, state.durationMs, window.width, window.height,
setOrientationLocked]` — **`positionMs` is not in it**. The value was frozen
at the last time the memo was rebuilt.

**Fix.** `skipPrev` now reads `livePlaybackRef.current.positionMs` — a live
read at call time. Same discipline as SPEC invariant I30.

---

### B-004 · P1 · app · `ResultTile` mangles a remote thumbnail URL

**Symptom.** A search result's poster does not load.

**Root cause.** `ResultTile.tsx` applies `'file://' + thumbnailPath`
**unconditionally**. A remote URL becomes `file://https://…`, which names no
file.

**Fix.** `src/utils/mediaUri.ts` → `toRenderableImageUri(path)`: a
scheme-bearing URL is left alone; a bare local path gets the `file://`
scheme. `MediaRailCard` already uses it.

**State:** `ResultTile` was **not** migrated in this wave. Still open.

---

### B-005 · P2 · app · a zero duration renders as an empty string

**Symptom.** A card with no position reads `" / 21:58"` — the elapsed slot is
blank and the leading separator dangles.

**Root cause.** `formatDuration(0)` returns `''`.

**State:** open. Low severity, but it is a visible blank.

---

### B-006 · P2 · app · the elapsed label freezes for 600 ms after a tap-to-seek

**Symptom.** Tap the scrub bar and the elapsed clock keeps the old value for
600 ms, so the readout disagrees with the picture.

**Root cause.** The transport bar keeps a "scrub preview" value for 600 ms
after the tap, and the timeout is **not cleared on unmount** — so a pending
timer can write to an unmounted tree.

**State:** open.

---

### B-007 · P1 · lib · the native side discards mpv's return code

**Symptom.** Any command mpv refuses fails **silently**. The app believes it
worked.

**Evidence.** `android/src/main/cpp/main.cpp` ignores the value returned by
`mpv_set_property_string` / `mpv_command_node` for `seek`, `relative-seek`
and `playlist-clear`.

**Consequence.** This is what made B-001 invisible for a wave: mpv said "no"
and the app heard nothing.

**State:** `DEFERRED` to a native wave. It cannot be fixed from JS, and the
1.22.0 fix removes the one place it actually bit.

---

### B-008 · P0 · app · `commands.exitPlayer()` would kill the app

**Symptom.** Not yet observed — the method has **no call site**. That is the
only reason this is not B-000.

**Evidence (source-proven).** `commands.exitPlayer()` →
`commands.stopPlayback()` + `commands.exitPipAndFinish()`. The lib's
`exitPipAndFinish` calls **`activity.finishAndRemoveTask()` on the current
activity**. Since D1 (one Activity, `MainActivity`), that would finish the
app's own Activity and remove the task.

**State:** open. The method is a landmine: it reads like "close the player"
and would close the *app*. Either delete it or re-point it at the close verb.

---

### B-009 · P1 · lib · "Maximum update depth exceeded" in `PlayerProvider`

**Symptom.** A LogBox toast over the player, on every session.

**State:** open. Undiagnosed — the loop has not been traced to its writer.

---

### B-010 · P1 · lib · `initPlayer()` races its mount effect

**Symptom.** 8 × `IllegalStateException` in one launch.

**State:** open. Needs a native-side look (the handle is created twice).

---

### B-011 · P0 · app · the hardware back button does not leave the player

**Symptom.** `adb shell input keyevent 4` did **not** leave the player. The
in-app back control (at ~90,68) did.

**State:** open. **Re-check required after this wave** — the hardware back is
now wired to the CLOSE verb (it used to be wired to minimise), so the
behaviour must be re-observed on the device.

---

### B-012 · P1 · app · tapping a second movie while one is playing does nothing

**Symptom.** No `loadFile` reaches the native trace.

**State:** open. Undiagnosed.

---

### B-013 · P2 · lib · the deep-link path for video is dead

**Symptom.** A video deep link opens nothing.

**State:** open. `PlayerSurface.mount()` has zero call sites, so the whole
surface-registry path is unreachable.

---

### B-014 · P2 · lib+app · dead code that still reads as live

- `VideoController` / `useVideoController` / `controllerSingleton` — no call
  sites.
- `PlayerSurface` registry — no call sites.

**State:** open, part of the AI-slop batch.

---

### B-015 · P1 · app+lib · a remote frame capture is unproven

**Symptom.** `MediaMetadataRetriever` may refuse to decode a frame from an
`https://` source, in which case the resume thumbnail only works for local
files.

**State:** open. Unverified — no remote capture has been exercised.

---

### B-016 · P2 · app+lib · the picture's position is published one frame late — **RESOLVED (F-008)**

**Symptom.** Minimising the video showed one frame of fullscreen video under a
half-open dock.

**Root cause.** The dock published its slot rect only after it mounted, and
the dock mounted *after* the presentation flipped.

**Fix (this wave).** The dock is now **always laid out** — only its opacity
changes — so the rect the lane needs to move the picture is already published
before the user taps. One commit moves the picture.

---

### B-017 · P2 · app · the mini player and the full player took turns — **RESOLVED (F-007)**

**Symptom.** Every expand/collapse was an unmount of one component and a
mount of the other: the audio lane re-ran its subscriptions, reset its
animations and threw away its scroll position, and the app had a "mini
player" that was a *separate UI* from the player it minimised.

**Evidence.** The old `PlayerChrome`:

```tsx
if (streamType === 'video') return presentation.isMini ? <MiniPlayer/> : null;
return audioMode === 'expanded' ? <AudioPlayer/> : <MiniPlayer/>;
```

That is the exact snippet SPEC decision **D9** ("one mounted player per lane,
presentation is style not component identity") quotes as *what it replaces*.

**Fix (this wave).** `MiniPlayer` is deleted. The video lane's dock is
`VideoDock`, a part of `VideoLane`; the audio lane's dock is a part of
`AudioPlayer`. Both lanes are one mounted tree, and the presentation changes
a style and a per-part visibility.

---

### B-018 · P2 · tooling · the system document picker's tree is unreadable

**Symptom.** `adb shell uiautomator dump` returns **"null root node"** /
"Operation aborted" for the system picker window.

**Consequence.** A local file cannot be launched through the picker from this
harness, which is what blocks the device proof of B-001/B-002.

**State:** open (tooling). Workaround in flight: push a clip to the device
and launch it another way.

---

### B-019 · P3 · tooling · CDP `Runtime.enable` times out

**State:** open (tooling). Pre-existing; the LogBox toast overlaps the dock
and swallows taps there.

---

### B-020 · P3 · app+lib · a layer boundary is broken in three files

**Evidence.** `node scripts/check-import-boundaries.js` →

```
✗ src/app/AppContent.tsx:33            [PLAYER] Only src/infrastructure/player/ may import from '@simba-dev/react-native-media-player'
✗ src/components/player/PlayerChrome.tsx:48  [PLAYER] …
✗ src/components/player/video/VideoSurface/VideoSurface.tsx:52  [PLAYER] …
```

**Fix (partial, this wave).** `PlayerChrome`'s lib import is gone — the close
teardown moved into `src/infrastructure/player/useClosePlayback.ts`, which is
inside the rule. The other two remain.

**State:** open (2 of 3).

---

### B-021 · P3 · app · an infrastructure module reaches for a UI context

**Symptom.** `useClosePlayback` (in `src/infrastructure/player/`) calls
`useToast()`, which is a component-layer context that **throws** outside a
`ToastProvider`.

**Why it is not a defect yet.** The app's `AppRoot` always wraps the tree in
`ToastProvider`, so this can only fire in a test that renders the chrome
without one — which is an app state that cannot occur.

**Cost.** Four player suites had to be corrected to render the chrome the way
the app renders it.

**State:** open, deliberately. Recorded so the next reader knows it is a
decision, not an accident.

---

## FIXED

| ID | Sev | Lane | One line | Where |
|---|---|---|---|---|
| F-001 | P0 | lib+app | The resume seek was silently refused by mpv → the start position is now part of the LOAD | lib 1.22.0 · `5089850` |
| F-002 | P0 | app | The teardown flush read a snapshot the render had already nulled → per-session snapshot map | app `ba8e17d` |
| F-003 | P1 | app | `skipPrev` read a frozen playhead → reads it live | app `ba8e17d` |
| F-004 | P1 | app | A local image path had no scheme → `toRenderableImageUri` | app `ba8e17d` |
| F-005 | P1 | app | The header's back said "Closes the player" and minimised instead → it closes | this wave |
| F-006 | P1 | app | The hardware back minimised while the header's back claimed to close → both close now | this wave |
| F-007 | P1 | app+lib | The mini player and the full player took turns → one mounted tree per lane | this wave |
| F-008 | P2 | app | The dock's slot rect arrived one frame late → the dock is always laid out | this wave |
| F-009 | P2 | app | The dock's X and the audio player's X each spelled the close teardown → one owner, `useClosePlayback()` | this wave |
| F-010 | P2 | app | `PlayerChrome` imported the player module directly (a boundary violation) → the import moved into the facade | this wave |
| F-011 | P2 | app | The audio player's minimise was top-left only → it is in the bottom row now, and it is the lane's ONLY minimise path | this wave |
| F-012 | P2 | app | The video's minimise was the header's back → it is a transport-bar control now | this wave |
| F-013 | P2 | docs | The SPEC said "there is no video mini dock in V19" while a dock was on screen; §3.4.1's shape still showed a branch on `presentation === 'mini'` returning a *different component* — the exact thing D9 forbids — and rules 6/9 still named the deleted `<VideoMiniPlayer />` → §3.4 rewritten, the shape corrected, the rules re-pointed at the lane-owned dock | this wave |
| F-014 | P2 | docs | The SPEC's §3.4.1 still said the native session is owned by a separate `PlayerActivity` with `launchMode="singleTask"` — obsolete since **D1** (one Activity, one React root) was locked on 2026-10-16 → corrected, and the always-mount rule re-explained for the reason that still holds (a re-created `SurfaceView` is a black frame) | this wave |

---

## ACCEPTED (product decisions, not defects)

### A-001 · the bookmark stays in the top bar

The top bar carries a bookmark control beside the orientation lock.
SPEC §3.2 says the top bar owns "back + title + lock, and **nothing else**",
so the control and the spec disagree.

**Decision (2026-10-21):** the bookmark stays where it is. The spec is
brought into line rather than the other way round.

### A-002 · no close action in the More/options sheet

Considered and rejected: a "close playback" row in the video player's More
sheet. The close is now reachable from the header's back and from the dock's
X, and a third path to the same verb is what SPEC §3.4 ("no two paths to the
same secondary action") forbids.

---

## EXTERNAL (not our bug — recorded so it is not re-investigated)

### E-001 · archive.org was down during the device proof

`HEAD https://archive.org/download/TheRifle-UsmcTrainingFilm1960s/…` from the
host timed out; the device could ping the host but mpv's load failed with
`MPV_ERROR_LOADING_FAILED` (`reason=4, error=-13`). The emulator's network
profile is unthrottled. **An external outage, not an app defect.** A local
clip was pushed to the device instead.

---

## Open questions this tracker does not answer

1. Does `MediaMetadataRetriever` decode a frame from an `https://` source?
   (B-015 — blocks the remote resume-thumbnail path.)
2. Does the hardware back now leave the player after the verb change?
   (B-011 — must be re-observed.)
3. Is the "Maximum update depth exceeded" loop in the lib's progress
   subscriber? (B-009.)
4. Why does a second movie tap produce no `loadFile`? (B-012.)

---

*Opened 2026-10-21. Append as work proceeds — a bug found on 2026-10-22 goes
in as `B-022`, not into a paragraph at the bottom of a report.*
