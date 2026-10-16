# RN Media Module Integration — What Shipping Modules Actually Do

**Date:** 2026-10-16
**Status:** Research complete. Supersedes the architecture recommendation in
`SIMBA_V22_DEVICE_FINDINGS_AND_RN_ARCHITECTURE_BRIEF.md` §"Route A / Route B"
(see §6 — the TextureView recommendation there was **wrong** and is corrected).
**Method:** Read primary source, not docs. Every claim below cites the file it
came from.

---

## 1. Bottom line

The "universal pattern" is not one thing. It is **three separable decisions**,
and shipping modules make them independently:

| # | Decision | Who owns it |
|---|---|---|
| 1 | **The picture is a native view component in the React tree.** RN creates it, RN lays it out, RN gives it z-order, RN destroys it. | View component |
| 2 | **Imperative calls are addressed to a specific view instance** — by ref / reactTag — never to a global module that doesn't know which view you mean. | View commands |
| 3 | **The player is separate from the view.** A headless player can exist with no view, can move between views, and can preload. | Player object |

SIMBA currently implements **none of the three**. That is the whole gap. It is
not a styling problem or a layout problem; it is that the video lane has no
React-native view at all.

---

## 2. Evidence: react-native-video v6.19.3 (the stable line)

### 2.1 The view is a real ViewManager

`android/src/main/java/com/brentvatne/exoplayer/ReactExoplayerViewManager.kt`

```kotlin
class ReactExoplayerViewManager(private val config: ReactExoplayerConfig)
  : ViewGroupManager<ReactExoplayerView>() {

    companion object { private const val REACT_CLASS = "RCTVideo" }

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(themedReactContext: ThemedReactContext): ReactExoplayerView {
      ReactNativeVideoManager.getInstance().registerView(this)
      return ReactExoplayerView(themedReactContext, config)
    }

    override fun onDropViewInstance(view: ReactExoplayerView) {
      view.cleanUpResources()
      view.exitPictureInPictureMode()
      ReactNativeVideoManager.getInstance().unregisterView(this)
    }
```

Note `ViewGroupManager`, not `SimpleViewManager` — the RN view is a
`ViewGroup` that **contains** the `PlayerView` (and therefore the `SurfaceView`).

### 2.2 Nearly everything is a prop, not a command

The same file declares ~20 `@ReactProp`s. Verbatim selection:

```
src, resizeMode, repeat, selectedAudioTrack, selectedTextTrack,
selectedVideoTrack, paused, muted, enterPictureInPictureOnLeave,
audioOutput, volume, preventsDisplaySleepDuringVideoPlayback,
progressUpdateInterval, reportBandwidth, rate, maxBitRate,
playInBackground, disableFocus, bufferingStrategy, focusable,
fullscreen, viewType, controls, subtitleStyle, shutterColor,
showNotificationControls, debug, controlsStyles
```

`paused`, `volume`, `rate`, `fullscreen` are **props**. Commands also exist for
them (§2.3) — the same operation is reachable both ways. Props are the
declarative default; commands are the imperative escape hatch.

### 2.3 Commands are addressed by reactTag

`src/specs/NativeVideoManager.ts`:

```ts
export interface VideoManagerType {
  seekCmd: (reactTag: Int32, time: Float, tolerance?: Float) => Promise<void>;
  setPlayerPauseStateCmd: (reactTag: Int32, paused: boolean) => Promise<void>;
  setFullScreenCmd: (reactTag: Int32, fullScreen: boolean) => Promise<void>;
  setSourceCmd: (reactTag: Int32, source?: UnsafeObject) => Promise<void>;
  setVolumeCmd: (reactTag: Int32, volume: number) => Promise<void>;
  enterPictureInPictureCmd: (reactTag: number) => Promise<void>;
  exitPictureInPictureCmd: (reactTag: number) => Promise<void>;
  getCurrentPosition: (reactTag: Int32) => Promise<Int32>;
}
```

**Every single method takes `reactTag` as its first argument.** A global
singleton manager exists, but it is a *registry of views keyed by tag*, not a
player. That distinction is the entire point and SIMBA has it backwards.

### 2.4 The JS surface: forwardRef + useImperativeHandle

`src/Video.tsx`:

```tsx
const Video = forwardRef<VideoRef, ReactVideoProps>(({ source, style, ...rest }, ref) => {
  const nativeRef = useRef<ElementRef<typeof NativeVideoComponent>>(null);

  const seek = useCallback((time: number, tolerance?: number) => {
    if (!nativeRef.current) { console.warn('Video Component is not mounted'); return; }
    NativeVideoManager.seekCmd(getReactTag(nativeRef), time, tolerance || 0);
  }, []);

  const pause  = useCallback(() => NativeVideoManager.setPlayerPauseStateCmd(getReactTag(nativeRef), true),  []);
  const resume = useCallback(() => NativeVideoManager.setPlayerPauseStateCmd(getReactTag(nativeRef), false), []);
  const setVolume = useCallback((v: number) => NativeVideoManager.setVolumeCmd(getReactTag(nativeRef), v), []);
  const enterPictureInPicture  = useCallback(() => NativeVideoManager.enterPictureInPictureCmd(getReactTag(nativeRef)), []);
  const exitPictureInPicture   = useCallback(() => NativeVideoManager.exitPictureInPictureCmd(getReactTag(nativeRef)), []);

  useImperativeHandle(ref, () => ({ seek, pause, resume, setVolume,
    presentFullscreenPlayer, dismissFullscreenPlayer, setFullScreen,
    enterPictureInPicture, exitPictureInPicture, setSource, ... }), [...deps]);

  return (
    <View style={style}>
      <NativeVideoComponent ref={nativeRef} {...rest} src={src} style={StyleSheet.absoluteFill} ... />
      {_renderPoster()}
    </View>
  );
});
```

Usage is then ordinary React:

```tsx
const ref = useRef<Video>(null);
<Video ref={ref} source={{uri}} style={{flex:1}} />
ref.current?.seek(120);
```

### 2.5 The library draws **no** chrome

`PROP_CONTROLS` has `defaultBoolean = false`. Out of the box `<Video>` renders
a picture and nothing else. Every button, slider, PiP affordance, and label is
the app's own React. That is what makes the integration "simple": the library
owns the surface, the app owns the screen.

### 2.6 SurfaceView inside an RN view, and PiP still works

`ExoPlayerView.kt` wraps media3's `PlayerView` (which contains the SurfaceView)
as a child:

```kotlin
class ExoPlayerView(...) : FrameLayout(context, attrs, defStyleAttr) {
    private val playerView = PlayerView(context).apply {
        layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        setShutterBackgroundColor(Color.TRANSPARENT)
        ...
    }
    init { addView(playerView, playerViewLayoutParams) }
```

PiP is a first-class feature of this shape
(`PictureInPictureUtil.kt`, `enterPictureInPictureOnLeave` prop,
`onPictureInPictureStatusChanged` event). **SurfaceView + PiP is not the
problem.** Being outside the React tree is.

### 2.7 The interop hazard, documented by the library itself

`ExoPlayerView.kt` overrides `requestLayout()`:

```kotlin
/**
 * React Native (Yoga) can sometimes defer layout passes that are required by
 * PlayerView for its child views (controller overlay, surface view, subtitle view, …).
 * This helper forces a second measure / layout after RN finishes, ensuring the
 * internal views receive the final size. The same approach is used in the v7
 * implementation (see VideoView.kt) and in React Native core (Toolbar example).
 */
private val layoutRunnable = Runnable {
    measure(MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY))
    layout(left, top, right, bottom)
}
override fun requestLayout() {
    super.requestLayout()
    post(layoutRunnable)
}
```

This is the single most useful finding in the research. A shipping library
explicitly works around **Yoga's layout pass and SurfaceView's layout not being
synchronized**. Any SIMBA design that mutates `LayoutParams` from Kotlin —
bypassing Yoga — is walking into the same hazard with no guard.

### 2.8 Honest note: their surface-type switch is a stub

```kotlin
fun updateSurfaceView(viewType: Int) {
    // TODO: Implement proper surface type switching if needed
}
```

`viewType` (`SURFACE` / `TEXTURE` / `SURFACE_SECURE`) is a real prop with a real
default, but the switch is **not implemented** in 6.19.3. Do not cite
react-native-video as proof that SurfaceView→TextureView switching is a solved
problem. It is not — in either library.

---

## 3. Evidence: expo-video — the player ⊥ view split

`expo-video` takes decision §1 and pushes it one step further by also taking §3.

```tsx
const player = useVideoPlayer(videoSource, (player) => {
  player.loop = true;
  player.play();
});

<VideoView style={styles.video} player={player} allowsPictureInPicture />
```

From the official docs:

> "While another video is playing, a video can be loaded before showing it in the
> view. … Even when the player is not connected to a `VideoView`, it will fill
> the buffers. Once it is connected to the `VideoView`, it will be able to start
> playing without buffering."

> "You can change a player's `View` without creating a new player every time."

> "You don't have to attach it to a `View` right away."

So the shapes are independent and composable:

| | headless player | attached view |
|---|---|---|
| audio playback | ✅ | not needed |
| video playback | ✅ | ✅ |
| preloading | ✅ | not needed |

**This is the table SIMBA needs**, and it is why the target shape is closer to
`expo-video` than to `react-native-video`: SIMBA's audio lane is the dominant
one and has no picture at all, while the video lane needs a view. One engine,
two consumers.

Note also that `VideoView` carries a `ref` for view-scoped operations
(`enterFullscreen()` / `exitFullscreen()`), while `player` carries the playback
API. **Both addresses exist, and they are different addresses.** That is §2 and
§3 coexisting, deliberately.

---

## 4. Evidence: react-native-video master (v7) and vision-camera

**v7** has moved the engine to Nitro but kept the view as a Fabric component:

`packages/react-native-video/src/spec/fabric/VideoViewNativeComponent.ts`
```ts
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
export interface ViewViewNativeProps extends ViewProps {
  nitroId: Int32;
  onNitroIdChange?: DirectEventHandler<OnNitroIdChangeEvent>;
}
export default codegenNativeComponent<ViewViewNativeProps>('RNCVideoView');
```

and `package.json`:
```json
"codegenConfig": {
  "name": "RNCVideoViewSpec",
  "type": "components",
  "jsSrcsDir": "src/spec/fabric",
  "android": { "javaPackageName": "com.twg.video.react" }
}
```

The view is a thin shim that hands off to a host object by id — but it is
**still a Fabric component in the tree**, not a self-mounting window inserter.
The invariant survived the engine rewrite.

**vision-camera** is the same shape with a different domain:
```tsx
<Camera style={{flex:1}} isActive={true} device="back" />
// and, imperatively, via ref:
cameraRef.current?.takePhoto();   // dispatched to THAT view
```

---

## 5. SIMBA's current state, against that bar

Verified this session.

### 5.1 There is no view component

`react-native-media-player/package.json`:
```json
"codegenConfig": { "name": "SimbaPlayerSpec", "type": "modules", "jsSrcsDir": "src" }
```

`"type": "modules"` — codegen generates **no component glue at all**.
`react-native-video` uses `"components"`; a mixed library uses `"all"`.

`grep requireNativeComponent|codegenNativeComponent` over `lib/src` → **zero
hits.** `PlayerSurface` is a no-op transparent `<View>`; the JS surface does
not exist.

### 5.2 The ViewManager that exists is registered nowhere

`android/src/main/java/com/simba/player/PlayerPackage.kt` is a `TurboReactPackage`
whose own docstring admits it:

> "The `ViewManager` side is left empty — the module's `MpvRenderViewManager`
> (which is V11-era …) is kept in the `mpv` subpackage for backward compat
> until W8 (Phase 41+ deletes the V11 inline-mount path)."

There is no `createViewManagers` and no `getViewManager` override. `MpvRenderViewManager`
is referenced by **no registration site anywhere** — the only references in the
app are `MainActivity.kt:42` (import) and `:57` (field). It is dead code that
happens to look like the right shape.

### 5.3 The view is mounted by Kotlin into the content view

`MainActivity.kt:85` → `PlayerSurface.mount(this)`, which inserts the
`MpvRenderView` at `android.R.id.content` index 0. It is a sibling of the React
root, not a descendant. RN cannot lay it out, cannot z-order it, and cannot
destroy it — which is precisely why an opaque React root painted over it and
why `BrowsingStack` had to be invented.

### 5.4 Imperative calls have no view identity

`lib/src/types/player.ts:501` `function buildCommands(): PlayerCommands` builds a
plain JS object whose methods call `NativeMpvPlayer` — a global TurboModule.
Compare §2.3: no `reactTag`, no ref, no view. `enterPiP` and `fillVideoBounds`
are indistinguishable from `play()` in shape.

### 5.5 Gap table

| Decision | react-native-video | expo-video | SIMBA today |
|---|---|---|---|
| View in React tree | ✅ `ViewGroupManager<ReactExoplayerView>` | ✅ `VideoView` | ❌ mounted by Kotlin into content view |
| `codegenConfig.type` | `"components"` | `"all"` | `"modules"` |
| Commands by view identity | ✅ `reactTag` first arg | ✅ `VideoView` ref | ❌ global module, no identity |
| Player ⊥ view | ❌ (view always) | ✅ `useVideoPlayer` w/o view | ❌ (surface always mounted hidden at 0×0) |
| Library draws no chrome | ✅ `controls=false` default | ✅ | ✅ (correct already) |
| Yoga↔SurfaceView layout guard | ✅ documented `requestLayout` override | n/a (Android `PlayerView`) | ❌ raw `LayoutParams` mutation from Kotlin |

The **last two rows are the only ones SIMBA gets right today**, and they are the
easy ones.

---

## 6. Correction: the TextureView recommendation was wrong

`SIMBA_V22_DEVICE_FINDINGS_AND_RN_ARCHITECTURE_BRIEF.md` recommended
"Route A (`TextureView`)" as "the clean destination", on the grounds that
`SurfaceView` cannot participate in RN z-order.

**That recommendation does not survive contact with the evidence:**

1. react-native-video puts a `SurfaceView` inside an RN-managed `ViewGroup` and
   ships working PiP (§2.6). z-order is fine as long as the view is in the tree.
2. SIMBA's **own** `MpvRenderView.kt` docstring records the opposite finding,
   from having actually tested it:

   > "Why SurfaceView and not TextureView (tested both): … When the Activity
   > pauses for PiP, HWUI suspends draw passes for paused activities and the
   > TextureView's display layer becomes stale even though the SurfaceTexture
   > keeps receiving producer buffers. **PiP shows black.**"

3. And react-native-video's own surface-type switch is a TODO (§2.8), so the
   TextureView path is unsolved in the reference implementation too.

So "Stage 2: `SurfaceView` → `TextureView`" is not a stage. It is a rewrite of
libmpv's renderer that buys nothing, against a measured regression. **Dropped.**

The TextureView fall-through that survives is narrow and only as a fallback: if
`SurfaceView` demonstrably cannot be made to work in-tree on the target device,
`TextureView` is the alternative — but it costs PiP, so it is a last resort, not
a destination.

---

## 7. What the target actually is

```
┌─ MpvPlayerModule (TurboModule) ──────────────── EXISTS ─┐
│  headless: audio, queue, media session, notification     │
└──────────────────────────────────────────────────────────┘
                          ▲ commands (no view identity needed —
                          │   there is no picture)
┌─ SimbaVideoView (Fabric component) ────────── MISSING ───┐
│  <SimbaVideoView style={…} src={…} paused muted volume  │
│                  resizeMode onProgress onReadyForDisplay/>│
└──────────────────────────────────────────────────────────┘
                          ▲ ref commands
                          │   seek / pause / play / enterPiP /
                          │   exitPiP — addressed to THIS view
```

App side:

```tsx
const videoRef = useRef<SimbaVideoView>(null);

{isExpanded && (
  <>
    <SimbaVideoView
      ref={videoRef}
      style={StyleSheet.absoluteFill}
      src={source}
      paused={!isPlaying}
      muted={muted}
      volume={volume}
      resizeMode="contain"
      onProgress={onProgress}
      onReadyForDisplay={markSurfaceVisible}
    />
    <PlayerChrome />   {/* ordinary sibling RN views, z-order handled by RN */}
  </>
)}
```

### What this deletes

- `useVideoSurface.ts` — the entire present/hide/fill/bounds writer, including
  the "content index 0" invariant that has to be defended in comments.
- `BrowsingStack.tsx` — its entire reason for existing was "the React root
  paints an opaque background over a sibling of itself". If the video is a
  descendant, the root cannot cover it without the root actually being asked to.
- `PlayerSurface.mount(activity)` and the manual 0×0 hide/show lifecycle.
- The `setVideoBounds` window-pixel ⇄ margin translation (with its four-paragraph
  comment about coordinate systems). RN does layout.

### What this fixes for free

- **The black video (P1).** A view in the tree gets a real Yoga layout pass.
  Today the surface's bounds come from a raw `LayoutParams` mutation with no
  guarantee a measure/layout pass follows — exactly the hazard react-native-video
  had to work around (§2.7).
- **`fillVideoBounds` refusal on non-positive extents** (currently a `Log.w` and
  a silent no-op) becomes unrepresentable: you cannot lay out a `0×0` view and
  expect frames.

### Honest costs

1. **Lib public API change** → full release cycle (commit → push → annotated tag
   `v<version>` → Actions → `npm install`). Not a local tarball.
2. **New-arch Fabric component glue** on Android: spec file, codegen
   `type: "modules" → "all"`, a `ViewManager` registered in `PlayerPackage`,
   and the commands plumbing. The existing `MpvRenderViewManager` is a
   `SimpleViewManager` for the **old** architecture — it cannot be reused as-is
   under Fabric, though its `@ReactProp(name = "nativePtr")` and
   `onDropViewInstance` logic are the right shape.
3. **Fabric remount semantics differ.** RN may drop and recreate a view under
   memory pressure; the mpv handle must survive that. `setNativePtr` already
   handles rebinding (`attachedSurface = null; ensureSurfaceAttached(...)`) so
   this is designed for, but it needs a test, not an assumption.
4. **`force-window` stickiness.** `attachSurfaceLocked` sets `force-window=yes`
  on attach and the class comment says not to toggle it mid-frame. Under RN's
   layout churn that has to be re-verified, not assumed.

---

## 8. Sources

All primary source, fetched this session:

- `react-native-video` v6.19.3 — `src/Video.tsx`, `src/specs/NativeVideoManager.ts`,
  `android/.../ReactExoplayerViewManager.kt`, `android/.../ExoPlayerView.kt`
- `react-native-video` master — `packages/react-native-video/src/spec/fabric/VideoViewNativeComponent.ts`,
  `packages/react-native-video/src/core/video-view/NativeVideoView.tsx`, `package.json`
- `expo-video` — https://docs.expo.dev/versions/latest/sdk/video/ ,
  https://expo.dev/blog/expo-video-a-simple-powerful-way-to-play-videos-in-apps
- `react-native-vision-camera` — https://visioncamera.margelo.com/docs
- RN codegen contract — https://reactnative.dev/docs/the-new-architecture/using-codegen ,
  https://reactnative.dev/docs/the-new-architecture/fabric-component-native-commands
- SIMBA — `lib/package.json`, `lib/src/index.ts`, `lib/src/types/player.ts`,
  `PlayerPackage.kt`, `MpvRenderView.kt`, `MpvRenderViewManager.kt`,
  `app/android/.../MainActivity.kt`
