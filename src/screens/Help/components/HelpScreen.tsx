import React, {useMemo, useRef, useEffect, useState} from 'react';
import {View, ScrollView, StyleSheet, Animated, TouchableOpacity, Linking, FlatList} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../../theme';
import {spacing, radius} from '../../../theme/tokens';
import {AppText} from '../../../components/core/AppText/AppText';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {SearchBar} from '../../../components/core/SearchBar/SearchBar';
import {InternalHeader} from '../../../components/layout/InternalHeader/InternalHeader';
import {supportMailto} from '../../../constants/links';
import type {HelpScreenProps} from '../../../navigation/types';

type Props = HelpScreenProps;

// ── FAQ data (51.1: searchable sections) ─────────────────────

interface FaqItem {
  q: string;
  a: string;
}

interface FaqSection {
  title: string;
  icon: 'settings' | 'music' | 'video' | 'folder' | 'search' | 'list';
  items: FaqItem[];
}

const FAQ_SECTIONS: FaqSection[] = [
  {
    title: 'Getting Started',
    icon: 'list',
    items: [
      {
        q: 'How do I add my media to the library?',
        a: 'Open Profile → Linked folders, then tap "Add Folder" to link a folder on your device. Simba scans linked folders and builds your library automatically. Pull down on the Library page to rescan at any time.',
      },
      {
        q: 'Where is my library stored?',
        a: 'Your library is stored on your device. Simba indexes the files inside the folders you link — it never uploads your media anywhere. Scanning runs locally.',
      },
      {
        q: 'Do I need an account to use Simba?',
        a: 'No. Sign-in with Google is optional — it only shows your name, email and avatar on the Profile page. Your library, playlists, bookmarks, playback history and preferences are stored on this device either way, and you can browse and play everything without signing in.',
      },
    ],
  },
  {
    title: 'Playback',
    icon: 'music',
    items: [
      {
        q: 'Which formats are supported?',
        a: 'Simba is powered by MPV, so it plays virtually any format: MP4, MKV, AVI, WebM, MP3, FLAC, WAV, AAC, OGG, M4A and more, including subtitles in SRT/VTT and embedded tracks.',
      },
      {
        q: 'How do I resume a video or song where I left off?',
        a: 'Simba remembers playback positions automatically. Videos show a resume prompt with the saved position; audio resumes from the saved spot when reopened.',
      },
      {
        q: 'How does picture-in-picture work?',
        a: 'While a video is playing, tap the PiP button in the player controls at the bottom of the screen, or press the Home button — the video continues in a floating window. The window can be dragged, resized, and dismissed with the close button.',
      },
      {
        q: 'Can I play audio in the background?',
        a: 'Yes. Audio keeps playing with the screen off or while you use other apps, and a media notification lets you pause, skip, or stop from the lock screen.',
      },
      {
        q: 'Why does my video show a black screen?',
        a: 'The video surface may conflict with hardware acceleration on some devices. Try turning hardware acceleration off in Profile → Playback, or update your device graphics drivers.',
      },
    ],
  },
  {
    title: 'Library & Playlists',
    icon: 'folder',
    items: [
      {
        q: 'How do I create a playlist?',
        a: 'Open any song or video, tap the queue/list icon, then "Add to playlist". Playlists are managed from the Library — you can rename, reorder, pin and delete them there.',
      },
      {
        q: 'What is the difference between queue and playlist?',
        a: 'The queue is a temporary, session-wide list of what plays next — it is cleared when you stop. Playlists are saved collections that persist and can be played anytime.',
      },
      {
        q: 'How do bookmarks work?',
        a: 'Bookmarks save a named position inside a file. Open the player, tap the bookmark icon, and save the current spot. Jump back to any bookmark from the bookmarks sheet or the Bookmarks screen.',
      },
    ],
  },
  {
    title: 'Account & Data',
    icon: 'search',
    items: [
      {
        q: 'What data is stored when I sign in?',
        a: 'Your Google profile name, email and avatar, and they are kept on this device. There is no server-side account and no backup: your library, playlists, bookmarks, playback history and preferences are local too, and nothing is sent to us or any third party. See the Privacy Policy for the full picture.',
      },
      {
        q: 'How do I sign out or delete my data?',
        a: 'Open Profile (tap your avatar on the Home screen). There you can sign out, revoke Google access, or clear all local data — recent history, bookmarks, playlists, and cached files.',
      },
      {
        q: 'Does Simba track my activity?',
        a: 'No analytics or tracking SDKs are included. Play counts and recently played entries are stored only on your device and shown to you in Profile and History.',
      },
    ],
  },
  {
    // The preferences live on the Profile page (md/PROFILE_SETTINGS_MERGE.md),
    // so this section is named after what it is about.
    title: 'Appearance',
    icon: 'settings',
    items: [
      {
        q: 'How do I change the theme?',
        a: 'Open Profile → Appearance → Theme and choose System, Light or Dark.',
      },
      {
        q: 'How do I reset my preferences?',
        a: 'Open Profile → Reset → Reset preferences. Every preference goes back to its default — theme, playback, subtitles and MPV options. Your linked folders, media, downloads and playlists are not touched.',
      },
    ],
  },
  {
    title: 'Troubleshooting',
    icon: 'video',
    items: [
      {
        q: 'A file does not play or shows an error',
        a: 'Confirm the file is not corrupt and is in a supported format. Try turning hardware acceleration off in Profile → Playback, then replay. If the error persists, use About → Report a bug so we can investigate.',
      },
      {
        q: 'My library is empty after linking a folder',
        a: 'Make sure the folder is readable by the app (Android storage permissions may need to be granted in the system settings), then pull down on the Library page to rescan.',
      },
      {
        q: 'Playback is choppy or stutters',
        a: 'Try toggling hardware acceleration in Profile → Playback, close other heavy apps, and make sure the file is stored locally rather than on a slow network share.',
      },
    ],
  },
];

const CONTACT_URL = supportMailto('Simba Player Help');

export const HelpScreen: React.FC<Props> = () => {
  const {colors} = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [query, setQuery] = useState('');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // ── Filter FAQ by query (matches question + answer, case-insensitive) ──
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQ_SECTIONS;
    return FAQ_SECTIONS.map(section => ({
      ...section,
      items: section.items.filter(
        item =>
          item.q.toLowerCase().includes(q) ||
          item.a.toLowerCase().includes(q),
      ),
    })).filter(section => section.items.length > 0);
  }, [query]);

  const matchCount = useMemo(
    () => filtered.reduce((sum, s) => sum + s.items.length, 0),
    [filtered],
  );

  const toggleItem = (key: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

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
        searchWrap: {
          marginBottom: spacing.md,
        },
        resultCount: {
          marginBottom: spacing.sm,
        },
        section: {
          marginBottom: spacing.lg,
        },
        sectionHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing.sm,
        },
        sectionTitle: {
          marginLeft: spacing.xs,
        },
        faqCard: {
          backgroundColor: colors.background.elevated,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border.subtle,
          marginBottom: spacing.sm,
          overflow: 'hidden',
        },
        faqQuestion: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          minHeight: 52,
        },
        faqQuestionText: {
          flex: 1,
          marginRight: spacing.sm,
        },
        faqAnswer: {
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.md,
        },
        faqAnswerDivider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border.subtle,
          marginBottom: spacing.md,
        },
        contactCard: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.background.elevated,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border.subtle,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          marginBottom: spacing.xxxl,
          minHeight: 52,
        },
        empty: {
          alignItems: 'center',
          paddingVertical: spacing.xxl,
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
      <InternalHeader title="Help" />
      <Animated.View style={[styles.root, {opacity: fadeAnim}]}>
        {/* Search box (53.6: core SearchBar) */}
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search questions…"
          style={styles.searchWrap}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{paddingBottom: spacing.sm}}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {query.trim().length > 0 ? (
            <AppText variant="caption" color="tertiary" style={styles.resultCount}>
              {matchCount} {matchCount === 1 ? 'result' : 'results'} for "{query.trim()}"
            </AppText>
          ) : null}

          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <SvgIcon name="search" size={40} color={colors.text.tertiary} />
              <AppText variant="body2" color="secondary">
                No articles match your search.
              </AppText>
            </View>
          ) : (
            /* 59.1: virtualized FAQ sections */
            <FlatList
              data={filtered}
              keyExtractor={section => section.title}
              renderItem={({item: section}) => (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <SvgIcon
                      name={section.icon}
                      size={16}
                      color={colors.accent.gold}
                    />
                    <AppText variant="displaySans" color="accent" style={styles.sectionTitle}>
                      {section.title}
                    </AppText>
                  </View>
                  {/* 59.1: virtualized FAQ cards */}
                  <FlatList
                    data={section.items}
                    keyExtractor={item => `${section.title}::${item.q}`}
                    renderItem={({item}) => {
                      const open = openItems.has(`${section.title}::${item.q}`);
                      return (
                        <View style={styles.faqCard}>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => toggleItem(`${section.title}::${item.q}`)}
                            style={styles.faqQuestion}
                            accessibilityRole="button"
                            accessibilityLabel={item.q}
                            accessibilityState={{expanded: open}}>
                            <AppText
                              variant="body1"
                              color="primary"
                              style={styles.faqQuestionText}>
                              {item.q}
                            </AppText>
                            <SvgIcon
                              name="chevronRight"
                              size={16}
                              color={colors.text.tertiary}
                              style={open ? {transform: [{rotate: '90deg'}]} : undefined}
                            />
                          </TouchableOpacity>
                          {open ? (
                            <View style={styles.faqAnswer}>
                              <View style={styles.faqAnswerDivider} />
                              <AppText variant="body2" color="secondary">
                                {item.a}
                              </AppText>
                            </View>
                          ) : null}
                        </View>
                      );
                    }}
                    scrollEnabled={false}
                    initialNumToRender={section.items.length}
                  />
                </View>
              )}
              scrollEnabled={false}
              initialNumToRender={filtered.length}
            />
          )}

          {/* Contact card (51.6: real mailto action) */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => Linking.openURL(CONTACT_URL).catch(() => {})}
            style={styles.contactCard}
            accessibilityRole="button"
            accessibilityLabel="Contact support">
            <AppText variant="body1" color="primary">
              Still need help? Contact support
            </AppText>
            <SvgIcon name="chevronRight" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

export default HelpScreen;
