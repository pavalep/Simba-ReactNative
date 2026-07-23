import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {CompositeScreenProps, NavigatorScreenParams} from '@react-navigation/native';

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList>;
  VideoPlayer: {fileUri?: string; fileTitle?: string};
  AudioPlayer: {fileUri?: string; fileTitle?: string};
  Preferences: undefined;
  Settings: NavigatorScreenParams<SettingsTabParamList>;
};

export type TabParamList = {
  HomeTab: NavigatorScreenParams<HomeTabParamList>;
  LibraryTab: NavigatorScreenParams<LibraryTabParamList>;
};

export type HomeTabParamList = {
  Home: undefined;
  Search: undefined;
  NowPlaying: {fileUri?: string; fileTitle?: string} | undefined;
};

export type LibraryTabParamList = {
  Library: undefined;
  FolderBrowser: {initialPath?: string};
  PlaylistDetail: {playlistId: string; playlistName: string};
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
export type SearchScreenProps = StackInTabProps<HomeTabParamList, 'HomeTab', 'Search'>;
export type NowPlayingScreenProps = StackInTabProps<HomeTabParamList, 'HomeTab', 'NowPlaying'>;

/** Composite props for Library tab stack screens. */
export type LibraryScreenProps = StackInTabProps<LibraryTabParamList, 'LibraryTab', 'Library'>;
export type FolderBrowserScreenProps = StackInTabProps<LibraryTabParamList, 'LibraryTab', 'FolderBrowser'>;
export type PlaylistDetailScreenProps = StackInTabProps<LibraryTabParamList, 'LibraryTab', 'PlaylistDetail'>;

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
