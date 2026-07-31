// ────────────────────────────────────────────────────────
// Simba Player — Profile Screen (Phase 42)
// Real store-backed stats · recently played · shortcuts ·
// theme quick toggle · sign out / revoke / clear data
// ────────────────────────────────────────────────────────

import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {AppText} from '../../components/core/AppText/AppText';
import {Avatar} from '../../components/core/Avatar/Avatar';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {SettingsRow} from '../../components/utility/SettingsRow/SettingsRow';
import {ConfirmDialog} from '../../components/core/Dialog/ConfirmDialog';
import {useToast} from '../../components/feedback/Toast/Toast';
import {useAuth} from '../../hooks/useAuth';
import {useAppDispatch, useAppSelector} from '../../store';
import {selectTrackCount, selectAllTracks} from '../../store/slices/mediaSlice';
import {selectAllPlaylists} from '../../store/slices/playlistSlice';
import {selectBookmarkCount, clearAllBookmarks} from '../../store/slices/bookmarkSlice';
import {clearAllRecent} from '../../store/slices/sessionSlice';
import {setThemeMode} from '../../store/slices/settingsSlice';
import {formatDuration} from '../../utils/timeAgo';
import {clearCache} from '../../services/cacheService';
import type {RootStackScreenProps} from '../../navigation/types';

type Props = RootStackScreenProps<'Profile'>;

const THEME_ORDER: Array<'system' | 'dark' | 'light'> = [
  'system',
  'dark',
  'light',
];

const THEME_LABEL: Record<'system' | 'dark' | 'light', string> = {
  system: 'System',
  dark: 'Dark',
  light: 'Light',
};

export const ProfileScreen: React.FC<Props> = ({navigation}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const {user, isAuthenticated, isLoading, signIn, signOut, revokeAccess} =
    useAuth();

  // ── Real store stats (42.3 — no fabricated numbers) ──
  const trackCount = useAppSelector(selectTrackCount);
  const allTracks = useAppSelector(selectAllTracks);
  const playlistCount = useAppSelector(
    state => selectAllPlaylists(state).length,
  );
  const bookmarkCount = useAppSelector(selectBookmarkCount);
  const recentFiles = useAppSelector(state => state.session.recentFiles);
  const playCounts = useAppSelector(state => state.session.playCounts);
  const themeMode = useAppSelector(state => state.settings.themeMode);

  const videoCount = useMemo(
    () => allTracks.filter(t => t.mediaType === 'video').length,
    [allTracks],
  );

  const totalPlays = useMemo(
    () => Object.values(playCounts).reduce((sum, n) => sum + n, 0),
    [playCounts],
  );

  /** Honest estimate: Σ(playCount × duration) across recent entries. */
  const playbackSeconds = useMemo(
    () =>
      recentFiles.reduce((sum, entry) => {
        const count = playCounts[entry.fileUri] ?? 0;
        return sum + count * Math.max(0, entry.duration);
      }, 0),
    [recentFiles, playCounts],
  );

  // ── Dialogs (42.6 / 42.7 / 43.5) ──
  const [signOutVisible, setSignOutVisible] = useState(false);
  const [revokeVisible, setRevokeVisible] = useState(false);
  const [wipeVisible, setWipeVisible] = useState(false);

  const stats: Array<{label: string; value: string}> = [
    {label: 'Tracks', value: String(trackCount)},
    {label: 'Videos', value: String(videoCount)},
    {label: 'Bookmarks', value: String(bookmarkCount)},
    {label: 'Playlists', value: String(playlistCount)},
    {label: 'Plays', value: String(totalPlays)},
    {label: 'Playback', value: formatDuration(playbackSeconds)},
  ];

  // ── Theme quick toggle (42.5) ──
  const handleThemeToggle = useCallback(() => {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(themeMode) + 1) % THEME_ORDER.length];
    dispatch(setThemeMode(next));
    toast.show(`Theme: ${THEME_LABEL[next]}`);
  }, [themeMode, dispatch, toast]);

  const handleConfirmSignOut = useCallback(async () => {
    setSignOutVisible(false);
    await signOut();
  }, [signOut]);

  const handleConfirmRevoke = useCallback(async () => {
    setRevokeVisible(false);
    const ok = await revokeAccess();
    toast.show(
      ok ? 'Google access revoked' : 'Revocation failed — signed out locally',
    );
  }, [revokeAccess, toast]);

  const handleConfirmWipe = useCallback(async () => {
    setWipeVisible(false);
    dispatch(clearAllRecent());
    dispatch(clearAllBookmarks());
    try {
      await clearCache();
    } catch {
      // cache clear is best-effort
    }
    toast.show('Local data cleared');
  }, [dispatch, toast]);

  const handleRecentPress = useCallback(
    (fileUri: string, mediaType?: 'video' | 'audio', title?: string) => {
      if (mediaType === 'audio') {
        navigation.navigate('AudioPlayer', {fileUri, fileTitle: title});
      } else {
        navigation.navigate('VideoPlayer', {fileUri, fileTitle: title});
      }
    },
    [navigation],
  );

  const recentStrip = recentFiles.slice(0, 5);

  return (
    <View
      style={[
        styles.root,
        {backgroundColor: colors.background.primary, paddingTop: insets.top},
      ]}>
      <ScrollView contentContainerStyle={styles.scroll} bounces>
        {/* ── Header card (42.1/42.2) ── */}
        <View
          style={[styles.headerCard, {backgroundColor: colors.background.elevated}]}>
          {isAuthenticated && user ? (
            <>
              <Avatar uri={user.photo} name={user.name} size={64} />
              <View style={styles.headerInfo}>
                <AppText variant="h3" color="primary">
                  {user.name || 'Simba User'}
                </AppText>
                <AppText variant="caption" color="secondary">
                  {user.email || 'Signed in with Google'}
                </AppText>
              </View>
            </>
          ) : (
            <>
              <View
                style={[
                  styles.placeholderAvatar,
                  {backgroundColor: colors.border.subtle},
                ]}>
                <SvgIcon name="lion" size={28} color={colors.accent.gold} />
              </View>
              <View style={styles.headerInfo}>
                <AppText variant="h3" color="primary">
                  Guest
                </AppText>
                <AppText variant="caption" color="secondary">
                  Sign in to sync your library
                </AppText>
              </View>
              <TouchableOpacity
                style={[
                  styles.signInBtn,
                  {backgroundColor: colors.accent.gold},
                ]}
                onPress={signIn}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Sign in with Google">
                {isLoading ? (
                  <ActivityIndicator color={colors.text.inverse} size="small" />
                ) : (
                  <AppText
                    variant="bodySmall"
                    style={[styles.signInLabel, {color: colors.text.inverse}]}>
                    Sign In
                  </AppText>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── Stats grid (42.3) ── */}
        <View style={styles.statsGrid}>
          {stats.map(stat => (
            <View
              key={stat.label}
              style={[
                styles.statCell,
                {backgroundColor: colors.background.elevated},
              ]}>
              <AppText variant="h3" color="primary">
                {stat.value}
              </AppText>
              <AppText variant="caption" color="tertiary">
                {stat.label}
              </AppText>
            </View>
          ))}
        </View>

        {/* ── Recently played strip (42.4) ── */}
        {recentStrip.length > 0 && (
          <View style={styles.section}>
            <AppText variant="h3" color="primary" style={styles.sectionTitle}>
              Recently Played
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recentStrip.map(entry => (
                <TouchableOpacity
                  key={entry.fileUri}
                  style={[
                    styles.recentChip,
                    {backgroundColor: colors.background.elevated},
                  ]}
                  onPress={() =>
                    handleRecentPress(
                      entry.fileUri,
                      entry.mediaType,
                      entry.title,
                    )
                  }
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={entry.title}>
                  <SvgIcon
                    name={entry.mediaType === 'audio' ? 'music' : 'video'}
                    size={16}
                    color={colors.accent.gold}
                  />
                  <AppText
                    variant="caption"
                    color="primary"
                    numberOfLines={1}
                    style={styles.recentLabel}>
                    {entry.title}
                  </AppText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Shortcuts (42.4) ── */}
        <View style={styles.section}>
          <AppText variant="h3" color="primary" style={styles.sectionTitle}>
            Shortcuts
          </AppText>
          <View style={[styles.groupCard, {backgroundColor: colors.background.elevated}]}>
            <SettingsRow
              label="History"
              description="Recently played with filters"
              onPress={() => navigation.navigate('History')}
              trailing={<SvgIcon name="chevronRight" size={18} color={colors.text.tertiary} />}
            />
            <SettingsRow
              label="Stats"
              description="Plays, streaks and top media"
              onPress={() => navigation.navigate('Stats')}
              trailing={<SvgIcon name="chevronRight" size={18} color={colors.text.tertiary} />}
            />
            <SettingsRow
              label="Bookmarks"
              description={`${bookmarkCount} saved positions`}
              onPress={() => navigation.navigate('Bookmarks')}
              trailing={<SvgIcon name="chevronRight" size={18} color={colors.text.tertiary} />}
            />
            <SettingsRow
              label="Playlists"
              description={`${playlistCount} playlists`}
              onPress={() => navigation.navigate('AllPlaylistsScreen')}
              trailing={<SvgIcon name="chevronRight" size={18} color={colors.text.tertiary} />}
            />
            <SettingsRow
              label="Settings"
              description="Appearance, audio, storage"
              onPress={() => navigation.navigate('Settings', {screen: 'Settings'})}
              trailing={<SvgIcon name="chevronRight" size={18} color={colors.text.tertiary} />}
            />
          </View>
        </View>

        {/* ── Preferences ── */}
        <View style={styles.section}>
          <AppText variant="h3" color="primary" style={styles.sectionTitle}>
            Preferences
          </AppText>
          <View style={[styles.groupCard, {backgroundColor: colors.background.elevated}]}>
            <SettingsRow
              label="Theme"
              description={`Currently: ${THEME_LABEL[themeMode]}`}
              onPress={handleThemeToggle}
              trailing={<AppText variant="caption" color="accent">Tap to switch</AppText>}
            />
          </View>
        </View>

        {/* ── Account (42.6 / 42.7 / 43.5) ── */}
        {isAuthenticated && (
          <View style={styles.section}>
            <AppText variant="h3" color="primary" style={styles.sectionTitle}>
              Account
            </AppText>
            <View style={[styles.groupCard, {backgroundColor: colors.background.elevated}]}>
              <SettingsRow
                label="Sign Out"
                description="Return to the sign-in screen"
                onPress={() => setSignOutVisible(true)}
                trailing={<AppText variant="caption" style={{color: colors.semantic.error}}>Logout</AppText>}
              />
              <SettingsRow
                label="Revoke Google Access"
                description="Permanently disconnect this account"
                onPress={() => setRevokeVisible(true)}
                trailing={<AppText variant="caption" style={{color: colors.semantic.error}}>Revoke</AppText>}
              />
              <SettingsRow
                label="Clear Local Data"
                description="Recents, bookmarks and cached files"
                onPress={() => setWipeVisible(true)}
                trailing={<AppText variant="caption" style={{color: colors.semantic.error}}>Wipe</AppText>}
              />
            </View>
          </View>
        )}

        <View style={{height: insets.bottom + 24}} />
      </ScrollView>

      {/* ── Confirm dialogs ── */}
      <ConfirmDialog
        visible={signOutVisible}
        title="Sign Out"
        message="You will need to sign in again to access synced features. Your local library stays on this device."
        confirmLabel="Sign Out"
        destructive={false}
        onConfirm={handleConfirmSignOut}
        onCancel={() => setSignOutVisible(false)}
      />
      <ConfirmDialog
        visible={revokeVisible}
        title="Revoke Google Access"
        message="Simba will lose access to your Google account and you'll be signed out. Your local library stays on this device."
        confirmLabel="Revoke Access"
        destructive
        onConfirm={handleConfirmRevoke}
        onCancel={() => setRevokeVisible(false)}
      />
      <ConfirmDialog
        visible={wipeVisible}
        title="Clear Local Data"
        message="This permanently removes playback history, bookmarks and cached files from this device. This cannot be undone."
        confirmLabel="Clear Data"
        destructive
        onConfirm={handleConfirmWipe}
        onCancel={() => setWipeVisible(false)}
      />
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  headerInfo: {
    flex: 1,
  },
  placeholderAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  signInLabel: {
    fontWeight: '700',
  },
  groupCard: {
    borderRadius: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  statCell: {
    flexGrow: 1,
    flexBasis: '30%',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    marginBottom: 10,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    maxWidth: 200,
  },
  recentLabel: {
    flexShrink: 1,
  },
});
