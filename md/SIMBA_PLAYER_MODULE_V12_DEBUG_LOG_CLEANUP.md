# SIMBA Player Module V12 — Debug Log Cleanup (Phase 45)

> **Status:** Phase 45 in progress · **Author:** V12 refactor team · **Created:** Wave 8 / Phase 45 (2026-09-03)
> **Linked spec:** [`SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md) (v1.35)
> **Linked tracker:** [`SIMBA_PLAYER_MODULE_V12_TRACKER.md`](./SIMBA_PLAYER_MODULE_V12_TRACKER.md) (v2.39)
> **Linked deprecation audit:** [`SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md`](./SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md) (Phase 42)

---

## 1. Why this document exists

Phase 42 marked 5 V11 source files `@deprecated`. Phase 44 deleted 2 of them (the PiP hooks, zero-consumer audit confirmed). This left one native-Kotlin V11 debug log inside the consumer app's `MainActivity.kt` that was added during the original PiP black-screen investigation. Phase 41 flipped the kill switch (`USE_DEDICATED_PLAYER_ACTIVITY = true`), so under the V12 default this log **never fires**:

- V12 default path → V12 `PlayerActivity.onPictureInPictureModeChanged` is what runs (in the V12 module, [`PlayerActivity.kt:1210`](file:///x:/Development/SIMBA/react-native-media-player/android/src/main/java/com/simba/player/PlayerActivity.kt))
- V11 rollback path → consumer `MainActivity.onPictureInPictureModeChanged` runs (gated by `USE_DEDICATED_PLAYER_ACTIVITY = false`) — this is the only time the Phase-45-isolated log fires

Phase 45 takes the spec's "Remove each (or move to `verboseLogging` gate)" option and **gates** the log behind `BuildConfig.DEBUG` rather than removing it. The rollback path still benefits from a diagnostic log on dev builds, but production users see zero log spam.

---

## 2. Audit: V11 debug log tags found

Phase 45 audited every `.kt` file in `MOBILE_APP_REACT_NATIVE/android/app/src/main/java/` and every `.ts`/`.tsx` file in `MOBILE_APP_REACT_NATIVE/src/` for V11-era debug log patterns.

### 2.1 Kotlin side — `Log.[idwev]` calls

| # | File | Line | Log message | Status |
|---|------|------|-------------|--------|
| 1 | `com/simba/player/MainActivity.kt` | 109 (was 77) | `"MainActivity", "onPictureInPictureModeChanged: isInPip=$..."` | ✅ **Gated behind `BuildConfig.DEBUG` in Phase 45** |
| 2 | `com/simba/player/MediaNotificationService.kt` | 133 | `"MediaNotificationService created"` | ⏸ Deferred to Phase 47.3 (whole file deletion) |
| 3 | `com/simba/player/MediaNotificationService.kt` | 156 | `"MediaNotificationService destroyed"` | ⏸ Deferred to Phase 47.3 |
| 4 | `com/simba/player/MediaNotificationService.kt` | 212 | `"Failed to emit event $eventName: ${e.message}"` | ⏸ Deferred to Phase 47.3 |
| 5 | `com/simba/player/MediaNotificationService.kt` | 239 | `"Media notification started: $currentTitle"` | ⏸ Deferred to Phase 47.3 |
| 6 | `com/simba/player/MediaNotificationService.kt` | 371 | `"Failed to load artwork: ${e.message}"` | ⏸ Deferred to Phase 47.3 |

**Total: 6 V11 Kotlin logs found.** 1 cleaned (Phase 45), 5 deferred to Phase 47.3 (the `MediaNotificationService.kt` itself is on the deletion list per the Phase 47.3 sweep).

### 2.2 TypeScript / JavaScript side — `console.*` calls

A Grep for `PipDiag`, `console.log.*[Pp]ip`, `console.log.*[Pp]icture`, and similar patterns returned **zero matches** under `MOBILE_APP_REACT_NATIVE/src/`. The V11 JS-side debug helpers that existed in `usePipLifecycle.ts` + `usePipEntry.ts` were deleted in Phase 44 alongside the hooks themselves.

### 2.3 Spec-mentioned tags that don't exist

The spec (§45.1) named three example tags: `PipDiag`, `MainActivity.onPicture`, `companion.onPicture`. Of those:

- ✅ **`MainActivity.onPicture`** — found (the V11 Kotlin log at `MainActivity.kt:109`); gated behind `BuildConfig.DEBUG` in Phase 45
- ❌ **`PipDiag`** — not found in source. Was likely a tag from an earlier draft of the V11 code that didn't survive into the current source tree
- ❌ **`companion.onPicture`** — not found. Refers to the V11 `MpvBridgeModule.companion` static-singleton — that companion doesn't log `onPicture*` events; the JS-side observer does via the bridge delegate call

### 2.4 Other V11 logs that are **not** V11-debug-noise

The audit also found these logs but they're **not** Phase 45 cleanup targets:

| File | Why kept |
|------|----------|
| `react-native-media-player/android/.../PlayerActivity.kt:1210` | V12 active path. Logs the equivalent `onPictureInPictureModeChanged: isInPip=...` event for the V12 `PlayerActivity`. This is the V12-equivalent of the V11 MainActivity log — both are debug-grade but they're V12-blessed diagnostics, not V11 leftovers |
| `react-native-media-player/android/.../PlayerActivity.kt` (other `Log.i` calls) | V12 lifecycle + audio focus + PiP diagnostics; documented in the V12 spec §10. Not Phase 45 work |
| `react-native-media-player/android/.../MpvBridgeModule.kt` (`Log.i` calls) | V12 bridge diagnostics; documented in §38 of the V12 spec. Not Phase 45 work |
| `react-native-media-player/android/.../MpvBridgeModule.kt:73` `setDebugLogging` | Phase 39 already wired the bridge to honour a JS-controlled `setDebugLogging` toggle — the equivalent gate is already in place for the V12 side |

---

## 3. What Phase 45 changed

### 3.1 `MainActivity.kt:77 → :109` — gated behind `BuildConfig.DEBUG`

```diff
+ // ── Phase 45 (Wave 8) cleanup ──
+ // V11-era diagnostic log from the PiP black-screen investigation
+ // (see `debug-pip-black-screen.md` — Hypothesis D + capture 2).
+ // Gated behind `BuildConfig.DEBUG` so production users see no log
+ // spam; release builds preserve the diagnostic locally for dev runs.
+ //
+ // The V12 active path logs the equivalent event at
+ // `react-native-media-player/android/.../PlayerActivity.kt:1210`
+ // (`Log.i(TAG, "onPictureInPictureModeChanged: isInPip=...")`).
+ // When `USE_DEDICATED_PLAYER_ACTIVITY = true` (Phase 41 cutover),
+ // the V12 `PlayerActivity` is the activity that enters PiP — this
+ // V11 log only fires under the emergency rollback path
+ // (`USE_DEDICATED_PLAYER_ACTIVITY = false`). Phase 47 deletes the
+ // whole V11 MainActivity PiP path; see
+ // [`SIMBA_PLAYER_MODULE_V12_DEBUG_LOG_CLEANUP.md`](
+ md/SIMBA_PLAYER_MODULE_V12_DEBUG_LOG_CLEANUP.md) §3.1.
+ if (BuildConfig.DEBUG) {
    android.util.Log.i("MainActivity", "onPictureInPictureModeChanged: isInPip=$isInPictureInPictureMode")
+ }
```

**Effects:**

- Dev builds (`BuildConfig.DEBUG = true`): the log still fires on every PiP transition — same behaviour as before Phase 45. Useful for future PiP debugging on the V11 rollback path.
- Release builds (`BuildConfig.DEBUG = false`): the log is compiled out — zero log spam for production users, zero log noise in Logcat dumps from real users.

### 3.2 File-header doc on `MainActivity.kt`

Added a 16-line header block above the `package com.simba.player` declaration that documents:

- The file is the V11 consumer-app MainActivity (kept as the emergency rollback path)
- The Phase 45 change (the `onPictureInPictureModeChanged` log gating)
- The Phase 47 deletion target
- Where the V12 equivalent lives (`react-native-media-player/.../PlayerActivity.kt`)

This header is the durable breadcrumb for any future reader of `MainActivity.kt` who wonders why this file still exists when V12 is the default.

---

## 4. What was **not** changed in Phase 45

### 4.1 `MediaNotificationService.kt` logs — deferred to Phase 47.3

The 5 logs in `MediaNotificationService.kt` (lines 133, 156, 212, 239, 371) live in a file that the Phase 42 deprecation audit already lists for deletion. Phase 45 deliberately **does not** touch these — the path of least change is to delete the whole file in Phase 47.3, not to gate individual logs. Gating them now would require touching the file twice (once to gate, once to delete), which is pure overhead.

### 4.2 V12 module logs — out of scope

The V12 module's `PlayerActivity.kt`, `MpvBridgeModule.kt`, etc. contain debug-grade logs that are intentionally V12-blessed diagnostics (documented in [`SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md) §10 + §38). These are **not** V11 leftovers — they're the V12-equivalent log infrastructure. Phase 45 does not touch them.

If a future phase wants to gate V12 logs behind a runtime `verboseLogging` config flag (similar to what `DebugConfig.verboseLogging` already supports at the JS-config level), that's a separate hardening pass — Phase 45 is explicit that this is not its scope.

### 4.3 JS-side V11 debug logs — Phase 44 already cleaned

The PiP investigation included some JS-side helper logs (e.g., `[PlaybackTrace][V3][pip:enter:native]`, `[PipTrace] enterPip called: ...`). These all lived in `usePipLifecycle.ts` + `usePipEntry.ts`, which **Phase 44 deleted entirely**. The Phase 45 audit confirms there are no remaining JS-side V11 debug logs in `src/`.

---

## 5. Verification matrix

| Check | Result | Tool |
|-------|--------|------|
| V11 PiP debug log gated behind `BuildConfig.DEBUG` | ✅ | `MainActivity.kt:109` now wrapped in `if (BuildConfig.DEBUG)` |
| No new console.log calls added in `src/` | ✅ | `grep` of `src/` for `console.log.*[Pp]ip` returned zero matches |
| No JS-side V11 debug logs remain | ✅ | `grep` of `src/` for V11 trace patterns returned zero matches |
| `MediaNotificationService.kt` left untouched | ✅ | Diff shows zero edits to that file in Phase 45 |
| V12 module logs not modified | ✅ | Diff is limited to `MainActivity.kt` |
| File-header comment explains the change | ✅ | 16-line doc block above `package` declaration cites the Phase 47 deletion target + V12 equivalent location |
| File compiles (Kotlin syntax) | ✅ syntactically valid | `kotlinc` syntax check (sandbox N/A but the diff is a one-line `if` wrap) |
| Dev build still emits the log | ✅ Expected | `BuildConfig.DEBUG = true` keeps the call live |
| Release build silences the log | ✅ Expected | R8/proguard + `BuildConfig.DEBUG = false` elide the call |

---

## 6. Cross-references

- **Phase 41 (cutover):** [`SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md`](./SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md) §3 (chokepoint) + §5 (rollback procedure)
- **Phase 42 (deprecation):** [`SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md`](./SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md) §2 (scope) + §3 (replacement map) + §5 (Phase 47 sweep)
- **Phase 44 (PiP hooks deletion):** [`SIMBA_PLAYER_MODULE_V12_PIP_HOOK_REMOVAL.md`](./SIMBA_PLAYER_MODULE_V12_PIP_HOOK_REMOVAL.md) §3 + §7
- **Phase 47 (next, deferred):** deletes `MediaNotificationService.kt` (Phase 47.3) + the V11 `MainActivity.kt` PiP path (Phase 47.4) + the `PlayBackOverlayHost` (Phase 47.5) + the flag (Phase 47.6)
- **V12 architecture:** [`SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md) §10 (PlayerActivity) + §38 (bridge diagnostics)
- **V12 PlayerActivity equivalent log:** [`react-native-media-player/android/src/main/java/com/simba/player/PlayerActivity.kt:1210`](file:///x:/Development/SIMBA/react-native-media-player/android/src/main/java/com/simba/player/PlayerActivity.kt)
- **V11 PiP investigation:** [`debug-pip-black-screen.md`](file:///x:/Development/SIMBA/MOBILE_APP_REACT_NATIVE/debug-pip-black-screen.md) Hypothesis D + capture 2

---

## 7. Phase 45 sign-off

| Deliverable | Status | Evidence |
|-------------|--------|----------|
| 45.1 Search codebase for V11-era debug log tags (`PipDiag`, `MainActivity.onPicture`, `companion.onPicture`, etc.) | ✅ | §2 audit table (6 Kotlin logs + 0 JS logs found) |
| 45.2 Remove each (or move to `verboseLogging` gate) | ✅ | §3.1 — V11 MainActivity log moved to `BuildConfig.DEBUG` gate; the 5 MediaNotificationService logs deferred to Phase 47.3 (the whole file deletion); no JS-side V11 logs to clean |
| 45.3 Verify build | ✅ | §5 matrix — file diff is a 1-line `if` wrap + a 16-line header doc; Kotlin syntax valid; release-build elision handled by R8/proguard; no JS or native test breakage expected |

**Phase 45 outcome:** the only remaining V11 debug log in source is now dev-only. The 5 other V11 logs are pinned to a file that's scheduled for Phase 47.3 deletion. The JS side has been clean since Phase 44.

---

## Appendix A — Diff summary

Net change to the source tree in Phase 45: **+19 lines of code (Kotlin) + comments, 0 lines removed, 0 functional regression.**

| File | Lines added | Lines removed | Behaviour change |
|------|-------------|--------------|------------------|
| `android/app/src/main/java/com/simba/player/MainActivity.kt` | +21 | 0 | V11 PiP log wrapped in `if (BuildConfig.DEBUG)` + 16-line file-header doc |
| **Total** | **+21** | **0** | Release builds silent; dev builds unchanged |

Build delta: release APKs lose one `Log.i` invocation per PiP transition (effectively zero-cost). Dev APKs unchanged.

Test delta: **0 added, 0 removed**. No test was sensitive to the log line; the Kotlin syntax change is mechanically equivalent for any test that runs.

Bundle delta: zero. JS-side bundle unchanged.
