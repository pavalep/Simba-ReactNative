import React from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {SvgIcon} from '../../../components/utility/SvgIcon';
import {radius} from '../../../theme/tokens';

interface LibraryFoldersSegmentProps {
  videoFolders: string[];
  audioFolders: string[];
  colors: any;
  isDark: boolean;
  onNavigateToFolderBrowser: (folderPath: string) => void;
}

export const LibraryFoldersSegment: React.FC<LibraryFoldersSegmentProps> = ({
  videoFolders,
  audioFolders,
  colors,
  isDark,
  onNavigateToFolderBrowser,
}) => {
  const allFolders: {path: string; type: 'video' | 'audio'}[] = React.useMemo(() => {
    return [
      ...videoFolders.map(f => ({path: f, type: 'video' as const})),
      ...audioFolders.map(f => ({path: f, type: 'audio' as const})),
    ];
  }, [videoFolders, audioFolders]);

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
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
        folderCardLeft: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
          gap: 12,
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
          backgroundColor: isDark ? 'rgba(237,237,237,0.08)' : 'rgba(26,26,28,0.06)',
          color: colors.text.secondary,
        },
      }),
    [colors, isDark],
  );

  if (allFolders.length === 0) {
    return (
      <EmptyState
        icon="folder"
        title="No folders linked"
        description="Link media folders in Settings to build your library."
        actionLabel="Go to Settings"
        onAction={() => {}}
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
          onPress={() => onNavigateToFolderBrowser(f.path)}>
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
};
