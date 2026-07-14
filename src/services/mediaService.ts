import {MediaFile} from '../types';

class MediaService {
  async loadFile(uri: string): Promise<MediaFile | null> {
    // TODO: Load media file metadata
    return null;
  }

  async scanDirectory(path: string): Promise<MediaFile[]> {
    // TODO: Scan a directory for media files
    return [];
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

export const mediaService = new MediaService();
