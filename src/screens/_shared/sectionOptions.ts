// ─── Section Options Types (V20.8) ────────────────────────────────────
// Canonical option types for the section-browse FAB sheet, lifted
// from the 3 per-screen copies that lived at:
//   src/screens/MusicScreen/types/index.ts
//   src/screens/MoviesScreen/types/index.ts
//   src/screens/PodcastsScreen/types/index.ts
// All 3 were structurally identical. The shared `useSectionOptions`
// hook (`src/hooks/useSectionOptions.ts`) imports these; the
// 3 per-screen `types/index.ts` re-export them so existing
// consumers keep working.

/** Group id for the option sheet — `'filter' | 'sort' | 'view'`
 *  (or any custom string for a screen-specific group). */
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

/** Merged record rendered as `ctx.options` (the host's content
 *  stream reads this — single source of truth for filters/sort/view). */
export type SectionOptionsMerged = {
  filter?: string[];
  sort?: string;
  view?: string;
};
