// ─── Podcast Detail — Static Constants ─────────────────────────────────
// Module-scope values used by the detail screen — zero per-render churn.

import text from './textContent.json';

// The header's fallback title — what it says before the API has
// answered. Once the podcast is loaded the header carries the
// podcast's OWN name.
export const HEADER_TITLE = text.screen.headerTitle;

// ─── Episode pagination (Podcast Index /episodes/byfeedid) ───────────
// /episodes/byfeedid takes a `max` parameter (not true offset) — pages
// are grown by doubling the window until the API returns a short page
// or the cap is hit. Same contract as the PodcastsScreen list.
export const INITIAL_MAX = 10;
/** Hard cap from Podcast Index — the pagination ceiling. */
export const MAX_RESULTS_PER_QUERY = 1000;

// 35.6: episode long-press menu. Labels/icons are static — only the
// handler differs per action, so the array is hoisted out of the render.
export const EPISODE_MENU_ACTIONS = [
  {label: 'Play Next', icon: 'skipForward', value: 'play-next'},
  {label: 'Add to Queue', icon: 'list', value: 'add-queue'},
  {label: 'Add to Playlist', icon: 'listMusic', value: 'add-playlist'},
  {label: 'Bookmark', icon: 'bookmark', value: 'bookmark'},
  {label: 'Share', icon: 'share', value: 'share'},
] as const;