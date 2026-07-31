import React, {useMemo, useRef, useEffect, useState} from 'react';
import {View, ScrollView, StyleSheet, Animated, TouchableOpacity, Linking, FlatList} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {SearchBar} from '../../components/core/SearchBar/SearchBar';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import type {HelpScreenProps} from '../../navigation/types';

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
        a: 'Open Settings → Linked Folders, then tap "Add Folder" to link a folder on your device. Simba scans linked folders and builds your library automatically. You can rescan at any time from Preferences.',
      },
      {
        q: 'Where is my library stored?',
        a: 'Your library is stored on your device. Simba indexes the files inside the folders you link — it never uploads your media anywhere. Scanning runs locally.',
      },
      {
        q: 'Do I need an account to use Simba?',
        a: 'No. Sign-in with Google is optional — it is used only to back up your preferences and playlists. You can browse and play all local media without an account.',
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
        a: 'Simba remembers playback positions automatically. Videos show a resume prompt with the saved position; audio resumes from the saved spot when reopened. Toggle this in Preferences → Remember playback position.',
      },
      {
        q: 'How does picture-in-picture work?',
        a: 'While a video is playing, press the PiP button in the top bar or the Home button — the video continues in a floating window. The window can be dragged, resized, and dismissed with the close button.',
      },
      {
        q: 'Can I play audio in the background?',
        a: 'Yes. Audio keeps playing with the screen off or while you use other apps, and a media notification lets you pause, skip, or stop from the lock screen. Control this in Preferences → Media notifications.',
      },
      {
        q: 'Why does my video show a black screen?',
        a: 'The video surface may conflict with hardware acceleration on some devices. Try Settings → Audio & Playback → Hardware acceleration, or update your device graphics drivers.',
      },
    ],
  },
  {
    title: 'Library & Playlists',
    icon: 'folder',
    items: [
      {
        q: 'How do I create a playlist?',
        a: 'Open any song or video, tap the queue/list icon, then "Add to playlist". Playlists are managed under Library → Playlists, where you can rename, reorder, and delete them.',
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
        a: 'Sign-in stores your Google profile name, email, and avatar locally so playlists and preferences can be associated with your account. Nothing is shared with third parties. See Privacy Policy for details.',
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
    title: 'Settings & Accessibility',
    icon: 'settings',
    items: [
      {
        q: 'How do I change the app language?',
        a: 'Preferences → Language. Choose System default to follow your device language, or pick a language explicitly.',
      },
      {
        q: 'How do I make controls bigger?',
        a: 'Preferences → Larger controls scales the player buttons for easier tapping. High-contrast subtitles improves subtitle legibility in the video player.',
      },
      {
        q: 'How do I reset all settings?',
        a: 'Open About → Reset all settings. This restores every setting to its default value — it does not delete your media or playlists.',
      },
    ],
  },
  {
    title: 'Troubleshooting',
    icon: 'video',
    items: [
      {
        q: 'A file does not play or shows an error',
        a: 'Confirm the file is not corrupt and is in a supported format. Try disabling hardware acceleration in Settings, then replay. If the error persists, use About → Report Bug so we can investigate.',
      },
      {
        q: 'My library is empty after linking a folder',
        a: 'Make sure the folder is readable by the app (Android storage permissions may need to be granted in system Settings), then trigger a rescan from Preferences → Rescan library.',
      },
      {
        q: 'Notifications are not showing',
        a: 'On Android 13+, notification permission must be granted. Enable Media notifications in Preferences — Simba will ask for permission the first time. Also confirm the system-level permission is allowed for Simba.',
      },
      {
        q: 'Playback is choppy or stutters',
        a: 'Try toggling hardware acceleration in Settings → Audio & Playback, close other heavy apps, and make sure the file is stored locally rather than on a slow network share.',
      },
    ],
  },
];

const CONTACT_URL =
  'mailto:support@simbaplayer.app?subject=Simba%20Player%20Help';

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
                    <AppText variant="h3" color="accent" style={styles.sectionTitle}>
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
