import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';

const mockTrack = {
  id: '1',
  uri: 'spotify:track:1',
  name: 'Test Track',
  artists: [{ id: 'a1', uri: '', name: 'Test Artist', images: [], genres: [], externalUrl: '' }],
  album: { id: 'al1', uri: '', name: 'Test Album', images: [{ url: 'https://img.test/1', width: 300, height: 300 }], releaseDate: '2024-01-01', externalUrl: '' },
  durationMs: 200_000,
  previewUrl: null,
  externalUrl: 'https://open.spotify.com/track/1',
  explicit: false,
};

const mockNowPlaying = {
  isPlaying: true,
  track: mockTrack,
  progressMs: 90_000,
  fetchedAt: Date.now(),
};

const { getNowPlayingMock, getRecentlyPlayedMock, onNowPlayingChangeMock, unsubFn } = vi.hoisted(
  () => {
    const unsubFn = vi.fn();
    const getNowPlayingMock = vi.fn();
    const getRecentlyPlayedMock = vi.fn();
    const onNowPlayingChangeMock = vi.fn(() => unsubFn);
    return { getNowPlayingMock, getRecentlyPlayedMock, onNowPlayingChangeMock, unsubFn };
  },
);

vi.mock('@tastify/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tastify/core')>();
  const TastifyClient = vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    getNowPlaying: getNowPlayingMock,
    getTopTracks: vi.fn(),
    getTopArtists: vi.fn(),
    getRecentlyPlayed: getRecentlyPlayedMock,
    onNowPlayingChange: onNowPlayingChangeMock,
  }));
  const TastifyError = class extends Error {
    status: number;
    constructor(msg: string, status: number) {
      super(msg);
      this.name = 'TastifyError';
      this.status = status;
    }
  };
  return {
    ...actual,
    syncNowPlayingSkeletonWidths: vi.fn(),
    TastifyClient,
    TastifyError,
  };
});

import { TastifyProvider } from '../provider.js';
import { useNowPlaying } from '../hooks/useNowPlaying.js';

beforeEach(() => {
  vi.clearAllMocks();
  getNowPlayingMock.mockResolvedValue(mockNowPlaying);
  getRecentlyPlayedMock.mockResolvedValue({ tracks: [], fetchedAt: Date.now() });
  onNowPlayingChangeMock.mockReturnValue(unsubFn);
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <TastifyProvider token="test-token">{children}</TastifyProvider>
);

describe('useNowPlaying', () => {
  it('transitions from loading to success', async () => {
    const { result } = renderHook(() => useNowPlaying({ pollInterval: 0 }), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current).toEqual({
      status: 'success',
      data: mockNowPlaying,
    });
  });

  it('subscribes to polling when pollInterval > 0', async () => {
    const { result } = renderHook(() => useNowPlaying({ pollInterval: 5000 }), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(onNowPlayingChangeMock).toHaveBeenCalledWith(
      expect.any(Function),
      5000,
    );
  });

  it('cleans up subscription on unmount', async () => {
    const { result, unmount } = renderHook(
      () => useNowPlaying({ pollInterval: 5000 }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    unmount();
    expect(unsubFn).toHaveBeenCalled();
  });

  it('polling triggers re-render on track change', async () => {
    const { result } = renderHook(
      () => useNowPlaying({ pollInterval: 5000 }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    const calls = onNowPlayingChangeMock.mock.calls as unknown[][];
    const changeCallback = calls[0]?.[0] as
      | ((data: typeof mockNowPlaying) => void)
      | undefined;
    expect(changeCallback).toBeDefined();

    const newData = {
      ...mockNowPlaying,
      track: { ...mockTrack, name: 'New Track', uri: 'spotify:track:2' },
    };

    act(() => {
      changeCallback!(newData);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
      if (result.current.status === 'success') {
        expect(result.current.data?.track.name).toBe('New Track');
      }
    });
  });

  it('uses recently played when nothing is playing and fallbackToRecent is true', async () => {
    getNowPlayingMock.mockResolvedValue(null);
    getRecentlyPlayedMock.mockResolvedValue({
      tracks: [{ track: mockTrack, playedAt: '2024-01-01T00:00:00Z' }],
      fetchedAt: Date.now(),
    });

    const { result } = renderHook(
      () => useNowPlaying({ pollInterval: 0, fallbackToRecent: true }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
    expect(getRecentlyPlayedMock).toHaveBeenCalledWith({ limit: 1 });
    if (result.current.status === 'success') {
      expect(result.current.data?.track.name).toBe('Test Track');
      expect(result.current.data?.isPlaying).toBe(true);
    }
  });
});
