# Changelog

All notable changes to Simba Player are recorded here.

## [1.1.0] — 2026-07-31 — First public beta

### Highlights
- Complete media library: videos, audio, audiobooks, podcasts, live TV/IPTV, radio, archive.org shows
- MPV-based playback engine with chapters, bookmarks, resume, sleep timer, and queue management
- Playlists with create/edit/reorder/duplicate flows and multi-select batch actions
- Full-screen lyrics view with synced LRC highlighting and queue peek
- Video player with equalizer, audio track selection, auto-advance, and chapter browser
- Mini-player with quick transport controls; resume overlays for audio and video

### Performance (P59)
- List virtualization sweep — all large lists render through FlatList (no `.map` for >100 items)
- Re-render audit: stabilized hot-path selectors (Home shelves, All Audio/Video, detail screens)
- Cold-start instrumentation: `[startup]` milestone log (js-start → store-ready → rehydrated → app-mount → nav-ready → first-screen)
- Art cache: memory + disk LRU layers eliminate remount placeholder flashes

### Accessibility (P59)
- Full-repo a11y sweep: roles (button/link/radio/checkbox/switch), states (selected/checked/expanded), labels on every touchable, 44dp effective targets via hitSlop
- TalkBack pass on 5 core journeys: adjustable seek bars with increment/decrement actions, live-region "Now playing" announcements, labeled switches and swipe actions
- Reduced-motion support: all looping/decorative animations render statically when the system setting is enabled

### Stability
- Error boundaries on every screen with retry/go-back/details fallback
- Release builds now persist crashes to `DocumentDirectory/crash.log` for beta triage

## [1.0] — Previous
- Initial feature-complete development milestone (internal)
