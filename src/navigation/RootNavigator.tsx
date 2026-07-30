import React from 'react';
import {View, StyleSheet} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useNavigationState} from '@react-navigation/native';
import {useAppSelector} from '../store';
import {RootStackParamList} from './types';
import {TabNavigator} from './TabNavigator';
import {MiniAudioPlayer} from '../components/player/MiniAudioPlayer/MiniAudioPlayer';
import {SettingsStack} from './SettingsStack';
import {SplashScreen} from '../screens/Splash/SplashScreen';
import {VideoPlayerScreen} from '../screens/VideoPlayer/VideoPlayerScreen';
import {AudioPlayerScreen} from '../screens/AudioPlayer/AudioPlayerScreen';
import {PreferencesScreen} from '../screens/Preferences/PreferencesScreen';
import {LoginScreen} from '../screens/Login/LoginScreen';
import {RegistrationScreen} from '../screens/Registration/RegistrationScreen';
import {BookmarksScreen} from '../screens/Bookmarks/BookmarksScreen';
import {AboutScreen} from '../screens/About/AboutScreen';
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

const Stack = createNativeStackNavigator<RootStackParamList>();

// ─── Wrapper: TabNavigator + MiniAudioPlayer overlay ──────
const MainTabsWithMiniPlayer: React.FC = () => {
  // Hide mini player when user is on AudioPlayer screen
  const routeNames = useNavigationState(state =>
    state?.routes?.map(r => r.name),
  );
  const isAudioPlayerActive = routeNames?.includes('AudioPlayer');

  return (
    <View style={styles.wrapper}>
      <TabNavigator />
      {!isAudioPlayerActive && <MiniAudioPlayer />}
    </View>
  );
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
    <Stack.Navigator
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
      <Stack.Screen
        name="Registration"
        component={RegistrationScreen}
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
        name="Preferences"
        options={{
          animation: 'slide_from_right',
          presentation: 'modal',
        }}>
        {props => (
          <ScreenErrorBoundary onGoBack={() => props.navigation?.goBack()}>
            <PreferencesScreen {...props} />
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
      <Stack.Screen name="Bookmarks" component={BookmarksScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="ArtistScreen" component={ArtistScreen} />
      <Stack.Screen name="AlbumScreen" component={AlbumScreen} />
      <Stack.Screen
        name="SongScreen"
        options={{animation: 'slide_from_right'}}>
        {props => (
          <ScreenErrorBoundary onGoBack={() => props.navigation?.goBack()}>
            <SongScreen {...props} />
          </ScreenErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen name="GenreScreen" component={GenreScreen} />
      <Stack.Screen name="AllVideosScreen" component={AllVideosScreen} />
      <Stack.Screen name="MoviesScreen" component={MoviesScreen} />
      <Stack.Screen name="AllAudioScreen" component={AllAudioScreen} />
      <Stack.Screen name="AllPlaylistsScreen" component={AllPlaylistsScreen} />
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
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
});
