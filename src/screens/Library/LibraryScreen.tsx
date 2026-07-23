import React, {useState, useMemo} from 'react';
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
import {EmptyState} from '../../components/utility/EmptyState/EmptyState';
import {SvgIcon} from '../../components/utility/SvgIcon';
import {LibraryScreenProps} from '../../navigation/types';

type Props = LibraryScreenProps;
type Segment = 'videos' | 'audio' | 'folders';

const SEGMENTS: {key: Segment; label: string}[] = [
  {key: 'videos', label: 'Videos'},
  {key: 'audio', label: 'Audio'},
  {key: 'folders', label: 'Folders'},
];

const formatLastScan = (timestamp: number | null): string => {
  if (timestamp === null) return 'Never';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const LibraryScreen: React.FC<Props> = ({navigation}) => {
  const {theme, colors} = useTheme();
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const bottomChromeInset = insets.bottom + 104;
  const [activeSegment, setActiveSegment] = useState<Segment>('videos');

  const videoFolders = useAppSelector(s => s.settings.videoFolders);
  const audioFolders = useAppSelector(s => s.settings.audioFolders);
  const isScanning = useAppSelector(s => s.settings.isScanning);
  const lastScanTimestamp = useAppSelector(s => s.settings.lastScanTimestamp);

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
        headerAction: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          minHeight: 38,
          paddingHorizontal: 12,
          borderRadius: 19,
          borderWidth: StyleSheet.hairlineWidth,
          backgroundColor: colors.background.floating,
          borderColor: colors.border.subtle,
        },
        headerActionText: {
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.3,
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

        // ── Content ──
        scroll: {
          flex: 1,
        },
        scrollContent: {
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: bottomChromeInset,
        },

        // ── Scan status ──
        scanInfoRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 20,
          paddingBottom: 8,
          gap: 6,
        },
        scanDot: {
          width: 6,
          height: 6,
          borderRadius: 3,
        },
        scanningContainer: {
          alignItems: 'center',
          paddingTop: 48,
          gap: 12,
        },
        scanningText: {
          textAlign: 'center',
        },
        linkedContainer: {
          alignItems: 'center',
          paddingTop: 16,
        },
      }),
    [bottomChromeInset, colors],
  );

  const linkedFolderCount = (() => {
    switch (activeSegment) {
      case 'videos':
        return videoFolders?.length ?? 0;
      case 'audio':
        return audioFolders?.length ?? 0;
      case 'folders':
        return (videoFolders?.length ?? 0) + (audioFolders?.length ?? 0);
    }
  })();

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

    if (linkedFolderCount > 0) {
      const label =
        activeSegment === 'videos'
          ? 'video'
          : activeSegment === 'audio'
            ? 'audio'
            : '';
      const pluralS = linkedFolderCount !== 1 ? 's' : '';
      const folderType =
        activeSegment === 'folders'
          ? 'folder'
          : `${label} folder`;
      return (
        <View style={styles.linkedContainer}>
          <EmptyState
            icon="folder"
            title={`${linkedFolderCount} linked ${folderType}${pluralS}`}
            subtitle="Browse from your linked folders or add more in Settings."
          />
        </View>
      );
    }

    switch (activeSegment) {
      case 'videos':
        return (
          <EmptyState
            icon="video"
            title="No videos yet"
            subtitle="Link folders in Settings to populate your library."
          />
        );
      case 'audio':
        return (
          <EmptyState
            icon="music"
            title="No audio files yet"
            subtitle="Link folders in Settings to populate your library."
          />
        );
      case 'folders':
        return (
          <EmptyState
            icon="folder"
            title="No folders yet"
            subtitle="Link media folders in Settings to get started."
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <SimbaStatusBar variant="home" />

      {/* ══ BACKGROUND ══ */}
      <LinearGradient
        colors={
          [colors.background.primary, colors.background.primary]
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

      {/* ══ SCAN STATUS ══ */}
      <View style={styles.scanInfoRow}>
        <View
          style={[
            styles.scanDot,
            {
              backgroundColor: isScanning
                ? colors.accent.gold
                : colors.text.tertiary,
            },
          ]}
        />
        <AppText variant="caption" color="tertiary">
          {isScanning
            ? 'Scanning...'
            : `Last scanned: ${formatLastScan(lastScanTimestamp)}`}
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
              <AppText
                variant="body2"
                color={isActive ? 'accent' : 'secondary'}
                style={styles.segmentLabel}>
                {seg.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ══ CONTENT ══ */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {renderContent()}

      </ScrollView>
    </SafeAreaView>
  );
};
