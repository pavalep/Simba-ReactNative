# SIMBA V22 — Player Master Plan (single index, dated)

> **Created:** 2026-10-16 · **Owner:** player architecture
> **App repo:** `MOBILE_APP_REACT_NATIVE` @ `f5/w22-close-minimise-d9` / `c522f33` (remote `pavalep/Simba-ReactNative`)
> **Lib repo:** `react-native-media-player` @ `main` / `5e8de6e`, version `1.23.0` (remote `pavalep/react-native-media-player`)
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
| **`SIMBA_BUG_TRACKER_2026_10_21.md`** | opened 2026-10-21, live | 🟢 **LIVE — the finding record.** Every defect, fix, product decision and external non-defect, with its evidence. The file name is the day it was OPENED, not the day it was last touched. |
| **`SIMBA_V22_RN_MEDIA_MODULE_INTEGRATION_RESEARCH.md`** | 2026-10-16 | 🟢 **LIVE — authority on integration pattern.** Primary-source comparison of react-native-video v6/v7, expo-video, vision-camera. |
| `SIMBA_V22_DEVICE_FINDINGS_AND_RN_ARCHITECTURE_BRIEF.md` | 2026-10-16 | 🟡 **LIVE-PARTIAL.** §1–§3, §5 device findings valid. §4.2 **corrected** — TextureView withdrawn. |
| **`SIMBA_PLAYER_V21_TRACKER.md`** | rolling, top handoff 2026-10-16 | 🟢 **LIVE — per-finding state.** Newest handoff block at top. |
| **`SIMBA_V22_PINNED_PLAYLIST_SPECIFICATION.md`** | 2026-10-29, UI/UX 2026-10-30 | 🟡 **LIVE-PLANNED — the pinned / mixed-lane playlist feature.** What the user asked for, the gap measured in the source (`file:line`), the decisions D-P1 … D-P9, **the UI/UX** (§4: the rules, the reused primitives, the new `PlaylistCover` and pin badge, the one management page, the empty states, the motion, the accessibility), the data model, the risks. Nothing implemented yet. |
| **`SIMBA_V22_PINNED_PLAYLIST_TRACKER.md`** | 2026-10-29, UI/UX 2026-10-30 | 🟡 **LIVE-PLANNED — the execution plan for that feature.** 8 phases, 51 tasks, each with the `file:line` it touches and an `Evidence:` line. |
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
*(2026-10-28: the LIB's own `PlayerRoot` did **not** satisfy this — it fell back
to a 564-line `DefaultControls`. Register item 28 records the decision to remove
it, which is a MAJOR release. The APP has always satisfied D5: it imports
neither `DefaultControls`, `PlayerRoot` nor `PlayerSurface`.)*
*(2026-10-29: **the exception is closed.** Lib `2.0.0` removes `DefaultControls`
and `DefaultControlsProps`. `<PlayerRoot>` now renders the surface and the
consumer's own `renderControls` output — and **nothing else** when the consumer
supplied none. The library ships no chrome at all. `renderControls` stays
optional, deliberately: the common case is a consumer that drives the player
itself and never renders a full-screen control bar. See register item 28.)*

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

**Applied to BOTH lanes in W22 (2026-10-21).** The video lane was already D9
(the `<SimbaVideo>` view is mounted once and only its geometry changes), but
the audio lane still switched component identity
(`audioMode === 'expanded' ? <AudioPlayer/> : <MiniPlayer/>`). W22 collapsed
it: `AudioPlayer` now mounts ONCE and owns both its expanded page and its
dock — the root's style switches between the two geometries and only
per-part visibility changes. The shared `MiniPlayer` component was deleted
outright. Each lane renders its own mini form inside ONE mounted tree:
`VideoDock` inside the video lane, the dock inside `AudioPlayer`.

**The dock is never a second picture.** The video dock is a transparent
overlay rebuilt from opaque plates around a measured hole; the live video
shows through it. It never renders a `<SimbaVideo />`, because the lib's
`attachSurfaceLocked` rebinds the mpv surface on every `setNativePtr` — a
second view would STEAL the picture from the first. That is the same
two-owners-one-handle conflict D9 exists to prevent, reached from the other
direction.

**CLOSE and MINIMISE are different verbs now.** They used to be one control
(back minimised). They are not: back **closes** — the native
`stopPlayback()` (engine stops, service released, notification dismissed)
followed by `endSession()`; the chevron-down in the bottom transport row
**minimises** — the same mounted lane, restyled, still playing. One owner
per verb: `useClosePlayback()` in `src/infrastructure/player/` is the only
thing that tears playback down, and every close affordance in both lanes
routes through it. Two owners of one teardown drift.

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

**This table is the 2026-10-16 measurement, not today's file list.** What
actually shipped is §8's register; the tier names below drifted as the work
landed — the `MiniPlayer` and the `VideoController` subsystem are **deleted**,
not rewritten, and a `VideoSurface.tsx` exists today at a different path.

| Tier | Count | Detail |
|---|---|---|
| **Deleted** | 5 files, ~420 lines | `useVideoSurface.ts` (178) · `VideoSurface.tsx` (94) · `BrowsingStack.tsx` (95) · the `PlayerSurface.mount(activity)` **call** (the file itself was NOT deleted — see item 21) · `MainActivity` mount path |
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

### Stage 1 — Control test *(before any render code)* — **RUN 2026-10-19**
Push `.scratch-test-video.mp4` through the current pipeline.
**Gate:** we can say whether the black video is emulator SwiftShader or an app
defect. **No rendering change may be written before this result exists.**
**Result: an APP defect, and not the surface.** The Fabric view mounted and
the renderer worked; the archive.org adapter was picking the wrong file. See
§7 and register item 1.

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

### Progress — 2026-10-19 (evening): the buffering wave

**Lib 1.16.0 — released, published, installed.** The buffering signal had
three mpv properties tangled into two events with contradictory rules. Now
one owner per fact: `paused-for-cache` → `isBuffering` (a stall),
`cache-buffering-state` → `cacheFill` (a level), `demuxer-cache-state` →
`cacheRanges` (the buffered timeline). `cache-buffering-state` used to write
`isBuffering = percent < 100`, which is true for most of a stream's life, so
the spinner could latch on during healthy playback. The bridge now also
converts mpv's seconds to **milliseconds** and **refuses** to forward the
legacy byte offsets as a time range. `onCacheFill` is a new public event.

**The "property events never arrive" claim was FALSE, and is now measured.**
The app's elapsed time advanced 0:00 → 2:28 on device, which can only happen
if `time-pos` property events arrive. The lib's "OPEN NATIVE DEFECT (1.8.4)"
note is replaced with the measurement and its evidence. The bridge also logs
the **first arrival of each property once per session**, so the property path
is observable in every build — the reason the stale note survived so long is
that it was not.

**What mpv's cache ranges actually are — read from mpv's source, not assumed.**
`demuxer-cache-state.seekable-ranges` is **not** the file's seekable extent.
mpv derives it in `update_seek_ranges()` (mpv `demux/demux.c`) from the demux
queue's **packet extent**, so each entry is a time span of the data mpv
currently holds — the buffer islands a seek bar has to draw. Each entry is
`{start, end}` and nothing else (mpv `player/command.c`); the bridge comment
that claimed `{start, end, flags}` was false and is corrected. **No 1.17.0 is
needed** — the 1.16.0 payload is correct, and the app was the part that was
wrong.

**App: the phase is derived from the lib.** `usePlaybackState` derived the
phase and then **handed it to `VideoController`**, which owned the phase the
chrome renders. The controller discarded every observation — its guard was
`if (!this.state.currentItem) return;`, and `currentItem` is only set by
`controller.loadFile()`, which has **zero call sites** (the LIB loads the
file). So the controller's phase stayed `'idle'` forever, and because the
controller's phase won, so did `videoState`. Two things were dead because of
it, and both had been reported as separate bugs:

- the **loading overlay could never appear** → a buffering video showed nothing;
- the **error overlay could never appear** → a failed load was a silent black
  screen.

The phase is now derived from the lib and nothing round-trips through the
controller. The controller's stickiness is not lost: the lib clears
`state.error` on the next `onFileLoaded`, so the error was already scoped to
its session — a second owner of a fact the lib already owned, and the stale
one was winning.

**App: the buffered bar lied in two different ways.** `deriveBufferedRanges`
described `cacheRanges` as byte offsets, and fell back to the `cacheFill`
percentage, inventing a range from 0 to `durationMs * cacheFill / 100`. That
fallback is not a time range: the cache fills **forward from the playhead**
and the bitrate varies, so "40% of the cache is full" says nothing about which
40% of the timeline is buffered. **A percentage is a level, and a level is not
a position.** The fallback is gone. The window is now the contiguous
**prefix** of the buffer — ExoPlayer's `getBufferedPosition()`, YouTube,
Netflix and Plex all draw one continuous bar from 0 — with **sub-second gaps
merged** (mpv's demuxer opens and closes gaps of a few tens of ms while
reading ahead, so separate ranges make the bar flicker). Islands are **not**
merged into one span: that claims unbuffered data is buffered, and a user who
seeks into the "buffered" region then stalls.

**App: the overlays were in the wrong place, and the Retry had no target.**
Both overlays lived inside `ExpandedChrome`, which renders only when expanded.
A cold-start video begins minimised, so a cold-start **load failure happened
in the dock**, where the error overlay was not mounted — the dock showed a
black square with no error and nothing to do. Both overlays are now siblings
of `<VideoSurface>` inside the picture's box, so they cover the picture
wherever the picture is: fullscreen **and** the 44 pt dock slot. They are also
out of the chrome's auto-hide, which is correct — a spinner that hides itself
while the video is still stalled is not a spinner. The dock slot is 44×44, so
the dock shape is a small spinner with no caption, and the error's dock shape
is the title alone (a button under 44 pt is below the touch-target floor;
the actions are one tap away). The accessibility label still carries the
state, so a screen-reader user is not left with less than a sighted one.

**The Retry button never rendered.** It was gated on
`VideoController.getState().currentItem`, which is always null. The real
target is the app's own now-playing session, written by the launch seam that
started the playback; the retry re-launches it through that same seam, so
there is one launch authority and no second path.

**The spinner flickered.** Video.js's buffering indicator has a 500 ms onset
delay (a stall shorter than that is never shown) and UX Tigers asks for a
~0.5 s minimum visible time. Both are in `useDelayedVisibility`, which keeps
its timers in refs so an unrelated re-render cannot push the onset forward
forever.

**Gates.** App: `tsc` 0 · `eslint --max-warnings 0` 0 · `jest` 94 suites /
1168 passed / 1 todo. Mutation check **14/14 killed** — and the harness found
a real gap on the way: a zero-length range was not covered, so the "inverted
ranges are dropped" test could not fail until it was added. Lib: `tsc` 0 ·
`jest` 14 suites / 250 tests · `compileDebugKotlin` BUILD SUCCESSFUL.

---

### Progress — 2026-10-20 (evening): the movie test, and the three defects it found

The right test is the obvious one: *play a movie and check the buffer state*.
Doing exactly that — Movies → archive.org → a 1971 short, over a throttled
link (`adb emu network speed edge`, 240 kbps) — found three defects that no
unit test could see, because all three are about what the app **does** with
the facts, not about the facts.

**1. The error card's buttons were DEAD.** The card rendered perfectly:
"Something went wrong", "Retry", "Close", on the picture — with the video
*playing* behind it. And pressing them did nothing:

| Pressed | Result |
|---|---|
| `Retry` | **no second `loadFile`** in the native trace |
| `Close` | playback did not stop |
| `Mute` (transport bar, in the chrome) | **worked** — label flipped to "Unmute" |

The difference is z-order. `VerticalSwipeGestures` is an RNGH
`GestureDetector` — a **native** view — and a native gesture view **claims
the touches in its bounds**. It lived in `ExpandedChrome`, a *later* sibling
of the picture's box, so it was painted above the picture and above both
overlays, and it swallowed every touch aimed at the picture. The transport
bar is a later sibling of the gesture layer, so it still worked. A recovery
UI whose controls cannot be pressed is worse than no card at all: it
promises a way out and does not deliver.

The layering every shipping video player uses is

```
picture  <  gesture layer  <  transient overlays  <  chrome controls
```

so the gesture layer belongs to the **picture** (it is "touch on the video"),
not to the chrome. It has moved into the picture's box, between
`<VideoSurface>` and the overlays: the overlay's controls are live again,
and the chrome's controls stay above everything.

**2. There was no spinner, because there was no "the file is opening" phase.**
The load took **9 seconds** (`loadFile` 15:36:51 → `fileLoaded` 15:37:00)
and showed **nothing**. Two facts were both wrong during that window:

- `state.isPlaying` — mpv's core state is "playing" from the moment
  `loadfile` is called until the file has been parsed. "playing" during a
  load means "the engine was told to play", not "the file is playing".
- `hasSession` — the playlist is not populated until the file arrives, so
  "idle" during a load means "no playlist entry yet".

So "preparing" was unreachable, and the loading overlay — which was correct
all along — was never given a phase it could act on. The fact is not
derivable from anything mpv reports: **the lib is the only layer that knows
a load was *asked for***. **Lib 1.17.0** therefore emits `onLoadRequested`
the moment a load is requested (before the native call, so the consumer sees
"opening" for the whole of the load) and exposes `PlayerState.isLoading` —
true until `onFileLoaded` (the file arrived) or `onEndFile` (it ended, or
failed). The app's phase derivation now has a real "preparing".

**3. Every failure said `E_RENDERER_GONE`, and the code was `NaN`.** One
device log line showed all of it:

```
[listener:error] code=-1 recoverable=false message=AudioTrack Init failed
[error] code=E_RENDERER_GONE numeric=0 message=AudioTrack Init failed
```

- The native bridge emitted `onError` **twice**: once with a numeric `code`,
  then again with a **string** `code`, where the contract says `code: number`.
  The second emission won, so the app read `Number("E_RENDERER_GONE")` → `NaN`.
- The mapping collapsed every terminal failure into "the video output died" —
  including a plain load failure. mpv's numeric code is now the primary signal
  (`mpv/include/mpv/client.h`'s `mpv_error`: `-13` LOADING_FAILED,
  `-14` AO_INIT_FAILED, `-17` UNKNOWN_FORMAT, `-20` GENERIC, …).
- The `-1` was a **fabricated sentinel**, not an mpv code: it came from a
  fatal-level mpv *log line*, and `-1` is `MPV_ERROR_EVENT_QUEUE_FULL`. A log
  line is not proof that playback stopped — on the emulator (no audio device)
  mpv logged "AudioTrack Init failed" while the video played on, and the card
  covered the **working** picture.

So `recoverable` now means **"playback continued"**: mpv's `END_FILE` (the
file failed) is `false`; a fatal-level log line is `true`. Only a terminal
failure renders the card. And a non-terminal failure can no longer mask a
terminal one — mpv can report a log line *after* the file has already failed.

**Gates.** App: `tsc` 0 · `eslint --max-warnings 0` 0 · `jest` 95 suites /
1180 passed / 1 todo. Mutation check **8/8 killed** (four app, four lib) — and
the harness's self-test caught a stale expected count **in the harness
itself**, which is the whole point of having one. Lib: `tsc` 0 · `jest`
15 suites / 258 tests · `compileDebugKotlin` BUILD SUCCESSFUL, verified
against the patched source (the example's `node_modules` copy is a junction
to the repo, and the compiler's warning line numbers match the patched file).

**Device proof so far.** The error card renders on the picture with its copy
and both actions; the card was dead because of the z-order above, which is
now fixed and awaiting its re-verification. `lib 1.17.0`'s first-arrival
logging and the `demuxer-cache-state` observation were both confirmed live on
the device.

### Progress — 2026-10-20 (night): "the buffer indicator in the progress bar is missing"

The report was one line and one screenshot, and the screenshot was the whole
case: a seek bar with a grey track, a thumb parked at ~4 %, the elapsed time
`25:23` and the remaining time `--:--`. **No gold played fill, no buffered
segment.** The bar was not "showing the buffer badly" — it was showing
**nothing at all**, because the app had no length of file to draw against.

**The cause was in the library, not the app.** The lib publishes the same
playback facts through two contexts, and they disagreed:

```
state.durationMs    = 7673792   (correct)
progress.durationMs = 0         (wrong)
```

`stateRef.current` was written **synchronously**, in the event handler.
`progressRef.current` was written **inside the `setProgress` updater**, which
React defers to the render phase — so the progress ref was one flush behind
the state ref. mpv delivers `duration` and `time-pos` inside **one batch**
(measured on device: `fileLoaded` 19:29:59.615, `time-pos` 19:29:59.616,
`duration` 19:29:59.619), so the second event of the batch computed its next
progress from a **stale** progress that did not yet contain the duration, and
overwrote it with `0`.

The damage cascaded exactly as the screenshot shows: the app gates the
buffered window on `durationMs > 0` (a buffered range is a *window* into the
file, so it has to be normalised against the length), so a zero duration made
the window empty — **no buffered indicator was drawn at all** — and the played
fill and the remaining time went with it.

**Lib 1.18.0 — released, published, installed.** `progressRef.current` is now
written synchronously, in the event handler, in lockstep with
`stateRef.current`. This also makes the `setProgress` updater *pure*: it used
to write the ref from inside a function React may invoke more than once.

*Tests:* new `PlayerProvider.progressContext.test.tsx` (5 tests) — the
duration survives in the progress context when duration and position arrive
in one batch, in either order, across a long interleaved run, and together
with the buffered ranges. *Mutation check:* **5/5 killed**, and the harness
now verifies its own restore by hash and re-runs the suite green afterwards —
because the first run of that harness left the **mutant in the working tree**
(`process.exit()` inside a `try` skips the `finally` that restores the file).
The "fix is pinned" claim was worth nothing until the harness could prove it
had put the source back.

**Device proof.** A fresh provider (app restarted, no file) → a movie loads →
`duration` arrives **by event**, not by hydration:

```
property:first name=duration  20:55:24.674
progress.durationMs = 4918962   (1:21:58)
seek bar: "Remaining -1:19:38", gold played fill present
```

The remaining time, the played fill and the buffered band are all back.

**What the screenshot could not show, and the measurement that did.** The
buffered band is drawn (proved with a temporary `rgba(255,0,0,1)` token and a
pixel sample of the track), but on a feature-length film it is *always* under
the thumb, and therefore invisible:

| quantity | measured |
|---|---|
| track width | 690 px (230 dp) |
| buffered band (mpv's `cache-secs=120` ⇒ ~120 s ahead) | 16 px (2.4 % of 1:21:58) |
| thumb | 14 dp = 42 px, so its **half** is 21 px |

The band is `[0, bufferEnd]`; the gold played fill covers `[0, playhead]`; the
thumb covers `[playhead ± 21 px]`. The band is only visible between the
playhead and `bufferEnd` — and that gap is **16 px wide while the thumb's half
is 21 px**, so the thumb covers the whole of it.

> **Corrected 2026-10-21.** This paragraph used to say the app's rule was
> "right" because *"YouTube, Netflix and Plex all draw ONE continuous grey bar
> from 0 to that position, with the playhead drawn on top of it"*, and that
> *"nobody draws a segment map"*. That claim was checked against each
> player's own source and it is **wrong in the parts that matter** — Video.js
> draws one element per buffered range, and Plex's buffered fill is brand
> amber, not grey. The rendering was therefore not "right"; it was
> under-specified. See the 2026-10-21 progress block below, and
> `md/SIMBA_V22_BUFFERING_UI_RESEARCH.md` §3.2–3.4 for the full table.

**Left open:** raise the lib's `cache-secs` / `demuxer-readahead-secs` from
120 s to ~300 s (the byte cap `demuxer-max-bytes=150MiB` already bounds the
memory, so 300 s of a ~1 Mbps stream is ~37 MB), which makes the band ~42 px
and therefore visible next to a 21 px thumb-half. It is a **native** option,
so it needs lib 1.19.0 + an APK rebuild.

**Also learned, and worth keeping:** replacing a package under `node_modules`
with `npm install` can leave **Metro serving a stale transform** of the
replaced file — the app then silently ran the old library code and the fix
"did not work" on device. The tell was that the *same* commit behaved
differently across two app restarts. Touching the file's contents (not just
its mtime) forces the re-transform.

### Progress — 2026-10-21: the buffering policy, done properly

The user's question was not "is the band drawn" but **"what IS the policy"**:
prefetch, buffer islands when you seek, what happens when you seek back, the
merging rule, and the colours — *"not only the played portion, but yet to be
played buffer space, its colour for indication from already played, track bar
colour and buffer colour"*.

**The rule this codebase was built on was wrong, and it was wrong in the code
as well as in the docs.** It said:

> ExoPlayer exposes one number … and YouTube, Netflix and Plex all draw ONE
> continuous grey bar from 0 to that position … **Nobody draws a segment map.**

Every part of that was then checked against each player's **own source**:

| implementation | segments | merge rule | buffered colour |
|---|---|---|---|
| ExoPlayer / media3 `DefaultTimeBar` | one number, drawn **playhead → end** | n/a | white 80 % |
| YouTube (2026 build) | one — the end of the range **containing the playhead** | n/a | white 40 % |
| Plex web (v4.163.0) | one, from 0 | Plex's own merged array | **brand amber 30 %** |
| Shaka Player | one envelope | envelope | white 54 % |
| **Video.js 8.x / VHS** | **one element per buffered range** | **none** | slate 75 % |
| hls.js reference player | one rect per range | none | grey, **2 px minimum** |

So: **"nobody draws a segment map" is false** (Video.js does exactly that), and
**"grey" is false for Plex** (its buffered fill is the brand colour at 30 %).
Netflix, Apple TV, Apple Music, Spotify and the Plex TV app are closed source
and were **not** verified — no claim is made about them.

**What changed in the app**

1. **Every island is drawn.** `TransportState.normalizedWindow` (ONE range) is
   replaced by `bufferedSegments` (a list). mpv really does hold a list —
   `demux/demux.c`'s `in->ranges[]`, one `demux_cached_range` per contiguous
   cached region — so a seek that jumps away leaves the old region cached and
   starts a new one. The old rule threw every range but the first away, so the
   region the user had actually seeked **to** was invisible, and so was the
   answer to *"what happens when I seek back"* (the data is still there, so
   seeking back is instant — and now the bar can show that it is).
2. **The merge rule is Plex's, not an invented one.** Overlapping ranges merge
   (`next.start < prev.end`); a gap stays a gap. The old 0.5 s "merge small
   gaps" threshold was invented — no shipping player uses a seconds-based
   merge threshold.
3. **A sub-pixel island is drawn at hls.js's 2 px floor**, so a freshly-created
   island is visible at all. An *inverted* range is a data error and paints
   nothing, rather than a 2 px sliver that claims buffer that is not there.
4. **The colours are one hue at three strengths** — Plex's pattern, and the
   one-hue ladder ExoPlayer (20/80/100 %), YouTube (20/40/100 %), Shaka
   (30/54/100 %) and Video.js (50/75/100 %) all use. `seekTrack` is now
   `empty` (neutral 28 %) → `buffered` (**brand gold 60 %**) → `played`
   (**brand gold 100 %**). The old neutral grey next to a gold played fill read
   as unrelated system chrome, which is the defect the user reported.
5. **The played fill is on-media.** It used `accent.gold`, so a light theme
   produced a *different hue* for the played fill than the buffered fill
   sitting right under it. The seek rail only ever sits on a video frame, so
   the whole `seekTrack` family is now identical in both palettes, like
   `onMediaPill` already was.
6. **Nothing is painted behind the playhead.** ExoPlayer clips its buffered
   rect to the playhead, YouTube and Plex paint the played fill over it, Shaka
   paints the played colour there. The paint order gives the same result: the
   opaque played fill covers 0 → playhead, so an island behind the playhead is
   hidden and one ahead of it is visible. **That is ExoPlayer's partition,
   generalised to islands.**
7. **`src/utils/bufferedRanges.ts` is deleted** — dead code with a *second*
   merge policy (50 ms), contradicting the one it duplicated.

**Lib 1.19.0 — released, published.** `cache-secs` and
`demuxer-readahead-secs` 120 s → **300 s**, so the band is 42 px against a
21 px thumb-half and is finally visible. The two options are not independent:
mpv takes the **maximum** of them (`demux/demux.c`, `update_opts()`:
`in->min_secs = MPMAX(in->min_secs, opts->min_secs_cache)`), so the existing
memory-pressure trim — which moved only `cache-secs` — would have had **no
effect at all** once the read-ahead was raised. Both now move together.

That trim was also **dead**: its docstring said *"Registered as a
ComponentCallbacks2 listener in `PlayerActivity.onCreate`"*, and no such
registration existed anywhere in the lib. The module now implements
`ComponentCallbacks2` and registers itself, and loading a file restores the
base window so a trim is a reaction to pressure rather than a permanent
ratchet.

**Lib 1.20.0 — released, published.** The PiP button threw instead of
entering PiP:

```
Exception in HostFunction: TurboModule method "enterPip"
called with 0 arguments (expected argument count: 2)
```

The native method has **arity 2** and TurboModule checks the argument count
on every call. The native side had been made nullable in v1.9.3 and the
codegen spec had already been given two parameters — but the **call site**
still passed none. The call now always passes two arguments (`null` for a
value that was not supplied), the spec declares them required-and-nullable
because that is what the boundary is, and the app supplies the real title and
progress percentage so the PiP notification is not the native's blank
fallbacks. New test asserts the call's **arity**, not merely that it was
called — a "was it called?" test would have passed with the broken call.
*Mutation check: 3/3 killed*, source restored and hash-verified.

**Still open:** the device proofs — the band visible ahead of the playhead
with the 300 s prefetch, and PiP entering without the crash. The APK with
lib 1.19.0's native code is built and installed; 1.20.0 changed no native
code, so Metro serves it as JS.

---

### Progress — 2026-10-21 (midday): the band is proven, and PiP turned out to be a latch

Two device proofs landed, and one of them turned into a defect hunt.

#### The band IS drawn — measured, not eyeballed

`emulator-5554`, a 1971 public-domain short from archive.org, playing. The
transport track row is **y 1949–1958** in the 1080×2400 frame, and the
track spans **x 189–891**. Sampled at 1 px:

| x | colour | what it is |
|---|---|---|
| 190–199 | `#C9A84C` | the **played** fill — brand gold, 100 % |
| 200–206 | `#96824B` | the **buffered** island — brand gold at 60 % |
| 207–243 | `#FFFFFF` | the 14 dp thumb (38.5 physical px at 2.75× density) |
| 244–255 | `#95814A` | the **buffered** island, ahead of the playhead |
| 256+ | `#474747` | the **empty** track |

The arithmetic is the proof. The empty track is `rgba(255,255,255,0.28)` on
black ⇒ `255 × 0.28 = 71 = 0x47` ✔. The buffered band is
`rgba(201,168,76,0.60)` over that track ⇒ `201×0.6 + 71×0.4 = 149`,
`168×0.6 + 71×0.4 = 129`, `76×0.6 + 71×0.4 = 74` ⇒ `#95814A` ✔ **exactly**
what the pixels say. So the three-strength ladder — empty 28 % neutral,
buffered 60 % brand gold, played 100 % brand gold — is on the device, and
the band sits **ahead of** the playhead, not behind it.

The lib's own trace agrees, live:

```
[PlaybackTrace][Bridge][cacheWindow] new load → cache-secs=300 demuxer-readahead-secs=300
[PlaybackTrace][Bridge][cacheWindow] trim level=40 → cache-secs=10 demuxer-readahead-secs=10
```

The first line is the 300 s prefetch of lib 1.19.0. The second is the
memory-pressure trim — and it is the first time that trim has ever been
seen to do anything, because the `ComponentCallbacks2` registration only
landed in 1.19.0. It moves **both** options, as it must.

#### PiP: entering works, leaving was a one-way door

The user entered PiP and it worked (no arity crash — lib 1.20.0's fix). Then
they came back and got *"stuck in fullscreen, no trackbar, no top bar"*.

The native side was provably innocent. From logcat:

```
I/MainActivity(29060): onPictureInPictureModeChanged: isInPip=false
I/MpvBridgeModule(29060): companion.onPictureInPictureModeChanged: isInPip=false instance=true
I/MpvBridgeModule(29060): companion.onPictureInPictureModeChanged: emit succeeded
```

The event was emitted. **Nobody was listening.** And the reason is a
self-latching deadlock in the app:

```
pipActive === true  →  mode = 'pip'  →  isExpanded = false
                                          →  <ExpandedChrome /> unmounts
                                          →  usePipBridge() unmounts
                                          →  the onPipModeChanged subscriber dies
```

`usePipBridge()` was mounted inside `ExpandedChrome` — the component that
the PiP state itself unmounts. Entering PiP destroyed the listener whose
job was to report that PiP had ended. The flag then stayed `true` for
good, the derived mode stayed `'pip'`, and the fullscreen player came back
with no transport bar, no top bar and no way out.

**The rule, now written into the code:** *a listener that reconciles a state
must not be mounted inside a subtree that the state unmounts.* The bridge
moved to `VideoPlayerChrome`, which `AppRoot` mounts unconditionally for
the whole app session.

Why the unit test could not see it: `__tests__/infrastructure/player/
usePipBridge.test.ts` tests the hook in isolation, and the hook is correct
in isolation. The bug is in **where** it is mounted, and a hook test has
no tree to mount it in. So the regression test is a composition test —
`__tests__/components/player/video/VideoPlayer/VideoPlayerPipExit.test.tsx`
renders the real `<VideoPlayer />` with the real bridge and the real
presentation derivation, and only replaces the lib's event emitter.

*Mutation check: 3/3 killed* (moving the hook back into `ExpandedChrome`),
source restored and hash-verified, suite green after the restore.

#### A second road to the same latch: the request that was never answered

While fixing that, the second half of the same contract turned out to be
missing. The native `enterPip` returned `Unit` and swallowed every failure
— no activity (silent `return`), SDK < N (silent `return`),
`enterPictureInPictureMode` returning `false` (**the boolean discarded**),
and a throw (caught, logged, swallowed). A **refused** request was
therefore indistinguishable from a successful one, and the app suppressed
its chrome on the strength of a guess. The only thing that brings the
chrome back is the PiP-**exit** event, which for a request that never
happened never comes.

The old code even named the recovery it expected: *"let the JS-side 5 s
recovery timer in `VideoPipAdapter` take over"*. **There is no
`VideoPipAdapter` in this repository** — it was removed with the V12
single-activity architecture — so nothing was taking over and the comment
was simply false.

**Lib 1.21.0 — released, published, installed.** `enterPip` now returns
the OS's own answer, all the way out:

| case | old | now |
|---|---|---|
| no activity | silent `return` | `false` |
| SDK < N | silent `return` | `false` |
| `enterPictureInPictureMode` returned `false` | boolean discarded | `false`, relayed |
| it threw | caught, logged, swallowed | `false`, relayed |

`PlayerCommands.enterPip` returns `boolean` through the codegen spec, the
facade and the command implementation; the NOOP bridge answers `false`,
because a stub that does nothing did not enter PiP. The app's
`PiPToggle` and the imperative ref now drive `setPipActive()` from that
answer instead of hard-coding `true`. The 1.20.0 arity contract is
unchanged — the call still always passes two arguments.

*Lib mutation check: 3/3 killed* (dropping the `return` from the command
implementation, which is exactly what the old `void` contract did).

Two Kotlin details worth recording, because both cost a build:
`try`/`catch` in **statement** position is not a function's return value in
Kotlin — only an **expression** `try` (`return try { … }`) produces one,
and the compiler's "Missing return statement" was the tell. And the
example app's `node_modules/@simba-dev/react-native-media-player` is a
**junction** to the repo, so the gradle gate really does compile the
edited source — verified rather than assumed.

#### Device proof: PiP in → out → the chrome comes back

On the rebuilt APK (lib 1.21.0's native code, 8 m 01 s, four ABIs):

```
I/MainActivity: onPictureInPictureModeChanged: isInPip=true
I/MpvBridgeModule: companion.onPictureInPictureModeChanged: isInPip=true
I/MpvBridgeModule: companion.onPictureInPictureModeChanged: emit succeeded
```

and the PiP params carried the app's real values, not the native's blank
fallbacks: `title="The Rifle - USMC Training Film 1960s" subtitle="20 %"`.

Exiting PiP:

```
I/MainActivity: onPictureInPictureModeChanged: isInPip=false
I/MpvBridgeModule: companion.onPictureInPictureModeChanged: isInPip=false
I/MpvBridgeModule: companion.onPictureInPictureModeChanged: emit succeeded
```

…and the chrome came back — top bar (back chevron, title, lock, bookmark),
transport bar (elapsed, seek bar, remaining), and every control. The
playback ran through the whole round trip (3:29 → 5:28). **The exact
symptom the user reported is gone.**

The same frame is also the best proof yet of the buffering policy, because
the playhead is now well past the start and the three bands are cleanly
separated. Sampled at 1 px on the track row (y 1953):

| x | colour | band |
|---|---|---|
| 191–335 | `#C9A84C` (201,168,76) | **played** — brand gold, 100 % |
| 341–377 | `#FFFFFF` | the thumb |
| 383–~500 | `#95814A` (149,129,74) | **buffered** — brand gold, 60 % |
| ~521+ | `#474747` (71,71,71) | **empty** — neutral, 28 % |

The arithmetic again, and it is exact: the empty track is
`rgba(255,255,255,0.28)` on black ⇒ `255 × 0.28 = 71 = 0x47`; the buffered
band is `rgba(201,168,76,0.60)` **over** that track ⇒
`201×0.6 + 71×0.4 = 149`, `168×0.6 + 71×0.4 = 129`,
`76×0.6 + 71×0.4 = 74` ⇒ `#95814A`. So the policy is one hue at three
strengths, and the buffered band sits **ahead of** the playhead.

#### Where this leaves the register

- **Item 8 (buffering)** — the band, the prefetch and the trim are all
  device-proven. What is still open is the *spinner* and the *Retry*
  re-launch, which need a throttled link and a terminal failure.
- **Item 6 / item 32 (device matrix)** — PiP in/out is now exercised on a
  device; the rest of the matrix is not.
- **New, from this wave:** the `enterPip` answer contract is now pinned by
  the lib's test *and* the app's test, so neither half can drift again.

---

### Progress — 2026-10-21 (late afternoon): the resume that never resumed, and the card that never had a frame

The report was two lines: *"when resumed after restarting app video position
is correct, but the left side time is wrong, check right side also"* and
*"if you look at recent, there is no the screen position image"*. Both were
real, and both were **worse than they looked**.

#### The clock was telling the truth — the RESUME was what failed

The elapsed clock, the remaining clock and the seek thumb all read ONE value
(`displayMs = scrubPreviewMs ?? state.positionMs`), so they cannot disagree
with each other. They can only disagree with mpv. The obvious suspect was
therefore not the clock but the **resume**.

Measured on the device (emulator-5554, a 21:58 archive.org training film):

| what | result |
|---|---|
| play from 0:00, let it run | elapsed `2:05`, remaining `-19:52` — consistent, correct |
| **scrub the track to 72.8 %** | elapsed **`16:06`**, remaining `-14:06` — the clock tracks mpv exactly |
| resume at a stored `17:40` | elapsed counted from **`0:00`**, and the picture was the film's **opening title card** |

A manual scrub — a seek issued *after* the file is open — landed to the
second. A resume — a seek issued in the same tick as the load — did not
happen at all. The clock was right; the resume was the thing that silently
did not happen.

The native trace says it outright:

```
[Bridge][loadFile] requested=https://archive.org/download/…/UsmcRifleVideo1960s.mp4
[Native][loadFile] result=0 pathLength=83 token=none
[Bridge][listener:event] name=startFile payload={}
[Bridge][seekAbsolute] position=1060.727        ← the resume seek IS issued
[Bridge][play] ptr=…
…
[Bridge][listener:event] name=playbackRestart payload={}
```

**There is no `name=seek` event.** For the manual scrub the log shows
`name=seek` immediately before `name=playbackRestart`. The resume's seek was
issued and never happened.

#### Why — against mpv's own source, not from memory

mpv 0.41 was cloned and read (`player/command.c`, `player/loadfile.c`):

- `cmd_seek` bails out with `cmd->success = false` while
  `!mpctx->playback_initialized`.
- `playback_initialized` is set immediately **before** `MPV_EVENT_FILE_LOADED`
  is emitted — i.e. only once the file has actually opened.
- The lib's `main.cpp` **discards mpv's return code** for `seek`, so the
  refusal was invisible: no event, no log, no error.

So `loadfile` + `seek` in the same tick is a **racy command that mpv can
refuse**, and the refusal is silent.

mpv's own answer for "start this file at 12:34" is the `start` option, and
mpv reads it **while the file opens** (`player/loadfile.c` reads
`opts->play_start` and queues the seek there). The shipped `libmpv.so` is
mpv 0.41.0, and mpv's own bundled script does the same thing
(`player/lua/ytdl_hook.lua`: `mp.set_property("file-local-options/start", …)`).

**⇒ Lib 1.22.0** writes mpv's `start` option **before** the load, through
the documented `options/start` property path. The start position becomes
part of the load: no race, no dropped command, and the first frame is
already the resumed frame. The option is written on **every** load, `0`
included, because mpv's `start` is persistent — skipping the write would
carry the last resume position into the next file.

`onPlaybackRestart` also no longer zeroes the position: mpv fires it right
after a seek, and the handler was restarting the transport bar's clock at
0:00 while the video sat at the position the user had just seeked to. The
position belongs to `time-pos`.

#### The card had no frame because no frame was ever captured

`files/simba-resume-thumbs/` **did not exist** on the device — not one frame
had ever been captured, so the Recently Played card showed its grey
placeholder for a completely different reason than "the capture failed".

The chain had three breaks:

1. **The teardown flush never wrote.** The cleanup read the *current*
   snapshot — but the render that ENDS a session also nulls the session, and
   that render runs **before** React runs the effect cleanup. So the cleanup
   found a null session, wrote nothing, and lost both the final position and
   the frame. The suite was green because it only exercised the tree
   **unmount**, where no nulling render happens first; the device path
   (close the player → the session ends) was never covered. Fixed with a
   per-session snapshot map, and the flush is no longer gated on the session
   still playing — the player is stopped *before* the session ends.
2. **A local path is not a URI.** The native returns a bare absolute path;
   an image loader parses `/data/user/0/…` as a scheme-less URI and fails.
   `toRenderableImageUri` gives a local path `file://` and leaves a remote
   catalogue URL alone (`file://https://…` names no file).
3. **The capture itself** — mpv-independent, `MediaMetadataRetriever` on the
   media URI, writing into `filesDir`.

#### What the audit turned up alongside it

A sweep of every place the app displays a playback-derived value found two
more of the same class:

- **`skipPrev` read a frozen playhead.** The `wrapped` commands memo is
  deliberately stable (it only rebuilds when the DURATION changes), so the
  closed-over `state.positionMs` was the position **at launch**. Pressing
  skip-back three minutes into a film jumped to the **previous track**
  instead of restarting the film.
- **The `file://` prefix was applied the wrong way round** in the search
  tile (`'file://' + thumbnailPath` on a *remote* URL). Recorded below.

#### Where this leaves the register

- **New invariants:** **I28** (a start position must be part of the load),
  **I29** (a teardown flush must read the state it was created for),
  **I30** (a command that decides from a live value must read it live).
- **Lib 1.22.0** — released, published, installed. `tsc` 0 · `jest` 19
  suites / 278 tests · mutation check 4/4.
- **App** — `tsc` 0 · `eslint --max-warnings 0` · `jest` 97 suites / 1199
  passed / 1 todo · mutation check 4/4.
- **Still open on the device:** the buffered-band and PiP proofs are
  unaffected (1.22.0 changed no native code, so Metro serves it as JS), but
  the resume and the captured frame need their own re-verification.

### Progress — 2026-10-21 (night): the close verb, the minimise control, and the dock that stopped being a rival

#### What was asked

Three sentences from the product owner, in order:

1. *"if back is press do close"* — back should **close**, not minimise.
2. *"add a mini plyaer icon near bottom in track bar for miniplyer, for both
   auido and video"* — a **minimise** control in the **bottom** row, in
   **both** lanes.
3. *"remove the minimplayer extra, let audioplayer and video palyer with
   react antive ui handle the miniplayer version, without attatching or
   reattatching mpv module"* — the standalone mini player goes; **each lane
   renders its own mini form**, and **the mpv surface is never re-attached**.

The third sentence is the load-bearing one. It is the same requirement as
**D9** and as D2's "one picture, one owner", stated by the product owner
without the vocabulary.

#### The three decisions this produced

**1. The close verb has ONE owner.** `src/infrastructure/player/useClosePlayback.ts`
is the only thing in the app that tears playback down: the native
`stopPlayback()` (engine stops, foreground service released, notification
dismissed), then `endSession()` so `nowPlaying.current` is null. If the
native stop throws, the error is surfaced through `useToast()` and **nothing
is cleared** — the UI stays standing rather than pretending the teardown
happened.

It deliberately does **not** write the presentation store. The presentation is
the user's standing request for the *next* video; a close is not a request
for the next video to start minimised. Writing it there is how a player ends
up opening the next title into a dock the user never asked for.

Every close affordance now routes through it: the video header's back, the
hardware back, the audio player's X, and both docks' X. Two owners of one
teardown is how a close ends up stopping the engine but leaving the session
behind (or the reverse).

**2. CLOSE and MINIMISE are different verbs with different controls.**

| Verb | Control | Effect |
|---|---|---|
| **CLOSE** | back (header + hardware), X on the player, X on the dock | stops the engine for real, releases the service, dismisses the notification, ends the session |
| **MINIMISE** | chevron-down in the **bottom** transport row, **both lanes** | the same mounted lane, restyled to the dock; **still playing** |
| **EXPAND** | the dock's leading square and title | the same mounted lane, restyled to the full player; still playing |

The audio lane's old **top-left** chevron-down was **removed**, so each lane
has exactly one minimise path. The glyph is not invented: Spotify documents
this exact control as "Minimize" on its now-playing screen, and Apple Music
and YouTube Music collapse the same way.

The withdrawn W21 F4 rule — "back minimises" — is recorded in the SPEC's
§3.2 as withdrawn, and its backing command `commands.exitPlayer()` is
**unusable as a *close*** (bug `B-008`): it routes to the lib's
`exitPipAndFinish()`, which **used to** call `finishAndRemoveTask()` on the
*current* activity — and under D1 there is one activity, so it would have
finished `MainActivity` and removed the app's task. **The Kotlin now calls
`activity.finish()`** (`F-023`, lib 1.22.0), which closes the PiP window and
leaves the task, so the *native hazard* is gone. The command stays
**deliberately unwired** all the same, because the close verb has exactly
**one** owner (`useClosePlayback()`). See register item 52.

**3. The standalone `MiniPlayer` is deleted.** Each lane owns its own mini
form inside ONE mounted tree:

- The **video lane's** dock is `VideoDock`, mounted as a child of `VideoLane`.
- The **audio lane's** dock is inside `AudioPlayer`.

`PlayerChrome.tsx` is now the **audio lane's host** — `null` for a video
session, `<AudioPlayer />` otherwise.

#### The mpv surface is never re-attached

The dock is the dangerous part, because it wants to show the video. It must
not have its own `<SimbaVideo />`: the lib's `attachSurfaceLocked` rebinds the
mpv surface on every `setNativePtr`, so a second view would **steal** the
picture from the first — two owners of one handle.

So the video dock is a **transparent overlay rebuilt from three opaque plates
around a measured hole**, and the live video shows through that hole. The
picture stays in `VideoLane`, outside the dock, and the dock is asserted by
test never to render one.

Both the hole and the window rect published for the picture come from **ONE**
`measureInWindow` pass, so they cannot disagree — the video cannot land
beside its own hole. Constants computed from the stylesheet would be one
refactor away from silently drifting.

#### The dock is always laid out, so there is no flash

The dock's opacity toggles; it is never mounted on demand. That is what lets
the slot's window rect be published **before** the user taps minimise, so the
picture moves into the dock in the *same commit* that flips the presentation.
When the dock used to mount on demand, its rect arrived one render later and
the picture was still fullscreen for a frame — a visible jump on every
minimise. The trade is an invisible bar over the bottom of the window in the
expanded presentation; it is `pointerEvents="none"` there, so it cannot
swallow a tap meant for the transport bar underneath it.

#### Where this leaves the register

- **D9 is now applied to both lanes** (register item 7 **RESOLVED**).
- **New register group** "Player chrome (new, 2026-10-21 night)", items
  **48–52**. Items **48–51 are RESOLVED** by the 2026-10-26 device proof
  (the close verb, the minimise control, expand ⇔ mini with no mpv
  re-attach, and the dock's transparent hole); item **52** stays open — it is
  a lib decision, not a device proof.
- **A third group was added on 2026-10-26**, "Found on device, 2026-10-26",
  items **53–55** — the blank white screen (fixed), the empty resume-dialog
  artwork (fixed), and the app-wide dead back button (fixed: instrumented,
  measured, corrected, and re-proved on the device).
- **The SPEC was corrected, not just extended.** §3.3 gained
  `MiniPlayerToggle`; §3.4 said "there is no video mini dock in V19" while a
  dock was on screen, so it was rewritten; rules 6 and 9 still named a
  deleted `<VideoMiniPlayer />`; the §3.4.1 architectural shape still showed
  a branch on `presentation === 'mini'` returning a *different component* —
  the exact thing D9 forbids; and the §3.4.1 native paragraph still claimed
  the session is owned by a separate `PlayerActivity`, which D1 made
  obsolete on 2026-10-16.
- **Gates:** `tsc` 0 · `eslint --max-warnings 0` · `jest` 97 suites / 1202
  passed / 1 todo.
- **Still open on the device:** everything in items 48–51.

#### 2026-10-26 — the device caught three things the tests could not

The unit tests were green and the wave looked finished. The device said
otherwise. All three findings below are recorded in
`md/SIMBA_BUG_TRACKER_2026_10_21.md` (`B-022`, `B-023`, `B-011`).

**1. The close left a blank white screen.** The chrome unmounted and the
native teardown ran — and the app sat on white, unusable, until the process
was restarted. The browsing stack was blanked by the user's **REQUEST** for a
fullscreen video, and the request outlives the session by design. The window
is owned by the video only when the request is `expanded` **AND** a video
session exists; keying it on the request alone produced the white screen, and
keying the hardware-back gate on it swallowed back presses on the browsing
stack. Both now ask one question — `useVideoOwnsWindow()` — so they cannot
disagree again.

**2. The resume dialog's artwork box was empty.** The native capture returns
a bare `filesDir` path; an image loader parses a scheme-less string as a URI
and fails. The same frame rendered correctly on the Recently Played card,
because `MediaRailCard` already normalised it and `Dialog` did not. Fixed at
the render site, so every caller inherits the correction.

**3. The Android back button is dead app-wide.** Not just in the player — on
Home too, where it should have closed the app. The plan's risk table had
already flagged this as **cause unresolved, do not fix from static reading**,
and named the two candidates inside `MainActivity.onBackPressed()`. That
instruction was followed literally: the method was instrumented with `Log.i`
per branch, the APK was rebuilt, and the press was reproduced. The
measurement (`down=true` → early return → `super` never called, and the JS
probe never firing) confirmed the reading and named the culprit. The
synthetic dispatch is deleted, `super.onBackPressed()` is RN's path, and the
audio lane was given the same close verb — because the fixed native path made
the press reachable there for the first time, and a back press on the
now-playing page would otherwise have closed the whole app.

**The resume round trip, measured end to end (the original ask: "the left
side time is wrong, check right side also").**

| Stage | Reading |
|---|---|
| Card after the close | **10:04 / 21:58**, with the real captured frame and the progress bar at ~44 % |
| Resume prompt | *"Continue watching? Continue at **10:04** or start from the beginning."* |
| Player after Continue | **10:04 elapsed / -11:53 remaining** |

10:04 + 11:53 = 21:57 ≈ the 21:58 duration, so **both** sides of the transport
agree with each other and with the film. A second round trip later in the
session read **11:09 → 17:03 / -4:54** with the same self-consistency. The
frame in the prompt is the frame that was on screen when the film was closed.

**Gates for this increment:** `tsc` 0 · `eslint --max-warnings 0` · `jest`
**99 suites / 1214 passed / 1 todo**. Mutation-checked: **4/4** for the
blank-screen fix, **5/5** for the artwork fix.

#### 2026-10-26 (W23) — the cards stop lying

Two register items, one wave, and the same shape of defect in both: **a card
that composed something it did not have.** The search tile prefixed `file://`
onto a REMOTE URL; the position line printed a leading separator for a
position that was not there. Both were the renderer being asked to describe a
value nobody gave it.

**1. `ResultTile` mangled the remote URL.** `'file://' + item.thumbnailPath`,
unconditionally. `toRenderableImageUri` already existed and was already
scheme-aware — `MediaRailCard` used it; the search tile did not. The fix
splits the two jobs: `toRenderableImageUri` decides the **scheme**,
`withCacheToken` decides only the **separator and the encoding**. The split
is the point — a helper that looks authoritative about image URIs must not be
able to invent a scheme.

**2. The card line was `" / 21:58"`.** `formatDuration(0)` returns `''`, and
that is **correct**: "unknown duration" is a real state, and a `0:00` badge
would claim zero-length media on a grid tile, a stats card and a history row
alike. The formatter was therefore **not** changed — the cards were. A card
now asks one question (*is there a position?*) and prints the position segment
only when the answer is yes, through `formatPositionLine` /
`formatPositionAccessibility`. The history screen's spoken label changed from
"resume at 1:37" to "1:37 of 21:58" so the **spoken** line matches the
**visible** line.

**3. A test mock that matched a NAME, not an API.** The first run of the new
`ResultTile` test failed 4/6 with *"Cannot read properties of undefined
(reading 'cover')"* — the global `react-native-fast-image` mock was the bare
string `'FastImage'`, so `FastImage.resizeMode.cover` threw for any component
taking the image branch. The mock was rewritten to carry the library's **API
surface** (`resizeMode`, `priority`, `cacheControl` statics). A mock that only
matches the element name hid that the code under test could not run at all.

**The device, honestly.** The WITH-position line is device-proven (`4:14 /
21:58`, `5:14 / 21:58`, `1:29 / 21:58` on the Recently Played card). The
**no-position** branch is **not** device-provable on this emulator: every
playback advances the checkpoint past 0 before the card re-renders, and adb
latency makes it impossible to close the player inside the load window. It is
proven by the unit + component tests and the mutation kills only.

**Item 44 is not device-provable either, and the reason is a finding of its
own.** Reading every play entry point showed that the launch seam **accepts**
artwork (`useResumeAwareLaunch` takes `thumbnailPath` and forwards it as
`artworkPath`) but no catalogue surface supplies it:
`ArchiveItemDetailScreen` passes it only to the bookmark and add-to-playlist
sheet items, `MusicDetailScreen.handlePlay` **computes** `artwork` and then
does not pass it to `openPlayer`, and `SearchScreen`'s `playWithToast` input
type has **no artwork field at all**. So the history entry's `thumbnailPath` —
documented as "catalogue artwork" — is always empty, and the captured frame is
the only artwork the history ever has. Logged as `B-026`.

**The tracker contradicted itself, and that was worth catching.** `B-015`
("a remote frame capture is unproven") still read *"open. Unverified — no
remote capture has been exercised"*, while open question 1 in the same file
answered it **YES** two days earlier. The device settles it: `files/
simba-resume-thumbs/` holds **seven** captures from the same remote
archive.org media (`877507528`), and the newest was pulled binary-safely with
`adb exec-out run-as … cat` and checked byte-wise — **29,724 bytes, magic
`FFD8FF`**. Corrected as `F-020`. (`E-001`'s archive.org outage was a
*different*, earlier attempt; the capture path itself is sound.)

**A measured non-defect, recorded so it is not re-investigated.** The resume
prompt auto-dismisses after 8 s and the silence resolves as **RESUME**
(`autoDismissMs: 8000`, `return resume ? 'resume' : 'start'`). A slow tap on
"Start from the beginning" therefore lands on the player, not the button — so
the button *looks* broken. It is not: a **fast** tap read `1:35 / -20:22`, and
1:35 + 20:22 = 21:57 ≈ the 21:58 duration, so the film **did** start at zero.
Logged as `A-003`.

**Gates for this increment:** `tsc` 0 · `eslint --max-warnings 0` · `jest`
**103 suites / 1246 passed / 1 todo**. Mutation-checked **7/7** (baseline
29/29 green, final 29/29 green).

#### Where this leaves the register

- **Register items 44 and 45 are RESOLVED** (`F-018`, `F-019`), both by the
  W23 wave on `f5/w22-close-minimise-d9`.
- **New bug `B-026`** (P3): no catalogue surface hands its artwork to the
  history entry, so the search tile has nothing to show — and that is why
  item 44 cannot be device-proved.
- **New decision `A-003`**: the resume prompt's 8-second auto-dismiss resolves
  as RESUME. Measured; kept deliberately.
- **New fix `F-020`**: `B-015`'s stale state was corrected — the remote frame
  capture **is** proven (seven captures on the device; the newest verified
  byte-wise, 29,724 bytes, magic `FFD8FF`).
- **`formatDuration(0) === ''` stays.** It is load-bearing, and the cards were
  the defect — this is the rule the wave established: *the position segment
  appears only when there IS a position.*
- **Still open:** item 46 (`B-006`, the 600 ms transport-label freeze) and
  everything else in the register.

### Progress — 2026-10-27: the register was wrong about the code

**The register was wrong about the code.** Three of its entries were
corrected by reading the source rather than the prose, and each correction
would have sent the work to the wrong place:

- **Items 22–27 are APP files, not lib files.** `AudioLyricsView`,
  `AudioVisualizer`, `DpadController`, `BufferingBar`,
  `AudioDescriptionTrackSelector`, the `VideoController` subsystem and the
  `useBookmarkMarkers` export all live in the **app**. The register grouped
  them under "Dead code (verified)" immediately after item 21
  (`lib PlayerSurface.kt`) with no lane marker, and the "dead code in the
  lib" reading sends the whole batch to the **lib repo** — where there is
  nothing to delete.
- **`deriveNextUpView` is LIVE.** Item 27 listed it as dead. It is used at
  `NextUpOverlay.tsx:95`, and `NextUpOverlay` is mounted at
  `VideoPlayer.tsx:664`. Deleting it on the register's word would have
  broken the Next-Up overlay.
- **Item 30's chips are intentional gesture feedback, and the `2×` badge is
  TOP-CENTRE** (`top: spacing.xl`), not mid-frame. The ☀/♪ pills are the
  mid-frame ones (at 40 % height, left/right). All three auto-hide on a
  timer, clear on gesture end, and are `pointerEvents="none"` and hidden
  from accessibility.

The audits were done by **reading every play entry point and every call
site** — not by trusting the register. That is the lesson, and §9 now says
it as a rule.

**The transport clock now confirms the seek.** The tracker's symptom was
**INVERTED**: the old code did not freeze the clock on the old value for
600 ms, it pinned the clock to the seek **TARGET** for a fixed 600 ms and
then dropped back to whatever the engine had reported — so a seek slower
than 600 ms ran the clock **BACKWARDS**. The real defect was a **fixed
window where a closed loop was needed**: mpv's `time-pos` is the **only**
carrier of the new position, and there is **no** seek-completion event that
carries one (the lib's `onPlaybackRestart` explicitly refuses to own it, and
the native `seek` event carries an empty payload), so the window was a
**guess, not a confirmation**. The preview is now held **until the engine's
own position reaches the target** (`SEEK_CONFIRM_TOLERANCE_MS = 500`), with
a **bound** (`SEEK_CONFIRM_FALLBACK_MS = 1000` — four position ticks) for a
seek that never confirms. Two further defects the entry never mentioned
went with it: the timer handle was **neither stored nor re-armed** (so a
second tap inside the first tap's window had its preview cleared by the
first tap's timer), and the **drag release cleared the preview
synchronously**, so the drag path never held the target at all. The handle
now lives in a **ref** — cleared on unmount, re-armed on every commit — and
the drag release commits through the **same path**: one seek, one clock.

**Dead code, 2,670 lines.** The wave's diff is **38 files, 610 insertions,
2,670 deletions**, and **2,559** of those deletions are in **21 files
deleted outright**. The dead code itself: the `VideoController` /
`useVideoController` / `controllerSingleton` subsystem (**903** lines —
`getVideoController()` was called only from inside the dead module, so the
singleton was never constructed and `getVideoController()` always returned
`null`), `AudioLyricsView` (**525**), `AudioVisualizer` (**143**),
`DpadController` (**187**), `BufferingBar` (**113**),
`AudioDescriptionTrackSelector` (**50**, body `() => null`) — **every one
with ZERO call sites** — plus the dead `useBookmarkMarkers` export and the
384-line `VideoController` test. `deriveNextUpView` was **kept**: the
register was wrong about it.

**The layer boundary is clean.** `scripts/check-import-boundaries.js` is a
real gate, not a note in a document. It reported **2 errors** and now
reports **0**: `scanned 581 files in 2364ms — 0 error(s), 0 warning(s)`. The
two remaining violations were `src/app/AppContent.tsx:33` (`useOpenFromUrl`)
and `src/components/player/video/VideoSurface/VideoSurface.tsx:52`
(`SimbaVideo`); both lib imports now sit behind
`src/infrastructure/player/`. The picture wrapper is **deliberately not
re-exported from the app barrel**: the barrel re-exports `VideoPlayer` (a
**value**) and `VideoPlayer` imports `VideoSurface`, so re-exporting would
close the cycle `VideoSurface → barrel → VideoPlayer → VideoSurface`. The
new module `src/infrastructure/player/videoSurface.ts` is **lib-only**, so
its edge stays a **leaf**.

**The lib: four defects, one minor release.** The version goes **1.22.0 →
1.23.0** — and it is a **MINOR**, not a patch drop-in, because the
**TurboModule spec changed**: a coordinated native + JS upgrade, not a
drop-in. **Published:** commit `5e8de6e`, tag `v1.23.0`, on npm as
**1.23.0** (80 files / 989 669 bytes unpacked — the published tarball still
ships **no `.so`**).

1. **`initPlayer()` moved into the render phase** (`F-024`). React commits
   passive effects **CHILD-FIRST**, so every descendant's bridge call beat
   the provider's own mount effect while `nativePtr == 0` → `ensurePtr()`
   threw `IllegalStateException("MpvPlayerModule not initialized. Call
   initPlayer() first.")`. The sharpest instance was a **RENDER**, not an
   effect: `SimbaVideo` memoised `nativePtr ?? getNativePtr()`, and
   `getNativePtr()` does **not** throw — it answers `0` — so the first
   render bound the surface to a **null handle** and the memo never
   recomputed. The call now runs in the provider's **render phase** behind a
   **ref guard**, and the handle read is **no longer memoised**. A
   parent's render completes before any child's, so the handle now exists
   before any descendant renders. A render-phase side effect is safe
   **only** because `initPlayer()` is **idempotent**.
2. **The TurboModule `Spec` was missing `addListener`/`removeListeners`**
   (`F-026`). The Kotlin module already declared the pair, but the spec did
   **not** — and on the new architecture the interop proxy exposes only
   **spec-declared** methods, so `mod.addListener` was `undefined` and RN
   0.86's `NativeEventEmitter` warned twice and **never attached the native
   module**. The spec now declares the pair.
3. **`finishAndRemoveTask()` → `finish()`** (`F-023`). Under D1's one-Activity
   architecture `finishAndRemoveTask()` removed the app's **whole task from
   Recents**; `activity.finish()` closes the PiP window and leaves the task.
4. **A CI job that finally exercises the native download.** The postinstall
   downloads `jniLibs.tar.gz`, verifies a **SHA-256**, extracts it and
   **FAILS if any of the four ABIs is missing a `libmpv.so`** — and every
   CI job set `SKIP_DOWNLOAD_NATIVE=1`, so **CI never ran it**, while the
   published tarball ships **no `.so` at all** (~963 KB). Every consumer's
   `npm install` hard-depends on a release asset CI never validated. The new
   job — "Native download (published release asset)" — resolves the latest
   **PUBLISHED** release (the release asset is created **BY** the tag push,
   so a just-bumped version has no release yet, and testing the working
   tree would redden `main` on every version bump), checks it out, runs
   `npm ci` with the download **enabled**, and asserts all four ABIs land.

**What was measured rather than assumed.** Three hypotheses in the tracker
and the register were wrong, and reading the source is what caught them:

- **B-010's "the handle is created twice" was WRONG.** The Kotlin
  short-circuits with `return true` when `nativePtr != 0`. The handle is
  created once; the problem was **when** it was created.
- **B-013's "the deep link loses the resume position" was WRONG.**
  `<SimbaPlayer resumePolicy>` mounts `PlayerResumeProvider` and
  `useOpenWithResume` does the bookmark/history lookup, so the position
  lookup still happens. What the deep link loses is the **now-playing
  entry**, the **history checkpoint**, the **dock** and the **resume
  prompt** — it uses the lib's `useOpenFromUrl`, so it bypasses the app's
  `useResumeAwareLaunch` seam. What is actually broken is worse: a
  deep-linked **video never plays at all**.
- **B-024's quoted RN warning string was the OLDER phrasing.** RN 0.86
  emits **two separate messages**, not one "called without
  addListener/removeListeners" string.

**Gates for this increment:** `tsc` 0 · `eslint --max-warnings 0` · the
boundary checker **0 errors** (`scanned 581 files — 0 error(s), 0
warning(s)`) · `jest` **103 suites / 1246 passed / 1 todo** — the figure
**before** this wave — **plus the new suites**; the `TransportBar` file
alone now has **21** passing tests. Lib: `tsc` 0 · `jest` **19 suites / 278
passed**. Mutation-checked **8/8** — 8 mutants, 8 killed, each naming its
killer test.

#### Where this leaves the register

- **Closed by this wave:** item 46 (`F-021`) · item 20 · items 22–27
  (`F-025`) · items 29, 30, 31 · item 34 (`F-024`) · item 36 · item 38 ·
  item 10 (the decision item 20 asked for) · bug `B-020` (`F-022`) · bug
  `B-008`'s native hazard (`F-023`) · bug `B-010` (`F-024`) · bug `B-014`
  (`F-025`).
- **Still open, deliberately:**
  - **item 21** — `PlayerSurface.kt` is **live**; the registry's
    *population* is dead. It is the hinge of the video deep-link failure,
    and it needs a **DECISION** (wire the Fabric view manager, or delete the
    registry and answer `isSurfaceMounted()` from the live view).
  - **item 28** — `DefaultControls.tsx` and locked **D5**. The app imports
    none of it, but it is publicly exported and the lib's `PlayerRoot` uses
    it as the fallback — so removing it is a **MAJOR** release, or D5 becomes
    "default-off, opt-in". Still needs a **DECISION**.
  - **item 33's device proof** — and its two open halves: the Bookmarks row
    reads only `thumbnailPath`, and `setAutoEnterEnabled` /
    `setExpandedAspectRatio` **do not exist** anywhere in the app or the lib.
  - **item 46's device proof** — the seek confirmation is proven by source +
    tests + mutation, **not on a device**.
  - **items 9 / 11** — the deep-link seam and the `PlayerSurface` registry.
  - **B-009** — narrowed, not answered; the writer is most likely in the
    **app's** consumers of the lib's progress context.
  - **B-013** — narrowed, still broken for video.
  - **B-024's `getJSModule(RCTEventEmitter)` half** — every `getJSModule`
    call in the lib asks for `RCTDeviceEventEmitter`, and the string
    `RCTEventEmitter` is not in RN 0.86's JS. It needs the **device logcat
    line's tag**.
  - **B-027** — a local `npm pack` would ship ~68 MB of native binaries. A
    release-hygiene risk, not a live defect.
- **Deferred to the device — nothing in this wave was device-proven.** The
  seek confirmation, the rebuilt APK carrying the lib's native changes, the
  app's reinstall of lib **1.23.0** (published: `5e8de6e`, tag `v1.23.0`),
  and the new CI job's first run against a published release asset.

---

## 6. What deletes vs. what stays

**Gone:** the "content index 0" invariant and its four-paragraph defence · the
window-pixel ⇄ margin translation in `setVideoBounds` · the 0×0 hide/show
lifecycle · `PlayerSurface.mount(activity)` *(the **call** — the file and its
methods are still live; see item 21)* · `BrowsingStack` · the **app-side**
`MpvRenderViewManager` *(deleted at v12 — the **lib's** one is live and
registered; see items 19 and 21)*.

**Stays:** `PlayerCommands` (already correct, already tested) · the audio lane
exactly as-is (`AudioPlayer` is a working `zIndex: 40` overlay and is the shape
video is converging on) · PiP via `PipManager` · MediaSession / foreground
service / queue.

---

## 7. Open risks — stated, not hidden

| Risk | Status |
|---|---|
| **Black video is not yet attributed.** | **CLOSED 2026-10-19 — and it was never a surface problem.** The Fabric view mounted, the surface attached with real extents (`surfaceChanged: 1080x1907`), `vo=gpu` was set and the renderer worked. The cause was the **archive.org adapter**: it filtered on `source === 'original'` (which excluded exactly the files that exist to be streamed), preferred the LARGEST candidate, and made AVI-only items unplayable — so it streamed a 733 MB Cinepack AVI and mpv reported `MPV_ERROR_LOADING_FAILED (-13)`. Fixed: h.264 derivative by SUBSTRING match, smallest file wins, AVI demoted to a last-resort fallback. **Device-proven** — `Battle.of.Midway.1942.mp4` loads, `videoReconfig` fires twice, decoded frames paint. See the 2026-10-19 progress block. |
| **Hardware back is dead app-wide.** | **CLOSED 2026-10-26.** The instruction in this row was followed literally: the fix was NOT written from static reading. `MainActivity.onBackPressed()` was instrumented with `Log.i` per branch, the APK was rebuilt, and the press was reproduced — `down=true` → early return → `super.onBackPressed()` never called, and the JS probe never fired. The synthetic dispatch is deleted; `super.onBackPressed()` is RN's route to the JS `BackHandler`. Device re-proofed on both sides of the app. The audio lane was given the same close verb, because the fixed native path made the press reachable there for the first time and the lane had no handler — a back press on the now-playing page would have closed the whole app. Guarded by `__tests__/app/MainActivityBackPress.test.ts` (a source check, since the repo has no native test harness); mutation-checked 6/6. |
| **Duration never reported on BOTH lanes.** | **CLOSED 2026-10-20 (night) by lib 1.18.0.** The lib's **progress** context was losing `durationMs` (the *state* context kept it) because `progressRef.current` was written inside the deferred `setProgress` updater while `stateRef.current` was written synchronously — and mpv delivers `duration` and `time-pos` in one batch. Measured on device before the fix: `state.durationMs = 7673792` but `progress.durationMs = 0`, so the app drew **no played fill, no buffered segment and `--:--`** on a video that was playing. After: `progress.durationMs = 4918962` and the seek bar reads `-1:19:38`. See register item 3. |
| **Fabric can drop and recreate a view** under memory pressure. | mpv handle must survive. `setNativePtr` already resets `attachedSurface` and re-binds — designed for, but needs a **test, not an assumption**. |
| **A second launch produces no load — and no error.** | **Narrowed 2026-10-28 to the NATIVE side.** The app half of the chain (tap → facade → seam → session → payload → `requestId`) is read end to end, is correct, and is now pinned by a test. What is left sits BELOW `bridge.loadFile`: `MpvBridgeModule.loadFile` calls `ensurePtr()` **before** its `loadFile requested=…` log, and `ensurePtr()` throws when the mpv handle is zero — so a dead engine produces a *different* trace line and the same silence. The lib's `useLaunchPlayback` also swallows the failure in a bare `catch`, and a failure that never reaches mpv produces no `file-loaded` and no `end-file` either. See bug `B-012`. |
| **`force-window` stickiness.** | `attachSurfaceLocked` sets `force-window=yes`; the class comment forbids toggling it mid-frame. Must be re-verified under RN layout churn. |
| **Release cycle is serial and slow.** | Nothing after Stage 2 can be tested until Stage 5 publishes. |
| **Emulator instability.** | Wedged to `offline` twice. Recovery: kill lingering `emulator`/`qemu-system-x86_64`, `adb kill-server`/`start-server`, cold boot `-no-snapshot-load`. `-wipe-data` is next escalation. |
| **Unverifiable on emulator.** | Bluetooth; OEM PiP quirks. |

---

## 8. Carried-forward register

Enumerated individually so nothing is forgotten. Updated at every wave exit.

**Blocking the video lane**
1. ~~**Black video.**~~ — **RESOLVED 2026-10-19.** It was never a surface problem: the archive.org adapter was selecting the wrong file. The Stage 1 control test is what found it. See §7 and the 2026-10-19 progress block.
2. Hardware back P0 — instrument, do not guess.
3. ~~**Duration `P1` on both lanes.**~~ — **RESOLVED 2026-10-20 (night) by
   lib 1.18.0.** The lib's **progress** context was losing `durationMs` (the
   state context kept it), because `progressRef.current` was written inside the
   deferred `setProgress` updater while `stateRef.current` was written
   synchronously, and mpv delivers `duration` and `time-pos` in one batch.
   Measured on device before the fix: `state.durationMs = 7673792` but
   `progress.durationMs = 0`, so the app drew **no played fill, no buffered
   segment and `--:--` for the remaining time** on a video that was playing.
   After: `progress.durationMs = 4918962` and the seek bar reads
   `-1:19:38`. See the 2026-10-20 (night) progress block.
4. **mpv-handle survival across Fabric view remount — DONE 2026-10-29.**
   The contract was real and unpinned: the picture is a Fabric component in
   the React tree, so it can be dropped and recreated at any time, while the
   mpv engine belongs to `PlaybackHost` and must outlive it. A new
   `android/src/test/java/com/simba/player/mpv/MpvHandleSurvivesViewRemountTest.kt`
   (5 pure-JUnit tests, no Robolectric — the Robolectric suites are `@Ignore`d
   offline, so a test written there would not run and would prove nothing)
   pins it through the **real** `MpvRenderViewManager.onDropViewInstance`:
   the drop leaves `PlaybackHost`'s handle identical (not zero, not
   re-published), a view recreated after the drop binds to that same handle
   through the real `setNativePtr` prop path, the picture registry empties
   while the engine stays live, and `MpvBridgeModule.getNativePtr()` — what
   JS reads — reports the same handle afterwards. **Proven by regression, not
   asserted:** breaking the drop path to tear the engine down fails 4 of the
   5; making it re-publish a handle fails all 5. The test's docblock states
   what it does **not** prove (no real libmpv — `MPVLib.init` calls
   `System.loadLibrary`, which cannot succeed in a JVM test — and no real
   `MpvRenderView`, since `SurfaceView`'s constructor needs the Android
   runtime).
5. `force-window` re-verification under layout churn.
6. **Stage 9 device verification** — the video lane's D9 rewrite is unit-tested
   but not yet seen on a device. PiP in/out, the dock showing live video, back
   at each level, and no black frame on expand↔mini.
   **Update 2026-10-21 (midday):** PiP in/out is now on the device, and it
   found a real defect — leaving PiP was a one-way door (the reconciliation
   listener was mounted inside the subtree the PiP state unmounts). Fixed,
   with the composition-level regression test and a 3/3 mutation check; see
   the midday progress block. **Verified on device:** PiP enters, PiP exits,
   the chrome comes back, and playback runs through the round trip.
   **Still open:** the dock showing live video, back at each level, no black
   frame on expand↔mini, the spinner during a slow load, and the error
   card's Retry re-launching a real load.
   **Update 2026-10-21 (night, W22):** the dock IS the lane's own component
   now — `VideoDock` inside `VideoLane`, the audio dock inside `AudioPlayer`
   — and the minimise control lives in the bottom transport row of **both**
   lanes. Back now **closes**; it used to minimise. **Still open:** the device
   proof — the dock showing live video, back closing for real, no black frame
   on expand↔mini, the spinner during a slow load, and the error card's Retry
   re-launching a real load.
7. ~~**Stage 9 audio lane**~~ — **RESOLVED 2026-10-21 (W22).** The audio
   lane is on D9 now. `AudioPlayer` mounts ONCE and owns both its expanded
   page and its dock; the root's style switches between the two geometries
   and only per-part visibility changes. The shared `MiniPlayer` component
   was **deleted** — it was a second player competing with the audio lane
   for the session, and it rendered a different UI from the player it
   minimised. The video lane's own dock (`VideoDock`) is mounted inside
   `VideoLane`. **Still open:** the device proof of the audio lane's
   expand/collapse (register item 6).
8. ~~**Buffering cannot be shown yet**~~ — **RESOLVED 2026-10-19**, and the
   remaining piece was resolved on **2026-10-20** too. The
   "property events never arrive" claim was false (measured: the elapsed time
   advanced 0:00 → 2:28 on device). Lib **1.16.0** splits the signal into one
   owner per fact, converts the cache ranges to milliseconds, and refuses to
   forward byte offsets as a time range. The app now derives the phase from
   the lib (the controller's stale phase was winning and had killed both
   overlays), paints the contiguous prefix with sub-second gap merging, and
   has no percent fallback. **Lib 1.17.0 + app `463188a` follow-up:** the
   "the file is OPENING" phase now exists (`PlayerState.isLoading`), so a
   slow load shows the spinner; the error card's buttons work (the chrome's
   gesture layer was eating their touches); and only a **terminal** failure
   renders the card. See the 2026-10-19 evening and 2026-10-20 evening
   progress blocks. **Still open:** the on-device re-verification of the
   spinner and of the now-live Retry (register item 6).
   **Update 2026-10-20 (night):** the "buffer indicator is missing" report was
   a *second* defect, and it was in the library too — the same lost
   `durationMs` made the buffered window empty, so **nothing** was drawn.
   Fixed by lib 1.18.0 and device-proven. **One piece still open:** the band
   is now drawn but is ~16 px on a 690 px track, and the 14 dp thumb's half
   is 21 px, so on a feature-length film the thumb covers the whole visible
   band. The band can only be seen if the buffer is larger than the thumb ⇒
   raise the lib's `cache-secs` / `demuxer-readahead-secs` from 120 s to
   ~300 s (lib 1.19.0 + an APK rebuild).
   **CLOSED 2026-10-21 (midday).** Lib 1.19.0's 300 s window is live on the
   device (`cacheWindow new load → cache-secs=300 demuxer-readahead-secs=300`),
   the memory-pressure trim is seen firing for the first time
   (`trim level=40 → cache-secs=10 demuxer-readahead-secs=10` — both options,
   as mpv's `MPMAX` requires), and the band is measured on the pixel row
   itself: played `#C9A84C`, buffered `#95814A` (brand gold at exactly 60 %),
   empty `#474747`. The band is AHEAD of the playhead. What remains open in
   this item is the *spinner* and the *Retry* re-launch — see item 6.
9. ~~**The deep-link path bypasses the app's session seam.**~~ **RESOLVED
   (2026-10-28) — in the APP.** The app no longer uses the lib's
   `useOpenFromUrl`. `src/infrastructure/player/useDeepLinkLaunch.ts` does
   the three things the lib's hook did (filter the scheme, derive the title,
   classify the lane) and then launches through the app's own
   `useResumeAwareLaunch` seam, so a deep-linked file gets a **now-playing
   entry**, a **history checkpoint**, a **dock** and the **resume prompt**
   — and a deep-linked **video plays**, through the in-window launcher every
   other video already used. **No lib release and no `npm install`:** the
   change is inside `src/infrastructure/player/`, and nothing breaking.
   The lane's extension table moved to `src/utils/mediaUri.ts`, so there is
   **ONE** owner for "which lane is this file in" — the picker, the folder
   browser and the deep link all read it. The **lib's** own `useOpenFromUrl`
   asks `isSurfaceMounted()` before it loads a video — that question is now
   **truthful** (bug `B-033`, fixed 2026-10-29), so the lib's path plays a
   video when the consumer has a picture mounted and refuses when it has
   not. The app still does not use it: the app owns its deep links.
10. **The `VideoController` is now dead** (new, 2026-10-19). Its last
    consumer was `VideoErrorOverlay`, and the retry now goes through the
    app's launch seam instead. `useVideoController()` has **zero** call
    sites, so the controller is never constructed and `getVideoController()`
    always returns null. Decision needed: delete the subsystem
    (`VideoController.ts` + `useVideoController.ts` + `controllerSingleton.ts`
    + its barrel exports + `__tests__/infrastructure/player/video/
    VideoController.test.ts`), or keep it and say plainly that it is inert.
    It is a real orchestrator, not a stub, so deleting it removes the
    "video-lane policy owner" that Stage 9 may want.
    **Update 2026-10-27: the decision was made — it is DELETED** (903 lines
    plus a 384-line test). The phase it used to own is derived from the lib,
    so nothing was orphaned. See item 20 and bug `B-014` / fix `F-025`.
11. **`lib PlayerSurface` registry is dead** (new, 2026-10-19).
    `PlayerSurface.mount()` has **zero** call sites, so `isSurfaceMounted()`
    is always false and the lib's `openPlayer({type:'video'})` **always
    returns false** — the deep-link defect. ~~`setVideoBounds` /
    `fillVideoBounds` / `setSurfaceVisible` / `boundsInWindow` are permanent
    no-ops.~~ **Corrected 2026-10-27: that last sentence was false.** Those
    four — and `current()` — are **live**, called from `MpvBridgeModule.kt`.
    What is dead is the registry's **population**, not its API. The **APP**
    half is **RESOLVED (2026-10-28)** — the app no longer asks the question
    (register item 9). **The LIB half is RESOLVED (2026-10-29)** — bug
    `B-033`. `isSurfaceMounted()` now answers from a new
    `MpvRenderViewRegistry`, which `MpvRenderViewManager` writes when React
    Native creates a picture view — so the answer is true **by
    construction** instead of always false, and the registry's population
    comes from the one thing that actually creates a surface.
    The four mutators stay **orphaned and deprecated**, on purpose: the new
    registry answers ONE question and cannot place a surface, so the
    Yoga-hazard `LayoutParams` mutation stays out of reach. Reviving
    `PlayerSurface.attach()` would have put all four back in reach, which is
    why the fix is a **new** registry rather than a revived one.
    `boundsInWindow()` is still orphaned — that is bug `B-036`.

**Migration mechanics**
12. `codegenConfig` `"modules"` → `"all"` — **DONE** (Stage 2).
13. Fabric `ViewManager` for `MpvRenderView`; register in `PlayerPackage` — **DONE**
    (Stage 2; the lib publishes the Fabric component).
14. Presentation commands on the view ref — **DONE**, superseded by **D4**: engine
    ops *and* window ops (PiP) both live on `usePlayer().commands`, so
    `SimbaVideo` carries no ref.
15. Yoga `requestLayout()` guard — **DONE** (Stage 4; the surface attaches with
    real extents, `surfaceChanged: 1080x1907`).
16. Release cycle + `npm install` (Stage 5) — **DONE**, and the cycle is proven:
    1.15.0 and 1.16.0 both went commit → push → annotated tag → Actions →
    `npm install`, verified with `npm view`.
17. App swap + `BrowsingStack` removal (Stages 6-7) — **DONE**.
18. Revise 17 test files / 4 956 lines — **DONE** (the suite is 95 suites /
    1180 tests).

**Dead code (verified)**
19. ~~**APP-side `android/app/src/main/java/com/simba/player/mpv/MpvRenderViewManager.kt` — registered nowhere — DELETED.**~~ **Corrected 2026-10-28.** The file deleted at **v12** was the **APP's** copy, and it was never registered in the app. The **LIB's** `MpvRenderViewManager` is **live and registered** — `PlayerPackage.kt:62–64` returns `listOf(MpvRenderViewManager())`, and it is the Fabric view manager behind the app's `<SimbaVideo>`. What is dead is the **registry-POPULATION**, not the manager (item 21).
20. ~~**`VideoController` + `useVideoController` + `controllerSingleton`** —
    now dead (register item 10). Decision needed.~~ **RESOLVED (2026-10-27).**
    The subsystem was **903 lines** (`VideoController.ts` 605,
    `useVideoController.ts` 248, `controllerSingleton.ts` 50) and it was
    **app-only** — the LIB exports none of it. `getVideoController()` was
    called **only from inside the dead module**, so the singleton was never
    constructed and `getVideoController()` always returned `null`. All three
    files and the 384-line test are deleted. See bug `B-014` / fix `F-025`.
21. **`lib PlayerSurface.kt`** — the register previously said "deleted at Stage 7".
    **That was false**: the file is still there (256 lines) and
    `PlayerSurface.mount()` has zero call sites. See register item 11.
    **Still OPEN — but the framing was wrong (corrected 2026-10-27).** The
    file is **NOT** dead: `setBounds`, `fillBounds`, `setVisible`,
    `current()` and `boundsInWindow()` are all **live**, called from
    `MpvBridgeModule.kt`. What is dead is the **registry-POPULATION** path:
    `attach()` — the **only** writer of `viewRef` — has **ZERO** call sites
    repo-wide (verified 2026-10-28), and `mount()` has zero call sites too,
    so `viewRef` is never non-null and `current()` always returns `null`. The
    Fabric view manager (`MpvRenderViewManager.createViewInstance`) never
    calls `PlayerSurface.attach(...)`, so the registry is **orphaned**, not
    merely unmounted. This was the **hinge of the video deep-link
    failure** — bug `B-013`, **now resolved in the APP** (register item 9:
    the app routes deep links through its own seam and never asks).
    **DECISION (2026-10-28): the app-side re-routing IS the fix, and the
    lib's registry stays orphaned for now.** Wiring the Fabric view manager
    to call `attach()` would put the four mutators (`setVideoBounds` /
    `fillVideoBounds` / `setSurfaceVisible` / `boundsInWindow`) back in
    reach of a `LayoutParams` mutation from Kotlin — the Yoga hazard
    `MpvRenderViewManager.kt` itself warns about — and the app calls
    **none** of them. They stay **deprecated, not removed**: removing them
    is a breaking change.
    **The lib half of this item is RESOLVED (2026-10-29) — bug `B-033`,
    and the fix keeps the decision intact.** The registry is no longer
    orphaned, but it was **replaced, not revived**: a new
    `MpvRenderViewRegistry` is written by `MpvRenderViewManager` (the only
    thing that creates a picture view) and is read by
    `isSurfaceMounted()`. `PlayerSurface` and its four mutators are left
    exactly as they were — orphaned and deprecated — so the Yoga hazard
    stays out of reach. `boundsInWindow()` is still orphaned: that is bug
    `B-036`.
22. ~~`AudioLyricsView` (525 lines) — 0 call sites.~~ **RESOLVED
    (2026-10-27).** **525 lines, ZERO call sites → deleted.** And the lane
    matters: this is an **APP** file, not a lib file. The register grouped it
    under "Dead code (verified)" right next to item 21 (`lib
    PlayerSurface.kt`), which is how a batch of app files got sent to the
    wrong repo.
23. ~~`AudioVisualizer` (143 lines) — 0 call sites.~~ **RESOLVED
    (2026-10-27).** **143 lines, ZERO call sites → deleted.** An **APP** file.
24. ~~`DpadController` (187 lines) — 0 call sites; it also exports
    `useHardwareMediaKeys` and `useFocusRing`, both with 0 consumers.~~
    **RESOLVED (2026-10-27).** **187 lines, ZERO call sites → deleted.**
    `useHardwareMediaKeys` was **internal-only** and `useFocusRing` had **zero**
    call sites. An **APP** file.
25. ~~`BufferingBar` (113 lines) — 0 call sites.~~ **RESOLVED (2026-10-27).**
    **113 lines, ZERO call sites → deleted.** An **APP** file.
26. ~~`AudioDescriptionTrackSelector` (50 lines) — 0 call sites, and its body
    is `() => null`.~~ **RESOLVED (2026-10-27).** **50 lines, ZERO call
    sites → deleted.** An **APP** file.
27. ~~Dead exports `useBookmarkMarkers` and `deriveNextUpView` — 0 call sites.~~
    **RESOLVED (2026-10-27) — and the register was WRONG about half of it.**
    `useBookmarkMarkers` was genuinely dead and is deleted. `deriveNextUpView`
    is **LIVE**: it is used at `NextUpOverlay.tsx:95`, and `NextUpOverlay` is
    mounted at `VideoPlayer.tsx:664`. **Do not delete it.** The register
    listed both as dead because the call sites were never read.
28. ~~**`DefaultControls.tsx` (564 lines) violates locked D5.**~~ **RESOLVED
    (2026-10-29) — lib `2.0.0`.** The lib change, the release and the app's
    dependency bump are **done**. `DefaultControls.tsx` (564 lines) and its
    test are **deleted**; `DefaultControls` / `DefaultControlsProps` are no
    longer exported; `<PlayerRoot>` no longer falls back to anything — it
    renders the surface and the consumer's own `renderControls` output, and
    **nothing else** when the consumer supplied none.
    **The release.** Lib commit `0f6209b`, tag `v2.0.0` **annotated** and
    pushed, published to npm by the release workflow. It is **MAJOR** because
    a public export was removed. `renderControls` stays **optional** on
    purpose: the common case is a consumer that drives the player itself and
    never renders a full-screen control bar, so making it required would
    break the headless use case.
    **What else the removal exposed — three things the register had wrong.**
    - **The no-op bridge's reason to exist was mis-stated.** The register
      said removing the chrome "retires the module's no-op fallback's reason
      to exist (`MpvPlayerModule.ts:904`)". It does not: the no-op bridge is
      what keeps **consumer** code renderable in jest, Storybook and web
      previews, and it stays. The comment now says that instead of naming
      `DefaultControls`.
    - **`PlayerSurface`'s docblock was a false claim.** It said the
      placeholder stands in for "the native SurfaceView (which sits at the
      activity root, beneath the React tree)". That stopped being true when
      the picture became `<SimbaVideo />` (D2). The lib has **no Activity**
      at all now, and the app's own `MainActivity.kt` says so in as many
      words — *"2026-10-16: no surface is mounted here any more"*. The
      docblock now says what the component actually is.
    - **A deleted UI kit leaves its GEOMETRY behind — and its EXCLUSIONS.**
      `jest.config.js` excluded `PlayerRoot.tsx` and `PlayerSurface.tsx`
      from coverage because they "wrap the native view manager
      `MpvPlayerView`". That manager does not exist any more, and neither
      component touches a native view — so both were excluded from a
      measurement they are now fully inside. They are back in the covered
      set at **100 % statements**, the coverage achievement moved
      52 → **69.57 %** statements, and the thresholds were raised to match.
    **The new test.** `src/components/__tests__/PlayerRoot.test.tsx` (3
    tests) pins the contract: no `renderControls` → the surface and
    **nothing else**; `renderControls` → the consumer's controls over the
    surface; the package exports no default control bundle. **Mutation-
    checked 3/3** — a re-introduced chrome fallback, a re-exported
    `DefaultControls`, and a `PlayerRoot` that ignores the consumer's
    controls are each killed by a named test, with the source hash-restored
    and the suite green again.
    **Carried forward from this item:** the app's dependency bump to
    `^2.0.0` and the **native rebuild** that every lib release needs (the
    APK's DEX). And the new finding it opened — **`B-035`**: are
    `PlayerRoot` and `PlayerSurface` vestigial? They have **zero** internal
    consumers, they render **no picture**, and a published package cannot
    quietly drop a public export — so the decision is open, not made.

**Product / UI**
29. ~~Title renders literal quotes — `"El Ciclo ( 1964)"` (feed data bug).~~
    **RESOLVED (2026-10-27).** It is **FEED DATA**, not a parser or renderer
    bug: the Internet Archive `title` field carries the quotes, and **no
    normaliser existed anywhere**. One normaliser —
    `normalizeArchiveTitle`, `src/infrastructure/api/internetArchive/adapter.ts`
    — now strips a **matched pair** of surrounding double quotes and leaves
    every other title **byte-identical**. It is applied at **all five** title
    assignments in the adapter (not three), so every IA surface benefits.
    **6 unit tests** added.
30. ~~Stray `2×` and `☀ 100%` / `♪ 100%` chips floating mid-frame in video
    chrome.~~ **CLOSED (2026-10-27) — they are not stray.** They are
    **self-hiding gesture feedback**: they auto-hide on a timer, they clear on
    gesture end, and they are `pointerEvents="none"` and hidden from
    accessibility. The position claim was wrong too: the **`2×` speed badge
    is TOP-CENTRE** (`top: spacing.xl`), **not** mid-frame; the ☀/♪ pills are
    the mid-frame ones (at 40 % height, left/right). **If they are ever seen
    persisting after the gesture, that is a device-only question** — nothing
    in the source would produce it.
31. ~~FAB overlapping the Music card.~~ **RESOLVED (2026-10-27) — by removing
    the tab bar it was mis-measured against, not by a gutter.** The first
    diagnosis was right and the first fix was wrong. The FAB is the Home
    screen's own **"Play media file"** button (absolute, right 16, 56×56,
    `zIndex: 99`); the card is the **third** card of the Home "Explore
    Contents" horizontal rail (`CategoryCard`, 140×160). They overlapped
    because the FAB sat at `bottom = insets.bottom + 100` — **124 dp above
    the bottom edge**, in the middle of the rail — and the rail scrolls
    horizontally across the full width, so every card passes through the
    FAB's rectangle.
    **The `100` was the DEAD floating bottom tab bar's clearance** (60 dp
    plus a 10 dp margin). That bar was deleted in v11 Wave 1 and the offset
    was never revised. **A FAB is supposed to FLOAT**: the app's other five
    FABs (Movies, Music, Podcasts, Radio, Live TV) have always used
    `insets.bottom + spacing.lg`, and Home's now does too. The 72 dp rail
    gutter is **gone** — a floating button overlapping content is the point
    of a floating button, not a defect. The list's bottom padding now
    clears the FAB's **top** edge.
    The FAB is now its own component
    (`src/screens/Home/components/HomeFab.tsx`) — the shape every other FAB
    screen in the app already has — so its placement is **asserted** rather
    than assumed.
    **Still open, and NOT fixed:** the FAB's bottom **14 dp** sits under the
    **mini-player dock** — a 54 dp bar at the window bottom — when a player
    has been minimised. That is the app-wide FAB rule, not a Home defect:
    the other five FABs have the same relationship to the dock. See
    `B-028`.
32. Full device matrix — PiP in/out, dock rotation, a→v→a, back at each level, next/prev.
   **Update 2026-10-21 (afternoon):** the resume and the captured-frame
   round trip are on the device now (see the new items 41-42). Still
   open: the dock showing live video, back at each level, no black frame
   on expand↔mini, next/prev, and the audio lane.
   **Update 2026-10-21 (night, W22):** back now **closes** instead of
   minimising, and the minimise control moved into the bottom transport row
   of both lanes — so "back at each level" has one meaning per level
   (close), and the dock has a control of its own. Still open: the whole
   matrix.
33. **C-07 artwork + `setAutoEnterEnabled` / `setExpandedAspectRatio` / portrait
    restore — PARTLY (2026-10-27; artwork DONE 2026-10-29).**
    - **Artwork: DONE 2026-10-29.** The paths existed but the rule was
      written out at each call site — `resumeThumbnailPath || thumbnailPath`
      in three places and `thumbnailPath` alone in the fourth, so a
      bookmarked film with no catalogue art still showed the gold icon while
      the app held a good frame of it on disk. The frame could not ride the
      session: it is captured at the session's **END**, after the session is
      gone, and the session carries only the catalogue artwork — so the
      hand-off now comes from the history store (`useBookmarkToggle.ts`).
      The rule itself moved to **one owner**, `utils/mediaArtwork.ts` →
      `resolveMediaArtwork()`, which every surface asks, so a new surface
      cannot get the precedence wrong. *Which* path is rendered stays a
      separate question owned by `toRenderableImageUri` — a captured frame
      is local and needs `file://`; catalogue artwork is remote and must be
      left alone. Pinned by 4 new test files / 17 new cases, with a revert
      proof. **Still open inside this item:** `resumePolicy.ts:119` gives
      the *bookmark* branch only `thumbnailPath`, so a bookmark-sourced
      resume prompt shows the poster rather than the frame — left alone
      deliberately, because changing it alters the resume prompt's
      behaviour.
    - **`setAutoEnterEnabled` and `setExpandedAspectRatio` DO NOT EXIST** —
      not in the app, not in the lib. They exist only in **md prose**. The lib
      has an **unread** `pip.autoEnterOnLeave` flag, and PiP entry is
      **manual** (`enterPictureInPictureMode`). Any plan that calls these
      methods is calling something that was never written.
    - **Portrait restore exists only in `onResume()`** (and `onCreate`), and
      the JS `lockToPortrait()` runs only at boot — so a session that ends
      while the app is backgrounded **never restores portrait**.
    - **Device proof: still outstanding.**

**Playback truth (new, 2026-10-21 afternoon)**
41. ~~**A resume never resumed — the start position was a `seek` mpv silently refused.**~~
   — **RESOLVED by lib 1.22.0 + app `ba8e17d`.** A resuming launch did
   `loadFile(uri)` and then `seekAbsolute(seconds)`. mpv refuses a seek
   until the file has actually opened (`cmd_seek` →
   `!mpctx->playback_initialized` → `cmd->success = false`), and the
   native side discarded that return code, so the refusal was completely
   silent: the file played from 0:00 and the clock truthfully showed
   0:00. Device proof: `seekAbsolute position=1060.727` was logged and
   mpv **never** emitted a `seek` event, while a manual scrub — a seek
   issued after the file was open — landed to the second. The start
   position is now mpv's own `start` option, written **before** the load,
   so it is part of the load. New invariant **I28**.
42. ~~**The Recently Played card had no frame — the capture never ran.**~~
   — **RESOLVED by app `ba8e17d`.** The teardown flush read the *current*
   snapshot, but the render that ends a session also nulls the session and
   that render runs before React runs the effect cleanup — so the flush
   wrote nothing and the frame was never captured. `files/simba-resume-thumbs/`
   did not exist on the device. The suite was green because it only
   exercised the tree *unmount*. Fixed with a per-session snapshot map and
   a flush that is not gated on the session still playing. New invariant
   **I29**. **Still open:** whether `MediaMetadataRetriever` can decode a
   frame from an `https://` archive.org source on a real device — the
   capture is a byte-range request, not a local file.
43. ~~**`skipPrev` read a frozen playhead.**~~ — **RESOLVED by app
   `ba8e17d`.** The `wrapped` commands memo only rebuilds when the
   DURATION changes, so the closed-over position was the one at launch:
   pressing skip-back three minutes into a film jumped to the **previous
   track** instead of restarting the film. New invariant **I30**.
44. ~~**The search tile applies `file://` to a REMOTE thumbnail URL.**~~
   **RESOLVED (2026-10-26, W23) — `F-018`.** `ResultTile` now resolves the
   URI through `toRenderableImageUri` and adds the cache token through a new
   `withCacheToken`, which owns **only the separator and the encoding** — the
   scheme decision stays in one place, so it cannot be re-introduced inside
   the token helper. Mutation-checked 7/7.
   **Not device-provable**, and the reason is its own finding (`B-026`): no
   catalogue surface hands its artwork to the history entry, so the tile the
   user can reach has nothing to show.
45. ~~**`formatDuration(0)` returns `''`.**~~ **RESOLVED (2026-10-26, W23) —
   `F-019`.** The formatter's contract is **unchanged** and is load-bearing:
   "unknown duration" is a real state, and a `0:00` badge would claim
   zero-length media. The **cards** were the defect — they composed a
   position that was not there. A new `src/utils/mediaTime.ts` prints the
   position segment only when there IS a position, and the spoken label now
   matches the visible line. Mutation-checked 7/7.
   **Not device-provable**: every playback advances the checkpoint past 0
   before the card re-renders.
46. ~~**The transport bar freezes the elapsed label for 600 ms after a
    tap-to-seek**, and the timeout is not cleared on unmount.~~ **RESOLVED
    (2026-10-27) — `F-021`.** The symptom was **inverted**: the clock was
    pinned to the seek **TARGET** for a fixed 600 ms and then dropped back to
    the engine's value, so a slow seek ran the clock **backwards**. The fix
    is a **closed loop** — the preview is held until the engine's own
    position reaches the target (`SEEK_CONFIRM_TOLERANCE_MS = 500`), with a
    **bound** (`SEEK_CONFIRM_FALLBACK_MS = 1000`) for a seek that never
    confirms — plus a timer handle in a **ref**, so it is cleared on unmount
    and re-armed on every commit, and a drag release that commits through the
    same path.
47. ~~**The native discards mpv's return code** for `seek`, relative `seek`
   and `playlist clear` (`main.cpp`), so a refusal there is silent too —
   the same class as the resume defect, on the paths that remain.~~
   **DONE 2026-10-30 by lib `2.1.0`** (bug `B-007`, fix `F-041`). Every
   `mpv_command()` in `main.cpp` now goes through `runMpvCommand`, which
   reports a refusal through the **existing** error path — the same
   `MPVLib.onNativeError` callback `event.cpp` uses — so it lands on the same
   `onError` event with the same `{code, codeName, nativeCode, recoverable,
   message}` payload and the same mapping the Kotlin bridge already had
   (-12 → `E_COMMAND_FAILED` → 3016). No new event, no new channel, no new
   error shape. `recoverable = true` is the truth: a refused command does not
   end playback, so it is reported rather than painted over a picture that is
   still moving. The change covers **every** command in the file, not only
   the three the register named, so no sibling of the same defect is left
   behind. `nativeScreenshot` now returns an empty string when mpv refuses
   the write — it used to return the path to a file that was never written.
   **The APK rebuild is still owed** for the Kotlin half (see item 63).

**Player chrome (new, 2026-10-21 night)**
48. ~~**The close verb has no device proof yet.**~~ **RESOLVED (2026-10-26).**
   `useClosePlayback()` is the ONE owner of the teardown (native
   `stopPlayback()` → `endSession()`), and the header's back, the audio
   player's X and both docks' X all route through it. **Device-proven on
   emulator-5554 (API 37):** the header's back logged
   `[PlaybackTrace][Bridge][stopPlayback] service not running; engine
   stopped`, the chrome unmounted entirely, `dumpsys notification` showed no
   live media notification, `dumpsys media_session` showed no active
   session, and the teardown flush wrote the checkpoint
   (`files/simba-resume-thumbs/frame_877507528_1290000.jpg`, 22,427 bytes).
   **The HARDWARE back path is a separate, open defect — see item 55.**
49. ~~**The minimise control has no device proof yet**, on either lane.~~
   **RESOLVED (2026-10-26).** The chevron-down is a *new* affordance in the
   bottom row (the audio lane's old top-left chevron-down was removed, so
   there is exactly one minimise path per lane). **Device-proven:** tapping
   `video-mini-toggle` produced the bottom dock with a **live colour video
   frame in the dock hole**, the title, play and X, and the home screen
   visible behind it.
50. ~~**Expand ⇔ mini is unproven for black frames and for an mpv
   re-attach.**~~ **RESOLVED (2026-10-26).** The dock is always laid out
   precisely so the slot rect is published BEFORE the tap, which is supposed
   to remove the one-frame jump. **Device-proven:** expanding restored the
   full chrome and the position (21:58) with **no black-frame flash**, and
   across minimise→expand logcat showed **only one `surfaceChanged` — no
   `surfaceCreated`, no `surfaceDestroyed`, no "Attaching Surface to mpv"**.
   The mpv surface is never re-attached.
51. ~~**The video dock's transparent hole is unproven on device.**~~ **RESOLVED
   (2026-10-26).** **Device-proven:** the live video shows through the hole
   in the minimised state (a colour frame of the film, not the home screen
   behind it).
52. **~~`commands.exitPlayer()` is unusable and must stay unwired.~~ The native
    hazard is RESOLVED (2026-10-27) — `F-023`.** It routes to the lib's
    `exitPipAndFinish()`, which **used to** call
    `activity.finishAndRemoveTask()` on the CURRENT activity — and under D1
    there is one Activity, so it would have finished `MainActivity` and
    removed the app's whole task from Recents. The Kotlin now calls
    **`activity.finish()`**, which closes the PiP window and leaves the task.
    The app's `useTransport.exitPlayer` facade is **deliberately KEPT** — it
    is a real member of `TransportCommands`, backed by the lib's real
    `exitPipAndFinish`, and its **stop-then-finish ORDER** is pinned by a
    test — and it stays **UNWIRED in production**, because the close verb
    has exactly **one** owner (`useClosePlayback()`) and SPEC §3.4 forbids a
    second path to the same secondary action. See bug `B-008`.
    **Still OPEN — a product/lib decision, not a defect:** whether the lib
    should still export `exitPlayer` at all.

**Found on device, 2026-10-26**
53. **Closing the video left a blank white screen.** The browsing stack was
   blanked by the user's **REQUEST** for a fullscreen video, and the request
   outlives the session by design — so after the close the window stayed
   owned by a video that was gone. The same keying kept the hardware-back
   handler registered, so back presses were swallowed on the browsing stack.
   **FIXED:** a new derivation, `useVideoOwnsWindow()` = `isExpanded &&
   streamType === 'video'`, used by BOTH the browsing stack's `hidden` and
   the hardware-back gate, so they can no longer disagree. It is deliberately
   NOT folded into `usePresentation` — that module is forbidden from reading
   the session, and it answers a different question. See bug `B-022`.
54. **The resume dialog's artwork box was empty.** The native capture returns
   a bare `filesDir` path; an image loader parses a scheme-less string as a
   URI and fails, so the box rendered blank — while the same frame rendered
   correctly on the Recently Played card, because `MediaRailCard` already
   normalised it. **FIXED at the render site** (`Dialog.tsx` is the only
   place a stored path becomes an image source), so every caller inherits the
   correction. See bug `B-023`.
55. ~~**The Android back button is dead everywhere in the app.**~~ **RESOLVED
   (2026-10-26).** Not just in the player — on Home too, where it should
   have closed the app. `MainActivity.onBackPressed()` dispatched a
   synthetic `KEYCODE_BACK` into the view hierarchy before
   `super.onBackPressed()`, but the JS `BackHandler` is not a key-event
   listener: it subscribes to the `hardwareBackPress` DEVICE EVENT, which
   only `ReactHostImpl.onBackPressed()` emits. The dispatch could never
   reach it by construction, and the early return stopped RN's own route
   from ever running. **Instrumented, not fixed from static reading** — the
   plan's risk table says so, and it was right to: `Log.i` on each branch
   measured `down=true` → early return → `super` never called, and the JS
   probe never fired. Fixed by deleting the synthetic dispatch; `super` IS
   RN's path. The audio lane was given the same close verb the SPEC gives
   it, because fixing the native path made the press reachable there for
   the first time. Device re-proofed: Home → back closes the app; in the
   player → back closes the player (`[stopPlayback] service not running`)
   and returns to Home. See bug `B-011` / fix `F-017`.

**Library defects**
34. ~~`PlayerProvider` calls `initPlayer()` in a **mount effect**, and React
    runs child effects before parent effects, so the chrome's bridge calls
    beat it — 8 × `IllegalStateException: MpvPlayerModule not initialized`.
    Move the idempotent call into render.~~ **RESOLVED (2026-10-27) —
    `F-024`, lib 1.23.0.** The call moved into the provider's **RENDER
    phase** behind a **ref guard**, and `SimbaVideo`'s handle read is **no
    longer memoised** — the sharpest instance was a **render**, not an
    effect: `getNativePtr()` answers `0` without throwing, so the first
    render bound the surface to a null handle and the memo never recomputed.
    A parent's render completes before any child's, so the handle now exists
    before any descendant renders. **The trade-off, stated:** a render-phase
    side effect is safe **only** because `initPlayer()` is idempotent. The
    release is **1.22.0 → 1.23.0**, and it is a **MINOR**, not a patch
    drop-in, because the TurboModule spec changed — a coordinated native + JS
    upgrade. **Released:** commit `5e8de6e`, tag `v1.23.0`, published to npm
    as **1.23.0** (80 files / 989 669 bytes unpacked — the published tarball
    still ships **no `.so`**). The app now **declares `^1.23.0` and installs
    it** (`npm install @simba-dev/react-native-media-player@1.23.0` resolved
    to **1.23.0** in `node_modules`). **Still outstanding:** the app's
    **APK** still carries the 1.22.0 **Kotlin**. The `finish()` fix and the
    `override` spec methods compile into the APK's **DEX**, not into
    `libplayer.so` — that is the CMake/JNI library built from `main.cpp`,
    and 1.23.0 changed **no** C++ — so the native half of 1.23.0 lands
    only on an **APK rebuild**. The JS half (`initPlayer()` in the render
    phase, the un-memoised `SimbaVideo` pointer, the Spec's `addListener` /
    `removeListeners`) takes effect on a **Metro reload** and is already in.
35. ~~The bridge maps `MPV_ERROR_LOADING_FAILED (-13)` to `E_RENDERER_GONE`, so
    every load failure reads as a GPU crash. Also the `onError` payload's
    `code` is a **string** in the second emission ⇒ `Number("E_RENDERER_GONE")`
    ⇒ `NaN`, and `codeToNumeric("E_RENDERER_GONE")` is `0`.~~ —
    **RESOLVED by lib 1.17.0** (2026-10-20). The mapping is now driven by
    mpv's numeric code, the error is emitted **once** with a numeric `code`,
    `codeName`, the raw `nativeCode` and `recoverable`, and the `3xxx`
    numeric range is in use. Measured on device before the fix:
    `code=-1 … AudioTrack Init failed` → `code=E_RENDERER_GONE numeric=0`.
36. ~~Verify the lib's consumer `postinstall` links the `.so` in a **clean
    checkout** — CI skips the native download, so that path is untested. This
    now applies to 1.17.0 as well.~~ **RESOLVED (2026-10-27).** The
    postinstall downloads `jniLibs.tar.gz` from the GitHub Release, verifies a
    **SHA-256**, extracts it, and **FAILS if any of the four ABIs is missing
    a `libmpv.so`**; it short-circuits on `SKIP_DOWNLOAD_NATIVE=1` or when
    the probe file already exists. `.github/workflows/ci.yml` set
    `SKIP_DOWNLOAD_NATIVE=1` **everywhere**, so CI never exercised it —
    while the published tarball ships **no `.so` at all** (~963 KB), so
    **every consumer's `npm install` hard-depends on a release asset that CI
    never validated.** A new CI job, **"Native download (published release
    asset)"**, now resolves the latest **PUBLISHED** release (the release
    asset is created **BY** the tag push, so a just-bumped version has no
    release yet — testing the working tree would redden `main` on every
    version bump), checks it out, runs `npm ci` with the download **enabled**,
    and asserts all four ABIs land.

**Housekeeping**
37. LogBox "Open debugger to view warnings" — CDP `Runtime.enable` times out; blocked.
38. ~~9 unused `textContent.ts` entries + `HistoryScreen:99` dead branch.~~
    **RESOLVED (2026-10-27) — and both numbers were wrong.** There were
    **14** `textContent.ts` files, not one: **9** had **ZERO** references
    app-wide (140 exported keys), plus a **10th**
    (`src/screens/Home/related/textContent.ts`, 17 keys) that was imported
    **only by its own barrel**, plus the dead `TextContent` type in
    `src/types/textContent.ts`. The `HistoryScreen:99` note was **stale**:
    line 99 is now the `useMemo` dependency list (the blank line is 100), and
    the dead fallback had moved to the `handlePress` callback at ~:101 —
    `mediaType ?? 'video'`, unreachable because `mediaType` is required on
    the history entry. All of it was deleted, and the signature now
    **requires** what the caller always passes. **Three files ARE used and
    were left alone:** `About`, `Bookmarks` and
    `features/library/presentation`.
39. Jest force-exit flake (leaked handles) — needs `--detectOpenHandles`; plus
    the `useLaunchPlayback` 5 s timeout under cold-cache parallel load.
40. Emulator `-wipe-data` escalation if it recurs.

**The tab bar that was not there (2026-10-27)**
56. ~~**The app still carried a bottom tab bar it has not had since v11 Wave 1.**~~
    **RESOLVED (2026-10-27) — `F-027`.** `createBottomTabNavigator` was
    introduced in `7458c90` and removed in `0553abb` — the same commit that
    introduced the Home screen. What survived was the **skeleton**: a
    `TabNavigator.tsx` that is a native stack wearing a tab's name
    (`MainShellNavigator`, whose own comment reads *"v11 Wave 1:
    authenticated shell **without a persistent bottom tab bar**"*), two
    one-screen stacks (`HomeStack`, `LibraryStack`) that were **never
    rendered**, a 263-line `FloatingTabBar` that was **never mounted**, the
    `TabParamList` / `HomeTabParamList` / `LibraryTabParamList` /
    `TabScreenProps` / `StackInShellProps` types, and the
    `@react-navigation/bottom-tabs` dependency. `RootNavigator` registers
    `Home` and `Library` **directly**. All of it is gone, and
    `HomeScreenProps` / `LibraryScreenProps` are now the **root** stack's
    props — which is what they were at runtime all along; the composite only
    described a navigator that was never mounted.
    **The skeleton was not the expensive part — the GEOMETRY it left behind
    was.** The Home FAB's `+100` (item 31) and the `insets.bottom + 104` on
    **six** screens — `104` = the mini player (56) **plus the tab bar (48)**.
    That number predates the tab bar's deletion, so every one of those
    screens had been reserving **48 dp for a bar that no longer existed**,
    and nobody could explain the number because nobody knew what it was
    measuring. They now use the app's modern rule
    (`insets.bottom + spacing.lg`, plus the FAB's own height where a screen
    has one).
57. ~~**The Home FAB opened the wrong lane, and said nothing when it failed.**~~
    **RESOLVED (2026-10-27) — `F-028`.** Two defects, both in
    `useHomeScreen.handleOpenMedia`:
    - **The lane.** A picked file's URI is a `content://` URI with **no
      extension** in it — `…/document/audio%3A1000000064` — so
      `getMediaType(file.uri)` could not classify it and fell through to its
      `'video'` default: **every picked AUDIO file opened in the VIDEO
      lane**. The picker already reports the file's MIME type, so a new
      `classifyPickedMedia()` uses it, then the display name (which carries
      the extension the URI lost), then the URI.
    - **The silence.** `openPlayer` is async and **rejects** when the launch
      fails, but the call was fire-and-forget — so the rejection never
      reached the `catch` and surfaced as an **unhandled promise rejection**
      instead of the logged warning the comment claimed. The user picked a
      file and **nothing happened on screen**. The call is now awaited, a
      `false` result ("nothing was attempted", which is what the lib's own
      contract means by `false`) is a failure too, and both say
      "Could not open that file".
    The native side was already correct: the lib resolves a `content://`
    URI to an `fd://` descriptor, and `pickMediaFile()` grants the
    persistable permission. The defect was entirely in the app's JS.
58. ~~**The mini-player dock sat under every floating button, and under the
    last row of every list.**~~ **RESOLVED (2026-10-28) — `F-029`.**
    **The arithmetic.** The docks (`VideoDock` and the audio lane's mini bar)
    are **54 dp** tall at `bottom: 0` of the window — an app-level overlay
    painted over whatever screen the user is on. Every FAB floated at
    `insets.bottom + spacing.lg`, so on a 24 dp gesture bar the button's
    bottom edge landed at 40 dp and the dock's top **14 dp** covered it. And
    because a screen's scroll padding cleared the safe area and nothing
    else, the last row of a list sat **under** the dock on **every** page.
    **The decision — the FAB moves; the dock does not yield.** The dock is
    what the user minimised the player INTO, so lifting it off the bottom
    edge would put it over the content they are looking at. Hiding the FAB —
    what YouTube and Plex do — would remove the action: the Home FAB opens
    the file picker, the catalogue ones their filter sheet, the Library one
    the create-playlist sheet. So the button **moves up**.
    **The rule, and its one owner.** `src/infrastructure/player/miniPlayerChrome.ts`:

        bottom offset = max(insets.bottom, mini player band) + spacing.lg

    Both terms are measured from the **window** bottom, so they are
    comparable. With no mini player up the band is `0` and the rule is the
    app's long-standing `insets.bottom + spacing.lg` — nothing changes for
    anyone who is not playing anything. With a dock up the band is `54` and
    the button sits at `70 dp`.
    `MINI_PLAYER_HEIGHT` is the ONE place the dock's height is written down,
    and it is derived from the same three numbers the docks lay themselves
    out with (`2` progress + `44` art + `4 + 4` row padding), so the
    declared height and the painted height cannot drift apart. Both docks
    take their height from it, and both are pinned by a test that reads the
    rendered style.
    **The rule covers every page, not only the FABs.** Five FAB screens
    (Home, Movies, Music, Podcasts, Library) and eighteen more screens plus
    the shared `ScreenContainer` now use it. The per-screen numbers it
    replaced — `+ 104` (item 56), `+ 56` (a mini-player clearance for a
    player of a size that no longer existed), `+ 40`, `+ 20`, `+ 12` — were
    either orphans or one size step off the rule; they are gone.
59. ~~**The app had SIX files for one floating action button.**~~
    **RESOLVED (2026-10-28) — `F-031`.**
    `screens/Home/components/HomeFab.tsx`, three byte-identical copies of
    `BrowseFab` (Movies, Music, Podcasts), two more byte-identical copies of
    `SectionFab` (Radio, Live TV), and the Library's drawn inline in
    `LibraryScreenContent.tsx`'s stylesheet. Six files, one button — and they
    had already drifted: the Home one floated `spacing.lg` from the right
    edge and the other five `spacing.xl`; the Home one had a neutral shadow
    and elevation 6, the others a gold glow and elevation 8; the Home one
    used `zIndex: 99` and the others `10`.
    The bottom-chrome rule was about to be written into seven call sites,
    which is not a rule — it is seven chances to get it wrong. One
    `components/core/Fab/Fab.tsx` now draws the button, the rule lives in
    it, and the six files are gone. The Home button was the outlier and was
    normalised onto the treatment six of the seven already used. The
    Library's inline button also gained the `accessibilityRole` and the
    `accessibilityLabel` it never had.
60. **The "Pinned Playlists" section was a promise the code never kept**
    (new, 2026-10-29). Home has a "Pinned Playlists" shelf
    (`src/screens/Home/index.tsx:139`) fed by
    `src/screens/Home/hooks/useHomeScreen.ts:375-379` — `[...playlists]
    .sort(by updatedAt desc) .slice(0, 3)`. **Nothing is pinned**: the shelf
    is the three most-recently-updated playlists under a title that says
    otherwise, and nothing anywhere can pin a playlist. The user asked for a
    section that creates playlists of **videos and audio from different
    sections**, with the UX brought up to the rest of the app, and for the
    plan to be written down so it is not forgotten.
    **The gap, measured in the source (2026-10-29).**
    - `PlaylistKind = 'AUDIO_ONLY' | 'VIDEO_ONLY'` — "Mixed audio/video
      playlists are intentionally unsupported"
      (`src/types/playlist.ts:3-4`), and `splitLegacyMixed()` **destroys** a
      mixed playlist on every rehydrate
      (`src/state/playlistsStore.ts:90-135`, filter at `:108-109`).
    - `PlaylistLegacyKind` still carries `'MIXED'`
      (`src/types/playlist.ts:66`) and `AllPlaylistsScreen` still renders a
      `'Mixed'` label with no type behind it
      (`src/screens/AllPlaylists/components/AllPlaylistsScreen.tsx:112-116`).
    - The player queue is single-lane **by construction**:
      `normalizeSingleLane` (`src/state/playerStore.ts:97-101`) drops every
      entry that is not in the first entry's lane, and
      `loadPlaylistToPlayer` (`:126-133`) runs every playlist through it — so
      a mixed playlist would be **silently truncated at load**.
    - `PlaylistSheet` is live at **nine** surfaces and at **none** of the
      app's own video sections (Movies, All Videos, Movie Detail, Archive,
      Downloads). A video can only be added to a playlist from the Internet
      Archive item detail.
    - **Three** implementations of "create a playlist" for one action:
      `PlaylistCreateModal` (used by `LibraryScreenContent.tsx:490` and
      `FolderBrowserScreen.tsx:645`), `AllPlaylistsScreen`'s inline modal
      (`:54-60`, `:188-271`) and `PlaylistSheet`'s inline create mode
      (`PlaylistSheet.tsx:96-110`). A shared component exists and two
      surfaces ignore it.
    - **Two** "add to playlist" sheets that disagree: `PlaylistSheet`
      filters by lane (`:79-88`); `PlaylistContextMenu` lists every playlist
      (`:102`). Combined with the store's **silent** lane refusal
      (`src/state/playlistsStore.ts:180`), the batch picker can offer a
      playlist that quietly drops the item — and the toast then **lies** about
      the count. That is bug `B-034`.
    - `LOCAL_PLAYLIST_FILTERS` is All / Audio / Video — no Mixed chip
      (`src/features/library/presentation/related/localFilesConfig.ts:51-58`).
    **The decisions (all DECIDED, 2026-10-29).**
    - **D-P1 — `MIXED` becomes first-class.** A playlist may hold audio and
      video. `splitLegacyMixed()` preserves instead of splitting; the
      migration is a no-op because no mixed playlist survives on disk.
    - **D-P2 — "Play all" plays every item in order, and the lane follows
      the item.** Both lanes are already mounted (D9 is per lane); the queue
      is **one** queue that may hold both lanes, and the handover across a
      lane change gets **one** owner, in the launch seam.
    - **D-P3 — `Playlist.pinned` + `pinnedAt`.** Home shows the pinned
      playlists first, then the rest. Precedent: Spotify's "Pin playlist",
      YouTube Music's "Pin to top".
    - **D-P4 — one owner creates a playlist** (`PlaylistCreateModal`), and
      **one rule** decides which playlists may take an item (a shared
      `compatiblePlaylistsFor(item)`, used by both sheets).
      `PlaylistContextMenu` is **not** deleted — it is the only batch picker.
    - **D-P5 — `PlaylistSheet` is wired at the Movies sections.**
    - **D-P6 — radio, live TV and audiobooks stay out of the playlist
      domain.**
    **The pages:** new `AddToPlaylistScreen` (a full page spanning
    Movies · Music · Podcasts · Archive · Downloads); changed
    `AllPlaylistsScreen`, `PlaylistDetailScreen`, `PlaylistSheet`,
    `PlaylistCard`, Home's rail and the Library filter chips.
    **There is NO `PinnedPlaylistsScreen`** — D-P7 below.
    **The UI/UX (DESIGNED 2026-10-30 — D-P7 … D-P9).** The specification's §4
    grew from a page list into a real design: the rules, the reused
    primitives, the new `PlaylistCover` and pin badge, the one management
    page, the empty states, the motion and the accessibility. It also
    **removed** the `PinnedPlaylistsScreen`.
    - **D-P7 — one page owns playlists.** `AllPlaylistsScreen` grows into the
      management page. A second page holding the same list is a second list
      to keep in agreement with the first, and the tracker requires "one
      target, not two".
    - **D-P8 — the pin is a state you can SEE and an action you can REACH.**
      A pin **badge** on the cover, on every surface a playlist is drawn; a
      **long-press menu** item (YouTube Music's "Pin to top", Spotify's "Pin
      playlist"); and a **visible toggle** on the management row and the
      detail header, because a long-press is not reachable by a screen reader
      or a keyboard. A **browsing card gets no permanent pin button** — a pin
      button on every card in a grid of fifty is noise.
    - **D-P9 — the kind label and the playlist cover each have ONE owner.**
      The kind label has **six** owners today (the exported
      `PLAYLIST_KIND_LABELS`, **three** local `KIND_LABELS` copies, **one**
      inline ternary, and `src/constants/strings.ts` — which already has
      `playlistKindMixed: 'Mixed'`, so the word is not new to this app). The
      cover has **two** (a collage in `PlaylistCard`, a generic icon box in
      `AllPlaylistsScreen`). One owner each: `PlaylistCover` and
      `PLAYLIST_KIND_LABELS`.
    **The plan lives in two documents**, so it cannot be lost inside this
    register: `md/SIMBA_V22_PINNED_PLAYLIST_SPECIFICATION.md` and
    `md/SIMBA_V22_PINNED_PLAYLIST_TRACKER.md`.
    **Status: PLANNED, not started.** No feature code has been written. The
    **UI/UX is designed** (the specification's §4) and the tracker carries
    the steps for it: **39–48**, with steps 39–41 replaced by the new
    `PlaylistCover`, the pin glyph and the pin badge, step 42 the kind
    label's single owner, steps 43–47 the pages, and step 48 the phase exit.

**Today's wave (2026-10-30) — the lib release and the guards**

61. ~~**The CI boundary gate was never in version control.**~~ **DONE
    2026-10-30** (bug `B-038`, fix `F-042`). `scripts/check-import-boundaries.js`
    is invoked by `npm run lint:boundaries` and by the CI workflow's
    "Import-boundary linter" step, and it was **never committed**:
    `.gitignore` carries `scripts/*.js`, the file was written after that
    rule, and `git add` **silently skips an ignored path** — no error, no
    warning, no "nothing added". On a fresh clone the gate had no script to
    run: CI failed with `MODULE_NOT_FOUND`, and the import boundary was
    unenforced on every machine except the one that wrote it. The tracked
    scripts are now re-included explicitly, and the rule carries the reason
    so the next person does not "fix" it by editing only one of the two
    files. **A gate that is not in version control is not a gate.**
62. ~~**`pip.autoEnterOnLeave` was a public flag that nothing read.**~~
    **DONE 2026-10-30 by lib `2.1.0`** (bug `B-039`, fix `F-043`). The flag
    was declared in the public config type, defaulted to `true`, documented
    as "auto-enter on home / recents / app-switcher", and read by **nothing**
    — not the JS layer, not the native layer. The value was already
    reaching Kotlin inside the resolved config JSON `setConfig` parses; it
    sat there, unread, while the README described a feature that could not
    happen. It now drives `PictureInPictureParams.Builder.setAutoEnterEnabled`
    (API 31+, the level read from the SDK's own `api-versions.xml`), and the
    params are pushed onto the Activity with `Activity.setPictureInPictureParams`
    — which is what the OS reads when it transitions into PiP **by itself**.
    The params carry the video's CURRENT aspect ratio and are refreshed on
    every `videoReconfig`. **Note:** `Activity.setAutoEnterEnabled` **does
    not exist** — it sounds exactly like the right call, and the SDK's own
    `android.jar` is what proved it. Below API 31 the OS cannot auto-enter at
    all, and the library logs that instead of pretending.
63. **The APK's DEX must be rebuilt.** Lib **1.23.0**'s Kotlin, **2.0.0**'s
    Kotlin changes, **2.0.1**'s `MpvRenderViewRegistry` and repointed
    `isSurfaceMounted`, and **2.1.0**'s `runMpvCommand` error path and the
    PiP auto-enter params all have to be rebuilt into the app's APK. Until
    that happens the app runs the OLD native code, so the device proof for
    items 47 and 62 is **deferred**. **OPEN.**
64. ~~**Every launch dropped the catalogue artwork it already held.**~~
    **DONE 2026-10-30** (bug `B-026`, fix `F-047`). A search result for a
    film the user had already watched showed a placeholder instead of a
    poster, because the history entry's catalogue slot (`thumbnailPath`) was
    written as `''` — the launch carried no artwork, so the session carried
    none, so the checkpoint writer had nothing to write. `PlayInput.thumbnailPath`
    is now an **optional** field, so the ~34 `openPlayer` call sites that pass
    nothing still typecheck, and it is forwarded only when present. Four
    surfaces that already held artwork now hand it over. Deliberately **not**
    `resolveMediaArtwork(item)`: the store's own field docs draw the line —
    `thumbnailPath` is "what the film is", `resumeThumbnailPath` is "where in
    it you were" — and handing the frame over would replace the poster with a
    still of one moment of the film.
65. ~~**The legacy-architecture dependency shipped silently, and nothing in
    the repo would have caught it.**~~ **DONE 2026-10-30** (bug `B-037`, fix
    `F-046`). The narrow guard that named one package is now the **general**
    one: `scripts/check-legacy-event-emitter.cjs` scans the installed
    dependencies' Android sources for `getJSModule(RCTEventEmitter)` — the one
    class RN 0.86's `BridgelessReactContext` refuses — and fails on a new
    one, so the LogBox toast (item 24) cannot come back through the next
    dependency that makes that call. One allow-listed package,
    `react-native-svg`, whose identical call is **dead code** —
    `onReceiveNativeEvent()` has exactly one occurrence in all of node_modules,
    its own declaration, so RN never calls it. Measured: **26 packages with
    Android sources, 660 files, 0 errors, 1 allowed finding.**
66. **The lib released `2.1.0`** (annotated tag, Actions published, verified
    on the registry). The release carries five things: the native layer
    stops swallowing mpv's verdict (item 47); the PiP auto-enter flag does
    something (item 62); the published tarball carries **only** what a
    consumer runs (83 files / 285.2 kB → 54 files / 215.5 kB — the Kotlin
    tests, the JS tests and two one-shot dev patches, including a Python
    script, are out, and `example/` and the git metadata are now excluded
    **explicitly** so a future change to `files` cannot let them back in);
    the repository no longer carries its own scratch (43 files — 16
    commit-message drafts, the `delete_me/` folder with a 63 MB archive, and
    six published tarballs at 65 MB each, ~390 MB of history for no reason —
    moved under `.local/`, which is gitignored); and the README was rewritten
    against the source, because npmjs renders it as of publish time and the
    package page was still describing a component removed in 2.0.0.

---

## 9. Working rules that apply to every stage

- **Never trust a green build alone** — verify which source copy compiled.
- **A gate's result is READ from its output, never recalled.** W32 shipped a
  commit whose `tsc` gate was **red** — six type errors in the two test files
  that same wave added — while the wave's own summary recorded `tsc → 0`. The
  runtime was fine, so `jest` stayed green at 105 suites / 1265 tests and
  only `tsc` could see it. A gate nobody read the output of is not a gate; it
  is a habit that looks like one.
- **Tests pin the contract** and must fail without the fix. Mutation-check every
  "must not do X" test. A harness that cannot prove it saw a result must print
  `HARNESS-ERROR`, not a verdict.
- **A jest mock must match the library's API SURFACE, not just its element
  name.** A bare-string mock (`'FastImage'`) made `FastImage.resizeMode.cover`
  throw and hid the fact that the branch under test never ran — the failure
  looks like a product bug, so it sends you to the wrong file. Mock the statics,
  enums and helpers the code actually calls. Likewise, a fixture must carry
  every field the code branches on: a missing optional field is a silent
  contract violation, not a no-op.
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
- **A tracker's `State:` line can go stale and contradict its own later
  section.** `B-015` read "open. Unverified — no remote capture has been
  exercised" while open question 1 in the same file answered it **YES** two
  days earlier. When you answer a question in a tracker, update the older
  entry's state **in the same commit** — and check a status line against the
  **device**, never against the document.
- **A register entry is a claim about the code, not a fact about it.** Every
  item in this wave was re-verified against the source before it was fixed,
  and three entries were wrong — in a way that would have sent the work to
  the wrong repo. Read the code; the register is a list of questions, not a
  list of answers.
- **A path that bypasses the app's seam does not belong in the app — even
  when the package exports it.** The deep link used the lib's
  `useOpenFromUrl`, which bypassed `useResumeAwareLaunch` and asked the
  bridge whether a surface existed — and the bridge's answer was always
  "no". A shared **video** therefore never played at all, and a shared
  **audio** track played where the app could not see it: no now-playing
  entry, no checkpoint, no dock. The export was convenient and wrong — the
  app had a seam for launches, and the deep link was the one launch that
  skipped it.
- **A rule that lives in seven call sites is not a rule — it is seven chances
  to get it wrong.** The app had six files for one floating action button and
  they had already drifted on the right margin, the shadow and the z-index.
  The bottom-chrome rule was about to become the seventh thing to drift, so
  it went into the ONE component that draws a FAB. **When a fact must hold
  everywhere, it belongs in the component that draws it — not in a
  convention the code follows by hand.**
- **A deleted UI kit leaves its GEOMETRY behind.** The bottom tab bar was
  gone for waves, and its 48 dp clearance survived in six screens' padding
  while its 100 dp clearance survived in the Home FAB's offset — numbers
  nobody could explain because nobody knew what they were measuring. A
  deleted component leaves **two** debts: the code, and the arithmetic that
  was sized for it. When you delete a UI kit, hunt its numbers too. The tell
  is a constant that has no owner: `+104` was mini player **plus** tab bar,
  and once the tab bar was gone the sum was a lie that looked like a
  measurement.
- **A shared component is only shared when EVERY surface that needs it uses
  it.** `PlaylistCreateModal` was a real, correct, shared-looking component —
  and two of the four surfaces that create a playlist ignored it and kept
  their own inline copies. "There is a component for this" is not the same
  fact as "there is one owner for this". Count the call sites before you
  call something shared; and if two surfaces already disagree about the
  rule, the rule has to be extracted before the surfaces can be merged.
- **A message that reports a count must count what HAPPENED, not what was
  REQUESTED.** The batch "add to playlist" toast said
  `Added ${selectedItems.length} items` — the number the user selected —
  while the store silently refuses a lane mismatch
  (`src/state/playlistsStore.ts:180`). So the one message that told the user
  "done" was the one that was not true. If an operation can partially
  succeed, the message must report the partial result.