# SIMBA — Bug tracker (opened 2026-10-21)

**A living register of everything found and fixed, so nothing is found twice
and nothing is forgotten.**

Started: **2026-10-21** (late afternoon → evening), during the W22 wave
("the resume that never resumed, and the card that never had a frame") and the
verb/layout restructure that followed it.

**Still live.** Last updated **2026-10-27** — the file name is the day it was
OPENED, not the day it was last touched. Entries carry their own dates. New
entries since 2026-10-21 are `B-022` onward; new fixes are `F-015` onward.
**Latest:** the 2026-10-27 wave ("the register was wrong about the code") added
`B-027` and resolved `B-006` / `B-008` / `B-010` / `B-014` / `B-020` / `B-024`
as `F-021`…`F-026`. The **tab-bar wave** that followed it added `B-028` and
resolved the app's dead tab-bar skeleton and the Home FAB's lane and its
silence as `F-027` / `F-028`.

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

### B-004 · P1 · app · `ResultTile` mangles a remote thumbnail URL — **RESOLVED (F-018)**

**Symptom.** A search result's poster does not load.

**Root cause.** `ResultTile.tsx` applies `'file://' + thumbnailPath`
**unconditionally**. A remote URL becomes `file://https://…`, which names no
file.

**Fix.** `src/utils/mediaUri.ts` → `toRenderableImageUri(path)`: a
scheme-bearing URL is left alone; a bare local path gets the `file://`
scheme. `MediaRailCard` already uses it.

**State: RESOLVED (F-018) — the tile now uses it.** `ResultTile` resolves
the URI in one place and adds the cache token through a second helper that
owns **only the separator and the encoding** (`withCacheToken`), so the
scheme decision stays in `toRenderableImageUri` and cannot be re-introduced
inside the token helper:

```tsx
const thumbnailUri = useMemo(() => {
  const base = toRenderableImageUri(item.thumbnailPath);
  return base ? withCacheToken(base, item.lastPlayedAt ?? '') : undefined;
}, [item.thumbnailPath, item.lastPlayedAt]);
```

**Evidence (source + tests, mutation-checked).** 7/7 mutants killed,
including "prefixes `file://` unconditionally", "always uses `?`", "drops the
cache token" and "adds no scheme at all". The mutant that removes the scheme
check from `toRenderableImageUri` is killed by "leaves a remote URL alone".

**Honest limitation.** The defect is **not** device-provable, and the reason
is itself a finding — see `B-026`: no catalogue surface hands its artwork to
the history entry, so the tile the user can actually reach has nothing to
show. The fix is proven by code + tests, not by a screenshot.

---

### B-005 · P2 · app · a card with no position reads `" / 21:58"` — **RESOLVED (F-019)**

**Symptom.** A card with no position reads `" / 21:58"` — the elapsed slot is
blank and the leading separator dangles.

**Root cause.** The card composed a position segment and a duration segment
and joined them **unconditionally**. `formatDuration(0)` returns `''` — and
that is **correct and load-bearing**: "unknown duration" is a real state, and
a `0:00` badge would claim zero-length media on a grid tile, a stats card and
a history row alike.

**State: RESOLVED (F-019) — the formatter was NOT the defect; the CARDS
were.** The formatter's contract is unchanged. What changed is that a card
now asks one question — *is there a position?* — and prints the position
segment only when the answer is yes. New module `src/utils/mediaTime.ts`:

- `formatPositionLine(position?, duration?)` → `"1:37 / 21:58"`, `"21:58"`
  (no position), `undefined` (duration unknown).
- `formatPositionAccessibility(title, position?, duration?)` → `"The Rifle,
  1:37 of 21:58"`, `"The Rifle, 21:58 long"`, `"The Rifle"`.

Both the home shelf and the history screen use them, so the **spoken** line
now matches the **visible** line. (The history label used to say "resume at
1:37" while its caption said "1:37 / 21:58" — accepted churn, recorded for
consistency.)

**Evidence (source + tests, mutation-checked).** 7/7 mutants killed,
including "always prints both segments", "always prints the position
segment", "leaves a dangling separator" and "prints a 0:00 duration".

**Honest limitation.** The no-position branch is **not** device-provable on
this emulator: every playback advances the checkpoint past 0 before the card
re-renders, and adb latency makes it impossible to close the player inside
the load window. The device proves the WITH-position line (`4:14 / 21:58`,
`5:14 / 21:58`, `1:29 / 21:58`); the no-position branch is proven by the
unit + component tests and the mutation kills only.

---

### B-006 · P2 · app · the elapsed label freezes for 600 ms after a tap-to-seek — **RESOLVED (F-021)**

**The symptom as written was INVERTED, and this entry corrects it rather than
repeating it.** The old code did not freeze the clock on the OLD value for
600 ms. It pinned the elapsed clock to the seek **TARGET** for a **fixed**
600 ms and then dropped back to whatever the engine had reported. For a seek
slower than 600 ms the clock ran **BACKWARDS**: target, then the old
position, then the target again when the tick arrived.

**Root cause.** mpv's `time-pos` is the **only** carrier of the new position
(observed natively, coalesced to 4 Hz). There is **no seek-completion event
that carries a position** — the lib's `onPlaybackRestart` explicitly refuses
to own it, and the native `seek` event carries an **empty payload**. The
fixed 600 ms window was therefore a **guess, not a confirmation**: it assumed
the engine would have caught up by the time the timer fired, and it had no
way to know.

**Two further defects the entry did not mention.**

1. The timer handle was **neither stored nor re-armed**, so a second tap
   inside the first tap's window had its preview cleared by the **first**
   tap's timer.
2. The **drag release cleared the preview synchronously**, so the drag path
   never held the target at all.

**The fix** (`src/components/player/video/TransportBar/TransportBar.tsx`).
The preview is now a **CLOSED LOOP**: it is held until the engine's own
position reaches the target (`SEEK_CONFIRM_TOLERANCE_MS = 500`), with a
**BOUND** (`SEEK_CONFIRM_FALLBACK_MS = 1000` — four position ticks) for a
seek that never confirms. The timer handle lives in a **ref**, so it is
cleared on unmount and **re-armed on every commit**. The drag release now
commits through the **same path** (one seek, one clock), and a new gesture
supersedes a pending confirmation. The dead `scrubRef.previewMs` field was
removed — it was written and never read.

**Evidence (source + tests, mutation-checked).** 6 new tests in a
`describe('seek confirmation')` block in
`__tests__/components/player/video/TransportBar/TransportBar.test.tsx`; the
file now has **21 tests**, all passing. A mutation harness
(`X:/Development/SIMBA/.scratch-mutation-w24.mjs`) ran **8 mutants and all 8
were killed**, each naming its killer test.

**Note, so the next reader does not call it a defect.** The **audio** lane's
transport has **no post-commit preview at all** — it always shows the
engine's truth. That is honest, not broken.

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

### B-008 · P0 · app · `commands.exitPlayer()` would kill the app — **RESOLVED (F-023)** (the native hazard; the app facade stays)

**Symptom.** Not yet observed — the method has **no production call site**.
That is the only reason this is not B-000.

**Evidence (source-proven).** `commands.exitPlayer()` →
`commands.stopPlayback()` + `commands.exitPipAndFinish()`. The lib's
`exitPipAndFinish` called **`activity.finishAndRemoveTask()` on the current
activity**. Since D1 (one Activity, `MainActivity`), that would finish the
app's own Activity and **remove the app's whole task from Recents**.

**The NATIVE hazard is RESOLVED (F-023).** The Kotlin now calls
**`activity.finish()`**, which closes the PiP window and **leaves the task**
alone.

**The app facade deliberately STAYS.** `useTransport.exitPlayer` is a real
member of `TransportCommands`, backed by the lib's real `exitPipAndFinish`,
and its **stop-then-finish ORDER** is pinned by a test. It remains
**UNWIRED in production**, for one reason: the close verb has exactly **one**
owner — `useClosePlayback()` — and SPEC §3.4 forbids a second path to the
same secondary action. The hazard was in the **native call**; the facade is a
deliberate, documented member of the public command surface.

**State:** the native hazard is resolved (`F-023`). The app-side facade is
kept and unwired on purpose; whether the lib should still export it is a
**product/lib decision**, not a defect.

---

### B-009 · P1 · lib · "Maximum update depth exceeded" in `PlayerProvider`

**Symptom.** A LogBox toast over the player, on every session.

**State:** open — **narrowed 2026-10-27.** The lib's progress subscriber is
**fully guarded and pure**: it returns `prev` when no field changed, and
there is **no setState-during-render cycle in the lib**.

**The narrowing.** `onCacheState` changes **continuously** — measured on
device: **827 times across a cold start**, while `onSeekable` arrived
**ZERO** times — and `cacheRangesEqual` compares only the **count** and the
**first/last bounds**, so the last bound moves on nearly every event and a
**new context value is minted for every `usePlayerProgress()` consumer**.

**Where the writer most likely is.** The actual writer is most likely in the
**app's** consumers of the lib's progress context, not in the lib.

**The one lib-side hardening available** is to stop `onCacheState` from
minting a new context value on every tick. That is **not** done.

---

### B-010 · P1 · lib · `initPlayer()` races its mount effect — **RESOLVED (F-024)**

**Symptom.** 8 × `IllegalStateException` in one launch:
`MpvPlayerModule not initialized. Call initPlayer() first.`

**Root cause.** `initPlayer()` ran in `PlayerProvider`'s **mount effect**,
whose deps were `[]`. React commits passive effects **CHILD-FIRST**, so every
descendant's bridge call ran **before** the provider's own effect, while
`nativePtr == 0` → `ensurePtr()` throws.

**The sharpest instance was a RENDER, not an effect.** `SimbaVideo` read the
handle with `useMemo(() => nativePtr ?? getNativePtr(), [nativePtr])`.
`getNativePtr()` does **not** throw — it answers **0** — so the first render
bound the surface to a **null handle**, and the memo never recomputed.

**The tracker's old hypothesis was WRONG.** The handle is **not** created
twice: the Kotlin short-circuits with `return true` when `nativePtr != 0`.

**The fix.** `initPlayer()` moved into `PlayerProvider`'s **RENDER phase**
behind a **ref guard**, and `SimbaVideo`'s handle read is **no longer
memoised**. A parent's render completes before any child's render begins, so
the handle exists before any descendant renders.

**The trade-off, stated plainly.** A render-phase side effect is not a free
move. It is safe **only** because `initPlayer()` is **idempotent** — the
Kotlin returns `true` immediately when the handle already exists, and the
ref guard stops a second call. If `initPlayer()` ever stopped being
idempotent, this would have to be re-thought.

**Release.** The lib version goes **1.22.0 → 1.23.0**, and it is a **MINOR**,
not a patch drop-in: the TurboModule `Spec` gained two methods, so it is a
**coordinated native + JS upgrade** — the app has to install the new lib and
the native side has to be rebuilt into the APK.

**Release status (2026-10-27).** The lib release is **published**: commit
`5e8de6e`, tag `v1.23.0`, on npm as **1.23.0** (80 files / 989 669 bytes
unpacked — the published tarball still ships **no `.so`**). The app now
**declares `^1.23.0` and installs it**: `npm install
@simba-dev/react-native-media-player@1.23.0` resolved to **1.23.0** in
`node_modules`. **Still outstanding:** the app's **APK** still carries the
1.22.0 **Kotlin** — `finish()` instead of `finishAndRemoveTask()` and the
`override` spec methods compile into the APK's **DEX**, not into
`libplayer.so` (that is the CMake/JNI library built from `main.cpp`, and
1.23.0 changed **no** C++), so the native half of 1.23.0 lands only on an
**APK rebuild**. The JS half (`initPlayer()` in the render phase, the
un-memoised `SimbaVideo` pointer, the Spec's `addListener` /
`removeListeners`) takes effect on a **Metro reload** and is already in.

---

### B-011 · P0 · app · the hardware back button does not leave the player

**Symptom.** `adb shell input keyevent 4` did **not** leave the player. The
in-app back control (at ~90,68) did.

**Re-observed 2026-10-26 — and it is worse than "does not leave the player":
the Android back button is DEAD everywhere in the app.**

**RESOLVED (F-017).** The full account is below; the entry stays because
its evidence is the reason the next reader will not re-introduce the same
workaround.

**Evidence (device-proven, emulator-5554, API 37).**

1. In the player: `input keyevent 4` → the transport kept running, and
   logcat recorded **no** `[stopPlayback]` trace at all — the close verb was
   never invoked. The header chevron at (89, 66) in the same state produced
   `[PlaybackTrace][Bridge][stopPlayback] service not running; engine stopped,
   nothing to tear down`, the chrome unmounted, and the app returned to Home.
   So the CLOSE verb works; only the HARDWARE path into it is missing.
2. On Home — no player, no chrome, no JS subscriber — `input keyevent 4`
   left `topResumedActivity=com.simba.player/.MainActivity`. At the root of
   the stack the app should have finished.
3. The harness is not at fault: the same `input keyevent 4` closed the
   system Settings app (`com.android.settings/.homepage.SettingsHomepageActivity`
   → back to Simba).

**Root cause (source-proven, RN 0.86 read from `node_modules`).**

`android/app/src/main/java/com/simba/player/MainActivity.kt:201-217` overrides
`onBackPressed()` and dispatches a **synthetic `KEYCODE_BACK`** into
`window.decorView` before falling through to `super.onBackPressed()`:

```kotlin
val handled = window.decorView.dispatchKeyEvent(
  android.view.KeyEvent(android.view.KeyEvent.ACTION_DOWN, android.view.KeyEvent.KEYCODE_BACK),
) || window.decorView.dispatchKeyEvent(
  android.view.KeyEvent(android.view.KeyEvent.ACTION_UP, android.view.KeyEvent.KEYCODE_BACK),
)
if (handled) return
super.onBackPressed()
```

The file's own comment says the dispatch exists so "the JS `BackHandler`
… can consume it". **It cannot.** The JS `BackHandler` is not a key-event
listener at all — it subscribes to the `hardwareBackPress` DEVICE EVENT
(`Libraries/Utilities/BackHandler.android.js:23`), and that event is emitted
by `DeviceEventManagerModule.emitHardwareBackPressed()`, which is reachable
**only** from `ReactHostImpl.onBackPressed()`
(`ReactAndroid/src/main/java/com/facebook/react/runtime/ReactHostImpl.kt:356-365`),
which `ReactActivityDelegate.onBackPressed()` calls. A view-level
`dispatchKeyEvent` never emits it.

So the dispatch could not reach the `BackHandler` by construction. What it did
reach was the view hierarchy, which answered "yes, I want this key", so
`handled` was true, the method returned, and `super.onBackPressed()` — RN's
own route to the JS `BackHandler` — **never ran**.

That override is also the only entry point, not a side door: RN 0.86's
`ReactActivity` registers an `OnBackPressedCallback` when
`AndroidVersion.isAtLeastTargetSdk36(context)` (`targetSdk = 36` here, and
the device is API 37), and that callback calls `onBackPressed()` — the app's
override. Every back press on Android 16 lands there and nowhere else.

**The instrumented measurement.** The master plan's risk table says: do NOT
fix this from static reading — instrument each branch, rebuild, read logcat.
So it was instrumented (`Log.i` per branch in `MainActivity.onBackPressed()`),
the APK was rebuilt, and the press was reproduced. The logcat, verbatim:

```
I/MainActivity(  660): [BACKPROBE] onBackPressed entered pip=false sdk=37
I/MainActivity(  660): [BACKPROBE] synthetic dispatch down=true up=false
I/MainActivity(  660): [BACKPROBE] EARLY RETURN — the view hierarchy consumed
                                    the synthetic key, so super.onBackPressed()
                                    (RN's route to the JS BackHandler) was NOT called
```

and the JS probe — a temporary `BackHandler` listener that logged every
`hardwareBackPress` arrival — **never fired**.

So the measurement confirms the reading exactly: the synthetic dispatch was
consumed by the view hierarchy (`down=true`), the method returned early, and
RN's route to the JS handler never ran. The press could not have reached JS
by any other path, because `super.onBackPressed()` is that path.

**Fix.** The synthetic dispatch is deleted. `onBackPressed()` now does two
things: the PiP branch (a PiP window has no JS behind it, so the Activity
closes itself), and `super.onBackPressed()` — which IS
`ReactActivity.onBackPressed()` → `mDelegate.onBackPressed()` →
`ReactHostImpl.onBackPressed()` → `emitHardwareBackPressed()` → the JS
`hardwareBackPress` event. The JS side then decides: a subscriber that
returns true has consumed the press, and if nobody consumes it RN calls
`exitApp()` and the Activity finishes.

**The audio lane was given the same verb.** Fixing the native path made the
press reachable in the audio lane for the first time, and the audio lane had
no handler — so a back press on the expanded now-playing page would have
closed the whole app. SPEC §3.2 settles what it should do: back CLOSES
("back minimises" was withdrawn on purpose), through `useClosePlayback()`,
the same owner as the audio player's own X. `AudioPlayer` now registers that
handler while the PAGE is up. As the DOCK it does not: the dock is a bar
over the browsing stack, not a screen of its own, so back belongs to the
stack.

**State:** RESOLVED (F-017). `android/app/src/main/java/com/simba/player/MainActivity.kt`,
`src/components/player/audio/AudioPlayer/AudioPlayer.tsx`,
`__tests__/app/MainActivityBackPress.test.ts` (new, 5 tests) and three new
tests in `__tests__/components/player/PlayerChrome.test.tsx`.
Mutation-checked: 6/6 killed.

**Device re-proof (emulator-5554, API 37, the rebuilt APK):**
- Home → back → the JS event arrives (`[BACKPROBE] JS hardwareBackPress
  fired`) and the app closes to the launcher. Before the fix, nothing
  happened at all.
- In the player → back → `[PlaybackTrace][Bridge][stopPlayback] service not
  running; engine stopped`, the chrome unmounted, the app returned to Home
  (no white screen — the `B-022` fix holds), and the teardown flush wrote the
  new checkpoint (the card read 1:37 / 21:58 with the captured frame). The
  app stayed in the foreground: the press was CONSUMED by the close verb,
  not passed to the platform.

---

### B-012 · P1 · app · tapping a second movie while one is playing does nothing

**Symptom.** No `loadFile` reaches the native trace.

**State:** open. Undiagnosed.

---

### B-013 · P2 · lib · the deep-link path for video is dead

**Symptom.** A video deep link opens nothing.

**State:** open — **narrowed 2026-10-27.** The old one-line framing
("`PlayerSurface.mount()` has zero call sites, so the whole surface-registry
path is unreachable") was right about the **mechanism** and wrong about what
is lost.

**What the deep link actually loses.** It uses the LIB's `useOpenFromUrl`, so
it bypasses the app's `useResumeAwareLaunch` seam — and with it the
**now-playing entry**, the **history checkpoint**, the **dock** and the
**resume prompt**.

**Correction to the old framing: the resume POSITION is NOT lost.**
`<SimbaPlayer resumePolicy>` mounts `PlayerResumeProvider`, and
`useOpenWithResume` does the bookmark/history lookup — that still happens on
the deep-link path.

**What is actually broken, and it is worse.** `PlayerSurface.mount()` has
**ZERO call sites**, so `isSurfaceMounted()` is always false and the lib's
`openPlayer({type:'video'})` **ALWAYS resolves `false`** — a deep-linked
**VIDEO never plays at all**.

**The deeper cause.** The Fabric view manager
(`MpvRenderViewManager.createViewInstance`) never calls
`PlayerSurface.attach(...)`, so the registry is **orphaned**, not merely
unmounted. The surface's own methods (`setBounds`, `fillBounds`,
`setVisible`, `current()`, `boundsInWindow()`) are **live** from
`MpvBridgeModule.kt` — it is the **population** of the registry that is
dead.

**Why the app is unaffected for normal playback.** The app drives video
in-window through `useLaunchPlayback`, not `openPlayer({type:'video'})`.

---

### B-014 · P2 · app · dead code that still reads as live — **RESOLVED (F-025)**

**State: RESOLVED (F-025) for the APP side.** The LIB exports none of this,
so it was **app-only**. Every deleted item had **ZERO call sites**.

| subsystem | lines | what made it dead |
|---|---|---|
| `VideoController` / `useVideoController` / `controllerSingleton` | **903** | `getVideoController()` was called **only from inside the dead module**, so the singleton was never constructed and `getVideoController()` always returned `null` |
| `AudioLyricsView` | **525** | 0 call sites |
| `AudioVisualizer` | **143** | 0 call sites |
| `DpadController` | **187** | 0 call sites; `useHardwareMediaKeys` was internal-only and `useFocusRing` had 0 consumers |
| `BufferingBar` | **113** | 0 call sites |
| `AudioDescriptionTrackSelector` | **50** | 0 call sites, and its body was `() => null` |
| `useBookmarkMarkers` (dead export) | — | 0 call sites |

**One correction the register got wrong.** `deriveNextUpView` is **LIVE** —
it is used at `NextUpOverlay.tsx:95`, and `NextUpOverlay` is mounted at
`VideoPlayer.tsx:664`. **Do not delete it.** The register listed it as dead;
that was wrong, and the wave re-read the call sites before cutting anything.

**What is NOT part of this fix.** The `PlayerSurface` registry is a **lib**
file and it is **not** dead — see `B-013` and master-plan register item 21.

---

### B-015 · P1 · app+lib · a remote frame capture is unproven — **RESOLVED (F-020)**

**Symptom.** `MediaMetadataRetriever` may refuse to decode a frame from an
`https://` source, in which case the resume thumbnail only works for local
files.

**State: RESOLVED (F-020) — it decodes.** The frame is pulled from the
**remote** source and written locally, and it is a real frame of the film.
The device now holds **seven** captures from the same remote archive.org
media (id `877507528`):

```
-rw------- 22427 2026-10-26 16:19 frame_877507528_1290000.jpg
-rw------- 25777 2026-10-26 19:20 frame_877507528_240000.jpg
-rw------- 19588 2026-10-26 20:57 frame_877507528_300000.jpg
-rw------- 20666 2026-10-26 15:20 frame_877507528_390000.jpg
-rw------- 29724 2026-10-26 21:18 frame_877507528_60000.jpg
-rw------- 37096 2026-10-26 15:25 frame_877507528_600000.jpg
-rw------- 25878 2026-10-26 21:15 frame_877507528_90000.jpg
```

The newest was pulled binary-safely with `adb exec-out run-as … cat` and
checked byte-wise: **29,724 bytes, magic `FFD8FF`** — a real JPEG, not a
placeholder. The Recently Played card and the resume prompt both show it.

**Note.** `E-001` records an *earlier* attempt that failed — archive.org was
down at that moment, so mpv's load failed and a local clip was pushed to the
device instead. The outage was external; the capture path is not.

**Why this entry was still marked open.** The state line was written before
the capture was exercised and never corrected when open question 1 answered
it — the tracker contradicted itself. Corrected on 2026-10-26.

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

### B-020 · P3 · app+lib · a layer boundary is broken in three files — **RESOLVED (F-022)**

**The checker is a real gate.** The repo ships
`scripts/check-import-boundaries.js`. It reported **2 errors** and now
reports **0**:

```
scanned 581 files in 2364ms — 0 error(s), 0 warning(s)
✓ import-boundary check passed
```

`PlayerChrome.tsx` had been fixed earlier (the close teardown moved into
`src/infrastructure/player/useClosePlayback.ts`, which is inside the rule).
The **two** remaining violations were:

| file | lib import | now |
|---|---|---|
| `src/app/AppContent.tsx:33` | `useOpenFromUrl` | behind `src/infrastructure/player/` |
| `src/components/player/video/VideoSurface/VideoSurface.tsx:52` | `SimbaVideo` | behind `src/infrastructure/player/` |

**Why the picture wrapper is NOT re-exported from the app barrel.** The
barrel re-exports `VideoPlayer` (a **value**), and `VideoPlayer` imports
`VideoSurface` — so re-exporting the wrapper would close the cycle
`VideoSurface → barrel → VideoPlayer → VideoSurface`. The new module
`src/infrastructure/player/videoSurface.ts` is therefore **deliberately
lib-only**, so its edge stays a **leaf**.

**State:** resolved (`F-022`). The boundary checker is green.

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

### B-022 · P0 · app · closing the video left a blank white screen — **RESOLVED (F-015)**

**Symptom.** Found on device 2026-10-26 while proving the W22 close verb.
Launch a film, press the header's back. The native teardown ran
(`[stopPlayback] service not running; engine stopped`), the chrome unmounted
— and the app sat on a **blank white screen**. Still white two minutes later.
The app was unusable until the process was restarted.

**Evidence (device-proven, emulator-5554, API 37).** 12:24 → 12:28, a
persistent white screen after the close. The close itself was correct: the
media notification was gone (`dumpsys notification`) and no media session was
active (`dumpsys media_session`).

**Root cause (source-proven).** `AppRoot` blanked the browsing stack with
`<BrowsingStack hidden={isExpanded}>` — the user's **REQUEST** for a
fullscreen video. The request outlives the session by design (a close must
not rewrite it), so after the close the window stayed owned by a video that
was gone. The same keying also kept the **hardware-back handler registered**,
so back presses were swallowed on the browsing stack.

**The two facts.** The WINDOW is owned by the video only when the request is
`expanded` **AND** a video session exists. The request is what the user
asked for; the session is what can honour it. Keying the window on the
request alone produced the blank screen; keying the hardware-back gate on it
produced the swallowed back press.

**Fix.** A new derivation, `useVideoOwnsWindow()` = `isExpanded &&
streamType === 'video'`, used by BOTH the browsing stack's `hidden` and the
hardware-back gate, so they can no longer disagree.

It is deliberately **not** folded into `usePresentation`: that module is
forbidden from reading the session (a static test fails if it does), and it
answers a different question — "is the video ON SCREEN", not "is there a
video session".

**State:** resolved. `src/infrastructure/player/useVideoOwnsWindow.ts` (new),
`__tests__/infrastructure/player/useVideoOwnsWindow.test.tsx` (new, 7 tests).
Mutation-checked: 4/4 killed. Device re-proofed — the close returns to Home
with the feed painted, and the Recently Played card shows the captured frame
and the saved position.

---

### B-023 · P1 · app · the resume dialog's artwork box was empty — **RESOLVED (F-016)**

**Symptom.** Found on device 2026-10-26. The resume prompt — "Continue
watching? Continue at 10:04 or start from the beginning." — showed a **blank
white rectangle** where the title's own image should be. The very same frame
rendered correctly on the Recently Played card behind it.

**Root cause (source-proven).** The native capture writes the resume frame
into the app's `filesDir` and returns a **bare absolute path**
(`/data/user/0/com.simba.player/files/simba-resume-thumbs/frame_*.jpg`).
`Dialog.tsx` passed that path straight into `<Image source={{uri: …}} />`.
An image loader parses a scheme-less string as a URI and fails, so the box
rendered empty. `MediaRailCard` already normalised the same value through
`toRenderableImageUri` — which is exactly why the card was right and the
dialog was wrong.

**Fix.** Normalise at the **render site** — `Dialog.tsx` is the only place a
stored path becomes an image source, so fixing it there covers every caller
(the resume prompt, `ConfirmDialog`, anything added later). A remote
catalogue URL must be left alone: `file://https://…` names no file at all.

**State:** resolved. `src/components/core/Dialog/Dialog.tsx`,
`__tests__/components/core/Dialog/Dialog.test.tsx` (new, 5 tests).
Mutation-checked: 5/5 killed. Device re-proofed — the prompt now leads with
the captured frame.

---

### B-024 · P3 · app+lib · Bridgeless `getJSModule(RCTEventEmitter)` noise, and a LogBox toast that sits over the transport — **PARTLY RESOLVED (F-026)**

**Symptom.** Every run of the app on the emulator shows a LogBox toast at the
bottom: *"Open debugger to view warnings."* It covers the play/pause button
and the bottom transport row for as long as it is up.

**Evidence (device-proven, 2026-10-26).** logcat, repeated on every launch:

```
getJSModule(RCTEventEmitter) is not recommended on the new architecture
new NativeEventEmitter() was called without addListener/removeListeners
```

**Correction to the wording quoted above.** RN 0.86 emits **TWO separate
messages**, not the single *"called without addListener/removeListeners"*
string this entry used to quote.

**The `NativeEventEmitter` half is FIXED (F-026).** The Kotlin module
**already** declared `addListener` / `removeListeners`
(`MpvBridgeModule.kt:1879-1893`), but the TurboModule `Spec`
(`src/bridge/NativeMpvPlayer.ts:371-372`) did **not** — and on the new
architecture the interop proxy exposes only **spec-declared** methods, so
`mod.addListener` was `undefined` and RN 0.86's `NativeEventEmitter` warned
twice and **never attached the native module**. The spec now declares the
pair (Kotlin `String` ↔ `string`, `Double` ↔ `number`), and the regenerated
spec was confirmed to emit `public abstract void addListener(String
eventName)` / `removeListeners(double count)`.

**The `getJSModule(RCTEventEmitter)` half is STILL UNRESOLVED.** Every
`getJSModule` call in the lib's Kotlin asks for
`DeviceEventManagerModule.RCTDeviceEventEmitter`, **not** `RCTEventEmitter`,
and the string `RCTEventEmitter` is **not in RN 0.86's JS**. The origin
inside this codebase could not be established, and it needs the **device
logcat line's tag** to settle it. Until then this half stays open.

**State:** partly resolved (`F-026`). The emitter half is fixed in the lib's
spec; the `getJSModule` half is open and needs a device logcat tag.

---

### B-025 · P3 · tooling · one jest suite failed once under CPU contention and never again

**Symptom.** During the 2026-10-26 gates, one full run reported 2 failed
suites / 2 failed tests with a stack frame at
`__tests__/components/player/video/onMediaChrome.test.tsx:314`, while
another jest process was competing for the same CPU.

**Evidence.** The suite then passed **4/4** in isolation, and the full suite
passed **three consecutive times** with identical counts
(99 suites / 1214 passed / 1 todo).

**State:** open, recorded so it is not mistaken for a code defect next time.
It is the same contention multiplier `jest.config.js` already documents for
the worker count — the failure mode is a timeout, not a wrong assertion. A
suite that fails once in isolation and never reproduces is worth logging; a
suite that fails reproducibly is a bug, and this one is not that.

---

### B-026 · P3 · app · no catalogue surface hands its artwork to the history entry, so the search tile has nothing to show

**Symptom.** A search result for a film the user has already watched shows a
**placeholder** instead of a poster — even though the catalogue plainly has
artwork for it.

**Root cause (source-proven, 2026-10-26 — every play entry point read).** The
launch seam **accepts** artwork: `useResumeAwareLaunch`'s `openPlayer` takes
`thumbnailPath` ("Artwork URI, when the screen has one"), puts it on the
resume candidate and forwards it as `artworkPath`. The seam works. The
**callers** never supply it:

| Surface | Hands artwork to the launch? |
|---|---|
| `useHomeScreen`'s shelf handler | **Yes** — `...(item.thumbnailPath ? {thumbnailPath: item.thumbnailPath} : {})` — but the history entry's own value is `''`, so nothing is passed |
| `ArchiveItemDetailScreen.handleTrackPress` | **No** — `openPlayer({uri, title, type:'audio'})`. The image reaches only the **bookmark** and **add-to-playlist** sheet items |
| `MusicDetailScreen.handlePlay` | **No** — it *computes* `artwork` from `imageUrl`/`artworkUrl` and then does not pass it to `openPlayer`. The image reaches only the More sheet's `currentItem` |
| `SearchScreen` | **No, and it cannot** — `playWithToast`'s input type is `{uri, title, mediaType}`; there is no artwork field to pass |

`useSearch` feeds the grid only `track.albumArtUri` (media store),
`album.albumArtUri` (album) and `entry.thumbnailPath` (history store) — so a
history-backed video has no image to render.

**State:** open. This is **not** a rendering defect — the renderer is correct
and is now scheme-aware (`F-018`). The **producer** side is missing: whichever
surface writes the history entry has to carry the catalogue artwork across,
and the Search play seam needs an artwork field to carry it.

**Why it is recorded at all.** It is the reason `B-004` cannot be
device-proved: the input the thumbnail bug was about never arrives. It is
also a visible blank on a real screen — the tile is not broken, it is empty.

---

### B-027 · P3 · lib · a local `npm pack` would ship ~68 MB of native binaries

**Symptom.** `npm pack --dry-run` on a working tree where the postinstall has
run produces **124 files** and a **68.3 MB** package size (161.1 MB
unpacked) — the native `.so` files under `android/src/main/jniLibs/` (43 of
them in this working tree) dominate it. The **PUBLISHED** 1.22.0 tarball is
**80 files / 985 828 bytes (~963 KB)**.

**Root cause.** `package.json`'s `files` allow-list includes `"android/"`,
and `.npmignore` does **not** exclude `android/src/main/jniLibs/`.

**The release path itself is SAFE.** `release.yml` publishes from a **clean
CI checkout** with `SKIP_DOWNLOAD_NATIVE=1` and `npm ci --ignore-scripts`, so
the published tarball ships **no `.so` at all** — which is why it is 963 KB
and not 68 MB. Both published versions confirm it: **1.22.0** is 80 files /
985 828 bytes and **1.23.0** is 80 files / 989 669 bytes. **This is a hazard
only for a local publish.**

**State:** open — **a release-hygiene risk, not a live defect.** Nothing is
broken today: every published version is 963 KB. But a developer who
publishes from a dirty working tree would ship ~68 MB of native binaries to
npm. The fix is an `.npmignore` entry for `android/src/main/jniLibs/`
and/or dropping `"android/"` from the `files` allow-list.

---

### B-028 · P3 · app · the FAB's bottom edge sits under the mini-player dock

**Symptom.** Not yet observed — the condition is arithmetic, and the device
check is deferred.

**The arithmetic.** The mini-player docks (the video lane's `VideoDock` and
the audio lane's mini bar) are **54 dp** tall and sit at **`bottom: 0`** of
the window — an app-level overlay, painted over whatever screen the user is
on. A FAB now floats at `insets.bottom + spacing.lg` (16 dp). On a device
with a 24 dp gesture bar the FAB's **bottom edge** lands at 40 dp above the
window bottom, and the dock's band runs 0…54 dp, so the dock's top **14 dp**
cover the bottom of the button.

**This is NOT a Home defect — it is the app-wide FAB rule.** The Movies,
Music, Podcasts, Radio and Live TV FABs sit at the same offset and have the
same relationship to the dock. Home is now **consistent** with them; before
this wave it was the lone screen floating 124 dp up, and it did not overlap
the dock at all. The consistency is the point: a FAB's offset is a rule, not
a per-screen measurement.

**What it needs — a decision first, then a device proof.**
- **Option A, the FAB moves.** It would have to know whether a mini player
  is on screen (a video session with `videoPresentation === 'mini'`, or an
  audio session with the audio presentation minimised). That makes the
  button **move**, which is why YouTube and Plex answer the same question by
  **hiding** the FAB instead.
- **Option B, the dock yields.** The docks pin themselves to `bottom: 0` and
  ignore `insets.bottom`, so their bottom 24 dp sits **under the system
  navigation bar** — the docks' own defect, and the reason their band
  reaches as high as 54 dp.

**State:** open — needs a product decision, then a device check. The
geometry is **source-proven**; nothing has been observed on a device yet.

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
| F-015 | P0 | app | Closing the video left a blank white screen — the browsing stack was blanked by the user's REQUEST for a fullscreen video, which outlives the session → the window is now owned by the request AND a session (`useVideoOwnsWindow()`), and both the stack and the hardware-back gate ask that one question | app `f5/w22-close-minimise-d9` |
| F-016 | P1 | app | The resume dialog's artwork box was empty — a bare `filesDir` path is not a URI → normalised at the render site with `toRenderableImageUri` | app `f5/w22-close-minimise-d9` |
| F-017 | P0 | app+native | The Android back button was dead everywhere — `MainActivity.onBackPressed()` swallowed the press before RN's route to the JS `BackHandler` could run → the synthetic dispatch is deleted, `super.onBackPressed()` is RN's path, and the audio lane's expanded page got the same close verb the SPEC gives it | app `f5/w22-close-minimise-d9` |
| F-018 | P1 | app | The search tile prefixed `file://` onto a REMOTE thumbnail URL → `ResultTile` resolves the URI through `toRenderableImageUri` and adds the cache token through `withCacheToken`, which owns only the separator and the encoding | app `f5/w22-close-minimise-d9` |
| F-019 | P2 | app | A card with no position read `" / 21:58"` → the position segment is printed only when there IS a position, via the new `formatPositionLine` / `formatPositionAccessibility`; `formatDuration(0) === ''` stays, because "unknown duration" is a real state | app `f5/w22-close-minimise-d9` |
| F-020 | P1 | app+lib | A remote frame capture was unproven — `MediaMetadataRetriever` **does** decode a frame from an `https://` source; the device holds seven captures from the same remote archive.org media, and the newest was pulled binary-safely and checked byte-wise (29,724 bytes, magic `FFD8FF`) | docs — a stale state corrected, app `f5/w22-close-minimise-d9` |
| F-021 | P2 | app | The transport clock pinned itself to the seek TARGET for a **fixed** 600 ms, so a slow seek ran the clock **backwards** → the preview is now a **closed loop** held until the engine's own position reaches the target (`SEEK_CONFIRM_TOLERANCE_MS = 500`), with a **bound** (`SEEK_CONFIRM_FALLBACK_MS = 1000`) for a seek that never confirms; the timer handle is in a ref, so it is cleared on unmount and re-armed on every commit, and the drag release commits through the same path | app `f5/w22-close-minimise-d9` |
| F-022 | P3 | app+lib | Two files imported the player module directly, breaking the PLAYER boundary → `scripts/check-import-boundaries.js` now prints `scanned 581 files — 0 error(s), 0 warning(s)`; the new picture wrapper is deliberately **lib-only** so its edge stays a leaf and cannot close `VideoSurface → barrel → VideoPlayer → VideoSurface` | app `f5/w22-close-minimise-d9` |
| F-023 | P0 | app+lib | The lib's `exitPipAndFinish` called `activity.finishAndRemoveTask()`, which under the one-Activity architecture removes the app's whole task from Recents → the Kotlin now calls `activity.finish()`, which closes the PiP window and leaves the task; the app's `exitPlayer` facade stays, deliberately unwired, because the close verb has exactly one owner (`useClosePlayback()`) | lib (native) |
| F-024 | P1 | lib | `initPlayer()` ran in a mount effect and React commits passive effects **CHILD-FIRST**, so every descendant's bridge call beat it (8 × `IllegalStateException`); the sharpest case was a **render**, not an effect — `SimbaVideo` memoised a handle read that answers `0` → the call moved into the provider's **render phase** behind a ref guard and the handle read is no longer memoised; the release is a **MINOR**, not a patch drop-in, because the TurboModule spec changed | lib **1.23.0** · `5e8de6e` · tag `v1.23.0` |
| F-025 | P2 | app | 1 921 lines of dead code that still read as live — the `VideoController` subsystem (903), `AudioLyricsView` (525), `AudioVisualizer` (143), `DpadController` (187), `BufferingBar` (113), `AudioDescriptionTrackSelector` (50) and the `useBookmarkMarkers` export — had **ZERO** call sites → deleted; `deriveNextUpView` was **not** dead and was kept | app `f5/w22-close-minimise-d9` |
| F-026 | P3 | app+lib | RN 0.86's `NativeEventEmitter` warned twice and **never attached the native module**, because the TurboModule `Spec` did not declare `addListener`/`removeListeners` and the interop proxy exposes only spec-declared methods → the spec now declares the pair; the `getJSModule(RCTEventEmitter)` half is **still open** | lib (spec) |
| F-027 | P2 | app | The app still carried a bottom tab bar it has not had since v11 Wave 1 — a `TabNavigator` that is a native stack, two one-screen stacks that were **never rendered**, a 263-line `FloatingTabBar` that was **never mounted**, five `Tab*` types and the `@react-navigation/bottom-tabs` dependency → all deleted, `HomeScreenProps`/`LibraryScreenProps` are now the **root** stack's props, and the **geometry** the dead bar left behind went with it: the Home FAB's `+100` and the `insets.bottom + 104` (= mini player 56 **+ tab bar 48**) on six screens | app `f5/w22-close-minimise-d9` |
| F-028 | P2 | app | The Home FAB opened a picked file in the **wrong lane** — a `content://` URI carries no extension, so `getMediaType(uri)` fell through to its `'video'` default and every picked **audio** file opened in the **video** lane → a new `classifyPickedMedia()` uses the MIME type the picker reports, then the display name, then the URI. And it **failed silently**: `openPlayer` is async and rejects, but the call was fire-and-forget, so the rejection escaped as an **unhandled promise rejection** and the user saw nothing → the call is awaited, a `false` result is a failure too, and both say "Could not open that file" | app `f5/w22-close-minimise-d9` |

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

### A-003 · the resume prompt's 8-second auto-dismiss resolves as RESUME

The prompt auto-dismisses after **8 s**, and the silence resolves as
**CONFIRM ('resume')** — `autoDismissMs: 8000` and `return resume ? 'resume'
: 'start'` in `AppRoot.tsx`. The SPEC says the same thing
(`SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md:604-611`: *"Auto-dismisses after
8 s; default action is Resume."*), and the code comment records why it was
changed: dismissing used to resolve `false`, which mapped to "start from the
beginning", so eight seconds of silence silently discarded the resume point
the card existed to offer.

**Decision (2026-10-26): keep it.** Silence continuing is right; silence
discarding the offer is not.

**Why it is recorded — it is a measurement trap.** A tap that takes longer
than 8 s lands on the player, not on the button, and the film has already
resumed, so "Start from the beginning" *looks* broken when it is not.
**Device-proven (emulator-5554):** a **fast** tap read `1:35 / -20:22` on
the transport, and 1:35 + 20:22 = 21:57 ≈ the 21:58 duration — so the film
**did** start at zero. An earlier reading of "it resumed at 4:14 / 5:14" was
the same tap arriving after the auto-dismiss.

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

1. ~~Does `MediaMetadataRetriever` decode a frame from an `https://` source?~~
   **Answered 2026-10-26: YES.** The teardown flush wrote
   `files/simba-resume-thumbs/frame_877507528_1290000.jpg` (22,427 bytes,
   position `1290000` ms) from an `https://` archive.org source, pulled
   binary-safely with `adb exec-out run-as … cat` (magic `FFD8`), and it is a
   real colour frame of the film. The Recently Played card and the resume
   prompt now both show it.
2. ~~Does the hardware back leave the player after the verb change?~~
   **Answered 2026-10-26: it never left, and now it does.** The back button
   was dead app-wide; the cause was `MainActivity.onBackPressed()` swallowing
   the press before RN's route to the JS `BackHandler` could run. Instrumented
   (not fixed from static reading), measured, fixed, and re-proved on the
   device. See `B-011` / `F-017`.
3. Is the "Maximum update depth exceeded" loop in the lib's progress
   subscriber? (B-009.) **Narrowed 2026-10-27, not answered.** The lib's
   progress subscriber is fully guarded and pure, and there is no
   setState-during-render cycle in it. The live lead is `onCacheState`,
   which changes continuously (827 times across a cold start on device)
   and mints a new context value for every `usePlayerProgress()` consumer.
   The writer is most likely in the **app's** consumers of that context;
   what would settle it is a device trace of the writer stack.
4. Why does a second movie tap produce no `loadFile`? (B-012.)
5. Which surface should own handing catalogue artwork to the history entry?
   The launch seam already accepts `thumbnailPath` and forwards it as
   `artworkPath` — but `SearchScreen`'s `playWithToast` input type has no
   artwork field at all, and the catalogue surfaces drop the image they
   already have in hand. (B-026.)

---

*Opened 2026-10-21. Append as work proceeds — a bug found on 2026-10-22 goes
in as `B-022`, not into a paragraph at the bottom of a report.*
