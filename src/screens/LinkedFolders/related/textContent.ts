/**
 * Linked Folders screen — manage video/audio source folders with scan and remove.
 */
const textContent = {
  titleVideo: 'Video Folders',
  titleAudio: 'Audio Folders',

  scanAll: 'Scan All',
  scanAllDisabled: 'Scanning...',

  emptyTitle: 'No {type} folders linked yet.',
  emptyHint: 'Tap "Add Folder" below to link your first folder.',

  addFolder: 'Add Folder',
  removeFolder: 'Remove',

  rescanLabel: 'Rescan',
  filesCount: '{count} file{s}',

  neverScanned: 'Never scanned',
  scannedJustNow: 'Just now',
  scannedAgo: '{value}{unit} ago',

  errorLoad: 'Failed to load folders.',
  retry: 'Retry',
} as const;

export default textContent;
