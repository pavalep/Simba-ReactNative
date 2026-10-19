# SIMBA V22 — Player Master Plan (single index, dated)

> **Created:** 2026-10-16 · **Owner:** player architecture
> **App repo:** `MOBILE_APP_REACT_NATIVE` @ `main` / `10f2c81` (remote `pavalep/Simba-ReactNative`)
> **Lib repo:** `react-native-media-player` @ `main` / `9ad7b0b`, version `1.14.0` (remote `pavalep/react-native-media-player`)
> **Lib consumed by app:** `npm install @simba-dev/react-native-media-player@<version>` — never `file:`/`link:`/`workspace:`
> **Device:** `emulator-5554`, AVD `Medium_Phone`, API 37, x86_64 · Metro `10.0.2.2:8081`
> **Mandate:** production-quality player, **zero jugaad** — no placeholders, silent fallbacks, inert controls, or workaround code.

---

## 0. What this document is

`md/` has 90+ files across 14 waves. This is the **only** document that says
what is true *right now*. Everything else is either evidence for a decision
here, or history.

**Rules of use**

1. A decision is not made until it appears in §2 with a source link.
2. §2 is **append-only**. To change a decision, write the new one with a new
   date and a supersedes-link. Do not silently edit an old one — that is how
   the `TextureView` recommendation survived a day in a brief.
3. Every stage in §5 has a gate. No gate, no next stage.
4. Commits wait on Paval's review. Branch first if on `main`.

---

## 1. Document register

| Document | Date | Status |
|---|---|---|
| **`SIMBA_V22_RN_MEDIA_MODULE_INTEGRATION_RESEARCH.md`** | 2026-10-16 | 🟢 **LIVE — authority on integration pattern.** Primary-source comparison of react-native-video v6/v7, expo-video, vision-camera. |
| `SIMBA_V22_DEVICE_FINDINGS_AND_RN_ARCHITECTURE_BRIEF.md` | 2026-10-16 | 🟡 **LIVE-PARTIAL.** §1–§3, §5 device findings valid. §4.2 **corrected** — TextureView withdrawn. |
| **`SIMBA_PLAYER_V21_TRACKER.md`** | rolling, top handoff 2026-10-16 | 🟢 **LIVE — per-finding state.** Newest handoff block at top. |
| `SIMBA_PLAYER_V21_SPECIFICATION.md` | 2026-10-13 | 🟡 Reference — lib public API of record. |
| `SIMBA_V21_DEVICE_PROOF.md` | 2026-10-12 | ⚫ **TEMPLATE ONLY.** Describes `PlayerActivity`, which no longer exists. Do not reuse as a capture sheet. |
| `SIMBA_PLAYER_V20_MEDIA_ARCHITECTURE.md` | 2026-10-07 | 🟡 Reference — pre-collapse architecture. |
| `SIMBA_PLAYER_V20_JUGAAD_AUDIT.md` / `..._TRACKER.md` | 2026-10-09 | 🟡 Reference — the jugaad inventory this wave answers. |
| `SIMBA_PLAYER_MODULE_V19_SPECIFICATION.md` | 2026-10-07 | 🟡 Reference — 120 KB, the deepest API record. |
| `SIMBA_PLAYER_MODULE_V12…V18_*` | 2026-09-03 → 09-08 | ⚪ History. V12 tracker alone is 252 KB. |
| `UI_UX_*`, `archive/v11/*` | ≤ 2026-08-21 | ⚪ History / rejected references. |

---

## 2. Decisions locked

### D1 — One Activity, one React root ✅ locked 2026-10-16
Forced by the platform: a `SurfaceView`'s Surface belongs to its window, so two
Activities make an in-app video mini player impossible. Miniplayer ≠ PiP;
both are features of one window.
*Source:* tracker handoff 2026-10-15.

### D2 — The video picture is a Fabric component in the React tree ✅ locked 2026-10-16
RN creates it, lays it out, z-orders it, destroys it. Verified against
`react-native-video` v6.19.3 `ReactExoplayerViewManager.kt`
(`ViewGroupManager<ReactExoplayerView>`, ~25 `@ReactProp`s) and
`expo-video` (`<VideoView player={player} />`).
*Source:* research §2, §3, §5.

### D3 — `SurfaceView`, NOT `TextureView` ✅ locked 2026-10-16 (supersedes 2026-10-15)
The 2026-10-15 brief named `TextureView` "the clean destination". **That was
wrong.** Two sources kill it:

- SIMBA's own `MpvRenderView.kt:22-30` — *"Why SurfaceView and not TextureView
  (tested both) … PiP shows black."*
- `react-native-video` 6.19.3 `ExoPlayerView.updateSurfaceView()` —
  `// TODO: Implement proper surface type switching if needed`.

`SurfaceView` in-tree is **proven**: react-native-video ships a `SurfaceView`
inside an RN-managed `ViewGroup` with working PiP. The defect was never the
surface type — it was being a **sibling of the React root** instead of a
descendant.
*Source:* research §2.6, §6.

### D4 — Two command addresses, chosen by what the operation acts on ✅ locked 2026-10-16
- **Engine ops** (`play pause togglePlayPause setVolume setMuted toggleMute
  setSpeed setLoopMode seek seekBy skipForward/Backward next previous stop
  stopPlayback seekToChapter loadFile`) → `usePlayer().commands`. View-independent,
  callable from **any** component anywhere.
- **Presentation ops** (`enterPictureInPicture exitPictureInPicture fullscreen`)
  → `SimbaVideo` ref. These act on the window.
*Source:* research §2.3, §2.4; `lib/src/types/player.ts:148-200`.

### D5 — The library draws no chrome ✅ locked 2026-10-16
`react-native-video` ships `PROP_CONTROLS defaultBoolean = false`. SIMBA gets a
picture and addressable functions; every button, slider and label is app-side RN.
Already true today — must stay true.

### D6 — `BrowsingStack` blanks, it does not unmount ✅ locked 2026-10-16 — **expiring**
Unmounting destroys navigator state; back out of a fullscreen video would land on
Home instead of the list you left. `opacity: 0` + `pointerEvents: 'none'` is one
decision — alpha alone still eats the tap that toggles chrome.
**This component is deleted by D2.** It exists only to work around the
sibling-surface bug. It is a stopgap, not a destination.

### D7 — Never give `VideoPlayer` a `zIndex` ✅ locked 2026-10-16
Its overlay is deliberately transparent; raising it puts controls over browsing
screens instead of over the video. Recorded in `App.tsx`.

### D8 — Never assert an architecture recommendation without reading real implementations ✅ locked 2026-10-16
D3 exists because this was skipped once. A repo comment saying "X was tested, it
broke Y" outranks any external source, including mine.

### D9 — One mounted player per lane; presentation is style, not component identity ✅ locked 2026-10-16

**Full and mini are the same React tree. They are never two components taking
turns.** The instance stays mounted and its `style` (and per-part visibility)
changes. No `cond ? <Full/> : <Mini/>`.

This is the rule for both lanes. `PlayerChrome.tsx:93-106` is what it replaces:

```tsx
if (!nowPlaying) return null;                     // the ONLY legal unmount
if (streamType === 'video') {
  return presentation.isMini ? <MiniPlayer/> : null;
}
return audioMode === 'expanded' ? <AudioPlayer/> : <MiniPlayer/>;
```

Five outcomes, each mounting a *different component*. Every switch is an
unmount/remount: subscriptions re-run, `Animated.Value`s reset, and — for video
— a `SurfaceView` is destroyed and recreated, which is a black frame. The
component identity is not incidental to the problem; it is the problem.

**What may change with presentation:** the root `style` (geometry), and
per-part visibility (which sub-elements are shown). Both are props of a mounted
tree.

**What may NOT change:** which component is mounted. If two different
components have to exist for two sizes, they are children of one mounted
parent, not alternatives to it.

**The one legal unmount** is `nowPlaying == null` — nothing is loaded. That is
the absence of a session, not a presentation. It stays.

**Why it matters beyond tidiness:** D2 already made the video picture a real
view. If the dock got its own `SimbaVideo`, two views would bind one mpv handle
(`attachSurfaceLocked` rebinds on every `setNativePtr`) — the exact conflict
Stage 6's design avoids. One tree is not a style preference here; it is what
makes the dock possible at all.

---

## 3. The target public API

What a junior developer writes. Three imports, ordinary RN layout.

```tsx
import { SimbaVideo, usePlayer, type SimbaVideoRef } from '@simba-dev/react-native-media-player';

function Player() {
  const { commands, state } = usePlayer();
  const video = useRef<SimbaVideoRef>(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <Header title={state.title} onBack={commands.pause} />

      <SimbaVideo
        ref={video}
        source={{ uri: state.uri }}
        paused={!state.playing}
        volume={state.volume}
        muted={state.muted}
        resizeMode="contain"
        style={StyleSheet.absoluteFill}
        onProgress={…}
        onReadyForDisplay={…}
      />

      <Controls
        onPlay={commands.togglePlayPause}
        onNext={commands.next}
        onPip={() => video.current?.enterPictureInPicture()}
      />
    </SafeAreaView>
  );
}
```

**Constraints on this API**

- No context plumbing. No refs passed down. No manual measurement.
- A control whose handler is a fallback **renders `null`** — never a dead button.
- `SimbaVideo` must work in any parent layout: `absoluteFill`, flex child, or a
  sized box. RN owns its geometry.

---

## 4. Refactor scope — measured, not estimated

| Tier | Count | Detail |
|---|---|---|
| **Deleted** | 5 files, ~420 lines | `useVideoSurface.ts` (178) · `VideoSurface.tsx` (94) · `BrowsingStack.tsx` (95) · `lib PlayerSurface.kt` · `MainActivity` mount path |
| **Rewritten** | 4 files, ~1 000 lines | `VideoPlayer.tsx` (463) · `useVideoController.ts` (248) · `MiniPlayer.tsx` (395) · `usePresentation.ts` (154) |
| **Touched** | ~12 files | imports + mechanism only |
| **Tests revised** | 17 files, 4 956 lines | contracts survive; the mechanism changes |
| **Lib additions** | 4 new · 3 modified · 2 deleted | spec, Fabric manager, commands, package wiring |

**Total meaningful churn ≈ 2 500–3 000 lines**, majority in tests.

**The cost is not lines — it is the serial release cycle.** Lib change →
commit → push → annotated tag `v<version>` → Actions publishes → `npm install` →
rebuild app → verify. Nothing downstream can be parallelised or tested before
the publish lands.

---

## 5. Execution order

Gates are cumulative. `A` = app, `L` = lib.

### Stage 0 — Stopgap commit *(pending Paval's review)*
`App.tsx` + `src/app/BrowsingStack.tsx` + `__tests__/app/` on a branch.
**Rationale:** `main` has a live P0 (video invisible) and the migration is not
instant. This holds `main` sane and is revertible. It becomes dead on arrival
when D2 lands — that is expected, not waste.
**Gate:** `tsc` 0 · `eslint --max-warnings 0` · `jest` ≥ 89 suites / 1107 passed · 3/3 mutants killed (already measured 2026-10-16).

### Stage 1 — Control test *(before any render code)*
Push `.scratch-test-video.mp4` through the current pipeline.
**Gate:** we can say whether the black video is emulator SwiftShader or an app
defect. **No rendering change may be written before this result exists.**

### Stage 2 — `L` Fabric component
Spec file · `codegenConfig` `"modules"` → `"all"` · Fabric `ViewManager` for
`MpvRenderView` · register in `PlayerPackage` · `SimbaVideo` + `SimbaVideoRef`.
**Gate:** `L` `tsc` 0 · `L` `jest` green · `gradlew :simba-dev_react-native-media-player:compileDebugKotlin` from `lib/example/android`.

### Stage 3 — `L` presentation commands
`enterPictureInPicture` / `exitPictureInPicture` addressed to the view.
**Gate:** command reaches the view, verified in logcat by tag.

### Stage 4 — `L` Yoga↔SurfaceView guard
`requestLayout()` second pass, mirroring `ExoPlayerView.kt`'s documented
workaround for Yoga deferring surface layout passes.
**Gate:** `surfaceChanged` fires with non-zero extents on device.

### Stage 5 — `L` release
Commit → push → **annotated** tag `v<version>` → Actions → verify
`git ls-remote --tags origin` shows the tag → `npm install @version` in app.
**Gate:** app resolves the published symbol; verify in `node_modules`, never
let `tsc` pass on a lib that isn't installed.

### Stage 6 — `A` swap *(design settled 2026-10-16 — read before coding)*

**The design: ONE `SimbaVideo` at shell level, repositioned by `style`.**

Two traps, both discovered by reading the existing code rather than assuming:

1. **The Fabric surface and the Kotlin-mounted surface cannot coexist.** Both
   bind the same mpv handle via `nativeAttachSurface`; `attachSurfaceLocked`
   rebinds on every `setNativePtr`. So removing
   `PlayerSurface.mount(activity)` is *not* optional cleanup — until it is
   gone, adding `SimbaVideo` creates two surfaces fighting over one engine.
   Stage 6 and Stage 7 are therefore one coupled change, not two.

2. **The mini dock currently reuses the global surface.** `MiniPlayer` measures
   its rect and publishes `videoMiniRect`; `useVideoSurface` then calls
   `setVideoBounds(...)` in **window pixels** because the surface composites at
   `android.R.id.content` index 0 and therefore has no idea where the dock is.
   That hand-off disappears entirely once the view is in the tree — but it
   raises the real question: **does the dock get a second `SimbaVideo`?**

   It must not. Two `SimbaVideo`s both bound to one handle is trap 1 again.

   So: one `SimbaVideo`, mounted once at the shell, whose **`style`** changes
   with presentation —

   ```
   expanded → absoluteFill
   mini     → position absolute at videoMiniRect
   ```

   Same component instance, so no unmount/remount, no Surface
   destroy/recreate, no black flash. React owns the geometry, which is the
   entire point of D2. `videoMiniRect` survives — it stops being "window pixels
   to hand the engine" and becomes "a style", which is what it always should
   have been.

**Also in this stage:** `videoSurfacePresented` becomes structurally true
whenever the chrome renders the view, so `usePresentation`'s derivation
(`pipActive ? 'pip' : videoSurfacePresented && videoPresentation === 'expanded'
? 'expanded' : 'mini'`) collapses to `pipActive ? 'pip' : videoPresentation ===
'expanded' ? 'expanded' : 'mini'`, and `setVideoSurfacePresented` /
`useVideoSurface.ts` are deleted.

**Gate:** `tsc` 0 · `eslint --max-warnings 0` · `jest` no regressions · on
device: video **visible** expanded · header-back → dock shows live video in the
dock rect · dock → expanded restores · PiP in/out · back at each level.
Rollback is `git checkout f5/video-view-component` if the swap regresses.

#### Stage 6+7 progress — 2026-10-16, app `04a35ad` (pushed)

**Landed (committed, gated):**

- `VideoSurface` renders `<SimbaVideo>` — a real `codegenNativeComponent`
  child — plus a tap layer, and paints nothing over it.
- `PlayerSurface.mount/unmount` deleted from `MainActivity.kt`, with the
  field, both imports and the `onDestroy` teardown.
- `useVideoSurface.ts` (178) and its suite (212) deleted.
- `videoSurfacePresented` / `setVideoSurfacePresented` deleted from the store.
- Derivation collapsed exactly as written above.

**Gates:** `tsc` 0 · `eslint --max-warnings 0` · `jest` **88 suites / 1105
passed / 1 todo** (was 89/1107 — one suite deleted with its module).
**Mutation check 4/4 killed**, each by its intended test: transparent `<View>`
placeholder, `isMini` computed from the request instead of `mode`, a re-added
stored `mode`, and a session read in the derivation.

**Two things this stage settled that the plan did not anticipate:**

1. `VideoSurface`'s tap layer had inherited the picture's
   `accessibilityLabel`, so a screen reader announced "Video" **twice**. It is
   now hidden from the a11y tree (`accessibilityElementsHidden` +
   `importantForAccessibility="no-hide-descendants"`). Every action it
   triggers is already a real button in the chrome, so nothing is lost — and
   it avoids inventing a "Toggle player controls" affordance. Pinned by
   `getAllByLabelText('Video')` having length 1.
2. `videoMiniRect` now has **one writer and no reader** — `useVideoSurface`
   was its only consumer. It is deliberately kept: trap 2 above still needs
   it, as the `style` that positions the single view. The docstring says so
   rather than implying a consumer exists.

**Device verification — 2026-10-16, `emulator-5554`, `BUILD SUCCESSFUL` 9m15s**

Debug APK built and installed. Results, in the order they were found:

1. 🔴 **P0, now fixed — red screen on every cold start.** Eight consecutive
   native `IllegalStateException: MpvPlayerModule not initialized. Call
   initPlayer() first.` from `ensurePtr` (`MpvBridgeModule.kt:2354`),
   surfaced through `ReactHost.handleHostException`.

   Cause, read off the log rather than guessed:
   `PlayerProvider` calls `initPlayer()` in its **mount effect**
   (`PlayerProvider.tsx:542`). React runs **child effects before parent
   effects**, so any component that calls the bridge from its own mount
   effect beats the engine's creation. The video chrome was mounting on cold
   start because `videoPresentation` initialised to `'expanded'` — a value
   that was only ever survivable because the deleted
   `videoSurfacePresented: false` had been masking it. The mask hid a value
   that was simply wrong: on a cold start no writer has run, there is no
   video, and nothing can be expanded.

   Fixed by making the cold-start value `'mini'`. Re-measured on device:
   **0 `ensurePtr` failures**, `initPlayer` clean, home screen renders.

   *Latent lib defect, not fixed here:* `PlayerProvider` cannot win this race
   by construction. The honest lib-side fix is to call the idempotent
   `initPlayer()` during the provider's **render**, not in an effect, so the
   handle exists before any child effect. Worth a lib release; the app-side
   fix only avoids the situation, it does not remove the hazard.

2. ✅ **The in-tree surface works.** From logcat on a video launch:
   `surfaceCreated` → `Attaching Surface to mpv` → **`surfaceChanged: 1080x1907`**.
   Non-zero extents, so the Yoga↔`SurfaceView` guard from Stage 4 is doing its
   job. The a11y tree independently agrees: `Image "Video"` at
   `(0.000, 0.000, 1.000, 0.795)` plus `video-surface-tap` — the picture is
   genuinely mounted and laid out.

3. 🔴 **The black frame is a LOAD failure, not a render failure.**
   `MPV_EVENT_END_FILE reason=4 error=-13`, and mpv error **-13 is
   `MPV_ERROR_LOADING_FAILED`**. The source is
   `IAccuseMyParents.avi` — **733 MB**, a format whose index lives at the
   *end* of the file. Nothing ever reached the renderer, so the black screen
   is fully explained. Device→archive.org ICMP succeeds, and audio over HTTPS
   worked before, so this is not "the emulator has no network".

   **This retires the "video is black" P0's framing.** The remaining unknown is
   no longer "does the surface work" — it is "does the renderer paint once
   media actually arrives", which the control file answers.

4. 🔴 **New P0 — a load failure renders as a silent black screen.**
   mpv emitted `onError` (`code=-13 recoverable=false`) and the UI shows no
   `VideoErrorOverlay`, no message, nothing. That is the "control that lies"
   failure this wave exists to remove, and it is now above the render question
   in priority.

5. 🟠 **Lib defect: the error is mislabelled.** The bridge maps this to
   `E_RENDERER_GONE` (`MpvBridgeModule`), but -13 is
   `MPV_ERROR_LOADING_FAILED`. The UI is told the renderer crashed when the
   file simply failed to download. Every load failure will read as a GPU
   crash.

6. ⚪ Confirmed still live, from the a11y tree, unchanged by this stage:
   `SeekBar "Live stream — not seekable"` disabled with `Remaining time
   unknown "--:--"` (the P1 duration bug); `StaticText ""I Accuse My Parents""`
   with literal quotes; stray `2×` / `☀ 100%` / `♪ 100%` chips floating
   mid-frame.

**The control test that closes this out:** play
`.scratch-test-video.mp4` (960×540, 5.05 s, 1.1 MB, already proven to render
in Google Photos on this emulator) *through SIMBA's own pipeline*. Until that
runs, "video renders" is unproven — but note the bar is now much lower than it
was, because every layer between React and the renderer has been measured
working.

#### 2026-10-19 — 🟢 VIDEO RENDERS. The cause was the file, not the surface.

The P1 control test turned out to be unnecessary, and it is worth recording
why: **the app's own archive.org adapter was choosing the wrong file.**

`internetArchiveVideoDetailsFromRaw` filtered candidates with
`f.source === 'original'`. Measured against the live metadata API, that is
wrong in three independent ways:

| item | on archive.org | what the filter did |
|---|---|---|
| `e_history_StreamRoot_…` | `derivative` h.264 50.9 MB **only** | no candidates → item declared unplayable |
| `cpa_000031` | derivative 66.3 MB vs original `h.264 HD` **837 MB** | picked the 837 MB |
| `IAccuseMyParents` | derivative h.264 389 MB vs original **Cinepack** 699 MB | picked the Cinepack AVI |

archive.org publishes every upload twice: the original, and its own h.264
transcode made for streaming. Filtering to `original` excluded the transcodes,
preferred the largest file, and made AVI-only items unplayable. AVI is the
worst possible streaming source — its index sits at the *end*, so mpv must
fetch the tail of a 700 MB file before the first frame. The old code's comment
claimed it "prefers h.264 → MPEG4"; it could not, because every h.264 on
archive.org is a derivative and derivatives had already been filtered out.
A comment describing behaviour the code did not have.

Format matching was also `VIDEO_FORMATS.includes(f.format)` — exact equality,
so `h.264 HD` and `h.264 IA` matched nothing.

**Fixed:** candidates are every video-shaped file regardless of `source`;
format matching is by substring; `Cinepack`/`AVI` rank last as a fallback so
an item shipping *only* an AVI still plays; and within a format the smallest
file wins. Unknown size ranks behind known size.

**Proven on device.** `The Battle of Midway, 1942` now loads
`Battle.of.Midway.1942.mp4`, `videoReconfig` fires twice, and **decoded frames
paint** — two different frames observed (a cockpit shot, then a seagull).

**Everything below the file selection was already correct.** The Fabric view
mounted, the surface attached with real extents (`1080x1907`), `vo=gpu` was
set, and the renderer worked. The TextureView question, the Yoga guard, and
two days of surface architecture were answering a question the logs had
already answered.

Two P1 symptoms also resolved as a side effect of media actually loading:
`Elapsed` went `0:00` → `2:28`, and the seek bar went from
`"Live stream — not seekable"` `[disabled]` to `"Playback position"`
`[clickable]` — **the false LIVE badge is gone**.

Still broken: `Remaining time unknown --:--`. Position reports and duration
does not, so this is now a narrow bug in the `duration` property rather than
the general "nothing loaded" state it used to be lost in.

#### 2026-10-19 — the duration bug, measured rather than guessed

With a video genuinely playing, the events that actually arrive are:

```
startFile · surfaceAttached · audioReconfig ×3 · fileLoaded
videoReconfig ×2 · playbackRestart
```

The events that never arrive are `onPositionChanged`, `onDurationChanged`,
`onPlaybackStateChanged`, `onSeekable`, `onBuffering`, `onCacheState` —
i.e. **every `MPV_EVENT_PROPERTY_CHANGE`-derived event.**

That is not a new discovery: the lib's own `PlayerProvider` docstring
records it — *"`onSeekable` / `onPositionChanged` / `onDurationChanged` …
arrive **0 times**. `MPV_EVENT_PROPERTY_CHANGE` is therefore never delivered
to this native side."* The lib had a 1 Hz poll as a backstop for exactly
these fields and **removed it in v1.10.0** (`PlayerProvider.tsx:767` — "This
used to be a 1Hz `setInterval`"), on the belief that the event stream is
authoritative. The event stream is dead, so the backstop is gone too.

Measured: `getDuration` and `getPosition` are called **exactly twice each**,
both at app start. There is no poll running in the lib *or* in the app —
`useTransport.ts` contains no `setInterval` at all.

**Consequence.** `duration` is never read after startup, so it stays 0 and
the transport renders `Remaining time unknown --:--` and treats the file as
live. Elapsed does display a live value, so the app is deriving it from
somewhere that still works — the asymmetry is the bug, and it is now
narrow enough to fix deliberately.

**The fix belongs in the lib**, in one of two honest ways:

1. Restore the 1 Hz poll for `position`/`duration`/`volume`/`speed`/
   `playback-state`. The lib's own history has it; it was removed on a
   premise that turned out to be false.
2. Fix `MPV_EVENT_PROPERTY_CHANGE` delivery at the native layer, so the
   event stream is authoritative as intended.

Option 1 is smaller and can be shipped immediately; option 2 is the real fix
and also restores `seekable`, `isBuffering` and `cacheRanges`, which have
**no poll fallback** and are therefore currently dead on both lanes.

The app's `useTransport` docstring also claims the lib populates these
"at 1Hz" — a comment describing behaviour that stopped existing in v1.10.0.

### Stage 7 — `A` remove the invariant
Delete `BrowsingStack` · delete `MainActivity` surface mount · delete
`PlayerSurface` import surface · revise the 17 test files.
**Gate:** full device matrix — PiP in/out, dock rotation, a→v→a switching,
hardware back at each level, next/prev with a real playlist.

### Stage 8 — P0 back + P1 duration
Both need instrumentation, not guesswork — see §7.

### Stage 9 — `A` collapse both lanes onto D9 *(appended 2026-10-16)*

Stage 6 fixes the video picture. This makes the same guarantee for the *rest*
of both lanes, so that "mini" and "expanded" stop being two components.

**Target tree** — one host, mounted while a session exists:

```
<PlayerHost>                 // ONE instance. Unmounts only on nowPlaying == null.
  <SimbaVideo/>              // video picture     — style: expanded | dock rect
  <ArtworkSquare/>           // audio leading art — style: expanded | 44pt
  <FullChrome/>              // titles, queue, big transport — visibility
  <DockControls/>            // 44pt bar           — visibility
</PlayerHost>
```

- Video picture moves by `style` (`absoluteFill` ⇄ `videoMiniRect`). Same
  instance — no Surface recreate.
- The existing `ChromeAutoHideController` already animates chrome visibility on
  an `Animated.Value`, so full↔mini reuses the mechanism that exists rather
  than adding a second one.
- `usePresentation` and `useAudioPresentationStore` stay as the single writers
  per lane, per their existing "gestures only" rule. D9 changes how the value
  is *consumed* — never which component is mounted.

**Gate:** `tsc` 0 · `eslint --max-warnings 0` · `jest` no regressions · device:
expand→minimize→expand on BOTH lanes with no black frame, no re-subscribe
flash, and live video in the dock. Confirm by instrumentation, not by eye:
`useTransport().state` identity must not change across a presentation change.

### Progress — 2026-10-19

**Stage 6 + 7 (video lane) — DONE, device-verified.** `SimbaVideo` is in the
tree, `MainActivity` no longer mounts a surface, `useVideoSurface` is deleted,
`BrowsingStack` blanks and never unmounts. Two P0s were found on device and
fixed:

- **The cold-start red screen.** `videoPresentation` initialised to
  `'expanded'`, which was only ever survivable because the deleted
  `videoSurfacePresented` mask hid it. Removing the mask exposed a value that
  was simply wrong. `PlayerProvider` calls `initPlayer()` in a **mount effect**
  and React runs **child effects before parent effects**, so the chrome's
  bridge calls beat it — 8 × `IllegalStateException: MpvPlayerModule not
  initialized. Call initPlayer() first.`
- **The black video was never a surface problem.** The Fabric view mounted,
  the surface attached with real extents (`surfaceChanged: 1080x1907`),
  `vo=gpu` was set, and the renderer worked. The cause was the archive.org
  adapter: it filtered on `source === 'original'`, which excluded exactly the
  files that exist to be streamed, preferred the LARGEST candidate, and made
  AVI-only items unplayable. It streamed a 733 MB Cinepack AVI; mpv reported
  `MPV_ERROR_LOADING_FAILED (-13)`. Fixed: h.264 derivative by SUBSTRING
  match, smallest file wins, AVI demoted to a last-resort fallback. Decoded
  frames paint.

**Stage 9 (video lane) — DONE, not yet device-verified.** One mounted
`<SimbaVideo>` per lane; fullscreen and the dock differ by a `style` on the
picture's wrapper, never by which component is in the tree. The dock publishes
its slot in WINDOW pixels and the lane publishes its own WINDOW origin;
`dockStyleFor` converts one into the other. Both are published to the store
rather than held as local state, because RNTL v14 removed `createNodeMock`
and a local `useState` would be permanently `null` under test — the wiring
between the two measurements would go unverified. 19 new tests; mutation
check 11/11.

**App shell — DONE.** `App.tsx` is a provider stack again (`App.tsx` /
`src/app/AppRoot.tsx` / `src/app/AppContent.tsx`). `ActivityShell` is
dissolved: it existed for the two-Activity split, and the only thing that
still forces a component boundary is the React rule that a component cannot
consume a context it provides itself — `App` renders `ThemeProvider`, and the
ErrorBoundary's fallback palette is built from the theme.

---

## 6. What deletes vs. what stays

**Gone:** the "content index 0" invariant and its four-paragraph defence · the
window-pixel ⇄ margin translation in `setVideoBounds` · the 0×0 hide/show
lifecycle · `PlayerSurface.mount(activity)` · `BrowsingStack` · the dead
`MpvRenderViewManager` (registered nowhere).

**Stays:** `PlayerCommands` (already correct, already tested) · the audio lane
exactly as-is (`AudioPlayer` is a working `zIndex: 40` overlay and is the shape
video is converging on) · PiP via `PipManager` · MediaSession / foreground
service / queue.

---

## 7. Open risks — stated, not hidden

| Risk | Status |
|---|---|
| **Black video is not yet attributed.** | The Yoga↔SurfaceView finding makes D2 the strongest hypothesis, but Stage 1 decides. **Do not claim the migration fixes it before the control test runs.** |
| **Hardware back is dead app-wide.** | Cause **unresolved**. Do **not** write a fix from static reading. Two candidates inside `MainActivity.onBackPressed()` (lines 219-235): the `dispatchKeyEvent` guard `if (handled) return`; and `ReactHostImpl.onBackPressed()` returning `true` unconditionally. Instrument with `Log.i` per branch, rebuild, read logcat. |
| **Duration never reported on BOTH lanes.** | `--:--`, false `LIVE` badge, seek bar disabled, prev/next greyed out — while the feed knows the episode is 55 min. Untouched since 2026-10-15. |
| **Fabric can drop and recreate a view** under memory pressure. | mpv handle must survive. `setNativePtr` already resets `attachedSurface` and re-binds — designed for, but needs a **test, not an assumption**. |
| **`force-window` stickiness.** | `attachSurfaceLocked` sets `force-window=yes`; the class comment forbids toggling it mid-frame. Must be re-verified under RN layout churn. |
| **Release cycle is serial and slow.** | Nothing after Stage 2 can be tested until Stage 5 publishes. |
| **Emulator instability.** | Wedged to `offline` twice. Recovery: kill lingering `emulator`/`qemu-system-x86_64`, `adb kill-server`/`start-server`, cold boot `-no-snapshot-load`. `-wipe-data` is next escalation. |
| **Unverifiable on emulator.** | Bluetooth; OEM PiP quirks. |

---

## 8. Carried-forward register

Enumerated individually so nothing is forgotten. Updated at every wave exit.

**Blocking the video lane**
1. Black video — control test (Stage 1) precedes all render work.
2. Hardware back P0 — instrument, do not guess.
3. Duration `P1` on both lanes.
4. mpv-handle survival across Fabric view remount — needs a test.
5. `force-window` re-verification under layout churn.
6. **Stage 9 device verification** — the video lane's D9 rewrite is unit-tested
   but not yet seen on a device. PiP in/out, the dock showing live video, back
   at each level, and no black frame on expand↔mini.
7. **Stage 9 audio lane** — the video lane is on D9; the audio lane still
   switches component identity (`audioMode === 'expanded' ? <AudioPlayer/> :
   <MiniPlayer/>`). The full-screen audio player and the dock are two
   components, so the audio lane still has the unmount the video lane just
   lost.
8. **Buffering cannot be shown yet** — `MPV_EVENT_PROPERTY_CHANGE` is never
   delivered (the lib's own "OPEN NATIVE DEFECT (1.8.4)"), and the 1 Hz poll
   that backstopped position/duration was removed in lib v1.10.0. `isBuffering`,
   `seekable`, `isSeeking` and `cacheRanges` have **no fallback at all**.
   Separately, `deriveBufferedRanges` maps mpv's cache ranges straight into
   `startMs`/`endMs` while the native side sends `seekable-ranges` in SECONDS
   with a fallback to byte OFFSETS — the bridge does not record which unit it
   sent, so a 60 s range becomes 60 ms and a byte offset becomes a clamped
   whole-file bar. See `md/SIMBA_V22_BUFFERING_UI_RESEARCH.md`.
9. **The deep-link path bypasses the app's session seam.** `useOpenFromUrl`
   (lib) calls the lib's `openPlayer` directly, not the app's
   `useResumeAwareLaunch`, so a deep-linked file gets no now-playing entry,
   no history checkpoint and no dock — and it is the one path where the
   `<SimbaPlayer resumePolicy>` lookup still fires. Needs a lib-side
   derive-only export (1.15.1) so the app can route the URI through its own
   seam.

**Migration mechanics**
6. `codegenConfig` `"modules"` → `"all"`.
7. Fabric `ViewManager` for `MpvRenderView`; register in `PlayerPackage`.
8. Presentation commands on the view ref.
9. Yoga `requestLayout()` guard.
10. Release cycle + `npm install` (Stage 5).
11. App swap + `BrowsingStack` removal (Stages 6-7).
12. Revise 17 test files / 4 956 lines.

**Dead code (verified)**
13. `MpvRenderViewManager` — registered nowhere; `PlayerPackage` has no `createViewManagers`.
14. `AudioLyricsView` (525 lines) — 0 call sites.
15. `AudioVisualizer` (143 lines) — 0 call sites.
16. `lib PlayerSurface.kt` + mount path — deleted at Stage 7.

**Product / UI**
17. Title renders literal quotes — `"El Ciclo ( 1964)"` (feed data bug).
18. Stray `2×` and `☀ 100%` / `♪ 100%` chips floating mid-frame in video chrome.
19. FAB overlapping the Music card.
20. Full device matrix — PiP in/out, dock rotation, a→v→a, back at each level, next/prev.
21. C-07 artwork + `setAutoEnterEnabled` / `setExpandedAspectRatio` / portrait restore.

**Housekeeping**
22. LogBox "Open debugger to view warnings" — CDP `Runtime.enable` times out; blocked.
23. 9 unused `textContent.ts` entries + `HistoryScreen:99` dead branch.
24. Jest force-exit flake (leaked handles) — needs `--detectOpenHandles`.
25. Emulator `-wipe-data` escalation if it recurs.

---

## 9. Working rules that apply to every stage

- **Never trust a green build alone** — verify which source copy compiled.
- **Tests pin the contract** and must fail without the fix. Mutation-check every
  "must not do X" test. A harness that cannot prove it saw a result must print
  `HARNESS-ERROR`, not a verdict.
- **Never let `tsc` pass on a lib that isn't installed.** Verify the symbol in
  `node_modules`.
- **Tags must be annotated** (`git -a`). Verify with `git ls-remote --tags origin`.
- **Lib gates:** `tsc --noEmit`, `jest`, `gradlew …compileDebugKotlin` from
  `lib/example/android`. Lib has no ESLint config.
- **App gates:** `npx tsc --noEmit`, `npx eslint . --ext .ts,.tsx --max-warnings 0`, `npx jest`.
- Repo bans `Alert.alert` — use `useToast()` / `useConfirmDialog()`. ESLint bans
  raw colour literals and `no-void`.
- **Windows:** PowerShell only; `;` not `&&`; no `grep`/heredocs; commit via
  message file + `git commit -F <file>`. Single-quoted PowerShell strings —
  double quotes eat markdown backticks.