import React, {useCallback} from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import {useColors} from '../../context/ThemeContext';
import {makeStyles} from '../../utils/makeStyles';
import {AppText} from '../../components/core/AppText/AppText';
import {RootStackScreenProps} from '../../navigation/types';
import {spacing} from '../../constants/spacing';
import {radius} from '../../constants/radius';
import {pickMediaFile} from '../../services/fileService';
import {useAppSelector} from '../../store';
import {SessionEntry} from '../../store/slices/sessionSlice';
import {timeAgo, formatDuration, isVideoFile, getDisplayExt} from '../../utils/timeAgo';

type Props = RootStackScreenProps<'MainTabs'>;

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CARD_WIDTH = 160;
const THUMB_WIDTH = 136;
const THUMB_HEIGHT = 85;
const SNAP_INTERVAL = CARD_WIDTH + 10;

export const StartScreen: React.FC<Props> = ({navigation}) => {
  const colors = useColors();
  const styles = useStyles();
  const recentFiles = useAppSelector(state => state.session.recentFiles);

  const handleOpenMedia = useCallback(async () => {
    try {
      const file = await pickMediaFile();
      if (!file) return; // user cancelled
      navigation.navigate('Player', {
        fileUri: file.uri,
        fileTitle: file.title,
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to open file picker.');
    }
  }, [navigation]);

  const handleOpenFolder = useCallback(async () => {
    try {
      const file = await pickMediaFile();
      if (!file) return;
      navigation.navigate('Player', {
        fileUri: file.uri,
        fileTitle: file.title,
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to open file picker.');
    }
  }, [navigation]);

  return (
    <View style={styles.root}>
      {/* ══ BACKGROUND LAYERS ══ */}
      <View style={styles.bgBase} />
      <View style={styles.bgWarmGlow} />
      <View style={styles.bgCoolGlow} />
      <View style={styles.vignette} />
      <View style={styles.topSheen} />
      <View style={styles.glowOrb} />

      {/* ══ MAIN CONTENT ══ */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brand Section ── */}
        <View style={styles.brandSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <AppText style={styles.logoEmoji}>🦁</AppText>
            </View>
          </View>
          <AppText variant="display" color={colors.osdForeground} style={styles.wordmark}>
            SIMBA
          </AppText>
          <AppText variant="body2" color={colors.textHint}>
            Play anything.
          </AppText>
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.btnPrimary]}
            activeOpacity={0.8}
            onPress={handleOpenMedia}
          >
            <View style={styles.btnContent}>
              <AppText style={styles.btnIconPrimary}>▶</AppText>
              <AppText style={styles.btnLabelPrimary}>Open Media</AppText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.btnSecondary]}
            activeOpacity={0.8}
            onPress={handleOpenFolder}
          >
            <View style={styles.btnContent}>
              <AppText style={styles.btnIconSecondary}>📂</AppText>
              <AppText style={styles.btnLabelSecondary}>Open Folder</AppText>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Recent Section ── */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <AppText variant="overline" color={colors.sectionHeader}>
              RECENT
            </AppText>
            <View style={styles.recentCount}>
              <AppText variant="small" color={colors.textHint}>
                {recentFiles.length}
              </AppText>
            </View>
          </View>

          {recentFiles.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardTrack}
              snapToInterval={SNAP_INTERVAL}
              decelerationRate="fast"
            >
              {recentFiles.map((item) => (
                <RecentCard key={item.fileUri} item={item} navigation={navigation} />
              ))}
            </ScrollView>
          ) : (
            <AppText variant="body2" color={colors.textHint} style={styles.emptyRecent}>
              No recent files. Open a media file to get started.
            </AppText>
          )}
        </View>
      </ScrollView>

      {/* ══ KEYBOARD HINT ══ */}
      <View style={styles.kbdHint}>
        <View style={styles.kbdKey}>
          <AppText variant="small" color={colors.textSecondary} style={styles.kbdKeyText}>
            Ctrl
          </AppText>
        </View>
        <AppText variant="small" color={colors.textSecondary}>+</AppText>
        <View style={styles.kbdKey}>
          <AppText variant="small" color={colors.textSecondary} style={styles.kbdKeyText}>
            O
          </AppText>
        </View>
        <AppText variant="small" color={colors.textHint}>to open</AppText>
      </View>
    </View>
  );
};

// ── Recent Card ────────────────────────────────────
function RecentCard({
  item,
  navigation,
}: {
  item: SessionEntry;
  navigation: Props['navigation'];
}) {
  const colors = useColors();
  const styles = useStyles();

  const fileName = item.title;
  const video = isVideoFile(fileName);
  const ext = getDisplayExt(fileName);
  const lastOpenedLabel = timeAgo(item.lastPlayedAt);
  const durLabel = formatDuration(item.duration);
  const canResume = item.position > 0;

  return (
    <TouchableOpacity
      style={styles.recentCard}
      activeOpacity={0.85}
      onPress={() =>
        navigation.navigate('Player', {
          fileUri: item.fileUri,
          fileTitle: item.title,
        })
      }
    >
      {/* Thumbnail */}
      <View style={styles.thumbContainer}>
        <View style={styles.thumbFallback} />
        <View style={styles.thumbDim} />
        <View style={styles.thumbIconWrap}>
          <AppText style={styles.thumbIcon}>
            {video ? '▶' : '♫'}
          </AppText>
        </View>
        <View style={styles.badgeTimestamp}>
          <AppText variant="small" color={colors.badgeText}>
            {lastOpenedLabel}
          </AppText>
        </View>
        {canResume && (
          <View style={styles.continueBadge}>
            <AppText style={styles.continueIcon}>▶</AppText>
            <AppText variant="small" color="#FFF" style={styles.continueLabel}>
              Continue
            </AppText>
          </View>
        )}
      </View>

      <AppText
        variant="small"
        color={colors.osdForeground}
        style={styles.cardTitle}
        numberOfLines={1}
      >
        {item.title}
      </AppText>

      {/* Meta row */}
      <View style={styles.cardMeta}>
        <View style={[styles.metaChip, video ? styles.metaChipDefault : styles.metaChipAudio]}>
          <AppText variant="small" color={colors.textHint} style={{fontSize: 8.5}}>
            {video ? 'Video' : 'Audio'}
          </AppText>
        </View>
        {ext && (
          <View style={[styles.metaChipExt, video ? styles.metaChipBronze : styles.metaChipTeal]}>
            <AppText variant="small" color={colors.textHint} style={{fontSize: 8.5}}>
              {ext}
            </AppText>
          </View>
        )}
        {durLabel && (
          <View style={styles.metaChipDuration}>
            <AppText variant="small" color={colors.textHint} style={{fontSize: 8.5}}>
              {durLabel}
            </AppText>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────
const useStyles = makeStyles((colors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
    },

    // ── Background layers ──
    bgBase: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.bgPrimary,
    },
    bgWarmGlow: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.warmGlow,
      opacity: 0.5,
    },
    bgCoolGlow: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.coolGlow,
      opacity: 0.3,
    },
    vignette: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    topSheen: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 80,
      backgroundColor: 'rgba(255,255,255,0.04)',
    },
    glowOrb: {
      position: 'absolute',
      top: -40,
      right: -60,
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: 'rgba(201,169,110,0.08)',
    },

    // ── Scroll content ──
    scroll: {flex: 1},
    scrollContent: {
      paddingHorizontal: 24,
      paddingBottom: 80,
    },

    // ── Brand ──
    brandSection: {
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 20,
    },
    logoContainer: {
      marginBottom: 8,
    },
    logoCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.glassBg,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoEmoji: {
      fontSize: 32,
    },
    wordmark: {
      marginBottom: 4,
    },

    // ── Buttons ──
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 10,
      marginBottom: 20,
    },
    actionBtn: {
      flex: 1,
      maxWidth: 180,
      height: 42,
      borderRadius: radius.md,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 0.5,
    },
    btnPrimary: {
      backgroundColor: colors.glassBg,
      borderColor: colors.accentBorder,
    },
    btnSecondary: {
      backgroundColor: 'transparent',
      borderColor: colors.glassBorder,
    },
    btnContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    btnIconPrimary: {
      fontSize: 14,
      color: colors.accentLight,
    },
    btnLabelPrimary: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.osdForeground,
    },
    btnIconSecondary: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    btnLabelSecondary: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },

    // ── Recent Section ──
    recentSection: {
      marginTop: 8,
    },
    recentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 12,
      paddingHorizontal: 2,
    },
    recentCount: {
      paddingHorizontal: 10,
      paddingVertical: 2,
      borderRadius: radius.round,
      backgroundColor: colors.hoverSubtle,
      borderWidth: 0.5,
      borderColor: colors.glassBorder,
    },
    emptyRecent: {
      textAlign: 'center',
      paddingVertical: 24,
      opacity: 0.6,
    },

    // ── Cards ──
    cardTrack: {
      gap: 10,
      paddingBottom: 8,
    },
    recentCard: {
      width: CARD_WIDTH,
      padding: 10,
      borderRadius: radius.lg,
      backgroundColor: colors.cardGlassBg,
      borderWidth: 0.5,
      borderColor: colors.cardGlassBorder,
    },
    thumbContainer: {
      width: THUMB_WIDTH,
      height: THUMB_HEIGHT,
      borderRadius: radius.md,
      overflow: 'hidden',
      marginBottom: 8,
      position: 'relative',
    },
    thumbFallback: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'transparent',
    },
    thumbDim: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.04)',
    },
    thumbIconWrap: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbIcon: {
      fontSize: 18,
      color: 'rgba(255,255,255,0.65)',
    },
    badgeTimestamp: {
      position: 'absolute',
      bottom: 4,
      left: 4,
      paddingHorizontal: 4,
      paddingVertical: 1.5,
      borderRadius: 3,
      backgroundColor: colors.badgeBg,
    },
    continueBadge: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: [{translateX: -30}, {translateY: -12}],
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: 'rgba(20,20,22,0.80)',
    },
    continueIcon: {
      fontSize: 10,
      color: '#FFF',
    },
    continueLabel: {
      fontWeight: '600',
    },
    cardTitle: {
      fontWeight: '600',
      marginBottom: 4,
    },
    cardMeta: {
      flexDirection: 'row',
      gap: 4,
      flexWrap: 'wrap',
    },

    // ── Meta chips ──
    metaChip: {
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 3,
    },
    metaChipDefault: {
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    metaChipAudio: {
      backgroundColor: 'rgba(110,201,169,0.10)',
    },
    metaChipExt: {
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 3,
    },
    metaChipBronze: {
      backgroundColor: 'rgba(201,169,110,0.10)',
    },
    metaChipTeal: {
      backgroundColor: 'rgba(110,201,169,0.10)',
    },
    metaChipDuration: {
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 3,
      backgroundColor: 'rgba(16,16,18,0.08)',
    },

    // ── Keyboard Hint ──
    kbdHint: {
      position: 'absolute',
      bottom: 24,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radius.round,
      backgroundColor: colors.hoverSubtle,
      borderWidth: 0.5,
      borderColor: colors.glassBorder,
    },
    kbdKey: {
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    kbdKeyText: {
      fontWeight: '600',
    },
  }),
);
