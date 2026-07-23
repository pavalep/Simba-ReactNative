import React, {useState, useMemo, useCallback} from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme';
import {useAppSelector} from '../../store';
import {SimbaStatusBar} from '../../components/StatusBar';
import {AppText} from '../../components/core/AppText/AppText';
import {EmptyState} from '../../components/feedback/EmptyState/EmptyState';
import {ScanProgressBanner} from '../../components/feedback/ScanProgressBanner/ScanProgressBanner';
import {SvgIcon, SvgIconName} from '../../components/utility/SvgIcon';
import {radius} from '../../theme/tokens';
import {LibraryScreenProps} from '../../navigation/types';

type Props = LibraryScreenProps;
type Segment = 'videos' | 'audio' | 'folders';

const SEGMENTS: {key: Segment; label: string; icon: SvgIconName}[] = [
  {key: 'videos', label: 'Videos', icon: 'video'},
  {key: 'audio', label: 'Audio', icon: 'music'},
  {key: 'folders', label: 'Folders', icon: 'folder'},
];

export const LibraryScreen: React.FC<Props> = ({navigation}) => {
  const {theme, colors} = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const bottomChromeInset = insets.bottom + 104;
  const [activeSegment, setActiveSegment] = useState<Segment>('videos');

  const videoFolders = useAppSelector(s => s.settings?.videoFolders ?? []);
  const audioFolders = useAppSelector(s => s.settings?.audioFolders ?? []);
  const isScanning = useAppSelector(s => s.settings?.isScanning ?? false);
  const lastScanTimestamp = useAppSelector(s => s.settings?.lastScanTimestamp ?? null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
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
          paddingHorizontal: 20,
          paddingTop: Platform.OS === 'android' ? 16 : 4,
          paddingBottom: 12,
        },

        // ── Segmented Control ──
        segmentedControl: {
          flexDirection: 'row',
          paddingHorizontal: 20,
          marginBottom: 16,
          gap: 0,
        },
        segment: {
          flex: 1,
          alignItems: 'center',
          paddingVertical: 10,
          borderBottomWidth: 2,
          borderBottomColor: 'transparent',
        },
        segmentActive: {
          borderBottomColor: colors.accent.gold,
        },
        segmentLabel: {
          fontWeight: '500',
        },
        segmentIcon: {
          width: 16,
          height: 16,
          marginRight: 6,
        },
        segmentInner: {
          flexDirection: 'row',
          alignItems: 'center',
        },

        // ── Content ──
        scroll: {
          flex: 1,
        },
        scrollContent: {
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: bottomChromeInset,
        },

        // ── Scanning state ──
        scanningContainer: {
          alignItems: 'center',
          paddingTop: 48,
          gap: 12,
        },
        scanningText: {
          textAlign: 'center',
        },

        // ── Folder card grid ──
        folderGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
        },
        folderCard: {
          width: '100%',
          paddingVertical: 16,
          paddingHorizontal: 16,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          backgroundColor: colors.background.elevated,
          borderColor: colors.border.subtle,
        },
        folderCardRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        folderCardLeft: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
          gap: 12,
        },
        folderIconWrap: {
          width: 36,
          height: 36,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? 'rgba(212,175,55,0.12)' : 'rgba(212,175,55,0.08)',
        },
        folderLabel: {
          flex: 1,
        },
        folderPath: {
          fontSize: 12,
          marginTop: 2,
        },
        // ── CTA button ──
        ctaButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 14,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.accent.gold,
          marginTop: 20,
          gap: 8,
        },
        ctaIcon: {
          width: 18,
          height: 18,
        },

        // ── Folders tab ──
        folderListCard: {
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border.subtle,
          backgroundColor: colors.background.elevated,
          marginBottom: 16,
          overflow: 'hidden',
        },
        folderListHeader: {
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border.subtle,
        },
        folderListItem: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border.subtle,
        },
        folderListItemLast: {
          borderBottomWidth: 0,
        },
        folderTypeTag: {
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 4,
          fontSize: 10,
          fontWeight: '600',
          overflow: 'hidden',
        },
        folderTypeVideo: {
          backgroundColor: isDark ? 'rgba(212,175,55,0.15)' : 'rgba(212,175,55,0.1)',
          color: colors.accent.gold,
        },
        folderTypeAudio: {
          backgroundColor: isDark ? 'rgba(100,200,255,0.12)' : 'rgba(100,200,255,0.08)',
          color: '#64C8FF',
        },
      }),
    [bottomChromeInset, colors, isDark],
  );

  // ── Handlers ──

  const navigateToSettings = useCallback(() => {
    // Navigate to the Settings root stack
    (navigation as any).navigate('Settings');
  }, [navigation]);

  const navigateToLinkedFolders = useCallback(
    (type: 'video' | 'audio') => {
      (navigation as any).navigate('Settings', {
        screen: 'LinkedFolders',
        params: {type},
      });
    },
    [navigation],
  );

  const navigateToFolderBrowser = useCallback(
    (folderPath: string, folderName: string) => {
      (navigation as any).navigate('FolderBrowser', {initialPath: folderPath});
    },
    [navigation],
  );

  // ── Render helpers ──

  const renderFolderCard = (folder: string, index: number, type: 'video' | 'audio') => (
    <TouchableOpacity
      key={`${type}-${index}`}
      style={styles.folderCard}
      activeOpacity={0.7}
      onPress={() => navigateToFolderBrowser(folder, folder.split('/').pop() || folder)}>
      <View style={styles.folderCardRow}>
        <View style={styles.folderCardLeft}>
          <View style={styles.folderIconWrap}>
            <SvgIcon
              name="folder"
              size={18}
              color={colors.accent.gold}
            />
          </View>
          <View style={styles.folderLabel}>
            <AppText variant="body2" color="primary" numberOfLines={1}>
              {folder.split('/').pop() || folder}
            </AppText>
            <AppText variant="caption" color="tertiary" style={styles.folderPath} numberOfLines={1}>
              {folder}
            </AppText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (isScanning) {
      return (
        <View style={styles.scanningContainer}>
          <ActivityIndicator color={colors.accent.gold} size="large" />
          <AppText
            variant="body2"
            color="secondary"
            style={styles.scanningText}>
            Scanning linked folders...
          </AppText>
        </View>
      );
    }

    switch (activeSegment) {
      case 'videos': {
        if (videoFolders.length === 0) {
          return (
            <EmptyState
              icon="video"
              title="No videos yet"
              description="Link video folders in Settings to populate your library."
              actionLabel="Go to Settings"
              onAction={navigateToSettings}
            />
          );
        }
        return (
          <View style={styles.folderGrid}>
            {videoFolders.map((f, i) => renderFolderCard(f, i, 'video'))}
            <TouchableOpacity
              style={styles.ctaButton}
              activeOpacity={0.7}
              onPress={() => navigateToLinkedFolders('video')}>
              <SvgIcon
                name="folder"
                size={18}
                color={colors.accent.gold}
                style={styles.ctaIcon}
              />
              <AppText variant="body2" color="accent">
                + Add Video Folder
              </AppText>
            </TouchableOpacity>
          </View>
        );
      }

      case 'audio': {
        if (audioFolders.length === 0) {
          return (
            <EmptyState
              icon="music"
              title="No audio files yet"
              description="Link audio folders in Settings to populate your library."
              actionLabel="Go to Settings"
              onAction={navigateToSettings}
            />
          );
        }
        return (
          <View style={styles.folderGrid}>
            {audioFolders.map((f, i) => renderFolderCard(f, i, 'audio'))}
            <TouchableOpacity
              style={styles.ctaButton}
              activeOpacity={0.7}
              onPress={() => navigateToLinkedFolders('audio')}>
              <SvgIcon
                name="folder"
                size={18}
                color={colors.accent.gold}
                style={styles.ctaIcon}
              />
              <AppText variant="body2" color="accent">
                + Add Audio Folder
              </AppText>
            </TouchableOpacity>
          </View>
        );
      }

      case 'folders': {
        const allFolders: {path: string; type: 'video' | 'audio'}[] = [
          ...videoFolders.map(f => ({path: f, type: 'video' as const})),
          ...audioFolders.map(f => ({path: f, type: 'audio' as const})),
        ];
        if (allFolders.length === 0) {
          return (
            <EmptyState
              icon="folder"
              title="No folders linked"
              description="Link media folders in Settings to build your library."
              actionLabel="Go to Settings"
              onAction={navigateToSettings}
            />
          );
        }
        return (
          <View style={styles.folderListCard}>
            <View style={styles.folderListHeader}>
              <AppText variant="body2" color="secondary" style={{fontWeight: '600'}}>
                All Linked Folders
              </AppText>
            </View>
            {allFolders.map((f, i) => (
              <TouchableOpacity
                key={`${f.type}-${i}`}
                style={[
                  styles.folderListItem,
                  i === allFolders.length - 1 && styles.folderListItemLast,
                ]}
                activeOpacity={0.7}
                onPress={() => navigateToFolderBrowser(f.path, f.path.split('/').pop() || f.path)}>
                <View style={styles.folderCardLeft}>
                  <SvgIcon name="folder" size={18} color={colors.accent.gold} />
                  <AppText variant="body2" color="primary" numberOfLines={1} style={{flex: 1}}>
                    {f.path}
                  </AppText>
                </View>
                <AppText
                  variant="caption"
                  style={[
                    styles.folderTypeTag,
                    f.type === 'video' ? styles.folderTypeVideo : styles.folderTypeAudio,
                  ]}>
                  {f.type === 'video' ? 'Video' : 'Audio'}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        );
      }
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <SimbaStatusBar variant="home" />

      {/* ══ BACKGROUND ══ */}
      <LinearGradient
        colors={
          isDark
            ? [colors.background.primary, '#0D0D0F']
            : [colors.background.primary, colors.background.elevated]
        }
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.glowWarm,
          {
            backgroundColor: colors.accent.gold,
            opacity: isDark ? 0.22 : 0.12,
          },
        ]}
        pointerEvents="none"
      />

      {/* ══ HEADER ══ */}
      <View style={styles.header}>
        <AppText variant="h1" color="primary">
          Library
        </AppText>
      </View>

      {/* ══ SEGMENTED CONTROL ══ */}
      <View style={styles.segmentedControl}>
        {SEGMENTS.map(seg => {
          const isActive = activeSegment === seg.key;
          return (
            <TouchableOpacity
              key={seg.key}
              style={[styles.segment, isActive && styles.segmentActive]}
              onPress={() => setActiveSegment(seg.key)}
              activeOpacity={0.7}>
              <View style={styles.segmentInner}>
                <SvgIcon
                  name={seg.icon}
                  size={16}
                  color={isActive ? colors.accent.gold : colors.text.secondary}
                  style={styles.segmentIcon}
                />
                <AppText
                  variant="body2"
                  color={isActive ? 'accent' : 'secondary'}
                  style={styles.segmentLabel}>
                  {seg.label}
                </AppText>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ══ CONTENT ══ */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Scan Status Banner */}
        <ScanProgressBanner
          isScanning={isScanning}
          lastScanTimestamp={lastScanTimestamp}
        />

        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
};
