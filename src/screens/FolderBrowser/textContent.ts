/**
 * Folder Browser screen — filesystem navigation, multi-select, and playlist insert.
 */
const textContent = {
  headerTitle: 'Folder Browser',
  selectedSubtitle: '{n} Selected',
  cancel: 'Cancel',
  select: 'Select',
  homeLabel: 'Home',
  breadcrumbSeparator: '/',
  errorSubtitle: 'Pull down to retry',
  emptyTitle: 'This folder is empty',
  emptyDesc: 'No media files or subfolders found.',
  folderLabel: 'folder',
  errorFallback: 'Unable to read directory',
  addToPlaylist: 'Add to Playlist ({n})',
  toastAdded: 'Added {n} items to {name}',
  toastAddedQuoted: 'Added {n} items to "{name}"',
} as const;

export default textContent;
