export type {LiveTVFilters} from '../hooks/useLiveTVBrowser';
export type {ChannelRow} from '../components/ChannelCard';

export interface ActiveFilterChipsProps {
  filters: import('../hooks/useLiveTVBrowser').LiveTVFilters;
  onClear: (id: 'category') => void;
}

export type LiveTVScreenProps = import('../../../navigation/types').RootStackScreenProps<'LiveTVScreen'>;
export type LiveTVFilterId = 'category';
export type LiveTVMediaType = 'video';
export type LiveTVSource = 'iptv';
export type LiveTVScopeState = import('../hooks/useLiveTVBrowser').LiveTVScopeState;
export type LiveTVBrowseTags = import('../hooks/useLiveTVBrowser').LiveTVBrowseTags;
