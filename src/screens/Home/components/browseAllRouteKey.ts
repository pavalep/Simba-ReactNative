// ─── Browse All — SectionRouteKey type ───────────────────────────────
// The union of all 8 Home section routes — used by BrowseAllShelf to
// type the per-section entries. Defined here (next to BrowseAllShelf)
// rather than in a shared `sections/` folder, in keeping with the
// per-screen-owns-its-shell rule. Each individual screen's `browse/
// types.ts` also exports its own (narrower) SectionRouteKey union.

export type SectionRouteKey =
  | 'MoviesScreen'
  | 'MusicScreen'
  | 'RadioScreen'
  | 'LiveTVScreen'
  | 'AudiobooksScreen'
  | 'PodcastsScreen'
  | 'ShowsScreen'
  | 'ArchiveScreen';