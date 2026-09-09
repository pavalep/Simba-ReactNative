// ─── Section Route Types (V20.9) ──────────────────────────────────────
// Lifted from the 4 per-screen copies that lived at:
//   src/screens/MusicScreen/types/index.ts (literal `'MusicScreen'`)
//   src/screens/MoviesScreen/types/index.ts (literal `'MoviesScreen'`)
//   src/screens/PodcastsScreen/types/index.ts (literal `'PodcastsScreen'`)
//   src/screens/Home/components/browseAllRouteKey.ts (union of all 9)
//
// The single canonical type is the union — every screen's narrow
// literal is structurally assignable to it. `SectionRouteParams` is
// a thin `Readonly<Record<string, unknown>>` wrapper used by the
// shell to pass route-time params to the content's `renderContent`.

/** Union of all Home Discover destinations. */
export type SectionRouteKey =
  | 'MoviesScreen'
  | 'MusicScreen'
  | 'RadioScreen'
  | 'LiveTVScreen'
  | 'AudiobooksScreen'
  | 'PodcastsScreen'
  | 'ShowsScreen'
  | 'ArchiveScreen'
  | 'LocalFiles';

export type SectionRouteParams<T extends SectionRouteKey = SectionRouteKey> =
  Readonly<Record<string, unknown>>;
