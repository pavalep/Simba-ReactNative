// ─── Browse All — SectionRouteKey type ───────────────────────────────
// The union of all Home Discover destinations — used by BrowseAllShelf to
// type the per-section entries. `LocalFiles` is a nested shell destination
// rather than a root-stack screen, so Home resolves it explicitly.

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