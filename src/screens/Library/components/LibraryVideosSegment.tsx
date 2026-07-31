import React from 'react';
import {View, TouchableOpacity, StyleSheet, FlatList} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {radius, ColorTokens} from '../../../theme/tokens';

interface LibraryVideosSegmentProps {
  videoFolders: string[];
  colors: ColorTokens;
  viewMode?: 'grid' | 'list';
  onNavigateToSettings: () => void;
  onNavigateToFolderBrowser: (folderPath: string) => void;
  onNavigateToLinkedFolders: (type: 'video' | 'audio') => void;
}

export const LibraryVideosSegment: React.FC<LibraryVideosSegmentProps> = ({
  videoFolders,
  colors,
  onNavigateToSettings,
  onNavigateToFolderBrowser,
  onNavigateToLinkedFolders,
}) => {
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
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
          backgroundColor: colors.accent.goldSoft,
        },
        folderLabel: {
          flex: 1,
        },
        folderPath: {
          fontSize: 12,
          marginTop: 2,
        },
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
      }),
    [colors],
  );

  if (videoFolders.length === 0) {
    return (
      <EmptyState
        icon="video"
        title="No videos yet"
        description="Link video folders in Settings to populate your library."
        actionLabel="Go to Settings"
        onAction={onNavigateToSettings}
      />
    );
  }

  return (
    <View style={styles.folderGrid}>
      {/* 59.1: virtualized instead of .map */}
      <FlatList
        data={videoFolders}
        keyExtractor={(folder, index) => `video-${index}`}
        renderItem={({item: folder}) => (
          <TouchableOpacity
            style={styles.folderCard}
            activeOpacity={0.7}
            accessibilityRole="button"
            onPress={() => onNavigateToFolderBrowser(folder)}>
            <View style={styles.folderCardRow}>
              <View style={styles.folderCardLeft}>
                <View style={styles.folderIconWrap}>
                  <SvgIcon name="folder" size={18} color={colors.accent.gold} />
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
        )}
        scrollEnabled={false}
        initialNumToRender={videoFolders.length}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            onPress={() => onNavigateToLinkedFolders('video')}>
            <SvgIcon name="folder" size={18} color={colors.accent.gold} style={styles.ctaIcon} />
            <AppText variant="body2" color="accent">
              + Add Video Folder
            </AppText>
          </TouchableOpacity>
        }
      />
    </View>
  );
};
