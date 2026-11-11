import React from 'react';
import {EmptyState} from '../../../../components/feedback/EmptyState/EmptyState';
import {ArtistGrid} from './ArtistGrid';
import type {ColorTokens} from '../../../../theme/tokens';

import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {AppText} from '../../../../components/core/AppText/AppText';
import {spacing} from '../../../../theme/tokens';

interface LibraryArtistsSegmentProps {
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
  onArtistPress: (artistName: string) => void;
  onViewAllArtists?: () => void;
}

export const LibraryArtistsSegment: React.FC<LibraryArtistsSegmentProps> = React.memo(({
  audioFolders,
  isMediaScanning,
  scannedTrackCount,
  colors,
  onLinkFolders,
  onScanAudioFolders,
  onArtistPress,
  onViewAllArtists,
}) => {
  if (audioFolders.length === 0) {
    return (
      <EmptyState
        icon="headphones"
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
        icon="headphones"
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
          All Artists
        </AppText>
        {onViewAllArtists && (
          <TouchableOpacity onPress={onViewAllArtists} activeOpacity={0.7} accessibilityRole="button">
            <AppText variant="caption" color="accent">
              See All
            </AppText>
          </TouchableOpacity>
        )}
      </View>
      <ArtistGrid onArtistPress={onArtistPress} />
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
