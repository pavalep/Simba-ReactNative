import React from 'react';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {ArtistGrid} from './ArtistGrid';
import type {ColorTokens} from '../../../theme/tokens';

import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {AppText} from '../../../components/core/AppText/AppText';
import {spacing} from '../../../theme/tokens';

interface LibraryArtistsSegmentProps {
  audioFolders: string[];
  isMediaScanning: boolean;
  scannedTrackCount: number;
  colors: ColorTokens;
  onNavigateToSettings: () => void;
  onScanAudioFolders: () => void;
  onArtistPress: (artistName: string) => void;
  onViewAllArtists?: () => void;
}

export const LibraryArtistsSegment: React.FC<LibraryArtistsSegmentProps> = React.memo(({
  audioFolders,
  isMediaScanning,
  scannedTrackCount,
  colors,
  onNavigateToSettings,
  onScanAudioFolders,
  onArtistPress,
  onViewAllArtists,
}) => {
  if (audioFolders.length === 0) {
    return (
      <EmptyState
        icon="headphones"
        title="No audio folders linked"
        description="Link audio folders in Settings first, then switch to Artists to browse by artist."
        actionLabel="Go to Settings"
        onAction={onNavigateToSettings}
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
