import React from 'react';
import {View, TouchableOpacity, StyleSheet, FlatList} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {radius, ColorTokens} from '../../../theme/tokens';
import type {ScannedTrack} from '../../../store/slices/mediaSlice';
import textContent from '../textContent';

interface LibraryFoldersSegmentProps {
  videoFolders: string[];
  audioFolders: string[];
  scannedTracks: ScannedTrack[];
  lastScanTimestamp: number | null;
  colors: ColorTokens;
  onLinkFolder: () => void;
  onNavigateToFolderBrowser: (folderPath: string) => void;
}

function getFolderName(folderPath: string): string {
  return folderPath.split('/').pop() || folderPath;
}

function getFolderFileCount(folderPath: string, tracks: ScannedTrack[]): number {
  return tracks.filter(t => t.uri.startsWith(folderPath)).length;
}

function formatLastScan(timestamp: number | null): string {
  if (!timestamp) return 'Never';
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export const LibraryFoldersSegment: React.FC<LibraryFoldersSegmentProps> = React.memo(({
  videoFolders,
  audioFolders,
  scannedTracks,
  lastScanTimestamp,
  colors,
  onLinkFolder,
  onNavigateToFolderBrowser,
}) => {
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          gap: 12,
        },
        folderCard: {
          paddingVertical: 16,
          paddingHorizontal: 16,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          backgroundColor: colors.background.elevated,
          borderColor: colors.border.subtle,
        },
        folderRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        },
        folderIconWrap: {
          width: 40,
          height: 40,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.accent.goldSoft,
        },
        folderInfo: {
          flex: 1,
        },
        folderName: {
          fontWeight: '600',
        },
        folderPath: {
          fontSize: 11,
          marginTop: 1,
        },
        metaRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginTop: 4,
        },
        metaBadge: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        },
        metaText: {
          fontSize: 11,
        },
        divider: {
          width: 3,
          height: 3,
          borderRadius: 1.5,
          backgroundColor: colors.text.tertiary,
        },
        ctaButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 14,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.accent.gold,
          gap: 8,
        },
        typeIndicator: {
          fontSize: 10,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 4,
          overflow: 'hidden',
          fontWeight: '600',
        },
      }),
    [colors],
  );

  const allFolders = React.useMemo(() => {
    const folders: Array<{path: string; type: 'video' | 'audio'}> = [];
    videoFolders.forEach(p => folders.push({path: p, type: 'video'}));
    audioFolders.forEach(p => folders.push({path: p, type: 'audio'}));
    return folders;
  }, [videoFolders, audioFolders]);

  // Empty state
  if (allFolders.length === 0) {
    return (
      <View style={styles.wrapper}>
        <EmptyState
          icon="folder"
          title={textContent.emptyFoldersTitle}
          description={textContent.emptyFoldersDesc}
          actionLabel={textContent.linkFolder}
          onAction={onLinkFolder}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* 59.1: virtualized instead of .map */}
      <FlatList
        data={allFolders}
        keyExtractor={({path}) => path}
        renderItem={({item: {path, type}}) => {
        const fileCount = getFolderFileCount(path, scannedTracks);
        return (
          <TouchableOpacity
            style={styles.folderCard}
            activeOpacity={0.7}
            accessibilityRole="button"
            onPress={() => onNavigateToFolderBrowser(path)}>
            <View style={styles.folderRow}>
              <View style={styles.folderIconWrap}>
                <SvgIcon name="folder" size={20} color={colors.accent.gold} />
              </View>
              <View style={styles.folderInfo}>
                <AppText
                  variant="body2"
                  color="primary"
                  numberOfLines={1}
                  style={styles.folderName}>
                  {getFolderName(path)}
                </AppText>
                <AppText
                  variant="caption"
                  color="tertiary"
                  numberOfLines={1}
                  style={styles.folderPath}>
                  {path}
                </AppText>
                <View style={styles.metaRow}>
                  <View style={styles.metaBadge}>
                    <SvgIcon name="music" size={12} color={colors.text.tertiary} />
                    <AppText variant="caption" color="tertiary" style={styles.metaText}>
                      {fileCount} {fileCount === 1 ? 'file' : 'files'}
                    </AppText>
                  </View>
                  <View style={styles.divider} />
                  <AppText variant="caption" color="tertiary" style={styles.metaText}>
                    {textContent.folderScanned}: {formatLastScan(lastScanTimestamp)}
                  </AppText>
                  <View style={styles.divider} />
                  <View
                    style={[
                      styles.typeIndicator,
                      {
                        backgroundColor:
                          type === 'video'
                            ? colors.accent.sky
                            : colors.accent.goldDim,
                      },
                    ]}>
                    <AppText
                      variant="caption"
                      color={type === 'video' ? 'accent' : 'accent'}
                      style={{fontSize: 10, fontWeight: '600'}}>
                      {type === 'video' ? 'VIDEO' : 'AUDIO'}
                    </AppText>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
        }}
        scrollEnabled={false}
        initialNumToRender={allFolders.length}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            onPress={onLinkFolder}>
            <SvgIcon name="folder" size={18} color={colors.accent.gold} />
            <AppText variant="body2" color="accent">
              {textContent.linkFolder}
            </AppText>
          </TouchableOpacity>
        }
      />
    </View>
  );
},
);
