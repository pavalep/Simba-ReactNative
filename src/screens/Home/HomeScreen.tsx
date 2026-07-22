import React, {useCallback, useEffect, useMemo} from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
  Platform,
  SafeAreaView,
  useWindowDimensions,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {SimbaStatusBar} from '../../components/StatusBar';
import {useTheme} from '../../theme';
import {AppText} from '../../components/core/AppText/AppText';
import {SectionHeader} from '../../components/utility/SectionHeader/SectionHeader';
import {EmptyState} from '../../components/utility/EmptyState/EmptyState';
import {HomeScreenProps} from '../../navigation/types';
import {pickMediaFile, checkFileExists} from '../../services/fileService';
import {MpvPlayer} from '../../native';
import {imagePaths} from '../../constants/imagePaths';
import {useAppDispatch, useAppSelector} from '../../store';
import {removeRecentFile, SessionEntry} from '../../store/slices/sessionSlice';
import {radius, spacing} from '../../theme/tokens';

type Props = HomeScreenProps;

const GRID_COLUMNS = 2;
const GRID_GAP = 12;

// ── Duration helpers ────────────────────────────────
function formatRemaining(seconds: number): string {
  if (seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)} remaining`;
}

function formatDurationShort(seconds: number): string {
  if (seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Build a dynamic greeting based on local time. */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// ── Main Component ─────────────────────────────────
export const HomeScreen: React.FC<Props> = ({navigation}) => {
  const {theme, colors, spacing: s} = useTheme();

  // ── Launch fade-in animation ──
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const styles = useMemo(() => StyleSheet.create({
    root: {flex: 1},
    scroll: {flex: 1},
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'android' ? 16 : 0,
      paddingBottom: 32,
    },

    // ── Ambient glow ──
    glowWarm: {
      position: 'absolute',
      top: -120,
      left: -80,
      width: 280,
      height: 280,
      borderRadius: 140,
    },

    // ── Header ──
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
      marginBottom: 28,
    },
    logo: {
      width: 34,
      height: 34,
      resizeMode: 'contain',
    },
    searchIcon: {
      width: 22,
      height: 22,
      resizeMode: 'contain',
      opacity: 0.65,
    },

    // ── Greeting ──
    greeting: {
      marginBottom: 4,
    },
    subtitle: {
      marginBottom: 24,
    },

    // ── CTA ──
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: radius.pill,
      marginBottom: 28,
    },
    folderIcon: {
      width: 20,
      height: 20,
      resizeMode: 'contain',
      marginRight: 10,
    },
    ctaLabel: {
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 0.5,
    },

    // ── Continue Watching ──
    horizontalScrollContent: {
      paddingRight: 20,
      gap: GRID_GAP,
    },
    continueTile: {
      borderRadius: radius.sm,
      borderWidth: 0.5,
      overflow: 'hidden',
    },
    continueThumb: {
      width: '100%',
      height: 90,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    continueThumbImg: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    continueThumbPlaceholder: {
      width: 28,
      height: 28,
      resizeMode: 'contain',
      opacity: 0.45,
    },
    continueTitle: {
      paddingHorizontal: 8,
      paddingTop: 6,
      paddingBottom: 4,
    },
    progressTrack: {
      height: 2,
      marginHorizontal: 8,
      marginBottom: 8,
      borderRadius: 1,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 1,
    },
    remaining: {
      fontSize: 12,
      letterSpacing: 0.2,
      textAlign: 'right',
      marginTop: 6,
      marginRight: 2,
    },

    // ── Recent Grid ──
    recentGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: GRID_GAP,
    },
    recentTile: {
      borderRadius: radius.sm,
      borderWidth: 0.5,
      overflow: 'hidden',
    },
    recentThumb: {
      width: '100%',
      height: 100,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    recentThumbImg: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    recentThumbPlaceholder: {
      width: 28,
      height: 28,
      resizeMode: 'contain',
      opacity: 0.45,
    },
    recentProgressTrack: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
    },
    recentProgressFill: {
      height: '100%',
    },
    recentTitle: {
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
  }), [colors]);
  const dispatch = useAppDispatch();
  const recentFiles = useAppSelector(state => state.session.recentFiles);
  const {width: screenWidth} = useWindowDimensions();

  const isDark = theme === 'dark';
  const tileWidth = Math.floor((screenWidth - 20 * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS);
  const greeting = useMemo(() => getGreeting(), []);

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = React.useState(false);

  // ── Derive data from Redux ──
  const continueItem: SessionEntry | undefined = recentFiles.find(
    f => f.position > 0 && f.duration > 0,
  );
  const recentItems = recentFiles.slice(0, 4);

  // ── Validate files on mount — remove broken links ──
  useEffect(() => {
    if (recentFiles.length === 0) return;

    let cancelled = false;
    const validate = async () => {
      for (const entry of recentFiles) {
        if (cancelled) break;
        if (entry.fileUri.startsWith('content://')) continue;
        const exists = await checkFileExists(entry.fileUri);
        if (!exists && !cancelled) {
          dispatch(removeRecentFile(entry.fileUri));
        }
      }
    };
    validate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ──
  const handleOpenMedia = useCallback(async () => {
    try {
      const file = await pickMediaFile();
      if (!file) return;
      navigation.navigate('Player', {
        fileUri: file.uri,
        fileTitle: file.title,
      });
    } catch (_err) {
      Alert.alert('Error', 'Failed to open file picker.');
    }
  }, [navigation]);

  const handlePlayRecent = useCallback(
    async (entry: SessionEntry) => {
      if (entry.fileUri.startsWith('content://')) {
        try { MpvPlayer.grantPersistablePermission(entry.fileUri); } catch {}
        navigation.navigate('Player', {
          fileUri: entry.fileUri,
          fileTitle: entry.title,
        });
        return;
      }

      const exists = await checkFileExists(entry.fileUri);
      if (!exists) {
        dispatch(removeRecentFile(entry.fileUri));
        Alert.alert('File Not Found', 'This file has been moved or deleted.');
        return;
      }
      navigation.navigate('Player', {
        fileUri: entry.fileUri,
        fileTitle: entry.title,
      });
    },
    [dispatch, navigation],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Re-validate recent files
    for (const entry of recentFiles) {
      if (entry.fileUri.startsWith('content://')) continue;
      const exists = await checkFileExists(entry.fileUri);
      if (!exists) {
        dispatch(removeRecentFile(entry.fileUri));
      }
    }
    setRefreshing(false);
  }, [recentFiles, dispatch]);

  const hasRecent = recentItems.length > 0;
  const hasContinue = !!continueItem;
  const isEmpty = !hasRecent && !hasContinue;

  // ── Empty State ──
  if (isEmpty) {
    return (
      <Animated.View style={[styles.root, {opacity: fadeAnim}]}>
        <SimbaStatusBar variant="home" />
        <LinearGradient
          colors={
            isDark
              ? [colors.background.primary, '#0B0F13']
              : ['#F7F7F7', colors.background.primary]
          }
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.glowWarm,
            {backgroundColor: colors.accent.gold, opacity: isDark ? 0.22 : 0.12},
          ]}
          pointerEvents="none"
        />
        <EmptyState
          icon={imagePaths.uiFolderBlack}
          title="Ready to play"
          subtitle="Open a media file to get started"
          actionLabel="Open Media"
          onAction={handleOpenMedia}
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{flex: 1, opacity: fadeAnim}}>
      <SafeAreaView style={styles.root}>
        <SimbaStatusBar variant="home" />

      {/* ══ BACKGROUND ══ */}
      <LinearGradient
        colors={[colors.background.primary, colors.background.primary]}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.glowWarm,
          {backgroundColor: colors.accent.gold, opacity: isDark ? 0.22 : 0.12},
        ]}
        pointerEvents="none"
      />

      {/* ══ MAIN CONTENT ══ */}
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.gold}
            colors={[colors.accent.gold]}
            progressBackgroundColor={colors.background.elevated}
          />
        }>

        {/* ── Header (not sticky) ── */}
        <View style={styles.header}>
          {/* Logo mark (left) */}
          <Image source={imagePaths.uiLionGold} style={styles.logo} />
          {/* Search icon button (right) */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Search')}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Image
              source={imagePaths.uiBellGray}
              style={[styles.searchIcon, {tintColor: colors.text.secondary}]}
            />
          </TouchableOpacity>
        </View>

        {/* ── GreetingSection ── */}
        <AppText variant="h1" color="primary" style={styles.greeting}>
          {greeting}
        </AppText>
        <AppText variant="body1" color="secondary" style={styles.subtitle}>
          Play what moves you.
        </AppText>

        {/* ── OpenMediaCTA (full-width gold button) ── */}
        <TouchableOpacity activeOpacity={0.85} onPress={handleOpenMedia}>
          <LinearGradient
            colors={[colors.accent.gold, '#B8922E']}
            style={styles.cta}
            start={{x: 0.5, y: 0}}
            end={{x: 0.5, y: 1}}>
            <Image
              source={imagePaths.uiFolderBlack}
              style={[styles.folderIcon, {tintColor: '#0A0A0C'}]}
            />
            <AppText
              variant="body1"
              color={colors.text.secondary}
              style={styles.ctaLabel}>
              Open Media
            </AppText>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── ContinueWatchingSection ── */}
        {hasContinue && (
          <View style={{marginTop: s.lg}}>
            <SectionHeader label="Continue Watching" />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollContent}
              snapToInterval={tileWidth + GRID_GAP}
              decelerationRate="fast">
              {recentFiles
                .filter(f => f.position > 0 && f.duration > 0)
                .slice(0, 4)
                .map((entry, idx) => {
                  const percent = entry.duration > 0
                    ? Math.round((entry.position / entry.duration) * 100)
                    : 0;
                  return (
                    <TouchableOpacity
                      key={entry.fileUri + idx}
                      activeOpacity={0.75}
                      onPress={() => handlePlayRecent(entry)}
                      style={[
                        styles.continueTile,
                        {
                          width: tileWidth,
                          backgroundColor: colors.background.elevated,
                          borderColor: colors.border.subtle,
                        },
                      ]}>
                      {/* Thumbnail */}
                      <View style={[styles.continueThumb, {backgroundColor: colors.accent.goldDim}]}>
                        {entry.thumbnailPath ? (
                          <Image
                            source={{uri: 'file://' + entry.thumbnailPath + '?t=' + encodeURIComponent(entry.lastPlayedAt)}}
                            style={styles.continueThumbImg}
                          />
                        ) : (
                          <Image
                            source={imagePaths.uiMusicGray}
                            style={styles.continueThumbPlaceholder}
                          />
                        )}
                      </View>
                      {/* Title */}
                      <AppText
                        variant="caption"
                        color="primary"
                        numberOfLines={1}
                        style={styles.continueTitle}>
                        {entry.title}
                      </AppText>
                      {/* Progress bar */}
                      <View style={[styles.progressTrack, {backgroundColor: colors.border.subtle}]}>
                        <View
                          style={[
                            styles.progressFill,
                            {width: `${percent}%`, backgroundColor: colors.accent.gold},
                          ]}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            <AppText variant="caption" color="tertiary" style={styles.remaining}>
              {formatRemaining(continueItem!.duration! - continueItem!.position!)}
            </AppText>
          </View>
        )}

        {/* ── RecentSection ── */}
        {hasRecent && (
          <View style={{marginTop: s.xxl}}>
            <SectionHeader label="Recently Opened" />

            <View style={styles.recentGrid}>
              {recentItems.map((entry, idx) => {
                const percent = entry.duration > 0
                  ? Math.round((entry.position / entry.duration) * 100)
                  : 0;
                return (
                  <TouchableOpacity
                    key={entry.fileUri + idx}
                    activeOpacity={0.75}
                    onPress={() => handlePlayRecent(entry)}
                    style={[
                      styles.recentTile,
                      {
                        width: tileWidth,
                        backgroundColor: colors.background.elevated,
                        borderColor: colors.border.subtle,
                      },
                    ]}>
                    {/* Thumbnail */}
                    <View style={[styles.recentThumb, {backgroundColor: colors.accent.goldDim}]}>
                      {entry.thumbnailPath ? (
                        <Image
                          source={{uri: 'file://' + entry.thumbnailPath + '?t=' + encodeURIComponent(entry.lastPlayedAt)}}
                          style={styles.recentThumbImg}
                        />
                      ) : (
                        <Image
                          source={imagePaths.uiMusicGray}
                          style={styles.recentThumbPlaceholder}
                        />
                      )}
                      {/* Progress bar overlay */}
                      <View style={[styles.recentProgressTrack, {backgroundColor: 'rgba(0,0,0,0.3)'}]}>
                        <View
                          style={[
                            styles.recentProgressFill,
                            {width: `${percent}%`, backgroundColor: colors.accent.gold}
                          ]}
                        />
                      </View>
                    </View>
                    {/* Title */}
                    <AppText
                      variant="caption"
                      color="primary"
                      numberOfLines={1}
                      style={styles.recentTitle}>
                      {entry.title}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── BottomSpacer (xxxl) — pushes content above tab bar ── */}
        <View style={{height: spacing.xxxl}} />
      </Animated.ScrollView>
    </SafeAreaView>
    </Animated.View>
  );
};

