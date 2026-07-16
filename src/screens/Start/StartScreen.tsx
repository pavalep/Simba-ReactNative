import React, {useCallback, useEffect} from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useThemeContext} from '../../context/ThemeContext';
import {makeStyles} from '../../utils/makeStyles';
import {AppText} from '../../components/core/AppText/AppText';
import {RootStackScreenProps} from '../../navigation/types';
import {pickMediaFile, checkFileExists} from '../../services/fileService';
import {imagePaths} from '../../constants/imagePaths';
import {useAppDispatch, useAppSelector} from '../../store';
import {removeRecentFile, SessionEntry} from '../../store/slices/sessionSlice';

type Props = RootStackScreenProps<'MainTabs'>;

const PHONE_PADDING = 20;
const GRID_GAP = 14;
const TILE_SIZE = 74;

// ── Gold accent palette (matches HTML mockup exactly) ──
const GOLD = '#e4a741';
const GOLD_LIGHT = '#f2c56a';

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

// ── Status Bar Icons (SVG-like views) ──────────────
function SignalBars({color, opacity}: {color: string; opacity: number}) {
  return (
    <View style={sb.row}>
      {[
        {h: 4, o: 0.65},
        {h: 6, o: 0.65},
        {h: 8, o: 0.65},
        {h: 10, o: 0.5},
      ].map((bar, i) => (
        <View
          key={i}
          style={[
            sb.bar,
            {
              height: bar.h,
              backgroundColor: color,
              opacity: bar.o * opacity,
              marginLeft: i > 0 ? 1.5 : 0,
            },
          ]}
        />
      ))}
    </View>
  );
}

function WifiIcon({color, opacity}: {color: string; opacity: number}) {
  return (
    <View style={sb.wifiRow}>
      {[0.5, 0.35].map((o, i) => (
        <View
          key={i}
          style={[
            sb.wifiArc,
            {
              width: 12 - i * 4,
              height: 6 - i * 2,
              borderRadius: 6 - i * 2,
              borderColor: color,
              opacity: o * opacity,
              borderWidth: 0.9,
            },
          ]}
        />
      ))}
      <View
        style={[
          sb.wifiDot,
          {backgroundColor: color, opacity: 0.6 * opacity},
        ]}
      />
    </View>
  );
}

function BatteryIcon({color, opacity}: {color: string; opacity: number}) {
  const borderAlpha = color === '#FFFFFF' ? 0.45 : 0.35;
  const borderColor =
    color === '#FFFFFF'
      ? `rgba(255,255,255,${borderAlpha})`
      : `rgba(17,17,17,${borderAlpha})`;
  return (
    <View style={sb.battRow}>
      <View style={[sb.battBody, {borderColor}]}>
        <View
          style={[
            sb.battFill,
            {backgroundColor: color, opacity: 0.65 * opacity},
          ]}
        />
      </View>
      <View
        style={[
          sb.battCap,
          {backgroundColor: color, opacity: 0.3 * opacity},
        ]}
      />
    </View>
  );
}

const sb = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'flex-end'},
  bar: {width: 2.2, borderRadius: 0.8},
  wifiRow: {alignItems: 'center', justifyContent: 'center'},
  wifiArc: {
    borderTopWidth: 0,
    borderLeftWidth: 0.9,
    borderRightWidth: 0.9,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
  },
  wifiDot: {width: 2, height: 2, borderRadius: 1, marginTop: -1.5},
  battRow: {flexDirection: 'row', alignItems: 'center'},
  battBody: {
    width: 16,
    height: 10,
    borderRadius: 2,
    borderWidth: 0.9,
    justifyContent: 'center',
    padding: 1.2,
  },
  battFill: {flex: 1, borderRadius: 1.2},
  battCap: {width: 1.4, height: 4.8, borderRadius: 0.7, marginLeft: 0.5},
});

// ── Main Component ─────────────────────────────────
export const StartScreen: React.FC<Props> = ({navigation}) => {
  const {theme} = useThemeContext();
  const styles = useStyles();
  const dispatch = useAppDispatch();
  const recentFiles = useAppSelector(state => state.session.recentFiles);

  const isDark = theme === 'dark';

  // Status icon tint
  const statusColor = isDark ? '#FFFFFF' : '#111111';
  const statusOpacity = isDark ? 0.75 : 0.65;
  const ctaTextColor = '#111111';

  // ── Derive data from Redux ──
  const continueItem: SessionEntry | undefined = recentFiles.find(
    f => f.position > 0 && f.duration > 0,
  );
  const recentItems = recentFiles.slice(0, 4);

  // ── Validate files on mount — remove broken links ──
  // Skip content:// URIs — those are temporary file-picker grants that
  // may not be accessible after navigation, but are still openable by MPV.
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
      // Skip existence check for content:// URIs — they may not be
      // accessible via RNFS.stat but MPV can still open them.
      if (!entry.fileUri.startsWith('content://')) {
        const exists = await checkFileExists(entry.fileUri);
        if (!exists) {
          dispatch(removeRecentFile(entry.fileUri));
          Alert.alert('File Not Found', 'This file has been moved or deleted.');
          return;
        }
      }
      navigation.navigate('Player', {
        fileUri: entry.fileUri,
        fileTitle: entry.title,
      });
    },
    [dispatch, navigation],
  );

  const hasRecent = recentItems.length > 0;
  const hasContinue = !!continueItem;

  return (
    <View style={styles.root}>
      <StatusBar hidden={false} barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ══ BACKGROUND ══ */}
      <LinearGradient
        colors={
          isDark ? ['#0a0d10', '#0b0f13'] : ['#f7f7f7', '#ffffff']
        }
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.glowWarm,
          {backgroundColor: GOLD, opacity: isDark ? 0.22 : 0.15},
        ]}
        pointerEvents="none"
      />
      <View
        style={[
          styles.glowCool,
          {
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(255,255,255,0.5)',
            opacity: isDark ? 1 : 0.6,
          },
        ]}
        pointerEvents="none"
      />
      <View
        style={[
          styles.vignette,
          {
            backgroundColor: isDark
              ? 'rgba(0,0,0,0.35)'
              : 'rgba(0,0,0,0.06)',
          },
        ]}
        pointerEvents="none"
      />

      {/* ══ MAIN CONTENT ══ */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* ── Status Bar ── */}
        <View style={styles.statusBar}>
          <AppText
            variant="time"
            color={isDark ? '#FFFFFF' : '#111111'}
            style={styles.statusTime}>
            9:41
          </AppText>
          <View style={styles.statusIcons}>
            <SignalBars color={statusColor} opacity={statusOpacity} />
            <View style={{width: 8}} />
            <WifiIcon color={statusColor} opacity={statusOpacity} />
            <View style={{width: 8}} />
            <BatteryIcon color={statusColor} opacity={statusOpacity} />
          </View>
        </View>

        {/* ── Top Bar ── */}
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <Image source={imagePaths.uiLionGold} style={styles.lion} />
            <View style={styles.brandName}>
              <AppText
                variant="body2"
                color={GOLD}
                style={styles.wordmark}>
                SIMBA
              </AppText>
              <View
                style={[
                  styles.brandDivider,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.06)'
                      : 'rgba(0,0,0,0.06)',
                  },
                ]}
              />
              <AppText
                variant="body2"
                color={
                  isDark
                    ? 'rgba(255,255,255,0.72)'
                    : 'rgba(16,18,20,0.72)'
                }
                style={styles.tag}>
                Play anything.
              </AppText>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Preferences')}>
            <Image source={imagePaths.uiBellGray} style={styles.bell} />
          </TouchableOpacity>
        </View>

        {/* ── Title & Subtitle ── */}
        <AppText
          variant="h2"
          color={isDark ? '#FFFFFF' : '#101214'}
          style={styles.title}>
          Good evening
        </AppText>
        <AppText
          variant="body1"
          color={
            isDark ? 'rgba(255,255,255,0.72)' : 'rgba(16,18,20,0.72)'
          }
          style={styles.subtitle}>
          Play what moves you.
        </AppText>

        {/* ── CTA Button ── */}
        <TouchableOpacity activeOpacity={0.85} onPress={handleOpenMedia}>
          <LinearGradient
            colors={[GOLD_LIGHT, GOLD]}
            style={styles.cta}
            start={{x: 0.5, y: 0}}
            end={{x: 0.5, y: 1}}>
            <Image
              source={imagePaths.uiFolderBlack}
              style={[styles.folderIcon, {tintColor: ctaTextColor}]}
            />
            <AppText
              variant="body1"
              color={ctaTextColor}
              style={styles.ctaLabel}>
              Open Media
            </AppText>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Continue Watching ── */}
        {hasContinue && (
          <>
            <View style={styles.sectionRow}>
              <AppText
                variant="body2"
                color={isDark ? '#FFFFFF' : '#101214'}
                style={styles.sectionTitle}>
                Continue Watching
              </AppText>
            </View>

            <View
              style={[
                styles.continueCard,
                {
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(255,255,255,0.75)',
                  borderColor: isDark
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,0,0,0.05)',
                  shadowColor: isDark
                    ? 'rgba(0,0,0,0.6)'
                    : 'rgba(0,0,0,0.12)',
                },
              ]}>
              <View style={styles.poster}>
                <Image
                  source={imagePaths.uiLionGold}
                  style={styles.posterPlaceholder}
                />
              </View>

              <View style={styles.cwMid}>
                <AppText
                  variant="body1"
                  color={isDark ? '#FFFFFF' : '#101214'}
                  style={styles.cwTitle}
                  numberOfLines={1}>
                  {continueItem!.title}
                </AppText>
                <AppText
                  variant="caption"
                  color={
                    isDark
                      ? 'rgba(255,255,255,0.46)'
                      : 'rgba(16,18,20,0.48)'
                  }
                  style={styles.cwSub}>
                  {formatRemaining(
                    continueItem!.duration - continueItem!.position,
                  )}
                </AppText>
                <View
                  style={[
                    styles.progressTrack,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.22)'
                        : 'rgba(0,0,0,0.12)',
                    },
                  ]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(
                          (continueItem!.position / continueItem!.duration) * 100,
                          100,
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.playBtn,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.10)'
                      : 'rgba(0,0,0,0.06)',
                  },
                ]}
                onPress={() => handlePlayRecent(continueItem!)}
                aria-label="Play">
                <View
                  style={[
                    styles.playIcon,
                    {
                      borderLeftColor: isDark
                        ? 'rgba(255,255,255,0.9)'
                        : 'rgba(0,0,0,0.8)',
                    },
                  ]}
                />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Recent ── */}
        {hasRecent && (
          <>
            <View style={styles.sectionRow}>
              <AppText
                variant="body2"
                color={isDark ? '#FFFFFF' : '#101214'}
                style={styles.sectionTitle}>
                Recent
              </AppText>
            </View>

            <View style={styles.recentGrid}>
              {recentItems.map(entry => (
                <TouchableOpacity
                  key={entry.fileUri}
                  style={styles.tile}
                  activeOpacity={0.8}
                  onPress={() => handlePlayRecent(entry)}>
                  <View
                    style={[
                      styles.thumb,
                      {
                        shadowColor: isDark
                          ? 'rgba(0,0,0,0.6)'
                          : 'rgba(0,0,0,0.10)',
                      },
                    ]}>
                    <Image
                      source={imagePaths.uiMusicGray}
                      style={styles.thumbPlaceholder}
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.35)']}
                      style={styles.thumbOverlay}
                      start={{x: 0.5, y: 0}}
                      end={{x: 0.5, y: 1}}
                    />
                    <View style={styles.miniPlay}>
                      <View
                        style={[
                          styles.miniPlayIcon,
                          {borderLeftColor: 'rgba(255,255,255,0.9)'},
                        ]}
                      />
                    </View>
                  </View>
                  <AppText
                    variant="caption"
                    color={isDark ? '#FFFFFF' : '#101214'}
                    style={styles.tileTitle}
                    numberOfLines={1}>
                    {entry.title}
                  </AppText>
                  <AppText
                    variant="small"
                    color={
                      isDark
                        ? 'rgba(255,255,255,0.46)'
                        : 'rgba(16,18,20,0.48)'
                    }
                    style={styles.tileMeta}
                    numberOfLines={1}>
                    {formatDurationShort(entry.duration)}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* ══ TAB BAR ══ */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: isDark
              ? 'rgba(10,12,14,0.92)'
              : 'rgba(255,255,255,0.92)',
            borderColor: isDark
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(0,0,0,0.05)',
            shadowColor: isDark
              ? 'rgba(0,0,0,0.6)'
              : 'rgba(0,0,0,0.16)',
          },
        ]}>
        <TouchableOpacity style={styles.tab}>
          <Image source={imagePaths.uiHomeGold} style={styles.tabIcon} />
          <AppText variant="small" color={GOLD} style={styles.tabLabel}>
            Home
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Image source={imagePaths.uiMusicGray} style={styles.tabIcon} />
          <AppText
            variant="small"
            color={'#8b8b8b'}
            style={styles.tabLabel}>
            Music
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Image source={imagePaths.uiVideosGray} style={styles.tabIcon} />
          <AppText
            variant="small"
            color={'#8b8b8b'}
            style={styles.tabLabel}>
            Videos
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => navigation.navigate('Preferences')}>
          <Image
            source={imagePaths.uiSettingsGray}
            style={styles.tabIcon}
          />
          <AppText
            variant="small"
            color={'#8b8b8b'}
            style={styles.tabLabel}>
            Settings
          </AppText>
        </TouchableOpacity>
      </View>

      {/* ══ HOME INDICATOR ══ */}
      <View
        style={[
          styles.homeIndicator,
          {
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.65)'
              : 'rgba(0,0,0,0.20)',
          },
        ]}
      />
    </View>
  );
};

// ── Styles ──
const useStyles = makeStyles(() =>
  StyleSheet.create({
    root: {flex: 1},

    // Background glows
    glowWarm: {
      position: 'absolute',
      top: 0,
      left: '-20%',
      width: '140%',
      height: '42%',
      borderRadius: 500,
      transform: [{scaleX: 0.7}],
      opacity: 0.22,
    },
    glowCool: {
      position: 'absolute',
      top: 0,
      right: '-10%',
      width: '60%',
      height: '40%',
      borderRadius: 300,
      transform: [{scaleX: 0.6}],
    },
    vignette: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '50%',
    },

    // Scroll
    scroll: {flex: 1},
    scrollContent: {
      paddingHorizontal: PHONE_PADDING,
      paddingBottom: 160,
    },

    // Status Bar
    statusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
      paddingTop: Platform.OS === 'ios' ? 8 : 4,
    },
    statusTime: {fontSize: 15, fontWeight: '600'},
    statusIcons: {flexDirection: 'row', alignItems: 'center', opacity: 0.9},

    // Top Bar
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
      marginBottom: 4,
    },
    brand: {flexDirection: 'row', alignItems: 'center', gap: 10},
    lion: {width: 20, height: 20, resizeMode: 'contain'},
    brandName: {flexDirection: 'row', alignItems: 'center', gap: 10},
    wordmark: {fontWeight: '700', letterSpacing: 3.4, fontSize: 14},
    brandDivider: {width: 1, height: 16},
    tag: {fontSize: 13, letterSpacing: 0.2},
    bell: {width: 22, height: 22, opacity: 0.9, resizeMode: 'contain'},

    // Title / Subtitle
    title: {marginTop: 26, marginBottom: 6, fontSize: 28, fontWeight: '700'},
    subtitle: {marginBottom: 18, fontSize: 14},

    // CTA
    cta: {
      height: 54,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 6},
      shadowOpacity: 0.14,
      shadowRadius: 12,
      elevation: 6,
    },
    folderIcon: {width: 20, height: 20, resizeMode: 'contain'},
    ctaLabel: {fontSize: 14, fontWeight: '600'},

    // Section Row
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 18,
      marginBottom: 10,
      marginHorizontal: 2,
    },
    sectionTitle: {fontSize: 14, fontWeight: '600'},

    // Continue Watching Card
    continueCard: {
      borderRadius: 14,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      shadowOffset: {width: 0, height: 18},
      shadowOpacity: 1,
      shadowRadius: 40,
      elevation: 10,
      borderWidth: 1,
    },
    poster: {
      width: TILE_SIZE,
      height: TILE_SIZE,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: '#222',
      alignItems: 'center',
      justifyContent: 'center',
    },
    posterImg: {width: '100%', height: '100%', resizeMode: 'cover'},
    posterPlaceholder: {width: 28, height: 28, opacity: 0.5, resizeMode: 'contain'},
    cwMid: {flex: 1, minWidth: 0},
    cwTitle: {fontWeight: '700', marginBottom: 6},
    cwSub: {fontSize: 12, marginBottom: 10},
    progressTrack: {height: 3, borderRadius: 2, overflow: 'hidden'},
    progressFill: {height: '100%', backgroundColor: GOLD, borderRadius: 2},
    playBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playIcon: {
      width: 0,
      height: 0,
      borderTopWidth: 7,
      borderBottomWidth: 7,
      borderLeftWidth: 12,
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
      marginLeft: 2,
    },

    // Recent Grid
    recentGrid: {flexDirection: 'row', gap: GRID_GAP},
    tile: {width: TILE_SIZE},
    thumb: {
      width: TILE_SIZE,
      height: TILE_SIZE,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: '#222',
      shadowOffset: {width: 0, height: 14},
      shadowOpacity: 1,
      shadowRadius: 30,
      elevation: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbImg: {width: '100%', height: '100%', resizeMode: 'cover'},
    thumbPlaceholder: {width: 24, height: 24, opacity: 0.5, resizeMode: 'contain'},
    thumbOverlay: {...StyleSheet.absoluteFill},
    miniPlay: {
      position: 'absolute',
      right: 8,
      bottom: 8,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    miniPlayIcon: {
      width: 0,
      height: 0,
      borderTopWidth: 4,
      borderBottomWidth: 4,
      borderLeftWidth: 7,
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
      borderLeftColor: 'rgba(255,255,255,0.9)',
      marginLeft: 1.5,
    },
    tileTitle: {
      marginTop: 8,
      marginBottom: 3,
      fontWeight: '700',
      fontSize: 11,
    },
    tileMeta: {fontSize: 10},

    // Tab Bar
    tabBar: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 18,
      height: 86,
      borderRadius: 22,
      borderWidth: 1,
      shadowOffset: {width: 0, height: 22},
      shadowOpacity: 1,
      shadowRadius: 40,
      elevation: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingTop: 14,
      paddingHorizontal: 20,
      paddingBottom: 10,
    },
    tab: {width: 72, alignItems: 'center', gap: 6},
    tabIcon: {width: 22, height: 22, resizeMode: 'contain'},
    tabLabel: {fontSize: 10, fontWeight: '600'},

    // Home Indicator
    homeIndicator: {
      position: 'absolute',
      bottom: 6,
      alignSelf: 'center',
      width: 120,
      height: 4,
      borderRadius: 2,
    },
  }),
);
