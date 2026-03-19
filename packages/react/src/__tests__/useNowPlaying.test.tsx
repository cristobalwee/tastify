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

const { getNowPlayingMock, onNowPlayingChangeMock, unsubFn } = vi.hoisted(() => {
  const unsubFn = vi.fn();
  const getNowPlayingMock = vi.fn();
  const onNowPlayingChangeMock = vi.fn(() => unsubFn);
  return { getNowPlayingMock, onNowPlayingChangeMock, unsubFn };
});

vi.mock('@tastify/core', () => {
  const TastifyClient = vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    getNowPlaying: getNowPlayingMock,
    getTopTracks: vi.fn(),
    getTopArtists: vi.fn(),
    getRecentlyPlayed: vi.fn(),
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
  return { TastifyClient, TastifyError };
});

import { TastifyProvider } from '../provider.js';
import { useNowPlaying } from '../hooks/useNowPlaying.js';

beforeEach(() => {
  vi.clearAllMocks();
  getNowPlayingMock.mockResolvedValue(mockNowPlaying);
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

    expect(result.current.status).toBe('success');
    if (result.current.status === 'success') {
      expect(result.current.data?.track.name).toBe('New Track');
    }
  });
});
