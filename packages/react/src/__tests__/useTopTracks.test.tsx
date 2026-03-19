import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { TastifyProvider } from '../provider.js';
import { useTopTracks } from '../hooks/useTopTracks.js';

const mockTrack = {
  id: '1',
  uri: 'spotify:track:1',
  name: 'Test Track',
  artists: [{ id: 'a1', uri: '', name: 'Artist', images: [], genres: [], externalUrl: '' }],
  album: { id: 'al1', uri: '', name: 'Album', images: [], releaseDate: '2024-01-01', externalUrl: '' },
  durationMs: 200_000,
  previewUrl: null,
  externalUrl: '',
  explicit: false,
};

const mockTopTracks = {
  tracks: [mockTrack],
  timeRange: 'medium_term' as const,
  fetchedAt: Date.now(),
};

let mockClient: Record<string, Mock>;

vi.mock('@tastify/core', () => {
  const TastifyClient = vi.fn().mockImplementation(() => {
    mockClient = {
      destroy: vi.fn(),
      getNowPlaying: vi.fn(),
      getTopTracks: vi.fn().mockResolvedValue(mockTopTracks),
      getTopArtists: vi.fn(),
      getRecentlyPlayed: vi.fn(),
      onNowPlayingChange: vi.fn(() => vi.fn()),
    };
    return mockClient;
  });
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

beforeEach(() => {
  vi.clearAllMocks();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <TastifyProvider token="test-token">{children}</TastifyProvider>
);

describe('useTopTracks', () => {
  it('fetches on mount', async () => {
    const { result } = renderHook(() => useTopTracks(), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    if (result.current.status === 'success') {
      expect(result.current.data.tracks).toHaveLength(1);
      expect(result.current.data.tracks[0]!.name).toBe('Test Track');
    }
  });

  it('refetches when timeRange changes', async () => {
    const { result, rerender } = renderHook(
      ({ timeRange }: { timeRange?: 'short_term' | 'medium_term' | 'long_term' }) =>
        useTopTracks({ timeRange }),
      { wrapper, initialProps: { timeRange: 'medium_term' as 'short_term' | 'medium_term' | 'long_term' } },
    );

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(mockClient.getTopTracks).toHaveBeenCalledWith({
      timeRange: 'medium_term',
      limit: 10,
    });

    rerender({ timeRange: 'short_term' });

    await waitFor(() => {
      expect(mockClient.getTopTracks).toHaveBeenCalledWith({
        timeRange: 'short_term',
        limit: 10,
      });
    });
  });
});
