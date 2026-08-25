# Graph Report - .  (2026-08-25)

## Corpus Check
- Large corpus: 787 files · ~556,636 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 3804 nodes · 10987 edges · 234 communities (168 shown, 66 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 101 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 149
- Community 151
- Community 152
- Community 153
- Community 154
- Community 155
- Community 156
- Community 157
- Community 158
- Community 159
- Community 160
- Community 161
- Community 162
- Community 163
- Community 164
- Community 165
- Community 166
- Community 167
- Community 168
- Community 169
- Community 170
- Community 171
- Community 173
- Community 174
- Community 175
- Community 176
- Community 177
- Community 178
- Community 179
- Community 180
- Community 181
- Community 182
- Community 183
- Community 184
- Community 185
- Community 186
- Community 190
- Community 192
- Community 206
- Community 208
- Community 209
- Community 210
- Community 211
- Community 212
- Community 213
- Community 223
- Community 233

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 393 edges
2. `AppText()` - 185 edges
3. `spacing` - 151 edges
4. `SvgIcon()` - 122 edges
5. `radius` - 118 edges
6. `useAppSelector` - 107 edges
7. `useAppDispatch()` - 85 edges
8. `MpvBridgeModule` - 83 edges
9. `usePlaybackCommands()` - 69 edges
10. `ColorTokens` - 55 edges

## Surprising Connections (you probably didn't know these)
- `About Project — Cine RN port analysis (Deprecated)` --semantically_similar_to--> `v11 libmpv Integration Audit`  [INFERRED] [semantically similar]
  md/About_Project.md → v11_mpv_integration_audit.md
- `Video Player V3 Wave A README` --semantically_similar_to--> `Android app CMake build (CMakeLists.txt)`  [INFERRED] [semantically similar]
  src/modules/playback/video/v3/README.md → android/app/src/main/cpp/CMakeLists.txt
- `Video Player V3 UI/UX` --references--> `v11 libmpv Integration Audit`  [INFERRED]
  video player V3 UI UX.md → v11_mpv_integration_audit.md
- `Video V3 Runtime Log Diagnosis` --references--> `v11 libmpv Integration Audit`  [INFERRED]
  video_v3_runtime_log_diagnosis.md → v11_mpv_integration_audit.md
- `handleIncomingUri()` --calls--> `getMediaType()`  [EXTRACTED]
  App.tsx → src/services/fileService.ts

## Import Cycles
- 3-file cycle: `src/store/index.ts -> src/store/rootReducer.ts -> src/store/slices/downloadsSlice.ts -> src/store/index.ts`
- 3-file cycle: `src/store/index.ts -> src/store/rootReducer.ts -> src/store/slices/liveFavoritesSlice.ts -> src/store/index.ts`
- 3-file cycle: `src/store/index.ts -> src/store/rootReducer.ts -> src/store/slices/pipSlice.ts -> src/store/index.ts`
- 3-file cycle: `src/store/index.ts -> src/store/rootReducer.ts -> src/store/slices/sessionSlice.ts -> src/store/index.ts`
- 3-file cycle: `src/features/playlists/playlistReducer.ts -> src/store/index.ts -> src/store/rootReducer.ts -> src/features/playlists/playlistReducer.ts`
- 3-file cycle: `src/store/index.ts -> src/store/rootReducer.ts -> src/store/slices/mediaSlice.ts -> src/store/index.ts`
- 3-file cycle: `src/store/index.ts -> src/store/rootReducer.ts -> src/store/slices/weatherSlice.ts -> src/store/index.ts`
- 4-file cycle: `src/features/playlists/playlistReducer.ts -> src/store/index.ts -> src/store/persistConfig.ts -> src/store/rootReducer.ts -> src/features/playlists/playlistReducer.ts`
- 4-file cycle: `src/store/index.ts -> src/store/persistConfig.ts -> src/store/rootReducer.ts -> src/store/slices/downloadsSlice.ts -> src/store/index.ts`
- 4-file cycle: `src/store/index.ts -> src/store/persistConfig.ts -> src/store/rootReducer.ts -> src/store/slices/liveFavoritesSlice.ts -> src/store/index.ts`
- 4-file cycle: `src/store/index.ts -> src/store/persistConfig.ts -> src/store/rootReducer.ts -> src/store/slices/mediaSlice.ts -> src/store/index.ts`
- 4-file cycle: `src/store/index.ts -> src/store/persistConfig.ts -> src/store/rootReducer.ts -> src/store/slices/pipSlice.ts -> src/store/index.ts`
- 4-file cycle: `src/store/index.ts -> src/store/persistConfig.ts -> src/store/rootReducer.ts -> src/store/slices/sessionSlice.ts -> src/store/index.ts`
- 4-file cycle: `src/store/index.ts -> src/store/persistConfig.ts -> src/store/rootReducer.ts -> src/store/slices/weatherSlice.ts -> src/store/index.ts`

## Hyperedges (group relationships)
- **v11 Manus Program (Spec + Tracker + 5 Wave-0/Wave-1/Wave-2 deliverables)** — v11_manus_specification, v11_manus_tracker, v11_wave0_platform_baseline, v11_wave0_scope_baseline, v11_wave0_repository_checkpoint, v11_wave0_route_inventory, v11_wave0_state_ownership, v11_wave1_ui_ux_audit, v11_wave2_api_findings [EXTRACTED 0.95]
- **v11 Player Overhaul (Music Redesign + MPV Audit + Buffering Blueprint)** — v11_music_player_redesign, v11_mpv_integration_audit, v11_audio_playback_buffering_blueprint [EXTRACTED 0.95]
- **Video Player Spec Lineage (base → uplift → V3)** — video_player_ui_ux, video_player_ui_ux_uplift, video_player_v3_ui_ux [EXTRACTED 0.95]
- **v10 Spec/Tracker Lineage (Active Umbrella + Wave-Specific Working Doc)** — md_ui_ux_elevation_specification_v10_2, md_ui_ux_elevation_progress_tracker_v10_2, md_ui_ux_elevation_specification_v10_1, md_ui_ux_elevation_progress_tracker_v10_1 [EXTRACTED 0.95]
- **Deprecated Spec Chain (v2/v3 → v4)** — md_ui_ux_elevation_specification_v2_deprecated, md_ui_ux_elevation_specification_v3_deprecated, md_ui_ux_elevation_progress_tracker_v2_deprecated, md_ui_ux_elevation_progress_tracker_v3_deprecated, md_ui_ux_elevation_specification_v4, md_ui_ux_elevation_progress_tracker_v4 [EXTRACTED 0.95]
- **Android mpv native integration (build target, imported lib, provenance)** — android_app_src_main_cpp_cmakelists_simbaplayer_mpv, android_app_src_main_cpp_cmakelists_mpv_imported, android_app_src_main_jnilibs_mpv_native_provenance, android_app_src_main_jnilibs_mpv_native_provenance_libmpv_stack [INFERRED 0.85]
- **Video V3 presentation-independent contract (Wave A ports)** — src_modules_playback_video_v3_readme_videov3sessionport, src_modules_playback_video_v3_readme_videov3intentcontroller, src_modules_playback_video_v3_readme_videov3intentdispatcher, src_modules_playback_video_v3_readme_videov3stateadapter, src_modules_playback_video_v3_readme_videov3viewstate, src_modules_playback_video_v3_readme_videov3surfaceport [EXTRACTED 1.00]
- **TurboModule registration via merged libappmodules.so** — android_app_src_main_cpp_cmakelists_appmodules, android_app_src_main_cpp_cmakelists_react_codegen_simbaplayer, android_app_src_main_cpp_cmakelists_common_flags [EXTRACTED 1.00]

## Communities (234 total, 66 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (107): OptionSheetDialog(), styles, SearchBar(), ActivityOrb(), ActivityOrbProps, Placeholder(), useToast(), InternalHeader() (+99 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (87): AppText(), AppTextProps, TokenColorKey, variantMap, Avatar(), AvatarProps, LoadingOverlay(), LoadingOverlayProps (+79 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (74): KIND_LABELS, PlaylistCard(), PlaylistCardProps, styles, PlaylistCreateModalProps, addItemToPlaylist(), AddPlaylistItemResult, createItem() (+66 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (40): OptionSheetDialogProps, styles, CategoryCardProps, styles, SubtitleFormat, VideoPlayerSubtitlePanel, VideoPlayerSubtitlePanelProps, SectionTabBar() (+32 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (58): AppContent(), handleIncomingUri(), styles, waitForAuthSettle(), DownloadButton(), formatTime(), MiniPlayer(), GlobalOperationProgress() (+50 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (54): BookmarkList(), formatTime(), styles, useConfirmDialog(), SearchBarProps, styles, EmptyState(), EmptyStateProps (+46 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (29): Bundle, Intent, MainActivity, buildActionIntent(), buildContentIntent(), Context, Intent, MediaNotificationService (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.04
Nodes (54): AppCard(), AppCardProps, styles, styles, VideoControlsOverlay(), VideoControlsOverlayProps, FloatingTabBar(), getIconForRoute() (+46 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (45): App(), displayName, name, onRehydrated(), SkeletonCard(), SkeletonCardProps, styles, SkeletonList() (+37 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (52): DownloadButtonProps, styles, QueueManagementSheetProps, QueueableItem, PlaylistSheetProps, RecentHistoryHandle, initialState, MAX_RECENT_HISTORY_ENTRIES (+44 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (44): BookmarkItem(), formatRelativeDate(), formatTime(), styles, BookmarkSheet(), formatTime(), MemoizedBookmarkSheet, styles (+36 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (43): BookmarkButton(), Props, styles, ErrorStateProps, styles, InternalHeaderProps, TrackItem, TrackSelectionPopup() (+35 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (44): DEFAULT_SUBTITLE_COLOR, SubtitleColorPreset, useRecentHistory(), usePipEntry(), ErrorLogEntry, logError(), Props, useAudioPlayerScreen() (+36 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (44): MOOD_COLLECTIONS, MoodCollection, GenreBrowseTab, useGenreScreen(), UseGenreScreenResult, dedupe(), EMPTY_FILTERS, EMPTY_SCOPE (+36 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (42): formatLastScan(), ScanProgressBanner(), ScanProgressBannerProps, styles, RelatedTabProps, displayNameFromPath(), isVideoExtension(), SearchResultGroup (+34 more)

### Community 15 - "Community 15"
Cohesion: 0.06
Nodes (39): StreamingRow, styles, AudioWaveform(), AudioWaveformProps, BASE_PEAKS, {height: SCREEN_HEIGHT}, MediaAction, MediaActionsSheet() (+31 more)

### Community 16 - "Community 16"
Cohesion: 0.08
Nodes (43): withJunkFilter(), useArchiveItemDetailScreen(), UseArchiveItemDetailScreenReturn, useAudiobookDetailScreen(), UseAudiobookDetailScreenReturn, useMovieDetailScreen(), MovieCardProps, MoviesDataContext (+35 more)

### Community 17 - "Community 17"
Cohesion: 0.04
Nodes (47): @babel/core, @babel/preset-env, @babel/runtime, eslint, @getillustrations/mcp-server, jest, devDependencies, @babel/core (+39 more)

### Community 18 - "Community 18"
Cohesion: 0.07
Nodes (35): HomeStack(), Stack, LibraryStack(), Stack, goBack(), navigationRef, SettingsStack(), MainShell (+27 more)

### Community 19 - "Community 19"
Cohesion: 0.19
Nodes (44): jclass, jlong, JNIEnv, JNIEXPORT, jstring, mpv_handle, initializeMpv(), Java_com_simba_player_mpv_MPVLib_nativeCreate() (+36 more)

### Community 20 - "Community 20"
Cohesion: 0.06
Nodes (32): AppButton(), AppButtonProps, ButtonSize, ButtonVariant, sizeConfig, styles, AlbumActionRow(), AlbumActionRowProps (+24 more)

### Community 21 - "Community 21"
Cohesion: 0.10
Nodes (35): useCachedArt(), artFilePath(), cacheArt(), getCachedArtPath(), getCachedArtPathSync(), memoryCache, pruneArtCache(), remember() (+27 more)

### Community 22 - "Community 22"
Cohesion: 0.06
Nodes (39): createStyles(), DirEntry, FOLDER_TYPE_OPTIONS, FolderLinkingWizard(), FolderType, Props, STEPS, LibraryVideosSegment() (+31 more)

### Community 23 - "Community 23"
Cohesion: 0.09
Nodes (38): LiveTVTabSceneProps, dedupe(), EMPTY_SCOPE, LiveTVScopeState, LiveTVTab, IMPORTANT: selectTab does NOT clear search text, IMPORTANT: selectCategory does NOT clear search text, scopeCacheKey() (+30 more)

### Community 24 - "Community 24"
Cohesion: 0.11
Nodes (32): VideoV3Capabilities, VideoV3PlatformCapabilities, VideoV3ViewState, toVideoV3Source(), VideoV3Host(), VideoV3HostProps, createVideoV3PlatformCapabilities(), styles (+24 more)

### Community 25 - "Community 25"
Cohesion: 0.05
Nodes (42): Android mpv v3 Code Quality & Performance Review, FAB-Only Browse Shell Contract (v10.1), List (FlatList/SectionList) Contract, Media Provenance & Semantic Media-Kind Contract, Native libmpv Bridge Hardening, Per-Scope Cache Keying, Playback Module State Ownership, Player Production Acceptance Matrix (+34 more)

### Community 26 - "Community 26"
Cohesion: 0.05
Nodes (41): js-sha1, @lodev09/react-native-true-sheet, lottie-react-native, dependencies, js-sha1, @lodev09/react-native-true-sheet, lottie-react-native, react-native (+33 more)

### Community 27 - "Community 27"
Cohesion: 0.09
Nodes (31): MiniVideoV2(), styles, useVideoV2Controller(), VideoV2Button(), formatTime(), Panel, Props, styles (+23 more)

### Community 28 - "Community 28"
Cohesion: 0.09
Nodes (33): useMoreFromArtist(), AlbumDetailScreen(), AlbumDetailScreenProps, formatDuration(), formatTotalDuration(), Props, LibraryScreen(), AlbumEnrichment (+25 more)

### Community 29 - "Community 29"
Cohesion: 0.06
Nodes (4): CacheStatePayload, MpvBridgeModule, DeviceEventManagerModule, ReactContextBaseJavaModule

### Community 30 - "Community 30"
Cohesion: 0.10
Nodes (31): AudiobooksScreenProps, AudiobookTabScene, BookCard, GENRE_CHIP_ITEMS, Props, toRow(), AudiobookScopeState, AudiobooksTab (+23 more)

### Community 31 - "Community 31"
Cohesion: 0.08
Nodes (27): getAudio(), getVideos(), scanAllLinkedFolders(), scanFolder(), searchMedia(), sortMedia(), SortOption, MediaService (+19 more)

### Community 34 - "Community 34"
Cohesion: 0.09
Nodes (28): FilterAndSortControls(), FilterAndSortControlsProps, FilterMode, FILTERS, SortMode, SORTS, styles, MediaRow (+20 more)

### Community 35 - "Community 35"
Cohesion: 0.13
Nodes (30): StreamingRowProps, MusicDataContext, MusicDataContextValue, MusicDataProvider(), TrackCardProps, dedupe(), EMPTY_SCOPE, MusicScopeState (+22 more)

### Community 36 - "Community 36"
Cohesion: 0.07
Nodes (24): styles, ToastAction, ToastContent(), ToastContext, ToastContextValue, ToastMessage, ToastOptions, ToastProvider() (+16 more)

### Community 37 - "Community 37"
Cohesion: 0.12
Nodes (25): PlaylistCreateModal(), LibraryScreenProps, LibraryAudioSegment, LibraryAudioSegmentProps, Props, styles, ViewMode, ViewToggle() (+17 more)

### Community 38 - "Community 38"
Cohesion: 0.12
Nodes (27): NetworkStatus, useNetworkStatus(), MatchedEpisode, selectLocalVideos, useShowDetailScreen(), ShowCardProps, ShowTabSceneProps, dedupe() (+19 more)

### Community 39 - "Community 39"
Cohesion: 0.12
Nodes (8): failure(), VideoV3IntentController, VideoV3SeekCoordinator, VideoV3CommandResult, VideoV3Intent, VideoV3IntentDispatcher, VideoV3SessionFactory, VideoV3SessionPort

### Community 40 - "Community 40"
Cohesion: 0.12
Nodes (20): Chapter, InfoSheetProps, TrackMetadataProps, useTransport(), AudioV2Artwork(), AudioV2ArtworkProps, styles, AudioV2Content() (+12 more)

### Community 41 - "Community 41"
Cohesion: 0.09
Nodes (24): ChapterRange, TransportContext, TransportContextValue, TransportProvider(), TransportProviderProps, TransportState, BufferedTimeRange, normalizeBufferedRanges() (+16 more)

### Community 42 - "Community 42"
Cohesion: 0.12
Nodes (25): FollowedPodcast, followedPodcastsSlice, FollowedPodcastsState, FollowedPodcastsStateRoot, initialState, selectFollowedPodcastById, selectFollowedPodcastCount, selectFollowedPodcastIds (+17 more)

### Community 43 - "Community 43"
Cohesion: 0.19
Nodes (8): finiteOrNull(), finiteOrZero(), mapPlaybackState(), mapTrack(), normalizeRanges(), readNative(), VideoV3MpvSession, MpvPlayer

### Community 44 - "Community 44"
Cohesion: 0.10
Nodes (12): MpvPlayerPackage, Surface, MpvRenderView, MpvRenderViewManager, NativeModule, ReactApplicationContext, ReactPackage, SimpleViewManager (+4 more)

### Community 45 - "Community 45"
Cohesion: 0.14
Nodes (21): BrowseLayout(), Props, styles, renderMoviesContent(), FILTER_SEED_PARAMS, SectionOptionsApi, SectionOptionsState, useSectionOptions() (+13 more)

### Community 46 - "Community 46"
Cohesion: 0.12
Nodes (18): addRecent(), clearRecent(), dispatchRecent(), removeRecent(), ProfileScreen(), Props, styles, THEME_LABEL (+10 more)

### Community 47 - "Community 47"
Cohesion: 0.09
Nodes (9): Stack, CreditsScreenProps, EqualizerScreenProps, FolderLinkingWizardScreenProps, LinkedFoldersScreenProps, CreditsScreenProps, FolderLinkingWizardProps, FolderLinkingWizardScreenProps (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.13
Nodes (20): ArchiveScreenProps, ArchiveCard, ArchiveTabScene, Props, QUICK_SEARCH_CHIP_ITEMS, ArchiveTab, AudioScopeState, dedupeById() (+12 more)

### Community 49 - "Community 49"
Cohesion: 0.16
Nodes (19): BrowseLayout(), Props, styles, FILTER_SEED_PARAMS, SectionOptionsApi, SectionOptionsState, useSectionOptions(), SectionSearchState (+11 more)

### Community 50 - "Community 50"
Cohesion: 0.09
Nodes (8): initialState, VideoV3PipAction, VideoV3PipActionListener, VideoV3PipAdapter, VideoV3PipListener, VideoV3PipMode, VideoV3PipPort, VideoV3PipState

### Community 51 - "Community 51"
Cohesion: 0.16
Nodes (21): AudioV2ModuleProps, PlaybackProvider(), PlaybackProviderProps, PlaybackStateContext, usePlayback(), usePlaybackState(), PlaybackOverlayHost(), styles (+13 more)

### Community 52 - "Community 52"
Cohesion: 0.17
Nodes (19): VideoV3SeekResult, createVideoV3SourceFingerprint(), isSameVideoV3Source(), emptyVideoV3Snapshot(), VideoV3BufferRange, VideoV3Chapter, VideoV3Error, VideoV3SessionPhase (+11 more)

### Community 53 - "Community 53"
Cohesion: 0.10
Nodes (18): PlaybackNavigation, VideoPlaybackParams, SecondaryToolbar(), SeekFeedbackOverlay(), SeekFeedbackOverlayProps, styles, {width: SCREEN_WIDTH}, Props (+10 more)

### Community 54 - "Community 54"
Cohesion: 0.11
Nodes (20): ChapterList(), ChapterListProps, formatDuration(), formatTime(), styles, addBtn, addBtnLabel, emptyIcon (+12 more)

### Community 55 - "Community 55"
Cohesion: 0.08
Nodes (23): allTypographyStyles, brandScript, codeLine, displaySans, displaySerif, greetingName, greetingPrefix, heroTitle (+15 more)

### Community 56 - "Community 56"
Cohesion: 0.11
Nodes (18): Java_com_simba_player_mpv_MPVLib_nativeDestroy(), clearPendingLoadRequests(), consumeFileLoadedPayload(), string, dropLoadRequest(), enqueueLoadRequest(), jlong, mpv_handle (+10 more)

### Community 57 - "Community 57"
Cohesion: 0.13
Nodes (15): AudioV2ActionStripProps, styles, AudioV2Button(), AudioV2ButtonProps, styles, AudioV2Icon(), AudioV2IconName, AudioV2IconProps (+7 more)

### Community 58 - "Community 58"
Cohesion: 0.14
Nodes (14): WaveformBars(), WaveformBarsProps, AudioVisualizer(), AudioVisualizerProps, BASE_PEAKS, BufferingBar(), BufferingBarProps, styles (+6 more)

### Community 59 - "Community 59"
Cohesion: 0.17
Nodes (17): QueueDragHandle(), QueueDragHandleProps, styles, formatDuration(), QueueItem(), QueueItemProps, styles, formatDuration() (+9 more)

### Community 60 - "Community 60"
Cohesion: 0.19
Nodes (16): BrowseLayout(), Props, styles, FILTER_SEED_PARAMS, SectionOptionsApi, SectionOptionsState, SectionSearchState, useSectionSearch() (+8 more)

### Community 61 - "Community 61"
Cohesion: 0.13
Nodes (20): Android app CMake build (CMakeLists.txt), libappmodules.so target, common_flags interface target, fbjni prefab package, Imported libmpv.so (jniLibs/${ANDROID_ABI}), react_codegen_SimbaPlayer codegen target, ReactAndroid prefab package (jsi, reactnative), libsimbaplayer_mpv.so target (+12 more)

### Community 62 - "Community 62"
Cohesion: 0.13
Nodes (16): Any, Bool, AppDelegate, ReactNativeDelegate, RCTBridge, RCTDefaultReactNativeFactoryDelegate, RCTReactNativeFactory, react (+8 more)

### Community 63 - "Community 63"
Cohesion: 0.17
Nodes (15): ConfirmDialog(), ConfirmDialogProps, ConfirmOptions, Dialog(), DialogAction, DialogProps, getActionStyle(), styles (+7 more)

### Community 64 - "Community 64"
Cohesion: 0.17
Nodes (14): useWeather(), UseWeatherResult, WeatherSnapshot, DeviceCoords, getCurrentCoords(), reverseGeocodeCity(), fetchWeather, initialState (+6 more)

### Community 65 - "Community 65"
Cohesion: 0.14
Nodes (14): styles, VideoV2ButtonProps, paths, VideoV2Icon(), VideoV2IconName, VideoV2IconProps, Panel, RowProps (+6 more)

### Community 66 - "Community 66"
Cohesion: 0.16
Nodes (7): VideoV3SurfaceGeometry, VideoV3SurfacePort, VideoV3SurfacePresentation, initialState, VideoV3SurfaceController, VideoV3SurfaceState, VideoV3SurfaceStateListener

### Community 67 - "Community 67"
Cohesion: 0.13
Nodes (14): ArtistBio(), ArtistBioProps, styles, ArtistDiscography(), ArtistDiscographyProps, DiscographyAlbum, styles, ArtistHeader() (+6 more)

### Community 68 - "Community 68"
Cohesion: 0.17
Nodes (16): Props, Options, PodcastRow, Props, PodcastsContent(), PodcastsDataContext, PodcastsDataContextValue, PodcastsDataProvider() (+8 more)

### Community 69 - "Community 69"
Cohesion: 0.15
Nodes (19): dedupeEpisodes(), usePodcastDetailScreen(), buildAuthHeaders(), CACHE, getEpisodes(), getPodcastById(), getPodcastCategories(), getTrendingPodcasts() (+11 more)

### Community 70 - "Community 70"
Cohesion: 0.13
Nodes (14): CATEGORY_COVERS, CategoryCover, IPTV_CATEGORIES, IPTVBrowseEntry, RADIO_BROWSE, RADIO_CATEGORIES, RadioBrowseEntry, RadioCategory (+6 more)

### Community 71 - "Community 71"
Cohesion: 0.18
Nodes (14): API_CONFIG, ENV, TrackResult, useMusicDetailScreen(), AudiusListResponse, AudiusSingleResponse, AudiusTrackRaw, buildStreamUrl() (+6 more)

### Community 72 - "Community 72"
Cohesion: 0.24
Nodes (14): UsePipLifecycleOptions, MpvAudioDevice, MpvChapter, MpvEventName, MpvEvents, MpvFileInfo, MpvFileLoadedEvent, MpvLoopMode (+6 more)

### Community 73 - "Community 73"
Cohesion: 0.20
Nodes (16): classifyAuthError(), configureGoogleSignin(), getConfigureOptions(), getGoogleClientId(), getGoogleSignin(), getGoogleSigninModule(), getGoogleStatusCodes(), GoogleSignInResponse (+8 more)

### Community 74 - "Community 74"
Cohesion: 0.15
Nodes (15): BottomSheet, BottomSheetHandle, BottomSheetInner(), BottomSheetProps, snapToDetent(), styles, TrueSheetApi, Chip (+7 more)

### Community 75 - "Community 75"
Cohesion: 0.15
Nodes (12): useAutoHideControls(), useOrientation(), NOTE: This hook does NOT provide its own PanResponder to avoid conflicts, UsePipEntryOptions, UsePipEntryReturn, {width: SCREEN_WIDTH, height: SCREEN_HEIGHT}, useEnterAnimation(), useExitAnimation() (+4 more)

### Community 76 - "Community 76"
Cohesion: 0.16
Nodes (12): svgPaths, VideoPlayer(), linking, AboutScreenProps, AboutScreen(), BUILT_WITH, LINK_ITEMS, LinkItem (+4 more)

### Community 77 - "Community 77"
Cohesion: 0.25
Nodes (15): useAuth(), revokeGoogleAccess(), signOutFromGoogle(), authSlice, AuthState, initialState, RESET_APP_STATE, resetAppState (+7 more)

### Community 78 - "Community 78"
Cohesion: 0.18
Nodes (4): VideoV3Unsubscribe, VideoV3NativeStateSynchronizer, deriveCapabilities(), VideoV3StateAdapter

### Community 79 - "Community 79"
Cohesion: 0.18
Nodes (15): AUDIO_EXTENSIONS, COVER_FILENAMES, DIR_COVER_FILENAMES, EMPTY_METADATA, extractTrackNumber(), extractYear(), fileNameWithoutExt(), findCoverArt() (+7 more)

### Community 80 - "Community 80"
Cohesion: 0.25
Nodes (12): callJavaError(), callJavaEvent(), callJavaPropertyChanged(), clearJavaException(), JNIEnv, mpv_node, string, eventLoop() (+4 more)

### Community 81 - "Community 81"
Cohesion: 0.12
Nodes (15): codegenConfig, jsSrcsDir, name, type, engines, node, name, private (+7 more)

### Community 82 - "Community 82"
Cohesion: 0.19
Nodes (12): OptionSheetOption, SettingsRow, SettingsRowProps, styles, AudioSettingsScreenProps, AUDIO_DELAY_OPTIONS, AudioSettingsScreen(), PickerKind (+4 more)

### Community 83 - "Community 83"
Cohesion: 0.23
Nodes (13): styles, VideoV3ControlButton(), VideoV3ControlButtonProps, FullControls(), MiniControls(), primaryIcon(), primaryLabel(), statusLabel() (+5 more)

### Community 84 - "Community 84"
Cohesion: 0.20
Nodes (11): navigate(), DownloadRow, DownloadRowProps, DownloadsScreen(), POLICY_OPTIONS, statusLabel(), styles, DownloadsScreenProps (+3 more)

### Community 85 - "Community 85"
Cohesion: 0.18
Nodes (6): Bundle, SplashActivity, Animator, AppCompatActivity, ImageView, TextView

### Community 86 - "Community 86"
Cohesion: 0.26
Nodes (11): react, SleepTimerSheet(), SleepTimerSheetProps, ToolbarBtn(), VideoPlayerResumeOverlay(), VideoPlayerResumeOverlayProps, styles, VideoPlayerInner() (+3 more)

### Community 87 - "Community 87"
Cohesion: 0.26
Nodes (11): PODCAST_CATEGORIES, PodcastCategory, createPodcastsContentRenderer(), PodcastsContentProps, useSectionOptions(), PodcastCategoriesState, usePodcastCategories(), PodcastsScreen() (+3 more)

### Community 88 - "Community 88"
Cohesion: 0.19
Nodes (11): GestureCallbacks, GestureZone, PlayerGestureHandle, usePlayerGestures(), Props, VideoPlayerGestureLayer(), VideoPlayerSurfaceLayerProps, MpvRenderViewNative (+3 more)

### Community 89 - "Community 89"
Cohesion: 0.24
Nodes (11): createVideoV3BufferPresentation(), finite(), normalizeVideoV3BufferedRanges(), selectVideoV3ActiveBufferedRange(), VideoV3BufferPresentation, VideoV3SessionSnapshot, clampFraction(), formatTime() (+3 more)

### Community 90 - "Community 90"
Cohesion: 0.16
Nodes (11): LinkedFoldersDialog(), LinkedFoldersDialogProps, styles, LANGUAGES, styles, SubtitleLanguageDialog(), SubtitleLanguageDialogProps, styles (+3 more)

### Community 91 - "Community 91"
Cohesion: 0.17
Nodes (10): SongActions(), styles, MetadataRow, SongMetadata(), SongMetadataProps, styles, Props, SongScreen() (+2 more)

### Community 92 - "Community 92"
Cohesion: 0.20
Nodes (12): formatDuration(), getFormat(), SongNav, SongRoute, useSongScreen(), getActiveLyricIndex(), getUpcomingLyrics(), guessLrcPaths() (+4 more)

### Community 93 - "Community 93"
Cohesion: 0.19
Nodes (9): HomeHeader(), HomeHeaderProps, styles, BRAND, AnimatedCircle, NavigationProp, SplashScreen(), TIMING (+1 more)

### Community 94 - "Community 94"
Cohesion: 0.24
Nodes (9): ScreenContainer(), ScreenContainerProps, extractYear(), formatDuration(), MovieDetailScreen(), Props, styles, {width: SCREEN_WIDTH} (+1 more)

### Community 95 - "Community 95"
Cohesion: 0.29
Nodes (12): clearPersistedBookmarks(), BookmarkInput, BookmarkPositionUpdate, BookmarkAddOptions, BookmarkAddResult, BookmarkHandle, buildStableBookmarkId(), clearBookmarks() (+4 more)

### Community 96 - "Community 96"
Cohesion: 0.36
Nodes (12): appendNode(), jclass, jlong, JNIEnv, JNIEXPORT, jstring, mpv_node, string (+4 more)

### Community 97 - "Community 97"
Cohesion: 0.15
Nodes (12): jest, **/node_modules, **/Pods, @react-native/typescript-config, _reference_codes, **/*.ts, **/*.tsx, compilerOptions (+4 more)

### Community 98 - "Community 98"
Cohesion: 0.18
Nodes (12): bookmarkSlice, BookmarkState, BookmarkStateRoot, buildBookmark(), initialState, MAX_BOOKMARK_ENTRIES, normalizeBookmarks(), safeDate() (+4 more)

### Community 99 - "Community 99"
Cohesion: 0.24
Nodes (12): getAxiosInstance(), api(), CurrentWeatherInput, fetchWeatherByCity(), fetchWeatherByCoords(), getCityCoords(), getCurrentWeather(), IpGeoResult (+4 more)

### Community 100 - "Community 100"
Cohesion: 0.17
Nodes (5): ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState, FallbackColors, styles

### Community 101 - "Community 101"
Cohesion: 0.21
Nodes (10): AudioLyricsView(), AudioLyricsViewEntry, AudioLyricsViewProps, TabType, {width: SCREEN_WIDTH}, getCurrentLyricIndex(), getUpcomingLyrics(), LrcLine (+2 more)

### Community 102 - "Community 102"
Cohesion: 0.17
Nodes (11): ARCHIVE_BROWSE, ARCHIVE_CATEGORIES, ARCHIVE_QUICK_SEARCHES, ArchiveBrowseEntry, ArchiveCategory, ArchiveQuickSearch, AUDIOBOOK_CATEGORIES, AudiobookCategory (+3 more)

### Community 103 - "Community 103"
Cohesion: 0.27
Nodes (8): ERROR_COPY, LoginScreen(), ORB_SIZE, Props, styles, {width}, useLoginScreen(), LoginScreenProps

### Community 104 - "Community 104"
Cohesion: 0.20
Nodes (3): DURATION, staggerAnimations(), staggerEntrance()

### Community 105 - "Community 105"
Cohesion: 0.29
Nodes (4): LOG_LEVELS, Logger, LogLevel, serializeArgs()

### Community 106 - "Community 106"
Cohesion: 0.29
Nodes (8): Props, UsePodcastDetailScreenReturn, EPISODE_MENU_ACTIONS, HEADER_TITLE, INITIAL_MAX, LOAD_MORE_THROTTLE_MS, MAX_RESULTS_PER_QUERY, PodcastEpisodeResult

### Community 107 - "Community 107"
Cohesion: 0.33
Nodes (8): calculateScore(), completionWeight(), getRecentAudioEntries(), getRecentVideoEntries(), getWeightedResumptionList(), recencyScore(), SessionEntry, WeightedEntry

### Community 109 - "Community 109"
Cohesion: 0.39
Nodes (6): fmt(), fmtDuration(), NOTE: styles MUST be declared before chapterMarks so that the, SeekBar(), SeekBarProps, useDebounce()

### Community 110 - "Community 110"
Cohesion: 0.31
Nodes (7): CategoryCard, SectionRouteKey, BROWSE_ALL_SECTIONS, BrowseAllEntry, BrowseAllShelf, BrowseAllShelfProps, styles

### Community 111 - "Community 111"
Cohesion: 0.31
Nodes (6): ChangelogScreenProps, CHANGELOG, ChangelogScreen(), Props, VersionEntry, ChangelogScreenProps

### Community 112 - "Community 112"
Cohesion: 0.31
Nodes (6): LicensesScreenProps, LicenseEntry, LICENSES, LicensesScreen(), Props, LicensesScreenProps

### Community 113 - "Community 113"
Cohesion: 0.22
Nodes (6): AuthError, AuthErrorInfo, AuthErrorKind, AuthUser, SESSION_TTL_MS, testUser

### Community 114 - "Community 114"
Cohesion: 0.22
Nodes (7): Listener, listeners, MpvPlayerModule, native, NotificationMetadata, NotificationPlaybackState, SeekListener

### Community 115 - "Community 115"
Cohesion: 0.43
Nodes (7): MUSIC_CATEGORIES, genreLabel(), MusicContent(), useMusicData(), TrackCard, JAMENDO_GENRES, createMusicScreenStyles()

### Community 116 - "Community 116"
Cohesion: 0.48
Nodes (5): Chapter, ChapterBrowser(), ChapterBrowserProps, fmtTime(), timeRemaining()

### Community 117 - "Community 117"
Cohesion: 0.33
Nodes (5): createStyles(), ReplayButton(), ReplayButtonProps, icons, SvgIconProps

### Community 118 - "Community 118"
Cohesion: 0.48
Nodes (4): AccountSection(), Props, SettingsScreen(), SettingsScreenProps

### Community 119 - "Community 119"
Cohesion: 0.29
Nodes (6): SUBTITLE_COLOR_PRESETS, BG_OPACITIES, FONT_SIZES, styles, SubtitleStyleDialog(), SubtitleStyleDialogProps

### Community 121 - "Community 121"
Cohesion: 0.43
Nodes (6): isKnownKey(), isValidValue(), MpvConfigEditor(), MpvConfigEditorProps, MpvOption, VALID_MPV_KEYS

### Community 122 - "Community 122"
Cohesion: 0.33
Nodes (4): MainApplication, Application, ReactApplication, ReactHost

### Community 124 - "Community 124"
Cohesion: 0.33
Nodes (6): Props, Props, Section, Props, Bookmark, SongBookmarksProps

### Community 125 - "Community 125"
Cohesion: 0.47
Nodes (4): FilterChipItem, FilterChips, FilterChipsProps, styles

### Community 126 - "Community 126"
Cohesion: 0.53
Nodes (5): MOVIE_CATEGORIES, MovieCard, MoviesContent(), useMoviesData(), createMoviesScreenStyles()

### Community 128 - "Community 128"
Cohesion: 0.40
Nodes (5): callStaticJavaVoid(), getEnv(), Java_com_simba_player_mpv_MPVLib_nativeAttachSurface(), jmethodID, jobject

### Community 129 - "Community 129"
Cohesion: 0.60
Nodes (3): PlaylistContextMenu(), PlaylistContextMenuProps, styles

### Community 131 - "Community 131"
Cohesion: 0.40
Nodes (4): cityFromLocale(), cityFromTimezone(), COUNTRY_TO_CITY, ZONE_TO_CITY

### Community 133 - "Community 133"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 134 - "Community 134"
Cohesion: 0.50
Nodes (3): config, defaultConfig, { getDefaultConfig, mergeConfig }

### Community 138 - "Community 138"
Cohesion: 0.67
Nodes (3): UI/UX Elevation Progress Tracker v2 (Deprecated), UI/UX Elevation Progress Tracker v3 (Deprecated), UI/UX Elevation Progress Tracker v4

## Knowledge Gaps
- **964 isolated node(s):** `styles`, `trigger`, `fakeCodes`, `testUser`, `lock_` (+959 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **66 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTheme()` connect `Community 1` to `Community 0`, `Community 129`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 15`, `Community 20`, `Community 22`, `Community 28`, `Community 30`, `Community 34`, `Community 36`, `Community 37`, `Community 41`, `Community 42`, `Community 45`, `Community 46`, `Community 48`, `Community 49`, `Community 53`, `Community 54`, `Community 58`, `Community 59`, `Community 60`, `Community 63`, `Community 67`, `Community 68`, `Community 74`, `Community 76`, `Community 82`, `Community 84`, `Community 86`, `Community 88`, `Community 90`, `Community 91`, `Community 93`, `Community 94`, `Community 101`, `Community 103`, `Community 109`, `Community 111`, `Community 112`, `Community 115`, `Community 116`, `Community 117`, `Community 118`, `Community 121`, `Community 125`, `Community 126`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **Why does `react` connect `Community 86` to `Community 1`, `Community 126`, `Community 68`, `Community 7`, `Community 74`, `Community 115`, `Community 22`, `Community 26`, `Community 28`, `Community 62`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `AppText()` connect `Community 1` to `Community 0`, `Community 129`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 15`, `Community 20`, `Community 22`, `Community 28`, `Community 30`, `Community 34`, `Community 36`, `Community 37`, `Community 46`, `Community 48`, `Community 53`, `Community 54`, `Community 58`, `Community 59`, `Community 63`, `Community 67`, `Community 74`, `Community 76`, `Community 82`, `Community 84`, `Community 86`, `Community 90`, `Community 91`, `Community 93`, `Community 94`, `Community 100`, `Community 101`, `Community 103`, `Community 109`, `Community 111`, `Community 112`, `Community 116`, `Community 117`, `Community 118`, `Community 119`, `Community 121`, `Community 125`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **What connects `styles`, `trigger`, `fakeCodes` to the rest of the system?**
  _964 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0412737799834574 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.031476997578692496 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.045069778082818576 - nodes in this community are weakly interconnected._