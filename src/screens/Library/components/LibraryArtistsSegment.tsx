import React from 'react';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {ArtistGrid} from './ArtistGrid';

interface LibraryArtistsSegmentProps {
  audioFolders: string[];
  isMediaScanning: boolean;
  scannedTrackCount: number;
  colors: any;
  onNavigateToSettings: () => void;
  onScanAudioFolders: () => void;
  onArtistPress: (artistName: string) => void;
}

export const LibraryArtistsSegment: React.FC<LibraryArtistsSegmentProps> = ({
  audioFolders,
  isMediaScanning,
  scannedTrackCount,
  onNavigateToSettings,
  onScanAudioFolders,
  onArtistPress,
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

  return <ArtistGrid onArtistPress={onArtistPress} />;
};
