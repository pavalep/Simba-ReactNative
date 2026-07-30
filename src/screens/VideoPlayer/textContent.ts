/**
 * VideoPlayer screen — mpv playback surface with error/loading overlays and controls a11y.
 */
const textContent = {
  errorLoading: 'Error loading video',
  retry: 'Retry',
  close: 'Close',
  loading: 'Loading…',
  goBackA11y: 'Go back',
  moreOptionsA11y: 'More options',
  bookmarkA11y: 'Bookmark this position',
  rotationA11y: 'Toggle rotation',
} as const;

export default textContent;
