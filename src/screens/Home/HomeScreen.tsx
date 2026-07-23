import React, {useCallback, useEffect, useMemo} from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StyleSheet,
  Alert,
  Platform,
  useWindowDimensions,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {SimbaStatusBar} from '../../components/StatusBar';
import {useTheme} from '../../theme';
import {AppText} from '../../components/core/AppText/AppText';
import {SectionHeader} from '../../components/utility/SectionHeader/SectionHeader';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {HomeScreenProps} from '../../navigation/types';
import {pickMediaFile, checkFileExists, getMediaType} from '../../services/fileService';
import {MpvPlayer} from '../../native';
import {useAppDispatch, useAppSelector} from '../../store';
import {removeRecentFile, SessionEntry} from '../../store/slices/sessionSlice';
import {
  pickVideoPlaceholder,
  pickAudioPlaceholder,
  getVideoTitle,
  getAudioTitle,
  VIDEO_PLACEHOLDERS,
  AUDIO_PLACEHOLDERS,
} from '../../constants/placeholders';
import {radius} from '../../theme/tokens';

type Props = HomeScreenProps;

const HORIZONTAL_GAP = 12;
const TILE_HEIGHT = 160;
const TILE_WIDTH = 110;
const THUMB_HEIGHT = 130;
const PLACEHOLDER_ITEM_COUNT = 7;

// ── Display item model ─────────────────────────────
type DisplayItem = {
  /** Stable key */
  key: string;
  /** Title shown on the card */
  title: string;
  /** Image source — either a remote-style object or a local require() */
  image: {uri: string} | number;
  /** True if this is a synthetic placeholder (no real file behind it) */
  isPlaceholder: boolean;
};

// ── Duration helpers ────────────────────────────────
function formatRemaining(seconds: number): string {
  if (seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)} remaining`;
}

/** Build a dynamic greeting based on local time. */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Resolve the best image source for a recent entry.
 * Prefers the captured thumbnail; otherwise returns a deterministic
 * placeholder for its media type.
 */
function thumbnailFor(entry: SessionEntry): {uri: string} | number {
  if (entry.thumbnailPath) {
    return {
      uri: 'file://' + entry.thumbnailPath + '?t=' + encodeURIComponent(entry.lastPlayedAt),
    };
  }
  const type = entry.mediaType ?? getMediaType(entry.fileUri);
  return type === 'audio'
    ? pickAudioPlaceholder(entry.fileUri)
    : pickVideoPlaceholder(entry.fileUri);
}

/** Build a fixed list of placeholder items for an empty list. */
function buildPlaceholderItems(kind: 'video' | 'audio'): DisplayItem[] {
  const placeholders = kind === 'video' ? VIDEO_PLACEHOLDERS : AUDIO_PLACEHOLDERS;
  return Array.from({length: PLACEHOLDER_ITEM_COUNT}, (_, i) => ({
    key: `${kind}-placeholder-${i}`,
    title: kind === 'video' ? getVideoTitle(i) : getAudioTitle(i),
    image: placeholders[i % placeholders.length],
    isPlaceholder: true,
  }));
}

/** Convert real recent entries to display items. */
function toDisplayItems(entries: SessionEntry[]): DisplayItem[] {
  return entries.map((entry, i) => ({
    key: entry.fileUri + ':' + i,
    title: entry.title,
    image: thumbnailFor(entry),
    isPlaceholder: false,
  }));
}

// ── Main Component ─────────────────────────────────
export const HomeScreen: React.FC<Props> = ({navigation}) => {
  const {theme, colors} = useTheme();
  const insets = useSafeAreaInsets();
  const bottomChromeInset = insets.bottom + 104;

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
      paddingBottom: bottomChromeInset,
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
    headerAction: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background.floating,
      borderColor: colors.border.subtle,
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
      marginRight: 10,
    },
    ctaLabel: {
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 0.5,
    },

    // ── Horizontal lists (Videos / Audio) ──
    horizontalList: {
      paddingRight: 20,
    },
    horizontalListContent: {
      gap: HORIZONTAL_GAP,
      paddingVertical: 4,
    },
    sectionGap: {
      marginTop: 28,
    },

    // ── Tile ──
    tile: {
      width: TILE_WIDTH,
      height: TILE_HEIGHT,
      borderRadius: radius.sm,
      borderWidth: 0.5,
      overflow: 'hidden',
      backgroundColor: colors.background.elevated,
      borderColor: colors.border.subtle,
    },
    thumb: {
      width: '100%',
      height: THUMB_HEIGHT,
      backgroundColor: colors.accent.goldDim,
    },
    thumbImg: {
      width: '100%',
      height: '100%',
    },
    progressTrack: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    progressFill: {
      height: '100%',
    },
    tileTitleWrap: {
      flex: 1,
      paddingHorizontal: 8,
      paddingTop: 6,
      paddingBottom: 4,
    },
    placeholderBadge: {
      position: 'absolute',
      top: 6,
      left: 6,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.accent.gold,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── Continue Watching (single hero tile) ──
    continueTile: {
      borderRadius: radius.sm,
      borderWidth: 0.5,
      overflow: 'hidden',
    },
    continueThumb: {
      width: '100%',
      height: 140,
      backgroundColor: colors.accent.goldDim,
    },
    continueThumbImg: {
      width: '100%',
      height: '100%',
    },
    continueTitle: {
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 6,
    },
    continueProgressTrack: {
      height: 3,
      marginHorizontal: 10,
      marginBottom: 10,
      borderRadius: 1.5,
      overflow: 'hidden',
    },
    continueProgressFill: {
      height: '100%',
      borderRadius: 1.5,
    },
    remaining: {
      fontSize: 12,
      letterSpacing: 0.2,
      textAlign: 'right',
      marginTop: 6,
      marginRight: 2,
    },

    // ── Empty list placeholder ──
    emptyRow: {
      paddingVertical: 24,
      alignItems: 'center',
      borderRadius: radius.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.subtle,
      backgroundColor: colors.background.elevated,
    },
  }), [bottomChromeInset, colors]);
  const dispatch = useAppDispatch();
  const recentFiles = useAppSelector(state => state.session.recentFiles);
  const {width: screenWidth} = useWindowDimensions();

  const isDark = theme === 'dark';
  const heroWidth = screenWidth - 20 * 2;
  const greeting = useMemo(() => getGreeting(), []);

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = React.useState(false);

  // ── Derive data from Redux ──
  const continueItem: SessionEntry | undefined = recentFiles.find(
    f => f.position > 0 && f.duration > 0,
  );
  const realRecentVideos: SessionEntry[] = recentFiles
    .filter(f => (f.mediaType ?? getMediaType(f.fileUri)) === 'video')
    .slice(0, 8);
  const realRecentAudio: SessionEntry[] = recentFiles
    .filter(f => (f.mediaType ?? getMediaType(f.fileUri)) === 'audio')
    .slice(0, 8);

  // ── Build display items; fall back to placeholders when empty ──
  const videoItems: DisplayItem[] =
    realRecentVideos.length > 0
      ? toDisplayItems(realRecentVideos)
      : buildPlaceholderItems('video');
  const audioItems: DisplayItem[] =
    realRecentAudio.length > 0
      ? toDisplayItems(realRecentAudio)
      : buildPlaceholderItems('audio');

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
    } catch {
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
    for (const entry of recentFiles) {
      if (entry.fileUri.startsWith('content://')) continue;
      const exists = await checkFileExists(entry.fileUri);
      if (!exists) {
        dispatch(removeRecentFile(entry.fileUri));
      }
    }
    setRefreshing(false);
  }, [recentFiles, dispatch]);

  // We no longer short-circuit to an EmptyState screen — instead the
  // placeholder lists keep the layout populated. The "Open Media" CTA
  // is the primary action when the user has nothing to play.

  // ── Render helpers ──
  const renderTile = useCallback(
    ({item: dItem}: {item: DisplayItem}) => (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => {
          if (dItem.isPlaceholder) {
            // Placeholder tiles open the file picker when tapped
            handleOpenMedia();
          }
        }}
        style={styles.tile}>
        <View style={styles.thumb}>
          <Image source={dItem.image} style={styles.thumbImg} />
          {dItem.isPlaceholder && (
            <View style={styles.placeholderBadge}>
              <SvgIcon
                name={dItem.key.startsWith('video') ? 'video' : 'music'}
                size={14}
                color="#0A0A0C"
              />
            </View>
          )}
        </View>
        <View style={styles.tileTitleWrap}>
          <AppText
            variant="caption"
            color={dItem.isPlaceholder ? 'tertiary' : 'primary'}
            numberOfLines={2}>
            {dItem.title}
          </AppText>
        </View>
      </TouchableOpacity>
    ),
    [handleOpenMedia, styles],
  );

  return (
    <Animated.View style={{flex: 1, opacity: fadeAnim}}>
      <SafeAreaView style={styles.root} edges={['top']}>
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

          {/* ── Header ── */}
          <View style={styles.header}>
            <SvgIcon name="lion" size={34} color={colors.accent.gold} />
            <TouchableOpacity
              onPress={() => (navigation.navigate as any)('Settings')}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <View style={styles.headerAction}>
                <SvgIcon name="settings" size={18} color={colors.text.secondary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Greeting ── */}
          <AppText variant="h1" color="primary" style={styles.greeting}>
            {greeting}
          </AppText>
          <AppText variant="body1" color="secondary" style={styles.subtitle}>
            Play what moves you.
          </AppText>

          {/* ── OpenMediaCTA ── */}
          <TouchableOpacity activeOpacity={0.85} onPress={handleOpenMedia}>
            <LinearGradient
              colors={[colors.accent.gold, '#B8922E']}
              style={styles.cta}
              start={{x: 0.5, y: 0}}
              end={{x: 0.5, y: 1}}>
              <SvgIcon
                name="folder"
                size={20}
                color="#0A0A0C"
                style={styles.folderIcon}
              />
              <AppText
                variant="body1"
                color={colors.text.secondary}
                style={styles.ctaLabel}>
                Open Media
              </AppText>
            </LinearGradient>
          </TouchableOpacity>

          {/* ── Continue Watching (hero) ── */}
          {continueItem && (
            <View style={styles.sectionGap}>
              <SectionHeader label="Continue Watching" />
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handlePlayRecent(continueItem)}
                style={[
                  styles.continueTile,
                  {
                    width: heroWidth,
                    backgroundColor: colors.background.elevated,
                    borderColor: colors.border.subtle,
                  },
                ]}>
                <View style={styles.continueThumb}>
                  <Image
                    source={thumbnailFor(continueItem)}
                    style={styles.continueThumbImg}
                  />
                </View>
                <AppText
                  variant="body2"
                  color="primary"
                  numberOfLines={1}
                  style={styles.continueTitle}>
                  {continueItem.title}
                </AppText>
                <View
                  style={[
                    styles.continueProgressTrack,
                    {backgroundColor: colors.border.subtle},
                  ]}>
                  <View
                    style={[
                      styles.continueProgressFill,
                      {
                        width: `${
                          continueItem.duration > 0
                            ? Math.round(
                                (continueItem.position / continueItem.duration) * 100,
                              )
                            : 0
                        }%`,
                        backgroundColor: colors.accent.gold,
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>
              <AppText
                variant="caption"
                color="tertiary"
                style={styles.remaining}>
                {formatRemaining(
                  (continueItem.duration ?? 0) - (continueItem.position ?? 0),
                )}
              </AppText>
            </View>
          )}

          {/* ── Recent Videos (horizontal) ── */}
          <View style={styles.sectionGap}>
            <SectionHeader
              label={realRecentVideos.length > 0 ? 'Recent Videos' : 'Featured Videos'}
            />
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalList}
              contentContainerStyle={styles.horizontalListContent}
              data={videoItems}
              keyExtractor={item => item.key}
              renderItem={renderTile}
            />
          </View>

          {/* ── Recent Audio (horizontal) ── */}
          <View style={styles.sectionGap}>
            <SectionHeader
              label={realRecentAudio.length > 0 ? 'Recent Audio' : 'Featured Audio'}
            />
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalList}
              contentContainerStyle={styles.horizontalListContent}
              data={audioItems}
              keyExtractor={item => item.key}
              renderItem={renderTile}
            />
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
};
