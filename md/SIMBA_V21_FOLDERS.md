# SIMBA V21 — Folder Contract

The target folder layout adopted in V21 W2 P05. Every file in the project belongs to exactly one of these 5 root groups. The "two hard rules" in `md/SIMBA_MOBILE_V21_SPECIFICATION.md` are enforced by the import-boundary linter (`scripts/check-import-boundaries.js`); this document is the human-readable version.

## The 5 root groups

| Group | Path | What lives here | What must NOT live here |
|-------|------|-----------------|--------------------------|
| `app/` | `src/app/` | Composition root. Providers, bootstrap, error boundary, top-level navigation. **Imports from anything** | — |
| `features/` | `src/features/<name>/` | One subfolder per vertical UI flow. Each has `application/` (use cases), `presentation/` (screens, components, hooks), `domain/` (the feature's own entities and policies). | May not import from another feature's internals (use the shared `domain/` for cross-feature types). |
| `domain/` | `src/domain/` | Cross-feature entities and pure rules. No React, no Zustand, no fetch, no `Date.now()`. | No imports from `features/`, `infrastructure/`, `shared/` (one-way: features depend on domain, not vice versa). |
| `infrastructure/` | `src/infrastructure/{api,persistence,player,device}/` | Provider clients + raw DTOs + adapters (under `api/<provider>/`); MMKV/AsyncStorage repositories (under `persistence/`); the player facade (under `player/`); native bridge wrappers (under `device/`). | No imports from `features/`, `screens/`, navigation, Zustand UI stores, or React. The exception: `infrastructure/player/` exposes a `usePlaybackFacade()` hook (the only React surface in `infrastructure/`). |
| `shared/` | `src/shared/` | Reusable UI primitives, theme, utilities, cross-feature types. | No imports from `features/` (one-way: features import from `shared/`, not vice versa). |

## The two hard rules

### 1. Adapter rule

Files under `src/infrastructure/api/<provider>/` **cannot** import from:
- `src/features/` (any feature)
- `src/screens/` (any screen)
- `src/navigation/`
- `src/state/*Store.ts` (Zustand UI stores)
- `src/hooks/use*Player*` or `src/infrastructure/player/` (the player facade)

Adapters are pure: they take wire-shape → domain, with no side effects beyond the network call. Application services call adapters through interfaces.

### 2. Player rule

Only `src/infrastructure/player/` may import from `@simba-dev/react-native-media-player`. Feature code (screens, components, hooks) uses the typed `usePlaybackFacade()` hook from `src/infrastructure/player/`.

`SimbaPlayer` and `SimbaPlayerRoot` stay in `App.tsx` composition until the player package itself owns a different composition root.

## What goes where (the v20 → v21 migration map)

| v20 file | v21 destination | Phase |
|---|---|---|
| `src/hooks/useApiQuery.ts` | `src/infrastructure/api/queryClient.ts` (and re-exported as `src/infrastructure/api/hooks.ts`) | P07 |
| `src/hooks/useSectionSearch.ts` | `src/shared/hooks/useSectionSearch.ts` (the 3-screen primitive) | (no change — already shared) |
| `src/hooks/useSectionOptions.ts` | `src/shared/hooks/useSectionOptions.ts` (the 3-screen primitive) | (no change) |
| `src/hooks/useNetworkStatus.ts` | `src/infrastructure/device/networkStatus.ts` | P07 |
| `src/hooks/useMediaScanner.ts` | `src/infrastructure/device/mediaScanner.ts` | P07 |
| `src/hooks/useWeather.ts` | `src/shared/hooks/useWeather.ts` (cross-feature) or `src/features/home/application/` (feature-specific) | (judgment call) |
| `src/hooks/useAuthSession.ts` | `src/features/auth/application/useAuthSession.ts` (the auth feature) | P06 |
| `src/screens/<X>/hooks/use<X>Screen.ts` | `src/features/<x>/presentation/hooks/use<X>Screen.ts` (per feature) | P08 (library pilot only) |
| `src/services/api/<provider>.ts` | `src/infrastructure/api/<provider>/adapter.ts` | P07 |
| `src/services/{auth,download,media,playlist,storage,libraryScan,file,metadata}Service.ts` | `src/features/<x>/application/` | P06 |
| `src/state/*Store.ts` | `src/shared/state/<x>Store.ts` (cross-feature) or `src/features/<x>/application/` (feature-specific) | (judgment call) |
| `src/screens/_shared/sectionBrowseConfig.ts` | `src/shared/sectionBrowseConfig.ts` (top-level, not in features) | (no change — already at the right level) |
| `src/screens/_shared/sectionOptions.ts` | `src/shared/sectionOptions.ts` | (no change) |
| `src/screens/_shared/sectionRenderContext.ts` | `src/shared/sectionRenderContext.ts` | (no change) |
| `src/screens/_shared/sectionRoute.ts` | `src/shared/sectionRoute.ts` | (no change) |

The 4 shared types already live under `src/screens/_shared/` and are used by 3 per-screen `types/index.ts` re-export shims. They are the right shape for `src/shared/` once the per-screen shims are retired (post-beta; not in V21 scope).

## How the rules are enforced

`scripts/check-import-boundaries.js` is a Node script (no extra deps; uses `node:fs` + `node:path`) that walks every `.ts` / `.tsx` file under `src/` and checks every `import` / `require` statement against the rules above. The script is wired into `npm run lint:boundaries` and runs in < 2 seconds.

A planted violation (a file under `src/infrastructure/api/<provider>/` that imports from `src/features/`) fails the script with a file:line error.

## What this contract deliberately does NOT do

- **No naming convention enforcement** — files can be named whatever fits the feature (PascalCase components, camelCase hooks, kebab-case utilities).
- **No file-size limit** — a feature can be 1 file or 100. The "1-import-1-wrapper" rule is enforced per-consumer, not per-feature.
- **No `index.ts` barrel requirement** — every file can be imported directly. Barrel files are allowed when they meaningfully aggregate, not as a default pattern.
- **No ESLint rule for boundaries yet** — the linter script is the source of truth until V21 P05's npm script proves the model works. An ESLint plugin is a possible V22 follow-up.

## Folder migration order (per the V21 tracker)

| Phase | What moves | Notes |
|-------|------------|-------|
| **P05** | Empty new folders created; rules documented; linter wired | This phase |
| **P06** | 4 placeholder services (D-005–D-008) replaced with real implementations | The services move to `src/features/<x>/application/` as part of P06 |
| **P07** | 10 API adapters (D-022) moved to `src/infrastructure/api/<provider>/` | The biggest mechanical move; ~50+ import-site updates |
| **P08** | The library feature (the largest) moved to `src/features/library/` end-to-end | The first vertical slice; the rest of the features follow post-beta |
