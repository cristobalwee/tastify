import type {
  TastifyConfig,
  TastifyTrack,
  NowPlayingData,
  TopTracksData,
  TopAlbumsData,
  TopArtistsData,
  RecentlyPlayedData,
  TimeRange,
} from './types.js';
import { TastifyError } from './types.js';
import { Cache } from './cache.js';
import {
  fetchNowPlaying,
  fetchTopTracks,
  fetchTopAlbums,
  fetchTopArtists,
  fetchRecentlyPlayed,
  fetchArtistTopTracks,
} from './endpoints.js';
import { createPoller, type Poller } from './poller.js';

const DEFAULT_SOFT_TTL = {
  nowPlaying: 30_000,
  recentlyPlayed: 60_000,
  topTracks: 300_000,
  topAlbums: 300_000,
  topArtists: 300_000,
} as const;

const HARD_TTL_MULTIPLIER = 3;
const TOKEN_SAFETY_BUFFER = 5 * 60 * 1000; // 5 minutes

export class TastifyClient {
  private config: TastifyConfig;
  private cache = new Cache();
  private pollers: Poller[] = [];
  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor(config: TastifyConfig) {
    if (!config.token && !config.getToken && !config.tokenUrl) {
      throw new TastifyError(
        'TastifyConfig must include at least one of: token, getToken, or tokenUrl',
        0,
      );
    }
    this.config = config;
  }

  /** Returns the current access token. Used by the Web Playback SDK. */
  async getAccessToken(): Promise<string> {
    return this.resolveToken();
  }

  private async resolveToken(): Promise<string> {
    if (this.config.getToken) {
      return this.config.getToken();
    }

    if (this.config.tokenUrl) {
      if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
        return this.cachedToken.value;
      }

      const response = await fetch(this.config.tokenUrl);
      if (!response.ok) {
        throw new TastifyError(
          `Token fetch failed: ${response.status} ${response.statusText}`,
          response.status,
        );
      }

      const data: { access_token: string; expires_in: number } = await response.json();
      this.cachedToken = {
        value: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000 - TOKEN_SAFETY_BUFFER,
      };
      return this.cachedToken.value;
    }

    return this.config.token!;
  }

  private softTTL(key: keyof typeof DEFAULT_SOFT_TTL): number {
    return this.config.cacheTTL ?? DEFAULT_SOFT_TTL[key];
  }

  private hardTTL(key: keyof typeof DEFAULT_SOFT_TTL): number {
    return this.softTTL(key) * HARD_TTL_MULTIPLIER;
  }

  async getNowPlaying(): Promise<NowPlayingData | null> {
    const token = await this.resolveToken();
    return this.cache.getOrFetch(
      'now-playing',
      () => fetchNowPlaying(token),
      this.softTTL('nowPlaying'),
      this.hardTTL('nowPlaying'),
    );
  }

  async getTopTracks(opts?: {
    timeRange?: TimeRange;
    limit?: number;
  }): Promise<TopTracksData> {
    const timeRange = opts?.timeRange ?? 'medium_term';
    const limit = opts?.limit ?? 20;
    const token = await this.resolveToken();
    return this.cache.getOrFetch(
      `top-tracks:${timeRange}:${limit}`,
      () => fetchTopTracks(token, timeRange, limit),
      this.softTTL('topTracks'),
      this.hardTTL('topTracks'),
    );
  }

  async getTopAlbums(opts?: {
    timeRange?: TimeRange;
    limit?: number;
  }): Promise<TopAlbumsData> {
    const timeRange = opts?.timeRange ?? 'medium_term';
    const limit = opts?.limit ?? 20;
    const token = await this.resolveToken();
    return this.cache.getOrFetch(
      `top-albums:${timeRange}:${limit}`,
      () => fetchTopAlbums(token, timeRange, limit),
      this.softTTL('topAlbums'),
      this.hardTTL('topAlbums'),
    );
  }

  async getTopArtists(opts?: {
    timeRange?: TimeRange;
    limit?: number;
  }): Promise<TopArtistsData> {
    const timeRange = opts?.timeRange ?? 'medium_term';
    const limit = opts?.limit ?? 20;
    const token = await this.resolveToken();
    return this.cache.getOrFetch(
      `top-artists:${timeRange}:${limit}`,
      () => fetchTopArtists(token, timeRange, limit),
      this.softTTL('topArtists'),
      this.hardTTL('topArtists'),
    );
  }

  async getRecentlyPlayed(opts?: {
    limit?: number;
  }): Promise<RecentlyPlayedData> {
    const limit = opts?.limit ?? 20;
    const token = await this.resolveToken();
    return this.cache.getOrFetch(
      `recently-played:${limit}`,
      () => fetchRecentlyPlayed(token, limit),
      this.softTTL('recentlyPlayed'),
      this.hardTTL('recentlyPlayed'),
    );
  }

  async getArtistTopTracks(
    artistId: string,
    opts?: { market?: string },
  ): Promise<TastifyTrack[]> {
    const token = await this.resolveToken();
    return this.cache.getOrFetch(
      `artist-top-tracks:${artistId}`,
      () => fetchArtistTopTracks(token, artistId, opts?.market),
      this.softTTL('topTracks'),
      this.hardTTL('topTracks'),
    );
  }

  onNowPlayingChange(
    callback: (data: NowPlayingData | null) => void,
    intervalMs: number = 15_000,
  ): () => void {
    let lastUri: string | null | undefined = undefined;

    const poller = createPoller(async () => {
      try {
        const data = await this.getNowPlaying();
        const currentUri = data?.track.uri ?? null;
        if (lastUri !== undefined && currentUri !== lastUri) {
          callback(data);
        }
        lastUri = currentUri;
      } catch {
        // Silently ignore polling errors
      }
    }, intervalMs);

    this.pollers.push(poller);
    poller.start();

    return () => {
      poller.stop();
      this.pollers = this.pollers.filter((p) => p !== poller);
    };
  }

  destroy(): void {
    for (const poller of this.pollers) {
      poller.stop();
    }
    this.pollers = [];
    this.cache.clear();
  }
}
