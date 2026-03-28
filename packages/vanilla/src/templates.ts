import type {
  NowPlayingData,
  TopTracksData,
  TopArtistsData,
  RecentlyPlayedData,
  TastifyTrack,
  TastifyArtist,
  TimeRange,
} from '@tastify/core';
import { h, setStyles } from './renderer.js';

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  short_term: '4 weeks',
  medium_term: '6 months',
  long_term: 'All time',
};

export interface NowPlayingOptions {
  compact?: boolean;
  showArt?: boolean;
  showProgress?: boolean;
  showLink?: boolean;
  fallback?: string;
  pollInterval?: number;
}

export interface TopTracksOptions {
  timeRange?: TimeRange;
  limit?: number;
  layout?: 'list' | 'grid';
  showRank?: boolean;
  showArt?: boolean;
  columns?: number;
  header?: string | null;
  showTimeRangeSelector?: boolean;
}

export interface TopArtistsOptions {
  timeRange?: TimeRange;
  limit?: number;
  layout?: 'grid' | 'list';
  columns?: number;
  showGenres?: boolean;
  header?: string | null;
  showTimeRangeSelector?: boolean;
}

export interface RecentlyPlayedOptions {
  limit?: number;
  layout?: 'timeline' | 'list';
  showTimestamp?: boolean;
  groupByDay?: boolean;
  header?: string | null;
}

function createWaveform(): HTMLElement {
  return h('span', { class: 'tf-waveform' }, [
    h('span', { class: 'tf-waveform__bar' }),
    h('span', { class: 'tf-waveform__bar' }),
    h('span', { class: 'tf-waveform__bar' }),
    h('span', { class: 'tf-waveform__bar' }),
  ]);
}

function renderTrackCard(
  track: TastifyTrack,
  layout: 'list' | 'grid',
  opts: {
    rank?: number;
    showArt?: boolean;
    onPlay?: (track: TastifyTrack) => void;
    isPlaying?: boolean;
    isPaused?: boolean;
  },
): HTMLElement {
  const art = track.album.images[0]?.url;
  const artistNames = track.artists.map((a) => a.name).join(', ');
  const playable = !!opts.onPlay;

  function buildClasses(base: string): string {
    const parts = [base];
    if (playable) parts.push('tf-track-card--playable');
    if (opts.isPlaying) parts.push('tf-track-card--playing');
    return parts.join(' ');
  }

  let el: HTMLElement;

  if (layout === 'grid') {
    const children: (HTMLElement | Text)[] = [];
    if (opts.showArt !== false && art) {
      children.push(
        h('img', {
          class: 'tf-track-card__art',
          src: art,
          alt: track.album.name,
          loading: 'lazy',
        }),
      );
    }
    children.push(h('span', { class: 'tf-track-card__name' }, [track.name]));
    children.push(h('span', { class: 'tf-track-card__artist' }, [artistNames]));
    if (opts.isPlaying) {
      const waveform = createWaveform();
      if (opts.isPaused) waveform.classList.add('tf-waveform--paused');
      children.push(waveform);
    }
    el = h('div', { class: buildClasses('tf-track-card tf-track-card--grid') }, children);
  } else {
    const children: (HTMLElement | Text)[] = [];
    if (opts.isPlaying) {
      const waveform = createWaveform();
      if (opts.isPaused) waveform.classList.add('tf-waveform--paused');
      children.push(waveform);
    } else if (opts.rank != null) {
      children.push(h('span', { class: 'tf-track-card__rank' }, [String(opts.rank)]));
    }
    if (opts.showArt !== false && art) {
      children.push(
        h('img', {
          class: 'tf-track-card__art',
          src: art,
          alt: track.album.name,
          loading: 'lazy',
        }),
      );
    }
    children.push(
      h('div', { class: 'tf-track-card__info' }, [
        h('span', { class: 'tf-track-card__name' }, [track.name]),
        h('span', { class: 'tf-track-card__artist' }, [artistNames]),
      ]),
    );
    el = h('div', { class: buildClasses('tf-track-card tf-track-card--list') }, children);
  }

  if (opts.onPlay) {
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    const onPlay = opts.onPlay;
    el.addEventListener('click', () => onPlay(track));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onPlay(track);
      }
    });
  }

  return el;
}

function renderTrackCardSkeleton(layout: 'list' | 'grid'): HTMLElement {
  if (layout === 'grid') {
    return h('div', { class: 'tf-track-card tf-track-card--grid' }, [
      h('div', { class: 'tf-skeleton tf-skeleton--art-grid' }),
      h('div', { class: 'tf-skeleton tf-skeleton--text', style: 'width:80%' }),
      h('div', { class: 'tf-skeleton tf-skeleton--text-sm' }),
    ]);
  }
  return h('div', { class: 'tf-track-card tf-track-card--list' }, [
    h('div', { class: 'tf-skeleton tf-skeleton--art' }),
    h('div', { class: 'tf-track-card__info' }, [
      h('div', { class: 'tf-skeleton tf-skeleton--text', style: 'width:70%' }),
      h('div', { class: 'tf-skeleton tf-skeleton--text-sm' }),
    ]),
  ]);
}

function renderArtistCardSkeleton(layout: 'grid' | 'list'): HTMLElement {
  if (layout === 'grid') {
    return h('div', { class: 'tf-artist-card tf-artist-card--grid' }, [
      h('div', { class: 'tf-skeleton tf-skeleton--photo-circle' }),
      h('div', { class: 'tf-skeleton tf-skeleton--text', style: 'width:70%' }),
    ]);
  }
  return h('div', { class: 'tf-artist-card tf-artist-card--list' }, [
    h('div', { class: 'tf-skeleton tf-skeleton--art tf-skeleton--circle' }),
    h('div', { class: 'tf-artist-card__info' }, [
      h('div', { class: 'tf-skeleton tf-skeleton--text', style: 'width:60%' }),
    ]),
  ]);
}

function renderArtistCard(
  artist: TastifyArtist,
  layout: 'grid' | 'list',
  showGenres: boolean,
  onPlay?: (artist: TastifyArtist) => void,
): HTMLElement {
  const photo = artist.images[0]?.url;
  const playable = !!onPlay;

  function buildClasses(base: string): string {
    const parts = [base];
    if (playable) parts.push('tf-artist-card--playable');
    return parts.join(' ');
  }

  function genresEl(): HTMLElement | null {
    if (!showGenres || artist.genres.length === 0) return null;
    return h(
      'div',
      { class: 'tf-artist-card__genres' },
      artist.genres.slice(0, 3).map((g) => h('span', { class: 'tf-artist-card__genre' }, [g])),
    );
  }

  let el: HTMLElement;

  if (layout === 'grid') {
    const children: (HTMLElement | Text)[] = [];
    if (photo) {
      children.push(
        h('img', { class: 'tf-artist-card__photo', src: photo, alt: artist.name, loading: 'lazy' }),
      );
    }
    children.push(h('span', { class: 'tf-artist-card__name' }, [artist.name]));
    const genres = genresEl();
    if (genres) children.push(genres);
    el = h('div', { class: buildClasses('tf-artist-card tf-artist-card--grid') }, children);
  } else {
    const children: (HTMLElement | Text)[] = [];
    if (photo) {
      children.push(
        h('img', { class: 'tf-artist-card__photo', src: photo, alt: artist.name, loading: 'lazy' }),
      );
    }
    const infoChildren: (HTMLElement | Text)[] = [
      h('span', { class: 'tf-artist-card__name' }, [artist.name]),
    ];
    const genres = genresEl();
    if (genres) infoChildren.push(genres);
    children.push(h('div', { class: 'tf-artist-card__info' }, infoChildren));
    el = h('div', { class: buildClasses('tf-artist-card tf-artist-card--list') }, children);
  }

  if (onPlay) {
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    const handler = onPlay;
    el.addEventListener('click', () => handler(artist));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler(artist);
      }
    });
  }

  return el;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getDayKey(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export function renderNowPlayingSkeleton(opts: NowPlayingOptions): HTMLElement {
  return h('div', { class: 'tf-now-playing tf-now-playing--loading' }, [
    h('div', { class: 'tf-skeleton tf-skeleton--art' }),
    h('div', { class: 'tf-now-playing__info' }, [
      h('div', { class: 'tf-skeleton tf-skeleton--text', style: 'width:60%' }),
      h('div', { class: 'tf-skeleton tf-skeleton--text-sm' }),
    ]),
  ]);
}

export function renderNowPlaying(
  data: NowPlayingData | null,
  opts: NowPlayingOptions,
): HTMLElement {
  const {
    compact = false,
    showArt = true,
    showProgress = true,
    showLink = true,
    fallback,
  } = opts;

  if (!data) {
    const el = h('div', { class: 'tf-now-playing tf-now-playing--idle' });
    if (fallback) {
      el.innerHTML = fallback;
    }
    return el;
  }

  const { track, isPlaying, progressMs } = data;
  const art = track.album.images[0]?.url;
  const progressPct = track.durationMs > 0 ? (progressMs / track.durationMs) * 100 : 0;
  const artistNames = track.artists.map((a) => a.name).join(', ');

  const classes = ['tf-now-playing'];
  if (compact) classes.push('tf-now-playing--compact');
  if (!isPlaying) classes.push('tf-now-playing--idle');

  const children: (HTMLElement | Text)[] = [];

  if (showArt && art) {
    children.push(
      h('img', {
        class: 'tf-now-playing__art',
        src: art,
        alt: track.album.name,
        loading: 'lazy',
      }),
    );
  }

  children.push(
    h('div', { class: 'tf-now-playing__info' }, [
      h('span', { class: 'tf-now-playing__track' }, [track.name]),
      h('span', { class: 'tf-now-playing__artist' }, [artistNames]),
    ]),
  );

  if (showProgress && !compact) {
    const bar = h('div', { class: 'tf-now-playing__progress-bar' });
    setStyles(bar, { width: `${progressPct}%` });
    children.push(h('div', { class: 'tf-now-playing__progress' }, [bar]));
  }

  if (isPlaying) {
    children.push(h('span', { class: 'tf-now-playing__pulse' }));
  }

  if (showLink) {
    children.push(
      h('a', {
        class: 'tf-now-playing__link',
        href: track.externalUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
      }, ['Open in Spotify']),
    );
  }

  return h('div', { class: classes.join(' ') }, children);
}

export function renderTopTracksSkeleton(opts: TopTracksOptions): HTMLElement {
  const {
    layout = 'list',
    columns = 3,
    limit = 5,
    header = 'On Repeat',
  } = opts;

  const children: (HTMLElement | Text)[] = [];
  if (header !== null) {
    children.push(h('h3', { class: 'tf-top-tracks__header' }, [header]));
  }

  const listEl = h(
    'div',
    { class: 'tf-top-tracks__list' },
    Array.from({ length: limit }, () => renderTrackCardSkeleton(layout)),
  );

  if (layout === 'grid') {
    setStyles(listEl, { 'grid-template-columns': `repeat(${columns}, 1fr)` });
  }

  children.push(listEl);
  return h('div', { class: `tf-top-tracks tf-top-tracks--${layout}` }, children);
}

export function renderTopTracks(
  data: TopTracksData,
  opts: TopTracksOptions,
  onTimeRangeChange?: (range: TimeRange) => void,
): HTMLElement {
  const {
    timeRange,
    layout = 'list',
    showRank = true,
    showArt = true,
    columns = 3,
    header = 'On Repeat',
    showTimeRangeSelector = false,
  } = opts;

  const children: (HTMLElement | Text)[] = [];

  if (header !== null) {
    children.push(h('h3', { class: 'tf-top-tracks__header' }, [header]));
  }

  if (showTimeRangeSelector) {
    const buttons = (Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((range) => {
      const isActive = (timeRange ?? 'medium_term') === range;
      const btn = h(
        'button',
        {
          class: `tf-top-tracks__selector-btn${isActive ? ' tf-top-tracks__selector-btn--active' : ''}`,
        },
        [TIME_RANGE_LABELS[range]],
      );
      btn.addEventListener('click', () => onTimeRangeChange?.(range));
      return btn;
    });
    children.push(h('div', { class: 'tf-top-tracks__selector' }, buttons));
  }

  const listEl = h(
    'div',
    { class: 'tf-top-tracks__list' },
    data.tracks.map((track, i) =>
      renderTrackCard(track, layout, {
        rank: layout === 'list' && showRank ? i + 1 : undefined,
        showArt,
      }),
    ),
  );

  if (layout === 'grid') {
    setStyles(listEl, { 'grid-template-columns': `repeat(${columns}, 1fr)` });
  }

  children.push(listEl);

  return h('div', { class: `tf-top-tracks tf-top-tracks--${layout}` }, children);
}

export function renderTopArtistsSkeleton(opts: TopArtistsOptions): HTMLElement {
  const {
    layout = 'grid',
    columns = 3,
    limit = 6,
    header = 'Top Artists',
  } = opts;

  const children: (HTMLElement | Text)[] = [];
  if (header !== null) {
    children.push(h('h3', { class: 'tf-top-artists__header' }, [header]));
  }

  const listEl = h(
    'div',
    { class: 'tf-top-artists__list' },
    Array.from({ length: limit }, () => renderArtistCardSkeleton(layout)),
  );

  if (layout === 'grid') {
    setStyles(listEl, { 'grid-template-columns': `repeat(${columns}, 1fr)` });
  }

  children.push(listEl);
  return h('div', { class: `tf-top-artists tf-top-artists--${layout}` }, children);
}

export function renderTopArtists(
  data: TopArtistsData,
  opts: TopArtistsOptions,
  onTimeRangeChange?: (range: TimeRange) => void,
): HTMLElement {
  const {
    timeRange,
    layout = 'grid',
    columns = 3,
    showGenres = false,
    header = 'Top Artists',
    showTimeRangeSelector = false,
  } = opts;

  const children: (HTMLElement | Text)[] = [];

  if (header !== null) {
    children.push(h('h3', { class: 'tf-top-artists__header' }, [header]));
  }

  if (showTimeRangeSelector) {
    const buttons = (Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((range) => {
      const isActive = (timeRange ?? 'medium_term') === range;
      const btn = h(
        'button',
        {
          class: `tf-top-artists__selector-btn${isActive ? ' tf-top-artists__selector-btn--active' : ''}`,
        },
        [TIME_RANGE_LABELS[range]],
      );
      btn.addEventListener('click', () => onTimeRangeChange?.(range));
      return btn;
    });
    children.push(h('div', { class: 'tf-top-artists__selector' }, buttons));
  }

  const listEl = h(
    'div',
    { class: 'tf-top-artists__list' },
    data.artists.map((artist) => renderArtistCard(artist, layout, showGenres)),
  );

  if (layout === 'grid') {
    setStyles(listEl, { 'grid-template-columns': `repeat(${columns}, 1fr)` });
  }

  children.push(listEl);

  return h('div', { class: `tf-top-artists tf-top-artists--${layout}` }, children);
}

export function renderRecentlyPlayedSkeleton(opts: RecentlyPlayedOptions): HTMLElement {
  const {
    layout = 'list',
    limit = 10,
    header = 'Recently Played',
  } = opts;

  const children: (HTMLElement | Text)[] = [];
  if (header !== null) {
    children.push(h('h3', { class: 'tf-recently-played__header' }, [header]));
  }

  const itemEls = Array.from({ length: Math.min(limit, 5) }, () =>
    h('div', { class: 'tf-recently-played__item' }, [
      renderTrackCardSkeleton('list'),
    ]),
  );

  children.push(h('div', { class: 'tf-recently-played__list' }, itemEls));
  return h('div', { class: `tf-recently-played tf-recently-played--${layout}` }, children);
}

export function renderRecentlyPlayed(
  data: RecentlyPlayedData,
  opts: RecentlyPlayedOptions,
): HTMLElement {
  const {
    layout = 'list',
    showTimestamp = true,
    groupByDay = false,
    header = 'Recently Played',
  } = opts;

  const children: (HTMLElement | Text)[] = [];

  if (header !== null) {
    children.push(h('h3', { class: 'tf-recently-played__header' }, [header]));
  }

  const items = data.tracks;

  if (groupByDay) {
    const grouped = new Map<string, typeof items>();
    for (const item of items) {
      const key = getDayKey(item.playedAt);
      const existing = grouped.get(key);
      if (existing) {
        existing.push(item);
      } else {
        grouped.set(key, [item]);
      }
    }

    for (const [day, dayItems] of grouped) {
      const itemEls = dayItems.map((item) => {
        const itemChildren: (HTMLElement | Text)[] = [
          renderTrackCard(item.track, 'list', { showArt: true }),
        ];
        if (showTimestamp) {
          itemChildren.push(
            h('span', { class: 'tf-recently-played__time' }, [
              formatRelativeTime(item.playedAt),
            ]),
          );
        }
        return h('div', { class: 'tf-recently-played__item' }, itemChildren);
      });

      children.push(
        h('div', { class: 'tf-recently-played__group' }, [
          h('h4', { class: 'tf-recently-played__day' }, [day]),
          h('div', { class: 'tf-recently-played__list' }, itemEls),
        ]),
      );
    }
  } else {
    const itemEls = items.map((item) => {
      const itemChildren: (HTMLElement | Text)[] = [
        renderTrackCard(item.track, 'list', { showArt: true }),
      ];
      if (showTimestamp) {
        itemChildren.push(
          h('span', { class: 'tf-recently-played__time' }, [
            formatRelativeTime(item.playedAt),
          ]),
        );
      }
      return h('div', { class: 'tf-recently-played__item' }, itemChildren);
    });

    children.push(h('div', { class: 'tf-recently-played__list' }, itemEls));
  }

  return h('div', { class: `tf-recently-played tf-recently-played--${layout}` }, children);
}
