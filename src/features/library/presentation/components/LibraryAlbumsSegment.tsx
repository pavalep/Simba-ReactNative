import React from 'react';
import {EmptyState} from '../../../../components/feedback/EmptyState/EmptyState';
import {AlbumGrid} from './AlbumGrid';
import type {ColorTokens} from '../../../../theme/tokens';

import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {AppText} from '../../../../components/core/AppText/AppText';
import {spacing} from '../../../../theme/tokens';

interface LibraryAlbumsSegmentProps {
  audioFolders: string[];
  isMediaScanning: boolean;
  scannedTrackCount: number;
  colors: ColorTokens;
  /**
   * Links an AUDIO folder.
   *
   * The empty state used to send the user to a page called "Settings"
   * (the Preferences page, before it was merged into the Profile on
   * 2026-11-11). A page called Settings was never the right door to a
   * folder picker, so the empty state links the folder itself.
   */
  onLinkFolders: () => void;
  onScanAudioFolders: () => void;
  onAlbumPress: (albumTitle: string, artistName: string) => void;
  onViewAllAlbums?: () => void;
}

export const LibraryAlbumsSegment: React.FC<LibraryAlbumsSegmentProps> = React.memo(({
  audioFolders,
  isMediaScanning,
  scannedTrackCount,
  colors,
  onLinkFolders,
  onScanAudioFolders,
  onAlbumPress,
  onViewAllAlbums,
}) => {
  if (audioFolders.length === 0) {
    return (
      <EmptyState
        icon="listMusic"
        title="No audio folders linked"
        description="Link an audio folder and Simba will scan it into your library."
        actionLabel="Link folders"
        onAction={onLinkFolders}
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
        <AppText variant="displaySans" color="primary" style={{flex: 1}}>
          All Albums
        </AppText>
        {onViewAllAlbums && (
          <TouchableOpacity onPress={onViewAllAlbums} activeOpacity={0.7} accessibilityRole="button">
            <AppText variant="caption" color="accent">
              See All
            </AppText>
          </TouchableOpacity>
        )}
      </View>
      <AlbumGrid onAlbumPress={onAlbumPress} />
    </>
  );
},
);

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
