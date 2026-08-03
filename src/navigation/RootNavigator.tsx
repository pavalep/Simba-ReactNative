import React, {useEffect, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAppSelector} from '../store';
import {RootStackParamList} from './types';
import {navigationRef} from './navigationHelper';
import {TabNavigator} from './TabNavigator';
import {MiniAudioPlayer} from '../components/player/MiniAudioPlayer/MiniAudioPlayer';
import {SettingsStack} from './SettingsStack';
import {SplashScreen} from '../screens/Splash/SplashScreen';
import {VideoPlayerScreen} from '../screens/VideoPlayer/VideoPlayerScreen';
import {AudioPlayerScreen} from '../screens/AudioPlayer/AudioPlayerScreen';
import {LoginScreen} from '../screens/Login/LoginScreen';
import {BookmarksScreen} from '../screens/Bookmarks/BookmarksScreen';
import {ProfileScreen} from '../screens/Profile/ProfileScreen';
import {HistoryScreen} from '../screens/History/HistoryScreen';
import {StatsScreen} from '../screens/Stats/StatsScreen';
import {ArtistScreen} from '../screens/Artist/ArtistScreen';
import {AlbumScreen} from '../screens/Album/AlbumScreen';
import {SongScreen} from '../screens/Song/SongScreen';
import {GenreScreen} from '../screens/Genre/GenreScreen';
import {AllVideosScreen} from '../screens/AllVideos/AllVideosScreen';
import {MoviesScreen} from '../screens/MoviesScreen/MoviesScreen';
import {AllAudioScreen} from '../screens/AllAudio/AllAudioScreen';
import {AllPlaylistsScreen} from '../screens/AllPlaylists/AllPlaylistsScreen';
import {SearchScreen} from '../screens/Search/SearchScreen';
import {NowPlayingScreen} from '../screens/NowPlaying/NowPlayingScreen';
import {FolderBrowserScreen} from '../screens/FolderBrowser/FolderBrowserScreen';
import {PlaylistDetailScreen} from '../screens/PlaylistDetail/PlaylistDetailScreen';
import {ArtistDetailScreen} from '../screens/Library/ArtistDetailScreen';
import {AlbumDetailScreen} from '../screens/Library/AlbumDetailScreen';
import {ScreenErrorBoundary} from '../components/feedback/ScreenErrorBoundary';
import {PodcastsScreen} from '../screens/PodcastsScreen/PodcastsScreen';
import {PodcastDetailScreen} from '../screens/PodcastDetailScreen/PodcastDetailScreen';
import {MusicScreen} from '../screens/MusicScreen/MusicScreen';
import {MusicDetailScreen} from '../screens/MusicDetailScreen/MusicDetailScreen';
import {MovieDetailScreen} from '../screens/MovieDetailScreen/MovieDetailScreen';
import {RadioScreen} from '../screens/RadioScreen/RadioScreen';
import {LiveTVScreen} from '../screens/LiveTVScreen/LiveTVScreen';
import {AudiobooksScreen} from '../screens/AudiobooksScreen/AudiobooksScreen';
import {AudiobookDetailScreen} from '../screens/AudiobookDetailScreen/AudiobookDetailScreen';
import {ArchiveScreen} from '../screens/ArchiveScreen/ArchiveScreen';
import {ArchiveItemDetailScreen} from '../screens/ArchiveItemDetailScreen/ArchiveItemDetailScreen';
import {ShowsScreen} from '../screens/ShowsScreen/ShowsScreen';
import {ShowDetailScreen} from '../screens/ShowDetailScreen/ShowDetailScreen';
import {QueueScreen} from '../screens/QueueScreen/QueueScreen';
import {DownloadsScreen} from '../screens/DownloadsScreen/DownloadsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

// ─── Wrapper: TabNavigator + MiniAudioPlayer overlay ──────
const MainTabsWithMiniPlayer: React.FC = () => {
  return <TabNavigator />;
};

// ── 58.6: MiniAudioPlayer persists on every root-stack screen ──
// Mounted once at navigator level (sibling of the stack) so Search,
// Bookmarks, Queue, Downloads, ShowDetail, … all keep the mini player.
// Hidden while a full-screen player (AudioPlayer/VideoPlayer) is open so
// it never overlaps; bottom position adapts to tab bar presence.
const RootMiniPlayerOverlay: React.FC = () => {
  const [navState, setNavState] = useState<
    ReturnType<typeof navigationRef.getRootState>
  >();

  useEffect(() => {
    // Sibling of the navigator → no navigation context; track root state
    // through the global navigation ref instead of useNavigationState.
    if (navigationRef.isReady()) {
      setNavState(navigationRef.getRootState());
    }
    return navigationRef.addListener('state', () => {
      setNavState(navigationRef.getRootState());
    });
  }, []);

  // Wait for the first state snapshot so the overlay never flashes with
  // guessed insets before the navigator is ready.
  if (!navState) return null;

  const routeNames = navState.routes.map(r => r.name);
  const isPlayerActive =
    routeNames.includes('AudioPlayer') || routeNames.includes('VideoPlayer');
  const currentRoute = navState.routes[navState.index ?? 0]?.name;
  const overTabBar = currentRoute === 'MainTabs';

  if (isPlayerActive) return null;
  return <MiniAudioPlayer overTabBar={overTabBar} />;
};

export const RootNavigator: React.FC = () => {
  const hasLaunched = useAppSelector(state => state.settings.hasLaunched);
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  const initialRoute = !hasLaunched
    ? 'Splash'
    : !isAuthenticated
    ? 'Login'
    : 'MainTabs';

  return (
    <View style={styles.wrapper}>
      <Stack.Navigator
        // Remount the navigator whenever auth state flips so the initial
        // route is honoured reactively: sign-in → MainTabs, sign-out → Login.
        // initialRouteName is only consulted on mount, so without this key a
        // sign-out would leave the user stranded on Settings (Phase 29.9).
        key={isAuthenticated ? 'authed' : 'unauthed'}
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{gestureEnabled: false}}
      />
      <Stack.Screen name="MainTabs" component={MainTabsWithMiniPlayer} />
      <Stack.Screen
        name="VideoPlayer"
        options={{
          orientation: 'landscape',
          animation: 'fade',
        }}>
        {props => (
          <ScreenErrorBoundary onGoBack={() => props.navigation?.goBack()}>
            <VideoPlayerScreen {...props} />
          </ScreenErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="AudioPlayer"
        options={{
          animation: 'slide_from_bottom',
        }}>
        {props => (
          <ScreenErrorBoundary onGoBack={() => props.navigation?.goBack()}>
            <AudioPlayerScreen {...props} />
          </ScreenErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          animation: 'slide_from_right',
        }}
      />
      {/* 57.7: detail pushes all slide_from_right; fade stays for root/auth/player */}
      <Stack.Screen
        name="Bookmarks"
        component={BookmarksScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="History"
        component={HistoryScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="Stats"
        component={StatsScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="ArtistScreen"
        component={ArtistScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="AlbumScreen"
        component={AlbumScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="SongScreen"
        options={{animation: 'slide_from_right'}}>
        {props => (
          <ScreenErrorBoundary onGoBack={() => props.navigation?.goBack()}>
            <SongScreen {...props} />
          </ScreenErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="GenreScreen"
        component={GenreScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="AllVideosScreen"
        component={AllVideosScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="MoviesScreen"
        component={MoviesScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="AllAudioScreen"
        component={AllAudioScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="AllPlaylistsScreen"
        component={AllPlaylistsScreen}
        options={{animation: 'slide_from_right'}}
      />
      {/* ── Screens moved from tab stacks (Phase 14.0 navigation refactoring) ── */}
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="NowPlaying"
        component={NowPlayingScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="FolderBrowser"
        component={FolderBrowserScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="PlaylistDetail"
        component={PlaylistDetailScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="ArtistDetail"
        component={ArtistDetailScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="AlbumDetail"
        component={AlbumDetailScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="PodcastsScreen"
        component={PodcastsScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="PodcastDetail"
        component={PodcastDetailScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="MusicScreen"
        component={MusicScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="MusicDetail"
        component={MusicDetailScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="MovieDetail"
        component={MovieDetailScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="RadioScreen"
        component={RadioScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="LiveTVScreen"
        component={LiveTVScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="AudiobooksScreen"
        component={AudiobooksScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="AudiobookDetail"
        component={AudiobookDetailScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="ArchiveScreen"
        component={ArchiveScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="ArchiveItemDetail"
        component={ArchiveItemDetailScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="ShowsScreen"
        component={ShowsScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="ShowDetail"
        component={ShowDetailScreen}
        options={{animation: 'slide_from_right'}}
      />
      {/* ── P48: full-page queue (slide up like the sheet it replaces) ── */}
      <Stack.Screen
        name="Queue"
        component={QueueScreen}
        options={{animation: 'slide_from_bottom'}}
      />
      {/* ── P49: downloads & offline ── */}
      <Stack.Screen
        name="Downloads"
        component={DownloadsScreen}
        options={{animation: 'slide_from_right'}}
      />
      </Stack.Navigator>

      {/* 58.6: mini player overlays every root-stack screen */}
      <RootMiniPlayerOverlay />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
});
