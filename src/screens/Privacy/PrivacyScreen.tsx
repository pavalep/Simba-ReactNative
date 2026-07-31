import React from 'react';
import {View, ScrollView, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../theme';
import {PrivacyScreenProps} from '../../navigation/types';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../components/core/AppText/AppText';

type Props = PrivacyScreenProps;

/** Phase 46.7: privacy policy — all data stays on-device. */
export const PrivacyScreen: React.FC<Props> = ({navigation: _navigation}) => {
  const {colors} = useTheme();

  return (
    <SafeAreaView style={styles.root}>
      <SimbaStatusBar variant="home" />
      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />
      <InternalHeader title="Privacy Policy" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <AppText variant="body2" color="primary" style={styles.paragraph}>
          Simba Player is a local-first media player. Your library, playlists,
          bookmarks, playback history, and preferences are stored only on this
          device and are never transmitted to us or any third party.
        </AppText>
        <AppText variant="body2" color="primary" style={styles.paragraph}>
          Network access is used exclusively for optional features you
          explicitly trigger, such as metadata lookups and streaming sources
          you add. We do not track, profile, or sell your data.
        </AppText>
        <AppText variant="body2" color="primary" style={styles.paragraph}>
          You can erase all app data at any time by clearing the app storage in
          your system settings or by uninstalling the application.
        </AppText>
        <AppText variant="caption" color="secondary" style={styles.footnote}>
          Last updated: July 2026
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  paragraph: {
    lineHeight: 22,
  },
  footnote: {
    marginTop: 16,
  },
});
