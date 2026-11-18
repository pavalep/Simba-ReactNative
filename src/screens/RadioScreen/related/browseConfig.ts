// ─── Radio Screen — browse config ─────────────────────────────────────
// The single Radio entry the host screen feeds to the shared
// `<BrowseLayout>` (`src/screens/_shared/BrowseLayout.tsx`). No central
// SECTION_CONFIGS registry — each screen owns its own entry.
//
// WHY THIS IS A FACTORY
// ---------------------
// Radio's three filter axes are NOT a static list: the genre, country and
// language menus are the radio-browser API's own tag lists, fetched at
// runtime (see `hooks/useRadioTags.ts`). A module-scope constant would
// hand the shell an EMPTY menu until the request resolved — and the
// shell seeds a route param into the group whose OPTIONS contain that
// key (`useSectionOptions`), so a genre deep link
// (`radio?initialTag=pop`) would be dropped on the floor.
//
// So the config is built from the fetched catalog, exactly like the
// Podcasts screen's `createPodcastsSectionConfig(categories)`.
//
// THE THREE AXES
// --------------
// Radio filters by GENRE, by COUNTRY and by LANGUAGE, and each axis is
// single-select. The group id IS the axis name, because a chip's key has
// to say which axis it belongs to: the genre 'Rock' and a country called
// 'Rock' are the same string, and clearing one must not clear the other.
// The shared shell reads them back as `ctx.options.filters.genre`,
// `.country` and `.language`.
//
// SINGLE-SELECT, MEASURED
// -----------------------
// The radio-browser adapter's `/json/stations/search` accepts ONE `tag`,
// ONE `country` and ONE `language` per request (see
// `infrastructure/api/radioBrowser/adapter.ts` → `getStationsByFilters`).
// A second value on any axis has nothing to be OR'd with, so holding two
// genres in the chip strip while the list answered one would be a filter
// that looks applied and is not — the same defect the Music screen's
// genre group had, fixed the same way.
//
// A TAG'S KEY IS ITS NAME
// -----------------------
// The live tag endpoint returns `{name, stationcount}` and the adapter
// maps it to `{name, stationCount}` — there is NO id. The filter is
// applied by name (`params.tag = filters.genre`), so the name IS the key.
// The old code read `.id` off a shape that has none, so every chip's key
// was `undefined`: the chips collapsed onto one React key, the selection
// was never marked, and the chosen value was thrown away before the
// request was built. The sheet was inert.

import type {ReactNode} from 'react';
import type {RadioBrowseTag} from '../../../infrastructure/api/radioBrowser/adapter';
import type {OptionItem} from '../../_shared/sectionOptions';
import type {SectionBrowseConfig} from '../types';
import text from './textContent.json';

/**
 * The three fetched tag lists, one per axis.
 *
 * The lists are the ADAPTER's output (`{name, stationCount}`), so the
 * mapping from a tag to a sheet option happens here — where the option
 * model is built — and not in the component that draws the sheet.
 */
export interface RadioTagCatalog {
  genres: RadioBrowseTag[];
  countries: RadioBrowseTag[];
  languages: RadioBrowseTag[];
}

/**
 * A browse tag as a filter option.
 *
 * The tag's ONLY identity is its NAME, so the key and the label are the
 * same string. The name is also what the source filters on, so the chip
 * the user taps is the value the request carries.
 */
export function toRadioTagOption(tag: RadioBrowseTag): OptionItem {
  return {key: tag.name, label: tag.name};
}

/**
 * One axis, one group.
 *
 * `collapsedRowLimit: 6` is the sheet's one rule across the browse
 * screens: the sheet shows six chips and a SHOW MORE toggle, so the
 * panel stays a panel instead of running past the screen. Radio's axes
 * carry 40 tags each, so the rule earns its keep here.
 */
function radioFilterGroup(
  id: 'genre' | 'country' | 'language',
  title: string,
  tags: RadioBrowseTag[],
): {
  id: string;
  title: string;
  multiSelect: boolean;
  collapsedRowLimit: number;
  options: OptionItem[];
} {
  return {
    id,
    title,
    multiSelect: false,
    collapsedRowLimit: 6,
    options: tags.map(toRadioTagOption),
  };
}

/**
 * The genre group, with the deep link's genre kept in it.
 *
 * `seedGenre` is the route's own `initialTag` — the genre a deep link
 * asked for. It is added to the group even when the fetched tag list
 * does not (yet) contain it, because `useSectionOptions` seeds a route
 * param into the group whose OPTIONS contain that key, and it does that
 * ONCE, at mount: if the tag list had not arrived by then, the deep
 * link's genre would be silently dropped.
 *
 * The seeded option is not invented data — a radio-browser tag's only
 * identity IS its name, so the option is the route's own value, and the
 * request it produces is filtered by exactly that name.
 */
function genreGroup(tags: RadioBrowseTag[], seedGenre?: string) {
  const group = radioFilterGroup('genre', text.groups.genre, tags);
  if (!seedGenre || group.options.some(option => option.key === seedGenre)) {
    return group;
  }
  return {...group, options: [{key: seedGenre, label: seedGenre}, ...group.options]};
}

/**
 * Build the Radio browse config from the fetched tag catalog.
 *
 * @param catalog The three fetched tag lists (one per axis).
 * @param seedGenre The route's `initialTag` — the genre a deep link
 *   asked for, kept in the genre group so the shell can seed it.
 */
export function createRadioSectionConfig(
  catalog: RadioTagCatalog,
  seedGenre?: string,
): SectionBrowseConfig {
  return {
    route: 'RadioScreen',
    title: text.title,
    search: {placeholder: text.search.placeholder},
    options: {
      groups: [
        genreGroup(catalog.genres, seedGenre),
        radioFilterGroup('country', text.groups.country, catalog.countries),
        radioFilterGroup('language', text.groups.language, catalog.languages),
      ],
    },
    // Stub — `index.tsx` overrides with the real content renderer via
    // spread, to break the config → content → screen → config cycle.
    renderContent: (): ReactNode => null,
  };
}
