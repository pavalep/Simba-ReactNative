// ─── Podcasts Screen — section shell types ────────────────────────────
// Per-screen copy of the v10 section-browse types. Each section owns its
// own copy (Podcasts / Movies / Music) so they can diverge without
// sharing a `sections/` folder.
//
// Types here describe:
//   • the section's static CONFIG (`SectionBrowseConfig` + option types)
//   • the runtime CONTEXT the shell hands to the content's
//     `renderContent` so it can render rows + respond to options.

import type {ReactNode} from 'react';

// ─── Route plumbing ────────────────────────────────────────────────────

export type SectionRouteKey = 'PodcastsScreen';

export type SectionRouteParams<T extends SectionRouteKey> = Readonly<
  Record<string, unknown>
>;

// ─── Option groups (the FAB sheet payload) ────────────────────────────

export type SectionOptionGroupId = 'filter' | 'sort' | 'view' | string;

export interface OptionItem {
  key: string;
  label: string;
  icon?: string;
}

export interface OptionGroup {
  id: SectionOptionGroupId;
  title: string;
  multiSelect?: boolean;
  collapsedRowLimit?: number;
  options: OptionItem[];
}

/** Merged record rendered as `ctx.options` (the host's content stream
 *  reads this — single source of truth for filters/sort/view). */
export type SectionOptionsMerged = {
  filter?: string[];
  sort?: string;
  view?: string;
};

// ─── Section render context (shell → content) ─────────────────────────
// KISS: only the fields content actually reads. (The legacy section
// contract carried `refreshing` / `onRetry` / `routeParams` /
// `activeChips` too — none of which any v10 content uses. BrowseLayout
// uses `activeChips` directly to render <FilterChips>; refresh + retry
// live in the content's own hook; route params are a BrowseLayout
// prop, not a ctx field.)
export interface SectionRenderContext {
  query: string;
  options: SectionOptionsMerged;
  offline: boolean;
}

// ─── Section static config ────────────────────────────────────────────

export interface SectionBrowseConfig {
  route: SectionRouteKey;
  title: string;
  search?: {placeholder?: string; debounceMs?: number};
  options?: {groups: OptionGroup[]};
  renderContent: (ctx: SectionRenderContext) => ReactNode;
}