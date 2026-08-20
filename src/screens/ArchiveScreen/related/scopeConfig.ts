import type {ArchiveTab} from '../hooks/useArchiveScreen';

export const ARCHIVE_MEDIA_SCOPES: Array<{key: ArchiveTab; label: string}> = [
  {key: 'audio', label: 'Audio'},
  {key: 'video', label: 'Video'},
];
