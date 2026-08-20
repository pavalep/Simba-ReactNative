import React, {useEffect, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useAppSelector} from '../store';
import {RootStackParamList} from './types';
import {HomeScreen} from '../screens/Home';
import {LibraryScreen} from '../screens/Library';
import {SettingsStack} from './SettingsStack';
import {SplashScreen} from '../screens/Splash/SplashScreen';
import {LoginScreen} from '../screens/Login';
import {BookmarksScreen} from '../screens/Bookmarks/BookmarksScreen';
import {ProfileScreen} from '../screens/Profile';
import {HistoryScreen} from '../screens/History/HistoryScreen';
import {StatsScreen} from '../screens/Stats/StatsScreen';
import {ArtistScreen} from '../screens/Artist/ArtistScreen';
import {AlbumScreen} from '../screens/Album/AlbumScreen';
import {SongScreen} from '../screens/Song/SongScreen';
import {GenreScreen} from '../screens/Genre/GenreScreen';
import {AllVideosScreen} from '../screens/AllVideos/AllVideosScreen';
import {MoviesScreen} from '../screens/MoviesScreen';
import {AllAudioScreen} from '../screens/AllAudio/AllAudioScreen';
import {AllPlaylistsScreen} from '../screens/AllPlaylists/AllPlaylistsScreen';
import {SearchScreen} from '../screens/Search/SearchScreen';
import {NowPlayingScreen} from '../screens/NowPlaying/NowPlayingScreen';
import {FolderBrowserScreen} from '../screens/FolderBrowser/FolderBrowserScreen';
import {PlaylistDetailScreen} from '../screens/PlaylistDetail/PlaylistDetailScreen';
import {ArtistDetailScreen} from '../screens/Library/ArtistDetailScreen';
import {AlbumDetailScreen} from '../screens/Library/AlbumDetailScreen';
import {ScreenErrorBoundary} from '../components/feedback/ScreenErrorBoundary';
import {PodcastsScreen} from '../screens/PodcastsScreen';
import {PodcastDetailScreen} from '../screens/PodcastDetailScreen';
import {MusicScreen} from '../screens/MusicScreen';
import {MusicDetailScreen} from '../screens/MusicDetailScreen/MusicDetailScreen';
import {MovieDetailScreen} from '../screens/MovieDetailScreen/MovieDetailScreen';
import {RadioScreenNew} from '../screens/RadioScreenNew';
import {RadioFavoritesScreen} from '../screens/RadioScreenNew/RadioFavoritesScreen';
import {LiveTVScreenNew} from '../screens/LiveTVScreenNew';
import {LiveTVFavoritesScreen} from '../screens/LiveTVScreenNew/LiveTVFavoritesScreen';
import {AudiobooksScreen} from '../screens/AudiobooksScreen';
import {AudiobookDetailScreen} from '../screens/AudiobookDetailScreen/AudiobookDetailScreen';
import {ArchiveScreen} from '../screens/ArchiveScreen';
import {ArchiveItemDetailScreen} from '../screens/ArchiveItemDetailScreen/ArchiveItemDetailScreen';
import {ShowsScreen} from '../screens/ShowsScreen/ShowsScreen';
import {ShowDetailScreen} from '../screens/ShowDetailScreen/ShowDetailScreen';
import {QueueScreen} from '../screens/QueueScreen/QueueScreen';
import {DownloadsScreen} from '../screens/DownloadsScreen/DownloadsScreen';
import {OfflineBanner} from '../components/status/OfflineBanner/OfflineBanner';

const Stack = createNativeStackNavigator<RootStackParamList>();

// ─── Direct authenticated destinations ─────────────────────────────

export const RootNavigator: React.FC = () => {
  const hasLaunched = useAppSelector(state => state.settings.hasLaunched);
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  const initialRoute = !hasLaunched
    ? 'Splash'
    : !isAuthenticated
    ? 'Login'
    : 'Home';

  return (
    <View style={styles.wrapper}>
      <Stack.Navigator
        // Remount the navigator whenever auth state flips so the initial
        // route is honoured reactively: sign-in → Home, sign-out → Login.
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
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{animation: 'fade'}}
      />
      <Stack.Screen
        name="Library"
        component={LibraryScreen}
        options={{animation: 'slide_from_right'}}
      />
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
        component={RadioScreenNew}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="RadioFavoritesScreen"
        component={RadioFavoritesScreen}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="LiveTVScreen"
        component={LiveTVScreenNew}
        options={{animation: 'slide_from_right'}}
      />
      <Stack.Screen
        name="LiveTVFavoritesScreen"
        component={LiveTVFavoritesScreen}
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

      {/* Global connectivity state is visible on every root-stack screen. */}
      <OfflineBanner />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
});
