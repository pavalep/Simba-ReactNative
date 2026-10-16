# SIMBA V22 — Device Findings (2026-10-15) + React Native Architecture Brief

> **Date:** 2026-10-15 · **Session type:** first real device verification of the
> single-Activity build · **Device:** `emulator-5554`, AVD `Medium_Phone`,
> `sdk_gphone16k_x86_64`, Android SDK 37 (API 37), x86_64
> **Build:** `com.simba.player` debug, JS served from Metro (`10.0.2.2:8081`)
> · **App HEAD at session start:** `10f2c81`
> **Verdict:** one P0 found and fixed, two further P0/P1 found and left open.
> **Emulator caveat:** x86_64 emulator GPU. Anything video-render related is
> *suspect until reproduced on physical hardware.*

> ⚠️ **Partially superseded 2026-10-16.** §4.2's `TextureView` recommendation
> was wrong and is withdrawn, and §4.2's carried-forward item 12 is replaced.
> Read **`SIMBA_V22_RN_MEDIA_MODULE_INTEGRATION_RESEARCH.md`** for the corrected
> architecture. §4.2 has been edited in place to point there; the device
> findings in §1–§3 and §5 onward are unaffected.

---

## 1. Why this document exists

The V21 device-proof template (`SIMBA_V21_DEVICE_PROOF.md`) was written for a
Pixel 7 / Android 14 and still describes `PlayerActivity` — an Activity that no
longer exists. It could not be used as-is.

More importantly, this session produced a finding that changes how the player
architecture should be judged, so it needed its own record rather than a row in
someone else's checklist.

---

## 2. Fixed this session — P0: video was completely invisible

### Symptom

Tapping a movie did nothing visible. The player was fully live: the chrome was
mounted and laid out, the accessibility tree showed the header, transport,
volume, repeat and PiP controls, and elapsed time advanced (0:00 → 0:54 →
4:36). Screenshots showed **only the Movies grid**.

### Root cause

The video picture is a native `SurfaceView`. `PlayerSurface.mount()` inserts it
at `android.R.id.content` index 0 — **beneath the entire React root**
(`src/infrastructure/player/useVideoSurface.ts:104` states this outright).

So every React view composites *above* the video. "Video is visible" therefore
requires that **nothing opaque paints above it**.

That guard existed and was removed. `ActivityShell`'s own docstring
(`App.tsx:245-249`) records the rule:

> Navigation and screens … must not render in `PlayerActivity`:
> `AppContent` paints an opaque screen background, which would cover the native
> `MpvRenderView` that sits beneath the React root along with the chrome on
> top of it.

The two-Activity design enforced it with `isPlayerActivity ? null :
<AppContent />`. **V21 F5 deleted the flag and deleted that ternary with it**,
on the reasoning recorded in `App.tsx`: *"There is one tree, and the navigator
belongs in it."* That is true about **mounting** and false about **painting**.
The failure mode was named in `MainActivity.kt:81-84` as the V11 bug —
*"the V11 'opaque React root covers the video' failure is prevented by
construction"* — and it is prevented only while the surface is GONE at 0x0,
which is how it shipped.

### Compounding error: a comment that asserted the opposite of the rule

`App.tsx:493-495` claimed:

> it is rendered FIRST so it stacks ABOVE AppContent in z-order (later siblings
> render on top in RN)

Rendered **first** stacks **below** — the sentence contradicted the rule it
cited. It survived because in the two-Activity design `VideoPlayer` and
`AppContent` lived in different **windows**, where sibling order means nothing.
It was never re-examined when they became siblings in one window.

### Fix

New `src/app/BrowsingStack.tsx`, wired in `ActivityShell` with
`hidden={isExpanded}`.

- **Blanks, does not unmount.** Unmounting destroys navigator state: back out
  of a fullscreen video would land on the app's initial route instead of the
  screen you launched from. A fullscreen video is a **mode of the window**, not
  a place in the navigation stack.
- **`opacity: 0` AND `pointerEvents: 'none'`.** Alpha alone hides pixels but the
  view still eats touches, so a blanked-but-touchable stack would swallow the
  tap that toggles the chrome.

### Verified on device

| Step | Result |
|---|---|
| Launch a movie | Chrome paints; browsing stack correctly hidden |
| Elapsed | Advances 0:00 → 4:36 (engine live throughout) |
| Header back button | Minimises to the mini dock |
| Mini state | Movies grid **fully painted again** — round trip holds |

### Gates

- `npx tsc --noEmit` → 0
- `npx eslint . --ext .ts,.tsx --max-warnings 0` → 0
- `npx jest` → **89 suites / 1107 passed / 1 todo** (baseline was
  88 / 1103 / 1 todo — exactly +1 suite, +4 tests, no regressions)
- 4 new tests in `__tests__/app/BrowsingStack.test.tsx`; 3 mutants killed **by
  the intended assertion** (drop `opacity` → 1 fail; drop `pointerEvents` →
  3 fail; blank-by-unmounting → 2 fail)

### ⚠️ Trap recorded in code

**Do not give `VideoPlayer` a `zIndex`, and do not move it below
`BrowsingStack`.** Its overlay is deliberately *transparent* so the native
surface shows through. Raising it would put the controls over the browsing
screens instead of over the video — which is the original bug wearing a
different hat.

### Not committed

Working tree holds `App.tsx`, `src/app/BrowsingStack.tsx`,
`__tests__/app/`. Awaiting review before branching.

---

## 3. Open findings

### P0 — hardware back is completely dead, app-wide

| Evidence | |
|---|---|
| Hardware back in expanded player (×2) | nothing |
| Hardware back on Movies screen | nothing — did **not** pop to Home |
| In-app back chevrons (Movies, Podcast Details, video header) | all work |

**Cause — CORRECTED 2026-10-16. The first explanation recorded here was wrong.**

The original claim was: "`targetSdk 36` enables predictive back, and React
Native registers no `OnBackInvokedCallback`, therefore
`MainActivity.onBackPressed()` is never invoked." **That is false.** RN 0.86
*does* handle predictive back — `ReactActivity.java:29-39` registers its own
`OnBackPressedCallback` and re-enters `onBackPressed()` manually, with the
comment *"Due to enforced predictive back on targetSdk 36, `onBackPressed()`
is disabled by default. Using a workaround to trigger it manually."* So
`MainActivity.onBackPressed()` **is** reached.

Measured on device 2026-10-16 (`adb shell input keyevent 4` +
`dumpsys window`):

- back on **Home** (root): foreground stayed `MainActivity`, same pid — the
  activity did not finish.
- back on **Movies**: focus stayed `MainActivity`, screen did **not** pop.

Two live candidates remain, both inside `MainActivity.onBackPressed()`
(`MainActivity.kt:219-235`):

1. **`dispatchKeyEvent` swallows it.** The method dispatches a synthetic
   `KEYCODE_BACK` to `window.decorView` and does `if (handled) return`. RN's
   `ReactModalHostView` installs a key listener that returns **`true`** for
   `KEYCODE_BACK` (`ReactModalHostView.kt:307-316`), and so does the LogBox
   surface (`LogBoxDialogSurfaceDelegate.kt:69-75`). If any RN `Modal` or the
   LogBox surface is mounted, `handled` is `true` and the press dies here —
   JS `BackHandler` is never even notified. Dismissing the LogBox banner
   did **not** restore back, so a plain LogBox notification is not the
   culprit, but a mounted Modal remains a candidate.
2. **RN swallows it at the root.** `ReactHostImpl.onBackPressed()`
   (`ReactHostImpl.kt:356-365`) emits `hardwareBackPress` and returns `true`
   **unconditionally** — regardless of whether JS consumed it. `ReactActivity`
   then skips its `super.onBackPressed()`, so the activity never finishes.
   This explains the root-screen case, but **not** the Movies case, where
   React Navigation should pop.

**Next step.** Do not write a fix from this note. Instrument
`onBackPressed()` with `Log.i` on each branch (PiP / dispatchKeyEvent result /
before+after `super`), rebuild, and read logcat. Two static readings have
already produced one wrong answer; a third would be guesswork.

Note the design smell worth fixing either way: the `dispatchKeyEvent`
`if (handled) return` guard makes "any mounted Modal silently kills back for
the whole app" true by construction. That is a hazard independent of
whichever branch turns out to be live.

Impact: the entire back affordance of the app is inert on Android 13+.

**Next step.** Register an `OnBackInvokedCallback` on API 33+ routing into the
existing logic; keep `onBackPressed()` for API < 33. Requires native change +
APK rebuild (~7 min) + reinstall.

### P1 — video picture is black

Chrome paints, playback advances, `fillVideoBounds()` and
`setSurfaceVisible(true)` both returned true (otherwise the chrome would not
have mounted — `videoSurfacePresented` gates it). **No frames reach the
surface.**

Audio plays correctly on the same engine, so the engine is healthy. That points
at video decode/render specifically, and this is an x86_64 emulator with
SwiftShader.

**Next step — do this before changing any rendering code.** Control test:
push `.scratch-test-video.mp4` (1102 KB, MDN CC0 flower.mp4) to the device and
open it via the "Play media file" FAB.

- Local file **renders** → remote stream problem (feed URLs / codec).
- Local file **also black** → render path; then determine whether libmpv's EGL
  context fails under emulator SwiftShader before concluding the app is at
  fault. **Do not patch the app for an emulator artefact.**

### P1 — duration is never reported, on BOTH lanes

| Lane | Observed |
|---|---|
| Video | `Remaining time unknown --:--`; first read `SeekBar "Live stream — not seekable" [disabled]` |
| Audio | `--:--`, a **false `LIVE` badge**, seek bar disabled, **previous + next both greyed out** |

The podcast feed itself knows the episode is 55 min. So this is a shared
transport defect, not a video one, and it is not a startup-timing artefact —
the video seek bar did eventually flip to `"Playback position"`, but audio never
did, and remaining time never populated on either.

Consequence: **next/previous track are unusable**, and the seek bar is inert.

**Next step.** Find where `--:--`, the `LIVE` badge and the seek bar's disabled
state derive from, and whether the lib's duration property is ever read.

### P2 — cosmetic / data

- Titles render with literal quotes: `"El Ciclo ( 1964)"` — feed data.
- Stray `2×` speed chip plus `☀ 100%` / `♪ 100%` chips float mid-frame in the
  video chrome.
- FAB overlaps the Music card — coordinates `(0.825, 0.803, 0.136, 0.061)` vs
  `(0.749, 0.682, 0.251, 0.175)`; confirmed on screen three times.
- LogBox shows "Open debugger to view warnings" but the content is unreadable:
  CDP `Runtime.enable` times out (`runtime_unresponsive`). Do not retry in a
  loop; restart the app and reconnect once.

---

## 4. Architecture brief — the React Native side

> This is the item flagged as missing. Read before writing any more player
> code, because two of the three open defects are downstream of it.

### 4.1 The real problem

The picture is a `SurfaceView` composited **beneath the whole React root**.
That creates one **global** invariant:

> **While the video is expanded, nothing opaque may paint above it.**

It is not local to the player. It constrains every screen, every overlay, every
future feature. And it is enforced by **nothing**:

- not by the type system,
- not by any unit test — all 1103 passed while video was invisible,
- not by lint,
- not by a comment anyone could trust (the one comment describing it was wrong).

It has now broken twice: **V11**, and again in **V21 F5**.

`BrowsingStack` is correct, but it is a **convention**, not a constraint. The
overlay stack above the surface is currently a free-for-all:

| z-order | Component |
|---|---|
| 9999 | `Toast` |
| 999 | `LoadingOverlay` |
| 100 | `OfflineBanner` |
| 90 | `OperationProgress` |
| 40 | `AudioPlayer` |
| 30 | `MiniPlayer` |
| 16 | `BufferingBar` |
| **— (0)** | **video chrome — no `zIndex` at all** |
| *below window* | native video surface |

Nothing declares that ladder, and the video chrome — the thing the whole
architecture exists to display — is the one component with no entry.

### 4.2 Two routes

**Route A — make the picture a first-class RN view (the real answer).**

Add a native view component in the **lib** wrapping the existing
`MpvRenderView`, export it, and render it inside `VideoPlayer`'s layout where
the video belongs. Geometry becomes React layout's job, z-order becomes
ordinary sibling order, and `BrowsingStack` becomes unnecessary.

**The hard part, stated honestly:** a `SurfaceView` composites behind the window,
so anything the React root paints over its rect wins. That much is true.

**But it is not a reason to reject Route A on `SurfaceView`.** See
`SIMBA_V22_RN_MEDIA_MODULE_INTEGRATION_RESEARCH.md` §2.6/§6: `react-native-video`
v6 puts a `SurfaceView` inside an RN-managed `ViewGroup` and ships working PiP.
The surface is bounded to the view's rect; React views outside that rect are
unaffected. What breaks is the surface being a **sibling of the React root**
rather than a descendant — which is precisely the bug `BrowsingStack` was
patching over.

~~**The clean destination is `TextureView`**~~ — **withdrawn.** Two independent
sources contradict it:

- The lib's own `MpvRenderView.kt` records testing TextureView and rejecting it:
  on PiP entry HWUI suspends draw passes for the paused Activity, the
  `TextureView` display layer goes stale, and **"PiP shows black."**
- react-native-video's surface-type switch is a literal
  `// TODO: Implement proper surface type switching if needed`.

TextureView survives only as a last-resort fallback if `SurfaceView` is
demonstrably unusable in-tree on the target device — at the cost of PiP.

PiP is not a reparenting problem under Route A: the surface already belongs to
the window that PiP captures.

**Route B — keep the SurfaceView, but make the invariant owned and typed.**

Interim hardening, no lib release needed:

1. Publish the z-order ladder above as one authoritative table.
2. Give the video chrome an explicit band rather than leaving it at 0.
3. Introduce a single `VideoBackdrop` concept so "may paint above the video"
   becomes a named decision at each call site rather than an accident.

**Recommendation:** land Route B now as the interim; make Route A the target on
`SurfaceView`, as a **lib-first wave**. Route A requires a lib release, so per
project rule it must go commit → tag → publish → `npm install`, not a local
tarball. Full design in `SIMBA_V22_RN_MEDIA_MODULE_INTEGRATION_RESEARCH.md`.

### 4.3 Deep-scan scope (the sweep to run before more player work)

1. **Every view rendered above the surface while expanded** — enumerate,
   and give each an intentional z-order and an intentional visibility.
2. **Presentation state machine** — every reader/writer of
   `videoSurfacePresented`, `videoPresentation`, `pipActive`. Confirm one
   writer per fact. `useVideoSurface` claims to be the sole writer; verify.
3. **Transport/duration path** — root-cause §3 P1. This is a lib↔app contract
   question, so scope must cross into `react-native-media-player`.
4. **Z-order ladder** — turn §4.1's table into a tested, documented contract.
5. **Native surface lifecycle** — mount/unmount, PiP reparenting, rotation,
   teardown, and the mini-rect path (`setVideoBounds` with a measured rect).
6. **A11y correctness** — `Image "Video" [clickable]` is exposed while the
   picture is a native surface underneath; decide whether that is correct.

---

## 5. Test matrix status

| Flow | Status |
|---|---|
| Home render, greeting, dividers | ✅ verified |
| Weather | ✅ resolves (earlier "unavailable" was transient) |
| Movies catalogue → detail | ✅ verified |
| Video launch → chrome paints | ✅ fixed this session |
| Video **picture** | ❌ black — open P1 |
| Header back → mini dock | ✅ verified |
| Mini dock close (X) | ✅ verified |
| Audio: Podcasts → detail → play | ✅ full player renders and plays |
| Audio duration / seek / prev-next | ❌ open P1 |
| Hardware back, all levels | ❌ dead — open P0 |
| PiP enter/exit | ⬜ not started |
| Dock rotation | ⬜ not started |
| audio → video → audio | ⬜ not started |
| Next/prev with a real playlist | ⬜ blocked by P1 |
| Rotation in fullscreen | ⬜ not started |
| Physical device | ⬜ none available — emulator only |
| Bluetooth output | ⬜ emulator-excluded (no hardware) |
| OEM PiP quirks | ⬜ unverifiable on emulator |

---

## 6. Carried forward

1. Hardware back — `OnBackInvokedCallback` on API 33+.
2. Rebuild + reinstall APK; verify back at every level.
3. Video black — local `.scratch-test-video.mp4` control test via the FAB.
4. If local is also black, determine libmpv EGL behaviour under SwiftShader
   before touching rendering code.
5. Root-cause duration-never-reported; find the lib↔app read path.
6. Re-test prev/next once duration works.
7. LogBox warning content — blocked on CDP.
8. Title literal quotes from feed data.
9. Stray `2×` / `☀ 100%` / `♪ 100%` chips in video chrome.
10. FAB overlapping the Music card.
11. Publish the z-order ladder (Route B).
12. ~~Route A architecture spike — TextureView renderer in the lib.~~ **Withdrawn**
    — see research §6. `SurfaceView` in-tree is proven by react-native-video;
    TextureView is rejected by our own tested finding and is a TODO upstream.
    Replaced by: Route A spike — Fabric component in the lib.
13. Deep scan §4.3, items 1-6.
14. Commit the `BrowsingStack` P0 fix on a branch after review.
15. Dead code: `AudioLyricsView` (525 lines), `AudioVisualizer` (143 lines) —
    verified 0 call sites.
16. Jest force-exit flake — leaked handles, needs `--detectOpenHandles`.
17. 9 unused `textContent.ts` exports + `HistoryScreen:99` dead branch.
18. C-07 artwork + `setAutoEnterEnabled` / `setExpandedAspectRatio` / portrait
    restore.