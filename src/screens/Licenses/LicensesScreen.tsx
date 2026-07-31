import React, {useMemo, useState, useRef, useEffect} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  FlatList,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../theme';
import {useAccessibility} from '../../hooks/useAccessibility';
import {spacing, radius} from '../../theme/tokens';
import {AppText} from '../../components/core/AppText/AppText';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import type {LicensesScreenProps} from '../../navigation/types';

type Props = LicensesScreenProps;

interface LicenseEntry {
  library: string;
  author: string;
  license: string;
  fullText: string;
}

const LICENSES: LicenseEntry[] = [
  {
    library: 'mpv (video/audio playback engine)',
    author: 'mpv.io developers',
    license: 'LGPL-2.1+',
    fullText:
      'GNU LESSER GENERAL PUBLIC LICENSE, Version 2.1, February 1999\n\nCopyright (C) 1991, 1999 Free Software Foundation, Inc.\n51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA\n\nEveryone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.\n\nThis version of the GNU Lesser General Public License incorporates the terms and conditions of version 3 of the GNU General Public License, supplemented by the additional permissions described below. mpv can also be built under the GPL, or with parts under the GPL (see the mpv LICENSE file for details).\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.',
  },
  {
    library: 'react-native-mpv',
    author: 'MPV community',
    license: 'MIT License',
    fullText:
      'MIT License\n\nCopyright (c) 2024 MPV community\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.',
  },
  {
    library: 'React Native',
    author: 'Meta Platforms, Inc.',
    license: 'MIT License',
    fullText:
      'MIT License\n\nCopyright (c) Meta Platforms, Inc. and affiliates.\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.',
  },
  {
    library: 'Redux Toolkit',
    author: 'Redux contributors',
    license: 'MIT License',
    fullText:
      'MIT License\n\nCopyright (c) 2018 redux contributors\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.',
  },
  {
    library: 'React Navigation',
    author: 'Expo & React Navigation contributors',
    license: 'MIT License',
    fullText:
      'MIT License\n\nCopyright (c) 2016 React Navigation contributors\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.',
  },
  {
    library: 'react-native-linear-gradient',
    author: 'Brent Vatne & React Native community',
    license: 'MIT License',
    fullText:
      'MIT License\n\nCopyright (c) 2016 Brent Vatne\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.',
  },
  {
    library: 'react-native-safe-area-context',
    author: 'Janic Duplessis & React Native community',
    license: 'MIT License',
    fullText:
      'MIT License\n\nCopyright (c) 2019 Janic Duplessis\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.',
  },
  {
    library: 'react-native-vector-icons',
    author: 'Joel Arvidsson & React Native community',
    license: 'MIT License',
    fullText:
      'MIT License\n\nCopyright (c) 2015 Joel Arvidsson\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.',
  },
  {
    library: 'LZ4 compression',
    author: 'Yann Collet',
    license: 'BSD 2-Clause License',
    fullText:
      'BSD 2-Clause License\n\nCopyright (c) 2011-2020, Yann Collet\nAll rights reserved.\n\nRedistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:\n\n1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.\n2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.\n\nTHIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.',
  },
];

export const LicensesScreen: React.FC<Props> = () => {
  const {colors} = useTheme();
  const {reduceMotion} = useAccessibility();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (reduceMotion) {
      // 59.7: reduced motion — render fully visible, skip fade
      fadeAnim.setValue(1);
      return;
    }
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, reduceMotion]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
        },
        scroll: {
          flex: 1,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
        },
        licenseCard: {
          backgroundColor: colors.background.highlightDim,
          borderRadius: radius.md,
          marginBottom: spacing.sm,
          overflow: 'hidden',
        },
        licenseHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: spacing.lg,
        },
        headerLeft: {
          flex: 1,
        },
        libraryName: {
          marginBottom: 2,
        },
        licenseBadge: {
          backgroundColor: colors.accent.goldSoft,
          borderRadius: radius.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
        },
        fullTextContainer: {
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.lg,
        },
        fullText: {
          lineHeight: 18,
        },
        arrowIcon: {
          fontSize: 18,
          color: colors.text.tertiary,
          marginLeft: spacing.sm,
        },
        divider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border.subtle,
          marginHorizontal: spacing.lg,
        },
      }),
    [colors],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <LinearGradient
        colors={[colors.background.primary, colors.background.elevated]}
        style={StyleSheet.absoluteFill}
      />
      <InternalHeader title="Open Source Licenses" />
      <Animated.View style={[styles.root, {opacity: fadeAnim}]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{paddingBottom: spacing.xxxl}}
          showsVerticalScrollIndicator={false}>
          <AppText
            variant="body2"
            color="tertiary"
            style={{marginBottom: spacing.lg}}>
            This application uses the following open source libraries:
          </AppText>
          {/* 59.1: virtualized license cards */}
          <FlatList
            data={LICENSES}
            keyExtractor={entry => entry.library}
            renderItem={({item: entry, index}) => {
              const isExpanded = expandedIndex === index;
              return (
                <View style={styles.licenseCard}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() =>
                      setExpandedIndex(isExpanded ? null : index)
                    }
                    style={styles.licenseHeader}
                    accessibilityRole="button"
                    accessibilityState={{expanded: isExpanded}}
                    accessibilityLabel={`${entry.library} license`}>
                    <View style={styles.headerLeft}>
                      <AppText
                        variant="body1"
                        color="primary"
                        style={styles.libraryName}>
                        {entry.library}
                      </AppText>
                      <AppText variant="caption" color="tertiary">
                        {entry.author}
                      </AppText>
                    </View>
                    <View style={styles.licenseBadge}>
                      <AppText variant="caption" color="accent">
                        {entry.license}
                      </AppText>
                    </View>
                    <AppText style={styles.arrowIcon}>
                      {isExpanded ? '▼' : '▶'}
                    </AppText>
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.fullTextContainer}>
                      <View style={styles.divider} />
                      <AppText
                        variant="caption"
                        color="tertiary"
                        style={[styles.fullText, {marginTop: spacing.sm}]}>
                        {entry.fullText}
                      </AppText>
                    </View>
                  )}
                </View>
              );
            }}
            scrollEnabled={false}
            initialNumToRender={LICENSES.length}
          />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};
