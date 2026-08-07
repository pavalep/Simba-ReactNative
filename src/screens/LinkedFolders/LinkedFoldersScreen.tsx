import React, {useMemo, useCallback, useRef, useState} from 'react';
import {
  View,
  ScrollView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../../theme';
import {spacing, radius} from '../../theme/tokens';
import {useAppDispatch, useAppSelector} from '../../store';
import {
  removeVideoFolder,
  removeAudioFolder,
  setScanning,
  setLastScanTimestamp,
} from '../../store/slices/settingsSlice';
import {selectAllTracks, selectTrackCount} from '../../store/slices/mediaSlice';
import {AppText} from '../../components/core/AppText/AppText';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {ScanProgressBanner} from '../../components/feedback/ScanProgressBanner/ScanProgressBanner';
import {InternalHeader} from '../../components/layout/InternalHeader/InternalHeader';
import {Placeholder} from '../../components/feedback/Placeholder';
import {useAccessibility} from '../../hooks/useAccessibility';
import type {LinkedFoldersScreenProps} from '../../navigation/types';

// ─── Constants ──────────────────────────────────────────────

const SWIPE_THRESHOLD = -80;
const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Helpers ────────────────────────────────────────────────

function formatLastScan(timestamp: number | null): string {
  if (timestamp === null) return 'Never scanned';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getFolderName(folderPath: string): string {
  return folderPath.split('/').filter(Boolean).pop() || folderPath;
}

// ─── SwipeableFolderCard ────────────────────────────────────

interface SwipeableFolderCardProps {
  folderPath: string;
  fileCount: number;
  lastScanTimestamp: number | null;
  onRemove: (folder: string) => void;
  onRescan: (folder: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

const SwipeableFolderCard: React.FC<SwipeableFolderCardProps> = ({
  folderPath,
  fileCount,
  lastScanTimestamp,
  onRemove,
  onRescan,
  colors,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const [isOpen, setIsOpen] = useState(false);
  const {reduceMotion} = useAccessibility();
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;

  // 59.7: reduced motion — snap with a short timing, no spring bounce
  const snapTo = useCallback(
    (toValue: number, open: boolean) => {
      if (reduceMotionRef.current) {
        Animated.timing(translateX, {
          toValue,
          duration: 150,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.spring(translateX, {
          toValue,
          useNativeDriver: true,
          bounciness: 4,
        }).start();
      }
      setIsOpen(open);
    },
    [translateX],
  );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        // Clamp: allow negative (swipe left) only, max 0
        translateX.setValue(Math.min(0, gesture.dx));
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < SWIPE_THRESHOLD) {
          // Snap open to reveal delete
          snapTo(-80, true);
        } else {
          // Snap back
          snapTo(0, false);
        }
      },
    }),
  ).current;

  const handleDelete = useCallback(() => {
    // Animate out and then remove
    Animated.timing(translateX, {
      toValue: -SCREEN_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onRemove(folderPath);
    });
  }, [folderPath, onRemove, translateX]);

  const folderName = getFolderName(folderPath);

  return (
    <View style={swipeStyles.wrapper}>
      {/* Delete button behind the card */}
      <TouchableOpacity
        style={[swipeStyles.deleteBackground, {backgroundColor: colors.semantic.error}]}
        onPress={handleDelete}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Remove folder ${folderName}`}>
        <SvgIcon name="close" size={22} color={colors.text.bright} />
        <AppText variant="caption" style={[swipeStyles.deleteText, {color: colors.text.bright}]}>
          Remove
        </AppText>
      </TouchableOpacity>

      {/* Foreground card */}
      <Animated.View
        style={[swipeStyles.card, {transform: [{translateX}]}]}
        {...panResponder.panHandlers}>
        <View style={swipeStyles.cardContent}>
          {/* Left: icon + info */}
          <View style={swipeStyles.leftSection}>
            <View style={[swipeStyles.iconWrap, {backgroundColor: colors.accent.goldDim}]}>
              <SvgIcon name="folder" size={20} color={colors.accent.gold} />
            </View>
            <View style={swipeStyles.infoBlock}>
              <AppText variant="body2" color="primary" numberOfLines={1}>
                {folderName}
              </AppText>
              <AppText variant="caption" color="tertiary" numberOfLines={1}>
                {fileCount} file{fileCount !== 1 ? 's' : ''} · {formatLastScan(lastScanTimestamp)}
              </AppText>
            </View>
          </View>

          {/* Right: re-scan button */}
          <TouchableOpacity
            style={swipeStyles.rescanButton}
            onPress={() => onRescan(folderPath)}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Rescan folder ${folderName}`}>
            <SvgIcon name="repeat" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Subtle bottom border */}
        <View style={[swipeStyles.bottomBorder, {backgroundColor: colors.border.subtle}]} />
      </Animated.View>

      {/* Tap anywhere to close the swipe if open */}
      {isOpen && (
        <TouchableOpacity
          style={swipeStyles.dismissOverlay}
          activeOpacity={1}
          onPress={() => {
            snapTo(0, false);
          }}
          accessibilityRole="button"
          accessibilityLabel="Close folder actions"
        />
      )}
    </View>
  );
};

const swipeStyles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  deleteText: {
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'transparent',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'transparent',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBlock: {
    flex: 1,
    gap: 2,
  },
  rescanButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  bottomBorder: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + 40 + spacing.md, // indent under the text, not the icon
  },
  dismissOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
  },
});

// ─── Main Screen ────────────────────────────────────────────

type Props = LinkedFoldersScreenProps;

export const LinkedFoldersScreen: React.FC<Props> = ({route}) => {
  const {type} = route.params;
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const nav = useNavigation<any>();
  const isVideo = type === 'video';

  const folders = useAppSelector(s =>
    isVideo ? s.settings.videoFolders : s.settings.audioFolders,
  );
  const isScanning = useAppSelector(s => s.settings.isScanning);
  const lastScanTimestamp = useAppSelector(s => s.settings.lastScanTimestamp);
  const allTracks = useAppSelector(selectAllTracks);
  const totalTrackCount = useAppSelector(selectTrackCount);

  // Edge case states
  const [error, setError] = useState<string | null>(null);

  // File count per folder: filter tracks whose URI starts with the folder path
  const folderFileCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const folder of folders) {
      counts[folder] = allTracks.filter(t => t.uri.startsWith(folder)).length;
    }
    return counts;
  }, [folders, allTracks]);

  const handleRemoveFolder = useCallback(
    (folder: string) => {
      if (isVideo) {
        dispatch(removeVideoFolder(folder));
      } else {
        dispatch(removeAudioFolder(folder));
      }
    },
    [dispatch, isVideo],
  );

  const handleRescanFolder = useCallback(
    (_folder: string) => {
      dispatch(setScanning(true));
      // Simulate scan — in real implementation, this would call the scanner for one folder
      setTimeout(() => {
        dispatch(setScanning(false));
        dispatch(setLastScanTimestamp(Date.now()));
      }, 2000);
    },
    [dispatch],
  );

  const handleScanAll = useCallback(() => {
    dispatch(setScanning(true));
    // Simulate full scan
    setTimeout(() => {
      dispatch(setScanning(false));
      dispatch(setLastScanTimestamp(Date.now()));
    }, 3000);
  }, [dispatch]);

  const handleAddFolder = useCallback(() => {
    nav.navigate('FolderLinkingWizard', {type});
  }, [nav, type]);

  const handleRetry = useCallback(() => {
    setError(null);
  }, []);

  // ── Styles (memoized) ──
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.background.primary,
        },
        absoluteFill: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        },
        scrollContent: {
          paddingTop: spacing.lg,
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxxl + 60, // room for sticky button
        },
        centerContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.lg,
        },
        retryButton: {
          marginTop: spacing.md,
          paddingVertical: 10,
          paddingHorizontal: 24,
          borderRadius: 10,
          backgroundColor: colors.accent.goldDim,
        },
        // ── Empty state (replaced by the shared <Placeholder> component.) ──
        // ── Folder cards container ──
        cardList: {
          backgroundColor: colors.background.elevated,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border.subtle,
          overflow: 'hidden',
          marginBottom: spacing.lg,
        },
        // ── Sticky "Add Folder" button ──
        addButtonContainer: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.lg,
          backgroundColor: colors.background.primary,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border.subtle,
        },
        addButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing.md + 2,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.accent.gold,
          backgroundColor: colors.accent.goldDim,
          gap: spacing.sm,
        },
        addButtonDisabled: {
          opacity: 0.5,
        },
      }),
    [colors, insets],
  );

  // ── Error state ──
  if (error) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <LinearGradient colors={[colors.background.primary, colors.background.elevated]} style={styles.absoluteFill} />
        <InternalHeader title={isVideo ? 'Video Folders' : 'Audio Folders'} />
        <View style={styles.centerContainer}>
          <SvgIcon name="alertCircle" size={40} color={colors.semantic.error} style={{marginBottom: spacing.sm}} />
          <AppText variant="body1" color="error" style={{textAlign: 'center', marginBottom: spacing.sm}}>
            {error}
          </AppText>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.7} accessibilityRole="button">
            <AppText variant="button" color="accent">
              Retry
            </AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <LinearGradient colors={[colors.background.primary, colors.background.elevated]} style={styles.absoluteFill} />

      <InternalHeader
        title={isVideo ? 'Video Folders' : 'Audio Folders'}
        rightAction={{
          label: 'Scan All',
          onPress: handleScanAll,
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!error}>
        {/* Global scan status */}
        <ScanProgressBanner
          isScanning={isScanning}
          lastScanTimestamp={lastScanTimestamp}
          trackCount={totalTrackCount}
        />

        {/* Folder list */}
        {folders.length === 0 ? (
          <View style={[styles.cardList, {padding: spacing.lg}]}>
            <Placeholder
              variant="empty"
              anchor="top-third"
              icon="folder"
              title={`No ${isVideo ? 'video' : 'audio'} folders linked yet.`}
              message='Tap "Add Folder" below to link your first folder.'
            />
          </View>
        ) : (
          <View style={styles.cardList}>
            {/* 59.1: virtualized folder cards */}
            <FlatList
              data={folders}
              keyExtractor={(folder, index) => `${folder}-${index}`}
              renderItem={({item: folder}) => (
                <SwipeableFolderCard
                  folderPath={folder}
                  fileCount={folderFileCounts[folder] ?? 0}
                  lastScanTimestamp={lastScanTimestamp}
                  onRemove={handleRemoveFolder}
                  onRescan={handleRescanFolder}
                  colors={colors}
                />
              )}
              scrollEnabled={false}
              initialNumToRender={folders.length}
            />
          </View>
        )}
      </ScrollView>

      {/* Sticky "Add Folder" button */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity
          style={[styles.addButton, isScanning && styles.addButtonDisabled]}
          onPress={handleAddFolder}
          activeOpacity={0.7}
          disabled={isScanning}
          accessibilityRole="button">
          <SvgIcon name="folderFill" size={20} color={colors.accent.gold} />
          <AppText variant="body1" color="accent" style={{fontWeight: '600'}}>
            Add Folder
          </AppText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
