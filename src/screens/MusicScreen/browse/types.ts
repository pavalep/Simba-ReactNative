// ─── Music Screen — section shell types ───────────────────────────────
// Per-screen copy of the v10 section-browse types. Each section owns its
// own copy (Podcasts / Movies / Music) so they can diverge without
// sharing a `sections/` folder.

import type {ReactNode} from 'react';

// ─── Route plumbing ────────────────────────────────────────────────────

export type SectionRouteKey = 'MusicScreen';

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

export interface SectionRenderContext {
  query: string;
  activeChips: Array<{key: string; label: string}>;
  options: SectionOptionsMerged;
  refreshing: boolean;
  offline: boolean;
  onRetry?: () => void;
  routeParams: Readonly<Record<string, unknown>> | undefined;
}

// ─── Section static config ────────────────────────────────────────────

export interface SectionBrowseConfig {
  route: SectionRouteKey;
  title: string;
  search?: {placeholder?: string; debounceMs?: number};
  options?: {groups: OptionGroup[]};
  renderContent: (ctx: SectionRenderContext) => ReactNode;
}

/** Placeholder for sections that aren't built yet. */
export const notImplemented: SectionBrowseConfig = {
  route: 'MusicScreen',
  title: '',
  renderContent: () => null,
};