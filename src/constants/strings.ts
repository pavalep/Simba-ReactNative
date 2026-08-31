// ────────────────────────────────────────────────────────────
// Simba Player — All User-Facing Strings (i18n Foundation)
// ────────────────────────────────────────────────────────────
// Centralize every hardcoded string so components never embed
// literal text.  To add a locale, copy this file and swap values.

const strings = {
  // ── Global / Generic ──
  appName: 'Simba Player',
  unknown: 'Unknown',
  untitled: 'Untitled',
  retry: 'Retry',
  cancel: 'Cancel',
  done: 'Done',
  close: 'Close',
  create: 'Create',
  save: 'Save',
  delete: 'Delete',
  loading: 'Loading',
  error: 'Error',
  noResults: 'No results found',
  noResultsHint: 'Try a different search term or browse your library.',
  tryAgain: 'Try Again',
  goBack: 'Go Back',
  openSettings: 'Open Settings',
  dismiss: 'Dismiss',

  // ── Tab bar ──
  tabHome: 'Home',
  tabLibrary: 'Library',
  tabSettings: 'Settings',

  // ── Home Screen ──
  homeTitle: 'Home',
  homeGreeting: 'Good {timeOfDay}',
  homeFeatured: 'Featured',
  homeRecentlyPlayed: 'Recently Played',
  homeContinueWatching: 'Continue Watching',
  homeSearchPlaceholder: 'Search media…',
  homeNoRecent: 'No recently played items',
  homeNoRecentHint: 'Start playing something to see it here.',

  // ── Library Screen ──
  libraryTitle: 'Library',
  libraryAudio: 'Audio',
  libraryVideo: 'Video',
  libraryPlaylists: 'Playlists',
  libraryFolders: 'Folders',
  libraryArtists: 'Artists',
  libraryAlbums: 'Albums',
  libraryNoAudio: 'No audio files found',
  libraryNoAudioHint: 'Add a linked folder in Settings to get started.',
  libraryNoVideo: 'No video files found',
  libraryNoVideoHint: 'Add a linked folder in Settings to get started.',
  libraryNoPlaylists: 'No playlists yet',
  libraryNoPlaylistsHint: 'Create one to start organizing your media.',
  libraryScanning: 'Scanning…',
  libraryScanError: 'Scan failed',
  libraryScanErrorHint: 'Something went wrong during the scan.',
  librarySearchResults: 'Search Results',
  libraryFoldersNoFolders: 'No linked folders',
  libraryFoldersNoFoldersHint: 'Add linked folders in Settings to browse them here.',
  libraryEmptyFolder: 'This folder is empty',
  libraryEmptyFolderHint: 'No media files found in this folder.',
  libraryCreatePlaylist: 'Create Playlist',
  libraryAddToPlaylist: 'Add to Playlist',
  libraryGridLayout: 'Grid view',
  libraryListLayout: 'List view',

  // ── Settings Screen ──
  settingsTitle: 'Settings',
  settingsAudio: 'Audio',
  settingsVideo: 'Video',
  settingsGeneral: 'General',
  settingsPlayback: 'Playback',
  settingsAppearance: 'Appearance',
  settingsAbout: 'About',
  settingsLinkedFolders: 'Linked Folders',
  settingsAddFolder: 'Add Folder',
  settingsRemoveFolder: 'Remove Folder',
  settingsFolderAdded: 'Folder added successfully',
  settingsFolderRemoved: 'Folder removed successfully',
  settingsClearHistory: 'Clear History',
  settingsClearHistoryConfirm: 'Are you sure you want to clear your playback history?',
  settingsClearCache: 'Clear Cache',
  settingsAboutVersion: 'Version',
  settingsAboutBuild: 'Build',
  settingsAboutLicenses: 'Licenses',
  settingsTheme: 'Theme',
  settingsThemeDark: 'Dark',
  settingsThemeLight: 'Light',
  settingsThemeSystem: 'System',
  settingsRememberPosition: 'Remember Playback Position',
  settingsRememberPositionDesc: 'Resume from where you left off',
  settingsMpvConfig: 'MPV Configuration',
  settingsMpvConfigDesc: 'Advanced mpv player options',
  settingsHapticFeedback: 'Haptic Feedback',
  settingsHapticFeedbackDesc: 'Vibration on interactions',
  settingsScanMedia: 'Scan Media',
  settingsLanguage: 'Language',
  settingsLanguageDesc: 'App display language',

  // ── Search ──
  searchTitle: 'Search',
  searchPlaceholder: 'Search tracks, artists, albums…',
  searchNoResults: 'No results found',
  searchNoResultsHint: 'Try a different search term.',
  searchTracks: 'Tracks',
  searchArtists: 'Artists',
  searchAlbums: 'Albums',
  searchPlaylists: 'Playlists',
  searchFolders: 'Folders',

  // ── Player — Audio ──
  audioPlayerTitle: 'Now Playing',
  audioNoTrack: 'No Track Playing',
  audioNoTrackHint: 'Open a file from the player or search to start listening.',
  audioTrackInfo: 'Track info',
  audioAddToFavorites: 'Add to Favorites',
  audioRemoveFromFavorites: 'Remove from Favorites',
  audioToggleShuffle: 'Toggle shuffle',
  audioPreviousTrack: 'Previous track',
  audioPlay: 'Play',
  audioPause: 'Pause',
  audioNextTrack: 'Next track',
  audioToggleLoopMode: 'Toggle loop mode',
  audioVolumeDown: 'Volume down',
  audioVolumeUp: 'Volume up',
  audioNowPlaying: 'Now Playing',
  audioPaused: 'Paused',
  audioNoMediaPlaying: 'No media playing',
  audioOpenFullPlayer: 'Open Full Player',

  // ── Player — Video ──
  videoPlayerTitle: 'Video Player',
  videoGoBack: 'Go back',
  videoMoreOptions: 'More options',
  videoToggleRotation: 'Toggle rotation',
  videoToggleVolume: 'Toggle volume',
  videoEqualizer: 'Equalizer',
  videoPlaylist: 'Playlist',
  videoShuffle: 'Shuffle',
  videoLoop: 'Loop',
  videoScreenshot: 'Screenshot',
  videoSubtitles: 'Subtitles',
  videoAudioTrack: 'Audio track',
  videoExpandPlayer: 'Expand player',
  // v11 T8.3: fullscreen rotate affordance — two labels for
  // the same button depending on the current state. Toggling
  // the button swaps both the icon (expand / collapse) AND
  // the label so VoiceOver / TalkBack read the right
  // affordance in each state.
  videoEnterFullscreen: 'Enter fullscreen',
  videoExitFullscreen: 'Exit fullscreen',
  videoFullscreenFailed: 'Could not enter fullscreen',
  // v11 T10.1: utility-row copy keys. The bookmark chip flips
  // between Add / Remove based on whether the current position
  // is bookmarked.
  videoBookmarkAdd: 'Save bookmark',
  videoBookmarkRemove: 'Remove bookmark',
  videoEnterPip: 'Enter picture in picture',
  // v11 T9.1: 2 s auto-clear hint after the user unlocks the
  // player. Lives in the status-pill area; the fade animation
  // keeps the visual noise low.
  controlsUnlockedHint: 'Controls unlocked',
  // v11 T9.2: resume prompt. The {time} placeholder is replaced
  // at render time with the saved bookmark position formatted
  // as H:MM:SS.
  videoResumeTitle: 'Resume playback?',
  videoResumeSubtitle: 'Continue from {time}',
  videoResumeAction: 'Resume',
  videoStartOverAction: 'Start over',
  videoErrorTitle: 'Playback Error',
  videoErrorMessage: 'Failed to play this video.',
  videoErrorPermission: 'Permission Denied',
  videoErrorPermissionHint: 'The app does not have permission to access this file.',
  videoLiveStream: 'Live',
  videoClosePlayer: 'Close video player',
  lockControls: 'Lock controls',
  unlockControls: 'Unlock controls',

  // ── Player — VideoStatusPill (v11) ──
  // One loading surface, six copy keys. Routing through strings.ts so
  // the pill component never embeds literal text (spec §8 copy table).
  // The buffering label takes a single {pct} placeholder; the rest are
  // verbatim.
  videoPillPreparing: 'Preparing video',
  videoPillBuffering: 'Buffering · {pct}%',
  videoPillSeeking: 'Seeking',
  videoPillReconnecting: 'Reconnecting',
  videoPillErrorWatchdog: 'Video did not produce a first frame. Check the connection and retry.',
  videoPillRetryLabel: 'Retry loading the video',
  videoPillRetryHint: 'Retries loading the video from the current source.',

  // ── Player — VideoCenterAction (v11) ──
  // The 96×96 play/pause/replay button centred on the video rect.
  // Hint copy lives in §4.3 and the copy table §8.
  videoCenterActionPlay: 'Play',
  videoCenterActionPause: 'Pause',
  videoCenterActionReplay: 'Replay',
  videoCenterActionRetry: 'Retry loading the video',
  videoCenterHintEnded: 'Play from beginning',
  videoCenterHintError: 'Try loading the video again',

  // ── Queue ──
  queueTitle: 'Queue',
  queueNowPlaying: 'Now Playing',
  queueUpNext: 'Up Next',
  queuePreviouslyPlayed: 'Previously Played',
  queueEmpty: 'Queue is empty',
  queueEmptyHint: 'Songs you add to the queue will appear here',
  queueSelectItems: 'Select items to batch operate',
  queueItemsSelected: '{count} selected',
  queueRemove: 'Remove',
  queueMoveToTop: 'Move to Top',
  queueClearAll: 'Clear All',
  queueClearQueue: 'Clear Queue',
  queueSelect: 'Select',
  queueMoveUp: 'Move up',
  queueMoveDown: 'Move down',
  queueRemoveFromQueue: 'Remove from queue',
  queuePlayNext: 'Play Next',
  queueAddToQueue: 'Add to Queue',

  // ── Playlists ──
  playlistTitle: 'Playlists',
  playlistSelect: 'Select a Playlist',
  playlistSelectHint: 'Choose a playlist to add the current track',
  playlistCreate: 'Create New Playlist',
  playlistCreateTitle: 'New Playlist',
  playlistNamePlaceholder: 'Playlist name',
  playlistType: 'Type:',
  playlistKindAudio: 'Audio',
  playlistKindVideo: 'Video',
  playlistKindMixed: 'Mixed',
  playlistAddedTo: 'Added to "{name}"',
  playlistRemovedFrom: 'Removed from "{name}"',
  playlistCreated: 'Created "{name}"',
  playlistNoPlaylists: 'No playlists yet. Create one to get started.',
  playlistItemCount: '{count} items',
  playlistItemCountSingle: '{count} item',
  playlistDeleteConfirm: 'Delete this playlist?',
  playlistEdit: 'Edit Playlist',
  playlistDetails: 'Playlist Details',

  // ── Bottom Sheet ──
  sheetClosePanel: 'Close panel',

  // ── Toast ──
  toastDismiss: 'Dismiss',

  // ── Errors ──
  errorGeneral: 'Something went wrong.',
  errorTryAgain: 'Please try again.',
  errorNetwork: 'Network error. Check your connection.',
  errorFileNotFound: 'File not found.',
  errorFileNotFoundHint: 'The file may have been moved or deleted.',
  errorPermissionDenied: 'Permission Denied',
  errorPermissionDeniedHint: 'The app does not have permission to access this file.',
  errorPlayerInit: 'Failed to initialize player.',
  errorPlayerInitHint: 'The media file may be corrupted or in an unsupported format.',
  errorDecode: 'Failed to decode media.',
  errorDecodeHint: 'This file format may not be supported.',
  errorUnknown: 'An unknown error occurred.',

  // ── Splash ──
  splashSubtitle: 'Experience premium media playback',
  splashGetStarted: 'Get Started',
  splashScanning: 'Scanning your media…',

  // ── Accessibility labels (used as fallback / compound) ──
  a11yPlayPause: '{state}, {title}',
  a11yTrackPosition: 'Position {current} of {total}',
  a11ySeekBar: 'Playback seek bar, {progress} percent',
  a11yNowPlaying: 'Now playing {title} by {artist}',
  a11yTabHome: 'Home, {count} items',
  a11yTabLibrary: 'Library',
  a11yTabSettings: 'Settings',
  a11yVolumeLevel: 'Volume {level} percent',
} as const;

export type StringKey = keyof typeof strings;
export default strings;
