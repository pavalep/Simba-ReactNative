import React, {useCallback, useMemo, useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../../theme';
import {useAppDispatch, useAppSelector} from '../../store';
import {
  setHardwareAcceleration,
  setAudioNormalization,
  setDialogueBoost,
  setThemeMode,
  setMpvOptions,
} from '../../store/slices/settingsSlice';
import {spacing} from '../../theme/tokens';
import {AppText} from '../../components/core/AppText/AppText';
import {SectionHeader} from '../../components/utility/SectionHeader/SectionHeader';
import {SettingsRow} from '../../components/utility/SettingsRow/SettingsRow';
import {MpvConfigEditor, LinkedFoldersDialog, ThemePickerDialog} from './components';
import type {MpvOption} from './components/MpvConfigEditor';
import {SettingsScreenProps} from '../../navigation/types';

type Props = SettingsScreenProps;

const THEME_LABELS: Record<string, string> = {
  system: 'System',
  dark: 'Dark',
  light: 'Light',
};

export const SettingsScreen: React.FC<Props> = ({navigation: _nav}) => {
  const {theme, colors} = useTheme();
  const nav = useNavigation<any>();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const bottomChromeInset = insets.bottom + 104;
  const dispatch = useAppDispatch();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
        },
        glow: {
          position: 'absolute',
          top: -60,
          left: '10%',
          width: '80%',
          height: 120,
          borderRadius: 60,
          opacity: isDark ? 0.3 : 0.15,
        },
        header: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
        },
        scroll: {
          flex: 1,
        },
        scrollContent: {
          paddingBottom: bottomChromeInset,
        },
        centerContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.lg,
        },
        retryButton: {
          marginTop: spacing.md,
          paddingVertical: 10,
          paddingHorizontal: 24,
          borderRadius: 10,
          backgroundColor: colors.accent.goldDim,
        },
      }),
    [bottomChromeInset, isDark, colors],
  );

  const hardwareAcceleration = useAppSelector(
    state => state.settings.isHardwareAccelerationEnabled,
  );
  const audioNormalization = useAppSelector(
    state => state.settings.isAudioNormalizationEnabled,
  );
  const dialogueBoost = useAppSelector(
    state => state.settings.isDialogueBoostEnabled,
  );
  const themeMode = useAppSelector(state => state.settings.themeMode);
  const mpvOptions = useAppSelector(state => state.settings.mpvOptions) ?? [];

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [mpvEditorVisible, setMpvEditorVisible] = useState(false);
  const [linkedFoldersDialogVisible, setLinkedFoldersDialogVisible] = useState(false);
  const [themeDialogVisible, setThemeDialogVisible] = useState(false);

  const handleLinkedFoldersPress = useCallback(() => {
    setLinkedFoldersDialogVisible(true);
  }, []);

  const handleThemePress = useCallback(() => {
    setThemeDialogVisible(true);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      // Simulate refresh — add real data-fetching logic here later
      await new Promise<void>(resolve => setTimeout(resolve, 1000));
    } catch {
      setError('Failed to refresh settings.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <LinearGradient
        colors={
          [colors.background.primary, colors.background.primary]
        }
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient warm glow */}
      <View
        style={[
          styles.glow,
          {backgroundColor: colors.accent.goldGlow},
        ]}
      />

      {/* Header */}
      <View style={styles.header}>
        <AppText variant="h1" color="primary">
          Settings
        </AppText>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent.gold} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <AppText
            variant="body1"
            color="error"
            style={{textAlign: 'center', marginBottom: spacing.sm}}>
            {error}
          </AppText>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => setError(null)}
            activeOpacity={0.7}>
            <AppText variant="button" color="accent">
              Retry
            </AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent.gold}
              colors={[colors.accent.gold]}
            />
          }>
          {/* ── Appearance Section ── */}
          <SectionHeader label="Appearance" />
          <SettingsRow
            label="Theme"
            description={THEME_LABELS[themeMode] ?? 'System'}
            onPress={handleThemePress}
          />
          <SettingsRow label="Accent Color" description="Gold" />

          {/* ── Playback Section ── */}
          <SectionHeader label="Playback" />
          <SettingsRow
            label="Hardware Acceleration"
            trailing={
              <Switch
                value={hardwareAcceleration}
                onValueChange={val => { dispatch(setHardwareAcceleration(val)); }}
                trackColor={{
                  false: colors.border.subtle,
                  true: colors.accent.goldDim,
                }}
                thumbColor={
                  hardwareAcceleration
                    ? colors.accent.gold
                    : colors.text.tertiary
                }
                accessibilityLabel="Hardware Acceleration"
              />
            }
          />
          <SettingsRow
            label="Audio Normalization"
            trailing={
              <Switch
                value={audioNormalization}
                onValueChange={val => { dispatch(setAudioNormalization(val)); }}
                trackColor={{
                  false: colors.border.subtle,
                  true: colors.accent.goldDim,
                }}
                thumbColor={
                  audioNormalization
                    ? colors.accent.gold
                    : colors.text.tertiary
                }
                accessibilityLabel="Audio Normalization"
              />
            }
          />
          <SettingsRow
            label="Dialogue Boost"
            trailing={
              <Switch
                value={dialogueBoost}
                onValueChange={val => { dispatch(setDialogueBoost(val)); }}
                trackColor={{
                  false: colors.border.subtle,
                  true: colors.accent.goldDim,
                }}
                thumbColor={
                  dialogueBoost
                    ? colors.accent.gold
                    : colors.text.tertiary
                }
                accessibilityLabel="Dialogue Boost"
              />
            }
          />

          {/* ── Advanced Section ── */}
          <SectionHeader label="Advanced" />
          <SettingsRow
            label="MPV Options"
            description={mpvOptions.length > 0 ? `${mpvOptions.length} option${mpvOptions.length !== 1 ? 's' : ''} set` : 'Default'}
            onPress={() => setMpvEditorVisible(true)}
          />
          <SettingsRow
            label="Linked Folders"
            description="Manage video & audio folders"
            onPress={handleLinkedFoldersPress}
          />

          {/* ── Audio Section ── */}
          <SectionHeader label="Audio" />
          <SettingsRow
            label="Equalizer"
            onPress={() => nav.navigate('AudioSettings')}
          />

          {/* ── About Section ── */}
          <SectionHeader label="About" />
          <SettingsRow
            label="About"
            onPress={() => nav.navigate('About')}
          />
        </ScrollView>
      )}

      <MpvConfigEditor
        visible={mpvEditorVisible}
        onClose={() => setMpvEditorVisible(false)}
        options={mpvOptions}
        onSave={(options: MpvOption[]) => dispatch(setMpvOptions(options))}
      />

      <LinkedFoldersDialog
        visible={linkedFoldersDialogVisible}
        onClose={() => setLinkedFoldersDialogVisible(false)}
        onNavigate={type => nav.navigate('LinkedFolders', {type})}
        colors={colors}
      />

      <ThemePickerDialog
        visible={themeDialogVisible}
        onClose={() => setThemeDialogVisible(false)}
        themeMode={themeMode}
        onSelectTheme={mode => dispatch(setThemeMode(mode))}
        colors={colors}
      />
    </SafeAreaView>
  );
};
