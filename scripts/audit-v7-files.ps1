$ErrorActionPreference = 'Stop'
Set-Location "X:\Development\SIMBA\MOBILE_APP_REACT_NATIVE"

$tsModified = @(
  # Wave 2 (5)
  'src/constants/fontFamily.ts'
  'src/theme/tokens.ts'
  'src/theme/typographyStyles.ts'
  'src/components/core/AppText/AppText.tsx'
  'src/screens/Settings/components/MpvConfigEditor.tsx'
  # Wave 3 (5)
  'src/constants/brand.ts'
  'src/screens/Login/textContent.ts'
  'src/components/layout/HomeHeader/HomeHeader.tsx'
  'src/screens/Splash/SplashScreen.tsx'
  'src/screens/Login/LoginScreen.tsx'
  # Wave 5 batch 1 (7)
  'src/components/utility/SubsectionTitle/SubsectionTitle.tsx'
  'src/components/layout/InternalHeader/InternalHeader.tsx'
  'src/screens/Library/LibraryScreen.tsx'
  'src/screens/Library/AlbumDetailScreen.tsx'
  'src/screens/Library/ArtistDetailScreen.tsx'
  'src/screens/QueueScreen/QueueScreen.tsx'
  'src/screens/Library/components/LibraryAlbumsSegment.tsx'
  'src/screens/Library/components/LibraryArtistsSegment.tsx'
  'src/screens/Genre/GenreScreen.tsx'
  # Wave 5 batch 2 (3)
  'src/screens/History/HistoryScreen.tsx'
  'src/screens/Stats/StatsScreen.tsx'
  'src/screens/DownloadsScreen/DownloadsScreen.tsx'
  # Wave 5 batch 3 (3)
  'src/screens/Profile/ProfileScreen.tsx'
  'src/screens/Search/SearchScreen.tsx'
  # Wave 5 batch 4 (3)
  'src/screens/AllVideos/AllVideosScreen.tsx'
  'src/screens/AllAudio/AllAudioScreen.tsx'
  'src/screens/AllPlaylists/AllPlaylistsScreen.tsx'
  # Wave 6 (12 detail heroes + InternalHeader titleVariant opt-in)
  'src/screens/MusicDetailScreen/MusicDetailScreen.tsx'
  'src/screens/MovieDetailScreen/MovieDetailScreen.tsx'
  'src/screens/PodcastDetailScreen/PodcastDetailScreen.tsx'
  'src/screens/ShowDetailScreen/ShowDetailScreen.tsx'
  'src/screens/AudiobookDetailScreen/AudiobookDetailScreen.tsx'
  'src/screens/ArchiveItemDetailScreen/ArchiveItemDetailScreen.tsx'
  'src/screens/PlaylistDetail/PlaylistDetailScreen.tsx'
  'src/screens/AudioPlayer/components/AudioTrackInfo.tsx'
  'src/components/player/NowPlayingInfo/TrackMetadata.tsx'
  'src/screens/VideoPlayer/components/VideoPlayerTopBar.tsx'
  'src/screens/Home/components/WeatherGreeting/WeatherGreeting.tsx'
  # 7 static info pages (Wave 6 batch 6)
  'src/screens/About/AboutScreen.tsx'
  'src/screens/Changelog/ChangelogScreen.tsx'
  'src/screens/Credits/CreditsScreen.tsx'
  'src/screens/Help/HelpScreen.tsx'
  'src/screens/Licenses/LicensesScreen.tsx'
  'src/screens/Privacy/PrivacyScreen.tsx'
  'src/screens/Terms/TermsScreen.tsx'
  # Wave 7 - 4 components
  'src/components/utility/SectionHeader/SectionHeader.tsx'
  'src/components/utility/SvgIcon/SvgIcon.tsx'
  # Wave 7 - 3 library rails
  'src/screens/Home/components/HomeMediaShelf.tsx'
  'src/screens/Home/components/HomeBookmarksList.tsx'
  'src/screens/Home/components/FollowedPodcastsShelf.tsx'
  # Wave 7 - 2 Discover rails
  'src/screens/Home/components/MovieCategoriesShelf.tsx'
  'src/screens/Home/components/PodcastCategoriesShelf.tsx'
  'src/screens/Home/HomeScreen.tsx'
  # Wave 7 - song / audio player / lyrics (4)
  'src/screens/Song/SongScreen.tsx'
  'src/screens/Song/components/SongHero.tsx'
  'src/screens/Song/components/SongBookmarks.tsx'
  'src/screens/Song/components/SongMetadata.tsx'
  'src/screens/AudioPlayer/components/AudioPlayerHeader.tsx'
  'src/screens/AudioPlayer/components/AudioResumeOverlay.tsx'
  'src/components/player/AudioLyricsView/AudioLyricsView.tsx'
  # Wave 7 - sheets / dialogs (8)
  'src/components/sheets/PlaylistSheet/PlaylistSheet.tsx'
  'src/components/player/NowPlayingInfo/InfoSheet.tsx'
  'src/components/bookmark/BookmarkSheet.tsx'
  'src/components/player/PlaylistPreview/PlaylistPreviewSheet.tsx'
  'src/components/player/QueueManagement/QueueManagementSheet.tsx'
  'src/components/core/Dialog/Dialog.tsx'
  'src/components/feedback/PlayerErrorFallback/PlayerErrorFallback.tsx'
  'src/features/playlists/components/PlaylistModal.tsx'
  # Wave 7 - search / artist / album / song (4)
  'src/screens/Search/components/RemoteResults.tsx'
  'src/screens/Artist/components/ArtistBio.tsx'
  'src/screens/Artist/components/ArtistDiscography.tsx'
  'src/screens/Artist/components/ArtistTopTracks.tsx'
  'src/screens/Album/AlbumScreen.tsx'
  'src/screens/Artist/ArtistScreen.tsx'
  'src/screens/FolderLinkingWizard/FolderLinkingWizard.tsx'
  'src/screens/Home/components/HomeEmptyState.tsx'
)

Write-Output "v7 TS/TSX file list count: $($tsModified.Count)"
$existing = $tsModified | Where-Object { Test-Path $_ }
Write-Output "Existing on disk: $($existing.Count)"
$missing = $tsModified | Where-Object { -not (Test-Path $_) }
if ($missing.Count -gt 0) {
  Write-Output "MISSING:"
  $missing | ForEach-Object { Write-Output "  $_" }
}

# Verify each has a v7 variant or relevant change
$markers = @('brandScript','displaySerif','displaySans','mono','FONT_FAMILY')
$withMarker = 0
foreach ($f in $existing) {
  $content = Get-Content $f -Raw
  $hasMarker = $false
  foreach ($m in $markers) {
    if ($content.Contains($m)) { $hasMarker = $true; break }
  }
  if ($hasMarker) { $withMarker++ }
}
Write-Output ""
Write-Output "Files containing a v7 marker (variant name or FONT_FAMILY import): $withMarker / $($existing.Count)"

# Cross-check: search for ALL files in src that use any of the v7 markers
Write-Output ""
Write-Output "=== ALL src files that reference FONT_FAMILY ==="
Get-ChildItem src -Recurse -File -Include *.ts,*.tsx |
  Select-String -Pattern 'FONT_FAMILY' |
  Select-Object -ExpandProperty Path |
  Sort-Object -Unique |
  ForEach-Object { (Resolve-Path $_).Path.Substring((Get-Location).Path.Length + 1) }
