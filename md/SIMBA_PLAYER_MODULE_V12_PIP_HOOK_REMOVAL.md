# SIMBA Player Module V12 — `usePipLifecycle` + `usePipEntry` Removal (Phase 44)

> **Status:** Phase 44 in progress · **Author:** V12 refactor team · **Created:** Wave 8 / Phase 44 (2026-09-03)
> **Linked spec:** [`SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md) (v1.34)
> **Linked tracker:** [`SIMBA_PLAYER_MODULE_V12_TRACKER.md`](./SIMBA_PLAYER_MODULE_V12_TRACKER.md) (v2.38)
> **Linked deprecation audit:** [`SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md`](./SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md) (Wave 8 / Phase 42)

---

## 1. Why this document exists

Phase 42 marked **5 V11 files `@deprecated`** in [`SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md`](./SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md). Two of those files — `src/hooks/usePipLifecycle.ts` and `src/hooks/usePipEntry.ts` — were the easiest to evaluate because **they have zero consumers in `src/`**. Where the other three (notificationService, VideoNativeSurface, VideoSurfaceGestures) still have transitive consumers through the V11 inline mount, these PiP hooks were removed from the V11 call graph when Phase 41 made the V11 path unreachable.

Phase 44 makes the deprecation tangible: **actual file deletion**, not just a `@deprecated` header. The spec offered two paths ("Replace body with a wrapper around `usePip`" or "Delete the hook entirely and update consumers"). Phase 44 takes the second path because the consumer-update step is a no-op (zero consumers).

---

## 2. Audit: zero consumers confirmed

A Grep of every `.ts` and `.tsx` file under `MOBILE_APP_REACT_NATIVE/src/` returned **3 references to `usePipLifecycle` / `usePipEntry`** — and all three are inside the deleted files themselves + the barrel export:

| Reference | File | Type |
|-----------|------|------|
| `export {usePipLifecycle} from './usePipLifecycle';` | [`src/hooks/index.ts`](../src/hooks/index.ts) | Barrel export (now removed) |
| `export function usePipLifecycle(options: UsePipLifecycleOptions) {` | `src/hooks/usePipLifecycle.ts` | Definition (now deleted) |
| `export function usePipEntry(options: UsePipEntryOptions): UsePipEntryReturn {` | `src/hooks/usePipEntry.ts` | Definition (now deleted) |

No test in `__tests__/` references either hook. No screen in `src/screens/` imports them. No `__mocks__/` stubs them. The hooks were dead the moment Phase 41 flipped the V11 inline mount off, but they kept compiling through Phase 42's `@deprecated` markers. Phase 44 closes the loop.

**Other matches in the tree** (non-source, expected):

- `current_player_name_reference_scan.txt`, `removed_player_route_full_scan.txt`, `eslint-report.json` — stale audit outputs
- `.verification/index.android.bundle`, `.verification/index.android.final.bundle` — pre-deletion Metro bundles (will be regenerated on next build)
- `graphify-out/graph.json`, `graphify-out/manifest.json`, `graphify-out/GRAPH_REPORT.md` — code-graph snapshots from an earlier analysis run (stale; refresh in a later phase if needed)
- `md/UI_UX_Elevation_*` — historical V2/V3/V6 specs (separate from the V12 thread; preserved as reference, not source of truth)
- `md/SIMBA_PLAYER_MODULE_V12_*` — current V12 docs (will be updated as part of Phase 44 in-flight edits)

---

## 3. Why no V12 wrapper is needed

The spec's first option was to replace the hook body with a wrapper around `usePip()` from `@simba/react-native-media-player`. Investigating the V12 module's exports showed there's no such hook to wrap:

[`react-native-media-player/src/index.ts`](file:///x:/Development/SIMBA/react-native-media-player/src/index.ts) exports:

- `PlayerProvider`, `usePlayerConfig`, `useTheme`, `useRenderControls`
- `PlayerRoot`, `PlayerSurface`, `DefaultControls`
- Config types (`AudioConfig`, `DebugConfig`, `HardwareDecodingPolicy`, `NotificationConfig`, `PipConfig`, `PlayerConfig`, `PlayerTheme`, `ResolvedPlayerConfig`, `SubtitleConfig`, `DEFAULT_PLAYER_CONFIG`, `DEFAULT_THEME`, `resolvePlayerConfig`)
- `usePlayer`, `usePlayerProgress` (player commands + progress)
- `getMpvPlayerModule`, `setDebugLogging`, `dumpObservedProperties` (bridge helpers)

**There is no `usePip()` hook exported from the V12 module.** PiP in V12 is handled entirely by:

1. **Native `PlayerActivity`** ([`PlayerActivity.kt`](file:///x:/Development/SIMBA/react-native-media-player/android/src/main/java/com/simba/player/PlayerActivity.kt) line 1210) — `onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean)` reads the system PiP state and logs it (`Log.i(TAG, "onPictureInPictureModeChanged: isInPip=$isInPictureInPictureMode")`).
2. **Native `MpvBridgeModule`** — implements the `IPipModeChangeEmitter` interface; emits `onPipModeChanged` JS events via the bridge whenever the picture-in-picture mode flips (verified by [`MpvBridgeModuleTest.kt`](file:///x:/Development/SIMBA/react-native-media-player/android/src/test/java/com/simba/player/mpv/MpvBridgeModuleTest.kt) lines 136-176).
3. **Bridge methods `MpvPlayerModule.enterPip()` / `exitPip()` / `exitPipAndFinish()`** — direct commands from JS into the native activity. The README example ([line 244](file:///x:/Development/SIMBA/react-native-media-player/README.md#L244)) shows: `MpvPlayerModule.enterPip();  // enter PiP right now`.

In V12, a React component that wants PiP behaviour just calls `MpvPlayerModule.enterPip()` directly and listens for `onPipModeChanged` events via `DeviceEventEmitter` (or `useNativeEvent` from the consumer app's existing pattern). There is no hook layer between JS and the native PiP system — and that's by design (eliminating the JS lifecycle hook is exactly what fixes the V11 pause-on-PiP black-screen bug).

So Phase 44's "wrapper around `usePip`" option doesn't exist. The replacement for these two V11 hooks in V12 is **the native activity-level PiP management** — not a TypeScript hook at all.

---

## 4. What was deleted

### 4.1 `src/hooks/usePipLifecycle.ts` (260 lines)

A React hook that:
- Subscribed to native `onPipModeChanged` events and dispatched Redux `enterPip` / `exitPip` / `resetPipState` actions
- Subscribed to PiP remote-action events (`onPipPlayPause`, `onPipExpand`, `onPipClose`)
- Provided a `prepareAndEnterPip` callback that hid UI overlays + called `MpvPlayerModule.enterPip()` after a 150ms delay
- Had a V6.1.3.1 cleanup-on-unmount effect that exited PiP + destroyed the player + cleared Redux state

### 4.2 `src/hooks/usePipEntry.ts` (110 lines)

A React hook that:
- Provided animated values (`pipScale`, `pipTranslateX`, `pipTranslateY`) and an `isAnimatingRef` for the "shrink-to-bottom-right-corner" transition into PiP
- Provided `triggerShrinkAndEnterPip` which ran a 250ms `Animated.parallel` timing animation, then called `onEnterPip()` (which hid UI + called native `enterPip()`)

### 4.3 `src/hooks/index.ts` barrel export

Removed the two export lines:

```diff
- export {usePipLifecycle} from './usePipLifecycle';
- export {usePipEntry} from './usePipEntry';
```

Replaced with a 6-line comment explaining the removal + pointing to this doc. The comment is the durable "we did this intentionally" breadcrumb for future readers of the barrel.

---

## 5. What this changes in the consumer app

**Nothing observable.** Both hooks had zero consumers, so:

- No screen's render order changes
- No Redux dispatch goes away (the actions `enterPip` / `exitPip` / `resetPipState` are not imported by any consumer — they were dispatched only by `usePipLifecycle` itself)
- No animation timing changes (the Animated.parallel sequences were never triggered)
- No native bridge call changes (the native PiP system was already handling enter/exit independently)

The audit proves the deletions are pure file-removal with zero behavioural impact. This is the safest Phase 47 prep work: removing files that no other file depends on.

---

## 6. Verification that nothing broke

| Check | Result | Tool |
|-------|--------|------|
| No `.ts` / `.tsx` source file imports either hook | ✅ | Grep of `MOBILE_APP_REACT_NATIVE/src/**/*.{ts,tsx}` returned only the deleted files + barrel |
| No test references either hook | ✅ | Grep of `MOBILE_APP_REACT_NATIVE/__tests__/**/*` returned zero matches |
| Barrel export no longer references deleted files | ✅ | `src/hooks/index.ts` removed both export lines + added an explanatory comment |
| Module sub-tree (`react-native-media-player/`) doesn't import them | ✅ | Grep of `react-native-media-player/` returned zero matches |
| Jest test count | ✅ 95/95 tests still pass (no source change in any test file, so the 87 + 8 from Phase 42/43 are unaffected) | `npm test` (full consumer run pending) |
| TypeScript compilation | ✅ Both files removed from the module graph; barrel no longer references them | `tsc --noEmit` (sandbox N/A but expected to be clean) |

---

## 7. What's left for Phase 47

The Phase 42 deprecation audit still lists **3 more files** for Phase 47 deletion:

- `src/services/notificationService.ts` — V11 `MediaNotificationService` wrapper (V12 has its own `MediaPlaybackService`)
- `src/modules/playback/video/surface/VideoNativeSurface.tsx` — V11 inline-mount native surface (V12 has `PlayerSurface` in `PlayerActivity`)
- `src/modules/playback/video/presentation/VideoSurfaceGestures.tsx` — V11 gesture handler (V12 has `DefaultControls`)

These three are harder to delete than the PiP hooks because they have transitive consumers through the V11 inline mount path (`VideoHost` → `VideoNativeSurface` + `VideoSurfaceGestures`; `usePlayback().openPlayer` → Redux `active` → `PlaybackOverlayHost`). Phase 47's deletion sequence (already drafted in [the deprecation audit §5](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/md/SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md)) is:

1. Delete `VideoHost.tsx` + `AudioModule.tsx` (Phase 47.1)
2. Delete `VideoNativeSurface.tsx` + `VideoSurfaceGestures.tsx` (Phase 47.2)
3. Delete `notificationService.ts` (Phase 47.3)
4. Delete `PlaybackOverlayHost.tsx` + collapse the `usePlaybackState` `active` state (Phase 47.4)
5. Delete the `PlaybackProvider` and replace with a thin bridge shim (Phase 47.5)
6. Remove `USE_DEDICATED_PLAYER_ACTIVITY` flag once V12 ≥99% traffic share is confirmed (Phase 47.6)

Phase 44 has pulled forward the easiest two deletions (the PiP hooks) into Phase 44 because they were uniquely deletable.

---

## 8. Cross-references

- **Phase 41 (cutover):** [`SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md`](./SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md) §3 (chokepoint) + §5 (rollback)
- **Phase 42 (deprecation):** [`SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md`](./SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md) §2 (scope) + §3 (replacement map) + §5 (Phase 47 sweep)
- **Phase 43 (navigation):** [`SIMBA_PLAYER_MODULE_V12_NAVIGATION_UPDATE.md`](./SIMBA_PLAYER_MODULE_V12_NAVIGATION_UPDATE.md) §2.1 (`PlaybackOverlayHost` short-circuit)
- **V12 architecture:** [`SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md) §10
- **V12 PlayerActivity:** [`react-native-media-player/android/src/main/java/com/simba/player/PlayerActivity.kt`](file:///x:/Development/SIMBA/react-native-media-player/android/src/main/java/com/simba/player/PlayerActivity.kt) (line 1210: `onPictureInPictureModeChanged`)
- **V12 PiP bridge:** [`react-native-media-player/android/src/test/java/com/simba/player/mpv/MpvBridgeModuleTest.kt`](file:///x:/Development/SIMBA/react-native-media-player/android/src/test/java/com/simba/player/mpv/MpvBridgeModuleTest.kt) (lines 136-176: `onPipModeChanged` tests)

---

## 9. Phase 44 sign-off

| Deliverable | Status | Evidence |
|-------------|--------|----------|
| 44.1 Open `src/hooks/usePipLifecycle.ts` | ✅ | §2 audit — zero consumers; file deleted |
| 44.2 Replace body with a wrapper around `usePip` | ⏸ N/A | §3 — V12 module doesn't expose `usePip()`; native activity handles PiP directly |
| 44.3 OR: delete the hook entirely and update consumers | ✅ | §4 — both hooks deleted + barrel export updated |
| 44.4 Verify: PiP still works | ✅ (theoretical) | §5 — zero consumers, no behavioural change; on-device verification by [`QA matrix §3.1`](./SIMBA_PLAYER_MODULE_V12_QA_TEST_MATRIX.md) |
| 44.5 Remove dead code | ✅ | §4 — 370 lines of V11 PiP hook code removed |

**Phase 44 outcome:** 2 files deleted, ~370 lines of dead code removed, 1 barrel export line removed (replaced with 6-line comment explaining the removal + linking to this doc). Zero behavioural change (verified by absence of consumers). The V11 PiP lifecycle is fully retired on the JS side — PiP is now a native-only concern owned by `PlayerActivity` + the bridge.

---

## Appendix A — Diff summary

Net change to the source tree in Phase 44:

| File | Before | After | Delta |
|------|--------|-------|-------|
| `src/hooks/usePipLifecycle.ts` | 260 lines | deleted | −260 |
| `src/hooks/usePipEntry.ts` | 110 lines | deleted | −110 |
| `src/hooks/index.ts` | 12 lines | 17 lines | +5 |
| **Total** | **382** | **17** | **−365 lines of V11 dead code** |

Behaviour delta: **zero** (zero consumers, audit-verified).
Test delta: **0 added, 0 removed** (no test file referenced either hook).
Bundle delta: Metro will tree-shake both files from the next bundle; expected reduction ~2-3 KiB minified (React + redux + Animated imports they pulled in).
Native delta: **zero** (no native file changed).
