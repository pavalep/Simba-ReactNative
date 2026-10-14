# SIMBA Player V21 — Single-Activity Tracker

**Spec:** `SIMBA_PLAYER_V21_SPECIFICATION.md`
**Started:** 2026-10-09
**Last updated:** 2026-10-14, session 9 (**F5 A2 + A3 SHIPPED** — `PlayerActivity` deleted, lib **1.14.0** published; A2 scope corrected, A2b merged in)
**Status:** F0 shipped (device proof outstanding) · F1 shipped · F2a–e `CODE` shipped · P0 shipped · C-16 root fix shipped · surface mount refactored · **F3 SHIPPED** (app `756d372`) · **F4 SHIPPED** (app `e66b012` + lib `344d29c` = npm **1.13.8**) · **F2e reclassified** (see session 7) · **F5 A1 SHIPPED** (app `2a80ba1`) · **F5 A2+A3 SHIPPED** (lib `c433ce2` + `085680f` = npm **1.14.0**) — the two-Activity architecture is gone. Device verification deferred by the user; tracked as debt, not skipped silently.
**Confidence marks:** `DEVICE` = observed on device · `CODE` = read/verified in source · `PENDING` = assumed or planned

---

## Session 7 (2026-10-14) — F3 shipped, F4 dock shipped, F2e reclassified

### What shipped

| Commit | Repo | What |
|---|---|---|
| `756d372` | app | **F3** — video launches in-window. `useVideoSurface` (single owner of surface presentation) + `useInWindowVideoLaunch`; the seam no longer calls `openWithResume` for video. `videoSurfacePresented` stored, not derived. |
| `344d29c` | lib | **F4 enabler** — `setVideoBounds` takes **window** pixels and converts to content-relative margins natively. npm **1.13.8**. |

### F2e reclassified — it was never a bug in the path it was written for

F2e asked for bounds to be re-applied on every layout pass so the surface follows rotation. Read
against the code, that premise does not hold for the fullscreen path:

- `fillBounds()` sets `MATCH_PARENT`, so Android's own layout pass keeps the surface correct across
  rotation with no help.
- `MainActivity` declares `configChanges="…|orientation|screenLayout|screenSize|smallestScreenSize"`,
  so the Activity is **not** recreated on rotation — there is no remount to survive.

So the expanded path needed nothing. The requirement became real the moment F4 introduced
`setVideoBounds` (explicit pixels, which do *not* track the parent), and it is satisfied there:

> **The dock's `onLayout`, not the slot's.** The bar is `left: 0, right: 0`, so its width changes on
> rotation. The slot is a fixed-size square whose own layout does **not** change — so a slot-level
> `onLayout` would never fire and the surface would stay at portrait coordinates.
> `__tests__/components/player/mini/MiniPlayer.test.tsx` pins this; mutation-checked (removing
> `onLayout={onBarLayout}` kills exactly that test).

### The one thing in F4 that was not obvious, and cost the most thought

`PlayerSurface.mount` adds the `MpvRenderView` at index 0 of `android.R.id.content`, and a
`SurfaceView` with default z-order is a separate SurfaceFlinger layer composited **behind** the
window. Therefore **every opaque React pixel between the camera and the video hides it**, and
reordering the view hierarchy cannot change that — the layer is behind the window either way.

That rules out the obvious design and rules out z-order games entirely: `setZOrderMediaOverlay`
would lift it, and is forbidden because PiP's VRI compositor samples the activity window and would
no longer see the video — the documented reason `MpvRenderView` keeps default z-order. A
`TextureView` would allow both and is rejected for the same reason.

So the dock is transparent and rebuilt from **three opaque plates around a transparent rectangle**,
and both the hole and the rect handed to `setVideoBounds` come from **one `measureInWindow` pass**.
That single-source property is the point: they cannot disagree, so the video cannot land beside its
own hole. Constants computed from the stylesheet would be one refactor away from drifting.

**Known cosmetic limitation:** the video thumbnail is square, because a `SurfaceView` cannot round
its own corners and a rounded frame drawn around a rectangular video would be a lie.

### F4 verb changes, and the stale reasoning that had to be corrected

Back from a video used to **stop** playback. Its docblock justified that with "W6.0 removed the mini
dock, so dismissing the Activity leaves no surface behind", citing Netflix/Plex/VLC. F4 removes that
premise. Back now minimises; stopping lives on the dock's X. Three places asserted or documented the
old contract and all three were updated rather than left to rot:

- `VideoTitleOverlay` docblock claimed it "deliberately does NOT call `setPresentation('mini')`".
- `useTransport.exitPlayer` docblock ("Why video stops rather than continuing in the background").
- `VideoPlayerChrome` back handler (and it now intercepts RN's navigation, since there is no
  window left to pop).

### Regression caught by writing the tests

`usePresentation().isExpanded` was briefly computed as its own expression rather than read off
`mode`, so PiP reported `expanded` — the PiP branch lived in `mode` only and the parallel expression
silently disagreed. Both flags are read off `mode` again. This is the W6.0 shape in miniature: two
expressions for one fact.

### Gates

- App: `tsc` 0 · `eslint --max-warnings 0` 0 · **84 suites / 1057 passed / 1 todo**.
- Lib: `tsc` 0 · **13 suites / 231 tests** · `compileDebugKotlin` BUILD SUCCESSFUL
  (compiled from the working copy via the example junction — verified in the warning paths).

### Still not device-verified

Everything above is `CODE`. PiP, the dock, next/prev with a real playlist and Bluetooth remain
unproven on hardware, and a green build was exactly what the V11 black screen had too.

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
   **AMENDED 2026-10-14 (session 7→8):** device verification has been deferred by the user, so
   rule 1 no longer blocks. The gate for each phase is now **CODE gates green + mutation-checked**,
   and the outstanding device matrix is tracked explicitly as debt rather than as a silent skip.
2. ~~**`PlayerActivity` stays in the manifest behind a flag until F5.** One flag flip must
   return the app to the working two-Activity path.~~ **OBSOLETE.** The flag was never
   implemented and the path it would switch no longer exists — F3 stopped calling
   `bridge.openPlayer` for video and F4 removed the Activity-backed dock. Rollback is now a code
   revert; for F5 **A2** specifically it also means reverting the lib and reinstalling. See
   spec §5.1.
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

### F3 — Video as an in-app route — CODE SHIPPED, device verification PENDING

- [ ] `VideoPlayer` becomes a route in the existing navigation stack — **deliberately not done.**
      It is mounted as an always-present sibling of `AppContent` and gated on
      `presentation.isExpanded`. A route would put it inside the navigator, which owns back
      navigation; as a sibling it owns the back press itself while expanded and steps aside
      otherwise. Worth revisiting if the chrome ever needs to participate in a stack transition.
- [x] `useResumeAwarePlayerActivity` seam stops calling `openPlayer` for video
- [x] Back handler: minimise, not stop — enabled by F4's dock. Before the dock existed this
      *had* to stop, because minimising to a state with no UI is worse than stopping. Mutation-
      checked: disabling the short-circuit kills exactly the 2 video tests in
      `useResumeAwarePlayerActivity.test.tsx`.
- [ ] Deep links / "open with" still reach video (`MainActivity` already has the
      shared-file intent filters at `AndroidManifest.xml:75-76`)
- [ ] **DEVICE:** play → back → home → PiP → expand → back, all sane

---

### F4 — One `MiniPlayer`, both lanes — CODE SHIPPED, device verification PENDING

- [x] `AudioMiniBar` folded into `MiniPlayer` (and deleted). The lanes differ only in the leading
      square: artwork for audio, live video for video. One set of play/pause, close and progress
      controls — no lane branch duplicating them.
- [x] `setVideoBounds` driven by the mini player's measured layout — the **bar's** `onLayout`, not
      the slot's. See session 7: a fixed-size slot's layout does not change on rotation, so a
      slot-level `onLayout` would never fire and the surface would stay at portrait coordinates.
- [x] Same component, same close verb, same teardown. `PlayerChrome` owns the switch; `AudioChrome`
      renamed because it is no longer audio-only.
- [x] MiniPlayer X: engine + service + notification, all of it (`stopPlayback` → `endSession`).
- [ ] Audio↔video handoff does not restart the engine — not built. Both lanes share one
      process-global mpv handle, so this is a device-matrix question, not a code change.
- [ ] **DEVICE:** audio→video→audio handoff; expand/collapse; X during playback; dock across rotation
- [ ] `setAutoEnterEnabled(true)` — **held deliberately.** A product-visible behaviour change that
      cannot be verified without a device.
- [ ] Portrait restore when a session ends while the app is backgrounded (still owned by F4).

---

### F5 — Delete the second Activity — IN PROGRESS

Device verification is deferred, so the old "only after F2–F4 are `DEVICE`-verified" gate is
amended: the gate is now **CODE gates green + mutation-checked**, with the device matrix tracked as
debt below.

#### ⚠ `C-17` / D-10 is a BLOCKER, not cleanup — found 2026-10-13

Traced while sizing F5:

```
app facade openPlaylist
  → lib useOpenPlaylist
      → lib usePlayerActivity().openPlayer      ← NOT the app seam
          → type 'audio' → startAudioPlayback   (no Activity)
          → type 'video' → bridge.openPlayer    → startActivity(PlayerActivity)
```

After F3 the app seam no longer calls `bridge.openPlayer` for video, so it has **no live caller** —
*except* through `openPlaylist`. All current call sites pass `{type: 'audio'}`:

- `useLibraryScreen.ts:250, :267`
- `useAlbumScreen.ts:107, :115, :121`
- `useArtistScreen.ts:112, :118`

So the video branch is dormant today — but `OpenPlaylistOptions.type` **permits `'video'`** and
defaults to `'audio'`. One video-playlist call restores the second window this whole refactor
exists to remove, and deleting `PlayerActivity` first would leave it throwing
`ActivityNotFoundException` on a green build (the same shape as the P0 `setClassName` landmine).

#### Execution order — load-bearing

- [ ] **A1 — route `openPlaylist` through the app seam.** Closes the last live path to
      `PlayerActivity`. Also gives playlists a session, a lane and an in-window video path, none of
      which they have today. Pure app change; rollback is a code revert.
- [x] **A2 — delete `PlayerActivity` from the lib + release. SCOPE CORRECTED 2026-10-14 — A2b is
      merged in.** Class, manifest entry, `useIsPlayerActivity`,
      `isCurrentActivityPlayer` / `currentActivityIsPlayer`, the `useLaunchParams` activity guard,
      `EXTRA_IS_PLAYER_ACTIVITY`, `MAIN_COMPONENT_NAME` reuse, the duplicated teardown (D-5), and
      `bridge.openPlayer` itself — **plus the whole launch-params handoff**
      (`lastLaunchParams`, `setLaunchParamsFromIntent`, `getLaunchParams`, `useLaunchParams`,
      `SimbaPlayerRoot`'s activity branch, `PlayerRoot`'s `launchParams` fallback,
      `commands.getLaunchParams`) and the two module-side contracts that only `PlayerActivity`
      consumed (`IMpvConfigProvider`, `IPipModeChangeEmitter`).

      **SHIPPED** — lib `c433ce2` + `085680f`, npm **1.14.0**, annotated tag verified
      (object `af72627` ≠ commit `085680f`). Symbols verified **absent** in `node_modules`;
      `PlayerActivity.kt` verified absent from the installed package.
      **21 files, −2729 / +379.**

      **Why the deferral was dropped:** `lastLaunchParams` is written by exactly two sites —
      `openPlayer` and `setLaunchParamsFromIntent` (called only from `PlayerActivity.onCreate`).
      A2 deletes both, so deferring the read side means shipping a public API that resolves
      `null` forever while pretending to work. No coherent half-deleted state exists.
      Full reasoning in spec §5.2.
      ⚠ **This is the irreversible step, and A3 lands in the same app commit.**
- [x] **A3 — app de-plumbing. Atomic with A2.** `App.tsx`: dropped `useIsPlayerActivity` (import,
      the `{isPlayerActivity ? null : <AppContent />}` ternary, the `RootProps.isPlayerActivity`
      prop, and the `PlayerHostProvider` wrapper). Deleted `playerHost.tsx` + its test + its barrel
      export. Deleted `EXTRA_IS_PLAYER_ACTIVITY` and the whole `createReactActivityDelegate`
      override from `MainActivity.kt` (plus 7 imports that became provably unused).
      Removed the dangling `AndroidManifest.xml` `<activity android:name="com.simba.player.PlayerActivity">`
      block. **Fixed `onBackPressed`** — it fell through to `super.onBackPressed()`, which after
      the collapse would close the app instead of minimising; it now dispatches the BACK key to
      the view hierarchy first so the JS `BackHandler` can consume it, falling through to `super`
      when nothing does. PiP still short-circuits first (a PiP window has no JS handler behind it).
      **Also newly required by A2** — all four found in the A2 trace:
      - `PlayerChrome.tsx` imported the **lib's** `useIsPlayerActivity` (not the app's `playerHost`
        copy) — a second, distinct dependency that A2 deletes. Gate removed (D-7, resolved by
        evidence: with one root it is permanently `false`).
      - `usePlaybackState.ts` likewise. Its `hasSession = isPlayerActivity || hasPlaylistEntry`
        is now just `hasPlaylistEntry`.
      - `playbackFacade.ts` destructured `getLaunchParams` and re-exposed it as
        `facade.activity.getLaunchParams`; `PlaybackActivity` interface deleted.
      - `useResumeAwarePlayerActivity.ts` carried `getLaunchParams` in the seam's surface.
      - `App.tsx:392` used `<SimbaPlayerRoot headless>` — **missed by the A2 grep, which only
        searched `src/`**. Replaced with `<AppContent />`, which is exactly equivalent: headless
        mode reduced to "render children" once launch params had no source.
- [x] **A4 — re-verify Recently Played. SHIPPED.** The structural cause is gone and the
      chain is now provably complete:

      - **One** `usePlaybackCheckpointSync` mount (`App.tsx:320`), **one** `useQueueSync`
        (`App.tsx:97`), **one** `<SimbaPlayer>` (`App.tsx:496`). Verified by grep across
        `src/` **and** the repo root.
      - The writer's inputs are real: `useTransport` sources `positionMs`/`durationMs` from
        `usePlayerProgress()` and `isPlaying` from the lib's `state.isPlaying`. Its own suite
        already pins those derivations behaviourally.
      - `addRecent` is exported (`features/recentHistory/index.ts:76`) and reaches the real
        `useRecentHistoryStore`.

      **The tracker's original claim was partly wrong, and the correction matters.** It said the
      suite "mocks `useTransport` wholesale, so it proves nothing about real transport values."
      `useTransport.test.ts` *does* pin that seam. But the writer suite mocks **both ends** —
      `useTransport` *and* `features/recentHistory` — so nothing tested the chain between them.

      **Proven, not asserted.** New `checkpointToRecentlyPlayed.integration.test.tsx` mocks
      ONLY the lib, so real `useTransport` → real writer → real `addRecent` → real store all
      run. Mutant: force `useTransport`'s `positionMs` to `0`.
      - new suite → **3 of 6 fail**
      - existing `usePlaybackCheckpointSync.test.tsx` → **15 of 15 PASS**

      So the pre-existing suite genuinely cannot see a transport that stopped reporting
      position — which is the exact shape of "Recently Played is empty and nothing errors".
      That is the regression this file now pins.

      ⚠ **Cost recorded:** the new suite pulls the whole `useTransport` graph, adding ~7 s warm
      (~30 s cold). One cold full-suite run tipped `onMediaChrome.test.tsx` over the 15 s
      `testTimeout` (41 s under load; 10 s isolated). Warm re-run is **86 suites / 1075 passed /
      1 todo**. Load-sensitive, not a regression — but it eats headroom the jest config comment
      claims exists, and the next suite added will break it again.
- [x] ~~Delete `PlayerChrome`'s `isPlayerActivity` gate (D-7)~~ — **DONE in A3, verified rather than
      assumed.** Two distinct dependencies existed: `PlayerChrome.tsx` and `usePlaybackState.ts`
      imported the **lib's** hook; `App.tsx` imported the app's own `playerHost` copy. All three
      are gone and `hasSession` is now purely the structural playlist check. **Removing the gate
      exposed a test passing for the wrong reason** — see session 9.
- [ ] Full device matrix re-run
- [ ] **Delete dead code** — re-verify each call count before deleting:
      `AudioLyricsView` (525 lines, 0 call sites), `AudioVisualizer` (143, 0),
      13 × `textContent.ts` (**4 real import sites** — the "0" in an earlier audit was wrong),
      `handleViewFullLyrics` lie.
      **`NowPlayingScreen` is NOT a stub** — an earlier audit called it a `return null`
      placeholder; it is live with 1 call site. Do not delete it.

**Every row must be verified absent.** "Probably gone" is not done.

#### Session 9 — two tests that passed for the wrong reason

A gate's removal changes what a test proves even when the test still
passes. Two cases in A3, recorded because both would have survived a
green run and taught the next reader something false.

**1. `PlayerChrome.test.tsx` — "renders nothing for a VIDEO launch".**
Its comment said the `isPlayerActivity` gate existed to stop the audio
player being drawn over MainActivity during a film. That gate is deleted.
The test still passes — because the video lane returns `null` for a
completely unrelated reason: `presentation.isMini` is false. The assertion
was green for a mechanism that no longer exists. **A comment naming a
deleted mechanism is not a comment, it is a trap.** Renamed and rewritten
to state the real branch, plus a counterpart test for the `mini` case so
the pair pins `isMini` rather than an accident.

**2. `MpvBridgeModuleTest.kt` — `emitPictureInPictureModeChanged_delegatesToCompanion`.**
Deleted, but worth noting: its own comments admitted it could not call the
instance method it was named for and settled for "no exception thrown" on
a companion path three other tests already cover. It was a comment with a
`.test.tsx` suffix.

**Also: a mutation that proves nothing.** My first mutant for the new
video-dock test appended an unreachable `return null` after the real
return — the branch still ran, so the mutant "passed" and looked like a
weak test. It was a broken mutant, not a weak test. The faithful mutant
(branch returns `null` for both arms) fails as expected. **When a mutant
survives, first ask whether the mutant was faithful.**

The earlier list is stale. `QueueScreen.tsx:197` was fixed in `2e85a4d` and must not be re-listed.
These are the live ones:

- [ ] `HistoryScreen.tsx:99`
- [ ] `fileService.ts:58`
- [ ] `useHomeScreen.ts:187`
- [ ] `useHomeScreen.ts:366`
- [ ] `useSearchScreen.tsx:143`
- [ ] `useOpenWithResume.ts:118`
- [ ] `useResumeAwarePlayerActivity.ts:70`
- [ ] `useQueueSync.ts:107` — plus the phantom `uri: ''` and the hardcoded audio lane (D-9)
- [ ] `useBookmarkToggle.ts:135`
- [ ] **NEW, surfaced by the C-17 trace:** the three `openPlaylist` call sites above bypass the
      seam entirely, so they record no lane and no `startPositionMs` today. A1 fixes all three.

#### ✅ F5 A5 — `C-17` verified, and it was NOT closed

The tracker recorded A1 as closing `C-17`. Verified 2026-10-14: **it did not.**

`useLibraryScreen.ts:250,267` and `PlaylistDetailScreen.tsx:158` do derive the lane
(`resolveStreamType(first.type)`). But the other three `openPlaylist` sites hardcoded it:

| Site | Before | After |
|---|---|---|
| `useAlbumScreen.ts:107` (`playTrack`) | `{type: 'audio'}` | `resolveStreamType(tapped.type)` |
| `useAlbumScreen.ts:115` (`playAll`) | `{type: 'audio'}` | `resolveStreamType(sortedTracks[0]!.type)` |
| `useAlbumScreen.ts:121` (`shuffleAll`) | `{type: 'audio'}` | same |
| `useArtistScreen.ts:103` (`playTrack`) | `{type: 'audio'}` | `resolveStreamType(item.type)` |
| `useArtistScreen.ts:112` (`playAll`) | `{type: 'audio'}` | `resolveStreamType(allTracks[0]!.type)` |
| `useArtistScreen.ts:118` (`shuffleAll`) | `{type: 'audio'}` | same |

**Not a hypothetical.** `useMediaStore.tracks` holds both lanes —
`fileEntriesToTracks` (`fileService.ts:691`) sets `type` from the extension
(`isScanVideoExt(ext) ? 'video' : 'audio'`) and neither hook filters by it; both select
purely on artist/album name. A music video in an artist's album folder appears in the
track list and opened the **audio** player.

The seam makes it worse than a caller bug: `usePlaylistLaunch.ts:176` is
`type: opts.type ?? 'audio'`, so omitting the field silently picks audio too.

`startPositionMs` is a separate finding — `useLibraryScreen` passes `first.resumePosition`,
but `playlistItemsToEntries` (`playerStore.ts:109`) never populates `resumePosition`, so it
is **always `undefined`**. Harmless (the seam omits null), but it is dead code that reads as
if it resumes. **Not fixed in A5** — recorded below.

#### ✅ Also fixed in A5 — unbounded re-render loop in both hooks

Both hooks built a **new array inside the zustand selector**:

```ts
const tracks = useMediaStore(s => s.tracks.filter(...).sort(...));  // new array every call
```

The selector result never compares equal, so the store could drive an unbounded re-render.
The first run of the new test died with *"Maximum update depth exceeded"* — the loop was
real, not a mock artifact. Fixed by selecting the stable array and deriving in `useMemo`.

#### New suite: `__tests__/screens/albumArtistLane.test.tsx` — 9 tests

Mocks **only** `useResumeAwarePlayerActivity` (the app's launch boundary). Above it: the
real screen hook, the real `useOpenPlaylist`, the real `orderPlaylist` (shuffle included),
and the **real `resolveStreamType`**. Stubbing `resolveStreamType` would have made every
assertion tautological.

Each video assertion is **paired with its audio counterpart** — without the pair, a fix that
always returned `'video'` would pass.

**Mutation:** hardcode `'audio'` back into all six sites →
**3 of 9 fail** (both "tapped VIDEO" cases + "play-all lane when it is a video").
The 6 that pass are the audio-lane counterparts, which is the correct outcome.

Gates: `tsc` 0, `eslint --max-warnings 0` 0, jest **87 suites / 1084 passed / 1 todo**
(was 86 / 1075).

---

## Open defects this refactor touches

| ID | Defect | Fate under V21 |
|---|---|---|
| `C-03` | Video black screen (unexplained earlier captures) | F2 device proof should settle it |
| `C-07` | Recently Played / Bookmarks have no artwork | **Independent of V21.** Blocked on one screenshot. |
| `C-16` | Persisted rows mis-tagged as audio route films to the audio player | ✅ **FIXED** `a11f6f8` — lane derived from kind + persist v2 migration |
| `C-17` | `openPlaylist` bypasses the seam | ✅ **PARTIALLY FIXED.** A1 (`2a80ba1`) routed all sites through the seam, but the lane was still hardcoded `'audio'` at 6 of 9 sites. **F5 A5** derives it everywhere. `startPositionMs` still dead at `useLibraryScreen` — see A5. |
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
18. `openPlaylist` bypassing the app seam (`C-17`) — ✅ routed in A1, lane fixed in A5
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
      `useBookmarkToggle.ts:135`. (`QueueScreen.ts:197` fixed in `2e85a4d`; the Album/Artist
      `openPlaylist` sites fixed in **A5**.)
- [ ] `useLibraryScreen.ts:252` — `startPositionMs: first.resumePosition` is **always
      `undefined`**: `playlistItemsToEntries` (`playerStore.ts:109`) never populates
      `resumePosition`. Harmless (the seam omits null) but dead — it reads as if the launch
      resumes. Found by A5, deliberately not fixed there.
- [ ] `openPlaylist` bypasses the app seam (`C-17`); `useQueueSync` phantom `uri: ''` + hardcoded lane
- [ ] Dead code: `AudioLyricsView` (525 lines, 0 call sites), `AudioVisualizer` (143, 0),
      13 x `textContent.ts` (**4 real import sites** - an earlier "0" was wrong),
      `handleViewFullLyrics` lie. `NowPlayingScreen` is **live**, not a null stub.
- [ ] Lib: `enterPip` arity - Kotlin params nullable vs `NativeMpvPlayer.ts:293` non-nullable
- [ ] Jest worker force-exit flake: `[checkpoint] resume thumbnail capture failed Error: no decoder`
- [ ] `useTransport.ts` duplicate `setVolume` at `:223` / `:260`; third path at `AudioPlayer.tsx:339`
- [ ] PiP, Next/Prev with a real playlist, Bluetooth - never device-verified
- [ ] Argent 0.25.0 -> 0.27.0 - notice surfaced, **not applied**, awaiting consent
