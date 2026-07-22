import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {CompositeScreenProps, NavigatorScreenParams} from '@react-navigation/native';

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList>;
  Player: {fileUri?: string; fileTitle?: string};
  Preferences: undefined;
};

export type TabParamList = {
  HomeTab: NavigatorScreenParams<HomeTabParamList>;
  LibraryTab: NavigatorScreenParams<LibraryTabParamList>;
  SettingsTab: NavigatorScreenParams<SettingsTabParamList>;
};

export type HomeTabParamList = {
  Home: undefined;
  Search: undefined;
  NowPlaying: undefined;
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

/** Composite props for Settings tab stack screens. */
export type SettingsScreenProps = StackInTabProps<SettingsTabParamList, 'SettingsTab', 'Settings'>;
export type AboutScreenProps = StackInTabProps<SettingsTabParamList, 'SettingsTab', 'About'>;
export type AudioSettingsScreenProps = StackInTabProps<SettingsTabParamList, 'SettingsTab', 'AudioSettings'>;
export type LinkedFoldersScreenProps = StackInTabProps<SettingsTabParamList, 'SettingsTab', 'LinkedFolders'>;

/** Root stack screen props. */
export type PreferencesScreenProps = RootStackScreenProps<'Preferences'>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
