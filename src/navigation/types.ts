import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {CompositeScreenProps, NavigatorScreenParams} from '@react-navigation/native';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  MainTabs: NavigatorScreenParams<TabParamList>;
  /** P36.5: optional live channel list (IPTV) for channel up/down in the player */
  VideoPlayer: {
    fileUri?: string;
    fileTitle?: string;
    startPosition?: number;
    source?: string;
    liveChannels?: LiveChannelParam[];
    liveChannelIndex?: number;
    /**
     * Optional pre-flight error (e.g. when an upstream lookup returned no
     * playable file). When present, the player renders this error instead
     * of attempting to load an empty/invalid URL.
     */
    initialError?: {title: string; message: string};
  };
  AudioPlayer: {
    fileUri?: string;
    fileTitle?: string;
    artworkUri?: string;
    source?: string;
    /** 58.2: explicit resume intent (e.g. Continue Listening) — silent seek */
    startPosition?: number;
    /** P37.3: ordered chapter/track list — drives EOF auto-advance */
    chapterList?: AudioChapterParam[];
    chapterIndex?: number;
  };
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
  PodcastDetail: {podcastId: number; podcastTitle?: string};
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

/** P37.3: a single chapter/track passed to AudioPlayer for auto-advance. */
export interface AudioChapterParam {
  uri: string;
  title: string;
  duration?: number;
}
/** P36.5: a single live channel passed to VideoPlayer for channel up/down. */
export interface LiveChannelParam {
  id: string;
  name: string;
  url: string;
  logo?: string;
}

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
    BottomTabScreenProps<TabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

// ── Reusable helper for any screen inside a tab's stack navigator ──
type StackInTabProps<
  TabParam extends Record<string, object | undefined>,
  TabKey extends keyof TabParamList,
  ScreenName extends keyof TabParam & string,
> = CompositeScreenProps<
  NativeStackScreenProps<TabParam, ScreenName>,
  CompositeScreenProps<
    BottomTabScreenProps<TabParamList, TabKey>,
    RootStackScreenProps<keyof RootStackParamList>
  >
>;

/** Composite props for Home tab stack screens. */
export type HomeScreenProps = StackInTabProps<HomeTabParamList, 'HomeTab', 'Home'>;

/** Composite props for Library tab stack screens. */
export type LibraryScreenProps = StackInTabProps<LibraryTabParamList, 'LibraryTab', 'Library'>;

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
