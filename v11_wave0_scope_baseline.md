# SIMBA v11 Wave 0 — Scope and Product Truth Baseline

**Prepared by:** Manus AI  
**Date:** 21 August 2026  
**Target release:** 30 September 2026, recorded as the current end-of-next-month assumption; product confirmation remains open.  
**Mobile scope:** Android and iOS React Native application in `MOBILE_APP_REACT_NATIVE`.  
**Checkpoint branch:** `checkpoint/v11-wave0-baseline-2026-08-21`

## Release objective

SIMBA v11 will convert the current mobile application into a coherent, release-oriented media experience. The midpoint objective is not a code-volume percentage: a real user must be able to authenticate, reach Home and Library without persistent bottom tabs, discover API and local media, use Recent/Follow/Bookmark/Playlist actions, open reliable audio and video playback through the route-free playback module, resume content, and recover from loading, permission, offline, and source failures. Settings and Profile actions must either work, explain an unavailable capability, or be removed from the release path.

## Midpoint user journeys

| Journey | Required outcome | Priority |
|---|---|---:|
| Launch and authentication | Splash, login, authenticated Home, sign-out, and recoverable auth failure | P0 |
| Home and navigation | Home opens directly, no persistent bottom-tab presentation, Settings and Library are reachable | P0 |
| API content | Browse Movies, Podcasts, Music, Live TV, Live Radio, Audiobooks, Archives, and details with loading/error/empty states | P0 |
| Local media | Add or link folders through Settings, classify audio/video, filter and sort, preserve folder identity | P0 |
| Personal features | Recent persists up to 20 items with position; Follow, Bookmark, and separate audio/video Playlists work | P0 |
| Playback | Audio/video open through `openPlayer()`, controls reconcile with native state, queue lanes remain separate | P0 |
| Continuity | Mini-player, resume, lifecycle behavior, and supported PiP are deliberate and recoverable | P1 |
| Release quality | TypeScript, tests, lint, production source checks, and at least one release build are recorded before candidate freeze | P0 |

## Current route classification

The current root route inventory is defined by `src/navigation/types.ts` and `src/navigation/RootNavigator.tsx`. Player routes are intentionally absent; playback is an overlay module mounted at the app root.

| Classification | Current routes or areas | v11 treatment |
|---|---|---|
| Release-critical | `Splash`, `Login`, `Home`, `Library`, `Settings`, `Profile`, `MoviesScreen`, `PodcastsScreen`, `MusicScreen`, `MovieDetail`, `PodcastDetail`, `MusicDetail`, `FolderBrowser`, `PlaylistDetail`, `History`, `Bookmarks`, `Queue`, route-free audio/video playback overlays | Must be coherent for midpoint demonstration |
| Release-critical content extensions | `LiveTVScreen`, `LiveTVFavoritesScreen`, `RadioScreen`, `RadioFavoritesScreen`, `AudiobooksScreen`, `AudiobookDetail`, `ArchiveScreen`, `ArchiveItemDetail`, `ShowsScreen`, `ShowDetail` | Must retain reachable loading/error/action paths; runtime verification remains scheduled |
| Secondary but supported | `Search`, `Stats`, `ArtistScreen`, `AlbumScreen`, `SongScreen`, `ArtistDetail`, `AlbumDetail`, `AllVideosScreen`, `AllAudioScreen`, `AllPlaylistsScreen`, `Downloads` | Keep reachable and type-safe; polish after core journeys |
| Settings secondary | `About`, `AudioSettings`, `Equalizer`, `LinkedFolders`, `FolderLinkingWizard`, `Changelog`, `Licenses`, `Credits`, `Privacy`, `Terms`, `Help` | Must work, explain limitations, or be clearly deferred |
| Deferred or platform-dependent | Global/native PiP where unsupported, release signing/minification decisions before platform confirmation, advanced offline and store hardening | Do not advertise as complete before verification |
| Removed architecture | Persistent bottom tabs, `MainTabs`, `AudioPlayer` route, `VideoPlayer` route | Must not be reintroduced |

## Definition of “50% product-ready”

For this overhaul, “50% product-ready” means the midpoint user journeys above can be demonstrated end-to-end on the supported mobile test matrix without dead primary actions. Code may remain in later-wave areas, but the release-critical surfaces must have coherent entry paths, data contracts, loading/error/empty behavior, persistence, playback continuity, and documented verification evidence.

## Playback and PiP decisions

The app has one root `PlaybackProvider` and `PlaybackOverlayHost`. Callers use `openPlayer()` with canonical provenance and media-kind fields. Audio and video remain separate lanes and playlists. Compact playback is the in-app mini-player; platform/global PiP is exposed only when native capability and lifecycle behavior are confirmed. Full-screen audio/video presentation must not create navigation routes or duplicate mini-player ownership.

## Defect taxonomy

| Code | Class | Examples | Release handling |
|---|---|---|---|
| UI | Visual correctness | Clipping, raw colors, poor hierarchy, unstable touch targets | Fix before the affected surface is advertised |
| UX | Interaction quality | Dead controls, confusing copy, missing recovery, incorrect back behavior | P0 when it blocks a primary journey |
| DATA | Contract/state | Missing provenance, stale resume, duplicate entries, mixed queue lanes | Fix at the owning boundary and add static evidence |
| NATIVE | Platform/player | mpv mismatch, audio focus, PiP, permissions, lifecycle | Require native-confirmed behavior or explicit platform deferral |
| RELEASE | Packaging/quality | TypeScript, lint, tests, signing, build, store configuration | Candidate blocker until evidence is recorded |

## Release-critical screens that must not be advertised before verification

AudioPlayer, VideoPlayer, Recent, Local Files, Linked Folders, Bookmarks, Playlists, Settings/Profile actions, PiP, offline playback, and any native permission recovery surface must remain implementation or verification work until their end-to-end behavior is demonstrated on the target device matrix.

## Ownership and review

Manus AI owns implementation evidence and tracker maintenance for the current overhaul batch. The product owner/manager must confirm the exact release date, Android/iOS distribution scope, supported device matrix, and the final midpoint journey list before the Wave 0 gate is marked fully approved. Every subsequent batch must remain independently reversible from the checkpoint branch or an equivalent named commit.

## Open confirmations

1. Confirm whether 30 September 2026 is the exact release date or only the current planning assumption.
2. Confirm the supported iOS version/device matrix and whether iPad is in scope.
3. Confirm the supported Android API/device matrix and release signing owner.
4. Confirm which global PiP capabilities are required on Android and iOS.
