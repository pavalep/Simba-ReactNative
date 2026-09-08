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

export type AudiobooksScreenProps = import('../../../navigation/types').AudiobooksScreenProps;
