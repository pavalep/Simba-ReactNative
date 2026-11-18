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

// The params a section route may carry. The shape is deliberately
// loose — the shell hands route-time params to the content's
// `renderContent`, and each screen narrows its own params in its own
// hook. The type used to declare a phantom `<T extends SectionRouteKey>`
// that the body never used; a type parameter that constrains nothing
// is a lie about what the type guarantees, so it is gone.
export type SectionRouteParams = Readonly<Record<string, unknown>>;
