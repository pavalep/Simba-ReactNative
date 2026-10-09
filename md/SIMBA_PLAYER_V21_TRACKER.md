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

### F1 — `setVideoBounds` on `MpvRenderView` — NOT STARTED

Lib repo. One new method wrapping `FrameLayout.LayoutParams`.

- [ ] `@ReactMethod fun setVideoBounds(x: Int, y: Int, w: Int, h: Int)` on `MpvBridgeModule`
- [ ] Mutates the existing `MpvRenderView` layout params — **must not** `removeView`/`addView`
      (that destroys the Surface)
- [ ] Rejects non-positive w/h **loudly** (log + no-op), never silently
- [ ] Hides/shows via `View.GONE` for audio, matching `PlayerActivity.kt:496-498`
- [ ] `MpvPlayerModule.ts` web fallback renders `null`, not a fake no-op
- [ ] `src/types/player.ts` — `PlayerCommands` gains the method
- [ ] Test: bounds are forwarded verbatim; **mutation check** — mutating to `MATCH_PARENT`
      fails
- [ ] Gates: lib `tsc`, lib `jest`, `compileDebugKotlin`
- [ ] Cut `v1.13.3`, annotated tag, push, wait for Actions, `npm install` in app

**Why this method is the whole trick:** see spec §3. `LayoutParams` change ≠ surface
destruction. THEOPLAYER needed a native re-parenting library for this; a layout-param
mutation needs one method.

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

## Carried forward

- [ ] `C-07` recents/bookmarks artwork — **not started**
- [ ] `C-16` store-version migration for persisted mis-tagged rows — **not started**
- [ ] Video seek bar shows *"Live stream — not seekable"* and is disabled while
      "Remaining 1:35:48" is known — `TransportBar.tsx:320` gates on `state.seekable`;
      **the derivation of `TransportState.seekable` in `useTransport.ts` was never located.**
      Two different duration sources are in play (`getDuration result=-10 duration=0.0`).
- [ ] Jest worker force-exit flake: `[checkpoint] resume thumbnail capture failed Error: no decoder`
- [ ] PiP, Next/Prev with a real playlist, Bluetooth — never device-verified
- [ ] Argent 0.25.0 → 0.27.0 — notice surfaced, **not applied**, awaiting consent
- [ ] `useTransport.ts` duplicate `setVolume` declaration at `:223` / `:260`