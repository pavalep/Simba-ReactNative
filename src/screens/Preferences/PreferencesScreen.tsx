import React, {useCallback, useState, useMemo} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
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
  resetToDefaults,
} from '../../store/slices/settingsSlice';
import {AppText} from '../../components/core/AppText/AppText';
import {SectionHeader} from '../../components/utility/SectionHeader/SectionHeader';
import {SettingsRow} from '../../components/utility/SettingsRow/SettingsRow';

type Props = PreferencesScreenProps;

export const PreferencesScreen: React.FC<Props> = ({navigation}) => {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const {
    themeMode,
    isHardwareAccelerationEnabled,
    rememberPlaybackPosition,
  } = useAppSelector(s => s.settings);

  const [largerControls, setLargerControls] = useState(false);
  const [highContrastSubtitles, setHighContrastSubtitles] = useState(false);

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
      }),
    [colors, insets.bottom],
  );

  const handleThemeChange = useCallback(() => {
    const labels: Record<string, string> = {
      dark: 'Dark',
      light: 'Light',
      system: 'System',
    };
    Alert.alert('Appearance', 'Choose your preferred theme mode', [
      {
        text: 'Dark',
        onPress: () => dispatch(setThemeMode('dark')),
      },
      {
        text: 'Light',
        onPress: () => dispatch(setThemeMode('light')),
      },
      {
        text: 'System',
        onPress: () => dispatch(setThemeMode('system')),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  }, [dispatch]);

  const handleOpenSettings = useCallback(() => {
    navigationRef.navigate('MainTabs', {
      screen: 'SettingsTab',
      params: {screen: 'Settings'},
    });
  }, []);

  const handleResetDefaults = useCallback(() => {
    Alert.alert(
      'Reset to Defaults',
      'This will reset all preferences to their default values. This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => dispatch(resetToDefaults()),
        },
      ],
    );
  }, [dispatch]);

  const themeLabel =
    themeMode === 'dark'
      ? 'Dark'
      : themeMode === 'light'
        ? 'Light'
        : 'System';

  return (
    <View style={styles.root}>
      <SimbaStatusBar variant="home" />

      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Settings (full settings page) ── */}
        <View style={styles.card}>
          <SettingsRow
            label="Full Settings"
            description="Playback, library, audio, and appearance"
            onPress={handleOpenSettings}
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
            onPress={handleThemeChange}
            trailing={
              <AppText variant="caption" color="secondary">
                {themeLabel}
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
            onPress={() => (navigation as any).navigate('AudioSettings')}
            trailing={
              <AppText variant="caption" color="secondary">{'>'}</AppText>
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
                onValueChange={setLargerControls}
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
            description="Improve subtitle readability with higher contrast"
            trailing={
              <Switch
                value={highContrastSubtitles}
                onValueChange={setHighContrastSubtitles}
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

        {/* ── Advanced ── */}
        <SectionHeader label="Advanced" />
        <View style={styles.card}>
          <SettingsRow
            label="About"
            description="Version, licenses, and app information"
            onPress={() => navigationRef.navigate('MainTabs', {
              screen: 'SettingsTab',
              params: {screen: 'About'},
            })}
            trailing={
              <AppText variant="caption" color="secondary">{'>'}</AppText>
            }
          />
          <SettingsRow
            label="Reset to Defaults"
            description="Restore all settings to their original values"
            onPress={handleResetDefaults}
            trailing={
              <AppText variant="caption" color="error">Reset</AppText>
            }
          />
        </View>
      </ScrollView>
    </View>
  );
};
