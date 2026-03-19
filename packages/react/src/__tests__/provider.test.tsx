import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { TastifyProvider, useTastifyClient } from '../provider.js';

vi.mock('@tastify/core', () => {
  const TastifyClient = vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    getNowPlaying: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TastifyProvider', () => {
  it('renders children', () => {
    render(
      <TastifyProvider token="test-token">
        <div data-testid="child">Hello</div>
      </TastifyProvider>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  it('provides client via context', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TastifyProvider token="test-token">{children}</TastifyProvider>
    );

    let client: unknown;
    function TestConsumer() {
      client = useTastifyClient();
      return null;
    }

    await act(async () => {
      render(<TestConsumer />, { wrapper });
    });

    expect(client).toBeDefined();
    expect(typeof (client as Record<string, unknown>).getNowPlaying).toBe('function');
  });

  it('throws if hook used outside provider', () => {
    // Suppress console.error from React error boundary
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function BadConsumer() {
      useTastifyClient();
      return null;
    }

    expect(() => render(<BadConsumer />)).toThrow(
      'useTastifyClient must be used within a <TastifyProvider>',
    );

    spy.mockRestore();
  });
});
