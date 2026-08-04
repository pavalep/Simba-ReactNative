// ─── Shared API Result Types for Phase 0 Content Integrations ─────────────

export interface ApiConfig {
  baseUrl: string;
  apiKey?: string;
  apiSecret?: string;
  rateLimitMs: number;
}

export interface ApiSearchOptions {
  page?: number;
  limit?: number;
  language?: string;
}

// ─── TVMaze ─────────────────────────────────────────────────────────────

export interface TVMazeShow {
  id: number;
  name: string;
  summary: string;
  image: {medium: string; original: string} | null;
  genres: string[];
  status: string;
  premiered: string;
  // ── P38: optional fields surfaced by /shows + /shows/:id ──
  rating?: {average: number | null} | null;
  runtime?: number | null;
  network?: {name: string} | null;
  type?: string;
}

export interface TVMazeEpisode {
  id: number;
  name: string;
  season: number;
  number: number;
  airdate: string;
  summary: string;
  image: {medium: string; original: string} | null;
}

// ─── MusicBrainz ─────────────────────────────────────────────────────────

export interface MusicBrainzArtist {
  id: string;
  name: string;
  sortName: string;
  type: string;
  country: string;
  disambiguation: string;
}

export interface MusicBrainzRelease {
  id: string;
  title: string;
  date: string;
  country: string;
  status: string;
  coverArtUrl: string | null;
}

// ─── P39: release-group detail (recordings) ─────────────────────────────

export interface MusicBrainzRecording {
  id: string;
  title: string;
  length: number;
}

export interface MusicBrainzReleaseGroupDetail {
  id: string;
  title: string;
  date: string;
  primaryType: string;
  coverArtUrl: string | null;
  recordings: MusicBrainzRecording[];
}

// ─── Podcast Index ──────────────────────────────────────────────────────

export interface PodcastResult {
  id: number;
  title: string;
  author: string;
  description: string;
  image: string;
  feedUrl: string;
  episodeCount: number;
  categories: Record<string, string>;
}

export interface PodcastEpisodeResult {
  id: number;
  title: string;
  description: string;
  datePublished: number;
  duration: number;
  image: string;
  feedUrl: string;
  enclosureUrl: string;
  enclosureType: string;
}

// ─── Radio Browser ──────────────────────────────────────────────────────

export interface RadioStationResult {
  stationuuid: string;
  name: string;
  url: string;
  urlResolved: string;
  favicon: string;
  tags: string;
  country: string;
  language: string;
  codec: string;
  bitrate: number;
  clickCount: number;
}

// ─── LibriVox ───────────────────────────────────────────────────────────

export interface AudiobookResult {
  id: number;
  title: string;
  author: string;
  description: string;
  urlZipFile: string;
  urlLibrivox: string;
  urlIArchive: string;
  totalTime: number;
  language: string;
}

// ─── Audius ──────────────────────────────────────────────────────────────

export interface AudiusTrackResult {
  id: string;
  title: string;
  artistName: string;
  artistId: string;
  duration: number;
  genre: string;
  streamUrl: string;
  artworkUrl: string;
  description: string;
}

// ─── IPTV-org ───────────────────────────────────────────────────────────

export interface IPTVChannelResult {
  id: string;
  name: string;
  url: string;
  logo: string;
  country: string;
  countryCode: string;
  language: string;
  category: string;
  isPlayable: boolean;
}

export interface IPTVCategory {
  id: string;
  name: string;
  channelCount: number;
}

// ─── Jamendo ────────────────────────────────────────────────────────────

export interface JamendoTrackResult {
  id: number;
  name: string;
  artistName: string;
  albumName: string;
  duration: number;
  audioUrl: string;
  imageUrl: string;
  genreName: string;
}

export interface JamendoAlbumResult {
  id: number;
  name: string;
  artistName: string;
  releaseDate: string;
  imageUrl: string;
  trackCount: number;
}

// ─── Internet Archive Audio ──────────────────────────────────────────────

export interface InternetArchiveItemResult {
  identifier: string;
  title: string;
  description: string;
  creator: string;
  year: string;
  runtime: string;
  avgRating: number;
  downloadCount: number;
  imageUrl: string;
  streamingUrl: string;
  downloadUrls: {format: string; url: string}[];
}

/** P37: a single streamable audio file inside an archive item (chapter/track). */
export interface ArchiveTrack {
  name: string;
  title: string;
  url: string;
  lengthSeconds: number;
  format: string;
  trackNumber: number;
}

// ─── Internet Archive Video (Movies) ─────────────────────────────────────

export interface InternetArchiveSubtitleFile {
  language: string;
  url: string;
  format: 'srt' | 'vtt';
}

export interface InternetArchiveAudioTrack {
  name: string;
  url: string;
  format: string;
}

export interface InternetArchiveVideoResult {
  identifier: string;
  title: string;
  description: string;
  creator: string;
  year: string;
  duration: number;
  avgRating: number;
  downloadCount: number;
  imageUrl: string;
  subtitles: InternetArchiveSubtitleFile[];
  audioTracks: InternetArchiveAudioTrack[];
  downloadUrls: {format: string; url: string}[];
}

// ─── Aggregated Search ──────────────────────────────────────────────────

export interface AggregatedSearchResults {
  podcasts: PodcastResult[];
  radioStations: RadioStationResult[];
  audiobooks: AudiobookResult[];
  iptvChannels: IPTVChannelResult[];
  jamendoTracks: JamendoTrackResult[];
  internetArchiveItems: InternetArchiveItemResult[];
  audiusTracks: AudiusTrackResult[];
}
