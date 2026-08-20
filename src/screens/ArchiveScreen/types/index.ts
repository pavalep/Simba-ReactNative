import type {
  ArchiveTab,
  AudioScopeState,
  VideoScopeState,
} from '../hooks/useArchiveScreen';

export type {ArchiveTab, AudioScopeState, VideoScopeState};

export interface ArchiveRow {
  identifier: string;
  title: string;
  creator: string;
  image: string;
  subtitle: string;
}

export interface ArchiveCardProps {
  row: ArchiveRow;
  mediaType: ArchiveTab;
  onPress: (row: ArchiveRow, mediaType: ArchiveTab) => void;
}

export interface ArchiveTabSceneProps {
  tab: ArchiveTab;
  scope: AudioScopeState | VideoScopeState;
  isSearchActive: boolean;
  isOnline: boolean;
  refreshing: boolean;
  ensureLoaded: (tab: ArchiveTab) => void;
  loadMore: (tab: ArchiveTab) => void;
  retry: (tab: ArchiveTab) => void;
  handleRefresh: () => void;
  onPressRow: (row: ArchiveRow, mediaType: ArchiveTab) => void;
}

export type ArchiveScreenProps = import('../../../navigation/types').ArchiveScreenProps;
