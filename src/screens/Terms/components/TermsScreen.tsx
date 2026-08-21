import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme';
import {TermsScreenProps} from '../../../navigation/types';
import {SimbaStatusBar} from '../../../components/StatusBar';
import {InternalHeader} from '../../../components/layout/InternalHeader/InternalHeader';
import {AppText} from '../../../components/core/AppText/AppText';

type Props = TermsScreenProps;

/** Phase 46.7: terms of use — simple, honest terms for a local player. */
export const TermsScreen: React.FC<Props> = ({navigation: _navigation}) => {
  const {colors} = useTheme();

  return (
    <SafeAreaView style={styles.root}>
      <SimbaStatusBar variant="home" />
      <View style={[StyleSheet.absoluteFill, {backgroundColor: '#D4B47A'}]} />
      <InternalHeader title="Terms of Use" titleVariant="displaySerif" />

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
