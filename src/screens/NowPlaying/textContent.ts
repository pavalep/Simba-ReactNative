/**
 * Now Playing screen — compact player with seek bar, transport, and empty/error states.
 */
const textContent = {
  headerTitle: 'Now Playing',
  emptyTitle: 'No Track Playing',
  emptyDesc: 'Open a file from the player or search to start listening.',
  errorTitle: 'Failed to load now playing.',
  retry: 'Retry',
  retryA11y: 'Retry loading',
  unknownTrack: 'Unknown Track',
  unknownArtist: 'Unknown Artist',
  prevA11y: 'Previous track',
  nextA11y: 'Next track',
  pauseA11y: 'Pause',
  playA11y: 'Play',
  seekA11y: 'Seek position, {percent} percent',
  openFullPlayer: 'Open Full Player',
  openFullPlayerA11y: 'Open full player',
  nowPlayingA11y: 'Now playing: {title}',
} as const;

export default textContent;
