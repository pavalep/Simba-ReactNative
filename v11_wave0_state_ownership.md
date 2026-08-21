# SIMBA v11 Wave 0 — State and Data Ownership Map

**Date:** 21 August 2026  
**Primary sources:** `src/store/rootReducer.ts`, `src/store/slices/playerSlice.ts`, `src/store/slices/sessionSlice.ts`, `src/store/slices/settingsSlice.ts`, `src/native/player.api.ts`, `src/modules/playback/PlaybackContext.tsx`, and isolated feature façades.

## Canonical ownership map

| Concern | Canonical owner | Persistence | Native relationship |
|---|---|---|---|
| Active playback entry, playlist, queue, lane, position, duration, volume, loop, shuffle | `player` Redux slice plus normalized `PlaybackEntry` | Redux persistence policy; resume/session records separately | Redux is the app model; native mpv is the playback authority for confirmed runtime state |
| Playback presentation: hidden, mini, audio-full, video-full | `PlaybackProvider` context | No durable persistence required | Presentation commands call the overlay host; no player navigation routes |
| Native playback intent and events | `MpvPlayer` in `src/native/player.api.ts` | Not persisted directly | Native bridge owns actual play/pause/seek/load/track/volume/speed/loop state |
| Recent items and resume metadata | `features/recentHistory` façade/reducer | Persisted bounded list, max 20 | Player open/progress checkpoints feed the façade |
| Bookmarks | `features/bookmarks` façade/reducer | Persisted bounded list, max 20 | Native-confirmed position updates existing entries only |
| Followed podcasts | `features/followedPodcasts` façade/reducer | Persisted | API-backed membership with optimistic/rollback behavior |
| Playlists | `features/playlists` façade/reducer | Persisted | Separate `AUDIO_ONLY` and `VIDEO_ONLY` lanes; no mixed playlist creation |
| Local media records and linked folders | `media` Redux slice and scanner/file services | Persisted settings/media state | Native content URI permission and file availability remain platform concerns |
| Authentication/session | `auth` and `session` slices | Persisted session policy | Auth state remounts root navigation on sign-in/sign-out |
| Settings and linked-folder preferences | `settings` slice | Persisted | Drives local scanning, theme, and user preferences |
| Downloads/offline records | `downloads` slice and download service | Persisted | `player.api` remaps downloaded paths before native load |
| Live favorites | `liveFavorites` slice | Persisted | Content-specific favorites; not playlist entries |
| Weather/home auxiliary cache | `weather` slice | Persisted according to root persistence policy | No playback authority |

## Player source-of-truth rules

1. A playback request enters through the route-free `PlaybackRequest` contract and is normalized before reaching player state.
2. Redux owns the durable application model: current entry, queue, playlist, provenance, lane, resume position, and user preferences.
3. Native mpv owns confirmed runtime state: whether media is actually playing, current native position, duration, buffering, loaded source, tracks, volume, mute, speed, and native failures.
4. UI controls must issue intent through `MpvPlayer`, then reconcile visible state from native-confirmed events/properties rather than assuming the Redux dispatch succeeded.
5. Recent and Bookmark position updates are derived from native-confirmed player checkpoints; ordinary rendering must not create bookmarks.
6. Audio and video never share a queue lane. `playerSlice` filters or rejects cross-lane additions at state boundaries.
7. Presentation state must not be duplicated in navigation state. The overlay host is the only compact/full-screen presentation owner.

## Duplicate and risk inventory

| Risk | Current observation | Follow-up |
|---|---|---|
| Position/duration polling duplication | Player UI and native checkpoint loops exist across audio/video surfaces | W5/W6 native-confirmed acceptance pass |
| Current-item duplication | `player.currentFile`, playlist index, explicit queue, and PlaybackProvider request state coexist | Verify synchronization during open, transition, close, and restart |
| Route versus overlay state | Player routes have been removed; stale route assumptions need ongoing static scans | Keep `openPlayer()` as the only public opener |
| Session versus Recent persistence | Session stores resume position while Recent stores bounded history records | Verify hydration and deduplication after restart |
| Legacy storage records | Feature reducers normalize legacy records at hydration | Add reducer/controller tests at final quality gate |
| Native failure visibility | `player.api` protects some calls with fallbacks but not every intent has a visible recovery contract | W5-P29 recovery controller |

## Persistence and retention inventory

| State | Retention rule |
|---|---|
| Recent | Maximum 20; newest update moves existing identity to the front |
| Bookmarks | Maximum 20; explicit add only; capacity requires named confirmation before eviction |
| Playlists | Maximum 20 playlists and 100 items per playlist; no duplicates; separate lanes |
| Playback queue | Persisted/normalized according to player state policy; lane-safe |
| Settings/linked folders | Persisted; folder identity must survive rescans |
| Downloads | Persisted download metadata; local path availability is revalidated on playback |
| Auth/session | Persisted according to sign-in lifecycle and cleared/replaced on sign-out policy |

## Open approvals and tests

The static ownership map is recorded. Remaining evidence is not claimed until verified: duplicate polling audit completion, state synchronization tests for open/transition/close/restart, native failure-to-UI recovery, and reducer/controller tests for Recent, Bookmark, playlist, and queue boundaries.
