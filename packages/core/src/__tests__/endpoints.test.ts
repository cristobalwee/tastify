import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchNowPlaying,
  fetchTopTracks,
  fetchTopAlbums,
  fetchTopArtists,
  fetchRecentlyPlayed,
} from '../endpoints.js';
import { TastifyError } from '../types.js';

const mockTrack = {
  id: 'track-1',
  uri: 'spotify:track:1',
  name: 'Test Track',
  artists: [
    {
      id: 'artist-1',
      uri: 'spotify:artist:1',
      name: 'Test Artist',
      images: [{ url: 'https://img.spotify.com/artist.jpg', width: 300, height: 300 }],
      genres: ['pop'],
      external_urls: { spotify: 'https://open.spotify.com/artist/1' },
    },
  ],
  album: {
    id: 'album-1',
    uri: 'spotify:album:1',
    name: 'Test Album',
    images: [{ url: 'https://img.spotify.com/album.jpg', width: 300, height: 300 }],
    release_date: '2024-01-01',
    external_urls: { spotify: 'https://open.spotify.com/album/1' },
  },
  duration_ms: 210000,
  preview_url: null,
  external_urls: { spotify: 'https://open.spotify.com/track/1' },
  explicit: false,
};

function mockFetch(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {
      get: (key: string) => headers[key] ?? null,
    },
    json: () => Promise.resolve(body),
  });
}

describe('endpoints', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('fetchNowPlaying', () => {
    it('returns null on 204', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        headers: { get: () => null },
      });

      const result = await fetchNowPlaying('token');
      expect(result).toBeNull();
    });

    it('returns normalized NowPlayingData', async () => {
      globalThis.fetch = mockFetch({
        is_playing: true,
        item: mockTrack,
        progress_ms: 5000,
        device: { name: 'MacBook', type: 'Computer' },
      });

      const result = await fetchNowPlaying('token');
      expect(result).not.toBeNull();
      expect(result!.isPlaying).toBe(true);
      expect(result!.track.name).toBe('Test Track');
      expect(result!.track.durationMs).toBe(210000);
      expect(result!.track.artists[0]!.externalUrl).toBe(
        'https://open.spotify.com/artist/1',
      );
      expect(result!.track.album.releaseDate).toBe('2024-01-01');
      expect(result!.device).toEqual({ name: 'MacBook', type: 'Computer' });
    });

    it('sends auth header with correct URL', async () => {
      globalThis.fetch = mockFetch({
        is_playing: false,
        item: mockTrack,
        progress_ms: 0,
      });

      await fetchNowPlaying('my-token');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/me/player/currently-playing',
        { headers: { Authorization: 'Bearer my-token' } },
      );
    });
  });

  describe('fetchTopTracks', () => {
    it('constructs URL with query params', async () => {
      globalThis.fetch = mockFetch({ items: [mockTrack] });

      const result = await fetchTopTracks('token', 'short_term', 5);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=5',
        { headers: { Authorization: 'Bearer token' } },
      );
      expect(result.tracks).toHaveLength(1);
      expect(result.timeRange).toBe('short_term');
      expect(result.tracks[0]!.name).toBe('Test Track');
    });
  });

  describe('fetchTopArtists', () => {
    it('returns normalized artists', async () => {
      globalThis.fetch = mockFetch({
        items: [mockTrack.artists[0]],
      });

      const result = await fetchTopArtists('token', 'long_term', 10);
      expect(result.artists).toHaveLength(1);
      expect(result.artists[0]!.name).toBe('Test Artist');
      expect(result.artists[0]!.genres).toEqual(['pop']);
      expect(result.timeRange).toBe('long_term');
    });
  });

  describe('fetchTopAlbums', () => {
    it('returns unique albums derived from top tracks', async () => {
      globalThis.fetch = mockFetch({
        items: [
          mockTrack,
          { ...mockTrack, id: 'track-2', uri: 'spotify:track:2' },
          {
            ...mockTrack,
            id: 'track-3',
            uri: 'spotify:track:3',
            album: {
              ...mockTrack.album,
              id: 'album-2',
              uri: 'spotify:album:2',
              name: 'Second Album',
            },
          },
        ],
      });

      const result = await fetchTopAlbums('token', 'medium_term', 2);
      expect(result.albums).toHaveLength(2);
      expect(result.albums[0]!.name).toBe('Test Album');
      expect(result.albums[0]!.artists[0]!.name).toBe('Test Artist');
      expect(result.albums[1]!.name).toBe('Second Album');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=6',
        { headers: { Authorization: 'Bearer token' } },
      );
    });
  });

  describe('fetchRecentlyPlayed', () => {
    it('returns normalized recently played tracks', async () => {
      globalThis.fetch = mockFetch({
        items: [{ track: mockTrack, played_at: '2024-01-01T12:00:00Z' }],
      });

      const result = await fetchRecentlyPlayed('token', 10);
      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0]!.track.name).toBe('Test Track');
      expect(result.tracks[0]!.playedAt).toBe('2024-01-01T12:00:00Z');
    });
  });

  describe('error handling', () => {
    it('throws TastifyError on 401', async () => {
      globalThis.fetch = mockFetch({ error: 'Unauthorized' }, 401);

      await expect(fetchNowPlaying('bad-token')).rejects.toThrow(TastifyError);
      await expect(fetchNowPlaying('bad-token')).rejects.toMatchObject({
        status: 401,
      });
    });

    it('throws TastifyError with retryAfter on 429', async () => {
      globalThis.fetch = mockFetch(
        { error: 'Rate limited' },
        429,
        { 'Retry-After': '30' },
      );

      try {
        await fetchNowPlaying('token');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(TastifyError);
        expect((e as TastifyError).status).toBe(429);
        expect((e as TastifyError).retryAfter).toBe(30);
      }
    });
  });
});
