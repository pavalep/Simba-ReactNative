import type {ArchiveMediaType} from '../hooks/useArchiveScreen';

export type {ArchiveMediaType};

export interface ArchiveRow {
  identifier: string;
  title: string;
  creator: string;
  image: string;
  subtitle: string;
}

export interface ArchiveCardProps {
  row: ArchiveRow;
  mediaType: ArchiveMediaType;
  onPress: (row: ArchiveRow, mediaType: ArchiveMediaType) => void;
}

export type ArchiveScreenProps = import('../../../navigation/types').ArchiveScreenProps;
