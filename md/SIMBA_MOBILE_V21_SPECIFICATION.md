# SIMBA Mobile v21 — Beta Stabilization Specification

> Rewritten 2026-09-09 to V20 standard: every claim verified
> against `md/SIMBA_V21_DEFECTS.md`, every phase references
> specific defect IDs, the 48 × 20 template ceremony is gone.
> Replaces the original 250-line v21 spec.

## Outcome

Move the Android React Native app from "feature-rich but uneven" to an evidence-backed stable beta. The target is a **binary beta-readiness** — all 6 release gates closed — not a percentage and not a feature count.

## What changed in v21 vs v20

- **v20** was a horizontal hook-layer simplification (V20.1–V20.11b, 12 commits, 60+ files, ~1,500 lines of simplification). The hook layer is now at ~95% of the V18 ideal.
- **v21** is a vertical + lifecycle program: architecture, player integration, native, persistence, workflows, verification, release. The hook layer stays as it is — v21 moves it into the new `features/<x>/presentation/hooks/` slice without further rewriting.

## Audit facts that drive v21 (verified 2026-09-09)

All claims trace to `md/SIMBA_V21_DEFECTS.md` with file:line evidence. The 27 defects break down as 14 P0 (beta blockers), 9 P1 (should-fix), 4 P2 (nice-to-have).

- **D-001/D-002** Android release uses `signingConfigs.debug` + `minifyEnabled = false` (verified at `android/app/build.gradle:6-26`).
- **D-003/D-004** Jest config has the invalid `setupFilesAfterEach` key (verified at `jest.config.js:12` vs `node_modules/jest-config/build/ValidConfig.js:170-171` which shows the actual valid keys are `setupFiles` and `setupFilesAfterEnv`). The V18.10 notifyManager shim is silently not loaded — explaining the open-async-handle warning that `--forceExit` masks.
- **D-005/D-006/D-007/D-008** Four placeholder services: `storageService.ts` (8 TODOs), `playlistService.ts` (1 TODO), `mediaService.ts` (2 TODOs), `libraryScanService.ts` (`return []` stub). All verified at the file:line.
- **D-009** Duplicate `Linking.getInitialURL()` calls at `App.tsx:124` (React Navigation linking config) and `App.tsx:149` (cold-start hook). Both fire on every launch.
- **D-010** Exactly **38** import sites for `@simba-dev/react-native-media-player` across 37 files. Concentration risk: any module API change is 38 breakage.
- **D-011** Legacy `MediaNotificationService.kt` at `android/app/src/main/java/com/simba/player/MediaNotificationService.kt` coexists with the module's `MediaPlaybackService`. Notification ownership unclear.
- **D-012** Legacy roots: `src/contexts/` (empty), `src/modules/playback/{audio,components}/` (empty subdirs), `src/native/` (empty), and `src/context/index.ts` (1-file re-export of `src/theme`).
- **D-013** No `.env.example` checked in; `android/app/build.gradle:7` requires it.
- **D-020/D-021** 11 `as any` + 3 `as unknown as` + 0 `@ts-ignore` casts across 10 files. The original spec called out 5; the audit found 5 more (in `useQueueScreen.ts`, `MovieCard.tsx`, `AboutScreen.tsx`, `useArtistScreen.ts`, `authService.ts`).

## Scope guardrails

- **No big-bang rewrite.** Each migration has tests, an import boundary, and a reversible commit. The folder migration (D-022) is split into per-feature pilot (Phase 08) before any wholesale move.
- **No deletion until reference search proves a file is unused or a replacement is live.** D-008 (libraryScanService), D-011 (MediaNotificationService), D-012 (legacy roots) all require "no remaining call sites" before removal.
- **No proof by tsc.** Green typecheck ≠ playback proof ≠ native compilation proof ≠ device behavior proof. Every device claim in the tracker has an `Evidence:` line of the form `device: <model> + <commit>`.
- **Android-first.** The module is Android-only in this repo. iOS is not a v21 claim — release notes must say so (D-014).
- **No client-side paid-API credentials.** Any provider with paid/restricted access must be backend-proxied or release-disabled (Phase 22).

## Target structure

```
src/
  app/                 # composition root, providers, bootstrap, error boundary
  features/            # vertical UI flows (library, playback, search, downloads, radio, ...)
    playback/
      application/     # use cases / player facade (the new boundary)
      presentation/    # screens, components, hooks (V20 hook layer lives here)
      domain/          # PlayableMedia, commands, policies
  domain/              # cross-feature entities and pure rules only
  infrastructure/
    player/            # ONLY package bridge / facade / event gateway
    api/               # provider clients, raw DTOs, adapters, schemas
    persistence/       # MMKV/AsyncStorage repositories and migrations
    device/            # folders, files, permissions, geolocation
  shared/              # reusable UI, theme, utilities, types
```

### Two hard rules

1. **Adapter rule** — files under `src/infrastructure/api/<provider>/` cannot import screens, navigation, Zustand UI stores, or player hooks. Application services call adapters through interfaces. No generic `adapters/` dumping folder.
2. **Player rule** — only `src/infrastructure/player/` may import `getMpvPlayerModule`, `subscribePlayerEvent`, or `removeAllListeners`. Feature code uses a typed `PlaybackFacade` hook/use case. `SimbaPlayer` and `SimbaPlayerRoot` stay in `App.tsx` composition until the player package owns a different root.

### What goes where (the v20 hook layer's destination)

| v20 file | v21 destination | Notes |
|---|---|---|
| `src/hooks/useApiQuery.ts` | `src/infrastructure/api/queryClient.ts` (and re-exported by `src/infrastructure/api/hooks.ts`) | V20 already exports the right primitives |
| `src/hooks/useSectionSearch.ts` | `src/shared/hooks/useSectionSearch.ts` | Two-screen primitive, not infrastructure |
| `src/hooks/useSectionOptions.ts` | `src/shared/hooks/useSectionOptions.ts` | Same |
| `src/hooks/useNetworkStatus.ts` | `src/infrastructure/device/networkStatus.ts` | Native module bridge |
| `src/hooks/useMediaScanner.ts` | `src/infrastructure/device/mediaScanner.ts` | Native module bridge |
| `src/screens/X/hooks/useXScreen.ts` | `src/features/x/presentation/hooks/useXScreen.ts` | The per-screen hooks migrate with their screens |
| `src/services/api/<provider>.ts` | `src/infrastructure/api/<provider>/` (split per-provider subfolder) | The 10 adapters move; no logic change |
| `src/services/{auth,download,file,metadata,...}Service.ts` | `src/features/<x>/application/` (per-feature use cases) | The 4 placeholder services (D-005–D-008) get replaced before the move |

## Release gates (6 binary checks, all must close)

| # | Gate | Evidence required |
|---|------|-------------------|
| 1 | Clean `tsc` / ESLint / Jest — no config validation, no React `act()` warnings, no open-async-handle warnings | `npx tsc --noEmit` exits 0; `npx eslint .` exits 0; `npx jest` exits 0 with no `forceExit` flag and no warnings on stderr |
| 2 | Debug AND signed-release Android artifacts build from a clean checkout with documented `.env.example` and no committed secrets | `./gradlew clean :app:assembleDebug` exits 0; `./gradlew :app:assembleRelease` exits 0; `git ls-files | grep -E '^\.env$|release\.keystore'` returns empty |
| 3 | Physical-device proof of: launch, play, pause, seek, close, return, PiP, background, resume, notification, content URI | `device: Pixel 7 / Android 14 / <commit>` + 1 screenshot per item in `md/V21_DEVICE_PROOF.md` |
| 4 | Local folders, playlists, downloads, queue/history/bookmarks, and remote search have tested persistence | For each: a Jest test + a "close app + relaunch + data is still there" device proof |
| 5 | Every beta-critical flow has automated + device test evidence | Coverage matrix in `md/V21_COVERAGE.md`; each row must have a Jest test path + a device-proof path |
| 6 | All P0 defects closed; remaining P1s approved, visible in release notes, with mitigations | All D-001–D-014 closed in `md/SIMBA_V21_DEFECTS.md`; remaining P1s listed in `md/V21_RELEASE_NOTES.md` |

## Waves and phases (8 waves, 22 phases — not 48)

| Wave | Phases | What it delivers |
|---|---|---|
| **W1** Baseline and proof | P01-P04 | Quality gates close, defect register exists, 4 legacy roots gone |
| **W2** Architecture foundations | P05-P08 | Folder contract lands (one pilot feature only), adapters move, placeholders replaced, legacy `MediaNotificationService` retired |
| **W3** Player integration | P09-P12 | One `PlaybackFacade` replaces 38 import sites; 1 `Linking` cold-start path; lifecycle / events / playable-media normalized |
| **W4** Android native | P13-P16 | Debug + signed-release builds reproducible; manifest / PiP / ABI / notification ownership proven on device |
| **W5** Local library | P17-P20 | Real storage repository; folder permission + scan flow production-safe; metadata pipeline; persistent playlists |
| **W6** Remote data | P21-P24 | Schema validation + cancellation + timeout + retry on every adapter; credential vault; deliberate cache policy; contract tests |
| **W7** Core workflows | P25-P28 | Now Playing, queue/history/bookmarks, downloads, stream-failure recovery |
| **W8** Beta release | P29-P31 | CI / governance; release notes; go/no-go exit review |

W11–W12 of the original spec (verification matrix, beta presentation package) are folded into the per-phase `Evidence:` requirements in W1–W8 — no separate "phase" needed.

Each phase has 5–10 specific tasks in `md/SIMBA_MOBILE_V21_TRACKER.md` (not a 20-item template). Every task references the defects it closes, the file:line it touches, and the evidence it leaves behind.

## What's explicitly out of beta scope

- W9–W10 of the original (state/data integrity, resilience/perf/sec) — these are post-beta polish. The release gates cover what blocks ship; the rest can ship behind feature flags.
- iOS support.
- New features (the spec is "stabilize what exists", not "add what doesn't").
- Test-infra rewrites beyond D-003 (e.g. moving from Jest to Vitest, or adding E2E with Detox — both are valid ideas but are post-beta).

## Ownership and decision log

- **Defect owner** = the engineer who closes it. The `Owner` column in `md/SIMBA_V21_DEFECTS.md` is filled at phase-exit, not at audit time.
- **Decision log** at `md/SIMBA_V21_DECISIONS.md` records every deliberate exception to a hard rule (e.g. "we allow `ScreenA` to import the player module directly because the `PlaybackFacade` can't model the 1% use case yet — exception #1, expires after W3").
- **Exit review** for each wave is recorded inline in the tracker with the date + reviewer initials.

## What success looks like

After v21:
- A new developer can clone, run `npm install`, copy `.env.example` to `.env`, run `npx jest` (no `--forceExit`), and the suite passes with 0 warnings.
- A new developer can run `./gradlew :app:assembleRelease` and produce a signed APK that installs on a Pixel 7 and plays a local file end-to-end without manual fixes.
- The 38 player call sites are 1 `usePlaybackFacade()` import per file.
- The 4 placeholder services are gone; the 3 P0 release-config defects (D-001, D-002, D-013) are closed; the 14 P0 defects total are all `CLOSED`.

## What "done" means for v21

The wave 8 "Go / no-go" exit review (P31) reads the 6 release gates as a 6-row table. If any row says "no", the v21 release is no-go. The review date and outcome go in `md/V21_RELEASE_NOTES.md`.
