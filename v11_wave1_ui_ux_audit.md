# v11 Wave 1 UI/UX Audit

**Status:** Code-level audit complete; device screenshots and visual verification are intentionally deferred until the final verification wave.

**Scope:** Home, navigation shell, shared primitives, media browsing surfaces, settings/profile entry points, and player surfaces.

> This document records observable implementation findings, not subjective redesign preferences. Every finding must become a later tracker item with a user-visible acceptance criterion.

## 1. Current baseline

The app has a substantial route and component inventory, but the product experience is not yet coherent. Several screens have the requested folder pattern, while Home and some older surfaces still mix composition, styles, static content, and types. The previous bottom-tab mental model also made Home carry navigation responsibility that should belong to Settings and purposeful Home actions.

The Wave 1 reference migration now gives Home a public `index.tsx` entry point with `components/`, `hooks/`, `related/`, `styles/`, and `types/`. The authenticated shell no longer renders a persistent bottom tab bar, and the mini audio player is anchored to the safe-area inset rather than to a retired tab-bar height.

## 2. Findings by category

| ID | Category | Finding | Priority | Acceptance criterion | Planned wave |
|---|---|---|---|---|---|
| UX-001 | Navigation | Bottom tabs exposed too many unfinished destinations from Home. | P0 | Home has no persistent bottom tabs; every surfaced destination has a working entry and back path. | W1/W3 |
| UX-002 | Navigation | Library/Movies/Podcasts/Music access needs an intentional Settings hub and later Home affordance. | P0 | Settings hub links to each approved destination and Home later exposes only verified destinations. | W3 |
| UI-001 | Architecture | Screen entry files can accumulate styles, static content, and domain types. | P0 | Every migrated screen exposes one `index.tsx`; styles, related content, hooks, and types stay local. | W1/W3 |
| UI-002 | Typography | Hard-coded font weights can override the selected font family and create inconsistent hierarchy. | P1 | Priority screens use AppText variants and token-backed families without raw weight overrides. | W1/W3 |
| UI-003 | Controls | Shared controls need consistent loading, disabled, pressed, and minimum touch-target behavior. | P0 | Buttons and icon controls expose deterministic states and meet the 44px touch target rule. | W1/W5 |
| UI-004 | Lists | Home previously used index fallback keys for heterogeneous sections. | P1 | Home sections use stable semantic keys; variable-height sections do not claim an invalid fixed layout. | W1 |
| UI-005 | States | Loading, empty, error, offline, and retry behavior is not consistently specified by screen. | P0 | Each release-critical screen has explicit state designs and retry/recovery behavior. | W2/W3/W5 |
| UI-006 | Content | Placeholder or “coming soon” shelves must not appear as if they are complete product features. | P0 | Deferred features are either hidden, clearly labelled, or replaced by a purposeful empty state. | W2/W3 |
| PLAYER-001 | Mini player | Mini-player close/dismiss and persistence semantics need one shared contract. | P0 | Close, reopen, queue, and full-screen transitions behave consistently from every root route. | W6 |
| PLAYER-002 | Video | Video player controls and lifecycle/PiP behavior require a dedicated overhaul. | P0 | Video playback, controls, pause/resume, orientation, lifecycle, and supported PiP paths pass the final matrix. | W5/W6/W7 |
| PLAYER-003 | Audio | Audio player needs a clearer hierarchy for progress, queue, sleep timer, and recovery. | P0 | Audio player exposes predictable controls, errors, queue separation, and resume state. | W5/W6 |
| DATA-001 | Recent | Recent needs a durable identity and progress-aware persistence model. | P0 | Recent deduplicates entries, restores position, removes missing files safely, and renders on Home. | W2 |
| DATA-002 | Personal | Follow and Bookmark state must have clear ownership and offline behavior. | P0 | Follow/Bookmark actions persist, update all surfaces, and recover after restart or sign-in changes. | W4 |
| MEDIA-001 | Local media | Local files need dedicated Movies, Music, and Podcasts/Audio sections rather than one mixed view. | P0 | Settings adds sources; local sections filter by media type and offer Newest, Size, and Name sorting. | W2 |
| MEDIA-002 | Playlists | Audio and video must not share a mixed playlist contract. | P0 | Audio playlists accept audio entries only; video playlists accept video entries only; invalid inserts are rejected. | W5 |
| ACCESS-001 | Settings/Profile | Settings/Profile items must be either functional or explicitly marked unavailable. | P0 | Every visible item has a working destination, action, or deliberate disabled explanation. | W3/W4 |

## 3. Wave 1 visual decisions

The canonical visual foundation remains token-driven: background, elevated surface, glass surface, bronze/gold accent, primary/secondary/tertiary text, semantic states, border hierarchy, spacing, radius, and shadows. `AppText` now exposes inverse and bright text aliases. `AppButton` no longer hard-codes a font weight. `AppDivider` and `AppBadge` are available through the shared component barrel.

The first correction is restraint: no new decorative motion or ornamental card treatment should be added until hierarchy, touch targets, loading behavior, and content density are correct. A polished screen should communicate what can be played, saved, followed, filtered, or opened without relying on placeholder decoration.

## 4. Deferred visual verification

The following require the final verification wave and are deliberately not claimed as complete in Wave 1:

- Compact and large Android portrait screenshots.
- iOS portrait and safe-area screenshots.
- Dark and light theme comparison.
- Accessibility-size typography review.
- Player overlap and orientation recordings.
- Low-memory and offline state review.

## 5. Definition of a corrected screen

A screen is visually and behaviorally corrected only when its hierarchy is intentional, its loading/empty/error states are explicit, its primary action is discoverable, its controls meet touch-target and accessibility requirements, its list virtualization is appropriate to the row geometry, its navigation/back behavior is complete, and its data state survives the relevant lifecycle or restart scenarios.
