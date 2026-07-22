import React, {useMemo} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {AppText} from '../../components/core/AppText/AppText';
import {AboutScreenProps} from '../../navigation/types';
import {imagePaths} from '../../constants/imagePaths';
import {SimbaStatusBar} from '../../components/StatusBar';

type Props = AboutScreenProps;

const LINK_ITEMS = [
  'Privacy Policy',
  'Terms of Service',
  'Open Source Licenses',
  'Rate on Play Store',
] as const;

export const AboutScreen: React.FC<Props> = ({navigation}) => {
  const {colors, isDark} = useTheme();
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 12,
        },
        backButton: {
          paddingRight: 16,
          paddingVertical: 4,
        },
        content: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        },
        logo: {
          width: 80,
          height: 80,
          marginBottom: 16,
          resizeMode: 'contain',
        },
        appName: {
          marginBottom: 4,
        },
        version: {
          marginBottom: 20,
        },
        divider: {
          width: '40%',
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border.subtle,
          marginVertical: 20,
        },
        linkItem: {
          paddingVertical: 10,
          paddingHorizontal: 20,
        },
        footer: {
          alignItems: 'center',
          paddingBottom: insets.bottom,
          paddingTop: 12,
        },
        resetButton: {
          paddingVertical: 14,
          paddingHorizontal: 32,
        },
      }),
    [colors, insets.bottom],
  );

  const handleLinkPress = (item: string) => {
    Alert.alert(item);
  };

  const handleResetPress = () => {
    Alert.alert(
      'Reset All Settings',
      'Are you sure you want to reset all settings to their defaults? This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Reset', style: 'destructive', onPress: () => {}},
      ],
    );
  };

  return (
    <View style={styles.root}>
      <SimbaStatusBar variant="home" />
      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <AppText variant="body1" color="accent">
              {'←'} Back
            </AppText>
          </TouchableOpacity>
          <AppText variant="h2" color="primary">
            About
          </AppText>
        </View>
        <View style={styles.content}>
          <Image
            source={
              isDark ? imagePaths.appLogoDark : imagePaths.appLogoLight
            }
            style={styles.logo}
          />
          <AppText
            variant="h3"
            color="accent"
            style={styles.appName}>
            Simba Player
          </AppText>
          <AppText
            variant="body2"
            color="secondary"
            style={styles.version}>
            Version 1.0.0
          </AppText>
          <View style={styles.divider} />
          {LINK_ITEMS.map(item => (
            <TouchableOpacity
              key={item}
              onPress={() => handleLinkPress(item)}
              style={styles.linkItem}>
              <AppText variant="body1" color="primary">
                {item}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleResetPress}
            style={styles.resetButton}>
            <AppText variant="body1" color="error">
              Reset all settings
            </AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};
