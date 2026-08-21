# v11 Music Player Redesign

## Purpose

This redesign replaces the current half-complete music-player presentation with a single production player contract shared by the expanded overlay and mini-player. The player must feel intentional, calm, and information-dense without looking like a collection of demo controls. Every visible control must map to a native-confirmed action or a clearly defined app command.

## Current defects confirmed in source

| Area | Confirmed issue | Corrective direction |
|---|---|---|
| Close semantics | `useAudioPlayerScreen.handleGoBack()` pauses mpv and calls `navigation.goBack()` even though playback is route-free. | Full-player close collapses to the mini presentation without pausing. Explicit mini dismiss pauses and clears only after native confirmation, with a deterministic fallback. |
| Mini-player state | Mini-player progress, title, and visibility are Redux-backed, while live position and duration are maintained in `TransportContext`; the audio hook dispatches `playFile()` but does not continuously dispatch `setPosition()` or `setDuration()`. | Make the playback provider/transport bridge authoritative for live state, and mirror native position/duration/playback state into Redux at controlled checkpoints for mini-player persistence. |
| Mini-player artwork | Artwork source uses `currentTrack.uri` instead of `currentTrack.artworkUri`. | Use artwork URI first, then a stable music fallback; never load an audio file URI as artwork. |
| Mini-player metadata | Subtitle repeats the title because `PlaylistEntry` metadata is not surfaced. | Show artist, album, provider, or media-kind fallback in a deliberate hierarchy. |
| Controls | Existing transport icons are not visually explicit enough across surfaces, and the registry currently aliases rewind/forward semantics to skip icons. | Use semantic names and correct directional assets. Add dedicated rewind/forward assets or a text-backed 10-second affordance where assets do not exist. Previous/next must be track navigation, not time navigation. |
| Overlay composition | Full audio content is mounted through a large mixed component tree with unclear hierarchy and several sheets/panels competing for attention. | Split the surface into stable shell, hero, transport, secondary actions, and modal panels. Keep one active modal/panel at a time. |
| Queue transitions | Previous/next paths update Redux and call mpv directly in multiple places, with no single transition command or loading guard. | Centralize transition execution, use a transition lock, update the active entry before load, and recover on native load/error events. |

## Player modes

| Mode | Behavior |
|---|---|
| Expanded | Full-screen overlay above the current route. The close button collapses to mini and keeps playback alive. Swiping down has the same behavior. |
| Mini | Compact floating card above the safe area. Tap the body expands. Play/pause, previous, next, and dismiss are independent touch targets. Dismiss pauses and clears the player only after native pause confirmation. |
| None | No player surface. Native playback is stopped or intentionally cleared, and the provider has no active entry. |

## Expanded information hierarchy

The expanded surface uses four deliberate zones: a safe-area header with collapse and queue actions; a visually strong but restrained artwork hero with source/status metadata; a primary now-playing block containing title, artist, album, progress, elapsed/remaining time, and native buffering state; and a transport/action area containing track navigation, play/pause, shuffle, repeat, bookmark, like, add-to-playlist, share, lyrics, sleep timer, and queue actions. Secondary actions open a single sheet or panel and never compete with the primary transport row.

## Control semantics

| Control | Icon semantics | Action |
|---|---|---|
| Close/collapse | `chevronDown` or a clearly labeled close affordance in the header | Collapse expanded player; do not pause. |
| Previous track | `prevTrack` | Previous chapter/track, or restart current track when position exceeds the restart threshold. |
| Rewind | `rewind10` | Seek backward ten seconds. |
| Play/pause | `play` / `pause` | Native-confirmed toggle. |
| Forward | `forward10` | Seek forward ten seconds. |
| Next track | `nextTrack` | Next chapter/track through the shared transition controller. |
| Shuffle | `shuffle` | Toggle queue shuffle state and reflect active state. |
| Repeat | `repeat` | Cycle none, one, and all with an accessible label. |
| Queue | `listMusic` | Open the queue panel. |
| Bookmark | `bookmark` / `bookmarkFilled` | Explicit bookmark action with capacity confirmation when required. |
| Playlist | `list` | Open playlist popup; no bottom sheet for add-to-playlist. |
| Like | `heart` | Persisted favorite state, not local-only state. |

## State ownership

The playback module owns the active entry and presentation. The transport context owns native-confirmed position, duration, play state, buffering, cache ranges, seekability, and sleep-timer display. The playback transition controller owns previous/next resolution and transition locking. Redux mirrors the active entry, current position, duration, playback state, and queue checkpoints for Home mini-player rendering, Recent History, Bookmarks, and persistence. No UI component should call mpv for transition decisions or infer playback truth from stale Redux-only fields.

## Implementation boundaries

The audio module will be organized as follows:

```text
src/modules/playback/audio/
  AudioPlayerModule.tsx
  components/
    AudioPlayerSurface.tsx
    AudioPlayerHeader.tsx
    AudioPlayerHero.tsx
    AudioPlayerTransport.tsx
    AudioPlayerActions.tsx
    AudioPlayerQueuePeek.tsx
    AudioPlayerPanels.tsx
  hooks/
    useAudioPlayerScreen.ts
    useAudioPlaybackController.ts
  related/
    audioPlayerFormatters.ts
    audioPlayerContracts.ts
  styles/
    audioPlayerStyles.ts
  types/
    index.ts
```

The mini-player remains in `src/components/player/MiniAudioPlayer/` as the shell-level compact presentation, but it consumes the same route-free playback context and authoritative transport snapshot as the expanded player.

## Acceptance contract

A music player implementation is not complete until all of the following are true: the mini-player shows correct artwork and secondary metadata; close reliably dismisses it; expanded close collapses without pausing; play/pause reflects native state; previous and next point in the correct directions and transition the correct lane; seek and volume work; loading, buffering, error, and empty states are explicit; bookmark, like, playlist, queue, lyrics, and info actions are either fully wired or removed from the visible surface; progress and duration remain visible after expanding and collapsing; and all callers use `openPlayer()` with complete provenance and media-kind metadata.

Runtime emulator verification remains a required final gate after the static implementation pass.
