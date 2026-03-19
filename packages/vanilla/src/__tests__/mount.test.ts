import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, _sharedClients } from '../mount.js';

// Mock @tastify/core
vi.mock('@tastify/core', () => {
  const clients: Array<{ destroy: ReturnType<typeof vi.fn>; _config: unknown }> = [];

  class TastifyClient {
    _config: unknown;
    destroy = vi.fn();

    constructor(config: unknown) {
      this._config = config;
      clients.push(this);
    }

    async getNowPlaying() {
      return {
        isPlaying: true,
        track: {
          id: 't1',
          uri: 'spotify:track:t1',
          name: 'Test Track',
          artists: [{ id: 'a1', name: 'Test Artist', images: [], genres: [], uri: '', externalUrl: '' }],
          album: { id: 'al1', name: 'Test Album', images: [{ url: 'https://img.jpg', width: 300, height: 300 }], uri: '', releaseDate: '', externalUrl: '' },
          durationMs: 200000,
          previewUrl: null,
          externalUrl: 'https://open.spotify.com/track/t1',
          explicit: false,
        },
        progressMs: 100000,
        fetchedAt: Date.now(),
      };
    }

    async getTopTracks() {
      return {
        tracks: [{
          id: 't1',
          uri: 'spotify:track:t1',
          name: 'Track 1',
          artists: [{ id: 'a1', name: 'Artist', images: [], genres: [], uri: '', externalUrl: '' }],
          album: { id: 'al1', name: 'Album', images: [{ url: 'https://img.jpg', width: 300, height: 300 }], uri: '', releaseDate: '', externalUrl: '' },
          durationMs: 200000,
          previewUrl: null,
          externalUrl: '',
          explicit: false,
        }],
        timeRange: 'medium_term',
        fetchedAt: Date.now(),
      };
    }

    async getTopArtists() {
      return {
        artists: [{
          id: 'a1',
          uri: 'spotify:artist:a1',
          name: 'Artist 1',
          images: [{ url: 'https://img.jpg', width: 300, height: 300 }],
          genres: ['pop'],
          externalUrl: '',
        }],
        timeRange: 'medium_term',
        fetchedAt: Date.now(),
      };
    }

    async getRecentlyPlayed() {
      return {
        tracks: [{
          track: {
            id: 't1',
            uri: 'spotify:track:t1',
            name: 'Track',
            artists: [{ id: 'a1', name: 'Artist', images: [], genres: [], uri: '', externalUrl: '' }],
            album: { id: 'al1', name: 'Album', images: [{ url: 'https://img.jpg', width: 300, height: 300 }], uri: '', releaseDate: '', externalUrl: '' },
            durationMs: 200000,
            previewUrl: null,
            externalUrl: '',
            explicit: false,
          },
          playedAt: new Date().toISOString(),
        }],
        fetchedAt: Date.now(),
      };
    }

    onNowPlayingChange(_cb: unknown, _interval?: number) {
      return vi.fn();
    }
  }

  return {
    TastifyClient,
    _clients: clients,
  };
});

describe('mount()', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    _sharedClients.clear();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('mounts into a target element via selector', async () => {
    container.id = 'test-mount';
    const widget = mount('#test-mount', {
      type: 'top-tracks',
      token: 'test-token',
    });

    // Wait for async render
    await vi.waitFor(() => {
      expect(container.querySelector('.tf-top-tracks')).toBeTruthy();
    });

    widget.destroy();
  });

  it('mounts into a direct element reference', async () => {
    const widget = mount(container, {
      type: 'top-artists',
      token: 'test-token',
    });

    await vi.waitFor(() => {
      expect(container.querySelector('.tf-top-artists')).toBeTruthy();
    });

    widget.destroy();
  });

  it('throws for invalid selector', () => {
    expect(() =>
      mount('#nonexistent', { type: 'top-tracks', token: 'test' }),
    ).toThrow('element not found');
  });

  it('destroy() cleans up content', async () => {
    const widget = mount(container, {
      type: 'recently-played',
      token: 'test-token',
    });

    await vi.waitFor(() => {
      expect(container.querySelector('.tf-recently-played')).toBeTruthy();
    });

    widget.destroy();
    expect(container.textContent).toBe('');
  });

  it('shares client when same tokenUrl is used', () => {
    const el1 = document.createElement('div');
    const el2 = document.createElement('div');
    container.appendChild(el1);
    container.appendChild(el2);

    const w1 = mount(el1, { type: 'top-tracks', tokenUrl: '/api/token' });
    const w2 = mount(el2, { type: 'top-artists', tokenUrl: '/api/token' });

    expect(_sharedClients.size).toBe(1);
    expect(_sharedClients.get('/api/token')!.refCount).toBe(2);

    w1.destroy();
    expect(_sharedClients.get('/api/token')!.refCount).toBe(1);

    w2.destroy();
    expect(_sharedClients.size).toBe(0);
  });

  it('does not share client for different tokenUrls', () => {
    const el1 = document.createElement('div');
    const el2 = document.createElement('div');
    container.appendChild(el1);
    container.appendChild(el2);

    const w1 = mount(el1, { type: 'top-tracks', tokenUrl: '/api/token1' });
    const w2 = mount(el2, { type: 'top-tracks', tokenUrl: '/api/token2' });

    expect(_sharedClients.size).toBe(2);

    w1.destroy();
    w2.destroy();
  });

  it('mounts now-playing widget', async () => {
    const widget = mount(container, {
      type: 'now-playing',
      token: 'test-token',
    });

    await vi.waitFor(() => {
      expect(container.querySelector('.tf-now-playing')).toBeTruthy();
    });

    widget.destroy();
  });
});
