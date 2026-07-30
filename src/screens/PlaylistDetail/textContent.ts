/**
 * Playlist Detail screen — items list, rename, export, clear, and delete actions.
 */
const textContent = {
  addToPlaylist: 'Add to Playlist',
  addToPlaylistMsg: 'Media picking flow would open here.',
  playlistOptions: 'Playlist Options',
  renamePlaylist: 'Rename Playlist',
  exportM3U: 'Export as M3U',
  exportJSON: 'Export as JSON',
  clearAllItems: 'Clear All Items',
  clearPlaylist: 'Clear Playlist',
  clearPlaylistMsg: 'Remove all {count} items from "{name}"?',
  clearAll: 'Clear All',
  deletePlaylist: 'Delete Playlist',
  cancel: 'Cancel',
  removeItems: 'Remove Items',
  removeItemsMsg: 'Remove {count} selected item{plural}?',
  remove: 'Remove',
  playAll: 'Play All',
  playAllA11y: 'Play all',
  addMediaA11y: 'Add media to playlist',
  add: 'Add',
  playlistOptionsA11y: 'Playlist options',
  emptyTitle: 'Empty Playlist',
  emptyDesc: 'This playlist is empty. Add media to get started.',
  emptyAction: 'Add Media',
  durationFallback: '--:--',
  goBackA11y: 'Go back',
  itemsCount: '{count} item{plural}',
  selectA11y: 'Select',
  deselectA11y: 'Deselect',
  playA11y: 'Play',
  moveUpA11y: 'Move up',
  moveDownA11y: 'Move down',
} as const;

export default textContent;
