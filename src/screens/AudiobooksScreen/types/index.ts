import type {
  AudiobooksTab,
  AudiobookScopeState,
} from '../hooks/useAudiobooksScreen';

export type {AudiobooksTab, AudiobookScopeState};

export interface BookRow {
  id: number;
  title: string;
  author: string;
  image: string;
  subtitle: string;
  totalTime: number;
  language: string;
}

export interface BookCardProps {
  row: BookRow;
  onPress: (row: BookRow) => void;
}

export interface AudiobookTabSceneProps {
  tab: AudiobooksTab;
  scope: AudiobookScopeState;
  isSearchActive: boolean;
  selectedGenre: string | null;
  selectGenre: (genre: string) => void;
  ensureLoaded: (tab: AudiobooksTab) => void;
  loadMore: (tab: AudiobooksTab) => void;
  retry: (tab: AudiobooksTab) => void;
  onPressBook: (row: BookRow) => void;
}

export type AudiobooksScreenProps = import('../../../navigation/types').AudiobooksScreenProps;
