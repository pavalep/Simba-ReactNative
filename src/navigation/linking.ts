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
 *   simbaplayer://genre/Hip-Hop?initialTab=streaming
 *   simbaplayer://queue
 *   simbaplayer://bookmarks
 *   simbaplayer://videos
 *   simbaplayer://audio
 *   simbaplayer://playlists
 *   simbaplayer://playlist/<id>
 *   simbaplayer://library/artist/<name>
 *   simbaplayer://settings/equalizer
 */

/**
 * The Genre screen's `initialTab` query param.
 *
 * The screen offers TWO sources — "My Library" and "Streaming" — since
 * v18.11.4 replaced the old four-tab chip row with a two-way toggle. The
 * `moods` and `radio` tabs of that older row are GONE: Moods was deferred
 * to a future entry point and Radio duplicates `RadioScreen`.
 *
 * The nav types and this file's parser used to promise all four values
 * while the screen honoured only `streaming`, so
 * `simbaplayer://genre/Hip-Hop?initialTab=moods` landed on "My Library"
 * and said nothing about why. An unknown value is now DROPPED, so the
 * screen falls back to its own default and the promise in
 * `navigation/types.ts` is the truth.
 */
function parseGenreInitialTab(value: string): 'local' | 'streaming' | undefined {
  if (value === 'streaming') return 'streaming';
  if (value === 'local') return 'local';
  return undefined;
}

export const linking: LinkingOptions<RootStackParamList> = {
  // 2026-11-12: `https://simbaplayer.app` is GONE as a prefix. There is
  // no such website — the project has no web presence — so declaring it
  // was two lies at once: the app claimed URLs on a domain it does not
  // own (which would hijack them from whoever does), and a link built
  // from it resolved to nothing.
  //
  // The scheme is the only prefix now. On Android the app must also
  // DECLARE the scheme in its manifest to receive the intent at all —
  // `android/app/src/main/AndroidManifest.xml` carries the
  // `simbaplayer` intent-filter on `MainActivity` (that was missing,
  // which is why no `simbaplayer://` link ever opened the app).
  prefixes: ['simbaplayer://'],
  config: {
    initialRouteName: 'Home',
    screens: {
      Login: 'login',
      // The Profile is also the preferences page — the Settings page was
      // merged into it on 2026-11-11 (`md/PROFILE_SETTINGS_MERGE.md`).
      //
      // The `settings` path is kept as an ALIAS, so `simbaplayer://settings`
      // still resolves to the same screen it always did. `alias` is a
      // supported `PathConfig` field (`@react-navigation/core`'s
      // `types.tsx`), and the alias configs are matched AFTER the main
      // ones and by segment count, so the more specific `settings/…`
      // siblings below still win over the bare `settings`.
      Profile: {path: 'profile', alias: ['settings']},
      History: 'history',
            Stats: 'stats',
      Home: 'home',
      Library: 'library',
      // ── The settings screens ────────────────────────────────────────
      // These used to sit in a nested `Settings` group. They are root
      // routes now, but the PATHS are deliberately unchanged — the same
      // URLs that resolved before still resolve, because a linking config
      // maps a route NAME to a path, and the name is all that changed.
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
          // P41.7: optional tab query param.
          //
          // The screen has TWO sources — "My Library" and "Streaming" —
          // since v18.11.4 replaced the old four-tab row with a two-way
          // toggle. This parser used to accept any string, and the nav
          // types promised four values (`local`/`streaming`/`moods`/
          // `radio`), but the screen honoured only `streaming`: a deep
          // link with `?initialTab=moods` landed on "My Library" and
          // said nothing about why.
          //
          // The promise is now narrowed to what the screen can do, and
          // anything else is DROPPED rather than silently redirected.
          initialTab: parseGenreInitialTab,
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
