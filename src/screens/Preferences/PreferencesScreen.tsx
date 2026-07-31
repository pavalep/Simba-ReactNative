import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {SimbaStatusBar} from '../../components/StatusBar';
import {PreferencesScreenProps} from '../../navigation/types';
import {navigationRef} from '../../navigation/navigationHelper';
import {useAppDispatch, useAppSelector} from '../../store';
import {
  setThemeMode,
  setHardwareAcceleration,
  setRememberPlaybackPosition,
  setLargerControls,
  setHighContrastSubtitles,
  setScanOnLaunch,
  setNotificationsEnabled,
  setAppLanguage,
  resetToDefaults,
} from '../../store/slices/settingsSlice';
import {AppText} from '../../components/core/AppText/AppText';
import {SectionHeader} from '../../components/utility/SectionHeader/SectionHeader';
import {SettingsRow} from '../../components/utility/SettingsRow/SettingsRow';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {ConfirmDialog} from '../../components/core/Dialog/ConfirmDialog';
import {OptionSheetDialog} from '../../components/core/OptionSheetDialog/OptionSheetDialog';
import {ThemePickerDialog} from '../Settings/components/ThemePickerDialog';
import {useMediaScanner} from '../../hooks/useMediaScanner';
import {NotificationService} from '../../services/notificationService';
import {clearCache, formatBytes, getCacheSize} from '../../services/cacheService';
import {useToast} from '../../components/feedback/Toast/Toast';

type Props = PreferencesScreenProps;

const LANGUAGE_OPTIONS = [
  {label: 'System default', value: 'system'},
  {label: 'English', value: 'en'},
];

export const PreferencesScreen: React.FC<Props> = ({navigation: _navigation}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const toast = useToast();

  const {
    themeMode,
    isHardwareAccelerationEnabled,
    rememberPlaybackPosition,
    largerControls,
    highContrastSubtitles,
    scanOnLaunch,
    notificationsEnabled,
    appLanguage,
    lastScanTimestamp,
  } = useAppSelector(s => s.settings);

  // ── Local UI state ──
  const [themeDialogVisible, setThemeDialogVisible] = useState(false);
  const [languageDialogVisible, setLanguageDialogVisible] = useState(false);
  const [resetConfirmVisible, setResetConfirmVisible] = useState(false);
  const [clearCacheConfirmVisible, setClearCacheConfirmVisible] = useState(false);
  const [cacheSize, setCacheSize] = useState<number | null>(null);

  const {startScan, cancelScan, isScanning, scanProgress} = useMediaScanner();

  // ── Cache size (46.4) ──
  const refreshCacheSize = useCallback(async () => {
    setCacheSize(await getCacheSize());
  }, []);

  useEffect(() => {
    refreshCacheSize();
  }, [refreshCacheSize]);

  const handleClearCache = useCallback(async () => {
    setClearCacheConfirmVisible(false);
    await clearCache();
    setCacheSize(0);
    toast.show('Cache cleared', 'success');
  }, [toast]);

  const handleRescanLibrary = useCallback(() => {
    startScan(true);
  }, [startScan]);

  const handleToggleNotifications = useCallback(
    (next: boolean) => {
      dispatch(setNotificationsEnabled(next));
      if (!next) {
        // Stop the active foreground notification immediately
        NotificationService.stop();
      } else {
        // 51.4: contextual permission request (Android 13+ POST_NOTIFICATIONS)
        NotificationService.requestPermission();
      }
    },
    [dispatch],
  );

  const themeLabel =
    themeMode === 'dark'
      ? 'Dark'
      : themeMode === 'light'
        ? 'Light'
        : 'System';
  const languageLabel =
    appLanguage === 'en' ? 'English' : 'System default';
  const lastScanLabel = lastScanTimestamp
    ? new Date(lastScanTimestamp).toLocaleDateString()
    : 'Never';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.background.primary,
        },
        scrollContent: {
          padding: spacing.lg,
          paddingBottom: spacing.xxxl + insets.bottom,
        },
        card: {
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border.subtle,
          backgroundColor: colors.background.elevated,
          marginBottom: spacing.lg,
          overflow: 'hidden',
        },
        scanProgressRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
        },
        progressBar: {
          flex: 1,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border.subtle,
          marginRight: spacing.md,
          overflow: 'hidden',
        },
        progressFill: {
          height: '100%',
          borderRadius: 2,
          backgroundColor: colors.accent.gold,
        },
      }),
    [colors, insets.bottom],
  );

  return (
    <View style={styles.root}>
      <SimbaStatusBar variant="home" />

      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />

      <InternalHeader title="Preferences" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Settings (full settings page) ── */}
        <View style={styles.card}>
          <SettingsRow
            label="Full Settings"
            description="Playback, library, audio, and appearance"
            onPress={() =>
              navigationRef.navigate('Settings', {screen: 'Settings'})
            }
            trailing={
              <AppText variant="caption" color="secondary">{'>'}</AppText>
            }
          />
        </View>

        {/* ── Appearance ── */}
        <SectionHeader label="Appearance" />
        <View style={styles.card}>
          <SettingsRow
            label="Theme Mode"
            description="Choose between Dark, Light, or System default"
            onPress={() => setThemeDialogVisible(true)}
            trailing={
              <AppText variant="caption" color="secondary">
                {themeLabel}
              </AppText>
            }
          />
          <SettingsRow
            label="App Language"
            description="Language used by the interface"
            onPress={() => setLanguageDialogVisible(true)}
            trailing={
              <AppText variant="caption" color="secondary">
                {languageLabel}
              </AppText>
            }
          />
        </View>

        {/* ── Playback ── */}
        <SectionHeader label="Playback" />
        <View style={styles.card}>
          <SettingsRow
            label="Hardware Acceleration"
            description="Use GPU for video decoding and rendering"
            trailing={
              <Switch
                value={isHardwareAccelerationEnabled}
                onValueChange={v => { dispatch(setHardwareAcceleration(v)); }}
                trackColor={{
                  false: colors.border.subtle,
                  true: colors.accent.goldDim,
                }}
                thumbColor={
                  isHardwareAccelerationEnabled
                    ? colors.accent.gold
                    : colors.text.tertiary
                }
              />
            }
          />
          <SettingsRow
            label="Remember Position"
            description="Resume playback from where you left off"
            trailing={
              <Switch
                value={rememberPlaybackPosition}
                onValueChange={v => { dispatch(setRememberPlaybackPosition(v)); }}
                trackColor={{
                  false: colors.border.subtle,
                  true: colors.accent.goldDim,
                }}
                thumbColor={
                  rememberPlaybackPosition
                    ? colors.accent.gold
                    : colors.text.tertiary
                }
              />
            }
          />
        </View>

        {/* ── Audio Settings (in-app navigation) ── */}
        <View style={styles.card}>
          <SettingsRow
            label="Audio Settings"
            description="Equalizer, normalization, and audio output"
            onPress={() => (navigationRef.navigate as any)('Settings', {screen: 'AudioSettings'})}
            trailing={
              <AppText variant="caption" color="secondary">{'>'}</AppText>
            }
          />
        </View>

        {/* ── Library ── */}
        <SectionHeader label="Library" />
        <View style={styles.card}>
          <SettingsRow
            label="Rescan Library"
            description={`Last scan: ${lastScanLabel}`}
            onPress={handleRescanLibrary}
            trailing={
              <AppText variant="caption" color="accent">
                {isScanning ? 'Scanning…' : 'Scan'}
              </AppText>
            }
          />
          {isScanning && (
            <View style={styles.scanProgressRow}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {width: `${Math.min(100, Math.round(scanProgress.percentComplete))}%`},
                  ]}
                />
              </View>
              <AppText variant="caption" color="secondary">
                {Math.round(scanProgress.percentComplete)}%
              </AppText>
            </View>
          )}
          {isScanning && (
            <SettingsRow
              label="Cancel Scan"
              description="Stop the current library scan"
              onPress={cancelScan}
              trailing={
                <AppText variant="caption" color="error">Stop</AppText>
              }
            />
          )}
          <SettingsRow
            label="Scan on Launch"
            description="Refresh the library automatically on startup"
            trailing={
              <Switch
                value={scanOnLaunch}
                onValueChange={v => { dispatch(setScanOnLaunch(v)); }}
                trackColor={{
                  false: colors.border.subtle,
                  true: colors.accent.goldDim,
                }}
                thumbColor={
                  scanOnLaunch ? colors.accent.gold : colors.text.tertiary
                }
              />
            }
          />
        </View>

        {/* ── Notifications ── */}
        <SectionHeader label="Notifications" />
        <View style={styles.card}>
          <SettingsRow
            label="Media Notifications"
            description="Show playback controls in the notification shade"
            trailing={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{
                  false: colors.border.subtle,
                  true: colors.accent.goldDim,
                }}
                thumbColor={
                  notificationsEnabled ? colors.accent.gold : colors.text.tertiary
                }
              />
            }
          />
        </View>

        {/* ── Accessibility ── */}
        <SectionHeader label="Accessibility" />
        <View style={styles.card}>
          <SettingsRow
            label="Larger Controls"
            description="Increase the size of on-screen controls"
            trailing={
              <Switch
                value={largerControls}
                onValueChange={v => { dispatch(setLargerControls(v)); }}
                trackColor={{
                  false: colors.border.subtle,
                  true: colors.accent.goldDim,
                }}
                thumbColor={
                  largerControls ? colors.accent.gold : colors.text.tertiary
                }
              />
            }
          />
          <SettingsRow
            label="High-Contrast Subtitles"
            description="Force white text with a stronger background"
            trailing={
              <Switch
                value={highContrastSubtitles}
                onValueChange={v => { dispatch(setHighContrastSubtitles(v)); }}
                trackColor={{
                  false: colors.border.subtle,
                  true: colors.accent.goldDim,
                }}
                thumbColor={
                  highContrastSubtitles
                    ? colors.accent.gold
                    : colors.text.tertiary
                }
              />
            }
          />
        </View>

        {/* ── Storage ── */}
        <SectionHeader label="Storage" />
        <View style={styles.card}>
          <SettingsRow
            label="Cache Size"
            description="Thumbnails and temporary player data"
            onPress={refreshCacheSize}
            trailing={
              <AppText variant="caption" color="secondary">
                {cacheSize == null ? '…' : formatBytes(cacheSize)}
              </AppText>
            }
          />
          <SettingsRow
            label="Clear Cache"
            description="Free up space used by cached files"
            onPress={() => setClearCacheConfirmVisible(true)}
            trailing={
              <AppText variant="caption" color="error">Clear</AppText>
            }
          />
        </View>

        {/* ── Privacy ── */}
        <SectionHeader label="Privacy" />
        <View style={styles.card}>
          <SettingsRow
            label="Privacy Policy"
            description="How your data is handled"
            onPress={() =>
              navigationRef.navigate('Settings', {screen: 'Privacy'})
            }
            trailing={
              <AppText variant="caption" color="secondary">{'>'}</AppText>
            }
          />
          <SettingsRow
            label="Terms of Use"
            description="Conditions for using Simba Player"
            onPress={() =>
              navigationRef.navigate('Settings', {screen: 'Terms'})
            }
            trailing={
              <AppText variant="caption" color="secondary">{'>'}</AppText>
            }
          />
        </View>

        {/* ── Advanced ── */}
        <SectionHeader label="Advanced" />
        <View style={styles.card}>
          <SettingsRow
            label="About"
            description="Version, licenses, and app information"
            onPress={() =>
              navigationRef.navigate('Settings', {screen: 'Settings'})
            }
            trailing={
              <AppText variant="caption" color="secondary">{'>'}</AppText>
            }
          />
          <SettingsRow
            label="Reset to Defaults"
            description="Restore all settings to their original values"
            onPress={() => setResetConfirmVisible(true)}
            trailing={
              <AppText variant="caption" color="error">Reset</AppText>
            }
          />
        </View>
      </ScrollView>

      <ThemePickerDialog
        visible={themeDialogVisible}
        onClose={() => setThemeDialogVisible(false)}
        themeMode={themeMode}
        onSelectTheme={mode => dispatch(setThemeMode(mode))}
        colors={colors}
      />

      <OptionSheetDialog
        visible={languageDialogVisible}
        title="App Language"
        options={LANGUAGE_OPTIONS}
        selectedValue={appLanguage}
        onSelect={value => dispatch(setAppLanguage(String(value)))}
        onClose={() => setLanguageDialogVisible(false)}
        colors={colors}
      />

      <ConfirmDialog
        visible={resetConfirmVisible}
        title="Reset to Defaults"
        message="This will reset all preferences to their default values. This action cannot be undone."
        confirmLabel="Reset"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          setResetConfirmVisible(false);
          dispatch(resetToDefaults());
        }}
        onCancel={() => setResetConfirmVisible(false)}
      />

      <ConfirmDialog
        visible={clearCacheConfirmVisible}
        title="Clear Cache"
        message="Delete all cached thumbnails and temporary files? Playback history and library are not affected."
        confirmLabel="Clear"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleClearCache}
        onCancel={() => setClearCacheConfirmVisible(false)}
      />
    </View>
  );
};
