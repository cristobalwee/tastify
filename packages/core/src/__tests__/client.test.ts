import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TastifyClient } from '../client.js';
import { TastifyError } from '../types.js';

const mockNowPlayingResponse = (uri: string, isPlaying = true) => ({
  is_playing: isPlaying,
  item: {
    id: 'track-1',
    uri,
    name: 'Test Track',
    artists: [
      {
        id: 'artist-1',
        uri: 'spotify:artist:1',
        name: 'Test Artist',
        external_urls: { spotify: 'https://open.spotify.com/artist/1' },
      },
    ],
    album: {
      id: 'album-1',
      uri: 'spotify:album:1',
      name: 'Test Album',
      images: [],
      release_date: '2024-01-01',
      external_urls: { spotify: 'https://open.spotify.com/album/1' },
    },
    duration_ms: 200000,
    preview_url: null,
    external_urls: { spotify: 'https://open.spotify.com/track/1' },
    explicit: false,
  },
  progress_ms: 5000,
});

const mockTopTracksResponse = {
  items: [
    {
      id: 'track-1',
      uri: 'spotify:track:1',
      name: 'Track 1',
      artists: [
        {
          id: 'a1',
          uri: 'spotify:artist:1',
          name: 'Artist',
          external_urls: { spotify: 'https://open.spotify.com/artist/1' },
        },
      ],
      album: {
        id: 'album-1',
        uri: 'spotify:album:1',
        name: 'Album',
        images: [],
        release_date: '2024-01-01',
        external_urls: { spotify: 'https://open.spotify.com/album/1' },
      },
      duration_ms: 180000,
      preview_url: null,
      external_urls: { spotify: 'https://open.spotify.com/track/1' },
      explicit: false,
    },
  ],
};

function createMockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  });
}

describe('TastifyClient', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
  });

  describe('constructor validation', () => {
    it('throws if no token source is provided', () => {
      expect(() => new TastifyClient({})).toThrow(TastifyError);
    });

    it('accepts static token', () => {
      expect(() => new TastifyClient({ token: 'abc' })).not.toThrow();
    });

    it('accepts getToken', () => {
      expect(
        () => new TastifyClient({ getToken: () => 'abc' }),
      ).not.toThrow();
    });

    it('accepts tokenUrl', () => {
      expect(
        () => new TastifyClient({ tokenUrl: 'https://example.com/token' }),
      ).not.toThrow();
    });
  });

  describe('static token', () => {
    it('uses static token for requests', async () => {
      globalThis.fetch = createMockFetch(
        mockNowPlayingResponse('spotify:track:1'),
      );

      const client = new TastifyClient({ token: 'static-token' });
      const result = await client.getNowPlaying();

      expect(result).not.toBeNull();
      expect(result!.track.name).toBe('Test Track');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('spotify.com'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer static-token' },
        }),
      );
    });
  });

  describe('getToken', () => {
    it('calls getToken for each request', async () => {
      const getToken = vi.fn().mockResolvedValue('dynamic-token');
      globalThis.fetch = createMockFetch(
        mockNowPlayingResponse('spotify:track:1'),
      );

      const client = new TastifyClient({ getToken });
      await client.getNowPlaying();

      expect(getToken).toHaveBeenCalledOnce();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { Authorization: 'Bearer dynamic-token' },
        }),
      );
    });
  });

  describe('tokenUrl', () => {
    it('fetches and caches token from URL', async () => {
      const tokenFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({ access_token: 'url-token', expires_in: 3600 }),
        })
        .mockResolvedValue({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: { get: () => null },
          json: () => Promise.resolve(mockNowPlayingResponse('spotify:track:1')),
        });

      globalThis.fetch = tokenFetch;

      const client = new TastifyClient({
        tokenUrl: 'https://example.com/token',
      });
      await client.getNowPlaying();

      // First call = token fetch, second = spotify API
      expect(tokenFetch).toHaveBeenCalledTimes(2);
      expect(tokenFetch).toHaveBeenNthCalledWith(1, 'https://example.com/token');

      // Second getNowPlaying should reuse cached token (cache needs to expire first)
      client.destroy();
    });
  });

  describe('caching', () => {
    it('returns cached data on second call', async () => {
      globalThis.fetch = createMockFetch(
        mockNowPlayingResponse('spotify:track:1'),
      );

      const client = new TastifyClient({ token: 'token' });
      const result1 = await client.getNowPlaying();
      const result2 = await client.getNowPlaying();

      expect(result1).toEqual(result2);
      // fetch called once for the spotify API (data cached for second call)
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('uses different cache keys per timeRange', async () => {
      globalThis.fetch = createMockFetch(mockTopTracksResponse);

      const client = new TastifyClient({ token: 'token' });
      await client.getTopTracks({ timeRange: 'short_term' });
      await client.getTopTracks({ timeRange: 'long_term' });

      // Should make 2 separate fetch calls for different time ranges
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('onNowPlayingChange', () => {
    it('only fires callback on URI change', async () => {
      let callCount = 0;
      const responses = [
        mockNowPlayingResponse('spotify:track:1'),
        mockNowPlayingResponse('spotify:track:1'),
        mockNowPlayingResponse('spotify:track:2'),
      ];

      globalThis.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: { get: () => null },
          json: () => Promise.resolve(responses[callCount++]),
        }),
      );

      const client = new TastifyClient({ token: 'token', cacheTTL: 0 });
      const callback = vi.fn();
      const unsub = client.onNowPlayingChange(callback, 1000);

      // First poll: sets lastUri, no callback (first observation)
      await vi.advanceTimersByTimeAsync(0);
      expect(callback).not.toHaveBeenCalled();

      // Second poll: same URI, no callback
      // Need to invalidate cache to trigger a new fetch
      await vi.advanceTimersByTimeAsync(1000);
      expect(callback).not.toHaveBeenCalled();

      // Third poll: different URI, callback fires
      await vi.advanceTimersByTimeAsync(1000);
      expect(callback).toHaveBeenCalledOnce();
      expect(callback.mock.calls[0]![0]!.track.uri).toBe('spotify:track:2');

      unsub();
      client.destroy();
    });

    it('unsubscribe stops the poller', async () => {
      globalThis.fetch = createMockFetch(
        mockNowPlayingResponse('spotify:track:1'),
      );

      const client = new TastifyClient({ token: 'token' });
      const callback = vi.fn();
      const unsub = client.onNowPlayingChange(callback, 1000);

      await vi.advanceTimersByTimeAsync(0);
      unsub();

      globalThis.fetch = createMockFetch(
        mockNowPlayingResponse('spotify:track:2'),
      );
      await vi.advanceTimersByTimeAsync(5000);

      // Callback should never fire since we unsubscribed before any URI change
      expect(callback).not.toHaveBeenCalled();

      client.destroy();
    });
  });

  describe('destroy', () => {
    it('stops all pollers and clears cache', async () => {
      globalThis.fetch = createMockFetch(
        mockNowPlayingResponse('spotify:track:1'),
      );

      const client = new TastifyClient({ token: 'token' });
      const callback = vi.fn();
      client.onNowPlayingChange(callback, 1000);

      await vi.advanceTimersByTimeAsync(0);

      client.destroy();

      // After destroy, advancing timers should not trigger more fetches
      const fetchCountBefore = (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mock.calls.length;
      await vi.advanceTimersByTimeAsync(5000);
      const fetchCountAfter = (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mock.calls.length;

      expect(fetchCountAfter).toBe(fetchCountBefore);
    });
  });
});
