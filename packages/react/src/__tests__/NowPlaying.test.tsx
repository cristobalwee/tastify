import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

const mockTrack = {
  id: '1',
  uri: 'spotify:track:1',
  name: 'My Test Track',
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

const { getNowPlayingMock } = vi.hoisted(() => {
  const getNowPlayingMock = vi.fn();
  return { getNowPlayingMock };
});

vi.mock('@tastify/core', () => {
  const TastifyClient = vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    getNowPlaying: getNowPlayingMock,
    getTopTracks: vi.fn(),
    getTopArtists: vi.fn(),
    getRecentlyPlayed: vi.fn(),
    onNowPlayingChange: vi.fn(() => vi.fn()),
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
import { NowPlaying } from '../components/NowPlaying.js';

const Wrapper = ({ children }: { children: ReactNode }) => (
  <TastifyProvider token="test-token">{children}</TastifyProvider>
);

describe('NowPlaying component', () => {
  beforeEach(() => {
    getNowPlayingMock.mockReset();
    getNowPlayingMock.mockResolvedValue(mockNowPlaying);
  });

  it('renders track info in default mode', async () => {
    render(
      <Wrapper>
        <NowPlaying pollInterval={0} />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('My Test Track')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Artist')).toBeInTheDocument();
  });

  it('renders fallback when nothing playing', async () => {
    getNowPlayingMock.mockResolvedValue(null);

    render(
      <Wrapper>
        <NowPlaying pollInterval={0} fallback={<span>Nothing playing</span>} />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Nothing playing')).toBeInTheDocument();
    });
  });

  it('compact mode applies correct class', async () => {
    const { container } = render(
      <Wrapper>
        <NowPlaying pollInterval={0} compact />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('My Test Track')).toBeInTheDocument();
    });

    const root = container.querySelector('.tf-now-playing');
    expect(root?.classList.contains('tf-now-playing--compact')).toBe(true);
  });

  it('headless mode calls children function', async () => {
    const childFn = vi.fn((data) => <span>Custom: {data.track.name}</span>);

    render(
      <Wrapper>
        <NowPlaying pollInterval={0}>{childFn}</NowPlaying>
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Custom: My Test Track')).toBeInTheDocument();
    });

    expect(childFn).toHaveBeenCalledWith(
      expect.objectContaining({ track: mockTrack }),
    );
  });
});
