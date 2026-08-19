// ─── Podcast Detail — Static Constants ─────────────────────────────────
// Module-scope values used by the detail screen — zero per-render churn.

import text from './textContent.json';

// The header always shows a fixed "Podcast Details" title — the real
// title lives in the hero section below once the API resolves.
export const HEADER_TITLE = text.screen.headerTitle;

// ─── Episode pagination (Podcast Index /episodes/byfeedid) ───────────
// /episodes/byfeedid takes a `max` parameter (not true offset) — pages
// are grown by doubling the window until the API returns a short page
// or the cap is hit. Same contract as the PodcastsScreen list.
export const INITIAL_MAX = 10;
/** Hard cap from Podcast Index — the pagination ceiling. */
export const MAX_RESULTS_PER_QUERY = 1000;
/** Minimum ms between loadMore triggers (onEndReached spam guard). */
export const LOAD_MORE_THROTTLE_MS = 600;

// 35.6: episode long-press menu. Labels/icons are static — only the
// handler differs per action, so the array is hoisted out of the render.
export const EPISODE_MENU_ACTIONS = [
  {label: 'Play Next', icon: 'skipForward', value: 'play-next'},
  {label: 'Add to Queue', icon: 'list', value: 'add-queue'},
  {label: 'Add to Playlist', icon: 'listMusic', value: 'add-playlist'},
  {label: 'Bookmark', icon: 'bookmark', value: 'bookmark'},
  {label: 'Share', icon: 'share', value: 'share'},
] as const;