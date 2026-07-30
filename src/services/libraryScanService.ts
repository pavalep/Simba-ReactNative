import {MediaItem} from '../types';
import {getLinkedFolders} from './storageService';

type SortOption = 'name' | 'date' | 'size' | 'type';

const MEDIA_EXTENSIONS = new Set([
  '.mp4', '.mkv', '.avi', '.mov', '.webm',
  '.mp3', '.flac', '.wav', '.aac', '.ogg',
]);

async function scanFolder(path: string): Promise<MediaItem[]> {
  // Real scanning would use native module to enumerate files.
  // For now, return empty — actual scan is handled by the
  // native media scanner service.
  return [];
}

async function scanAllLinkedFolders(): Promise<MediaItem[]> {
  const videoFolders = getLinkedFolders('video');
  const audioFolders = getLinkedFolders('audio');
  const allFolders = [...videoFolders, ...audioFolders];
  const results = await Promise.all(allFolders.map(folder => scanFolder(folder)));
  return results.flat();
}

function getVideos(items?: MediaItem[]): MediaItem[] {
  if (!items) {
    return [];
  }
  return items.filter(item => item.type === 'video');
}

function getAudio(items?: MediaItem[]): MediaItem[] {
  if (!items) {
    return [];
  }
  return items.filter(item => item.type === 'audio');
}

function searchMedia(query: string, items: MediaItem[]): MediaItem[] {
  const lowerQuery = query.toLowerCase();
  return items.filter(item => item.title.toLowerCase().includes(lowerQuery));
}

function sortMedia(items: MediaItem[], sortBy: SortOption): MediaItem[] {
  const sorted = [...items];
  switch (sortBy) {
    case 'name':
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'date':
      sorted.sort(
        (a, b) =>
          new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime(),
      );
      break;
    case 'size':
      sorted.sort((a, b) => b.fileSize - a.fileSize);
      break;
    case 'type':
      sorted.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'video' ? -1 : 1;
        }
        return 0;
      });
      break;
  }
  return sorted;
}

export {scanFolder, scanAllLinkedFolders, getVideos, getAudio, searchMedia, sortMedia};
export type {SortOption};
