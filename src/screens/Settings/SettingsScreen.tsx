import React, {useCallback, useMemo, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Switch, View} from 'react-native';
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
import {MpvConfigEditor} from './components/MpvConfigEditor';
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
      }),
    [bottomChromeInset, isDark],
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

  const [mpvEditorVisible, setMpvEditorVisible] = useState(false);

  const handleLinkedFoldersPress = useCallback(() => {
    Alert.alert('Linked Folders', 'Choose folder type to manage', [
      {
        text: 'Video Folders',
        onPress: () => nav.navigate('LinkedFolders', {type: 'video'}),
      },
      {
        text: 'Audio Folders',
        onPress: () => nav.navigate('LinkedFolders', {type: 'audio'}),
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  }, [nav]);

  const handleThemePress = () => {
    Alert.alert('Select Theme', 'Choose your preferred appearance', [
      {
        text: 'System',
        onPress: () => dispatch(setThemeMode('system')),
      },
      {
        text: 'Dark',
        onPress: () => dispatch(setThemeMode('dark')),
      },
      {
        text: 'Light',
        onPress: () => dispatch(setThemeMode('light')),
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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

      <MpvConfigEditor
        visible={mpvEditorVisible}
        onClose={() => setMpvEditorVisible(false)}
        options={mpvOptions}
        onSave={(options: MpvOption[]) => dispatch(setMpvOptions(options))}
      />
    </SafeAreaView>
  );
};
