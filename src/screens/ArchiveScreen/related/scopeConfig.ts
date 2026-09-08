import type {ArchiveMediaType} from '../hooks/useArchiveScreen';

export const ARCHIVE_MEDIA_SCOPES: Array<{key: ArchiveMediaType; label: string}> = [
  {key: 'audio', label: 'Audio'},
  {key: 'video', label: 'Video'},
];
