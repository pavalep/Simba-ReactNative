import React from 'react';
import {EmptyState} from '../../../components/feedback/EmptyState/EmptyState';
import {AlbumGrid} from './AlbumGrid';

interface LibraryAlbumsSegmentProps {
  audioFolders: string[];
  isMediaScanning: boolean;
  scannedTrackCount: number;
  colors: any;
  onNavigateToSettings: () => void;
  onScanAudioFolders: () => void;
  onAlbumPress: (albumTitle: string, artistName: string) => void;
}

export const LibraryAlbumsSegment: React.FC<LibraryAlbumsSegmentProps> = ({
  audioFolders,
  isMediaScanning,
  scannedTrackCount,
  onNavigateToSettings,
  onScanAudioFolders,
  onAlbumPress,
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

  return <AlbumGrid onAlbumPress={onAlbumPress} />;
};
