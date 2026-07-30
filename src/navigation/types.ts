import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {CompositeScreenProps, NavigatorScreenParams} from '@react-navigation/native';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Registration: undefined;
  MainTabs: NavigatorScreenParams<TabParamList>;
  VideoPlayer: {fileUri?: string; fileTitle?: string; startPosition?: number};
  AudioPlayer: {fileUri?: string; fileTitle?: string};
  Preferences: undefined;
  Settings: NavigatorScreenParams<SettingsTabParamList>;
  Bookmarks: undefined;
  About: undefined;
  ArtistScreen: {artistName: string};
  AlbumScreen: {albumName: string; artistName: string};
  SongScreen: {fileUri: string; title?: string; artist?: string; album?: string};
  GenreScreen: {genre: string};
  AllVideosScreen: {filter?: string; sort?: string} | undefined;
  AllAudioScreen: {filter?: string; sort?: string} | undefined;
  AllPlaylistsScreen: undefined;
  MoviesScreen: {categoryId?: string} | undefined;
  // ── Screens moved from tab stacks (Phase 14.0 navigation refactoring) ──
  PodcastsScreen: {categoryId?: number} | undefined;
  Search: undefined;
  NowPlaying: {fileUri?: string; fileTitle?: string} | undefined;
  FolderBrowser: {initialPath?: string};
  PlaylistDetail: {playlistId: string; playlistName: string};
  ArtistDetail: {artistName: string};
  AlbumDetail: {albumTitle: string; artistName: string};
  PodcastDetail: {podcastId: number; podcastTitle?: string};
  MusicScreen: {genre?: string} | undefined;
  MusicDetail: {trackId: string; source: 'jamendo' | 'audius'};
  MovieDetail: {identifier: string; title?: string};
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
  LinkedFolders: {type: 'video' | 'audio'};
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

// ── Helper for screens inside the Settings root stack navigator ──
type SettingsStackScreenProps<T extends keyof SettingsTabParamList> = CompositeScreenProps<
  NativeStackScreenProps<SettingsTabParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

/** Composite props for Settings stack screens (rendered in RootStack). */
export type SettingsScreenProps = SettingsStackScreenProps<'Settings'>;
export type AboutScreenProps = SettingsStackScreenProps<'About'>;
export type AudioSettingsScreenProps = SettingsStackScreenProps<'AudioSettings'>;
export type LinkedFoldersScreenProps = SettingsStackScreenProps<'LinkedFolders'>;

/** Root stack screen props. */
export type PreferencesScreenProps = RootStackScreenProps<'Preferences'>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
