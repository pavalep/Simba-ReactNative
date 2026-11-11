// ────────────────────────────────────────────────────────────────
// Simba Player — Profile Screen (RC1, merged with Settings)
//
// The account page AND the preferences page, as ONE screen.
//
// The design this implements is the `Profile / light` and `Profile / dark`
// boards in Penpot (page `SIMBA`), drawn by `designs/penpot/profile.js`.
//
// WHY IT IS ONE PAGE
// ──────────────────
//
// The Profile used to be "you" and the Settings page was "how the app
// behaves", and the owner found the Profile "too less":
//
//   "now profile seems too less, merge settings to profile else it will
//    feel too less"
//
// Two pages for one person, split by a row of content that belongs
// together. The merged page carries 21 rows in 9 groups:
//
//   identity → Activity → Appearance → Playback → Subtitles →
//   Library → Account → Support → Reset
//
// WHAT IS STILL NOT ON IT
// ───────────────────────
//
// • **No library index.** "Your Library" and its six rows are gone:
//   Home already carries the Recently Played, Pinned Playlists, Bookmarks
//   and Followed Podcasts rails, each with a "See All", and the Library
//   page owns Downloads and the local media. A second index of the same
//   library under the same heading is the app saying the same thing
//   twice (`md/CONTENT_OWNERSHIP.md`).
//
// • **No gear in the header.** It would open the page you are already on.
//
// • **No "Accent Color" row.** The old Settings row had no `onPress` and
//   `useSettingsStore` has no accent field: gold is the app's only accent
//   and it is not a preference. A row that cannot be changed is not a row.
//
// • **No Discover section.** All seven of its rows already sit on Home's
//   Explore Contents rail.
//
// The section titles are the Cormorant italic gold divider
// (`SubsectionTitle`'s `displaySerif` variant) — the same grammar the
// Home page's "Your Library" / "Discover" dividers use. The rows are the
// app's own `SettingsRow`, unboxed.
//
// See `md/PROFILE_SETTINGS_MERGE.md` for the decision and the full
// row-by-row inventory, and `md/CONTENT_OWNERSHIP.md` for the ownership
// model this page sits in.
// ────────────────────────────────────────────────────────────────

import React, {useCallback, useState} from 'react';
import {View, StyleSheet, ScrollView, Switch} from 'react-native';
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
import {useBookmarks} from '../../../features/bookmarks';
import {useRecentHistory} from '../../../features/recentHistory';
import {useSettingsStore} from '../../../state';
import {clearCache} from '../../../services/cacheService';
import {
  MpvConfigEditor,
  LinkedFoldersDialog,
  ThemePickerDialog,
  SubtitleLanguageDialog,
  SubtitleStyleDialog,
} from '../components';
import type {MpvOption} from '../components/MpvConfigEditor';
import {useProfileScreen} from '../hooks/useProfileScreen';
import type {ProfileScreenProps} from '../types';

type Props = ProfileScreenProps;

/**
 * The right chevron of a row that opens something.
 *
 * `SettingsRow` draws no chevron of its own — the trailing cluster is the
 * caller's — so every row that goes somewhere carries one. It is the app's
 * own 14 px chevron, flush with the 16 dp gutter.
 */
const Chevron: React.FC = () => {
  const {colors} = useTheme();
  return <SvgIcon name="chevronRight" size={14} color={colors.text.tertiary} />;
};

/**
 * The switch of a row that toggles something.
 *
 * The track is `border.subtle` off and `accent.goldDim` on, the thumb is
 * `accent.gold` on and `text.tertiary` off — the app's own switch colours.
 */
const Toggle: React.FC<{
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
}> = ({value, onValueChange, label}) => {
  const {colors} = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{false: colors.border.subtle, true: colors.accent.goldDim}}
      thumbColor={value ? colors.accent.gold : colors.text.tertiary}
      accessibilityLabel={label}
    />
  );
};

export const ProfileScreen: React.FC<Props> = ({navigation}) => {
  const {colors} = useTheme();
  const bottomChromeInset = useBottomChromeInset();
  const toast = useToast();

  const {user, signIn, signOut, revokeAccess} = useAuth();
  const {clearRecent} = useRecentHistory();
  const {clearAll: clearAllBookmarks} = useBookmarks();

  const {
    themeMode,
    themeLabel,
    hardwareAcceleration,
    audioNormalization,
    dialogueBoost,
    skipSilenceEnabled,
    preferredLanguages,
    preferredLanguagesLabel,
    subtitleFontSize,
    subtitleTextColor,
    subtitleBackgroundOpacity,
    subtitleFontLabel,
    subtitleBgLabel,
    autoLoadSubtitles,
    mpvOptions,
    linkedFoldersLabel,
    mpvOptionsLabel,
    themeDialogVisible,
    setThemeDialogVisible,
    mpvEditorVisible,
    setMpvEditorVisible,
    linkedFoldersDialogVisible,
    setLinkedFoldersDialogVisible,
    subtitleLanguageDialogVisible,
    setSubtitleLanguageDialogVisible,
    subtitleStyleDialogVisible,
    setSubtitleStyleDialogVisible,
    handleThemePress,
    handleMpvPress,
    handleLinkedFoldersPress,
    handleSubtitleLanguagePress,
    handleSubtitleStylePress,
  } = useProfileScreen();

  // ── Dialogs ─────────────────────────────────────────────────────
  const [signOutVisible, setSignOutVisible] = useState(false);
  const [revokeVisible, setRevokeVisible] = useState(false);
  const [wipeVisible, setWipeVisible] = useState(false);
  const [resetVisible, setResetVisible] = useState(false);

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

  const handleConfirmReset = useCallback(() => {
    setResetVisible(false);
    useSettingsStore.getState().resetPreferences();
    toast.show('Preferences reset');
  }, [toast]);

  const isSignedIn = Boolean(user);
  const displayName = user?.name || 'Not signed in';
  const displayEmail = user?.email || 'Sign in to sync your library';

  return (
    <SafeAreaView
      style={[styles.root, {backgroundColor: colors.background.primary}]}
      edges={['top']}>
      {/* The header's right slot is EMPTY. It used to hold a gear — the
          one door to the Settings page — which is this page now. A gear
          that opens the page you are already on is a lie. */}
      <InternalHeader title="Profile" />

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

        {/* ── Activity ───────────────────────────────────────────────── */}
        <View style={styles.dividerFirst}>
          <SubsectionTitle label="Activity" variant="displaySerif" />
        </View>
        <SettingsRow
          label="Playback statistics"
          accessibilityLabel="Playback statistics"
          onPress={() => navigation.navigate('Stats')}
          trailing={<Chevron />}
        />

        {/* ── Appearance ─────────────────────────────────────────────── */}
        <View style={styles.divider}>
          <SubsectionTitle label="Appearance" variant="displaySerif" />
        </View>
        <SettingsRow
          label="Theme"
          description={themeLabel}
          onPress={handleThemePress}
          trailing={<Chevron />}
        />

        {/* ── Playback ───────────────────────────────────────────────── */}
        <View style={styles.divider}>
          <SubsectionTitle label="Playback" variant="displaySerif" />
        </View>
        <SettingsRow
          label="Hardware acceleration"
          trailing={
            <Toggle
              label="Hardware acceleration"
              value={hardwareAcceleration}
              onValueChange={val =>
                useSettingsStore.getState().setHardwareAcceleration(val)
              }
            />
          }
        />
        <SettingsRow
          label="Audio normalization"
          trailing={
            <Toggle
              label="Audio normalization"
              value={audioNormalization}
              onValueChange={val =>
                useSettingsStore.getState().setAudioNormalization(val)
              }
            />
          }
        />
        <SettingsRow
          label="Dialogue boost"
          trailing={
            <Toggle
              label="Dialogue boost"
              value={dialogueBoost}
              onValueChange={val =>
                useSettingsStore.getState().setDialogueBoost(val)
              }
            />
          }
        />
        <SettingsRow
          label="Skip silence"
          description="Automatically skip silent sections"
          trailing={
            <Toggle
              label="Skip silence"
              value={skipSilenceEnabled}
              onValueChange={val =>
                useSettingsStore.getState().setSkipSilence(val)
              }
            />
          }
        />
        <SettingsRow
          label="Subtitle language"
          description={preferredLanguagesLabel}
          onPress={handleSubtitleLanguagePress}
          trailing={<Chevron />}
        />
        <SettingsRow
          label="Audio settings"
          description="Equalizer and audio tuning"
          onPress={() => navigation.navigate('AudioSettings')}
          trailing={<Chevron />}
        />

        {/* ── Subtitles ──────────────────────────────────────────────── */}
        <View style={styles.divider}>
          <SubsectionTitle label="Subtitles" variant="displaySerif" />
        </View>
        <SettingsRow
          label="Font size"
          description={subtitleFontLabel}
          onPress={handleSubtitleStylePress}
          trailing={<Chevron />}
        />
        <SettingsRow
          label="Text color"
          // The description is a NODE (the swatch and the hex), so the
          // default label — `${label}, ${description}` — would read
          // "Text color, [object Object]" to a screen reader. The row
          // says the value instead.
          accessibilityLabel={`Text color, ${subtitleTextColor}`}
          description={
            <View style={styles.swatchRow}>
              <View
                style={[
                  styles.swatch,
                  {
                    backgroundColor: subtitleTextColor,
                    borderColor: colors.border.subtle,
                  },
                ]}
              />
              <AppText variant="caption" color="secondary">
                {subtitleTextColor}
              </AppText>
            </View>
          }
          onPress={handleSubtitleStylePress}
          trailing={<Chevron />}
        />
        <SettingsRow
          label="Background opacity"
          description={subtitleBgLabel}
          onPress={handleSubtitleStylePress}
          trailing={<Chevron />}
        />
        <SettingsRow
          label="Auto-load subtitles"
          trailing={
            <Toggle
              label="Auto-load subtitles"
              value={autoLoadSubtitles}
              onValueChange={val =>
                useSettingsStore.getState().setAutoLoadSubtitles(val)
              }
            />
          }
        />

        {/* ── Library ────────────────────────────────────────────────── */}
        {/* Not a library INDEX — these two rows are where the library
            comes FROM (the linked folders) and how the player is
            configured (the MPV options). The media itself is on Home and
            on the Library page. */}
        <View style={styles.divider}>
          <SubsectionTitle label="Library" variant="displaySerif" />
        </View>
        <SettingsRow
          label="Linked folders"
          description={linkedFoldersLabel}
          onPress={handleLinkedFoldersPress}
          trailing={<Chevron />}
        />
        <SettingsRow
          label="MPV options"
          description={mpvOptionsLabel}
          onPress={handleMpvPress}
          trailing={<Chevron />}
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
              trailing={<Chevron />}
              labelColor="error"
            />
            <SettingsRow
              label="Revoke Google access"
              accessibilityLabel="Revoke Google access"
              onPress={() => setRevokeVisible(true)}
              trailing={<Chevron />}
            />
            <SettingsRow
              label="Clear local data"
              accessibilityLabel="Clear local data"
              onPress={() => setWipeVisible(true)}
              trailing={<Chevron />}
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
            trailing={<Chevron />}
          />
        )}

        {/* ── Support ────────────────────────────────────────────────── */}
        <View style={styles.divider}>
          <SubsectionTitle label="Support" variant="displaySerif" />
        </View>
        <SettingsRow
          label="Help"
          accessibilityLabel="Help"
          onPress={() => navigation.navigate('Help')}
          trailing={<Chevron />}
        />
        <SettingsRow
          label="About Simba"
          accessibilityLabel="About Simba"
          onPress={() => navigation.navigate('About')}
          trailing={<Chevron />}
        />

        {/* ── Reset ──────────────────────────────────────────────────── */}
        {/* Its own group, because it is the one row that is not a
            preference but an ACTION on them. */}
        <View style={styles.divider}>
          <SubsectionTitle label="Reset" variant="displaySerif" />
        </View>
        <SettingsRow
          label="Reset preferences"
          accessibilityLabel="Reset preferences"
          onPress={() => setResetVisible(true)}
          trailing={<Chevron />}
        />

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
      {/* The reset keeps the linked folders: a folder link is where the
          user's files come from, not a preference, and the old dialog
          promised exactly that while the code did the opposite. */}
      <ConfirmDialog
        visible={resetVisible}
        title="Reset preferences"
        message="Every preference goes back to its default — theme, playback, subtitles and MPV options. Your linked folders, media, downloads and playlists are not touched."
        confirmLabel="Reset"
        destructive
        onConfirm={handleConfirmReset}
        onCancel={() => setResetVisible(false)}
      />

      {/* ── The five dialogs the preference rows open ───────────────── */}
      <ThemePickerDialog
        visible={themeDialogVisible}
        onClose={() => setThemeDialogVisible(false)}
        themeMode={themeMode}
        onSelectTheme={mode => useSettingsStore.getState().setThemeMode(mode)}
        colors={colors}
      />
      <SubtitleLanguageDialog
        visible={subtitleLanguageDialogVisible}
        onClose={() => setSubtitleLanguageDialogVisible(false)}
        preferredLanguages={preferredLanguages}
        onSelect={codes => useSettingsStore.getState().setPreferredLanguages(codes)}
        colors={colors}
      />
      <SubtitleStyleDialog
        visible={subtitleStyleDialogVisible}
        onClose={() => setSubtitleStyleDialogVisible(false)}
        fontSize={subtitleFontSize}
        textColor={subtitleTextColor}
        bgOpacity={subtitleBackgroundOpacity}
        onFontSize={px => useSettingsStore.getState().setSubtitleFontSize(px)}
        onTextColor={c => useSettingsStore.getState().setSubtitleTextColor(c)}
        onBgOpacity={o =>
          useSettingsStore.getState().setSubtitleBackgroundOpacity(o)
        }
        colors={colors}
      />
      <MpvConfigEditor
        visible={mpvEditorVisible}
        onClose={() => setMpvEditorVisible(false)}
        options={mpvOptions}
        onSave={(options: MpvOption[]) =>
          useSettingsStore.getState().setMpvOptions(options)
        }
      />
      <LinkedFoldersDialog
        visible={linkedFoldersDialogVisible}
        onClose={() => setLinkedFoldersDialogVisible(false)}
        onNavigate={type => navigation.navigate('LinkedFolders', {type})}
        colors={colors}
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
  // The gaps the board puts above its dividers: 4 dp before the first
  // one (right after the identity) and 8 dp before the ones that follow a
  // list. `SubsectionTitle` carries its own 8 dp marginTop, so these
  // supply the rest.
  dividerFirst: {
    marginTop: spacing.xs,
  },
  divider: {
    marginTop: spacing.sm,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
  },
});
