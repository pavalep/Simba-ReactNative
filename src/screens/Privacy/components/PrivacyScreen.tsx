import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../../theme';
import {PrivacyScreenProps} from '../../../navigation/types';
import {SimbaStatusBar} from '../../../components/StatusBar';
import {InternalHeader} from '../../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../../components/core/AppText/AppText';

type Props = PrivacyScreenProps;

/** Phase 46.7: privacy policy — all data stays on-device. */
export const PrivacyScreen: React.FC<Props> = ({navigation: _navigation}) => {
  const {colors} = useTheme();

  return (
    <View style={styles.root}>
      <SimbaStatusBar variant="home" />
      {/*
        2026-11-12: this page painted a hardcoded `#D4B47A` slab over
        the whole screen — a GOLD page, with the body text in the
        theme's dark brown on top of it. In the dark theme it read as a
        solid gold rectangle behind the text.

        The background is now the app's own, the same gradient the About
        and Help pages use (`colors.background.primary` →
        `colors.background.elevated`), so a legal page looks like the
        rest of the app. The same slab was on the Terms page; both are
        fixed together because it is the same defect.
      */}
      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.root} edges={['top']}>
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
    </View>
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
