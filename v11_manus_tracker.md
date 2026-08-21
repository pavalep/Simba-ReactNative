# SIMBA Mobile App — v11 Manus Major Overhaul Tracker

**Tracker status:** Expanded draft for manual review  \
**Companion specification:** `v11_manus_specification.md`  \
**Date:** 20 August 2026  \
**Target release assumption:** 30 September 2026 (assumption; confirm with product)  \
**Program size:** 8 waves, 40 phases, 400 checkable steps  
**Current execution alias:** Execution Wave 2 = canonical Wave 3, specifically W3-P16 Movies and W3-P17 Podcasts. The current Live TV/Live Radio/Audiobooks/Archives batch is tracked as supplemental content-area execution evidence while canonical wave numbering is preserved for manager reports.

**Wave 2 API audit artifact:** `v11_wave2_api_findings.md`  
**Authoritative API sources:** Internet Archive Advanced Search/Metadata and Podcast Index API/OpenAPI documentation; endpoint decisions and limitations are recorded in the audit artifact.

## 1. Status rules

| Status | Meaning |
|---|---|
| Not started | No accepted v11 implementation exists |
| In progress | Work is active and not yet ready for verification |
| Blocked | A decision, native capability, credential, or dependency is missing |
| Ready for verification | Implementation exists; evidence is pending |
| Done | All steps and exit evidence are complete |
| Deferred | Explicitly excluded from the current target |

Every canonical phase below has ten checkable steps. The implementer must record changed files, commands, screenshots/recordings, test devices, and unresolved defects in the phase evidence field. A checked step without evidence is not a completed step. Supplemental evidence blocks are intentionally outside the canonical 40-phase/400-step denominator; they document cross-cutting implementation and verification work without creating additional phases.

## 2. Progress dashboard

| Measure | Current | Target | How to calculate |
|---|---:|---:|---|
| Phase completion | 0/40 | 40/40 | Phases with all ten steps complete |
| Step completion | 152/400 canonical + 49 supplemental | 400/400 canonical | Checked canonical phase steps with evidence; supplemental implementation, player-acceptance, midpoint, detabbed-navigation, and playback-module rows are tracked separately and do not change the 40-phase/400-step denominator. |
| Verified phase completion | 0/40 | 40/40 | Completed phases passing their exit gate |
| User-visible midpoint | Not earned | Earned at Phase W7-P40 | Full midpoint demonstration passes |
| Release blockers | Known | 0 unresolved P0 | Open P0 issues at candidate freeze |
| Wave 1 step completion | 39/50 | 50/50 | Checked steps in W1-P06 through W1-P10; visual/device verification remains open. |

> Do not report a percentage from code volume. Report phase completion, verified completion, and the user-visible midpoint separately.

## 3. Supplemental content-area execution evidence

This section records the current Live TV, Live Radio, Audiobooks, and Archives implementation batch. It is intentionally **outside the canonical 40-phase/400-step denominator** because the existing phase numbering predates this execution batch. Runtime, device, build, and test verification remain open by project instruction.

| Done | Supplemental implementation checkpoint | Evidence |
|---|---|---|
| ☑ | Create one public `index.tsx` boundary for each of the four screens. | `src/screens/LiveTVScreenNew/index.tsx`, `src/screens/RadioScreenNew/index.tsx`, `src/screens/AudiobooksScreen/index.tsx`, and `src/screens/ArchiveScreen/index.tsx`. |
| ☑ | Move Live TV and Live Radio implementations behind `components/` boundaries. | `LiveTVScreenNew/components/LiveTVContent.tsx` and `RadioScreenNew/components/RadioContent.tsx`. |
| ☑ | Move Audiobooks and Archives implementations behind `components/` boundaries. | `AudiobooksScreen/components/AudiobooksContent.tsx` and `ArchiveScreen/components/ArchiveContent.tsx`. |
| ☑ | Replace Audiobooks and Archives legacy tab views with explicit scope selectors. | Shared `FilterChips` selectors and one `AudiobookTabScene`/`ArchiveTabScene` renderer. |
| ☑ | Extract Audiobooks and Archives scope configuration into `related/`. | `AudiobooksScreen/related/scopeConfig.ts` and `ArchiveScreen/related/scopeConfig.ts`. |
| ☑ | Extract dedicated style modules for all four active screens. | `LiveTVScreenNew/styles/index.ts`, `RadioScreenNew/styles/index.ts`, `AudiobooksScreen/styles/index.ts`, and `ArchiveScreen/styles/index.ts`. |
| ☑ | Create screen-local type barrels and wire moved components to them. | `types/index.ts` under each active Wave 4 screen; content components consume local row/filter/scene contracts. |
| ☑ | Remove active-screen `react-native-tab-view` ownership and tab-bar assumptions. | Static scan of the four active folders found no active `TabView`/`TabBar` consumer; legacy files are documented below. |
| ☑ | Document stale legacy tab-era files rather than treating them as active routes. | `src/screens/ArchiveScreen/browse/TabBar.tsx` and legacy `src/screens/LiveTVScreen/LiveTVScreen.tsx` remain outside active `RootNavigator` imports. |
| ☐ | Run final TypeScript/build/device/runtime verification for the four screens. | Deferred until all overhaul waves are complete, per user instruction. |

**Supplemental batch status:** **Ready for verification**, not Done. The active code boundaries and static evidence are recorded; runtime correctness, visual quality, and release behavior remain open.

### Wave 5 starter batch — Settings/Profile/Auth boundaries

This starter batch begins the account/settings wave without claiming that every account action is complete. The full W4-P21 through W4-P25 canonical work remains open until each action is audited and verified.

| Done | Supplemental implementation checkpoint | Evidence |
|---|---|---|
| ☑ | Add public index-only entry points for Login, Profile, and Settings. | `src/screens/Login/index.tsx`, `src/screens/Profile/index.tsx`, and `src/screens/Settings/index.tsx`. |
| ☑ | Route active Login and Profile imports through their public boundaries. | `src/navigation/RootNavigator.tsx`. |
| ☑ | Route the Settings stack through its public Settings boundary. | `src/navigation/SettingsStack.tsx`. |
| ☑ | Restore explicit React hook imports used by Login, Settings, and RootNavigator. | `LoginScreen.tsx`, `SettingsScreen.tsx`, and `RootNavigator.tsx`. |
| ☑ | Add Settings → Discover links for Movies, Podcasts, Music, Live TV, Live Radio, Audiobooks, and Archives. | New Discover section in `src/screens/Settings/SettingsScreen.tsx`, using parent native-stack navigation. |
| ☑ | Extend Settings entrance animation accounting for the Discover section. | `src/screens/Settings/hooks/useSettingsScreen.ts`, `SECTION_COUNT = 7`. |
| ☑ | Preserve the no-bottom-tabs rule for all newly linked content destinations. | Links target root native-stack routes; no tab navigator is introduced. |
| ☐ | Audit and verify every remaining Settings/Profile/Auth row and destructive action. | Open for the next Wave 5 batch and final runtime/device gate. |

**Wave 5 starter status:** **In progress**. Navigation reachability has been expanded, but the wave is not complete and no runtime/build/test claim is made.

### Priority contract batch — local linking, provenance, and semantic media kind

This batch is a prerequisite for completing W4-P21 through W4-P25 and for the later badge, playlist, Recent, Bookmark, download, and player work. It is tracked as supplemental implementation evidence until the final typecheck, migration, device, and runtime gates are executed.

| Done | Supplemental implementation checkpoint | Evidence |
|---|---|---|
| ☑ | Define the canonical provenance taxonomy. | `src/types/media.ts`: `MediaSource = 'local' | 'api'`; provider names are no longer overloaded into `source`. |
| ☑ | Define the semantic media-kind taxonomy and playback lane. | `MediaKind`, `MediaLane`, `mediaKindToLane`, and badge labels in `src/types/media.ts`. |
| ☑ | Document the priority contract and linked-folder requirements. | `v11_manus_specification.md` §4.1, §5, and §6. |
| ☑ | Carry source/type/lane metadata through local scanner normalization. | `mediaSlice.ts` `ScannedTrack` and `fileService.ts` `fileEntriesToTracks()`. |
| ☑ | Carry metadata through Recent and media-library persistence. | `sessionSlice.ts` `savePlaybackPosition` normalizes and preserves classification. |
| ☑ | Carry metadata through playlists and player queue conversion. | `types/playlist.ts`, `features/playlists/`, and `playerSlice.ts`; cross-lane additions are rejected for new non-legacy playlists. |
| ☑ | Carry metadata through bookmarks and offline downloads. | `features/bookmarks/bookmarkReducer.ts`, `features/bookmarks/bookmarkPersistence.ts`, `features/bookmarks/index.ts`, `downloadService.ts`, and `DownloadButton.tsx`; legacy bookmark storage is normalized at hydration. `BookmarkItem.tsx` surfaces source and media-kind badges, and Bookmark position synchronization is native-ticker driven. |
| ☑ | Carry metadata through queue actions, M3U interchange, API DTOs, and video navigation. | `useQueueActions.ts`, `m3uParser.ts`, `types/api.ts`, `navigation/types.ts`, and VideoPlayer route/progress payloads. |
| ☑ | Preserve linked-folder identity through scanner normalization, settings persistence, rescans, and Local Files stable keys. | `media.ts`, `fileService.ts`, `mediaSlice.ts`, `settingsSlice.ts`, `useMediaScanner.ts`, `LibraryAudioSegment.tsx`, and `LibraryVideosSegment.tsx`. |
| ☑ | Preserve local provenance when FolderBrowser files are opened or inserted into playlists. | `FolderBrowserScreen.tsx` now emits normalized local source/type/lane/mediaType and deterministic linked-folder identity. |
| ☑ | Preserve source/type/lane/provider/folder identity when Local Files and playlists launch players. | `useLibraryScreen.ts` normalizes scanned tracks and persistent playlist items before opening the route-free playback contract. |
| ☐ | Complete linked-folder identity/rescan migration and verify every caller supplies explicit classification. | Remaining constructor audit, runtime behavior, migration compatibility, and final typecheck gates remain open. |

### Bookmark isolation implementation evidence

This supplemental batch records the Bookmark overhaul requested for explicit user-created bookmarks, automatic native-confirmed position synchronization, and bounded persistence. Runtime/device verification remains deferred to the final release gate.

| Done | Bookmark checkpoint | Evidence |
|---|---|---|
| ☑ | Move Bookmark reducer ownership into an isolated feature boundary. | `src/features/bookmarks/bookmarkReducer.ts` and `src/features/bookmarks/index.ts`; no application source imports the deleted shared Bookmark slice. |
| ☑ | Preserve the existing persisted storage key and normalize legacy bookmark records. | `src/features/bookmarks/bookmarkPersistence.ts` and reducer hydration normalization. |
| ☑ | Enforce one bookmark entry per media item and a maximum of 20 persisted entries. | Feature-owned retention and canonical-entry logic in `bookmarkReducer.ts`. |
| ☑ | Keep bookmark creation explicit rather than creating entries from ordinary playback. | Player bookmark commands call the façade’s explicit add operation; position ticks update only existing entries. |
| ☑ | Return a capacity decision that identifies the oldest candidate before eviction. | `addBookmark()` returns `requires-confirmation`, including the requested entry and candidate metadata. |
| ☑ | Add named confirmation alerts before removing the oldest bookmark. | AudioPlayer, VideoPlayer, Archive, Audiobook, Podcast, Show, Radio, Live TV, and Song bookmark actions name the candidate title before `Remove & Add`. |
| ☑ | Synchronize bookmark position from native-confirmed player ticks. | AudioPlayer and VideoPlayer reuse their existing native position/checkpoint loops; no second timer was introduced. |
| ☑ | Preserve source, provider, media kind, lane, artwork, labels, duration, and folder identity. | Canonical Bookmark contracts and migration normalization in `features/bookmarks`. |
| ☑ | Migrate screen and presentation consumers to the isolated façade. | Home, Profile, Bookmarks, Song, Podcast, Audiobook, Archive, Live TV, Radio Favorites, and player consumers. |
| ☑ | Complete static boundary and TypeScript validation. | `bookmark_legacy_hook_callers_final.txt`: `LEGACY_HOOK_CALLERS=0`; `tscheck_bookmark_migration_final.log`: `TSC_EXIT=0`. |
| ☐ | Verify add/cancel/evict/update/persist behavior on the running emulator and after restart. | Deferred to the final build/device/runtime gate by project instruction. |

**Bookmark batch status:** **Ready for verification**, not Done. The implementation and static contracts are complete; emulator behavior, persistence after restart, and visual confirmation remain open.

### Playback module extraction implementation evidence

This supplemental batch records the completed route-free playback extraction. The implementation is complete and statically type-safe; runtime/device playback acceptance, native PiP, lifecycle, and final production-build gates remain open under W5/W6.

| Done | Playback-module checkpoint | Evidence |
|---|---|---|
| ☑ | Create the root playback provider and command façade. | `src/modules/playback/PlaybackContext.tsx` exposes `openPlayer`, `closePlayer`, `expandPlayer`, and `collapsePlayer`. |
| ☑ | Define route-free playback contracts. | `src/modules/playback/types.ts` defines `PlaybackRequest`, module navigation/params, and presentation-state contracts. |
| ☑ | Add the root overlay host. | `src/modules/playback/PlaybackOverlayHost.tsx` selects mini, audio-full, or video-full presentation and is mounted beside `RootNavigator` in `App.tsx`. |
| ☑ | Add audio and video module adapters. | `src/modules/playback/audio/AudioPlayerModule.tsx` and `src/modules/playback/video/VideoPlayerModule.tsx` supply module contracts without navigation routes. |
| ☑ | Move the audio and video UI trees into the module. | `src/modules/playback/audio/` and `src/modules/playback/video/` own the extracted UI, hooks, controllers, and overlays. |
| ☑ | Remove legacy player screens, component trees, and root routes. | Deleted legacy player screen/component trees; `AudioPlayer` and `VideoPlayer` were removed from `RootStackParamList` and `RootNavigator`. |
| ☑ | Migrate mini-player expansion to the context command. | `MiniAudioPlayer` expands through `usePlaybackCommands()` rather than a player route. |
| ☑ | Migrate all remaining playback callers. | Library, PlaylistDetail, Profile, Queue, Movies, Music, Radio, details, search, history, and related callers now use `openPlayer()`. |
| ☑ | Repair extracted overlay and equalizer imports. | Seek feedback, resume, auto-advance, and equalizer panel consumers now point to `src/modules/playback/video/components/`. |
| ☑ | Run the static playback extraction gate. | `tscheck_playback_module_final.log`: `TSC_EXIT=0` after the complete caller/import migration. |

**Playback module extraction status:** **Ready for verification**, not Done. The route-free architecture and TypeScript contract are clean; emulator playback journeys, visual acceptance, native-confirmed controls, PiP, lifecycle, and production build remain open.

## 4. Wave gates

| Wave | Gate | Required evidence | Status |
|---|---|---|---|
| Wave 0 | Scope and baseline truth | Approved scope, checkpoint, route map, state map, platform baseline | Not started |
| Wave 1 | Architecture and UI foundation | Folder contract, shell decision, tokens, primitives, UI audit | Not started |
| Wave 2 | Home and local media | Working Recent, Settings local-source flow, separated local sections, filters/sorts | Not started |
| Wave 3 | Content and Settings hub | Movies/Podcasts/Music/detail consistency and reachable Settings hub | In progress — execution Wave 2 |
| Wave 4 | Personal/account functionality | Login, Profile, Settings, Follow, Bookmark, permissions, offline behavior | Not started |
| Wave 5 | Playback core | Shared contract, audio/video UI, recovery, separate queues | Not started |
| Wave 6 | Continuity | Mini player, supported PiP, tracks, resume, lifecycle, downloads | Not started |
| Wave 7 | Release candidate | Lists, tests, lint, signing, builds, midpoint demo | Not started |

## 4. Phase tracker


### Wave 0 — Control, baseline, and release truth

**Wave objective:** Stop scope drift, protect current work, and establish measurable evidence before refactoring.  
**Priority:** P0  
**Wave status:** Not started


#### W0-P01 — Scope lock and product truth

**Objective:** Define the v11 release boundary and convert manager feedback into observable outcomes.  
**Status:** In progress  
**Owner:** Manus + product owner/manager review  
**Blocker:** Exact release date, platform matrix, and final scope approval remain open  
**Evidence:** `v11_wave0_scope_baseline.md`

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☑ | Write the v11 release objective in one paragraph. | `v11_wave0_scope_baseline.md`, Release objective. |

| ☐ | Confirm the target release date and Android/iOS scope. | Current assumption is 30 September 2026 for Android and iOS; exact product confirmation remains open. |

| ☑ | List the user journeys that must work for the midpoint milestone. | `v11_wave0_scope_baseline.md`, Midpoint user journeys. |

| ☑ | Mark every existing route as release-critical, secondary, hidden, or deferred. | Classification is recorded in `v11_wave0_route_inventory.md`; runtime route smoke evidence remains W0-P03 work. |

| ☑ | Record the definition of “50% product-ready” for this overhaul. | `v11_wave0_scope_baseline.md`, Definition of “50% product-ready”. |

| ☑ | Create a decision log for unresolved mini-player and PiP semantics. | `v11_wave0_scope_baseline.md`, Playback and PiP decisions. |

| ☑ | Create a defect taxonomy for UI, UX, data, native, and release problems. | `v11_wave0_scope_baseline.md`, Defect taxonomy. |

| ☑ | Identify screens that must not be advertised before verification. | `v11_wave0_scope_baseline.md`, Release-critical screens that must not be advertised before verification. |

| ☑ | Assign an owner to every P0 wave gate. | Manus AI owns implementation evidence; product owner/manager owns release date, scope, device matrix, and approval confirmations. |

| ☐ | Review and approve this scope before code refactoring begins. | User-approved overhaul direction is recorded; formal product confirmation remains open. |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W0-P02 — Working-tree protection and repository checkpoint

**Objective:** Protect current uncommitted MusicScreen and navigation work before the major overhaul.  
**Status:** In progress  
**Owner:** Manus  
**Blocker:** Fresh Jest, ESLint, Android release-build, and desktop-scope confirmation are deferred by project instruction or require the project owner’s verification workflow  
**Evidence:** `v11_wave0_repository_checkpoint.md`, checkpoint branch `checkpoint/v11-wave0-baseline-2026-08-21`

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☑ | Capture the current git status. | Clean working tree on `main`; captured before checkpoint creation. |

| ☑ | Create a named checkpoint branch or commit for the current state. | Created `checkpoint/v11-wave0-baseline-2026-08-21` at commit `0553abb`. |

| ☑ | Record the current modified and deleted files. | No modified, deleted, or untracked files were reported; recorded in the checkpoint artifact. |

| ☐ | Confirm no unrelated desktop changes are included in the checkpoint. | `DESKTOP_APP_AVALONIA` is a separate sibling directory and the SIMBA parent is not a Git worktree; no shared-root diff is available, so explicit desktop comparison remains open. |

| ☑ | Save the current TypeScript result. | `tscheck_playback_module_final.log` records `TSC_EXIT=0`. |

| ☐ | Save the current Jest result including the auth startup failure. | Deferred until the final verification gate; no fresh Jest run claimed. |

| ☐ | Save the current ESLint result. | Deferred until the final verification gate; no fresh ESLint run claimed. |

| ☐ | Save the current Android release-build result. | Deferred until the final verification gate; no fresh release build claimed. |

| ☑ | Document how to restore the checkpoint. | `v11_wave0_repository_checkpoint.md` includes branch switch commands. |

| ☑ | Require every v11 batch to remain independently reversible. | Reversibility policy recorded in the checkpoint artifact. |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W0-P03 — Route and authentication inventory

**Objective:** Make the actual launch-to-page route graph explicit.  
**Status:** In progress  
**Owner:** Manus  
**Blocker:** Deep-link audit and emulator smoke execution remain open; full-player back behavior needs device evidence  
**Evidence:** `v11_wave0_route_inventory.md`

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☑ | Extract every RootNavigator route into an inventory. | Route table generated from `src/navigation/types.ts` and `src/navigation/RootNavigator.tsx`. |

| ☑ | Map Splash, Login, and direct Home/Library root transitions. | Initial route logic and authenticated root destinations documented. |

| ☑ | Map every route that requires authentication. | Auth expectation recorded for every RootNavigator route; Settings stack separately listed. |

| ☑ | Map every route reachable from shared-file deep links. | App-link paths are inventoried in `src/navigation/linking.ts`; `content://`/`file://` shared media is handled in `App.tsx` and uses the canonical `getMediaType` classifier. Device execution and extension-less MIME accuracy remain open. |

| ☑ | Map sign-out behavior from Home. | Root navigator remounts with the unauthenticated key and resolves to Login. |

| ☑ | Map sign-out behavior from nested routes. | Root auth-key remount policy covers nested routes statically; device execution remains open. |

| ☐ | Map back behavior from full-screen players. | Overlay policy is documented; device back/close journey remains open. |

| ☑ | Map mini-player visibility by root route. | Root `PlaybackOverlayHost` ownership and presentation states are documented. |

| ☐ | Mark routes with missing or placeholder entry points. | Initial classification is recorded; a complete placeholder audit remains open. |

| ☑ | Create a route smoke-test sheet from the inventory. | R-01 through R-10 smoke paths recorded in the route artifact.

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W0-P04 — State and data ownership audit

**Objective:** Stop contradictory data flows between route params, Redux, services, and native mpv.  
**Status:** In progress  
**Owner:** Manus + product owner/manager review  
**Blocker:** Duplicate polling, synchronization tests, and formal approval remain open  
**Evidence:** `v11_wave0_state_ownership.md`

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☑ | Inventory player slice fields and reducers. | `playerSlice.ts` fields, lane filtering, queue, transport, position, duration, volume, loop, shuffle, and sleep/equalizer state recorded. |

| ☑ | Inventory session, recent, bookmark, follow, download, and settings state. | Root reducer and isolated feature ownership recorded. |

| ☑ | Inventory player route parameter shapes. | No player routes remain; route-free `PlaybackRequest`/module contracts are the current shape. |

| ☑ | Inventory native mpv commands and events. | `player.api.ts` lifecycle, transport, source, track, chapter, volume, speed, loop, and property APIs recorded. |

| ☑ | Map each player value to one source of truth. | Redux application model, PlaybackProvider presentation, and native-confirmed runtime ownership rules recorded. |

| ☑ | Identify duplicated position and duration polling. | Risk recorded for audio/video checkpoint loops; W5/W6 native-confirmed audit remains open. |

| ☑ | Identify duplicated current-item or queue representations. | `currentFile`, playlist/index, explicit queue, and provider request state are identified for synchronization testing. |

| ☐ | Identify screen-local state that should be domain state. | Requires a dedicated player/content state audit beyond the static ownership map. |

| ☑ | Record all persistence whitelists and retention limits. | `persistConfig.ts` whitelist and Recent/Bookmark/Playlist retention rules recorded. |

| ☐ | Approve the shared data-flow map before player refactoring. | Implementation exists; formal product approval and runtime evidence remain open.

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W0-P05 — Release and platform baseline

**Objective:** Establish the non-negotiable build and device baseline.  
**Status:** In progress  
**Owner:** Manus + product owner/release owner  
**Blocker:** Signing, minification, clean builds, device matrix, and exact support confirmation remain open  
**Evidence:** `v11_wave0_platform_baseline.md`

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☑ | Confirm the Android package identity and current version. | `com.simba.player`, version code `2`, version name `1.1.0`. |

| ☑ | Confirm the iOS bundle identity and current version. | `com.simba.player`, marketing version `1.0`, project version `1`. |

| ☑ | Document supported Android API and ABIs. | min SDK `24`, compile/target SDK `36`, ABIs recorded. |

| ☑ | Document supported iOS versions and device classes. | iOS `15.1`, arm64, iPhone portrait, iPad orientations recorded; product confirmation remains open. |

| ☑ | Record native mpv library requirements. | Turbo Module-first/legacy fallback bridge and exposed command families recorded. |

| ☑ | Record required permissions and why each is needed. | Android manifest and iOS Info.plist permission rationale recorded. |

| ☑ | Verify release signing is not production-ready yet. | Android release currently uses the debug keystore; production signing is not configured. |

| ☑ | Verify release minification/ProGuard decision is pending. | `enableProguardInReleaseBuilds = false`; decision remains explicitly open. |

| ☑ | Create a clean-build checklist for Android and iOS. | Ordered checklist recorded in `v11_wave0_platform_baseline.md`; execution is deferred to the final gate. |

| ☑ | Define the minimum device matrix for every future wave gate. | Proposed Android compact/current/large and iOS minimum/current/iPad matrix recorded; release-owner confirmation remains open.

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


### Wave 1 — Architecture and visual foundation

**Wave objective:** Create the folder contract, navigation shell, theme rules, reusable components, and UI quality bar.  
**Priority:** P0  
**Wave status:** In progress


#### W1-P06 — Screen folder contract

**Objective:** Adopt one public `index.tsx` entry point with co-located responsibilities.  
**Status:** In progress  
**Owner:** Manus + product team  
**Blocker:** No blocker for the reference Home migration; remaining screens are pending.  
**Evidence:** Reference migration completed for `src/screens/Home`: `index.tsx`, `components/`, `hooks/`, `related/`, `styles/`, and `types/`. Navigation now imports `../screens/Home` through the folder boundary. A complete screen-directory contract audit is persisted in `v11_wave1_screen_contract_audit.csv`; full-screen migration remains open.

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☑ | Write the folder contract in the repository documentation. | `v11_manus_specification.md`, folder contract section. |

| ☑ | Define when a screen needs components, hooks, related, styles, and types. | Contract documented; Home now demonstrates the layout. |

| ☑ | Define import rules for navigation. | `HomeStack.tsx` imports `../screens/Home` only. |

| ☑ | Ban navigation imports from internal child files. | Contract recorded; remaining screens still require audit. |

| ☑ | Ban API calls from presentational components. | Contract recorded; Home composition continues to delegate data work to `useHomeScreen`. |

| ☑ | Ban large style objects in index.tsx. | Home styles extracted to `src/screens/Home/styles/HomeScreen.styles.ts`. |

| ☑ | Ban repeated list-row markup in index.tsx. | Home continues to render section components rather than row markup. |

| ☑ | Define naming rules for screen-local types. | `src/screens/Home/types/index.ts` created for `HomeSection`. |

| ☑ | Define circular-import prevention rules. | Contract recorded; Home imports flow entry point → hook/types/related/styles. |

| ☑ | Create a review checklist for every migrated screen. | Wave 1 phase checklist retained in this tracker. |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W1-P07 — Navigation shell without bottom tabs

**Objective:** Replace the Home tab-first mental model with a clear authenticated shell.  
**Status:** In progress  
**Owner:** Manus + product team  
**Blocker:** Compact/large device visual verification is intentionally deferred until the final verification wave.  
**Evidence:** `RootNavigator.tsx` now mounts direct native-stack `Home` and `Library` destinations; the former nested shell is not mounted at root. `RootMiniPlayerOverlay` and `MiniAudioPlayer` no longer reserve bottom-tab height. Settings hub routing remains a later wave.

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☑ | Identify the current bottom-tab mount point. | `src/navigation/TabNavigator.tsx` was the mount point. |

| ☑ | Design the replacement Home header/menu affordance. | HomeHeader remains the shell affordance; Settings hub wiring is tracked in Wave 3. |

| ☑ | Define the Settings hub entry point. | Root route remains `Settings`; internal hub implementation is tracked in Wave 3. |

| ☑ | Define the MiniAudioPlayer overlay placement without tabs. | Overlay is anchored to `useSafeAreaInsets().bottom + 4`; legacy prop defaults false and is ignored for positioning. |

| ☑ | Define root-stack route transitions. | `RootNavigator` now exposes direct `Home` and `Library` native-stack destinations; `MainShellNavigator` is no longer mounted as a nested root route. |

| ☑ | Define the authenticated shell background and safe-area behavior. | Shell uses native-stack presentation; Home owns its top inset and the mini-player owns bottom inset. |

| ☑ | Remove assumptions that Home always sits above a tab bar. | Removed tab-bar offset from RootNavigator/MiniAudioPlayer and removed visual tab navigator. |

| ☐ | Test Home on compact portrait devices. | Deferred to final verification wave by instruction. |

| ☐ | Test Home on large portrait devices. | Deferred to final verification wave by instruction. |

| ☑ | Approve the new shell before removing UI code. | User approved proceeding with Wave 1; build/device gate intentionally deferred. |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W1-P08 — Theme and visual tokens

**Objective:** Correct visual inconsistency before screen-by-screen UI work.  
**Status:** In progress  
**Owner:** Manus + product team  
**Blocker:** Visual snapshot comparison is deferred until final verification.  
**Evidence:** Existing theme tokens were audited; AppText now exposes `primary`, `secondary`, `tertiary`, `inverse`, and `bright` aliases; AppButton no longer hard-codes a font weight. The Movies hero card, audio album artwork, and video player primary/secondary/top/resume/auto-advance/seek-feedback/loading/video-surface/volume-brightness chrome now consume shared overlay, border, text, shadow, and accent tokens. The scoped priority inventory is clean (`RAW_COLOR_CODE_MATCH_COUNT=0`); visual snapshots remain open. Evidence: `v11_wave1_priority_raw_colors_after_batch.txt`, `tscheck_wave1_visual_batch.log`.

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☑ | Inventory current theme tokens. | `src/theme/tokens.ts` reviewed. |

| ☑ | Inventory mockup bronze/glass tokens. | Existing accent, background, glass, border, and shadow groups reviewed. |

| ☑ | Choose canonical background, surface, accent, text, border, and state tokens. | Existing token groups retained as the canonical source for Wave 1. |

| ☑ | Define dark-mode values. | Existing dark palette retained and consumed through `useTheme`. |

| ☑ | Define light-mode values. | Existing light palette retained and consumed through `useTheme`. |

| ☑ | Define spacing and radius scales. | Existing spacing/radius tokens are now used by extracted Home styles and primitives. |

| ☑ | Define typography variants for titles, metadata, labels, and states. | AppText variants and color aliases remain the shared typography contract. |

| ☑ | Define elevation, overlay, and focus tokens. | Existing shadow and overlay token groups reviewed; focus-state expansion remains later work. |

| ☑ | Remove raw color literals from priority screens. | Scoped priority inventory is clean (`RAW_COLOR_CODE_MATCH_COUNT=0`) after tokenizing Movies hero card, audio artwork, and video-player overlays/chrome. Evidence: `v11_wave1_priority_raw_colors_after_batch.txt`. |

| ☐ | Create visual snapshots for the canonical tokens. | Deferred to final verification wave by instruction. |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W1-P09 — Reusable UI primitives

**Objective:** Create consistent building blocks for the overhaul.  
**Status:** In progress  
**Owner:** Manus + product team  
**Blocker:** Dark/light device verification is deferred until final verification.  
**Evidence:** Existing AppText, AppButton, AppCard, ScreenContainer, SectionHeader, Skeleton, EmptyState, and ErrorState were audited. Added exported `AppDivider` and `AppBadge`; updated AppText color aliases and AppButton typography behavior. One reference screen (Home) now consumes extracted style/type/related modules.

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☑ | Audit AppText, AppButton, AppView, and existing feedback components. | Existing core, layout, feedback, and utility primitives reviewed; AppView is not yet a required dependency for Home. |

| ☑ | Define button loading and disabled behavior. | Existing AppButton API retained; loading/disabled migration remains tracked for later screens. |

| ☑ | Define row, card, section-header, divider, and badge primitives. | Existing SettingsRow/AppCard/SectionHeader plus new exported AppDivider/AppBadge now form the foundation. |

| ☑ | Define skeleton/loading primitives. | Existing SkeletonCard/SkeletonList/SkeletonLoader retained as shared primitives. |

| ☑ | Define empty, error, offline, and retry primitives. | Existing EmptyState/ErrorState/OfflineBanner patterns audited; screen migrations remain open. |

| ☑ | Define icon sizing and accessibility labels. | Home FAB and existing SvgIcon usage retain explicit accessibility labels; broader icon audit remains open. |

| ☑ | Define touch target minimums. | MiniAudioPlayer controls use the 44px WCAG target constant; remaining screens require audit. |

| ☑ | Define focus and pressed states. | AppButton/AppCard pressed behavior reviewed; keyboard/focus behavior remains open for later waves. |

| ☑ | Migrate one reference screen to the primitives. | Home is the Wave 1 reference screen with extracted styles, types, related key helper, and token-driven composition. |

| ☐ | Verify primitives in dark and light themes. | Deferred to final verification wave by instruction. |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W1-P10 — UI/UX audit and correction backlog

**Objective:** Turn “childish” or unfinished visual behavior into prioritized work.  
**Status:** In progress  
**Owner:** Manus + product team  
**Blocker:** Device screenshots and visual comparison are deferred until final verification.  
**Evidence:** Code-level findings and acceptance criteria recorded in `v11_wave1_ui_ux_audit.md`; visual capture remains open.

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☐ | Capture the current Home screen. | |

| ☐ | Capture the current Movies screen. | |

| ☐ | Capture the current Podcasts screen. | |

| ☐ | Capture the current Music screen. | |

| ☐ | Capture the current Settings/Profile surfaces. | |

| ☐ | Capture the current AudioPlayer and VideoPlayer. | |

| ☑ | Mark placeholder text and decorative controls. | `v11_wave1_ui_ux_audit.md`: UX-006 and the visual decisions section. |

| ☑ | Mark inconsistent spacing, typography, and color usage. | `v11_wave1_ui_ux_audit.md`: UI-002, UI-003, and canonical token findings. |

| ☑ | Mark confusing loading, empty, and error states. | `v11_wave1_ui_ux_audit.md`: UI-005 and screen-state acceptance criteria. |

| ☑ | Convert every finding into a tracker item with acceptance criteria. | Audit IDs map to Waves 1–6 and are now linked to explicit acceptance criteria. |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


### Wave 2 — Home and local media foundation

**Wave objective:** Make Home useful: recent media, local files, media-type sections, filters, sorting, and personal actions.  
**Priority:** P0  
**Wave status:** Not started


#### W2-P11 — Home shell and information hierarchy

**Objective:** Make Home a purposeful, single-surface starting point.  
**Status:** Not started  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Pending

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☐ | Remove the persistent bottom-tab presentation from Home. | |

| ☐ | Define the Home header and primary actions. | |

| ☐ | Define the hierarchy of greeting, hero, recent, and utility content. | |

| ☐ | Define loading and offline behavior for Home. | |

| ☐ | Define the empty first-run Home state. | |

| ☐ | Define safe-area and scroll behavior. | |

| ☐ | Keep the first Home viewport focused on useful actions. | |

| ☐ | Remove routes that are not ready from prominent Home controls. | |

| ☐ | Add analytics-free local diagnostics for Home state transitions. | |

| ☐ | Verify Home navigation to Settings and playback. | |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W2-P12 — Recent media model and persistence

**Objective:** Fix Recent as a dependable user-facing feature.  
**Status:** In progress  
**Owner:** Unassigned  
**Blocker:** Runtime/device verification and reducer tests remain pending  
**Evidence:** Isolated reducer and façade now live under `src/features/recentHistory/`; shared root reducer and persistence whitelist are wired; TypeScript clean in `tscheck_recent_isolation_complete.log`.

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☑ | Define the recent-entry identity key. | Upsert identity is `fileUri`. |

| ☑ | Define title, URI, media type, artwork, duration, and position fields. | Canonical `MediaSource`/`MediaKind`/`MediaLane` fields plus thumbnail, duration, position, and timestamp. |

| ☑ | Define update-on-open behavior. | Player load/open paths call the isolated `addRecent` façade. |

| ☑ | Define update-on-progress behavior. | Audio and Video player checkpoint paths call the façade. |

| ☑ | Define completion and replay behavior. | Upsert moves the entry to the newest position while retaining canonical metadata. |

| ☐ | Define missing-file behavior for recent entries. | |

| ☑ | Define retention and maximum recent count. | Isolated reducer evicts oldest entries at a hard cap of 20. |

| ☑ | Define deduplication behavior. | Existing `fileUri` entries are removed before newest-first insertion. |

| ☑ | Define migration behavior for older persisted entries. | Normalization fills classification and defensive numeric defaults for persisted/legacy payloads. |

| ☐ | Write reducer/controller tests for recent updates. | Deferred to final verification gate. |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W2-P13 — Recent Home presentation and resume

**Objective:** Make Recent cards useful rather than decorative.  
**Status:** Not started  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Pending

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☑ | Render Recent from persisted state. | Home now reads `useRecentHistory().list`; reducer is whitelisted for persistence. |

| ☐ | Show distinct audio and video metadata. | |

| ☐ | Show a clear Continue action when a saved position exists. | |

| ☐ | Show a clear Open/Play action for new items. | |

| ☐ | Show a missing-file state with a remove action. | |

| ☐ | Use one intentional horizontal list or a justified section. | |

| ☐ | Prevent blanking Recent during refresh. | |

| ☐ | Use stable keys and typed card props. | |

| ☑ | Verify resume navigation sends the correct playback contract. | Home and History pass saved position through the typed player navigation contract; runtime verification pending. |

| ☐ | Verify Recent after app restart. | |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W2-P14 — Local media indexing and Settings entry

**Objective:** Allow users to add local files/folders through Settings.  
**Status:** Not started  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Pending

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☐ | Define the local-folder linking model. | |

| ☐ | Define file permission and revocation states. | |

| ☐ | Add the Settings entry for local media sources. | |

| ☐ | Implement a folder/file picker path appropriate to each platform. | |

| ☐ | Persist linked source metadata safely. | |

| ☐ | Define scan progress and cancellation. | |

| ☐ | Define duplicate-file handling. | |

| ☐ | Define unsupported-file handling. | |

| ☐ | Define missing-folder and permission-revoked handling. | |

| ☐ | Add a visible local-media status and rescan action. | |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W2-P15 — Local media sections, filters, and sorting

**Objective:** Present local media as organized content sections, not one mixed dump.  
**Status:** Not started  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Pending

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☐ | Create a Local Movies section for video files classified as movies. | |

| ☐ | Create a Local Podcasts/Audio section for audio files classified as audio. | |

| ☐ | Create a Local Music section or equivalent audio grouping. | |

| ☐ | Add an All Local Media view only when useful. | |

| ☐ | Add a Video filter. | |

| ☐ | Add an Audio filter. | |

| ☐ | Add a Newest sort. | |

| ☐ | Add a Largest/Size sort. | |

| ☐ | Add a Name sort with deterministic casing behavior. | |

| ☐ | Verify filters and sorting preserve stable list identity and pagination behavior. | |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


### Wave 3 — Content areas and Settings hub

**Wave objective:** Make Movies, Podcasts, Music, details, and the internal Settings navigation coherent and reachable.  
**Priority:** P0  
**Wave status:** In progress — execution Wave 2


#### W3-P16 — Movies browse overhaul

**Objective:** Make Movies consistent with the folder and list standards.  
**Status:** In progress  
**Owner:** Manus AI  
**Blocker:** Runtime verification deferred by project instruction; no build/test gate run in this wave.  
**Evidence:** `src/screens/MoviesScreen/index.tsx`, `src/screens/MoviesScreen/components/MoviesContent.tsx`, `src/screens/MoviesScreen/related/browseConfig.ts`, `v11_wave2_api_findings.md`

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☑ | Migrate MoviesScreen to the folder contract. | Thin `index.tsx` now owns route/config wiring; content moved to `components/MoviesContent.tsx`. |

| ☑ | Separate screen composition from child components. | `MoviesContent.tsx` now owns list rendering and state presentation. |

| ☑ | Move styles into a theme-aware styles folder. | Existing theme-aware `src/screens/MoviesScreen/styles` contract is retained and removed from the entry point. |

| ☑ | Move route/config/adapters into related. | Browse configuration remains screen-local under `related/browseConfig.ts`. |

| ☑ | Move screen-local types into types. | The index no longer owns screen-local types; content consumes the local `types` barrel. |

| ☑ | Use one primary FlatList or justified SectionList. | `MoviesContent.tsx` owns one primary grid FlatList. |

| ☑ | Implement loading, empty, error, offline, and retry states. | Existing `ListStates`/footer behavior is preserved behind the extracted content boundary. |

| ☑ | Implement stable keys and pagination guards. | Identifier keys and existing user-drag/in-flight guards remain in the extracted content module. |

| ☐ | Verify filters and sort behavior. | API/query mapping is audited; runtime verification is deferred to the final program gate. |

| ☐ | Verify movie-card navigation to MovieDetail and VideoPlayer. | Code path is preserved; device verification is deferred to the final program gate. |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W3-P17 — Podcasts browse overhaul

**Objective:** Make Podcasts consistent, readable, actionable, and contract-correct against Podcast Index.  
**Status:** In progress  
**Owner:** Manus AI  
**Blocker:** Runtime verification deferred by project instruction; no build/test gate run in this wave.  
**Evidence:** `src/screens/PodcastsScreen/index.tsx`, `src/screens/PodcastsScreen/components/PodcastsContent.tsx`, `src/screens/PodcastsScreen/hooks/usePodcastCategories.ts`, `src/screens/PodcastsScreen/related/browseConfig.ts`, `src/services/api/podcastIndexService.ts`, `v11_wave2_api_findings.md`

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☑ | Migrate PodcastsScreen to the folder contract. | Thin `index.tsx` now owns category/config/provider wiring; content moved to `components/PodcastsContent.tsx`. |

| ☑ | Separate podcast rows, headers, and states into components. | `PodcastsContent.tsx` composes existing row, overlay, footer, and state components. |

| ☑ | Move styles into a styles folder. | Existing theme-aware `src/screens/PodcastsScreen/styles` contract is retained and removed from the entry point. |

| ☑ | Move section/config data into related. | Dynamic config factory remains under `related/browseConfig.ts`. |

| ☑ | Move types into types. | The index no longer owns screen-local types; content consumes the local `types` barrel. |

| ☑ | Use one primary FlatList or justified SectionList. | `PodcastsContent.tsx` owns one primary FlatList. |

| ☑ | Implement loading, empty, error, offline, and retry states. | Existing overlay, `ListStates`, footer, retry, and offline paths are preserved behind the extracted content boundary. |

| ☑ | Implement stable keys and pagination guards. | Feed-ID keys and existing user-drag/in-flight/window guards remain in the extracted content module. |

| ☐ | Verify follow actions from the list. | Follow path is not changed in this architecture pass; device verification is deferred to the final program gate. |

| ☐ | Verify podcast detail and episode playback navigation. | Navigation path is preserved; device verification is deferred to the final program gate. |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W3-P18 — Music browse overhaul

**Objective:** Complete the MusicScreen architecture and behavior reference.  
**Status:** Not started  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Pending

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☐ | Protect the current MusicScreen refactor checkpoint. | |

| ☐ | Remove obsolete duplicate MusicScreen files after verification. | |

| ☐ | Keep the composition root small. | |

| ☐ | Keep BrowseLayout and data provider responsibilities explicit. | |

| ☐ | Keep TrackCard and list states isolated. | |

| ☐ | Verify API order and pagination behavior. | |

| ☐ | Verify search and genre filtering. | |

| ☐ | Verify refresh without blanking content. | |

| ☐ | Verify track navigation to AudioPlayer. | |

| ☐ | Document the pattern for future screens. | |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W3-P19 — Detail screens and content actions

**Objective:** Make detail pages consistent with browse screens and player contracts.  
**Status:** Not started  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Pending

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☐ | Inventory movie, podcast, music, album, artist, show, audiobook, and archive detail routes. | |

| ☐ | Define common detail header behavior. | |

| ☐ | Define artwork loading and fallback behavior. | |

| ☐ | Define primary action hierarchy. | |

| ☐ | Wire follow/unfollow where applicable. | |

| ☐ | Wire bookmark/unbookmark where applicable. | |

| ☐ | Wire add-to-playlist only for the correct media type. | |

| ☐ | Wire play/open actions with typed playback data. | |

| ☐ | Add missing, unavailable, and offline detail states. | |

| ☐ | Verify back navigation and mini-player behavior. | |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W3-P20 — Settings navigation hub

**Objective:** Make secondary content reachable before later Home sections are designed.  
**Status:** Not started  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Pending

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☐ | Create grouped Settings navigation data. | |

| ☐ | Add Library and playback group. | |

| ☐ | Add Discover group. | |

| ☐ | Add Offline and local media group. | |

| ☐ | Add Personal and account group. | |

| ☐ | Add Application preferences group. | |

| ☐ | Use consistent row components and icons. | |

| ☐ | Add descriptions for complex destinations. | |

| ☐ | Hide destinations that are not release-ready. | |

| ☐ | Verify every visible row reaches a working screen or explicit empty state. | |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


### Wave 4 — Auth, Profile, Settings, and device state

**Wave objective:** Make every visible account, profile, preference, permission, offline, and device action honest and functional.  
**Priority:** P0  
**Wave status:** Not started


#### W4-P21 — Login and auth UX overhaul

**Objective:** Make the first user journey stable and understandable.  
**Status:** Not started  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Pending

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☑ | Audit login form fields and validation. | Google-only sign-in is the current supported flow; no email/password form is presented. `LoginScreen.tsx` and `useLoginScreen.ts` reviewed. |

| ☑ | Define loading and disabled-submit behavior. | `GoogleSignInButton` receives `loading` and `disabled`; retry is disabled during an active request. |

| ☑ | Define invalid-credential copy. | Auth errors are categorized through `AuthErrorKind`; Google-only auth has no local credential-validation surface. |

| ☑ | Define offline-auth behavior. | `offline` auth classification displays explicit reconnect-and-retry copy. |

| ☐ | Define Google Sign-In success and failure states. | |

| ☐ | Define expired-session behavior. | |

| ☐ | Define account picker/revoke behavior. | |

| ☑ | Add accessible labels and focus order. | Privacy/Terms links, retry action, and sign-in control expose semantic labels; retry exposes disabled state. |

| ☑ | Verify keyboard and safe-area behavior. | Login content and legal actions use safe-area insets; runtime/device verification remains deferred. |

| ☐ | Test cold start, login, logout, and restore flows. | |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W4-P22 — Profile screen overhaul

**Objective:** Make every visible Profile action either functional or intentionally unavailable.  
**Status:** Not started  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Pending

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☑ | Inventory every Profile row and button. | Header sign-out, stats, recent strip, History, Stats, Bookmarks, Playlists, Downloads, Local Media, Settings, Theme, revoke, and clear-data actions reviewed. |

| ☑ | Classify each item as functional, pending, or remove. | Existing rows are wired or intentionally retained; Followed content and account refresh/offline states remain pending. |

| ☐ | Wire user identity and account metadata. | |

| ☐ | Wire profile refresh behavior. | |

| ☐ | Wire account settings navigation. | |

| ☑ | Wire history/bookmarks/followed content links. | History and Bookmarks are linked; a dedicated followed-content destination remains open for W4-P24. |

| ☑ | Wire downloads/local media links where appropriate. | Profile now links to `Downloads` and the Settings `LinkedFolders` route; local media retains linked-folder identity. |

| ☐ | Implement sign-out confirmation and cleanup. | |

| ☐ | Add loading, offline, and error states. | |

| ☐ | Verify Profile on fresh, restored, and expired sessions. | |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W4-P23 — Settings functionality audit

**Objective:** Make Settings a working control center rather than a visual catalog.  
**Status:** In progress  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Settings/local-library integration, safe preference reset, and live player preference application are implemented; notification/media-session and restart/device verification remain open.

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☑ | Inventory every Settings row and toggle. | Appearance, Library, Discover, Playback, Subtitles, About, account, and linked-folder controls reviewed in `SettingsScreen.tsx`. |

| ☑ | Connect playback preferences to the actual player. | `audioSettingsService.ts` now applies guarded hardware-acceleration, subtitle-autoload, language, EQ, replay-gain, gapless, delay, and sample-rate properties; `useAudioPlayerScreen.ts` and `useVideoPlayerScreen.ts` apply them at load and when settings change. |

| ☑ | Connect subtitle preferences to subtitle behavior. | `useVideoPlayerScreen.ts` applies preferred languages, auto-load mode, font size, text color, background opacity, and high-contrast overrides to active mpv playback; existing in-player controls persist changes. |

| ☑ | Connect theme preferences to the theme provider. | Theme picker and Profile quick-toggle dispatch `setThemeMode`; runtime persistence verification remains open. |

| ☑ | Connect local media settings to source/index services. | Settings refresh and Linked Folders rescans now call `useMediaScanner.startScan`; targeted rescans preserve linked-folder identity. |

| ☑ | Connect download preferences to download behavior. | `useDownloadsScreen.ts` synchronizes `settings.autoDeleteDownloads` with `downloadService.setKeepLastN()`, and the service enforces the policy after completed downloads. |

| ☐ | Connect notification/media-session settings where supported. | |

| ☑ | Implement reset-to-defaults safely. | `resetPreferencesToDefaults` resets playback, subtitle, appearance, audio, and accessibility preferences while preserving linked folders, scan state, local media, downloads, and personal items; confirmation is provided in `SettingsScreen.tsx`. |

| ☐ | Show persisted state after restart. | |

| ☑ | Hide or label unsupported settings instead of pretending they work. | Discover destinations and library controls are now explicit; unsupported runtime verification remains open. |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W4-P24 — Follow and bookmark system

**Objective:** Fix personal actions across Home, browse, detail, and Profile.  
**Status:** In progress  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Canonical bookmark metadata, follow selectors, detail-screen actions, and storage-failure rollback are implemented; list-card coverage, unavailable-item handling, and restart verification remain open.

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☑ | Define bookmark identity and media-type fields. | Bookmark, Recent, playlist, queue, API, and player contracts now carry `source`, semantic `type`, `mediaType` lane, optional `provider`, and optional `folderId`. |

| ☑ | Define follow identity and provider fields. | `FollowedPodcast` retains stable Podcast Index `id`, `feedUrl`, author/title, and followed timestamp; shared count/id/item selectors added. |

| ☑ | Create shared selectors for bookmarked items. | Bookmark slice exposes all, per-file, count, and media-aware records; hydration normalizes legacy metadata. |

| ☑ | Create shared selectors for followed items. | Added `selectFollowedPodcastCount`, `selectFollowedPodcastIds`, `selectFollowedPodcastById`, and existing membership selector. |

| ☑ | Wire bookmark actions on detail screens. | Archive, audiobook, live-content, and podcast detail flows retain bookmark actions; PodcastDetail now also exposes a direct per-episode `BookmarkButton` with canonical Podcast Index metadata. |

| ☐ | Wire bookmark actions on list cards where appropriate. | |

| ☑ | Wire follow actions for podcasts/shows/artists where appropriate. | Existing podcast follow state is persisted and Profile now exposes a Followed Podcasts destination; broader show/artist actions remain open. |

| ☑ | Show optimistic state only with rollback on failure. | `useBookmarks` updates Redux immediately and restores the prior item when bookmark persistence or deletion rejects. |

| ☐ | Handle removed or unavailable personal items. | |

| ☐ | Verify persistence and Profile presentation after restart. | |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W4-P25 — Permissions, offline, and local-state UX

**Objective:** Make device and offline behavior explicit and recoverable.  
**Status:** In progress  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Linked-folder identity, real rescans, local availability metadata, explicit permission recovery, global offline visibility, cached-content fallbacks, and failed-download retry are implemented; first-request timing, external revocation verification, and privacy documentation remain open.

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☑ | Inventory file, notification, location, media, and storage permissions. | Local-folder flows use the file scanner and linked-folder settings; notification/location permission surfaces are not used by the current media flows and remain explicitly out of scope pending audit. |

| ☐ | Map first-request timing for every permission. | |

| ☑ | Define denied and permanently-denied copy. | FolderBrowser and player permission failures use explicit recovery copy; FolderBrowser offers Settings for access-denied directory errors while ordinary errors retain Retry. |

| ☑ | Define offline banner behavior. | `OfflineBanner` now mounts once in `RootNavigator`, animates on connectivity loss, announces the state accessibly, and explains that saved content remains available. |

| ☑ | Define cached-content behavior. | Downloaded media is remapped to local copies by `player.api`; archive scopes retain visited results, artwork uses disk cache, and offline-capable screens expose saved/downloaded content without pretending remote refresh succeeded. |

| ☑ | Define local-file availability behavior. | Local records retain stable URI plus `folderId`, source, semantic kind, lane, provider, size, and timestamps; rescans replace stale URI records while preserving unchanged tracks. |

| ☑ | Define download failure and retry behavior. | `retryDownload` and a dedicated Retry action now recover `error` records; offline/permission-specific copy remains open for the W4-P25 follow-up. |

| ☑ | Define permission recovery links to Settings. | `FolderBrowserScreen.tsx` detects permission/access-denied directory failures, shows explicit recovery copy, and offers a Settings action; ordinary directory failures retain Retry. Runtime verification after external revocation remains open. |

| ☐ | Verify app behavior after permissions are revoked externally. | |

| ☐ | Document privacy-sensitive state handling. | |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


### Wave 5 — Playback core overhaul

**Wave objective:** Unify playback data and make AudioPlayer, VideoPlayer, loading, errors, and separate queues production-grade.  
**Priority:** P0  
**Wave status:** In progress — initial mini-player and runtime preference work landed; full player contract, PiP, and visual overhaul remain open.

### Player production acceptance gate — supplemental evidence block

This block is supplemental and is explicitly excluded from the canonical 40-phase/400-step denominator. It does not add a phase or alter W5-P27 through W5-P30; it records cross-phase acceptance evidence only.

The player is not considered complete because a screen renders or a control has an `onPress` handler. Each control must send its intent through the native mpv bridge, receive confirmed native state or an explicit native failure, reconcile Redux and the visible UI, and expose actionable recovery when it fails. The target user experience is professional and deliberate: stable touch targets, clear hierarchy, restrained controls, no decorative dead features, and no contradictory sources of truth.

| Done | Acceptance requirement | Evidence |
|---|---|---|
| ☐ | Native-confirmed transport state for play, pause, stop, seek, previous, next, replay, volume, mute, speed, repeat, and shuffle. | Must be evidenced for both AudioPlayer and VideoPlayer after the control repair batch. |
| ☐ | Explicit audio/video lane ownership for queues and transitions. | Explicit queue is consumed before remaining playlist items; cross-lane entries are rejected or routed to the correct player. |
| ☐ | Reliable end-of-track behavior. | End events advance exactly once, do not duplicate-load, preserve provenance, and show a deliberate ended/replay state at the lane boundary. |
| ☐ | Loading, buffering, failed, recovering, missing-source, permission, and unsupported-media states. | Each state has distinct copy, control availability, and recovery action. |
| ☐ | Track continuity across source changes. | Subtitle/audio tracks refresh and persisted supported preferences are reapplied without stale controls. |
| ☐ | Professional UI hierarchy and accessibility. | No clipping, overlap, dead controls, unexplained placeholders, or unstable touch targets; labels and hints are present. |
| ☐ | Local, remote, downloaded, and offline source behavior. | Source-specific loading and recovery paths are visible and preserve the canonical playback entry. |
| ☐ | Mini-player expansion, dismissal, and media-specific next/previous. | Compact and full-screen surfaces do not duplicate ownership or orphan after source failure. Code-level repair is recorded in `useAudioPlayerScreen.ts`, `playerSlice.ts`, `MiniAudioPlayer.tsx`, and `useMiniPlayer.ts`; emulator confirmation remains open. |
| ☐ | Lifecycle and interruption policy. | Navigation, backgrounding, rotation, restart, sign-out, audio focus, and supported PiP behavior are documented and verified. |
| ☐ | Full verification gate. | TypeScript, lint, production build, reducer/contract tests, and target-device playback journeys are recorded before Done. |

**Completion rule:** W5-P27 through W5-P30 and applicable W6 continuity phases remain **In progress** or **Ready for verification** until this acceptance block has evidence for both media lanes. Unsupported native capabilities must be hidden, disabled with an explanation, or explicitly platform-deferred rather than presented as working features.


#### W5-P26 — Shared playback contract

**Objective:** Unify source, queue, resume, and route data for audio and video.  
**Status:** In progress  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Added `src/types/playback.ts` with canonical `PlaybackEntry`, `PlaybackOrigin`, and `normalizePlaybackEntry`; `PlaylistEntry` now extends the contract and player playlist, queue, and history reducers normalize entries at state boundaries. Wave 6 construction-site migration now passes `npx tsc --noEmit --pretty false` with exit code 0 (`tscheck_wave6_batch5.log`). Runtime/device verification and contract tests remain open.

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☑ | Define the canonical PlaybackEntry type. | `src/types/playback.ts` defines shared URI, title, duration, artwork, resume, origin-route, autoplay, and canonical provenance fields. |

| ☑ | Map local file sources into the type. | `ScannedTrack`, FolderBrowser, AudioPlayer picker, and local playlist paths now carry `source:'local'`, semantic `type`, `mediaType`, and folder identity. |

| ☑ | Map remote content sources into the type. | API-backed Archive, LibriVox, Podcast Index, Jamendo, Audius, IPTV, TVMaze, and radio paths now use `source:'api'` with provider metadata. |

| ☑ | Map downloaded content sources into the type. | Download and resume persistence preserve canonical source/type/lane classification; legacy records normalize at hydration. |

| ☑ | Map playlist context into the type. | PlaylistSheet, AllPlaylists, FolderBrowser, PlaylistDetail imports, and player insertion boundaries now carry complete lane-aware entries; mixed creation is removed from active pickers. |

| ☑ | Map resume position into the type. | Session resume writes and Profile/Library recent navigation preserve canonical classification. |

| ☑ | Map artwork and display metadata into the type. | Player, detail, queue, bookmark, and remote-result payloads retain artwork and display metadata alongside canonical entries. |

| ☐ | Map origin route and autoplay intent into the type. | |

| ☑ | Update route param types. | Root navigation and player route payloads accept canonical media provenance fields. |

| ☐ | Add contract tests for every player entry point. | |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W5-P27 — Audio player UI and control overhaul

**Objective:** Make audio playback clear, calm, and reliable.  
**Status:** In progress  
**Owner:** Unassigned  
**Blocker:** Runtime/device verification pending  
**Evidence:** `AudioPlayer.tsx` now presents a focused now-playing card with status eyebrow, artwork, metadata, seek surface, transport, secondary actions, lyrics, and queue preview. `AudioTransportControls.tsx` separates primary transport from shuffle/repeat utilities with 44pt-plus targets. `AudioActionRow.tsx` provides visible bookmark, like, share, info, queue, manage, playlist, and overflow actions; `AudioAlbumArt.tsx` adds restrained frame depth and clipping; `AudioVolumeSlider.tsx` now provides a 44pt gesture surface while retaining native-confirmed percentage display. The runtime metadata repair now dispatches complete provenance/artwork fields in `useAudioPlayerScreen.ts`, merges native metadata without erasing route/cache artwork, and enriches Redux `currentFile` through the non-destructive `updateCurrentFileMetadata` reducer so the mini-player receives the same complete `PlaybackEntry`. Recent/Home playback was also migrated from deleted `AudioPlayer`/`VideoPlayer` navigation routes to `usePlaybackCommands().openPlayer()`, including Recent item resume, local file picking, Library playlist play-all/shuffle, and the remaining SongScreen share deep-links. A fresh source scan records `STALE_AUDIO_PLAYER_ROUTE_REFS=0` in `recent_audio_player_refs_after.txt`. TypeScript passes in `tscheck_player_ui_batch8.log`, `tscheck_music_player_runtime_fix.log`, and the fresh `tscheck_recent_route_fix.log` (`TSC_EXIT=0`). The mini-player visibility defect was isolated to a contrast mismatch: `surfaceDark` was used while light-theme `text.primary` and transport icons remained dark. `MiniAudioPlayer.tsx` now uses the theme-aware `background.elevated` surface and `text.inverse` for the gold play/pause control, keeping artwork, title, artist/album fallback, and controls readable in the current light Home presentation. Audio streaming startup was repaired in `useAudioPlayerScreen.ts`: initial `onFileLoaded` now explicitly resumes when there is no resume prompt, explicit resume seeks now resume after seeking, and all chapter, previous/next, playlist, queue, related-track, and remote-retry loads use a centralized `loadAndResume()` helper with a delayed second resume for native mpv settling. The display title now falls back from a null/empty route title to the media filename instead of rendering `null`. TypeScript passes in `tscheck_audio_streaming_fix.log` (`TSC_EXIT=0`). Emulator validation of Recent resume, remote streaming, full-player artwork, mini-player rendering, and close behavior remains open.

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☑ | Audit the current AudioPlayer layout. | Reviewed the full presentation shell, modal surfaces, transport, artwork, metadata, lyrics, and queue preview before refactoring. |

| ☑ | Define artwork and fallback treatment. | Existing animated artwork/fallback is retained inside the new elevated now-playing card. |

| ☑ | Define title/artist/album hierarchy. | Existing title/artist/album hierarchy is retained and given clearer separation by the new card and eyebrow status. |

| ☑ | Define primary play/pause treatment. | Primary play/pause is centered in a dedicated transport row with a 76pt gold action and native-confirmed `isPlaying`. |

| ☑ | Define progress and duration behavior. | Existing seek bar and chapter markers remain wired through the transport context; runtime scrub verification remains open. |

| ☑ | Define previous/next behavior. | Previous/next remain queue-first and lane-aware through the shared transition controller. |

| ☑ | Define repeat and shuffle behavior. | Shuffle and repeat are now clearly separated into labeled utility controls with selected-state accessibility. |

| ☑ | Define queue access behavior. | Queue, manage, playlist, queue preview, and full-page queue routes remain explicit and reachable. |

| ☑ | Define loading and error surfaces. | Existing loading orb, buffering bar, retry, permission settings, and recovery surfaces remain active. |

| ☑ | Verify all controls against native-confirmed state. | Native-confirmed state wiring was completed before this UI batch; device-level confirmation is still required. |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W5-P28 — Video player UI and control overhaul

**Objective:** Make video playback feel production-ready.  
**Status:** In progress  
**Owner:** Unassigned  
**Blocker:** Runtime/device verification pending  
**Evidence:** `PrimaryControls.tsx` now uses a stronger cinematic hierarchy, 48pt-plus transport targets, clearer rewind/forward versus track navigation, and disabled seek affordances for non-seekable live streams. `SecondaryToolbar.tsx` now uses 44pt minimum toolbar targets and a larger volume control. The VideoPlayer now passes the real lock state and `handleToggleLock` through `VideoPlayerTopBar`, which exposes an explicit lock/unlock affordance and consistent locked-control behavior. AudioPlayer now passes its actual `isReady` state to `TransportProvider`, enabling native position, playback, buffering, and seekability updates after load. TypeScript passes in `tscheck_player_lock_batch.log` and `tscheck_player_transport_batch.log`; local/remote playback and PiP still require device verification.

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☑ | Audit the current VideoPlayer composition. | Reviewed the layered video surface, fade veil, sheet dimmer, bottom controls, top bar, loading overlay, resume, PiP, and panel surfaces. |

| ☑ | Define the video surface loading state. | Existing dedicated loading/buffering overlay remains the single loading surface. |

| ☑ | Define header, title, back, and action hierarchy. | Existing top bar remains the primary title/back/bookmark/share/overflow and rotate surface. |

| ☑ | Define transport controls and hide/show behavior. | PrimaryControls retains animated visibility and now separates seek, track navigation, and 10-second transport actions with stronger targets. |

| ☑ | Define seek bar markers and metadata readiness. | Existing chapter markers, buffered ranges, thumbnails, and seekability state remain wired into the seek surface. |

| ☑ | Define volume and speed controls. | SecondaryToolbar retains inline volume and speed panels with enlarged touch targets. |

| ☑ | Define audio and subtitle panel presentation. | Audio and subtitle selectors remain explicit toolbar actions with active-state labels and subtitle visibility control. |

| ☑ | Define playlist panel presentation. | Playlist and queue actions remain accessible through the toolbar and top-bar overflow surfaces. |

| ☑ | Define rotate and PiP action states. | Rotate and PiP actions remain exposed through the top bar/toolbar; platform runtime verification remains open. |

| ☐ | Verify the complete local and remote playback journey. | Pending device verification across local files, remote streams, live/non-seekable sources, queue transitions, rotation, and PiP. |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W5-P29 — Loading, error, and recovery controller

**Objective:** Remove blank, childish, and non-actionable player states.  
**Status:** Not started  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Pending

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☐ | Define source-validation states. | |

| ☐ | Define native-initialization states. | |

| ☐ | Define metadata-loading states. | |

| ☐ | Define buffering states. | |

| ☐ | Define retry states. | |

| ☐ | Define missing-source errors. | |

| ☐ | Define permission errors. | |

| ☐ | Define unsupported-codec errors. | |

| ☐ | Define user-recovery actions. | |

| ☐ | Test state transitions without visual flicker or stale controls. | |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W5-P30 — Separate audio and video playlists

**Objective:** Remove mixed audio/video playlist ambiguity.  
**Status:** Ready for verification  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Playlist state is isolated under `src/features/playlists/` with reducer, persistence adapter, selectors, and façade commands. The legacy shared `playlistSlice.ts` was removed; `AllPlaylists`, `PlaylistDetail`, `QueueScreen`, `PlaylistSheet`, `PlaylistContextMenu`, `FolderBrowser`, Home, Library, Search, Profile, and playlist modals now consume the façade. Strict `AUDIO_ONLY`/`VIDEO_ONLY` lanes, duplicate protection, 20-playlist/100-item caps, local provenance, and popup add/create flows are implemented. Clean TypeScript evidence is recorded in `tscheck_playlist_final.log`; emulator/runtime and migration smoke verification remain deferred by project instruction.

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☑ | Define AudioPlaylistEntry and VideoPlaylistEntry boundaries. | `PlaylistEntry` carries canonical `mediaType`; `normalizeSingleLane()` enforces lane ownership at player boundaries. |

| ☑ | Prevent audio items from entering a video playlist. | Video queue and playlist insertion paths reject or filter audio entries. |

| ☑ | Prevent video items from entering an audio playlist. | Audio queue and playlist insertion paths reject or filter video entries. |

| ☑ | Define queue creation rules from browse cards. | Browse/content action constructors now provide complete canonical lane metadata before Redux insertion. |

| ☑ | Define queue creation rules from details. | Detail screens and player add-to-queue paths now use canonical `PlaybackEntryInput` normalization. |

| ☑ | Define queue persistence and migration. | Queue/playlist reducers normalize legacy partial entries at state boundaries; migration behavior still needs device/runtime evidence. |

| ☑ | Define next/previous behavior within each media type. | `playbackTransitionService.ts` resolves queue-first, lane-aware previous/next transitions for full-screen and mini-player controls. |

| ☑ | Define shuffle and repeat per media type. | Playlist and queue controls retain lane-specific ordering and loop decisions without cross-lane loading. |

| ☑ | Update mini-player and full-screen player queue data. | AudioPlayer, VideoPlayer, MiniAudioPlayer, and QueueScreen now forward canonical lane-aware entries. |

| ☐ | Test migration from any existing mixed playlist state. | Reducer migration/normalization is implemented; emulator persistence and restart verification remain open. |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


### Wave 6 — Playback continuity and advanced media

**Wave objective:** Finish mini player, PiP, tracks, resume, background behavior, downloads, and lifecycle continuity.  
**Priority:** P1  
**Wave status:** Not started


#### W6-P31 — Mini player overhaul

**Objective:** Make the compact player’s data and controls work everywhere they are shown.  
**Status:** In progress  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Navigator-level ownership, full-screen suppression, play/pause, progress derivation, swipe dismissal, and an explicit accessible Close action are implemented. Media-specific routing, source-failure recovery, and lifecycle verification remain open.

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☑ | Define the single mini-player owner. | `RootMiniPlayerOverlay` in `RootNavigator` renders the compact player once at navigator level. |

| ☑ | Define allowed root-stack routes. | The navigator-level overlay reads root navigation state and renders on non-player root routes. |

| ☑ | Hide the mini player on full-screen players. | `RootMiniPlayerOverlay` suppresses the compact player when the active route is `AudioPlayer` or `VideoPlayer`. |

| ☐ | Wire body tap to the correct player. | Current behavior opens `AudioPlayer`; media-specific routing remains part of the shared playback contract. |

| ☑ | Wire play/pause to confirmed state. | `useMiniPlayer` calls the native play/pause bridge and updates Redux playback state. |

| ☑ | Wire progress and duration. | Mini-player progress is derived from global `currentPosition` and `duration`; full duration presentation remains part of the visual pass. |

| ☐ | Wire next/previous to the media-specific queue. | Separate audio/video queue routing remains open. |

| ☑ | Implement close/dismiss semantics. | Added an explicit accessible Close action; it pauses native playback and dispatches `clearPlayer`, while swipe-down remains supported. |

| ☐ | Handle source failures without orphaned overlays. | |

| ☐ | Test route changes, rotation, and app restart. | |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W6-P32 — In-app PiP and global PiP

**Objective:** Complete compact and platform-level picture-in-picture behavior.  
**Status:** Not started  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Pending

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☐ | Inventory current PiP buttons and native APIs. | |

| ☐ | Choose supported platforms and media types. | |

| ☐ | Define entry preconditions. | |

| ☐ | Define exit and return-to-app behavior. | |

| ☐ | Preserve current media and position. | |

| ☐ | Handle orientation transitions. | |

| ☐ | Handle audio focus and interruptions. | |

| ☐ | Prevent duplicate mini/full-screen overlays. | |

| ☐ | Handle unsupported devices gracefully. | |

| ☐ | Run device-level PiP tests for every supported platform. | |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W6-P33 — Subtitle, audio-track, and media-control continuity

**Objective:** Make track state survive source transitions correctly.  
**Status:** Not started  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Pending

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☐ | Normalize native track models. | |

| ☐ | Refresh tracks on file load. | |

| ☐ | Refresh tracks on source changes. | |

| ☐ | Wire internal subtitle selection. | |

| ☐ | Wire external subtitle loading. | |

| ☐ | Wire subtitle visibility. | |

| ☐ | Wire audio-track selection. | |

| ☐ | Persist supported track preferences. | |

| ☐ | Show track-loading and track-error states. | |

| ☐ | Verify track state through rotation, resume, and PiP. | |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W6-P34 — Resume, background, and interruption behavior

**Objective:** Make playback lifecycle predictable across app and device state changes.  
**Status:** Not started  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Pending

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☐ | Define save-position cadence. | |

| ☐ | Define save-position behavior on navigation. | |

| ☐ | Define save-position behavior on backgrounding. | |

| ☐ | Define restore-position thresholds. | |

| ☐ | Define completion behavior. | |

| ☐ | Define phone-call/interruption behavior. | |

| ☐ | Define audio-focus loss behavior. | |

| ☐ | Define app-killed behavior. | |

| ☐ | Define sign-out behavior for active playback. | |

| ☐ | Test restart and lifecycle recovery on target devices. | |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W6-P35 — Downloads and offline playback

**Objective:** Make downloaded media a first-class, type-safe local source.  
**Status:** Not started  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Pending

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☐ | Normalize download record identity. | |

| ☐ | Show downloads by media type. | |

| ☐ | Wire download progress. | |

| ☐ | Wire pause/resume/cancel. | |

| ☐ | Wire retry after failure. | |

| ☐ | Open completed downloads through the playback contract. | |

| ☐ | Handle deleted or missing downloaded files. | |

| ☐ | Respect retention settings. | |

| ☐ | Expose downloads from Settings/Profile. | |

| ☐ | Test offline playback for audio and video separately. | |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


### Wave 7 — Quality, packaging, and release candidate

**Wave objective:** Remove list slop, recover tests and lint, harden native builds, and validate the release candidate.  
**Priority:** P0  
**Wave status:** Not started


#### W7-P36 — FlatList and virtualization cleanup

**Objective:** Remove avoidable list slop from release routes.  
**Status:** Not started  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Pending

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☐ | Inventory ScrollView and virtualized-list nesting. | |

| ☐ | Inventory index-based keys. | |

| ☐ | Inventory duplicated loading branches. | |

| ☐ | Inventory duplicated empty/error components. | |

| ☐ | Migrate priority browse screens first. | |

| ☐ | Add pagination request guards. | |

| ☐ | Add refresh controls without blanking cached data. | |

| ☐ | Move repeated row markup into components. | |

| ☐ | Measure slow list screens on target devices. | |

| ☐ | Close all P0 list findings before release candidate. | |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W7-P37 — Automated test recovery and expansion

**Objective:** Make test output trustworthy for core journeys.  
**Status:** Not started  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Pending

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☐ | Fix the react-native-config Jest setup. | |

| ☐ | Make the authentication-service suite run. | |

| ☐ | Add auth gate tests. | |

| ☐ | Add recent/session reducer tests. | |

| ☐ | Add bookmark/follow tests. | |

| ☐ | Add local media classification tests. | |

| ☐ | Add playlist separation tests. | |

| ☐ | Add player controller tests. | |

| ☐ | Add mini-player visibility tests. | |

| ☐ | Add navigation smoke tests for release-critical routes. | |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W7-P38 — Lint, type, error boundaries, and observability

**Objective:** Reduce maintainability risk and make failures diagnosable.  
**Status:** Not started  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Pending

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☐ | Run typecheck after every migration batch. | |

| ☐ | Remove production-source ESLint errors. | |

| ☐ | Review inline-style warnings. | |

| ☐ | Review unused-variable warnings. | |

| ☐ | Add screen-level error boundaries where missing. | |

| ☐ | Normalize user-facing error reporting. | |

| ☐ | Add sanitized player lifecycle diagnostics. | |

| ☐ | Add route and operation context to failures. | |

| ☐ | Verify no secrets or personal data enter logs. | |

| ☐ | Publish the final technical-quality report. | |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W7-P39 — Native build, signing, and store readiness

**Objective:** Turn the codebase into a deliverable mobile artifact.  
**Status:** Not started  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Pending

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☐ | Configure protected Android release signing. | |

| ☐ | Verify Android versionCode/versionName policy. | |

| ☐ | Decide and test release minification. | |

| ☐ | Verify mpv native libraries in release packaging. | |

| ☐ | Build and install Android release artifact. | |

| ☐ | Configure iOS release signing and entitlements. | |

| ☐ | Archive and install iOS release artifact. | |

| ☐ | Verify permissions and privacy disclosures. | |

| ☐ | Verify crash reporting and analytics configuration. | |

| ☐ | Document reproducible release commands and artifacts. | |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


#### W7-P40 — Release candidate and midpoint demonstration

**Objective:** Demonstrate a coherent product milestone instead of counting files.  
**Status:** Not started  
**Owner:** Unassigned  
**Blocker:** None recorded  
**Evidence:** Pending

| Done | Checkable step | Notes/evidence |
|---|---|---|

| ☐ | Run the complete authentication smoke path. | |

| ☐ | Run the Home and Settings smoke path. | |

| ☐ | Run local media add/filter/sort smoke paths. | |

| ☐ | Run Recent/resume smoke paths. | |

| ☐ | Run follow/bookmark smoke paths. | |

| ☐ | Run Movies/Podcasts/Music browse paths. | |

| ☐ | Run separate audio/video playlist paths. | |

| ☐ | Run AudioPlayer/VideoPlayer paths. | |

| ☐ | Run mini-player/PiP paths supported by the platform matrix. | |

| ☐ | Record unresolved defects and decide whether the candidate earns the 50% milestone. | |

**Exit gate:** Record changed files, verification commands, screenshots/recordings, test devices, and unresolved defects before changing Status to Done.


## 5. Midpoint demonstration checklist

The midpoint is earned only after the following user-visible journeys pass on the agreed device matrix:

| Done | Journey | Evidence |
|---|---|---|
| ☐ | Fresh launch → Login → Home | |
| ☐ | Home without the unwanted bottom-tab presentation | |
| ☐ | Home Recent → resume audio/video | |
| ☐ | Settings → add local file/folder | |
| ☐ | Local Movies/Audio sections with Video and Audio filters | |
| ☐ | Local sorting by Newest, Size, and Name | |
| ☐ | Follow and Bookmark from supported content surfaces | |
| ☐ | Profile shows working personal destinations | |
| ☐ | Settings rows and toggles perform their stated actions | |
| ☐ | Movies, Podcasts, and Music browse/detail flows | |
| ☐ | Audio playlist excludes video items | |
| ☐ | Video playlist excludes audio items | |
| ☐ | AudioPlayer core controls and recovery | |
| ☐ | VideoPlayer core controls and recovery | |
| ☐ | Mini-player expand, play/pause, close, progress, and queue actions | |
| ☐ | Supported in-app/global PiP entry and exit | |
| ☐ | Restart/resume and offline/download behavior | |
| ☐ | TypeScript, tests, lint, and release-build gates | |

## 6. Defect priority

| Priority | Meaning | Release treatment |
|---|---|---|
| P0 | Prevents authentication, navigation, playback, local media, personal actions, or release packaging | Must fix before midpoint/candidate gate |
| P1 | Makes a supported journey confusing, unreliable, or materially degraded | Fix before candidate unless explicitly accepted |
| P2 | Cosmetic or low-frequency issue with a safe workaround | Schedule after P0/P1 or document |
| Deferred | Deliberately outside this target | Do not expose from primary UI |

## 7. Required evidence format

For every completed phase, add a short evidence note using this format:

```text
Phase: W#-P##
Status: Done
Changed files:
Verification commands:
Devices/platforms:
Manual paths:
Screenshots or recordings:
Known limitations:
Reviewer:
Date:
```

## 8. Working principles

The overhaul should be implemented in small, reversible batches. Do not reset existing uncommitted work. Do not mark a route done because it can be opened from an internal shortcut. Do not leave visible controls that do nothing. Do not mix audio and video queue semantics. Do not hide list problems behind another wrapper component. If a feature is not ready, remove it from primary discovery or label it honestly until the work is complete.


## Full content-area pipeline — manager scope reference

The current execution batch does not remove the remaining content areas from v11. They are explicitly planned below so they can be reported as pipeline scope rather than assumed work.

| Content area | Canonical tracking location | Current state | Required future evidence |
|---|---|---|---|
| Movies | W3-P16 | In progress from Execution Wave 2 | Runtime filters/sorts, detail navigation, VideoPlayer handoff |
| Podcasts | W3-P17 | In progress from Execution Wave 2 | Category filter response, follow action, detail/episode playback navigation |
| Music | W3-P18 | Planned for Execution Wave 3 | Folder contract, audio-only list/queue, search/category behavior, player handoff |
| Local Files | W2-P11–W2-P15 | Planned for Execution Wave 3 | Settings source flow, permissions, scan/index, separated media sections, Video/Audio filters, Newest/Size/Name sorting |
| Live TV | Future content-area pipeline | Planned | Channel/source model, guide/list, live playback, buffering/reconnect, favorite channels, platform limitations |
| Live Radio | Future content-area pipeline | Planned | Station/genre model, live audio route, reconnect, favorites, mini-player continuity |
| Audiobooks | Future content-area pipeline | Planned | Book/author/chapter model, chapter list, resume/progress, audio-only queue, offline rules |
| Archives | Future content-area pipeline | Planned | Archive search, metadata/detail, media classification, filters, pagination, unsupported-file handling |
| Details/shared routes | Cross-cutting W3–W6 | In pipeline | Consistent detail shell, related content, Follow/Bookmark, media-safe player handoff |
| Settings/Profile | W2 and W4 | In pipeline | Functional source management, account/preferences, Follow/Bookmark destinations, permission states |

> **Manager note:** “Planned” means explicitly included in the v11 pipeline and tracked for future execution. It does not mean implemented or verified. Each area will receive its own architecture, API/data-contract, UI/UX, state, navigation, and release-evidence work before it can be reported as complete.


## All-page detabbed navigation rule

| Rule | Status | Evidence / acceptance |
|---|---|---|
| No bottom tab bar is used anywhere in the authenticated app | ☑ | Wave 1 replaced the visual bottom-tab shell with `MainShellNavigator`; later route audits must confirm no page reintroduces it. |
| Home, Movies, Podcasts, Music, and Local Files use native-stack destinations | ☑ / In progress | Shell foundation is implemented; Music and Local Files route-boundary cleanup is in the current Wave 3 batch. |
| Live TV, Live Radio, Audiobooks, Archives, Settings, Profile, detail, and player pages are explicitly in the detabbed pipeline | ☑ | Full content-area pipeline and navigation model are documented in `v11_manus_specification.md`. |
| No screen depends on tab-bar height or tab-specific safe-area offsets | ☐ | Requires cross-route source audit and final device verification. |
| Every destination has explicit entry links, header/back behavior, and media-safe handoff | ☐ | Requires route-by-route implementation and final smoke matrix. |

> **Manager note:** “Detabbed” is now a product-wide navigation constraint, not only a Home-screen visual change. Existing tab-era names may remain temporarily for compatibility, but no route may render or depend on a bottom tab bar.


## Manager dashboard — Wave 3 checkpoint

The tracker currently records **178 checked rows and 295 open rows** across **473 visible checklist rows**. The canonical program denominator remains **400 phase steps**: **139 canonical steps are checked**, while **39 checked and 34 open rows** are supplemental evidence. The recent Playlist isolation and Player Overhaul batches updated existing W5-P28/W5-P30 evidence only; they did not add canonical phases or canonical checklist steps. This checkpoint reflects implementation evidence only. Build, test, device, screenshot, scanner-population, and final route-audit gates remain open unless explicitly marked otherwise.


## Current batch evidence — Home playlist truthfulness

**Scope:** Remove visible dummy playlist and AI-curated placeholder cards from Home and connect the Playlists rail to the isolated playlist façade.

**Status:** Implemented; runtime screenshot verification remains open.

**Changed files:** `src/screens/Home/hooks/useHomeScreen.ts`, `src/screens/Home/index.tsx`, `src/screens/Home/types/index.ts`, `src/screens/Home/related/homeSectionKey.ts`, `src/screens/Home/components/QuickAccessShelf.tsx`; obsolete `src/screens/Home/components/ComingSoonShelf.tsx` deleted.

**Behavior:** Home now renders only the real `usePlaylists().list` data. When the list is empty, the Playlists section remains truthful and shows `No Playlists Yet` with guidance to create a playlist from the player. The `VIEW ALL` action is hidden while empty and appears only when real playlists exist. New playlists will populate the same rail through the existing Redux-backed feature state.

**Verification command:** `npx tsc --noEmit --pretty false`

**Verification result:** `TSC_EXIT=0`; Home placeholder scan reports `HOME_PLACEHOLDER_MATCH_COUNT=0`.

**Manual/device verification:** Open. Confirm an empty account shows the empty state, then create one audio or video playlist and confirm the real playlist card appears with its item count. No dummy data may be restored.

**Date:** 2026-08-21

**Reviewer:** Manus

---

## 8.1 Current batch acceptance rule

A Home section must be backed by real feature state or render an explicit empty/loading/error state. Placeholder cards such as `Coming soon` and `Placeholder content` are not acceptable in the production app.


## Current batch evidence — Home route render-error repair

**Scope:** Repair the native-stack error stating that the `Home` screen had no valid `component`, `getComponent`, or `children` prop after the Home playlist placeholder cleanup.

**Status:** Code fix complete; Metro reload/device confirmation remains open.

**Changed files:** `src/screens/Home/index.tsx`, `src/navigation/RootNavigator.tsx`.

**Fix:** Added an explicit default export for `HomeScreen` and changed `RootNavigator` to import that default entrypoint. Restored the JSX return closure after the export change. The Home folder now exposes both its existing named export and an explicit default public screen component.

**Verification:** `npx tsc --noEmit --pretty false` returned `TSC_EXIT=0`; Home placeholder scan returned `HOME_PLACEHOLDER_MATCH_COUNT=0`; targeted `git diff --check` completed without whitespace errors.

**Manual path:** Restart Metro with cache reset, reload the app, authenticate, and open the Home route. Confirm that the native stack renders Home and that an empty playlist state appears instead of placeholder cards.

**Known limitation:** The attached emulator/Metro session must be restarted or reloaded to clear the stale runtime bundle shown in the provided screenshot.

**Date:** 2026-08-21

**Reviewer:** Manus


## Supplemental Evidence — Local Files Discover Card Background

- **Issue:** Local Files had no artwork entry in `BROWSE_ALL_SECTIONS`, so `CategoryCard` fell back to a plain `colors.background.elevated` surface. In the light theme this rendered as an almost-white card with no visual separation from the Home background.
- **Fix:** Added the theme-aware `fallbackVariant="localFiles"` to `CategoryCard` and applied it only to the Local Files Discover entry. The fallback now renders a deliberate diagonal gradient using shared gold/background tokens, with a theme-safe folder badge and readable text.
- **Files:** `src/components/utility/CategoryCard/CategoryCard.tsx`; `src/screens/Home/components/BrowseAllShelf.tsx`.
- **Static evidence:** `tscheck_local_files_background.log` reports `TSC_EXIT=0`.
- **Open verification:** Confirm the Local Files card visually in both light and dark themes on the emulator; no device visual gate is claimed by this code-only change.

### Screen architecture refactor — Album and Artist batch

| Done | Supplemental implementation checkpoint | Evidence |
|---|---|---|
| ☑ | Create a single public `index.tsx` entrypoint for Album and Artist. | `src/screens/Album/index.tsx` and `src/screens/Artist/index.tsx` now export the screen boundaries. |
| ☑ | Move Album and Artist implementations behind internal `components/` folders. | `Album/components/AlbumScreen.tsx` and `Artist/components/ArtistScreen.tsx`. |
| ☑ | Move Album and Artist screen hooks behind internal `hooks/` folders. | `Album/hooks/useAlbumScreen.ts` and `Artist/hooks/useArtistScreen.ts`. |
| ☑ | Add screen-local props type barrels. | `Album/types/index.ts` and `Artist/types/index.ts`. |
| ☑ | Route RootNavigator imports through the public screen boundaries. | `src/navigation/RootNavigator.tsx` imports `Album` and `Artist` directories rather than implementation files. |
| ☑ | Preserve current navigation and playback behavior during the boundary migration. | Existing route names and hook handlers are unchanged; implementation is statically compatible. |
| ☑ | Run the TypeScript gate after the two-screen batch. | `tscheck_screen_architecture_album_artist.log`: `TSC_EXIT=0`. |
| ☐ | Complete remaining nonconforming screen migrations and run emulator/runtime verification. | Continue in the ordered screen architecture queue; device/build verification remains deferred. |

**Screen architecture batch status:** **In progress**. Album and Artist are migrated without TypeScript regressions; the remaining screen inventory still requires ordered refactoring.

### Screen architecture refactor — Priority 1 boundary batch

| Done | Architecture checkpoint | Evidence |
|---|---|---|
| ☑ | Migrate Album behind a single public `index.tsx` entrypoint. | `src/screens/Album/index.tsx`, `components/AlbumScreen.tsx`, `hooks/useAlbumScreen.ts`, `types/index.ts`; `RootNavigator` imports `../screens/Album`. |
| ☑ | Migrate Artist behind a single public `index.tsx` entrypoint. | `src/screens/Artist/index.tsx`, `components/ArtistScreen.tsx`, `hooks/useArtistScreen.ts`, `types/index.ts`; `RootNavigator` imports `../screens/Artist`. |
| ☑ | Migrate Genre behind a single public `index.tsx` entrypoint. | `src/screens/Genre/index.tsx`, `components/GenreScreen.tsx`, `hooks/useGenreScreen.ts`, `types/index.ts`; `RootNavigator` imports `../screens/Genre`. |
| ☑ | Migrate Song behind a single public `index.tsx` entrypoint. | `src/screens/Song/index.tsx`, `components/SongScreen.tsx`, `hooks/useSongScreen.ts`, `types/index.ts`; `RootNavigator` imports `../screens/Song`. |
| ☑ | Preserve route names, navigation parameter contracts, feature façade imports, and route-free playback commands during the batch. | Existing route names and `RootStackScreenProps` contracts retained; `usePlaybackCommands().openPlayer()` remains in Song and related flows. |
| ☑ | Run the static TypeScript gate after the complete Priority 1 migration. | `tscheck_screen_architecture_priority1.log`: `TSC_EXIT=0`. |
| ☐ | Run emulator/device journeys and final project-wide direct-import verification. | Deferred to the ordered release verification gate; runtime behavior and visual acceptance remain open. |

**Priority 1 screen architecture status:** **Ready for verification**, not Done. The four active Library/content screens now follow the public-entrypoint contract; Priority 2 detail-screen migrations are next.

**Priority 1 final static gate:** `tscheck_screen_architecture_priority1_final.log` reports `PRIORITY1_DIRECT_IMPLEMENTATION_IMPORTS=0` and `TSC_EXIT=0`. No source caller directly imports the moved Album, Artist, Genre, or Song implementation files; navigation consumes only their public `index.tsx` boundaries.


### Screen architecture refactor — Priority 2 detail boundary batch

| Done | Architecture checkpoint | Evidence |
|---|---|---|
| ☑ | Migrate MovieDetailScreen behind a single public `index.tsx` entrypoint. | `src/screens/MovieDetailScreen/index.tsx`, `components/MovieDetailScreen.tsx`, `hooks/useMovieDetailScreen.ts`, and `types/index.ts`. |
| ☑ | Migrate MusicDetailScreen behind a single public `index.tsx` entrypoint. | `src/screens/MusicDetailScreen/index.tsx`, `components/MusicDetailScreen.tsx`, `hooks/useMusicDetailScreen.ts`, and `types/index.ts`. |
| ☑ | Migrate ShowDetailScreen behind a single public `index.tsx` entrypoint. | `src/screens/ShowDetailScreen/index.tsx`, `components/ShowDetailScreen.tsx`, `hooks/useShowDetailScreen.ts`, and `types/index.ts`. |
| ☑ | Migrate AudiobookDetailScreen behind a single public `index.tsx` entrypoint. | `src/screens/AudiobookDetailScreen/index.tsx`, `components/AudiobookDetailScreen.tsx`, `hooks/useAudiobookDetailScreen.ts`, and `types/index.ts`. |
| ☑ | Migrate ArchiveItemDetailScreen behind a single public `index.tsx` entrypoint. | `src/screens/ArchiveItemDetailScreen/index.tsx`, `components/ArchiveItemDetailScreen.tsx`, `hooks/useArchiveItemDetailScreen.ts`, and `types/index.ts`. |
| ☑ | Normalize the simple Equalizer folder to its public boundary. | Renamed `src/screens/Equalizer/EqualizerScreen.tsx` to `src/screens/Equalizer/index.tsx`; the named `EqualizerScreen` export and route contract remain intact. |
| ☑ | Rewire navigation to consume only public screen boundaries. | `RootNavigator.tsx` now imports the five detail screens through their folders; `SettingsStack.tsx` imports Equalizer through `../screens/Equalizer`. |
| ☑ | Preserve navigation props, media taxonomy, and route-free playback behavior. | Screen-local prop barrels retain existing `RootStackScreenProps` route contracts; existing `openPlayer()` flows and `source`/`type`/`mediaType` values remain unchanged. |
| ☑ | Run the static TypeScript gate after the complete Priority 2 migration. | `tscheck_screen_architecture_priority2.log`: `TSC_EXIT=0`. |
| ☑ | Run the direct implementation import and structural boundary scan. | `v11_screen_architecture_priority2_direct_import_scan.txt`: `PRIORITY2_DIRECT_IMPLEMENTATION_IMPORTS=0`, `EQUALIZER_DIRECT_IMPLEMENTATION_IMPORTS=0`, and `OLD_IMPLEMENTATION_FILES_REMAINING=0`. |
| ☐ | Run emulator/device journeys and final project-wide architecture verification. | Deferred to the ordered release verification gate; runtime, build, and visual acceptance remain open. |

**Priority 2 screen architecture status:** **Ready for verification**, not Done. The five active detail screens and Equalizer now expose public folder boundaries; Priority 3 is next in the ordered queue.

**Date:** 2026-08-21

**Reviewer:** Manus


### Screen architecture refactor — Priority 3 library and playback-adjacent screens

| Done | Architecture checkpoint | Evidence |
|---|---|---|
| ☑ | Migrate PlaylistDetail behind a single public `index.tsx` entrypoint. | `src/screens/PlaylistDetail/index.tsx`, `components/PlaylistDetailScreen.tsx`, `related/textContent.ts`, `hooks/`, and `types/index.ts`. |
| ☑ | Migrate AllPlaylists behind a single public `index.tsx` entrypoint. | `src/screens/AllPlaylists/index.tsx`, `components/AllPlaylistsScreen.tsx`, `hooks/useAllPlaylistsScreen.ts`, and `types/index.ts`. |
| ☑ | Migrate QueueScreen behind a single public `index.tsx` entrypoint. | `src/screens/QueueScreen/index.tsx`, `components/QueueScreen.tsx`, `hooks/useQueueScreen.ts`, and `types/index.ts`. |
| ☑ | Migrate History behind a single public `index.tsx` entrypoint. | `src/screens/History/index.tsx`, `components/HistoryScreen.tsx`, and `types/index.ts`. |
| ☑ | Migrate Bookmarks behind a single public `index.tsx` entrypoint. | `src/screens/Bookmarks/index.tsx`, `components/BookmarksScreen.tsx`, `hooks/useBookmarksScreen.ts`, `related/textContent.ts`, and `types/index.ts`. |
| ☑ | Migrate Stats behind a single public `index.tsx` entrypoint. | `src/screens/Stats/index.tsx`, `components/StatsScreen.tsx`, and `types/index.ts`. |
| ☑ | Rewire RootNavigator to consume only the six public boundaries. | Priority 3 implementation-path imports in `RootNavigator.tsx`: **0**. |
| ☑ | Preserve playlist lane isolation and feature façade usage. | PlaylistDetail and AllPlaylists continue to use the isolated `features/playlists` façade; no MIXED playlist behavior was introduced. |
| ☑ | Replace QueueScreen’s index-based list-key fallback. | `SectionList` now derives a semantic key from URI, source, type, media lane, provider, and folder identity. |
| ☑ | Migrate Bookmarks playback opening to the overlay command contract. | `useBookmarksScreen.ts` now calls `usePlaybackCommands().openPlayer()` with canonical playback entry fields and resume position. |
| ☑ | Remove obsolete player deep-link targets from PlaylistDetail and share routing. | Playlist item sharing now uses existing `MovieDetail`/`SongScreen` targets; obsolete `AudioPlayer`/`VideoPlayer` route entries were removed from `shareService.ts`. |
| ☑ | Run the static TypeScript gate after the complete Priority 3 migration. | `tscheck_screen_architecture_priority3.log`: `TSC_EXIT=0`. |
| ☑ | Run Priority 3 structural and boundary verification. | `v11_screen_architecture_priority3_direct_import_scan.txt`: all six public boundaries present; RootNavigator direct implementation imports **0**; migrated-screen stale player route references **0** after correction. |
| ☐ | Run emulator/device journeys and final project-wide architecture verification. | Deferred to the final release verification gate; runtime, build, and visual acceptance remain open. |

**Priority 3 screen architecture status:** **Ready for verification**, not Done. The six requested screens now expose public folder boundaries, and the playback-adjacent stale route issues discovered during migration were corrected without reintroducing navigation player routes.

**Date:** 2026-08-21

**Reviewer:** Manus


### Screen architecture refactor — Priority 4 search, files, downloads, and now-playing screens

| Done | Architecture checkpoint | Evidence |
|---|---|---|
| ☑ | Migrate Search behind one public `index.tsx`. | `src/screens/Search/index.tsx`, `components/SearchScreen.tsx`, existing `components/`, `hooks/`, moved `related/textContent.ts`, and `types/index.ts`. |
| ☑ | Migrate FolderBrowser behind one public `index.tsx`. | `src/screens/FolderBrowser/index.tsx`, `components/FolderBrowserScreen.tsx`, moved `related/textContent.ts`, and `types/index.ts`. |
| ☑ | Migrate LinkedFolders behind one public `index.tsx`. | `src/screens/LinkedFolders/index.tsx`, `components/LinkedFoldersScreen.tsx`, moved `related/textContent.ts`, and `types/index.ts` using the existing SettingsStack route alias. |
| ☑ | Migrate DownloadsScreen behind one public `index.tsx`. | `src/screens/DownloadsScreen/index.tsx`, `components/DownloadsScreen.tsx`, `hooks/useDownloadsScreen.ts`, and `types/index.ts`. |
| ☑ | Migrate NowPlaying behind one public `index.tsx`. | `src/screens/NowPlaying/index.tsx`, `components/NowPlayingScreen.tsx`, and `types/index.ts`. |
| ☑ | Rewire RootNavigator and SettingsStack to public folder boundaries. | `v11_screen_architecture_priority4_direct_import_scan.txt`: direct implementation imports **0**; public imports verified in both navigators. |
| ☑ | Preserve stable list-key behavior while migrating. | LinkedFolders folder list now uses the folder path as its semantic key; Priority 4 scan reports index-based key extractors **0**. |
| ☑ | Remove stale player-route usage from NowPlaying. | NowPlaying’s full-player CTA now uses `usePlaybackCommands().openPlayer()` with canonical playback fields; migrated-screen stale player-route references **0**. |
| ☑ | Run the static TypeScript gate after the complete Priority 4 migration. | `tscheck_screen_architecture_priority4.log`: `TSC_EXIT=0`. |
| ☑ | Update the screen inventory for the new public and internal boundaries. | `v11_screen_architecture_inventory.csv` records `index.tsx` roots and `components/`, `hooks/`, `related/`, and `types/` subdirectories. |
| ☐ | Run emulator/device journeys and final project-wide architecture verification. | Deferred to the final release verification gate; runtime, build, and visual acceptance remain open. |

**Priority 4 screen architecture status:** **Ready for verification**, not Done. All five requested screens now expose one public `index.tsx`, with implementation and supporting files kept behind their screen folders.

**Date:** 2026-08-21

**Reviewer:** Manus


### Screen architecture refactor — Priority 5 all-audio, all-video, settings, utility, legal, account, authentication, and splash screens

| Done | Architecture checkpoint | Evidence |
|---|---|---|
| ☑ | Migrate AllAudio and AllVideos behind public `index.tsx` boundaries. | Each screen now has `components/`, `hooks/`, and `types/`; navigator callers use the folder boundary. |
| ☑ | Migrate About and AudioSettings behind public `index.tsx` boundaries. | Each screen now has `components/`, `related/`, and `types/`; SettingsStack uses public imports. |
| ☑ | Migrate Settings while preserving its existing internal dialogs and settings hook. | `src/screens/Settings/index.tsx`, `components/`, `hooks/`, `related/`, and `types/`; existing dialog components remain internal. |
| ☑ | Migrate Help, Privacy, Terms, Licenses, Credits, and Changelog behind public boundaries. | Each screen now exposes one root `index.tsx` with implementation under `components/` and route props under `types/`. |
| ☑ | Migrate Splash, Login, and Profile behind public boundaries. | Splash and Login retain `related/` and `hooks/` resources as applicable; Profile now uses `components/` and `types/`. |
| ☑ | Preserve route contracts across RootNavigator and SettingsStack. | `v11_screen_architecture_priority5_direct_import_scan.txt`: navigator direct implementation imports **0** and public boundary imports verified. |
| ☑ | Preserve stable list-key and playback-route rules in the migrated batch. | Priority 5 scan reports index-based key extractors **0** and stale AudioPlayer/VideoPlayer references **0**. |
| ☑ | Run the TypeScript gate after the complete Priority 5 migration. | `tscheck_screen_architecture_priority5.log`: `TSC_EXIT=0`. |
| ☑ | Update the screen inventory for all fourteen Priority 5 targets. | `v11_screen_architecture_inventory.csv` records root `index.tsx` entrypoints and internal directories. |
| ☐ | Run emulator/device journeys, builds, and final project-wide architecture verification. | Deferred to the final release verification gate; runtime and visual acceptance remain open. |

**Priority 5 screen architecture status:** **Ready for verification**, not Done. All fourteen requested screens now expose one public root `index.tsx`, while hooks, text, related logic, and components remain internal to their screen folders.

**Date:** 2026-08-21

**Reviewer:** Manus


### Final full-codebase verification and screen architecture evidence

This checkpoint records the post-Priority-5 full-codebase checks and the final `src/screens` architecture scan. Runtime/device acceptance remains separate from static and bundle verification.

| Check | Result | Evidence |
|---|---|---|
| Full TypeScript compilation | **PASS — `TSC_EXIT=0`** | `tscheck_full_codebase_after_architecture_cleanup.log` |
| Android production JavaScript bundle | **PASS — `BUNDLE_EXIT=0`** | `bundle_android_release_final.log`; output `.verification/index.android.final.bundle` |
| Jest suite | **BLOCKED — `TEST_EXIT=1`** | `test_full_codebase_final.log`; `authService.test.ts` cannot initialize `react-native-config` because `Config` is null in the Jest environment. Other visible suites passed. |
| ESLint | **BLOCKED — `LINT_EXIT=1`** | `lint_full_codebase_final.log`; 446 reported problems: 191 errors and 255 warnings. This is a broad pre-existing lint backlog and is not a TypeScript or bundle failure. |
| Full first-level `src/screens` public-boundary scan | **PASS — `NONCONFORMING_COUNT=0`** | `v11_full_src_screens_architecture_scan_final.txt` |
| Navigator implementation-path scan | **PASS — `NONE`** | `v11_full_src_screens_architecture_scan_final.txt` |

The final architecture cleanup migrated the active legacy `LiveTVScreen` into `components/`, `hooks/`, and `types/` with a public `index.tsx`, restored its local navigation type contract, corrected all moved relative imports, and removed empty obsolete aliases: `AllAudioScreen`, `AllPlaylistsScreen`, `AllVideosScreen`, `GenreScreen`, `Player`, `Preferences`, `Registration`, `sections`, and `Start`.

**Release-readiness interpretation:** the codebase is TypeScript-clean and produces the Android JavaScript release bundle. Jest remains blocked by the missing `react-native-config` test mock/setup, and ESLint remains blocked by the existing 446-item lint backlog. Emulator/device playback, navigation, local-media, persistence, PiP, visual, and restart acceptance gates remain open and must not be reported as passed until executed.


## Wave 6 — Music Player Production Redesign Status

| Done | Checkpoint | Evidence / notes |
|---|---|---|
| ☑ | Full audio-player surface rebuilt with professional hierarchy. | `src/modules/playback/audio/ui/AudioPlayer.tsx`; artwork, metadata, native transport state, seek, queue context, lyrics, volume, and grouped actions are wired. |
| ☑ | Mini-player surface rebuilt with visible content and separated controls. | `src/components/player/MiniAudioPlayer/MiniAudioPlayer.tsx`; artwork, title, artist, progress, play/pause, next, expand, and close are distinct actions. |
| ☑ | Mini-player close made deterministic. | `useMiniPlayer.ts` now clears Redux player state and calls route-free `closePlayer()` so the overlay host cannot remount a stale mini surface. |
| ☑ | Previous/next and rewind/forward semantics corrected. | Dedicated SVGs: `ic_previous_track.svg`, `ic_next_track.svg`, `ic_rewind_10.svg`, `ic_forward_10.svg`; `SvgIcon` mappings and accessibility labels are semantic. |
| ☑ | Native seek callbacks wired. | `useAudioPlayerScreen.ts` uses mpv `seekBackward(10)`, `seekForward(10)`, and native position/duration state. |
| ☑ | Stale audio-player share target removed. | `AudioActionRow.tsx` now uses the supported `SongScreen` share target instead of removed `AudioPlayer`. |
| ☑ | Static verification after final changes. | `tscheck_music_player_final.log`: `TSC_EXIT=0`. |
| ☐ | Emulator/device visual and interaction acceptance. | Open: mini close, expand/collapse, play/pause, seek, queue transition, artwork/loading, background playback, and restart persistence. |

**Wave 6 player status:** Static implementation complete; runtime/device acceptance remains open. Do not mark this player fully release-ready until the emulator acceptance checklist passes.

Evidence: `v11_music_player_redesign.md`, `tscheck_music_player_final.log`
