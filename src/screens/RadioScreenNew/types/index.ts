export type {RadioFilterId, RadioFilters} from '../hooks/useRadioBrowser';
export type {StationRow} from '../components/RadioStationCard';

export interface ActiveRadioFilterChipProps {
  filters: import('../hooks/useRadioBrowser').RadioFilters;
  onClear: import('../hooks/useRadioBrowser').RadioFilterId;
}

export type {RootStackScreenProps} from '../../../navigation/types';
export type RadioScreenProps = import('../../../navigation/types').RootStackScreenProps<'RadioScreen'>;
export type RadioMediaType = 'audio';
export type RadioSource = 'radio';

export const RADIO_PAGE_SIZE = 30;
