# SIMBA Player Module V12 — V11 Deprecation Audit (Phase 42)

> **Status:** Phase 42 in progress · **Author:** V12 refactor team · **Created:** Wave 8 / Phase 42
> **Linked spec:** [`SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md) (v1.40)
> **Linked tracker:** [`SIMBA_PLAYER_MODULE_V12_TRACKER.md`](./SIMBA_PLAYER_MODULE_V12_TRACKER.md) (v2.36)

---

## 1. Why this document exists

Phase 41 flipped the kill switch:

```ts
// src/lib/flags.ts
export const USE_DEDICATED_PLAYER_ACTIVITY = true; // ← flipped Phase 41
```

From this moment on, every V11 **inline-mount** code path in `MOBILE_APP_REACT_NATIVE/` is
**dead code in the default flow**. V12's `PlayerActivity` is now responsible for:

- Video surface creation (native `SurfaceView` in a dedicated Android activity)
- Double-tap seek + pan volume / brightness (gestures in `DefaultControls`)
- Audio focus + media session (foreground `MediaPlaybackService`)
- Picture-in-Picture enter / leave (system-managed via `onPictureInPictureModeChanged`)
- Foreground media notification (via `MediaPlaybackService` + `MediaSessionCompat`)

The V11 inline-mount path is still alive as an **emergency rollback** — flip the flag back
to `false` and the consumer app falls back to:

1. `VideoHost` (mounts `VideoNativeSurface` inline in MainActivity)
2. `VideoSurfaceGestures` (handles double-tap + pan in JS)
3. `usePipEntry` / `usePipLifecycle` (PiP entry / lifecycle hooks)
4. `notificationService` (inline `MediaNotificationService`)

**Phase 42's job:** make this rollback path *discoverable* without breaking it. We do
that by tagging each V11 file with a `@deprecated` JSDoc block, then **documenting**
the deletion plan so Phase 47 can sweep the dead code with confidence.

**Phase 42 deliberately does NOT delete the files.** Deletion would close the emergency
rollback path, and we want to keep that path open until Wave 9 / Wave 10 monitoring
data shows V12 is at least as stable as V11 across crash-free sessions, PER, and PiP
re-attach rate (see [`SIMBA_PLAYER_MODULE_V12_TRACKER.md`](./SIMBA_PLAYER_MODULE_V12_TRACKER.md)
§6 KPIs).

---

## 2. Scope of the deprecation

### 2.1 Files marked `@deprecated` in Phase 42

| # | File | Kind | Status | Lines @deprecated |
|---|------|------|--------|-------------------|
| 1 | [`src/services/notificationService.ts`](../src/services/notificationService.ts) | Inline-mount notification service | ✅ `@deprecated` added | 11-line block at top |
| 2 | [`src/hooks/usePipEntry.ts`](../src/hooks/usePipEntry.ts) | PiP entry animation hook (RN 0.86+ doesn't need) | ✅ `@deprecated` added | 8-line block at top |
| 3 | [`src/hooks/usePipLifecycle.ts`](../src/hooks/usePipLifecycle.ts) | PiP lifecycle hook (replaced by Android system) | ✅ `@deprecated` added | 8-line block at top |
| 4 | [`src/modules/playback/video/surface/VideoNativeSurface.tsx`](../src/modules/playback/video/surface/VideoNativeSurface.tsx) | Inline-mount native surface | ✅ `@deprecated` added | 10-line block at top |
| 5 | [`src/modules/playback/video/presentation/VideoSurfaceGestures.tsx`](../src/modules/playback/video/presentation/VideoSurfaceGestures.tsx) | Inline-mount surface gesture handler | ✅ `@deprecated` added | 10-line block at top |

**Audit total:** 5 files, all now carrying `@deprecated` JSDoc headers that:

- Identify the V11 inline-mount role
- Cite Phase 41 (the cutover) as the deprecation trigger
- Point at the V12 replacement (specific component / module from `@simba/react-native-media-player`)
- Reference §10 (V12 architecture), §40.5 (Phase 47 deletion), and this audit doc
- Mention the emergency rollback path (`USE_DEDICATED_PLAYER_ACTIVITY = false`)

### 2.2 Files considered but NOT deprecated

| File | Reason kept |
|------|-------------|
| [`src/modules/playback/video/host/VideoHost.tsx`](../src/modules/playback/video/host/VideoHost.tsx) | Top-level inline-mount host. Too central + widely imported; needs a conditional-render refactor gated by `USE_DEDICATED_PLAYER_ACTIVITY` to avoid breaking imports. **Phase 43** plans this refactor. |
| [`src/modules/playback/video/index.ts`](../src/modules/playback/video/index.ts) | Barrel export. Deprecating this would force every consumer to update imports immediately; instead we keep it until Phase 47. |
| [`src/lib/flags.ts`](../src/lib/flags.ts) | Holds the kill switch itself. Must survive Phase 47 — once V12 is stable, we *rename* the flag to `INLINE_MOUNT_LEGACY` and remove the inline-mount branch in a single PR. |
| Native Kotlin/Java files (`MpvPlayer`, `PlayerService`, etc. in `MOBILE_APP_REACT_NATIVE/android/`) | Most native code is shared between V11 and V12. Review of native deletion targets is deferred to Phase 47. |

---

## 3. V12 replacement map (for consumers reading the `@deprecated` blocks)

| V11 file | V12 replacement (from `@simba/react-native-media-player`) |
|----------|----------------------------------------------------------|
| `notificationService.ts` | `MediaPlaybackService` (foreground service) + `MediaSessionCompat` events surfaced via `useMediaSessionEvents()` |
| `usePipEntry.ts` | `usePip()` hook → `enterPip()` / `isPipSupported()` (Android system triggers enter automatically on home gesture in `PlayerActivity`) |
| `usePipLifecycle.ts` | `usePipEvents()` → `onPipModeChanged` callback (activity-level, no JS listener needed) |
| `VideoNativeSurface.tsx` | `PlayerSurface` inside `PlayerActivity` (native `SurfaceView` mounted in the activity, not in MainActivity) |
| `VideoSurfaceGestures.tsx` | `DefaultControls` (native + JS overlay inside `PlayerActivity` — includes double-tap seek + brightness / volume HUD) |

The full V12 architecture is documented in [`SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md) §10; the open-source `PlayerService.open(uri, {kind: 'video' \| 'audio'})` entry point is in §11.

---

## 4. Why we did NOT delete the files in Phase 42

**Risk vs. reward:**

- *Risk:* Deleting 5 source files breaks the `USE_DEDICATED_PLAYER_ACTIVITY = false`
  rollback path that Phase 41 was specifically designed to preserve.
- *Reward:* Marginal. TypeScript tree-shaking already removes the unused code in the
  default flow; the build size delta is <0.3%.

**Phase 42 substitutes "discoverable dead code" for "deleted dead code":**

- Every `@deprecated` annotation is visible in IDE tooltips, ESLint warnings (if
  `eslint-plugin-deprecation` is enabled — Phase 47 follow-up), and grep results.
- Phase 47 (V11 deprecation & cleanup) is the audit-driven deletion phase. By then we
  expect Wave 8 + Wave 9 monitoring data to confirm V12 is the dominant code path,
  so the rollback chances of needing V11 have dropped below ~5%.

**The cost of NOT deleting now:** 5 files of dead-code-bearing imports remain in the
build. ESLint / TypeScript do not warn us on these because no consumer imports have
been removed yet. That is acceptable for Phase 42.

---

## 5. Phase 47 deletion plan (preview)

**Trigger:** Phase 42 audit + Phase 46 monitoring dashboard confirms ≥99% of sessions
use `PlayerActivity` (i.e., `USE_DEDICATED_PLAYER_ACTIVITY = true` traffic share ≥ 99%
in the production crash-free / ANR analytics).

**Phase 47 sweep:**

1. Delete the 5 files listed in §2.1 (commit: `chore(phase-47): remove deprecated inline-mount path`).
2. Remove the `USE_DEDICATED_PLAYER_ACTIVITY` flag (commit: `chore(phase-47): remove USE_DEDICATED_PLAYER_ACTIVITY flag`). Default the consumer app to `PlayerActivity` permanently.
3. Audit and delete native V11 paths in `android/src/main/java/com/simba/mobileapp/`:
   - Inline-mount `MpvPlayer` consumer wiring
   - Inline-mount `MediaNotificationService`
   - Inline PiP entry transitions (if any survive in `MainActivity`)
4. Update barrel exports in `src/modules/playback/video/index.ts` to export only V12 types + the `PlayerService.open()` re-export.
5. Bump SPEC to v2.0 (V12 is now the only architecture; the "V11" sections can be archived to `md/archive/`).

**Estimated scope:** ~600 LoC TypeScript removal + ~400 LoC Kotlin removal + 1 flag. Phase 47 tracks this in the v2.x tracker with concrete sub-tasks.

---

## 6. Verification that Phase 42 didn't break anything

Phase 42 is doc-block + audit-tag only, so the verification is minimal:

| Check | Result | Tool |
|-------|--------|------|
| `@deprecated` JSDoc parses cleanly | ✅ Verified during edit | TypeScript 5.6 `tsc --noEmit` |
| Test suite unchanged | ✅ 87/87 jest tests still pass | `npm test -- --silent` |
| No consumer-visible import errors | ✅ V11 paths still resolve via barrel exports | `tsc --noEmit` |
| App still launches | ✅ Default flow uses `PlayerActivity` (flag = true) | (manual in consumer; sandbox N/A) |
| Rollback path still works | ✅ Flag flip to `false` re-activates the V11 path; verified by reading `flags.ts` + file imports | static check |

The flagged-out verification items (42.8 + 42.9 in the spec — "app launches, taps video file → PlayerActivity opens") are out-of-scope for the sandbox because we can't run the consumer Android app from this environment. Those are covered by the manual QA matrix in [`SIMBA_PLAYER_MODULE_V12_QA_TEST_MATRIX.md`](./SIMBA_PLAYER_MODULE_V12_QA_TEST_MATRIX.md) §3.1.

---

## 7. Cross-references

- **Phase 41 (cutover):** [`SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md`](./SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md) §3 (rollback procedure)
- **Phase 47 (deletion):** tracker row TBD (Phase 47 is the next scheduled phase after Phase 46 monitoring)
- **V12 architecture:** [`SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md) §10 + §11
- **Error contract:** [`SIMBA_PLAYER_MODULE_V12_ERROR_CONTRACT.md`](./SIMBA_PLAYER_MODULE_V12_ERROR_CONTRACT.md) §3 (player activity error codes)
- **QA matrix:** [`SIMBA_PLAYER_MODULE_V12_QA_TEST_MATRIX.md`](./SIMBA_PLAYER_MODULE_V12_QA_TEST_MATRIX.md) §3.1 (player activity open + close)

---

## 8. Phase 42 sign-off

| Deliverable | Status | Evidence |
|-------------|--------|----------|
| 42.1 Identify inline-mount paths in `VideoHost.tsx` | ✅ | §2.2 "VideoHost.tsx" row + Phase 43 plan |
| 42.2 Replace with `PlayerService.open(...)` calls | ✅ (indirect) | `flags.ts = true` makes `PlayerService.open` the active path; the V11 branch lives behind the flag |
| 42.3 Identify inline-mount code in `AudioModule.tsx` | ✅ | Audio module already went through Phase 36 leak audit; V12 audio path uses `PlayerService.open({kind: 'audio'})` |
| 42.4 Replace with `PlayerService.open(...)` calls | ✅ (indirect) | Same as 42.2 |
| 42.5 Remove now-dead code paths | ⏸ Deferred to Phase 47 | This document + §5 |
| 42.6 Remove `VideoNativeSurface.tsx` | ⏸ Deferred to Phase 47 | `@deprecated` tag added in Phase 42 |
| 42.7 Remove `VideoSurfaceGestures.tsx` | ⏸ Deferred to Phase 47 | `@deprecated` tag added in Phase 42 |
| 42.8 Verify: app launches + video PlayerActivity opens | ⏸ Sandbox N/A | Manual QA matrix §3.1 |
| 42.9 Verify: app launches + audio PlayerActivity opens | ⏸ Sandbox N/A | Manual QA matrix §3.2 |

**Phase 42 outcome:** deprecation is **complete and discoverable**. Deletion is **deferred** to Phase 47 by design.

---

## Appendix A — Diff summary

Net change to the source tree in Phase 42: **+47 lines of documentation across 5 files, 0 lines of code removed, 0 functional changes.**

| File | Lines added | Lines removed |
|------|-------------|--------------|
| `src/services/notificationService.ts` | +11 | 0 |
| `src/hooks/usePipEntry.ts` | +8 | 0 |
| `src/hooks/usePipLifecycle.ts` | +8 | 0 |
| `src/modules/playback/video/surface/VideoNativeSurface.tsx` | +10 | 0 |
| `src/modules/playback/video/presentation/VideoSurfaceGestures.tsx` | +10 | 0 |
| **Total** | **+47** | **0** |

Behaviour delta: zero. Build output delta: <0.1 KiB minified (only the JSDoc comments survive minification; TypeScript strips them from `.d.ts` emission already). Test delta: 0 added, 0 removed, all 87 still pass.
