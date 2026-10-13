# SIMBA Player V21 — Single-Activity Specification

**Status:** APPROVED (user authorised the major refactor, 2026-10-09)
**Supersedes:** the two-Activity layout introduced in Player V12 (`PlayerActivity`)
**Companion tracker:** `SIMBA_PLAYER_V21_TRACKER.md`
**Predecessors:** `SIMBA_PLAYER_V20_JUGAAD_TRACKER.md`, `SIMBA_PLAYER_V20_JUGAAD_AUDIT.md`

---

## 1. The decision

**One Activity. `MainActivity`. PiP and the in-app mini player both live on it.**

Video stops launching `PlayerActivity`. The mpv surface, the React chrome, the mini
player and the PiP window all live in the same window. `MediaPlaybackService` remains
the background-playback owner — that part is already correct and does not change.

### 1.1 Why

Our own V11 post-mortem, in the manifest (`android/app/src/main/AndroidManifest.xml:104-106`):

> `supportsPictureInPicture` + `resizeableActivity` are mandatory for Android 12+ PiP.
> **Missing `resizeableActivity` in V11 was a root cause of the PiP black-screen bug.**

`PlayerActivity.kt:29-51` blames the SurfaceView *nesting* for the same black screen.
**That attribution is wrong** and is the single most expensive misdiagnosis in this
module's history: it is why a second Activity exists at all, and therefore the root of
every two-window defect since.

`MainActivity` already has the two manifest attributes that V11 was missing:

| Attribute | MainActivity | PlayerActivity |
|---|---|---|
| `resizeableActivity="true"` | ✅ `:73` | ✅ `:118` |
| Wide `configChanges` (`orientation\|screenLayout\|screenSize\|smallestScreenSize`…) | ✅ `:70` | ✅ `:115` |
| `supportsPictureInPicture="true"` | ❌ **missing** | ✅ `:117` |

**The entire PiP migration is one attribute on `MainActivity`.**

### 1.2 The constraint that makes this the only option

A `SurfaceView`'s Surface belongs to its window. **A SurfaceView cannot be moved
between windows.** Keeping `PlayerActivity` therefore makes an in-app React Native mini
player *impossible* for video: back would have to finish `PlayerActivity`, and the video
would either vanish or require keeping an invisible second window alive — which is the
thing we are removing.

So this is not "cleaner would be nicer". Two Activities **cannot** deliver the
mini-player behaviour that YouTube and Plex ship. The refactor is forced.

### 1.3 Research basis

| Source | Behaviour | Citation |
|---|---|---|
| YouTube (main app) | Back from video → **minimise** to in-app Miniplayer, playback continues | https://support.google.com/youtube/answer/9162927 |
| Plex | Back from video → **minimise** to mini player (top-right), playback continues | https://support.plex.tv/articles/navigating-the-big-screen-apps/ |
| Netflix | Back from video → **exit the movie**, no in-app mini player | https://help.netflix.com/en/node/23939 |
| Android (PiP guide) | "Your app can move a video into PiP mode when the user navigates back from the video to browse other content" | https://developer.android.com/design/ui/mobile/guides/home-screen/picture-in-picture |
| Android 16 / predictive back | Predictive back treats back as *finish this Activity*, killing back→PiP. Mitigation: `android:enableOnBackInvokedCallback="false"` on the PiP Activity | https://www.forasoft.com/blog/article/picture-in-picture-on-android-tutorial-527 |
| Media3 (official) | ONE Activity for UI + ONE `MediaSessionService` for the player. Our `PlayerActivity` is the extra element | https://developer.android.com/media/media3/session/background-playback |
| THEOPLAYER (RN) | A "separate player screen" causes "recreating (remounting) the player, causing a visual interruption in playback"; the inline/portal approach avoids it | https://github.com/THEOplayer/react-native-theoplayer/blob/develop/doc/fullscreen.md |
| expo-video (RN) | `VideoPlayer` (logic) / `VideoView` (presentation) split "mirrors native media handling… aligning with Android's ExoPlayer/PlayerView" | https://swmansion.com/blog/the-future-of-video-in-react-native-moving-from-expo-av-to-expo-video-6f4f78e51196/ |

**YouTube and Netflix genuinely diverge.** The differentiator is product shape:
Netflix is browse-once-then-watch; YouTube and Plex are libraries you keep browsing.
SIMBA is a library you keep browsing → **YouTube/Plex model.**

**Miniplayer ≠ PiP.** YouTube states this explicitly and treats them as separate
features. Miniplayer = still inside the app. PiP = over other apps. We ship both, with
different triggers.

---

## 2. Target architecture

```
┌─ MainActivity  (single window, supportsPictureInPicture="true") ─┐
│                                                                    │
│  android.R.id.content (FrameLayout)                               │
│   ├── [0] MpvRenderView (SurfaceView)   ← mpv surface             │
│   │         LayoutParams = MATCH_PARENT  (expanded)               │
│   │         LayoutParams = mini rect   (minimised)   ← V21       │
│   └── [1] ReactRootView (transparent while video is up)          │
│            ├── Fullscreen video route                             │
│            └── App shell                                          │
│                 └── MiniPlayer  (audio AND video — one component) │
└────────────────────────────────────────────────────────────────────┘
            │
            ▼
   MediaPlaybackService  (owns MediaSessionCompat + engine lifecycle)
            │
            ▼
   PlaybackHost (process-global mpv handle)
```

**Ownership after V21**

| Thing | Owner | Today |
|---|---|---|
| mpv engine handle | `PlaybackHost` (process-global) | same |
| MediaSession + foreground lifecycle | `MediaPlaybackService` | same (V20 Phase B) |
| Full teardown | **one** path | duplicated in `PlayerActivity` + service |
| React tree | **one** root | two roots of `SimbaPlayer` |
| Back from video | **one** handler | `PlayerActivity.onBackPressed` + JS `BackHandler`, disagreeing |
| PiP | `MainActivity` | `PlayerActivity` only |
| Mini player | **one** component, two lanes | `AudioMiniBar` only; no video equivalent |

---

## 3. The mechanism — no re-parenting, no remount

This is the part that makes V21 cheap.

`PlayerActivity.kt:463-487` mounts the surface like this:

```kotlin
val rootView = findViewById<ViewGroup>(android.R.id.content)
val renderView = MpvRenderView(this).apply {
  layoutParams = FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT)
}
rootView.addView(renderView, 0)
```

Those are **plain `FrameLayout.LayoutParams` on a view already sitting in a
`FrameLayout`.** Going fullscreen → mini-rect is a `LayoutParams` mutation:

* **not** `removeView`/`addView` → the Surface is **never destroyed**
* **not** a window change → no re-parenting library needed (THEOPLAYER needed one; we don't)
* mpv never re-attaches → no black frame, no `onSurfaceDestroyed`/`onSurfaceCreated` churn

Because a `SurfaceView` with default z-order composites **below** the window, shrinking
its rect to the mini-player bounds means the video appears *only* there while the React
tree draws normally everywhere else. This is exactly what the audio mini bar already
does — `VideoPlayer.tsx:439` describes it: *"the native `MpvRenderView` shows through
from beneath."*

**One new lib method:** `setVideoBounds(x, y, w, h)` wrapping `FrameLayout.LayoutParams`.

### 3.1 Do NOT use TextureView as a shortcut

`MpvRenderView.kt:19-35` records the SurfaceView-vs-TextureView investigation:
TextureView ties rendering to the activity's view-tree draw pass and goes stale in PiP.
Keep `SurfaceView`.

---

## 4. Behaviour contract

| Trigger | Audio | Video |
|---|---|---|
| Play | expand fullscreen audio player | expand fullscreen video |
| **Back / header close-less "minimise"** | minimise to MiniPlayer | **minimise to MiniPlayer** |
| MiniPlayer **X** | full teardown | full teardown |
| MiniPlayer tap / expand | restore | restore |
| **Home gesture** | keep playing (service) | **enter PiP** (`setAutoEnterEnabled(true)`, API 31+) |
| PiP close | n/a | **full teardown** |
| App backgrounded, no PiP | keep playing (service) | keep playing (service) |

Every verb has exactly one handler. No verb has two disagreeing handlers.

### 4.1 Teardown is native, never JS-dependent

`PlayerActivity.onBackPressed` in **lib 1.13.2** (commit `7793db3`) established the rule:
teardown runs natively via `PlaybackHost.handle() → MPVLib.nativeStop`, then
`MediaPlaybackService.ACTION_STOP`, then finish. Delegating teardown to JS would make the
player un-closable whenever the bundle is unhealthy — a JS crash would strand a playing
session with no window and no working dismiss.

`MainActivity` inherits this rule verbatim. The JS `BackHandler` stays alongside it
because predictive back (API 33+) never calls `onBackPressed`.

---

## 5. Migration phases

Each phase is independently shippable and independently revertible.

| # | Phase | Repo | Gate | Status (2026-10-14) |
|---|---|---|---|---|
| **F0** | Back-press teardown native | lib `1.13.2` | ✅ shipped | `CODE`, device proof outstanding |
| **F1** | `setVideoBounds` on `MpvRenderView` | lib | `compileDebugKotlin` + lib jest | ✅ shipped (`2e6f03d`) |
| **F2** | Surface + PiP lifecycle move to `MainActivity` | lib + app manifest | Kotlin + `tsc`/eslint/jest + **device PiP proof** | `CODE` shipped (F2a–e); **device proof outstanding** |
| **F3** | Video opens in-window | app | gates + device: play, PiP, back, rotate | ✅ `CODE` shipped (`756d372`); device pending |
| **F4** | One `MiniPlayer`, both lanes | app | gates + device: audio→video→audio handoff | ✅ `CODE` shipped (`e66b012` + lib `344d29c` / npm **1.13.8**); device pending |
| **F5** | Delete `PlayerActivity`, second React root, duplicated teardown | lib + app | gates + **full device matrix** | **in progress** — see §5.2 |

### 5.1 Rollback — **CORRECTED, the flag no longer exists**

This section previously said: *"A single flag selects video launch path (`PlayerActivity` vs
in-app route). If F2/F3 produce a black screen that cannot be diagnosed in one session, flip the
flag."*

**That flag was never implemented, and the path it would have switched no longer exists.** F3
changed the seam so that `bridge.openPlayer` is never called for video, and F4 removed the `X` that
made an Activity-backed video dock reachable. There is no runtime toggle to flip, and reverting F5
means a code revert plus a lib release, not a setting.

**What replaces it, per step:**

| Step | How to roll back |
|---|---|
| F3, F4 | Code revert in the app repo. No native change, no reinstall — nothing to re-link. |
| **F5 A1** (route `openPlaylist` through the seam) | Code revert. Pure app change. |
| **F5 A2** (delete `PlayerActivity`, lib release) | **No in-app rollback.** Requires reverting the lib to `1.13.8`, a reinstall, and an app revert. This is the irreversible step, and it is why A1–A3 should land first. |

The V11 rule still stands unchanged and still outranks every convenience below it: do **not** fix a
black screen by adding an opaque background over the surface. That was the original defect.

### 5.2 F5 execution order — **C-17 is a blocker, not cleanup**

D-10 (`openPlaylist` seam bypass) was filed as cleanup. It is not. Traced 2026-10-13:

```
app facade openPlaylist
  → lib useOpenPlaylist
      → lib usePlayerActivity().openPlayer      ← NOT the app seam
          → type 'audio' → startAudioPlayback   (no Activity)
          → type 'video' → bridge.openPlayer    → startActivity(PlayerActivity)
```

All three current call sites (`useLibraryScreen.ts:250,267`, `useAlbumScreen.ts:107,115,121`,
`useArtistScreen.ts:112,118`) pass `{type: 'audio'}`, so the video branch is **dormant today** —
`bridge.openPlayer` has no live caller after F3. But `OpenPlaylistOptions.type` **permits `'video'`**
and defaults to `'audio'`, so one video-playlist call restores the second window that this entire
refactor exists to remove.

Therefore F5 runs in this order, and the order is load-bearing:

| Step | Change | Repo |
|---|---|---|
| **A1** | Route `openPlaylist` through the app seam — last live path to `PlayerActivity` closes | lib + app |
| **A2** | Delete `PlayerActivity`, `useIsPlayerActivity`, `isCurrentActivityPlayer`/`currentActivityIsPlayer`, the `useLaunchParams` activity guard, and `bridge.openPlayer`. Release + install + verify absent in `node_modules`. | lib |
| **A3** | App de-plumbing: drop `useIsPlayerActivity`, the `{isPlayerActivity ? null : <AppContent />}` ternary, `PlayerHostProvider`, `playerHost.tsx`, `EXTRA_IS_PLAYER_ACTIVITY`; fix `MainActivity.onBackPressed` | app |
| **A4** | Re-verify Recently Played with one root and one `PlayerProvider` — its structural cause is gone | app |

---

## 6. What gets deleted (the point of the refactor)

Every item below exists *only* because there are two Activities. Deleting them is
success, not scope creep.

| # | Item | Location | Why it existed |
|---|---|---|---|
| D-1 | `PlayerActivity` class | lib | second window |
| D-2 | `EXTRA_IS_PLAYER_ACTIVITY` launch option | `PlayerActivity.kt:72` | telling JS which root it is |
| D-3 | `MAIN_COMPONENT_NAME = "SimbaPlayer"` reuse | `PlayerActivity.kt:64` | second root of same tree |
| D-4 | Second `ReactRootView` | runtime | the AudioChrome redbox |
| D-5 | Duplicated teardown in `PlayerActivity.onDestroy` | lib | drifted from service's `handleStop()` |
| D-6 | `onBackPressed` override | lib | native back never reached JS |
| D-7 | `AudioChrome` `streamType` gate | app `b52d462` | audio chrome drawn over video because roots disagreed |
| D-8 | Lane-inference backstops | `HistoryScreen.tsx:99`, `fileService.ts:58`, `QueueScreen.tsx:197`, `useHomeScreen.ts:187` | guessing the lane when the window choice already encoded it |
| D-9 | `useQueueSync` hardcoded audio lane + phantom `uri: ''` | `useQueueSync.ts:101-108` | queue had no lane of its own |
| D-10 | `openPlaylist` seam bypass | `C-17` | playlist launch had no session/lane. **BLOCKER for D-1** — it is the last live path to `PlayerActivity`; see §5.2 |

**D-10 is ordered before D-1, not after it.** Deleting `PlayerActivity` while `openPlaylist` still
routes through the lib's own `usePlayerActivity` leaves a type-checked, compiler-clean call that
throws `ActivityNotFoundException` on device — the same shape as the P0 `setClassName` landmine.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| V11 PiP black screen recurs on `MainActivity` | The V11 root cause was a missing `resizeableActivity`, which `MainActivity` already has. Second half of the V11 fix — transparent React root — must be implemented, not skipped. Device-verify PiP as F2's exit gate. |
| RN root opaque covers the surface | React root background must be transparent while video is presented. This is the explicit V11 failure mode. |
| Predictive back bypasses `onBackPressed` | Keep the JS `BackHandler`. Decide `enableOnBackInvokedCallback` for `MainActivity` in F2 — default is to keep predictive back **on** and make the JS path correct. |
| `PlayerActivity` deletion breaks deep links / `open with` | `MainActivity` already carries the shared-file intent filters (`AndroidManifest.xml:75-76`). `openPlaylist` is the real exposure and is now ordered **before** the deletion (§5.2). |
| Surface rect stale on rotation / PiP resize | **RESOLVED in F4.** The expanded path needed nothing — `fillBounds()` sets `MATCH_PARENT` and `MainActivity` declares `configChanges="…\|orientation\|screenLayout\|screenSize"`, so the Activity is not recreated. The minimised path uses explicit pixels and re-measures on the **bar's** `onLayout`, not the slot's (a fixed-size slot's layout does not change on rotation, so a slot-level handler would never fire). Mutation-checked. |
| `openPlaylist({type:'video'})` silently restores the second window | Dormant today, permitted by the type. Closed by A1 before `PlayerActivity` is deleted (§5.2). |

---

## 8. Definition of Done

- [ ] `MainActivity` is the only Activity that renders media
- [ ] `PlayerActivity` deleted from lib and from the app manifest
- [ ] Exactly one `ReactRootView` in the process
- [ ] Exactly one teardown path; no `PlayerActivity.onDestroy` copy
- [ ] Back from video minimises to MiniPlayer; playback continues
- [ ] MiniPlayer serves audio **and** video from one component
- [ ] MiniPlayer X tears down engine + service + notification
- [ ] Home gesture enters PiP on video; PiP close tears down
- [ ] Rotation in fullscreen and in PiP keeps playing
- [ ] `npx tsc --noEmit`, `npx eslint . --ext .ts,.tsx --max-warnings 0`, `npx jest` green
- [ ] `gradlew compileDebugKotlin` green
- [ ] All of §6 deleted, each row verified absent — not "probably gone"