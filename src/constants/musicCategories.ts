// ─── Pre-built Music Categories ─────────────────────────────────────────
// Pre-filled genre tabs for Jamendo / Audius discovery.

export interface MusicCategory {
  id: string;
  name: string;
  icon: string;
  /** Passed as genre or tag to Jamendo/Audius */
  genre: string;
}

export const MUSIC_CATEGORIES: MusicCategory[] = [
  {id: 'rock', name: 'Rock', icon: 'music', genre: 'rock'},
  {id: 'pop', name: 'Pop', icon: 'music', genre: 'pop'},
  {id: 'electronic', name: 'Electronic', icon: 'speed', genre: 'electronic'},
  {id: 'jazz', name: 'Jazz', icon: 'listMusic', genre: 'jazz'},
  {id: 'classical', name: 'Classical', icon: 'search', genre: 'classical'},
  {id: 'hip-hop', name: 'Hip-Hop', icon: 'music', genre: 'hip-hop'},
  {id: 'ambient', name: 'Ambient', icon: 'camera', genre: 'ambient'},
  {id: 'folk', name: 'Folk', icon: 'folder', genre: 'folk'},
  {id: 'blues', name: 'Blues', icon: 'sliders', genre: 'blues'},
  {id: 'reggae', name: 'Reggae', icon: 'video', genre: 'reggae'},
];
