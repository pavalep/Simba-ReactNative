# SIMBA v11 Wave 0 — Route and Authentication Inventory

**Date:** 21 August 2026  
**Sources:** `src/navigation/RootNavigator.tsx`, `src/navigation/types.ts`, `src/navigation/SettingsStack.tsx`, `src/navigation/linking.ts`, `App.tsx`, `src/services/fileService.ts`  
**Playback architecture:** Audio and video are root overlays controlled by `PlaybackProvider`; there are no `AudioPlayer` or `VideoPlayer` navigation routes.

## Launch and authentication graph

| State | Initial root destination | Transition | Required behavior |
|---|---|---|---|
| First launch | `Splash` | `hasLaunched` is false | Complete initialization, then resolve authentication state |
| Returning unauthenticated | `Login` | `hasLaunched` true and `isAuthenticated` false | Login, validation, recoverable API failure, and no access to authenticated media routes |
| Authenticated | `Home` | `hasLaunched` true and `isAuthenticated` true | Direct Home entry with Library and Settings reachable without bottom tabs |
| Sign-in success | Current root navigator remounts with `authed` key | Auth state flips true | Initial route resolves to Home |
| Sign-out | Current root navigator remounts with `unauthed` key | Auth state flips false | Initial route resolves to Login; active authenticated surfaces must not remain reachable |

## Root route inventory

| Route | Parameters | Classification | Auth expectation | Entry/return notes |
|---|---|---|---|---|
| `Splash` | none | Release-critical | Public | Launch-only initialization surface |
| `Login` | none | Release-critical | Public | Auth failure and sign-in recovery required |
| `Home` | none | Release-critical | Authenticated | Direct root destination; no persistent tabs |
| `Library` | none | Release-critical | Authenticated | Direct root destination; local/API media entry |
| `Settings` | nested settings params | Release-critical | Authenticated | Internal Settings stack |
| `Bookmarks` | none | Release-critical | Authenticated | Isolated Bookmark façade |
| `Profile` | none | Release-critical | Authenticated | Personal destinations and sign-out |
| `History` | none | Release-critical | Authenticated | Isolated Recent History façade |
| `Stats` | none | Authenticated | Authenticated | Secondary personal surface |
| `ArtistScreen` | artist name | Secondary | Authenticated | Music browse/detail path |
| `AlbumScreen` | album name, artist name | Secondary | Authenticated | Music browse/detail path |
| `SongScreen` | file URI and optional metadata | Secondary | Authenticated | Local/API song detail path; error boundary present |
| `GenreScreen` | genre and optional initial tab | Secondary | Authenticated | Music genre path |
| `AllVideosScreen` | optional filter/sort | Secondary | Authenticated | Video library surface |
| `MoviesScreen` | optional category | Release-critical content | Authenticated | Internet Archive movie browse |
| `AllAudioScreen` | optional filter/sort | Secondary | Authenticated | Audio library surface |
| `AllPlaylistsScreen` | none | Release-critical | Authenticated | Separate audio/video playlist entry |
| `Search` | none | Secondary | Authenticated | Cross-content search |
| `NowPlaying` | optional file URI/title | Secondary | Authenticated | Legacy/secondary now-playing surface; playback ownership is root module |
| `FolderBrowser` | optional initial path, optional playlist target | Release-critical | Authenticated | Local folder linking and playlist insertion |
| `PlaylistDetail` | playlist ID/name | Release-critical | Authenticated | Lane-specific playlist management |
| `ArtistDetail` | artist name | Secondary | Authenticated | Music detail path |
| `AlbumDetail` | album title/artist/release group | Secondary | Authenticated | Music detail path |
| `PodcastsScreen` | optional category | Release-critical content | Authenticated | Podcast browse |
| `PodcastDetail` | podcast ID/title | Release-critical content | Authenticated | Follow/bookmark/episode playback |
| `MusicScreen` | optional genre | Release-critical content | Authenticated | Music browse |
| `MusicDetail` | track ID/provider | Release-critical content | Authenticated | Track detail/playback |
| `MovieDetail` | identifier/title | Release-critical content | Authenticated | Movie detail/playback |
| `RadioScreen` | optional tab/tag | Release-critical content | Authenticated | Radio browse/favorites |
| `RadioFavoritesScreen` | none | Release-critical content | Authenticated | Radio favorites |
| `LiveTVScreen` | optional category | Release-critical content | Authenticated | Live TV browse |
| `LiveTVFavoritesScreen` | none | Release-critical content | Authenticated | Live TV favorites |
| `AudiobooksScreen` | optional tab/genre | Release-critical content | Authenticated | Audiobook browse |
| `AudiobookDetail` | book ID/title | Release-critical content | Authenticated | Audiobook detail/playback |
| `ArchiveScreen` | optional tab/query | Release-critical content | Authenticated | Archive audio/video browse |
| `ArchiveItemDetail` | identifier/title | Release-critical content | Authenticated | Archive detail/playback |
| `ShowsScreen` | optional tab/genre | Secondary | Authenticated | TVMaze browse |
| `ShowDetail` | show ID/name | Secondary | Authenticated | TV show detail |
| `Queue` | optional source lane | Release-critical | Authenticated | Full-page queue; lane-aware |
| `Downloads` | none | Secondary | Authenticated | Offline/download surface |

## Settings stack inventory

`SettingsStack` is mounted from the authenticated root `Settings` route. Its destinations include `Settings`, `About`, `AudioSettings`, `Equalizer`, `LinkedFolders`, `FolderLinkingWizard`, `Changelog`, `Licenses`, `Credits`, `Privacy`, `Terms`, and `Help`. Every destination must either perform its action, present a real recoverable state, or be marked as deferred before release advertising.

## Playback overlay policy

The root playback host is rendered beside `RootNavigator`, not as a navigation screen. `PlaybackOverlayHost` selects hidden, mini, audio-full, or video-full presentation from playback state. The mini player must be hidden or transformed deliberately during full-screen presentation; source failure must not orphan an overlay. `openPlayer()` is the only public caller contract for opening playback.

## Smoke-test sheet

| ID | Smoke path | Expected result | Status |
|---|---|---|---|
| R-01 | First launch → Splash → Login | Unauthenticated user reaches Login after initialization | Static route logic recorded; device run open |
| R-02 | Login success → Home | Auth state remounts root to Home | Static route logic recorded; device run open |
| R-03 | Home → Library → Settings | Direct root navigation works without persistent tabs | Static route structure recorded; device run open |
| R-04 | Settings → LinkedFolders → FolderBrowser | Local folder linking is reachable and recoverable | Static route structure recorded; device run open |
| R-05 | Content card → `openPlayer()` | Audio/video overlay opens without a player route | TypeScript/static migration clean; device run open |
| R-06 | Full player → close/back → source screen | Overlay closes without orphaning navigation or mini-player | Device run open |
| R-07 | Authenticated screen → sign out | Root remounts to Login and clears authenticated access | Static root key logic recorded; device run open |
| R-08 | Shared/deep link → detail route | Correct destination and auth handling | App-link paths are declared in `src/navigation/linking.ts`; `content://`/`file://` shared media is handled in `App.tsx` and classified through `getMediaType`; device run open |
| R-09 | Full player → back/close | Correct presentation state and current source restoration | Device run open |
| R-10 | Any root route → mini-player visibility | No duplicate mini/full player ownership | Device run open |

## Open W0-P03 gaps

The static route and deep-link implementation inventory is complete. The following require runtime or deeper integration evidence before the phase can be marked Done: sign-out behavior from every nested route, full-player back behavior on device, content URI MIME accuracy where a URI has no useful extension, and the route smoke-test execution sheet with emulator results.
