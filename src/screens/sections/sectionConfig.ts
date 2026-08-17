// ─── v10.1: Unified Section Browse — Config System ──────────────────────
// Single source of truth describing how each of the 8 Home section pages
// renders inside the shared FAB-only shell (InternalHeader + SearchBar +
// FilterChips slot + SectionFab → SectionOptionsSheet).
//
// v10.1 (Wave 6): tabs are REMOVED everywhere. Every section is ONE stream:
//   • `renderContent(ctx)` is the ONLY per-section part ("cards may differ,
//     shells may not")
//   • the FILTER options group (genres / categories) replaces the old tab
//     list — selected via the FAB sheet, surfaced as an active chip
// Sub-pages are explicitly OUT of scope for v10.1.

import type {ReactNode} from 'react';
import type {RootStackParamList} from '../../navigation/types';
import {MOVIE_CATEGORIES} from '../../constants/movieCategories';
import {JAMENDO_GENRES} from '../MusicScreen/hooks/useMusicScreen';
import type {FilterChipItem} from '../../components/utility/FilterChips';
import {renderMoviesContent} from '../MoviesScreen/MoviesContent';
import {renderMusicContent} from '../MusicScreen/MusicContent';

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
  /** Debounced search text (shell-level — persists across filter changes). */
  query: string;
  /** Active filter chips derived from `options.filters` (gold, tap = clear).
   *  One chip per active FILTER selection — e.g. `genre: 'rock'` → chip
   *  `Rock`. Feedback, not navigation. */
  activeChips: FilterChipItem[];
  /** Selected option key per options-sheet group id. */
  options: Partial<Record<SectionOptionGroupId, string>>;
  /** Pull-to-refresh is in flight. */
  refreshing: boolean;
  /** Device is offline — cached data still renders under a banner. */
  offline: boolean;
  /** Retry handler for the shared ErrorState (re-runs the active fetch
   *  without stacking requests). Migrated sections bind their refetch
   *  here; the shell keeps a no-op default so the shared error slot
   *  always has a live button. */
  onRetry?: () => void;
  /** Route params passed into the screen (Home deep-link presets). */
  routeParams: SectionRouteParams<SectionRouteKey>;
}

/**
 * Describes one section page for the shared FAB-only shell (spec §3.2).
 * Everything is unified EXCEPT the content: `renderContent` is the only
 * per-section part ("cards may differ, shells may not"). No tabs — the
 * FILTER options group carries the section's categories/genres.
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
  /** Optional quick-filter chips rendered below search (unified style). */
  quickChips?: {
    source: string[] | ((ctx: SectionRenderContext) => string[]);
    /** Single-select toggle (default true). */
    singleSelect?: boolean;
    /** Chip preselected on first mount. */
    initialKey?: string;
  };
  /** What the FAB → options sheet exposes (FILTER | SORT | VIEW). */
  options?: {
    groups: OptionGroup[];
  };
  /** Content renderer — the ONLY per-section part (ONE stream, no tabs). */
  renderContent: (ctx: SectionRenderContext) => ReactNode;
}

// ─── Stub fallback ───────────────────────────────────────────────────────

/** Placeholder renderer for configs whose content isn't migrated yet. */
const notImplemented: SectionBrowseConfig['renderContent'] = _ctx => {
  if (__DEV__) {
    console.warn('[v10.1] renderContent not implemented yet — config stub (see tracker Wave 7+).');
  }
  return null;
};

// ─── Option group builders ───────────────────────────────────────────────
// Wave 6 reference: the FILTER group replaces the old tab list. "All" is
// NOT an option — it is the state of having no filter (default stream).

/** FILTER group for Movies: every category except the default "All". */
function movieFilterGroup(): OptionGroup {
  return {
    id: 'filter',
    title: 'Category',
    options: MOVIE_CATEGORIES.filter(c => c.id !== 'all').map(c => ({
      key: c.id,
      label: c.name,
      icon: c.icon,
    })),
  };
}

/** FILTER group for Music: every Jamendo genre (labels capitalized). */
function musicFilterGroup(): OptionGroup {
  return {
    id: 'filter',
    title: 'Genre',
    options: JAMENDO_GENRES.map(g => ({
      key: g,
      label: g.charAt(0).toUpperCase() + g.slice(1),
    })),
  };
}

// ─── Registry ────────────────────────────────────────────────────────────

/**
 * The 8 Home section pages, one entry each. v10.1: `renderContent` + the
 * FILTER group are the per-section parts; everything else is the shell.
 */
export const SECTION_CONFIGS: Record<SectionRouteKey, SectionBrowseConfig> = {
  MoviesScreen: {
    route: 'MoviesScreen',
    title: 'Movies',
    search: {placeholder: 'Search movies…'},
    options: {
      groups: [
        movieFilterGroup(),
        {
          id: 'sort',
          title: 'Sort by',
          options: [
            {key: 'newest', label: 'Newest'},
            {key: 'oldest', label: 'Oldest'},
            {key: 'az', label: 'A–Z'},
            {key: 'rating', label: 'Rating'},
          ],
        },
        {
          id: 'view',
          title: 'Density',
          options: [
            {key: 'grid', label: 'Grid', icon: 'layoutGrid'},
            {key: 'list', label: 'List', icon: 'layoutList'},
          ],
        },
      ],
    },
    renderContent: renderMoviesContent,
  },
  MusicScreen: {
    route: 'MusicScreen',
    title: 'Music',
    search: {placeholder: 'Search Jamendo…'},
    options: {
      groups: [
        musicFilterGroup(),
        {
          id: 'sort',
          title: 'Sort by',
          options: [
            {key: 'az', label: 'A–Z'},
            {key: 'recent', label: 'Recently added'},
            {key: 'duration', label: 'Duration'},
          ],
        },
        {
          id: 'view',
          title: 'Density',
          options: [
            {key: 'grid', label: 'Grid', icon: 'layoutGrid'},
            {key: 'list', label: 'List', icon: 'layoutList'},
          ],
        },
      ],
    },
    renderContent: renderMusicContent,
  },
  RadioScreen: {
    route: 'RadioScreen',
    title: 'Radio',
    // TODO(Wave 7): FILTER = country / language; renderContent migrated.
    search: {placeholder: ''},
    renderContent: notImplemented,
  },
  LiveTVScreen: {
    route: 'LiveTVScreen',
    title: 'Live TV',
    // TODO(Wave 8): FILTER = category; renderContent migrated.
    search: {placeholder: ''},
    renderContent: notImplemented,
  },
  AudiobooksScreen: {
    route: 'AudiobooksScreen',
    title: 'Audiobooks',
    // TODO(Wave 9): FILTER = genre; renderContent migrated.
    search: {placeholder: ''},
    renderContent: notImplemented,
  },
  PodcastsScreen: {
    route: 'PodcastsScreen',
    title: 'Podcasts',
    // TODO(Wave 10): FILTER = category; renderContent migrated.
    search: {placeholder: ''},
    renderContent: notImplemented,
  },
  ShowsScreen: {
    route: 'ShowsScreen',
    title: 'Shows',
    // TODO(Wave 11): FILTER = genre; renderContent migrated.
    search: {placeholder: ''},
    renderContent: notImplemented,
  },
  ArchiveScreen: {
    route: 'ArchiveScreen',
    title: 'Archive',
    // TODO(Wave 12): FILTER = audio / video / collections; renderContent migrated.
    search: {placeholder: ''},
    renderContent: notImplemented,
  },
};

// ─── Accessor ────────────────────────────────────────────────────────────

/** Look up the config for a section route. Dev-mode warns on unknown routes. */
export function getSectionConfig(route: SectionRouteKey): SectionBrowseConfig {
  const config = SECTION_CONFIGS[route];
  if (__DEV__ && !config) {
    console.warn(`[v10.1] getSectionConfig: unknown section route "${String(route)}".`);
  }
  return config;
}
