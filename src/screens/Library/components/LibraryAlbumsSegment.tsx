import React from 'react';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {AlbumGrid} from './AlbumGrid';
import type {ColorTokens} from '../../../theme/tokens';

import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {spacing} from '../../../theme/tokens';

interface LibraryAlbumsSegmentProps {
  audioFolders: string[];
  isMediaScanning: boolean;
  scannedTrackCount: number;
  colors: ColorTokens;
  onNavigateToSettings: () => void;
  onScanAudioFolders: () => void;
  onAlbumPress: (albumTitle: string, artistName: string) => void;
  onViewAllAlbums?: () => void;
}

export const LibraryAlbumsSegment: React.FC<LibraryAlbumsSegmentProps> = ({
  audioFolders,
  isMediaScanning,
  scannedTrackCount,
  colors,
  onNavigateToSettings,
  onScanAudioFolders,
  onAlbumPress,
  onViewAllAlbums,
}) => {
  if (audioFolders.length === 0) {
    return (
      <EmptyState
        icon="listMusic"
        title="No audio folders linked"
        description="Link audio folders in Settings first, then switch to Albums to browse by album."
        actionLabel="Go to Settings"
        onAction={onNavigateToSettings}
      />
    );
  }

  if (scannedTrackCount === 0 && !isMediaScanning) {
    return (
      <EmptyState
        icon="listMusic"
        title="Scanning needed"
        description="No audio metadata found. Tap to scan your linked folders now."
        actionLabel="Scan Audio Folders"
        onAction={onScanAudioFolders}
      />
    );
  }

  return (
    <>
      <View style={[styles.headerRow, {borderBottomColor: colors.border.subtle}]}>
        <AppText variant="h3" color="primary" style={{flex: 1}}>
          All Albums
        </AppText>
        {onViewAllAlbums && (
          <TouchableOpacity onPress={onViewAllAlbums} activeOpacity={0.7}>
            <AppText variant="caption" color="accent">
              See All
            </AppText>
          </TouchableOpacity>
        )}
      </View>
      <AlbumGrid onAlbumPress={onAlbumPress} />
    </>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
