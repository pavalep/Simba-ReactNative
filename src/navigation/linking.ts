import type {LinkingOptions} from '@react-navigation/native';
import type {RootStackParamList} from './types';

/**
 * Deep-linking configuration for the root stack.
 *
 * Scheme: simbaplayer://
 *
 * Examples:
 *   simbaplayer://video-player?uri=...&title=...
 *   simbaplayer://audio-player?uri=...&title=...
 *   simbaplayer://artist/Eminem
 *   simbaplayer://album/Recovery/Eminem
 *   simbaplayer://song?uri=...
 *   simbaplayer://genre/Hip-Hop
 *   simbaplayer://bookmarks
 *   simbaplayer://about
 *   simbaplayer://videos
 *   simbaplayer://audio
 *   simbaplayer://playlists
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['simbaplayer://', 'https://simbaplayer.app'],
  config: {
    initialRouteName: 'MainTabs',
    screens: {
      Splash: 'splash',
      Login: 'login',
      Registration: 'registration',
      MainTabs: {
        screens: {
          HomeTab: {
            screens: {
              Home: 'home',
            },
          },
          LibraryTab: {
            screens: {
              Library: 'library',
              FolderBrowser: 'folder/:initialPath?',
              PlaylistDetail: 'playlist/:playlistId',
              ArtistDetail: 'library/artist/:artistName',
              AlbumDetail: 'library/album/:albumTitle/:artistName',
            },
          },
        },
      },
      VideoPlayer: {
        path: 'video-player',
        exact: true,
        parse: {
          fileUri: decodeURIComponent,
          fileTitle: decodeURIComponent,
          startPosition: Number,
        },
      },
      AudioPlayer: {
        path: 'audio-player',
        exact: true,
        parse: {
          fileUri: decodeURIComponent,
          fileTitle: decodeURIComponent,
        },
      },
      Preferences: 'preferences',
      Settings: {
        screens: {
          Settings: 'settings',
          About: 'settings/about',
          AudioSettings: 'settings/audio',
          LinkedFolders: 'settings/folders/:type',
          FolderLinkingWizard: {
            path: 'settings/folder-wizard/:type?',
            parse: {type: decodeURIComponent},
          },
          Changelog: 'settings/changelog',
          Licenses: 'settings/licenses',
          Privacy: 'settings/privacy',
          Terms: 'settings/terms',
        },
      },
      Bookmarks: 'bookmarks',
      About: 'about',
      ArtistScreen: {
        path: 'artist/:artistName',
        parse: {artistName: decodeURIComponent},
      },
      AlbumScreen: {
        path: 'album/:albumName/:artistName',
        parse: {albumName: decodeURIComponent, artistName: decodeURIComponent},
      },
      SongScreen: {
        path: 'song',
        parse: {
          fileUri: decodeURIComponent,
          title: decodeURIComponent,
          artist: decodeURIComponent,
          album: decodeURIComponent,
        },
      },
      GenreScreen: {
        path: 'genre/:genre',
        parse: {genre: decodeURIComponent},
      },
      AllVideosScreen: 'videos',
      AllAudioScreen: 'audio',
      AllPlaylistsScreen: 'playlists',
      Search: 'search',
      NowPlaying: {
        path: 'now-playing',
        parse: {
          fileUri: decodeURIComponent,
          fileTitle: decodeURIComponent,
        },
      },
      MoviesScreen: 'movies',
      MusicScreen: 'music',
      PodcastsScreen: 'podcasts',
      MusicDetail: {
        path: 'music/:trackId/:source?',
        parse: {
          trackId: decodeURIComponent,
          source: decodeURIComponent,
        },
      },
      MovieDetail: {
        path: 'movie/:identifier',
        parse: {
          identifier: decodeURIComponent,
        },
      },
      PodcastDetail: {
        path: 'podcast/:podcastId',
        parse: {
          podcastId: Number,
          podcastTitle: decodeURIComponent,
        },
      },
    },
  },
};
