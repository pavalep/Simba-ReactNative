/**
 * Placeholder image assets for recent media items.
 * Used when no real thumbnail is captured for a file.
 *
 * Images downloaded from Pexels (royalty-free, no attribution required).
 */

export const VIDEO_PLACEHOLDERS: readonly number[] = [
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/images/placeholders/video/film_reel.jpg'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/images/placeholders/video/cinema.jpg'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/images/placeholders/video/camera.jpg'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/images/placeholders/video/movies.jpg'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/images/placeholders/video/shows.jpg'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/images/placeholders/video/director.jpg'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/images/placeholders/video/documentary.jpg'),
];

export const AUDIO_PLACEHOLDERS: readonly number[] = [
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/images/placeholders/audio/concert.jpg'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/images/placeholders/audio/headphones.jpg'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/images/placeholders/audio/studio.jpg'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/images/placeholders/audio/mic.jpg'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/images/placeholders/audio/vinyl.jpg'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/images/placeholders/audio/piano.jpg'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/images/placeholders/audio/guitar.jpg'),
];

/**
 * Deterministically pick a placeholder for a given entry.
 * Uses the fileUri hash so the same file always shows the same image.
 */
export function pickVideoPlaceholder(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return VIDEO_PLACEHOLDERS[Math.abs(hash) % VIDEO_PLACEHOLDERS.length];
}

export function pickAudioPlaceholder(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return AUDIO_PLACEHOLDERS[Math.abs(hash) % AUDIO_PLACEHOLDERS.length];
}

/** Display title for a placeholder by index. */
export const VIDEO_TITLES: readonly string[] = [
  'Late Night Cinema',
  'Director\u2019s Cut',
  'Indie Spotlight',
  'Classic Reels',
  'Behind the Scenes',
  'Documentary Picks',
  'Show Reels',
];

export const AUDIO_TITLES: readonly string[] = [
  'Live Sessions',
  'Studio Notes',
  'Vinyl Hours',
  'After Hours',
  'Piano Works',
  'Mic Check',
  'Late Set',
];

export function getVideoTitle(index: number): string {
  return VIDEO_TITLES[index % VIDEO_TITLES.length];
}

export function getAudioTitle(index: number): string {
  return AUDIO_TITLES[index % AUDIO_TITLES.length];
}
