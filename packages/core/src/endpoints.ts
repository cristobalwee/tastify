import type {
  TastifyImage,
  TastifyAlbum,
  TastifyArtist,
  TastifyTrack,
  TastifyTopAlbum,
  NowPlayingData,
  TopTracksData,
  TopAlbumsData,
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

async function spotifyRequest(
  endpoint: string,
  token: string,
  method: string,
  body?: unknown,
): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204 || response.status === 202) return response;

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

export async function fetchTopAlbums(
  token: string,
  timeRange: TimeRange = 'medium_term',
  limit: number = 20,
): Promise<TopAlbumsData> {
  const fetchLimit = Math.min(Math.max(limit * 3, limit), 50);
  const response = await spotifyFetch(
    `${ENDPOINTS.topTracks}?time_range=${timeRange}&limit=${fetchLimit}`,
    token,
  );
  const raw: RawTopTracks = await response.json();

  const albums: TastifyTopAlbum[] = [];
  const seen = new Set<string>();

  for (const track of raw.items) {
    const album = track.album;
    if (seen.has(album.id)) {
      continue;
    }
    seen.add(album.id);
    albums.push({
      ...normalizeAlbum(album),
      artists: track.artists.map(normalizeArtist),
    });
    if (albums.length >= limit) {
      break;
    }
  }

  return {
    albums,
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

export async function fetchArtistTopTracks(
  token: string,
  artistId: string,
  market: string = 'US',
): Promise<TastifyTrack[]> {
  const response = await spotifyFetch(
    `/artists/${encodeURIComponent(artistId)}/top-tracks?market=${encodeURIComponent(market)}`,
    token,
  );
  const raw: { tracks: RawTrack[] } = await response.json();
  return raw.tracks.map(normalizeTrack);
}

// --- Web Playback SDK control endpoints ---

export async function startPlayback(
  token: string,
  deviceId: string,
  uris: string[],
  positionMs: number = 0,
  offset: number = 0,
): Promise<void> {
  await spotifyRequest(
    `/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
    token,
    'PUT',
    { uris, offset: { position: offset }, position_ms: positionMs },
  );
}

export async function pausePlayback(
  token: string,
  deviceId: string,
): Promise<void> {
  await spotifyRequest(
    `/me/player/pause?device_id=${encodeURIComponent(deviceId)}`,
    token,
    'PUT',
  );
}

export async function resumePlayback(
  token: string,
  deviceId: string,
): Promise<void> {
  await spotifyRequest(
    `/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
    token,
    'PUT',
  );
}

export async function seekPlayback(
  token: string,
  deviceId: string,
  positionMs: number,
): Promise<void> {
  await spotifyRequest(
    `/me/player/seek?position_ms=${Math.round(positionMs)}&device_id=${encodeURIComponent(deviceId)}`,
    token,
    'PUT',
  );
}

export async function skipToNext(
  token: string,
  deviceId: string,
): Promise<void> {
  await spotifyRequest(
    `/me/player/next?device_id=${encodeURIComponent(deviceId)}`,
    token,
    'POST',
  );
}

export async function skipToPrevious(
  token: string,
  deviceId: string,
): Promise<void> {
  await spotifyRequest(
    `/me/player/previous?device_id=${encodeURIComponent(deviceId)}`,
    token,
    'POST',
  );
}

export async function transferPlayback(
  token: string,
  deviceId: string,
  play: boolean = true,
): Promise<void> {
  await spotifyRequest('/me/player', token, 'PUT', {
    device_ids: [deviceId],
    play,
  });
}
