import {MediaFile, Playlist} from '../types';

class PlaylistService {
  private playlists: Playlist[] = [];

  async loadPlaylists(): Promise<Playlist[]> {
    // TODO: Load playlists from storage
    return this.playlists;
  }

  async createPlaylist(title: string, files?: MediaFile[]): Promise<Playlist> {
    const playlist: Playlist = {
      id: Date.now().toString(),
      title,
      files: files || [],
    };
    this.playlists.push(playlist);
    return playlist;
  }

  async addToPlaylist(playlistId: string, file: MediaFile): Promise<void> {
    const playlist = this.playlists.find(p => p.id === playlistId);
    if (playlist) {
      playlist.files.push(file);
    }
  }

  async removeFromPlaylist(
    playlistId: string,
    fileIndex: number,
  ): Promise<void> {
    const playlist = this.playlists.find(p => p.id === playlistId);
    if (playlist && fileIndex >= 0 && fileIndex < playlist.files.length) {
      playlist.files.splice(fileIndex, 1);
    }
  }
}

export const playlistService = new PlaylistService();
