import type {
  TastifyImage,
  TastifyAlbum,
  TastifyArtist,
  TastifyTrack,
  NowPlayingData,
  TopTracksData,
  TopArtistsData,
  RecentlyPlayedData,
  TimeRange,
} from './types.js';
import { TastifyError } from './types.js';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const ENDPOINTS = {
  nowPlaying: '/me/player/currently-playing',
  topTracks: '/me/top/tracks',
  topArtists: '/me/top/artists',
  recentlyPlayed: '/me/player/recently-played',
} as const;

// Raw Spotify API interfaces
interface RawImage {
  url: string;
  width: number;
  height: number;
}

interface RawAlbum {
  id: string;
  uri: string;
  name: string;
  images: RawImage[];
  release_date: string;
  external_urls: { spotify: string };
}

interface RawArtist {
  id: string;
  uri: string;
  name: string;
  images?: RawImage[];
  genres?: string[];
  external_urls: { spotify: string };
}

interface RawTrack {
  id: string;
  uri: string;
  name: string;
  artists: RawArtist[];
  album: RawAlbum;
  duration_ms: number;
  preview_url: string | null;
  external_urls: { spotify: string };
  explicit: boolean;
}

interface RawNowPlaying {
  is_playing: boolean;
  item: RawTrack;
  progress_ms: number;
  device?: { name: string; type: string };
}

interface RawTopTracks {
  items: RawTrack[];
}

interface RawTopArtists {
  items: RawArtist[];
}

interface RawRecentlyPlayed {
  items: Array<{ track: RawTrack; played_at: string }>;
}

function normalizeImage(raw: RawImage): TastifyImage {
  return { url: raw.url, width: raw.width, height: raw.height };
}

function normalizeAlbum(raw: RawAlbum): TastifyAlbum {
  return {
    id: raw.id,
    uri: raw.uri,
    name: raw.name,
    images: raw.images.map(normalizeImage),
    releaseDate: raw.release_date,
    externalUrl: raw.external_urls.spotify,
  };
}

function normalizeArtist(raw: RawArtist): TastifyArtist {
  return {
    id: raw.id,
    uri: raw.uri,
    name: raw.name,
    images: (raw.images ?? []).map(normalizeImage),
    genres: raw.genres ?? [],
    externalUrl: raw.external_urls.spotify,
  };
}

function normalizeTrack(raw: RawTrack): TastifyTrack {
  return {
    id: raw.id,
    uri: raw.uri,
    name: raw.name,
    artists: raw.artists.map(normalizeArtist),
    album: normalizeAlbum(raw.album),
    durationMs: raw.duration_ms,
    previewUrl: raw.preview_url,
    externalUrl: raw.external_urls.spotify,
    explicit: raw.explicit,
  };
}

async function spotifyFetch(endpoint: string, token: string): Promise<Response> {
  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 204) return response;

  if (!response.ok) {
    const retryAfter =
      response.status === 429
        ? Number(response.headers.get('Retry-After')) || undefined
        : undefined;
    throw new TastifyError(
      `Spotify API error: ${response.status} ${response.statusText}`,
      response.status,
      retryAfter,
    );
  }

  return response;
}

export async function fetchNowPlaying(token: string): Promise<NowPlayingData | null> {
  const response = await spotifyFetch(ENDPOINTS.nowPlaying, token);
  if (response.status === 204) return null;

  const raw: RawNowPlaying = await response.json();
  return {
    isPlaying: raw.is_playing,
    track: normalizeTrack(raw.item),
    progressMs: raw.progress_ms,
    device: raw.device ? { name: raw.device.name, type: raw.device.type } : undefined,
    fetchedAt: Date.now(),
  };
}

export async function fetchTopTracks(
  token: string,
  timeRange: TimeRange = 'medium_term',
  limit: number = 20,
): Promise<TopTracksData> {
  const response = await spotifyFetch(
    `${ENDPOINTS.topTracks}?time_range=${timeRange}&limit=${limit}`,
    token,
  );
  const raw: RawTopTracks = await response.json();
  return {
    tracks: raw.items.map(normalizeTrack),
    timeRange,
    fetchedAt: Date.now(),
  };
}

export async function fetchTopArtists(
  token: string,
  timeRange: TimeRange = 'medium_term',
  limit: number = 20,
): Promise<TopArtistsData> {
  const response = await spotifyFetch(
    `${ENDPOINTS.topArtists}?time_range=${timeRange}&limit=${limit}`,
    token,
  );
  const raw: RawTopArtists = await response.json();
  return {
    artists: raw.items.map(normalizeArtist),
    timeRange,
    fetchedAt: Date.now(),
  };
}

export async function fetchRecentlyPlayed(
  token: string,
  limit: number = 20,
): Promise<RecentlyPlayedData> {
  const response = await spotifyFetch(
    `${ENDPOINTS.recentlyPlayed}?limit=${limit}`,
    token,
  );
  const raw: RawRecentlyPlayed = await response.json();
  return {
    tracks: raw.items.map((item) => ({
      track: normalizeTrack(item.track),
      playedAt: item.played_at,
    })),
    fetchedAt: Date.now(),
  };
}
