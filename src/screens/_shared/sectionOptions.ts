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

import type {ImageSourcePropType} from 'react-native';

/** Group id for the option sheet — `'filter' | 'sort' | 'view'`
 *  (or any custom string for a screen-specific group). */
export type SectionOptionGroupId = 'filter' | 'sort' | 'view' | string;

export interface OptionItem {
  key: string;
  label: string;
  icon?: string;
  /**
   * Local cover plate for the option — drawn only by a `'coverGrid'`
   * group (the Cover Shelf). A chip group ignores it.
   */
  image?: ImageSourcePropType;
}

export interface OptionGroup {
  id: SectionOptionGroupId;
  title: string;
  multiSelect?: boolean;
  collapsedRowLimit?: number;
  /**
   * How the sheet draws the group.
   *
   * `'chips'` (the default) is the sheet's chip flow. `'coverGrid'` is
   * the Cover Shelf — a grid of cover plates with the glyph badge on
   * the plate and the name underneath. Only the Podcasts screen opts
   * into it; every other group renders exactly as it always has.
   */
  layout?: 'chips' | 'coverGrid';
  /**
   * The key that means "no filter" in a cover-grid group — tapping that
   * tile clears the group instead of selecting it.
   */
  clearKey?: string;
  /**
   * The option that is applied when the group has NO explicit
   * selection.
   *
   * The sheet draws this option as the current state (gold) so the
   * user can see what is applied, and it does NOT count as an active
   * filter — resetting a group that is already at its default would
   * change nothing, so the "RESET FILTERS" footer must not appear for
   * it.
   */
  defaultKey?: string;
  options: OptionItem[];
}

/** Merged record rendered as `ctx.options` (the host's content
 *  stream reads this — single source of truth for filters/sort/view). */
export type SectionOptionsMerged = {
  filter?: string[];
  sort?: string;
  view?: string;
};
