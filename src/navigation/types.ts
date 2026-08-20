import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {CompositeScreenProps, NavigatorScreenParams} from '@react-navigation/native';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Home: undefined;
  Library: undefined;
  Settings: NavigatorScreenParams<SettingsTabParamList>;
  Bookmarks: undefined;
  Profile: undefined;
  History: undefined;
  Stats: undefined;
  ArtistScreen: {artistName: string};
  AlbumScreen: {albumName: string; artistName: string};
  SongScreen: {fileUri: string; title?: string; artist?: string; album?: string};
  // P41.7: initialTab enables genre/mood deep links
  // (simbaplayer://genre/<genre>?initialTab=moods)
  GenreScreen: {
    genre: string;
    initialTab?: 'local' | 'streaming' | 'moods' | 'radio';
  };
  AllVideosScreen: {filter?: string; sort?: string} | undefined;
  AllAudioScreen: {filter?: string; sort?: string} | undefined;
  AllPlaylistsScreen: undefined;
  MoviesScreen: {categoryId?: string} | undefined;
  // ── Screens moved from tab stacks (Phase 14.0 navigation refactoring) ──
  PodcastsScreen: {categoryId?: number} | undefined;
  Search: undefined;
  NowPlaying: {fileUri?: string; fileTitle?: string} | undefined;
  FolderBrowser: {initialPath?: string; targetPlaylistId?: string};
  PlaylistDetail: {playlistId: string; playlistName: string};
  ArtistDetail: {artistName: string};
  AlbumDetail: {
    albumTitle: string;
      artistName: string;
      // P39.3: MusicBrainz release-group id for metadata enrichment
      musicBrainzReleaseId?: string;
    };
  // Synchronous title — required so the InternalHeader paints on the
  // first frame after navigation. Without it the header is blank during
  // the iOS-style slide transition (glitch visible because the header
  // re-mounts before the API resolves the real title). Every caller
  // (Home → podcasts, Podcasts → PodcastDetail, deep link, share) is
  // expected to pass `podcastTitle`; we still keep an in-screen fallback
  // for defensive completeness but the type guarantees non-undefined.
  PodcastDetail: {podcastId: number; podcastTitle: string};
  MusicScreen: {genre?: string} | undefined;
  MusicDetail: {trackId: string; source: 'jamendo' | 'audius'};
  MovieDetail: {identifier: string; title?: string};
  // ── P36: live radio + TV browse (wired RadioBrowser + IPTV-org) ──
  RadioScreen:
    | {
        initialTab?: 'top' | 'genres' | 'countries' | 'languages' | 'favorites';
        /** P53: when set, the Genres tab is preselected with this tag. */
        initialTag?: string;
      }
    | undefined;
  // ── v10.1 Wave 7: Favorites page reached via the Radio header heart ──
  RadioFavoritesScreen: undefined;
  LiveTVScreen: {categoryId?: string} | undefined;
  // ── v10.1 Wave 8: Favorites page reached via the Live TV header heart ──
  LiveTVFavoritesScreen: undefined;
  // ── P37: audiobooks (LibriVox) + Internet Archive ──
  AudiobooksScreen:
    | {
        initialTab?: 'search' | 'genres' | 'recent';
        /** P53: when set, the Genres tab is preselected with this genre. */
        initialGenre?: string;
      }
    | undefined;
  ArchiveScreen: {initialTab?: 'audio' | 'video'; query?: string} | undefined;
  AudiobookDetail: {bookId: number; bookTitle?: string};
  ArchiveItemDetail: {identifier: string; title?: string};
  // ── P38: TV shows (TVMaze) ──
  ShowsScreen:
    | {
        initialTab?: 'search' | 'today' | 'browse';
        /** P53: when set, the Browse tab is preselected with this TVMaze genre. */
        initialGenre?: string;
      }
    | undefined;
  ShowDetail: {showId: number; showName?: string};
  // ── P48: full-page queue (from QueueSheet / MiniAudioPlayer / deep link) ──
  // `from` records the screen that opened it so tap-to-jump can stay in the
  // same player (audio↔audio) or switch players (cross-type jump, 48.8).
  Queue: {from?: 'audio' | 'video' | 'mini'} | undefined;
  // ── P49: downloads & offline ──
  Downloads: undefined;
};

export type TabParamList = {
  HomeTab: NavigatorScreenParams<HomeTabParamList>;
  LibraryTab: NavigatorScreenParams<LibraryTabParamList>;
};

export type HomeTabParamList = {
  Home: undefined;
};

export type LibraryTabParamList = {
  Library: undefined;
};

export type SettingsTabParamList = {
  Settings: undefined;
  About: undefined;
  AudioSettings: undefined;
  Equalizer: undefined;
  LinkedFolders: {type: 'video' | 'audio'};
  FolderLinkingWizard: {type?: 'video' | 'audio'};
  Changelog: undefined;
  Licenses: undefined;
  Credits: undefined;
  Privacy: undefined;
  Terms: undefined;
  Help: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof TabParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<TabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

// ── Reusable helper for any screen inside the authenticated shell ──
type StackInShellProps<
  ScreenParam extends Record<string, object | undefined>,
  ShellKey extends keyof TabParamList,
  ScreenName extends keyof ScreenParam & string,
> = CompositeScreenProps<
  NativeStackScreenProps<ScreenParam, ScreenName>,
  CompositeScreenProps<
    NativeStackScreenProps<TabParamList, ShellKey>,
    RootStackScreenProps<keyof RootStackParamList>
  >
>;

/** Composite props for the Home stack screen. */
export type HomeScreenProps = StackInShellProps<HomeTabParamList, 'HomeTab', 'Home'>;

/** Composite props for the Library stack screen. */
export type LibraryScreenProps = StackInShellProps<LibraryTabParamList, 'LibraryTab', 'Library'>;

/** Root stack screen props for screens moved out of tab stacks (Phase 14.0). */
export type SearchScreenProps = RootStackScreenProps<'Search'>;
export type NowPlayingScreenProps = RootStackScreenProps<'NowPlaying'>;
export type FolderBrowserScreenProps = RootStackScreenProps<'FolderBrowser'>;
export type PlaylistDetailScreenProps = RootStackScreenProps<'PlaylistDetail'>;
export type ArtistDetailScreenProps = RootStackScreenProps<'ArtistDetail'>;
export type AlbumDetailScreenProps = RootStackScreenProps<'AlbumDetail'>;
export type PodcastDetailScreenProps = RootStackScreenProps<'PodcastDetail'>;
export type MusicDetailScreenProps = RootStackScreenProps<'MusicDetail'>;
export type MovieDetailScreenProps = RootStackScreenProps<'MovieDetail'>;
export type AudiobooksScreenProps = RootStackScreenProps<'AudiobooksScreen'>;
export type AudiobookDetailScreenProps = RootStackScreenProps<'AudiobookDetail'>;
export type ArchiveScreenProps = RootStackScreenProps<'ArchiveScreen'>;
export type ArchiveItemDetailScreenProps = RootStackScreenProps<'ArchiveItemDetail'>;
export type ShowsScreenProps = RootStackScreenProps<'ShowsScreen'>;
export type ShowDetailScreenProps = RootStackScreenProps<'ShowDetail'>;
export type QueueScreenProps = RootStackScreenProps<'Queue'>;
export type DownloadsScreenProps = RootStackScreenProps<'Downloads'>;

// ── Helper for screens inside the Settings root stack navigator ──
type SettingsStackScreenProps<T extends keyof SettingsTabParamList> = CompositeScreenProps<
  NativeStackScreenProps<SettingsTabParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

/** Composite props for Settings stack screens (rendered in RootStack). */
export type SettingsScreenProps = SettingsStackScreenProps<'Settings'>;
export type AboutScreenProps = SettingsStackScreenProps<'About'>;
export type AudioSettingsScreenProps = SettingsStackScreenProps<'AudioSettings'>;
export type EqualizerScreenProps = SettingsStackScreenProps<'Equalizer'>;
export type LinkedFoldersScreenProps = SettingsStackScreenProps<'LinkedFolders'>;
export type FolderLinkingWizardScreenProps = SettingsStackScreenProps<'FolderLinkingWizard'>;
export type ChangelogScreenProps = SettingsStackScreenProps<'Changelog'>;
export type LicensesScreenProps = SettingsStackScreenProps<'Licenses'>;
export type CreditsScreenProps = SettingsStackScreenProps<'Credits'>;
export type PrivacyScreenProps = SettingsStackScreenProps<'Privacy'>;
export type TermsScreenProps = SettingsStackScreenProps<'Terms'>;
export type HelpScreenProps = SettingsStackScreenProps<'Help'>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
