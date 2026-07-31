// ─── Local Video ↔ TVMaze Episode Matcher ──────────────────────────────
// Phase 38.4: enrich local video files with TVMaze episode metadata by
// matching filenames like "Show.Name.S01E02.mkv" or
// "Show Name - S01E02 - Episode Title.mp4" against episodes.

interface EpisodeRef {
  season: number;
  episode: number;
  showHint: string;
}

const EPISODE_PATTERN = /[Ss](\d{1,2})[Ee](\d{1,3})/;

/** Strip extension, collapse separators, lowercase — for fuzzy compare. */
export function normalizeTitle(input: string): string {
  return input
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Parse "S01E02" from a filename; null when no episode marker exists. */
export function parseEpisodeReference(fileName: string): EpisodeRef | null {
  const match = fileName.match(EPISODE_PATTERN);
  if (!match) return null;
  const season = parseInt(match[1], 10);
  const episode = parseInt(match[2], 10);
  const showHint = fileName
    .replace(EPISODE_PATTERN, ' ')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[._-]+/g, ' ')
    .trim();
  return {season, episode, showHint};
}

/** Does this filename belong to the given show (fuzzy name containment)? */
export function fileNameMatchesShow(fileName: string, showName: string): boolean {
  const ref = parseEpisodeReference(fileName);
  if (!ref || !ref.showHint) return false;
  const showNorm = normalizeTitle(showName);
  if (showNorm.length < 3) return false;
  const hintNorm = normalizeTitle(ref.showHint);
  return hintNorm.includes(showNorm) || showNorm.includes(hintNorm);
}

/** Does this filename represent the exact episode (season + number)? */
export function fileNameMatchesEpisode(
  fileName: string,
  season: number,
  episodeNumber: number,
): boolean {
  const ref = parseEpisodeReference(fileName);
  if (!ref) return false;
  return ref.season === season && ref.episode === episodeNumber;
}
