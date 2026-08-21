/**
 * Artist Detail screen (Library) — discography, biography placeholder, and all tracks.
 */
const textContent = {
  headerTitle: 'Artist',
  albumSingular: 'album',
  albumPlural: 'albums',
  trackSingular: 'track',
  trackPlural: 'tracks',
  bioPlaceholder:
    'Artist information is not yet available. Metadata will be enriched as more files are scanned.',
  sectionDiscography: 'Discography',
  sectionAllTracks: 'All Tracks',
  yearSeparator: ' · ',
  durationFallback: '--:--',
} as const;

export default textContent;
