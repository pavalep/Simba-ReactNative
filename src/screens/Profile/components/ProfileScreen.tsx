// ────────────────────────────────────────────────────────────────
// Simba Player — Profile Screen (RC1)
//
// The account page, rebuilt on the V2 grammar. The design this
// implements is the `Profile / light` and `Profile / dark` boards in
// Penpot (page `SIMBA`), drawn by `designs/penpot/profile.js`.
//
// WHY IT LOOKS LIKE THIS
// ──────────────────────
//
// The screen this replaces (the "Phase 42" version) had five blocks:
//
//   1. a 7-cell stats grid — `flexBasis: '30%'`, so it laid out three
//      to a row and the SEVENTH tile was an orphan; and because
//      `formatDuration(0)` returns `''`, that orphan had no value at
//      all;
//   2. a "Recently Played" chip strip — Home already has that rail;
//   3. an 8-row "Shortcuts" block — Home's rails again, and three of
//      its rows (Bookmarks, Playlists, Followed) were printed a SECOND
//      time further down the same screen;
//   4. a "Preferences" block with one row — a Theme toggle that
//      Settings already owns;
//   5. a "Sign out" in the HEADER, drawn as a text label inside the
//      header's fixed 36×36 right-action circle, so it wrapped onto
//      two lines and was clipped.
//
// It also read its numbers from TWO different stores: the grid's
// "Tracks" and "Videos" came from `useMediaStore`, while the Stats
// page read the same two numbers from `useSessionStore.mediaLibrary`.
// The same words, two numbers, on two screens.
//
// What is here now:
//
//   • an UNBOXED identity — avatar, name, email, no card around it
//     (the same rule the V2 Home greeting follows);
//   • ONE count line under "Your Library" — the VLC pattern. The
//     tracks and videos are read from `useSessionStore.mediaLibrary`,
//     which is the SAME store the Stats page reads, so the two pages
//     cannot disagree;
//   • ONE list of your things, each count riding on its own row;
//   • ONE Activity row;
//   • ONE Account section, where only "Sign out" is red.
//
// The section titles are the Cormorant italic gold divider
// (`SubsectionTitle`'s `displaySerif` variant) — the same grammar the
// Home page's "Your Library" / "Discover" dividers use. The rows are
// the app's own `SettingsRow`, unboxed: the old screen wrapped them
// in an elevated group card, the V2 grammar does not.
//
// Every row's destination was verified against the live Penpot file:
// the board's connectors resolve to Settings, AllPlaylistsScreen,
// Bookmarks, History, Downloads, FollowedPodcasts, Library, Stats and
// Login respectively. `Followed Podcasts` points at the FOLLOWED list
// (`FollowedPodcasts`), not at the podcast catalogue — the old screen
// had the same bug Home already fixed.
//
// See `md/PROFILE_RC1_REFACTOR.md` for the analysis behind all of it.
// ────────────────────────────────────────────────────────────────

import React, {useCallback, useMemo, useState} from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useBottomChromeInset} from '../../../infrastructure/player/miniPlayerChrome';
import {useTheme} from '../../../theme';
import {spacing} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {Avatar} from '../../../components/core/Avatar/Avatar';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {SettingsRow} from '../../../components/utility/SettingsRow/SettingsRow';
import {SubsectionTitle} from '../../../components/utility/SubsectionTitle/SubsectionTitle';
import {InternalHeader} from '../../../components/layout/InternalHeader/InternalHeader';
import {ConfirmDialog} from '../../../components/core/Dialog/ConfirmDialog';
import {useToast} from '../../../components/feedback/Toast/Toast';
import {useAuth} from '../../../hooks/useAuth';
import {usePlaylists} from '../../../features/playlists';
import {useBookmarks} from '../../../features/bookmarks';
import {useFollowedPodcasts} from '../../../features/followedPodcasts';
import {useRecentHistory} from '../../../features/recentHistory';
import {
  useSessionStore,
  useMediaStore,
  useDownloadsStore,
} from '../../../state';
import {clearCache} from '../../../services/cacheService';
import type {ProfileScreenProps} from '../types';

type Props = ProfileScreenProps;

/**
 * The trailing cluster of a row: the count in gold, then the chevron.
 *
 * The count is `caption` (Inter 13/18) in the brand gold — the place
 * the V2 grammar spends its gold when there is no artwork to spend it
 * on. The board draws it at Inter Medium 500; the family key below
 * selects the Medium face directly, which is how a weight is carried
 * in this app (never a `fontWeight` prop — see
 * `src/constants/fontFamily.ts`).
 */
const RowTrailing: React.FC<{count?: number}> = ({count}) => {
  const {colors} = useTheme();
  return (
    <View style={styles.trailing}>
      {count != null && (
        <AppText variant="caption" color="accent">
          {count}
        </AppText>
      )}
      <SvgIcon name="chevronRight" size={14} color={colors.text.tertiary} />
    </View>
  );
};

export const ProfileScreen: React.FC<Props> = ({navigation}) => {
  const {colors} = useTheme();
  const bottomChromeInset = useBottomChromeInset();
  const toast = useToast();

  const {user, signIn, signOut, revokeAccess} = useAuth();

  // ── The counts ───────────────────────────────────────────────────
  //
  // ONE owner per number.
  //
  // The tracks and videos come from `useSessionStore.mediaLibrary` —
  // the same store `StatsScreen.tsx:43,68-74` reads — so the Profile
  // and the Stats page cannot print different numbers for the same
  // words. (The old screen read them from `useMediaStore`, which is
  // the SCAN result: a different set of files entirely.)
  const mediaLibrary = useSessionStore(state => state.mediaLibrary);
  const {playlists} = usePlaylists();
  const {bookmarkCount, clearAll: clearAllBookmarks} = useBookmarks();
  const {count: followedPodcastCount} = useFollowedPodcasts();
  const downloadCount = useDownloadsStore(state => state.records.length);
  const localFileCount = useMediaStore(state => state.tracks.length);
  const {clearRecent} = useRecentHistory();

  const trackCount = useMemo(
    () => mediaLibrary.filter(e => e.mediaType === 'audio').length,
    [mediaLibrary],
  );
  const videoCount = useMemo(
    () => mediaLibrary.filter(e => e.mediaType === 'video').length,
    [mediaLibrary],
  );

  // ── Dialogs ─────────────────────────────────────────────────────
  const [signOutVisible, setSignOutVisible] = useState(false);
  const [revokeVisible, setRevokeVisible] = useState(false);
  const [wipeVisible, setWipeVisible] = useState(false);

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
    clearRecent();
    clearAllBookmarks();
    try {
      await clearCache();
    } catch {
      // cache clear is best-effort
    }
    toast.show('Local data cleared');
  }, [clearRecent, clearAllBookmarks, toast]);

  const isSignedIn = Boolean(user);
  const displayName = user?.name || 'Not signed in';
  const displayEmail = user?.email || 'Sign in to sync your library';

  return (
    <SafeAreaView
      style={[styles.root, {backgroundColor: colors.background.primary}]}
      edges={['top']}>
      {/* The header's right action is a GEAR, not a label.
          The right slot is a fixed 36×36 circle (`InternalHeader.tsx:151-157`),
          so the old "Sign out" TEXT wrapped onto two lines and was
          clipped. A gear is the one door to Settings that YouTube,
          Spotify, Apple Music, Plex and Tencent Video all put on the
          account screen. Sign-out lives in the Account section below,
          where there is room for it. */}
      <InternalHeader
        title="Profile"
        rightAction={{
          icon: 'settings',
          onPress: () => navigation.navigate('Settings'),
        }}
      />

      {/* No horizontal padding here: the rows are FULL BLEED — the
          hairline runs the whole width — and `SettingsRow` carries its
          own 16 dp gutter. The board draws them that way too. */}
      <ScrollView contentContainerStyle={styles.scroll} bounces>
        {/* ── the identity (unboxed) ─────────────────────────────────── */}
        <View style={styles.identity}>
          <Avatar uri={user?.photo} name={user?.name} size={72} />
          <View style={styles.identityText}>
            <AppText variant="h2" color="primary" numberOfLines={1}>
              {displayName}
            </AppText>
            <AppText
              variant="caption"
              color="secondary"
              numberOfLines={1}
              style={styles.identityEmail}>
              {displayEmail}
            </AppText>
          </View>
        </View>

        {/* ── Your Library ───────────────────────────────────────────── */}
        <View style={styles.dividerFirst}>
          <SubsectionTitle label="Your Library" variant="displaySerif" />
        </View>

        {/* THE COUNT LINE — one line, one store, no tiles. */}
        <AppText variant="caption" color="secondary" style={styles.countLine}>
          {`${trackCount} tracks · ${videoCount} videos · ${playlists.length} playlists`}
        </AppText>

        <SettingsRow
          label="Playlists"
          accessibilityLabel={`Playlists, ${playlists.length}`}
          onPress={() => navigation.navigate('AllPlaylistsScreen')}
          trailing={<RowTrailing count={playlists.length} />}
        />
        <SettingsRow
          label="Bookmarks"
          accessibilityLabel={`Bookmarks, ${bookmarkCount}`}
          onPress={() => navigation.navigate('Bookmarks')}
          trailing={<RowTrailing count={bookmarkCount} />}
        />
        <SettingsRow
          label="History"
          onPress={() => navigation.navigate('History')}
          trailing={<RowTrailing />}
        />
        <SettingsRow
          label="Downloads"
          accessibilityLabel={`Downloads, ${downloadCount}`}
          onPress={() => navigation.navigate('Downloads')}
          trailing={<RowTrailing count={downloadCount} />}
        />
        <SettingsRow
          label="Followed podcasts"
          accessibilityLabel={`Followed podcasts, ${followedPodcastCount}`}
          onPress={() => navigation.navigate('FollowedPodcasts')}
          trailing={<RowTrailing count={followedPodcastCount} />}
        />
        <SettingsRow
          label="Local files"
          accessibilityLabel={`Local files, ${localFileCount}`}
          onPress={() => navigation.navigate('Library')}
          trailing={<RowTrailing count={localFileCount} />}
        />

        {/* ── Activity ───────────────────────────────────────────────── */}
        <View style={styles.divider}>
          <SubsectionTitle label="Activity" variant="displaySerif" />
        </View>
        <SettingsRow
          label="Playback statistics"
          onPress={() => navigation.navigate('Stats')}
          trailing={<RowTrailing />}
        />

        {/* ── Account ────────────────────────────────────────────────── */}
        <View style={styles.divider}>
          <SubsectionTitle label="Account" variant="displaySerif" />
        </View>
        {isSignedIn ? (
          <>
            {/* Only ONE red row. Revoke and Clear live behind a
                confirmation dialog, so the row itself does not have to
                shout — and three red rows in a row read as an error
                screen. */}
            <SettingsRow
              label="Sign out"
              accessibilityLabel="Sign out"
              onPress={() => setSignOutVisible(true)}
              trailing={
                <View style={styles.trailing}>
                  <SvgIcon name="chevronRight" size={14} color={colors.text.tertiary} />
                </View>
              }
              labelColor="error"
            />
            <SettingsRow
              label="Revoke Google access"
              accessibilityLabel="Revoke Google access"
              onPress={() => setRevokeVisible(true)}
              trailing={
                <View style={styles.trailing}>
                  <SvgIcon name="chevronRight" size={14} color={colors.text.tertiary} />
                </View>
              }
            />
            <SettingsRow
              label="Clear local data"
              accessibilityLabel="Clear local data"
              onPress={() => setWipeVisible(true)}
              trailing={
                <View style={styles.trailing}>
                  <SvgIcon name="chevronRight" size={14} color={colors.text.tertiary} />
                </View>
              }
            />
          </>
        ) : (
          /* Signed out: the account page's one job is to offer the
             sign-in. YouTube, Spotify, Apple Music, Plex, VLC, Tencent
             Video and Huawei Video all show a sign-in action on the
             account screen, so this is the existing affordance, not a
             new one. */
          <SettingsRow
            label="Sign in"
            accessibilityLabel="Sign in"
            onPress={() => void signIn()}
            trailing={
              <View style={styles.trailing}>
                <SvgIcon name="chevronRight" size={14} color={colors.text.tertiary} />
              </View>
            }
          />
        )}

        <View style={{height: bottomChromeInset + spacing.xl}} />
      </ScrollView>

      {/* ── Confirm dialogs ──────────────────────────────────────────── */}
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
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingTop: spacing.xl,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  identityText: {
    flex: 1,
  },
  identityEmail: {
    marginTop: spacing.xs,
  },
  // The gaps the board puts above its dividers: 12 dp before the first
  // one (right after the identity) and 16 dp before the ones that
  // follow a list. `SubsectionTitle` carries its own 8 dp marginTop,
  // so these supply the rest.
  dividerFirst: {
    marginTop: spacing.xs,
  },
  divider: {
    marginTop: spacing.sm,
  },
  countLine: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
