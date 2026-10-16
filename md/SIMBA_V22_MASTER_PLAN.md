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

### Stage 6 — `A` swap
`VideoSurface` → `SimbaVideo` in `VideoPlayer`; chrome becomes an ordinary
sibling; delete `useVideoSurface` and the `measureInWindow` → bounds path.
**Gate:** `tsc` 0 · `eslint` 0 · `jest` no regressions · **video visible on
device** · header-back → mini dock → browsing stack restores.

### Stage 7 — `A` remove the invariant
Delete `BrowsingStack` · delete `MainActivity` surface mount · delete
`PlayerSurface` import surface · revise the 17 test files.
**Gate:** full device matrix — PiP in/out, dock rotation, a→v→a switching,
hardware back at each level, next/prev with a real playlist.

### Stage 8 — P0 back + P1 duration
Both need instrumentation, not guesswork — see §7.

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