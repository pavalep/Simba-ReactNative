import React from 'react';
import {
  ScrollView,
  Switch,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {spacing} from '../../theme/tokens';
import {AppText} from '../../components/core/AppText/AppText';
import {SectionHeader} from '../../components/utility/SectionHeader/SectionHeader';
import {SettingsRow} from '../../components/utility/SettingsRow/SettingsRow';
import {MpvConfigEditor, LinkedFoldersDialog, ThemePickerDialog} from './components';
import type {MpvOption} from './components/MpvConfigEditor';
import {SettingsScreenProps} from '../../navigation/types';
import {AccountSection} from '../../components/sections/AccountSection/AccountSection';
import {
  setHardwareAcceleration,
  setAudioNormalization,
  setDialogueBoost,
  setThemeMode,
  setMpvOptions,
} from '../../store/slices/settingsSlice';
import {useSettingsScreen} from './hooks/useSettingsScreen';

type Props = SettingsScreenProps;

export const SettingsScreen: React.FC<Props> = ({navigation: _nav}) => {
  const nav = useNavigation<any>();
  const {
    colors,
    styles,
    isLoading,
    error,
    refreshing,
    hardwareAcceleration,
    audioNormalization,
    dialogueBoost,
    themeMode,
    mpvEditorVisible,
    linkedFoldersDialogVisible,
    themeDialogVisible,
    mpvOptions,
    THEME_LABELS,
    dispatch,
    setError,
    setMpvEditorVisible,
    setLinkedFoldersDialogVisible,
    setThemeDialogVisible,
    handleLinkedFoldersPress,
    handleThemePress,
    onRefresh,
  } = useSettingsScreen();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <LinearGradient
        colors={[colors.background.primary, colors.background.primary]}
        style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
      />

      {/* Ambient warm glow */}
      <View style={[styles.glow, {backgroundColor: colors.accent.goldGlow}]} />

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
          {/* ── Account Section ── */}
          <AccountSection />
          <View style={{height: spacing.sm}} />

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
                trackColor={{false: colors.border.subtle, true: colors.accent.goldDim}}
                thumbColor={hardwareAcceleration ? colors.accent.gold : colors.text.tertiary}
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
                trackColor={{false: colors.border.subtle, true: colors.accent.goldDim}}
                thumbColor={audioNormalization ? colors.accent.gold : colors.text.tertiary}
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
                trackColor={{false: colors.border.subtle, true: colors.accent.goldDim}}
                thumbColor={dialogueBoost ? colors.accent.gold : colors.text.tertiary}
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
