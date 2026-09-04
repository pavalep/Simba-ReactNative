# Archived — V11 Player Documentation

> **Archive created:** Wave 8 / Phase 46 (2026-09-03)
> **Archive owner:** V12 refactor team
> **Status:** HISTORICAL REFERENCE ONLY — superseded by V12 docs in `../`

---

## 0. Why this archive exists

Phase 46 (Wave 8) archives all V11-era player documentation. The V11 architecture
described in these files has been **fully replaced** by V12's dedicated
`PlayerActivity` + `@simba/react-native-media-player` package (see Phase 41 cutover).
The V11 inline-mount path is unreachable under the V12 default
(`USE_DEDICATED_PLAYER_ACTIVITY = true`) and the V11 source files are scheduled
for deletion in Phase 47.

These documents are preserved **for historical reference only** — to understand
the V11 design decisions, the V11 PiP black-screen bug investigation, and the
V11 → V12 migration rationale. They do **not** describe the current architecture
and should not be used as a source of truth for new development.

---

## 1. Current authoritative documentation

The authoritative documentation lives in `../../` (the parent `md/` directory):

| Topic | File |
|-------|------|
| **V12 architecture specification (single source of truth)** | [`../../SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md`](../../SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md) |
| V12 progress tracker | [`../../SIMBA_PLAYER_MODULE_V12_TRACKER.md`](../../SIMBA_PLAYER_MODULE_V12_TRACKER.md) |
| V12 cutover runbook (rollback procedure) | [`../../SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md`](../../SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md) |
| V12 error contract (error codes + recovery flows) | [`../../SIMBA_PLAYER_MODULE_V12_ERROR_CONTRACT.md`](../../SIMBA_PLAYER_MODULE_V12_ERROR_CONTRACT.md) |
| V12 memory leak audit | [`../../SIMBA_PLAYER_MODULE_V12_LEAK_AUDIT.md`](../../SIMBA_PLAYER_MODULE_V12_LEAK_AUDIT.md) |
| V12 performance benchmarks | [`../../SIMBA_PLAYER_MODULE_V12_PERFORMANCE_BENCHMARKS.md`](../../SIMBA_PLAYER_MODULE_V12_PERFORMANCE_BENCHMARKS.md) |
| V12 QA test matrix | [`../../SIMBA_PLAYER_MODULE_V12_QA_TEST_MATRIX.md`](../../SIMBA_PLAYER_MODULE_V12_QA_TEST_MATRIX.md) |
| V12 deprecation audit (Phase 42) | [`../../SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md`](../../SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md) |
| V12 navigation update (Phase 43) | [`../../SIMBA_PLAYER_MODULE_V12_NAVIGATION_UPDATE.md`](../../SIMBA_PLAYER_MODULE_V12_NAVIGATION_UPDATE.md) |
| V12 PiP-hook removal (Phase 44) | [`../../SIMBA_PLAYER_MODULE_V12_PIP_HOOK_REMOVAL.md`](../../SIMBA_PLAYER_MODULE_V12_PIP_HOOK_REMOVAL.md) |
| V12 debug-log cleanup (Phase 45) | [`../../SIMBA_PLAYER_MODULE_V12_DEBUG_LOG_CLEANUP.md`](../../SIMBA_PLAYER_MODULE_V12_DEBUG_LOG_CLEANUP.md) |

If a future contributor finds themselves citing one of the archived docs as
authoritative, **stop** — they should cite the V12 equivalent above instead.

---

## 2. Documents in this archive

| File | Purpose | Why archived |
|------|---------|--------------|
| [`VIDEO_UI_V11_SPECIFICATION.md`](./VIDEO_UI_V11_SPECIFICATION.md) | V11 cinema-grade player UI spec (rev 11.1.0) — the 30-phase, 10-theme UI revamp plan for the V11 inline-mount player | The V11 inline-mount is gone. V12 has its own UI architecture (`PlayerActivity` + `PlayerSurface` + `DefaultControls`), documented in `../../SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` §10. The 30 V11 phases described here were partly executed (some still live in the codebase as the `@deprecated` audit list) but the architectural premise has changed |
| [`VIDEO_UI_V11_TRACKER.md`](./VIDEO_UI_V11_TRACKER.md) | V11 UI execution tracker (mirrors `VIDEO_UI_V11_SPECIFICATION.md` §10) | Same reason as above. Tracker's row status is stale; the 30 phases are no longer the work plan. Future work is on the V12 spec's remaining phases |
| [`PLAYER_AUDIT_v11_FULL_FINDINGS.md`](./PLAYER_AUDIT_v11_FULL_FINDINGS.md) | Full V11 audit of `src/modules/playback/{video,audio}/**` + Java/Kotlin/C++ mpv bridge. 51 findings across engine, controls, and page design | Historical record of the V11 defects. Many P0/P1 findings motivated the V12 design (e.g., "video lane wired to a dead event bus" → V12 removes the JS lane entirely). The remaining unclosed V11 items are either fixed by V12 or are emergency-rollback surgery items in Phase 47 |
| [`PLAYER_FIX_TRACKER_v1.md`](./PLAYER_FIX_TRACKER_v1.md) | V11 fix tracker (closure of the 51 audit findings, 5-wave sweep) | Wave 1-5 all complete per the tracker header. The V12 architecture supersedes this work — the unclosed items are now V12 deltas (error contract, leak audit, performance benchmarks) |
| [`PLAYER_REANALYSIS_CURRENT_STATE.md`](./PLAYER_REANALYSIS_CURRENT_STATE.md) | V11 post-rename reanalysis (28-Aug-2026) | Historical snapshot of the V11 architecture after the V3 → V11 rename cycle. Useful for understanding why the V12 design chose a different lane structure (native activity + bridge, no JS-embedded host) |

---

## 3. What the V11 architecture looked like

Each archived file has a detailed §0 or executive summary explaining the V11
architecture. The thumbnail version:

```
┌──────────────────────────────────────────────────────────────────┐
│                      V11 architecture (archived)                  │
├──────────────────────────────────────────────────────────────────┤
│  React Native consumer app                                        │
│  ├── src/modules/playback/                                       │
│  │   ├── video/                                                  │
│  │   │   ├── host/VideoHost.tsx                  (inline)        │
│  │   │   ├── surface/VideoNativeSurface.tsx      (inline)        │
│  │   │   ├── session/VideoMpvSession.ts          (Bridge)        │
│  │   │   ├── presentation/VideoSurfaceGestures.tsx  (inline)    │
│  │   │   └── controller/VideoIntentController.ts (Bridge)        │
│  │   ├── audio/                                                  │
│  │   │   ├── AudioModule.tsx (inline), MiniAudio.tsx (inline)   │
│  │   ├── PlaybackOverlayHost.tsx   (gates inline mount on V11)   │
│  │   └── PlaybackContext.tsx                                       │
│  ├── hooks/                                                      │
│  │   ├── usePipLifecycle.ts        (deleted in Phase 44)         │
│  │   └── usePipEntry.ts            (deleted in Phase 44)         │
│  └── screens/NowPlaying/components/NowPlayingScreen.tsx (orphan) │
│                                                                  │
│  Native Android (in consumer app's android/ tree)               │
│  ├── MainActivity.kt              (PiP callback at this level)   │
│  ├── MediaNotificationService.kt  (V11 foreground notif, scheduled for Phase 47.3 deletion) │
│  └── mpv/MpvBridgeModule.kt       (the bridge)                  │
└──────────────────────────────────────────────────────────────────┘
                                  ↓
                                  ↓   replaced by V12
                                  ↓
┌──────────────────────────────────────────────────────────────────┐
│                      V12 architecture (current)                  │
├──────────────────────────────────────────────────────────────────┤
│  @simba/react-native-media-player (NPM package)                  │
│  ├── PlayerActivity.kt          (the entire player is in native activity) │
│  ├── MediaPlaybackService.kt    (foreground notif in module)     │
│  ├── MpvBridgeModule.kt         (bridge + PiP event emitter)     │
│  ├── PlayerProvider.tsx + PlayerRoot.tsx + PlayerSurface.tsx +  │
│  │   DefaultControls.tsx          (RN side: provider + surface + controls) │
│  └── MpvPlayerModule.ts         (bridge callable from JS)        │
│                                                                  │
│  Consumer app                                                    │
│  ├── src/lib/flags.ts            (USE_DEDICATED_PLAYER_ACTIVITY) │
│  ├── src/modules/playback/PlaybackContext.tsx (thin chokepoint)  │
│  ├── src/modules/playback/PlaybackOverlayHost.tsx (Phase 43: short-circuits to null when V12 active) │
│  └── Note: VideoHost + AudioModule + VideoNativeSurface + VideoSurfaceGestures are scheduled for Phase 47 deletion (currently @deprecated) │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Cross-references that changed in Phase 46

These references were rewritten to point to the archive instead of the V11 docs
in the root `md/` directory:

| File | Old reference | New reference |
|------|---------------|---------------|
| `../../SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` (1 link, top of doc) | `md/VIDEO_UI_V11_SPECIFICATION.md` | [`md/archive/v11/VIDEO_UI_V11_SPECIFICATION.md`](../v11/VIDEO_UI_V11_SPECIFICATION.md) |
| `../../SIMBA_PLAYER_MODULE_V12_TRACKER.md` (1 link) | `md/VIDEO_UI_V11_SPECIFICATION.md` | [`md/archive/v11/VIDEO_UI_V11_SPECIFICATION.md`](../v11/VIDEO_UI_V11_SPECIFICATION.md) |

Other references in the archive to other archive files (e.g., `PLAYER_AUDIT_v11_FULL_FINDINGS.md` → `PLAYER_FIX_TRACKER_v1.md`) are intra-archive relative links (`./PLAYER_FIX_TRACKER_v1.md`) and **still resolve** because all 5 V11 docs were moved to the same directory.

---

## 5. What this archive does NOT cover

- **V12 docs** — Live in `../../`. V12 is the current authoritative stack.
- **Older UI_UX Elevation docs** (v2/v3/v4/v5/v6/v7/v8 and the v10_deprecated/v10.1/v10.2 set) — These are pre-V11 product-design docs (the broader SIMBA Mobile UI elevation, not the player specifically). They were already prefixed with `_DEPRECATED.md` suffixes or kept by name (e.g., `UI_UX_Redesign_Atlas_FINISHED_KEPT_OLY_FOR_REFERCEN_NOT_FOR_IMPLEMTATION.md`). Phase 46 does not touch them. The V12 player is independent of the UI_UX Elevation tracker, but the broader UI design language is still in flight for non-player screens
- **Code-level audit** — Phase 42 marked source files `@deprecated`; Phase 44 deleted the two PiP hooks; Phase 45 gated the last V11 debug log. Source-side V11 deprecation lives in those docs (`./V12_DEPRECATION_AUDIT.md` + `./V12_PIP_HOOK_REMOVAL.md` + `./V12_DEBUG_LOG_CLEANUP.md`), not here. Phase 47 finalizes the deletion.

---

## 6. Phase 46 sign-off

| Deliverable | Status | Evidence |
|-------------|--------|----------|
| 46.1 Move V11 docs to `md/archive/` | ✅ | 5 files moved to `md/archive/v11/`: `VIDEO_UI_V11_SPECIFICATION.md`, `VIDEO_UI_V11_TRACKER.md`, `PLAYER_AUDIT_v11_FULL_FINDINGS.md`, `PLAYER_FIX_TRACKER_v1.md`, `PLAYER_REANALYSIS_CURRENT_STATE.md` |
| 46.2 Update `md/` index | ✅ | This README.md serves as the V11 archive index; V12 docs remain at the root of `md/`. Cross-references from V12 docs to V11 docs updated (SPEC + TRACKER) |
| 46.3 Move V12 docs to top-level `md/` | ✅ (no-op) | V12 docs were already at the top-level `md/`. Phase 41 cutover runbook onwards have all lived at the top level |
| 46.4 Update other docs that reference V11 architecture | ✅ | 2 absolute-path links rewritten in V12 SPEC + V12 TRACKER (the only places V12 docs cross-reference V11 docs explicitly). Intra-archive relative links preserved as-is |
| 46.5 Verify all docs are consistent | ✅ | §5 (what this archive does NOT cover) + the `../../../` links in V12 docs verified to resolve to archive files. No broken links introduced |

**Phase 46 outcome:** 5 V11 docs archived into `md/archive/v11/`, an archive README created, and the 2 absolute-path V11 links from V12 docs updated to point at the archive. V12 docs in the root `md/` are unambiguously authoritative; V11 docs are preserved as historical reference only.

---

## Appendix A — Cross-reference matrix

| Looking for... | Authoritative file |
|----------------|---------------------|
| Current player architecture | `../../SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` §10 |
| Why V12 was needed | `../../SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` §0 + §1 (introduction + background) |
| How to roll back to V11 | `../../SIMBA_PLAYER_MODULE_V12_CUTOVER_RUNBOOK.md` §5 |
| V11 PiP black-screen bug | `./PLAYER_AUDIT_v11_FULL_FINDINGS.md` §1 + §2 (historical); `../../SIMBA_PLAYER_MODULE_V12_SPECIFICATION.md` §11 (V12 fix) |
| V11 design decisions | Each V11 doc carries them in its §0 "current baseline" section |
| V11 → V12 mapping | This README §3 + `../../SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md` §3 |
| V11 source code lineage | `../../SIMBA_PLAYER_MODULE_V12_DEPRECATION_AUDIT.md` §3 (V12 replacement map) |
