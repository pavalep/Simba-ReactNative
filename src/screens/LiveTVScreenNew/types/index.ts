export type {LiveTVFilters} from '../hooks/useLiveTVBrowser';
export type {ChannelRow} from '../components/ChannelCard';

export interface ActiveFilterChipsProps {
  filters: import('../hooks/useLiveTVBrowser').LiveTVFilters;
  /**
   * The category's NAME — what the chip reads.
   *
   * The filter itself holds the category's ID (the source's own slug);
   * the name is what the user sees, and it comes from the catalogue's
   * category map.
   */
  label: string;
  onClear: (id: 'category') => void;
}

export type {RootStackScreenProps} from '../../../navigation/types';
