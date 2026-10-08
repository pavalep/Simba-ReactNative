# SIMBA Media Architecture — V20

**Status:** Proposed · **Date:** 2026-10-07 · **Supersedes:** the Activity-owns-playback model introduced in V12 and hardened through V19

---

## 1. Summary

Today the player works, but it works for the wrong reason. The `MediaSession`, the
foreground service and the media notification are all owned by an Android **Activity's
lifecycle**, and that Activity also holds a **duplicate copy** of the playback engine's
handle.

Both of those are what force the audio player to live in a full-screen Activity — which is
why there is no mini player today, and why the only way to "hide" the player is to destroy it.

V20 moves playback ownership out of the UI and into the foreground **Service**, so that it
outlives any Activity. Two consequences follow:

1. **Audio gets a mini player** with no OS window manipulation at all, because audio has no
   surface and no reason to own a window.
2. **Video keeps its dedicated Activity — but only for Picture-in-Picture**, which the Android
   platform mandates per-Activity. It becomes a *window onto the shared session* rather than the
   owner of a private player.

This is not a new idea. It is the architecture Android's own Media3 reference implementation
uses, and the one Spotify, Apple Music, YouTube Music and Plex ship.

---

## 2. What is actually wrong today

### 2.1 The engine handle has two owners (stale-handle defect)

The libmpv handle is a **process-global in C++**, not an object owned by any Java/Kotlin class:

```
native_state.h:13          extern mpv_handle *g_mpv;
main.cpp:182-185           if (g_mpv) { return reinterpret_cast<jlong>(g_mpv); }   // idempotent
```

`MPVLib.nativeCreate()` takes no handle and `nativeDestroy()` takes no handle — there is exactly
one instance per process and it lives in C++ global state.

**The native layer is systematically guarded.** Of the 32 JNI entry points that accept a
`jlong nativePtr`, 29 construct a `NativeMpvReadLease` which validates the pointer against the
global before dereferencing:

```
native_state.h:25          return handle_ != nullptr && handle_ == g_mpv && g_initialized.load();
main.cpp:466-470           NativeMpvReadLease lease(nativePtr);
                           if (!lease.valid()) { LOGE("rejected inactive pointer"); return; }
```

The remainder perform the equivalent check inline (`main.cpp:329`).

> **Correction — this document previously described §2.1 as a use-after-free. That was wrong,
> and is withdrawn.** Because every entry point validates against `g_mpv`, a stale pointer is
> rejected and logged, not dereferenced. There is no memory corruption here.

The real defect is that the Kotlin side keeps a **stale copy**:

```
PlayerActivity.kt:151      private var lastNativePtr: Long = 0L
PlayerActivity.kt:594      lastNativePtr = ptr      // via IMpvNativePtrProvider
MpvBridgeModule.kt:1662    destroy() → nativeDestroy(); nativePtr = 0L
```

`PlayerActivity` populates its copy by polling, on a 300 ms interval for up to 200 attempts
(`PlayerActivity.kt:576-594`). Once that window closes, the Activity is pinned to whatever it
last saw. If the engine is destroyed and re-created afterwards, `g_mpv` points at a **new**
handle, the cached one no longer matches, and every Activity-side call is refused:

| Call site | What it stops doing |
|---|---|
| `:735, :748, :766, :779, :795, :813` | MediaSession play/pause/stop/next/prev/seek |
| `:1066, :1079, :1095` | Audio-focus loss, ducking, un-duck |
| `:1112` | Headset disconnect |
| `:1343, :1347` | PiP exit surface re-attach |
| `:1483, :1519` | The onPause pause decision |
| `:1646, :1671, :1689` | Aspect, position, duration polling |
| `:1713, :1723, :1731` | Title / artist / album metadata |

**Symptom: the controls are present, wired, and permanently inert** — lock-screen and
notification buttons stop responding, metadata freezes, progress stops updating — until the
Activity is recreated. Not a crash; a silently dead control surface.

This is the *same* defect class as the double-ownership bugs fixed in the last three waves: a
value with two owners, where the second owner holds a copy that can drift. It is invisible to
the 984-test JS suite, which mocks the bridge, and surfaces only on a device.

**Invariant violated:** two implementations of one thing are two owners of one value.

### 2.2 The session is welded to an Activity (blocks the mini player)

```
PlayerActivity.kt:534   createMediaSession()          // onCreate
PlayerActivity.kt:543   startMediaPlaybackService()  // onCreate
PlayerActivity.kt:846   session.setSessionActivity(...)   // → PlayerActivity
PlayerActivity.kt:1839  stopMediaPlaybackService()   // onDestroy
PlayerActivity.kt:904   releaseMediaSession()        // onDestroy
```

`onDestroy` tears down the service, the session, the notification, audio focus and the surface.
So "hide the player" and "shut the player down" are the **same verb**, and audio — which has no
surface and no need of a full-screen window — has been forced to launch that Activity purely to
host the session.

### 2.3 Three duplicated service lookups

`PlayerActivity` independently resolves the bridge module three times with the same
resolve → `getNativeModule("MpvPlayerModule")` → cast dance, for three separate interfaces:
`IMpvNativePtrProvider` (`:576`), `IMpvConfigProvider` (`:633`), `IPipModeChangeEmitter`
(`:1372`). One owner, three lookups.

---

## 3. Target architecture

```
┌─ MediaPlaybackService (foreground — owns playback; lifetime ≠ any UI) ─┐
│                                                                        │
│  mpv handle            ← the ONLY copy; created and destroyed here      │
│  MediaSessionCompat    ← session server; outlives every Activity       │
│  foreground service    ← owns process lifetime + notification          │
│  audio focus / duck / becoming-noisy                                    │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
        ▲                              ▲
        │ binds as controller          │ binds as controller
        │ (one shared session)         │ (one shared session)
┌───────┴──────────────┐   ┌───────────┴───────────────────────────────┐
│ MainActivity          │   │ PlayerActivity  (VIDEO ONLY — PiP)        │
│  React Navigation     │   │  MpvRenderView surface                   │
│   ├ screens           │   │  PiP window                              │
│   ├ AudioPlayer ⭐    │   │  no session, no service, no engine copy  │
│   └ MiniPlayer ⭐      │   │  a WINDOW onto the shared session        │
└───────────────────────┘   └───────────────────────────────────────────┘
     ⭐ = new: ordinary in-app React UI
```

This is the shape of Google's own Media3 session demo (§4.4): two Activities, one service, the
service owning playback.

**Rules that make this hold:**

1. One mpv handle, owned by one object inside the Service. Activities read it; they never cache it.
2. The session's lifetime is the *service's*, not any Activity's.
3. Any UI may mount and unmount freely. Mounting reads current state; it never starts playback.
4. Only the video lane uses an Activity, and only because PiP is a per-Activity window state.
5. Player and session are released in the **Service's** `onDestroy`, per the Media3 guidance
   quoted in §4.3 — not in an Activity's.

### 3.1 Phase 0 — resolved: yes, trivially, and no native rewrite

The open question was whether libmpv could be owned by a Service. **It can, and the reason is
structural rather than incidental.**

The handle is not a Java object and is not owned by one:

```
native_state.h:13   extern mpv_handle *g_mpv;                  // process-global in C++
main.cpp:182-185    if (g_mpv) return reinterpret_cast<jlong>(g_mpv);   // idempotent
MPVLib.kt:24,27     external fun nativeCreate(path): Long      // no handle argument
                    external fun nativeDestroy()               // no handle argument
```

`MPVLib` is a Kotlin `object` whose `init` maps `simbaplayer_mpv` into the **process** address
space (`MPVLib.kt:181-184`). Once mapped, every caller in the process — TurboModule, Activity,
or Service — reaches the *same* single instance. There is nothing to move.

**Therefore:**

| Question | Answer |
|---|---|
| Can a Service create and own the engine? | **Yes.** It calls the same `MPVLib` singleton. |
| Can the TurboModule keep working afterwards? | **Yes.** It calls the same singleton and reads the same `g_mpv`. |
| Is a native rewrite required? | **No.** Zero changes to `cpp/`. |
| Is the change Kotlin-only? | **Yes** — and it is *relocating ownership discipline*, not relocating native state. |

The best-case outcome holds and Phases A–G proceed as drawn. **Phase 0 is complete.**

This also makes §2.1 cheaper to fix than first assumed: the defect is not that the pointer
cannot be shared, it is that Kotlin chose to *cache* a copy. The fix is one owner plus a read
path — no JNI, no CMake, no `.so`.

---

## 4. Why this is the industry standard, not an opinion

### 4.1 Picture-in-Picture is a window state of an Activity

> "Android allows activities to launch in picture-in-picture (PiP) mode. PiP is a special type of
> multi-window mode… register your video activity in your manifest by setting
> `android:supportsPictureInPicture` to `true`. Also, specify that your activity handles layout
> configuration changes so that your activity doesn't relaunch."
> — [Use picture-in-picture (PiP)](https://developer.android.com/develop/ui/views/picture-in-picture)

> "Sets whether the system will automatically put the activity in picture-in-picture mode
> without needing/waiting for the activity to call `Activity.enterPictureInPictureMode()`"
> — [`PictureInPictureParams.Builder.setAutoEnterEnabled`](https://developer.android.com/reference/android/app/PictureInPictureParams.Builder)

`supportsPictureInPicture` and `setAutoEnterEnabled` are `<activity>` / `Activity` APIs. **PiP is
a property of an Activity's window, so it cannot attach to a React Navigation destination.**
That is a platform constraint and it is the reason video keeps an Activity.

**Stated precisely, because the distinction matters:** the platform requires *an Activity* to
carry PiP; it does **not** require that Activity to be a *second* one — the PiP guide's own
worked example is a single app Activity entering PiP. We keep a dedicated video Activity
because it is the conventional choice, because a window containing the entire navigation stack
is a poor PiP host, and because Google's own reference demo does exactly this (§4.4). We could
host PiP on `MainActivity`; we are choosing not to, and that is a design decision rather than a
platform requirement.

> **Correction.** An earlier draft of this document cited
> `source.android.com/docs/core/display/pip` for "PiP works on a per-activity basis". All
> `source.android.com/docs/core/*` paths now 404 and could not be re-verified, so that citation
> has been withdrawn. The per-Activity conclusion above rests on the live
> `developer.android.com` PiP page and the `PictureInPictureParams` reference only.

### 4.2 "Single activity" is a *navigation* recommendation, and does not apply to video

> "Use a single-activity application. **Strongly recommended** … if your app has more than one
> screen."
> — [Recommendations for Android architecture](https://developer.android.com/topic/architecture/recommendations)

Read in context, this governs **screen navigation**: one Activity, many destinations. It says
nothing about a video surface in a PiP window, which is a separate platform concept that the
same documentation set requires to be an Activity. The same page also opens with:

> "Treat the recommendations in the document as recommendations and not strict requirements.
> Adapt them to your app as needed."

Resolving the two is exactly the hybrid above — and it is what YouTube, Netflix and Plex ship.

### 4.3 The session and the player belong in the Service, not the UI

This is Media3's documented reference architecture, stated twice — once in Media3's own
background-playback guide, once in the platform media guide.

> "To enable background playback, you should contain the Player and MediaSession inside a
> separate Service."
> — [Media3: Background playback](https://developer.android.com/media/media3/session/background-playback)

> "onCreate() is called when the first controller is about to connect and the service is
> instantiated and started. **It's the best place to build Player and MediaSession.**
> onDestroy() is called when the service is being stopped. All resources including player and
> session need to be released."
> — [Media3: Background playback](https://developer.android.com/media/media3/session/background-playback)

> "When playing media in the background, your MediaSession and the player need to be housed
> within a MediaSessionService or MediaLibraryService that runs as a foreground service."
> — [MediaSession overview](https://developer.android.com/guide/topics/media/session/mediasession)

And the UI attaches as a controller, which is what makes the mini player possible:

> "If your Player and MediaSession are in a Service separate from the Activity or Fragment where
> your player's UI lives, you can assign your MediaController as the player for your UI
> component… Playback and playlist method calls are sent to your Player through your
> MediaSession."
> — [Media3: Player](https://developer.android.com/media/media3/session/player)

> "A media controller can also be useful within a media app, for example if the player and media
> session live in a Service separate from the Activity or Fragment with the UI."
> — [Connect to a media app](https://developer.android.com/media/media3/session/connect-to-media-app)

**Why our current model is wrong on this axis:** releasing the session and player in
`Activity.onDestroy` is exactly what the docs place in the **Service's** `onDestroy`. Because we
do it in the Activity's, the notification is torn down and the service is allowed to die every
time the UI goes away — so "hide the player" and "shut the player down" become one verb, and the
mini player cannot exist.

> **Nuance, stated honestly.** The platform guide also *permits* Activity-owned sessions when
> background playback is not required: "You should create and initialize a media session when it
> is needed, such as the `onStart()` or `onResume()` lifecycle method of the Activity or
> Fragment, **or** `onCreate()` method of the Service." We *do* require background playback — a
> mini player that stops the music is not a mini player — so the service-owned form is the
> applicable one. Service ownership is Google's **reference architecture**, not a platform
> mandate.

### 4.4 Google's own reference demo is this shape

The AndroidX Media3 session demo (`androidx/media`, `demos/session`) is primary evidence rather
than commentary, and its structure is the target structure:

- `MainActivity` — launcher, UI only, attaches via `MediaController`
- `PlayerActivity` — separate Activity for the full playback UI
- `PlaybackService` — `foregroundServiceType="mediaPlayback"`, owns player and session

Two Activities plus a service, with the service owning playback. That is precisely this proposal.
(Source: <https://github.com/androidx/media/tree/release/demos/session>, manifest at
`demos/session/src/main/AndroidManifest.xml`.)

> **Note.** That demo declares **no** `supportsPictureInPicture`, because it ships no video PiP.
> We keep PiP on the video Activity, which is an addition to Google's demo rather than a
> departure from it.

---

## 5. What changes, concretely

| # | Change | Where | Risk |
|---|---|---|---|
| 1 | Move mpv + session + service ownership into `MediaPlaybackService` | **Kotlin (lib)** | Medium — the real work |
| 2 | Delete `PlayerActivity.lastNativePtr`; all consumers read the host | `PlayerActivity.kt` (~15 sites) | Low, mechanical once #1 lands |
| 3 | `createMediaSession` / `start` / `stop` / `release` move out of Activity lifecycle | `PlayerActivity.kt` | Medium |
| 4 | Collapse 3 service lookups into 1 | `PlayerActivity.kt:576,633,1372` | Low |
| 5 | Audio launches in-app; no `PlayerActivity` for audio | app + lib | Medium |
| 6 | `MiniPlayer` above the tab bar | app (new) | Low, pure React |
| 7 | `AudioPlayer` chrome — artwork, seek, transport, repeat/shuffle | app (new) | Low, pure React |
| 8 | Video `PlayerActivity` becomes surface-only + PiP | lib | Medium |
| 9 | `onNewIntent` so re-presenting the video player attaches instead of reloading | lib (new) | Low |

### Non-negotiable invariants

- **I3** — a control that cannot act renders `null`. If the session host is unavailable, the
  chrome is not rendered rather than rendered inert.
- **One source of truth** — the mpv handle has exactly one owner (fixes §2.1).
- **Only explicit user actions write presentation state** — no effect derives and writes it.
- **Two lanes, one engine** — audio and video are the same session with different chrome.

---

## 6. Phasing

Each phase is independently shippable and independently revertable.

| Phase | Deliverable | Ships? |
|---|---|---|
| **0** | **Spike:** can the mpv handle live inside a Service? (§3.1) — **ANSWERED, see §3.1** | none — done |
| **A** | Playback ownership moves to the Service; duplicate handle deleted | lib minor bump — **fixes the stale-handle defect** |
| **B** | Session + service start/stop driven by the host, not `onCreate`/`onDestroy` | lib minor bump |
| **C** | Audio lane launches in-app; `PlayerActivity` used for video only | app + lib minor |
| **D** | `AudioPlayer` chrome — artwork, seek, transport, repeat/shuffle | app |
| **E** | `MiniPlayer` above the tab bar; chevron = minimize, X = close | app |
| **F** | Video `PlayerActivity` becomes surface-only; `onNewIntent` attach | lib minor |
| **G** | Device verification: PiP, notification, lock-screen, Bluetooth, minimize-keeps-playing | QA |

**Phase 0 is not optional and not a formality.** Everything in §3 is documented except whether
libmpv can be owned by a Service, and the three possible outcomes change the shape of A–G
(§3.1). Scheduling A before the spike would be scheduling a guess. The spike is bounded — it is
a question about JNI handle ownership and Service lifetime, and is answerable in about a day.

**Phase A independently fixes a real defect.** Even if every other phase were cancelled, the
stale-handle dead-control surface in §2.1 would be gone.

---

## 7. Honest costs and risks

- **Phase A–B are Kotlin work with no automated coverage.** The JS suite mocks the bridge, so it
  cannot catch regressions here. Verification must be on-device. We will not claim these phases
  are correct until they have been.
- **C changes the audio launch path for every audio surface** (~5 inconsistent call sites today).
  All must be normalised in the same phase or audio breaks in part of the app.
- **E removes the "separate full-screen window" behaviour for audio.** Swiping up from the
  launcher will land on the app (with the mini bar visible) rather than on the player. This is
  what Spotify, Apple Music and YouTube Music do, but it is a behaviour change and should be a
  conscious acceptance.
- **D/F are the parts most likely to need iteration**, because they are the parts with real
  design judgement (reachability, information density) rather than mechanical correctness.

---

## 8. What we are explicitly NOT doing

- **Not** adding a third Activity for the mini player.
- **Not** using `moveTaskToBack()` / task-flag juggling to implement minimize. It was prototyped
  and discarded: `PlayerActivity` shares a task with `MainActivity` (no `taskAffinity` is
  declared), so `moveTaskToBack` backgrounds the *entire app* rather than revealing it, and once
  backgrounded `getCurrentActivity()` returns `MainActivity` so the mini player's own buttons
  would reject. Both are fixable — at the cost of two more mechanisms to maintain a design no
  shipping app uses. It is deleted, not patched.
- **Not** inventing UI. Every affordance must name the app that already ships it.

---

## 9. Decision requested

Two separable decisions:

1. **Approve the direction** — Service-owned playback, UI-as-controller, video keeps an Activity
   for PiP. This is documented, precedented in Google's own demo, and unblocks the mini player.
2. **Approve Phases A–G.** Phase 0 is **complete and returned the best case** (§3.1) — the
   change is Kotlin-only, with no native rewrite and no `.so` rebuild.

Phase A is worth doing on its own regardless of the rest, because it deletes the stale-handle
dead-control surface in §2.1.

---

## Sources

All verified against live pages on 2026-10-07.

**Primary — Media3 / platform (media session ownership)**

- [Media3: Background playback](https://developer.android.com/media/media3/session/background-playback) — "contain the Player and MediaSession inside a separate Service"; Service `onCreate`/`onDestroy` ownership; notification behaviour (removed with `Player.release()`; exits foreground after 10 min paused)
- [MediaSession overview](https://developer.android.com/guide/topics/media/session/mediasession) — "your MediaSession and the player need to be housed within a MediaSessionService … that runs as a foreground service"
- [Media3: Player](https://developer.android.com/media/media3/session/player) — UI given a `MediaController` as its `Player`
- [Media3: Connect to a media app](https://developer.android.com/media/media3/session/connect-to-media-app) — `SessionToken` → `MediaController.Builder(...).buildAsync()` → `Player.Listener`; controller release
- [Foreground services](https://developer.android.com/develop/background-work/services/fgs) — "A music player app that plays music in a foreground service"

**Primary — PiP**

- [Use picture-in-picture (PiP)](https://developer.android.com/develop/ui/views/picture-in-picture) — `supportsPictureInPicture`, `configChanges`, `setAutoEnterEnabled`
- [`PictureInPictureParams.Builder`](https://developer.android.com/reference/android/app/PictureInPictureParams.Builder) — PiP APIs are Activity-scoped

**Primary — reference implementation**

- [androidx/media session demo](https://github.com/androidx/media/tree/release/demos/session) — `MainActivity` + `PlayerActivity` + `PlaybackService`; the target shape

**Primary — navigation**

- [Recommendations for Android architecture](https://developer.android.com/topic/architecture/recommendations) — "Strongly recommended … single-activity application", plus "adapt them to your app as needed"

**Already satisfied — no new permissions required**

`FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK` and `POST_NOTIFICATIONS` are declared
in the app manifest (`AndroidManifest.xml:11-14`), and the library declares
`MediaPlaybackService` with `foregroundServiceType="mediaPlayback"`
(`react-native-media-player/android/src/main/AndroidManifest.xml:30-33`). The platform-mandated
foreground-service requirements are met today.

**Withdrawn / not verified**

- `source.android.com/docs/core/display/pip` ("PiP works on a per-activity basis") — all
  `source.android.com/docs/core/*` paths returned 404 on re-check. **Citation withdrawn**; the
  per-Activity conclusion now rests only on the live `developer.android.com` pages above.
- "Only one Activity in PiP at a time" — **no such statement found** in the developer docs.
- Internal architectures of Spotify / Apple Music / YouTube Music / Plex / YouTube — **no primary
  source exists.** Nothing in this document asserts how they are built; the design justification
  rests on Google's own demo and docs, not on reverse-engineering shipping apps.
- "A MediaSession survives its creating Activity's destruction" — no explicit sentence found. The
  guarantee is compositional (service ownership + a visible, near-unkillable process), and is
  presented as inference, not quotation.
- libmpv inside a TurboModule — **no guidance exists.** See §3.1; this is the open spike.