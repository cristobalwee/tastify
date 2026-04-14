export interface TastifyImage {
  url: string;
  width: number;
  height: number;
}

export interface TastifyAlbum {
  id: string;
  uri: string;
  name: string;
  images: TastifyImage[];
  releaseDate: string;
  externalUrl: string;
}

export interface TastifyArtist {
  id: string;
  uri: string;
  name: string;
  images: TastifyImage[];
  genres: string[];
  externalUrl: string;
}

export interface TastifyTrack {
  id: string;
  uri: string;
  name: string;
  artists: TastifyArtist[];
  album: TastifyAlbum;
  durationMs: number;
  previewUrl: string | null;
  externalUrl: string;
  explicit: boolean;
}

export interface NowPlayingData {
  isPlaying: boolean;
  track: TastifyTrack;
  progressMs: number;
  device?: { name: string; type: string };
  fetchedAt: number;
}

export type TimeRange = 'short_term' | 'medium_term' | 'long_term';

export interface TopTracksData {
  tracks: TastifyTrack[];
  timeRange: TimeRange;
  fetchedAt: number;
}

export interface TastifyTopAlbum {
  id: string;
  uri: string;
  name: string;
  images: TastifyImage[];
  releaseDate: string;
  externalUrl: string;
  artists: TastifyArtist[];
}

export interface TopAlbumsData {
  albums: TastifyTopAlbum[];
  timeRange: TimeRange;
  fetchedAt: number;
}

export interface TopArtistsData {
  artists: TastifyArtist[];
  timeRange: TimeRange;
  fetchedAt: number;
}

export interface RecentlyPlayedData {
  tracks: Array<{ track: TastifyTrack; playedAt: string }>;
  fetchedAt: number;
}

export type DataState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: TastifyError };

export class TastifyError extends Error {
  public status: number;
  public retryAfter?: number;

  constructor(message: string, status: number, retryAfter?: number) {
    super(message);
    this.name = 'TastifyError';
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

export interface TastifyConfig {
  token?: string;
  getToken?: () => Promise<string> | string;
  tokenUrl?: string;
  cacheTTL?: number;
}
