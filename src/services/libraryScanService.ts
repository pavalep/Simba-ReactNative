import {MediaItem} from '../types';
import {getLinkedFolders} from './storageService';

type SortOption = 'name' | 'date' | 'size' | 'type';

const MEDIA_EXTENSIONS = new Set([
  '.mp4', '.mkv', '.avi', '.mov', '.webm',
  '.mp3', '.flac', '.wav', '.aac', '.ogg',
]);

function createMockItem(path: string, index: number): MediaItem {
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
  const isVideo = ['.mp4', '.mkv', '.avi', '.mov', '.webm'].includes(ext);
  return {
    uri: `file:///mock/${path}/${index}`,
    title: `Mock ${isVideo ? 'Video' : 'Audio'} ${index}`,
    duration: Math.floor(Math.random() * 600) + 30,
    type: isVideo ? 'video' : 'audio',
    fileSize: Math.floor(Math.random() * 100_000_000) + 1_000_000,
    dateAdded: new Date(
      Date.now() - Math.floor(Math.random() * 30) * 86_400_000,
    ).toISOString(),
  };
}

async function scanFolder(path: string): Promise<MediaItem[]> {
  const items: MediaItem[] = [];
  let index = 0;
  for (const ext of MEDIA_EXTENSIONS) {
    for (let i = 0; i < 3; i++) {
      items.push(createMockItem(`${path}/file${index}${ext}`, index));
      index++;
    }
  }
  return items;
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
