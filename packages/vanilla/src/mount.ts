import { TastifyClient } from '@tastify/core';
import type { TimeRange } from '@tastify/core';
import {
  renderNowPlaying,
  renderTopTracks,
  renderTopArtists,
  renderRecentlyPlayed,
} from './templates.js';
import type {
  NowPlayingOptions,
  TopTracksOptions,
  TopArtistsOptions,
  RecentlyPlayedOptions,
} from './templates.js';
import { replaceChildren } from './renderer.js';

export interface MountOptions {
  type: 'now-playing' | 'top-tracks' | 'top-artists' | 'recently-played';
  tokenUrl?: string;
  getToken?: () => Promise<string>;
  token?: string;
  // NowPlaying
  compact?: boolean;
  showArt?: boolean;
  showProgress?: boolean;
  showLink?: boolean;
  fallback?: string;
  pollInterval?: number;
  // TopTracks / TopArtists
  timeRange?: TimeRange;
  limit?: number;
  layout?: 'list' | 'grid' | 'timeline';
  showRank?: boolean;
  columns?: number;
  header?: string | null;
  showTimeRangeSelector?: boolean;
  // TopArtists
  showGenres?: boolean;
  // RecentlyPlayed
  showTimestamp?: boolean;
  groupByDay?: boolean;
}

export interface MountedWidget {
  update(opts: Partial<MountOptions>): void;
  destroy(): void;
}

const sharedClients = new Map<string, { client: TastifyClient; refCount: number }>();

function getClient(options: MountOptions): { client: TastifyClient; shared: boolean } {
  if (options.tokenUrl) {
    const existing = sharedClients.get(options.tokenUrl);
    if (existing) {
      existing.refCount++;
      return { client: existing.client, shared: true };
    }
    const client = new TastifyClient({ tokenUrl: options.tokenUrl });
    sharedClients.set(options.tokenUrl, { client, refCount: 1 });
    return { client, shared: true };
  }

  const client = new TastifyClient({
    token: options.token,
    getToken: options.getToken,
  });
  return { client, shared: false };
}

function releaseClient(options: MountOptions, shared: boolean): void {
  if (shared && options.tokenUrl) {
    const entry = sharedClients.get(options.tokenUrl);
    if (entry) {
      entry.refCount--;
      if (entry.refCount <= 0) {
        entry.client.destroy();
        sharedClients.delete(options.tokenUrl);
      }
    }
  }
}

export function mount(
  selector: string | HTMLElement,
  options: MountOptions,
): MountedWidget {
  const target =
    typeof selector === 'string' ? document.querySelector<HTMLElement>(selector) : selector;

  if (!target) {
    throw new Error(`Tastify: element not found for selector "${selector}"`);
  }

  let opts = { ...options };
  let { client, shared } = getClient(opts);
  let destroyed = false;
  let stopPolling: (() => void) | null = null;
  let animationFrameId: number | null = null;

  function render(): void {
    if (destroyed) return;

    const { type } = opts;

    if (type === 'now-playing') {
      renderNowPlayingWidget();
    } else if (type === 'top-tracks') {
      renderTopTracksWidget();
    } else if (type === 'top-artists') {
      renderTopArtistsWidget();
    } else if (type === 'recently-played') {
      renderRecentlyPlayedWidget();
    }
  }

  function renderNowPlayingWidget(): void {
    let lastData: import('@tastify/core').NowPlayingData | null = null;
    let lastFetchedAt = 0;

    function animateProgress(): void {
      if (destroyed || !lastData || !lastData.isPlaying) return;
      if (opts.showProgress === false || opts.compact) return;

      const elapsed = Date.now() - lastFetchedAt;
      const interpolatedProgress = lastData.progressMs + elapsed;
      const pct = Math.min(
        (interpolatedProgress / lastData.track.durationMs) * 100,
        100,
      );

      const bar = target!.querySelector<HTMLElement>('.tf-now-playing__progress-bar');
      if (bar) {
        bar.style.width = `${pct}%`;
      }

      animationFrameId = requestAnimationFrame(animateProgress);
    }

    function renderWithData(data: import('@tastify/core').NowPlayingData | null): void {
      if (destroyed) return;
      lastData = data;
      lastFetchedAt = Date.now();

      const el = renderNowPlaying(data, opts);
      replaceChildren(target!, [el]);

      if (animationFrameId != null) {
        cancelAnimationFrame(animationFrameId);
      }
      animateProgress();
    }

    client.getNowPlaying().then(renderWithData).catch(() => {
      if (!destroyed) {
        replaceChildren(target!, [renderNowPlaying(null, opts)]);
      }
    });

    const interval = opts.pollInterval ?? 15_000;
    stopPolling = client.onNowPlayingChange((data) => {
      renderWithData(data);
    }, interval);
  }

  function renderTopTracksWidget(): void {
    let currentRange: TimeRange = opts.timeRange ?? 'medium_term';

    function fetchAndRender(): void {
      client
        .getTopTracks({ timeRange: currentRange, limit: opts.limit })
        .then((data) => {
          if (destroyed) return;
          const trackOpts: TopTracksOptions = {
            ...opts,
            timeRange: currentRange,
            layout: (opts.layout as 'list' | 'grid') ?? 'list',
          };
          const el = renderTopTracks(data, trackOpts, (range) => {
            currentRange = range;
            fetchAndRender();
          });
          replaceChildren(target!, [el]);
        })
        .catch(() => {});
    }

    fetchAndRender();
  }

  function renderTopArtistsWidget(): void {
    let currentRange: TimeRange = opts.timeRange ?? 'medium_term';

    function fetchAndRender(): void {
      client
        .getTopArtists({ timeRange: currentRange, limit: opts.limit })
        .then((data) => {
          if (destroyed) return;
          const artistOpts: TopArtistsOptions = {
            ...opts,
            timeRange: currentRange,
            layout: (opts.layout as 'grid' | 'list') ?? 'grid',
          };
          const el = renderTopArtists(data, artistOpts, (range) => {
            currentRange = range;
            fetchAndRender();
          });
          replaceChildren(target!, [el]);
        })
        .catch(() => {});
    }

    fetchAndRender();
  }

  function renderRecentlyPlayedWidget(): void {
    client
      .getRecentlyPlayed({ limit: opts.limit })
      .then((data) => {
        if (destroyed) return;
        const rpOpts: RecentlyPlayedOptions = {
          ...opts,
          layout: (opts.layout as 'timeline' | 'list') ?? 'list',
        };
        const el = renderRecentlyPlayed(data, rpOpts);
        replaceChildren(target!, [el]);
      })
      .catch(() => {});
  }

  render();

  return {
    update(newOpts: Partial<MountOptions>) {
      if (destroyed) return;

      // If token config changed, recreate the client
      if (
        newOpts.tokenUrl !== undefined ||
        newOpts.token !== undefined ||
        newOpts.getToken !== undefined
      ) {
        if (stopPolling) {
          stopPolling();
          stopPolling = null;
        }
        if (animationFrameId != null) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        releaseClient(opts, shared);
        opts = { ...opts, ...newOpts };
        ({ client, shared } = getClient(opts));
      } else {
        opts = { ...opts, ...newOpts };
      }

      // Re-render with new options
      if (stopPolling) {
        stopPolling();
        stopPolling = null;
      }
      if (animationFrameId != null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      render();
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;

      if (stopPolling) {
        stopPolling();
        stopPolling = null;
      }
      if (animationFrameId != null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      releaseClient(opts, shared);
      if (!shared) {
        client.destroy();
      }

      target!.textContent = '';
    },
  };
}

// Exposed for testing
export { sharedClients as _sharedClients };
