import type {AudiobooksTab} from '../hooks/useAudiobooksScreen';

export const AUDIOBOOK_SCOPES: Array<{key: AudiobooksTab; title: string}> = [
  {key: 'search', title: 'Search'},
  {key: 'genres', title: 'Genres'},
  {key: 'recent', title: 'New Releases'},
];

export const AUDIOBOOK_SCOPE_CHIPS = AUDIOBOOK_SCOPES.map(scope => ({
  key: scope.key,
  label: scope.title,
}));
