# SIMBA Mobile App — v11 Manus Major Overhaul Specification

**Document status:** Expanded draft for manual review  \
**Prepared by:** Manus AI  \
**Date:** 20 August 2026  \
**Target release assumption:** 30 September 2026 (assumption; confirm with product)  \
**Program structure:** 8 waves, 40 phases, 400 checkable steps  \
**Implementation status:** Documentation only; application code is not changed by this document

## 1. Why this is a major overhaul

The previous document described priorities, but it did not provide enough delivery structure for a major product overhaul. This version treats v11 as a coordinated program of work across architecture, UI, UX, navigation, local media, personal features, playback, lifecycle, quality, and release packaging.

The current app should be treated as **approximately 2% manager-visible product completion**, even though the repository contains many screens and substantial code. That judgment is understandable when visible flows contain placeholders, navigation is not yet organized, player behavior is inconsistent, personal features are not verified end-to-end, lists contain inconsistent patterns, and release gates are failing. The goal of this program is not to inflate the percentage by counting files. The goal is to create a product that visibly and measurably earns a midpoint milestone.

> **Major-overhaul rule:** A screen counts only when its entry path, data, loading state, error state, actions, persistence, and release behavior are coherent.

## 2. v11 midpoint definition

The requested outcome is that, after this overhaul stage, the app should **feel meaningfully 50% done**. This document defines that milestone as a product-quality gate rather than a line-count estimate.

The midpoint is earned only when the following are demonstrable:

| Midpoint area | Required user-visible outcome |
|---|---|
| Authentication | A real user can launch, sign in, recover from errors, remain signed in, and sign out cleanly |
| Home | Home has a clear hierarchy, no unwanted bottom tabs, working Recent content, and intentional navigation |
| Local media | A user can add local files/folders through Settings and view local audio/video in separated sections with filters and sorting |
| Personal actions | Follow and bookmark actions work from relevant content surfaces and appear correctly in Profile/Settings destinations |
| Content areas | Movies, Podcasts, Music, and core detail screens use consistent architecture, FlatList behavior, and working actions |
| Settings/Profile | Visible items are functional, clearly unavailable, or removed; no decorative dead controls remain on release paths |
| Playback | Audio and video use a shared data contract but separate queues/playlists, with reliable core controls and recovery states |
| Continuity | Mini player works; supported PiP behavior works; resume and lifecycle transitions do not lose the active item |
| Quality | Typecheck, tests for core journeys, production-source lint, and at least one release build are green |

The remaining work after the midpoint is not “cleanup.” It includes advanced media controls, platform parity, deeper performance work, more complete offline behavior, store hardening, and final release validation.

## 3. Program waves

| Wave | Name | Primary outcome | Phases |
|---|---|---|---:|
| Wave 0 | Control, baseline, and release truth | Scope, evidence, route map, state ownership, and platform baseline | 5 |
| Wave 1 | Architecture and visual foundation | Folder contract, navigation shell, tokens, primitives, and UI audit | 5 |
| Wave 2 | Home and local media foundation | Recent, local sources, media sections, filters, and sorting | 5 |
| Wave 3 | Content areas and Settings hub | Movies, Podcasts, Music, details, and internal Settings navigation | 5 |
| Wave 4 | Auth, Profile, Settings, and device state | Working personal/account/settings journeys and permissions | 5 |
| Wave 5 | Playback core overhaul | Shared player contract, AudioPlayer, VideoPlayer, recovery, separate queues | 5 |
| Wave 6 | Playback continuity and advanced media | Mini player, PiP, tracks, resume, lifecycle, downloads | 5 |
| Wave 7 | Quality, packaging, and release candidate | FlatList cleanup, tests, lint, builds, and midpoint demonstration | 5 |
| **Total** | **Major v11 overhaul** | **A verifiable product milestone** | **40** |

Each phase contains **10 checkable steps**. This creates 400 small pieces of evidence rather than 40 vague promises. The phase list is intentionally long because a major overhaul needs observable intermediate outcomes.

## 4. Architecture decisions

The screen contract remains: one folder per substantial screen, one public `index.tsx`, and co-located `components`, `hooks`, `related`, `styles`, and `types` where justified. `index.tsx` is a composition root, not a dumping ground for styles, API calls, repeated cards, parsing, or unrelated state.

The list contract is equally strict. Primary collections use one intentional `FlatList` or a justified `SectionList`, stable domain keys, typed renderers, integrated loading/error/empty/offline states, guarded pagination, and refresh without destroying cached content. A `ScrollView` wrapping a virtualized list requires written justification.

The navigation contract removes the persistent bottom-tab presentation from Home. Secondary destinations are initially organized through an internal Settings hub. A later Home section can expose selected areas after product discussion; it is deliberately not part of the first implementation pass.

The media contract uses a shared typed playback entry for source metadata and navigation, but **audio and video playlists are separate**. Mixed audio/video playlists are not a v11 product behavior. A user opening an audio item enters the audio queue; a user opening a video item enters the video queue. Queue migration from any previous mixed state must be explicit and tested.

### 4.1 Provenance and semantic media-kind contract — priority decision

Every durable media object and every playback-related payload must carry an explicit provenance and semantic kind contract. This is a priority dependency for the later badge system, filtering, recents, playlists, playback routing, and offline/local-file reconciliation; it must not be reconstructed from a URI extension or a screen label at render time.

| Field | Canonical values | Purpose |
|---|---|---|
| `source` | `local` or `api` | Coarse provenance used for badges, source filtering, persistence, and local-file reconciliation. |
| `type` | `audio`, `music`, `podcast`, `audiobook`, `radio`, `video`, `movie`, `live-tv`, `archive-audio`, or `archive-video` | Product-facing semantic kind used for labels, badges, content-area grouping, and analytics. |
| `mediaType` | `audio` or `video` | Playback lane used to enforce separate queues and select the correct player. |
| `provider` | Optional provider identifier such as `jamendo`, `iptv`, `podcast-index`, `librivox`, or `internet-archive` | Preserves catalog detail without overloading the stable `source` field. |

`source` is intentionally not a provider hostname. Existing remote-host values must migrate to `provider` or another explicitly named origin-detail field. `type` is more specific than the playback lane whenever the source can identify the content category. The `mediaType` lane remains mandatory for queue safety even when `type` is specific. Local scanners default to `source: 'local'`; API adapters normalize their items to `source: 'api'` and a provider-specific `type` before they reach recents, bookmarks, playlists, or players.

The canonical implementation lives in `src/types/media.ts`. Durable state must preserve these fields when an item moves through local scanning, linked-folder rescans, Recent, Follow, Bookmark, playlist persistence, queue conversion, download metadata, and playback position updates. Missing legacy metadata must be normalized at the boundary with an explicit fallback, never silently inferred in badge components. This decision is a **priority migration item** before the W4-P21–P25 account/settings work is treated as complete.

## 5. Local media product behavior

Local files are added through Settings rather than hidden inside a player-only flow. The user can link a folder or select local media according to platform capabilities. The app classifies and displays local content in separate sections such as **Local Movies**, **Local Music**, and **Local Podcasts/Audio**, with an optional All Local Media view only when it helps discovery.

The local media surface must include at least a **Video filter**, an **Audio filter**, and deterministic sorting by **Newest**, **Size**, and **Name**. It must handle permissions, rescans, duplicates, missing folders, unsupported extensions, empty states, and offline use. The classification model must not rely solely on the visual label; it should derive media type from validated metadata and file capabilities where possible. A linked folder is a durable media source record, not merely a string path: rescans must preserve source identity, update changed entries, remove stale entries safely, and keep Recent, Bookmark, playlist, and playback references resolvable even when a file temporarily disappears.

## 6. Personal features

Recent, Follow, and Bookmark are treated as product features rather than isolated reducers. Recent must update on open and progress, restore playback position, deduplicate entries, and handle missing files. Follow and Bookmark must have stable identities, shared selectors, persistence, rollback behavior on failure, and visible destinations in Profile or Settings. Their stored records must retain the canonical `source`, `type`, `mediaType`, and optional `provider` fields so badges and routing remain correct after a local folder is rescanned or an API item is reopened from history.

The implementation must not advertise actions that only mutate local temporary state. If a server-backed action is unavailable offline, the UI must say so and preserve a recoverable state rather than pretending the action succeeded permanently.

## 7. Player and UX overhaul

AudioPlayer and VideoPlayer must be rebuilt around explicit state transitions: preparing source, initializing native playback, loading metadata, ready, playing, paused, buffering, ended, failed, and recovering. The UI should be calm and informative instead of childish, blank, or overloaded with decorative controls.

The mini player must have one owner, a documented visibility policy, working close/dismiss semantics, correct play/pause, correct queue actions, and correct expansion into the full-screen player. PiP must distinguish in-app compact behavior from platform/global PiP and must not show a button for unsupported behavior.

### 7.1 Player production acceptance standard

The AudioPlayer and VideoPlayer are release-critical surfaces. They must not be treated as complete because the screen renders, a button has an onPress handler, or a reducer changes state. A player control is accepted only when the requested intent is sent to the native mpv bridge, the native event/property state confirms the resulting state, Redux and the visible UI converge on that confirmed state, and failure produces an actionable recovery message.

The player experience must feel deliberate and professional: a clear visual hierarchy, restrained controls, stable touch targets, meaningful labels, no decorative dead controls, no duplicate or contradictory state, and no feature exposed before its platform support and failure behavior are known. “Perfect” in this plan means **complete against the acceptance matrix and verified on the supported platform matrix**, not an untestable promise of zero defects.

| Acceptance area | Release requirement |
|---|---|
| Native-confirmed transport | Play, pause, stop, seek, previous, next, replay, volume, mute, speed, repeat, and shuffle must reconcile with native mpv state and visible Redux state. |
| Queue and transitions | The active media lane is explicit; the explicit queue is consumed before the remaining playlist; transitions preserve provenance, resume metadata, and route context; audio never enters a video lane and video never enters an audio lane. |
| Loading and recovery | Preparing, initializing, loading, ready, playing, paused, buffering, ended, failed, and recovering states have distinct UI, disabled/enabled controls, and actionable copy. |
| Track continuity | Subtitle/audio tracks refresh after every source load, selected tracks and visibility are reapplied when supported, and track failures do not leave stale controls. |
| UI/UX quality | Controls have stable touch targets, accessible labels, coherent hierarchy, no clipping or overlap, no unexplained placeholders, and no visible feature that is not wired end-to-end. |
| Lifecycle | Navigation, backgrounding, rotation, interruption, restart, sign-out, mini-player expansion/dismissal, and supported PiP transitions preserve or deliberately terminate playback according to documented policy. |
| Local/remote/offline | Local files, remote streams, downloaded paths, missing sources, permission denial, unsupported media, and offline fallback each show the correct state and recovery path. |
| Verification gate | Full TypeScript, lint, production build, reducer/contract tests, and target-device playback journeys must be recorded before W5/W6 player phases are marked Done. |

**Player completion rule:** W5-P27 through W5-P30 and the applicable W6 continuity phases remain **In progress** or **Ready for verification** until this matrix has evidence for both audio and video. Any control that cannot be confirmed through the native bridge must be hidden, disabled with an explanation, or documented as platform-deferred; it must not remain as a misleading decorative feature.

## 8. Progress accounting

The tracker uses three separate measurements:

| Measure | Meaning |
|---|---|
| Engineering phase completion | Percentage of the 40 phases whose checkable steps and exit evidence are complete |
| Verified completion | Percentage of completed phases that passed technical/manual verification rather than only being implemented |
| User-visible milestone | Whether the midpoint journey is coherent enough to demonstrate to a manager or stakeholder |

The team must not report 50% merely because 20 phases have code changes. The v11 midpoint is earned when the Wave 7 midpoint demonstration passes the required user journeys. If implementation reaches 50% but verification is poor, the tracker should show that honestly.

> **Denominator rule:** Cross-cutting implementation notes, player acceptance matrices, manager checklists, and execution-batch evidence may be added as supplemental documentation, but they must not create, renumber, or expand the canonical 40 phases and 400 checkable steps. The tracker must label those rows as supplemental and report them separately from canonical phase completion.

## 9. Detailed waves and phases

## Wave 0: Control, baseline, and release truth

**Wave objective:** Stop scope drift, protect current work, and establish measurable evidence before refactoring.

**Priority:** P0

**Wave gate:** Every phase in this wave must have its exit evidence recorded. A wave is not complete when code merely compiles; the user journey named by the wave must be demonstrated.

### W0-P01 — Scope lock and product truth

**Objective:** Define the v11 release boundary and convert manager feedback into observable outcomes.

**Checkable steps:**
- [ ] Write the v11 release objective in one paragraph.
- [ ] Confirm the target release date and Android/iOS scope.
- [ ] List the user journeys that must work for the midpoint milestone.
- [ ] Mark every existing route as release-critical, secondary, hidden, or deferred.
- [ ] Record the definition of “50% product-ready” for this overhaul.
- [ ] Create a decision log for unresolved mini-player and PiP semantics.
- [ ] Create a defect taxonomy for UI, UX, data, native, and release problems.
- [ ] Identify screens that must not be advertised before verification.
- [ ] Assign an owner to every P0 wave gate.
- [ ] Review and approve this scope before code refactoring begins.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W0-P02 — Working-tree protection and repository checkpoint

**Objective:** Protect current uncommitted MusicScreen and navigation work before the major overhaul.

**Checkable steps:**
- [ ] Capture the current git status.
- [ ] Create a named checkpoint branch or commit for the current state.
- [ ] Record the current modified and deleted files.
- [ ] Confirm no unrelated desktop changes are included in the checkpoint.
- [ ] Save the current TypeScript result.
- [ ] Save the current Jest result including the auth startup failure.
- [ ] Save the current ESLint result.
- [ ] Save the current Android release-build result.
- [ ] Document how to restore the checkpoint.
- [ ] Require every v11 batch to remain independently reversible.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W0-P03 — Route and authentication inventory

**Objective:** Make the actual launch-to-page route graph explicit.

**Checkable steps:**
- [ ] Extract every RootNavigator route into an inventory.
- [ ] Map Splash, Login, and direct Home/Library root transitions.
- [ ] Map every route that requires authentication.
- [ ] Map every route reachable from shared-file deep links.
- [ ] Map sign-out behavior from Home.
- [ ] Map sign-out behavior from nested routes.
- [ ] Map back behavior from full-screen players.
- [ ] Map mini-player visibility by root route.
- [ ] Mark routes with missing or placeholder entry points.
- [ ] Create a route smoke-test sheet from the inventory.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W0-P04 — State and data ownership audit

**Objective:** Stop contradictory data flows between route params, Redux, services, and native mpv.

**Checkable steps:**
- [ ] Inventory player slice fields and reducers.
- [ ] Inventory session, recent, bookmark, follow, download, and settings state.
- [ ] Inventory player route parameter shapes.
- [ ] Inventory native mpv commands and events.
- [ ] Map each player value to one source of truth.
- [ ] Identify duplicated position and duration polling.
- [ ] Identify duplicated current-item or queue representations.
- [ ] Identify screen-local state that should be domain state.
- [ ] Record all persistence whitelists and retention limits.
- [ ] Approve the shared data-flow map before player refactoring.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W0-P05 — Release and platform baseline

**Objective:** Establish the non-negotiable build and device baseline.

**Checkable steps:**
- [ ] Confirm the Android package identity and current version.
- [ ] Confirm the iOS bundle identity and current version.
- [ ] Document supported Android API and ABIs.
- [ ] Document supported iOS versions and device classes.
- [ ] Record native mpv library requirements.
- [ ] Record required permissions and why each is needed.
- [ ] Verify release signing is not production-ready yet.
- [ ] Verify release minification/ProGuard decision is pending.
- [ ] Create a clean-build checklist for Android and iOS.
- [ ] Define the minimum device matrix for every future wave gate.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

## Wave 1: Architecture and visual foundation

**Wave objective:** Create the folder contract, navigation shell, theme rules, reusable components, and UI quality bar.

**Priority:** P0

**Wave gate:** Every phase in this wave must have its exit evidence recorded. A wave is not complete when code merely compiles; the user journey named by the wave must be demonstrated.

### W1-P06 — Screen folder contract

**Objective:** Adopt one public `index.tsx` entry point with co-located responsibilities.

**Checkable steps:**
- [ ] Write the folder contract in the repository documentation.
- [ ] Define when a screen needs components, hooks, related, styles, and types.
- [ ] Define import rules for navigation.
- [ ] Ban navigation imports from internal child files.
- [ ] Ban API calls from presentational components.
- [ ] Ban large style objects in index.tsx.
- [ ] Ban repeated list-row markup in index.tsx.
- [ ] Define naming rules for screen-local types.
- [ ] Define circular-import prevention rules.
- [ ] Create a review checklist for every migrated screen.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W1-P07 — Navigation shell without bottom tabs

**Objective:** Replace the Home tab-first mental model with a clear authenticated shell.

**Checkable steps:**
- [ ] Identify the current bottom-tab mount point.
- [ ] Design the replacement Home header/menu affordance.
- [ ] Define the Settings hub entry point.
- [ ] Define the MiniAudioPlayer overlay placement without tabs.
- [ ] Define root-stack route transitions.
- [ ] Define the authenticated shell background and safe-area behavior.
- [ ] Remove assumptions that Home always sits above a tab bar.
- [ ] Test Home on compact portrait devices.
- [ ] Test Home on large portrait devices.
- [ ] Approve the new shell before removing UI code.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W1-P08 — Theme and visual tokens

**Objective:** Correct visual inconsistency before screen-by-screen UI work.

**Checkable steps:**
- [ ] Inventory current theme tokens.
- [ ] Inventory mockup bronze/glass tokens.
- [ ] Choose canonical background, surface, accent, text, border, and state tokens.
- [ ] Define dark-mode values.
- [ ] Define light-mode values.
- [ ] Define spacing and radius scales.
- [ ] Define typography variants for titles, metadata, labels, and states.
- [ ] Define elevation, overlay, and focus tokens.
- [ ] Remove raw color literals from priority screens.
- [ ] Create visual snapshots for the canonical tokens.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W1-P09 — Reusable UI primitives

**Objective:** Create consistent building blocks for the overhaul.

**Checkable steps:**
- [ ] Audit AppText, AppButton, AppView, and existing feedback components.
- [ ] Define button loading and disabled behavior.
- [ ] Define row, card, section-header, divider, and badge primitives.
- [ ] Define skeleton/loading primitives.
- [ ] Define empty, error, offline, and retry primitives.
- [ ] Define icon sizing and accessibility labels.
- [ ] Define touch target minimums.
- [ ] Define focus and pressed states.
- [ ] Migrate one reference screen to the primitives.
- [ ] Verify primitives in dark and light themes.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W1-P10 — UI/UX audit and correction backlog

**Objective:** Turn “childish” or unfinished visual behavior into prioritized work.

**Checkable steps:**
- [ ] Capture the current Home screen.
- [ ] Capture the current Movies screen.
- [ ] Capture the current Podcasts screen.
- [ ] Capture the current Music screen.
- [ ] Capture the current Settings/Profile surfaces.
- [ ] Capture the current AudioPlayer and VideoPlayer.
- [ ] Mark placeholder text and decorative controls.
- [ ] Mark inconsistent spacing, typography, and color usage.
- [ ] Mark confusing loading, empty, and error states.
- [ ] Convert every finding into a tracker item with acceptance criteria.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

## Wave 2: Home and local media foundation

**Wave objective:** Make Home useful: recent media, local files, media-type sections, filters, sorting, and personal actions.

**Priority:** P0

**Wave gate:** Every phase in this wave must have its exit evidence recorded. A wave is not complete when code merely compiles; the user journey named by the wave must be demonstrated.

### W2-P11 — Home shell and information hierarchy

**Objective:** Make Home a purposeful, single-surface starting point.

**Checkable steps:**
- [ ] Remove the persistent bottom-tab presentation from Home.
- [ ] Define the Home header and primary actions.
- [ ] Define the hierarchy of greeting, hero, recent, and utility content.
- [ ] Define loading and offline behavior for Home.
- [ ] Define the empty first-run Home state.
- [ ] Define safe-area and scroll behavior.
- [ ] Keep the first Home viewport focused on useful actions.
- [ ] Remove routes that are not ready from prominent Home controls.
- [ ] Add analytics-free local diagnostics for Home state transitions.
- [ ] Verify Home navigation to Settings and playback.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W2-P12 — Recent media model and persistence

**Objective:** Fix Recent as a dependable user-facing feature.

**Checkable steps:**
- [ ] Define the recent-entry identity key.
- [ ] Define title, URI, media type, artwork, duration, and position fields.
- [ ] Define update-on-open behavior.
- [ ] Define update-on-progress behavior.
- [ ] Define completion and replay behavior.
- [ ] Define missing-file behavior for recent entries.
- [ ] Define retention and maximum recent count.
- [ ] Define deduplication behavior.
- [ ] Define migration behavior for older persisted entries.
- [ ] Write reducer/controller tests for recent updates.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W2-P13 — Recent Home presentation and resume

**Objective:** Make Recent cards useful rather than decorative.

**Checkable steps:**
- [ ] Render Recent from persisted state.
- [ ] Show distinct audio and video metadata.
- [ ] Show a clear Continue action when a saved position exists.
- [ ] Show a clear Open/Play action for new items.
- [ ] Show a missing-file state with a remove action.
- [ ] Use one intentional horizontal list or a justified section.
- [ ] Prevent blanking Recent during refresh.
- [ ] Use stable keys and typed card props.
- [ ] Verify resume navigation sends the correct playback contract.
- [ ] Verify Recent after app restart.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W2-P14 — Local media indexing and Settings entry

**Objective:** Allow users to add local files/folders through Settings.

**Checkable steps:**
- [ ] Define the local-folder linking model.
- [ ] Define file permission and revocation states.
- [ ] Add the Settings entry for local media sources.
- [ ] Implement a folder/file picker path appropriate to each platform.
- [ ] Persist linked source metadata safely.
- [ ] Define scan progress and cancellation.
- [ ] Define duplicate-file handling.
- [ ] Define unsupported-file handling.
- [ ] Define missing-folder and permission-revoked handling.
- [ ] Add a visible local-media status and rescan action.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W2-P15 — Local media sections, filters, and sorting

**Objective:** Present local media as organized content sections, not one mixed dump.

**Checkable steps:**
- [ ] Create a Local Movies section for video files classified as movies.
- [ ] Create a Local Podcasts/Audio section for audio files classified as audio.
- [ ] Create a Local Music section or equivalent audio grouping.
- [ ] Add an All Local Media view only when useful.
- [ ] Add a Video filter.
- [ ] Add an Audio filter.
- [ ] Add a Newest sort.
- [ ] Add a Largest/Size sort.
- [ ] Add a Name sort with deterministic casing behavior.
- [ ] Verify filters and sorting preserve stable list identity and pagination behavior.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

## Wave 3: Content areas and Settings hub

**Wave objective:** Make Movies, Podcasts, Music, details, and the internal Settings navigation coherent and reachable.

**Priority:** P0

**Wave gate:** Every phase in this wave must have its exit evidence recorded. A wave is not complete when code merely compiles; the user journey named by the wave must be demonstrated.

### W3-P16 — Movies browse overhaul

**Objective:** Make Movies consistent with the folder and list standards.

**Checkable steps:**
- [ ] Migrate MoviesScreen to the folder contract.
- [ ] Separate screen composition from child components.
- [ ] Move styles into a theme-aware styles folder.
- [ ] Move route/config/adapters into related.
- [ ] Move screen-local types into types.
- [ ] Use one primary FlatList or justified SectionList.
- [ ] Implement loading, empty, error, offline, and retry states.
- [ ] Implement stable keys and pagination guards.
- [ ] Verify filters and sort behavior.
- [ ] Verify movie-card navigation to MovieDetail and VideoPlayer.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W3-P17 — Podcasts browse overhaul

**Objective:** Make Podcasts consistent, readable, and actionable.

**Checkable steps:**
- [ ] Migrate PodcastsScreen to the folder contract.
- [ ] Separate podcast rows, headers, and states into components.
- [ ] Move styles into a styles folder.
- [ ] Move section/config data into related.
- [ ] Move types into types.
- [ ] Use one primary FlatList or justified SectionList.
- [ ] Implement loading, empty, error, offline, and retry states.
- [ ] Implement stable keys and pagination guards.
- [ ] Verify follow actions from the list.
- [ ] Verify podcast detail and episode playback navigation.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W3-P18 — Music browse overhaul

**Objective:** Complete the MusicScreen architecture and behavior reference.

**Checkable steps:**
- [ ] Protect the current MusicScreen refactor checkpoint.
- [ ] Remove obsolete duplicate MusicScreen files after verification.
- [ ] Keep the composition root small.
- [ ] Keep BrowseLayout and data provider responsibilities explicit.
- [ ] Keep TrackCard and list states isolated.
- [ ] Verify API order and pagination behavior.
- [ ] Verify search and genre filtering.
- [ ] Verify refresh without blanking content.
- [ ] Verify track navigation to AudioPlayer.
- [ ] Document the pattern for future screens.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W3-P19 — Detail screens and content actions

**Objective:** Make detail pages consistent with browse screens and player contracts.

**Checkable steps:**
- [ ] Inventory movie, podcast, music, album, artist, show, audiobook, and archive detail routes.
- [ ] Define common detail header behavior.
- [ ] Define artwork loading and fallback behavior.
- [ ] Define primary action hierarchy.
- [ ] Wire follow/unfollow where applicable.
- [ ] Wire bookmark/unbookmark where applicable.
- [ ] Wire add-to-playlist only for the correct media type.
- [ ] Wire play/open actions with typed playback data.
- [ ] Add missing, unavailable, and offline detail states.
- [ ] Verify back navigation and mini-player behavior.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W3-P20 — Settings navigation hub

**Objective:** Make secondary content reachable before later Home sections are designed.

**Checkable steps:**
- [ ] Create grouped Settings navigation data.
- [ ] Add Library and playback group.
- [ ] Add Discover group.
- [ ] Add Offline and local media group.
- [ ] Add Personal and account group.
- [ ] Add Application preferences group.
- [ ] Use consistent row components and icons.
- [ ] Add descriptions for complex destinations.
- [ ] Hide destinations that are not release-ready.
- [ ] Verify every visible row reaches a working screen or explicit empty state.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

## Wave 4: Auth, Profile, Settings, and device state

**Wave objective:** Make every visible account, profile, preference, permission, offline, and device action honest and functional.

**Priority:** P0

**Wave gate:** Every phase in this wave must have its exit evidence recorded. A wave is not complete when code merely compiles; the user journey named by the wave must be demonstrated.

### W4-P21 — Login and auth UX overhaul

**Objective:** Make the first user journey stable and understandable.

**Checkable steps:**
- [ ] Audit login form fields and validation.
- [ ] Define loading and disabled-submit behavior.
- [ ] Define invalid-credential copy.
- [ ] Define offline-auth behavior.
- [ ] Define Google Sign-In success and failure states.
- [ ] Define expired-session behavior.
- [ ] Define account picker/revoke behavior.
- [ ] Add accessible labels and focus order.
- [ ] Verify keyboard and safe-area behavior.
- [ ] Test cold start, login, logout, and restore flows.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W4-P22 — Profile screen overhaul

**Objective:** Make every visible Profile action either functional or intentionally unavailable.

**Checkable steps:**
- [ ] Inventory every Profile row and button.
- [ ] Classify each item as functional, pending, or remove.
- [ ] Wire user identity and account metadata.
- [ ] Wire profile refresh behavior.
- [ ] Wire account settings navigation.
- [ ] Wire history/bookmarks/followed content links.
- [ ] Wire downloads/local media links where appropriate.
- [ ] Implement sign-out confirmation and cleanup.
- [ ] Add loading, offline, and error states.
- [ ] Verify Profile on fresh, restored, and expired sessions.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W4-P23 — Settings functionality audit

**Objective:** Make Settings a working control center rather than a visual catalog.

**Checkable steps:**
- [ ] Inventory every Settings row and toggle.
- [ ] Connect playback preferences to the actual player.
- [ ] Connect subtitle preferences to subtitle behavior.
- [ ] Connect theme preferences to the theme provider.
- [ ] Connect local media settings to source/index services.
- [ ] Connect download preferences to download behavior.
- [ ] Connect notification/media-session settings where supported.
- [ ] Implement reset-to-defaults safely.
- [ ] Show persisted state after restart.
- [ ] Hide or label unsupported settings instead of pretending they work.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W4-P24 — Follow and bookmark system

**Objective:** Fix personal actions across Home, browse, detail, and Profile.

**Checkable steps:**
- [ ] Define bookmark identity and media-type fields.
- [ ] Define follow identity and provider fields.
- [ ] Create shared selectors for bookmarked items.
- [ ] Create shared selectors for followed items.
- [ ] Wire bookmark actions on detail screens.
- [ ] Wire bookmark actions on list cards where appropriate.
- [ ] Wire follow actions for podcasts/shows/artists where appropriate.
- [ ] Show optimistic state only with rollback on failure.
- [ ] Handle removed or unavailable personal items.
- [ ] Verify persistence and Profile presentation after restart.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W4-P25 — Permissions, offline, and local-state UX

**Objective:** Make device and offline behavior explicit and recoverable.

**Checkable steps:**
- [ ] Inventory file, notification, location, media, and storage permissions.
- [ ] Map first-request timing for every permission.
- [ ] Define denied and permanently-denied copy.
- [ ] Define offline banner behavior.
- [ ] Define cached-content behavior.
- [ ] Define local-file availability behavior.
- [ ] Define download failure and retry behavior.
- [ ] Define permission recovery links to Settings.
- [ ] Verify app behavior after permissions are revoked externally.
- [ ] Document privacy-sensitive state handling.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

## Wave 5: Playback core overhaul

**Wave objective:** Unify playback data and make AudioPlayer, VideoPlayer, loading, errors, and separate queues production-grade.

**Priority:** P0

**Wave gate:** Every phase in this wave must have its exit evidence recorded. A wave is not complete when code merely compiles; the user journey named by the wave must be demonstrated.

### W5-P26 — Shared playback contract

**Objective:** Unify source, queue, resume, and route data for audio and video.

**Checkable steps:**
- [ ] Define the canonical PlaybackEntry type.
- [ ] Map local file sources into the type.
- [ ] Map remote content sources into the type.
- [ ] Map downloaded content sources into the type.
- [ ] Map playlist context into the type.
- [ ] Map resume position into the type.
- [ ] Map artwork and display metadata into the type.
- [ ] Map origin route and autoplay intent into the type.
- [ ] Update route param types.
- [ ] Add contract tests for every player entry point.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W5-P27 — Audio player UI and control overhaul

**Objective:** Make audio playback clear, calm, and reliable.

**Checkable steps:**
- [ ] Audit the current AudioPlayer layout.
- [ ] Define artwork and fallback treatment.
- [ ] Define title/artist/album hierarchy.
- [ ] Define primary play/pause treatment.
- [ ] Define progress and duration behavior.
- [ ] Define previous/next behavior.
- [ ] Define repeat and shuffle behavior.
- [ ] Define queue access behavior.
- [ ] Define loading and error surfaces.
- [ ] Verify all controls against native-confirmed state.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W5-P28 — Video player UI and control overhaul

**Objective:** Make video playback feel production-ready.

**Checkable steps:**
- [ ] Audit the current VideoPlayer composition.
- [ ] Define the video surface loading state.
- [ ] Define header, title, back, and action hierarchy.
- [ ] Define transport controls and hide/show behavior.
- [ ] Define seek bar markers and metadata readiness.
- [ ] Define volume and speed controls.
- [ ] Define audio and subtitle panel presentation.
- [ ] Define playlist panel presentation.
- [ ] Define rotate and PiP action states.
- [ ] Verify the complete local and remote playback journey.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W5-P29 — Loading, error, and recovery controller

**Objective:** Remove blank, childish, and non-actionable player states.

**Checkable steps:**
- [ ] Define source-validation states.
- [ ] Define native-initialization states.
- [ ] Define metadata-loading states.
- [ ] Define buffering states.
- [ ] Define retry states.
- [ ] Define missing-source errors.
- [ ] Define permission errors.
- [ ] Define unsupported-codec errors.
- [ ] Define user-recovery actions.
- [ ] Test state transitions without visual flicker or stale controls.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W5-P30 — Separate audio and video playlists

**Objective:** Remove mixed audio/video playlist ambiguity.

**Checkable steps:**
- [ ] Define AudioPlaylistEntry and VideoPlaylistEntry boundaries.
- [ ] Prevent audio items from entering a video playlist.
- [ ] Prevent video items from entering an audio playlist.
- [ ] Define queue creation rules from browse cards.
- [ ] Define queue creation rules from details.
- [ ] Define queue persistence and migration.
- [ ] Define next/previous behavior within each media type.
- [ ] Define shuffle and repeat per media type.
- [ ] Update mini-player and full-screen player queue data.
- [ ] Test migration from any existing mixed playlist state.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

## Wave 6: Playback continuity and advanced media

**Wave objective:** Finish mini player, PiP, tracks, resume, background behavior, downloads, and lifecycle continuity.

**Priority:** P1

**Wave gate:** Every phase in this wave must have its exit evidence recorded. A wave is not complete when code merely compiles; the user journey named by the wave must be demonstrated.

### W6-P31 — Mini player overhaul

**Objective:** Make the compact player’s data and controls work everywhere they are shown.

**Checkable steps:**
- [ ] Define the single mini-player owner.
- [ ] Define allowed root-stack routes.
- [ ] Hide the mini player on full-screen players.
- [ ] Wire body tap to the correct player.
- [ ] Wire play/pause to confirmed state.
- [ ] Wire progress and duration.
- [ ] Wire next/previous to the media-specific queue.
- [ ] Implement close/dismiss semantics.
- [ ] Handle source failures without orphaned overlays.
- [ ] Test route changes, rotation, and app restart.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W6-P32 — In-app PiP and global PiP

**Objective:** Complete compact and platform-level picture-in-picture behavior.

**Checkable steps:**
- [ ] Inventory current PiP buttons and native APIs.
- [ ] Choose supported platforms and media types.
- [ ] Define entry preconditions.
- [ ] Define exit and return-to-app behavior.
- [ ] Preserve current media and position.
- [ ] Handle orientation transitions.
- [ ] Handle audio focus and interruptions.
- [ ] Prevent duplicate mini/full-screen overlays.
- [ ] Handle unsupported devices gracefully.
- [ ] Run device-level PiP tests for every supported platform.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W6-P33 — Subtitle, audio-track, and media-control continuity

**Objective:** Make track state survive source transitions correctly.

**Checkable steps:**
- [ ] Normalize native track models.
- [ ] Refresh tracks on file load.
- [ ] Refresh tracks on source changes.
- [ ] Wire internal subtitle selection.
- [ ] Wire external subtitle loading.
- [ ] Wire subtitle visibility.
- [ ] Wire audio-track selection.
- [ ] Persist supported track preferences.
- [ ] Show track-loading and track-error states.
- [ ] Verify track state through rotation, resume, and PiP.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W6-P34 — Resume, background, and interruption behavior

**Objective:** Make playback lifecycle predictable across app and device state changes.

**Checkable steps:**
- [ ] Define save-position cadence.
- [ ] Define save-position behavior on navigation.
- [ ] Define save-position behavior on backgrounding.
- [ ] Define restore-position thresholds.
- [ ] Define completion behavior.
- [ ] Define phone-call/interruption behavior.
- [ ] Define audio-focus loss behavior.
- [ ] Define app-killed behavior.
- [ ] Define sign-out behavior for active playback.
- [ ] Test restart and lifecycle recovery on target devices.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W6-P35 — Downloads and offline playback

**Objective:** Make downloaded media a first-class, type-safe local source.

**Checkable steps:**
- [ ] Normalize download record identity.
- [ ] Show downloads by media type.
- [ ] Wire download progress.
- [ ] Wire pause/resume/cancel.
- [ ] Wire retry after failure.
- [ ] Open completed downloads through the playback contract.
- [ ] Handle deleted or missing downloaded files.
- [ ] Respect retention settings.
- [ ] Expose downloads from Settings/Profile.
- [ ] Test offline playback for audio and video separately.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

## Wave 7: Quality, packaging, and release candidate

**Wave objective:** Remove list slop, recover tests and lint, harden native builds, and validate the release candidate.

**Priority:** P0

**Wave gate:** Every phase in this wave must have its exit evidence recorded. A wave is not complete when code merely compiles; the user journey named by the wave must be demonstrated.

### W7-P36 — FlatList and virtualization cleanup

**Objective:** Remove avoidable list slop from release routes.

**Checkable steps:**
- [ ] Inventory ScrollView and virtualized-list nesting.
- [ ] Inventory index-based keys.
- [ ] Inventory duplicated loading branches.
- [ ] Inventory duplicated empty/error components.
- [ ] Migrate priority browse screens first.
- [ ] Add pagination request guards.
- [ ] Add refresh controls without blanking cached data.
- [ ] Move repeated row markup into components.
- [ ] Measure slow list screens on target devices.
- [ ] Close all P0 list findings before release candidate.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W7-P37 — Automated test recovery and expansion

**Objective:** Make test output trustworthy for core journeys.

**Checkable steps:**
- [ ] Fix the react-native-config Jest setup.
- [ ] Make the authentication-service suite run.
- [ ] Add auth gate tests.
- [ ] Add recent/session reducer tests.
- [ ] Add bookmark/follow tests.
- [ ] Add local media classification tests.
- [ ] Add playlist separation tests.
- [ ] Add player controller tests.
- [ ] Add mini-player visibility tests.
- [ ] Add navigation smoke tests for release-critical routes.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W7-P38 — Lint, type, error boundaries, and observability

**Objective:** Reduce maintainability risk and make failures diagnosable.

**Checkable steps:**
- [ ] Run typecheck after every migration batch.
- [ ] Remove production-source ESLint errors.
- [ ] Review inline-style warnings.
- [ ] Review unused-variable warnings.
- [ ] Add screen-level error boundaries where missing.
- [ ] Normalize user-facing error reporting.
- [ ] Add sanitized player lifecycle diagnostics.
- [ ] Add route and operation context to failures.
- [ ] Verify no secrets or personal data enter logs.
- [ ] Publish the final technical-quality report.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W7-P39 — Native build, signing, and store readiness

**Objective:** Turn the codebase into a deliverable mobile artifact.

**Checkable steps:**
- [ ] Configure protected Android release signing.
- [ ] Verify Android versionCode/versionName policy.
- [ ] Decide and test release minification.
- [ ] Verify mpv native libraries in release packaging.
- [ ] Build and install Android release artifact.
- [ ] Configure iOS release signing and entitlements.
- [ ] Archive and install iOS release artifact.
- [ ] Verify permissions and privacy disclosures.
- [ ] Verify crash reporting and analytics configuration.
- [ ] Document reproducible release commands and artifacts.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.

### W7-P40 — Release candidate and midpoint demonstration

**Objective:** Demonstrate a coherent product milestone instead of counting files.

**Checkable steps:**
- [ ] Run the complete authentication smoke path.
- [ ] Run the Home and Settings smoke path.
- [ ] Run local media add/filter/sort smoke paths.
- [ ] Run Recent/resume smoke paths.
- [ ] Run follow/bookmark smoke paths.
- [ ] Run Movies/Podcasts/Music browse paths.
- [ ] Run separate audio/video playlist paths.
- [ ] Run AudioPlayer/VideoPlayer paths.
- [ ] Run mini-player/PiP paths supported by the platform matrix.
- [ ] Record unresolved defects and decide whether the candidate earns the 50% milestone.

**Exit evidence:** Record changed files, test/build commands, screenshots or recordings where relevant, and unresolved defects before moving the phase to Done.


## 10. Decisions requiring confirmation

The following product decisions affect implementation and should be confirmed before their phases begin:

1. Confirm the exact release date represented by “next month end.”
2. Confirm the Android/iOS platform scope for the midpoint and final release.
3. Confirm whether mini-player Close dismisses the compact UI only or stops playback.
4. Confirm whether sign-out stops active playback and clears the mini player.
5. Confirm the final list of release-critical routes.
6. Confirm whether the Settings hub is transitional or permanent.
7. Confirm the supported platform/media matrix for global PiP.
8. Confirm whether local folder linking is required on both platforms or can be staged.
9. Confirm whether Follow and Bookmark are server-backed, local-first, or hybrid.
10. Confirm whether the midpoint demonstration is intended for internal QA, manager review, or a store-like build.

## 11. Repository references

| Reference | Purpose |
|---|---|
| `App.tsx` | Providers, authentication restoration, deep links, downloads hydration, orientation, and global overlays |
| `src/navigation/RootNavigator.tsx` | Auth gate and route inventory |
| `src/navigation/TabNavigator.tsx` | Existing bottom-tab implementation to be removed from the primary Home experience |
| `src/screens/MusicScreen/index.tsx` | Current folder-oriented and FlatList reference |
| `src/store/rootReducer.ts` | State-domain inventory |
| `src/store/slices/playerSlice.ts` | Playback, queue, playlist, loop, shuffle, equalizer, and sleep-timer state |
| `android/app/build.gradle` | Android version, ABI, signing, minification, and native packaging configuration |
| `app-develop.md` | Historical status notes; superseded as the v11 execution source of truth |

The companion `v11_manus_tracker.md` contains the same 40 phases in operational form with status, owner, evidence, blockers, and acceptance fields.


## Wave 2 execution addendum — Movies and Podcasts architecture/API cleanup

### Execution numbering

The canonical program numbering in this specification is preserved. The current implementation batch is called **Execution Wave 2**, which corresponds to **canonical Wave 3**, specifically **W3-P16 Movies browse overhaul** and **W3-P17 Podcasts browse overhaul** in the tracker. This alias avoids silently renumbering the approved eight-wave program and keeps manager reports comparable.

### API contract decisions

| Area | Validated contract | v11 implementation decision |
|---|---|---|
| Internet Archive movie search | Advanced Search uses `/advancedsearch.php` with `q`, `fl[]`, `rows`, `page`, `output`, and optional `sort[]` parameters. [1] | Keep server-side sorting and pagination in the service; align UI sort keys with the hook and IA sort clauses. |
| Internet Archive movie details | Metadata reads use a single item identifier through `/metadata/{identifier}`. [2] | Keep detail resolution in the service boundary, including file selection and existing retry protection for distributed metadata responses. |
| Podcast Index categories | `/categories/list` returns a `feeds` array containing category `id` and `name` values. [3] [4] | Add `getPodcastCategories()` and a screen hook that uses the API catalog with a static visual fallback. |
| Podcast Index category filtering | The official `cat` query parameter accepts category IDs or names and can be sent to `/podcasts/trending`. [4] [5] | Replace the old free-text category search with `/podcasts/trending?cat={categoryId}`. |
| Podcast Index search | `/search/byterm` supports textual search and a maximum result window but does not provide an arbitrary sort control. [3] [4] | Keep typed search on `/search/byterm`; remove the misleading Podcast sort group and preserve API-returned order. |
| Package requirements | Existing API client, hashing dependency, React hooks, navigation, and React Native FlatList primitives are sufficient for this pass. | No package added. Reassess package needs only in the later native local-file picker phase. |

> **Important:** A category label must not be sent as a free-text search query when the upstream API provides a category filter. The implementation now sends Podcast Index category IDs through the documented `cat` parameter and reserves `/search/byterm` for actual user-entered search text.

### Architecture changes completed in Execution Wave 2

The Movies and Podcasts entry points now follow the v11 index-only composition contract. `MoviesScreen/index.tsx` owns only route/config/provider wiring, while `MoviesContent.tsx` owns the list, loading states, pagination guard, and card composition. `PodcastsScreen/index.tsx` owns category-catalog loading, dynamic config creation, and provider wiring, while `PodcastsContent.tsx` owns the single primary FlatList and state presentation.

The Podcasts browse configuration is now created from the authoritative category catalog. The configuration exposes category filtering and does not claim that Podcast Index supports arbitrary server-side sorting. The category hook keeps a static catalog as a startup/offline fallback so the filter remains usable if the metadata catalog request fails.

The Movies browse configuration now uses the `newest` key expected by the Movies hook instead of the mismatched `recent` key. This makes the “Recently added” control map to the Internet Archive `date desc` request. Runtime filter behavior, device navigation, and final verification remain open until the program-wide verification gate.

### Additional pages/components considered

No additional user-facing page is required for this architecture/API pass. The necessary new boundary is a reusable `usePodcastCategories` hook, plus the extracted `MoviesContent` and `PodcastsContent` composition components. A dedicated Podcast Categories screen is deferred because the category catalog is a filter input, not yet a destination with independent user value.

### Progress and evidence rule

Execution Wave 2 records completed architecture/API steps as checked in the tracker, while runtime verification, device screenshots, follow behavior, and detail/playback navigation remain unchecked. The implementation must not be reported as “verified” until the final build/test/device gate is run after the planned waves.

### References

[1]: https://archive.org/help/aboutsearch.htm "Internet Archive Advanced Search"
[2]: https://archive.org/developers/metadata.html "Internet Archive Item Metadata API"
[3]: https://podcastindex-org.github.io/docs-api/ "Podcast Index API Documentation"
[4]: https://podcastindex-org.github.io/docs-api/pi_api.json "Podcast Index OpenAPI Definition"
[5]: https://github.com/Podcastindex-org/podcast-namespace/blob/main/categories.json "Podcast Namespace Category Definitions"


## Full content-area pipeline addendum

The v11 overhaul is not limited to Movies, Podcasts, Music, and Local Files. The following areas are explicitly in the pipeline and must receive the same architecture, UI/UX, API/data-contract, list-state, navigation, playback, and release-readiness treatment appropriate to their behavior.

| Content area | Pipeline treatment | Planned sequencing |
|---|---|---|
| Movies | Folder-contract refactor, Internet Archive contract, filters/sorts, detail route, video handoff | Execution Wave 2 / canonical W3-P16 |
| Podcasts | Folder-contract refactor, Podcast Index categories, category filtering, search, episode/detail handoff | Execution Wave 2 / canonical W3-P17 |
| Music | Folder-contract refactor, catalog/search/category behavior, audio-only queue, detail/player handoff | Execution Wave 3 / canonical W3-P18 |
| Local Files | Settings source management, permission flow, scan/index model, separated local Movies/Music/Podcasts/Audio, Video/Audio filters, Newest/Size/Name sorting | Execution Wave 3 / canonical W2-P11 through W2-P15 |
| Live TV | Source/channel model, guide or channel list, live playback route, buffering/retry, favorite-channel actions, platform limitations | Content-area pipeline after core local/media foundations |
| Live Radio | Station directory, genre/search filters, live audio route, reconnect behavior, favorites, mini-player continuity | Content-area pipeline after Music/player contract |
| Audiobooks | Book/author/chapter model, chapter list, progress persistence, resume behavior, audio-only queue, download/offline rules | Content-area pipeline after Music/player contract |
| Archives | Archive browsing/search, metadata/detail route, media-type classification, filters, pagination, unsupported-file handling | Content-area pipeline after API and local-media foundations |
| Details and shared routes | Consistent detail shell, related content, follow/bookmark actions, media-type-safe player handoff | Cross-cutting across Waves 3–6 |
| Settings/Profile | Functional source management, preferences, account actions, Follow/Bookmark destinations, permission state, unavailable-item handling | Waves 2 and 4 |

For every content area, the implementation must first identify the authoritative source contract, then establish a screen folder boundary, then implement list and state behavior, then connect the appropriate player or detail route, and finally record device/runtime evidence. “In pipeline” means planned and tracked; it does not mean the area is already implemented or verified.

Live TV and Live Radio must not be treated as decorative cards. They require explicit source availability, buffering/reconnect behavior, platform limitations, and a clear distinction between live streams and downloadable media. Audiobooks must remain audio-only and must not enter a mixed media queue. Archives must classify media safely rather than assuming every archive item is playable.


## All-page detabbed navigation model

The v11 navigation model is **fully detabbed**. Bottom tabs are not a fallback presentation for any page. The authenticated native-stack shell owns all route transitions, while each destination provides its own header, contextual actions, back behavior, and explicit entry links.

| Page family | Navigation rule |
|---|---|
| Home and discovery | Home is the primary landing route. Future content sections and cards open native-stack destinations; they do not recreate a bottom-tab rail. |
| Movies, Podcasts, Music | Each is a standalone stack destination with its own search/filter controls and detail/player handoff. |
| Local Files | Entered from Settings/source management or explicit Library/Local Files actions; no tab is used. |
| Live TV and Live Radio | Standalone native-stack destinations with contextual source/channel controls and player continuity. |
| Audiobooks and Archives | Standalone native-stack destinations with media-specific detail and playback rules. |
| Settings and Profile | Explicitly linked from Home/header/account actions and own their nested destination stacks. |
| Detail and player pages | Remain native-stack routes with reliable back navigation, deep-link support, and media-type-safe handoff. |

The former tab-era route names may remain temporarily for compatibility with existing navigation calls, but they must not render a tab bar or depend on tab-bar height, tab navigator props, or tab-specific safe-area offsets. Any page discovered during inventory is added to this detabbed route map before it is refactored.
