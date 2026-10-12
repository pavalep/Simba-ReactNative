# SIMBA Player V21 — Single-Activity Tracker

**Spec:** `SIMBA_PLAYER_V21_SPECIFICATION.md`
**Started:** 2026-10-09
**Last updated:** 2026-10-12, session 6 (PiP sourceRectHint; F3 groundwork: LaunchParams.requestId + session startPositionMs)
**Status:** F0 shipped (device proof outstanding) · F1 shipped · F2a shipped · **F2c shipped** · **F2b shipped** (app `87e9f12`) · **F2d shipped** (lib `001f352`) · P0 shipped (`035f611` → npm **1.13.4** → app `d5b933b`, verified in `node_modules`) · C-16 root fix shipped · `resolveStreamType` fixed · `seekable` fixed · **surface mount refactored** (lib `366d0fd`) · **F3 confirmed unblocked with no new lib API** (`commands.loadFile` already loads without an Activity). **Next: F3. F2e, F4, F5 not started.**
**Confidence marks:** `DEVICE` = observed on device · `CODE` = read/verified in source · `PENDING` = assumed or planned

---

## Where things stand at the end of 2026-10-09

**Shipped and gate-green (all committed, nothing pushed):**

| Commit | Repo | What |
|---|---|---|
| `9879a3e` | app | `MainActivity` carries `supportsPictureInPicture`; manifest records why `PlayerActivity` exists |
| `2e85a4d` | app | Queue jump passed a `MediaKind` into the `MediaLane` slot |
| `a11f6f8` | app | **Lane is now DERIVED from kind** + persist v2 migration repairs mis-tagged rows |
| `343ccd6` | lib | Release 1.13.3 (tag `v1.13.3`, Actions published) |
| `2e6f03d` | lib | F1: `setVideoBounds` / `fillVideoBounds` / `setSurfaceVisible` / `isSurfaceMounted` + `PlayerSurface` |
| `5308019` | lib | Three comments that described code that did not exist |
| `c1019ff` | lib | `seekable` re-seeded on `onFileLoaded` |
| `bd699d4` | lib | `resolveStreamType`: `'episode'` and `'archive-video'` opened the wrong window |
| `035f611` | lib | **P0**: notification/PiP host Activity is *resolved* from the manifest, not hardcoded |
| `366d0fd` | lib | `PlayerSurface.mount`/`unmount` — the only sanctioned mount path; `PlayerActivity` refactored onto it |
| `e76eafc` | lib | Finish the `enterPip` arity fix — the TurboModule spec was never updated |
| `001f352` | lib | F2d: PiP window takes the video's real aspect (was hardcoded 16:9) + seamless resize |
| `e7899c4` | lib | PiP entry gets the surface's live rect (`sourceRectHint`) — animates the real frame, and matches the aspect so it cannot arrive stretched |
| `4886eb7` | lib | `LaunchParams.requestId` — a launch gets its own identity (F3 enabler) |
| `cecc167` | app | F2c: `onResume` pins portrait only when mpv has no media loaded |
| `87e9f12` | app | **F2b**: `MainActivity` mounts the video surface via `PlayerSurface.mount(this)`; clears 3 V11-era comment/dead-code items |
| `d5b933b` | app | Bump lib `1.13.4` (P0) |
| `8c3062d` | app | `startPositionMs` on the session — an in-window launch can honour resume |

**Gate status:** app `tsc` 0 · `eslint --max-warnings 0` 0 · `jest` **82 suites / 1034 passed** ·
lib `tsc` 0 · `jest` **13 suites / 229 passed** · `compileDebugKotlin` BUILD SUCCESSFUL · APK built
`18:15:57` (368,972,822 bytes).

**Not pushed — verified 2026-10-12:** app is **8 commits ahead** of `origin/main`
(`git rev-list --left-right --count origin/main...HEAD` → `0 8`), lib is **2 ahead**
(`0 2` — `5308019`, `bd699d4`; `2e6f03d`/`c1019ff`/`343ccd6` went out with the
`v1.13.3` push). App has lib `1.13.3` installed and pinned; npm `latest` = `1.13.3`.

Only untracked files in either repo are scratch `COMMIT_MSG_*.txt`. **No uncommitted
source changes in either repo.**

### Blocked on one observation
`C-07` (artwork). The rails read `resumeThumbnailPath || thumbnailPath`; the chain
Home → `useHomeScreen.ts:202` → seam `:236` → `writeCheckpoint` all carry the field, so the gap is
**upstream of all of them**. To pick the correct end: play a film, let it checkpoint, screenshot
Recently Played. Grey circle → the catalogue never returns artwork, fix the producer. Poster shown →
the captured frame is the gap, fix the capture timing.

### Noted, not fixed
The gold play FAB on Home renders **on top of** the Explore Contents carousel, covering the Music
card's artwork and label. Components located (`BrowseAllShelf.tsx` / `CategoryCard`); no layout
change written yet.

### OPEN — "Recently Played is empty after playing a movie" (reported 2026-10-12)

**NOT yet root-caused. Do not guess a fix for this.** What was eliminated, by reading:

| Suspect | Verdict | Evidence |
|---|---|---|
| Reader-side filter | **Ruled out** | `useHomeScreen.ts:319` is `recentFiles.slice(0, MAX)` — a slice, no filter |
| Store write broken | **Ruled out** | `recentHistoryStore.ts:127-167` upsert is a plain prepend+evict |
| Writer logic | **Ruled out** | `usePlaybackCheckpointSync.test.tsx` — 13 tests green |
| Writer not mounted | **Ruled out** | `App.tsx:323`, inside `ActivityShell`, above the `isPlayerActivity` split |
| Session never published | **Ruled out** | `useResumeAwarePlayerActivity.ts:212` calls `beginSession` before the launch |
| `PlayerProvider` absent in root | **Ruled out** | `SimbaPlayer` mounts it (`hooks/SimbaPlayer.tsx:110`); `ActivityShell` is its child |
| `durationMs` never observed | **Ruled out** | `'duration'` is in `OBSERVED_PROPERTIES` (`PlayerProvider.tsx:289`) *and* polled at 1 Hz |
| Launch params stolen by MainActivity | **Ruled out** | `useLaunchParams` is mount-once + `isCurrentActivityPlayer()`-guarded |
| **`isPlaying` never true in the hook's root** | **LEADING** | not yet proven |
| **Two roots × two `PlayerProvider`s on one process-global mpv** | **STRUCTURAL** | see below |

**The structural finding — this is why it belongs to the collapse, not to a ticket.**
`usePlaybackCheckpointSync` runs in **two React roots simultaneously**. Each root mounts its
**own `PlayerProvider`**, and each subscribes to the same **process-global** mpv engine
(`PlaybackHost`). Every provider's cleanup calls `bridge.unobserveProperty(...)`, which is a
*global* mpv operation, not a per-provider one. So two providers observe one engine, and either
can unobserve the other's properties. This is not a bug that can be pinpointed by reading one
file — it is a **class** of bug that only exists *because* there are two Activities. Collapsing
to one root deletes the ambiguity rather than debugging around it.

**Also note:** the existing writer suite mocks `useTransport` wholesale
(`jest.mock('.../useTransport')`). It therefore proves the hook's logic and proves **nothing**
about the transport values it will actually see. Any future fix here needs a test that drives
the real `useTransport`, not another mocked one.

**Deferred to F4** (which is where playback state has one owner): re-verify whether a row lands
once there is a single root.

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
- [x] Cut `v1.13.3`, annotated tag (`^{}` verified), pushed, Actions published
- [x] `npm install` in app + pinned in `package.json` / `package-lock.json` (`0827609`)
- [x] Symbol verified present in `node_modules` (`PlayerSurface.setBounds`), not assumed
      from the version number

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

- [x] `AndroidManifest.xml:67-74` → add `android:supportsPictureInPicture="true"` to `MainActivity`
      — done in `9879a3e`, **verified in the regenerated merged manifest**, not by exit code.
      Two of the three manifest intermediates on disk were stale and still lacked the attribute,
      so the exit code would have lied.
- [x] Guard the `USER_PORTRAIT` re-pin in `onResume` — **shipped 2026-10-12.**
      The unconditional re-pin was a workaround for the two-Activity architecture: video
      lived in `PlayerActivity`, so "MainActivity resumed" always meant "the user is
      browsing". Once video plays *here* the same line fights the session's own
      orientation and snaps a landscape film to portrait on return.
      Now `onResume` restores portrait **only when mpv has no media loaded**, answered by
      a live read through `PlaybackHost.handle()` → `MPVLib.nativeGetProperty(ptr,
      "playback-state")`. `idle`/`stopped` ⇒ portrait; `loading`/`play`/`pause`/`eof-reached`
      ⇒ leave the session's orientation alone. Read is never cached, and every failure
      degrades to "no media", which is the conservative answer for this question: it can
      restore portrait a moment early, but it can never strand a browsing app in landscape.
      **Residual, owned by F4:** if a session ends *while backgrounded*, nothing restores
      portrait until the next resume. F4's close path must own that.
- [x] **Lib: give the surface a mount point at all** (lib `366d0fd`). `PlayerSurface.attach()`
      was **never called by anything** — F1 shipped the registry, the four mutators, the bridge
      methods and the tests with no caller, so `isSurfaceMounted()` answered `false` and all four
      surface methods refused *on a fully working video path*. This is the exact jugaad shape the
      series exists to kill: wired-looking from JS because every method exists, is typed and is
      mocked in `jest.setup.ts`, while the one call that would make it true is absent. Tests that
      mock the boundary cannot see it.
      `PlayerSurface.mount(activity)` / `unmount(view)` are now the only sanctioned path, and
      `PlayerActivity` was refactored onto them (its inline mount block deleted), so there is one
      implementation of "where does the surface go". Mount leaves the view **GONE at 0x0**, so
      showing video is always two explicit acts — size it, then show it — and no host can end up
      with an accidental full-bleed surface over its own UI. Every refusal logs its reason.
- [x] Mount the surface in `MainActivity` — `PlayerSurface.mount(this)`, no app-side view
      construction (app `87e9f12`). The surface comes up **GONE at 0x0**, so this window is pure
      app UI until something explicitly sizes *and* shows it. The V11 "opaque React root covers
      the video" failure is therefore prevented by construction, not by every call site getting
      a background right. Unmount goes through the library too, so removal + deregistration stay
      one identity-checked step. Refused mounts log the concrete reason at both the lib and host
      level rather than silently degrading.
- [ ] React root background transparent while video presented, opaque otherwise.
      **Re-scoped, and no longer a background problem.** With the surface mounted GONE at 0x0,
      the app root keeps its normal opaque background and the surface is simply not visible
      under it until it is given bounds. If video still does not read through, the cause is
      layer order or a still-opaque ancestor — **not** the window background. Do not "fix" it by
      making the window transparent; that was V11's failure mode.
- [x] **P0 — remove the `setClassName("com.simba.player.PlayerActivity")` landmine** (lib
      `035f611`). `MediaPlaybackService` named its notification content intent *and* its
      MediaSession activity by string literal. Nothing fails at compile time, so F5 would have
      shipped a green build with two notification paths that throw `ActivityNotFoundException`
      when tapped. Replaced with `hostPlayerActivityIntent()`: `ACTION_MAIN` +
      `CATEGORY_LAUNCHER` + `setPackage`, i.e. "what does the launcher icon resolve to" — the
      player host *is* the app entry point after the collapse. Unresolvable ⇒ logs and returns
      null; the notification gets no content intent and `setSessionActivity(null)`, which is
      its documented "no UI target" value. **Both sites share one builder** so the policy
      cannot drift. *Not yet in the app — needs tag + publish + `npm install`.*
- [x] **Research: is "full video in `MainActivity`, PiP in `PlayerActivity`" viable? — NO.**
      PiP is not a destination you navigate to; the *top* activity enters it ("only the top
      activity enters picture-in-picture", developer.android.com), so there is no separate PiP
      activity to point at. Android's own recipe for this exact case is single-Activity +
      `launchMode="singleTask"`: *"To ensure a single activity is used for video playback
      requests and switched into or out of PiP mode as needed…"*. Google Developer Training
      13.1: *"you usually implement the components of the media architecture in a video app
      as a single Android Activity"* — listing PiP as a state of that one activity. YouTube
      ships both the in-app Miniplayer *and* OS PiP from one app; different features, not
      different Activities. AOSP names the split-Activity failure mode (the details page gets
      put into PiP because it shares the task). And the SurfaceView constraint makes the split
      impossible regardless: a Surface belongs to its window, so one video cannot render into
      both activities. **Decision: the collapse stands.**
- [x] **F3 mechanism identified: `useLaunchPlayback` is already public and already intended for
      this.** `index.ts:115` exports it *"so a consumer using `<SimbaPlayerRoot headless>` can
      call it directly for a payload the module did not originate"* — the lib anticipated the
      in-window path. `MpvPlayerModule.ts:919` names the two entry points: `openPlayer` →
      activity → launch params, versus a direct programmatic load. **Do not build a new launch
      mechanism.** What remains in F3 is the app wiring: call it from the session, size the
      surface, and keep `openPlayer` reachable until proven.
- [x] PiP window takes the video's real shape (lib `001f352`). `enterPip` never passed an
      aspect, so `buildPipParams`'s `16f / 9f` default applied to everything — every PiP window
      was 16:9 regardless of what was playing, and since the shape is fixed at entry the system
      animated to a shape that did not match the picture inside it. Now reads the same
      `width` / `height` properties `getVideoParams` already reads (`currentVideoAspect()`),
      null for "no file" / "audio only", with the 16:9 fallback logged rather than silent.
      `buildPipParams` still clamps to Android's documented 0.42–2.38 range.
- [x] `setSeamlessResizeEnabled(true)` (API 31+) — rendering-quality only; changes how the
      transition is drawn, never whether PiP is entered.
- [ ] `setAutoEnterEnabled(true)` (API 31+) — **deliberately held for F4.** Every shipping
      player auto-enters PiP on a home swipe (YouTube, Plex, Netflix), so this app will want it,
      but auto-enter means the *whole app window* enters PiP and whether the JS chrome
      suppression is correct in the collapsed architecture is exactly what device verification
      would confirm. Deferred by instruction, and it is a product-visible behaviour change, so
      it waits for F4 where the chrome path is owned end to end.
- [ ] Re-apply `setVideoBounds` on **every** layout pass, not once
- [ ] Hide app chrome in PiP
- [ ] `MainActivity` teardown on destroy uses the native rule (spec §4.1)
- [ ] Video launch flag: in-app route vs `PlayerActivity` (default `PlayerActivity`)
- [x] **F3 groundwork: a launch now has an identity, and the session records where it begins.**
      Two things were blocking an in-window load, and neither was obvious from the seam:
      - `useLaunchPlayback` keys its effect on `uri|startPositionSec`, which is **not a unique
        identity for a launch**. That was sound only because every launch started a fresh
        `PlayerActivity` — new React root, fresh mount, effect always fires. In-window the hook
        stays mounted, so *"back out of a film, tap it again"* (same URI, resume hands back the
        same position) would skip the load entirely and the user would press play and see
        nothing. `LaunchParams.requestId` (lib `4886eb7`) is optional and additive — absent, the
        key is exactly what it was. **Mutation-checked**: dropping it fails the re-launch test
        and nothing else.
      - The resume position existed only as an argument to `openWithResume`, because its entire
        job was to become an Intent extra for an Activity that did not exist yet. In-window
        there is no second Activity to carry it, so "continue from 12:04" would have silently
        become "start over". `startPositionMs` is now **required** on the session (app
        `8c3062d`) — required, not optional, because an optional field is precisely how that
        failure returns. `tsc` caught all 4 test call sites missing it, which is the point: the
        lane bug survived because its field came from a conditional spread, which skips
        excess-property checking.
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
- [ ] **Delete dead code** — re-verify each call count before deleting:
      `AudioLyricsView` (525 lines, 0 call sites), `AudioVisualizer` (143, 0),
      13 × `textContent.ts` (**4 real import sites** — the "0" in an earlier audit was wrong),
      `handleViewFullLyrics` lie.
      **`NowPlayingScreen` is NOT a stub** — an earlier audit called it a `return null`
      placeholder; it is live with 1 call site. Do not delete it.

**Every row must be verified absent.** "Probably gone" is not done.

---

## Open defects this refactor touches

| ID | Defect | Fate under V21 |
|---|---|---|
| `C-03` | Video black screen (unexplained earlier captures) | F2 device proof should settle it |
| `C-07` | Recently Played / Bookmarks have no artwork | **Independent of V21.** Blocked on one screenshot. |
| `C-16` | Persisted rows mis-tagged as audio route films to the audio player | ✅ **FIXED** `a11f6f8` — lane derived from kind + persist v2 migration |
| `C-17` | `openPlaylist` bypasses the seam | D-10, F5 |
| `C-18`–`C-24` | Lane-routing defects. `resolveStreamType` `'episode'`→video and `'archive-video'` missing: ✅ **FIXED** `bd699d4`. The rest: D-8, F5 | Mostly F5 |
| `C-36` | The lane decides whether a window opens at all, not just a badge | F3 removes the window decision entirely |

### Resolved since the last session, for the record

| Defect | Fixed in |
|---|---|
| Film persisted `{type:'movie', mediaType:'audio'}` → music badge + audio pipeline | `a11f6f8` (app) |
| Queue jump passed a `MediaKind` into the `MediaLane` slot | `2e85a4d` (app) |
| Seek bar permanently disabled ("Live stream — not seekable") | `c1019ff` (lib) |
| `'episode'` / `'archive-video'` opened the wrong player window | `bd699d4` (lib) |
| `setOrientation` logged after writing; `openPlayer` flag claim; stale z-order claim | `5308019` (lib) |
| Audio→video surface handoff had no path back to a bound surface | `2e6f03d` (lib) |

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

## Jugaad inventory (31 items, app scan)

Everything here exists because of the two-Activity split, or is a workaround that was
added on top of it. Deleting these is the point of the refactor.

**Lane inference — guessing what should be recorded**
1. `HistoryScreen.tsx:99` 2. `fileService.ts:58` 3. ~~`QueueScreen.ts:197`~~ **FIXED `2e85a4d`**
4. `useHomeScreen.ts:187` 5. `useHomeScreen.ts:366` 6. `useSearchScreen.ts:143`
7. `useOpenWithResume.ts:118` 8. `useResumeAwarePlayerActivity.ts:70`
9. `useQueueSync.ts:107` 10. `useBookmarkToggle.ts:135`

**These are LIVE NOW, not deferred to F5.** F3 has not landed, so video still launches
`PlayerActivity` and every one of these paths executes in production today. Fixing them is
not throwaway work that the refactor supersedes.

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


## Carried forward — as of 2026-10-09 session close

**Do first tomorrow**
- [ ] **P0** `MediaPlaybackService.kt:206` / `:395` - `setClassName` string literals target
      `PlayerActivity`. Must be repointed at `MainActivity` **before** the class is deleted,
      or PiP and the notification expand action throw `ActivityNotFoundException` at runtime
      on a green build.
- [ ] `C-07` artwork - blocked on ONE screenshot of Recently Played **with data in it**

**F2 - the risky phase. Exit gate is device PiP proof, not a green build.**
- [ ] F2b: MainActivity mounts + owns `MpvRenderView` at `android.R.id.content` index 0;
      React root transparent while video is presented. **This is the explicit V11 failure mode -
      do not skip it, and never "fix" a black screen with an opaque background.**
- [ ] F2c: `MainActivity.onResume` re-pins to `USER_PORTRAIT` unconditionally (`MainActivity.kt:83`).
      Harmless today (video lives in `PlayerActivity`); once video moves here, rotating to
      landscape snaps straight back to portrait. MainActivity will own the surface as a field,
      so it can check visibility directly.
- [ ] F2d: port the PiP lifecycle - `setAutoEnterEnabled(true)` (API 31+) / `onUserLeaveHint`
      (<31), `onPictureInPictureModeChanged`; re-apply bounds on **every** layout pass
- [ ] F2e: the `setClassName` P0 above
- [ ] F3: video as an in-app route; seam stops calling `openPlayer` for video; one feature flag
      with `PlayerActivity` as fallback so a regression is one flag flip
- [ ] F4: one `MiniPlayer` for both lanes, driven by `setVideoBounds`
- [ ] F5: delete `PlayerActivity`, `MpvRenderViewManager`, the 2nd React root, the duplicated
      teardown; work the 31-item inventory. **Verify every row absent, not "probably gone".**

**Other open work**
- [ ] FAB on Home renders **on top of** the Explore Contents carousel, covering the Music card
- [ ] Lane-inference sites - **live now**, not blocked on F3, because F3 has not landed and video
      still launches `PlayerActivity`: `HistoryScreen.tsx:99`, `fileService.ts:58`,
      `useHomeScreen.ts:187`, `useHomeScreen.ts:366`, `useSearchScreen.ts:143`,
      `useOpenWithResume.ts:118`, `useResumeAwarePlayerActivity.ts:70`, `useQueueSync.ts:107`,
      `useBookmarkToggle.ts:135`. (`QueueScreen.ts:197` fixed in `2e85a4d`.)
- [ ] `openPlaylist` bypasses the app seam (`C-17`); `useQueueSync` phantom `uri: ''` + hardcoded lane
- [ ] Dead code: `AudioLyricsView` (525 lines, 0 call sites), `AudioVisualizer` (143, 0),
      13 x `textContent.ts` (**4 real import sites** - an earlier "0" was wrong),
      `handleViewFullLyrics` lie. `NowPlayingScreen` is **live**, not a null stub.
- [ ] Lib: `enterPip` arity - Kotlin params nullable vs `NativeMpvPlayer.ts:293` non-nullable
- [ ] Jest worker force-exit flake: `[checkpoint] resume thumbnail capture failed Error: no decoder`
- [ ] `useTransport.ts` duplicate `setVolume` at `:223` / `:260`; third path at `AudioPlayer.tsx:339`
- [ ] PiP, Next/Prev with a real playlist, Bluetooth - never device-verified
- [ ] Argent 0.25.0 -> 0.27.0 - notice surfaced, **not applied**, awaiting consent
