# SIMBA Player Module — V13 Tracker

**Document Version:** 1.0
**Date Created:** 2026-09-03
**Last Updated:** 2026-09-03
**Linked spec:** [`SIMBA_PLAYER_MODULE_V13_SPECIFICATION.md`](./SIMBA_PLAYER_MODULE_V13_SPECIFICATION.md)

> This tracker is the working companion to the V13 spec. Each phase has a status, an owner, a target date, and a one-paragraph narrative describing actual work vs planned.

---

## Phase 49 — Audit consumer call sites + module gaps

**Status:** [x] Complete
**Owner:** Mobile team
**Target:** 2026-09-03
**Actual:**

Audited every consumer call site that imports from `./modules/playback` (33 files), `./native` (8 files), `./native/player.api` (4 files), and direct `NativeModules.MpvPlayerModule` (3 files). Confirmed the Kotlin native side has 78 `@ReactMethod` declarations covering every consumer need — no native additions required for V13. The gap is purely TypeScript: the module's `MpvPlayerModuleBridge` exposes 9 methods (the bare minimum needed by `DefaultControls`), the `usePlayer()` hook returns hardcoded `DEFAULT_STATE` instead of subscribing to events, and `PlayerState`/`PlayerCommands` interfaces are minimal. Output: gap analysis table in §3 of the spec — 78 methods to expose, 22 events to subscribe to, 3 hooks to expand.

**Outcome:** Phase 50-53 are well-scoped. No surprises expected during implementation.

---

## Phase 50 — Expand `MpvPlayerModuleBridge` typed surface

**Status:** [x] Complete
**Owner:** Mobile team
**Target:** 2026-09-03
**Actual:**

Committed as `3ee2f85` on 2026-09-03. The bridge surface went from 9 methods (Phase 24 entry point) to all 78 `@ReactMethod` declarations from `MpvBridgeModule.kt`, plus a new `subscribePlayerEvent` / `removeAllListeners` event subscription API covering all 22 mpv events with typed payloads. Tag `v1.1.0` pushed; CI publish to npm `staging` succeeded (verified via `npm view ... dist-tags` showing `{latest: 1.0.8, staging: 1.1.0}`). Promote step (staging → latest via `promote.yml` workflow) pending manual trigger from the GitHub UI. 87/87 jest tests passed at tag time; current branch is 100/100.

**Outcome:** The full native surface is now typed and reachable from TypeScript without `NativeModules.MpvPlayerModule` access. Phase 51+ can build on this.

### Sub-phase 50a — Add typed method signatures
**Status:** [x] Complete

### Sub-phase 50b — No-op fallback expansion
**Status:** [x] Complete

### Sub-phase 50c — Event subscription API
**Status:** [x] Complete

### Sub-phase 50d — Bump version + publish 1.1.0
**Status:** [~] In Progress
Pending: user runs `promote.yml` from the GitHub UI to flip `staging: 1.1.0` → `latest: 1.1.0`. Tag already pushed; staging already published.

---

## Phase 51 — Expand `PlayerState` / `PlayerCommands` / `PlayerProgress` + wire to events

**Status:** [x] Complete
**Owner:** Mobile team
**Target:** 2026-09-04
**Actual:**

Committed as `3d6c3da` on 2026-09-04. `PlayerState` expanded from 4 → 20 fields; `PlayerCommands` from 5 → 38 methods; `PlayerProgress` from 2 → 7 fields. `PlayerProvider` now owns the live state: on mount it (1) hydrates from sync bridge getters, (2) subscribes to all 22 mpv events via `subscribePlayerEvent`, (3) runs a 1Hz `setInterval` polling `getPosition`/`getDuration`. State held in a `useState` (rendered) + `useRef` (read-by-handlers) pair. The pure `applyPlayerEvent(state, progress, event, payload) → { state, progress }` dispatch is exported for testability. `hydratePlayerState(bridge)` and `parseMetadata(json)` are new pure helpers, also exported. `usePlayer()` is now a thin context consumer (returns `DEFAULT_STATE` outside a provider, no throw). Commands are a module-scope singleton for stable useMemo references. 100/100 jest tests pass; `tsc --noEmit` is clean.

**Outcome:** `DefaultControls` and any consumer that calls `usePlayer()` inside a `<PlayerProvider>` now sees live state from mpv events. The split state/progress contexts prevent the 1Hz position tick from re-rendering volume-mirror consumers (and vice versa). Phase 53 (consumer migration) can begin.

### Sub-phase 51a — Expand interfaces
**Status:** [x] Complete

### Sub-phase 51b — Internal provider state
**Status:** [x] Complete

### Sub-phase 51c — Re-export from `src/index.ts`
**Status:** [x] Complete

---

## Phase 52 — Add `usePlayerActivity()` hook for `openPlayer` + `getLaunchParams`

**Status:** [x] Complete
**Owner:** Mobile team
**Target:** 2026-09-04
**Actual:**

Committed as `3d6c3da` (same commit as Phase 51) on 2026-09-04. `usePlayerActivity()` lives at `src/hooks/usePlayerActivity.ts`. Returns `{ openPlayer(opts), getLaunchParams() }`. `OpenPlayerOptions` is the V13 module signature — no `duration` / `source` / `mediaType` (those were V11 Redux-dispatch concerns dropped in V13). Re-exported from `src/index.ts`. The hook is non-throwing: outside a provider / in jest / on web preview, the bridge resolves to the no-op fallback and `openPlayer` resolves `false` / `getLaunchParams` returns `null`.

**Outcome:** Phase 53 can replace the consumer's `usePlaybackCommands().openPlayer` calls with `usePlayerActivity().openPlayer` (with the signature reshape documented in the spec).

---

## Phase 53 — Migrate consumer to module

**Status:** [x] Complete (all 5 batches done as of 2026-09-04)
**Owner:** Mobile team
**Target:** TBD
**Actual:** _Phase 53 split into 5 batches; all complete. The 32-screen-file sweep used two Node.js migration scripts (migrate-v13-step1.cjs, migrate-v13-step2.cjs) for the mechanical parts and manual edits for edge cases. The module also gained two V14-ready DX APIs (`useOpenWithResume`/`PlayerResumeProvider`, `resolveStreamType`) during the migration — see "DX additions" below._

### Migration batches

| Batch | Sub-phase | Scope | Status | Files |
|---|---|---|---|---|
| 1 | 53b (simple) | fileService, audioSettingsService, metadataService | [x] | 3 |
| 2 | 53b/53c (complex) | notificationService, TransportContext | [x] | 2 |
| 3 | 53a | 32 screen files (usePlaybackCommands → usePlayerActivity) | [x] | 32 |
| 4 | 53b (extra) | useQueueScreen.ts (MpvPlayer import not in spec) | [x] | 1 |
| 5 | 53d | Verify typecheck + jest for the full consumer | [x] | — |

### Sub-phase 53a — `usePlaybackCommands` → `usePlayerActivity`
**Status:** [x] Complete

### Sub-phase 53b — `MpvPlayer` (player.api.ts) → `getMpvPlayerModule()`
**Status:** [x] Complete

### Sub-phase 53c — Direct `NativeModules.MpvPlayerModule` → module bridge
**Status:** [x] Complete (notificationService + TransportContext; 4 V11-only methods kept on `NativeModules.MpvPlayerModule` for the V11 rollback path)

### Sub-phase 53d — Verify typecheck + jest
**Status:** [x] Complete — `npx tsc --noEmit` clean, 203/206 jest pass (2 pre-existing V11 video-test failures are out of V13 scope, deleted in Phase 57).

### DX additions (during migration)

The user's directive during Batch 3 — "as we progress, reduce mobile-app complexity by offsetting it to the module" — surfaced multiple module APIs that absorbed the repeated patterns across the 32 screen files. Per the user's "junior-dev level integration" principle, the **canonical integration point is now `<SimbaPlayer>`** — a single wrapper component that composes all the V13 provider layers.

- **`resolveStreamType(contentKind: ContentKind): 'video' | 'audio'`** — maps consumer content types ('music', 'movie', 'podcast', 'live-tv', 'radio', 'audiobook', 'archive-audio', 'episode', 'video-file') to V13 stream types. Without this, every one of the 32 files would have an inline `type: 'audio' | 'video'` ternary. Module commit `696fef9`.
- **`useOpenWithResume` + `PlayerResumeProvider` + `usePlayItem`** — wired in App.tsx (commits `696fef9` and `de9e373`). The 32 screen files continue to use `usePlayerActivity` per the V13 spec; they can opt into auto-resume in a V14 follow-up by passing `resumeId: item.uri` to `useOpenWithResume`.
- **`<SimbaPlayer>`** — the one-import, one-wrapper integration point. Composes `PlayerProvider` + `PlayerResumeProvider` so consumer-side App.tsx wiring is:
  ```tsx
  import { SimbaPlayer } from '@simba-dev/react-native-media-player';
  <SimbaPlayer lookup={bookmarkLookup}>
    <RootNavigator />
  </SimbaPlayer>
  ```
  Optional `config` + `lookup` props. Lookup is optional — omit it for non-bookmark apps and the inner provider becomes a no-op. Module commit `99d4456`.

All four are exported from `@simba-dev/react-native-media-player` index.ts and are available for any future consumer of the module.

---

## Phase 54 — Mount module UI in `PlayerActivity`

**Status:** [x] Complete (code-complete; device-verification pending)
**Owner:** Mobile team
**Target:** 2026-09-04
**Actual:** _Phase 54 done in App.tsx: branch on activity launch params via the module's `useLaunchParams()` hook. When the activity is launched with a queued playback payload (i.e. some screen called `openPlayer(...)` which triggered the PlayerActivity handoff), App.tsx renders `<PlayerRoot />` (the module's surface + default controls). When MainActivity launches cold, App.tsx renders the regular navigator tree. The V11 `<PlaybackOverlayHost />` is removed from the navigator branch (Phase 54b). The V11 `usePlaybackCommands`/`usePlayback` imports are replaced with `useOpenWithResume` + `useLaunchParams` from the module. Commit `7c35606` (consumer) + `f1254a4` (module)._

### Sub-phase 54a — Wire `PlayerActivity`
**Status:** [x] Complete (App.tsx wires `<SimbaPlayer>` + branches on `useLaunchParams()` to render `<PlayerRoot />`)

### Sub-phase 54b — Replace custom UI
**Status:** [x] Complete (V11 `<PlaybackOverlayHost />` removed from App.tsx; PlayerRoot replaces it)

### Sub-phase 54c — Verify the activity launches with module UI
**Status:** [~] Pending device verification (cannot run Android emulator in this environment; user should test on a device before tagging 1.2.0)

---

## Phase 55 — Delete legacy V11 audio components

**Status:** [x] Complete (commit `bae551a`)
**Owner:** Mobile team
**Target:** 2026-09-04
**Actual:** _All 17 V11 audio files in `src/modules/playback/audio/` deleted. The `rangeNormalization` helper promoted to `src/utils/bufferedRanges.ts` (audio-agnostic). The trashed files are kept at `v13-trash-2026-09-04/` (gitignored) for safety. PlaybackOverlayHost now returns null (its audio imports are gone; full delete is Phase 57)._

### Sub-phase 55.1-55.16 — Delete 17 audio files
**Status:** [x] Complete

### Sub-phase 55.17 — Replace MiniAudio references
**Status:** [x] Complete (MiniAudio file deleted; no remaining references in the live source)

---

## Phase 56 — Delete the inline bridge code

**Status:** [x] Complete (consolidated with Phase 57 in commit `9c6c81c`)
**Owner:** Mobile team
**Target:** 2026-09-04
**Actual:** _`src/native/` deleted (3 files). `codegenConfig` block removed from `package.json`. The V13 module is the bridge's sole owner._

### Sub-phase 56.1-56.3 — Delete `src/native/*`
**Status:** [x] Complete

### Sub-phase 56.4 — Remove `codegenConfig` from `package.json`
**Status:** [x] Complete

### Sub-phase 56.5 — Verify typecheck
**Status:** [x] Complete (`tsc --noEmit` clean)

---

## Phase 57 — Delete `PlaybackContext.tsx` + `PlaybackOverlayHost.tsx` + `TransportContext.tsx`

**Status:** [x] Complete (consolidated with Phase 56 in commit `9c6c81c`)
**Owner:** Mobile team
**Target:** 2026-09-04
**Actual:** _All 9 doomed V11 files deleted (PlaybackContext, PlaybackOverlayHost, types, index, the 36 video module files, TransportContext). 18 V11 test files deleted (14 specified + 4 cross-referenced). The 2 pre-existing V11 test failures are now gone. Test suite is 5/5 pass, 19/19 tests pass + 1 todo._

### Sub-phase 57.1-57.6 — Delete `modules/playback/*`
**Status:** [x] Complete

### Sub-phase 57.7 — Delete `contexts/TransportContext.tsx`
**Status:** [x] Complete (was migrated to the module's PlayerProvider in Phase 53 Batch 2)

### Sub-phase 57.8-57.9 — Delete 18 V11 test files
**Status:** [x] Complete (the 2 previously-failing tests are gone)

---

## Phase 58 — V13.0.0 release

**Status:** [ ] Pending
**Owner:** Mobile team
**Target:** TBD
**Actual:** _not yet started_

---

## Summary

| Phase | Description | Status | Effort | Deliverable |
|---|---|---|---|---|
| 49 | Audit consumer call sites + module gaps | [x] | 0.5 day | Gap analysis table (this spec §3) |
| 50 | Expand `MpvPlayerModuleBridge` typed surface | [~] | 1.5 days | Bridge covers all 78 native methods + 22 events; v1.1.0 on `staging` (promote pending) |
| 51 | Expand `PlayerState` / `PlayerCommands` / `PlayerProgress` + wire to events | [x] | 2 days | `usePlayer` returns live state from mpv events; 100/100 tests pass |
| 52 | Add `usePlayerActivity()` hook | [x] | 0.5 day | `openPlayer` + `getLaunchParams` exposed via module |
| 53 | Migrate consumer to module | [x] | 2 days | All 5 batches done; 38 source files migrated; module gained `resolveStreamType` + `useOpenWithResume` + `SimbaPlayer` wrapper |
| 54 | Mount module UI in `PlayerActivity` | [x] | 1 day | `<PlayerRoot>` mounted via `useLaunchParams` branch in App.tsx; V11 `<PlaybackOverlayHost>` removed (commits `7c35606` + `f1254a4`); device verification pending |
| 55 | Delete legacy V11 audio components | [x] | 1 day | All 17 audio files deleted (commit `bae551a`); `rangeNormalization` promoted to `src/utils/bufferedRanges.ts` |
| 56 | Delete the inline bridge code | [x] | 0.5 day | `src/native/` deleted; `codegenConfig` removed; `tsc` clean (commit `9c6c81c`) |
| 57 | Delete `PlaybackContext.tsx` + `PlaybackOverlayHost.tsx` + `TransportContext.tsx` | [x] | 1 day | All V11 dead code + 18 V11 tests deleted; 0 jest failures; `tsc` clean (commit `9c6c81c`) |
| 58 | V13.0.0 release | [ ] | 1 day | Module published as v1.2.0 via CI/CD; final QA report |

**Total estimated V13 effort:** ~10 working days (~2 weeks).

---

## Risks + open questions

| Risk | Mitigation |
|---|---|
| `openPlayer` signature reshape breaks 33 call sites | Do 53a as a sweep with typecheck gating each file |
| `<DefaultControls>` doesn't have feature parity with consumer's custom UI (no mini-card, locked overlay, etc.) | V13 ships with reduced UI scope; deferred features documented as V14 |
| `TransportContext.tsx` may have consumer-only concerns (e.g. ducking) that don't belong in module | Audit before deletion; if consumer-only, port to a `usePlayerDucking()` hook in consumer code |
| Event subscription API may cause re-render storms if not batched | Phase 51b uses `useReducer` + throttled position polling at 1Hz |
| Phase 47.4 (collapse `usePlaybackState.active`) flagged in V13_PLANNING.md is now subsumed by Phase 57 | Update V13_PLANNING.md cross-references during Phase 58 |
| iOS / DRM / Cast (V13_PLANNING.md themes 1, 2, 4) are deferred to V14 | Update V13_PLANNING.md during Phase 58 |

---

## Dependencies

- **Module repo:** `X:\Development\SIMBA\react-native-media-player\`
- **Consumer repo:** `X:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\`
- **CI/CD pipeline:** GitHub Actions `release.yml` (OIDC publish) + `promote.yml` (NPM_TOKEN dist-tag)
- **Local release runbook:** `X:\Development\SIMBA\secrets\RELEASE_FLOW.md`

---

# End of V13 tracker doc.
