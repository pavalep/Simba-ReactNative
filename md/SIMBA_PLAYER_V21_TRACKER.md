# SIMBA Player V21 — Single-Activity Tracker

**Spec:** `SIMBA_PLAYER_V21_SPECIFICATION.md`
**Started:** 2026-10-09
**Status:** F0 shipped (device verification in progress). F1 not started.
**Confidence marks:** `DEVICE` = observed on device · `CODE` = read/verified in source · `PENDING` = assumed or planned

---

## Rules of engagement

1. **One phase at a time.** Do not start F(n+1) until F(n) is `DEVICE`-verified.
2. **`PlayerActivity` stays in the manifest behind a flag until F5.** One flag flip must
   return the app to the working two-Activity path.
3. **Gates before every commit.** App: `npx tsc --noEmit`, `npx eslint . --ext .ts,.tsx --max-warnings 0`,
   `npx jest`. Lib: `npx tsc --noEmit`, `npx jest`,
   `gradlew :simba-dev_react-native-media-player:compileDebugKotlin`.
4. **Never verify a build by exit code.** Check the artefact `LastWriteTime`.
5. **A "must not do X" test must be mutation-checked** — revert the fix, confirm the
   test fails, restore.
6. **Update this file after every milestone**, including the ones that fail.

---

## Phase status

### F0 — Native back-press teardown — `CODE`, device verification PENDING

| Item | Status | Evidence |
|---|---|---|
| `PlayerActivity.onBackPressed` performs teardown natively | ✅ `CODE` | `PlayerActivity.kt:1330-1360` |
| `PlaybackHost.handle() → MPVLib.nativeStop` | ✅ `CODE` | `:1338-1344`, log `onBackPressed: stopped mpv (ptr=…)` |
| `MediaPlaybackService.ACTION_STOP` via `startService` | ✅ `CODE` | `:1348-1357`, log `onBackPressed: delivered ACTION_STOP…` |
| PiP path unchanged (finish only) | ✅ `CODE` | `:1326-1331` |
| JS `BackHandler` deliberately kept | ✅ `CODE` | predictive back never calls `onBackPressed` |
| lib `1.13.2` published, `latest` | ✅ `DEVICE` | `npm view` → `1.13.2`, dist-tag `latest` |
| Installed in app | ✅ `CODE` | `node_modules/…/package.json` → `1.13.2`; fix present at `:1340`, `:1357` |
| **Device: back stops playback** | ⏳ **PENDING** | APK rebuild interrupted; **rebuild required** |

**Device proof required for F0 closure** — none of these is satisfied until observed:
- `dumpsys media_session` → session `state` is `STOPPED`, not `PLAYING`
- `dumpsys activity services com.simba.player` → `MediaPlaybackService` **gone**
- notification dismissed
- logcat contains `onBackPressed: stopped mpv` **and** `onBackPressed: delivered ACTION_STOP`
- and **zero** occurrences of `stopPlayback`/`handleStop` — i.e. the log proves the
  *native* path ran, not the JS one

**Bug this fixed (regression guard):** hardware back used to `super.onBackPressed()`,
finishing natively so the JS `BackHandler` could never run. `g_mpv` is process-global, so
the window closed while audio kept playing, session stayed `PLAYING`, notification stayed
posted, and there was no window left to stop it. Observed `DEVICE` on emulator-5554 API 37:
zero matches for `stopPlayback|nativeStop|handleStop` across the capture.

---

### F1 — `setVideoBounds` on `MpvRenderView` — ✅ `CODE` GATES GREEN (lib commit `2e6f03d`)

Lib repo. One new method wrapping `FrameLayout.LayoutParams`.

- [x] `@ReactMethod setVideoBounds(x, y, width, height, promise)` on `MpvBridgeModule`
- [x] Mutates the existing `MpvRenderView` layout params — **does not** `removeView`/`addView`
- [x] Refuses non-positive w/h **loudly** (`Log.w` + no-op), never silently
- [x] `setSurfaceVisible` / `fillVideoBounds` / `isSurfaceMounted` added alongside
- [x] `MpvPlayerModule.ts` NOOP fallback resolves `false` — never claims success
- [x] `NativeMpvPlayer.ts` spec + `PlayerCommands` in `src/types/player.ts`
- [x] Tests: rect forwarded verbatim; `false` propagates; visibility both ways;
      NOOP honesty (**mutation-checked** — flipping the fallback to `true` fails it)
- [x] Gates: lib `tsc` 0 · lib `jest` **12 suites / 204 passed** · `compileDebugKotlin` 0
- [ ] Cut `v1.13.3`, annotated tag, push, Actions, `npm install` in app

**Two design decisions that must not be reverted:**

1. **These return `Promise<boolean>`, not `isBlockingSynchronousMethod`.** View mutation is
   main-thread-only; a blocking sync method runs on the module queue. The boolean is
   load-bearing — `false` means "no surface to move", and a caller that can't see that
   renders mini-player chrome over a surface that was never mounted.

2. **`PlayerSurface` holds a `WeakReference`, not a strong one.** A `View` retains its
   `Context`, which for a mounted surface is the Activity. A strong field leaks the
   Activity and its view tree for the process lifetime. `detach()` is identity-checked so
   an outgoing Activity's `onDestroy` cannot unregister the incoming Activity's
   replacement during a configuration change.

**Latent attach bug found and fixed here** — `MpvRenderView.attachSurfaceLocked` deferred on
`!isAttachedToWindow`, and its comment claimed that meant "audio mode / GONE". False: a
GONE view IS attached to its window. The real damage is that once `setNativePtr` gave up,
nothing re-evaluated the binding — `setNativePtr` runs once and `surfaceChanged` only
publishes `android-surface-size`. An audio → video handoff had no reliable path back to a
bound surface and would have rendered black. `ensureSurfaceAttached()` now re-runs on
`setNativePtr`, `setSurfaceVisible(true)`, `onAttachedToWindow` and `onVisibilityChanged`.
**This was found by reading the code, not by a crash — F4 depends on it.**

---

### F2 — Surface + PiP move to `MainActivity` — NOT STARTED

Highest-risk phase. **Exit gate is device PiP proof, not a green build.**

- [ ] `AndroidManifest.xml:67-74` → add `android:supportsPictureInPicture="true"` to `MainActivity`
- [ ] Move the `MpvRenderView` mount from `PlayerActivity.kt:463-487` to `MainActivity`
      (`android.R.id.content`, index 0)
- [ ] `ReactRootView` background transparent while video presented, opaque otherwise
      — **this is the explicit V11 failure mode, do not skip it**
- [ ] Port the PiP lifecycle: `setAutoEnterEnabled(true)` (API 31+) /
      `onUserLeaveHint` (API 26–30); `onPictureInPictureModeChanged` → re-apply bounds
- [ ] Re-apply `setVideoBounds` on **every** layout pass, not once
- [ ] Hide app chrome in PiP
- [ ] `MainActivity` teardown on destroy uses the native rule (spec §4.1)
- [ ] Video launch flag: in-app route vs `PlayerActivity` (default `PlayerActivity`)
- [ ] Gates: Kotlin, `tsc`/eslint/jest
- [ ] **DEVICE:** video plays in `MainActivity`; home gesture → PiP with picture (not black);
      PiP close → teardown; rotate in fullscreen and in PiP

**Rollback:** flip the video-launch flag. Do **not** "fix" a black screen with an opaque
background over the surface — that is exactly the V11 mistake.

---

### F3 — Video as an in-app route — NOT STARTED

- [ ] `VideoPlayer` becomes a route in the existing navigation stack
- [ ] `useResumeAwarePlayerActivity` seam stops calling `openPlayer` for video
- [ ] Back handler: minimise, not stop — until MiniPlayer exists (F4) back must still
      stop, otherwise there is a state with no UI
- [ ] Deep links / "open with" still reach video (`MainActivity` already has the
      shared-file intent filters at `AndroidManifest.xml:75-76`)
- [ ] **DEVICE:** play → back → home → PiP → expand → back, all sane

---

### F4 — One `MiniPlayer`, both lanes — NOT STARTED

- [ ] Extend `AudioMiniBar` to render video (artwork → live surface rect)
- [ ] `setVideoBounds` driven by the mini player's measured layout
- [ ] Same component, same `exitPlayer`, same teardown — **no lane branch duplicating controls**
- [ ] MiniPlayer X: engine + service + notification, all of it
- [ ] Audio↔video handoff does not restart the engine
- [ ] **DEVICE:** audio→video→audio handoff; expand/collapse; X during playback

---

### F5 — Delete the second Activity — NOT STARTED

Only after F2–F4 are `DEVICE`-verified.

- [ ] Delete `PlayerActivity` from the lib
- [ ] Delete `EXTRA_IS_PLAYER_ACTIVITY`, `MAIN_COMPONENT_NAME` reuse (D-2, D-3)
- [ ] Delete the manifest entry, drop the feature flag
- [ ] Delete the duplicated teardown (D-5)
- [ ] Delete `AudioChrome` `streamType` gate (D-7) — verify it is genuinely redundant first
- [ ] Delete lane-inference backstops (D-8): `HistoryScreen.tsx:99`,
      `fileService.ts:58`, `QueueScreen.tsx:197`, `useHomeScreen.ts:187`
- [ ] `useQueueSync.ts:101-108` — drop hardcoded audio lane + phantom `uri: ''` (D-9)
- [ ] `openPlaylist` routed through the app seam (D-10, `C-17`)
- [ ] Full device matrix re-run
- [ ] **Delete dead code:** `AudioLyricsView` (525 lines, 0 call sites),
      `AudioVisualizer` (143, 0), 13 × `textContent.ts`, `NowPlayingScreen` `return null`,
      `handleViewFullLyrics` lie

**Every row must be verified absent.** "Probably gone" is not done.

---

## Open defects this refactor touches

| ID | Defect | Fate under V21 |
|---|---|---|
| `C-03` | Video black screen (unexplained earlier captures) | F2 device proof should settle it |
| `C-07` | Recently Played / Bookmarks have no artwork | Independent — do in F5 |
| `C-16` | Persisted rows mis-tagged as audio route films to the audio player | Independent — needs a store-version migration |
| `C-17` | `openPlaylist` bypasses the seam | D-10, F5 |
| `C-18`–`C-24` | Lane-routing defects, incl. `resolveStreamType` `'episode'`→`'video'` and `'archive-video'` missing from the video branch | Mostly D-8, F5 |
| `C-36` | The lane decides whether a window opens at all, not just a badge | F3 removes the window decision entirely |

---

## Standing hazards

- **Do not `npm install` a `file:`/`link:`/`workspace:` tarball.** Publish first: commit →
  push → **annotated** tag → Actions → *then* install. Verify with
  `git ls-remote --tags origin` (tag **and** `^{}` must appear).
- **Never let `tsc` pass on a lib that isn't installed.** A lib-only change fails to
  compile until published and reinstalled — that is the gate working.
- **Verify the symbol shipped.** Conditional spreads (`...(x ? {field} : {})`) bypass
  excess-property checking.
- **`TypeError: undefined is not a function` after a lib upgrade usually means a stale
  APK, not a JS bug.** Check the artefact `LastWriteTime` against the installed version,
  and grep logcat for the method name — zero hits = wrong binary. Rebuild; never add a
  JS shim.
- **Do not pipe a long-running native process into `Select-Object -First N`** — it stops
  consuming, kills the producer, and the pipeline still exits `0`.
- **RNTL 14:** `render`, `renderHook`, `rerender`, `unmount`, `act` all return Promises.
- **Repo bans `Alert.alert`** — use `useToast()` / `useConfirmDialog()`.
- **ESLint bans** raw colour literals and `no-void`.
- **Do not apply the pending Argent 0.25.0 → 0.27.0 update without explicit consent.**

---

## Deep-scan findings (2026-10-09) — these change the plan

Two read-only sweeps covered every `PlayerActivity` / `MpvRenderView` / PiP reference in the
lib and every video launch, lane-inference and dead-code site in the app.

### ✅ Refines scope: audio already left `PlayerActivity`

Audio never goes through `PlayerActivity` — it runs in-app via `AudioChrome` /
`AudioPlayer` and the foreground service. **Video is the only remaining consumer.** So the
collapse is one lane, not two, and the "one `MiniPlayer` for both lanes" goal in F4 is an
*extension of the existing audio mini bar*, not a rewrite.

### 🔴 P0 — deleting `PlayerActivity` breaks the service silently

`MediaPlaybackService.kt` targets the Activity by **string literal**, not by class reference:

- `MediaPlaybackService.kt:206`
- `MediaPlaybackService.kt:395`

Both `setClassName(context, "com.simba.player.PlayerActivity")`. **Nothing fails at compile
time when the class is deleted.** PiP entry and the notification's "expand" action would
throw `ActivityNotFoundException` at runtime, on device, with a green build. These are the
first two lines to change in F5, and they must be repointed at `MainActivity` **before** the
class goes.

### ✅ `MpvRenderViewManager` is dead code

`PlayerPackage` never registers any view manager, so the JS `<MpvRenderView>` component is
unreachable from JS. F1 correctly used a bridge method (`setVideoBounds`) rather than a
props-driven view manager. **Delete `MpvRenderViewManager` in F5** — it is 100% unreachable.

### 🔴 `seekable` root cause — ✅ FIXED (`CODE`, lib commit `c1019ff`)

**Do NOT apply the obvious fix.** The suggested app-side patch
`state.seekable || state.durationMs > 0` in `TransportBar` is jugaad: a live stream can
report a duration and still have no seekable range, so it lights up a seek bar that cannot
work. A test now pins that a file with a duration and no seekable range stays unseekable.

Actual cause, in the lib:

- `PlayerProvider.tsx:688` seeded `seekable` once at mount.
- In the ordinary launch order the file is not yet loaded at mount, so mpv correctly
  reports `false`. The seed could never do the job it was written for.
- mpv emits `seekable` only as an **edge**. Measured on device (Android 37):
  `onCacheState` reached JS 827 times, `onSeekable` **zero**.

Fix: factored into `reseedEdgeLevels(reason)` and called at mount **and** on
`onFileLoaded`. One implementation, two call sites, so they cannot drift.
Mutation-checked — removing the `onFileLoaded` re-seed fails the test.
Gates: lib `tsc` 0 · jest **12 suites / 206 passed**.

### Other confirmed lib defects — ✅ FIXED (`5308019`)

| Defect | Status |
|---|---|
| `setOrientation` logged the value *after* writing it, so every rotation printed as a no-op | ✅ fixed |
| `openPlayer` docblock claimed `FLAG_ACTIVITY_NEW_TASK` that was never set | ✅ **comment** fixed, deliberately **not** the code |
| Stale z-order claim: comment credited `setZOrderMediaOverlay(true)` for PiP, which `MpvRenderView` forbids and never calls | ✅ fixed |

**On `FLAG_ACTIVITY_NEW_TASK`:** the comment called the flag "harmless". It is not —
from an Activity context it starts the target in a new task, which breaks the
`singleTask` reuse that stops a second `openPlayer` stacking a duplicate player window,
and leaves the video in a task the user's back gesture does not return from. The code was
right and the comment was wrong, so only the comment changed. Adding the flag would have
introduced the bug the comment described.

---

### App bug fixed — MediaKind/MediaLane type confusion

`QueueScreen/hooks/useQueueScreen.ts:197` passed `mediaType: entry.type ?? 'video'` to
`play()`. But on `PlaylistEntry` (see `state/playerStore.ts:35-45`):

- `type` is a **`MediaKind`** — 'movie' | 'episode' | …
- `mediaType` is a **`MediaLane`** — 'audio' | 'video'

Two different axes, adjacent on the type, both `string`. Every queue jump handed `play()`
a value that is not a lane at all, and because `type` is **required** the `?? 'video'`
fallback could never fire, so the garbage went straight through. Fixed to
`entry.mediaType`.

**This is the same confusion that put music notes on film posters** (the `C-36` badge bug).
The two fields being adjacent string aliases is why nothing caught it.

---

## Carried forward

| Defect | Location | Note |
|---|---|---|
| `openPlayer` sets **no** intent flags | `MpvBridgeModule.kt:245` | Docblock claims `FLAG_ACTIVITY_NEW_TASK`; the code does not set it |
| `setOrientation` logs the value *after* writing it | `MpvBridgeModule.kt:2256-2264` | `was ${requestedOrientation}` reads the new value, so the log always looks like it did nothing |
| `enterPip` arity mismatch | Kotlin params nullable vs `NativeMpvPlayer.ts:293` non-nullable | Latent |
| Stale z-order claim | `MpvBridgeModule.kt:245` vs `MpvRenderView.kt` | One says `setZOrderMediaOverlay` is required, the other forbids it |

---

## Jugaad inventory (31 items, app scan)

Everything here exists because of the two-Activity split, or is a workaround that was
added on top of it. Deleting these is the point of the refactor.

**Lane inference — guessing what should be recorded**
1. `HistoryScreen.tsx:99` 2. `fileService.ts:58` 3. `QueueScreen.tsx:197`
4. `useHomeScreen.ts:187` 5. `useHomeScreen.ts:366` 6. `useSearchScreen.ts:143`
7. `useOpenWithResume.ts:118` 8. `useResumeAwarePlayerActivity.ts:70`
9. `useQueueSync.ts:107` 10. `useBookmarkToggle.ts:135`

**Window / PiP split**
11. `usePresentation.ts` (`isFullscreen` collapsing onto Activity identity)
12. `usePlayerActivity.ts:205` (PiP sizing writes to a different view than the one mounted)
13. `AudioChrome.tsx` `streamType` gate (`b52d462`)
14. `AudioMiniBar.tsx` replaying audio-only because the video mini bar never existed

**Duplicated transport**
15. `useTransport.ts:223` and `:260` — **two** `setVolume` declarations; both docblocks
    claim a different wave introduced it
16. `AudioPlayer.tsx:339` — a third volume path calling a different `setVolume`

**Dead / fake**
17. `MpvRenderViewManager` — unreachable
18. `openPlaylist` bypassing the app seam (`C-17`)
19. `useQueueSync.ts:101` — phantom `uri: ''`
20. `useQueueSync.ts:108` — hardcoded `'audio'` lane

**Corrections to earlier audit claims — both were wrong, both are now verified:**
- `textContent.ts` was recorded as "0 call sites" — it has **4** real import sites.
- `NowPlayingScreen` was recorded as a `return null` stub — it is **live**, with 1 call site.

---

## Carried forward

- [ ] **P0** `MediaPlaybackService.kt:206` / `:395` — `setClassName` string literals target
      `PlayerActivity`. Must be repointed at `MainActivity` **before** the class is deleted,
      or PiP and the notification expand action throw `ActivityNotFoundException` at runtime
      on a green build.
- [ ] Cut lib `v1.13.3` (F1) → annotated tag → push → Actions → `npm install` in app
- [ ] F2: manifest PiP on `MainActivity`; move the surface mount; transparent RN root;
      port the PiP lifecycle (`setAutoEnterEnabled` / `onUserLeaveHint` /
      `onPictureInPictureModeChanged`); re-apply bounds on every layout pass
- [ ] F3: video as an in-app route; seam stops calling `openPlayer` for video
- [ ] F4: one `MiniPlayer` for both lanes, driven by `setVideoBounds`
- [ ] F5: delete `PlayerActivity`, `MpvRenderViewManager`, 2nd React root, duplicated
      teardown; work the 31-item jugaad inventory
- [ ] `seekable` root fix in `PlayerProvider.tsx:688` — re-seed on file load, **not** the
      app-side `|| durationMs > 0` band-aid
- [ ] `C-16` store-version migration for persisted mis-tagged rows — no migration mechanism
      exists in `AsyncStoragePersister` today
- [ ] `C-07` recents/bookmarks artwork wiring
- [ ] Lib: `openPlayer` missing `FLAG_ACTIVITY_NEW_TASK`; `setOrientation` logs after write;
      `enterPip` arity mismatch; stale z-order comment
- [ ] `useQueueScreen.ts:197` reads `entry.type` where `entry.mediaType` is written
- [ ] Jest worker force-exit flake: `[checkpoint] resume thumbnail capture failed Error: no decoder`
- [ ] PiP, Next/Prev with a real playlist, Bluetooth — never device-verified
- [ ] Argent 0.25.0 → 0.27.0 — notice surfaced, **not applied**, awaiting consent
- [ ] `useTransport.ts` duplicate `setVolume` declaration at `:223` / `:260`