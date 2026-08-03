# Graph Report - .  (2026-08-02)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2741 nodes · 7813 edges · 169 communities (135 shown, 34 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 67 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8a008156`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- RootNavigator.tsx
- AppText.tsx
- SvgIcon
- main.cpp
- MediaNotificationService
- useTheme
- SettingsStack.tsx
- useLibraryScreen.ts
- ArtistScreen.tsx
- index.tsx
- useAppSelector
- FolderBrowserScreen.tsx
- store/index.ts
- services/index.ts
- devDependencies
- fileService.ts
- internetArchiveService.ts
- downloadService.ts
- dependencies
- jamendoService.ts
- QueueScreen.tsx
- apiClient.ts
- MPVLib
- AppText
- ArtistDetailScreen.tsx
- useBookmarks
- mediaSlice.ts
- ColorTokens
- BottomSheet.tsx
- MpvBridgeModule
- AudioPlayer.tsx
- QueueSheet.tsx
- types.ts
- useAccessibility
- InfoSheet.tsx
- useVideoPlayerScreen.ts
- MpvRenderView
- useNetworkStatus
- types/api.ts
- AudiobooksScreen.tsx
- App.tsx
- AudioSubMenu.tsx
- PreferencesScreenMockup.tsx
- generate-inapp-logo.js
- src/components/index.ts
- Dialog.tsx
- SubtitleStyleDialog.tsx
- PlaylistDetailScreen.tsx
- VideoPlayer.tsx
- DownloadButton.tsx
- useAuth
- AppDelegate
- native/index.ts
- podcastIndexService.ts
- useSongScreen.ts
- RemoteResults.tsx
- authService.ts
- useLiveTVScreen.ts
- SearchScreen.tsx
- ProfileScreen.tsx
- notificationService.ts
- SettingsScreen.tsx
- SplashActivity
- package.json
- generate-icons.js
- VideoPlayerScreen.tsx
- ErrorBoundary.tsx
- TabNavigator.tsx
- tsconfig.json
- useShowDetailScreen.ts
- MiniAudioPlayer.tsx
- VideoPlayerSubtitlePanel.tsx
- ArchiveScreen.tsx
- mark
- download-icons.js
- utils/animations.ts
- timeAgo.ts
- intelligenceEngine.ts
- MpvEventListener
- LinkedFoldersScreen.tsx
- eslint-sweep.js
- VideoPlayerGestureLayer.tsx
- VideoPlayerSurfaceLayer.tsx
- ChapterBrowser.tsx
- SeekBar.tsx
- constants/api.ts
- MainApplication
- getillustrations
- AudioSeekBar.tsx
- EventBus
- server.js
- PlayerErrorFallback.tsx
- AudioPlayer/AudioAlbumArt.tsx
- SeekFeedbackOverlay.tsx
- RootStackParamList
- AlbumArtBackground.tsx
- VideoPlayerSpeedPanel.tsx
- SessionService
- MpvBridgeModule.kt
- gradlew
- metro.config.js
- explore-api.mjs
- mcp-client.mjs
- search-icons.mjs
- OptionSheetDialog.tsx
- ScreenContainer.tsx
- VideoControlsOverlay.tsx
- VideoPlayerVolumePanel.tsx
- react-native-haptic-feedback.js
- @react-native-community/blur
- strings.ts
- .loadPlaylist
- .nativeAttachSurface
- axios
- react-native
- @react-native-community/slider
- react-native-fast-image
- react-native-haptic-feedback
- @react-native/babel-preset
- sharp
- AudioPlayer/textContent.ts
- AudioSettings/textContent.ts
- FolderBrowser/textContent.ts
- Home/textContent.ts
- albumDetailTextContent.ts
- artistDetailTextContent.ts
- LinkedFolders/textContent.ts
- Login/textContent.ts
- NowPlaying/textContent.ts
- PlaylistDetail/textContent.ts
- Search/textContent.ts
- Settings/textContent.ts
- Splash/textContent.ts
- VideoPlayer/textContent.ts
- svg.d.ts
- types/textContent.ts

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 347 edges
2. `AppText()` - 181 edges
3. `spacing` - 117 edges
4. `SvgIcon()` - 116 edges
5. `useAppSelector` - 110 edges
6. `radius` - 107 edges
7. `useAppDispatch()` - 81 edges
8. `MpvBridgeModule` - 73 edges
9. `ColorTokens` - 61 edges
10. `useAccessibility()` - 47 edges

## Surprising Connections (you probably didn't know these)
- `AppContent()` --calls--> `useTheme()`  [EXTRACTED]
  App.tsx → src/theme/index.tsx
- `AppContent()` --calls--> `mark()`  [EXTRACTED]
  App.tsx → src/utils/startupPerf.ts
- `onRehydrated()` --calls--> `mark()`  [EXTRACTED]
  App.tsx → src/utils/startupPerf.ts
- `AppText()` --references--> `react`  [EXTRACTED]
  src/components/core/AppText/AppText.tsx → package.json
- `AudioTransportDependentContent()` --references--> `react`  [EXTRACTED]
  src/components/player/AudioPlayer/AudioPlayer.tsx → package.json

## Import Cycles
- 3-file cycle: `src/store/index.ts -> src/store/rootReducer.ts -> src/store/slices/liveFavoritesSlice.ts -> src/store/index.ts`
- 3-file cycle: `src/store/index.ts -> src/store/rootReducer.ts -> src/store/slices/followedPodcastsSlice.ts -> src/store/index.ts`
- 3-file cycle: `src/store/index.ts -> src/store/rootReducer.ts -> src/store/slices/pipSlice.ts -> src/store/index.ts`
- 3-file cycle: `src/store/index.ts -> src/store/rootReducer.ts -> src/store/slices/bookmarkSlice.ts -> src/store/index.ts`
- 3-file cycle: `src/store/index.ts -> src/store/rootReducer.ts -> src/store/slices/downloadsSlice.ts -> src/store/index.ts`
- 3-file cycle: `src/store/index.ts -> src/store/rootReducer.ts -> src/store/slices/mediaSlice.ts -> src/store/index.ts`
- 3-file cycle: `src/store/index.ts -> src/store/rootReducer.ts -> src/store/slices/playlistSlice.ts -> src/store/index.ts`
- 3-file cycle: `src/store/index.ts -> src/store/rootReducer.ts -> src/store/slices/sessionSlice.ts -> src/store/index.ts`
- 4-file cycle: `src/store/index.ts -> src/store/persistConfig.ts -> src/store/rootReducer.ts -> src/store/slices/liveFavoritesSlice.ts -> src/store/index.ts`
- 4-file cycle: `src/store/index.ts -> src/store/persistConfig.ts -> src/store/rootReducer.ts -> src/store/slices/followedPodcastsSlice.ts -> src/store/index.ts`
- 4-file cycle: `src/store/index.ts -> src/store/persistConfig.ts -> src/store/rootReducer.ts -> src/store/slices/pipSlice.ts -> src/store/index.ts`
- 4-file cycle: `src/store/index.ts -> src/store/persistConfig.ts -> src/store/rootReducer.ts -> src/store/slices/bookmarkSlice.ts -> src/store/index.ts`
- 4-file cycle: `src/store/index.ts -> src/store/persistConfig.ts -> src/store/rootReducer.ts -> src/store/slices/downloadsSlice.ts -> src/store/index.ts`
- 4-file cycle: `src/store/index.ts -> src/store/persistConfig.ts -> src/store/rootReducer.ts -> src/store/slices/mediaSlice.ts -> src/store/index.ts`
- 4-file cycle: `src/store/index.ts -> src/store/persistConfig.ts -> src/store/rootReducer.ts -> src/store/slices/playlistSlice.ts -> src/store/index.ts`
- 4-file cycle: `src/store/index.ts -> src/store/persistConfig.ts -> src/store/rootReducer.ts -> src/store/slices/sessionSlice.ts -> src/store/index.ts`

## Communities (169 total, 34 thin omitted)

### Community 0 - "RootNavigator.tsx"
Cohesion: 0.04
Nodes (81): GoogleSignInButtonProps, ActivityOrb(), ActivityOrbProps, ErrorState(), styles, ScreenErrorBoundary(), useToast(), InternalHeader() (+73 more)

### Community 1 - "AppText.tsx"
Cohesion: 0.04
Nodes (82): AppTextProps, TokenColorKey, variantMap, HomeHeader(), HomeHeaderProps, styles, styles, SectionHeader() (+74 more)

### Community 2 - "SvgIcon"
Cohesion: 0.05
Nodes (53): BookmarkList(), formatTime(), styles, styles, SearchBar(), SearchBarProps, styles, EmptyState() (+45 more)

### Community 3 - "main.cpp"
Cohesion: 0.10
Nodes (63): callJavaEvent(), callJavaPropertyChanged(), eventLoop(), callStaticJavaVoid(), jclass, jlong, JNIEnv, JNIEXPORT (+55 more)

### Community 4 - "MediaNotificationService"
Cohesion: 0.05
Nodes (29): Bundle, Intent, MainActivity, buildActionIntent(), buildContentIntent(), Context, Intent, MediaNotificationService (+21 more)

### Community 5 - "useTheme"
Cohesion: 0.05
Nodes (47): BookmarkButton(), Props, styles, createStyles(), OperationProgress(), OperationProgressProps, ProgressBar(), SearchResultItem (+39 more)

### Community 6 - "SettingsStack.tsx"
Cohesion: 0.04
Nodes (39): OptionSheetDialog(), SettingsStack(), Stack, ChangelogScreenProps, CreditsScreenProps, HelpScreenProps, LicensesScreenProps, PrivacyScreenProps (+31 more)

### Community 7 - "useLibraryScreen.ts"
Cohesion: 0.05
Nodes (41): formatLastScan(), ScanProgressBanner(), ScanProgressBannerProps, styles, KIND_LABELS, PlaylistCard(), PlaylistCardProps, styles (+33 more)

### Community 8 - "ArtistScreen.tsx"
Cohesion: 0.05
Nodes (43): styles, ToastContent(), ToastContext, ToastContextValue, ToastMessage, ToastProvider(), ToastType, AudioWaveform() (+35 more)

### Community 9 - "index.tsx"
Cohesion: 0.07
Nodes (36): PlaylistPreviewSheet(), PlaylistPreviewSheetProps, styles, QueueManagementSheet(), QueueManagementSheetProps, styles, styles, SettingsRowProps (+28 more)

### Community 10 - "useAppSelector"
Cohesion: 0.08
Nodes (35): useMiniPlayer(), formatTime(), MiniPlayer(), GlobalOperationProgress(), ChapterRange, TransportContext, TransportContextValue, TransportProvider() (+27 more)

### Community 11 - "FolderBrowserScreen.tsx"
Cohesion: 0.08
Nodes (30): PlaylistContextMenu(), PlaylistContextMenuProps, styles, KIND_LABELS, KIND_OPTIONS, PlaylistCreateModal(), PlaylistCreateModalProps, styles (+22 more)

### Community 12 - "store/index.ts"
Cohesion: 0.07
Nodes (30): FollowedPodcastsShelfProps, Props, getGreeting(), HomeSection, isInProgress(), useHomeScreen(), AppDispatch, persistedReducer (+22 more)

### Community 13 - "services/index.ts"
Cohesion: 0.08
Nodes (30): getAudio(), getVideos(), scanAllLinkedFolders(), scanFolder(), searchMedia(), sortMedia(), SortOption, MediaService (+22 more)

### Community 14 - "devDependencies"
Cohesion: 0.05
Nodes (41): @babel/core, @babel/preset-env, @babel/runtime, eslint, @getillustrations/mcp-server, jest, devDependencies, @babel/core (+33 more)

### Community 15 - "fileService.ts"
Cohesion: 0.06
Nodes (36): FolderLinkingWizardScreenProps, createStyles(), DirEntry, FOLDER_TYPE_OPTIONS, FolderLinkingWizard(), FolderType, Props, STEPS (+28 more)

### Community 16 - "internetArchiveService.ts"
Cohesion: 0.09
Nodes (34): MOVIE_CATEGORIES, MovieCategory, useArchiveItemDetailScreen(), UseArchiveItemDetailScreenReturn, AudiobookDetailScreen(), formatTime(), useAudiobookDetailScreen(), UseAudiobookDetailScreenReturn (+26 more)

### Community 17 - "downloadService.ts"
Cohesion: 0.11
Nodes (31): useCachedArt(), artFilePath(), cacheArt(), getCachedArtPath(), getCachedArtPathSync(), memoryCache, pruneArtCache(), remember() (+23 more)

### Community 18 - "dependencies"
Cohesion: 0.05
Nodes (39): dependencies, @react-native-async-storage/async-storage, @react-native-clipboard/clipboard, @react-native-documents/picker, react-native-fs, @react-native-google-signin/google-signin, react-native-linear-gradient, react-native-mmkv (+31 more)

### Community 19 - "jamendoService.ts"
Cohesion: 0.10
Nodes (34): MusicTrackDisplayItem, useMusicScreen(), MusicScreen(), TrackCardProps, AggregatedSearch, EMPTY, useAggregatedSearch(), AudiusListResponse (+26 more)

### Community 20 - "QueueScreen.tsx"
Cohesion: 0.06
Nodes (29): AppButton(), AppButtonProps, ButtonSize, ButtonVariant, sizeConfig, styles, WaveformBars(), WaveformBarsProps (+21 more)

### Community 21 - "apiClient.ts"
Cohesion: 0.11
Nodes (30): MOOD_COLLECTIONS, MoodCollection, GenreBrowseTab, useGenreScreen(), UseGenreScreenResult, RadioBrowseMode, useRadioScreen(), ApiError (+22 more)

### Community 23 - "AppText"
Cohesion: 0.07
Nodes (27): AppCard(), AppCardProps, styles, AppText(), EqualizerScreenProps, Props, styles, AlbumGrid() (+19 more)

### Community 24 - "ArtistDetailScreen.tsx"
Cohesion: 0.11
Nodes (30): StreamingRow, StreamingRowProps, styles, useMoreFromArtist(), AlbumDetailScreen(), AlbumDetailScreenProps, formatDuration(), formatTotalDuration() (+22 more)

### Community 25 - "useBookmarks"
Cohesion: 0.12
Nodes (29): BookmarkItem(), formatRelativeDate(), formatTime(), Props, styles, Props, Section, BookmarkSheet() (+21 more)

### Community 26 - "mediaSlice.ts"
Cohesion: 0.08
Nodes (29): RelatedTabProps, VideoPlayerHookData, displayNameFromPath(), isVideoExtension(), SearchResultGroup, useSearch(), UseSearchReturn, selectAudioTracks (+21 more)

### Community 28 - "ColorTokens"
Cohesion: 0.07
Nodes (23): AudioActionRowProps, Props, ART_SIZE, Props, styles, Props, styles, AudioPlayerHeader() (+15 more)

### Community 29 - "BottomSheet.tsx"
Cohesion: 0.10
Nodes (23): BottomSheet(), BottomSheetProps, styles, BottomSheetBackdrop(), BottomSheetBackdropProps, styles, useAutoHideControls(), parseSnapPoint() (+15 more)

### Community 30 - "MpvBridgeModule"
Cohesion: 0.06
Nodes (3): MpvBridgeModule, DeviceEventManagerModule, ReactContextBaseJavaModule

### Community 31 - "AudioPlayer.tsx"
Cohesion: 0.08
Nodes (26): AudioLyricsView(), AudioLyricsViewEntry, AudioLyricsViewProps, TabType, {width: SCREEN_WIDTH}, AudioActionRow(), AudioGradientBg(), AudioGradientBgProps (+18 more)

### Community 32 - "QueueSheet.tsx"
Cohesion: 0.10
Nodes (27): AudioQueuePeek(), AudioQueuePeekProps, styles, MediaAction, QueueDragHandle(), QueueDragHandleProps, styles, formatDuration() (+19 more)

### Community 33 - "types.ts"
Cohesion: 0.09
Nodes (30): LibraryStack(), Stack, AboutScreenProps, AlbumDetailScreenProps, ArchiveItemDetailScreenProps, ArtistDetailScreenProps, AudiobookDetailScreenProps, AudioChapterParam (+22 more)

### Community 34 - "useAccessibility"
Cohesion: 0.10
Nodes (22): createStyles(), GoogleSignInButton(), PulseRing(), PulseRingProps, AudioVisualizer(), AudioVisualizerProps, BASE_PEAKS, BufferingBar() (+14 more)

### Community 35 - "InfoSheet.tsx"
Cohesion: 0.09
Nodes (26): AudioPlayerHookData, AudioSubMenuProps, Chapter, ChapterList(), ChapterListProps, formatDuration(), formatTime(), styles (+18 more)

### Community 36 - "useVideoPlayerScreen.ts"
Cohesion: 0.18
Nodes (24): useHaptics(), usePipEntry(), ErrorLogEntry, logError(), MpvPlayer, Props, useAudioPlayerScreen(), useQueueScreen() (+16 more)

### Community 37 - "MpvRenderView"
Cohesion: 0.10
Nodes (12): MpvPlayerPackage, Surface, MpvRenderView, MpvRenderViewManager, NativeModule, ReactApplicationContext, ReactPackage, SimpleViewManager (+4 more)

### Community 38 - "useNetworkStatus"
Cohesion: 0.14
Nodes (21): PODCAST_CATEGORIES, PodcastCategory, useDebounce(), NetworkStatus, useNetworkStatus(), ArchiveTab, useArchiveScreen(), ResultsMap (+13 more)

### Community 39 - "types/api.ts"
Cohesion: 0.13
Nodes (24): AlbumEnrichment, normalizeTitle(), useAlbumEnrichment(), ArtistEnrichment, ArtistLookupResponse, ArtistSearchResponse, coverArtUrlFor(), getArtistDiscography() (+16 more)

### Community 40 - "AudiobooksScreen.tsx"
Cohesion: 0.14
Nodes (21): AudiobooksScreenProps, AudiobooksScreen(), BookCard, BookCardProps, BookRow, MODES, Props, styles (+13 more)

### Community 41 - "App.tsx"
Cohesion: 0.14
Nodes (20): AppContent(), handleIncomingUri(), styles, waitForAuthSettle(), VideoPlayer(), OfflineBanner(), useAuthSession(), Orientation (+12 more)

### Community 42 - "AudioSubMenu.tsx"
Cohesion: 0.11
Nodes (20): AudioSubMenu(), formatRemaining(), SLEEP_TIMER_OPTIONS, SleepTimerSection(), SPEED_OPTIONS, styles, AUDIO_EXTENSIONS, COVER_FILENAMES (+12 more)

### Community 43 - "PreferencesScreenMockup.tsx"
Cohesion: 0.14
Nodes (14): styles, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }, featureStatuses, shortcuts, styles, recentItems, styles, { width: SCREEN_WIDTH } (+6 more)

### Community 44 - "generate-inapp-logo.js"
Cohesion: 0.14
Nodes (23): fs, ICON_DIR, iconSvgBell(), iconSvgFolder(), iconSvgFolderOutline(), iconSvgHome(), iconSvgLion(), iconSvgMusic() (+15 more)

### Community 45 - "src/components/index.ts"
Cohesion: 0.14
Nodes (17): AppTextVariant, AppTextInputProps, LoadingOverlay(), LoadingOverlayProps, styles, SkeletonCard(), SkeletonCardProps, styles (+9 more)

### Community 46 - "Dialog.tsx"
Cohesion: 0.12
Nodes (18): AppTextInput(), ConfirmDialog(), ConfirmDialogProps, ConfirmOptions, DialogAction, DialogProps, styles, PromptDialog() (+10 more)

### Community 47 - "SubtitleStyleDialog.tsx"
Cohesion: 0.11
Nodes (18): Dialog(), getActionStyle(), LinkedFoldersDialog(), LinkedFoldersDialogProps, styles, LANGUAGES, styles, SubtitleLanguageDialog() (+10 more)

### Community 48 - "PlaylistDetailScreen.tsx"
Cohesion: 0.15
Nodes (19): deriveKind(), parseImportedJson(), PlaylistDetailScreen(), PlaylistDetailScreenProps, Props, SearchScreen(), getRecentSearches(), saveRecentSearches() (+11 more)

### Community 49 - "VideoPlayer.tsx"
Cohesion: 0.17
Nodes (18): react, AudioPlayerInner(), AudioTransportDependentContent(), createStyles(), ReplayButton(), ReplayButtonProps, SleepTimerSheet(), SleepTimerSheetProps (+10 more)

### Community 50 - "DownloadButton.tsx"
Cohesion: 0.15
Nodes (17): DownloadButton(), DownloadButtonProps, styles, useDownloadsSync(), DownloadsScreenResult, StorageInfo, useDownloadsScreen(), DownloadRecord (+9 more)

### Community 51 - "useAuth"
Cohesion: 0.18
Nodes (16): useAuth(), NavigationProp, SplashScreen(), authSlice, AuthState, AuthUser, initialState, selectAuthError() (+8 more)

### Community 52 - "AppDelegate"
Cohesion: 0.13
Nodes (16): Any, Bool, AppDelegate, ReactNativeDelegate, RCTBridge, RCTDefaultReactNativeFactoryDelegate, RCTReactNativeFactory, React (+8 more)

### Community 53 - "native/index.ts"
Cohesion: 0.24
Nodes (15): usePipLifecycle(), UsePipLifecycleOptions, MpvAudioDevice, MpvChapter, MpvEventName, MpvEvents, MpvFileInfo, MpvLoopMode (+7 more)

### Community 54 - "podcastIndexService.ts"
Cohesion: 0.17
Nodes (18): UsePodcastDetailScreenReturn, PodcastCardProps, buildAuthHeaders(), CACHE, getEpisodes(), getPodcastById(), getTrendingPodcasts(), mapEpisode() (+10 more)

### Community 55 - "useSongScreen.ts"
Cohesion: 0.16
Nodes (16): formatDuration(), getFormat(), SongNav, SongRoute, useSongScreen(), getActiveLyricIndex(), getUpcomingLyrics(), guessLrcPaths() (+8 more)

### Community 56 - "RemoteResults.tsx"
Cohesion: 0.13
Nodes (17): EmptyStateProps, ErrorStateProps, InternalHeaderProps, MediaTileProps, IconName, MediaRow, MediaRowProps, RemoteResults (+9 more)

### Community 57 - "authService.ts"
Cohesion: 0.18
Nodes (15): serializeArgs(), AuthError, AuthErrorInfo, classifyAuthError(), DEV_USER, getGoogleSignin(), isPlayServicesAvailable(), revokeGoogleAccess() (+7 more)

### Community 58 - "useLiveTVScreen.ts"
Cohesion: 0.19
Nodes (15): LiveTVMode, useLiveTVScreen(), getAllIPTVChannels(), getChannelsByCategory(), getChannelsByCountry(), getIPTVCategories(), getIPTVChannelById(), IPTVChannelRaw (+7 more)

### Community 59 - "SearchScreen.tsx"
Cohesion: 0.12
Nodes (16): FilterAndSortControls(), FilterAndSortControlsProps, FilterMode, FILTERS, SortMode, SORTS, styles, RecentSearches() (+8 more)

### Community 60 - "ProfileScreen.tsx"
Cohesion: 0.15
Nodes (13): Avatar(), AvatarProps, AccountSection(), styles, SettingsRow, statusLabel(), Props, styles (+5 more)

### Community 61 - "notificationService.ts"
Cohesion: 0.15
Nodes (10): LOG_LEVELS, Logger, LogLevel, Listener, listeners, MpvPlayerModule, native, NotificationMetadata (+2 more)

### Community 62 - "SettingsScreen.tsx"
Cohesion: 0.21
Nodes (13): useConfirmDialog(), isKnownKey(), isValidValue(), MpvConfigEditor(), MpvConfigEditorProps, MpvOption, VALID_MPV_KEYS, getAppVersion() (+5 more)

### Community 63 - "SplashActivity"
Cohesion: 0.17
Nodes (6): Bundle, SplashActivity, Animator, AppCompatActivity, ImageView, TextView

### Community 64 - "package.json"
Cohesion: 0.13
Nodes (14): codegenConfig, jsSrcsDir, name, type, engines, node, name, private (+6 more)

### Community 65 - "generate-icons.js"
Cohesion: 0.21
Nodes (14): ANDROID_SIZES, fs, generateCombined(), generateForeground(), GOLD_STOPS, IOS_DIR, IOS_SIZES, main() (+6 more)

### Community 66 - "VideoPlayerScreen.tsx"
Cohesion: 0.16
Nodes (11): PrimaryControls(), PrimaryControlsProps, SecondaryToolbar(), SecondaryToolbarProps, ToolbarBtn(), ToolbarBtnProps, VideoPlayerAudioPanel, VolumeBrightnessOverlay() (+3 more)

### Community 67 - "ErrorBoundary.tsx"
Cohesion: 0.16
Nodes (6): ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState, FallbackColors, styles, ScreenErrorBoundaryProps

### Community 68 - "TabNavigator.tsx"
Cohesion: 0.18
Nodes (10): FloatingTabBar(), getIconForRoute(), styles, HomeStack(), Stack, styles, Tab, TabNavigator() (+2 more)

### Community 69 - "tsconfig.json"
Cohesion: 0.15
Nodes (12): @react-native/typescript-config, @react-native/typescript-config, jest, **/node_modules, **/Pods, **/*.ts, **/*.tsx, compilerOptions (+4 more)

### Community 70 - "useShowDetailScreen.ts"
Cohesion: 0.28
Nodes (11): MatchedEpisode, selectLocalVideos, useShowDetailScreen(), getEpisodeList(), getShowById(), EpisodeRef, fileNameMatchesEpisode(), fileNameMatchesShow() (+3 more)

### Community 71 - "MiniAudioPlayer.tsx"
Cohesion: 0.23
Nodes (9): formatRemaining(), MiniAudioPlayer(), MiniAudioPlayerProps, MiniProgressBar(), MiniProgressBarProps, styles, goBack(), navigate() (+1 more)

### Community 72 - "VideoPlayerSubtitlePanel.tsx"
Cohesion: 0.21
Nodes (8): DEFAULT_SUBTITLE_COLOR, SUBTITLE_COLOR_PRESETS, SubtitleColorPreset, SubtitleFormat, VideoPlayerSubtitlePanel, VideoPlayerSubtitlePanelProps, DEFAULTS, SubtitleSettings

### Community 73 - "ArchiveScreen.tsx"
Cohesion: 0.20
Nodes (10): ArchiveScreenProps, ARCHIVE_TABS, ArchiveCard, ArchiveCardProps, ArchiveRow, ArchiveScreen(), audioToRow(), Props (+2 more)

### Community 74 - "mark"
Cohesion: 0.24
Nodes (8): App(), displayName, name, onRehydrated(), HomeScreen(), logStartupSummary(), mark(), marks

### Community 75 - "download-icons.js"
Cohesion: 0.27
Nodes (10): ASSETS_DIR, downloadFile(), findAndDownloadIcon(), findIconsFromPack(), fs, http, https, main() (+2 more)

### Community 76 - "utils/animations.ts"
Cohesion: 0.20
Nodes (3): DURATION, staggerAnimations(), staggerEntrance()

### Community 77 - "timeAgo.ts"
Cohesion: 0.29
Nodes (5): AudioResumeOverlay(), AudioResumeOverlayProps, VideoPlayerResumeOverlay(), VideoPlayerResumeOverlayProps, formatDuration()

### Community 78 - "intelligenceEngine.ts"
Cohesion: 0.33
Nodes (8): calculateScore(), completionWeight(), getRecentAudioEntries(), getRecentVideoEntries(), getWeightedResumptionList(), recencyScore(), SessionEntry, WeightedEntry

### Community 80 - "LinkedFoldersScreen.tsx"
Cohesion: 0.28
Nodes (8): LinkedFoldersScreenProps, formatLastScan(), getFolderName(), Props, SwipeableFolderCard(), SwipeableFolderCardProps, swipeStyles, selectTrackCount

### Community 81 - "eslint-sweep.js"
Cohesion: 0.25
Nodes (6): {execFileSync}, path, perFile, results, root, sorted

### Community 82 - "VideoPlayerGestureLayer.tsx"
Cohesion: 0.39
Nodes (6): GestureCallbacks, GestureZone, PlayerGestureHandle, usePlayerGestures(), Props, VideoPlayerGestureLayer()

### Community 83 - "VideoPlayerSurfaceLayer.tsx"
Cohesion: 0.29
Nodes (6): VideoPlayerSurfaceLayer, VideoPlayerSurfaceLayerProps, MpvRenderViewNative, MpvRenderViewProps, VideoPlayerVideoSurface, VideoPlayerVideoSurfaceProps

### Community 84 - "ChapterBrowser.tsx"
Cohesion: 0.48
Nodes (5): Chapter, ChapterBrowser(), ChapterBrowserProps, fmtTime(), timeRemaining()

### Community 85 - "SeekBar.tsx"
Cohesion: 0.48
Nodes (5): fmt(), fmtDuration(), NOTE: styles MUST be declared before chapterMarks so that the, SeekBar(), SeekBarProps

### Community 86 - "constants/api.ts"
Cohesion: 0.52
Nodes (3): API_CONFIG, ENV, svgPaths

### Community 87 - "MainApplication"
Cohesion: 0.33
Nodes (4): MainApplication, Application, ReactApplication, ReactHost

### Community 88 - "getillustrations"
Cohesion: 0.33
Nodes (5): MEILISEARCH_MASTER_KEY, MEILISEARCH_URL, npx, getillustrations, @getillustrations/mcp-server

### Community 89 - "AudioSeekBar.tsx"
Cohesion: 0.53
Nodes (5): AudioSeekBar(), AudioSeekBarProps, fmt(), fmtDuration(), styles

### Community 91 - "server.js"
Cohesion: 0.40
Nodes (4): fs, http, MIME, path

### Community 92 - "PlayerErrorFallback.tsx"
Cohesion: 0.60
Nodes (3): PlayerErrorFallback(), PlayerErrorFallbackProps, styles

### Community 93 - "AudioPlayer/AudioAlbumArt.tsx"
Cohesion: 0.40
Nodes (4): ART_SIZE, AudioAlbumArt(), AudioAlbumArtProps, styles

### Community 94 - "SeekFeedbackOverlay.tsx"
Cohesion: 0.50
Nodes (3): SeekFeedbackOverlay(), SeekFeedbackOverlayProps, styles

### Community 96 - "AlbumArtBackground.tsx"
Cohesion: 0.40
Nodes (4): AlbumArtBackground(), AlbumArtBackgroundProps, styles, {width: SCREEN_WIDTH, height: SCREEN_HEIGHT}

### Community 97 - "VideoPlayerSpeedPanel.tsx"
Cohesion: 0.40
Nodes (4): Props, SPEEDS, styles, VideoPlayerSpeedPanel

### Community 100 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 101 - "metro.config.js"
Cohesion: 0.50
Nodes (3): config, defaultConfig, { getDefaultConfig, mergeConfig }

### Community 102 - "explore-api.mjs"
Cohesion: 0.83
Nodes (3): get(), main(), post()

### Community 103 - "mcp-client.mjs"
Cohesion: 0.67
Nodes (3): main(), pending, sendRequest()

### Community 104 - "search-icons.mjs"
Cohesion: 0.67
Nodes (3): limit, main(), search()

### Community 105 - "OptionSheetDialog.tsx"
Cohesion: 0.50
Nodes (3): OptionSheetDialogProps, OptionSheetOption, styles

### Community 107 - "VideoControlsOverlay.tsx"
Cohesion: 0.50
Nodes (3): styles, VideoControlsOverlay(), VideoControlsOverlayProps

### Community 108 - "VideoPlayerVolumePanel.tsx"
Cohesion: 0.50
Nodes (3): Props, styles, VideoPlayerVolumePanel

### Community 110 - "@react-native-community/blur"
Cohesion: 0.67
Nodes (3): @react-native-community/blur, @react-native-community/cli, @react-native-community/cli

## Knowledge Gaps
- **771 isolated node(s):** `npx`, `@getillustrations/mcp-server`, `MEILISEARCH_URL`, `MEILISEARCH_MASTER_KEY`, `styles` (+766 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `VideoPlayer.tsx` to `VideoPlayerScreen.tsx`, `TabNavigator.tsx`, `AudiobooksScreen.tsx`, `dependencies`, `AppDelegate`, `AppText`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **Why does `AppText()` connect `AppText` to `RootNavigator.tsx`, `AppText.tsx`, `SvgIcon`, `useTheme`, `SettingsStack.tsx`, `useLibraryScreen.ts`, `ArtistScreen.tsx`, `index.tsx`, `useAppSelector`, `FolderBrowserScreen.tsx`, `fileService.ts`, `QueueScreen.tsx`, `ArtistDetailScreen.tsx`, `useBookmarks`, `ColorTokens`, `BottomSheet.tsx`, `AudioPlayer.tsx`, `QueueSheet.tsx`, `useAccessibility`, `InfoSheet.tsx`, `AudiobooksScreen.tsx`, `AudioSubMenu.tsx`, `src/components/index.ts`, `Dialog.tsx`, `SubtitleStyleDialog.tsx`, `PlaylistDetailScreen.tsx`, `VideoPlayer.tsx`, `useAuth`, `RemoteResults.tsx`, `SearchScreen.tsx`, `ProfileScreen.tsx`, `SettingsScreen.tsx`, `VideoPlayerScreen.tsx`, `ErrorBoundary.tsx`, `MiniAudioPlayer.tsx`, `VideoPlayerSubtitlePanel.tsx`, `ArchiveScreen.tsx`, `timeAgo.ts`, `LinkedFoldersScreen.tsx`, `VideoPlayerSurfaceLayer.tsx`, `ChapterBrowser.tsx`, `SeekBar.tsx`, `AudioSeekBar.tsx`, `PlayerErrorFallback.tsx`, `AudioPlayer/AudioAlbumArt.tsx`, `SeekFeedbackOverlay.tsx`, `VideoPlayerSpeedPanel.tsx`, `OptionSheetDialog.tsx`, `VideoPlayerVolumePanel.tsx`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **Why does `useTheme()` connect `useTheme` to `RootNavigator.tsx`, `AppText.tsx`, `SvgIcon`, `SettingsStack.tsx`, `useLibraryScreen.ts`, `ArtistScreen.tsx`, `index.tsx`, `useAppSelector`, `FolderBrowserScreen.tsx`, `store/index.ts`, `fileService.ts`, `internetArchiveService.ts`, `jamendoService.ts`, `QueueScreen.tsx`, `AppText`, `ArtistDetailScreen.tsx`, `useBookmarks`, `mediaSlice.ts`, `BottomSheet.tsx`, `AudioPlayer.tsx`, `QueueSheet.tsx`, `useAccessibility`, `InfoSheet.tsx`, `useVideoPlayerScreen.ts`, `useNetworkStatus`, `AudiobooksScreen.tsx`, `App.tsx`, `src/components/index.ts`, `Dialog.tsx`, `SubtitleStyleDialog.tsx`, `PlaylistDetailScreen.tsx`, `VideoPlayer.tsx`, `DownloadButton.tsx`, `useAuth`, `RemoteResults.tsx`, `SearchScreen.tsx`, `ProfileScreen.tsx`, `SettingsScreen.tsx`, `VideoPlayerScreen.tsx`, `ErrorBoundary.tsx`, `TabNavigator.tsx`, `MiniAudioPlayer.tsx`, `VideoPlayerSubtitlePanel.tsx`, `ArchiveScreen.tsx`, `timeAgo.ts`, `LinkedFoldersScreen.tsx`, `VideoPlayerSurfaceLayer.tsx`, `ChapterBrowser.tsx`, `SeekBar.tsx`, `AudioSeekBar.tsx`, `PlayerErrorFallback.tsx`, `AudioPlayer/AudioAlbumArt.tsx`, `SeekFeedbackOverlay.tsx`, `AlbumArtBackground.tsx`, `VideoPlayerSpeedPanel.tsx`, `ScreenContainer.tsx`, `VideoControlsOverlay.tsx`, `VideoPlayerVolumePanel.tsx`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **What connects `npx`, `@getillustrations/mcp-server`, `MEILISEARCH_URL` to the rest of the system?**
  _771 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `RootNavigator.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.04086229086229086 - nodes in this community are weakly interconnected._
- **Should `AppText.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.03863432165318958 - nodes in this community are weakly interconnected._
- **Should `SvgIcon` be split into smaller, more focused modules?**
  _Cohesion score 0.05228070175438596 - nodes in this community are weakly interconnected._