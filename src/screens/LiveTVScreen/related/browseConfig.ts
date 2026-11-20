// ─── Live TV Screen — browse config ───────────────────────────────────
// The single Live TV entry the host screen feeds to the shared
// `<BrowseLayout>` (src/screens/_shared/BrowseLayout.tsx). No central
// SECTION_CONFIGS registry — each screen owns its own entry.
// `renderContent` is bound via spread-override in `index.tsx` to avoid a
// circular import (config → content → screen → config).
//
// WHY THIS FILE IS A FACTORY
// --------------------------
// The Music, Movies and Audiobooks screens declare their filter axis as a
// STATIC constant, so their configs are plain objects. Live TV cannot be:
// the categories are part of the CATALOGUE, and the catalogue is fetched at
// runtime.
//
// Measured (2026-11-17, `src/infrastructure/api/iptv/adapter.ts`):
//   • `GET {base}/index.category.m3u`   — 2,822,591 bytes, 12,269 entries
//   • `GET {base}/api/categories.json`  — 856 bytes, 30 categories (id → name)
//   • `GET {base}/api/countries.json`   — 4,248 bytes, 250 countries
//
// The category TAXONOMY is in `/api/categories.json`, so the app only knows
// the 30 ids once that file has been downloaded. Baking a copy of the list
// into the app would be a second home for a fact the source owns — and the
// source's list can change.
//
// So the config is a FACTORY, exactly like the Radio screen's
// (`createRadioSectionConfig(catalog, seedGenre)`): `index.tsx` resolves the
// categories and builds ONE memoised config, so the shell and
// `useSectionOptions` receive the SAME object.

import type {IPTVCategory} from '../../../types/api';
import type {SectionBrowseConfig} from '../types';

/**
 * The route param is an id; the source's ids are lower case.
 *
 * The adapter lower-cases every category id it reads
 * (`categoryNameMapFromRaw`: `map.set(row.id.toLowerCase(), row.name)`) and
 * every channel's own group-title (`buildIPTVCatalogue`:
 * `entry.group.toLowerCase()`), so the source's vocabulary for a category
 * is its lower-case slug. A deep link that arrives with the slug in another
 * case is brought into that vocabulary here — ONCE, in the one place that
 * owns the rule — so the shell's seed, the filter option's key and the
 * catalogue's own id are the same string.
 *
 * `all` is NOT a category id in the source's taxonomy: it is the old
 * screen's spelling of "no filter", so it is normalised away and never
 * becomes a scope.
 */
export function normalizeCategoryId(value?: string | null): string | null {
  const trimmed = (value ?? '').trim().toLowerCase();
  if (trimmed.length === 0 || trimmed === 'all') return null;
  return trimmed;
}

/**
 * The Category group — SINGLE-select.
 *
 * Single-select because the catalogue's scope is ONE category: the
 * category filter is a comparison on the channel's `categoryId`, and the
 * source has one group-title per entry. Holding two categories would put
 * two chips in the strip while the list answered one — a filter that looks
 * applied and is not (the defect the Music screen's genre group had, fixed
 * the same way).
 *
 * `collapsedRowLimit: 6` is the sheet's one rule across the browse screens:
 * the sheet shows six chips and a SHOW MORE toggle, so the panel stays a
 * panel instead of running past the screen. It matters more here than
 * anywhere else — the source serves 30 categories.
 *
 * The rows carry no icon: the filter sheet draws text pills, and an icon
 * copied into the option model is thrown away by the sheet. Dead data in
 * the model is a lie about the sheet.
 *
 * @param categories The catalogue's categories — ONLY the ones that answer.
 *   The catalogue counts the channels under each category (the source does
 *   not serve a count), and a category with no channels under it would be
 *   a filter that can only ever produce "No channels found." — a control
 *   that cannot act must not occupy space. The count is applied by the
 *   catalogue hook (`useLiveTVCatalogue`), which is where the app's own
 *   count is computed.
 * @param seedCategoryId The category a deep link asked for, if any.
 *
 *   THE DEEP LINK'S CATEGORY, AND WHY IT IS IN THE OPTIONS FROM THE START
 *   --------------------------------------------------------------------
 *   `LiveTVScreen` takes `{categoryId?: string}` — one of the shared seed
 *   param names — and `useSectionOptions` seeds a filter group with a route
 *   param ONLY IF that param's value is one of the group's option keys.
 *
 *   The categories are runtime data, so on a COLD start the option list is
 *   empty when the options are first read, and the seed would silently
 *   never fire: the deep link would land on the whole catalogue and the
 *   chip strip would say nothing. So the seed's own value is put in the
 *   option list up front, and the catalogue's own entry replaces it (with
 *   the source's NAME for it) as soon as the catalogue arrives — the two
 *   carry the same key, so the replacement is an upgrade of the label and
 *   not a second row.
 */
function liveTVFilterGroup(
  categories: IPTVCategory[],
  seedCategoryId?: string,
) {
  const options = categories.map(category => ({
    key: category.id,
    label: category.name,
  }));

  if (seedCategoryId && !options.some(option => option.key === seedCategoryId)) {
    options.push({key: seedCategoryId, label: seedCategoryId});
  }

  return {
    id: 'filter',
    title: 'Category',
    multiSelect: false,
    collapsedRowLimit: 6,
    options,
  };
}

/**
 * Build the Live TV browse config for the catalogue the app has.
 *
 * @param categories The catalogue's categories.
 * @param seedCategoryId The deep link's category, if any — already
 *   normalised into the source's vocabulary (`normalizeCategoryId`).
 */
export function createLiveTVSectionConfig(
  categories: IPTVCategory[],
  seedCategoryId?: string,
): SectionBrowseConfig {
  return {
    route: 'LiveTVScreen',
    title: 'Live TV',
    search: {placeholder: 'Search channels…'},
    options: {
      // NO SORT AXIS — and that is the decision (B16-J-LIVE-TV-SORT).
      //
      // A live-TV guide is not a catalogue the user reorders: Plex,
      // YouTube TV and every IPTV client keep the guide's own order. The
      // source publishes ONE order, so a sort group here would offer a
      // set of arrangements the app has no business inventing — and the
      // one thing a guide is for is knowing what is on now.
      groups: [liveTVFilterGroup(categories, seedCategoryId)],
    },
    // Stub — `index.tsx` overrides with the real content renderer via
    // spread to break the config → content → screen → config cycle.
    renderContent: (): null => null,
  };
}
