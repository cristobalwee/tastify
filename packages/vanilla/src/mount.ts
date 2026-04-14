import {
  TastifyClient,
  getOrCreateEmbedPlayer,
  nowPlayingFromRecentTrack,
  type AudioPlayer,
  type NowPlayingData,
  type TastifyTrack,
} from '@tastify/core';
import type { TimeRange } from '@tastify/core';
import {
  renderNowPlayingSkeleton,
  populateNowPlaying,
  renderTopTracksSkeleton,
  renderTopAlbumsSkeleton,
  renderTopArtistsSkeleton,
  renderRecentlyPlayedSkeleton,
  renderTimeRangeSelector,
  populateTrackCard,
  populateAlbumCard,
  populateArtistCard,
  formatRelativeTime,
} from './templates.js';
import type {
  NowPlayingOptions,
  RecentlyPlayedOptions,
} from './templates.js';
import { replaceChildren } from './renderer.js';

export type TastifyTheme = 'light' | 'dark' | 'auto';

export interface MountOptions {
  type: 'now-playing' | 'top-tracks' | 'top-albums' | 'top-artists' | 'recently-played';
  tokenUrl?: string;
  getToken?: () => Promise<string>;
  token?: string;
  theme?: TastifyTheme;
  // NowPlaying
  compact?: boolean;
  contained?: boolean;
  showArt?: boolean;
  /** When false, Now Playing is not clickable. Default true. */
  interactive?: boolean;
  header?: string | null;
  fallback?: string;
  pollInterval?: number;
  /** When true and nothing is live, show the most recent track with the same layout as playing. */
  fallbackToRecent?: boolean;
  // TopTracks / TopArtists
  timeRange?: TimeRange;
  limit?: number;
  layout?: 'list' | 'grid' | 'compact-grid';
  showRank?: boolean;
  columns?: number;
  showTimeRangeSelector?: boolean;
  // TopArtists
  showGenres?: boolean;
  // RecentlyPlayed
  showTimestamp?: boolean;
  groupByDay?: boolean;
  // Playback
  onTrackPlay?: (track: import('@tastify/core').TastifyTrack) => void;
  onArtistPlay?: (artist: import('@tastify/core').TastifyArtist) => void;
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
  let nowPlayingPlaybackUnsub: (() => void) | null = null;
  let nowPlayingPlayerRef: AudioPlayer | null = null;
  let lastNowPlayingData: NowPlayingData | null = null;

  function applyTheme(): void {
    const theme = opts.theme;
    if (theme && theme !== 'light') {
      target!.setAttribute('data-tf-theme', theme);
    } else {
      target!.removeAttribute('data-tf-theme');
    }
  }
  applyTheme();

  function renderSkeleton(): void {
    if (destroyed) return;
    const { type } = opts;
    let skeleton: HTMLElement;
    if (type === 'now-playing') {
      skeleton = renderNowPlayingSkeleton(opts);
    } else if (type === 'top-tracks') {
      skeleton = renderTopTracksSkeleton({
        ...opts,
        layout: (opts.layout as 'list' | 'grid' | 'compact-grid') ?? 'list',
      });
    } else if (type === 'top-albums') {
      skeleton = renderTopAlbumsSkeleton({
        ...opts,
        layout: (opts.layout as 'list' | 'grid' | 'compact-grid') ?? 'list',
      });
    } else if (type === 'top-artists') {
      skeleton = renderTopArtistsSkeleton({
        ...opts,
        layout: (opts.layout as 'grid' | 'list' | 'compact-grid') ?? 'grid',
      });
    } else {
      skeleton = renderRecentlyPlayedSkeleton({
        ...opts,
        layout: (opts.layout as 'list' | 'grid' | 'compact-grid') ?? 'list',
      });
    }
    replaceChildren(target!, [skeleton]);
  }

  function render(): void {
    if (destroyed) return;

    nowPlayingPlaybackUnsub?.();
    nowPlayingPlaybackUnsub = null;
    nowPlayingPlayerRef = null;

    const { type } = opts;

    // Show skeleton immediately while data loads
    renderSkeleton();

    if (type === 'now-playing') {
      renderNowPlayingWidget();
    } else if (type === 'top-tracks') {
      renderTopTracksWidget();
    } else if (type === 'top-albums') {
      renderTopAlbumsWidget();
    } else if (type === 'top-artists') {
      renderTopArtistsWidget();
    } else if (type === 'recently-played') {
      renderRecentlyPlayedWidget();
    }
  }

  function renderNowPlayingWidget(): void {
    const fallbackToRecent = opts.fallbackToRecent === true;

    function buildNowPlayingPopulateOpts(
      playerState?: { currentTrackId: string | null; isPlaying: boolean },
    ): NowPlayingOptions {
      const interactive = opts.interactive !== false;
      const onPlay: ((track: TastifyTrack) => void) | undefined =
        opts.onTrackPlay ??
        (interactive
          ? (track) => {
              void getOrCreateEmbedPlayer().then((p) => p.play(track));
            }
          : undefined);
      return {
        compact: opts.compact,
        contained: opts.contained,
        showArt: opts.showArt,
        interactive,
        onPlay,
        playerState,
        header: opts.header,
        fallback: opts.fallback,
        pollInterval: opts.pollInterval,
      };
    }

    async function resolveDisplay(raw: NowPlayingData | null): Promise<NowPlayingData | null> {
      if (raw || !fallbackToRecent) return raw;
      try {
        const recent = await client.getRecentlyPlayed({ limit: 1 });
        const first = recent.tracks[0];
        return first ? nowPlayingFromRecentTrack(first.track) : null;
      } catch {
        return null;
      }
    }

    function renderWithData(data: NowPlayingData | null): void {
      if (destroyed) return;
      lastNowPlayingData = data;
      const root = target!.querySelector<HTMLElement>('.tf-now-playing');
      if (!root) return;
      let playerState: { currentTrackId: string | null; isPlaying: boolean } | undefined;
      if (nowPlayingPlayerRef) {
        const s = nowPlayingPlayerRef.getState();
        playerState = {
          currentTrackId: s.currentTrack?.id ?? null,
          isPlaying: s.isPlaying,
        };
      }
      populateNowPlaying(root, data, buildNowPlayingPopulateOpts(playerState));
    }

    client
      .getNowPlaying()
      .then(resolveDisplay)
      .then(renderWithData)
      .catch(() => {
        if (!destroyed) {
          lastNowPlayingData = null;
          const root = target!.querySelector<HTMLElement>('.tf-now-playing');
          if (root) populateNowPlaying(root, null, buildNowPlayingPopulateOpts());
        }
      });

    const interval = opts.pollInterval ?? 15_000;
    stopPolling = client.onNowPlayingChange((raw) => {
      void resolveDisplay(raw).then(renderWithData);
    }, interval);

    void getOrCreateEmbedPlayer().then((p) => {
      if (destroyed) return;
      nowPlayingPlayerRef = p;
      const r = (): void => {
        if (destroyed) return;
        const root = target!.querySelector<HTMLElement>('.tf-now-playing');
        if (!root) return;
        const s = p.getState();
        populateNowPlaying(
          root,
          lastNowPlayingData,
          buildNowPlayingPopulateOpts({
            currentTrackId: s.currentTrack?.id ?? null,
            isPlaying: s.isPlaying,
          }),
        );
      };
      const u1 = p.subscribe('statechange', r);
      const u2 = p.subscribe('trackchange', r);
      nowPlayingPlaybackUnsub = () => {
        u1();
        u2();
      };
      r();
    });
  }

  function renderTopTracksWidget(): void {
    let currentRange: TimeRange = opts.timeRange ?? 'medium_term';

    function fetchAndUpdate(): void {
      client
        .getTopTracks({ timeRange: currentRange, limit: opts.limit })
        .then((data) => {
          if (destroyed) return;

          const layout = (opts.layout as 'list' | 'grid' | 'compact-grid') ?? 'list';
          const showRank = opts.showRank !== false;
          const showArt = opts.showArt !== false;

          if (opts.showTimeRangeSelector) {
            const oldSelector = target!.querySelector('.tf-time-range-selector');
            if (oldSelector) {
              const newSelector = renderTimeRangeSelector(currentRange, (range) => {
                currentRange = range;
                renderSkeleton();
                fetchAndUpdate();
              });
              oldSelector.replaceWith(newSelector);
            }
          }

          const cards = Array.from(target!.querySelectorAll<HTMLElement>('.tf-track-card'));
          data.tracks.forEach((track, i) => {
            if (i < cards.length) {
              populateTrackCard(cards[i]!, track, {
                rank: layout !== 'grid' && showRank ? i + 1 : undefined,
                showArt,
                onPlay: opts.onTrackPlay,
              });
            }
          });

          for (let i = data.tracks.length; i < cards.length; i++) {
            cards[i]!.remove();
          }
        })
        .catch(() => {});
    }

    fetchAndUpdate();
  }

  function renderTopArtistsWidget(): void {
    let currentRange: TimeRange = opts.timeRange ?? 'medium_term';

    function fetchAndUpdate(): void {
      client
        .getTopArtists({ timeRange: currentRange, limit: opts.limit })
        .then((data) => {
          if (destroyed) return;

          const showGenres = opts.showGenres ?? false;

          if (opts.showTimeRangeSelector) {
            const oldSelector = target!.querySelector('.tf-time-range-selector');
            if (oldSelector) {
              const newSelector = renderTimeRangeSelector(currentRange, (range) => {
                currentRange = range;
                renderSkeleton();
                fetchAndUpdate();
              });
              oldSelector.replaceWith(newSelector);
            }
          }

          const cards = Array.from(target!.querySelectorAll<HTMLElement>('.tf-artist-card'));
          data.artists.forEach((artist, i) => {
            if (i < cards.length) {
              populateArtistCard(cards[i]!, artist, showGenres, opts.onArtistPlay);
            }
          });

          for (let i = data.artists.length; i < cards.length; i++) {
            cards[i]!.remove();
          }
        })
        .catch(() => {});
    }

    fetchAndUpdate();
  }

  function renderTopAlbumsWidget(): void {
    let currentRange: TimeRange = opts.timeRange ?? 'medium_term';

    function fetchAndUpdate(): void {
      client
        .getTopAlbums({ timeRange: currentRange, limit: opts.limit })
        .then((data) => {
          if (destroyed) return;

          const layout = (opts.layout as 'list' | 'grid' | 'compact-grid') ?? 'list';
          const showRank = opts.showRank !== false;
          const showArt = opts.showArt !== false;

          if (opts.showTimeRangeSelector) {
            const oldSelector = target!.querySelector('.tf-time-range-selector');
            if (oldSelector) {
              const newSelector = renderTimeRangeSelector(currentRange, (range) => {
                currentRange = range;
                renderSkeleton();
                fetchAndUpdate();
              });
              oldSelector.replaceWith(newSelector);
            }
          }

          const cards = Array.from(target!.querySelectorAll<HTMLElement>('.tf-track-card'));
          data.albums.forEach((album, i) => {
            if (i < cards.length) {
              populateAlbumCard(cards[i]!, album, {
                rank: layout !== 'grid' && showRank ? i + 1 : undefined,
                showArt,
              });
            }
          });

          for (let i = data.albums.length; i < cards.length; i++) {
            cards[i]!.remove();
          }
        })
        .catch(() => {});
    }

    fetchAndUpdate();
  }

  function renderRecentlyPlayedWidget(): void {
    const showTimestamp = opts.showTimestamp !== false;

    client
      .getRecentlyPlayed({ limit: opts.limit })
      .then((data) => {
        if (destroyed) return;

        const cards = Array.from(target!.querySelectorAll<HTMLElement>('.tf-track-card'));
        data.tracks.forEach((item, i) => {
          if (i < cards.length) {
            populateTrackCard(cards[i]!, item.track, {
              showArt: true,
              onPlay: opts.onTrackPlay,
              timestamp: showTimestamp ? formatRelativeTime(item.playedAt) : undefined,
            });
          }
        });

        for (let i = data.tracks.length; i < cards.length; i++) {
          cards[i]!.remove();
        }
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
        nowPlayingPlaybackUnsub?.();
        nowPlayingPlaybackUnsub = null;
        nowPlayingPlayerRef = null;
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

      applyTheme();

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
      nowPlayingPlaybackUnsub?.();
      nowPlayingPlaybackUnsub = null;
      nowPlayingPlayerRef = null;
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
