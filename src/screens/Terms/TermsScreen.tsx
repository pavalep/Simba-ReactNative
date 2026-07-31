import React from 'react';
import {View, ScrollView, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../theme';
import {TermsScreenProps} from '../../navigation/types';
import {SimbaStatusBar} from '../../components/StatusBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../components/core/AppText/AppText';

type Props = TermsScreenProps;

/** Phase 46.7: terms of use — simple, honest terms for a local player. */
export const TermsScreen: React.FC<Props> = ({navigation: _navigation}) => {
  const {colors} = useTheme();

  return (
    <SafeAreaView style={styles.root}>
      <SimbaStatusBar variant="home" />
      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />
      <InternalHeader title="Terms of Use" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <AppText variant="body2" color="primary" style={styles.paragraph}>
          Simba Player is provided "as is" for playing media files that you
          have the legal right to access. You are responsible for the content
          you play and for ensuring you have the necessary rights or licenses.
        </AppText>
        <AppText variant="body2" color="primary" style={styles.paragraph}>
          The software is offered without warranty of any kind. To the maximum
          extent permitted by law, we are not liable for any damages arising
          from the use of this application.
        </AppText>
        <AppText variant="body2" color="primary" style={styles.paragraph}>
          By using Simba Player you agree to these terms. If you do not agree,
          please discontinue use and uninstall the application.
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
