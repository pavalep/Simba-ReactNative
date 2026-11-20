// ─── All Audio Screen — browse config ────────────────────────────────────
// The single All Audio entry the host screen feeds to the shared
// `<BrowseLayout>` (src/screens/_shared/BrowseLayout.tsx).
//
// WAVE B16 (Wave B) — this file is new.
//
// The page used to hand-roll its own shell, and three things about the
// page were three separate mechanisms:
//
//   • the SORT was a header BUTTON that flipped between two orders, so
//     the page could not say which order it was in — the icon changed
//     and the icon was the only thing that said anything;
//   • the VIEW was a second header button that flipped between a grid
//     and a list;
//   • the ARTIST scope the Artist screen sends (`filter: artistName`)
//     was read by the page's own hook, so the page answered a question
//     it never showed the user.
//
// On the shared shell the sort and the view are option-sheet GROUPS —
// the sheet is the app's one home for a single-valued option, and the
// Movies screen's sort group is the precedent — and the artist is a
// FILTER axis, which means it draws a chip in the shell's strip and one
// tap removes it.
//
// The config is a FACTORY, like the Radio screen's: the artist list is
// the device's own scanned catalogue, so it is not known until the scan
// has run.

import type {ScannedTrack} from '../../../state';
import type {SectionBrowseConfig} from '../types';
import text from './textContent.json';

/**
 * The artist a track is filed under.
 *
 * The media store's own artist catalogue uses the same fallback
 * (`useMediaArtists` → `t.artist || 'Unknown Artist'`), so the axis and
 * the catalogue cannot disagree about an unnamed track.
 */
export function artistNameOf(track: ScannedTrack): string {
  return track.artist || 'Unknown Artist';
}

/**
 * The ARTIST axis — the page's one filter.
 *
 * It is SINGLE-select: the scope IS the artist, so a second artist has
 * nothing to be OR'd with.
 */
function artistGroup(artists: readonly string[], seedArtist?: string) {
  const options = artists.map(name => ({key: name, label: name}));
  const seed = seedArtist?.trim();
  if (
    seed &&
    !options.some(o => o.key.toLowerCase() === seed.toLowerCase())
  ) {
    // The seed's own value goes into the list UP FRONT.
    //
    // The Artist screen sends the name it knows the artist by, and the
    // library may not hold that artist at all — the page then has
    // nothing to show, and a filter that is INVISIBLE cannot be
    // removed. Putting the seed in the list makes the option model's
    // seed land, so the chip shows and one tap clears it. This is the
    // Live TV deep-link seed's own rule.
    options.push({key: seed, label: seed});
  }
  return {
    id: 'filter',
    title: text.groups.artist,
    multiSelect: false,
    // A device can hold hundreds of artists, so the sheet shows six and
    // a SHOW MORE toggle — the shell's own rule.
    collapsedRowLimit: 6,
    options,
  };
}

/**
 * The page's config.
 *
 * `tracks` is the device's scanned AUDIO tracks; the artist axis is
 * derived from them, and `seedArtist` is the route's `filter` param —
 * the artist the Artist screen asked for.
 */
export function createAllAudioSectionConfig(
  tracks: readonly ScannedTrack[],
  seedArtist?: string,
): SectionBrowseConfig {
  const artists = Array.from(new Set(tracks.map(artistNameOf))).sort((a, b) =>
    a.localeCompare(b),
  );
  return {
    route: 'AllAudioScreen',
    title: text.page.title,
    // The page wore this gradient before it joined the shell, and the
    // shell owns the surface (see `SectionBrowseConfig.background`).
    background: 'gradient',
    search: {placeholder: text.page.searchPlaceholder},
    options: {
      groups: [
        artistGroup(artists, seedArtist),
        {
          id: 'sort',
          title: text.groups.sort,
          // The default belongs to the config, so the sheet draws it as
          // the applied option without it counting as an active filter.
          defaultKey: 'title',
          options: [
            {key: 'title', label: text.sort.title},
            {key: 'artist', label: text.sort.artist},
          ],
        },
        {
          id: 'view',
          title: text.groups.view,
          defaultKey: 'grid',
          options: [
            {key: 'grid', label: text.view.grid},
            {key: 'list', label: text.view.list},
          ],
        },
      ],
    },
    // Stub — `index.tsx` overrides with the real content renderer via
    // spread to break the config → content → screen → config cycle.
    renderContent: (): null => null,
  };
}
