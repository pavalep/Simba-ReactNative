import type {LinkingOptions} from '@react-navigation/native';
import type {RootStackParamList} from './types';

/**
 * Deep-linking configuration for the root stack.
 *
 * Scheme: simbaplayer://
 *
 * Examples:
 *   simbaplayer://artist/Eminem
 *   simbaplayer://album/Recovery/Eminem
 *   simbaplayer://song?uri=...
 *   simbaplayer://genre/Hip-Hop
 *   simbaplayer://genre/Hip-Hop?initialTab=moods
 *   simbaplayer://queue
 *   simbaplayer://bookmarks
 *   simbaplayer://videos
 *   simbaplayer://audio
 *   simbaplayer://playlists
 *   simbaplayer://playlist/<id>
 *   simbaplayer://library/artist/<name>
 *   simbaplayer://settings/equalizer
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['simbaplayer://', 'https://simbaplayer.app'],
  config: {
    initialRouteName: 'Home',
    screens: {
      Splash: 'splash',
      Login: 'login',
      Profile: 'profile',
      History: 'history',
            Stats: 'stats',
      Home: 'home',
      Library: 'library',
      Settings: {
        screens: {
          Settings: 'settings',
          Equalizer: 'settings/equalizer',
          About: 'settings/about',
          AudioSettings: 'settings/audio',
          LinkedFolders: 'settings/folders/:type',
          FolderLinkingWizard: {
            path: 'settings/folder-wizard/:type?',
            parse: {type: decodeURIComponent},
          },
          Changelog: 'settings/changelog',
          Licenses: 'settings/licenses',
          Credits: 'settings/credits',
          Privacy: 'settings/privacy',
          Terms: 'settings/terms',
          Help: 'settings/help',
        },
      },
      Bookmarks: 'bookmarks',
      // 48.1: full-page queue deep link
      Queue: 'queue',
      // 49.7: downloads deep link
      Downloads: 'downloads',
      // 56.7: these root-stack screens were previously nested under LibraryTab,
      // which made their deep links unreachable — they now live at root level.
      FolderBrowser: {
        path: 'folder/:initialPath?',
        parse: {initialPath: decodeURIComponent},
      },
      PlaylistDetail: {
        path: 'playlist/:playlistId',
        parse: {playlistId: decodeURIComponent},
      },
      ArtistDetail: {
        path: 'library/artist/:artistName',
        parse: {artistName: decodeURIComponent},
      },
      AlbumDetail: {
        path: 'library/album/:albumTitle/:artistName',
        parse: {
          albumTitle: decodeURIComponent,
          artistName: decodeURIComponent,
        },
      },
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
        parse: {
          genre: decodeURIComponent,
          // P41.7: optional tab query param (local/streaming/moods/radio)
          initialTab: decodeURIComponent,
        },
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
      RadioScreen: {
        path: 'radio/:initialTab?',
        parse: {initialTab: decodeURIComponent},
      },
      RadioFavoritesScreen: 'radio/favorites',
      LiveTVScreen: {
        path: 'tv/:categoryId?',
        parse: {categoryId: decodeURIComponent},
      },
      LiveTVFavoritesScreen: 'tv/favorites',
      AudiobooksScreen: {
        path: 'audiobooks/:initialTab?',
        parse: {
          initialTab: decodeURIComponent,
          genre: decodeURIComponent,
        },
      },
      AudiobookDetail: {
        path: 'audiobook/:bookId',
        parse: {bookId: Number, bookTitle: decodeURIComponent},
      },
      ArchiveScreen: {
        path: 'archive/:initialTab?',
        parse: {initialTab: decodeURIComponent},
      },
      ArchiveItemDetail: {
        path: 'archive-item/:identifier',
        parse: {identifier: decodeURIComponent, title: decodeURIComponent},
      },
      // ── P38: TV shows (TVMaze) ──
      ShowsScreen: {
        path: 'shows/:initialTab?',
        parse: {initialTab: decodeURIComponent},
      },
      ShowDetail: {
        path: 'show/:showId',
        parse: {showId: Number, showName: decodeURIComponent},
      },
    },
  },
};
