// ─── v10: Unified Section Browse — Config System ─────────────────────────
// Single source of truth describing how each of the 8 Home section pages
// renders inside the shared browse shell (InternalHeader + SearchBar +
// FilterChips + TabView + SectionFab → SectionOptionsSheet).
//
// Phase 1.1 scope: types + 8-entry registry (title + route stubs).
// Tab lists are wired in Phase 1.2 (`useSectionTabs`); the rest of the
// fields are filled in during the per-section migration waves (5–12).
// Sub-pages are explicitly OUT of scope for v10.

import type {ReactNode} from 'react';
import type {RootStackParamList} from '../../navigation/types';

// ─── Route keys ──────────────────────────────────────────────────────────
// Derived from RootStackParamList via `Extract`, so the compiler proves the
// 8 section names below are real root-stack routes (Phase 1.1 validation).

export type SectionRouteKey = Extract<
  keyof RootStackParamList,
  | 'MoviesScreen'
  | 'MusicScreen'
  | 'RadioScreen'
  | 'LiveTVScreen'
  | 'AudiobooksScreen'
  | 'PodcastsScreen'
  | 'ShowsScreen'
  | 'ArchiveScreen'
>;

/** Route params of a given section route (deep-link presets from Home). */
export type SectionRouteParams<K extends SectionRouteKey> =
  K extends keyof RootStackParamList ? RootStackParamList[K] : never;

// ─── Core types ──────────────────────────────────────────────────────────

/** One tab in the section tab bar. `key` maps back to the section's source. */
export interface SectionTab {
  key: string;
  title: string;
}

/** A single selectable option inside a FAB → options-sheet group. */
export interface SectionOption {
  key: string;
  label: string;
  icon?: string;
}

export type SectionOptionGroupId = 'filter' | 'sort' | 'view';

/** A group of related options in the FAB → options sheet. */
export interface OptionGroup {
  id: SectionOptionGroupId;
  title: string;
  options: SectionOption[];
}

/** Context handed to every content renderer by the shared shell. */
export interface SectionRenderContext {
  /** Debounced search text (shell-level — persists across tab switches). */
  query: string;
  /** Currently active quick-filter chip keys. */
  activeChips: string[];
  /** Selected option key per options-sheet group id. */
  options: Partial<Record<SectionOptionGroupId, string>>;
  /** Pull-to-refresh is in flight. */
  refreshing: boolean;
  /** Device is offline — cached data still renders under a banner. */
  offline: boolean;
  /** Retry handler for the shared ErrorState (re-runs the active tab's
   *  fetch without stacking requests). Wave 5+ sections bind their tab
   *  refetch here; the shell keeps a no-op default so the shared error
   *  slot always has a live button. */
  onRetry?: () => void;
  /** Route params passed into the screen (Home deep-link presets). */
  routeParams: SectionRouteParams<SectionRouteKey>;
}

/**
 * Describes one section page for the shared browse shell (spec §3.2).
 * Everything is unified EXCEPT the content: `renderTab` is the only
 * per-section part ("cards may differ, shells may not").
 */
export interface SectionBrowseConfig {
  /** Route this section is registered under in RootStackParamList. */
  route: SectionRouteKey;
  /** Header title. */
  title: string;
  /** Shared SearchBar wiring. Always on. */
  search: {
    placeholder: string;
    /** Debounce ms for the search term (default 300). */
    debounceMs?: number;
  };
  /** The tab bar. Unified source — one shape for all 8 sections. */
  tabs: SectionTab[];
  /** Optional quick-filter chips rendered below search (unified style). */
  quickChips?: {
    source: string[] | ((ctx: SectionRenderContext) => string[]);
    /** Single-select toggle (default true). */
    singleSelect?: boolean;
    /** Chip preselected on first mount. */
    initialKey?: string;
  };
  /** What the FAB → options sheet exposes. */
  options?: {
    groups: OptionGroup[];
  };
  /** Content renderer per tab — the ONLY per-section part. */
  renderTab: (tab: SectionTab, ctx: SectionRenderContext) => ReactNode;
}

// ─── Stub fallback ───────────────────────────────────────────────────────

/** Placeholder renderer for configs whose content isn't migrated yet. */
const notImplemented: SectionBrowseConfig['renderTab'] = (_tab, _ctx) => {
  if (__DEV__) {
    console.warn('[v10] renderTab not implemented yet — config stub (see tracker Phase 1.x).');
  }
  return null;
};

// ─── Registry ────────────────────────────────────────────────────────────

/**
 * The 8 Home section pages, one entry each. Phase 1.1 seeds title + route;
 * `tabs`, `quickChips`, `options` and `renderTab` land in later phases.
 */
export const SECTION_CONFIGS: Record<SectionRouteKey, SectionBrowseConfig> = {
  MoviesScreen: {
    route: 'MoviesScreen',
    title: 'Movies',
    // TODO(1.2): tabs from MOVIE_CATEGORIES (9)
    search: {placeholder: ''},
    tabs: [],
    renderTab: notImplemented,
  },
  MusicScreen: {
    route: 'MusicScreen',
    title: 'Music',
    // TODO(1.2): tabs from MUSIC_TABS (3)
    search: {placeholder: ''},
    tabs: [],
    renderTab: notImplemented,
  },
  RadioScreen: {
    route: 'RadioScreen',
    title: 'Radio',
    // TODO(1.2): tabs from RADIO_TABS (5)
    search: {placeholder: ''},
    tabs: [],
    renderTab: notImplemented,
  },
  LiveTVScreen: {
    route: 'LiveTVScreen',
    title: 'Live TV',
    // TODO(1.2): tabs from LIVE_TV_TABS (3)
    search: {placeholder: ''},
    tabs: [],
    renderTab: notImplemented,
  },
  AudiobooksScreen: {
    route: 'AudiobooksScreen',
    title: 'Audiobooks',
    // TODO(1.2): tabs from local TABS (3)
    search: {placeholder: ''},
    tabs: [],
    renderTab: notImplemented,
  },
  PodcastsScreen: {
    route: 'PodcastsScreen',
    title: 'Podcasts',
    // TODO(1.2): tabs from PODCAST_TABS (12)
    search: {placeholder: ''},
    tabs: [],
    renderTab: notImplemented,
  },
  ShowsScreen: {
    route: 'ShowsScreen',
    title: 'Shows',
    // TODO(1.2): tabs from local TABS (3)
    search: {placeholder: ''},
    tabs: [],
    renderTab: notImplemented,
  },
  ArchiveScreen: {
    route: 'ArchiveScreen',
    title: 'Archive',
    // TODO(1.2): tabs from inline routes (2)
    search: {placeholder: ''},
    tabs: [],
    renderTab: notImplemented,
  },
};

// ─── Accessor ────────────────────────────────────────────────────────────

/** Look up the config for a section route. Dev-mode warns on unknown routes. */
export function getSectionConfig(route: SectionRouteKey): SectionBrowseConfig {
  const config = SECTION_CONFIGS[route];
  if (__DEV__ && !config) {
    console.warn(`[v10] getSectionConfig: unknown section route "${String(route)}".`);
  }
  return config;
}
