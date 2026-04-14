import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { TastifyProvider } from '../provider.js';
import { TopAlbums } from '../components/TopAlbums.js';

const makeMockAlbum = (id: string, name: string) => ({
  id,
  uri: `spotify:album:${id}`,
  name,
  images: [{ url: 'https://img.test/1', width: 300, height: 300 }],
  releaseDate: '2024-01-01',
  externalUrl: '',
  artists: [
    { id: 'a1', uri: '', name: 'Artist', images: [], genres: [], externalUrl: '' },
  ],
});

const mockTopAlbums = {
  albums: [
    makeMockAlbum('1', 'Album One'),
    makeMockAlbum('2', 'Album Two'),
    makeMockAlbum('3', 'Album Three'),
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
      getTopTracks: vi.fn(),
      getTopAlbums: vi.fn().mockResolvedValue(mockTopAlbums),
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

describe('TopAlbums component', () => {
  it('renders correct number of items', async () => {
    render(
      <Wrapper>
        <TopAlbums limit={3} />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Album One')).toBeInTheDocument();
    });

    expect(screen.getByText('Album Two')).toBeInTheDocument();
    expect(screen.getByText('Album Three')).toBeInTheDocument();
  });

  it('list layout applies correct classes', async () => {
    const { container } = render(
      <Wrapper>
        <TopAlbums layout="list" />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Album One')).toBeInTheDocument();
    });

    expect(container.querySelector('.tf-top-tracks--list')).toBeInTheDocument();
    expect(container.querySelector('.tf-top-albums')).toBeInTheDocument();
  });

  it('grid layout applies correct classes', async () => {
    const { container } = render(
      <Wrapper>
        <TopAlbums layout="grid" />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Album One')).toBeInTheDocument();
    });

    expect(container.querySelector('.tf-top-tracks--grid')).toBeInTheDocument();
  });

  it('time range selector toggles state', async () => {
    render(
      <Wrapper>
        <TopAlbums showTimeRangeSelector />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Album One')).toBeInTheDocument();
    });

    const btn4weeks = screen.getByText('4 weeks');
    expect(btn4weeks).toBeInTheDocument();

    fireEvent.click(btn4weeks);

    await waitFor(() => {
      expect(mockClient.getTopAlbums).toHaveBeenCalledWith(
        expect.objectContaining({ timeRange: 'short_term' }),
      );
    });
  });
});
