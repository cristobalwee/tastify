import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { TastifyProvider } from '../provider.js';
import { TopTracks } from '../components/TopTracks.js';

const makeMockTrack = (id: string, name: string) => ({
  id,
  uri: `spotify:track:${id}`,
  name,
  artists: [{ id: 'a1', uri: '', name: 'Artist', images: [], genres: [], externalUrl: '' }],
  album: { id: 'al1', uri: '', name: 'Album', images: [{ url: 'https://img.test/1', width: 300, height: 300 }], releaseDate: '2024-01-01', externalUrl: '' },
  durationMs: 200_000,
  previewUrl: null,
  externalUrl: '',
  explicit: false,
});

const mockTopTracks = {
  tracks: [
    makeMockTrack('1', 'Track One'),
    makeMockTrack('2', 'Track Two'),
    makeMockTrack('3', 'Track Three'),
  ],
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

const Wrapper = ({ children }: { children: ReactNode }) => (
  <TastifyProvider token="test-token">{children}</TastifyProvider>
);

describe('TopTracks component', () => {
  it('renders correct number of items', async () => {
    render(
      <Wrapper>
        <TopTracks limit={3} />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Track One')).toBeInTheDocument();
    });

    expect(screen.getByText('Track Two')).toBeInTheDocument();
    expect(screen.getByText('Track Three')).toBeInTheDocument();
  });

  it('list layout applies correct classes', async () => {
    const { container } = render(
      <Wrapper>
        <TopTracks layout="list" />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Track One')).toBeInTheDocument();
    });

    expect(container.querySelector('.tf-top-tracks--list')).toBeInTheDocument();
  });

  it('grid layout applies correct classes', async () => {
    const { container } = render(
      <Wrapper>
        <TopTracks layout="grid" />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Track One')).toBeInTheDocument();
    });

    expect(container.querySelector('.tf-top-tracks--grid')).toBeInTheDocument();
  });

  it('time range selector toggles state', async () => {
    render(
      <Wrapper>
        <TopTracks showTimeRangeSelector />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Track One')).toBeInTheDocument();
    });

    const btn4weeks = screen.getByText('4 weeks');
    expect(btn4weeks).toBeInTheDocument();

    fireEvent.click(btn4weeks);

    await waitFor(() => {
      expect(mockClient.getTopTracks).toHaveBeenCalledWith(
        expect.objectContaining({ timeRange: 'short_term' }),
      );
    });
  });
});
