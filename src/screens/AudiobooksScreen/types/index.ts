import type {
  AudiobooksTab,
  AudiobookScope,
} from '../hooks/useAudiobooksScreen';

export type {AudiobooksTab, AudiobookScope};

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
  scope: AudiobookScope;
  isSearchActive: boolean;
  selectedGenre: string | null;
  selectGenre: (genre: string) => void;
  onPressBook: (row: BookRow) => void;
}

export type AudiobooksScreenProps = import('../../../navigation/types').AudiobooksScreenProps;
